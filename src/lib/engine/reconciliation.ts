import { InvoiceExtraction, MaintenanceCategory } from '../ai';

export interface ScheduledMilestone {
  id: string;
  category: MaintenanceCategory;
  title: string;
  dueMileage?: number;
  dueDate?: string; // ISO date YYYY-MM-DD
  status: 'PENDING' | 'OVERDUE' | 'COMPLETED' | 'CANCELLED';
  estimatedCostEur?: number;
}

export interface MatchedMilestoneResult {
  milestoneId: string;
  milestoneTitle: string;
  category: MaintenanceCategory;
  confidence: number; // 0.0 to 1.0
  matchReason: string;
  matchedLines: Array<{
    description: string;
    totalTTC: number;
    partNumber?: string;
  }>;
  totalCostTTC: number;
  status: 'FULFILLED' | 'PARTIAL';
}

export interface UnmatchedInvoiceLine {
  description: string;
  category: MaintenanceCategory;
  totalTTC: number;
  isLabor: boolean;
  isPart: boolean;
  partNumber?: string;
  suggestedAction: string;
}

export interface JustificationProof {
  documentId?: string;
  ligneId?: string;
  dateIntervention: string;
  kilometrageIntervention: number;
  libelleFacture: string;
  emetteur: string;
  matchConfidence: number;
  matchReason: string;
  isCertified: boolean;
}

export interface ReconciliationSummary {
  invoiceDate: string;
  invoiceMileage: number;
  totalInvoiceTTC: number;
  garageName: string;
  matchedMilestones: MatchedMilestoneResult[];
  unmatchedLines: UnmatchedInvoiceLine[];
  unfulfilledPendingMilestones: ScheduledMilestone[];
  detectedMileageGap?: number;
  suggestedActions: string[];
}

