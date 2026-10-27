-- ====================================================================
-- CONFIGURATION DU COMPTE OFFICIEL SUPER ADMINISTRATEUR (0169031463)
-- & NETTOYAGE DE L'ANCIEN COMPTE DE TEST
-- Résolution de la récursion RLS et élévation Super Admin de Bruno DOSSOU
-- ====================================================================

-- ---------------------------------------------------------------------
-- 1. CORRECTION DÉFINITIVE DE LA RÉCURSION RLS SUR UTILISATEURS & PROFILS
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Lecture utilisateurs securisee" ON public.utilisateurs;
CREATE POLICY "Lecture utilisateurs securisee" ON public.utilisateurs
    FOR SELECT USING (
        auth.uid() = id OR statut_compte = 'VALIDE'
    );

DROP POLICY IF EXISTS "Mise a jour utilisateurs" ON public.utilisateurs;
CREATE POLICY "Mise a jour utilisateurs" ON public.utilisateurs
    FOR UPDATE USING (
        auth.uid() = id
    );

DROP POLICY IF EXISTS "Gestion profil ASCQ" ON public.ascq_profils;
CREATE POLICY "Gestion profil ASCQ" ON public.ascq_profils
    FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Lecture profil ASCQ" ON public.ascq_profils;
CREATE POLICY "Lecture profil ASCQ" ON public.ascq_profils
    FOR SELECT USING (true);


-- ---------------------------------------------------------------------
-- 2. BLOC D'EXÉCUTION INTELLIGENT : PROMOTION 0169031463 & NETTOYAGE ANCIEN COMPTE
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_new_id UUID;
    v_old_id UUID;
    v_dep_id UUID;
    v_com_id UUID;
    v_arr_id UUID;
    v_zs_id UUID;
