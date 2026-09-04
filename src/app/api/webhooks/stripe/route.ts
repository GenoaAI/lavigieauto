import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/integrations/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";
import { invalidateFoyerCache } from "@/app/actions/foyer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook signature or secret" }, { status: 400 });
  }

  let event: any;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error(`Erreur vérification webhook Stripe: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const foyerId = session.metadata?.foyer_id;
        const customerEmail =
          session.customer_details?.email ||
          session.customer_email ||
          session.metadata?.user_email;
        const customerName = session.customer_details?.name || customerEmail?.split("@")[0] || "Famille";
        const vehicleCount = parseInt(session.metadata?.vehicle_count || "1", 10);
        const interval = session.metadata?.interval || "month";

        const { data: allFoyers } = await (supabase as any).from("foyers").select("*");
        const matchedFoyer = (allFoyers || []).find(
          (f: any) =>
            (foyerId && f.id === foyerId) ||
            (customerEmail && (f.metadata as any)?.user_email?.toLowerCase() === customerEmail.toLowerCase())
        );

        const updatedMeta = {
          ...(matchedFoyer?.metadata || {}),
          user_email: customerEmail || matchedFoyer?.metadata?.user_email,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          stripe_subscription_status: "active",
          max_vehicles: vehicleCount,
          vehicle_quota: vehicleCount,
          plan: `foyer_${vehicleCount}_vehicules`,
          activated_at: new Date().toISOString(),
          plan_interval: interval,
        };

        if (matchedFoyer) {
          await (supabase as any)
            .from("foyers")
            .update({
              metadata: updatedMeta,
              updated_at: new Date().toISOString(),
            })
            .eq("id", matchedFoyer.id);
        } else {
          const targetId = foyerId || crypto.randomUUID();
          await (supabase as any).from("foyers").insert({
            id: targetId,
            nom: `Foyer ${customerName}`,
            description: "Espace automobile personnel",
            metadata: updatedMeta,
          });
        }

        await invalidateFoyerCache();
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        if (customerId) {
          let customerEmail = invoice.customer_email;
          if (!customerEmail) {
            try {
              const cust = await stripe.customers.retrieve(customerId);
              if (!cust.deleted && cust.email) customerEmail = cust.email;
            } catch {}
          }

          const { data: allFoyers } = await (supabase as any).from("foyers").select("*");
          const foyer = (allFoyers || []).find(
            (f: any) =>
              (f.metadata as any)?.stripe_customer_id === customerId ||
              (customerEmail && (f.metadata as any)?.user_email?.toLowerCase() === customerEmail.toLowerCase())
          );

          if (foyer) {
            await (supabase as any)
              .from("foyers")
              .update({
                metadata: {
                  ...foyer.metadata,
                  stripe_customer_id: customerId,
                  stripe_subscription_status: "active",
                  last_payment_date: new Date().toISOString(),
                },
                updated_at: new Date().toISOString(),
              })
              .eq("id", foyer.id);
            await invalidateFoyerCache();
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        if (customerId) {
          const { data: allFoyers } = await (supabase as any).from("foyers").select("*");
          const foyer = (allFoyers || []).find(
            (f: any) => (f.metadata as any)?.stripe_customer_id === customerId
          );

          if (foyer) {
            await (supabase as any)
              .from("foyers")
              .update({
                metadata: {
                  ...foyer.metadata,
                  stripe_subscription_status: "past_due",
                  last_payment_error: invoice.last_finalization_error?.message || "Échec du prélèvement",
                },
                updated_at: new Date().toISOString(),
              })
              .eq("id", foyer.id);
            await invalidateFoyerCache();
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status === "active" || subscription.status === "trialing" ? "active" : "canceled";

        let customerEmail: string | undefined;
        try {
          const cust = await stripe.customers.retrieve(customerId);
          if (!cust.deleted && cust.email) customerEmail = cust.email;
        } catch {}

        const { data: allFoyers } = await (supabase as any).from("foyers").select("*");
        const foyer = (allFoyers || []).find(
          (f: any) =>
            (f.metadata as any)?.stripe_customer_id === customerId ||
            (customerEmail && (f.metadata as any)?.user_email?.toLowerCase() === customerEmail.toLowerCase())
        );

        if (foyer) {
          const existingMeta = foyer.metadata || {};
          const metaVehicleCount = subscription.metadata?.vehicle_count
            ? parseInt(subscription.metadata.vehicle_count, 10)
            : existingMeta.max_vehicles;

          let safePeriodEnd: string | undefined = undefined;
          if (subscription.current_period_end) {
            const num = Number(subscription.current_period_end);
            if (!isNaN(num) && num > 0) {
              const ms = num < 10000000000 ? num * 1000 : num;
              const d = new Date(ms);
              if (!isNaN(d.getTime())) safePeriodEnd = d.toISOString();
            }
          }

          await (supabase as any)
            .from("foyers")
            .update({
              metadata: {
                ...existingMeta,
                stripe_customer_id: customerId,
                stripe_subscription_status: status,
                max_vehicles: metaVehicleCount || existingMeta.max_vehicles || 1,
                vehicle_quota: metaVehicleCount || existingMeta.vehicle_quota || 1,
                ...(safePeriodEnd ? { stripe_current_period_end: safePeriodEnd } : {}),
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", foyer.id);
          await invalidateFoyerCache();
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const { data: allFoyers } = await (supabase as any).from("foyers").select("*");
        const foyer = (allFoyers || []).find(
          (f: any) => (f.metadata as any)?.stripe_customer_id === customerId
        );

        if (foyer) {
          await (supabase as any)
            .from("foyers")
            .update({
              metadata: {
                ...foyer.metadata,
                stripe_subscription_status: "canceled",
                max_vehicles: 1,
                vehicle_quota: 1,
                canceled_at: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", foyer.id);
          await invalidateFoyerCache();
        }
        break;
      }

      default:
        break;
    }
  } catch (dbErr) {
    console.error("Erreur lors de la mise à jour base suite au webhook Stripe:", dbErr);
  }

  return NextResponse.json({ received: true });
}
