-- =====================================================================
-- SCRIPT DE NETTOYAGE & PURGE TOTALE DES COMPTES DE DÉMONSTRATION
-- À EXÉCUTER APRÈS LA PRÉSENTATION AU BUREAU NATIONAL
-- Ministère de la Santé - ASCQ Bénin
-- =====================================================================

CREATE OR REPLACE FUNCTION public.purger_comptes_demonstration()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_nb_users INT := 0;
    v_nb_consults INT := 0;
    v_nb_alertes INT := 0;
    v_nb_deces INT := 0;
    v_nb_rma INT := 0;
    v_nb_hebdo INT := 0;
    v_nb_relais INT := 0;
    v_nb_fiches_rc INT := 0;
    v_bruno_id UUID;
BEGIN
    -- 1. Identifier l'ID de Bruno pour préserver son profil réel
    SELECT id INTO v_bruno_id FROM public.utilisateurs WHERE telephone LIKE '%69031463%' LIMIT 1;

    -- 2. Suppression des consultations de test
    DELETE FROM public.consultations_communautaires
    WHERE nom_patient LIKE '%(TEST)%'
       OR ascq_id IN (SELECT id FROM public.utilisateurs WHERE email LIKE '%@demo-ascq.bj' OR telephone LIKE '+2290199%');
    GET DIAGNOSTICS v_nb_consults = ROW_COUNT;

    -- 3. Suppression des alertes et décès de test
    DELETE FROM public.cas_identite_privee
    WHERE alerte_id IN (
        SELECT id FROM public.alertes_communautaires 
        WHERE numero_alerte LIKE 'ALR-2026-TOHOUES-%' 
           OR numero_alerte LIKE 'ALR-2026-DASSO-%'
           OR numero_alerte LIKE 'ALR-2026-%'
           OR notificateur_id IN (SELECT id FROM public.utilisateurs WHERE email LIKE '%@demo-ascq.bj' OR telephone LIKE '+2290199%')
    );

    DELETE FROM public.alertes_communautaires
    WHERE numero_alerte LIKE 'ALR-2026-TOHOUES-%' 
       OR numero_alerte LIKE 'ALR-2026-DASSO-%'
       OR notificateur_id IN (SELECT id FROM public.utilisateurs WHERE email LIKE '%@demo-ascq.bj' OR telephone LIKE '+2290199%')
       OR (numero_alerte LIKE 'ALR-2026-%' AND notificateur_titre = 'RC' AND village_nom LIKE '%Centre%');
    GET DIAGNOSTICS v_nb_alertes = ROW_COUNT;

    DELETE FROM public.deces_identite_privee
    WHERE deces_id IN (
        SELECT id FROM public.deces_communautaires
        WHERE numero_deces LIKE 'DEC-2026-TOHOUES-%'
           OR notificateur_id IN (SELECT id FROM public.utilisateurs WHERE email LIKE '%@demo-ascq.bj' OR telephone LIKE '+2290199%')
    );

    DELETE FROM public.deces_communautaires
    WHERE numero_deces LIKE 'DEC-2026-TOHOUES-%'
       OR notificateur_id IN (SELECT id FROM public.utilisateurs WHERE email LIKE '%@demo-ascq.bj' OR telephone LIKE '+2290199%');
    GET DIAGNOSTICS v_nb_deces = ROW_COUNT;

    -- 4. Suppression des fiches d'activités hebdomadaires des RC de démonstration
    DELETE FROM public.fiches_activites_hebdo_relais
    WHERE relais_id IN (SELECT id FROM public.utilisateurs WHERE email LIKE '%@demo-ascq.bj' OR telephone LIKE '+2290199%')
       OR ascq_id IN (SELECT id FROM public.utilisateurs WHERE email LIKE '%@demo-ascq.bj' OR telephone LIKE '+2290199%')
       OR (v_bruno_id IS NOT NULL AND ascq_id = v_bruno_id AND created_at >= NOW() - INTERVAL '1 day');
    GET DIAGNOSTICS v_nb_fiches_rc = ROW_COUNT;

    -- 5. Suppression des RMA et PNSC de test
    DELETE FROM public.rapports_mensuels_ascq
    WHERE numero_rapport LIKE 'RMA-2026-10-TOHOUES'
       OR numero_rapport LIKE 'RMA-2026-10-DASSO'
       OR numero_rapport LIKE 'RMA-2026-10-%'
       OR ascq_id IN (SELECT id FROM public.utilisateurs WHERE email LIKE '%@demo-ascq.bj' OR telephone LIKE '+2290199%');
    GET DIAGNOSTICS v_nb_rma = ROW_COUNT;

    DELETE FROM public.rapports_hebdo_pnsc
    WHERE ascq_id IN (SELECT id FROM public.utilisateurs WHERE email LIKE '%@demo-ascq.bj' OR telephone LIKE '+2290199%');
    GET DIAGNOSTICS v_nb_hebdo = ROW_COUNT;

    -- 6. Suppression des Relais Communautaires de démonstration
    DELETE FROM public.relais_communautaires
    WHERE user_id IN (SELECT id FROM public.utilisateurs WHERE email LIKE '%@demo-ascq.bj' OR telephone LIKE '+2290199%')
       OR telephone LIKE '+2290199%';
    GET DIAGNOSTICS v_nb_relais = ROW_COUNT;

    -- 7. Suppression des profils ASCQ de démonstration
    DELETE FROM public.ascq_profils
    WHERE id IN (
        SELECT id FROM public.utilisateurs 
        WHERE (email LIKE '%@demo-ascq.bj' OR telephone LIKE '+2290199%')
          AND telephone NOT LIKE '%69031463%'
    );

    -- 8. Suppression des notifications destinées aux comptes démo
    DELETE FROM public.notifications
    WHERE destinataire_id IN (
        SELECT id FROM public.utilisateurs 
        WHERE (email LIKE '%@demo-ascq.bj' OR telephone LIKE '+2290199%')
          AND telephone NOT LIKE '%69031463%'
    );

    -- 9. Suppression de public.utilisateurs (sauf Bruno DOSSOU)
    DELETE FROM public.utilisateurs
    WHERE (email LIKE '%@demo-ascq.bj' OR telephone LIKE '+2290199%')
      AND telephone NOT LIKE '%69031463%';
    GET DIAGNOSTICS v_nb_users = ROW_COUNT;

    -- 10. Suppression définitive de auth.identities et auth.users
    DELETE FROM auth.identities
    WHERE user_id IN (
        SELECT id FROM auth.users 
        WHERE (email LIKE '%@demo-ascq.bj' OR (raw_user_meta_data->>'is_demo')::boolean = true)
          AND email NOT LIKE '%69031463%'
    );

    DELETE FROM auth.users
    WHERE (email LIKE '%@demo-ascq.bj' OR (raw_user_meta_data->>'is_demo')::boolean = true)
      AND email NOT LIKE '%69031463%';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Nettoyage des comptes de démonstration et données de test exécuté avec succès.',
        'comptes_supprimes', v_nb_users,
        'consultations_supprimees', v_nb_consults,
        'alertes_supprimees', v_nb_alertes,
        'deces_supprimes', v_nb_deces,
        'rma_supprimes', v_nb_rma,
        'pnsc_supprimes', v_nb_hebdo,
        'relais_supprimes', v_nb_relais,
        'fiches_rc_supprimees', v_nb_fiches_rc,
        'compte_bruno_preserve', true
    );
END;
$$;

-- Exécution optionnelle directe :
-- SELECT public.purger_comptes_demonstration();
