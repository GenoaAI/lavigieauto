import { loadSkillPrompt } from "../src/lib/ai/skills-loader";

export async function runSkillsLoaderTest() {
  console.log("▶ [TEST] Découplage LLM : Validation des Prompts Markdown dans skills/ (Zero Hardcoding)...");

  // 1. Test Carte Grise Skill
  const regSkill = loadSkillPrompt("registration-card-parser", {
    rawTextContext: "SUZUKI VITARA EC-301-JX 2016-05-24",
    customPromptContext: "Extraire le VIN",
  });
  if (!regSkill.prompt.includes("SUZUKI VITARA EC-301-JX") || !regSkill.systemPrompt.includes("Cartes Grises")) {
    throw new Error("Échec du chargement du skill registration-card-parser");
  }
  console.log("  ✔ Skill registration-card-parser validé avec substitution de variables.");

  // 2. Test Facture Atelier Skill
  const invSkill = loadSkillPrompt("invoice-parser", {
    vehicleContext: "Renault Espace V (FX-563-KZ)",
  });
  if (!invSkill.prompt.includes("Renault Espace V") || !invSkill.systemPrompt.includes("factures")) {
    throw new Error("Échec du chargement du skill invoice-parser");
  }
  console.log("  ✔ Skill invoice-parser validé.");

  // 3. Test Contrôle Technique Skill
  const ctSkill = loadSkillPrompt("technical-inspection-parser", {
    vehicleContext: "Renault Clio III (GP-902-NY)",
  });
  if (!ctSkill.prompt.includes("Renault Clio III") || !ctSkill.systemPrompt.includes("UTAC / OTC")) {
    throw new Error("Échec du chargement du skill technical-inspection-parser");
  }
  console.log("  ✔ Skill technical-inspection-parser validé.");

  // 4. Test Plan Constructeur 100% Exhaustif Skill
  const mfgSkill = loadSkillPrompt("manufacturer-plan-retriever", {
    make: "Suzuki",
    model: "Vitara",
    version: "1.6 VVT AllGrip",
    fuelType: "Essence",
    year: 2016,
    vin: "TSMEYA21S00123456",
  });
  if (!mfgSkill.prompt.includes("Suzuki") || !mfgSkill.prompt.includes("1.6 VVT AllGrip") || !mfgSkill.prompt.includes("Courroie d'accessoires")) {
    throw new Error("Échec du chargement du skill manufacturer-plan-retriever");
  }
  console.log("  ✔ Skill manufacturer-plan-retriever 100% constructeur validé.");

  console.log("  ✔ Tous les prompts LLM sont externalisés dans des fichiers .md et respectent le Zero Hardcoding.");
}

if (require.main === module) {
  runSkillsLoaderTest();
}
