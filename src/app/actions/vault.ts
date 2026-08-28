"use server";

import { vaultStorageService, VehicleVaultSummary } from "@/lib/storage/vault-service";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getVehicleVaultAction(vehicleId: string): Promise<VehicleVaultSummary> {
  return await vaultStorageService.getVehicleVaultSummary(vehicleId);
}

export async function getDocumentSignedUrlAction(storagePath: string): Promise<{ signedUrl: string | null; error?: string }> {
  try {
    const signedUrl = await vaultStorageService.getDocumentSignedUrl(storagePath);
    return { signedUrl };
  } catch (err: any) {
    return { signedUrl: null, error: err.message || "Erreur lors de la génération de l'accès sécurisé." };
  }
}

import { deleteDocumentAndRecalculateAction } from "@/app/actions/documents";

export async function deleteVaultDocumentAction(documentId: string, storagePath: string, vehicleId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await deleteDocumentAndRecalculateAction({
      documentId,
      storagePath,
      vehicleId,
    });
    return { success: res.success, error: res.error };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors de la suppression." };
  }
}
