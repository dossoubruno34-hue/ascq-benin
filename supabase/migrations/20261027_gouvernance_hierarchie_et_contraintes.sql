-- ====================================================================
-- GOUVERNANCE OFFICIELLE DES ASCQ DU BÉNIN & MATRICE DE RESPONSABILITÉS
-- 1. Seul le Super Admin National (Bruno DOSSOU) nomme et assigne les responsabilités
-- 2. Hiérarchie opérationnelle :
--    - Niveau Département : DDS, CCD CDLS-TP, CSSPR, CSPSMEMH (consultation rapports dépt, diffusion alertes)
--    - Représentant Départemental (ASCQ) : privilèges DDS + valider comptes ASCQ/PF du dépt, modifier profil communal/PF, valider rapports dépt
--    - Niveau Zone Sanitaire : MCZS, RCSE, C-RAMS (consultation rapports zone, alertes)
--    - Niveau Commune : MCC (consultation rapports commune, alertes)
--    - PF CCLS-TP & Représentant Communal (ASCQ) : validation comptes ASCQ commune, alertes commune, validation rapports ASCQ commune
-- 3. Gestion complète des Conseils Santé (publication, masquage, suppression)
-- 4. Gestion complète de la Bibliothèque Documentaire (dépôt guides/manuels, suppression, activation)
-- 5. Élargissement de la contrainte source_financement sur ascq_profils
-- ====================================================================

-- ---------------------------------------------------------------------
-- 1. CORRECTION CONTRAINTE SOURCE DE FINANCEMENT
-- ---------------------------------------------------------------------
ALTER TABLE public.ascq_profils DROP CONSTRAINT IF EXISTS ascq_profils_source_financement_check;
ALTER TABLE public.ascq_profils ADD CONSTRAINT ascq_profils_source_financement_check 
    CHECK (source_financement IN (
        'LLF', 
        'LLF_FADEC', 
        'LLF et FADEC Santé communautaire', 
        'SRHR', 
        'GAVI', 
        'FADEC', 
        'AUTRE'
    ));

-- ---------------------------------------------------------------------
-- 2. FONCTIONS DE PRIVILÈGES (SUPER ADMIN & ADMINISTRATEURS ÉLARGIS)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.est_super_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.est_super_admin()
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

  RETURN v_role = 'SUPER_ADMIN';
END;
$$;

DROP FUNCTION IF EXISTS public.est_administrateur() CASCADE;

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

  RETURN v_role IN (
    'SUPER_ADMIN', 
    'ADMINISTRATEUR', 
    'REPRESENTANT_DEPARTEMENTAL', 
    'ADMIN_DEPARTEMENTAL',
    'CADRE_DEPARTEMENTAL',
    'CADRE_ZONE_SANITAIRE',
    'GESTIONNAIRE_PERIMETRE',
    'REPRESENTANT_COMMUNAL', 
    'ADMIN_COMMUNAL',
    'CADRE_COMMUNAL'
  );
END;
$$;

-- Protection stricte : Seul le Super Admin National peut changer un role_technique
DROP TRIGGER IF EXISTS trg_proteger_champs_utilisateurs ON public.utilisateurs;
DROP FUNCTION IF EXISTS public.proteger_champs_sensibles_utilisateurs() CASCADE;

CREATE OR REPLACE FUNCTION public.proteger_champs_sensibles_utilisateurs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Autoriser les modifications directes en SQL Editor / scripts internes (auth.uid() IS NULL)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Seul le Super Administrateur National peut modifier le rôle technique
  IF (OLD.role_technique IS DISTINCT FROM NEW.role_technique) THEN
    IF NOT public.est_super_admin() THEN
      RAISE EXCEPTION 'Interdit : seul le Super Administrateur National est habilité à nommer et modifier les rôles techniques.';
    END IF;
  END IF;

  -- Seuls les administrateurs et gestionnaires autorisés peuvent modifier le statut de compte
  IF (OLD.statut_compte IS DISTINCT FROM NEW.statut_compte) THEN
    IF NOT public.est_administrateur() THEN
      RAISE EXCEPTION 'Interdit : la modification du statut de compte est strictement réservée aux administrateurs.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_proteger_champs_utilisateurs
