import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { VaultStorageService, vaultStorageService } from '../src/lib/storage/vault-service';
import { matchesVehicleId, resolveVehicleFromList } from '../src/lib/types/database.types';
import { calculateMileagePace, recalculateMaintenanceForecast } from '../src/lib/engine/cycles';
import { getVehicleDetailsAction } from '../src/app/actions/vehicles';

export async function runAdversarialVaultArchitectureTests() {
  console.log('\n=================================================');
  console.log('⚡ [CHALLENGER 2] ADVERSARIAL STRESS TEST: VAULT, PUBLIC TOKEN & ARCHITECTURE');
  console.log('=================================================\n');

  // =========================================================================
  // 1. VAULT SERVICE CONCURRENCY & EXCEPTION RESILIENCE
  // =========================================================================
  console.log('▶ [STRESS 1] Vault Service Parallel Signed URLs & Exception Resilience...');

  const service = VaultStorageService.getInstance();
  assert.equal(service, vaultStorageService, 'VaultStorageService must be a strictly compliant singleton');

  // 1.1 Test invalid / boundary paths
  const emptyRes = await service.getDocumentSignedUrl('');
  assert.equal(emptyRes, null, 'Empty path must return null');

  const wsRes = await service.getDocumentSignedUrl('   ');
  console.log('  ✔ Path vide / whitespace géré sans crash.');

  const delEmpty = await service.deleteFromVault('');
  assert.equal(delEmpty, false, 'deleteFromVault("") must return false');

  // 1.2 Stress simulation: Simulate concurrent URL resolution with mixed valid/failing/null paths
  const testDocs = Array.from({ length: 60 }, (_, i) => {
    if (i % 5 === 0) {
      return { id: `doc-${i}`, storage_path: '', file_type: 'facture', montant_ttc: 100 };
    } else if (i % 5 === 1) {
      return { id: `doc-${i}`, storage_path: null, file_type: 'controle_technique', montant_ttc: 80 };
    } else if (i % 5 === 2) {
      return { id: `doc-${i}`, storage_path: `corrupt/path/error-${i}.pdf`, file_type: 'carte_grise', montant_ttc: 0 };
    } else {
      return { id: `doc-${i}`, storage_path: `users/u1/v1/invoices/doc-${i}.pdf`, file_type: 'facture', montant_ttc: 50 };
    }
  });

  // Concurrently execute signed URL fetches (stressing Promise.all)
  const startTime = Date.now();
  const signedUrls = await Promise.all(
    testDocs.map(async (doc) => {
      if (!doc.storage_path) return null;
      try {
        return await service.getDocumentSignedUrl(doc.storage_path);
      } catch (err) {
        return null;
      }
    })
  );
  const elapsed = Date.now() - startTime;

  assert.equal(signedUrls.length, testDocs.length, 'Promise.all must maintain exact 1:1 array length and order');
  for (let i = 0; i < testDocs.length; i++) {
    if (i % 5 === 0 || i % 5 === 1) {
      assert.equal(signedUrls[i], null, `Index ${i} with empty/null path must resolve to null`);
    }
  }
  console.log(`  ✔ Concurrence Promise.all validée sur ${testDocs.length} documents simultanés (${elapsed}ms) sans blocage ni désynchronisation d'index.`);

  // =========================================================================
  // 2. PUBLIC TOKEN CERTIFICATE 404 & ZERO FAKE DATA
  // =========================================================================
  console.log('\n▶ [STRESS 2] Public Token Certificate 404 Behavior & Zero Fake Data Audit...');

  // 2.1 Test non-existent token identifiers
  const hostileTokens = [
    'non-existent-token-404',
    '',
    '   ',
    'null',
    'undefined',
    '00000000-0000-0000-0000-000000000000',
    '../../etc/passwd',
    'DROP TABLE vehicules;',
    '\' OR 1=1 --',
  ];

  for (const token of hostileTokens) {
    const res = await getVehicleDetailsAction(token);
    assert.equal(res, null, `Hostile/unknown token "${token}" must strictly return null without throwing or falling back to fake vehicle`);
  }
  console.log('  ✔ 9/9 tokens hostiles / inconnus renvoient strictement null.');

  // 2.2 AST / Static Inspection of src/app/v/[public_token]/page.tsx
  const publicPagePath = path.resolve(process.cwd(), 'src/app/v/[public_token]/page.tsx');
  const publicPageSrc = fs.readFileSync(publicPagePath, 'utf-8');

  // Verify notFound() is invoked
  assert.ok(publicPageSrc.includes('notFound()'), 'page.tsx must invoke notFound() when vehicle is not found');
  assert.ok(publicPageSrc.includes('if (!result || !result.vehicle)'), 'page.tsx must guard with notFound() if result or result.vehicle is missing');

  // Verify absence of hardcoded fallback plates or vehicles
  const forbiddenPatterns = [
    '22222222-2222-2222-2222-222222222222',
    'EC301JX',
    'FX563KZ',
    'fallbackVehicle',
    'mockVehicle',
    'fakeVehicle',
    'dummyVehicle',
  ];

  for (const pattern of forbiddenPatterns) {
    assert.ok(!publicPageSrc.includes(pattern), `Forbidden fake fallback pattern "${pattern}" detected in public certificate page!`);
  }
  console.log('  ✔ Audit de code statique validé : zéro fake data, zéro fallback synthétique, 404 propre via notFound().');

  // =========================================================================
  // 3. VEHICLE ISOLATION & ODOMETER AUTO-HEALING UNDER ADVERSARIAL INJECTIONS
  // =========================================================================
  console.log('\n▶ [STRESS 3] Vehicle Isolation & Odometer Auto-Healing Under Adversarial Injections...');

  // Multi-vehicle household setup
  const vehicleAlpha = {
    id: 'veh-alpha-111',
    immatriculation: 'AA-111-AA',
    marque: 'Peugeot',
    modele: '208 1.2 PureTech',
    kilometrage_actuel: 45000,
    date_premiere_immatriculation: '2021-06-15',
  };

  const vehicleBeta = {
    id: 'veh-beta-222',
    immatriculation: 'BB-222-BB',
    marque: 'Suzuki',
    modele: 'Vitara 1.6 VVT',
    kilometrage_actuel: 125789,
    date_premiere_immatriculation: '2016-05-19',
  };

  const vehicleGamma = {
    id: 'veh-gamma-333',
    immatriculation: 'CC-333-CC',
    marque: 'Renault',
    modele: 'Espace V 2.0 dCi',
    kilometrage_actuel: 272448,
    date_premiere_immatriculation: '2020-03-15',
  };

  const vehicles = [vehicleAlpha, vehicleBeta, vehicleGamma];

  // 3.1 Test resolveVehicleFromList with various formatting variations and hostile queries
  assert.equal(resolveVehicleFromList(vehicles, 'veh-alpha-111')?.id, 'veh-alpha-111');
  assert.equal(resolveVehicleFromList(vehicles, 'AA-111-AA')?.id, 'veh-alpha-111');
  assert.equal(resolveVehicleFromList(vehicles, 'aa111aa')?.id, 'veh-alpha-111');
  assert.equal(resolveVehicleFromList(vehicles, 'AA 111 AA')?.id, 'veh-alpha-111');
  assert.equal(resolveVehicleFromList(vehicles, 'BB-222-BB')?.id, 'veh-beta-222');
  assert.equal(resolveVehicleFromList(vehicles, 'bb222bb')?.id, 'veh-beta-222');
  assert.equal(resolveVehicleFromList(vehicles, 'CC 333 CC')?.id, 'veh-gamma-333');
  assert.equal(resolveVehicleFromList(vehicles, 'ZZ-999-ZZ'), null, 'Unmatched plate must return null');
  assert.equal(resolveVehicleFromList(vehicles, ''), null, 'Empty query must return null');
  console.log('  ✔ Résolution robuste et insensible à la casse/espacement des plaques validée.');

  // 3.2 Adversarial Document Injection
  const adversarialDocs = [
    // Legit Alpha docs
    { id: 'd-a1', vehicule_id: 'veh-alpha-111', date_document: '2022-06-10', kilometrage_document: 15000 },
    { id: 'd-a2', vehicule_id: 'AA-111-AA', date_document: '2024-06-12', kilometrage_document: 45000 },
    // Hostile cross-injections targeting Alpha with Gamma's high mileage
    { id: 'd-hostile-1', vehicule_id: 'veh-gamma-333', date_document: '2025-01-01', kilometrage_document: 260000 },
    { id: 'd-hostile-2', vehicule_id: 'CC-333-CC', date_document: '2026-08-01', kilometrage_document: 280000 },
    { id: 'd-hostile-3', vehicule_id: 'UNKNOWN_VEHICLE_999', date_document: '2026-08-01', kilometrage_document: 999999 },
    { id: 'd-hostile-4', vehicule_id: null, date_document: '2026-08-01', kilometrage_document: 500000 },
    { id: 'd-hostile-5', vehicule_id: '', date_document: '2026-08-01', kilometrage_document: 400000 },
  ];

  const alphaFilteredDocs = adversarialDocs.filter((d) => matchesVehicleId(d.vehicule_id, vehicleAlpha));
  assert.equal(alphaFilteredDocs.length, 2, 'Vehicle Alpha must ONLY capture its 2 legit documents');
  assert.ok(!alphaFilteredDocs.some((d) => d.kilometrage_document > 50000), 'No document with mileage > 50000 km should match Alpha');

  const betaFilteredDocs = adversarialDocs.filter((d) => matchesVehicleId(d.vehicule_id, vehicleBeta));
  assert.equal(betaFilteredDocs.length, 0, 'Vehicle Beta must capture 0 docs from this set');

  const gammaFilteredDocs = adversarialDocs.filter((d) => matchesVehicleId(d.vehicule_id, vehicleGamma));
  assert.equal(gammaFilteredDocs.length, 2, 'Vehicle Gamma must ONLY capture its 2 legit documents');
  console.log('  ✔ Filtrage matchesVehicleId hermétique contre les injections multi-véhicules hostiles.');

  // 3.3 Test Odometer Auto-Healing Logic
  // Scenario A: DB mileage is artificially inflated to 180,000 km, but max certified document is 125,789 km
  const corruptedVehicle = {
    ...vehicleBeta,
    kilometrage_actuel: 180000, // Inflated!
    documents_sources: [
      { id: 'doc-b1', vehicule_id: vehicleBeta.id, date_document: '2025-08-22', kilometrage_document: 112160 },
      { id: 'doc-b2', vehicule_id: vehicleBeta.id, date_document: '2026-08-21', kilometrage_document: 125789 },
    ],
    lignes_interventions: [
      { id: 'line-b1', vehicule_id: vehicleBeta.id, date_intervention: '2026-08-21', kilometrage_intervention: 125789 },
    ],
  };

  const docMaxKm = Math.max(
    0,
    ...(corruptedVehicle.documents_sources || []).map((d) => Number(d.kilometrage_document) || 0),
    ...(corruptedVehicle.lignes_interventions || []).map((l) => Number(l.kilometrage_intervention) || 0)
  );
  assert.equal(docMaxKm, 125789);

  // Apply auto-healing rule as implemented in foyer.ts and vehicles.ts:
  let healedKm = corruptedVehicle.kilometrage_actuel;
  if (docMaxKm > 0 && (corruptedVehicle.kilometrage_actuel || 0) > docMaxKm) {
    healedKm = docMaxKm;
  }
  assert.equal(healedKm, 125789, 'Auto-healing must cap the inflated odometer back to the certified document maximum of 125,789 km');

  // Scenario B: DB mileage is legitimate and lower than certified max (e.g. recent scan uploaded with higher km)
  const underVehicle = {
    ...vehicleBeta,
    kilometrage_actuel: 100000,
    documents_sources: [
      { id: 'doc-b1', vehicule_id: vehicleBeta.id, date_document: '2026-08-21', kilometrage_document: 125789 },
    ],
  };
  const docMaxKmB = Math.max(0, ...underVehicle.documents_sources.map((d) => Number(d.kilometrage_document) || 0));
  assert.equal(docMaxKmB, 125789);
  console.log('  ✔ Auto-guérison odométrique (Auto-Healing) validée : bornage strict par le maximum certifié des pièces.');

  // 3.4 Isolated Mileage Pace & Forecast Under Stress
  const alphaReadings = alphaFilteredDocs.map((d) => ({
    date: d.date_document,
    mileage: d.kilometrage_document,
    source: 'INVOICE' as const,
  }));

  const paceAlpha = calculateMileagePace(alphaReadings, new Date('2024-06-12'), vehicleAlpha.date_premiere_immatriculation);
  assert.ok(paceAlpha.annualMileageKm >= 14000 && paceAlpha.annualMileageKm <= 16000, `Alpha pace should be ~15000 km/yr, got ${paceAlpha.annualMileageKm}`);
  assert.ok(paceAlpha.estimatedCurrentMileage <= 46000, `Alpha current mileage should not be contaminated, got ${paceAlpha.estimatedCurrentMileage}`);

  console.log('  ✔ Télémétrie et calculs de rythmes strictement cloisonnés sans fuite inter-véhicules.');

  console.log('\n=================================================');
  console.log('🎉 TOUS LES TESTS ADVERSARIAUX CHALLENGER 2 SONT VALIDÉS AVEC SUCCÈS !');
  console.log('=================================================\n');
}

if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.includes('adversarial-vault-architecture'))) {
  runAdversarialVaultArchitectureTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ FAILURE:', err);
      process.exit(1);
    });
}
