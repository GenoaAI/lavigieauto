#!/usr/bin/env python3
"""
Brave Search & Claude (GEO) Analyzer pour LaVigieAuto (lavigieauto.com).

Surveillance du référencement sur le moteur Brave Search et de la présence
dans les données sourcées par Claude (Anthropic) et les agents IA :
- Vérification de l'indexation du catalogue pSEO (57 URLs + /llms.txt)
- Détection et positionnement sur les requêtes cibles d'entretien automobile
- Assistant de soumission prioritaire (search.brave.com/submit-url)
- Accélérateur Web Discovery Project (WDP) pour amorcer l'indexation Bravebot
- Export de synthèse pour le reporting hebdomadaire (Discord / Telegram)
"""

import os
import sys
import re
import json
import glob
import html
import urllib.parse
import urllib.request
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Dépendances avec repli gracieux si tabulate est absent
try:
    from tabulate import tabulate
except ImportError:
    project_root = Path(__file__).resolve().parent.parent
    venv_python = project_root / ".venv" / ("Scripts" if sys.platform == "win32" else "bin") / ("python.exe" if sys.platform == "win32" else "python")
    if venv_python.exists() and sys.executable.lower() != str(venv_python).lower():
        import subprocess
        result = subprocess.run([str(venv_python)] + sys.argv)
        sys.exit(result.returncode)

    def tabulate(rows, headers, tablefmt="rounded_outline"):
        header_str = " | ".join(str(h) for h in headers)
        sep = "-" * max(len(header_str), 20)
        lines = [header_str, sep]
        for row in rows:
            lines.append(" | ".join(str(cell) for cell in row))
        return "\n".join(lines)


BRAVE_API_BASE = "https://api.search.brave.com/res/v1"
DEFAULT_DOMAIN = "lavigieauto.com"
DEFAULT_BASE_URL = "https://www.lavigieauto.com"
DATA_DIR = Path(__file__).resolve().parent / "data"
STATUS_CACHE_FILE = DATA_DIR / "brave_index_status.json"

TARGET_QUERIES = [
    "plan entretien peugeot 208",
    "carnet entretien suzuki vitara",
    "revision dacia sandero stepway",
    "courroie distribution renault clio 4",
    "frequence vidange peugeot 308",
    "entretien dacia jogger eco-g",
    "programme entretien dacia duster",
    "prix revision clio 4 essence",
    "entretien renault espace 5",
    "site:lavigieauto.com",
]


def find_api_key() -> Optional[str]:
    """Récupère la clé API Brave Search depuis l'environnement ou les fichiers .env."""
    for env_var in ["BRAVE_SEARCH_API_KEY", "BRAVE_API_KEY"]:
        val = os.getenv(env_var)
        if val and len(val.strip().strip('"\'')) > 10:
            return val.strip().strip('"\'')

    project_root = Path(__file__).resolve().parent.parent
    env_files = [project_root / ".env.local", project_root / ".env"]
    for env_file in env_files:
        if env_file.exists():
            try:
                for line in env_file.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"\'').strip()
                    if k in ("BRAVE_SEARCH_API_KEY", "BRAVE_API_KEY") and len(v) > 10:
                        return v
            except Exception:
                pass
    return None


