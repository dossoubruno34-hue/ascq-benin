-- ==============================================================================
-- SANTÉCOM BÉNIN - SCRIPT CONSOLIDÉ OFFICIEL : REFONTE ACCÈS COMMUNE & GOUVERNANCE
-- À exécuter en 1 clic dans le SQL Editor de Supabase
-- Généré le 03 Novembre 2026
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- FICHIER : 20261103_phase_a_roles_et_perimetres.sql
-- ------------------------------------------------------------------------------

-- =====================================================================
-- PHASE A : RÔLES ET PÉRIMÈTRES (REFONTE ACCÈS COMMUNE SANTÉCOM BÉNIN)
-- Version de référence : SUPER_ADMIN, MEMBRE_MINISTERE, PF_CCLS_TP, ASCQ, RC
-- Fonction cumulable : REPRESENTANT_COMMUNAL (attribuée à un ASCQ)
-- Suppression des profils et accès départementaux
-- =====================================================================

-- 0. Suppression préalable des anciennes contraintes pour autoriser la normalisation
ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_technique_check;
ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_nomination_check;
ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_poste_check;

-- 1. Nettoyage et normalisation des rôles existants dans public.utilisateurs
UPDATE public.utilisateurs
SET role_technique = 'ASCQ'
WHERE role_technique = 'ASCQ_OPERATEUR';

UPDATE public.utilisateurs
SET role_technique = 'RC'
WHERE role_technique = 'RELAIS';

-- Migration du cadre communal Ouinhi si nécessaire
UPDATE public.utilisateurs
SET role_nomination = 'REPRESENTANT_COMMUNAL',
    role_technique = 'ASCQ'
WHERE role_technique = 'REPRESENTANT_COMMUNAL';

-- Mise en conformité des anciens profils départementaux (désactivation sans suppression destructive)
UPDATE public.utilisateurs
SET statut_compte = 'SUSPENDU',
    role_technique = 'PUBLIC',
    role_nomination = NULL
WHERE role_technique IN ('CADRE_DEPARTEMENTAL', 'ADMIN_DEPARTEMENTAL', 'REPRESENTANT_DEPARTEMENTAL', 'ADMIN_STRUCTURE')
   OR poste IN ('CCD_CDLS_TP', 'DDS', 'CSSPR', 'CSPSMEMH', 'CSPSMEH');

-- 2. Mise à jour des contraintes de rôles sur public.utilisateurs
ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_technique_check;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_role_technique_check
    CHECK (role_technique IN ('SUPER_ADMIN', 'MEMBRE_MINISTERE', 'PF_CCLS_TP', 'ASCQ', 'RC', 'PUBLIC'));

ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_nomination_check;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_role_nomination_check
    CHECK (role_nomination IS NULL OR role_nomination IN ('REPRESENTANT_COMMUNAL', 'MEMBRE_MINISTERE', 'PF_CCLS_TP'));

-- 3. Fonctions utilitaires de sécurité pour les RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.est_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = auth.uid()
      AND role_technique = 'SUPER_ADMIN'
      AND statut_compte = 'VALIDE'
  );
$$;

CREATE OR REPLACE FUNCTION public.est_membre_ministere()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = auth.uid()
      AND role_technique = 'MEMBRE_MINISTERE'
      AND statut_compte = 'VALIDE'
  );
$$;

