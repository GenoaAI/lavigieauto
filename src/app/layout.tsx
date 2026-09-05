import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Car, Sparkles, ArrowRight, CheckCircle2, Phone, FileText, BookOpen } from "lucide-react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { UserNavHeader } from "@/components/layout/UserNavHeader";
import { FeedbackDrawer } from "@/components/feedback/FeedbackDrawer";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaVigieAuto — La Vigie Automobile Intelligente du Foyer",
  description: "Zéro oubli mécanique, zéro facture égarée. Pilotez l'entretien de tous les véhicules de votre foyer en 2 gestes simples grâce à l'assistant.",
  verification: {
    google: "eI9In4QhOpoSeoA6idet_mNIgEejxV4KGO4pVumtTR4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        {/* Header / Navbar */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                LaVigieAuto
              </span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-7 lg:gap-9 text-sm font-medium text-slate-600">
              <Link href="/#methode-2-gestes" className="hover:text-blue-600 transition">
                Comment ça marche
              </Link>
              <Link href="/entretien" className="hover:text-blue-600 transition flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span>Plans d&apos;entretien</span>
              </Link>
            </nav>

            {/* CTA & User Profile Nav */}
            <div className="flex items-center gap-3">
              <UserNavHeader />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 pb-28 md:pb-0">{children}</main>

        {/* Module Feedback MicroKanban Intégré */}
        <FeedbackDrawer />

        {/* Barre de navigation basse pour mobile */}
        <MobileBottomNav />


        {/* Footer */}
        <footer className="bg-slate-900 text-white py-12 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-8 pb-12 border-b border-slate-800">
              {/* Brand Col */}
              <div className="space-y-4 md:col-span-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="font-extrabold text-white text-lg tracking-tight">LaVigieAuto</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  L'intelligence artificielle dédiée à la santé mécanique et à la valorisation des véhicules de toute votre famille.
                </p>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Conforme carnet constructeur & RGPD
                </div>
              </div>

              {/* Col 1 */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-200">Produit</p>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li>
                    <Link href="/#scan-first" className="hover:text-white transition">
                      Scan IA OCR Factures & CT
                    </Link>
                  </li>
                  <li>
                    <Link href="/#methode-2-gestes" className="hover:text-white transition">
                      Geste 1 : Script garage
                    </Link>
                  </li>
                  <li>
                    <Link href="/#methode-2-gestes" className="hover:text-white transition">
                      Geste 2 : Scan & Rapprochement
                    </Link>
                  </li>
                  <li>
                    <Link href="/v/cert-demo-8492" className="hover:text-white transition">
                      Rapport Certifié pour Revente
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Col 2 : Plans d'Entretien Constructeur (SEO) */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  <Link href="/entretien" className="hover:text-blue-400 transition flex items-center gap-1 group">
                    <span>Plans d&apos;Entretien Constructeur</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                  </Link>
                </p>
                <div className="space-y-3 text-xs text-slate-400">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                      Par Marque
                    </p>
                    <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
                      <li>
                        <Link href="/entretien/peugeot" className="hover:text-white transition">Peugeot</Link>
                      </li>
                      <li>
                        <Link href="/entretien/renault" className="hover:text-white transition">Renault</Link>
                      </li>
                      <li>
                        <Link href="/entretien/dacia" className="hover:text-white transition">Dacia</Link>
                      </li>
                      <li>
                        <Link href="/entretien/citroen" className="hover:text-white transition">Citroën</Link>
                      </li>
                      <li>
                        <Link href="/entretien/volkswagen" className="hover:text-white transition">Volkswagen</Link>
                      </li>
                      <li>
                        <Link href="/entretien/toyota" className="hover:text-white transition">Toyota</Link>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                      Fiches Phares
                    </p>
                    <ul className="space-y-1 text-[11px]">
                      <li>
                        <Link href="/entretien/dacia/sandero-2/0-9-tce-90" className="hover:text-white transition">
                          Sandero 2 TCe
                        </Link>
                      </li>
                      <li>
                        <Link href="/entretien/renault/clio-4/1-5-dci-90" className="hover:text-white transition">
                          Clio 4 dCi
                        </Link>
                      </li>
                      <li>
                        <Link href="/entretien/peugeot/208/1-2-puretech-82" className="hover:text-white transition">
                          208 PureTech
                        </Link>
                      </li>
                      <li>
                        <Link href="/entretien/peugeot/3008/1-2-puretech-130" className="hover:text-white transition">
                          3008 PureTech
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Col 3 */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-200">Foyer & Partage</p>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li>
                    <Link href="/dashboard" className="hover:text-white transition">
                      Tableau de bord Foyer
                    </Link>
                  </li>
                  <li>
                    <span className="hover:text-white transition cursor-pointer">
                      Synchronisation Google Calendar
                    </span>
                  </li>
                  <li>
                    <span className="hover:text-white transition cursor-pointer">
                      Multi-conducteurs & Rôles
                    </span>
                  </li>
                  <li>
                    <span className="hover:text-white transition cursor-pointer">
                      Alertes Anticipées J-30
                    </span>
                  </li>
                </ul>
              </div>

              {/* Col 3 */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-200">Garanties & Confiance</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Données chiffrées en transit et au repos. Aucune revente de données personnelles à des tiers.
                </p>
                <div className="pt-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs border border-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span>Hébergement sécurisé</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
              <p>© {new Date().getFullYear()} LaVigieAuto — GENOA ADVISORY SARL. Tous droits réservés.</p>
              <div className="flex flex-wrap items-center gap-6">
                <Link href="/mentions-legales" className="hover:text-white transition">
                  Mentions Légales
                </Link>
                <Link href="/politique-confidentialite" className="hover:text-white transition">
                  Politique de Confidentialité
                </Link>
                <Link href="/conditions-generales" className="hover:text-white transition">
                  Conditions Générales (CGU / CGV)
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
