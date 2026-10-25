-- =====================================================================
-- ASCQ BÉNIN - Migration Phase 6 : Moteur de Surveillance & Fiche Pilote d'Alerte
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLES DE RÉFÉRENCE OFFICIELLES (20 TYPES D'ALERTES & 30 SYMPTÔMES)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.types_alertes_reference (
    code INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    description TEXT,
    est_prioritaire BOOLEAN NOT NULL DEFAULT FALSE,
    concerne_animaux BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO public.types_alertes_reference (code, nom, description, est_prioritaire, concerne_animaux) VALUES
(1, 'Rougeole', 'Fièvre avec éruption cutanée généralisée et boutons rouges', TRUE, FALSE),
(2, 'Choléra', 'Diarrhée aqueuse profuse soudaine avec déshydratation rapide', TRUE, FALSE),
(3, 'Méningite', 'Fièvre brutale avec raideur de la nuque, maux de tête intenses ou vomissements', TRUE, FALSE),
(4, 'PFA - Paralysie Flasque Aiguë', 'Faiblesse ou paralysie musculaire brutale d''un membre sans traumatisme (suspicion poliomyélite)', TRUE, FALSE),
(5, 'FHV Lassa (Fièvre Hémorragique)', 'Fièvre persistante ne répondant pas aux antipaludiques avec maux de gorge, douleurs musculaires ou saignements', TRUE, FALSE),
(6, 'FHV Ebola', 'Fièvre aiguë avec fatigue extrême et manifestations hémorragiques', TRUE, FALSE),
(7, 'Fièvre Jaune', 'Fièvre avec jaunisse (yeux jaunes) apparaissant dans les 14 jours', TRUE, FALSE),
(8, 'Dengue', 'Fièvre élevée soudaine avec douleurs rétro-orbitaires et courbatures intenses', FALSE, FALSE),
(9, 'Anthrax / Charbon bactéridien', 'Lésion cutanée noirâtre avec œdème ou détresse respiratoire après contact animal', FALSE, TRUE),
(10, 'Shigellose / Dysenterie bacillaire', 'Diarrhée avec présence visible de sang et de glaires, douleurs abdominales', FALSE, FALSE),
(11, 'Grippe Aviaire', 'Signes grippaux sévères après exposition à des volailles malades ou mortes', FALSE, TRUE),
(12, 'Rage humaine', 'Troubles du comportement, hydrophobie (peur de l''eau) suite à morsure animale', TRUE, TRUE),
(13, 'COVID-19', 'Fièvre, toux sèche, perte du goût ou de l''odorat, difficultés respiratoires', FALSE, FALSE),
(14, 'Mpox (Variole du singe)', 'Éruption vésiculeuse ou pustuleuse avec ganglions enflés et fièvre', FALSE, FALSE),
(15, 'Morsure de chien', 'Morsure ou griffure par un canidé suspect de rage', FALSE, TRUE),
(16, 'Morsure de serpent', 'Envenimation suite à une morsure de reptile', FALSE, FALSE),
(17, 'Morsure d''autres animaux', 'Morsure par chat, singe ou autre animal sauvage/domestique', FALSE, TRUE),
(18, 'Épizootie / Animaux malades', 'Nombre inhabituel d''animaux présentant des signes pathologiques', FALSE, TRUE),
(19, 'Mortalité inhabituelle d''animaux', 'Découverte de cadavres groupés d''animaux sauvages ou domestiques', FALSE, TRUE),
(20, 'Autre événement inhabituel', 'Tout phénomène anormal de santé communautaire à préciser', FALSE, FALSE)
ON CONFLICT (code) DO UPDATE SET 
    nom = EXCLUDED.nom,
    est_prioritaire = EXCLUDED.est_prioritaire,
    concerne_animaux = EXCLUDED.concerne_animaux;

CREATE TABLE IF NOT EXISTS public.symptomes_reference (
    code INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    categorie TEXT DEFAULT 'GENERAL'
);

INSERT INTO public.symptomes_reference (code, nom, categorie) VALUES
(1, 'Fièvre', 'GENERAL'),
(2, 'Boutons sur le corps / Éruption cutanée', 'CUTANE'),
(3, 'Diarrhée aqueuse', 'DIGESTIF'),
(4, 'Vomissements', 'DIGESTIF'),
(5, 'Selles avec du sang', 'DIGESTIF'),
(6, 'Maux de tête intenses', 'NEUROLOGIQUE'),
(7, 'Saignements inexpliqués (nez, gencives, peau)', 'HEMORRAGIQUE'),
(8, 'Raideur de la nuque', 'NEUROLOGIQUE'),
(9, 'Altération de la conscience / Somnolence', 'NEUROLOGIQUE'),
(10, 'Bombement de la fontanelle (nourrisson)', 'NEUROLOGIQUE'),
(11, 'Peur de la lumière (photophobie)', 'NEUROLOGIQUE'),
(12, 'Peur de l''eau ou des bruits d''eau (hydrophobie)', 'NEUROLOGIQUE'),
(13, 'Convulsions', 'NEUROLOGIQUE'),
(14, 'Yeux jaunes / Ictère', 'GENERAL'),
(15, 'Fatigue intense / Faiblesse extrême', 'GENERAL'),
(16, 'Nausées', 'DIGESTIF'),
(17, 'Maux de gorge', 'RESPIRATOIRE'),
(18, 'Toux', 'RESPIRATOIRE'),
(19, 'Douleurs abdominales', 'DIGESTIF'),
(20, 'Manque d''appétit / Refus de téter', 'GENERAL'),
(21, 'Paralysie ou difficulté brutale à marcher', 'NEUROLOGIQUE'),
(22, 'Courbatures ou fatigues musculaires', 'GENERAL'),
(23, 'Douleurs musculaires ou articulaires', 'GENERAL'),
(24, 'Présence de sang dans les urines', 'URINAIRE'),
(25, 'Irritabilité ou agressivité inhabituelle', 'NEUROLOGIQUE'),
(26, 'Gonflement des ganglions lymphatiques', 'GENERAL'),
(27, 'Crachats teintés de sang', 'RESPIRATOIRE'),
(28, 'Lésions cutanées / Ulcères', 'CUTANE'),
(29, 'Difficultés respiratoires / Essoufflement', 'RESPIRATOIRE'),
(30, 'Autres symptômes à préciser', 'AUTRE')
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom;

-- ---------------------------------------------------------------------
-- 2. TABLE PRINCIPALE : ALERTES COMMUNAUTAIRES
-- ---------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS seq_numero_alerte START 1;

CREATE TABLE IF NOT EXISTS public.alertes_communautaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_alerte TEXT UNIQUE NOT NULL, -- Format ALR-2026-000001
    
    -- Temporalité épidémiologique (Semaine commence le lundi)
    annee INTEGER NOT NULL,
    semaine_epidemio INTEGER NOT NULL,
    mois INTEGER NOT NULL,
    date_notification DATE NOT NULL DEFAULT CURRENT_DATE,
    date_debut_maladie DATE,
    heure_survenue TIME,
    date_detection DATE NOT NULL DEFAULT CURRENT_DATE,
    heure_detection TIME,
    delai_detection_notification_heures NUMERIC,
    
    -- Localisation administrative
    departement_id UUID NOT NULL REFERENCES public.departements(id),
    zone_sanitaire_id UUID REFERENCES public.zones_sanitaires(id),
    commune_id UUID NOT NULL REFERENCES public.communes(id),
    arrondissement_id UUID NOT NULL REFERENCES public.arrondissements(id),
    village_id UUID REFERENCES public.villages(id),
    village_nom TEXT NOT NULL,
    numero_grappe INTEGER DEFAULT 1,
    nom_grappe TEXT,
    gps_latitude NUMERIC,
    gps_longitude NUMERIC,
    
    -- Type d'alerte & Symptômes
    type_alerte_code INTEGER NOT NULL REFERENCES public.types_alertes_reference(code),
    type_alerte_nom TEXT NOT NULL,
    autre_evenement_precision TEXT,
    est_prioritaire BOOLEAN NOT NULL DEFAULT FALSE,
    symptomes_codes INTEGER[] DEFAULT '{}',
    autre_symptome_precision TEXT,
    
    -- Bilan d'impact
    nb_personnes_touchees INTEGER NOT NULL DEFAULT 1,
    nb_personnes_mortes INTEGER NOT NULL DEFAULT 0,
    nb_animaux_malades INTEGER NOT NULL DEFAULT 0,
    nb_animaux_morts INTEGER NOT NULL DEFAULT 0,
    animaux_impliques BOOLEAN NOT NULL DEFAULT FALSE,
    evenement_en_cours BOOLEAN NOT NULL DEFAULT TRUE,
    mesures_prises TEXT,
    
    -- Données démographiques du cas index (anonymisées)
    sexe TEXT CHECK (sexe IN ('M', 'F')),
    age_valeur INTEGER,
    age_unite TEXT CHECK (age_unite IN ('JOURS', 'MOIS', 'ANS')),
    
    -- Notificateur
    notificateur_id UUID NOT NULL REFERENCES public.utilisateurs(id),
    notificateur_nom_complet TEXT NOT NULL,
    notificateur_titre TEXT NOT NULL, -- 'ASCQ' ou 'RC'
    notificateur_telephone TEXT NOT NULL,
    centre_sante_nom TEXT,
    signature_tactile TEXT, -- Données base64 ou svg de la signature
    ascq_superviseur_id UUID REFERENCES public.utilisateurs(id),
    
    -- Statut du cycle de vie
    statut TEXT NOT NULL DEFAULT 'NOTIFIEE' CHECK (statut IN ('NOTIFIEE', 'RECUE', 'VERIFIEE', 'INVESTIGUEE', 'CLOTUREE', 'REJETEE')),
    resultat_verification TEXT DEFAULT 'EN_ATTENTE' CHECK (resultat_verification IN ('EN_ATTENTE', 'AVEREE', 'NON_AVEREE')),
    date_verification TIMESTAMPTZ,
    verifie_par UUID REFERENCES public.utilisateurs(id),
    commentaire_verification TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_alertes_numero ON public.alertes_communautaires(numero_alerte);
CREATE INDEX IF NOT EXISTS idx_alertes_notif_id ON public.alertes_communautaires(notificateur_id);
CREATE INDEX IF NOT EXISTS idx_alertes_ascq_id ON public.alertes_communautaires(ascq_superviseur_id);
CREATE INDEX IF NOT EXISTS idx_alertes_epidemio ON public.alertes_communautaires(annee, semaine_epidemio);
CREATE INDEX IF NOT EXISTS idx_alertes_statut ON public.alertes_communautaires(statut);
CREATE INDEX IF NOT EXISTS idx_alertes_prioritaire ON public.alertes_communautaires(est_prioritaire);

-- ---------------------------------------------------------------------
-- 3. TABLE PRIVÉE : IDENTITÉ DU CAS (SOUS RLS STRICTE)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cas_identite_privee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alerte_id UUID NOT NULL REFERENCES public.alertes_communautaires(id) ON DELETE CASCADE,
    npi_cas TEXT,
    nom TEXT,
    prenoms TEXT,
    telephone_contact TEXT,
    adresse_domicile TEXT,
    date_naissance DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cas_identite_alerte_id ON public.cas_identite_privee(alerte_id);

-- ---------------------------------------------------------------------
-- 4. POLITIQUES RLS (ROW LEVEL SECURITY)
-- ---------------------------------------------------------------------

ALTER TABLE public.alertes_communautaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cas_identite_privee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.types_alertes_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptomes_reference ENABLE ROW LEVEL SECURITY;

-- Lecture des tables de référence
DROP POLICY IF EXISTS "Lecture types alertes pour tous" ON public.types_alertes_reference;
CREATE POLICY "Lecture types alertes pour tous" ON public.types_alertes_reference FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lecture symptomes pour tous" ON public.symptomes_reference;
CREATE POLICY "Lecture symptomes pour tous" ON public.symptomes_reference FOR SELECT USING (true);

-- Politiques sur alertes_communautaires
DROP POLICY IF EXISTS "Lecture alertes autorisees" ON public.alertes_communautaires;
DROP POLICY IF EXISTS "Creation alertes notificateur" ON public.alertes_communautaires;
DROP POLICY IF EXISTS "Mise a jour alertes superviseur" ON public.alertes_communautaires;

-- Un utilisateur voit les alertes qu'il a notifiées ou celles de ses relais (si ASCQ)
CREATE POLICY "Lecture alertes autorisees" ON public.alertes_communautaires
    FOR SELECT USING (
        notificateur_id = auth.uid() OR
        ascq_superviseur_id = auth.uid()
    );

CREATE POLICY "Creation alertes notificateur" ON public.alertes_communautaires
    FOR INSERT WITH CHECK (
        notificateur_id = auth.uid()
    );

CREATE POLICY "Mise a jour alertes superviseur" ON public.alertes_communautaires
    FOR UPDATE USING (
        notificateur_id = auth.uid() OR
        ascq_superviseur_id = auth.uid()
    );

-- Politiques sur cas_identite_privee (Stricte : créateur ou superviseur direct uniquement)
DROP POLICY IF EXISTS "Acces securise identite cas" ON public.cas_identite_privee;
CREATE POLICY "Acces securise identite cas" ON public.cas_identite_privee
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.alertes_communautaires a
            WHERE a.id = alerte_id AND (a.notificateur_id = auth.uid() OR a.ascq_superviseur_id = auth.uid())
        )
    );

