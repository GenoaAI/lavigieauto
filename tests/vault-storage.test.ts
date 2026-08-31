import { STORAGE_CONFIG } from '../src/config/storage.config';
import { VaultStorageService, vaultStorageService } from '../src/lib/storage/vault-service';

export async function testVaultStorageConfiguration() {
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

  // 6. Test d'isolation physique des scans multiples même date / même garage
  const nameWithInvoice = STORAGE_CONFIG.formatFileName({
    date: '2023-12-15',
    licensePlate: 'ES-123-PA',
    type: 'invoice',
    mileage: 149718,
    entityName: 'Renault Retail Group Versailles',
    extension: '.pdf',
    invoiceNumber: 'FA-2023-442',
  });
  const expectedInvoiceName = '2023-12-15_ES-123-PA_invoice_149718km_renault-retail-group-versailles_facture-fa-2023-442.pdf';
  if (nameWithInvoice !== expectedInvoiceName) {
    throw new Error(`Nomenclature avec facture incorrecte.\nObtenu  : "${nameWithInvoice}"\nAttendu : "${expectedInvoiceName}"`);
  }
  console.log(`  ✔ Isolation physique multi-factures même garage validée : "${nameWithInvoice}".`);

  // 7. Test de résilience et sécurité d'exception du VaultStorageService
  console.log('\n▶ [TEST] Coffre-fort : Résilience du Service & Gestion Concurrente...');
  const service = VaultStorageService.getInstance();
  if (!service || service !== vaultStorageService) {
    throw new Error('Singleton VaultStorageService non conforme.');
  }

  const nullUrl = await service.getDocumentSignedUrl('');
  if (nullUrl !== null) {
    throw new Error('getDocumentSignedUrl doit renvoyer null pour un chemin vide.');
  }

  const deleteEmpty = await service.deleteFromVault('');
  if (deleteEmpty !== false) {
    throw new Error('deleteFromVault doit renvoyer false pour un chemin vide.');
  }
  console.log('  ✔ Résilience aux chemins vides et sécurité d\'exception validées.');
}

if (require.main === module) {
  (async () => {
    try {
      await testVaultStorageConfiguration();
      console.log('\n🎉 TOUS LES TESTS DU COFFRE-FORT SONT AU VERT !');
    } catch (err: any) {
      console.error(err);
      process.exit(1);
    }
  })();
}

