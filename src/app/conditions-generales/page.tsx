import type { Metadata } from "next";
import Link from "next/link";
import { Scale, CheckCircle2, AlertTriangle, CreditCard, ShieldCheck, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation et de Vente (CGU/CGV) — LaVigieAuto",
  description: "Conditions contractuelles encadrant l'utilisation du service LaVigieAuto, les formules d'abonnements foyer et les limitations de responsabilité.",
};

export default function ConditionsGeneralesPage() {
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
            Contrat de Service & Droits des Utilisateurs
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Conditions Générales d'Utilisation & de Vente
          </h1>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Les présentes Conditions Générales (CGU/CGV) régissent l'accès et l'utilisation de la plateforme numérique LaVigieAuto ainsi que les abonnements souscrits par les utilisateurs et foyers.
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Dernière mise à jour : Août 2026 — Version 1.2
          </p>
        </div>

        {/* 1. Objet & Présentation */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            1. Objet du Service
          </h2>
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 text-sm text-slate-300 leading-relaxed space-y-3">
            <p>
              <strong>LaVigieAuto</strong> est un service numérique développé et édité par la société <strong>GENOA ADVISORY SARL</strong>, conçu pour assister les particuliers et les foyers dans le suivi, la planification mécanique et la gestion documentaire de leur parc de véhicules.
            </p>
            <p>
              Le service comprend notamment la numérisation intelligente des factures et cartes grises par intelligence artificielle, le calcul prévisionnel d'entretien basé sur les intervalles constructeurs officiels, le regroupement intelligent d'interventions en atelier, la génération de scripts d'appel garage et la synchronisation avec Google Calendar.
            </p>
          </div>
        </section>

        {/* 2. Formules & Grille Tarifaire Dégressive */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <CreditCard className="w-5 h-5 text-blue-400" />
            2. Formules d'Accès et Tarification
          </h2>
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 text-sm text-slate-300 space-y-4">
            <p>LaVigieAuto propose deux niveaux d'accès :</p>
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/60 border border-slate-700 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Formule Découverte</span>
                  <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">Gratuite</span>
                </div>
                <p className="text-slate-400">
                  Permet de tester le service sur 1 véhicule du foyer avec analyse documentaire initiale et bilan santé indicatif.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-blue-500/40 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Formule Foyer Premium</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">À partir de 2,90€/m</span>
                </div>
                <p className="text-slate-400">
                  Suivi prédictif illimité de la flotte familiale, synchronisation Google Calendar partagée, kits de négociation atelier et coffre-fort complet.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-700/80 pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Grille Tarifaire Dégressive du Foyer :</h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                <li><strong>1er véhicule :</strong> 2,90 € TTC / mois (ou 29,00 € TTC / an, avec 2 mois offerts).</li>
                <li><strong>2ème véhicule :</strong> +1,60 € TTC / mois (ou +16,00 € TTC / an $\rightarrow$ total 4,50 € / mois ou 45,00 € / an).</li>
                <li><strong>3ème véhicule et suivants :</strong> +1,00 € TTC / mois (ou +10,00 € TTC / an par véhicule supplémentaire).</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. Modalités de Paiement & Sans Engagement */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <CreditCard className="w-5 h-5 text-blue-400" />
            3. Paiement, Durée et Résiliation
          </h2>
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 text-sm text-slate-300 leading-relaxed space-y-3">
            <p>
              Les paiements sont traités de manière hautement sécurisée par <strong>Stripe Inc.</strong> (norme PCI-DSS). L'utilisateur peut régler par carte bancaire, Apple Pay, Google Pay ou prélèvement SEPA.
            </p>
            <p>
              <strong>Sans engagement :</strong> L'abonnement est souscrit pour une durée d'un mois ou d'un an, reconductible tacitement. L'utilisateur peut résilier son abonnement à tout moment en 1 clic depuis son tableau de bord via le portail Stripe. La résiliation prend effet à la fin de la période de facturation en cours, sans frais de résiliation.
            </p>
          </div>
        </section>

        {/* 4. Droit de Rétractation */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Scale className="w-5 h-5 text-blue-400" />
            4. Droit de Rétractation
          </h2>
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 text-sm text-slate-300 leading-relaxed space-y-3">
            <p>
              Conformément à l'article L.221-18 du Code de la consommation, le consommateur dispose en principe d'un délai de 14 jours pour exercer son droit de rétractation.
            </p>
            <p className="text-xs text-slate-400">
              Conformément à l'article L.221-28 13° du Code de la consommation, en cas de fourniture d'un contenu numérique non fourni sur un support matériel dont l'exécution a commencé après accord préalable exprès du consommateur et renoncement exprès à son droit de rétractation, le droit de rétractation ne peut être exercé une fois le service pleinement activé.
            </p>
          </div>
        </section>

        {/* 5. Limitation de Responsabilité Mécanique */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            5. Limitation de Responsabilité & Avertissement Mécanique
          </h2>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-sm text-slate-200 leading-relaxed space-y-3">
            <p>
              <strong>Outil d'aide à la décision :</strong> Les analyses, scores de conformité, plannings prévisionnels et alertes fournis par LaVigieAuto sont des estimations indicatives calculées à partir des documents transmis par l'utilisateur et des plans d'entretien constructeurs théoriques.
            </p>
            <p>
              LaVigieAuto ne se substitue en aucun cas à l'expertise physique, au contrôle de sécurité et au diagnostic direct réalisé par un réparateur automobile agréé ou un centre de contrôle technique certifié.
            </p>
            <p className="text-xs text-slate-400">
              GENOA ADVISORY ne saurait être tenue pour responsable des défaillances mécaniques, omissions d'entretien réel, pannes ou litiges commerciaux entre l'utilisateur et son garagiste ou un tiers acquéreur.
            </p>
          </div>
        </section>

        {/* 6. Droit Applicable & Litiges */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Scale className="w-5 h-5 text-blue-400" />
            6. Droit Applicable et Règlement des Différends
          </h2>
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 text-sm text-slate-300 leading-relaxed space-y-3">
            <p>
              Les présentes conditions sont régies par le droit français. En cas de litige, l'utilisateur s'adressera en priorité à GENOA ADVISORY à <a href="mailto:contact@lavigieauto.fr" className="text-blue-400 hover:underline">contact@lavigieauto.fr</a> pour rechercher une solution amiable.
            </p>
            <p className="text-xs text-slate-400">
              À défaut de résolution amiable, tout litige sera soumis aux tribunaux compétents du ressort de la Cour d'appel de Versailles, sous réserve des règles applicables aux consommateurs.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
