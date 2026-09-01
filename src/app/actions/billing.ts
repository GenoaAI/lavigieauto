"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/integrations/stripe/client";
import { calculateHouseholdSubscriptionPrice } from "@/lib/integrations/stripe/pricing";
import { createHouseholdSubscriptionCheckout } from "@/lib/integrations/stripe/checkout";
import { getFoyerOverviewAction, invalidateFoyerCache } from "@/app/actions/foyer";
import { cookies } from "next/headers";

import { isVehicleTrackingSuspended } from "@/lib/types/database.types";
import { checkVehicleQuota } from "@/lib/integrations/stripe/quota";

export interface BillingStatusResult {
  isSubscribed: boolean;
  status: "active" | "trialing" | "canceled" | "past_due" | "canceling" | "none";
  vehicleCount: number;
  maxVehicles: number;
  activeVehicleCount: number;
  totalVehicleCount: number;
  quotaExceeded: boolean;
  monthlyPriceEur: number;
  annualPriceEur: number;
  planName: string;
  customerEmail?: string;
  portalAvailable: boolean;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
  interval?: "month" | "year";
}

/**
 * Récupère le statut d'abonnement Stripe et le quota de véhicules du foyer actuel
 */
export async function getHouseholdBillingStatusAction(): Promise<BillingStatusResult> {
  try {
    let foyerData = await getFoyerOverviewAction();
    let foyer = foyerData.foyer;
    const allVehicles = foyerData.vehicles || [];
    const activeVehicles = allVehicles.filter((v) => !isVehicleTrackingSuspended(v));
    
    let metadata = (foyer as any)?.metadata || {};
    let subStatus = metadata.stripe_subscription_status;
    let isSubscribed = subStatus === "active" || subStatus === "canceling";

    const cookieStore = await cookies();
    const userEmail = cookieStore.get("gcal_user_email")?.value || metadata.user_email;

    // Auto-réconciliation Stripe : Si le statut local est 'none'/'canceled' mais que Stripe a un abonnement actif
    if (!isSubscribed && userEmail && process.env.STRIPE_SECRET_KEY) {
      try {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          const customer = customers.data[0];
          const subs = await stripe.subscriptions.list({ customer: customer.id, status: "active", limit: 1 });
          if (subs.data.length > 0) {
            const activeSub = subs.data[0];
            const vCount = parseInt(activeSub.metadata?.vehicle_count || "1", 10);
            const adminSupabase = createAdminClient();
            const isCanceling = Boolean(activeSub.cancel_at_period_end);

            metadata = {
              ...metadata,
              stripe_customer_id: customer.id,
              stripe_subscription_id: activeSub.id,
              stripe_subscription_status: isCanceling ? "canceling" : "active",
              cancel_at_period_end: isCanceling,
              max_vehicles: vCount,
              vehicle_quota: vCount,
              plan: `foyer_${vCount}_vehicules`,
              activated_at: new Date().toISOString(),
              stripe_current_period_end: new Date(activeSub.current_period_end * 1000).toISOString(),
            };

            if (foyer?.id) {
              await (adminSupabase as any)
                .from("foyers")
                .update({ metadata, updated_at: new Date().toISOString() })
                .eq("id", foyer.id);
            }

            await invalidateFoyerCache();
            isSubscribed = true;
            subStatus = isCanceling ? "canceling" : "active";
          }
        }
      } catch (reconcileErr) {
        console.warn("Auto-réconciliation Stripe discrète:", reconcileErr);
      }
    }

    // Quota souscrit
    const maxVehicles = isSubscribed
      ? Number(metadata.max_vehicles || metadata.vehicle_quota || (allVehicles.length > 0 ? allVehicles.length : 1))
      : 1;

    const pricing = calculateHouseholdSubscriptionPrice(maxVehicles);
    const quotaExceeded = isSubscribed
      ? activeVehicles.length > maxVehicles
      : allVehicles.length > 1;

    const cancelAtPeriodEnd = Boolean(metadata.cancel_at_period_end || subStatus === "canceling");
    const currentPeriodEnd = metadata.stripe_current_period_end;
    const planInterval = metadata.plan_interval || "month";

    return {
      isSubscribed,
      status: isSubscribed ? (subStatus as any) : "none",
      vehicleCount: maxVehicles,
      maxVehicles,
      activeVehicleCount: activeVehicles.length,
      totalVehicleCount: allVehicles.length,
      quotaExceeded,
      monthlyPriceEur: pricing.monthlyTotalEur,
      annualPriceEur: pricing.annualTotalEur,
      planName: isSubscribed
        ? `Formule Foyer (${maxVehicles} véhicule${maxVehicles > 1 ? "s" : ""})`
        : "Formule Découverte (1 véhicule)",
      customerEmail: userEmail || "contact@lavigieauto.com",
      portalAvailable: Boolean(metadata.stripe_customer_id),
      cancelAtPeriodEnd,
      currentPeriodEnd,
      interval: planInterval,
    };
  } catch (err) {
    console.warn("Erreur getHouseholdBillingStatusAction:", err);
    return {
      isSubscribed: false,
      status: "none",
      vehicleCount: 1,
      maxVehicles: 1,
      activeVehicleCount: 0,
      totalVehicleCount: 0,
      quotaExceeded: false,
      monthlyPriceEur: 2.90,
      annualPriceEur: 29.00,
      planName: "Formule Découverte (1 véhicule)",
      portalAvailable: false,
      cancelAtPeriodEnd: false,
    };
  }
}

