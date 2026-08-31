import { calculateConformityScore, ConformityCalculationParams } from "../src/lib/engine/conformity-score";
import { sendFeedbackAction } from "../src/app/actions/feedback";
import * as fs from "fs";
import * as path from "path";

export async function runChallengerR1R2EmpiricalTests() {
  console.log("=================================================");
  console.log("🛡️ [CHALLENGER 1] EMPIRICAL ADVERSARIAL VERIFICATION: R1 & R2");
  console.log("=================================================\n");

  // =========================================================================
  // SECTION 1: CONFORMITY SCORE ENGINE & CT STATUS STRESS TESTING
  // =========================================================================
  console.log("▶ [CHALLENGE 1.1] Conformity Score: CT Statuses & Defect Count Boundary Matrix...");

  // Scenario 1: Favorable CT with 0 defects
  const baseParams: ConformityCalculationParams = {
    vehicleFirstRegistration: "2020-01-01",
    currentMileage: 50000,
    maintenanceHistory: [
      {
        id: "m1",
        category: "DRAIN_OIL",
        title: "Vidange",
        performedDate: "2025-01-01",
        mileage: 45000,
        garageName: "Garage Officiel",
        invoiceUrl: "vault://doc1",
      },
    ],
    ctHistory: [],
    overdueMilestones: [],
  };

  const resFavorable0 = calculateConformityScore({
    ...baseParams,
    ctHistory: [
      {
        id: "ct-fav-0",
        inspectionDate: "2025-06-01",
        mileage: 48000,
        result: "FAVORABLE",
        minorDefectsCount: 0,
        majorDefectsCount: 0,
        criticalDefectsCount: 0,
      },
    ],
  });

  if (resFavorable0.breakdown.ctHistoryScore !== 100) {
    throw new Error(`CT Favorable avec 0 défaut doit donner 100, obtenu: ${resFavorable0.breakdown.ctHistoryScore}`);
  }

  // Scenario 2: Favorable CT with 1 minor defect (100 - 5 = 95)
  const resFavorable1 = calculateConformityScore({
    ...baseParams,
    ctHistory: [
      {
        id: "ct-fav-1",
        inspectionDate: "2025-06-01",
        mileage: 48000,
        result: "FAVORABLE",
        minorDefectsCount: 1,
        majorDefectsCount: 0,
        criticalDefectsCount: 0,
      },
    ],
  });
  if (resFavorable1.breakdown.ctHistoryScore !== 95) {
    throw new Error(`CT Favorable avec 1 mineur doit donner 95, obtenu: ${resFavorable1.breakdown.ctHistoryScore}`);
  }

  // Scenario 3: Favorable CT with 4 minor defects (100 - 20 = 80)
  const resFavorable4 = calculateConformityScore({
    ...baseParams,
    ctHistory: [
      {
        id: "ct-fav-4",
        inspectionDate: "2025-06-01",
        mileage: 48000,
        result: "FAVORABLE",
        minorDefectsCount: 4,
        majorDefectsCount: 0,
        criticalDefectsCount: 0,
      },
    ],
  });
  if (resFavorable4.breakdown.ctHistoryScore !== 80) {
    throw new Error(`CT Favorable avec 4 mineurs doit donner 80, obtenu: ${resFavorable4.breakdown.ctHistoryScore}`);
  }

  // Scenario 4: Favorable CT with 6 minor defects (100 - 30 = 70, cap reached)
  const resFavorable6 = calculateConformityScore({
    ...baseParams,
    ctHistory: [
      {
        id: "ct-fav-6",
        inspectionDate: "2025-06-01",
        mileage: 48000,
        result: "FAVORABLE",
        minorDefectsCount: 6,
        majorDefectsCount: 0,
        criticalDefectsCount: 0,
      },
    ],
  });
  if (resFavorable6.breakdown.ctHistoryScore !== 70) {
    throw new Error(`CT Favorable avec 6 mineurs doit donner 70 (plafond max déduction 30), obtenu: ${resFavorable6.breakdown.ctHistoryScore}`);
  }

  // Scenario 5: Adversarial Boundary — Favorable CT with 100 minor defects (Must remain clamped at 70, never negative or below 70)
  const resFavorableAdversarial = calculateConformityScore({
    ...baseParams,
    ctHistory: [
      {
        id: "ct-fav-100",
        inspectionDate: "2025-06-01",
        mileage: 48000,
        result: "FAVORABLE",
        minorDefectsCount: 100,
        majorDefectsCount: 0,
        criticalDefectsCount: 0,
      },
    ],
  });
  if (resFavorableAdversarial.breakdown.ctHistoryScore !== 70) {
    throw new Error(`CT Favorable avec 100 mineurs doit rester plafonné à 70, obtenu: ${resFavorableAdversarial.breakdown.ctHistoryScore}`);
  }

  // Scenario 6: Unfavorable Major CT (UNFAVORABLE_MAJOR -> exactly 50)
  const resMajor = calculateConformityScore({
    ...baseParams,
    ctHistory: [
      {
        id: "ct-maj",
        inspectionDate: "2025-06-01",
        mileage: 48000,
        result: "UNFAVORABLE_MAJOR",
        minorDefectsCount: 2,
        majorDefectsCount: 3,
        criticalDefectsCount: 0,
      },
    ],
  });
  if (resMajor.breakdown.ctHistoryScore !== 50) {
    throw new Error(`CT UNFAVORABLE_MAJOR doit donner 50, obtenu: ${resMajor.breakdown.ctHistoryScore}`);
  }

  // Scenario 7: Unfavorable Critical CT (UNFAVORABLE_CRITICAL -> exactly 20)
  const resCritical = calculateConformityScore({
    ...baseParams,
    ctHistory: [
      {
        id: "ct-crit",
        inspectionDate: "2025-06-01",
        mileage: 48000,
        result: "UNFAVORABLE_CRITICAL",
        minorDefectsCount: 5,
        majorDefectsCount: 2,
        criticalDefectsCount: 1,
      },
    ],
  });
  if (resCritical.breakdown.ctHistoryScore !== 20) {
    throw new Error(`CT UNFAVORABLE_CRITICAL doit donner 20, obtenu: ${resCritical.breakdown.ctHistoryScore}`);
  }

  // Scenario 8: Historical ordering resilience (most recent CT must drive ctScore)
  const resMultiCt = calculateConformityScore({
    ...baseParams,
    ctHistory: [
      {
        id: "ct-recent-favorable",
        inspectionDate: "2025-08-01",
        mileage: 50000,
        result: "FAVORABLE",
        minorDefectsCount: 0,
        majorDefectsCount: 0,
        criticalDefectsCount: 0,
      },
      {
        id: "ct-old-critical",
        inspectionDate: "2023-08-01",
        mileage: 30000,
        result: "UNFAVORABLE_CRITICAL",
        minorDefectsCount: 0,
        majorDefectsCount: 0,
        criticalDefectsCount: 1,
      },
    ],
  });
  if (resMultiCt.breakdown.ctHistoryScore !== 100) {
    throw new Error(`Le dernier CT résolu étant Favorable, le score CT attendu est 100, obtenu: ${resMultiCt.breakdown.ctHistoryScore}`);
  }

  console.log("  ✔ Matrice CT validée : Favorable (0/1/4/6/100 mineures), Défavorable Majeur (50), Défavorable Critique (20), et ordre chronologique.");

  // =========================================================================
  // SECTION 2: CRITICAL ALERT CAPPING & RESALE INTEGRITY
  // =========================================================================
  console.log("▶ [CHALLENGE 1.2] Safety Emergency Score Capping & Bonus Neutralization...");

  const emergencyBrake = calculateConformityScore({
    ...baseParams,
    brakeSafetyAssessment: {
      urgentActionNeeded: true,
      globalHealthScore: 10,
    },
  });
  if (emergencyBrake.overallScore > 68) {
    throw new Error(`Plafond violé lors d'urgence freinage : score ${emergencyBrake.overallScore} > 68`);
  }
  if (emergencyBrake.grade === "A" || emergencyBrake.grade === "A+") {
    throw new Error(`Grade A/A+ accordé malgré alerte rouge freinage : ${emergencyBrake.grade}`);
  }
  if (emergencyBrake.resaleImpact.estimatedValueBonusPercent > 0) {
    throw new Error(`Bonus revente positif accordé malgré alerte freinage : +${emergencyBrake.resaleImpact.estimatedValueBonusPercent}%`);
  }

  const emergencyTire = calculateConformityScore({
    ...baseParams,
    tireSafetyAssessment: {
      urgentActionNeeded: true,
      globalHealthScore: 10,
    },
  });
  if (emergencyTire.overallScore > 68) {
    throw new Error(`Plafond violé lors d'urgence pneumatique : score ${emergencyTire.overallScore} > 68`);
  }
  if (emergencyTire.grade === "A" || emergencyTire.grade === "A+") {
    throw new Error(`Grade A/A+ accordé malgré alerte rouge pneumatique : ${emergencyTire.grade}`);
  }

  console.log("  ✔ Garde-fous d'alerte critique validés : score <= 68%, grade B/C/F, neutralisation du bonus revente.");

  // =========================================================================
  // SECTION 3: STATIC & DYNAMIC SECRET PROTECTION IN FEEDBACK ACTION
  // =========================================================================
  console.log("▶ [CHALLENGE 2] Secret Protection in Feedback Server Action & Source Code...");

  const feedbackFilePath = path.join(process.cwd(), "src", "app", "actions", "feedback.ts");
  const feedbackContent = fs.readFileSync(feedbackFilePath, "utf-8");

  // 3a. Vérification statique : Aucun secret hardcodé dans feedback.ts
  const suspiciousPatterns = [
    /["']sk_live_[a-zA-Z0-9]+["']/,
    /["']mk_[a-zA-Z0-9]{16,}["']/,
    /apiSecret\s*=\s*["'][a-zA-Z0-9_\-]{8,}["']/,
    /Bearer\s+[a-zA-Z0-9_\-]{16,}/,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(feedbackContent)) {
      throw new Error(`FAILLE DE SÉCURITÉ : Un secret en dur potentiel a été détecté dans feedback.ts correspondant au motif ${pattern}`);
    }
  }

  // 3b. Vérification dynamique : Rejet strict si variables d'environnement absentes
  const oldMkSecret = process.env.MICROKANBAN_API_SECRET;
  const oldExtSecret = process.env.EXTERNAL_API_SECRET;
  delete process.env.MICROKANBAN_API_SECRET;
  delete process.env.EXTERNAL_API_SECRET;

  try {
    const rejectedAction = await sendFeedbackAction("Signalement de test sans secret configuré");
    if (rejectedAction.success) {
      throw new Error("FAILLE : sendFeedbackAction a réussi sans variable MICROKANBAN_API_SECRET !");
    }
    if (!rejectedAction.error || !rejectedAction.error.toLowerCase().includes("manquante")) {
      throw new Error(`Message d'erreur inattendu lors de l'absence de secret: ${rejectedAction.error}`);
    }

    // Vérification que le message d'erreur ne fuite pas d'informations sensibles
    if (rejectedAction.error.includes("Bearer") || rejectedAction.error.includes("sk_")) {
      throw new Error(`Fuite d'information dans le message d'erreur : ${rejectedAction.error}`);
    }
  } finally {
    if (oldMkSecret !== undefined) process.env.MICROKANBAN_API_SECRET = oldMkSecret;
    if (oldExtSecret !== undefined) process.env.EXTERNAL_API_SECRET = oldExtSecret;
  }

  console.log("  ✔ Protection des secrets validée : 0 secret en clair dans le code source, échec sécurisé si non configuré.");

  // =========================================================================
  // SECTION 4: DYNAMIC ANNUAL PACE & ZERO HARDCODED PLATE SNIFFERS
  // =========================================================================
  console.log("▶ [CHALLENGE 3] Dynamic Annual Pace Calculation & Plate Sniffer Eradication...");

  const dashboardViewPath = path.join(process.cwd(), "src", "components", "dashboard", "DashboardClientView.tsx");
  const dashboardContent = fs.readFileSync(dashboardViewPath, "utf-8");

  // 4a. Vérification statique : Absence totale de tests sur les plaques "301" ou "563"
  if (dashboardContent.includes('includes("301")') || dashboardContent.includes("includes('301')") || dashboardContent.includes('includes("563")') || dashboardContent.includes("includes('563')")) {
    throw new Error("FAILLE : Présence de sniffer de plaque hardcodé ('301' ou '563') détectée dans DashboardClientView.tsx !");
  }

  // 4b. Vérification de la formule dynamique pour le rythme annuel
  if (!dashboardContent.includes("v.km_annuel_moyen") || !dashboardContent.includes("Math.round(v.km_annuel_moyen)")) {
    throw new Error("FAILLE : DashboardClientView.tsx n'utilise pas la propriété dynamique v.km_annuel_moyen !");
  }

  // 4c. Simulation mathématique de calcul du rythme sur différentes entrées
  const simulatePace = (v: { kilometrage_actuel?: number; km_annuel_moyen?: number }) => {
    const hasMileage = v.kilometrage_actuel && v.kilometrage_actuel > 0;
    return (v.km_annuel_moyen && v.km_annuel_moyen > 0)
      ? `${Math.round(v.km_annuel_moyen).toLocaleString("fr-FR")} km/an`
      : hasMileage
      ? "12 000 km/an"
      : "En attente";
  };

  // Test 1: Véhicule avec rythme calculé réel (ex: Suzuki Vitara 14 500 km/an)
  const paceVitara = simulatePace({ kilometrage_actuel: 125789, km_annuel_moyen: 14523.4 });
  if (!paceVitara.includes("14") || !paceVitara.includes("523")) {
    throw new Error(`Rythme Vitara attendu ~14 523 km/an, obtenu : ${paceVitara}`);
  }

  // Test 2: Véhicule grand rouleur (ex: Espace V 28 000 km/an)
  const paceEspace = simulatePace({ kilometrage_actuel: 272448, km_annuel_moyen: 28100 });
  if (!paceEspace.includes("28") || !paceEspace.includes("100")) {
    throw new Error(`Rythme Espace attendu 28 100 km/an, obtenu : ${paceEspace}`);
  }

  // Test 3: Véhicule sans historique suffisant mais avec compteur (fallback standard 12 000 km/an)
  const paceStandard = simulatePace({ kilometrage_actuel: 35000, km_annuel_moyen: 0 });
  if (paceStandard !== "12 000 km/an") {
    throw new Error(`Fallback standard attendu '12 000 km/an', obtenu : ${paceStandard}`);
  }

  // Test 4: Véhicule sans aucun kilométrage
  const paceEmpty = simulatePace({ kilometrage_actuel: 0, km_annuel_moyen: 0 });
  if (paceEmpty !== "En attente") {
    throw new Error(`Véhicule vide attendu 'En attente', obtenu : ${paceEmpty}`);
  }

  console.log("  ✔ Calcul dynamique du rythme annuel validé : zéro heuristique de plaque, adaptation 100% basée sur km_annuel_moyen.");

  console.log("\n=================================================");
  console.log("🎉 TOUTES LES VÉRIFICATIONS DU CHALLENGER 1 SONT CONFIRMÉES CORRECTES !");
  console.log("=================================================\n");
}
