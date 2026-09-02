"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { Upload, FileText, CheckCircle, AlertCircle, Sparkles, Loader2, Camera, FolderOpen, Trash2, ArrowRight } from "lucide-react";
import { processDocumentAction, ProcessDocumentResult, deleteDocumentAndRecalculateAction } from "@/app/actions/documents";

interface DocumentDropzoneProps {
  onExtractionSuccess?: (result: ProcessDocumentResult) => void;
  onUploadComplete?: () => void;
  vehicleId?: string;
  className?: string;
}

export function DocumentDropzone({ onExtractionSuccess, onUploadComplete, vehicleId, className = "" }: DocumentDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [lastProcessedDocId, setLastProcessedDocId] = useState<string | null>(null);
  const [lastProcessedVehicleId, setLastProcessedVehicleId] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    // Validate type
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp|heic)$/i)) {
      setError("Format non supporté. Veuillez déposer un PDF ou une image (JPG, PNG, WebP).");
      return;
    }

    setError(null);
    setFeedbackMessage(null);
    setIsProcessing(true);
    setProgressStep("Lecture et détection du document...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (vehicleId) formData.append("vehicleId", vehicleId);

      // Guess type from name
      const lowerName = file.name.toLowerCase();
      if (lowerName.includes("carte") || lowerName.includes("grise") || lowerName.includes("immat") || lowerName.includes("certificat_immat") || lowerName.includes("ci_")) {
        formData.append("documentType", "carte_grise");
      } else if (
        lowerName.includes("ct") ||
        lowerName.includes("controle") ||
        lowerName.includes("contrôle") ||
        lowerName.includes("technique") ||
        lowerName.includes("pv_") ||
        lowerName.includes("dekra") ||
        lowerName.includes("autosur") ||
        lowerName.includes("securitest") ||
        lowerName.includes("sécuritest") ||
        lowerName.includes("autovision") ||
        lowerName.includes("autocontrol") ||
        lowerName.includes("norisko")
      ) {
        formData.append("documentType", "controle_technique");
      } else {
        formData.append("documentType", "facture");
      }

      setProgressStep("Extraction visuelle par l'assistant en cours...");
      const result = await processDocumentAction(formData);

      if (result.success && result.extraction) {
        setProgressStep("Analyse terminée !");
        setExtractedData(result.extraction);
        setLastProcessedDocId(result.documentId || null);
        setLastProcessedVehicleId(result.vehicleId || vehicleId || null);
        if (onExtractionSuccess) {
          onExtractionSuccess(result);
        }
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        setError(result.error || "Échec de l'analyse du document.");
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'envoi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRollback = async () => {
    if (!lastProcessedDocId && !lastProcessedVehicleId) {
      setExtractedData(null);
      return;
    }

    if (!confirm("Voulez-vous annuler cet import et supprimer définitivement ce document ? Le carnet d'entretien et le kilométrage seront immédiatement restaurés.")) {
      return;
    }

    setIsRollingBack(true);
    try {
      const res = await deleteDocumentAndRecalculateAction({
        documentId: lastProcessedDocId || undefined,
        vehicleId: lastProcessedVehicleId || undefined,
      });

      if (res.success) {
        setExtractedData(null);
        setLastProcessedDocId(null);
        setFeedbackMessage("Import annulé et document supprimé. Le carnet et le kilométrage ont été restaurés.");
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        setError(res.error || "Erreur lors de l'annulation de l'import.");
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'annulation.");
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-10 text-center transition-all duration-200 ${
          isDragging
            ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
            : "border-slate-300 hover:border-slate-400 bg-white shadow-sm"
        }`}
      >
        {/* Input standard pour fichier/PDF */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
        />

        {/* Input caméra direct pour smartphone */}
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
            {isProcessing ? (
              <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin text-blue-600" />
            ) : (
              <Upload className="w-7 h-7 sm:w-8 sm:h-8" />
            )}
          </div>

          <div className="space-y-1 px-2">
            <p className="text-sm sm:text-base font-bold text-slate-800">
              {isProcessing
                ? progressStep
                : "Glissez ou photographiez votre Carte Grise, Facture ou PV de CT"}
            </p>
            <p className="text-[11.5px] sm:text-xs text-slate-500">
              PDF, JPG, PNG ou Photo smartphone • Analyse IA instantanée
            </p>
          </div>

          {/* Boutons d'action tactiles / mobile-first */}
          {!isProcessing && (
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition"
              >
                <Camera className="w-4 h-4" />
                <span>Prendre en photo (Smartphone)</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200"
              >
                <FolderOpen className="w-4 h-4 text-slate-500" />
                <span>Parcourir les fichiers / PDF</span>
              </button>
            </div>
          )}

          {!isProcessing && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Geste 2 Conducteur : scannez pour synchroniser, clôturer et recalculer</span>
            </div>
          )}
        </div>
      </div>

      {/* Message de succès ou d'annulation */}
      {feedbackMessage && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 flex items-center gap-3 text-xs font-medium">
          <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Erreur éventuelle */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 text-xs font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Résumé après extraction réussie avec bouton de suppression en cas de mauvais import */}
      {extractedData && (
        <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Document analysé et synchronisé avec succès</span>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {lastProcessedVehicleId && (
                <Link
                  href={`/dashboard/vehicles/${lastProcessedVehicleId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-sm transition"
                >
                  <span>Voir la fiche</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
                </Link>
              )}

              <button
                type="button"
                onClick={handleRollback}
                disabled={isRollingBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold shadow-sm transition disabled:opacity-60"
              >
                {isRollingBack ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                )}
                <span>Mauvais import ? Annuler</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/80 p-3 rounded-xl space-y-0.5">
              <span className="text-slate-500 font-semibold">Type de document :</span>
              <p className="font-bold text-slate-900">
                {extractedData.documentType === "carte_grise"
                  ? "Carte Grise Officielle (SIV)"
                  : extractedData.documentType === "controle_technique"
                  ? "Procès-Verbal Contrôle Technique"
                  : `Facture Atelier • ${extractedData.garage?.name || "Garage Partenaire"}`}
              </p>
            </div>
            <div className="bg-white/80 p-3 rounded-xl space-y-0.5">
              <span className="text-slate-500 font-semibold">Véhicule identifié :</span>
              <p className="font-bold text-slate-900">
                {extractedData.make || extractedData.vehicle?.make || "Véhicule"}{" "}
                {extractedData.model || extractedData.vehicle?.model || ""}{" "}
                <span className="font-mono text-slate-600">({extractedData.licensePlate || extractedData.vehicle?.licensePlate || ""})</span>
              </p>
            </div>
            <div className="bg-white/80 p-3 rounded-xl space-y-0.5">
              <span className="text-slate-500 font-semibold">
                {extractedData.documentType === "carte_grise"
                  ? "1ère mise en circulation :"
                  : extractedData.documentType === "controle_technique"
                  ? "Relevé kilométrique CT :"
                  : "Montant & Kilométrage :"}
              </span>
              <p className="font-bold text-slate-900">
                {extractedData.documentType === "carte_grise"
                  ? extractedData.firstRegistrationDate || "N/A"
                  : extractedData.documentType === "controle_technique"
                  ? `${(extractedData.currentMileage || 0).toLocaleString("fr-FR")} km`
                  : `${extractedData.invoice?.totalTTC ? `${extractedData.invoice.totalTTC.toFixed(2)} € TTC` : "Facturé"} • ${(extractedData.currentMileage || 0).toLocaleString("fr-FR")} km`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
