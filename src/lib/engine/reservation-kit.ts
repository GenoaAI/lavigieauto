import { TechnicalInspectionExtraction, VehicleContext, MaintenanceCategory } from '../ai';
import { ProjectedMilestone } from './cycles';

export interface DefectPopularization {
  code: string;
  officialLabel: string;
  plainLanguageTitle: string;
  plainLanguageExplanation: string;
  safetyRisk: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  deadlineContreVisite?: string;
  estimatedPriceRange: {
    minEur: number;
    maxEur: number;
    laborHours: number;
  };
  recommendedAction: string;
}

export interface ReservationKit {
  vehicleSummary: {
    makeModel: string;
    licensePlate: string;
    vin?: string;
    currentMileage: number;
    fuelType?: string;
  };
  phoneScript: string;
  emailTemplate: {
    subject: string;
    body: string;
  };
  interventionsToRequest: Array<{
    title: string;
    category?: MaintenanceCategory;
    specificationDetails?: string;
    priority: 'HAUTE' | 'MOYENNE' | 'NORMALE';
    estimatedBudgetEur: number;
  }>;
  popularizedDefects: DefectPopularization[];
  totalEstimatedBudget: {
    minEur: number;
    maxEur: number;
  };
  consumerChecklist: {
    beforeLeavingCar: string[];
    whenPickingUpCar: string[];
  };
}

const CT_DEFECT_KNOWLEDGE_BASE: Record<
  string,
  {
    title: string;
    explanation: string;
    risk: string;
    priceMin: number;
    priceMax: number;
    hours: number;
  }
> = {
  '5.2.3': {
    title: 'Usure ou anomalie sur les pneumatiques',
    explanation: 'Le témoin d\'usure est atteint ou la bande de roulement présente une usure asymétrique.',
    risk: 'Risque majeur d\'aquaplaning sous la pluie et allongement de la distance de freinage.',
    priceMin: 120,
    priceMax: 260,
    hours: 0.75,
  },
  '1.1.13': {
    title: 'Usure avancée des plaquettes de frein',
    explanation: 'La garniture de friction des plaquettes est quasiment consumée.',
    risk: 'Perte d\'efficacité au freinage d\'urgence et détérioration des disques.',
    priceMin: 80,
    priceMax: 180,
    hours: 1.0,
  },
  '1.1.14': {
    title: 'Disques de frein usés ou rayés',
    explanation: 'L\'épaisseur minimale de sécurité du disque a été franchie.',
    risk: 'Fissuration du disque et vibrations au freinage.',
    priceMin: 180,
    priceMax: 350,
    hours: 1.5,
  },
};

export function popularizeInspectionDefect(
  defect: { code: string; label: string; severity: 'MINOR' | 'MAJOR' | 'CRITICAL'; location?: string; category: any },
  inspectionDate?: string
): DefectPopularization {
  const prefix = defect.code.split('.').slice(0, 3).join('.');
  const kbEntry = CT_DEFECT_KNOWLEDGE_BASE[prefix] || {
    title: defect.label,
    explanation: `Anomalie mécanique relevée sur le sous-système ${defect.category}.`,
    risk: 'Peut compromettre la sécurité routière ou la conformité réglementaire du véhicule.',
    priceMin: 80,
    priceMax: 250,
    hours: 1.0,
  };

  let deadlineContreVisite: string | undefined = undefined;
  if (defect.severity === 'MAJOR' && inspectionDate) {
    const d = new Date(inspectionDate);
    d.setMonth(d.getMonth() + 2);
    deadlineContreVisite = d.toISOString().split('T')[0];
  } else if (defect.severity === 'CRITICAL') {
    deadlineContreVisite = 'Immédiate (circulation interdite dès minuit)';
  }

  const loc = defect.location ? ` (${defect.location})` : '';

  return {
    code: defect.code,
    officialLabel: defect.label,
    plainLanguageTitle: `${kbEntry.title}${loc}`,
    plainLanguageExplanation: kbEntry.explanation,
    safetyRisk: kbEntry.risk,
    severity: defect.severity,
    deadlineContreVisite,
    estimatedPriceRange: {
      minEur: kbEntry.priceMin,
      maxEur: kbEntry.priceMax,
      laborHours: kbEntry.hours,
    },
    recommendedAction:
      defect.severity === 'CRITICAL'
        ? 'URGENT : Remorquage ou réparation immédiate obligatoire.'
        : defect.severity === 'MAJOR'
        ? `Faire réparer et présenter en contre-visite avant le ${deadlineContreVisite || '2 mois'}.`
        : 'À surveiller ou planifier lors de la prochaine révision périodique.',
  };
}

