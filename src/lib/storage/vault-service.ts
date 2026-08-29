import { createAdminClient } from '@/lib/supabase/server';
import { STORAGE_CONFIG, VaultDocumentType } from '@/config/storage.config';

import crypto from 'crypto';

export interface UploadToVaultParams {
  fileBuffer: Buffer;
  mimeType: string;
  userId: string;
  vehicleId: string;
  metadata: {
    date: string;
    licensePlate: string;
    type: 'invoice' | 'technical_inspection' | 'registration_card';
    mileage: number;
    entityName?: string | null;
    originalFileName?: string;
    invoiceNumber?: string | null;
    uniqueHash?: string | null;
  };
}

export interface UploadToVaultResult {
  success: boolean;
  storagePath?: string;
  fileName?: string;
  signedUrl?: string;
  error?: string;
}

export interface VaultDocumentItem {
  id: string;
  vehicleId: string | null;
  fileName: string;
  storagePath: string;
  fileType: string;
  mimeType: string | null;
  dateDocument: string | null;
  mileageDocument: number | null;
  emitter: string | null;
  totalTTC: number | null;
  totalHT: number | null;
  confidenceScore: number | null;
  signedUrl: string | null;
  createdAt: string;
}

export interface VehicleVaultSummary {
  vehicleId: string;
  documentsCount: number;
  invoicesCount: number;
  inspectionsCount: number;
  registrationCount: number;
  totalScannedExpensesEur: number;
  documents: VaultDocumentItem[];
}

export class VaultStorageService {
  private static instance: VaultStorageService;

  private constructor() {}

  public static getInstance(): VaultStorageService {
    if (!VaultStorageService.instance) {
      VaultStorageService.instance = new VaultStorageService();
    }
    return VaultStorageService.instance;
  }

  /**
   * 1. Téléverser et classifier un scan dans le coffre-fort Supabase Storage
   */
  public async uploadToVault(params: UploadToVaultParams): Promise<UploadToVaultResult> {
    const { fileBuffer, mimeType, userId, vehicleId, metadata } = params;
    const supabase = createAdminClient();

    // A. Validation de la taille du fichier
    if (fileBuffer.byteLength > STORAGE_CONFIG.maxFileSizeBytes) {
      return {
        success: false,
        error: `Fichier trop volumineux (${(fileBuffer.byteLength / (1024 * 1024)).toFixed(1)} Mo). La limite maximale autorisée est de 15 Mo.`,
      };
    }

    // B. Validation du type MIME
    const isAllowedMime = (STORAGE_CONFIG.allowedMimeTypes as readonly string[]).includes(mimeType);
    if (!isAllowedMime) {
      return {
        success: false,
        error: `Type de fichier non autorisé (${mimeType}). Formats acceptés : PDF, JPEG, PNG, WEBP, HEIC.`,
      };
    }

    // C. Détermination de l'extension et du dossier
    let ext = 'pdf';
    if (mimeType === 'image/jpeg') ext = 'jpg';
    else if (mimeType === 'image/png') ext = 'png';
    else if (mimeType === 'image/webp') ext = 'webp';
    else if (mimeType === 'image/heic') ext = 'heic';
    else if (metadata.originalFileName?.includes('.')) {
      ext = metadata.originalFileName.split('.').pop() || 'pdf';
    }

    let folder: string = STORAGE_CONFIG.folders.invoices;
    if (metadata.type === 'technical_inspection') folder = STORAGE_CONFIG.folders.inspections;
    else if (metadata.type === 'registration_card') folder = STORAGE_CONFIG.folders.registration;

    // D. Hash de contenu unique garantissant l'absence de collision physique
    const uniqueHash = metadata.uniqueHash || crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 8);

    // E. Nomenclature prédictive et construction du chemin
    const fileName = STORAGE_CONFIG.formatFileName({
      date: metadata.date,
      licensePlate: metadata.licensePlate,
      type: metadata.type,
      mileage: metadata.mileage,
      entityName: metadata.entityName,
      extension: ext,
      invoiceNumber: metadata.invoiceNumber,
      uniqueHash,
    });

