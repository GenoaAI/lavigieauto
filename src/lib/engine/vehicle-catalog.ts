export interface ResolvedVehicleSpecs {
  imageUrl: string | null;
  version: string | null;
  dinPower: number | null;
  fiscalPower: number;
  fuel: 'essence' | 'diesel' | 'hybride' | 'electrique';
  annualKm: number;
  boiteVitesse?: 'manuelle' | 'automatique' | 'robotisee' | 'variation_continue';
}

/**
 * Détection précise du type de carburant depuis les paramètres, version ou modèle
 */
export function detectVehicleFuelType(
  fuelInput?: string | null,
  versionInput?: string | null,
  modelInput?: string | null
): 'essence' | 'diesel' | 'hybride' | 'electrique' {
  const fLower = (fuelInput || '').toLowerCase().trim();
  const vLower = (versionInput || '').toLowerCase().trim();
  const mLower = (modelInput || '').toLowerCase().trim();
  const combined = `${fLower} ${vLower} ${mLower}`;

  // 1. Électrique
  if (
    fLower.includes('elec') ||
    /\b(ev|electric|electrique)\b/.test(combined) ||
    combined.includes('e-208') ||
    combined.includes('e-2008') ||
    combined.includes('zoe') ||
    combined.includes('électrique')
  ) {
    return 'electrique';
  }

  // 2. Hybride / PHEV
  if (
    fLower.includes('hyb') ||
    combined.includes('hsd') ||
    combined.includes('hybrid') ||
    combined.includes('hybride') ||
    combined.includes('phev') ||
    combined.includes('e-tech')
  ) {
    return 'hybride';
  }

  // 3. Diesel
  if (
    fLower.includes('diesel') ||
    fLower.includes('gazole') ||
    /\bgo\b/.test(fLower) ||
    combined.includes('bluehdi') ||
    combined.includes('blue-hdi') ||
    combined.includes('blue dci') ||
    combined.includes('blue-dci') ||
    combined.includes('bluedci') ||
    combined.includes('dci') ||
    combined.includes('hdi') ||
    combined.includes('tdi') ||
    combined.includes('crdi') ||
    combined.includes('diesel') ||
    combined.includes('gazole')
  ) {
    return 'diesel';
  }

  // 4. GPL / Eco-G (bicarburation essence / GPL, résolu en essence au catalogue)
  if (combined.includes('gpl') || combined.includes('eco-g') || combined.includes('ecog')) {
    return 'essence';
  }

  // 5. Essence
  if (
    fLower.includes('es') ||
    fLower.includes('sp9') ||
    fLower.includes('essence') ||
    combined.includes('puretech') ||
    combined.includes('tce') ||
    combined.includes('tsi') ||
    combined.includes('tfsi') ||
    combined.includes('vvt') ||
    combined.includes('vti') ||
    combined.includes('thp') ||
    combined.includes('essence')
  ) {
    return 'essence';
  }

  return 'essence';
}

/**
 * Extraction dynamique de la puissance DIN depuis la version ou les kW
 */
export function extractVehicleDinPower(
  versionInput?: string | null,
  powerKw?: number | null
): number | null {
  if (powerKw && powerKw > 0) {
    return Math.round(powerKw * 1.35962);
  }
  if (!versionInput) return null;

  const v = versionInput.trim();

  // 1. Suffixe explicite (ex: "130 ch", "100ch", "112 cv", "120 hp")
  const chMatch = v.match(/\b(\d{2,3})\s*(?:ch|cv|hp)\b/i);
  if (chMatch) {
    const p = parseInt(chMatch[1], 10);
    if (p >= 40 && p <= 800) return p;
  }

  // 2. Préfixe moteur suivi de la puissance (ex: "bluehdi-100", "tce-90", "tsi-125", "eco-g-100", "blue-dci-115")
  const engineMatch = v.match(
    /(?:puretech|blue[-_ ]*hdi|hdi|blue[-_ ]*dci|dci|tce|tsi|tfsi|tdi|vvt|vti|thp|eco[-_ ]*g|gpl|hsd|hybrid|hybride|e[-_ ]*tech)[-_ ]+(\d{2,3})\b/i
  );
  if (engineMatch) {
    const p = parseInt(engineMatch[1], 10);
    if (p >= 40 && p <= 800) return p;
  }

  // 3. Nombre en fin de chaîne (ex: "...-100", "... 130")
  const endMatch = v.match(/[-_ ](\d{2,3})$/);
  if (endMatch) {
    const p = parseInt(endMatch[1], 10);
    if (p >= 40 && p <= 800) return p;
  }

  // 4. Balayage général des tokens de droite à gauche
  const tokens = v.split(/[-_ \t,()]+/);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tok = tokens[i];
    if (/^\d{2,3}$/.test(tok)) {
      const p = parseInt(tok, 10);
      if (p === 16 && (v.toLowerCase().includes('16v') || v.toLowerCase().includes('16-v'))) {
        continue;
      }
      if (p >= 50 && p <= 700) {
        return p;
      }
    }
  }

  return null;
}

/**
 * Déduction automatique du type de boîte de vitesses
 */
