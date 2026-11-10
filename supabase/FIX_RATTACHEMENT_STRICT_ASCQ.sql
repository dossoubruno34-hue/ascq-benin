-- =====================================================================
-- ASCQ BÉNIN - CORRECTION FINALE : RATTACHEMENT STRICT ASCQ ENRÔLEMENT
-- Date : 2026-11-10
-- =====================================================================

DO $$
DECLARE
    v_ascq_bruno_id UUID := '627b405a-8f74-46a8-bcb4-50ae421f168f'; -- Bruno DOSSOU
    v_arr_tohoues_id UUID := '1d451a4c-5386-4f79-9d9c-d8a4d19beef0'; -- Arrondissement TOHOUES
    v_village_akassa_id UUID;
BEGIN
    -- 1. Réassigner le village Akassa à l'arrondissement de TOHOUES
    UPDATE public.villages
    SET arrondissement_id = v_arr_tohoues_id
    WHERE LOWER(TRIM(nom)) = 'akassa';

    SELECT id INTO v_village_akassa_id
    FROM public.villages
    WHERE LOWER(TRIM(nom)) = 'akassa' AND arrondissement_id = v_arr_tohoues_id
    LIMIT 1;

    IF v_village_akassa_id IS NULL THEN
        INSERT INTO public.villages (nom, arrondissement_id)
        VALUES ('Akassa', v_arr_tohoues_id)
        RETURNING id INTO v_village_akassa_id;
    END IF;

    -- 2. Réassigner Hélène AIKOLE (+2290161875474) à TOHOUES et Bruno DOSSOU
    UPDATE public.utilisateurs
    SET arrondissement_id = v_arr_tohoues_id,
        updated_at = NOW()
    WHERE telephone = '+2290161875474';

    UPDATE public.relais_communautaires
    SET ascq_id = v_ascq_bruno_id,
        arrondissement_id = v_arr_tohoues_id,
        village_id = v_village_akassa_id,
        village_nom = 'Akassa',
        statut = 'ACTIF',
        updated_at = NOW()
    WHERE telephone = '+2290161875474';
END $$;

