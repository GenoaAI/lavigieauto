import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { VehicleMaintenanceData, MaintenanceInterval } from "@/types/maintenance";
import { recordMicroConversionAction } from "@/app/actions/analytics";

/**
 * Reproduction fidèle de l'algorithme d'estimation de MaintenanceEstimator.tsx
 */
function simulateEstimatorLogic(
  currentMileage: number,
  resolvedIntervals: MaintenanceInterval[],
  resolvedBundles: any[] = []
) {
  if (!resolvedIntervals || resolvedIntervals.length === 0) {
    return null;
  }

  // Ensemble de tous les multiples d'intervalles jusqu'à 400 000 km
  const milestonesSet = new Set<number>();
  resolvedIntervals.forEach((interval) => {
    const step = interval.intervalKm;
    if (step > 0) {
      for (let m = step; m <= 400000; m += step) {
        milestonesSet.add(m);
      }
    }
  });

  if (milestonesSet.size === 0) {
    for (let m = 20000; m <= 400000; m += 20000) {
      milestonesSet.add(m);
    }
  }

  const sortedMilestones = Array.from(milestonesSet).sort((a, b) => a - b);
  let nextMilestoneKm = sortedMilestones.find((m) => m > currentMileage);

  let usedFallback = false;
  if (!nextMilestoneKm) {
    usedFallback = true;
    const minStep = Math.min(...resolvedIntervals.map((i) => i.intervalKm).filter((k) => k > 0)) || 20000;
    nextMilestoneKm = currentMileage + minStep;
  }

  const remainingKm = Math.max(0, nextMilestoneKm - currentMileage);

  // Rythme moyen français : ~15 000 km/an -> delta / 1250 arrondi à l'entier le plus proche (min 1 mois)
  const estimatedMonths = Math.max(1, Math.round(remainingKm / 1250));

  // Opérations dues au jalon cible (nextMilestoneKm % intervalKm === 0)
  const dueOperations = resolvedIntervals.filter(
    (interval) => interval.intervalKm > 0 && nextMilestoneKm! % interval.intervalKm === 0
  );

  const activeOperations = dueOperations.length > 0 ? dueOperations : resolvedIntervals;

  const totalMinCost = activeOperations.reduce((sum, op) => sum + (op.estimatedCostMin || 0), 0);
  const totalMaxCost = activeOperations.reduce((sum, op) => sum + (op.estimatedCostMax || 0), 0);

  const matchingBundle = resolvedBundles.find((b) =>
    b.title.toLowerCase().includes(`${nextMilestoneKm! / 1000}`)
  );

  return {
    nextMilestoneKm,
    remainingKm,
    estimatedMonths,
    dueOperations: activeOperations,
    rawDueOperationsCount: dueOperations.length,
    totalMinCost,
    totalMaxCost,
    matchingBundle,
    usedFallback,
  };
}

/**
 * Reproduction de la fonction de nettoyage de saisie dans MaintenanceEstimator.tsx
 */
function simulateHandleMileageChange(value: string) {
  const numericStr = value.replace(/\D/g, "");
  if (!numericStr) {
    return { currentMileage: 0, rawMileage: "" };
  }
  const num = Math.min(parseInt(numericStr, 10), 400000);
  return { currentMileage: num, rawMileage: num.toLocaleString("fr-FR") };
}

