-- =====================================================================
-- MIGRATION : AUTO-INSCRIPTION DES RELAIS COMMUNAUTAIRES (RC)
-- ET VALIDATION / AFFECTATION VILLAGE PAR L'ASCQ DE L'ARRONDISSEMENT
-- =====================================================================

-- 1. ADAPTATION DE LA TABLE relais_communautaires
ALTER TABLE public.relais_communautaires 
    ALTER COLUMN ascq_id DROP NOT NULL;

ALTER TABLE public.relais_communautaires 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS arrondissement_id UUID REFERENCES public.arrondissements(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'ACTIF';

-- Index pour recherche rapide des RC par arrondissement et statut
CREATE INDEX IF NOT EXISTS idx_rc_arrondissement ON public.relais_communautaires(arrondissement_id);
CREATE INDEX IF NOT EXISTS idx_rc_statut ON public.relais_communautaires(statut);
CREATE INDEX IF NOT EXISTS idx_rc_user_id ON public.relais_communautaires(user_id);

-- 2. ADAPTATION DE LA FONCTION inscrire_nouvel_agent POUR GÉRER LE RÔLE RC
DROP FUNCTION IF EXISTS public.inscrire_nouvel_agent(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS public.inscrire_nouvel_agent;

CREATE OR REPLACE FUNCTION public.inscrire_nouvel_agent(
    p_id UUID,
    p_telephone TEXT,
    p_nom TEXT,
    p_prenoms TEXT,
    p_poste TEXT,
    p_poste_autre TEXT,
    p_departement_id UUID,
    p_zone_sanitaire_id UUID,
    p_commune_id UUID,
    p_arrondissement_id UUID,
    p_second_arrondissement_id UUID,
    p_source_financement TEXT,
    p_source_financement_autre TEXT,
    p_nombre_rc INTEGER,
    p_afficher_annuaire BOOLEAN,
    p_cumul_deux_arrondissements BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_phone TEXT;
    v_ascq_id UUID;
    v_role_tech TEXT;
BEGIN
    v_clean_phone := TRIM(p_telephone);

    IF auth.uid() IS NOT NULL AND auth.uid() != p_id THEN
        RAISE EXCEPTION 'Non autorisé : l''identifiant ne correspond pas à la session connectée.';
    END IF;

    -- Vérifier si un compte validé existe déjà avec ce téléphone
    IF EXISTS (
        SELECT 1 FROM public.utilisateurs 
        WHERE (id = p_id OR telephone = v_clean_phone) 
          AND statut_compte IN ('VALIDE', 'SUSPENDU')
    ) THEN
        RAISE EXCEPTION 'Compte déjà existant et validé. Veuillez vous connecter ou contacter l''administrateur.';
    END IF;

    -- Déterminer le rôle technique selon le poste
    IF p_poste = 'ASCQ' THEN
        v_role_tech := 'ASCQ_OPERATEUR';
    ELSIF p_poste IN ('RC', 'RELAIS_COMMUNAUTAIRE') THEN
        v_role_tech := 'RELAIS_COMMUNAUTAIRE';
    ELSE
        v_role_tech := 'PUBLIC';
    END IF;

    -- Recherche de l'ASCQ superviseur si c'est un Relais Communautaire
    IF p_poste IN ('RC', 'RELAIS_COMMUNAUTAIRE') AND p_arrondissement_id IS NOT NULL THEN
        SELECT id INTO v_ascq_id 
        FROM public.utilisateurs 
        WHERE (arrondissement_id = p_arrondissement_id OR second_arrondissement_id = p_arrondissement_id)
          AND poste = 'ASCQ' 
          AND statut_compte = 'VALIDE'
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    -- Insertion ou mise à jour dans public.utilisateurs
    IF EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = p_id) THEN
        UPDATE public.utilisateurs
        SET telephone = v_clean_phone,
            nom = UPPER(TRIM(p_nom)),
            prenoms = TRIM(p_prenoms),
            poste = CASE WHEN p_poste = 'RELAIS_COMMUNAUTAIRE' THEN 'RC' ELSE p_poste END,
            poste_autre = p_poste_autre,
            departement_id = p_departement_id,
            zone_sanitaire_id = p_zone_sanitaire_id,
            commune_id = p_commune_id,
            arrondissement_id = p_arrondissement_id,
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
            CASE WHEN p_poste = 'RELAIS_COMMUNAUTAIRE' THEN 'RC' ELSE p_poste END, 
            p_poste_autre,
            v_role_tech,
            'EN_ATTENTE',
            p_departement_id, p_zone_sanitaire_id, p_commune_id, p_arrondissement_id, p_second_arrondissement_id
        );
    END IF;

    -- Profil spécifique ASCQ
    IF p_poste = 'ASCQ' THEN
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

    -- Profil spécifique Relais Communautaire (En attente de validation et d'affectation village par l'ASCQ)
    IF p_poste IN ('RC', 'RELAIS_COMMUNAUTAIRE') THEN
        INSERT INTO public.relais_communautaires (
            user_id,
            ascq_id,
            nom,
            prenoms,
            telephone,
            arrondissement_id,
            village_id,
            village_nom,
            grappe,
            code_acces_temporaire,
            code_temporaire_utilise,
            statut
        ) VALUES (
            p_id,
            v_ascq_id,
            UPPER(TRIM(p_nom)),
            TRIM(p_prenoms),
            v_clean_phone,
            p_arrondissement_id,
            NULL,
            'En attente d''affectation',
            1,
            '0000',
            TRUE,
            'EN_ATTENTE'
        )
        ON CONFLICT (ascq_id, telephone) DO UPDATE SET
            user_id = p_id,
            nom = EXCLUDED.nom,
            prenoms = EXCLUDED.prenoms,
            arrondissement_id = EXCLUDED.arrondissement_id,
            statut = 'EN_ATTENTE';

        -- Alerte / Notification pour l'ASCQ de l'arrondissement
        IF v_ascq_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                destinataire_id,
                titre,
                message,
                type,
                lu
            ) VALUES (
                v_ascq_id,
                'Nouveau Relais Communautaire auto-inscrit',
                format('Le Relais Communautaire %s %s (%s) s''est inscrit dans votre arrondissement. Veuillez valider son inscription et l''affecter à son village d''intervention.', TRIM(p_prenoms), UPPER(TRIM(p_nom)), v_clean_phone),
                'ALERTE',
                FALSE
            );
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'id', p_id, 'poste', p_poste, 'statut', 'EN_ATTENTE');
END;
$$;