    const storagePath = STORAGE_CONFIG.buildStoragePath({
      userId,
      vehicleId,
      folder,
      fileName,
    });

    // E. Upload physique sur Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Erreur lors du téléversement dans le coffre-fort:', uploadError);
      return {
        success: false,
        error: `Échec du stockage dans le coffre-fort : ${uploadError.message}`,
      };
    }

    // F. Génération immédiate d'une URL signée pour la session
    const signedUrl = await this.getDocumentSignedUrl(storagePath);

    return {
      success: true,
      storagePath,
      fileName,
      signedUrl: signedUrl || undefined,
    };
  }

  /**
   * 2. Générer une URL signée sécurisée (1 heure par défaut)
   */
  public async getDocumentSignedUrl(
    storagePath: string,
    expiresInSeconds: number = STORAGE_CONFIG.signedUrlDurationSeconds
  ): Promise<string | null> {
    if (!storagePath) return null;
    const supabase = createAdminClient();

    const { data, error } = await supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn(`Impossible de générer l'URL signée pour ${storagePath}:`, error?.message);
      return null;
    }

    return data.signedUrl;
  }

  /**
   * 3. Supprimer un document physique du coffre-fort
   */
  public async deleteFromVault(storagePath: string): Promise<boolean> {
    if (!storagePath) return false;
    const supabase = createAdminClient();

    const { error } = await supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .remove([storagePath]);

    if (error) {
      console.error(`Erreur lors de la suppression de ${storagePath}:`, error);
      return false;
    }

    return true;
  }

  /**
   * 4. Récupérer l'inventaire complet et ordonné du coffre-fort d'un véhicule
   */
  public async getVehicleVaultSummary(vehicleId: string): Promise<VehicleVaultSummary> {
    const supabase = createAdminClient();

    const { data: documents, error } = await (supabase as any)
      .from('documents_sources')
      .select('*')
      .eq('vehicule_id', vehicleId)
      .order('date_document', { ascending: false, nullsFirst: false });

    if (error || !documents) {
      return {
        vehicleId,
        documentsCount: 0,
        invoicesCount: 0,
        inspectionsCount: 0,
        registrationCount: 0,
        totalScannedExpensesEur: 0,
        documents: [],
      };
    }

    const items: VaultDocumentItem[] = [];
    let totalExpenses = 0;
    let invoices = 0;
    let inspections = 0;
    let registrations = 0;

    for (const doc of documents) {
      const signedUrl = doc.storage_path
        ? await this.getDocumentSignedUrl(doc.storage_path)
        : null;

      const ttc = Number(doc.montant_ttc) || 0;
      totalExpenses += ttc;

      if (doc.file_type === 'facture') invoices++;
      else if (doc.file_type === 'controle_technique') inspections++;
      else if (doc.file_type === 'carte_grise') registrations++;

      items.push({
        id: doc.id,
        vehicleId: doc.vehicule_id,
        fileName: doc.nom_fichier,
        storagePath: doc.storage_path,
        fileType: doc.file_type,
        mimeType: doc.mime_type,
        dateDocument: doc.date_document,
        mileageDocument: doc.kilometrage_document,
        emitter: doc.emetteur,
        totalTTC: doc.montant_ttc,
        totalHT: doc.montant_ht,
        confidenceScore: doc.confidence_score,
        signedUrl,
        createdAt: doc.created_at,
      });
    }

    return {
      vehicleId,
      documentsCount: items.length,
      invoicesCount: invoices,
      inspectionsCount: inspections,
      registrationCount: registrations,
      totalScannedExpensesEur: Math.round(totalExpenses * 100) / 100,
      documents: items,
    };
  }
}

export const vaultStorageService = VaultStorageService.getInstance();