export async function runAdversarialEstimatorTests() {
  console.log("=================================================");
  console.log("⚔️ CHALLENGER 1 : STRESS-TESTS ADVERSARIAUX MAINTENANCE ESTIMATOR");
  console.log("=================================================\n");

  const joggerPath = path.resolve("src/data/maintenance/dacia-jogger-1-0-eco-g-100.json");
  assert.ok(fs.existsSync(joggerPath), "Le fichier dacia-jogger-1-0-eco-g-100.json doit exister.");
  const joggerData: VehicleMaintenanceData = JSON.parse(fs.readFileSync(joggerPath, "utf-8"));

  // -------------------------------------------------------------
  // 1. Stress Test : Valeur Limite 0 km
  // -------------------------------------------------------------
  console.log("▶ [CHALLENGE 1] Cas Limite : Saisie 0 km...");
  {
    const res = simulateEstimatorLogic(0, joggerData.intervals, joggerData.costOptimizationBundles);
    assert.ok(res, "Le résultat d'estimation ne doit pas être nul.");
    assert.equal(res.nextMilestoneKm, 30000, "À 0 km, le premier jalon doit être 30 000 km.");
    assert.equal(res.remainingKm, 30000, "Le delta restant doit être 30 000 km.");
    assert.equal(res.estimatedMonths, 24, "30 000 km à 1250 km/mois = 24 mois.");
    assert.equal(res.rawDueOperationsCount, 4, "À 30 000 km, exactement 4 opérations doivent être dues.");
    assert.equal(res.totalMinCost, 215, "Le coût min total pour 30 000 km doit être 215 €.");
    assert.equal(res.totalMaxCost, 325, "Le coût max total pour 30 000 km doit être 325 €.");
    assert.ok(!isNaN(res.totalMinCost) && !isNaN(res.totalMaxCost), "Les coûts ne doivent pas être NaN.");
    console.log("  ✔ Saisie 0 km validée : jalon 30 000 km, 24 mois, 4 opérations, 215-325 €.");
  }

  // -------------------------------------------------------------
  // 2. Stress Test : Jalon Exact (Ex: 30 000 km, 60 000 km)
  // -------------------------------------------------------------
  console.log("▶ [CHALLENGE 2] Jalon Exact (Boundary m > currentMileage)...");
  {
    // À 30 000 km exact : l'algorithme recommande-t-il 30k ou 60k ?
    const res30k = simulateEstimatorLogic(30000, joggerData.intervals, joggerData.costOptimizationBundles);
    assert.ok(res30k);
    assert.equal(
      res30k.nextMilestoneKm,
      60000,
      "À 30 000 km exact, sortedMilestones.find(m > 30000) retourne 60 000 km."
    );
    assert.equal(res30k.remainingKm, 30000, "Delta restant = 30 000 km.");
    assert.equal(res30k.estimatedMonths, 24, "Délai = 24 mois.");
    assert.equal(res30k.dueOperations.length, 8, "À 60 000 km, les 8 opérations du Jogger sont dues.");
    assert.equal(res30k.totalMinCost, 420, "Coût min = 420 €.");
    assert.equal(res30k.totalMaxCost, 645, "Coût max = 645 €.");

    // À 29 999 km (juste avant l'échéance 30 000 km)
    const res29k = simulateEstimatorLogic(29999, joggerData.intervals, joggerData.costOptimizationBundles);
    assert.ok(res29k);
    assert.equal(res29k.nextMilestoneKm, 30000, "À 29 999 km, le jalon cible est bien 30 000 km.");
    assert.equal(res29k.remainingKm, 1, "Delta = 1 km (échéance imminente).");
    assert.equal(res29k.estimatedMonths, 1, "Délai minimum = 1 mois.");

    // À 30 001 km (juste après l'échéance 30 000 km)
    const res30001 = simulateEstimatorLogic(30001, joggerData.intervals, joggerData.costOptimizationBundles);
    assert.ok(res30001);
    assert.equal(res30001.nextMilestoneKm, 60000, "À 30 001 km, le jalon cible est 60 000 km.");
    assert.equal(res30001.remainingKm, 29999, "Delta = 29 999 km.");

    console.log("  ✔ Jalon exact validé : comportement déterministe m > currentMileage confirmé (30k -> 60k).");
  }

  // -------------------------------------------------------------
  // 3. Stress Test : Entrées Négatives, Décimales, Chaînes Non-Numériques
  // -------------------------------------------------------------
  console.log("▶ [CHALLENGE 3] Sanitization des Entrées (Négatifs, Décimales, Caractères)...");
  {
    // Valeur négative "-45000"
    const sanNeg = simulateHandleMileageChange("-45000");
    assert.equal(sanNeg.currentMileage, 45000, "Le signe moins doit être éliminé par replace(/\\D/g, '').");

    // Chaîne alphabétique pure "inconnu"
    const sanAlpha = simulateHandleMileageChange("inconnu");
    assert.equal(sanAlpha.currentMileage, 0, "Une chaîne sans chiffre doit renvoyer 0 km.");
    assert.equal(sanAlpha.rawMileage, "", "rawMileage doit être vide.");

    // Chaîne vide
    const sanEmpty = simulateHandleMileageChange("");
    assert.equal(sanEmpty.currentMileage, 0, "Une chaîne vide doit renvoyer 0 km.");

    // Formatage avec espaces "45 000"
    const sanSpace = simulateHandleMileageChange("45 000");
    assert.equal(sanSpace.currentMileage, 45000, "Les espaces doivent être supprimés.");

    // Formatage avec point "45.000"
    const sanDot = simulateHandleMileageChange("45.000");
    assert.equal(sanDot.currentMileage, 45000, "Les points doivent être supprimés.");

    // Formatage avec virgule "45,000"
    const sanComma = simulateHandleMileageChange("45,000");
    assert.equal(sanComma.currentMileage, 45000, "Les virgules doivent être supprimées.");

    // Dépassement de plafond "999999"
    const sanHuge = simulateHandleMileageChange("999999");
    assert.equal(sanHuge.currentMileage, 400000, "La saisie doit être plafonnée à 400 000 km.");

    // Test de résilience directe : currentMileage = -10000
    const resDirectNeg = simulateEstimatorLogic(-10000, joggerData.intervals);
    assert.ok(resDirectNeg);
    assert.equal(resDirectNeg.nextMilestoneKm, 30000);
    assert.equal(resDirectNeg.remainingKm, 40000);
    assert.ok(!isNaN(resDirectNeg.estimatedMonths));

    console.log("  ✔ Sanitization certifiée : suppression des caractères non-numériques, plafond 400k et zéro crash.");
  }

  // -------------------------------------------------------------
  // 4. Stress Test : Très Fort Kilométrage (> 350 000 km et cas de plafond 400 000 km)
  // -------------------------------------------------------------
  console.log("▶ [CHALLENGE 4] Très Fort Kilométrage (> 350 000 km et plafond)...");
  {
    // À 350 000 km
    const res350k = simulateEstimatorLogic(350000, joggerData.intervals, joggerData.costOptimizationBundles);
    assert.ok(res350k);
    assert.equal(res350k.nextMilestoneKm, 360000, "À 350 000 km, le prochain jalon est 360 000 km.");
    assert.equal(res350k.remainingKm, 10000, "Delta restant = 10 000 km.");
    assert.equal(res350k.estimatedMonths, 8, "10 000 / 1250 = 8 mois.");
    assert.equal(res350k.dueOperations.length, 8, "À 360 000 km, toutes les opérations sont dues.");
    assert.equal(res350k.usedFallback, false, "360 000 km fait partie des jalons générés (<= 400 000).");

    // À 390 000 km (dernier jalon exact <= 400 000 km pour pas de 30k)
    const res390k = simulateEstimatorLogic(390000, joggerData.intervals);
    assert.ok(res390k);
    // À 390 000 km, m > 390000 n'existe pas dans [30k...390k], donc le fallback se déclenche
    assert.equal(res390k.usedFallback, true, "Au dernier jalon généré, le fallback s'active.");
    assert.equal(res390k.nextMilestoneKm, 420000, "390 000 + 30 000 = 420 000 km.");
    assert.equal(res390k.dueOperations.length, 8, "420 000 km est bien multiple de 30k et 60k.");

    // À 395 000 km : test d'observation du comportement sur le fallback
    const res395k = simulateEstimatorLogic(395000, joggerData.intervals);
    assert.ok(res395k);
    assert.equal(res395k.usedFallback, true);
    // 395 000 + 30 000 = 425 000 km
    assert.equal(res395k.nextMilestoneKm, 425000);
    // 425 000 n'est pas multiple de 30k (425000 % 30000 = 5000), donc dueOperations est vide (rawDueOperationsCount = 0)
    assert.equal(res395k.rawDueOperationsCount, 0, "425 000 km n'étant pas multiple de 30 000, rawDueOperationsCount est 0.");
    assert.equal(
      res395k.dueOperations.length,
      joggerData.intervals.length,
      "Le fallback actif bascule sur l'intégralité des intervalles sans crasher."
    );
    assert.ok(res395k.totalMinCost > 0, "Les coûts restent définis et calculables.");

    // À 400 000 km (plafond de l'input utilisateur)
    const res400k = simulateEstimatorLogic(400000, joggerData.intervals);
    assert.ok(res400k);
    assert.equal(res400k.nextMilestoneKm, 430000);
    assert.ok(res400k.remainingKm === 30000);

    console.log("  ✔ Fort kilométrage audité : comportement nominal jusqu'à 350k+ et résilience du fallback à 400k.");
  }

  // -------------------------------------------------------------
  // 5. Stress Test : Modulo Math & Coût sur TOUT le catalogue (32 véhicules)
  // -------------------------------------------------------------
  console.log("▶ [CHALLENGE 5] Modulo Math & Sommes Budgétaires sur l'Ensemble du Catalogue (32 véhicules)...");
  {
    const maintenanceDir = path.resolve("src/data/maintenance");
    const jsonFiles = fs.readdirSync(maintenanceDir).filter((f) => f.endsWith(".json"));
    assert.equal(jsonFiles.length, 32, "Le catalogue doit contenir exactement 32 véhicules.");

    const testPaces = [15000, 30000, 45000, 60000, 90000, 120000, 150000, 200000];

    let totalCalculations = 0;

    for (const file of jsonFiles) {
      const data: VehicleMaintenanceData = JSON.parse(
        fs.readFileSync(path.join(maintenanceDir, file), "utf-8")
      );

      if (!data.intervals || data.intervals.length === 0) continue;

      for (const km of testPaces) {
        const res = simulateEstimatorLogic(km, data.intervals, data.costOptimizationBundles);
        assert.ok(res, `Estimation pour ${data.brand} ${data.model} à ${km} km doit être définie.`);
        totalCalculations++;

        // 1. nextMilestoneKm strictement supérieur à currentMileage
        assert.ok(
          res.nextMilestoneKm > km,
          `Jalon cible (${res.nextMilestoneKm}) doit être > kilométrage saisi (${km}) pour ${file}`
        );

        // 2. remainingKm strictement cohérent
        assert.equal(
          res.remainingKm,
          res.nextMilestoneKm - km,
          `remainingKm doit être nextMilestoneKm - km pour ${file}`
        );

        // 3. estimatedMonths calculé et >= 1
        assert.ok(
          res.estimatedMonths >= 1,
          `estimatedMonths (${res.estimatedMonths}) doit être >= 1 pour ${file}`
        );

        // 4. Modulo math des opérations sélectionnées
        if (res.rawDueOperationsCount > 0) {
          for (const op of res.dueOperations) {
            assert.equal(
              res.nextMilestoneKm % op.intervalKm,
              0,
              `Opération ${op.id} (${op.intervalKm} km) doit diviser exactement ${res.nextMilestoneKm} pour ${file}`
            );
          }
        }

        // 5. Intégrité des sommes de coûts
        const manualMin = res.dueOperations.reduce((s, op) => s + (op.estimatedCostMin || 0), 0);
        const manualMax = res.dueOperations.reduce((s, op) => s + (op.estimatedCostMax || 0), 0);

        assert.equal(res.totalMinCost, manualMin, `totalMinCost doit correspondre à la somme exacte pour ${file}`);
        assert.equal(res.totalMaxCost, manualMax, `totalMaxCost doit correspondre à la somme exacte pour ${file}`);
        assert.ok(
          res.totalMinCost <= res.totalMaxCost,
          `totalMinCost (${res.totalMinCost}) doit être <= totalMaxCost (${res.totalMaxCost}) pour ${file}`
        );
        assert.ok(!isNaN(res.totalMinCost), `totalMinCost ne doit pas être NaN pour ${file}`);
        assert.ok(!isNaN(res.totalMaxCost), `totalMaxCost ne doit pas être NaN pour ${file}`);
      }
    }

    console.log(`  ✔ Modulo math & budget certifiés sur ${totalCalculations} combinaisons réelles (32 véhicules × 8 paliers).`);
  }

  // -------------------------------------------------------------
  // 6. Stress Test : Résilience Télémétrie Micro-Conversions
  // -------------------------------------------------------------
  console.log("▶ [CHALLENGE 6] Résilience Télémétrie Micro-Conversions (Anti-Crash Promise)...");
  {
    const originalFetch = global.fetch;

    try {
      // 6.1 Simulation d'échec réseau / rejet Supabase
      global.fetch = async () => {
        throw new Error("Simulated Supabase Network Crash (Challenger)");
      };

      // Soumission avec email valide mais crash réseau
      const failedEmailAction = await recordMicroConversionAction({
        eventType: "lead_magnet_submit",
        brand: "dacia",
        model: "jogger",
        engine: "1-0-eco-g-100",
        metadata: {
          method: "email",
          email: "challenger.test@lavigieauto.com",
          mileage: 45000,
        },
      });

      assert.equal(failedEmailAction.success, false, "En cas de crash réseau, l'action doit renvoyer success: false.");
      assert.ok(failedEmailAction.error, "Une erreur doit être capturée sans crash de processus.");

      // 6.2 Soumission sans email (clic direct Google ou impression)
      const anonymousPrintAction = await recordMicroConversionAction({
        eventType: "pdf_download_print",
        brand: "dacia",
        model: "jogger",
        engine: "1-0-eco-g-100",
        metadata: {
          method: "estimator_direct_print",
          mileage: 45000,
        },
      });

      assert.equal(anonymousPrintAction.success, false, "Doit être capturé gracieusement.");

      console.log("  ✔ Résilience télémétrie certifiée : rejets réseau capturés sans Uncaught Promise Rejection.");
    } finally {
      global.fetch = originalFetch;
    }
  }

  console.log("\n=================================================");
  console.log("🎉 TOUS LES STRESS-TESTS ADVERSARIAUX SONT VALIDÉS AVEC SUCCÈS !");
  console.log("=================================================\n");
}

if (require.main === module) {
  runAdversarialEstimatorTests().catch((err) => {
    console.error("❌ ÉCHEC DES TESTS ADVERSARIAUX :", err);
    process.exit(1);
  });
}
