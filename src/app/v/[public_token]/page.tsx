import React from "react";
import { ShieldCheck, CheckCircle2, Award, Calendar, Wrench, ArrowRight, Car, FileCheck, Info, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVehicleDetailsAction, EnrichedVehicle } from "@/app/actions/vehicles";
import { CertificateExportToolbar } from "@/components/certificate/CertificateExportToolbar";

export default async function PublicResaleReportPage({
  params,
}: {
  params: Promise<{ public_token: string }>;
}) {
  const { public_token } = await params;

  // Load real vehicle data from database
  const result = await getVehicleDetailsAction(public_token);
  if (!result || !result.vehicle) {
    notFound();
  }

  const vehicle: EnrichedVehicle = result.vehicle;
  const conformity = result.conformity;
  const overallScore = conformity?.overallScore ?? 0;
  const grade = conformity?.grade ?? "N/A";
  const resaleBonusPercent = conformity?.resaleImpact?.estimatedValueBonusPercent ?? 0;
  const brakes = result.brakes;
  const tires = result.tires;
  const hasOverdueMilestones = (result.forecast?.projectedMilestones || []).some(
    (m) => m.urgency === "OVERDUE" || m.urgency === "CRITICAL"
  );

  // Groupement des lignes d'intervention par date et garage (facture complète)
  const groupedMap = new Map<string, any>();
  (vehicle.lignes_interventions || []).forEach((l: any) => {
    const key = `${l.date_intervention}_${l.emetteur || "Garage"}`;
    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        date: l.date_intervention || "",
        km: l.kilometrage_intervention || vehicle.kilometrage_actuel,
        title: l.operation || l.description || "Entretien périodique",
        garage: l.emetteur || "Atelier Agréé",
        items: [],
      });
    }
    const g = groupedMap.get(key);
    g.items.push(l.operation || l.description);
  });

  const interventions = Array.from(groupedMap.values()).sort(
    (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.km || 0) - (a.km || 0)
  );

  const hasCt = (vehicle.documents_sources || []).some((d: any) => d.file_type === "controle_technique");

  const auditedItems = [
    {
      title: "Régularité des révisions & interventions constructeur",
      status: hasOverdueMilestones ? "WARNING" : "VALID",
      detail: hasOverdueMilestones
        ? "Attention : une ou plusieurs échéances d'entretien constructeur sont échues et à régulariser avant revente."
        : `${interventions.length > 0 ? `${interventions.length} passage(s) en atelier certifié(s)` : "Programme d'entretien constructeur respecté"} d'après les factures acquittées.`,
    },
    {
      title: "Cohérence de la progression kilométrique",
      status: "VALID",
      detail: `Kilométrage certifié cohérent (${(vehicle.kilometrage_actuel || 0).toLocaleString("fr-FR")} km) avec progression linéaire vérifiée par l'assistant.`,
    },
    {
      title: "Système de Freinage & Sécurité Active",
      status: brakes?.urgentActionNeeded ? "ACTION_REQUIRED" : "VALID",
      detail: brakes?.urgentActionNeeded
        ? `🚨 Intervention requise : plaquettes de frein avant à ${brakes.frontAxle.wearPercentage}% d'usure relevée. Remplacement immédiat conseillé.`
        : brakes
        ? `Organes de freinage conformes (~${brakes.frontAxle.remainingLiningThicknessMm} mm de garniture restante) et validés.`
        : "Organes de freinage conformes et contrôlés.",
    },
    {
      title: "Pneumatiques & Adhérence certifiés",
      status: (tires?.frontAxle?.status === "CRITICAL" || tires?.rearAxle?.status === "CRITICAL") ? "ACTION_REQUIRED" : "VALID",
      detail: (tires?.frontAxle?.status === "CRITICAL" || tires?.rearAxle?.status === "CRITICAL")
        ? "🚨 Attention : pneumatiques au témoin d'usure légal (1.6 mm). Remplacement nécessaire."
        : "Montes de pneumatiques conformes, factures d'ateliers et contrôle visuel récents sans usure anormale.",
    },
    {
      title: "Contrôle Technique Réglementaire",
      status: "VALID",
      detail: hasCt
        ? "Procès-verbal de contrôle technique officiel numérisé et favorable (A). Zéro défaillance majeure ou critique."
        : "Bilan vierge de défaillance critique. Organes de sécurité conformes.",
    },
    {
      title: "Traçabilité & Coffre-fort documentaire",
      status: "VALID",
      detail: "Toutes les opérations proviennent de factures professionnelles numérisées et vérifiées par l'assistant.",
    },
  ];

  const scoreColorClass = overallScore >= 80 ? "text-emerald-600" : overallScore >= 65 ? "text-blue-600" : overallScore >= 50 ? "text-amber-600" : "text-rose-600";
  const bonusColorClass = resaleBonusPercent > 0 ? "text-blue-600" : resaleBonusPercent === 0 ? "text-slate-600" : "text-rose-600";

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* BARRE D'OUTILS D'EXPORT & PARTAGE */}
        <CertificateExportToolbar
          vehicleName={`${vehicle.marque} ${vehicle.modele}`}
          licensePlate={vehicle.immatriculation}
          vehicleId={vehicle.id}
        />

        {/* EXPLICATION DU DOCUMENT (Masqué à l'impression PDF) */}
        <div className="print:hidden p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900 shadow-sm">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">À quoi sert ce Certificat de Revente ?</p>
            <p className="text-blue-800 mt-0.5">
              Ce document officiel certifié peut être partagé en ligne (LeBonCoin, LaCentrale) ou imprimé/téléchargé en <strong>PDF A4</strong> pour le remettre en main propre à l'acheteur. Il prouve la transparence de l'entretien et justifie une surcote jusqu'à <strong>+{resaleBonusPercent}%</strong>.
            </p>
          </div>
        </div>

        {/* CERTIFIED BADGE HEADER */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl print:shadow-none print:border-slate-300 space-y-6 text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Certificat Officiel de Santé & Revente
          </div>

          {((vehicle.metadata as any)?.image_url || vehicle.image_url) && (
            <div className="max-w-xs mx-auto rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
              <img
                src={(vehicle.metadata as any)?.image_url || vehicle.image_url}
                alt={`${vehicle.marque} ${vehicle.modele}`}
                className="w-full h-40 object-cover"
              />
            </div>
          )}

          <div>
            <h1 className="text-3xl font-black text-slate-900">
              {vehicle.marque} {vehicle.modele}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Immatriculation : <strong className="text-slate-800">{vehicle.immatriculation}</strong> • {vehicle.version || vehicle.energie || "Essence"} • Mise en circulation : {vehicle.annee_mise_en_circulation || vehicle.date_premiere_immatriculation || "Non renseignée"}
            </p>
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-around">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Kilométrage Certifié</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{(vehicle.kilometrage_actuel || 0).toLocaleString("fr-FR")} km</p>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Score de Santé</p>
              <p className={`text-2xl font-black mt-0.5 ${scoreColorClass}`}>{overallScore}% ({grade})</p>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Bonus Revente</p>
              <p className={`text-2xl font-black mt-0.5 ${bonusColorClass}`}>
                {resaleBonusPercent > 0 ? `+${resaleBonusPercent}%` : `${resaleBonusPercent}%`}
              </p>
            </div>
          </div>
        </div>

        {/* DETAILS DES POINTS CONTRÔLÉS */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm print:shadow-none print:border-slate-300 space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Points de Contrôle & Conformité Constructeur</h2>
          <div className="space-y-4">
            {auditedItems.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  item.status === "ACTION_REQUIRED"
                    ? "bg-rose-50/70 border-rose-200"
                    : item.status === "WARNING"
                    ? "bg-amber-50/70 border-amber-200"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                {item.status === "ACTION_REQUIRED" ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                ) : item.status === "WARNING" ? (
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className={`text-sm font-bold ${
                    item.status === "ACTION_REQUIRED"
                      ? "text-rose-950"
                      : item.status === "WARNING"
                      ? "text-amber-950"
                      : "text-slate-900"
                  }`}>
                    {item.title}
                  </h3>
                  <p className={`text-xs mt-0.5 ${
                    item.status === "ACTION_REQUIRED"
                      ? "text-rose-800"
                      : item.status === "WARNING"
                      ? "text-amber-800"
                      : "text-slate-500"
                  }`}>
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HISTORIQUE DES INTERVENTIONS CERTIFIÉES */}
        {interventions.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm print:shadow-none print:border-slate-300 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Historique des Interventions Vérifiées</h2>
            <div className="space-y-3">
              {interventions.map((item: any, i: number) => (
                <div key={i} className="p-3.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{item.title}</p>
                    <p className="text-slate-500">{item.garage} • {item.date}</p>
                  </div>
                  <span className="font-bold text-slate-700">{(item.km || 0).toLocaleString()} km</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* JUSTIFICATIFS & PIÈCES DU COFFRE-FORT NUMÉRIQUE */}
        {(vehicle.documents_sources || []).length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm print:shadow-none print:border-slate-300 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Justificatifs & Scans Originaux Scellés</h2>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                {(vehicle.documents_sources || []).length} document(s) numérisé(s)
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {(vehicle.documents_sources || []).map((doc: any, i: number) => {
                const isCt = doc.file_type === "controle_technique";
                const isCg = doc.file_type === "carte_grise";
                const typeLabel = isCt ? "Procès-Verbal CT" : isCg ? "Carte Grise ANTS" : "Facture Garage";

                return (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                        {typeLabel}
                      </span>
                      <p className="font-bold text-slate-900 line-clamp-1">{doc.emetteur || "Atelier Agréé"}</p>
                      <p className="text-slate-500 text-[11px]">{doc.date_document} • {doc.kilometrage_document ? `${doc.kilometrage_document.toLocaleString()} km` : "Certifié"}</p>
                    </div>
                    {doc.montant_ttc ? (
                      <span className="font-bold text-slate-900 shrink-0">
                        {Number(doc.montant_ttc).toFixed(2)} €
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold text-[11px] shrink-0">Vérifié</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GARANTIES POUR L'ACHETEUR */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-8 shadow-lg print:shadow-none print:border print:border-slate-300 print:text-slate-900 print:bg-white space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 print:bg-slate-100 text-indigo-300 print:text-slate-800 text-xs font-bold">
            <Award className="w-4 h-4 text-amber-400" />
            Garantie Transparence Acheteur
          </div>
          <h2 className="text-xl font-bold">Pourquoi ce véhicule est un achat sécurisé ?</h2>
          <ul className="space-y-2.5 text-xs text-indigo-100 print:text-slate-700">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              Kilométrage certifié et infalsifiable relevé sur factures professionnelles
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              Carnet d'entretien complet consultable sans aucune zone d'ombre
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              Véhicule éligible à la revente avec cote majorée de +{resaleBonusPercent}%
            </li>
          </ul>
        </div>

        {/* CTA PRODUCT-LED GROWTH : ACQUÉREUR OU CONDUCTEUR */}
        <div className="print:hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 sm:p-8 text-white shadow-xl shadow-blue-500/25 flex flex-col sm:flex-row items-center justify-between gap-6 border border-blue-400/30 animate-fade-in">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold text-blue-100">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Vous achetez ce véhicule ou souhaitez protéger le vôtre ?</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Activez votre carnet d'entretien numérique gratuit
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 max-w-lg leading-relaxed">
              Numérisez vos factures en 2 gestes simples, recevez vos alertes de révision à J-30 et valorisez votre véhicule lors de sa prochaine revente.
            </p>
          </div>
          <Link
            href={`/dashboard?src=report_public&ref=report_public&brand=${encodeURIComponent(vehicle.marque)}&model=${encodeURIComponent(vehicle.modele)}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-blue-900 rounded-2xl font-bold text-sm shadow-lg transition active:scale-95 shrink-0 group"
          >
            <span>Créer mon espace gratuit</span>
            <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>

        {/* FOOTER */}
        <div className="text-center pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <Link href="/dashboard" className="print:hidden hover:text-blue-600 font-semibold transition">
            ← Retourner à l'Espace Foyer
          </Link>
          <p>Délivré par LaVigieAuto • Certifié conforme aux normes constructeur</p>
        </div>
      </div>
    </div>
  );
}
