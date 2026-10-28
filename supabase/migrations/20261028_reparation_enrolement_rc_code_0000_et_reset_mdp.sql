-- =====================================================================
-- MIGRATION : RÉPARATION ENRÔLEMENT RC (CODE 0000) ET RÉINITIALISATION MOT DE PASSE (ASCQ & RC)
-- Date: 2026-10-28
-- Objectif:
-- 1. Code d'accès par défaut des RC fixé à 0000 (4 zéros).
-- 2. Insertion automatique et sécurisée dans auth.identities sans erreur de cast UUID.
-- 3. Première connexion RC : demande obligatoire de nouveau mot de passe avec message de confirmation officiel.
-- 4. Oubli mot de passe RC : notification à l'ASCQ superviseur qui réinitialise à 0000.
-- 5. Oubli mot de passe ASCQ : notification au Représentant Communal qui réinitialise à 000000.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. RÉPARATION SYSTÉMATIQUE DE AUTH.IDENTITIES POUR ÉVITER "database error querying schema"
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'identities') THEN
        -- Insérer dans auth.identities avec id de type UUID (gen_random_uuid()) sans cast text vers uuid
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        SELECT 
            gen_random_uuid(),
            u.id,
            jsonb_build_object('sub', u.id::text, 'email', u.email),
            'email',
            u.id::text,
            NOW(),
            NOW(),
            NOW()
        FROM auth.users u
        LEFT JOIN auth.identities i ON i.user_id = u.id AND i.provider = 'email'
        WHERE i.id IS NULL
        ON CONFLICT DO NOTHING;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Avertissement rattrapage auth.identities : %', SQLERRM;
END $$;


-- ---------------------------------------------------------------------
-- 2. FONCTION OFFICIELLE D'ENRÔLEMENT DU RELAIS COMMUNAUTAIRE (CODE 0000)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.enroler_relais_communautaire(TEXT, TEXT, TEXT, UUID, TEXT, INTEGER, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.enroler_relais_communautaire(
    p_nom TEXT,
    p_prenoms TEXT,
    p_telephone TEXT,
    p_village_id UUID DEFAULT NULL,
    p_village_nom TEXT DEFAULT NULL,
    p_grappe INTEGER DEFAULT 1,
    p_nom_grappe TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_ascq_id UUID;
    v_ascq_dep UUID;
    v_ascq_com UUID;
    v_ascq_arr UUID;
    v_clean_phone TEXT;
    v_technical_email TEXT;
    v_user_id UUID;
    v_rc_id UUID;
    v_village_id UUID := p_village_id;
    v_village_nom TEXT := p_village_nom;
