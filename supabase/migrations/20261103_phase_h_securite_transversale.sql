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
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='utilisateurs' AND column_name='derniere_connexion') THEN
        ALTER TABLE public.utilisateurs ADD COLUMN derniere_connexion TIMESTAMPTZ;
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
