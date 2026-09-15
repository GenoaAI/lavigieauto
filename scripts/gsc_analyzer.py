#!/usr/bin/env python3
"""
Google Search Console Analyzer pour LaVigieAuto (lavigieauto.com).

Surveillance de l'indexation pSEO (54 pages du catalogue d'entretien),
extraction des performances réelles (impressions, clics, CTR, positions)
et détection algorithmique des opportunités de croissance SEO.
"""

import os
import sys
import json
import html
import argparse
from datetime import datetime, timedelta, timezone
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

# Chargement transparent de .env.local et .env si présents à la racine du projet
project_root = Path(__file__).resolve().parent.parent
for env_filename in [".env.local", ".env"]:
    env_file = project_root / env_filename
    if env_file.exists():
        try:
            with open(env_file, "r", encoding="utf-8") as _f:
                for _line in _f:
                    _line = _line.strip()
                    if _line and not _line.startswith("#") and "=" in _line:
                        _k, _v = _line.split("=", 1)
                        _k, _v = _k.strip(), _v.strip().strip("'\"")
                        if _k and _k not in os.environ:
                            os.environ[_k] = _v
        except Exception:
            pass

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    from tabulate import tabulate
    import requests
except ImportError:
    # Auto re-exec dans .venv si disponible
    venv_python = project_root / ".venv" / ("Scripts" if sys.platform == "win32" else "bin") / ("python.exe" if sys.platform == "win32" else "python")
    if venv_python.exists() and sys.executable.lower() != str(venv_python).lower():
        import subprocess
        result = subprocess.run([str(venv_python)] + sys.argv)
        sys.exit(result.returncode)

    print("❌ Erreur de dépendance : bibliothèques Google Search Console manquantes.")
    print("Veuillez installer les dépendances via :")
    print("  .venv\\Scripts\\pip install -r requirements.txt")
    sys.exit(1)

# Constantes du projet
DEFAULT_CREDENTIALS_PATHS = [
    "gsc-credentials.json",
    "credentials.json",
    os.getenv("GSC_SERVICE_ACCOUNT_KEY_PATH", ""),
]
GSC_SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
BASE_URL_PRODUCTION = "https://www.lavigieauto.com"
FALLBACK_BASE_URL = "https://lavigieauto.com"
MAINTENANCE_DATA_DIR = Path(__file__).resolve().parent.parent / "src" / "data" / "maintenance"


def find_credentials_file() -> Optional[str]:
    """Recherche le fichier de credentials JSON du Service Account."""
    project_root = Path(__file__).resolve().parent.parent

    # 1. Vérifier si une variable d'environnement contient le chemin
    env_path = os.getenv("GSC_SERVICE_ACCOUNT_KEY_PATH")
    if env_path:
        p = Path(env_path)
        if not p.is_absolute():
            p = project_root / p
        if p.exists():
            return str(p)

    # 2. Vérifier les chemins par défaut à la racine du projet
    for default_path in DEFAULT_CREDENTIALS_PATHS:
        if not default_path:
            continue
        p = Path(default_path)
        if not p.is_absolute():
            p = project_root / p
        if p.exists():
            return str(p)

    return None


def get_gsc_service(credentials_path: Optional[str] = None):
    """Initialise le client API Google Search Console avec le Service Account."""
    if not credentials_path:
        credentials_path = find_credentials_file()

    # Support de la variable d'environnement JSON brute (ex: Vercel / CI)
    raw_json = os.getenv("GSC_SERVICE_ACCOUNT_JSON")
    if raw_json:
        try:
            info = json.loads(raw_json)
            creds = service_account.Credentials.from_service_account_info(
                info, scopes=GSC_SCOPES
            )
            return build("searchconsole", "v1", credentials=creds)
        except Exception as e:
            print(f"⚠️ Erreur lors du chargement de GSC_SERVICE_ACCOUNT_JSON : {e}")

    if not credentials_path or not os.path.exists(credentials_path):
        print("\n" + "=" * 70)
        print("❌ FICHIER DE CLÉ GOOGLE SEARCH CONSOLE INTROUVABLE")
        print("=" * 70)
        print("Pour autoriser l'accès en lecture seule à LaVigieAuto :")
        print("1. Rendez-vous sur Google Cloud Console (https://console.cloud.google.com/)")
        print("2. Dans 'IAM & Administration' > 'Comptes de service', créez une clé JSON.")
        print("3. Placez le fichier téléchargé sous le nom 'gsc-credentials.json' à la racine du projet.")
        print("4. Ajoutez l'adresse email du compte de service dans Google Search Console")
        print("   (Paramètres > Utilisateurs et autorisations > Rôle: Lecture).")
        print("=" * 70 + "\n")
        sys.exit(1)

    try:
        creds = service_account.Credentials.from_service_account_file(
            credentials_path, scopes=GSC_SCOPES
        )
        return build("searchconsole", "v1", credentials=creds)
    except Exception as e:
        print(f"❌ Erreur d'authentification Google Search Console : {e}")
        sys.exit(1)


