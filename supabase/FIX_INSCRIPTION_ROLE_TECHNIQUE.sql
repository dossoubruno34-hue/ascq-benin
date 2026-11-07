-- =====================================================================
-- CORRECTIF URGENT : CONTRAINTE ROLE_TECHNIQUE & RPC inscrire_nouvel_agent
-- SantéCom Bénin - Rôles officiels : SUPER_ADMIN, MEMBRE_MINISTERE, PF_CCLS_TP, ASCQ, RC, PUBLIC
-- =====================================================================

-- 1. Élargissement de la contrainte CHECK sur public.utilisateurs(role_technique)
-- Autorise les nouveaux rôles SantéCom Bénin et les anciens rôles de transition pour éviter toute violation
ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_technique_check;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_role_technique_check
    CHECK (role_technique IN (
        'SUPER_ADMIN', 
        'MEMBRE_MINISTERE', 
        'PF_CCLS_TP', 
        'ASCQ', 
        'RC', 
        'PUBLIC',
        'ASCQ_OPERATEUR',
        'RELAIS',
        'CADRE_COMMUNAL',
        'CADRE_DEPARTEMENTAL',
        'CADRE_ZONE_SANITAIRE',
        'CADRE_NATIONAL',
        'ADMINISTRATEUR'
    ));

-- 2. Nettoyage et normalisation immédiate des utilisateurs existants
UPDATE public.utilisateurs SET role_technique = 'ASCQ' WHERE role_technique = 'ASCQ_OPERATEUR';
UPDATE public.utilisateurs SET role_technique = 'RC' WHERE role_technique = 'RELAIS';

-- 3. Mise à jour de la fonction RPC officielle inscrire_nouvel_agent (18 paramètres)
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
    p_cumul_deux_arrondissements BOOLEAN,
    p_email TEXT DEFAULT NULL,
    p_ascq_rattachement_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_clean_phone TEXT;
    v_clean_email TEXT;
    v_ascq_id UUID := p_ascq_rattachement_id;
    v_role_tech TEXT;
