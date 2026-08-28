import { fetchOnlineManufacturerPlan, sanitizeOfficialMaintenancePlan, OfficialMaintenancePlan } from "../src/lib/engine/manufacturer-retriever";

export async function testManufacturerPlanRobustness() {
  console.log("▶ [TEST] Robustesse & Exactitude des Plans d'Entretien Constructeur (Zéro Fausse Clim & OEM)...");

  // 1. Test Suzuki Vitara 1.6 VVT 120 ch (M16A Essence)
  const vitaraPlan = await fetchOnlineManufacturerPlan({
    marque: "Suzuki",
    modele: "Vitara",
    version: "1.6 VVT 120 ch AllGrip",
    energie: "Essence",
    annee_mise_en_circulation: 2016,
    kilometrage_actuel: 125789,
    vin: "TSMEYA21S00123456",
  });

  // A. Vérification de l'absence totale de recharge de climatisation
  const climOps = vitaraPlan.operations.filter(
    (op) =>
      op.category === "climatisation" ||
      op.title.toLowerCase().includes("recharge fluide") ||
      op.title.toLowerCase().includes("recharge clim") ||
      op.description.toLowerCase().includes("recharge fluide frigorigène")
  );

  if (climOps.length > 0) {
    throw new Error(
      `ÉCHEC : Le plan du Vitara 1.6 VVT contient encore ${climOps.length} opération(s) de recharge de climatisation !`
    );
  }
  console.log("  ✔ Suzuki Vitara 1.6 VVT : 0 fausse opération de recharge de climatisation générée.");

  // B. Vérification de la distribution par chaîne
  if (vitaraPlan.vehicleSummary.timingType !== "chaine") {
    throw new Error(
      `ÉCHEC : Le Vitara 1.6 VVT (M16A) doit avoir une distribution par chaîne (trouvé: ${vitaraPlan.vehicleSummary.timingType})`
    );
  }
  const timingBeltOps = vitaraPlan.operations.filter((op) => op.category === "courroie_distribution");
  if (timingBeltOps.length > 0) {
    throw new Error("ÉCHEC : Une opération de courroie de distribution a été générée pour un moteur à chaîne !");
  }
  console.log("  ✔ Suzuki Vitara 1.6 VVT : Distribution par chaîne validée sans remplacement de courroie périodique.");

  // C. Vérification de la dissociation entre liquide de frein et courroie d'accessoires
  const brakeFluid = vitaraPlan.operations.find((op) => op.category === "liquide_frein");
  const accessoryBelt = vitaraPlan.operations.find((op) => op.category === "courroie_accessoire");

  if (!brakeFluid || brakeFluid.intervalKm !== 40000 || brakeFluid.intervalMonths !== 24) {
    throw new Error("ÉCHEC : Liquide de frein (DOT 4) Suzuki manquant ou mal calibré (attendu 40 000 km / 24 mois).");
  }
  if (!accessoryBelt) {
    throw new Error("ÉCHEC : Courroie d'accessoires Suzuki manquante.");
  }
  console.log("  ✔ Suzuki Vitara 1.6 VVT : Dissociation correcte entre purge DOT 4 (40 000 km) et courroie d'accessoires.");

  // 2. Test du Sanitizer Déterministe contre une hallucination LLM simulée
  const hallucinatedPlan: OfficialMaintenancePlan = {
    vehicleSummary: {
      make: "Suzuki",
      model: "Vitara",
      engine: "1.6 VVT",
      oilSpecification: "0W20",
      timingType: "courroie",
      transmissionType: "Traction",
    },
    operations: [
      {
        category: "vidange",
        title: "Vidange moteur",
        description: "Vidange 0W20",
        intervalKm: 15000,
        intervalMonths: 12,
        estimatedCostMinEur: 100,
        estimatedCostMaxEur: 140,
        criticite: "elevee",
      },
      {
        category: "climatisation",
        title: "Contrôle étanchéité & entretien circuit de climatisation",
        description: "Contrôle du compresseur, traitement antibactérien et recharge fluide frigorigène.",
        intervalKm: 40000,
        intervalMonths: 24,
        estimatedCostMinEur: 65,
        estimatedCostMaxEur: 110,
        criticite: "faible",
      },
      {
        category: "courroie_distribution",
        title: "Remplacement kit courroie de distribution",
        description: "Distribution",
        intervalKm: 100000,
        intervalMonths: 60,
        estimatedCostMinEur: 500,
        estimatedCostMaxEur: 700,
        criticite: "critique",
      },
    ],
  };

  const sanitized = sanitizeOfficialMaintenancePlan(hallucinatedPlan, {
    marque: "Suzuki",
    modele: "Vitara",
    version: "1.6 VVT",
    energie: "Essence",
  });

  if (sanitized.operations.some((op) => op.category === "climatisation")) {
    throw new Error("ÉCHEC : Le sanitizer n'a pas filtré l'opération de climatisation hallucinante.");
  }
  if (sanitized.operations.some((op) => op.category === "courroie_distribution")) {
    throw new Error("ÉCHEC : Le sanitizer n'a pas filtré la courroie de distribution sur un moteur à chaîne.");
  }
  if (sanitized.vehicleSummary.timingType !== "chaine") {
    throw new Error("ÉCHEC : Le sanitizer n'a pas corrigé timingType en 'chaine'.");
  }
  console.log("  ✔ Gardes-fous déterministes : Hallucinations LLM de climatisation et distribution neutralisées avec succès.");

  // 3. Test Véhicule Diesel avec Courroie (Renault Espace 1.6 dCi)
  const espacePlan = await fetchOnlineManufacturerPlan({
    marque: "Renault",
    modele: "Espace V",
    version: "1.6 dCi 160 ch Energy",
    energie: "Diesel",
    annee_mise_en_circulation: 2016,
    kilometrage_actuel: 140000,
  });

  const fuelFilter = espacePlan.operations.find((op) => op.category === "filtre_carburant");
  if (!fuelFilter) {
    throw new Error("ÉCHEC : Le filtre à gazole avec purge d'eau doit être présent pour un véhicule diesel.");
  }
  console.log("  ✔ Différenciation Diesel / Essence validée (Filtre gazole présent sur diesel).");

  console.log("  ✔ Tous les tests de robustesse des plans constructeurs sont validés avec succès.\n");
}

if (require.main === module) {
  testManufacturerPlanRobustness();
}
