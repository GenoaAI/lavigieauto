import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/integrations/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";

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

        if (foyerId) {
          const { data: foyer } = await (supabase as any)
            .from("foyers")
            .select("id, metadata")
            .eq("id", foyerId)
            .maybeSingle();

          if (foyer && foyer.id) {
            const existingMeta = foyer.metadata || {};
            const vehicleCount = parseInt(session.metadata?.vehicle_count || "1", 10);

            await (supabase as any)
              .from("foyers")
              .update({
                metadata: {
                  ...existingMeta,
                  stripe_customer_id: session.customer,
                  stripe_subscription_id: session.subscription,
                  stripe_subscription_status: "active",
                  max_vehicles: vehicleCount,
                  vehicle_quota: vehicleCount,
                  plan: `foyer_${vehicleCount}_vehicules`,
                  activated_at: new Date().toISOString(),
                  plan_interval: session.metadata?.interval || "month",
                },
              })
              .eq("id", foyer.id);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        if (customerId) {
          const { data: foyer } = await (supabase as any)
            .from("foyers")
            .select("id, metadata")
            .eq("metadata->>stripe_customer_id", customerId)
            .maybeSingle();

          if (foyer && foyer.id) {
            await (supabase as any)
              .from("foyers")
              .update({
                metadata: {
                  ...foyer.metadata,
                  stripe_subscription_status: "active",
                  last_payment_date: new Date().toISOString(),
                },
              })
              .eq("id", foyer.id);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        if (customerId) {
          const { data: foyer } = await (supabase as any)
            .from("foyers")
            .select("id, metadata")
            .eq("metadata->>stripe_customer_id", customerId)
            .maybeSingle();

          if (foyer && foyer.id) {
            await (supabase as any)
              .from("foyers")
              .update({
                metadata: {
                  ...foyer.metadata,
                  stripe_subscription_status: "past_due",
                  last_payment_error: invoice.last_finalization_error?.message || "Échec du prélèvement",
                },
              })
              .eq("id", foyer.id);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const status = subscription.status === "active" || subscription.status === "trialing" ? "active" : "canceled";

        const { data: foyer } = await (supabase as any)
          .from("foyers")
          .select("id, metadata")
          .eq("metadata->>stripe_customer_id", customerId)
          .maybeSingle();

        if (foyer && foyer.id) {
          const existingMeta = foyer.metadata || {};
          const metaVehicleCount = subscription.metadata?.vehicle_count
            ? parseInt(subscription.metadata.vehicle_count, 10)
            : existingMeta.max_vehicles;

          await (supabase as any)
            .from("foyers")
            .update({
              metadata: {
                ...existingMeta,
                stripe_subscription_status: status,
                max_vehicles: metaVehicleCount || existingMeta.max_vehicles || 1,
                vehicle_quota: metaVehicleCount || existingMeta.vehicle_quota || 1,
                stripe_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              },
            })
            .eq("id", foyer.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const { data: foyer } = await (supabase as any)
          .from("foyers")
          .select("id, metadata")
          .eq("metadata->>stripe_customer_id", customerId)
          .maybeSingle();

        if (foyer && foyer.id) {
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
            })
            .eq("id", foyer.id);
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
