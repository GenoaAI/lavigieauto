-- Migration 003: App Configuration for AutoCare AI
-- Description: Central application configuration table with default rules, thresholds, prompts, and progressive pricing.

CREATE TABLE IF NOT EXISTS public.app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_app_config_updated_at
BEFORE UPDATE ON public.app_config
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Allow public access for public config, and authenticated users to read all configurations
DROP POLICY IF EXISTS "Public and authenticated can read config" ON public.app_config;
CREATE POLICY "Public and authenticated can read config"
ON public.app_config FOR SELECT
TO anon, authenticated
USING (is_public = TRUE OR auth.role() = 'authenticated');

-- Mutations are restricted to service role or superadmins
DROP POLICY IF EXISTS "Service role can modify config" ON public.app_config;
CREATE POLICY "Service role can modify config"
ON public.app_config FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- DEFAULT CONFIGURATION SEEDS (UPSERT)
-- ============================================================================

-- 1. Délais et règles du Contrôle Technique (France)
INSERT INTO public.app_config (key, category, is_public, description, value)
VALUES (
    'delais_controle_technique',
    'reglementation',
    TRUE,
    'Délais réglementaires français du contrôle technique automobile',
    '{
        "premier_ct_mois": 48,
        "periodicite_ct_mois": 24,
        "delai_contre_visite_jours": 60,
        "delai_rappel_anticipation_jours": 60,
        "delai_rappel_urgent_jours": 15,
        "tolerance_depassement_jours": 0,
        "amende_forfaitaire_defaut_ct_euros": 135
    }'::JSONB
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 2. Seuils kilométriques et temporels de maintenance prédictive
INSERT INTO public.app_config (key, category, is_public, description, value)
VALUES (
    'seuils_kilometriques_maintenance',
    'maintenance',
    TRUE,
    'Intervalles kilométriques et temporels standards recommandés par intervention',
    '{
        "vidange_huile_moteur": {
            "km_intervalle": 15000,
            "mois_intervalle": 12,
            "tolerance_km": 1500,
            "cout_moyen_estime_min": 79.0,
            "cout_moyen_estime_max": 149.0
        },
        "courroie_distribution": {
            "km_intervalle": 120000,
            "mois_intervalle": 72,
            "tolerance_km": 5000,
            "cout_moyen_estime_min": 450.0,
            "cout_moyen_estime_max": 850.0
        },
        "courroie_accessoire": {
            "km_intervalle": 90000,
            "mois_intervalle": 60,
            "tolerance_km": 5000,
            "cout_moyen_estime_min": 120.0,
            "cout_moyen_estime_max": 250.0
        },
        "liquide_frein": {
            "km_intervalle": 60000,
            "mois_intervalle": 24,
            "tolerance_km": 3000,
            "cout_moyen_estime_min": 49.0,
            "cout_moyen_estime_max": 89.0
        },
        "liquide_refroidissement": {
            "km_intervalle": 120000,
            "mois_intervalle": 48,
            "tolerance_km": 5000,
            "cout_moyen_estime_min": 69.0,
            "cout_moyen_estime_max": 119.0
        },
        "plaquettes_frein_avant": {
            "km_intervalle": 35000,
            "mois_intervalle": 36,
            "tolerance_km": 3000,
            "cout_moyen_estime_min": 89.0,
            "cout_moyen_estime_max": 169.0
        },
        "disques_frein_avant": {
            "km_intervalle": 70000,
            "mois_intervalle": 72,
            "tolerance_km": 5000,
            "cout_moyen_estime_min": 180.0,
            "cout_moyen_estime_max": 320.0
        },
        "filtre_habitacle": {
            "km_intervalle": 20000,
            "mois_intervalle": 12,
            "tolerance_km": 2000,
            "cout_moyen_estime_min": 25.0,
            "cout_moyen_estime_max": 55.0
        },
        "filtre_air": {
            "km_intervalle": 30000,
            "mois_intervalle": 24,
            "tolerance_km": 3000,
            "cout_moyen_estime_min": 29.0,
            "cout_moyen_estime_max": 59.0
        },
        "filtre_carburant": {
            "km_intervalle": 45000,
            "mois_intervalle": 24,
            "tolerance_km": 4000,
            "cout_moyen_estime_min": 45.0,
            "cout_moyen_estime_max": 95.0
        },
        "bougies_allumage": {
            "km_intervalle": 40000,
            "mois_intervalle": 36,
            "tolerance_km": 4000,
            "cout_moyen_estime_min": 59.0,
            "cout_moyen_estime_max": 120.0
        },
        "batterie_12v": {
            "km_intervalle": 80000,
            "mois_intervalle": 48,
            "tolerance_km": 5000,
            "cout_moyen_estime_min": 99.0,
            "cout_moyen_estime_max": 210.0
        },
        "pneumatiques_train": {
            "km_intervalle": 40000,
            "mois_intervalle": 48,
            "tolerance_km": 4000,
            "cout_moyen_estime_min": 140.0,
            "cout_moyen_estime_max": 300.0
        }
    }'::JSONB
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 3. Grille de Tarification Dégressive Multi-Véhicules
INSERT INTO public.app_config (key, category, is_public, description, value)
VALUES (
    'tarification_degressive',
    'billing',
    TRUE,
    'Grille tarifaire par palier de véhicules dans le foyer',
    '{
        "devise": "EUR",
        "essai_gratuit_jours": 14,
        "paliers_mensuels": [
            { "vehicule_index": 1, "label": "1er véhicule", "prix_ttc_mois": 4.90, "prix_ttc_an": 49.00 },
            { "vehicule_index": 2, "label": "2ème véhicule", "prix_ttc_mois": 2.90, "prix_ttc_an": 29.00 },
            { "vehicule_index": 3, "label": "3ème véhicule et +", "prix_ttc_mois": 1.90, "prix_ttc_an": 19.00 }
        ],
        "packs_speciaux": [
            {
                "code": "PACK_FAMILLE_5",
                "label": "Pack Foyer Sérénité (jusqu''à 5 véhicules)",
                "prix_ttc_mois": 8.90,
                "prix_ttc_an": 89.00,
                "vehicules_max": 5
            }
        ],
        "fonctionnalites_incluses": [
            "Scan OCR illimité des factures et contrôles techniques",
            "Carnet d''entretien numérique infalsifiable",
            "Score de santé du véhicule & audits de conformité",
            "Alertes prédictives personnalisées",
            "Partage familial multi-utilisateurs",
            "Export PDF du dossier de vente complet"
        ]
    }'::JSONB
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 4. Critères et pondérations du Score de Santé Automobile
INSERT INTO public.app_config (key, category, is_public, description, value)
VALUES (
    'criteres_score_sante',
    'diagnostic',
    TRUE,
    'Algorithme de calcul du score de santé (0-100) du véhicule',
    '{
        "poids_total": 100,
        "criteres": {
            "ct_valide_et_favorable": { "poids": 30, "description": "Contrôle technique en cours de validité et résultat favorable" },
            "absence_defaillances_en_cours": { "poids": 25, "description": "Aucune défaillance majeure ou critique en attente de réparation" },
            "respect_echeances_entretien": { "poids": 25, "description": "Vidanges et maintenances courantes réalisées dans les temps" },
            "coherence_et_suivi_kilometrique": { "poids": 20, "description": "Relevés kilométriques réguliers et chronologie cohérente" }
        },
        "penalites": {
            "ct_expire": -30,
            "contre_visite_depassee": -40,
            "defaillance_critique_non_resolue": -50,
            "defaillance_majeure_non_resolue": -25,
            "vidange_retard_majeur": -15
        },
        "seuils_etat": {
            "excellent": { "min": 85, "max": 100, "couleur": "emerald" },
            "bon": { "min": 70, "max": 84, "couleur": "blue" },
            "vigilance": { "min": 50, "max": 69, "couleur": "amber" },
            "critique": { "min": 0, "max": 49, "couleur": "rose" }
        }
    }'::JSONB
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 5. Prompts d'extraction OCR et Analyse IA
INSERT INTO public.app_config (key, category, is_public, description, value)
VALUES (
    'prompts_ia_extraction',
    'ia_prompts',
    FALSE,
    'Prompts système pour l''extraction et structuration des pièces automobiles par IA',
    '{
        "system_instruction_facture": "Tu es un expert en mécanique automobile et en analyse de factures de garage. Extrais précisément : date d''intervention, kilométrage relevé, nom/SIRET de l''émetteur, totaux HT/TTC/TVA, et la liste exhaustive des lignes d''interventions avec catégorie, opération détaillée, prix unitaire HT, quantité, prix total HT et référence pièce si disponible.",
        "system_instruction_ct": "Tu es un expert des procès-verbaux de contrôle technique français. Extrais : date du contrôle, date limite de validité, résultat (A favorable, S défavorable majeure, R défavorable critique), kilométrage compteur, numéro d''agrément du centre, et toutes les défaillances constatées (code, libellé exact, niveau mineure/majeure/critique, localisation AVG/AVD/ARG/ARD/etc.).",
        "system_instruction_carte_grise": "Tu es un expert des certificats d''immatriculation (cartes grises) français. Extrais : numéro d''immatriculation (A), date de 1ère immatriculation (B), marque (D.1), type/variante/version (D.2), dénomination commerciale (D.3), numéro VIN (E), puissance fiscale (P.6), énergie (P.3), cylindrée (P.1)."
    }'::JSONB
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();
