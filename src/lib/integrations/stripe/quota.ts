import { createAdminClient } from "@/lib/supabase/server";

export interface QuotaCheckResult {
  allowed: boolean;
  totalUploaded: number;
  hasActiveSubscription: boolean;
  freeDocumentUsed: boolean;
}

/**
 * Check if a user / foyer is allowed to upload another document
 * Rule: Document #1 is 100% free. Document #2+ requires active subscription.
 */
export async function checkDocumentQuota(userId: string): Promise<QuotaCheckResult> {
  const supabase = createAdminClient();

  // Find foyer membership
  const { data: member } = await supabase
    .from("foyer_members")
    .select("foyer_id, foyers (*)")
    .eq("user_id", userId)
    .single();

  if (!member || !member.foyer_id) {
    // If not in foyer yet, allow 1st document
    return {
      allowed: true,
      totalUploaded: 0,
      hasActiveSubscription: false,
      freeDocumentUsed: false,
    };
  }

  // Count existing documents in this foyer
  const { count } = await supabase
    .from("documents_sources")
    .select("*", { count: "exact", head: true })
    .eq("foyer_id", member.foyer_id);

  const total = count || 0;
  const foyerMetadata = (member.foyers as any)?.metadata || {};
  const hasSubscription = Boolean(foyerMetadata.stripe_subscription_status === "active");

  if (total === 0) {
    return {
      allowed: true,
      totalUploaded: total,
      hasActiveSubscription: hasSubscription,
      freeDocumentUsed: false,
    };
  }

  if (hasSubscription) {
    return {
      allowed: true,
      totalUploaded: total,
      hasActiveSubscription: true,
      freeDocumentUsed: true,
    };
  }

  // Total >= 1 and no active subscription
  return {
    allowed: false,
    totalUploaded: total,
    hasActiveSubscription: false,
    freeDocumentUsed: true,
  };
}

export interface VehicleQuotaCheckResult {
  allowed: boolean;
  currentActiveCount: number;
  maxAllowed: number;
  isSubscribed: boolean;
  reason?: string;
}

/**
 * Vérifie si le foyer peut ajouter ou réactiver un véhicule selon son quota d'abonnement
 */
export function checkVehicleQuota(
  activeVehiclesCount: number,
  foyerMetadata?: any
): VehicleQuotaCheckResult {
  const metadata = foyerMetadata || {};
  const isSubscribed = metadata.stripe_subscription_status === "active";

  // Formule Découverte : 1 véhicule max
  // Formule Premium : quota souscrit (ex: 1, 2, 3, 4+ véhicules)
  const maxAllowed = isSubscribed
    ? Number(metadata.max_vehicles || metadata.vehicle_quota || 4)
    : 1;

  if (activeVehiclesCount < maxAllowed) {
    return {
      allowed: true,
      currentActiveCount: activeVehiclesCount,
      maxAllowed,
      isSubscribed,
    };
  }

  return {
    allowed: false,
    currentActiveCount: activeVehiclesCount,
    maxAllowed,
    isSubscribed,
    reason: isSubscribed
      ? `Votre abonnement actuel couvre ${maxAllowed} véhicule(s). Pour activer ce véhicule supplémentaire, ajustez la capacité de votre formule.`
      : `La formule Découverte permet de suivre 1 véhicule. Passez en Premium (à partir de 2,90€ / mois) pour gérer plusieurs véhicules dans votre foyer.`,
  };
}
