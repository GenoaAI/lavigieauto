import { calculateHouseholdSubscriptionPrice } from "../src/lib/integrations/stripe/pricing";

export function testStripePricing() {
  console.log("▶ [TEST] Stripe : Grille Tarifaire Dégressive du Foyer...");

  // 1 véhicule : 2.90€ / mois
  const p1 = calculateHouseholdSubscriptionPrice(1);
  if (p1.monthlyTotalEur !== 2.90 || p1.annualTotalEur !== 29.00) {
    throw new Error(`Tarif 1 véhicule erroné : attendu 2.90€/m (29€/an), obtenu ${p1.monthlyTotalEur}€`);
  }

  // 2 véhicules : 2.90 + 1.60 = 4.50€ / mois (45€/an)
  const p2 = calculateHouseholdSubscriptionPrice(2);
  if (p2.monthlyTotalEur !== 4.50 || p2.annualTotalEur !== 45.00) {
    throw new Error(`Tarif 2 véhicules erroné : attendu 4.50€/m (45€/an), obtenu ${p2.monthlyTotalEur}€`);
  }

  // 3 véhicules : 4.50 + 1.00 = 5.50€ / mois (55€/an)
  const p3 = calculateHouseholdSubscriptionPrice(3);
  if (p3.monthlyTotalEur !== 5.50 || p3.annualTotalEur !== 55.00) {
    throw new Error(`Tarif 3 véhicules erroné : attendu 5.50€/m (55€/an), obtenu ${p3.monthlyTotalEur}€`);
  }

  console.log("  ✔ Calcul des tarifs dégressifs validé pour 1, 2 et 3+ véhicules.");
}
