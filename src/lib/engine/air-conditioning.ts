/**
 * Air Conditioning & Thermal Comfort Engine (LaVigieAuto)
 * 
 * Modélisation physique et prédictive de l'état du circuit frigorifique automobile :
 * - Déperdition naturelle du fluide : ~5% à 10% par an via la microporosité des flexibles et joints toriques.
 * - Périodicité recommandée d'entretien préventif : tous les 3 à 4 ans (36 à 48 mois) ou 60 000 km
 *   pour préserver le compresseur et renouveler l'huile lubrifiante (PAG ou POE diélectrique).
 * - Identification automatique de la norme de fluide (Directive Européenne MAC 2006/40/CE) :
 *   - Véhicules immatriculés avant le 01/01/2017 : Gaz R134a (forfait atelier classique ~59 € à 89 €)
 *   - Véhicules immatriculés à partir du 01/01/2017 : Gaz R1234yf (forfait atelier technique ~129 € à 179 €)
 * - Détection des compresseurs électriques haute tension (Hybrides / EV) nécessitant impérativement
 *   une huile non conductrice (ND-OIL 11 / POE).
 * - Boost saisonnier contextuel d'avril à juillet (anticipation estivale et départs en vacances).
 */

export type RefrigerantGasType = 'R134a' | 'R1234yf' | 'R744' | 'UNKNOWN';

export interface RefrigerantInfo {
  type: RefrigerantGasType;
  label: string;
  isEcoCompliant: boolean;
  gwp: number; // Potentiel de réchauffement global (1430 pour R134a, <1 pour R1234yf)
  estimatedRechargeCost: {
    minEur: number;
    maxEur: number;
  };
  notes: string;
}

export type AirConditioningStatus = 'OPTIMAL' | 'ATTENTION' | 'DUE_SOON' | 'CRITICAL';

export interface VehicleAirConditioningAssessment {
  vehicleId: string;
  refrigerant: RefrigerantInfo;
  isHighVoltageCompressor: boolean;
  highVoltageWarning?: string;
  lastRechargeDate: string | null;
  lastRechargeMileage: number | null;
  yearsSinceLastRecharge: number;
  monthsSinceLastRecharge: number;
  estimatedFluidLossPercent: number; // Perte théorique en %
  globalHealthScore: number; // 0 à 100%
  status: AirConditioningStatus;
  statusLabel: string;
  healthColor: 'emerald' | 'blue' | 'amber' | 'orange' | 'red';
  recommendation: string;
  urgentActionNeeded: boolean;
  isSeasonalBoostActive: boolean;
  seasonalAlertTitle?: string;
  seasonalAlertMessage?: string;
  projectedDueDate: string;
  projectedDueMileage?: number;
  diyGuide: {
    cabinFilterAction: string;
    antibacterialTreatmentAction: string;
    thermalSelfTest: string;
  };
  workshopGuide: {
    vacuumTestRequired: boolean;
    gasRefillDescription: string;
    compressorOilCheck: string;
  };
}

export interface AirConditioningCalculationParams {
  vehicleId: string;
  currentMileage: number;
  dailyKmRate: number;
  registrationDate?: string;
  firstRegistrationYear?: number;
  make?: string;
  model?: string;
  version?: string;
  fuel?: string;
  invoices: Array<{
    date: string;
    mileage: number;
    operation: string;
    emitter?: string;
    category?: string;
  }>;
  referenceDate?: Date;
}

/**
 * Déduit le fluide frigorigène applicable selon la réglementation européenne et les mentions des factures
 */
export function inferVehicleRefrigerant(options: {
  registrationDate?: string;
  firstRegistrationYear?: number;
  invoices?: Array<{ operation: string }>;
}): RefrigerantInfo {
  const invoicesText = (options.invoices || []).map((i) => i.operation.toLowerCase()).join(' ');

  // 1. Détection explicite dans les factures
  if (invoicesText.includes('r1234yf') || invoicesText.includes('1234yf') || invoicesText.includes('hfo-1234yf')) {
    return {
      type: 'R1234yf',
      label: 'Gaz R1234yf (Nouvelle génération)',
      isEcoCompliant: true,
      gwp: 4,
      estimatedRechargeCost: { minEur: 129, maxEur: 179 },
      notes: 'Détecté dans vos factures d’entretien. Fluide conforme aux normes environnementales actuelles.',
    };
  }

  if (invoicesText.includes('r134a') || invoicesText.includes('r134') || invoicesText.includes('134a')) {
    return {
      type: 'R134a',
      label: 'Gaz R134a (Fluide conventionnel)',
      isEcoCompliant: false,
      gwp: 1430,
      estimatedRechargeCost: { minEur: 59, maxEur: 89 },
      notes: 'Détecté dans vos factures d’entretien. Fluide frigorifique standard éprouvé.',
    };
  }

  // 2. Déduction réglementaire basée sur la date de première mise en circulation
  // Directive 2006/40/CE : obligatoire sur toutes les voitures neuves vendues dans l'UE dès le 01/01/2017
  let regYear = options.firstRegistrationYear;
  if (!regYear && options.registrationDate) {
    const parsed = new Date(options.registrationDate);
    if (!isNaN(parsed.getFullYear())) {
      regYear = parsed.getFullYear();
    }
  }

  if (regYear && regYear >= 2017) {
    return {
      type: 'R1234yf',
      label: 'Gaz R1234yf (Homologation européenne ≥ 2017)',
      isEcoCompliant: true,
      gwp: 4,
      estimatedRechargeCost: { minEur: 129, maxEur: 179 },
      notes: 'Norme obligatoire pour tout véhicule neuf immatriculé depuis 2017. Tarif atelier plus technique.',
    };
  }

  return {
    type: 'R134a',
    label: 'Gaz R134a (Véhicules homologués < 2017)',
    isEcoCompliant: false,
    gwp: 1430,
    estimatedRechargeCost: { minEur: 59, maxEur: 89 },
    notes: 'Fluide standard équipant la majorité du parc automobile antérieur à 2017.',
  };
}

