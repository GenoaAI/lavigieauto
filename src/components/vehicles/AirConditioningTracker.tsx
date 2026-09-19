"use client";

import React, { useState } from "react";
import {
  Wind,
  Snowflake,
  Sun,
  AlertTriangle,
  Sparkles,
  Wrench,
  ShieldCheck,
  Zap,
  Info,
  Thermometer,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { VehicleAirConditioningAssessment } from "@/lib/engine/air-conditioning";
import { CollapsibleModuleCard } from "@/components/ui/CollapsibleModuleCard";
import { UniversalCalendarDropdown } from "@/components/calendar/UniversalCalendarDropdown";
import type { UniversalCalendarEvent } from "@/lib/calendar/universal-calendar";

interface AirConditioningTrackerProps {
  assessment: VehicleAirConditioningAssessment;
  vehicleName: string;
  licensePlate: string;
  vehicleId?: string;
}

export function AirConditioningTracker({
  assessment,
  vehicleName,
  licensePlate,
  vehicleId,
}: AirConditioningTrackerProps) {
  const [showQuoteKit, setShowQuoteKit] = useState(false);

  const healthColorClass =
    assessment.globalHealthScore >= 80
      ? "text-emerald-600"
      : assessment.globalHealthScore >= 60
      ? "text-blue-600"
      : assessment.globalHealthScore >= 40
      ? "text-amber-600"
      : "text-rose-600";

  const progressBgClass =
    assessment.globalHealthScore >= 80
      ? "bg-emerald-500"
      : assessment.globalHealthScore >= 60
      ? "bg-blue-500"
      : assessment.globalHealthScore >= 40
      ? "bg-amber-500"
      : "bg-rose-500";

  const acCalendarEvent: UniversalCalendarEvent = {
    id: `ac-recharge-${vehicleId || licensePlate}`,
    title: `❄️ Bilan & Entretien Climatisation : ${vehicleName} [${licensePlate}]`,
    startDate: assessment.projectedDueDate || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
    vehicleMakeModel: vehicleName,
    licensePlate,
    dueMileage: assessment.projectedDueMileage,
    estimatedCostEur: assessment.refrigerant.estimatedRechargeCost.maxEur,
    description: `Bilan préventif et recharge circuit de climatisation (${assessment.refrigerant.type}).\nFluide frigorigène : ${assessment.refrigerant.label}.\nÂge estimé du fluide : ${assessment.yearsSinceLastRecharge} ans (déperdition estimée ~${assessment.estimatedFluidLossPercent}%).\nBudget indicatif atelier : ${assessment.refrigerant.estimatedRechargeCost.minEur} € à ${assessment.refrigerant.estimatedRechargeCost.maxEur} € TTC.\n\nScript garage :\n« Bonjour, je souhaite planifier un contrôle d'efficacité et un bilan climatisation avec tirage au vide pour mon ${vehicleName} (${licensePlate}) utilisant le fluide ${assessment.refrigerant.type}. »`,
  };

  return (
    <CollapsibleModuleCard
      id="air_conditioning_tracker"
      vehicleId={vehicleId}
      defaultOpen={true}
      icon={<Wind className="w-5 h-5 text-sky-600" />}
      iconBgColor="bg-sky-50 text-sky-600"
      title="Bilan Climatisation & Confort Thermique"
      subtitle="Suivi de charge du fluide frigorigène, protection compresseur et préconisations de confort"
      badge={
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60 text-[10px] font-bold">
            <Snowflake className="w-3 h-3 text-sky-500" />
            {assessment.refrigerant.type}
          </span>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block sm:inline mr-1">
              Indice Clim :
            </span>
            <span className={"text-xs sm:text-sm font-black " + healthColorClass}>
              {assessment.globalHealthScore}% ({assessment.statusLabel})
            </span>
          </div>
        </div>
      }
      actions={
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <UniversalCalendarDropdown
            event={acCalendarEvent}
            buttonLabel="Rappel Agenda"
            variant="outline"
            size="sm"
            filename={`rdv-clim-${licensePlate}`}
          />
          <button
            type="button"
            onClick={() => setShowQuoteKit(!showQuoteKit)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Wrench className="w-3.5 h-3.5 text-sky-400" />
            <span>Guide & Conseils</span>
          </button>
        </div>
      }
      bodyClassName="pt-5 border-t border-slate-100 mt-2 space-y-6"
    >
      {/* 1. BANNIÈRE SAISONNIÈRE ESTIVALE */}
      {assessment.isSeasonalBoostActive && (
        <div className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-950 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <Sun className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-amber-900 text-sm mb-1 flex items-center gap-1.5">
              {assessment.seasonalAlertTitle || "☀️ Anticipation Confort Estival"}
            </h4>
            <p className="text-amber-800/90 leading-relaxed text-xs">
              {assessment.seasonalAlertMessage}
            </p>
          </div>
        </div>
      )}

      {/* 2. ALERTE COMPRESSEUR ÉLECTRIQUE HAUTE TENSION (HYBRIDE / EV) */}
      {assessment.isHighVoltageCompressor && assessment.highVoltageWarning && (
        <div className="p-3.5 bg-indigo-50/90 border border-indigo-200/70 rounded-2xl flex items-start gap-3 text-xs text-indigo-950 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="font-bold text-indigo-950 text-xs mb-0.5">Spécificité Haute Tension (Hybride / Électrique)</h5>
            <p className="text-indigo-800/90 text-[11px] leading-relaxed">
              {assessment.highVoltageWarning}
            </p>
          </div>
        </div>
      )}

      {/* 3. GRILLE DE SANTÉ & CARACTÉRISTIQUES FRIGORIFIQUES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Type de Fluide */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Fluide Homologué
          </span>
          <div className="flex items-center gap-1.5">
            <Snowflake className="w-4 h-4 text-sky-600" />
            <span className="text-sm font-black text-slate-900">{assessment.refrigerant.type}</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Tarif atelier estimé : {assessment.refrigerant.estimatedRechargeCost.minEur} à {assessment.refrigerant.estimatedRechargeCost.maxEur} € TTC
          </p>
        </div>

        {/* Âge du fluide */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Âge du Fluide
          </span>
          <div className="flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-black text-slate-900">
              {assessment.yearsSinceLastRecharge} ans
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight truncate">
            {assessment.lastRechargeDate
              ? `Recharge le ${new Date(assessment.lastRechargeDate).toLocaleDateString("fr-FR")}`
              : "Sans trace de recharge antérieure"}
          </p>
        </div>

        {/* Déperdition naturelle */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Perte Naturelle Estimée
          </span>
          <div className="flex items-center gap-1.5">
            <Wind className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-black text-slate-900">
              ~{assessment.estimatedFluidLossPercent} %
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            ~7,5% / an (porosité des joints et flexibles)
          </p>
        </div>

        {/* Prochaine échéance */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Échéance Recommandée
          </span>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-black text-slate-900">
              {new Date(assessment.projectedDueDate).toLocaleDateString("fr-FR", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Cycle préventif de 3 à 4 ans
          </p>
        </div>
      </div>

      {/* 4. BARRE DE SANTÉ DU CIRCUIT & LUBRIFICATION DU COMPRESSEUR */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            Efficacité thermique & lubrification du compresseur
          </span>
          <span className={`font-black ${healthColorClass}`}>
            {assessment.globalHealthScore}% de charge utile
          </span>
        </div>

        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressBgClass} rounded-full transition-all duration-700`}
            style={{ width: `${Math.min(100, Math.max(8, assessment.globalHealthScore))}%` }}
          />
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {assessment.recommendation}
        </p>
      </div>

      {/* 5. GUIDE D'ACTION & COMPARATIF : DIY VS ATELIER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ce que vous pouvez faire en DIY */}
        <div className="p-4 bg-emerald-50/50 border border-emerald-200/70 rounded-2xl space-y-2.5 text-xs">
          <h5 className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            100 % Faisable soi-même (DIY)
          </h5>
          <ul className="space-y-2 text-emerald-900 text-[11px]">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">•</span>
              <span><strong>Filtre d'habitacle</strong> : {assessment.diyGuide.cabinFilterAction}</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">•</span>
              <span><strong>Assainissement</strong> : {assessment.diyGuide.antibacterialTreatmentAction}</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">•</span>
              <span><strong>Auto-test</strong> : {assessment.diyGuide.thermalSelfTest}</span>
            </li>
          </ul>
        </div>

        {/* Pourquoi aller en atelier pour le fluide */}
        <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-2.5 text-xs">
          <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
            <Wrench className="w-4 h-4 text-slate-700" />
            Intervention en Atelier Professionnel
          </h5>
          <ul className="space-y-2 text-slate-700 text-[11px]">
            <li className="flex items-start gap-1.5">
              <span className="text-slate-400 font-bold">•</span>
              <span><strong>Tirage au vide</strong> : {assessment.workshopGuide.gasRefillDescription}</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-slate-400 font-bold">•</span>
              <span><strong>Lubrification</strong> : {assessment.workshopGuide.compressorOilCheck}</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-slate-400 font-bold">•</span>
              <span><strong>Réglementation F-Gas</strong> : manipulation étanche évitant le rejet de gaz à effet de serre.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 6. MODALE / TIROIR DE CONSEILS & PRÉPARATION DEVIS */}
      {showQuoteKit && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 text-xs shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-sky-400 flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4" />
              Script pour demander un devis atelier précis
            </h5>
            <button
              type="button"
              onClick={() => setShowQuoteKit(false)}
              className="text-slate-400 hover:text-white text-xs font-semibold"
            >
              Fermer
            </button>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Pour éviter les suppléments surprises, demandez explicitement un forfait comprenant :
          </p>
          <div className="bg-slate-800/80 p-3 rounded-xl font-mono text-[11px] text-sky-200 select-all border border-slate-700/60">
            « Bonjour, je souhaite un devis pour l'entretien climatisation de mon {vehicleName} ({licensePlate}). Il utilise le gaz {assessment.refrigerant.type}. Merci d'inclure le tirage au vide de 20 min, le test d'étanchéité et l'appoint d'huile{assessment.isHighVoltageCompressor ? " diélectrique non conductrice" : " PAG"}. »
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Prix standard constaté : {assessment.refrigerant.estimatedRechargeCost.minEur} € – {assessment.refrigerant.estimatedRechargeCost.maxEur} € TTC</span>
            <span>Réf. Fluide : {assessment.refrigerant.type}</span>
          </div>
        </div>
      )}
    </CollapsibleModuleCard>
  );
}
