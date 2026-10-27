-- ====================================================================
-- MIGRATION : SUPERVISION DU PÉRIMÈTRE, RECHERCHE ASCQ, MODIFICATION
-- AVEC JUSTIFICATION, NOMINATION DE RESPONSABILITÉ & RÉINITIALISATION MDP
-- ====================================================================

-- 1. Table d'audit des modifications et nominations
CREATE TABLE IF NOT EXISTS public.audit_modifications_ascq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
    ascq_id UUID REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    type_action TEXT NOT NULL CHECK (type_action IN ('MODIFICATION_PROFIL', 'NOMINATION', 'REINITIALISATION_MDP', 'AUTRE')),
    motif_justification TEXT NOT NULL,
    anciennes_valeurs JSONB,
    nouvelles_valeurs JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS sur audit_modifications_ascq
ALTER TABLE public.audit_modifications_ascq ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture audit administrateurs" ON public.audit_modifications_ascq;
CREATE POLICY "Lecture audit administrateurs" ON public.audit_modifications_ascq 
    FOR SELECT USING (public.est_administrateur());

DROP POLICY IF EXISTS "Insertion audit administrateurs" ON public.audit_modifications_ascq;
CREATE POLICY "Insertion audit administrateurs" ON public.audit_modifications_ascq 
    FOR INSERT WITH CHECK (public.est_administrateur());

-- 2. Table des demandes de réinitialisation de mot de passe (oubli de mot de passe)
CREATE TABLE IF NOT EXISTS public.demandes_reinitialisation_mdp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telephone TEXT NOT NULL,
    nom_declare TEXT,
    statut TEXT DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'TRAITEE', 'REJETEE')),
    traitee_par UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
    traitee_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS sur demandes_reinitialisation_mdp
ALTER TABLE public.demandes_reinitialisation_mdp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Insertion publique demandes reset" ON public.demandes_reinitialisation_mdp;
CREATE POLICY "Insertion publique demandes reset" ON public.demandes_reinitialisation_mdp 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Lecture admin demandes reset" ON public.demandes_reinitialisation_mdp;
CREATE POLICY "Lecture admin demandes reset" ON public.demandes_reinitialisation_mdp 
    FOR SELECT USING (public.est_administrateur());

DROP POLICY IF EXISTS "Update admin demandes reset" ON public.demandes_reinitialisation_mdp;
CREATE POLICY "Update admin demandes reset" ON public.demandes_reinitialisation_mdp 
    FOR UPDATE USING (public.est_administrateur());

-- 3. Fonction pour demander une réinitialisation depuis la page connexion
DROP FUNCTION IF EXISTS public.demander_reinitialisation_mot_de_passe(TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.demander_reinitialisation_mot_de_passe(
    p_telephone TEXT,
    p_nom TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_tel TEXT;
    v_user RECORD;
BEGIN
    v_clean_tel := regexp_replace(p_telephone, '\D', '', 'g');
    
    IF LENGTH(v_clean_tel) < 8 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Numéro de téléphone invalide.'
        );
    END IF;

    -- Vérifier si le numéro existe dans utilisateurs
    SELECT id, nom, prenoms, commune_id INTO v_user
    FROM public.utilisateurs
    WHERE regexp_replace(telephone, '\D', '', 'g') = v_clean_tel
    LIMIT 1;

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Aucun compte enregistré avec ce numéro de téléphone. Vérifiez votre numéro.'
        );
    END IF;

    -- Enregistrer la demande (éviter les doublons en attente créés dans les 10 dernières minutes)
    IF NOT EXISTS (
        SELECT 1 FROM public.demandes_reinitialisation_mdp 
        WHERE telephone = v_clean_tel 
          AND statut = 'EN_ATTENTE' 
          AND created_at > NOW() - INTERVAL '10 minutes'
    ) THEN
        INSERT INTO public.demandes_reinitialisation_mdp (telephone, nom_declare)
        VALUES (v_clean_tel, COALESCE(p_nom, v_user.nom || ' ' || v_user.prenoms));

        -- Alerte urgente pour les administrateurs
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type,
            lu
        ) VALUES (
            NULL,
            'Demande de réinitialisation de mot de passe',
            'L''agent ' || v_user.nom || ' ' || v_user.prenoms || ' (' || v_clean_tel || ') a demandé la réinitialisation de son mot de passe.',
            'URGENT',
            false
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Votre demande a été enregistrée avec succès. L''Administrateur National a été notifié pour réinitialiser vos identifiants.',
        'agent_nom', v_user.nom || ' ' || v_user.prenoms
    );
END;
$$;

