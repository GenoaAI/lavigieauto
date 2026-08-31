import { calculateConformityScore } from "../src/lib/engine/conformity-score";

export function testConformityScore() {
  console.log("▶ [TEST] Engine : Calcul du Score de Conformité Constructeur...");

  const result = calculateConformityScore({
    vehicleFirstRegistration: "2021-04-12",
    currentMileage: 58400,
    maintenanceHistory: [
      {
        id: "1",
        category: "DRAIN_OIL",
        title: "Vidange 15k",
        performedDate: "2022-04-10",
        mileage: 14500,
        garageName: "Peugeot Paris",
        invoiceUrl: "https://storage.../1.pdf",
      },
      {
        id: "2",
        category: "DRAIN_OIL",
        title: "Vidange 30k",
        performedDate: "2023-04-15",
        mileage: 29800,
        garageName: "Peugeot Paris",
        invoiceUrl: "https://storage.../2.pdf",
      },
      {
        id: "3",
        category: "DRAIN_OIL",
        title: "Vidange 45k",
        performedDate: "2024-04-18",
        mileage: 44900,
        garageName: "Peugeot Paris",
        invoiceUrl: "https://storage.../3.pdf",
      },
    ],
    ctHistory: [
      {
        id: "ct-1",
        inspectionDate: "2025-04-10",
        mileage: 48000,
        result: "FAVORABLE",
        minorDefectsCount: 0,
        majorDefectsCount: 0,
        criticalDefectsCount: 0,
      },
    ],
    overdueMilestones: [],
  });

  if (result.overallScore < 85) {
    throw new Error(`Score de conformité attendu >= 85%, obtenu ${result.overallScore}%`);
  }

  if (result.grade !== "A" && result.grade !== "A+") {
    throw new Error(`Grade attendu A/A+, obtenu ${result.grade}`);
  }

  if (result.resaleImpact.estimatedValueBonusPercent <= 0) {
    throw new Error("La valorisation à la revente devrait être positive.");
  }
  console.log(`  ✔ Score exemplaire calculé : ${result.overallScore}% (${result.grade}) — Bonus revente : +${result.resaleImpact.estimatedValueBonusPercent}%.`);

  // 2. Test pénalisation stricte en cas d'alerte sécurité freinage (ex: Espace V avec plaquettes à 80%)
  const penalizedResult = calculateConformityScore({
    vehicleFirstRegistration: "2020-03-15",
    currentMileage: 272448,
    maintenanceHistory: [],
    ctHistory: [],
    overdueMilestones: [],
    brakeSafetyAssessment: {
      urgentActionNeeded: true,
      globalHealthScore: 20,
    },
  });

  if (penalizedResult.grade === "A" || penalizedResult.grade === "A+") {
    throw new Error(`Grade non plafonné en cas d'alerte freinage : ${penalizedResult.grade}`);
  }
  if (penalizedResult.overallScore > 68) {
    throw new Error(`Score non plafonné en cas d'alerte freinage : ${penalizedResult.overallScore}%`);
  }
  if (penalizedResult.resaleImpact.estimatedValueBonusPercent > 0) {
    throw new Error("Bonus revente non neutralisé lors d'une alerte sécurité critique");
  }
  console.log(`  ✔ Garde-fou sécurité validé : alerte freinage plafonne le score à ${penalizedResult.overallScore}% (${penalizedResult.grade}) avec bonus neutralisé.`);

  // 3. Test CT Défavorable Majeur (UNFAVORABLE_MAJOR -> CT score: 50)
  const ctMajorResult = calculateConformityScore({
    vehicleFirstRegistration: "2021-04-12",
    currentMileage: 58400,
    maintenanceHistory: [],
    ctHistory: [
      {
        id: "ct-maj-1",
        inspectionDate: "2025-04-10",
        mileage: 48000,
        result: "UNFAVORABLE_MAJOR",
        minorDefectsCount: 0,
        majorDefectsCount: 1,
        criticalDefectsCount: 0,
      },
    ],
    overdueMilestones: [],
  });

  if (ctMajorResult.breakdown.ctHistoryScore !== 50) {
    throw new Error(`CT score attendu pour UNFAVORABLE_MAJOR = 50, obtenu : ${ctMajorResult.breakdown.ctHistoryScore}`);
  }
  console.log(`  ✔ Score CT pour défaillance majeure validé : ${ctMajorResult.breakdown.ctHistoryScore}/100.`);

  // 4. Test CT Défavorable Critique (UNFAVORABLE_CRITICAL -> CT score: 20)
  const ctCriticalResult = calculateConformityScore({
    vehicleFirstRegistration: "2021-04-12",
    currentMileage: 58400,
    maintenanceHistory: [],
    ctHistory: [
      {
        id: "ct-crit-1",
        inspectionDate: "2025-04-10",
        mileage: 48000,
        result: "UNFAVORABLE_CRITICAL",
        minorDefectsCount: 0,
        majorDefectsCount: 0,
        criticalDefectsCount: 1,
      },
    ],
    overdueMilestones: [],
  });

  if (ctCriticalResult.breakdown.ctHistoryScore !== 20) {
    throw new Error(`CT score attendu pour UNFAVORABLE_CRITICAL = 20, obtenu : ${ctCriticalResult.breakdown.ctHistoryScore}`);
  }
  console.log(`  ✔ Score CT pour défaillance critique validé : ${ctCriticalResult.breakdown.ctHistoryScore}/100.`);

  // 5. Test CT Favorable avec défaillances mineures (déduction progressive de 5 pts / mineure, max 30)
  const ctMinorResult = calculateConformityScore({
    vehicleFirstRegistration: "2021-04-12",
    currentMileage: 58400,
    maintenanceHistory: [],
    ctHistory: [
      {
        id: "ct-min-1",
        inspectionDate: "2025-04-10",
        mileage: 48000,
        result: "FAVORABLE",
        minorDefectsCount: 3, // 100 - (3 * 5) = 85
        majorDefectsCount: 0,
        criticalDefectsCount: 0,
      },
    ],
    overdueMilestones: [],
  });

  if (ctMinorResult.breakdown.ctHistoryScore !== 85) {
    throw new Error(`CT score attendu pour 3 défaillances mineures = 85, obtenu : ${ctMinorResult.breakdown.ctHistoryScore}`);
  }

  const ctManyMinorResult = calculateConformityScore({
    vehicleFirstRegistration: "2021-04-12",
    currentMileage: 58400,
    maintenanceHistory: [],
    ctHistory: [
      {
        id: "ct-min-2",
        inspectionDate: "2025-04-10",
        mileage: 48000,
        result: "FAVORABLE",
        minorDefectsCount: 8, // 100 - min(30, 8 * 5) = 70
        majorDefectsCount: 0,
        criticalDefectsCount: 0,
      },
    ],
    overdueMilestones: [],
  });

  if (ctManyMinorResult.breakdown.ctHistoryScore !== 70) {
    throw new Error(`CT score attendu pour 8 défaillances mineures (plafond déduction 30) = 70, obtenu : ${ctManyMinorResult.breakdown.ctHistoryScore}`);
  }
  console.log(`  ✔ Déduction progressive des défaillances mineures validée (3 mineures = ${ctMinorResult.breakdown.ctHistoryScore}/100, 8 mineures avec plafond = ${ctManyMinorResult.breakdown.ctHistoryScore}/100).`);
}
