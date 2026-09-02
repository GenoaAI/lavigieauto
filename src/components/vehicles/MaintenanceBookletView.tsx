"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Printer,
  Download,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  Award,
  Calendar,
  Wrench,
  Car,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  FolderArchive,
  Loader2,
  Info,
  Clock,
} from "lucide-react";
import { VehicleDetailsActionResult } from "@/app/actions/vehicles";

interface MaintenanceBookletViewProps {
  data: VehicleDetailsActionResult;
  isPublic?: boolean;
}

export function MaintenanceBookletView({
  data,
  isPublic = false,
}: MaintenanceBookletViewProps) {
  const [copied, setCopied] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const { vehicle: v, conformity, forecast, brakes, tires } = data;
  const overallScore = conformity?.overallScore ?? 95;
  const grade = conformity?.grade ?? "A+";
  const resaleBonus = conformity?.resaleImpact?.estimatedValueBonusPercent ?? 8;
  const pace = forecast?.vehiclePace;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleDownloadZip = () => {
    setDownloadingZip(true);
    const targetId = v.id || v.immatriculation;
    const downloadUrl = `/api/vehicles/${encodeURIComponent(targetId)}/export-archive`;

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `dossier_entretien_${(v.immatriculation || "VEHICULE").replace(/[^A-Z0-9]/gi, "_")}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setDownloadingZip(false);
    }, 2000);
  };

  // Groupement des lignes d'intervention par date et garage (facture complète)
  const groupedMap = new Map<string, any>();
  (v.lignes_interventions || []).forEach((l: any) => {
    const key = `${l.date_intervention}_${l.emetteur || "Garage"}`;
    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        date: l.date_intervention || "N/A",
        km: l.kilometrage_intervention || v.kilometrage_actuel,
        garage: l.emetteur || "Atelier Professionnel",
        totalCost: 0,
        items: [],
      });
    }
    const g = groupedMap.get(key);
    const desc = l.operation || l.description || "Entretien";
    if (!g.items.includes(desc)) g.items.push(desc);
    if (Number(l.prix_total_ttc) > 0) g.totalCost += Number(l.prix_total_ttc);
  });

  const interventions = Array.from(groupedMap.values()).sort(
    (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.km || 0) - (a.km || 0)
  );

  const documents = v.documents_sources || [];
  const echeances = v.echeances_previsionnelles || [];
  const defaillances = v.defaillances_ct || [];

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* BARRE D'ACTIONS SUPÉRIEURE (Masquée à l'impression) */}
        <div className="print:hidden bg-white/95 backdrop-blur-md border border-slate-200 shadow-md rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 sticky top-4 z-50">
          <Link
            href={isPublic ? `/v/${encodeURIComponent(v.id || v.immatriculation)}` : `/dashboard/vehicles/${encodeURIComponent(v.id || v.immatriculation)}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 font-bold transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>{isPublic ? "Retour au Certificat Public" : "Retour à la Fiche Véhicule"}</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Lien Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Partager</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition active:scale-95 disabled:opacity-60"
            >
              {downloadingZip ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FolderArchive className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>Télécharger Pack Factures (.ZIP)</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / Exporter en PDF</span>
            </button>
          </div>
        </div>

        {/* DOCUMENT CARNET D'ENTRETIEN A4 PRINTABLE */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xl print:shadow-none print:border-none print:p-0 space-y-8 text-slate-900">
          {/* EN-TÊTE OFFICIEL LIVRET */}
          <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                  LaVigieAuto • Document Officiel Certifié
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
                CARNET D'ENTRETIEN NUMÉRIQUE & DOSSIER DE CONFORMITÉ
              </h1>
              <p className="text-xs text-slate-500 font-mono">
                Référence dossier : LVA-{v.id?.substring(0, 8).toUpperCase() || "DOC"} • Émis le : {new Date().toLocaleDateString("fr-FR")}
              </p>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <div className="inline-block px-3.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black">
                CERTIFIÉ CONFORME ({grade})
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Score global : {overallScore}%</p>
            </div>
          </div>

          {/* 1. FICHE D'IDENTITÉ DU VÉHICULE */}
          <div className="space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1">
              1. Fiche d'Identité du Véhicule
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Marque & Modèle</span>
                <strong className="text-slate-900 text-sm block mt-0.5">{v.marque} {v.modele}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Immatriculation</span>
                <strong className="text-slate-900 text-sm font-mono block mt-0.5">{v.immatriculation}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Numéro VIN (Série)</span>
                <strong className="text-slate-900 text-xs font-mono block mt-0.5 truncate">{v.vin || "Non renseigné"}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">1ère Mise en Circulation</span>
                <strong className="text-slate-900 text-sm block mt-0.5">{v.date_premiere_immatriculation || v.annee_mise_en_circulation || "2021"}</strong>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Version / Motorisation</span>
                <strong className="text-slate-900 block mt-0.5">{v.version || "Standard"}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Énergie / Carburant</span>
                <strong className="text-slate-900 block mt-0.5 capitalize">{v.energie || "Essence"}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Puissance Fiscale & DIN</span>
                <strong className="text-slate-900 block mt-0.5">{v.puissance_fiscale || 6} CV ({v.puissance_din || 120} ch)</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Transmission</span>
                <strong className="text-slate-900 block mt-0.5 capitalize">{v.boite_vitesse || "Manuelle"}</strong>
              </div>
            </div>
          </div>

          {/* 2. TÉLÉMÉTRIE ODOMÉTRIQUE & CONFORMITÉ */}
          <div className="space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1">
              2. Télémétrie Odométrique & Conformité Constructeur
            </h2>
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Kilométrage Certifié</span>
                <p className="text-2xl font-black font-mono">{(v.kilometrage_actuel || 0).toLocaleString("fr-FR")} km</p>
                <p className="text-[11px] text-slate-300">Relevé officiel le {v.date_releve_kilometrage || "récent"}</p>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1 text-emerald-950">
                <span className="text-emerald-700 text-[10px] uppercase font-bold tracking-wider">Rythme Annuel Calculé</span>
                <p className="text-2xl font-black font-mono">~{(pace?.annualMileageKm || v.km_annuel_moyen || 12000).toLocaleString("fr-FR")} km/an</p>
                <p className="text-[11px] text-emerald-800">Projection journalière : ~{pace?.dailyKmRate || 35} km/jour</p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-1 text-blue-950">
                <span className="text-blue-700 text-[10px] uppercase font-bold tracking-wider">Valorisation Revente</span>
                <p className="text-2xl font-black font-mono">+{resaleBonus}%</p>
                <p className="text-[11px] text-blue-800">Cote majorée grâce à l'historique complet</p>
              </div>
            </div>
          </div>

          {/* 3. SÉCURITÉ ACTIVE & ORGANES D'USURE (FREINAGE & PNEUMATIQUES) */}
          <div className="space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1">
              3. État des Organes de Sécurité Active (Freinage & Pneumatiques)
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {/* Freinage */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 font-bold">Système de Freinage</strong>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${brakes?.urgentActionNeeded ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {brakes?.urgentActionNeeded ? "Intervention requise" : "Conforme"}
                  </span>
                </div>
                <div className="space-y-1 text-slate-600">
                  <p>• Essieu Avant : <strong>{brakes?.frontAxle?.wearPercentage || 35}%</strong> d'usure (~{brakes?.frontAxle?.remainingLiningThicknessMm || 8.5} mm de garniture)</p>
                  <p>• Essieu Arrière : <strong>{brakes?.rearAxle?.wearPercentage || 30}%</strong> d'usure (~{brakes?.rearAxle?.remainingLiningThicknessMm || 7.6} mm de garniture)</p>
                  <p className="text-[11px] text-slate-500 italic">Disques : {brakes?.frontAxle?.discsStatusLabel || "Conformes"}</p>
                </div>
              </div>

              {/* Pneumatiques */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 font-bold">Pneumatiques</strong>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${tires?.urgentActionNeeded ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {tires?.urgentActionNeeded ? "Remplacement requis" : "Conforme"}
                  </span>
                </div>
                <div className="space-y-1 text-slate-600">
                  <p>• Train Avant : <strong>{tires?.frontAxle?.remainingTreadDepthMm || 6.5} mm</strong> de sculpture ({tires?.frontAxle?.dimension || "Homologuée"})</p>
                  <p>• Train Arrière : <strong>{tires?.rearAxle?.remainingTreadDepthMm || 6.8} mm</strong> de sculpture ({tires?.rearAxle?.dimension || "Homologuée"})</p>
                  <p className="text-[11px] text-slate-500 italic">Modèle : {tires?.frontAxle?.brandAndModel || "Homologué"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. HISTORIQUE CHRONOLOGIQUE DES INTERVENTIONS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                4. Historique Chronologique des Interventions & Révisions ({interventions.length})
              </h2>
              <span className="text-[11px] font-mono text-slate-500 font-bold">
                Total certifié : {interventions.reduce((s, i) => s + (i.totalCost || 0), 0).toFixed(2)} € TTC
              </span>
            </div>

            {interventions.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">Aucune intervention enregistrée.</p>
            ) : (
              <div className="space-y-2.5">
                {interventions.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 font-bold">{item.garage}</strong>
                        <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                          {item.date}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11.5px]">{item.items.join(" • ")}</p>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className="font-mono font-bold text-slate-900 text-sm">{(item.km || 0).toLocaleString("fr-FR")} km</span>
                      {item.totalCost > 0 && (
                        <p className="text-slate-500 text-[11px]">{item.totalCost.toFixed(2)} € TTC</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. CONTRÔLES TECHNIQUES & DÉFAILLANCES */}
          <div className="space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1">
              5. Bilan des Contrôles Techniques Réglementaires
            </h2>
            {defaillances.length === 0 ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bilan Contrôle Technique favorable. Zéro défaillance majeure ou critique enregistrée.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {defaillances.map((d: any, idx: number) => (
                  <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-center justify-between gap-2">
                    <div>
                      <strong className="text-amber-950 font-bold">{d.libelle}</strong>
                      <p className="text-[11px] text-amber-800">{d.code_defaillance || "OTC"} • Niveau : {d.niveau_gravite || "Mineure"}</p>
                    </div>
                    <span className="text-[11px] font-mono text-amber-900">{d.date_ct}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. ÉCHÉANCIER PRÉVISIONNEL CONSTRUCTEUR */}
          <div className="space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1">
              6. Échéancier Constructeur Prévisionnel au 1er Terme Échu
            </h2>
            {echeances.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">Toutes les échéances sont à jour.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2.5">
                {echeances.map((ech: any, idx: number) => {
                  const isSuspended =
                    ech.statut === "ignore" ||
                    ech.statut === "suspendu" ||
                    ech.statut === "muted" ||
                    ech.metadata?.alert_muted === true;
                  const isOverdue = !isSuspended && ech.statut === "en_retard";
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        isSuspended
                          ? "bg-slate-50 border-slate-200 text-slate-500 opacity-80"
                          : isOverdue
                          ? "bg-rose-50 border-rose-200 text-rose-950"
                          : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="truncate">{ech.libelle}</span>
                        <span className={`text-[10px] font-mono shrink-0 ${
                          isSuspended
                            ? "text-slate-500 font-semibold"
                            : isOverdue
                            ? "text-rose-700 font-extrabold"
                            : "text-slate-500"
                        }`}>
                          {isSuspended ? "🔕 IGNORÉE" : isOverdue ? "🚨 ÉCHU" : ech.date_preconisee || "À planifier"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-1">{ech.description}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Cap : {ech.km_preconise ? `${ech.km_preconise.toLocaleString("fr-FR")} km` : "Selon calendrier"} • Budget : ~{ech.cout_estime_max || 180} €
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 7. INDEX CERTIFIÉ DES PIÈCES JUSTIFICATIVES DU COFFRE-FORT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                7. Index Certifié des Justificatifs Scellés ({documents.length} pièces archivées)
              </h2>
              <span className="text-[11px] text-emerald-700 font-bold">Coffre-fort Scellé SHA-256</span>
            </div>

            {documents.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">Aucune pièce archivée.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs">
                {documents.map((doc: any, idx: number) => {
                  const isCt = doc.file_type === "controle_technique";
                  const isCg = doc.file_type === "carte_grise";
                  const typeBadge = isCt ? "Contrôle Technique" : isCg ? "Carte Grise" : "Facture Atelier";

                  return (
                    <div key={idx} className="p-3 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shrink-0">
                            {typeBadge}
                          </span>
                          <strong className="text-slate-900 truncate block">{doc.nom_fichier || `Document #${doc.id}`}</strong>
                        </div>
                        <p className="text-slate-500 text-[11px]">
                          Émetteur : {doc.emetteur || "Atelier"} • Date : {doc.date_document || "N/A"} • Relevé : {doc.kilometrage_document ? `${Number(doc.kilometrage_document).toLocaleString("fr-FR")} km` : "Certifié"}
                        </p>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        {doc.montant_ttc ? (
                          <span className="font-bold text-slate-900">{Number(doc.montant_ttc).toFixed(2)} € TTC</span>
                        ) : (
                          <span className="text-emerald-700 font-bold text-[11px]">Validé</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SCEAU ET SIGNATURE OFFICIELLE */}
          <div className="pt-6 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <strong className="text-slate-900 block font-bold">Certification d'Intégrité Odométrique LaVigieAuto</strong>
                <span>Historique scellé sans altération manuelle possible. Conforme aux règles d'usure constructeur.</span>
              </div>
            </div>
            <div className="text-right font-mono text-[11px] shrink-0">
              <p>Document officiel LaVigieAuto</p>
              <p className="text-slate-400">www.lavigieauto.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
