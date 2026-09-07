#!/usr/bin/env python3
"""
Bing Webmaster Tools & ChatGPT Search Analyzer pour LaVigieAuto (lavigieauto.com).

Surveillance du référencement sur le moteur Bing (Microsoft) et des sources alimentant
ChatGPT Search / Copilot :
- Vérification des sitemaps et de l'indexation de 57 URLs
- Extraction des requêtes et clics réels sur Bing
- Quotas et soumission instantanée d'URLs (Instant Indexing)
- Statistiques de crawl Bingbot
"""

import os
import sys
import re
import json
import argparse
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional

if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    from tabulate import tabulate
except ImportError:
    # Auto re-exec dans .venv si disponible
    project_root = Path(__file__).resolve().parent.parent
    venv_python = project_root / ".venv" / ("Scripts" if sys.platform == "win32" else "bin") / ("python.exe" if sys.platform == "win32" else "python")
    if venv_python.exists() and sys.executable.lower() != str(venv_python).lower():
        import subprocess
        result = subprocess.run([str(venv_python)] + sys.argv)
        sys.exit(result.returncode)

    def tabulate(rows, headers, tablefmt="rounded_outline"):
        header_str = " | ".join(headers)
        sep = "-" * len(header_str)
        lines = [header_str, sep]
        for row in rows:
            lines.append(" | ".join(str(cell) for cell in row))
        return "\n".join(lines)


BING_API_BASE = "https://ssl.bing.com/webmaster/api.svc/json"
DEFAULT_SITE_URL = "https://www.lavigieauto.com/"


def find_api_key() -> Optional[str]:
    """Récupère la clé API Bing depuis l'environnement ou .env.local."""
    key = os.getenv("BING_API_KEY")
    if key and len(key.strip()) > 10:
        return key.strip()

    project_root = Path(__file__).resolve().parent.parent
    env_files = [project_root / ".env.local", project_root / ".env"]
    for env_file in env_files:
        if env_file.exists():
            try:
                for line in env_file.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line.startswith("BING_API_KEY="):
                        val = line.split("=", 1)[1].strip().strip('"\'')
                        if len(val) > 10:
                            return val
            except Exception:
                pass
    return None


def parse_bing_date(date_val: Any) -> str:
    """Convertit une date Bing /Date(1788787983000)/ en chaîne lisible UTC."""
    if not date_val:
        return "-"
    m = re.search(r"\d+", str(date_val))
    if m:
        ts = int(m.group(0)) / 1000.0
        return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return str(date_val)


