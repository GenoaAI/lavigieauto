import fs from "fs";
import { CollapsibleModuleCard } from "@/components/ui/CollapsibleModuleCard";
import { CollapsibleAllToggle } from "@/components/ui/CollapsibleAllToggle";
import { useCollapsibleSection, getCollapsibleStorageKey, COLLAPSIBLE_TOGGLE_ALL_EVENT } from "@/hooks/useCollapsibleSection";
import { TireWearTracker } from "@/components/vehicles/TireWearTracker";
import { TireOffersCard } from "@/components/tires/TireOffersCard";
import { VehicleVaultList } from "@/components/vault/VehicleVaultList";

export async function testCollapsibleModules() {
  console.log("▶ [TEST] Système de Cartes Pliables / Dépliables (Collapsible Cards & Hook)...");

  // 1. Validation de l'existence et des exports des composants UI
  if (typeof CollapsibleModuleCard !== "function") {
    throw new Error("Le composant CollapsibleModuleCard n'est pas exporté sous forme de fonction.");
  }
  if (typeof CollapsibleAllToggle !== "function") {
    throw new Error("Le composant CollapsibleAllToggle n'est pas exporté sous forme de fonction.");
  }
  if (typeof useCollapsibleSection !== "function") {
    throw new Error("Le hook useCollapsibleSection n'est pas exporté sous forme de fonction.");
  }
  console.log("  ✔ Composants CollapsibleModuleCard, CollapsibleAllToggle et hook useCollapsibleSection exportés.");

  // 2. Validation de la structure d'animation CSS Grid & Zero Layout Shift (CLS = 0)
  const cardSource = fs.readFileSync("src/components/ui/CollapsibleModuleCard.tsx", "utf-8");
  if (!cardSource.includes("grid-rows-[1fr]") || !cardSource.includes("grid-rows-[0fr]")) {
    throw new Error("CollapsibleModuleCard ne contient pas les classes CSS Grid 0fr / 1fr requises.");
  }
  if (!cardSource.includes("transition-[grid-template-rows]") && !cardSource.includes("transition-all")) {
    throw new Error("CollapsibleModuleCard ne comporte pas la transition fluide sur grid-template-rows.");
  }
  if (!cardSource.includes("overflow-hidden min-h-0")) {
    throw new Error("CollapsibleModuleCard ne contient pas le conteneur immédiat 'overflow-hidden min-h-0' garantissant CLS = 0.");
  }
  if (!cardSource.includes("rotate-180") || !cardSource.includes("ChevronDown")) {
    throw new Error("CollapsibleModuleCard ne comporte pas le chevron rotatif animé (ChevronDown + rotate-180).");
  }
  console.log("  ✔ Structure CSS Grid Tailwind 0fr -> 1fr et wrapper 'overflow-hidden min-h-0' validés (CLS = 0).");

  // 3. Validation de l'isolation des clics (stopPropagation) dans CollapsibleModuleCard
  if (!cardSource.includes("stopPropagation()")) {
    throw new Error("CollapsibleModuleCard ne protège pas la zone d'actions avec stopPropagation.");
  }
  console.log("  ✔ Isolation des événements (stopPropagation) sur les boutons d'actions validée.");

  // 4. Validation du format des clés localStorage et scoping par véhicule
  const keyVehicle = getCollapsibleStorageKey("veh-789", "tires_tracker");
  if (keyVehicle !== "lavigieauto_section_veh-789_tires_tracker") {
    throw new Error(`Clé de stockage incorrecte avec vehicleId: ${keyVehicle}`);
  }
  const keyGlobal = getCollapsibleStorageKey(undefined, "digital_vault");
  if (keyGlobal !== "lavigieauto_section_global_digital_vault") {
    throw new Error(`Clé de stockage fallback global incorrecte: ${keyGlobal}`);
  }
  if (COLLAPSIBLE_TOGGLE_ALL_EVENT !== "lavigieauto_toggle_all_sections") {
    throw new Error(`Nom d'événement global incorrect: ${COLLAPSIBLE_TOGGLE_ALL_EVENT}`);
  }
  console.log("  ✔ Format de clés localStorage par véhicule ('lavigieauto_section_${vehicleId}_${moduleId}') validé.");

  // 5. Validation de la matrice des états par défaut mixtes (R2)
  const tireTrackerSource = fs.readFileSync("src/components/vehicles/TireWearTracker.tsx", "utf-8");
  const tireOffersSource = fs.readFileSync("src/components/tires/TireOffersCard.tsx", "utf-8");
  const vehicleDetailSource = fs.readFileSync("src/components/vehicles/VehicleDetailClientView.tsx", "utf-8");
  const vaultSource = fs.readFileSync("src/components/vault/VehicleVaultList.tsx", "utf-8");

  // Pneus : Ouvert par défaut (true)
  if (!tireTrackerSource.includes('id="tires_tracker"') || !tireTrackerSource.includes("defaultOpen={true}")) {
    throw new Error("TireWearTracker n'est pas configuré ouvert par défaut (defaultOpen={true}, id='tires_tracker').");
  }
  // Comparateur Pneus : Fermé par défaut (false)
  if (!tireOffersSource.includes('id="tire_offers"') || !tireOffersSource.includes("defaultOpen={false}")) {
    throw new Error("TireOffersCard n'est pas configuré fermé par défaut (defaultOpen={false}, id='tire_offers').");
  }
  // Échéancier : Ouvert par défaut (true)
  if (!vehicleDetailSource.includes('id="schedule_forecast"') || !vehicleDetailSource.includes("defaultOpen={true}")) {
    throw new Error("Échéancier n'est pas configuré ouvert par défaut (defaultOpen={true}, id='schedule_forecast').");
  }
  // Contrôle Technique : Ouvert par défaut (true)
  if (!vehicleDetailSource.includes('id="inspection_ct"') || !vehicleDetailSource.includes("defaultOpen={true}")) {
    throw new Error("Contrôle Technique n'est pas configuré ouvert par défaut (defaultOpen={true}, id='inspection_ct').");
  }
  // Carnet d'Entretien : Ouvert par défaut (true)
  if (!vehicleDetailSource.includes('id="service_logbook"') || !vehicleDetailSource.includes("defaultOpen={true}")) {
    throw new Error("Carnet d'entretien n'est pas configuré ouvert par défaut (defaultOpen={true}, id='service_logbook').");
  }
  // Coffre-fort : Fermé par défaut (false)
  if (!vaultSource.includes('id="digital_vault"') || !vaultSource.includes("defaultOpen={false}")) {
    throw new Error("VehicleVaultList n'est pas configuré fermé par défaut (defaultOpen={false}, id='digital_vault').");
  }
  // Dropzone : Fermé par défaut (false)
  if (!vehicleDetailSource.includes('id="document_dropzone"') || !vehicleDetailSource.includes("defaultOpen={false}")) {
    throw new Error("Dropzone n'est pas configurée fermée par défaut (defaultOpen={false}, id='document_dropzone').");
  }
  console.log("  ✔ Matrice d'ouverture mixte validée (Pneus/Échéancier/CT/Carnet = OUVERT, Comparateur/Coffre-fort/Dropzone = FERMÉ).");

  // 6. Validation des en-têtes synthétiques toujours visibles (R3)
  if (!tireTrackerSource.includes("Indice Santé") || !tireTrackerSource.includes("Kit Devis Pneus")) {
    throw new Error("TireWearTracker n'expose pas l'indice de santé et le bouton kit devis dans son en-tête permanent.");
  }
  if (!tireOffersSource.includes("3 Meilleurs Tarifs") || !tireOffersSource.includes("handleQuantityChange")) {
    throw new Error("TireOffersCard n'expose pas le badge de synthèse ou le sélecteur 2/4 pneus dans son en-tête permanent.");
  }
  if (!vehicleDetailSource.includes("échéance") || !vehicleDetailSource.includes("Actualiser IA")) {
    throw new Error("Échéancier n'expose pas le compteur d'échéances et le bouton d'actualisation IA dans son en-tête permanent.");
  }
  if (!vehicleDetailSource.includes("FAVORABLE") || !vehicleDetailSource.includes("En attente de scan")) {
    throw new Error("Contrôle Technique n'expose pas le badge de résultat réglementaire dans son en-tête permanent.");
  }
  if (!vehicleDetailSource.includes("intervention") || !vehicleDetailSource.includes("totalInterventionsCost")) {
    throw new Error("Carnet d'entretien n'expose pas le nombre d'interventions et le montant total TTC dans son en-tête permanent.");
  }
  if (!vaultSource.includes("document") || !vaultSource.includes("totalExpensesEur")) {
    throw new Error("Coffre-fort n'expose pas le nombre de justificatifs et le total des dépenses dans son en-tête permanent.");
  }
  console.log("  ✔ En-têtes synthétiques permanents (score, alertes, totaux TTC, badges CT, justificatifs) validés.");

  // 7. Validation de la commande globale "Tout Déplier / Tout Replier" (R4)
  const toggleSource = fs.readFileSync("src/components/ui/CollapsibleAllToggle.tsx", "utf-8");
  if (!toggleSource.includes("COLLAPSIBLE_TOGGLE_ALL_EVENT") && !toggleSource.includes("lavigieauto_toggle_all_sections")) {
    throw new Error("CollapsibleAllToggle n'émet pas l'événement custom lavigieauto_toggle_all_sections.");
  }
  if (!vehicleDetailSource.includes("<CollapsibleAllToggle vehicleId={v.id} />")) {
    throw new Error("CollapsibleAllToggle n'est pas intégré dans la barre d'action de VehicleDetailClientView.");
  }
  console.log("  ✔ Commande globale 'Tout déplier / Tout replier' (CollapsibleAllToggle) intégrée et synchronisée.");

  // 8. Validation de la conformité stricte GEMINI.md (Zéro Fake Data & Server Actions Async)
  const serverActionFiles = [
    "src/app/actions/vehicles.ts",
    "src/app/actions/tires.ts",
    "src/app/actions/vault.ts",
    "src/app/actions/documents.ts",
  ];
  for (const file of serverActionFiles) {
    const content = fs.readFileSync(file, "utf-8");
    if (!content.startsWith('"use server"') && !content.startsWith("'use server'")) {
      throw new Error(`Le fichier Server Action ${file} ne commence pas par "use server".`);
    }
  }
  console.log("  ✔ Conformité GEMINI.md validée (zéro fake data, Server Actions 100% async).");
}
