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
  ExternalLink,
  X,
  FileCheck,
  FolderLock,
  Search,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { VaultDocumentItem } from "@/lib/storage/vault-service";
import { deleteVaultDocumentAction, getDocumentSignedUrlAction } from "@/app/actions/vault";
import { CollapsibleModuleCard } from "@/components/ui/CollapsibleModuleCard";

interface VehicleVaultListProps {
  vehicleId: string;
  vehicleName: string;
  licensePlate: string;
  documents: VaultDocumentItem[];
  totalExpensesEur: number;
  onDocumentDeleted?: () => void;
  className?: string;
}

export function VehicleVaultList({
  vehicleId,
  vehicleName,
  licensePlate,
  documents: initialDocs,
  totalExpensesEur,
  onDocumentDeleted,
  className = "",
}: VehicleVaultListProps) {
  const [documents, setDocuments] = useState<VaultDocumentItem[]>(initialDocs);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "INVOICE" | "INSPECTION" | "REGISTRATION">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<VaultDocumentItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  React.useEffect(() => {
    setDocuments(initialDocs);
  }, [initialDocs]);

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
    setPreviewError(null);
    setLoadingPreview(true);
    try {
      const res = await getDocumentSignedUrlAction(doc.storagePath);
      if (res.signedUrl) {
        setPreviewUrl(res.signedUrl);
      } else {
        setPreviewUrl(doc.signedUrl || null);
        if (!doc.signedUrl) {
          setPreviewError(res.error || "Impossible de générer l'accès sécurisé à ce document.");
        }
      }
    } catch (err: any) {
      setPreviewUrl(doc.signedUrl || null);
      if (!doc.signedUrl) {
        setPreviewError(err?.message || "Erreur de connexion au stockage sécurisé.");
      }
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleRetryPreview = () => {
    if (previewDoc) {
      handleOpenPreview(previewDoc);
    }
  };

  const handleDelete = async (doc: VaultDocumentItem) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement ce document (${doc.fileName}) ?\n\nLe carnet d'entretien, le kilométrage certifié et les échéances prédictives seront automatiquement nettoyés et recalculés.`)) {
      return;
    }

    setDeletingId(doc.id);
    const res = await deleteVaultDocumentAction(doc.id, doc.storagePath, vehicleId);
    setDeletingId(null);

    if (res.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (onDocumentDeleted) {
        onDocumentDeleted();
      }
    } else {
      alert(`Erreur : ${res.error || "Impossible de supprimer le document."}`);
    }
  };

  const getDocTypeBadge = (type: string, doc?: VaultDocumentItem) => {
    const normType = (type || "").toLowerCase();
    const em = (doc?.emitter || doc?.fileName || "").toLowerCase();

    if (
      normType === "controle_technique" ||
      normType === "technical_inspection" ||
      normType === "ct" ||
      em.includes("dekra") ||
      em.includes("autosur") ||
      em.includes("securitest") ||
      em.includes("sécuritest") ||
      em.includes("autovision") ||
      em.includes("auto securite") ||
      em.includes("auto sécurité") ||
      em.includes("norisko") ||
      em.includes("autocontrol") ||
      em.includes("mon controle technique") ||
      em.includes("mon contrôle technique") ||
      em.includes("service controle") ||
      em.includes("service contrôle") ||
      em.includes("centre de controle") ||
      em.includes("centre de contrôle") ||
      em.includes("controle technique") ||
      em.includes("contrôle technique")
    ) {
      return { label: "Procès-Verbal CT", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }

    if (normType === "carte_grise" || normType === "registration_card" || normType === "cg") {
      return { label: "Certificat d'Immatriculation", bg: "bg-purple-50 text-purple-700 border-purple-200" };
    }

    if (normType === "facture" || normType === "invoice") {
      return { label: "Facture Atelier", bg: "bg-blue-50 text-blue-700 border-blue-200" };
    }

    return { label: "Document", bg: "bg-slate-50 text-slate-700 border-slate-200" };
  };

  return (
    <CollapsibleModuleCard
      id="digital_vault"
      vehicleId={vehicleId}
      defaultOpen={false}
      icon={<FolderLock className="w-5 h-5" />}
      iconBgColor="bg-purple-50 text-purple-600"
      title="Coffre-fort Numérique (Scans & Justificatifs)"
      subtitle="Documents chiffrés, sauvegardés de manière pérenne et horodatés"
      badge={
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 px-2.5 py-0.5 bg-slate-100 rounded-full border border-slate-200">
            {documents.length} document{documents.length > 1 ? "s" : ""}
          </span>
          <span className="text-xs font-black text-emerald-700 px-2.5 py-0.5 bg-emerald-50 rounded-full border border-emerald-200">
            {totalExpensesEur.toLocaleString("fr-FR")} € TTC
          </span>
        </div>
      }
      className={className}
      bodyClassName="pt-5 border-t border-slate-100 mt-2 space-y-6"
    >
      {/* HEADER BANNER COFFRE-FORT */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-200 text-xs font-bold border border-white/10">
              <FolderLock className="w-3.5 h-3.5 text-emerald-400" />
              Coffre-fort Numérique Décentralisé
            </div>
            <h3 className="text-lg font-black tracking-tight">
              Scans & Pièces Justificatives Originales
            </h3>
            <p className="text-xs text-indigo-200/80 max-w-xl">
              Tous vos documents scannés sont chiffrés, sauvegardés et horodatés pour garantir la transparence totale lors de la revente de votre {vehicleName}.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 shrink-0">
            <div>
              <p className="text-[10px] uppercase font-bold text-indigo-300">Justificatifs</p>
              <p className="text-xl font-black text-white">{documents.length}</p>
            </div>
            <div className="h-7 w-px bg-white/20" />
            <div>
              <p className="text-[10px] uppercase font-bold text-indigo-300">Dépenses</p>
              <p className="text-xl font-black text-emerald-400">{totalExpensesEur.toLocaleString("fr-FR")} €</p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTRES & RECHERCHE */}
      <div
        className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeFilter === "ALL"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Tous ({documents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("INVOICE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeFilter === "INVOICE"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Factures ({documents.filter((d) => d.fileType === "facture").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("INSPECTION")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeFilter === "INSPECTION"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Contrôles Techniques ({documents.filter((d) => d.fileType === "controle_technique").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("REGISTRATION")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
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
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2 shadow-2xs">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900">Aucun document dans cette catégorie</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Déposez vos nouvelles factures ou procès-verbaux de contrôle technique pour les archiver automatiquement dans le coffre-fort.
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {filteredDocs.map((doc) => {
            const badge = getDocTypeBadge(doc.fileType, doc);

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* INFO DOCUMENT */}
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl shrink-0">
                    <FileText className="w-5 h-5 text-slate-700" />
                  </div>

                  <div className="space-y-1">
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
                    type="button"
                    onClick={() => handleOpenPreview(doc)}
                    className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-2xs"
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
                      className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition border border-slate-200"
                      title="Télécharger le fichier original"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-slate-200 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {previewDoc.emitter || previewDoc.fileName}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {previewDoc.dateDocument} • {previewDoc.mileageDocument ? `${previewDoc.mileageDocument.toLocaleString("fr-FR")} km` : "Relevé officiel"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {previewUrl && (
                  <>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                      title="Ouvrir en plein écran dans un nouvel onglet"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Plein écran</span>
                      <span className="sm:hidden">Ouvrir</span>
                    </a>
                    <a
                      href={previewUrl}
                      download={previewDoc.fileName}
                      className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                      title="Télécharger le fichier original"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Télécharger</span>
                    </a>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDoc(null);
                    setPreviewUrl(null);
                    setPreviewError(null);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition ml-1"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-3 sm:p-5 bg-slate-900/5 flex flex-col items-center justify-center min-h-[420px] sm:min-h-[520px]">
              {loadingPreview ? (
                <div className="flex flex-col items-center gap-3 p-8">
                  <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-600 font-semibold">Génération de l&apos;accès sécurisé...</p>
                </div>
              ) : previewUrl ? (
                (previewDoc.mimeType?.startsWith("image/") ||
                 /\.(jpe?g|png|webp|heic|gif)$/i.test(previewDoc.fileName)) ? (
                  <img
                    src={previewUrl}
                    alt={previewDoc.fileName}
                    className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center gap-3">
                    {/* Bandeau d'action mobile optimisé pour la lecture directe */}
                    <div className="w-full sm:hidden bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          Document PDF Prêt
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md">
                          Certifié
                        </span>
                      </div>
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs active:scale-[0.98]"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Consulter le PDF en plein écran
                      </a>
                    </div>

                    <iframe
                      src={previewUrl}
                      title={previewDoc.fileName}
                      className="w-full h-[60vh] sm:h-[72vh] rounded-2xl border border-slate-200 bg-white shadow-xs"
                      allow="fullscreen"
                    />
                  </div>
                )
              ) : (
                <div className="text-center p-6 sm:p-8 space-y-4 max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto text-amber-600">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">Aperçu direct indisponible</p>
                    <p className="text-xs text-slate-500">
                      {previewError || "Le document n'a pas pu être chargé depuis le stockage sécurisé."}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleRetryPreview()}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Réessayer
                    </button>
                    {previewDoc?.signedUrl && (
                      <a
                        href={previewDoc.signedUrl}
                        download={previewDoc.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Lien de secours
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </CollapsibleModuleCard>
  );
}
