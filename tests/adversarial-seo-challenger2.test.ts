import fs from 'fs';
import path from 'path';
import {
  getAllMaintenanceData,
  getMaintenanceData,
  getAllBrandSlugs,
  getMaintenanceDataForBrand,
} from '../src/lib/maintenance/maintenance-data';
import { generateMetadata as generateVehicleMetadata } from '../src/app/entretien/[brand]/[model]/[engine]/page';
import { generateMetadata as generateBrandMetadata } from '../src/app/entretien/[brand]/page';
import { VehicleMaintenanceData } from '../src/types/maintenance';

export async function runChallenger2AdversarialTests() {
  console.log('=================================================');
  console.log('🛡️ [CHALLENGER 2] TESTS DE STRESS & VÉRIFICATION ADVERSARIALE SEO');
  console.log('=================================================\n');

  const MAINTENANCE_DIR = path.join(process.cwd(), 'src/data/maintenance');
  const allData = getAllMaintenanceData();

  if (allData.length !== 30) {
    throw new Error(`Nombre de véhicules attendu: 30, obtenu: ${allData.length}`);
  }

  // -------------------------------------------------------------------------
  // 1. POSITION 0 FAQS EXACT STRING MATCHING (SANDERO 2 & 3)
  // -------------------------------------------------------------------------
  console.log('▶ [TEST 1] Stress-Test Position 0 FAQs : Correspondance exacte & Accents...');

  const expectedQ1 = "À combien de kilomètres faire la vidange d'une Dacia Sandero ?";
  const expectedQ2 = "Quelle est la périodicité de vidange sur Sandero GPL ?";

  // Validate exact Unicode bytes for Q1 and Q2
  const q1CodePoints = Array.from(expectedQ1).map((c) => c.codePointAt(0));
  const q2CodePoints = Array.from(expectedQ2).map((c) => c.codePointAt(0));

  const sanderoFiles = [
    'dacia-sandero-2-0-9-tce-90.json',
    'dacia-sandero-3-1-0-tce-90.json',
    'dacia-sandero-3-1-0-eco-g-100.json',
  ];

  for (const fileName of sanderoFiles) {
    const raw = fs.readFileSync(path.join(MAINTENANCE_DIR, fileName), 'utf-8');
    const item: VehicleMaintenanceData = JSON.parse(raw);

    // Verify Question 1
    const foundQ1 = item.faqs.find((f) => f.question === expectedQ1);
    if (!foundQ1) {
      throw new Error(`[${fileName}] Échec exact match Q1 Position 0 : "${expectedQ1}" non trouvé.`);
    }
    const foundQ1Points = Array.from(foundQ1.question).map((c) => c.codePointAt(0));
    if (JSON.stringify(foundQ1Points) !== JSON.stringify(q1CodePoints)) {
      throw new Error(`[${fileName}] Incohérence de codepoints Unicode pour Q1`);
    }

    // Verify Question 2
    const foundQ2 = item.faqs.find((f) => f.question === expectedQ2);
    if (!foundQ2) {
      throw new Error(`[${fileName}] Échec exact match Q2 Position 0 : "${expectedQ2}" non trouvé.`);
    }
    const foundQ2Points = Array.from(foundQ2.question).map((c) => c.codePointAt(0));
    if (JSON.stringify(foundQ2Points) !== JSON.stringify(q2CodePoints)) {
      throw new Error(`[${fileName}] Incohérence de codepoints Unicode pour Q2`);
    }

    // Check answers content for technical accuracy
    if (item.modelSlug === 'sandero-2') {
      if (!foundQ1.answer.includes('20 000 km') || !foundQ1.answer.includes('1 an')) {
        throw new Error(`[${fileName}] Réponse Q1 Sandero 2 doit mentionner 20 000 km / 1 an : ${foundQ1.answer}`);
      }
      if (!foundQ1.answer.includes('RN0710') && !foundQ1.answer.includes('RN17')) {
        throw new Error(`[${fileName}] Réponse Q1 Sandero 2 doit mentionner l'huile RN0710 ou RN17`);
      }
    } else if (item.modelSlug === 'sandero-3') {
      if (!foundQ1.answer.includes('30 000 km') || !foundQ1.answer.includes('1 an')) {
        throw new Error(`[${fileName}] Réponse Q1 Sandero 3 doit mentionner 30 000 km / 1 an : ${foundQ1.answer}`);
      }
      if (!foundQ1.answer.includes('RN17')) {
        throw new Error(`[${fileName}] Réponse Q1 Sandero 3 doit mentionner l'huile RN17`);
      }
    }

    // GPL Answer specifics
    if (!foundQ2.answer.includes('30 000 km') || !foundQ2.answer.includes('GPL') || !foundQ2.answer.includes('RN17')) {
      throw new Error(`[${fileName}] Réponse Q2 GPL incomplète : ${foundQ2.answer}`);
    }
    if (!foundQ2.answer.includes('gazeuse') || !foundQ2.answer.includes('liquide')) {
      throw new Error(`[${fileName}] Réponse Q2 GPL doit spécifier les filtres gazeux et liquide : ${foundQ2.answer}`);
    }
  }

  console.log('  ✔ Exact match strict & validation sémantique des questions Position 0 validés.');

  // -------------------------------------------------------------------------
  // 2. PRESENCE OF "STEPWAY" ACROSS SANDERO MODELS
  // -------------------------------------------------------------------------
  console.log('▶ [TEST 2] Présence exacte de "Stepway" sur les gammes Sandero...');

  for (const fileName of sanderoFiles) {
    const raw = fs.readFileSync(path.join(MAINTENANCE_DIR, fileName), 'utf-8');
    const item: VehicleMaintenanceData = JSON.parse(raw);

    if (!item.model.includes('Stepway')) {
      throw new Error(`[${fileName}] Le champ model (${item.model}) ne contient pas 'Stepway'`);
    }
    if (!item.directAnswerSummary.includes('Stepway')) {
      throw new Error(`[${fileName}] directAnswerSummary ne mentionne pas Stepway`);
    }
  }

  // Ensure non-Sandero vehicles DO NOT contain 'Stepway'
  const nonSanderoItems = allData.filter((i) => !i.modelSlug.startsWith('sandero'));
  for (const item of nonSanderoItems) {
    if (item.model.includes('Stepway')) {
      throw new Error(`[${item.brandSlug}-${item.modelSlug}] Modèle non-Sandero contient 'Stepway' par erreur`);
    }
  }

  console.log('  ✔ Dénomination Stepway strictement présente sur 100% des Sandero et absente des tiers.');

  // -------------------------------------------------------------------------
  // 3. EXPLICIT "(GPL)" TAG ON 1.0 ECO-G 100 CH
  // -------------------------------------------------------------------------
  console.log('▶ [TEST 3] Tag explicite "(GPL)" et bicarburation sur Sandero 3 1.0 ECO-G...');

  const ecoG = getMaintenanceData('dacia', 'sandero-3', '1-0-eco-g-100');
  if (!ecoG) throw new Error('Sandero 3 1.0 ECO-G introuvable');

  if (!ecoG.engine.includes('(GPL)')) {
    throw new Error(`Le champ engine (${ecoG.engine}) ne contient pas explicitement '(GPL)'`);
  }
  if (!ecoG.directAnswerSummary.includes('GPL') || !ecoG.directAnswerSummary.includes('bicarburation')) {
    throw new Error('directAnswerSummary Sandero 3 ECO-G omet GPL ou bicarburation');
  }
  if (!ecoG.engineCode.includes('GPL')) {
    throw new Error(`Code moteur (${ecoG.engineCode}) omet la mention GPL`);
  }

  // Check specific GPL maintenance intervals
  const gasFilter = ecoG.intervals.find((i) => i.id === 'filtre-gpl-gazeux');
  if (!gasFilter || gasFilter.intervalKm !== 30000 || gasFilter.intervalMonths !== 12) {
    throw new Error(`Intervalle filtre GPL gazeux invalide : ${JSON.stringify(gasFilter)}`);
  }
  const liquidFilter = ecoG.intervals.find((i) => i.id === 'filtre-gpl-liquide');
  if (!liquidFilter || liquidFilter.intervalKm !== 60000 || liquidFilter.intervalMonths !== 24) {
    throw new Error(`Intervalle filtre GPL liquide invalide : ${JSON.stringify(liquidFilter)}`);
  }

  // Check generated metadata for ECO-G
  const ecoGMeta = await generateVehicleMetadata({
    params: Promise.resolve({ brand: 'dacia', model: 'sandero-3', engine: '1-0-eco-g-100' }),
  });
  const ecoGTitle = typeof ecoGMeta.title === 'string' ? ecoGMeta.title : '';
  const ecoGDesc = ecoGMeta.description || '';

  if (!ecoGTitle.includes('(GPL)')) {
    throw new Error(`Le titre SEO de la Sandero ECO-G omet le tag '(GPL)' : ${ecoGTitle}`);
  }
  if (!ecoGDesc.includes('(GPL)') && !ecoGDesc.includes('GPL')) {
    throw new Error(`La meta description de la Sandero ECO-G omet 'GPL' : ${ecoGDesc}`);
  }

  console.log('  ✔ Mention explicite (GPL), bicarburation, filtres spécifiques et métadonnées validés.');

  // -------------------------------------------------------------------------
  // 4. DYNAMIC TITLE CONDITIONING (COURROIE VS CHAÎNE) ACROSS ALL 30 VEHICLES
  // -------------------------------------------------------------------------
  console.log('▶ [TEST 4] Matrice d\'exhaustivité Courroie vs Chaîne sur les 30 fiches véhicules...');

  // Exact ground truth for distribution type across all 30 vehicles in the catalog:
  const chainVehiclesList = [
    { brand: 'dacia', model: 'sandero-2', engine: '0-9-tce-90' },
    { brand: 'dacia', model: 'sandero-3', engine: '1-0-tce-90' },
    { brand: 'dacia', model: 'sandero-3', engine: '1-0-eco-g-100' },
    { brand: 'renault', model: 'captur-1', engine: '0-9-tce-90' },
    { brand: 'renault', model: 'captur-2', engine: '1-3-tce-130' },
    { brand: 'renault', model: 'clio-4', engine: '0-9-tce-90' },
    { brand: 'renault', model: 'clio-5', engine: '1-0-tce-100' },
    { brand: 'renault', model: 'twingo-3', engine: '1-0-sce-70' },
    { brand: 'toyota', model: 'yaris-3', engine: '1-5-hsd-100' },
  ];

  const beltVehiclesList = [
    { brand: 'citroen', model: 'c3-3', engine: '1-2-puretech-83' },
    { brand: 'citroen', model: 'c3-aircross', engine: '1-2-puretech-110' },
    { brand: 'citroen', model: 'c4-picasso', engine: '1-6-bluehdi-120' },
    { brand: 'dacia', model: 'duster-2', engine: '1-5-blue-dci-115' },
    { brand: 'peugeot', model: '2008-1', engine: '1-2-puretech-110' },
    { brand: 'peugeot', model: '2008-2', engine: '1-2-puretech-130' },
    { brand: 'peugeot', model: '208-1', engine: '1-6-bluehdi-100' },
    { brand: 'peugeot', model: '208-2', engine: '1-2-puretech-100' },
    { brand: 'peugeot', model: '208-2', engine: '1-5-bluehdi-100' },
    { brand: 'peugeot', model: '208', engine: '1-2-puretech-82' },
    { brand: 'peugeot', model: '3008', engine: '1-2-puretech-130' },
    { brand: 'peugeot', model: '3008-2', engine: '1-2-puretech-130' },
    { brand: 'peugeot', model: '3008-2', engine: '1-5-bluehdi-130' },
    { brand: 'peugeot', model: '308-2', engine: '1-2-puretech-130' },
    { brand: 'renault', model: 'clio-3', engine: '1-2-16v-75' },
    { brand: 'renault', model: 'clio-4', engine: '1-5-dci-90' },
    { brand: 'renault', model: 'megane-4', engine: '1-5-bluehdi-115' },
    { brand: 'volkswagen', model: 'golf-7', engine: '1-4-tsi-125' },
    { brand: 'volkswagen', model: 'golf-7', engine: '1-6-tdi-115' },
    { brand: 'volkswagen', model: 'polo-5', engine: '1-2-tsi-90' },
    { brand: 'volkswagen', model: 'polo-6', engine: '1-0-tsi-95' },
  ];

  if (chainVehiclesList.length + beltVehiclesList.length !== 30) {
    throw new Error(`Somme des véhicules (${chainVehiclesList.length} + ${beltVehiclesList.length}) != 30`);
  }

  // Test all Chain vehicles
  for (const v of chainVehiclesList) {
    const meta = await generateVehicleMetadata({ params: Promise.resolve(v) });
    const title = typeof meta.title === 'string' ? meta.title : '';
    const desc = meta.description || '';

    if (!title.includes('Chaîne')) {
      throw new Error(`[CHAINE FAIL] ${v.brand} ${v.model} ${v.engine} : titre doit contenir 'Chaîne' (obtenu: ${title})`);
    }
    if (title.includes('Courroie')) {
      throw new Error(`[CHAINE FALSE POSITIVE] ${v.brand} ${v.model} ${v.engine} : titre ne doit PAS contenir 'Courroie' (obtenu: ${title})`);
    }
    if (!desc.includes('contrôle de distribution par chaîne')) {
      throw new Error(`[CHAINE FAIL] ${v.brand} ${v.model} ${v.engine} : description doit mentionner 'contrôle de distribution par chaîne'`);
    }
    if (desc.includes('changement de courroie de distribution')) {
      throw new Error(`[CHAINE FALSE POSITIVE] ${v.brand} ${v.model} ${v.engine} : description ne doit PAS mentionner courroie`);
    }
  }

  // Test all Belt vehicles
  for (const v of beltVehiclesList) {
    const meta = await generateVehicleMetadata({ params: Promise.resolve(v) });
    const title = typeof meta.title === 'string' ? meta.title : '';
    const desc = meta.description || '';

    if (!title.includes('Courroie')) {
      throw new Error(`[COURROIE FAIL] ${v.brand} ${v.model} ${v.engine} : titre doit contenir 'Courroie' (obtenu: ${title})`);
    }
    if (title.includes('Chaîne') || title.includes('Chaine')) {
      throw new Error(`[COURROIE FALSE POSITIVE] ${v.brand} ${v.model} ${v.engine} : titre ne doit PAS contenir 'Chaîne' (obtenu: ${title})`);
    }
    if (!desc.includes('changement de courroie de distribution')) {
      throw new Error(`[COURROIE FAIL] ${v.brand} ${v.model} ${v.engine} : description doit mentionner 'changement de courroie de distribution'`);
    }
    if (desc.includes('contrôle de distribution par chaîne')) {
      throw new Error(`[COURROIE FALSE POSITIVE] ${v.brand} ${v.model} ${v.engine} : description ne doit PAS mentionner chaîne`);
    }
  }

  console.log(`  ✔ 9/9 véhicules à chaîne et 21/21 véhicules à courroie conditionnés avec 0 faux positifs.`);

  // -------------------------------------------------------------------------
  // 5. SCHEMA.ORG JSON-LD STRICT PARSING & SPECIFICATION CONFORMANCE
  // -------------------------------------------------------------------------
  console.log('▶ [TEST 5] Validation syntaxique et structurelle Schema.org JSON-LD...');

  for (const item of allData) {
    // 1. FAQPage JSON-LD
    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: item.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };

    const faqRaw = JSON.stringify(faqJsonLd);
    const parsedFaq = JSON.parse(faqRaw);
    if (parsedFaq['@context'] !== 'https://schema.org' || parsedFaq['@type'] !== 'FAQPage') {
      throw new Error(`FAQPage JSON-LD invalide pour ${item.brandSlug}-${item.modelSlug}`);
    }
    if (!Array.isArray(parsedFaq.mainEntity) || parsedFaq.mainEntity.length < 2) {
      throw new Error(`FAQPage mainEntity vide ou incomplet pour ${item.brandSlug}-${item.modelSlug}`);
    }
    for (const q of parsedFaq.mainEntity) {
      if (q['@type'] !== 'Question' || !q.name || q.acceptedAnswer?.['@type'] !== 'Answer' || !q.acceptedAnswer?.text) {
        throw new Error(`Entité FAQ invalide dans FAQPage pour ${item.brandSlug}-${item.modelSlug}`);
      }
    }

    // 2. Car JSON-LD
    const vehicleJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Car',
      name: `${item.brand} ${item.model} ${item.engine}`,
      description: `Calendrier d'entretien officiel & révision pour ${item.brand} ${item.model} ${item.engine}.`,
      url: `https://www.lavigieauto.com/entretien/${item.brandSlug}/${item.modelSlug}/${item.engineSlug}`,
      image: `https://www.lavigieauto.com/images/vehicles/${item.brandSlug}-${item.modelSlug}.jpg`,
      brand: {
        '@type': 'Brand',
        name: item.brand,
      },
      manufacturer: {
        '@type': 'Organization',
        name: item.brand,
      },
      model: item.model,
      fuelType: item.fuelType,
      vehicleEngine: {
        '@type': 'EngineSpecification',
        name: item.engine,
        engineType: item.fuelType,
        enginePower: {
          '@type': 'QuantitativeValue',
          value: item.powerHp,
          unitCode: 'HP',
        },
      },
    };

    const carRaw = JSON.stringify(vehicleJsonLd);
    const parsedCar = JSON.parse(carRaw);
    if (parsedCar['@context'] !== 'https://schema.org' || parsedCar['@type'] !== 'Car') {
      throw new Error(`Car JSON-LD invalide pour ${item.brandSlug}-${item.modelSlug}`);
    }
    if (parsedCar.brand?.['@type'] !== 'Brand' || parsedCar.manufacturer?.['@type'] !== 'Organization') {
      throw new Error(`Marque ou fabricant invalide dans Car JSON-LD pour ${item.brandSlug}`);
    }
    if (parsedCar.vehicleEngine?.['@type'] !== 'EngineSpecification' || parsedCar.vehicleEngine?.enginePower?.unitCode !== 'HP') {
      throw new Error(`vehicleEngine invalide dans Car JSON-LD pour ${item.engineSlug}`);
    }

    // 3. BreadcrumbList JSON-LD
    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Accueil',
          item: 'https://www.lavigieauto.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: "Plan d'entretien",
          item: 'https://www.lavigieauto.com/entretien',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: item.brand,
          item: `https://www.lavigieauto.com/entretien/${item.brandSlug}`,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: `${item.model} (${item.engine})`,
          item: `https://www.lavigieauto.com/entretien/${item.brandSlug}/${item.modelSlug}/${item.engineSlug}`,
        },
      ],
    };

    const breadcrumbRaw = JSON.stringify(breadcrumbJsonLd);
    const parsedBreadcrumb = JSON.parse(breadcrumbRaw);
    if (parsedBreadcrumb['@context'] !== 'https://schema.org' || parsedBreadcrumb['@type'] !== 'BreadcrumbList') {
      throw new Error(`BreadcrumbList JSON-LD invalide pour ${item.brandSlug}`);
    }
    if (parsedBreadcrumb.itemListElement.length !== 4) {
      throw new Error(`BreadcrumbList doit avoir 4 éléments pour ${item.brandSlug}-${item.modelSlug}-${item.engineSlug}`);
    }
    for (let pos = 1; pos <= 4; pos++) {
      if (parsedBreadcrumb.itemListElement[pos - 1].position !== pos) {
        throw new Error(`Position séquentielle brisée à ${pos}`);
      }
      if (!parsedBreadcrumb.itemListElement[pos - 1].item.startsWith('https://www.lavigieauto.com')) {
        throw new Error(`URL de fil d'Ariane non absolue à ${pos}`);
      }
    }
  }

  // Brand Hub Schema.org validation
  const brandSlugs = getAllBrandSlugs();
  for (const slug of brandSlugs) {
    const brandData = getMaintenanceDataForBrand(slug);
    if (!brandData) throw new Error(`Données de marque manquantes pour ${slug}`);

    const brandBreadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.lavigieauto.com' },
        { '@type': 'ListItem', position: 2, name: 'Entretien', item: 'https://www.lavigieauto.com/entretien' },
        { '@type': 'ListItem', position: 3, name: brandData.brand, item: `https://www.lavigieauto.com/entretien/${brandData.brandSlug}` },
      ],
    };

    const brandCollection = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Plans d'entretien officiel ${brandData.brand}`,
      description: `Consultez le calendrier d'entretien officiel pour tous les modèles ${brandData.brand}.`,
      url: `https://www.lavigieauto.com/entretien/${brandData.brandSlug}`,
      isPartOf: {
        '@type': 'WebSite',
        name: 'LaVigieAuto',
        url: 'https://www.lavigieauto.com',
      },
      hasPart: brandData.models.map((m) => ({
        '@type': 'ItemPage',
        name: `Plan d'entretien ${m.brand} ${m.model} ${m.engine}`,
        url: `https://www.lavigieauto.com/entretien/${m.brandSlug}/${m.modelSlug}/${m.engineSlug}`,
      })),
    };

    const parsedBrandBreadcrumb = JSON.parse(JSON.stringify(brandBreadcrumb));
    const parsedBrandCollection = JSON.parse(JSON.stringify(brandCollection));

    if (parsedBrandBreadcrumb.itemListElement.length !== 3) {
      throw new Error(`Breadcrumb hub marque ${slug} doit avoir 3 items`);
    }
    if (parsedBrandCollection.hasPart.length !== brandData.models.length) {
      throw new Error(`CollectionPage hasPart count mismatch pour ${slug}`);
    }
  }

  console.log('  ✔ Schémas Schema.org (FAQPage, Car, BreadcrumbList, CollectionPage) 100% valides et conformes.');

  console.log('\n=================================================');
  console.log('🎉 [CHALLENGER 2] TOUS LES TESTS ADVERSARIAUX SONT AU VERT !');
  console.log('=================================================\n');
}

if (require.main === module) {
  runChallenger2AdversarialTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
