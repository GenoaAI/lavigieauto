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
  let dinPower: number | null = null;
  let fiscalPower: number = params.fiscalPower || 6;
  let fuel: 'essence' | 'diesel' | 'hybride' | 'electrique' = 'essence';
  let annualKm: number = 10000;
  let boiteVitesse: 'manuelle' | 'automatique' | 'robotisee' | 'variation_continue' | undefined = undefined;

  // 1. Détection du type de carburant
  if (params.fuel) {
    const fLower = params.fuel.toLowerCase();
    if (fLower.includes('es') || fLower.includes('sp9') || fLower.includes('essence')) {
      fuel = 'essence';
    } else if (fLower.includes('go') || fLower.includes('diesel') || fLower.includes('gazole') || fLower.includes('dci')) {
      fuel = 'diesel';
    } else if (fLower.includes('hyb') || fLower.includes('hybrid') || fLower.includes('phev')) {
      fuel = 'hybride';
    } else if (fLower.includes('elec') || fLower.includes('ev')) {
      fuel = 'electrique';
    }
  }

  // 2. Modèles Référencés
  if (makeStr.includes('SUZUKI') || modelStr.includes('VITARA')) {
    imageUrl = '/images/vehicles/suzuki-vitara-2016.jpg';
    if (!enhancedVersion || enhancedVersion.includes('LYD21SAT2') || enhancedVersion === 'Standard') {
      enhancedVersion = '1.6 VVT 120 ch 2WD (LYD21SAT2)';
    }
    dinPower = 120;
    fiscalPower = params.fiscalPower || 7;
    fuel = 'essence';
    annualKm = 10000;
    boiteVitesse = 'manuelle';
  } else if (makeStr.includes('RENAULT') && (modelStr.includes('ESPACE') || modelStr.includes('INITIALE'))) {
    imageUrl = '/images/vehicles/renault-espace-noir-etoile-2021.jpg';
    if (!enhancedVersion || enhancedVersion === 'Standard') {
      enhancedVersion = '2.0 Blue dCi 200 ch EDC Initiale Paris';
    }
    dinPower = 200;
    fiscalPower = params.fiscalPower || 11;
    fuel = 'diesel';
    annualKm = 15000;
    boiteVitesse = 'automatique';
  } else if (modelStr.includes('CLIO')) {
    imageUrl = '/images/vehicles/renault-clio-2007.jpg';
    const kw = params.powerKw || 0;
    const cv = params.fiscalPower || 0;
    if (kw >= 80 || cv >= 7 || versionStr.includes('BR1B0H') || versionStr.includes('1.6')) {
      enhancedVersion = '1.6 16V 112 ch (BR1B0H)';
      dinPower = 112;
      fiscalPower = 7;
      boiteVitesse = 'manuelle';
    } else {
      enhancedVersion = '1.2 16V 75 ch Authentique';
      dinPower = 75;
      fiscalPower = 5;
      boiteVitesse = 'manuelle';
    }
    fuel = 'essence';
    annualKm = 8000;
  } else if (modelStr.includes('CHEROKEE') || makeStr.includes('JEEP')) {
    imageUrl = '/images/vehicles/jeep-cherokee-1981.jpg';
    if (!enhancedVersion || enhancedVersion === 'Standard') {
      enhancedVersion = '5.9 V8 360ci Chief (SJ)';
    }
    dinPower = 175;
    fiscalPower = params.fiscalPower || 33;
    fuel = 'essence';
    annualKm = 5000;
    boiteVitesse = 'automatique';
  } else if (modelStr.includes('308') || makeStr.includes('PEUGEOT')) {
    if (!enhancedVersion || enhancedVersion === 'Standard') {
      enhancedVersion = '1.2 PureTech 130 ch Allure';
    }
    dinPower = 130;
    fiscalPower = params.fiscalPower || 7;
    fuel = 'essence';
    annualKm = 12000;
  }

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
