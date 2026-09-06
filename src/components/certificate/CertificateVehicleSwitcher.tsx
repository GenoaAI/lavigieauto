"use client";

import React from "react";
import Link from "next/link";
import { Car, Check, ChevronRight } from "lucide-react";

export interface CertificateVehicleSummary {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  kilometrage_actuel?: number;
  image_url?: string | null;
}

interface CertificateVehicleSwitcherProps {
  vehicles: CertificateVehicleSummary[];
  currentVehicleId: string;
  currentPlate: string;
}

export function CertificateVehicleSwitcher({
  vehicles,
  currentVehicleId,
  currentPlate,
}: CertificateVehicleSwitcherProps) {
  if (!vehicles || vehicles.length <= 1) {
    return null;
  }

  const cleanCurrentId = (currentVehicleId || "").toUpperCase().replace(/[\s-]/g, "");
  const cleanCurrentPlate = (currentPlate || "").toUpperCase().replace(/[\s-]/g, "");

  const isCurrentVehicle = (v: CertificateVehicleSummary) => {
    const vId = (v.id || "").toUpperCase().replace(/[\s-]/g, "");
    const vPlate = (v.immatriculation || "").toUpperCase().replace(/[\s-]/g, "");
    return (
      (cleanCurrentId && vId === cleanCurrentId) ||
      (cleanCurrentPlate && vPlate === cleanCurrentPlate)
    );
  };

  return (
    <nav
      aria-label="Changer de véhicule du foyer"
      className="print:hidden bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 px-1">
          <Car className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Véhicules de votre foyer ({vehicles.length}) :</span>
        </div>

        {/* Pilules de sélection des véhicules */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {vehicles.map((veh) => {
            const active = isCurrentVehicle(veh);
            const targetHref = `/v/${encodeURIComponent(veh.id)}`;

            if (active) {
              return (
                <div
                  key={veh.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm shadow-blue-500/20 shrink-0 border border-blue-600"
                  aria-current="page"
                >
                  <Check className="w-3.5 h-3.5 text-blue-100" />
                  <span>
                    {veh.marque} {veh.modele}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-700/60 text-blue-100 font-semibold">
                    {veh.immatriculation}
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={veh.id}
                href={targetHref}
                prefetch={true}
                title={`Consulter le certificat de la ${veh.marque} ${veh.modele} (${veh.immatriculation})`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold border border-slate-200/80 transition-all active:scale-95 shrink-0 group"
              >
                <span>
                  {veh.marque} {veh.modele}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-800 transition">
                  {veh.immatriculation}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
