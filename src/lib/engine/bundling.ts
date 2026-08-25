import type { ProjectedMilestone } from "./cycles";

export interface BundlingOptions {
  /** Fenêtre de tolérance temporelle pour regrouper les interventions (en jours, défaut: 90 jours / 3 mois) */
  toleranceDays?: number;
  /** Fenêtre de tolérance kilométrique (en km, défaut: 3 000 km) */
  toleranceKm?: number;
  /** Avancer les interventions non critiques pour éviter les visites multiples */
  advanceNonCritical?: boolean;
}

export interface ServiceBundle {
  id: string;
  bundleTitle: string;
  recommendedDate: string;
  targetMileage: number;
  urgency: "CRITICAL" | "OVERDUE" | "DUE_SOON" | "UPCOMING" | "OK";
  milestones: ProjectedMilestone[];
  totalEstimatedCostMinEur: number;
  totalEstimatedCostMaxEur: number;
  estimatedLaborSavingsEur: number;
  summaryDescription: string;
  calendarEventSummary: string;
  garagePhoneScript: string;
}

/**
 * Ajuste une date pour qu'elle tombe obligatoirement sur un jour ouvré (Lundi - Vendredi).
 * Les garages automobiles étant fermés le dimanche et le week-end,
 * toute échéance tombant un samedi ou dimanche est décalée au lundi ouvré suivant.
 */
export function snapToBusinessDay(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDay(); // 0 = Dimanche, 6 = Samedi
  if (day === 0) {
    // Dimanche -> Lundi (+1 jour)
    d.setDate(d.getDate() + 1);
  } else if (day === 6) {
    // Samedi -> Lundi (+2 jours)
    d.setDate(d.getDate() + 2);
  }
  return d.toISOString().split("T")[0];
}

/**
 * Moteur de Regroupement Intelligent d'Atelier (Smart Service Bundler)
 * Évite les allers-retours mensuels au garage en groupant les opérations proches
 * dans une fenêtre de tolérance paramétrable (ex: ±90 jours / ±3 000 km).
 */
