import {
  formatReplacementAlertMessage,
  calculateVehicleBrakeAssessment,
} from "@/lib/engine/brakes";

// Déclaration de type pour les globals Vitest sans require('vitest') en CJS
declare const describe: any;
declare const it: any;
declare const expect: any;

export async function testBrakeReplacementAlert() {
  console.log("▶ [TEST] Formulation des Alertes de Remplacement avec Kilométrage Cible Absolu...");

  // 1. Test nominal : départ 142 000 km, usure restante 3 000 à 5 000 km
  const messageNominal = formatReplacementAlertMessage({
    currentMileage: 142000,
    minRemainingKm: 3000,
    maxRemainingKm: 5000,
  });
  const normalizedNominal = messageNominal.replace(/[\s\u202f\u00a0]/g, " ");

  if (!normalizedNominal.includes("Remplacer à 145 000 km")) {
    throw new Error(`Le message ne contient pas 'Remplacer à 145 000 km': ${messageNominal}`);
  }
  if (!normalizedNominal.includes("soit sous ~3 000 à 5 000 km")) {
    throw new Error(`Le message ne contient pas le rappel relatif attendu: ${messageNominal}`);
  }
  console.log("  ✔ Formulation nominale validée : 'Remplacer à 145 000 km (soit sous ~3 000 à 5 000 km)'.");

  // 2. Test fallback gracieux : kilométrage non défini (undefined, null, 0)
  const messageFallbackUndefined = formatReplacementAlertMessage({
    currentMileage: undefined,
    minRemainingKm: 3000,
    maxRemainingKm: 5000,
  });
  const normalizedUndefined = messageFallbackUndefined.replace(/[\s\u202f\u00a0]/g, " ");

  if (!normalizedUndefined.includes("Planifiez le remplacement sous ~3 000 à 5 000 km")) {
    throw new Error(`Le fallback undefined n'a pas retourné la formulation relative: ${messageFallbackUndefined}`);
  }

  const messageFallbackNull = formatReplacementAlertMessage({
    currentMileage: null,
    minRemainingKm: 3000,
    maxRemainingKm: 5000,
  });
  const normalizedNull = messageFallbackNull.replace(/[\s\u202f\u00a0]/g, " ");

  if (!normalizedNull.includes("Planifiez le remplacement sous ~3 000 à 5 000 km")) {
    throw new Error(`Le fallback null n'a pas retourné la formulation relative: ${messageFallbackNull}`);
  }
  console.log("  ✔ Fallback gracieux validé en cas de kilométrage non renseigné.");

  // 3. Test intégration dans calculateVehicleBrakeAssessment avec départ à 142 000 km et 78% d'usure
  const assessment = calculateVehicleBrakeAssessment({
    vehicleId: "veh-test-142k",
    currentMileage: 142000,
    dailyKmRate: 30,
    invoices: [
      {
        date: "2026-08-01",
        mileage: 142000,
        operation: "CTRL PLAQUETTES AV 78% D'USURE",
      },
    ],
  });

  const normalizedRec = assessment.frontAxle.recommendation.replace(/[\s\u202f\u00a0]/g, " ");
  if (!normalizedRec.includes("Remplacer à 145 000 km")) {
    throw new Error(`La recommandation de l'essieu avant ne contient pas 'Remplacer à 145 000 km': ${assessment.frontAxle.recommendation}`);
  }
  if (assessment.frontAxle.status !== "DUE_SOON") {
    throw new Error(`Le statut attendu est DUE_SOON pour 78% d'usure, obtenu: ${assessment.frontAxle.status}`);
  }
  console.log("  ✔ Intégration calculateVehicleBrakeAssessment validée avec statut DUE_SOON et cible 145 000 km.");
}

// Suite de tests native Vitest
if (typeof describe === "function") {
  describe("Moteur Prédictif de Freinage - Alertes de Remplacement Cibles", () => {
    it("génère le kilométrage cible absolu ('Remplacer à 145 000 km') avec usure restante de 3 000 à 5 000 km", () => {
      const message = formatReplacementAlertMessage({
        currentMileage: 142000,
        minRemainingKm: 3000,
        maxRemainingKm: 5000,
      });
      const normalized = message.replace(/[\s\u202f\u00a0]/g, " ");
      expect(normalized).toContain("Remplacer à 145 000 km");
      expect(normalized).toContain("soit sous ~3 000 à 5 000 km");
    });

    it("bascule gracieusement sur la préconisation relative en cas de kilométrage non défini", () => {
      expect(() =>
        formatReplacementAlertMessage({
          currentMileage: undefined,
          minRemainingKm: 3000,
          maxRemainingKm: 5000,
        })
      ).not.toThrow();

      const fallbackUndefined = formatReplacementAlertMessage({
        currentMileage: undefined,
        minRemainingKm: 3000,
        maxRemainingKm: 5000,
      });
      const normalizedUndefined = fallbackUndefined.replace(/[\s\u202f\u00a0]/g, " ");
      expect(normalizedUndefined).toContain("Planifiez le remplacement sous ~3 000 à 5 000 km");

      const fallbackNull = formatReplacementAlertMessage({
        currentMileage: null,
        minRemainingKm: 3000,
        maxRemainingKm: 5000,
      });
      const normalizedNull = fallbackNull.replace(/[\s\u202f\u00a0]/g, " ");
      expect(normalizedNull).toContain("Planifiez le remplacement sous ~3 000 à 5 000 km");
    });

    it("intègre le kilométrage cible dans le calcul complet du bilan de freinage", () => {
      const assessment = calculateVehicleBrakeAssessment({
        vehicleId: "veh-test-142k",
        currentMileage: 142000,
        dailyKmRate: 30,
        invoices: [
          {
            date: "2026-08-01",
            mileage: 142000,
            operation: "CTRL PLAQUETTES AV 78% D'USURE",
          },
        ],
      });

      const normalized = assessment.frontAxle.recommendation.replace(/[\s\u202f\u00a0]/g, " ");
      expect(normalized).toContain("Remplacer à 145 000 km");
      expect(assessment.frontAxle.status).toBe("DUE_SOON");
    });
  });
}
