import fs from 'fs';
import path from 'path';
import { VehicleMaintenanceData, FAQItem } from '@/types/maintenance';

const MAINTENANCE_DIR = path.join(process.cwd(), 'src/data/maintenance');

let cachedData: VehicleMaintenanceData[] | null = null;

export function getAllMaintenanceData(): VehicleMaintenanceData[] {
  if (cachedData && process.env.NODE_ENV === 'production') {
    return cachedData;
  }

  try {
    if (!fs.existsSync(MAINTENANCE_DIR)) {
      return [];
    }

    const files = fs.readdirSync(MAINTENANCE_DIR).filter((file) => file.endsWith('.json'));
    const items: VehicleMaintenanceData[] = [];

    for (const file of files) {
      const fullPath = path.join(MAINTENANCE_DIR, file);
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const parsed = JSON.parse(raw) as VehicleMaintenanceData;
      items.push(parsed);
    }

    cachedData = items;
    return items;
  } catch (error) {
    console.error('Error loading maintenance data:', error);
    return [];
  }
}

export function getMaintenanceData(
  brandSlug: string,
  modelSlug: string,
  engineSlug: string
): VehicleMaintenanceData | null {
  const all = getAllMaintenanceData();
  const b = brandSlug.toLowerCase();
  const m = modelSlug.toLowerCase();
  const e = engineSlug.toLowerCase();

  return (
    all.find(
      (item) =>
        item.brandSlug.toLowerCase() === b &&
        item.modelSlug.toLowerCase() === m &&
        item.engineSlug.toLowerCase() === e
    ) || null
  );
}

export function getAllMaintenanceParams(): {
  brand: string;
  model: string;
  engine: string;
}[] {
  const all = getAllMaintenanceData();
  return all.map((item) => ({
    brand: item.brandSlug,
    model: item.modelSlug,
    engine: item.engineSlug,
  }));
}

export function getMaintenanceDataByBrand(): Record<string, VehicleMaintenanceData[]> {
  const all = getAllMaintenanceData();
  const grouped: Record<string, VehicleMaintenanceData[]> = {};

  for (const item of all) {
    if (!grouped[item.brand]) {
      grouped[item.brand] = [];
    }
    grouped[item.brand].push(item);
  }

  return grouped;
}

export function getAllBrandSlugs(): string[] {
  const all = getAllMaintenanceData();
  const slugs = Array.from(new Set(all.map((item) => item.brandSlug.toLowerCase())));
  return slugs.sort();
}

export function getAllBrandParams(): { brand: string }[] {
  return getAllBrandSlugs().map((slug) => ({ brand: slug }));
}

export function getMaintenanceDataForBrand(brandSlug: string): {
  brand: string;
  brandSlug: string;
  models: VehicleMaintenanceData[];
} | null {
  const all = getAllMaintenanceData();
  const targetSlug = brandSlug.toLowerCase();
  const matching = all.filter((item) => item.brandSlug.toLowerCase() === targetSlug);

  if (matching.length === 0) {
    return null;
  }

  return {
    brand: matching[0].brand,
    brandSlug: matching[0].brandSlug.toLowerCase(),
    models: matching,
  };
}

