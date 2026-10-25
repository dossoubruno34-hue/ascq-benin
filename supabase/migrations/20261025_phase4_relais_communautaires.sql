-- =====================================================================
-- ASCQ BÉNIN - Migration Phase 4 : Enrôlement & Accès des Relais Communautaires (RC)
-- =====================================================================

-- 1. Résolution définitive de la récursion RLS sur la table utilisateurs
DROP POLICY IF EXISTS "Lecture utilisateurs securisee" ON public.utilisateurs;
DROP POLICY IF EXISTS "Mise a jour utilisateurs" ON public.utilisateurs;

CREATE POLICY "Lecture utilisateurs securisee" ON public.utilisateurs
    FOR SELECT USING (
        auth.uid() = id OR
        statut_compte = 'VALIDE'
    );

CREATE POLICY "Mise a jour utilisateurs" ON public.utilisateurs
    FOR UPDATE USING (
        auth.uid() = id
    );

-- 2. Mise à jour de la table relais_communautaires
ALTER TABLE public.relais_communautaires 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS statut TEXT NOT NULL DEFAULT 'ACTIF';

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_relais_ascq_id ON public.relais_communautaires(ascq_id);
CREATE INDEX IF NOT EXISTS idx_relais_user_id ON public.relais_communautaires(user_id);
CREATE INDEX IF NOT EXISTS idx_relais_telephone ON public.relais_communautaires(telephone);

-- 3. Politiques RLS sur relais_communautaires
ALTER TABLE public.relais_communautaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture relais par ASCQ ou RC" ON public.relais_communautaires;
DROP POLICY IF EXISTS "Insertion relais par ASCQ" ON public.relais_communautaires;
DROP POLICY IF EXISTS "Modification relais par ASCQ ou RC" ON public.relais_communautaires;
DROP POLICY IF EXISTS "Suppression relais par ASCQ" ON public.relais_communautaires;

CREATE POLICY "Lecture relais par ASCQ ou RC" ON public.relais_communautaires
    FOR SELECT USING (
        ascq_id = auth.uid() OR user_id = auth.uid()
    );

CREATE POLICY "Insertion relais par ASCQ" ON public.relais_communautaires
    FOR INSERT WITH CHECK (
        ascq_id = auth.uid()
    );

CREATE POLICY "Modification relais par ASCQ ou RC" ON public.relais_communautaires
    FOR UPDATE USING (
        ascq_id = auth.uid() OR user_id = auth.uid()
    );

CREATE POLICY "Suppression relais par ASCQ" ON public.relais_communautaires
    FOR DELETE USING (
        ascq_id = auth.uid()
    );

-- ---------------------------------------------------------------------
-- 4. FONCTIONS RPC SÉCURISÉES (SECURITY DEFINER) POUR LES RC
-- ---------------------------------------------------------------------