-- 3. MISE À JOUR DE LA FONCTION : inscrire_nouvel_agent
-- Prend en compte explicitement le superviseur ASCQ choisi lors de l'enrôlement du RC
CREATE OR REPLACE FUNCTION public.inscrire_nouvel_agent(
    p_id uuid,
    p_telephone text,
    p_nom text,
    p_prenoms text,
    p_poste text,
    p_poste_autre text,
    p_departement_id uuid,
    p_zone_sanitaire_id uuid,
    p_commune_id uuid,
    p_arrondissement_id uuid,
    p_second_arrondissement_id uuid,
    p_source_financement text,
    p_source_financement_autre text,
    p_nombre_rc integer,
    p_afficher_annuaire boolean,
    p_cumul_deux_arrondissements boolean,
    p_ascq_rattachement_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_clean_phone TEXT;
    v_ascq_id UUID;
    v_role_tech TEXT;
    v_poste_final TEXT;
    v_arr_id UUID;
BEGIN
    v_clean_phone := TRIM(p_telephone);
    v_arr_id := p_arrondissement_id;

    IF auth.uid() IS NOT NULL AND auth.uid() != p_id THEN
        RAISE EXCEPTION 'Non autorisé : l''identifiant ne correspond pas à la session connectée.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.utilisateurs 
        WHERE (id = p_id OR telephone = v_clean_phone) 
          AND statut_compte IN ('VALIDE', 'SUSPENDU')
    ) THEN
        RAISE EXCEPTION 'Compte déjà existant et validé. Veuillez vous connecter ou contacter l''administrateur.';
    END IF;

    IF p_poste = 'ASCQ' THEN
        v_role_tech := 'ASCQ';
        v_poste_final := 'ASCQ';
    ELSIF p_poste IN ('RC', 'RELAIS_COMMUNAUTAIRE', 'RELAIS') THEN
        v_role_tech := 'RC';
        v_poste_final := 'RC';
    ELSIF p_poste = 'PF_CCLS_TP' THEN
        v_role_tech := 'PF_CCLS_TP';
        v_poste_final := 'PF_CCLS_TP';
    ELSIF p_poste = 'MEMBRE_MINISTERE' THEN
        v_role_tech := 'MEMBRE_MINISTERE';
        v_poste_final := 'MEMBRE_MINISTERE';
    ELSE
        v_role_tech := 'PUBLIC';
        v_poste_final := COALESCE(p_poste, 'PUBLIC');
    END IF;

    -- Gestion du rattachement de l'ASCQ pour le Relais Communautaire (RC)
    IF v_poste_final = 'RC' THEN
        v_ascq_id := p_ascq_rattachement_id;

        -- Si l'ASCQ a été choisi mais que l'arrondissement n'était pas précisé, hériter de l'arrondissement de l'ASCQ
        IF v_ascq_id IS NOT NULL AND v_arr_id IS NULL THEN
            SELECT arrondissement_id INTO v_arr_id
            FROM public.utilisateurs
            WHERE id = v_ascq_id;
        END IF;

        -- Si l'arrondissement est renseigné mais pas l'ASCQ, chercher l'ASCQ de cet arrondissement
        IF v_ascq_id IS NULL AND v_arr_id IS NOT NULL THEN
            SELECT id INTO v_ascq_id 
            FROM public.utilisateurs 
            WHERE (arrondissement_id = v_arr_id OR second_arrondissement_id = v_arr_id)
              AND poste = 'ASCQ' AND statut_compte = 'VALIDE'
            ORDER BY created_at ASC LIMIT 1;
        END IF;
    END IF;

    -- Mise à jour ou insertion dans public.utilisateurs
    IF EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = p_id) THEN
        UPDATE public.utilisateurs
        SET telephone = v_clean_phone,
            nom = UPPER(TRIM(p_nom)),
            prenoms = TRIM(p_prenoms),
            poste = v_poste_final,
            poste_autre = p_poste_autre,
            departement_id = p_departement_id,
            zone_sanitaire_id = p_zone_sanitaire_id,
            commune_id = p_commune_id,
            arrondissement_id = v_arr_id,
            second_arrondissement_id = p_second_arrondissement_id,
            statut_compte = 'EN_ATTENTE',
            role_technique = v_role_tech,
            updated_at = NOW()
        WHERE id = p_id AND statut_compte IN ('EN_ATTENTE', 'REJETE');
    ELSE
        INSERT INTO public.utilisateurs (
            id, telephone, nom, prenoms, poste, poste_autre,
            role_technique, statut_compte,
            departement_id, zone_sanitaire_id, commune_id, arrondissement_id, second_arrondissement_id
        ) VALUES (
            p_id, v_clean_phone, UPPER(TRIM(p_nom)), TRIM(p_prenoms), 
            v_poste_final, p_poste_autre, v_role_tech, 'EN_ATTENTE',
            p_departement_id, p_zone_sanitaire_id, p_commune_id, v_arr_id, p_second_arrondissement_id
        );
    END IF;

    -- Si ASCQ, profils
    IF v_poste_final = 'ASCQ' THEN
        INSERT INTO public.ascq_profils (
            id, source_financement, source_financement_autre,
            nombre_rc, afficher_annuaire_public, cumul_deux_arrondissements
        ) VALUES (
            p_id, p_source_financement, p_source_financement_autre,
            COALESCE(p_nombre_rc, 0), COALESCE(p_afficher_annuaire, false), COALESCE(p_cumul_deux_arrondissements, false)
        )
        ON CONFLICT (id) DO UPDATE SET
            source_financement = EXCLUDED.source_financement,
            nombre_rc = EXCLUDED.nombre_rc,
            afficher_annuaire_public = EXCLUDED.afficher_annuaire_public;
    END IF;

    -- Si RC, créer immédiatement la fiche dans relais_communautaires avec l'ASCQ choisi !
    IF v_poste_final = 'RC' THEN
        INSERT INTO public.relais_communautaires (
            user_id, ascq_id, nom, prenoms, telephone, arrondissement_id, village_id, village_nom, grappe, code_acces_temporaire, code_temporaire_utilise, statut
        ) VALUES (
            p_id, v_ascq_id, UPPER(TRIM(p_nom)), TRIM(p_prenoms), v_clean_phone, v_arr_id, NULL, 'En attente d''affectation', 1, '0000', false, 'EN_ATTENTE'
        )
        ON CONFLICT (user_id) DO UPDATE SET
            ascq_id = EXCLUDED.ascq_id,
            arrondissement_id = EXCLUDED.arrondissement_id,
            nom = EXCLUDED.nom,
            prenoms = EXCLUDED.prenoms,
            telephone = EXCLUDED.telephone,
            statut = 'EN_ATTENTE',
            updated_at = NOW();
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Inscription réussie en attente de validation par votre ASCQ référent.', 'poste', v_poste_final);
END;
$function$;

-- 4. FONCTION DE LISTAGE STRICTEMENT RESTREINTE À L'ASCQ CHOISI
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
AS $function$
DECLARE
    v_ascq_arr_id UUID;
    v_ascq_second_arr_id UUID;
BEGIN
    SELECT u.arrondissement_id, u.second_arrondissement_id
    INTO v_ascq_arr_id, v_ascq_second_arr_id
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
          (rc.ascq_id IS NOT NULL AND rc.ascq_id = auth.uid())
          OR (rc.ascq_id IS NULL AND (
              (v_ascq_arr_id IS NOT NULL AND u.arrondissement_id = v_ascq_arr_id)
              OR (v_ascq_second_arr_id IS NOT NULL AND u.arrondissement_id = v_ascq_second_arr_id)
          ))
      )
    ORDER BY u.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.inscrire_nouvel_agent(uuid, text, text, text, text, text, uuid, uuid, uuid, uuid, uuid, text, text, integer, boolean, boolean, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lister_relais_en_attente_ascq() TO anon, authenticated;
