-- ====================================================================
-- ASCQ BÉNIN - NETTOYAGE INTÉGRAL DES ANCIENS COMPTES & DONNÉES DE TEST
-- Conserve UNIQUEMENT le compte réel actif de Bruno DOSSOU (+229044485650)
-- ====================================================================

-- 1. Correction définitive de la fonction est_administrateur (anti-boucle)
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

-- 2. Politiques RLS propres sans récursion
DROP POLICY IF EXISTS "Lecture utilisateurs securisee" ON public.utilisateurs;
CREATE POLICY "Lecture utilisateurs securisee" ON public.utilisateurs
    FOR SELECT USING (
        auth.uid() = id OR
        statut_compte = 'VALIDE'
    );

DROP POLICY IF EXISTS "Lecture profil ASCQ" ON public.ascq_profils;
CREATE POLICY "Lecture profil ASCQ" ON public.ascq_profils
    FOR SELECT USING (true);

-- 3. Bloc de nettoyage complet et sécurisé
DO $$
DECLARE
  v_mon_id UUID;
BEGIN
  -- Identifier l'ID du vrai compte actif de Bruno DOSSOU
  SELECT id INTO v_mon_id 
  FROM public.utilisateurs 
  WHERE telephone = '+229044485650' 
  LIMIT 1;

  IF v_mon_id IS NULL THEN
    RAISE EXCEPTION 'Compte actif avec le téléphone +229044485650 introuvable.';
  END IF;

  -- A. Nettoyer les tables dépendantes avec protection contre les tables absentes
  BEGIN
    DELETE FROM public.notifications WHERE destinataire_id != v_mon_id OR destinataire_id IS NULL;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.activites_demandees_ascq WHERE demandeur_id != v_mon_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.rapports_mensuels WHERE ascq_id != v_mon_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.suivis_relais WHERE ascq_id != v_mon_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.activites_menees WHERE ascq_id != v_mon_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.planning_activites WHERE ascq_id != v_mon_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.rapports_hebdomadaires WHERE ascq_id != v_mon_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.investigations_alertes WHERE investigateur_id != v_mon_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.deces_communautaires WHERE notificateur_id != v_mon_id AND (ascq_superviseur_id != v_mon_id OR ascq_superviseur_id IS NULL);
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.registre_alertes_rumeurs WHERE ascq_superviseur_id != v_mon_id OR ascq_superviseur_id IS NULL;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.alertes_communautaires WHERE notificateur_id != v_mon_id AND (ascq_superviseur_id != v_mon_id OR ascq_superviseur_id IS NULL);
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.requetes_administratives WHERE ascq_id != v_mon_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.permutations_ascq WHERE ascq_id != v_mon_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.relais_communautaires WHERE ascq_id != v_mon_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.ascq_profil_prive WHERE id != v_mon_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM public.ascq_profils WHERE id != v_mon_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Rompre d'éventuelles références de validation croisée
  UPDATE public.utilisateurs SET valide_par = NULL WHERE valide_par != v_mon_id;

  -- B. Supprimer les anciens utilisateurs dans public.utilisateurs
  DELETE FROM public.utilisateurs WHERE id != v_mon_id;

  -- C. Supprimer les anciens utilisateurs dans auth.users
  DELETE FROM auth.users WHERE id != v_mon_id;

  -- D. Confirmer le profil réel de Bruno DOSSOU : ASCQ de terrain + SUPER_ADMIN
  UPDATE public.utilisateurs
  SET 
      role_technique = 'SUPER_ADMIN',
      statut_compte = 'VALIDE',
      poste = 'ASCQ',
      date_validation = NOW()
  WHERE id = v_mon_id;

END $$;

-- 4. Affichage du résultat final (doit afficher UNIQUEMENT votre compte)
SELECT 
    id, 
    telephone, 
    nom, 
    prenoms, 
    poste, 
    role_technique, 
    statut_compte,
    created_at
FROM public.utilisateurs;