export function getAllBrandsSummary(): {
  brand: string;
  brandSlug: string;
  count: number;
  models: VehicleMaintenanceData[];
}[] {
  const brandSlugs = getAllBrandSlugs();
  return brandSlugs
    .map((slug) => {
      const data = getMaintenanceDataForBrand(slug);
      if (!data) return null;
      return {
        brand: data.brand,
        brandSlug: data.brandSlug,
        count: data.models.length,
        models: data.models,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

/**
 * Normalizes model generation slugs by stripping numeric generation suffixes.
 * E.g., "sandero-2" -> "sandero", "clio-4" -> "clio", "208-1" -> "208",
 * preserving hyphenated model names like "c3-aircross" or "c4-picasso".
 */
export function getFamilySlug(modelSlug: string): string {
  if (!modelSlug) return '';
  return modelSlug.toLowerCase().trim().replace(/-[0-9]+$/, '');
}

/**
 * Friendly display name mapping for canonical model families.
 */
export function getModelDisplayName(famSlug: string): string {
  const s = famSlug.toLowerCase();
  if (s === 'sandero') return 'Sandero / Stepway';
  if (s === 'megane') return 'Mégane';
  if (s === 'c3-aircross') return 'C3 Aircross';
  if (s === 'c4-picasso') return 'C4 Picasso';
  if (s === 'c3') return 'C3';
  if (s === '208') return '208';
  if (s === '2008') return '2008';
  if (s === '308') return '308';
  if (s === '3008') return '3008';
  if (s === 'clio') return 'Clio';
  if (s === 'captur') return 'Captur';
  if (s === 'twingo') return 'Twingo';
  if (s === 'duster') return 'Duster';
  if (s === 'jogger') return 'Jogger';
  if (s === 'golf') return 'Golf';
  if (s === 'polo') return 'Polo';
  if (s === 'yaris') return 'Yaris';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Bi-mode resolution for vehicle engines of a model.
 * Matches generic family slug (e.g. "sandero", "clio", "208") as well as
 * specific generation slug (e.g. "sandero-2", "clio-4", "208-1").
 */
export function getEnginesByModel(
  brandSlug: string,
  modelSlug: string
): VehicleMaintenanceData[] {
  const all = getAllMaintenanceData();
  const b = (brandSlug || '').toLowerCase().trim();
  const m = (modelSlug || '').toLowerCase().trim();

  if (!b || !m) return [];

  const brandVehicles = all.filter((v) => v.brandSlug.toLowerCase() === b);
  if (brandVehicles.length === 0) return [];

  // Case 1: Specific generation slug with explicit numeric suffix (e.g. sandero-2, clio-4, 208-1, 3008-2)
  const isSpecificGeneration = m.includes('-') && /-[0-9]+$/.test(m);
  if (isSpecificGeneration) {
    const specificMatches = brandVehicles.filter(
      (v) => v.modelSlug.toLowerCase() === m
    );
    if (specificMatches.length > 0) return specificMatches;
  }

  // Case 2: Generic family slug (e.g. sandero, clio, 208, golf, polo, 3008, c3-aircross)
  const familyMatches = brandVehicles.filter(
    (v) => getFamilySlug(v.modelSlug) === m || v.modelSlug.toLowerCase() === m
  );
  if (familyMatches.length > 0) return familyMatches;

  // Case 3: Residual exact match
  return brandVehicles.filter((v) => v.modelSlug.toLowerCase() === m);
}

export interface ModelMaintenanceSummary {
  brand: string;
  brandSlug: string;
  model: string;
  modelDisplayName: string;
  modelSlug: string;
  familySlug: string;
  count: number;
  engines: VehicleMaintenanceData[];
  generations: string[];
  productionYearsRange: string;
  fuelTypes: string[];
  powerRange: { min: number; max: number };
  recommendedOilNorms: string[];
  oilViscosities: string[];
  hasDistributionBelt: boolean;
  hasDistributionChain: boolean;
  hasVulnerabilities: boolean;
  commonFaqs: FAQItem[];
}

function checkDistributionBelt(v: VehicleMaintenanceData): boolean {
  if ((v as any).distribution?.type === 'belt') return true;
  if (!Array.isArray(v.intervals)) return false;
  return v.intervals.some(
    (i) =>
      i.id.includes('courroie-distribution') ||
      i.operation.toLowerCase().includes('courroie de distribution') ||
      (i.category === 'moteur' &&
        i.operation.toLowerCase().includes('distribution') &&
        !i.operation.toLowerCase().includes('chaîne') &&
        !i.operation.toLowerCase().includes('chaine'))
  );
}

function checkDistributionChain(v: VehicleMaintenanceData): boolean {
  if ((v as any).distribution?.type === 'chain') return true;
  if (!Array.isArray(v.intervals)) return false;
  return (
    v.intervals.some(
      (i) =>
        i.id.includes('chaine-distribution') ||
        i.operation.toLowerCase().includes('chaîne de distribution') ||
        i.operation.toLowerCase().includes('chaine de distribution')
    ) || !checkDistributionBelt(v)
  );
}

/**
 * Aggregates vehicle maintenance specifications for a model or generation.
 */
export function getMaintenanceDataForModel(
  brandSlug: string,
  modelSlug: string
): ModelMaintenanceSummary | null {
  const engines = getEnginesByModel(brandSlug, modelSlug);
  if (engines.length === 0) return null;

  const famSlug = getFamilySlug(modelSlug);
  const displayName = getModelDisplayName(famSlug);

  const allYears: number[] = [];
  for (const e of engines) {
    if (e.productionYears) {
      const matches = e.productionYears.match(/\b(19\d\d|20\d\d)\b/g);
      if (matches) {
        matches.forEach((y) => allYears.push(parseInt(y, 10)));
      }
    }
  }
  let productionYearsRange = engines[0].productionYears || '';
  if (allYears.length > 0) {
    const minYear = Math.min(...allYears);
    const maxYear = Math.max(...allYears);
    productionYearsRange = minYear === maxYear ? `${minYear}` : `${minYear}-${maxYear}`;
  }

  const powers = engines
    .map((e) => e.powerHp)
    .filter((p) => typeof p === 'number' && p > 0);
  const powerRange = {
    min: powers.length > 0 ? Math.min(...powers) : 0,
    max: powers.length > 0 ? Math.max(...powers) : 0,
  };

  const generations = Array.from(
    new Set(engines.map((e) => e.generation).filter(Boolean) as string[])
  ).sort();

  const fuelTypes = Array.from(
    new Set(engines.map((e) => e.fuelType).filter(Boolean) as string[])
  );

  const recommendedOilNorms = Array.from(
    new Set(engines.map((e) => e.recommendedOilNorm).filter(Boolean) as string[])
  );

  const oilViscosities = Array.from(
    new Set(engines.map((e) => e.oilViscosity).filter(Boolean) as string[])
  );

  const hasDistributionBelt = engines.some(checkDistributionBelt);
  const hasDistributionChain = engines.some(checkDistributionChain);
  const hasVulnerabilities = engines.some(
    (e) => Array.isArray(e.vulnerabilities) && e.vulnerabilities.length > 0
  );

  const faqMap = new Map<string, FAQItem>();
  for (const e of engines) {
    if (Array.isArray(e.faqs)) {
      for (const faq of e.faqs) {
        if (faq.question && !faqMap.has(faq.question)) {
          faqMap.set(faq.question, faq);
        }
      }
    }
  }

  return {
    brand: engines[0].brand,
    brandSlug: engines[0].brandSlug.toLowerCase(),
    model: displayName,
    modelDisplayName: displayName,
    modelSlug: famSlug,
    familySlug: famSlug,
    count: engines.length,
    engines,
    generations,
    productionYearsRange,
    fuelTypes,
    powerRange,
    recommendedOilNorms,
    oilViscosities,
    hasDistributionBelt,
    hasDistributionChain,
    hasVulnerabilities,
    commonFaqs: Array.from(faqMap.values()),
  };
}

export interface MaintenanceModelEntry {
  brand: string;
  brandSlug: string;
  model: string;
  modelDisplayName: string;
  modelSlug: string;
  count: number;
}

/**
 * Returns the 16 canonical model families for SSG and Sitemap generation.
 */
export function getAllMaintenanceModels(): MaintenanceModelEntry[] {
  const all = getAllMaintenanceData();
  const brandSlugs = getAllBrandSlugs();
  const modelsMap = new Map<string, MaintenanceModelEntry>();

  for (const brandSlug of brandSlugs) {
    const brandVehicles = all.filter((v) => v.brandSlug.toLowerCase() === brandSlug);
    for (const v of brandVehicles) {
      const famSlug = getFamilySlug(v.modelSlug);
      const key = `${brandSlug}/${famSlug}`;
      if (!modelsMap.has(key)) {
        const displayName = getModelDisplayName(famSlug);
        modelsMap.set(key, {
          brand: v.brand,
          brandSlug: v.brandSlug.toLowerCase(),
          model: displayName,
          modelDisplayName: displayName,
          modelSlug: famSlug,
          count: 0,
        });
      }
      modelsMap.get(key)!.count++;
    }
  }

  return Array.from(modelsMap.values());
}

/**
 * Returns static params { brand, model } for all 16 canonical model routes.
 */
export function getAllMaintenanceModelParams(): { brand: string; model: string }[] {
  return getAllMaintenanceModels().map((m) => ({
    brand: m.brandSlug,
    model: m.modelSlug,
  }));
}


