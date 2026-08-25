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

const CATEGORY_KEYWORDS: Record<MaintenanceCategory, string[]> = {
  DRAIN_OIL: ['vidange', 'huile', 'filtre a huile', 'filtre huile', '0w30', '5w30', '5w40', '0w20', 'lubrifiant', 'revision', 'forfait vidange'],
  AIR_FILTER: ['filtre a air', 'filtre air', 'element filtrant air', 'filtre moteur'],
  CABIN_FILTER: ['filtre habitacle', 'filtre a pollen', 'filtre anti-allergene', 'filtre climatisation', 'filtre cabine'],
  FUEL_FILTER: ['filtre a carburant', 'filtre carburant', 'filtre a gazole', 'filtre gazole', 'filtre a essence', 'filtre essence'],
  BRAKE_PADS_FRONT: ['plaquettes avant', 'plaquettes av', 'plaquette av', 'garniture av', 'frein avant', 'freins av'],
  BRAKE_PADS_REAR: ['plaquettes arriere', 'plaquettes ar', 'plaquette ar', 'garniture ar', 'frein arriere', 'freins ar'],
  BRAKE_DISCS_FRONT: ['disques avant', 'disques av', 'disque av', 'jeu disques av', 'disques de frein av'],
  BRAKE_DISCS_REAR: ['disques arriere', 'disques ar', 'disque ar', 'jeu disques ar', 'disques de frein ar'],
  BRAKE_FLUID: ['liquide de frein', 'purge frein', 'dot 4', 'dot 5.1', 'remplacement ldf', 'liquide freinage'],
  COOLANT: ['liquide de refroidissement', 'ldr', 'purge circuit refroidissement', 'antigel', 'liquide refroidissement'],
  SPARK_PLUGS: ['bougie allumage', 'bougies allumage', 'jeu bougies', 'bougie essence'],
  GLOW_PLUGS: ['bougie prechauffage', 'bougies prechauffage', 'bougie diesel'],
  TIMING_BELT: ['distribution', 'courroie distribution', 'kit distri', 'courroie distri', 'pompe a eau', 'galet tendeur distri', 'chaine distribution'],
  ACCESSORY_BELT: ['courroie accessoire', 'courroie alternateur', 'galet enrouleur', 'courroie trapezoïdale'],
  TIRES_FRONT: ['pneu av', 'pneus avant', 'pneumatique av', 'train avant pneu', 'montage pneu av', 'equilibrage av'],
  TIRES_REAR: ['pneu ar', 'pneus arriere', 'pneumatique ar', 'train arriere pneu', 'montage pneu ar', 'equilibrage ar'],
  BATTERY: ['batterie', 'accumulateur 12v', 'remplacement batterie', 'batterie start stop', 'agm', 'efb'],
  CLUTCH: ['embrayage', 'kit embrayage', 'volant moteur', 'butee embrayage', 'disque embrayage'],
  SUSPENSION_SHOCK: ['amortisseur', 'amortisseurs', 'coupelle amortisseur', 'jambe de force', 'ressort suspension'],
  GEARBOX_OIL: ['huile de boite', 'vidange boite', 'boite automatique', 'bva', 'huile transmission'],
  AIR_CONDITIONING: ['climatisation', 'recharge clim', 'gaz r134a', 'gaz r1234yf', 'traitement antibacterien clim', 'recharge frigo'],
  WIPER_BLADES: ['balai essuie-glace', 'essuie glace', 'balais av', 'balai arriere', 'raclette'],
  TECHNICAL_INSPECTION_PREP: ['pre controle', 'passage controle technique', 'presentation ct', 'bilan technique'],
  DIAGNOSTIC_ELECTRONIC: ['diagnostic valise', 'lecture defauts', 'recherche panne', 'diag electronique', 'effacement codes'],
  LABOR_ONLY: ['main d oeuvre', 'mo mecanique', 'forfait m.o', 'taux t1', 'taux t2', 'taux t3'],
  OTHER: [],
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeLineMilestoneMatch(
  lineDescription: string,
  lineCategory: MaintenanceCategory,
  milestone: ScheduledMilestone
): { score: number; reason: string } {
  const normLine = normalizeText(lineDescription);
  const normMilestoneTitle = normalizeText(milestone.title);

  if (lineCategory !== 'OTHER' && lineCategory !== 'LABOR_ONLY' && lineCategory === milestone.category) {
    return {
      score: 0.95,
      reason: `Catégorie d'intervention strictement identique (${milestone.category})`,
    };
  }

  if (normLine.includes(normMilestoneTitle) || normMilestoneTitle.includes(normLine)) {
    return {
      score: 0.90,
      reason: `Intitulé de la ligne facturée correspondant à l'échéance "${milestone.title}"`,
    };
  }

  const keywords = CATEGORY_KEYWORDS[milestone.category] || [];
  let keywordHits = 0;
  for (const kw of keywords) {
    if (normLine.includes(kw)) {
      keywordHits++;
    }
  }

  if (keywordHits > 0) {
    const score = Math.min(0.85, 0.60 + keywordHits * 0.15);
    return {
      score,
      reason: `Mots-clés techniques détectés dans la description pour ${milestone.category}`,
    };
  }

  return { score: 0, reason: 'Aucune correspondance' };
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
      const match = computeLineMilestoneMatch(line.description, line.category, milestone);
      if (match.score >= 0.6) {
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

    if (highestConfidence >= 0.6) {
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
