-- Migration 006: Micro-Conversions Tracking & Funnel Attribution
-- Description: Table public.micro_conversions pour l'entonnoir d'acquisition et le reporting Full Funnel.

CREATE TABLE IF NOT EXISTS public.micro_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    engine TEXT,
    url TEXT,
    visitor_id TEXT,
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

-- Index pour requêtes chronologiques et agrégation hebdomadaire du reporting Full Funnel
CREATE INDEX IF NOT EXISTS idx_micro_conversions_created_at 
    ON public.micro_conversions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_micro_conversions_event_type 
    ON public.micro_conversions (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_micro_conversions_brand_model 
    ON public.micro_conversions (brand, model);
CREATE INDEX IF NOT EXISTS idx_micro_conversions_foyer_id 
    ON public.micro_conversions (foyer_id);

-- Durcissement Row-Level Security (RLS)
ALTER TABLE public.micro_conversions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Insertion autorisée pour anonymes et utilisateurs authentifiés (télémétrie pré-inscription)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'micro_conversions' 
          AND policyname = 'Allow anon and authenticated insert to micro_conversions'
    ) THEN
        CREATE POLICY "Allow anon and authenticated insert to micro_conversions"
            ON public.micro_conversions
            FOR INSERT
            TO anon, authenticated
            WITH CHECK (true);
    END IF;

    -- Lecture restreinte : membres de foyer pour leurs propres conversions uniquement
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'micro_conversions' 
          AND policyname = 'Allow household members to view their micro_conversions'
    ) THEN
        CREATE POLICY "Allow household members to view their micro_conversions"
            ON public.micro_conversions
            FOR SELECT
            TO authenticated
            USING (
                foyer_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.foyer_members fm 
                    WHERE fm.foyer_id = micro_conversions.foyer_id 
                      AND fm.user_id = auth.uid()
                )
            );
    END IF;
END $$;
