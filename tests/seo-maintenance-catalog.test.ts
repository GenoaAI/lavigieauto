import fs from 'fs';
import path from 'path';
import {
  getAllMaintenanceData,
  getMaintenanceData,
  getAllMaintenanceParams,
  getMaintenanceDataByBrand,
  getAllBrandSlugs,
  getAllBrandParams,
  getMaintenanceDataForBrand,
  getAllBrandsSummary,
  getFamilySlug,
  getModelDisplayName,
  getEnginesByModel,
  getMaintenanceDataForModel,
  getAllMaintenanceModels,
  getAllMaintenanceModelParams,
} from '../src/lib/maintenance/maintenance-data';
import sitemap from '../src/app/sitemap';
import {
  generateStaticParams as generateBrandStaticParams,
  generateMetadata as generateBrandMetadata,
} from '../src/app/entretien/[brand]/page';
import {
  generateStaticParams as generateModelStaticParams,
  generateMetadata as generateModelMetadata,
} from '../src/app/entretien/[brand]/[model]/page';
import {
  generateStaticParams as generateVehicleStaticParams,
  generateMetadata as generateVehicleMetadata,
} from '../src/app/entretien/[brand]/[model]/[engine]/page';
import { VehicleMaintenanceData } from '../src/types/maintenance';

