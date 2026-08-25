import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, Eye, Calendar, CreditCard, FileText, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de Confidentialité — LaVigieAuto",
  description: "Protection de vos données personnelles, conformité RGPD, gestion des documents automobiles et des accès Google Calendar.",
};

export default function PolitiqueConfidentialitePage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Conforme Règlement Général sur la Protection des Données (RGPD UE 2016/679)
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Politique de Confidentialité
          </h1>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            La protection de votre vie privée et de vos données automobiles est au cœur des engagements de LaVigieAuto. Nous appliquons une politique stricte de non-revente de données et de chiffrement continu.
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Dernière mise à jour : Août 2026 — Version 1.2
          </p>
        </div>

        {/* 1. Responsable du Traitement */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Lock className="w-5 h-5 text-emerald-400" />
            1. Responsable du Traitement
          </h2>
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 text-sm text-slate-300 space-y-2">
            <p>Le responsable du traitement des données à caractère personnel est la société :</p>
            <ul className="list-none space-y-1 text-slate-300 pt-1">
              <li><span className="text-slate-400">Dénomination :</span> <strong className="text-white">GENOA ADVISORY SARL</strong></li>
              <li><span className="text-slate-400">Siège social :</span> 36 Avenue de Villeneuve l'Étang, 78000 Versailles, France</li>
              <li><span className="text-slate-400">SIREN :</span> 822 646 881 — RCS Versailles</li>
              <li><span className="text-slate-400">Délégué à la Protection des Données (DPO) :</span> <a href="mailto:privacy@lavigieauto.com" className="text-blue-400 hover:underline">privacy@lavigieauto.com</a></li>
            </ul>
          </div>
        </section>

        {/* 2. Données Collectées & Finalités */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Eye className="w-5 h-5 text-emerald-400" />
            2. Données Collectées et Finalités des Traitements
          </h2>
          <div className="space-y-4 text-sm">
            {/* 2.1 Documents */}
            <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <FileText className="w-4 h-4 text-blue-400" />
                2.1 Documents Automobiles (Cartes Grises, Factures, Contrôles Techniques)
              </div>
              <ul className="space-y-1 text-slate-400 text-xs sm:text-sm">
                <li><strong className="text-slate-300">Finalité :</strong> Reconnaissance OCR IA pour extraire les caractéristiques du véhicule (VIN, immatriculation, motorisation), enregistrer les interventions effectuées et calculer le carnet d'entretien prédictif conforme constructeur.</li>
                <li><strong className="text-slate-300">Base légale :</strong> Exécution du contrat de service (Art. 6.1.b RGPD).</li>
                <li><strong className="text-slate-300">Stockage :</strong> Coffre-fort documentaire sécurisé dans l'Union Européenne (Irlande, Supabase Storage) chiffré en AES-256.</li>
              </ul>
            </div>

            {/* 2.2 Google Calendar */}
            <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <Calendar className="w-4 h-4 text-amber-400" />
                2.2 Synchronisation Google Calendar (OAuth 2.0)
              </div>
              <ul className="space-y-1 text-slate-400 text-xs sm:text-sm">
                <li><strong className="text-slate-300">Finalité :</strong> Création et mise à jour exclusive des rendez-vous et échéances mécaniques (Courroie, Révision, Contrôle Technique) dans l'agenda dédié du foyer, avec notifications de rappel à J-30 et J-7.</li>
                <li><strong className="text-slate-300">Portée des accès :</strong> LaVigieAuto accède uniquement aux événements créés par le service. Aucun événement externe ou personnel de votre agenda n'est collecté ni analysé.</li>
                <li><strong className="text-slate-300">Base légale :</strong> Consentement explicite lors de la connexion Google (Art. 6.1.a RGPD). Révoquable en 1 clic.</li>
              </ul>
            </div>

            {/* 2.3 Paiements Stripe */}
            <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                2.3 Données de Paiement & Abonnements
              </div>
              <ul className="space-y-1 text-slate-400 text-xs sm:text-sm">
                <li><strong className="text-slate-300">Finalité :</strong> Gestion des formules d'abonnements dégressives du foyer via Stripe Inc.</li>
                <li><strong className="text-slate-300">Sécurité bancaire :</strong> Traité directement par Stripe (certifié PCI-DSS Niveau 1). LaVigieAuto ne reçoit ni ne stocke aucun numéro de carte bancaire.</li>
                <li><strong className="text-slate-300">Données conservées :</strong> Identifiant client Stripe, statut de l'abonnement et historique de facturation à des fins comptables obligatoires (durée légale 5 ans).</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. Absence de Cookies Tiers & Tracking */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Lock className="w-5 h-5 text-emerald-400" />
            3. Cookies et Traceurs
          </h2>
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              LaVigieAuto n'utilise <strong>aucun cookie publicitaire, commercial ou de pistage tiers</strong>.
            </p>
            <p className="text-xs text-slate-400">
              Seuls des cookies techniques de session strictement nécessaires (authentification sécurisée, token Google Calendar et préférences locales) sont déposés pour assurer le bon fonctionnement de l'application.
            </p>
          </div>
        </section>

        {/* 4. Sous-traitants & Transferts */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            4. Sous-traitants Qualifiés et Hébergement
          </h2>
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 text-sm space-y-3">
            <p className="text-slate-300">Les données sont traitées avec le concours des prestataires suivants :</p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Supabase Inc.</strong> (Base de données et coffre-fort documentaire) : Hébergement région EU-West-1 (Irlande).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Vercel Inc.</strong> (Infrastructure applicative) : Clauses Contractuelles Types de l'UE.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Stripe Inc.</strong> (Paiements et gestion des souscriptions) : Certification PCI-DSS.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Google Cloud / Gemini API</strong> (OCR et analyse sémantique des factures) : Analyse isolée sans entraînement de modèles sur vos données privées.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 5. Vos Droits RGPD */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            5. Vos Droits et Exercice
          </h2>
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 text-sm text-slate-300 leading-relaxed space-y-3">
            <p>Conformément à la réglementation européenne, vous disposez des droits suivants sur vos données :</p>
            <ul className="grid sm:grid-cols-2 gap-2 text-xs text-slate-300">
              <li className="bg-slate-800/70 p-2.5 rounded-lg">✔ <strong>Droit d'accès</strong> (Art. 15 RGPD)</li>
              <li className="bg-slate-800/70 p-2.5 rounded-lg">✔ <strong>Droit de rectification</strong> (Art. 16 RGPD)</li>
              <li className="bg-slate-800/70 p-2.5 rounded-lg">✔ <strong>Droit à l'effacement</strong> (Art. 17 RGPD)</li>
              <li className="bg-slate-800/70 p-2.5 rounded-lg">✔ <strong>Droit à la portabilité</strong> (Art. 20 RGPD)</li>
            </ul>
            <p className="pt-2 text-xs text-slate-400">
              Pour exercer vos droits ou demander la suppression définitive de votre compte et de vos véhicules, écrivez à : <a href="mailto:privacy@lavigieauto.com" className="text-blue-400 hover:underline font-semibold">privacy@lavigieauto.com</a>. Une réponse vous sera apportée sous 30 jours maximum. Vous pouvez également saisir la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) sur <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">cnil.fr</a>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