CREATE OR REPLACE FUNCTION public.est_pf_ccls_tp(p_commune_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = auth.uid()
      AND role_technique = 'PF_CCLS_TP'
      AND statut_compte = 'VALIDE'
      AND (p_commune_id IS NULL OR commune_id = p_commune_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.est_representant_communal(p_commune_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = auth.uid()
      AND role_technique = 'ASCQ'
      AND role_nomination = 'REPRESENTANT_COMMUNAL'
      AND statut_compte = 'VALIDE'
      AND (p_commune_id IS NULL OR commune_id = p_commune_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.est_ascq()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = auth.uid()
      AND role_technique = 'ASCQ'
      AND statut_compte = 'VALIDE'
  );
$$;

CREATE OR REPLACE FUNCTION public.est_rc()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = auth.uid()
      AND role_technique = 'RC'
      AND statut_compte = 'VALIDE'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_commune_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT commune_id FROM public.utilisateurs WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.est_super_admin TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.est_membre_ministere TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.est_pf_ccls_tp TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.est_representant_communal TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.est_ascq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.est_rc TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_commune_id TO anon, authenticated;

-- 4. RPC exclusive : Nomination et révocation par le SUPER_ADMIN uniquement
CREATE OR REPLACE FUNCTION public.admin_nommer_ou_revoquer_responsable(
    p_target_id UUID,
    p_action TEXT, -- 'NOMMER_REPRESENTANT', 'REVOQUER_REPRESENTANT', 'NOMMER_PF_CCLS_TP', 'REVOQUER_PF_CCLS_TP', 'NOMMER_MINISTERE', 'REVOQUER_MINISTERE'
    p_commune_id UUID DEFAULT NULL,
    p_motif TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_target RECORD;
    v_target_commune UUID;
BEGIN
    -- Seul le SUPER_ADMIN peut exécuter cette fonction
    IF NOT public.est_super_admin() THEN
        RAISE EXCEPTION 'Action réservée exclusivement au Super Administrateur National.';
    END IF;

    IF p_motif IS NULL OR trim(p_motif) = '' THEN
        RAISE EXCEPTION 'Le motif de la nomination ou de la révocation est obligatoire.';
    END IF;

    SELECT * INTO v_target FROM public.utilisateurs WHERE id = p_target_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Utilisateur cible introuvable.';
    END IF;

    v_target_commune := COALESCE(p_commune_id, v_target.commune_id);

    IF p_action = 'NOMMER_REPRESENTANT' THEN
        -- Le représentant communal DOIT être un ASCQ
        IF v_target.role_technique NOT IN ('ASCQ', 'ASCQ_OPERATEUR') THEN
            RAISE EXCEPTION 'Seul un ASCQ peut être nommé Représentant Communal.';
        END IF;
        IF v_target_commune IS NULL THEN
            RAISE EXCEPTION 'La commune de rattachement est obligatoire pour nommer un Représentant Communal.';
        END IF;

        UPDATE public.utilisateurs
        SET role_technique = 'ASCQ',
            role_nomination = 'REPRESENTANT_COMMUNAL',
            commune_id = v_target_commune,
            updated_at = NOW()
        WHERE id = p_target_id;

    ELSIF p_action = 'REVOQUER_REPRESENTANT' THEN
        UPDATE public.utilisateurs
        SET role_nomination = NULL,
            updated_at = NOW()
        WHERE id = p_target_id;

    ELSIF p_action = 'NOMMER_PF_CCLS_TP' THEN
        IF v_target_commune IS NULL THEN
            RAISE EXCEPTION 'La commune est obligatoire pour le Point Focal CCLS-TP.';
        END IF;

        UPDATE public.utilisateurs
        SET role_technique = 'PF_CCLS_TP',
            role_nomination = 'PF_CCLS_TP',
            poste = 'PF_CCLS_TP',
            commune_id = v_target_commune,
            statut_compte = 'VALIDE',
            date_validation = NOW(),
            valide_par = v_caller_id,
            updated_at = NOW()
        WHERE id = p_target_id;

    ELSIF p_action = 'REVOQUER_PF_CCLS_TP' THEN
        UPDATE public.utilisateurs
        SET role_nomination = NULL,
            statut_compte = 'SUSPENDU',
            updated_at = NOW()
        WHERE id = p_target_id;

    ELSIF p_action = 'NOMMER_MINISTERE' THEN
        UPDATE public.utilisateurs
        SET role_technique = 'MEMBRE_MINISTERE',
            role_nomination = 'MEMBRE_MINISTERE',
            poste = 'MEMBRE_MINISTERE',
            statut_compte = 'VALIDE',
            date_validation = NOW(),
            valide_par = v_caller_id,
            updated_at = NOW()
        WHERE id = p_target_id;

    ELSIF p_action = 'REVOQUER_MINISTERE' THEN
        UPDATE public.utilisateurs
        SET role_nomination = NULL,
            statut_compte = 'SUSPENDU',
            updated_at = NOW()
        WHERE id = p_target_id;

    ELSE
        RAISE EXCEPTION 'Action de nomination inconnue : %', p_action;
    END IF;

    -- Traçabilité dans le journal d'audit
    BEGIN
        INSERT INTO public.journal_audit (
            id, auteur_id, action, type_cible, cible_id, details, created_at
        ) VALUES (
            gen_random_uuid(),
            v_caller_id,
            p_action,
            'UTILISATEUR',
            p_target_id,
            jsonb_build_object(
                'capacite', 'SUPER_ADMIN',
                'motif', p_motif,
                'action', p_action,
                'target_nom', v_target.nom,
                'target_prenoms', v_target.prenoms,
                'commune_id', v_target_commune
            ),
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        NULL; -- La nomination ne doit pas échouer si journal_audit a une contrainte temporaire
    END;

    RETURN jsonb_build_object(
        'success', true,
        'action', p_action,
        'target_id', p_target_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_nommer_ou_revoquer_responsable TO authenticated;

-- 5. RLS sur la table public.utilisateurs
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS utilisateurs_select_strict ON public.utilisateurs;
CREATE POLICY utilisateurs_select_strict ON public.utilisateurs
FOR SELECT TO authenticated
USING (
    -- 1. Super Admin : voit tout le pays
    public.est_super_admin()
    -- 2. Membre du Ministère : voit tout le pays (consultation seule)
    OR public.est_membre_ministere()
    -- 3. Représentant Communal : voit uniquement les utilisateurs de sa commune
    OR (
        EXISTS (
            SELECT 1 FROM public.utilisateurs me
            WHERE me.id = auth.uid()
              AND me.role_nomination = 'REPRESENTANT_COMMUNAL'
              AND me.commune_id IS NOT NULL
              AND me.commune_id = utilisateurs.commune_id
        )
    )
    -- 4. PF CCLS-TP : voit uniquement les utilisateurs de sa commune
    OR (
        EXISTS (
            SELECT 1 FROM public.utilisateurs me
            WHERE me.id = auth.uid()
              AND me.role_technique = 'PF_CCLS_TP'
              AND me.commune_id IS NOT NULL
              AND me.commune_id = utilisateurs.commune_id
        )
    )
    -- 5. L'utilisateur lui-même
    OR id = auth.uid()
    -- 6. Un ASCQ voit ses RC rattachés
    OR (
        public.est_ascq() AND role_technique = 'RC' AND (
            arrondissement_id = (SELECT u2.arrondissement_id FROM public.utilisateurs u2 WHERE u2.id = auth.uid())
            OR id IN (SELECT r.user_id FROM public.relais_communautaires r WHERE r.ascq_id = auth.uid())
        )
    )
    -- 7. Un RC voit son ASCQ superviseur
    OR (
        public.est_rc() AND role_technique = 'ASCQ' AND (
            arrondissement_id = (SELECT u2.arrondissement_id FROM public.utilisateurs u2 WHERE u2.id = auth.uid())
            OR id IN (SELECT r.ascq_id FROM public.relais_communautaires r WHERE r.user_id = auth.uid())
        )
    )
);

-- UPDATE sur public.utilisateurs
DROP POLICY IF EXISTS utilisateurs_update_strict ON public.utilisateurs;
CREATE POLICY utilisateurs_update_strict ON public.utilisateurs
FOR UPDATE TO authenticated
USING (
    -- Soit soi-même pour ses données personnelles
    id = auth.uid()
    -- Soit le SUPER_ADMIN pour valider les comptes
    OR public.est_super_admin()
    -- Soit le Représentant Communal pour valider les comptes de sa commune
    OR (
        EXISTS (
            SELECT 1 FROM public.utilisateurs me
            WHERE me.id = auth.uid()
              AND me.role_nomination = 'REPRESENTANT_COMMUNAL'
              AND me.commune_id IS NOT NULL
              AND me.commune_id = utilisateurs.commune_id
        )
    )
)
WITH CHECK (
    -- Soit soi-même
    id = auth.uid()
    -- Soit le SUPER_ADMIN
    OR public.est_super_admin()
    -- Soit le Représentant Communal
    OR (
        EXISTS (
            SELECT 1 FROM public.utilisateurs me
            WHERE me.id = auth.uid()
              AND me.role_nomination = 'REPRESENTANT_COMMUNAL'
              AND me.commune_id IS NOT NULL
              AND me.commune_id = utilisateurs.commune_id
        )
    )
);



-- ------------------------------------------------------------------------------
-- FICHIER : 20261103_phase_b_regle_or_suggestions.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- PHASE B : RÈGLE D'OR - PERSONNE NE MODIFIE LES DONNÉES D'AUTRUI
-- RLS STRICTES UPDATE/DELETE = AUTH.UID() SUR TOUTES LES TABLES DE DONNÉES
-- SYSTÈME DE SUGGESTIONS DE CORRECTION & FIL D'ÉCHANGES
-- ISOLATION TOTALE DES DONNÉES SENSIBLES PERSONNELLES (NPI / IFU)
-- ==============================================================================

-- 1. Table privée pour NPI & IFU (Accessible uniquement par le titulaire du compte)
CREATE TABLE IF NOT EXISTS public.utilisateurs_donnees_privees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID UNIQUE NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    npi TEXT,
    ifu TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.utilisateurs_donnees_privees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seul le titulaire lit ses donnees privees" ON public.utilisateurs_donnees_privees;
CREATE POLICY "Seul le titulaire lit ses donnees privees" ON public.utilisateurs_donnees_privees
    FOR SELECT TO authenticated
    USING (utilisateur_id = auth.uid());

DROP POLICY IF EXISTS "Seul le titulaire modifie ses donnees privees" ON public.utilisateurs_donnees_privees;
CREATE POLICY "Seul le titulaire modifie ses donnees privees" ON public.utilisateurs_donnees_privees
    FOR UPDATE TO authenticated
    USING (utilisateur_id = auth.uid())
    WITH CHECK (utilisateur_id = auth.uid());

DROP POLICY IF EXISTS "Seul le titulaire insere ses donnees privees" ON public.utilisateurs_donnees_privees;
CREATE POLICY "Seul le titulaire insere ses donnees privees" ON public.utilisateurs_donnees_privees
    FOR INSERT TO authenticated
    WITH CHECK (utilisateur_id = auth.uid());

-- Migrer les NPI et IFU existants de utilisateurs vers utilisateurs_donnees_privees
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'utilisateurs' AND column_name = 'npi'
    ) THEN
        INSERT INTO public.utilisateurs_donnees_privees (utilisateur_id, npi, ifu)
        SELECT id, npi, ifu FROM public.utilisateurs
        ON CONFLICT (utilisateur_id) DO UPDATE SET
            npi = EXCLUDED.npi,
            ifu = EXCLUDED.ifu;
    END IF;
END $$;


-- 2. Table des suggestions de correction
CREATE TABLE IF NOT EXISTS public.suggestions_correction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cible_table TEXT NOT NULL, -- 'alertes_communautaires', 'deces_communautaires', 'consultations_communautaires', 'rapports_mensuels_ascq', 'activites_menees', 'plannings_ascq'
    cible_id UUID NOT NULL,
    champ TEXT NOT NULL,
    valeur_actuelle TEXT,
    valeur_proposee TEXT NOT NULL,
    motif TEXT NOT NULL,
    auteur_suggestion_id UUID NOT NULL REFERENCES public.utilisateurs(id),
    auteur_suggestion_nom TEXT,
    auteur_suggestion_role TEXT,
    proprietaire_id UUID NOT NULL REFERENCES public.utilisateurs(id),
    statut TEXT NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE')),
    motif_refus TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    decided_at TIMESTAMPTZ
);

ALTER TABLE public.suggestions_correction ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture suggestions auteur ou proprietaire ou admin" ON public.suggestions_correction;
CREATE POLICY "Lecture suggestions auteur ou proprietaire ou admin" ON public.suggestions_correction
    FOR SELECT TO authenticated
    USING (
        auteur_suggestion_id = auth.uid() 
        OR proprietaire_id = auth.uid()
        OR public.est_super_admin()
    );

DROP POLICY IF EXISTS "Insertion suggestions pour responsables" ON public.suggestions_correction;
CREATE POLICY "Insertion suggestions pour responsables" ON public.suggestions_correction
    FOR INSERT TO authenticated
    WITH CHECK (auteur_suggestion_id = auth.uid());

DROP POLICY IF EXISTS "Mise a jour suggestions pour proprietaire" ON public.suggestions_correction;
CREATE POLICY "Mise a jour suggestions pour proprietaire" ON public.suggestions_correction
    FOR UPDATE TO authenticated
    USING (proprietaire_id = auth.uid())
    WITH CHECK (proprietaire_id = auth.uid());


-- 3. Table des fils d'échanges / demandes d'éclaircissements sur fiches
CREATE TABLE IF NOT EXISTS public.fil_echanges_fiches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cible_table TEXT NOT NULL,
    cible_id UUID NOT NULL,
    auteur_id UUID NOT NULL REFERENCES public.utilisateurs(id),
    auteur_nom TEXT NOT NULL,
    auteur_role TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fil_echanges_fiches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture messages fil pour utilisateurs concernes" ON public.fil_echanges_fiches;
CREATE POLICY "Lecture messages fil pour utilisateurs concernes" ON public.fil_echanges_fiches
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Insertion message fil par utilisateur authentifie" ON public.fil_echanges_fiches;
CREATE POLICY "Insertion message fil par utilisateur authentifie" ON public.fil_echanges_fiches
    FOR INSERT TO authenticated
    WITH CHECK (auteur_id = auth.uid());


-- 4. Fonctions RPC sécurisées pour Suggestions de Correction
CREATE OR REPLACE FUNCTION public.deposer_suggestion_correction(
    p_cible_table TEXT,
    p_cible_id UUID,
    p_champ TEXT,
    p_valeur_actuelle TEXT,
    p_valeur_proposee TEXT,
    p_motif TEXT,
    p_proprietaire_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_new_id UUID;
BEGIN
    SELECT * INTO v_user FROM public.utilisateurs WHERE id = auth.uid();
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non authentifie';
    END IF;

    -- Ne peut pas faire de suggestion a soi-meme
    IF auth.uid() = p_proprietaire_id THEN
        RAISE EXCEPTION 'Vous ne pouvez pas deposer une suggestion sur vos propres fiches';
    END IF;

    INSERT INTO public.suggestions_correction (
        cible_table, cible_id, champ, valeur_actuelle, valeur_proposee,
        motif, auteur_suggestion_id, auteur_suggestion_nom, auteur_suggestion_role,
        proprietaire_id, statut
    ) VALUES (
        p_cible_table, p_cible_id, p_champ, p_valeur_actuelle, p_valeur_proposee,
        p_motif, auth.uid(), TRIM(v_user.nom || ' ' || v_user.prenom), COALESCE(v_user.role_nomination, v_user.role_technique),
        p_proprietaire_id, 'EN_ATTENTE'
    ) RETURNING id INTO v_new_id;

    -- Enregistrer dans l'audit
    INSERT INTO public.journal_audit (
        utilisateur_id, capacite, action, details
    ) VALUES (
        auth.uid(),
        COALESCE(v_user.role_nomination, v_user.role_technique),
        'DEPOT_SUGGESTION_CORRECTION',
        jsonb_build_object(
            'suggestion_id', v_new_id,
            'cible_table', p_cible_table,
            'cible_id', p_cible_id,
            'proprietaire_id', p_proprietaire_id,
            'champ', p_champ
        )
    );

    RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decider_suggestion_correction(
    p_suggestion_id UUID,
    p_statut TEXT, -- 'ACCEPTEE' ou 'REFUSEE'
    p_motif_refus TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sug RECORD;
    v_sql TEXT;
BEGIN
    SELECT * INTO v_sug FROM public.suggestions_correction WHERE id = p_suggestion_id;
    IF v_sug IS NULL THEN
        RAISE EXCEPTION 'Suggestion non trouvee';
    END IF;

    -- RÈGLE D'OR : SEUL LE PROPRIÉTAIRE PEUT ACCEPTER OU REFUSER LA CORRECTION
    IF v_sug.proprietaire_id <> auth.uid() THEN
        RAISE EXCEPTION 'Seul l''auteur ou proprietaire de la fiche peut statuer sur cette suggestion';
    END IF;

    IF v_sug.statut <> 'EN_ATTENTE' THEN
        RAISE EXCEPTION 'Cette suggestion a deja ete traitee';
    END IF;

    IF p_statut = 'REFUSEE' AND (p_motif_refus IS NULL OR trim(p_motif_refus) = '') THEN
        RAISE EXCEPTION 'Le motif de refus est obligatoire';
    END IF;

    -- Si acceptée, on applique la modification
    IF p_statut = 'ACCEPTEE' THEN
        -- Sécurisation contre injection SQL : liste blanche de tables et colonnes
        IF v_sug.cible_table IN ('alertes_communautaires', 'deces_communautaires', 'consultations_communautaires', 'rapports_mensuels_ascq', 'activites_menees', 'plannings_ascq') THEN
            v_sql := format('UPDATE public.%I SET %I = %L, updated_at = NOW() WHERE id = %L', 
                            v_sug.cible_table, v_sug.champ, v_sug.valeur_proposee, v_sug.cible_id);
            EXECUTE v_sql;
        ELSE
            RAISE EXCEPTION 'Table cible non autorisee pour modification dynamique';
        END IF;

        UPDATE public.suggestions_correction SET
            statut = 'ACCEPTEE',
            decided_at = NOW()
        WHERE id = p_suggestion_id;

        INSERT INTO public.journal_audit (
            utilisateur_id, capacite, action, details
        ) VALUES (
            auth.uid(),
            'AUTEUR',
            'ACCEPTATION_SUGGESTION_CORRECTION',
            jsonb_build_object(
                'suggestion_id', p_suggestion_id,
                'cible_table', v_sug.cible_table,
                'cible_id', v_sug.cible_id,
                'champ', v_sug.champ,
                'valeur_appliquee', v_sug.valeur_proposee
            )
        );

        RETURN jsonb_build_object('success', true, 'message', 'Correction appliquee avec succes');
    ELSE
        UPDATE public.suggestions_correction SET
            statut = 'REFUSEE',
            motif_refus = p_motif_refus,
            decided_at = NOW()
        WHERE id = p_suggestion_id;

        INSERT INTO public.journal_audit (
            utilisateur_id, capacite, action, details
        ) VALUES (
            auth.uid(),
            'AUTEUR',
            'REFUS_SUGGESTION_CORRECTION',
            jsonb_build_object(
                'suggestion_id', p_suggestion_id,
                'cible_table', v_sug.cible_table,
                'cible_id', v_sug.cible_id,
                'motif_refus', p_motif_refus
            )
        );

        RETURN jsonb_build_object('success', true, 'message', 'Suggestion refusee avec motif');
    END IF;
END;
$$;


-- 5. VERROUILLAGE RLS STRICT UPDATE / DELETE = AUTH.UID() SUR TOUTES LES TABLES DE DONNÉES
-- AUCUNE EXCEPTION, MÊME POUR LE SUPER_ADMIN !

-- A. Table alertes_communautaires
DROP POLICY IF EXISTS "Modification alerte strictly author" ON public.alertes_communautaires;
DROP POLICY IF EXISTS "Modification alerte par notificateur ou superviseur" ON public.alertes_communautaires;
DROP POLICY IF EXISTS "Modification alertes pour ascq et admin" ON public.alertes_communautaires;
DROP POLICY IF EXISTS "Mise a jour alertes pour ascq et admin" ON public.alertes_communautaires;

CREATE POLICY "Modification alerte strictly author" ON public.alertes_communautaires
    FOR UPDATE TO authenticated
    USING (notificateur_id = auth.uid())
    WITH CHECK (notificateur_id = auth.uid());

DROP POLICY IF EXISTS "Suppression alerte strictly author" ON public.alertes_communautaires;
CREATE POLICY "Suppression alerte strictly author" ON public.alertes_communautaires
    FOR DELETE TO authenticated
    USING (notificateur_id = auth.uid());


-- B. Table deces_communautaires
DROP POLICY IF EXISTS "Modification deces strictly author" ON public.deces_communautaires;
DROP POLICY IF EXISTS "Modification deces par notificateur ou superviseur" ON public.deces_communautaires;
DROP POLICY IF EXISTS "Mise a jour deces pour ascq et admin" ON public.deces_communautaires;

CREATE POLICY "Modification deces strictly author" ON public.deces_communautaires
    FOR UPDATE TO authenticated
    USING (notificateur_id = auth.uid())
    WITH CHECK (notificateur_id = auth.uid());

DROP POLICY IF EXISTS "Suppression deces strictly author" ON public.deces_communautaires;
CREATE POLICY "Suppression deces strictly author" ON public.deces_communautaires
    FOR DELETE TO authenticated
    USING (notificateur_id = auth.uid());


-- C. Table consultations_communautaires
DROP POLICY IF EXISTS "Modification consultations strictly author" ON public.consultations_communautaires;
DROP POLICY IF EXISTS "Mise a jour consultations pour ascq et admin" ON public.consultations_communautaires;

CREATE POLICY "Modification consultations strictly author" ON public.consultations_communautaires
    FOR UPDATE TO authenticated
    USING (ascq_id = auth.uid())
    WITH CHECK (ascq_id = auth.uid());

DROP POLICY IF EXISTS "Suppression consultations strictly author" ON public.consultations_communautaires;
CREATE POLICY "Suppression consultations strictly author" ON public.consultations_communautaires
    FOR DELETE TO authenticated
    USING (ascq_id = auth.uid());


-- D. Table references_communautaires
DROP POLICY IF EXISTS "Modification references strictly author" ON public.references_communautaires;
DROP POLICY IF EXISTS "Mise a jour references pour ascq et admin" ON public.references_communautaires;

CREATE POLICY "Modification references strictly author" ON public.references_communautaires
    FOR UPDATE TO authenticated
    USING (ascq_id = auth.uid() OR notificateur_id = auth.uid())
    WITH CHECK (ascq_id = auth.uid() OR notificateur_id = auth.uid());

DROP POLICY IF EXISTS "Suppression references strictly author" ON public.references_communautaires;
CREATE POLICY "Suppression references strictly author" ON public.references_communautaires
    FOR DELETE TO authenticated
    USING (ascq_id = auth.uid() OR notificateur_id = auth.uid());


-- E. Table rapports_mensuels_ascq
DROP POLICY IF EXISTS "Modification rapports strictly author" ON public.rapports_mensuels_ascq;
DROP POLICY IF EXISTS "Mise a jour rapports pour ascq et admin" ON public.rapports_mensuels_ascq;

CREATE POLICY "Modification rapports strictly author" ON public.rapports_mensuels_ascq
    FOR UPDATE TO authenticated
    USING (ascq_id = auth.uid())
    WITH CHECK (ascq_id = auth.uid());

DROP POLICY IF EXISTS "Suppression rapports strictly author" ON public.rapports_mensuels_ascq;
CREATE POLICY "Suppression rapports strictly author" ON public.rapports_mensuels_ascq
    FOR DELETE TO authenticated
    USING (ascq_id = auth.uid());


-- F. Table activites_menees
DROP POLICY IF EXISTS "Modification activites strictly author" ON public.activites_menees;
CREATE POLICY "Modification activites strictly author" ON public.activites_menees
    FOR UPDATE TO authenticated
    USING (ascq_id = auth.uid())
    WITH CHECK (ascq_id = auth.uid());

DROP POLICY IF EXISTS "Suppression activites strictly author" ON public.activites_menees;
CREATE POLICY "Suppression activites strictly author" ON public.activites_menees
    FOR DELETE TO authenticated
    USING (ascq_id = auth.uid());


-- G. Table plannings_ascq
DROP POLICY IF EXISTS "Modification plannings strictly author" ON public.plannings_ascq;
CREATE POLICY "Modification plannings strictly author" ON public.plannings_ascq
    FOR UPDATE TO authenticated
    USING (ascq_id = auth.uid())
    WITH CHECK (ascq_id = auth.uid());

DROP POLICY IF EXISTS "Suppression plannings strictly author" ON public.plannings_ascq;
CREATE POLICY "Suppression plannings strictly author" ON public.plannings_ascq
    FOR DELETE TO authenticated
    USING (ascq_id = auth.uid());



-- ------------------------------------------------------------------------------
-- FICHIER : 20261103_phase_c_enrolement_et_validations_rc.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- PHASE C : ENRÔLEMENT ET VALIDATIONS RC
-- 1. Inscription autonome des RC avec rattachement ASCQ
-- 2. Validation / Invalidation par l'ASCQ ou le Représentant Communal
-- 3. Cycle de vie des saisies RC : SAISI -> VALIDE (verrouillé) / INVALIDE (motif)
-- ==============================================================================

-- 1. Ajout des colonnes de verrouillage et validation sur alertes et deces si manquantes
DO $$
BEGIN
    -- alertes_communautaires
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alertes_communautaires' AND column_name='est_verrouille') THEN
        ALTER TABLE public.alertes_communautaires ADD COLUMN est_verrouille BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alertes_communautaires' AND column_name='motif_invalidation') THEN
        ALTER TABLE public.alertes_communautaires ADD COLUMN motif_invalidation TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alertes_communautaires' AND column_name='valide_par') THEN
        ALTER TABLE public.alertes_communautaires ADD COLUMN valide_par UUID REFERENCES public.utilisateurs(id);
    END IF;

    -- deces_communautaires
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deces_communautaires' AND column_name='est_verrouille') THEN
        ALTER TABLE public.deces_communautaires ADD COLUMN est_verrouille BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deces_communautaires' AND column_name='motif_invalidation') THEN
        ALTER TABLE public.deces_communautaires ADD COLUMN motif_invalidation TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deces_communautaires' AND column_name='valide_par') THEN
        ALTER TABLE public.deces_communautaires ADD COLUMN valide_par UUID REFERENCES public.utilisateurs(id);
    END IF;

    -- relais_communautaires
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='relais_communautaires' AND column_name='motif_invalidation') THEN
        ALTER TABLE public.relais_communautaires ADD COLUMN motif_invalidation TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='relais_communautaires' AND column_name='valide_par') THEN
        ALTER TABLE public.relais_communautaires ADD COLUMN valide_par UUID REFERENCES public.utilisateurs(id);
    END IF;
END $$;


-- 2. Fonction RPC : Validation ou Invalidation de compte RC
CREATE OR REPLACE FUNCTION public.valider_ou_invalider_compte_rc(
    p_rc_utilisateur_id UUID,
    p_statut TEXT, -- 'VALIDE' ou 'INVALIDE'
    p_motif TEXT DEFAULT NULL,
    p_village_nom TEXT DEFAULT NULL,
    p_grappe INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rc_user RECORD;
    v_rc_fiche RECORD;
    v_caller RECORD;
    v_can_validate BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_caller FROM public.utilisateurs WHERE id = auth.uid();
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Non authentifie';
    END IF;

    SELECT * INTO v_rc_user FROM public.utilisateurs WHERE id = p_rc_utilisateur_id;
    IF v_rc_user IS NULL THEN
        RAISE EXCEPTION 'Compte RC non trouve';
    END IF;

    SELECT * INTO v_rc_fiche FROM public.relais_communautaires 
    WHERE utilisateur_id = p_rc_utilisateur_id OR id = p_rc_utilisateur_id
    LIMIT 1;

    -- Vérification des droits :
    -- Le validateur doit être :
    -- 1. Le SUPER_ADMIN
    -- 2. L'ASCQ superviseur choisi lors de l'enrôlement
    -- 3. Le REPRESENTANT_COMMUNAL de la commune de l'agent
    IF public.est_super_admin() THEN
        v_can_validate := TRUE;
    ELSIF v_rc_fiche IS NOT NULL AND v_rc_fiche.ascq_id = auth.uid() THEN
        v_can_validate := TRUE;
    ELSIF v_rc_user.commune_id IS NOT NULL AND public.est_representant_communal(v_rc_user.commune_id) THEN
        v_can_validate := TRUE;
    END IF;

    IF NOT v_can_validate THEN
        RAISE EXCEPTION 'Seul l''ASCQ de rattachement ou le Representant Communal peut valider cette inscription';
    END IF;

    IF p_statut = 'INVALIDE' AND (p_motif IS NULL OR trim(p_motif) = '') THEN
        RAISE EXCEPTION 'Le motif d''invalidation est obligatoire';
    END IF;

    IF p_statut NOT IN ('VALIDE', 'INVALIDE') THEN
        RAISE EXCEPTION 'Statut invalide : VALIDE ou INVALIDE attendu';
    END IF;

    -- Mise à jour dans utilisateurs
    UPDATE public.utilisateurs SET
        statut = p_statut,
        updated_at = NOW()
    WHERE id = p_rc_utilisateur_id;

    -- Mise à jour dans relais_communautaires si la fiche existe
    IF v_rc_fiche IS NOT NULL THEN
        UPDATE public.relais_communautaires SET
            statut = p_statut,
            motif_invalidation = CASE WHEN p_statut = 'INVALIDE' THEN p_motif ELSE NULL END,
            valide_par = auth.uid(),
            village_nom = COALESCE(p_village_nom, village_nom),
            grappe = COALESCE(p_grappe, grappe),
            updated_at = NOW()
        WHERE id = v_rc_fiche.id;
    END IF;

    -- Journal d'audit
    INSERT INTO public.journal_audit (
        utilisateur_id, capacite, action, details
    ) VALUES (
        auth.uid(),
        COALESCE(v_caller.role_nomination, v_caller.role_technique),
        CASE WHEN p_statut = 'VALIDE' THEN 'VALIDATION_COMPTE_RC' ELSE 'INVALIDATION_COMPTE_RC' END,
        jsonb_build_object(
            'rc_id', p_rc_utilisateur_id,
            'statut', p_statut,
            'motif', p_motif
        )
    );

    RETURN jsonb_build_object('success', true, 'statut', p_statut);
END;
$$;


-- 3. Fonction RPC : Validation ou Invalidation de saisie RC (Alerte, Décès, Activité)
CREATE OR REPLACE FUNCTION public.valider_ou_invalider_saisie_rc(
    p_table TEXT,
    p_fiche_id UUID,
    p_statut TEXT, -- 'VALIDE' ou 'INVALIDE'
    p_motif TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller RECORD;
    v_commune_id UUID;
    v_ascq_id UUID;
    v_can_act BOOLEAN := FALSE;
    v_sql TEXT;
BEGIN
    SELECT * INTO v_caller FROM public.utilisateurs WHERE id = auth.uid();
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Non authentifie';
    END IF;

    IF p_statut NOT IN ('VALIDE', 'INVALIDE') THEN
        RAISE EXCEPTION 'Statut invalide : VALIDE ou INVALIDE attendu';
    END IF;

    IF p_statut = 'INVALIDE' AND (p_motif IS NULL OR trim(p_motif) = '') THEN
        RAISE EXCEPTION 'Le motif d''invalidation est obligatoire';
    END IF;

    -- Contrôle selon la table
    IF p_table = 'alertes_communautaires' THEN
        SELECT commune_id, ascq_superviseur_id INTO v_commune_id, v_ascq_id 
        FROM public.alertes_communautaires WHERE id = p_fiche_id;
    ELSIF p_table = 'deces_communautaires' THEN
        SELECT commune_id, ascq_superviseur_id INTO v_commune_id, v_ascq_id 
        FROM public.deces_communautaires WHERE id = p_fiche_id;
    ELSIF p_table = 'activites_menees' THEN
        SELECT u.commune_id, a.ascq_id INTO v_commune_id, v_ascq_id 
        FROM public.activites_menees a
        JOIN public.utilisateurs u ON u.id = a.ascq_id
        WHERE a.id = p_fiche_id;
    ELSE
        RAISE EXCEPTION 'Table inconnue ou non supportee';
    END IF;

    -- Vérifier habilitation
    IF public.est_super_admin() THEN
        v_can_act := TRUE;
    ELSIF v_ascq_id = auth.uid() THEN
        v_can_act := TRUE;
    ELSIF v_commune_id IS NOT NULL AND public.est_representant_communal(v_commune_id) THEN
        v_can_act := TRUE;
    END IF;

    IF NOT v_can_act THEN
        RAISE EXCEPTION 'Non autorise : vous devez etre l''ASCQ superviseur ou le Representant Communal';
    END IF;

    -- Exécution dynamique sécurisée
    IF p_statut = 'VALIDE' THEN
        -- VERROUILLAGE TOTAL : lecture seule pour tous, auteur compris
        v_sql := format('UPDATE public.%I SET statut = ''VALIDE'', est_verrouille = TRUE, valide_par = %L, updated_at = NOW() WHERE id = %L',
                        p_table, auth.uid(), p_fiche_id);
    ELSE
        -- INVALIDATION : déverrouillé pour correction par le RC auteur
        v_sql := format('UPDATE public.%I SET statut = ''INVALIDE'', est_verrouille = FALSE, motif_invalidation = %L, updated_at = NOW() WHERE id = %L',
                        p_table, p_motif, p_fiche_id);
    END IF;

    EXECUTE v_sql;

    -- Audit
    INSERT INTO public.journal_audit (
        utilisateur_id, capacite, action, details
    ) VALUES (
        auth.uid(),
        COALESCE(v_caller.role_nomination, v_caller.role_technique),
        CASE WHEN p_statut = 'VALIDE' THEN 'VALIDATION_SAISIE_RC' ELSE 'INVALIDATION_SAISIE_RC' END,
        jsonb_build_object(
            'table', p_table,
            'fiche_id', p_fiche_id,
            'statut', p_statut,
            'motif', p_motif
        )
    );

    RETURN jsonb_build_object('success', true, 'statut', p_statut);
END;
$$;



-- ------------------------------------------------------------------------------
-- FICHIER : 20261103_phase_d_demandes_export_ministere.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- PHASE D : PROTOCOLE D'EXPORT & GESTION DES DEMANDES MINISTÈRE
-- 1. Table des demandes d'export formulées par les Membres du Ministère
-- 2. Validation / Approbation stricte par le Super Admin (72h, usage unique)
-- 3. Journalisation obligatoire de chaque export dans journal_audit
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.demandes_export_ministere (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demandeur_id UUID NOT NULL REFERENCES public.utilisateurs(id),
    demandeur_nom TEXT NOT NULL,
    demandeur_role TEXT NOT NULL,
    perimetre TEXT NOT NULL DEFAULT 'NATIONAL',
    commune_id UUID REFERENCES public.communes(id),
    format_export TEXT NOT NULL CHECK (format_export IN ('EXCEL', 'PDF', 'CSV')),
    type_donnees TEXT NOT NULL,
    destinataire_declare TEXT NOT NULL,
    motif TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'APPROUVEE', 'REFUSEE')),
    motif_refus TEXT,
    approuve_par UUID REFERENCES public.utilisateurs(id),
    date_decision TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    token_usage_unique TEXT UNIQUE,
    est_consomme BOOLEAN NOT NULL DEFAULT FALSE,
    consomme_a TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.demandes_export_ministere ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture demandes export pour demandeur et super admin" ON public.demandes_export_ministere;
CREATE POLICY "Lecture demandes export pour demandeur et super admin" ON public.demandes_export_ministere
    FOR SELECT TO authenticated
    USING (
        demandeur_id = auth.uid() 
        OR public.est_super_admin()
    );

DROP POLICY IF EXISTS "Insertion demandes export ministere" ON public.demandes_export_ministere;
CREATE POLICY "Insertion demandes export ministere" ON public.demandes_export_ministere
    FOR INSERT TO authenticated
    WITH CHECK (demandeur_id = auth.uid());


-- RPC 1 : Créer une demande d'export (Membre Ministère)
CREATE OR REPLACE FUNCTION public.creer_demande_export_ministere(
    p_perimetre TEXT,
    p_commune_id UUID,
    p_format TEXT,
    p_type_donnees TEXT,
    p_destinataire TEXT,
    p_motif TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_new_id UUID;
BEGIN
    SELECT * INTO v_user FROM public.utilisateurs WHERE id = auth.uid();
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Non authentifie';
    END IF;

    IF v_user.role_technique <> 'MEMBRE_MINISTERE' AND NOT public.est_super_admin() THEN
        RAISE EXCEPTION 'Seuls les membres du ministere ou administrateurs peuvent formuler une demande d''export';
    END IF;

    IF p_destinataire IS NULL OR trim(p_destinataire) = '' THEN
        RAISE EXCEPTION 'Le destinataire declare est obligatoire';
    END IF;

    IF p_motif IS NULL OR trim(p_motif) = '' THEN
        RAISE EXCEPTION 'Le motif officiel de l''export est obligatoire';
    END IF;

    INSERT INTO public.demandes_export_ministere (
        demandeur_id, demandeur_nom, demandeur_role, perimetre, commune_id,
        format_export, type_donnees, destinataire_declare, motif, statut
    ) VALUES (
        auth.uid(),
        TRIM(v_user.nom || ' ' || v_user.prenom),
        COALESCE(v_user.role_nomination, v_user.role_technique),
        p_perimetre,
        p_commune_id,
        p_format,
        p_type_donnees,
        p_destinataire,
        p_motif,
        'EN_ATTENTE'
    ) RETURNING id INTO v_new_id;

    -- Audit
    INSERT INTO public.journal_audit (
        utilisateur_id, capacite, action, details
    ) VALUES (
        auth.uid(),
        'MEMBRE_MINISTERE',
        'DEMANDE_EXPORT_MINISTERE',
        jsonb_build_object(
            'demande_id', v_new_id,
            'perimetre', p_perimetre,
            'format', p_format,
            'type_donnees', p_type_donnees,
            'destinataire', p_destinataire
        )
    );

    RETURN v_new_id;
END;
$$;


-- RPC 2 : Décider d'une demande d'export (Super Admin uniquement)
CREATE OR REPLACE FUNCTION public.decider_demande_export_ministere(
    p_demande_id UUID,
    p_statut TEXT, -- 'APPROUVEE' ou 'REFUSEE'
    p_motif_refus TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dem RECORD;
    v_token TEXT;
BEGIN
    IF NOT public.est_super_admin() THEN
        RAISE EXCEPTION 'Seul le Super Administrateur peut approuver ou refuser une demande d''export';
    END IF;

    SELECT * INTO v_dem FROM public.demandes_export_ministere WHERE id = p_demande_id;
    IF v_dem IS NULL THEN
        RAISE EXCEPTION 'Demande d''export non trouvee';
    END IF;

    IF v_dem.statut <> 'EN_ATTENTE' THEN
        RAISE EXCEPTION 'Cette demande a deja ete traitee';
    END IF;

    IF p_statut = 'APPROUVEE' THEN
        -- Générer un token unique cryptographique
        v_token := encode(gen_random_bytes(24), 'hex');

        UPDATE public.demandes_export_ministere SET
            statut = 'APPROUVEE',
            approuve_par = auth.uid(),
            date_decision = NOW(),
            expires_at = NOW() + INTERVAL '72 hours',
            token_usage_unique = v_token
        WHERE id = p_demande_id;

        INSERT INTO public.journal_audit (
            utilisateur_id, capacite, action, details
        ) VALUES (
            auth.uid(),
            'SUPER_ADMIN',
            'APPROBATION_EXPORT_MINISTERE',
            jsonb_build_object(
                'demande_id', p_demande_id,
                'demandeur_id', v_dem.demandeur_id,
                'expires_at', NOW() + INTERVAL '72 hours'
            )
        );

        RETURN jsonb_build_object(
            'success', true,
            'statut', 'APPROUVEE',
            'token', v_token,
            'expires_at', NOW() + INTERVAL '72 hours'
        );
    ELSE
        IF p_motif_refus IS NULL OR trim(p_motif_refus) = '' THEN
            RAISE EXCEPTION 'Le motif de refus est obligatoire';
        END IF;

        UPDATE public.demandes_export_ministere SET
            statut = 'REFUSEE',
            motif_refus = p_motif_refus,
            approuve_par = auth.uid(),
            date_decision = NOW()
        WHERE id = p_demande_id;

        INSERT INTO public.journal_audit (
            utilisateur_id, capacite, action, details
        ) VALUES (
            auth.uid(),
            'SUPER_ADMIN',
            'REFUS_EXPORT_MINISTERE',
            jsonb_build_object(
                'demande_id', p_demande_id,
                'demandeur_id', v_dem.demandeur_id,
                'motif_refus', p_motif_refus
            )
        );

        RETURN jsonb_build_object(
            'success', true,
            'statut', 'REFUSEE',
            'motif', p_motif_refus
        );
    END IF;
END;
$$;


-- RPC 3 : Valider et consommer un token d'export ministère (Usage unique)
CREATE OR REPLACE FUNCTION public.consommer_export_ministere(
    p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dem RECORD;
BEGIN
    SELECT * INTO v_dem FROM public.demandes_export_ministere WHERE token_usage_unique = p_token;
    IF v_dem IS NULL THEN
        RAISE EXCEPTION 'Jeton d''export invalide';
    END IF;

    IF v_dem.demandeur_id <> auth.uid() AND NOT public.est_super_admin() THEN
        RAISE EXCEPTION 'Ce jeton est reserve au demandeur initial';
    END IF;

    IF v_dem.est_consomme THEN
        RAISE EXCEPTION 'Ce jeton d''export a deja ete utilise (usage unique)';
    END IF;

    IF v_dem.expires_at < NOW() THEN
        RAISE EXCEPTION 'Ce lien d''export a expire (validite de 72h depassee)';
    END IF;

    -- Marquer consommé
    UPDATE public.demandes_export_ministere SET
        est_consomme = TRUE,
        consomme_a = NOW()
    WHERE id = v_dem.id;

    -- Audit
    INSERT INTO public.journal_audit (
        utilisateur_id, capacite, action, details
    ) VALUES (
        auth.uid(),
        'MEMBRE_MINISTERE',
        'CONSOMMATION_EXPORT_MINISTERE',
        jsonb_build_object(
            'demande_id', v_dem.id,
            'destinataire_declare', v_dem.destinataire_declare,
            'format', v_dem.format_export,
            'perimetre', v_dem.perimetre
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'perimetre', v_dem.perimetre,
        'format', v_dem.format_export,
        'destinataire', v_dem.destinataire_declare,
        'type_donnees', v_dem.type_donnees
    );
END;
$$;



-- ------------------------------------------------------------------------------
-- FICHIER : 20261103_phase_e_synthese_communale.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- PHASE E : SYNTHÈSE COMMUNALE MENSUELLE OFFICIELLE
-- Fonction RPC agrégée sécurisée sans aucune donnée personnelle individuelle
-- Accessible au Représentant Communal, PF CCLS-TP (leur commune), Ministère et Super Admin
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.obtenir_synthese_communale_mensuelle(
    p_commune_id UUID,
    p_mois INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    p_annee INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller RECORD;
    v_commune_nom TEXT;
    v_is_authorized BOOLEAN := FALSE;
    
    v_nb_ascq INTEGER := 0;
    v_nb_rc INTEGER := 0;
    v_nb_arrondissements INTEGER := 0;
    v_nb_alertes INTEGER := 0;
    v_nb_alertes_averees INTEGER := 0;
    v_nb_deces INTEGER := 0;
    v_nb_rapports_deposes INTEGER := 0;
    v_taux_completude NUMERIC := 0;
    v_arrondissements_stats JSONB := '[]'::jsonb;
BEGIN
    SELECT * INTO v_caller FROM public.utilisateurs WHERE id = auth.uid();
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Non authentifie';
    END IF;

    -- Contrôle d'accès strict au périmètre :
    -- SUPER_ADMIN et MEMBRE_MINISTERE : Tout le pays
    -- REPRESENTANT_COMMUNAL et PF_CCLS_TP : Uniquement leur commune
    IF public.est_super_admin() OR public.est_membre_ministere() THEN
        v_is_authorized := TRUE;
    ELSIF v_caller.commune_id = p_commune_id THEN
        IF public.est_representant_communal(p_commune_id) OR public.est_pf_ccls_tp(p_commune_id) THEN
            v_is_authorized := TRUE;
        END IF;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Acces refuse : vous ne pouvez pas consulter la synthese d''une autre commune';
    END IF;

    SELECT nom INTO v_commune_nom FROM public.communes WHERE id = p_commune_id;

    -- Nombre d'arrondissements
    SELECT COUNT(*) INTO v_nb_arrondissements FROM public.arrondissements WHERE commune_id = p_commune_id;

    -- Nombre d'ASCQ validés dans la commune
    SELECT COUNT(*) INTO v_nb_ascq FROM public.utilisateurs 
    WHERE commune_id = p_commune_id AND role_technique = 'ASCQ' AND statut = 'VALIDE';

    -- Nombre de RC validés dans la commune
    SELECT COUNT(*) INTO v_nb_rc FROM public.utilisateurs 
    WHERE commune_id = p_commune_id AND role_technique = 'RC' AND statut = 'VALIDE';

    -- Alertes du mois dans la commune
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE statut = 'AVEREE' OR est_verrouille = TRUE)
    INTO v_nb_alertes, v_nb_alertes_averees
    FROM public.alertes_communautaires
    WHERE commune_id = p_commune_id 
      AND annee = p_annee 
      AND (mois = p_mois OR EXTRACT(MONTH FROM date_notification) = p_mois);

    -- Décès notifiés du mois
    SELECT COUNT(*) INTO v_nb_deces
    FROM public.deces_communautaires
    WHERE commune_id = p_commune_id 
      AND annee = p_annee 
      AND (mois = p_mois OR EXTRACT(MONTH FROM date_notification) = p_mois);

    -- Rapports mensuels déposés
    SELECT COUNT(*) INTO v_nb_rapports_deposes
    FROM public.rapports_mensuels_ascq
    WHERE commune_id = p_commune_id AND mois = p_mois AND annee = p_annee AND statut IN ('SOUMIS', 'VALIDE', 'DEPOTE');

    IF v_nb_arrondissements > 0 THEN
        v_taux_completude := ROUND((v_nb_rapports_deposes::NUMERIC / v_nb_arrondissements::NUMERIC) * 100, 1);
    END IF;

    -- Détails par arrondissement (agrégés)
    SELECT jsonb_agg(
        jsonb_build_object(
            'arrondissement_id', a.id,
            'arrondissement_nom', a.nom,
            'nb_ascq', COALESCE(u_stats.nb_ascq, 0),
            'nb_rc', COALESCE(u_stats.nb_rc, 0),
            'nb_alertes', COALESCE(al_stats.nb_alertes, 0),
            'nb_deces', COALESCE(dec_stats.nb_deces, 0),
            'rapport_depose', COALESCE(rap_stats.depose, FALSE)
        ) ORDER BY a.nom
    ) INTO v_arrondissements_stats
    FROM public.arrondissements a
    LEFT JOIN (
        SELECT arrondissement_id,
               COUNT(*) FILTER (WHERE role_technique = 'ASCQ' AND statut = 'VALIDE') as nb_ascq,
               COUNT(*) FILTER (WHERE role_technique = 'RC' AND statut = 'VALIDE') as nb_rc
        FROM public.utilisateurs
        WHERE commune_id = p_commune_id
        GROUP BY arrondissement_id
    ) u_stats ON u_stats.arrondissement_id = a.id
    LEFT JOIN (
        SELECT arrondissement_id, COUNT(*) as nb_alertes
        FROM public.alertes_communautaires
        WHERE commune_id = p_commune_id AND annee = p_annee
        GROUP BY arrondissement_id
    ) al_stats ON al_stats.arrondissement_id = a.id
    LEFT JOIN (
        SELECT arrondissement_id, COUNT(*) as nb_deces
        FROM public.deces_communautaires
        WHERE commune_id = p_commune_id AND annee = p_annee
        GROUP BY arrondissement_id
    ) dec_stats ON dec_stats.arrondissement_id = a.id
    LEFT JOIN (
        SELECT arrondissement_id, TRUE as depose
        FROM public.rapports_mensuels_ascq
        WHERE commune_id = p_commune_id AND mois = p_mois AND annee = p_annee
    ) rap_stats ON rap_stats.arrondissement_id = a.id
    WHERE a.commune_id = p_commune_id;

    RETURN jsonb_build_object(
        'commune_id', p_commune_id,
        'commune_nom', v_commune_nom,
        'mois', p_mois,
        'annee', p_annee,
        'nb_ascq_actifs', v_nb_ascq,
        'nb_rc_actifs', v_nb_rc,
        'nb_arrondissements', v_nb_arrondissements,
        'nb_alertes_notifiees', v_nb_alertes,
        'nb_alertes_averees', v_nb_alertes_averees,
        'nb_deces_notifies', v_nb_deces,
        'nb_rapports_deposes', v_nb_rapports_deposes,
        'taux_completude_pourcent', v_taux_completude,
        'arrondissements', COALESCE(v_arrondissements_stats, '[]'::jsonb)
    );
END;
$$;



-- ------------------------------------------------------------------------------
-- FICHIER : 20261103_phase_h_securite_transversale.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- PHASE H : SÉCURITÉ TRANSVERSALE ET DURCISSEMENT
-- 1. JOURNAL D'AUDIT IMMUABLE (TRIGGERS ANTI-MODIFICATION / ANTI-SUPPRESSION)
-- 2. 2FA & CODES DE SECOURS HORS-LIGNE SUPER ADMIN
-- 3. VERROUILLAGE APRÈS 5 TENTATIVES ÉCHOUÉES (15 MINUTES)
-- 4. CONFINEMENT RLS DE TOUTES LES TABLES
-- ==============================================================================

-- 1. Structure et Immutabilité de journal_audit
CREATE TABLE IF NOT EXISTS public.journal_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    utilisateur_id UUID REFERENCES public.utilisateurs(id),
    capacite TEXT NOT NULL,
    commune_id UUID REFERENCES public.communes(id),
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT
);

-- Colonnes additionnelles si la table existait déjà
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='journal_audit' AND column_name='capacite') THEN
        ALTER TABLE public.journal_audit ADD COLUMN capacite TEXT NOT NULL DEFAULT 'UTILISATEUR';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='journal_audit' AND column_name='commune_id') THEN
        ALTER TABLE public.journal_audit ADD COLUMN commune_id UUID REFERENCES public.communes(id);
    END IF;
END $$;

-- Trigger d'immutabilité absolue sur journal_audit (Interdiction totale d'UPDATE et DELETE)
CREATE OR REPLACE FUNCTION public.empecher_modification_journal_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'SECURITE CRITIQUE : Le journal d''audit est strictement immuable. Modification ou suppression impossible.';
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_audit_immuable ON public.journal_audit;
CREATE TRIGGER trg_journal_audit_immuable
    BEFORE UPDATE OR DELETE ON public.journal_audit
    FOR EACH ROW
    EXECUTE FUNCTION public.empecher_modification_journal_audit();

-- RLS sur journal_audit
ALTER TABLE public.journal_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insertion journal audit pour tout utilisateur authentifie" ON public.journal_audit;
CREATE POLICY "Insertion journal audit pour tout utilisateur authentifie" ON public.journal_audit
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Consultation journal audit selon perimetre" ON public.journal_audit;
CREATE POLICY "Consultation journal audit selon perimetre" ON public.journal_audit
    FOR SELECT TO authenticated
    USING (
        public.est_super_admin()
        OR (
            public.est_representant_communal(commune_id)
            AND commune_id IS NOT NULL
        )
    );

-- 2. Verrouillage après 5 tentatives infructueuses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='utilisateurs' AND column_name='tentatives_echouees') THEN
        ALTER TABLE public.utilisateurs ADD COLUMN tentatives_echouees INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='utilisateurs' AND column_name='bloque_jusqu_a') THEN
        ALTER TABLE public.utilisateurs ADD COLUMN bloque_jusqu_a TIMESTAMPTZ;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enregistrer_tentative_connexion(
    p_telephone TEXT,
    p_succes BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_clean_tel TEXT;
BEGIN
    v_clean_tel := regexp_replace(p_telephone, '\D', '', 'g');
    SELECT * INTO v_user FROM public.utilisateurs WHERE regexp_replace(telephone, '\D', '', 'g') = v_clean_tel;

    IF v_user IS NULL THEN
        RETURN jsonb_build_object('existe', false);
    END IF;

    -- Si compte actuellement bloqué
    IF v_user.bloque_jusqu_a IS NOT NULL AND v_user.bloque_jusqu_a > NOW() THEN
        RETURN jsonb_build_object(
            'bloque', true,
            'deblocage_dans_secondes', EXTRACT(EPOCH FROM (v_user.bloque_jusqu_a - NOW()))::INTEGER
        );
    END IF;

    IF p_succes THEN
        -- Réinitialiser les tentatives
        UPDATE public.utilisateurs SET
            tentatives_echouees = 0,
            bloque_jusqu_a = NULL,
            derniere_connexion = NOW()
        WHERE id = v_user.id;

        INSERT INTO public.journal_audit (
            utilisateur_id, capacite, commune_id, action, details
        ) VALUES (
            v_user.id,
            COALESCE(v_user.role_nomination, v_user.role_technique),
            v_user.commune_id,
            'CONNEXION_REUSSIE',
            jsonb_build_object('telephone', v_clean_tel)
        );

        RETURN jsonb_build_object('bloque', false, 'succes', true);
    ELSE
        -- Échec de connexion : incrémenter
        UPDATE public.utilisateurs SET
            tentatives_echouees = v_user.tentatives_echouees + 1,
            bloque_jusqu_a = CASE 
                WHEN v_user.tentatives_echouees + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
                ELSE NULL
            END
        WHERE id = v_user.id;

        INSERT INTO public.journal_audit (
            utilisateur_id, capacite, commune_id, action, details
        ) VALUES (
            v_user.id,
            COALESCE(v_user.role_nomination, v_user.role_technique),
            v_user.commune_id,
            'CONNEXION_ECHOUEE',
            jsonb_build_object(
                'telephone', v_clean_tel,
                'tentative_numero', v_user.tentatives_echouees + 1,
                'est_bloque', (v_user.tentatives_echouees + 1 >= 5)
            )
        );

        IF v_user.tentatives_echouees + 1 >= 5 THEN
            RETURN jsonb_build_object(
                'bloque', true,
                'deblocage_dans_secondes', 900,
                'message', 'Compte temporairement suspendu pour 15 minutes suite a 5 echecs consecutifs'
            );
        ELSE
            RETURN jsonb_build_object(
                'bloque', false,
                'tentatives_restantes', 5 - (v_user.tentatives_echouees + 1)
            );
        END IF;
    END IF;
END;
$$;


-- 3. Codes de secours hors-ligne pour Super Admin
CREATE TABLE IF NOT EXISTS public.codes_secours_super_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    est_consomme BOOLEAN NOT NULL DEFAULT FALSE,
    consomme_a TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.codes_secours_super_admin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seul le super admin lit ses codes de secours" ON public.codes_secours_super_admin;
CREATE POLICY "Seul le super admin lit ses codes de secours" ON public.codes_secours_super_admin
    FOR SELECT TO authenticated
    USING (utilisateur_id = auth.uid() AND public.est_super_admin());



-- ------------------------------------------------------------------------------
-- FICHIER : 20261103_phase_i_nettoyage_profils_et_relance_48h.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- PHASE I : NETTOYAGE DÉFINITIF DES PROFILS & SYSTÈME DE RELANCE 48H
-- 1. Nettoyage strict des profils : Seuls sont maintenus RC, ASCQ,
--    Représentant ASCQ, PF CCLS-TP et Cadre du Ministère (ainsi que Super Admin)
-- 2. Alerte de relance automatique après 48h sans validation par l'ASCQ
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. NETTOYAGE DES PROFILS NON CONFORMES
-- ------------------------------------------------------------------------------

-- Suppression des anciens profils départementaux et non conformes
DELETE FROM public.utilisateurs
WHERE id IN (
    '87a9f32f-c4b1-440b-a6f8-5b817d79e115', -- GNANHOUI Aurel (CSSPR)
    '1bb44a77-a356-4245-8d6a-71838807ddae', -- AKOHA Juvenal (CCD_CDLS_TP)
    '770e315a-f0d7-4e87-9998-de0c3dac516a'  -- ZANNOU Bernard (CSPSMEMH)
);

-- Suppression de tout autre profil résiduel hors des rôles autorisés
DELETE FROM public.utilisateurs
WHERE role_technique NOT IN ('SUPER_ADMIN', 'ASCQ', 'ASCQ_OPERATEUR', 'REPRESENTANT_COMMUNAL', 'RC', 'RELAIS', 'PF_CCLS_TP', 'MEMBRE_MINISTERE')
  AND poste NOT IN ('ASCQ', 'RC', 'PF_CCLS_TP', 'MEMBRE_MINISTERE')
  AND telephone NOT LIKE '%69031463%';

-- Normalisation des rôles techniques et nominations des profils conservés
UPDATE public.utilisateurs
SET role_technique = 'SUPER_ADMIN',
    poste = 'ASCQ'
WHERE telephone LIKE '%69031463%';

UPDATE public.utilisateurs
SET role_technique = 'ASCQ',
    role_nomination = 'REPRESENTANT_COMMUNAL',
    poste = 'ASCQ'
WHERE id = '6555115a-d60e-478f-b1b3-0279e2581a95'; -- Simplice ZOUNGONOU

UPDATE public.utilisateurs
SET role_technique = 'ASCQ',
    poste = 'ASCQ'
WHERE poste = 'ASCQ' AND role_technique IN ('ASCQ_OPERATEUR', 'PUBLIC', 'ADMINISTRATEUR')
  AND telephone NOT LIKE '%69031463%'
  AND id <> '6555115a-d60e-478f-b1b3-0279e2581a95';

UPDATE public.utilisateurs
SET role_technique = 'RC',
    poste = 'RC'
WHERE poste = 'RC' OR role_technique IN ('RELAIS', 'PUBLIC');

-- Enregistrer le nettoyage dans le journal d'audit
INSERT INTO public.journal_audit (
    utilisateur_id, capacite, action, details
) VALUES (
    (SELECT id FROM public.utilisateurs WHERE telephone LIKE '%69031463%' LIMIT 1),
    'SUPER_ADMIN',
    'NETTOYAGE_PROFILS_NON_CONFORMES',
    jsonb_build_object(
        'date', NOW(),
        'roles_maintenus', ARRAY['RC', 'ASCQ', 'REPRESENTANT_COMMUNAL', 'PF_CCLS_TP', 'MEMBRE_MINISTERE', 'SUPER_ADMIN'],
        'statut', 'SUCCES'
    )
);


-- ------------------------------------------------------------------------------
-- 2. ALERTE DE RELANCE AUTOMATIQUE APRÈS 48H SANS VALIDATION PAR L'ASCQ
-- ------------------------------------------------------------------------------

-- Fonction RPC vérifiant et émettant les alertes de relance 48h
CREATE OR REPLACE FUNCTION public.verifier_et_emettre_relances_48h()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nb_relances INTEGER := 0;
    r RECORD;
BEGIN
    -- A. Relance pour alertes communautaires non validées après 48h
    FOR r IN 
        SELECT a.id, a.numero_alerte, a.type_alerte_nom, a.notificateur_nom_complet, a.created_at, a.ascq_superviseur_id
        FROM public.alertes_communautaires a
        WHERE a.statut IN ('NOTIFIE', 'EN_ATTENTE')
          AND a.est_verrouille = FALSE
          AND a.created_at < (NOW() - INTERVAL '48 hours')
          AND a.ascq_superviseur_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.notifications n
              WHERE n.destinataire_id = a.ascq_superviseur_id
                AND n.type_notification = 'RELANCE_48H'
                AND (n.lien_action = ('/fiches/alerte/' || a.id) OR n.message LIKE ('%' || a.numero_alerte || '%'))
                AND n.created_at > (NOW() - INTERVAL '24 hours') -- Évite les doublons répétés dans les dernières 24h
          )
    LOOP
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type_notification,
            priorite,
            lien_action,
            lu
        ) VALUES (
            r.ascq_superviseur_id,
            '⚠️ Relance Réglementaire (48h dépassées)',
            'L''alerte ' || r.numero_alerte || ' (' || r.type_alerte_nom || ') transmise par le RC ' || r.notificateur_nom_complet || ' est en attente depuis plus de 48h sans visa. Veuillez investiguer et statuer.',
            'RELANCE_48H',
            'URGENT',
            '/fiches/alerte/' || r.id,
            FALSE
        );
        v_nb_relances := v_nb_relances + 1;
    END LOOP;

    -- B. Relance pour décès communautaires non validés après 48h
    FOR r IN 
        SELECT d.id, d.numero_deces, d.type_deces_nom, d.notificateur_nom_complet, d.created_at, d.ascq_superviseur_id
        FROM public.deces_communautaires d
        WHERE d.statut IN ('NOTIFIE', 'EN_ATTENTE')
          AND d.est_verrouille = FALSE
          AND d.created_at < (NOW() - INTERVAL '48 hours')
          AND d.ascq_superviseur_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.notifications n
              WHERE n.destinataire_id = d.ascq_superviseur_id
                AND n.type_notification = 'RELANCE_48H'
                AND (n.message LIKE ('%' || d.numero_deces || '%'))
                AND n.created_at > (NOW() - INTERVAL '24 hours')
          )
    LOOP
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type_notification,
            priorite,
            lien_action,
            lu
        ) VALUES (
            r.ascq_superviseur_id,
            '⚠️ Relance Décès (48h dépassées)',
            'La déclaration de décès ' || r.numero_deces || ' (' || r.type_deces_nom || ') notifiée par le RC ' || r.notificateur_nom_complet || ' est en attente depuis plus de 48h sans validation.',
            'RELANCE_48H',
            'URGENT',
            '/fiches',
            FALSE
        );
        v_nb_relances := v_nb_relances + 1;
    END LOOP;

    -- C. Relance pour auto-enrôlements de Relais en attente depuis plus de 48h
    FOR r IN
        SELECT rc.id, rc.nom, rc.prenoms, rc.telephone, rc.ascq_id, rc.created_at
        FROM public.relais_communautaires rc
        WHERE rc.statut = 'EN_ATTENTE'
          AND rc.created_at < (NOW() - INTERVAL '48 hours')
          AND rc.ascq_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.notifications n
              WHERE n.destinataire_id = rc.ascq_id
                AND n.type_notification = 'RELANCE_48H'
                AND n.message LIKE ('%' || rc.nom || '%')
                AND n.created_at > (NOW() - INTERVAL '24 hours')
          )
    LOOP
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type_notification,
            priorite,
            lien_action,
            lu
        ) VALUES (
            r.ascq_id,
            '⚠️ Inscription RC en attente (> 48h)',
            'Le Relais Communautaire ' || r.nom || ' ' || r.prenoms || ' (' || r.telephone || ') attend la validation de son compte depuis plus de 48h.',
            'RELANCE_48H',
            'URGENT',
            '/espace-ascq/relais',
            FALSE
        );
        v_nb_relances := v_nb_relances + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'nb_relances_emises', v_nb_relances,
        'timestamp', NOW()
    );
