-- =====================================================================
-- ASCQ BÉNIN - Migration Phase 12 : Système de Références Communautaires (Santé & GUPS),
-- Approche One Health, Correction Définitive Auth RC & Privilèges Hiérarchiques
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CORRECTION DÉFINITIVE DU BUG AUTH RC ("database error querying schema")
-- ---------------------------------------------------------------------

-- A. Synchronisation rétroactive de auth.identities pour TOUS les utilisateurs existants
-- Cela évite le crash GoTrue "database error querying schema" quand le RC tente de se connecter
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'identities') THEN
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        SELECT 
            gen_random_uuid(),
            u.id,
            jsonb_build_object('sub', u.id::text, 'email', u.email),
            'email',
            u.id::text,
            NOW(),
            NOW(),
            NOW()
        FROM auth.users u
        LEFT JOIN auth.identities i ON i.user_id = u.id AND i.provider = 'email'
        WHERE i.id IS NULL
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- B. Mise à jour de la fonction enroler_relais_communautaire avec insertion obligatoire dans auth.identities
CREATE OR REPLACE FUNCTION public.enroler_relais_communautaire(
    p_nom TEXT,
    p_prenoms TEXT,
    p_telephone TEXT,
    p_village_id UUID DEFAULT NULL,
    p_village_nom TEXT DEFAULT NULL,
    p_grappe INTEGER DEFAULT 1,
    p_nom_grappe TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_ascq_id UUID;
    v_ascq_dep UUID;
    v_ascq_com UUID;
    v_ascq_arr UUID;
    v_clean_phone TEXT;
    v_technical_email TEXT;
    v_code_temporaire TEXT;
    v_user_id UUID;
    v_rc_id UUID;
    v_village_id UUID := p_village_id;
    v_village_nom TEXT := p_village_nom;
BEGIN
    -- 1. Vérifier l'ASCQ connecté
    v_ascq_id := auth.uid();
    IF v_ascq_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié. Veuillez vous connecter.';
    END IF;

    SELECT departement_id, commune_id, arrondissement_id 
    INTO v_ascq_dep, v_ascq_com, v_ascq_arr
    FROM public.utilisateurs
    WHERE id = v_ascq_id AND statut_compte = 'VALIDE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Compte ASCQ introuvable ou non validé.';
    END IF;

    -- 2. Nettoyage et normalisation du numéro de téléphone
    v_clean_phone := regexp_replace(p_telephone, '\D', '', 'g');
    IF LENGTH(v_clean_phone) < 8 THEN
        RAISE EXCEPTION 'Le numéro de téléphone est invalide.';
    END IF;
    v_technical_email := 'tel_' || v_clean_phone || '@ascq.local';

    -- 3. Gestion du village
    IF v_village_id IS NULL AND v_village_nom IS NOT NULL AND TRIM(v_village_nom) <> '' THEN
        SELECT id INTO v_village_id 
        FROM public.villages 
        WHERE arrondissement_id = v_ascq_arr AND UPPER(nom) = UPPER(TRIM(v_village_nom))
        LIMIT 1;

        IF v_village_id IS NULL AND v_ascq_arr IS NOT NULL THEN
            INSERT INTO public.villages (arrondissement_id, nom, code)
            VALUES (v_ascq_arr, UPPER(TRIM(v_village_nom)), 'VIL-' || SUBSTRING(v_clean_phone FROM 5 FOR 4))
            RETURNING id INTO v_village_id;
        END IF;
    ELSIF v_village_id IS NOT NULL AND (v_village_nom IS NULL OR v_village_nom = '') THEN
        SELECT nom INTO v_village_nom FROM public.villages WHERE id = v_village_id;
    END IF;

    -- 4. Générer le code d'accès temporaire à 6 chiffres
    v_code_temporaire := LPAD((FLOOR(RANDOM() * 900000) + 100000)::INT::TEXT, 6, '0');

    -- 5. Créer ou mettre à jour le compte dans auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_technical_email;

    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            phone_change_token,
            email_change_token_current,
            reauthentication_token,
            is_sso_user
        ) VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            v_technical_email,
            crypt(v_code_temporaire, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('nom', UPPER(TRIM(p_nom)), 'prenoms', TRIM(p_prenoms), 'telephone', p_telephone, 'poste', 'RC'),
            NOW(),
            NOW(),
            '', '', '', '', '', '', '', false
        );

        -- CRITIQUE : Créer la ligne d'identité dans auth.identities pour éviter l'erreur GoTrue
        IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'email') THEN
            INSERT INTO auth.identities (
                id,
                user_id,
                identity_data,
                provider,
                provider_id,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                jsonb_build_object('sub', v_user_id::text, 'email', v_technical_email),
                'email',
                v_user_id::text,
                NOW(),
                NOW(),
                NOW()
            );
        END IF;

    ELSE
        UPDATE auth.users
        SET encrypted_password = crypt(v_code_temporaire, gen_salt('bf')),
            raw_user_meta_data = jsonb_build_object('nom', UPPER(TRIM(p_nom)), 'prenoms', TRIM(p_prenoms), 'telephone', p_telephone, 'poste', 'RC'),
            updated_at = NOW()
        WHERE id = v_user_id;

        -- S'assurer que l'identité existe
        IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'email') THEN
            INSERT INTO auth.identities (
                id,
                user_id,
                identity_data,
                provider,
                provider_id,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                jsonb_build_object('sub', v_user_id::text, 'email', v_technical_email),
                'email',
                v_user_id::text,
                NOW(),
                NOW(),
                NOW()
            );
        ELSE
            UPDATE auth.identities
            SET identity_data = jsonb_build_object('sub', v_user_id::text, 'email', v_technical_email),
                updated_at = NOW()
            WHERE user_id = v_user_id AND provider = 'email';
        END IF;
    END IF;

    -- 6. Créer ou mettre à jour dans public.utilisateurs
    INSERT INTO public.utilisateurs (
        id,
        telephone,
        nom,
        prenoms,
        poste,
        statut_compte,
        role_technique,
        departement_id,
        commune_id,
        arrondissement_id
    ) VALUES (
        v_user_id,
        p_telephone,
        UPPER(TRIM(p_nom)),
        TRIM(p_prenoms),
        'RC',
        'VALIDE',
        'UTILISATEUR',
        v_ascq_dep,
        v_ascq_com,
        v_ascq_arr
    )
    ON CONFLICT (telephone) DO UPDATE SET
        nom = EXCLUDED.nom,
        prenoms = EXCLUDED.prenoms,
        poste = 'RC',
        statut_compte = 'VALIDE',
        departement_id = EXCLUDED.departement_id,
        commune_id = EXCLUDED.commune_id,
        arrondissement_id = EXCLUDED.arrondissement_id,
        updated_at = NOW();

    -- 7. Créer ou mettre à jour dans public.relais_communautaires
    INSERT INTO public.relais_communautaires (
        ascq_id,
        user_id,
        nom,
        prenoms,
        telephone,
        village_id,
        village_nom,
        grappe,
        nom_grappe,
        code_acces_temporaire,
        code_temporaire_utilise,
        statut
    ) VALUES (
        v_ascq_id,
        v_user_id,
        UPPER(TRIM(p_nom)),
        TRIM(p_prenoms),
        p_telephone,
        v_village_id,
        v_village_nom,
        p_grappe,
        p_nom_grappe,
        v_code_temporaire,
        FALSE,
        'ACTIF'
    )
    ON CONFLICT (telephone) DO UPDATE SET
        ascq_id = v_ascq_id,
        user_id = v_user_id,
        nom = EXCLUDED.nom,
        prenoms = EXCLUDED.prenoms,
        village_id = EXCLUDED.village_id,
        village_nom = EXCLUDED.village_nom,
        grappe = EXCLUDED.grappe,
        nom_grappe = EXCLUDED.nom_grappe,
        code_acces_temporaire = v_code_temporaire,
        code_temporaire_utilise = FALSE,
        statut = 'ACTIF',
        updated_at = NOW()
    RETURNING id INTO v_rc_id;

    RETURN jsonb_build_object(
        'success', true,
        'rc_id', v_rc_id,
        'user_id', v_user_id,
        'code_temporaire', v_code_temporaire,
        'telephone', p_telephone,
        'nom', UPPER(TRIM(p_nom)),
        'prenoms', TRIM(p_prenoms),
        'village_nom', v_village_nom
    );
