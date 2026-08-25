import { stripe } from "./client";
import { calculateHouseholdSubscriptionPrice } from "./pricing";

export async function createHouseholdSubscriptionCheckout(params: {
  foyerId: string;
  userEmail: string;
  vehicleCount: number;
  interval: "month" | "year";
  returnUrl: string;
}): Promise<{ url: string | null }> {
  const { foyerId, userEmail, vehicleCount, interval, returnUrl } = params;
  const pricing = calculateHouseholdSubscriptionPrice(vehicleCount);

  const amountEur = interval === "year" ? pricing.annualTotalEur : pricing.monthlyTotalEur;

  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `LaVigieAuto Foyer (${vehicleCount} véhicule${vehicleCount > 1 ? "s" : ""})`,
            description: "Analyses illimitées, calendrier Google partagé, kits de réservation et bilans constructeurs.",
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
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${returnUrl}?canceled=true`,
  });

  return { url: session.url };
}
