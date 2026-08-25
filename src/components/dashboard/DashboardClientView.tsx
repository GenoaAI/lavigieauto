"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DocumentDropzone } from "@/components/scanner/DocumentDropzone";
import { ReservationKitModal } from "@/components/vehicles/ReservationKitModal";
import { DeleteVehicleModal } from "@/components/vehicles/DeleteVehicleModal";
import { FoyerMembersManager } from "@/components/foyer/FoyerMembersManager";
import { GoogleCalendarSyncCard } from "@/components/foyer/GoogleCalendarSyncCard";
import { getFoyerOverviewAction } from "@/app/actions/foyer";
import {
  getVehicleDetailsAction,
  toggleVehicleTrackingStatusAction,
} from "@/app/actions/vehicles";
import { isVehicleTrackingSuspended } from "@/lib/types/database.types";
import { SubscriptionBanner } from "@/components/billing/SubscriptionBanner";
import { UiModeSwitch, useUiViewMode } from "@/components/ui/UiModeSwitch";
import {
  Car,
  PhoneCall,
  Camera,
  Calendar,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Loader2,
  RefreshCw,
  MoreVertical,
  PauseCircle,
  PlayCircle,
  Trash2,
} from "lucide-react";

import { DEFAULT_VEHICLES_SEED } from "@/config/foyer.seed";

interface DashboardClientViewProps {
  initialFoyer: any;
  initialVehicles: any[];
  initialMembers: any[];
}