END;
$$;

-- ---------------------------------------------------------------------
-- 2. TABLE DES RÉFÉRENCES COMMUNAUTAIRES (SANTÉ & GUPS / ONE HEALTH)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.references_communautaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_reference TEXT UNIQUE NOT NULL,
    relais_id UUID REFERENCES public.relais_communautaires(id) ON DELETE SET NULL,
    relais_nom TEXT NOT NULL,
    relais_telephone TEXT,
    ascq_id UUID REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    ascq_nom TEXT,
    
    -- Typologie & Destination
    type_reference TEXT NOT NULL CHECK (type_reference IN ('SANTE', 'SOCIAL_GUPS')),
    destination_type TEXT NOT NULL CHECK (destination_type IN ('CENTRE_SANTE', 'GUPS')),
    destination_nom TEXT NOT NULL,
    
    -- Motif
    motif_code TEXT NOT NULL,
    motif_libelle TEXT NOT NULL,
    motif_details TEXT,
    degre_urgence TEXT NOT NULL DEFAULT 'NORMALE' CHECK (degre_urgence IN ('NORMALE', 'URGENTE', 'EVACUATION_IMMEDIATE')),
    
    -- Approche One Health
    one_health_concerne BOOLEAN NOT NULL DEFAULT false,
    one_health_secteur TEXT, -- 'SANTE_HUMAINE', 'SANTE_ANIMALE_ZOONOSE', 'ENVIRONNEMENT_EAU_SALUBRITE'
    
    -- Date & Semaine épidémiologique
    date_reference DATE NOT NULL DEFAULT CURRENT_DATE,
    heure_reference TIME DEFAULT CURRENT_TIME,
    semaine_epidemio INTEGER NOT NULL,
    annee INTEGER NOT NULL,
    
    -- Localisation
    departement_id UUID REFERENCES public.departements(id),
    commune_id UUID REFERENCES public.communes(id),
    arrondissement_id UUID REFERENCES public.arrondissements(id),
    village_nom TEXT NOT NULL,
    
    -- Bénéficiaire / Patient référé
    nom_patient TEXT NOT NULL,
    prenoms_patient TEXT NOT NULL,
    sexe TEXT NOT NULL CHECK (sexe IN ('M', 'F')),
    age_valeur INTEGER NOT NULL,
    age_unite TEXT NOT NULL DEFAULT 'ANS' CHECK (age_unite IN ('ANS', 'MOIS', 'JOURS')),
    telephone_contact TEXT,
    nom_parent_tuteur TEXT,
    adresse_exacte TEXT,
    
    -- Circuit de Validation & Suivi
    statut TEXT NOT NULL DEFAULT 'EN_ATTENTE_ASCQ' CHECK (statut IN ('EN_ATTENTE_ASCQ', 'VALIDEE', 'REJETEE', 'PRISE_EN_CHARGE_EFFECTUEE')),
    date_validation_ascq TIMESTAMPTZ,
    commentaire_ascq TEXT,
    modifie_par_ascq BOOLEAN DEFAULT false,
    motif_rejet TEXT,
    
    -- Volet Retour (Centre de Santé / GUPS)
    accuse_reception BOOLEAN DEFAULT false,
    date_prise_en_charge TIMESTAMPTZ,
    responsable_reception_nom TEXT,
    observations_retour TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_ref_ascq_id ON public.references_communautaires(ascq_id);