BEFORE UPDATE ON public.utilisateurs
FOR EACH ROW
EXECUTE FUNCTION public.proteger_champs_sensibles_utilisateurs();

-- ---------------------------------------------------------------------
-- 3. NOMINATION & ATTRIBUTION DES RESPONSABILITÉS (RÉSERVÉ SUPER ADMIN)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_assigner_responsabilite CASCADE;

CREATE OR REPLACE FUNCTION public.admin_assigner_responsabilite(
    p_target_user_id UUID,
    p_nouveau_poste TEXT,
    p_nouveau_role_technique TEXT,
    p_departement_id UUID DEFAULT NULL,
    p_zone_sanitaire_id UUID DEFAULT NULL,
    p_commune_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    -- Seul le Super Administrateur National peut nommer et assigner les responsabilités
    SELECT role_technique INTO v_caller_role 
    FROM public.utilisateurs 
    WHERE id = auth.uid();

    IF v_caller_role != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'Interdit : Seul le Super Administrateur National est habilité à nommer et assigner les responsabilités.';
    END IF;

    UPDATE public.utilisateurs
    SET poste = p_nouveau_poste,
        role_technique = p_nouveau_role_technique,
        departement_id = COALESCE(p_departement_id, departement_id),
        zone_sanitaire_id = COALESCE(p_zone_sanitaire_id, zone_sanitaire_id),
        commune_id = COALESCE(p_commune_id, commune_id),
        updated_at = NOW()
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Responsabilité et rôle institutionnel assignés avec succès.'
    );
END;
$$;

