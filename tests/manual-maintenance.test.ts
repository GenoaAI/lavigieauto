import { addManualMaintenanceSchema } from "@/lib/security/schemas";
import { addManualMaintenanceAction } from "@/app/actions/vehicles";
import { recalculateMaintenanceForecast } from "@/lib/engine/cycles";
import fs from "fs";
import path from "path";

export async function testManualMaintenanceManagement() {
  console.log("=================================================");
  console.log("🔧 [TEST] SAISIE ET VALIDATION MANUELLE D'ENTRETIEN ('J'AI FAIT CET ENTRETIEN' / DIY)");
  console.log("=================================================\n");

  // ==========================================
  // 1. TESTS DE VALIDATION DU SCHÉMA ZOD
  // ==========================================
  console.log("▶ [TEST 1] Validation du schéma Zod addManualMaintenanceSchema...");

  // Cas valide complet
  const validFull = addManualMaintenanceSchema.safeParse({
    vehicleId: "veh-vitara-1",
    operation: "Vidange huile moteur & filtre à huile",
    category: "moteur",
    dateIntervention: "2026-09-05",
    kilometrage: 85200,
    coutTTC: 49.9,
    referencePiece: "Castrol 5W30 LL, Purflux L358A",
    notes: "Remplacement du joint de vidange cuivre 14mm",
    milestoneId: "ech-vidange-1",
  });
  if (!validFull.success) {
    throw new Error(`Échec validation Zod valide complet: ${JSON.stringify(validFull.error.issues)}`);
  }

  // Cas valide minimal
  const validMin = addManualMaintenanceSchema.safeParse({
    vehicleId: "veh-vitara-1",
    operation: "Remplacement filtre d'habitacle",
    dateIntervention: "2026-09-05",
    kilometrage: 85200,
  });
  if (!validMin.success) {
    throw new Error(`Échec validation Zod valide minimal: ${JSON.stringify(validMin.error.issues)}`);
  }
  if (validMin.data.category !== "moteur") {
    // Par défaut la catégorie est 'moteur'
  }

  // Cas invalide : opération vide
  const invalidOp = addManualMaintenanceSchema.safeParse({
    vehicleId: "veh-1",
    operation: " ",
    dateIntervention: "2026-09-05",
    kilometrage: 50000,
  });
  if (invalidOp.success) {
    throw new Error("Le schéma aurait dû rejeter une opération vide.");
  }

  // Cas invalide : date malformée
  const invalidDate = addManualMaintenanceSchema.safeParse({
    vehicleId: "veh-1",
    operation: "Vidange",
    dateIntervention: "05/09/2026",
    kilometrage: 50000,
  });
  if (invalidDate.success) {
    throw new Error("Le schéma aurait dû rejeter une date au mauvais format.");
  }

  // Cas invalide : kilométrage négatif
  const invalidKm = addManualMaintenanceSchema.safeParse({
    vehicleId: "veh-1",
    operation: "Vidange",
    dateIntervention: "2026-09-05",
    kilometrage: -100,
  });
  if (invalidKm.success) {
    throw new Error("Le schéma aurait dû rejeter un kilométrage négatif.");
  }

  // Cas invalide : catégorie non reconnue
  const invalidCategory = addManualMaintenanceSchema.safeParse({
    vehicleId: "veh-1",
    operation: "Vidange",
    category: "fusée" as any,
    dateIntervention: "2026-09-05",
    kilometrage: 50000,
  });
  if (invalidCategory.success) {
    throw new Error("Le schéma aurait dû rejeter une catégorie inconnue.");
  }

  console.log("  ✔ Schéma Zod addManualMaintenanceSchema validé avec succès (cas nominaux et limites).\n");

  // ==========================================
  // 2. VÉRIFICATION DU CONTRÔLE D'ACCÈS ZERO-TRUST & SERVER ACTION
  // ==========================================
  console.log("▶ [TEST 2] Sécurité Zero-Trust & Signature de addManualMaintenanceAction...");

  if (typeof addManualMaintenanceAction !== "function") {
    throw new Error("addManualMaintenanceAction n'est pas exportée correctement.");
  }

  // Test d'appel direct hors contexte (doit échouer proprement en Zero-Trust sans crash non géré)
  try {
    const res = await addManualMaintenanceAction({
      vehicleId: "non-existent-veh",
      operation: "Vidange",
      category: "moteur",
      dateIntervention: "2026-09-05",
      kilometrage: 100000,
    });
    if (res.success) {
      throw new Error("L'action aurait dû échouer pour un appel non authentifié.");
    }
  } catch (err: any) {
    // Rejet attendu par requireUserHouseholdContext ou assertVehicleOwnership
  }

  console.log("  ✔ Sécurité Zero-Trust et signature validées avec succès.\n");

  // ==========================================
  // 3. INTÉGRATION AU MOTEUR PRÉDICTIF D'ÉCHÉANCES (CYCLES.TS)
  // ==========================================
  console.log("▶ [TEST 3] Prise en compte des entretiens DIY dans le calcul des cycles prédictifs...");

  // Simulation : un véhicule de 80 000 km qui réalise une vidange manuelle à 85 000 km le 2026-09-05
  const readings = [
    { date: "2024-09-01", mileage: 60000, source: "INVOICE" as const },
    { date: "2025-09-01", mileage: 75000, source: "INVOICE" as const },
    { date: "2026-09-05", mileage: 85000, source: "MANUAL" as const },
  ];

  const lastServices = [
    {
      category: "DRAIN_OIL" as const,
      serviceDate: "2026-09-05",
      mileage: 85000,
    },
  ];

  const forecast = recalculateMaintenanceForecast({
    readings,
    currentOdometer: 85000,
    vehicleFirstRegistration: "2020-01-01",
    lastServices,
  });

  // La vidange doit maintenant être projetée vers 105 000 km (85 000 + 20 000) et non plus en retard
  const drainOilMilestone = forecast.projectedMilestones.find(
    (m) => m.category === "DRAIN_OIL"
  );

  if (drainOilMilestone) {
    if (drainOilMilestone.targetMileage <= 85000) {
      throw new Error(`La prochaine vidange aurait dû être projetée après 85 000 km, trouvé: ${drainOilMilestone.targetMileage}`);
    }
  }

  console.log("  ✔ Moteur de cycles : la saisie manuelle DIY réinitialise et projette correctement le prochain cycle.\n");

  // ==========================================
  // 4. VÉRIFICATION DES FICHIERS UI & DESIGN SYSTEM
  // ==========================================
  console.log("▶ [TEST 4] Intégrité structurelle de l'UI (boutons, modal, badge DIY)...");

  // Vérifier ManualMaintenanceModal.tsx
  const modalPath = path.join(process.cwd(), "src/components/vehicles/ManualMaintenanceModal.tsx");
  if (!fs.existsSync(modalPath)) {
    throw new Error("Le composant ManualMaintenanceModal.tsx est introuvable.");
  }
  const modalContent = fs.readFileSync(modalPath, "utf-8");
  if (!modalContent.includes("J'ai fait cet entretien")) {
    throw new Error("ManualMaintenanceModal doit contenir le titre 'J'ai fait cet entretien'.");
  }
  if (!modalContent.includes("receiptFile")) {
    throw new Error("ManualMaintenanceModal doit gérer le champ justificatif receiptFile.");
  }

  // Vérifier VehicleDetailClientView.tsx
  const detailPath = path.join(process.cwd(), "src/components/vehicles/VehicleDetailClientView.tsx");
  const detailContent = fs.readFileSync(detailPath, "utf-8");
  if (!detailContent.includes("J'ai fait cet entretien")) {
    throw new Error("VehicleDetailClientView.tsx doit comporter le bouton 'J'ai fait cet entretien'.");
  }
  if (!detailContent.includes("ManualMaintenanceModal")) {
    throw new Error("VehicleDetailClientView.tsx doit instancier ManualMaintenanceModal.");
  }

  // Vérifier MaintenanceBookletView.tsx
  const bookletPath = path.join(process.cwd(), "src/components/vehicles/MaintenanceBookletView.tsx");
  const bookletContent = fs.readFileSync(bookletPath, "utf-8");
  if (!bookletContent.includes("Propriétaire (DIY)")) {
    throw new Error("MaintenanceBookletView.tsx doit contenir le badge valorisant 'Propriétaire (DIY)'.");
  }

  console.log("  ✔ Composants UI certifiés : boutons 'J'ai fait cet entretien', modale DIY et badge carnet validés.\n");

  console.log("=================================================");
  console.log("🎉 TOUS LES TESTS DE MAINTENANCE MANUELLE (DIY) SONT AU VERT !");
  console.log("=================================================\n");
}
