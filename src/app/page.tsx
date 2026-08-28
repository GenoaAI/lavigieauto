"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  PhoneCall,
  FileCheck2,
  Car,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  FileText,
  Star,
  Users,
  Award,
  ChevronRight,
  Shield,
  Zap,
} from "lucide-react";
import { DocumentDropzone } from "@/components/scanner/DocumentDropzone";
import type { ProcessDocumentResult } from "@/app/actions/documents";
import { getFoyerOverviewAction } from "@/app/actions/foyer";
import { FoyerNameEditor } from "@/components/foyer/FoyerNameEditor";
import { DEFAULT_FOYER_ID } from "@/config/foyer.seed";

export default function LandingPage() {
  const [demoResult, setDemoResult] = useState<any | null>(null);
  const [simulatorKm, setSimulatorKm] = useState<number>(85000);
  const [simulatorAgeYears, setSimulatorAgeYears] = useState<number>(5);
  const [simulatorHasAllInvoices, setSimulatorHasAllInvoices] = useState<boolean>(true);
  const [foyer, setFoyer] = useState<any | null>(null);
  const [foyerVehicles, setFoyerVehicles] = useState<any[]>([]);

  useEffect(() => {
    getFoyerOverviewAction()
      .then((res) => {
        if (res?.foyer) {
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

  // Dynamic simulation calculations
  const calculatedScore = Math.min(
    100,
    Math.max(
      45,
      Math.round(
        100 -
          (simulatorAgeYears > 4 ? (simulatorAgeYears - 4) * 3 : 0) -
          (simulatorKm > 100000 ? 10 : 0) +
          (simulatorHasAllInvoices ? 12 : -20)
      )
    )
  );

  const resaleGainBonus = simulatorHasAllInvoices
    ? Math.round(18000 * 0.08)
    : Math.round(18000 * 0.02);

  return (
    <div className="space-y-24 pb-20">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION & SCAN-FIRST UPLOAD */}
      {/* ========================================================================= */}
      <section id="scan-first" className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 bg-gradient-to-b from-blue-50/70 via-white to-slate-50">
        {/* Background glow circle */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-blue-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            {/* Pill & Foyer Identifier */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 text-blue-800 text-xs font-semibold shadow-sm border border-blue-200/60 animate-fade-in">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>L'assistant d'entretien auto intelligent du foyer</span>
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
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.15]">
              Sécurisez le suivi de l&apos;entretien de vos voitures{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
                en deux gestes simples.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Plus de factures perdues voire d&apos;échéances dépassées et de risques de panne. Déposez votre carte grise et vos factures, l&apos;assistant construit votre plan d&apos;entretien, vous annonce les échéances, et vous aide à prendre rendez-vous simplement avec votre garagiste.
            </p>
          </div>

          {/* DROPZONE ZONE (Scan-First) */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Testez instantanément avec un document :
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Gratuit & Sans Compte
                </span>
              </div>

              {/* Real interactive Dropzone */}
              <DocumentDropzone
                onExtractionSuccess={(result: ProcessDocumentResult) => {
                  if (result.extraction) {
                    setDemoResult(result.extraction);
                  }
                }}
              />

              {/* Sample Buttons for Instant Try without files */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 text-[11px]">Pas de document sous la main ?</span>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleLoadSample("carte_grise")}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition text-[11px] border border-blue-200"
                  >
                    🪪 Exemple Carte Grise Vitara
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample("invoice")}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-slate-700 font-medium transition text-[11px] border border-slate-200"
                  >
                    📄 Exemple Facture 308
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample("ct")}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-slate-700 font-medium transition text-[11px] border border-slate-200"
                  >
                    📑 Exemple PV CT Clio
                  </button>
                </div>
              </div>
            </div>

            {/* DEMO LIVE RESULT DRAWER */}
            {demoResult && (
              <div className="mt-6 bg-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-slate-800 animate-slide-in-right space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
                        {demoResult.documentType === "carte_grise" ? "Carte Grise Officielle Vérifiée" : "Rapprochement IA Effectué"}
                      </p>
                      <h4 className="text-base font-bold text-white">
                        {demoResult.vehicle?.brand || demoResult.vehicle?.make || demoResult.make || "Véhicule"}{" "}
                        {demoResult.vehicle?.model || demoResult.model || ""} —{" "}
                        {demoResult.vehicle?.licensePlate || demoResult.licensePlate || "Immatriculation"}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-400">
                      {demoResult.conformityImpact?.currentScore || 96}%
                    </span>
                    <p className="text-[10px] text-slate-400">Score de Santé</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-800/70 p-3.5 rounded-xl space-y-1">
                    <p className="text-slate-400 text-[11px]">Émetteur vérifié :</p>
                    <p className="font-semibold text-slate-200">
                      {demoResult.garage?.name || (demoResult.documentType === "carte_grise" ? "Ministère de l'Intérieur — ANTS" : "Atelier Professionnel")}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {demoResult.documentType === "carte_grise"
                        ? `1ère Immat : ${demoResult.vehicle?.firstRegistrationDate || demoResult.firstRegistrationDate || "2021"}`
                        : `Date : ${demoResult.invoice?.date || "Récente"}`}
                    </p>
                  </div>
                  <div className="bg-slate-800/70 p-3.5 rounded-xl space-y-1">
                    <p className="text-slate-400 text-[11px]">
                      {demoResult.documentType === "carte_grise" ? "Numéro de série VIN :" : "Kilométrage certifié :"}
                    </p>
                    <p className="font-semibold text-emerald-300 font-mono">
                      {demoResult.documentType === "carte_grise"
                        ? (demoResult.vehicle?.vin || demoResult.vin || "VF3MCXXXXXXXXXX")
                        : `${(demoResult.vehicle?.mileage || demoResult.vehicle?.currentMileage || 0).toLocaleString("fr-FR")} km`}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {demoResult.documentType === "carte_grise"
                        ? `Carburant : ${demoResult.fuelType || "Essence"} • ${demoResult.fiscalPower || 7} CV`
                        : `Montant TTC : ${demoResult.invoice?.totalTTC || "390"} €`}
                    </p>
                  </div>
                </div>

                {/* Operations / Characteristics List */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {demoResult.documentType === "carte_grise" ? "Données techniques extraites de la Carte Grise :" : "Opérations rapprochées au carnet constructeur :"}
                  </p>
                  <div className="space-y-1.5">
                    {(demoResult.invoice?.operations || [
                      { label: "Identification VIN et plaque certifiées", category: "Carte Grise", verified: true },
                      { label: "Plan d'entretien constructeur synchronisé", category: "Plan Officiel", verified: true },
                    ]).map((op: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-800/40 rounded-lg text-xs">
                        <span className="text-slate-200 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          {op.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-blue-900/60 text-blue-300 rounded font-medium">
                          {op.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CT / Confirmation highlight */}
                {demoResult.conformityImpact?.nextAlert && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                      demoResult.documentType === "controle_technique"
                        ? "bg-amber-950/40 border border-amber-800/60 text-amber-200"
                        : "bg-emerald-950/40 border border-emerald-800/60 text-emerald-200"
                    }`}
                  >
                    {demoResult.documentType === "controle_technique" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    )}
                    <span>{demoResult.conformityImpact.nextAlert}</span>
                  </div>
                )}

                {/* Action to create account / view dashboard */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/dashboard"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs transition shadow-lg shadow-blue-600/30"
                  >
                    Sauvegarder dans mon espace Foyer
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDemoResult(null)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium transition"
                  >
                    Fermer l'aperçu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. LA MÉTHODE DES "2 GESTES" (Zero charge mentale) */}
      {/* ========================================================================= */}
      <section id="methode-2-gestes" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <Award className="w-3.5 h-3.5" />
            La Règle d'Or LaVigieAuto
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Deux gestes clefs. Rien de plus.
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Pas besoin d&apos;aller chercher le manuel dans la boîte à gants ni de vous en remettre les yeux fermés à votre garagiste.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-stretch">
          {/* GESTE 1 CARD */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:scale-150 transition" />
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-blue-500/30">
                  1
                </span>
                <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                  À J-30 de l'échéance
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <PhoneCall className="w-6 h-6 text-blue-600" />
                  Vous appelez le garage
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  L&apos;assistant vous propose un email à envoyer à votre garagiste (ou le guide pour lui téléphoner), vous demandez exactement ce dont vous avez besoin pour maintenir votre voiture en bonnes conditions.
                </p>
              </div>

              {/* Mini Preview Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2 font-mono text-slate-700">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
                  <span>Script Garage LaVigieAuto</span>
                  <span className="text-blue-600 font-semibold">Généré sur mesure</span>
                </div>
                <p className="italic text-slate-800">
                  "Bonjour, pour ma 308 (GB-412-XZ) à 62 000 km, je souhaite réserver la révision intermédiaire constructeur et la vidange liquide de frein préconisée..."
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6 flex items-center gap-2 text-xs font-semibold text-blue-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Zéro vocabulaire technique à apprendre
            </div>
          </div>

          {/* GESTE 2 CARD */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:scale-150 transition" />
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-emerald-500/30">
                  2
                </span>
                <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                  Après l'intervention
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-6 h-6 text-emerald-600" />
                  Vous scannez la facture
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Prenez une photo avec votre smartphone ou glissez le PDF. L&apos;assistant analyse chaque document et intègre les éléments détaillés dans le carnet d&apos;entretien du véhicule.
                </p>
              </div>

              {/* Mini Preview Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Carnet de bord actualisé</span>
                  <span className="text-emerald-600 font-bold">100% Automatique</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Courroie & vidange rapprochées • Conformité 94% (A+)
                </div>
                <p className="text-[11px] text-slate-400">Prochaine notification synchronisée sur Google Calendar</p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6 flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Zéro tableau Excel ou saisie manuelle
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SIMULATEUR DE VALORISATION REVENTE & CONFORMITÉ */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Controls */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/60 text-blue-300 text-xs font-semibold border border-blue-700/50">
                <TrendingUp className="w-3.5 h-3.5" />
                Simulateur de Plus-Value Revente
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Un carnet certifié LaVigieAuto fait vendre votre véhicule{" "}
                <span className="text-blue-400">2x plus vite et plus cher</span>.
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Les acheteurs d'occasion recherchent la preuve d'un entretien irréprochable. Ajustez les paramètres pour évaluer la valorisation de votre véhicule :
              </p>

              <div className="space-y-5 pt-2">
                {/* Slider Kilomètres */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Kilométrage actuel :</span>
                    <span className="text-blue-400">{simulatorKm.toLocaleString("fr-FR")} km</span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="220000"
                    step="5000"
                    value={simulatorKm}
                    onChange={(e) => setSimulatorKm(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Slider Age */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Âge du véhicule :</span>
                    <span className="text-blue-400">{simulatorAgeYears} ans</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={simulatorAgeYears}
                    onChange={(e) => setSimulatorAgeYears(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Toggle Invoices */}
                <div className="flex items-center justify-between p-3.5 bg-slate-800/80 rounded-xl border border-slate-700">
                  <span className="text-xs font-medium text-slate-200">Factures & CT numérisés sans trou d'historique</span>
                  <button
                    type="button"
                    onClick={() => setSimulatorHasAllInvoices(!simulatorHasAllInvoices)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      simulatorHasAllInvoices ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {simulatorHasAllInvoices ? "Oui (Dossier complet)" : "Non (Incomplet)"}
                  </button>
                </div>
              </div>
            </div>

            {/* Live Score Display Card */}
            <div className="lg:col-span-5 bg-slate-800/90 rounded-2xl p-6 sm:p-8 border border-slate-700 flex flex-col items-center text-center space-y-5">
              <div className="relative">
                <div className="w-28 h-28 rounded-full border-4 border-blue-500/30 flex items-center justify-center bg-slate-900">
                  <span className="text-3xl font-black text-white">{calculatedScore}%</span>
                </div>
                <div className="absolute -top-1 -right-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black">
                  {calculatedScore >= 90 ? "Grade A+" : calculatedScore >= 80 ? "Grade A" : "Grade B"}
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Score de Conformité Constructeur</h4>
                <p className="text-xs text-slate-400">Reconnu par les acheteurs et réseaux partenaires</p>
              </div>

              <div className="w-full space-y-2 border-t border-slate-700/80 pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bonus valeur revente :</span>
                  <span className="font-bold text-emerald-400">+{resaleGainBonus} € estimés</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Délai moyen de vente :</span>
                  <span className="font-bold text-slate-200">
                    {simulatorHasAllInvoices ? "14 jours (très rapide)" : "35 jours"}
                  </span>
                </div>
              </div>

              <Link
                href="/v/cert-demo-8492"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
              >
                <span>Voir un exemple de Rapport Certifié</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. LE DASHBOARD DU FOYER MULTI-VÉHICULES */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mb-2">
                <Users className="w-3.5 h-3.5" />
                Gestion de Flotte Familiale
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Un seul compte pour toute la famille</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Partagez l'accès avec vos conjoints et enfants. Chacun reçoit ses alertes sans se marcher sur les pieds.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
            >
              Accéder au Tableau de Bord
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <Car className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {foyerVehicles[0] ? `${foyerVehicles[0].marque} ${foyerVehicles[0].modele}` : "Suzuki Vitara"}
              </h4>
              <p className="text-xs text-slate-500">
                {foyerVehicles[0]
                  ? `${foyerVehicles[0].immatriculation} • ${(foyerVehicles[0].kilometrage_actuel || 0).toLocaleString()} km. Suivi officiel constructeur actif.`
                  : "EC-301-JX • 58 400 km. Suivi officiel constructeur actif."}
              </p>
              <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                Score : 96% (A+)
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                <Car className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {foyerVehicles[1] ? `${foyerVehicles[1].marque} ${foyerVehicles[1].modele}` : "Renault Espace IV"}
              </h4>
              <p className="text-xs text-slate-500">
                {foyerVehicles[1]
                  ? `${foyerVehicles[1].immatriculation} • ${(foyerVehicles[1].kilometrage_actuel || 0).toLocaleString()} km. Surveillance prédictive active.`
                  : "FX-563-KZ • 34 200 km. Surveillance prédictive active."}
              </p>
              <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                Agenda Foyer Synchronisé
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Google Calendar Synchro</h4>
              <p className="text-xs text-slate-500">
                Les rappels d'échéances se créent directement dans vos agendas sans application supplémentaire.
              </p>
              <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                Automatique & Silencieux
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. TÉMOIGNAGES CLIENTS */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <div className="flex items-center justify-center gap-1 text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Ce que nos utilisateurs en disent
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Des milliers d'automobilistes ont abandonné les classeurs poussiéreux.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <p className="text-xs text-slate-600 italic leading-relaxed">
              "J'avais toujours peur de me faire avoir au garage. Avec le script LaVigieAuto, j'ai répété au mot près ce qu'il fallait faire pour la courroie. Économie de 320 € sur le devis initial !"
            </p>
            <div className="flex items-center gap-3 pt-2 border-t">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                SL
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Sophie L.</p>
                <p className="text-[11px] text-slate-400">Peugeot 2008 • Bordeaux</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <p className="text-xs text-slate-600 italic leading-relaxed">
              "Nous avons 3 voitures dans la famille dont celle de notre fils jeune conducteur. Le fait de pouvoir déposer la photo de la facture en 2 secondes depuis le parking a changé notre organisation."
            </p>
            <div className="flex items-center gap-3 pt-2 border-t">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                MD
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Marc D.</p>
                <p className="text-[11px] text-slate-400">Famille 3 véhicules • Nantes</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <p className="text-xs text-slate-600 italic leading-relaxed">
              "J'ai vendu mon Tiguan en 8 jours grâce au lien public certifié LaVigieAuto. L'acheteur a pu vérifier chaque vidange et chaque CT sans que j'aie à scanner 15 feuilles."
            </p>
            <div className="flex items-center gap-3 pt-2 border-t">
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
      </section>

      {/* ========================================================================= */}
      {/* 6. FINAL CALL TO ACTION */}
      {/* ========================================================================= */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl shadow-blue-600/30">
          <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Prêt à libérer votre esprit de l'entretien auto ?
          </h3>
          <p className="text-blue-100 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Commencez dès aujourd'hui en déposant votre première facture. Aucun numéro de carte bancaire requis.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
            <Link
              href="/#scan-first"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-blue-700 rounded-xl font-bold text-sm shadow hover:bg-blue-50 transition active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              Scanner mon 1er document gratuitement
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-800/80 hover:bg-blue-900 text-white rounded-xl font-semibold text-sm transition"
            >
              Voir la démo du Tableau de Bord
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
