import { updateHouseholdNameSchema } from "@/lib/security/schemas";
import { sanitizeHouseholdName } from "@/lib/security/sanitizer";
import { updateHouseholdNameAction, updateHouseholdName } from "@/app/actions/foyer";
import { FoyerNameEditor } from "@/components/foyer/FoyerNameEditor";
import fs from "fs";

export async function testHouseholdNameManagement() {
  console.log("▶ [TEST] Édition & Sécurisation du Nom de Foyer (Zod, Sanitizer & Server Action)...");

  // 1. Test du Sanitizer & protection Anti-XSS
  const dirtyInput = "<script>alert('xss')</script>   Foyer   de la   Vallée   ";
  const sanitized = sanitizeHouseholdName(dirtyInput);
  if (sanitized.includes("<script>") || sanitized.includes("</script>")) {
    throw new Error("Le sanitizer n'a pas éliminé les balises HTML/script.");
  }
  if (sanitized !== "alert('xss') Foyer de la Vallée") {
    throw new Error(`Sanitizer output inattendu : "${sanitized}"`);
  }
  console.log("  ✔ Sanitizer anti-XSS et normalisation des espaces validés.");

  // 2. Test du schéma Zod de validation
  // Cas valide
  const validParse = updateHouseholdNameSchema.safeParse({
    householdId: "foyer-123",
    newName: "  Foyer Dupont & Famille  ",
  });
  if (!validParse.success || validParse.data.newName !== "Foyer Dupont & Famille") {
    throw new Error(`Échec de validation d'un nom valide : ${JSON.stringify(validParse)}`);
  }

  // Cas trop court (< 2 caractères)
  const shortParse = updateHouseholdNameSchema.safeParse({
    householdId: "foyer-123",
    newName: "A",
  });
  if (shortParse.success) {
    throw new Error("Le schéma Zod aurait dû rejeter un nom de moins de 2 caractères.");
  }

  // Cas trop long (> 50 caractères)
  const longParse = updateHouseholdNameSchema.safeParse({
    householdId: "foyer-123",
    newName: "A".repeat(55),
  });
  if (longParse.success) {
    throw new Error("Le schéma Zod aurait dû rejeter un nom dépassant 50 caractères.");
  }

  // Cas chaîne vide
  const emptyParse = updateHouseholdNameSchema.safeParse({
    householdId: "foyer-123",
    newName: "   ",
  });
  if (emptyParse.success) {
    throw new Error("Le schéma Zod aurait dû rejeter une chaîne vide.");
  }
  console.log("  ✔ Schéma Zod updateHouseholdNameSchema validé avec contraintes de taille [2, 50] et typage strict.");

  // 3. Test de la Server Action updateHouseholdNameAction
  const actionRes = await updateHouseholdNameAction("foyer-test-456", "  Foyer des Lauriers  ");
  if (!actionRes.success || actionRes.nom !== "Foyer des Lauriers") {
    throw new Error(`Échec updateHouseholdNameAction : ${JSON.stringify(actionRes)}`);
  }

  const aliasRes = await updateHouseholdName("foyer-test-456", "A");
  if (aliasRes.success) {
    throw new Error("L'alias updateHouseholdName aurait dû rejeter le nom trop court.");
  }
  console.log("  ✔ Server Actions updateHouseholdNameAction & updateHouseholdName validées.");

  // 4. Test du composant FoyerNameEditor et intégration UI
  if (typeof FoyerNameEditor !== "function") {
    throw new Error("Le composant FoyerNameEditor n'est pas exporté.");
  }

  const headerSrc = fs.readFileSync("src/components/layout/UserNavHeader.tsx", "utf-8");
  if (!headerSrc.includes("FoyerNameEditor") || !headerSrc.includes("variant=\"header\"")) {
    throw new Error("UserNavHeader n'intègre pas FoyerNameEditor en mode header.");
  }

  const pageSrc = fs.readFileSync("src/app/page.tsx", "utf-8");
  if (!pageSrc.includes("FoyerNameEditor")) {
    throw new Error("src/app/page.tsx n'intègre pas FoyerNameEditor.");
  }

  const dashboardSrc = fs.readFileSync("src/components/dashboard/DashboardClientView.tsx", "utf-8");
  if (!dashboardSrc.includes("FoyerNameEditor")) {
    throw new Error("DashboardClientView n'intègre pas FoyerNameEditor.");
  }

  const sidebarSrc = fs.readFileSync("src/components/layout/DashboardSidebar.tsx", "utf-8");
  if (!sidebarSrc.includes("foyerNameUpdated")) {
    throw new Error("DashboardSidebar n'écoute pas les événements foyerNameUpdated.");
  }

  console.log("  ✔ Intégration UI validée sur Page d'Accueil, Header Bandeau, Dashboard et Sidebar.");
}
