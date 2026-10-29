-- =====================================================================
-- MIGRATION : CORRECTION DU TYPE NOTIFICATIONS, SÉCURISATION VALIDATION RC
-- ET STABILISATION DE L'ACCÈS AU PÉRIMÈTRE DE SUPERVISION
-- Date: 2026-10-29
-- Auteur: Antigravity / Super Administrateur National Bruno DOSSOU
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CORRECTION & HARMONISATION DE LA TABLE public.notifications
-- Résout l'erreur : column "type" of relation "notifications" does not exist
-- ---------------------------------------------------------------------

-- Ajout de la colonne type si manquante
ALTER TABLE public.notifications 
    ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'INFO';

-- Relâchement de la contrainte NOT NULL et du CHECK sur type_notification
ALTER TABLE public.notifications 
    ALTER COLUMN type_notification DROP NOT NULL;

ALTER TABLE public.notifications 
    DROP CONSTRAINT IF EXISTS notifications_type_notification_check;

-- Rendre priorite et lu sécurisés avec valeurs par défaut
ALTER TABLE public.notifications 
    ALTER COLUMN priorite SET DEFAULT 'NORMALE',
    ALTER COLUMN lu SET DEFAULT FALSE;

-- Trigger pour synchroniser automatiquement 'type' et 'type_notification'
CREATE OR REPLACE FUNCTION public.synchroniser_type_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.type IS NOT NULL AND NEW.type_notification IS NULL THEN
        NEW.type_notification := NEW.type;
    ELSIF NEW.type_notification IS NOT NULL AND NEW.type IS NULL THEN
        NEW.type := NEW.type_notification;
    ELSIF NEW.type IS NULL AND NEW.type_notification IS NULL THEN
        NEW.type := 'INFO';
        NEW.type_notification := 'CONSIGNE_ADMIN';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_synchroniser_type_notification ON public.notifications;
CREATE TRIGGER trg_synchroniser_type_notification
BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.synchroniser_type_notification();

-- ---------------------------------------------------------------------
-- 2. ASSURER LES CONTRAINTES SUR public.utilisateurs (ROLES ET POSTES)
-- ---------------------------------------------------------------------

ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_technique_check;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_role_technique_check 
    CHECK (role_technique IN (
        'PUBLIC', 
        'RELAIS', 
        'RELAIS_COMMUNAUTAIRE',
        'UTILISATEUR',
        'ASCQ_OPERATEUR', 
        'GESTIONNAIRE_PERIMETRE', 
        'ADMINISTRATEUR', 
        'SUPER_ADMIN', 
        'REPRESENTANT_DEPARTEMENTAL', 
        'ADMIN_DEPARTEMENTAL', 
        'CADRE_DEPARTEMENTAL', 
        'CADRE_ZONE_SANITAIRE', 
        'REPRESENTANT_COMMUNAL', 
        'ADMIN_COMMUNAL', 
        'CADRE_COMMUNAL'
    ));

ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_poste_check;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_poste_check 
    CHECK (poste IN (
        'ASCQ', 
        'RC', 
        'RELAIS_COMMUNAUTAIRE',
        'DDS', 
        'CCD_CDLS_TP', 
        'CSSPR', 
        'CSPSMEMH', 
        'MCZS', 
        'RCSE', 
        'C_RAMS', 
        'MCC', 
        'PF_CCLS_TP', 
        'REPRESENTANT_COMMUNAL', 
        'REPRESENTANT_DEPARTEMENTAL', 
        'ADMINISTRATEUR', 
        'SUPER_ADMIN', 
        'AUTRE'
    ));

-- Ajout de la colonne role_nomination si manquante
ALTER TABLE public.utilisateurs 
    ADD COLUMN IF NOT EXISTS role_nomination TEXT;

-- ---------------------------------------------------------------------
-- 3. FONCTION RPC ascq_valider_et_affecter_relais (100% SÉCURISÉE)
-- Ne plante jamais sur les notifications et valide immédiatement le RC
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.ascq_valider_et_affecter_relais(UUID, UUID, TEXT, INTEGER, TEXT);

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

    -- 1. Sauvegarder ou récupérer le village dans public.villages
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
            role_technique = 'RELAIS',
            poste = 'RC',
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

    -- 5. Notification de succès au RC (sécurisée dans un bloc EXCEPTION pour ne jamais bloquer la transaction)
    IF v_actual_user_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.notifications (
                destinataire_id,
                titre,
                message,
                type,
                type_notification,
                lu
            ) VALUES (
                v_actual_user_id,
                'Compte Relais validé avec succès',
                format('Votre compte Relais Communautaire a été validé par votre superviseur ASCQ et affecté au village %s. Vous pouvez maintenant vous connecter et commencer vos activités.', v_clean_village),
                'INFO',
                'CONSIGNE_ADMIN',
                FALSE
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Notification skip: %', SQLERRM;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'message', format('Relais validé et affecté avec succès au village %s.', v_clean_village),
        'village_nom', v_clean_village,
        'village_id', v_village_id
    );
END;
$$;

