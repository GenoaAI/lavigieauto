import { calculateHouseholdSubscriptionPrice } from "../src/lib/integrations/stripe/pricing";
import { checkVehicleQuota } from "../src/lib/integrations/stripe/quota";

export function testStripePricing() {
  console.log("▶ [TEST] Stripe : Grille Tarifaire Dégressive & Contrôle des Quotas...");

  // 1 véhicule : 2.90€ / mois (29€/an)
  const p1 = calculateHouseholdSubscriptionPrice(1);
  if (p1.monthlyTotalEur !== 2.90 || p1.annualTotalEur !== 29.00) {
    throw new Error(`Tarif 1 véhicule erroné : attendu 2.90€/m (29€/an), obtenu ${p1.monthlyTotalEur}€`);
  }
  if (p1.savingsAnnualEur !== 5.80) {
    throw new Error(`Remise annuelle 1 véhicule erronée : attendu 5.80€, obtenu ${p1.savingsAnnualEur}€`);
  }

  // 2 véhicules : 2.90 + 1.60 = 4.50€ / mois (45€/an)
  const p2 = calculateHouseholdSubscriptionPrice(2);
  if (p2.monthlyTotalEur !== 4.50 || p2.annualTotalEur !== 45.00) {
    throw new Error(`Tarif 2 véhicules erroné : attendu 4.50€/m (45€/an), obtenu ${p2.monthlyTotalEur}€`);
  }
  if (p2.savingsAnnualEur !== 9.00) {
    throw new Error(`Remise annuelle 2 véhicules erronée : attendu 9.00€, obtenu ${p2.savingsAnnualEur}€`);
  }

  // 4 véhicules : 4.50 + 1.00 + 1.00 = 6.50€ / mois (65€/an)
  const p4 = calculateHouseholdSubscriptionPrice(4);
  if (p4.monthlyTotalEur !== 6.50 || p4.annualTotalEur !== 65.00) {
    throw new Error(`Tarif 4 véhicules erroné : attendu 6.50€/m (65€/an), obtenu ${p4.monthlyTotalEur}€`);
  }

  // Contrôle des quotas Découverte (1 max)
  const discCheckAllowed = checkVehicleQuota(0, { stripe_subscription_status: "none" });
  if (!discCheckAllowed.allowed || discCheckAllowed.maxAllowed !== 1) {
    throw new Error("Formule Découverte devrait autoriser 1 véhicule");
  }

  const discCheckBlocked = checkVehicleQuota(1, { stripe_subscription_status: "none" });
  if (discCheckBlocked.allowed) {
    throw new Error("Formule Découverte devrait bloquer le 2e véhicule");
  }

  // Contrôle des quotas Premium (ex: 2 véhicules souscrits)
  const prem2Check = checkVehicleQuota(2, { stripe_subscription_status: "active", max_vehicles: 2 });
  if (prem2Check.allowed) {
    throw new Error("Formule Premium 2 véhicules devrait bloquer le 3e véhicule");
  }

  console.log("  ✔ Calcul des tarifs dégressifs et des économies annuelles validé.");
  console.log("  ✔ Contrôle strict des quotas de véhicules pour formules Découverte et Premium validé.");
}
