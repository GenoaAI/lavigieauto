"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocumentDropzone } from "@/components/scanner/DocumentDropzone";
import { ReservationKitModal } from "@/components/vehicles/ReservationKitModal";
import { DeleteVehicleModal } from "@/components/vehicles/DeleteVehicleModal";
import { TireWearTracker } from "@/components/vehicles/TireWearTracker";
import { VehicleVaultList } from "@/components/vault/VehicleVaultList";
import {
  getVehicleDetailsAction,
  syncVehicleManufacturerScheduleAction,
  toggleVehicleTrackingStatusAction,
} from "@/app/actions/vehicles";
import { deleteDocumentAndRecalculateAction } from "@/app/actions/documents";
import { isVehicleTrackingSuspended } from "@/lib/types/database.types";
import { UiModeSwitch, useUiViewMode } from "@/components/ui/UiModeSwitch";
import { UniversalCalendarDropdown } from "@/components/calendar/UniversalCalendarDropdown";
import type { UniversalCalendarEvent } from "@/lib/calendar/universal-calendar";
import {
  Car,
  Calendar,
  Wrench,
  CheckCircle,
  AlertCircle,
  FileText,
  PhoneCall,
  Share2,
  TrendingUp,
  Award,
  ArrowLeft,
  Loader2,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FolderLock,
  Layers,
  PauseCircle,
  PlayCircle,
  Trash2,
} from "lucide-react";

interface VehicleDetailClientViewProps {
  initialVehicleData: any;
  vehicleId: string;
}

