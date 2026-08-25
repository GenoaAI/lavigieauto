"use client";

import React, { useState } from "react";
import { Phone, Copy, Check, X, ShieldAlert, Wrench, Calendar, Sparkles } from "lucide-react";
import type { ReservationKit } from "@/lib/engine/reservation-kit";

interface ReservationKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  kit: ReservationKit;
  garagePhoneNumber?: string;
  garageName?: string;
}

export function ReservationKitModal({
  isOpen,
  onClose,
  kit,
  garagePhoneNumber = "01 40 00 00 00",
  garageName = "Garage Recommandé / Habituel",
}: ReservationKitModalProps) {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!isOpen) return null;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(kit.phoneScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(`${kit.emailTemplate.subject}\n\n${kit.emailTemplate.body}`);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full p-5 sm:p-8 space-y-5 sm:space-y-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 relative">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4">
          <div className="pr-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold mb-1.5">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Geste 1 : Kit Prêt-à-Réserver</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              Réservation — {kit.vehicleSummary.makeModel}
            </h2>
            <p className="text-[11.5px] text-slate-500 mt-0.5">
              Plaque : <span className="font-mono font-bold text-slate-700">{kit.vehicleSummary.licensePlate}</span> • Préconisations constructeur certifiées
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Directe Appel Garage */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-blue-500/20">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-xs font-medium text-blue-100 uppercase tracking-wider">Contact Direct Garage</p>
            <p className="text-lg font-bold">{garageName}</p>
            <p className="text-sm text-blue-100">{garagePhoneNumber}</p>
          </div>
          <a
            href={`tel:${garagePhoneNumber.replace(/\s+/g, "")}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-blue-600 rounded-xl font-semibold shadow hover:bg-blue-50 transition active:scale-95 text-sm"
          >
            <Phone className="w-4 h-4" />
            Appeler le garage en 1 clic
          </a>
        </div>

        {/* Script Téléphonique & SMS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Script verbal à lire ou SMS prêt à envoyer :</h3>
            <button
              onClick={handleCopyScript}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium px-2.5 py-1 rounded-md hover:bg-blue-50 transition"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedScript ? "Copié !" : "Copier le script"}
            </button>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-700 leading-relaxed select-all">
            {kit.phoneScript}
          </div>
        </div>

        {/* Opérations détaillées */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Interventions exactes à exiger :</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {kit.interventionsToRequest.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs"
              >
                <div className="flex items-start gap-2">
                  <Wrench className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">{item.title}</span>
                    {item.specificationDetails && (
                      <p className="text-slate-500 mt-0.5 text-[11px]">{item.specificationDetails}</p>
                    )}
                  </div>
                </div>
                <span className="font-medium text-slate-700 whitespace-nowrap ml-2">~{item.estimatedBudgetEur} €</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vulgarisation Défauts CT si présents */}
        {kit.popularizedDefects && kit.popularizedDefects.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Corrections Contrôle Technique traduites en français clair :
            </h3>
            <div className="space-y-2">
              {kit.popularizedDefects.map((def, idx) => (
                <div key={idx} className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-amber-900">{def.plainLanguageTitle}</p>
                  <p className="text-amber-800 text-[11px]">{def.plainLanguageExplanation}</p>
                  <p className="text-amber-700 font-semibold text-[11px]">Action : {def.recommendedAction}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer & Actions Calendrier */}
        <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                `🚗 [LaVigieAuto] Entretien atelier — ${kit.vehicleSummary.makeModel} (${kit.vehicleSummary.licensePlate})`
              )}&details=${encodeURIComponent(
                `🚗 ENTRETIEN VÉHICULE GROUPÉ LAVIGIEAUTO\n\nVéhicule : ${kit.vehicleSummary.makeModel} (${kit.vehicleSummary.licensePlate})\n\n📋 OPÉRATIONS À EFFECTUER :\n${kit.interventionsToRequest.map((i, idx) => `${idx + 1}. ${i.title}`).join("\n")}\n\n📞 SCRIPT D'APPEL GARAGE :\n${kit.phoneScript}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition w-full sm:w-auto border border-blue-200 shadow-sm"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              📅 Ajouter à Google Calendar
            </a>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition w-full sm:w-auto"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
