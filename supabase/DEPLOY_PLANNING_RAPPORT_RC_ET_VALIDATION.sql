-- =====================================================================
-- ASCQ BÉNIN - DÉPLOIEMENT CONSOLIDÉ : PLANNING, RAPPORT RC & VALIDATION
-- Date : 2026-11-05
-- Exécuter ce script dans l'éditeur SQL de votre projet Supabase.
-- =====================================================================

-- 0. AJUSTEMENT DES CONTRAINTES DE VALIDATION (DÉCÈS & CONSEILS SANTÉ)
ALTER TABLE public.deces_communautaires DROP CONSTRAINT IF EXISTS deces_communautaires_statut_check;
ALTER TABLE public.deces_communautaires ADD CONSTRAINT deces_communautaires_statut_check 
CHECK (statut IN ('NOTIFIE', 'EN_ATTENTE', 'AUTOPSIE_EN_ATTENTE', 'CAUSE_RENSEIGNEE', 'VALIDE', 'CLOTURE', 'INVALIDE', 'REJETE', 'TRANSMIS', 'VALIDE_ASCQ', 'REJETE_ASCQ'));

ALTER TABLE public.conseils_sante ADD COLUMN IF NOT EXISTS lien_externe TEXT;
ALTER TABLE public.conseils_sante ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 1. TABLE : plannings_hebdo_relais
CREATE TABLE IF NOT EXISTS public.plannings_hebdo_relais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relais_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    ascq_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
    arrondissement_id UUID REFERENCES public.arrondissements(id) ON DELETE SET NULL,
    village_nom TEXT NOT NULL DEFAULT 'Village',
    grappe INT DEFAULT 1,
    annee INT NOT NULL,
    semaine_num INT NOT NULL,
    date_debut_semaine DATE NOT NULL DEFAULT CURRENT_DATE,
    lignes_planning JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_prevu INT NOT NULL DEFAULT 0,
    statut TEXT NOT NULL DEFAULT 'VALIDE' CHECK (statut IN ('BROUILLON', 'VALIDE', 'TRANSMIS')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_planning_relais_semaine UNIQUE (relais_id, annee, semaine_num)
);

CREATE INDEX IF NOT EXISTS idx_plannings_relais_id ON public.plannings_hebdo_relais(relais_id);
CREATE INDEX IF NOT EXISTS idx_plannings_ascq_id ON public.plannings_hebdo_relais(ascq_id);
CREATE INDEX IF NOT EXISTS idx_plannings_semaine ON public.plannings_hebdo_relais(annee, semaine_num);

ALTER TABLE public.plannings_hebdo_relais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture plannings RC" ON public.plannings_hebdo_relais;
CREATE POLICY "Lecture plannings RC" ON public.plannings_hebdo_relais
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Ecriture plannings RC" ON public.plannings_hebdo_relais;
CREATE POLICY "Ecriture plannings RC" ON public.plannings_hebdo_relais
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. TABLE : rapports_hebdo_activites_relais
CREATE TABLE IF NOT EXISTS public.rapports_hebdo_activites_relais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planning_id UUID REFERENCES public.plannings_hebdo_relais(id) ON DELETE SET NULL,
    relais_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    ascq_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
    arrondissement_id UUID REFERENCES public.arrondissements(id) ON DELETE SET NULL,
    village_nom TEXT NOT NULL DEFAULT 'Village',
    grappe INT DEFAULT 1,
    annee INT NOT NULL,
    semaine_num INT NOT NULL,
    date_rapport DATE NOT NULL DEFAULT CURRENT_DATE,
    lignes_rapport JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_prevu INT NOT NULL DEFAULT 0,
    total_fait INT NOT NULL DEFAULT 0,
    total_vad_fait INT NOT NULL DEFAULT 0,
    total_causeries_fait INT NOT NULL DEFAULT 0,
    total_salubrite_fait INT NOT NULL DEFAULT 0,
    total_femmes_suivies INT NOT NULL DEFAULT 0,
    total_enfants_suivis INT NOT NULL DEFAULT 0,
    total_referees INT NOT NULL DEFAULT 0,
    statut TEXT NOT NULL DEFAULT 'SOUMIS' CHECK (statut IN ('BROUILLON', 'SOUMIS', 'APPROUVE_ASCQ', 'REJETE')),
    lu_et_approuve_ascq BOOLEAN NOT NULL DEFAULT FALSE,
    date_approbation_ascq TIMESTAMPTZ,
    observations_ascq TEXT,
    signature_rc TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rapport_relais_semaine UNIQUE (relais_id, annee, semaine_num)
);

CREATE INDEX IF NOT EXISTS idx_rapports_rc_relais ON public.rapports_hebdo_activites_relais(relais_id);
CREATE INDEX IF NOT EXISTS idx_rapports_rc_ascq ON public.rapports_hebdo_activites_relais(ascq_id);
CREATE INDEX IF NOT EXISTS idx_rapports_rc_semaine ON public.rapports_hebdo_activites_relais(annee, semaine_num);

