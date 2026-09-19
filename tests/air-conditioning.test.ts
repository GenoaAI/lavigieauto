import {
  calculateVehicleAirConditioningAssessment,
  inferVehicleRefrigerant,
} from "../src/lib/engine/air-conditioning";
import { sanitizeOfficialMaintenancePlan } from "../src/lib/engine/manufacturer-retriever";

export function testAirConditioningPredictiveEngine() {
  console.log("\n▶ [TEST] Engine : Moteur Prédictif Climatisation & Confort Thermique...");

  // =========================================================================
  // 1. Inférence du fluide frigorigène (R134a vs R1234yf)
  // =========================================================================
  const oldVehGas = inferVehicleRefrigerant({
    registrationDate: "2014-06-15",
    firstRegistrationYear: 2014,
  });
  if (oldVehGas.type !== "R134a") {
    throw new Error(`Échec déduction R134a pour véhicule 2014 : obtenu ${oldVehGas.type}`);
  }
  if (oldVehGas.estimatedRechargeCost.minEur !== 59 || oldVehGas.estimatedRechargeCost.maxEur !== 89) {
    throw new Error(`Tarif R134a incorrect : ${JSON.stringify(oldVehGas.estimatedRechargeCost)}`);
  }

  const newVehGas = inferVehicleRefrigerant({
    registrationDate: "2019-03-20",
    firstRegistrationYear: 2019,
  });
  if (newVehGas.type !== "R1234yf") {
    throw new Error(`Échec déduction R1234yf pour véhicule post-2017 : obtenu ${newVehGas.type}`);
  }
  if (newVehGas.estimatedRechargeCost.minEur !== 129 || newVehGas.estimatedRechargeCost.maxEur !== 179) {
    throw new Error(`Tarif R1234yf incorrect : ${JSON.stringify(newVehGas.estimatedRechargeCost)}`);
  }

  // Détection explicite par facture prioritaire
  const invoiceOverrideGas = inferVehicleRefrigerant({
    registrationDate: "2015-05-10",
    firstRegistrationYear: 2015,
    invoices: [{ operation: "RECHARGE CLIM GAZ HFO-1234YF NOUVELLE NORME" }],
  });
  if (invoiceOverrideGas.type !== "R1234yf") {
    throw new Error("Échec détection R1234yf depuis la mention de la facture");
  }
  console.log("  ✔ Inférence du fluide frigorigène validée (R134a < 2017, R1234yf ≥ 2017, priorité facture).");

  // =========================================================================
  // 2. Détection compresseur électrique haute tension (Hybride & Électrique)
  // =========================================================================
  const hybridAssessment = calculateVehicleAirConditioningAssessment({
    vehicleId: "toyota-hybrid-test",
    currentMileage: 65000,
    dailyKmRate: 30,
    registrationDate: "2018-05-10",
    firstRegistrationYear: 2018,
    make: "Toyota",
    model: "Yaris",
    version: "1.5 Hybrid 100h",
    fuel: "hybride",
    invoices: [],
  });
  if (!hybridAssessment.isHighVoltageCompressor) {
    throw new Error("Compresseur haute tension non détecté sur Toyota Yaris Hybride");
  }
  if (!hybridAssessment.highVoltageWarning || !hybridAssessment.highVoltageWarning.includes("haute tension")) {
    throw new Error("Avertissement haute tension manquant ou incomplet pour véhicule hybride");
  }

  const thermoAssessment = calculateVehicleAirConditioningAssessment({
    vehicleId: "clio-thermique-test",
    currentMileage: 75000,
    dailyKmRate: 25,
    registrationDate: "2015-09-01",
    firstRegistrationYear: 2015,
    make: "Renault",
    model: "Clio IV",
    version: "0.9 TCe 90",
    fuel: "essence",
    invoices: [],
  });
  if (thermoAssessment.isHighVoltageCompressor) {
    throw new Error("Faux positif compresseur haute tension sur véhicule 100% thermique");
  }
  console.log("  ✔ Sécurité compresseur haute tension (Huile POE/ND-11 vs PAG) validée.");

  // =========================================================================
  // 3. Dégradation prédictive selon le vieillissement
  // =========================================================================
  const refDate = new Date("2026-06-15"); // En plein mois de juin (saison estivale)

  // Cas 3.1 : Véhicule récent (1 an) -> OPTIMAL
  const recentAssessment = calculateVehicleAirConditioningAssessment({
    vehicleId: "recent-car",
    currentMileage: 15000,
    dailyKmRate: 40,
    registrationDate: "2025-06-15",
    invoices: [],
    referenceDate: refDate,
  });
  if (recentAssessment.status !== "OPTIMAL" || recentAssessment.urgentActionNeeded) {
    throw new Error(`Statut véhicule 1 an incorrect : ${recentAssessment.status}`);
  }

  // Cas 3.2 : Véhicule 3.5 ans -> DUE_SOON
  const dueSoonAssessment = calculateVehicleAirConditioningAssessment({
    vehicleId: "due-soon-car",
    currentMileage: 55000,
    dailyKmRate: 35,
    registrationDate: "2023-01-01",
    invoices: [],
    referenceDate: refDate,
  });
  if (dueSoonAssessment.status !== "DUE_SOON") {
    throw new Error(`Statut véhicule 3.5 ans incorrect : ${dueSoonAssessment.status}`);
  }

  // Cas 3.3 : Véhicule ancien sans facture (5 ans) -> CRITICAL
  const criticalAssessment = calculateVehicleAirConditioningAssessment({
    vehicleId: "old-car",
    currentMileage: 95000,
    dailyKmRate: 30,
    registrationDate: "2021-01-01",
    invoices: [],
    referenceDate: refDate,
  });
  if (criticalAssessment.status !== "CRITICAL" || !criticalAssessment.urgentActionNeeded) {
    throw new Error(`Statut véhicule > 4 ans incorrect : ${criticalAssessment.status}`);
  }
  if (criticalAssessment.estimatedFluidLossPercent < 30) {
    throw new Error(`Perte de fluide sous-évaluée : ${criticalAssessment.estimatedFluidLossPercent}%`);
  }
  console.log("  ✔ Modélisation de la dégradation prédictive avec le temps (1 an, 3.5 ans, 5 ans) validée.");

  // =========================================================================
  // 4. Réinitialisation du cycle par facture réelle
  // =========================================================================
  const refreshedAssessment = calculateVehicleAirConditioningAssessment({
    vehicleId: "refreshed-car",
    currentMileage: 120000,
    dailyKmRate: 30,
    registrationDate: "2016-04-10",
    invoices: [
      {
        date: "2026-02-15", // Recharge il y a 4 mois
        mileage: 116000,
        operation: "FORFAIT RECHARGE CLIMATISATION R134A AVEC TIRAGE AU VIDE",
        category: "climatisation",
      },
    ],
    referenceDate: refDate,
  });
  if (refreshedAssessment.status !== "OPTIMAL" || refreshedAssessment.yearsSinceLastRecharge > 0.5) {
    throw new Error(`Échec réinitialisation par facture : statut ${refreshedAssessment.status}, années ${refreshedAssessment.yearsSinceLastRecharge}`);
  }
  if (refreshedAssessment.lastRechargeDate !== "2026-02-15") {
    throw new Error(`Date dernière recharge incorrecte : ${refreshedAssessment.lastRechargeDate}`);
  }
  console.log("  ✔ Prise en compte et réinitialisation par facture réelle validée.");

  // =========================================================================
  // 5. Détection de saisonnalité estivale
  // =========================================================================
  // En juin avec véhicule ayant besoin d'entretien -> boost actif
  if (!dueSoonAssessment.isSeasonalBoostActive) {
    throw new Error("Boost saisonnier estival inactif en juin pour un véhicule à entretenir");
  }
  if (!dueSoonAssessment.seasonalAlertTitle || !dueSoonAssessment.seasonalAlertTitle.includes("Confort Estival")) {
    throw new Error("Titre alerte saisonnière manquant");
  }

  // En hiver (novembre) -> boost inactif
  const winterRefDate = new Date("2026-11-20");
  const winterAssessment = calculateVehicleAirConditioningAssessment({
    vehicleId: "due-soon-winter",
    currentMileage: 55000,
    dailyKmRate: 35,
    registrationDate: "2023-01-01",
    invoices: [],
    referenceDate: winterRefDate,
  });
  if (winterAssessment.isSeasonalBoostActive) {
    throw new Error("Boost saisonnier anormalement actif en plein mois de novembre");
  }
  console.log("  ✔ Détection et activation du boost saisonnier estival (Juin vs Novembre) validée.");

  // =========================================================================
  // 6. Intégrité constructeur stricte (0 recharge périodique imposée au carnet OEM)
  // =========================================================================
  const sanitized = sanitizeOfficialMaintenancePlan(
    {
      vehicleSummary: {
        make: "Renault",
        model: "Clio",
        engine: "0.9 TCe",
        oilSpecification: "RN0710",
        timingType: "chaine",
        transmissionType: "manuelle",
      },
      operations: [
        {
          category: "revision",
          title: "Vidange huile moteur & filtre",
          description: "Huile homologuée",
          intervalKm: 20000,
          intervalMonths: 12,
          estimatedCostMinEur: 100,
          estimatedCostMaxEur: 150,
          criticite: "elevee",
        },
        {
          category: "climatisation",
          title: "Recharge fluide frigorigène",
          description: "Recharge gaz périodique",
          intervalKm: 40000,
          intervalMonths: 24,
          estimatedCostMinEur: 60,
          estimatedCostMaxEur: 90,
          criticite: "moyenne",
        },
      ],
    },
    { marque: "Renault", modele: "Clio" }
  );

  const hasAcRechargeInOem = sanitized.operations.some(
    (op) => op.category === "climatisation" || op.title.toLowerCase().includes("recharge")
  );
  if (hasAcRechargeInOem) {
    throw new Error("Régression : la recharge de clim a pollué le plan constructeur officiel !");
  }
  console.log("  ✔ Intégrité Zéro-Fake constructeur OEM préservée avec succès.");
}

if (process.argv[1] && process.argv[1].includes("air-conditioning.test")) {
  testAirConditioningPredictiveEngine();
}
