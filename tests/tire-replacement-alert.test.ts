import {
  formatTireReplacementAlert,
  calculateVehicleTireAssessment,
} from "@/lib/engine/tires";

// Déclaration de type pour les globals Vitest sans require('vitest') en CJS
declare const describe: any;
declare const it: any;
declare const expect: any;

export async function testTireReplacementAlert() {
  console.log("▶ [TEST] Formulation des Alertes Pneumatiques avec Kilométrage Cible Absolu...");

  // 1. Test nominal : départ 272 448 km, usure restante 26 400 km (cas réel de la capture utilisateur)
  const messageNominal = formatTireReplacementAlert({
    currentMileage: 272448,
    remainingKm: 26400,
  });
  const normalizedNominal = messageNominal.replace(/[\s\u202f\u00a0]/g, " ");

  if (!normalizedNominal.includes("Remplacer à ~298 848 km")) {
    throw new Error(`Le message ne contient pas 'Remplacer à ~298 848 km': ${messageNominal}`);
  }
  if (!normalizedNominal.includes("soit sous ~26 400 km")) {
    throw new Error(`Le message ne contient pas le rappel relatif attendu: ${messageNominal}`);
  }
  console.log("  ✔ Formulation nominale pneumatiques validée : 'Remplacer à ~298 848 km (soit sous ~26 400 km)'.");

  // 2. Test fallback gracieux : kilométrage non défini (undefined, null, 0)
  const messageFallbackUndefined = formatTireReplacementAlert({
    currentMileage: undefined,
    remainingKm: 26400,
  });
  const normalizedUndefined = messageFallbackUndefined.replace(/[\s\u202f\u00a0]/g, " ");

  if (!normalizedUndefined.includes("Planifiez le remplacement sous ~26 400 km")) {
    throw new Error(`Le fallback undefined n'a pas retourné la formulation relative: ${messageFallbackUndefined}`);
  }

  const messageFallbackNull = formatTireReplacementAlert({
    currentMileage: null,
    remainingKm: 26400,
  });
  const normalizedNull = messageFallbackNull.replace(/[\s\u202f\u00a0]/g, " ");

  if (!normalizedNull.includes("Planifiez le remplacement sous ~26 400 km")) {
    throw new Error(`Le fallback null n'a pas retourné la formulation relative: ${messageFallbackNull}`);
  }
  console.log("  ✔ Fallback gracieux pneumatiques validé en cas de kilométrage non renseigné.");

  // 3. Test intégration dans calculateVehicleTireAssessment avec départ à 272 448 km et relevé atelier 34%
  const assessment = calculateVehicleTireAssessment({
    vehicleId: "veh-espace-272k",
    currentMileage: 272448,
    dailyKmRate: 40,
    invoices: [
      {
        date: "2026-08-18",
        mileage: 272448,
        operation: "CTRL PNEUS AV 34% D'USURE",
        emitter: "GARAGE DU CENTRE",
      },
    ],
  });

  if (assessment.frontAxle.remainingKm !== 26400) {
    throw new Error(`Kilométrage restant attendu 26 400 km, obtenu: ${assessment.frontAxle.remainingKm}`);
  }
  if (assessment.frontAxle.targetReplacementMileage !== 298848) {
    throw new Error(`Kilométrage cible attendu 298 848 km, obtenu: ${assessment.frontAxle.targetReplacementMileage}`);
  }
  if (assessment.nextReplacementMileage !== 298848) {
    throw new Error(`Échéance globale attendue 298 848 km, obtenu: ${assessment.nextReplacementMileage}`);
  }
  console.log("  ✔ Intégration calculateVehicleTireAssessment validée avec cible exacte 298 848 km.");

  // 4. Test statut DUE_SOON (> 75% d'usure) avec injection du message cible
  const dueSoonAssessment = calculateVehicleTireAssessment({
    vehicleId: "veh-espace-duesoon",
    currentMileage: 272448,
    dailyKmRate: 40,
    invoices: [
      {
        date: "2026-08-18",
        mileage: 272448,
        operation: "CTRL PNEUS AV 80% D'USURE",
        emitter: "GARAGE DU CENTRE",
      },
    ],
  });

  const normalizedRec = dueSoonAssessment.frontAxle.recommendation.replace(/[\s\u202f\u00a0]/g, " ");
  if (!normalizedRec.includes("Remplacer à ~280 448 km")) {
    throw new Error(`La recommandation pneumatique ne contient pas 'Remplacer à ~280 448 km': ${dueSoonAssessment.frontAxle.recommendation}`);
  }
  if (dueSoonAssessment.frontAxle.status !== "DUE_SOON") {
    throw new Error(`Le statut attendu est DUE_SOON pour 80% d'usure, obtenu: ${dueSoonAssessment.frontAxle.status}`);
  }
  console.log("  ✔ Alerte DUE_SOON validée avec cible absolue 'Remplacer à ~280 448 km'.");
}

