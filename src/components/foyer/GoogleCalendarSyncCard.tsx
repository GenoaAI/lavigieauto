"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Bell,
  Clock,
  Sparkles,
  AlertCircle,
  Unlink,
  Car,
  Check,
  Filter,
} from "lucide-react";
import {
  getGoogleCalendarStateAction,
  syncGoogleCalendarAction,
  disconnectGoogleCalendarAction,
  updateUserSyncedVehiclesAction,
  GoogleCalendarState,
  SyncCalendarResult,
} from "@/app/actions/calendar";
import { UniversalCalendarDropdown } from "@/components/calendar/UniversalCalendarDropdown";
import type { UniversalCalendarEvent } from "@/lib/calendar/universal-calendar";

export function GoogleCalendarSyncCard() {
  const [state, setState] = useState<GoogleCalendarState | null>(null);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<SyncCalendarResult | null>(null);

  const loadState = async () => {
    setLoading(true);
    try {
      const res = await getGoogleCalendarStateAction();
      setState(res);
      setSelectedVehicleIds(res.syncedVehicleIds || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  const handleToggleVehicle = async (vehicleId: string) => {
    const validIds = new Set(allVehicles.map((v) => v.id));
    const cleanCurrent = selectedVehicleIds.filter((id) => validIds.has(id));
    const isCurrentlySelected = cleanCurrent.includes(vehicleId);
    const newSelection = isCurrentlySelected
      ? cleanCurrent.filter((id) => id !== vehicleId)
      : [...cleanCurrent, vehicleId];

    setSelectedVehicleIds(newSelection);
    try {
      await updateUserSyncedVehiclesAction(newSelection);
    } catch (err) {
      console.warn("Erreur mise à jour préférences véhicules:", err);
    }
  };

  const handleSelectAll = async () => {
    if (!state) return;
    const allIds = state.allVehicles.map((v) => v.id);
    setSelectedVehicleIds(allIds);
    await updateUserSyncedVehiclesAction(allIds);
  };

  const handleDeselectAll = async () => {
    setSelectedVehicleIds([]);
    await updateUserSyncedVehiclesAction([]);
  };

  const handleSync = async () => {
    if (selectedVehicleIds.length === 0) {
      setSyncFeedback({
        success: false,
        message: "Veuillez sélectionner au moins un véhicule à synchroniser.",
        syncedCount: 0,
        calendarName: "🚗 Entretien Véhicules (LaVigieAuto)",
        events: [],
      });
      return;
    }

    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncGoogleCalendarAction(selectedVehicleIds);
      setSyncFeedback(res);
      await loadState();
    } catch (err: any) {
      setSyncFeedback({
        success: false,
        message: "Échec de synchronisation",
        syncedCount: 0,
        calendarName: "🚗 Entretien Véhicules (LaVigieAuto)",
        events: [],
        error: err.message,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleCalendarAction();
    await loadState();
  };

  if (loading && !state) {
    return (
      <div className="p-6 bg-white rounded-3xl border border-slate-200 animate-pulse space-y-3">
        <div className="h-4 bg-slate-100 rounded w-1/3"></div>
        <div className="h-8 bg-slate-100 rounded w-full"></div>
      </div>
    );
  }

  const isConnected = state?.isConnected ?? false;
  const hasOAuthConfig = state?.hasOAuthConfig ?? false;
  const allVehicles = state?.allVehicles || [];

  // Événements pour export universel (.ics) du foyer
  const exportEvents: UniversalCalendarEvent[] = syncFeedback?.events && syncFeedback.events.length > 0
    ? syncFeedback.events.map((ev, i) => ({
        id: `foyer-sync-ev-${i}-${Date.now()}`,
        title: `🔧 RDV ${ev.vehicle} — ${ev.title}`,
        startDate: ev.dueDate || new Date().toISOString().slice(0, 10),
        vehicleMakeModel: ev.vehicle,
        licensePlate: ev.licensePlate,
        dueMileage: ev.dueMileage,
        estimatedCostEur: ev.estimatedCost,
        description: `${ev.title}\nScript atelier : ${ev.phoneScript}`,
      }))
    : allVehicles.map((v, i) => ({
        id: `foyer-veh-ev-${v.id}-${i}`,
        title: `🚗 Entretien Prévisionnel : ${v.marque} ${v.modele}`,
        startDate: new Date(Date.now() + (30 + i * 45) * 24 * 3600 * 1000).toISOString().slice(0, 10),
        vehicleMakeModel: `${v.marque} ${v.modele}`,
        licensePlate: v.immatriculation,
        description: `Entretien planifié pour ${v.marque} ${v.modele} [${v.immatriculation}]`,
      }));

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-indigo-500/20 space-y-5 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shadow-inner">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white">Synchronisation d'Agenda & Export Universel</h3>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                isConnected
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-slate-800 text-slate-300 border-slate-700"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
                {isConnected ? "Google Calendar Actif" : "Export .ics & Google"}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Agenda dédié : <strong className="text-indigo-200">{state?.calendarName || "🚗 Entretien Véhicules (LaVigieAuto)"}</strong> • Compatible Yahoo, Outlook, Apple, Google
            </p>
          </div>
        </div>

        {/* Actions Principales */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isConnected ? (
            <>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing || selectedVehicleIds.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                <span>
                  {syncing
                    ? "Synchronisation..."
                    : `Synchroniser Google (${selectedVehicleIds.length}/${allVehicles.length})`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDisconnect}
                className="p-2.5 bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 rounded-xl text-xs transition border border-white/10"
                title="Déconnecter mon compte Google"
              >
                <Unlink className="w-4 h-4" />
              </button>
            </>
          ) : (
            <a
              href="/api/auth/google"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold shadow-lg shadow-white/10 transition active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Lier Google Agenda</span>
            </a>
          )}

          {/* Export Universel .ics (Yahoo / Outlook / Apple) */}
          <UniversalCalendarDropdown
            events={exportEvents}
            variant="dark"
            buttonLabel="Exporter .ics (Yahoo, Outlook...)"
            size="md"
            filename="agenda-entretien-foyer"
          />

          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl text-xs font-semibold border border-white/10 transition"
          >
            <span>Google Agenda</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* SÉLECTION GRANULAIRE DES VÉHICULES DU CONDUCTEUR */}
      {isConnected && (
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-white text-xs">
                Sélection des véhicules pour votre agenda personnel :
              </span>
              <span className="text-[11px] text-indigo-300 font-mono">
                ({selectedVehicleIds.length} sélectionné{selectedVehicleIds.length > 1 ? "s" : ""})
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-slate-300 hover:text-white hover:underline"
              >
                Tout cocher
              </button>
              <span className="text-white/20">•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-slate-400 hover:text-slate-200 hover:underline"
              >
                Tout décocher
              </button>
            </div>
          </div>

          {/* Grille des véhicules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
            {allVehicles.map((v) => {
              const isSelected = selectedVehicleIds.includes(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleToggleVehicle(v.id)}
                  className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? "bg-indigo-600/30 border-indigo-400/60 text-white shadow-sm ring-1 ring-indigo-400/40"
                      : "bg-black/20 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-400"
                    }`}>
                      <Car className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate">
                        {v.marque} {v.modele}
                      </p>
                      <p className="text-[10.5px] font-mono text-slate-300 truncate">
                        {v.immatriculation}
                      </p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? "bg-emerald-500 border-emerald-400 text-white"
                      : "border-white/20 text-transparent"
                  }`}>
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Détails de synchronisation & Métriques */}
      {!isConnected ? (
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2 text-xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="font-bold text-slate-200">Synchronisation sur-mesure & Liberté de choix de messagerie :</p>
              <p className="text-slate-300 leading-relaxed text-[11.5px]">
                Vous êtes libre d'utiliser <strong>n'importe quelle adresse email</strong> (Yahoo, Outlook, Gmail, Orange, iCloud...). Vous pouvez au choix lier un Google Agenda dédié en un clic, ou <strong>exporter l'intégralité de vos échéances au format .ics</strong> directement lisible par Apple Calendar, Yahoo Mail et Microsoft Outlook.
              </p>
              <p className="text-slate-400 text-[11px]">
                Chaque conducteur du foyer peut également <strong>sélectionner uniquement les véhicules qu'il conduit</strong> afin de ne recevoir que les alertes pertinentes pour son quotidien.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs relative">
          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 space-y-1">
            <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">Compte Google</p>
            <p className="font-bold text-slate-100 truncate">{state?.userEmail || "Charles de Forges"}</p>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Accès API Calendar sécurisé
            </p>
          </div>

          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 space-y-1">
            <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">Rappels Automatiques</p>
            <p className="font-bold text-slate-100">J-30 & J-7 avant l'échéance</p>
            <p className="text-[10px] text-indigo-300">Popup mobile & Email partagé</p>
          </div>

          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 space-y-1">
            <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">Dernière synchronisation</p>
            <p className="font-bold text-slate-100">
              {state?.lastSyncedAt ? new Date(state.lastSyncedAt).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "Prêt à synchroniser"}
            </p>
            <p className="text-[10px] text-indigo-200 font-semibold">
              {selectedVehicleIds.length} véhicule(s) dans votre sélection
            </p>
          </div>
        </div>
      )}

      {/* Notification de synchronisation réussie */}
      {syncFeedback && (
        <div className={`p-4 rounded-2xl text-xs space-y-2 border animate-in fade-in duration-200 ${
          syncFeedback.success
            ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-100"
            : "bg-rose-500/20 border-rose-400/40 text-rose-100"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              {syncFeedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{syncFeedback.message}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-[10px] text-slate-300 hover:text-white underline"
            >
              Fermer
            </button>
          </div>

          {syncFeedback.events.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {syncFeedback.events.map((ev, i) => (
                <div key={i} className="p-2.5 bg-black/30 rounded-xl border border-white/10 flex items-center justify-between gap-3 text-[11px] overflow-hidden">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-white block truncate">{ev.vehicle}</span>
                    <p className="text-slate-300 truncate text-[10.5px] mt-0.5" title={ev.title}>
                      {ev.title}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-500/30 text-blue-200 font-mono text-[10px] rounded-lg font-semibold shrink-0 border border-blue-400/20 shadow-sm">
                    {ev.dueDate}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
