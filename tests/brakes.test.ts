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

  // 2.bis Test cas réel Renault Espace V après nouvelle facture de remplacement plaquettes et disques (278 543 km)
  const espaceReplacedAssessment = calculateVehicleBrakeAssessment({
    vehicleId: 'espace-v-test',
    currentMileage: 278543,
    dailyKmRate: 45,
    make: 'Renault',
    model: 'Espace V',
    transmission: 'automatique',
    invoices: [
      {
        date: '2026-09-23',
        mileage: 278543,
        operation: 'REMPLACEMENT X2 DISQUE DE FREIN AVANT',
        emitter: 'SARL Garage Hélière C. & S.',
      },
      {
        date: '2026-09-23',
        mileage: 278543,
        operation: 'PLAQUETTE GARNIE FRN AV',
        emitter: 'SARL Garage Hélière C. & S.',
      },
      {
        date: '2026-09-23',
        mileage: 278543,
        operation: 'REMPLACEMENT PLAQUETTE DE FREIN ARRIERE',
        emitter: 'SARL Garage Hélière C. & S.',
      },
      {
        date: '2026-09-23',
        mileage: 278543,
        operation: 'JEU PLAQUETTE AR',
        emitter: 'SARL Garage Hélière C. & S.',
      },
      {
        date: '2026-08-18',
        mileage: 272448,
        operation: text1,
        emitter: 'SARL Garage Hélière C. & S.',
      },
    ],
  });

  if (espaceReplacedAssessment.frontAxle.wearPercentage !== 0) {
    throw new Error('Usure avant non réinitialisée à 0% après remplacement: ' + espaceReplacedAssessment.frontAxle.wearPercentage);
  }
  if (espaceReplacedAssessment.rearAxle.wearPercentage !== 0) {
    throw new Error('Usure arrière non réinitialisée à 0% après remplacement: ' + espaceReplacedAssessment.rearAxle.wearPercentage);
  }
  if (espaceReplacedAssessment.frontAxle.sourceType !== 'NEW_PADS_INSTALLED') {
    throw new Error('Source avant non reconnue comme NEW_PADS_INSTALLED: ' + espaceReplacedAssessment.frontAxle.sourceType);
  }
  if (espaceReplacedAssessment.rearAxle.sourceType !== 'NEW_PADS_INSTALLED') {
    throw new Error('Source arrière non reconnue comme NEW_PADS_INSTALLED: ' + espaceReplacedAssessment.rearAxle.sourceType);
  }
  if (espaceReplacedAssessment.urgentActionNeeded) {
    throw new Error('Alerte urgente toujours active après remplacement des freins');
  }
  if (espaceReplacedAssessment.frontAxle.discsCondition !== 'OPTIMAL') {
    throw new Error('État des disques avant non optimal après remplacement: ' + espaceReplacedAssessment.frontAxle.discsCondition);
  }
  console.log('  ✔ Cas réel Renault Espace V après facture de remplacement validé (0% usure, organes neufs, alerte neutralisée).');

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

  if (vitaraAssessment.frontAxle.remainingLiningThicknessMm < 7.0) {
    throw new Error('Épaisseur résiduelle Vitara sous-évaluée malgré CT favorable: ' + vitaraAssessment.frontAxle.remainingLiningThicknessMm);
  }
  if (vitaraAssessment.urgentActionNeeded) {
    throw new Error('Fausse alerte urgente déclenchée pour le Vitara avec CT vierge');
  }
  if (vitaraAssessment.frontAxle.status !== 'GOOD') {
    throw new Error('Statut Vitara non optimal malgré CT favorable: ' + vitaraAssessment.frontAxle.status);
  }
  console.log('  ✔ Cas réel Suzuki Vitara validé (Épaisseur conforme ~9 mm, statut Optimal, zéro fausse alerte).');

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
