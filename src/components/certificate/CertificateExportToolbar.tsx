"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Car,
  ChevronDown,
} from "lucide-react";
import type { CertificateVehicleSummary } from "./CertificateVehicleSwitcher";

export function CertificateExportToolbar({
  vehicleName,
  licensePlate,
  vehicleId,
  vehicles = [],
}: {
  vehicleName: string;
  licensePlate: string;
  vehicleId?: string;
  vehicles?: CertificateVehicleSummary[];
}) {
  const [copied, setCopied] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

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
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="hidden sm:inline">Certificat Public Certifié</span>
          <span className="sm:hidden">Certifié</span>
        </div>

        {/* Sélecteur de véhicule dans la barre sticky */}
        {vehicles && vehicles.length > 1 && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition shadow-xs"
              title="Changer de véhicule du foyer"
            >
              <Car className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="max-w-[120px] sm:max-w-[160px] truncate">{vehicleName}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 space-y-1">
                <div className="px-2.5 py-1.5 border-b border-slate-100 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Véhicules du foyer ({vehicles.length})
                </div>
                {vehicles.map((v) => {
                  const cleanCurrentId = (vehicleId || "").toUpperCase().replace(/[\s-]/g, "");
                  const cleanCurrentPlate = (licensePlate || "").toUpperCase().replace(/[\s-]/g, "");
                  const vId = (v.id || "").toUpperCase().replace(/[\s-]/g, "");
                  const vPlate = (v.immatriculation || "").toUpperCase().replace(/[\s-]/g, "");
                  const isActive = (cleanCurrentId && vId === cleanCurrentId) || (cleanCurrentPlate && vPlate === cleanCurrentPlate);

                  return (
                    <Link
                      key={v.id}
                      href={`/v/${encodeURIComponent(v.id)}`}
                      onClick={() => setIsDropdownOpen(false)}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition ${
                        isActive
                          ? "bg-blue-50 text-blue-800 font-bold"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Car className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                        <span className="truncate">{v.marque} {v.modele}</span>
                      </div>
                      <span className={`text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded ${
                        isActive ? "bg-blue-200/70 text-blue-900 font-bold" : "bg-slate-100 text-slate-500 font-semibold"
                      }`}>
                        {v.immatriculation}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
