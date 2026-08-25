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
