-- =====================================================================
-- COMPTES DE DÉMONSTRATION OFFICIELS & DONNÉES COHÉRENTES
-- PRÉSENTATION AU BUREAU NATIONAL DES ASCQ DU BÉNIN
-- Date : 02 Novembre 2026
-- Mot de passe universel pour tous les comptes démo : Demo2026!
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EXTENSIONS & AJOUT DES COLONNES MANQUANTES SUR LES TABLES
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Ajout sécurisé des colonnes sur public.utilisateurs (si non créées)
ALTER TABLE public.utilisateurs 
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS role_nomination TEXT,
    ADD COLUMN IF NOT EXISTS poste_autre TEXT,
    ADD COLUMN IF NOT EXISTS second_arrondissement_id UUID REFERENCES public.arrondissements(id);

CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON public.utilisateurs(email);

-- Assouplissement total des contraintes sur public.utilisateurs pour accepter tous les rôles nationaux et cadres
ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_poste_check;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_poste_check 
    CHECK (poste IS NOT NULL AND length(trim(poste)) > 0);

ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_technique_check;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_role_technique_check 
    CHECK (role_technique IS NOT NULL AND length(trim(role_technique)) > 0);

ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_statut_compte_check;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_statut_compte_check 
    CHECK (statut_compte IS NOT NULL AND length(trim(statut_compte)) > 0);

-- Colonnes territoriales sur consultations_communautaires
ALTER TABLE public.consultations_communautaires 
    ADD COLUMN IF NOT EXISTS commune_id UUID REFERENCES public.communes(id),
    ADD COLUMN IF NOT EXISTS arrondissement_id UUID REFERENCES public.arrondissements(id),
    ADD COLUMN IF NOT EXISTS departement_id UUID REFERENCES public.departements(id),
    ADD COLUMN IF NOT EXISTS zone_sanitaire_id UUID REFERENCES public.zones_sanitaires(id);

