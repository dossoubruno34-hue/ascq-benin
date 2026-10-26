-- =====================================================================
-- ASCQ BÉNIN - Migration Phase 10 : Périmètre, Administration,
-- Notifications, Tableaux de bord Épidémiologiques et Exports
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLE DES NOTIFICATIONS DU SYSTÈME (IN-APP & ALERTE PÉRIMITRE)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destinataire_id UUID REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    departement_id UUID REFERENCES public.departements(id),
    commune_id UUID REFERENCES public.communes(id),
    cible_role TEXT CHECK (cible_role IN ('TOUS', 'ASCQ', 'RC', 'ADMIN_COMMUNAL', 'ADMIN_DEPARTEMENTAL', 'ADMIN_NATIONAL')),
    titre TEXT NOT NULL,
    message TEXT NOT NULL,
    type_notification TEXT NOT NULL DEFAULT 'CONSIGNE_ADMIN' 
        CHECK (type_notification IN (
            'ALERTE_PRIORITAIRE', 
            'RMA_RAPPEL', 
            'RMA_RETARD', 
            'RAPPORT_HEBDO_MANQUANT', 
            'VALIDATION_COMPTE', 
            'PERMUTATION', 
            'REQUETE', 
            'CONSIGNE_ADMIN', 
            'ACTIVITE_DEMANDEE'
        )),
    priorite TEXT NOT NULL DEFAULT 'NORMALE' CHECK (priorite IN ('NORMALE', 'HAUTE', 'URGENTE')),
    lu BOOLEAN NOT NULL DEFAULT FALSE,
    lien_action TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_destinataire ON public.notifications(destinataire_id);
