"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Camera,
  Calendar,
  ShieldCheck,
  Plus,
  Car,
  FileText,
  X,
} from "lucide-react";
import { DocumentDropzone } from "@/components/scanner/DocumentDropzone";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const navItems = [
    {
      label: "Foyer",
      href: "/dashboard",
      icon: Home,
      isActive: pathname === "/dashboard",
    },
    {
      label: "Certificat",
      href: "/v/cert-demo-8492",
      icon: ShieldCheck,
      isActive: pathname.startsWith("/v/"),
    },
    {
      label: "Scanner",
      isAction: true,
      icon: Camera,
      onClick: () => setIsScannerOpen(true),
    },
    {
      label: "Agenda",
      href: "/dashboard#calendar-sync",
      icon: Calendar,
      isActive: false,
    },
    {
      label: "Accueil",
      href: "/",
      icon: Car,
      isActive: pathname === "/",
    },
  ];

  return (
    <>
      {/* Barre de navigation basse pour mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/90 px-3 py-2 shadow-2xl safe-area-inset-bottom">
        <nav className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item, idx) => {
            const Icon = item.icon;

            if (item.isAction) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={item.onClick}
                  className="flex flex-col items-center justify-center -mt-7 group focus:outline-none focus:ring-0"
                  aria-label="Scanner un document"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-blue-600/40 group-active:scale-95 transition-all duration-200 border-4 border-white">
                    <Camera className="w-7 h-7 stroke-[2.2]" />
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 mt-1 tracking-tight">
                    {item.label}
                  </span>
                </button>
              );
            }

            const isActive = item.isActive;

            return (
              <Link
                key={idx}
                href={item.href || "#"}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition min-w-[54px] ${
                  isActive
                    ? "text-blue-600 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
                <span className="text-[10.5px] mt-1 font-medium truncate">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tiroir / Bottom Sheet de Scan Rapide sur Mobile */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full bg-white rounded-t-3xl p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Scanner un Justificatif (Geste 2)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Carte Grise, Facture ou Contrôle Technique
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <DocumentDropzone
              onUploadComplete={() => {
                setTimeout(() => setIsScannerOpen(false), 1200);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
