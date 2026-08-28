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

export function extractTireDimension(text?: string, defaultDim: string = "Dimensions Homologuées"): string {
  if (!text) return defaultDim;
  const dimMatch = text.match(/\b(\d{3}\s*\/\s*\d{2}\s*R\s*\d{2}(?:\s*\d{2,3}[A-Z])?)\b/i)
    || text.match(/\b(\d{3}\s*\/\s*\d{2}\s*R\d{2}(?:\s*\d{2,3}[A-Z])?)\b/i);
  if (dimMatch) {
    return dimMatch[1].replace(/(\d{2})R(\d{2})/, "$1 R$2").toUpperCase().trim();
  }
  return defaultDim;
}

export function extractTireBrandAndModel(text?: string): string {
  const t = (text || "").toLowerCase();
  if (t.includes("kleber")) {
    return t.includes("dynaxer") ? "Kleber Dynaxer HP5" : "Kleber Dynaxer";
  }
  if (t.includes("michelin")) {
    if (t.includes("crossclimate")) return "Michelin CrossClimate 2";
    if (t.includes("primacy")) return "Michelin Primacy 4";
    if (t.includes("pilot")) return "Michelin Pilot Sport 5";
    if (t.includes("energy")) return "Michelin Energy Saver";
    return "Michelin Primacy";
  }
  if (t.includes("continental")) {
    if (t.includes("ecocontact")) return "Continental EcoContact 6";
    if (t.includes("premiumcontact")) return "Continental PremiumContact 7";
    if (t.includes("allseason")) return "Continental AllSeasonContact";
    return "Continental";
  }
  if (t.includes("bridgestone")) {
    if (t.includes("turanza")) return "Bridgestone Turanza T001";
    if (t.includes("weather")) return "Bridgestone Weather Control";
    if (t.includes("blizzak")) return "Bridgestone Blizzak";
    return "Bridgestone Turanza";
  }
  if (t.includes("turanza")) return "Bridgestone Turanza T001";
  if (t.includes("goodyear")) {
    if (t.includes("vector") || t.includes("4season")) return "Goodyear Vector 4Seasons";
    if (t.includes("efficient")) return "Goodyear EfficientGrip";
    return "Goodyear EfficientGrip";
  }
  if (t.includes("pirelli")) {
    if (t.includes("cinturato")) return "Pirelli Cinturato";
    if (t.includes("p zero") || t.includes("pzero")) return "Pirelli P Zero";
    return "Pirelli Cinturato";
  }
  if (t.includes("hankook")) {
    if (t.includes("ventus")) return "Hankook Ventus Prime";
    if (t.includes("kinergy")) return "Hankook Kinergy";
    return "Hankook Ventus";
  }
  if (t.includes("dunlop")) return "Dunlop Sport BluResponse";
  if (t.includes("nokian")) return "Nokian Seasonproof";
  if (t.includes("firestone")) return "Firestone Roadhawk";
  if (t.includes("uniroyal")) return "Uniroyal RainExpert";
  if (t.includes("falken")) return "Falken Ziex";
  if (t.includes("kumho")) return "Kumho Ecwing";
  if (t.includes("yokohama")) return "Yokohama BluEarth";
  if (t.includes("toyo")) return "Toyo Proxes";

  return "Pneumatiques Neufs";
}

