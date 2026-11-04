-- ==============================================================================
-- SANTÉCOM BÉNIN - LEVÉE TOTALE DES PROTECTIONS / MASQUAGES SUR LES FICHES
-- Les données nominatives (défunt, cas index, parents, téléphones, adresses)
-- sont désormais accessibles directement sans restriction ni masquage.
-- ==============================================================================

-- 1. AJOUT DES COLONNES NOMINATIVES DIRECTEMENT SUR LES TABLES MAÎTRESSES
ALTER TABLE public.deces_communautaires ADD COLUMN IF NOT EXISTS nom_defunt TEXT;
ALTER TABLE public.deces_communautaires ADD COLUMN IF NOT EXISTS prenoms_defunt TEXT;
ALTER TABLE public.deces_communautaires ADD COLUMN IF NOT EXISTS defunt_nom_prenom TEXT;
ALTER TABLE public.deces_communautaires ADD COLUMN IF NOT EXISTS npi_defunt TEXT;
ALTER TABLE public.deces_communautaires ADD COLUMN IF NOT EXISTS nom_parent TEXT;
ALTER TABLE public.deces_communautaires ADD COLUMN IF NOT EXISTS telephone_parent TEXT;
ALTER TABLE public.deces_communautaires ADD COLUMN IF NOT EXISTS adresse_domicile TEXT;
ALTER TABLE public.deces_communautaires ADD COLUMN IF NOT EXISTS date_naissance DATE;

ALTER TABLE public.alertes_communautaires ADD COLUMN IF NOT EXISTS nom_cas TEXT;
ALTER TABLE public.alertes_communautaires ADD COLUMN IF NOT EXISTS prenoms_cas TEXT;
ALTER TABLE public.alertes_communautaires ADD COLUMN IF NOT EXISTS cas_nom_prenom TEXT;
ALTER TABLE public.alertes_communautaires ADD COLUMN IF NOT EXISTS npi_cas TEXT;
ALTER TABLE public.alertes_communautaires ADD COLUMN IF NOT EXISTS telephone_contact TEXT;
ALTER TABLE public.alertes_communautaires ADD COLUMN IF NOT EXISTS adresse_domicile TEXT;
ALTER TABLE public.alertes_communautaires ADD COLUMN IF NOT EXISTS date_naissance DATE;
ALTER TABLE public.alertes_communautaires ADD COLUMN IF NOT EXISTS nom_tuteur TEXT;

-- 2. SYNCHRONISATION DES DONNÉES EXISTANTES
UPDATE public.deces_communautaires d
SET nom_defunt = COALESCE(d.nom_defunt, p.nom_defunt),
    prenoms_defunt = COALESCE(d.prenoms_defunt, p.prenoms_defunt),
    defunt_nom_prenom = COALESCE(d.defunt_nom_prenom, TRIM(COALESCE(p.nom_defunt, '') || ' ' || COALESCE(p.prenoms_defunt, ''))),
    npi_defunt = COALESCE(d.npi_defunt, p.npi_defunt),
    nom_parent = COALESCE(d.nom_parent, p.nom_parent),
    telephone_parent = COALESCE(d.telephone_parent, p.telephone_parent),
    adresse_domicile = COALESCE(d.adresse_domicile, p.adresse_domicile),
    date_naissance = COALESCE(d.date_naissance, p.date_naissance)
FROM public.deces_identite_privee p
WHERE p.deces_id = d.id;

UPDATE public.alertes_communautaires a
SET nom_cas = COALESCE(a.nom_cas, p.nom),
    prenoms_cas = COALESCE(a.prenoms_cas, p.prenoms),
    cas_nom_prenom = COALESCE(a.cas_nom_prenom, TRIM(COALESCE(p.nom, '') || ' ' || COALESCE(p.prenoms, ''))),
    npi_cas = COALESCE(a.npi_cas, p.npi_cas),
    telephone_contact = COALESCE(a.telephone_contact, p.telephone_contact),
    adresse_domicile = COALESCE(a.adresse_domicile, p.adresse_domicile),
    date_naissance = COALESCE(a.date_naissance, p.date_naissance)
FROM public.cas_identite_privee p
WHERE p.alerte_id = a.id;

