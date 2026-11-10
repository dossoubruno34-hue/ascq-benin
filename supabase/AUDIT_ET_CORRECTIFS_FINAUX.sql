-- =====================================================================
-- ASCQ BÉNIN - AUDIT ET CORRECTIFS GLOBAUX
-- Date : 2026-11-10
-- =====================================================================

-- 1. CORRECTION DE LA FONCTION : enregistrer_planning_hebdo_rc
-- Résout l'erreur de colonne inexistante u.ascq_id / u.village et garantit le relais_id
CREATE OR REPLACE FUNCTION public.enregistrer_planning_hebdo_rc(
    p_annee integer, 
    p_semaine integer, 
    p_date_debut date, 
    p_lignes jsonb, 
    p_village text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_ascq_id UUID;
    v_arrondissement_id UUID;
    v_village TEXT := p_village;
    v_total INT := 0;
    v_elem JSONB;
    v_planning_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié. Veuillez vous connecter.';
    END IF;

    -- Récupérer ascq_id et arrondissement_id depuis relais_communautaires et utilisateurs
    SELECT 
        rc.ascq_id, 
        COALESCE(rc.arrondissement_id, u.arrondissement_id), 
        COALESCE(v_village, rc.village_nom, 'Village')
    INTO v_ascq_id, v_arrondissement_id, v_village
    FROM public.utilisateurs u
    LEFT JOIN public.relais_communautaires rc ON rc.user_id = u.id
    WHERE u.id = v_user_id;

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
$function$;

-- 2. CORRECTION DE LA FONCTION : enregistrer_rapport_hebdo_rc
CREATE OR REPLACE FUNCTION public.enregistrer_rapport_hebdo_rc(
    p_annee integer, 
    p_semaine integer, 
    p_lignes jsonb, 
    p_village text DEFAULT NULL::text, 
    p_signature text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $function$
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
        RAISE EXCEPTION 'Non authentifié. Veuillez vous connecter.';
    END IF;

    SELECT 
        rc.ascq_id, 
        COALESCE(rc.arrondissement_id, u.arrondissement_id), 
        COALESCE(v_village, rc.village_nom, 'Village')
    INTO v_ascq_id, v_arrondissement_id, v_village
    FROM public.utilisateurs u
    LEFT JOIN public.relais_communautaires rc ON rc.user_id = u.id
    WHERE u.id = v_user_id;

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
$function$;

GRANT EXECUTE ON FUNCTION public.enregistrer_planning_hebdo_rc(integer, integer, date, jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enregistrer_rapport_hebdo_rc(integer, integer, jsonb, text, text) TO anon, authenticated;