-- ---------------------------------------------------------------------
-- 5. FONCTIONS RPC SÉCURISÉES (SECURITY DEFINER)
-- ---------------------------------------------------------------------

-- A. Fonction de création d'une alerte avec calcul automatique de la semaine épidémiologique
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
    -- Données privées du cas index
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
    v_is_prioritaire BOOLEAN;
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
        RAISE EXCEPTION 'Non authentifié. Veuillez vous connecter.';
    END IF;

    SELECT * INTO v_user FROM public.utilisateurs WHERE id = v_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profil utilisateur introuvable.';
    END IF;

    -- Si c'est un RC, identifier son ASCQ superviseur
    IF v_user.poste = 'RC' THEN
        SELECT ascq_id INTO v_ascq_superviseur_id 
        FROM public.relais_communautaires 
        WHERE user_id = v_user_id LIMIT 1;
    ELSE
        v_ascq_superviseur_id := v_user_id;
    END IF;

    -- Centre de santé
    SELECT nom INTO v_centre_sante FROM public.structures_sante 
    WHERE commune_id = p_commune_id LIMIT 1;

    -- Informations sur le type d'alerte
    SELECT nom, est_prioritaire, concerne_animaux INTO v_type_info 
    FROM public.types_alertes_reference 
    WHERE code = p_type_alerte_code;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Type d''alerte invalide.';
    END IF;

    -- Calculs temporels épidémiologiques (Norme Bénin : Semaine débute le lundi)
    v_annee := EXTRACT(ISOYEAR FROM COALESCE(p_date_notification, CURRENT_DATE))::INT;
    v_semaine := EXTRACT(WEEK FROM COALESCE(p_date_notification, CURRENT_DATE))::INT;
    v_mois := EXTRACT(MONTH FROM COALESCE(p_date_notification, CURRENT_DATE))::INT;

    -- Calcul du délai détection -> notification (en heures)
    IF p_date_detection IS NOT NULL AND p_date_notification IS NOT NULL THEN
        v_delai_heures := (p_date_notification - p_date_detection) * 24;
    END IF;

    -- Génération du numéro unique séquentiel ALR-AAAA-XXXXXX
    v_numero_seq := nextval('seq_numero_alerte');
    v_numero_alerte := 'ALR-' || v_annee::TEXT || '-' || LPAD(v_numero_seq::TEXT, 6, '0');

    -- 1. Insertion dans la table principale des alertes
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

    -- 2. Insertion dans la table privée d'identité du cas
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
        UPPER(TRIM(p_nom_cas)),
        TRIM(p_prenoms_cas),
        p_telephone_cas,
        p_adresse_cas,
        p_date_naissance_cas
    );

    RETURN jsonb_build_object(
        'success', true,
        'alerte_id', v_alerte_id,
        'numero_alerte', v_numero_alerte,
        'annee', v_annee,
        'semaine_epidemio', v_semaine,
        'est_prioritaire', v_type_info.est_prioritaire,
        'message', 'L''alerte sanitaire a été enregistrée avec succès sous le numéro ' || v_numero_alerte
    );