-- 4. Fonction Admin pour réinitialiser le mot de passe d'un agent
DROP FUNCTION IF EXISTS public.admin_reinitialiser_mot_de_passe(UUID, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_reinitialiser_mot_de_passe(
    p_target_user_id UUID,
    p_nouveau_mot_de_passe TEXT,
    p_motif TEXT DEFAULT 'Réinitialisation demandée suite à oubli'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_target_phone TEXT;
    v_agent_nom TEXT;
BEGIN
    IF NOT public.est_administrateur() THEN
        RAISE EXCEPTION 'Interdit : Seuls les administrateurs habilités peuvent réinitialiser les mots de passe.';
    END IF;

    IF LENGTH(p_nouveau_mot_de_passe) < 6 THEN
        RAISE EXCEPTION 'Le mot de passe doit comporter au moins 6 caractères.';
    END IF;

    SELECT telephone, nom || ' ' || prenoms INTO v_target_phone, v_agent_nom
    FROM public.utilisateurs 
    WHERE id = p_target_user_id;

    IF v_target_phone IS NULL THEN
        RAISE EXCEPTION 'Utilisateur introuvable.';
    END IF;

    -- Mettre à jour dans auth.users
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_nouveau_mot_de_passe, extensions.gen_salt('bf')),
        updated_at = NOW()
    WHERE id = p_target_user_id;

    -- Tracer dans audit_modifications_ascq
    INSERT INTO public.audit_modifications_ascq (
        admin_id,
        ascq_id,
        type_action,
        motif_justification,
        nouvelles_valeurs
    ) VALUES (
        auth.uid(),
        p_target_user_id,
        'REINITIALISATION_MDP',
        COALESCE(p_motif, 'Réinitialisation de mot de passe par l''administration'),
        jsonb_build_object('telephone', v_target_phone, 'date', NOW())
    );

    -- Marquer la demande de réinitialisation comme traitée
    UPDATE public.demandes_reinitialisation_mdp
    SET statut = 'TRAITEE',
        traitee_par = auth.uid(),
        traitee_at = NOW()
    WHERE regexp_replace(telephone, '\D', '', 'g') = regexp_replace(v_target_phone, '\D', '', 'g') 
      AND statut = 'EN_ATTENTE';

    -- Notifier l'agent
    INSERT INTO public.notifications (
        destinataire_id,
        titre,
        message,
        type,
        lu
    ) VALUES (
        p_target_user_id,
        'Mot de passe réinitialisé',
        'Votre mot de passe d''accès a été réinitialisé par l''administration.',
        'INFO',
        false
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Mot de passe réinitialisé avec succès pour ' || v_agent_nom || '.',
        'telephone', v_target_phone
    );
END;
$$;

-- 5. Fonction pour modifier les informations ASCQ avec JUSTIFICATION OBLIGATOIRE
DROP FUNCTION IF EXISTS public.admin_modifier_profil_ascq_avec_justification(UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_modifier_profil_ascq_avec_justification(
    p_ascq_id UUID,
    p_nom TEXT,
    p_prenoms TEXT,
    p_telephone TEXT,
    p_departement_id UUID,
    p_zone_sanitaire_id UUID,
    p_commune_id UUID,
    p_arrondissement_id UUID,
    p_source_financement TEXT,
    p_diplome TEXT,
    p_statut_compte TEXT,
    p_justification TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old RECORD;
    v_caller_role TEXT;
BEGIN
    SELECT role_technique INTO v_caller_role FROM public.utilisateurs WHERE id = auth.uid();
    IF v_caller_role NOT IN ('SUPER_ADMIN', 'ADMINISTRATEUR', 'ADMIN_DEPARTEMENTAL', 'REPRESENTANT_DEPARTEMENTAL') THEN
        RAISE EXCEPTION 'Interdit : Seuls les administrateurs territoriaux ou nationaux sont habilités à modifier les fiches ASCQ.';
    END IF;

    IF p_justification IS NULL OR LENGTH(TRIM(p_justification)) < 5 THEN
        RAISE EXCEPTION 'Une justification administrative explicite (au moins 5 caractères) est obligatoire.';
    END IF;

    SELECT u.*, ap.source_financement, ap.diplome 
    INTO v_old
    FROM public.utilisateurs u
    LEFT JOIN public.ascq_profils ap ON ap.user_id = u.id
    WHERE u.id = p_ascq_id;

    IF v_old.id IS NULL THEN
        RAISE EXCEPTION 'ASCQ introuvable.';
    END IF;

    -- Mise à jour utilisateurs
    UPDATE public.utilisateurs
    SET nom = COALESCE(NULLIF(TRIM(p_nom), ''), nom),
        prenoms = COALESCE(NULLIF(TRIM(p_prenoms), ''), prenoms),
        telephone = COALESCE(NULLIF(TRIM(p_telephone), ''), telephone),
        departement_id = COALESCE(p_departement_id, departement_id),
        zone_sanitaire_id = COALESCE(p_zone_sanitaire_id, zone_sanitaire_id),
        commune_id = COALESCE(p_commune_id, commune_id),
        arrondissement_id = COALESCE(p_arrondissement_id, arrondissement_id),
        statut_compte = COALESCE(p_statut_compte, statut_compte),
        updated_at = NOW()
    WHERE id = p_ascq_id;

    -- Mise à jour ascq_profils
    INSERT INTO public.ascq_profils (user_id, source_financement, diplome, updated_at)
    VALUES (p_ascq_id, p_source_financement, p_diplome, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET source_financement = COALESCE(EXCLUDED.source_financement, public.ascq_profils.source_financement),
        diplome = COALESCE(EXCLUDED.diplome, public.ascq_profils.diplome),
        updated_at = NOW();

    -- Tracer dans audit_modifications_ascq
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
        'MODIFICATION_PROFIL',
        TRIM(p_justification),
        jsonb_build_object(
            'nom', v_old.nom,
            'prenoms', v_old.prenoms,
            'telephone', v_old.telephone,
            'departement_id', v_old.departement_id,
            'commune_id', v_old.commune_id,
            'arrondissement_id', v_old.arrondissement_id,
            'source_financement', v_old.source_financement,
            'diplome', v_old.diplome,
            'statut_compte', v_old.statut_compte
        ),
        jsonb_build_object(
            'nom', p_nom,
            'prenoms', p_prenoms,
            'telephone', p_telephone,
            'departement_id', p_departement_id,
            'commune_id', p_commune_id,
            'arrondissement_id', p_arrondissement_id,
            'source_financement', p_source_financement,
            'diplome', p_diplome,
            'statut_compte', p_statut_compte
        )
    );

    -- Notification de traçabilité à l'agent
    INSERT INTO public.notifications (
        destinataire_id,
        titre,
        message,
        type,
        lu
    ) VALUES (
        p_ascq_id,
        'Mise à jour de votre fiche profil',
        'Votre profil d''agent a été mis à jour par l''administration. Motif : ' || TRIM(p_justification),
        'INFO',
        false
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Fiche ASCQ mise à jour avec traçabilité et justification enregistrées.'
    );
END;
$$;

-- 6. Fonction pour nommer un ASCQ et lui ouvrir les accès communaux ou départementaux
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
    IF v_caller_role != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'Interdit : Seul le Super Administrateur National est habilité à nommer et assigner les responsabilités territoriales.';
    END IF;

    IF p_motif_nomination IS NULL OR LENGTH(TRIM(p_motif_nomination)) < 3 THEN
        RAISE EXCEPTION 'Veuillez spécifier la référence ou le motif de la nomination.';
    END IF;

    SELECT nom || ' ' || prenoms, poste, role_technique INTO v_agent_nom, v_old_poste, v_old_role
    FROM public.utilisateurs WHERE id = p_ascq_id;

    IF v_agent_nom IS NULL THEN
        RAISE EXCEPTION 'ASCQ introuvable.';
    END IF;

    -- Mise à jour du poste, du rôle technique et des territoires
    UPDATE public.utilisateurs
    SET poste = p_nouveau_poste,
        role_technique = p_nouveau_role_technique,
        departement_id = COALESCE(p_departement_id, departement_id),
        zone_sanitaire_id = COALESCE(p_zone_sanitaire_id, zone_sanitaire_id),
        commune_id = COALESCE(p_commune_id, commune_id),
        updated_at = NOW()
    WHERE id = p_ascq_id;

    -- Récupérer noms des territoires
    SELECT nom INTO v_commune_nom FROM public.communes WHERE id = COALESCE(p_commune_id, (SELECT commune_id FROM public.utilisateurs WHERE id = p_ascq_id));
    SELECT nom INTO v_dept_nom FROM public.departements WHERE id = COALESCE(p_departement_id, (SELECT departement_id FROM public.utilisateurs WHERE id = p_ascq_id));

    -- Audit de la nomination
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

    -- Notification officielle à l'agent
    INSERT INTO public.notifications (
        destinataire_id,
        titre,
        message,
        type,
        lu
    ) VALUES (
        p_ascq_id,
        'Nomination officielle : ' || p_nouveau_poste,
        'Félicitations ! Vous avez été nommé(e) ' || p_nouveau_poste || ' (' || COALESCE(v_commune_nom, v_dept_nom, 'Territoire') || ') par le Super Administrateur National. Vos accès aux rapports et aux données de supervision ont été immédiatement activés. Réf : ' || TRIM(p_motif_nomination),
        'OFFICIEL',
        false
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'L''agent ' || v_agent_nom || ' a été nommé ' || p_nouveau_poste || ' avec succès.'
    );
END;
$$;

-- 7. Permissions d'exécution
GRANT EXECUTE ON FUNCTION public.demander_reinitialisation_mot_de_passe TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reinitialiser_mot_de_passe TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_modifier_profil_ascq_avec_justification TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_nommer_ascq_responsabilite TO authenticated;
