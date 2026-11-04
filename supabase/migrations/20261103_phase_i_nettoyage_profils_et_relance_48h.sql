-- ==============================================================================
-- PHASE I : NETTOYAGE DÉFINITIF DES PROFILS & SYSTÈME DE RELANCE 48H
-- 1. Nettoyage strict des profils : Seuls sont maintenus RC, ASCQ,
--    Représentant ASCQ, PF CCLS-TP et Cadre du Ministère (ainsi que Super Admin)
-- 2. Alerte de relance automatique après 48h sans validation par l'ASCQ
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. NETTOYAGE DES PROFILS NON CONFORMES
-- ------------------------------------------------------------------------------

-- Suppression des anciens profils départementaux et non conformes
DELETE FROM public.utilisateurs
WHERE id IN (
    '87a9f32f-c4b1-440b-a6f8-5b817d79e115', -- GNANHOUI Aurel (CSSPR)
    '1bb44a77-a356-4245-8d6a-71838807ddae', -- AKOHA Juvenal (CCD_CDLS_TP)
    '770e315a-f0d7-4e87-9998-de0c3dac516a'  -- ZANNOU Bernard (CSPSMEMH)
);

-- Suppression de tout autre profil résiduel hors des rôles autorisés
DELETE FROM public.utilisateurs
WHERE role_technique NOT IN ('SUPER_ADMIN', 'ASCQ', 'ASCQ_OPERATEUR', 'REPRESENTANT_COMMUNAL', 'RC', 'RELAIS', 'PF_CCLS_TP', 'MEMBRE_MINISTERE')
  AND poste NOT IN ('ASCQ', 'RC', 'PF_CCLS_TP', 'MEMBRE_MINISTERE')
  AND telephone NOT LIKE '%69031463%';

-- Normalisation des rôles techniques et nominations des profils conservés
UPDATE public.utilisateurs
SET role_technique = 'SUPER_ADMIN',
    poste = 'ASCQ'
WHERE telephone LIKE '%69031463%';

UPDATE public.utilisateurs
SET role_technique = 'ASCQ',
    role_nomination = 'REPRESENTANT_COMMUNAL',
    poste = 'ASCQ'
WHERE id = '6555115a-d60e-478f-b1b3-0279e2581a95'; -- Simplice ZOUNGONOU

UPDATE public.utilisateurs
SET role_technique = 'ASCQ',
    poste = 'ASCQ'
WHERE poste = 'ASCQ' AND role_technique IN ('ASCQ_OPERATEUR', 'PUBLIC', 'ADMINISTRATEUR')
  AND telephone NOT LIKE '%69031463%'
  AND id <> '6555115a-d60e-478f-b1b3-0279e2581a95';

UPDATE public.utilisateurs
SET role_technique = 'RC',
    poste = 'RC'
WHERE poste = 'RC' OR role_technique IN ('RELAIS', 'PUBLIC');

-- Enregistrer le nettoyage dans le journal d'audit
INSERT INTO public.journal_audit (
    utilisateur_id, capacite, action, details, table_cible
) VALUES (
    (SELECT id FROM public.utilisateurs WHERE telephone LIKE '%69031463%' LIMIT 1),
    'SUPER_ADMIN',
    'NETTOYAGE_PROFILS_NON_CONFORMES',
    jsonb_build_object(
        'date', NOW(),
        'roles_maintenus', ARRAY['RC', 'ASCQ', 'REPRESENTANT_COMMUNAL', 'PF_CCLS_TP', 'MEMBRE_MINISTERE', 'SUPER_ADMIN'],
        'statut', 'SUCCES'
    ),
    'utilisateurs'
);


-- ------------------------------------------------------------------------------
-- 2. ALERTE DE RELANCE AUTOMATIQUE APRÈS 48H SANS VALIDATION PAR L'ASCQ
-- ------------------------------------------------------------------------------

-- Fonction RPC vérifiant et émettant les alertes de relance 48h
CREATE OR REPLACE FUNCTION public.verifier_et_emettre_relances_48h()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nb_relances INTEGER := 0;
    r RECORD;
