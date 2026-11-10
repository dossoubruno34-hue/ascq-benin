-- =====================================================================
-- ASCQ BÉNIN - CORRECTIF CRITIQUE : VALIDATION RELAIS & BOUCLE CONNEXION
-- Date : 2026-11-10
-- =====================================================================

-- 1. SÉCURISATION DE LA TABLE relais_communautaires
CREATE UNIQUE INDEX IF NOT EXISTS idx_relais_user_id_unique 
    ON public.relais_communautaires(user_id) 
    WHERE user_id IS NOT NULL;

ALTER TABLE public.relais_communautaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insertion relais par ASCQ" ON public.relais_communautaires;
DROP POLICY IF EXISTS "Insertion relais par ASCQ ou auto-inscription" ON public.relais_communautaires;
CREATE POLICY "Insertion relais par ASCQ ou auto-inscription" ON public.relais_communautaires
    FOR INSERT TO authenticated
    WITH CHECK (
        ascq_id = auth.uid() 
        OR user_id = auth.uid()
        OR public.est_super_admin()
    );

DROP POLICY IF EXISTS "Lecture relais par ASCQ ou RC" ON public.relais_communautaires;
DROP POLICY IF EXISTS "Lecture relais securisee ASCQ et RC" ON public.relais_communautaires;
CREATE POLICY "Lecture relais securisee ASCQ et RC" ON public.relais_communautaires
    FOR SELECT TO authenticated
    USING (
        ascq_id = auth.uid() 
        OR user_id = auth.uid()
        OR public.est_super_admin()
        OR EXISTS (
            SELECT 1 FROM public.utilisateurs u
            WHERE u.id = auth.uid() 
              AND (
                  u.role_technique IN ('SUPER_ADMIN', 'PF_CCLS_TP', 'MEMBRE_MINISTERE', 'ASCQ') 
                  OR u.arrondissement_id = relais_communautaires.arrondissement_id
              )
        )
    );

DROP POLICY IF EXISTS "Modification relais par ASCQ ou RC" ON public.relais_communautaires;
CREATE POLICY "Modification relais par ASCQ ou RC" ON public.relais_communautaires
    FOR UPDATE TO authenticated
    USING (
        ascq_id = auth.uid() 
        OR user_id = auth.uid()
        OR public.est_super_admin()
    );

-- 2. FONCTION RESILIENTE : obtenir_espace_rc (ZÉRO EXCEPTION, AUTO-PROVISIONNEMENT)
CREATE OR REPLACE FUNCTION public.obtenir_espace_rc()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_rc RECORD;
    v_ascq RECORD;
    v_user RECORD;
    v_ref_ascq_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    -- Récupérer l'utilisateur
    SELECT * INTO v_user
    FROM public.utilisateurs
    WHERE id = v_user_id;

    IF v_user.id IS NULL THEN
        RAISE EXCEPTION 'Compte utilisateur introuvable.';
    END IF;

    -- 1. Chercher la fiche RC existante
    SELECT * INTO v_rc
    FROM public.relais_communautaires
    WHERE user_id = v_user_id
    LIMIT 1;

    -- 2. Recherche par téléphone si user_id n'était pas encore lié
    IF v_rc.id IS NULL AND v_user.telephone IS NOT NULL THEN
        SELECT * INTO v_rc
        FROM public.relais_communautaires
        WHERE telephone = v_user.telephone
        LIMIT 1;

        IF v_rc.id IS NOT NULL THEN
            UPDATE public.relais_communautaires
            SET user_id = v_user_id
            WHERE id = v_rc.id;
        END IF;
    END IF;

    -- 3. Si toujours introuvable, AUTO-PROVISIONNEMENT pour éliminer toute boucle infinie
    IF v_rc.id IS NULL THEN
        SELECT id INTO v_ref_ascq_id
        FROM public.utilisateurs
        WHERE poste = 'ASCQ' 
          AND statut_compte = 'VALIDE'
          AND (
              (v_user.arrondissement_id IS NOT NULL AND arrondissement_id = v_user.arrondissement_id)
              OR (v_user.commune_id IS NOT NULL AND commune_id = v_user.commune_id)
          )
        ORDER BY created_at ASC
        LIMIT 1;

        INSERT INTO public.relais_communautaires (
            user_id,
            ascq_id,
            arrondissement_id,
            nom,
            prenoms,
            telephone,
            village_nom,
            grappe,
            code_acces_temporaire,
            code_temporaire_utilise,
            statut
        ) VALUES (
            v_user_id,
            v_ref_ascq_id,
            v_user.arrondissement_id,
            v_user.nom,
            v_user.prenoms,
            v_user.telephone,
            'Village à préciser',
            1,
            '0000',
            TRUE,
            CASE WHEN v_user.statut_compte = 'VALIDE' THEN 'ACTIF' ELSE 'EN_ATTENTE' END
        )
        RETURNING * INTO v_rc;
    END IF;

    -- 4. Informations de l'ASCQ référent
    SELECT nom, prenoms, telephone INTO v_ascq
    FROM public.utilisateurs
    WHERE id = v_rc.ascq_id;

    RETURN jsonb_build_object(
        'rc_id', v_rc.id,
        'user_id', v_rc.user_id,
        'id', v_rc.user_id,
        'ascq_id', v_rc.ascq_id,
        'nom', v_rc.nom,
        'prenoms', v_rc.prenoms,
        'telephone', v_rc.telephone,
        'village_nom', COALESCE(v_rc.village_nom, 'Village à préciser'),
        'grappe', COALESCE(v_rc.grappe, 1),
        'nom_grappe', v_rc.nom_grappe,
        'code_temporaire_utilise', COALESCE(v_rc.code_temporaire_utilise, TRUE),
        'statut', COALESCE(v_rc.statut, 'ACTIF'),
        'ascq_nom', COALESCE(v_ascq.nom, 'NON RENSEIGNÉ'),
        'ascq_prenoms', COALESCE(v_ascq.prenoms, ''),
        'ascq_telephone', v_ascq.telephone
    );
