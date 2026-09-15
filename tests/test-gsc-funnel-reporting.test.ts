import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export async function testGscFunnelReporting() {
  console.log("=================================================");
  console.log("🎯 [TEST] REPORTING FULL FUNNEL GSC & SUPABASE (M2)");
  console.log("=================================================\n");

  const projectRoot = path.resolve(__dirname, "..");
  const gscScriptPath = path.join(projectRoot, "scripts", "gsc_analyzer.py");
  const workflowPath = path.join(projectRoot, ".github", "workflows", "seo-report.yml");

  const venvPython = path.join(
    projectRoot,
    ".venv",
    process.platform === "win32" ? "Scripts" : "bin",
    process.platform === "win32" ? "python.exe" : "python"
  );
  const pythonCmd = fs.existsSync(venvPython) ? `"${venvPython}"` : "python";

  // =========================================================================
  // 1. INTÉGRITÉ DU SCRIPT ET SYNTAXE PYTHON
  // =========================================================================
  console.log("▶ [TEST 1] Intégrité de scripts/gsc_analyzer.py et syntaxe Python...");
  assert.ok(fs.existsSync(gscScriptPath), `Le fichier ${gscScriptPath} doit exister.`);

  const scriptContent = fs.readFileSync(gscScriptPath, "utf-8");
  assert.ok(
    scriptContent.includes("def get_supabase_funnel_metrics"),
    "scripts/gsc_analyzer.py doit définir la fonction get_supabase_funnel_metrics."
  );
  assert.ok(
    scriptContent.includes("ENTONNOIR DE CONVERSION"),
    "scripts/gsc_analyzer.py doit contenir la section d'affichage de l'entonnoir de conversion."
  );
  assert.ok(
    scriptContent.includes("Entonnoir de Conversion (Full Funnel)"),
    "scripts/gsc_analyzer.py doit contenir l'intitulé Full Funnel pour Discord et Telegram."
  );

  // Compilation de syntaxe Python
  try {
    execSync(`${pythonCmd} -m py_compile scripts/gsc_analyzer.py`, {
      cwd: projectRoot,
      encoding: "utf-8",
    });
    console.log("  ✔ Syntaxe Python validée sans aucune erreur de compilation.");
  } catch (err: any) {
    throw new Error(`Erreur de syntaxe Python dans scripts/gsc_analyzer.py: ${err.message}`);
  }

  // =========================================================================
  // 2. FONCTIONNEMENT DE GET_SUPABASE_FUNNEL_METRICS ET RÉSILIENCE
  // =========================================================================
  console.log("▶ [TEST 2] Vérification unitaire de get_supabase_funnel_metrics (logique & résilience)...");

  const pyUnitTests = `
import sys
import os
from unittest.mock import MagicMock, patch
sys.path.insert(0, "scripts")
import gsc_analyzer

# 2.1 Mode dégradé sans identifiants Supabase -> Doit renvoyer None sans lever d'exception
res_none = gsc_analyzer.get_supabase_funnel_metrics(days=7, gsc_clicks=10, supabase_url="", service_role_key="")
assert res_none is None, "Doit retourner None quand les clés Supabase sont absentes."

# 2.2 Test calculs mathématiques & ratios
with patch("requests.get") as mock_get:
    # Simuler réponses PostgREST
    mock_foyers_resp = MagicMock()
    mock_foyers_resp.ok = True
    mock_foyers_resp.status_code = 200
    mock_foyers_resp.json.return_value = [
        {"id": "f1", "metadata": {"source": "seo_pseo"}},
        {"id": "f2", "metadata": {"acquisition": {"source": "seo_pseo"}}},
        {"id": "f3", "metadata": {"source": "direct"}},
    ]

    mock_vehs_resp = MagicMock()
    mock_vehs_resp.ok = True
    mock_vehs_resp.status_code = 200
    mock_vehs_resp.json.return_value = [{"id": "v1"}, {"id": "v2"}]

    mock_micro_resp = MagicMock()
    mock_micro_resp.ok = True
    mock_micro_resp.status_code = 200
    mock_micro_resp.json.return_value = [
        {"id": "m1", "event_type": "pdf_download_print"},
        {"id": "m2", "event_type": "print_carnet"},
        {"id": "m3", "event_type": "dropzone_upload"},
        {"id": "m4", "event_type": "lead_magnet_submit"},
    ]

    def side_effect(url, **kwargs):
        if "foyers" in url:
            return mock_foyers_resp
        elif "vehicules" in url:
            return mock_vehs_resp
        elif "micro_conversions" in url:
            return mock_micro_resp
        return MagicMock(ok=False, status_code=500)

    mock_get.side_effect = side_effect

    res = gsc_analyzer.get_supabase_funnel_metrics(
        days=7,
        gsc_clicks=50,
        supabase_url="https://test.supabase.co",
        service_role_key="test_key"
    )

    assert res is not None, "Le résultat ne doit pas être None avec des mocks valides."
    assert res["new_foyers"] == 3, f"Attendu 3 foyers, reçu {res['new_foyers']}"
    assert res["seo_attributed_foyers"] == 2, f"Attendu 2 foyers pSEO, reçu {res['seo_attributed_foyers']}"
    assert res["new_vehicles"] == 2, f"Attendu 2 véhicules, reçu {res['new_vehicles']}"
    assert res["micro_count"] == 4, f"Attendu 4 micro-conversions, reçu {res['micro_count']}"
    assert res["pdf_count"] == 2, f"Attendu 2 PDF, reçu {res['pdf_count']}"
    assert res["dropzone_count"] == 1, f"Attendu 1 dropzone, reçu {res['dropzone_count']}"
    assert res["lead_magnet_count"] == 1, f"Attendu 1 lead magnet, reçu {res['lead_magnet_count']}"
    # Taux de conversion : (3 / 50) * 100 = 6.0%
    assert abs(res["conversion_rate"] - 6.0) < 0.01, f"Taux attendu 6.0%, reçu {res['conversion_rate']}%"
    # Micro rate : (4 / 50) * 100 = 8.0%
    assert abs(res["micro_rate"] - 8.0) < 0.01, f"Taux micro attendu 8.0%, reçu {res['micro_rate']}%"
    # Closing rate : (3 / 4) * 100 = 75.0%
    assert abs(res["closing_rate"] - 75.0) < 0.01, f"Taux closing attendu 75.0%, reçu {res['closing_rate']}%"

# 2.3 Résilience 404 sur micro_conversions (table non migrée)
with patch("requests.get") as mock_get_404:
    mock_404 = MagicMock()
    mock_404.ok = False
    mock_404.status_code = 404
    mock_404.json.return_value = {"message": "Could not find table"}

    def side_effect_404(url, **kwargs):
        if "micro_conversions" in url:
            return mock_404
        resp = MagicMock()
        resp.ok = True
        resp.status_code = 200
        resp.json.return_value = []
        return resp

    mock_get_404.side_effect = side_effect_404
    res_404 = gsc_analyzer.get_supabase_funnel_metrics(
        days=7,
        gsc_clicks=10,
        supabase_url="https://test.supabase.co",
        service_role_key="test_key"
    )
    assert res_404 is not None, "Doit renvoyer un dictionnaire même si micro_conversions est 404."
    assert res_404["micro_count"] == 0, "Doit compter 0 micro-conversions sur 404 sans crasher."
    assert res_404["conversion_rate"] == 0.0, "Taux conversion doit être 0.0 sans foyer."

print("SUCCESS_PY_UNIT")
`;

  try {
    const stdoutPyUnit = execSync(pythonCmd, {
      cwd: projectRoot,
      encoding: "utf-8",
      input: pyUnitTests,
    });
    assert.ok(stdoutPyUnit.includes("SUCCESS_PY_UNIT"), "Les tests unitaires Python doivent réussir.");
    console.log("  ✔ Logique de calcul, ratios, parsing d'attribution et tolérance 404 validés.");
  } catch (err: any) {
    throw new Error(`Échec des tests unitaires Python : ${err.message}`);
  }

  // =========================================================================
  // 3. AFFICHAGE DU TABLEAU CLI ROUNDED_GRID (--overview --days 7)
  // =========================================================================
  console.log("▶ [TEST 3] Exécution CLI réelle et rendu du tableau tabulate rounded_grid...");

  try {
    const stdoutCli = execSync(`${pythonCmd} scripts/gsc_analyzer.py --overview --days 7`, {
      cwd: projectRoot,
      encoding: "utf-8",
    });

    // Vérification de la présence de la section Full Funnel
    assert.ok(
      stdoutCli.includes("ENTONNOIR DE CONVERSION (FULL FUNNEL"),
      "La sortie CLI doit afficher le titre 'ENTONNOIR DE CONVERSION (FULL FUNNEL)'."
    );
    assert.ok(
      stdoutCli.includes("1. Trafic Organique Google (Clics SEO GSC)"),
      "L'étape 1 (Clics SEO GSC) doit être présente."
    );
    assert.ok(
      stdoutCli.includes("2. Micro-Conversions (Engagement Fiches pSEO)"),
      "L'étape 2 (Micro-conversions) doit être présente."
    );
    assert.ok(
      stdoutCli.includes("3. Macro-Conversions (Comptes & Véhicules Réels)"),
      "L'étape 3 (Macro-conversions) doit être présente."
    );
    assert.ok(
      stdoutCli.includes("Taux de Transformation Global (Clics → Foyers)"),
      "L'étape 4 (Taux de transformation global) doit être présente."
    );

    // Vérification du style rounded_grid (caractères Unicode ╭ │ ╰)
    assert.ok(stdoutCli.includes("╭") && stdoutCli.includes("╰"), "Le tableau doit utiliser le format rounded_grid.");
    console.log("  ✔ Tableau CLI Full Funnel rendu avec succès (rounded_grid et étapes 1-4).");
  } catch (err: any) {
    throw new Error(`Échec de l'exécution CLI scripts/gsc_analyzer.py --overview --days 7 : ${err.message}`);
  }

  // =========================================================================
  // 4. VALIDATION DU FORMAT DISCORD RICH EMBED ET TELEGRAM HTML
  // =========================================================================
  console.log("▶ [TEST 4] Formatage Rich Embed Discord et message HTML Telegram...");

  const pyFormatTests = `
import sys
import html
from unittest.mock import MagicMock, patch
sys.path.insert(0, "scripts")
import gsc_analyzer

# Test Discord embed contract (Standardise, Mobile-First)
mock_pages = [
    {"keys": ["https://www.lavigieauto.com/entretien/dacia/sandero-2/0-9-tce-90"], "clicks": 4, "impressions": 119, "position": 2.1}
]
mock_queries = [
    {"keys": ["carnet entretien jogger gpl"], "clicks": 0, "impressions": 17, "position": 11.1}
]

with patch("gsc_analyzer.get_search_analytics", side_effect=[mock_pages, mock_queries]), \
     patch("requests.post") as mock_post:
    
    mock_post.return_value = MagicMock(status_code=204)
    gsc_analyzer.send_discord_notification(None, "https://www.lavigieauto.com/", webhook_url="https://discord.com/api/webhooks/mock", days=7)
    
    assert mock_post.called, "requests.post doit être appelé pour Discord."
    payload = mock_post.call_args[1]["json"]
    embed = payload["embeds"][0]
    assert embed["title"] == "📈 Rapport SEO Hebdo — LaVigieAuto", "Le titre Discord doit respecter le standard."
    assert "119 imp • 4 clics • CTR" in embed["description"], "La description doit contenir le ruban KPI en code inline."
    assert embed["footer"]["text"] == "54 pages actives au catalogue pSEO", "Le footer doit indiquer les pages du catalogue."
    fields = embed["fields"]
    top_pages_field = next((f for f in fields if "🏆 Top Pages" in f["name"]), None)
    assert top_pages_field is not None, "Le champ '🏆 Top Pages' doit être présent."
    assert ".../sandero-2/0-9-tce-90" in top_pages_field["value"], "L'URL doit être tronquée avec .../."
    assert top_pages_field["inline"] is False, "Le champ doit être inline: False."
    striking_field = next((f for f in fields if "🎯 Zone de Frappe (Pos. 4 à 15)" in f["name"]), None)
    assert striking_field is not None, "Le champ '🎯 Zone de Frappe' doit être présent."
    assert striking_field["inline"] is False, "Le champ doit être inline: False."

# Test Telegram HTML section contract (Standardise, <= 12 lignes)
with patch("gsc_analyzer.get_search_analytics", side_effect=[mock_pages, mock_queries]), \
     patch("requests.post") as mock_post_tg:
    
    mock_post_tg.return_value = MagicMock(status_code=200)
    gsc_analyzer.send_telegram_notification(None, "https://www.lavigieauto.com/", bot_token="mock_token", chat_id="mock_chat", days=7)
    
    assert mock_post_tg.called, "requests.post doit être appelé pour Telegram."
    payload_tg = mock_post_tg.call_args[1]["json"]
    text_tg = payload_tg["text"]
    
    assert "📈 <b>Rapport SEO Hebdo — LaVigieAuto</b>" in text_tg, "Le titre HTML Telegram doit respecter le standard."
    assert "<code>119 imp • 4 clics • CTR" in text_tg, "Le ruban KPI doit être en code HTML."
    assert "🏆 <b>Top Pages :</b>" in text_tg, "Le bloc Top Pages doit être présent."
    assert ".../sandero-2/0-9-tce-90" in text_tg, "L'URL doit être tronquée avec .../."
    assert "54 pages actives au catalogue pSEO" in text_tg, "Le footer catalogue doit être présent."
    lines_count = len(text_tg.splitlines())
    assert lines_count <= 12, f"Le message Telegram ne doit pas excéder 12 lignes (actuel: {lines_count})."

print("SUCCESS_FORMAT_TESTS")
`;

  try {
    const stdoutFormat = execSync(pythonCmd, {
      cwd: projectRoot,
      encoding: "utf-8",
      input: pyFormatTests,
    });
    assert.ok(stdoutFormat.includes("SUCCESS_FORMAT_TESTS"), "Les tests de formatage Discord & Telegram doivent réussir.");
    console.log("  ✔ Contrats de formatage Rich Embed Discord et balises HTML Telegram validés.");
  } catch (err: any) {
    throw new Error(`Échec de la validation de formatage Discord/Telegram : ${err.message}`);
  }

  // =========================================================================
  // 5. INTÉGRITÉ DU WORKFLOW GITHUB ACTIONS (SEO-REPORT.YML)
  // =========================================================================
  console.log("▶ [TEST 5] Intégrité de la configuration CI .github/workflows/seo-report.yml...");
  assert.ok(fs.existsSync(workflowPath), `Le fichier ${workflowPath} doit exister.`);

  const workflowContent = fs.readFileSync(workflowPath, "utf-8");

  assert.ok(
    workflowContent.includes("NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}"),
    "seo-report.yml doit injecter NEXT_PUBLIC_SUPABASE_URL."
  );
  assert.ok(
    workflowContent.includes("SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"),
    "seo-report.yml doit injecter SUPABASE_SERVICE_ROLE_KEY."
  );

  // Vérifier la présence dans les steps qui exécutent gsc_analyzer.py
  const occUrl = (workflowContent.match(/NEXT_PUBLIC_SUPABASE_URL/g) || []).length;
  const occKey = (workflowContent.match(/SUPABASE_SERVICE_ROLE_KEY/g) || []).length;
  assert.ok(
    occUrl >= 4,
    `NEXT_PUBLIC_SUPABASE_URL doit être configuré au niveau job et dans les 3 steps Python (trouvé ${occUrl}).`
  );
  assert.ok(
    occKey >= 4,
    `SUPABASE_SERVICE_ROLE_KEY doit être configuré au niveau job et dans les 3 steps Python (trouvé ${occKey}).`
  );

  console.log("  ✔ Configuration CI GitHub Actions validée avec secrets Supabase injectés.");

  console.log("\n=================================================");
  console.log("🎉 SUITE DE REPORTING FULL FUNNEL GSC VALIDÉE AVEC SUCCÈS !");
  console.log("=================================================\n");
}
