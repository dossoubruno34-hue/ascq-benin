-- =====================================================================
-- ASCQ BÉNIN - CORRECTION SÉPARATION PAR ARRONDISSEMENT (DASSO vs TOHOUES)
-- Date : 2026-11-10
-- =====================================================================

DO $$
DECLARE
    v_ascq_dasso_id UUID := 'a31c25e4-eaf1-4bb0-954b-caa460c8001d'; -- Pierre AGOUNTCHEDE
    v_arr_dasso_id UUID := '85942f66-98f8-4f90-ac90-05eaa16fc8e9';  -- Arrondissement DASSO
    v_arr_tohoues_id UUID := '1d451a4c-5386-4f79-9d9c-d8a4d19beef0'; -- Arrondissement TOHOUES
    v_village_akassa_id UUID;
BEGIN
    -- 1. Réassigner le village Akassa à l'arrondissement de DASSO
    UPDATE public.villages
    SET arrondissement_id = v_arr_dasso_id
    WHERE LOWER(TRIM(nom)) = 'akassa';

    SELECT id INTO v_village_akassa_id
    FROM public.villages
    WHERE LOWER(TRIM(nom)) = 'akassa' AND arrondissement_id = v_arr_dasso_id
    LIMIT 1;

    -- 2. Réassigner les RC de DASSO (AIKOLE, HOUSSOU, ADAVONON) à l'ASCQ de DASSO
    -- A) AIKOLE Hélène (+2290161875474)
    UPDATE public.utilisateurs
    SET arrondissement_id = v_arr_dasso_id,
        updated_at = NOW()
    WHERE telephone = '+2290161875474';

    UPDATE public.relais_communautaires
    SET ascq_id = v_ascq_dasso_id,
        arrondissement_id = v_arr_dasso_id,
        village_id = COALESCE(v_village_akassa_id, village_id),
        village_nom = 'Akassa',
        updated_at = NOW()
    WHERE telephone = '+2290161875474';

    -- B) HOUSSOU MINLIMON AARON (+2290167352380)
    UPDATE public.utilisateurs
    SET arrondissement_id = v_arr_dasso_id,
        updated_at = NOW()
    WHERE telephone = '+2290167352380';

    UPDATE public.relais_communautaires
    SET ascq_id = v_ascq_dasso_id,
        arrondissement_id = v_arr_dasso_id,
        updated_at = NOW()
    WHERE telephone = '+2290167352380';

    -- C) ADAVONON Dedjanmayi Roland (+2290196627660)
    UPDATE public.utilisateurs
    SET arrondissement_id = v_arr_dasso_id,
        updated_at = NOW()
    WHERE telephone = '+2290196627660';

    UPDATE public.relais_communautaires
    SET ascq_id = v_ascq_dasso_id,
        arrondissement_id = v_arr_dasso_id,
        updated_at = NOW()
    WHERE telephone = '+2290196627660';

    -- 3. Nettoyer les faux comptes de test s'ils existent encore
    DELETE FROM public.relais_communautaires WHERE telephone IN ('+22955555555', '+22944444444', '+22911111111');
    DELETE FROM public.utilisateurs WHERE telephone IN ('+22955555555', '+22944444444', '+22911111111');
END $$;

-- 4. MISE À JOUR DE LA FONCTION : lister_relais_en_attente_ascq
-- L'ASCQ ne doit voir QUE les relais de son propre arrondissement (ou qui l'ont explicitement choisi comme ASCQ)
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
        COALESCE(arr.nom, 'Arrondissement') as arrondissement_nom,
        COALESCE(com.nom, 'Commune') as commune_nom,
        u.created_at
    FROM public.utilisateurs u
    LEFT JOIN public.relais_communautaires rc ON rc.user_id = u.id OR (rc.telephone = u.telephone)
    LEFT JOIN public.arrondissements arr ON arr.id = COALESCE(u.arrondissement_id, rc.arrondissement_id, v_ascq_arr_id)
    LEFT JOIN public.communes com ON com.id = u.commune_id
    WHERE u.poste = 'RC'
      AND (u.statut_compte = 'EN_ATTENTE' OR COALESCE(rc.statut, 'EN_ATTENTE') = 'EN_ATTENTE')
      AND (
          -- Soit le relais est expressément affecté à cet ASCQ
          rc.ascq_id = auth.uid()
          -- Soit le relais est dans l'arrondissement principal de l'ASCQ
          OR (v_ascq_arr_id IS NOT NULL AND u.arrondissement_id = v_ascq_arr_id)
          -- Soit le relais est dans le second arrondissement de l'ASCQ
          OR (v_ascq_second_arr_id IS NOT NULL AND u.arrondissement_id = v_ascq_second_arr_id)
      )
    ORDER BY u.created_at DESC;
END;
$$;

-- 5. MISE À JOUR DE LA FONCTION : ascq_valider_et_affecter_relais
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
    v_rc_arr_id UUID;
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

    -- Récupérer l'arrondissement du RC s'il est déjà défini
    IF v_target_user_id IS NOT NULL THEN
        SELECT arrondissement_id INTO v_rc_arr_id
        FROM public.utilisateurs
        WHERE id = v_target_user_id;
    END IF;
    IF v_rc_arr_id IS NULL THEN
        v_rc_arr_id := v_arr_id;
    END IF;

    -- 1. Sauvegarder ou récupérer le village dans public.villages
    IF v_rc_arr_id IS NOT NULL THEN
        SELECT id INTO v_village_id
        FROM public.villages
        WHERE arrondissement_id = v_rc_arr_id AND LOWER(TRIM(nom)) = LOWER(v_clean_village)
        LIMIT 1;

        IF v_village_id IS NULL THEN
            INSERT INTO public.villages (nom, arrondissement_id)
            VALUES (v_clean_village, v_rc_arr_id)
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_village_id;

            IF v_village_id IS NULL THEN
                SELECT id INTO v_village_id
                FROM public.villages
                WHERE arrondissement_id = v_rc_arr_id AND LOWER(TRIM(nom)) = LOWER(v_clean_village)
                LIMIT 1;
            END IF;
        END IF;
    END IF;

    -- 2. Mettre à jour public.utilisateurs
    IF v_target_user_id IS NOT NULL THEN
        UPDATE public.utilisateurs
        SET
            statut_compte = 'VALIDE',
            role_technique = 'RC',
            poste = 'RC',
            arrondissement_id = COALESCE(arrondissement_id, v_rc_arr_id),
            commune_id = COALESCE(commune_id, v_com_id),
            updated_at = NOW()
        WHERE id = v_target_user_id;
    END IF;

    -- 3. Mettre à jour ou créer l'entrée dans public.relais_communautaires
    IF v_target_user_id IS NOT NULL OR p_rc_id IS NOT NULL THEN
        UPDATE public.relais_communautaires
        SET
            ascq_id = v_ascq_id,
            arrondissement_id = COALESCE(arrondissement_id, v_rc_arr_id),
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
                COALESCE(u.arrondissement_id, v_rc_arr_id),
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

-- 6. PERMISSIONS
GRANT EXECUTE ON FUNCTION public.lister_relais_en_attente_ascq() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.ascq_valider_et_affecter_relais(UUID, UUID, TEXT, INTEGER, TEXT) TO authenticated, anon;
