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

  // Cas 3 : Historique multi-factures avec ancienne facture Speedy (2019) et facture récente Kleber (2026) dans le désordre
  const multiInvoiceAssessment = calculateVehicleTireAssessment({
    vehicleId: "EC-301-JX",
    currentMileage: 125789,
    dailyKmRate: 35,
    make: "Suzuki",
    model: "Vitara",
    invoices: [
      // Ancienne facture 2019 en premier
      {
        date: "2019-10-19",
        mileage: 35801,
        operation: "FORF. PNEUS MONTAGE+VALVE+EQUI ROUE TOLE",
        emitter: "Speedy",
      },
      // Facture récente d'il y a 5 jours
      {
        date: "2026-08-21",
        mileage: 125789,
        operation: "KLEBER DYNAXER HP5 215/55 R17 94W (4 pneus neufs)",
        emitter: "SARL GARAGE HELIERE C. & S.",
      },
      // Autre facture intermédiaire
      {
        date: "2024-07-06",
        mileage: 96557,
        operation: "PRESSION PNEUS + CONTROLE FREINS",
        emitter: "Garage",
      },
    ],
  });

  if (multiInvoiceAssessment.frontAxle.lastEventDate !== "2026-08-21") {
    throw new Error(`Date du dernier événement attendue 2026-08-21, reçu: ${multiInvoiceAssessment.frontAxle.lastEventDate}`);
  }
  if (multiInvoiceAssessment.frontAxle.brandAndModel !== "Kleber Dynaxer HP5") {
    throw new Error(`Marque/modèle attendu 'Kleber Dynaxer HP5', reçu: ${multiInvoiceAssessment.frontAxle.brandAndModel}`);
  }
  if (multiInvoiceAssessment.frontAxle.dimension !== "215/55 R17 94W") {
    throw new Error(`Dimension attendue '215/55 R17 94W', reçu: ${multiInvoiceAssessment.frontAxle.dimension}`);
  }
  if (multiInvoiceAssessment.frontAxle.remainingTreadDepthMm !== 8.0) {
    throw new Error(`Profondeur attendue 8.0 mm (neuf posé à 125789km), reçu: ${multiInvoiceAssessment.frontAxle.remainingTreadDepthMm}`);
  }
  if (multiInvoiceAssessment.frontAxle.kmDrivenSinceEvent !== 0) {
    throw new Error(`Km parcourus attendus 0 km, reçu: ${multiInvoiceAssessment.frontAxle.kmDrivenSinceEvent}`);
  }
  if (multiInvoiceAssessment.globalHealthScore !== 100) {
    throw new Error(`Score global attendu 100%, reçu: ${multiInvoiceAssessment.globalHealthScore}%`);
  }

  console.log("  ✔ Calculs d'usure validés (Pneus neufs 8.0mm / Relevés d'usure 30% AV & 20% AR / Tri chronologique multi-factures).");
}
