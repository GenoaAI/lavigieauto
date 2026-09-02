-- ==============================================================================
-- SCRIPT DE DURCISSEMENT CYBERSÉCURITÉ & ROW-LEVEL SECURITY (RLS) — LAVIGIEAUTO
-- ==============================================================================
-- Cible : PostgreSQL 15+ / Supabase & Storage
-- Description : 
--   1. Création idempotente des tables si manquantes (public.garages, public.app_config).
--   2. Verrouillage du search_path sur toutes les fonctions SECURITY DEFINER et triggers.
--   3. Cloisonnement strict multi-tenants (foyers) et prévention de la prise de contrôle sur foyer_members.
--   4. Protection des configurations sensibles et prompts IA dans app_config (is_public = TRUE).
--   5. Verrouillage du bucket Supabase Storage vehicle-vault en mode privé et politiques d'accès strictes par auth.uid().
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. PRÉREQUIS & CRÉATION IDEMPOTENTE DES TABLES SI ABSENTES
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trigger standard pour updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Table public.garages
CREATE TABLE IF NOT EXISTS public.garages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    adresse TEXT,
    telephone TEXT,
    email TEXT,
    marque TEXT,
    siret TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Liaison optionnelle garage_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents_sources') THEN
        ALTER TABLE public.documents_sources ADD COLUMN IF NOT EXISTS garage_id UUID REFERENCES public.garages(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lignes_interventions') THEN
        ALTER TABLE public.lignes_interventions ADD COLUMN IF NOT EXISTS garage_id UUID REFERENCES public.garages(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Table public.app_config
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

-- ------------------------------------------------------------------------------
-- 1. ACTIVATION SYSTÉMATIQUE DU ROW-LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.foyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.foyer_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lignes_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.defaillances_ct ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.echeances_previsionnelles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audits_conformite ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.garages ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. SÉCURISATION DES FONCTIONS ET TRIGGERS (SET search_path = public)
-- ------------------------------------------------------------------------------

-- Fonction utilitaire d'appartenance à un foyer (compatible UUID et TEXT)
CREATE OR REPLACE FUNCTION public.is_member_of_foyer(lookup_foyer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.foyer_members
    WHERE foyer_id = lookup_foyer_id
      AND user_id::text = auth.uid()::text
  );
$$;

-- Fonction de vérification de statut administrateur/propriétaire de foyer
CREATE OR REPLACE FUNCTION public.is_foyer_admin(lookup_foyer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.foyer_members
    WHERE foyer_id = lookup_foyer_id
      AND user_id::text = auth.uid()::text
      AND role IN ('owner', 'admin')
  );
$$;

-- Fonction de vérification de statut propriétaire unique de foyer
CREATE OR REPLACE FUNCTION public.is_foyer_owner(lookup_foyer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.foyer_members
    WHERE foyer_id = lookup_foyer_id
      AND user_id::text = auth.uid()::text
      AND role = 'owner'
  );
$$;

-- Fonction de vérification d'existence de membres dans un foyer (initialisation)
CREATE OR REPLACE FUNCTION public.foyer_has_members(lookup_foyer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.foyer_members
    WHERE foyer_id = lookup_foyer_id
  );
$$;

-- ------------------------------------------------------------------------------
-- 3. POLITIQUES RLS SUR FOYERS & FOYER_MEMBERS (ANTI-TAKEOVER)
-- ------------------------------------------------------------------------------

-- foyer_members : Nettoyage
DROP POLICY IF EXISTS "Les membres voient leur appartenance" ON public.foyer_members;
DROP POLICY IF EXISTS "Gestion des membres par admin/owner" ON public.foyer_members;
DROP POLICY IF EXISTS "Members can view members of same foyer" ON public.foyer_members;
DROP POLICY IF EXISTS "Admins and owners can insert members" ON public.foyer_members;
DROP POLICY IF EXISTS "Admins and owners can update members" ON public.foyer_members;
DROP POLICY IF EXISTS "Admins and owners can delete members" ON public.foyer_members;
DROP POLICY IF EXISTS "Foyer members select policy" ON public.foyer_members;
DROP POLICY IF EXISTS "Foyer members insert policy" ON public.foyer_members;
DROP POLICY IF EXISTS "Foyer members update policy" ON public.foyer_members;
DROP POLICY IF EXISTS "Foyer members delete policy" ON public.foyer_members;

-- Lecture : Les membres voient les membres de leur foyer ou leur propre ligne
CREATE POLICY "Foyer members select policy"
ON public.foyer_members FOR SELECT
TO authenticated
USING (
  user_id::text = auth.uid()::text OR 
  public.is_member_of_foyer(foyer_id)
);

-- Insertion : L'utilisateur peut s'ajouter comme premier membre (owner) d'un foyer orphelin,
-- ou bien un admin/owner existant peut inviter un membre.
CREATE POLICY "Foyer members insert policy"
ON public.foyer_members FOR INSERT
TO authenticated
WITH CHECK (
  (user_id::text = auth.uid()::text AND NOT public.foyer_has_members(foyer_id)) OR
  public.is_foyer_admin(foyer_id)
);

-- Modification : Seuls les owners/admins peuvent modifier les rôles
CREATE POLICY "Foyer members update policy"
ON public.foyer_members FOR UPDATE
TO authenticated
USING (public.is_foyer_admin(foyer_id))
WITH CHECK (public.is_foyer_admin(foyer_id));

-- Suppression : Seuls les owners/admins peuvent expulser des membres, ou un membre peut quitter le foyer
CREATE POLICY "Foyer members delete policy"
ON public.foyer_members FOR DELETE
TO authenticated
USING (
  user_id::text = auth.uid()::text OR 
  public.is_foyer_admin(foyer_id)
);

-- foyers : Nettoyage
DROP POLICY IF EXISTS "Accès foyer restreint aux membres" ON public.foyers;
DROP POLICY IF EXISTS "Users can view their own foyers" ON public.foyers;
DROP POLICY IF EXISTS "Users can update their own foyers" ON public.foyers;
DROP POLICY IF EXISTS "Authenticated users can create foyers" ON public.foyers;
DROP POLICY IF EXISTS "Owners can delete their foyers" ON public.foyers;
DROP POLICY IF EXISTS "Foyers select policy" ON public.foyers;
DROP POLICY IF EXISTS "Foyers insert policy" ON public.foyers;
DROP POLICY IF EXISTS "Foyers update policy" ON public.foyers;
DROP POLICY IF EXISTS "Foyers delete policy" ON public.foyers;

CREATE POLICY "Foyers select policy"
ON public.foyers FOR SELECT
TO authenticated
USING (public.is_member_of_foyer(id));

CREATE POLICY "Foyers insert policy"
ON public.foyers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Foyers update policy"
ON public.foyers FOR UPDATE
TO authenticated
USING (public.is_foyer_admin(id))
WITH CHECK (public.is_foyer_admin(id));

CREATE POLICY "Foyers delete policy"
ON public.foyers FOR DELETE
TO authenticated
USING (public.is_foyer_owner(id));

-- ------------------------------------------------------------------------------
-- 4. POLITIQUES RLS SUR LES TABLES MÉTIERS DU VÉHICULE
-- ------------------------------------------------------------------------------

-- Véhicules
DROP POLICY IF EXISTS "Accès véhicules restreint au foyer" ON public.vehicules;
DROP POLICY IF EXISTS "Vehicles full access by foyer members" ON public.vehicules;
CREATE POLICY "Vehicles full access by foyer members"
ON public.vehicules FOR ALL
TO authenticated
USING (public.is_member_of_foyer(foyer_id))
WITH CHECK (public.is_member_of_foyer(foyer_id));

-- Documents sources
DROP POLICY IF EXISTS "Accès documents restreint au foyer" ON public.documents_sources;
DROP POLICY IF EXISTS "Documents full access by foyer members" ON public.documents_sources;
CREATE POLICY "Documents full access by foyer members"
ON public.documents_sources FOR ALL
TO authenticated
USING (public.is_member_of_foyer(foyer_id))
WITH CHECK (public.is_member_of_foyer(foyer_id));

-- Lignes d'interventions
DROP POLICY IF EXISTS "Accès interventions restreint au foyer" ON public.lignes_interventions;
DROP POLICY IF EXISTS "Interventions full access by foyer members" ON public.lignes_interventions;
CREATE POLICY "Interventions full access by foyer members"
ON public.lignes_interventions FOR ALL
TO authenticated
USING (public.is_member_of_foyer(foyer_id))
WITH CHECK (public.is_member_of_foyer(foyer_id));

-- Défaillances de contrôle technique
DROP POLICY IF EXISTS "Accès défaillances CT restreint au foyer" ON public.defaillances_ct;
DROP POLICY IF EXISTS "CT defects full access by foyer members" ON public.defaillances_ct;
CREATE POLICY "CT defects full access by foyer members"
ON public.defaillances_ct FOR ALL
TO authenticated
USING (public.is_member_of_foyer(foyer_id))
WITH CHECK (public.is_member_of_foyer(foyer_id));

-- Échéances prévisionnelles
DROP POLICY IF EXISTS "Accès échéances restreint au foyer" ON public.echeances_previsionnelles;
DROP POLICY IF EXISTS "Forecasts full access by foyer members" ON public.echeances_previsionnelles;
CREATE POLICY "Forecasts full access by foyer members"
ON public.echeances_previsionnelles FOR ALL
TO authenticated
USING (public.is_member_of_foyer(foyer_id))
WITH CHECK (public.is_member_of_foyer(foyer_id));

-- Audits de conformité
DROP POLICY IF EXISTS "Accès audits conformité restreint au foyer" ON public.audits_conformite;
DROP POLICY IF EXISTS "Audits full access by foyer members" ON public.audits_conformite;
CREATE POLICY "Audits full access by foyer members"
ON public.audits_conformite FOR ALL
TO authenticated
USING (public.is_member_of_foyer(foyer_id))
WITH CHECK (public.is_member_of_foyer(foyer_id));

-- Garages (Lecture publique/foyer, mutations strictement restreintes aux garages propres au foyer)
DROP POLICY IF EXISTS "Accès garages restreint au foyer" ON public.garages;
DROP POLICY IF EXISTS "Garages Select Policy" ON public.garages;
DROP POLICY IF EXISTS "Garages Insert Policy" ON public.garages;
DROP POLICY IF EXISTS "Garages Update Policy" ON public.garages;
DROP POLICY IF EXISTS "Garages Delete Policy" ON public.garages;

CREATE POLICY "Garages Select Policy"
ON public.garages FOR SELECT
TO authenticated
USING (foyer_id IS NULL OR public.is_member_of_foyer(foyer_id));

CREATE POLICY "Garages Insert Policy"
ON public.garages FOR INSERT
TO authenticated
WITH CHECK (foyer_id IS NOT NULL AND public.is_member_of_foyer(foyer_id));

CREATE POLICY "Garages Update Policy"
ON public.garages FOR UPDATE
TO authenticated
USING (foyer_id IS NOT NULL AND public.is_member_of_foyer(foyer_id))
WITH CHECK (foyer_id IS NOT NULL AND public.is_member_of_foyer(foyer_id));

CREATE POLICY "Garages Delete Policy"
ON public.garages FOR DELETE
TO authenticated
USING (foyer_id IS NOT NULL AND public.is_member_of_foyer(foyer_id));

-- ------------------------------------------------------------------------------
-- 5. POLITIQUES RLS SUR APP_CONFIG (PROTECTION DES SECRETS & PROMPTS IA)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public and authenticated can read config" ON public.app_config;
DROP POLICY IF EXISTS "Public can read public config only" ON public.app_config;
DROP POLICY IF EXISTS "Service role can modify config" ON public.app_config;

CREATE POLICY "Public can read public config only"
ON public.app_config FOR SELECT
TO anon, authenticated
USING (is_public = TRUE);

CREATE POLICY "Service role can modify config"
ON public.app_config FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. SÉCURISATION DU BUCKET SUPABASE STORAGE : vehicle-vault
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- 1. Verrouillage strict du bucket en mode privé si la table storage.buckets existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('vehicle-vault', 'vehicle-vault', false)
        ON CONFLICT (id) DO UPDATE SET public = false;

        UPDATE storage.buckets SET public = false WHERE id = 'vehicle-vault';
    END IF;
END $$;

-- 2. Purge de toutes les anciennes politiques de stockage
DROP POLICY IF EXISTS "Allow user vault folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated download" ON storage.objects;
DROP POLICY IF EXISTS "User can upload to own vault folder" ON storage.objects;
DROP POLICY IF EXISTS "User can view own vault documents" ON storage.objects;
DROP POLICY IF EXISTS "User can delete own vault documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can read documents if vehicle passport is public" ON storage.objects;
DROP POLICY IF EXISTS "Vault Upload Strict" ON storage.objects;
DROP POLICY IF EXISTS "Vault Select Strict" ON storage.objects;
DROP POLICY IF EXISTS "Vault Delete Strict" ON storage.objects;

-- 3. Règle INSERT : Upload autorisé exclusivement dans son propre sous-dossier ({user_id}/*)
CREATE POLICY "Vault Upload Strict"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-vault' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Règle SELECT : Téléchargement direct autorisé exclusivement sur ses propres fichiers
CREATE POLICY "Vault Select Strict"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vehicle-vault' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Règle DELETE : Suppression autorisée exclusivement sur ses propres fichiers
CREATE POLICY "Vault Delete Strict"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicle-vault' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