-- 3. FONCTION : LISTER LES RELAIS EN ATTENTE DANS L'ARRONDISSEMENT DE L'ASCQ
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
BEGIN
    -- Récupérer l'arrondissement de l'ASCQ connecté
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
        u.arrondissement_id,
        arr.nom as arrondissement_nom,
        com.nom as commune_nom,
        u.created_at
    FROM public.utilisateurs u
    LEFT JOIN public.arrondissements arr ON arr.id = u.arrondissement_id
    LEFT JOIN public.communes com ON com.id = u.commune_id
    LEFT JOIN public.relais_communautaires rc ON rc.user_id = u.id OR (rc.telephone = u.telephone AND rc.ascq_id = auth.uid())
    WHERE u.poste = 'RC'
      AND (u.statut_compte = 'EN_ATTENTE' OR COALESCE(rc.statut, 'EN_ATTENTE') = 'EN_ATTENTE')
      AND (
          u.arrondissement_id = v_ascq_arr_id 
          OR (v_ascq_second_arr_id IS NOT NULL AND u.arrondissement_id = v_ascq_second_arr_id)
          OR rc.ascq_id = auth.uid()
          OR public.est_super_admin()
      )
    ORDER BY u.created_at DESC;
END;
$$;

-- 4. FONCTION : VALIDER ET AFFECTER UN RELAIS DANS UN VILLAGE (AVEC MÉMORISATION DU VILLAGE)
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
    v_village_id UUID;
    v_clean_village TEXT;
    v_actual_user_id UUID;
