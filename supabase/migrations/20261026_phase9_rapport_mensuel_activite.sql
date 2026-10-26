-- =====================================================================
-- ASCQ BÉNIN - Migration Phase 9 : Rapport Mensuel d'Activité (RMA)
-- Pré-remplissage automatique de la surveillance et version officielle
-- =====================================================================

CREATE SEQUENCE IF NOT EXISTS seq_numero_rma START 1;

CREATE TABLE IF NOT EXISTS public.rapports_mensuels_ascq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_rapport TEXT UNIQUE NOT NULL, -- RMA-AAAA-MM-XXXX
    ascq_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
    annee INTEGER NOT NULL,
    statut TEXT NOT NULL DEFAULT 'BROUILLON' CHECK (statut IN ('BROUILLON', 'VALIDE')),
    echeance_date DATE NOT NULL,
    est_en_retard BOOLEAN NOT NULL DEFAULT FALSE,
    date_validation TIMESTAMPTZ,
    signature_tactile TEXT,

    -- Localisation administrative au moment du rapport
    departement_id UUID REFERENCES public.departements(id),
    commune_id UUID REFERENCES public.communes(id),
    arrondissement_id UUID REFERENCES public.arrondissements(id),
    arrondissement_nom TEXT,
    commune_nom TEXT,
    centre_sante_nom TEXT,
    source_financement TEXT,

    -- Section 1 : Effectifs des Relais Communautaires
    rc_en_charge INTEGER NOT NULL DEFAULT 0,
    rc_actifs INTEGER NOT NULL DEFAULT 0,

    -- Section 2 : Ménages & Hygiène
    menages_en_charge INTEGER NOT NULL DEFAULT 0,
    menages_visites INTEGER NOT NULL DEFAULT 0,
    personnes_touchees_total INTEGER NOT NULL DEFAULT 0,
    menages_eau_potable INTEGER NOT NULL DEFAULT 0,
    menages_latrines INTEGER NOT NULL DEFAULT 0,
    menages_mild_bon_etat INTEGER NOT NULL DEFAULT 0,

    -- Section 3 : Santé Mère-Enfant
    enfants_0_5_ans INTEGER NOT NULL DEFAULT 0,
    femmes_enceintes INTEGER NOT NULL DEFAULT 0,
    enfants_sous_vaccines_orientes INTEGER NOT NULL DEFAULT 0,

    -- Section 4 : Prise en charge des maladies (iCCM / PCIME-C)
    cas_diarrhee INTEGER NOT NULL DEFAULT 0,
    cas_ira INTEGER NOT NULL DEFAULT 0,
    cas_malnutrition INTEGER NOT NULL DEFAULT 0,
    cas_palu_tdr_positif INTEGER NOT NULL DEFAULT 0,
    cas_palu_tdr_negatif INTEGER NOT NULL DEFAULT 0,
    cas_tuberculose INTEGER NOT NULL DEFAULT 0,
    cas_hta INTEGER NOT NULL DEFAULT 0,
    cas_diabete INTEGER NOT NULL DEFAULT 0,

    -- Section 5 : Surveillance à base communautaire (Pré-remplie automatiquement)
    -- Contient les 17 pathologies officielles : anthrax, covid, cholera, dengue, fievre_jaune, grippe_aviaire,
    -- hantavirus, lassa, meningite, mpox, ebola, pfa, rage, rougeole, shigellose, deces_maternel, deces_neonatal
    donnees_surveillance JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Section 6 : Santé animale & Zoonoses (One Health)
    -- Chiens, chats, singes (identifiés, vaccinés, morsures), troupeaux
    sante_animale JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Section 7 : Références & Prise en charge
    cas_referes_centre_sante INTEGER NOT NULL DEFAULT 0,
    cas_referes_gups INTEGER NOT NULL DEFAULT 0,
    cas_pris_en_charge_communaute INTEGER NOT NULL DEFAULT 0,

    -- Section 8 : Autres activités, difficultés et recommandations
    autres_activites JSONB DEFAULT '[]'::jsonb, -- [{activite, periode, resultats}]
    difficultes JSONB DEFAULT '[]'::jsonb, -- [{difficulte, impact, solution}]
    recommandations JSONB DEFAULT '[]'::jsonb, -- [{recommandation, cible}]

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_ascq_mois_annee_rma UNIQUE (ascq_id, mois, annee)
);

