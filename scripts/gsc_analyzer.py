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

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    from tabulate import tabulate
except ImportError:
    # Auto re-exec dans .venv si disponible
    project_root = Path(__file__).resolve().parent.parent
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
    row_limit: int = 1000
) -> List[Dict[str, Any]]:
    """Récupère les métriques de recherche depuis la Search Analytics API."""
    if dimensions is None:
        dimensions = ["page"]

    end_date = datetime.now(timezone.utc) - timedelta(days=2)  # Décalage standard GSC (J-2)
    start_date = end_date - timedelta(days=days)

    req = {
        "startDate": start_date.strftime("%Y-%m-%d"),
        "endDate": end_date.strftime("%Y-%m-%d"),
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
    page_rows: List[Dict[str, Any]]
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Détecte les opportunités SEO prioritaires :
    1. Striking Distance (positions 4 à 15 avec fort potentiel de top 3).
    2. CTR Sub-optimal (fortes impressions mais CTR faible, titre à retravailler).
    3. Moteurs à forte vulnérabilité (PureTech, BlueHDi, TCe).
    """
    striking_distance = []
    ctr_opportunities = []
    engine_vulnerabilities = []

    # 1. Striking Distance Queries
    for r in query_rows:
        query = r.get("keys", [""])[0]
        clicks = r.get("clicks", 0)
        impressions = r.get("impressions", 0)
        ctr = r.get("ctr", 0.0) * 100
        position = r.get("position", 0.0)

        if 4.0 <= position <= 15.0 and impressions >= 5:
            striking_distance.append({
                "query": query,
                "position": f"{position:.1f}",
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

    # 2. Pages avec fort volume mais CTR < 3%
    for r in page_rows:
        page = r.get("keys", [""])[0]
        clicks = r.get("clicks", 0)
        impressions = r.get("impressions", 0)
        ctr = r.get("ctr", 0.0) * 100
        position = r.get("position", 0.0)

        if impressions >= 20 and ctr < 3.0:
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

    opps = analyze_opportunities(query_rows, page_rows)

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

    args = parser.parse_args()

    if args.list_urls:
        urls = load_sitemap_urls()
        print(f"\n📑 \033[1mCATALOGUE PSEO LAVIGIEAUTO ({len(urls)} URLs canoniques)\033[0m\n")
        table = [[u["type"].upper(), u["label"], u["url"]] for u in urls]
        print(tabulate(table, headers=["Type", "Fiche", "URL Canonique"], tablefmt="rounded_grid"))
        return

    # Si aucun argument spécifique n'est passé, lancer l'overview par défaut
    if not (args.overview or args.indexation or args.opportunities or args.brands or args.queries):
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


if __name__ == "__main__":
    main()

