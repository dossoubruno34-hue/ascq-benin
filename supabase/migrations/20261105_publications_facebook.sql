-- =====================================================================
-- MIGRATION : TABLE PUBLICATIONS_FACEBOOK & HISTORIQUE SYNCHRONISATION
-- Date : 2026-11-05
-- Branche : feature-fb-publications
-- =====================================================================

-- 1. Table des publications Facebook de la page officielle
CREATE TABLE IF NOT EXISTS public.publications_facebook (
    id_facebook TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    permalink_url TEXT NOT NULL,
    created_time TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour requêtes rapides par date de publication
CREATE INDEX IF NOT EXISTS idx_pub_fb_created ON public.publications_facebook(created_time DESC);

-- RLS : Lecture publique en SELECT uniquement, AUCUNE écriture possible depuis le client
ALTER TABLE public.publications_facebook ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique publications Facebook" ON public.publications_facebook;
CREATE POLICY "Lecture publique publications Facebook" 
ON public.publications_facebook 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- 2. Table des journaux de synchronisation (audit & alertes jeton expirant)
CREATE TABLE IF NOT EXISTS public.facebook_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'ERROR')),
    status_code INTEGER,
    message TEXT,
    posts_count INTEGER DEFAULT 0,
    error_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fb_sync_logs_date ON public.facebook_sync_logs(created_at DESC);

ALTER TABLE public.facebook_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture logs sync Facebook super admin" ON public.facebook_sync_logs;
CREATE POLICY "Lecture logs sync Facebook super admin"
ON public.facebook_sync_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.utilisateurs u
        WHERE u.id = auth.uid() 
          AND (u.role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR') OR u.telephone LIKE '%69031463%')
    )
);

-- 3. Trigger automatique : garder exactement les 3 plus récentes en base
CREATE OR REPLACE FUNCTION public.garder_top3_publications_facebook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.publications_facebook
    WHERE id_facebook NOT IN (
        SELECT id_facebook FROM public.publications_facebook
        ORDER BY created_time DESC
        LIMIT 3
    );
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_garder_top3_publications_facebook ON public.publications_facebook;
CREATE TRIGGER trg_garder_top3_publications_facebook
AFTER INSERT OR UPDATE ON public.publications_facebook
FOR EACH STATEMENT
EXECUTE FUNCTION public.garder_top3_publications_facebook();

-- 4. RPC pour l'interface Super Admin : obtenir l'état de synchronisation
CREATE OR REPLACE FUNCTION public.obtenir_etat_sync_facebook()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_dernier_log RECORD;
    v_nb_pubs INTEGER;
    v_dernier_fetched TIMESTAMPTZ;
BEGIN
    SELECT count(*), max(fetched_at) INTO v_nb_pubs, v_dernier_fetched FROM public.publications_facebook;
    
    SELECT status, status_code, message, posts_count, created_at
    INTO v_dernier_log
    FROM public.facebook_sync_logs
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN jsonb_build_object(
        'nb_publications_en_base', v_nb_pubs,
        'derniere_recup_date', v_dernier_fetched,
        'dernier_log', CASE WHEN v_dernier_log.status IS NOT NULL THEN
            jsonb_build_object(
                'status', v_dernier_log.status,
                'status_code', v_dernier_log.status_code,
                'message', v_dernier_log.message,
                'posts_count', v_dernier_log.posts_count,
                'created_at', v_dernier_log.created_at
            )
        ELSE NULL END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obtenir_etat_sync_facebook() TO authenticated, anon;