CREATE INDEX IF NOT EXISTS idx_notifications_priorite ON public.notifications(priorite);
CREATE INDEX IF NOT EXISTS idx_notifications_lu ON public.notifications(lu);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- RLS sur notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture notifications destinataire ou perimetre" ON public.notifications
    FOR SELECT USING (
        destinataire_id = auth.uid() OR
        destinataire_id IS NULL OR
        auth.uid() IN (SELECT id FROM public.utilisateurs WHERE role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR'))
    );

CREATE POLICY "Mise a jour statut lu notification" ON public.notifications
    FOR UPDATE USING (
        destinataire_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM public.utilisateurs WHERE role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR'))
    );

CREATE POLICY "Insertion notification pour utilisateurs autorises" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- ---------------------------------------------------------------------
-- 2. TABLE DES ACTIVITÉS DEMANDÉES AUX ASCQ PAR LE PÉRIMITRE
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.activites_demandees_ascq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demandeur_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    titre TEXT NOT NULL,
    description TEXT NOT NULL,
    type_activite TEXT NOT NULL DEFAULT 'SENSIBILISATION' 
        CHECK (type_activite IN ('SENSIBILISATION', 'RATISSAGE_VACCINAL', 'RIPOSTE_EPIDEMIQUE', 'ENQUETE_TERRAIN', 'REUNION_COORDINATION', 'AUTRE')),
    departement_id UUID REFERENCES public.departements(id),
    commune_id UUID REFERENCES public.communes(id),
    ascq_cible_id UUID REFERENCES public.utilisateurs(id), -- NULL si toute la commune
    date_echeance DATE NOT NULL,
    priorite TEXT NOT NULL DEFAULT 'NORMALE' CHECK (priorite IN ('NORMALE', 'HAUTE', 'URGENTE')),
    statut TEXT NOT NULL DEFAULT 'ENVOYEE' CHECK (statut IN ('ENVOYEE', 'PRISE_EN_COMPTE', 'TERMINEE', 'ANNULEE')),
    commentaires_ascq TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_act_demandees_commune ON public.activites_demandees_ascq(commune_id);
CREATE INDEX IF NOT EXISTS idx_act_demandees_ascq_cible ON public.activites_demandees_ascq(ascq_cible_id);

ALTER TABLE public.activites_demandees_ascq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestion activites demandees selon perimetre" ON public.activites_demandees_ascq
    FOR ALL USING (
        demandeur_id = auth.uid() OR
        ascq_cible_id = auth.uid() OR
        commune_id IN (SELECT commune_id FROM public.utilisateurs WHERE id = auth.uid()) OR
        auth.uid() IN (SELECT id FROM public.utilisateurs WHERE role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR'))
    );

-- ---------------------------------------------------------------------
-- 3. GESTION DES NOTIFICATIONS AUTOMATIQUES D'ALERTES PRIORITAIRES
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.declencher_notification_alerte_prioritaire()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_type_nom TEXT;
    v_est_prioritaire BOOLEAN := FALSE;
    v_ascq_nom TEXT;
BEGIN
    -- Types prioritaires officiels :
    -- 1 Rougeole, 2 Choléra, 3 Méningite, 4 PFA, 5 Lassa, 6 Ebola, 7 Fièvre jaune, 8 Dengue, 9 Anthrax, 11 Grippe aviaire, 12 Rage, 14 Mpox
    IF NEW.type_alerte_code IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14) THEN
        v_est_prioritaire := TRUE;
    END IF;

    IF v_est_prioritaire THEN
        SELECT nom INTO v_type_nom FROM public.types_alertes_reference WHERE code = NEW.type_alerte_code;
        SELECT prenoms || ' ' || nom INTO v_ascq_nom FROM public.utilisateurs WHERE id = NEW.ascq_superviseur_id;

        -- Notification d'urgence aux gestionnaires de la commune et du département
        INSERT INTO public.notifications (
            departement_id,
            commune_id,
            cible_role,
            titre,
            message,
            type_notification,
            priorite,
            lien_action
        ) VALUES (
            NEW.departement_id,
            NEW.commune_id,
            'ADMIN_COMMUNAL',
            '🚨 ALERTE SANITAIRE PRIORITAIRE : ' || COALESCE(v_type_nom, 'Événement grave'),
            'Alerte ' || COALESCE(NEW.numero_alerte, 'ALR') || ' notifiée dans la commune (' || COALESCE(NEW.village_nom, 'Village non spécifié') || ') par ' || COALESCE(v_ascq_nom, 'l''ASCQ') || '. Investigation requise sous 24-48h.',
            'ALERTE_PRIORITAIRE',
            'URGENTE',
            '/fiches/alerte/' || NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notification_alerte_prioritaire ON public.alertes_communautaires;
CREATE TRIGGER trg_notification_alerte_prioritaire
    AFTER INSERT ON public.alertes_communautaires
    FOR EACH ROW
    EXECUTE FUNCTION public.declencher_notification_alerte_prioritaire();

-- Trigger décès maternel ou néonatal (notification immédiate)
CREATE OR REPLACE FUNCTION public.declencher_notification_deces_prioritaire()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_type_libelle TEXT;
BEGIN
    IF NEW.type_deces_code = 1 THEN
        v_type_libelle := 'Décès maternel communautaire';
    ELSIF NEW.type_deces_code = 2 THEN
        v_type_libelle := 'Décès néonatal (0-28 jours)';
    ELSE
        RETURN NEW;
    END IF;

    INSERT INTO public.notifications (
        departement_id,
        commune_id,
        cible_role,
        titre,
        message,
        type_notification,
        priorite,
        lien_action
    ) VALUES (
        NEW.departement_id,
        NEW.commune_id,
        'ADMIN_COMMUNAL',
        '🚨 SIGNALEMENT CRITIQUE : ' || v_type_libelle,
        'Décès n° ' || COALESCE(NEW.numero_deces, 'DEC') || ' déclaré dans la commune (' || COALESCE(NEW.village_nom, 'Village') || '). Autopsie verbale sous supervision du MCC requise.',
        'ALERTE_PRIORITAIRE',
        'URGENTE',
        '/fiches'
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notification_deces_prioritaire ON public.deces_communautaires;
CREATE TRIGGER trg_notification_deces_prioritaire
    AFTER INSERT ON public.deces_communautaires
    FOR EACH ROW
    EXECUTE FUNCTION public.declencher_notification_deces_prioritaire();

-- ---------------------------------------------------------------------
-- 4. FONCTIONS RPC DE GESTION DES NOTIFICATIONS
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.obtenir_mes_notifications()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user RECORD;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN '[]'::jsonb; END IF;

    SELECT * INTO v_user FROM public.utilisateurs WHERE id = v_user_id;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', n.id,
            'titre', n.titre,
            'message', n.message,
            'type_notification', n.type_notification,
            'priorite', n.priorite,
            'lu', n.lu,
            'lien_action', n.lien_action,
            'created_at', n.created_at
        ) ORDER BY n.created_at DESC
    ) INTO v_result
    FROM public.notifications n
    WHERE n.destinataire_id = v_user_id
       OR (n.destinataire_id IS NULL AND (
            (n.commune_id = v_user.commune_id) OR
            (n.departement_id = v_user.departement_id AND n.commune_id IS NULL) OR
            (n.departement_id IS NULL AND n.commune_id IS NULL)
       ))
    LIMIT 50;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.marquer_notification_lue(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.notifications
    SET lu = TRUE
    WHERE id = p_id;
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.envoyer_notification_broadcast(
    p_titre TEXT,
    p_message TEXT,
    p_priorite TEXT DEFAULT 'NORMALE',
    p_type TEXT DEFAULT 'CONSIGNE_ADMIN',
    p_departement_id UUID DEFAULT NULL,
    p_commune_id UUID DEFAULT NULL,
    p_destinataire_id UUID DEFAULT NULL,
    p_cible_role TEXT DEFAULT 'TOUS'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
    v_new_id UUID;
BEGIN
    SELECT role_technique INTO v_user_role FROM public.utilisateurs WHERE id = auth.uid();
    IF v_user_role NOT IN ('SUPER_ADMIN', 'ADMINISTRATEUR', 'GESTIONNAIRE_PERIMETRE') THEN
        RAISE EXCEPTION 'Action réservée aux administrateurs ou responsables de périmètre.';
    END IF;

    INSERT INTO public.notifications (
        destinataire_id,
        departement_id,
        commune_id,
        cible_role,
        titre,
        message,
        type_notification,
        priorite,
        lu
    ) VALUES (
        p_destinataire_id,
        p_departement_id,
        p_commune_id,
        p_cible_role,
        p_titre,
        p_message,
        p_type,
        p_priorite,
        FALSE
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;

-- ---------------------------------------------------------------------
-- 5. FONCTIONS RPC DE GESTION DU PÉRIMITRE ET DES ACTIVITÉS DEMANDÉES
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.demander_activite_ascq(
    p_titre TEXT,
    p_description TEXT,
    p_type_activite TEXT,
    p_date_echeance DATE,
    p_priorite TEXT DEFAULT 'NORMALE',
    p_commune_id UUID DEFAULT NULL,
    p_ascq_cible_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_dep_id UUID;
    v_com_id UUID;
    v_new_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié.'; END IF;

    SELECT role_technique, departement_id, commune_id 
    INTO v_user_role, v_dep_id, v_com_id 
    FROM public.utilisateurs WHERE id = v_user_id;

    IF v_user_role NOT IN ('SUPER_ADMIN', 'ADMINISTRATEUR', 'GESTIONNAIRE_PERIMETRE') THEN
        RAISE EXCEPTION 'Droits insuffisants pour demander une activité.';
    END IF;

    -- Si commune non spécifiée, prendre celle du gestionnaire
    IF p_commune_id IS NOT NULL THEN
        v_com_id := p_commune_id;
    END IF;

    INSERT INTO public.activites_demandees_ascq (
        demandeur_id,
        titre,
        description,
        type_activite,
        departement_id,
        commune_id,
        ascq_cible_id,
        date_echeance,
        priorite,
        statut
    ) VALUES (
        v_user_id,
        p_titre,
        p_description,
        p_type_activite,
        v_dep_id,
        v_com_id,
        p_ascq_cible_id,
        p_date_echeance,
        p_priorite,
        'ENVOYEE'
    ) RETURNING id INTO v_new_id;

    -- Notification associée à l'ASCQ
    INSERT INTO public.notifications (
        destinataire_id,
        commune_id,
        titre,
        message,
        type_notification,
        priorite,
        lien_action
    ) VALUES (
        p_ascq_cible_id,
        v_com_id,
        '📋 NOUVELLE CONSIGNE D''ACTIVITÉ : ' || p_titre,
        'Votre coordination communale/départementale a formulé une demande d''activité : ' || p_description || ' (Échéance : ' || to_char(p_date_echeance, 'DD/MM/YYYY') || ').',
        'ACTIVITE_DEMANDEE',
        p_priorite,
        '/espace-ascq/planning'
    );

    RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;

-- ---------------------------------------------------------------------
-- 6. STATISTIQUES ÉPIDÉMIOLOGIQUES & TABLEAUX DE BORD (DASHBOARDS)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.obtenir_statistiques_tableau_de_bord(
    p_departement_id UUID DEFAULT NULL,
    p_commune_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_alertes BIGINT;
    v_alertes_prioritaires BIGINT;
    v_alertes_averees BIGINT;
    v_alertes_investiguees BIGINT;
    v_alertes_non_investiguees BIGINT;
    v_delai_moyen_notification NUMERIC;
    v_delai_moyen_investigation NUMERIC;
    v_total_deces BIGINT;
    v_deces_maternels BIGINT;
    v_deces_neonatals BIGINT;
    v_deces_avec_cause BIGINT;
    v_total_ascq_actifs BIGINT;
    v_total_rc_actifs BIGINT;
    v_total_rma_deposes BIGINT;
    v_total_rma_retard BIGINT;
    v_repartition_pathologies JSONB;
    v_repartition_deces JSONB;
    v_result JSONB;
BEGIN
    -- 1. Alertes
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE type_alerte_code IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14)),
        COUNT(*) FILTER (WHERE resultat_verification = 'AVEREE'),
        COUNT(*) FILTER (WHERE statut = 'INVESTIGUEE'),
        COUNT(*) FILTER (WHERE statut != 'INVESTIGUEE' AND type_alerte_code IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14)),
        ROUND(AVG(delai_notification_heures)::NUMERIC, 1),
        ROUND(AVG(delai_investigation_heures)::NUMERIC, 1)
    INTO 
        v_total_alertes,
        v_alertes_prioritaires,
        v_alertes_averees,
        v_alertes_investiguees,
        v_alertes_non_investiguees,
        v_delai_moyen_notification,
        v_delai_moyen_investigation
    FROM public.alertes_communautaires
    WHERE (p_departement_id IS NULL OR departement_id = p_departement_id)
      AND (p_commune_id IS NULL OR commune_id = p_commune_id);

    -- 2. Décès
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE type_deces_code = 1),
        COUNT(*) FILTER (WHERE type_deces_code = 2),
        COUNT(*) FILTER (WHERE cause_deces_probable IS NOT NULL AND cause_deces_probable != '')
    INTO 
        v_total_deces,
        v_deces_maternels,
        v_deces_neonatals,
        v_deces_avec_cause
    FROM public.deces_communautaires
    WHERE (p_departement_id IS NULL OR departement_id = p_departement_id)
      AND (p_commune_id IS NULL OR commune_id = p_commune_id);

    -- 3. Effectifs ASCQ et RC
    SELECT COUNT(*) INTO v_total_ascq_actifs
    FROM public.utilisateurs
    WHERE poste = 'ASCQ' AND statut_compte = 'VALIDE'
      AND (p_departement_id IS NULL OR departement_id = p_departement_id)
      AND (p_commune_id IS NULL OR commune_id = p_commune_id);

    SELECT COUNT(*) INTO v_total_rc_actifs
    FROM public.relais_communautaires rc
    JOIN public.utilisateurs u ON rc.ascq_id = u.id
    WHERE (p_departement_id IS NULL OR u.departement_id = p_departement_id)
      AND (p_commune_id IS NULL OR u.commune_id = p_commune_id);

    -- 4. RMA
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE est_en_retard = TRUE AND statut != 'VALIDE')
    INTO 
        v_total_rma_deposes,
        v_total_rma_retard
    FROM public.rapports_mensuels_ascq
    WHERE (p_departement_id IS NULL OR departement_id = p_departement_id)
      AND (p_commune_id IS NULL OR commune_id = p_commune_id);

    -- 5. Top 5 des pathologies
    SELECT jsonb_agg(sub) INTO v_repartition_pathologies
    FROM (
        SELECT 
            COALESCE(t.nom, 'Type ' || a.type_alerte_code) AS nom,
            COUNT(*) AS total
        FROM public.alertes_communautaires a
        LEFT JOIN public.types_alertes_reference t ON a.type_alerte_code = t.code
        WHERE (p_departement_id IS NULL OR a.departement_id = p_departement_id)
          AND (p_commune_id IS NULL OR a.commune_id = p_commune_id)
        GROUP BY t.nom, a.type_alerte_code
        ORDER BY total DESC
        LIMIT 6
    ) sub;

    v_result := jsonb_build_object(
        'total_alertes', COALESCE(v_total_alertes, 0),
        'alertes_prioritaires', COALESCE(v_alertes_prioritaires, 0),
        'alertes_averees', COALESCE(v_alertes_averees, 0),
        'alertes_investiguees', COALESCE(v_alertes_investiguees, 0),
        'alertes_non_investiguees', COALESCE(v_alertes_non_investiguees, 0),
        'delai_moyen_notification', COALESCE(v_delai_moyen_notification, 0),
        'delai_moyen_investigation', COALESCE(v_delai_moyen_investigation, 0),
        'total_deces', COALESCE(v_total_deces, 0),
        'deces_maternels', COALESCE(v_deces_maternels, 0),
        'deces_neonatals', COALESCE(v_deces_neonatals, 0),
        'deces_avec_cause', COALESCE(v_deces_avec_cause, 0),
        'total_ascq_actifs', COALESCE(v_total_ascq_actifs, 0),
        'total_rc_actifs', COALESCE(v_total_rc_actifs, 0),
        'total_rma_deposes', COALESCE(v_total_rma_deposes, 0),
        'total_rma_retard', COALESCE(v_total_rma_retard, 0),
        'top_pathologies', COALESCE(v_repartition_pathologies, '[]'::jsonb)
    );

    RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------
-- 7. FONCTIONS RPC D'ADMINISTRATION, VALIDATION & RATTACHEMENT COTONOU
-- ---------------------------------------------------------------------

-- Rattachement officiel d'un arrondissement de Cotonou à sa zone sanitaire
CREATE OR REPLACE FUNCTION public.admin_rattacher_arrondissement_cotonou(
    p_arrondissement_id UUID,
    p_zone_sanitaire_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    SELECT role_technique INTO v_user_role FROM public.utilisateurs WHERE id = auth.uid();
    IF v_user_role NOT IN ('SUPER_ADMIN', 'ADMINISTRATEUR') THEN
        RAISE EXCEPTION 'Action réservée aux administrateurs.';
    END IF;

    UPDATE public.arrondissements
    SET zone_sanitaire_id = p_zone_sanitaire_id,
        statut_zone_sanitaire = 'CONFIRME'
    WHERE id = p_arrondissement_id;

    RETURN jsonb_build_object('success', true, 'message', 'Arrondissement de Cotonou rattaché à sa zone sanitaire avec succès.');
END;
$$;

-- Nommer ou retirer un gestionnaire communal ou départemental
CREATE OR REPLACE FUNCTION public.admin_definir_gestionnaire_perimetre(
    p_utilisateur_id UUID,
    p_role_technique TEXT,
    p_departement_id UUID DEFAULT NULL,
    p_commune_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_my_role TEXT;
BEGIN
    SELECT role_technique INTO v_my_role FROM public.utilisateurs WHERE id = auth.uid();
    IF v_my_role NOT IN ('SUPER_ADMIN', 'ADMINISTRATEUR') THEN
        RAISE EXCEPTION 'Seul un administrateur peut modifier les attributions de rôle.';
    END IF;

    UPDATE public.utilisateurs
    SET role_technique = p_role_technique,
        departement_id = COALESCE(p_departement_id, departement_id),
        commune_id = COALESCE(p_commune_id, commune_id),
        updated_at = NOW()
    WHERE id = p_utilisateur_id;

    RETURN jsonb_build_object('success', true, 'message', 'Droits de périmètre mis à jour avec succès.');
END;
$$;

-- Répondre officiellement à une requête d'ASCQ
CREATE OR REPLACE FUNCTION public.admin_repondre_requete(
    p_requete_id UUID,
    p_reponse TEXT,
    p_statut TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req RECORD;
BEGIN
    UPDATE public.requetes_ascq
    SET reponse_admin = p_reponse,
        statut = p_statut,
        date_reponse = NOW(),
        updated_at = NOW()
    WHERE id = p_requete_id
    RETURNING * INTO v_req;

    IF v_req.ascq_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type_notification,
            priorite,
            lien_action
        ) VALUES (
            v_req.ascq_id,
            '📬 Réponse à votre requête : ' || v_req.objet,
            'L''administration a répondu : "' || substring(p_reponse from 1 for 120) || '..." Statut : ' || p_statut,
            'REQUETE',
            'NORMALE',
            '/espace-ascq/requetes'
        );
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Valider une demande de permutation
CREATE OR REPLACE FUNCTION public.admin_valider_permutation(
    p_permutation_id UUID,
    p_commentaire TEXT DEFAULT 'Permutation validée par l''administration'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_perm RECORD;
BEGIN
    UPDATE public.permutations
    SET statut = 'VALIDE_ADMIN',
        date_reponse = NOW(),
        updated_at = NOW()
    WHERE id = p_permutation_id
    RETURNING * INTO v_perm;

    IF v_perm.demandeur_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            destinataire_id,
            titre,
            message,
            type_notification,
            priorite,
            lien_action
        ) VALUES (
            v_perm.demandeur_id,
            '🎉 Demande de permutation APPROUVÉE',
            'Votre proposition de permutation a été validée officiellement par l''administration.',
            'PERMUTATION',
            'HAUTE',
            '/espace-ascq/permutations'
        );
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------
-- 8. FONCTIONS RPC D'EXPORTATION SÉCURISÉE (CSV / EXCEL SANS IDENTITÉ)
-- ---------------------------------------------------------------------

-- A. Export sécurisé des ASCQ
CREATE OR REPLACE FUNCTION public.exporter_liste_ascq()
RETURNS TABLE (
    matricule_id TEXT,
    nom TEXT,
    prenoms TEXT,
    telephone TEXT,
    poste TEXT,
    departement TEXT,
    commune TEXT,
    arrondissement TEXT,
    source_financement TEXT,
    nombre_rc INTEGER,
    statut_compte TEXT,
    date_inscription TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        u.id::TEXT,
        u.nom,
        u.prenoms,
        u.telephone,
        u.poste,
        COALESCE(d.nom, 'NON DEFINI'),
        COALESCE(c.nom, 'NON DEFINIE'),
        COALESCE(a.nom, 'NON DEFINI'),
        COALESCE(p.source_financement, 'LLF'),
        COALESCE(p.nombre_rc, (SELECT COUNT(*)::INTEGER FROM public.relais_communautaires rc WHERE rc.ascq_id = u.id)),
        u.statut_compte,
        to_char(u.created_at, 'DD/MM/YYYY HH24:MI')
    FROM public.utilisateurs u
    LEFT JOIN public.ascq_profils p ON u.id = p.id
    LEFT JOIN public.departements d ON u.departement_id = d.id
    LEFT JOIN public.communes c ON u.commune_id = c.id
    LEFT JOIN public.arrondissements a ON u.arrondissement_id = a.id
    WHERE u.poste = 'ASCQ'
    ORDER BY d.nom, c.nom, u.nom;
$$;

-- B. Export épidémiologique 100% anonymisé (SANS NPI, SANS NOM DE PATIENT)
CREATE OR REPLACE FUNCTION public.exporter_donnees_surveillance_anonymisees()
RETURNS TABLE (
    numero_alerte TEXT,
    annee INTEGER,
    semaine_epidemiologique INTEGER,
    mois INTEGER,
    pathologie TEXT,
    est_prioritaire BOOLEAN,
    departement TEXT,
    commune TEXT,
    arrondissement TEXT,
    village TEXT,
    personnes_touchees INTEGER,
    personnes_decedees INTEGER,
    animaux_malades INTEGER,
    animaux_morts INTEGER,
    delai_notification_heures NUMERIC,
    delai_investigation_heures NUMERIC,
    statut TEXT,
    resultat_verification TEXT,
    date_survenue DATE,
    date_notification DATE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        a.numero_alerte,
        a.annee,
        a.semaine_epidemiologique,
        a.mois,
        COALESCE(t.nom, 'Type ' || a.type_alerte_code),
        COALESCE(t.est_prioritaire, FALSE),
        COALESCE(d.nom, 'ZOU'),
        COALESCE(c.nom, 'COVE'),
        COALESCE(arr.nom, 'ARRONDISSEMENT'),
        COALESCE(a.village_nom, 'VILLAGE'),
        a.personnes_touchees,
        a.personnes_mortes,
        a.animaux_malades,
        a.animaux_morts,
        ROUND(a.delai_notification_heures::NUMERIC, 1),
        ROUND(a.delai_investigation_heures::NUMERIC, 1),
        a.statut,
        COALESCE(a.resultat_verification, 'EN_ATTENTE'),
        a.date_survenue,
        a.date_notification
    FROM public.alertes_communautaires a
    LEFT JOIN public.types_alertes_reference t ON a.type_alerte_code = t.code
    LEFT JOIN public.departements d ON a.departement_id = d.id
    LEFT JOIN public.communes c ON a.commune_id = c.id
    LEFT JOIN public.arrondissements arr ON a.arrondissement_id = arr.id
    ORDER BY a.annee DESC, a.semaine_epidemiologique DESC;
$$;

-- Permissions d'exécution
GRANT EXECUTE ON FUNCTION public.obtenir_mes_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.marquer_notification_lue TO authenticated;
GRANT EXECUTE ON FUNCTION public.envoyer_notification_broadcast TO authenticated;
GRANT EXECUTE ON FUNCTION public.demander_activite_ascq TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtenir_statistiques_tableau_de_bord TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_rattacher_arrondissement_cotonou TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_definir_gestionnaire_perimetre TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_repondre_requete TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_valider_permutation TO authenticated;
GRANT EXECUTE ON FUNCTION public.exporter_liste_ascq TO authenticated;
GRANT EXECUTE ON FUNCTION public.exporter_donnees_surveillance_anonymisees TO authenticated;
