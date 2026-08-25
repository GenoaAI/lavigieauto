"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Car,
  LayoutDashboard,
  Upload,
  ShieldCheck,
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { Foyer, FoyerMember } from "@/lib/types/database.types";
import { EnrichedVehicle } from "@/app/actions/vehicles";

interface DashboardSidebarProps {
  foyer: Foyer | null;
  vehicles: EnrichedVehicle[];
  members: FoyerMember[];
}

export function DashboardSidebar({ foyer, vehicles, members }: DashboardSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`sticky top-16 h-[calc(100vh-4rem)] bg-white border-r border-slate-200/80 p-3 sm:p-4 flex flex-col justify-between shrink-0 transition-all duration-300 z-20 overflow-y-auto ${
        isCollapsed ? "w-20" : "w-64 lg:w-72"
      }`}
    >
      <div className="space-y-5">
        {/* En-tête Foyer + Bouton Fold / Unfold */}
        <div className="flex items-center justify-between gap-1.5">
          {!isCollapsed && (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex-1 space-y-0.5 overflow-hidden animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Espace Foyer</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-xs font-bold text-slate-900 truncate">
                {foyer?.nom || "Foyer LaVigieAuto"}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {vehicles.length} véhicule(s) • {Math.max(1, members.length)} conducteur(s)
              </p>
            </div>
          )}

          {/* Bouton de repliement / dépliement (Fold / Unfold) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Déplier le menu latéral" : "Replier le menu latéral"}
            className={`p-2 rounded-xl border transition flex items-center justify-center shrink-0 ${
              isCollapsed
                ? "w-full bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 py-2.5"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
            }`}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5 text-xs font-semibold text-slate-600">
          {/* Vue d'ensemble */}
          <Link
            href="/dashboard"
            title="Vue d'ensemble Foyer"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              pathname === "/dashboard"
                ? "bg-blue-50 text-blue-700 font-bold shadow-sm"
                : "hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 ${pathname === "/dashboard" ? "text-blue-600" : "text-slate-500"}`} />
            {!isCollapsed && <span className="truncate">Vue d'ensemble Foyer</span>}
          </Link>

          {/* Section Véhicules */}
          <div className="pt-2 pb-1">
            {!isCollapsed ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">
                Mes Véhicules ({vehicles.length})
              </span>
            ) : (
              <div className="w-full border-t border-slate-200 my-1" />
            )}
          </div>

          {vehicles.map((v: any) => {
            const slug = v.immatriculation ? encodeURIComponent(v.immatriculation.trim().replace(/\s+/g, "-")) : v.id;
            const isCurrent = pathname === `/dashboard/vehicles/${slug}` || pathname === `/dashboard/vehicles/${v.id}`;
            return (
              <Link
                key={v.id}
                href={`/dashboard/vehicles/${slug}`}
                title={`${v.marque} ${v.modele} (${v.immatriculation})`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  isCurrent
                    ? "bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/20"
                    : "hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Car className={`w-4 h-4 shrink-0 ${isCurrent ? "text-white" : "text-slate-500"}`} />
                {!isCollapsed && (
                  <span className="truncate">
                    {v.marque} {v.modele} <span className={`text-[10px] font-mono ${isCurrent ? "text-blue-100" : "text-slate-400"}`}>({v.immatriculation})</span>
                  </span>
                )}
              </Link>
            );
          })}

          {/* Section Services & Documents */}
          <div className="pt-3 pb-1">
            {!isCollapsed ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">
                Services IA & Coffre
              </span>
            ) : (
              <div className="w-full border-t border-slate-200 my-1" />
            )}
          </div>

          <Link
            href="/#scan-first"
            title="Scanner une facture (Geste 2)"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <Upload className="w-4 h-4 text-blue-600 shrink-0" />
            {!isCollapsed && <span className="truncate">Scanner une facture (Geste 2)</span>}
          </Link>

          {vehicles.length > 0 && (
            <Link
              href={`/v/${vehicles[0]?.id}`}
              target="_blank"
              title="Certificat Revente Public"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="truncate">Certificat Revente Public</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 ml-auto" />
                </>
              )}
            </Link>
          )}
        </nav>
      </div>

      {/* Bas de page sidebar */}
      {!isCollapsed ? (
        <div className="pt-4 border-t border-slate-100 space-y-2.5 animate-in fade-in">
          <div className="p-2.5 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-900">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Google Calendar</span>
            </div>
            <p className="text-[10px] text-slate-600 leading-tight">
              Synchronisé avec les agendas du foyer.
            </p>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>LaVigieAuto</span>
            <span className="text-emerald-600 font-bold">Synchronisé</span>
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t border-slate-100 flex flex-col items-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Synchronisé" />
        </div>
      )}
    </aside>
  );
}
