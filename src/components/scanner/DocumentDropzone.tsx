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

/**
 * Optimisation et compression côté client des photos prises par smartphone
 * Réduit les images de 10-20 Mo à ~400 Ko pour respecter la limite Vercel Serverless (4.5 Mo)
 * et accélérer l'envoi en 4G/5G par 10x sans perte de lisibilité pour l'OCR.
 */
async function optimizeImageForUpload(file: File): Promise<File> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return file;
  }

  if (typeof window === "undefined" || (!file.type.startsWith("image/") && !file.name.match(/\.(jpe?g|png|webp|heic)$/i))) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const MAX_DIM = 2048;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanName = file.name.replace(/\.[^.]+$/, ".jpg");
            const optimizedFile = new File([blob], cleanName, { type: "image/jpeg" });
            resolve(optimizedFile);
          },
          "image/jpeg",
          0.85
        );
      } catch {
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
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
    setProgressStep("Optimisation et lecture du document...");

    try {
      const fileToUpload = await optimizeImageForUpload(file);
      const formData = new FormData();
      formData.append("file", fileToUpload);
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
        className={`relative border-2 border-dashed rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 text-center transition-all duration-200 ${
          isDragging
            ? "border-blue-500 bg-blue-50/60 scale-[1.01] shadow-lg shadow-blue-500/10"
            : "border-slate-200/90 hover:border-blue-300 bg-slate-50/50 hover:bg-blue-50/20 shadow-xs"
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

        <div className="flex flex-col items-center justify-center space-y-2.5 sm:space-y-3.5">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white text-blue-600 flex items-center justify-center shadow-md shadow-slate-200/70 border border-slate-100">
            {isProcessing ? (
              <Loader2 className="w-5 h-5 sm:w-7 sm:h-7 animate-spin text-blue-600" />
            ) : (
              <Upload className="w-5 h-5 sm:w-7 sm:h-7" />
            )}
          </div>

          <div className="space-y-0.5 sm:space-y-1 px-2">
            <p className="text-xs sm:text-base font-bold text-slate-900 tracking-tight">
              {isProcessing
                ? progressStep
                : "Glissez ou photographiez votre document"}
            </p>
            <p className="text-[10.5px] sm:text-xs text-slate-500 font-normal">
              Carte grise, facture d&apos;entretien ou contrôle technique (PDF, JPG, PNG)
            </p>
          </div>

          {/* Boutons d'action tactiles / mobile-first */}
          {!isProcessing && (
            <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto pt-0.5 sm:pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/25 active:scale-95 transition"
              >
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">Prendre photo</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition border border-slate-200 shadow-2xs"
              >
                <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                <span className="truncate">Parcourir</span>
              </button>
            </div>
          )}

          {!isProcessing && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 text-slate-500 text-[11px] font-medium border border-slate-200/60 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Analyse instantanée et confidentielle • Aucun compte requis</span>
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
