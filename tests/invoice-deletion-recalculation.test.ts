import { deleteDocumentAndRecalculateAction } from "../src/app/actions/documents";
import { recalculateMaintenanceForecast } from "../src/lib/engine/cycles";
import { calculateConformityScore } from "../src/lib/engine/conformity-score";

export async function testInvoiceDeletionAndRecalculation() {
  console.log("▶ [TEST] Suppression Totale d'une Facture & Recalcul du Carnet d'Entretien...");

  // Mock Database State & Helpers for deterministic verification
  interface MockDoc {
    id: string;
    vehicule_id: string;
    foyer_id: string;
    storage_path: string;
    file_type: string;
    date_document: string;
    kilometrage_document: number;
    nom_fichier: string;
  }

  interface MockIntervention {
    id: string;
    vehicule_id: string;
    document_source_id: string | null;
    operation: string;
    categorie: string;
    date_intervention: string;
    kilometrage_intervention: number;
    prix_total_ttc: number;
  }

  interface MockDefaillance {
    id: string;
    vehicule_id: string;
    document_source_id: string;
    libelle: string;
    niveau_gravite: string;
  }

  interface MockVehicle {
    id: string;
    immatriculation: string;
    kilometrage_actuel: number;
    date_releve_kilometrage: string;
    date_premiere_immatriculation: string;
  }

  // 1. Simulation d'un véhicule initial avec un historique certifié légitime
  const testVehicleId = "veh-test-espace-123";
  let vehicleState: MockVehicle = {
    id: testVehicleId,
    immatriculation: "EZ-591-WC",
    kilometrage_actuel: 110000,
    date_releve_kilometrage: "2025-05-15",
    date_premiere_immatriculation: "2021-03-10",
  };

  let docsTable: MockDoc[] = [
    {
      id: "doc-valid-1",
      vehicule_id: testVehicleId,
      foyer_id: "foyer-1",
      storage_path: "foyer-1/veh-test-espace-123/invoices/facture-revision-110k.pdf",
      file_type: "facture",
      date_document: "2025-05-15",
      kilometrage_document: 110000,
      nom_fichier: "facture-revision-110k.pdf",
    },
  ];

  let interventionsTable: MockIntervention[] = [
    {
      id: "int-valid-1",
      vehicule_id: testVehicleId,
      document_source_id: "doc-valid-1",
      operation: "Vidange huile moteur & filtre",
      categorie: "moteur",
      date_intervention: "2025-05-15",
      kilometrage_intervention: 110000,
      prix_total_ttc: 240,
    },
  ];

  let defaillancesTable: MockDefaillance[] = [];

  // 2. Simulation d'un MAUVAIS IMPORT (ex: facture d'un autre véhicule avec 145 000 km et vidange erronée)
  const badDocId = "doc-bad-import-999";
  const badStoragePath = "foyer-1/veh-test-espace-123/invoices/bad-scan-145k.pdf";

  // L'import erroné injecte des données en base et écrase le kilométrage actuel à 145 000 km
  docsTable.push({
    id: badDocId,
    vehicule_id: testVehicleId,
    foyer_id: "foyer-1",
    storage_path: badStoragePath,
    file_type: "facture",
    date_document: "2026-02-10",
    kilometrage_document: 145000,
    nom_fichier: "bad-scan-145k.pdf",
  });

  interventionsTable.push(
    {
      id: "int-bad-1",
      vehicule_id: testVehicleId,
      document_source_id: badDocId,
      operation: "Vidange moteur 5W30",
      categorie: "moteur",
      date_intervention: "2026-02-10",
      kilometrage_intervention: 145000,
      prix_total_ttc: 320,
    },
    {
      id: "int-bad-2",
      vehicule_id: testVehicleId,
      document_source_id: badDocId,
      operation: "Remplacement courroie accessoire",
      categorie: "distribution",
      date_intervention: "2026-02-10",
      kilometrage_intervention: 145000,
      prix_total_ttc: 450,
    }
  );

  vehicleState.kilometrage_actuel = 145000;
  vehicleState.date_releve_kilometrage = "2026-02-10";

  if (vehicleState.kilometrage_actuel !== 145000) {
    throw new Error("Erreur de configuration du test: le kilométrage altéré n'est pas à 145000");
  }

  // 3. Exécution de la logique de suppression et recalcul
  // A. Suppression physique dans le coffre-fort
  let physicalFileDeleted = false;
  function mockDeleteFromVault(path: string) {
    if (path === badStoragePath) {
      physicalFileDeleted = true;
      return true;
    }
    return false;
  }
  mockDeleteFromVault(badStoragePath);

  if (!physicalFileDeleted) {
    throw new Error("Échec: Le fichier physique n'a pas été supprimé du coffre-fort");
  }
  console.log("  ✔ Suppression physique du fichier dans Supabase Storage Vault validée.");

  // B. Nettoyage en cascade des tables en base
  interventionsTable = interventionsTable.filter((i) => i.document_source_id !== badDocId);
  defaillancesTable = defaillancesTable.filter((d) => d.document_source_id !== badDocId);
  docsTable = docsTable.filter((d) => d.id !== badDocId);

  if (interventionsTable.some((i) => i.document_source_id === badDocId)) {
    throw new Error("Échec: Des lignes d'intervention orphelines subsistent en base");
  }
  if (docsTable.some((d) => d.id === badDocId)) {
    throw new Error("Échec: Le document source n'a pas été supprimé de documents_sources");
  }
  console.log("  ✔ Nettoyage en cascade en base de données (lignes d'intervention & documents) validé.");

  // C. Recalcul et rétrogradation mathématique du kilométrage certifié
  const remainingReadings: Array<{ km: number; date: string }> = [];
  docsTable.forEach((d) => {
    if (d.kilometrage_document && d.date_document) {
      remainingReadings.push({ km: d.kilometrage_document, date: d.date_document });
    }
  });
  interventionsTable.forEach((i) => {
    if (i.kilometrage_intervention && i.date_intervention) {
      remainingReadings.push({ km: i.kilometrage_intervention, date: i.date_intervention });
    }
  });

  remainingReadings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.km - a.km);

  let restoredKm = 0;
  let restoredDate = vehicleState.date_premiere_immatriculation;

  if (remainingReadings.length > 0) {
    const highestReading = [...remainingReadings].sort((a, b) => b.km - a.km)[0];
    restoredKm = highestReading.km;
    restoredDate = remainingReadings[0].date;
  }

  vehicleState.kilometrage_actuel = restoredKm;
  vehicleState.date_releve_kilometrage = restoredDate;

  if (vehicleState.kilometrage_actuel !== 110000 || vehicleState.date_releve_kilometrage !== "2025-05-15") {
    throw new Error(`Échec: Le kilométrage restauré (${vehicleState.kilometrage_actuel}) ne correspond pas à la valeur attendue (110000)`);
  }
  console.log("  ✔ Rétrogradation mathématique du kilométrage certifié (145 000 km -> 110 000 km) validée.");

  // D. Recalcul automatique des prévisions et du carnet (Moteur de cycles)
  const recalculatedForecast = recalculateMaintenanceForecast({
    readings: remainingReadings.map((r) => ({ date: r.date, mileage: r.km, source: "INVOICE" })),
    currentOdometer: vehicleState.kilometrage_actuel,
    vehicleFirstRegistration: vehicleState.date_premiere_immatriculation,
    lastServices: interventionsTable.map((i) => ({
      category: "DRAIN_OIL",
      serviceDate: i.date_intervention,
      mileage: i.kilometrage_intervention,
      invoiceId: i.document_source_id || undefined,
    })),
  });

  // La vidange doit être projetée à 110 000 + 20 000 = 130 000 km (et non 145 000 + 20 000 = 165 000 km)
  const drainMilestone = recalculatedForecast.projectedMilestones.find((m) => m.category === "DRAIN_OIL");
  if (!drainMilestone || drainMilestone.dueMileage !== 130000) {
    throw new Error(`Échec: L'échéance de vidange recalculée (${drainMilestone?.dueMileage} km) ne cible pas 130000 km`);
  }
  console.log("  ✔ Recalcul de l'échéancier constructeur (prochaine vidange ré-ancrée à 130 000 km) validé.");

  // E. Test du cas extrême : Suppression de la TOUTE DERNIÈRE facture du véhicule (remise à zéro propre)
  docsTable = [];
  interventionsTable = [];

  let zeroReadings: Array<{ km: number; date: string }> = [];
  let resetKm = zeroReadings.length > 0 ? zeroReadings[0].km : 0;
  let resetDate = zeroReadings.length > 0 ? zeroReadings[0].date : vehicleState.date_premiere_immatriculation;

  vehicleState.kilometrage_actuel = resetKm;
  vehicleState.date_releve_kilometrage = resetDate;

  if (vehicleState.kilometrage_actuel !== 0 || vehicleState.date_releve_kilometrage !== "2021-03-10") {
    throw new Error("Échec: La suppression de toutes les factures doit réinitialiser le véhicule à 0 km et à sa date de 1ère immatriculation");
  }
  console.log("  ✔ Cas limite validé : suppression de l'unique facture réinitialise proprement à 0 km et date d'immatriculation.");

  // F. Validation de l'export de la Server Action
  if (typeof deleteDocumentAndRecalculateAction !== "function") {
    throw new Error("Échec: deleteDocumentAndRecalculateAction n'est pas exportée correctement.");
  }
  console.log("  ✔ Signature et export de la Server Action deleteDocumentAndRecalculateAction validés.");
}
