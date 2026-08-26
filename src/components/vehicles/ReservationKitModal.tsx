"use client";

import React, { useState } from "react";
import {
  Phone,
  Copy,
  Check,
  X,
  ShieldAlert,
  Wrench,
  Sparkles,
  MapPin,
  ExternalLink,
  Mail,
  Building2,
  ChevronDown,
  Star,
  Award,
} from "lucide-react";
import type { ReservationKit } from "@/lib/engine/reservation-kit";
import type { EnrichedGarage } from "@/lib/engine/garage-resolver";

interface ReservationKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  kit: ReservationKit;
  recommendedGarage?: EnrichedGarage | null;
  availableGarages?: EnrichedGarage[];
  garagePhoneNumber?: string;
  garageName?: string;
  garageAddress?: string;
  garageEmail?: string;
}

export function ReservationKitModal({
  isOpen,
  onClose,
  kit,
  recommendedGarage,
  availableGarages = [],
  garagePhoneNumber,
  garageName,
  garageAddress,
  garageEmail,
}: ReservationKitModalProps) {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showGaragePicker, setShowGaragePicker] = useState(false);

  // Initialisation du garage sélectionné
  const initialGarage = recommendedGarage || (availableGarages.length > 0 ? availableGarages[0] : null);
  const [selectedGarage, setSelectedGarage] = useState<EnrichedGarage | null>(initialGarage);
  const [customPhone, setCustomPhone] = useState(
    initialGarage?.telephone || garagePhoneNumber || ""
  );

  if (!isOpen) return null;

  const currentGarageName = selectedGarage?.nom || garageName || "Votre Atelier Habituel ou Agréé";
  const currentGaragePhone = (selectedGarage?.telephone || customPhone || garagePhoneNumber || "").trim();
  const currentGarageAddress = selectedGarage?.adresse || garageAddress || "";
  const currentGarageEmail = selectedGarage?.email || garageEmail || "";
  const currentGarageBrand = selectedGarage?.marque || "";
  const currentReason = selectedGarage?.reason;

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

  const googleMapsQuery = currentGarageAddress
    ? `${currentGarageName} ${currentGarageAddress}`
    : `${currentGarageName} ${kit.vehicleSummary.makeModel}`;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleMapsQuery)}`;

  const mailtoUrl = `mailto:${currentGarageEmail}?subject=${encodeURIComponent(
    kit.emailTemplate.subject
  )}&body=${encodeURIComponent(kit.emailTemplate.body)}`;

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

        {/* Action Directe Contact Garage */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-lg shadow-blue-950/20 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">Atelier & Prise de Rendez-Vous</p>
                {currentReason && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-400/30">
                    <Star className="w-3 h-3 fill-emerald-300 text-emerald-300" />
                    {currentReason}
                  </span>
                )}
                {currentGarageBrand && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-[10px] font-medium border border-blue-400/30">
                    <Award className="w-3 h-3 text-blue-300" />
                    {currentGarageBrand}
                  </span>
                )}
              </div>

              <p className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-300 shrink-0" />
                <span>{currentGarageName}</span>
              </p>

              {currentGarageAddress && (
                <p className="text-xs text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                  <span>{currentGarageAddress}</span>
                </p>
              )}

              {currentGaragePhone ? (
                <p className="text-xs text-blue-200 font-mono flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-blue-300 shrink-0" />
                  <span>{currentGaragePhone}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-300">Numéro non renseigné pour cet atelier</p>
              )}
            </div>

            {/* Sélecteur d'ateliers si plusieurs disponibles */}
            {availableGarages.length > 1 && (
              <button
                onClick={() => setShowGaragePicker(!showGaragePicker)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-blue-100 rounded-lg text-xs font-medium transition shrink-0"
              >
                <span>Changer d&apos;atelier</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showGaragePicker ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>

          {/* Liste déroulante des garages */}
          {showGaragePicker && availableGarages.length > 1 && (
            <div className="bg-slate-800/95 border border-slate-700 rounded-xl p-2 space-y-1 animate-in fade-in-50 duration-150">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Ateliers répertoriés dans votre carnet d&apos;entretien :
              </p>
              {availableGarages.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGarage(g);
                    if (g.telephone) setCustomPhone(g.telephone);
                    setShowGaragePicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                    selectedGarage?.id === g.id
                      ? "bg-blue-600 text-white font-bold"
                      : "text-slate-200 hover:bg-slate-700/60"
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="font-semibold truncate">{g.nom}</p>
                    <p className="text-[11px] opacity-80 truncate">
                      {g.telephone ? `📞 ${g.telephone}` : "Sans numéro"} • {g.reason || g.marque || "Atelier"}
                    </p>
                  </div>
                  {selectedGarage?.id === g.id && <Check className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* Actions Rapides Contact */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
            {currentGaragePhone ? (
              <a
                href={`tel:${currentGaragePhone.replace(/\s+/g, "")}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow transition active:scale-95 text-xs flex-1 sm:flex-initial"
              >
                <Phone className="w-4 h-4" />
                Appeler l&apos;atelier
              </a>
            ) : (
              <div className="flex items-center gap-1 flex-1 sm:flex-initial">
                <input
                  type="tel"
                  placeholder="Saisir n° téléphone..."
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                {customPhone && (
                  <a
                    href={`tel:${customPhone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center justify-center p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition text-xs"
                    title="Appeler"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}

            {currentGarageEmail && (
              <a
                href={mailtoUrl}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-semibold transition active:scale-95 text-xs"
                title="Envoyer un email"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-300" />
                <span>Envoyer devis par Email</span>
              </a>
            )}

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-semibold transition active:scale-95 text-xs"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-300" />
              <span>Itinéraire Maps</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
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
                  <p className="text-slate-700 text-[11px] leading-relaxed">{def.plainLanguageExplanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <button
            onClick={handleCopyEmail}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition text-xs"
          >
            {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Mail className="w-3.5 h-3.5" />}
            {copiedEmail ? "Modèle email copié !" : "Copier le modèle d'email"}
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition text-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
