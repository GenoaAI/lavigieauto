"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { recalculateMaintenanceForecast, MaintenanceForecast, LastServiceRecord } from "@/lib/engine/cycles";
import { calculateConformityScore, ConformityAuditResult, TechnicalInspectionHistoryItem } from "@/lib/engine/conformity-score";
import { MaintenanceCategory } from "@/lib/ai";
import { generateReservationKit, ReservationKit } from "@/lib/engine/reservation-kit";
import { calculateVehicleTireAssessment, VehicleTireAssessment } from "@/lib/engine/tires";
import { calculateVehicleBrakeAssessment, VehicleBrakeAssessment } from "@/lib/engine/brakes";
import { fetchOnlineManufacturerPlan, OfficialMaintenancePlan } from "@/lib/engine/manufacturer-retriever";
import { resolveRecommendedGarage, ResolveGarageResult, EnrichedGarage } from "@/lib/engine/garage-resolver";
import { reconcileSingleOperationWithHistory } from "@/lib/engine/reconciliation";
import {
  Vehicule,
  VehiculeStatut,
  Garage,
  DocumentSource,
  LigneIntervention,
  DefaillanceCT,
  EcheancePrevisionnelle,
  AuditConformite,
  TypeEcheance,
  normalizeTypeEcheance,
  isVehicleTrackingSuspended,
  resolveVehicleFromList,
  snapToBusinessDay,
} from "@/lib/types/database.types";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getFoyerOverviewAction, invalidateFoyerCache } from "@/app/actions/foyer";
import { checkVehicleQuota } from "@/lib/integrations/stripe/quota";
import { resolveVehicleCatalogSpecs } from "@/lib/engine/vehicle-catalog";

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
  brakes: VehicleBrakeAssessment;
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

  const catalogSpecs = resolveVehicleCatalogSpecs({
    make: vehicle.marque,
    model: vehicle.modele,
    version: vehicle.version,
    fuel: vehicle.energie,
    fiscalPower: vehicle.puissance_fiscale,
    powerKw: undefined,
  });

  if (!vehicle.image_url) {
    vehicle.image_url = (vehicle.metadata as any)?.image_url || catalogSpecs.imageUrl || null;
  }

  if (!vehicle.version || vehicle.version === "Standard") {
    vehicle.version = catalogSpecs.version || vehicle.version;
  }
  if (!vehicle.puissance_din && catalogSpecs.dinPower) {
    vehicle.puissance_din = catalogSpecs.dinPower;
  }
  if (!vehicle.boite_vitesse && catalogSpecs.boiteVitesse) {
    vehicle.boite_vitesse = catalogSpecs.boiteVitesse;
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

  const docMaxKm = Math.max(
    0,
    ...(vehicle.documents_sources || []).map((d) => Number(d.kilometrage_document) || 0),
    ...(vehicle.lignes_interventions || []).map((l) => Number(l.kilometrage_intervention) || 0)
  );

  // Auto-guérison si le kilométrage en base a été artificiellement gonflé au-delà des documents réels du véhicule
  if (docMaxKm > 0 && (vehicle.kilometrage_actuel || 0) > docMaxKm) {
    vehicle.kilometrage_actuel = docMaxKm;
  }

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

    if (cat.includes("moteur") || op.includes("vidange") || op.includes("huile") || op.includes("revision") || op.includes("forfait entretien")) mappedCat = "DRAIN_OIL";
    else if (cat.includes("climatisation") || op.includes("habitacle") || op.includes("pollen")) mappedCat = "CABIN_FILTER";
    else if (op.includes("filtre a air") || op.includes("filtre à air") || op.includes("filtrante") || op.includes("filtre air")) mappedCat = "AIR_FILTER";
    else if (op.includes("carburant") || op.includes("gazole") || op.includes("essence") || op.includes("filtre gasoil")) mappedCat = "FUEL_FILTER";
    else if (cat.includes("freinage") || op.includes("plaquette") || op.includes("disque") || op.includes("frein")) mappedCat = "BRAKE_PADS_FRONT";
    else if (op.includes("liquide de frein") || op.includes("purge")) mappedCat = "BRAKE_FLUID";
    else if (op.includes("bougie") || op.includes("allumage") || cat.includes("allumage")) mappedCat = "SPARK_PLUGS";
    else if (op.includes("refroidissement") || op.includes("liquide refroidissement") || op.includes("antigel") || op.includes("radiateur")) mappedCat = "COOLANT";
    else if (cat.includes("distribution") || op.includes("courroie") || op.includes("galet")) mappedCat = "ACCESSORY_BELT";
    else if (
      cat.includes("pneumatiques") ||
      cat.includes("tire") ||
      op.includes("pneu") ||
      op.includes("pneumatique") ||
      op.includes("turanza") ||
      op.includes("bridgestone") ||
      op.includes("michelin") ||
      op.includes("kleber") ||
      op.includes("continental") ||
      op.includes("goodyear") ||
      op.includes("pirelli") ||
      op.includes("hankook") ||
      op.includes("dunlop") ||
      op.includes("crossclimate") ||
      op.includes("primacy") ||
      op.includes("dynaxer") ||
      op.includes("roue") ||
      op.includes("valve") ||
      op.includes("equilibrage") ||
      /\b\d{3}[\/\s\-]\d{2}\s*R\s*\d{2}\b/i.test(op)
    ) mappedCat = "TIRES_FRONT";
    else if (cat.includes("electricite") || op.includes("batterie")) mappedCat = "BATTERY";
    else if (cat.includes("transmission") || op.includes("boite") || op.includes("pont")) mappedCat = "GEARBOX_OIL";

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
      const defs = (vehicle.defaillances_ct || []).filter(
        (def) => !def.document_source_id || def.document_source_id === d.id
      );

      const rawStatus = (
        ocr.inspectionResult?.status ||
        ocr.resultat_global ||
        ""
      ).toUpperCase();

      let result: "FAVORABLE" | "UNFAVORABLE_MAJOR" | "UNFAVORABLE_CRITICAL" = "FAVORABLE";
      if (
        rawStatus === "R" ||
        rawStatus === "UNFAVORABLE_CRITICAL" ||
        rawStatus.includes("CRITIQUE") ||
        defs.some((def) => def.niveau_gravite === "critique")
      ) {
        result = "UNFAVORABLE_CRITICAL";
      } else if (
        rawStatus === "S" ||
        rawStatus === "UNFAVORABLE_MAJOR" ||
        rawStatus.includes("MAJEURE") ||
        rawStatus.includes("DEFAVORABLE") ||
        defs.some((def) => def.niveau_gravite === "majeure")
      ) {
        result = "UNFAVORABLE_MAJOR";
      }

      return {
        id: d.id || "doc-ct",
        inspectionDate: d.date_document || new Date().toISOString().split("T")[0],
        mileage: d.kilometrage_document || vehicle.kilometrage_actuel || 0,
        result,
        minorDefectsCount: defs.filter((def) => def.niveau_gravite === "mineure").length,
        majorDefectsCount: defs.filter((def) => def.niveau_gravite === "majeure").length,
        criticalDefectsCount: defs.filter((def) => def.niveau_gravite === "critique").length,
      };
    })
    .sort((a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime());

  const allTireOperations: Array<{
    date: string;
    mileage: number;
    operation: string;
    emitter?: string;
  }> = [];

  (vehicle.lignes_interventions || []).forEach((l) => {
    allTireOperations.push({
      date: l.date_intervention || "2026-08-21",
      mileage: l.kilometrage_intervention || vehicle.kilometrage_actuel || 0,
      operation: l.operation || l.description || "",
      emitter: l.emetteur || "Garage",
    });
  });

  (vehicle.documents_sources || []).forEach((d) => {
    const ocr = (d.ocr_structured_data || {}) as any;
    const docDate = d.date_document || "2026-08-21";
    const docKm = d.kilometrage_document || vehicle.kilometrage_actuel || 0;
    const emitter = d.emetteur || "Garage";

    const items = [
      ...(Array.isArray(ocr.prestations) ? ocr.prestations : []),
      ...(Array.isArray(ocr.lineItems) ? ocr.lineItems : []),
      ...(Array.isArray(ocr.lignes_prestations) ? ocr.lignes_prestations : []),
      ...(Array.isArray(ocr.recapitulatif_maintenance?.operations_realisees)
        ? ocr.recapitulatif_maintenance.operations_realisees.map((op: string) => ({ description: op }))
        : []),
    ];

    items.forEach((it: any) => {
      const desc = it.description || it.designation || it.operation || it.label || (typeof it === "string" ? it : "");
      if (desc) {
        allTireOperations.push({
          date: docDate,
          mileage: docKm,
          operation: desc,
          emitter,
        });
      }
    });
  });

  const tires = calculateVehicleTireAssessment({
    vehicleId: vehicle.id,
    currentMileage: vehicle.kilometrage_actuel || 0,
    dailyKmRate: forecast.vehiclePace.dailyKmRate,
    make: vehicle.marque,
    model: vehicle.modele,
    version: vehicle.version || undefined,
    invoices: allTireOperations,
  });

  const inspectionsForBrakes = (vehicle.documents_sources || [])
    .filter((d) => d.file_type === "controle_technique")
    .map((d) => {
      const ocr = (d.ocr_structured_data || {}) as any;
      const defs = (vehicle.defaillances_ct || []).filter(
        (def) => !def.document_source_id || def.document_source_id === d.id
      );
      return {
        date: d.date_document || "2026-08-20",
        mileage: d.kilometrage_document || vehicle.kilometrage_actuel || 0,
        observations: ocr.observations ? JSON.stringify(ocr.observations) : undefined,
        isFavorable: ocr.inspectionResult?.isFavorable ?? true,
        defects: defs.map((df) => ({
          code: df.code_defaillance || undefined,
          description: df.libelle,
        })),
      };
    });

  const brakes = calculateVehicleBrakeAssessment({
    vehicleId: vehicle.id,
    currentMileage: vehicle.kilometrage_actuel || 0,
    dailyKmRate: forecast.vehiclePace.dailyKmRate,
    make: vehicle.marque,
    model: vehicle.modele,
    version: vehicle.version || undefined,
    transmission: vehicle.boite_vitesse || undefined,
    invoices: allTireOperations,
    inspections: inspectionsForBrakes,
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
    brakeSafetyAssessment: {
      urgentActionNeeded: brakes.urgentActionNeeded,
      globalHealthScore: brakes.globalHealthScore,
      frontWearPercentage: brakes.frontAxle.wearPercentage,
      rearWearPercentage: brakes.rearAxle.wearPercentage,
    },
    tireSafetyAssessment: {
      urgentActionNeeded: tires.frontAxle.status === "CRITICAL" || tires.rearAxle.status === "CRITICAL",
      globalHealthScore: Math.round(((100 - tires.frontAxle.wearPercentage) + (100 - tires.rearAxle.wearPercentage)) / 2),
    },
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
    brakes,
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
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleId);
  const cleanId = (vehicleId || "").replace(/[^a-zA-Z0-9-]/g, "");
  const { data: rawVehicle, error } = isUuid
    ? await (supabase as any).from("vehicules").select("*").eq("id", vehicleId).maybeSingle()
    : await (supabase as any).from("vehicules").select("*").or(`immatriculation.ilike.%${cleanId}%,vin.ilike.%${cleanId}%`).maybeSingle();

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

    // 3. Récupérer l'historique des interventions réelles et des documents du véhicule pour ancrer les échéances
    const { data: pastInterventions } = await (supabase as any)
      .from("lignes_interventions")
      .select("id, operation, description, categorie, date_intervention, kilometrage_intervention, prix_total_ttc, emetteur, document_source_id, metadata")
      .eq("vehicule_id", vehicle.id)
      .order("date_intervention", { ascending: false });

    const { data: allDocs } = await (supabase as any)
      .from("documents_sources")
      .select("id, date_document, kilometrage_document, file_type, emetteur")
      .eq("vehicule_id", vehicle.id)
      .order("date_document", { ascending: false });

    const latestCt = (allDocs || []).find((d: any) => {
      const ft = (d.file_type || "").toLowerCase();
      const em = (d.emetteur || "").toLowerCase();
      return (
        ft === "technical_inspection" ||
        ft === "ct" ||
        ft === "controle_technique" ||
        em.includes("dekra") ||
        em.includes("autosur") ||
        em.includes("securitest") ||
        em.includes("sécuritest") ||
        em.includes("autovision") ||
        em.includes("auto securite") ||
        em.includes("auto sécurité") ||
        em.includes("norisko") ||
        em.includes("autocontrol") ||
        em.includes("mon controle technique") ||
        em.includes("mon contrôle technique") ||
        em.includes("service controle") ||
        em.includes("service contrôle") ||
        em.includes("centre de controle") ||
        em.includes("centre de contrôle") ||
        em.includes("controle technique") ||
        em.includes("contrôle technique") ||
        em.includes("ct") ||
        em.includes("technique")
      );
    });

    if (latestCt && latestCt.file_type !== "controle_technique" && latestCt.id) {
      await (supabase as any)
        .from("documents_sources")
        .update({ file_type: "controle_technique" })
        .eq("id", latestCt.id);
    }

    const interventions = (pastInterventions || []) as Array<{
      operation: string;
      categorie: string;
      date_intervention: string;
      kilometrage_intervention: number;
      prix_total_ttc?: number;
    }>;

    function findLastService(opCategory: string, opTitle: string) {
      const normCat = (opCategory || "").toLowerCase();
      const normTitle = (opTitle || "").toLowerCase();

      if (normCat.includes("controle_technique") || normCat.includes("ct") || normTitle.includes("contrôle technique") || normTitle.includes("controle technique")) {
        if (latestCt) {
          return {
            operation: "Contrôle Technique Périodique (Favorable)",
            categorie: "controle_technique",
            date_intervention: latestCt.date_document,
            kilometrage_intervention: latestCt.kilometrage_document || 0,
          };
        }
      }

      return interventions.find((it) => {
        const itOp = (it.operation || "").toLowerCase();
        const itCat = (it.categorie || "").toLowerCase();
        if (normCat.includes("vidange") || normCat.includes("revision") || normTitle.includes("vidange") || normTitle.includes("huile") || normTitle.includes("revision")) {
          return itOp.includes("vidange") || itOp.includes("huile") || itOp.includes("revision") || itOp.includes("révision") || itOp.includes("forfait entretien") || (itCat === "moteur" && (itOp.includes("filtre a huile") || itOp.includes("filtre à huile") || itOp.includes("5w") || itOp.includes("0w")));
        }
        if (normCat.includes("habitacle") || normCat.includes("pollen") || normTitle.includes("habitacle") || normTitle.includes("pollen")) {
          return itOp.includes("habitacle") || itOp.includes("pollen") || itOp.includes("anti-allergène") || itOp.includes("anti allergene");
        }
        if (normCat.includes("clim") || normTitle.includes("clim") || normTitle.includes("climatisation")) {
          return itOp.includes("clim") || itOp.includes("climatisation") || itOp.includes("habitacle") || itOp.includes("pollen");
        }
        if (normCat.includes("air") || normTitle.includes("filtre a air") || normTitle.includes("filtre à air") || normTitle.includes("filtre air")) {
          return itOp.includes("filtre a air") || itOp.includes("filtre à air") || itOp.includes("filtre air") || itOp.includes("filtrante air") || (itCat === "filtre_air" && itOp.includes("air"));
        }
        if (normCat.includes("bougie") || normCat.includes("allumage") || normTitle.includes("bougie") || normTitle.includes("allumage")) {
          return itOp.includes("bougie") || itOp.includes("allumage") || itCat === "bougies" || itCat === "allumage";
        }
        if (normCat.includes("frein") || normTitle.includes("liquide de frein") || normTitle.includes("liquide frein") || normCat.includes("liquide_frein")) {
          return (itOp.includes("liquide de frein") || itOp.includes("liquide frein") || itOp.includes("purge frein") || itOp.includes("forfait liquide de frein") || itOp.includes("forfait liquide frein") || itCat === "liquide_frein") && !itOp.includes("controle frein");
        }
        if (normCat.includes("refroidissement") || normCat.includes("coolant") || normTitle.includes("refroidissement") || normTitle.includes("liquide de refroidissement")) {
          return (itOp.includes("circuit de liquide de refroidissement") || itOp.includes("purge liquide de refroidissement") || itOp.includes("vidange-rempli") || itOp.includes("vidange circuit") || itOp.includes("remplacement liquide de refroidissement") || itCat === "liquide_refroidissement" || (itOp.includes("refroidissement") && (it.prix_total_ttc || 0) > 15));
        }
        if (normCat.includes("carburant") || normTitle.includes("carburant") || normTitle.includes("gasoil") || normTitle.includes("gazole")) {
          return itOp.includes("filtre carburant") || itOp.includes("filtre gasoil") || itOp.includes("filtre gazole") || itOp.includes("filtre essence") || (itCat === "filtre_carburant" && itOp.includes("filtre"));
        }
        if (normCat.includes("pneu") || normCat.includes("tire") || normTitle.includes("pneu")) {
          return itOp.includes("pneu") || itOp.includes("pneumatique") || itOp.includes("turanza") || itOp.includes("bridgestone") || itOp.includes("michelin") || itOp.includes("kleber") || itOp.includes("roue") || itOp.includes("equilibrage") || itCat === "pneumatiques";
        }
        if (normCat.includes("courroie") || normCat.includes("accessoire") || normCat.includes("distribution") || normTitle.includes("courroie") || normTitle.includes("accessoire") || normTitle.includes("distribution") || normTitle.includes("galet")) {
          return itOp.includes("courroie") || itOp.includes("accessoire") || itOp.includes("distribution") || itOp.includes("galet") || itCat === "distribution" || itCat === "courroie_accessoire";
        }
        if (normCat.includes("batterie") || normCat.includes("battery") || normTitle.includes("batterie")) {
          return itOp.includes("batterie") || itOp.includes("accumulateur") || itCat === "electricite" || itCat === "batterie";
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

    const isPetrol = (vehicle.energie || "").toLowerCase().includes("essence") || !(vehicle.energie || "").toLowerCase().includes("diesel");
    const isSuzuki = (vehicle.marque || "").toLowerCase().includes("suzuki");
    const isVitara = (vehicle.modele || "").toLowerCase().includes("vitara");

    const filteredOps = ops.filter((op: any) => {
      const cat = (op.category || "").toLowerCase();
      const title = (op.title || "").toLowerCase();
      const desc = (op.description || "").toLowerCase();

      // 1. Élimination stricte des opérations de recharge/vidange de climatisation (hors carnet d'usine)
      if (cat === "climatisation" || title.includes("recharge fluide") || title.includes("recharge clim") || desc.includes("recharge fluide") || desc.includes("recharge de gaz")) {
        return false;
      }

      // 2. Élimination du filtre carburant externe pour les essences avec crépine réservoir
      if (isPetrol && (cat.includes("carburant") || cat.includes("essence") || title.includes("filtre à carburant") || title.includes("filtre à essence") || title.includes("filtre essence"))) {
        if (isSuzuki || isVitara) {
          return false;
        }
      }

      // 3. Élimination de la courroie de distribution pour les moteurs à chaîne
      if (isSuzuki && isPetrol && (cat === "courroie_distribution" || title.includes("courroie de distribution") || title.includes("kit de distribution"))) {
        return false;
      }

      return true;
    });

    // 5. Generate projected echeances from official manufacturer intervals & real history
    const regDateStr = vehicle.date_premiere_immatriculation || (vehicle.annee_mise_en_circulation ? `${vehicle.annee_mise_en_circulation}-01-01` : new Date().toISOString().split("T")[0]);
    const regDate = new Date(regDateStr);

    const newEcheances = filteredOps.map((op: any) => {
      const isPurelyTimeBased =
        op.category === "controle_technique" ||
        op.category === "ct" ||
        (op.title || "").toLowerCase().includes("contrôle technique") ||
        (op.title || "").toLowerCase().includes("controle technique") ||
        op.intervalKm === 0 ||
        op.intervalKm >= 999999;

      const intervalKm = isPurelyTimeBased ? 0 : (op.intervalKm || 20000);
      const intervalMonths = op.intervalMonths || (isPurelyTimeBased ? 24 : 12);
      const { lastService, justification } = reconcileSingleOperationWithHistory({
        category: op.category || "",
        title: op.title || "",
        interventions,
        documents: allDocs || [],
      });

      let targetKm: number;
      let dueDateStr: string;
      let isOverdue = false;

      if (lastService && (lastService.kilometrage_intervention > 0 || lastService.date_intervention)) {
        // 1. Si une intervention réelle a été enregistrée
        const lastDate = new Date(lastService.date_intervention || new Date());
        const timeDueDate = new Date(lastDate);
        timeDueDate.setMonth(timeDueDate.getMonth() + intervalMonths);

        if (isPurelyTimeBased) {
          targetKm = 0;
          dueDateStr = timeDueDate.toISOString().split("T")[0];
          isOverdue = timeDueDate.getTime() <= new Date().getTime();
        } else {
          targetKm = Number(lastService.kilometrage_intervention || km) + intervalKm;

          if (targetKm <= km) {
            // Butoir kilométrique dépassé dans le passé : date estimée de franchissement
            const daysToCap = Math.round(intervalKm / (dailyKm || 35));
            const pastMileageDate = new Date(lastDate);
            pastMileageDate.setDate(pastMileageDate.getDate() + daysToCap);

            const pastDueDate = timeDueDate.getTime() < pastMileageDate.getTime() ? timeDueDate : pastMileageDate;
            dueDateStr = pastDueDate.toISOString().split("T")[0];
            isOverdue = true;
          } else {
            // Butoir kilométrique dans le futur
            const remainingKm = targetKm - km;
            const daysUntilDueByKm = Math.round(remainingKm / (dailyKm || 35));
            const mileageDueDate = new Date();
            mileageDueDate.setDate(mileageDueDate.getDate() + daysUntilDueByKm);

            const projectedDueDate = timeDueDate.getTime() < mileageDueDate.getTime() ? timeDueDate : mileageDueDate;
            dueDateStr = projectedDueDate.toISOString().split("T")[0];
            isOverdue = projectedDueDate.getTime() <= new Date().getTime();
          }
        }
      } else {
        // 2. Si AUCUNE facture n'est trouvée pour cette opération
        if (isPurelyTimeBased) {
          // CT : 1er passage obligatoire à 4 ans (48 mois), puis tous les 2 ans (24 mois)
          const firstCtDate = new Date(regDate);
          firstCtDate.setMonth(firstCtDate.getMonth() + 48);

          if (firstCtDate.getTime() <= new Date().getTime()) {
            isOverdue = true;
            const monthsElapsed = Math.max(0, Math.floor((new Date().getTime() - firstCtDate.getTime()) / (1000 * 3600 * 24 * 30.4375)));
            const cyclesElapsed = Math.floor(monthsElapsed / 24) + 1;
            const overdueDate = new Date(firstCtDate);
            overdueDate.setMonth(overdueDate.getMonth() + (cyclesElapsed - 1) * 24);
            dueDateStr = overdueDate.toISOString().split("T")[0];
          } else {
            isOverdue = false;
            dueDateStr = firstCtDate.toISOString().split("T")[0];
          }
          targetKm = 0;
        } else {
          // Opération standard (kilomètre et temps)
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
      }

      const finalDueDate = snapToBusinessDay(dueDateStr);
      const limitDate = new Date(finalDueDate);
      limitDate.setDate(limitDate.getDate() + 30);

      return {
        foyer_id: vehicle.foyer_id,
        vehicule_id: vehicle.id,
        type_echeance: normalizeTypeEcheance(op.category || op.title || ""),
        libelle: op.title,
        description: lastService
          ? `${op.description} (Dernière réalisée le ${lastService.date_intervention} à ${Number(lastService.kilometrage_intervention).toLocaleString("fr-FR")} km — Préconisation : +${intervalKm.toLocaleString("fr-FR")} km / ${intervalMonths} mois)`
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
        metadata: {
          justification: justification || null,
        },
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

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleId);
    const cleanId = (vehicleId || "").replace(/[^a-zA-Z0-9-]/g, "");
    const { data: targetVeh } = isUuid
      ? await (supabase as any).from("vehicules").select("id").eq("id", vehicleId).maybeSingle()
      : await (supabase as any).from("vehicules").select("id").or(`immatriculation.ilike.%${cleanId}%,vin.ilike.%${cleanId}%`).maybeSingle();

    const realVehicleId = targetVeh?.id || vehicleId;

    // 1. Supprimer les tables dépendantes
    await (supabase as any).from("echeances_previsionnelles").delete().eq("vehicule_id", realVehicleId);
    await (supabase as any).from("lignes_interventions").delete().eq("vehicule_id", realVehicleId);
    await (supabase as any).from("defaillances_ct").delete().eq("vehicule_id", realVehicleId);
    await (supabase as any).from("audits_conformite").delete().eq("vehicule_id", realVehicleId);
    await (supabase as any).from("documents_sources").delete().eq("vehicule_id", realVehicleId);

    // 2. Supprimer la ligne du véhicule
    const { error } = await (supabase as any).from("vehicules").delete().eq("id", realVehicleId);

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

/**
 * Mettre à jour les informations du véhicule (version, modèle, finition, usage, etc.)
 */
export async function updateVehicleDetailsAction(
  vehicleId: string,
  payload: {
    marque?: string;
    modele?: string;
    version?: string;
    puissance_din?: number;
    puissance_fiscale?: number;
    energie?: string;
    boite_vitesse?: string;
    usage_type?: string;
    km_annuel_moyen?: number;
    image_url?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleId);
    const cleanId = (vehicleId || "").replace(/[^a-zA-Z0-9-]/g, "");
    const { data: targetVeh } = isUuid
      ? await (supabase as any).from("vehicules").select("id").eq("id", vehicleId).maybeSingle()
      : await (supabase as any).from("vehicules").select("id").or(`immatriculation.ilike.%${cleanId}%,vin.ilike.%${cleanId}%`).maybeSingle();

    const realVehicleId = targetVeh?.id || vehicleId;

    const { error } = await (supabase as any)
      .from("vehicules")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", realVehicleId);

    if (error) throw new Error(error.message);

    try {
      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/vehicles/${vehicleId}`);
      revalidatePath(`/dashboard/vehicles/${realVehicleId}`);
    } catch {
      // Ignore
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
