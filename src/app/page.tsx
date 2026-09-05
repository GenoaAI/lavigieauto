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
    <div className="space-y-24 sm:space-y-32 pb-24">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION & SCAN-FIRST (Épuré & Focalisé) */}
      {/* ========================================================================= */}
      <section id="scan-first" className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 bg-gradient-to-b from-blue-50/60 via-white to-slate-50/40">
        {/* Soft radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-5 max-w-3xl mx-auto">
            {/* Pill & Foyer Identifier */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200/60 shadow-2xs">
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
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.12]">
              Sécurisez le suivi de l&apos;entretien de vos voitures{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                en deux gestes simples.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Fini les factures égarées et les révisions oubliées. Déposez vos documents : l&apos;assistant met à jour votre carnet constructeur, anticipe les échéances et vous guide pour réserver chez votre garagiste.
            </p>
          </div>

          {/* DROPZONE ZONE */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="bg-white p-5 sm:p-7 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Testez instantanément avec un document :
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
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
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
                <span className="text-slate-500 text-[11px]">Pas de document sous la main ?</span>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleLoadSample("carte_grise")}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition text-[11px] border border-blue-200/70"
                  >
                    🪪 Exemple Carte Grise
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample("invoice")}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition text-[11px] border border-slate-200"
                  >
                    📄 Exemple Facture
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample("ct")}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition text-[11px] border border-slate-200"
                  >
                    📑 Exemple Contrôle Tech.
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Bénéfice 1 */}
          <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Sérénité au garage
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Fini les doutes face au devis. L&apos;assistant vous indique précisément les opérations requises selon les préconisations du constructeur et votre kilométrage réel.
            </p>
          </div>

          {/* Bénéfice 2 */}
          <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Zéro corvée administrative
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Une simple photo de facture suffit. Dates, kilométrages, fluides et pièces changées sont classés et archivés sans saisie manuelle.
            </p>
          </div>

          {/* Bénéfice 3 */}
          <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Plus-value à la revente
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Un historique limpide, daté et infalsifiable. Vendez votre véhicule jusqu&apos;à 2 fois plus vite grâce à un rapport d&apos;entretien certifié qui rassure immédiatement les acheteurs.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. LA MÉTHODE DES "2 GESTES" (Visuelle, rythmée, fluide) */}
      {/* ========================================================================= */}
      <section id="methode-2-gestes" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/60">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>La Règle d&apos;Or LaVigieAuto</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Deux gestes clefs. Rien de plus.
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            Pas de manuel à feuilleter, pas de tableau Excel à remplir. Tout est guidé pour vous faire gagner du temps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* GESTE 1 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-blue-500/20">
                  1
                </span>
                <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                  À l&apos;échéance
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-blue-600" />
                  Vous contactez le garage
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  L&apos;assistant prépare le message précis à adresser à votre garagiste : vous demandez exactement ce dont votre véhicule a besoin, sans jargon technique.
                </p>
              </div>

              {/* Aperçu Message */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-2 text-slate-700">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Script Garage sur mesure</span>
                  <span className="text-blue-600 font-semibold">Généré en 1 clic</span>
                </div>
                <p className="italic text-slate-800">
                  &ldquo;Bonjour, pour ma 308 (GB-412-XZ) à 62 000 km, je souhaite planifier la révision préconisée et la purge du liquide de frein...&rdquo;
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6 flex items-center gap-2 text-xs font-semibold text-blue-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Zéro vocabulaire mécanique à mémoriser</span>
            </div>
          </div>

          {/* GESTE 2 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-emerald-500/20">
                  2
                </span>
                <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                  Après l&apos;intervention
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-600" />
                  Vous photographiez la facture
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Prenez une photo depuis votre smartphone. L&apos;assistant extrait les opérations, actualise l&apos;odomètre et synchronise les prochaines dates de révision.
                </p>
              </div>

              {/* Aperçu Carnet */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Carnet de bord actualisé</span>
                  <span className="text-emerald-600 font-bold">100% Automatique</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Courroie &amp; vidange rapprochées • Conformité 94% (A+)</span>
                </div>
                <p className="text-[11px] text-slate-400">Prochaine alerte synchronisée sur Google Calendar</p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6 flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Zéro saisie manuelle de kilométrage</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. POUR ALLER PLUS LOIN (Teasers progressifs cliquables) */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Conçu pour simplifier la vie de tout le foyer
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Au-delà du scan immédiat, profitez des fonctionnalités qui valorisent et organisent vos véhicules au quotidien.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Teaser 1 : Certificat de Revente */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Rapport Certifié Revente
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Générez un certificat numérique public pour prouver l&apos;entretien irréprochable de votre véhicule lors de la vente.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs flex items-center justify-between">
                <span className="text-slate-500 font-medium">Gain estimé à la vente :</span>
                <span className="font-bold text-emerald-600">+1 440 € (Grade A+)</span>
              </div>
            </div>
            <Link
              href="/v/cert-demo-8492"
              className="inline-flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-700 pt-2 border-t border-slate-100 group"
            >
              <span>Voir un exemple de certificat</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Teaser 2 : Flotte Familiale */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Espace Foyer &amp; Flotte
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Centralisez les voitures du foyer sur un seul tableau de bord partagé avec conjoints et enfants.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs flex items-center justify-between">
                <span className="text-slate-500 font-medium">Véhicules synchronisés :</span>
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
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Teaser 3 : Calendrier */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Rappels sur votre Agenda
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Les rappels d&apos;échéances et de contrôle technique se créent directement dans Google Calendar sans application supplémentaire.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs flex items-center justify-between">
                <span className="text-slate-500 font-medium">Notification proactive :</span>
                <span className="font-bold text-blue-600">Rappel à J-30</span>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-700 pt-2 border-t border-slate-100 group"
            >
              <span>Configurer les rappels</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. RÉFÉRENTIEL CONSTRUCTEUR & CARNETS OFFICIELS (MAILLAGE SEO) */}
      {/* ========================================================================= */}
      <section id="programmes-entretien" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-7 sm:p-10 border border-slate-200/80 shadow-xs space-y-9">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200/60">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Référentiel Mécanique Constructeur</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                Programmes d&apos;entretien constructeur &amp; carnets par modèle
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Consultez les périodicités officielles de révision, vidange, courroie et normes d&apos;huile homologuées pour les véhicules les plus populaires.
              </p>
            </div>
            <Link
              href="/entretien"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition self-start md:self-auto shrink-0"
            >
              <span>Explorer l&apos;intégralité du catalogue (30 motorisations)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Quick Access by Brand (6 brands) */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Accès direct par marque
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { name: "Peugeot", slug: "peugeot", count: "10 motorisations" },
                { name: "Renault", slug: "renault", count: "8 motorisations" },
                { name: "Dacia", slug: "dacia", count: "4 motorisations" },
                { name: "Citroën", slug: "citroen", count: "3 motorisations" },
                { name: "Volkswagen", slug: "volkswagen", count: "4 motorisations" },
                { name: "Toyota", slug: "toyota", count: "1 motorisation" },
              ].map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/entretien/${brand.slug}`}
                  className="group p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 transition text-left flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition">
                      {brand.name}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                  </div>
                  <span className="text-[11px] text-slate-500 group-hover:text-blue-700 font-medium">
                    {brand.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* 4 Featured Models */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Fiches d&apos;entretien les plus consultées
              </p>
              <Link
                href="/entretien"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Voir les 30 fiches</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sandero 2 TCe */}
              <Link
                href="/entretien/dacia/sandero-2/0-9-tce-90"
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-blue-600 mb-1">
                    <span>Dacia Sandero 2</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px]">Stepway</span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition">
                    0.9 TCe 90 ch
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                    Vidange 1 an / 20 000 km (normes RN0710 / RN17), distribution par chaîne.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                  <span>Consulter le carnet</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Clio 4 dCi */}
              <Link
                href="/entretien/renault/clio-4/1-5-dci-90"
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-amber-600 mb-1">
                    <span>Renault Clio 4</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px]">Diesel</span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition">
                    1.5 dCi 90 ch
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                    Vidange 1 an / 20 000 km (RN0720 Low SAPS FAP), courroie 6 ans / 150 000 km.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                  <span>Consulter le carnet</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* 208 PureTech */}
              <Link
                href="/entretien/peugeot/208/1-2-puretech-82"
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-600 mb-1">
                    <span>Peugeot 208</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px]">PureTech</span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition">
                    1.2 PureTech 82 ch
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                    Vidange 1 an / 15 000 km (PSA B71 2312), contrôle courroie 6 ans / 100 000 km.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                  <span>Consulter le carnet</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* 3008 PureTech */}
              <Link
                href="/entretien/peugeot/3008/1-2-puretech-130"
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-600 mb-1">
                    <span>Peugeot 3008</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px]">SUV</span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition">
                    1.2 PureTech 130 ch
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                    Vidange 1 an / 15 000 km (PSA B71 2312 0W-30), intervalle 6 ans / 100 000 km.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                  <span>Consulter le carnet</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>

          {/* Invitation banner inside section */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-900">Votre véhicule n&apos;est pas dans cette sélection ?</span> Déposez votre carte grise ou une facture pour créer son carnet officiel personnalisé.
              </p>
            </div>
            <Link
              href="/#scan-first"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shrink-0 transition"
            >
              Scanner ma carte grise
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. TÉMOIGNAGES & CONFIANCE (Aéré & Rassurant) */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-10">
          <div className="flex items-center justify-center gap-1 text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Ce que nos utilisateurs en disent
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Des centaines d&apos;automobilistes ont abandonné les classeurs papier.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <p className="text-xs text-slate-600 italic leading-relaxed">
              &ldquo;J&apos;avais toujours peur de me faire avoir au garage. Avec le script LaVigieAuto, j&apos;ai répété au mot près ce qu&apos;il fallait faire pour la courroie. Économie de 320 € sur le devis initial !&rdquo;
            </p>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                SL
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Sophie L.</p>
                <p className="text-[11px] text-slate-400">Peugeot 2008 • Bordeaux</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <p className="text-xs text-slate-600 italic leading-relaxed">
              &ldquo;Nous avons 3 voitures dans la famille. Le fait de pouvoir photographier la facture en 2 secondes depuis le parking a transformé notre gestion d&apos;entretien.&rdquo;
            </p>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                MD
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Marc D.</p>
                <p className="text-[11px] text-slate-400">Famille 3 véhicules • Nantes</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <p className="text-xs text-slate-600 italic leading-relaxed">
              &ldquo;J&apos;ai vendu mon véhicule en 8 jours grâce au lien certifié LaVigieAuto. L&apos;acheteur a pu vérifier chaque vidange et chaque CT sans que j&apos;aie à imprimer 15 feuilles.&rdquo;
            </p>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                AB
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Alexandre B.</p>
                <p className="text-[11px] text-slate-400">VW Tiguan • Paris</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reassurance pills */}
        <div className="mt-10 pt-8 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>Données strictement privées &amp; chiffrées</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Conforme préconisations constructeurs</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span>Hébergement souverain &amp; conforme RGPD</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FINAL CALL TO ACTION (Aéré & Convertissant) */}
      {/* ========================================================================= */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl shadow-blue-600/20">
          <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Prêt à libérer votre esprit de l&apos;entretien auto ?
          </h3>
          <p className="text-blue-100 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Commencez dès aujourd&apos;hui en déposant votre première facture ou carte grise. Aucun moyen de paiement requis.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3.5 pt-2">
            <Link
              href="/#scan-first"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-blue-700 rounded-xl font-bold text-sm shadow hover:bg-blue-50 transition active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Scanner mon 1er document gratuitement</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-800/80 hover:bg-blue-900 text-white rounded-xl font-semibold text-sm transition"
            >
              <span>Accéder au Tableau de Bord</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