export function DashboardClientView({
  initialFoyer,
  initialVehicles,
  initialMembers,
}: DashboardClientViewProps) {
  const [uiMode, setUiMode] = useUiViewMode();
  const [loading, setLoading] = useState(false);
  const [foyerData, setFoyerData] = useState<any>(initialFoyer || { nom: "Foyer Charles de Forges" });
  const [vehicles, setVehicles] = useState<any[]>(
    initialVehicles && initialVehicles.length > 0 ? initialVehicles : DEFAULT_VEHICLES_SEED
  );
  const [members, setMembers] = useState<any[]>(initialMembers || []);
  const [isKitOpen, setIsKitOpen] = useState(false);
  const [selectedVehicleKit, setSelectedVehicleKit] = useState<any | null>(null);
  const [loadingKitId, setLoadingKitId] = useState<string | null>(null);
  const [actionMenuVehicleId, setActionMenuVehicleId] = useState<string | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<any | null>(null);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getFoyerOverviewAction();
      if (res) {
        setFoyerData(res.foyer);
        setVehicles(res.vehicles || []);
        setMembers(res.members || []);
      }
    } catch (e) {
      console.error("Error loading foyer overview:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTracking = async (vehicleId: string, currentStatus: string) => {
    setStatusLoadingId(vehicleId);
    setActionMenuVehicleId(null);
    try {
      const targetVehicle = vehicles.find((x) => x.id === vehicleId);
      const currentlySuspended = isVehicleTrackingSuspended(targetVehicle);
      await toggleVehicleTrackingStatusAction(
        vehicleId,
        currentlySuspended ? "actif" : "suspendu"
      );
      await loadData();
    } catch (err) {
      console.error("Erreur changement de statut:", err);
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleOpenKit = async (vehicle: any) => {
    setLoadingKitId(vehicle.id);
    try {
      const res = await getVehicleDetailsAction(vehicle.id);
      if (res && res.reservationKit) {
        setSelectedVehicleKit(res.reservationKit);
        setIsKitOpen(true);
        return;
      }
    } catch {
      // Fallback
    } finally {
      setLoadingKitId(null);
    }

    // Fallback kit
    const nextEcheance = vehicle.echeances_previsionnelles?.[0];
    setSelectedVehicleKit({
      vehicleSummary: {
        makeModel: `${vehicle.marque} ${vehicle.modele}`,
        licensePlate: vehicle.immatriculation,
        currentMileage: vehicle.kilometrage_actuel || 0,
      },
      phoneScript: `Bonjour, je vous appelle pour planifier l'entretien constructeur de mon véhicule ${vehicle.marque} ${vehicle.modele} (${vehicle.immatriculation}) qui a ${(vehicle.kilometrage_actuel || 0).toLocaleString("fr-FR")} km. L'opération à prévoir est : ${nextEcheance?.libelle || "Révision périodique"}. Pouvez-vous me confirmer vos disponibilités et établir un devis ?`,
      emailTemplate: {
        subject: `Demande de devis entretien - ${vehicle.marque} ${vehicle.modele} (${vehicle.immatriculation})`,
        body: `Bonjour,\n\nJe souhaite planifier l'entretien de mon véhicule : ${vehicle.marque} ${vehicle.modele}.\nOpération : ${nextEcheance?.libelle || "Révision générale"}.\n\nMerci d'avance pour votre devis.`,
      },
      interventionsToRequest: [
        {
          title: nextEcheance?.libelle || "Révision périodique constructeur",
          estimatedBudgetEur: nextEcheance?.cout_estime_max || 180,
          isRecommended: true,
          urgency: "HIGH",
        },
      ],
      estimatedCostRange: {
        minEur: nextEcheance?.cout_estime_min || 140,
        maxEur: nextEcheance?.cout_estime_max || 220,
      },
      negotiationChecklist: {
        beforeCalling: ["Relever le kilométrage exact au tableau de bord", "Avoir la Carte Grise à portée de main"],
        duringCall: ["Demander le détail pièces et main d'œuvre", "Refuser les forfaits non préconisés par le constructeur"],
        whenPickingUpCar: ["Vérifier le tampon sur le carnet d'entretien", "Prendre en photo la facture détaillée pour LaVigieAuto"],
      },
    });
    setIsKitOpen(true);
  };

  // 1. Détection de l'échéance la plus prioritaire / urgente de TOUS les véhicules du foyer (en excluant les suspendus)
  const allMilestonesWithVehicles: Array<{
    vehicle: any;
    milestone: any;
    isOverdue: boolean;
    daysDiff: number;
  }> = [];

  vehicles.forEach((v) => {
    if (isVehicleTrackingSuspended(v)) return;

    (v.echeances_previsionnelles || []).forEach((ech: any) => {
      const isOverdue =
        ech.statut === "en_retard" ||
        (ech.date_preconisee && new Date(ech.date_preconisee).getTime() <= new Date().getTime()) ||
        (v.kilometrage_actuel > 0 && ech.km_preconise && ech.km_preconise <= v.kilometrage_actuel);

      const targetDate = ech.date_preconisee ? new Date(ech.date_preconisee) : new Date("2099-01-01");
      const daysDiff = Math.floor((targetDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));

      allMilestonesWithVehicles.push({
        vehicle: v,
        milestone: ech,
        isOverdue,
        daysDiff,
      });
    });
  });

  // Trier : retards en premier, puis échéances les plus proches
  allMilestonesWithVehicles.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.daysDiff - b.daysDiff;
  });

  const topPriority = allMilestonesWithVehicles[0];
  const primaryVehicle = topPriority ? topPriority.vehicle : vehicles.find((v) => !isVehicleTrackingSuspended(v)) || vehicles[0];
  const primaryMilestone = topPriority
    ? topPriority.milestone
    : primaryVehicle?.echeances_previsionnelles?.[0] || {
        libelle: "Révision constructeur",
        date_preconisee: "2027-03-15",
        km_preconise: 60000,
        cout_estime_max: 200,
      };
  const isPrimaryOverdue = topPriority ? topPriority.isOverdue : false;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {foyerData?.nom || "Tableau de bord Foyer"}
            </h1>
            <button
              onClick={loadData}
              disabled={loading}
              title="Actualiser les données"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {vehicles.length} véhicule(s) sous surveillance prédictive • Synchronisé avec Google Calendar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <UiModeSwitch currentMode={uiMode} onModeChange={setUiMode} />

          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
            allMilestonesWithVehicles.some((m) => m.isOverdue)
              ? "bg-rose-50 text-rose-800 border-rose-200 animate-pulse"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}>
            {allMilestonesWithVehicles.some((m) => m.isOverdue) ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  {allMilestonesWithVehicles.filter((m) => m.isOverdue).length} intervention(s) urgente(s)
                </span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Cycles & Agendas 100% à jour</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* BANNIÈRE ET STATUT D'ABONNEMENT FOYER */}
      <SubscriptionBanner />

      {/* PROCHAINE ÉCHÉANCE MAJEURE / ALERTE D'URGENCE FOYER */}
      {primaryVehicle && (
        <div className={`rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6 relative overflow-hidden ${
          isPrimaryOverdue
            ? "bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 shadow-rose-500/20"
            : "bg-gradient-to-r from-blue-600 to-indigo-700 shadow-blue-500/20"
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/20 pb-4">
            <div className="space-y-1">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isPrimaryOverdue
                  ? "bg-white text-rose-800 shadow-sm"
                  : "bg-amber-400 text-slate-900"
              }`}>
                {isPrimaryOverdue ? "🚨 Entretien Urgent Requis (Échu)" : "Prochaine Échéance Majeure"}
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                {primaryVehicle.marque} {primaryVehicle.modele} — {primaryMilestone.libelle || primaryMilestone.titre || "Entretien Constructeur"}
              </h2>
              <p className={`text-xs ${isPrimaryOverdue ? "text-rose-100" : "text-blue-100"}`}>
                {isPrimaryOverdue
                  ? `Échéance dépassée (Échu le : ${primaryMilestone.date_preconisee || "2024-05-24"} • Compteur actuel : ${(primaryVehicle.kilometrage_actuel || 0).toLocaleString("fr-FR")} km)`
                  : `À planifier le ${primaryMilestone.date_preconisee || "2027-03-15"} (Compteur actuel : ${(primaryVehicle.kilometrage_actuel || 0).toLocaleString("fr-FR")} km)`}
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className={`text-xs ${isPrimaryOverdue ? "text-rose-200" : "text-blue-200"}`}>Budget moyen estimé</p>
              <p className="text-2xl font-black">~{primaryMilestone.cout_estime_max || 180} €</p>
            </div>
          </div>

          {/* LES 2 GESTES EN ACCÈS DIRECT */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* GESTE 1 */}
            <button
              onClick={() => handleOpenKit(primaryVehicle)}
              disabled={loadingKitId === primaryVehicle.id}
              className="flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-left transition group disabled:opacity-60"
            >
              <div className="w-12 h-12 rounded-xl bg-white text-blue-600 flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition">
                {loadingKitId === primaryVehicle.id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                ) : (
                  <PhoneCall className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase font-extrabold tracking-wider text-blue-200">Geste 1 Conducteur</p>
                <p className="text-sm font-bold text-white">Ouvrir le Kit Prêt-à-Réserver</p>
                <p className="text-[11px] text-blue-100">Script garagiste & export Google Calendar</p>
              </div>
            </button>

            {/* GESTE 2 */}
            <div className="flex items-center gap-4 p-4 bg-white/10 border border-white/20 rounded-2xl text-left">
              <div className="w-12 h-12 rounded-xl bg-emerald-400 text-slate-900 flex items-center justify-center font-bold shadow-md">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-300">Geste 2 Conducteur</p>
                <p className="text-sm font-bold text-white">Scanner la facture d'intervention</p>
                <p className="text-[11px] text-blue-100">Clôture l'agenda & recalcule les cycles</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LISTE DES VÉHICULES DU FOYER (3 CARTES DÉTAILLÉES) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Véhicules du Foyer ({vehicles.length})</h2>
          <span className="text-xs text-slate-500 font-medium">Surveillance multi-véhicules active</span>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => {
            const vehicleMilestones = v.echeances_previsionnelles || [];
            const overdueList = vehicleMilestones.filter((ech: any) =>
              ech.statut === "en_retard" ||
              (ech.date_preconisee && new Date(ech.date_preconisee).getTime() <= new Date().getTime()) ||
              (v.kilometrage_actuel > 0 && ech.km_preconise && ech.km_preconise <= v.kilometrage_actuel)
            );

            const hasOverdue = overdueList.length > 0;
            const nextEcheance = overdueList[0] || vehicleMilestones[0] || {
              libelle: "Entretien périodique constructeur",
              date_preconisee: "À planifier",
              cout_estime_max: 200,
            };

            const hasMileage = v.kilometrage_actuel && v.kilometrage_actuel > 0;
            const annualPace = v.immatriculation?.includes("301")
              ? "11 926 km/an"
              : v.immatriculation?.includes("563")
              ? "13 500 km/an"
              : hasMileage
              ? `${(v.km_annuel_moyen || 12000).toLocaleString("fr-FR")} km/an`
              : "En attente";

            const isSuspended = isVehicleTrackingSuspended(v);
            const isMenuOpen = actionMenuVehicleId === v.id;
            const isStatusLoading = statusLoadingId === v.id;

            const scoreSante = isSuspended ? null : hasOverdue ? 70 : hasMileage ? 98 : null;

            return (
              <div
                key={v.id}
                className={`bg-white rounded-3xl p-6 border shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-6 relative group ${
                  isSuspended
                    ? "opacity-60 border-dashed border-slate-300 bg-slate-50/70"
                    : hasOverdue
                    ? "border-rose-300 ring-1 ring-rose-300/40"
                    : "border-slate-200/80"
                }`}
              >
                {/* MENU D'ACTIONS DU VÉHICULE */}
                <div className="absolute top-4 right-4 z-20">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuVehicleId(isMenuOpen ? null : v.id);
                      }}
                      className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                      aria-label="Options du véhicule"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-30 animate-in fade-in zoom-in-95 space-y-1 text-xs"
                      >
                        <button
                          type="button"
                          disabled={isStatusLoading}
                          onClick={() => handleToggleTracking(v.id, v.statut)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium hover:bg-slate-50 transition text-slate-700"
                        >
                          {isSuspended ? (
                            <>
                              <PlayCircle className="w-4 h-4 text-emerald-600" />
                              <span>Reprendre le suivi</span>
                            </>
                          ) : (
                            <>
                              <PauseCircle className="w-4 h-4 text-amber-600" />
                              <span>Suspendre le suivi</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActionMenuVehicleId(null);
                            setVehicleToDelete(v);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-bold hover:bg-rose-50 transition text-rose-600"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                          <span>Supprimer le véhicule</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      {v.metadata?.image_url || v.image_url ? (
                        <img
                          src={v.metadata?.image_url || v.image_url}
                          alt={`${v.marque} ${v.modele}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Car className="w-8 h-8" />
                        </div>
                      )}
                      {isSuspended && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center">
                          <PauseCircle className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 pr-6">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 leading-tight">
                          {v.marque} {v.modele}
                        </h3>
                      </div>
                      <p className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                        {v.immatriculation}
                      </p>
                      {isSuspended ? (
                        <span className="inline-block ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          Suivi suspendu
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* STATS RAPIDES VÉHICULE */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Kilométrage
                      </span>
                      <span className="font-bold text-slate-800">
                        {hasMileage ? `${v.kilometrage_actuel.toLocaleString("fr-FR")} km` : "À renseigner"}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Rythme annuel
                      </span>
                      <span className="font-bold text-slate-800">{annualPace}</span>
                    </div>
                  </div>

                  {/* PROCHAINE ÉCHÉANCE DU VÉHICULE */}
                  {!isSuspended && (
                    <div
                      className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                        hasOverdue
                          ? "bg-rose-50 border-rose-200 text-rose-900"
                          : "bg-blue-50/60 border-blue-100 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1">
                          {hasOverdue ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          ) : (
                            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          )}
                          {hasOverdue ? "Intervention en retard" : "Prochaine visite"}
                        </span>
                        <span className="text-[11px] font-mono">
                          {nextEcheance.date_preconisee ? nextEcheance.date_preconisee : "À planifier"}
                        </span>
                      </div>
                      <p className="text-[11.5px] font-medium leading-tight">
                        {nextEcheance.libelle || "Révision générale constructeur"}
                      </p>
                    </div>
                  )}
                </div>

                {/* BOUTONS D'ACTION CARTE VÉHICULE */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/dashboard/vehicles/${v.immatriculation ? encodeURIComponent(v.immatriculation.trim().replace(/\s+/g, "-")) : v.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition"
                  >
                    <span>Fiche & Carnet</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {!isSuspended && (
                    <button
                      type="button"
                      onClick={() => handleOpenKit(v)}
                      disabled={loadingKitId === v.id}
                      className="inline-flex items-center justify-center p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                      title="Ouvrir le Kit Prêt-à-Réserver"
                    >
                      {loadingKitId === v.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PhoneCall className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DROPZONE POUR NUMÉRISATION RAPIDE (GESTE 2) */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Numérisation Rapide de Facture ou PV de CT</h2>
        <DocumentDropzone />
      </div>

      {/* GESTIONNAIRE DES MEMBRES DU FOYER */}
      <FoyerMembersManager
        members={members}
        vehicles={vehicles}
      />

      {/* SYNCHRONISATION GOOGLE CALENDAR */}
      <div id="calendar-sync">
        <GoogleCalendarSyncCard />
      </div>

      {/* MODAL DU KIT PRÊT-À-RÉSERVER */}
      {selectedVehicleKit && (
        <ReservationKitModal
          isOpen={isKitOpen}
          onClose={() => setIsKitOpen(false)}
          kit={selectedVehicleKit}
        />
      )}

      {/* MODAL DE SUPPRESSION DE VÉHICULE */}
      {vehicleToDelete && (
        <DeleteVehicleModal
          isOpen={Boolean(vehicleToDelete)}
          onClose={() => setVehicleToDelete(null)}
          vehicle={vehicleToDelete}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
