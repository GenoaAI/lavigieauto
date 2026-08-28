import { reconcileInvoiceWithMilestones, ScheduledMilestone } from "../src/lib/engine/reconciliation";
import { InvoiceExtraction } from "../src/lib/ai/types";

export function testReconciliation() {
  console.log("▶ [TEST] Engine : Réconciliation Facture vs Échéances...");

  const mockInvoice: InvoiceExtraction = {
    garage: {
      name: "Garage Peugeot des Lilas",
      siret: "12345678900012",
      phone: "0142685500",
    },
    vehicle: {
      licensePlate: "XX-123-YY",
      currentMileage: 60200,
      make: "Peugeot",
      model: "3008",
    },
    invoice: {
      invoiceNumber: "FAC-2026-089",
      invoiceDate: "2026-08-20",
      totalHT: 240,
      totalVAT: 48,
      totalTTC: 288,
      currency: "EUR",
    },
    lineItems: [
      {
        description: "Forfait vidange huile 5W30 synthèse",
        category: "DRAIN_OIL",
        actionType: "REPLACE",
        quantity: 1,
        unitPriceHT: 95,
        vatRate: 20,
        totalTTC: 114,
        isLabor: false,
        isPart: true,
      },
      {
        description: "Remplacement filtre à huile",
        category: "DRAIN_OIL",
        actionType: "REPLACE",
        quantity: 1,
        unitPriceHT: 22,
        vatRate: 20,
        totalTTC: 26.4,
        isLabor: false,
        isPart: true,
      },
      {
        description: "Purge circuit liquide de frein",
        category: "BRAKE_FLUID",
        actionType: "REPLACE",
        quantity: 1,
        unitPriceHT: 60,
        vatRate: 20,
        totalTTC: 72,
        isLabor: true,
        isPart: true,
      },
    ],
    maintenanceRecap: {
      detectedOperations: ["DRAIN_OIL", "BRAKE_FLUID"],
      nextRecommendedMileage: 80000,
    },
    observations: [],
  };

  const pendingMilestones: ScheduledMilestone[] = [
    {
      id: "mile-1",
      category: "DRAIN_OIL",
      title: "Vidange moteur & filtre",
      dueMileage: 60000,
      dueDate: "2026-08-25",
      status: "PENDING",
      estimatedCostEur: 140,
    },
    {
      id: "mile-2",
      category: "BRAKE_FLUID",
      title: "Purge liquide de frein",
      dueMileage: 60000,
      dueDate: "2026-08-25",
      status: "PENDING",
      estimatedCostEur: 70,
    },
    {
      id: "mile-3",
      category: "TIMING_BELT",
      title: "Courroie de distribution",
      dueMileage: 100000,
      dueDate: "2028-08-25",
      status: "PENDING",
      estimatedCostEur: 600,
    },
  ];

  const result = reconcileInvoiceWithMilestones({
    invoice: mockInvoice,
    pendingMilestones,
  });

  if (result.matchedMilestones.length !== 2) {
    throw new Error(`Échec réconciliation : attendu 2 échéances réconciliées, obtenu ${result.matchedMilestones.length}`);
  }

  if (result.unfulfilledPendingMilestones.length !== 1 || result.unfulfilledPendingMilestones[0].category !== "TIMING_BELT") {
    throw new Error("Échec réconciliation : l'échéance courroie de distribution devrait rester en attente.");
  }

  console.log("  ✔ Réconciliation validée (2 échéances clôturées, 1 restante en attente).");
}
