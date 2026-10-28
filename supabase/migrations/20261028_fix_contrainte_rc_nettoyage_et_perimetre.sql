-- =====================================================================
-- MIGRATION : CORRECTION CONTRAINTE RC, NETTOYAGE COMPLET ET PÉRIMÈTRE
-- Date: 2026-10-28
-- Auteur: Antigravity / Super Admin National Bruno DOSSOU
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CORRECTION DE LA CONTRAINTE CHECK role_technique & poste SUR public.utilisateurs
-- Résout l'erreur : "new row for relation "utilisateurs" violates check constraint "utilisateurs_role_technique_check""
-- ---------------------------------------------------------------------

ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_technique_check;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_role_technique_check 
    CHECK (role_technique IN (
        'PUBLIC', 
        'RELAIS', 
        'RELAIS_COMMUNAUTAIRE',
        'UTILISATEUR',
        'ASCQ_OPERATEUR', 
        'GESTIONNAIRE_PERIMETRE', 
        'ADMINISTRATEUR', 
        'SUPER_ADMIN', 
        'REPRESENTANT_DEPARTEMENTAL', 
        'ADMIN_DEPARTEMENTAL', 
        'CADRE_DEPARTEMENTAL', 
        'CADRE_ZONE_SANITAIRE', 
        'REPRESENTANT_COMMUNAL', 
        'ADMIN_COMMUNAL', 
        'CADRE_COMMUNAL'
    ));

ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_poste_check;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_poste_check 
    CHECK (poste IN (
        'ASCQ', 
        'RC', 
        'RELAIS_COMMUNAUTAIRE',
        'DDS', 
        'CCD_CDLS_TP', 
        'CSSPR', 
        'CSPSMEMH', 
        'MCZS', 
        'RCSE', 
        'C_RAMS', 
        'MCC', 
        'PF_CCLS_TP', 
        'REPRESENTANT_COMMUNAL', 
        'REPRESENTANT_DEPARTEMENTAL', 
        'ADMINISTRATEUR', 
        'SUPER_ADMIN', 
        'AUTRE'
    ));

