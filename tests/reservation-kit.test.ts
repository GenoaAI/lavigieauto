import { generateReservationKit } from "../src/lib/engine/reservation-kit";

export function testReservationKit() {
  console.log("▶ [TEST] Engine : Générateur du Script garage...");

  const kit = generateReservationKit({
    vehicle: {
      make: "Peugeot",
      model: "3008",
      version: "1.2 PureTech 130ch",
      licensePlate: "XX-123-YY",
      currentMileage: 59800,
      fuelType: "Essence",
    },
    upcomingMilestones: [
      {
        category: "DRAIN_OIL",
        title: "Vidange moteur & filtre",
        dueMileage: 60000,
        projectedDueDate: "2026-09-15",
        triggerType: "MILEAGE_TRIGGER",
        remainingKm: 200,
        remainingDays: 26,
        urgency: "DUE_SOON",
        estimatedCostEur: 140,
        isSevereAdjusted: false,
        explanation: "Cycle constructeur 20 000 km",
      },
    ],
  });

  if (!kit.phoneScript.includes("Peugeot 3008") || !kit.phoneScript.includes("XX-123-YY")) {
    throw new Error("Échec script verbal garagiste : informations véhicule manquantes.");
  }

  if (kit.interventionsToRequest.length === 0) {
    throw new Error("Échec interventions demandées : la liste est vide.");
  }

  console.log("  ✔ Script garage généré avec succès avec le script téléphonique exact.");
}
