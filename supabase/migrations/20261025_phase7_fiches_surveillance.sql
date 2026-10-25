-- =====================================================================
-- ASCQ BÉNIN - Migration Phase 7 : Autres fiches de surveillance
-- 1. Registre des alertes et rumeurs (REG-)
-- 2. Notification de décès (DEC-)
-- 3. Investigation d'un événement (INV-)
-- 4. Rapport hebdomadaire de surveillance (RAP-)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. REGISTRE DES ALERTES ET RUMEURS (REG-)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.registre_types_reference (
    code INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    categorie TEXT NOT NULL DEFAULT 'SIGNAL' -- 'SIGNAL' ou 'DECES'
);

INSERT INTO public.registre_types_reference (code, nom, categorie) VALUES
(1, 'Fièvre ou notion de fièvre', 'SIGNAL'),
(2, 'Éruption cutanée', 'SIGNAL'),
(3, 'Diarrhée', 'SIGNAL'),
(4, 'Raideur de la nuque', 'SIGNAL'),
(5, 'Paralysie flasque aiguë (PFA)', 'SIGNAL'),
(6, 'Saignements inexpliqués', 'SIGNAL'),
(7, 'Yeux jaunes', 'SIGNAL'),
(8, 'Vomissements importants', 'SIGNAL'),
(9, 'Douleurs abdominales', 'SIGNAL'),
(10, 'Décès néonatal (0-28 jours)', 'DECES'),
(11, 'Décès infantile (< 1 an, néonatals inclus)', 'DECES'),
(12, 'Décès infanto-juvénile (0-5 ans)', 'DECES'),
(13, 'Décès maternel', 'DECES'),
(14, 'Décès ≥ 5 ans, sauf décès maternel', 'DECES'),
(15, 'Autres (à préciser)', 'SIGNAL')
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, categorie = EXCLUDED.categorie;

CREATE SEQUENCE IF NOT EXISTS seq_numero_registre START 1;

CREATE TABLE IF NOT EXISTS public.registre_alertes_rumeurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_registre TEXT UNIQUE NOT NULL, -- REG-AAAA-XXXXXX
    numero_ligne INTEGER,
    
    -- Temporalité
    annee INTEGER NOT NULL,
    mois INTEGER NOT NULL,
    date_survenue DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Localisation
    departement_id UUID NOT NULL REFERENCES public.departements(id),
    commune_id UUID NOT NULL REFERENCES public.communes(id),
    arrondissement_id UUID NOT NULL REFERENCES public.arrondissements(id),
    village_nom TEXT NOT NULL,
    lieu_detection TEXT NOT NULL DEFAULT 'COMMUNAUTE' CHECK (lieu_detection IN ('COMMUNAUTE', 'COMMUNE')),
    centre_sante_nom TEXT,
    
    -- Signal ou Décès
    type_code INTEGER NOT NULL REFERENCES public.registre_types_reference(code),
    type_nom TEXT NOT NULL,
    autre_precision TEXT,
    
    -- Chiffres (entiers >= 0 sans plafond)
    nb_personnes_touchees INTEGER NOT NULL DEFAULT 1,
    nb_personnes_decedees INTEGER NOT NULL DEFAULT 0,
    mesure_prise TEXT,
    
    -- Notificateur
    relais_id UUID NOT NULL REFERENCES public.utilisateurs(id),
    relais_nom_complet TEXT NOT NULL,
    ascq_superviseur_id UUID REFERENCES public.utilisateurs(id),
    
    -- Statuts
    statut TEXT NOT NULL DEFAULT 'ENREGISTREE' CHECK (statut IN ('ENREGISTREE', 'TRANSFORMEE_ALERTE', 'TRANSFORMEE_DECES', 'CLASSEE_SANS_SUITE')),
    alerte_liee_id UUID REFERENCES public.alertes_communautaires(id),
    deces_lie_id UUID, -- référence définie après création de table décès
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registre_numero ON public.registre_alertes_rumeurs(numero_registre);
CREATE INDEX IF NOT EXISTS idx_registre_relais ON public.registre_alertes_rumeurs(relais_id);
CREATE INDEX IF NOT EXISTS idx_registre_ascq ON public.registre_alertes_rumeurs(ascq_superviseur_id);

-- ---------------------------------------------------------------------
-- 2. NOTIFICATION DE DÉCÈS (DEC-)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deces_types_reference (
    code INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    description TEXT
);

INSERT INTO public.deces_types_reference (code, nom, description) VALUES
(1, 'Décès maternel', 'Pendant la grossesse, lors de l''accouchement ou dans les 42 jours après'),
(2, 'Bébé de 0 à 28 jours', 'Décès néonatal précoce ou tardif'),
(3, 'Enfant de 1 mois à moins d''1 an', 'Décès infantile post-néonatal'),
(4, 'Enfant de 1 à 5 ans', 'Décès infanto-juvénile'),
(5, 'Personne de plus de 5 ans', 'Décès de tout individu âgé de 5 ans et plus (hors décès maternel)')
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.deces_lieux_reference (
    code INTEGER PRIMARY KEY,
    nom TEXT NOT NULL
);

