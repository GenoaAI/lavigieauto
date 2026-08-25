-- Migration 001: Initial Schema for AutoCare AI (La Vigie Auto)
-- Description: Core tables for foyers, members, vehicles, documents, interventions, CT defects, forecasts, and health audits.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Foyers (Household / Multi-vehicle Account)
CREATE TABLE IF NOT EXISTS public.foyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure metadata column exists if table was created previously
ALTER TABLE public.foyers ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE TRIGGER trg_foyers_updated_at
BEFORE UPDATE ON public.foyers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 2. Foyer Members (Link users to households with specific roles)
CREATE TABLE IF NOT EXISTS public.foyer_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'owner',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_foyer_user UNIQUE (foyer_id, user_id)
);

CREATE TRIGGER trg_foyer_members_updated_at
BEFORE UPDATE ON public.foyer_members
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 3. Vehicules (Vehicles belonging to a foyer)
CREATE TABLE IF NOT EXISTS public.vehicules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
    immatriculation TEXT NOT NULL,
    vin TEXT,
    marque TEXT NOT NULL,
    modele TEXT NOT NULL,
    version TEXT,
    annee_mise_en_circulation INTEGER,
    date_premiere_immatriculation DATE,
    kilometrage_actuel INTEGER NOT NULL DEFAULT 0,
    date_releve_kilometrage DATE NOT NULL DEFAULT CURRENT_DATE,
    energie TEXT CHECK (energie IN ('essence', 'diesel', 'hybride', 'hybride_rechargeable', 'electrique', 'gpl', 'ethanol_e85', 'autre')),
    puissance_fiscale INTEGER,
    puissance_din INTEGER,
    critair INTEGER CHECK (critair BETWEEN 0 AND 5),
    boite_vitesse TEXT CHECK (boite_vitesse IN ('manuelle', 'automatique', 'robotisee', 'variation_continue')),
    usage_type TEXT NOT NULL CHECK (usage_type IN ('quotidien', 'secondaire', 'professionnel', 'loisir', 'collection')) DEFAULT 'quotidien',
    km_annuel_moyen INTEGER NOT NULL DEFAULT 12000,
    statut TEXT NOT NULL CHECK (statut IN ('actif', 'vendu', 'archive', 'en_panne')) DEFAULT 'actif',
    image_url TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_vehicules_updated_at
BEFORE UPDATE ON public.vehicules
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 4. Documents Sources (Uploaded files: invoices, CT reports, registration cards, quotes)
CREATE TABLE IF NOT EXISTS public.documents_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
    vehicule_id UUID REFERENCES public.vehicules(id) ON DELETE CASCADE,
    nom_fichier TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('facture', 'controle_technique', 'carte_grise', 'devis', 'carnet_entretien', 'autre')),
    mime_type TEXT,
    taille_octets BIGINT,
    date_document DATE,
    kilometrage_document INTEGER,
    emetteur TEXT,
    montant_ht NUMERIC(10, 2),
    tva NUMERIC(10, 2),
    montant_ttc NUMERIC(10, 2),
    statut_ocr TEXT NOT NULL CHECK (statut_ocr IN ('en_attente', 'en_cours', 'traite', 'echec', 'a_valider')) DEFAULT 'en_attente',
    ocr_raw_text TEXT,
    ocr_structured_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    confidence_score NUMERIC(5, 2),
    erreurs_ocr TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_documents_sources_updated_at
BEFORE UPDATE ON public.documents_sources
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 5. Lignes Interventions (Detailed operations extracted from invoices or entered manually)
CREATE TABLE IF NOT EXISTS public.lignes_interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
    vehicule_id UUID NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
    document_source_id UUID REFERENCES public.documents_sources(id) ON DELETE CASCADE,
    categorie TEXT NOT NULL CHECK (categorie IN (
        'moteur', 'freinage', 'liaison_au_sol', 'echappement', 'distribution',
        'visibilite', 'carrosserie', 'pneumatiques', 'electricite', 'climatisation',
        'revision_generale', 'transmission', 'autre'
    )),
    operation TEXT NOT NULL,
    description TEXT,
    quantite NUMERIC(10, 2) NOT NULL DEFAULT 1,
    prix_unitaire_ht NUMERIC(10, 2),
    prix_total_ht NUMERIC(10, 2),
    tva_taux NUMERIC(5, 2),
    prix_total_ttc NUMERIC(10, 2),
    reference_piece TEXT,
    date_intervention DATE NOT NULL,
    kilometrage_intervention INTEGER,
    garantie_mois INTEGER,
    emetteur TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_lignes_interventions_updated_at
