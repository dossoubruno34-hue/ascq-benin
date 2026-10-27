-- ====================================================================
-- ASCQ BÉNIN - PLAN DE REMÉDIATION ET DURCISSEMENT DE SÉCURITÉ POST-AUDIT
-- Résolution exhaustive des constats C1, C2, C3, C4, H1, H2, H3, H4
-- Version : 2.0 (Corrigée et testée - Exécution sans erreur)
-- ====================================================================

-- ---------------------------------------------------------------------
-- ÉTAPE 1 : RÉVOCATION GLOBALE DES PRIVILÈGES PUBLICS & ANON
-- ---------------------------------------------------------------------

-- Révocation stricte des droits d'exécution accordés par défaut à PUBLIC et anon
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Accorder l'ensemble des fonctions métier aux utilisateurs connectés (authenticated)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;


-- ---------------------------------------------------------------------
-- ÉTAPE 2 : CONTRÔLE DE RÔLE STRICT DANS TOUTES LES FONCTIONS DE GESTION
-- ---------------------------------------------------------------------

-- A. Fonction centrale de vérification des droits administrateur
CREATE OR REPLACE FUNCTION public.est_administrateur()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role_technique INTO v_role
  FROM public.utilisateurs
  WHERE id = auth.uid() AND statut_compte = 'VALIDE';

  RETURN v_role IN ('ADMINISTRATEUR', 'SUPER_ADMIN', 'ADMIN_DEPARTEMENTAL', 'ADMIN_COMMUNAL', 'GESTIONNAIRE_PERIMETRE');
END;
$$;

