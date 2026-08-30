import { MetadataRoute } from 'next';
import { getAllMaintenanceData } from '@/lib/maintenance/maintenance-data';

const BASE_URL = 'https://www.lavigieauto.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const maintenanceItems = getAllMaintenanceData();

  const maintenanceUrls: MetadataRoute.Sitemap = maintenanceItems.map((item) => ({
    url: `${BASE_URL}/entretien/${item.brandSlug}/${item.modelSlug}/${item.engineSlug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/entretien`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...maintenanceUrls,
  ];
}
