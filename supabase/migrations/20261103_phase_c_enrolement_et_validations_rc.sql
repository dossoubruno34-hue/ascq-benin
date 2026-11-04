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
    WHERE user_id = p_rc_utilisateur_id OR id = p_rc_utilisateur_id
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
        statut_compte = p_statut,
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
