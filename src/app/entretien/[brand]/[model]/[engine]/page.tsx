import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllMaintenanceParams, getMaintenanceData } from '@/lib/maintenance/maintenance-data';
import { MaintenanceDropzone } from '@/components/maintenance/MaintenanceDropzone';
import { MaintenanceTable } from '@/components/maintenance/MaintenanceTable';
import { ReliabilityAlert } from '@/components/maintenance/ReliabilityAlert';
import { MaintenanceFAQ } from '@/components/maintenance/MaintenanceFAQ';

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

  const title = `Plan d'entretien ${data.brand} ${data.model} ${data.engine} : Intervalles, Courroie et Coûts`;
  const description = `Calendrier d'entretien officiel pour ${data.brand} ${data.model} ${data.engine}. Périodicité vidange (${data.recommendedOilNorm}), changement de courroie de distribution, points de contrôle et estimation des devis.`;

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
    brand: {
      '@type': 'Brand',
      name: data.brand,
    },
    model: data.model,
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

      <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm">
          
          {/* Fil d'Ariane Sémantique */}
          <nav aria-label="Fil d'Ariane" className="text-xs text-slate-500 mb-6">
            <ol className="flex items-center gap-1.5 flex-wrap">
              <li><a href="/" className="hover:underline">Accueil</a></li>
              <li>/</li>
              <li><a href="/entretien" className="hover:underline">Entretien</a></li>
              <li>/</li>
              <li><a href={`/entretien/${data.brandSlug}`} className="hover:underline">{data.brand}</a></li>
              <li>/</li>
              <li className="font-semibold text-slate-800">{data.model} ({data.engine})</li>
            </ol>
          </nav>

          {/* En-tête H1 */}
          <header className="border-b border-slate-100 pb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Plan d'entretien {data.brand} {data.model} {data.engine}
            </h1>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              Motorisation {data.engineCode} • {data.fuelType} ({data.powerHp} ch) • Années {data.productionYears}
            </p>
          </header>

          {/* Direct Answer GEO & Position 0 */}
          <section aria-labelledby="geo-summary-title" className="my-6 rounded-xl bg-slate-50 p-5 border-l-4 border-blue-600">
            <h2 id="geo-summary-title" className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-1">
              Synthèse des préconisations officielles
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed">
              {data.directAnswerSummary}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600 font-normal">
              <span><strong>Huile préconisée :</strong> {data.recommendedOilNorm}</span>
              <span><strong>Viscosité :</strong> {data.oilViscosity}</span>
            </div>
          </section>

          {/* Déposoir OCR / Lead Magnet */}
          <MaintenanceDropzone brand={data.brand} engine={data.engine} model={data.model} />

          {/* Tableau des échéances d'entretien */}
          <section className="my-10">
            <h2 className="text-xl font-bold text-slate-900">
              Calendrier des révisions et périodicité des opérations
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Intervalles kilométriques et temporels préconisés pour garantir la longévité mécanique de votre véhicule.
            </p>
            <MaintenanceTable intervals={data.intervals} />
          </section>

          {/* Points de vigilance & Optimisation Atelier */}
          <section className="my-10">
            <h2 className="text-xl font-bold text-slate-900">
              Alertes fiabilité & Optimisation de vos devis de garage
            </h2>
            <ReliabilityAlert bundles={data.costOptimizationBundles} vulnerabilities={data.vulnerabilities} />
          </section>

          {/* Questions Fréquentes (FAQ) */}
          <section className="my-10">
            <h2 className="text-xl font-bold text-slate-900">
              Questions fréquentes sur l'entretien de la {data.brand} {data.model}
            </h2>
            <MaintenanceFAQ faqs={data.faqs} />
          </section>

          {/* CTA Pied de page */}
          <footer className="mt-12 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 p-8 text-center text-white">
            <h3 className="text-xl font-bold">Automatisez le suivi d'entretien de votre foyer</h3>
            <p className="mt-2 text-sm text-slate-300 max-w-lg mx-auto">
              Centralisez vos véhicules, recevez vos alertes révision à J-30 et générez votre carnet numérique certifié pour la revente.
            </p>
            <a
              href="/app/onboarding"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-500 active:scale-95"
            >
              Créer mon espace Vigie gratuit
            </a>
          </footer>

        </article>
      </main>
    </>
  );
}
