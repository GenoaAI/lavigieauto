import { MaintenanceCategory } from '../ai';

export interface MileageReading {
  date: string; // ISO format YYYY-MM-DD
  mileage: number;
  source: 'INVOICE' | 'TECHNICAL_INSPECTION' | 'USER_DASHBOARD' | 'MANUAL';
}

export interface MileagePaceResult {
  dailyKmRate: number;
  annualMileageKm: number;
  confidence: number; // 0.0 to 1.0
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  lastRecordedMileage: number;
  lastReadingDate: string;
  estimatedCurrentMileage: number;
  readingsCount: number;
  daysSinceLastReading: number;
}

export function calculateMileagePace(
  readings: MileageReading[],
  refDateInput?: Date | number | string,
  vehicleFirstRegistration?: string
): MileagePaceResult {
  let referenceDate = new Date();
  if (refDateInput instanceof Date) {
    referenceDate = refDateInput;
  } else if (typeof refDateInput === 'string') {
    referenceDate = new Date(refDateInput);
  }

  // Filtrer et trier les relevés avec un kilométrage > 0
  const validReadings = readings.filter((r) => r && r.mileage > 0 && r.date);
  const sorted = [...validReadings].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (sorted.length === 0) {
    return {
      dailyKmRate: 37,
      annualMileageKm: 13500,
      confidence: 0.3,
      trend: 'STABLE',
      lastRecordedMileage: 0,
      lastReadingDate: referenceDate.toISOString().split('T')[0],
      estimatedCurrentMileage: 0,
      readingsCount: 0,
      daysSinceLastReading: 0,
    };
  }

  const latest = sorted[sorted.length - 1];
  const daysSinceLatest = Math.max(
    0,
    Math.floor((referenceDate.getTime() - new Date(latest.date).getTime()) / (1000 * 3600 * 24))
  );

  // Si on a 1 seul relevé, mais une date de première immatriculation connue
  if (sorted.length === 1 && vehicleFirstRegistration) {
    const firstRegDays = Math.max(
      30,
      Math.floor((new Date(latest.date).getTime() - new Date(vehicleFirstRegistration).getTime()) / (1000 * 3600 * 24))
    );
    const paceSinceNew = latest.mileage / firstRegDays;
    const dailyKmRate = Math.max(5, Math.min(250, paceSinceNew));
    const annualMileageKm = Math.round(dailyKmRate * 365);
    const estimatedCurrentMileage = Math.round(latest.mileage + daysSinceLatest * dailyKmRate);

    return {
      dailyKmRate: Math.round(dailyKmRate * 10) / 10,
      annualMileageKm,
      confidence: 0.7,
      trend: 'STABLE',
      lastRecordedMileage: latest.mileage,
      lastReadingDate: latest.date,
      estimatedCurrentMileage,
      readingsCount: 1,
      daysSinceLastReading: daysSinceLatest,
    };
  }

  if (sorted.length === 1) {
    const estimatedKm = latest.mileage + daysSinceLatest * 37;
    return {
      dailyKmRate: 37,
      annualMileageKm: 13500,
      confidence: 0.4,
      trend: 'STABLE',
      lastRecordedMileage: latest.mileage,
      lastReadingDate: latest.date,
      estimatedCurrentMileage: Math.round(estimatedKm),
      readingsCount: 1,
      daysSinceLastReading: daysSinceLatest,
    };
  }

  // Si 2+ factures / relevés, calcul précis du delta km / delta jours
  let totalKmDiff = 0;
  let totalDays = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const days = Math.max(1, Math.floor((new Date(curr.date).getTime() - new Date(prev.date).getTime()) / (1000 * 3600 * 24)));
    const kmDiff = Math.max(0, curr.mileage - prev.mileage);

    totalKmDiff += kmDiff;
    totalDays += days;
  }

  const overallDailyRate = totalDays > 0 ? totalKmDiff / totalDays : 37;
  const dailyKmRate = Math.max(5, Math.min(250, overallDailyRate));
  const annualMileageKm = Math.round(dailyKmRate * 365);
  const estimatedCurrentMileage = Math.round(latest.mileage + daysSinceLatest * dailyKmRate);
  const confidence = Math.min(0.98, 0.6 + sorted.length * 0.1);

  return {
    dailyKmRate: Math.round(dailyKmRate * 10) / 10,
    annualMileageKm,
    confidence,
    trend: 'STABLE',
    lastRecordedMileage: latest.mileage,
    lastReadingDate: latest.date,
    estimatedCurrentMileage,
    readingsCount: sorted.length,
    daysSinceLastReading: daysSinceLatest,
  };
}