export function VehicleDetailClientView({
  initialVehicleData,
  vehicleId,
}: VehicleDetailClientViewProps) {
  const router = useRouter();
  const [uiMode, setUiMode] = useUiViewMode();
  const [compactTab, setCompactTab] = useState<"echeances" | "historique" | "sante">("echeances");
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);
  const [, startTabTransition] = useTransition();

  const [loading, setLoading] = useState(false);
  const [syncingPlan, setSyncingPlan] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [vehicleData, setVehicleData] = useState<any>(initialVehicleData);
  const [isKitOpen, setIsKitOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusToggling, setIsStatusToggling] = useState(false);

  const loadVehicle = async () => {
    setLoading(true);
    try {
      const res = await getVehicleDetailsAction(vehicleId);
      if (res) {
        setVehicleData(res);
      }
    } catch (e) {
      console.error("Error loading vehicle details:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialVehicleData) {
      loadVehicle();
    }
  }, [vehicleId, initialVehicleData]);

  const handleTabChange = (tab: "echeances" | "historique" | "sante") => {
    startTabTransition(() => {
      setCompactTab(tab);
    });
  };

  const handleToggleStatus = async () => {
    if (!v) return;
    setIsStatusToggling(true);
    const currentlySuspended = isVehicleTrackingSuspended(v);
    const nextStatus: "actif" | "suspendu" = currentlySuspended ? "actif" : "suspendu";

    try {
      if (v.id) localStorage.setItem(`tracking_status_${v.id}`, nextStatus);
      if (v.immatriculation) {
        const cleanPlate = v.immatriculation.toUpperCase().replace(/[\s-]/g, "");
        localStorage.setItem(`tracking_status_${cleanPlate}`, nextStatus);
        localStorage.setItem(`tracking_status_${v.immatriculation}`, nextStatus);
      }
      if (vehicleId) localStorage.setItem(`tracking_status_${vehicleId}`, nextStatus);
    } catch {
      // Ignore
    }

    // Mise à jour optimiste immédiate (0ms)
    setVehicleData((prev: any) => {
      if (!prev?.vehicle) return prev;
      return {
        ...prev,
        vehicle: {
          ...prev.vehicle,
          statut: nextStatus,
          metadata: {
            ...((prev.vehicle.metadata as any) || {}),
            tracking_status: nextStatus,
            tracking_paused: nextStatus === "suspendu",
          },
        },
      };
    });

    try {
      const targetId = v.id || v.immatriculation || vehicleId;
      const res = await toggleVehicleTrackingStatusAction(targetId, nextStatus);
      if (res && !res.success && res.error) {
        alert(res.error);
      }
      await loadVehicle();
    } catch (err: any) {
      alert(err.message || "Erreur lors du changement de statut.");
    } finally {
      setIsStatusToggling(false);
    }
  };

  const handleSyncOfficialPlan = async () => {
    setSyncingPlan(true);
    setSyncSuccessMessage(null);
    try {
      const res = await syncVehicleManufacturerScheduleAction(v.id);
      if (res.success) {
        setSyncSuccessMessage(`Plan constructeur officiel récupéré en ligne (${res.count} échéances calculées) !`);
        await loadVehicle();
      } else {
        alert(res.error || "Impossible de synchroniser le plan constructeur.");
      }
    } catch (err: any) {
      alert(err.message || "Une erreur est survenue.");
    } finally {
      setSyncingPlan(false);
    }
  };

  const [deletingInterventionKey, setDeletingInterventionKey] = useState<string | null>(null);

  const handleDeleteIntervention = async (item: any) => {
    const desc = item.garage ? `${item.garage} (${item.date || "Date inconnue"})` : (item.date || "cette intervention");
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer définitivement cette facture / intervention (${desc}) du carnet ?\n\nLe relevé kilométrique certifié, les prévisions d'entretien et le coffre-fort seront immédiatement nettoyés et recalculés.`
      )
    ) {
      return;
    }

    const key = `${item.date}_${item.garage}`;
    setDeletingInterventionKey(key);

    try {
      const res = await deleteDocumentAndRecalculateAction({
        documentId: item.documentSourceId || undefined,
        storagePath: item.storagePath || undefined,
        vehicleId: v.id,
        interventionIds: item.interventionIds && item.interventionIds.length > 0 ? item.interventionIds : undefined,
      });

      if (res.success) {
        await loadVehicle();
      } else {
        alert(res.error || "Impossible de supprimer l'intervention.");
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression.");
    } finally {
      setDeletingInterventionKey(null);
    }
  };

  if (loading && !vehicleData) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Chargement du véhicule...</p>
      </div>
    );
  }

  const v = vehicleData?.vehicle || {
    id: vehicleId,
    marque: "Véhicule",
    modele: "",
    version: "",
    immatriculation: "",
    kilometrage_actuel: 0,
    date_premiere_immatriculation: "",
  };

  const conformity = vehicleData?.conformity || {
    globalScore: 94,
    grade: "A+",
    resaleBonusPercent: 8,
  };

  const echeances = v.echeances_previsionnelles || [];

  // Groupement des lignes d'intervention par date et garage (facture complète)
  const groupedInterventionsMap = new Map<string, any>();

  (v.lignes_interventions || []).forEach((l: any) => {
    const key = `${l.date_intervention || "sans-date"}_${l.emetteur || "Garage"}`;
    if (!groupedInterventionsMap.has(key)) {
      groupedInterventionsMap.set(key, {
        date: l.date_intervention,
        kilometrage: l.kilometrage_intervention || v.kilometrage_actuel,
        garage: l.emetteur || "Atelier",
        montantTTC: 0,
        items: [],
        documentSourceId: l.document_source_id || null,
        storagePath: null,
        interventionIds: [],
      });
    }
    const group = groupedInterventionsMap.get(key);
    group.montantTTC += Number(l.prix_total_ttc) || 0;
    group.items.push(l.operation || l.description || "Prestation");
    if (l.id && !group.interventionIds.includes(l.id)) group.interventionIds.push(l.id);
    if (l.document_source_id && !group.documentSourceId) {
      group.documentSourceId = l.document_source_id;
    }
  });

  // Fusionner les factures et CT scannés des documents sources
  (v.documents_sources || []).forEach((d: any) => {
    if (d.file_type === "carte_grise") return;
    const dateKey = `${d.date_document || "sans-date"}_${d.emetteur || "Garage"}`;
    
    if (groupedInterventionsMap.has(dateKey)) {
      const group = groupedInterventionsMap.get(dateKey);
      if (!group.documentSourceId) group.documentSourceId = d.id;
      if (!group.storagePath) group.storagePath = d.storage_path;
      if (d.montant_ttc && Number(d.montant_ttc) > 0) {
        group.montantTTC = Number(d.montant_ttc);
      }
      if (d.kilometrage_document && Number(d.kilometrage_document) > 0) {
        group.kilometrage = Number(d.kilometrage_document);
      }
    } else {
      groupedInterventionsMap.set(dateKey, {
        date: d.date_document,
        kilometrage: d.kilometrage_document || v.kilometrage_actuel,
        garage: d.emetteur || (d.file_type === "controle_technique" ? "Centre de Contrôle Technique" : "Atelier"),
        montantTTC: Number(d.montant_ttc) || 0,
        documentSourceId: d.id,
        storagePath: d.storage_path,
        fileType: d.file_type,
        fileName: d.nom_fichier,
        interventionIds: [],
        items: [
          d.file_type === "controle_technique"
            ? "Contrôle Technique Périodique (Favorable)"
            : (d.nom_fichier ? `Facture : ${d.nom_fichier}` : "Facture d'intervention atelier")
        ],
      });
    }
  });

  const interventions = Array.from(groupedInterventionsMap.values()).sort(
    (a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime() || (b.kilometrage || 0) - (a.kilometrage || 0)
  );

  const forecast = vehicleData?.forecast || {
    vehiclePace: {
      dailyKmRate: 37,
      annualMileageKm: 13500,
      confidence: 0.5,
      trend: "STABLE",
      lastRecordedMileage: v.kilometrage_actuel || 0,
      lastReadingDate: v.date_releve_kilometrage || "2026-08-20",
      estimatedCurrentMileage: v.kilometrage_actuel || 0,
      readingsCount: 1,
      daysSinceLastReading: 0,
    },
    projectedMilestones: [],
    upcomingNext12MonthsBudget: 350,
    nextUrgentMilestone: undefined,
  };

  const pace = forecast.vehiclePace;

  const kit = vehicleData?.reservationKit || {
    vehicleSummary: {
      makeModel: `${v.marque} ${v.modele}`,
      licensePlate: v.immatriculation,
      currentMileage: v.kilometrage_actuel || 0,
    },
    phoneScript: `Bonjour, je souhaite prendre rendez-vous pour mon véhicule ${v.marque} ${v.modele} [Immat ${v.immatriculation}] qui totalise ${(v.kilometrage_actuel || 0).toLocaleString()} km.`,
    emailTemplate: {
      subject: `Demande RDV Entretien - ${v.marque} ${v.modele}`,
      body: "Bonjour,\n\nMerci de planifier la révision.",
    },
    interventionsToRequest: [
      { title: "Révision générale périodique constructeur", estimatedBudgetEur: 220, priority: "HAUTE" },
    ],
    popularizedDefects: [],
    totalEstimatedBudget: { minEur: 180, maxEur: 260 },
    consumerChecklist: {
      beforeLeavingCar: ["Exiger l'huile préconisée constructeur"],
      whenPickingUpCar: ["Prendre la photo de la facture"],
    },
  };

  const vehicleCalendarEvents: UniversalCalendarEvent[] = echeances.length > 0
    ? echeances.map((ech: any, idx: number) => ({
        id: `ech-${v.id}-${idx}-${Date.now()}`,
        title: `🔧 ${ech.libelle || "Entretien"} — ${v.marque} ${v.modele}`,
        startDate: ech.date_preconisee || new Date().toISOString().slice(0, 10),
        vehicleMakeModel: `${v.marque} ${v.modele}`,
        licensePlate: v.immatriculation,
        dueMileage: ech.km_preconise,
        estimatedCostEur: ech.cout_estime_max,
        description: `${ech.description || ech.libelle || "Opération d'entretien constructeur"}\nKilométrage butoir : ${(ech.km_preconise || 0).toLocaleString("fr-FR")} km\nBudget estimé : ~${ech.cout_estime_max || 180} € TTC`,
      }))
    : [
        {
          id: `ech-${v.id}-default`,
          title: `🔧 Entretien Périodique — ${v.marque} ${v.modele}`,
          startDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          vehicleMakeModel: `${v.marque} ${v.modele}`,
          licensePlate: v.immatriculation,
          description: `Entretien préconisé constructeur pour ${v.marque} ${v.modele}`,
        },
      ];

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Mode Switch */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 font-semibold transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Retour au tableau de bord foyer</span>
          </Link>
          <UiModeSwitch currentMode={uiMode} onModeChange={setUiMode} />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-4 sm:gap-5">
            {(v.metadata as any)?.image_url || v.image_url ? (
              <div className="relative w-24 h-16 sm:w-32 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-sm group">
                <img
                  src={(v.metadata as any)?.image_url || v.image_url}
                  alt={`${v.marque} ${v.modele}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Car className="w-7 h-7" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                  {v.marque} {v.modele}
                </h1>
                {v.version && (
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                    {v.version}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Immatriculation : <strong className="text-slate-800">{v.immatriculation}</strong> • VIN : {v.vin || "Non renseigné"} • Première immat : {v.date_premiere_immatriculation || v.date_premiere_immat || "2021"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* BOUTON RECHERCHE EN LIGNE DU PLAN CONSTRUCTEUR */}
            <button
              onClick={handleSyncOfficialPlan}
              disabled={syncingPlan}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-60"
            >
              {syncingPlan ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>{syncingPlan ? "Recherche du plan officiel..." : "Chercher Plan Constructeur en Ligne (IA)"}</span>
            </button>

            <Link
              href={`/v/${v.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              Lien Public Revente
            </Link>

            <button
              onClick={() => setIsKitOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Geste 1 : Kit RDV
            </button>

            {/* EXPORT AGENDA UNIVERSEL (.ICS, GOOGLE, OUTLOOK, YAHOO) */}
            <UniversalCalendarDropdown
              events={vehicleCalendarEvents}
              variant="outline"
              buttonLabel="Ajouter à l'agenda (.ics / Web)"
              size="md"
              filename={`echeances-${v.marque}-${v.modele}-${v.immatriculation}`}
            />

            {/* BOUTON METTRE EN PAUSE / REPRENDRE LE SUIVI */}
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={isStatusToggling}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-60 ${
                isVehicleTrackingSuspended(v)
                  ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
              }`}
            >
              {isStatusToggling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isVehicleTrackingSuspended(v) ? (
                <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>{isVehicleTrackingSuspended(v) ? "Reprendre le suivi" : "Mettre en pause"}</span>
            </button>

            {/* BOUTON SUPPRIMER LE VÉHICULE */}
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
              title="Supprimer définitivement ce véhicule"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Supprimer</span>
            </button>
          </div>
        </div>
      </div>

        {/* TÉLÉMÉTRIE KILOMÉTRIQUE : CONNU VS ESTIMÉ DYNAMIQUE */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* 1. Dernier Kilométrage Certifié Connu */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Dernier Kilométrage Certifié
              </span>
              <span className={`w-2 h-2 rounded-full ${v.kilometrage_actuel && v.kilometrage_actuel > 0 ? "bg-emerald-500" : "bg-amber-400"}`} />
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono">
              {v.kilometrage_actuel && v.kilometrage_actuel > 0
                ? `${v.kilometrage_actuel.toLocaleString("fr-FR")} km`
                : "Non renseigné"}
            </p>
            <p className="text-xs text-slate-500">
              {v.kilometrage_actuel && v.kilometrage_actuel > 0
                ? `Relevé officiel le ${v.date_releve_kilometrage || "récent"} (CT / Facture)`
                : "Déposez une facture ou un CT pour étalonner"}
            </p>
          </div>

          {/* 2. Kilométrage Estimé à Date */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/80 rounded-2xl p-4 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
                  Kilométrage Estimé à Date
                </span>
                {pace.readingsCount >= 2 && (
                  <span className="px-1.5 py-0.5 bg-emerald-200/80 text-emerald-900 text-[9px] font-extrabold rounded">
                    IA Multi-Factures
                  </span>
                )}
              </div>
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-700 font-mono">
              {v.kilometrage_actuel && v.kilometrage_actuel > 0
                ? `${Math.max(v.kilometrage_actuel, pace.estimatedCurrentMileage || v.kilometrage_actuel).toLocaleString("fr-FR")} km`
                : "En attente"}
            </p>
            <p className="text-xs text-emerald-900/80">
              {v.kilometrage_actuel && v.kilometrage_actuel > 0
                ? pace.readingsCount >= 2
                  ? `Calculé sur ${pace.readingsCount} relevés certifiés (~${pace.annualMileageKm.toLocaleString("fr-FR")} km/an)`
                  : `Rythme de roulage estimé : ~${pace.annualMileageKm.toLocaleString("fr-FR")} km/an (~${pace.dailyKmRate} km/jour)`
                : "L'assistant calculera le rythme dès votre 1ère facture"}
            </p>
          </div>

          {/* 3. Prochaine échéance au carnet / Urgence */}
          {(() => {
            const topEch = echeances[0];
            const next = forecast.nextUrgentMilestone;
            const currentKm = v.kilometrage_actuel || 0;
            const targetKm = topEch?.km_preconise || next?.dueMileage || 0;
            const targetDateStr = topEch?.date_preconisee || next?.projectedDueDate;
            const remainingKm = targetKm > 0 ? targetKm - currentKm : 0;
            const dailyRate = Math.max(5, pace.dailyKmRate || 35);
            const daysToTargetKm = targetKm > 0 && remainingKm > 0 ? Math.round(remainingKm / dailyRate) : 9999;
            const targetDate = targetDateStr ? new Date(targetDateStr) : null;
            const daysToTargetDate = targetDate ? Math.floor((targetDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 9999;

            const isOverdue =
              topEch?.statut === "en_retard" ||
              (next && (next.urgency === "CRITICAL" || next.urgency === "OVERDUE" || next.remainingDays < 0)) ||
              (targetDate && daysToTargetDate < 0) ||
              (targetKm > 0 && currentKm >= targetKm);

            const isKmFirst = daysToTargetKm <= daysToTargetDate;
            const title = topEch?.libelle || next?.title || "Programme constructeur";

            return (
              <div className={`rounded-2xl p-4 shadow-sm space-y-1.5 sm:col-span-2 lg:col-span-1 border transition ${
                isOverdue
                  ? "bg-rose-50/70 border-rose-200/90 text-rose-950"
                  : "bg-white border-slate-200/80"
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isOverdue ? "text-rose-700 font-extrabold" : "text-slate-500"}`}>
                    {isOverdue ? "🚨 Entretien Urgent Requis" : "Prochain Entretien Constructeur"}
                  </span>
                  <Clock className={`w-4 h-4 ${isOverdue ? "text-rose-600 animate-pulse" : "text-blue-600"}`} />
                </div>
                <p className={`text-base font-bold truncate ${isOverdue ? "text-rose-900 font-black" : "text-slate-900"}`}>
                  {title}
                </p>
                <p className={`text-xs ${isOverdue ? "text-rose-700 font-semibold" : "text-slate-500"}`}>
                  {isOverdue
                    ? remainingKm < 0
                      ? `Échu (dépassé de ${Math.abs(remainingKm).toLocaleString("fr-FR")} km)`
                      : `Échéance dépassée de ${Math.abs(daysToTargetDate)} jours`
                    : currentKm > 0 && targetKm > 0
                    ? isKmFirst
                      ? `À planifier vers le ${targetDateStr || "mi-2027"} (cap des ${targetKm.toLocaleString("fr-FR")} km • dans ~${remainingKm.toLocaleString("fr-FR")} km)`
                      : `À planifier le ${targetDateStr} (ou au cap des ${targetKm.toLocaleString("fr-FR")} km)`
                    : "Selon cycle constructeur (à calibrer)"}
                </p>
              </div>
            );
          })()}
        </div>

      {isVehicleTrackingSuspended(v) && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <PauseCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="font-bold block text-sm text-amber-950">Suivi mécanique en pause</strong>
              <span className="text-amber-800">Les alertes prédictives et les rappels Google Calendar sont désactivés pour ce véhicule.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={isStatusToggling}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shrink-0 self-start sm:self-auto shadow-sm"
          >
            {isStatusToggling ? "Réactivation..." : "Reprendre le suivi"}
          </button>
        </div>
      )}

      {syncSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-2.5 text-xs font-bold">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncSuccessMessage}</span>
        </div>
      )}

      {/* SÉLECTEUR D'ONGLETS EN MODE ÉPURÉ */}
      {uiMode === "compact" && (
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleTabChange("echeances")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 ${
              compactTab === "echeances"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>1. Plan & Échéances</span>
            {echeances.filter((e: any) => e.statut === "en_retard").length > 0 && (
              <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full">
                {echeances.filter((e: any) => e.statut === "en_retard").length} alerte(s)
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("historique")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 ${
              compactTab === "historique"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>2. Historique & Coffre-fort</span>
            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-800 text-[10px] font-bold rounded-full">
              {interventions.length} factures
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("sante")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 ${
              compactTab === "sante"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>3. Santé, Pneus & CT</span>
          </button>
        </div>
      )}

      {/* CORPS DE PAGE : CONDITIONAL RENDERING SELON LE MODE */}
      {uiMode === "compact" ? (
        <div className="space-y-6">
          {/* ONGLET 1 : PLAN & ÉCHÉANCES */}
          {compactTab === "echeances" && (
            <div className="space-y-6">
              {/* BANNIÈRE SCORE SYNTHÉTIQUE */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                    <Award className="w-3.5 h-3.5" />
                    Suivi Constructeur Certifié
                  </div>
                  <h2 className="text-base sm:text-lg font-bold">
                    Score de Conformité : {conformity.overallScore ?? (conformity as any).globalScore ?? 95}% ({conformity.grade || "A+"})
                  </h2>
                  <p className="text-xs text-slate-300">
                    Valorisation estimée à la revente : <strong>+{conformity.resaleImpact?.estimatedValueBonusPercent ?? (conformity as any).resaleBonusPercent ?? 8}%</strong>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsKitOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Ouvrir Kit RDV</span>
                  </button>
                  <div className="px-4 py-2 bg-white/10 rounded-2xl border border-white/10 text-center min-w-[70px]">
                    <p className="text-2xl font-black text-emerald-400">{conformity.grade || "A+"}</p>
                  </div>
                </div>
              </div>

              {/* LISTE DES ÉCHÉANCES ÉPURÉE */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Échéances Constructeur Prédictives</h2>
                    <p className="text-xs text-slate-500">Calculées au 1er terme échu (temps vs km réels)</p>
                  </div>
                  <button
                    onClick={handleSyncOfficialPlan}
                    disabled={syncingPlan}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingPlan ? "animate-spin" : ""}`} />
                    Actualiser via IA
                  </button>
                </div>

                {echeances.length === 0 ? (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-xs text-slate-500">Aucune échéance personnalisée chargée pour ce véhicule.</p>
                    <button
                      onClick={handleSyncOfficialPlan}
                      disabled={syncingPlan}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
                    >
                      <Sparkles className="w-4 h-4" />
                      Récupérer le plan d'entretien officiel en ligne
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3.5">
                    {echeances.map((ech: any, idx: number) => {
                      const currentKm = v.kilometrage_actuel || 0;
                      const targetKm = ech.km_preconise || 0;
                      const remainingKm = targetKm > 0 ? targetKm - currentKm : 0;
                      const dailyRate = Math.max(5, pace.dailyKmRate || 35);
                      const daysToTargetKm = targetKm > 0 && remainingKm > 0 ? Math.round(remainingKm / dailyRate) : 9999;
                      
                      const now = new Date();
                      const targetDate = ech.date_preconisee ? new Date(ech.date_preconisee) : null;
                      const daysToTargetDate = targetDate ? Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : 9999;

                      const isOverdue =
                        ech.statut === "en_retard" ||
                        (targetDate && daysToTargetDate < 0) ||
                        (targetKm > 0 && currentKm >= targetKm);

                      let triggerFactor: "KM_FIRST" | "TIME_FIRST" | "OVERDUE_KM" | "OVERDUE_TIME";
                      let triggerExplanation = "";

                      if (isOverdue) {
                        if (targetKm > 0 && currentKm >= targetKm) {
                          triggerFactor = "OVERDUE_KM";
                          triggerExplanation = `Dépassé au compteur (-${Math.abs(currentKm - targetKm).toLocaleString("fr-FR")} km)`;
                        } else {
                          triggerFactor = "OVERDUE_TIME";
                          triggerExplanation = `Dépassé dans le temps (-${Math.abs(daysToTargetDate)} jours)`;
                        }
                      } else {
                        if (daysToTargetKm <= daysToTargetDate) {
                          triggerFactor = "KM_FIRST";
                          triggerExplanation = `Cap des ${targetKm.toLocaleString("fr-FR")} km atteint en 1er`;
                        } else {
                          const safeAnnualPace = Math.abs(Math.round(pace.annualMileageKm || 12000)).toLocaleString("fr-FR");
                          triggerFactor = "TIME_FIRST";
                          triggerExplanation = `Échéance temps en 1er (~${safeAnnualPace} km/an)`;
                        }
                      }

                      const isExpanded = expandedCardIndex === idx;

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 sm:p-4 rounded-2xl transition space-y-2 text-xs border w-full ${
                            isOverdue
                              ? "bg-rose-50/70 border-rose-200 text-rose-950 shadow-sm ring-1 ring-rose-500/10"
                              : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 font-bold text-slate-900 min-w-0 flex-1">
                              {isOverdue ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                              )}
                              <span className={`break-words ${isOverdue ? "text-rose-950 font-extrabold" : ""}`}>
                                {ech.libelle}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                isOverdue
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}>
                                {isOverdue ? "🚨 En retard" : "À venir"}
                              </span>
                              <span className="font-bold text-slate-700">~{ech.cout_estime_max || 180} €</span>
                            </div>
                          </div>

                          {/* DÉCLENCHEUR 1ER TERME CONDENSÉ */}
                          <div className="flex flex-wrap items-center justify-between text-[10.5px] gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold max-w-full break-words ${
                              isOverdue
                                ? "bg-rose-100 text-rose-900"
                                : triggerFactor === "KM_FIRST"
                                ? "bg-blue-50 text-blue-800"
                                : "bg-emerald-50 text-emerald-800"
                            }`}>
                              {isOverdue ? <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" /> : <TrendingUp className="w-3 h-3 text-blue-600 shrink-0" />}
                              <span>{triggerExplanation}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => setExpandedCardIndex(isExpanded ? null : idx)}
                              className="text-slate-400 hover:text-slate-700 flex items-center gap-0.5 text-[10px] font-semibold transition"
                            >
                              <span>{isExpanded ? "Moins" : "Détails"}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>

                          {/* DÉTAIL DÉPLIABLE AU CLIC */}
                          {isExpanded && (
                            <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 text-[11px] leading-relaxed text-slate-600 break-words">
                              <p>{ech.description}</p>
                            </div>
                          )}

                          <div className={`pt-2 flex flex-wrap sm:flex-nowrap items-center justify-between text-xs font-semibold border-t gap-y-1 gap-x-2 w-full ${
                            isOverdue ? "border-rose-200 text-rose-900" : "border-slate-100 text-slate-600"
                          }`}>
                            <span className="min-w-0">
                              {isOverdue ? "Échu le :" : "À planifier le :"} {" "}
                              <strong className={
                                isOverdue
                                  ? "text-rose-800 font-extrabold"
                                  : triggerFactor === "TIME_FIRST"
                                  ? "text-emerald-700 font-black"
                                  : "text-slate-800"
                              }>
                                {ech.date_preconisee || "À calculer"} {isOverdue && "(Dépassé)"}
                              </strong>
                            </span>
                            <span className="min-w-0">
                              Butoir :{" "}
                              <strong className={
                                isOverdue && currentKm >= targetKm
                                  ? "text-rose-800 font-extrabold"
                                  : triggerFactor === "KM_FIRST"
                                  ? "text-blue-700 font-black"
                                  : "text-slate-800"
                              }>
                                {(ech.km_preconise || 0).toLocaleString("fr-FR")} km
                              </strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ONGLET 2 : HISTORIQUE & COFFRE-FORT */}
          {compactTab === "historique" && (
            <div className="space-y-6">
              {/* CARNET D'ENTRETIEN NUMÉRIQUE */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Carnet d'Entretien Certifié</h2>
                      <p className="text-xs text-slate-500">Historique reconstitué depuis vos factures numérisées</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-600 px-3 py-1 bg-slate-100 rounded-full">
                    {interventions.length} intervention(s)
                  </span>
                </div>

                {interventions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 italic">Aucune facture enregistrée pour le moment.</p>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {interventions.map((item: any, idx: number) => {
                      const itemKey = `${item.date}_${item.garage}`;
                      const isDeleting = deletingInterventionKey === itemKey;

                      return (
                        <div key={idx} className="relative space-y-1.5 text-xs group">
                          <div className="absolute -left-[29px] top-1.5 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow" />
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="font-bold text-slate-900">
                              {item.date} • {(item.kilometrage || 0).toLocaleString("fr-FR")} km
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700">{item.montantTTC.toFixed(2)} € TTC</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteIntervention(item)}
                                disabled={isDeleting}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-slate-200 hover:border-rose-200 disabled:opacity-50 inline-flex items-center gap-1"
                                title="Supprimer cette facture / intervention et recalculer le carnet"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-slate-500 font-medium">{item.garage}</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {item.items.map((op: string, i: number) => (
                              <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                {op}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* COFFRE-FORT NUMÉRIQUE */}
              <VehicleVaultList
                vehicleId={v.id}
                vehicleName={`${v.marque} ${v.modele}`}
                licensePlate={v.immatriculation}
                onDocumentDeleted={loadVehicle}
                documents={(v.documents_sources || []).map((d: any) => ({
                  id: d.id,
                  vehicleId: d.vehicule_id,
                  fileName: d.nom_fichier,
                  storagePath: d.storage_path,
                  fileType: d.file_type,
                  mimeType: d.mime_type || "application/pdf",
                  dateDocument: d.date_document,
                  mileageDocument: d.kilometrage_document,
                  emitter: d.emetteur,
                  totalTTC: d.montant_ttc,
                  totalHT: d.montant_ht,
                  confidenceScore: d.confidence_score,
                  signedUrl: null,
                  createdAt: d.created_at,
                }))}
                totalExpensesEur={(v.documents_sources || []).reduce(
                  (acc: number, cur: any) => acc + (Number(cur.montant_ttc) || 0),
                  0
                )}
              />

              {/* DROPZONE INTÉGRÉE */}
              <div className="space-y-3">
                <h2 className="text-base font-bold text-slate-900">Ajouter un nouveau justificatif (Facture / CT)</h2>
                <DocumentDropzone
                  vehicleId={v.id}
                  onUploadComplete={() => {
                    loadVehicle();
                    router.refresh();
                  }}
                />
              </div>
            </div>
          )}

          {/* ONGLET 3 : SANTÉ, PNEUS & CT */}
          {compactTab === "sante" && (
            <div className="space-y-6">
              {/* SUIVI DES PNEUS */}
              {vehicleData?.tires && (
                <TireWearTracker
                  assessment={vehicleData.tires}
                  vehicleName={`${v.marque} ${v.modele}`}
                  licensePlate={v.immatriculation}
                />
              )}

              {/* BILAN CONTRÔLE TECHNIQUE */}
              {(() => {
                const ctDoc = (v.documents_sources || []).find((d: any) => d.file_type === "controle_technique");
                const ctData = ctDoc?.ocr_structured_data || {};
                const hasCt = !!ctDoc;
                const defects = v.defaillances_ct || [];

                if (!hasCt) {
                  return (
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-slate-900">Contrôle Technique Périodique</h2>
                          <p className="text-xs text-slate-500">Aucun procès-verbal enregistré pour ce véhicule</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Déposez le scan de votre PV de contrôle technique dans l'onglet Historique pour analyser vos défaillances.
                      </p>
                    </div>
                  );
                }

                const expiry = ctData.date_limite_validite || ctData.inspectionResult?.expiryDate || "Dans 2 ans";
                const centerName = ctDoc.emetteur || ctData.centre_controle?.nom || ctData.center?.name || "Centre Contrôle Technique Agréé";
                const resultStatus = ctData.resultat_global ? `FAVORABLE (${ctData.resultat_global})` : "FAVORABLE (A)";

                return (
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-slate-900">Contrôle Technique Officiel</h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                              {resultStatus}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{centerName} • Validité jusqu'au : <strong>{expiry}</strong></p>
                        </div>
                      </div>
                    </div>

                    {/* Observations vulgarisées */}
                    {defects.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Observations relevées sans contre-visite ({defects.length}) :
                        </p>
                        {defects.map((def: any, i: number) => {
                          const rawExpl = def.vulgarisation_grand_public || def.metadata?.vulgarisation || "";
                          return (
                            <div key={i} className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-1 text-xs">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>{def.libelle_officiel || def.libelle}</span>
                                </div>
                                <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                                  {def.niveau_gravite || "Mineure"}
                                </span>
                              </div>
                              {rawExpl && (
                                <p className="text-slate-600 text-[11px] pl-5">
                                  💡 <strong>Explication IA :</strong> {rawExpl}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ) : (
        /* VUE COMPLÈTE TRADITIONNELLE (TOUTES LES SECTIONS ENFILÉES) */
        <div className="space-y-8">
          {/* BANNÈRE SCORE DE CONFORMITÉ & REVENTE */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                <Award className="w-4 h-4" />
                Suivi Constructeur Certifié
              </div>
              <h2 className="text-xl font-bold">
                Score de Santé : {conformity.overallScore ?? (conformity as any).globalScore ?? 95}% ({conformity.grade || "A+"})
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                Toutes les échéances d'entretien et organes de sécurité sont à jour des préconisations constructeur.
                Ce dossier certifié valorise votre véhicule d'environ <strong>+{conformity.resaleImpact?.estimatedValueBonusPercent ?? (conformity as any).resaleBonusPercent ?? 8}%</strong> lors d'une revente entre particuliers.
              </p>
            </div>
            <div className="p-4 bg-white/10 rounded-2xl border border-white/10 text-center min-w-[160px]">
              <p className="text-3xl font-black text-emerald-400">{conformity.grade || "A+"}</p>
              <p className="text-[10px] uppercase font-bold text-slate-300 mt-1">
                {conformity.grade === "A+" ? "Exemplaire" : conformity.grade === "A" ? "Très Bon" : "Conforme"}
              </p>
            </div>
          </div>

          {/* CALENDRIER DES ÉCHÉANCES PRÉVISIONNELLES OFFICIELLES */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Échéancier Constructeur Prédictif</h2>
                  <p className="text-xs text-slate-500">Calculé au 1er terme échu (temps vs kilomètres réels)</p>
                </div>
              </div>
              <button
                onClick={handleSyncOfficialPlan}
                disabled={syncingPlan}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingPlan ? "animate-spin" : ""}`} />
                Actualiser via IA en ligne
              </button>
            </div>

            {echeances.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs text-slate-500">Aucune échéance personnalisée chargée pour ce véhicule.</p>
                <button
                  onClick={handleSyncOfficialPlan}
                  disabled={syncingPlan}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  Récupérer le plan d'entretien officiel en ligne
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {echeances.map((ech: any, idx: number) => {
                  const currentKm = v.kilometrage_actuel || 0;
                  const targetKm = ech.km_preconise || 0;
                  const remainingKm = targetKm > 0 ? targetKm - currentKm : 0;
                  const dailyRate = Math.max(5, pace.dailyKmRate || 35);
                  const daysToTargetKm = targetKm > 0 && remainingKm > 0 ? Math.round(remainingKm / dailyRate) : 9999;
                  
                  const now = new Date();
                  const targetDate = ech.date_preconisee ? new Date(ech.date_preconisee) : null;
                  const daysToTargetDate = targetDate ? Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : 9999;

                  const isOverdue =
                    ech.statut === "en_retard" ||
                    (targetDate && daysToTargetDate < 0) ||
                    (targetKm > 0 && currentKm >= targetKm);

                  let triggerFactor: "KM_FIRST" | "TIME_FIRST" | "OVERDUE_KM" | "OVERDUE_TIME";
                  let triggerExplanation = "";

                  if (isOverdue) {
                    if (targetKm > 0 && currentKm >= targetKm) {
                      triggerFactor = "OVERDUE_KM";
                      triggerExplanation = `Dépassé au compteur (-${Math.abs(currentKm - targetKm).toLocaleString("fr-FR")} km)`;
                    } else {
                      triggerFactor = "OVERDUE_TIME";
                      triggerExplanation = `Dépassé dans le temps (-${Math.abs(daysToTargetDate)} jours)`;
                    }
                  } else {
                    if (daysToTargetKm <= daysToTargetDate) {
                      triggerFactor = "KM_FIRST";
                      triggerExplanation = `Cap des ${targetKm.toLocaleString("fr-FR")} km atteint en 1er (avant la date limite)`;
                    } else {
                      const safeAnnualPace = Math.abs(Math.round(pace.annualMileageKm || 12000)).toLocaleString("fr-FR");
                      triggerFactor = "TIME_FIRST";
                      triggerExplanation = `Échéance temps atteinte en 1er (au rythme actuel de ~${safeAnnualPace} km/an)`;
                    }
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 sm:p-4 rounded-2xl transition space-y-2.5 text-xs border w-full ${
                        isOverdue
                          ? "bg-rose-50/70 border-rose-200 text-rose-950 shadow-sm ring-1 ring-rose-500/10"
                          : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-start gap-1.5 font-bold text-slate-900 min-w-0 flex-1">
                          {isOverdue ? (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          )}
                          <span className={`break-words ${isOverdue ? "text-rose-950 font-extrabold" : ""}`}>
                            {ech.libelle}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                            isOverdue
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {isOverdue ? "🚨 En retard" : "À venir"}
                          </span>
                          <span className="font-bold text-slate-700">~{ech.cout_estime_max || 180} €</span>
                        </div>
                      </div>

                      <p className={`text-[11px] leading-relaxed break-words ${isOverdue ? "text-rose-800/90" : "text-slate-500"}`}>
                        {ech.description}
                      </p>

                      <div className="pt-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border max-w-full break-words ${
                          isOverdue
                            ? "bg-rose-100/90 text-rose-900 border-rose-300"
                            : triggerFactor === "KM_FIRST"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}>
                          {isOverdue ? (
                            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                          ) : triggerFactor === "KM_FIRST" ? (
                            <TrendingUp className="w-3 h-3 text-blue-600 shrink-0" />
                          ) : (
                            <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                          )}
                          <span>
                            <strong>Déclencheur 1er terme :</strong> {triggerExplanation}
                          </span>
                        </span>
                      </div>

                      <div className={`pt-2 flex flex-wrap sm:flex-nowrap items-center justify-between text-xs font-semibold border-t gap-y-1 gap-x-2 w-full ${
                        isOverdue ? "border-rose-200 text-rose-900" : "border-slate-100 text-slate-600"
                      }`}>
                        <span className="min-w-0">
                          {isOverdue ? "Échu le :" : "À planifier le :"} {" "}
                          <strong className={
                            isOverdue
                              ? "text-rose-800 font-extrabold"
                              : triggerFactor === "TIME_FIRST"
                              ? "text-emerald-700 font-black"
                              : "text-slate-800"
                          }>
                            {ech.date_preconisee || "À calculer"} {isOverdue && "(Dépassé)"}
                          </strong>
                        </span>
                        <span className="min-w-0">
                          Butoir :{" "}
                          <strong className={
                            isOverdue && currentKm >= targetKm
                              ? "text-rose-800 font-extrabold"
                              : triggerFactor === "KM_FIRST"
                              ? "text-blue-700 font-black"
                              : "text-slate-800"
                          }>
                            {(ech.km_preconise || 0).toLocaleString("fr-FR")} km
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* BILAN CONTRÔLE TECHNIQUE & SÉCURITÉ */}
          {(() => {
            const ctDoc = (v.documents_sources || []).find((d: any) => d.file_type === "controle_technique");
            const ctData = ctDoc?.ocr_structured_data || {};
            const hasCt = !!ctDoc;
            const defects = v.defaillances_ct || [];

            if (!hasCt) {
              return (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Contrôle Technique Périodique</h2>
                      <p className="text-xs text-slate-500">Aucun procès-verbal réglementaire enregistré pour ce véhicule</p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p>
                      Déposez le scan ou la photo de votre dernier PV de contrôle technique dans la zone ci-dessous pour enregistrer vos défaillances et calculer votre date limite de validité.
                    </p>
                    <span className="px-3 py-1 bg-white text-slate-700 font-bold border border-slate-200 rounded-xl shrink-0 self-start sm:self-auto">
                      En attente de scan
                    </span>
                  </div>
                </div>
              );
            }

            const expiry = ctData.date_limite_validite || ctData.inspectionResult?.expiryDate || "Dans 2 ans";
            const centerName = ctDoc.emetteur || ctData.centre_controle?.nom || ctData.center?.name || "Centre Contrôle Technique Agréé";
            const centerDetail = ctData.centre_controle?.agrement ? `Agrément ${ctData.centre_controle.agrement}` : "Centre agréé UTAC / OTC";
            const resultStatus = ctData.resultat_global ? `FAVORABLE (${ctData.resultat_global})` : "FAVORABLE (A)";

            return (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">Dernier Contrôle Technique Officiel</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {resultStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Procès-verbal réglementaire UTAC / OTC numérisé</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-bold text-slate-900">Validité jusqu'au : {expiry}</p>
                    <p className="text-[11px] text-slate-500">Prochain CT obligatoire dans 2 ans</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                    <p className="text-slate-400 text-[10px] font-semibold uppercase">Centre Agréé</p>
                    <p className="font-bold text-slate-800 line-clamp-1">{centerName}</p>
                    <p className="text-slate-500 text-[11px]">{centerDetail}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                    <p className="text-slate-400 text-[10px] font-semibold uppercase">Date & Kilométrage</p>
                    <p className="font-bold text-slate-800">{ctDoc.date_document || "Date certifiée"}</p>
                    <p className="text-emerald-700 font-semibold text-[11px]">
                      {ctDoc.kilometrage_document ? `${(ctDoc.kilometrage_document).toLocaleString("fr-FR")} km certifiés` : "Odomètre relevé"}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                    <p className="text-slate-400 text-[10px] font-semibold uppercase">Résultat & Bilan</p>
                    <p className="font-bold text-emerald-700">Aucune contre-visite</p>
                    <p className="text-slate-500 text-[11px]">{defects.length} observation(s) relevée(s)</p>
                  </div>
                </div>

                {defects.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Observations relevées par le contrôleur (sans obligation de contre-visite) :
                    </p>
                    <div className="space-y-2">
                      {defects.map((def: any, i: number) => {
                        const rawExpl = def.vulgarisation_grand_public || def.metadata?.vulgarisation || "";
                        return (
                          <div key={i} className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-1 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                {def.code_defaillance && (
                                  <span className="font-mono text-[10px] bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded">
                                    {def.code_defaillance}
                                  </span>
                                )}
                                <span>{def.libelle_officiel || def.libelle}</span>
                              </div>
                              <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                                {def.niveau_gravite || "Mineure"}
                              </span>
                            </div>
                            {rawExpl && (
                              <p className="text-slate-600 text-[11px] pl-5">
                                💡 <strong>Explication IA :</strong> {rawExpl}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* SUIVI PRÉDICTIF & SÉCURITÉ DES PNEUMATIQUES */}
          {vehicleData?.tires && (
            <TireWearTracker
              assessment={vehicleData.tires}
              vehicleName={`${v.marque} ${v.modele}`}
              licensePlate={v.immatriculation}
            />
          )}

          {/* CARNET D'ENTRETIEN NUMÉRIQUE */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Carnet d'Entretien Numérique Certifié</h2>
                  <p className="text-xs text-slate-500">Historique reconstitué automatiquement à partir de vos scans de factures</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-600 px-3 py-1 bg-slate-100 rounded-full">
                {interventions.length} intervention(s)
              </span>
            </div>

            {interventions.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 italic">Aucune facture ou intervention enregistrée pour le moment.</p>
            ) : (
              <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {interventions.map((item: any, idx: number) => {
                  const itemKey = `${item.date}_${item.garage}`;
                  const isDeleting = deletingInterventionKey === itemKey;

                  return (
                    <div key={idx} className="relative space-y-2 group">
                      <div className="absolute -left-[29px] top-1.5 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900">
                          {item.date} • {(item.kilometrage || 0).toLocaleString()} km
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">{item.montantTTC.toFixed(2)} € TTC</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteIntervention(item)}
                            disabled={isDeleting}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-slate-200 hover:border-rose-200 disabled:opacity-50 inline-flex items-center gap-1"
                            title="Supprimer cette facture / intervention et recalculer le carnet"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{item.garage}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.items.map((op: string, i: number) => (
                          <span key={i} className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                            {op}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* COFFRE-FORT NUMÉRIQUE (SCANS & JUSTIFICATIFS ORIGINAUX) */}
          <VehicleVaultList
            vehicleId={v.id}
            vehicleName={`${v.marque} ${v.modele}`}
            licensePlate={v.immatriculation}
            onDocumentDeleted={loadVehicle}
            documents={(v.documents_sources || []).map((d: any) => ({
              id: d.id,
              vehicleId: d.vehicule_id,
              fileName: d.nom_fichier,
              storagePath: d.storage_path,
              fileType: d.file_type,
              mimeType: d.mime_type || "application/pdf",
              dateDocument: d.date_document,
              mileageDocument: d.kilometrage_document,
              emitter: d.emetteur,
              totalTTC: d.montant_ttc,
              totalHT: d.montant_ht,
              confidenceScore: d.confidence_score,
              signedUrl: null,
              createdAt: d.created_at,
            }))}
            totalExpensesEur={(v.documents_sources || []).reduce(
              (acc: number, cur: any) => acc + (Number(cur.montant_ttc) || 0),
              0
            )}
          />

          {/* ZONE D'AJOUT NOUVELLE FACTURE */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Ajouter un nouveau justificatif (Facture / CT)</h2>
            <DocumentDropzone
              vehicleId={v.id}
              onUploadComplete={() => {
                loadVehicle();
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      {/* MODAL DU KIT PRÊT-À-RÉSERVER */}
      <ReservationKitModal
        isOpen={isKitOpen}
        onClose={() => setIsKitOpen(false)}
        kit={kit}
        recommendedGarage={vehicleData?.garageRecommendation?.recommendedGarage}
        availableGarages={vehicleData?.garageRecommendation?.allGarages}
        garagePhoneNumber={vehicleData?.garageRecommendation?.recommendedGarage?.telephone || undefined}
        garageName={vehicleData?.garageRecommendation?.recommendedGarage?.nom || undefined}
        garageAddress={vehicleData?.garageRecommendation?.recommendedGarage?.adresse || undefined}
        garageEmail={vehicleData?.garageRecommendation?.recommendedGarage?.email || undefined}
      />

      {/* MODALE DE CONFIRMATION DE SUPPRESSION */}
      <DeleteVehicleModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        vehicle={v}
        onSuccess={() => router.push("/dashboard")}
      />
    </div>
  );
}
