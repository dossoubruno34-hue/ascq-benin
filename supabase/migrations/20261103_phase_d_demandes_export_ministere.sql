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