BEGIN
    -- 1. Vérifier l'ASCQ connecté
    v_ascq_id := auth.uid();
    IF v_ascq_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié. Veuillez vous connecter.';
    END IF;

    SELECT departement_id, commune_id, arrondissement_id 
    INTO v_ascq_dep, v_ascq_com, v_ascq_arr
    FROM public.utilisateurs
    WHERE id = v_ascq_id;

    IF v_ascq_dep IS NULL AND v_ascq_com IS NULL THEN
        -- Fallback si profil en cours de mise à jour
        SELECT departement_id, commune_id, arrondissement_id 
        INTO v_ascq_dep, v_ascq_com, v_ascq_arr
        FROM public.utilisateurs
        WHERE role_technique = 'SUPER_ADMIN'
        LIMIT 1;
    END IF;

    -- 2. Nettoyage et normalisation du numéro de téléphone
    v_clean_phone := regexp_replace(p_telephone, '\D', '', 'g');
    IF LENGTH(v_clean_phone) < 8 THEN
        RAISE EXCEPTION 'Le numéro de téléphone est invalide (minimum 8 chiffres requis).';
    END IF;

    -- Email technique unique standardisé
    v_technical_email := 'tel_' || v_clean_phone || '@ascq.local';

    -- 3. Gestion du village
    IF v_village_id IS NULL AND v_village_nom IS NOT NULL AND TRIM(v_village_nom) <> '' THEN
        SELECT id INTO v_village_id 
        FROM public.villages 
        WHERE (arrondissement_id = v_ascq_arr OR v_ascq_arr IS NULL)
          AND UPPER(nom) = UPPER(TRIM(v_village_nom))
        LIMIT 1;

        IF v_village_id IS NULL AND v_ascq_arr IS NOT NULL THEN
            INSERT INTO public.villages (arrondissement_id, nom, code)
            VALUES (v_ascq_arr, UPPER(TRIM(v_village_nom)), 'VIL-' || SUBSTRING(v_clean_phone FROM 5 FOR 4))
            RETURNING id INTO v_village_id;
        END IF;
    ELSIF v_village_id IS NOT NULL AND (v_village_nom IS NULL OR v_village_nom = '') THEN
        SELECT nom INTO v_village_nom FROM public.villages WHERE id = v_village_id;
    END IF;

    -- 4. Créer ou mettre à jour dans auth.users avec le code par défaut 0000
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_technical_email;

    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            phone_change_token,
            email_change_token_current,
            reauthentication_token,
            is_sso_user
        ) VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            v_technical_email,
            crypt('0000', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('nom', UPPER(TRIM(p_nom)), 'prenoms', TRIM(p_prenoms), 'telephone', p_telephone, 'poste', 'RC'),
            NOW(),
            NOW(),
            '', '', '', '', '', '', '', false
        );
    ELSE
        -- Mettre à jour avec le code 0000
        UPDATE auth.users
        SET encrypted_password = crypt('0000', gen_salt('bf')),
            raw_user_meta_data = jsonb_build_object('nom', UPPER(TRIM(p_nom)), 'prenoms', TRIM(p_prenoms), 'telephone', p_telephone, 'poste', 'RC'),
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- 5. CRITIQUE : Créer la ligne d'identité dans auth.identities pour éviter l'erreur GoTrue
    DELETE FROM auth.identities WHERE user_id = v_user_id AND provider = 'email';
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_technical_email),
        'email',
        v_user_id::text,
        NOW(),
        NOW(),
        NOW()
    );

    -- 6. Créer ou mettre à jour dans public.utilisateurs
    INSERT INTO public.utilisateurs (
        id,
        telephone,
        nom,
        prenoms,
        poste,
        statut_compte,
        role_technique,
        departement_id,
        commune_id,
        arrondissement_id
    ) VALUES (
        v_user_id,
        p_telephone,
        UPPER(TRIM(p_nom)),
        TRIM(p_prenoms),
        'RC',
        'VALIDE',
        'UTILISATEUR',
        v_ascq_dep,
        v_ascq_com,
        v_ascq_arr
    )
    ON CONFLICT (telephone) DO UPDATE SET
        id = EXCLUDED.id,
        nom = EXCLUDED.nom,
        prenoms = EXCLUDED.prenoms,
        poste = 'RC',
        statut_compte = 'VALIDE',
        departement_id = COALESCE(EXCLUDED.departement_id, public.utilisateurs.departement_id),
        commune_id = COALESCE(EXCLUDED.commune_id, public.utilisateurs.commune_id),
        arrondissement_id = COALESCE(EXCLUDED.arrondissement_id, public.utilisateurs.arrondissement_id),
        updated_at = NOW();

    -- 7. Créer ou mettre à jour dans public.relais_communautaires
    INSERT INTO public.relais_communautaires (
        ascq_id,
        user_id,
        nom,
        prenoms,
        telephone,
        village_id,
        village_nom,
        grappe,
        nom_grappe,
        code_acces_temporaire,
        code_temporaire_utilise,
        statut
    ) VALUES (
        v_ascq_id,
        v_user_id,
        UPPER(TRIM(p_nom)),
        TRIM(p_prenoms),
        p_telephone,
        v_village_id,
        v_village_nom,
        p_grappe,
        p_nom_grappe,
        '0000',
        FALSE,
        'ACTIF'
    )
    ON CONFLICT (telephone) DO UPDATE SET
        ascq_id = EXCLUDED.ascq_id,
        user_id = EXCLUDED.user_id,
        nom = EXCLUDED.nom,
        prenoms = EXCLUDED.prenoms,
        village_id = EXCLUDED.village_id,
        village_nom = EXCLUDED.village_nom,
        grappe = EXCLUDED.grappe,
        nom_grappe = EXCLUDED.nom_grappe,
        code_acces_temporaire = '0000',
        code_temporaire_utilise = FALSE,
        statut = 'ACTIF',
        updated_at = NOW()
    RETURNING id INTO v_rc_id;

    RETURN jsonb_build_object(
        'success', true,
        'rc_id', v_rc_id,
        'user_id', v_user_id,
        'code_temporaire', '0000',
        'nom', UPPER(TRIM(p_nom)),
        'prenoms', TRIM(p_prenoms),
        'telephone', p_telephone
    );
END;
$$;


