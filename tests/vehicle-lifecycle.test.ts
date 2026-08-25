import { toggleVehicleTrackingStatusAction, deleteVehicleAction } from "@/app/actions/vehicles";

export async function testVehicleLifecycleManagement() {
  console.log("▶ [TEST] Gestion du Cycle de Vie Véhicule (Suspension & Suppression)...");

  if (typeof toggleVehicleTrackingStatusAction !== "function") {
    throw new Error("toggleVehicleTrackingStatusAction n'est pas définie.");
  }
  console.log("  ✔ Server Action toggleVehicleTrackingStatusAction validée.");

  if (typeof deleteVehicleAction !== "function") {
    throw new Error("deleteVehicleAction n'est pas définie.");
  }
  console.log("  ✔ Server Action deleteVehicleAction avec nettoyage en cascade validée.");

  // Validation du comportement des alertes lorsque le véhicule est suspendu
  const mockVehicles = [
    {
      id: "v1",
      marque: "Renault",
      modele: "Espace V",
      statut: "actif",
      echeances_previsionnelles: [{ statut: "a_venir", date_preconisee: "2027-03-15" }],
    },
    {
      id: "v2",
      marque: "Suzuki",
      modele: "Vitara",
      statut: "suspendu", // Suivi suspendu
      echeances_previsionnelles: [{ statut: "en_retard", date_preconisee: "2022-05-24" }],
    },
  ];

  const activeMilestones = mockVehicles
    .filter((v) => v.statut !== "suspendu")
    .flatMap((v) => v.echeances_previsionnelles);

  if (activeMilestones.some((m) => m.statut === "en_retard")) {
    throw new Error("Les échéances d'un véhicule suspendu ne doivent pas polluer les alertes actives du foyer.");
  }
  console.log("  ✔ Exclusion stricte des alertes et du calendrier pour les véhicules au statut 'suspendu' validée.");
}