export const CATEGORY_KEYWORDS: Record<MaintenanceCategory, string[]> = {
  DRAIN_OIL: [
    'vidange moteur', 'huile moteur', 'filtre a huile', 'filtre huile', '0w30', '5w30', '5w40', '0w20', 'lubrifiant moteur',
    'forfait vidange', 'joint de bouchon', 'ecstar', 'total ineo', 'castrol', 'huile 5w', 'huile 0w', 'huile 10w'
  ],
  AIR_FILTER: [
    'filtre a air', 'filtre air', 'element filtrant air', 'filtre moteur', 'cartouche filtre a air'
  ],
  CABIN_FILTER: [
    'filtre habitacle', 'filtre a pollen', 'filtre anti-allergene', 'filtre climatisation', 'filtre cabine', 'pollen'
  ],
  FUEL_FILTER: [
    'filtre a carburant', 'filtre carburant', 'filtre a gazole', 'filtre gazole', 'filtre a essence', 'filtre essence'
  ],
  BRAKE_PADS_FRONT: [
    'plaquettes avant', 'plaquettes av', 'plaquette av', 'garniture av', 'frein avant', 'freins av', 'jeu plaq av'
  ],
  BRAKE_PADS_REAR: [
    'plaquettes arriere', 'plaquettes ar', 'plaquette ar', 'garniture ar', 'frein arriere', 'freins ar', 'jeu plaq ar'
  ],
  BRAKE_DISCS_FRONT: [
    'disques avant', 'disques av', 'disque av', 'jeu disques av', 'disques de frein av'
  ],
  BRAKE_DISCS_REAR: [
    'disques arriere', 'disques ar', 'disque ar', 'jeu disques ar', 'disques de frein ar'
  ],
  BRAKE_FLUID: [
    'liquide de frein', 'purge frein', 'dot 4', 'dot 5.1', 'remplacement ldf', 'liquide freinage', 'forfait liquide frein'
  ],
  COOLANT: [
    'liquide de refroidissement', 'ldr', 'purge circuit refroidissement', 'antigel', 'liquide refroidissement', 'circuit de refroidissement'
  ],
  SPARK_PLUGS: [
    'bougie allumage', 'bougies allumage', 'jeu bougies', 'bougie essence', 'bougies iridium', 'bougie', 'iridium'
  ],
  GLOW_PLUGS: [
    'bougie prechauffage', 'bougies prechauffage', 'bougie diesel'
  ],
  TIMING_BELT: [
    'distribution', 'courroie distribution', 'kit distri', 'courroie distri', 'pompe a eau', 'galet tendeur distri', 'chaine distribution'
  ],
  ACCESSORY_BELT: [
    'courroie accessoire', 'courroie alternateur', 'galet enrouleur', 'courroie trapezoïdale', '5pk', '6pk', '4pk', '3pk', '7pk',
    'galet tendeur', 'courroies accessoires', 'courroie da', 'courroie clim', 'mgacs'
  ],
  TIRES_FRONT: [
    'pneu av', 'pneus avant', 'pneumatique av', 'train avant pneu', 'montage pneu av', 'equilibrage av', 'turanza', 'michelin', 'kleber'
  ],
  TIRES_REAR: [
    'pneu ar', 'pneus arriere', 'pneumatique ar', 'train arriere pneu', 'montage pneu ar', 'equilibrage ar', 'turanza', 'michelin', 'kleber'
  ],
  BATTERY: [
    'batterie', 'accumulateur 12v', 'remplacement batterie', 'batterie start stop', 'agm', 'efb', 'tech9', 'varta', 'fulmen'
  ],
  CLUTCH: [
    'embrayage', 'kit embrayage', 'volant moteur', 'butee embrayage', 'disque embrayage'
  ],
  SUSPENSION_SHOCK: [
    'amortisseur', 'amortisseurs', 'coupelle amortisseur', 'jambe de force', 'ressort suspension'
  ],
  GEARBOX_OIL: [
    'huile de boite', 'vidange boite', 'boite automatique', 'bva', 'huile transmission', '75w80', '75w90'
  ],
  AIR_CONDITIONING: [
    'climatisation', 'recharge clim', 'gaz r134a', 'gaz r1234yf', 'traitement antibacterien clim', 'recharge frigo', 'forfait clim'
  ],
  WIPER_BLADES: [
    'balai essuie-glace', 'essuie glace', 'balais av', 'balai arriere', 'raclette'
  ],
  TECHNICAL_INSPECTION_PREP: [
    'pre controle', 'passage controle technique', 'presentation ct', 'bilan technique', 'pre ct'
  ],
  DIAGNOSTIC_ELECTRONIC: [
    'diagnostic valise', 'lecture defauts', 'recherche panne', 'diag electronique', 'effacement codes'
  ],
  LABOR_ONLY: [
    'main d oeuvre', 'mo mecanique', 'forfait m.o', 'taux t1', 'taux t2', 'taux t3'
  ],
  OTHER: [],
};

export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalise un code catégorie d'échéance quelconque vers MaintenanceCategory
 */
export function normalizeCategoryToCanonical(raw: string): MaintenanceCategory {
  const norm = normalizeText(raw);
  if (norm.includes('vidange') || norm.includes('drain') || norm.includes('huile')) return 'DRAIN_OIL';
  if (norm.includes('habitacle') || norm.includes('pollen') || norm.includes('cabin')) return 'CABIN_FILTER';
  if (norm.includes('air')) return 'AIR_FILTER';
  if (norm.includes('carburant') || norm.includes('gasoil') || norm.includes('essence') || norm.includes('fuel')) return 'FUEL_FILTER';
  if (norm.includes('liquide frein') || norm.includes('brake fluid') || norm.includes('freinage')) return 'BRAKE_FLUID';
  if (norm.includes('refroidissement') || norm.includes('coolant')) return 'COOLANT';
  if (norm.includes('bougie') || norm.includes('spark') || norm.includes('allumage')) return 'SPARK_PLUGS';
  if (norm.includes('accessoire') || norm.includes('courroie') || norm.includes('alternateur')) return 'ACCESSORY_BELT';
  if (norm.includes('distribution') || norm.includes('timing')) return 'TIMING_BELT';
  if (norm.includes('pneu') || norm.includes('tire')) return 'TIRES_FRONT';
  if (norm.includes('batterie') || norm.includes('battery')) return 'BATTERY';
  if (norm.includes('clim')) return 'AIR_CONDITIONING';
  return 'OTHER';
}