-- ---------------------------------------------------------------------
-- 3. RÉINITIALISATION DU MOT DE PASSE DU RC À 0000 PAR L'ASCQ
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reinitialiser_code_acces_rc(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.reinitialiser_code_acces_rc(p_rc_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_ascq_id UUID;
    v_user_id UUID;
    v_tel TEXT;
    v_nom TEXT;
    v_prenoms TEXT;
    v_technical_email TEXT;
    v_clean_phone TEXT;
BEGIN
    v_ascq_id := auth.uid();
    IF v_ascq_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    SELECT user_id, telephone, nom, prenoms 
    INTO v_user_id, v_tel, v_nom, v_prenoms
    FROM public.relais_communautaires
    WHERE id = p_rc_id AND (ascq_id = v_ascq_id OR public.est_administrateur());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Relais communautaire introuvable ou vous n''avez pas les droits sur cet agent.';
    END IF;

    v_clean_phone := regexp_replace(v_tel, '\D', '', 'g');
    v_technical_email := 'tel_' || v_clean_phone || '@ascq.local';

    -- 1. Réinitialiser le mot de passe à 0000 dans auth.users
    IF v_user_id IS NOT NULL THEN
        UPDATE auth.users
        SET encrypted_password = crypt('0000', gen_salt('bf')),
            updated_at = NOW()
        WHERE id = v_user_id;

        -- S'assurer que l'identité existe
        DELETE FROM auth.identities WHERE user_id = v_user_id AND provider = 'email';
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_technical_email),
            'email',
            v_user_id::text,
            NOW(),
            NOW(),
            NOW()
        );
    END IF;

    -- 2. Remettre le code temporaire à 0000 et le flag à FALSE
    UPDATE public.relais_communautaires
    SET code_acces_temporaire = '0000',
        code_temporaire_utilise = FALSE,
        updated_at = NOW()
    WHERE id = p_rc_id;

    -- 3. Notifier le RC
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type,
            lu
        ) VALUES (
            v_user_id,
            'Mot de passe réinitialisé',
            'Votre superviseur ASCQ a réinitialisé votre code d''accès à 0000. Connectez-vous avec ce code et définissez votre nouveau mot de passe.',
            'INFO',
            false
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'nouveau_code', '0000',
        'nom', v_nom,
        'prenoms', v_prenoms,
        'telephone', v_tel
    );
END;
$$;


