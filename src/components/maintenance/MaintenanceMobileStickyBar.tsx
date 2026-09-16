"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FileDown, Bell } from "lucide-react";
import { recordMicroConversionAction } from "@/app/actions/analytics";

export interface MaintenanceMobileStickyBarProps {
  brand: string;
  model: string;
  engine: string;
  brandSlug?: string;
  modelSlug?: string;
  engineSlug?: string;
  onDownloadPdf?: () => void;
  targetEstimatorId?: string;
}

export function MaintenanceMobileStickyBar({
  brand,
  model,
  engine,
  brandSlug,
  modelSlug,
  engineSlug,
  onDownloadPdf,
  targetEstimatorId = "rappel-revision",
}: MaintenanceMobileStickyBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const resolvedBrand = brandSlug || brand;
  const resolvedModel = modelSlug || model;
  const resolvedEngine = engineSlug || engine || "";

  // 1. Détection intelligente du scroll (> 280px pour dépasser le hero initial)
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          setIsVisible(scrollY > 280);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Exécution initiale pour ajuster selon l'état actuel de défilement
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 2. Prévention des collisions avec le clavier virtuel et champs de saisie
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      setIsKeyboardOpen(false);
    };

    // Détection complémentaire via l'API VisualViewport (iOS Safari & Android Chrome)
    const handleViewportResize = () => {
      if (window.visualViewport) {
        const isShrunk = window.visualViewport.height < window.innerHeight * 0.75;
        setIsKeyboardOpen(isShrunk);
      }
    };

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
    }

    return () => {
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportResize);
      }
    };
  }, []);

  // 3. Gestionnaire CTA Carnet PDF
  const handlePdfClick = useCallback(() => {
    try {
      recordMicroConversionAction({
        eventType: "pdf_download_print",
        brand: resolvedBrand,
        model: resolvedModel,
        engine: resolvedEngine,
        url: typeof window !== "undefined" ? window.location.pathname : undefined,
        metadata: { trigger: "mobile_sticky_bar" },
      }).catch(() => {});
    } catch {
      // Tolérance non bloquante
    }

    if (onDownloadPdf) {
      onDownloadPdf();
    } else if (typeof window !== "undefined") {
      window.print();
    }
  }, [onDownloadPdf, resolvedBrand, resolvedModel, resolvedEngine]);

  // 4. Gestionnaire CTA Alerte Révision (Smooth Scroll & Flash Highlight)
  const handleAlertClick = useCallback(() => {
    try {
      recordMicroConversionAction({
        eventType: "lead_magnet_cta_click",
        brand: resolvedBrand,
        model: resolvedModel,
        engine: resolvedEngine,
        url: typeof window !== "undefined" ? window.location.pathname : undefined,
        metadata: { trigger: "mobile_sticky_bar" },
      }).catch(() => {});
    } catch {
      // Tolérance non bloquante
    }

    const target = document.getElementById(targetEstimatorId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });

      // Effet visuel d'accompagnement (focus ring temporaire)
      target.classList.add("ring-4", "ring-blue-500/40", "transition-all", "duration-500");
      setTimeout(() => {
        target.classList.remove("ring-4", "ring-blue-500/40");
      }, 2000);

      // Focus sur le premier champ de saisie de l'estimateur si présent
      const input = target.querySelector("input");
      if (input) {
        setTimeout(() => input.focus(), 600);
      }
    }
  }, [targetEstimatorId, resolvedBrand, resolvedModel, resolvedEngine]);

  // Masquage si le scroll est insuffisant ou si le clavier est actif
  const shouldShow = isVisible && !isKeyboardOpen;

  return (
    <aside
      aria-label="Actions rapides pour cette fiche d'entretien"
      className={`fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-6 sm:right-6 max-w-lg sm:mx-auto z-30 md:hidden transition-all duration-300 ease-out print:hidden ${
        shouldShow
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-6 opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xl flex items-center gap-2">
        {/* CTA 1 : Télécharger / Imprimer le carnet PDF */}
        <button
          type="button"
          onClick={handlePdfClick}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition active:scale-95 touch-manipulation min-h-[44px] cursor-pointer"
          title="Télécharger ou imprimer la fiche officielle en PDF"
        >
          <FileDown className="w-4 h-4 text-slate-600 shrink-0" />
          <span className="truncate">📥 Carnet PDF</span>
        </button>

        {/* CTA 2 : Alerte Révision (Lead Magnet) */}
        <button
          type="button"
          onClick={handleAlertClick}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition active:scale-95 touch-manipulation min-h-[44px] cursor-pointer"
          title="Calculer ma prochaine échéance et recevoir l'alerte à J-30"
        >
          <Bell className="w-4 h-4 text-white shrink-0 animate-bounce-subtle" />
          <span className="truncate">🔔 Alerte Révision</span>
        </button>
      </div>
    </aside>
  );
}
