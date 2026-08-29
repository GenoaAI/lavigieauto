export type VaultDocumentType = 'invoice' | 'technical_inspection' | 'registration_card' | 'export';

export const STORAGE_CONFIG = {
  bucketName: process.env.SUPABASE_STORAGE_BUCKET_VAULT ?? 'vehicle-vault',
  maxFileSizeBytes: 15 * 1024 * 1024, // 15 Mo
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
  ] as const,
  signedUrlDurationSeconds: 60 * 60, // 1 heure pour la prévisualisation sécurisée
  folders: {
    invoices: 'invoices',
    inspections: 'inspections',
    registration: 'registration',
    exports: 'exports',
  },
  formatFileName: (params: {
    date: string;
    licensePlate: string;
    type: 'invoice' | 'technical_inspection' | 'registration_card';
    mileage: number;
    entityName?: string | null;
    extension: string;
    invoiceNumber?: string | null;
    uniqueHash?: string | null;
  }) => {
    const cleanDate = params.date || new Date().toISOString().split('T')[0];
    const cleanPlate = (params.licensePlate || 'VEHICULE').toUpperCase().replace(/[^A-Z0-9]/g, '-');
    const cleanEntity = (params.entityName || 'document')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-');
    const cleanExt = params.extension.replace(/^\./, '') || 'pdf';
    const cleanInvoice = params.invoiceNumber
      ? `_facture-${params.invoiceNumber.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      : '';
    const cleanHash = params.uniqueHash
      ? `_${params.uniqueHash}`
      : '';
    return `${cleanDate}_${cleanPlate}_${params.type}_${params.mileage}km_${cleanEntity}${cleanInvoice}${cleanHash}.${cleanExt}`;
  },
  buildStoragePath: (params: {
    userId: string;
    vehicleId: string;
    folder: string;
    fileName: string;
  }) => {
    const cleanUserId = params.userId || 'foyer-default';
    const cleanVehicleId = params.vehicleId || 'vehicule-general';
    return `${cleanUserId}/${cleanVehicleId}/${params.folder}/${params.fileName}`;
  },
} as const;

export type StorageConfig = typeof STORAGE_CONFIG;