INSERT INTO public.deces_lieux_reference (code, nom) VALUES
(1, 'Centre de santé'),
(2, 'Domicile'),
(3, 'Accoucheuse traditionnelle'),
(4, 'Lieu de culte'),
(5, 'Au cours du transport'),
(6, 'À l''étranger (avec rapatriement du corps au Bénin)'),
(7, 'Autres lieux')
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom;

CREATE TABLE IF NOT EXISTS public.deces_circonstances_reference (
    code INTEGER PRIMARY KEY,
    nom TEXT NOT NULL
);

INSERT INTO public.deces_circonstances_reference (code, nom) VALUES
(1, 'Grossesse / Avortement / Accouchement / Suites de couches'),
(2, 'Maladie'),
(3, 'Accident de la voie publique'),
(4, 'Accident domestique'),
(5, 'Mort subite'),
(6, 'Violence (agression, arme à feu, suicide...)'),
(7, 'Autres circonstances')
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom;

CREATE SEQUENCE IF NOT EXISTS seq_numero_deces START 1;

CREATE TABLE IF NOT EXISTS public.deces_communautaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_deces TEXT UNIQUE NOT NULL, -- DEC-AAAA-XXXXXX
    
    -- Temporalité
    annee INTEGER NOT NULL,
    semaine_epidemio INTEGER NOT NULL,
    mois INTEGER NOT NULL,
    date_deces DATE NOT NULL,
    heure_deces TIME,
    date_notification DATE NOT NULL DEFAULT CURRENT_DATE,
    delai_deces_notification_heures NUMERIC,
    
    -- Localisation
    departement_id UUID NOT NULL REFERENCES public.departements(id),
    commune_id UUID NOT NULL REFERENCES public.communes(id),
    arrondissement_id UUID NOT NULL REFERENCES public.arrondissements(id),
    village_nom TEXT NOT NULL,
    numero_grappe INTEGER DEFAULT 1,
    nom_grappe TEXT,
    gps_latitude NUMERIC,
    gps_longitude NUMERIC,
    
    -- Typologie
    type_deces_code INTEGER NOT NULL REFERENCES public.deces_types_reference(code),
    type_deces_nom TEXT NOT NULL,
    lieu_deces_code INTEGER NOT NULL REFERENCES public.deces_lieux_reference(code),
    lieu_deces_nom TEXT NOT NULL,
    lieu_pays_etranger TEXT,
    circonstance_code INTEGER NOT NULL REFERENCES public.deces_circonstances_reference(code),
    circonstance_nom TEXT NOT NULL,
    circonstance_autre_precision TEXT,
    
    -- Démographie du défunt
    sexe TEXT NOT NULL CHECK (sexe IN ('M', 'F')),
    age_valeur INTEGER,
    age_unite TEXT CHECK (age_unite IN ('JOURS', 'MOIS', 'ANS')),
    
    -- Autopsie verbale & Cause CIM-10
    autopsie_verbale_effectuee BOOLEAN NOT NULL DEFAULT FALSE,
    cause_cim10_code TEXT,
    cause_cim10_libelle TEXT,
    cause_validee_par UUID REFERENCES public.utilisateurs(id),
    date_validation_cause TIMESTAMPTZ,
    
    -- Notificateur
    notificateur_id UUID NOT NULL REFERENCES public.utilisateurs(id),
    notificateur_nom_complet TEXT NOT NULL,
    notificateur_titre TEXT NOT NULL,
    notificateur_telephone TEXT NOT NULL,
    centre_sante_nom TEXT,
    signature_tactile TEXT,
    ascq_superviseur_id UUID REFERENCES public.utilisateurs(id),
    
    -- Statut
    statut TEXT NOT NULL DEFAULT 'NOTIFIE' CHECK (statut IN ('NOTIFIE', 'AUTOPSIE_EN_ATTENTE', 'CAUSE_RENSEIGNEE', 'VALIDE', 'CLOTURE')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table privée pour l'identité du défunt
CREATE TABLE IF NOT EXISTS public.deces_identite_privee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deces_id UUID NOT NULL REFERENCES public.deces_communautaires(id) ON DELETE CASCADE,
    npi_defunt TEXT,
    nom_defunt TEXT NOT NULL,
    prenoms_defunt TEXT NOT NULL,
    date_naissance DATE,
    nom_parent TEXT,
    telephone_parent TEXT,
    adresse_domicile TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deces_numero ON public.deces_communautaires(numero_deces);
CREATE INDEX IF NOT EXISTS idx_deces_notif_id ON public.deces_communautaires(notificateur_id);
CREATE INDEX IF NOT EXISTS idx_deces_ascq_id ON public.deces_communautaires(ascq_superviseur_id);
CREATE INDEX IF NOT EXISTS idx_deces_identite ON public.deces_identite_privee(deces_id);

-- Lier la table registre au décès créé
ALTER TABLE public.registre_alertes_rumeurs 
ADD CONSTRAINT fk_registre_deces FOREIGN KEY (deces_lie_id) REFERENCES public.deces_communautaires(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 3. INVESTIGATION D'UN ÉVÉNEMENT (INV-)
-- ---------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS seq_numero_investigation START 1;

CREATE TABLE IF NOT EXISTS public.investigations_evenements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_investigation TEXT UNIQUE NOT NULL, -- INV-AAAA-XXXXXX
    
    -- Alerte liée (Optionnelle : Option B validée pour investigation autonome)
    alerte_id UUID REFERENCES public.alertes_communautaires(id),
    numero_alerte_liee TEXT,
    
    -- Temporalité
    annee INTEGER NOT NULL,
    semaine_epidemio INTEGER NOT NULL,
    date_survenue DATE,
    date_notification DATE,
    date_investigation DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Localisation
    departement_id UUID NOT NULL REFERENCES public.departements(id),
    commune_id UUID NOT NULL REFERENCES public.communes(id),
    arrondissement_id UUID NOT NULL REFERENCES public.arrondissements(id),
    village_nom TEXT NOT NULL,
    gps_latitude NUMERIC,
    gps_longitude NUMERIC,
    
    -- Événement & Diagnostic
    type_alerte_code INTEGER REFERENCES public.types_alertes_reference(code),
    type_alerte_nom TEXT NOT NULL,
    evenement_avere BOOLEAN NOT NULL DEFAULT TRUE,
    source_information TEXT NOT NULL, -- 'RELAIS', 'COMMUNAUTE', 'STRUCTURE_SANTE', 'RUMEUR'
    description_evenement TEXT,
    circonstances_details TEXT, -- Démarrage, notion de voyage, rassemblement...
    
    -- Ventilation des cas par tranches d'âge et sexe (8 tranches)
    cas_0_11m_m INTEGER DEFAULT 0,
    cas_0_11m_f INTEGER DEFAULT 0,
    cas_1_5a_m INTEGER DEFAULT 0,
    cas_1_5a_f INTEGER DEFAULT 0,
    cas_6_15a_m INTEGER DEFAULT 0,
    cas_6_15a_f INTEGER DEFAULT 0,
    cas_plus_15a_m INTEGER DEFAULT 0,
    cas_plus_15a_f INTEGER DEFAULT 0,
    total_cas INTEGER NOT NULL DEFAULT 0,
    
    -- Ventilation des décès par tranches d'âge et sexe (8 tranches)
    deces_0_11m_m INTEGER DEFAULT 0,
    deces_0_11m_f INTEGER DEFAULT 0,
    deces_1_5a_m INTEGER DEFAULT 0,
    deces_1_5a_f INTEGER DEFAULT 0,
    deces_6_15a_m INTEGER DEFAULT 0,
    deces_6_15a_f INTEGER DEFAULT 0,
    deces_plus_15a_m INTEGER DEFAULT 0,
    deces_plus_15a_f INTEGER DEFAULT 0,
    total_deces INTEGER NOT NULL DEFAULT 0,
    
    -- Synthèse d'action & Investigateurs
    synthese_actions TEXT,
    relais_nom TEXT,
    relais_telephone TEXT,
    investigateur_id UUID NOT NULL REFERENCES public.utilisateurs(id),
    investigateur_nom TEXT NOT NULL,
    investigateur_titre TEXT NOT NULL,
    signature_tactile TEXT,
    
    statut TEXT NOT NULL DEFAULT 'CLOTUREE' CHECK (statut IN ('BROUILLON', 'EN_COURS', 'CLOTUREE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_numero ON public.investigations_evenements(numero_investigation);
CREATE INDEX IF NOT EXISTS idx_inv_alerte_id ON public.investigations_evenements(alerte_id);
CREATE INDEX IF NOT EXISTS idx_inv_investigateur ON public.investigations_evenements(investigateur_id);

-- ---------------------------------------------------------------------
-- 4. RAPPORT HEBDOMADAIRE DE SURVEILLANCE (RAP-)
-- ---------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS seq_numero_rapport_hebdo START 1;

CREATE TABLE IF NOT EXISTS public.rapports_hebdomadaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_rapport TEXT UNIQUE NOT NULL, -- RAP-AAAA-SXX-XXXX
    
    annee INTEGER NOT NULL,
    semaine_epidemio INTEGER NOT NULL,
    date_debut_semaine DATE NOT NULL,
    date_fin_semaine DATE NOT NULL,
    
    -- Localisation
    departement_id UUID NOT NULL REFERENCES public.departements(id),
    commune_id UUID NOT NULL REFERENCES public.communes(id),
    arrondissement_id UUID NOT NULL REFERENCES public.arrondissements(id),
    village_nom TEXT NOT NULL,
    
    -- Synthèse des alertes
    alertes_detectees INTEGER NOT NULL DEFAULT 0,
    personnes_touchees INTEGER NOT NULL DEFAULT 0,
    personnes_decedees INTEGER NOT NULL DEFAULT 0,
    alertes_verifiees_48h INTEGER NOT NULL DEFAULT 0,
    alertes_averees INTEGER NOT NULL DEFAULT 0,
    
    -- Synthèse des décès communautaires
    deces_maternels INTEGER NOT NULL DEFAULT 0,
    deces_neonatals INTEGER NOT NULL DEFAULT 0, -- 0-28 jours
    deces_infantiles INTEGER NOT NULL DEFAULT 0, -- < 1 an
    deces_infanto_juveniles INTEGER NOT NULL DEFAULT 0, -- 0-5 ans
    deces_plus_5_ans INTEGER NOT NULL DEFAULT 0,
    
    rapport_zero_confirme BOOLEAN NOT NULL DEFAULT FALSE,
    actions_menees TEXT,
    difficultes TEXT,
    
    -- Rapporteur
    ascq_id UUID NOT NULL REFERENCES public.utilisateurs(id),
    rapporteur_nom TEXT NOT NULL,
    rapporteur_telephone TEXT NOT NULL,
    signature_tactile TEXT,
    
    statut TEXT NOT NULL DEFAULT 'SOUMIS' CHECK (statut IN ('BROUILLON', 'SOUMIS', 'VALIDE')),
    date_soumission TIMESTAMPTZ DEFAULT NOW(),
    valide_par UUID REFERENCES public.utilisateurs(id),
    date_validation TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_ascq_village_semaine UNIQUE(ascq_id, village_nom, annee, semaine_epidemio)
);

CREATE INDEX IF NOT EXISTS idx_rap_semaine ON public.rapports_hebdomadaires(annee, semaine_epidemio);
CREATE INDEX IF NOT EXISTS idx_rap_ascq ON public.rapports_hebdomadaires(ascq_id);

-- ---------------------------------------------------------------------
-- 5. POLITIQUES RLS (ROW LEVEL SECURITY)
-- ---------------------------------------------------------------------

ALTER TABLE public.registre_types_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registre_alertes_rumeurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deces_types_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deces_lieux_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deces_circonstances_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deces_communautaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deces_identite_privee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations_evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapports_hebdomadaires ENABLE ROW LEVEL SECURITY;

-- Tables de référence en lecture publique pour les utilisateurs connectés
CREATE POLICY "Lecture types registre" ON public.registre_types_reference FOR SELECT USING (true);
CREATE POLICY "Lecture types deces" ON public.deces_types_reference FOR SELECT USING (true);
CREATE POLICY "Lecture lieux deces" ON public.deces_lieux_reference FOR SELECT USING (true);
CREATE POLICY "Lecture circonstances deces" ON public.deces_circonstances_reference FOR SELECT USING (true);

-- Registre : le RC voit ses lignes, l'ASCQ superviseur voit celles de ses RC
CREATE POLICY "Acces registre" ON public.registre_alertes_rumeurs
    FOR ALL USING (relais_id = auth.uid() OR ascq_superviseur_id = auth.uid());

-- Décès : créateur ou ASCQ superviseur
CREATE POLICY "Acces deces communautaires" ON public.deces_communautaires
    FOR ALL USING (notificateur_id = auth.uid() OR ascq_superviseur_id = auth.uid());

-- Table privée identité décès : stricte
CREATE POLICY "Acces identite deces privee" ON public.deces_identite_privee
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.deces_communautaires d
            WHERE d.id = deces_id AND (d.notificateur_id = auth.uid() OR d.ascq_superviseur_id = auth.uid())
        )
    );

-- Investigations : ASCQ investigateur
CREATE POLICY "Acces investigations" ON public.investigations_evenements
    FOR ALL USING (investigateur_id = auth.uid());

-- Rapports hebdomadaires : ASCQ auteur
CREATE POLICY "Acces rapports hebdo" ON public.rapports_hebdomadaires
    FOR ALL USING (ascq_id = auth.uid());

-- ---------------------------------------------------------------------
-- 6. FONCTIONS RPC SÉCURISÉES
-- ---------------------------------------------------------------------

-- A. Créer une ligne au registre communautaire
CREATE OR REPLACE FUNCTION public.creer_ligne_registre(
    p_date_survenue DATE,
    p_departement_id UUID,
    p_commune_id UUID,
    p_arrondissement_id UUID,
    p_village_nom TEXT,
    p_lieu_detection TEXT,
    p_type_code INTEGER,
    p_autre_precision TEXT,
    p_nb_personnes_touchees INTEGER,
    p_nb_personnes_decedees INTEGER,
    p_mesure_prise TEXT
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
    v_type_info RECORD;
    v_annee INTEGER;
    v_mois INTEGER;
    v_seq BIGINT;
    v_numero TEXT;
    v_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié.'; END IF;

    SELECT * INTO v_user FROM public.utilisateurs WHERE id = v_user_id;
    IF v_user.poste = 'RC' THEN
        SELECT ascq_id INTO v_ascq_id FROM public.relais_communautaires WHERE user_id = v_user_id LIMIT 1;
    ELSE
        v_ascq_id := v_user_id;
    END IF;

    SELECT nom INTO v_centre_sante FROM public.structures_sante WHERE commune_id = p_commune_id LIMIT 1;
    SELECT nom INTO v_type_info FROM public.registre_types_reference WHERE code = p_type_code;

    v_annee := EXTRACT(YEAR FROM COALESCE(p_date_survenue, CURRENT_DATE))::INT;
    v_mois := EXTRACT(MONTH FROM COALESCE(p_date_survenue, CURRENT_DATE))::INT;

    v_seq := nextval('seq_numero_registre');
    v_numero := 'REG-' || v_annee::TEXT || '-' || LPAD(v_seq::TEXT, 6, '0');

    INSERT INTO public.registre_alertes_rumeurs (
        numero_registre,
        numero_ligne,
        annee,
        mois,
        date_survenue,
        departement_id,
        commune_id,
        arrondissement_id,
        village_nom,
        lieu_detection,
        centre_sante_nom,
        type_code,
        type_nom,
        autre_precision,
        nb_personnes_touchees,
        nb_personnes_decedees,
        mesure_prise,
        relais_id,
        relais_nom_complet,
        ascq_superviseur_id,
        statut
    ) VALUES (
        v_numero,
        v_seq::INT,
        v_annee,
        v_mois,
        COALESCE(p_date_survenue, CURRENT_DATE),
        p_departement_id,
        p_commune_id,
        p_arrondissement_id,
        TRIM(p_village_nom),
        COALESCE(p_lieu_detection, 'COMMUNAUTE'),
        COALESCE(v_centre_sante, 'CSC'),
        p_type_code,
        v_type_info.nom,
        p_autre_precision,
        COALESCE(p_nb_personnes_touchees, 1),
        COALESCE(p_nb_personnes_decedees, 0),
        p_mesure_prise,
        v_user_id,
        v_user.prenoms || ' ' || v_user.nom,
        v_ascq_id,
        'ENREGISTREE'
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_id,
        'numero_registre', v_numero,
        'message', 'Entrée enregistrée au registre avec succès (' || v_numero || ')'
    );
END;
$$;

-- B. Créer une notification de décès
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
    -- Données privées
    p_nom_defunt TEXT,
    p_prenoms_defunt TEXT,
    p_npi_defunt TEXT,
    p_date_naissance DATE,
    p_nom_parent TEXT,
    p_telephone_parent TEXT,
    p_adresse_domicile TEXT,
    -- Lien registre optionnel
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
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié.'; END IF;

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

    -- Données privées
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
        UPPER(TRIM(p_nom_defunt)),
        TRIM(p_prenoms_defunt),
        p_date_naissance,
        p_nom_parent,
        p_telephone_parent,
        p_adresse_domicile
    );

    -- Si lié à une ligne de registre, mettre à jour le statut du registre
    IF p_registre_id IS NOT NULL THEN
        UPDATE public.registre_alertes_rumeurs
        SET statut = 'TRANSFORMEE_DECES', deces_lie_id = v_id
        WHERE id = p_registre_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_id,
        'numero_deces', v_numero,
        'message', 'Décès communautaire notifié avec succès (' || v_numero || ')'
    );