-- 3. DÉVERROUILLAGE TOTAL DES POLITIQUES RLS SUR LES TABLES D'IDENTITÉ
ALTER TABLE public.deces_identite_privee ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acces identite deces privee" ON public.deces_identite_privee;
DROP POLICY IF EXISTS "acces_total_identite_deces" ON public.deces_identite_privee;
CREATE POLICY "acces_total_identite_deces" ON public.deces_identite_privee
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.cas_identite_privee ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acces securise identite cas" ON public.cas_identite_privee;
DROP POLICY IF EXISTS "acces_total_identite_cas" ON public.cas_identite_privee;
CREATE POLICY "acces_total_identite_cas" ON public.cas_identite_privee
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. MISE À JOUR DE LA FONCTION creer_notification_deces (SANS VERROU)
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
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié. Veuillez vous reconnecter.'; END IF;

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

    v_seq := nextval('seq_numero_deces');
    v_numero := 'DEC-' || v_annee::TEXT || '-' || LPAD(v_seq::TEXT, 6, '0');

    -- Insertion dans la table maîtresse avec identité complète
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
        p_age_unite,
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

    -- Conserver également dans la table deces_identite_privee pour rétrocompatibilité
    INSERT INTO public.deces_identite_privee (
        deces_id,
        npi_defunt,
        nom_defunt,
        prenoms_defunt,
        date_naissance,
        nom_parent,
        telephone_parent,
        adresse_domicile
    ) VALUES (
        v_id,
        p_npi_defunt,
        TRIM(p_nom_defunt),
        TRIM(p_prenoms_defunt),
        p_date_naissance,
        p_nom_parent,
        p_telephone_parent,
        p_adresse_domicile
    );

    IF p_registre_id IS NOT NULL THEN
        UPDATE public.registre_alertes_rumeurs
        SET deces_lie_id = v_id
        WHERE id = p_registre_id;
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