/**
 * Évalue la correspondance d'une ligne d'intervention avec une catégorie canonique (3 niveaux)
 */
export function matchInterventionLineToCategory(
  line: {
    operation?: string;
    description?: string;
    categorie?: string;
    category?: string;
    metadata?: any;
    canonicalCode?: string;
    actionType?: string;
  },
  targetCategory: MaintenanceCategory
): { score: number; reason: string; isInspectionOnly: boolean; isPackage: boolean } {
  const opText = line.operation || line.description || '';
  const normOp = normalizeText(opText);
  const normCat = normalizeText(line.categorie || line.category || '');
  const meta = line.metadata || {};
  const canonicalCode = line.canonicalCode || meta.canonical_code || meta.canonicalCode || '';
  const actionType = line.actionType || meta.action_type || meta.actionType || '';

  // 1. Détection des contrôles seuls (INSPECT_ONLY)
  const isInspectionOnly =
    actionType === 'INSPECT_ONLY' ||
    ((normOp.includes('controle ') || normOp.includes('verification ') || normOp.includes('pression pneus') || normOp.includes('pre ct') || normOp.includes('diagnostic')) &&
      !normOp.includes('remplacement') &&
      !normOp.includes('changement') &&
      !normOp.includes('forfait') &&
      !normOp.includes('pose') &&
      !normOp.includes('montage'));

  // 2. Détection des forfaits révision globale (PACKAGE_SERVICE)
  const isPackage =
    actionType === 'PACKAGE_SERVICE' ||
    normOp.includes('revision complete') ||
    normOp.includes('forfait revision') ||
    normOp.includes('forfait entretien') ||
    normOp.includes('grand service');

  // Si c'est un forfait global, il valide la vidange et les filtres de base
  if (isPackage && (targetCategory === 'DRAIN_OIL' || targetCategory === 'CABIN_FILTER' || targetCategory === 'AIR_FILTER')) {
    return {
      score: 0.90,
      reason: `Validé par le forfait d'entretien global ("${opText}")`,
      isInspectionOnly: false,
      isPackage: true,
    };
  }

  // Garde-fous spécifiques pour éviter les faux positifs entre fluides et filtres
  if (targetCategory === 'DRAIN_OIL') {
    if (normOp.includes('refroidissement') || normOp.includes('boite') || normOp.includes('frein')) {
      return { score: 0, reason: 'Opération fluide non liée à l\'huile moteur', isInspectionOnly, isPackage };
    }
    if (normOp.includes('vidange') && !normOp.includes('refroidissement') && !normOp.includes('boite')) {
      return { score: 0.92, reason: `Vidange moteur détectée ("${opText}")`, isInspectionOnly, isPackage };
    }
  }

  if (targetCategory === 'AIR_CONDITIONING' && (normOp.includes('filtre habitacle') || normOp.includes('filtre a pollen'))) {
    return { score: 0, reason: 'Filtre habitacle (géré par CABIN_FILTER)', isInspectionOnly, isPackage };
  }

  // Niveau 1 : Code canonique strict taggé
  if (canonicalCode && canonicalCode.toUpperCase() === targetCategory) {
    return {
      score: isInspectionOnly ? 0.50 : 0.98,
      reason: `Code canonique certifié (${targetCategory})`,
      isInspectionOnly,
      isPackage,
    };
  }

  // Niveau 2 : Mots-clés techniques & références composants
  const keywords = CATEGORY_KEYWORDS[targetCategory] || [];
  let keywordHits = 0;
  for (const kw of keywords) {
    if (normOp.includes(kw)) {
      keywordHits++;
    }
  }

  if (keywordHits > 0) {
    const baseScore = isInspectionOnly ? 0.40 : Math.min(0.95, 0.70 + keywordHits * 0.12);
    return {
      score: baseScore,
      reason: `Mots-clés techniques détectés ("${keywords.filter(k => normOp.includes(k)).join(', ')}")`,
      isInspectionOnly,
      isPackage,
    };
  }

  return { score: 0, reason: 'Aucune correspondance', isInspectionOnly, isPackage };
}

