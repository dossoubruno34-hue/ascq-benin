-- =====================================================================
-- PHASE A : RÔLES ET PÉRIMÈTRES (REFONTE ACCÈS COMMUNE SANTÉCOM BÉNIN)
-- Version de référence : SUPER_ADMIN, MEMBRE_MINISTERE, PF_CCLS_TP, ASCQ, RC
-- Fonction cumulable : REPRESENTANT_COMMUNAL (attribuée à un ASCQ)
-- Suppression des profils et accès départementaux
-- =====================================================================

-- 0.0 Normalisation immédiate de journal_audit (sécurisation table_cible et colonnes étendues)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='journal_audit') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='journal_audit' AND column_name='table_cible') THEN
            ALTER TABLE public.journal_audit ALTER COLUMN table_cible DROP NOT NULL;
            ALTER TABLE public.journal_audit ALTER COLUMN table_cible SET DEFAULT 'SYSTEME';
        ELSE
            ALTER TABLE public.journal_audit ADD COLUMN table_cible TEXT DEFAULT 'SYSTEME';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='journal_audit' AND column_name='enregistrement_id') THEN
            ALTER TABLE public.journal_audit ALTER COLUMN enregistrement_id DROP NOT NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='journal_audit' AND column_name='capacite') THEN
            ALTER TABLE public.journal_audit ADD COLUMN capacite TEXT NOT NULL DEFAULT 'UTILISATEUR';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='journal_audit' AND column_name='commune_id') THEN
            ALTER TABLE public.journal_audit ADD COLUMN commune_id UUID REFERENCES public.communes(id);
        END IF;
    END IF;
END $$;

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

ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_statut_compte_check;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_statut_compte_check
    CHECK (statut_compte IN ('EN_ATTENTE', 'VALIDE', 'SUSPENDU', 'REJETE', 'INVALIDE'));

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