/**
 * Moteur de calcul prédictif de l'état du circuit de climatisation
 */
export function calculateVehicleAirConditioningAssessment(
  params: AirConditioningCalculationParams
): VehicleAirConditioningAssessment {
  const refDate = params.referenceDate || new Date();
  const currentMileage = Math.max(0, params.currentMileage || 0);
  const dailyKmRate = Math.max(1, params.dailyKmRate || 25);

  // 1. Détection compresseur électrique haute tension (Hybride / Électrique)
  const fLower = (params.fuel || '').toLowerCase();
  const vLower = (params.version || '').toLowerCase();
  const mLower = (params.model || '').toLowerCase();
  const isHybridOrEv =
    fLower.includes('hyb') ||
    fLower.includes('elec') ||
    vLower.includes('hybrid') ||
    vLower.includes('phev') ||
    vLower.includes('e-tech') ||
    vLower.includes('hsd') ||
    mLower.includes('zoe') ||
    mLower.includes('leaf') ||
    mLower.includes('e-208');

  // 2. Détection du type de fluide
  const refrigerant = inferVehicleRefrigerant({
    registrationDate: params.registrationDate,
    firstRegistrationYear: params.firstRegistrationYear,
    invoices: params.invoices,
  });

  // 3. Recherche de la dernière intervention réelle sur le circuit frigorifique
  let lastRechargeDate: string | null = null;
  let lastRechargeMileage: number | null = null;

  const acKeywords = [
    'recharge clim',
    'recharge climatisation',
    'recharge de climatisation',
    'recharge & entretien climatisation',
    'entretien climatisation',
    'entretien circuit clim',
    'forfait clim',
    'forfait recharge',
    'r134a',
    'r1234yf',
    'tirage au vide',
    'fluide frigorigene',
    'fluide frigorigène',
    'gaz clim',
  ];

  const sortedInvoices = [...params.invoices].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const inv of sortedInvoices) {
    const op = (inv.operation || '').toLowerCase();
    const cat = (inv.category || '').toLowerCase();
    const isAcInvoice =
      acKeywords.some((kw) => op.includes(kw)) ||
      (cat === 'climatisation' &&
        (op.includes('recharge') || op.includes('gaz') || op.includes('forfait') || op.includes('entretien')) &&
        !op.includes('filtre habitacle') &&
        !op.includes('filtre a pollen') &&
        !op.includes('filtre à pollen'));

    if (isAcInvoice) {
      lastRechargeDate = inv.date;
      lastRechargeMileage = inv.mileage || null;
      break;
    }
  }

  // 4. Calcul du vieillissement (années et mois écoulés)
  const baseDateStr =
    lastRechargeDate ||
    params.registrationDate ||
    (params.firstRegistrationYear ? `${params.firstRegistrationYear}-01-01` : '2020-01-01');
  
  const baseDate = new Date(baseDateStr);
  const diffTimeMs = Math.max(0, refDate.getTime() - baseDate.getTime());
  const diffDays = Math.floor(diffTimeMs / (1000 * 3600 * 24));
  const yearsSinceLastRecharge = Number((diffDays / 365.25).toFixed(1));
  const monthsSinceLastRecharge = Math.floor(diffDays / 30.4375);

  // 5. Modélisation de la perte de fluide (~7.5% par an, saturée à 80%)
  const estimatedFluidLossPercent = Math.min(80, Math.round(yearsSinceLastRecharge * 7.5));
  
  // Score de santé (100% au départ, chute avec l'âge du fluide)
  let healthScore = Math.max(15, 100 - estimatedFluidLossPercent);
  if (yearsSinceLastRecharge > 5) {
    healthScore = Math.max(10, healthScore - 15);
  }

  // 6. Détermination du statut et des seuils
  let status: AirConditioningStatus = 'OPTIMAL';
  let statusLabel = 'Efficacité Optimale';
  let healthColor: 'emerald' | 'blue' | 'amber' | 'orange' | 'red' = 'emerald';
  let recommendation = 'Circuit hermétique et performant. Aucun entretien en atelier requis.';
  let urgentActionNeeded = false;

  if (yearsSinceLastRecharge >= 4.0) {
    status = 'CRITICAL';
    statusLabel = 'Recharge vivement conseillée';
    healthColor = 'red';
    recommendation =
      'Fluide âgé de plus de 4 ans sans entretien documenté. Perte de charge estimée > 30 %. Risque d’usure et de sous-lubrification du compresseur à pleine charge.';
    urgentActionNeeded = true;
  } else if (yearsSinceLastRecharge >= 3.0) {
    status = 'DUE_SOON';
    statusLabel = 'Bilan & Entretien à prévoir';
    healthColor = 'orange';
    recommendation =
      'Votre circuit approche les 3 à 4 ans. Les équipementiers (Valeo / Bosch) conseillent une pesée du gaz et un appoint d’huile lubrifiante.';
    urgentActionNeeded = false;
  } else if (yearsSinceLastRecharge >= 2.0) {
    status = 'ATTENTION';
    statusLabel = 'Contrôle préventif recommandé';
    healthColor = 'amber';
    recommendation =
      'Légère perte de charge naturelle. Contrôlez l’efficacité thermique (température de buse ≤ 7 °C) et l’odeur de l’habitacle.';
  }

  // 7. Détection saisonnière estivale (Avril à Juillet : mois 3 à 6 en JS)
  const currentMonth = refDate.getMonth();
  const isSpringSummer = currentMonth >= 3 && currentMonth <= 6;
  const isSeasonalBoostActive = isSpringSummer && (status === 'ATTENTION' || status === 'DUE_SOON' || status === 'CRITICAL');

  let seasonalAlertTitle: string | undefined;
  let seasonalAlertMessage: string | undefined;

  if (isSeasonalBoostActive) {
    seasonalAlertTitle = '☀️ Anticipation Confort Estival';
    if (status === 'CRITICAL' || status === 'DUE_SOON') {
      seasonalAlertMessage = `Les fortes chaleurs approchent et votre climatisation n'a pas été entretenue depuis ${yearsSinceLastRecharge} ans. Anticipez votre bilan en atelier pour éviter l'air tiède sur la route des vacances.`;
    } else {
      seasonalAlertMessage = `Avant les trajets d'été, vérifiez le souffle froid de votre climatisation et remplacez votre filtre d'habitacle pour un confort thermique optimal.`;
    }
  }

  // 8. Projection de l'échéance recommandée (cycle de 36 à 48 mois ou 60 000 km)
  const targetLifespanMonths = 42; // 3.5 ans en moyenne
  const targetLifespanKm = 60000;

  let projectedDueMileage = currentMileage;
  if (lastRechargeMileage) {
    projectedDueMileage = lastRechargeMileage + targetLifespanKm;
  } else {
    projectedDueMileage = currentMileage + Math.max(5000, targetLifespanKm - (currentMileage % targetLifespanKm));
  }

  const remainingMonths = Math.max(0, targetLifespanMonths - monthsSinceLastRecharge);
  const projectedDueDateObj = new Date(baseDate);
  projectedDueDateObj.setMonth(projectedDueDateObj.getMonth() + targetLifespanMonths);
  const projectedDueDate = projectedDueDateObj.toISOString().split('T')[0];

  return {
    vehicleId: params.vehicleId,
    refrigerant,
    isHighVoltageCompressor: isHybridOrEv,
    highVoltageWarning: isHybridOrEv
      ? 'Véhicule Hybride / Électrique : compresseur haute tension exigeant impérativement une huile isolante non conductrice (ND-OIL 11 / POE). Station de recharge certifiée requise.'
      : undefined,
    lastRechargeDate,
    lastRechargeMileage,
    yearsSinceLastRecharge,
    monthsSinceLastRecharge,
    estimatedFluidLossPercent,
    globalHealthScore: healthScore,
    status,
    statusLabel,
    healthColor,
    recommendation,
    urgentActionNeeded,
    isSeasonalBoostActive,
    seasonalAlertTitle,
    seasonalAlertMessage,
    projectedDueDate,
    projectedDueMileage,
    diyGuide: {
      cabinFilterAction: "Remplacement du filtre d'habitacle (pollen / charbon actif) : réalisable en 10 minutes pour 15-25 € sur internet.",
      antibacterialTreatmentAction: "Traitement assainissant évaporateur en aérosol : neutralise les champignons et les odeurs de moisi au démarrage.",
      thermalSelfTest: "Auto-test d'efficacité : enclenchez la clim au minimum pendant 3 minutes avec un thermomètre sur l'aérateur central. La température doit descendre entre 4 °C et 8 °C.",
    },
    workshopGuide: {
      vacuumTestRequired: true,
      gasRefillDescription: `Tirage au vide pendant 20 minutes (pour déshydrater le circuit) et pesée précise du fluide ${refrigerant.type} à la masse exacte préconisée constructeur.`,
      compressorOilCheck: isHybridOrEv
        ? "Appoint impératif en huile diélectrique spéciale (POE/ND-11) adaptée aux compresseurs haute tension."
        : "Appoint en huile lubrifiante PAG et réinjection éventuelle de traceur UV pour détecter les micro-fuites futures.",
    },
  };
}
