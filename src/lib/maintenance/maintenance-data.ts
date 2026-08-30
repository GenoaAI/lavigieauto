import fs from 'fs';
import path from 'path';
import { VehicleMaintenanceData } from '@/types/maintenance';

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