export function bundleMaintenanceAppointments(
  milestones: ProjectedMilestone[],
  vehicle: {
    make: string;
    model: string;
    licensePlate: string;
    currentMileage: number;
  },
  options: BundlingOptions = {}
): ServiceBundle[] {
  if (!milestones || milestones.length === 0) return [];

  const toleranceDays = options.toleranceDays ?? 90; // 3 mois par défaut
  const toleranceKm = options.toleranceKm ?? 3000;   // 3 000 km par défaut

  // 1. Trier les échéances par ordre chronologique strict
  const sorted = [...milestones].sort((a, b) => {
    return new Date(a.projectedDueDate).getTime() - new Date(b.projectedDueDate).getTime();
  });

  const bundles: ServiceBundle[] = [];
  const visited = new Set<string>();

  // 2. Traitement prioritaire des opérations échues (Pack Rattrapage Immédiat)
  const overdueItems = sorted.filter(
    (m) => m.urgency === "CRITICAL" || m.urgency === "OVERDUE" || m.remainingDays < 0
  );

  if (overdueItems.length > 0) {
    overdueItems.forEach((m) => visited.add(m.title));
    const totalCost = overdueItems.reduce((acc, m) => acc + (m.estimatedCostEur || 100), 0);
    const laborSavings = Math.round(totalCost * 0.15); // ~15% d'économie sur la main d'oeuvre groupée

    const businessDate = snapToBusinessDay(new Date().toISOString().split("T")[0]);

    bundles.push({
      id: "bundle-overdue-immediate",
      bundleTitle: `🚨 Pack Révision & Sécurité Immédiate (${overdueItems.length} opérations)`,
      recommendedDate: businessDate,
      targetMileage: vehicle.currentMileage,
      urgency: "CRITICAL",
      milestones: overdueItems,
      totalEstimatedCostMinEur: Math.round((totalCost - laborSavings) * 0.85),
      totalEstimatedCostMaxEur: totalCost,
      estimatedLaborSavingsEur: laborSavings,
      summaryDescription: `Regroupement d'urgence pour traiter d'un coup les ${overdueItems.length} opérations échues sans multiplier les immobilisations.`,
      calendarEventSummary: `🚗 [LaVigieAuto] RDV Atelier Prioritaire — ${overdueItems.length} opérations (${vehicle.make} ${vehicle.model})`,
      garagePhoneScript: generateBundledPhoneScript(overdueItems, vehicle, businessDate, laborSavings),
    });
  }

  // 3. Regroupement intelligent des opérations futures (selon la fenêtre de tolérance)
  const futureItems = sorted.filter((m) => !visited.has(m.title));

  for (let i = 0; i < futureItems.length; i++) {
    const current = futureItems[i];
    if (visited.has(current.title)) continue;

    const currentBundleMilestones: ProjectedMilestone[] = [current];
    visited.add(current.title);

    const currentDate = new Date(current.projectedDueDate);

    // Chercher les interventions suivantes qui tombent dans la fenêtre de tolérance
    for (let j = i + 1; j < futureItems.length; j++) {
      const candidate = futureItems[j];
      if (visited.has(candidate.title)) continue;

      const candidateDate = new Date(candidate.projectedDueDate);
      const diffDays = Math.abs((candidateDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
      const diffKm = Math.abs(candidate.dueMileage - current.dueMileage);

      if (diffDays <= toleranceDays || diffKm <= toleranceKm) {
        currentBundleMilestones.push(candidate);
        visited.add(candidate.title);
      }
    }

    // Calcul de la date recommandée du pack (date de l'opération la plus précoce, garantie jour ouvré hors week-end)
    const earliestDate = snapToBusinessDay(current.projectedDueDate);
    const targetMileage = Math.min(...currentBundleMilestones.map((m) => m.dueMileage));
    const totalCost = currentBundleMilestones.reduce((acc, m) => acc + (m.estimatedCostEur || 100), 0);
    const laborSavings = currentBundleMilestones.length > 1 ? Math.round(totalCost * 0.15) : 0;

    const titles = currentBundleMilestones.map((m) => m.title);
    const bundleTitle =
      currentBundleMilestones.length > 1
        ? `📦 Pack Atelier Groupé : ${titles.slice(0, 2).join(" + ")}${titles.length > 2 ? ` (+${titles.length - 2})` : ""}`
        : current.title;

    bundles.push({
      id: `bundle-${current.category}-${current.dueMileage}`,
      bundleTitle,
      recommendedDate: earliestDate,
      targetMileage,
      urgency: current.urgency,
      milestones: currentBundleMilestones,
      totalEstimatedCostMinEur: Math.round((totalCost - laborSavings) * 0.85),
      totalEstimatedCostMaxEur: totalCost,
      estimatedLaborSavingsEur: laborSavings,
      summaryDescription:
        currentBundleMilestones.length > 1
          ? `Regroupement optimisé de ${currentBundleMilestones.length} interventions proches dans une fenêtre de ${toleranceDays} jours pour vous éviter un second passage au garage.`
          : current.explanation || "Intervention constructeur isolée.",
      calendarEventSummary: `🚗 [LaVigieAuto] Entretien Atelier Groupé (${currentBundleMilestones.length} op.) — ${vehicle.make} ${vehicle.model}`,
      garagePhoneScript: generateBundledPhoneScript(currentBundleMilestones, vehicle, earliestDate, laborSavings),
    });
  }

  return bundles;
}

function generateBundledPhoneScript(
  milestones: ProjectedMilestone[],
  vehicle: { make: string; model: string; licensePlate: string },
  targetDate: string,
  laborSavings: number
): string {
  const operationsList = milestones.map((m, idx) => `  ${idx + 1}. ${m.title} (~${m.estimatedCostEur || 100} €)`).join("\n");

  return [
    `Bonjour, je vous appelle pour planifier un entretien complet groupé pour mon véhicule :`,
    `🚗 ${vehicle.make} ${vehicle.model} (Immat : ${vehicle.licensePlate})`,
    `📅 Date souhaitée : autour du ${targetDate}`,
    ``,
    `📋 Liste des ${milestones.length} interventions à regrouper sur la même intervention :`,
    operationsList,
    ``,
    laborSavings > 0 ? `💡 Demandez l'application d'un forfait main d'œuvre combiné (économie estimée ~${laborSavings} €).` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
