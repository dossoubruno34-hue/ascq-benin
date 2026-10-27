-- ====================================================================
-- ASCQ BÉNIN - PLAN DE REMÉDIATION ET DURCISSEMENT DE SÉCURITÉ POST-AUDIT
-- Résolution exhaustive des constats C1, C2, C3, C4, H1, H2, H3, H4
-- ====================================================================

-- ---------------------------------------------------------------------
-- ÉTAPE 1 : RÉVOCATION DES PRIVILÈGES SUR TOUTES LES FONCTIONS SENSIBLES
-- ---------------------------------------------------------------------

-- Révocation stricte des droits d'exécution accordés par défaut à PUBLIC et anon
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Réaccorder les fonctions indispensables aux utilisateurs authentifiés uniquement
GRANT EXECUTE ON FUNCTION public.obtenir_mon_profil() TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtenir_mon_espace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mettre_a_jour_mon_espace(TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creer_nouvelle_alerte(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_mes_alertes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.investiguer_alerte(UUID, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soumettre_requete_ascq(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_mes_requetes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.publier_demande_permutation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_permutations_disponibles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.proposer_permutation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enroler_relais_communautaire(TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_mes_relais() TO authenticated;
GRANT EXECUTE ON FUNCTION public.creer_rapport_mensuel(INTEGER, INTEGER, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtenir_mon_rapport_mensuel(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.est_administrateur() TO authenticated;

-- Fonctions d'administration : accordées à authenticated (le contrôle de rôle interne bloque les non-admins)
GRANT EXECUTE ON FUNCTION public.lister_comptes_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.changer_statut_compte(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exporter_liste_ascq() TO authenticated;
GRANT EXECUTE ON FUNCTION public.exporter_donnees_surveillance_anonymisees(INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtenir_statistiques_tableau_de_bord(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_valider_permutation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_refuser_permutation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_diffuser_message_urgence(TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creer_activite_demandee_ascq(TEXT, TEXT, TEXT, DATE, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.supprimer_activite_demandee_ascq(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marquer_notification_lue(UUID) TO authenticated;

-- Fonctions publiques STRICTEMENT nécessaires pour les visiteurs non connectés (anon)
GRANT EXECUTE ON FUNCTION public.rechercher_annuaire_ascq(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inscrire_nouvel_agent(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.envoyer_suggestion_publique(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;


-- ---------------------------------------------------------------------
-- ÉTAPE 2 : CONTRÔLE DE RÔLE STRICT DANS TOUTES LES FONCTIONS DE GESTION
-- ---------------------------------------------------------------------

-- A. Fonction est_administrateur renforcée
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

-- B. lister_comptes_admin : contrôle strict
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

-- C. changer_statut_compte : contrôle strict
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

-- D. exporter_liste_ascq : contrôle strict
CREATE OR REPLACE FUNCTION public.exporter_liste_ascq()
RETURNS TABLE (
    id UUID,
    nom TEXT,
    prenoms TEXT,
    telephone TEXT,
    source_financement TEXT,
    departement_nom TEXT,
    commune_nom TEXT,
    arrondissement_nom TEXT,
    nombre_rc INTEGER,
    statut_compte TEXT
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
    u.id, u.nom, u.prenoms, u.telephone,
    COALESCE(p.source_financement, 'LLF'),
    COALESCE(d.nom, 'NON DÉFINI'),
    COALESCE(c.nom, 'NON DÉFINIE'),
    COALESCE(a.nom, 'NON DÉFINI'),
    COALESCE(p.nombre_rc, 0),
    u.statut_compte
  FROM public.utilisateurs u
  LEFT JOIN public.ascq_profils p ON u.id = p.id
  LEFT JOIN public.departements d ON u.departement_id = d.id
  LEFT JOIN public.communes c ON u.commune_id = c.id
  LEFT JOIN public.arrondissements a ON u.arrondissement_id = a.id
  WHERE u.poste = 'ASCQ'
  ORDER BY d.nom, c.nom, u.nom;
END;
$$;

-- E. exporter_donnees_surveillance_anonymisees : contrôle strict
CREATE OR REPLACE FUNCTION public.exporter_donnees_surveillance_anonymisees(
    p_annee INTEGER DEFAULT NULL,
    p_semaine_debut INTEGER DEFAULT 1,
    p_semaine_fin INTEGER DEFAULT 53
)
RETURNS TABLE (
    numero_alerte TEXT,
    annee INTEGER,
    semaine_epidemiologique INTEGER,
    date_notification DATE,
    delai_detection_notification_heures NUMERIC,
    departement TEXT,
    commune TEXT,
    arrondissement TEXT,
    type_alerte TEXT,
    nb_personnes_touchees INTEGER,
    nb_deces INTEGER,
    statut TEXT,
    resultat_verification TEXT,
    cause_cim10_code TEXT
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
    a.date_notification,
    a.delai_detection_notification_heures,
    d.nom AS departement,
    c.nom AS commune,
    arr.nom AS arrondissement,
    a.type_alerte_nom,
    a.nb_personnes_touchees,
    a.nb_deces,
    a.statut,
    a.resultat_verification,
    a.cause_cim10_code
  FROM public.alertes_communautaires a
  JOIN public.departements d ON a.departement_id = d.id
  JOIN public.communes c ON a.commune_id = c.id
  JOIN public.arrondissements arr ON a.arrondissement_id = arr.id
  WHERE (p_annee IS NULL OR a.annee = p_annee)
    AND a.semaine_epidemio BETWEEN p_semaine_debut AND p_semaine_fin
  ORDER BY a.annee DESC, a.semaine_epidemio DESC, a.date_notification DESC;
END;
$$;

-- F. obtenir_statistiques_tableau_de_bord : contrôle strict
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
    v_total_alertes INTEGER := 0;
    v_alertes_prioritaires INTEGER := 0;
    v_alertes_averees INTEGER := 0;
    v_alertes_investiguees INTEGER := 0;
    v_alertes_non_investiguees INTEGER := 0;
    v_delai_moyen NUMERIC := 0;
    v_total_deces INTEGER := 0;
    v_total_ascq INTEGER := 0;
    v_total_relais INTEGER := 0;
    v_repartition_maladies JSONB := '[]'::JSONB;
BEGIN
    IF NOT public.est_administrateur() THEN
      RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
    END IF;

    -- Alertes
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE type_alerte_nom IN ('CHOLERA', 'FIEVRE JAUNE', 'LASSA', 'MPOX', 'POLIO', 'MENINGITE')),
        COUNT(*) FILTER (WHERE resultat_verification = 'AVEREE'),
        COUNT(*) FILTER (WHERE statut IN ('INVESTIGUEE', 'CLOTUREE')),
        COUNT(*) FILTER (WHERE statut IN ('NOTIFIEE', 'RECUE', 'VERIFIEE')),
        COALESCE(ROUND(AVG(delai_detection_notification_heures), 1), 0)
    INTO 
        v_total_alertes,
        v_alertes_prioritaires,
        v_alertes_averees,
        v_alertes_investiguees,
        v_alertes_non_investiguees,
        v_delai_moyen
    FROM public.alertes_communautaires
    WHERE (p_departement_id IS NULL OR departement_id = p_departement_id)
      AND (p_commune_id IS NULL OR commune_id = p_commune_id);

    -- Décès
    SELECT COUNT(*)
    INTO v_total_deces
    FROM public.deces_communautaires d
    JOIN public.arrondissements arr ON d.arrondissement_id = arr.id
    WHERE (p_departement_id IS NULL OR arr.commune_id IN (SELECT id FROM public.communes WHERE departement_id = p_departement_id))
      AND (p_commune_id IS NULL OR arr.commune_id = p_commune_id);

    -- Effectifs
    SELECT COUNT(*) INTO v_total_ascq
    FROM public.utilisateurs
    WHERE poste = 'ASCQ' AND statut_compte = 'VALIDE'
      AND (p_departement_id IS NULL OR departement_id = p_departement_id)
      AND (p_commune_id IS NULL OR commune_id = p_commune_id);

    SELECT COUNT(*) INTO v_total_relais
    FROM public.relais_communautaires r
    JOIN public.arrondissements arr ON r.arrondissement_id = arr.id
    WHERE r.est_actif = true
      AND (p_departement_id IS NULL OR arr.commune_id IN (SELECT id FROM public.communes WHERE departement_id = p_departement_id))
      AND (p_commune_id IS NULL OR arr.commune_id = p_commune_id);

    -- Répartition par maladie
    SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
    INTO v_repartition_maladies
    FROM (
        SELECT 
            type_alerte_nom AS nom,
            COUNT(*)::INTEGER AS total,
            COUNT(*) FILTER (WHERE resultat_verification = 'AVEREE')::INTEGER AS averees
        FROM public.alertes_communautaires
        WHERE (p_departement_id IS NULL OR departement_id = p_departement_id)
          AND (p_commune_id IS NULL OR commune_id = p_commune_id)
        GROUP BY type_alerte_nom
        ORDER BY total DESC
        LIMIT 6
    ) sub;

    RETURN jsonb_build_object(
        'total_alertes', v_total_alertes,
        'alertes_prioritaires', v_alertes_prioritaires,
        'alertes_averees', v_alertes_averees,
        'alertes_investiguees', v_alertes_investiguees,
        'alertes_non_investiguees', v_alertes_non_investiguees,
        'delai_moyen_notification', v_delai_moyen,
        'total_deces', v_total_deces,
        'total_ascq', v_total_ascq,
        'total_relais', v_total_relais,
        'repartition_maladies', v_repartition_maladies
    );
END;
$$;

-- G. admin_valider_permutation & admin_refuser_permutation
CREATE OR REPLACE FUNCTION public.admin_valider_permutation(p_permutation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.est_administrateur() THEN
      RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
    END IF;

    UPDATE public.permutations_ascq
    SET statut = 'VALIDEE_ADMIN',
        date_decision = NOW(),
        decision_par = auth.uid()
    WHERE id = p_permutation_id;
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_refuser_permutation(p_permutation_id UUID, p_motif TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.est_administrateur() THEN
      RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
    END IF;

    UPDATE public.permutations_ascq
    SET statut = 'REFUSEE',
        date_decision = NOW(),
        decision_par = auth.uid(),
        commentaire_decision = p_motif
    WHERE id = p_permutation_id;
    RETURN true;
END;
$$;

-- H. marquer_notification_lue : contrôle du destinataire
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
-- ÉTAPE 3 : PROTECTION PAR TRIGGERS DE ROLE_TECHNIQUE ET STATUT_COMPTE
-- ---------------------------------------------------------------------

-- Trigger empêchant l'auto-promotion ou l'auto-validation par un utilisateur non-admin
CREATE OR REPLACE FUNCTION public.proteger_champs_sensibles_utilisateurs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.est_administrateur() THEN
    -- 1. Interdiction stricte de modifier le rôle technique
    IF NEW.role_technique IS DISTINCT FROM OLD.role_technique THEN
      RAISE EXCEPTION 'Interdit : la modification du rôle technique est strictement réservée aux administrateurs.';
    END IF;

    -- 2. Interdiction stricte de modifier le statut du compte
    IF NEW.statut_compte IS DISTINCT FROM OLD.statut_compte THEN
      RAISE EXCEPTION 'Interdit : la validation ou modification du statut de compte est strictement réservée aux administrateurs.';
    END IF;

    -- 3. Interdiction de modifier la date de validation ou le validateur
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

-- Trigger forçant statut EN_ATTENTE et rôle non-privilégié à l'insertion
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

-- Limitation de l'insertion dans utilisateurs à son propre identifiant de session
DROP POLICY IF EXISTS "Inscription libre utilisateurs" ON public.utilisateurs;
DROP POLICY IF EXISTS "Inscription securisee utilisateurs" ON public.utilisateurs;

CREATE POLICY "Inscription securisee utilisateurs" ON public.utilisateurs
    FOR INSERT WITH CHECK (
        (auth.uid() IS NOT NULL AND auth.uid() = id AND role_technique IN ('PUBLIC', 'ASCQ_OPERATEUR', 'RELAIS') AND statut_compte = 'EN_ATTENTE')
        OR public.est_administrateur()
    );


-- ---------------------------------------------------------------------
-- ÉTAPE 4 : SÉCURISATION DE INSCRIRE_NOUVEL_AGENT
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
BEGIN
    v_clean_phone := TRIM(p_telephone);

    -- 1. Contrôle d'identité : si une session est active, p_id doit être auth.uid()
    IF auth.uid() IS NOT NULL AND auth.uid() != p_id THEN
        RAISE EXCEPTION 'Non autorisé : l''identifiant ne correspond pas à la session connectée.';
    END IF;

    -- 2. Interdiction absolue d'écraser un compte déjà existant et validé ou suspendu (anti-usurpation C4)
    IF EXISTS (
        SELECT 1 FROM public.utilisateurs 
        WHERE (id = p_id OR telephone = v_clean_phone) 
          AND statut_compte IN ('VALIDE', 'SUSPENDU')
    ) THEN
        RAISE EXCEPTION 'Compte déjà existant et validé. Veuillez vous connecter ou contacter l''administrateur.';
    END IF;

    -- 3. Insertion propre (sans écrasement sauvage)
    IF EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = p_id) THEN
        -- Si le compte existe mais est EN_ATTENTE ou REJETE, mise à jour autorisée uniquement de ses infos
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

    -- 4. Initialisation du profil ASCQ (avec option annuaire désactivée par défaut pour la confidentialité)
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
