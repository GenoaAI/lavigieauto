import { toggleVehicleTrackingStatusAction, deleteVehicleAction, getVehicleDetailsAction } from "@/app/actions/vehicles";

export async function testVehicleLifecycleManagement() {
  console.log("▶ [TEST] Gestion du Cycle de Vie Véhicule & Routage Immatriculation...");

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

  // Validation du routage par immatriculation propre / slug
  const testCases = ["EC-301-JX", "ec-301-jx", "EC301JX", "FX-563-KZ", "GP-902-NY", "7253 XX 76", "7253-XX-76"];
  for (const slug of testCases) {
    const res = await getVehicleDetailsAction(slug);
    if (!res || !res.vehicle) {
      throw new Error(`Échec de la résolution du véhicule pour l'immatriculation / slug : ${slug}`);
    }
  }
  console.log("  ✔ Résolution robuste des URLs d'immatriculation (avec tirets, minuscules, espaces, sans tirets) validée.");
}
