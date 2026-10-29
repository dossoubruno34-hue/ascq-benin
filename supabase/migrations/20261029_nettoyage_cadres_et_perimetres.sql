-- =====================================================================
-- MIGRATION : NETTOYAGE STRICT DES PÉRIMÈTRES & PROFILS DES CADRES NON-ASCQ
-- République du Bénin - Ministère de la Santé
-- =====================================================================

-- 1. Nettoyage des affectations erronées des Cadres Départementaux
-- Les cadres départementaux (ex: CCD_CDLS_TP, DDS, CSSPR, CSPSMEMH) ne sont rattachés
-- à aucun arrondissement ni structure de santé communale, mais à tout leur département.
UPDATE public.utilisateurs
SET arrondissement_id = NULL,
    second_arrondissement_id = NULL,
    commune_id = NULL,
    structure_sante_id = NULL,
    role_technique = 'CADRE_DEPARTEMENTAL'
WHERE (
    poste IN ('DDS', 'CCD_CDLS_TP', 'CSSPR', 'CSPSMEMH', 'CSPSMEH', 'CADRE_DEPARTEMENTAL')
    OR role_technique = 'CADRE_DEPARTEMENTAL'
  )
  AND telephone NOT ILIKE '%69031463%';

-- 2. Nettoyage des affectations des Cadres de Zone Sanitaire
UPDATE public.utilisateurs
SET arrondissement_id = NULL,
    second_arrondissement_id = NULL,
    structure_sante_id = NULL,
    role_technique = 'CADRE_ZONE_SANITAIRE'
WHERE (
    poste IN ('MCZS', 'RCSE', 'C_RAMS', 'C-RAMS', 'CADRE_ZONE_SANITAIRE')
    OR role_technique = 'CADRE_ZONE_SANITAIRE'
  )
  AND telephone NOT ILIKE '%69031463%';

-- 3. Nettoyage des affectations des Cadres Nationaux
UPDATE public.utilisateurs
SET departement_id = NULL,
    zone_sanitaire_id = NULL,
    commune_id = NULL,
    arrondissement_id = NULL,
    second_arrondissement_id = NULL,
    structure_sante_id = NULL,
    role_technique = 'CADRE_NATIONAL'
WHERE (
    poste IN ('CADRE_NATIONAL', 'RESPONSABLE_NATIONAL', 'DIRECTEUR', 'MINISTRE', 'COORDINATEUR_NATIONAL')
    OR role_technique IN ('CADRE_NATIONAL', 'RESPONSABLE_NATIONAL')
  )
  AND telephone NOT ILIKE '%69031463%';

-- 4. Suppression des profils de terrain ASCQ orphelins pour tous les cadres hiérarchiques non-ASCQ
DELETE FROM public.ascq_profils
WHERE id IN (
  SELECT id FROM public.utilisateurs
  WHERE (
    poste IN ('DDS', 'CCD_CDLS_TP', 'CSSPR', 'CSPSMEMH', 'CSPSMEH', 'CADRE_DEPARTEMENTAL',
              'MCZS', 'RCSE', 'C_RAMS', 'C-RAMS', 'CADRE_ZONE_SANITAIRE',
              'MCC', 'PF_CCLS_TP', 'CADRE_COMMUNAL',
              'CADRE_NATIONAL', 'RESPONSABLE_NATIONAL')
    OR role_technique IN ('CADRE_DEPARTEMENTAL', 'CADRE_ZONE_SANITAIRE', 'CADRE_COMMUNAL', 'CADRE_NATIONAL')
  )
  AND telephone NOT ILIKE '%69031463%'
);

-- 5. Enrichissement de la fonction obtenir_mon_profil avec les rôles et périmètres complets
DROP FUNCTION IF EXISTS public.obtenir_mon_profil() CASCADE;

CREATE OR REPLACE FUNCTION public.obtenir_mon_profil()
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
    departement_id UUID,
    departement_nom TEXT,
    zone_sanitaire_id UUID,
    zone_sanitaire_nom TEXT,
    commune_id UUID,
    commune_nom TEXT,
    arrondissement_id UUID,
    arrondissement_nom TEXT,
    photo_url TEXT
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
    u.departement_id, 
    d.nom AS departement_nom,
    u.zone_sanitaire_id,
    z.nom AS zone_sanitaire_nom,
    u.commune_id,
    c.nom AS commune_nom,
    u.arrondissement_id,
    a.nom AS arrondissement_nom,
    u.photo_url
  FROM public.utilisateurs u
  LEFT JOIN public.departements d ON u.departement_id = d.id
  LEFT JOIN public.zones_sanitaires z ON u.zone_sanitaire_id = z.id
  LEFT JOIN public.communes c ON u.commune_id = c.id
  LEFT JOIN public.arrondissements a ON u.arrondissement_id = a.id
  WHERE u.id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.obtenir_mon_profil TO authenticated;