BEFORE UPDATE ON public.lignes_interventions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 6. Defaillances CT (Technical Inspection Defects)
CREATE TABLE IF NOT EXISTS public.defaillances_ct (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
    vehicule_id UUID NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
    document_source_id UUID NOT NULL REFERENCES public.documents_sources(id) ON DELETE CASCADE,
    code_defaillance TEXT,
    libelle TEXT NOT NULL,
    niveau_gravite TEXT NOT NULL CHECK (niveau_gravite IN ('mineure', 'majeure', 'critique')),
    localisation TEXT,
    statut_resolution TEXT NOT NULL CHECK (statut_resolution IN ('a_traiter', 'repare', 'ignore', 'en_cours')) DEFAULT 'a_traiter',
    ligne_intervention_resolution_id UUID REFERENCES public.lignes_interventions(id) ON DELETE SET NULL,
    date_ct DATE NOT NULL,
    kilometrage_ct INTEGER,
    resultat_ct TEXT CHECK (resultat_ct IN ('favorable', 'defavorable_majeure', 'defavorable_critique')),
    date_limite_contre_visite DATE,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_defaillances_ct_updated_at
BEFORE UPDATE ON public.defaillances_ct
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 7. Echeances Previsionnelles (Forecasted Maintenance Milestones)
CREATE TABLE IF NOT EXISTS public.echeances_previsionnelles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
    vehicule_id UUID NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
    type_echeance TEXT NOT NULL CHECK (type_echeance IN (
        'controle_technique', 'contre_visite', 'revision', 'courroie_distribution',
        'courroie_accessoire', 'liquide_frein', 'liquide_refroidissement',
        'plaquettes_frein', 'disques_frein', 'pneumatiques', 'bougies',
        'filtre_habitacle', 'filtre_air', 'filtre_carburant', 'batterie',
        'assurance', 'autre'
    )),
    titre TEXT NOT NULL,
    description TEXT,
    date_butoir DATE,
    kilometrage_butoir INTEGER,
    statut_echeance TEXT NOT NULL CHECK (statut_echeance IN ('a_venir', 'en_retard', 'effectue', 'ignore')) DEFAULT 'a_venir',
    criticite TEXT NOT NULL CHECK (criticite IN ('faible', 'moyenne', 'elevee', 'critique')) DEFAULT 'moyenne',
    estimation_cout_ttc NUMERIC(10, 2),
    document_source_id UUID REFERENCES public.documents_sources(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_echeances_previsionnelles_updated_at
BEFORE UPDATE ON public.echeances_previsionnelles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 8. Audits de Conformite (Health and Conformity Reports for Resale)
CREATE TABLE IF NOT EXISTS public.audits_conformite (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
    vehicule_id UUID NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
    score_sante_global INTEGER NOT NULL CHECK (score_sante_global BETWEEN 0 AND 100),
    statut_conformite_ct BOOLEAN NOT NULL DEFAULT TRUE,
    date_dernier_ct DATE,
    kilometrage_dernier_ct INTEGER,
    synthese_analyse JSONB NOT NULL DEFAULT '{}'::JSONB,
    recommandations JSONB NOT NULL DEFAULT '[]'::JSONB,
    anomalies_detectees JSONB NOT NULL DEFAULT '[]'::JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_audits_conformite_updated_at
BEFORE UPDATE ON public.audits_conformite
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_foyer_members_user_id ON public.foyer_members(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicules_foyer_id ON public.vehicules(foyer_id);
CREATE INDEX IF NOT EXISTS idx_documents_sources_foyer_id ON public.documents_sources(foyer_id);
CREATE INDEX IF NOT EXISTS idx_documents_sources_vehicule_id ON public.documents_sources(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_lignes_interventions_vehicule_id ON public.lignes_interventions(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_defaillances_ct_vehicule_id ON public.defaillances_ct(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_echeances_vehicule_id ON public.echeances_previsionnelles(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_audits_vehicule_id ON public.audits_conformite(vehicule_id);
