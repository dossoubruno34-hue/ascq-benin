-- ====================================================================
-- ATTRIBUTION DES DROITS SUPER ADMINISTRATEUR NATIONAL À BRUNO DOSSOU
-- ET OPTIMISATION DE LA POLITIQUE DE SÉCURITÉ SANS RÉCURSION
-- ====================================================================

-- 1. Correction de la fonction est_administrateur pour éviter toute récursion RLS
CREATE OR REPLACE FUNCTION public.est_administrateur()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role_technique INTO v_role
  FROM public.utilisateurs
  WHERE id = auth.uid();

  RETURN v_role IN ('ADMINISTRATEUR', 'SUPER_ADMIN', 'ADMIN_DEPARTEMENTAL', 'ADMIN_COMMUNAL', 'GESTIONNAIRE_PERIMETRE');
END;
$$;

-- 2. Sécurisation de la politique de lecture sur utilisateurs (évite le blocage récursif 42P17)
DROP POLICY IF EXISTS "Lecture utilisateurs securisee" ON public.utilisateurs;

CREATE POLICY "Lecture utilisateurs securisee" ON public.utilisateurs
    FOR SELECT USING (
        auth.uid() = id OR
        statut_compte = 'VALIDE'
    );

-- 3. Promotion de Bruno DOSSOU en SUPER_ADMIN et validation de son compte
UPDATE public.utilisateurs
SET 
    role_technique = 'SUPER_ADMIN',
    statut_compte = 'VALIDE',
    date_validation = NOW()
WHERE 
    telephone IN ('+229044485650', '+2290197000000')
    OR id IN ('a1f59c05-476a-411a-9403-83ba8b751ee9', 'd0936bfc-9152-4a94-b236-3027add4aab6')
    OR nom ILIKE '%DOSSOU%';

-- 4. Vérification du résultat
SELECT id, telephone, nom, prenoms, role_technique, statut_compte 
FROM public.utilisateurs 
WHERE nom ILIKE '%DOSSOU%';