export function deduceVehicleGearbox(
  versionInput?: string | null,
  modelInput?: string | null,
  fuel?: 'essence' | 'diesel' | 'hybride' | 'electrique',
  makeInput?: string | null
): 'manuelle' | 'automatique' {
  const combined = `${versionInput || ''} ${modelInput || ''} ${makeInput || ''}`.toLowerCase();

  // Boîtes automatiques / robotisées courantes
  if (
    combined.includes('eat6') ||
    combined.includes('eat8') ||
    combined.includes('edc') ||
    combined.includes('dsg') ||
    combined.includes('bva') ||
    combined.includes('auto') ||
    combined.includes('cvt') ||
    combined.includes('e-cvt') ||
    combined.includes('7g-tronic') ||
    combined.includes('s-tronic')
  ) {
    return 'automatique';
  }

  // Hybrides Toyota (e-CVT)
  if (
    (combined.includes('toyota') || combined.includes('yaris') || combined.includes('corolla')) &&
    (fuel === 'hybride' || combined.includes('hsd'))
  ) {
    return 'automatique';
  }

  // Dacia / Renault hybrides e-tech
  if (combined.includes('hybrid') && (combined.includes('dacia') || combined.includes('jogger'))) {
    return 'automatique';
  }

  // Véhicules 100% électriques
  if (fuel === 'electrique') {
    return 'automatique';
  }

  return 'manuelle';
}

/**
 * Référentiel unifié des modèles et visuels officiels du parc automobile
 */
