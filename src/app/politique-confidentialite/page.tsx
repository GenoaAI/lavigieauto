import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Eye,
  Calendar,
  CreditCard,
  FileText,
  ArrowLeft,
  Cpu,
  CheckCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de Confidentialité — LaVigieAuto",
  description:
    "Protection de vos données personnelles, conformité RGPD, gestion des documents automobiles, conformité Google API Services User Data Policy et Limited Use.",
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
            Conforme RGPD (UE 2016/679) & Google API Services User Data Policy
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Politique de Confidentialité
          </h1>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            La protection de votre vie privée et de vos données automobiles est au cœur des engagements de LaVigieAuto. Nous appliquons une politique stricte de non-revente de données, de chiffrement continu et de cloisonnement hermétique de nos services.
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Dernière mise à jour : Mars 2026 — Version 1.3
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
                2.1 Documents Automobiles (Cartes Grises, Factures d'Entretien, Contrôles Techniques)
              </div>
              <ul className="space-y-1 text-slate-400 text-xs sm:text-sm">
                <li><strong className="text-slate-300">Finalité :</strong> Reconnaissance OCR IA pour extraire les caractéristiques du véhicule (numéro d'immatriculation, marque, modèle, motorisation, VIN), enregistrer l'historique des opérations mécaniques effectuées et générer le carnet d'entretien prédictif conforme aux préconisations constructeurs.</li>
                <li><strong className="text-slate-300">Base légale :</strong> Exécution du contrat de service (Art. 6.1.b RGPD).</li>
                <li><strong className="text-slate-300">Stockage :</strong> Coffre-fort documentaire sécurisé hébergé dans l'Union Européenne (Irlande, Supabase Storage) chiffré en AES-256.</li>
              </ul>
            </div>

            {/* 2.2 Données de Paiement */}
            <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                2.2 Données de Paiement & Abonnements
              </div>
              <ul className="space-y-1 text-slate-400 text-xs sm:text-sm">
                <li><strong className="text-slate-300">Finalité :</strong> Gestion des abonnements du foyer via Stripe Inc.</li>
                <li><strong className="text-slate-300">Sécurité bancaire :</strong> Traité directement par Stripe (certifié PCI-DSS Niveau 1). LaVigieAuto ne reçoit ni ne stocke aucun numéro de carte bancaire.</li>
                <li><strong className="text-slate-300">Données conservées :</strong> Identifiant client Stripe, statut de l'abonnement et historique de facturation à des fins comptables obligatoires (durée légale 5 ans).</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. SECTION SPÉCIFIQUE GOOGLE API USER DATA POLICY & LIMITED USE */}
        <section className="space-y-6" id="google-user-data-policy">
          <div className="flex items-center gap-2 pb-2 border-b border-blue-500/30">
            <Calendar className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              3. Données Utilisateur Google & Règles d'Utilisation Limitée (Google API Services User Data Policy)
            </h2>
          </div>

          <div className="bg-gradient-to-br from-blue-950/40 via-slate-800/60 to-slate-900/60 border border-blue-500/30 rounded-2xl p-6 space-y-6 text-sm">
            <p className="text-slate-300 leading-relaxed">
              Dans le cadre de ses fonctionnalités facultatives, LaVigieAuto propose la synchronisation automatique des échéances mécaniques et contrôles techniques avec <strong>Google Calendar</strong>, ainsi que l'authentification par <strong>Google Sign-In</strong>. Cette section détaille de manière transparente notre conformité stricte aux <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold inline-flex items-center gap-1">Règles relatives aux données utilisateur des services d'API Google <ExternalLink className="w-3 h-3" /></a> et aux <a href="https://developers.google.com/workspace/workspace-api-user-data-developer-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold inline-flex items-center gap-1">Règles relatives aux données utilisateur de l'API Google Workspace <ExternalLink className="w-3 h-3" /></a>.
            </p>

            {/* 3.1 Data Accessed */}
            <div className="border-t border-slate-700/60 pt-4 space-y-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                3.1 Données Google Consultées et Collectées (Data Accessed)
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm">
                Lorsque vous autorisez la connexion à votre compte Google, LaVigieAuto accède exclusivement aux données suivantes, strictement limitées aux périmètres (scopes) OAuth autorisés :
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 text-xs sm:text-sm pl-2">
                <li>
                  <strong className="text-slate-200">Profil utilisateur de base</strong> (<code className="text-blue-300 bg-blue-950/60 px-1 py-0.5 rounded text-xs">openid</code>, <code className="text-blue-300 bg-blue-950/60 px-1 py-0.5 rounded text-xs">.../auth/userinfo.email</code>, <code className="text-blue-300 bg-blue-950/60 px-1 py-0.5 rounded text-xs">.../auth/userinfo.profile</code>) : votre adresse email Google, votre nom d'affichage et l'URL de votre photo de profil.
                </li>
                <li>
                  <strong className="text-slate-200">Métadonnées d'agenda Google Calendar</strong> (<code className="text-blue-300 bg-blue-950/60 px-1 py-0.5 rounded text-xs">.../auth/calendar</code>, <code className="text-blue-300 bg-blue-950/60 px-1 py-0.5 rounded text-xs">.../auth/calendar.events</code>) : la liste de vos agendas afin de détecter ou créer le calendrier dédié intitulé <em>« 🚗 Entretien Véhicules »</em> (ou l'agenda principal si vous le choisissez).
                </li>
                <li>
                  <strong className="text-slate-200">Événements d'agenda créés par LaVigieAuto</strong> : LaVigieAuto accède en lecture et écriture <strong>exclusivement</strong> aux événements d'agenda qu'elle a elle-même générés (identifiés par la mention <code>[LaVigieAuto]</code>). <strong>Aucun événement personnel ou externe de votre agenda n'est collecté, lu, traité ou analysé.</strong>
                </li>
              </ul>
            </div>

            {/* 3.2 Data Usage */}
            <div className="border-t border-slate-700/60 pt-4 space-y-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                3.2 Utilisation et Finalités des Données Google (Data Usage)
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm">
                Les données Google sont utilisées pour les finalités uniques suivantes :
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs sm:text-sm pl-2">
                <li>Authentifier l'utilisateur de manière sécurisée et relier son compte à son foyer automobile.</li>
                <li>Créer ou mettre à jour un agenda dédié ou des rendez-vous d'atelier groupés (courroie de distribution, révision périodique, freinage, contrôle technique).</li>
                <li>Configurer des rappels automatiques (notifications pop-up et email à J-30 et J-7) pour vous éviter tout dépassement d'échéance critique.</li>
                <li>Nettoyer les anciens événements LaVigieAuto obsolètes avant une re-synchronisation pour éviter tout doublon dans votre planning.</li>
              </ul>
            </div>

            {/* 3.3 Data Sharing */}
            <div className="border-t border-slate-700/60 pt-4 space-y-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                3.3 Partage et Non-Cession des Données Google (Data Sharing)
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm">
                LaVigieAuto applique une politique de non-partage absolue :
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs sm:text-sm pl-2">
                <li><strong className="text-slate-200">Zéro Revente :</strong> Vos données utilisateur Google ne sont <strong>JAMAIS</strong> vendues, louées, prêtées ou cédées à des tiers, des courtiers en données (data brokers) ou des réseaux publicitaires.</li>
                <li><strong className="text-slate-200">Sous-traitance technique strictement restreinte :</strong> Vos données ne transitent que par nos prestataires d'infrastructure nécessaires à l'exécution de l'application (Supabase pour la base de données chiffrée en Irlande UE et Vercel pour l'hébergement applicatif). Aucun autre tiers n'a accès à vos données Google.</li>
                <li><strong className="text-slate-200">AUCUN partage avec des modèles d'IA :</strong> Les données reçues des API Google (profil et Calendar) ne sont <strong>JAMAIS</strong> transmises à des tiers d'intelligence artificielle ni injectées dans des modèles de langage (LLM).</li>
              </ul>
            </div>

            {/* 3.4 Data Storage & Protection */}
            <div className="border-t border-slate-700/60 pt-4 space-y-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                3.4 Stockage Sécurisé et Protection des Données (Data Storage & Protection)
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm">
                La sécurité des identifiants et jetons Google fait l'objet de mesures rigoureuses :
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs sm:text-sm pl-2">
                <li>Les jetons OAuth 2.0 (access token et refresh token) sont stockés sous forme chiffrée (AES-256) au repos dans notre base de données hébergée en Union Européenne (Supabase, région Irlande).</li>
                <li>Les sessions sont sécurisées par des cookies HTTP-Only, Secure et SameSite=Lax empêchant toute exfiltration XSS.</li>
                <li>Toutes les communications réseau avec les API Google et nos serveurs s'effectuent exclusivement via TLS 1.3 chiffré de bout en bout.</li>
                <li>L'accès aux données au sein de la base est hermétiquement cloisonné par foyer grâce à des politiques de sécurité au niveau des lignes (Row Level Security - RLS) et des contrôles d'accès anti-BOLA/IDOR stricts.</li>
              </ul>
            </div>

            {/* 3.5 Data Retention & Deletion */}
            <div className="border-t border-slate-700/60 pt-4 space-y-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                3.5 Durée de Conservation et Procédure Accessible de Suppression (Data Retention & Deletion)
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm">
                Les jetons d'accès Google sont conservés uniquement pendant la durée d'activation du service de synchronisation par l'utilisateur.
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 text-xs sm:text-sm pl-2">
                <li>
                  <strong className="text-slate-200">Déconnexion immédiate en 1 clic :</strong> Vous pouvez déconnecter Google Calendar à tout instant depuis l'interface de l'application (<em>Tableau de bord &gt; Paramètres &gt; Agenda</em>). Cette action supprime immédiatement les jetons d'accès et d'actualisation de la base de données et des cookies de session.
                </li>
                <li>
                  <strong className="text-slate-200">Révocation depuis votre compte Google :</strong> Vous pouvez révoquer les accès accordés à LaVigieAuto à tout moment depuis les paramètres de sécurité de votre compte Google sur : <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-medium">https://myaccount.google.com/permissions</a>.
                </li>
                <li>
                  <strong className="text-slate-200">Suppression complète du compte et des données :</strong> Vous pouvez demander la suppression intégrale et définitive de votre compte, de vos véhicules et de l'ensemble des données associées en envoyant un email à <a href="mailto:privacy@lavigieauto.com" className="text-blue-400 underline font-medium">privacy@lavigieauto.com</a>. Vos données seront intégralement et irréversiblement purgées sous un délai maximal de 30 jours.
                </li>
              </ul>
            </div>

            {/* 3.6 AI Requirements & Strict Non-Training Guarantee */}
            <div className="border-t border-slate-700/60 pt-4 space-y-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                3.6 Exigences Relatives à l'IA & Non-Entraînement de Modèles (AI Requirements & Model Training Prohibition)
              </h3>
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-4 space-y-2 text-xs sm:text-sm text-slate-300">
                <p>
                  Conformément aux exigences de la <a href="https://developers.google.com/workspace/workspace-api-user-data-developer-policy" target="_blank" rel="noopener noreferrer" className="text-purple-300 underline font-semibold">Google Workspace API User Data and Developer Policy</a> :
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-1">
                  <li>
                    <strong className="text-white">Aucune donnée Google Workspace n'est transférée à des services d'IA :</strong> L'utilisation de modèles d'intelligence artificielle dans LaVigieAuto (Google Gemini API) est <strong>strictement et exclusivement cantonnée à l'analyse OCR de documents d'entretien automobile</strong> (factures papier, cartes grises) téléversés manuellement par l'utilisateur.
                  </li>
                  <li>
                    <strong className="text-white">Interdiction stricte d'entraînement de modèles :</strong> Les données utilisateur issues des API Google (qu'elles soient brutes, dérivées ou agrégées) ne sont <strong>JAMAIS</strong> utilisées, transférées ou vendues pour créer, entraîner, affiner ou améliorer des modèles d'intelligence artificielle (IA) ou d'apprentissage automatique (Machine Learning), qu'ils soient fondationnels ou généralistes.
                  </li>
                  <li>
                    <strong className="text-white">Isolation totale du code :</strong> Le pipeline d'intégration Google Calendar est architecturalement hermétique et isolé des briques d'analyse documentaire IA.
                  </li>
                </ul>
              </div>
            </div>

            {/* 3.7 Affirmative Statement (English & French) */}
            <div className="border-t border-slate-700/60 pt-4 space-y-3">
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                3.7 Déclaration Affirmative de Respect des Règles d'Utilisation Limitée (Affirmative Limited Use Compliance Statement)
              </h3>
              <div className="bg-slate-900/80 border border-emerald-500/40 rounded-xl p-4 text-xs sm:text-sm space-y-3">
                <p className="text-slate-200 italic font-medium leading-relaxed">
                  « L'utilisation et le transfert par LaVigieAuto à toute autre application des informations reçues des API Google respecteront les <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Règles relatives aux données utilisateur des services d'API Google</a>, y compris les exigences d'utilisation limitée (Limited Use requirements). Les données reçues des API Google Workspace ne sont en aucun cas utilisées pour entraîner ou améliorer des modèles d'intelligence artificielle ou d'apprentissage automatique. »
                </p>
                <div className="border-t border-slate-800 pt-2 text-slate-400 text-xs italic">
                  <strong>English version for Google Compliance Audit:</strong><br />
                  “LaVigieAuto’s use and transfer of information received from Google APIs to any other app will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Google API Services User Data Policy</a>, including the Limited Use requirements. Raw, aggregated, or derived user data received from Google Workspace APIs (including Google Calendar) is never transferred to third-party AI services and is never used to develop, train, or improve foundational or generalized machine learning and artificial intelligence models.”
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Absence de Cookies Tiers & Tracking */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Lock className="w-5 h-5 text-emerald-400" />
            4. Cookies et Traceurs
          </h2>
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              LaVigieAuto n'utilise <strong>aucun cookie publicitaire, commercial ou de pistage tiers</strong>.
            </p>
            <p className="text-xs text-slate-400">
              Seuls des cookies techniques de session strictement nécessaires (authentification sécurisée, jetons chiffrés Google Calendar et préférences locales) sont déposés pour assurer le bon fonctionnement de l'application.
            </p>
          </div>
        </section>

        {/* 5. Sous-traitants & Hébergement */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            5. Sous-traitants Qualifiés et Hébergement
          </h2>
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 text-sm space-y-3">
            <p className="text-slate-300">Les données sont traitées avec le concours des prestataires suivants :</p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Supabase Inc.</strong> (Base de données PostgreSQL et coffre-fort documentaire) : Hébergement région EU-West-1 (Irlande), chiffrement AES-256 au repos et en transit.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Vercel Inc.</strong> (Infrastructure applicative et CDN) : Clauses Contractuelles Types de l'UE et conformité RGPD.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Stripe Inc.</strong> (Paiements et gestion des souscriptions) : Certification bancaire PCI-DSS Niveau 1.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Google Cloud / Gemini API</strong> (OCR et analyse documentaire des factures d'entretien téléversées) : Utilisé via l'API commerciale payante sans rétention de données pour l'entraînement des modèles de base de Google. Aucune donnée Google Calendar n'est transmise à ce service.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 6. Vos Droits RGPD */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            6. Vos Droits et Exercice
          </h2>
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 text-sm text-slate-300 leading-relaxed space-y-3">
            <p>Conformément à la réglementation européenne et au RGPD, vous disposez des droits suivants sur vos données :</p>
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

