"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Gauge,
  Calendar,
  Sparkles,
  Mail,
  Loader2,
  Printer,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  BellRing,
} from "lucide-react";
import { VehicleMaintenanceData, MaintenanceInterval, MaintenanceBundle } from "@/types/maintenance";
import { recordMicroConversionAction } from "@/app/actions/analytics";

export interface MaintenanceEstimatorProps {
  data?: VehicleMaintenanceData;
  brand?: string;
  model?: string;
  engine?: string;
  brandSlug?: string;
  modelSlug?: string;
  engineSlug?: string;
  intervals?: MaintenanceInterval[];
  bundles?: MaintenanceBundle[];
}

export function MaintenanceEstimator({
  data,
  brand,
  model,
  engine,
  brandSlug,
  modelSlug,
  engineSlug,
  intervals,
  bundles,
}: MaintenanceEstimatorProps) {
  const router = useRouter();

  const resolvedBrand = brand || data?.brand || "";
  const resolvedModel = model || data?.model || "";
  const resolvedEngine = engine || data?.engine || "";
  const resolvedBrandSlug = brandSlug || data?.brandSlug || resolvedBrand;
  const resolvedModelSlug = modelSlug || data?.modelSlug || resolvedModel;
  const resolvedEngineSlug = engineSlug || data?.engineSlug || resolvedEngine;
  const resolvedIntervals = intervals || data?.intervals || [];
  const resolvedBundles = bundles || data?.costOptimizationBundles || [];

  // Paliers rapides standards (chips) adaptés au marché automobile français
  const quickPills = [15000, 30000, 45000, 60000, 90000, 120000];

  const defaultKm = 45000;
  const [currentMileage, setCurrentMileage] = useState<number>(defaultKm);
  const [rawMileage, setRawMileage] = useState<string>(defaultKm.toLocaleString("fr-FR"));
  const [email, setEmail] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Gestion de la saisie utilisateur avec formatage numérique fluide
  const handleMileageChange = (value: string) => {
    const numericStr = value.replace(/\D/g, "");
    if (!numericStr) {
      setRawMileage("");
      setCurrentMileage(0);
      return;
    }
    const num = Math.min(parseInt(numericStr, 10), 400000);
    setCurrentMileage(num);
    setRawMileage(num.toLocaleString("fr-FR"));
  };

  const handleSelectPill = (km: number) => {
    setCurrentMileage(km);
    setRawMileage(km.toLocaleString("fr-FR"));
  };

  // Calcul déterministe de la prochaine échéance constructeur
  const estimationResult = useMemo(() => {
    if (!resolvedIntervals || resolvedIntervals.length === 0) {
      return null;
    }

    // Ensemble de tous les multiples d'intervalles jusqu'à 400 000 km
    const milestonesSet = new Set<number>();
    resolvedIntervals.forEach((interval) => {
      const step = interval.intervalKm;
      if (step > 0) {
        for (let m = step; m <= 400000; m += step) {
          milestonesSet.add(m);
        }
      }
    });

    if (milestonesSet.size === 0) {
      for (let m = 20000; m <= 400000; m += 20000) {
        milestonesSet.add(m);
      }
    }

    const sortedMilestones = Array.from(milestonesSet).sort((a, b) => a - b);
    let nextMilestoneKm = sortedMilestones.find((m) => m > currentMileage);

    if (!nextMilestoneKm) {
      const minStep = Math.min(...resolvedIntervals.map((i) => i.intervalKm).filter((k) => k > 0)) || 20000;
      nextMilestoneKm = currentMileage + minStep;
    }

    const remainingKm = Math.max(0, nextMilestoneKm - currentMileage);

    // Rythme moyen français : ~15 000 km/an -> delta / 1250 arrondi à l'entier le plus proche (min 1 mois)
    const estimatedMonths = Math.max(1, Math.round(remainingKm / 1250));

    // Opérations dues au jalon cible (nextMilestoneKm % intervalKm === 0)
    const dueOperations = resolvedIntervals.filter(
      (interval) => interval.intervalKm > 0 && nextMilestoneKm % interval.intervalKm === 0
    );

    const activeOperations = dueOperations.length > 0 ? dueOperations : resolvedIntervals;

    const totalMinCost = activeOperations.reduce((sum, op) => sum + (op.estimatedCostMin || 0), 0);
    const totalMaxCost = activeOperations.reduce((sum, op) => sum + (op.estimatedCostMax || 0), 0);

    // Recherche d'un pack remisé correspondant au palier
    const matchingBundle = resolvedBundles.find((b) =>
      b.title.toLowerCase().includes(`${nextMilestoneKm / 1000}`)
    );

    return {
      nextMilestoneKm,
      remainingKm,
      estimatedMonths,
      dueOperations: activeOperations,
      totalMinCost,
      totalMaxCost,
      matchingBundle,
    };
  }, [resolvedIntervals, currentMileage, resolvedBundles]);

  // Action Email Submit
  const handleEmailCTA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setIsEmailLoading(true);

    try {
      await recordMicroConversionAction({
        eventType: "lead_magnet_submit",
        brand: resolvedBrand,
        model: resolvedModel,
        engine: resolvedEngine,
        url: typeof window !== "undefined" ? window.location.pathname : undefined,
        metadata: {
          method: "email",
          email: email.trim().toLowerCase(),
          mileage: currentMileage,
          nextMilestone: estimationResult?.nextMilestoneKm,
          next_milestone_km: estimationResult?.nextMilestoneKm,
          remaining_km: estimationResult?.remainingKm,
          estimated_months: estimationResult?.estimatedMonths,
          brand: resolvedBrand,
          model: resolvedModel,
          engine: resolvedEngine,
          source: "seo_pseo",
        },
      });
    } catch {
      // Tolérance
    }

    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "lavigie_selected_vehicle",
          JSON.stringify({
            brand: resolvedBrand,
            model: resolvedModel,
            engine: resolvedEngine,
            mileage: currentMileage,
            email: email.trim(),
            source: "seo_pseo_estimator",
            timestamp: Date.now(),
          })
        );
      }
    } catch {
      // Tolérance
    }

    setIsEmailLoading(false);
    setIsSubmitted(true);
  };

  // Action Google OAuth 1-Clic
  const handleGoogleCTA = async () => {
    setIsGoogleLoading(true);

    try {
      await recordMicroConversionAction({
        eventType: "lead_magnet_submit",
        brand: resolvedBrand,
        model: resolvedModel,
        engine: resolvedEngine,
        url: typeof window !== "undefined" ? window.location.pathname : undefined,
        metadata: {
          method: "google_oauth",
          mileage: currentMileage,
          nextMilestone: estimationResult?.nextMilestoneKm,
          next_milestone_km: estimationResult?.nextMilestoneKm,
          remaining_km: estimationResult?.remainingKm,
          estimated_months: estimationResult?.estimatedMonths,
          brand: resolvedBrand,
          model: resolvedModel,
          engine: resolvedEngine,
          source: "seo_pseo",
        },
      });
    } catch {
      // Tolérance
    }

    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "lavigie_selected_vehicle",
          JSON.stringify({
            brand: resolvedBrand,
            model: resolvedModel,
            engine: resolvedEngine,
            mileage: currentMileage,
            source: "seo_pseo_estimator",
            timestamp: Date.now(),
          })
        );
      }
    } catch {
      // Tolérance
    }

    const targetUrl = `/login?mode=signup&brand=${encodeURIComponent(
      resolvedBrand
    )}&model=${encodeURIComponent(resolvedModel)}&engine=${encodeURIComponent(
      resolvedEngine
    )}&mileage=${currentMileage}&src=seo_pseo`;

    router.push(targetUrl);
  };

  // Impression directe du carnet officiel sans email
  const handleDirectPrint = () => {
    try {
      recordMicroConversionAction({
        eventType: "pdf_download_print",
        brand: resolvedBrand,
        model: resolvedModel,
        engine: resolvedEngine,
        url: typeof window !== "undefined" ? window.location.pathname : undefined,
        metadata: {
          method: "estimator_direct_print",
          mileage: currentMileage,
        },
      }).catch(() => {});
    } catch {
      // Tolérance
    }

    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (!estimationResult) {
    return null;
  }

  const { nextMilestoneKm, remainingKm, estimatedMonths, dueOperations, totalMinCost, totalMaxCost } =
    estimationResult;

  const signupRedirectUrl = `/login?mode=signup&email=${encodeURIComponent(
    email.trim()
  )}&brand=${encodeURIComponent(resolvedBrand)}&model=${encodeURIComponent(
    resolvedModel
  )}&engine=${encodeURIComponent(resolvedEngine)}&mileage=${currentMileage}&src=seo_pseo`;

  return (
    <section
      id="rappel-revision"
      className="my-8 rounded-3xl border-2 border-blue-600/30 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/40 p-6 sm:p-8 shadow-lg shadow-blue-900/5 print:hidden"
    >
      {/* En-tête de l'estimateur */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-black uppercase tracking-wider mb-2 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Assistant Révision 1-Clic</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quelle est votre prochaine révision constructeur ?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Indiquez votre kilométrage actuel pour calculer instantanément votre prochain passage en atelier pour votre{" "}
            {resolvedBrand} {resolvedModel}.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDirectPrint}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
          title="Imprimer directement sans email"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Imprimer le carnet officiel sans email</span>
        </button>
      </div>

      {/* Saisie kilométrique et chips de sélection rapide */}
      <div className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="user-mileage-input"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
          >
            Kilométrage actuel au compteur :
          </label>
          <div className="relative max-w-sm">
            <Gauge className="w-5 h-5 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="user-mileage-input"
              type="text"
              inputMode="numeric"
              value={rawMileage}
              onChange={(e) => handleMileageChange(e.target.value)}
              placeholder="Ex: 45 000"
              className="w-full pl-11 pr-14 py-3 bg-white border-2 border-slate-200 focus:border-blue-600 rounded-2xl text-base font-extrabold text-slate-900 shadow-inner focus:outline-none transition"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
              km
            </span>
          </div>
        </div>

        {/* Boutons paliers rapides (Pills) */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-500 font-medium mr-1">Ou choisir un palier :</span>
          {quickPills.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => handleSelectPill(km)}
              className={`px-3 py-1.5 rounded-xl font-bold transition active:scale-95 cursor-pointer ${
                currentMileage === km
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-blue-300"
              }`}
            >
              {km.toLocaleString("fr-FR")} km
            </button>
          ))}
        </div>
      </div>

      {/* Résultat dynamique calculé */}
      <div className="mt-6 rounded-2xl bg-white p-5 sm:p-6 border border-blue-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Diagnostic d'échéance constructeur
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              À {currentMileage.toLocaleString("fr-FR")} km, votre prochaine échéance est la révision des{" "}
              <span className="text-blue-600 underline decoration-blue-300">
                {nextMilestoneKm.toLocaleString("fr-FR")} km
              </span>{" "}
              dans ~{estimatedMonths} mois
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold shrink-0 self-start sm:self-auto">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>
              {remainingKm <= 1000
                ? "Échéance imminente (sous 2 à 4 semaines)"
                : `Dans ~${estimatedMonths} mois (${remainingKm.toLocaleString("fr-FR")} km restants)`}
            </span>
          </div>
        </div>

        {/* Liste des opérations préconisées à ce jalon */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
            <span>
              Opérations préconisées à ce jalon ({dueOperations.length}) :
            </span>
            <span className="font-extrabold text-slate-900 text-sm">
              Budget estimé : {totalMinCost} € – {totalMaxCost} €
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {dueOperations.map((op) => (
              <div
                key={op.id}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-slate-900 leading-tight">{op.operation}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{op.description}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0">
                  {op.estimatedCostMin}–{op.estimatedCostMax} €
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bloc CTA 1-Clic d'activation */}
      <div className="mt-6 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950 p-5 sm:p-6 text-white space-y-4">
        {isSubmitted ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Rappel programmé ! Vous recevrez une alerte avant vos {nextMilestoneKm.toLocaleString("fr-FR")} km.
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Une notification de révision constructeur sera envoyée à <strong className="text-white">{email}</strong> environ 30 jours avant l'échéance estimée.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => router.push(signupRedirectUrl)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
              >
                <span>Accéder à mon carnet numérique officiel</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="inline-flex items-center justify-center px-4 py-3.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <span>Modifier le kilométrage ou l'email</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                <BellRing className="w-3.5 h-3.5" />
                <span>Rappel Automatique Garanti</span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Recevoir mon alerte révision par email ou Google
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Soyez prévenu avant vos {nextMilestoneKm.toLocaleString("fr-FR")} km pour éviter l'usure prématurée et préserver votre garantie constructeur.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Bouton Google 1-clic */}
              <button
                type="button"
                onClick={handleGoogleCTA}
                disabled={isGoogleLoading}
                className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-xs sm:text-sm shadow-md transition active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>Activer en 1 clic avec Google</span>
              </button>

              {/* Formulaire email avec bouton M'alerter à J-30 */}
              <form onSubmit={handleEmailCTA} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Votre adresse email"
                    className="w-full pl-9 pr-3 py-3.5 bg-white/10 border border-white/20 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/20 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isEmailLoading}
                  className="px-4 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition active:scale-95 disabled:opacity-60 cursor-pointer shrink-0"
                >
                  {isEmailLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>M'alerter à J-30</span>
                  )}
                </button>
              </form>
            </div>
          </>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-white/10 gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% gratuit • Zéro spam • Désinscription en 1 clic</span>
          </div>
          <button
            type="button"
            onClick={handleDirectPrint}
            className="hover:text-white underline transition cursor-pointer text-slate-300"
          >
            Imprimer le carnet officiel sans email
          </button>
        </div>
      </div>
    </section>
  );
}