-- Colonnes sur relais_communautaires & ascq_profils
ALTER TABLE public.relais_communautaires 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS arrondissement_id UUID REFERENCES public.arrondissements(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS nom TEXT,
    ADD COLUMN IF NOT EXISTS prenoms TEXT,
    ADD COLUMN IF NOT EXISTS telephone TEXT,
    ADD COLUMN IF NOT EXISTS village_nom TEXT,
    ADD COLUMN IF NOT EXISTS grappe INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS code_acces_temporaire TEXT DEFAULT '0000',
    ADD COLUMN IF NOT EXISTS code_temporaire_utilise BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'ACTIF';

DO $$
BEGIN
    ALTER TABLE public.relais_communautaires ALTER COLUMN nom DROP NOT NULL;
    ALTER TABLE public.relais_communautaires ALTER COLUMN prenoms DROP NOT NULL;
    ALTER TABLE public.relais_communautaires ALTER COLUMN telephone DROP NOT NULL;
    ALTER TABLE public.relais_communautaires ALTER COLUMN code_acces_temporaire DROP NOT NULL;
    ALTER TABLE public.relais_communautaires ALTER COLUMN code_temporaire_utilise DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

ALTER TABLE public.ascq_profils 
    ADD COLUMN IF NOT EXISTS afficher_annuaire_public BOOLEAN DEFAULT TRUE;

-- ---------------------------------------------------------------------
-- 2. FONCTION D'AIDE DYNAMIQUE (ÉVITE TOUTE ERREUR DE COMPILATION 42703)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inserer_utilisateur_demo(
    p_id UUID,
    p_telephone TEXT,
    p_email TEXT,
    p_nom TEXT,
    p_prenoms TEXT,
    p_poste TEXT,
    p_role_technique TEXT,
    p_role_nomination TEXT,
    p_dep_id UUID,
    p_zs_id UUID,
    p_com_id UUID,
    p_arr_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $helper$
BEGIN
    EXECUTE '
    INSERT INTO public.utilisateurs (
        id, telephone, email, nom, prenoms, poste, role_technique, role_nomination, statut_compte,
        departement_id, zone_sanitaire_id, commune_id, arrondissement_id, date_validation, created_at, updated_at
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, ''VALIDE'', $9, $10, $11, $12, NOW(), NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        telephone = EXCLUDED.telephone,
        email = EXCLUDED.email,
        nom = EXCLUDED.nom,
        prenoms = EXCLUDED.prenoms,
        poste = EXCLUDED.poste,
        role_technique = EXCLUDED.role_technique,
        role_nomination = EXCLUDED.role_nomination,
        statut_compte = ''VALIDE'',
        departement_id = EXCLUDED.departement_id,
        zone_sanitaire_id = EXCLUDED.zone_sanitaire_id,
        commune_id = EXCLUDED.commune_id,
        arrondissement_id = EXCLUDED.arrondissement_id'
    USING p_id, p_telephone, p_email, p_nom, p_prenoms, p_poste, p_role_technique, p_role_nomination, p_dep_id, p_zs_id, p_com_id, p_arr_id;
END;
$helper$;


-- ---------------------------------------------------------------------
-- 3. PEUPLEMENT DES COMPTES ET DONNÉES DE DÉMONSTRATION
-- ---------------------------------------------------------------------
DO $$
DECLARE
    -- Mot de passe haché pour Demo2026!
    v_password_hash TEXT := extensions.crypt('Demo2026!', extensions.gen_salt('bf'));

    -- Données géographiques pour le ZOU & OUINHI
    v_dep_zou_id UUID;
    v_zs_czo_id UUID;
    v_com_ouinhi_id UUID;
    v_arr_tohoues_id UUID;
    v_arr_dasso_id UUID;

    -- ID de Bruno DOSSOU (Super Admin & Représentant Communal)
    v_bruno_id UUID;

    -- IDs des comptes de démonstration
    v_id_nat UUID := 'd0000000-0000-4000-a000-000000000001'::uuid;
    v_id_ccd_zou UUID := 'd0000000-0000-4000-a000-000000000002'::uuid;
    v_id_rep_zou UUID := 'd0000000-0000-4000-a000-000000000003'::uuid;
    v_id_crams_czo UUID := 'd0000000-0000-4000-a000-000000000004'::uuid;
    v_id_mcc_ouinhi UUID := 'd0000000-0000-4000-a000-000000000005'::uuid;
    v_id_pf_ouinhi UUID := 'd0000000-0000-4000-a000-000000000006'::uuid;
    v_id_ascq_dasso UUID := 'd0000000-0000-4000-a000-000000000007'::uuid;

    -- Relais Dasso
    v_rc_dasso1_uid UUID := 'd0000000-0000-4000-b000-000000000001'::uuid;
    v_rc_dasso2_uid UUID := 'd0000000-0000-4000-b000-000000000002'::uuid;
    v_rc_dasso3_uid UUID := 'd0000000-0000-4000-b000-000000000003'::uuid;

    -- Variables temporaires pour boucle départements
    v_dep_cur RECORD;
    v_dep_id UUID;
    v_zs_id UUID;
    v_com_id UUID;
    v_arr_id UUID;
    v_ascq_id UUID;
    v_rc1_id UUID;
    v_rc2_id UUID;
    v_counter INT := 10;
    v_annee INT := 2026;
    v_mois INT := 10;
    v_semaine INT := 44;

    -- RC de Tohouès pour Bruno
    v_rc_tohoues RECORD;
    v_rc_counter INT := 0;
BEGIN
    RAISE NOTICE 'Démarrage du peuplement des comptes de démonstration pour le Bureau National...';

    -- -----------------------------------------------------------------
    -- A. LOCALISATION DU ZOU & DE OUINHI
    -- -----------------------------------------------------------------
    SELECT id INTO v_dep_zou_id FROM public.departements WHERE nom = 'ZOU' LIMIT 1;
    SELECT id INTO v_com_ouinhi_id FROM public.communes WHERE nom = 'OUINHI' AND departement_id = v_dep_zou_id LIMIT 1;
    SELECT id INTO v_zs_czo_id FROM public.zones_sanitaires WHERE nom ILIKE '%COVE-ZAGNANADO-OUINHI%' LIMIT 1;
    SELECT id INTO v_arr_tohoues_id FROM public.arrondissements WHERE nom = 'TOHOUES' AND commune_id = v_com_ouinhi_id LIMIT 1;
    SELECT id INTO v_arr_dasso_id FROM public.arrondissements WHERE nom = 'DASSO' AND commune_id = v_com_ouinhi_id LIMIT 1;

    -- Récupérer l'ID réel de Bruno DOSSOU
    SELECT id INTO v_bruno_id FROM public.utilisateurs WHERE telephone LIKE '%69031463%' LIMIT 1;

    IF v_bruno_id IS NOT NULL THEN
        -- S'assurer que Bruno a le cumul ASCQ Terrain + Représentant Communal Ouinhi
        UPDATE public.utilisateurs
        SET role_nomination = 'REPRESENTANT_COMMUNAL',
            commune_id = v_com_ouinhi_id,
            departement_id = v_dep_zou_id,
            zone_sanitaire_id = v_zs_czo_id,
            arrondissement_id = v_arr_tohoues_id
        WHERE id = v_bruno_id;

        RAISE NOTICE 'Compte Bruno DOSSOU configuré avec rôle Représentant Communal Ouinhi.';
    END IF;

    -- -----------------------------------------------------------------
    -- B. CRÉATION DU COMPTE NIVEAU NATIONAL (OBSERVATEUR BUREAU NATIONAL)
    -- -----------------------------------------------------------------
    -- Email : bureau.national@demo-ascq.bj | Tél : +2290199000000 | Mdp : Demo2026!
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
    ) VALUES (
        v_id_nat, '00000000-0000-0000-0000-000000000000', 'bureau.national@demo-ascq.bj',
        v_password_hash, NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('nom', 'HOUNSOU', 'prenoms', 'Jérémie', 'telephone', '+2290199000000', 'poste', 'SUPER_ADMIN', 'is_demo', true),
        'authenticated', 'authenticated', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        encrypted_password = EXCLUDED.encrypted_password,
        email = EXCLUDED.email,
        email_confirmed_at = NOW();

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id_nat, jsonb_build_object('sub', v_id_nat::text, 'email', 'bureau.national@demo-ascq.bj'), 'email', v_id_nat::text, NOW(), NOW(), NOW())
    ON CONFLICT (provider, provider_id) DO NOTHING;

    PERFORM public.inserer_utilisateur_demo(
        v_id_nat, '+2290199000000', 'bureau.national@demo-ascq.bj', 'HOUNSOU', 'Jérémie (Président National)',
        'SUPER_ADMIN', 'SUPER_ADMIN', 'RESPONSABLE_NATIONAL',
        NULL, NULL, NULL, NULL
    );

    -- -----------------------------------------------------------------
    -- C. CRÉATION DU COMPTE CCD CDLS-TP ZOU (CHEF CELLULE DÉPARTEMENTALE)
    -- -----------------------------------------------------------------
    -- Email : ccd.zou@demo-ascq.bj | Tél : +2290199000007 | Mdp : Demo2026!
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
    ) VALUES (
        v_id_ccd_zou, '00000000-0000-0000-0000-000000000000', 'ccd.zou@demo-ascq.bj',
        v_password_hash, NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('nom', 'AGBOSSA', 'prenoms', 'Symphorien', 'telephone', '+2290199000007', 'poste', 'CCD_CDLS_TP', 'is_demo', true),
        'authenticated', 'authenticated', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password, email = EXCLUDED.email;

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id_ccd_zou, jsonb_build_object('sub', v_id_ccd_zou::text, 'email', 'ccd.zou@demo-ascq.bj'), 'email', v_id_ccd_zou::text, NOW(), NOW(), NOW())
    ON CONFLICT (provider, provider_id) DO NOTHING;

    PERFORM public.inserer_utilisateur_demo(
        v_id_ccd_zou, '+2290199000007', 'ccd.zou@demo-ascq.bj', 'AGBOSSA', 'Symphorien',
        'CCD_CDLS_TP', 'CADRE_DEPARTEMENTAL', 'RESPONSABLE_DEPARTEMENTAL',
        v_dep_zou_id, NULL, NULL, NULL
    );

    -- -----------------------------------------------------------------
    -- D. CRÉATION DU COMPTE REPRÉSENTANT DÉPARTEMENTAL ZOU DES ASCQ
    -- -----------------------------------------------------------------
    -- Email : rep.zou@demo-ascq.bj | Tél : +2290199000006 | Mdp : Demo2026!
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
    ) VALUES (
        v_id_rep_zou, '00000000-0000-0000-0000-000000000000', 'rep.zou@demo-ascq.bj',
        v_password_hash, NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('nom', 'TOSSOU', 'prenoms', 'Marcellin', 'telephone', '+2290199000006', 'poste', 'ASCQ', 'is_demo', true),
        'authenticated', 'authenticated', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password, email = EXCLUDED.email;

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id_rep_zou, jsonb_build_object('sub', v_id_rep_zou::text, 'email', 'rep.zou@demo-ascq.bj'), 'email', v_id_rep_zou::text, NOW(), NOW(), NOW())
    ON CONFLICT (provider, provider_id) DO NOTHING;

    PERFORM public.inserer_utilisateur_demo(
        v_id_rep_zou, '+2290199000006', 'rep.zou@demo-ascq.bj', 'TOSSOU', 'Marcellin',
        'ASCQ', 'REPRESENTANT_DEPARTEMENTAL', 'REPRESENTANT_DEPARTEMENTAL',
        v_dep_zou_id, NULL, NULL, NULL
    );

    -- -----------------------------------------------------------------
    -- E. CRÉATION DU COMPTE C-RAMS ZONE SANITAIRE (COVÈ-ZAGNANADO-OUINHI)
    -- -----------------------------------------------------------------
    -- Email : crams.czo@demo-ascq.bj | Tél : +2290199000005 | Mdp : Demo2026!
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
    ) VALUES (
        v_id_crams_czo, '00000000-0000-0000-0000-000000000000', 'crams.czo@demo-ascq.bj',
        v_password_hash, NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('nom', 'BIO', 'prenoms', 'Chabi', 'telephone', '+2290199000005', 'poste', 'C_RAMS', 'is_demo', true),
        'authenticated', 'authenticated', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password, email = EXCLUDED.email;

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id_crams_czo, jsonb_build_object('sub', v_id_crams_czo::text, 'email', 'crams.czo@demo-ascq.bj'), 'email', v_id_crams_czo::text, NOW(), NOW(), NOW())
    ON CONFLICT (provider, provider_id) DO NOTHING;

    PERFORM public.inserer_utilisateur_demo(
        v_id_crams_czo, '+2290199000005', 'crams.czo@demo-ascq.bj', 'BIO', 'Chabi',
        'C_RAMS', 'CADRE_ZONE_SANITAIRE', 'RESPONSABLE_ZONE_SANITAIRE',
        v_dep_zou_id, v_zs_czo_id, NULL, NULL
    );

    -- -----------------------------------------------------------------
    -- F. CRÉATION DU COMPTE MÉDECIN CHEF COMMUNE (MCC OUINHI)
    -- -----------------------------------------------------------------
    -- Email : mcc.ouinhi@demo-ascq.bj | Tél : +2290199000004 | Mdp : Demo2026!
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
    ) VALUES (
        v_id_mcc_ouinhi, '00000000-0000-0000-0000-000000000000', 'mcc.ouinhi@demo-ascq.bj',
        v_password_hash, NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('nom', 'KOUDJO', 'prenoms', 'Dr. Arnaud', 'telephone', '+2290199000004', 'poste', 'MCC', 'is_demo', true),
        'authenticated', 'authenticated', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password, email = EXCLUDED.email;

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id_mcc_ouinhi, jsonb_build_object('sub', v_id_mcc_ouinhi::text, 'email', 'mcc.ouinhi@demo-ascq.bj'), 'email', v_id_mcc_ouinhi::text, NOW(), NOW(), NOW())
    ON CONFLICT (provider, provider_id) DO NOTHING;

    PERFORM public.inserer_utilisateur_demo(
        v_id_mcc_ouinhi, '+2290199000004', 'mcc.ouinhi@demo-ascq.bj', 'KOUDJO', 'Dr. Arnaud',
        'MCC', 'CADRE_COMMUNAL', 'RESPONSABLE_COMMUNAL',
        v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, NULL
    );

    -- -----------------------------------------------------------------
    -- G. CRÉATION DU COMPTE POINT FOCAL SANTÉ MAIRIE (PF CCLS-TP OUINHI)
    -- -----------------------------------------------------------------
    -- Email : pf.ouinhi@demo-ascq.bj | Tél : +2290199000003 | Mdp : Demo2026!
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
    ) VALUES (
        v_id_pf_ouinhi, '00000000-0000-0000-0000-000000000000', 'pf.ouinhi@demo-ascq.bj',
        v_password_hash, NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('nom', 'ADANHO', 'prenoms', 'Clarisse', 'telephone', '+2290199000003', 'poste', 'PF_CCLS_TP', 'is_demo', true),
        'authenticated', 'authenticated', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password, email = EXCLUDED.email;

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id_pf_ouinhi, jsonb_build_object('sub', v_id_pf_ouinhi::text, 'email', 'pf.ouinhi@demo-ascq.bj'), 'email', v_id_pf_ouinhi::text, NOW(), NOW(), NOW())
    ON CONFLICT (provider, provider_id) DO NOTHING;

    PERFORM public.inserer_utilisateur_demo(
        v_id_pf_ouinhi, '+2290199000003', 'pf.ouinhi@demo-ascq.bj', 'ADANHO', 'Clarisse',
        'PF_CCLS_TP', 'CADRE_COMMUNAL', 'RESPONSABLE_COMMUNAL',
        v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, NULL
    );

    -- -----------------------------------------------------------------
    -- H. CRÉATION DE L'ASCQ DE DASSO (COMMUNE DE OUINHI)
    -- -----------------------------------------------------------------
    -- Email : ascq.dasso@demo-ascq.bj | Tél : +2290199000002 | Mdp : Demo2026!
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
    ) VALUES (
        v_id_ascq_dasso, '00000000-0000-0000-0000-000000000000', 'ascq.dasso@demo-ascq.bj',
        v_password_hash, NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('nom', 'KPODANHO', 'prenoms', 'Gérard', 'telephone', '+2290199000002', 'poste', 'ASCQ', 'is_demo', true),
        'authenticated', 'authenticated', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password, email = EXCLUDED.email;

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id_ascq_dasso, jsonb_build_object('sub', v_id_ascq_dasso::text, 'email', 'ascq.dasso@demo-ascq.bj'), 'email', v_id_ascq_dasso::text, NOW(), NOW(), NOW())
    ON CONFLICT (provider, provider_id) DO NOTHING;

    PERFORM public.inserer_utilisateur_demo(
        v_id_ascq_dasso, '+2290199000002', 'ascq.dasso@demo-ascq.bj', 'KPODANHO', 'Gérard',
        'ASCQ', 'ASCQ_OPERATEUR', NULL,
        v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_dasso_id
    );

    INSERT INTO public.ascq_profils (id, source_financement, nombre_rc, afficher_annuaire_public, cumul_deux_arrondissements)
    VALUES (v_id_ascq_dasso, 'LLF', 3, true, false)
    ON CONFLICT (id) DO UPDATE SET nombre_rc = 3, afficher_annuaire_public = true;

    -- Création des 3 Relais Communautaires de Dasso
    PERFORM public.inserer_utilisateur_demo(v_rc_dasso1_uid, '+2290199010001', 'rc.dasso1@demo-ascq.bj', 'SOSSOU', 'Mathias', 'RC', 'RELAIS', NULL, v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_dasso_id);
    PERFORM public.inserer_utilisateur_demo(v_rc_dasso2_uid, '+2290199010002', 'rc.dasso2@demo-ascq.bj', 'AGBO', 'Colette', 'RC', 'RELAIS', NULL, v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_dasso_id);
    PERFORM public.inserer_utilisateur_demo(v_rc_dasso3_uid, '+2290199010003', 'rc.dasso3@demo-ascq.bj', 'HOUNKPE', 'Félicien', 'RC', 'RELAIS', NULL, v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_dasso_id);

    DELETE FROM public.relais_communautaires WHERE user_id IN (v_rc_dasso1_uid, v_rc_dasso2_uid, v_rc_dasso3_uid);

    INSERT INTO public.relais_communautaires (
        id, user_id, ascq_id, nom, prenoms, telephone, village_nom, grappe, code_acces_temporaire, code_temporaire_utilise, actif, statut
    ) VALUES 
        (gen_random_uuid(), v_rc_dasso1_uid, v_id_ascq_dasso, 'SOSSOU', 'Mathias', '+2290199010001', 'Dasso Centre', 1, '0000', true, true, 'ACTIF'),
        (gen_random_uuid(), v_rc_dasso2_uid, v_id_ascq_dasso, 'AGBO', 'Colette', '+2290199010002', 'Gbèkô', 2, '0000', true, true, 'ACTIF'),
        (gen_random_uuid(), v_rc_dasso3_uid, v_id_ascq_dasso, 'HOUNKPE', 'Félicien', '+2290199010003', 'Ahito', 1, '0000', true, true, 'ACTIF');

    -- Fiches d'activités hebdomadaires des RC de Dasso
    INSERT INTO public.fiches_activites_hebdo_relais (
        id, relais_id, ascq_id, departement_id, zone_sanitaire_id, commune_id, arrondissement_id,
        village_nom, grappe, semaine_du, annee, semaine_num, nbre_vad_prevu, nbre_vad_realise, nbre_menages_visites,
        total_menages_en_charge, nbre_causeries, themes_causeries, femmes_enceintes_suivies, enfants_0_59_suivis,
        personnes_referees, lu_et_approuve_ascq, date_approbation_ascq, created_at
    ) VALUES 
        (gen_random_uuid(), v_rc_dasso1_uid, v_id_ascq_dasso, v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_dasso_id, 'Dasso Centre', 1, CURRENT_DATE - 7, v_annee, v_semaine, 15, 14, 14, 45, 2, 'Lavage des mains et prévention choléra', 4, 12, 1, true, NOW(), NOW() - INTERVAL '3 days'),
        (gen_random_uuid(), v_rc_dasso2_uid, v_id_ascq_dasso, v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_dasso_id, 'Gbèkô', 2, CURRENT_DATE - 7, v_annee, v_semaine, 12, 12, 12, 38, 2, 'Dépistage précoce du paludisme', 3, 15, 2, true, NOW(), NOW() - INTERVAL '2 days'),
        (gen_random_uuid(), v_rc_dasso3_uid, v_id_ascq_dasso, v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_dasso_id, 'Ahito', 1, CURRENT_DATE - 7, v_annee, v_semaine, 14, 13, 13, 40, 1, 'Utilisation des moustiquaires MILDA', 5, 11, 1, true, NOW(), NOW() - INTERVAL '1 day')
    ON CONFLICT DO NOTHING;

    -- Consultations iCCM Dasso
    INSERT INTO public.consultations_communautaires (
        id, ascq_id, ascq_nom, date_consultation, village, nom_patient, prenoms_patient, age_valeur, age_unite, sexe,
        signe_principal, tdr_paludisme, diagnostic_possible, decision, departement_id, zone_sanitaire_id, commune_id, arrondissement_id
    ) VALUES
        (gen_random_uuid(), v_id_ascq_dasso, 'Gérard KPODANHO', CURRENT_DATE - 5, 'Dasso Centre', 'BIO (TEST)', 'Koffi', 3, 'ANS', 'M', 'Fièvre chaude', 'POSITIF', 'Paludisme simple', 'PRISE_EN_CHARGE_COMMUNAUTAIRE', v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_dasso_id),
        (gen_random_uuid(), v_id_ascq_dasso, 'Gérard KPODANHO', CURRENT_DATE - 4, 'Gbèkô', 'SOSSOU (TEST)', 'Ami', 2, 'ANS', 'F', 'Diarrhée aqueuse', 'NEGATIF', 'Diarrhée simple déshydratation légère', 'PRISE_EN_CHARGE_COMMUNAUTAIRE', v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_dasso_id),
        (gen_random_uuid(), v_id_ascq_dasso, 'Gérard KPODANHO', CURRENT_DATE - 3, 'Dasso Centre', 'DOSSOU (TEST)', 'Paul', 4, 'ANS', 'M', 'Fièvre et frissons', 'POSITIF', 'Paludisme simple', 'PRISE_EN_CHARGE_COMMUNAUTAIRE', v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_dasso_id),
        (gen_random_uuid(), v_id_ascq_dasso, 'Gérard KPODANHO', CURRENT_DATE - 2, 'Ahito', 'AGOSSOU (TEST)', 'Céline', 18, 'MOIS', 'F', 'Toux rapide et tirage', 'NEGATIF', 'Infection Respiratoire Aiguë (Pneumonie)', 'PRISE_EN_CHARGE_COMMUNAUTAIRE', v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_dasso_id),
        (gen_random_uuid(), v_id_ascq_dasso, 'Gérard KPODANHO', CURRENT_DATE - 1, 'Gbèkô', 'HOUNTO (TEST)', 'Béatrice', 8, 'MOIS', 'F', 'Fièvre et refus de téter', 'POSITIF', 'Paludisme grave', 'REFERER_CS', v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_dasso_id)
    ON CONFLICT DO NOTHING;

    -- 1 Alerte SIMR Dasso (Choléra suspect)
    INSERT INTO public.alertes_communautaires (
        id, numero_alerte, annee, semaine_epidemio, mois, date_notification, date_debut_maladie, date_detection,
        departement_id, zone_sanitaire_id, commune_id, arrondissement_id, village_nom,
        type_alerte_code, type_alerte_nom, est_prioritaire, nb_personnes_touchees, nb_personnes_mortes,
        mesures_prises, sexe, age_valeur, age_unite, notificateur_id, notificateur_nom_complet, notificateur_titre,
        notificateur_telephone, ascq_superviseur_id, statut, centre_sante_nom
    ) VALUES (
        gen_random_uuid(), 'ALR-2026-DASSO-001', v_annee, v_semaine, v_mois, CURRENT_DATE - 3, CURRENT_DATE - 4, CURRENT_DATE - 3,
        v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_dasso_id, 'Dasso Centre',
        2, 'Choléra', true, 2, 0,
        'Isolation du patient, distribution de chlore pour désinfection des puits et référence d''urgence au CSC Ouinhi',
        'M', 28, 'ANS', v_rc_dasso1_uid, 'Mathias SOSSOU', 'RC', '+2290199010001', v_id_ascq_dasso, 'VERIFIEE_VRAIE', 'CSC OUINHI'
    ) ON CONFLICT DO NOTHING;

    -- RMA Octobre validé pour Dasso
    INSERT INTO public.rapports_mensuels_ascq (
        id, numero_rapport, ascq_id, mois, annee, statut, echeance_date, date_validation,
        departement_id, commune_id, arrondissement_id, arrondissement_nom, commune_nom,
        rc_en_charge, rc_actifs, menages_en_charge, menages_visites, personnes_touchees_total,
        enfants_0_5_ans, femmes_enceintes, cas_diarrhee, cas_ira, cas_palu_tdr_positif,
        donnees_surveillance
    ) VALUES (
        gen_random_uuid(), 'RMA-2026-10-DASSO', v_id_ascq_dasso, 10, 2026, 'VALIDE', '2026-11-03', NOW() - INTERVAL '1 day',
        v_dep_zou_id, v_com_ouinhi_id, v_arr_dasso_id, 'DASSO', 'OUINHI',
        3, 3, 123, 118, 560,
        185, 42, 6, 4, 21,
        '{"cholera": 1, "rougeole": 0, "deces_neonatal": 0}'::jsonb
    ) ON CONFLICT DO NOTHING;


    -- -----------------------------------------------------------------
    -- I. GESTION DES RELAIS ET DONNÉES DE TOHOUÈS (BRUNO DOSSOU)
    -- -----------------------------------------------------------------
    IF v_bruno_id IS NOT NULL THEN
        -- Rattacher tous les RC existants de Tohouès à Bruno
        UPDATE public.relais_communautaires
        SET ascq_id = v_bruno_id,
            actif = true,
            statut = 'ACTIF'
        WHERE user_id IN (
            SELECT id FROM public.utilisateurs 
            WHERE arrondissement_id = v_arr_tohoues_id AND poste = 'RC'
        );

        -- Insérer dans relais_communautaires les RC de Tohouès qui n'y figurent pas encore
        INSERT INTO public.relais_communautaires (
            id, user_id, ascq_id, nom, prenoms, telephone, village_nom, grappe, code_acces_temporaire, code_temporaire_utilise, actif, statut
        )
        SELECT 
            gen_random_uuid(), u.id, v_bruno_id, u.nom, u.prenoms, u.telephone, 'Tohouès Centre', 1, '0000', true, true, 'ACTIF'
        FROM public.utilisateurs u
        WHERE u.arrondissement_id = v_arr_tohoues_id 
          AND u.poste = 'RC'
          AND NOT EXISTS (
              SELECT 1 FROM public.relais_communautaires r WHERE r.user_id = u.id
          );

        -- Créer des fiches d'activités hebdomadaires pour les RC de Tohouès
        FOR v_rc_tohoues IN (
            SELECT u.id, u.nom, u.prenoms, u.telephone 
            FROM public.utilisateurs u 
            WHERE u.arrondissement_id = v_arr_tohoues_id AND u.poste = 'RC'
            LIMIT 5
        ) LOOP
            v_rc_counter := v_rc_counter + 1;

            INSERT INTO public.fiches_activites_hebdo_relais (
                id, relais_id, ascq_id, departement_id, zone_sanitaire_id, commune_id, arrondissement_id,
                village_nom, grappe, semaine_du, annee, semaine_num, nbre_vad_prevu, nbre_vad_realise, nbre_menages_visites,
                total_menages_en_charge, nbre_causeries, themes_causeries, femmes_enceintes_suivies, enfants_0_59_suivis,
                personnes_referees, lu_et_approuve_ascq, date_approbation_ascq, created_at
            ) VALUES (
                gen_random_uuid(), v_rc_tohoues.id, v_bruno_id, v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_tohoues_id,
                'Tohouès Secteur ' || v_rc_counter, v_rc_counter, CURRENT_DATE - 7, v_annee, v_semaine,
                15, 14 + (v_rc_counter % 3), 14 + (v_rc_counter % 3), 50, 2,
                'Vaccination infantile et assainissement du cadre de vie',
                5 + (v_rc_counter % 2), 18 + v_rc_counter, 2, true, NOW(), NOW() - INTERVAL '2 days'
            ) ON CONFLICT DO NOTHING;
        END LOOP;

        -- Alertes SIMR pour Tohouès (Rougeole & Fièvre Jaune)
        INSERT INTO public.alertes_communautaires (
            id, numero_alerte, annee, semaine_epidemio, mois, date_notification, date_debut_maladie, date_detection,
            departement_id, zone_sanitaire_id, commune_id, arrondissement_id, village_nom,
            type_alerte_code, type_alerte_nom, est_prioritaire, nb_personnes_touchees, nb_personnes_mortes,
            mesures_prises, sexe, age_valeur, age_unite, notificateur_id, notificateur_nom_complet, notificateur_titre,
            notificateur_telephone, ascq_superviseur_id, statut, centre_sante_nom
        ) VALUES 
            (gen_random_uuid(), 'ALR-2026-TOHOUES-001', v_annee, v_semaine, v_mois, CURRENT_DATE - 4, CURRENT_DATE - 5, CURRENT_DATE - 4,
             v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_tohoues_id, 'Tohouès Centre',
             1, 'Rougeole', true, 1, 0,
             'Isolement à domicile, administration vitamine A, référence vers le CSC Ouinhi', 'M', 3, 'ANS',
             v_bruno_id, 'BRUNO DOSSOU', 'ASCQ', '+2290169031463', v_bruno_id, 'VERIFIEE_VRAIE', 'CSC OUINHI'),
            (gen_random_uuid(), 'ALR-2026-TOHOUES-002', v_annee, v_semaine, v_mois, CURRENT_DATE - 2, CURRENT_DATE - 3, CURRENT_DATE - 2,
             v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_tohoues_id, 'Goutchon',
             7, 'Fièvre Jaune', true, 1, 0,
             'Sensibilisation anti-moustiques, prélèvement transmis pour confirmation', 'F', 24, 'ANS',
             v_bruno_id, 'BRUNO DOSSOU', 'ASCQ', '+2290169031463', v_bruno_id, 'EN_ATTENTE_VERIFICATION', 'CSC OUINHI')
        ON CONFLICT DO NOTHING;

        -- Décès communautaire Tohouès (Néonatal)
        INSERT INTO public.deces_communautaires (
            id, numero_deces, annee, semaine_epidemio, mois, date_deces, date_notification,
            departement_id, zone_sanitaire_id, commune_id, arrondissement_id, village_nom,
            type_deces_code, type_deces_nom, lieu_deces_code, lieu_deces_nom, circonstance_code, circonstance_nom,
            sexe, age_valeur, age_unite, notificateur_id, notificateur_nom_complet, notificateur_titre,
            notificateur_telephone, ascq_superviseur_id, statut, centre_sante_nom
        ) VALUES (
            gen_random_uuid(), 'DEC-2026-TOHOUES-001', v_annee, v_semaine, v_mois, CURRENT_DATE - 6, CURRENT_DATE - 5,
            v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_tohoues_id, 'Tohouès Centre',
            2, 'Décès néonatal (0 à 28 jours)', 1, 'À domicile', 1, 'Détresse respiratoire néonatale à la naissance à domicile',
            'M', 4, 'JOURS', v_bruno_id, 'BRUNO DOSSOU', 'ASCQ', '+2290169031463', v_bruno_id, 'VALIDE', 'CSC OUINHI'
        ) ON CONFLICT DO NOTHING;

        -- Consultations iCCM pour Bruno à Tohouès
        INSERT INTO public.consultations_communautaires (
            id, ascq_id, ascq_nom, date_consultation, village, nom_patient, prenoms_patient, age_valeur, age_unite, sexe,
            signe_principal, tdr_paludisme, diagnostic_possible, decision, departement_id, zone_sanitaire_id, commune_id, arrondissement_id
        ) VALUES
            (gen_random_uuid(), v_bruno_id, 'Bruno DOSSOU', CURRENT_DATE - 6, 'Tohouès Centre', 'KPADONOU (TEST)', 'Jean', 3, 'ANS', 'M', 'Fièvre élevée et céphalées', 'POSITIF', 'Paludisme simple', 'PRISE_EN_CHARGE_COMMUNAUTAIRE', v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_tohoues_id),
            (gen_random_uuid(), v_bruno_id, 'Bruno DOSSOU', CURRENT_DATE - 5, 'Goutchon', 'TOSSOU (TEST)', 'Marthe', 2, 'ANS', 'F', 'Fièvre et vomissements', 'POSITIF', 'Paludisme simple', 'PRISE_EN_CHARGE_COMMUNAUTAIRE', v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_tohoues_id),
            (gen_random_uuid(), v_bruno_id, 'Bruno DOSSOU', CURRENT_DATE - 4, 'Tohouès Centre', 'AGBODJALOU (TEST)', 'Espoir', 14, 'MOIS', 'M', 'Diarrhée liquide fréquente', 'NEGATIF', 'Diarrhée simple sans déshydratation', 'PRISE_EN_CHARGE_COMMUNAUTAIRE', v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_tohoues_id),
            (gen_random_uuid(), v_bruno_id, 'Bruno DOSSOU', CURRENT_DATE - 3, 'Tohouès Centre', 'HOUNSOU (TEST)', 'Grâce', 4, 'ANS', 'F', 'Toux sèche persistante', 'NEGATIF', 'Infection respiratoire aiguë légère', 'PRISE_EN_CHARGE_COMMUNAUTAIRE', v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_tohoues_id),
            (gen_random_uuid(), v_bruno_id, 'Bruno DOSSOU', CURRENT_DATE - 2, 'Goutchon', 'DEGUENON (TEST)', 'Samuel', 5, 'ANS', 'M', 'Fièvre avec frissons intenses', 'POSITIF', 'Paludisme simple', 'PRISE_EN_CHARGE_COMMUNAUTAIRE', v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_tohoues_id),
            (gen_random_uuid(), v_bruno_id, 'Bruno DOSSOU', CURRENT_DATE - 1, 'Tohouès Centre', 'AKPO (TEST)', 'Bénédicte', 1, 'ANS', 'F', 'Fièvre léthargique', 'POSITIF', 'Paludisme grave avec signes de danger', 'REFERER_CS', v_dep_zou_id, v_zs_czo_id, v_com_ouinhi_id, v_arr_tohoues_id)
        ON CONFLICT DO NOTHING;

        -- RMA Octobre validé pour Bruno (Tohouès)
        INSERT INTO public.rapports_mensuels_ascq (
            id, numero_rapport, ascq_id, mois, annee, statut, echeance_date, date_validation,
            departement_id, commune_id, arrondissement_id, arrondissement_nom, commune_nom,
            rc_en_charge, rc_actifs, menages_en_charge, menages_visites, personnes_touchees_total,
            enfants_0_5_ans, femmes_enceintes, cas_diarrhee, cas_ira, cas_palu_tdr_positif,
            donnees_surveillance
        ) VALUES (
            gen_random_uuid(), 'RMA-2026-10-TOHOUES', v_bruno_id, 10, 2026, 'VALIDE', '2026-11-03', NOW() - INTERVAL '2 days',
            v_dep_zou_id, v_com_ouinhi_id, v_arr_tohoues_id, 'TOHOUES', 'OUINHI',
            11, 11, 480, 465, 2350,
            620, 114, 18, 12, 68,
            '{"rougeole": 1, "fievre_jaune": 1, "deces_neonatal": 1}'::jsonb
        ) ON CONFLICT DO NOTHING;

        -- Rapport Hebdo PNSC Bruno
        INSERT INTO public.rapports_hebdo_pnsc (
            id, ascq_id, departement_id, departement_nom, commune_id, commune_nom, arrondissement_id, arrondissement_nom,
            annee, semaine, statut, date_validation, rh_besoins_normes, rh_fonctionnel, motos_mise_a_dispo, motos_fonctionnel,
            ordinateurs_mise_a_dispo, ordinateurs_fonctionnel
        ) VALUES (
            gen_random_uuid(), v_bruno_id, v_dep_zou_id, 'ZOU', v_com_ouinhi_id, 'OUINHI', v_arr_tohoues_id, 'TOHOUES',
            v_annee, v_semaine, 'VALIDE', NOW() - INTERVAL '1 day', 11, 11, 1, 1, 1, 1
        ) ON CONFLICT DO NOTHING;
    END IF;


    -- -----------------------------------------------------------------
    -- J. CRÉATION DES ASCQ POUR LES 11 AUTRES DÉPARTEMENTS DU BÉNIN
    -- -----------------------------------------------------------------
    FOR v_dep_cur IN (
        SELECT id, nom FROM public.departements WHERE nom != 'ZOU' ORDER BY nom
    ) LOOP
        v_counter := v_counter + 1;
        v_ascq_id := ('d0000000-0000-4000-c000-' || LPAD(v_counter::text, 12, '0'))::uuid;
        v_rc1_id := ('d0000000-0000-4000-e000-' || LPAD((v_counter * 2)::text, 12, '0'))::uuid;
        v_rc2_id := ('d0000000-0000-4000-e000-' || LPAD((v_counter * 2 + 1)::text, 12, '0'))::uuid;

        -- Trouver une commune et un arrondissement dans ce département
        SELECT c.id, c.zone_sanitaire_id INTO v_com_id, v_zs_id
        FROM public.communes c 
        WHERE c.departement_id = v_dep_cur.id 
        ORDER BY c.nom 
        LIMIT 1;

        SELECT a.id INTO v_arr_id
        FROM public.arrondissements a 
        WHERE a.commune_id = v_com_id 
        ORDER BY a.nom 
        LIMIT 1;

        -- Auth user pour cet ASCQ départemental
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
        ) VALUES (
            v_ascq_id, '00000000-0000-0000-0000-000000000000',
            'ascq.' || LOWER(v_dep_cur.nom) || '@demo-ascq.bj',
            v_password_hash, NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('nom', 'ASCQ_' || v_dep_cur.nom, 'prenoms', 'Opérateur Démo', 'telephone', '+22901990000' || v_counter, 'poste', 'ASCQ', 'is_demo', true),
            'authenticated', 'authenticated', NOW(), NOW()
        ) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password, email = EXCLUDED.email;

        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
        VALUES (gen_random_uuid(), v_ascq_id, jsonb_build_object('sub', v_ascq_id::text, 'email', 'ascq.' || LOWER(v_dep_cur.nom) || '@demo-ascq.bj'), 'email', v_ascq_id::text, NOW(), NOW(), NOW())
        ON CONFLICT (provider, provider_id) DO NOTHING;

        PERFORM public.inserer_utilisateur_demo(
            v_ascq_id, '+22901990000' || v_counter, 'ascq.' || LOWER(v_dep_cur.nom) || '@demo-ascq.bj',
            'ASCQ ' || v_dep_cur.nom, 'Superviseur Territorial', 'ASCQ', 'ASCQ_OPERATEUR', NULL,
            v_dep_cur.id, v_zs_id, v_com_id, v_arr_id
        );

        INSERT INTO public.ascq_profils (id, source_financement, nombre_rc, afficher_annuaire_public, cumul_deux_arrondissements)
        VALUES (v_ascq_id, 'PNSC', 2, true, false)
        ON CONFLICT (id) DO UPDATE SET nombre_rc = 2, afficher_annuaire_public = true;

        -- 2 Relais Communautaires pour cet ASCQ
        PERFORM public.inserer_utilisateur_demo(v_rc1_id, '+22901991' || LPAD((v_counter * 2)::text, 5, '0'), 'rc1.' || LOWER(v_dep_cur.nom) || '@demo-ascq.bj', 'RELAIS A', v_dep_cur.nom, 'RC', 'RELAIS', NULL, v_dep_cur.id, v_zs_id, v_com_id, v_arr_id);
        PERFORM public.inserer_utilisateur_demo(v_rc2_id, '+22901991' || LPAD((v_counter * 2 + 1)::text, 5, '0'), 'rc2.' || LOWER(v_dep_cur.nom) || '@demo-ascq.bj', 'RELAIS B', v_dep_cur.nom, 'RC', 'RELAIS', NULL, v_dep_cur.id, v_zs_id, v_com_id, v_arr_id);

        DELETE FROM public.relais_communautaires WHERE user_id IN (v_rc1_id, v_rc2_id);

        INSERT INTO public.relais_communautaires (
            id, user_id, ascq_id, nom, prenoms, telephone, village_nom, grappe, code_acces_temporaire, code_temporaire_utilise, actif, statut
        ) VALUES 
            (gen_random_uuid(), v_rc1_id, v_ascq_id, 'RELAIS A', v_dep_cur.nom, '+22901991' || LPAD((v_counter * 2)::text, 5, '0'), 'Centre ' || v_dep_cur.nom, 1, '0000', true, true, 'ACTIF'),
            (gen_random_uuid(), v_rc2_id, v_ascq_id, 'RELAIS B', v_dep_cur.nom, '+22901991' || LPAD((v_counter * 2 + 1)::text, 5, '0'), 'Périphérie ' || v_dep_cur.nom, 2, '0000', true, true, 'ACTIF');

        -- Fiches hebdo RC
        INSERT INTO public.fiches_activites_hebdo_relais (
            id, relais_id, ascq_id, departement_id, zone_sanitaire_id, commune_id, arrondissement_id,
            village_nom, grappe, semaine_du, annee, semaine_num, nbre_vad_prevu, nbre_vad_realise, nbre_menages_visites,
            total_menages_en_charge, nbre_causeries, themes_causeries, femmes_enceintes_suivies, enfants_0_59_suivis,
            personnes_referees, lu_et_approuve_ascq, date_approbation_ascq, created_at
        ) VALUES (
            gen_random_uuid(), v_rc1_id, v_ascq_id, v_dep_cur.id, v_zs_id, v_com_id, v_arr_id,
            'Centre ' || v_dep_cur.nom, 1, CURRENT_DATE - 7, v_annee, v_semaine,
            12, 12, 12, 40, 2, 'Sensibilisation hygiène et vaccination', 3, 14, 1, true, NOW(), NOW() - INTERVAL '2 days'
        ) ON CONFLICT DO NOTHING;

        -- Consultations iCCM départementales
        INSERT INTO public.consultations_communautaires (
            id, ascq_id, ascq_nom, date_consultation, village, nom_patient, prenoms_patient, age_valeur, age_unite, sexe,
            signe_principal, tdr_paludisme, diagnostic_possible, decision, departement_id, zone_sanitaire_id, commune_id, arrondissement_id
        ) VALUES
            (gen_random_uuid(), v_ascq_id, 'ASCQ ' || v_dep_cur.nom, CURRENT_DATE - 3, 'Centre', 'PATIENT (TEST)', 'Koffi', 3, 'ANS', 'M', 'Fièvre et céphalées', 'POSITIF', 'Paludisme simple', 'PRISE_EN_CHARGE_COMMUNAUTAIRE', v_dep_cur.id, v_zs_id, v_com_id, v_arr_id),
            (gen_random_uuid(), v_ascq_id, 'ASCQ ' || v_dep_cur.nom, CURRENT_DATE - 2, 'Périphérie', 'PATIENT (TEST)', 'Fatima', 18, 'MOIS', 'F', 'Diarrhée aqueuse', 'NEGATIF', 'Diarrhée simple', 'PRISE_EN_CHARGE_COMMUNAUTAIRE', v_dep_cur.id, v_zs_id, v_com_id, v_arr_id),
            (gen_random_uuid(), v_ascq_id, 'ASCQ ' || v_dep_cur.nom, CURRENT_DATE - 1, 'Centre', 'PATIENT (TEST)', 'Paul', 2, 'ANS', 'M', 'Toux et fièvre', 'POSITIF', 'Paludisme et IRA', 'PRISE_EN_CHARGE_COMMUNAUTAIRE', v_dep_cur.id, v_zs_id, v_com_id, v_arr_id)
        ON CONFLICT DO NOTHING;

        -- 1 Alerte SIMR par département
        INSERT INTO public.alertes_communautaires (
            id, numero_alerte, annee, semaine_epidemio, mois, date_notification, date_debut_maladie, date_detection,
            departement_id, zone_sanitaire_id, commune_id, arrondissement_id, village_nom,
            type_alerte_code, type_alerte_nom, est_prioritaire, nb_personnes_touchees, nb_personnes_mortes,
            mesures_prises, sexe, age_valeur, age_unite, notificateur_id, notificateur_nom_complet, notificateur_titre,
            notificateur_telephone, ascq_superviseur_id, statut, centre_sante_nom
        ) VALUES (
            gen_random_uuid(), 'ALR-2026-' || SUBSTRING(v_dep_cur.nom, 1, 3) || '-001', v_annee, v_semaine, v_mois,
            CURRENT_DATE - 4, CURRENT_DATE - 5, CURRENT_DATE - 4,
            v_dep_cur.id, v_zs_id, v_com_id, v_arr_id, 'Centre',
            (v_counter % 7 + 1), 'Pathologie Épidémique', true, 1, 0,
            'Mesures barrières communautaires et orientation vers centre de santé', 'M', 20 + v_counter, 'ANS',
            v_rc1_id, 'RELAIS A ' || v_dep_cur.nom, 'RC', '+22901991' || LPAD((v_counter * 2)::text, 5, '0'), v_ascq_id, 'VERIFIEE_VRAIE', 'CSC ' || v_dep_cur.nom
        ) ON CONFLICT DO NOTHING;

        -- RMA Octobre validé pour chaque département
        INSERT INTO public.rapports_mensuels_ascq (
            id, numero_rapport, ascq_id, mois, annee, statut, echeance_date, date_validation,
            departement_id, commune_id, arrondissement_id, arrondissement_nom, commune_nom,
            rc_en_charge, rc_actifs, menages_en_charge, menages_visites, personnes_touchees_total,
            enfants_0_5_ans, femmes_enceintes, cas_diarrhee, cas_ira, cas_palu_tdr_positif,
            donnees_surveillance
        ) VALUES (
            gen_random_uuid(), 'RMA-2026-10-' || SUBSTRING(v_dep_cur.nom, 1, 3), v_ascq_id, 10, 2026, 'VALIDE', '2026-11-03', NOW() - INTERVAL '3 days',
            v_dep_cur.id, v_com_id, v_arr_id, 'Arrondissement Démo', 'Commune Démo',
            2, 2, 80 + v_counter, 75 + v_counter, 380 + (v_counter * 10),
            120 + v_counter, 28 + (v_counter % 5), 4, 3, 18 + v_counter,
            '{"rougeole": 1, "cholera": 0, "deces_neonatal": 0}'::jsonb
        ) ON CONFLICT DO NOTHING;

        -- Rapport Hebdo PNSC départemental
        INSERT INTO public.rapports_hebdo_pnsc (
            id, ascq_id, departement_id, departement_nom, commune_id, commune_nom, arrondissement_id, arrondissement_nom,
            annee, semaine, statut, date_validation, rh_besoins_normes, rh_fonctionnel, motos_mise_a_dispo, motos_fonctionnel,
            ordinateurs_mise_a_dispo, ordinateurs_fonctionnel
        ) VALUES (
            gen_random_uuid(), v_ascq_id, v_dep_cur.id, v_dep_cur.nom, v_com_id, 'Commune Démo', v_arr_id, 'Arrondissement Démo',
            v_annee, v_semaine, 'VALIDE', NOW() - INTERVAL '2 days', 2, 2, 1, 1, 1, 1
        ) ON CONFLICT DO NOTHING;

    END LOOP;

    RAISE NOTICE 'Succès total : Tous les comptes démo et données de démonstration ont été générés avec succès.';
END $$;

-- ---------------------------------------------------------------------
-- 4. NETTOYAGE DE LA FONCTION D'AIDE TEMPORAIRE
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.inserer_utilisateur_demo;