END;
$$;

-- 3. FONCTION DE LISTAGE DES RC EN ATTENTE POUR L'ASCQ
CREATE OR REPLACE FUNCTION public.lister_relais_en_attente_ascq()
RETURNS TABLE (
    rc_id UUID,
    user_id UUID,
    nom TEXT,
    prenoms TEXT,
    telephone TEXT,
    arrondissement_id UUID,
    arrondissement_nom TEXT,
    commune_nom TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ascq_arr_id UUID;
    v_ascq_second_arr_id UUID;
    v_ascq_com_id UUID;
BEGIN
    SELECT u.arrondissement_id, u.second_arrondissement_id, u.commune_id
    INTO v_ascq_arr_id, v_ascq_second_arr_id, v_ascq_com_id
    FROM public.utilisateurs u
    WHERE u.id = auth.uid();

    RETURN QUERY
    SELECT 
        COALESCE(rc.id, u.id) as rc_id,
        u.id as user_id,
        u.nom,
        u.prenoms,
        u.telephone,
        COALESCE(u.arrondissement_id, rc.arrondissement_id, v_ascq_arr_id) as arrondissement_id,
        COALESCE(arr.nom, 'Arrondissement de l''ASCQ') as arrondissement_nom,
        COALESCE(com.nom, 'Commune') as commune_nom,
        u.created_at
    FROM public.utilisateurs u
    LEFT JOIN public.relais_communautaires rc ON rc.user_id = u.id OR (rc.telephone = u.telephone)
    LEFT JOIN public.arrondissements arr ON arr.id = COALESCE(u.arrondissement_id, rc.arrondissement_id, v_ascq_arr_id)
    LEFT JOIN public.communes com ON com.id = u.commune_id
    WHERE u.poste = 'RC'
      AND (u.statut_compte = 'EN_ATTENTE' OR COALESCE(rc.statut, 'EN_ATTENTE') = 'EN_ATTENTE')
      AND (
          rc.ascq_id = auth.uid()
          OR u.arrondissement_id = v_ascq_arr_id 
          OR (v_ascq_second_arr_id IS NOT NULL AND u.arrondissement_id = v_ascq_second_arr_id)
          OR (u.commune_id = v_ascq_com_id)
          OR public.est_super_admin()
      )
    ORDER BY u.created_at DESC;
END;
$$;

-- 4. VALIDATION ET AFFECTATION DU RELAIS PAR L'ASCQ
CREATE OR REPLACE FUNCTION public.ascq_valider_et_affecter_relais(
    p_rc_id UUID,
    p_user_id UUID,
    p_village_nom TEXT,
    p_grappe INTEGER DEFAULT 1,
    p_nom_grappe TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ascq_id UUID;
    v_arr_id UUID;
    v_com_id UUID;
    v_village_id UUID;
    v_clean_village TEXT;
    v_target_user_id UUID;
BEGIN
    v_ascq_id := auth.uid();
    v_clean_village := INITCAP(TRIM(p_village_nom));

    IF v_clean_village IS NULL OR length(v_clean_village) < 2 THEN
        RAISE EXCEPTION 'Le nom du village d''intervention est obligatoire.';
    END IF;

    SELECT arrondissement_id, commune_id 
    INTO v_arr_id, v_com_id
    FROM public.utilisateurs
    WHERE id = v_ascq_id;

    v_target_user_id := p_user_id;
    IF v_target_user_id IS NULL AND p_rc_id IS NOT NULL THEN
        SELECT user_id INTO v_target_user_id 
        FROM public.relais_communautaires 
        WHERE id = p_rc_id;
    END IF;

    -- 1. Sauvegarder ou récupérer le village dans public.villages
    IF v_arr_id IS NOT NULL THEN
        SELECT id INTO v_village_id
        FROM public.villages
        WHERE arrondissement_id = v_arr_id AND LOWER(TRIM(nom)) = LOWER(v_clean_village)
        LIMIT 1;

        IF v_village_id IS NULL THEN
            INSERT INTO public.villages (nom, arrondissement_id)
            VALUES (v_clean_village, v_arr_id)
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_village_id;

            IF v_village_id IS NULL THEN
                SELECT id INTO v_village_id
                FROM public.villages
                WHERE arrondissement_id = v_arr_id AND LOWER(TRIM(nom)) = LOWER(v_clean_village)
                LIMIT 1;
            END IF;
        END IF;
    END IF;

    -- 2. Mettre à jour public.utilisateurs avec le rôle canonique 'RC'
    IF v_target_user_id IS NOT NULL THEN
        UPDATE public.utilisateurs
        SET
            statut_compte = 'VALIDE',
            role_technique = 'RC',
            poste = 'RC',
            arrondissement_id = COALESCE(arrondissement_id, v_arr_id),
            commune_id = COALESCE(commune_id, v_com_id),
            updated_at = NOW()
        WHERE id = v_target_user_id;
    END IF;

    -- 3. Mettre à jour ou créer l'entrée dans public.relais_communautaires
    IF v_target_user_id IS NOT NULL OR p_rc_id IS NOT NULL THEN
        UPDATE public.relais_communautaires
        SET
            ascq_id = v_ascq_id,
            arrondissement_id = COALESCE(arrondissement_id, v_arr_id),
            village_id = COALESCE(v_village_id, village_id),
            village_nom = v_clean_village,
            grappe = COALESCE(p_grappe, grappe, 1),
            nom_grappe = p_nom_grappe,
            statut = 'ACTIF',
            code_temporaire_utilise = TRUE,
            updated_at = NOW()
        WHERE (p_rc_id IS NOT NULL AND id = p_rc_id)
           OR (v_target_user_id IS NOT NULL AND user_id = v_target_user_id);

        IF NOT FOUND AND v_target_user_id IS NOT NULL THEN
            INSERT INTO public.relais_communautaires (
                user_id,
                ascq_id,
                arrondissement_id,
                village_id,
                village_nom,
                grappe,
                nom_grappe,
                nom,
                prenoms,
                telephone,
                code_acces_temporaire,
                code_temporaire_utilise,
                statut,
                updated_at
            )
            SELECT
                u.id,
                v_ascq_id,
                COALESCE(u.arrondissement_id, v_arr_id),
                v_village_id,
                v_clean_village,
                COALESCE(p_grappe, 1),
                p_nom_grappe,
                u.nom,
                u.prenoms,
                u.telephone,
                '0000',
                TRUE,
                'ACTIF',
                NOW()
            FROM public.utilisateurs u
            WHERE u.id = v_target_user_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Relais affecté avec succès au village %s (Grappe %s).', v_clean_village, COALESCE(p_grappe, 1))
    );
END;
$$;

-- 5. SYNCHRONISATION DES RC ACTUELLEMENT VALIDÉS SANS FICHE RELAIS
INSERT INTO public.relais_communautaires (
    user_id,
    ascq_id,
    arrondissement_id,
    nom,
    prenoms,
    telephone,
    village_nom,
    grappe,
    code_acces_temporaire,
    code_temporaire_utilise,
    statut
)
SELECT 
    u.id,
    (
        SELECT id FROM public.utilisateurs 
        WHERE poste = 'ASCQ' AND statut_compte = 'VALIDE'
          AND (
              (u.arrondissement_id IS NOT NULL AND arrondissement_id = u.arrondissement_id)
              OR (u.commune_id IS NOT NULL AND commune_id = u.commune_id)
          )
        ORDER BY created_at ASC LIMIT 1
    ),
    u.arrondissement_id,
    u.nom,
    u.prenoms,
    u.telephone,
    'Village principal',
    1,
    '0000',
    TRUE,
    'ACTIF'
FROM public.utilisateurs u
WHERE u.poste = 'RC' AND u.statut_compte = 'VALIDE'
  AND NOT EXISTS (SELECT 1 FROM public.relais_communautaires rc WHERE rc.user_id = u.id)
ON CONFLICT DO NOTHING;

-- 6. PERMISSIONS D'EXÉCUTION
GRANT EXECUTE ON FUNCTION public.obtenir_espace_rc() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.lister_relais_en_attente_ascq() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.ascq_valider_et_affecter_relais(UUID, UUID, TEXT, INTEGER, TEXT) TO authenticated, anon;
