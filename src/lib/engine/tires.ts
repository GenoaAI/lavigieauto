/**
 * Tire Predictive Engine (LaVigieAuto)
 * 
 * Modélisation physique et prédictive de l'usure des pneumatiques :
 * - Gomme initiale neuve : 8.0 mm
 * - Zone de prudence / aquaplaning pluie : 3.0 mm (Remplacement conseillé)
 * - Témoin d'usure légal obligatoire : 1.6 mm (Remplacement critique obligatoire)
 * - Longévité moyenne constatée : Train AV ~40 000 km, Train AR ~60 000 km
 */

export interface TireAxleState {
  axle: 'FRONT' | 'REAR';
  label: string;
  brandAndModel: string;
  dimension: string;
  sourceType: 'NEW_TIRES_INSTALLED' | 'WORKSHOP_INSPECTION' | 'ESTIMATED';
  lastEventDate: string;
  lastEventMileage: number;
  lastEventLabel: string;
  currentEstimatedMileage: number;
  kmDrivenSinceEvent: number;
  totalExpectedLifespanKm: number;
  wearPercentage: number; // 0% = neuf (8mm), 100% = usé au témoin légal (1.6mm)
  remainingTreadDepthMm: number; // e.g. 7.2 mm
  remainingKm: number;
  projectedReplacementDate: string;
  status: 'EXCELLENT' | 'GOOD' | 'ATTENTION' | 'DUE_SOON' | 'CRITICAL';
  statusLabel: string;
  healthColor: 'emerald' | 'blue' | 'amber' | 'orange' | 'red';
  recommendation: string;
}

export interface VehicleTireAssessment {
  vehicleId: string;
  frontAxle: TireAxleState;
  rearAxle: TireAxleState;
  globalHealthScore: number; // 0 to 100%
  overallStatus: 'EXCELLENT' | 'GOOD' | 'ATTENTION' | 'DUE_SOON' | 'CRITICAL';
  urgentActionNeeded: boolean;
  nextReplacementDate: string;
  nextReplacementAxle: 'FRONT' | 'REAR' | 'BOTH';
  recommendedDimension: string;
  historySummary: string;
}

export interface TireCalculationParams {
  vehicleId: string;
  currentMileage: number;
  dailyKmRate: number;
  make?: string;
  model?: string;
  version?: string;
  invoices: Array<{
    date: string;
    mileage: number;
    operation: string;
    emitter?: string;
  }>;
  inspections?: Array<{
    date: string;
    mileage: number;
    observations?: string;
  }>;
}

export function getStandardHomologatedTireSize(make?: string, model?: string, version?: string): string {
  const mod = (model || "").toLowerCase();
  if (mod.includes("clio")) {
    return "185/60 R15 88H"; // Dimension homologuée de référence Renault Clio III
  }
  if (mod.includes("espace")) {
    return "225/55 R18 102V"; // Dimension homologuée Renault Espace V
  }
  if (mod.includes("vitara")) {
    return "215/55 R17 94W"; // Dimension homologuée Suzuki Vitara
  }
  if (mod.includes("208") || mod.includes("c3") || mod.includes("polo") || mod.includes("yaris") || mod.includes("twingo")) {
    return "185/65 R15 88T";
  }
  if (mod.includes("3008") || mod.includes("qashqai") || mod.includes("kadjar") || mod.includes("tucson") || mod.includes("tiguan")) {
    return "225/55 R18 98V";
  }
  return "Dimensions Homologuées Constructeur";
}