BEGIN
    v_clean_phone := TRIM(p_telephone);
    v_clean_email := NULLIF(LOWER(TRIM(p_email)), '');

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

    -- Déterminer le rôle technique selon le modèle officiel SantéCom Bénin
    IF p_poste = 'ASCQ' THEN
        v_role_tech := 'ASCQ';
    ELSIF p_poste IN ('RC', 'RELAIS_COMMUNAUTAIRE', 'RELAIS') THEN
        v_role_tech := 'RC';
    ELSIF p_poste IN ('PF_CCLS_TP', 'MCC', 'CADRE_COMMUNAL') THEN
        v_role_tech := 'PF_CCLS_TP';
    ELSIF p_poste IN ('MEMBRE_MINISTERE', 'MINISTERE', 'CADRE_NATIONAL') THEN
        v_role_tech := 'MEMBRE_MINISTERE';
    ELSIF p_poste = 'SUPER_ADMIN' THEN
        v_role_tech := 'SUPER_ADMIN';
    ELSE
        v_role_tech := 'PUBLIC';
    END IF;

    -- Recherche de l'ASCQ superviseur si c'est un Relais Communautaire et non spécifié
    IF v_ascq_id IS NULL AND p_poste IN ('RC', 'RELAIS_COMMUNAUTAIRE', 'RELAIS') AND p_arrondissement_id IS NOT NULL THEN
        SELECT id INTO v_ascq_id 
        FROM public.utilisateurs 
        WHERE (arrondissement_id = p_arrondissement_id OR second_arrondissement_id = p_arrondissement_id)
          AND poste = 'ASCQ' 
          AND statut_compte = 'VALIDE'
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    -- Insertion ou mise à jour dans public.utilisateurs
    INSERT INTO public.utilisateurs (
        id, telephone, nom, prenoms, poste, poste_autre,
        role_technique, statut_compte,
        departement_id, zone_sanitaire_id, commune_id, arrondissement_id, second_arrondissement_id,
        updated_at
    ) VALUES (
        p_id, 
        v_clean_phone, 
        UPPER(TRIM(p_nom)), 
        TRIM(p_prenoms), 
        CASE WHEN p_poste IN ('RELAIS_COMMUNAUTAIRE', 'RELAIS') THEN 'RC' ELSE p_poste END, 
        p_poste_autre,
        v_role_tech,
        'EN_ATTENTE',
        p_departement_id,
        p_zone_sanitaire_id,
        p_commune_id,
        p_arrondissement_id,
        p_second_arrondissement_id,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET telephone = EXCLUDED.telephone,
        nom = EXCLUDED.nom,
        prenoms = EXCLUDED.prenoms,
        poste = EXCLUDED.poste,
        poste_autre = EXCLUDED.poste_autre,
        departement_id = EXCLUDED.departement_id,
        zone_sanitaire_id = EXCLUDED.zone_sanitaire_id,
        commune_id = EXCLUDED.commune_id,
        arrondissement_id = EXCLUDED.arrondissement_id,
        second_arrondissement_id = EXCLUDED.second_arrondissement_id,
        statut_compte = 'EN_ATTENTE',
        role_technique = EXCLUDED.role_technique,
        updated_at = NOW();

    -- Spécifique ASCQ
    IF p_poste = 'ASCQ' THEN
        INSERT INTO public.ascq_profils (
            id, source_financement, source_financement_autre,
            nombre_rc, afficher_annuaire_public, cumul_deux_arrondissements
        ) VALUES (
            p_id, p_source_financement, p_source_financement_autre,
            p_nombre_rc, COALESCE(p_afficher_annuaire, true), COALESCE(p_cumul_deux_arrondissements, false)
        )
        ON CONFLICT (id) DO UPDATE
        SET source_financement = EXCLUDED.source_financement,
            source_financement_autre = EXCLUDED.source_financement_autre,
            nombre_rc = EXCLUDED.nombre_rc,
            afficher_annuaire_public = EXCLUDED.afficher_annuaire_public,
            cumul_deux_arrondissements = EXCLUDED.cumul_deux_arrondissements;
    END IF;

    -- Spécifique RC
    IF p_poste IN ('RC', 'RELAIS_COMMUNAUTAIRE', 'RELAIS') THEN
        INSERT INTO public.relais_communautaires (
            id, user_id, ascq_id, commune_id, nom, prenoms, telephone, village_nom, grappe, actif
        ) VALUES (
            gen_random_uuid(), p_id, v_ascq_id, p_commune_id, UPPER(TRIM(p_nom)), TRIM(p_prenoms), v_clean_phone, 'À définir par l''ASCQ', 1, false
        )
        ON CONFLICT (user_id) DO UPDATE
        SET ascq_id = COALESCE(EXCLUDED.ascq_id, relais_communautaires.ascq_id),
            commune_id = COALESCE(EXCLUDED.commune_id, relais_communautaires.commune_id),
            nom = EXCLUDED.nom,
            prenoms = EXCLUDED.prenoms,
            telephone = EXCLUDED.telephone;

        -- Notification automatique pour l'ASCQ superviseur si trouvé
        IF v_ascq_id IS NOT NULL THEN
            BEGIN
                INSERT INTO public.notifications (
                    destinataire_id,
                    titre,
                    message,
                    type,
                    type_notification,
                    lu
                ) VALUES (
                    v_ascq_id,
                    'Nouveau Relais Communautaire en attente',
                    format('Le Relais Communautaire %s %s s''est inscrit. Veuillez valider son affectation dans votre onglet Relais.', TRIM(p_prenoms), UPPER(TRIM(p_nom))),
                    'INFO',
                    'CONSIGNE_ADMIN',
                    FALSE
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END IF;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Inscription enregistrée avec succès. Votre compte sera activé après vérification administrative.',
        'user_id', p_id
    );
END;
$$;

-- 4. Version de compatibilité à 16 paramètres (pour éviter toute erreur de signature)
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
SET search_path = public, auth, extensions
AS $$
BEGIN
    RETURN public.inscrire_nouvel_agent(
        p_id, p_telephone, p_nom, p_prenoms, p_poste, p_poste_autre,
        p_departement_id, p_zone_sanitaire_id, p_commune_id, p_arrondissement_id, p_second_arrondissement_id,
        p_source_financement, p_source_financement_autre, p_nombre_rc, p_afficher_annuaire, p_cumul_deux_arrondissements,
        NULL, NULL
    );
END;
$$;

-- 5. Permissions d'exécution
GRANT EXECUTE ON FUNCTION public.inscrire_nouvel_agent(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inscrire_nouvel_agent(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN) TO anon, authenticated;
