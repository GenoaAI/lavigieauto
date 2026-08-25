import { recalculateMaintenanceForecast, calculateMileagePace } from "../src/lib/engine/cycles";

export function testCycles() {
  console.log("▶ [TEST] Engine : Calcul Dynamique du Rythme Kilométrique & Cycles...");

  const readings = [
    { date: "2024-08-20", mileage: 30000, source: "INVOICE" as const },
    { date: "2025-08-20", mileage: 45000, source: "INVOICE" as const },
    { date: "2026-08-20", mileage: 60000, source: "TECHNICAL_INSPECTION" as const },
  ];

  const pace = calculateMileagePace(readings, 60000);

  if (pace.annualMileageKm < 14000 || pace.annualMileageKm > 16000) {
    throw new Error(`Échec calcul allure kilométrique : attendu ~15000 km/an, obtenu ${pace.annualMileageKm}`);
  }

  const forecast = recalculateMaintenanceForecast({
    readings,
    currentOdometer: 60000,
    vehicleFirstRegistration: "2022-08-20",
    lastServices: [
      { category: "DRAIN_OIL", mileage: 60000, serviceDate: "2026-08-20" },
    ],
  });

  const nextDrain = forecast.projectedMilestones.find((m) => m.category === "DRAIN_OIL");
  if (!nextDrain || nextDrain.dueMileage !== 80000) {
    throw new Error(`Échec projection prochaine vidange : attendu 80 000 km, obtenu ${nextDrain?.dueMileage}`);
  }

  console.log(`  ✔ Rythme calculé : ${pace.annualMileageKm} km/an. Prochaine vidange projetée à ${nextDrain.dueMileage} km.`);
}