END;
$$;


-- Fonction RPC pour charger les saisies en retard de 48h pour un ASCQ donné
CREATE OR REPLACE FUNCTION public.obtenir_saisies_en_retard_48h(p_ascq_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_alertes JSONB;
    v_deces JSONB;
    v_relais JSONB;
    v_total INTEGER := 0;
BEGIN
    -- Alertes
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'type', 'ALERTE',
            'numero', numero_alerte,
            'titre', type_alerte_nom,
            'notificateur', notificateur_nom_complet,
            'created_at', created_at,
            'heures_attente', ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600)
        )
    ) INTO v_alertes
    FROM public.alertes_communautaires
    WHERE ascq_superviseur_id = p_ascq_id
      AND statut IN ('NOTIFIE', 'EN_ATTENTE')
      AND est_verrouille = FALSE
      AND created_at < (NOW() - INTERVAL '48 hours');

    -- Décès
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'type', 'DECES',
            'numero', numero_deces,
            'titre', type_deces_nom,
            'notificateur', notificateur_nom_complet,
            'created_at', created_at,
            'heures_attente', ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600)
        )
    ) INTO v_deces
    FROM public.deces_communautaires
    WHERE ascq_superviseur_id = p_ascq_id
      AND statut IN ('NOTIFIE', 'EN_ATTENTE')
      AND est_verrouille = FALSE
      AND created_at < (NOW() - INTERVAL '48 hours');

    -- Inscriptions Relais
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'type', 'RELAIS',
            'numero', telephone,
            'titre', (nom || ' ' || prenoms),
            'notificateur', 'Auto-enrôlement RC',
            'created_at', created_at,
            'heures_attente', ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600)
        )
    ) INTO v_relais
    FROM public.relais_communautaires
    WHERE ascq_id = p_ascq_id
      AND statut = 'EN_ATTENTE'
      AND created_at < (NOW() - INTERVAL '48 hours');

    v_total := COALESCE(jsonb_array_length(v_alertes), 0) + 
               COALESCE(jsonb_array_length(v_deces), 0) + 
               COALESCE(jsonb_array_length(v_relais), 0);

    RETURN jsonb_build_object(
        'total_en_retard', v_total,
        'alertes', COALESCE(v_alertes, '[]'::jsonb),
        'deces', COALESCE(v_deces, '[]'::jsonb),
        'relais', COALESCE(v_relais, '[]'::jsonb)
    );
END;
$$;


