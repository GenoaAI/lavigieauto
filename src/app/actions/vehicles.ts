"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { recalculateMaintenanceForecast, MaintenanceForecast, LastServiceRecord } from "@/lib/engine/cycles";
import { calculateConformityScore, ConformityAuditResult, TechnicalInspectionHistoryItem } from "@/lib/engine/conformity-score";
import { MaintenanceCategory } from "@/lib/ai";
import { generateReservationKit, ReservationKit } from "@/lib/engine/reservation-kit";
import { calculateVehicleTireAssessment, VehicleTireAssessment } from "@/lib/engine/tires";
import { fetchOnlineManufacturerPlan, OfficialMaintenancePlan } from "@/lib/engine/manufacturer-retriever";
import { resolveRecommendedGarage, ResolveGarageResult, EnrichedGarage } from "@/lib/engine/garage-resolver";
import {
  Vehicule,
  VehiculeStatut,
  Garage,
  DocumentSource,
  LigneIntervention,
  DefaillanceCT,
  EcheancePrevisionnelle,
  AuditConformite,
  isVehicleTrackingSuspended,
  resolveVehicleFromList,
  snapToBusinessDay,
} from "@/lib/types/database.types";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getFoyerOverviewAction, invalidateFoyerCache } from "@/app/actions/foyer";
import { checkVehicleQuota } from "@/lib/integrations/stripe/quota";

export interface EnrichedVehicle extends Partial<Vehicule> {
  id: string;
  foyer_id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  kilometrage_actuel: number;
  statut: VehiculeStatut;
  documents_sources?: Partial<DocumentSource>[];
  lignes_interventions?: Partial<LigneIntervention>[];
  defaillances_ct?: Partial<DefaillanceCT>[];
  echeances_previsionnelles?: Partial<EcheancePrevisionnelle>[];
  audits_conformite?: Partial<AuditConformite>[];
}

export interface VehicleDetailsActionResult {
  vehicle: EnrichedVehicle;
  forecast: MaintenanceForecast;
  conformity: ConformityAuditResult;
  reservationKit: ReservationKit;
  tires: VehicleTireAssessment;
  garageRecommendation?: ResolveGarageResult;
}

