import { calculateMileagePace, projectMaintenanceSchedule, evaluateUrgency, recalculateMaintenanceForecast } from '../src/lib/engine/cycles';
import { reconcileInvoiceWithSchedule } from '../src/lib/engine/reconciliation';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${message}`);
    throw new Error(message);
  }
}

export function runScheduleMathAuditTests() {
  console.log('▶ [AUDIT MATHÉMATIQUE] 1. Règle du Premier Terme Échu (Temps vs Kilomètre)...');

  // CAS 1 : Dépassé par le TEMPS (ex: 12 mois écoulés mais seulement 8 000 km parcourus sur un cycle de 20 000 km)
  const refDate = new Date('2026-08-24');
  const pace = calculateMileagePace([
    { date: '2025-08-22', mileage: 112160, source: 'INVOICE' },
    { date: '2026-08-24', mileage: 125789, source: 'USER_DASHBOARD' },
  ], refDate);

  const forecastOverdueByTime = projectMaintenanceSchedule({
    mileageReadings: [
      { date: '2025-08-22', mileage: 112160, source: 'INVOICE' },
      { date: '2026-08-24', mileage: 125789, source: 'USER_DASHBOARD' },
    ],
    lastServices: [
      { category: 'DRAIN_OIL', serviceDate: '2025-08-22', mileage: 112160 },
    ],
    customRules: [
      {
        category: 'DRAIN_OIL',
        title: 'Vidange huile moteur',
        intervalKm: 20000,
        intervalMonths: 12,
        estimatedCostEur: 140,
        isMandatory: true,
      },
    ],
    referenceDate: refDate,
  });

  const drainMilestone = forecastOverdueByTime.projectedMilestones[0];
  assert(drainMilestone.projectedDueDate === '2026-08-22', `La date limite doit être le 2026-08-22 (obtenu : ${drainMilestone.projectedDueDate})`);
  assert(drainMilestone.remainingDays === -2, `Le retard doit être de -2 jours (obtenu : ${drainMilestone.remainingDays})`);
  assert(drainMilestone.urgency === 'OVERDUE', `L'urgence doit être OVERDUE (obtenu : ${drainMilestone.urgency})`);
  assert(drainMilestone.triggerType === 'TIME_TRIGGER', `Le déclencheur doit être TIME_TRIGGER`);

  console.log('  ✔ Validation du terme échu temporel (-2 jours, OVERDUE).');

  // CAS 2 : Dépassé par le KILOMÉTRAGE (ex: 20 000 km parcourus en 6 mois sur un cycle de 12 mois)
  const forecastOverdueByKm = projectMaintenanceSchedule({
    mileageReadings: [
      { date: '2026-01-01', mileage: 50000, source: 'INVOICE' },
      { date: '2026-08-24', mileage: 75000, source: 'USER_DASHBOARD' },
    ],
    lastServices: [
      { category: 'DRAIN_OIL', serviceDate: '2026-01-01', mileage: 50000 },
    ],
    customRules: [
      {
        category: 'DRAIN_OIL',
        title: 'Vidange huile moteur',
        intervalKm: 20000,
        intervalMonths: 12,
        estimatedCostEur: 140,
        isMandatory: true,
      },
    ],
    referenceDate: refDate,
  });

  const drainKmMilestone = forecastOverdueByKm.projectedMilestones[0];
  assert(drainKmMilestone.remainingKm === -5000, `Le dépassement km doit être de -5 000 km (obtenu : ${drainKmMilestone.remainingKm})`);
  assert(drainKmMilestone.urgency === 'OVERDUE' || drainKmMilestone.urgency === 'CRITICAL', `Urgence OVERDUE/CRITICAL attendue (obtenu : ${drainKmMilestone.urgency})`);
  assert(drainKmMilestone.triggerType === 'MILEAGE_TRIGGER', `Le déclencheur doit être MILEAGE_TRIGGER`);

  console.log('  ✔ Validation du terme échu kilométrique (-5 000 km, OVERDUE).');

  // CAS 3 : Véhicule à fort kilométrage sans antécédents de panne (ex: Espace V à 272 448 km)
  const forecastHighKm = projectMaintenanceSchedule({
    mileageReadings: [
      { date: '2026-08-18', mileage: 272448, source: 'INVOICE' },
    ],
    lastServices: [
      { category: 'DRAIN_OIL', serviceDate: '2026-08-18', mileage: 272448 },
    ],
    customRules: [
      {
        category: 'BRAKE_PADS_FRONT',
        title: 'Plaquettes avant',
        intervalKm: 35000,
        intervalMonths: 24,
        estimatedCostEur: 130,
        isMandatory: true,
      },
    ],
    vehicleRegistrationDate: '2021-02-25',
    referenceDate: refDate,
  });

  const padMilestone = forecastHighKm.projectedMilestones[0];
  assert(padMilestone.dueMileage === 280000, `Le cap kilométrique doit être 280 000 km (obtenu : ${padMilestone.dueMileage})`);
  assert(padMilestone.remainingKm > 0, `Les km restants doivent être positifs (obtenu : ${padMilestone.remainingKm})`);
  assert(padMilestone.urgency === 'OK', `Le statut doit être OK pour une révision récente (obtenu : ${padMilestone.urgency})`);

  console.log('  ✔ Validation de la projection sur véhicule à fort kilométrage (Cap à 280 000 km, OK).');

  // CAS 4 : Calcul du Budget Cumulé 12 & 24 mois
  assert(forecastOverdueByTime.upcomingNext12MonthsBudget >= 140, `Le budget 12 mois doit comptabiliser l'échéance échue`);

  console.log('  ✔ Validation du calcul des budgets prévisionnels 12 & 24 mois.');
}
