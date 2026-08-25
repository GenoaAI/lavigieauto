import { calculateVehicleTireAssessment } from "../src/lib/engine/tires";

export async function testTireEngine() {
  console.log("▶ [TEST] Engine : Suivi Prédictif & Sécurité des Pneumatiques...");

  // Cas 1 : Pneus neufs Suzuki Vitara (Kleber Dynaxer HP5 215/55 R17)
  const suzukiAssessment = calculateVehicleTireAssessment({
    vehicleId: "22222222-2222-2222-2222-222222222222",
    currentMileage: 125789,
    dailyKmRate: 35,
    invoices: [
      {
        date: "2026-08-21",
        mileage: 125789,
        operation: "KLEBER DYNAXER HP5 215/55 R17 94W (4 pneus neufs)",
        emitter: "SARL GARAGE HELIERE C. & S.",
      },
    ],
  });

  if (suzukiAssessment.frontAxle.remainingTreadDepthMm !== 8.0) {
    throw new Error(`Profondeur de sculpture attendue 8.0 mm (neuf), reçu: ${suzukiAssessment.frontAxle.remainingTreadDepthMm}`);
  }
  if (suzukiAssessment.frontAxle.wearPercentage !== 0) {
    throw new Error(`Usure attendue 0%, reçu: ${suzukiAssessment.frontAxle.wearPercentage}%`);
  }
  if (suzukiAssessment.globalHealthScore !== 100) {
    throw new Error(`Score de santé pneus attendu 100%, reçu: ${suzukiAssessment.globalHealthScore}%`);
  }

  // Cas 2 : Relevé officiel d'usure en révision Renault Espace (30% AV, 20% AR)
  const espaceAssessment = calculateVehicleTireAssessment({
    vehicleId: "33333333-3333-3333-3333-333333333333",
    currentMileage: 272448,
    dailyKmRate: 40,
    invoices: [
      {
        date: "2026-08-18",
        mileage: 272448,
        operation: "CTRL PLAQUETTES AV 80%, CTRL PNEUS AV 30% D'USURE, CTRL PNEUS AR 20% D'USURE",
        emitter: "SARL GARAGE HELIERE C. & S.",
      },
    ],
  });

  if (espaceAssessment.frontAxle.wearPercentage !== 30) {
    throw new Error(`Usure train AV attendue 30%, reçu: ${espaceAssessment.frontAxle.wearPercentage}%`);
  }
  if (espaceAssessment.rearAxle.wearPercentage !== 20) {
    throw new Error(`Usure train AR attendue 20%, reçu: ${espaceAssessment.rearAxle.wearPercentage}%`);
  }
  if (espaceAssessment.frontAxle.remainingTreadDepthMm < 6.0 || espaceAssessment.frontAxle.remainingTreadDepthMm > 6.2) {
    throw new Error(`Profondeur AV attendue ~6.1 mm, reçu: ${espaceAssessment.frontAxle.remainingTreadDepthMm}`);
  }

  console.log("  ✔ Calculs d'usure validés (Pneus neufs 8.0mm / Relevés d'usure 30% AV & 20% AR / Alertes).");
}