export function calculateVehicleTireAssessment(params: TireCalculationParams): VehicleTireAssessment {
  const { vehicleId, currentMileage, dailyKmRate, make, model, version, invoices } = params;
  const safeDailyRate = Math.max(5, dailyKmRate || 35);
  const defaultDimension = getStandardHomologatedTireSize(make, model, version);

  // 1. Tri systématique des factures par date descendante (plus récentes en premier)
  // À date égale, privilégier les lignes mentionnant la marque/modèle du pneumatique
  const sortedInvoices = [...(invoices || [])].sort((a, b) => {
    const timeA = new Date(a.date || 0).getTime();
    const timeB = new Date(b.date || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    const brandA = extractTireBrandAndModel(a.operation);
    const brandB = extractTireBrandAndModel(b.operation);
    if (brandA !== "Pneumatiques Neufs" && brandB === "Pneumatiques Neufs") return -1;
    if (brandB !== "Pneumatiques Neufs" && brandA === "Pneumatiques Neufs") return 1;
    return (b.mileage || 0) - (a.mileage || 0);
  });

  // Détection des montes de pneus dans l'historique de factures
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

  let frontAssigned = false;
  let rearAssigned = false;

  // Analyse chronologique inversée (du plus récent au plus ancien)
  for (const inv of sortedInvoices) {
    const op = (inv.operation || "").toLowerCase();
    
    // Ignorer les simples contrôles de pression de routine sans mention d'usure ni de pose neuve
    const isOnlyPressureCheck = (op.includes("pression") || op.includes("gonflage")) && 
      !op.includes("%") && !op.includes("usure") && !op.includes("montage") && !op.includes("remplacement") && !op.includes("neuf") && !op.includes("kleber") && !op.includes("michelin") && !op.includes("bridgestone") && !op.includes("continental") && !op.includes("turanza");

    if (isOnlyPressureCheck) {
      continue;
    }

    // Ignorer les simples remarques / devis / préconisations futures
    const isAdvisoryOnly = (op.includes("prevoir") || op.includes("prévoir") || op.includes("a prevoir") || op.includes("à prévoir") || op.includes("devis"))
      && !op.includes("forfait") && !op.includes("kleber") && !op.includes("michelin") && !op.includes("bridgestone") && !op.includes("continental") && !op.includes("turanza") && !op.includes("dynaxer") && !op.includes("4 pneus neufs");

    if (isAdvisoryOnly) {
      continue;
    }

    const detectedDim = extractTireDimension(inv.operation, defaultDimension);
    const detectedBrand = extractTireBrandAndModel(inv.operation);

    // Cas A : Relevé d'usure chiffré en atelier (ex: CTRL PNEUS AV 30% D'USURE, CTRL PNEUS AR 20% D'USURE)
    const hasWearInspection = op.includes("%") || (op.includes("usure") && !op.includes("neuf") && !op.includes("remplacement"));
    const frontWearMatch = op.match(/pneus?\s*(?:av|avant)\s*(\d+)\s*%/i) || op.match(/(?:usure|ctrl)\s*pneus?\s*(?:av|avant)\s*(\d+)\s*%/i);
    const rearWearMatch = op.match(/pneus?\s*(?:ar|arrière|arriere)\s*(\d+)\s*%/i) || op.match(/(?:usure|ctrl)\s*pneus?\s*(?:ar|arrière|arriere)\s*(\d+)\s*%/i);
    const genericWearMatch = op.match(/pneus?\s*(\d+)\s*%/i);

    if (frontWearMatch && !frontAssigned) {
      const wearVal = parseInt(frontWearMatch[1], 10);
      frontTireState = {
        date: inv.date,
        mileage: inv.mileage,
        brand: detectedBrand !== "Pneumatiques Neufs" ? detectedBrand : "Pneumatiques Homologués",
        dimension: detectedDim,
        sourceType: "WORKSHOP_INSPECTION",
        wearPercentReported: wearVal,
        eventLabel: `Contrôle d'usure en atelier (${wearVal}% mesuré)`,
      };
      frontAssigned = true;
    }

    if (rearWearMatch && !rearAssigned) {
      const wearVal = parseInt(rearWearMatch[1], 10);
      rearTireState = {
        date: inv.date,
        mileage: inv.mileage,
        brand: detectedBrand !== "Pneumatiques Neufs" ? detectedBrand : "Pneumatiques Homologués",
        dimension: detectedDim,
        sourceType: "WORKSHOP_INSPECTION",
        wearPercentReported: wearVal,
        eventLabel: `Contrôle d'usure en atelier (${wearVal}% mesuré)`,
      };
      rearAssigned = true;
    }

    if (hasWearInspection && (frontAssigned || rearAssigned)) {
      if (frontAssigned && rearAssigned) break;
      continue;
    }

    if (hasWearInspection && genericWearMatch && !frontAssigned && !rearAssigned) {
      const wearVal = parseInt(genericWearMatch[1], 10);
      frontTireState = {
        date: inv.date,
        mileage: inv.mileage,
        brand: detectedBrand !== "Pneumatiques Neufs" ? detectedBrand : "Pneumatiques Homologués",
        dimension: detectedDim,
        sourceType: "WORKSHOP_INSPECTION",
        wearPercentReported: wearVal,
        eventLabel: `Contrôle d'usure en atelier (${wearVal}% mesuré)`,
      };
      rearTireState = {
        date: inv.date,
        mileage: inv.mileage,
        brand: detectedBrand !== "Pneumatiques Neufs" ? detectedBrand : "Pneumatiques Homologués",
        dimension: detectedDim,
        sourceType: "WORKSHOP_INSPECTION",
        wearPercentReported: wearVal,
        eventLabel: `Contrôle d'usure en atelier (${wearVal}% mesuré)`,
      };
      frontAssigned = true;
      rearAssigned = true;
      break;
    }

    // Cas B : Montage de 4 pneus neufs
    const is4Tires = (op.includes("4") && (op.includes("pneu") || op.includes("pneumatique") || op.includes("roue") || op.includes("montage") || op.includes("remplacement")))
      || (op.includes("4 pneus") || op.includes("4 pneumatiques") || op.includes("train complet"))
      || (detectedBrand !== "Pneumatiques Neufs" && (op.includes("4") || op.includes("complet")));

    if (is4Tires) {
      if (!frontAssigned) {
        frontTireState = {
          date: inv.date,
          mileage: inv.mileage,
          brand: detectedBrand,
          dimension: detectedDim,
          sourceType: "NEW_TIRES_INSTALLED",
          wearPercentReported: 0,
          eventLabel: "Montage de 4 pneus neufs",
        };
        frontAssigned = true;
      }
      if (!rearAssigned) {
        rearTireState = {
          date: inv.date,
          mileage: inv.mileage,
          brand: detectedBrand,
          dimension: detectedDim,
          sourceType: "NEW_TIRES_INSTALLED",
          wearPercentReported: 0,
          eventLabel: "Montage de 4 pneus neufs",
        };
        rearAssigned = true;
      }
      if (frontAssigned && rearAssigned) break;
      continue;
    }

    // Cas C : 2 pneus avant spécifiques
    const isFrontTires = ((op.includes("av") || op.includes("avant")) && op.includes("pneu") && (op.includes("montage") || op.includes("remplacement") || op.includes("pose") || op.includes("neuf") || op.includes("forfait")))
      || (detectedBrand !== "Pneumatiques Neufs" && (op.includes("av") || op.includes("avant")));

    if (isFrontTires && !frontAssigned) {
      frontTireState = {
        date: inv.date,
        mileage: inv.mileage,
        brand: detectedBrand,
        dimension: detectedDim,
        sourceType: "NEW_TIRES_INSTALLED",
        wearPercentReported: 0,
        eventLabel: "Montage de 2 pneus neufs avant",
      };
      frontAssigned = true;
      if (frontAssigned && rearAssigned) break;
      continue;
    }

    // Cas D : 2 pneus arrière spécifiques
    const isRearTires = ((op.includes("ar") || op.includes("arrière") || op.includes("arriere")) && op.includes("pneu") && (op.includes("montage") || op.includes("remplacement") || op.includes("pose") || op.includes("neuf") || op.includes("forfait")))
      || (detectedBrand !== "Pneumatiques Neufs" && (op.includes("ar") || op.includes("arrière") || op.includes("arriere")));

    if (isRearTires && !rearAssigned) {
      rearTireState = {
        date: inv.date,
        mileage: inv.mileage,
        brand: detectedBrand,
        dimension: detectedDim,
        sourceType: "NEW_TIRES_INSTALLED",
        wearPercentReported: 0,
        eventLabel: "Montage de 2 pneus neufs arrière",
      };
      rearAssigned = true;
      if (frontAssigned && rearAssigned) break;
      continue;
    }

    // Cas E : 2 pneus neufs génériques ou marque de pneus sans précision d'essieu
    const isGenericTireInstall = (op.includes("pneu") && (op.includes("montage") || op.includes("remplacement") || op.includes("pose") || op.includes("neuf") || op.includes("2")))
      || (detectedBrand !== "Pneumatiques Neufs" && (op.includes("pneu") || op.includes("forfait") || op.includes("roue")));

    if (isGenericTireInstall) {
      if (!frontAssigned) {
        frontTireState = {
          date: inv.date,
          mileage: inv.mileage,
          brand: detectedBrand,
          dimension: detectedDim,
          sourceType: "NEW_TIRES_INSTALLED",
          wearPercentReported: 0,
          eventLabel: "Montage de 2 pneus neufs",
        };
        frontAssigned = true;
      } else if (!rearAssigned) {
        rearTireState = {
          date: inv.date,
          mileage: inv.mileage,
          brand: detectedBrand,
          dimension: detectedDim,
          sourceType: "NEW_TIRES_INSTALLED",
          wearPercentReported: 0,
          eventLabel: "Montage de 2 pneus neufs",
        };
        rearAssigned = true;
      }
      if (frontAssigned && rearAssigned) break;
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

  const hasCertifiedTireHistory = frontAssigned || rearAssigned;

  let frontStatus = getTireStatus(frontWearPct);
  let rearStatus = getTireStatus(rearWearPct);
  let globalHealthScore = Math.round(100 - (frontWearPct * 0.6 + rearWearPct * 0.4));
  let historySummary = `Suivi certifié d'après vos factures de pneumatiques et votre rythme annuel (~ ${Math.round(safeDailyRate * 365).toLocaleString('fr-FR')} km/an).`;

  if (!hasCertifiedTireHistory) {
    frontStatus = {
      status: 'ATTENTION',
      label: 'Zone de vigilance (Faute d\'informations)',
      color: 'amber',
      rec: 'Aucune facture de pneumatiques ni relevé récent en base de données. Pensez à vérifier visuellement l\'état des témoins d\'usure (1.6 mm) ou à importer vos factures.',
    };
    rearStatus = {
      status: 'ATTENTION',
      label: 'Zone de vigilance (Faute d\'informations)',
      color: 'amber',
      rec: 'Aucune facture de pneumatiques ni relevé récent en base de données. Pensez à vérifier visuellement l\'état des témoins d\'usure (1.6 mm) ou à importer vos factures.',
    };
    globalHealthScore = 40;
    historySummary = "Aucune facture de pneumatiques ni relevé technique enregistré. Statut préventif placé en zone de vigilance.";
  }

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
      brandAndModel: hasCertifiedTireHistory ? frontTireState.brand : 'Pneumatiques Homologués (Non certifiés)',
      dimension: frontTireState.dimension,
      sourceType: frontTireState.sourceType,
      lastEventDate: frontTireState.date,
      lastEventMileage: frontTireState.mileage,
      lastEventLabel: hasCertifiedTireHistory ? frontTireState.eventLabel : 'Aucune facture de pneumatiques',
      currentEstimatedMileage: currentMileage,
      kmDrivenSinceEvent: frontKmSince,
      totalExpectedLifespanKm: frontLifespan,
      wearPercentage: hasCertifiedTireHistory ? frontWearPct : 50,
      remainingTreadDepthMm: hasCertifiedTireHistory ? frontTreadDepth : 4.5,
      remainingKm: hasCertifiedTireHistory ? frontRemainingKm : 20000,
      projectedReplacementDate: frontProjectedDate.toISOString().split('T')[0],
      status: frontStatus.status,
      statusLabel: frontStatus.label,
      healthColor: frontStatus.color,
      recommendation: frontStatus.rec,
    },
    rearAxle: {
      axle: 'REAR',
      label: 'Train Arrière (Stabilité)',
      brandAndModel: hasCertifiedTireHistory ? rearTireState.brand : 'Pneumatiques Homologués (Non certifiés)',
      dimension: rearTireState.dimension,
      sourceType: rearTireState.sourceType,
      lastEventDate: rearTireState.date,
      lastEventMileage: rearTireState.mileage,
      lastEventLabel: hasCertifiedTireHistory ? rearTireState.eventLabel : 'Aucune facture de pneumatiques',
      currentEstimatedMileage: currentMileage,
      kmDrivenSinceEvent: rearKmSince,
      totalExpectedLifespanKm: rearLifespan,
      wearPercentage: hasCertifiedTireHistory ? rearWearPct : 50,
      remainingTreadDepthMm: hasCertifiedTireHistory ? rearTreadDepth : 5.0,
      remainingKm: hasCertifiedTireHistory ? rearRemainingKm : 30000,
      projectedReplacementDate: rearProjectedDate.toISOString().split('T')[0],
      status: rearStatus.status,
      statusLabel: rearStatus.label,
      healthColor: rearStatus.color,
      recommendation: rearStatus.rec,
    },
    globalHealthScore,
    overallStatus: !hasCertifiedTireHistory ? 'ATTENTION' : frontStatus.status === 'CRITICAL' || rearStatus.status === 'CRITICAL' ? 'CRITICAL' : frontStatus.status === 'DUE_SOON' || rearStatus.status === 'DUE_SOON' ? 'DUE_SOON' : 'EXCELLENT',
    urgentActionNeeded,
    nextReplacementDate: nextDateStr,
    nextReplacementAxle: nextAxle,
    recommendedDimension: frontTireState.dimension,
    historySummary,
  };
}