-- ---------------------------------------------------------------------
-- 4. VALIDATION HIÉRARCHIQUE DES COMPTES (COMMUNAL, DÉPT, NATIONAL)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.changer_statut_compte(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.changer_statut_compte CASCADE;

CREATE OR REPLACE FUNCTION public.changer_statut_compte(
    p_id UUID,
    p_nouveau_statut TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_poste TEXT;
    v_caller_dep UUID;
    v_caller_com UUID;
    v_target_poste TEXT;
    v_target_dep UUID;
    v_target_com UUID;
BEGIN
    SELECT role_technique, poste, departement_id, commune_id 
    INTO v_caller_role, v_caller_poste, v_caller_dep, v_caller_com
    FROM public.utilisateurs
    WHERE id = auth.uid() AND statut_compte = 'VALIDE';

    SELECT poste, departement_id, commune_id
    INTO v_target_poste, v_target_dep, v_target_com
    FROM public.utilisateurs
    WHERE id = p_id;

    -- Contrôle des privilèges selon le rôle hiérarchique
    IF v_caller_role IN ('SUPER_ADMIN', 'ADMINISTRATEUR') THEN
        -- Pleins pouvoirs nationaux
        NULL;
    ELSIF v_caller_role IN ('REPRESENTANT_DEPARTEMENTAL', 'ADMIN_DEPARTEMENTAL') OR v_caller_poste = 'REPRESENTANT_DEPARTEMENTAL' THEN
        -- Représentant départemental : valide ASCQ ou PF CCLS-TP de son département
        IF v_target_dep IS DISTINCT FROM v_caller_dep OR v_target_poste NOT IN ('ASCQ', 'PF_CCLS_TP') THEN
            RAISE EXCEPTION 'Droits insuffisants : Vous ne pouvez valider que les agents ASCQ et PF CCLS-TP de votre département.';
        END IF;
    ELSIF v_caller_role IN ('REPRESENTANT_COMMUNAL', 'ADMIN_COMMUNAL') OR v_caller_poste IN ('REPRESENTANT_COMMUNAL', 'PF_CCLS_TP') THEN
        -- Représentant communal ou PF CCLS-TP : valide les ASCQ de sa commune
        IF v_target_com IS DISTINCT FROM v_caller_com OR v_target_poste != 'ASCQ' THEN
            RAISE EXCEPTION 'Droits insuffisants : Vous ne pouvez valider que les agents ASCQ de votre commune.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Accès refusé : Vous ne disposez pas des privilèges requis pour valider des comptes.';
    END IF;

    UPDATE public.utilisateurs
    SET statut_compte = p_nouveau_statut,
        date_validation = CASE WHEN p_nouveau_statut = 'VALIDE' THEN NOW() ELSE NULL END,
        valide_par = CASE WHEN p_nouveau_statut = 'VALIDE' THEN auth.uid() ELSE NULL END,
        updated_at = NOW()
    WHERE id = p_id;

    RETURN jsonb_build_object('success', true, 'message', 'Statut du compte mis à jour avec succès.');
END;
$$;

-- ---------------------------------------------------------------------
-- 5. MODIFICATION PROFIL D'UN REPRÉSENTANT COMMUNAL OU PF PAR LE REPRÉSENTANT DÉPT
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.representant_dept_modifier_profil CASCADE;

CREATE OR REPLACE FUNCTION public.representant_dept_modifier_profil(
    p_target_user_id UUID,
    p_commune_id UUID DEFAULT NULL,
    p_arrondissement_id UUID DEFAULT NULL,
    p_telephone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_dep UUID;
    v_target_dep UUID;
    v_target_poste TEXT;
BEGIN
    SELECT role_technique, departement_id 
    INTO v_caller_role, v_caller_dep
    FROM public.utilisateurs
    WHERE id = auth.uid() AND statut_compte = 'VALIDE';

    SELECT departement_id, poste
    INTO v_target_dep, v_target_poste
    FROM public.utilisateurs
    WHERE id = p_target_user_id;

    -- Contrôle des droits
    IF v_caller_role = 'SUPER_ADMIN' THEN
        NULL;
    ELSIF v_caller_role IN ('REPRESENTANT_DEPARTEMENTAL', 'ADMIN_DEPARTEMENTAL') THEN
        IF v_caller_dep IS DISTINCT FROM v_target_dep THEN
            RAISE EXCEPTION 'Interdit : Vous ne pouvez modifier que les agents de votre département.';
        END IF;
        IF v_target_poste NOT IN ('REPRESENTANT_COMMUNAL', 'PF_CCLS_TP', 'ASCQ') THEN
            RAISE EXCEPTION 'Interdit : Vous ne pouvez modifier que les fiches des Représentants Communaux, PF ou ASCQ.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Privilèges insuffisants pour modifier ce profil.';
    END IF;

    UPDATE public.utilisateurs
    SET commune_id = COALESCE(p_commune_id, commune_id),
        arrondissement_id = COALESCE(p_arrondissement_id, arrondissement_id),
        telephone = COALESCE(NULLIF(p_telephone, ''), telephone),
        updated_at = NOW()
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Profil mis à jour avec succès.');
END;
$$;

-- ---------------------------------------------------------------------
-- 6. LISTAGE DES COMPTES ADMIN FILTRÉ PAR PÉRIMÈTRE HIÉRARCHIQUE
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.lister_comptes_admin() CASCADE;

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
    afficher_annuaire_public BOOLEAN,
    present_liste_nationale BOOLEAN,
    details_liste_nationale TEXT,
    date_prise_service DATE,
    departement_id UUID,
    commune_id UUID,
    arrondissement_id UUID,
    zone_sanitaire_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_dep UUID;
  v_caller_zs UUID;
  v_caller_com UUID;
BEGIN
  IF NOT public.est_administrateur() THEN
    RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
  END IF;

  SELECT role_technique, departement_id, zone_sanitaire_id, commune_id 
  INTO v_caller_role, v_caller_dep, v_caller_zs, v_caller_com
  FROM public.utilisateurs
  WHERE id = auth.uid();

  RETURN QUERY
  SELECT 
    u.id, u.telephone, u.nom, u.prenoms, u.poste, u.role_technique, u.statut_compte, u.created_at,
    d.nom AS departement_nom,
    c.nom AS commune_nom,
    a.nom AS arrondissement_nom,
    p.source_financement,
    p.nombre_rc,
    p.afficher_annuaire_public,
    (ref.id IS NOT NULL) AS present_liste_nationale,
    CASE 
      WHEN ref.id IS NOT NULL THEN 'Inscrit sur la liste nationale (' || ref.commune || ' / ' || ref.arrondissement_poste || ')'
      WHEN u.poste = 'ASCQ' THEN '⚠️ Nom absent de la liste nationale consolidée'
      ELSE 'Non applicable (' || u.poste || ')'
    END AS details_liste_nationale,
    ref.date_prise_service,
    u.departement_id,
    u.commune_id,
    u.arrondissement_id,
    u.zone_sanitaire_id
  FROM public.utilisateurs u
  LEFT JOIN public.departements d ON u.departement_id = d.id
  LEFT JOIN public.communes c ON u.commune_id = c.id
  LEFT JOIN public.arrondissements a ON u.arrondissement_id = a.id
  LEFT JOIN public.ascq_profils p ON u.id = p.id
  LEFT JOIN LATERAL (
    SELECT r.id, r.commune, r.arrondissement_poste, r.date_prise_service
    FROM public.ascq_referentiel_national r
    WHERE r.est_actif = TRUE
      AND (
        r.nom_normalise = public.normaliser_texte_comparaison(u.nom || ' ' || u.prenoms)
        OR r.nom_normalise = public.normaliser_texte_comparaison(u.prenoms || ' ' || u.nom)
        OR public.normaliser_texte_comparaison(u.nom || ' ' || u.prenoms) LIKE '%' || r.nom_normalise || '%'
        OR r.nom_normalise LIKE '%' || public.normaliser_texte_comparaison(u.nom) || '%'
      )
    ORDER BY (c.nom IS NOT NULL AND UPPER(c.nom) = r.commune) DESC
    LIMIT 1
  ) ref ON true
  WHERE (
    -- Super Admin & Administrateur National : Voient tout le pays
    v_caller_role IN ('SUPER_ADMIN', 'ADMINISTRATEUR')
    -- Département (DDS, Représentant Dépt, CCD, CSSPR, CSPSMEMH) : Voient tout le département
    OR (v_caller_role IN ('REPRESENTANT_DEPARTEMENTAL', 'ADMIN_DEPARTEMENTAL', 'CADRE_DEPARTEMENTAL') AND u.departement_id = v_caller_dep)
    -- Zone Sanitaire (MCZS, RCSE, C-RAMS) : Voient toute la zone sanitaire
    OR (v_caller_role = 'CADRE_ZONE_SANITAIRE' AND (u.zone_sanitaire_id = v_caller_zs OR u.departement_id = v_caller_dep))
    -- Commune (MCC, Représentant Communal, PF CCLS-TP) : Voient leur commune
    OR (v_caller_role IN ('REPRESENTANT_COMMUNAL', 'ADMIN_COMMUNAL', 'CADRE_COMMUNAL') AND u.commune_id = v_caller_com)
    -- Gestionnaire de périmètre
    OR (v_caller_role = 'GESTIONNAIRE_PERIMETRE' AND (u.commune_id = v_caller_com OR u.departement_id = v_caller_dep))
    OR v_caller_role IS NULL
  )
  ORDER BY u.created_at DESC;
END;
$$;

-- ---------------------------------------------------------------------
-- 7. GESTION DES CONSEILS SANTÉ (FONCTIONS RPC & RLS)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_creer_conseil_sante CASCADE;
DROP FUNCTION IF EXISTS public.admin_supprimer_conseil_sante CASCADE;
DROP FUNCTION IF EXISTS public.admin_toggle_conseil_sante CASCADE;

CREATE OR REPLACE FUNCTION public.admin_creer_conseil_sante(
    p_titre TEXT,
    p_contenu TEXT,
    p_categorie TEXT DEFAULT 'Santé communautaire',
    p_auteur TEXT DEFAULT 'Coordination ASCQ'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.est_administrateur() THEN
        RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
    END IF;

    INSERT INTO public.conseils_sante (
        titre, 
        contenu, 
        categorie, 
        auteur, 
        est_publie, 
        created_at
    ) VALUES (
        p_titre, 
        p_contenu, 
        COALESCE(p_categorie, 'Santé communautaire'), 
        COALESCE(p_auteur, 'Coordination ASCQ'), 
        true, 
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Conseil santé publié avec succès.');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_supprimer_conseil_sante(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.est_administrateur() THEN
        RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
    END IF;

    DELETE FROM public.conseils_sante WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'message', 'Conseil santé supprimé avec succès.');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_conseil_sante(p_id UUID, p_est_publie BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.est_administrateur() THEN
        RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
    END IF;

    UPDATE public.conseils_sante SET est_publie = p_est_publie WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'message', 'Visibilité du conseil mise à jour.');
END;
$$;

ALTER TABLE public.conseils_sante ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture conseils sante pour tous" ON public.conseils_sante;
CREATE POLICY "Lecture conseils sante pour tous" ON public.conseils_sante FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestion conseils sante admin" ON public.conseils_sante;
CREATE POLICY "Gestion conseils sante admin" ON public.conseils_sante FOR ALL
    USING (public.est_administrateur())
    WITH CHECK (public.est_administrateur());

-- ---------------------------------------------------------------------
-- 8. GESTION DE LA BIBLIOTHÈQUE DOCUMENTAIRE (FONCTIONS RPC & RLS)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_creer_document_bibliotheque CASCADE;
DROP FUNCTION IF EXISTS public.admin_supprimer_document_bibliotheque CASCADE;
DROP FUNCTION IF EXISTS public.admin_toggle_document_bibliotheque CASCADE;

CREATE OR REPLACE FUNCTION public.admin_creer_document_bibliotheque(
    p_titre TEXT,
    p_categorie TEXT,
    p_description TEXT,
    p_lien_drive TEXT,
    p_format_fichier TEXT DEFAULT 'PDF',
    p_auteur TEXT DEFAULT 'MINISTERE DE LA SANTE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.est_administrateur() THEN
        RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
    END IF;

    INSERT INTO public.bibliotheque_documents (
        titre, 
        categorie, 
        description, 
        lien_drive, 
        format_fichier, 
        auteur, 
        est_actif, 
        created_at, 
        updated_at
    ) VALUES (
        p_titre, 
        p_categorie, 
        p_description, 
        p_lien_drive, 
        COALESCE(p_format_fichier, 'PDF'), 
        COALESCE(p_auteur, 'MINISTERE DE LA SANTE'), 
        true, 
        NOW(), 
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Document officiel ajouté avec succès.');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_supprimer_document_bibliotheque(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.est_administrateur() THEN
        RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
    END IF;

    DELETE FROM public.bibliotheque_documents WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'message', 'Document supprimé.');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_document_bibliotheque(p_id UUID, p_est_actif BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.est_administrateur() THEN
        RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis.';
    END IF;

    UPDATE public.bibliotheque_documents SET est_actif = p_est_actif, updated_at = NOW() WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'message', 'Statut du document mis à jour.');
END;
$$;

ALTER TABLE public.bibliotheque_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture bibliotheque active" ON public.bibliotheque_documents;
CREATE POLICY "Lecture bibliotheque active" ON public.bibliotheque_documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestion bibliotheque admin" ON public.bibliotheque_documents;
CREATE POLICY "Gestion bibliotheque admin" ON public.bibliotheque_documents FOR ALL
    USING (public.est_administrateur())
    WITH CHECK (public.est_administrateur());

-- ---------------------------------------------------------------------
-- 9. AUTORISATIONS D'EXÉCUTION
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.est_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.est_administrateur TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assigner_responsabilite TO authenticated;
GRANT EXECUTE ON FUNCTION public.changer_statut_compte TO authenticated;
GRANT EXECUTE ON FUNCTION public.representant_dept_modifier_profil TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_comptes_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_creer_conseil_sante TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_supprimer_conseil_sante TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_conseil_sante TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_creer_document_bibliotheque TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_supprimer_document_bibliotheque TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_document_bibliotheque TO authenticated;
