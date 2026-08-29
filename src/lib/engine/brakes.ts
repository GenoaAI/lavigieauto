/**
 * Brake Pads & Discs Predictive Engine (LaVigieAuto)
 * 
 * Modélisation physique et prédictive de l'usure du système de freinage (Plaquettes & Disques) :
 * - Garniture neuve : 12.0 mm (Essieu AV) / 10.0 mm (Essieu AR)
 * - Seuil d'alerte / Prévention : 4.0 mm (~75-80% d'usure)
 * - Témoin légal / Limite critique : 2.0 mm (100% d'usure - Risque de détérioration des disques)
 * - Longévité moyenne constatée :
 *   - Train AV (70% du freinage) : ~40 000 km (BVM) / ~32 000 km (BVA / SUV)
 *   - Train AR (30% du freinage) : ~70 000 km (BVM) / ~55 000 km (BVA avec frein de parking électrique)
 * - Règle d'or : Remplacement des disques conseillé tous les 2 jeux de plaquettes
 */

export interface BrakeAxleState {
  axle: 'FRONT' | 'REAR';
  label: string;
  padType: string;
  sourceType: 'WORKSHOP_MEASUREMENT' | 'NEW_PADS_INSTALLED' | 'CT_INSPECTION' | 'ESTIMATED';
  lastEventDate: string;
  lastEventMileage: number;
  lastEventLabel: string;
  currentEstimatedMileage: number;
  kmDrivenSinceEvent: number;
  totalExpectedLifespanKm: number;
  wearPercentage: number; // 0% = neuf (12mm/10mm), 100% = témoin critique (2.0mm)
  remainingLiningThicknessMm: number; // e.g. 3.5 mm
  remainingKm: number;
  projectedReplacementDate: string;
  status: 'EXCELLENT' | 'GOOD' | 'ATTENTION' | 'DUE_SOON' | 'CRITICAL';
  statusLabel: string;
  healthColor: 'emerald' | 'blue' | 'amber' | 'orange' | 'red';
  recommendation: string;
  discsCondition: 'OPTIMAL' | 'REPLACE_WITH_NEXT_PADS' | 'CRITICAL_CHECK_NEEDED';
  discsStatusLabel: string;
}

export interface VehicleBrakeAssessment {
  vehicleId: string;
  frontAxle: BrakeAxleState;
  rearAxle: BrakeAxleState;
  globalHealthScore: number; // 0 to 100%
  overallStatus: 'EXCELLENT' | 'GOOD' | 'ATTENTION' | 'DUE_SOON' | 'CRITICAL';
  urgentActionNeeded: boolean;
  nextReplacementDate: string;
  nextReplacementAxle: 'FRONT' | 'REAR' | 'BOTH';
  replaceDiscsWithPads: boolean;
  historySummary: string;
  estimatedCostRange: {
    padsOnlyTTC: { min: number; max: number };
    discsAndPadsTTC: { min: number; max: number };
  };
}

export interface BrakeCalculationParams {
  vehicleId: string;
  currentMileage: number;
  dailyKmRate: number;
  make?: string;
  model?: string;
  version?: string;
  transmission?: string;
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
    isFavorable?: boolean;
    defects?: Array<{ code?: string; description?: string }>;
  }>;
}

/**
 * Extraction des mesures explicites d'usure de plaquettes dans les textes de facture / OCR
 * Exemples : "CTRL PLAQUETTES AV 80% D'USURE", "PLAQUETTES AV 4MM", "PLAQUETTES AR 80%"
 */
