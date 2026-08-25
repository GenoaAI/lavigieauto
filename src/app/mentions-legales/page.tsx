import type { Metadata } from "next";
import Link from "next/link";
import { Server, Lock, Building2, Scale, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Mentions Légales — LaVigieAuto",
  description: "Informations légales, éditeur, hébergement et directeur de la publication du service LaVigieAuto.",
};

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Navigation retour */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>

        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-3">
            <Scale className="w-3.5 h-3.5" />
            Cadre Réglementaire & Transparence
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Mentions Légales
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Informations obligatoires en application de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN).
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Dernière mise à jour : Août 2026 — Version 1.2
          </p>
        </div>

        {/* 1. Éditeur */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Building2 className="w-5 h-5 text-blue-400" />
            1. Éditeur du Service
          </h2>
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-slate-700/60">
                <tr>
                  <td className="py-2.5 pr-6 text-slate-400 font-medium whitespace-nowrap w-56">Dénomination sociale</td>
                  <td className="py-2.5 font-bold text-white">GENOA ADVISORY</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-6 text-slate-400 font-medium whitespace-nowrap">Forme juridique</td>
                  <td className="py-2.5 text-slate-200">SARL (Société à responsabilité limitée – associé unique)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-6 text-slate-400 font-medium whitespace-nowrap">Capital social</td>
                  <td className="py-2.5 text-slate-200">1 000,00 €</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-6 text-slate-400 font-medium whitespace-nowrap">SIREN</td>
                  <td className="py-2.5 text-slate-200">822 646 881 — RCS Versailles</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-6 text-slate-400 font-medium whitespace-nowrap">SIRET</td>
                  <td className="py-2.5 text-slate-200">822 646 881 00018</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-6 text-slate-400 font-medium whitespace-nowrap">Numéro TVA Intracommunautaire</td>
                  <td className="py-2.5 text-slate-200">FR16 822646881</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-6 text-slate-400 font-medium whitespace-nowrap">Siège social</td>
                  <td className="py-2.5 text-slate-200">36 Avenue de Villeneuve l'Étang, 78000 Versailles, France</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-6 text-slate-400 font-medium whitespace-nowrap">Directeur de la publication</td>
                  <td className="py-2.5 text-slate-200">Charles-Alexis LEMOYNE DE FORGES</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-6 text-slate-400 font-medium whitespace-nowrap">Contact électronique</td>
                  <td className="py-2.5 text-blue-400 font-medium">contact@lavigieauto.fr</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-6 text-slate-400 font-medium whitespace-nowrap">Site web officiel</td>
                  <td className="py-2.5 text-slate-200">https://www.lavigieauto.com</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Hébergement & Infrastructure */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Server className="w-5 h-5 text-blue-400" />
            2. Hébergement & Infrastructure Cloud
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-base">Vercel Inc.</span>
                <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md">Frontend & Edge</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hébergement applicatif haute disponibilité et distribution mondiale avec conformité RGPD via Clauses Contractuelles Types (CCT).
              </p>
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline block pt-1"
              >
                Politique de confidentialité Vercel →
              </a>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-base">Supabase Inc.</span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md">Données & Fichiers</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Base de données PostgreSQL managée et stockage sécurisé des documents.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong>Région de stockage :</strong> Union Européenne — EU-West-1 (Irlande). Chiffrement AES-256 des fichiers au repos.
              </p>
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline block pt-1"
              >
                Politique de confidentialité Supabase →
              </a>
            </div>
          </div>
        </section>

        {/* 3. Propriété Intellectuelle */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Lock className="w-5 h-5 text-blue-400" />
            3. Propriété Intellectuelle & Droits Réservés
          </h2>
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 text-sm text-slate-300 leading-relaxed space-y-3">
            <p>
              L'ensemble des éléments constituant le site et l'application <strong>LaVigieAuto</strong> (notamment marques, logos, graphismes, textes, algorithmes de calcul prédictif, moteurs de réconciliation de factures, structures de bases de données et logiciels) sont la propriété exclusive de <strong>GENOA ADVISORY</strong> ou font l'objet d'une autorisation d'utilisation.
            </p>
            <p>
              Toute reproduction, représentation, modification, publication, adaptation totale ou partielle de ces éléments, quel que soit le moyen ou le procédé utilisé, est formellement interdite sans l'accord préalable écrit de GENOA ADVISORY.
            </p>
          </div>
        </section>

        {/* 4. Contact & Réclamations */}
        <section className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 rounded-2xl p-6 text-sm text-slate-300 space-y-2">
          <h3 className="text-white font-bold text-base">Assistance & Signalement</h3>
          <p className="text-xs text-slate-400">
            Pour toute demande d'information, question relative aux mentions légales ou signalement de contenu :
          </p>
          <p className="text-sm font-semibold text-blue-300">
            Email : <a href="mailto:contact@lavigieauto.fr" className="underline hover:text-white">contact@lavigieauto.fr</a>
          </p>
        </section>
      </div>
    </div>
  );
}
