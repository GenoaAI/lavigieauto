"use client";

import React, { useState, useEffect } from "react";
import { Edit3, X, Loader2, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";
import { updateVehicleDetailsAction } from "@/app/actions/vehicles";

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: {
    id: string;
    marque?: string | null;
    modele?: string | null;
    version?: string | null;
    immatriculation?: string | null;
    annee_mise_en_circulation?: number | null;
    energie?: string | null;
    km_annuel_moyen?: number | null;
  } | null;
  onSuccess?: () => void;
}

const POPULAR_BRANDS = [
  "RENAULT",
  "PEUGEOT",
  "CITROËN",
  "SUZUKI",
  "VOLKSWAGEN",
  "TOYOTA",
  "DACIA",
  "FORD",
  "FIAT",
  "HYUNDAI",
  "KIA",
  "BMW",
  "MERCEDES-BENZ",
  "AUDI",
  "NISSAN",
  "OPEL",
  "SEAT",
  "SKODA",
];

const FUEL_TYPES = [
  { value: "essence", label: "Essence (SP95 / SP98 / E10)" },
  { value: "diesel", label: "Diesel / Gazole (dCi, BlueHDi, TDI...)" },
  { value: "hybride", label: "Hybride (Full Hybrid / PHEV)" },
  { value: "electrique", label: "100% Électrique" },
];

export function EditVehicleModal({
  isOpen,
  onClose,
  vehicle,
  onSuccess,
}: EditVehicleModalProps) {
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [version, setVersion] = useState("");
  const [immatriculation, setImmatriculation] = useState("");
  const [annee, setAnnee] = useState<number | string>(2020);
  const [energie, setEnergie] = useState("essence");
  const [kmAnnuel, setKmAnnuel] = useState<number | string>(12000);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) {
      setMarque(vehicle.marque || "");
      setModele(vehicle.modele || "");
      setVersion(vehicle.version || "");
      setImmatriculation(vehicle.immatriculation || "");
      setAnnee(vehicle.annee_mise_en_circulation || 2020);
      setEnergie(vehicle.energie ? vehicle.energie.toLowerCase() : "essence");
      setKmAnnuel(vehicle.km_annuel_moyen || 12000);
      setError(null);
    }
  }, [vehicle, isOpen]);

  if (!isOpen || !vehicle) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marque.trim() || !modele.trim()) {
      setError("La marque et le modèle sont obligatoires.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await updateVehicleDetailsAction(vehicle.id, {
        marque: marque.trim(),
        modele: modele.trim(),
        version: version.trim() || undefined,
        immatriculation: immatriculation.trim().toUpperCase() || undefined,
        annee_mise_en_circulation: annee ? Number(annee) : undefined,
        energie: energie || undefined,
        km_annuel_moyen: kmAnnuel ? Number(kmAnnuel) : undefined,
      });

      if (res.success) {
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || "Impossible de mettre à jour le véhicule.");
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Modifier la fiche du véhicule
              </h3>
              <p className="text-xs text-slate-500">
                Corrigez la marque, le modèle, la plaque et la motorisation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Marque & Modèle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-bold text-slate-700">
                Marque <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={marque}
                onChange={(e) => setMarque(e.target.value.toUpperCase())}
                placeholder="Ex: RENAULT, PEUGEOT..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-semibold text-slate-900 bg-white"
                list="popular-brands-list"
              />
              <datalist id="popular-brands-list">
                {POPULAR_BRANDS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">
                Modèle <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={modele}
                onChange={(e) => setModele(e.target.value)}
                placeholder="Ex: Clio, 208, Vitara..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-semibold text-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Immatriculation & Année */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-bold text-slate-700">
                Immatriculation (Plaque)
              </label>
              <input
                type="text"
                value={immatriculation}
                onChange={(e) => setImmatriculation(e.target.value.toUpperCase())}
                placeholder="Ex: CS-318-YD"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono font-bold text-slate-900 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">
                Année de mise en circulation
              </label>
              <input
                type="number"
                min="1950"
                max="2030"
                value={annee}
                onChange={(e) => setAnnee(e.target.value)}
                placeholder="Ex: 2013"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-semibold text-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Version / Motorisation */}
          <div className="space-y-1">
            <label className="block font-bold text-slate-700">
              Version / Finition / Motorisation
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="Ex: 1.2 16V 75 ch Authentique, 1.5 Blue dCi 100 ch..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium text-slate-900 bg-white"
            />
          </div>

          {/* Énergie & Rythme annuel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-bold text-slate-700">
                Carburant / Énergie
              </label>
              <select
                value={energie}
                onChange={(e) => setEnergie(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium text-slate-900 bg-white"
              >
                {FUEL_TYPES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">
                Rythme estimé (km/an)
              </label>
              <input
                type="number"
                step="500"
                min="1000"
                max="100000"
                value={kmAnnuel}
                onChange={(e) => setKmAnnuel(e.target.value)}
                placeholder="12000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-semibold text-slate-900 bg-white"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/60 text-blue-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11.5px] leading-relaxed">
              <strong>Synchronisation automatique :</strong> Le changement de marque ou de modèle recalcule immédiatement l'échéancier constructeur officiel (intervalles de vidange, distribution, filtres) et associe la photo officielle du modèle.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Enregistrer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
