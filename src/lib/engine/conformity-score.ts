import { MaintenanceCategory } from '../ai';
import { ProjectedMilestone } from './cycles';

export interface MaintenanceHistoryItem {
  id: string;
  category: MaintenanceCategory;
  title: string;
  performedDate: string; // YYYY-MM-DD
  mileage: number;
  invoiceUrl?: string;
  garageName?: string;
  totalCostTTC?: number;
  isOfficialDealer?: boolean;
}

export interface TechnicalInspectionHistoryItem {
  id: string;
  inspectionDate: string; // YYYY-MM-DD
  mileage: number;
  result: 'FAVORABLE' | 'UNFAVORABLE_MAJOR' | 'UNFAVORABLE_CRITICAL';
  minorDefectsCount: number;
  majorDefectsCount: number;
  criticalDefectsCount: number;
}

export interface ConformityAuditBreakdown {
  timelineComplianceScore: number; // 0 to 100 (weight: 35%)
  invoiceAuthenticityScore: number; // 0 to 100 (weight: 20%)
  criticalSafetyScore: number; // 0 to 100 (weight: 25%)
  ctHistoryScore: number; // 0 to 100 (weight: 20%)
}

export interface ConformityAuditResult {
  overallScore: number; // 0 to 100%
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  certificationTitle: string;
  summaryText: string;
  breakdown: ConformityAuditBreakdown;
  strengths: string[];
  weaknesses: string[];
  resaleImpact: {
    estimatedValueBonusPercent: number; // e.g. +8%
    timeToSellDaysEstimated: number; // e.g. 14 days
    buyerConfidenceIndex: 'TRES_ELEVE' | 'ELEVE' | 'MOYEN' | 'FAIBLE';
    resaleArgumentationPoints: string[];
  };
  certifiedAt: string;
}

export interface ConformityCalculationParams {
  vehicleFirstRegistration: string;
  currentMileage: number;
  maintenanceHistory: MaintenanceHistoryItem[];
  ctHistory: TechnicalInspectionHistoryItem[];
  overdueMilestones: ProjectedMilestone[];
  brakeSafetyAssessment?: {
    urgentActionNeeded?: boolean;
    globalHealthScore?: number;
    frontWearPercentage?: number;
    rearWearPercentage?: number;
  };
  tireSafetyAssessment?: {
    urgentActionNeeded?: boolean;
    globalHealthScore?: number;
  };
}

/**
 * Calculate the Manufacturer Conformity Score (Score de Conformité Constructeur)
 */
