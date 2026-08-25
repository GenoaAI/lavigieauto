export interface StripePlanTier {
  minVehicles: number;
  maxVehicles: number;
  monthlyPerVehicleEur: number;
  annualPerVehicleEur: number;
}

export const STRIPE_PRICING_CONFIG = {
  currency: "eur",
  baseTier: {
    name: "Véhicule Principal",
    monthlyEur: 2.90,
    annualEur: 29.00, // ~2.42 €/mois (2 mois offerts)
  },
  secondVehicleTier: {
    name: "Deuxième Véhicule",
    monthlyEur: 1.60,
    annualEur: 16.00,
  },
  additionalVehicleTier: {
    name: "Véhicule Additionnel (3+)",
    monthlyEur: 1.00,
    annualEur: 10.00,
  },
  trialDays: 0,
  discoveryMaxVehicles: 1,
  defaultPremiumMaxVehicles: 4,
};

export const STRIPE_FEATURES = {
  discovery: [
    "Suivi mécanique de base (1 véhicule)",
    "Reconnaissance OCR d'un document",
    "Score de conformité indicatif",
  ],
  premium: [
    "Suivi prédictif illimité de toute la flotte familiale",
    "Numérisation IA illimitée (Factures, Cartes Grises, Contrôles Techniques)",
    "Plans officiels constructeurs (selon motorisation, boîte, énergie et usage)",
    "Regroupement intelligent d'atelier (Smart Bundling anti-surcoût)",
    "Synchronisation Google Calendar partagée (Rappels anticipés J-30 & J-7)",
    "Kit Prêt-à-Réserver avec script d'appel garagiste mot à mot",
    "Passeport d'Entretien Certifié pour revente (Grade A+ valorisé)",
  ],
};