-- 5. MISE À JOUR DE LA FONCTION creer_notification_alerte (SANS VERROU)
CREATE OR REPLACE FUNCTION public.creer_notification_alerte(
    p_date_notification DATE,
    p_date_debut_maladie DATE,
    p_heure_survenue TIME,
    p_date_detection DATE,
    p_heure_detection TIME,
    p_departement_id UUID,
    p_zone_sanitaire_id UUID,
    p_commune_id UUID,
    p_arrondissement_id UUID,
    p_village_id UUID,
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

    v_numero_seq := nextval('seq_numero_alerte');
    v_numero_alerte := 'ALT-' || v_annee::TEXT || '-' || LPAD(v_numero_seq::TEXT, 6, '0');

    -- Insertion dans la table maîtresse avec identité complète
    INSERT INTO public.alertes_communautaires (
        numero_alerte,
        annee,
        semaine_epidemio,
        mois,
        date_notification,
        date_debut_maladie,
        heure_survenue,
        date_detection,
        heure_detection,
        delai_detection_notification_heures,
        departement_id,
        zone_sanitaire_id,
        commune_id,
        arrondissement_id,
        village_id,
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
        animaux_impliques,
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
        resultat_verification
    ) VALUES (
        v_numero_alerte,
        v_annee,
        v_semaine,
        v_mois,
        COALESCE(p_date_notification, CURRENT_DATE),
        p_date_debut_maladie,
        p_heure_survenue,
        COALESCE(p_date_detection, CURRENT_DATE),
        p_heure_detection,
        v_delai_heures,
        p_departement_id,
        p_zone_sanitaire_id,
        p_commune_id,
        p_arrondissement_id,
        p_village_id,
        p_village_nom,
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
        p_age_unite,
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

    -- Conserver également dans la table cas_identite_privee pour rétrocompatibilité
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

    RETURN jsonb_build_object(
        'success', true,
        'id', v_alerte_id,
        'numero_alerte', v_numero_alerte,
        'semaine_epidemio', v_semaine,
        'annee', v_annee
    );
END;
$$;

-- 6. MISE À JOUR DE LA FONCTION obtenir_detail_alerte (RESTITUTION NOMINATIVE TRANSPARENTE)
CREATE OR REPLACE FUNCTION public.obtenir_detail_alerte(p_alerte_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_alerte RECORD;
    v_cas RECORD;
BEGIN
    SELECT a.*, 
           d.nom AS dep_nom, 
           c.nom AS com_nom, 
           arr.nom AS arr_nom,
           u.nom AS notif_nom,
           u.prenoms AS notif_prenoms,
           u.telephone AS notif_tel
    INTO v_alerte
    FROM public.alertes_communautaires a
    JOIN public.departements d ON a.departement_id = d.id
    JOIN public.communes c ON a.commune_id = c.id
    JOIN public.arrondissements arr ON a.arrondissement_id = arr.id
    LEFT JOIN public.utilisateurs u ON a.notificateur_id = u.id
    WHERE a.id = p_alerte_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Alerte introuvable.';
    END IF;

    -- Récupération identité
    SELECT * INTO v_cas FROM public.cas_identite_privee WHERE alerte_id = p_alerte_id;

    RETURN jsonb_build_object(
        'id', v_alerte.id,
        'numero_alerte', v_alerte.numero_alerte,
        'annee', v_alerte.annee,
        'semaine_epidemio', v_alerte.semaine_epidemio,
        'mois', v_alerte.mois,
        'date_notification', v_alerte.date_notification,
        'date_debut_maladie', v_alerte.date_debut_maladie,
        'heure_survenue', v_alerte.heure_survenue,
        'date_detection', v_alerte.date_detection,
        'heure_detection', v_alerte.heure_detection,
        'delai_detection_notification_heures', v_alerte.delai_detection_notification_heures,
        'departement_id', v_alerte.departement_id,
        'departement_nom', v_alerte.dep_nom,
        'commune_id', v_alerte.commune_id,
        'commune_nom', v_alerte.com_nom,
        'arrondissement_id', v_alerte.arrondissement_id,
        'arrondissement_nom', v_alerte.arr_nom,
        'village_id', v_alerte.village_id,
        'village_nom', v_alerte.village_nom,
        'numero_grappe', v_alerte.numero_grappe,
        'nom_grappe', v_alerte.nom_grappe,
        'gps_latitude', v_alerte.gps_latitude,
        'gps_longitude', v_alerte.gps_longitude,
        'type_alerte_code', v_alerte.type_alerte_code,
        'type_alerte_nom', v_alerte.type_alerte_nom,
        'autre_evenement_precision', v_alerte.autre_evenement_precision,
        'est_prioritaire', v_alerte.est_prioritaire,
        'symptomes_codes', v_alerte.symptomes_codes,
        'autre_symptome_precision', v_alerte.autre_symptome_precision,
        'nb_personnes_touchees', v_alerte.nb_personnes_touchees,
        'nb_personnes_mortes', v_alerte.nb_personnes_mortes,
        'nb_animaux_malades', v_alerte.nb_animaux_malades,
        'nb_animaux_morts', v_alerte.nb_animaux_morts,
        'animaux_impliques', v_alerte.animaux_impliques,
        'evenement_en_cours', v_alerte.evenement_en_cours,
        'mesures_prises', v_alerte.mesures_prises,
        'sexe', v_alerte.sexe,
        'age_valeur', v_alerte.age_valeur,
        'age_unite', v_alerte.age_unite,
        'nom_cas', COALESCE(v_alerte.nom_cas, v_cas.nom),
        'prenoms_cas', COALESCE(v_alerte.prenoms_cas, v_cas.prenoms),
        'telephone_contact', COALESCE(v_alerte.telephone_contact, v_cas.telephone_contact),
        'adresse_domicile', COALESCE(v_alerte.adresse_domicile, v_cas.adresse_domicile),
        'npi_cas', COALESCE(v_alerte.npi_cas, v_cas.npi_cas),
        'notificateur_id', v_alerte.notificateur_id,
        'notificateur_nom_complet', COALESCE(v_alerte.notificateur_nom_complet, v_alerte.notif_nom || ' ' || v_alerte.notif_prenoms),
        'notificateur_titre', v_alerte.notificateur_titre,
        'notificateur_telephone', COALESCE(v_alerte.notificateur_telephone, v_alerte.notif_tel),
        'centre_sante_nom', v_alerte.centre_sante_nom,
        'signature_tactile', v_alerte.signature_tactile,
        'statut', v_alerte.statut,
        'resultat_verification', v_alerte.resultat_verification,
        'date_verification', v_alerte.date_verification,
        'commentaire_verification', v_alerte.commentaire_verification,
        'created_at', v_alerte.created_at,
        'cas_prive', jsonb_build_object(
            'nom', COALESCE(v_alerte.nom_cas, v_cas.nom, ''),
            'prenoms', COALESCE(v_alerte.prenoms_cas, v_cas.prenoms, ''),
            'telephone', COALESCE(v_alerte.telephone_contact, v_cas.telephone_contact, ''),
            'adresse', COALESCE(v_alerte.adresse_domicile, v_cas.adresse_domicile, ''),
            'npi', COALESCE(v_alerte.npi_cas, v_cas.npi_cas, '')
        )
    );
END;
$$;

-- 7. MISE À JOUR DE LA FONCTION obtenir_detail_deces (RESTITUTION NOMINATIVE TRANSPARENTE)
CREATE OR REPLACE FUNCTION public.obtenir_detail_deces(p_deces_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deces RECORD;
    v_prive RECORD;
BEGIN
    SELECT d.*, 
           dep.nom AS dep_nom, 
           c.nom AS com_nom, 
           arr.nom AS arr_nom,
           u.nom AS notif_nom,
           u.prenoms AS notif_prenoms,
           u.telephone AS notif_tel
    INTO v_deces
    FROM public.deces_communautaires d
    JOIN public.departements dep ON d.departement_id = dep.id
    JOIN public.communes c ON d.commune_id = c.id
    JOIN public.arrondissements arr ON d.arrondissement_id = arr.id
    LEFT JOIN public.utilisateurs u ON d.notificateur_id = u.id
    WHERE d.id = p_deces_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fiche de décès introuvable.';
    END IF;

    SELECT * INTO v_prive FROM public.deces_identite_privee WHERE deces_id = p_deces_id;

    RETURN jsonb_build_object(
        'id', v_deces.id,
        'numero_deces', v_deces.numero_deces,
        'annee', v_deces.annee,
        'semaine_epidemio', v_deces.semaine_epidemio,
        'mois', v_deces.mois,
        'date_deces', v_deces.date_deces,
        'heure_deces', v_deces.heure_deces,
        'date_notification', v_deces.date_notification,
        'delai_deces_notification_heures', v_deces.delai_deces_notification_heures,
        'departement_id', v_deces.departement_id,
        'departement_nom', v_deces.dep_nom,
        'commune_id', v_deces.commune_id,
        'commune_nom', v_deces.com_nom,
        'arrondissement_id', v_deces.arrondissement_id,
        'arrondissement_nom', v_deces.arr_nom,
        'village_nom', v_deces.village_nom,
        'numero_grappe', v_deces.numero_grappe,
        'nom_grappe', v_deces.nom_grappe,
        'gps_latitude', v_deces.gps_latitude,
        'gps_longitude', v_deces.gps_longitude,
        'type_deces_code', v_deces.type_deces_code,
        'type_deces_nom', v_deces.type_deces_nom,
        'lieu_deces_code', v_deces.lieu_deces_code,
        'lieu_deces_nom', v_deces.lieu_deces_nom,
        'lieu_pays_etranger', v_deces.lieu_pays_etranger,
        'circonstance_code', v_deces.circonstance_code,
        'circonstance_nom', v_deces.circonstance_nom,
        'circonstance_autre_precision', v_deces.circonstance_autre_precision,
        'sexe', v_deces.sexe,
        'age_valeur', v_deces.age_valeur,
        'age_unite', v_deces.age_unite,
        'nom_defunt', COALESCE(v_deces.nom_defunt, v_prive.nom_defunt),
        'prenoms_defunt', COALESCE(v_deces.prenoms_defunt, v_prive.prenoms_defunt),
        'defunt_nom_prenom', COALESCE(v_deces.defunt_nom_prenom, TRIM(COALESCE(v_prive.nom_defunt, '') || ' ' || COALESCE(v_prive.prenoms_defunt, ''))),
        'nom_parent', COALESCE(v_deces.nom_parent, v_prive.nom_parent),
        'telephone_parent', COALESCE(v_deces.telephone_parent, v_prive.telephone_parent),
        'adresse_domicile', COALESCE(v_deces.adresse_domicile, v_prive.adresse_domicile),
        'npi_defunt', COALESCE(v_deces.npi_defunt, v_prive.npi_defunt),
        'notificateur_id', v_deces.notificateur_id,
        'notificateur_nom_complet', COALESCE(v_deces.notificateur_nom_complet, v_deces.notif_nom || ' ' || v_deces.notif_prenoms),
        'notificateur_titre', v_deces.notificateur_titre,
        'notificateur_telephone', COALESCE(v_deces.notificateur_telephone, v_deces.notif_tel),
        'centre_sante_nom', v_deces.centre_sante_nom,
        'signature_tactile', v_deces.signature_tactile,
        'statut', v_deces.statut,
        'created_at', v_deces.created_at
    );
END;
$$;

-- 8. ATTRIBUTION GLOBALE DES PRIVILÈGES SÉCURISÉE (SANS ERREUR 42883)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO authenticated, anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;

SELECT 'LEVÉE DES PROTECTIONS TERMINÉE : TOUTES LES DONNÉES SONT VISIBLES DIRECTEMENT' AS statut;
