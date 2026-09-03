"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Camera,
  Calendar,
  ShieldCheck,
  Car,
  X,
  BookOpen,
} from "lucide-react";
import { DocumentDropzone } from "@/components/scanner/DocumentDropzone";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
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
      label: "Entretien",
      href: "/entretien",
      icon: BookOpen,
      isActive: pathname.startsWith("/entretien"),
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
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/90 px-2 sm:px-4 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] shadow-[0_-8px_25px_rgba(0,0,0,0.08)] min-h-[70px]">
        <nav
          role="navigation"
          aria-label="Navigation principale mobile"
          className="flex items-center justify-around max-w-md mx-auto relative"
        >
          {navItems.map((item, idx) => {
            const Icon = item.icon;

            if (item.isAction) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={item.onClick}
                  className="flex flex-col items-center justify-center -mt-8 group focus:outline-none focus:ring-0 min-w-[56px] min-h-[56px] touch-manipulation cursor-pointer"
                  aria-label="Scanner un document"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-blue-600/40 group-hover:scale-105 group-active:scale-95 transition-all duration-200 border-4 border-white ring-4 ring-blue-500/25">
                    <Camera className="w-7 h-7 stroke-[2.4]" />
                  </div>
                  <span className="text-xs font-extrabold text-blue-600 mt-1 tracking-tight leading-tight">
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
                prefetch={true}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-xl transition-all duration-150 min-w-[48px] min-h-[48px] touch-manipulation active:scale-95 ${
                  isActive
                    ? "text-blue-600 font-bold bg-blue-50/90 shadow-sm shadow-blue-500/10"
                    : "text-slate-700 hover:text-slate-950 hover:bg-slate-100/70 font-semibold"
                }`}
              >
                <Icon
                  className={`w-6 h-6 transition-transform ${
                    isActive ? "stroke-[2.3] scale-105 text-blue-600" : "stroke-[1.9] text-slate-700"
                  }`}
                />
                <span className="text-xs mt-1 font-semibold truncate leading-tight tracking-tight">
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
            className="w-full bg-white rounded-t-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
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
                router.refresh();
              }}
              onExtractionSuccess={() => {
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
