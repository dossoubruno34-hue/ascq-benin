-- =====================================================================
-- ASCQ BÉNIN - Migration Phase 8 : Planning, Activités menées, Suivi groupé des RC
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PLANNING DES ACTIVITÉS DE L'ASCQ
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.plannings_ascq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ascq_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
    annee INTEGER NOT NULL,
    titre TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'BROUILLON' CHECK (statut IN ('BROUILLON', 'VALIDE')),
    signature_tactile TEXT,
    date_validation TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_planning_ascq_mois_annee UNIQUE(ascq_id, mois, annee)
);

CREATE TABLE IF NOT EXISTS public.lignes_planning_ascq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planning_id UUID NOT NULL REFERENCES public.plannings_ascq(id) ON DELETE CASCADE,
    ordre INTEGER NOT NULL DEFAULT 1,
    activite TEXT NOT NULL,
    periode TEXT NOT NULL, -- Ex: "02 au 05 Octobre" ou "Semaine 1"
    lieu TEXT NOT NULL,
    personnes_impliquees TEXT, -- Ex: "Relais, Chef de village, Ménages"
    objectifs TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planning_ascq_id ON public.plannings_ascq(ascq_id);
CREATE INDEX IF NOT EXISTS idx_lignes_planning_id ON public.lignes_planning_ascq(planning_id);

-- ---------------------------------------------------------------------
-- 2. ACTIVITÉS MENÉES PAR L'ASCQ
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.activites_menees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ascq_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    titre_activite TEXT NOT NULL,
    categorie TEXT NOT NULL DEFAULT 'COMMUNAUTAIRE',
    date_activite DATE NOT NULL DEFAULT CURRENT_DATE,
    periode_texte TEXT,
    lieu TEXT NOT NULL,
    superviseur_nom TEXT,
    superviseur_fonction TEXT,
    acteurs_presents JSONB DEFAULT '[]'::jsonb, -- [{nom, prenoms, fonction}]
    liste_presence JSONB DEFAULT '[]'::jsonb, -- [{nom, prenoms, structure, telephone, emargement}]
    photo_url TEXT,
    commentaires TEXT,
    difficultes_rencontrees TEXT,
    statut TEXT NOT NULL DEFAULT 'REALISE' CHECK (statut IN ('REALISE', 'EN_COURS', 'ANNULE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activites_ascq_id ON public.activites_menees(ascq_id);
CREATE INDEX IF NOT EXISTS idx_activites_date ON public.activites_menees(date_activite);

-- ---------------------------------------------------------------------
-- 3. SUIVI GROUPÉ DES RELAIS COMMUNAUTAIRES (RC)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.seances_suivi_relais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ascq_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    date_seance DATE NOT NULL DEFAULT CURRENT_DATE,
    lieu TEXT NOT NULL,
    ordre_du_jour TEXT NOT NULL,
    relais_presents JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{relais_id, nom_complet, village, present: bool, motif: text}]
    inventaire_materiel JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{materiel_nom, etat, recommandations}]
    points_discutes TEXT,
    decisions_prises TEXT,
    date_prochaine_seance DATE,
    signature_tactile TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suivi_relais_ascq_id ON public.seances_suivi_relais(ascq_id);
CREATE INDEX IF NOT EXISTS idx_suivi_relais_date ON public.seances_suivi_relais(date_seance);

-- ---------------------------------------------------------------------
-- 4. POLITIQUES DE SÉCURITÉ RLS
-- ---------------------------------------------------------------------

ALTER TABLE public.plannings_ascq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lignes_planning_ascq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activites_menees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seances_suivi_relais ENABLE ROW LEVEL SECURITY;

-- Plannings : l'ASCQ propriétaire a un accès complet
CREATE POLICY "Gestion planning ascq" ON public.plannings_ascq
    FOR ALL USING (ascq_id = auth.uid());

CREATE POLICY "Gestion lignes planning" ON public.lignes_planning_ascq
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.plannings_ascq p WHERE p.id = planning_id AND p.ascq_id = auth.uid())
    );

-- Activités menées : l'ASCQ propriétaire
CREATE POLICY "Gestion activites menees" ON public.activites_menees
    FOR ALL USING (ascq_id = auth.uid());

-- Suivi groupé des RC : l'ASCQ propriétaire
CREATE POLICY "Gestion seances suivi" ON public.seances_suivi_relais
    FOR ALL USING (ascq_id = auth.uid());

-- ---------------------------------------------------------------------
-- 5. FONCTIONS RPC SÉCURISÉES
-- ---------------------------------------------------------------------