// Suite de tests native Vitest
if (typeof describe === "function") {
  describe("Moteur Prédictif des Pneumatiques - Alertes de Remplacement Cibles", () => {
    it("génère le kilométrage cible absolu ('Remplacer à ~298 848 km') avec rappel relatif ('soit sous ~26 400 km')", () => {
      const message = formatTireReplacementAlert({
        currentMileage: 272448,
        remainingKm: 26400,
      });
      const normalized = message.replace(/[\s\u202f\u00a0]/g, " ");
      expect(normalized).toContain("Remplacer à ~298 848 km");
      expect(normalized).toContain("soit sous ~26 400 km");
    });

    it("bascule gracieusement sur la préconisation relative en cas de kilométrage non défini", () => {
      expect(() =>
        formatTireReplacementAlert({
          currentMileage: undefined,
          remainingKm: 26400,
        })
      ).not.toThrow();

      const fallbackUndefined = formatTireReplacementAlert({
        currentMileage: undefined,
        remainingKm: 26400,
      });
      const normalizedUndefined = fallbackUndefined.replace(/[\s\u202f\u00a0]/g, " ");
      expect(normalizedUndefined).toContain("Planifiez le remplacement sous ~26 400 km");

      const fallbackNull = formatTireReplacementAlert({
        currentMileage: null,
        remainingKm: 26400,
      });
      const normalizedNull = fallbackNull.replace(/[\s\u202f\u00a0]/g, " ");
      expect(normalizedNull).toContain("Planifiez le remplacement sous ~26 400 km");
    });

    it("calcule et popule targetReplacementMileage sur les essieux et dans le bilan global", () => {
      const assessment = calculateVehicleTireAssessment({
        vehicleId: "veh-espace-272k",
        currentMileage: 272448,
        dailyKmRate: 40,
        invoices: [
          {
            date: "2026-08-18",
            mileage: 272448,
            operation: "CTRL PNEUS AV 34% D'USURE",
            emitter: "GARAGE DU CENTRE",
          },
        ],
      });

      expect(assessment.frontAxle.remainingKm).toBe(26400);
      expect(assessment.frontAxle.targetReplacementMileage).toBe(298848);
      expect(assessment.nextReplacementMileage).toBe(298848);
    });

    it("intègre le kilométrage cible dans la recommandation d'usure critique / due soon", () => {
      const dueSoonAssessment = calculateVehicleTireAssessment({
        vehicleId: "veh-espace-duesoon",
        currentMileage: 272448,
        dailyKmRate: 40,
        invoices: [
          {
            date: "2026-08-18",
            mileage: 272448,
            operation: "CTRL PNEUS AV 80% D'USURE",
            emitter: "GARAGE DU CENTRE",
          },
        ],
      });

      const normalized = dueSoonAssessment.frontAxle.recommendation.replace(/[\s\u202f\u00a0]/g, " ");
      expect(normalized).toContain("Remplacer à ~280 448 km");
      expect(dueSoonAssessment.frontAxle.status).toBe("DUE_SOON");
    });
  });
}
