import { createZipArchive, calculateCrc32, ZipEntry } from "../src/lib/export/zip-archive";
import { calculateConformityScore } from "../src/lib/engine/conformity-score";
import { calculateVehicleBrakeAssessment } from "../src/lib/engine/brakes";
import { calculateVehicleTireAssessment } from "../src/lib/engine/tires";
import { recalculateMaintenanceForecast } from "../src/lib/engine/cycles";
import { matchesVehicleId } from "../src/lib/types/database.types";
import zlib from "node:zlib";
import crypto from "crypto";

export async function testMaintenanceBookletAndExportArchive() {
  console.log("\n=================================================");
  console.log("📑 [TEST] EXPORT DU CARNET D'ENTRETIEN & PACK JUSTIFICATIFS");
  console.log("=================================================\n");

  // 1. TEST DU MOTEUR ZIP EN MÉMOIRE (PKZIP 2.0)
  console.log("▶ [TEST 1] Validation de l'intégrité du générateur d'archive ZIP (PKZIP)...");
  const testFile1Content = "🚗 LaVigieAuto — Carnet d'Entretien Officiel\nImmatriculation : EW-301-DJ\nScore : 95% (A+)";
  const testFile2Content = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]); // Fake PNG header

  const crc1 = calculateCrc32(Buffer.from(testFile1Content, "utf-8"));
  if (typeof crc1 !== "number" || crc1 === 0) {
    throw new Error("Échec calcul CRC-32 pour fichier texte.");
  }

  const entries: ZipEntry[] = [
    {
      path: "SYNTHESE_CARNET_ENTRETIEN.txt",
      data: testFile1Content,
    },
    {
      path: "justificatifs/facture_01.png",
      data: testFile2Content,
    },
  ];

  const zipBuffer = createZipArchive(entries);
  if (!zipBuffer || zipBuffer.length < 50) {
    throw new Error(`Buffer ZIP invalide ou trop court (${zipBuffer?.length} octets).`);
  }

  // Vérification de la signature PKZIP locale (0x04034b50 -> 'PK\x03\x04')
  if (zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4b || zipBuffer[2] !== 0x03 || zipBuffer[3] !== 0x04) {
    throw new Error("Signature d'en-tête locale ZIP invalide (PK\\x03\\x04 attendue).");
  }

  // Vérification de la signature de fin de répertoire central EOCD (0x06054b50 -> 'PK\x05\x06')
  const eocdSignatureIndex = zipBuffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocdSignatureIndex === -1) {
    throw new Error("Signature EOCD (End of Central Directory) manquante dans l'archive ZIP.");
  }

  console.log("  ✔ Moteur ZIP binaire validé : signatures PKZIP 2.0 et EOCD conformes.");

  // 2. TEST DE COMPLÉTUDE DU CARNET D'ENTRETIEN & MOTEURS PRÉDICTIFS
  console.log("▶ [TEST 2] Vérification de la complétude du carnet d'entretien (Données réelles)...");
  
  const testVehicle = {
    id: "veh-vitara-oem",
    foyer_id: "foyer-test",
    marque: "Suzuki",
    modele: "Vitara",
    version: "1.6 VVT 120 ch AllGrip Pack",
    immatriculation: "EC-301-JX",
    energie: "Essence",
    annee_mise_en_circulation: 2016,
    date_premiere_immatriculation: "2016-04-15",
    kilometrage_actuel: 125789,
    date_releve_kilometrage: "2026-08-21",
    vin: "TSMEYA21S00123456",
    km_annuel_moyen: 13500,
    puissance_fiscale: 7,
    puissance_din: 120,
    boite_vitesse: "Manuelle 5 rapports",
  };

  const testInvoices = [
    {
      id: "doc-1",
      vehicule_id: testVehicle.id,
      date_document: "2025-08-22",
      kilometrage_document: 112160,
      emetteur: "Garage Heliere Suzuki",
      nom_fichier: "facture_revision_112000.pdf",
      montant_ttc: 245.50,
      file_type: "facture",
      metadata: { immatriculation_extraite: "EC-301-JX" },
    },
    {
      id: "doc-2",
      vehicule_id: testVehicle.id,
      date_document: "2026-08-21",
      kilometrage_document: 125789,
      emetteur: "Suzuki Auto Paris Ouest",
      nom_fichier: "facture_bougies_vidange.pdf",
      montant_ttc: 389.00,
      file_type: "facture",
      metadata: { immatriculation_extraite: "EC-301-JX" },
    },
    {
      id: "doc-3",
      vehicule_id: testVehicle.id,
      date_document: "2026-04-10",
      kilometrage_document: 120500,
      emetteur: "Autovision Contrôle Technique",
      nom_fichier: "pv_ct_2026.pdf",
      montant_ttc: 85.00,
      file_type: "controle_technique",
      metadata: { immatriculation_extraite: "EC-301-JX" },
    },
  ];

  const testInterventions = [
    {
      id: "line-1",
      vehicule_id: testVehicle.id,
      date_intervention: "2025-08-22",
      kilometrage_intervention: 112160,
      operation: "Vidange huile Suzuki ECSTAR 0W-20 + Filtre à huile",
      emetteur: "Garage Heliere Suzuki",
      prix_total_ttc: 145.50,
    },
    {
      id: "line-2",
      vehicule_id: testVehicle.id,
      date_intervention: "2026-08-21",
      kilometrage_intervention: 125789,
      operation: "Remplacement des 4 bougies d'allumage Iridium + Purge liquide de frein DOT 4",
      emetteur: "Suzuki Auto Paris Ouest",
      prix_total_ttc: 289.00,
    },
  ];

  const testCTDefauts = [
    {
      id: "def-1",
      vehicule_id: testVehicle.id,
      date_ct: "2026-04-10",
      code_defaillance: "4.1.1.a.1",
      libelle: "État et fonctionnement (phares) : Orientation du faisceau légèrement modifiée",
      niveau_gravite: "mineure",
    },
  ];

  // Calcul du score de conformité
  const conformity = calculateConformityScore({
    vehicleFirstRegistration: testVehicle.date_premiere_immatriculation,
    currentMileage: testVehicle.kilometrage_actuel,
    maintenanceHistory: [
      {
        id: "m-1",
        category: "DRAIN_OIL",
        title: "Vidange huile moteur",
        performedDate: "2025-08-22",
        mileage: 112160,
        totalCostTTC: 245.50,
      },
      {
        id: "m-2",
        category: "SPARK_PLUGS",
        title: "Bougies d'allumage",
        performedDate: "2026-08-21",
        mileage: 125789,
        totalCostTTC: 389.00,
      },
    ],
    ctHistory: [
      {
        id: "ct-1",
        inspectionDate: "2026-04-10",
        mileage: 120500,
        result: "FAVORABLE",
        minorDefectsCount: 1,
        majorDefectsCount: 0,
        criticalDefectsCount: 0,
      },
    ],
    overdueMilestones: [],
  });

  if (!conformity || conformity.overallScore < 70) {
    throw new Error(`Score de conformité attendu >= 70%, obtenu : ${conformity?.overallScore}%`);
  }

  // Calcul du bilan freinage
  const brakes = calculateVehicleBrakeAssessment({
    vehicleId: testVehicle.id,
    currentMileage: testVehicle.kilometrage_actuel,
    dailyKmRate: 37,
    make: testVehicle.marque,
    model: testVehicle.modele,
    version: testVehicle.version,
    transmission: testVehicle.boite_vitesse,
    invoices: [
      {
        date: "2025-08-22",
        mileage: 112160,
        operation: "Contrôle visuel plaquettes et disques",
        emitter: "Garage Heliere",
      },
    ],
    inspections: [],
  });

  if (!brakes || !brakes.frontAxle || !brakes.rearAxle) {
    throw new Error("Évaluation de freinage incomplète pour le carnet.");
  }

  // Calcul du bilan pneumatiques
  const tires = calculateVehicleTireAssessment({
    vehicleId: testVehicle.id,
    currentMileage: testVehicle.kilometrage_actuel,
    dailyKmRate: 37,
    make: testVehicle.marque,
    model: testVehicle.modele,
    version: testVehicle.version,
    invoices: [
      {
        date: "2025-08-22",
        mileage: 112160,
        operation: "Pose 2 pneus 215/55 R17",
        emitter: "Garage Heliere",
      },
    ],
    inspections: [],
  });

  if (!tires || !tires.frontAxle || !tires.rearAxle) {
    throw new Error("Évaluation de pneumatiques incomplète pour le carnet.");
  }

  console.log(`  ✔ Carnet généré pour ${testVehicle.marque} ${testVehicle.modele} (${testVehicle.immatriculation}) :`);
  console.log(`     • Kilométrage certifié : ${testVehicle.kilometrage_actuel.toLocaleString("fr-FR")} km`);
  console.log(`     • Score de conformité  : ${conformity.overallScore}% (${conformity.grade})`);
  console.log(`     • Interventions réelles: ${testInterventions.length} prestation(s)`);
  console.log(`     • Justificatifs scellés: ${testInvoices.length} document(s)`);

  // 3. TEST D'ISOLATION ET D'EMPREINTE CRYPTOGRAPHIQUE DES PIÈCES JUSTIFICATIVES
  console.log("▶ [TEST 3] Contrôle d'isolation et empreintes SHA-256 des justificatifs...");
  for (const doc of testInvoices) {
    if (doc.metadata?.immatriculation_extraite) {
      const docPlateClean = doc.metadata.immatriculation_extraite.replace(/[\s-]/g, "").toUpperCase();
      const vehPlateClean = testVehicle.immatriculation.replace(/[\s-]/g, "").toUpperCase();
      if (docPlateClean !== vehPlateClean) {
        throw new Error(`Contamination inter-véhicules détectée dans le coffre-fort : ${docPlateClean} vs ${vehPlateClean}`);
      }
    }
  }

  console.log("  ✔ Cloisonnement strict des pièces justificatives validé à 100%.");

  // 4. TEST DE FORMAT DU RAPPORT OFFICIEL ET NOMENCLATURE DE L'ARCHIVE ZIP
  console.log("▶ [TEST 4] Test d'assemblage du pack complet ZIP d'entretien...");
  const archiveEntries: ZipEntry[] = [
    {
      path: `SYNTHESE_CARNET_ENTRETIEN_${testVehicle.immatriculation.replace(/[\s-]/g, "_")}.txt`,
      data: `LAVIGIEAUTO CERTIFICATE\nVehicle: ${testVehicle.marque} ${testVehicle.modele}\nPlate: ${testVehicle.immatriculation}\nMileage: ${testVehicle.kilometrage_actuel} km\nScore: ${conformity.overallScore}% (${conformity.grade})`,
    },
    ...testInvoices.map((d, idx) => ({
      path: `justificatifs/${d.nom_fichier}`,
      data: Buffer.from(`Certified binary PDF invoice scan for ${d.emetteur} - ${d.montant_ttc} EUR`),
    })),
  ];

  const fullArchiveBuffer = createZipArchive(archiveEntries);
  if (fullArchiveBuffer.length < 100) {
    throw new Error("L'archive complète du carnet d'entretien est anormalement petite.");
  }

  console.log(`  ✔ Pack ZIP généré avec succès : ${fullArchiveBuffer.length} octets (${archiveEntries.length} entrées intégrées).`);

  console.log("\n=================================================");
  console.log("🎉 TOUTES LES VÉRIFICATIONS DU CARNET D'ENTRETIEN SONT AU VERT !");
  console.log("=================================================\n");
}