def get_local_catalog_urls(base_url: str = DEFAULT_BASE_URL) -> List[Dict[str, str]]:
    """
    Extrait l'ensemble des 57+ URLs du catalogue pSEO à partir des JSON réels
    de src/data/maintenance/*.json et des routes canoniques.
    """
    project_root = Path(__file__).resolve().parent.parent
    data_dir = project_root / "src" / "data" / "maintenance"
    
    urls: List[Dict[str, str]] = [
        {"url": f"{base_url}", "type": "Racine", "priority": "1.0", "label": "Accueil"},
        {"url": f"{base_url}/entretien", "type": "Hub Global", "priority": "0.9", "label": "Hub Entretien"},
        {"url": f"{base_url}/llms.txt", "type": "Endpoint IA", "priority": "0.85", "label": "LLMs Knowledge Base"},
    ]

    brand_slugs = set()
    model_entries = set()
    leaf_entries = []

    if data_dir.exists():
        json_files = sorted(data_dir.glob("*.json"))
        for jf in json_files:
            try:
                data = json.loads(jf.read_text(encoding="utf-8"))
                brand = data.get("brandSlug")
                model = data.get("modelSlug")
                engine = data.get("engineSlug")
                brand_name = data.get("brand", brand)
                model_name = data.get("model", model)

                if brand:
                    brand_slugs.add(brand)
                if brand and model:
                    model_entries.add((brand, model, brand_name, model_name))
                if brand and model and engine:
                    leaf_entries.append({
                        "brand": brand,
                        "model": model,
                        "engine": engine,
                        "label": f"{brand_name} {model_name} ({data.get('engineName', engine)})"
                    })
            except Exception:
                pass

    # Hubs Marques (priorité 0.85)
    for b in sorted(brand_slugs):
        urls.append({
            "url": f"{base_url}/entretien/{b}",
            "type": "Hub Marque",
            "priority": "0.85",
            "label": f"Marque {b.capitalize()}"
        })

    # Hubs Modèles (priorité 0.82)
    for b, m, b_name, m_name in sorted(model_entries):
        urls.append({
            "url": f"{base_url}/entretien/{b}/{m}",
            "type": "Hub Modèle",
            "priority": "0.82",
            "label": f"{b_name} {m_name}"
        })

    # Fiches Feuilles (priorité 0.80)
    for leaf in leaf_entries:
        urls.append({
            "url": f"{base_url}/entretien/{leaf['brand']}/{leaf['model']}/{leaf['engine']}",
            "type": "Fiche Moteur",
            "priority": "0.80",
            "label": leaf["label"]
        })

    return urls


class BraveSearchClient:
    """Client REST pour l'API Brave Search (Web Search & LLM Context)."""

    def __init__(self, api_key: str):
        self.api_key = api_key

    def _call(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        query_string = urllib.parse.urlencode(params)
        url = f"{BRAVE_API_BASE}/{endpoint}?{query_string}"
        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": self.api_key,
            "User-Agent": "LaVigieAuto-SEO-Analyzer/1.0",
        }
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=12) as resp:
            raw = resp.read()
            # Gzip decode si nécessaire
            if resp.info().get("Content-Encoding") == "gzip":
                import gzip
                raw = gzip.decompress(raw)
            return json.loads(raw.decode("utf-8"))

    def web_search(self, query: str, count: int = 20, offset: int = 0, country: str = "fr") -> Dict[str, Any]:
        """Interroge l'API Web Search de Brave (count plafonné à 20 par l'API)."""
        safe_count = min(max(1, count), 20)
        return self._call("web/search", {
            "q": query,
            "count": safe_count,
            "offset": offset,
            "country": country,
            "search_lang": "fr",
            "result_filter": "web,query",
        })

    def site_search(self, domain: str = DEFAULT_DOMAIN, count: int = 20) -> List[Dict[str, Any]]:
        """Recherche toutes les pages indexées pour le domaine dans Brave avec pagination."""
        all_results: List[Dict[str, Any]] = []
        target_count = count
        offset = 0
        batch_size = 20
        while offset < target_count:
            res = self.web_search(f"site:{domain}", count=batch_size, offset=offset)
            web_results = res.get("web", {}).get("results", [])
            if not web_results:
                break
            all_results.extend(web_results)
            if len(web_results) < batch_size:
                break
            offset += batch_size
        return all_results

    def test_query(self, query: str, target_domain: str = DEFAULT_DOMAIN) -> Dict[str, Any]:
        """Teste le classement de target_domain sur une requête donnée."""
        res = self.web_search(query, count=20)
        web_results = res.get("web", {}).get("results", [])
        
        matched_rank = None
        matched_url = None
        matched_title = None

        for idx, item in enumerate(web_results, start=1):
            url = item.get("url", "")
            if target_domain in url:
                matched_rank = idx
                matched_url = url
                matched_title = item.get("title", "")
                break

        return {
            "query": query,
            "total_results": len(web_results),
            "ranked": matched_rank is not None,
            "rank": matched_rank,
            "url": matched_url,
            "title": matched_title,
            "top_domain": web_results[0].get("profile", {}).get("long_name") if web_results else "-",
        }


