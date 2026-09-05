"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Wrench,
  X,
  Loader2,
  Calendar,
  Gauge,
  Euro,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Tag,
  FileCheck,
  Info,
} from "lucide-react";
import { addManualMaintenanceAction } from "@/app/actions/vehicles";

export interface ManualMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: {
    id: string;
    marque?: string | null;
    modele?: string | null;
    immatriculation?: string | null;
    kilometrage_actuel?: number | null;
  } | null;
  initialMilestone?: {
    id?: string;
    libelle?: string;
    type_echeance?: string;
    pieces_recommandees?: string | string[];
    cout_estime_max?: number;
    km_preconise?: number;
    date_preconisee?: string;
  } | null;
  onSuccess?: () => void;
}

const COMMON_PRESETS = [
  { label: "Vidange huile moteur & filtre", category: "moteur" },
  { label: "Remplacement filtre d'habitacle", category: "climatisation" },
  { label: "Remplacement filtre à air", category: "moteur" },
  { label: "Remplacement filtre à carburant", category: "moteur" },
  { label: "Plaquettes de frein avant", category: "freinage" },
  { label: "Disques & plaquettes avant", category: "freinage" },
  { label: "Purge liquide de frein", category: "freinage" },
  { label: "Remplacement bougies d'allumage", category: "moteur" },
  { label: "Remplacement batterie 12V", category: "electricite" },
  { label: "Balais d'essuie-glace", category: "visibilite" },
  { label: "Autre intervention", category: "autre" },
];

