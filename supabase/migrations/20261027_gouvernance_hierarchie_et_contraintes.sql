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
-- 1. CORRECTION CONTRAINTES (SOURCE FINANCEMENT, POSTES, RÔLES TECHNIQUES)
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

-- Ajout de la colonne photo_url pour la photo de profil de chaque utilisateur inscrit
ALTER TABLE public.utilisateurs ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Élargissement des postes institutionnels reconnus
ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_poste_check;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_poste_check 
    CHECK (poste IN (
        'ASCQ', 
        'RC', 
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

-- Élargissement des rôles techniques système
ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_technique_check;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_role_technique_check 
    CHECK (role_technique IN (
        'PUBLIC', 
        'RELAIS', 
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
    -- Autoriser si le compte est en cours d'inscription (statut EN_ATTENTE)
    IF (OLD.statut_compte = 'EN_ATTENTE' AND NEW.statut_compte = 'EN_ATTENTE') THEN
      NULL;
    ELSIF NOT public.est_super_admin() THEN
      RAISE EXCEPTION 'Interdit : seul le Super Administrateur National est habilité à nommer et modifier les rôles techniques.';
    END IF;
  END IF;

  -- Seuls les administrateurs et gestionnaires autorisés (ou l'ASCQ pour ses propres RC) peuvent modifier le statut de compte
  IF (OLD.statut_compte IS DISTINCT FROM NEW.statut_compte) THEN
    IF public.est_administrateur() THEN
      NULL;
    -- Chaque ASCQ a le plein pouvoir de valider, activer ou suspendre le compte de son RC
    ELSIF EXISTS (
      SELECT 1 FROM public.relais_communautaires 
      WHERE user_id = NEW.id AND ascq_id = auth.uid()
    ) THEN
      NULL;
    ELSIF (OLD.statut_compte = 'EN_ATTENTE' AND NEW.statut_compte = 'EN_ATTENTE') THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Interdit : la modification du statut de compte est strictement réservée aux administrateurs ou à l''ASCQ responsable du relais.';
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

-- ---------------------------------------------------------------------
-- 10. INSCRIPTION MULTI-POSTES INSTITUTIONNELS (DDS, MCZS, MCC, PF, ASCQ)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.inscrire_nouvel_agent(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.inscrire_nouvel_agent CASCADE;

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
    v_role_initial TEXT;
BEGIN
    v_clean_phone := TRIM(p_telephone);

    IF auth.uid() IS NOT NULL AND auth.uid() != p_id THEN
        RAISE EXCEPTION 'Non autorisé : l''identifiant ne correspond pas à la session connectée.';
    END IF;

    -- Vérifier doublon sur compte déjà validé
    IF EXISTS (
        SELECT 1 FROM public.utilisateurs 
        WHERE (id = p_id OR telephone = v_clean_phone) 
          AND statut_compte IN ('VALIDE', 'SUSPENDU')
    ) THEN
        RAISE EXCEPTION 'Compte déjà existant et validé. Veuillez vous connecter ou contacter l''administrateur.';
    END IF;

    -- Déterminer le rôle technique initial selon le poste
    v_role_initial := CASE
        WHEN p_poste IN ('DDS', 'CCD_CDLS_TP', 'CSSPR', 'CSPSMEMH') THEN 'CADRE_DEPARTEMENTAL'
        WHEN p_poste = 'REPRESENTANT_DEPARTEMENTAL' THEN 'REPRESENTANT_DEPARTEMENTAL'
        WHEN p_poste IN ('MCZS', 'RCSE', 'C_RAMS') THEN 'CADRE_ZONE_SANITAIRE'
        WHEN p_poste = 'MCC' THEN 'CADRE_COMMUNAL'
        WHEN p_poste = 'PF_CCLS_TP' THEN 'ADMIN_COMMUNAL'
        WHEN p_poste = 'REPRESENTANT_COMMUNAL' THEN 'REPRESENTANT_COMMUNAL'
        WHEN p_poste = 'ASCQ' THEN 'ASCQ_OPERATEUR'
        ELSE 'PUBLIC'
    END;

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
            role_technique = v_role_initial,
            updated_at = NOW()
        WHERE id = p_id AND statut_compte IN ('EN_ATTENTE', 'REJETE');
    ELSE
        INSERT INTO public.utilisateurs (
            id, telephone, nom, prenoms, poste, poste_autre,
            role_technique, statut_compte,
            departement_id, zone_sanitaire_id, commune_id, arrondissement_id, second_arrondissement_id
        ) VALUES (
            p_id, v_clean_phone, UPPER(TRIM(p_nom)), TRIM(p_prenoms), p_poste, p_poste_autre,
            v_role_initial,
            'EN_ATTENTE',
            p_departement_id, p_zone_sanitaire_id, p_commune_id, p_arrondissement_id, p_second_arrondissement_id
        );
    END IF;

    -- Enregistrer les paramètres de profil si le poste est un profil terrain ASCQ ou représentant
    IF p_poste IN ('ASCQ', 'REPRESENTANT_COMMUNAL', 'REPRESENTANT_DEPARTEMENTAL') THEN
        INSERT INTO public.ascq_profils (
            id, source_financement, source_financement_autre,
            nombre_rc, afficher_annuaire_public, cumul_deux_arrondissements
        ) VALUES (
            p_id, COALESCE(p_source_financement, 'LLF_FADEC'), p_source_financement_autre,
            COALESCE(p_nombre_rc, 0), COALESCE(p_afficher_annuaire, false), COALESCE(p_cumul_deux_arrondissements, false)
        )
        ON CONFLICT (id) DO UPDATE SET
            source_financement = EXCLUDED.source_financement,
            source_financement_autre = EXCLUDED.source_financement_autre,
            nombre_rc = EXCLUDED.nombre_rc,
            afficher_annuaire_public = EXCLUDED.afficher_annuaire_public,
            cumul_deux_arrondissements = EXCLUDED.cumul_deux_arrondissements;
    END IF;

    RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;

-- ---------------------------------------------------------------------
-- 11. GESTION DES RELAIS COMMUNAUTAIRES (RC) PAR LEUR ASCQ DIRECT
-- "Chaque ASCQ cré, valide, modifi le compte de son RC"
-- ---------------------------------------------------------------------

-- A. Modification de la fiche d'un RC par son ASCQ propriétaire
DROP FUNCTION IF EXISTS public.ascq_modifier_relais CASCADE;

CREATE OR REPLACE FUNCTION public.ascq_modifier_relais(
    p_rc_id UUID,
    p_nom TEXT,
    p_prenoms TEXT,
    p_telephone TEXT,
    p_village_id UUID DEFAULT NULL,
    p_village_nom TEXT DEFAULT NULL,
    p_grappe INTEGER DEFAULT 1,
    p_nom_grappe TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_ascq_id UUID;
    v_clean_phone TEXT;
    v_technical_email TEXT;
    v_user_id UUID;
    v_village_id UUID := p_village_id;
    v_village_nom TEXT := p_village_nom;
    v_ascq_arr UUID;
BEGIN
    v_ascq_id := auth.uid();
    IF v_ascq_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié. Veuillez vous connecter.';
    END IF;

    -- Vérifier que le relais appartient bien à cet ASCQ (ou Super Admin)
    SELECT user_id INTO v_user_id
    FROM public.relais_communautaires
    WHERE id = p_rc_id AND (ascq_id = v_ascq_id OR public.est_super_admin());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Accès refusé : Ce relais communautaire n''est pas rattaché à votre compte.';
    END IF;

    -- Récupérer l'arrondissement de l'ASCQ pour la gestion automatique de village
    SELECT arrondissement_id INTO v_ascq_arr
    FROM public.utilisateurs
    WHERE id = v_ascq_id;

    -- Nettoyage téléphone
    v_clean_phone := regexp_replace(p_telephone, '\D', '', 'g');
    IF LENGTH(v_clean_phone) < 8 THEN
        RAISE EXCEPTION 'Le numéro de téléphone est invalide.';
    END IF;
    v_technical_email := 'tel_' || v_clean_phone || '@ascq.local';

    -- Gestion du village
    IF v_village_id IS NULL AND v_village_nom IS NOT NULL AND TRIM(v_village_nom) <> '' THEN
        SELECT id INTO v_village_id 
        FROM public.villages 
        WHERE arrondissement_id = v_ascq_arr AND UPPER(nom) = UPPER(TRIM(v_village_nom))
        LIMIT 1;

        IF v_village_id IS NULL AND v_ascq_arr IS NOT NULL THEN
            INSERT INTO public.villages (arrondissement_id, nom, code)
            VALUES (v_ascq_arr, UPPER(TRIM(v_village_nom)), 'VIL-' || SUBSTRING(v_clean_phone FROM 5 FOR 4))
            RETURNING id INTO v_village_id;
        END IF;
    ELSIF v_village_id IS NOT NULL AND (v_village_nom IS NULL OR v_village_nom = '') THEN
        SELECT nom INTO v_village_nom FROM public.villages WHERE id = v_village_id;
    END IF;

    -- 1. Mise à jour dans relais_communautaires
    UPDATE public.relais_communautaires
    SET nom = UPPER(TRIM(p_nom)),
        prenoms = TRIM(p_prenoms),
        telephone = p_telephone,
        village_id = v_village_id,
        village_nom = COALESCE(v_village_nom, 'VILLAGE'),
        grappe = p_grappe,
        nom_grappe = p_nom_grappe,
        updated_at = NOW()
    WHERE id = p_rc_id;

    -- 2. Mise à jour du compte utilisateur lié si présent
    IF v_user_id IS NOT NULL THEN
        UPDATE public.utilisateurs
        SET nom = UPPER(TRIM(p_nom)),
            prenoms = TRIM(p_prenoms),
            telephone = p_telephone,
            updated_at = NOW()
        WHERE id = v_user_id;

        -- Mise à jour dans auth.users
        UPDATE auth.users
        SET email = v_technical_email,
            raw_user_meta_data = jsonb_build_object(
                'nom', UPPER(TRIM(p_nom)), 
                'prenoms', TRIM(p_prenoms), 
                'telephone', p_telephone, 
                'poste', 'RC'
            ),
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Fiche du relais communautaire modifiée avec succès.'
    );
END;
$$;

-- B. Validation / Activation / Suspension d'un RC par son ASCQ propriétaire
DROP FUNCTION IF EXISTS public.ascq_changer_statut_rc CASCADE;

CREATE OR REPLACE FUNCTION public.ascq_changer_statut_rc(
    p_rc_id UUID,
    p_nouveau_statut TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_ascq_id UUID;
    v_user_id UUID;
    v_statut_normalise TEXT;
    v_statut_compte TEXT;
BEGIN
    v_ascq_id := auth.uid();
    IF v_ascq_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié. Veuillez vous connecter.';
    END IF;

    -- Vérifier que le relais appartient bien à cet ASCQ (ou Super Admin)
    SELECT user_id INTO v_user_id
    FROM public.relais_communautaires
    WHERE id = p_rc_id AND (ascq_id = v_ascq_id OR public.est_super_admin());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Accès refusé : Ce relais communautaire n''est pas rattaché à votre compte.';
    END IF;

    -- Normalisation du statut
    IF UPPER(p_nouveau_statut) IN ('VALIDE', 'ACTIF', 'ACTIVER') THEN
        v_statut_normalise := 'ACTIF';
        v_statut_compte := 'VALIDE';
    ELSIF UPPER(p_nouveau_statut) IN ('SUSPENDU', 'SUSPENDRE', 'INACTIF') THEN
        v_statut_normalise := 'SUSPENDU';
        v_statut_compte := 'SUSPENDU';
    ELSE
        RAISE EXCEPTION 'Statut non reconnu : utilisez ACTIF ou SUSPENDU.';
    END IF;

    -- 1. Mettre à jour relais_communautaires
    UPDATE public.relais_communautaires
    SET statut = v_statut_normalise,
        updated_at = NOW()
    WHERE id = p_rc_id;

    -- 2. Mettre à jour utilisateurs si user_id existe
    IF v_user_id IS NOT NULL THEN
        UPDATE public.utilisateurs
        SET statut_compte = v_statut_compte,
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'statut', v_statut_normalise,
        'message', 'Statut du relais communautaire mis à jour avec succès (' || v_statut_normalise || ').'
    );
END;
$$;

-- C. Rafraîchissement de la fonction de listage des RC
DROP FUNCTION IF EXISTS public.lister_mes_relais CASCADE;

CREATE OR REPLACE FUNCTION public.lister_mes_relais()
RETURNS TABLE (
    id UUID,
    nom TEXT,
    prenoms TEXT,
    telephone TEXT,
    village_id UUID,
    village_nom TEXT,
    grappe INTEGER,
    nom_grappe TEXT,
    code_temporaire_utilise BOOLEAN,
    statut TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rc.id,
        rc.nom,
        rc.prenoms,
        rc.telephone,
        rc.village_id,
        rc.village_nom,
        rc.grappe,
        rc.nom_grappe,
        rc.code_temporaire_utilise,
        rc.statut,
        rc.created_at
    FROM public.relais_communautaires rc
    WHERE rc.ascq_id = auth.uid()
       OR (public.est_super_admin() AND rc.ascq_id IS NOT NULL)
    ORDER BY rc.created_at DESC;
END;
$$;

-- ---------------------------------------------------------------------
-- 12. PERMISSIONS D'EXÉCUTION
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.inscrire_nouvel_agent TO anon;
GRANT EXECUTE ON FUNCTION public.inscrire_nouvel_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.ascq_modifier_relais TO authenticated;
GRANT EXECUTE ON FUNCTION public.ascq_changer_statut_rc TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_mes_relais TO authenticated;

-- ---------------------------------------------------------------------
-- 13. GESTION DE LA PHOTO DE PROFIL POUR CHAQUE INSCRIT
-- ---------------------------------------------------------------------

-- A. Mise à jour de la photo de profil par l'utilisateur connecté
DROP FUNCTION IF EXISTS public.mettre_a_jour_photo_profil CASCADE;

CREATE OR REPLACE FUNCTION public.mettre_a_jour_photo_profil(p_photo_url TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Non authentifié. Veuillez vous connecter.';
    END IF;

    UPDATE public.utilisateurs
    SET photo_url = p_photo_url,
        updated_at = NOW()
    WHERE id = auth.uid();

    RETURN jsonb_build_object(
        'success', true, 
        'photo_url', p_photo_url, 
        'message', 'Photo de profil mise à jour avec succès.'
    );
END;
$$;

-- B. Fonction obtenir_mon_profil intégrant la photo_url
DROP FUNCTION IF EXISTS public.obtenir_mon_profil() CASCADE;

CREATE OR REPLACE FUNCTION public.obtenir_mon_profil()
RETURNS TABLE (
    id UUID,
    telephone TEXT,
    nom TEXT,
    prenoms TEXT,
    poste TEXT,
    role_technique TEXT,
    statut_compte TEXT,
    departement_id UUID,
    commune_id UUID,
    commune_nom TEXT,
    arrondissement_nom TEXT,
    photo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, u.telephone, u.nom, u.prenoms, u.poste, u.role_technique, u.statut_compte,
    u.departement_id, u.commune_id,
    c.nom AS commune_nom,
    a.nom AS arrondissement_nom,
    u.photo_url
  FROM public.utilisateurs u
  LEFT JOIN public.communes c ON u.commune_id = c.id
  LEFT JOIN public.arrondissements a ON u.arrondissement_id = a.id
  WHERE u.id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.mettre_a_jour_photo_profil TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtenir_mon_profil TO authenticated;