/**
 * Réconcilie une opération du plan avec l'historique complet des interventions réelles
 */
export function reconcileSingleOperationWithHistory(params: {
  category: string;
  title: string;
  interventions: Array<{
    id?: string;
    operation?: string;
    description?: string;
    categorie?: string;
    date_intervention?: string;
    kilometrage_intervention?: number;
    emetteur?: string;
    document_source_id?: string;
    metadata?: any;
    prix_total_ttc?: number;
  }>;
  documents?: Array<{
    id?: string;
    file_type?: string;
    date_document?: string;
    kilometrage_document?: number;
    emetteur?: string;
  }>;
}): {
  lastService: any | null;
  justification: JustificationProof | null;
} {
  const targetCategory = normalizeCategoryToCanonical(params.category || params.title);

  // Cas spécial Contrôle Technique
  if (targetCategory === 'TECHNICAL_INSPECTION_PREP' || params.category.toLowerCase().includes('controle_technique') || params.title.toLowerCase().includes('controle technique')) {
    const ctDocs = (params.documents || [])
      .filter((d) => d.file_type === 'controle_technique')
      .sort((a, b) => new Date(b.date_document || 0).getTime() - new Date(a.date_document || 0).getTime());

    if (ctDocs.length > 0 && ctDocs[0].date_document) {
      const best = ctDocs[0];
      return {
        lastService: {
          id: best.id,
          operation: 'Contrôle Technique Périodique (PV Officiel)',
          date_intervention: best.date_document,
          kilometrage_intervention: best.kilometrage_document || 0,
          emetteur: best.emetteur || 'Centre Agréé CT',
        },
        justification: {
          documentId: best.id,
          dateIntervention: best.date_document || new Date().toISOString().split('T')[0],
          kilometrageIntervention: best.kilometrage_document || 0,
          libelleFacture: 'Procès-Verbal de Contrôle Technique',
          emetteur: best.emetteur || 'Centre Agréé CT',
          matchConfidence: 1.0,
          matchReason: 'Document officiel PV de Contrôle Technique',
          isCertified: true,
        },
      };
    }
  }

  // Recherche parmi les interventions réelles triées de la plus récente à la plus ancienne
  const sortedInterventions = [...params.interventions].sort(
    (a, b) =>
      new Date(b.date_intervention || 0).getTime() - new Date(a.date_intervention || 0).getTime() ||
      (b.kilometrage_intervention || 0) - (a.kilometrage_intervention || 0)
  );

  let bestMatch: any = null;
  let bestScore = 0;
  let bestReason = '';

  for (const it of sortedInterventions) {
    const match = matchInterventionLineToCategory(it, targetCategory);

    // Seuls les scores >= 0.60 non restreints au contrôle seul sont retenus pour un remplacement
    if (match.score >= 0.60 && !match.isInspectionOnly) {
      bestMatch = it;
      bestScore = match.score;
      bestReason = match.reason;
      break;
    }
  }

  if (bestMatch && bestMatch.date_intervention) {
    return {
      lastService: bestMatch,
      justification: {
        documentId: bestMatch.document_source_id,
        ligneId: bestMatch.id,
        dateIntervention: bestMatch.date_intervention,
        kilometrageIntervention: bestMatch.kilometrage_intervention || 0,
        libelleFacture: bestMatch.operation || bestMatch.description || 'Intervention atelier',
        emetteur: bestMatch.emetteur || 'Garage',
        matchConfidence: Math.round(bestScore * 100) / 100,
        matchReason: bestReason,
        isCertified: true,
      },
    };
  }

  return { lastService: null, justification: null };
}