export async function getVehicleDetailsAction(identifier: string): Promise<VehicleDetailsActionResult | null> {
  const foyerData = await getFoyerOverviewAction();
  const matched = resolveVehicleFromList(foyerData.vehicles, identifier);

  if (!matched) {
    return null;
  }

  const vehicle = matched as EnrichedVehicle;

  try {
    const cookieStore = await cookies();
    const cleanPlate = (vehicle.immatriculation || "").toUpperCase().replace(/[\s-]/g, "");
    const cleanId = (vehicle.id || "").toUpperCase().replace(/[\s-]/g, "");
    const rawPlate = (vehicle.immatriculation || "").toUpperCase().trim();
    const cookieStatus =
      cookieStore.get(`tracking_status_${vehicle.id}`)?.value ||
      cookieStore.get(`tracking_status_${cleanId}`)?.value ||
      (rawPlate ? cookieStore.get(`tracking_status_${rawPlate}`)?.value : undefined) ||
      (cleanPlate ? cookieStore.get(`tracking_status_${cleanPlate}`)?.value : undefined);

    if (cookieStatus === "suspendu" || cookieStatus === "actif") {
      vehicle.statut = cookieStatus === "suspendu" ? "suspendu" : "actif";
      vehicle.metadata = {
        ...((vehicle.metadata as any) || {}),
        tracking_status: cookieStatus,
        tracking_paused: cookieStatus === "suspendu",
      };
    } else if (
      vehicle.statut === "suspendu" ||
      vehicle.statut === "archive" ||
      (vehicle.metadata as any)?.tracking_status === "suspendu" ||
      (vehicle.metadata as any)?.tracking_paused === true
    ) {
      vehicle.statut = "suspendu";
      vehicle.metadata = {
        ...((vehicle.metadata as any) || {}),
        tracking_status: "suspendu",
        tracking_paused: true,
      };
    }
  } catch {
    // Ignore cookie read error
  }

  if (!vehicle.image_url && (vehicle.metadata as any)?.image_url) {
    vehicle.image_url = (vehicle.metadata as any).image_url;
  }

  if (vehicle.lignes_interventions) {
    vehicle.lignes_interventions.sort(
      (a, b) => new Date(b.date_intervention || 0).getTime() - new Date(a.date_intervention || 0).getTime() || (b.kilometrage_intervention || 0) - (a.kilometrage_intervention || 0)
    );
  }

  if (vehicle.documents_sources) {
    vehicle.documents_sources.sort(
      (a, b) => new Date(b.date_document || 0).getTime() - new Date(a.date_document || 0).getTime()
    );
  }

  // Récupération exhaustive des relevés kilométriques certifiés
  const readingsMap = new Map<string, number>();

  (vehicle.documents_sources || [])
    .filter((d) => d.kilometrage_document && d.date_document)
    .forEach((d) => {
      if (d.date_document && d.kilometrage_document) {
        readingsMap.set(d.date_document, Math.max(readingsMap.get(d.date_document) || 0, Number(d.kilometrage_document)));
      }
    });

  (vehicle.lignes_interventions || [])
    .filter((l) => l.kilometrage_intervention && l.date_intervention)
    .forEach((l) => {
      if (l.date_intervention && l.kilometrage_intervention) {
        readingsMap.set(l.date_intervention, Math.max(readingsMap.get(l.date_intervention) || 0, Number(l.kilometrage_intervention)));
      }
    });

  if (vehicle.kilometrage_actuel && vehicle.date_releve_kilometrage) {
    readingsMap.set(vehicle.date_releve_kilometrage, Math.max(readingsMap.get(vehicle.date_releve_kilometrage) || 0, Number(vehicle.kilometrage_actuel)));
  }

  const mileageReadings = Array.from(readingsMap.entries()).map(([date, mileage]) => ({
    date,
    mileage,
    source: "INVOICE" as const,
  }));

  // Mapping des dernières interventions réelles par catégorie pour le calcul des cycles
  const lastServicesMap = new Map<string, LastServiceRecord>();

  (vehicle.lignes_interventions || []).forEach((l) => {
    const cat = (l.categorie || "").toLowerCase();
    const op = (l.operation || l.description || "").toLowerCase();
    let mappedCat: MaintenanceCategory | null = null;

    if (cat.includes("moteur") || op.includes("vidange") || op.includes("huile")) mappedCat = "DRAIN_OIL";
    else if (cat.includes("climatisation") || op.includes("habitacle") || op.includes("pollen")) mappedCat = "CABIN_FILTER";
    else if (op.includes("filtre a air") || op.includes("filtre à air") || op.includes("filtrante")) mappedCat = "AIR_FILTER";
    else if (op.includes("carburant") || op.includes("gazole") || op.includes("essence")) mappedCat = "FUEL_FILTER";
    else if (cat.includes("freinage") || op.includes("plaquette")) mappedCat = "BRAKE_PADS_FRONT";
    else if (op.includes("liquide de frein") || op.includes("purge")) mappedCat = "BRAKE_FLUID";
    else if (op.includes("bougie")) mappedCat = "SPARK_PLUGS";
    else if (cat.includes("distribution") || op.includes("courroie")) mappedCat = "ACCESSORY_BELT";
    else if (cat.includes("pneumatiques") || op.includes("pneu")) mappedCat = "TIRES_FRONT";
    else if (cat.includes("electricite") || op.includes("batterie")) mappedCat = "BATTERY";
    else if (cat.includes("transmission") || op.includes("boite")) mappedCat = "GEARBOX_OIL";

    if (mappedCat) {
      const existing = lastServicesMap.get(mappedCat);
      if (!existing || new Date(l.date_intervention || 0).getTime() > new Date(existing.serviceDate).getTime()) {
        lastServicesMap.set(mappedCat, {
          category: mappedCat,
          serviceDate: l.date_intervention || "2026-08-21",
          mileage: l.kilometrage_intervention || vehicle.kilometrage_actuel || 0,
          invoiceId: l.document_source_id || undefined,
        });
      }
    }
  });

  const lastServices = Array.from(lastServicesMap.values());

  const regDate = vehicle.date_premiere_immatriculation || (vehicle.annee_mise_en_circulation ? `${vehicle.annee_mise_en_circulation}-01-01` : new Date().toISOString().split("T")[0]);

  const forecast = recalculateMaintenanceForecast({
    readings: mileageReadings,
    currentOdometer: vehicle.kilometrage_actuel || 0,
    vehicleFirstRegistration: regDate,
    lastServices,
  });

  const ctHistory: TechnicalInspectionHistoryItem[] = (vehicle.documents_sources || [])
    .filter((d) => d.file_type === "controle_technique")
    .map((d) => {
      const ocr = (d.ocr_structured_data || {}) as any;
      const defs = vehicle.defaillances_ct || [];
      return {
        id: d.id || "doc-ct",
        inspectionDate: d.date_document || new Date().toISOString().split("T")[0],
        mileage: d.kilometrage_document || vehicle.kilometrage_actuel || 0,
        result: (ocr.resultat_global === "A" || ocr.inspectionResult?.status === "FAVORABLE") ? "FAVORABLE" : "FAVORABLE",
        minorDefectsCount: defs.filter((def) => def.niveau_gravite === "mineure").length,
        majorDefectsCount: defs.filter((def) => def.niveau_gravite === "majeure").length,
        criticalDefectsCount: defs.filter((def) => def.niveau_gravite === "critique").length,
      };
    });

  const conformity = calculateConformityScore({
    vehicleFirstRegistration: regDate,
    currentMileage: vehicle.kilometrage_actuel || 0,
    maintenanceHistory: (vehicle.lignes_interventions || []).map((l) => ({
      id: l.id || "int-1",
      category: (l.categorie || "OTHER") as any,
      title: l.description || l.operation || "Intervention",
      performedDate: l.date_intervention || new Date().toISOString(),
      mileage: l.kilometrage_intervention || 0,
      totalCostTTC: Number(l.prix_total_ttc) || 0,
      garageName: (l as any).emetteur || "Atelier",
      invoiceUrl: l.document_source_id ? `vault://${l.document_source_id}` : "vault://doc",
    })),
    ctHistory,
    overdueMilestones: forecast.projectedMilestones.filter((m) => m.urgency === "OVERDUE" || m.urgency === "CRITICAL"),
  });

  const urgentMilestones = forecast.projectedMilestones.filter((m) => m.urgency !== "OK");
  const milestonesForKit = urgentMilestones.length > 0
    ? urgentMilestones
    : forecast.projectedMilestones.slice(0, 2);

  const reservationKit = generateReservationKit({
    vehicle: {
      make: vehicle.marque,
      model: vehicle.modele,
      version: vehicle.version || undefined,
      licensePlate: vehicle.immatriculation,
      vin: vehicle.vin || undefined,
      currentMileage: vehicle.kilometrage_actuel || 0,
      fuelType: vehicle.energie || undefined,
    },
    upcomingMilestones: milestonesForKit,
  });

  const tires = calculateVehicleTireAssessment({
    vehicleId: vehicle.id,
    currentMileage: vehicle.kilometrage_actuel || 0,
    dailyKmRate: forecast.vehiclePace.dailyKmRate,
    make: vehicle.marque,
    model: vehicle.modele,
    version: vehicle.version || undefined,
    invoices: (vehicle.lignes_interventions || []).map((l) => ({
      date: l.date_intervention || "2026-08-21",
      mileage: l.kilometrage_intervention || vehicle.kilometrage_actuel || 0,
      operation: l.operation || l.description || "",
      emitter: l.emetteur || "Garage",
    })),
  });

  const garageRecommendation = resolveRecommendedGarage({
    vehicle,
    garages: foyerData.garages || [],
    documents: vehicle.documents_sources || [],
    interventions: vehicle.lignes_interventions || [],
  });

  return {
    vehicle,
    forecast,
    conformity,
    reservationKit,
    tires,
    garageRecommendation,
  };
}

