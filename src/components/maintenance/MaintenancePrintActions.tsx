'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Printer, Share2, Check, ShieldCheck, ArrowRight } from 'lucide-react';

interface MaintenancePrintActionsProps {
  brand: string;
  model: string;
  engine: string;
  recommendedOilNorm?: string;
  oilViscosity?: string;
}

export function MaintenancePrintActions({
  brand,
  model,
  engine,
  recommendedOilNorm,
  oilViscosity,
}: MaintenancePrintActionsProps) {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

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

  return (
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
            onClick={handlePrint}
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
              Vous roulez en {brand} {model} ? Ne manquez aucune échéance
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Créez votre carnet numérique Vigie Foyer gratuit : enregistrez votre plaque d'immatriculation, synchronisez vos alertes d'entretien et valorisez l'historique pour la revente.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition active:scale-95 shadow-sm"
        >
          <span>Créer mon espace gratuit</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