export interface MaintenanceRuleConfig {
  category: MaintenanceCategory;
  title: string;
  intervalKm?: number;
  intervalMonths?: number;
  severeIntervalKm?: number;
  severeIntervalMonths?: number;
  estimatedCostEur: number;
  isMandatory: boolean;
}

export interface LastServiceRecord {
  category: MaintenanceCategory;
  serviceDate: string; // YYYY-MM-DD
  mileage: number;
  invoiceId?: string;
}

export type UrgencyLevel = 'OK' | 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'CRITICAL';

export interface ProjectedMilestone {
  category: MaintenanceCategory;
  title: string;
  dueMileage: number;
  projectedDueDate: string; // YYYY-MM-DD
  triggerType: 'MILEAGE_TRIGGER' | 'TIME_TRIGGER' | 'BOTH';
  remainingKm: number;
  remainingDays: number;
  urgency: UrgencyLevel;
  estimatedCostEur: number;
  isSevereAdjusted: boolean;
  explanation: string;
}

export interface MaintenanceForecast {
  vehiclePace: MileagePaceResult;
  projectedMilestones: ProjectedMilestone[];
  upcomingNext12MonthsBudget: number;
  upcomingNext24MonthsBudget: number;
  nextUrgentMilestone?: ProjectedMilestone;
}

export const DEFAULT_MAINTENANCE_PRESETS: MaintenanceRuleConfig[] = [
  {
    category: 'DRAIN_OIL',
    title: 'Vidange huile moteur & remplacement filtre',
    intervalKm: 20000,
    intervalMonths: 12,
    severeIntervalKm: 15000,
    severeIntervalMonths: 12,
    estimatedCostEur: 140,
    isMandatory: true,
  },
  {
    category: 'CABIN_FILTER',
    title: 'Remplacement filtre habitacle / pollen',
    intervalKm: 20000,
    intervalMonths: 12,
    severeIntervalKm: 15000,
    severeIntervalMonths: 12,
    estimatedCostEur: 45,
    isMandatory: false,
  },
  {
    category: 'AIR_FILTER',
    title: 'Remplacement filtre à air',
    intervalKm: 40000,
    intervalMonths: 24,
    severeIntervalKm: 30000,
    severeIntervalMonths: 24,
    estimatedCostEur: 45,
    isMandatory: true,
  },
  {
    category: 'FUEL_FILTER',
    title: 'Remplacement filtre à carburant (Gazole / Essence)',
    intervalKm: 40000,
    intervalMonths: 24,
    severeIntervalKm: 30000,
    severeIntervalMonths: 24,
    estimatedCostEur: 75,
    isMandatory: true,
  },
  {
    category: 'BRAKE_FLUID',
    title: 'Purge et remplacement liquide de frein',
    intervalKm: 40000,
    intervalMonths: 24,
    severeIntervalKm: 40000,
    severeIntervalMonths: 24,
    estimatedCostEur: 70,
    isMandatory: true,
  },
  {
    category: 'SPARK_PLUGS',
    title: 'Remplacement bougies d\'allumage',
    intervalKm: 60000,
    intervalMonths: 48,
    severeIntervalKm: 40000,
    severeIntervalMonths: 36,
    estimatedCostEur: 110,
    isMandatory: true,
  },
  {
    category: 'COOLANT',
    title: 'Remplacement liquide de refroidissement',
    intervalKm: 100000,
    intervalMonths: 60,
    severeIntervalKm: 80000,
    severeIntervalMonths: 48,
    estimatedCostEur: 95,
    isMandatory: true,
  },
  {
    category: 'TIMING_BELT',
    title: 'Remplacement kit courroie de distribution & pompe à eau',
    intervalKm: 120000,
    intervalMonths: 72,
    severeIntervalKm: 100000,
    severeIntervalMonths: 60,
    estimatedCostEur: 650,
    isMandatory: true,
  },
  {
    category: 'ACCESSORY_BELT',
    title: 'Remplacement courroie d\'accessoires',
    intervalKm: 120000,
    intervalMonths: 72,
    severeIntervalKm: 100000,
    severeIntervalMonths: 60,
    estimatedCostEur: 180,
    isMandatory: true,
  },
  {
    category: 'BRAKE_PADS_FRONT',
    title: 'Contrôle / Remplacement plaquettes de frein avant',
    intervalKm: 35000,
    intervalMonths: 36,
    severeIntervalKm: 25000,
    severeIntervalMonths: 24,
    estimatedCostEur: 130,
    isMandatory: true,
  },
  {
    category: 'AIR_CONDITIONING',
    title: 'Contrôle & entretien circuit de climatisation',
    intervalKm: 40000,
    intervalMonths: 24,
    severeIntervalKm: 30000,
    severeIntervalMonths: 24,
    estimatedCostEur: 85,
    isMandatory: false,
  },
];