export function reconcileInvoiceWithSchedule(
  invoice: InvoiceExtraction,
  pendingMilestones: ScheduledMilestone[]
): ReconciliationSummary {
  const matchedMilestonesMap = new Map<string, MatchedMilestoneResult>();
  const matchedLineIndices = new Set<number>();

  const activeMilestones = pendingMilestones.filter(
    (m) => m.status === 'PENDING' || m.status === 'OVERDUE'
  );

  for (const milestone of activeMilestones) {
    let highestConfidence = 0;
    let matchReason = '';
    const matchingLines: Array<{ description: string; totalTTC: number; partNumber?: string }> = [];
    let milestoneCostTTC = 0;

    invoice.lineItems.forEach((line, index) => {
      const match = matchInterventionLineToCategory(
        {
          operation: line.description,
          description: line.description,
          category: line.category,
          canonicalCode: (line as any).canonicalCode,
          actionType: (line as any).actionType,
        },
        milestone.category
      );

      if (match.score >= 0.60 && !match.isInspectionOnly) {
        matchingLines.push({
          description: line.description,
          totalTTC: line.totalTTC,
          partNumber: line.partNumber,
        });
        milestoneCostTTC += line.totalTTC;
        matchedLineIndices.add(index);

        if (match.score > highestConfidence) {
          highestConfidence = match.score;
          matchReason = match.reason;
        }
      }
    });

    if (highestConfidence >= 0.60) {
      matchedMilestonesMap.set(milestone.id, {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        category: milestone.category,
        confidence: Math.round(highestConfidence * 100) / 100,
        matchReason,
        matchedLines: matchingLines,
        totalCostTTC: Math.round(milestoneCostTTC * 100) / 100,
        status: 'FULFILLED',
      });
    }
  }

  const unmatchedLines: UnmatchedInvoiceLine[] = [];
  invoice.lineItems.forEach((line, idx) => {
    if (!matchedLineIndices.has(idx) && line.category !== 'LABOR_ONLY') {
      unmatchedLines.push({
        description: line.description,
        category: line.category,
        totalTTC: line.totalTTC,
        isLabor: line.isLabor,
        isPart: line.isPart,
        partNumber: line.partNumber,
        suggestedAction: `Enregistrer comme intervention ponctuelle (${line.category})`,
      });
    }
  });

  const unfulfilledPendingMilestones = activeMilestones.filter(
    (m) => !matchedMilestonesMap.has(m.id)
  );

  const suggestedActions: string[] = [];
  const matchedCount = matchedMilestonesMap.size;

  if (matchedCount > 0) {
    suggestedActions.push(`Clôturer ${matchedCount} échéance(s) d'entretien validée(s) par cette facture.`);
  }

  return {
    invoiceDate: invoice.invoice?.invoiceDate || new Date().toISOString().split('T')[0],
    invoiceMileage: invoice.vehicle?.currentMileage || 0,
    totalInvoiceTTC: invoice.invoice?.totalTTC || 0,
    garageName: invoice.garage?.name || 'Garage Inconnu',
    matchedMilestones: Array.from(matchedMilestonesMap.values()),
    unmatchedLines,
    unfulfilledPendingMilestones,
    suggestedActions,
  };
}

export function reconcileInvoiceWithMilestones(params: {
  invoice: InvoiceExtraction;
  pendingMilestones: ScheduledMilestone[];
}): ReconciliationSummary {
  return reconcileInvoiceWithSchedule(params.invoice, params.pendingMilestones);
}
