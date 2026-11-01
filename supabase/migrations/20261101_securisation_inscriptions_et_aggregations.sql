-- =====================================================================
-- MIGRATION : SÉCURISATION INSCRIPTIONS (EMAIL & MOT DE PASSE RENFORCÉ),
-- VISIBILITÉ TOTALE DES NOTIFICATIONS (ALERTES & DÉCÈS SANS RESTRICTION)
-- ET PYRAMIDE D'AGRÉGATION HIÉRARCHIQUE DES RAPPORTS SANITAIRES
-- Date : 01/11/2026
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. AJOUT DE LA COLONNE EMAIL DANS public.utilisateurs
-- ---------------------------------------------------------------------

ALTER TABLE public.utilisateurs 
    ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON public.utilisateurs(email);

-- ---------------------------------------------------------------------
-- 2. MISE À JOUR DE LA FONCTION RPC inscrire_nouvel_agent
-- Prend en charge l'email pour les ASCQ et cadres (optionnel pour les RC)
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.inscrire_nouvel_agent(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS public.inscrire_nouvel_agent(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN, TEXT);

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
    p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_phone TEXT;
    v_clean_email TEXT;
    v_ascq_id UUID;
    v_role_tech TEXT;
BEGIN
    v_clean_phone := TRIM(p_telephone);
    v_clean_email := NULLIF(LOWER(TRIM(p_email)), '');

    IF auth.uid() IS NOT NULL AND auth.uid() != p_id THEN
        RAISE EXCEPTION 'Non autorisé : l''identifiant ne correspond pas à la session connectée.';
    END IF;

    -- Vérifier si un compte validé existe déjà avec ce téléphone ou cet email
    IF EXISTS (
        SELECT 1 FROM public.utilisateurs 
        WHERE (id = p_id OR telephone = v_clean_phone OR (v_clean_email IS NOT NULL AND email = v_clean_email)) 
          AND statut_compte IN ('VALIDE', 'SUSPENDU')
    ) THEN
        RAISE EXCEPTION 'Compte déjà existant et validé. Veuillez vous connecter ou contacter l''administrateur.';
    END IF;

    -- Déterminer le rôle technique selon le poste
    IF p_poste = 'ASCQ' THEN
        v_role_tech := 'ASCQ_OPERATEUR';
    ELSIF p_poste IN ('RC', 'RELAIS_COMMUNAUTAIRE') THEN
        v_role_tech := 'RELAIS';
    ELSIF p_poste IN ('DDS', 'CCD_CDLS_TP', 'CSSPR', 'CSPSMEMH', 'CADRE_DEPARTEMENTAL') THEN
        v_role_tech := 'CADRE_DEPARTEMENTAL';
    ELSIF p_poste IN ('MCZS', 'RCSE', 'C_RAMS', 'CADRE_ZONE_SANITAIRE') THEN
        v_role_tech := 'CADRE_ZONE_SANITAIRE';
    ELSIF p_poste IN ('MCC', 'PF_CCLS_TP', 'CADRE_COMMUNAL', 'REPRESENTANT_COMMUNAL') THEN
        v_role_tech := 'CADRE_COMMUNAL';
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
            email = COALESCE(v_clean_email, email),
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
            id, telephone, email, nom, prenoms, poste, poste_autre,
            role_technique, statut_compte,
            departement_id, zone_sanitaire_id, commune_id, arrondissement_id, second_arrondissement_id
        ) VALUES (
            p_id, v_clean_phone, v_clean_email, UPPER(TRIM(p_nom)), TRIM(p_prenoms), 
            CASE WHEN p_poste = 'RELAIS_COMMUNAUTAIRE' THEN 'RC' ELSE p_poste END, 
            p_poste_autre,
            v_role_tech,
            'EN_ATTENTE',
            p_departement_id,
            p_zone_sanitaire_id,
            p_commune_id,
            p_arrondissement_id,
            p_second_arrondissement_id
        );
    END IF;

    -- Spécifique ASCQ
    IF p_poste = 'ASCQ' THEN
        INSERT INTO public.ascq_profils (
            id, source_financement, source_financement_autre,
            nombre_rc, afficher_annuaire, cumul_deux_arrondissements
        ) VALUES (
            p_id, p_source_financement, p_source_financement_autre,
            p_nombre_rc, p_afficher_annuaire, p_cumul_deux_arrondissements
        )
        ON CONFLICT (id) DO UPDATE
        SET source_financement = EXCLUDED.source_financement,
            source_financement_autre = EXCLUDED.source_financement_autre,
            nombre_rc = EXCLUDED.nombre_rc,
            afficher_annuaire = EXCLUDED.afficher_annuaire,
            cumul_deux_arrondissements = EXCLUDED.cumul_deux_arrondissements;
    END IF;

    -- Spécifique RC
    IF p_poste IN ('RC', 'RELAIS_COMMUNAUTAIRE') THEN
        INSERT INTO public.relais_communautaires (
            id, user_id, ascq_id, village_nom, grappe, actif
        ) VALUES (
            gen_random_uuid(), p_id, v_ascq_id, 'À définir par l''ASCQ', 1, false
        )
        ON CONFLICT (user_id) DO UPDATE
        SET ascq_id = COALESCE(v_ascq_id, relais_communautaires.ascq_id);

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
                    format('Le Relais Communautaire %s %s s''est inscrit dans votre arrondissement. Veuillez valider son affectation dans votre onglet Relais.', TRIM(p_prenoms), UPPER(TRIM(p_nom))),
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