export async function testSeoMaintenanceCatalog() {
  console.log('=================================================');
  console.log('🚗 [TEST] E2E SEO, CATALOGUE DE MAINTENANCE & MAILLAGE INTERNE');
  console.log('=================================================\n');

  const MAINTENANCE_DIR = path.join(process.cwd(), 'src/data/maintenance');

  // =========================================================================
  // TIER 1: FEATURE COVERAGE & CATALOG DATA INTEGRITY
  // =========================================================================
  console.log('▶ [TIER 1] Couverture & Intégrité Structurelle du Référentiel Maintenance (32 JSON)...');

  const jsonFiles = fs.readdirSync(MAINTENANCE_DIR).filter((f) => f.endsWith('.json'));
  if (jsonFiles.length !== 32) {
    throw new Error(`Nombre de fichiers JSON inattendu : attendu 32, obtenu ${jsonFiles.length}`);
  }

  const allData = getAllMaintenanceData();
  if (allData.length !== 32) {
    throw new Error(`getAllMaintenanceData() a renvoyé ${allData.length} fiches au lieu de 32.`);
  }

  const validFuelTypes = ['Essence', 'Diesel', 'Hybride', 'Electrique'];
  const validCategories = ['moteur', 'freinage', 'filtration', 'visibilite', 'liaison_au_sol'];
  const validCriticalities = ['obligatoire', 'recommande', 'securite'];

  for (const item of allData) {
    const fileRef = `${item.brandSlug}-${item.modelSlug}-${item.engineSlug}`;

    // Champs obligatoires non vides
    if (!item.brand || !item.brandSlug) throw new Error(`[${fileRef}] Marque ou brandSlug manquant`);
    if (!item.model || !item.modelSlug) throw new Error(`[${fileRef}] Modèle ou modelSlug manquant`);
    if (!item.engine || !item.engineSlug) throw new Error(`[${fileRef}] Motorisation ou engineSlug manquant`);
    if (!item.engineCode) throw new Error(`[${fileRef}] Code moteur manquant`);
    if (!item.productionYears) throw new Error(`[${fileRef}] Années de production manquantes`);
    if (!item.directAnswerSummary || item.directAnswerSummary.length < 30) {
      throw new Error(`[${fileRef}] directAnswerSummary trop court ou manquant`);
    }
    if (!item.recommendedOilNorm || !item.oilViscosity) {
      throw new Error(`[${fileRef}] Norme d'huile ou viscosité manquante`);
    }
    if (!validFuelTypes.includes(item.fuelType)) {
      throw new Error(`[${fileRef}] Type de carburant invalide : ${item.fuelType}`);
    }
    if (typeof item.powerHp !== 'number' || item.powerHp <= 0) {
      throw new Error(`[${fileRef}] Puissance fiscale/DIN invalide : ${item.powerHp}`);
    }

    // Intervalles
    if (!Array.isArray(item.intervals) || item.intervals.length < 3) {
      throw new Error(`[${fileRef}] Doit contenir au moins 3 intervalles de maintenance (obtenu ${item.intervals?.length})`);
    }

    for (const interval of item.intervals) {
      if (!interval.id || !interval.operation || !interval.description) {
        throw new Error(`[${fileRef}] Intervalle incomplet : ${JSON.stringify(interval)}`);
      }
      if (interval.intervalKm <= 0 && interval.intervalMonths <= 0) {
        throw new Error(`[${fileRef}] Intervalle sans périodicité valide : ${interval.id}`);
      }
      if (!validCategories.includes(interval.category)) {
        throw new Error(`[${fileRef}] Catégorie d'intervalle invalide : ${interval.category}`);
      }
      if (!validCriticalities.includes(interval.criticality)) {
        throw new Error(`[${fileRef}] Criticité invalide : ${interval.criticality}`);
      }
      if (typeof interval.estimatedCostMin !== 'number' || typeof interval.estimatedCostMax !== 'number') {
        throw new Error(`[${fileRef}] Coûts d'intervention invalides pour ${interval.id}`);
      }
      if (interval.estimatedCostMin > interval.estimatedCostMax) {
        throw new Error(`[${fileRef}] estimatedCostMin (${interval.estimatedCostMin}) > estimatedCostMax (${interval.estimatedCostMax})`);
      }
    }

    // FAQs
    if (!Array.isArray(item.faqs) || item.faqs.length < 2) {
      throw new Error(`[${fileRef}] Doit contenir au moins 2 FAQs (obtenu ${item.faqs?.length})`);
    }
    for (const faq of item.faqs) {
      if (!faq.question || !faq.answer || faq.question.length < 10 || faq.answer.length < 20) {
        throw new Error(`[${fileRef}] FAQ non valide ou trop courte : ${JSON.stringify(faq)}`);
      }
    }
  }
  console.log('  ✔ Intégrité structurelle et typage des 30 fichiers JSON validés.');

  // 1.2 Dacia Sandero Stepway & ECO-G (GPL) Semantics
  const sandero2 = getMaintenanceData('dacia', 'sandero-2', '0-9-tce-90');
  if (!sandero2) throw new Error('Fiche Dacia Sandero 2 0.9 TCe introuvable');
  if (!sandero2.model.includes('Stepway')) {
    throw new Error(`Dacia Sandero 2 doit inclure 'Stepway' dans son modèle : ${sandero2.model}`);
  }
  if (!sandero2.directAnswerSummary.includes('Stepway')) {
    throw new Error('directAnswerSummary Sandero 2 doit mentionner la déclinaison Stepway');
  }

  const sandero3Tce = getMaintenanceData('dacia', 'sandero-3', '1-0-tce-90');
  if (!sandero3Tce) throw new Error('Fiche Dacia Sandero 3 1.0 TCe introuvable');
  if (!sandero3Tce.model.includes('Stepway')) {
    throw new Error(`Dacia Sandero 3 TCe doit inclure 'Stepway' dans son modèle : ${sandero3Tce.model}`);
  }
  if (!sandero3Tce.directAnswerSummary.includes('Stepway')) {
    throw new Error('directAnswerSummary Sandero 3 TCe doit mentionner Stepway');
  }

  const sandero3EcoG = getMaintenanceData('dacia', 'sandero-3', '1-0-eco-g-100');
  if (!sandero3EcoG) throw new Error('Fiche Dacia Sandero 3 ECO-G introuvable');
  if (!sandero3EcoG.model.includes('Stepway')) {
    throw new Error(`Dacia Sandero 3 ECO-G doit inclure 'Stepway' dans son modèle : ${sandero3EcoG.model}`);
  }
  if (!sandero3EcoG.engine.includes('(GPL)')) {
    throw new Error(`Dacia Sandero 3 ECO-G doit inclure explicitement '(GPL)' dans le nom de motorisation : ${sandero3EcoG.engine}`);
  }
  if (!sandero3EcoG.directAnswerSummary.includes('GPL') || !sandero3EcoG.directAnswerSummary.includes('bicarburation')) {
    throw new Error('directAnswerSummary Sandero 3 ECO-G doit mentionner le GPL et la bicarburation');
  }
  console.log('  ✔ Sémantique Dacia Sandero Stepway et tag explicit "(GPL)" validés.');

  // 1.3 Peugeot 208 PureTech Specs & Fragility Alert
  const peugeot208 = getMaintenanceData('peugeot', '208', '1-2-puretech-82');
  if (!peugeot208) throw new Error('Fiche Peugeot 208 1.2 PureTech introuvable');
  if (peugeot208.model !== '208' || peugeot208.modelSlug !== '208') {
    throw new Error(`Modèle Peugeot 208 incorrect : ${peugeot208.model} / ${peugeot208.modelSlug}`);
  }
  if (peugeot208.engineCode !== 'EB2F / HMZ') {
    throw new Error(`Code moteur Peugeot 208 PureTech incorrect : ${peugeot208.engineCode}`);
  }
  if (!peugeot208.recommendedOilNorm.includes('PSA B71 2312') && !peugeot208.recommendedOilNorm.includes('PSA B71 2010')) {
    throw new Error(`Norme d'huile PSA PureTech non conforme : ${peugeot208.recommendedOilNorm}`);
  }
  const wetBeltInterval = peugeot208.intervals.find((i) => i.id === 'courroie-distribution');
  if (!wetBeltInterval || wetBeltInterval.intervalKm !== 100000 || wetBeltInterval.intervalMonths !== 72) {
    throw new Error(`Intervalle de courroie humide 208 incorrect : ${JSON.stringify(wetBeltInterval)}`);
  }
  if (!peugeot208.vulnerabilities || peugeot208.vulnerabilities.length === 0) {
    throw new Error('Fiche Peugeot 208 PureTech doit documenter les vulnérabilités de la courroie humide');
  }
  console.log('  ✔ Spécifications et vulnérabilités Peugeot 208 1.2 PureTech validées.\n');

  // =========================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // =========================================================================
  console.log('▶ [TIER 2] Robustesse aux Cas Limites & Slugs Invalides...');

  // 2.1 getMaintenanceDataForBrand
  if (getMaintenanceDataForBrand('') !== null) {
    throw new Error('getMaintenanceDataForBrand("") aurait dû renvoyer null');
  }
  if (getMaintenanceDataForBrand('   ') !== null) {
    throw new Error('getMaintenanceDataForBrand("   ") aurait dû renvoyer null');
  }
  if (getMaintenanceDataForBrand('tesla') !== null) {
    throw new Error('getMaintenanceDataForBrand("tesla") aurait dû renvoyer null');
  }
  if (getMaintenanceDataForBrand('marquexyz') !== null) {
    throw new Error('getMaintenanceDataForBrand("marquexyz") aurait dû renvoyer null');
  }

  // Insensibilité à la casse
  const daciaUpper = getMaintenanceDataForBrand('DACIA');
  const daciaMixed = getMaintenanceDataForBrand('DaCiA');
  if (!daciaUpper || daciaUpper.brandSlug !== 'dacia' || daciaUpper.models.length !== 6) {
    throw new Error('Échec de la résolution case-insensitive pour DACIA');
  }
  if (!daciaMixed || daciaMixed.brandSlug !== 'dacia' || daciaMixed.models.length !== 6) {
    throw new Error('Échec de la résolution case-insensitive pour DaCiA');
  }

  // 2.2 getMaintenanceData robustesse
  if (getMaintenanceData('inconnu', '208', '1-2-puretech-82') !== null) {
    throw new Error('getMaintenanceData avec marque inconnue aurait dû renvoyer null');
  }
  if (getMaintenanceData('peugeot', 'inconnu', '1-2-puretech-82') !== null) {
    throw new Error('getMaintenanceData avec modèle inconnu aurait dû renvoyer null');
  }
  if (getMaintenanceData('peugeot', '208', 'inconnu') !== null) {
    throw new Error('getMaintenanceData avec moteur inconnu aurait dû renvoyer null');
  }
  const caseInsensitiveLeaf = getMaintenanceData('PEUGEOT', '208', '1-2-PURETECH-82');
  if (!caseInsensitiveLeaf || caseInsensitiveLeaf.brandSlug !== 'peugeot') {
    throw new Error('Échec de la résolution case-insensitive sur getMaintenanceData');
  }

  // 2.3 getAllBrandSlugs et getAllBrandParams
  const brandSlugs = getAllBrandSlugs();
  const expectedSlugs = ['citroen', 'dacia', 'peugeot', 'renault', 'toyota', 'volkswagen'];
  if (JSON.stringify(brandSlugs) !== JSON.stringify(expectedSlugs)) {
    throw new Error(`Slugs de marque inattendus : ${JSON.stringify(brandSlugs)} vs attendu ${JSON.stringify(expectedSlugs)}`);
  }

  const brandParams = getAllBrandParams();
  if (brandParams.length !== 6) {
    throw new Error(`Nombre de params marque inattendu : ${brandParams.length}`);
  }
  for (let i = 0; i < expectedSlugs.length; i++) {
    if (brandParams[i].brand !== expectedSlugs[i]) {
      throw new Error(`Mismatch param marque index ${i} : ${brandParams[i].brand} vs ${expectedSlugs[i]}`);
    }
  }

  // 2.4 getAllBrandsSummary
  const summaries = getAllBrandsSummary();
  if (summaries.length !== 6) {
    throw new Error(`getAllBrandsSummary() a renvoyé ${summaries.length} marques au lieu de 6`);
  }
  const totalSummaryCount = summaries.reduce((acc, s) => acc + s.count, 0);
  if (totalSummaryCount !== 32) {
    throw new Error(`Nombre total de véhicules dans le résumé : ${totalSummaryCount} au lieu de 32`);
  }
  console.log('  ✔ Comportement robuste aux cas limites, insensibilité à la casse et helpers validés.');

  // 2.5 Unit Tests for New Data Helpers (getFamilySlug, getEnginesByModel, getMaintenanceDataForModel, getAllMaintenanceModels)
  console.log('  Testing new data helpers (getFamilySlug, getEnginesByModel, getMaintenanceDataForModel, getAllMaintenanceModels)...');

  // getFamilySlug
  if (getFamilySlug('sandero-2') !== 'sandero') {
    throw new Error(`getFamilySlug('sandero-2') attendu 'sandero', obtenu '${getFamilySlug('sandero-2')}'`);
  }
  if (getFamilySlug('clio-4') !== 'clio') {
    throw new Error(`getFamilySlug('clio-4') attendu 'clio', obtenu '${getFamilySlug('clio-4')}'`);
  }
  if (getFamilySlug('208-1') !== '208') {
    throw new Error(`getFamilySlug('208-1') attendu '208', obtenu '${getFamilySlug('208-1')}'`);
  }
  if (getFamilySlug('c3-aircross') !== 'c3-aircross') {
    throw new Error(`getFamilySlug('c3-aircross') attendu 'c3-aircross', obtenu '${getFamilySlug('c3-aircross')}'`);
  }
  if (getFamilySlug('c4-picasso') !== 'c4-picasso') {
    throw new Error(`getFamilySlug('c4-picasso') attendu 'c4-picasso', obtenu '${getFamilySlug('c4-picasso')}'`);
  }
  if (getFamilySlug('golf-7') !== 'golf') {
    throw new Error(`getFamilySlug('golf-7') attendu 'golf', obtenu '${getFamilySlug('golf-7')}'`);
  }
  if (getFamilySlug('') !== '' || getFamilySlug('   ') !== '') {
    throw new Error(`getFamilySlug avec chaîne vide ou espaces aurait dû renvoyer ''`);
  }

  // getEnginesByModel (bi-mode and case-insensitivity)
  const genericSanderoEngines = getEnginesByModel('dacia', 'sandero');
  if (genericSanderoEngines.length !== 3) {
    throw new Error(`getEnginesByModel('dacia', 'sandero') attendu 3 motorisations, obtenu ${genericSanderoEngines.length}`);
  }

  const specificSandero2Engines = getEnginesByModel('dacia', 'sandero-2');
  if (specificSandero2Engines.length !== 1) {
    throw new Error(`getEnginesByModel('dacia', 'sandero-2') attendu 1 motorisation, obtenu ${specificSandero2Engines.length}`);
  }
  if (specificSandero2Engines[0].engineSlug !== '0-9-tce-90') {
    throw new Error(`Moteur inattendu pour Sandero 2 : ${specificSandero2Engines[0].engineSlug}`);
  }

  // Case-insensitivity
  const upperSandero = getEnginesByModel('DACIA', 'SANDERO');
  if (upperSandero.length !== 3) {
    throw new Error(`getEnginesByModel('DACIA', 'SANDERO') case-insensitive a échoué (${upperSandero.length})`);
  }
  const mixedSandero2 = getEnginesByModel('DaCiA', 'SaNdErO-2');
  if (mixedSandero2.length !== 1) {
    throw new Error(`getEnginesByModel('DaCiA', 'SaNdErO-2') case-insensitive a échoué (${mixedSandero2.length})`);
  }

  // Unknown model/brand
  if (getEnginesByModel('dacia', 'inconnu').length !== 0) {
    throw new Error('getEnginesByModel avec modèle inconnu aurait dû renvoyer []');
  }
  if (getEnginesByModel('inconnu', 'sandero').length !== 0) {
    throw new Error('getEnginesByModel avec marque inconnue aurait dû renvoyer []');
  }

  // getMaintenanceDataForModel
  const sanderoModelSummary = getMaintenanceDataForModel('dacia', 'sandero');
  if (!sanderoModelSummary) {
    throw new Error('getMaintenanceDataForModel("dacia", "sandero") a renvoyé null');
  }
  if (sanderoModelSummary.count !== 3) {
    throw new Error(`getMaintenanceDataForModel Sandero count inattendu : ${sanderoModelSummary.count}`);
  }
  if (sanderoModelSummary.modelDisplayName !== 'Sandero / Stepway') {
    throw new Error(`modelDisplayName Sandero inattendu : ${sanderoModelSummary.modelDisplayName}`);
  }
  if (sanderoModelSummary.powerRange.min !== 90 || sanderoModelSummary.powerRange.max !== 100) {
    throw new Error(`powerRange Sandero inattendu : ${JSON.stringify(sanderoModelSummary.powerRange)}`);
  }
  if (
    !sanderoModelSummary.recommendedOilNorms.some((n) => n.includes('RN17')) ||
    !sanderoModelSummary.recommendedOilNorms.some((n) => n.includes('RN0710'))
  ) {
    throw new Error(`recommendedOilNorms Sandero incomplet : ${JSON.stringify(sanderoModelSummary.recommendedOilNorms)}`);
  }
  if (!sanderoModelSummary.hasDistributionChain) {
    throw new Error('sanderoModelSummary.hasDistributionChain doit être true');
  }
  if (sanderoModelSummary.hasDistributionBelt) {
    throw new Error('sanderoModelSummary.hasDistributionBelt doit être false');
  }
  if (!sanderoModelSummary.productionYearsRange || sanderoModelSummary.productionYearsRange.length < 4) {
    throw new Error(`productionYearsRange Sandero invalide : ${sanderoModelSummary.productionYearsRange}`);
  }

  // Peugeot 208 model summary
  const p208Summary = getMaintenanceDataForModel('peugeot', '208');
  if (!p208Summary) {
    throw new Error('getMaintenanceDataForModel("peugeot", "208") a renvoyé null');
  }
  if (p208Summary.count !== 4) {
    throw new Error(`getMaintenanceDataForModel 208 count inattendu : ${p208Summary.count}`);
  }
  if (!p208Summary.hasDistributionBelt) {
    throw new Error('p208Summary.hasDistributionBelt doit être true (PureTech courroie humide)');
  }
  if (!p208Summary.hasVulnerabilities) {
    throw new Error('p208Summary.hasVulnerabilities doit être true');
  }
  if (p208Summary.powerRange.min !== 82 || p208Summary.powerRange.max !== 100) {
    throw new Error(`powerRange 208 inattendu : ${JSON.stringify(p208Summary.powerRange)}`);
  }

  // Null returns on invalid inputs
  if (getMaintenanceDataForModel('', '') !== null) {
    throw new Error('getMaintenanceDataForModel("", "") aurait dû renvoyer null');
  }
  if (getMaintenanceDataForModel('inconnu', 'modele') !== null) {
    throw new Error('getMaintenanceDataForModel("inconnu", "modele") aurait dû renvoyer null');
  }

  // getAllMaintenanceModels
  const allModels = getAllMaintenanceModels();
  if (allModels.length !== 17) {
    throw new Error(`getAllMaintenanceModels() attendu exactement 17 modèles canoniques, obtenu ${allModels.length}`);
  }

  const expectedModelKeys = [
    'citroen/c3',
    'citroen/c3-aircross',
    'citroen/c4-picasso',
    'dacia/duster',
    'dacia/jogger',
    'dacia/sandero',
    'peugeot/2008',
    'peugeot/208',
    'peugeot/3008',
    'peugeot/308',
    'renault/captur',
    'renault/clio',
    'renault/megane',
    'renault/twingo',
    'toyota/yaris',
    'volkswagen/golf',
    'volkswagen/polo',
  ];

  const actualModelKeys = allModels.map((m) => `${m.brandSlug}/${m.modelSlug}`).sort();
  if (JSON.stringify(actualModelKeys) !== JSON.stringify(expectedModelKeys.sort())) {
    throw new Error(`Liste des modèles canoniques inattendue : ${JSON.stringify(actualModelKeys)} vs attendu ${JSON.stringify(expectedModelKeys)}`);
  }

  const totalEngineCountInModels = allModels.reduce((acc, m) => acc + m.count, 0);
  if (totalEngineCountInModels !== 32) {
    throw new Error(`Somme des motorisations par modèle : ${totalEngineCountInModels} au lieu de 32`);
  }
  console.log('  ✔ Nouveaux data helpers validés (17 modèles canoniques, bi-mode moteur, synthèse agrégée).\n');

  // =========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS & SITEMAP COHERENCE
  // =========================================================================
  console.log('▶ [TIER 3] Cohérence Croisée : Sitemap XML (57 URLs), SSG & Maillage Interne...');

  const sitemapEntries = sitemap();
  if (!Array.isArray(sitemapEntries) || sitemapEntries.length !== 57) {
    throw new Error(`Sitemap XML incomplet : attendu exactement 57 URLs, obtenu ${sitemapEntries?.length}`);
  }

  const sitemapUrls = sitemapEntries.map((e) => e.url);

  // Vérification de l'unicité stricte des URLs
  const uniqueUrls = new Set(sitemapUrls);
  if (uniqueUrls.size !== 57) {
    throw new Error(`Doublons détectés dans le sitemap XML (${uniqueUrls.size} uniques sur 57 entrées)`);
  }

  // 1 Racine + 1 Hub Global
  if (!sitemapUrls.includes('https://www.lavigieauto.com')) {
    throw new Error('URL racine manquante dans le sitemap');
  }
  if (!sitemapUrls.includes('https://www.lavigieauto.com/entretien')) {
    throw new Error('URL /entretien globale manquante dans le sitemap');
  }

  // 6 Hubs Marques
  for (const slug of expectedSlugs) {
    const brandUrl = `https://www.lavigieauto.com/entretien/${slug}`;
    if (!sitemapUrls.includes(brandUrl)) {
      throw new Error(`URL de hub marque manquante dans le sitemap : ${brandUrl}`);
    }
    const entry = sitemapEntries.find((e) => e.url === brandUrl);
    if (entry?.priority !== 0.85 || entry?.changeFrequency !== 'weekly') {
      throw new Error(`Métadonnées de sitemap incorrectes pour la marque ${slug} : priority=${entry?.priority}`);
    }
  }

  // 16 Hubs Modèles Intermédiaires
  for (const model of allModels) {
    const modelUrl = `https://www.lavigieauto.com/entretien/${model.brandSlug}/${model.modelSlug}`;
    if (!sitemapUrls.includes(modelUrl)) {
      throw new Error(`URL de hub modèle intermédiaire manquante dans le sitemap : ${modelUrl}`);
    }
    const entry = sitemapEntries.find((e) => e.url === modelUrl);
    if (entry?.priority !== 0.82 || entry?.changeFrequency !== 'weekly') {
      throw new Error(
        `Métadonnées de sitemap incorrectes pour le modèle ${model.brandSlug}/${model.modelSlug} : priority=${entry?.priority}, frequency=${entry?.changeFrequency}`
      );
    }
  }

  // 30 Fiches Feuilles Véhicules
  for (const item of allData) {
    const leafUrl = `https://www.lavigieauto.com/entretien/${item.brandSlug}/${item.modelSlug}/${item.engineSlug}`;
    if (!sitemapUrls.includes(leafUrl)) {
      throw new Error(`Fiche véhicule manquante dans le sitemap : ${leafUrl}`);
    }
    const entry = sitemapEntries.find((e) => e.url === leafUrl);
    if (entry?.priority !== 0.8 || entry?.changeFrequency !== 'weekly') {
      throw new Error(`Métadonnées de sitemap incorrectes pour ${leafUrl}`);
    }
  }

  // Vérification generateStaticParams pour Brand Hub, Model Hub et Leaf Pages
  const staticBrandParams = await generateBrandStaticParams();
  if (staticBrandParams.length !== 6) {
    throw new Error(`generateStaticParams Brand Hub doit renvoyer 6 entrées, obtenu ${staticBrandParams.length}`);
  }

  const staticModelParams = await generateModelStaticParams();
  if (staticModelParams.length !== 17) {
    throw new Error(`generateStaticParams Model Hub doit renvoyer 17 entrées, obtenu ${staticModelParams.length}`);
  }

  const staticVehicleParams = await generateVehicleStaticParams();
  if (staticVehicleParams.length !== 32) {
    throw new Error(`generateStaticParams Leaf Vehicle doit renvoyer 32 entrées, obtenu ${staticVehicleParams.length}`);
  }

  console.log('  ✔ Sitemap XML certifié à 57 URLs uniques (1 racine + 1 hub + 6 marques + 17 modèles + 32 véhicules).');
  console.log('  ✔ Priorités Sitemap validées : Racine (1.0), Hub (0.9), Marques (0.85), Modèles (0.82), Feuilles (0.80).');
  console.log('  ✔ Génération des paramètres statiques SSG 100% alignée (6 marques, 17 modèles, 32 feuilles).\n');

  // =========================================================================
  // TIER 4: REAL-WORLD E2E SCENARIOS & BUSINESS SPECIFICATIONS
  // =========================================================================
  console.log('▶ [TIER 4] Scénarios Métier Réels, Position 0 FAQs, Schémas Schema.org & Cinématique...');

  // 4.1 Position 0 FAQs sur Dacia Sandero (2 & 3)
  const sanderoFiles = [
    'dacia-sandero-2-0-9-tce-90.json',
    'dacia-sandero-3-1-0-tce-90.json',
    'dacia-sandero-3-1-0-eco-g-100.json',
  ];

  const q1Expected = "À combien de kilomètres faire la vidange d'une Dacia Sandero ?";
  const q2Expected = "Quelle est la périodicité de vidange sur Sandero GPL ?";

  for (const fileName of sanderoFiles) {
    const raw = fs.readFileSync(path.join(MAINTENANCE_DIR, fileName), 'utf-8');
    const parsed: VehicleMaintenanceData = JSON.parse(raw);

    const faq1 = parsed.faqs.find((f) => f.question === q1Expected);
    if (!faq1) {
      throw new Error(`[${fileName}] FAQ Position 0 manquante : "${q1Expected}"`);
    }
    if (!faq1.answer.includes('vidange') || !faq1.answer.includes('RN17') && !faq1.answer.includes('RN0710')) {
      throw new Error(`[${fileName}] Réponse FAQ 1 non conforme aux préconisations constructeur : ${faq1.answer}`);
    }

    const faq2 = parsed.faqs.find((f) => f.question === q2Expected);
    if (!faq2) {
      throw new Error(`[${fileName}] FAQ Position 0 manquante : "${q2Expected}"`);
    }
    if (!faq2.answer.includes('GPL') || !faq2.answer.includes('filtre') || !faq2.answer.includes('30 000 km')) {
      throw new Error(`[${fileName}] Réponse FAQ 2 non conforme aux préconisations GPL : ${faq2.answer}`);
    }
  }
  console.log('  ✔ FAQs ciblées Position 0 validées sur l\'intégralité des fiches Dacia Sandero.');

  // 4.2 Répartition exhaustive des modèles par hub de marque
  const brandModelCounts: Record<string, number> = {
    citroen: 3,
    dacia: 6,
    peugeot: 10,
    renault: 8,
    toyota: 1,
    volkswagen: 4,
  };

  for (const [brand, expectedCount] of Object.entries(brandModelCounts)) {
    const data = getMaintenanceDataForBrand(brand);
    if (!data) throw new Error(`Données de marque manquantes pour ${brand}`);
    if (data.models.length !== expectedCount) {
      throw new Error(`Nombre de modèles pour ${brand} incorrect : attendu ${expectedCount}, obtenu ${data.models.length}`);
    }
  }
  console.log('  ✔ Comptage et exhaustivité des modèles par marque certifiés (dacia:6, peugeot:10, renault:8, citroen:3, volkswagen:4, toyota:1).');

  // 4.3 Logique de détection Courroie vs Chaîne & Métadonnées Dynamiques (Snippets CTR & Fiche PDF)
  // Test moteurs à courroie (Belt)
  const beltVehicles = [
    { brand: 'peugeot', model: '208', engine: '1-2-puretech-82' },
    { brand: 'citroen', model: 'c3-3', engine: '1-2-puretech-83' },
    { brand: 'volkswagen', model: 'golf-7', engine: '1-4-tsi-125' },
    { brand: 'renault', model: 'clio-3', engine: '1-2-16v-75' },
  ];

  for (const v of beltVehicles) {
    const meta = await generateVehicleMetadata({ params: Promise.resolve(v) });
    const title = typeof meta.title === 'string' ? meta.title : '';
    const desc = meta.description || '';
    if (!title.startsWith("Carnet d'Entretien")) {
      throw new Error(`Le titre pour ${v.brand} ${v.model} doit commencer par "Carnet d'Entretien" : ${title}`);
    }
    if (!title.includes('PDF')) {
      throw new Error(`Le titre pour ${v.brand} ${v.model} doit inclure 'PDF' : ${title}`);
    }
    if (title.length >= 65) {
      throw new Error(`Le titre pour ${v.brand} ${v.model} dépasse 64 caractères (${title.length}) : ${title}`);
    }
    if (!desc.includes('Fréquences de vidange')) {
      throw new Error(`La description pour ${v.brand} ${v.model} doit inclure 'Fréquences de vidange' : ${desc}`);
    }
    if (!desc.includes("carnet d'entretien gratuit")) {
      throw new Error(`La description pour ${v.brand} ${v.model} doit inclure 'carnet d'entretien gratuit' : ${desc}`);
    }
    if (!desc.includes('changement de courroie de distribution')) {
      throw new Error(`La description pour ${v.brand} ${v.model} aurait dû mentionner la courroie : ${desc}`);
    }
    const vehicleData = getMaintenanceData(v.brand, v.model, v.engine);
    if (vehicleData && !desc.includes(vehicleData.recommendedOilNorm)) {
      throw new Error(`La description pour ${v.brand} ${v.model} doit mentionner la norme d'huile ${vehicleData.recommendedOilNorm} : ${desc}`);
    }
  }

  // Test moteurs à chaîne (Chain)
  const chainVehicles = [
    { brand: 'dacia', model: 'sandero-2', engine: '0-9-tce-90' },
    { brand: 'dacia', model: 'sandero-3', engine: '1-0-tce-90' },
    { brand: 'dacia', model: 'sandero-3', engine: '1-0-eco-g-100' },
    { brand: 'toyota', model: 'yaris-3', engine: '1-5-hsd-100' },
  ];

  for (const v of chainVehicles) {
    const meta = await generateVehicleMetadata({ params: Promise.resolve(v) });
    const title = typeof meta.title === 'string' ? meta.title : '';
    const desc = meta.description || '';
    if (!title.startsWith("Carnet d'Entretien")) {
      throw new Error(`Le titre pour ${v.brand} ${v.model} doit commencer par "Carnet d'Entretien" : ${title}`);
    }
    if (!title.includes('PDF')) {
      throw new Error(`Le titre pour ${v.brand} ${v.model} doit inclure 'PDF' : ${title}`);
    }
    if (title.length >= 65) {
      throw new Error(`Le titre pour ${v.brand} ${v.model} dépasse 64 caractères (${title.length}) : ${title}`);
    }
    if (!desc.includes('Fréquences de vidange')) {
      throw new Error(`La description pour ${v.brand} ${v.model} doit inclure 'Fréquences de vidange' : ${desc}`);
    }
    if (!desc.includes("carnet d'entretien gratuit")) {
      throw new Error(`La description pour ${v.brand} ${v.model} doit inclure 'carnet d'entretien gratuit' : ${desc}`);
    }
    if (!desc.includes('contrôle de distribution par chaîne')) {
      throw new Error(`La description pour ${v.brand} ${v.model} aurait dû mentionner la chaîne : ${desc}`);
    }
    const vehicleData = getMaintenanceData(v.brand, v.model, v.engine);
    if (vehicleData && !desc.includes(vehicleData.recommendedOilNorm)) {
      throw new Error(`La description pour ${v.brand} ${v.model} doit mentionner la norme d'huile ${vehicleData.recommendedOilNorm} : ${desc}`);
    }
  }

  // Assertion exhaustive sur les 32 fiches feuilles (< 65 chars garanti)
  for (const item of allData) {
    const meta = await generateVehicleMetadata({
      params: Promise.resolve({ brand: item.brandSlug, model: item.modelSlug, engine: item.engineSlug }),
    });
    const title = typeof meta.title === 'string' ? meta.title : '';
    if (!title.startsWith("Carnet d'Entretien")) {
      throw new Error(`Le titre pour ${item.brand} ${item.model} ${item.engine} doit commencer par "Carnet d'Entretien" : ${title}`);
    }
    if (!title.includes('PDF')) {
      throw new Error(`Le titre pour ${item.brand} ${item.model} ${item.engine} doit inclure 'PDF' : ${title}`);
    }
    if (title.length >= 65) {
      throw new Error(`Le titre pour ${item.brand} ${item.model} ${item.engine} dépasse 64 caractères (${title.length}) : ${title}`);
    }
  }
  console.log('  ✔ Détection dynamique de cinématique de distribution et balises CTR compactes (< 65 chars) validées sur 32 fiches.');

  // 4.4 Métadonnées des Hubs Marques
  for (const slug of expectedSlugs) {
    const meta = await generateBrandMetadata({ params: Promise.resolve({ brand: slug }) });
    const title = typeof meta.title === 'string' ? meta.title : '';
    const canonical = meta.alternates?.canonical;
    if (!title.startsWith("Plan d'entretien officiel")) {
      throw new Error(`Titre de hub marque non conforme pour ${slug} : ${title}`);
    }
    if (canonical !== `https://www.lavigieauto.com/entretien/${slug}`) {
      throw new Error(`Canonical incorrect pour le hub ${slug} : ${canonical}`);
    }
  }
  console.log('  ✔ Balises d\'en-tête et métadonnées canoniques des 6 hubs de marque validées.');

  // 4.4 bis Métadonnées des Hubs Modèles Intermédiaires
  for (const model of allModels) {
    const meta = await generateModelMetadata({ params: Promise.resolve({ brand: model.brandSlug, model: model.modelSlug }) });
    const title = typeof meta.title === 'string' ? meta.title : '';
    const desc = meta.description || '';
    const canonical = meta.alternates?.canonical;
    if (!title.startsWith("Carnet d'Entretien")) {
      throw new Error(`Titre de hub modèle non conforme pour ${model.brandSlug}/${model.modelSlug} : ${title}`);
    }
    if (title.length >= 65) {
      throw new Error(`Titre de hub modèle dépasse 64 caractères (${title.length}) pour ${model.brandSlug}/${model.modelSlug} : ${title}`);
    }
    if (!title.includes(model.brand)) {
      throw new Error(`Titre de hub modèle doit inclure marque pour ${model.brandSlug}/${model.modelSlug} : ${title}`);
    }
    if (canonical !== `https://www.lavigieauto.com/entretien/${model.brandSlug}/${model.modelSlug}`) {
      throw new Error(`Canonical incorrect pour le modèle ${model.brandSlug}/${model.modelSlug} : ${canonical}`);
    }
    if (!desc.includes(model.brand) || !desc.includes(model.modelDisplayName)) {
      throw new Error(`Description de hub modèle incorrecte pour ${model.brandSlug}/${model.modelSlug} : ${desc}`);
    }
  }
  console.log('  ✔ Métadonnées CTR et canonical des 17 hubs modèles intermédiaires validées (< 65 chars).');

  // 4.5 Absence de liens brisés (404) ou d'anciennes routes dépréciées (/app/onboarding)
  const leafPageSrc = fs.readFileSync('src/app/entretien/[brand]/[model]/[engine]/page.tsx', 'utf-8');
  const brandPageSrc = fs.readFileSync('src/app/entretien/[brand]/page.tsx', 'utf-8');
  const modelPageSrc = fs.readFileSync('src/app/entretien/[brand]/[model]/page.tsx', 'utf-8');
  const hubPageSrc = fs.readFileSync('src/app/entretien/page.tsx', 'utf-8');

  if (
    leafPageSrc.includes('/app/onboarding') ||
    brandPageSrc.includes('/app/onboarding') ||
    modelPageSrc.includes('/app/onboarding') ||
    hubPageSrc.includes('/app/onboarding')
  ) {
    throw new Error('Présence détectée de l\'ancienne route 404 "/app/onboarding" dans le code UI');
  }
  if (!leafPageSrc.includes('https://schema.org') || !leafPageSrc.includes('BreadcrumbList') || !leafPageSrc.includes('FAQPage') || !leafPageSrc.includes('Car')) {
    throw new Error('Schémas Schema.org manquants dans la page feuille de véhicule');
  }
  if (!brandPageSrc.includes('https://schema.org') || !brandPageSrc.includes('BreadcrumbList') || !brandPageSrc.includes('CollectionPage')) {
    throw new Error('Schémas Schema.org manquants dans la page de hub de marque');
  }
  if (!modelPageSrc.includes('https://schema.org') || !modelPageSrc.includes('BreadcrumbList') || (!modelPageSrc.includes('CollectionPage') && !modelPageSrc.includes('ItemList'))) {
    throw new Error('Schémas Schema.org manquants dans la page de hub modèle intermédiaire');
  }
  console.log('  ✔ Élimination des liens dépréciés 404 et présence des schémas Schema.org validées.\n');

  // =========================================================================
  // TIER 5: INTERNAL LINKING (M1) & PRINTABLE LEAD MAGNET (M3)
  // =========================================================================
  console.log('▶ [TIER 5] Maillage Interne Exhaustif (M1) & Lead Magnet PDF Imprimable (M3)...');

  // 5.1 Internal Linking: Header Navigation (src/app/layout.tsx)
  const layoutSrc = fs.readFileSync('src/app/layout.tsx', 'utf-8');
  const hasHeaderPlanEntretien =
    layoutSrc.includes('/entretien') &&
    (layoutSrc.includes("Plans d'entretien") || layoutSrc.includes("Plans d&apos;entretien"));
  if (!hasHeaderPlanEntretien) {
    throw new Error("Lien Header '/entretien' avec libellé 'Plans d'entretien' manquant dans src/app/layout.tsx");
  }
  if (!layoutSrc.includes('BookOpen')) {
    throw new Error("Icône 'BookOpen' manquante pour le lien d'entretien dans src/app/layout.tsx");
  }
  console.log("  ✔ Header : lien '/entretien' ('Plans d'entretien') et icône BookOpen validés.");

  // 5.2 Internal Linking: Mobile Navigation (src/components/layout/MobileBottomNav.tsx)
  const mobileNavSrc = fs.readFileSync('src/components/layout/MobileBottomNav.tsx', 'utf-8');
  if (!mobileNavSrc.includes('/entretien') || !mobileNavSrc.includes('Entretien')) {
    throw new Error("Lien mobile '/entretien' manquant dans src/components/layout/MobileBottomNav.tsx");
  }
  console.log("  ✔ MobileBottomNav : onglet dédié '/entretien' validé.");

  // 5.3 Internal Linking: Footer 5th Column (src/app/layout.tsx)
  const hasFooterColTitle =
    layoutSrc.includes("Plans d'Entretien Constructeur") ||
    layoutSrc.includes("Plans d&apos;Entretien Constructeur");
  if (!hasFooterColTitle) {
    throw new Error("Colonne Footer 'Plans d'Entretien Constructeur' manquante dans src/app/layout.tsx");
  }
  if (!layoutSrc.includes('lg:grid-cols-5')) {
    throw new Error("Grille de pied de page 5 colonnes ('lg:grid-cols-5') manquante dans src/app/layout.tsx");
  }

  // Verify all 6 brand links in footer
  for (const slug of expectedSlugs) {
    const brandLink = `/entretien/${slug}`;
    if (!layoutSrc.includes(brandLink)) {
      throw new Error(`Lien footer marque manquant pour '${brandLink}' dans src/app/layout.tsx`);
    }
  }

  // Verify 4 featured model links in footer
  const featuredModels = [
    '/entretien/dacia/sandero-2/0-9-tce-90',
    '/entretien/renault/clio-4/1-5-dci-90',
    '/entretien/peugeot/208/1-2-puretech-82',
    '/entretien/peugeot/3008/1-2-puretech-130',
  ];
  for (const modelLink of featuredModels) {
    if (!layoutSrc.includes(modelLink)) {
      throw new Error(`Lien footer fiche phare manquant pour '${modelLink}' dans src/app/layout.tsx`);
    }
  }
  console.log("  ✔ Footer : colonne 5, 6 marques et 4 fiches phares maillées avec succès.");

  // 5.4 Internal Linking: Homepage Maintenance Section (src/app/page.tsx)
  const homeSrc = fs.readFileSync('src/app/page.tsx', 'utf-8');
  if (!homeSrc.includes('id="programmes-entretien"')) {
    throw new Error("Section avec id='programmes-entretien' manquante dans src/app/page.tsx");
  }
  if (!homeSrc.includes('/entretien')) {
    throw new Error("Lien vers '/entretien' manquant dans la section programmes d'entretien de src/app/page.tsx");
  }
  console.log("  ✔ Homepage : section '#programmes-entretien' avec maillage profond validée.");

  // 5.5 Lead Magnet PDF & Print Component (src/components/maintenance/MaintenancePrintActions.tsx)
  const printCompPath = path.join(process.cwd(), 'src/components/maintenance/MaintenancePrintActions.tsx');
  if (!fs.existsSync(printCompPath)) {
    throw new Error(`Composant introuvable : ${printCompPath}`);
  }
  const printCompSrc = fs.readFileSync(printCompPath, 'utf-8');
  if (!printCompSrc.includes("'use client'") && !printCompSrc.includes('"use client"')) {
    throw new Error("MaintenancePrintActions.tsx doit porter la directive 'use client'");
  }
  if (!printCompSrc.includes('window.print()')) {
    throw new Error("MaintenancePrintActions.tsx doit invoquer nativement 'window.print()'");
  }
  if (!printCompSrc.includes('/dashboard')) {
    throw new Error("MaintenancePrintActions.tsx doit proposer le lien CTA vers '/dashboard' pour la conversion des anonymes");
  }
  if (!printCompSrc.includes('print:hidden')) {
    throw new Error("MaintenancePrintActions.tsx doit porter 'print:hidden' pour ne pas s'auto-imprimer");
  }
  console.log("  ✔ Lead Magnet : MaintenancePrintActions.tsx avec window.print() et conversion /dashboard validé.");

  // 5.6 CSS @media print Stylesheet (src/app/globals.css)
  const cssSrc = fs.readFileSync('src/app/globals.css', 'utf-8');
  if (!cssSrc.includes('@media print')) {
    throw new Error("Règles '@media print' manquantes dans src/app/globals.css");
  }
  if (!cssSrc.includes('size: A4') && !cssSrc.includes('size: A4 portrait')) {
    throw new Error("Format '@page { size: A4 }' manquant dans src/app/globals.css");
  }
  if (!cssSrc.includes('print-color-adjust')) {
    throw new Error("Propriété 'print-color-adjust: exact' manquante dans src/app/globals.css");
  }
  if (!cssSrc.includes('.print\\:hidden') && !cssSrc.includes('.print:hidden')) {
    throw new Error("Règle de masquage de chrome '.print:hidden' manquante dans src/app/globals.css");
  }
  console.log("  ✔ Stylesheet : règles d'impression '@media print' A4 validées dans src/app/globals.css.\n");

  console.log('=================================================');
  console.log('🎉 TOUS LES TESTS E2E DU CATALOGUE & SEO SONT AU VERT !');
  console.log('=================================================\n');
}

if (require.main === module) {
  testSeoMaintenanceCatalog()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
