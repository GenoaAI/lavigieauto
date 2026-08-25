import { stripe } from "./client";
import { calculateHouseholdSubscriptionPrice } from "./pricing";

export async function createHouseholdSubscriptionCheckout(params: {
  foyerId: string;
  userEmail: string;
  customerId?: string;
  vehicleCount: number;
  interval: "month" | "year";
  returnUrl: string;
}): Promise<{ url: string | null }> {
  const { foyerId, userEmail, customerId, vehicleCount, interval, returnUrl } = params;
  const pricing = calculateHouseholdSubscriptionPrice(vehicleCount);

  const amountEur = interval === "year" ? pricing.annualTotalEur : pricing.monthlyTotalEur;

  const sessionParams: any = {
    mode: "subscription",
    payment_method_types: ["card", "link"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `LaVigieAuto Foyer (${vehicleCount} véhicule${vehicleCount > 1 ? "s" : ""})`,
            description: "Surveillance prédictive de la flotte, carnets constructeurs officiels et alertes Google Calendar.",
          },
          unit_amount: Math.round(amountEur * 100),
          recurring: {
            interval,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      foyer_id: foyerId,
      vehicle_count: vehicleCount.toString(),
      interval,
    },
    allow_promotion_codes: true,
    locale: "fr",
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${returnUrl}?canceled=true`,
  };

  if (customerId) {
    sessionParams.customer = customerId;
    sessionParams.customer_update = {
      name: "auto",
      address: "auto",
    };
  } else {
    sessionParams.customer_email = userEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return { url: session.url };
}