/**
 * Résilie l'abonnement du foyer (par défaut à la fin de la période payée, ou immédiatement)
 */
export async function cancelHouseholdSubscriptionAction(params?: {
  immediate?: boolean;
}): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const foyerData = await getFoyerOverviewAction();
    const foyer = foyerData.foyer;
    const cookieStore = await cookies();
    const userEmail = cookieStore.get("gcal_user_email")?.value || (foyer as any)?.metadata?.user_email;
    const adminSupabase = createAdminClient();

    let subscriptionId = (foyer as any)?.metadata?.stripe_subscription_id;
    let customerId = (foyer as any)?.metadata?.stripe_customer_id;

    if (!subscriptionId && (customerId || userEmail)) {
      if (!customerId && userEmail) {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) customerId = customers.data[0].id;
      }
      if (customerId) {
        const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
        if (subs.data.length > 0) subscriptionId = subs.data[0].id;
      }
    }

    if (!subscriptionId) {
      return { success: false, message: "Aucun abonnement Stripe actif trouvé à résilier." };
    }

    if (params?.immediate) {
      await stripe.subscriptions.cancel(subscriptionId);
      if (foyer?.id) {
        await (adminSupabase as any)
          .from("foyers")
          .update({
            metadata: {
              ...(foyer as any).metadata,
              stripe_subscription_status: "canceled",
              max_vehicles: 1,
              vehicle_quota: 1,
              cancel_at_period_end: false,
              canceled_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", foyer.id);
      }
      await invalidateFoyerCache();
      return {
        success: true,
        message: "Votre abonnement a été résilié immédiatement. Votre formule repasse en Découverte (1 véhicule gratuit).",
      };
    } else {
      const updatedSub = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      const periodEndDate = new Date(updatedSub.current_period_end * 1000);
      const periodEndFormatted = periodEndDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      if (foyer?.id) {
        await (adminSupabase as any)
          .from("foyers")
          .update({
            metadata: {
              ...(foyer as any).metadata,
              stripe_subscription_status: "canceling",
              cancel_at_period_end: true,
              canceled_at: new Date().toISOString(),
              stripe_current_period_end: periodEndDate.toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", foyer.id);
      }

      await invalidateFoyerCache();
      return {
        success: true,
        message: `Votre demande de résiliation a bien été prise en compte. Votre abonnement prendra fin le ${periodEndFormatted}. Vos fonctionnalités restent actives jusqu'à cette date.`,
      };
    }
  } catch (err: any) {
    console.error("Erreur cancelHouseholdSubscriptionAction:", err);
    return { success: false, message: err.message || "Erreur lors de la résiliation de l'abonnement." };
  }
}

/**
 * Reprend ou réactive un abonnement dont la résiliation avait été programmée à l'échéance
 */
export async function resumeHouseholdSubscriptionAction(): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const foyerData = await getFoyerOverviewAction();
    const foyer = foyerData.foyer;
    const cookieStore = await cookies();
    const userEmail = cookieStore.get("gcal_user_email")?.value || (foyer as any)?.metadata?.user_email;
    const adminSupabase = createAdminClient();

    let subscriptionId = (foyer as any)?.metadata?.stripe_subscription_id;
    let customerId = (foyer as any)?.metadata?.stripe_customer_id;

    if (!subscriptionId && (customerId || userEmail)) {
      if (!customerId && userEmail) {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) customerId = customers.data[0].id;
      }
      if (customerId) {
        const subs = await stripe.subscriptions.list({ customer: customerId, limit: 5 });
        const targetSub = subs.data.find((s) => s.cancel_at_period_end || s.status === "active");
        if (targetSub) subscriptionId = targetSub.id;
      }
    }

    if (!subscriptionId) {
      return { success: false, message: "Aucun abonnement trouvé à réactiver." };
    }

    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    if (foyer?.id) {
      await (adminSupabase as any)
        .from("foyers")
        .update({
          metadata: {
            ...(foyer as any).metadata,
            stripe_subscription_status: "active",
            cancel_at_period_end: false,
            canceled_at: null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", foyer.id);
    }

    await invalidateFoyerCache();
    return {
      success: true,
      message: "Votre abonnement Foyer Premium a été réactivé avec succès ! Le renouvellement automatique est rétabli.",
    };
  } catch (err: any) {
    console.error("Erreur resumeHouseholdSubscriptionAction:", err);
    return { success: false, message: err.message || "Erreur lors de la réactivation de l'abonnement." };
  }
}

/**
 * Synchronise et active immédiatement l'abonnement Foyer depuis Stripe (via sessionId ou email utilisateur)
 */
export async function syncHouseholdSubscriptionAction(sessionId?: string): Promise<{
  success: boolean;
  isSubscribed: boolean;
  message?: string;
}> {
  try {
    const foyerData = await getFoyerOverviewAction();
    const foyer = foyerData.foyer;
    const adminSupabase = createAdminClient();
    const cookieStore = await cookies();
    const userEmail = cookieStore.get("gcal_user_email")?.value || (foyer as any)?.metadata?.user_email;

    let targetFoyerId = foyer?.id;
    let customerId = (foyer as any)?.metadata?.stripe_customer_id;
    let subscriptionId = (foyer as any)?.metadata?.stripe_subscription_id;
    let vehicleCount = Number((foyer as any)?.metadata?.max_vehicles || 1);
    let planInterval = (foyer as any)?.metadata?.plan_interval || "month";
    let periodEnd: string | undefined = undefined;
    let isSubscribed = false;

    // 1. Si un sessionId Stripe Checkout est fourni (retour de paiement)
    if (sessionId && sessionId.startsWith("cs_")) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === "paid" || session.status === "complete") {
          isSubscribed = true;
          customerId = typeof session.customer === "string" ? session.customer : (session.customer as any)?.id;
          subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription as any)?.id;
          if (session.metadata?.foyer_id) targetFoyerId = session.metadata.foyer_id;
          if (session.metadata?.vehicle_count) vehicleCount = parseInt(session.metadata.vehicle_count, 10);
          if (session.metadata?.interval) planInterval = session.metadata.interval as any;
        }
      } catch (stripeErr) {
        console.warn("Erreur récupération checkout session Stripe:", stripeErr);
      }
    }

    // 2. Si pas encore résolu, recherche par email utilisateur sur Stripe
    if (!isSubscribed && userEmail) {
      try {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          const customer = customers.data[0];
          customerId = customer.id;
          const subs = await stripe.subscriptions.list({ customer: customer.id, status: "active", limit: 1 });
          if (subs.data.length > 0) {
            const sub = subs.data[0];
            isSubscribed = true;
            subscriptionId = sub.id;
            periodEnd = new Date(sub.current_period_end * 1000).toISOString();
            if (sub.metadata?.vehicle_count) {
              vehicleCount = parseInt(sub.metadata.vehicle_count, 10);
            }
          }
        }
      } catch (custErr) {
        console.warn("Erreur recherche client Stripe par email:", custErr);
      }
    }

    // 3. Mise à jour ou insertion dans Supabase DB
    if (isSubscribed) {
      const { data: allFoyers } = await (adminSupabase as any).from("foyers").select("*");
      const matched = (allFoyers || []).find(
        (f: any) =>
          f.id === targetFoyerId ||
          (userEmail && (f.metadata as any)?.user_email?.toLowerCase() === userEmail.toLowerCase())
      );

      const updatedMeta = {
        ...((matched as any)?.metadata || (foyer as any)?.metadata || {}),
        user_email: userEmail || ((matched as any)?.metadata?.user_email),
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_subscription_status: "active",
        max_vehicles: vehicleCount,
        vehicle_quota: vehicleCount,
        plan: `foyer_${vehicleCount}_vehicules`,
        plan_interval: planInterval,
        activated_at: new Date().toISOString(),
        ...(periodEnd ? { stripe_current_period_end: periodEnd } : {}),
      };

      if (matched) {
        await (adminSupabase as any)
          .from("foyers")
          .update({ metadata: updatedMeta, updated_at: new Date().toISOString() })
          .eq("id", matched.id);
      } else if (targetFoyerId) {
        await (adminSupabase as any).from("foyers").insert({
          id: targetFoyerId,
          nom: foyer?.nom || `Foyer ${userEmail?.split("@")[0] || "Famille"}`,
          description: "Espace automobile personnel",
          metadata: updatedMeta,
        });
      }

      await invalidateFoyerCache();
      return { success: true, isSubscribed: true, message: "Abonnement Premium synchronisé avec succès." };
    }

    return { success: true, isSubscribed: false };
  } catch (err: any) {
    console.error("Erreur syncHouseholdSubscriptionAction:", err);
    return { success: false, isSubscribed: false, message: err.message };
  }
}

/**
 * Crée une session Stripe Checkout pour l'abonnement du foyer
 */
export async function createCheckoutSessionAction(params: {
  interval: "month" | "year";
  vehicleCount?: number;
}): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const foyerData = await getFoyerOverviewAction();
    const foyer = foyerData.foyer;
    const vehicleCount = params.vehicleCount && params.vehicleCount >= 1
      ? params.vehicleCount
      : Math.max(1, foyerData.vehicles?.length || 1);

    const cookieStore = await cookies();
    const userEmail = cookieStore.get("gcal_user_email")?.value || (foyer as any)?.metadata?.user_email || "conducteur@lavigieauto.com";
    const customerId = (foyer as any)?.metadata?.stripe_customer_id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await createHouseholdSubscriptionCheckout({
      foyerId: foyer?.id || "foyer-demo",
      userEmail,
      customerId,
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