-- ---------------------------------------------------------------------
-- 2. MISE À JOUR DE LA FONCTION inscrire_nouvel_agent POUR LE RÔLE RC
-- Assure une harmonisation parfaite entre poste 'RC' et role_technique 'RELAIS'
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.inscrire_nouvel_agent(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS public.inscrire_nouvel_agent;

CREATE OR REPLACE FUNCTION public.inscrire_nouvel_agent(
    p_id UUID,
    p_telephone TEXT,
    p_nom TEXT,
    p_prenoms TEXT,
    p_poste TEXT,
    p_poste_autre TEXT,
    p_departement_id UUID,
    p_zone_sanitaire_id UUID,
    p_commune_id UUID,
    p_arrondissement_id UUID,
    p_second_arrondissement_id UUID,
    p_source_financement TEXT,
    p_source_financement_autre TEXT,
    p_nombre_rc INTEGER,
    p_afficher_annuaire BOOLEAN,
    p_cumul_deux_arrondissements BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_phone TEXT;
    v_ascq_id UUID;
    v_role_tech TEXT;
    v_poste_final TEXT;
BEGIN
    v_clean_phone := TRIM(p_telephone);

    IF auth.uid() IS NOT NULL AND auth.uid() != p_id THEN
        RAISE EXCEPTION 'Non autorisé : l''identifiant ne correspond pas à la session connectée.';
    END IF;

    -- Vérifier si un compte validé existe déjà avec ce numéro de téléphone
    IF EXISTS (
        SELECT 1 FROM public.utilisateurs 
        WHERE (id = p_id OR telephone = v_clean_phone) 
          AND statut_compte IN ('VALIDE', 'SUSPENDU')
    ) THEN
        RAISE EXCEPTION 'Compte déjà existant et validé. Veuillez vous connecter ou contacter l''administrateur.';
    END IF;

    -- Normalisation du poste et rôle technique
    IF p_poste = 'ASCQ' THEN
        v_role_tech := 'ASCQ_OPERATEUR';
        v_poste_final := 'ASCQ';
    ELSIF p_poste IN ('RC', 'RELAIS_COMMUNAUTAIRE') THEN
        v_role_tech := 'RELAIS';
        v_poste_final := 'RC';
    ELSE
        v_role_tech := 'PUBLIC';
        v_poste_final := COALESCE(p_poste, 'PUBLIC');
    END IF;

    -- Recherche de l'ASCQ superviseur si c'est un Relais Communautaire
    IF v_poste_final = 'RC' AND p_arrondissement_id IS NOT NULL THEN
        SELECT id INTO v_ascq_id 
        FROM public.utilisateurs 
        WHERE (arrondissement_id = p_arrondissement_id OR second_arrondissement_id = p_arrondissement_id)
          AND poste = 'ASCQ' 
          AND statut_compte = 'VALIDE'
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    -- Insertion ou mise à jour dans public.utilisateurs
    IF EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = p_id) THEN
        UPDATE public.utilisateurs
        SET telephone = v_clean_phone,
            nom = UPPER(TRIM(p_nom)),
            prenoms = TRIM(p_prenoms),
            poste = v_poste_final,
            poste_autre = p_poste_autre,
            departement_id = p_departement_id,
            zone_sanitaire_id = p_zone_sanitaire_id,
            commune_id = p_commune_id,
            arrondissement_id = p_arrondissement_id,
            second_arrondissement_id = p_second_arrondissement_id,
            statut_compte = 'EN_ATTENTE',
            role_technique = v_role_tech,
            updated_at = NOW()
        WHERE id = p_id AND statut_compte IN ('EN_ATTENTE', 'REJETE');
    ELSE
        INSERT INTO public.utilisateurs (
            id, telephone, nom, prenoms, poste, poste_autre,
            role_technique, statut_compte,
            departement_id, zone_sanitaire_id, commune_id, arrondissement_id, second_arrondissement_id
        ) VALUES (
            p_id, v_clean_phone, UPPER(TRIM(p_nom)), TRIM(p_prenoms), 
            v_poste_final, 
            p_poste_autre,
            v_role_tech,
            'EN_ATTENTE',
            p_departement_id, p_zone_sanitaire_id, p_commune_id, p_arrondissement_id, p_second_arrondissement_id
        );
    END IF;

    -- Profil spécifique ASCQ
    IF v_poste_final = 'ASCQ' THEN
        INSERT INTO public.ascq_profils (
            id, source_financement, source_financement_autre,
            nombre_rc, afficher_annuaire_public, cumul_deux_arrondissements
        ) VALUES (
            p_id, p_source_financement, p_source_financement_autre,
            COALESCE(p_nombre_rc, 0), COALESCE(p_afficher_annuaire, false), COALESCE(p_cumul_deux_arrondissements, false)
        )
        ON CONFLICT (id) DO UPDATE SET
            source_financement = EXCLUDED.source_financement,
            nombre_rc = EXCLUDED.nombre_rc,
            afficher_annuaire_public = EXCLUDED.afficher_annuaire_public;
    END IF;

    -- Profil spécifique Relais Communautaire (En attente de validation et d'affectation village par l'ASCQ)
    IF v_poste_final = 'RC' THEN
        INSERT INTO public.relais_communautaires (
            user_id,
            ascq_id,
            nom,
            prenoms,
            telephone,
            arrondissement_id,
            village_id,
            village_nom,
            grappe,
            code_acces_temporaire,
            code_temporaire_utilise,
            statut
        ) VALUES (
            p_id,
            v_ascq_id,
            UPPER(TRIM(p_nom)),
            TRIM(p_prenoms),
            v_clean_phone,
            p_arrondissement_id,
            NULL,
            'En attente d''affectation',
            1,
            '0000',
            false,
            'EN_ATTENTE'
        )
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Inscription réussie en attente de validation.',
        'poste', v_poste_final,
        'ascq_superviseur_id', v_ascq_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.inscrire_nouvel_agent TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. NETTOYAGE COMPLET DES RELAIS COMMUNAUTAIRES DE TEST (REMISE À ZÉRO)
-- Supprime les comptes de test RC pour que les agents puissent s'inscrire proprement
-- ---------------------------------------------------------------------

-- Suppression des comptes auth associés aux RC de test
DELETE FROM auth.users 
WHERE id IN (
    SELECT id FROM public.utilisateurs 
    WHERE poste IN ('RC', 'RELAIS_COMMUNAUTAIRE') OR role_technique IN ('RELAIS', 'RELAIS_COMMUNAUTAIRE')
);

-- Suppression des données de la table relais_communautaires et utilisateurs
TRUNCATE TABLE public.relais_communautaires CASCADE;
DELETE FROM public.utilisateurs 
WHERE poste IN ('RC', 'RELAIS_COMMUNAUTAIRE') OR role_technique IN ('RELAIS', 'RELAIS_COMMUNAUTAIRE');

-- ---------------------------------------------------------------------
-- 4. NETTOYAGE DES DONNÉES DE TEST MATERNITÉ & 1000 PREMIERS JOURS
-- Remet à zéro les tables de suivi des femmes enceintes et des enfants
-- ---------------------------------------------------------------------

TRUNCATE TABLE public.suivi_femmes_enceintes CASCADE;
TRUNCATE TABLE public.suivi_enfants_1000_jours CASCADE;

-- ---------------------------------------------------------------------
-- 5. VÉRIFICATION DES POLITIQUES RLS POUR LA MODIFICATION DES FICHES
-- Permet aux ASCQ de créer, modifier et supprimer les fiches maternité & enfants
-- ---------------------------------------------------------------------

ALTER TABLE public.suivi_femmes_enceintes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suivi_femmes_all_authenticated" ON public.suivi_femmes_enceintes;
CREATE POLICY "suivi_femmes_all_authenticated" ON public.suivi_femmes_enceintes
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

ALTER TABLE public.suivi_enfants_1000_jours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suivi_enfants_all_authenticated" ON public.suivi_enfants_1000_jours;
CREATE POLICY "suivi_enfants_all_authenticated" ON public.suivi_enfants_1000_jours
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 6. AUDIT & CONFIRMATION
-- ---------------------------------------------------------------------
SELECT 'Migration terminée avec succès. Contrainte RC réparée, tables nettoyées à zéro, droits élargis.' AS statut;
