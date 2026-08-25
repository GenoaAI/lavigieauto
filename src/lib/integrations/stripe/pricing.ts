import { STRIPE_PRICING_CONFIG } from "@/config/stripe.config";

export interface TierPricingResult {
  vehicleCount: number;
  monthlyTotalEur: number;
  annualTotalEur: number;
  savingsAnnualEur: number;
}

export function calculateHouseholdSubscriptionPrice(vehicleCount: number): TierPricingResult {
  if (vehicleCount <= 0) {
    return { vehicleCount: 0, monthlyTotalEur: 0, annualTotalEur: 0, savingsAnnualEur: 0 };
  }

  let monthly = STRIPE_PRICING_CONFIG.baseTier.monthlyEur;
  let annual = STRIPE_PRICING_CONFIG.baseTier.annualEur;

  if (vehicleCount >= 2) {
    monthly += STRIPE_PRICING_CONFIG.secondVehicleTier.monthlyEur;
    annual += STRIPE_PRICING_CONFIG.secondVehicleTier.annualEur;
  }

  if (vehicleCount >= 3) {
    const additional = vehicleCount - 2;
    monthly += additional * STRIPE_PRICING_CONFIG.additionalVehicleTier.monthlyEur;
    annual += additional * STRIPE_PRICING_CONFIG.additionalVehicleTier.annualEur;
  }

  const monthlyAnnualized = monthly * 12;
  const savings = Math.round((monthlyAnnualized - annual) * 100) / 100;

  return {
    vehicleCount,
    monthlyTotalEur: Math.round(monthly * 100) / 100,
    annualTotalEur: Math.round(annual * 100) / 100,
    savingsAnnualEur: savings,
  };
}
