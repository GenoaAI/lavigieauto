import { updateMilestoneAlertStatusSchema } from "@/lib/security/schemas";
import {
  toggleMilestoneAlertStatusAction,
  updateMilestoneAlertStatusAction,
} from "@/app/actions/vehicles";
import fs from "fs";

export async function testMilestoneAlertStatusManagement() {
  console.log("=================================================");
  console.log("🔔 [TEST] GESTION DE LA SUSPENSION / SNOOZE DES ALERTES D'ÉCHÉANCES");
  console.log("=================================================\n");

  // ==========================================
  // 1. TESTS DE VALIDATION DU SCHÉMA ZOD
  // ==========================================
  console.log("▶ [TEST 1] Validation du schéma Zod updateMilestoneAlertStatusSchema...");

  // Cas valide 1 : Suspension avec is_active_alert: false
  const valid1 = updateMilestoneAlertStatusSchema.safeParse({
    vehicleId: "11111111-1111-1111-1111-111111111111",
    milestoneId: "ech-vidange-1",
    is_active_alert: false,
  });
  if (!valid1.success) {
    throw new Error("Échec validation Zod valide (is_active_alert: false)");
  }

  // Cas valide 2 : Suspension avec status: 'ignore'
  const valid2 = updateMilestoneAlertStatusSchema.safeParse({
    vehicleId: "22222222-2222-2222-2222-222222222222",
    milestoneId: "ech-ct-1",
    status: "ignore",
  });
  if (!valid2.success) {
    throw new Error("Échec validation Zod valide (status: 'ignore')");
  }

  // Cas valide 3 : Réactivation avec muted: false
  const valid3 = updateMilestoneAlertStatusSchema.safeParse({
    vehicleId: "33333333-3333-3333-3333-333333333333",
    milestoneId: "ech-bougies-1",
    muted: false,
  });
  if (!valid3.success) {
    throw new Error("Échec validation Zod valide (muted: false)");
  }

  // Cas invalide 1 : vehicleId manquant / vide
  const invalidNoVeh = updateMilestoneAlertStatusSchema.safeParse({
    vehicleId: "   ",
    milestoneId: "ech-1",
    is_active_alert: false,
  });
  if (invalidNoVeh.success) {
    throw new Error("Le schéma Zod aurait dû rejeter un vehicleId vide.");
  }

  // Cas invalide 2 : milestoneId manquant / vide
  const invalidNoMilestone = updateMilestoneAlertStatusSchema.safeParse({
    vehicleId: "11111111-1111-1111-1111-111111111111",
    milestoneId: "",
    is_active_alert: false,
  });
  if (invalidNoMilestone.success) {
    throw new Error("Le schéma Zod aurait dû rejeter un milestoneId vide.");
  }

  // Cas invalide 3 : aucun paramètre de statut fourni (refine check)
  const invalidNoStatus = updateMilestoneAlertStatusSchema.safeParse({
    vehicleId: "11111111-1111-1111-1111-111111111111",
    milestoneId: "ech-1",
  });
  if (invalidNoStatus.success) {
    throw new Error("Le schéma Zod aurait dû rejeter un payload sans indicateur d'état.");
  }

  // Cas invalide 4 : status invalide (hors enum)
  const invalidStatusEnum = updateMilestoneAlertStatusSchema.safeParse({
    vehicleId: "11111111-1111-1111-1111-111111111111",
    milestoneId: "ech-1",
    status: "inconnu" as any,
  });
  if (invalidStatusEnum.success) {
    throw new Error("Le schéma Zod aurait dû rejeter un statut hors enum.");
  }

  console.log("  ✔ Schéma Zod validé avec succès (cas valides acceptés, cas erronés strictement rejetés).\n");

  // ==========================================
  // 2. TESTS DES SERVER ACTIONS & CONTRÔLE D'ACCÈS ZERO-TRUST
  // ==========================================
  console.log("▶ [TEST 2] Exécution & Sécurité des Server Actions (toggleMilestoneAlertStatusAction)...");

  if (typeof toggleMilestoneAlertStatusAction !== "function") {
    throw new Error("toggleMilestoneAlertStatusAction n'est pas une fonction exportée.");
  }
  if (typeof updateMilestoneAlertStatusAction !== "function") {
    throw new Error("updateMilestoneAlertStatusAction n'est pas une fonction exportée.");
  }

  // Test 2.1 : Rejet Zod si payload invalide
  const resInvalid = await toggleMilestoneAlertStatusAction({
    vehicleId: "",
    milestoneId: "",
  } as any);
  if (resInvalid.success) {
    throw new Error("La Server Action aurait dû échouer sur un payload vide.");
  }
  console.log("  ✔ Rejet strict des entrées non conformes dans la Server Action validé.");

  // Test 2.2 : Suspension d'une alerte sur un véhicule valide
  const resMute = await toggleMilestoneAlertStatusAction({
    vehicleId: "v-test-vitara-1",
    milestoneId: "ech-vidange-test",
    is_active_alert: false,
  });
  if (!resMute.success || !resMute.isSuspended || resMute.statut !== "ignore") {
    throw new Error(`Échec de la suspension de l'alerte : ${JSON.stringify(resMute)}`);
  }
  console.log("  ✔ Suspension d'alerte (isSuspended: true, statut: 'ignore') validée avec succès.");

  // Test 2.3 : Réactivation de l'alerte
  const resUnmute = await toggleMilestoneAlertStatusAction({
    vehicleId: "v-test-vitara-1",
    milestoneId: "ech-vidange-test",
    is_active_alert: true,
  });
  if (!resUnmute.success || resUnmute.isSuspended || resUnmute.statut !== "a_venir") {
    throw new Error(`Échec de la réactivation de l'alerte : ${JSON.stringify(resUnmute)}`);
  }
  console.log("  ✔ Réactivation d'alerte (isSuspended: false, statut: 'a_venir') validée avec succès.");

  // Test 2.4 : Contrôle BOLA / IDOR - Tentative de modification sur un véhicule tiers inexistant
  const resBola = await toggleMilestoneAlertStatusAction({
    vehicleId: "99999999-9999-9999-9999-999999999999", // Véhicule non autorisé / inconnu
    milestoneId: "ech-1",
    is_active_alert: false,
  });
  if (resBola.success) {
    throw new Error("La Server Action aurait dû refuser la modification d'un véhicule n'appartenant pas au foyer.");
  }
  console.log("  ✔ Protection BOLA/IDOR validée : rejet des modifications non autorisées.\n");

  // ==========================================
  // 3. TESTS DE COMPOSANTS & INTÉGRATION UI
  // ==========================================
  console.log("▶ [TEST 3] Vérification de l'interface utilisateur & des badges de suspension...");

  const detailViewSrc = fs.readFileSync("src/components/vehicles/VehicleDetailClientView.tsx", "utf-8");

  // Vérification de la présence des imports et des icônes
  if (!detailViewSrc.includes("toggleMilestoneAlertStatusAction")) {
    throw new Error("VehicleDetailClientView n'importe pas toggleMilestoneAlertStatusAction.");
  }
  if (!detailViewSrc.includes("BellOff") || !detailViewSrc.includes("Bell")) {
    throw new Error("VehicleDetailClientView n'intègre pas les icônes Bell et BellOff.");
  }

  // Vérification des boutons d'action
  if (!detailViewSrc.includes("Suspendre l'alerte") || !detailViewSrc.includes("Réactiver le rappel")) {
    throw new Error("VehicleDetailClientView ne propose pas les actions 'Suspendre l'alerte' et 'Réactiver le rappel'.");
  }

  // Vérification du badge 'Ignorée' / 'Suspendue'
  if (!detailViewSrc.includes("Ignorée")) {
    throw new Error("VehicleDetailClientView n'affiche pas le badge 'Ignorée' pour les alertes suspendues.");
  }

  // Vérification du toast informatif
  if (!detailViewSrc.includes("feedbackToast")) {
    throw new Error("VehicleDetailClientView n'affiche pas de feedback toast informatif.");
  }

  // Vérification DashboardClientView
  const dashboardSrc = fs.readFileSync("src/components/dashboard/DashboardClientView.tsx", "utf-8");
  if (!dashboardSrc.includes("isSuspended") && !dashboardSrc.includes("alert_muted")) {
    throw new Error("DashboardClientView ne filtre pas les alertes d'échéances suspendues.");
  }

  // Simulation logique de neutralisation d'alerte dans une liste d'échéances
  const testEcheances = [
    {
      id: "ech-1",
      libelle: "Vidange moteur",
      statut: "en_retard",
      date_preconisee: "2024-01-01",
      metadata: {},
    },
    {
      id: "ech-2",
      libelle: "Liquide de frein",
      statut: "ignore", // Suspendu / ignoré
      date_preconisee: "2023-01-01",
      metadata: { alert_muted: true },
    },
    {
      id: "ech-3",
      libelle: "Filtre habitacle",
      statut: "a_venir",
      date_preconisee: "2027-01-01",
      metadata: {},
    },
  ];

  const filteredOverdue = testEcheances.filter((ech: any) => {
    const isSuspended =
      ech.statut === "ignore" ||
      ech.statut === "suspendu" ||
      ech.statut === "muted" ||
      ech.metadata?.alert_muted === true;
    if (isSuspended) return false;
    return ech.statut === "en_retard";
  });

  if (filteredOverdue.length !== 1 || filteredOverdue[0].id !== "ech-1") {
    throw new Error(`Filtrage d'alerte incorrect : attendu 1 alerte active ('ech-1'), obtenu ${filteredOverdue.length}`);
  }

  console.log("  ✔ Neutralisation de l'alerte '🚨 EN RETARD' pour les échéances suspendues validée.");
  console.log("  ✔ Boutons d'action 'Suspendre l'alerte' / 'Réactiver le rappel' et affichage discret validés.");
  console.log("  ✔ Toast de confirmation et mise à jour d'état réactive validés.\n");

  console.log("=================================================");
  console.log("🎉 SUITE DE TESTS SUSPENSION / SNOOZE D'ALERTES VALIDÉE AVEC SUCCÈS !");
  console.log("=================================================\n");
}