-- A. Fonction pour enrôler un nouveau Relais Communautaire
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
    v_code_temporaire TEXT;
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
    WHERE id = v_ascq_id AND statut_compte = 'VALIDE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Compte ASCQ introuvable ou non validé.';
    END IF;

    -- 2. Nettoyage et validation du numéro de téléphone
    v_clean_phone := regexp_replace(p_telephone, '\D', '', 'g');
    IF LENGTH(v_clean_phone) < 8 THEN
        RAISE EXCEPTION 'Le numéro de téléphone est invalide.';
    END IF;
    v_technical_email := 'tel_' || v_clean_phone || '@ascq.local';

    -- 3. Gestion du village
    IF v_village_id IS NULL AND v_village_nom IS NOT NULL AND TRIM(v_village_nom) <> '' THEN
        -- Rechercher si le village existe déjà dans l'arrondissement
        SELECT id INTO v_village_id 
        FROM public.villages 
        WHERE arrondissement_id = v_ascq_arr AND UPPER(nom) = UPPER(TRIM(v_village_nom))
        LIMIT 1;

        -- S'il n'existe pas, le créer automatiquement
        IF v_village_id IS NULL AND v_ascq_arr IS NOT NULL THEN
            INSERT INTO public.villages (arrondissement_id, nom, code)
            VALUES (v_ascq_arr, UPPER(TRIM(v_village_nom)), 'VIL-' || SUBSTRING(v_clean_phone FROM 5 FOR 4))
            RETURNING id INTO v_village_id;
        END IF;
    ELSIF v_village_id IS NOT NULL AND (v_village_nom IS NULL OR v_village_nom = '') THEN
        SELECT nom INTO v_village_nom FROM public.villages WHERE id = v_village_id;
    END IF;

    -- 4. Générer le code d'accès temporaire à 6 chiffres
    v_code_temporaire := LPAD((FLOOR(RANDOM() * 900000) + 100000)::INT::TEXT, 6, '0');

    -- 5. Créer ou mettre à jour le compte dans auth.users
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
            updated_at
        ) VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            v_technical_email,
            crypt(v_code_temporaire, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('nom', UPPER(TRIM(p_nom)), 'prenoms', TRIM(p_prenoms), 'telephone', p_telephone, 'poste', 'RC'),
            NOW(),
            NOW()
        );
    ELSE
        UPDATE auth.users
        SET encrypted_password = crypt(v_code_temporaire, gen_salt('bf')),
            raw_user_meta_data = jsonb_build_object('nom', UPPER(TRIM(p_nom)), 'prenoms', TRIM(p_prenoms), 'telephone', p_telephone, 'poste', 'RC'),
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

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
        nom = EXCLUDED.nom,
        prenoms = EXCLUDED.prenoms,
        poste = 'RC',
        statut_compte = 'VALIDE',
        departement_id = EXCLUDED.departement_id,
        commune_id = EXCLUDED.commune_id,
        arrondissement_id = EXCLUDED.arrondissement_id,
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
        COALESCE(v_village_nom, 'VILLAGE'),
        p_grappe,
        p_nom_grappe,
        v_code_temporaire,
        FALSE,
        'ACTIF'
    )
    ON CONFLICT (ascq_id, telephone) DO UPDATE SET
        user_id = v_user_id,
        nom = EXCLUDED.nom,
        prenoms = EXCLUDED.prenoms,
        village_id = EXCLUDED.village_id,
        village_nom = EXCLUDED.village_nom,
        grappe = EXCLUDED.grappe,
        nom_grappe = EXCLUDED.nom_grappe,
        code_acces_temporaire = v_code_temporaire,
        code_temporaire_utilise = FALSE,
        statut = 'ACTIF',
        updated_at = NOW()
    RETURNING id INTO v_rc_id;

    RETURN jsonb_build_object(
        'success', true,
        'rc_id', v_rc_id,
        'user_id', v_user_id,
        'code_temporaire', v_code_temporaire,
        'nom', UPPER(TRIM(p_nom)),
        'prenoms', TRIM(p_prenoms),
        'telephone', p_telephone
    );
END;
$$;

