import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllMaintenanceParams, getMaintenanceData } from '@/lib/maintenance/maintenance-data';
import { MaintenanceDropzone } from '@/components/maintenance/MaintenanceDropzone';
import { MaintenanceTable } from '@/components/maintenance/MaintenanceTable';
import { ReliabilityAlert } from '@/components/maintenance/ReliabilityAlert';
import { MaintenanceFAQ } from '@/components/maintenance/MaintenanceFAQ';
import { MaintenancePrintActions } from '@/components/maintenance/MaintenancePrintActions';

interface PageProps {
  params: Promise<{
    brand: string;
    model: string;
    engine: string;
  }>;
}

export async function generateStaticParams() {
  return getAllMaintenanceParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand, model, engine } = await params;
  const data = getMaintenanceData(brand, model, engine);

  if (!data) {
    return {
      title: "Plan d'entretien non trouvé | LaVigieAuto",
      description: "Le plan d'entretien constructeur demandé est introuvable sur LaVigieAuto.",
    };
  }

  const isBelt = Boolean(
    (data as any).distribution?.type === 'belt' ||
    data.intervals.some(
      (i) =>
        i.id.includes('courroie-distribution') ||
        i.operation.toLowerCase().includes('courroie de distribution') ||
        (i.category === 'moteur' &&
          i.operation.toLowerCase().includes('distribution') &&
          !i.operation.toLowerCase().includes('chaîne') &&
          !i.operation.toLowerCase().includes('chaine'))
    )
  );

  const distributionTitle = isBelt ? 'Courroie' : 'Chaîne';
  const distributionDesc = isBelt
    ? 'changement de courroie de distribution'
    : 'contrôle de distribution par chaîne';

  const title = `Plan d'entretien & Révision ${data.brand} ${data.model} (${data.engine}) : Fréquences vidange, ${distributionTitle} & Fiche PDF | LaVigieAuto`;
  const description = `Plan d'entretien constructeur & révision pour ${data.brand} ${data.model} ${data.engine}. Fréquences de vidange, norme d'huile ${data.recommendedOilNorm}, ${distributionDesc}. Fiche PDF officielle et carnet d'entretien gratuit.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.lavigieauto.com/entretien/${data.brandSlug}/${data.modelSlug}/${data.engineSlug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://www.lavigieauto.com/entretien/${data.brandSlug}/${data.modelSlug}/${data.engineSlug}`,
      siteName: 'LaVigieAuto',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function VehicleMaintenancePage({ params }: PageProps) {
  const { brand, model, engine } = await params;
  const data = getMaintenanceData(brand, model, engine);

  if (!data) {
    notFound();
  }

  // 1. Schéma JSON-LD : FAQPage
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  // 2. Schéma JSON-LD : Car / Product
  const vehicleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${data.brand} ${data.model} ${data.engine}`,
    description: `Calendrier d'entretien officiel & révision pour ${data.brand} ${data.model} ${data.engine}.`,
    url: `https://www.lavigieauto.com/entretien/${data.brandSlug}/${data.modelSlug}/${data.engineSlug}`,
    image: `https://www.lavigieauto.com/images/vehicles/${data.brandSlug}-${data.modelSlug}.jpg`,
    brand: {
      '@type': 'Brand',
      name: data.brand,
    },
    manufacturer: {
      '@type': 'Organization',
      name: data.brand,
    },
    model: data.model,
    fuelType: data.fuelType,
    vehicleEngine: {
      '@type': 'EngineSpecification',
      name: data.engine,
      engineType: data.fuelType,
      enginePower: {
        '@type': 'QuantitativeValue',
        value: data.powerHp,
        unitCode: 'HP',
      },
    },
  };

  // 3. Schéma JSON-LD : BreadcrumbList
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
        name: `${data.model} (${data.engine})`,
        item: `https://www.lavigieauto.com/entretien/${data.brandSlug}/${data.modelSlug}/${data.engineSlug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(vehicleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm">
          
          {/* Fil d'Ariane Sémantique */}
          <nav aria-label="Fil d'Ariane" className="text-xs text-slate-500 mb-6 print:hidden">
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
              <li className="font-semibold text-slate-800">{data.model} ({data.engine})</li>
            </ol>
          </nav>

          {/* En-tête certifié pour l'impression A4 */}
          <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-6">
            <div className="flex justify-between items-center text-xs text-slate-700 font-semibold">
              <span className="font-bold text-slate-900">LaVigieAuto.com • Fiche d'Entretien Officielle Constructeur</span>
              <span>Document édité pour {data.brand} {data.model} ({data.engine})</span>
            </div>
          </div>

          {/* En-tête H1 */}
          <header className="border-b border-slate-100 pb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Plan d'entretien & Révision {data.brand} {data.model} ({data.engine})
            </h1>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              Motorisation {data.engineCode} • {data.fuelType} ({data.powerHp} ch) • Années {data.productionYears}
            </p>
          </header>

          {/* Direct Answer GEO & Position 0 */}
          <section aria-labelledby="geo-summary-title" className="my-6 rounded-xl bg-slate-50 p-5 border-l-4 border-blue-600">
            <h2 id="geo-summary-title" className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-1">
              Synthèse des préconisations constructeur
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed">
              {data.directAnswerSummary}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600 font-normal">
              <span><strong>Huile préconisée :</strong> {data.recommendedOilNorm}</span>
              <span><strong>Viscosité :</strong> {data.oilViscosity}</span>
            </div>
          </section>

          {/* Action Imprimer / Télécharger la fiche PDF & Lead Magnet Vigie Foyer */}
          <MaintenancePrintActions
            brand={data.brand}
            model={data.model}
            engine={data.engine}
            recommendedOilNorm={data.recommendedOilNorm}
            oilViscosity={data.oilViscosity}
          />

          {/* Déposoir OCR / Lead Magnet */}
          <div className="print:hidden">
            <MaintenanceDropzone brand={data.brand} engine={data.engine} model={data.model} />
          </div>

          {/* Tableau des échéances d'entretien */}
          <section className="my-10">
            <h2 className="text-xl font-bold text-slate-900">
              Périodicité des vidanges & révisions constructeur
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Intervalles kilométriques et temporels préconisés pour garantir la longévité mécanique de votre véhicule.
            </p>
            <MaintenanceTable intervals={data.intervals} />
          </section>

          {/* Points de vigilance & Vulnérabilités connues */}
          {data.vulnerabilities && data.vulnerabilities.length > 0 && (
            <section className="my-10">
              <h2 className="text-xl font-bold text-slate-900">
                Points de contrôle critiques & vulnérabilités connues
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Points de vigilance et éléments mécaniques à surveiller pour éviter les pannes prématurées.
              </p>
              <ReliabilityAlert bundles={[]} vulnerabilities={data.vulnerabilities} />
            </section>
          )}

          {/* Estimation du budget d'entretien annuel */}
          {data.costOptimizationBundles && data.costOptimizationBundles.length > 0 && (
            <section className="my-10">
              <h2 className="text-xl font-bold text-slate-900">
                Estimation du budget d'entretien annuel
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Optimisez vos devis de garage et découvrez les économies réalisables en regroupant les interventions.
              </p>
              <ReliabilityAlert bundles={data.costOptimizationBundles} vulnerabilities={[]} />
            </section>
          )}

          {/* Questions Fréquentes (FAQ) */}
          <section className="my-10">
            <h2 className="text-xl font-bold text-slate-900">
              Questions fréquentes sur l'entretien {data.brand} {data.model}
            </h2>
            <MaintenanceFAQ faqs={data.faqs} />
          </section>

          {/* CTA Pied de page */}
          <footer className="mt-12 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 p-8 text-center text-white print:hidden">
            <h2 className="text-xl font-bold">Carnet d'entretien numérique & suivi en temps réel</h2>
            <p className="mt-2 text-sm text-slate-300 max-w-lg mx-auto">
              Centralisez vos véhicules, recevez vos alertes révision à J-30 et générez votre carnet numérique certifié pour la revente.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-500 active:scale-95"
            >
              Créer mon espace Vigie gratuit
            </Link>
          </footer>

        </article>
      </main>
    </>
  );
}
