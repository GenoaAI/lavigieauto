"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Calendar,
  Download,
  ChevronDown,
  ExternalLink,
  Check,
  Sparkles,
  Info,
} from "lucide-react";
import {
  UniversalCalendarEvent,
  generateIcsContent,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateYahooCalendarUrl,
  downloadIcsFile,
} from "@/lib/calendar/universal-calendar";

interface UniversalCalendarDropdownProps {
  event?: UniversalCalendarEvent;
  events?: UniversalCalendarEvent[];
  buttonLabel?: string;
  variant?: "primary" | "secondary" | "outline" | "dark" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  filename?: string;
}

export function UniversalCalendarDropdown({
  event,
  events,
  buttonLabel = "Ajouter à l'agenda",
  variant = "primary",
  size = "md",
  className = "",
  filename = "entretien-vehicule",
}: UniversalCalendarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const targetEvents: UniversalCalendarEvent[] = events && events.length > 0
    ? events
    : event
    ? [event]
    : [];

  const primaryEvent: UniversalCalendarEvent | undefined = targetEvents[0];

  // Fermeture au clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleDownloadIcs = () => {
    if (targetEvents.length === 0) return;
    const icsString = generateIcsContent(targetEvents);
    downloadIcsFile(filename, icsString);
    setDownloadSuccess(true);
    setTimeout(() => {
      setDownloadSuccess(false);
      setIsOpen(false);
    }, 1200);
  };

  const handleOpenWebCalendar = (urlGenerator: (ev: UniversalCalendarEvent) => string) => {
    if (!primaryEvent) return;
    const url = urlGenerator(primaryEvent);
    window.open(url, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  // Styles de boutons
  const variantStyles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm border border-blue-500/30",
    secondary: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm",
    outline: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm",
    dark: "bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-sm",
    ghost: "text-slate-600 hover:bg-slate-100 border border-transparent",
  };

  const sizeStyles = {
    sm: "px-2.5 py-1.5 text-[11px] rounded-lg gap-1.5",
    md: "px-3.5 py-2 text-xs rounded-xl gap-2",
    lg: "px-4 py-2.5 text-sm rounded-xl gap-2.5",
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={targetEvents.length === 0}
        className={`inline-flex items-center justify-center font-bold transition active:scale-95 disabled:opacity-50 ${
          variantStyles[variant]
        } ${sizeStyles[size]}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Calendar className="w-3.5 h-3.5 shrink-0" />
        <span>{buttonLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Menu déroulant */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 z-50 mt-2 w-72 origin-top-left rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/10 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-2 border-b border-slate-100 mb-1">
            <p className="text-[10.5px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Choisir votre agenda :</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Fonctionne avec Yahoo, Outlook, Google, Apple...
            </p>
          </div>

          <div className="space-y-1">
            {/* Option 1 : Fichier .ics universel (Apple, Thunderbird, Outlook, Yahoo desktop) */}
            <button
              type="button"
              onClick={handleDownloadIcs}
              className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-900 transition group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 truncate">
                  <p className="font-bold text-xs truncate">Télécharger fichier .ics</p>
                  <p className="text-[10px] text-slate-500 truncate">Apple Calendar, Outlook, Yahoo...</p>
                </div>
              </div>
              {downloadSuccess ? (
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" /> Prêt
                </span>
              ) : (
                <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 shrink-0">
                  .ics
                </span>
              )}
            </button>

            {/* Option 2 : Google Calendar */}
            {primaryEvent && (
              <button
                type="button"
                onClick={() => handleOpenWebCalendar(generateGoogleCalendarUrl)}
                className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-semibold text-slate-800 hover:bg-red-50 hover:text-red-900 transition group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
                    </svg>
                  </div>
                  <div className="min-w-0 truncate">
                    <p className="font-bold text-xs truncate">Google Calendar</p>
                    <p className="text-[10px] text-slate-500 truncate">Ajout direct en ligne</p>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-red-600 shrink-0" />
              </button>
            )}

            {/* Option 3 : Microsoft Outlook / Office 365 */}
            {primaryEvent && (
              <button
                type="button"
                onClick={() => handleOpenWebCalendar(generateOutlookCalendarUrl)}
                className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-semibold text-slate-800 hover:bg-sky-50 hover:text-sky-900 transition group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 group-hover:bg-sky-600 group-hover:text-white transition">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 2H3c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H3V6h18v14z"/>
                    </svg>
                  </div>
                  <div className="min-w-0 truncate">
                    <p className="font-bold text-xs truncate">Outlook Web / Live</p>
                    <p className="text-[10px] text-slate-500 truncate">Microsoft 365 & Hotmail</p>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-sky-600 shrink-0" />
              </button>
            )}

            {/* Option 4 : Yahoo Mail & Calendar */}
            {primaryEvent && (
              <button
                type="button"
                onClick={() => handleOpenWebCalendar(generateYahooCalendarUrl)}
                className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-semibold text-slate-800 hover:bg-purple-50 hover:text-purple-900 transition group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-700 group-hover:text-white transition">
                    <span className="font-black text-[11px]">Y!</span>
                  </div>
                  <div className="min-w-0 truncate">
                    <p className="font-bold text-xs truncate">Yahoo Agenda</p>
                    <p className="text-[10px] text-slate-500 truncate">Yahoo Mail en ligne</p>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-purple-700 shrink-0" />
              </button>
            )}
          </div>

          <div className="pt-2 mt-1 border-t border-slate-100 px-2 flex items-center gap-1.5 text-[10px] text-slate-400">
            <Info className="w-3 h-3 shrink-0 text-slate-400" />
            <span>Rappels J-30 et J-7 inclus automatiquement</span>
          </div>
        </div>
      )}
    </div>
  );
}
