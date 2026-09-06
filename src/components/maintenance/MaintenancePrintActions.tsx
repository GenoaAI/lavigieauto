'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Printer,
  Share2,
  Check,
  ShieldCheck,
  ArrowRight,
  X,
  Mail,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { signInWithGoogleAction } from '@/app/actions/auth';

interface MaintenancePrintActionsProps {
  brand: string;
  model: string;
  engine: string;
  recommendedOilNorm?: string;
  oilViscosity?: string;
  brandSlug?: string;
  modelSlug?: string;
  engineSlug?: string;
}

export function MaintenancePrintActions({
  brand,
  model,
  engine,
  recommendedOilNorm,
  oilViscosity,
  brandSlug,
  modelSlug,
  engineSlug,
}: MaintenancePrintActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Slugs resolution with fallback
  const resolvedBrand = brandSlug || brand;
  const resolvedModel = modelSlug || model;
  const resolvedEngine = engineSlug || engine || '';

  // Direct print handler: closes modal and triggers native window.print()
  const handleDirectPrint = () => {
    setIsModalOpen(false);
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.print();
      }, 100);
    }
  };

  // Close modal on Escape key and manage body scroll
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isModalOpen]);

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShare = async () => {
    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Plan d'entretien ${brand} ${model} (${engine})`,
          text: `Consultez le plan d'entretien officiel et périodicités de révision pour ${brand} ${model} :`,
          url: window.location.href,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  // Google OAuth 1-Click
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setGoogleError(null);

    const targetDashboardUrl = `/dashboard?brand=${encodeURIComponent(
      resolvedBrand
    )}&model=${encodeURIComponent(resolvedModel)}&engine=${encodeURIComponent(
      resolvedEngine
    )}&src=lead_magnet_modal`;

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'lavigie_selected_vehicle',
          JSON.stringify({
            brand: resolvedBrand,
            model: resolvedModel,
            engine: resolvedEngine,
            source: 'lead_magnet_modal',
            timestamp: Date.now(),
          })
        );
      }
    } catch {
      // Silencieux
    }

    try {
      const res = await signInWithGoogleAction(targetDashboardUrl);
      if (res.url) {
        window.location.href = res.url;
      } else {
        setGoogleError(res.error || "Impossible d'initialiser la connexion Google.");
        setIsGoogleLoading(false);
      }
    } catch {
      setGoogleError("Erreur lors de l'initialisation de Google.");
      setIsGoogleLoading(false);
    }
  };

  // Email Lead Magnet submit
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      return;
    }

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'lavigie_selected_vehicle',
          JSON.stringify({
            brand: resolvedBrand,
            model: resolvedModel,
            engine: resolvedEngine,
            source: 'lead_magnet_modal',
            timestamp: Date.now(),
          })
        );
      }
    } catch {
      // Silencieux
    }

    const signupUrl = `/login?mode=signup&brand=${encodeURIComponent(
      resolvedBrand
    )}&model=${encodeURIComponent(resolvedModel)}&engine=${encodeURIComponent(
      resolvedEngine
    )}&src=lead_magnet_modal&email=${encodeURIComponent(email.trim())}`;

    router.push(signupUrl);
  };

  return (
    <>
      <section className="my-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-6 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-2">
              Fiche Officielle Constructeur
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Fiche d'entretien imprimable & Carnet de bord
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">
              Exportez les périodicités officielles de votre {brand} {model} ({engine}) en format A4 pour votre boîte à gants ou votre garagiste.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer"
              title="Télécharger la fiche d'entretien (PDF) / Imprimer"
            >
              <Printer className="w-4 h-4" />
              <span>Télécharger la fiche d'entretien (PDF) / Imprimer</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition active:scale-95 cursor-pointer"
              title="Partager cette fiche d'entretien"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Lien copié !</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Partager</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Carte Lead Magnet pour visiteurs anonymes */}
        <div className="mt-5 pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-xs rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                Vous roulez en {brand} {model} ? Enregistrez ce véhicule dans votre espace Vigie Foyer
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Créez votre carnet numérique Vigie Foyer gratuit : enregistrez votre plaque d'immatriculation, synchronisez vos alertes d'entretien et valorisez l'historique pour la revente.
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard?brand=${encodeURIComponent(resolvedBrand)}&model=${encodeURIComponent(
              resolvedModel
            )}&engine=${encodeURIComponent(resolvedEngine)}&src=maintenance_print_card`}
            onClick={() => {
              try {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem(
                    'lavigie_selected_vehicle',
                    JSON.stringify({
                      brand: resolvedBrand,
                      model: resolvedModel,
                      engine: resolvedEngine,
                      source: 'maintenance_print_card',
                      timestamp: Date.now(),
                    })
                  );
                }
              } catch {
                // Silencieux
              }
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition active:scale-95 shadow-sm cursor-pointer"
          >
            <span>Créer mon espace gratuit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* MODALE LEAD MAGNET AVEC REPLI PAPIER DIRECT */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in print:hidden"
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-magnet-modal-title"
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-6 sm:p-8 overflow-hidden animate-slide-in-up print:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton de fermeture */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer print:hidden"
              aria-label="Fermer la boîte de dialogue"
            >
              <X className="w-5 h-5" />
            </button>

            {/* En-tête de la modale */}
            <div className="space-y-2.5 text-center sm:text-left pr-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>Carnet Officiel & Rappels J-30</span>
              </div>

              <h3
                id="lead-magnet-modal-title"
                className="text-xl sm:text-2xl font-black text-slate-900 leading-snug tracking-tight"
              >
                Recevoir le carnet officiel {brand} {model} par email + activer les rappels révision à J-30
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Recevez votre carnet complet certifié constructeur en PDF et soyez prévenu automatiquement avant vos échéances de vidange et distribution.
              </p>
            </div>

            {/* Corps d'actions */}
            <div className="mt-6 space-y-4">
              {/* Option 1 : Connexion Google 1-clic */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200/90 rounded-2xl font-bold text-sm shadow-sm transition active:scale-95 disabled:opacity-60 cursor-pointer group"
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
                <span>Recevoir en 1 clic avec Google</span>
              </button>

              {googleError && (
                <p className="text-xs text-rose-600 font-medium text-center">
                  {googleError}
                </p>
              )}

              {/* Séparateur */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
                  ou par email
                </span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              {/* Option 2 : Formulaire Email */}
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Votre adresse email (ex: pierre@email.com)"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Recevoir mon carnet & activer mes rappels</span>
                </button>
              </form>

              {/* Option 3 (Anti-Frustration) : Impression directe sans email */}
              <div className="pt-3 border-t border-slate-100 flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleDirectPrint}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 underline decoration-slate-300 hover:decoration-slate-600 py-1.5 px-3 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="Lancer l'impression directe du carnet sans laisser d'email"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>Imprimer directement sans email</span>
                </button>
              </div>
            </div>

            {/* Note de réassurance */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                100% gratuit • Zéro spam • Désinscription en 1 clic
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
