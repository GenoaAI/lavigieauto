import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getAllBrandParams,
  getMaintenanceDataForBrand,
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
} from 'lucide-react';

interface BrandPageProps {
  params: Promise<{
    brand: string;
  }>;
}

export async function generateStaticParams() {
  return getAllBrandParams();
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { brand } = await params;
  const data = getMaintenanceDataForBrand(brand);

  if (!data) {
    return {
      title: "Plan d'entretien non trouvé | LaVigieAuto",
      description: "Le plan d'entretien constructeur demandé est introuvable sur LaVigieAuto.",
    };
  }

  const title = `Plan d'entretien officiel ${data.brand} : Intervalles, Révisions & Carnet | LaVigieAuto`;
  const description = `Consultez le calendrier d'entretien officiel pour tous les modèles ${data.brand}. Périodicités vidange, révision, distribution et estimation des coûts.`;
  const canonicalUrl = `https://www.lavigieauto.com/entretien/${data.brandSlug}`;

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

export default async function BrandMaintenanceHubPage({ params }: BrandPageProps) {
  const { brand } = await params;
  const data = getMaintenanceDataForBrand(brand);

  if (!data) {
    notFound();
  }

  const allBrands = getAllBrandsSummary();
  const otherBrands = allBrands.filter((b) => b.brandSlug !== data.brandSlug);

  // 1. Schéma JSON-LD : BreadcrumbList
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
        name: 'Entretien',
        item: 'https://www.lavigieauto.com/entretien',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: data.brand,
        item: `https://www.lavigieauto.com/entretien/${data.brandSlug}`,
      },
    ],
  };

  // 2. Schéma JSON-LD : CollectionPage
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Plans d'entretien officiel ${data.brand}`,
    description: `Consultez le calendrier d'entretien officiel pour tous les modèles ${data.brand}.`,
    url: `https://www.lavigieauto.com/entretien/${data.brandSlug}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'LaVigieAuto',
      url: 'https://www.lavigieauto.com',
    },
    hasPart: data.models.map((m) => ({
      '@type': 'ItemPage',
      name: `Plan d'entretien ${m.brand} ${m.model} ${m.engine}`,
      url: `https://www.lavigieauto.com/entretien/${m.brandSlug}/${m.modelSlug}/${m.engineSlug}`,
    })),
  };

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
                  Entretien
                </Link>
              </li>
              <li>/</li>
              <li className="font-semibold text-slate-800">{data.brand}</li>
            </ol>
          </nav>

          {/* En-tête Hero du Hub Constructeur */}
          <header className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100 mb-4">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              Référentiel Constructeur Officiel • {data.brand}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Plans d'entretien et carnets officiels {data.brand}
            </h1>

            <p className="mt-3 text-base text-slate-600 max-w-3xl leading-relaxed">
              Consultez le calendrier d'entretien officiel pour tous les modèles {data.brand}. Périodicités vidange, révision, distribution et estimation des coûts certifiés constructeur.
            </p>

            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-600" />
                <span><strong>{data.models.length}</strong> motorisation{data.models.length > 1 ? 's' : ''} répertoriée{data.models.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Normes et barèmes officiels certifiés</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>Intervalles kilométriques et temporels</span>
              </div>
            </div>
          </header>

          {/* Grille des fiches modèles du constructeur */}
          <section aria-labelledby="models-section-title">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 id="models-section-title" className="text-xl sm:text-2xl font-bold text-slate-900">
                  Modèles et motorisations {data.brand}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Sélectionnez votre motorisation pour accéder à son carnet d'entretien complet.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1">
                {data.models.length} fiche{data.models.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.models.map((v) => (
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
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500 flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-slate-400" />
                      {v.intervals.length} opérations au plan
                    </span>
                    <span className="font-semibold text-blue-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Voir le plan <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Guide et Recommandations Constructeur */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Pourquoi suivre le plan d'entretien officiel {data.brand} ?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-600">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  Maintien de la garantie
                </div>
                <p className="leading-relaxed">
                  Le respect des périodicités et des normes de fluides préconisées par {data.brand} protège votre couverture légale et commerciale en cas d'avarie mécanique.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Valorisation à la revente
                </div>
                <p className="leading-relaxed">
                  Un carnet d'entretien numérique scellé avec l'historique complet des factures justifie une surcote moyenne de +10% à +15% sur le marché de l'occasion.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Détection anticipée des anomalies
                </div>
                <p className="leading-relaxed">
                  Anticipez les opérations majeures (courroie de distribution, bougies, vidange de boîte) pour éviter les pannes immobilisantes et optimiser vos devis atelier.
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
                Votre {data.brand} est-elle à jour de ses révisions ?
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Scannez votre dernière facture de garage ou procès-verbal de contrôle technique. L'IA de LaVigieAuto déduit automatiquement les prochaines échéances de votre {data.brand} et vous alerte avant chaque échéance critique.
              </p>
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={`/dashboard?brand=${encodeURIComponent(data.brand)}&src=brand_hub`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-blue-500 active:scale-95 transition"
                >
                  <span>Créer mon carnet {data.brand} gratuit</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <p className="text-xs text-slate-400">
                100% gratuit • Zéro engagement • Reconnaissance instantanée par IA
              </p>
            </div>
          </section>

          {/* Maillage interne vers les autres constructeurs */}
          {otherBrands.length > 0 && (
            <nav aria-label="Autres constructeurs" className="pt-6 border-t border-slate-200">
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
            </nav>
          )}

        </div>
      </main>
    </>
  );
}