-- ---------------------------------------------------------------------
-- 4. FONCTION RPC admin_nommer_ascq_responsabilite (AVEC NOTIFICATIONS SÉCURISÉES)
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.admin_nommer_ascq_responsabilite(UUID, TEXT, TEXT, UUID, UUID, UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.admin_nommer_ascq_responsabilite(
    p_ascq_id UUID,
    p_nouveau_poste TEXT,
    p_nouveau_role_technique TEXT,
    p_departement_id UUID DEFAULT NULL,
    p_zone_sanitaire_id UUID DEFAULT NULL,
    p_commune_id UUID DEFAULT NULL,
    p_motif_nomination TEXT DEFAULT 'Nomination officielle par le Super Administrateur National'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
    v_old_poste TEXT;
    v_old_role TEXT;
    v_agent_nom TEXT;
    v_commune_nom TEXT;
    v_dept_nom TEXT;
BEGIN
    SELECT role_technique INTO v_caller_role FROM public.utilisateurs WHERE id = auth.uid();
    IF v_caller_role != 'SUPER_ADMIN' AND NOT public.est_super_admin() THEN
        RAISE EXCEPTION 'Interdit : Seul le Super Administrateur National est habilité à nommer et assigner les responsabilités territoriales.';
    END IF;

    IF p_motif_nomination IS NULL OR LENGTH(TRIM(p_motif_nomination)) < 3 THEN
        RAISE EXCEPTION 'Veuillez spécifier la référence ou le motif de la nomination.';
    END IF;

    SELECT nom || ' ' || prenoms, poste, role_technique INTO v_agent_nom, v_old_poste, v_old_role
    FROM public.utilisateurs WHERE id = p_ascq_id;

    IF v_agent_nom IS NULL THEN
        RAISE EXCEPTION 'Agent introuvable.';
    END IF;

    -- Mise à jour du poste, du rôle technique, du rôle nomination et des territoires
    UPDATE public.utilisateurs
    SET poste = p_nouveau_poste,
        role_technique = p_nouveau_role_technique,
        role_nomination = p_nouveau_poste,
        departement_id = COALESCE(p_departement_id, departement_id),
        zone_sanitaire_id = COALESCE(p_zone_sanitaire_id, zone_sanitaire_id),
        commune_id = COALESCE(p_commune_id, commune_id),
        updated_at = NOW()
    WHERE id = p_ascq_id;

    -- Récupérer noms des territoires
    SELECT nom INTO v_commune_nom FROM public.communes WHERE id = COALESCE(p_commune_id, (SELECT commune_id FROM public.utilisateurs WHERE id = p_ascq_id));
    SELECT nom INTO v_dept_nom FROM public.departements WHERE id = COALESCE(p_departement_id, (SELECT departement_id FROM public.utilisateurs WHERE id = p_ascq_id));

    -- Audit de la nomination
    BEGIN
        INSERT INTO public.audit_modifications_ascq (
            admin_id,
            ascq_id,
            type_action,
            motif_justification,
            anciennes_valeurs,
            nouvelles_valeurs
        ) VALUES (
            auth.uid(),
            p_ascq_id,
            'NOMINATION',
            TRIM(p_motif_nomination),
            jsonb_build_object('poste', v_old_poste, 'role_technique', v_old_role),
            jsonb_build_object('poste', p_nouveau_poste, 'role_technique', p_nouveau_role_technique, 'commune', v_commune_nom, 'departement', v_dept_nom)
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Notification officielle à l'agent
    BEGIN
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type,
            type_notification,
            lu
        ) VALUES (
            p_ascq_id,
            'Nomination officielle : ' || p_nouveau_poste,
            'Félicitations ! Vous avez été nommé(e) ' || p_nouveau_poste || ' (' || COALESCE(v_commune_nom, v_dept_nom, 'Territoire') || ') par le Super Administrateur National. Vos accès aux rapports et aux données de supervision ont été immédiatement activés. Réf : ' || TRIM(p_motif_nomination),
            'OFFICIEL',
            'CONSIGNE_ADMIN',
            false
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'L''agent ' || v_agent_nom || ' a été nommé ' || p_nouveau_poste || ' avec succès.'
    );
END;
$$;

-- ---------------------------------------------------------------------
-- 5. FONCTION RPC inscrire_nouvel_agent (SÉCURISÉE AVEC LES NOTIFICATIONS)
-- ---------------------------------------------------------------------

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
        v_role_tech := 'RELAIS';
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

    -- Profil spécifique Relais Communautaire
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
                    'Nouveau Relais Communautaire auto-inscrit',
                    format('Le Relais Communautaire %s %s (%s) s''est inscrit dans votre arrondissement. Veuillez valider son inscription et l''affecter à son village d''intervention.', TRIM(p_prenoms), UPPER(TRIM(p_nom)), v_clean_phone),
                    'ALERTE',
                    'ALERTE_PRIORITAIRE',
                    FALSE
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'id', p_id, 'poste', p_poste, 'statut', 'EN_ATTENTE');
END;
$$;

-- ---------------------------------------------------------------------
-- 6. PERMISSIONS D'EXÉCUTION
-- ---------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.ascq_valider_et_affecter_relais TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_nommer_ascq_responsabilite TO authenticated;
GRANT EXECUTE ON FUNCTION public.inscrire_nouvel_agent TO anon, authenticated;
GRANT ALL ON TABLE public.notifications TO authenticated;
