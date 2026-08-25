import { bundleMaintenanceAppointments } from "../src/lib/engine/bundling";
import type { ProjectedMilestone } from "../src/lib/engine/cycles";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${message}`);
    throw new Error(message);
  }
}

export function testBundlingEngine() {
  console.log("▶ [TEST] Engine : Regroupement Intelligent d'Atelier (Smart Bundling)...");

  // CAS 1 : Renault Espace V avec 2 opérations très proches en Mars 2027 (Plaquettes et Filtre à air)
  const espaceMilestones: ProjectedMilestone[] = [
    {
      category: "BRAKE_PADS_FRONT",
      title: "Contrôle & Remplacement des plaquettes de frein avant",
      dueMileage: 280000,
      projectedDueDate: "2027-03-15",
      triggerType: "MILEAGE_TRIGGER",
      remainingKm: 7552,
      remainingDays: 204,
      urgency: "OK",
      estimatedCostEur: 140,
      isSevereAdjusted: false,
      explanation: "Calcul prédictif d'après votre rythme annuel.",
    },
    {
      category: "AIR_FILTER",
      title: "Remplacement du filtre à air moteur",
      dueMileage: 280000,
      projectedDueDate: "2027-03-20",
      triggerType: "TIME_TRIGGER",
      remainingKm: 7552,
      remainingDays: 209,
      urgency: "OK",
      estimatedCostEur: 50,
      isSevereAdjusted: false,
      explanation: "Calcul prédictif d'après votre rythme annuel.",
    },
    {
      category: "DRAIN_OIL",
      title: "Révision annuelle & Vidange huile",
      dueMileage: 292448,
      projectedDueDate: "2027-08-18",
      triggerType: "TIME_TRIGGER",
      remainingKm: 19998,
      remainingDays: 358,
      urgency: "OK",
      estimatedCostEur: 180,
      isSevereAdjusted: false,
      explanation: "Calcul prédictif d'après votre rythme annuel.",
    },
  ];

  const bundles = bundleMaintenanceAppointments(
    espaceMilestones,
    {
      make: "Renault",
      model: "Espace V",
      licensePlate: "FX-563-KZ",
      currentMileage: 272448,
    },
    { toleranceDays: 90, toleranceKm: 3000 }
  );

  // Vérification : Les 2 opérations de mars 2027 doivent être regroupées en 1 SEUL Pack Atelier
  assert(bundles.length === 2, `On attend 2 packs atelier au lieu de 3 visites distinctes (obtenu : ${bundles.length})`);
  
  const marchBundle = bundles[0];
  assert(marchBundle.milestones.length === 2, `Le pack de mars doit contenir 2 opérations (obtenu : ${marchBundle.milestones.length})`);
  assert(marchBundle.recommendedDate === "2027-03-15", `La date recommandée doit être le 15/03/2027 (obtenu : ${marchBundle.recommendedDate})`);
  assert(marchBundle.estimatedLaborSavingsEur > 0, `Une économie de main d'oeuvre groupée doit être calculée (> 0)`);
  assert(marchBundle.garagePhoneScript.includes("FX-563-KZ"), `Le script d'appel doit inclure l'immatriculation`);

  console.log("  ✔ Regroupement Espace V validé (2 visites au lieu de 3, économie MO calculée).");

  // CAS 2 : Suzuki Vitara avec 6 opérations en retard
  const vitaraMilestones: ProjectedMilestone[] = [
    {
      category: "DRAIN_OIL",
      title: "Vidange 0W20",
      dueMileage: 125789,
      projectedDueDate: "2026-08-22",
      triggerType: "TIME_TRIGGER",
      remainingKm: 0,
      remainingDays: -2,
      urgency: "OVERDUE",
      estimatedCostEur: 140,
      isSevereAdjusted: false,
      explanation: "Calcul prédictif d'après votre rythme annuel.",
    },
    {
      category: "SPARK_PLUGS",
      title: "Bougies d'allumage",
      dueMileage: 120000,
      projectedDueDate: "2024-05-24",
      triggerType: "MILEAGE_TRIGGER",
      remainingKm: -5789,
      remainingDays: -800,
      urgency: "CRITICAL",
      estimatedCostEur: 120,
      isSevereAdjusted: false,
      explanation: "Calcul prédictif d'après votre rythme annuel.",
    },
    {
      category: "ACCESSORY_BELT",
      title: "Courroie accessoires",
      dueMileage: 120000,
      projectedDueDate: "2022-05-24",
      triggerType: "TIME_TRIGGER",
      remainingKm: -5789,
      remainingDays: -1500,
      urgency: "CRITICAL",
      estimatedCostEur: 160,
      isSevereAdjusted: false,
      explanation: "Calcul prédictif d'après votre rythme annuel.",
    },
  ];

  const vitaraBundles = bundleMaintenanceAppointments(
    vitaraMilestones,
    {
      make: "Suzuki",
      model: "Vitara",
      licensePlate: "EC-301-JX",
      currentMileage: 125789,
    }
  );

  assert(vitaraBundles.length === 1, `Les 3 urgences doivent être groupées en 1 seul pack d'urgence`);
  assert(vitaraBundles[0].urgency === "CRITICAL", `L'urgence du pack doit être CRITICAL`);
  assert(vitaraBundles[0].milestones.length === 3, `Le pack doit contenir les 3 opérations`);

  console.log("  ✔ Pack d'urgence groupé Suzuki Vitara validé (1 seul RDV d'urgence pour 3 opérations).");

  // CAS 3 : Test de l'interdiction stricte des Dimanches & Samedis pour les RDV d'atelier
  const sundayMilestone: ProjectedMilestone[] = [
    {
      category: "DRAIN_OIL",
      title: "Vidange d'entretien",
      dueMileage: 300000,
      projectedDueDate: "2027-08-22", // 22 Août 2027 est un DIMANCHE
      triggerType: "TIME_TRIGGER",
      remainingKm: 15000,
      remainingDays: 362,
      urgency: "OK",
      estimatedCostEur: 150,
      isSevereAdjusted: false,
      explanation: "Calcul prédictif.",
    },
  ];

  const sundayBundle = bundleMaintenanceAppointments(
    sundayMilestone,
    { make: "Renault", model: "Espace V", licensePlate: "FX-563-KZ", currentMileage: 272448 }
  );

  assert(
    sundayBundle[0].recommendedDate === "2027-08-23",
    `Une date tombant le Dimanche 22/08/2027 doit être automatiquement décalée au Lundi ouvré 23/08/2027 (obtenu : ${sundayBundle[0].recommendedDate})`
  );

  console.log("  ✔ Règle métier 'Zéro RDV le Dimanche' validée (22/08/2027 Dimanche décalé au 23/08/2027 Lundi).");
}
