-- ==============================================================================
-- SANTÉCOM BÉNIN - RÉSOLUTION DÉFINITIVE DÉCÈS, ALERTES, RLS ET SIGNATURES
-- Script maître à coller et exécuter dans le SQL Editor de Supabase
-- ==============================================================================

-- 1. ASSOUPLISSEMENT DES CONTRAINTES D'UNITÉ D'ÂGE (INSENSIBLES À LA CASSE)
ALTER TABLE public.deces_communautaires DROP CONSTRAINT IF EXISTS deces_communautaires_age_unite_check;
ALTER TABLE public.deces_communautaires ADD CONSTRAINT deces_communautaires_age_unite_check 
    CHECK (UPPER(age_unite) IN ('JOURS', 'MOIS', 'ANS'));

ALTER TABLE public.alertes_communautaires DROP CONSTRAINT IF EXISTS alertes_communautaires_age_unite_check;
ALTER TABLE public.alertes_communautaires ADD CONSTRAINT alertes_communautaires_age_unite_check 
    CHECK (UPPER(age_unite) IN ('JOURS', 'MOIS', 'ANS'));

UPDATE public.deces_communautaires 
SET age_unite = UPPER(age_unite) 
WHERE age_unite IS NOT NULL;

UPDATE public.alertes_communautaires 
SET age_unite = UPPER(age_unite) 
WHERE age_unite IS NOT NULL;

-- 2. POLITIQUE RLS NON RÉCURSIVE SUR UTILISATEURS (ÉRADICATION DU "Failed to fetch")
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "utilisateurs_lecture_securisee" ON public.utilisateurs;
DROP POLICY IF EXISTS "Lecture profils utilisateurs" ON public.utilisateurs;
DROP POLICY IF EXISTS "lecture_utilisateurs_authentifies" ON public.utilisateurs;
DROP POLICY IF EXISTS "utilisateurs_select_policy" ON public.utilisateurs;

CREATE POLICY "utilisateurs_lecture_securisee" 
ON public.utilisateurs FOR SELECT 
TO authenticated, anon 
USING (true);

