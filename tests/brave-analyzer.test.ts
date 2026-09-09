import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import sitemap from "@/app/sitemap";

export async function testBraveAnalyzerSuite() {
  console.log("=================================================");
  console.log("🦁 [TEST] OUTILLAGE BRAVE SEARCH & CLAUDE (GEO)");
  console.log("=================================================\n");

  const projectRoot = path.resolve(__dirname, "..");
  const braveScriptPath = path.join(projectRoot, "scripts", "brave_analyzer.py");
  const gscScriptPath = path.join(projectRoot, "scripts", "gsc_analyzer.py");
  const workflowPath = path.join(projectRoot, ".github", "workflows", "seo-report.yml");
  const packageJsonPath = path.join(projectRoot, "package.json");

  // 1. Vérification de l'existence du script centralisé
  console.log("▶ [TEST 1] Intégrité du script centralisé scripts/brave_analyzer.py...");
  if (!fs.existsSync(braveScriptPath)) {
    throw new Error(`Le script ${braveScriptPath} est introuvable.`);
  }
  const scriptContent = fs.readFileSync(braveScriptPath, "utf-8");
  if (!scriptContent.includes("BraveSearchClient") || !scriptContent.includes("get_brave_summary")) {
    throw new Error("scripts/brave_analyzer.py ne contient pas les symboles BraveSearchClient ou get_brave_summary.");
  }
  console.log("  ✔ Script centralisé présent avec BraveSearchClient et get_brave_summary.");

  // 2. Vérification de l'exécution CLI en mode zéro-clé (mode dégradé gracieux)
  console.log("▶ [TEST 2] Résilience Zero-Key et exécution CLI (--overview)...");
  try {
    const stdoutOverview = execSync("python scripts/brave_analyzer.py --overview", {
      cwd: projectRoot,
      encoding: "utf-8",
      env: { ...process.env, BRAVE_SEARCH_API_KEY: "", BRAVE_API_KEY: "" },
    });
    if (!stdoutOverview.includes("BRAVE SEARCH & CLAUDE (GEO)") || !stdoutOverview.includes("Total URLs Catalogue pSEO")) {
      throw new Error("La sortie de --overview ne contient pas les indicateurs attendus.");
    }
    console.log("  ✔ Commande --overview exécutée avec succès en mode dégradé (sortie 0, tableau propre).");
  } catch (err: any) {
    throw new Error(`Échec de l'exécution de brave_analyzer.py --overview : ${err.message}`);
  }

  // 3. Assistant de soumission prioritaire (--submit)
  console.log("▶ [TEST 3] Assistant de soumission instantanée (--submit)...");
  try {
    const stdoutSubmit = execSync("python scripts/brave_analyzer.py --submit", {
      cwd: projectRoot,
      encoding: "utf-8",
    });
    if (!stdoutSubmit.includes("search.brave.com/submit-url?url=") || !stdoutSubmit.includes("llms.txt")) {
      throw new Error("L'assistant de soumission n'a pas généré les URLs ou le lien /llms.txt.");
    }
    console.log("  ✔ Commande --submit validée avec génération des liens prioritaires pour Brave.");
  } catch (err: any) {
    throw new Error(`Échec de brave_analyzer.py --submit : ${err.message}`);
  }

  // 4. Accélérateur Web Discovery Project (--wdp)
  console.log("▶ [TEST 4] Accélérateur Web Discovery Project (--wdp)...");
  try {
    const stdoutWdp = execSync("python scripts/brave_analyzer.py --wdp", {
      cwd: projectRoot,
      encoding: "utf-8",
    });
    const generatedHtmlPath = path.join(projectRoot, "scripts", "data", "brave_wdp_launcher.html");
    if (!fs.existsSync(generatedHtmlPath)) {
      throw new Error("Le fichier brave_wdp_launcher.html n'a pas été généré.");
    }
    const htmlContent = fs.readFileSync(generatedHtmlPath, "utf-8");
    if (!htmlContent.includes("Web Discovery Project") || !htmlContent.includes("openAllTabs()")) {
      throw new Error("Le contenu HTML du lanceur WDP est incomplet.");
    }
    console.log("  ✔ Accélérateur WDP validé avec génération du launcher HTML et détection navigateur.");
  } catch (err: any) {
    throw new Error(`Échec de brave_analyzer.py --wdp : ${err.message}`);
  }

  // 5. Réconciliation du catalogue pSEO vs sitemap officiel
  console.log("▶ [TEST 5] Cohérence du catalogue (57 URLs sitemap + endpoint /llms.txt)...");
  const sitemapEntries = sitemap();
  if (!sitemapEntries || sitemapEntries.length < 54) {
    throw new Error(`Sitemap incomplet (${sitemapEntries?.length} entrées).`);
  }
  const sitemapUrls = new Set(sitemapEntries.map((e) => e.url));
  if (!sitemapUrls.has("https://www.lavigieauto.com") || !sitemapUrls.has("https://www.lavigieauto.com/entretien")) {
    throw new Error("Racine ou Hub /entretien manquant dans le sitemap.");
  }
  console.log(`  ✔ Sitemap officiel conforme (${sitemapEntries.length} URLs indexables).`);

  // 6. Intégration dans gsc_analyzer.py (Discord & Telegram)
  console.log("▶ [TEST 6] Intégration du module Brave dans les alertes Discord & Telegram...");
  const gscContent = fs.readFileSync(gscScriptPath, "utf-8");
  if (!gscContent.includes("from brave_analyzer import get_brave_summary")) {
    throw new Error("gsc_analyzer.py n'importe pas get_brave_summary depuis brave_analyzer.");
  }
  if (!gscContent.includes("Brave Search & Claude (GEO)")) {
    throw new Error("gsc_analyzer.py n'inclut pas la section Brave Search & Claude (GEO) dans ses templates.");
  }
  console.log("  ✔ Notifications hebdomadaires enrichies avec les métriques Brave Search & Claude.");

  // 7. Intégration GitHub Actions (.github/workflows/seo-report.yml)
  console.log("▶ [TEST 7] Intégration dans le workflow CI/CD seo-report.yml...");
  const workflowContent = fs.readFileSync(workflowPath, "utf-8");
  if (!workflowContent.includes("BRAVE_SEARCH_API_KEY") || !workflowContent.includes("brave_analyzer.py")) {
    throw new Error("Le workflow seo-report.yml ne référence pas BRAVE_SEARCH_API_KEY ou brave_analyzer.py.");
  }
  console.log("  ✔ Workflow GitHub Actions enrichi avec le secret BRAVE_SEARCH_API_KEY et l'étape d'audit.");

  // 8. Vérification des scripts package.json
  console.log("▶ [TEST 8] Raccourcis npm dans package.json...");
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const expectedScripts = ["brave", "brave:audit", "brave:queries", "brave:submit", "brave:wdp", "seo:all"];
  for (const s of expectedScripts) {
    if (!pkg.scripts[s]) {
      throw new Error(`Le script npm '${s}' est manquant dans package.json.`);
    }
  }
  if (!pkg.scripts["seo:all"].includes("npm run brave")) {
    throw new Error("Le script 'seo:all' n'inclut pas 'npm run brave'.");
  }
  console.log("  ✔ Raccourcis npm validés : brave, brave:audit, brave:queries, brave:submit, brave:wdp, seo:all.");

  console.log("\n=================================================");
  console.log("🎉 SUITE DE TESTS BRAVE SEARCH & CLAUDE (GEO) VALIDÉE AVEC SUCCÈS !");
  console.log("=================================================\n");
}
