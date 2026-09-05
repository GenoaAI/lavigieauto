"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Sparkles,
  PhoneCall,
  FileCheck2,
  Car,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Star,
  Users,
  Award,
  ChevronRight,
  Zap,
  BookOpen,
  Lock,
} from "lucide-react";
import { DocumentDropzone } from "@/components/scanner/DocumentDropzone";
import type { ProcessDocumentResult } from "@/app/actions/documents";
import { getFoyerOverviewAction } from "@/app/actions/foyer";
import { FoyerNameEditor } from "@/components/foyer/FoyerNameEditor";
import { DEFAULT_FOYER_ID } from "@/config/foyer.seed";

export default function LandingPage() {
  const router = useRouter();
  const [demoResult, setDemoResult] = useState<any | null>(null);

  const [foyer, setFoyer] = useState<any | null>(null);
  const [foyerVehicles, setFoyerVehicles] = useState<any[]>([]);

  useEffect(() => {
    getFoyerOverviewAction()
      .then((res) => {
        if (res?.foyer && res.role !== "guest") {
          setFoyer(res.foyer);
        }
        if (res?.vehicles && res.vehicles.length > 0) {
          setFoyerVehicles(res.vehicles);
        }
      })
      .catch(() => {});
  }, []);

  // Simulating sample documents for instant one-click testing
  const handleLoadSample = (type: "invoice" | "ct" | "carte_grise") => {
    if (type === "carte_grise") {
      setDemoResult({
        documentType: "Certificat d'Immatriculation (Carte Grise)",
        garage: {
          name: "Ministère de l'Intérieur — ANTS (SIV)",
          siret: "Certificat Officiel",
          address: "France",
        },
        vehicle: {
          licensePlate: "EC-301-JX",
          brand: "Suzuki",
          model: "Vitara 1.4 Boosterjet Hybrid 129ch",
          mileage: 58400,
        },
        invoice: {
          date: "12/04/2021",
          totalTTC: 0,
          operations: [
            { label: "Identification VIN certifiée (Ligne E)", category: "Véhicule", verified: true },
            { label: "Plan constructeur Suzuki synchronisé (Ligne D.2)", category: "Plan Officiel", verified: true },
            { label: "Puissance fiscale 7 CV • Norme Euro 6", category: "Caractéristiques", verified: true },
          ],
        },
        conformityImpact: {
          scoreGain: "+100%",
          currentScore: 96,
          grade: "A+",
          nextAlert: "Contrôle Technique & Révision Suzuki synchronisés",
        },
      });
    } else if (type === "invoice") {
      setDemoResult({
        documentType: "Facture d'Entretien",
        garage: {
          name: "SARL GARAGE HELIERE C. & S.",
          siret: "49995278600014",
          address: "Route de Vibraye, 72320 Saint-Maixent",
        },
        vehicle: {
          licensePlate: "GB-412-XZ",
          brand: "Peugeot",
          model: "308 II 1.2 PureTech 130ch",
          mileage: 62450,
        },
        invoice: {
          date: "14/02/2026",
          totalTTC: 428.5,
          operations: [
            { label: "Vidange moteur Huile Synthèse 0W30", category: "Moteur", verified: true },
            { label: "Remplacement Filtre à Huile + Joint", category: "Moteur", verified: true },
            { label: "Remplacement Filtre d'Habitacle Anti-Allergène", category: "Habitacle", verified: true },
            { label: "Contrôle visuel 35 points de sécurité", category: "Sécurité", verified: true },
          ],
        },
        conformityImpact: {
          scoreGain: "+12%",
          currentScore: 94,
          grade: "A+",
          nextAlert: "Contrôle Technique obligatoire dans 8 mois",
        },
      });
    } else {
      setDemoResult({
        documentType: "Procès-Verbal Contrôle Technique",
        garage: {
          name: "Centre Contrôle Technique Autosur",
          siret: "391 827 456 00021",
          address: "89 Avenue de la République, 75011 Paris",
        },
        vehicle: {
          licensePlate: "AA-928-RT",
          brand: "Renault",
          model: "Clio IV 0.9 TCe 90",
          mileage: 78100,
        },
        invoice: {
          date: "10/01/2026",
          totalTTC: 85.0,
          operations: [
            { label: "Contrôle réglementaire périodique VL", category: "Contrôle Technique", verified: true },
            { label: "Défaillance Mineure : 5.2.3.e.1 Pneumatiques usure anormale AVD", category: "Vulgarisé par l'assistant", verified: false },
          ],
        },
        conformityImpact: {
          scoreGain: "+5%",
          currentScore: 88,
          grade: "A",
          nextAlert: "Pneu avant droit à surveiller avant usure critique",
        },
      });
    }
  };



  return (
    <div className="space-y-16 sm:space-y-20 pb-20">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION & SCAN-FIRST (Épuré & Focalisé) */}
      {/* ========================================================================= */}
      <section id="scan-first" className="relative overflow-hidden pt-5 pb-8 sm:pt-12 sm:pb-16 bg-gradient-to-b from-blue-50/50 via-white to-slate-50/30">
        {/* Soft radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto">
            {/* Pill & Foyer Identifier */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-blue-50 text-blue-800 text-[11px] sm:text-xs font-semibold border border-blue-200/60 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>L&apos;assistant d&apos;entretien automobile du foyer</span>
              </div>

              {foyer && (
                <FoyerNameEditor
                  initialName={foyer.nom || "Foyer LaVigieAuto"}
                  householdId={foyer.id || DEFAULT_FOYER_ID}
                  variant="hero"
                />
              )}
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight">
              Sécurisez le suivi de vos véhicules{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                en deux gestes simples.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-base text-slate-600 leading-snug sm:leading-relaxed max-w-xl mx-auto">
              Fini les factures égarées et les révisions oubliées. Déposez vos documents : l&apos;assistant met à jour votre carnet constructeur et anticipe les échéances.
            </p>
          </div>

          {/* DROPZONE ZONE */}
          <div className="mt-5 sm:mt-8 max-w-2xl mx-auto">
            <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-200/80">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Testez instantanément :
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                  Gratuit &amp; Sans Compte
                </span>
              </div>

              {/* Dropzone */}
              <DocumentDropzone
                onExtractionSuccess={(result: ProcessDocumentResult) => {
                  if (result.extraction) {
                    setDemoResult(result.extraction);
                  }
                }}
              />

              {/* Sample Chips */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 text-[11px]">Pas de document ? Testez en 1 clic :</span>
                <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex">
                  <button
                    type="button"
                    onClick={() => handleLoadSample("carte_grise")}
                    className="px-2 py-1.5 sm:px-2.5 sm:py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition text-[11px] border border-blue-200/70 cursor-pointer text-center truncate"
                  >
                    🪪 Carte Grise
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample("invoice")}
                    className="px-2 py-1.5 sm:px-2.5 sm:py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition text-[11px] border border-slate-200 cursor-pointer text-center truncate"
                  >
                    📄 Facture
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample("ct")}
                    className="px-2 py-1.5 sm:px-2.5 sm:py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition text-[11px] border border-slate-200 cursor-pointer text-center truncate"
                  >
                    📑 Contrôle T.
                  </button>
                </div>
              </div>
            </div>

            {/* DEMO LIVE RESULT CARD */}
            {demoResult && (
              <div className="mt-6 bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-800 animate-slide-in-right space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                        Document authentifié avec succès
                      </p>
                      <h4 className="text-base font-bold text-white">
                        {demoResult.vehicle?.brand || demoResult.vehicle?.make || demoResult.make || "Véhicule"}{" "}
                        {demoResult.vehicle?.model || demoResult.model || ""} —{" "}
                        <span className="font-mono text-slate-300">
                          {demoResult.vehicle?.licensePlate || demoResult.licensePlate || "Immatriculation"}
                        </span>
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-400">
                      {demoResult.conformityImpact?.currentScore || 96}%
                    </span>
                    <p className="text-[10px] text-slate-400 font-medium">Santé mécanique</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div className="bg-slate-800/60 p-3.5 rounded-xl space-y-1 border border-slate-700/60">
                    <p className="text-slate-400 text-[11px]">Source identifiée :</p>
                    <p className="font-semibold text-slate-200">
                      {demoResult.garage?.name || "Atelier Professionnel"}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {demoResult.documentType === "carte_grise"
                        ? `Mise en circ. : ${demoResult.vehicle?.firstRegistrationDate || "2021"}`
                        : `Date : ${demoResult.invoice?.date || "Récente"}`}
                    </p>
                  </div>
                  <div className="bg-slate-800/60 p-3.5 rounded-xl space-y-1 border border-slate-700/60">
                    <p className="text-slate-400 text-[11px]">
                      {demoResult.documentType === "carte_grise" ? "Numéro de série VIN :" : "Kilométrage certifié :"}
                    </p>
                    <p className="font-semibold text-emerald-300 font-mono">
                      {demoResult.documentType === "carte_grise"
                        ? (demoResult.vehicle?.vin || "VF3MCXXXXXXXXXX")
                        : `${(demoResult.vehicle?.mileage || demoResult.vehicle?.currentMileage || 0).toLocaleString("fr-FR")} km`}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {demoResult.documentType === "carte_grise"
                        ? "Certifié par les registres d'immatriculation"
                        : `Montant : ${demoResult.invoice?.totalTTC ? `${demoResult.invoice.totalTTC} € TTC` : "Vérifié"}`}
                    </p>
                  </div>
                </div>

                {/* Operations */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Opérations rapprochées au carnet constructeur :
                  </p>
                  <div className="space-y-1.5">
                    {(demoResult.invoice?.operations || [
                      { label: "Identification VIN et plaque certifiées", category: "Officiel" },
                      { label: "Plan d'entretien constructeur synchronisé", category: "Plan Officiel" },
                    ]).map((op: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-slate-800/40 rounded-xl text-xs border border-slate-800">
                        <span className="text-slate-200 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{op.label}</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded-md font-medium shrink-0 ml-2">
                          {op.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next Alert */}
                {demoResult.conformityImpact?.nextAlert && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                      demoResult.documentType === "controle_technique"
                        ? "bg-amber-950/40 border border-amber-800/60 text-amber-200"
                        : "bg-emerald-950/40 border border-emerald-800/60 text-emerald-200"
                    }`}
                  >
                    {demoResult.documentType === "controle_technique" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>{demoResult.conformityImpact.nextAlert}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/dashboard");
                      router.refresh();
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs transition shadow-lg shadow-blue-600/30 cursor-pointer"
                  >
                    <span>Sauvegarder dans mon espace Foyer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoResult(null)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium transition"
                  >
                    Fermer l&apos;aperçu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. LES 3 BÉNÉFICES CLÉS (Bénéfices directs, zéro jargon) */}
      {/* ========================================================================= */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* Bénéfice 1 */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-sm transition space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Sérénité au garage
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
              Fini les doutes face au devis. Préconisations constructeur précises selon votre kilométrage réel.
            </p>
          </div>

          {/* Bénéfice 2 */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-sm transition space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Zéro corvée papier
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
              Une simple photo de facture classe et met à jour automatiquement l&apos;historique et l&apos;odomètre.
            </p>
          </div>

          {/* Bénéfice 3 */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-sm transition space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Plus-value à la revente
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
              Historique daté et infalsifiable. Vendez votre véhicule jusqu&apos;à 2x plus vite avec un rapport certifié.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. LA MÉTHODE DES "2 GESTES" (Visuelle, rythmée, fluide) */}
      {/* ========================================================================= */}
      <section id="methode-2-gestes" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/60">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>La Règle d&apos;Or LaVigieAuto</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            Deux gestes clefs. Rien de plus.
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            Pas de manuel à feuilleter, pas de tableau Excel. Tout est guidé pour vous faire gagner du temps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch">
          {/* GESTE 1 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shadow-sm shadow-blue-500/20">
                  1
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                  À l&apos;échéance
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-blue-600" />
                  Vous contactez le garage
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  L&apos;assistant prépare le message précis à adresser à votre garagiste : vous demandez exactement ce dont votre véhicule a besoin, sans jargon.
                </p>
              </div>

              {/* Aperçu Message */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1 text-slate-700">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Script Garage généré</span>
                  <span className="text-blue-600 font-semibold">1 clic</span>
                </div>
                <p className="italic text-slate-800 text-[11px]">
                  &ldquo;Bonjour, pour ma 308 (GB-412-XZ) à 62 000 km, je souhaite planifier la révision préconisée et la purge du liquide de frein...&rdquo;
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center gap-2 text-xs font-semibold text-blue-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zéro vocabulaire mécanique à mémoriser</span>
            </div>
          </div>

          {/* GESTE 2 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shadow-sm shadow-emerald-500/20">
                  2
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                  Après l&apos;intervention
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  Vous photographiez la facture
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Prenez une photo depuis votre smartphone. L&apos;assistant extrait les opérations, actualise l&apos;odomètre et synchronise les prochaines dates.
                </p>
              </div>

              {/* Aperçu Carnet */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Carnet de bord actualisé</span>
                  <span className="text-emerald-600 font-bold">Automatique</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-800 font-medium text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Vidange &amp; filtres rapprochés • Conformité 94% (A+)</span>
                </div>
                <p className="text-[10px] text-slate-400">Prochaine alerte synchronisée sur Google Calendar</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zéro saisie manuelle de kilométrage</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. POUR ALLER PLUS LOIN (Teasers progressifs cliquables) */}
      {/* ========================================================================= */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 max-w-xl mx-auto mb-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Conçu pour simplifier la vie de tout le foyer
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Au-delà du scan immédiat, découvrez les fonctionnalités qui valorisent et organisent vos véhicules.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* Teaser 1 : Certificat de Revente */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Rapport Certifié Revente
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Certificat numérique public pour prouver l&apos;entretien irréprochable de votre véhicule lors de la vente.
              </p>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 text-[11px] flex items-center justify-between">
                <span className="text-slate-500">Gain estimé vente :</span>
                <span className="font-bold text-emerald-600">+1 440 € (A+)</span>
              </div>
            </div>
            <Link
              href="/v/cert-demo-8492"
              className="inline-flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-700 pt-2 border-t border-slate-100 group"
            >
              <span>Voir un exemple de certificat</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Teaser 2 : Flotte Familiale */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Espace Foyer &amp; Flotte
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Centralisez les voitures du foyer sur un seul tableau de bord partagé avec conjoints et enfants.
              </p>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 text-[11px] flex items-center justify-between">
                <span className="text-slate-500">Véhicules synchronisés :</span>
                <span className="font-bold text-slate-800">
                  {foyerVehicles.length > 0 ? `${foyerVehicles.length} voiture(s)` : "Multi-véhicules"}
                </span>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-700 pt-2 border-t border-slate-100 group"
            >
              <span>Accéder au Tableau de bord</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Teaser 3 : Calendrier */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Rappels sur votre Agenda
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Les rappels d&apos;échéances et de contrôle technique se créent directement dans Google Calendar.
              </p>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 text-[11px] flex items-center justify-between">
                <span className="text-slate-500">Notification proactive :</span>
                <span className="font-bold text-blue-600">Rappel à J-30</span>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-700 pt-2 border-t border-slate-100 group"
            >
              <span>Configurer les rappels</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. RÉFÉRENTIEL CONSTRUCTEUR & CARNETS OFFICIELS (MAILLAGE SEO COMPACT) */}
      {/* ========================================================================= */}
      <section id="programmes-entretien" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200/60">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Référentiel Mécanique Constructeur</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950">
              Programmes d&apos;entretien constructeur &amp; carnets par modèle
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Consultez les périodicités officielles de révision, vidange, courroie et normes d&apos;huile homologuées pour les marques les plus populaires.
            </p>
            {/* Quick brand pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { name: "Peugeot", slug: "peugeot" },
                { name: "Renault", slug: "renault" },
                { name: "Dacia", slug: "dacia" },
                { name: "Citroën", slug: "citroen" },
                { name: "Volkswagen", slug: "volkswagen" },
                { name: "Toyota", slug: "toyota" },
              ].map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/entretien/${brand.slug}`}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium transition"
                >
                  {brand.name}
                </Link>
              ))}
            </div>
            {/* Fiches d'entretien populaires */}
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Plans d&apos;entretien les plus consultés :
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href="/entretien/peugeot/208-2/1-5-bluehdi-100"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-medium border border-blue-200/70 transition"
                >
                  <span>Peugeot 208 1.5 BlueHDi</span>
                  <span className="text-[10px] bg-blue-200/60 text-blue-900 px-1 py-0.2 rounded font-bold">100 ch</span>
                </Link>
                <Link
                  href="/entretien/dacia/sandero-2/0-9-tce-90"
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium transition"
                >
                  Dacia Sandero 2 TCe
                </Link>
                <Link
                  href="/entretien/renault/clio-4/1-5-dci-90"
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium transition"
                >
                  Renault Clio 4 dCi
                </Link>
                <Link
                  href="/entretien/peugeot/208/1-2-puretech-82"
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium transition"
                >
                  Peugeot 208 PureTech
                </Link>
              </div>
            </div>
          </div>
          <Link
            href="/entretien"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition shrink-0"
          >
            <span>Explorer les 32 programmes d&apos;entretien</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. TÉMOIGNAGES & CONFIANCE (Aéré & Rassurant) */}
      {/* ========================================================================= */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-8">
          <div className="flex items-center justify-center gap-1 text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Ce que nos utilisateurs en disent
          </h3>
          <p className="text-xs text-slate-500">
            Des centaines d&apos;automobilistes ont abandonné les classeurs papier.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <p className="text-xs text-slate-600 italic leading-relaxed">
              &ldquo;J&apos;avais toujours peur de me faire avoir au garage. Avec le script LaVigieAuto, j&apos;ai répété au mot près ce qu&apos;il fallait faire. Économie de 320 € sur le devis !&rdquo;
            </p>
            <div className="flex items-center gap-2.5 pt-2.5 border-t border-slate-100">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">
                SL
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Sophie L.</p>
                <p className="text-[10px] text-slate-400">Peugeot 2008 • Bordeaux</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <p className="text-xs text-slate-600 italic leading-relaxed">
              &ldquo;Nous avons 3 voitures dans la famille. Le fait de pouvoir photographier la facture en 2 secondes depuis le parking a transformé notre gestion d&apos;entretien.&rdquo;
            </p>
            <div className="flex items-center gap-2.5 pt-2.5 border-t border-slate-100">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">
                MD
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Marc D.</p>
                <p className="text-[10px] text-slate-400">Famille 3 voitures • Nantes</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <p className="text-xs text-slate-600 italic leading-relaxed">
              &ldquo;J&apos;ai vendu mon véhicule en 8 jours grâce au lien certifié LaVigieAuto. L&apos;acheteur a pu vérifier chaque vidange et chaque CT en toute confiance.&rdquo;
            </p>
            <div className="flex items-center gap-2.5 pt-2.5 border-t border-slate-100">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center">
                AB
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Alexandre B.</p>
                <p className="text-[10px] text-slate-400">VW Tiguan • Paris</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reassurance pills */}
        <div className="mt-8 pt-6 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>Données privées &amp; chiffrées</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Conforme préconisations constructeurs</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span>Hébergement souverain RGPD</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FINAL CALL TO ACTION (Aéré & Convertissant) */}
      {/* ========================================================================= */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center space-y-5 shadow-lg shadow-blue-600/20">
          <h3 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            Prêt à libérer votre esprit de l&apos;entretien auto ?
          </h3>
          <p className="text-blue-100 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Commencez dès aujourd&apos;hui en déposant votre première facture ou carte grise. Aucun moyen de paiement requis.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-1">
            <Link
              href="/#scan-first"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-blue-700 rounded-xl font-bold text-xs sm:text-sm shadow hover:bg-blue-50 transition active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Scanner mon 1er document gratuitement</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-800/80 hover:bg-blue-900 text-white rounded-xl font-semibold text-xs sm:text-sm transition"
            >
              <span>Accéder au Tableau de Bord</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
