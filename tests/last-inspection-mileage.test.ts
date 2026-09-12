import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  LastInspectionSummary,
  formatInspectionMileage,
} from "@/components/vehicles/LastInspectionSummary";

// Déclaration de type pour les globals Vitest sans require('vitest') en CJS
declare const describe: any;
declare const it: any;
declare const expect: any;

export async function testLastInspectionMileage() {
  console.log("▶ [TEST] Affichage du Kilométrage du Dernier Contrôle sur la Fiche Véhicule...");

  // 1. Test formatage nominal avec 142 500 km
  const formattedNominal = formatInspectionMileage(142500);
  const normalizedNominal = formattedNominal.replace(/[\s\u202f\u00a0]/g, " ");
  if (normalizedNominal !== "142 500 km") {
    throw new Error(`Formatage nominal erroné: attendu '142 500 km', obtenu '${formattedNominal}'`);
  }
  console.log("  ✔ Formatage nominal validé ('142 500 km').");

  // 2. Test cas limites et fallbacks gracieux (sans lever d'exception)
  const fallbackUndefined = formatInspectionMileage(undefined);
  const fallbackNull = formatInspectionMileage(null);
  const fallbackZero = formatInspectionMileage(0);
  const fallbackNegative = formatInspectionMileage(-500);
  const fallbackNaN = formatInspectionMileage(NaN);

  if (
    fallbackUndefined !== "Kilométrage non renseigné" ||
    fallbackNull !== "Kilométrage non renseigné" ||
    fallbackZero !== "Kilométrage non renseigné" ||
    fallbackNegative !== "Kilométrage non renseigné" ||
    fallbackNaN !== "Kilométrage non renseigné"
  ) {
    throw new Error("Échec du fallback gracieux sur kilométrage absent ou invalide.");
  }
  console.log("  ✔ Fallbacks gracieux validés pour undefined, null, 0, négatif et NaN.");

  // 3. Test rendu JSX du composant LastInspectionSummary avec valeur fournie
  const htmlWithMileage = renderToStaticMarkup(
    React.createElement(LastInspectionSummary, {
      mileage: 142500,
      date: "2026-08-20",
      centerName: "Dekra Contrôle Auto",
      resultStatus: "FAVORABLE (A)",
    })
  );

  const normalizedHtml = htmlWithMileage.replace(/[\s\u202f\u00a0]/g, " ");
  if (!normalizedHtml.includes("142 500 km")) {
    throw new Error("Le composant LastInspectionSummary n'affiche pas '142 500 km'.");
  }
  if (!normalizedHtml.includes("Dekra Contrôle Auto")) {
    throw new Error("Le composant n'affiche pas le nom du centre.");
  }
  console.log("  ✔ Rendu HTML du composant validé avec '142 500 km' et informations du centre.");

  // 4. Test rendu JSX du composant avec kilométrage non renseigné
  const htmlWithoutMileage = renderToStaticMarkup(
    React.createElement(LastInspectionSummary, {
      mileage: null,
      date: "2026-08-20",
    })
  );

  if (!htmlWithoutMileage.includes("Kilométrage non renseigné")) {
    throw new Error("Le composant ne bascule pas élégamment sur 'Kilométrage non renseigné'.");
  }
  console.log("  ✔ Rendu HTML sans kilométrage validé avec état de repli élégant.");
}

// Suite de tests exécutable nativement par Vitest
if (typeof describe === "function") {
  describe("Composant Fiche Véhicule - Kilométrage du Dernier Contrôle", () => {
    it("affiche correctement le kilométrage formaté ('142 500 km') lorsque la valeur est fournie", () => {
      const formatted = formatInspectionMileage(142500);
      expect(formatted.replace(/[\s\u202f\u00a0]/g, " ")).toBe("142 500 km");

      const html = renderToStaticMarkup(
        React.createElement(LastInspectionSummary, {
          mileage: 142500,
          date: "2026-08-20",
          centerName: "Dekra Contrôle Auto",
        })
      );
      expect(html.replace(/[\s\u202f\u00a0]/g, " ")).toContain("142 500 km");
    });

    it("gère élégamment l'état où le kilométrage n'est pas renseigné sans lever d'exception", () => {
      expect(() => formatInspectionMileage(undefined)).not.toThrow();
      expect(formatInspectionMileage(undefined)).toBe("Kilométrage non renseigné");
      expect(formatInspectionMileage(null)).toBe("Kilométrage non renseigné");
      expect(formatInspectionMileage(0)).toBe("Kilométrage non renseigné");

      let html = "";
      expect(() => {
        html = renderToStaticMarkup(
          React.createElement(LastInspectionSummary, {
            mileage: null,
          })
        );
      }).not.toThrow();
      expect(html).toContain("Kilométrage non renseigné");
    });
  });
}
