"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Printer,
  Copy,
  Check,
  Share2,
  Download,
  FileText,
  FolderArchive,
  Loader2,
  ExternalLink,
} from "lucide-react";

export function CertificateExportToolbar({
  vehicleName,
  licensePlate,
  vehicleId,
}: {
  vehicleName: string;
  licensePlate: string;
  vehicleId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const getShareableUrl = () => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("ref", "report_public");
    return url.toString();
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(getShareableUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handlePrintPdf = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDownloadZip = () => {
    if (!vehicleId && !licensePlate) return;
    setDownloadingZip(true);
    const target = vehicleId || licensePlate;
    const downloadUrl = `/api/vehicles/${encodeURIComponent(target)}/export-archive`;

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

  const handleShare = async () => {
    if (typeof window !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Certificat de Conformité - ${vehicleName} (${licensePlate})`,
          text: `Consultez le certificat officiel d'entretien et de santé mécanique pour ${vehicleName} :`,
          url: getShareableUrl(),
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const carnetUrl = `/v/${encodeURIComponent(vehicleId || licensePlate)}/carnet`;

  return (
    <div className="print:hidden bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 sticky top-4 z-50">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Certificat Public Certifié</span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* LIEN CARNET D'ENTRETIEN OFFICIEL */}
        <Link
          href={carnetUrl}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition active:scale-95 shadow-sm"
          title="Consulter le carnet d'entretien officiel complet"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-600" />
          <span>Livret Carnet d'Entretien</span>
        </Link>

        {/* BOUTON TÉLÉCHARGER PACK FACTURES (.ZIP) */}
        <button
          onClick={handleDownloadZip}
          disabled={downloadingZip}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition active:scale-95 disabled:opacity-60"
          title="Télécharger toutes les factures et PV de CT scellés"
        >
          {downloadingZip ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FolderArchive className="w-3.5 h-3.5 text-indigo-600" />
          )}
          <span>Pack Justificatifs (.ZIP)</span>
        </button>

        {/* BOUTON COPIER LE LIEN */}
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition active:scale-95"
          title="Copier le lien pour votre annonce LeBonCoin ou LaCentrale"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">Lien Copié !</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Copier le lien</span>
            </>
          )}
        </button>

        {/* BOUTON PARTAGER */}
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition active:scale-95"
        >
          <Share2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Partager</span>
        </button>

        {/* BOUTON EXPORTER EN PDF / IMPRIMER */}
        <button
          onClick={handlePrintPdf}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition active:scale-95"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimer</span>
        </button>
      </div>
    </div>
  );
}