-- A. Enregistrer un planning avec ses lignes d'activités
CREATE OR REPLACE FUNCTION public.enregistrer_planning_ascq(
    p_mois INTEGER,
    p_annee INTEGER,
    p_titre TEXT,
    p_lignes JSONB, -- Array of { activite, periode, lieu, personnes_impliquees, objectifs }
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
    v_planning_id UUID;
    v_ligne RECORD;
    v_ordre INTEGER := 1;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié.'; END IF;

    -- Création ou mise à jour du planning
    INSERT INTO public.plannings_ascq (
        ascq_id,
        mois,
        annee,
        titre,
        statut,
        signature_tactile,
        date_validation,
        updated_at
    ) VALUES (
        v_user_id,
        p_mois,
        p_annee,
        TRIM(p_titre),
        CASE WHEN p_valider THEN 'VALIDE' ELSE 'BROUILLON' END,
        p_signature_tactile,
        CASE WHEN p_valider THEN NOW() ELSE NULL END,
        NOW()
    )
    ON CONFLICT (ascq_id, mois, annee)
    DO UPDATE SET
        titre = EXCLUDED.titre,
        statut = EXCLUDED.statut,
        signature_tactile = COALESCE(EXCLUDED.signature_tactile, plannings_ascq.signature_tactile),
        date_validation = CASE WHEN p_valider THEN NOW() ELSE plannings_ascq.date_validation END,
        updated_at = NOW()
    RETURNING id INTO v_planning_id;

    -- Remplacer les lignes
    DELETE FROM public.lignes_planning_ascq WHERE planning_id = v_planning_id;

    FOR v_ligne IN SELECT * FROM jsonb_to_recordset(p_lignes) AS x(
        activite TEXT,
        periode TEXT,
        lieu TEXT,
        personnes_impliquees TEXT,
        objectifs TEXT
    ) LOOP
        INSERT INTO public.lignes_planning_ascq (
            planning_id,
            ordre,
            activite,
            periode,
            lieu,
            personnes_impliquees,
            objectifs
        ) VALUES (
            v_planning_id,
            v_ordre,
            TRIM(v_ligne.activite),
            TRIM(v_ligne.periode),
            TRIM(v_ligne.lieu),
            TRIM(v_ligne.personnes_impliquees),
            TRIM(v_ligne.objectifs)
        );
        v_ordre := v_ordre + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'planning_id', v_planning_id,
        'message', 'Planning d''activités enregistré avec succès.'
    );
END;
$$;

-- B. Enregistrer une activité menée
CREATE OR REPLACE FUNCTION public.enregistrer_activite_menee(
    p_titre_activite TEXT,
    p_categorie TEXT,
    p_date_activite DATE,
    p_periode_texte TEXT,
    p_lieu TEXT,
    p_superviseur_nom TEXT,
    p_superviseur_fonction TEXT,
    p_acteurs_presents JSONB,
    p_liste_presence JSONB,
    p_photo_url TEXT,
    p_commentaires TEXT,
    p_difficultes_rencontrees TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié.'; END IF;

    INSERT INTO public.activites_menees (
        ascq_id,
        titre_activite,
        categorie,
        date_activite,
        periode_texte,
        lieu,
        superviseur_nom,
        superviseur_fonction,
        acteurs_presents,
        liste_presence,
        photo_url,
        commentaires,
        difficultes_rencontrees,
        statut
    ) VALUES (
        v_user_id,
        TRIM(p_titre_activite),
        COALESCE(p_categorie, 'COMMUNAUTAIRE'),
        COALESCE(p_date_activite, CURRENT_DATE),
        p_periode_texte,
        TRIM(p_lieu),
        TRIM(p_superviseur_nom),
        TRIM(p_superviseur_fonction),
        COALESCE(p_acteurs_presents, '[]'::jsonb),
        COALESCE(p_liste_presence, '[]'::jsonb),
        p_photo_url,
        p_commentaires,
        p_difficultes_rencontrees,
        'REALISE'
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_id,
        'message', 'Compte-rendu d''activité menée enregistré avec succès.'
    );
END;
$$;

-- C. Enregistrer une séance de suivi groupé des RC
CREATE OR REPLACE FUNCTION public.enregistrer_suivi_relais(
    p_date_seance DATE,
    p_lieu TEXT,
    p_ordre_du_jour TEXT,
    p_relais_presents JSONB,
    p_inventaire_materiel JSONB,
    p_points_discutes TEXT,
    p_decisions_prises TEXT,
    p_date_prochaine_seance DATE,
    p_signature_tactile TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié.'; END IF;

    INSERT INTO public.seances_suivi_relais (
        ascq_id,
        date_seance,
        lieu,
        ordre_du_jour,
        relais_presents,
        inventaire_materiel,
        points_discutes,
        decisions_prises,
        date_prochaine_seance,
        signature_tactile
    ) VALUES (
        v_user_id,
        COALESCE(p_date_seance, CURRENT_DATE),
        TRIM(p_lieu),
        TRIM(p_ordre_du_jour),
        COALESCE(p_relais_presents, '[]'::jsonb),
        COALESCE(p_inventaire_materiel, '[]'::jsonb),
        p_points_discutes,
        p_decisions_prises,
        p_date_prochaine_seance,
        p_signature_tactile
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_id,
        'message', 'Séance de suivi groupé des Relais enregistrée avec succès.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.enregistrer_planning_ascq TO authenticated;
GRANT EXECUTE ON FUNCTION public.enregistrer_activite_menee TO authenticated;
GRANT EXECUTE ON FUNCTION public.enregistrer_suivi_relais TO authenticated;