def load_cached_audit() -> Optional[Dict[str, Any]]:
    """Charge le dernier audit mis en cache si disponible."""
    if STATUS_CACHE_FILE.exists():
        try:
            return json.loads(STATUS_CACHE_FILE.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


def save_audit_cache(data: Dict[str, Any]) -> None:
    """Enregistre le statut d'indexation dans scripts/data."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        STATUS_CACHE_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception as e:
        print(f"⚠️ Impossible de sauvegarder le cache : {e}", file=sys.stderr)


def run_full_indexation_audit(client: Optional[BraveSearchClient], domain: str = DEFAULT_DOMAIN) -> Dict[str, Any]:
    """
    Compare l'intégralité du catalogue local (57 URLs) avec les résultats indexés par Brave.
    """
    local_urls = get_local_catalog_urls()
    indexed_urls: List[str] = []
    indexed_details: List[Dict[str, Any]] = []

    if client:
        try:
            results = client.site_search(domain=domain, count=50)
            for r in results:
                u = r.get("url", "").rstrip("/")
                if u:
                    indexed_urls.append(u)
                    indexed_details.append({
                        "url": u,
                        "title": r.get("title", ""),
                        "description": r.get("description", ""),
                    })
        except Exception as e:
            print(f"⚠️ Erreur lors de l'appel à l'API Brave Search : {e}", file=sys.stderr)

    # Réconciliation
    indexed_set = {u.rstrip("/").lower() for u in indexed_urls}
    matched_local = []
    missing_local = []

    for item in local_urls:
        norm = item["url"].rstrip("/").lower()
        if norm in indexed_set or any(norm in u for u in indexed_set):
            matched_local.append(item)
        else:
            missing_local.append(item)

    coverage_pct = (len(matched_local) / len(local_urls) * 100) if local_urls else 0.0

    audit_result = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "domain": domain,
        "api_configured": client is not None,
        "total_local_urls": len(local_urls),
        "indexed_count": len(indexed_urls),
        "matched_local_count": len(matched_local),
        "missing_local_count": len(missing_local),
        "coverage_percent": round(coverage_pct, 1),
        "indexed_results": indexed_details,
        "missing_urls": [m["url"] for m in missing_local],
    }

    save_audit_cache(audit_result)
    return audit_result


def cmd_overview(client: Optional[BraveSearchClient], domain: str = DEFAULT_DOMAIN):
    """Affiche le tableau de bord Brave Search & Claude (GEO)."""
    print(f"\n=======================================================")
    print(f"🦁 TABLEAU DE BORD BRAVE SEARCH & CLAUDE (GEO) — {domain.upper()}")
    print(f"=======================================================\n")

    local_urls = get_local_catalog_urls()
    cached = load_cached_audit()
    
    if client:
        audit = run_full_indexation_audit(client, domain=domain)
    elif cached:
        audit = cached
    else:
        audit = {
            "api_configured": False,
            "total_local_urls": len(local_urls),
            "indexed_count": 0,
            "matched_local_count": 0,
            "missing_local_count": len(local_urls),
            "coverage_percent": 0.0,
            "missing_urls": [u["url"] for u in local_urls],
            "timestamp": "-",
        }

    api_status = "✅ Clé API Active (api.search.brave.com)" if client else "ℹ️ Mode Découverte (Sans Clé API)"
    last_audit_date = audit.get("timestamp", "-")
    if last_audit_date != "-" and "T" in last_audit_date:
        try:
            dt = datetime.fromisoformat(last_audit_date)
            last_audit_date = dt.strftime("%d/%m/%Y à %H:%M UTC")
        except Exception:
            pass

    overview_table = [
        ["Statut Connexion API", api_status],
        ["Index Web Moteur", "Index Indépendant Brave (100% découplé de Google/Bing)"],
        ["Couverture Claude / Anthropic", "Sourçage natif direct via API Brave Search"],
        ["Total URLs Catalogue pSEO", f"{len(local_urls)} URLs (Hubs, Modèles, Moteurs + /llms.txt)"],
        ["URLs Indexées dans Brave", f"{audit.get('indexed_count', 0)} page(s) détectée(s)"],
        ["Taux de Couverture Catalogue", f"{audit.get('coverage_percent', 0.0)}%"],
        ["Pages Locales Manquantes", f"{audit.get('missing_local_count', len(local_urls))} page(s) à indexer"],
        ["Dernière Analyse", last_audit_date],
    ]
    print(tabulate(overview_table, headers=["Indicateur", "Valeur"], tablefmt="rounded_outline"))

    # Résumé des priorités de soumission
    print("\n🎯 ACTIONS RECOMMANDÉES POUR AMORCER L'INDEXATION CLAUDE :")
    print("  1. Soumettre en priorité les 13 URLs phares et /llms.txt via :")
    print("     👉 `npm run brave:submit`")
    print("  2. Déclencher le passage du robot Bravebot via le Web Discovery Project (WDP) :")
    print("     👉 `npm run brave:wdp`")
    print("  3. Tester le positionnement réel sur vos requêtes cibles :")
    print("     👉 `npm run brave:queries`")

    if not client:
        print("\n💡 Astuce Configuration API :")
        print("   Pour activer l'audit direct en continu, renseignez votre clé gratuite (2 000 requêtes/mois) :")
        print("   `BRAVE_SEARCH_API_KEY=VOTRE_CLE` dans .env.local ou sur le dashboard :")
        print("   👉 https://api.search.brave.com/app/dashboard")


def cmd_audit(client: Optional[BraveSearchClient], domain: str = DEFAULT_DOMAIN):
    """Exécute un audit détaillé de chaque URL du catalogue."""
    print(f"\n📑 AUDIT DÉTAILLÉ DE L'INDEXATION BRAVE SEARCH ({domain}) :")
    audit = run_full_indexation_audit(client, domain=domain)
    local_urls = get_local_catalog_urls()
    missing_set = set(audit.get("missing_urls", []))

    rows = []
    for item in local_urls:
        is_missing = item["url"] in missing_set
        status = "❌ Non indexée" if is_missing else "✅ Indexée"
        rows.append([
            item["type"],
            item["label"][:35],
            item["url"].replace(DEFAULT_BASE_URL, "") or "/",
            status
        ])

    print(tabulate(rows, headers=["Type", "Fiche", "Chemin Relatif", "Statut Brave"], tablefmt="rounded_outline"))
    print(f"\n📊 Bilan : {audit['matched_local_count']}/{len(local_urls)} URLs indexées ({audit['coverage_percent']}%).")


def cmd_queries(client: Optional[BraveSearchClient], domain: str = DEFAULT_DOMAIN):
    """Teste les requêtes stratégiques du secteur automobile dans Brave Search."""
    print(f"\n🔍 TEST DE POSITIONNEMENT SUR LES REQUÊTES CIBLES (BRAVE SEARCH) :")

    if not client:
        print("❌ Cette commande nécessite une clé API Brave Search valide.")
        print("   Renseignez BRAVE_SEARCH_API_KEY dans votre fichier .env.local.")
        print("   Création de clé gratuite : https://api.search.brave.com/app/dashboard")
        sys.exit(1)

    rows = []
    ranked_count = 0

    for q in TARGET_QUERIES:
        try:
            res = client.test_query(q, target_domain=domain)
            if res["ranked"]:
                ranked_count += 1
                pos_str = f"🏆 Pos {res['rank']}"
            else:
                pos_str = "Hors top 20"
            
            rows.append([
                q,
                pos_str,
                (res["title"][:40] + "...") if res["title"] else "-",
                res["top_domain"][:25],
            ])
        except Exception as e:
            rows.append([q, f"Erreur ({e})", "-", "-"])

    print(tabulate(rows, headers=["Requête Testée", "Position LaVigieAuto", "Titre Trouvé", "1er Résultat Brave"], tablefmt="rounded_outline"))
    print(f"\n🎯 Présence : {ranked_count}/{len(TARGET_QUERIES)} requêtes positionnées dans le top 20 de Brave.")


def cmd_submit(domain: str = DEFAULT_DOMAIN):
    """Génère la file de soumission prioritaire avec liens directs et instructions."""
    priority_urls = [
        f"https://www.{domain}/",
        f"https://www.{domain}/entretien",
        f"https://www.{domain}/llms.txt",
        f"https://www.{domain}/entretien/peugeot",
        f"https://www.{domain}/entretien/dacia",
        f"https://www.{domain}/entretien/renault",
        f"https://www.{domain}/entretien/citroen",
        f"https://www.{domain}/entretien/volkswagen",
        f"https://www.{domain}/entretien/toyota",
        f"https://www.{domain}/entretien/peugeot/208-2/1-5-bluehdi-100",
        f"https://www.{domain}/entretien/dacia/sandero-3/1-0-eco-g-100",
        f"https://www.{domain}/entretien/renault/clio-4/0-9-tce-90",
        f"https://www.{domain}/entretien/suzuki/vitara/1-6-vvt-120",
    ]

    print(f"\n=======================================================")
    print(f"🚀 ASSISTANT DE SOUMISSION INSTANTANÉE — BRAVE SEARCH")
    print(f"=======================================================\n")
    print("Le formulaire officiel Brave Search (search.brave.com/submit-url) accepte les soumissions")
    print("unitaires sécurisées par un contrôle de validation navigateur.\n")

    print(f"📑 Top {len(priority_urls)} URLs Prioritaires à Soumettre :")
    rows = []
    for idx, u in enumerate(priority_urls, start=1):
        submit_link = f"https://search.brave.com/submit-url?url={urllib.parse.quote(u, safe='')}"
        rows.append([idx, u, submit_link])

    print(tabulate(rows, headers=["#", "URL LaVigieAuto", "Lien Direct de Soumission (Clic)"], tablefmt="rounded_outline"))

    print("\n📋 Bloc Prêt à Copier pour Soumission Manuelle :")
    print("-------------------------------------------------------")
    for u in priority_urls:
        print(u)
    print("-------------------------------------------------------")


def cmd_wdp(domain: str = DEFAULT_DOMAIN, auto_open: bool = False):
    """
    Accélérateur Web Discovery Project (WDP).
    Génère une page d'amorçage locale et propose l'ouverture dans Brave Browser.
    """
    local_urls = get_local_catalog_urls()
    html_output_path = DATA_DIR / "brave_wdp_launcher.html"
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    links_html = "".join(f'<li><a href="{item["url"]}" target="_blank" rel="noopener">{item["label"]} ({item["type"]})</a></li>\n' for item in local_urls)

    html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Accélérateur WDP Brave Search — LaVigieAuto</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1e293b; }}
    h1 {{ color: #ea580c; display: flex; align-items: center; gap: 10px; }}
    .badge {{ background: #fed7aa; color: #9a3412; padding: 4px 10px; border-radius: 9999px; font-size: 14px; font-weight: 600; }}
    .box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }}
    button {{ background: #ea580c; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; cursor: pointer; }}
    button:hover {{ background: #c2410c; }}
    ul {{ list-style-type: none; padding-left: 0; }}
    li {{ margin: 8px 0; padding: 6px 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; }}
    a {{ color: #2563eb; text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
  </style>
</head>
<body>
  <h1>🦁 Accélérateur WDP — LaVigieAuto <span class="badge">Web Discovery Project</span></h1>
  <div class="box">
    <p><strong>Principe :</strong> Le Web Discovery Project de Brave récolte anonymement les URLs visitées par les utilisateurs de Brave pour alimenter la file d'exploration de <strong>Bravebot</strong>.</p>
    <p>En ouvrant les pages ci-dessous depuis votre navigateur <strong>Brave</strong> (avec l'option WDP activée dans <code>brave://settings/privacy</code>), vous signalez automatiquement à Brave l'existence de chaque ressource pour indexation prioritaire.</p>
    <button onclick="openAllTabs()">🚀 Ouvrir un lot de 5 URLs clés dans de nouveaux onglets</button>
  </div>

  <h2>Catalogue ({len(local_urls)} URLs)</h2>
  <ul>
    {links_html}
  </ul>

  <script>
    const urls = {json.dumps([item["url"] for item in local_urls[:10]])};
    function openAllTabs() {{
      urls.forEach(u => window.open(u, '_blank'));
    }}
  </script>
</body>
</html>
"""
    html_output_path.write_text(html_content, encoding="utf-8")

    print(f"\n=======================================================")
    print(f"🦁 ACCÉLÉRATEUR WEB DISCOVERY PROJECT (WDP) — BRAVE")
    print(f"=======================================================")
    print(f"\n✅ Fichier d'amorçage WDP généré avec succès :")
    print(f"   file:///{html_output_path.resolve().as_posix()}\n")

    # Détection de l'exécutable Brave Browser sur Windows
    brave_paths = [
        Path(os.environ.get("PROGRAMFILES", "C:\\Program Files")) / "BraveSoftware" / "Brave-Browser" / "Application" / "brave.exe",
        Path(os.environ.get("PROGRAMFILES(X86)", "C:\\Program Files (x86)")) / "BraveSoftware" / "Brave-Browser" / "Application" / "brave.exe",
        Path(os.environ.get("LOCALAPPDATA", "")) / "BraveSoftware" / "Brave-Browser" / "Application" / "brave.exe",
    ]
    detected_brave = next((p for p in brave_paths if p.exists()), None)

    if detected_brave:
        print(f"🔍 Navigateur Brave détecté localement : {detected_brave}")
        if auto_open:
            import subprocess
            print("🚀 Lancement automatique de l'outil dans Brave...")
            subprocess.Popen([str(detected_brave), str(html_output_path.resolve())])
        else:
            print("💡 Vous pouvez l'ouvrir automatiquement en passant l'option `--open` :")
            print("   `python scripts/brave_analyzer.py --wdp --open`")
    else:
        print("ℹ️ Pour maximiser l'effet WDP, ouvrez ce fichier dans votre navigateur Brave :")
        print(f"   `{html_output_path.resolve()}`")


def get_brave_summary(api_key: Optional[str] = None, domain: str = DEFAULT_DOMAIN) -> Optional[Dict[str, Any]]:
    """
    Récupère une synthèse des métriques Brave Search pour inclusion dans les rapports hebdomadaires.
    Peut fonctionner via l'API directe ou s'appuyer sur le dernier audit en cache.
    """
    key = api_key or find_api_key()
    local_urls = get_local_catalog_urls()
    total_local = len(local_urls)

    if key:
        try:
            client = BraveSearchClient(api_key=key)
            audit = run_full_indexation_audit(client, domain=domain)
            return {
                "configured": True,
                "status_str": "Actif (API connectée)",
                "total_urls": total_local,
                "indexed_count": audit.get("indexed_count", 0),
                "matched_local": audit.get("matched_local_count", 0),
                "missing_count": audit.get("missing_local_count", total_local),
                "coverage_percent": audit.get("coverage_percent", 0.0),
                "last_audit": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
            }
        except Exception:
            pass

    cached = load_cached_audit()
    if cached:
        return {
            "configured": False,
            "status_str": "Actif (Audit en cache)",
            "total_urls": total_local,
            "indexed_count": cached.get("indexed_count", 0),
            "matched_local": cached.get("matched_local_count", 0),
            "missing_count": cached.get("missing_local_count", total_local),
            "coverage_percent": cached.get("coverage_percent", 0.0),
            "last_audit": cached.get("timestamp", "-")[:10],
        }

    return {
        "configured": False,
        "status_str": "En attente de soumission",
        "total_urls": total_local,
        "indexed_count": 0,
        "matched_local": 0,
        "missing_count": total_local,
        "coverage_percent": 0.0,
        "last_audit": "-",
    }


def main():
    parser = argparse.ArgumentParser(description="Brave Search & Claude (GEO) Analyzer pour LaVigieAuto")
    parser.add_argument("--overview", action="store_true", help="Afficher le tableau de bord général Brave Search")
    parser.add_argument("--audit", action="store_true", help="Vérifier le statut d'indexation détaillé de chaque URL")
    parser.add_argument("--queries", action="store_true", help="Tester le positionnement sur les requêtes automobiles")
    parser.add_argument("--submit", action="store_true", help="Générer les liens et priorités de soumission instantanée")
    parser.add_argument("--wdp", action="store_true", help="Générer l'accélérateur Web Discovery Project (WDP)")
    parser.add_argument("--open", action="store_true", help="Ouvrir automatiquement le launcher WDP dans Brave Browser")
    parser.add_argument("--api-key", type=str, default=None, help="Clé API Brave Search (facultatif si dans .env.local)")
    parser.add_argument("--domain", type=str, default=DEFAULT_DOMAIN, help="Domaine cible (défaut: lavigieauto.com)")

    args = parser.parse_args()

    api_key = args.api_key or find_api_key()
    client = BraveSearchClient(api_key=api_key) if api_key else None

    if args.audit:
        cmd_audit(client, domain=args.domain)
    elif args.queries:
        cmd_queries(client, domain=args.domain)
    elif args.submit:
        cmd_submit(domain=args.domain)
    elif args.wdp:
        cmd_wdp(domain=args.domain, auto_open=args.open)
    else:
        cmd_overview(client, domain=args.domain)


if __name__ == "__main__":
    main()
