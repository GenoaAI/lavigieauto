import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/integrations/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";

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
            .select("metadata")
            .eq("id", foyerId)
            .single();

          const existingMeta = foyer?.metadata || {};

          await (supabase as any)
            .from("foyers")
            .update({
              metadata: {
                ...existingMeta,
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription,
                stripe_subscription_status: "active",
                activated_at: new Date().toISOString(),
                plan_interval: session.metadata?.interval || "month",
              },
            })
            .eq("id", foyerId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const status = subscription.status === "active" || subscription.status === "trialing" ? "active" : "canceled";

        await (supabase as any)
          .from("foyers")
          .update({
            metadata: {
              stripe_subscription_status: status,
              stripe_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            },
          })
          .eq("metadata->>stripe_customer_id", customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        await (supabase as any)
          .from("foyers")
          .update({
            metadata: {
              stripe_subscription_status: "canceled",
              canceled_at: new Date().toISOString(),
            },
          })
          .eq("metadata->>stripe_customer_id", customerId);
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }
  } catch (dbErr) {
    console.error("Erreur lors de la mise à jour base suite au webhook Stripe:", dbErr);
  }

  return NextResponse.json({ received: true });
}
