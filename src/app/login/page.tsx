"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Car,
  Info,
} from "lucide-react";
import {
  signInWithEmailAction,
  signInWithPasswordAction,
  signInWithGoogleAction,
  signUpWithPasswordAction,
} from "@/app/actions/auth";

interface SelectedVehicleContext {
  brand: string;
  model: string;
  engine?: string;
  source?: string;
  timestamp?: number;
}

function formatVehicleName(brand?: string | null, model?: string | null, engine?: string | null) {
  if (!brand) return { formattedBrand: "", formattedModel: "", formattedEngine: "" };

  const b = brand.trim();
  const lowerB = b.toLowerCase();
  const formattedBrand =
    lowerB === "citroen" || lowerB === "citroën"
      ? "Citroën"
      : lowerB.charAt(0).toUpperCase() + lowerB.slice(1);

  let formattedModel = (model || "").trim();
  if (formattedModel) {
    const lowerM = formattedModel.toLowerCase();
    if (lowerM.startsWith("sandero")) {
      formattedModel = "Sandero / Stepway";
    } else if (lowerM.startsWith("megane") || lowerM.startsWith("mégane")) {
      formattedModel = "Mégane";
    } else if (lowerM === "c3-aircross") {
      formattedModel = "C3 Aircross";
    } else if (lowerM === "c4-picasso") {
      formattedModel = "C4 Picasso";
    } else if (lowerM.startsWith("c3")) {
      formattedModel = "C3";
    } else if (lowerM.startsWith("208")) {
      formattedModel = "208";
    } else if (lowerM.startsWith("2008")) {
      formattedModel = "2008";
    } else if (lowerM.startsWith("308")) {
      formattedModel = "308";
    } else if (lowerM.startsWith("3008")) {
      formattedModel = "3008";
    } else if (lowerM.startsWith("clio")) {
      formattedModel = "Clio";
    } else if (lowerM.startsWith("captur")) {
      formattedModel = "Captur";
    } else if (lowerM.startsWith("twingo")) {
      formattedModel = "Twingo";
    } else if (lowerM.startsWith("duster")) {
      formattedModel = "Duster";
    } else if (lowerM.startsWith("jogger")) {
      formattedModel = "Jogger";
    } else if (lowerM.startsWith("golf")) {
      formattedModel = "Golf";
    } else if (lowerM.startsWith("polo")) {
      formattedModel = "Polo";
    } else if (lowerM.startsWith("yaris")) {
      formattedModel = "Yaris";
    } else {
      formattedModel = formattedModel
        .replace(/-[0-9]+$/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  let formattedEngine = (engine || "").trim();
  if (formattedEngine) {
    if (formattedEngine.includes("-")) {
      formattedEngine = formattedEngine
        .replace(/-/g, " ")
        .replace(/\b([0-9]) ([0-9])\b/g, "$1.$2");
    }
  }

  return { formattedBrand, formattedModel, formattedEngine };
}

function LoginLoadingSkeleton() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 via-white to-blue-50/40">
      <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 animate-pulse">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-200 mx-auto" />
          <div className="h-8 bg-slate-200 rounded-lg w-3/4 mx-auto" />
          <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto" />
        </div>
        <div className="h-12 bg-slate-200 rounded-2xl" />
        <div className="space-y-4 pt-4">
          <div className="h-10 bg-slate-200 rounded-xl" />
          <div className="h-10 bg-slate-200 rounded-xl" />
          <div className="h-12 bg-slate-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read search parameters
  const urlBrand = searchParams.get("brand") || undefined;
  const urlModel = searchParams.get("model") || undefined;
  const urlEngine = searchParams.get("engine") || undefined;
  const urlSrc = searchParams.get("src") || undefined;
  const redirectToParam = searchParams.get("redirect_to") || undefined;
  const modeParam = searchParams.get("mode");
  const loggedOutParam = searchParams.get("logged_out");

  // Vehicle context state
  const [vehicleContext, setVehicleContext] = useState<SelectedVehicleContext | null>(() => {
    if (urlBrand && urlModel) {
      return {
        brand: urlBrand,
        model: urlModel,
        engine: urlEngine,
        source: urlSrc || "seo_landing",
        timestamp: Date.now(),
      };
    }
    return null;
  });

  // Dual mode state ("signup" vs "signin")
  const initialMode = useMemo(() => {
    if (urlBrand && urlModel) return "signup";
    if (modeParam === "signin" || modeParam === "login" || loggedOutParam === "true") {
      return "signin";
    }
    return "signup";
  }, [urlBrand, urlModel, modeParam, loggedOutParam]);

  const [mode, setMode] = useState<"signup" | "signin">(initialMode);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [usePassword, setUsePassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [signUpSuccessMessage, setSignUpSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userAlreadyExists, setUserAlreadyExists] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // SessionStorage synchronization & fallback check
  useEffect(() => {
    if (urlBrand && urlModel) {
      const payload: SelectedVehicleContext = {
        brand: urlBrand,
        model: urlModel,
        engine: urlEngine,
        source: urlSrc || "seo_landing",
        timestamp: Date.now(),
      };
      setVehicleContext(payload);
      try {
        sessionStorage.setItem("lavigie_selected_vehicle", JSON.stringify(payload));
      } catch {
        // Silencieux
      }
    } else {
      try {
        const stored = sessionStorage.getItem("lavigie_selected_vehicle");
        if (stored) {
          const parsed = JSON.parse(stored) as SelectedVehicleContext;
          if (parsed && parsed.brand && parsed.model) {
            setVehicleContext(parsed);
            if (!modeParam && !loggedOutParam) {
              setMode("signup");
            }
          }
        }
      } catch {
        // Silencieux
      }
    }
  }, [urlBrand, urlModel, urlEngine, urlSrc, modeParam, loggedOutParam]);

  // Compute target destination
  const targetDestination = useMemo(() => {
    if (redirectToParam) {
      return redirectToParam;
    }
    const brand = urlBrand || vehicleContext?.brand;
    const model = urlModel || vehicleContext?.model;
    const engine = urlEngine || vehicleContext?.engine;
    const src = urlSrc || vehicleContext?.source || "seo_landing";

    if (brand && model) {
      const params = new URLSearchParams();
      params.set("brand", brand);
      params.set("model", model);
      if (engine) params.set("engine", engine);
      if (src) params.set("src", src);
      return `/dashboard?${params.toString()}`;
    }
    return "/dashboard";
  }, [redirectToParam, urlBrand, urlModel, urlEngine, urlSrc, vehicleContext]);

  // Formatting helper
  const rawBrand = urlBrand || vehicleContext?.brand;
  const rawModel = urlModel || vehicleContext?.model;
  const rawEngine = urlEngine || vehicleContext?.engine;
  const { formattedBrand, formattedModel, formattedEngine } = useMemo(
    () => formatVehicleName(rawBrand, rawModel, rawEngine),
    [rawBrand, rawModel, rawEngine]
  );
  const hasVehicleContext = Boolean(formattedBrand && formattedModel);

  // Handle Google Sign-in
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    setUserAlreadyExists(false);
    try {
      const res = await signInWithGoogleAction(targetDestination);
      if (res.url) {
        window.location.href = res.url;
      } else {
        setErrorMessage(
          res.error?.includes("provider is not enabled")
            ? "Le fournisseur Google doit être activé dans la console Supabase (Auth > Providers). Utilisez votre mot de passe ci-dessous pour vous connecter immédiatement."
            : res.error || "Impossible d'initialiser la connexion avec Google."
        );
        setIsGoogleLoading(false);
      }
    } catch {
      setErrorMessage("Erreur lors de la connexion avec Google.");
      setIsGoogleLoading(false);
    }
  };

  // Handle graceful switch from signup to signin when user already exists
  const handleSwitchToSignInOnExisting = () => {
    setMode("signin");
    setUsePassword(true);
    setUserAlreadyExists(false);
    setErrorMessage(null);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 100);
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage("Veuillez saisir une adresse email valide.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setUserAlreadyExists(false);
    setSignUpSuccessMessage(null);

    try {
      if (mode === "signup") {
        if (!password || password.length < 8) {
          setErrorMessage("Le mot de passe doit contenir au moins 8 caractères.");
          setIsLoading(false);
          return;
        }

        const res = await signUpWithPasswordAction(email, password, fullName || undefined);

        if (res.code === "user_already_exists") {
          setUserAlreadyExists(true);
          setIsLoading(false);
          return;
        }

        if (!res.success) {
          setErrorMessage(res.error || "Erreur lors de la création du compte.");
          setIsLoading(false);
          return;
        }

        if (res.requiresEmailConfirmation) {
          setSignUpSuccessMessage(
            `Lien de confirmation envoyé ! Consultez votre boîte de réception à ${email} pour valider votre compte.`
          );
          setIsLoading(false);
          return;
        }

        // Connexion et session actives -> redirection vers la destination
        router.push(targetDestination);
        router.refresh();
      } else {
        // Sign-in mode
        if (usePassword) {
          if (!password) {
            setErrorMessage("Veuillez saisir votre mot de passe.");
            setIsLoading(false);
            return;
          }
          const res = await signInWithPasswordAction(email, password);
          if (res.success) {
            router.push(targetDestination);
            router.refresh();
            return;
          } else {
            setErrorMessage(res.error || "Identifiants incorrects.");
          }
        } else {
          const res = await signInWithEmailAction(email, targetDestination);
          if (res.success) {
            setMagicLinkSent(true);
          } else {
            setErrorMessage(res.error || "Une erreur est survenue lors de l'envoi du lien.");
          }
        }
      }
    } catch {
      setErrorMessage("Impossible de contacter le serveur d'authentification.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 via-white to-blue-50/40">
      <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80">
        {/* LOGO & DYNAMIC CONTEXTUAL HEADER */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition">
              <ShieldCheck className="w-7 h-7" />
            </div>
          </Link>

          {hasVehicleContext && (
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-bold">
                <Car className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Véhicule sélectionné : {formattedBrand} {formattedModel}</span>
              </div>
            </div>
          )}

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            {hasVehicleContext && mode === "signup"
              ? `Créez le carnet numérique de votre ${formattedBrand} ${formattedModel}`
              : mode === "signup"
              ? "Créer mon Compte Foyer"
              : "Accéder à mon Foyer"}
          </h2>

          <p className="text-xs sm:text-sm text-slate-500">
            {hasVehicleContext && mode === "signup"
              ? `Activez vos alertes d'échéances constructeur${
                  rawEngine ? ` (${rawEngine})` : ""
                }, centralisez vos factures et synchronisez votre agenda en 3 secondes.`
              : hasVehicleContext && mode === "signin"
              ? `Retrouvez l'historique et le carnet d'entretien de votre ${formattedBrand} ${formattedModel}.`
              : "Pilotez l'entretien, l'agenda Google et les carnets constructeurs de tous vos véhicules."}
          </p>
        </div>

        {/* DUAL MODE SEGMENTED CONTROL */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 rounded-2xl text-xs font-bold text-slate-600 border border-slate-200/60">
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMessage(null);
              setUserAlreadyExists(false);
            }}
            className={clsx(
              "py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              mode === "signup"
                ? "bg-white text-blue-700 shadow-sm shadow-slate-200 font-extrabold"
                : "hover:text-slate-900 text-slate-500"
            )}
          >
            <span>Créer mon compte</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErrorMessage(null);
              setUserAlreadyExists(false);
            }}
            className={clsx(
              "py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              mode === "signin"
                ? "bg-white text-blue-700 shadow-sm shadow-slate-200 font-extrabold"
                : "hover:text-slate-900 text-slate-500"
            )}
          >
            <span>Se connecter</span>
          </button>
        </div>

        {/* GOOGLE SIGN IN BUTTON */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200/90 rounded-2xl font-bold text-sm shadow-sm transition active:scale-95 disabled:opacity-60 group cursor-pointer"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            <span>Continuer avec Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
              {mode === "signup" ? "ou par email et mot de passe" : "ou avec vos identifiants"}
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          {/* LOGGED OUT BANNER */}
          {loggedOutParam === "true" && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-700 font-medium">
              <Info className="w-4 h-4 shrink-0 text-blue-600" />
              <span>Vous avez été déconnecté avec succès.</span>
            </div>
          )}

          {/* USER ALREADY EXISTS BANNER */}
          {userAlreadyExists && (
            <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl space-y-3 text-xs text-amber-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950">Un compte existe déjà</p>
                  <p className="text-amber-800 mt-0.5">
                    L'adresse <strong>{email}</strong> est déjà associée à un compte LaVigieAuto.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSwitchToSignInOnExisting}
                className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm shadow-amber-500/20"
              >
                <span>Se connecter avec ce compte →</span>
              </button>
            </div>
          )}

          {/* SIGNUP SUCCESS MESSAGE */}
          {signUpSuccessMessage && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-emerald-950">Compte créé avec succès !</h4>
              <p className="text-xs text-emerald-800">{signUpSuccessMessage}</p>
            </div>
          )}

          {/* AUTH FORM */}
          {magicLinkSent ? (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-emerald-950">Lien de connexion envoyé !</h4>
              <p className="text-xs text-emerald-800">
                Consultez votre boîte de réception à <strong>{email}</strong> et cliquez sur le lien magique pour vous connecter.
              </p>
              <button
                type="button"
                onClick={() => setMagicLinkSent(false)}
                className="mt-2 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                ← Utiliser le mot de passe
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Optional Name field in Signup mode */}
              {mode === "signup" && (
                <div>
                  <label htmlFor="fullName" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nom complet <span className="text-slate-400 font-normal">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Jean Dupont"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>
              )}

              {/* Email field */}
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Password field */}
              {(mode === "signup" || usePassword) && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                      Mot de passe
                    </label>
                    {mode === "signup" && (
                      <span className="text-[11px] text-slate-400 font-normal">Min. 8 caractères</span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      ref={passwordInputRef}
                      id="password"
                      type="password"
                      required
                      minLength={mode === "signup" ? 8 : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "signup" ? "8 caractères minimum" : "••••••••••••"}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>
              )}

              {/* ERROR MESSAGE */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === "signup"
                        ? "Créer mon compte"
                        : usePassword
                        ? "Se connecter"
                        : "Recevoir mon lien de connexion"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* MAGIC LINK TOGGLE (SIGNIN ONLY) */}
              {mode === "signin" && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUsePassword(!usePassword);
                      setErrorMessage(null);
                    }}
                    className="text-xs text-slate-500 hover:text-blue-600 font-medium transition cursor-pointer"
                  >
                    {usePassword
                      ? "Connexion sans mot de passe (Lien magique)"
                      : "Connexion directe avec mot de passe"}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* FOOTER NOTE */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-2">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Sécurité certifiée. Vos données automobiles restent strictement privées.</span>
          </p>
          <div>
            <Link href="/" className="text-xs font-semibold text-blue-600 hover:underline">
              ← Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingSkeleton />}>
      <LoginFormContent />
    </Suspense>
  );
}
