import {
  resolveRecommendedGarage,
  calculateRecencyScore,
  calculateFrequencyScore,
  checkBrandAffinity,
} from "../src/lib/engine/garage-resolver";

export async function testGarageResolver() {
  console.log("▶ [TEST] Engine : Sélection Intelligente du Garagiste Recommandé...");

  // 1. Test du calcul de récence
  const recentDate = new Date();
  recentDate.setMonth(recentDate.getMonth() - 1);
  const scoreRecent = calculateRecencyScore(recentDate.toISOString().split("T")[0]);
  if (scoreRecent < 90) {
    throw new Error(`Score de récence trop bas pour 1 mois: ${scoreRecent}`);
  }

  const oldDate = new Date();
  oldDate.setFullYear(oldDate.getFullYear() - 3);
  const scoreOld = calculateRecencyScore(oldDate.toISOString().split("T")[0]);
  if (scoreOld > 50) {
    throw new Error(`Score de récence trop élevé pour 3 ans: ${scoreOld}`);
  }

  // 2. Test du calcul de fréquence
  const freq1 = calculateFrequencyScore(1, 4);
  const freq4 = calculateFrequencyScore(4, 4);
  if (freq4 !== 100 || freq1 !== 25) {
    throw new Error(`Erreur calcul fréquence: freq1=${freq1}, freq4=${freq4}`);
  }

  // 3. Test de l'affinité de marque
  if (!checkBrandAffinity("Suzuki", "Suzuki Auto Paris", "Suzuki")) {
    throw new Error("L'affinité de marque pour Suzuki aurait dû être validée.");
  }
  if (checkBrandAffinity("Peugeot", "Garage Peugeot", "Suzuki")) {
    throw new Error("L'affinité Peugeot pour véhicule Suzuki n'aurait pas dû être validée.");
  }

  // 4. Test complet de sélection pondérée
  const sampleVehicle = {
    id: "veh-vitara",
    marque: "Suzuki",
    modele: "Vitara",
    foyer_id: "foyer-1",
  };

  const sampleGarages = [
    {
      id: "g-1",
      foyer_id: "foyer-1",
      nom: "Point S Rapide",
      telephone: "01 00 00 00 01",
      email: "points@test.fr",
      marque: "Multimarque",
    },
    {
      id: "g-2",
      foyer_id: "foyer-1",
      nom: "Suzuki Auto Paris Ouest",
      telephone: "01 42 68 90 12",
      email: "atelier@suzuki.fr",
      marque: "Suzuki",
    },
  ];

  const sampleDocs = [
    {
      id: "doc-1",
      garage_id: "g-2",
      file_type: "facture" as const,
      date_document: "2025-06-12",
      kilometrage_document: 110000,
    },
    {
      id: "doc-2",
      garage_id: "g-2",
      file_type: "facture" as const,
      date_document: "2026-02-15",
      kilometrage_document: 120000,
    },
    {
      id: "doc-3",
      garage_id: "g-1",
      file_type: "facture" as const,
      date_document: "2024-01-10",
      kilometrage_document: 90000,
    },
  ];

  const result = resolveRecommendedGarage({
    vehicle: sampleVehicle,
    garages: sampleGarages as any,
    documents: sampleDocs as any,
  });

  if (!result.recommendedGarage) {
    throw new Error("Aucun garage recommandé retourné.");
  }

  if (result.recommendedGarage.id !== "g-2") {
    throw new Error(
      `Le garage recommandé attendu était g-2 (Suzuki Auto Paris Ouest), obtenu: ${result.recommendedGarage.nom}`
    );
  }

  if (result.recommendedGarage.visitCount !== 2) {
    throw new Error(`Nombre de visites incorrect: ${result.recommendedGarage.visitCount} (attendu: 2)`);
  }

  if (!result.recommendedGarage.reason.includes("2 interventions")) {
    throw new Error(`Justification attendue avec '2 interventions', obtenu: ${result.recommendedGarage.reason}`);
  }

  console.log("  ✔ Algorithme pondéré de sélection du garagiste validé avec succès.");
  console.log(`    Recommandation: "${result.recommendedGarage.nom}" — ${result.recommendedGarage.reason}`);
}