export function ManualMaintenanceModal({
  isOpen,
  onClose,
  vehicle,
  initialMilestone,
  onSuccess,
}: ManualMaintenanceModalProps) {
  const [operation, setOperation] = useState("");
  const [category, setCategory] = useState("moteur");
  const [dateIntervention, setDateIntervention] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [kilometrage, setKilometrage] = useState<number | string>("");
  const [coutTTC, setCoutTTC] = useState<string>("");
  const [referencePiece, setReferencePiece] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialisation lors de l'ouverture
  useEffect(() => {
    if (isOpen && vehicle) {
      setError(null);
      setSuccessNotice(null);
      setSelectedFile(null);
      setDateIntervention(new Date().toISOString().split("T")[0]);
      setKilometrage(vehicle.kilometrage_actuel || "");

      if (initialMilestone) {
        setOperation(initialMilestone.libelle || "");

        // Détection de la catégorie
        const lib = (initialMilestone.libelle || "").toLowerCase();
        const typeEch = (initialMilestone.type_echeance || "").toLowerCase();

        if (lib.includes("vidange") || typeEch.includes("revision") || lib.includes("moteur")) {
          setCategory("moteur");
        } else if (lib.includes("habitacle") || lib.includes("pollen") || typeEch.includes("habitacle")) {
          setCategory("climatisation");
        } else if (lib.includes("frein") || typeEch.includes("frein")) {
          setCategory("freinage");
        } else if (lib.includes("bougie")) {
          setCategory("moteur");
        } else if (lib.includes("batterie")) {
          setCategory("electricite");
        } else if (lib.includes("courroie") || lib.includes("distribution")) {
          setCategory("distribution");
        } else if (lib.includes("pneu") || lib.includes("pneumatique")) {
          setCategory("pneumatiques");
        } else {
          setCategory("autre");
        }

        // Pré-remplissage des pièces recommandées si disponibles
        if (initialMilestone.pieces_recommandees) {
          const pieces = Array.isArray(initialMilestone.pieces_recommandees)
            ? initialMilestone.pieces_recommandees.join(", ")
            : initialMilestone.pieces_recommandees;
          setReferencePiece(pieces);
        } else {
          setReferencePiece("");
        }

        setCoutTTC("");
        setNotes("");
      } else {
        setOperation("Vidange huile moteur & filtre");
        setCategory("moteur");
        setReferencePiece("");
        setCoutTTC("");
        setNotes("");
      }
    }
  }, [isOpen, vehicle, initialMilestone]);

  if (!isOpen || !vehicle) return null;

  const handlePresetClick = (preset: { label: string; category: string }) => {
    setOperation(preset.label);
    setCategory(preset.category);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setError("Le fichier dépasse la limite maximale autorisée de 15 Mo.");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operation.trim()) {
      setError("Veuillez préciser le nom de l'opération.");
      return;
    }

    const kmNumber = Number(kilometrage);
    if (isNaN(kmNumber) || kmNumber < 0) {
      setError("Veuillez saisir un kilométrage valide.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("vehicleId", vehicle.id);
      formData.append("operation", operation.trim());
      formData.append("category", category);
      formData.append("dateIntervention", dateIntervention);
      formData.append("kilometrage", String(kmNumber));

      if (coutTTC && !isNaN(Number(coutTTC))) {
        formData.append("coutTTC", String(Number(coutTTC)));
      }
      if (referencePiece.trim()) {
        formData.append("referencePiece", referencePiece.trim());
      }
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }
      if (initialMilestone?.id) {
        formData.append("milestoneId", initialMilestone.id);
      }
      if (selectedFile) {
        formData.append("receiptFile", selectedFile);
      }

      const res = await addManualMaintenanceAction(formData);

      if (res.success) {
        setSuccessNotice("Opération consignée avec succès dans votre carnet d'entretien !");
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1000);
      } else {
        setError(res.error || "Impossible d'enregistrer l'opération.");
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-slate-50 to-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-inner">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                  J'ai fait cet entretien
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  DIY
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Consignez l'intervention sur votre{" "}
                <span className="font-bold text-slate-700">
                  {vehicle.marque} {vehicle.modele}
                </span>{" "}
                ({vehicle.immatriculation})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENU DU FORMULAIRE */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="font-medium text-[11px] leading-relaxed">{error}</p>
            </div>
          )}

          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="font-bold text-[11px]">{successNotice}</p>
            </div>
          )}

          {/* Raccourcis d'opérations courantes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Opérations courantes
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_PRESETS.slice(0, 6).map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${
                    operation === preset.label
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Intitulé de l'opération & Catégorie */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="block font-bold text-slate-800">
                Nom de l'opération <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={operation}
                  onChange={(e) => setOperation(e.target.value)}
                  placeholder="Ex : Vidange huile moteur & filtre"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-800">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
              >
                <option value="moteur">Moteur / Révision</option>
                <option value="climatisation">Climatisation / Habitacle</option>
                <option value="freinage">Freinage</option>
                <option value="pneumatiques">Pneumatiques</option>
                <option value="electricite">Électricité / Batterie</option>
                <option value="distribution">Distribution</option>
                <option value="visibilite">Visibilité / Essuie-glaces</option>
                <option value="liaison_au_sol">Liaison au sol / Amortisseurs</option>
                <option value="transmission">Transmission / Boîte</option>
                <option value="autre">Autre intervention</option>
              </select>
            </div>
          </div>

          {/* Date & Kilométrage */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date de réalisation</span> <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={dateIntervention}
                onChange={(e) => setDateIntervention(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                <span>Kilométrage au compteur</span> <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={kilometrage}
                onChange={(e) => setKilometrage(e.target.value)}
                placeholder="Ex : 85400"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
              />
              <p className="text-[10px] text-slate-400">
                Dernier relevé : {(vehicle.kilometrage_actuel || 0).toLocaleString("fr-FR")} km
              </p>
            </div>
          </div>

          {/* Coût des pièces & Références */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                <Euro className="w-3.5 h-3.5 text-slate-400" />
                <span>Coût des pièces (€ TTC)</span>
                <span className="text-slate-400 font-normal">(Optionnel)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={coutTTC}
                onChange={(e) => setCoutTTC(e.target.value)}
                placeholder="Ex : 49.90"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Marques & Réf. pièces</span>
                <span className="text-slate-400 font-normal">(Optionnel)</span>
              </label>
              <input
                type="text"
                value={referencePiece}
                onChange={(e) => setReferencePiece(e.target.value)}
                placeholder="Ex : Huile Castrol 5W30, Purflux L358A"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
              />
            </div>
          </div>

          {/* Upload Facture / Justificatif d'achat (Optionnel) */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Facture d'achat ou ticket de caisse</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Optionnel (PDF, JPG, PNG)</span>
            </label>

            {selectedFile ? (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {(selectedFile.size / 1024).toFixed(0)} Ko - Prêt pour le coffre-fort
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                >
                  Supprimer
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-dashed border-slate-300 rounded-xl cursor-pointer transition flex items-center justify-center gap-2 text-slate-600"
              >
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium">
                  Cliquez pour joindre la facture des pièces (Oscaro, Norauto, magasin...)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Notes complémentaires */}
          <div className="space-y-1">
            <label className="block font-bold text-slate-800">
              Notes & observations <span className="text-slate-400 font-normal">(Optionnel)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : Joint de vidange changé, niveau vérifié à froid."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition resize-none"
            />
          </div>

          {/* Explication de l'impact */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5 text-slate-600">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              La validation de cette intervention actualisera automatiquement votre relevé kilométrique, repoussera l'échéance constructeur correspondante et ajoutera un badge officiel{" "}
              <strong>"Réalisé par le propriétaire"</strong> dans votre carnet d'entretien.
            </p>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition active:scale-95"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/20 transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valider cet entretien</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
