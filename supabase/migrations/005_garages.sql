-- Migration 005: Garages / Ateliers d'entretien
-- Description: Table public.garages pour répertorier les ateliers d'entretien extraits par IA ou ajoutés manuellement.

CREATE TABLE IF NOT EXISTS public.garages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    adresse TEXT,
    telephone TEXT,
    email TEXT,
    marque TEXT, -- Ex: 'Renault', 'Suzuki', 'Indépendant', 'Réseau Précisium', 'Point S', etc.
    siret TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_garages_updated_at
BEFORE UPDATE ON public.garages
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Clés étrangères optionnelles sur documents_sources et lignes_interventions
ALTER TABLE public.documents_sources 
ADD COLUMN IF NOT EXISTS garage_id UUID REFERENCES public.garages(id) ON DELETE SET NULL;

ALTER TABLE public.lignes_interventions 
ADD COLUMN IF NOT EXISTS garage_id UUID REFERENCES public.garages(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_garages_foyer_id ON public.garages(foyer_id);
CREATE INDEX IF NOT EXISTS idx_garages_nom ON public.garages(nom);
CREATE INDEX IF NOT EXISTS idx_documents_sources_garage_id ON public.documents_sources(garage_id);
CREATE INDEX IF NOT EXISTS idx_lignes_interventions_garage_id ON public.lignes_interventions(garage_id);

-- RLS (Row-Level Security)
ALTER TABLE public.garages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'garages' AND policyname = 'Foyer members can view their garages'
    ) THEN
        CREATE POLICY "Foyer members can view their garages"
        ON public.garages
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM public.foyer_members fm
                WHERE fm.foyer_id = garages.foyer_id
                AND fm.user_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'garages' AND policyname = 'Foyer members can insert their garages'
    ) THEN
        CREATE POLICY "Foyer members can insert their garages"
        ON public.garages
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.foyer_members fm
                WHERE fm.foyer_id = garages.foyer_id
                AND fm.user_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'garages' AND policyname = 'Foyer members can update their garages'
    ) THEN
        CREATE POLICY "Foyer members can update their garages"
        ON public.garages
        FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM public.foyer_members fm
                WHERE fm.foyer_id = garages.foyer_id
                AND fm.user_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'garages' AND policyname = 'Foyer members can delete their garages'
    ) THEN
        CREATE POLICY "Foyer members can delete their garages"
        ON public.garages
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM public.foyer_members fm
                WHERE fm.foyer_id = garages.foyer_id
                AND fm.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- 4. Rétro-alimentation (Backfill) automatique des Garages depuis les documents existants
DO $$
DECLARE
    r RECORD;
    v_garage_id UUID;
    v_name TEXT;
    v_phone TEXT;
    v_email TEXT;
    v_address TEXT;
    v_marque TEXT;
    v_siret TEXT;
BEGIN
    FOR r IN 
        SELECT id, foyer_id, emetteur, ocr_structured_data, metadata, file_type
        FROM public.documents_sources
        WHERE file_type IN ('facture', 'devis', 'carnet_entretien')
        AND (emetteur IS NOT NULL OR ocr_structured_data ? 'garage')
    LOOP
        -- Extraction des coordonnées depuis ocr_structured_data ou colonnes
        v_name := COALESCE(
            NULLIF(r.ocr_structured_data->'garage'->>'name', ''),
            NULLIF(r.ocr_structured_data->'garage'->>'nom', ''),
            NULLIF(r.emetteur, '')
        );

        IF v_name IS NOT NULL AND v_name <> 'Atelier Professionnel' AND v_name NOT ILIKE '%ants%' AND v_name NOT ILIKE '%interieur%' THEN
            v_address := COALESCE(
                r.ocr_structured_data->'garage'->>'address',
                r.ocr_structured_data->'garage'->>'adresse',
                r.metadata->>'address'
            );
            v_phone := COALESCE(
                r.ocr_structured_data->'garage'->>'phone',
                r.ocr_structured_data->'garage'->>'telephone',
                r.metadata->>'phone'
            );
            v_email := COALESCE(
                r.ocr_structured_data->'garage'->>'email',
                r.metadata->>'email'
            );
            v_marque := COALESCE(
                r.ocr_structured_data->'garage'->>'brandNetwork',
                r.ocr_structured_data->'garage'->>'marque',
                r.metadata->>'brand'
            );
            v_siret := COALESCE(
                r.ocr_structured_data->'garage'->>'siret',
                r.metadata->>'siret'
            );

            -- Recherche si le garage existe déjà pour ce foyer
            SELECT id INTO v_garage_id
            FROM public.garages
            WHERE foyer_id = r.foyer_id
            AND (
                (v_siret IS NOT NULL AND siret = v_siret)
                OR LOWER(TRIM(nom)) = LOWER(TRIM(v_name))
            )
            LIMIT 1;

            IF v_garage_id IS NULL THEN
                INSERT INTO public.garages (foyer_id, nom, adresse, telephone, email, marque, siret, metadata)
                VALUES (
                    r.foyer_id,
                    TRIM(v_name),
                    v_address,
                    v_phone,
                    v_email,
                    v_marque,
                    v_siret,
                    '{"backfilled": true}'::JSONB
                )
                RETURNING id INTO v_garage_id;
            ELSE
                UPDATE public.garages
                SET 
                    adresse = COALESCE(adresse, v_address),
                    telephone = COALESCE(telephone, v_phone),
                    email = COALESCE(email, v_email),
                    marque = COALESCE(marque, v_marque),
                    siret = COALESCE(siret, v_siret)
                WHERE id = v_garage_id;
            END IF;

            -- Lier le garage au document source et aux lignes d'interventions
            UPDATE public.documents_sources
            SET garage_id = v_garage_id
            WHERE id = r.id;

            UPDATE public.lignes_interventions
            SET garage_id = v_garage_id
            WHERE document_source_id = r.id;
        END IF;
    END LOOP;
END $$;

