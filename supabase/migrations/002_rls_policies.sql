-- Migration 002: Row Level Security (RLS) Policies for AutoCare AI
-- Description: Strict isolation per foyer_id, helper security functions, and granular policies for all tables.

-- ============================================================================
-- 1. HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================================

-- Function to get all foyer IDs for the authenticated user
CREATE OR REPLACE FUNCTION public.get_user_foyer_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT foyer_id 
    FROM public.foyer_members 
    WHERE user_id = auth.uid();
$$;

-- Function to check if the current user is a member of a given foyer
CREATE OR REPLACE FUNCTION public.is_foyer_member(lookup_foyer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.foyer_members 
        WHERE foyer_id = lookup_foyer_id 
          AND user_id = auth.uid()
    );
$$;

-- Function to check if the current user is an admin or owner of a given foyer
CREATE OR REPLACE FUNCTION public.is_foyer_admin(lookup_foyer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.foyer_members 
        WHERE foyer_id = lookup_foyer_id 
          AND user_id = auth.uid() 
          AND role IN ('owner', 'admin')
    );
$$;

-- Function to check if the current user is the owner of a given foyer
CREATE OR REPLACE FUNCTION public.is_foyer_owner(lookup_foyer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.foyer_members 
        WHERE foyer_id = lookup_foyer_id 
          AND user_id = auth.uid() 
          AND role = 'owner'
    );
$$;

-- ============================================================================
-- 2. ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.foyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foyer_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lignes_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defaillances_ct ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.echeances_previsionnelles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits_conformite ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. POLICIES: FOYERS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view foyers they belong to" ON public.foyers;
CREATE POLICY "Users can view foyers they belong to"
ON public.foyers FOR SELECT
TO authenticated
USING (id IN (SELECT public.get_user_foyer_ids()));

DROP POLICY IF EXISTS "Users can create a foyer" ON public.foyers;
CREATE POLICY "Users can create a foyer"
ON public.foyers FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update their foyer" ON public.foyers;
CREATE POLICY "Admins can update their foyer"
ON public.foyers FOR UPDATE
TO authenticated
USING (public.is_foyer_admin(id))
WITH CHECK (public.is_foyer_admin(id));

DROP POLICY IF EXISTS "Owners can delete their foyer" ON public.foyers;
CREATE POLICY "Owners can delete their foyer"
ON public.foyers FOR DELETE
TO authenticated
USING (public.is_foyer_owner(id));

-- ============================================================================
-- 4. POLICIES: FOYER_MEMBERS
-- ============================================================================

