export type CriticalityLevel = 'obligatoire' | 'recommande' | 'securite';

export interface MaintenanceInterval {
  id: string;
  operation: string;
  description: string;
  intervalKm: number;
  intervalMonths: number;
  criticality: CriticalityLevel;
  estimatedCostMin: number;
  estimatedCostMax: number;
  category: 'moteur' | 'freinage' | 'filtration' | 'visibilite' | 'liaison_au_sol';
}

export interface ReliabilityVulnerability {
  title: string;
  component: string;
  severity: 'haute' | 'moyenne';
  description: string;
  symptoms: string[];
  preventiveAction: string;
  legalContext?: string;
}

export interface MaintenanceBundle {
  title: string;
  operationsIncluded: string[];
  individualEstimatedTotal: number;
  bundledEstimatedTotal: number;
  savingsEur: number;
  garageAdvice: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface VehicleMaintenanceData {
  brand: string;
  brandSlug: string;
  model: string;
  modelSlug: string;
  generation: string;
  engine: string;
  engineSlug: string;
  engineCode: string;
  fuelType: 'Essence' | 'Diesel' | 'Hybride' | 'Electrique';
  powerHp: number;
  productionYears: string;
  directAnswerSummary: string;
  recommendedOilNorm: string;
  oilViscosity: string;
  intervals: MaintenanceInterval[];
  vulnerabilities: ReliabilityVulnerability[];
  costOptimizationBundles: MaintenanceBundle[];
  faqs: FAQItem[];
}
