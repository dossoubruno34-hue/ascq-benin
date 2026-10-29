-- =====================================================================
-- SUITE DE TESTS AUTOMATISES : SECURITE DE LA GOUVERNANCE TERRITORIALE
-- =====================================================================

DO $$
DECLARE
    -- Déclarations des IDs de test
    v_dept_atlantique UUID;
    v_dept_littoral UUID;
    v_dept_borgou UUID;
    
    v_zone_ouidah UUID;
    v_zone_calavi UUID;
    
    v_com_ouidah UUID;
    v_com_calavi UUID;
    v_com_cotonou UUID;
    v_com_parakou UUID;
    
    v_arr_ouidah_centre UUID;
    v_arr_calavi_centre UUID;
    v_arr_cotonou_1 UUID;
    v_arr_parakou_1 UUID;
    
    v_user_national UUID := gen_random_uuid();
    v_user_dept_atlantique UUID := gen_random_uuid();
    v_user_zone_ouidah UUID := gen_random_uuid();
    v_user_com_ouidah UUID := gen_random_uuid();
    v_user_ascq_ouidah UUID := gen_random_uuid();
    
    v_test_ok BOOLEAN;
BEGIN
    RAISE NOTICE '🚀 DEMARRAGE DES TESTS DE SECURITE GOUVERNANCE...';

    -- 1. Récupération ou création des territoires de référence pour les tests
    SELECT id INTO v_dept_atlantique FROM public.departements WHERE nom ILIKE '%ATLANTIQUE%' LIMIT 1;
    SELECT id INTO v_dept_littoral FROM public.departements WHERE nom ILIKE '%LITTORAL%' LIMIT 1;
    SELECT id INTO v_dept_borgou FROM public.departements WHERE nom ILIKE '%BORGOU%' LIMIT 1;

    SELECT id INTO v_com_ouidah FROM public.communes WHERE nom ILIKE '%OUIDAH%' LIMIT 1;
    SELECT id INTO v_com_calavi FROM public.communes WHERE nom ILIKE '%CALAVI%' LIMIT 1;
    SELECT id INTO v_com_cotonou FROM public.communes WHERE nom ILIKE '%COTONOU%' LIMIT 1;
    SELECT id INTO v_com_parakou FROM public.communes WHERE nom ILIKE '%PARAKOU%' LIMIT 1;

    SELECT id INTO v_arr_ouidah_centre FROM public.arrondissements WHERE commune_id = v_com_ouidah LIMIT 1;
    SELECT id INTO v_arr_calavi_centre FROM public.arrondissements WHERE commune_id = v_com_calavi LIMIT 1;
    SELECT id INTO v_arr_cotonou_1 FROM public.arrondissements WHERE commune_id = v_com_cotonou LIMIT 1;
    SELECT id INTO v_arr_parakou_1 FROM public.arrondissements WHERE commune_id = v_com_parakou LIMIT 1;

    SELECT zone_sanitaire_id INTO v_zone_ouidah FROM public.communes WHERE id = v_com_ouidah;
    SELECT zone_sanitaire_id INTO v_zone_calavi FROM public.communes WHERE id = v_com_calavi;

    -- Création temporaire d'utilisateurs de test
    INSERT INTO public.utilisateurs (id, telephone, nom, prenoms, poste, role_technique, statut_compte, departement_id, zone_sanitaire_id, commune_id, arrondissement_id)
    VALUES 
    (v_user_national, '99000001', 'TEST_NATIONAL', 'Admin', 'SUPER_ADMIN', 'SUPER_ADMIN', 'VALIDE', NULL, NULL, NULL, NULL),
    (v_user_dept_atlantique, '99000002', 'TEST_DDS', 'Atlantique', 'DDS', 'CADRE_DEPARTEMENTAL', 'VALIDE', v_dept_atlantique, NULL, NULL, NULL),
    (v_user_zone_ouidah, '99000003', 'TEST_MCZS', 'Ouidah', 'MCZS', 'CADRE_ZONE_SANITAIRE', 'VALIDE', v_dept_atlantique, v_zone_ouidah, NULL, NULL),
    (v_user_com_ouidah, '99000004', 'TEST_MCC', 'Ouidah', 'MCC', 'CADRE_COMMUNAL', 'VALIDE', v_dept_atlantique, v_zone_ouidah, v_com_ouidah, NULL),
    (v_user_ascq_ouidah, '99000005', 'TEST_ASCQ', 'Ouidah', 'ASCQ', 'ASCQ_OPERATEUR', 'VALIDE', v_dept_atlantique, v_zone_ouidah, v_com_ouidah, v_arr_ouidah_centre);

    -- -------------------------------------------------------------
    -- TEST 1 : UN RESPONSABLE COMMUNAL NE VOIT PAS UNE AUTRE COMMUNE
    -- -------------------------------------------------------------
    v_test_ok := public.ce_responsable_peut_il_voir_cet_arrondissement(v_user_com_ouidah, v_arr_ouidah_centre);
    ASSERT v_test_ok = TRUE, 'TEST 1.1 ECHOUE: Le communal de Ouidah doit voir Ouidah';

    v_test_ok := public.ce_responsable_peut_il_voir_cet_arrondissement(v_user_com_ouidah, v_arr_calavi_centre);
    ASSERT v_test_ok = FALSE, 'TEST 1.2 ECHOUE: Le communal de Ouidah ne doit JAMAIS voir Calavi';

    v_test_ok := public.ce_responsable_peut_il_voir_cet_arrondissement(v_user_com_ouidah, v_arr_cotonou_1);
    ASSERT v_test_ok = FALSE, 'TEST 1.3 ECHOUE: Le communal de Ouidah ne doit JAMAIS voir Cotonou';
    RAISE NOTICE '✅ TEST 1 REUSSI : Isolation étanche de la commune.';

    -- -------------------------------------------------------------
    -- TEST 2 : UN RESPONSABLE DE ZONE NE VOIT QUE SA ZONE SANITAIRE
    -- -------------------------------------------------------------
    v_test_ok := public.ce_responsable_peut_il_voir_cet_arrondissement(v_user_zone_ouidah, v_arr_ouidah_centre);
    ASSERT v_test_ok = TRUE, 'TEST 2.1 ECHOUE: Le cadre de zone doit voir sa zone';

    IF v_arr_calavi_centre IS NOT NULL AND v_zone_calavi != v_zone_ouidah THEN
        v_test_ok := public.ce_responsable_peut_il_voir_cet_arrondissement(v_user_zone_ouidah, v_arr_calavi_centre);
        ASSERT v_test_ok = FALSE, 'TEST 2.2 ECHOUE: Le cadre de zone ne doit pas voir Calavi si hors zone';
    END IF;
    RAISE NOTICE '✅ TEST 2 REUSSI : Périmètre zone sanitaire vérifié.';

    -- -------------------------------------------------------------
    -- TEST 3 : UN RESPONSABLE DEPARTEMENTAL NE VOIT QUE SON DEPARTEMENT
    -- -------------------------------------------------------------
    v_test_ok := public.ce_responsable_peut_il_voir_cet_arrondissement(v_user_dept_atlantique, v_arr_ouidah_centre);
    ASSERT v_test_ok = TRUE, 'TEST 3.1 ECHOUE: Le DDS Atlantique doit voir Ouidah';

    IF v_arr_calavi_centre IS NOT NULL THEN
        v_test_ok := public.ce_responsable_peut_il_voir_cet_arrondissement(v_user_dept_atlantique, v_arr_calavi_centre);
        ASSERT v_test_ok = TRUE, 'TEST 3.2 ECHOUE: Le DDS Atlantique doit voir Calavi (même département)';
    END IF;

    IF v_arr_parakou_1 IS NOT NULL THEN
        v_test_ok := public.ce_responsable_peut_il_voir_cet_arrondissement(v_user_dept_atlantique, v_arr_parakou_1);
        ASSERT v_test_ok = FALSE, 'TEST 3.3 ECHOUE: Le DDS Atlantique ne doit JAMAIS voir Parakou (Borgou)';
    END IF;
    RAISE NOTICE '✅ TEST 3 REUSSI : Périmètre départemental vérifié.';

    -- -------------------------------------------------------------
    -- TEST 4 : LE NATIONAL VOIT TOUT
    -- -------------------------------------------------------------
    ASSERT public.ce_responsable_peut_il_voir_cet_arrondissement(v_user_national, v_arr_ouidah_centre) = TRUE, 'TEST 4.1 ECHOUE';
    ASSERT public.ce_responsable_peut_il_voir_cet_arrondissement(v_user_national, v_arr_calavi_centre) = TRUE, 'TEST 4.2 ECHOUE';
    ASSERT public.ce_responsable_peut_il_voir_cet_arrondissement(v_user_national, v_arr_cotonou_1) = TRUE, 'TEST 4.3 ECHOUE';
    ASSERT public.ce_responsable_peut_il_voir_cet_arrondissement(v_user_national, v_arr_parakou_1) = TRUE, 'TEST 4.4 ECHOUE';
    RAISE NOTICE '✅ TEST 4 REUSSI : Accès national complet vérifié.';

    -- -------------------------------------------------------------
    -- TEST 5 : VISITEUR NON CONNECTE
    -- -------------------------------------------------------------
    ASSERT public.ce_responsable_peut_il_voir_cet_arrondissement(NULL, v_arr_ouidah_centre) = FALSE, 'TEST 5.1 ECHOUE: Visiteur anonyme rejeté';
    RAISE NOTICE '✅ TEST 5 REUSSI : Refus absolu pour les anonymes.';

    -- Nettoyage des données de test
    DELETE FROM public.utilisateurs WHERE id IN (v_user_national, v_user_dept_atlantique, v_user_zone_ouidah, v_user_com_ouidah, v_user_ascq_ouidah);
    RAISE NOTICE '🎉 TOUS LES TESTS DE SECURITE GOUVERNANCE SONT VALIDES AVEC SUCCES !';
END;
$$;