-- ---------------------------------------------------------------------
-- 4. CHANGEMENT DU MOT DE PASSE PAR LE RC (1ÈRE CONNEXION OU APRÈS RESET)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.definir_mot_de_passe_rc(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.definir_mot_de_passe_rc(p_nouveau_mot_de_passe TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_rc_user_id UUID;
BEGIN
    v_rc_user_id := auth.uid();
    IF v_rc_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié. Veuillez vous connecter.';
    END IF;

    IF LENGTH(p_nouveau_mot_de_passe) < 4 THEN
        RAISE EXCEPTION 'Le mot de passe doit comporter au moins 4 caractères.';
    END IF;

    -- 1. Mettre à jour dans auth.users
    UPDATE auth.users
    SET encrypted_password = crypt(p_nouveau_mot_de_passe, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = v_rc_user_id;

    -- 2. Marquer le code temporaire comme utilisé
    UPDATE public.relais_communautaires
    SET code_temporaire_utilise = TRUE,
        updated_at = NOW()
    WHERE user_id = v_rc_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Votre mot de passe est changé avec succès'
    );
END;
$$;


-- ---------------------------------------------------------------------
-- 5. DEMANDE D'ASSISTANCE MOT DE PASSE OUBLIÉ (ROUTAGE INTELLIGENT RC -> ASCQ / ASCQ -> REP COMMUNAL)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.demander_reinitialisation_mot_de_passe(TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.demander_reinitialisation_mot_de_passe(
    p_telephone TEXT,
    p_nom TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_clean_phone TEXT;
    v_user RECORD;
    v_rc RECORD;
    v_dest_id UUID;
    v_role_detecte TEXT := 'UTILISATEUR';
    v_message_reponse TEXT;
BEGIN
    v_clean_phone := regexp_replace(p_telephone, '\D', '', 'g');
    IF LENGTH(v_clean_phone) < 8 THEN
        RAISE EXCEPTION 'Numéro de téléphone invalide.';
    END IF;

    -- Recherche de l'utilisateur par son téléphone
    SELECT * INTO v_user
    FROM public.utilisateurs
    WHERE regexp_replace(telephone, '\D', '', 'g') = v_clean_phone
       OR regexp_replace(telephone, '\D', '', 'g') LIKE '%' || v_clean_phone
    LIMIT 1;

    IF NOT FOUND THEN
        -- Insertion dans notifications pour alerte globale admin si compte inconnu
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type,
            lu
        ) VALUES (
            NULL,
            'Demande réinitialisation mot de passe (Numéro non reconnu)',
            'Un utilisateur ayant le numéro ' || p_telephone || ' (' || COALESCE(p_nom, 'Nom non précisé') || ') demande une réinitialisation de mot de passe mais son compte n''a pas été trouvé.',
            'URGENT',
            false
        );

        RETURN jsonb_build_object(
            'success', true,
            'role', 'INCONNU',
            'message', 'Votre demande a été transmise aux administrateurs. Veuillez contacter le support au 01 69 03 14 63.'
        );
    END IF;

    -- Cas 1 : C'est un Relais Communautaire (RC) -> Alerte son ASCQ superviseur
    IF v_user.poste = 'RC' THEN
        v_role_detecte := 'RC';
        
        -- Retrouver l'ASCQ superviseur dans relais_communautaires
        SELECT * INTO v_rc
        FROM public.relais_communautaires
        WHERE user_id = v_user.id OR regexp_replace(telephone, '\D', '', 'g') = v_clean_phone
        LIMIT 1;

        IF v_rc.ascq_id IS NOT NULL THEN
            v_dest_id := v_rc.ascq_id;
        ELSE
            -- Si pas d'ascq_id, envoyer au Super Admin
            v_dest_id := NULL;
        END IF;

        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type,
            lu
        ) VALUES (
            v_dest_id,
            'Alerte : Mot de passe oublié - Relais Communautaire',
            'Votre Relais Communautaire ' || v_user.prenoms || ' ' || v_user.nom || ' (' || p_telephone || ') a oublié son mot de passe. Veuillez vous rendre dans votre onglet Relais pour réinitialiser son mot de passe à 0000.',
            'URGENT',
            false
        );

        v_message_reponse := 'Votre superviseur ASCQ a été alerté avec succès. Il va réinitialiser votre code d''accès à 0000. Vous pourrez ensuite vous reconnecter et définir votre mot de passe.';

    -- Cas 2 : C'est un ASCQ -> Alerte le Représentant Communal de sa commune
    ELSIF v_user.poste = 'ASCQ' THEN
        v_role_detecte := 'ASCQ';

        -- Trouver le représentant communal de sa commune
        SELECT id INTO v_dest_id
        FROM public.utilisateurs
        WHERE commune_id = v_user.commune_id
          AND (
            poste = 'REPRESENTANT_COMMUNAL' 
            OR role_technique IN ('REPRESENTANT_COMMUNAL', 'ADMIN_COMMUNAL')
            OR role_nomination = 'REPRESENTANT_COMMUNAL'
          )
        LIMIT 1;

        -- Notification ciblée
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type,
            lu
        ) VALUES (
            v_dest_id,
            'Alerte : Mot de passe oublié - ASCQ',
            'L''ASCQ ' || v_user.prenoms || ' ' || v_user.nom || ' (' || p_telephone || ') a oublié son mot de passe. Veuillez vous rendre dans votre espace Périmètre / Administration pour réinitialiser son code à 000000.',
            'URGENT',
            false
        );

        -- Alerte également en broadcast admin
        IF v_dest_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                destinataire_id,
                titre,
                message,
                type,
                lu
            ) VALUES (
                NULL,
                'Demande réinitialisation mot de passe ASCQ',
                'L''ASCQ ' || v_user.prenoms || ' ' || v_user.nom || ' (' || p_telephone || ') demande une réinitialisation de son mot de passe à 000000 (transmise au Représentant Communal).',
                'URGENT',
                false
            );
        END IF;

        v_message_reponse := 'Votre alerte a été transmise au Représentant Communal de votre commune. Il va réinitialiser votre code d''accès à 000000. Vous pourrez ensuite vous connecter avec 000000 et le modifier.';

    -- Cas 3 : Autre cadre ou administrateur
    ELSE
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type,
            lu
        ) VALUES (
            NULL,
            'Demande réinitialisation mot de passe cadre/admin',
            'L''agent ' || v_user.prenoms || ' ' || v_user.nom || ' (' || p_telephone || ', poste: ' || v_user.poste || ') a oublié son mot de passe et demande une assistance de réinitialisation.',
            'URGENT',
            false
        );

        v_message_reponse := 'Votre demande a été transmise à la Coordination Nationale. Vos identifiants vous seront réinitialisés dans les plus brefs délais.';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'role', v_role_detecte,
        'nom', v_user.nom,
        'prenoms', v_user.prenoms,
        'message', v_message_reponse
    );
END;
$$;


