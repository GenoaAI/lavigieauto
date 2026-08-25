"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, LayoutList } from "lucide-react";

export type UiViewMode = "compact" | "complete";

const STORAGE_KEY = "lavigieauto_ui_mode";
const LEGACY_STORAGE_KEY = "autocare_ui_mode";

export function useUiViewMode(): [UiViewMode, (mode: UiViewMode) => void] {
  const [mode, setModeState] = useState<UiViewMode>("compact");

  useEffect(() => {
    try {
      const saved = (localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)) as UiViewMode | null;
      if (saved === "compact" || saved === "complete") {
        setModeState(saved);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setMode = (newMode: UiViewMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // Ignore localStorage errors
    }
  };

  return [mode, setMode];
}

interface UiModeSwitchProps {
  currentMode: UiViewMode;
  onModeChange: (mode: UiViewMode) => void;
  className?: string;
}

export function UiModeSwitch({ currentMode, onModeChange, className = "" }: UiModeSwitchProps) {
  return (
    <div
      className={`inline-flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-inner text-xs font-semibold ${className}`}
      role="group"
      aria-label="Mode d'affichage de l'interface"
    >
      <button
        type="button"
        onClick={() => onModeChange("compact")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
          currentMode === "compact"
            ? "bg-white text-blue-700 shadow-sm font-bold ring-1 ring-black/5"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        <span>Vue Épurée</span>
      </button>

      <button
        type="button"
        onClick={() => onModeChange("complete")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
          currentMode === "complete"
            ? "bg-white text-slate-900 shadow-sm font-bold ring-1 ring-black/5"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <LayoutList className="w-3.5 h-3.5 text-slate-600" />
        <span>Vue Complète</span>
      </button>
    </div>
  );
}
