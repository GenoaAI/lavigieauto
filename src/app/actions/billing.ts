"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/integrations/stripe/client";
import { calculateHouseholdSubscriptionPrice } from "@/lib/integrations/stripe/pricing";
import { createHouseholdSubscriptionCheckout } from "@/lib/integrations/stripe/checkout";
import { getFoyerOverviewAction } from "@/app/actions/foyer";
import { cookies } from "next/headers";

export interface BillingStatusResult {
  isSubscribed: boolean;
  status: "active" | "trialing" | "canceled" | "none";
  vehicleCount: number;
  monthlyPriceEur: number;
  annualPriceEur: number;
  planName: string;
  customerEmail?: string;
  portalAvailable: boolean;
}

/**
 * Récupère le statut d'abonnement Stripe du foyer actuel
 */
export async function getHouseholdBillingStatusAction(): Promise<BillingStatusResult> {
  try {
    const foyerData = await getFoyerOverviewAction();
    const foyer = foyerData.foyer;
    const vehicleCount = foyerData.vehicles?.length || 1;
    const pricing = calculateHouseholdSubscriptionPrice(vehicleCount);

    const metadata = (foyer as any)?.metadata || {};
    const subStatus = metadata.stripe_subscription_status;
    const isSubscribed = subStatus === "active" || subStatus === "trialing";

    const cookieStore = await cookies();
    const userEmail = cookieStore.get("gcal_user_email")?.value || metadata.user_email || "contact@lavigieauto.fr";

    return {
      isSubscribed,
      status: isSubscribed ? (subStatus as any) : "none",
      vehicleCount,
      monthlyPriceEur: pricing.monthlyTotalEur,
      annualPriceEur: pricing.annualTotalEur,
      planName: `Formule Foyer (${vehicleCount} véhicule${vehicleCount > 1 ? "s" : ""})`,
      customerEmail: userEmail,
      portalAvailable: Boolean(metadata.stripe_customer_id),
    };
  } catch (err) {
    console.warn("Erreur getHouseholdBillingStatusAction:", err);
    return {
      isSubscribed: false,
      status: "none",
      vehicleCount: 1,
      monthlyPriceEur: 2.90,
      annualPriceEur: 29.00,
      planName: "Formule Foyer (1 véhicule)",
      portalAvailable: false,
    };
  }
}

/**
 * Crée une session Stripe Checkout pour l'abonnement du foyer
 */
export async function createCheckoutSessionAction(params: {
  interval: "month" | "year";
}): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const foyerData = await getFoyerOverviewAction();
    const foyer = foyerData.foyer;
    const vehicleCount = Math.max(1, foyerData.vehicles?.length || 1);

    const cookieStore = await cookies();
    const userEmail = cookieStore.get("gcal_user_email")?.value || (foyer as any)?.metadata?.user_email || "conducteur@lavigieauto.fr";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await createHouseholdSubscriptionCheckout({
      foyerId: foyer?.id || "foyer-demo",
      userEmail,
      vehicleCount,
      interval: params.interval,
      returnUrl: `${appUrl}/dashboard`,
    });

    if (!session.url) {
      throw new Error("Impossible de générer le lien de paiement Stripe.");
    }

    return { success: true, url: session.url };
  } catch (err: any) {
    console.error("Erreur createCheckoutSessionAction:", err);
    return { success: false, error: err.message || "Erreur de paiement" };
  }
}

/**
 * Ouvre le portail client Stripe (gestion CB, factures, résiliation)
 */
export async function createCustomerPortalAction(): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const foyerData = await getFoyerOverviewAction();
    const customerId = (foyerData.foyer as any)?.metadata?.stripe_customer_id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!customerId) {
      return { success: false, error: "Aucun profil de facturation Stripe trouvé." };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard`,
    });

    return { success: true, url: session.url };
  } catch (err: any) {
    console.error("Erreur createCustomerPortalAction:", err);
    return { success: false, error: err.message || "Erreur portail client" };
  }
}
