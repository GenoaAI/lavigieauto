-- ============================================================================
-- AutoCare AI — Seed de Données pour le compte : charlesdeforges@gmail.com
-- ============================================================================

-- 1. Sécurité : S'assurer que la colonne metadata existe dans foyers
ALTER TABLE public.foyers ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

DO $$
DECLARE
    v_user_id UUID;
    v_foyer_id UUID := '11111111-1111-1111-1111-111111111111';
    v_vehicule_1_id UUID := '22222222-2222-2222-2222-222222222222';
    v_vehicule_2_id UUID := '33333333-3333-3333-3333-333333333333';
    v_doc_1_id UUID := '44444444-4444-4444-4444-444444444444';
BEGIN
    -- 2. Récupérer l'ID utilisateur si existant dans auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'charlesdeforges@gmail.com' LIMIT 1;

    -- Si l'utilisateur n'a pas encore créé son compte, on le pré-enregistre dans auth.users
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
            crypt('AutoCare2026!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::JSONB,
            '{"full_name":"Charles Deforges"}'::JSONB,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 3. Création du Foyer "Foyer Charles Deforges"
    INSERT INTO public.foyers (id, nom, description, metadata)
    VALUES (
        v_foyer_id,
        'Foyer Charles Deforges',
        'Compte principal AutoCare Foyer Multi-Véhicules',
        '{"stripe_subscription_status": "active", "plan": "foyer_2_vehicules", "calendar_synced": true}'::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
        nom = EXCLUDED.nom,
        metadata = EXCLUDED.metadata;

    -- 4. Association du Membre Propriétaire (si présent dans auth.users)
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
        INSERT INTO public.foyer_members (foyer_id, user_id, role)
        VALUES (v_foyer_id, v_user_id, 'owner')
        ON CONFLICT (foyer_id, user_id) DO NOTHING;
    END IF;

    -- 5. Véhicule 1 : Peugeot 3008 (Véhicule principal)
    INSERT INTO public.vehicules (
        id, foyer_id, immatriculation, vin, marque, modele, version,
        annee_mise_en_circulation, date_premiere_immatriculation, kilometrage_actuel,
        date_releve_kilometrage, energie, boite_vitesse, usage_type, km_annuel_moyen, statut
    )
    VALUES (
        v_vehicule_1_id,
        v_foyer_id,
        'XX-123-YY',
        'VF3MCXXXXXXXXXX',
        'Peugeot',
        '3008',
        '1.2 PureTech 130ch Allure EAT8',
        2021,
        '2021-04-12',
        58400,
        CURRENT_DATE,
        'essence',
        'automatique',
        'quotidien',
        14200,
        'actif'
    )
    ON CONFLICT (id) DO UPDATE SET
        kilometrage_actuel = EXCLUDED.kilometrage_actuel,
        statut = EXCLUDED.statut;

    -- 6. Véhicule 2 : Renault Clio V (Second véhicule du foyer)
    INSERT INTO public.vehicules (
        id, foyer_id, immatriculation, vin, marque, modele, version,
        annee_mise_en_circulation, date_premiere_immatriculation, kilometrage_actuel,
        date_releve_kilometrage, energie, boite_vitesse, usage_type, km_annuel_moyen, statut
    )
    VALUES (
        v_vehicule_2_id,
        v_foyer_id,
        'AB-789-CD',
        'VF1RXXXXXXXXXXX',
        'Renault',
        'Clio V',
        'TCe 90 Intens',
        2022,
        '2022-11-20',
        34200,
        CURRENT_DATE,
        'essence',
        'manuelle',
        'secondaire',
        11000,
        'actif'
    )
    ON CONFLICT (id) DO UPDATE SET
        kilometrage_actuel = EXCLUDED.kilometrage_actuel,
        statut = EXCLUDED.statut;

    -- 7. Document Source & Facture Révision Passée (Peugeot 3008)
    INSERT INTO public.documents_sources (
        id, foyer_id, vehicule_id, nom_fichier, storage_path, file_type,
        date_document, kilometrage_document, emetteur, montant_ttc, statut_ocr
    )
    VALUES (
        v_doc_1_id,
        v_foyer_id,
        v_vehicule_1_id,
        'facture_revision_45000.pdf',
        'factures/peugeot_3008_45k.pdf',
        'facture',
        '2025-09-14',
        45200,
        'Garage Peugeot des Lilas',
        310.50,
        'traite'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 8. Lignes d'intervention associées
    INSERT INTO public.lignes_interventions (
        foyer_id, vehicule_id, document_source_id, date_intervention, kilometrage_intervention,
        categorie, operation, description, prix_total_ttc
    )
    VALUES
        (v_foyer_id, v_vehicule_1_id, v_doc_1_id, '2025-09-14', 45200, 'revision_generale', 'Forfait Révision', 'Forfait Révision Constructeur 45 000 km', 180.00),
        (v_foyer_id, v_vehicule_1_id, v_doc_1_id, '2025-09-14', 45200, 'moteur', 'Vidange & filtre', 'Vidange huile synthèse 5W30 PSA B71 2297 & filtre', 85.50),
        (v_foyer_id, v_vehicule_1_id, v_doc_1_id, '2025-09-14', 45200, 'freinage', 'Purge frein', 'Purge & remplacement liquide de frein DOT4', 45.00)
    ON CONFLICT DO NOTHING;

    -- 9. Prochaine Échéance Prévisionnelle (Alerte J-26 dans Google Calendar)
    INSERT INTO public.echeances_previsionnelles (
        foyer_id, vehicule_id, type_echeance, libelle, description,
        date_preconisee, km_preconise, date_limite, km_limite, statut, criticite,
        cout_estime_min, cout_estime_max, source_recommandation
    )
    VALUES (
        v_foyer_id,
        v_vehicule_1_id,
        'revision',
        'Révision des 60 000 km (Geste 1 & 2)',
        'Vidange huile 5W30, bougies d''allumage, filtre à air et contrôle circuit de freinage.',
        CURRENT_DATE + INTERVAL '26 days',
        60000,
        CURRENT_DATE + INTERVAL '45 days',
        62000,
        'a_venir',
        'moyenne',
        240.00,
        310.00,
        'constructeur'
    )
    ON CONFLICT DO NOTHING;

    -- 10. Audit & Score de Conformité Certifié (94% - Grade A+)
    INSERT INTO public.audits_conformite (
        foyer_id, vehicule_id, score_sante, statut_ct_conforme,
        historique_complet, alertes_actives, resume_synthetique,
        recommandations, anomalies_detectees, date_audit, audit_par
    )
    VALUES (
        v_foyer_id,
        v_vehicule_1_id,
        94,
        TRUE,
        TRUE,
        0,
        'Suivi Constructeur Exemplaire (Grade A+). Véhicule valorisé de +8% à la revente.',
        '["Prévoir la révision des 60 000 km", "Vérifier le carnet tamponné lors du prochain passage atelier"]'::JSONB,
        '[]'::JSONB,
        NOW(),
        'ia_vigie'
    )
    ON CONFLICT DO NOTHING;

END $$;