-- B. Fonction pour réinitialiser le code d'accès d'un RC (par l'ASCQ)
CREATE OR REPLACE FUNCTION public.reinitialiser_code_acces_rc(p_rc_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_ascq_id UUID;
    v_user_id UUID;
    v_clean_phone TEXT;
    v_tel TEXT;
    v_nom TEXT;
    v_prenoms TEXT;
    v_nouveau_code TEXT;
BEGIN
    v_ascq_id := auth.uid();
    IF v_ascq_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    -- Vérifier que ce RC appartient bien à l'ASCQ connecté (ou admin)
    SELECT user_id, telephone, nom, prenoms 
    INTO v_user_id, v_tel, v_nom, v_prenoms
    FROM public.relais_communautaires
    WHERE id = p_rc_id AND (ascq_id = v_ascq_id OR public.est_administrateur());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Relais communautaire introuvable ou non rattaché à votre compte.';
    END IF;

    -- Générer le nouveau code à 6 chiffres
    v_nouveau_code := LPAD((FLOOR(RANDOM() * 900000) + 100000)::INT::TEXT, 6, '0');

    -- Mettre à jour dans auth.users si user_id existe
    IF v_user_id IS NOT NULL THEN
        UPDATE auth.users
        SET encrypted_password = crypt(v_nouveau_code, gen_salt('bf')),
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- Mettre à jour relais_communautaires
    UPDATE public.relais_communautaires
    SET code_acces_temporaire = v_nouveau_code,
        code_temporaire_utilise = FALSE,
        updated_at = NOW()
    WHERE id = p_rc_id;

    RETURN jsonb_build_object(
        'success', true,
        'nouveau_code', v_nouveau_code,
        'nom', v_nom,
        'prenoms', v_prenoms,
        'telephone', v_tel
    );
END;
$$;

-- C. Fonction pour définir le mot de passe personnel du RC lors de sa 1ère connexion
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
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    IF LENGTH(p_nouveau_mot_de_passe) < 6 THEN
        RAISE EXCEPTION 'Le mot de passe doit comporter au moins 6 caractères.';
    END IF;

    -- 1. Mettre à jour auth.users
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
        'message', 'Votre mot de passe a été défini avec succès.'
    );
END;
$$;

-- D. Fonction pour lister tous les RC de l'ASCQ connecté
CREATE OR REPLACE FUNCTION public.lister_mes_relais()
RETURNS TABLE (
    id UUID,
    nom TEXT,
    prenoms TEXT,
    telephone TEXT,
    village_id UUID,
    village_nom TEXT,
    grappe INTEGER,
    nom_grappe TEXT,
    code_temporaire_utilise BOOLEAN,
    statut TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rc.id,
        rc.nom,
        rc.prenoms,
        rc.telephone,
        rc.village_id,
        rc.village_nom,
        rc.grappe,
        rc.nom_grappe,
        rc.code_temporaire_utilise,
        rc.statut,
        rc.created_at
    FROM public.relais_communautaires rc
    WHERE rc.ascq_id = auth.uid()
    ORDER BY rc.created_at DESC;
END;
$$;

-- E. Fonction pour charger les informations de l'Espace RC connecté
CREATE OR REPLACE FUNCTION public.obtenir_espace_rc()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_rc RECORD;
    v_ascq RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    SELECT rc.* INTO v_rc
    FROM public.relais_communautaires rc
    WHERE rc.user_id = v_user_id
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fiche Relais Communautaire introuvable pour ce compte.';
    END IF;

    -- Informations de l'ASCQ référent
    SELECT nom, prenoms, telephone INTO v_ascq
    FROM public.utilisateurs
    WHERE id = v_rc.ascq_id;

    RETURN jsonb_build_object(
        'rc_id', v_rc.id,
        'user_id', v_rc.user_id,
        'nom', v_rc.nom,
        'prenoms', v_rc.prenoms,
        'telephone', v_rc.telephone,
        'village_nom', v_rc.village_nom,
        'grappe', v_rc.grappe,
        'nom_grappe', v_rc.nom_grappe,
        'code_temporaire_utilise', v_rc.code_temporaire_utilise,
        'ascq_nom', COALESCE(v_ascq.nom, 'NON RENSEIGNÉ'),
        'ascq_prenoms', COALESCE(v_ascq.prenoms, ''),
        'ascq_telephone', v_ascq.telephone
    );
END;
$$;

-- Permissions d'exécution
GRANT EXECUTE ON FUNCTION public.enroler_relais_communautaire TO authenticated;
GRANT EXECUTE ON FUNCTION public.reinitialiser_code_acces_rc TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_mot_de_passe_rc TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_mes_relais TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtenir_espace_rc TO authenticated;
