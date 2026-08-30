import assert from 'node:assert/strict';
import { calculateMileagePace, recalculateMaintenanceForecast } from '../src/lib/engine/cycles';
import { matchesVehicleId } from '../src/lib/types/database.types';
import { getFoyerOverviewAction } from '../src/app/actions/foyer';

export async function testStrictVehicleIsolation() {
  console.log('\n🛡️ [ISOLATION & CLOISONNEMENT] Test de Cloisonnement Strict Inter-Véhicules...');

  // 1. Simuler un foyer avec 2 véhicules réels : Suzuki Vitara (125 789 km) et Renault Espace V (272 448 km)
  const vitara = {
    id: 'veh-vitara-1',
    immatriculation: 'EC-301-JX',
    marque: 'Suzuki',
    modele: 'Vitara 1.6 VVT AllGrip',
    kilometrage_actuel: 125789,
    date_premiere_immatriculation: '2016-05-19',
  };

  const espace = {
    id: 'veh-espace-2',
    immatriculation: 'FX-563-KZ',
    marque: 'Renault',
    modele: 'Espace V 2.0 Blue dCi',
    kilometrage_actuel: 272448,
    date_premiere_immatriculation: '2020-03-15',
  };

  // 2. Factures du Vitara
  const vitaraDocs = [
    { id: 'doc-v-1', vehicule_id: vitara.id, date_document: '2025-08-22', kilometrage_document: 112160 },
    { id: 'doc-v-2', vehicule_id: vitara.id, date_document: '2026-08-21', kilometrage_document: 125789 },
  ];

  // 3. Factures de l'Espace (avec kilométrages élevés : 148 755 km puis 272 448 km)
  const espaceDocs = [
    { id: 'doc-e-1', vehicule_id: espace.id, date_document: '2023-12-11', kilometrage_document: 148755 },
    { id: 'doc-e-2', vehicule_id: espace.id, date_document: '2026-08-18', kilometrage_document: 272448 },
  ];

  const allFoyerDocs = [...vitaraDocs, ...espaceDocs];

  // 4. Test du filtre de rattachement strict
  const filteredVitaraDocs = allFoyerDocs.filter(d => matchesVehicleId(d.vehicule_id, vitara));
  const filteredEspaceDocs = allFoyerDocs.filter(d => matchesVehicleId(d.vehicule_id, espace));

  assert.equal(filteredVitaraDocs.length, 2, 'Le Vitara ne doit contenir QUE ses 2 propres factures');
  assert.equal(filteredEspaceDocs.length, 2, "L'Espace ne doit contenir QUE ses 2 propres factures");
  assert.ok(
    !filteredVitaraDocs.some(d => d.kilometrage_document > 130000),
    'Aucune facture avec KM > 130 000 ne doit être rattachée au Vitara'
  );
  console.log('  ✔ Cloisonnement strict des documents sources validé (zéro contamination croisée).');

  // 5. Test du rythme kilométrique et odomètre calculé pour le Vitara
  const vitaraReadings = filteredVitaraDocs.map(d => ({
    date: d.date_document,
    mileage: d.kilometrage_document,
    source: 'INVOICE' as const,
  }));

  const vitaraPace = calculateMileagePace(
    vitaraReadings,
    new Date('2026-08-29'),
    vitara.date_premiere_immatriculation
  );

  assert.ok(
    vitaraPace.estimatedCurrentMileage < 130000,
    "Le kilométrage estimé du Vitara doit rester ~125 800 km et non " + vitaraPace.estimatedCurrentMileage + " km"
  );
  assert.ok(
    vitaraPace.annualMileageKm >= 10000 && vitaraPace.annualMileageKm <= 15000,
    "Le rythme du Vitara doit être ~13 000 km/an et non " + vitaraPace.annualMileageKm + " km/an"
  );
  console.log('  ✔ Télémétrie odométrique et rythme annuel du Vitara 100% isolés et conformes.');

  // 6. Test de non-déclenchement d'alarme vidange indue
  const vitaraForecast = recalculateMaintenanceForecast({
    readings: vitaraReadings,
    currentOdometer: vitara.kilometrage_actuel,
    vehicleFirstRegistration: vitara.date_premiere_immatriculation,
    lastServices: [
      {
        category: 'DRAIN_OIL',
        serviceDate: '2026-08-21',
        mileage: 125789,
      },
    ],
  });

  const drainOilMilestone = vitaraForecast.projectedMilestones.find(m => m.category === 'DRAIN_OIL');
  assert.ok(drainOilMilestone, 'Le jalon vidange doit exister');
  assert.equal(
    drainOilMilestone?.urgency,
    'OK',
    'La vidange du Vitara réalisée à 125 789 km doit être en statut OK et non OVERDUE'
  );
  assert.ok(
    (drainOilMilestone?.remainingKm || 0) > 10000,
    "La vidange doit être due dans +14 000 km et non " + drainOilMilestone?.remainingKm + " km"
  );
  console.log('  ✔ Échéancier prévisionnel du Vitara 100% au vert (aucune alerte indue).');

  // 7. Test de confidentialité absolue en mode visiteur non connecté (Zéro Fuite du Foyer Principal)
  const unauthenticatedOverview = await getFoyerOverviewAction();
  assert.equal(unauthenticatedOverview.role, 'guest', 'Un visiteur non connecté doit avoir le rôle guest');
  assert.equal(unauthenticatedOverview.vehicles.length, 0, 'Un visiteur non connecté doit recevoir strictement 0 véhicule');
  assert.equal(unauthenticatedOverview.members.length, 0, 'Un visiteur non connecté doit recevoir 0 membre');
  assert.notEqual(unauthenticatedOverview.foyer?.nom, 'Foyer Charles de Forges', 'Le nom du foyer principal ne doit jamais fuiter en mode déconnecté');
  assert.notEqual(unauthenticatedOverview.foyer?.id, '11111111-1111-1111-1111-111111111111', "L'ID du foyer principal ne doit jamais fuiter en mode déconnecté");
  console.log('  ✔ Confidentialité et isolation du foyer en mode non-authentifié 100% validées (Zéro fuite).');
}
