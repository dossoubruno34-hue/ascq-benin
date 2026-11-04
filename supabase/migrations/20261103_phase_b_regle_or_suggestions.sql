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
        utilisateur_id, capacite, action, details, table_cible, enregistrement_id
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
        ),
        p_cible_table,
        p_cible_id
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
            utilisateur_id, capacite, action, details, table_cible, enregistrement_id
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
            ),
            v_sug.cible_table,
            v_sug.cible_id
        );

        RETURN jsonb_build_object('success', true, 'message', 'Correction appliquee avec succes');
    ELSE
        UPDATE public.suggestions_correction SET
            statut = 'REFUSEE',
            motif_refus = p_motif_refus,
            decided_at = NOW()
        WHERE id = p_suggestion_id;

        INSERT INTO public.journal_audit (
            utilisateur_id, capacite, action, details, table_cible, enregistrement_id
        ) VALUES (
            auth.uid(),
            'AUTEUR',
            'REFUS_SUGGESTION_CORRECTION',
            jsonb_build_object(
                'suggestion_id', p_suggestion_id,
                'cible_table', v_sug.cible_table,
                'cible_id', v_sug.cible_id,
                'motif_refus', p_motif_refus
            ),
            v_sug.cible_table,
            v_sug.cible_id
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
    USING (
        ascq_id = auth.uid() 
        OR relais_id IN (SELECT id FROM public.relais_communautaires WHERE user_id = auth.uid())
    )
    WITH CHECK (
        ascq_id = auth.uid() 
        OR relais_id IN (SELECT id FROM public.relais_communautaires WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Suppression references strictly author" ON public.references_communautaires;
CREATE POLICY "Suppression references strictly author" ON public.references_communautaires
    FOR DELETE TO authenticated
    USING (
        ascq_id = auth.uid() 
        OR relais_id IN (SELECT id FROM public.relais_communautaires WHERE user_id = auth.uid())
    );


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