export function evaluateUrgency(remainingDays: number, remainingKm: number): UrgencyLevel {
  if (remainingDays < -180 || remainingKm < -5000) return 'CRITICAL';
  if (remainingDays < 0 || remainingKm < 0) return 'OVERDUE';
  if (remainingDays <= 30 || remainingKm <= 1000) return 'DUE_SOON';
  if (remainingDays <= 60 || remainingKm <= 2500) return 'UPCOMING';
  return 'OK';
}

export function projectMaintenanceSchedule(options: {
  mileageReadings: MileageReading[];
  lastServices: LastServiceRecord[];
  customRules?: MaintenanceRuleConfig[];
  isSevereUsage?: boolean;
  vehicleRegistrationDate?: string;
  referenceDate?: Date;
}): MaintenanceForecast {
  const refDate = options.referenceDate || new Date();
  const pace = calculateMileagePace(options.mileageReadings, refDate);
  const rules = options.customRules || DEFAULT_MAINTENANCE_PRESETS;
  const isSevere = options.isSevereUsage || false;

  const lastServicesMap = new Map<MaintenanceCategory, LastServiceRecord>();
  options.lastServices.forEach((svc) => {
    lastServicesMap.set(svc.category, svc);
  });

  const projectedMilestones: ProjectedMilestone[] = [];

  for (const rule of rules) {
    const lastService = lastServicesMap.get(rule.category);

    const baseMileage = lastService ? lastService.mileage : 0;
    const baseDateStr = lastService ? lastService.serviceDate : (options.vehicleRegistrationDate || '2020-01-01');
    const baseDate = new Date(baseDateStr);

    const intervalKm = isSevere && rule.severeIntervalKm ? rule.severeIntervalKm : (rule.intervalKm || 20000);
    const intervalMonths = isSevere && rule.severeIntervalMonths ? rule.severeIntervalMonths : (rule.intervalMonths || 12);

    let dueMileage: number;
    let timeDueDate: Date;

    if (lastService && lastService.mileage > 0) {
      // 1. Si une intervention réelle est enregistrée : échéance = dernière date/km + intervalle constructeur
      dueMileage = lastService.mileage + intervalKm;
      timeDueDate = new Date(baseDate);
      timeDueDate.setMonth(timeDueDate.getMonth() + intervalMonths);
    } else {
      // 2. Si aucune facture spécifique n'est enregistrée : projection sur le prochain cap kilométrique et temporel futur
      dueMileage = intervalKm;
      while (dueMileage <= pace.estimatedCurrentMileage) {
        dueMileage += intervalKm;
      }

      timeDueDate = new Date(baseDate);
      while (timeDueDate.getTime() <= refDate.getTime()) {
        timeDueDate.setMonth(timeDueDate.getMonth() + intervalMonths);
      }
    }

    const remainingKm = dueMileage - pace.estimatedCurrentMileage;

    const daysFromNowByKm = pace.dailyKmRate > 0 ? Math.round(remainingKm / pace.dailyKmRate) : 365;
    const mileageDueDate = new Date(refDate);
    mileageDueDate.setDate(mileageDueDate.getDate() + daysFromNowByKm);

    let projectedDueDate: Date;
    let triggerType: 'MILEAGE_TRIGGER' | 'TIME_TRIGGER' | 'BOTH';

    if (mileageDueDate.getTime() < timeDueDate.getTime()) {
      projectedDueDate = mileageDueDate;
      triggerType = 'MILEAGE_TRIGGER';
    } else if (timeDueDate.getTime() < mileageDueDate.getTime()) {
      projectedDueDate = timeDueDate;
      triggerType = 'TIME_TRIGGER';
    } else {
      projectedDueDate = timeDueDate;
      triggerType = 'BOTH';
    }

    const remainingDays = Math.floor(
      (projectedDueDate.getTime() - refDate.getTime()) / (1000 * 3600 * 24)
    );

    const urgency = evaluateUrgency(remainingDays, remainingKm);
    const projectedDueDateStr = projectedDueDate.toISOString().split('T')[0];

    projectedMilestones.push({
      category: rule.category,
      title: rule.title,
      dueMileage,
      projectedDueDate: projectedDueDateStr,
      triggerType,
      remainingKm,
      remainingDays,
      urgency,
      estimatedCostEur: rule.estimatedCostEur,
      isSevereAdjusted: isSevere,
      explanation: `Calcul prédictif d'après votre rythme annuel (${pace.annualMileageKm.toLocaleString('fr-FR')} km/an).`,
    });
  }

  projectedMilestones.sort(
    (a, b) => new Date(a.projectedDueDate).getTime() - new Date(b.projectedDueDate).getTime()
  );

  const nowTime = refDate.getTime();
  const twelveMonthsTime = nowTime + 365 * 24 * 3600 * 1000;
  const twentyFourMonthsTime = nowTime + 730 * 24 * 3600 * 1000;

  let upcomingNext12MonthsBudget = 0;
  let upcomingNext24MonthsBudget = 0;

  projectedMilestones.forEach((m) => {
    const dueTime = new Date(m.projectedDueDate).getTime();
    if (dueTime <= twelveMonthsTime) upcomingNext12MonthsBudget += m.estimatedCostEur;
    if (dueTime <= twentyFourMonthsTime) upcomingNext24MonthsBudget += m.estimatedCostEur;
  });

  const priorityCategories: MaintenanceCategory[] = ['SPARK_PLUGS', 'DRAIN_OIL', 'CABIN_FILTER', 'BRAKE_FLUID', 'BRAKE_PADS_FRONT'];
  const nextUrgentMilestone =
    projectedMilestones.find(
      (m) => (m.urgency === 'CRITICAL' || m.urgency === 'OVERDUE' || m.urgency === 'DUE_SOON') && priorityCategories.includes(m.category)
    ) ||
    projectedMilestones.find(
      (m) => m.urgency === 'CRITICAL' || m.urgency === 'OVERDUE' || m.urgency === 'DUE_SOON'
    ) ||
    projectedMilestones[0];

  return {
    vehiclePace: pace,
    projectedMilestones,
    upcomingNext12MonthsBudget,
    upcomingNext24MonthsBudget,
    nextUrgentMilestone,
  };
}

export function recalculateMaintenanceForecast(options: {
  readings: MileageReading[];
  currentOdometer?: number;
  vehicleFirstRegistration?: string;
  lastServices?: LastServiceRecord[];
  customRules?: MaintenanceRuleConfig[];
  isSevereUsage?: boolean;
}): MaintenanceForecast {
  return projectMaintenanceSchedule({
    mileageReadings: options.readings,
    lastServices: options.lastServices || [],
    customRules: options.customRules,
    isSevereUsage: options.isSevereUsage,
    vehicleRegistrationDate: options.vehicleFirstRegistration,
  });
}
