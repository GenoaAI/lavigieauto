import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getMaintenanceDataByBrand, getAllMaintenanceData } from '@/lib/maintenance/maintenance-data';

export const metadata: Metadata = {
  title: "Plans d'Entretien Constructeur & Carnets Numériques par Modèle | LaVigieAuto",
  description:
    "Consultez les calendriers d'entretien officiels, périodicités de vidange, changement de courroie de distribution et estimations de devis par marque et modèle. Transparent et certifié.",
  alternates: {
    canonical: 'https://www.lavigieauto.com/entretien',
  },
  openGraph: {
    title: "Plans d'Entretien Constructeur & Carnets Numériques par Modèle | LaVigieAuto",
    description:
      "Consultez les calendriers d'entretien officiels, périodicités de vidange et de courroie par marque et modèle.",
    type: 'website',
    url: 'https://www.lavigieauto.com/entretien',
    siteName: 'LaVigieAuto',
  },
};

export default function MaintenanceHubPage() {
  const groupedData = getMaintenanceDataByBrand();
  const allModels = getAllMaintenanceData();
  const brands = Object.keys(groupedData).sort();

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
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
            <li className="font-semibold text-slate-800">Entretien automobile</li>
          </ol>
        </nav>

        {/* En-tête du Hub */}
        <header className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100 mb-4">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Référentiel Constructeur & Barèmes Officiels
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Plans d'entretien et carnets constructeur par marque et modèle
          </h1>
          <p className="mt-3 text-base text-slate-600 max-w-3xl leading-relaxed">
            Accédez gratuitement aux périodicités officielles de révision, normes d'huile homologuées, intervalles de distribution et points de vigilance de {allModels.length} motorisations répertoriées.
          </p>

          {/* Raccourcis rapides par marque */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">
              Accès direct :
            </span>
            {brands.map((brand) => (
              <a
                key={brand}
                href={`#marque-${brand.toLowerCase()}`}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition"
              >
                {brand} ({groupedData[brand].length})
              </a>
            ))}
          </div>
        </header>

        {/* Liste des Modèles groupés par marque */}
        <div className="space-y-12">
          {brands.map((brand) => {
            const vehicles = groupedData[brand];
            return (
              <section
                key={brand}
                id={`marque-${brand.toLowerCase()}`}
                className="scroll-mt-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">{brand}</h2>
                  <span className="rounded-full bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5">
                    {vehicles.length} modèle{vehicles.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vehicles.map((v) => (
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
                        <p className="mt-1 text-xs text-slate-500">
                          Code moteur {v.engineCode} • {v.powerHp} ch • {v.productionYears}
                        </p>

                        <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {v.directAnswerSummary}
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-500">
                          {v.intervals.length} opérations au carnet
                        </span>
                        <span className="font-semibold text-blue-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Voir le plan &rarr;
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Bannière OCR / Carnet Intelligent */}
        <section className="rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 p-8 sm:p-10 text-white text-center shadow-lg">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-bold">Votre véhicule n'est pas encore dans la liste ?</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Scannez simplement votre dernière facture de garage ou votre contrôle technique. L'IA de LaVigieAuto déduit automatiquement les préconisations constructeur adaptées à votre moteur.
            </p>
            <div className="pt-2">
              <Link
                href="/app/onboarding"
                className="inline-block rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-500 active:scale-95 transition"
              >
                Créer mon carnet d'entretien personnalisé
              </Link>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