export function calculateVehicleTireAssessment(params: TireCalculationParams): VehicleTireAssessment {
  const { vehicleId, currentMileage, dailyKmRate, make, model, version, invoices } = params;
  const safeDailyRate = Math.max(5, dailyKmRate || 35);
  const defaultDimension = getStandardHomologatedTireSize(make, model, version);

  // 1. Détection des montes de pneus dans l'historique de factures
  let frontTireState = {
    date: "2021-01-01",
    mileage: Math.max(0, currentMileage - 30000),
    brand: "Pneumatiques Homologués",
    dimension: defaultDimension,
    sourceType: "ESTIMATED" as "NEW_TIRES_INSTALLED" | "WORKSHOP_INSPECTION" | "ESTIMATED",
    wearPercentReported: undefined as number | undefined,
    eventLabel: "Estimation standard",
  };

  let rearTireState = {
    date: "2021-01-01",
    mileage: Math.max(0, currentMileage - 30000),
    brand: "Pneumatiques Homologués",
    dimension: defaultDimension,
    sourceType: "ESTIMATED" as "NEW_TIRES_INSTALLED" | "WORKSHOP_INSPECTION" | "ESTIMATED",
    wearPercentReported: undefined as number | undefined,
    eventLabel: "Estimation standard",
  };

  // Analyse des factures
  for (const inv of invoices) {
    const op = (inv.operation || '').toLowerCase();
    
    // Kleber Dynaxer 4 pneus neufs posés
    if (op.includes('kleber') || (op.includes('pneu') && (op.includes('4') || op.includes('montage')) && !op.includes('ctrl') && !op.includes('usure'))) {
      const brand = op.includes('kleber') ? 'Kleber Dynaxer HP5' : 'Pneumatiques Neufs';
      const dim = op.includes('215/55') ? '215/55 R17 94W' : 'Dimensions Homologuées';
      
      frontTireState = {
        date: inv.date,
        mileage: inv.mileage,
        brand,
        dimension: dim,
        sourceType: 'NEW_TIRES_INSTALLED',
        wearPercentReported: 0,
        eventLabel: 'Montage de 4 pneus neufs',
      };
      rearTireState = {
        date: inv.date,
        mileage: inv.mileage,
        brand,
        dimension: dim,
        sourceType: 'NEW_TIRES_INSTALLED',
        wearPercentReported: 0,
        eventLabel: 'Montage de 4 pneus neufs',
      };
      break;
    }

    // Relevé d'usure atelier (ex: révision Espace CTRL PNEUS AV 30%, CTRL PNEUS AR 20%)
    if (op.includes('pneus av') && (op.includes('%') || op.includes('usure'))) {
      const match = op.match(/pneus av\s*(\d+)%/i);
      const wearVal = match ? parseInt(match[1]) : 30;
      frontTireState = {
        date: inv.date,
        mileage: inv.mileage,
        brand: 'Michelin Primacy / Continental',
        dimension: '225/55 R18',
        sourceType: 'WORKSHOP_INSPECTION',
        wearPercentReported: wearVal,
        eventLabel: `Contrôle d'usure en révision (${wearVal}% mesuré)`,
      };
    }
    if (op.includes('pneus ar') && (op.includes('%') || op.includes('usure'))) {
      const match = op.match(/pneus ar\s*(\d+)%/i);
      const wearVal = match ? parseInt(match[1]) : 20;
      rearTireState = {
        date: inv.date,
        mileage: inv.mileage,
        brand: 'Michelin Primacy / Continental',
        dimension: '225/55 R18',
        sourceType: 'WORKSHOP_INSPECTION',
        wearPercentReported: wearVal,
        eventLabel: `Contrôle d'usure en révision (${wearVal}% mesuré)`,
      };
    }

    // 2 pneus avant (ex: Speedy)
    if (op.includes('turanza') || (op.includes('2 pneu') && frontTireState.sourceType === 'ESTIMATED')) {
      const brand = op.includes('turanza') ? 'Bridgestone Turanza T001' : 'Bridgestone';
      const dim = op.includes('215/55') ? '215/55 R17 94V' : '215/55 R17';
      frontTireState = {
        date: inv.date,
        mileage: inv.mileage,
        brand,
        dimension: dim,
        sourceType: 'NEW_TIRES_INSTALLED',
        wearPercentReported: undefined,
        eventLabel: 'Montage de 2 pneus neufs',
      };
    }
  }

  // 2. Calcul d'usure Train Avant (Durée de vie nominale 40 000 km)
  const frontLifespan = 40000;
  let frontKmSince = Math.max(0, currentMileage - frontTireState.mileage);
  let frontWearPct = 0;

  if (frontTireState.wearPercentReported !== undefined) {
    // Relevé d'usure professionnel connu + km roulés depuis
    frontWearPct = Math.min(100, Math.round(frontTireState.wearPercentReported + (frontKmSince / frontLifespan) * 100));
  } else {
    frontWearPct = Math.min(100, Math.round((frontKmSince / frontLifespan) * 100));
  }

  const frontRemainingKm = Math.max(0, Math.round(((100 - frontWearPct) / 100) * frontLifespan));
  const frontRemainingDays = Math.round(frontRemainingKm / safeDailyRate);
  const frontProjectedDate = new Date();
  frontProjectedDate.setDate(frontProjectedDate.getDate() + frontRemainingDays);

  // Gomme résiduelle (8.0mm neuf -> 1.6mm usé)
  const frontTreadDepth = Math.max(1.6, Math.round((8.0 - (frontWearPct / 100) * (8.0 - 1.6)) * 10) / 10);

  // 3. Calcul d'usure Train Arrière (Durée de vie nominale 60 000 km)
  const rearLifespan = 60000;
  let rearKmSince = Math.max(0, currentMileage - rearTireState.mileage);
  let rearWearPct = 0;

  if (rearTireState.wearPercentReported !== undefined) {
    rearWearPct = Math.min(100, Math.round(rearTireState.wearPercentReported + (rearKmSince / rearLifespan) * 100));
  } else {
    rearWearPct = Math.min(100, Math.round((rearKmSince / rearLifespan) * 100));
  }

  const rearRemainingKm = Math.max(0, Math.round(((100 - rearWearPct) / 100) * rearLifespan));
  const rearRemainingDays = Math.round(rearRemainingKm / safeDailyRate);
  const rearProjectedDate = new Date();
  rearProjectedDate.setDate(rearProjectedDate.getDate() + rearRemainingDays);

  const rearTreadDepth = Math.max(1.6, Math.round((8.0 - (rearWearPct / 100) * (8.0 - 1.6)) * 10) / 10);

  // Évaluation statuts
  function getTireStatus(wearPct: number): {
    status: 'EXCELLENT' | 'GOOD' | 'ATTENTION' | 'DUE_SOON' | 'CRITICAL';
    label: string;
    color: 'emerald' | 'blue' | 'amber' | 'orange' | 'red';
    rec: string;
  } {
    if (wearPct <= 20) {
      return {
        status: 'EXCELLENT',
        label: 'État Neuf / Optimal',
        color: 'emerald',
        rec: 'Adhérence maximale sur sol sec et mouillé. Aucun frais à prévoir.',
      };
    }
    if (wearPct <= 50) {
      return {
        status: 'GOOD',
        label: 'Très Bon État',
        color: 'blue',
        rec: 'Gomme saine. Vérifier la pression tous les 2 mois et avant les longs trajets.',
      };
    }
    if (wearPct <= 75) {
      return {
        status: 'ATTENTION',
        label: 'Usure Moyenne (À surveiller)',
        color: 'amber',
        rec: 'Adhérence pluie réduite. Prévoir le remplacement lors de la prochaine révision.',
      };
    }
    if (wearPct <= 90) {
      return {
        status: 'DUE_SOON',
        label: 'Remplacement Recommandé',
        color: 'orange',
        rec: 'Proche de la limite de sécurité (3 mm). Risque d\'aquaplaning accru.',
      };
    }
    return {
      status: 'CRITICAL',
      label: 'Seuil Critique Atteint',
      color: 'red',
      rec: 'Témoin d\'usure légal (1.6 mm) atteint ou dépassé. Remplacement urgent obligatoire.',
    };
  }

  const frontStatus = getTireStatus(frontWearPct);
  const rearStatus = getTireStatus(rearWearPct);

  const globalHealthScore = Math.round(100 - (frontWearPct * 0.6 + rearWearPct * 0.4));
  const urgentActionNeeded = frontStatus.status === 'CRITICAL' || rearStatus.status === 'CRITICAL';

  let nextAxle: 'FRONT' | 'REAR' | 'BOTH' = 'FRONT';
  if (frontRemainingKm === rearRemainingKm) nextAxle = 'BOTH';
  else if (rearRemainingKm < frontRemainingKm) nextAxle = 'REAR';

  const nextDateStr = nextAxle === 'REAR' ? rearProjectedDate.toISOString().split('T')[0] : frontProjectedDate.toISOString().split('T')[0];

  return {
    vehicleId,
    frontAxle: {
      axle: 'FRONT',
      label: 'Train Avant (Direction / Traction)',
      brandAndModel: frontTireState.brand,
      dimension: frontTireState.dimension,
      sourceType: frontTireState.sourceType,
      lastEventDate: frontTireState.date,
      lastEventMileage: frontTireState.mileage,
      lastEventLabel: frontTireState.eventLabel,
      currentEstimatedMileage: currentMileage,
      kmDrivenSinceEvent: frontKmSince,
      totalExpectedLifespanKm: frontLifespan,
      wearPercentage: frontWearPct,
      remainingTreadDepthMm: frontTreadDepth,
      remainingKm: frontRemainingKm,
      projectedReplacementDate: frontProjectedDate.toISOString().split('T')[0],
      status: frontStatus.status,
      statusLabel: frontStatus.label,
      healthColor: frontStatus.color,
      recommendation: frontStatus.rec,
    },
    rearAxle: {
      axle: 'REAR',
      label: 'Train Arrière (Stabilité)',
      brandAndModel: rearTireState.brand,
      dimension: rearTireState.dimension,
      sourceType: rearTireState.sourceType,
      lastEventDate: rearTireState.date,
      lastEventMileage: rearTireState.mileage,
      lastEventLabel: rearTireState.eventLabel,
      currentEstimatedMileage: currentMileage,
      kmDrivenSinceEvent: rearKmSince,
      totalExpectedLifespanKm: rearLifespan,
      wearPercentage: rearWearPct,
      remainingTreadDepthMm: rearTreadDepth,
      remainingKm: rearRemainingKm,
      projectedReplacementDate: rearProjectedDate.toISOString().split('T')[0],
      status: rearStatus.status,
      statusLabel: rearStatus.label,
      healthColor: rearStatus.color,
      recommendation: rearStatus.rec,
    },
    globalHealthScore,
    overallStatus: frontStatus.status === 'CRITICAL' || rearStatus.status === 'CRITICAL' ? 'CRITICAL' : frontStatus.status === 'DUE_SOON' || rearStatus.status === 'DUE_SOON' ? 'DUE_SOON' : 'EXCELLENT',
    urgentActionNeeded,
    nextReplacementDate: nextDateStr,
    nextReplacementAxle: nextAxle,
    recommendedDimension: frontTireState.dimension,
    historySummary: `Suivi calculé à partir de ${invoices.length} factures et de votre rythme de roulage (${Math.round(safeDailyRate * 365).toLocaleString('fr-FR')} km/an).`,
  };
}