export interface SyncManufacturerScheduleResult {
  success: boolean;
  officialPlan?: OfficialMaintenancePlan;
  count?: number;
  error?: string;
}

export async function syncVehicleManufacturerScheduleAction(vehicleId: string): Promise<SyncManufacturerScheduleResult> {
  const supabase = createAdminClient();

  // 1. Fetch vehicle
  const { data: rawVehicle, error } = await (supabase as any)
    .from("vehicules")
    .select("*")
    .eq("id", vehicleId)
    .single();

  if (error || !rawVehicle) {
    return { success: false, error: "Véhicule non trouvé." };
  }

  const vehicle = rawVehicle as Vehicule;

  try {
    // 2. Fetch official manufacturer maintenance plan online via AI
    const officialPlan = await fetchOnlineManufacturerPlan({
      marque: vehicle.marque,
      modele: vehicle.modele,
      version: vehicle.version || undefined,
      annee_mise_en_circulation: vehicle.annee_mise_en_circulation || undefined,
      date_premiere_immatriculation: vehicle.date_premiere_immatriculation || undefined,
      energie: vehicle.energie || undefined,
      kilometrage_actuel: vehicle.kilometrage_actuel,
      vin: vehicle.vin || undefined,
    });

    const km = vehicle.kilometrage_actuel || 0;
    const annualKm = vehicle.km_annuel_moyen || 14000;
    const dailyKm = annualKm / 365;

    // 3. Récupérer l'historique des interventions réelles du véhicule pour ancrer les échéances
    const { data: pastInterventions } = await (supabase as any)
      .from("lignes_interventions")
      .select("operation, categorie, date_intervention, kilometrage_intervention")
      .eq("vehicule_id", vehicleId)
      .order("date_intervention", { ascending: false });

    const interventions = (pastInterventions || []) as Array<{
      operation: string;
      categorie: string;
      date_intervention: string;
      kilometrage_intervention: number;
    }>;

    function findLastService(opCategory: string, opTitle: string) {
      const normCat = (opCategory || "").toLowerCase();
      const normTitle = (opTitle || "").toLowerCase();
      return interventions.find((it) => {
        const itOp = (it.operation || "").toLowerCase();
        const itCat = (it.categorie || "").toLowerCase();
        if (normCat.includes("vidange") || normCat.includes("moteur") || normTitle.includes("vidange") || normTitle.includes("huile") || normTitle.includes("revision")) {
          return itCat === "moteur" || itOp.includes("vidange") || itOp.includes("huile") || itOp.includes("revision");
        }
        if (normCat.includes("habitacle") || normCat.includes("pollen") || normTitle.includes("habitacle")) {
          return itCat === "climatisation" || itOp.includes("habitacle") || itOp.includes("pollen");
        }
        if (normCat.includes("air") || normTitle.includes("filtre a air") || normTitle.includes("filtre à air")) {
          return itOp.includes("air") || itOp.includes("filtrante");
        }
        if (normCat.includes("boite") || normCat.includes("transmission") || normTitle.includes("boite")) {
          return itCat === "transmission" || itOp.includes("boite") || itOp.includes("dw6");
        }
        if (normCat.includes("accessoire") || normCat.includes("courroie") || normTitle.includes("accessoire") || normTitle.includes("distribution")) {
          return itCat === "distribution" || itOp.includes("accessoire") || itOp.includes("alternateur") || itOp.includes("courroie");
        }
        if (normCat.includes("frein") || normTitle.includes("frein")) {
          return itCat === "freinage" || itOp.includes("frein") || itOp.includes("purge");
        }
        return false;
      });
    }

    // 4. Clear existing auto-generated echeances for this vehicle
    await (supabase as any)
      .from("echeances_previsionnelles")
      .delete()
      .eq("vehicule_id", vehicleId);

    const rawOps = officialPlan?.operations || (officialPlan as any)?.recommendedOperations || [];
    const ops = Array.isArray(rawOps) && rawOps.length > 0 ? rawOps : [
      {
        category: "vidange",
        title: "Vidange huile moteur & filtre à huile",
        description: `Remplacement huile moteur homologuée ${vehicle.marque} et filtre à huile.`,
        intervalKm: 20000,
        intervalMonths: 12,
        estimatedCostMinEur: 110,
        estimatedCostMaxEur: 160,
        criticite: "elevee",
      },
      {
        category: "filtre_habitacle",
        title: "Remplacement filtre d'habitacle / pollen",
        description: "Purification de l'air habitacle et protection circuit climatisation.",
        intervalKm: 20000,
        intervalMonths: 12,
        estimatedCostMinEur: 35,
        estimatedCostMaxEur: 55,
        criticite: "faible",
      },
      {
        category: "filtre_air",
        title: "Remplacement filtre à air moteur",
        description: "Optimisation de la combustion et préservation du moteur.",
        intervalKm: 40000,
        intervalMonths: 24,
        estimatedCostMinEur: 35,
        estimatedCostMaxEur: 60,
        criticite: "moyenne",
      },
      {
        category: "liquide_frein",
        title: "Purge et remplacement du liquide de frein",
        description: "Sécurité et maintien de l'efficacité du freinage.",
        intervalKm: 40000,
        intervalMonths: 24,
        estimatedCostMinEur: 60,
        estimatedCostMaxEur: 85,
        criticite: "elevee",
      },
      {
        category: "bougies",
        title: "Remplacement des bougies d'allumage",
        description: "Allumage et rendement moteur optimal.",
        intervalKm: 60000,
        intervalMonths: 48,
        estimatedCostMinEur: 70,
        estimatedCostMaxEur: 130,
        criticite: "moyenne",
      },
      {
        category: "courroie_accessoire",
        title: "Remplacement de la courroie d'accessoires & galets",
        description: "Entraînement de l'alternateur, compresseur de clim et pompe à eau.",
        intervalKm: 120000,
        intervalMonths: 72,
        estimatedCostMinEur: 110,
        estimatedCostMaxEur: 180,
        criticite: "elevee",
      },
      {
        category: "liquide_refroidissement",
        title: "Remplacement et purge du liquide de refroidissement",
        description: "Protection thermique du moteur et propriétés anticorrosion.",
        intervalKm: 100000,
        intervalMonths: 60,
        estimatedCostMinEur: 80,
        estimatedCostMaxEur: 120,
        criticite: "moyenne",
      },
    ];

    // 5. Generate projected echeances from official manufacturer intervals & real history
    const regDateStr = vehicle.date_premiere_immatriculation || (vehicle.annee_mise_en_circulation ? `${vehicle.annee_mise_en_circulation}-01-01` : new Date().toISOString().split("T")[0]);
    const regDate = new Date(regDateStr);

    const newEcheances = ops.map((op: any) => {
      const intervalKm = op.intervalKm || 20000;
      const intervalMonths = op.intervalMonths || 12;
      const lastService = findLastService(op.category || "", op.title || "");

      let targetKm: number;
      let dueDateStr: string;
      let isOverdue = false;

      if (lastService && lastService.kilometrage_intervention > 0) {
        // 1. Si une intervention réelle a été enregistrée
        targetKm = lastService.kilometrage_intervention + intervalKm;
        const timeDueDate = new Date(lastService.date_intervention || new Date());
        timeDueDate.setMonth(timeDueDate.getMonth() + intervalMonths);

        const remainingKm = targetKm - km;
        const daysUntilDueByKm = Math.round(remainingKm / (dailyKm || 35));
        const mileageDueDate = new Date();
        mileageDueDate.setDate(mileageDueDate.getDate() + daysUntilDueByKm);

        const projectedDueDate = timeDueDate.getTime() < mileageDueDate.getTime() ? timeDueDate : mileageDueDate;
        dueDateStr = projectedDueDate.toISOString().split("T")[0];

        isOverdue = projectedDueDate.getTime() <= new Date().getTime() || (targetKm > 0 && targetKm <= km);
      } else {
        // 2. Si AUCUNE facture n'est trouvée pour cette opération
        // Vérifier si l'échéance depuis l'immatriculation est échue
        const firstCapKm = intervalKm;
        const firstCapDate = new Date(regDate);
        firstCapDate.setMonth(firstCapDate.getMonth() + intervalMonths);

        if (firstCapKm <= km || firstCapDate.getTime() <= new Date().getTime()) {
          // L'opération n'a JAMAIS été faite et son terme est dépassé -> EN RETARD
          isOverdue = true;
          const cyclesElapsed = Math.max(1, Math.floor(km / intervalKm));
          targetKm = cyclesElapsed * intervalKm;

          // Date butoir théorique échue
          const overdueDate = new Date(regDate);
          const monthsElapsed = Math.max(1, Math.floor((new Date().getTime() - regDate.getTime()) / (1000 * 3600 * 24 * 30.4375)));
          const timeCycles = Math.max(1, Math.floor(monthsElapsed / intervalMonths));
          overdueDate.setMonth(overdueDate.getMonth() + timeCycles * intervalMonths);
          dueDateStr = overdueDate.toISOString().split("T")[0];
        } else {
          // Opération future normale
          isOverdue = false;
          targetKm = intervalKm;
          dueDateStr = firstCapDate.toISOString().split("T")[0];
        }
      }

      const finalDueDate = snapToBusinessDay(dueDateStr);
      const limitDate = new Date(finalDueDate);
      limitDate.setDate(limitDate.getDate() + 30);

      return {
        foyer_id: vehicle.foyer_id,
        vehicule_id: vehicle.id,
        type_echeance: op.category === "vidange" ? "revision" : op.category,
        libelle: op.title,
        description: lastService
          ? `${op.description} (Dernière réalisée le ${lastService.date_intervention} à ${lastService.kilometrage_intervention.toLocaleString("fr-FR")} km — Préconisation : +${intervalKm.toLocaleString("fr-FR")} km / ${intervalMonths} mois)`
          : `${op.description} (Préconisation constructeur ${vehicle.marque} : tous les ${intervalKm.toLocaleString("fr-FR")} km ou ${intervalMonths} mois)`,
        date_preconisee: finalDueDate,
        km_preconise: targetKm,
        date_limite: snapToBusinessDay(limitDate.toISOString().split("T")[0]),
        km_limite: targetKm + 2000,
        criticite: isOverdue ? "elevee" : (op.criticite || "moyenne"),
        statut: isOverdue ? "en_retard" : "a_venir",
        cout_estime_min: op.estimatedCostMinEur || 100,
        cout_estime_max: op.estimatedCostMaxEur || 180,
        source_recommandation: "constructeur",
      };
    });

    if (newEcheances.length > 0) {
      await (supabase as any)
        .from("echeances_previsionnelles")
        .insert(newEcheances);
    }

    try {
      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/vehicles/${vehicleId}`);
    } catch {
      // Ignore
    }

    return {
      success: true,
      officialPlan,
      count: newEcheances.length,
    };
  } catch (err: any) {
    console.error("Error syncing manufacturer schedule:", err);
    return { success: false, error: err.message || "Erreur lors de la récupération du plan constructeur." };
  }
}

/**
 * Suspendre ou Réactiver le suivi mécanique d'un véhicule du foyer
 * Désactive toutes les alertes et supprime automatiquement ses événements de Google Calendar
 */
export async function toggleVehicleTrackingStatusAction(
  vehicleId: string,
  newStatus: "actif" | "suspendu"
): Promise<{ success: boolean; status: "actif" | "suspendu"; error?: string }> {
  try {
    const rawQuery = decodeURIComponent(vehicleId || "").trim();
    const cleanQuery = rawQuery.toUpperCase().replace(/[\s-]/g, "");

    // 0. Résolution du véhicule ciblé pour obtenir tous ses identifiants
    const foyerData = await getFoyerOverviewAction();
    const allVehs = foyerData.vehicles || [];
    const matchedVehicle = allVehs.find((v) => {
      if (v.id === vehicleId || v.id === rawQuery) return true;
      if (v.immatriculation) {
        const vImm = v.immatriculation.trim().toUpperCase();
        const vClean = vImm.replace(/[\s-]/g, "");
        return vImm === rawQuery.toUpperCase() || vClean === cleanQuery;
      }
      return false;
    });

    const vId = matchedVehicle?.id || rawQuery;
    const cleanId = (vId || "").toUpperCase().replace(/[\s-]/g, "");
    const rawPlate = matchedVehicle?.immatriculation || (rawQuery.includes("-") || rawQuery.length <= 10 ? rawQuery : "");
    const cleanPlate = rawPlate ? rawPlate.toUpperCase().replace(/[\s-]/g, "") : cleanQuery;

    // 1. Vérification du quota d'abonnement en cas de reprise de suivi (activation)
    if (newStatus === "actif") {
      const currentActiveCount = allVehs.filter(
        (v) =>
          !isVehicleTrackingSuspended(v) &&
          v.id !== vId &&
          v.id !== rawQuery &&
          v.immatriculation?.replace(/[\s-]/g, "").toUpperCase() !== cleanPlate
      ).length;

      const quotaCheck = checkVehicleQuota(currentActiveCount, foyerData.foyer?.metadata);
      if (!quotaCheck.allowed) {
        return {
          success: false,
          status: "suspendu",
          error: quotaCheck.reason || "Quota de véhicules atteint pour votre formule.",
        };
      }
    }

    // 2. Sauvegarde exhaustive et instantanée dans les cookies sécurisés (persistance 1 an)
    try {
      const cookieStore = await cookies();
      const cookieKeys = Array.from(
        new Set(
          [
            vId ? `tracking_status_${vId}` : null,
            cleanId ? `tracking_status_${cleanId}` : null,
            rawPlate ? `tracking_status_${rawPlate}` : null,
            cleanPlate ? `tracking_status_${cleanPlate}` : null,
            rawQuery ? `tracking_status_${rawQuery}` : null,
            cleanQuery ? `tracking_status_${cleanQuery}` : null,
          ].filter(Boolean) as string[]
        )
      );

      for (const key of cookieKeys) {
        cookieStore.set(key, newStatus, { path: "/", maxAge: 60 * 60 * 24 * 365 });
      }
    } catch {
      // Ignore cookie write failure
    }

    // 3. Invalidation du cache mémoire foyer
    await invalidateFoyerCache();

    // 4. Mise à jour Supabase si accessible
    try {
      const supabase = createAdminClient();
      const dbStatut = newStatus === "suspendu" ? "archive" : "actif";

      const { data: vehList } = await (supabase as any)
        .from("vehicules")
        .select("id, metadata, statut, immatriculation");

      const target = (vehList || []).find((v: any) =>
        v.id === vId ||
        v.id === rawQuery ||
        (v.immatriculation && v.immatriculation.replace(/[\s-]/g, "").toUpperCase() === cleanPlate) ||
        (v.immatriculation && v.immatriculation.trim().toUpperCase() === rawQuery.toUpperCase())
      );

      if (target) {
        const currentMeta = (target.metadata && typeof target.metadata === "object") ? target.metadata : {};
        await (supabase as any)
          .from("vehicules")
          .update({
            statut: dbStatut,
            metadata: {
              ...currentMeta,
              tracking_status: newStatus,
              tracking_paused: newStatus === "suspendu",
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", target.id);
      }
    } catch (dbErr) {
      console.warn("Supabase tracking update warning:", dbErr);
    }

    // 5. Synchroniser / nettoyer l'agenda Google Calendar en arrière-plan
    try {
      const { syncGoogleCalendarAction } = await import("./calendar");
      await syncGoogleCalendarAction();
    } catch (calErr) {
      console.warn("Avertissement mise à jour Google Calendar suite au changement de statut:", calErr);
    }

    try {
      revalidatePath("/dashboard");
      if (vId) revalidatePath(`/dashboard/vehicles/${vId}`);
      if (rawPlate) revalidatePath(`/dashboard/vehicles/${rawPlate}`);
      if (cleanPlate) revalidatePath(`/dashboard/vehicles/${cleanPlate}`);
    } catch {
      // Ignore
    }

    return { success: true, status: newStatus };
  } catch (err: any) {
    console.error("Échec toggleVehicleTrackingStatusAction:", err);
    return { success: false, status: newStatus, error: err.message };
  }
}

/**
 * Supprimer définitivement un véhicule du foyer
 */
export async function deleteVehicleAction(
  vehicleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // 1. Supprimer les tables dépendantes
    await (supabase as any).from("echeances_previsionnelles").delete().eq("vehicule_id", vehicleId);
    await (supabase as any).from("lignes_interventions").delete().eq("vehicule_id", vehicleId);
    await (supabase as any).from("defaillances_ct").delete().eq("vehicule_id", vehicleId);
    await (supabase as any).from("audits_conformite").delete().eq("vehicule_id", vehicleId);
    await (supabase as any).from("documents_sources").delete().eq("vehicule_id", vehicleId);

    // 2. Supprimer la ligne du véhicule
    const { error } = await (supabase as any).from("vehicules").delete().eq("id", vehicleId);

    if (error) {
      throw new Error(`Erreur lors de la suppression du véhicule: ${error.message}`);
    }

    // 3. Mettre à jour l'agenda Google Calendar
    try {
      const { syncGoogleCalendarAction } = await import("./calendar");
      await syncGoogleCalendarAction();
    } catch (calErr) {
      console.warn("Avertissement mise à jour Google Calendar suite à la suppression:", calErr);
    }

    try {
      revalidatePath("/dashboard");
    } catch {
      // Ignore
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
