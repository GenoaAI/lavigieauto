/**
 * Pricing logic for progressive household tiers
 * - 1st vehicle: 2.90 € / month (29 € / year)
 * - 2nd vehicle: +1.60 € / month (+16 € / year -> Total 45 € / year)
 * - 3rd+ vehicle: +1.00 € / month (+10 € / year / vehicle)
 */
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

  let monthly = 2.90;
  let annual = 29.00;

  if (vehicleCount >= 2) {
    monthly += 1.60;
    annual += 16.00;
  }

  if (vehicleCount >= 3) {
    const additional = vehicleCount - 2;
    monthly += additional * 1.00;
    annual += additional * 10.00;
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
