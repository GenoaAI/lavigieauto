"use client";

import React from "react";
import { ShieldCheck, Calendar, MapPin } from "lucide-react";

export interface LastInspectionSummaryProps {
  mileage?: number | null;
  date?: string | null;
  centerName?: string | null;
  centerAddress?: string | null;
  expiryDate?: string | null;
  resultStatus?: string | null;
  defectsCount?: number;
  className?: string;
}

/**
 * Formate élégamment le kilométrage d'un contrôle technique
 * Ex: 142500 -> '142 500 km'
 * Fallback gracieux si absent, nul ou invalide : 'Kilométrage non renseigné'
 */
export function formatInspectionMileage(mileage?: number | null): string {
  if (
    mileage === undefined ||
    mileage === null ||
    typeof mileage !== "number" ||
    isNaN(mileage) ||
    mileage <= 0
  ) {
    return "Kilométrage non renseigné";
  }

  return `${mileage.toLocaleString("fr-FR")} km`;
}

export function LastInspectionSummary({
  mileage,
  date,
  centerName = "Centre Contrôle Technique Agréé",
  centerAddress = "Agréé préfecture",
  expiryDate,
  resultStatus = "FAVORABLE (A)",
  defectsCount = 0,
  className = "",
}: LastInspectionSummaryProps) {
  const formattedMileage = formatInspectionMileage(mileage);
  const statusString = resultStatus || "FAVORABLE (A)";
  const isFavorable = !statusString.toUpperCase().includes("DÉFAVORABLE") && !statusString.toUpperCase().includes("DEFAVORABLE");

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs ${className}`}>
      {/* 1. Centre de contrôle agréé */}
      <div className="p-3 bg-slate-50 rounded-xl space-y-0.5 border border-slate-100">
        <div className="flex items-center gap-1 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span>Centre Agréé</span>
        </div>
        <p className="font-bold text-slate-800 line-clamp-1">{centerName || "Centre Agréé"}</p>
        <p className="text-slate-500 text-[11px] line-clamp-1">{centerAddress || "Agréé préfecture"}</p>
      </div>

      {/* 2. Date & Kilométrage relevé */}
      <div className="p-3 bg-slate-50 rounded-xl space-y-0.5 border border-slate-100">
        <div className="flex items-center gap-1 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
          <span>Date & Kilométrage</span>
        </div>
        <p className="font-bold text-slate-800">{date || "Date certifiée"}</p>
        <p className={`font-semibold text-[11px] ${mileage && mileage > 0 ? "text-emerald-700" : "text-slate-500"}`}>
          {formattedMileage}
        </p>
      </div>

      {/* 3. Résultat réglementaire & Bilan */}
      <div className="p-3 bg-slate-50 rounded-xl space-y-0.5 border border-slate-100">
        <div className="flex items-center gap-1 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
          <ShieldCheck className={`w-3 h-3 ${isFavorable ? "text-emerald-600" : "text-amber-600"} shrink-0`} />
          <span>Résultat & Bilan</span>
        </div>
        <p className={`font-bold ${isFavorable ? "text-emerald-700" : "text-amber-700"}`}>
          {statusString}
        </p>
        <p className="text-slate-500 text-[11px]">
          {defectsCount > 0 ? `${defectsCount} observation(s) relevée(s)` : "Aucune contre-visite requise"}
        </p>
      </div>
    </div>
  );
}