CREATE INDEX IF NOT EXISTS idx_ref_relais_id ON public.references_communautaires(relais_id);
CREATE INDEX IF NOT EXISTS idx_ref_semaine ON public.references_communautaires(annee, semaine_epidemio);
CREATE INDEX IF NOT EXISTS idx_ref_statut ON public.references_communautaires(statut);
CREATE INDEX IF NOT EXISTS idx_ref_type ON public.references_communautaires(type_reference);

-- Sécurité RLS
ALTER TABLE public.references_communautaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture references ascq et relais" ON public.references_communautaires;
CREATE POLICY "Lecture references ascq et relais" ON public.references_communautaires
    FOR SELECT USING (
        ascq_id = auth.uid() OR 
        relais_id IN (SELECT id FROM public.relais_communautaires WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.utilisateurs u WHERE u.id = auth.uid() AND u.role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR'))
    );

DROP POLICY IF EXISTS "Insertion references" ON public.references_communautaires;
CREATE POLICY "Insertion references" ON public.references_communautaires
    FOR INSERT WITH CHECK (
        ascq_id = auth.uid() OR 
        relais_id IN (SELECT id FROM public.relais_communautaires WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.utilisateurs u WHERE u.id = auth.uid() AND u.role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR'))
    );

DROP POLICY IF EXISTS "Modification references ascq" ON public.references_communautaires;
CREATE POLICY "Modification references ascq" ON public.references_communautaires
    FOR UPDATE USING (
        ascq_id = auth.uid() OR 
        relais_id IN (SELECT id FROM public.relais_communautaires WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.utilisateurs u WHERE u.id = auth.uid() AND u.role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR'))
    );

-- ---------------------------------------------------------------------
-- 3. FONCTIONS RPC POUR LES RÉFÉRENCES (CRÉATION, VALIDATION, MODIFICATION)
-- ---------------------------------------------------------------------

-- A. Création d'une référence communautaire (par le RC ou l'ASCQ)
CREATE OR REPLACE FUNCTION public.creer_reference_communautaire(
    p_type_reference TEXT,
    p_destination_type TEXT,
    p_destination_nom TEXT,
    p_motif_code TEXT,
    p_motif_libelle TEXT,
    p_motif_details TEXT DEFAULT NULL,
    p_degre_urgence TEXT DEFAULT 'NORMALE',
    p_one_health_concerne BOOLEAN DEFAULT false,
    p_one_health_secteur TEXT DEFAULT NULL,
    p_nom_patient TEXT DEFAULT '',
    p_prenoms_patient TEXT DEFAULT '',
    p_sexe TEXT DEFAULT 'M',
    p_age_valeur INTEGER DEFAULT 1,
    p_age_unite TEXT DEFAULT 'ANS',
    p_telephone_contact TEXT DEFAULT NULL,
    p_nom_parent_tuteur TEXT DEFAULT NULL,
    p_adresse_exacte TEXT DEFAULT NULL,
    p_village_nom TEXT DEFAULT NULL,
    p_relais_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_poste TEXT;
    v_user_nom TEXT;
    v_ascq_id UUID;
    v_ascq_nom TEXT;
    v_relais_id UUID := p_relais_id;
    v_relais_nom TEXT;
    v_relais_tel TEXT;
    v_dep_id UUID;
    v_com_id UUID;
    v_arr_id UUID;
    v_village TEXT := p_village_nom;
    v_annee INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    v_semaine INTEGER;
    v_count_today INTEGER;
    v_numero TEXT;
    v_new_id UUID;
    v_statut_initial TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    -- Obtenir les infos de l'utilisateur connecté
    SELECT poste, nom || ' ' || prenoms, departement_id, commune_id, arrondissement_id
    INTO v_user_poste, v_user_nom, v_dep_id, v_com_id, v_arr_id
    FROM public.utilisateurs
    WHERE id = v_user_id;

    -- Semaine épidémiologique
    v_semaine := EXTRACT(WEEK FROM CURRENT_DATE)::INTEGER;

    -- Si c'est un RC qui émet la référence
    IF v_user_poste = 'RC' THEN
        SELECT id, nom || ' ' || prenoms, telephone, ascq_id, village_nom
        INTO v_relais_id, v_relais_nom, v_relais_tel, v_ascq_id, v_village
        FROM public.relais_communautaires
        WHERE user_id = v_user_id
        LIMIT 1;

        SELECT nom || ' ' || prenoms INTO v_ascq_nom
        FROM public.utilisateurs
        WHERE id = v_ascq_id;

        v_statut_initial := 'EN_ATTENTE_ASCQ';
    ELSE
        -- L'émetteur est directement un ASCQ ou superviseur
        v_ascq_id := v_user_id;
        v_ascq_nom := v_user_nom;
        
        IF v_relais_id IS NOT NULL THEN
            SELECT nom || ' ' || prenoms, telephone INTO v_relais_nom, v_relais_tel
            FROM public.relais_communautaires
            WHERE id = v_relais_id;
        ELSE
            v_relais_nom := v_ascq_nom;
            v_relais_tel := '';
        END IF;

        -- Une référence créée directement par l'ASCQ est validée d'emblée
        v_statut_initial := 'VALIDEE';
    END IF;

    IF v_village IS NULL OR TRIM(v_village) = '' THEN
        v_village := 'Communauté locale';
    END IF;

    -- Génération du numéro officiel REF-AAAA-MM-WXX-XXX
    SELECT COUNT(*) + 1 INTO v_count_today
    FROM public.references_communautaires
    WHERE annee = v_annee AND semaine_epidemio = v_semaine;

    v_numero := 'REF-' || v_annee || '-W' || LPAD(v_semaine::TEXT, 2, '0') || '-' || LPAD(v_count_today::TEXT, 3, '0');

    INSERT INTO public.references_communautaires (
        numero_reference,
        relais_id,
        relais_nom,
        relais_telephone,
        ascq_id,
        ascq_nom,
        type_reference,
        destination_type,
        destination_nom,
        motif_code,
        motif_libelle,
        motif_details,
        degre_urgence,
        one_health_concerne,
        one_health_secteur,
        semaine_epidemio,
        annee,
        departement_id,
        commune_id,
        arrondissement_id,
        village_nom,
        nom_patient,
        prenoms_patient,
        sexe,
        age_valeur,
        age_unite,
        telephone_contact,
        nom_parent_tuteur,
        adresse_exacte,
        statut,
        date_validation_ascq
    ) VALUES (
        v_numero,
        v_relais_id,
        v_relais_nom,
        v_relais_tel,
        v_ascq_id,
        v_ascq_nom,
        p_type_reference,
        p_destination_type,
        p_destination_nom,
        p_motif_code,
        p_motif_libelle,
        p_motif_details,
        p_degre_urgence,
        p_one_health_concerne,
        p_one_health_secteur,
        v_semaine,
        v_annee,
        v_dep_id,
        v_com_id,
        v_arr_id,
        v_village,
        UPPER(TRIM(p_nom_patient)),
        TRIM(p_prenoms_patient),
        p_sexe,
        p_age_valeur,
        p_age_unite,
        p_telephone_contact,
        p_nom_parent_tuteur,
        p_adresse_exacte,
        v_statut_initial,
        CASE WHEN v_statut_initial = 'VALIDEE' THEN NOW() ELSE NULL END
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'success', true,
        'reference_id', v_new_id,
        'numero_reference', v_numero,
        'statut', v_statut_initial,
        'destination_nom', p_destination_nom,
        'message', CASE 
            WHEN v_statut_initial = 'VALIDEE' THEN 'Référence validée et enregistrée officiellement.'
            ELSE 'Référence transmise à votre ASCQ superviseur pour validation immédiate.'
        END
    );
END;
$$;

-- B. Validation / Rejet d'une référence communautaire par l'ASCQ
CREATE OR REPLACE FUNCTION public.valider_reference_communautaire(
    p_reference_id UUID,
    p_decision TEXT, -- 'VALIDEE' ou 'REJETEE'
    p_commentaire TEXT DEFAULT NULL,
    p_motif_rejet TEXT DEFAULT NULL,
    p_ajustement_destination TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_ascq_id UUID := auth.uid();
    v_ref RECORD;
BEGIN
    IF v_ascq_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    SELECT * INTO v_ref 
    FROM public.references_communautaires
    WHERE id = p_reference_id AND (ascq_id = v_ascq_id OR public.est_administrateur());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Référence introuvable ou vous n''avez pas les droits de supervision sur ce dossier.';
    END IF;

    UPDATE public.references_communautaires
    SET statut = p_decision,
        date_validation_ascq = NOW(),
        commentaire_ascq = p_commentaire,
        motif_rejet = CASE WHEN p_decision = 'REJETEE' THEN p_motif_rejet ELSE NULL END,
        destination_nom = COALESCE(NULLIF(p_ajustement_destination, ''), destination_nom),
        modifie_par_ascq = CASE WHEN p_ajustement_destination IS NOT NULL AND p_ajustement_destination <> '' THEN true ELSE modifie_par_ascq END,
        updated_at = NOW()
    WHERE id = p_reference_id;

    RETURN jsonb_build_object(
        'success', true,
        'reference_id', p_reference_id,
        'statut', p_decision,
        'message', CASE 
            WHEN p_decision = 'VALIDEE' THEN 'La référence a été validée. Le bulletin officiel est prêt pour impression et transmission.'
            ELSE 'La référence a été rejetée avec motif.'
        END
    );
END;
$$;

-- C. Obtenir les données consolidées en temps réel pour pré-remplir les rapports hebdo et mensuel
CREATE OR REPLACE FUNCTION public.obtenir_statistiques_temps_reel_rapport(
    p_date_debut DATE,
    p_date_fin DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_ascq_id UUID := auth.uid();
    v_total_alertes INTEGER := 0;
    v_total_touches INTEGER := 0;
    v_total_morts_alertes INTEGER := 0;
    v_total_deces_communautaires INTEGER := 0;
    v_deces_maternels INTEGER := 0;
    v_deces_neonatals INTEGER := 0;
    v_deces_infantiles INTEGER := 0;
    v_deces_plus_5_ans INTEGER := 0;
    v_total_registre INTEGER := 0;
    v_total_references_sante INTEGER := 0;
    v_total_references_gups INTEGER := 0;
    v_total_vad INTEGER := 0;
    v_rc_actifs INTEGER := 0;
BEGIN
    IF v_ascq_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    -- 1. Alertes communautaires sur la période
    SELECT 
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(nb_personnes_touchees), 0),
        COALESCE(SUM(nb_personnes_mortes), 0)
    INTO v_total_alertes, v_total_touches, v_total_morts_alertes
    FROM public.alertes_communautaires
    WHERE (ascq_id = v_ascq_id OR declare_par_id = v_ascq_id)
      AND date_notification BETWEEN p_date_debut AND p_date_fin;

    -- 2. Décès communautaires sur la période (ventilés)
    SELECT 
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(CASE WHEN type_deces_code = 1 THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type_deces_code = 2 THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type_deces_code = 3 THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type_deces_code = 4 THEN 1 ELSE 0 END), 0)
    INTO v_total_deces_communautaires, v_deces_maternels, v_deces_neonatals, v_deces_infantiles, v_deces_plus_5_ans
    FROM public.deces_communautaires
    WHERE notificateur_id = v_ascq_id
      AND date_deces BETWEEN p_date_debut AND p_date_fin;

    -- 3. Registre alertes et rumeurs
    SELECT COALESCE(COUNT(*), 0)
    INTO v_total_registre
    FROM public.registre_alertes_rumeurs
    WHERE ascq_superviseur_id = v_ascq_id
      AND date_survenue BETWEEN p_date_debut AND p_date_fin;

    -- 4. Références communautaires (Santé vs GUPS)
    SELECT 
        COALESCE(SUM(CASE WHEN type_reference = 'SANTE' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type_reference = 'SOCIAL_GUPS' THEN 1 ELSE 0 END), 0)
    INTO v_total_references_sante, v_total_references_gups
    FROM public.references_communautaires
    WHERE ascq_id = v_ascq_id
      AND date_reference BETWEEN p_date_debut AND p_date_fin;

    -- 5. Relais communautaires rattachés et opérationnels
    SELECT COALESCE(COUNT(*), 0)
    INTO v_rc_actifs
    FROM public.relais_communautaires
    WHERE ascq_id = v_ascq_id AND statut = 'ACTIF';

    RETURN jsonb_build_object(
        'total_alertes', v_total_alertes,
        'personnes_touchees', v_total_touches,
        'personnes_mortes_alertes', v_total_morts_alertes,
        'total_deces_communautaires', v_total_deces_communautaires,
        'deces_maternels', v_deces_maternels,
        'deces_neonatals', v_deces_neonatals,
        'deces_infantiles', v_deces_infantiles,
        'deces_plus_5_ans', v_deces_plus_5_ans,
        'total_registre', v_total_registre,
        'references_sante', v_total_references_sante,
        'references_gups', v_total_references_gups,
        'rc_actifs', v_rc_actifs
    );
END;
$$;

-- D. Lister toutes les fiches d'un RC avec droit de modification et validation par son ASCQ
CREATE OR REPLACE FUNCTION public.lister_fiches_rc_pour_ascq(p_rc_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_ascq_id UUID := auth.uid();
    v_rc RECORD;
    v_alertes JSONB;
    v_registre JSONB;
    v_references JSONB;
BEGIN
    IF v_ascq_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    -- Vérifier l'appartenance du RC à cet ASCQ
    SELECT * INTO v_rc 
    FROM public.relais_communautaires
    WHERE id = p_rc_id AND (ascq_id = v_ascq_id OR public.est_administrateur());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Relais communautaire introuvable ou non rattaché.';
    END IF;

    -- 1. Alertes déclarées par ce RC
    SELECT jsonb_agg(to_jsonb(a)) INTO v_alertes
    FROM public.alertes_communautaires a
    WHERE a.declare_par_id = v_rc.user_id OR a.notificateur_nom_complet ILIKE '%' || v_rc.nom || '%';

    -- 2. Registre alertes et rumeurs du RC
    SELECT jsonb_agg(to_jsonb(r)) INTO v_registre
    FROM public.registre_alertes_rumeurs r
    WHERE r.relais_id = v_rc.id OR r.relais_nom_complet ILIKE '%' || v_rc.nom || '%';

    -- 3. Références Santé & GUPS du RC
    SELECT jsonb_agg(to_jsonb(rf)) INTO v_references
    FROM public.references_communautaires rf
    WHERE rf.relais_id = v_rc.id;

    RETURN jsonb_build_object(
        'rc_id', v_rc.id,
        'nom_complet', v_rc.nom || ' ' || v_rc.prenoms,
        'telephone', v_rc.telephone,
        'village_nom', v_rc.village_nom,
        'alertes', COALESCE(v_alertes, '[]'::jsonb),
        'registre', COALESCE(v_registre, '[]'::jsonb),
        'references', COALESCE(v_references, '[]'::jsonb)
    );
END;
$$;

-- E. Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.enroler_relais_communautaire TO authenticated;
GRANT EXECUTE ON FUNCTION public.creer_reference_communautaire TO authenticated;
GRANT EXECUTE ON FUNCTION public.valider_reference_communautaire TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtenir_statistiques_temps_reel_rapport TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_fiches_rc_pour_ascq TO authenticated;

-- Confirmation
COMMENT ON TABLE public.references_communautaires IS 'Table officielle des références communautaires vers les Centres de Santé et le GUPS (Protection Sociale)';
