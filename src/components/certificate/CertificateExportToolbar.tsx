"use client";

import React, { useState } from "react";
import { Printer, Copy, Check, Share2, Download, ExternalLink } from "lucide-react";

export function CertificateExportToolbar({
  vehicleName,
  licensePlate,
}: {
  vehicleName: string;
  licensePlate: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handlePrintPdf = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShare = async () => {
    if (typeof window !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Certificat de Conformité - ${vehicleName} (${licensePlate})`,
          text: `Consultez le certificat officiel d'entretien et de santé mécanique pour ${vehicleName} :`,
          url: window.location.href,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="print:hidden bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 sticky top-4 z-50">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Certificat Public Certifié</span>
      </div>

      <div className="flex items-center gap-2.5">
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
          <span>Exporter en PDF / Imprimer</span>
        </button>
      </div>
    </div>
  );
}