END;
$$;

-- C. Pré-remplissage automatique du rapport hebdomadaire
CREATE OR REPLACE FUNCTION public.generer_pre_remplissage_hebdo(
    p_annee INTEGER,
    p_semaine INTEGER,
    p_village_nom TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_nb_alertes INTEGER := 0;
    v_nb_touches INTEGER := 0;
    v_nb_morts INTEGER := 0;
    v_nb_verifiees_48h INTEGER := 0;
    v_nb_averees INTEGER := 0;
    v_deces_mat INTEGER := 0;
    v_deces_neo INTEGER := 0;
    v_deces_inf INTEGER := 0;
    v_deces_inf_juv INTEGER := 0;
    v_deces_plus_5 INTEGER := 0;
BEGIN
    v_user_id := auth.uid();

    -- Agrégation des alertes de la semaine
    SELECT 
        COUNT(*),
        COALESCE(SUM(nb_personnes_touchees), 0),
        COALESCE(SUM(nb_personnes_mortes), 0),
        COUNT(*) FILTER (WHERE date_verification IS NOT NULL AND (date_verification::DATE - date_notification) <= 2),
        COUNT(*) FILTER (WHERE resultat_verification = 'AVEREE')
    INTO 
        v_nb_alertes, v_nb_touches, v_nb_morts, v_nb_verifiees_48h, v_nb_averees
    FROM public.alertes_communautaires
    WHERE ascq_superviseur_id = v_user_id
      AND annee = p_annee
      AND semaine_epidemio = p_semaine
      AND village_nom ILIKE TRIM(p_village_nom);

    -- Agrégation des décès de la semaine
    SELECT
        COUNT(*) FILTER (WHERE type_deces_code = 1),
        COUNT(*) FILTER (WHERE type_deces_code = 2),
        COUNT(*) FILTER (WHERE type_deces_code IN (2, 3)),
        COUNT(*) FILTER (WHERE type_deces_code IN (2, 3, 4)),
        COUNT(*) FILTER (WHERE type_deces_code = 5)
    INTO
        v_deces_mat, v_deces_neo, v_deces_inf, v_deces_inf_juv, v_deces_plus_5
    FROM public.deces_communautaires
    WHERE ascq_superviseur_id = v_user_id
      AND annee = p_annee
      AND semaine_epidemio = p_semaine
      AND village_nom ILIKE TRIM(p_village_nom);

    RETURN jsonb_build_object(
        'alertes_detectees', v_nb_alertes,
        'personnes_touchees', v_nb_touches,
        'personnes_decedees', v_nb_morts,
        'alertes_verifiees_48h', v_nb_verifiees_48h,
        'alertes_averees', v_nb_averees,
        'deces_maternels', v_deces_mat,
        'deces_neonatals', v_deces_neo,
        'deces_infantiles', v_deces_inf,
        'deces_infanto_juveniles', v_deces_inf_juv,
        'deces_plus_5_ans', v_deces_plus_5
    );
END;
$$;

-- D. Créer une investigation d'événement
CREATE OR REPLACE FUNCTION public.creer_investigation(
    p_alerte_id UUID,
    p_date_survenue DATE,
    p_date_notification DATE,
    p_date_investigation DATE,
    p_departement_id UUID,
    p_commune_id UUID,
    p_arrondissement_id UUID,
    p_village_nom TEXT,
    p_gps_latitude NUMERIC,
    p_gps_longitude NUMERIC,
    p_type_alerte_code INTEGER,
    p_evenement_avere BOOLEAN,
    p_source_information TEXT,
    p_description_evenement TEXT,
    p_circonstances_details TEXT,
    -- Cas par tranche d'âge & sexe
    p_cas_0_11m_m INTEGER,
    p_cas_0_11m_f INTEGER,
    p_cas_1_5a_m INTEGER,
    p_cas_1_5a_f INTEGER,
    p_cas_6_15a_m INTEGER,
    p_cas_6_15a_f INTEGER,
    p_cas_plus_15a_m INTEGER,
    p_cas_plus_15a_f INTEGER,
    -- Décès par tranche d'âge & sexe
    p_deces_0_11m_m INTEGER,
    p_deces_0_11m_f INTEGER,
    p_deces_1_5a_m INTEGER,
    p_deces_1_5a_f INTEGER,
    p_deces_6_15a_m INTEGER,
    p_deces_6_15a_f INTEGER,
    p_deces_plus_15a_m INTEGER,
    p_deces_plus_15a_f INTEGER,
    -- Actions & Investigateur
    p_synthese_actions TEXT,
    p_relais_nom TEXT,
    p_relais_telephone TEXT,
    p_signature_tactile TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user RECORD;
    v_type_nom TEXT;
    v_num_alerte TEXT;
    v_annee INTEGER;
    v_semaine INTEGER;
    v_seq BIGINT;
    v_numero TEXT;
    v_id UUID;
    v_tot_cas INTEGER;
    v_tot_deces INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié.'; END IF;

    SELECT * INTO v_user FROM public.utilisateurs WHERE id = v_user_id;
    SELECT nom INTO v_type_nom FROM public.types_alertes_reference WHERE code = p_type_alerte_code;

    IF p_alerte_id IS NOT NULL THEN
        SELECT numero_alerte INTO v_num_alerte FROM public.alertes_communautaires WHERE id = p_alerte_id;
    END IF;

    v_annee := EXTRACT(ISOYEAR FROM COALESCE(p_date_investigation, CURRENT_DATE))::INT;
    v_semaine := EXTRACT(WEEK FROM COALESCE(p_date_investigation, CURRENT_DATE))::INT;

    v_tot_cas := COALESCE(p_cas_0_11m_m,0) + COALESCE(p_cas_0_11m_f,0) +
                 COALESCE(p_cas_1_5a_m,0) + COALESCE(p_cas_1_5a_f,0) +
                 COALESCE(p_cas_6_15a_m,0) + COALESCE(p_cas_6_15a_f,0) +
                 COALESCE(p_cas_plus_15a_m,0) + COALESCE(p_cas_plus_15a_f,0);

    v_tot_deces := COALESCE(p_deces_0_11m_m,0) + COALESCE(p_deces_0_11m_f,0) +
                   COALESCE(p_deces_1_5a_m,0) + COALESCE(p_deces_1_5a_f,0) +
                   COALESCE(p_deces_6_15a_m,0) + COALESCE(p_deces_6_15a_f,0) +
                   COALESCE(p_deces_plus_15a_m,0) + COALESCE(p_deces_plus_15a_f,0);

    v_seq := nextval('seq_numero_investigation');
    v_numero := 'INV-' || v_annee::TEXT || '-' || LPAD(v_seq::TEXT, 6, '0');

    INSERT INTO public.investigations_evenements (
        numero_investigation,
        alerte_id,
        numero_alerte_liee,
        annee,
        semaine_epidemio,
        date_survenue,
        date_notification,
        date_investigation,
        departement_id,
        commune_id,
        arrondissement_id,
        village_nom,
        gps_latitude,
        gps_longitude,
        type_alerte_code,
        type_alerte_nom,
        evenement_avere,
        source_information,
        description_evenement,
        circonstances_details,
        cas_0_11m_m, cas_0_11m_f,
        cas_1_5a_m, cas_1_5a_f,
        cas_6_15a_m, cas_6_15a_f,
        cas_plus_15a_m, cas_plus_15a_f,
        total_cas,
        deces_0_11m_m, deces_0_11m_f,
        deces_1_5a_m, deces_1_5a_f,
        deces_6_15a_m, deces_6_15a_f,
        deces_plus_15a_m, deces_plus_15a_f,
        total_deces,
        synthese_actions,
        relais_nom,
        relais_telephone,
        investigateur_id,
        investigateur_nom,
        investigateur_titre,
        signature_tactile,
        statut
    ) VALUES (
        v_numero,
        p_alerte_id,
        v_num_alerte,
        v_annee,
        v_semaine,
        p_date_survenue,
        p_date_notification,
        COALESCE(p_date_investigation, CURRENT_DATE),
        p_departement_id,
        p_commune_id,
        p_arrondissement_id,
        TRIM(p_village_nom),
        p_gps_latitude,
        p_gps_longitude,
        p_type_alerte_code,
        COALESCE(v_type_nom, 'Autre'),
        COALESCE(p_evenement_avere, TRUE),
        p_source_information,
        p_description_evenement,
        p_circonstances_details,
        COALESCE(p_cas_0_11m_m,0), COALESCE(p_cas_0_11m_f,0),
        COALESCE(p_cas_1_5a_m,0), COALESCE(p_cas_1_5a_f,0),
        COALESCE(p_cas_6_15a_m,0), COALESCE(p_cas_6_15a_f,0),
        COALESCE(p_cas_plus_15a_m,0), COALESCE(p_cas_plus_15a_f,0),
        v_tot_cas,
        COALESCE(p_deces_0_11m_m,0), COALESCE(p_deces_0_11m_f,0),
        COALESCE(p_deces_1_5a_m,0), COALESCE(p_deces_1_5a_f,0),
        COALESCE(p_deces_6_15a_m,0), COALESCE(p_deces_6_15a_f,0),
        COALESCE(p_deces_plus_15a_m,0), COALESCE(p_deces_plus_15a_f,0),
        v_tot_deces,
        p_synthese_actions,
        p_relais_nom,
        p_relais_telephone,
        v_user_id,
        v_user.prenoms || ' ' || v_user.nom,
        v_user.poste,
        p_signature_tactile,
        'CLOTUREE'
    )
    RETURNING id INTO v_id;

    -- Si liée à une alerte : passer le statut de l'alerte à INVESTIGUEE et synchroniser le statut de vérification
    IF p_alerte_id IS NOT NULL THEN
        UPDATE public.alertes_communautaires
        SET statut = 'INVESTIGUEE',
            resultat_verification = CASE WHEN p_evenement_avere THEN 'AVEREE' ELSE 'NON_AVEREE' END,
            date_verification = COALESCE(date_verification, NOW()),
            updated_at = NOW()
        WHERE id = p_alerte_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_id,
        'numero_investigation', v_numero,
        'message', 'Fiche d''investigation enregistrée avec succès (' || v_numero || ')'
    );
END;
$$;

-- E. Créer un rapport hebdomadaire
CREATE OR REPLACE FUNCTION public.creer_rapport_hebdomadaire(
    p_annee INTEGER,
    p_semaine INTEGER,
    p_date_debut DATE,
    p_date_fin DATE,
    p_departement_id UUID,
    p_commune_id UUID,
    p_arrondissement_id UUID,
    p_village_nom TEXT,
    p_alertes_detectees INTEGER,
    p_personnes_touchees INTEGER,
    p_personnes_decedees INTEGER,
    p_alertes_verifiees_48h INTEGER,
    p_alertes_averees INTEGER,
    p_deces_maternels INTEGER,
    p_deces_neonatals INTEGER,
    p_deces_infantiles INTEGER,
    p_deces_infanto_juveniles INTEGER,
    p_deces_plus_5_ans INTEGER,
    p_rapport_zero_confirme BOOLEAN,
    p_actions_menees TEXT,
    p_difficultes TEXT,
    p_signature_tactile TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user RECORD;
    v_seq BIGINT;
    v_numero TEXT;
    v_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié.'; END IF;

    SELECT * INTO v_user FROM public.utilisateurs WHERE id = v_user_id;

    v_seq := nextval('seq_numero_rapport_hebdo');
    v_numero := 'RAP-' || p_annee::TEXT || '-S' || LPAD(p_semaine::TEXT, 2, '0') || '-' || LPAD(v_seq::TEXT, 4, '0');

    INSERT INTO public.rapports_hebdomadaires (
        numero_rapport,
        annee,
        semaine_epidemio,
        date_debut_semaine,
        date_fin_semaine,
        departement_id,
        commune_id,
        arrondissement_id,
        village_nom,
        alertes_detectees,
        personnes_touchees,
        personnes_decedees,
        alertes_verifiees_48h,
        alertes_averees,
        deces_maternels,
        deces_neonatals,
        deces_infantiles,
        deces_infanto_juveniles,
        deces_plus_5_ans,
        rapport_zero_confirme,
        actions_menees,
        difficultes,
        ascq_id,
        rapporteur_nom,
        rapporteur_telephone,
        signature_tactile,
        statut
    ) VALUES (
        v_numero,
        p_annee,
        p_semaine,
        p_date_debut,
        p_date_fin,
        p_departement_id,
        p_commune_id,
        p_arrondissement_id,
        TRIM(p_village_nom),
        COALESCE(p_alertes_detectees, 0),
        COALESCE(p_personnes_touchees, 0),
        COALESCE(p_personnes_decedees, 0),
        COALESCE(p_alertes_verifiees_48h, 0),
        COALESCE(p_alertes_averees, 0),
        COALESCE(p_deces_maternels, 0),
        COALESCE(p_deces_neonatals, 0),
        COALESCE(p_deces_infantiles, 0),
        COALESCE(p_deces_infanto_juveniles, 0),
        COALESCE(p_deces_plus_5_ans, 0),
        COALESCE(p_rapport_zero_confirme, FALSE),
        p_actions_menees,
        p_difficultes,
        v_user_id,
        v_user.prenoms || ' ' || v_user.nom,
        v_user.telephone,
        p_signature_tactile,
        'SOUMIS'
    )
    ON CONFLICT (ascq_id, village_nom, annee, semaine_epidemio)
    DO UPDATE SET
        alertes_detectees = EXCLUDED.alertes_detectees,
        personnes_touchees = EXCLUDED.personnes_touchees,
        personnes_decedees = EXCLUDED.personnes_decedees,
        alertes_verifiees_48h = EXCLUDED.alertes_verifiees_48h,
        alertes_averees = EXCLUDED.alertes_averees,
        deces_maternels = EXCLUDED.deces_maternels,
        deces_neonatals = EXCLUDED.deces_neonatals,
        deces_infantiles = EXCLUDED.deces_infantiles,
        deces_infanto_juveniles = EXCLUDED.deces_infanto_juveniles,
        deces_plus_5_ans = EXCLUDED.deces_plus_5_ans,
        rapport_zero_confirme = EXCLUDED.rapport_zero_confirme,
        actions_menees = EXCLUDED.actions_menees,
        difficultes = EXCLUDED.difficultes,
        signature_tactile = EXCLUDED.signature_tactile,
        updated_at = NOW()
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_id,
        'numero_rapport', v_numero,
        'message', 'Rapport hebdomadaire soumis avec succès (' || v_numero || ')'
    );
END;
$$;

-- Permissions d'exécution
GRANT EXECUTE ON FUNCTION public.creer_ligne_registre TO authenticated;
GRANT EXECUTE ON FUNCTION public.creer_notification_deces TO authenticated;
GRANT EXECUTE ON FUNCTION public.generer_pre_remplissage_hebdo TO authenticated;
GRANT EXECUTE ON FUNCTION public.creer_investigation TO authenticated;
GRANT EXECUTE ON FUNCTION public.creer_rapport_hebdomadaire TO authenticated;