-- ---------------------------------------------------------------------
-- 6. RÉINITIALISATION DU MOT DE PASSE DE L'ASCQ À 000000 (PAR LE REPRÉSENTANT COMMUNAL OU ADMIN)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reinitialiser_mot_de_passe_ascq_a_zeros(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.reinitialiser_mot_de_passe_ascq_a_zeros(
    p_ascq_id UUID,
    p_motif TEXT DEFAULT 'Réinitialisation demandée suite à mot de passe oublié'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_id UUID;
    v_target_phone TEXT;
    v_target_nom TEXT;
    v_clean_phone TEXT;
    v_technical_email TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    IF NOT public.est_administrateur() THEN
        RAISE EXCEPTION 'Interdit : Seuls le Représentant Communal et les Administrateurs habilités peuvent réinitialiser les mots de passe des ASCQ.';
    END IF;

    SELECT telephone, nom || ' ' || prenoms INTO v_target_phone, v_target_nom
    FROM public.utilisateurs 
    WHERE id = p_ascq_id;

    IF v_target_phone IS NULL THEN
        RAISE EXCEPTION 'Agent ASCQ introuvable.';
    END IF;

    v_clean_phone := regexp_replace(v_target_phone, '\D', '', 'g');
    v_technical_email := 'tel_' || v_clean_phone || '@ascq.local';

    -- 1. Mettre à jour le mot de passe à 000000 dans auth.users
    UPDATE auth.users
    SET encrypted_password = crypt('000000', gen_salt('bf')),
        updated_at = NOW()
    WHERE id = p_ascq_id;

    -- 2. Garantir la présence de l'identité auth.identities
    DELETE FROM auth.identities WHERE user_id = p_ascq_id AND provider = 'email';
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        p_ascq_id,
        jsonb_build_object('sub', p_ascq_id::text, 'email', v_technical_email),
        'email',
        p_ascq_id::text,
        NOW(),
        NOW(),
        NOW()
    );

    -- 3. Notifier l'ASCQ
    INSERT INTO public.notifications (
        destinataire_id,
        titre,
        message,
        type,
        lu
    ) VALUES (
        p_ascq_id,
        'Mot de passe réinitialisé',
        'Votre mot de passe a été réinitialisé à 000000 par votre Représentant Communal. Connectez-vous avec ce code temporaire et définissez votre mot de passe personnel.',
        'INFO',
        false
    );

    RETURN jsonb_build_object(
        'success', true,
        'nouveau_code', '000000',
        'nom', v_target_nom,
        'telephone', v_target_phone,
        'message', 'Le mot de passe de ' || v_target_nom || ' a été réinitialisé avec succès à 000000.'
    );
END;
$$;


-- ---------------------------------------------------------------------
-- 7. FONCTION COMPATIBLE admin_reinitialiser_mot_de_passe (POUR LA COMPATIBILITÉ DE L'ESPACE PÉRIMÈTRE EXISTANT)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_reinitialiser_mot_de_passe(UUID, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.admin_reinitialiser_mot_de_passe(
    p_target_user_id UUID,
    p_nouveau_mot_de_passe TEXT DEFAULT '000000',
    p_motif TEXT DEFAULT 'Réinitialisation de mot de passe par l''administration'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_code TEXT;
BEGIN
    v_code := COALESCE(NULLIF(TRIM(p_nouveau_mot_de_passe), ''), '000000');
    
    -- Mettre à jour dans auth.users
    UPDATE auth.users
    SET encrypted_password = crypt(v_code, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = p_target_user_id;

    -- Notifier l'agent
    INSERT INTO public.notifications (
        destinataire_id,
        titre,
        message,
        type,
        lu
    ) VALUES (
        p_target_user_id,
        'Mot de passe réinitialisé',
        'Votre mot de passe a été réinitialisé à ' || v_code || ' par l''administration. Veuillez vous connecter avec ce code temporaire.',
        'INFO',
        false
    );

    RETURN jsonb_build_object(
        'success', true,
        'nouveau_code', v_code,
        'message', 'Mot de passe réinitialisé à ' || v_code || ' avec succès.'
    );
END;
$$;


-- ---------------------------------------------------------------------
-- 8. PERMISSIONS D'EXÉCUTION SUR TOUTES LES NOUVELLES FONCTIONS
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.enroler_relais_communautaire TO authenticated;
GRANT EXECUTE ON FUNCTION public.reinitialiser_code_acces_rc TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_mot_de_passe_rc TO authenticated;
GRANT EXECUTE ON FUNCTION public.demander_reinitialisation_mot_de_passe TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reinitialiser_mot_de_passe_ascq_a_zeros TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reinitialiser_mot_de_passe TO authenticated;