export function extractBrakeWearMeasurements(text?: string): {
  frontWearPercent?: number;
  rearWearPercent?: number;
  frontThicknessMm?: number;
  rearThicknessMm?: number;
} {
  if (!text) return {};
  const t = text.toUpperCase();

  let frontWearPercent: number | undefined = undefined;
  let rearWearPercent: number | undefined = undefined;
  let frontThicknessMm: number | undefined = undefined;
  let rearThicknessMm: number | undefined = undefined;

  // 1. Détection pourcentage AV
  const frontPctMatch = t.match(/PLAQUETTES?\s+AV(?:ANT)?\s*(\d{1,3})\s*%\s*(?:D['’]USUR[E]?)?/i)
    || t.match(/PLAQUETTES?\s+AV(?:ANT)?\s*:\s*(\d{1,3})\s*%/i)
    || t.match(/FREINS?\s+AV(?:ANT)?\s*(\d{1,3})\s*%\s*(?:D['’]USUR[E]?)?/i);
  if (frontPctMatch && frontPctMatch[1]) {
    const val = parseInt(frontPctMatch[1], 10);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      frontWearPercent = val;
    }
  }

  // 2. Détection pourcentage AR
  const rearPctMatch = t.match(/PLAQUETTES?\s+AR(?:RIERE)?\s*(\d{1,3})\s*%\s*(?:D['’]USUR[E]?)?/i)
    || t.match(/PLAQUETTES?\s+AR(?:RIERE)?\s*:\s*(\d{1,3})\s*%/i)
    || t.match(/FREINS?\s+AR(?:RIERE)?\s*(\d{1,3})\s*%\s*(?:D['’]USUR[E]?)?/i);
  if (rearPctMatch && rearPctMatch[1]) {
    const val = parseInt(rearPctMatch[1], 10);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      rearWearPercent = val;
    }
  }

  // 3. Détection épaisseur en mm
  const frontMmMatch = t.match(/PLAQUETTES?\s+AV(?:ANT)?\s*(\d+(?:[.,]\d+)?)\s*MM/i);
  if (frontMmMatch && frontMmMatch[1]) {
    const mm = parseFloat(frontMmMatch[1].replace(',', '.'));
    if (!isNaN(mm) && mm > 0 && mm <= 15) {
      frontThicknessMm = mm;
    }
  }

  const rearMmMatch = t.match(/PLAQUETTES?\s+AR(?:RIERE)?\s*(\d+(?:[.,]\d+)?)\s*MM/i);
  if (rearMmMatch && rearMmMatch[1]) {
    const mm = parseFloat(rearMmMatch[1].replace(',', '.'));
    if (!isNaN(mm) && mm > 0 && mm <= 15) {
      rearThicknessMm = mm;
    }
  }

  return { frontWearPercent, rearWearPercent, frontThicknessMm, rearThicknessMm };
}

/**
 * Moteur de calcul prédictif de l'état des plaquettes et disques
 */
export function calculateVehicleBrakeAssessment(params: BrakeCalculationParams): VehicleBrakeAssessment {
  const currentKm = params.currentMileage || 10000;
  const dailyKm = params.dailyKmRate > 0 ? params.dailyKmRate : 30;
  const isAutomatic = (params.transmission || '').toLowerCase().includes('auto') || (params.model || '').toUpperCase().includes('ESPACE');
  const isHeavy = (params.model || '').toUpperCase().includes('ESPACE') || (params.model || '').toUpperCase().includes('CHEROKEE');

  // Durée de vie de base (km)
  const frontBaseLifespan = isAutomatic ? (isHeavy ? 32000 : 36000) : 42000;
  const rearBaseLifespan = isAutomatic ? (isHeavy ? 52000 : 60000) : 70000;

  // Recherche des événements dans les factures
  let latestFrontMeasurement: { date: string; mileage: number; wearPercent?: number; thicknessMm?: number; emitter?: string } | null = null;
  let latestRearMeasurement: { date: string; mileage: number; wearPercent?: number; thicknessMm?: number; emitter?: string } | null = null;
  let latestFrontPadReplacement: { date: string; mileage: number; emitter?: string } | null = null;
  let latestRearPadReplacement: { date: string; mileage: number; emitter?: string } | null = null;
  let latestFrontDiscReplacement: { date: string; mileage: number; emitter?: string } | null = null;
  let latestRearDiscReplacement: { date: string; mileage: number; emitter?: string } | null = null;

  // Tri des factures par date décroissante
  const sortedInvoices = [...(params.invoices || [])].sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
  );

  for (const inv of sortedInvoices) {
    const op = (inv.operation || '').toUpperCase();
    const wearData = extractBrakeWearMeasurements(op);

    if (wearData.frontWearPercent !== undefined || wearData.frontThicknessMm !== undefined) {
      if (!latestFrontMeasurement) {
        latestFrontMeasurement = {
          date: inv.date,
          mileage: inv.mileage || currentKm,
          wearPercent: wearData.frontWearPercent,
          thicknessMm: wearData.frontThicknessMm,
          emitter: inv.emitter,
        };
      }
    }

    if (wearData.rearWearPercent !== undefined || wearData.rearThicknessMm !== undefined) {
      if (!latestRearMeasurement) {
        latestRearMeasurement = {
          date: inv.date,
          mileage: inv.mileage || currentKm,
          wearPercent: wearData.rearWearPercent,
          thicknessMm: wearData.rearThicknessMm,
          emitter: inv.emitter,
        };
      }
    }

    // Détection remplacement plaquettes
    if (op.includes('PLAQUET') && (op.includes('REMPLACEMENT') || op.includes('POSE') || op.includes('JEU DE PLAQUETTES') || op.includes('ECHANGE'))) {
      if (!op.includes('AR') && !latestFrontPadReplacement) {
        latestFrontPadReplacement = { date: inv.date, mileage: inv.mileage || currentKm, emitter: inv.emitter };
      }
      if ((op.includes('AR') || op.includes('ARRIERE') || op.includes('4 PLAQUETTES')) && !latestRearPadReplacement) {
        latestRearPadReplacement = { date: inv.date, mileage: inv.mileage || currentKm, emitter: inv.emitter };
      }
    }

    // Détection remplacement disques
    if (op.includes('DISQUE') && (op.includes('REMPLACEMENT') || op.includes('POSE') || op.includes('JEU DE DISQUES'))) {
      if (!op.includes('AR') && !latestFrontDiscReplacement) {
        latestFrontDiscReplacement = { date: inv.date, mileage: inv.mileage || currentKm, emitter: inv.emitter };
      }
      if ((op.includes('AR') || op.includes('ARRIERE')) && !latestRearDiscReplacement) {
        latestRearDiscReplacement = { date: inv.date, mileage: inv.mileage || currentKm, emitter: inv.emitter };
      }
    }
  }

  // Contrôle Technique : recherche du dernier CT et des défaillances plaquettes 1.1.13 ou disques 1.1.14
  let hasBrakePadDefect = false;
  let hasDiscDefect = false;
  let latestFavorableCt: { date: string; mileage: number } | null = null;

  for (const insp of params.inspections || []) {
    if (insp.isFavorable && !latestFavorableCt) {
      latestFavorableCt = { date: insp.date, mileage: insp.mileage || currentKm };
    }
    for (const d of insp.defects || []) {
      const code = d.code || '';
      const desc = (d.description || '').toUpperCase();
      if (code.startsWith('1.1.13') || desc.includes('GARNITURE') || desc.includes('PLAQUETTE')) {
        hasBrakePadDefect = true;
      }
      if (code.startsWith('1.1.14') || desc.includes('DISQUE')) {
        hasDiscDefect = true;
      }
    }
  }

  // --- TRAITEMENT ESSIEU AVANT ---
  let frontSourceType: BrakeAxleState['sourceType'] = 'ESTIMATED';
  let frontWearPct = 0;
  let frontThickness = 12.0;
  let frontLastEventDate = params.invoices[0]?.date || '2023-01-01';
  let frontLastEventKm = params.invoices[0]?.mileage || Math.max(0, currentKm - 15000);
  let frontLastEventLabel = 'Suivi régulier (Contrôle visuel au prochain entretien)';

  if (latestFrontMeasurement) {
    frontSourceType = 'WORKSHOP_MEASUREMENT';
    frontLastEventDate = latestFrontMeasurement.date;
    frontLastEventKm = latestFrontMeasurement.mileage;
    frontLastEventLabel = 'Mesure atelier (' + (latestFrontMeasurement.emitter || 'Garage habituel') + ')';
    
    if (latestFrontMeasurement.wearPercent !== undefined) {
      const baseWear = latestFrontMeasurement.wearPercent;
      const kmSince = Math.max(0, currentKm - frontLastEventKm);
      const additionalWear = (kmSince / frontBaseLifespan) * 100;
      frontWearPct = Math.min(100, Math.round(baseWear + additionalWear));
      frontThickness = Math.max(2.0, Math.round((12.0 - (frontWearPct / 100) * 10.0) * 10) / 10);
    } else if (latestFrontMeasurement.thicknessMm !== undefined) {
      frontThickness = latestFrontMeasurement.thicknessMm;
      frontWearPct = Math.min(100, Math.max(0, Math.round(((12.0 - frontThickness) / 10.0) * 100)));
    }
  } else if (latestFrontPadReplacement) {
    frontSourceType = 'NEW_PADS_INSTALLED';
    frontLastEventDate = latestFrontPadReplacement.date;
    frontLastEventKm = latestFrontPadReplacement.mileage;
    frontLastEventLabel = 'Plaquettes neuves posées (' + (latestFrontPadReplacement.emitter || 'Atelier') + ')';
    const kmSince = Math.max(0, currentKm - frontLastEventKm);
    frontWearPct = Math.min(100, Math.round((kmSince / frontBaseLifespan) * 100));
    frontThickness = Math.max(2.0, Math.round((12.0 - (frontWearPct / 100) * 10.0) * 10) / 10);
  } else if (latestFavorableCt) {
    // Si un Contrôle Technique récent a été validé avec succès sans défaillance de freinage
    frontSourceType = 'ESTIMATED';
    frontLastEventDate = latestFavorableCt.date;
    frontLastEventKm = latestFavorableCt.mileage;
    frontLastEventLabel = 'Contrôle Technique Favorable (Organes validés)';
    const kmSinceCt = Math.max(0, currentKm - latestFavorableCt.mileage);
    const ctBaseWear = 30; // Usure max moyenne lors d'un CT sans défaillance
    frontWearPct = Math.min(65, Math.round(ctBaseWear + (kmSinceCt / frontBaseLifespan) * 100));
    frontThickness = Math.max(2.0, Math.round((12.0 - (frontWearPct / 100) * 10.0) * 10) / 10);
  } else {
    // Estimé de base modéré sans fausse alerte mathématique
    frontWearPct = 35;
    frontThickness = 8.5;
  }

  if (hasBrakePadDefect) {
    frontWearPct = Math.max(frontWearPct, 95);
    frontThickness = Math.min(frontThickness, 2.2);
  }

  const frontRemainingKm = Math.max(0, Math.round(((100 - frontWearPct) / 100) * frontBaseLifespan));
  const frontDaysLeft = Math.round(frontRemainingKm / dailyKm);
  const frontProjDate = new Date(Date.now() + frontDaysLeft * 86400000).toISOString().split('T')[0];

  let frontStatus: BrakeAxleState['status'] = 'GOOD';
  let frontStatusLabel = 'État Optimal';
  let frontColor: BrakeAxleState['healthColor'] = 'emerald';
  let frontRec = 'Épaisseur de garniture conforme. Aucun remplacement requis pour le moment.';

  if (frontWearPct >= 90 || frontThickness <= 2.5) {
    frontStatus = 'CRITICAL';
    frontStatusLabel = 'Remplacement Immédiat';
    frontColor = 'red';
    frontRec = 'Garniture au seuil critique (< 2.5 mm). Risque de contact métal sur métal et rayure des disques.';
  } else if (frontWearPct >= 75 || frontThickness <= 4.0) {
    frontStatus = 'DUE_SOON';
    frontStatusLabel = 'À Remplacer Prochainement';
    frontColor = 'orange';
    frontRec = 'Plaquettes usées à plus de 75%. Planifiez le remplacement sous ~3 000 à 5 000 km.';
  } else if (frontWearPct >= 50) {
    frontStatus = 'ATTENTION';
    frontStatusLabel = 'Usure Intermédiaire';
    frontColor = 'amber';
    frontRec = 'Usure normale de mi-vie. Contrôle visuel recommandé lors du prochain entretien.';
  }

  // Disques AV : si les plaquettes sont changées pour la 2e fois ou si usure > 80%
  const frontDiscsCondition: BrakeAxleState['discsCondition'] = frontWearPct >= 80 ? 'REPLACE_WITH_NEXT_PADS' : 'OPTIMAL';
  const frontDiscsLabel = frontWearPct >= 80 ? 'Remplacement combiné conseillé (Plaquettes + Disques)' : 'Disques conformes (Cycle 1/2)';

  const frontAxle: BrakeAxleState = {
    axle: 'FRONT',
    label: 'Essieu Avant (70% force freinage)',
    padType: 'Plaquettes de frein avant homologuées',
    sourceType: frontSourceType,
    lastEventDate: frontLastEventDate,
    lastEventMileage: frontLastEventKm,
    lastEventLabel: frontLastEventLabel,
    currentEstimatedMileage: currentKm,
    kmDrivenSinceEvent: Math.max(0, currentKm - frontLastEventKm),
    totalExpectedLifespanKm: frontBaseLifespan,
    wearPercentage: frontWearPct,
    remainingLiningThicknessMm: frontThickness,
    remainingKm: frontRemainingKm,
    projectedReplacementDate: frontProjDate,
    status: frontStatus,
    statusLabel: frontStatusLabel,
    healthColor: frontColor,
    recommendation: frontRec,
    discsCondition: frontDiscsCondition,
    discsStatusLabel: frontDiscsLabel,
  };

  // --- TRAITEMENT ESSIEU ARRIÈRE ---
  let rearSourceType: BrakeAxleState['sourceType'] = 'ESTIMATED';
  let rearWearPct = 0;
  let rearThickness = 10.0;
  let rearLastEventDate = params.invoices[0]?.date || '2023-01-01';
  let rearLastEventKm = params.invoices[0]?.mileage || Math.max(0, currentKm - 25000);
  let rearLastEventLabel = 'Suivi régulier (Contrôle visuel au prochain entretien)';

  if (latestRearMeasurement) {
    rearSourceType = 'WORKSHOP_MEASUREMENT';
    rearLastEventDate = latestRearMeasurement.date;
    rearLastEventKm = latestRearMeasurement.mileage;
    rearLastEventLabel = 'Mesure atelier (' + (latestRearMeasurement.emitter || 'Garage habituel') + ')';
    
    if (latestRearMeasurement.wearPercent !== undefined) {
      const baseWear = latestRearMeasurement.wearPercent;
      const kmSince = Math.max(0, currentKm - rearLastEventKm);
      const additionalWear = (kmSince / rearBaseLifespan) * 100;
      rearWearPct = Math.min(100, Math.round(baseWear + additionalWear));
      rearThickness = Math.max(2.0, Math.round((10.0 - (rearWearPct / 100) * 8.0) * 10) / 10);
    } else if (latestRearMeasurement.thicknessMm !== undefined) {
      rearThickness = latestRearMeasurement.thicknessMm;
      rearWearPct = Math.min(100, Math.max(0, Math.round(((10.0 - rearThickness) / 8.0) * 100)));
    }
  } else if (latestRearPadReplacement) {
    rearSourceType = 'NEW_PADS_INSTALLED';
    rearLastEventDate = latestRearPadReplacement.date;
    rearLastEventKm = latestRearPadReplacement.mileage;
    rearLastEventLabel = 'Plaquettes neuves posées (' + (latestRearPadReplacement.emitter || 'Atelier') + ')';
    const kmSince = Math.max(0, currentKm - rearLastEventKm);
    rearWearPct = Math.min(100, Math.round((kmSince / rearBaseLifespan) * 100));
    rearThickness = Math.max(2.0, Math.round((10.0 - (rearWearPct / 100) * 8.0) * 10) / 10);
  } else if (latestFavorableCt) {
    rearSourceType = 'ESTIMATED';
    rearLastEventDate = latestFavorableCt.date;
    rearLastEventKm = latestFavorableCt.mileage;
    rearLastEventLabel = 'Contrôle Technique Favorable (Organes validés)';
    const kmSinceCt = Math.max(0, currentKm - latestFavorableCt.mileage);
    const ctBaseWear = 25;
    rearWearPct = Math.min(60, Math.round(ctBaseWear + (kmSinceCt / rearBaseLifespan) * 100));
    rearThickness = Math.max(2.0, Math.round((10.0 - (rearWearPct / 100) * 8.0) * 10) / 10);
  } else {
    rearWearPct = 30;
    rearThickness = 7.6;
  }

  const rearRemainingKm = Math.max(0, Math.round(((100 - rearWearPct) / 100) * rearBaseLifespan));
  const rearDaysLeft = Math.round(rearRemainingKm / dailyKm);
  const rearProjDate = new Date(Date.now() + rearDaysLeft * 86400000).toISOString().split('T')[0];

  let rearStatus: BrakeAxleState['status'] = 'GOOD';
  let rearStatusLabel = 'État Optimal';
  let rearColor: BrakeAxleState['healthColor'] = 'emerald';
  let rearRec = 'Épaisseur de garniture arrière conforme.';

  if (rearWearPct >= 90 || rearThickness <= 2.2) {
    rearStatus = 'CRITICAL';
    rearStatusLabel = 'Remplacement Immédiat';
    rearColor = 'red';
    rearRec = 'Garniture arrière au seuil critique (< 2.2 mm). Remplacement prioritaire.';
  } else if (rearWearPct >= 75 || rearThickness <= 3.5) {
    rearStatus = 'DUE_SOON';
    rearStatusLabel = 'À Remplacer Prochainement';
    rearColor = 'orange';
    rearRec = 'Plaquettes arrière usées à plus de 75%. Planifiez le remplacement avec le train avant.';
  } else if (rearWearPct >= 50) {
    rearStatus = 'ATTENTION';
    rearStatusLabel = 'Usure Intermédiaire';
    rearColor = 'amber';
    rearRec = 'Usure normale de mi-vie.';
  }

  const rearDiscsCondition: BrakeAxleState['discsCondition'] = rearWearPct >= 80 ? 'REPLACE_WITH_NEXT_PADS' : 'OPTIMAL';
  const rearDiscsLabel = rearWearPct >= 80 ? 'Remplacement combiné conseillé' : 'Disques arrière conformes';

  const rearAxle: BrakeAxleState = {
    axle: 'REAR',
    label: 'Essieu Arrière (30% force freinage)',
    padType: 'Plaquettes de frein arrière homologuées',
    sourceType: rearSourceType,
    lastEventDate: rearLastEventDate,
    lastEventMileage: rearLastEventKm,
    lastEventLabel: rearLastEventLabel,
    currentEstimatedMileage: currentKm,
    kmDrivenSinceEvent: Math.max(0, currentKm - rearLastEventKm),
    totalExpectedLifespanKm: rearBaseLifespan,
    wearPercentage: rearWearPct,
    remainingLiningThicknessMm: rearThickness,
    remainingKm: rearRemainingKm,
    projectedReplacementDate: rearProjDate,
    status: rearStatus,
    statusLabel: rearStatusLabel,
    healthColor: rearColor,
    recommendation: rearRec,
    discsCondition: rearDiscsCondition,
    discsStatusLabel: rearDiscsLabel,
  };

  // Score global (moyenne pondérée 60% AV / 40% AR)
  const globalHealthScore = Math.max(0, Math.round(100 - (frontWearPct * 0.6 + rearWearPct * 0.4)));
  const urgentActionNeeded = frontStatus === 'CRITICAL' || rearStatus === 'CRITICAL' || frontStatus === 'DUE_SOON' || rearStatus === 'DUE_SOON';

  let nextReplacementAxle: VehicleBrakeAssessment['nextReplacementAxle'] = 'FRONT';
  let nextReplacementDate = frontProjDate;
  if (Math.abs(frontWearPct - rearWearPct) <= 10 && frontWearPct >= 70) {
    nextReplacementAxle = 'BOTH';
    nextReplacementDate = frontDaysLeft < rearDaysLeft ? frontProjDate : rearProjDate;
  } else if (rearDaysLeft < frontDaysLeft) {
    nextReplacementAxle = 'REAR';
    nextReplacementDate = rearProjDate;
  }

  const replaceDiscsWithPads = frontDiscsCondition === 'REPLACE_WITH_NEXT_PADS' || rearDiscsCondition === 'REPLACE_WITH_NEXT_PADS';

  // Fourchettes de prix indicatives selon véhicule
  const padsOnlyMin = isHeavy ? 110 : 85;
  const padsOnlyMax = isHeavy ? 175 : 135;
  const discsPadsMin = isHeavy ? 280 : 210;
  const discsPadsMax = isHeavy ? 440 : 330;

  return {
    vehicleId: params.vehicleId,
    frontAxle,
    rearAxle,
    globalHealthScore,
    overallStatus: urgentActionNeeded ? (frontStatus === 'CRITICAL' || rearStatus === 'CRITICAL' ? 'CRITICAL' : 'DUE_SOON') : 'GOOD',
    urgentActionNeeded,
    nextReplacementDate,
    nextReplacementAxle,
    replaceDiscsWithPads,
    historySummary: latestFrontMeasurement
      ? 'Relevé atelier le ' + latestFrontMeasurement.date + ' (' + (latestFrontMeasurement.wearPercent || 80) + "% d'usure AV)"
      : 'Suivi prédictif régulier',
    estimatedCostRange: {
      padsOnlyTTC: { min: padsOnlyMin, max: padsOnlyMax },
      discsAndPadsTTC: { min: discsPadsMin, max: discsPadsMax },
    },
  };
}
