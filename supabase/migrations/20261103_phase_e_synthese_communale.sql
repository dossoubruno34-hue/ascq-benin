-- ==============================================================================
-- PHASE E : SYNTHÈSE COMMUNALE MENSUELLE OFFICIELLE
-- Fonction RPC agrégée sécurisée sans aucune donnée personnelle individuelle
-- Accessible au Représentant Communal, PF CCLS-TP (leur commune), Ministère et Super Admin
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.obtenir_synthese_communale_mensuelle(
    p_commune_id UUID,
    p_mois INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    p_annee INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller RECORD;
    v_commune_nom TEXT;
    v_is_authorized BOOLEAN := FALSE;
    
    v_nb_ascq INTEGER := 0;
    v_nb_rc INTEGER := 0;
    v_nb_arrondissements INTEGER := 0;
    v_nb_alertes INTEGER := 0;
    v_nb_alertes_averees INTEGER := 0;
    v_nb_deces INTEGER := 0;
    v_nb_rapports_deposes INTEGER := 0;
    v_taux_completude NUMERIC := 0;
    v_arrondissements_stats JSONB := '[]'::jsonb;
BEGIN
    SELECT * INTO v_caller FROM public.utilisateurs WHERE id = auth.uid();
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Non authentifie';
    END IF;

    -- Contrôle d'accès strict au périmètre :
    -- SUPER_ADMIN et MEMBRE_MINISTERE : Tout le pays
    -- REPRESENTANT_COMMUNAL et PF_CCLS_TP : Uniquement leur commune
    IF public.est_super_admin() OR public.est_membre_ministere() THEN
        v_is_authorized := TRUE;
    ELSIF v_caller.commune_id = p_commune_id THEN
        IF public.est_representant_communal(p_commune_id) OR public.est_pf_ccls_tp(p_commune_id) THEN
            v_is_authorized := TRUE;
        END IF;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Acces refuse : vous ne pouvez pas consulter la synthese d''une autre commune';
    END IF;

    SELECT nom INTO v_commune_nom FROM public.communes WHERE id = p_commune_id;

    -- Nombre d'arrondissements
    SELECT COUNT(*) INTO v_nb_arrondissements FROM public.arrondissements WHERE commune_id = p_commune_id;

    -- Nombre d'ASCQ validés dans la commune
    SELECT COUNT(*) INTO v_nb_ascq FROM public.utilisateurs 
    WHERE commune_id = p_commune_id AND role_technique = 'ASCQ' AND statut = 'VALIDE';

    -- Nombre de RC validés dans la commune
    SELECT COUNT(*) INTO v_nb_rc FROM public.utilisateurs 
    WHERE commune_id = p_commune_id AND role_technique = 'RC' AND statut = 'VALIDE';

    -- Alertes du mois dans la commune
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE statut = 'AVEREE' OR est_verrouille = TRUE)
    INTO v_nb_alertes, v_nb_alertes_averees
    FROM public.alertes_communautaires
    WHERE commune_id = p_commune_id 
      AND annee = p_annee 
      AND (mois = p_mois OR EXTRACT(MONTH FROM date_notification) = p_mois);

    -- Décès notifiés du mois
    SELECT COUNT(*) INTO v_nb_deces
    FROM public.deces_communautaires
    WHERE commune_id = p_commune_id 
      AND annee = p_annee 
      AND (mois = p_mois OR EXTRACT(MONTH FROM date_notification) = p_mois);

    -- Rapports mensuels déposés
    SELECT COUNT(*) INTO v_nb_rapports_deposes
    FROM public.rapports_mensuels_ascq
    WHERE commune_id = p_commune_id AND mois = p_mois AND annee = p_annee AND statut IN ('SOUMIS', 'VALIDE', 'DEPOTE');

    IF v_nb_arrondissements > 0 THEN
        v_taux_completude := ROUND((v_nb_rapports_deposes::NUMERIC / v_nb_arrondissements::NUMERIC) * 100, 1);
    END IF;

    -- Détails par arrondissement (agrégés)
    SELECT jsonb_agg(
        jsonb_build_object(
            'arrondissement_id', a.id,
            'arrondissement_nom', a.nom,
            'nb_ascq', COALESCE(u_stats.nb_ascq, 0),
            'nb_rc', COALESCE(u_stats.nb_rc, 0),
            'nb_alertes', COALESCE(al_stats.nb_alertes, 0),
            'nb_deces', COALESCE(dec_stats.nb_deces, 0),
            'rapport_depose', COALESCE(rap_stats.depose, FALSE)
        ) ORDER BY a.nom
    ) INTO v_arrondissements_stats
    FROM public.arrondissements a
    LEFT JOIN (
        SELECT arrondissement_id,
               COUNT(*) FILTER (WHERE role_technique = 'ASCQ' AND statut = 'VALIDE') as nb_ascq,
               COUNT(*) FILTER (WHERE role_technique = 'RC' AND statut = 'VALIDE') as nb_rc
        FROM public.utilisateurs
        WHERE commune_id = p_commune_id
        GROUP BY arrondissement_id
    ) u_stats ON u_stats.arrondissement_id = a.id
    LEFT JOIN (
        SELECT arrondissement_id, COUNT(*) as nb_alertes
        FROM public.alertes_communautaires
        WHERE commune_id = p_commune_id AND annee = p_annee
        GROUP BY arrondissement_id
    ) al_stats ON al_stats.arrondissement_id = a.id
    LEFT JOIN (
        SELECT arrondissement_id, COUNT(*) as nb_deces
        FROM public.deces_communautaires
        WHERE commune_id = p_commune_id AND annee = p_annee
        GROUP BY arrondissement_id
    ) dec_stats ON dec_stats.arrondissement_id = a.id
    LEFT JOIN (
        SELECT arrondissement_id, TRUE as depose
        FROM public.rapports_mensuels_ascq
        WHERE commune_id = p_commune_id AND mois = p_mois AND annee = p_annee
    ) rap_stats ON rap_stats.arrondissement_id = a.id
    WHERE a.commune_id = p_commune_id;

    RETURN jsonb_build_object(
        'commune_id', p_commune_id,
        'commune_nom', v_commune_nom,
        'mois', p_mois,
        'annee', p_annee,
        'nb_ascq_actifs', v_nb_ascq,
        'nb_rc_actifs', v_nb_rc,
        'nb_arrondissements', v_nb_arrondissements,
        'nb_alertes_notifiees', v_nb_alertes,
        'nb_alertes_averees', v_nb_alertes_averees,
        'nb_deces_notifies', v_nb_deces,
        'nb_rapports_deposes', v_nb_rapports_deposes,
        'taux_completude_pourcent', v_taux_completude,
        'arrondissements', COALESCE(v_arrondissements_stats, '[]'::jsonb)
    );
END;
$$;