BEGIN
    -- A. Relance pour alertes communautaires non validées après 48h
    FOR r IN 
        SELECT a.id, a.numero_alerte, a.type_alerte_nom, a.notificateur_nom_complet, a.created_at, a.ascq_superviseur_id
        FROM public.alertes_communautaires a
        WHERE a.statut IN ('NOTIFIE', 'EN_ATTENTE')
          AND a.est_verrouille = FALSE
          AND a.created_at < (NOW() - INTERVAL '48 hours')
          AND a.ascq_superviseur_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.notifications n
              WHERE n.destinataire_id = a.ascq_superviseur_id
                AND n.type_notification = 'RELANCE_48H'
                AND (n.lien_action = ('/fiches/alerte/' || a.id) OR n.message LIKE ('%' || a.numero_alerte || '%'))
                AND n.created_at > (NOW() - INTERVAL '24 hours') -- Évite les doublons répétés dans les dernières 24h
          )
    LOOP
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type_notification,
            priorite,
            lien_action,
            lu
        ) VALUES (
            r.ascq_superviseur_id,
            '⚠️ Relance Réglementaire (48h dépassées)',
            'L''alerte ' || r.numero_alerte || ' (' || r.type_alerte_nom || ') transmise par le RC ' || r.notificateur_nom_complet || ' est en attente depuis plus de 48h sans visa. Veuillez investiguer et statuer.',
            'RELANCE_48H',
            'URGENT',
            '/fiches/alerte/' || r.id,
            FALSE
        );
        v_nb_relances := v_nb_relances + 1;
    END LOOP;

    -- B. Relance pour décès communautaires non validés après 48h
    FOR r IN 
        SELECT d.id, d.numero_deces, d.type_deces_nom, d.notificateur_nom_complet, d.created_at, d.ascq_superviseur_id
        FROM public.deces_communautaires d
        WHERE d.statut IN ('NOTIFIE', 'EN_ATTENTE')
          AND d.est_verrouille = FALSE
          AND d.created_at < (NOW() - INTERVAL '48 hours')
          AND d.ascq_superviseur_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.notifications n
              WHERE n.destinataire_id = d.ascq_superviseur_id
                AND n.type_notification = 'RELANCE_48H'
                AND (n.message LIKE ('%' || d.numero_deces || '%'))
                AND n.created_at > (NOW() - INTERVAL '24 hours')
          )
    LOOP
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type_notification,
            priorite,
            lien_action,
            lu
        ) VALUES (
            r.ascq_superviseur_id,
            '⚠️ Relance Décès (48h dépassées)',
            'La déclaration de décès ' || r.numero_deces || ' (' || r.type_deces_nom || ') notifiée par le RC ' || r.notificateur_nom_complet || ' est en attente depuis plus de 48h sans validation.',
            'RELANCE_48H',
            'URGENT',
            '/fiches',
            FALSE
        );
        v_nb_relances := v_nb_relances + 1;
    END LOOP;

    -- C. Relance pour auto-enrôlements de Relais en attente depuis plus de 48h
    FOR r IN
        SELECT rc.id, rc.nom, rc.prenoms, rc.telephone, rc.ascq_id, rc.created_at
        FROM public.relais_communautaires rc
        WHERE rc.statut = 'EN_ATTENTE'
          AND rc.created_at < (NOW() - INTERVAL '48 hours')
          AND rc.ascq_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.notifications n
              WHERE n.destinataire_id = rc.ascq_id
                AND n.type_notification = 'RELANCE_48H'
                AND n.message LIKE ('%' || rc.nom || '%')
                AND n.created_at > (NOW() - INTERVAL '24 hours')
          )
    LOOP
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type_notification,
            priorite,
            lien_action,
            lu
        ) VALUES (
            r.ascq_id,
            '⚠️ Inscription RC en attente (> 48h)',
            'Le Relais Communautaire ' || r.nom || ' ' || r.prenoms || ' (' || r.telephone || ') attend la validation de son compte depuis plus de 48h.',
            'RELANCE_48H',
            'URGENT',
            '/espace-ascq/relais',
            FALSE
        );
        v_nb_relances := v_nb_relances + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'nb_relances_emises', v_nb_relances,
        'timestamp', NOW()
    );
END;
$$;


-- Fonction RPC pour charger les saisies en retard de 48h pour un ASCQ donné
CREATE OR REPLACE FUNCTION public.obtenir_saisies_en_retard_48h(p_ascq_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_alertes JSONB;
    v_deces JSONB;
    v_relais JSONB;
    v_total INTEGER := 0;
BEGIN
    -- Alertes
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'type', 'ALERTE',
            'numero', numero_alerte,
            'titre', type_alerte_nom,
            'notificateur', notificateur_nom_complet,
            'created_at', created_at,
            'heures_attente', ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600)
        )
    ) INTO v_alertes
    FROM public.alertes_communautaires
    WHERE ascq_superviseur_id = p_ascq_id
      AND statut IN ('NOTIFIE', 'EN_ATTENTE')
      AND est_verrouille = FALSE
      AND created_at < (NOW() - INTERVAL '48 hours');

    -- Décès
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'type', 'DECES',
            'numero', numero_deces,
            'titre', type_deces_nom,
            'notificateur', notificateur_nom_complet,
            'created_at', created_at,
            'heures_attente', ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600)
        )
    ) INTO v_deces
    FROM public.deces_communautaires
    WHERE ascq_superviseur_id = p_ascq_id
      AND statut IN ('NOTIFIE', 'EN_ATTENTE')
      AND est_verrouille = FALSE
      AND created_at < (NOW() - INTERVAL '48 hours');

    -- Inscriptions Relais
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'type', 'RELAIS',
            'numero', telephone,
            'titre', (nom || ' ' || prenoms),
            'notificateur', 'Auto-enrôlement RC',
            'created_at', created_at,
            'heures_attente', ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600)
        )
    ) INTO v_relais
    FROM public.relais_communautaires
    WHERE ascq_id = p_ascq_id
      AND statut = 'EN_ATTENTE'
      AND created_at < (NOW() - INTERVAL '48 hours');

    v_total := COALESCE(jsonb_array_length(v_alertes), 0) + 
               COALESCE(jsonb_array_length(v_deces), 0) + 
               COALESCE(jsonb_array_length(v_relais), 0);

    RETURN jsonb_build_object(
        'total_en_retard', v_total,
        'alertes', COALESCE(v_alertes, '[]'::jsonb),
        'deces', COALESCE(v_deces, '[]'::jsonb),
        'relais', COALESCE(v_relais, '[]'::jsonb)
    );
END;
$$;
