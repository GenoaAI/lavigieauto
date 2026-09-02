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

export const calculateTelemetryPace = (
  readings: Array<{ date: string; mileage: number; source?: any }>,
  vehicleFirstRegistration?: string,
  refDateInput?: Date | number | string
) => {
  const normalizedReadings: MileageReading[] = (readings || []).map((r) => ({
    date: r.date,
    mileage: r.mileage,
    source: r.source || "INVOICE",
  }));
  return calculateMileagePace(normalizedReadings, refDateInput, vehicleFirstRegistration);
};

export function calculateMileagePace(
  readings: MileageReading[],
  refDateInput?: Date | number | string,
  vehicleFirstRegistration?: string
): MileagePaceResult {
  let referenceDate = new Date();
  if (refDateInput instanceof Date) {
    referenceDate = refDateInput;
  } else if (typeof refDateInput === 'string') {
    const parsed = new Date(refDateInput);
    if (!isNaN(parsed.getTime())) referenceDate = parsed;
  }

  // 1. Filtrer et valider les relevés odométriques
  const validReadings = (readings || []).filter(
    (r) => r && typeof r.mileage === 'number' && r.mileage > 0 && r.date
  );

  if (validReadings.length === 0) {
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

  // 2. Dédupliquer par date (conserver le relevé le plus élevé si plusieurs factures le même jour)
  const byDateMap = new Map<string, number>();
  validReadings.forEach((r) => {
    byDateMap.set(r.date, Math.max(byDateMap.get(r.date) || 0, r.mileage));
  });

  const rawSorted = Array.from(byDateMap.entries())
    .map(([date, mileage]) => ({ date, mileage }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 3. Filtrage monotone rétrograde (Auto-guérison : exclusion des anomalies / régressions odométriques)
  const cleanedSorted: Array<{ date: string; mileage: number }> = [];
  let currentMin = Infinity;
  for (let i = rawSorted.length - 1; i >= 0; i--) {
    const pt = rawSorted[i];
    if (pt.mileage <= currentMin) {
      cleanedSorted.unshift(pt);
      currentMin = pt.mileage;
    }
  }

  const latest = cleanedSorted[cleanedSorted.length - 1];
  const daysSinceLatest = Math.max(
    0,
    Math.floor((referenceDate.getTime() - new Date(latest.date).getTime()) / (1000 * 3600 * 24))
  );

  let dailyKmRate = 37;
  let confidence = 0.5;

  const firstReading = cleanedSorted[0];
  const spanDays = Math.max(
    0,
    Math.floor((new Date(latest.date).getTime() - new Date(firstReading.date).getTime()) / (1000 * 3600 * 24))
  );
  const spanKmDiff = Math.max(0, latest.mileage - firstReading.mileage);

  // Rythme depuis la 1ère immatriculation (0 km)
  let regDailyRate: number | null = null;
  if (vehicleFirstRegistration) {
    const regDate = new Date(vehicleFirstRegistration);
    if (!isNaN(regDate.getTime())) {
      const daysSinceReg = Math.max(
        30,
        Math.floor((new Date(latest.date).getTime() - regDate.getTime()) / (1000 * 3600 * 24))
      );
      if (daysSinceReg > 0) {
        regDailyRate = latest.mileage / daysSinceReg;
      }
    }
  }

  if (cleanedSorted.length >= 2 && spanDays >= 90 && spanKmDiff > 0) {
    // Calcul précis basé sur les relevés certifiés étalés dans le temps
    dailyKmRate = spanKmDiff / spanDays;
    confidence = Math.min(0.98, 0.7 + cleanedSorted.length * 0.05);
  } else if (regDailyRate !== null) {
    // 1 seul relevé ou relevés trop rapprochés (<90 jours) : rythme moyen depuis sortie d'usine
    dailyKmRate = regDailyRate;
    confidence = cleanedSorted.length >= 1 ? 0.75 : 0.6;
  } else if (cleanedSorted.length >= 2 && spanDays > 0 && spanKmDiff > 0) {
    dailyKmRate = spanKmDiff / spanDays;
    confidence = 0.6;
  }

  dailyKmRate = Math.max(5, Math.min(250, dailyKmRate));
  const annualMileageKm = Math.round(dailyKmRate * 365);
  const estimatedCurrentMileage = Math.round(latest.mileage + daysSinceLatest * dailyKmRate);

  return {
    dailyKmRate: Math.round(dailyKmRate * 10) / 10,
    annualMileageKm,
    confidence: Math.round(confidence * 100) / 100,
    trend: 'STABLE',
    lastRecordedMileage: latest.mileage,
    lastReadingDate: latest.date,
    estimatedCurrentMileage,
    readingsCount: cleanedSorted.length,
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
  const pace = calculateMileagePace(options.mileageReadings, refDate, options.vehicleRegistrationDate);
  const rules = options.customRules || DEFAULT_MAINTENANCE_PRESETS;
  const isSevere = options.isSevereUsage || false;

  const lastServicesMap = new Map<MaintenanceCategory, LastServiceRecord>();
  options.lastServices.forEach((svc) => {
    lastServicesMap.set(svc.category, svc);
  });

  const projectedMilestones: ProjectedMilestone[] = [];

  for (const rule of rules) {
    // Les véhicules essence modernes ont un filtre immergé longue durée dans le réservoir
    if (rule.category === 'FUEL_FILTER' && options.vehicleRegistrationDate && !rule.title.toLowerCase().includes('diesel')) {
      continue;
    }

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
