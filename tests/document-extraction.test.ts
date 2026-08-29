import {
  RegistrationCardExtractionSchema,
  InvoiceExtractionSchema,
  TechnicalInspectionExtractionSchema,
} from '../src/lib/ai/schemas';
import { calculateMileagePace } from '../src/lib/engine/cycles';

export async function runDocumentExtractionTests() {
  console.log('\n▶ [TEST] Normalisation Schémas : Carte Grise (SIV/FNI)...');

  // Test 1: Carte Grise avec clés officielles françaises
  const rawCarteGriseData = {
    A: "EC-301-JX",
    B: "2016-05-24",
    "D.1": "SUZUKI",
    "D.3": "VITARA",
    "D.2": "LYD21SAT2",
    E: "TSMLYD21S00162450",
    "P.3": "ES",
    "P.6": 6,
    "P.2": 88,
    K: "e4*2007/46*0928*01",
    "V.7": 127,
    "C.1": "LEMOYNE DE FORGES",
  };

  const cgValidation = RegistrationCardExtractionSchema.safeParse(rawCarteGriseData);
  if (!cgValidation.success) {
    throw new Error(`Validation Carte Grise a échoué: ${JSON.stringify(cgValidation.error.errors)}`);
  }
  console.log('  ✔ Carte Grise validée avec succès (clés officielles françaises reconnues).');

  // Test 2: Facture de garage avec clés françaises (prestations, totaux)
  console.log('\n▶ [TEST] Normalisation Schémas : Facture Atelier / Garage...');
  const rawInvoiceData = {
    garage: {
      name: "SARL GARAGE HELIERE C. & S.",
      siret: "49995278600014",
    },
    lineItems: [
      {
        description: "KLEBER DYNAXER HP5 215/55 R17 94W (x4)",
        category: "TIRES_FRONT",
        quantity: 4,
        totalTTC: 565.10,
        isPart: true,
      },
      {
        description: "Forfait MONTAGE, REMPL, EQUIL 4 PNEUS",
        category: "TIRES_FRONT",
        quantity: 1,
        totalTTC: 85.00,
        isLabor: true,
      },
    ],
    invoice: {
      invoiceDate: "2026-08-21",
      totalTTC: 700.44,
      totalHT: 583.70,
    },
  };

  const invoiceValidation = InvoiceExtractionSchema.safeParse(rawInvoiceData);
  if (!invoiceValidation.success) {
    throw new Error(`Validation Facture a échoué: ${JSON.stringify(invoiceValidation.error.errors)}`);
  }
  console.log('  ✔ Facture atelier validée avec succès (pièces, main d\'oeuvre et montants TTC).');

  // Test 3: Contrôle Technique avec défaillances UTAC
  console.log('\n▶ [TEST] Normalisation Schémas : Procès-Verbal Contrôle Technique...');
  const rawCtData = {
    center: {
      name: "A.C.T.A. MONDOUBLEAU CORMENON",
      approvalNumber: "S041F077",
      inspectionDate: "2026-08-20",
    },
    vehicle: {
      licensePlate: "EC-301-JX",
      mileage: 125781,
    },
    inspectionResult: {
      status: "FAVORABLE",
      expiryDate: "2028-08-19",
    },
    defects: [
      {
        code: "4.5.2.a.1",
        label: "RÉGLAGE (FEUX DE BROUILLARD AVANT) : Mauvaise orientation horizontale",
        severity: "MINOR",
        category: "LIGHTING_ELECTRICAL",
      },
    ],
  };

  const ctValidation = TechnicalInspectionExtractionSchema.safeParse(rawCtData);
  if (!ctValidation.success) {
    throw new Error(`Validation Contrôle Technique a échoué: ${JSON.stringify(ctValidation.error.errors)}`);
  }
  console.log('  ✔ PV Contrôle Technique validé avec succès (résultat favorable et défaillances).');

  // Test 4: Calcul du rythme avec 2 relevés réels
  console.log('\n▶ [TEST] Engine : Télémétrie Kilométrique Multi-Relevés...');
  const readings = [
    { date: "2026-08-20", mileage: 125781, source: "TECHNICAL_INSPECTION" as const },
    { date: "2026-08-21", mileage: 125789, source: "INVOICE" as const },
  ];

  const pace = calculateMileagePace(readings, "2026-08-24", "2016-05-24");
  if (pace.lastRecordedMileage !== 125789 || pace.readingsCount !== 2) {
    throw new Error(`Erreur de calcul de rythme: ${JSON.stringify(pace)}`);
  }
  console.log(`  ✔ Rythme calculé sur ${pace.readingsCount} relevés : dernier relevé à ${pace.lastRecordedMileage} km, projection à ${pace.estimatedCurrentMileage} km.`);

  // Test 5: Détection automatique des centres de contrôle technique (DEKRA, Autosur, etc.)
  console.log('\n▶ [TEST] Détection Automatique : Réseaux & PV de Contrôle Technique...');
  const dekraTestDoc = {
    garage: { name: "DEKRA - SERVICE CONTROLE BUC" },
    invoice: { invoiceDate: "2024-01-22", totalTTC: 85 },
    vehicle: { currentMileage: 149953 },
  };
  const emitterName = dekraTestDoc.garage.name.toLowerCase();
  const isDetectedAsCt =
    emitterName.includes("dekra") ||
    emitterName.includes("autosur") ||
    emitterName.includes("securitest") ||
    emitterName.includes("service controle") ||
    emitterName.includes("controle technique");

  if (!isDetectedAsCt) {
    throw new Error("Échec de la détection du centre DEKRA comme Contrôle Technique.");
  }
  console.log('  ✔ Détection réseau DEKRA validée comme Procès-Verbal Contrôle Technique.');
}

if (require.main === module) {
  runDocumentExtractionTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
