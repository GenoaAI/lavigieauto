-- ============================================================================
-- AutoCare AI (LaVigieAuto) — Seed SQL Officiel : charlesdeforges@gmail.com
-- ============================================================================

-- 1. S'assurer que la colonne metadata existe dans foyers
ALTER TABLE public.foyers ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

DO $$
DECLARE
    v_user_id UUID;
    v_foyer_id UUID := '11111111-1111-1111-1111-111111111111';
    v_vitara_id UUID := '33333333-3333-3333-3333-333333333333';
    v_espace_id UUID := '22222222-2222-2222-2222-222222222222';
    v_clio_id UUID := '13e1a1d1-34c0-45a1-90cc-bc2dd7927e20';
    v_jeep_id UUID := '66666666-6666-6666-6666-666666666666';
BEGIN
    -- 2. Récupérer l'ID utilisateur
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'charlesdeforges@gmail.com' LIMIT 1;

    IF v_user_id IS NULL THEN
        v_user_id := '00000000-0000-0000-0000-000000000001';
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        )
        VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'charlesdeforges@gmail.com',
            crypt('LaVigieAuto2026!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::JSONB,
            '{"full_name":"Charles de Forges"}'::JSONB,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 3. Foyer
    INSERT INTO public.foyers (id, nom, description, metadata)
    VALUES (
        v_foyer_id,
        'Foyer Charles de Forges',
        'Flotte automobile familiale LaVigieAuto',
        '{"stripe_subscription_status": "active", "plan": "foyer_multi_vehicules", "calendar_synced": true, "user_email": "charlesdeforges@gmail.com"}'::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
        nom = EXCLUDED.nom,
        metadata = EXCLUDED.metadata;

    -- 4. Membre
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
        INSERT INTO public.foyer_members (foyer_id, user_id, role)
        VALUES (v_foyer_id, v_user_id, 'owner')
        ON CONFLICT (foyer_id, user_id) DO NOTHING;
    END IF;

    -- 5. Véhicule 1 : Suzuki Vitara (125 789 km - En retard)
    INSERT INTO public.vehicules (
        id, foyer_id, immatriculation, vin, marque, modele, version,
        annee_mise_en_circulation, date_premiere_immatriculation, kilometrage_actuel,
        date_releve_kilometrage, energie, boite_vitesse, usage_type, km_annuel_moyen, statut, metadata
    )
    VALUES (
        v_vitara_id, v_foyer_id, 'EC-301-JX', 'TSMAYA21S00123456', 'Suzuki', 'Vitara',
        '1.6 VVT 120ch AllGrip Pack', 2016, '2016-06-15', 125789, '2026-08-25',
        'essence', 'manuelle', 'quotidien', 15000, 'actif',
        '{"image_url": "/images/vehicles/suzuki-vitara-2016.jpg", "tracking_status": "actif"}'::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
        kilometrage_actuel = EXCLUDED.kilometrage_actuel,
        metadata = EXCLUDED.metadata;

    -- 6. Véhicule 2 : Renault Espace V (272 448 km)
    INSERT INTO public.vehicules (
        id, foyer_id, immatriculation, vin, marque, modele, version,
        annee_mise_en_circulation, date_premiere_immatriculation, kilometrage_actuel,
        date_releve_kilometrage, energie, boite_vitesse, usage_type, km_annuel_moyen, statut, metadata
    )
    VALUES (
        v_espace_id, v_foyer_id, 'FX-563-KZ', 'VF1RFC00865912345', 'Renault', 'Espace V',
        'Initiale Paris 1.8 TCe 225 EDC', 2021, '2021-04-12', 272448, '2026-08-25',
        'essence', 'automatique', 'quotidien', 15000, 'actif',
        '{"image_url": "/images/vehicles/renault-espace-noir-etoile-2021.jpg", "tracking_status": "actif"}'::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
        kilometrage_actuel = EXCLUDED.kilometrage_actuel,
        metadata = EXCLUDED.metadata;

    -- 7. Véhicule 3 : Renault Clio III (160 000 km)
    INSERT INTO public.vehicules (
        id, foyer_id, immatriculation, vin, marque, modele, version,
        annee_mise_en_circulation, date_premiere_immatriculation, kilometrage_actuel,
        date_releve_kilometrage, energie, boite_vitesse, usage_type, km_annuel_moyen, statut, metadata
    )
    VALUES (
        v_clio_id, v_foyer_id, 'GP-902-NY', 'VF1BR1B0H12345678', 'Renault', 'Clio III',
        '1.4 16V 98ch Dynamique', 2007, '2007-09-17', 160000, '2026-08-24',
        'essence', 'manuelle', 'secondaire', 9000, 'actif',
        '{"image_url": "/images/vehicles/renault-clio-2007.jpg", "tracking_status": "actif"}'::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
        kilometrage_actuel = EXCLUDED.kilometrage_actuel,
        metadata = EXCLUDED.metadata;

    -- 8. Véhicule 4 : Jeep Cherokee SJ (89 000 km, 1981)
    INSERT INTO public.vehicules (
        id, foyer_id, immatriculation, vin, marque, modele, version,
        annee_mise_en_circulation, date_premiere_immatriculation, kilometrage_actuel,
        date_releve_kilometrage, energie, boite_vitesse, usage_type, km_annuel_moyen, statut, metadata
    )
    VALUES (
        v_jeep_id, v_foyer_id, '7253 XX 76', '1JCCC87A0BT123456', 'Jeep', 'Cherokee (SJ)',
        'Chief 4.2L 258ci 4x4', 1981, '1981-05-10', 89000, '2026-08-25',
        'essence', 'manuelle', 'collection', 2500, 'actif',
        '{"image_url": "/images/vehicles/jeep-cherokee-1981.jpg", "tracking_status": "actif"}'::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
        kilometrage_actuel = EXCLUDED.kilometrage_actuel,
        metadata = EXCLUDED.metadata;

    -- 8.bis Garages Référencés
    INSERT INTO public.garages (id, foyer_id, nom, adresse, telephone, email, marque, siret, metadata)
    VALUES
    (
        '55555555-5555-5555-5555-555555555551',
        v_foyer_id,
        'SARL GARAGE HELIERE C. & S.',
        NULL,
        NULL,
        NULL,
        'Multimarque / Agent Réparateur',
        '49995278600014',
        '{"extracted_from_invoice": true, "siret": "49995278600014"}'::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
        nom = EXCLUDED.nom,
        siret = EXCLUDED.siret,
        marque = EXCLUDED.marque;

END $$;


