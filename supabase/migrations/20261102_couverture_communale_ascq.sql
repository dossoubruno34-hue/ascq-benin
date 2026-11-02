-- =====================================================================
-- MIGRATION : FONCTION RPC COUVERTURE COMMUNALE DES ASCQ VALIDÉS
-- Plateforme ASCQ Bénin - Ministère de la Santé
-- Date : 2026-11-02
-- Objectif : Fournir au grand public la statistique anonymisée du nombre
-- d'ASCQ validés par commune (pour la carte d'accueil).
-- Aucune donnée personnelle (nom, téléphone, email) n'est exposée.
-- =====================================================================

DROP FUNCTION IF EXISTS public.obtenir_couverture_communale_ascq();

CREATE OR REPLACE FUNCTION public.obtenir_couverture_communale_ascq()
RETURNS TABLE (
    commune_id UUID,
    commune_nom TEXT,
    nombre_ascq BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        c.id AS commune_id,
        c.nom AS commune_nom,
        COUNT(u.id) AS nombre_ascq
    FROM public.communes c
    JOIN public.utilisateurs u ON u.commune_id = c.id
    WHERE u.poste = 'ASCQ'
      AND u.statut_compte = 'VALIDE'
    GROUP BY c.id, c.nom
    HAVING COUNT(u.id) > 0;
$$;

-- Permissions d'exécution publiques (anonyme et authentifié)
GRANT EXECUTE ON FUNCTION public.obtenir_couverture_communale_ascq() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.obtenir_couverture_communale_ascq() IS 
'Retourne le nombre d''ASCQ validés par commune pour la cartographie publique nationale. Aucune donnée nominative.';