export function resolveVehicleCatalogSpecs(params: {
  make?: string | null;
  model?: string | null;
  version?: string | null;
  fuel?: string | null;
  fiscalPower?: number | null;
  powerKw?: number | null;
}): ResolvedVehicleSpecs {
  const makeStr = (params.make || '').toUpperCase().trim();
  const modelStr = (params.model || '').toUpperCase().trim();
  const versionStr = (params.version || '').toUpperCase().trim();

  let imageUrl: string | null = null;
  let enhancedVersion: string | null = params.version || null;

  // 1. Détection dynamique du carburant & puissance DIN
  let fuel: 'essence' | 'diesel' | 'hybride' | 'electrique' = detectVehicleFuelType(
    params.fuel,
    params.version,
    params.model
  );
  let dinPower: number | null = extractVehicleDinPower(params.version, params.powerKw);
  let fiscalPower: number = params.fiscalPower || (dinPower && dinPower >= 130 ? 7 : dinPower && dinPower >= 100 ? 5 : 6);
  let annualKm: number = fuel === 'diesel' ? 18000 : 12000;
  let boiteVitesse: 'manuelle' | 'automatique' | 'robotisee' | 'variation_continue' | undefined = undefined;

  // 2. Modèles Référencés au Catalogue
  if (makeStr.includes('SUZUKI') || modelStr.includes('VITARA')) {
    imageUrl = '/images/vehicles/suzuki-vitara-2016.jpg';
    if (!enhancedVersion || enhancedVersion.includes('LYD21SAT2') || enhancedVersion === 'Standard') {
      enhancedVersion = '1.6 VVT 120 ch 2WD (LYD21SAT2)';
    }
    dinPower = dinPower || 120;
    fiscalPower = params.fiscalPower || 7;
    annualKm = fuel === 'diesel' ? 15000 : 10000;
    boiteVitesse = 'manuelle';
  } else if (makeStr.includes('RENAULT') && (modelStr.includes('ESPACE') || modelStr.includes('INITIALE'))) {
    imageUrl = '/images/vehicles/renault-espace-noir-etoile-2021.jpg';
    if (!enhancedVersion || enhancedVersion === 'Standard') {
      enhancedVersion = '2.0 Blue dCi 200 ch EDC Initiale Paris';
    }
    dinPower = dinPower || 200;
    fiscalPower = params.fiscalPower || 11;
    fuel = 'diesel';
    annualKm = 15000;
    boiteVitesse = 'automatique';
  } else if (modelStr.includes('CLIO')) {
    imageUrl = '/images/vehicles/renault-clio-2007.jpg';
    if (versionStr.includes('BR1B0H') || (versionStr.includes('1.6') && !dinPower)) {
      enhancedVersion = '1.6 16V 112 ch (BR1B0H)';
      dinPower = 112;
      fiscalPower = 7;
      fuel = 'essence';
      boiteVitesse = 'manuelle';
    } else if (!enhancedVersion || enhancedVersion === 'Standard') {
      const kw = params.powerKw || 0;
      const cv = params.fiscalPower || 0;
      if (kw >= 80 || cv >= 7) {
        enhancedVersion = '1.6 16V 112 ch (BR1B0H)';
        dinPower = 112;
        fiscalPower = 7;
        fuel = 'essence';
      } else {
        enhancedVersion = '1.2 16V 75 ch Authentique';
        dinPower = 75;
        fiscalPower = 5;
        fuel = 'essence';
      }
      boiteVitesse = 'manuelle';
    }
    boiteVitesse = boiteVitesse || deduceVehicleGearbox(params.version, params.model, fuel, params.make);
    annualKm = fuel === 'diesel' ? 15000 : 8000;
  } else if (modelStr.includes('CHEROKEE') || makeStr.includes('JEEP')) {
    imageUrl = '/images/vehicles/jeep-cherokee-1981.jpg';
    if (!enhancedVersion || enhancedVersion === 'Standard') {
      enhancedVersion = '5.9 V8 360ci Chief (SJ)';
    }
    dinPower = dinPower || 175;
    fiscalPower = params.fiscalPower || 33;
    fuel = 'essence';
    annualKm = 5000;
    boiteVitesse = 'automatique';
  } else if (modelStr.includes('308') || makeStr.includes('PEUGEOT')) {
    if (!enhancedVersion || enhancedVersion === 'Standard') {
      enhancedVersion = '1.2 PureTech 130 ch Allure';
    }
    dinPower = dinPower || (modelStr.includes('308') ? 130 : 100);
    fiscalPower = params.fiscalPower || (dinPower >= 130 ? 7 : dinPower >= 100 ? 5 : 4);
    // Préserve le carburant détecté (ne pas écraser par 'essence' si diesel ou hybride)
    annualKm = 12000;
    boiteVitesse = boiteVitesse || deduceVehicleGearbox(params.version, params.model, fuel, params.make);
  } else if (makeStr.includes('DACIA')) {
    if (!enhancedVersion || enhancedVersion === 'Standard') {
      if (modelStr.includes('DUSTER')) {
        enhancedVersion = '1.5 Blue dCi 115 ch 4x2';
      } else if (modelStr.includes('JOGGER')) {
        enhancedVersion = '1.0 ECO-G 100 ch';
      } else {
        enhancedVersion = '1.0 ECO-G 100 ch Stepway';
      }
    }
    dinPower = dinPower || (fuel === 'diesel' ? 115 : 100);
    fiscalPower = params.fiscalPower || (dinPower >= 115 ? 6 : 5);
    annualKm = fuel === 'diesel' ? 18000 : 12000;
    boiteVitesse = boiteVitesse || deduceVehicleGearbox(params.version, params.model, fuel, params.make);
  } else if (makeStr.includes('CITROEN') || makeStr.includes('CITROËN')) {
    if (!enhancedVersion || enhancedVersion === 'Standard') {
      if (modelStr.includes('PICASSO') || modelStr.includes('SPACETOURER')) {
        enhancedVersion = '1.6 BlueHDi 120 ch';
      } else if (modelStr.includes('C4')) {
        enhancedVersion = '1.2 PureTech 130 ch';
      } else {
        enhancedVersion = '1.2 PureTech 83 ch Feel';
      }
    }
    dinPower = dinPower || (fuel === 'diesel' ? 120 : 83);
    fiscalPower = params.fiscalPower || (dinPower >= 120 ? 6 : dinPower >= 100 ? 5 : 4);
    annualKm = fuel === 'diesel' ? 18000 : 12000;
    boiteVitesse = boiteVitesse || deduceVehicleGearbox(params.version, params.model, fuel, params.make);
  } else if (makeStr.includes('VOLKSWAGEN') || makeStr.includes('VW')) {
    if (!enhancedVersion || enhancedVersion === 'Standard') {
      if (modelStr.includes('POLO')) {
        enhancedVersion = '1.0 TSI 95 ch';
      } else {
        enhancedVersion = '1.5 TSI 130 ch';
      }
    }
    dinPower = dinPower || (fuel === 'diesel' ? 115 : 125);
    fiscalPower = params.fiscalPower || (dinPower >= 130 ? 7 : dinPower >= 110 ? 6 : 5);
    annualKm = fuel === 'diesel' ? 18000 : 12000;
    boiteVitesse = boiteVitesse || deduceVehicleGearbox(params.version, params.model, fuel, params.make);
  } else if (makeStr.includes('TOYOTA')) {
    if (!enhancedVersion || enhancedVersion === 'Standard') {
      if (modelStr.includes('COROLLA')) {
        enhancedVersion = '1.8 Hybride 140 ch';
      } else {
        enhancedVersion = '1.5 Hybride 116 ch';
      }
    }
    dinPower = dinPower || (modelStr.includes('COROLLA') ? 140 : 116);
    fiscalPower = params.fiscalPower || (dinPower >= 130 ? 7 : 5);
    annualKm = fuel === 'diesel' ? 18000 : 12000;
    boiteVitesse = boiteVitesse || (fuel === 'hybride' || versionStr.includes('HSD') ? 'automatique' : 'manuelle');
  } else {
    // Fallback dynamique pour marques et modèles sans bloc dédié
    annualKm = fuel === 'diesel' ? 18000 : 10000;
    boiteVitesse = boiteVitesse || deduceVehicleGearbox(params.version, params.model, fuel, params.make);
  }

  // Résolution finale de sécurité de la boîte de vitesses
  boiteVitesse = boiteVitesse || deduceVehicleGearbox(params.version, params.model, fuel, params.make);

  return {
    imageUrl,
    version: enhancedVersion,
    dinPower,
    fiscalPower,
    fuel,
    annualKm,
    boiteVitesse,
  };
}
