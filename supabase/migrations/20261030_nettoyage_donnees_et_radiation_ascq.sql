-- =====================================================================
-- MIGRATION : NETTOYAGE DES DONNÉES ERRONÉES & GESTION DES COMPTES ASCQ
-- Périmètres de Gouvernance (Représentants & Super Admin)
-- Ministère de la Santé - ASCQ Bénin
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EXTENSION DE LA CONTRAINTE DE STATUT DE COMPTE (AJOUT DE 'RADIE')
-- ---------------------------------------------------------------------
ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_statut_compte_check;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_statut_compte_check 
    CHECK (statut_compte IN ('EN_ATTENTE', 'VALIDE', 'SUSPENDU', 'REJETE', 'RADIE'));

-- Ajout des colonnes de traçabilité de radiation
ALTER TABLE public.utilisateurs 
    ADD COLUMN IF NOT EXISTS motif_radiation TEXT,
    ADD COLUMN IF NOT EXISTS date_radiation TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS radie_par UUID REFERENCES public.utilisateurs(id);

-- ---------------------------------------------------------------------
-- 2. TABLE D'AUDIT DU NETTOYAGE DES DONNÉES ERRONÉES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_nettoyage_donnees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_source TEXT NOT NULL,
    record_id UUID NOT NULL,
    record_identifiant TEXT,
    donnees_json JSONB,
    motif_suppression TEXT NOT NULL,
    explication_detaillee TEXT,
    supprime_par UUID REFERENCES public.utilisateurs(id),
    supprime_par_nom TEXT,
    commune_id UUID REFERENCES public.communes(id),
    departement_id UUID REFERENCES public.departements(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_nettoyage_donnees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture audit nettoyage" ON public.audit_nettoyage_donnees;
CREATE POLICY "Lecture audit nettoyage" ON public.audit_nettoyage_donnees
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insertion audit nettoyage" ON public.audit_nettoyage_donnees;
CREATE POLICY "Insertion audit nettoyage" ON public.audit_nettoyage_donnees
    FOR INSERT TO authenticated WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 3. FONCTION RPC SÉCURISÉE : NETTOYAGE D'UNE DONNÉE ERRONÉE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nettoyer_donnee_erronee(
    p_table TEXT,
    p_id UUID,
    p_motif TEXT,
    p_explication TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_caller RECORD;
    v_data JSONB;
    v_identifiant TEXT := '';
    v_commune_id UUID := NULL;
    v_departement_id UUID := NULL;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentification requise pour cette opération.';
    END IF;

    SELECT * INTO v_caller FROM public.utilisateurs WHERE id = v_caller_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Utilisateur introuvable.';
    END IF;

    -- Vérifier privilèges (Super Admin, Administrateur, Représentant Communal/Départemental ou Cadre habilité)
    IF NOT (
        v_caller.role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR', 'ADMIN_COMMUNAL', 'ADMIN_DEPARTEMENTAL', 'REPRESENTANT_COMMUNAL', 'REPRESENTANT_DEPARTEMENTAL')
        OR v_caller.poste IN ('REPRESENTANT_COMMUNAL', 'REPRESENTANT_DEPARTEMENTAL', 'PF_CCLS_TP', 'CCD_CDLS_TP', 'DDS', 'MCZS', 'MCC')
        OR (v_caller.telephone LIKE '%69031463%')
    ) THEN
        RAISE EXCEPTION 'Privilèges insuffisants pour supprimer ou nettoyer des données.';
    END IF;

    -- Capture des données avant suppression selon la table cible
    IF p_table = 'alertes_communautaires' THEN
        SELECT to_jsonb(t.*) INTO v_data FROM public.alertes_communautaires t WHERE t.id = p_id;
        v_identifiant := COALESCE(v_data->>'titre_alerte', 'Alerte SIMR') || ' (' || COALESCE(v_data->>'date_notification', '') || ')';
        v_commune_id := (v_data->>'commune_id')::UUID;
        v_departement_id := (v_data->>'departement_id')::UUID;
        DELETE FROM public.alertes_communautaires WHERE id = p_id;

    ELSIF p_table = 'deces_communautaires' THEN
        SELECT to_jsonb(t.*) INTO v_data FROM public.deces_communautaires t WHERE t.id = p_id;
        v_identifiant := 'Décès: ' || COALESCE(v_data->>'nom_defunt', '') || ' ' || COALESCE(v_data->>'prenom_defunt', '');
        v_commune_id := (v_data->>'commune_id')::UUID;
        v_departement_id := (v_data->>'departement_id')::UUID;
        DELETE FROM public.deces_communautaires WHERE id = p_id;

    ELSIF p_table = 'consultations_communautaires' THEN
        SELECT to_jsonb(t.*) INTO v_data FROM public.consultations_communautaires t WHERE t.id = p_id;
        v_identifiant := 'Consultation iCCM: ' || COALESCE(v_data->>'prenoms_patient', '') || ' ' || COALESCE(v_data->>'nom_patient', '');
        v_commune_id := (v_data->>'commune_id')::UUID;
        v_departement_id := (v_data->>'departement_id')::UUID;
        DELETE FROM public.consultations_communautaires WHERE id = p_id;

    ELSIF p_table = 'references_communautaires' THEN
        SELECT to_jsonb(t.*) INTO v_data FROM public.references_communautaires t WHERE t.id = p_id;
        v_identifiant := 'Référence CS: ' || COALESCE(v_data->>'nom_patient', '') || ' vers ' || COALESCE(v_data->>'formation_sanitaire_reference', '');
        v_commune_id := (v_data->>'commune_id')::UUID;
        DELETE FROM public.references_communautaires WHERE id = p_id;

    ELSIF p_table = 'suivi_femmes_enceintes' THEN
        SELECT to_jsonb(t.*) INTO v_data FROM public.suivi_femmes_enceintes t WHERE t.id = p_id;
        v_identifiant := 'Maternité: ' || COALESCE(v_data->>'prenoms', '') || ' ' || COALESCE(v_data->>'nom', '');
        v_commune_id := (v_data->>'commune_id')::UUID;
        DELETE FROM public.suivi_femmes_enceintes WHERE id = p_id;

    ELSIF p_table = 'suivi_enfants_1000_jours' THEN
        SELECT to_jsonb(t.*) INTO v_data FROM public.suivi_enfants_1000_jours t WHERE t.id = p_id;
        v_identifiant := '1000 Jours: ' || COALESCE(v_data->>'prenoms', '') || ' ' || COALESCE(v_data->>'nom', '');
        v_commune_id := (v_data->>'commune_id')::UUID;
        DELETE FROM public.suivi_enfants_1000_jours WHERE id = p_id;

    ELSIF p_table = 'activites_menees' THEN
        SELECT to_jsonb(t.*) INTO v_data FROM public.activites_menees t WHERE t.id = p_id;
        v_identifiant := 'Activité: ' || COALESCE(v_data->>'type_activite', '') || ' (' || COALESCE(v_data->>'date_activite', '') || ')';
        DELETE FROM public.activites_menees WHERE id = p_id;

    ELSIF p_table = 'rapports_mensuels_ascq' THEN
        SELECT to_jsonb(t.*) INTO v_data FROM public.rapports_mensuels_ascq t WHERE t.id = p_id;
        v_identifiant := 'RMA: Mois ' || COALESCE(v_data->>'mois', '') || '/' || COALESCE(v_data->>'annee', '');
        v_commune_id := (v_data->>'commune_id')::UUID;
        DELETE FROM public.rapports_mensuels_ascq WHERE id = p_id;

    ELSIF p_table = 'rapports_hebdo_pnsc' THEN
        SELECT to_jsonb(t.*) INTO v_data FROM public.rapports_hebdo_pnsc t WHERE t.id = p_id;
        v_identifiant := 'Hebdo PNSC: Semaine ' || COALESCE(v_data->>'semaine', '') || '/' || COALESCE(v_data->>'annee', '');
        v_commune_id := (v_data->>'commune_id')::UUID;
        DELETE FROM public.rapports_hebdo_pnsc WHERE id = p_id;

    ELSE
        RAISE EXCEPTION 'Table cible non reconnue pour le nettoyage : %', p_table;
    END IF;

    IF v_data IS NULL THEN
        RAISE EXCEPTION 'Enregistrement introuvable dans la table %.', p_table;
    END IF;

    -- Enregistrement dans l'audit
    INSERT INTO public.audit_nettoyage_donnees (
        table_source,
        record_id,
        record_identifiant,
        donnees_json,
        motif_suppression,
        explication_detaillee,
        supprime_par,
        supprime_par_nom,
        commune_id,
        departement_id
    ) VALUES (
        p_table,
        p_id,
        v_identifiant,
        v_data,
        p_motif,
        p_explication,
        v_caller_id,
        v_caller.prenoms || ' ' || v_caller.nom || ' (' || v_caller.poste || ')',
        COALESCE(v_commune_id, v_caller.commune_id),
        COALESCE(v_departement_id, v_caller.departement_id)
    );

    RETURN TRUE;
END;
$$;

-- ---------------------------------------------------------------------
-- 4. FONCTION RPC SÉCURISÉE : RADIATION D'UN ASCQ (FIN DE FONCTIONS)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.radier_compte_ascq(
    p_user_id UUID,
    p_motif TEXT,
    p_explication TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_caller RECORD;
    v_target RECORD;
    v_motif_complet TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;

    SELECT * INTO v_caller FROM public.utilisateurs WHERE id = v_caller_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Utilisateur appelant introuvable.';
    END IF;

    SELECT * INTO v_target FROM public.utilisateurs WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Compte utilisateur à radier introuvable.';
    END IF;

    -- Vérification des privilèges
    IF NOT (
        v_caller.role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR')
        OR (v_caller.telephone LIKE '%69031463%')
        OR (v_caller.role_technique = 'REPRESENTANT_DEPARTEMENTAL' AND v_caller.departement_id = v_target.departement_id)
        OR (v_caller.poste = 'REPRESENTANT_DEPARTEMENTAL' AND v_caller.departement_id = v_target.departement_id)
        OR (v_caller.role_technique = 'REPRESENTANT_COMMUNAL' AND v_caller.commune_id = v_target.commune_id)
        OR (v_caller.poste = 'REPRESENTANT_COMMUNAL' AND v_caller.commune_id = v_target.commune_id)
        OR (v_caller.poste = 'PF_CCLS_TP' AND v_caller.commune_id = v_target.commune_id)
    ) THEN
        RAISE EXCEPTION 'Accès refusé : vous ne pouvez radier que les comptes de votre périmètre géographique.';
    END IF;

    v_motif_complet := p_motif;
    IF p_explication IS NOT NULL AND trim(p_explication) != '' THEN
        v_motif_complet := v_motif_complet || ' - ' || trim(p_explication);
    END IF;

    UPDATE public.utilisateurs
    SET statut_compte = 'RADIE',
        motif_radiation = v_motif_complet,
        date_radiation = NOW(),
        radie_par = v_caller_id,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Tracer dans l'audit
    INSERT INTO public.audit_nettoyage_donnees (
        table_source,
        record_id,
        record_identifiant,
        donnees_json,
        motif_suppression,
        explication_detaillee,
        supprime_par,
        supprime_par_nom,
        commune_id,
        departement_id
    ) VALUES (
        'utilisateurs_radiation',
        p_user_id,
        'Radiation ASCQ: ' || v_target.nom || ' ' || v_target.prenoms || ' (' || v_target.telephone || ')',
        to_jsonb(v_target.*),
        p_motif,
        p_explication,
        v_caller_id,
        v_caller.prenoms || ' ' || v_caller.nom || ' (' || v_caller.poste || ')',
        v_target.commune_id,
        v_target.departement_id
    );

    RETURN TRUE;
END;
$$;

-- ---------------------------------------------------------------------
-- 5. FONCTION RPC SÉCURISÉE : RÉTABLISSEMENT D'UN COMPTE RADIÉ
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.retablir_compte_ascq(
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_caller RECORD;
    v_target RECORD;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;

    SELECT * INTO v_caller FROM public.utilisateurs WHERE id = v_caller_id;
    SELECT * INTO v_target FROM public.utilisateurs WHERE id = p_user_id;

    IF v_target.id IS NULL THEN
        RAISE EXCEPTION 'Compte introuvable.';
    END IF;

    -- Vérification des privilèges
    IF NOT (
        v_caller.role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR')
        OR (v_caller.telephone LIKE '%69031463%')
        OR (v_caller.departement_id = v_target.departement_id AND v_caller.role_technique = 'REPRESENTANT_DEPARTEMENTAL')
        OR (v_caller.commune_id = v_target.commune_id AND v_caller.role_technique = 'REPRESENTANT_COMMUNAL')
    ) THEN
        RAISE EXCEPTION 'Accès refusé.';
    END IF;

    UPDATE public.utilisateurs
    SET statut_compte = 'VALIDE',
        motif_radiation = NULL,
        date_radiation = NULL,
        radie_par = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$;

-- ---------------------------------------------------------------------
-- 6. FONCTION RPC SÉCURISÉE : SUPPRESSION DÉFINITIVE D'UN COMPTE (DOUBLON / TEST)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.supprimer_compte_ascq(
    p_user_id UUID,
    p_motif TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_caller RECORD;
    v_target RECORD;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.';
    END IF;

    SELECT * INTO v_caller FROM public.utilisateurs WHERE id = v_caller_id;
    SELECT * INTO v_target FROM public.utilisateurs WHERE id = p_user_id;

    IF v_target.id IS NULL THEN
        RAISE EXCEPTION 'Compte introuvable.';
    END IF;

    -- Vérification stricte
    IF NOT (
        v_caller.role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR')
        OR (v_caller.telephone LIKE '%69031463%')
        OR (v_caller.departement_id = v_target.departement_id AND v_caller.role_technique = 'REPRESENTANT_DEPARTEMENTAL')
        OR (v_caller.commune_id = v_target.commune_id AND v_caller.role_technique = 'REPRESENTANT_COMMUNAL')
        OR (v_caller.commune_id = v_target.commune_id AND v_caller.poste = 'PF_CCLS_TP')
    ) THEN
        RAISE EXCEPTION 'Privilèges insuffisants pour supprimer définitivement ce compte.';
    END IF;

    -- Enregistrer dans l'audit avant suppression
    INSERT INTO public.audit_nettoyage_donnees (
        table_source,
        record_id,
        record_identifiant,
        donnees_json,
        motif_suppression,
        supprime_par,
        supprime_par_nom,
        commune_id,
        departement_id
    ) VALUES (
        'utilisateurs_suppression',
        p_user_id,
        'Suppression définitive: ' || v_target.nom || ' ' || v_target.prenoms || ' (' || v_target.telephone || ')',
        to_jsonb(v_target.*),
        p_motif,
        v_caller_id,
        v_caller.prenoms || ' ' || v_caller.nom || ' (' || v_caller.poste || ')',
        v_target.commune_id,
        v_target.departement_id
    );

    -- Nettoyer les dépendances
    DELETE FROM public.ascq_profils WHERE id = p_user_id;
    DELETE FROM public.relais_communautaires WHERE ascq_id = p_user_id OR user_id = p_user_id;
    DELETE FROM public.requetes_ascq WHERE ascq_id = p_user_id;
    DELETE FROM public.permutations WHERE ascq_id = p_user_id OR partenaire_ascq_id = p_user_id;
    
    -- Supprimer l'utilisateur de la table publique
    DELETE FROM public.utilisateurs WHERE id = p_user_id;

    -- Supprimer de auth.users si possible
    BEGIN
        DELETE FROM auth.users WHERE id = p_user_id;
    EXCEPTION WHEN OTHERS THEN
        -- Si les permissions directes sur auth.users sont restreintes, la suppression dans utilisateurs suffit
        NULL;
    END;

    RETURN TRUE;
END;
$$;

-- ---------------------------------------------------------------------
-- 7. ENRICHISSEMENT DE LISTER_COMPTES_ADMIN (POUR LE SUPER ADMIN)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.lister_comptes_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.lister_comptes_admin()
RETURNS TABLE (
    id UUID,
    telephone TEXT,
    nom TEXT,
    prenoms TEXT,
    poste TEXT,
    poste_autre TEXT,
    role_technique TEXT,
    role_nomination TEXT,
    statut_compte TEXT,
    motif_radiation TEXT,
    date_radiation TIMESTAMPTZ,
    photo_url TEXT,
    created_at TIMESTAMPTZ,
    departement_id UUID,
    departement_nom TEXT,
    zone_sanitaire_id UUID,
    zone_sanitaire_nom TEXT,
    commune_id UUID,
    commune_nom TEXT,
    arrondissement_id UUID,
    arrondissement_nom TEXT,
    source_financement TEXT,
    nombre_rc INTEGER,
    afficher_annuaire_public BOOLEAN,
    present_liste_nationale BOOLEAN,
    details_liste_nationale TEXT,
    date_prise_service DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, 
    u.telephone, 
    u.nom, 
    u.prenoms, 
    u.poste, 
    u.poste_autre,
    u.role_technique, 
    u.role_nomination,
    u.statut_compte, 
    u.motif_radiation,
    u.date_radiation,
    u.photo_url,
    u.created_at,
    u.departement_id,
    d.nom AS departement_nom,
    u.zone_sanitaire_id,
    z.nom AS zone_sanitaire_nom,
    u.commune_id,
    c.nom AS commune_nom,
    u.arrondissement_id,
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
    ref.date_prise_service
  FROM public.utilisateurs u
  LEFT JOIN public.departements d ON u.departement_id = d.id
  LEFT JOIN public.zones_sanitaires z ON u.zone_sanitaire_id = z.id
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
  ORDER BY u.created_at DESC;
END;
$$;

-- ---------------------------------------------------------------------
-- 8. PERMISSIONS D'EXÉCUTION
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.nettoyer_donnee_erronee TO authenticated;
GRANT EXECUTE ON FUNCTION public.radier_compte_ascq TO authenticated;
GRANT EXECUTE ON FUNCTION public.retablir_compte_ascq TO authenticated;
GRANT EXECUTE ON FUNCTION public.supprimer_compte_ascq TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_comptes_admin TO authenticated;
