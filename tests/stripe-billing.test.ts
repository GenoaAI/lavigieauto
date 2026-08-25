import { test, describe } from "node:test";
import assert from "node:assert";
import { calculateHouseholdSubscriptionPrice } from "../src/lib/integrations/stripe/pricing";
import { checkVehicleQuota } from "../src/lib/integrations/stripe/quota";
import { STRIPE_PRICING_CONFIG } from "../src/config/stripe.config";

describe("Sprint Stripe Billing & Quota Integrity", () => {
  test("1. Grille Tarifaire Dégressive : 1 Véhicule", () => {
    const pricing = calculateHouseholdSubscriptionPrice(1);
    assert.strictEqual(pricing.vehicleCount, 1);
    assert.strictEqual(pricing.monthlyTotalEur, 2.90);
    assert.strictEqual(pricing.annualTotalEur, 29.00);
    assert.strictEqual(pricing.savingsAnnualEur, 5.80); // (2.90 * 12) - 29 = 34.80 - 29 = 5.80 (2 mois offerts)
  });

  test("2. Grille Tarifaire Dégressive : 2 Véhicules", () => {
    const pricing = calculateHouseholdSubscriptionPrice(2);
    assert.strictEqual(pricing.vehicleCount, 2);
    // 2.90 + 1.60 = 4.50
    assert.strictEqual(pricing.monthlyTotalEur, 4.50);
    // 29.00 + 16.00 = 45.00
    assert.strictEqual(pricing.annualTotalEur, 45.00);
    assert.strictEqual(pricing.savingsAnnualEur, 9.00); // (4.50 * 12) - 45 = 54 - 45 = 9.00
  });

  test("3. Grille Tarifaire Dégressive : 4 Véhicules (Flotte Complète Foyer)", () => {
    const pricing = calculateHouseholdSubscriptionPrice(4);
    assert.strictEqual(pricing.vehicleCount, 4);
    // 2.90 + 1.60 + 1.00 + 1.00 = 6.50
    assert.strictEqual(pricing.monthlyTotalEur, 6.50);
    // 29.00 + 16.00 + 10.00 + 10.00 = 65.00
    assert.strictEqual(pricing.annualTotalEur, 65.00);
    assert.strictEqual(pricing.savingsAnnualEur, 13.00); // (6.50 * 12) - 65 = 78 - 65 = 13.00
  });

  test("4. Contrôle de Quota : Formule Découverte (Non Abonné)", () => {
    // 0 véhicule actif -> autorisé
    const check0 = checkVehicleQuota(0, { stripe_subscription_status: "none" });
    assert.strictEqual(check0.allowed, true);
    assert.strictEqual(check0.maxAllowed, 1);

    // 1 véhicule actif -> tentative d'en ajouter un 2e -> bloqué
    const check1 = checkVehicleQuota(1, { stripe_subscription_status: "none" });
    assert.strictEqual(check1.allowed, false);
    assert.strictEqual(check1.isSubscribed, false);
    assert.ok(check1.reason?.includes("Découverte"));
  });

  test("5. Contrôle de Quota : Formule Premium 2 Véhicules", () => {
    const premiumMeta = {
      stripe_subscription_status: "active",
      max_vehicles: 2,
      vehicle_quota: 2,
    };

    // 1 actif -> peut en activer un 2e
    const check1 = checkVehicleQuota(1, premiumMeta);
    assert.strictEqual(check1.allowed, true);
    assert.strictEqual(check1.maxAllowed, 2);

    // 2 actifs -> tentative d'en activer un 3e -> bloqué avec invite d'upgrade
    const check2 = checkVehicleQuota(2, premiumMeta);
    assert.strictEqual(check2.allowed, false);
    assert.strictEqual(check2.isSubscribed, true);
    assert.ok(check2.reason?.includes("2 véhicule(s)"));
  });

  test("6. Contrôle de Quota : Formule Premium 4 Véhicules", () => {
    const premiumMeta = {
      stripe_subscription_status: "active",
      max_vehicles: 4,
      vehicle_quota: 4,
    };

    // 3 actifs -> autorisé
    const check3 = checkVehicleQuota(3, premiumMeta);
    assert.strictEqual(check3.allowed, true);

    // 4 actifs -> bloqué pour le 5e
    const check4 = checkVehicleQuota(4, premiumMeta);
    assert.strictEqual(check4.allowed, false);
  });
});