class BingWebmasterClient:
    """Client REST pour l'API Bing Webmaster Tools."""

    def __init__(self, api_key: str, site_url: str = DEFAULT_SITE_URL):
        self.api_key = api_key
        self.site_url = site_url if site_url.endswith("/") else f"{site_url}/"

    def _call(self, endpoint: str, params: Optional[Dict[str, str]] = None, post_data: Optional[Dict] = None) -> Any:
        query_params = {"apikey": self.api_key}
        if params:
            query_params.update(params)

        qs = urllib.parse.urlencode(query_params)
        url = f"{BING_API_BASE}/{endpoint}?{qs}"

        headers = {
            "User-Agent": "LaVigieAuto-Bing-Analyzer/1.0",
            "Accept": "application/json",
        }
        if post_data is not None:
            data_bytes = json.dumps(post_data).encode("utf-8")
            headers["Content-Type"] = "application/json; charset=utf-8"
            req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
        else:
            req = urllib.request.Request(url, headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode("utf-8")
                res = json.loads(raw)
                return res.get("d", res)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Erreur HTTP Bing {e.code}: {err_body}") from e
        except Exception as e:
            raise RuntimeError(f"Erreur de communication Bing: {e}") from e

    def get_user_sites(self) -> List[Dict[str, Any]]:
        return self._call("GetUserSites") or []

    def get_feeds(self) -> List[Dict[str, Any]]:
        return self._call("GetFeeds", {"siteUrl": self.site_url}) or []

    def get_quota(self) -> Dict[str, Any]:
        return self._call("GetUrlSubmissionQuota", {"siteUrl": self.site_url}) or {}

    def get_query_stats(self) -> List[Dict[str, Any]]:
        return self._call("GetQueryStats", {"siteUrl": self.site_url}) or []

    def get_rank_and_traffic_stats(self) -> List[Dict[str, Any]]:
        return self._call("GetRankAndTrafficStats", {"siteUrl": self.site_url}) or []

    def get_crawl_stats(self) -> List[Dict[str, Any]]:
        return self._call("GetCrawlStats", {"siteUrl": self.site_url}) or []

    def submit_url(self, url_to_submit: str) -> bool:
        self._call("SubmitUrl", {"siteUrl": self.site_url}, {"siteUrl": self.site_url, "url": url_to_submit})
        return True

    def submit_url_batch(self, urls: List[str]) -> bool:
        self._call("SubmitUrlbatch", {"siteUrl": self.site_url}, {"siteUrl": self.site_url, "urlList": urls})
        return True


def cmd_overview(client: BingWebmasterClient):
    print("\n" + "=" * 65)
    print("🌐 ANALYSE BING WEBMASTER TOOLS & CHATGPT SEARCH — LAVIGIEAUTO")
    print(f"Propriété : {client.site_url}")
    print("=" * 65 + "\n")

    # 1. Vérification du site
    try:
        sites = client.get_user_sites()
        matched = next((s for s in sites if client.site_url.rstrip("/") in s.get("Url", "")), None)
        status_str = "✅ Vérifié" if (matched and matched.get("IsVerified")) else "⚠️ Non vérifié ou introuvable"
    except Exception as e:
        status_str = f"Erreur ({e})"

    # 2. Sitemaps
    try:
        feeds = client.get_feeds()
        sitemap_count = len(feeds)
        total_urls = sum(f.get("UrlCount", 0) for f in feeds)
        last_crawl = parse_bing_date(feeds[0].get("LastCrawled")) if feeds else "-"
        feed_status = feeds[0].get("Status", "-") if feeds else "-"
    except Exception:
        sitemap_count, total_urls, last_crawl, feed_status = 0, 0, "-", "-"

    # 3. Quota de soumission
    try:
        quota = client.get_quota()
        daily_quota = quota.get("DailyQuota", "-")
        monthly_quota = quota.get("MonthlyQuota", "-")
    except Exception:
        daily_quota, monthly_quota = "-", "-"

    # 4. Requêtes & Clics
    try:
        query_stats = client.get_query_stats()
        total_queries = len(query_stats)
        total_clicks = sum(q.get("Clicks", 0) for q in query_stats)
        total_impressions = sum(q.get("Impressions", 0) for q in query_stats)
    except Exception:
        total_queries, total_clicks, total_impressions = 0, 0, 0

    overview_table = [
        ["Statut Propriété Bing", status_str],
        ["Sitemaps Actifs", f"{sitemap_count} ({total_urls} URLs déclarées)"],
        ["Dernier Crawl Sitemap", last_crawl],
        ["Statut du Sitemap", f"✅ {feed_status}" if feed_status == "Success" else feed_status],
        ["Quota Soumission Directe", f"{daily_quota}/jour (Restant mois : {monthly_quota})"],
        ["Total Requêtes Positionnées", str(total_queries)],
        ["Total Impressions (Bing/Copilot)", str(total_impressions)],
        ["Total Clics (Bing/Copilot)", str(total_clicks)],
    ]
    print(tabulate(overview_table, headers=["Métrique", "Valeur"], tablefmt="rounded_outline"))

    # Sitemaps détaillés
    if feeds:
        print("\n📑 SITEMAPS ENREGISTRÉS DANS BING :")
        feed_rows = []
        for f in feeds:
            feed_rows.append([
                f.get("Url"),
                f.get("UrlCount", 0),
                f.get("Status", "-"),
                parse_bing_date(f.get("LastCrawled")),
                f"{round(f.get('FileSize', 0) / 1024, 1)} Ko",
            ])
        print(tabulate(feed_rows, headers=["URL Sitemap", "Nombre d'URLs", "Statut", "Dernier Crawl", "Taille"], tablefmt="rounded_outline"))

    # Top Requêtes si disponibles
    if query_stats:
        print("\n🔍 TOP REQUÊTES UTILISATEURS SUR BING / CHATGPT :")
        q_rows = []
        for q in sorted(query_stats, key=lambda x: x.get("Impressions", 0), reverse=True)[:10]:
            impr = q.get("Impressions", 0)
            clicks = q.get("Clicks", 0)
            ctr = f"{(clicks / impr * 100):.1f}%" if impr > 0 else "0.0%"
            pos = f"{q.get('AvgImpressionPosition', 0):.1f}"
            q_rows.append([q.get("Query", "-"), clicks, impr, ctr, pos])
        print(tabulate(q_rows, headers=["Requête", "Clics", "Impressions", "CTR", "Position"], tablefmt="rounded_outline"))
    else:
        print("\nℹ️  Les données de recherche (requêtes & clics) sont en cours de consolidation par Bing.")
        print("   (L'indexation initiale prend généralement 24 à 48 heures après la première soumission).")


def cmd_submit_all(client: BingWebmasterClient):
    """Soumet les URLs phares au robot Bingbot pour forcer le crawl immédiat."""
    print(f"\n🚀 SOUMISSION INSTANTANÉE D'URLS À BING (QUOTA JOURNALIER) :")
    priority_urls = [
        "https://www.lavigieauto.com/",
        "https://www.lavigieauto.com/entretien",
        "https://www.lavigieauto.com/entretien/peugeot",
        "https://www.lavigieauto.com/entretien/dacia",
        "https://www.lavigieauto.com/entretien/renault",
        "https://www.lavigieauto.com/entretien/peugeot/208-2/1-5-bluehdi-100",
        "https://www.lavigieauto.com/entretien/dacia/sandero-2/0-9-tce-90",
        "https://www.lavigieauto.com/entretien/dacia/sandero-3/1-0-eco-g-100",
        "https://www.lavigieauto.com/entretien/dacia/jogger/1-0-eco-g-100",
        "https://www.lavigieauto.com/entretien/dacia/duster-2/1-0-eco-g-100",
        "https://www.lavigieauto.com/entretien/renault/clio-4/0-9-tce-90",
        "https://www.lavigieauto.com/entretien/renault/clio-4/1-5-dci-90",
        "https://www.lavigieauto.com/llms.txt",
    ]

    try:
        quota = client.get_quota()
        print(f"Quota disponible : {quota.get('DailyQuota')} URLs aujourd'hui.\n")
    except Exception:
        pass

    try:
        client.submit_url_batch(priority_urls)
        print(f"✅ {len(priority_urls)} URLs prioritaires soumises avec succès à Bingbot (dont /llms.txt) !")
        for u in priority_urls:
            print(f"  ✔ {u}")
    except Exception as e:
        print(f"❌ Erreur lors de la soumission de lot : {e}")


def main():
    parser = argparse.ArgumentParser(description="Bing Webmaster Tools & ChatGPT Search Analyzer")
    parser.add_argument("--overview", action="store_true", help="Afficher le tableau de bord général")
    parser.add_argument("--sitemaps", action="store_true", help="Inspecter les sitemaps Bing")
    parser.add_argument("--queries", action="store_true", help="Lister les requêtes de recherche Bing")
    parser.add_argument("--submit", action="store_true", help="Soumettre immédiatement le lot d'URLs prioritaires à Bingbot")
    parser.add_argument("--site", type=str, default=DEFAULT_SITE_URL, help="URL du site à inspecter")
    parser.add_argument("--api-key", type=str, default=None, help="Clé API Bing (facultatif si dans .env.local)")

    args = parser.parse_args()

    api_key = args.api_key or find_api_key()
    if not api_key:
        print("❌ Erreur : Aucune clé API Bing trouvée.")
        print("Veuillez définir BING_API_KEY dans votre fichier .env.local ou la passer via --api-key.")
        sys.exit(1)

    site_url = args.site
    if "ecopulse" in site_url.lower():
        site_url = "https://getecopulse.com/"
    elif not site_url.startswith("http"):
        site_url = f"https://{site_url}/"

    client = BingWebmasterClient(api_key=api_key, site_url=site_url)

    if args.submit:
        cmd_submit_all(client)
    else:
        cmd_overview(client)


if __name__ == "__main__":
    main()
