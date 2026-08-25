"use client";

import React, { useState } from "react";
import {
  FileText,
  ShieldCheck,
  Download,
  Eye,
  Trash2,
  Calendar,
  Gauge,
  Building2,
  ExternalLink,
  X,
  FileCheck,
  FolderLock,
  Search,
  Filter,
} from "lucide-react";
import { VaultDocumentItem } from "@/lib/storage/vault-service";
import { deleteVaultDocumentAction, getDocumentSignedUrlAction } from "@/app/actions/vault";

interface VehicleVaultListProps {
  vehicleId: string;
  vehicleName: string;
  licensePlate: string;
  documents: VaultDocumentItem[];
  totalExpensesEur: number;
}

export function VehicleVaultList({
  vehicleId,
  vehicleName,
  licensePlate,
  documents: initialDocs,
  totalExpensesEur,
}: VehicleVaultListProps) {
  const [documents, setDocuments] = useState<VaultDocumentItem[]>(initialDocs);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "INVOICE" | "INSPECTION" | "REGISTRATION">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<VaultDocumentItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredDocs = documents.filter((doc) => {
    // Type Filter
    if (activeFilter === "INVOICE" && doc.fileType !== "facture") return false;
    if (activeFilter === "INSPECTION" && doc.fileType !== "controle_technique") return false;
    if (activeFilter === "REGISTRATION" && doc.fileType !== "carte_grise") return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEmitter = (doc.emitter || "").toLowerCase().includes(q);
      const matchName = doc.fileName.toLowerCase().includes(q);
      const matchDate = (doc.dateDocument || "").includes(q);
      if (!matchEmitter && !matchName && !matchDate) return false;
    }

    return true;
  });

  const handleOpenPreview = async (doc: VaultDocumentItem) => {
    setPreviewDoc(doc);
    if (doc.signedUrl) {
      setPreviewUrl(doc.signedUrl);
    } else {
      setLoadingPreview(true);
      const res = await getDocumentSignedUrlAction(doc.storagePath);
      setPreviewUrl(res.signedUrl || null);
      setLoadingPreview(false);
    }
  };

  const handleDelete = async (doc: VaultDocumentItem) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement ce document (${doc.fileName}) du coffre-fort ?`)) {
      return;
    }

    setDeletingId(doc.id);
    const res = await deleteVaultDocumentAction(doc.id, doc.storagePath, vehicleId);
    setDeletingId(null);

    if (res.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } else {
      alert(`Erreur : ${res.error || "Impossible de supprimer le document."}`);
    }
  };

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case "facture":
        return { label: "Facture Atelier", bg: "bg-blue-50 text-blue-700 border-blue-200" };
      case "controle_technique":
        return { label: "Procès-Verbal CT", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "carte_grise":
        return { label: "Certificat d'Immatriculation", bg: "bg-purple-50 text-purple-700 border-purple-200" };
      default:
        return { label: "Document", bg: "bg-slate-50 text-slate-700 border-slate-200" };
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER COFFRE-FORT */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold border border-white/10">
              <FolderLock className="w-3.5 h-3.5 text-emerald-400" />
              Coffre-fort Numérique Décentralisé
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              Scans & Pièces Justificatives Originales
            </h2>
            <p className="text-xs text-indigo-200/80 max-w-xl">
              Tous vos documents scannés sont chiffrés, sauvegardés de manière pérenne et horodatés pour garantir la transparence totale lors de la revente de votre {vehicleName}.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 shrink-0">
            <div>
              <p className="text-[10px] uppercase font-bold text-indigo-300">Justificatifs classés</p>
              <p className="text-2xl font-black text-white">{documents.length}</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="text-[10px] uppercase font-bold text-indigo-300">Dépenses tracées</p>
              <p className="text-2xl font-black text-emerald-400">{totalExpensesEur.toLocaleString("fr-FR")} €</p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTRES & RECHERCHE */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeFilter === "ALL"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Tous ({documents.length})
          </button>
          <button
            onClick={() => setActiveFilter("INVOICE")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeFilter === "INVOICE"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Factures ({documents.filter((d) => d.fileType === "facture").length})
          </button>
          <button
            onClick={() => setActiveFilter("INSPECTION")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeFilter === "INSPECTION"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Contrôles Techniques ({documents.filter((d) => d.fileType === "controle_technique").length})
          </button>
          <button
            onClick={() => setActiveFilter("REGISTRATION")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeFilter === "REGISTRATION"
                ? "bg-purple-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Carte Grise ({documents.filter((d) => d.fileType === "carte_grise").length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher garage, date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* LISTE DES DOCUMENTS DU COFFRE-FORT */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Aucun document dans cette catégorie</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Déposez vos nouvelles factures ou procès-verbaux de contrôle technique pour les archiver automatiquement dans le coffre-fort.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocs.map((doc) => {
            const badge = getDocTypeBadge(doc.fileType);

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* INFO DOCUMENT */}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl shrink-0">
                    <FileText className="w-6 h-6 text-slate-700" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                        <ShieldCheck className="w-3 h-3" />
                        {badge.label}
                      </span>
                      {doc.confidenceScore && doc.confidenceScore >= 90 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <FileCheck className="w-3 h-3" />
                          IA Certifié ({doc.confidenceScore}%)
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                      {doc.emitter || "Document officiel"}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {doc.dateDocument || "Date non spécifiée"}
                      </span>

                      {doc.mileageDocument ? (
                        <span className="flex items-center gap-1 font-medium">
                          <Gauge className="w-3.5 h-3.5 text-slate-400" />
                          {doc.mileageDocument.toLocaleString("fr-FR")} km
                        </span>
                      ) : null}

                      {doc.totalTTC ? (
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                          {Number(doc.totalTTC).toFixed(2)} € TTC
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0">
                  <button
                    onClick={() => handleOpenPreview(doc)}
                    className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Voir le Scan
                  </button>

                  {doc.signedUrl && (
                    <a
                      href={doc.signedUrl}
                      download={doc.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition border border-slate-200"
                      title="Télécharger le fichier original"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-slate-200 disabled:opacity-50"
                    title="Supprimer du coffre-fort"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE DE PRÉVISUALISATION DU SCAN */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                    {previewDoc.emitter || previewDoc.fileName}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {previewDoc.dateDocument} • {previewDoc.mileageDocument ? `${previewDoc.mileageDocument.toLocaleString("fr-FR")} km` : "Relevé officiel"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {previewUrl && (
                  <a
                    href={previewUrl}
                    download={previewDoc.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ouvrir / Télécharger
                  </a>
                )}
                <button
                  onClick={() => {
                    setPreviewDoc(null);
                    setPreviewUrl(null);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-4 bg-slate-900/5 flex items-center justify-center min-h-[500px]">
              {loadingPreview ? (
                <p className="text-xs text-slate-500">Génération de l'accès sécurisé...</p>
              ) : previewUrl ? (
                previewDoc.mimeType?.includes("image") || previewDoc.fileName.endsWith(".jpg") || previewDoc.fileName.endsWith(".png") ? (
                  <img
                    src={previewUrl}
                    alt={previewDoc.fileName}
                    className="max-h-[70vh] max-w-full object-contain rounded-xl shadow"
                  />
                ) : (
                  <iframe
                    src={previewUrl}
                    title={previewDoc.fileName}
                    className="w-full h-[70vh] rounded-xl border border-slate-200 bg-white"
                  />
                )
              ) : (
                <div className="text-center p-8 space-y-2">
                  <p className="text-sm font-bold text-slate-700">Aperçu direct non disponible</p>
                  <p className="text-xs text-slate-500">Vous pouvez télécharger le fichier pour le consulter.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