END;
$$;

-- B. Fonction pour lister les fiches d'alerte accessibles
CREATE OR REPLACE FUNCTION public.lister_mes_alertes()
RETURNS TABLE (
    id UUID,
    numero_alerte TEXT,
    annee INTEGER,
    semaine_epidemio INTEGER,
    date_notification DATE,
    village_nom TEXT,
    commune_nom TEXT,
    type_alerte_nom TEXT,
    est_prioritaire BOOLEAN,
    nb_personnes_touchees INTEGER,
    nb_personnes_mortes INTEGER,
    statut TEXT,
    resultat_verification TEXT,
    notificateur_nom_complet TEXT,
    notificateur_titre TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.numero_alerte,
        a.annee,
        a.semaine_epidemio,
        a.date_notification,
        a.village_nom,
        c.nom AS commune_nom,
        a.type_alerte_nom,
        a.est_prioritaire,
        a.nb_personnes_touchees,
        a.nb_personnes_mortes,
        a.statut,
        a.resultat_verification,
        a.notificateur_nom_complet,
        a.notificateur_titre,
        a.created_at
    FROM public.alertes_communautaires a
    JOIN public.communes c ON a.commune_id = c.id
    WHERE a.notificateur_id = auth.uid() OR a.ascq_superviseur_id = auth.uid()
    ORDER BY a.created_at DESC;
END;
$$;

-- C. Obtenir le détail complet d'une alerte
CREATE OR REPLACE FUNCTION public.obtenir_detail_alerte(p_alerte_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_alerte RECORD;
    v_cas RECORD;
    v_symptomes JSONB;
BEGIN
    SELECT a.*, d.nom AS dep_nom, c.nom AS com_nom, arr.nom AS arr_nom
    INTO v_alerte
    FROM public.alertes_communautaires a
    JOIN public.departements d ON a.departement_id = d.id
    JOIN public.communes c ON a.commune_id = c.id
    JOIN public.arrondissements arr ON a.arrondissement_id = arr.id
    WHERE a.id = p_alerte_id AND (a.notificateur_id = auth.uid() OR a.ascq_superviseur_id = auth.uid());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Alerte introuvable ou accès non autorisé.';
    END IF;

    -- Données privées du cas
    SELECT * INTO v_cas FROM public.cas_identite_privee WHERE alerte_id = p_alerte_id;

    -- Libellés des symptômes sélectionnés
    SELECT jsonb_agg(s.nom) INTO v_symptomes
    FROM public.symptomes_reference s
    WHERE s.code = ANY(v_alerte.symptomes_codes);

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
        'departement_nom', v_alerte.dep_nom,
        'commune_nom', v_alerte.com_nom,
        'arrondissement_nom', v_alerte.arr_nom,
        'village_nom', v_alerte.village_nom,
        'numero_grappe', v_alerte.numero_grappe,
        'nom_grappe', v_alerte.nom_grappe,
        'gps_latitude', v_alerte.gps_latitude,
        'gps_longitude', v_alerte.gps_longitude,
        'type_alerte_code', v_alerte.type_alerte_code,
        'type_alerte_nom', v_alerte.type_alerte_nom,
        'autre_evenement_precision', v_alerte.autre_evenement_precision,
        'est_prioritaire', v_alerte.est_prioritaire,
        'symptomes_noms', COALESCE(v_symptomes, '[]'::jsonb),
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
        'notificateur_nom_complet', v_alerte.notificateur_nom_complet,
        'notificateur_titre', v_alerte.notificateur_titre,
        'notificateur_telephone', v_alerte.notificateur_telephone,
        'centre_sante_nom', v_alerte.centre_sante_nom,
        'statut', v_alerte.statut,
        'resultat_verification', v_alerte.resultat_verification,
        'date_verification', v_alerte.date_verification,
        'commentaire_verification', v_alerte.commentaire_verification,
        'created_at', v_alerte.created_at,
        'cas_prive', CASE WHEN v_cas.id IS NOT NULL THEN jsonb_build_object(
            'nom', v_cas.nom,
            'prenoms', v_cas.prenoms,
            'telephone', v_cas.telephone_contact,
            'adresse', v_cas.adresse_domicile,
            'npi', v_cas.npi_cas,
            'date_naissance', v_cas.date_naissance
        ) ELSE NULL END
    );
END;
$$;

-- D. Valider / Vérifier une alerte par l'ASCQ superviseur
CREATE OR REPLACE FUNCTION public.verifier_alerte(
    p_alerte_id UUID,
    p_resultat TEXT,
    p_commentaire TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    IF p_resultat NOT IN ('AVEREE', 'NON_AVEREE') THEN
        RAISE EXCEPTION 'Résultat de vérification invalide (doit être AVEREE ou NON_AVEREE).';
    END IF;

    UPDATE public.alertes_communautaires
    SET statut = 'VERIFIEE',
        resultat_verification = p_resultat,
        commentaire_verification = TRIM(p_commentaire),
        date_verification = NOW(),
        verifie_par = v_user_id,
        updated_at = NOW()
    WHERE id = p_alerte_id AND (ascq_superviseur_id = v_user_id OR notificateur_id = v_user_id);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Alerte introuvable ou vous n''êtes pas le superviseur de cette alerte.';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'L''alerte a été marquée comme ' || p_resultat
    );
END;
$$;

-- Permissions d'exécution
GRANT EXECUTE ON FUNCTION public.creer_notification_alerte TO authenticated;
GRANT EXECUTE ON FUNCTION public.lister_mes_alertes TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtenir_detail_alerte TO authenticated;
GRANT EXECUTE ON FUNCTION public.verifier_alerte TO authenticated;