BEGIN
    v_ascq_id := auth.uid();
    v_clean_village := INITCAP(TRIM(p_village_nom));

    IF v_clean_village IS NULL OR length(v_clean_village) < 2 THEN
        RAISE EXCEPTION 'Le nom du village d''intervention est obligatoire.';
    END IF;

    -- Récupérer l'arrondissement de l'ASCQ connecté
    SELECT arrondissement_id INTO v_arr_id
    FROM public.utilisateurs
    WHERE id = v_ascq_id;

    -- 1. Sauvegarder ou récupérer le village dans public.villages pour qu'il soit gardé en mémoire
    IF v_arr_id IS NOT NULL THEN
        SELECT id INTO v_village_id
        FROM public.villages
        WHERE arrondissement_id = v_arr_id AND LOWER(nom) = LOWER(v_clean_village)
        LIMIT 1;

        IF v_village_id IS NULL THEN
            INSERT INTO public.villages (nom, arrondissement_id)
            VALUES (v_clean_village, v_arr_id)
            RETURNING id INTO v_village_id;
        END IF;
    END IF;

    -- 2. Identifier le user_id correspondant
    v_actual_user_id := p_user_id;
    IF v_actual_user_id IS NULL AND p_rc_id IS NOT NULL THEN
        SELECT user_id INTO v_actual_user_id
        FROM public.relais_communautaires
        WHERE id = p_rc_id;
    END IF;

    -- 3. Mettre à jour public.utilisateurs
    IF v_actual_user_id IS NOT NULL THEN
        UPDATE public.utilisateurs
        SET statut_compte = 'VALIDE',
            role_technique = 'RELAIS_COMMUNAUTAIRE',
            updated_at = NOW()
        WHERE id = v_actual_user_id;
    END IF;

    -- 4. Mettre à jour ou insérer dans public.relais_communautaires
    IF p_rc_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.relais_communautaires WHERE id = p_rc_id) THEN
        UPDATE public.relais_communautaires
        SET ascq_id = v_ascq_id,
            village_id = v_village_id,
            village_nom = v_clean_village,
            grappe = COALESCE(p_grappe, 1),
            nom_grappe = TRIM(p_nom_grappe),
            statut = 'ACTIF',
            updated_at = NOW()
        WHERE id = p_rc_id;
    ELSIF v_actual_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.relais_communautaires WHERE user_id = v_actual_user_id) THEN
        UPDATE public.relais_communautaires
        SET ascq_id = v_ascq_id,
            village_id = v_village_id,
            village_nom = v_clean_village,
            grappe = COALESCE(p_grappe, 1),
            nom_grappe = TRIM(p_nom_grappe),
            statut = 'ACTIF',
            updated_at = NOW()
        WHERE user_id = v_actual_user_id;
    ELSE
        -- Insertion d'un nouveau Relais rattaché
        INSERT INTO public.relais_communautaires (
            user_id,
            ascq_id,
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
        )
        SELECT 
            u.id,
            v_ascq_id,
            u.nom,
            u.prenoms,
            u.telephone,
            v_village_id,
            v_clean_village,
            COALESCE(p_grappe, 1),
            TRIM(p_nom_grappe),
            '0000',
            TRUE,
            'ACTIF'
        FROM public.utilisateurs u
        WHERE u.id = v_actual_user_id;
    END IF;

    -- 5. Notification de succès au RC
    IF v_actual_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type,
            lu
        ) VALUES (
            v_actual_user_id,
            'Compte Relais validé avec succès',
            format('Votre compte Relais Communautaire a été validé par votre superviseur ASCQ et affecté au village %s. Vous pouvez maintenant vous connecter et commencer vos activités.', v_clean_village),
            'INFO',
            FALSE
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'message', format('Relais validé et affecté avec succès au village %s.', v_clean_village),
        'village_nom', v_clean_village,
        'village_id', v_village_id
    );
END;
$$;

-- 5. FONCTION : CHARGER TOUS LES VILLAGES CONNUS ET HISTORIQUES DE L'ARRONDISSEMENT
CREATE OR REPLACE FUNCTION public.lister_villages_arrondissement_ascq()
RETURNS TABLE (
    id UUID,
    nom TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_arr_id UUID;
    v_second_arr_id UUID;
BEGIN
    SELECT arrondissement_id, second_arrondissement_id
    INTO v_arr_id, v_second_arr_id
    FROM public.utilisateurs
    WHERE id = auth.uid();

    RETURN QUERY
    WITH tous_villages AS (
        -- Villages officiels de la table villages
        SELECT v.id, v.nom
        FROM public.villages v
        WHERE v.arrondissement_id = v_arr_id 
           OR (v_second_arr_id IS NOT NULL AND v.arrondissement_id = v_second_arr_id)
        
        UNION
        
        -- Villages saisis historiquement par l'ASCQ dans les fiches de relais
        SELECT NULL::uuid as id, rc.village_nom as nom
        FROM public.relais_communautaires rc
        WHERE rc.ascq_id = auth.uid()
          AND rc.village_nom IS NOT NULL
          AND rc.village_nom != ''
          AND rc.village_nom != 'En attente d''affectation'
    )
    SELECT DISTINCT ON (LOWER(tv.nom))
        COALESCE(tv.id, gen_random_uuid()) as id,
        INITCAP(TRIM(tv.nom)) as nom
    FROM tous_villages tv
    WHERE tv.nom IS NOT NULL AND TRIM(tv.nom) != ''
    ORDER BY LOWER(tv.nom) ASC;
END;
$$;

-- 6. PERMISSIONS D'EXÉCUTION
GRANT EXECUTE ON FUNCTION public.inscrire_nouvel_agent TO anon;
GRANT EXECUTE ON FUNCTION public.inscrire_nouvel_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_relais_en_attente_ascq TO authenticated;
GRANT EXECUTE ON FUNCTION public.ascq_valider_et_affecter_relais TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_villages_arrondissement_ascq TO authenticated;
