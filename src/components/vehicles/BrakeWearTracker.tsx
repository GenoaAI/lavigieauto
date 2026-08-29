"use client";

import React, { useState } from "react";
import { Disc, AlertTriangle, Gauge, Sparkles, Wrench, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";
import { VehicleBrakeAssessment } from "@/lib/engine/brakes";
import { CollapsibleModuleCard } from "@/components/ui/CollapsibleModuleCard";

interface BrakeWearTrackerProps {
  assessment: VehicleBrakeAssessment;
  vehicleName: string;
  licensePlate: string;
  vehicleId?: string;
}

export function BrakeWearTracker({ assessment, vehicleName, licensePlate, vehicleId }: BrakeWearTrackerProps) {
  const [selectedAxle, setSelectedAxle] = useState<"FRONT" | "REAR">("FRONT");
  const [showQuoteKit, setShowQuoteKit] = useState(false);

  const front = assessment.frontAxle;
  const rear = assessment.rearAxle;
  const activeAxle = selectedAxle === "FRONT" ? front : rear;

  const healthColorClass =
    assessment.globalHealthScore >= 75
      ? "text-emerald-600"
      : assessment.globalHealthScore >= 50
      ? "text-blue-600"
      : assessment.globalHealthScore >= 25
      ? "text-amber-600"
      : "text-rose-600";

  return (
    <CollapsibleModuleCard
      id="brakes_tracker"
      vehicleId={vehicleId}
      defaultOpen={true}
      icon={<Disc className="w-5 h-5 text-rose-600" />}
      iconBgColor="bg-rose-50 text-rose-600"
      title="Suivi Prédictif & Sécurité du Freinage"
      subtitle="Épaisseur de garniture des plaquettes (témoin 2.0 mm), disques et projection au rythme réel"
      badge={
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
            <Sparkles className="w-3 h-3 text-rose-500" />
            IA Télémétrie
          </span>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block sm:inline mr-1">
              Indice Freins :
            </span>
            <span className={"text-xs sm:text-sm font-black " + healthColorClass}>
              {assessment.globalHealthScore}% ({assessment.frontAxle.statusLabel})
            </span>
          </div>
        </div>
      }
      actions={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowQuoteKit(!showQuoteKit);
          }}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <Wrench className="w-3.5 h-3.5 text-amber-400" />
          <span>Devis Freinage</span>
        </button>
      }
      bodyClassName="pt-5 border-t border-slate-100 mt-2 space-y-6"
    >
      {/* BANNIÈRE D'ALERTE MESURE ATELIER / USURE CRITIQUE */}
      {assessment.urgentActionNeeded && (
        <div className="p-4 bg-rose-50/90 border border-rose-200/80 rounded-2xl flex items-start gap-3 text-xs text-rose-950 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 flex-1">
            <p className="font-bold text-rose-950 text-sm">
              Intervention Freinage Recommandée : Remplacement Imminent
            </p>
            <p className="text-rose-800 leading-relaxed text-xs">
              {front.sourceType === "WORKSHOP_MEASUREMENT"
                ? "Une usure de " + front.wearPercentage + "% a été relevée lors de votre dernière visite en atelier (" + front.lastEventLabel + "). Reste environ ~" + front.remainingLiningThicknessMm + " mm de garniture sur l'essieu avant."
                : "Vos plaquettes de frein approchent du seuil d'usure légal (2.0 mm). Planifiez un rendez-vous d'atelier pour éviter d'endommager vos disques."}
            </p>
          </div>
        </div>
      )}

      {/* MODAL / TIROIR KIT DEVIS FREINAGE (IDENTIQUE AU DESIGN PNEUS) */}
      {showQuoteKit && (
        <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-4 shadow-lg animate-in fade-in border border-slate-800">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Script Garagiste & Estimation Budget Freinage</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowQuoteKit(false)}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              ✕ Fermer
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white/10 rounded-xl space-y-1">
              <span className="text-slate-400 block font-semibold text-[11px]">Forfait Plaquettes seules (TTC posé) :</span>
              <p className="font-mono font-bold text-emerald-400 text-sm">
                ~{assessment.estimatedCostRange.padsOnlyTTC.min} € à {assessment.estimatedCostRange.padsOnlyTTC.max} € TTC
              </p>
              <p className="text-slate-300 text-[11px]">Jeu de plaquettes homologuées constructeur + pose</p>
            </div>
            <div className="p-3 bg-white/10 rounded-xl space-y-1">
              <span className="text-slate-400 block font-semibold text-[11px]">Pack Combiné Disques + Plaquettes (TTC posé) :</span>
              <p className="font-mono font-bold text-white text-sm">
                ~{assessment.estimatedCostRange.discsAndPadsTTC.min} € à {assessment.estimatedCostRange.discsAndPadsTTC.max} € TTC
              </p>
              <p className="text-slate-300 text-[11px]">Économise 1 forfait de main-d&apos;œuvre si les disques sont à remplacer</p>
            </div>
          </div>

          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-xs text-indigo-100 space-y-1">
            <span className="font-bold text-amber-300">💡 Script téléphonique prêt-à-dire :</span>
            <p className="italic text-slate-200">
              « Bonjour, je souhaite un devis pour le remplacement des <strong>plaquettes de frein {assessment.nextReplacementAxle === "BOTH" ? "avant et arrière" : assessment.nextReplacementAxle === "FRONT" ? "avant" : "arrière"}</strong> pour mon {vehicleName} ({licensePlate}). Avez-vous les pièces homologuées constructeur en stock et pouvez-vous également vérifier l&apos;épaisseur de mes disques ? »
            </p>
          </div>
        </div>
      )}

      {/* SÉLECTEUR D'ESSIEU (TRAIN AVANT VS TRAIN ARRIÈRE) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSelectedAxle("FRONT")}
          className={`p-4 rounded-2xl text-left border transition ${
            selectedAxle === "FRONT"
              ? "border-rose-600 bg-rose-50/50 shadow-sm ring-2 ring-rose-500/20"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Train Avant (70% Puissance)</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              front.wearPercentage >= 80
                ? "bg-rose-100 text-rose-800"
                : front.wearPercentage >= 50
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            }`}>
              {front.remainingLiningThicknessMm} mm
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {front.statusLabel} • {front.wearPercentage}% d&apos;usure
          </p>
          <div className="mt-2.5 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                front.wearPercentage >= 80 ? "bg-rose-500" : front.wearPercentage >= 50 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.max(5, 100 - front.wearPercentage)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 font-semibold mt-1.5">
            {100 - front.wearPercentage}% de garniture (~{front.remainingKm.toLocaleString()} km)
          </p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedAxle("REAR")}
          className={`p-4 rounded-2xl text-left border transition ${
            selectedAxle === "REAR"
              ? "border-rose-600 bg-rose-50/50 shadow-sm ring-2 ring-rose-500/20"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Train Arrière (30% Puissance)</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              rear.wearPercentage >= 80
                ? "bg-rose-100 text-rose-800"
                : rear.wearPercentage >= 50
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            }`}>
              {rear.remainingLiningThicknessMm} mm
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {rear.statusLabel} • {rear.wearPercentage}% d&apos;usure
          </p>
          <div className="mt-2.5 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                rear.wearPercentage >= 80 ? "bg-rose-500" : rear.wearPercentage >= 50 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.max(5, 100 - rear.wearPercentage)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 font-semibold mt-1.5">
            {100 - rear.wearPercentage}% de garniture (~{rear.remainingKm.toLocaleString()} km)
          </p>
        </button>
      </div>

      {/* DÉTAIL DE L'ESSIEU ACTIF */}
      <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Composant sélectionné
            </span>
            <h4 className="font-bold text-slate-900 text-sm">{activeAxle.label}</h4>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={
                "px-2.5 py-1 rounded-full text-xs font-bold " +
                (activeAxle.healthColor === "emerald"
                  ? "bg-emerald-100 text-emerald-800"
                  : activeAxle.healthColor === "blue"
                  ? "bg-blue-100 text-blue-800"
                  : activeAxle.healthColor === "amber"
                  ? "bg-amber-100 text-amber-800"
                  : activeAxle.healthColor === "orange"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-rose-100 text-rose-800")
              }
            >
              {activeAxle.statusLabel} ({activeAxle.wearPercentage}% d&apos;usure)
            </span>
          </div>
        </div>

        {/* JAUGE GRAPHIQUE D'ÉPAISSEUR GARNITURE */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Épaisseur garniture restante :</span>
            <span className="font-mono text-sm">{activeAxle.remainingLiningThicknessMm} mm / 12.0 mm</span>
          </div>
          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${Math.max(5, 100 - activeAxle.wearPercentage)}%` }}
              className={
                "h-full transition-all duration-500 " +
                (activeAxle.wearPercentage >= 80
                  ? "bg-rose-500"
                  : activeAxle.wearPercentage >= 60
                  ? "bg-amber-500"
                  : "bg-emerald-500")
              }
            />
          </div>
          <div className="flex justify-between text-[10px] font-semibold text-slate-400">
            <span>Témoin usure critique : 2.0 mm</span>
            <span>Alerte prudence : 4.0 mm</span>
            <span>Garniture neuve : 12.0 mm</span>
          </div>
        </div>

        {/* GRILLE D'INDICATEURS TECHNIQUES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Autonomie restante</span>
            <p className="font-black text-slate-900 text-sm mt-0.5">
              ~{activeAxle.remainingKm.toLocaleString()} km
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Échéance estimée</span>
            <p className="font-black text-slate-900 text-sm mt-0.5">
              ~{activeAxle.projectedReplacementDate}
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-400 block font-semibold">État des Disques</span>
            <p
              className={
                "font-bold text-xs mt-0.5 " +
                (activeAxle.discsCondition === "REPLACE_WITH_NEXT_PADS" ? "text-amber-700" : "text-emerald-700")
              }
            >
              {activeAxle.discsStatusLabel}
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Source de mesure</span>
            <p className="font-bold text-slate-700 text-xs mt-0.5 truncate">
              {activeAxle.lastEventLabel}
            </p>
          </div>
        </div>

        {/* CONSEIL PRÉVENTIF */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/60 flex items-start gap-2.5 text-xs text-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900">Recommandation LaVigieAuto :</span>
            <p className="text-slate-600 leading-relaxed">{activeAxle.recommendation}</p>
          </div>
        </div>
      </div>
    </CollapsibleModuleCard>
  );
}