export function generateReservationKit(options: {
  vehicleContext?: VehicleContext;
  vehicle?: VehicleContext;
  milestonesToBook?: ProjectedMilestone[];
  upcomingMilestones?: ProjectedMilestone[];
  inspectionReport?: TechnicalInspectionExtraction;
}): ReservationKit {
  const vehicle = options.vehicleContext || options.vehicle || {
    make: 'Peugeot',
    model: '3008',
    licensePlate: 'XX-123-YY',
    currentMileage: 60000,
    fuelType: 'Essence',
  };

  const milestones = options.milestonesToBook || options.upcomingMilestones || [];
  const makeModel = `${vehicle.make || 'Véhicule'} ${vehicle.model || ''}`.trim();
  const licensePlate = vehicle.licensePlate || 'XX-123-YY';
  const currentMileage = vehicle.currentMileage || 60000;

  const interventionsToRequest: ReservationKit['interventionsToRequest'] = [];
  const popularizedDefects: DefectPopularization[] = [];

  let totalMinEur = 0;
  let totalMaxEur = 0;

  if (milestones.length > 0) {
    for (const m of milestones) {
      const priority: 'HAUTE' | 'MOYENNE' | 'NORMALE' =
        m.urgency === 'CRITICAL' || m.urgency === 'OVERDUE'
          ? 'HAUTE'
          : m.urgency === 'DUE_SOON'
          ? 'MOYENNE'
          : 'NORMALE';

      interventionsToRequest.push({
        title: m.title,
        category: m.category,
        specificationDetails: m.isSevereAdjusted ? 'Préconisation intervalle intensif / sévère' : undefined,
        priority,
        estimatedBudgetEur: m.estimatedCostEur,
      });

      totalMinEur += Math.round(m.estimatedCostEur * 0.85);
      totalMaxEur += Math.round(m.estimatedCostEur * 1.2);
    }
  }

  if (options.inspectionReport && options.inspectionReport.defects) {
    for (const defect of options.inspectionReport.defects) {
      const popularized = popularizeInspectionDefect(
        defect,
        options.inspectionReport.center?.inspectionDate
      );
      popularizedDefects.push(popularized);

      if (defect.severity === 'MAJOR' || defect.severity === 'CRITICAL') {
        interventionsToRequest.push({
          title: `Remise en conformité CT : ${popularized.plainLanguageTitle}`,
          priority: 'HAUTE',
          estimatedBudgetEur: Math.round((popularized.estimatedPriceRange.minEur + popularized.estimatedPriceRange.maxEur) / 2),
        });

        totalMinEur += popularized.estimatedPriceRange.minEur;
        totalMaxEur += popularized.estimatedPriceRange.maxEur;
      }
    }
  }

  if (interventionsToRequest.length === 0) {
    interventionsToRequest.push({
      title: 'Révision générale périodique constructeur',
      priority: 'NORMALE',
      estimatedBudgetEur: 190,
    });
    totalMinEur = 150;
    totalMaxEur = 250;
  }

  const targetMileage = milestones.length > 0 && milestones[0].dueMileage > 0 ? milestones[0].dueMileage : undefined;
  const targetDate = milestones.length > 0 && milestones[0].projectedDueDate ? milestones[0].projectedDueDate : undefined;
  const isOverdue = milestones.some((m) => m.urgency === "OVERDUE" || m.urgency === "CRITICAL" || m.remainingDays < 0);

  let milestoneContextSentence = "";
  if (isOverdue) {
    milestoneContextSentence = `J'ai un rattrapage d'échéances constructeur prioritaires à effectuer (interventions échues au carnet).`;
  } else if (targetMileage && targetMileage > currentMileage) {
    milestoneContextSentence = `En prévision de mon prochain cap constructeur des ${targetMileage.toLocaleString("fr-FR")} km${targetDate ? ` (estimé vers le ${targetDate})` : ""}, je souhaite anticiper les opérations préconisées.`;
  }

  const phoneScript = `
"Bonjour, je vous appelle pour obtenir un devis détaillé et planifier un rendez-vous d'atelier pour mon véhicule.
Il s'agit d'une ${makeModel}${vehicle.fuelType ? ` (${vehicle.fuelType})` : ""}, immatriculée ${licensePlate}, qui totalise actuellement ${currentMileage.toLocaleString("fr-FR")} km.
${milestoneContextSentence ? `\n${milestoneContextSentence}\n` : ""}
Voici précisément la liste des interventions constructeur à réaliser :
${interventionsToRequest.map((item, i) => `  ${i + 1}. ${item.title}${item.specificationDetails ? ` [${item.specificationDetails}]` : ""}`).join("\n")}

Pouvez-vous m'établir un devis pour ces prestations et m'indiquer vos disponibilités ?"
`.trim();

  const emailSubject = `Demande de devis & RDV atelier - ${makeModel} (${licensePlate})`;
  const emailBody = `
Bonjour,

Je souhaite obtenir un devis et convenir d'une date d'intervention pour mon véhicule ${makeModel} (${licensePlate}, ${currentMileage.toLocaleString("fr-FR")} km).
${milestoneContextSentence ? `\n${milestoneContextSentence}\n` : ""}
Opérations constructeur à réaliser :
${interventionsToRequest.map((item, idx) => `- ${item.title}`).join("\n")}

Merci de me faire part de votre chiffrage et de vos disponibilités.
`.trim();

  return {
    vehicleSummary: {
      makeModel,
      licensePlate,
      vin: vehicle.vin,
      currentMileage,
      fuelType: vehicle.fuelType,
    },
    phoneScript,
    emailTemplate: {
      subject: emailSubject,
      body: emailBody,
    },
    interventionsToRequest,
    popularizedDefects,
    totalEstimatedBudget: {
      minEur: totalMinEur,
      maxEur: totalMaxEur,
    },
    consumerChecklist: {
      beforeLeavingCar: [
        'Faites signer un ordre de réparation avec le détail des opérations.',
        'Précisez le grade d\'huile moteur préconisé par le constructeur.',
      ],
      whenPickingUpCar: [
        'Vérifiez la présence du tampon sur le carnet d\'entretien.',
        'Prenez en photo la facture pour mise à jour dans LaVigieAuto.',
      ],
    },
  };
}