-- ---------------------------------------------------------------------
-- 3. ACCÈS TOTAL ET EXHAUSTIF AUX FICHES D'ALERTES
-- Tout utilisateur habilité (ASCQ, Cadre Communal, Cadre Zone, Cadre Départemental,
-- Cadre National, Super Admin) a accès à 100% des détails de l'alerte transmise
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.obtenir_detail_alerte(p_alerte_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_alerte RECORD;
    v_cas RECORD;
    v_caller_role TEXT;
    v_caller_poste TEXT;
    v_caller_id UUID;
    v_has_access BOOLEAN := FALSE;
BEGIN
    v_caller_id := auth.uid();
    
    -- Récupérer le rôle et le poste de l'appelant
    SELECT role_technique, poste INTO v_caller_role, v_caller_poste 
    FROM public.utilisateurs 
    WHERE id = v_caller_id;

    -- Récupérer l'alerte avec ses jointures géographiques
    SELECT a.*, 
           d.nom AS dep_nom, 
           c.nom AS com_nom, 
           arr.nom AS arr_nom,
           u.nom AS notif_nom,
           u.prenoms AS notif_prenoms,
           u.telephone AS notif_tel
    INTO v_alerte
    FROM public.alertes_communautaires a
    JOIN public.departements d ON a.departement_id = d.id
    JOIN public.communes c ON a.commune_id = c.id
    JOIN public.arrondissements arr ON a.arrondissement_id = arr.id
    LEFT JOIN public.utilisateurs u ON a.notificateur_id = u.id
    WHERE a.id = p_alerte_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Alerte introuvable.';
    END IF;

    -- Vérification de l'habilitation :
    -- Le notificateur, l'ASCQ superviseur, ou tout agent cadre/admin a un accès total
    IF v_caller_id IS NOT NULL AND (
        v_alerte.notificateur_id = v_caller_id 
        OR v_alerte.ascq_superviseur_id = v_caller_id
        OR v_caller_role IN ('SUPER_ADMIN', 'ADMINISTRATEUR', 'CADRE_DEPARTEMENTAL', 'CADRE_ZONE_SANITAIRE', 'CADRE_COMMUNAL', 'REPRESENTANT_COMMUNAL', 'GESTIONNAIRE_PERIMETRE', 'ASCQ_OPERATEUR')
        OR v_caller_poste IN ('ASCQ', 'MCC', 'PF_CCLS_TP', 'MCZS', 'RCSE', 'C_RAMS', 'DDS', 'CCD_CDLS_TP', 'CSSPR', 'CSPSMEMH', 'DIRECTEUR', 'MINISTRE', 'COORDINATEUR_NATIONAL')
        OR public.est_super_admin()
    ) THEN
        v_has_access := TRUE;
    END IF;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Accès non autorisé à cette fiche de notification.';
    END IF;

    -- Données privées complètes du cas index
    SELECT * INTO v_cas FROM public.cas_identite_privee WHERE alerte_id = p_alerte_id;

    RETURN jsonb_build_object(
        'id', v_alerte.id,
        'numero_alerte', v_alerte.numero_alerte,
        'annee', v_alerte.annee,
        'semaine_epidemio', v_alerte.semaine_epidemio,
        'mois', v_alerte.mois,
        'date_notification', v_alerte.date_notification,
        'date_debut_maladie', v_alerte.date_debut_maladie,
        'heure_survenue', v_alerte.heure_survenue,
        'date_detection', v_alerte.date_detection,
        'heure_detection', v_alerte.heure_detection,
        'delai_detection_notification_heures', v_alerte.delai_detection_notification_heures,
        'departement_id', v_alerte.departement_id,
        'departement_nom', v_alerte.dep_nom,
        'commune_id', v_alerte.commune_id,
        'commune_nom', v_alerte.com_nom,
        'arrondissement_id', v_alerte.arrondissement_id,
        'arrondissement_nom', v_alerte.arr_nom,
        'village_id', v_alerte.village_id,
        'village_nom', v_alerte.village_nom,
        'numero_grappe', v_alerte.numero_grappe,
        'nom_grappe', v_alerte.nom_grappe,
        'gps_latitude', v_alerte.gps_latitude,
        'gps_longitude', v_alerte.gps_longitude,
        'type_alerte_code', v_alerte.type_alerte_code,
        'type_alerte_nom', v_alerte.type_alerte_nom,
        'autre_evenement_precision', v_alerte.autre_evenement_precision,
        'est_prioritaire', v_alerte.est_prioritaire,
        'symptomes_codes', v_alerte.symptomes_codes,
        'autre_symptome_precision', v_alerte.autre_symptome_precision,
        'nb_personnes_touchees', v_alerte.nb_personnes_touchees,
        'nb_personnes_mortes', v_alerte.nb_personnes_mortes,
        'nb_animaux_malades', v_alerte.nb_animaux_malades,
        'nb_animaux_morts', v_alerte.nb_animaux_morts,
        'animaux_impliques', v_alerte.animaux_impliques,
        'evenement_en_cours', v_alerte.evenement_en_cours,
        'mesures_prises', v_alerte.mesures_prises,
        'sexe', v_alerte.sexe,
        'age_valeur', v_alerte.age_valeur,
        'age_unite', v_alerte.age_unite,
        'notificateur_id', v_alerte.notificateur_id,
        'notificateur_nom_complet', COALESCE(v_alerte.notificateur_nom_complet, v_alerte.notif_nom || ' ' || v_alerte.notif_prenoms),
        'notificateur_titre', v_alerte.notificateur_titre,
        'notificateur_telephone', COALESCE(v_alerte.notificateur_telephone, v_alerte.notif_tel),
        'centre_sante_nom', v_alerte.centre_sante_nom,
        'signature_tactile', v_alerte.signature_tactile,
        'statut', v_alerte.statut,
        'resultat_verification', v_alerte.resultat_verification,
        'date_verification', v_alerte.date_verification,
        'commentaire_verification', v_alerte.commentaire_verification,
        'created_at', v_alerte.created_at,
        'cas_prive', CASE WHEN v_cas.id IS NOT NULL THEN jsonb_build_object(
            'id', v_cas.id,
            'nom', v_cas.nom,
            'prenoms', v_cas.prenoms,
            'telephone', v_cas.telephone,
            'nom_tuteur', v_cas.nom_tuteur,
            'adresse_description', v_cas.adresse_description
        ) ELSE NULL END
    );
END;
$$;

-- ---------------------------------------------------------------------
-- 4. ACCÈS TOTAL ET EXHAUSTIF AUX FICHES DE DÉCÈS COMMUNAUTAIRES
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.obtenir_detail_deces(p_deces_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deces RECORD;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_poste TEXT;
    v_has_access BOOLEAN := FALSE;
BEGIN
    v_caller_id := auth.uid();

    SELECT role_technique, poste INTO v_caller_role, v_caller_poste 
    FROM public.utilisateurs 
    WHERE id = v_caller_id;

    SELECT d.*, 
           dep.nom AS dep_nom, 
           c.nom AS com_nom, 
           arr.nom AS arr_nom,
           u.nom AS notif_nom,
           u.prenoms AS notif_prenoms,
           u.telephone AS notif_tel
    INTO v_deces
    FROM public.deces_communautaires d
    JOIN public.departements dep ON d.departement_id = dep.id
    JOIN public.communes c ON d.commune_id = c.id
    JOIN public.arrondissements arr ON d.arrondissement_id = arr.id
    LEFT JOIN public.utilisateurs u ON d.notificateur_id = u.id
    WHERE d.id = p_deces_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fiche de décès introuvable.';
    END IF;

    IF v_caller_id IS NOT NULL AND (
        v_deces.notificateur_id = v_caller_id 
        OR v_caller_role IN ('SUPER_ADMIN', 'ADMINISTRATEUR', 'CADRE_DEPARTEMENTAL', 'CADRE_ZONE_SANITAIRE', 'CADRE_COMMUNAL', 'REPRESENTANT_COMMUNAL', 'GESTIONNAIRE_PERIMETRE', 'ASCQ_OPERATEUR')
        OR v_caller_poste IN ('ASCQ', 'MCC', 'PF_CCLS_TP', 'MCZS', 'RCSE', 'C_RAMS', 'DDS', 'CCD_CDLS_TP', 'CSSPR', 'CSPSMEMH', 'DIRECTEUR', 'MINISTRE', 'COORDINATEUR_NATIONAL')
        OR public.est_super_admin()
    ) THEN
        v_has_access := TRUE;
    END IF;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Accès non autorisé à cette fiche de décès.';
    END IF;

    RETURN jsonb_build_object(
        'id', v_deces.id,
        'numero_deces', v_deces.numero_deces,
        'annee', v_deces.annee,
        'semaine_epidemio', v_deces.semaine_epidemio,
        'mois', v_deces.mois,
        'date_deces', v_deces.date_deces,
        'heure_deces', v_deces.heure_deces,
        'date_notification', v_deces.date_notification,
        'delai_deces_notification_heures', v_deces.delai_deces_notification_heures,
        'departement_id', v_deces.departement_id,
        'departement_nom', v_deces.dep_nom,
        'commune_id', v_deces.commune_id,
        'commune_nom', v_deces.com_nom,
        'arrondissement_id', v_deces.arrondissement_id,
        'arrondissement_nom', v_deces.arr_nom,
        'village_nom', v_deces.village_nom,
        'numero_grappe', v_deces.numero_grappe,
        'nom_grappe', v_deces.nom_grappe,
        'gps_latitude', v_deces.gps_latitude,
        'gps_longitude', v_deces.gps_longitude,
        'type_deces_code', v_deces.type_deces_code,
        'type_deces_nom', v_deces.type_deces_nom,
        'lieu_deces_code', v_deces.lieu_deces_code,
        'lieu_deces_nom', v_deces.lieu_deces_nom,
        'lieu_pays_etranger', v_deces.lieu_pays_etranger,
        'circonstance_code', v_deces.circonstance_code,
        'circonstance_nom', v_deces.circonstance_nom,
        'circonstance_autre_precision', v_deces.circonstance_autre_precision,
        'sexe', v_deces.sexe,
        'age_valeur', v_deces.age_valeur,
        'age_unite', v_deces.age_unite,
        'defunt_nom_prenom', v_deces.defunt_nom_prenom,
        'cause_probable', v_deces.cause_probable,
        'notificateur_id', v_deces.notificateur_id,
        'notificateur_nom_complet', COALESCE(v_deces.notificateur_nom_complet, v_deces.notif_nom || ' ' || v_deces.notif_prenoms),
        'notificateur_titre', v_deces.notificateur_titre,
        'notificateur_telephone', COALESCE(v_deces.notificateur_telephone, v_deces.notif_tel),
        'centre_sante_nom', v_deces.centre_sante_nom,
        'signature_tactile', v_deces.signature_tactile,
        'created_at', v_deces.created_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obtenir_detail_alerte TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtenir_detail_deces TO authenticated;
