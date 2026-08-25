"use client";

import React, { useState } from "react";
import { Disc, CheckCircle2, AlertTriangle, Info, Calendar, Gauge, ArrowRight, Sparkles, Wrench } from "lucide-react";
import { VehicleTireAssessment } from "@/lib/engine/tires";

interface TireWearTrackerProps {
  assessment: VehicleTireAssessment;
  vehicleName: string;
  licensePlate: string;
}

export function TireWearTracker({ assessment, vehicleName, licensePlate }: TireWearTrackerProps) {
  const [selectedAxle, setSelectedAxle] = useState<"FRONT" | "REAR">("FRONT");
  const [showQuoteKit, setShowQuoteKit] = useState(false);

  const front = assessment.frontAxle;
  const rear = assessment.rearAxle;
  const activeAxle = selectedAxle === "FRONT" ? front : rear;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
            <Disc className="w-6 h-6 animate-[spin_12s_linear_infinite]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Suivi Prédictif & Sécurité des Pneumatiques</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                <Sparkles className="w-3 h-3 text-amber-500" />
                IA Télémétrie
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Anticipation de l'usure de gomme (témoin 1.6 mm) et projection kilométrique au rythme réel
            </p>
          </div>
        </div>

        {/* Global Score & Action */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Indice Santé Pneus</span>
            <span className={`text-base font-black ${
              assessment.globalHealthScore >= 80
                ? "text-emerald-600"
                : assessment.globalHealthScore >= 50
                ? "text-blue-600"
                : "text-amber-600"
            }`}>
              {assessment.globalHealthScore}% ({assessment.globalHealthScore >= 80 ? "Optimal" : "Bon état"})
            </span>
          </div>
          <button
            onClick={() => setShowQuoteKit(!showQuoteKit)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Kit Devis Pneus</span>
          </button>
        </div>
      </div>

      {/* MODAL KIT DEVIS PNEUMATIQUES */}
      {showQuoteKit && (
        <div className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl space-y-4 shadow-lg animate-in fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold">Script Garagiste & Commande Pneus homologués</h3>
            </div>
            <button
              onClick={() => setShowQuoteKit(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Fermer
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white/10 rounded-xl space-y-1">
              <span className="text-slate-400 block font-semibold text-[11px]">Dimensions & Spécifications officielles :</span>
              <p className="font-mono font-bold text-emerald-400 text-sm">{front.dimension}</p>
              <p className="text-slate-300 text-[11px]">Indice de charge et vitesse conformes constructeur</p>
            </div>
            <div className="p-3 bg-white/10 rounded-xl space-y-1">
              <span className="text-slate-400 block font-semibold text-[11px]">Prochaine échéance recommandée :</span>
              <p className="font-bold text-white text-sm">~{assessment.nextReplacementDate} (ou {front.remainingKm.toLocaleString()} km)</p>
              <p className="text-slate-300 text-[11px]">Essieu concerné : {assessment.nextReplacementAxle === "BOTH" ? "4 Pneus (AV + AR)" : assessment.nextReplacementAxle === "FRONT" ? "Train Avant" : "Train Arrière"}</p>
            </div>
          </div>
          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-xs text-indigo-100 space-y-1">
            <span className="font-bold text-amber-300">💡 Script téléphonique prêt-à-dire :</span>
            <p className="italic">
              « Bonjour, je souhaite un devis pour 2 pneumatiques en <strong>{front.dimension}</strong> pour mon {vehicleName} ({licensePlate}). Avez-vous du {front.brandAndModel} ou équivalent en stock avec forfait montage et équilibrage ? »
            </p>
          </div>
        </div>
      )}

      {/* SELECTIONNEUR D'ESSIEU (TRAIN AVANT VS TRAIN ARRIERE) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setSelectedAxle("FRONT")}
          className={`p-4 rounded-2xl text-left border transition ${
            selectedAxle === "FRONT"
              ? "border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Train Avant (Direction)</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              front.status === "EXCELLENT"
                ? "bg-emerald-100 text-emerald-800"
                : front.status === "GOOD"
                ? "bg-blue-100 text-blue-800"
                : "bg-amber-100 text-amber-800"
            }`}>
              {front.remainingTreadDepthMm} mm
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">{front.brandAndModel}</p>
          <div className="mt-2.5 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                front.wearPercentage <= 30 ? "bg-emerald-500" : front.wearPercentage <= 70 ? "bg-blue-500" : "bg-amber-500"
              }`}
              style={{ width: `${100 - front.wearPercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 font-semibold mt-1.5">
            {100 - front.wearPercentage}% de vie restante (~{front.remainingKm.toLocaleString()} km)
          </p>
        </button>

        <button
          onClick={() => setSelectedAxle("REAR")}
          className={`p-4 rounded-2xl text-left border transition ${
            selectedAxle === "REAR"
              ? "border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Train Arrière (Stabilité)</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              rear.status === "EXCELLENT"
                ? "bg-emerald-100 text-emerald-800"
                : rear.status === "GOOD"
                ? "bg-blue-100 text-blue-800"
                : "bg-amber-100 text-amber-800"
            }`}>
              {rear.remainingTreadDepthMm} mm
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">{rear.brandAndModel}</p>
          <div className="mt-2.5 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                rear.wearPercentage <= 30 ? "bg-emerald-500" : rear.wearPercentage <= 70 ? "bg-blue-500" : "bg-amber-500"
              }`}
              style={{ width: `${100 - rear.wearPercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 font-semibold mt-1.5">
            {100 - rear.wearPercentage}% de vie restante (~{rear.remainingKm.toLocaleString()} km)
          </p>
        </button>
      </div>

      {/* DETAIL DE L'ESSIEU SÉLECTIONNÉ */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">{activeAxle.label}</span>
              <span className="text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                {activeAxle.dimension}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeAxle.sourceType === "WORKSHOP_INSPECTION" ? (
                <>
                  🔍 <strong>Dernier diagnostic atelier</strong> le <strong>{activeAxle.lastEventDate}</strong> ({activeAxle.lastEventMileage.toLocaleString()} km) : <strong>{activeAxle.wearPercentage}% d'usure constatée</strong>
                </>
              ) : activeAxle.sourceType === "NEW_TIRES_INSTALLED" ? (
                <>
                  ✨ <strong>Montage pneus neufs</strong> le <strong>{activeAxle.lastEventDate}</strong> ({activeAxle.lastEventMileage.toLocaleString()} km) • Modèle : <strong>{activeAxle.brandAndModel}</strong>
                </>
              ) : (
                <>
                  Modèle : <strong>{activeAxle.brandAndModel}</strong> • Suivi kilométrique prédictif
                </>
              )}
            </p>
          </div>
          <span className={`self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-bold ${
            activeAxle.status === "EXCELLENT"
              ? "bg-emerald-100 text-emerald-800"
              : activeAxle.status === "GOOD"
              ? "bg-blue-100 text-blue-800"
              : "bg-amber-100 text-amber-800"
          }`}>
            {activeAxle.statusLabel}
          </span>
        </div>

        {/* 3 Cartes indicateurs d'usure */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Profondeur de sculpture */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Profondeur de Sculpture</span>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-black text-slate-900 font-mono">{activeAxle.remainingTreadDepthMm}</p>
              <span className="text-xs font-bold text-slate-500">/ 8.0 mm</span>
            </div>
            <p className="text-[10px] text-slate-500">Témoin légal à 1.6 mm (Limite pluie : 3.0 mm)</p>
          </div>

          {/* Kilométrage restant */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Potentiel Kilométrique</span>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-black text-emerald-700 font-mono">
                ~{activeAxle.remainingKm.toLocaleString()}
              </p>
              <span className="text-xs font-bold text-slate-500">km</span>
            </div>
            <p className="text-[10px] text-slate-500">
              {activeAxle.sourceType === "WORKSHOP_INSPECTION"
                ? `${100 - activeAxle.wearPercentage}% de vie restante selon relevé atelier`
                : `${activeAxle.kmDrivenSinceEvent.toLocaleString()} km parcourus depuis la pose neuve`}
            </p>
          </div>

          {/* Date de remplacement préconisée */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Remplacement Prévu</span>
            <p className="text-base font-black text-slate-900 mt-1">
              ~{activeAxle.projectedReplacementDate}
            </p>
            <p className="text-[10px] text-slate-500">Calculé d'après votre rythme moyen journalier</p>
          </div>
        </div>

        {/* Conseil & Recommandation */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900">Recommandation LaVigieAuto : </span>
            <span>{activeAxle.recommendation}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
