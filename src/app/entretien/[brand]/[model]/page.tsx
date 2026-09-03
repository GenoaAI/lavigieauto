import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getAllMaintenanceModels,
  getMaintenanceDataForModel,
  getAllBrandsSummary,
} from '@/lib/maintenance/maintenance-data';
import {
  Wrench,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  FileText,
  CheckCircle2,
  Gauge,
  ChevronRight,
  AlertTriangle,
  Droplets,
  Layers,
} from 'lucide-react';

interface ModelPageProps {
  params: Promise<{
    brand: string;
    model: string;
  }>;
}

export async function generateStaticParams() {
  const models = getAllMaintenanceModels();
  return models.map((m) => ({
    brand: m.brandSlug,
    model: m.modelSlug,
  }));
}

export async function generateMetadata({ params }: ModelPageProps): Promise<Metadata> {
  const { brand, model } = await params;
  const data = getMaintenanceDataForModel(brand, model);

  if (!data) {
    return {
      title: "Plan d'entretien non trouvé | LaVigieAuto",
      description: "Le plan d'entretien constructeur demandé est introuvable sur LaVigieAuto.",
    };
  }

  const distributionMention =
    data.hasDistributionBelt && data.hasDistributionChain
      ? 'Courroie & Chaîne'
      : data.hasDistributionBelt
      ? 'Courroie de distribution'
      : 'Distribution par chaîne';

  const title = `Plan d'entretien & Révision ${data.brand} ${data.modelDisplayName} : Programme, Fréquences et Coûts | LaVigieAuto`;
  const description = `Consultez le plan d'entretien officiel et le programme de révision pour ${data.brand} ${data.modelDisplayName} (${data.engines.length} motorisation${data.engines.length > 1 ? 's' : ''}). Périodicités vidange, ${distributionMention.toLowerCase()}, devis et carnet numérique.`;
  const canonicalUrl = `https://www.lavigieauto.com/entretien/${data.brandSlug}/${data.modelSlug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonicalUrl,
      siteName: 'LaVigieAuto',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ModelMaintenancePage({ params }: ModelPageProps) {
  const { brand, model } = await params;
  const data = getMaintenanceDataForModel(brand, model);

  if (!data) {
    notFound();
  }

  const distributionMention =
    data.hasDistributionBelt && data.hasDistributionChain
      ? 'Courroie & Chaîne'
      : data.hasDistributionBelt
      ? 'Courroie de distribution'
      : 'Distribution par chaîne';

  // 1. Schéma JSON-LD : BreadcrumbList (4 niveaux d'arborescence stricts)
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Accueil',
        item: 'https://www.lavigieauto.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: "Plan d'entretien",
        item: 'https://www.lavigieauto.com/entretien',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: data.brand,
        item: `https://www.lavigieauto.com/entretien/${data.brandSlug}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: data.modelDisplayName,
        item: `https://www.lavigieauto.com/entretien/${data.brandSlug}/${data.modelSlug}`,
      },
    ],
  };

  // 2. Schéma JSON-LD : CollectionPage & ItemList
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Plans d'entretien et révisions ${data.brand} ${data.modelDisplayName}`,
    description: `Consultez le calendrier d'entretien officiel pour toutes les motorisations et générations de ${data.brand} ${data.modelDisplayName}.`,
    url: `https://www.lavigieauto.com/entretien/${data.brandSlug}/${data.modelSlug}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'LaVigieAuto',
      url: 'https://www.lavigieauto.com',
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: data.engines.length,
      itemListElement: data.engines.map((e, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${e.brand} ${e.model} ${e.engine}`,
        url: `https://www.lavigieauto.com/entretien/${e.brandSlug}/${e.modelSlug}/${e.engineSlug}`,
      })),
    },
    hasPart: data.engines.map((e) => ({
      '@type': 'ItemPage',
      name: `Plan d'entretien ${e.brand} ${e.model} ${e.engine}`,
      url: `https://www.lavigieauto.com/entretien/${e.brandSlug}/${e.modelSlug}/${e.engineSlug}`,
    })),
  };

  const allModels = getAllMaintenanceModels();
  const otherModelsOfBrand = allModels.filter(
    (m) => m.brandSlug === data.brandSlug && m.modelSlug !== data.modelSlug
  );
  const allBrands = getAllBrandsSummary();
  const otherBrands = allBrands.filter((b) => b.brandSlug !== data.brandSlug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-10">
          
          {/* Fil d'Ariane Sémantique */}
          <nav aria-label="Fil d'Ariane" className="text-xs text-slate-500">
            <ol className="flex items-center gap-1.5 flex-wrap">
              <li>
                <Link href="/" className="hover:underline">
                  Accueil
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/entretien" className="hover:underline">
                  Plan d'entretien
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href={`/entretien/${data.brandSlug}`} className="hover:underline">
                  {data.brand}
                </Link>
              </li>
              <li>/</li>
              <li className="font-semibold text-slate-800">{data.modelDisplayName}</li>
            </ol>
          </nav>

          {/* En-tête Hero du Modèle */}
          <header className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100 mb-4">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              Référentiel Constructeur Officiel • {data.brand} {data.modelDisplayName}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Plan d'entretien & Révision {data.brand} {data.modelDisplayName}
            </h1>

            <p className="mt-3 text-base text-slate-600 max-w-3xl leading-relaxed">
              Consultez le programme d'entretien officiel, les périodicités de vidange et le calendrier de révision pour {data.brand} {data.modelDisplayName} ({data.productionYearsRange}). Données certifiées constructeur pour préserver votre garantie et optimiser la longévité mécanique.
            </p>

            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-600" />
                <span><strong>{data.count}</strong> motorisation{data.count > 1 ? 's' : ''} disponible{data.count > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Production : <strong>{data.productionYearsRange}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-600" />
                <span>Distribution : <strong>{distributionMention}</strong></span>
              </div>
              {data.powerRange.min > 0 && (
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Puissances : <strong>{data.powerRange.min === data.powerRange.max ? `${data.powerRange.min} ch` : `${data.powerRange.min} à ${data.powerRange.max} ch`}</strong></span>
                </div>
              )}
            </div>
          </header>

          {/* Synthèse Direct Answer GEO & Position 0 */}
          <section className="bg-white rounded-2xl border-l-4 border-l-blue-600 border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Synthèse d'Entretien Constructeur • Direct Answer
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">
              À quelle fréquence réaliser l'entretien de votre {data.brand} {data.modelDisplayName} ?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-slate-600">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Vidange & Révision annuelle
                </div>
                <p className="leading-relaxed">
                  Périodicité constructeur : tous les <strong>15 000 à 30 000 km</strong> ou tous les <strong>1 à 2 ans</strong> selon votre type de roulage (conditions sévères en milieu urbain vs usage autoroutier standard).
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Droplets className="w-4 h-4 text-indigo-600" />
                  Normes d'huile homologuées
                </div>
                <p className="leading-relaxed">
                  Normes préconisées : <strong>{data.recommendedOilNorms.join(' ou ')}</strong> (viscosité <strong>{data.oilViscosities.join(' / ')}</strong>). Le respect de ces spécifications est indispensable pour préserver la mécanique.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  Distribution ({distributionMention})
                </div>
                <p className="leading-relaxed">
                  {data.hasDistributionBelt
                    ? 'Courroie de distribution : remplacement préventif obligatoire tous les 5 à 6 ans ou 100 000 à 160 000 km pour éviter toute casse moteur irréversible.'
                    : 'Distribution par chaîne : sans échéance de remplacement périodique impératif, un contrôle de tension est préconisé lors des révisions majeures.'}
                </p>
              </div>
            </div>

            {data.hasVulnerabilities && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Points de vigilance constructeur identifiés :</strong> Certaines motorisations de la gamme {data.modelDisplayName} font l'objet de préconisations atelier spécifiques (ex. contrôle d'usure de courroie, calamine d'admission ou chaîne). Sélectionnez votre motorisation ci-dessous pour consulter l'analyse détaillée.
                </div>
              </div>
            )}
          </section>

          {/* Grille des fiches motorisations */}
          <section aria-labelledby="engines-section-title">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 id="engines-section-title" className="text-xl sm:text-2xl font-bold text-slate-900">
                  Motorisations et générations {data.brand} {data.modelDisplayName}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Sélectionnez votre motorisation pour afficher le programme officiel, le barème kilométrique et les estimations de coût.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1">
                {data.engines.length} motorisation{data.engines.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.engines.map((v) => (
                <Link
                  key={`${v.brandSlug}-${v.modelSlug}-${v.engineSlug}`}
                  href={`/entretien/${v.brandSlug}/${v.modelSlug}/${v.engineSlug}`}
                  className="group flex flex-col justify-between bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                        {v.generation ? `Génération ${v.generation}` : v.brand}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {v.fuelType}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {v.model} <span className="font-normal text-slate-600">{v.engine}</span>
                    </h3>

                    <p className="mt-1 text-xs text-slate-500 font-medium">
                      Code moteur {v.engineCode} • {v.powerHp} ch • {v.productionYears}
                    </p>

                    <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100 space-y-1">
                      <div>
                        <span className="font-semibold text-slate-700">Huile :</span> {v.recommendedOilNorm} ({v.oilViscosity})
                      </div>
                      <div className="line-clamp-2 text-slate-500 leading-snug">
                        {v.directAnswerSummary}
                      </div>
                    </div>

                    {Array.isArray(v.vulnerabilities) && v.vulnerabilities.length > 0 && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800">
                        <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                        <span>Point de vigilance constructeur</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500 flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-slate-400" />
                      {v.intervals.length} opérations au plan
                    </span>
                    <span className="font-semibold text-blue-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Consulter le plan <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Guide et Recommandations Constructeur */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Pourquoi respecter le plan d'entretien constructeur pour votre {data.brand} {data.modelDisplayName} ?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-600">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  Maintien de la garantie constructeur
                </div>
                <p className="leading-relaxed">
                  Conformément au règlement européen n° 461/2010, vous êtes libre de faire entretenir votre {data.brand} dans n'importe quel garage sans perdre la garantie légale, sous réserve du respect strict des préconisations du carnet constructeur.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Valorisation à la revente (+10% à +15%)
                </div>
                <p className="leading-relaxed">
                  Un carnet d'entretien numérique scellé avec factures horodatées rassure immédiatement les acheteurs d'occasion et justifie un prix supérieur au cours moyen du marché.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Prévention des pannes immobilisantes
                </div>
                <p className="leading-relaxed">
                  Le suivi rigoureux des fluides, des filtres et du cycle de distribution évite les pannes moteur coûteuses et vous permet d'anticiper vos dépenses de maintenance en atelier.
                </p>
              </div>
            </div>
          </section>

          {/* Bannière OCR / Carnet Intelligent & CTA vers /dashboard */}
          <section className="rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 p-8 sm:p-10 text-white text-center shadow-lg">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-400/30">
                <Sparkles className="h-3.5 w-3.5 text-blue-300" />
                Carnet Numérique Intelligent
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                Votre {data.brand} {data.modelDisplayName} est-elle à jour de ses révisions ?
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Scannez votre dernière facture d'atelier ou procès-verbal de contrôle technique. L'IA de LaVigieAuto déduit automatiquement les prochaines échéances de votre {data.brand} {data.modelDisplayName} et vous alerte avant chaque échéance critique.
              </p>
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={`/dashboard?brand=${encodeURIComponent(data.brand)}&model=${encodeURIComponent(data.modelDisplayName)}&src=model_hub`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-blue-500 active:scale-95 transition"
                >
                  <span>Créer mon carnet {data.brand} {data.modelDisplayName} gratuit</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <p className="text-xs text-slate-400">
                100% gratuit • Zéro engagement • Reconnaissance instantanée par IA
              </p>
            </div>
          </section>

          {/* Maillage interne vers les autres modèles et constructeurs */}
          <footer className="pt-6 border-t border-slate-200 space-y-6">
            {otherModelsOfBrand.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Autres modèles {data.brand} :
                </h3>
                <div className="flex flex-wrap gap-2">
                  {otherModelsOfBrand.map((m) => (
                    <Link
                      key={m.modelSlug}
                      href={`/entretien/${data.brandSlug}/${m.modelSlug}`}
                      className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition"
                    >
                      {data.brand} {m.modelDisplayName} ({m.count})
                    </Link>
                  ))}
                  <Link
                    href={`/entretien/${data.brandSlug}`}
                    className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                  >
                    Voir toute la gamme {data.brand} →
                  </Link>
                </div>
              </div>
            )}

            {otherBrands.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Consulter les plans d'entretien d'autres marques :
                </h3>
                <div className="flex flex-wrap gap-2">
                  {otherBrands.map((b) => (
                    <Link
                      key={b.brandSlug}
                      href={`/entretien/${b.brandSlug}`}
                      className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition"
                    >
                      {b.brand} ({b.count})
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </footer>

        </div>
      </main>
    </>
  );
}
