import {
  fetchOnlineManufacturerPlan,
  sanitizeOfficialMaintenancePlan,
  GOLDEN_OEM_PLANS,
} from "../src/lib/engine/manufacturer-retriever";
import { reconcileSingleOperationWithHistory } from "../src/lib/engine/reconciliation";
import { calculateVehicleTireAssessment } from "../src/lib/engine/tires";
import { recalculateMaintenanceForecast } from "../src/lib/engine/cycles";

export async function testVitaraFullStackNonRegression() {
  console.log("\n=================================================");
  console.log("🛡️ [NON-REGRESSION] SUZUKI VITARA 1.6 VVT (M16A ALLGRIP) INTEGRITY SUITE");
  console.log("=================================================\n");

  const vitaraVehicle = {
    id: "vitara-test-uuid",
    foyer_id: "foyer-test-uuid",
    marque: "Suzuki",
    modele: "Vitara",
    version: "1.6 VVT 120 ch AllGrip Pack",
    immatriculation: "EC-301-JX",
    energie: "Essence",
    annee_mise_en_circulation: 2016,
    date_premiere_immatriculation: "2016-04-15",
    kilometrage_actuel: 125789,
    vin: "TSMEYA21S00123456",
  };

  // -------------------------------------------------------------------------
  // 1. VÉRIFICATION DU PLAN CONSTRUCTEUR OFFICIEL OEM (SUZUKI VITARA 1.6 VVT)
  // -------------------------------------------------------------------------
  console.log("▶ [VITARA 1] Plan Constructeur OEM & Gardes-Fous Déterministes...");
  const plan = await fetchOnlineManufacturerPlan(vitaraVehicle);

  // A. Zéro recharge clim
  const acOps = plan.operations.filter(
    (op) =>
      op.category === "climatisation" ||
      op.title.toLowerCase().includes("recharge fluide") ||
      op.title.toLowerCase().includes("recharge clim") ||
      op.description.toLowerCase().includes("recharge fluide frigorigène") ||
      op.description.toLowerCase().includes("recharge de gaz")
  );
  if (acOps.length > 0) {
    throw new Error(`[RÉGRESSION VITARA] Fausse opération de climatisation détectée : ${JSON.stringify(acOps)}`);
  }
  console.log("  ✔ Zéro opération de recharge de climatisation dans le plan d'entretien.");

  // B. Distribution par chaîne
  if (plan.vehicleSummary.timingType !== "chaine") {
    throw new Error(`[RÉGRESSION VITARA] Type de distribution erroné: attendu 'chaine', obtenu '${plan.vehicleSummary.timingType}'`);
  }
  const timingBeltOps = plan.operations.filter(
    (op) => op.category === "courroie_distribution" || op.title.toLowerCase().includes("courroie de distribution")
  );
  if (timingBeltOps.length > 0) {
    throw new Error("[RÉGRESSION VITARA] Présence anormale d'une courroie de distribution sur moteur M16A à chaîne !");
  }
  console.log("  ✔ Distribution par chaîne validée (zéro courroie de distribution).");

  // C. Zéro filtre à essence externe périodique (crépine immergée)
  const fuelFilterOps = plan.operations.filter(
    (op) => op.category === "filtre_carburant" || op.title.toLowerCase().includes("filtre à essence") || op.title.toLowerCase().includes("filtre à carburant")
  );
  if (fuelFilterOps.length > 0) {
    throw new Error("[RÉGRESSION VITARA] Filtre à essence périodique généré alors que le Vitara essence utilise une crépine immergée au réservoir !");
  }
  console.log("  ✔ Filtre à carburant externe absent (crépine immergée conforme).");

  // D. Présence des opérations périodiques Suzuki officielles
  const requiredCategories = [
    "vidange",
    "filtre_air",
    "filtre_habitacle",
    "bougies",
    "liquide_frein",
    "courroie_accessoire",
    "liquide_refroidissement",
    "vidange_pont",
    "controle_technique",
  ];

  for (const cat of requiredCategories) {
    const found = plan.operations.find((op) => op.category === cat);
    if (!found) {
      throw new Error(`[RÉGRESSION VITARA] Opération constructeur requise manquante : '${cat}'`);
    }
  }
  console.log(`  ✔ Les ${requiredCategories.length} opérations officielles Suzuki (dont vidange pont 4x4 et purge DOT 4) sont présentes.`);

  // E. Contrôle Technique réglementaire sans butoir km
  const ctOp = plan.operations.find((op) => op.category === "controle_technique");
  if (!ctOp || ctOp.intervalKm !== 0 || ctOp.intervalMonths !== 24) {
    throw new Error(`[RÉGRESSION VITARA] Contrôle Technique mal calibré : intervalKm=${ctOp?.intervalKm}, intervalMonths=${ctOp?.intervalMonths}`);
  }
  console.log("  ✔ Contrôle Technique purement calendaire validé (24 mois, 0 km).");

  // -------------------------------------------------------------------------
  // 2. VÉRIFICATION DES PNEUMATIQUES DU SUZUKI VITARA
  // -------------------------------------------------------------------------
  console.log("\n▶ [VITARA 2] Suivi Prédictif des Pneumatiques (215/55 R17)...");
  const vitaraTires = calculateVehicleTireAssessment({
    vehicleId: vitaraVehicle.id,
    currentMileage: vitaraVehicle.kilometrage_actuel,
    dailyKmRate: 35,
    make: "Suzuki",
    model: "Vitara",
    version: "1.6 VVT 120 ch AllGrip",
    invoices: [
      {
        date: "2026-08-21",
        mileage: 125789,
        operation: "KLEBER DYNAXER HP5 215/55 R17 94W (4 pneus neufs)",
        emitter: "SARL GARAGE HELIERE C. & S.",
      },
    ],
  });

  if (vitaraTires.frontAxle.dimension !== "215/55 R17 94W") {
    throw new Error(`[RÉGRESSION VITARA PNEUS] Dimension incorrecte : ${vitaraTires.frontAxle.dimension}`);
  }
  if (vitaraTires.frontAxle.brandAndModel !== "Kleber Dynaxer HP5") {
    throw new Error(`[RÉGRESSION VITARA PNEUS] Marque/modèle incorrect : ${vitaraTires.frontAxle.brandAndModel}`);
  }
  if (vitaraTires.frontAxle.wearPercentage !== 0 || vitaraTires.frontAxle.remainingTreadDepthMm !== 8.0) {
    throw new Error(`[RÉGRESSION VITARA PNEUS] Usure attendue 0% / 8.0mm, obtenu ${vitaraTires.frontAxle.wearPercentage}% / ${vitaraTires.frontAxle.remainingTreadDepthMm}mm`);
  }
  if (vitaraTires.globalHealthScore !== 100) {
    throw new Error(`[RÉGRESSION VITARA PNEUS] Score de santé attendu 100%, obtenu ${vitaraTires.globalHealthScore}%`);
  }
  console.log("  ✔ Monte 215/55 R17 94W Kleber Dynaxer HP5 reconnue à 100% de santé (8.0 mm).");

  // -------------------------------------------------------------------------
  // 3. VÉRIFICATION DU RAPPROCHEMENT HISTORIQUE & PREUVES DOCUMENTAIRES
  // -------------------------------------------------------------------------
  console.log("\n▶ [VITARA 3] Rapprochement des Factures & Justifications Certifiées...");
  const mockInterventions = [
    {
      id: "int-vidange-1",
      date_intervention: "2026-02-15",
      kilometrage_intervention: 120000,
      operation: "Forfait Révision Suzuki 0W20 + Filtre à huile",
      categorie: "moteur",
      emetteur: "SARL GARAGE HELIERE C. & S.",
      document_source_id: "doc-heliere-1",
    },
    {
      id: "int-bougies-1",
      date_intervention: "2024-05-10",
      kilometrage_intervention: 90000,
      operation: "Remplacement 4 Bougies d'allumage Iridium",
      categorie: "moteur",
      emetteur: "Suzuki Auto Paris Ouest",
      document_source_id: "doc-suzuki-1",
    },
  ];

  const mockDocs = [
    {
      id: "doc-heliere-1",
      date_document: "2026-02-15",
      kilometrage_document: 120000,
      emetteur: "SARL GARAGE HELIERE C. & S.",
      file_type: "facture",
    },
    {
      id: "doc-suzuki-1",
      date_document: "2024-05-10",
      kilometrage_document: 90000,
      emetteur: "Suzuki Auto Paris Ouest",
      file_type: "facture",
    },
  ];

  // Rapprochement vidange
  const vidangeRecon = reconcileSingleOperationWithHistory({
    category: "vidange",
    title: "Vidange huile moteur & remplacement filtre",
    interventions: mockInterventions,
    documents: mockDocs,
  });

  if (!vidangeRecon.lastService || vidangeRecon.lastService.kilometrage_intervention !== 120000) {
    throw new Error("[RÉGRESSION VITARA] Échec du rapprochement de la vidange Suzuki.");
  }
  if (!vidangeRecon.justification || !vidangeRecon.justification.emetteur.includes("HELIERE")) {
    throw new Error("[RÉGRESSION VITARA] Justification documentaire de la vidange erronée.");
  }
  console.log("  ✔ Preuve certifiée vidange rattachée avec succès au Garage Heliere (120 000 km).");

  // Rapprochement bougies
  const bougiesRecon = reconcileSingleOperationWithHistory({
    category: "bougies",
    title: "Remplacement des bougies d'allumage iridium",
    interventions: mockInterventions,
    documents: mockDocs,
  });

  if (!bougiesRecon.lastService || bougiesRecon.lastService.kilometrage_intervention !== 90000) {
    throw new Error("[RÉGRESSION VITARA] Échec du rapprochement des bougies Suzuki.");
  }
  console.log("  ✔ Preuve certifiée bougies rattachée avec succès à Suzuki Auto Paris Ouest (90 000 km).");

  console.log("\n🎉 SUITE DE NON-RÉGRESSION SUZUKI VITARA INTÉGRALEMENT VALIDÉE AVEC SUCCÈS !");
}

if (require.main === module) {
  testVitaraFullStackNonRegression()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