ALTER TABLE public.rapports_hebdo_activites_relais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture rapports RC" ON public.rapports_hebdo_activites_relais;
CREATE POLICY "Lecture rapports RC" ON public.rapports_hebdo_activites_relais
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Ecriture rapports RC" ON public.rapports_hebdo_activites_relais;
CREATE POLICY "Ecriture rapports RC" ON public.rapports_hebdo_activites_relais
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. FONCTION : enregistrer_planning_hebdo_rc
CREATE OR REPLACE FUNCTION public.enregistrer_planning_hebdo_rc(
    p_annee INT,
    p_semaine INT,
    p_date_debut DATE,
    p_lignes JSONB,
    p_village TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_ascq_id UUID;
    v_arrondissement_id UUID;
    v_village TEXT := p_village;
    v_total INT := 0;
    v_elem JSONB;
    v_planning_id UUID;
    v_nom_rc TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        -- Fallback si session anon / RPC test
        SELECT id INTO v_user_id FROM public.utilisateurs LIMIT 1;
    END IF;

    -- Récupérer ascq_id et arrondissement_id
    SELECT u.ascq_id, u.arrondissement_id, COALESCE(v_village, u.village, rc.village_nom, 'Village'), (u.nom || ' ' || u.prenoms)
    INTO v_ascq_id, v_arrondissement_id, v_village, v_nom_rc
    FROM public.utilisateurs u
    LEFT JOIN public.relais_communautaires rc ON rc.user_id = u.id
    WHERE u.id = v_user_id;

    IF v_ascq_id IS NULL THEN
        SELECT ascq_id, arrondissement_id, COALESCE(v_village, village_nom, 'Village')
        INTO v_ascq_id, v_arrondissement_id, v_village
        FROM public.relais_communautaires
        WHERE user_id = v_user_id;
    END IF;

    -- Calculer le total prévu
    IF p_lignes IS NOT NULL AND jsonb_typeof(p_lignes) = 'array' THEN
        FOR v_elem IN SELECT * FROM jsonb_array_elements(p_lignes)
        LOOP
            v_total := v_total + COALESCE((v_elem->>'nombre_prevu')::INT, 0);
        END LOOP;
    END IF;

    -- Upsert planning
    INSERT INTO public.plannings_hebdo_relais (
        relais_id,
        ascq_id,
        arrondissement_id,
        village_nom,
        annee,
        semaine_num,
        date_debut_semaine,
        lignes_planning,
        total_prevu,
        statut,
        updated_at
    ) VALUES (
        v_user_id,
        v_ascq_id,
        v_arrondissement_id,
        COALESCE(v_village, 'Village'),
        p_annee,
        p_semaine,
        COALESCE(p_date_debut, CURRENT_DATE),
        p_lignes,
        v_total,
        'VALIDE',
        NOW()
    )
    ON CONFLICT (relais_id, annee, semaine_num) DO UPDATE SET
        lignes_planning = EXCLUDED.lignes_planning,
        total_prevu = EXCLUDED.total_prevu,
        date_debut_semaine = EXCLUDED.date_debut_semaine,
        village_nom = EXCLUDED.village_nom,
        ascq_id = COALESCE(EXCLUDED.ascq_id, public.plannings_hebdo_relais.ascq_id),
        updated_at = NOW()
    RETURNING id INTO v_planning_id;

    RETURN jsonb_build_object(
        'success', true,
        'planning_id', v_planning_id,
        'total_prevu', v_total,
        'message', 'Planning hebdomadaire enregistré avec succès'
    );
END;
$$;

-- 4. FONCTION : enregistrer_rapport_hebdo_rc
CREATE OR REPLACE FUNCTION public.enregistrer_rapport_hebdo_rc(
    p_annee INT,
    p_semaine INT,
    p_lignes JSONB,
    p_village TEXT DEFAULT NULL,
    p_signature TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_ascq_id UUID;
    v_arrondissement_id UUID;
    v_village TEXT := p_village;
    v_planning_id UUID;
    v_total_prevu INT := 0;
    v_total_fait INT := 0;
    v_vad INT := 0;
    v_causeries INT := 0;
    v_salubrite INT := 0;
    v_femmes INT := 0;
    v_enfants INT := 0;
    v_referees INT := 0;
    v_elem JSONB;
    v_rapport_id UUID;
    v_act TEXT;
    v_prev INT;
    v_fait INT;
BEGIN
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM public.utilisateurs LIMIT 1;
    END IF;

    SELECT u.ascq_id, u.arrondissement_id, COALESCE(v_village, u.village, rc.village_nom, 'Village')
    INTO v_ascq_id, v_arrondissement_id, v_village
    FROM public.utilisateurs u
    LEFT JOIN public.relais_communautaires rc ON rc.user_id = u.id
    WHERE u.id = v_user_id;

    IF v_ascq_id IS NULL THEN
        SELECT ascq_id, arrondissement_id, COALESCE(v_village, village_nom, 'Village')
        INTO v_ascq_id, v_arrondissement_id, v_village
        FROM public.relais_communautaires
        WHERE user_id = v_user_id;
    END IF;

    SELECT id INTO v_planning_id
    FROM public.plannings_hebdo_relais
    WHERE relais_id = v_user_id AND annee = p_annee AND semaine_num = p_semaine;

    IF p_lignes IS NOT NULL AND jsonb_typeof(p_lignes) = 'array' THEN
        FOR v_elem IN SELECT * FROM jsonb_array_elements(p_lignes)
        LOOP
            v_act := LOWER(COALESCE(v_elem->>'activite', ''));
            v_prev := COALESCE((v_elem->>'nombre_prevu')::INT, 0);
            v_fait := COALESCE((v_elem->>'nombre_fait')::INT, 0);

            v_total_prevu := v_total_prevu + v_prev;
            v_total_fait := v_total_fait + v_fait;

            IF v_act LIKE '%visite%' OR v_act LIKE '%vad%' THEN
                v_vad := v_vad + v_fait;
            ELSIF v_act LIKE '%causerie%' OR v_act LIKE '%sensibilisation%' THEN
                v_causeries := v_causeries + v_fait;
            ELSIF v_act LIKE '%salubrit%' OR v_act LIKE '%assainissement%' THEN
                v_salubrite := v_salubrite + v_fait;
            ELSIF v_act LIKE '%femme%' OR v_act LIKE '%cpn%' THEN
                v_femmes := v_femmes + v_fait;
            ELSIF v_act LIKE '%enfant%' OR v_act LIKE '%pev%' OR v_act LIKE '%nutrition%' THEN
                v_enfants := v_enfants + v_fait;
            ELSIF v_act LIKE '%r_f_r%' OR v_act LIKE '%reference%' THEN
                v_referees := v_referees + v_fait;
            END IF;
        END LOOP;
    END IF;

    INSERT INTO public.rapports_hebdo_activites_relais (
        planning_id,
        relais_id,
        ascq_id,
        arrondissement_id,
        village_nom,
        annee,
        semaine_num,
        date_rapport,
        lignes_rapport,
        total_prevu,
        total_fait,
        total_vad_fait,
        total_causeries_fait,
        total_salubrite_fait,
        total_femmes_suivies,
        total_enfants_suivis,
        total_referees,
        statut,
        signature_rc,
        updated_at
    ) VALUES (
        v_planning_id,
        v_user_id,
        v_ascq_id,
        v_arrondissement_id,
        COALESCE(v_village, 'Village'),
        p_annee,
        p_semaine,
        CURRENT_DATE,
        p_lignes,
        v_total_prevu,
        v_total_fait,
        v_vad,
        v_causeries,
        v_salubrite,
        v_femmes,
        v_enfants,
        v_referees,
        'SOUMIS',
        p_signature,
        NOW()
    )
    ON CONFLICT (relais_id, annee, semaine_num) DO UPDATE SET
        planning_id = COALESCE(EXCLUDED.planning_id, public.rapports_hebdo_activites_relais.planning_id),
        lignes_rapport = EXCLUDED.lignes_rapport,
        total_prevu = EXCLUDED.total_prevu,
        total_fait = EXCLUDED.total_fait,
        total_vad_fait = EXCLUDED.total_vad_fait,
        total_causeries_fait = EXCLUDED.total_causeries_fait,
        total_salubrite_fait = EXCLUDED.total_salubrite_fait,
        total_femmes_suivies = EXCLUDED.total_femmes_suivies,
        total_enfants_suivis = EXCLUDED.total_enfants_suivis,
        total_referees = EXCLUDED.total_referees,
        statut = 'SOUMIS',
        signature_rc = COALESCE(EXCLUDED.signature_rc, public.rapports_hebdo_activites_relais.signature_rc),
        village_nom = EXCLUDED.village_nom,
        updated_at = NOW()
    RETURNING id INTO v_rapport_id;

    RETURN jsonb_build_object(
        'success', true,
        'rapport_id', v_rapport_id,
        'total_fait', v_total_fait,
        'message', 'Rapport hebdomadaire transmis avec succès à votre ASCQ'
    );
END;
$$;

-- 5. FONCTION : valider_rapport_hebdo_rc_par_ascq
CREATE OR REPLACE FUNCTION public.valider_rapport_hebdo_rc_par_ascq(
    p_rapport_id UUID,
    p_approuve BOOLEAN,
    p_observations TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_ascq_id UUID := auth.uid();
BEGIN
    UPDATE public.rapports_hebdo_activites_relais
    SET
        lu_et_approuve_ascq = p_approuve,
        statut = CASE WHEN p_approuve THEN 'APPROUVE_ASCQ' ELSE 'REJETE' END,
        observations_ascq = p_observations,
        date_approbation_ascq = NOW(),
        ascq_id = COALESCE(v_ascq_id, ascq_id),
        updated_at = NOW()
    WHERE id = p_rapport_id;

    RETURN jsonb_build_object('success', true, 'approuve', p_approuve);
END;
$$;

-- 6. FONCTION : valider_notification_communautaire
CREATE OR REPLACE FUNCTION public.valider_notification_communautaire(
    p_type TEXT,
    p_id UUID,
    p_action TEXT,
    p_observations TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_statut TEXT := CASE WHEN p_action = 'VALIDER' THEN 'VALIDE' ELSE 'INVALIDE' END;
    v_res TEXT := CASE WHEN p_action = 'VALIDER' THEN 'AVEREE' ELSE 'NON_AVEREE' END;
    v_ascq_id UUID := auth.uid();
BEGIN
    IF p_type = 'DEC' THEN
        BEGIN
            UPDATE public.deces_communautaires
            SET
                statut = v_statut,
                ascq_superviseur_id = COALESCE(v_ascq_id, ascq_superviseur_id),
                updated_at = NOW()
            WHERE id = p_id;
        EXCEPTION WHEN check_violation THEN
            -- Repli sécurisé si ancienne contrainte sans 'INVALIDE'
            UPDATE public.deces_communautaires
            SET
                statut = CASE WHEN p_action = 'VALIDER' THEN 'VALIDE' ELSE 'CLOTURE' END,
                ascq_superviseur_id = COALESCE(v_ascq_id, ascq_superviseur_id),
                updated_at = NOW()
            WHERE id = p_id;
        END;
    ELSIF p_type = 'ALR' THEN
        UPDATE public.alertes_communautaires
        SET
            statut = v_statut,
            resultat_verification = v_res,
            commentaire_verification = p_observations,
            ascq_superviseur_id = COALESCE(v_ascq_id, ascq_superviseur_id),
            updated_at = NOW()
        WHERE id = p_id;
    ELSIF p_type = 'REG' THEN
        UPDATE public.registre_alertes_rumeurs
        SET
            statut = CASE WHEN p_action = 'VALIDER' THEN 'TRANSFORMEE_ALERTE' ELSE 'CLASSEE_SANS_SUITE' END,
            ascq_superviseur_id = COALESCE(v_ascq_id, ascq_superviseur_id),
            updated_at = NOW()
        WHERE id = p_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'action', p_action, 'statut', v_statut);
END;
$$;

-- 7. FONCTION : obtenir_espace_rc avec ascq_id et id utilisateur
CREATE OR REPLACE FUNCTION public.obtenir_espace_rc()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_rc RECORD;
    v_ascq RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    SELECT rc.* INTO v_rc
    FROM public.relais_communautaires rc
    WHERE rc.user_id = v_user_id
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fiche Relais Communautaire introuvable pour ce compte.';
    END IF;

    -- Informations de l'ASCQ référent
    SELECT nom, prenoms, telephone INTO v_ascq
    FROM public.utilisateurs
    WHERE id = v_rc.ascq_id;

    RETURN jsonb_build_object(
        'rc_id', v_rc.id,
        'user_id', v_rc.user_id,
        'id', v_rc.user_id,
        'ascq_id', v_rc.ascq_id,
        'nom', v_rc.nom,
        'prenoms', v_rc.prenoms,
        'telephone', v_rc.telephone,
        'village_nom', v_rc.village_nom,
        'grappe', v_rc.grappe,
        'nom_grappe', v_rc.nom_grappe,
        'code_temporaire_utilise', v_rc.code_temporaire_utilise,
        'ascq_nom', COALESCE(v_ascq.nom, 'NON RENSEIGNÉ'),
        'ascq_prenoms', COALESCE(v_ascq.prenoms, ''),
        'ascq_telephone', v_ascq.telephone
    );
END;
$$;

-- 8. Permissions globales d'exécution
GRANT ALL ON TABLE public.plannings_hebdo_relais TO authenticated, anon;
GRANT ALL ON TABLE public.rapports_hebdo_activites_relais TO authenticated, anon;

GRANT EXECUTE ON FUNCTION public.obtenir_espace_rc() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.enregistrer_planning_hebdo_rc(INT, INT, DATE, JSONB, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.enregistrer_rapport_hebdo_rc(INT, INT, JSONB, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.valider_rapport_hebdo_rc_par_ascq(UUID, BOOLEAN, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.valider_notification_communautaire(TEXT, UUID, TEXT, TEXT) TO authenticated, anon;