-- B. lister_comptes_admin : contrôle strict des droits
DROP FUNCTION IF EXISTS public.lister_comptes_admin();
CREATE OR REPLACE FUNCTION public.lister_comptes_admin()
RETURNS TABLE (
    id UUID,
    telephone TEXT,
    nom TEXT,
    prenoms TEXT,
    poste TEXT,
    role_technique TEXT,
    statut_compte TEXT,
    created_at TIMESTAMPTZ,
    departement_nom TEXT,
    commune_nom TEXT,
    arrondissement_nom TEXT,
    source_financement TEXT,
    nombre_rc INTEGER,
    afficher_annuaire_public BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.est_administrateur() THEN
    RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id, u.telephone, u.nom, u.prenoms, u.poste, u.role_technique, u.statut_compte, u.created_at,
    d.nom AS departement_nom,
    c.nom AS commune_nom,
    a.nom AS arrondissement_nom,
    p.source_financement,
    p.nombre_rc,
    p.afficher_annuaire_public
  FROM public.utilisateurs u
  LEFT JOIN public.departements d ON u.departement_id = d.id
  LEFT JOIN public.communes c ON u.commune_id = c.id
  LEFT JOIN public.arrondissements a ON u.arrondissement_id = a.id
  LEFT JOIN public.ascq_profils p ON u.id = p.id
  ORDER BY u.created_at DESC;
END;
$$;

-- C. changer_statut_compte : validation et suspension réservées aux administrateurs
DROP FUNCTION IF EXISTS public.changer_statut_compte(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.changer_statut_compte(p_id UUID, p_nouveau_statut TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.est_administrateur() THEN
    RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
  END IF;

  IF p_nouveau_statut NOT IN ('VALIDE', 'SUSPENDU', 'REJETE', 'EN_ATTENTE') THEN
    RAISE EXCEPTION 'Statut invalide : %', p_nouveau_statut;
  END IF;

  UPDATE public.utilisateurs
  SET statut_compte = p_nouveau_statut,
      role_technique = CASE 
        WHEN p_nouveau_statut = 'VALIDE' AND poste = 'ASCQ' AND role_technique = 'PUBLIC' THEN 'ASCQ_OPERATEUR'
        WHEN p_nouveau_statut = 'VALIDE' AND poste = 'RC' AND role_technique = 'PUBLIC' THEN 'RELAIS'
        ELSE role_technique
      END,
      date_validation = CASE WHEN p_nouveau_statut = 'VALIDE' THEN NOW() ELSE date_validation END,
      valide_par = CASE WHEN p_nouveau_statut = 'VALIDE' THEN auth.uid() ELSE valide_par END
  WHERE id = p_id;

  RETURN true;
END;
$$;

-- D. exporter_liste_ascq : réservée aux administrateurs
DROP FUNCTION IF EXISTS public.exporter_liste_ascq();
CREATE OR REPLACE FUNCTION public.exporter_liste_ascq()
RETURNS TABLE (
    matricule_id TEXT,
    nom TEXT,
    prenoms TEXT,
    telephone TEXT,
    poste TEXT,
    departement TEXT,
    commune TEXT,
    arrondissement TEXT,
    source_financement TEXT,
    nombre_rc INTEGER,
    statut_compte TEXT,
    date_inscription TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.est_administrateur() THEN
    RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id::TEXT AS matricule_id,
    u.nom,
    u.prenoms,
    u.telephone,
    u.poste,
    COALESCE(d.nom, 'NON DEFINI') AS departement,
    COALESCE(c.nom, 'NON DEFINIE') AS commune,
    COALESCE(a.nom, 'NON DEFINI') AS arrondissement,
    COALESCE(p.source_financement, 'LLF') AS source_financement,
    COALESCE(p.nombre_rc, (SELECT COUNT(*)::INTEGER FROM public.relais_communautaires rc WHERE rc.ascq_id = u.id)) AS nombre_rc,
    u.statut_compte,
    to_char(u.created_at, 'DD/MM/YYYY HH24:MI') AS date_inscription
  FROM public.utilisateurs u
  LEFT JOIN public.ascq_profils p ON u.id = p.id
  LEFT JOIN public.departements d ON u.departement_id = d.id
  LEFT JOIN public.communes c ON u.commune_id = c.id
  LEFT JOIN public.arrondissements a ON u.arrondissement_id = a.id
  WHERE u.poste = 'ASCQ'
  ORDER BY d.nom, c.nom, u.nom;
END;
$$;

-- E. exporter_donnees_surveillance_anonymisees : réservée aux administrateurs
DROP FUNCTION IF EXISTS public.exporter_donnees_surveillance_anonymisees();
CREATE OR REPLACE FUNCTION public.exporter_donnees_surveillance_anonymisees()
RETURNS TABLE (
    numero_alerte TEXT,
    annee INTEGER,
    semaine_epidemio INTEGER,
    mois INTEGER,
    pathologie TEXT,
    est_prioritaire BOOLEAN,
    departement TEXT,
    commune TEXT,
    arrondissement TEXT,
    village TEXT,
    nb_personnes_touchees INTEGER,
    nb_personnes_mortes INTEGER,
    nb_animaux_malades INTEGER,
    nb_animaux_morts INTEGER,
    delai_notification_heures NUMERIC,
    statut TEXT,
    resultat_verification TEXT,
    date_detection DATE,
    date_notification DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.est_administrateur() THEN
    RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
  END IF;

  RETURN QUERY
  SELECT 
    a.numero_alerte,
    a.annee,
    a.semaine_epidemio,
    a.mois,
    COALESCE(t.nom, 'Type ' || a.type_alerte_code) AS pathologie,
    COALESCE(t.est_prioritaire, FALSE) AS est_prioritaire,
    COALESCE(d.nom, 'NON DEFINI') AS departement,
    COALESCE(c.nom, 'NON DEFINIE') AS commune,
    COALESCE(arr.nom, 'NON DEFINI') AS arrondissement,
    COALESCE(a.village_nom, 'VILLAGE') AS village,
    a.nb_personnes_touchees,
    a.nb_personnes_mortes,
    a.nb_animaux_malades,
    a.nb_animaux_morts,
    ROUND(COALESCE(a.delai_detection_notification_heures, 0)::NUMERIC, 1) AS delai_notification_heures,
    a.statut,
    COALESCE(a.resultat_verification, 'EN_ATTENTE') AS resultat_verification,
    a.date_detection,
    a.date_notification
  FROM public.alertes_communautaires a
  LEFT JOIN public.types_alertes_reference t ON a.type_alerte_code = t.code
  LEFT JOIN public.departements d ON a.departement_id = d.id
  LEFT JOIN public.communes c ON a.commune_id = c.id
  LEFT JOIN public.arrondissements arr ON a.arrondissement_id = arr.id
  ORDER BY a.annee DESC, a.semaine_epidemio DESC;
END;
$$;

-- F. obtenir_statistiques_tableau_de_bord : réservée aux administrateurs
DROP FUNCTION IF EXISTS public.obtenir_statistiques_tableau_de_bord(UUID, UUID);
CREATE OR REPLACE FUNCTION public.obtenir_statistiques_tableau_de_bord(
    p_departement_id UUID DEFAULT NULL,
    p_commune_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_alertes BIGINT := 0;
    v_alertes_prioritaires BIGINT := 0;
    v_alertes_averees BIGINT := 0;
    v_alertes_investiguees BIGINT := 0;
    v_alertes_non_investiguees BIGINT := 0;
    v_delai_moyen_notification NUMERIC := 0;
    v_delai_moyen_investigation NUMERIC := 0;
    v_total_deces BIGINT := 0;
    v_deces_maternels BIGINT := 0;
    v_deces_neonatals BIGINT := 0;
    v_deces_avec_cause BIGINT := 0;
    v_total_ascq_actifs BIGINT := 0;
    v_total_rc_actifs BIGINT := 0;
    v_total_rma_deposes BIGINT := 0;
    v_total_rma_retard BIGINT := 0;
    v_repartition_pathologies JSONB := '[]'::jsonb;
BEGIN
    IF NOT public.est_administrateur() THEN
      RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
    END IF;

    -- 1. Alertes
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE type_alerte_code IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14)),
        COUNT(*) FILTER (WHERE resultat_verification = 'AVEREE'),
        COUNT(*) FILTER (WHERE statut = 'INVESTIGUEE'),
        COUNT(*) FILTER (WHERE statut != 'INVESTIGUEE' AND type_alerte_code IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14)),
        ROUND(COALESCE(AVG(delai_detection_notification_heures), 0)::NUMERIC, 1),
        ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (date_verification - created_at)) / 3600) FILTER (WHERE date_verification IS NOT NULL), 0)::NUMERIC, 1)
    INTO 
        v_total_alertes,
        v_alertes_prioritaires,
        v_alertes_averees,
        v_alertes_investiguees,
        v_alertes_non_investiguees,
        v_delai_moyen_notification,
        v_delai_moyen_investigation
    FROM public.alertes_communautaires
    WHERE (p_departement_id IS NULL OR departement_id = p_departement_id)
      AND (p_commune_id IS NULL OR commune_id = p_commune_id);

    -- 2. Décès
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE type_deces_code = 1),
        COUNT(*) FILTER (WHERE type_deces_code = 2),
        COUNT(*) FILTER (WHERE cause_cim10_code IS NOT NULL AND cause_cim10_code != '')
    INTO 
        v_total_deces,
        v_deces_maternels,
        v_deces_neonatals,
        v_deces_avec_cause
    FROM public.deces_communautaires
    WHERE (p_departement_id IS NULL OR departement_id = p_departement_id)
      AND (p_commune_id IS NULL OR commune_id = p_commune_id);

    -- 3. Effectifs ASCQ et RC
    SELECT COUNT(*) INTO v_total_ascq_actifs
    FROM public.utilisateurs
    WHERE poste = 'ASCQ' AND statut_compte = 'VALIDE'
      AND (p_departement_id IS NULL OR departement_id = p_departement_id)
      AND (p_commune_id IS NULL OR commune_id = p_commune_id);

    SELECT COUNT(*) INTO v_total_rc_actifs
    FROM public.relais_communautaires rc
    JOIN public.utilisateurs u ON rc.ascq_id = u.id
    WHERE (p_departement_id IS NULL OR u.departement_id = p_departement_id)
      AND (p_commune_id IS NULL OR u.commune_id = p_commune_id);

    -- 4. RMA
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE est_en_retard = TRUE AND statut != 'VALIDE')
    INTO 
        v_total_rma_deposes,
        v_total_rma_retard
    FROM public.rapports_mensuels_ascq
    WHERE (p_departement_id IS NULL OR departement_id = p_departement_id)
      AND (p_commune_id IS NULL OR commune_id = p_commune_id);

    -- 5. Top pathologies
    SELECT jsonb_agg(sub) INTO v_repartition_pathologies
    FROM (
        SELECT 
            COALESCE(t.nom, 'Type ' || a.type_alerte_code) AS nom,
            COUNT(*) AS total
        FROM public.alertes_communautaires a
        LEFT JOIN public.types_alertes_reference t ON a.type_alerte_code = t.code
        WHERE (p_departement_id IS NULL OR a.departement_id = p_departement_id)
          AND (p_commune_id IS NULL OR a.commune_id = p_commune_id)
        GROUP BY t.nom, a.type_alerte_code
        ORDER BY total DESC
        LIMIT 6
    ) sub;

    RETURN jsonb_build_object(
        'total_alertes', COALESCE(v_total_alertes, 0),
        'alertes_prioritaires', COALESCE(v_alertes_prioritaires, 0),
        'alertes_averees', COALESCE(v_alertes_averees, 0),
        'alertes_investiguees', COALESCE(v_alertes_investiguees, 0),
        'alertes_non_investiguees', COALESCE(v_alertes_non_investiguees, 0),
        'delai_moyen_notification', COALESCE(v_delai_moyen_notification, 0),
        'delai_moyen_investigation', COALESCE(v_delai_moyen_investigation, 0),
        'total_deces', COALESCE(v_total_deces, 0),
        'deces_maternels', COALESCE(v_deces_maternels, 0),
        'deces_neonatals', COALESCE(v_deces_neonatals, 0),
        'deces_avec_cause', COALESCE(v_deces_avec_cause, 0),
        'total_ascq_actifs', COALESCE(v_total_ascq_actifs, 0),
        'total_rc_actifs', COALESCE(v_total_rc_actifs, 0),
        'total_rma_deposes', COALESCE(v_total_rma_deposes, 0),
        'total_rma_retard', COALESCE(v_total_rma_retard, 0),
        'top_pathologies', COALESCE(v_repartition_pathologies, '[]'::jsonb)
    );