BEGIN
    -- Récupération des IDs officiels de localisation (Zou > Ouinhi > Tohouès)
    SELECT id INTO v_dep_id FROM public.departements WHERE nom = 'ZOU' LIMIT 1;
    SELECT id INTO v_com_id FROM public.communes WHERE nom = 'OUINHI' AND departement_id = v_dep_id LIMIT 1;
    SELECT id INTO v_arr_id FROM public.arrondissements WHERE nom = 'TOHOUES' AND commune_id = v_com_id LIMIT 1;
    SELECT id INTO v_zs_id FROM public.zones_sanitaires WHERE nom ILIKE '%COVE-ZAGNANADO-OUINHI%' LIMIT 1;

    -- Recherche d'un compte déjà existant pour 0169031463 dans auth.users
    SELECT id INTO v_new_id 
    FROM auth.users 
    WHERE email LIKE '%69031463%' 
       OR (raw_user_meta_data->>'telephone') LIKE '%69031463%'
    ORDER BY created_at DESC 
    LIMIT 1;

    -- Recherche de l'ancien compte à nettoyer (*44485650*)
    SELECT id INTO v_old_id 
    FROM auth.users 
    WHERE email LIKE '%44485650%' 
       OR (raw_user_meta_data->>'telephone') LIKE '%44485650%'
    LIMIT 1;

    -- CAS A : Le compte 0169031463 a déjà été créé dans Auth
    IF v_new_id IS NOT NULL THEN
        RAISE NOTICE 'Compte 0169031463 trouvé dans auth.users (ID: %). Promotion en cours...', v_new_id;

        -- Insertion ou Mise à jour dans public.utilisateurs
        INSERT INTO public.utilisateurs (
            id, telephone, nom, prenoms, poste, role_technique, statut_compte,
            departement_id, commune_id, arrondissement_id, zone_sanitaire_id,
            date_validation, valide_par, created_at, updated_at
        ) VALUES (
            v_new_id, '+2290169031463', 'DOSSOU', 'BRUNO', 'ASCQ', 'SUPER_ADMIN', 'VALIDE',
            v_dep_id, v_com_id, v_arr_id, v_zs_id,
            NOW(), v_new_id, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            telephone = '+2290169031463',
            nom = 'DOSSOU',
            prenoms = 'BRUNO',
            poste = 'ASCQ',
            role_technique = 'SUPER_ADMIN',
            statut_compte = 'VALIDE',
            departement_id = v_dep_id,
            commune_id = v_com_id,
            arrondissement_id = v_arr_id,
            zone_sanitaire_id = v_zs_id,
            date_validation = NOW(),
            valide_par = v_new_id,
            updated_at = NOW();

        -- Profil ASCQ
        INSERT INTO public.ascq_profils (
            id, source_financement, nombre_rc, afficher_annuaire_public, cumul_deux_arrondissements
        ) VALUES (
            v_new_id, 'LLF', 5, true, false
        )
        ON CONFLICT (id) DO UPDATE SET
            source_financement = 'LLF',
            nombre_rc = 5,
            afficher_annuaire_public = true;

        -- Nettoyage de l'ancien compte si différent
        IF v_old_id IS NOT NULL AND v_old_id != v_new_id THEN
            RAISE NOTICE 'Suppression de l''ancien compte de test (ID: %)...', v_old_id;
            DELETE FROM public.ascq_profil_prive WHERE id = v_old_id;
            DELETE FROM public.ascq_profils WHERE id = v_old_id;
            DELETE FROM public.relais_communautaires WHERE ascq_id = v_old_id;
            DELETE FROM public.notifications WHERE destinataire_id = v_old_id;
            DELETE FROM public.utilisateurs WHERE id = v_old_id;
            DELETE FROM auth.users WHERE id = v_old_id;
            RAISE NOTICE 'Ancien compte supprimé avec succès.';
        END IF;

    -- CAS B : Le compte 0169031463 n'a pas encore été créé séparément, mais l'ancien compte existe
    ELSIF v_old_id IS NOT NULL THEN
        RAISE NOTICE 'Mise à jour directe de votre compte vers le numéro officiel 0169031463...';

        -- Mettre à jour les identifiants auth.users pour pouvoir se connecter immédiatement avec 0169031463
        UPDATE auth.users
        SET email = 'tel_0169031463@ascq.local',
            raw_user_meta_data = jsonb_set(
                COALESCE(raw_user_meta_data, '{}'::jsonb),
                '{telephone}',
                '"+2290169031463"'
            ),
            updated_at = NOW()
        WHERE id = v_old_id;

        -- Mettre à jour public.utilisateurs
        UPDATE public.utilisateurs
        SET telephone = '+2290169031463',
            nom = 'DOSSOU',
            prenoms = 'BRUNO',
            poste = 'ASCQ',
            role_technique = 'SUPER_ADMIN',
            statut_compte = 'VALIDE',
            departement_id = v_dep_id,
            commune_id = v_com_id,
            arrondissement_id = v_arr_id,
            zone_sanitaire_id = v_zs_id,
            date_validation = NOW(),
            valide_par = v_old_id,
            updated_at = NOW()
        WHERE id = v_old_id;

        -- Garantir profil ASCQ
        INSERT INTO public.ascq_profils (
            id, source_financement, nombre_rc, afficher_annuaire_public, cumul_deux_arrondissements
        ) VALUES (
            v_old_id, 'LLF', 5, true, false
        )
        ON CONFLICT (id) DO UPDATE SET
            source_financement = 'LLF',
            nombre_rc = 5,
            afficher_annuaire_public = true;

        RAISE NOTICE 'Compte mis à jour : vous pouvez désormais vous connecter directement avec 0169031463 et votre mot de passe habituel !';

    ELSE
        RAISE NOTICE 'Aucun compte trouvé pour 69031463 ni 44485650. Créez votre compte 0169031463 sur la page Inscription, il sera automatiquement Super Admin.';
    END IF;

END $$;


-- ---------------------------------------------------------------------
-- 3. RÈGLE D'ACTIVATION AUTOMATIQUE PERMANENTE POUR 0169031463
-- Si vous recréez un compte ou réinitialisez, il sera TOUJOURS Super Admin
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_garantir_super_admin_bruno()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.telephone LIKE '%69031463%' THEN
    NEW.role_technique = 'SUPER_ADMIN';
    NEW.statut_compte = 'VALIDE';
    NEW.poste = 'ASCQ';
    NEW.nom = 'DOSSOU';
    NEW.prenoms = 'BRUNO';
    NEW.date_validation = COALESCE(NEW.date_validation, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_super_admin_bruno_auto ON public.utilisateurs;
CREATE TRIGGER trg_super_admin_bruno_auto
BEFORE INSERT OR UPDATE ON public.utilisateurs
FOR EACH ROW
EXECUTE FUNCTION public.trg_garantir_super_admin_bruno();
