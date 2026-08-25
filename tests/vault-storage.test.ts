import { STORAGE_CONFIG } from '../src/config/storage.config';

export function testVaultStorageConfiguration() {
  console.log('\n▶ [TEST] Coffre-fort : Validation de la Configuration Découplée (Zéro Hardcoding)...');

  // 1. Validation de la taille maximale (15 Mo)
  const expectedMaxBytes = 15 * 1024 * 1024;
  if (STORAGE_CONFIG.maxFileSizeBytes !== expectedMaxBytes) {
    throw new Error(`Taille max invalide: ${STORAGE_CONFIG.maxFileSizeBytes} vs ${expectedMaxBytes}`);
  }
  console.log(`  ✔ Limite de taille validée : ${STORAGE_CONFIG.maxFileSizeBytes / (1024 * 1024)} Mo.`);

  // 2. Validation des types MIME autorisés
  const expectedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  for (const m of expectedMimes) {
    if (!(STORAGE_CONFIG.allowedMimeTypes as readonly string[]).includes(m)) {
      throw new Error(`Type MIME manquant: ${m}`);
    }
  }
  console.log('  ✔ Types MIME validés (PDF, JPEG, PNG, WEBP, HEIC).');

  // 3. Validation de la durée des URLs signées (1 heure = 3600 secondes)
  if (STORAGE_CONFIG.signedUrlDurationSeconds !== 3600) {
    throw new Error(`Durée d'URL signée invalide: ${STORAGE_CONFIG.signedUrlDurationSeconds}`);
  }
  console.log('  ✔ Durée des URLs signées validée : 3600s (1 heure).');

  // 4. Test de la nomenclature automatique exigée
  console.log('\n▶ [TEST] Coffre-fort : Génération de la Nomenclature Prédictive...');
  const generatedName = STORAGE_CONFIG.formatFileName({
    date: '2025-10-14',
    licensePlate: 'XX-123-YY',
    type: 'invoice',
    mileage: 64200,
    entityName: 'Garage des Nations',
    extension: '.pdf',
  });

  const expectedName = '2025-10-14_XX-123-YY_invoice_64200km_garage-des-nations.pdf';
  if (generatedName !== expectedName) {
    throw new Error(`Nomenclature incorrecte.\nObtenu  : "${generatedName}"\nAttendu : "${expectedName}"`);
  }
  console.log(`  ✔ Nommage de fichier conforme : "${generatedName}".`);

  // 5. Test du chemin de stockage hiérarchique
  const storagePath = STORAGE_CONFIG.buildStoragePath({
    userId: 'user-123',
    vehicleId: 'veh-456',
    folder: STORAGE_CONFIG.folders.invoices,
    fileName: generatedName,
  });

  const expectedPath = 'user-123/veh-456/invoices/2025-10-14_XX-123-YY_invoice_64200km_garage-des-nations.pdf';
  if (storagePath !== expectedPath) {
    throw new Error(`Chemin de stockage incorrect.\nObtenu  : "${storagePath}"\nAttendu : "${expectedPath}"`);
  }
  console.log(`  ✔ Chemin de stockage validé : "${storagePath}".`);
}

if (require.main === module) {
  try {
    testVaultStorageConfiguration();
    console.log('\n🎉 TOUS LES TESTS DU COFFRE-FORT SONT AU VERT !');
  } catch (err: any) {
    console.error(err);
    process.exit(1);
  }
}
