"use server";

import { vaultStorageService, VehicleVaultSummary } from "@/lib/storage/vault-service";
import { createAdminClient } from "@/lib/supabase/server";
import { requireUserHouseholdContext, assertVehicleOwnership } from "@/lib/security/auth-context";
import { deleteDocumentAndRecalculateAction } from "@/app/actions/documents";

export async function getVehicleVaultAction(vehicleId: string): Promise<VehicleVaultSummary> {
  try {
    const context = await requireUserHouseholdContext();
    const realVehicleId = await assertVehicleOwnership(vehicleId, context.foyerId);
    return await vaultStorageService.getVehicleVaultSummary(realVehicleId);
  } catch {
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
}

export async function getDocumentSignedUrlAction(
  storagePath: string
): Promise<{ signedUrl: string | null; error?: string }> {
  try {
    const context = await requireUserHouseholdContext();
    const cleanPath = (storagePath || "").trim();

    if (!cleanPath) {
      return { signedUrl: null, error: "Chemin de document manquant." };
    }

    const pathUserId = cleanPath.split("/")[0];
    if (pathUserId !== context.userId) {
      const adminSupabase = createAdminClient();
      const { data: doc } = await (adminSupabase as any)
        .from("documents_sources")
        .select("id, foyer_id")
        .eq("storage_path", cleanPath)
        .maybeSingle();

      if (!doc || doc.foyer_id !== context.foyerId) {
        return { signedUrl: null, error: "Action non autorisée sur ce document." };
      }
    }

    const signedUrl = await vaultStorageService.getDocumentSignedUrl(cleanPath);
    return { signedUrl };
  } catch (err: any) {
    return { signedUrl: null, error: err.message || "Erreur lors de la génération de l'accès sécurisé." };
  }
}

export async function deleteVaultDocumentAction(
  documentId: string,
  storagePath: string,
  vehicleId?: string
): Promise<{ success: boolean; error?: string }> {
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
