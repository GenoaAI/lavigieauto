import { testReconciliation } from "./reconciliation.test";
import { testCycles } from "./cycles.test";
import { testReservationKit } from "./reservation-kit.test";
import { testConformityScore } from "./conformity-score.test";
import { testStripePricing } from "./stripe-pricing.test";
import { runDocumentExtractionTests } from "./document-extraction.test";
import { testVaultStorageConfiguration } from "./vault-storage.test";
import { testTireEngine } from "./tires.test";
import { runScheduleMathAuditTests } from "./schedule-math-audit.test";
import { testBundlingEngine } from "./bundling.test";
import { runSkillsLoaderTest } from "./skills-loader.test";
import { testCalendarSyncEngine } from "./calendar-sync.test";
import { testMobileResponsiveArchitecture } from "./mobile-responsive.test";
import { testVehicleLifecycleManagement } from "./vehicle-lifecycle.test";
import { testFeedbackIntegration } from "./feedback.test";
import { testGarageResolver } from "./garage-resolver.test";
import { testHouseholdNameManagement } from "./household-name.test";
import { testHouseholdInvitationAndUniversalCalendar } from "./household-invitation-calendar.test";
import { testTireSearchService } from "./tire-search.test";
import { testInvoiceDeletionAndRecalculation } from "./invoice-deletion-recalculation.test";
import { testCollapsibleModules } from "./collapsible-modules.test";
import { runAdversarialCollapsibleTests } from "./adversarial-collapsible-challenger.test";
import { runCollapsibleStressTests } from "./collapsible-stress.test";
import { testManufacturerPlanRobustness } from "./manufacturer-plan-robustness.test";
import { runAdversarialPowertrainTests } from "./adversarial-powertrain-archetypes.test";
import { testVitaraFullStackNonRegression } from "./vitara-non-regression.test";
import { testVehicleCatalogResolution } from "./vehicle-catalog.test";

async function runAllTests() {
  console.log("=================================================");
  console.log("🚀 LAVIGIEAUTO — SUITE DE TESTS D'INTÉGRATION");
  console.log("=================================================\n");

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  const testSuites = [
    { name: "Tests de Robustesse & Layout Stability (Challenger 2 - CSS Grid, CLS & Leak Free)", fn: runAdversarialCollapsibleTests },
    { name: "Tests de Stress & Robustesse Adversariale (Collapsible Cards)", fn: runCollapsibleStressTests },
    { name: "Système de Cartes Pliables / Dépliables (Collapsible Cards, Hook & Toggle)", fn: testCollapsibleModules },
    { name: "Suppression Totale de Facture, Nettoyage Base & Recalcul Carnet/Odomètre", fn: testInvoiceDeletionAndRecalculation },
    { name: "Invitation Foyer Universelle (Multi-Webmails) & Export Calendrier (ICS/URLs)", fn: testHouseholdInvitationAndUniversalCalendar },
    { name: "Édition Sécurisée du Nom de Foyer (Zod, Sanitizer & Server Action)", fn: testHouseholdNameManagement },
    { name: "Gestion du Cycle de Vie Véhicule (Suspension & Suppression)", fn: testVehicleLifecycleManagement },
    { name: "Architecture Responsive & Mobile-First (Navigation, Dropzone & Modales)", fn: testMobileResponsiveArchitecture },
    { name: "Découplage LLM & Prompts Markdown (Zero Hardcoding Skills)", fn: runSkillsLoaderTest },
    { name: "Intégration Google Calendar & Authentification OAuth 2.0", fn: testCalendarSyncEngine },
    { name: "Moteur de Réconciliation (Factures vs Échéances)", fn: testReconciliation },
    { name: "Moteur Prédictif des Cycles & Rythme KM", fn: testCycles },
    { name: "Audit Mathématique Rigoureux des Échéances (Temps vs KM)", fn: runScheduleMathAuditTests },
    { name: "Regroupement Intelligent d'Atelier & Tolérance (Smart Bundling)", fn: testBundlingEngine },
    { name: "Moteur de Suivi Prédictif des Pneumatiques (Train AV/AR)", fn: testTireEngine },
    { name: "Comparateur de Pneumatiques & Agrégation Pose / Équilibrage", fn: testTireSearchService },
    { name: "Sélection Intelligente & Pondération du Garagiste Recommandé", fn: testGarageResolver },
    { name: "Générateur du Kit Prêt-à-Réserver (Geste 1)", fn: testReservationKit },
    { name: "Calculateur du Score de Conformité & Revente", fn: testConformityScore },
    { name: "Facturation Dégressive Stripe (Foyer Multi-Véhicules)", fn: testStripePricing },
    { name: "Normalisation Multi-Documents (Cartes Grises, Factures, PV CT)", fn: runDocumentExtractionTests },
    { name: "Coffre-fort Documentaire (Supabase Storage & Nomenclature)", fn: testVaultStorageConfiguration },
    { name: "Système de Feedback Intégré & Webhook MicroKanban", fn: testFeedbackIntegration },
    { name: "Robustesse & Exactitude des Plans Constructeurs (Zéro Fausse Clim & OEM)", fn: testManufacturerPlanRobustness },
    { name: "Matrice Multi-Archetypes & Stress Adversarial (Challenger 2)", fn: runAdversarialPowertrainTests },
    { name: "Non-Régression Formelle Suzuki Vitara 1.6 VVT AllGrip (M16A Full Stack)", fn: testVitaraFullStackNonRegression },
    { name: "Référentiel Catalogue Véhicules & Découplage Zéro Hardcoding", fn: testVehicleCatalogResolution },
  ];


  for (const suite of testSuites) {
    try {
      await suite.fn();
      passed++;
    } catch (err: any) {
      console.error(`❌ ÉCHEC : ${suite.name}`);
      console.error(`   Détail : ${err.message}\n`);
      failed++;
    }
  }

  const duration = Date.now() - startTime;

  console.log("\n=================================================");
  console.log(`📊 RÉSULTAT GLOBAL : ${passed}/${testSuites.length} suites validées (${duration}ms)`);
  if (failed === 0) {
    console.log("🎉 TOUS LES TESTS SONT AU VERT !");
  } else {
    console.log(`⚠️ ${failed} test(s) en échec.`);
    process.exit(1);
  }
  console.log("=================================================\n");
}

runAllTests();