END;
$$;

-- G. Actions administratives de gestion des requêtes et permutations
DROP FUNCTION IF EXISTS public.admin_valider_permutation(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.admin_valider_permutation(
    p_permutation_id UUID,
    p_commentaire TEXT DEFAULT 'Permutation validée par l''administration'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_perm RECORD;
BEGIN
    IF NOT public.est_administrateur() THEN
      RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
    END IF;

    UPDATE public.permutations
    SET statut = 'VALIDEE',
        commentaire_admin = p_commentaire,
        updated_at = NOW()
    WHERE id = p_permutation_id
    RETURNING * INTO v_perm;

    IF v_perm.ascq_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type_notification,
            priorite,
            lien_action
        ) VALUES (
            v_perm.ascq_id,
            '🎉 Demande de permutation APPROUVÉE',
            'Votre proposition de permutation a été validée officiellement par l''administration.',
            'PERMUTATION',
            'HAUTE',
            '/espace-ascq/permutations'
        );
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- H. marquer_notification_lue : contrôle du destinataire
DROP FUNCTION IF EXISTS public.marquer_notification_lue(UUID);
CREATE OR REPLACE FUNCTION public.marquer_notification_lue(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.notifications
    SET lu = true
    WHERE id = p_id 
      AND (destinataire_id = auth.uid() OR destinataire_id IS NULL OR public.est_administrateur());
    RETURN true;
END;
$$;


-- ---------------------------------------------------------------------
-- ÉTAPE 3 : PROTECTION PAR TRIGGER DES RÔLES ET STATUTS (C3)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.proteger_champs_sensibles_utilisateurs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.est_administrateur() THEN
    IF NEW.role_technique IS DISTINCT FROM OLD.role_technique THEN
      RAISE EXCEPTION 'Interdit : la modification du rôle technique est strictement réservée aux administrateurs.';
    END IF;

    IF NEW.statut_compte IS DISTINCT FROM OLD.statut_compte THEN
      RAISE EXCEPTION 'Interdit : la modification du statut de compte est strictement réservée aux administrateurs.';
    END IF;

    IF NEW.date_validation IS DISTINCT FROM OLD.date_validation OR NEW.valide_par IS DISTINCT FROM OLD.valide_par THEN
      RAISE EXCEPTION 'Interdit : les métadonnées de validation sont strictement réservées aux administrateurs.';
    END IF;
  END IF;

  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_champs_utilisateurs ON public.utilisateurs;
CREATE TRIGGER trg_proteger_champs_utilisateurs
BEFORE UPDATE ON public.utilisateurs
FOR EACH ROW
EXECUTE FUNCTION public.proteger_champs_sensibles_utilisateurs();

CREATE OR REPLACE FUNCTION public.forcer_champs_inscription_utilisateurs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.est_administrateur() THEN
    NEW.statut_compte = 'EN_ATTENTE';
    IF NEW.poste = 'ASCQ' THEN
      NEW.role_technique = 'ASCQ_OPERATEUR';
    ELSIF NEW.poste = 'RC' THEN
      NEW.role_technique = 'RELAIS';
    ELSE
      NEW.role_technique = 'PUBLIC';
    END IF;
    NEW.date_validation = NULL;
    NEW.valide_par = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_forcer_champs_inscription ON public.utilisateurs;
CREATE TRIGGER trg_forcer_champs_inscription
BEFORE INSERT ON public.utilisateurs
FOR EACH ROW
EXECUTE FUNCTION public.forcer_champs_inscription_utilisateurs();

DROP POLICY IF EXISTS "Inscription libre utilisateurs" ON public.utilisateurs;
DROP POLICY IF EXISTS "Inscription securisee utilisateurs" ON public.utilisateurs;

CREATE POLICY "Inscription securisee utilisateurs" ON public.utilisateurs
    FOR INSERT WITH CHECK (
        (auth.uid() IS NOT NULL AND auth.uid() = id AND role_technique IN ('PUBLIC', 'ASCQ_OPERATEUR', 'RELAIS') AND statut_compte = 'EN_ATTENTE')
        OR public.est_administrateur()
    );


-- ---------------------------------------------------------------------
-- ÉTAPE 4 : SÉCURISATION DE INSCRIRE_NOUVEL_AGENT (C4)
-- ---------------------------------------------------------------------

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
BEGIN
    v_clean_phone := TRIM(p_telephone);

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

    IF EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = p_id) THEN
        UPDATE public.utilisateurs
        SET telephone = v_clean_phone,
            nom = UPPER(TRIM(p_nom)),
            prenoms = TRIM(p_prenoms),
            poste = p_poste,
            poste_autre = p_poste_autre,
            departement_id = p_departement_id,
            zone_sanitaire_id = p_zone_sanitaire_id,
            commune_id = p_commune_id,
            arrondissement_id = p_arrondissement_id,
            second_arrondissement_id = p_second_arrondissement_id,
            statut_compte = 'EN_ATTENTE',
            role_technique = CASE WHEN p_poste = 'ASCQ' THEN 'ASCQ_OPERATEUR' ELSE 'PUBLIC' END,
            updated_at = NOW()
        WHERE id = p_id AND statut_compte IN ('EN_ATTENTE', 'REJETE');
    ELSE
        INSERT INTO public.utilisateurs (
            id, telephone, nom, prenoms, poste, poste_autre,
            role_technique, statut_compte,
            departement_id, zone_sanitaire_id, commune_id, arrondissement_id, second_arrondissement_id
        ) VALUES (
            p_id, v_clean_phone, UPPER(TRIM(p_nom)), TRIM(p_prenoms), p_poste, p_poste_autre,
            CASE WHEN p_poste = 'ASCQ' THEN 'ASCQ_OPERATEUR' ELSE 'PUBLIC' END,
            'EN_ATTENTE',
            p_departement_id, p_zone_sanitaire_id, p_commune_id, p_arrondissement_id, p_second_arrondissement_id
        );
    END IF;

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

    RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;


-- ---------------------------------------------------------------------
-- ÉTAPE 5 : ANNUAIRE PUBLIC & DROITS D'EXÉCUTION STRICTS
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.rechercher_annuaire_ascq(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.rechercher_annuaire_ascq;

CREATE OR REPLACE FUNCTION public.rechercher_annuaire_ascq(
    p_departement_id UUID DEFAULT NULL,
    p_commune_id UUID DEFAULT NULL,
    p_arrondissement_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    nom TEXT,
    prenoms TEXT,
    telephone TEXT,
    departement_nom TEXT,
    commune_nom TEXT,
    arrondissement_nom TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id, u.nom, u.prenoms, u.telephone,
    d.nom AS departement_nom,
    c.nom AS commune_nom,
    a.nom AS arrondissement_nom
  FROM public.utilisateurs u
  JOIN public.ascq_profils p ON u.id = p.id
  LEFT JOIN public.departements d ON u.departement_id = d.id
  LEFT JOIN public.communes c ON u.commune_id = c.id
  LEFT JOIN public.arrondissements a ON u.arrondissement_id = a.id
  WHERE u.statut_compte = 'VALIDE'
    AND (u.poste = 'ASCQ' OR u.role_technique = 'ASCQ_OPERATEUR')
    AND p.afficher_annuaire_public = true
    AND (p_departement_id IS NULL OR u.departement_id = p_departement_id)
    AND (p_commune_id IS NULL OR u.commune_id = p_commune_id)
    AND (p_arrondissement_id IS NULL OR u.arrondissement_id = p_arrondissement_id)
  ORDER BY u.nom, u.prenoms;
$$;

-- Accorder l'accès public (anonyme) UNIQUEMENT aux deux fonctions d'inscription et de recherche d'annuaire
GRANT EXECUTE ON FUNCTION public.inscrire_nouvel_agent TO anon;
GRANT EXECUTE ON FUNCTION public.rechercher_annuaire_ascq TO anon;

GRANT EXECUTE ON FUNCTION public.inscrire_nouvel_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.rechercher_annuaire_ascq TO authenticated;

-- Confirmation de succès
DO $$
BEGIN
  RAISE NOTICE 'ASCQ BÉNIN : Le durcissement de sécurité post-audit a été appliqué avec succès.';
END $$;