DROP POLICY IF EXISTS "Members can view membership in their foyers" ON public.foyer_members;
CREATE POLICY "Members can view membership in their foyers"
ON public.foyer_members FOR SELECT
TO authenticated
USING (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Admins can add members or creator can add self" ON public.foyer_members;
CREATE POLICY "Admins can add members or creator can add self"
ON public.foyer_members FOR INSERT
TO authenticated
WITH CHECK (
    public.is_foyer_admin(foyer_id) 
    OR (user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can update member roles" ON public.foyer_members;
CREATE POLICY "Admins can update member roles"
ON public.foyer_members FOR UPDATE
TO authenticated
USING (public.is_foyer_admin(foyer_id))
WITH CHECK (public.is_foyer_admin(foyer_id));

DROP POLICY IF EXISTS "Admins can remove members or member can leave" ON public.foyer_members;
CREATE POLICY "Admins can remove members or member can leave"
ON public.foyer_members FOR DELETE
TO authenticated
USING (
    public.is_foyer_admin(foyer_id) 
    OR (user_id = auth.uid())
);

-- ============================================================================
-- 5. POLICIES: VEHICULES
-- ============================================================================

DROP POLICY IF EXISTS "Members can view foyer vehicles" ON public.vehicules;
CREATE POLICY "Members can view foyer vehicles"
ON public.vehicules FOR SELECT
TO authenticated
USING (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can insert foyer vehicles" ON public.vehicules;
CREATE POLICY "Members can insert foyer vehicles"
ON public.vehicules FOR INSERT
TO authenticated
WITH CHECK (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can update foyer vehicles" ON public.vehicules;
CREATE POLICY "Members can update foyer vehicles"
ON public.vehicules FOR UPDATE
TO authenticated
USING (public.is_foyer_member(foyer_id))
WITH CHECK (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Admins can delete foyer vehicles" ON public.vehicules;
CREATE POLICY "Admins can delete foyer vehicles"
ON public.vehicules FOR DELETE
TO authenticated
USING (public.is_foyer_admin(foyer_id));

-- ============================================================================
-- 6. POLICIES: DOCUMENTS_SOURCES
-- ============================================================================

DROP POLICY IF EXISTS "Members can view foyer documents" ON public.documents_sources;
CREATE POLICY "Members can view foyer documents"
ON public.documents_sources FOR SELECT
TO authenticated
USING (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can insert foyer documents" ON public.documents_sources;
CREATE POLICY "Members can insert foyer documents"
ON public.documents_sources FOR INSERT
TO authenticated
WITH CHECK (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can update foyer documents" ON public.documents_sources;
CREATE POLICY "Members can update foyer documents"
ON public.documents_sources FOR UPDATE
TO authenticated
USING (public.is_foyer_member(foyer_id))
WITH CHECK (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can delete foyer documents" ON public.documents_sources;
CREATE POLICY "Members can delete foyer documents"
ON public.documents_sources FOR DELETE
TO authenticated
USING (public.is_foyer_member(foyer_id));

-- ============================================================================
-- 7. POLICIES: LIGNES_INTERVENTIONS
-- ============================================================================

DROP POLICY IF EXISTS "Members can view foyer interventions" ON public.lignes_interventions;
CREATE POLICY "Members can view foyer interventions"
ON public.lignes_interventions FOR SELECT
TO authenticated
USING (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can insert foyer interventions" ON public.lignes_interventions;
CREATE POLICY "Members can insert foyer interventions"
ON public.lignes_interventions FOR INSERT
TO authenticated
WITH CHECK (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can update foyer interventions" ON public.lignes_interventions;
CREATE POLICY "Members can update foyer interventions"
ON public.lignes_interventions FOR UPDATE
TO authenticated
USING (public.is_foyer_member(foyer_id))
WITH CHECK (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can delete foyer interventions" ON public.lignes_interventions;
CREATE POLICY "Members can delete foyer interventions"
ON public.lignes_interventions FOR DELETE
TO authenticated
USING (public.is_foyer_member(foyer_id));

-- ============================================================================
-- 8. POLICIES: DEFAILLANCES_CT
-- ============================================================================

DROP POLICY IF EXISTS "Members can view foyer CT defects" ON public.defaillances_ct;
CREATE POLICY "Members can view foyer CT defects"
ON public.defaillances_ct FOR SELECT
TO authenticated
USING (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can insert foyer CT defects" ON public.defaillances_ct;
CREATE POLICY "Members can insert foyer CT defects"
ON public.defaillances_ct FOR INSERT
TO authenticated
WITH CHECK (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can update foyer CT defects" ON public.defaillances_ct;
CREATE POLICY "Members can update foyer CT defects"
ON public.defaillances_ct FOR UPDATE
TO authenticated
USING (public.is_foyer_member(foyer_id))
WITH CHECK (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can delete foyer CT defects" ON public.defaillances_ct;
CREATE POLICY "Members can delete foyer CT defects"
ON public.defaillances_ct FOR DELETE
TO authenticated
USING (public.is_foyer_member(foyer_id));

-- ============================================================================
-- 9. POLICIES: ECHEANCES_PREVISIONNELLES
-- ============================================================================

DROP POLICY IF EXISTS "Members can view foyer forecasts" ON public.echeances_previsionnelles;
CREATE POLICY "Members can view foyer forecasts"
ON public.echeances_previsionnelles FOR SELECT
TO authenticated
USING (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can insert foyer forecasts" ON public.echeances_previsionnelles;
CREATE POLICY "Members can insert foyer forecasts"
ON public.echeances_previsionnelles FOR INSERT
TO authenticated
WITH CHECK (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can update foyer forecasts" ON public.echeances_previsionnelles;
CREATE POLICY "Members can update foyer forecasts"
ON public.echeances_previsionnelles FOR UPDATE
TO authenticated
USING (public.is_foyer_member(foyer_id))
WITH CHECK (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can delete foyer forecasts" ON public.echeances_previsionnelles;
CREATE POLICY "Members can delete foyer forecasts"
ON public.echeances_previsionnelles FOR DELETE
TO authenticated
USING (public.is_foyer_member(foyer_id));

-- ============================================================================
-- 10. POLICIES: AUDITS_CONFORMITE
-- ============================================================================

DROP POLICY IF EXISTS "Members can view foyer audits" ON public.audits_conformite;
CREATE POLICY "Members can view foyer audits"
ON public.audits_conformite FOR SELECT
TO authenticated
USING (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can insert foyer audits" ON public.audits_conformite;
CREATE POLICY "Members can insert foyer audits"
ON public.audits_conformite FOR INSERT
TO authenticated
WITH CHECK (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Members can update foyer audits" ON public.audits_conformite;
CREATE POLICY "Members can update foyer audits"
ON public.audits_conformite FOR UPDATE
TO authenticated
USING (public.is_foyer_member(foyer_id))
WITH CHECK (public.is_foyer_member(foyer_id));

DROP POLICY IF EXISTS "Admins can delete foyer audits" ON public.audits_conformite;
CREATE POLICY "Admins can delete foyer audits"
ON public.audits_conformite FOR DELETE
TO authenticated
USING (public.is_foyer_admin(foyer_id));