CREATE INDEX IF NOT EXISTS idx_rma_ascq_id ON public.rapports_mensuels_ascq(ascq_id);
CREATE INDEX IF NOT EXISTS idx_rma_periode ON public.rapports_mensuels_ascq(annee, mois);
CREATE INDEX IF NOT EXISTS idx_rma_statut ON public.rapports_mensuels_ascq(statut);

-- RLS
ALTER TABLE public.rapports_mensuels_ascq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestion rapport mensuel ascq" ON public.rapports_mensuels_ascq
    FOR ALL USING (ascq_id = auth.uid());

-- ---------------------------------------------------------------------
-- FONCTIONS RPC SÉCURISÉES
-- ---------------------------------------------------------------------

-- A. Pré-remplissage automatique de la surveillance pour le mois donné
CREATE OR REPLACE FUNCTION public.generer_pre_remplissage_surveillance_mensuelle(
    p_mois INTEGER,
    p_annee INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();

    SELECT jsonb_build_object(
        'rougeole', COUNT(*) FILTER (WHERE type_alerte_code = 1),
        'cholera', COUNT(*) FILTER (WHERE type_alerte_code = 2),
        'meningite', COUNT(*) FILTER (WHERE type_alerte_code = 3),
        'pfa', COUNT(*) FILTER (WHERE type_alerte_code = 4),
        'lassa', COUNT(*) FILTER (WHERE type_alerte_code = 5),
        'ebola', COUNT(*) FILTER (WHERE type_alerte_code = 6),
        'fievre_jaune', COUNT(*) FILTER (WHERE type_alerte_code = 7),
        'dengue', COUNT(*) FILTER (WHERE type_alerte_code = 8),
        'anthrax', COUNT(*) FILTER (WHERE type_alerte_code = 9),
        'shigellose', COUNT(*) FILTER (WHERE type_alerte_code = 10),
        'grippe_aviaire', COUNT(*) FILTER (WHERE type_alerte_code = 11),
        'rage', COUNT(*) FILTER (WHERE type_alerte_code = 12),
        'covid_19', COUNT(*) FILTER (WHERE type_alerte_code = 13),
        'mpox', COUNT(*) FILTER (WHERE type_alerte_code = 14),
        'hantavirus', 0,
        'deces_maternel', (
            SELECT COUNT(*) FROM public.deces_communautaires d
            WHERE d.ascq_superviseur_id = v_user_id
              AND d.annee = p_annee
              AND d.mois = p_mois
              AND d.type_deces_code = 1
        ),
        'deces_neonatal', (
            SELECT COUNT(*) FROM public.deces_communautaires d
            WHERE d.ascq_superviseur_id = v_user_id
              AND d.annee = p_annee
              AND d.mois = p_mois
              AND d.type_deces_code = 2
        )
    ) INTO v_result
    FROM public.alertes_communautaires a
    WHERE a.ascq_superviseur_id = v_user_id
      AND a.annee = p_annee
      AND a.mois = p_mois;

    RETURN v_result;
END;
$$;

-- B. Enregistrer le Rapport Mensuel d'Activité
CREATE OR REPLACE FUNCTION public.enregistrer_rapport_mensuel_ascq(
    p_mois INTEGER,
    p_annee INTEGER,
    p_rc_en_charge INTEGER,
    p_rc_actifs INTEGER,
    p_menages_en_charge INTEGER,
    p_menages_visites INTEGER,
    p_personnes_touchees_total INTEGER,
    p_menages_eau_potable INTEGER,
    p_menages_latrines INTEGER,
    p_menages_mild_bon_etat INTEGER,
    p_enfants_0_5_ans INTEGER,
    p_femmes_enceintes INTEGER,
    p_enfants_sous_vaccines_orientes INTEGER,
    p_cas_diarrhee INTEGER,
    p_cas_ira INTEGER,
    p_cas_malnutrition INTEGER,
    p_cas_palu_tdr_positif INTEGER,
    p_cas_palu_tdr_negatif INTEGER,
    p_cas_tuberculose INTEGER,
    p_cas_hta INTEGER,
    p_cas_diabete INTEGER,
    p_donnees_surveillance JSONB,
    p_sante_animale JSONB,
    p_cas_referes_centre_sante INTEGER,
    p_cas_referes_gups INTEGER,
    p_cas_pris_en_charge_communaute INTEGER,
    p_autres_activites JSONB,
    p_difficultes JSONB,
    p_recommandations JSONB,
    p_signature_tactile TEXT,
    p_valider BOOLEAN DEFAULT FALSE
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
    v_echeance DATE;
    v_est_en_retard BOOLEAN := FALSE;
    v_arr_nom TEXT;
    v_com_nom TEXT;
    v_cs_nom TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié.'; END IF;

    SELECT * INTO v_user FROM public.utilisateurs WHERE id = v_user_id;

    -- Calcul de la date d'échéance : le 3 du mois suivant
    IF p_mois = 12 THEN
        v_echeance := (p_annee + 1 || '-01-03')::DATE;
    ELSE
        v_echeance := (p_annee || '-' || LPAD((p_mois + 1)::TEXT, 2, '0') || '-03')::DATE;
    END IF;

    -- Contrôle de retard
    IF CURRENT_DATE > v_echeance THEN
        v_est_en_retard := TRUE;
    END IF;

    -- Récupération des libellés géographiques
    SELECT nom INTO v_arr_nom FROM public.arrondissements WHERE id = v_user.arrondissement_id;
    SELECT nom INTO v_com_nom FROM public.communes WHERE id = v_user.commune_id;
    SELECT nom INTO v_cs_nom FROM public.structures_sante WHERE commune_id = v_user.commune_id LIMIT 1;

    v_seq := nextval('seq_numero_rma');
    v_numero := 'RMA-' || p_annee::TEXT || '-' || LPAD(p_mois::TEXT, 2, '0') || '-' || LPAD(v_seq::TEXT, 4, '0');

    INSERT INTO public.rapports_mensuels_ascq (
        numero_rapport,
        ascq_id,
        mois,
        annee,
        statut,
        echeance_date,
        est_en_retard,
        date_validation,
        signature_tactile,
        departement_id,
        commune_id,
        arrondissement_id,
        arrondissement_nom,
        commune_nom,
        centre_sante_nom,
        source_financement,
        rc_en_charge,
        rc_actifs,
        menages_en_charge,
        menages_visites,
        personnes_touchees_total,
        menages_eau_potable,
        menages_latrines,
        menages_mild_bon_etat,
        enfants_0_5_ans,
        femmes_enceintes,
        enfants_sous_vaccines_orientes,
        cas_diarrhee,
        cas_ira,
        cas_malnutrition,
        cas_palu_tdr_positif,
        cas_palu_tdr_negatif,
        cas_tuberculose,
        cas_hta,
        cas_diabete,
        donnees_surveillance,
        sante_animale,
        cas_referes_centre_sante,
        cas_referes_gups,
        cas_pris_en_charge_communaute,
        autres_activites,
        difficultes,
        recommandations,
        updated_at
    ) VALUES (
        v_numero,
        v_user_id,
        p_mois,
        p_annee,
        CASE WHEN p_valider THEN 'VALIDE' ELSE 'BROUILLON' END,
        v_echeance,
        v_est_en_retard,
        CASE WHEN p_valider THEN NOW() ELSE NULL END,
        p_signature_tactile,
        v_user.departement_id,
        v_user.commune_id,
        v_user.arrondissement_id,
        COALESCE(v_arr_nom, 'Arrondissement'),
        COALESCE(v_com_nom, 'Commune'),
        COALESCE(v_cs_nom, 'CSC'),
        COALESCE(v_user.source_financement, 'LLF'),
        COALESCE(p_rc_en_charge, 0),
        COALESCE(p_rc_actifs, 0),
        COALESCE(p_menages_en_charge, 0),
        COALESCE(p_menages_visites, 0),
        COALESCE(p_personnes_touchees_total, 0),
        COALESCE(p_menages_eau_potable, 0),
        COALESCE(p_menages_latrines, 0),
        COALESCE(p_menages_mild_bon_etat, 0),
        COALESCE(p_enfants_0_5_ans, 0),
        COALESCE(p_femmes_enceintes, 0),
        COALESCE(p_enfants_sous_vaccines_orientes, 0),
        COALESCE(p_cas_diarrhee, 0),
        COALESCE(p_cas_ira, 0),
        COALESCE(p_cas_malnutrition, 0),
        COALESCE(p_cas_palu_tdr_positif, 0),
        COALESCE(p_cas_palu_tdr_negatif, 0),
        COALESCE(p_cas_tuberculose, 0),
        COALESCE(p_cas_hta, 0),
        COALESCE(p_cas_diabete, 0),
        COALESCE(p_donnees_surveillance, '{}'::jsonb),
        COALESCE(p_sante_animale, '{}'::jsonb),
        COALESCE(p_cas_referes_centre_sante, 0),
        COALESCE(p_cas_referes_gups, 0),
        COALESCE(p_cas_pris_en_charge_communaute, 0),
        COALESCE(p_autres_activites, '[]'::jsonb),
        COALESCE(p_difficultes, '[]'::jsonb),
        COALESCE(p_recommandations, '[]'::jsonb),
        NOW()
    )
    ON CONFLICT (ascq_id, mois, annee)
    DO UPDATE SET
        statut = CASE WHEN p_valider THEN 'VALIDE' ELSE EXCLUDED.statut END,
        date_validation = CASE WHEN p_valider THEN NOW() ELSE rapports_mensuels_ascq.date_validation END,
        signature_tactile = COALESCE(EXCLUDED.signature_tactile, rapports_mensuels_ascq.signature_tactile),
        rc_en_charge = EXCLUDED.rc_en_charge,
        rc_actifs = EXCLUDED.rc_actifs,
        menages_en_charge = EXCLUDED.menages_en_charge,
        menages_visites = EXCLUDED.menages_visites,
        personnes_touchees_total = EXCLUDED.personnes_touchees_total,
        menages_eau_potable = EXCLUDED.menages_eau_potable,
        menages_latrines = EXCLUDED.menages_latrines,
        menages_mild_bon_etat = EXCLUDED.menages_mild_bon_etat,
        enfants_0_5_ans = EXCLUDED.enfants_0_5_ans,
        femmes_enceintes = EXCLUDED.femmes_enceintes,
        enfants_sous_vaccines_orientes = EXCLUDED.enfants_sous_vaccines_orientes,
        cas_diarrhee = EXCLUDED.cas_diarrhee,
        cas_ira = EXCLUDED.cas_ira,
        cas_malnutrition = EXCLUDED.cas_malnutrition,
        cas_palu_tdr_positif = EXCLUDED.cas_palu_tdr_positif,
        cas_palu_tdr_negatif = EXCLUDED.cas_palu_tdr_negatif,
        cas_tuberculose = EXCLUDED.cas_tuberculose,
        cas_hta = EXCLUDED.cas_hta,
        cas_diabete = EXCLUDED.cas_diabete,
        donnees_surveillance = EXCLUDED.donnees_surveillance,
        sante_animale = EXCLUDED.sante_animale,
        cas_referes_centre_sante = EXCLUDED.cas_referes_centre_sante,
        cas_referes_gups = EXCLUDED.cas_referes_gups,
        cas_pris_en_charge_communaute = EXCLUDED.cas_pris_en_charge_communaute,
        autres_activites = EXCLUDED.autres_activites,
        difficultes = EXCLUDED.difficultes,
        recommandations = EXCLUDED.recommandations,
        updated_at = NOW()
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_id,
        'numero_rapport', v_numero,
        'message', 'Rapport mensuel d''activité enregistré avec succès (' || v_numero || ')'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generer_pre_remplissage_surveillance_mensuelle TO authenticated;
GRANT EXECUTE ON FUNCTION public.enregistrer_rapport_mensuel_ascq TO authenticated;