-- 3. FONCTION DE CRÉATION DE DÉCÈS (SANS ON CONFLICT & AVEC IDENTITÉ COMPLÈTE)
CREATE OR REPLACE FUNCTION public.creer_notification_deces(
    p_date_deces DATE,
    p_heure_deces TIME,
    p_date_notification DATE,
    p_departement_id UUID,
    p_commune_id UUID,
    p_arrondissement_id UUID,
    p_village_nom TEXT,
    p_numero_grappe INTEGER,
    p_nom_grappe TEXT,
    p_gps_latitude NUMERIC,
    p_gps_longitude NUMERIC,
    p_type_deces_code INTEGER,
    p_lieu_deces_code INTEGER,
    p_lieu_pays_etranger TEXT,
    p_circonstance_code INTEGER,
    p_circonstance_autre_precision TEXT,
    p_sexe TEXT,
    p_age_valeur INTEGER,
    p_age_unite TEXT,
    p_signature_tactile TEXT,
    p_nom_defunt TEXT,
    p_prenoms_defunt TEXT,
    p_npi_defunt TEXT,
    p_date_naissance DATE,
    p_nom_parent TEXT,
    p_telephone_parent TEXT,
    p_adresse_domicile TEXT,
    p_registre_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user RECORD;
    v_ascq_id UUID;
    v_centre_sante TEXT;
    v_type_nom TEXT;
    v_lieu_nom TEXT;
    v_circ_nom TEXT;
    v_annee INTEGER;
    v_semaine INTEGER;
    v_mois INTEGER;
    v_seq BIGINT;
    v_numero TEXT;
    v_id UUID;
    v_delai NUMERIC := 0;
    v_age_unite_clean TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN 
        RAISE EXCEPTION 'Non authentifié. Veuillez vous reconnecter.'; 
    END IF;

    SELECT * INTO v_user FROM public.utilisateurs WHERE id = v_user_id;
    IF v_user.poste = 'RC' THEN
        SELECT ascq_id INTO v_ascq_id FROM public.relais_communautaires WHERE user_id = v_user_id LIMIT 1;
    ELSE
        v_ascq_id := v_user_id;
    END IF;

    SELECT nom INTO v_centre_sante FROM public.structures_sante WHERE commune_id = p_commune_id LIMIT 1;
    SELECT nom INTO v_type_nom FROM public.deces_types_reference WHERE code = p_type_deces_code;
    SELECT nom INTO v_lieu_nom FROM public.deces_lieux_reference WHERE code = p_lieu_deces_code;
    SELECT nom INTO v_circ_nom FROM public.deces_circonstances_reference WHERE code = p_circonstance_code;

    v_annee := EXTRACT(ISOYEAR FROM COALESCE(p_date_notification, CURRENT_DATE))::INT;
    v_semaine := EXTRACT(WEEK FROM COALESCE(p_date_notification, CURRENT_DATE))::INT;
    v_mois := EXTRACT(MONTH FROM COALESCE(p_date_notification, CURRENT_DATE))::INT;

    IF p_date_deces IS NOT NULL AND p_date_notification IS NOT NULL THEN
        v_delai := (p_date_notification - p_date_deces) * 24;
    END IF;

    v_age_unite_clean := UPPER(COALESCE(NULLIF(TRIM(p_age_unite), ''), 'ANS'));

    v_seq := nextval('seq_numero_deces');
    v_numero := 'DEC-' || v_annee::TEXT || '-' || LPAD(v_seq::TEXT, 6, '0');

    INSERT INTO public.deces_communautaires (
        numero_deces,
        annee,
        semaine_epidemio,
        mois,
        date_deces,
        heure_deces,
        date_notification,
        delai_deces_notification_heures,
        departement_id,
        commune_id,
        arrondissement_id,
        village_nom,
        numero_grappe,
        nom_grappe,
        gps_latitude,
        gps_longitude,
        type_deces_code,
        type_deces_nom,
        lieu_deces_code,
        lieu_deces_nom,
        lieu_pays_etranger,
        circonstance_code,
        circonstance_nom,
        circonstance_autre_precision,
        sexe,
        age_valeur,
        age_unite,
        nom_defunt,
        prenoms_defunt,
        defunt_nom_prenom,
        npi_defunt,
        nom_parent,
        telephone_parent,
        adresse_domicile,
        date_naissance,
        notificateur_id,
        notificateur_nom_complet,
        notificateur_titre,
        notificateur_telephone,
        centre_sante_nom,
        signature_tactile,
        ascq_superviseur_id,
        statut
    ) VALUES (
        v_numero,
        v_annee,
        v_semaine,
        v_mois,
        p_date_deces,
        p_heure_deces,
        COALESCE(p_date_notification, CURRENT_DATE),
        v_delai,
        p_departement_id,
        p_commune_id,
        p_arrondissement_id,
        TRIM(p_village_nom),
        COALESCE(p_numero_grappe, 1),
        p_nom_grappe,
        p_gps_latitude,
        p_gps_longitude,
        p_type_deces_code,
        v_type_nom,
        p_lieu_deces_code,
        v_lieu_nom,
        p_lieu_pays_etranger,
        p_circonstance_code,
        v_circ_nom,
        p_circonstance_autre_precision,
        p_sexe,
        p_age_valeur,
        v_age_unite_clean,
        TRIM(p_nom_defunt),
        TRIM(p_prenoms_defunt),
        TRIM(COALESCE(p_nom_defunt, '')) || ' ' || TRIM(COALESCE(p_prenoms_defunt, '')),
        p_npi_defunt,
        p_nom_parent,
        p_telephone_parent,
        p_adresse_domicile,
        p_date_naissance,
        v_user_id,
        v_user.prenoms || ' ' || v_user.nom,
        v_user.poste,
        v_user.telephone,
        COALESCE(v_centre_sante, 'CSC'),
        p_signature_tactile,
        v_ascq_id,
        'NOTIFIE'
    )
    RETURNING id INTO v_id;

    -- Insertion miroir sans clause ON CONFLICT
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deces_identite_privee') THEN
        INSERT INTO public.deces_identite_privee (
            deces_id,
            npi_defunt,
            nom_defunt,
            prenoms_defunt,
            nom_parent,
            telephone_parent,
            adresse_domicile,
            date_naissance
        ) VALUES (
            v_id,
            p_npi_defunt,
            TRIM(p_nom_defunt),
            TRIM(p_prenoms_defunt),
            p_nom_parent,
            p_telephone_parent,
            p_adresse_domicile,
            p_date_naissance
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_id,
        'numero_deces', v_numero,
        'semaine_epidemio', v_semaine,
        'annee', v_annee
    );
END;
$$;

-- 4. FONCTION DE CRÉATION D'ALERTE (SANS ON CONFLICT & AVEC IDENTITÉ COMPLÈTE)
CREATE OR REPLACE FUNCTION public.creer_notification_alerte(
    p_date_detection DATE,
    p_heure_detection TIME,
    p_date_notification DATE,
    p_departement_id UUID,
    p_commune_id UUID,
    p_arrondissement_id UUID,
    p_village_nom TEXT,
    p_numero_grappe INTEGER,
    p_nom_grappe TEXT,
    p_gps_latitude NUMERIC,
    p_gps_longitude NUMERIC,
    p_type_alerte_code INTEGER,
    p_autre_evenement_precision TEXT,
    p_symptomes_codes INTEGER[],
    p_autre_symptome_precision TEXT,
    p_nb_personnes_touchees INTEGER,
    p_nb_personnes_mortes INTEGER,
    p_nb_animaux_malades INTEGER,
    p_nb_animaux_morts INTEGER,
    p_evenement_en_cours BOOLEAN,
    p_mesures_prises TEXT,
    p_sexe TEXT,
    p_age_valeur INTEGER,
    p_age_unite TEXT,
    p_signature_tactile TEXT,
    p_npi_cas TEXT,
    p_nom_cas TEXT,
    p_prenoms_cas TEXT,
    p_telephone_cas TEXT,
    p_adresse_cas TEXT,
    p_date_naissance_cas DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user RECORD;
    v_ascq_superviseur_id UUID;
    v_centre_sante TEXT;
    v_type_info RECORD;
    v_annee INTEGER;
    v_semaine INTEGER;
    v_mois INTEGER;
    v_numero_seq BIGINT;
    v_numero_alerte TEXT;
    v_alerte_id UUID;
    v_delai_heures NUMERIC := 0;
    v_age_unite_clean TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié. Veuillez vous reconnecter.';
    END IF;

    SELECT * INTO v_user FROM public.utilisateurs WHERE id = v_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profil utilisateur introuvable.';
    END IF;

    IF v_user.poste = 'RC' THEN
        SELECT ascq_id INTO v_ascq_superviseur_id 
        FROM public.relais_communautaires 
        WHERE user_id = v_user_id LIMIT 1;
    ELSE
        v_ascq_superviseur_id := v_user_id;
    END IF;

    SELECT nom INTO v_centre_sante FROM public.structures_sante 
    WHERE commune_id = p_commune_id LIMIT 1;

    SELECT nom, est_prioritaire, concerne_animaux INTO v_type_info 
    FROM public.types_alertes_reference 
    WHERE code = p_type_alerte_code;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Type d''alerte invalide.';
    END IF;

    v_annee := EXTRACT(ISOYEAR FROM COALESCE(p_date_notification, CURRENT_DATE))::INT;
    v_semaine := EXTRACT(WEEK FROM COALESCE(p_date_notification, CURRENT_DATE))::INT;
    v_mois := EXTRACT(MONTH FROM COALESCE(p_date_notification, CURRENT_DATE))::INT;

    IF p_date_detection IS NOT NULL AND p_date_notification IS NOT NULL THEN
        v_delai_heures := (p_date_notification - p_date_detection) * 24;
    END IF;

    v_age_unite_clean := UPPER(COALESCE(NULLIF(TRIM(p_age_unite), ''), 'ANS'));

    v_numero_seq := nextval('seq_numero_alerte');
    v_numero_alerte := 'ALR-' || v_annee::TEXT || '-' || LPAD(v_numero_seq::TEXT, 6, '0');

    INSERT INTO public.alertes_communautaires (
        numero_alerte,
        annee,
        semaine_epidemio,
        mois,
        date_detection,
        heure_detection,
        date_notification,
        delai_detection_notification_heures,
        departement_id,
        commune_id,
        arrondissement_id,
        village_nom,
        numero_grappe,
        nom_grappe,
        gps_latitude,
        gps_longitude,
        type_alerte_code,
        type_alerte_nom,
        autre_evenement_precision,
        est_prioritaire,
        symptomes_codes,
        autre_symptome_precision,
        nb_personnes_touchees,
        nb_personnes_mortes,
        nb_animaux_malades,
        nb_animaux_morts,
        concerne_animaux,
        evenement_en_cours,
        mesures_prises,
        sexe,
        age_valeur,
        age_unite,
        nom_cas,
        prenoms_cas,
        cas_nom_prenom,
        npi_cas,
        telephone_contact,
        adresse_domicile,
        date_naissance,
        notificateur_id,
        notificateur_nom_complet,
        notificateur_titre,
        notificateur_telephone,
        centre_sante_nom,
        signature_tactile,
        ascq_superviseur_id,
        statut,
        statut_validation
    ) VALUES (
        v_numero_alerte,
        v_annee,
        v_semaine,
        v_mois,
        p_date_detection,
        p_heure_detection,
        COALESCE(p_date_notification, CURRENT_DATE),
        v_delai_heures,
        p_departement_id,
        p_commune_id,
        p_arrondissement_id,
        TRIM(p_village_nom),
        COALESCE(p_numero_grappe, 1),
        p_nom_grappe,
        p_gps_latitude,
        p_gps_longitude,
        p_type_alerte_code,
        v_type_info.nom,
        p_autre_evenement_precision,
        v_type_info.est_prioritaire,
        COALESCE(p_symptomes_codes, '{}'),
        p_autre_symptome_precision,
        COALESCE(p_nb_personnes_touchees, 1),
        COALESCE(p_nb_personnes_mortes, 0),
        COALESCE(p_nb_animaux_malades, 0),
        COALESCE(p_nb_animaux_morts, 0),
        COALESCE(v_type_info.concerne_animaux, FALSE),
        COALESCE(p_evenement_en_cours, TRUE),
        p_mesures_prises,
        p_sexe,
        p_age_valeur,
        v_age_unite_clean,
        TRIM(p_nom_cas),
        TRIM(p_prenoms_cas),
        TRIM(COALESCE(p_nom_cas, '')) || ' ' || TRIM(COALESCE(p_prenoms_cas, '')),
        p_npi_cas,
        p_telephone_cas,
        p_adresse_cas,
        p_date_naissance_cas,
        v_user_id,
        v_user.prenoms || ' ' || v_user.nom,
        v_user.poste,
        v_user.telephone,
        COALESCE(v_centre_sante, 'CSC'),
        p_signature_tactile,
        v_ascq_superviseur_id,
        'NOTIFIEE',
        'EN_ATTENTE'
    )
    RETURNING id INTO v_alerte_id;

    -- Insertion miroir sans clause ON CONFLICT
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cas_identite_privee') THEN
        INSERT INTO public.cas_identite_privee (
            alerte_id,
            npi_cas,
            nom,
            prenoms,
            telephone_contact,
            adresse_domicile,
            date_naissance
        ) VALUES (
            v_alerte_id,
            p_npi_cas,
            TRIM(p_nom_cas),
            TRIM(p_prenoms_cas),
            p_telephone_cas,
            p_adresse_cas,
            p_date_naissance_cas
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_alerte_id,
        'numero_alerte', v_numero_alerte,
        'semaine_epidemio', v_semaine,
        'annee', v_annee
    );
END;
$$;

-- 5. SYNCHRONISATION DES DONNÉES EXISTANTES DEPUIS LES TABLES MIROIRS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deces_identite_privee') THEN
        UPDATE public.deces_communautaires d
        SET nom_defunt = COALESCE(NULLIF(d.nom_defunt, ''), p.nom_defunt),
            prenoms_defunt = COALESCE(NULLIF(d.prenoms_defunt, ''), p.prenoms_defunt),
            defunt_nom_prenom = COALESCE(NULLIF(d.defunt_nom_prenom, ''), TRIM(COALESCE(p.nom_defunt, '') || ' ' || COALESCE(p.prenoms_defunt, ''))),
            nom_parent = COALESCE(NULLIF(d.nom_parent, ''), p.nom_parent),
            telephone_parent = COALESCE(NULLIF(d.telephone_parent, ''), p.telephone_parent),
            adresse_domicile = COALESCE(NULLIF(d.adresse_domicile, ''), p.adresse_domicile),
            date_naissance = COALESCE(d.date_naissance, p.date_naissance)
        FROM public.deces_identite_privee p
        WHERE p.deces_id = d.id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cas_identite_privee') THEN
        UPDATE public.alertes_communautaires a
        SET nom_cas = COALESCE(NULLIF(a.nom_cas, ''), p.nom),
            prenoms_cas = COALESCE(NULLIF(a.prenoms_cas, ''), p.prenoms),
            cas_nom_prenom = COALESCE(NULLIF(a.cas_nom_prenom, ''), TRIM(COALESCE(p.nom, '') || ' ' || COALESCE(p.prenoms, ''))),
            telephone_contact = COALESCE(NULLIF(a.telephone_contact, ''), p.telephone_contact),
            adresse_domicile = COALESCE(NULLIF(a.adresse_domicile, ''), p.adresse_domicile),
            date_naissance = COALESCE(a.date_naissance, p.date_naissance)
        FROM public.cas_identite_privee p
        WHERE p.alerte_id = a.id;
    END IF;
END $$;

-- 6. PERMISSIONS D'EXÉCUTION
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

SELECT 'CORRECTIF GLOBAL DÉCÈS & ALERTES APPLIQUÉ AVEC SUCCÈS' AS resultat;
