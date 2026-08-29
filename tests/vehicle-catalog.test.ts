import { resolveVehicleCatalogSpecs } from '../src/lib/engine/vehicle-catalog';

export function testVehicleCatalogResolution() {
  console.log('\n▶ [TEST] Engine : Référentiel Catalogue Véhicules & Découplage...');

  // 1. Suzuki Vitara
  const vitara = resolveVehicleCatalogSpecs({
    make: 'SUZUKI',
    model: 'VITARA',
    version: 'LYD21SAT2',
  });
  if (vitara.imageUrl !== '/images/vehicles/suzuki-vitara-2016.jpg') {
    throw new Error('Image Vitara incorrecte: ' + vitara.imageUrl);
  }
  if (!vitara.version?.includes('1.6 VVT 120 ch 2WD')) {
    throw new Error('Version Vitara incorrecte: ' + vitara.version);
  }
  if (vitara.dinPower !== 120 || vitara.fuel !== 'essence') {
    throw new Error('Specifications Vitara incorrectes');
  }
  console.log('  ✔ Résolution Vitara 1.6 VVT 120 ch 2WD validée.');

  // 2. Renault Espace V
  const espace = resolveVehicleCatalogSpecs({
    make: 'RENAULT',
    model: 'ESPACE V',
    fuel: 'diesel',
  });
  if (espace.imageUrl !== '/images/vehicles/renault-espace-noir-etoile-2021.jpg') {
    throw new Error('Image Espace incorrecte: ' + espace.imageUrl);
  }
  if (!espace.version?.includes('2.0 Blue dCi 200 ch')) {
    throw new Error('Version Espace incorrecte: ' + espace.version);
  }
  if (espace.dinPower !== 200 || espace.fuel !== 'diesel') {
    throw new Error('Specifications Espace incorrectes');
  }
  console.log('  ✔ Résolution Renault Espace V 2.0 Blue dCi 200 ch validée.');

  // 3. Renault Clio
  const clio = resolveVehicleCatalogSpecs({
    make: 'RENAULT',
    model: 'CLIO III',
    version: 'BR1B0H',
    fiscalPower: 7,
  });
  if (clio.imageUrl !== '/images/vehicles/renault-clio-2007.jpg') {
    throw new Error('Image Clio incorrecte: ' + clio.imageUrl);
  }
  if (clio.dinPower !== 112 || !clio.version?.includes('1.6 16V 112 ch')) {
    throw new Error('Version Clio 112ch incorrecte: ' + clio.version);
  }
  console.log('  ✔ Résolution Renault Clio 1.6 16V 112 ch validée.');

  // 4. Modèle Inconnu / Générique
  const generic = resolveVehicleCatalogSpecs({
    make: 'HYUNDAI',
    model: 'IONIQ 5',
    fuel: 'electrique',
  });
  if (generic.fuel !== 'electrique') {
    throw new Error('Carburant electrique non detecte');
  }
  if (generic.imageUrl !== null) {
    throw new Error('Image inattendue sur modele generique');
  }
  console.log('  ✔ Gestion propre et sans effet de bord des modèles non catalogués validée.');
}

if (require.main === module) {
  try {
    testVehicleCatalogResolution();
    console.log('\n🎉 TOUS LES TESTS DU CATALOGUE VÉHICULE SONT AU VERT !');
  } catch (err: any) {
    console.error(err);
    process.exit(1);
  }
}
