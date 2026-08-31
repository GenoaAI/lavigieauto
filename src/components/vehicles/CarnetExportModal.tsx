"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Printer,
  Share2,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  FolderArchive,
  Loader2,
  X,
  Award,
  Sparkles,
} from "lucide-react";

interface CarnetExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  make: string;
  model: string;
  licensePlate: string;
  currentMileage: number;
  documentsCount: number;
  healthScore?: number;
  grade?: string;
  isPublic?: boolean;
}

export function CarnetExportModal({
  isOpen,
  onClose,
  vehicleId,
  make,
  model,
  licensePlate,
  currentMileage,
  documentsCount,
  healthScore = 95,
  grade = "A+",
  isPublic = false,
}: CarnetExportModalProps) {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const targetCarnetUrl = isPublic
    ? `/v/${encodeURIComponent(vehicleId)}/carnet`
    : `/dashboard/vehicles/${encodeURIComponent(vehicleId)}/carnet`;

  const handleDownloadZip = () => {
    setDownloadingZip(true);
    const downloadUrl = `/api/vehicles/${encodeURIComponent(vehicleId)}/export-archive`;
    
    // Déclenchement du téléchargement navigateur
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `dossier_entretien_${licensePlate.replace(/[^A-Z0-9]/gi, "_")}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setDownloadingZip(false);
    }, 2000);
  };

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/v/${encodeURIComponent(vehicleId)}/carnet`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* EN-TÊTE MODALE */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400 border border-white/10 shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Carnet d'Entretien Officiel</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold">
                  Certifié
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                {make} {model} • <strong className="text-white">{licensePlate}</strong> • {currentMileage.toLocaleString("fr-FR")} km
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPS & OPTIONS D'EXPORT */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* BADGE DE CONFORMITÉ */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="text-emerald-950 font-bold block text-sm">
                  Dossier certifié LaVigieAuto ({healthScore}% • Note {grade})
                </strong>
                <span className="text-emerald-800 text-[11px]">
                  {documentsCount} justificatif{documentsCount > 1 ? "s" : ""} scellé{documentsCount > 1 ? "s" : ""} dans le coffre-fort avec empreinte SHA-256.
                </span>
              </div>
            </div>
            <div className="px-3 py-1 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-sm">
              {grade}
            </div>
          </div>

          <div className="space-y-3">
            {/* OPTION 1 : LIVRET PDF A4 IMPRIMABLE */}
            <Link
              href={targetCarnetUrl}
              target="_blank"
              onClick={onClose}
              className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition group shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition">
                    Livret Officiel PDF A4 (Prêt à imprimer)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Ouvre le carnet mis en page pour impression et sauvegarde PDF avec synthèse complète.
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
            </Link>

            {/* OPTION 2 : PACK ARCHIVE ZIP TOUTES FACTURES */}
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition group shadow-sm text-left disabled:opacity-60"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  {downloadingZip ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FolderArchive className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition">
                    Télécharger l'Archive des Justificatifs (.ZIP)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Package complet avec tous les scans originaux (PDF/images) et le rapport d'audit textuel.
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
            </button>

            {/* OPTION 3 : COPIER LE LIEN PUBLIC POUR ANNONCE */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition group shadow-sm text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  {copied ? (
                    <Check className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Share2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {copied ? "Lien public copié dans le presse-papier !" : "Lien de Partage Certifié (LeBonCoin / LaCentrale)"}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Lien sécurisé pour rassurer vos acheteurs et justifier la valorisation du véhicule.
                  </p>
                </div>
              </div>
              <Copy className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>

        {/* PIED DE MODALE */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Infrastructure sécurisée LaVigieAuto</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition active:scale-95"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
