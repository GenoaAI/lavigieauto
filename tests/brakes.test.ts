import { calculateVehicleBrakeAssessment, extractBrakeWearMeasurements } from '../src/lib/engine/brakes';

export function testBrakePredictiveEngine() {
  console.log('\n▶ [TEST] Engine : Moteur Prédictif du Freinage (Plaquettes & Disques)...');

  // 1. Test extraction des mesures atelier
  const text1 = "REVISION VEHICULE REMPLACEMENT FILTRE A HUILE CTRL PLAQUETTES AV 80% D'USURE CTRL PLAQUETTES AR 80% D'USUR";
  const extracted = extractBrakeWearMeasurements(text1);
  if (extracted.frontWearPercent !== 80 || extracted.rearWearPercent !== 80) {
    throw new Error('Échec extraction mesures usure plaquettes: ' + JSON.stringify(extracted));
  }
  console.log('  ✔ Extraction des pourcentages d\'usure atelier validée (80% AV / 80% AR).');

  // 2. Test cas réel Renault Espace V (272 448 km avec mesure d'usure à 80%)
  const espaceAssessment = calculateVehicleBrakeAssessment({
    vehicleId: 'espace-v-test',
    currentMileage: 272448,
    dailyKmRate: 45,
    make: 'Renault',
    model: 'Espace V',
    transmission: 'automatique',
    invoices: [
      {
        date: '2026-08-18',
        mileage: 272448,
        operation: text1,
        emitter: 'SARL Garage Hélière C. & S.',
      },
    ],
  });

  if (espaceAssessment.frontAxle.wearPercentage < 80) {
    throw new Error('Usure plaquettes avant Espace sous-évaluée: ' + espaceAssessment.frontAxle.wearPercentage);
  }
  if (espaceAssessment.frontAxle.sourceType !== 'WORKSHOP_MEASUREMENT') {
    throw new Error('Type de source non reconnu comme WORKSHOP_MEASUREMENT');
  }
  if (!espaceAssessment.urgentActionNeeded) {
    throw new Error('Alerte urgente non déclenchée pour 80% d\'usure');
  }
  if (espaceAssessment.frontAxle.discsCondition !== 'REPLACE_WITH_NEXT_PADS') {
    throw new Error('Remplacement combiné disques non conseillé pour 80% d\'usure');
  }
  console.log('  ✔ Cas réel Renault Espace V validé (80% usure, statut urgent, remplacement combiné conseillé).');

  // 3. Test cas réel Suzuki Vitara (125 789 km, CT vierge)
  const vitaraAssessment = calculateVehicleBrakeAssessment({
    vehicleId: 'vitara-test',
    currentMileage: 125789,
    dailyKmRate: 25,
    make: 'Suzuki',
    model: 'Vitara',
    transmission: 'manuelle',
    invoices: [
      {
        date: '2026-08-26',
        mileage: 125781,
        operation: 'FORFAIT LIQUIDE DE FREIN',
        emitter: 'SARL Garage Hélière C. & S.',
      },
      {
        date: '2025-08-22',
        mileage: 112160,
        operation: 'CONTROLE FREINS + CONTROLE ECLAIRAGE',
        emitter: 'Vibraye Automobile',
      },
    ],
    inspections: [
      {
        date: '2026-08-20',
        mileage: 125781,
        isFavorable: true,
        defects: [],
      },
    ],
  });

  if (vitaraAssessment.frontAxle.remainingLiningThicknessMm < 2.0) {
    throw new Error('Épaisseur résiduelle Vitara sous la cote légale: ' + vitaraAssessment.frontAxle.remainingLiningThicknessMm);
  }
  console.log('  ✔ Cas réel Suzuki Vitara validé (Épaisseur conforme, suivi régulier).');

  // 4. Test défaillance critique CT (1.1.13.a.1)
  const criticalAssessment = calculateVehicleBrakeAssessment({
    vehicleId: 'critical-test',
    currentMileage: 85000,
    dailyKmRate: 30,
    invoices: [],
    inspections: [
      {
        date: '2026-08-01',
        mileage: 85000,
        isFavorable: false,
        defects: [
          {
            code: '1.1.13.a.1',
            description: 'Garnitures ou plaquettes usées au témoin',
          },
        ],
      },
    ],
  });

  if (criticalAssessment.frontAxle.status !== 'CRITICAL') {
    throw new Error('Statut critique non déclenché lors du code CT 1.1.13.a.1');
  }
  console.log('  ✔ Détection de défaillance critique CT 1.1.13.a.1 validée.');
}

if (require.main === module) {
  try {
    testBrakePredictiveEngine();
    console.log('\n🎉 TOUS LES TESTS DU MOTEUR FREINAGE SONT AU VERT !');
  } catch (err: any) {
    console.error(err);
    process.exit(1);
  }
}