def discover_site_property(service, requested_site: Optional[str] = None) -> str:
    """Détecte la propriété Google Search Console associée au compte."""
    try:
        sites_res = service.sites().list().execute()
        site_entries = sites_res.get("siteEntry", [])
    except HttpError as e:
        print(f"❌ Erreur lors de la récupération des propriétés : {e}")
        site_entries = []

    if requested_site:
        return requested_site

    env_site = os.getenv("GSC_SITE_URL")
    if env_site:
        return env_site

    if not site_entries:
        # Lire l'email du compte de service pour guider l'utilisateur
        creds_path = find_credentials_file()
        email = "votre-compte-de-service"
        if creds_path:
            try:
                with open(creds_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    email = data.get("client_email", email)
            except Exception:
                pass

        print("\n" + "=" * 70)
        print("⚠️ AUCUNE PROPRIÉTÉ TROUVÉE DANS GOOGLE SEARCH CONSOLE")
        print("=" * 70)
        print(f"Le compte de service suivant n'a accès à aucun site :")
        print(f"👉 \033[1m{email}\033[0m\n")
        print("Pour débloquer l'accès :")
        print("1. Ouvrez Google Search Console : https://search.google.com/search-console")
        print("2. Sélectionnez la propriété 'lavigieauto.com' (ou https://lavigieauto.com/)")
        print("3. Allez dans Paramètres ⚙️ > Utilisateurs et autorisations")
        print(f"4. Cliquez sur 'Ajouter un utilisateur', collez :\n   {email}")
        print("5. Définissez l'autorisation sur : 'Lecture' et validez.")
        print("=" * 70 + "\n")
        sys.exit(1)

    # Recherche prioritaire : domaine lavigieauto ou www.lavigieauto.com
    priorities = [
        "sc-domain:lavigieauto.com",
        "https://www.lavigieauto.com/",
        "https://lavigieauto.com/",
        "https://www.lavigieauto.com",
        "https://lavigieauto.com",
    ]
    for p in priorities:
        for s in site_entries:
            if s.get("siteUrl", "").rstrip("/") == p.rstrip("/"):
                return s.get("siteUrl")

    # Si non trouvé dans les priorités, prendre le premier disponible
    chosen = site_entries[0].get("siteUrl")
    print(f"ℹ️ Propriété auto-détectée : {chosen}")
    return chosen


def load_sitemap_urls(base_url: str = BASE_URL_PRODUCTION) -> List[Dict[str, str]]:
    """Génère la liste complète des 54 URLs canoniques pSEO du catalogue LaVigieAuto."""
    urls: List[Dict[str, str]] = []

    # 1. Racine & Hub
    urls.append({"type": "root", "url": base_url, "label": "Accueil"})
    urls.append({"type": "hub", "url": f"{base_url}/entretien", "label": "Hub Entretien"})

    if not MAINTENANCE_DATA_DIR.exists():
        return urls

    brands = set()
    models = set()
    leaf_pages = []

    for f in sorted(MAINTENANCE_DATA_DIR.glob("*.json")):
        try:
            with open(f, "r", encoding="utf-8") as json_file:
                data = json.load(json_file)
                b = data.get("brandSlug", "").strip().lower()
                m = data.get("modelSlug", "").strip().lower()
                e = data.get("engineSlug", "").strip().lower()
                brand_name = data.get("brand", b.capitalize())
                model_name = data.get("model", m.capitalize())
                engine_name = data.get("engine", e)

                if b:
                    brands.add((b, brand_name))
                if b and m:
                    models.add((b, m, f"{brand_name} {model_name}"))
                if b and m and e:
                    leaf_pages.append({
                        "brandSlug": b,
                        "modelSlug": m,
                        "engineSlug": e,
                        "label": f"{brand_name} {model_name} {engine_name}",
                        "url": f"{base_url}/entretien/{b}/{m}/{e}"
                    })
        except Exception:
            continue

    # 2. Hubs marques (6 marques)
    for b_slug, b_name in sorted(brands):
        urls.append({
            "type": "brand",
            "url": f"{base_url}/entretien/{b_slug}",
            "label": f"Hub {b_name}"
        })

    # 3. Hubs modèles (16 modèles)
    for b_slug, m_slug, m_label in sorted(models):
        urls.append({
            "type": "model",
            "url": f"{base_url}/entretien/{b_slug}/{m_slug}",
            "label": f"Modèle {m_label}"
        })

    # 4. Fiches moteurs (30 fiches)
    for item in leaf_pages:
        urls.append({
            "type": "leaf",
            "url": item["url"],
            "label": item["label"]
        })

    return urls


def inspect_url_indexation(service, site_url: str, inspection_url: str) -> Dict[str, Any]:
    """Interroge la Google URL Inspection API pour une URL donnée."""
    try:
        req = {
            "inspectionUrl": inspection_url,
            "siteUrl": site_url,
            "languageCode": "fr-FR",
        }
        res = service.urlInspection().index().inspect(body=req).execute()
        result = res.get("inspectionResult", {})
        index_status = result.get("indexStatusResult", {})

        return {
            "url": inspection_url,
            "verdict": index_status.get("verdict", "UNKNOWN"),
            "coverageState": index_status.get("coverageState", "N/A"),
            "indexingState": index_status.get("indexingState", "N/A"),
            "lastCrawlTime": index_status.get("lastCrawlTime", "Jamais"),
            "googleCanonical": index_status.get("googleCanonical", "N/A"),
            "userCanonical": index_status.get("userCanonical", "N/A"),
            "pageFetchState": index_status.get("pageFetchState", "N/A"),
            "robotsTxtState": index_status.get("robotsTxtState", "N/A"),
        }
    except HttpError as e:
        return {
            "url": inspection_url,
            "verdict": "ERROR",
            "coverageState": f"HTTP {e.resp.status}: {e._get_reason()}",
            "indexingState": "ERROR",
            "lastCrawlTime": "N/A",
        }
    except Exception as e:
        return {
            "url": inspection_url,
            "verdict": "ERROR",
            "coverageState": str(e),
            "indexingState": "ERROR",
            "lastCrawlTime": "N/A",
        }


def get_search_analytics(
    service,
    site_url: str,
    days: int = 28,
    dimensions: Optional[List[str]] = None,
    row_limit: int = 1000,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Récupère les métriques de recherche depuis la Search Analytics API."""
    if dimensions is None:
        dimensions = ["page"]

    if end_date is None:
        end_dt = datetime.now(timezone.utc) - timedelta(days=2)  # Décalage standard GSC (J-2)
        end_str = end_dt.strftime("%Y-%m-%d")
    else:
        end_str = end_date
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    if start_date is None:
        start_str = (end_dt - timedelta(days=days)).strftime("%Y-%m-%d")
    else:
        start_str = start_date

    req = {
        "startDate": start_str,
        "endDate": end_str,
        "dimensions": dimensions,
        "rowLimit": row_limit,
    }

    try:
        res = service.searchanalytics().query(siteUrl=site_url, body=req).execute()
        rows = res.get("rows", [])
        return rows
    except HttpError as e:
        if e.resp.status == 403:
            creds_path = find_credentials_file()
            email = "analyste-lavigieauto@lavigieauto.iam.gserviceaccount.com"
            print("\n" + "=" * 70)
            print("🚫 ACCÈS REFUSÉ (403 FORBIDDEN)")
            print("=" * 70)
            print(f"Le compte de service n'a pas les droits sur la propriété : {site_url}")
            print(f"👉 Email : {email}\n")
            print("Action requise dans Google Search Console :")
            print("1. Ouvrez https://search.google.com/search-console")
            print(f"2. Sélectionnez la propriété : {site_url}")
            print("3. Allez dans Paramètres ⚙️ > Utilisateurs et autorisations")
            print(f"4. Cliquez sur 'Ajouter un utilisateur' et ajoutez : {email}")
            print("5. Définissez le rôle sur 'Lecture' et enregistrez.")
            print("=" * 70 + "\n")
            sys.exit(1)
        print(f"❌ Erreur Search Analytics : {e}")
        return []


def analyze_brands(rows_by_page: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Ventile la performance de recherche par marque automobile."""
    brands = ["renault", "peugeot", "citroen", "dacia", "volkswagen", "toyota"]
    stats = {b: {"brand": b.capitalize(), "clicks": 0, "impressions": 0, "pages": set()} for b in brands}
    stats["autre"] = {"brand": "Autres / Global", "clicks": 0, "impressions": 0, "pages": set()}

    for r in rows_by_page:
        page = r.get("keys", [""])[0].lower()
        clicks = r.get("clicks", 0)
        impressions = r.get("impressions", 0)

        matched = False
        for b in brands:
            if f"/entretien/{b}" in page:
                stats[b]["clicks"] += clicks
                stats[b]["impressions"] += impressions
                stats[b]["pages"].add(page)
                matched = True
                break

        if not matched:
            stats["autre"]["clicks"] += clicks
            stats["autre"]["impressions"] += impressions
            stats["autre"]["pages"].add(page)

    result = []
    for k, v in stats.items():
        imp = v["impressions"]
        clk = v["clicks"]
        ctr = (clk / imp * 100) if imp > 0 else 0.0
        result.append({
            "brand": v["brand"],
            "clicks": clk,
            "impressions": imp,
            "ctr": f"{ctr:.2f}%",
            "page_count": len(v["pages"]),
        })

    return sorted(result, key=lambda x: x["impressions"], reverse=True)


def analyze_opportunities(
    query_rows: List[Dict[str, Any]],
    page_rows: List[Dict[str, Any]],
    days: int = 28
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Détecte les opportunités SEO prioritaires :
    1. Striking Distance (positions 4 à 15 avec fort potentiel de top 3).
    2. CTR Sub-optimal (fortes impressions mais CTR faible, titre à retravailler).
    3. Moteurs à forte vulnérabilité & requêtes sensibles (PureTech, BlueHDi, TCe, GPL, Courroie).
    """
    striking_distance = []
    ctr_opportunities = []
    engine_vulnerabilities = []

    # Seuils adaptés selon la granularité temporelle (7 jours vs 28 jours)
    min_query_impressions = 1 if days <= 7 else 3
    min_page_impressions = 10 if days <= 7 else 20

    # 1. Striking Distance Queries
    for r in query_rows:
        query = r.get("keys", [""])[0]
        clicks = r.get("clicks", 0)
        impressions = r.get("impressions", 0)
        ctr = r.get("ctr", 0.0) * 100
        position = r.get("position", 0.0)

        if 4.0 <= position <= 15.0 and impressions >= min_query_impressions:
            striking_distance.append({
                "query": query,
                "position": f"{position:.1f}",
                "position_float": position,
                "impressions": impressions,
                "clicks": clicks,
                "ctr": f"{ctr:.2f}%",
            })

        # Moteurs à risque / requêtes sensibles
        q_lower = query.lower()
        if any(w in q_lower for w in ["puretech", "courroie", "chaine", "bluehdi", "tce", "gpl"]):
            engine_vulnerabilities.append({
                "query": query,
                "position": f"{position:.1f}",
                "impressions": impressions,
                "clicks": clicks,
                "ctr": f"{ctr:.2f}%",
            })

    # Trier la striking distance par proximité au Top 3 (position croissante)
    striking_distance = sorted(striking_distance, key=lambda x: x.get("position_float", 99.0))
    # Trier les vulnérabilités mécaniques par volume d'impressions décroissant
    engine_vulnerabilities = sorted(engine_vulnerabilities, key=lambda x: x.get("impressions", 0), reverse=True)

    # 2. Pages avec fort volume mais CTR < 3%
    for r in page_rows:
        page = r.get("keys", [""])[0]
        clicks = r.get("clicks", 0)
        impressions = r.get("impressions", 0)
        ctr = r.get("ctr", 0.0) * 100
        position = r.get("position", 0.0)

        if impressions >= min_page_impressions and ctr < 3.0:
            short_url = page.replace(BASE_URL_PRODUCTION, "").replace(FALLBACK_BASE_URL, "")
            ctr_opportunities.append({
                "page": short_url or "/",
                "impressions": impressions,
                "clicks": clicks,
                "ctr": f"{ctr:.2f}%",
                "position": f"{position:.1f}",
            })

    striking_distance = sorted(striking_distance, key=lambda x: x["impressions"], reverse=True)[:15]
    ctr_opportunities = sorted(ctr_opportunities, key=lambda x: x["impressions"], reverse=True)[:15]
    engine_vulnerabilities = sorted(engine_vulnerabilities, key=lambda x: x["impressions"], reverse=True)[:15]

    return {
        "striking_distance": striking_distance,
        "ctr_opportunities": ctr_opportunities,
        "engine_vulnerabilities": engine_vulnerabilities,
    }


def compute_weekly_synthesis(
    service,
    site_url: str,
    days: int = 7,
    curr_page_rows: Optional[List[Dict[str, Any]]] = None,
    bing_summary: Optional[Dict[str, Any]] = None,
    brave_summary: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """Calcule la progression semaine sur semaine (S vs S-1) et génère la synthèse Executive (Option A)."""
    try:
        end_curr = datetime.now(timezone.utc) - timedelta(days=2)
        start_curr = end_curr - timedelta(days=days)
        end_prev = start_curr
        start_prev = end_prev - timedelta(days=days)

        if curr_page_rows is None:
            curr_page_rows = get_search_analytics(
                service, site_url,
                start_date=start_curr.strftime("%Y-%m-%d"),
                end_date=end_curr.strftime("%Y-%m-%d"),
                dimensions=["page"],
                row_limit=500
            )

        prev_page_rows = get_search_analytics(
            service, site_url,
            start_date=start_prev.strftime("%Y-%m-%d"),
            end_date=end_prev.strftime("%Y-%m-%d"),
            dimensions=["page"],
            row_limit=500
        )

        curr_clicks = sum(r.get("clicks", 0) for r in curr_page_rows)
        curr_imp = sum(r.get("impressions", 0) for r in curr_page_rows)
        curr_pos = (
            sum(r.get("position", 0) * r.get("impressions", 0) for r in curr_page_rows) / curr_imp
            if curr_imp > 0 else 0.0
        )

        prev_clicks = sum(r.get("clicks", 0) for r in prev_page_rows)
        prev_imp = sum(r.get("impressions", 0) for r in prev_page_rows)
        prev_pos = (
            sum(r.get("position", 0) * r.get("impressions", 0) for r in prev_page_rows) / prev_imp
            if prev_imp > 0 else 0.0
        )

        # Calcul des Deltas (S vs S-1)
        if prev_imp > 0:
            delta_imp_pct = ((curr_imp - prev_imp) / prev_imp) * 100.0
        else:
            delta_imp_pct = 100.0 if curr_imp > 0 else 0.0

        delta_clicks = curr_clicks - prev_clicks
        delta_pos = (prev_pos - curr_pos) if (prev_pos > 0 and curr_pos > 0) else 0.0

        # Attribution du qualificatif et du badge
        if delta_imp_pct >= 20.0 or (prev_clicks > 0 and (delta_clicks / prev_clicks) >= 0.25):
            badge_emoji = "🚀"
            sign = "+" if delta_imp_pct > 0 else ""
            badge_title = f"Forte accélération ({sign}{delta_imp_pct:.0f}% d'impressions)"
        elif delta_imp_pct >= 5.0:
            badge_emoji = "🟢"
            badge_title = f"Progression continue (+{delta_imp_pct:.0f}% d'impressions)"
        elif delta_pos >= 1.0:
            badge_emoji = "🟢"
            badge_title = f"Progression saine (+{delta_pos:.1f} rangs pos. moy.)"
        elif delta_clicks > 0:
            badge_emoji = "🟢"
            badge_title = f"Progression positive (+{delta_clicks} clics)"
        elif delta_imp_pct >= -5.0:
            badge_emoji = "🟡"
            sign = "+" if delta_imp_pct > 0 else ""
            badge_title = f"Consolidation stable ({sign}{delta_imp_pct:.0f}% d'impressions)"
        elif delta_imp_pct >= -15.0:
            badge_emoji = "🟠"
            badge_title = f"Léger tassement ({delta_imp_pct:.0f}% d'impressions)"
        else:
            badge_emoji = "🔴"
            badge_title = f"Vigilance / repli ({delta_imp_pct:.0f}% d'impressions)"

        # Formulation du volet SEO Google
        if delta_pos >= 0.5:
            seo_part = f"La visibilité organique Google s'accentue avec un gain de +{delta_pos:.1f} rangs en position moyenne ({curr_pos:.1f})"
        elif delta_pos <= -0.5:
            seo_part = f"La visibilité organique Google temporise en position moyenne ({curr_pos:.1f}, {delta_pos:.1f} rangs) mais consolide {curr_imp:,} impressions"
        else:
            seo_part = f"La visibilité organique Google reste stable en position moyenne ({curr_pos:.1f}) avec {curr_imp:,} impressions"

        if delta_clicks > 0:
            seo_part += f" et {curr_clicks} clics (+{delta_clicks} vs S-1)"
        elif delta_clicks < 0:
            seo_part += f" et {curr_clicks} clics ({delta_clicks} vs S-1)"
        else:
            seo_part += f" et {curr_clicks} clics"

        # Formulation du volet GEO (Moteurs IA)
        cov = brave_summary.get("coverage_percent", 0.0) if brave_summary else 0.0
        if cov >= 80.0:
            geo_part = f"la découvrabilité GEO reste optimale avec {cov:.0f}% du catalogue indexé pour les moteurs IA (Claude & ChatGPT)."
        elif cov > 0:
            geo_part = f"la présence GEO progresse avec {cov:.0f}% du catalogue indexé sur Brave Search / Claude et un crawl actif sur Bing / ChatGPT."
        elif bing_summary and bing_summary.get("feed_status") == "Success":
            geo_part = f"la découvrabilité GEO est active via Bing / ChatGPT ({bing_summary.get('urls_count', 0)} URLs sitemap) et le point d'entrée structuré /llms.txt."
        else:
            geo_part = "la couverture GEO s'appuie sur le catalogue structuré et le point d'entrée dédié /llms.txt."

        discord_value = f"{seo_part}, tandis que {geo_part}"
        telegram_html = (
            f"🎯 <b>Synthèse Hebdo (S vs S-1) :</b> {badge_emoji} <b>{html.escape(badge_title)}</b>\n"
            f"{html.escape(seo_part)}, tandis que {html.escape(geo_part)}"
        )
        cli_summary = f"🎯 Synthèse Hebdo : {badge_emoji} {badge_title} | {seo_part}, tandis que {geo_part}"

        return {
            "badge_emoji": badge_emoji,
            "badge_title": badge_title,
            "badge": f"{badge_emoji} {badge_title}",
            "seo_part": seo_part,
            "geo_part": geo_part,
            "discord_value": discord_value,
            "telegram_html": telegram_html,
            "cli_summary": cli_summary,
            "curr_imp": curr_imp,
            "prev_imp": prev_imp,
            "delta_imp_pct": delta_imp_pct,
            "curr_clicks": curr_clicks,
            "prev_clicks": prev_clicks,
            "delta_clicks": delta_clicks,
            "curr_pos": curr_pos,
            "prev_pos": prev_pos,
            "delta_pos": delta_pos,
        }
    except Exception as e:
        print(f"⚠️ Erreur lors du calcul de la synthèse hebdomadaire : {e}")
        return None


def get_supabase_funnel_metrics(
    days: int = 7,
    gsc_clicks: int = 0,
    supabase_url: Optional[str] = None,
    service_role_key: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Récupère les métriques de l'Entonnoir de Conversion (Full Funnel) depuis l'API REST PostgREST Supabase.

    Interroge les tables réelles :
    - public.foyers : Nouveaux foyers créés et attribution SEO (metadata->acquisition->>source = 'seo_pseo')
    - public.vehicules : Nouveaux véhicules rattachés
    - public.micro_conversions : Téléchargements PDF, dépôts Dropzone OCR (avec tolérance 404 si non migrée)

    Calcule le taux de conversion global : (nouveaux_foyers / gsc_clicks) * 100.
    """
    if supabase_url is not None:
        url_base = supabase_url
    else:
        url_base = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")

    if service_role_key is not None:
        service_key = service_role_key
    else:
        service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")

    if not url_base or not service_key:
        return None

    url_base = url_base.rstrip("/")
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }

    cutoff_dt = datetime.now(timezone.utc) - timedelta(days=days)
    start_iso = cutoff_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    new_foyers = 0
    seo_attributed_foyers = 0
    try:
        r_foyers = requests.get(
            f"{url_base}/rest/v1/foyers",
            headers=headers,
            params={"select": "id,nom,created_at,metadata", "created_at": f"gte.{start_iso}"},
            timeout=10,
        )
        if r_foyers.ok:
            foyers_data = r_foyers.json()
            new_foyers = len(foyers_data)
            for f in foyers_data:
                meta = f.get("metadata") or {}
                if isinstance(meta, dict):
                    if meta.get("source") == "seo_pseo" or meta.get("lead_source") == "seo_pseo":
                        seo_attributed_foyers += 1
                    elif isinstance(meta.get("acquisition"), dict) and meta["acquisition"].get("source") == "seo_pseo":
                        seo_attributed_foyers += 1
    except Exception as e:
        print(f"⚠️ Erreur lors de la requête foyers Supabase : {e}")

    new_vehicles = 0
    try:
        r_vehs = requests.get(
            f"{url_base}/rest/v1/vehicules",
            headers=headers,
            params={"select": "id,created_at,foyer_id", "created_at": f"gte.{start_iso}"},
            timeout=10,
        )
        if r_vehs.ok:
            vehs_data = r_vehs.json()
            new_vehicles = len(vehs_data)
    except Exception as e:
        print(f"⚠️ Erreur lors de la requête vehicules Supabase : {e}")

    micro_count = 0
    pdf_count = 0
    dropzone_count = 0
    lead_magnet_count = 0
    try:
        r_micro = requests.get(
            f"{url_base}/rest/v1/micro_conversions",
            headers=headers,
            params={"select": "id,event_type,created_at", "created_at": f"gte.{start_iso}"},
            timeout=10,
        )
        if r_micro.status_code == 404:
            # Table non encore migrée dans le cache PostgREST -> Résilience totale
            micro_count = 0
        elif r_micro.ok:
            micro_data = r_micro.json()
            micro_count = len(micro_data)
            for m in micro_data:
                etype = (m.get("event_type") or "").lower()
                if "pdf" in etype or "print" in etype:
                    pdf_count += 1
                elif "dropzone" in etype or "upload" in etype or "ocr" in etype:
                    dropzone_count += 1
                elif "lead_magnet" in etype:
                    lead_magnet_count += 1
    except Exception as e:
        micro_count = 0

    conversion_rate = (new_foyers / gsc_clicks * 100) if gsc_clicks > 0 else 0.0
    micro_rate = (micro_count / gsc_clicks * 100) if gsc_clicks > 0 else 0.0
    closing_rate = (new_foyers / micro_count * 100) if micro_count > 0 else 0.0

    return {
        "available": True,
        "days": days,
        "cutoff_date": start_iso,
        "gsc_clicks": gsc_clicks,
        "new_foyers": new_foyers,
        "seo_attributed_foyers": seo_attributed_foyers,
        "new_vehicles": new_vehicles,
        "micro_count": micro_count,
        "pdf_count": pdf_count,
        "dropzone_count": dropzone_count,
        "lead_magnet_count": lead_magnet_count,
        "conversion_rate": round(conversion_rate, 2),
        "micro_rate": round(micro_rate, 2),
        "closing_rate": round(closing_rate, 2),
    }


def print_overview(service, site_url: str, days: int = 28):
    """Affiche une vue d'ensemble rapide et visuelle des performances."""
    print(f"\n🚀 \033[1mANALYSE GOOGLE SEARCH CONSOLE — LAVIGIEAUTO\033[0m")
    print(f"Propriété : \033[36m{site_url}\033[0m | Période : {days} derniers jours\n")

    page_rows = get_search_analytics(service, site_url, days=days, dimensions=["page"], row_limit=500)
    query_rows = get_search_analytics(service, site_url, days=days, dimensions=["query"], row_limit=500)

    total_clicks = sum(r.get("clicks", 0) for r in page_rows)
    total_impressions = sum(r.get("impressions", 0) for r in page_rows)
    avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0.0
    avg_pos = (
        sum(r.get("position", 0) * r.get("impressions", 0) for r in page_rows) / total_impressions
        if total_impressions > 0 else 0.0
    )

    kpis = [
        ["Total Clics", f"\033[1;32m{total_clicks:,}\033[0m"],
        ["Total Impressions", f"\033[1;34m{total_impressions:,}\033[0m"],
        ["CTR Moyen", f"\033[1;33m{avg_ctr:.2f}%\033[0m"],
        ["Position Moyenne", f"\033[1;35m{avg_pos:.1f}\033[0m"],
        ["Pages Actives", f"{len(page_rows)}"],
        ["Mots-clés Positionnés", f"{len(query_rows)}"],
    ]
    print(tabulate(kpis, headers=["Métrique", "Valeur"], tablefmt="rounded_grid"))

    # Top 10 Requêtes
    if query_rows:
        print("\n\033[1m📌 TOP 10 REQUÊTES UTILISATEURS SUR GOOGLE\033[0m")
        table_q = []
        for r in query_rows[:10]:
            table_q.append([
                r["keys"][0][:45],
                r.get("clicks", 0),
                r.get("impressions", 0),
                f"{r.get('ctr', 0.0) * 100:.1f}%",
                f"{r.get('position', 0.0):.1f}"
            ])
        print(tabulate(table_q, headers=["Requête", "Clics", "Impressions", "CTR", "Position"], tablefmt="psql"))
    else:
        print("\nℹ️ Aucune impression enregistrée pour le moment sur cette période.")

    # Top 10 Pages
    if page_rows:
        print("\n\033[1m📄 TOP 10 PAGES DU CATALOGUE & PSEO\033[0m")
        table_p = []
        for r in page_rows[:10]:
            p = r["keys"][0].replace(BASE_URL_PRODUCTION, "").replace(FALLBACK_BASE_URL, "")
            table_p.append([
                p or "/",
                r.get("clicks", 0),
                r.get("impressions", 0),
                f"{r.get('ctr', 0.0) * 100:.1f}%",
                f"{r.get('position', 0.0):.1f}"
            ])
        print(tabulate(table_p, headers=["URL", "Clics", "Impressions", "CTR", "Position"], tablefmt="psql"))

    # Synthèse hebdomadaire d'évolution et Entonnoir de conversion (S vs S-1)
    if days == 7:
        funnel = get_supabase_funnel_metrics(days=days, gsc_clicks=total_clicks)
        if funnel:
            print(f"\n🎯 \033[1mENTONNOIR DE CONVERSION (FULL FUNNEL — {days} DERNIERS JOURS)\033[0m")
            table_funnel = [
                ["1. Trafic Organique Google (Clics SEO GSC)", f"{funnel['gsc_clicks']:,} clics"],
                ["2. Micro-Conversions (Engagement Fiches pSEO)", f"{funnel['micro_count']:,} action{'s' if funnel['micro_count'] > 1 else ''}"],
                ["   ├─ Téléchargements & Impressions Carnet PDF", f"{funnel['pdf_count']:,}"],
                ["   └─ Interactions Dropzone OCR", f"{funnel['dropzone_count']:,}"],
                ["3. Macro-Conversions (Comptes & Véhicules Réels)", f"{funnel['new_foyers']:,} foyer{'s' if funnel['new_foyers'] > 1 else ''}"],
                ["   ├─ Foyers avec attribution SEO (pSEO)", f"{funnel['seo_attributed_foyers']:,}"],
                ["   └─ Véhicules rattachés au foyer", f"{funnel['new_vehicles']:,} véhicule{'s' if funnel['new_vehicles'] > 1 else ''}"],
                ["🚀 Taux de Transformation Global (Clics → Foyers)", f"{funnel['conversion_rate']:.2f}%"],
                ["⚡ Taux d'Engagement Micro (Clics → Actions)", f"{funnel['micro_rate']:.2f}%"],
            ]
            if funnel["micro_count"] > 0:
                table_funnel.append(["🔑 Taux de Clôture (Micro → Foyers)", f"{funnel['closing_rate']:.2f}%"])
            print(tabulate(table_funnel, headers=["Étape de l'Entonnoir", "Volume"], tablefmt="rounded_grid"))

        # Section optionnelle Brave Search & Claude (GEO) et Bing Webmaster
        try:
            sys.path.insert(0, str(Path(__file__).resolve().parent))
            from bing_analyzer import get_bing_summary
            from brave_analyzer import get_brave_summary
            bing_data = get_bing_summary()
            brave_data = get_brave_summary()
        except Exception:
            bing_data = None
            brave_data = None

        synthesis = compute_weekly_synthesis(
            service,
            site_url,
            days=days,
            curr_page_rows=page_rows,
            bing_summary=bing_data,
            brave_summary=brave_data,
        )
        if synthesis:
            print("\n\033[1m" + "═" * 70 + "\033[0m")
            print(f"\033[1;32m{synthesis['cli_summary']}\033[0m")
            print("\033[1m" + "═" * 70 + "\033[0m")


def run_indexation_audit(service, site_url: str, limit: Optional[int] = None):
    """Vérifie le statut d'indexation réel des 54 pages pSEO de LaVigieAuto."""
    urls = load_sitemap_urls()
    if limit:
        urls = urls[:limit]

    print(f"\n🔍 \033[1mAUDIT D'INDEXATION DES {len(urls)} PAGES DU SITEMAP\033[0m")
    print(f"Propriété : \033[36m{site_url}\033[0m\n")

    results = []
    counts = {"INDEXED": 0, "NOT_INDEXED": 0, "ERROR": 0}

    for i, u in enumerate(urls, start=1):
        target_url = u["url"]
        print(f"[{i}/{len(urls)}] Inspection : {target_url} ...", end="\r")
        sys.stdout.flush()

        data = inspect_url_indexation(service, site_url, target_url)
        verdict = data.get("verdict", "UNKNOWN")
        coverage = data.get("coverageState", "N/A")
        last_crawl = data.get("lastCrawlTime", "N/A")

        if verdict == "PASS":
            counts["INDEXED"] += 1
            status_badge = "✅ INDEXÉE"
        elif verdict == "NEUTRAL":
            counts["NOT_INDEXED"] += 1
            status_badge = "⏳ EN ATTENTE"
        else:
            counts["ERROR"] += 1
            status_badge = "❌ NON INDEXÉE"

        results.append([
            u["type"].upper(),
            u["label"][:35],
            status_badge,
            coverage[:40],
            last_crawl[:10] if last_crawl != "N/A" else "Jamais"
        ])

    print("\n")
    print(tabulate(results, headers=["Type", "Page / Fiche", "Statut", "Raison Couverture", "Dernier Crawl"], tablefmt="rounded_grid"))

    print("\n\033[1m📊 SYNTHÈSE D'INDEXATION :\033[0m")
    summary = [
        ["Pages Indexées (Googlebot Validé)", f"\033[1;32m{counts['INDEXED']}\033[0m"],
        ["Pages En Attente / Non Indexées", f"\033[1;33m{counts['NOT_INDEXED']}\033[0m"],
        ["Erreurs d'inspection", f"\033[1;31m{counts['ERROR']}\033[0m"],
        ["Total Inspecté", f"{len(urls)}"],
    ]
    print(tabulate(summary, headers=["État", "Total"], tablefmt="rounded_grid"))


def run_opportunities_audit(service, site_url: str, days: int = 28):
    """Affiche les opportunités SEO prioritaires."""
    print(f"\n🎯 \033[1mDÉTECTEUR D'OPPORTUNITÉS SEO & CROISSANCE DE TRAFIC\033[0m")
    print(f"Propriété : \033[36m{site_url}\033[0m | Fenêtre : {days} jours\n")

    page_rows = get_search_analytics(service, site_url, days=days, dimensions=["page"], row_limit=1000)
    query_rows = get_search_analytics(service, site_url, days=days, dimensions=["query"], row_limit=1000)

    opps = analyze_opportunities(query_rows, page_rows, days=days)

    # 1. Striking distance
    print("⚡ \033[1;33mMOTS-CLÉS EN ZONE DE FRAPPE (Positions 4 à 15)\033[0m")
    print("Ces requêtes génèrent des impressions et sont prêtes à monter en Top 3 via enrichissement :")
    if opps["striking_distance"]:
        sd_table = [[x["query"], x["position"], x["impressions"], x["clicks"], x["ctr"]] for x in opps["striking_distance"]]
        print(tabulate(sd_table, headers=["Mot-clé", "Position", "Impressions", "Clics", "CTR"], tablefmt="psql"))
    else:
        print("  Aucune requête en position 4-15 avec volume significatif pour le moment.")

    # 2. CTR Opportunities
    print("\n💡 \033[1;36mPAGES À OPTIMISER EN CTR (< 3% avec fort volume)\033[0m")
    print("Ces pages sont affichées dans les résultats mais peu cliquées (optimisez le titre et la meta) :")
    if opps["ctr_opportunities"]:
        ctr_table = [[x["page"], x["impressions"], x["clicks"], x["ctr"], x["position"]] for x in opps["ctr_opportunities"]]
        print(tabulate(ctr_table, headers=["Page", "Impressions", "Clics", "CTR", "Position"], tablefmt="psql"))
    else:
        print("  Toutes vos pages avec du volume ont un CTR conforme (> 3%).")

    # 3. Requêtes Moteurs & Vulnérabilités
    print("\n🔧 \033[1;35mREQUÊTES MOTEURS & DISTRIBUTION SENSIBLES (PureTech, BlueHDi, TCe, Courroie)\033[0m")
    if opps["engine_vulnerabilities"]:
        ev_table = [[x["query"], x["position"], x["impressions"], x["clicks"], x["ctr"]] for x in opps["engine_vulnerabilities"]]
        print(tabulate(ev_table, headers=["Requête", "Position", "Impressions", "Clics", "CTR"], tablefmt="psql"))
    else:
        print("  Aucune requête spécifique détectée sur les clusters mécaniques pour le moment.")


def run_brands_breakdown(service, site_url: str, days: int = 28):
    """Affiche la répartition du trafic et des impressions par marque de véhicule."""
    print(f"\n🚗 \033[1mVENTILATION PAR MARQUE AUTOMOBILE (PEUGEOT, RENAULT, DACIA...)\033[0m")
    page_rows = get_search_analytics(service, site_url, days=days, dimensions=["page"], row_limit=1000)
    breakdown = analyze_brands(page_rows)

    table = [[x["brand"], x["clicks"], x["impressions"], x["ctr"], x["page_count"]] for x in breakdown]
    print(tabulate(table, headers=["Marque", "Clics", "Impressions", "CTR", "Pages vues"], tablefmt="rounded_grid"))


def run_top_queries(service, site_url: str, days: int = 28, limit: int = 50, sort_by: str = "impressions"):
    """Affiche la liste détaillée des requêtes de recherche Google."""
    print(f"\n🔍 \033[1mTOP {limit} REQUÊTES DE RECHERCHE GOOGLE (Tri : {sort_by})\033[0m")
    print(f"Propriété : \033[36m{site_url}\033[0m | Période : {days} derniers jours\n")
    query_rows = get_search_analytics(service, site_url, days=days, dimensions=["query"], row_limit=1000)

    if not query_rows:
        print("  Aucune requête enregistrée sur cette période.")
        return

    if sort_by == "position":
        query_rows = sorted(query_rows, key=lambda x: x.get("position", 100))
    elif sort_by == "clicks":
        query_rows = sorted(query_rows, key=lambda x: x.get("clicks", 0), reverse=True)
    else:
        query_rows = sorted(query_rows, key=lambda x: x.get("impressions", 0), reverse=True)

    query_rows = query_rows[:limit]

    table = []
    for r in query_rows:
        table.append([
            r["keys"][0][:50],
            r.get("clicks", 0),
            r.get("impressions", 0),
            f"{r.get('ctr', 0.0) * 100:.2f}%",
            f"{r.get('position', 0.0):.1f}"
        ])
    print(tabulate(table, headers=["Requête", "Clics", "Impressions", "CTR", "Position"], tablefmt="psql"))


def truncate_url_lavigieauto(url: str) -> str:
    """Tronque les URLs longues avec préfixe lisible .../ selon le standard (ex: .../sandero-2/0-9-tce-90)."""
    for prefix in [BASE_URL_PRODUCTION, FALLBACK_BASE_URL, "http://localhost:3000"]:
        if url.startswith(prefix):
            url = url[len(prefix):]
            break
    if not url or url == "/":
        return ".../"
    parts = [p for p in url.split("/") if p]
    if len(parts) >= 3 and parts[0] == "entretien":
        return ".../" + "/".join(parts[2:])
    elif len(parts) == 2 and parts[0] == "entretien":
        return ".../" + parts[1]
    return ".../" + "/".join(parts)

def is_valid_search_query(q: str) -> bool:
    """Filtre rigoureusement les requêtes contenant des opérateurs de recherche (-site:, site:, inurl:)."""
    if not q:
        return False
    q_lower = q.lower().strip()
    for op in ["-site:", "site:", "inurl:", "intitle:", "filetype:"]:
        if op in q_lower:
            return False
    return True

def send_discord_notification(
    service,
    site_url: str,
    webhook_url: Optional[str] = None,
    days: int = 7
) -> bool:
    """Génère et envoie un embed Discord standardisé et ultra-synthétique (mobile first)."""
    if not webhook_url:
        webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
    if not webhook_url:
        print("❌ Aucun DISCORD_WEBHOOK_URL configuré.")
        print("👉 Renseignez-le dans .env ou via l'option --webhook.")
        return False

    page_rows = get_search_analytics(service, site_url, days=days, dimensions=["page"], row_limit=500)
    query_rows = get_search_analytics(service, site_url, days=days, dimensions=["query"], row_limit=500)

    clicks = sum(r.get("clicks", 0) for r in page_rows)
    impressions = sum(r.get("impressions", 0) for r in page_rows)
    ctr = (clicks / impressions * 100) if impressions > 0 else 0.0
    pos = (
        sum(r.get("position", 0) * r.get("impressions", 0) for r in page_rows) / impressions
        if impressions > 0 else 0.0
    )

    # Bloc 1 — 🏆 Top Pages (exclusion stricte des métriques nulles, dédoublonnage, sans arborescence ASCII)
    active_pages = [p for p in page_rows if p.get("impressions", 0) > 0 or p.get("clicks", 0) > 0]
    sorted_pages = sorted(active_pages, key=lambda x: (x.get("clicks", 0), x.get("impressions", 0)), reverse=True)[:3]

    top_pages_lines = []
    for r in sorted_pages:
        raw_url = r["keys"][0]
        trunc = truncate_url_lavigieauto(raw_url)
        c = r.get("clicks", 0)
        i = r.get("impressions", 0)
        clic_label = f"{c} clic{'s' if c > 1 else ''}"
        top_pages_lines.append(f"• `{trunc}` — {clic_label} ({i} imp)")

    top_pages_str = "\n".join(top_pages_lines) if top_pages_lines else "• Aucune page active sur la période"

    # Bloc 2 — 🎯 Zone de Frappe (Positions 4 à 15, filtrage opérateurs, dédoublonnage strict)
    seen_queries = set()
    striking_items = []
    for r in query_rows:
        q_raw = r["keys"][0].strip()
        q_clean = q_raw.lower()
        if not is_valid_search_query(q_clean):
            continue
        if q_clean in seen_queries:
            continue
        seen_queries.add(q_clean)

        p_val = r.get("position", 0.0)
        if 4.0 <= p_val <= 15.0:
            striking_items.append({
                "query": q_raw,
                "position": p_val,
                "impressions": r.get("impressions", 0)
            })

    striking_items.sort(key=lambda x: x["impressions"], reverse=True)
    top_striking = striking_items[:3]
    striking_discord = [f"• {s['query']} — Pos. `{s['position']:.1f}` (`{s['impressions']}` imp)" for s in top_striking]

    embed_fields = [
        {
            "name": "🏆 Top Pages",
            "value": top_pages_str,
            "inline": False,
        }
    ]

    if striking_discord:
        embed_fields.append({
            "name": "🎯 Zone de Frappe (Pos. 4 à 15)",
            "value": "\n".join(striking_discord),
            "inline": False,
        })

    # Bloc Optionnel — 🎯 Entonnoir de Conversion (Full Funnel)
    funnel = get_supabase_funnel_metrics(days=days, gsc_clicks=clicks)
    if funnel and funnel.get("available"):
        funnel_discord = [
            f"• Clics SEO GSC : `{funnel['gsc_clicks']} clics`",
            f"• Micro-conversions : `{funnel['micro_count']} action{'s' if funnel['micro_count'] > 1 else ''}`",
            f"• Macro-conversions : `{funnel['new_foyers']} foyer{'s' if funnel['new_foyers'] > 1 else ''}` (dont `{funnel['seo_attributed_foyers']}` via pSEO)",
            f"• Taux de transformation global : `{funnel['conversion_rate']:.1f}%`"
        ]
        if funnel.get("new_vehicles", 0) > 0:
            funnel_discord.append(f"• Véhicules rattachés : `{funnel['new_vehicles']} véhicule{'s' if funnel['new_vehicles'] > 1 else ''}`")

        embed_fields.append({
            "name": "🎯 Entonnoir de Conversion (Full Funnel)",
            "value": "\n".join(funnel_discord),
            "inline": False,
        })

    # Bloc Optionnel — 🎯 Synthèse Hebdo (S vs S-1)
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from bing_analyzer import get_bing_summary
        from brave_analyzer import get_brave_summary
        bing_data = get_bing_summary()
        brave_data = get_brave_summary()
    except Exception:
        bing_data = None
        brave_data = None

    synthesis = compute_weekly_synthesis(
        service,
        site_url,
        days=days,
        curr_page_rows=page_rows,
        bing_summary=bing_data,
        brave_summary=brave_data,
    )
    if synthesis:
        embed_fields.append({
            "name": f"🎯 Synthèse Hebdo (S vs S-1) : {synthesis['badge_emoji']} {synthesis['badge_title']}",
            "value": synthesis["discord_value"],
            "inline": False,
        })

    # Bloc 3 — 💡 Analyse & Recommandations
    recs_discord = []
    if clicks > 0:
        recs_discord.append(f"Traction sur le catalogue ({clicks} clics) mais fuite du funnel : tester un lead magnet sur les fiches reines (rappel révision 1 clic / PDF direct sans barrière).")
    else:
        recs_discord.append("Consolider les positions en zone de frappe pour amorcer les premiers clics.")

    if top_striking:
        best_q = top_striking[0]
        recs_discord.append(f"Optimiser la balise Title et FAQ sur la requête prioritaire `{best_q['query']}` (pos `{best_q['position']:.1f}`).")

    if recs_discord:
        embed_fields.append({
            "name": "💡 Analyse & Recommandation",
            "value": "\n".join(f"• {r}" for r in recs_discord),
            "inline": False,
        })

    clic_kpi = f"{clicks} clic{'s' if clicks > 1 else ''}"
    embed = {
        "title": "📈 Rapport SEO Hebdo — LaVigieAuto",
        "url": BASE_URL_PRODUCTION,
        "description": f"`{impressions} imp • {clic_kpi} • CTR {ctr:.1f}% • Pos. moy. {pos:.1f}`",
        "color": 2450411,  # #2563eb Bleu LaVigieAuto
        "fields": embed_fields,
        "footer": {
            "text": "54 pages actives au catalogue pSEO",
            "icon_url": f"{BASE_URL_PRODUCTION}/favicon.ico",
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    payload = {
        "username": "LaVigieAuto SEO Bot",
        "avatar_url": f"{BASE_URL_PRODUCTION}/favicon.ico",
        "embeds": [embed],
    }

    try:
        res = requests.post(webhook_url, json=payload, timeout=10)
        if res.status_code in (200, 204):
            print("✅ Notification Discord envoyée avec succès !")
            return True
        else:
            print(f"⚠️ Erreur Discord HTTP {res.status_code} : {res.text}")
            return False
    except Exception as e:
        print(f"⚠️ Échec d'envoi Discord : {e}")
        return False


def send_telegram_notification(
    service,
    site_url: str,
    bot_token: Optional[str] = None,
    chat_id: Optional[str] = None,
    days: int = 7
) -> bool:
    """Génère et envoie un message Telegram standardisé et concis (<= 12 lignes)."""
    if not bot_token:
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not chat_id:
        chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not bot_token or not chat_id:
        print("❌ TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID manquant.")
        print("👉 Renseignez-les dans .env ou via --bot-token / --chat-id.")
        return False

    page_rows = get_search_analytics(service, site_url, days=days, dimensions=["page"], row_limit=500)
    query_rows = get_search_analytics(service, site_url, days=days, dimensions=["query"], row_limit=500)

    clicks = sum(r.get("clicks", 0) for r in page_rows)
    impressions = sum(r.get("impressions", 0) for r in page_rows)
    ctr = (clicks / impressions * 100) if impressions > 0 else 0.0
    pos = (
        sum(r.get("position", 0) * r.get("impressions", 0) for r in page_rows) / impressions
        if impressions > 0 else 0.0
    )

    # Bloc 1 — 🏆 Top Pages
    active_pages = [p for p in page_rows if p.get("impressions", 0) > 0 or p.get("clicks", 0) > 0]
    sorted_pages = sorted(active_pages, key=lambda x: (x.get("clicks", 0), x.get("impressions", 0)), reverse=True)[:3]

    top_pages_telegram = []
    for r in sorted_pages:
        raw_url = r["keys"][0]
        trunc = truncate_url_lavigieauto(raw_url)
        c = r.get("clicks", 0)
        i = r.get("impressions", 0)
        clic_label = f"{c} clic{'s' if c > 1 else ''}"
        top_pages_telegram.append(f"• <code>{html.escape(trunc)}</code> — {clic_label} ({i} imp)")

    top_pages_val_telegram = "\n".join(top_pages_telegram) if top_pages_telegram else "• Aucune page active sur la période"

    # Bloc 2 — 🎯 Zone de Frappe
    seen_queries = set()
    striking_items = []
    for r in query_rows:
        q_raw = r["keys"][0].strip()
        q_clean = q_raw.lower()
        if not is_valid_search_query(q_clean):
            continue
        if q_clean in seen_queries:
            continue
        seen_queries.add(q_clean)

        p_val = r.get("position", 0.0)
        if 4.0 <= p_val <= 15.0:
            striking_items.append({
                "query": q_raw,
                "position": p_val,
                "impressions": r.get("impressions", 0)
            })

    striking_items.sort(key=lambda x: x["impressions"], reverse=True)
    top_striking = striking_items[:3]
    striking_telegram = [f"• {html.escape(s['query'])} — Pos. <code>{s['position']:.1f}</code> (<code>{s['impressions']}</code> imp)" for s in top_striking]

    clic_kpi = f"{clicks} clic{'s' if clicks > 1 else ''}"
    lines = [
        "📈 <b>Rapport SEO Hebdo — LaVigieAuto</b>",
        f"<code>{impressions} imp • {clic_kpi} • CTR {ctr:.1f}% • Pos. moy. {pos:.1f}</code>",
        "",
        "🏆 <b>Top Pages :</b>",
        top_pages_val_telegram,
    ]

    recs_telegram = []
    if clicks > 0:
        recs_telegram.append("Traction fiches : tester un lead magnet (rappel révision 1 clic / PDF direct).")
    if top_striking:
        best_q = top_striking[0]
        recs_telegram.append(f"Optimiser Title/FAQ pour '{html.escape(best_q['query'])}' (pos <code>{best_q['position']:.1f}</code>).")

    if striking_telegram:
        lines.extend([
            "",
            "🎯 <b>Zone de Frappe (Pos. 4 à 15) :</b>",
            "\n".join(striking_telegram),
        ])

    if recs_telegram:
        lines.extend([
            "",
            "💡 <b>Analyse & Action CRO :</b>",
            "\n".join(f"• {r}" for r in recs_telegram),
        ])

    lines.extend([
        "",
        "<i>54 pages actives au catalogue pSEO</i>",
    ])

    text = "\n".join(lines)

    telegram_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }

    try:
        res = requests.post(telegram_url, json=payload, timeout=10)
        if res.status_code == 200:
            print("✅ Notification Telegram envoyée avec succès !")
            return True
        else:
            print(f"⚠️ Erreur Telegram HTTP {res.status_code} : {res.text}")
            return False
    except Exception as e:
        print(f"⚠️ Échec d'envoi Telegram : {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="LaVigieAuto Google Search Console Analyzer")
    parser.add_argument("--overview", action="store_true", help="Vue d'ensemble des KPIs, top requêtes et top pages")
    parser.add_argument("--indexation", action="store_true", help="Audit de couverture et d'indexation des 54 pages pSEO")
    parser.add_argument("--limit-indexation", type=int, default=None, help="Nombre max d'URLs à inspecter")
    parser.add_argument("--opportunities", action="store_true", help="Détection des mots-clés en zone de frappe et opportunités CTR")
    parser.add_argument("--brands", action="store_true", help="Ventilation des métriques par constructeur automobile")
    parser.add_argument("--queries", action="store_true", help="Liste complète des requêtes de recherche Google")
    parser.add_argument("--sort", choices=["impressions", "clicks", "position"], default="impressions", help="Critère de tri pour --queries")
    parser.add_argument("--limit", type=int, default=50, help="Nombre de lignes à afficher")
    parser.add_argument("--list-urls", action="store_true", help="Lister les 54 URLs du catalogue pSEO sans appel API")
    parser.add_argument("--days", type=int, default=28, help="Période d'analyse en jours (défaut : 28)")
    parser.add_argument("--site", type=str, default=None, help="URL de la propriété GSC (ex: sc-domain:lavigieauto.com)")
    parser.add_argument("--credentials", type=str, default=None, help="Chemin du fichier de clé de compte de service JSON")
    parser.add_argument("--discord", action="store_true", help="Envoie le rapport formaté sur le webhook Discord")
    parser.add_argument("--webhook", type=str, default=None, help="URL du Webhook Discord")
    parser.add_argument("--telegram", action="store_true", help="Envoie le rapport formaté sur Telegram")
    parser.add_argument("--bot-token", type=str, default=None, help="Token du bot Telegram")
    parser.add_argument("--chat-id", type=str, default=None, help="Chat ID Telegram")

    args = parser.parse_args()

    if args.list_urls:
        urls = load_sitemap_urls()
        print(f"\n📑 \033[1mCATALOGUE PSEO LAVIGIEAUTO ({len(urls)} URLs canoniques)\033[0m\n")
        table = [[u["type"].upper(), u["label"], u["url"]] for u in urls]
        print(tabulate(table, headers=["Type", "Fiche", "URL Canonique"], tablefmt="rounded_grid"))
        return

    # Si aucun argument spécifique n'est passé, lancer l'overview par défaut
    if not (args.overview or args.indexation or args.opportunities or args.brands or args.queries or args.discord or args.telegram):
        args.overview = True

    service = get_gsc_service(credentials_path=args.credentials)
    site_url = discover_site_property(service, requested_site=args.site)

    if args.overview:
        print_overview(service, site_url, days=args.days)
    if args.opportunities:
        run_opportunities_audit(service, site_url, days=args.days)
    if args.brands:
        run_brands_breakdown(service, site_url, days=args.days)
    if args.queries:
        run_top_queries(service, site_url, days=args.days, limit=args.limit, sort_by=args.sort)
    if args.indexation:
        run_indexation_audit(service, site_url, limit=args.limit_indexation)
    if args.discord:
        send_discord_notification(service, site_url, webhook_url=args.webhook, days=args.days)
    if args.telegram:
        send_telegram_notification(service, site_url, bot_token=args.bot_token, chat_id=args.chat_id, days=args.days)


if __name__ == "__main__":
    main()