export function calculateConformityScore(params: ConformityCalculationParams): ConformityAuditResult {
  const {
    maintenanceHistory,
    ctHistory,
    overdueMilestones,
    brakeSafetyAssessment,
    tireSafetyAssessment,
  } = params;

  // 1. Timeline compliance (35%)
  let timelineScore = 100;
  if (overdueMilestones.length > 0) {
    timelineScore -= overdueMilestones.length * 15;
  }
  timelineScore = Math.max(0, Math.min(100, timelineScore));

  // 2. Invoice authenticity & tracking (20%)
  let authenticityScore = 60;
  if (maintenanceHistory.length > 0) {
    const withGarage = maintenanceHistory.filter((m) => m.garageName).length;
    const withInvoice = maintenanceHistory.filter((m) => m.invoiceUrl).length;
    authenticityScore = Math.round(
      (withGarage / maintenanceHistory.length) * 50 +
        (withInvoice / maintenanceHistory.length) * 50
    );
  }

  // 3. Critical safety operations & Wear Sensors (25%)
  let safetyScore = 100;
  const criticalCategories: MaintenanceCategory[] = [
    'DRAIN_OIL',
    'BRAKE_PADS_FRONT',
    'BRAKE_DISCS_FRONT',
    'BRAKE_FLUID',
    'TIMING_BELT',
    'TIRES_FRONT',
  ];
  const missingCriticalOverdue = overdueMilestones.filter((m) =>
    criticalCategories.includes(m.category)
  );
  if (missingCriticalOverdue.length > 0) {
    safetyScore -= missingCriticalOverdue.length * 25;
  }

  // Pénalisation immédiate si une alerte de sécurité active est détectée (Freins ou Pneus)
  const hasBrakeEmergency = brakeSafetyAssessment?.urgentActionNeeded === true;
  const hasTireEmergency = tireSafetyAssessment?.urgentActionNeeded === true;

  if (hasBrakeEmergency) {
    safetyScore = Math.min(safetyScore, 35);
  }
  if (hasTireEmergency) {
    safetyScore = Math.min(safetyScore, 35);
  }
  safetyScore = Math.max(0, Math.min(100, safetyScore));

  // 4. CT History (20%)
  let ctScore = 100;
  if (ctHistory.length > 0) {
    const lastCT = ctHistory[0];
    if (lastCT.result === 'UNFAVORABLE_CRITICAL') ctScore = 20;
    else if (lastCT.result === 'UNFAVORABLE_MAJOR') ctScore = 50;
    else ctScore = 100 - Math.min(30, lastCT.minorDefectsCount * 5);
  }

  // Weighted overall score
  let overallScore = Math.round(
    timelineScore * 0.35 +
      authenticityScore * 0.2 +
      safetyScore * 0.25 +
      ctScore * 0.2
  );

  // GARDE-FOU STRICT DE SÉCURITÉ : Interdiction d'une note A/A+ si une alerte rouge est active
  const hasAnyCriticalAlert = hasBrakeEmergency || hasTireEmergency || missingCriticalOverdue.length > 0;
  if (hasAnyCriticalAlert) {
    overallScore = Math.min(overallScore, 68); // Plafond strict à 68% (Note C / B max)
  }

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'B';
  let certificationTitle = 'Suivi Régulier';
  let bonusPercent = 0;
  let timeToSell = 30;
  let buyerConfidence: 'TRES_ELEVE' | 'ELEVE' | 'MOYEN' | 'FAIBLE' = 'MOYEN';

  if (!hasAnyCriticalAlert && overallScore >= 90) {
    grade = 'A+';
    certificationTitle = 'Exemplaire — Suivi Constructeur Intégral';
    bonusPercent = 10;
    timeToSell = 12;
    buyerConfidence = 'TRES_ELEVE';
  } else if (!hasAnyCriticalAlert && overallScore >= 80) {
    grade = 'A';
    certificationTitle = 'Très Bon Entretien — Dossier Complet';
    bonusPercent = 6;
    timeToSell = 18;
    buyerConfidence = 'ELEVE';
  } else if (overallScore >= 65) {
    grade = 'B';
    certificationTitle = hasAnyCriticalAlert ? 'Entretien à Régulariser (Alerte Sécurité)' : 'Entretien Conforme';
    bonusPercent = hasAnyCriticalAlert ? 0 : 2;
    timeToSell = 25;
    buyerConfidence = 'MOYEN';
  } else if (overallScore >= 50) {
    grade = 'C';
    certificationTitle = 'Intervention Requise Avant Revente';
    bonusPercent = -5;
    timeToSell = 40;
    buyerConfidence = 'FAIBLE';
  } else {
    grade = 'F';
    certificationTitle = 'Historique Incomplet / Défauts Critiques';
    bonusPercent = -12;
    timeToSell = 60;
    buyerConfidence = 'FAIBLE';
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (!hasBrakeEmergency && !hasTireEmergency && safetyScore >= 90) {
    strengths.push('Organes de sécurité (freinage, pneumatiques) à jour des préconisations constructeur.');
  }
  if (ctScore >= 90) {
    strengths.push('Bilan Contrôle Technique vierge ou favorable sans défaillance majeure.');
  }
  if (authenticityScore >= 80) {
    strengths.push('Factures professionnelles certifiées disponibles dans le coffre-fort.');
  }

  if (hasBrakeEmergency) {
    weaknesses.push('Alerte Freinage : Remplacement urgent des plaquettes ou disques requis.');
  }
  if (hasTireEmergency) {
    weaknesses.push('Alerte Pneumatiques : Remplacement requis (témoin d\'usure légal atteint).');
  }
  if (timelineScore < 70) {
    weaknesses.push('Des échéances d\'entretien préventif sont échues ou en retard.');
  }
  if (authenticityScore < 60) {
    weaknesses.push('Factures justificatives manquantes sur certaines périodes.');
  }

  return {
    overallScore,
    grade,
    certificationTitle,
    summaryText: `Véhicule bénéficiant d'un score de conformité de ${overallScore}% (${grade}). ${certificationTitle}.`,
    breakdown: {
      timelineComplianceScore: timelineScore,
      invoiceAuthenticityScore: authenticityScore,
      criticalSafetyScore: safetyScore,
      ctHistoryScore: ctScore,
    },
    strengths,
    weaknesses,
    resaleImpact: {
      estimatedValueBonusPercent: bonusPercent,
      timeToSellDaysEstimated: timeToSell,
      buyerConfidenceIndex: buyerConfidence,
      resaleArgumentationPoints: [
        `Historique documenté avec ${maintenanceHistory.length} interventions enregistrées`,
        `Score de conformité certifié LaVigieAuto : ${overallScore}%`,
        `Aucune défaillance critique non résolue`,
      ],
    },
    certifiedAt: new Date().toISOString(),
  };
}
