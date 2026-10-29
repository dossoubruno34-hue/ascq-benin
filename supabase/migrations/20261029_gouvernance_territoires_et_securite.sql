-- =====================================================================
-- MIGRATION : GOUVERNANCE TERRITORIALE, CONSULTATION SEULE, 
-- PERIMETRES HIERARCHIQUES, EXPORTS AUDITES ET FICHE HEBDO RC
-- Date: 2026-10-29
-- Auteur: Antigravity pour Bruno DOSSOU (Super Administrateur National)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. FONCTION UNIQUE DETERMINANTE : 
-- ce_responsable_peut_il_voir_cet_arrondissement(p_user_id, p_arrondissement_id)
-- Ne réutilise pas est_administrateur() pour ces rôles.
-- Unité de base : Arrondissement (relié à Commune, Zone sanitaire, Département).
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.ce_responsable_peut_il_voir_cet_arrondissement(UUID, UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.ce_responsable_peut_il_voir_cet_arrondissement(
    p_user_id UUID,
    p_arrondissement_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_role_tech TEXT;
    v_poste TEXT;
    v_role_nomination TEXT;
    v_tel TEXT;
    v_u_dept_id UUID;
    v_u_zone_id UUID;
    v_u_commune_id UUID;
    v_u_arr_id UUID;
    v_u_second_arr_id UUID;
    v_statut TEXT;
    
    v_arr_commune_id UUID;
    v_arr_zone_id UUID;
    v_arr_dept_id UUID;
BEGIN
    -- 0. Paramètres nuls
    IF p_user_id IS NULL OR p_arrondissement_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 1. Récupérer le profil et le territoire du responsable
    SELECT 
        role_technique, 
        poste, 
        COALESCE(role_nomination, ''),
        telephone, 
        departement_id, 
        zone_sanitaire_id, 
        commune_id, 
        arrondissement_id,
        second_arrondissement_id,
        statut_compte
    INTO 
        v_role_tech, 
        v_poste, 
        v_role_nomination,
        v_tel, 
        v_u_dept_id, 
        v_u_zone_id, 
        v_u_commune_id, 
        v_u_arr_id,
        v_u_second_arr_id,
        v_statut
    FROM public.utilisateurs
    WHERE id = p_user_id;

    -- Le compte doit exister et être validé
    IF v_statut IS NULL OR v_statut != 'VALIDE' THEN
        RETURN FALSE;
    END IF;

    -- 2. Identifier la hiérarchie territoriale de l'arrondissement cible
    SELECT 
        a.commune_id,
        COALESCE(a.zone_sanitaire_id, c.zone_sanitaire_id),
        c.departement_id
    INTO 
        v_arr_commune_id,
        v_arr_zone_id,
        v_arr_dept_id
    FROM public.arrondissements a
    JOIN public.communes c ON c.id = a.commune_id
    WHERE a.id = p_arrondissement_id;

    IF v_arr_commune_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 3. EVALUATION DU NIVEAU HIERARCHIQUE

    -- A. NIVEAU NATIONAL (Tout le pays)
    -- Le niveau national voit tout le pays sans restriction.
    IF v_role_tech IN ('SUPER_ADMIN', 'ADMINISTRATEUR', 'CADRE_NATIONAL') 
       OR v_poste IN ('SUPER_ADMIN', 'ADMINISTRATEUR', 'DIRECTEUR', 'MINISTRE', 'COORDINATEUR_NATIONAL')
       OR v_tel IN ('0169031463', '69031463') THEN
        RETURN TRUE;
    END IF;

    -- B. NIVEAU DEPARTEMENTAL (Son département)
    -- Voit toutes les communes et arrondissements de son département.
    IF v_role_tech IN ('CADRE_DEPARTEMENTAL', 'REPRESENTANT_DEPARTEMENTAL', 'ADMIN_DEPARTEMENTAL')
       OR v_poste IN ('DDS', 'CCD_CDLS_TP', 'CSSPR', 'CSPSMEMH', 'REPRESENTANT_DEPARTEMENTAL', 'CADRE_DEPARTEMENTAL')
       OR v_role_nomination ILIKE '%DEPARTEMENT%' THEN
        IF v_u_dept_id IS NOT NULL AND v_arr_dept_id = v_u_dept_id THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- C. NIVEAU ZONE SANITAIRE (Sa zone sanitaire)
    -- Voit toutes les communes et arrondissements de sa zone sanitaire.
    IF v_role_tech IN ('CADRE_ZONE_SANITAIRE')
       OR v_poste IN ('MCZS', 'RCSE', 'C_RAMS', 'CADRE_ZONE_SANITAIRE')
       OR v_role_nomination ILIKE '%ZONE%' THEN
        IF v_u_zone_id IS NOT NULL AND v_arr_zone_id = v_u_zone_id THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- D. NIVEAU COMMUNAL (Sa commune)
    -- Voit tous les arrondissements de sa commune.
    IF v_role_tech IN ('CADRE_COMMUNAL', 'REPRESENTANT_COMMUNAL', 'ADMIN_COMMUNAL')
       OR v_poste IN ('MCC', 'PF_CCLS_TP', 'REPRESENTANT_COMMUNAL', 'CADRE_COMMUNAL')
       OR v_role_nomination ILIKE '%COMMUN%' THEN
        IF v_u_commune_id IS NOT NULL AND v_arr_commune_id = v_u_commune_id THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- E. NIVEAU ASCQ DE TERRAIN (Ses propres arrondissements)
    IF v_poste = 'ASCQ' OR v_role_tech = 'ASCQ_OPERATEUR' THEN
        IF p_arrondissement_id = v_u_arr_id 
           OR (v_u_second_arr_id IS NOT NULL AND p_arrondissement_id = v_u_second_arr_id) THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$;

-- ---------------------------------------------------------------------
-- 2. FONCTION HELPER : est_responsable_consultation(p_user_id)
-- Distingue un responsable de santé en consultation seule d'un agent de saisie
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.est_responsable_consultation(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.utilisateurs
        WHERE id = p_user_id
          AND statut_compte = 'VALIDE'
          AND (
              role_technique IN (
                  'CADRE_COMMUNAL', 'REPRESENTANT_COMMUNAL', 'ADMIN_COMMUNAL',
                  'CADRE_ZONE_SANITAIRE',
                  'CADRE_DEPARTEMENTAL', 'REPRESENTANT_DEPARTEMENTAL', 'ADMIN_DEPARTEMENTAL',
                  'CADRE_NATIONAL'
              )
              OR poste IN (
                  'MCC', 'PF_CCLS_TP', 'REPRESENTANT_COMMUNAL',
                  'MCZS', 'RCSE', 'C_RAMS',
                  'DDS', 'CCD_CDLS_TP', 'CSSPR', 'CSPSMEMH', 'REPRESENTANT_DEPARTEMENTAL',
                  'CADRE_DEPARTEMENTAL', 'CADRE_ZONE_SANITAIRE', 'CADRE_COMMUNAL'
              )
              OR role_nomination ILIKE '%REPRESENTANT%'
              OR role_nomination ILIKE '%CADRE%'
          )
    );
$$;

-- ---------------------------------------------------------------------
-- 3. SECURITE : INTERDICTION ABSOLUE DE MODIFIER SON PERIMETRE SANS APPROBATION
-- Trigger bloquant toute modification unilatérale de commune/zone/département
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.verifier_changement_perimetre_responsable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Si la personne modifiée est un responsable ou tente de le devenir
    IF (OLD.role_technique IN ('CADRE_COMMUNAL', 'REPRESENTANT_COMMUNAL', 'ADMIN_COMMUNAL', 'CADRE_ZONE_SANITAIRE', 'CADRE_DEPARTEMENTAL', 'REPRESENTANT_DEPARTEMENTAL')
        OR NEW.role_technique IN ('CADRE_COMMUNAL', 'REPRESENTANT_COMMUNAL', 'ADMIN_COMMUNAL', 'CADRE_ZONE_SANITAIRE', 'CADRE_DEPARTEMENTAL', 'REPRESENTANT_DEPARTEMENTAL')) THEN
        
        -- Si les territoires changent
        IF (OLD.departement_id IS DISTINCT FROM NEW.departement_id
            OR OLD.zone_sanitaire_id IS DISTINCT FROM NEW.zone_sanitaire_id
            OR OLD.commune_id IS DISTINCT FROM NEW.commune_id
            OR OLD.arrondissement_id IS DISTINCT FROM NEW.arrondissement_id) THEN
            
            -- Seul le SUPER ADMIN national a le droit de modifier le périmètre d'un responsable
            IF auth.uid() IS NOT NULL THEN
                IF NOT EXISTS (
                    SELECT 1 FROM public.utilisateurs 
                    WHERE id = auth.uid() AND (role_technique = 'SUPER_ADMIN' OR telephone IN ('0169031463', '69031463'))
                ) THEN
                    RAISE EXCEPTION 'Sécurité Gouvernance : Un responsable ne peut pas modifier son périmètre territorial sans approbation préalable du Super Administrateur National.';
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquer_changement_perimetre ON public.utilisateurs;
CREATE TRIGGER trg_bloquer_changement_perimetre
BEFORE UPDATE ON public.utilisateurs
FOR EACH ROW
EXECUTE FUNCTION public.verifier_changement_perimetre_responsable();

-- ---------------------------------------------------------------------
-- 3. INITIALISATION PREALABLE DES TABLES SI NON EXISTANTES
-- (Garantit l'existence des tables pour éliminer toute erreur 42P01)
-- ---------------------------------------------------------------------

-- A. Table des rapports hebdomadaires de suivi PNSC
CREATE TABLE IF NOT EXISTS public.rapports_hebdo_pnsc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ascq_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    departement_id UUID REFERENCES public.departements(id),
    departement_nom TEXT,
    commune_id UUID REFERENCES public.communes(id),
    commune_nom TEXT,
    arrondissement_id UUID REFERENCES public.arrondissements(id),
    arrondissement_nom TEXT,
    annee INTEGER NOT NULL,
    semaine INTEGER NOT NULL CHECK (semaine BETWEEN 1 AND 53),
    date_debut DATE,
    date_fin DATE,
    statut TEXT NOT NULL DEFAULT 'BROUILLON' CHECK (statut IN ('BROUILLON', 'VALIDE')),
    date_validation TIMESTAMPTZ,
    signature_tactile TEXT,
    rh_besoins_normes INTEGER NOT NULL DEFAULT 0,
    rh_fonctionnel INTEGER NOT NULL DEFAULT 0,
    rh_gap INTEGER GENERATED ALWAYS AS (GREATEST(0, rh_besoins_normes - rh_fonctionnel)) STORED,
    motos_mise_a_dispo INTEGER NOT NULL DEFAULT 0,
    motos_fonctionnel INTEGER NOT NULL DEFAULT 0,
    motos_gap INTEGER GENERATED ALWAYS AS (GREATEST(0, motos_mise_a_dispo - motos_fonctionnel)) STORED,
    ordinateurs_mise_a_dispo INTEGER NOT NULL DEFAULT 0,
    ordinateurs_fonctionnel INTEGER NOT NULL DEFAULT 0,
    ordinateurs_gap INTEGER GENERATED ALWAYS AS (GREATEST(0, ordinateurs_mise_a_dispo - ordinateurs_fonctionnel)) STORED,
    remuneration_due_llf NUMERIC(5,1) NOT NULL DEFAULT 0,
    remuneration_due_fadec NUMERIC(5,1) NOT NULL DEFAULT 0,
    remuneration_due_srhr NUMERIC(5,1) NOT NULL DEFAULT 0,
    activites_realisees TEXT NOT NULL DEFAULT '',
    difficultes TEXT NOT NULL DEFAULT '',
    suggestions TEXT NOT NULL DEFAULT '',
    forfait_internet_recu BOOLEAN NOT NULL DEFAULT FALSE,
    forfait_internet_details TEXT DEFAULT '',
    carburant_recu BOOLEAN NOT NULL DEFAULT FALSE,
    carburant_details TEXT DEFAULT '',
    autres_recus TEXT DEFAULT '',
    observations TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_rapport_hebdo_pnsc_ascq_semaine UNIQUE(ascq_id, annee, semaine)
);

CREATE INDEX IF NOT EXISTS idx_rapports_hebdo_pnsc_commune ON public.rapports_hebdo_pnsc(commune_id, annee, semaine);
CREATE INDEX IF NOT EXISTS idx_rapports_hebdo_pnsc_ascq ON public.rapports_hebdo_pnsc(ascq_id, annee, semaine);
ALTER TABLE public.rapports_hebdo_pnsc ENABLE ROW LEVEL SECURITY;

-- B. Table des fiches hebdomadaires officielles d'activités du Relais Communautaire
CREATE TABLE IF NOT EXISTS public.fiches_activites_hebdo_relais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relais_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    ascq_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
    departement_id UUID REFERENCES public.departements(id),
    zone_sanitaire_id UUID REFERENCES public.zones_sanitaires(id),
    commune_id UUID REFERENCES public.communes(id),
    arrondissement_id UUID REFERENCES public.arrondissements(id),
    village_nom TEXT NOT NULL,
    grappe INTEGER DEFAULT 1,
    semaine_du DATE NOT NULL,
    annee INTEGER NOT NULL,
    semaine_num INTEGER NOT NULL,
    lignes_activites JSONB NOT NULL DEFAULT '[]'::jsonb,
    nbre_vad_prevu INT DEFAULT 0,
    nbre_vad_realise INT DEFAULT 0,
    nbre_menages_visites INT DEFAULT 0,
    total_menages_en_charge INT DEFAULT 0,
    nbre_causeries INT DEFAULT 0,
    themes_causeries TEXT,
    nbre_salubrite INT DEFAULT 0,
    sante_animale_sites INT DEFAULT 0,
    affaires_sociales_visites INT DEFAULT 0,
    femmes_enceintes_suivies INT DEFAULT 0,
    femmes_suivi_cpn INT DEFAULT 0,
    femmes_suivi_vat INT DEFAULT 0,
    enfants_0_59_suivis INT DEFAULT 0,
    enfants_vaccination INT DEFAULT 0,
    enfants_nutrition INT DEFAULT 0,
    personnes_referees INT DEFAULT 0,
    autres_activites_texte TEXT,
    signature_rc TEXT,
    date_signature_rc TIMESTAMPTZ DEFAULT NOW(),
    lu_et_approuve_ascq BOOLEAN DEFAULT FALSE,
    date_approbation_ascq TIMESTAMPTZ,
    observations_ascq TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiches_rc_relais ON public.fiches_activites_hebdo_relais(relais_id);
CREATE INDEX IF NOT EXISTS idx_fiches_rc_ascq ON public.fiches_activites_hebdo_relais(ascq_id);
CREATE INDEX IF NOT EXISTS idx_fiches_rc_semaine ON public.fiches_activites_hebdo_relais(annee, semaine_num);
ALTER TABLE public.fiches_activites_hebdo_relais ENABLE ROW LEVEL SECURITY;

-- C. Table du journal d'audit des exports responsables
CREATE TABLE IF NOT EXISTS public.journal_exports_responsables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
    user_nom_complet TEXT NOT NULL,
    user_role TEXT NOT NULL,
    type_export TEXT NOT NULL,
    format_export TEXT NOT NULL CHECK (format_export IN ('EXCEL', 'CSV', 'PDF')),
    territoire_nom TEXT NOT NULL,
    niveau_territoire TEXT NOT NULL,
    parametres JSONB DEFAULT '{}'::jsonb,
    nb_lignes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_exports_user ON public.journal_exports_responsables(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_exports_created ON public.journal_exports_responsables(created_at DESC);
ALTER TABLE public.journal_exports_responsables ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 4. POLITIQUES RLS : CONSULTATION SEULE POUR LES RESPONSABLES
-- Lecture stricte au territoire via ce_responsable_peut_il_voir_cet_arrondissement
-- Ecriture formellement interdite aux responsables (INSERT, UPDATE, DELETE)
-- ---------------------------------------------------------------------

-- A. Table alertes_communautaires
DROP POLICY IF EXISTS "Responsables lecture alertes selon territoire" ON public.alertes_communautaires;
CREATE POLICY "Responsables lecture alertes selon territoire" ON public.alertes_communautaires
    FOR SELECT TO authenticated
    USING (public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), arrondissement_id));

-- B. Table deces_communautaires
DROP POLICY IF EXISTS "Responsables lecture deces selon territoire" ON public.deces_communautaires;
CREATE POLICY "Responsables lecture deces selon territoire" ON public.deces_communautaires
    FOR SELECT TO authenticated
    USING (public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), arrondissement_id));

-- C. Table rapports_hebdomadaires
DROP POLICY IF EXISTS "Responsables lecture hebdo selon territoire" ON public.rapports_hebdomadaires;
CREATE POLICY "Responsables lecture hebdo selon territoire" ON public.rapports_hebdomadaires
    FOR SELECT TO authenticated
    USING (public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), arrondissement_id));

-- D. Table rapports_hebdo_pnsc
DROP POLICY IF EXISTS "Responsables lecture hebdo pnsc selon territoire" ON public.rapports_hebdo_pnsc;
CREATE POLICY "Responsables lecture hebdo pnsc selon territoire" ON public.rapports_hebdo_pnsc
    FOR SELECT TO authenticated
    USING (public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), arrondissement_id));

-- E. Table rapports_mensuels_ascq
DROP POLICY IF EXISTS "Responsables lecture rma selon territoire" ON public.rapports_mensuels_ascq;
CREATE POLICY "Responsables lecture rma selon territoire" ON public.rapports_mensuels_ascq
    FOR SELECT TO authenticated
    USING (public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), arrondissement_id));

-- F. Table plannings_ascq
DROP POLICY IF EXISTS "Responsables lecture plannings selon territoire" ON public.plannings_ascq;
CREATE POLICY "Responsables lecture plannings selon territoire" ON public.plannings_ascq
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.utilisateurs u
            WHERE u.id = public.plannings_ascq.ascq_id
              AND (
                  public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), u.arrondissement_id)
                  OR (u.second_arrondissement_id IS NOT NULL AND public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), u.second_arrondissement_id))
              )
        )
    );

-- G. Table activites_menees
DROP POLICY IF EXISTS "Responsables lecture activites selon territoire" ON public.activites_menees;
CREATE POLICY "Responsables lecture activites selon territoire" ON public.activites_menees
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.utilisateurs u
            WHERE u.id = public.activites_menees.ascq_id
              AND (
                  public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), u.arrondissement_id)
                  OR (u.second_arrondissement_id IS NOT NULL AND public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), u.second_arrondissement_id))
              )
        )
    );

-- H. Table registre_alertes_rumeurs
DROP POLICY IF EXISTS "Responsables lecture registre selon territoire" ON public.registre_alertes_rumeurs;
CREATE POLICY "Responsables lecture registre selon territoire" ON public.registre_alertes_rumeurs
    FOR SELECT TO authenticated
    USING (public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), arrondissement_id));

-- I. Table references_communautaires
DROP POLICY IF EXISTS "Responsables lecture references selon territoire" ON public.references_communautaires;
CREATE POLICY "Responsables lecture references selon territoire" ON public.references_communautaires
    FOR SELECT TO authenticated
    USING (public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), arrondissement_id));

-- J. Table suivi_femmes_enceintes & suivi_enfants_1000_jours
DROP POLICY IF EXISTS "Responsables lecture femmes enceintes selon territoire" ON public.suivi_femmes_enceintes;
CREATE POLICY "Responsables lecture femmes enceintes selon territoire" ON public.suivi_femmes_enceintes
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.arrondissements arr
            WHERE LOWER(arr.nom) = LOWER(public.suivi_femmes_enceintes.arrondissement_nom)
              AND public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), arr.id)
        )
        OR public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), (SELECT arrondissement_id FROM public.utilisateurs WHERE id = public.suivi_femmes_enceintes.ascq_id))
    );

DROP POLICY IF EXISTS "Responsables lecture enfants 1000 jours selon territoire" ON public.suivi_enfants_1000_jours;
CREATE POLICY "Responsables lecture enfants 1000 jours selon territoire" ON public.suivi_enfants_1000_jours
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.arrondissements arr
            WHERE LOWER(arr.nom) = LOWER(public.suivi_enfants_1000_jours.arrondissement_nom)
              AND public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), arr.id)
        )
        OR public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), (SELECT arrondissement_id FROM public.utilisateurs WHERE id = public.suivi_enfants_1000_jours.ascq_id))
    );

-- BLOCAGE FORMEL DE TOUTE ECRITURE PAR UN RESPONSABLE DE CONSULTATION
CREATE OR REPLACE FUNCTION public.bloquer_ecriture_responsable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF public.est_responsable_consultation(auth.uid()) THEN
        RAISE EXCEPTION 'Droits restreints : Les responsables de santé sont habilités en CONSULTATION SEULE. Aucune saisie, modification ou suppression n''est permise.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquer_ecriture_alertes ON public.alertes_communautaires;
CREATE TRIGGER trg_bloquer_ecriture_alertes
BEFORE INSERT OR UPDATE OR DELETE ON public.alertes_communautaires
FOR EACH ROW EXECUTE FUNCTION public.bloquer_ecriture_responsable();

DROP TRIGGER IF EXISTS trg_bloquer_ecriture_deces ON public.deces_communautaires;
CREATE TRIGGER trg_bloquer_ecriture_deces
BEFORE INSERT OR UPDATE OR DELETE ON public.deces_communautaires
FOR EACH ROW EXECUTE FUNCTION public.bloquer_ecriture_responsable();

DROP TRIGGER IF EXISTS trg_bloquer_ecriture_rma ON public.rapports_mensuels_ascq;
CREATE TRIGGER trg_bloquer_ecriture_rma
BEFORE INSERT OR UPDATE OR DELETE ON public.rapports_mensuels_ascq
FOR EACH ROW EXECUTE FUNCTION public.bloquer_ecriture_responsable();

DROP TRIGGER IF EXISTS trg_bloquer_ecriture_hebdo ON public.rapports_hebdo_pnsc;
CREATE TRIGGER trg_bloquer_ecriture_hebdo
BEFORE INSERT OR UPDATE OR DELETE ON public.rapports_hebdo_pnsc
FOR EACH ROW EXECUTE FUNCTION public.bloquer_ecriture_responsable();

DROP TRIGGER IF EXISTS trg_bloquer_ecriture_hebdomadaires ON public.rapports_hebdomadaires;
CREATE TRIGGER trg_bloquer_ecriture_hebdomadaires
BEFORE INSERT OR UPDATE OR DELETE ON public.rapports_hebdomadaires
FOR EACH ROW EXECUTE FUNCTION public.bloquer_ecriture_responsable();

-- ---------------------------------------------------------------------
-- 5. POLITIQUES RLS DU JOURNAL D'AUDIT DES EXPORTS RESPONSABLES
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Lecture journal exports responsable ou admin" ON public.journal_exports_responsables;
CREATE POLICY "Lecture journal exports responsable ou admin" ON public.journal_exports_responsables
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR auth.uid() IN (SELECT id FROM public.utilisateurs WHERE role_technique = 'SUPER_ADMIN'));

DROP POLICY IF EXISTS "Insertion journal exports authentifie" ON public.journal_exports_responsables;
CREATE POLICY "Insertion journal exports authentifie" ON public.journal_exports_responsables
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 6. RPC D'EXPORT ET VERIFICATION DU PERIMETRE
-- Refuse tout export hors territoire et enregistre dans le journal d'audit
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.gouvernance_enregistrer_export(
    p_type_export TEXT,
    p_format_export TEXT,
    p_territoire_nom TEXT,
    p_niveau_territoire TEXT,
    p_arrondissement_cible_id UUID DEFAULT NULL,
    p_parametres JSONB DEFAULT '{}'::jsonb,
    p_nb_lignes INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT id, nom || ' ' || prenoms as nom_complet, role_technique, poste
    INTO v_user
    FROM public.utilisateurs
    WHERE id = auth.uid();

    IF v_user.id IS NULL THEN
        RAISE EXCEPTION 'Authentification requise pour exporter des données.';
    END IF;

    -- Vérification si un arrondissement spécifique est ciblé hors de son périmètre
    IF p_arrondissement_cible_id IS NOT NULL THEN
        IF NOT public.ce_responsable_peut_il_voir_cet_arrondissement(v_user.id, p_arrondissement_cible_id) THEN
            RAISE EXCEPTION 'Sécurité : Export refusé. Le territoire demandé ne fait pas partie de votre périmètre autorisé.';
        END IF;
    END IF;

    -- Enregistrer l'événement dans le journal d'audit
    INSERT INTO public.journal_exports_responsables (
        user_id,
        user_nom_complet,
        user_role,
        type_export,
        format_export,
        territoire_nom,
        niveau_territoire,
        parametres,
        nb_lignes
    ) VALUES (
        v_user.id,
        v_user.nom_complet,
        COALESCE(v_user.poste, v_user.role_technique),
        p_type_export,
        p_format_export,
        p_territoire_nom,
        p_niveau_territoire,
        p_parametres,
        p_nb_lignes
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Export audité et autorisé avec succès.'
    );
END;
$$;

-- ---------------------------------------------------------------------
-- 7. NOTIFICATIONS AUTOMATIQUES SUR ALERTES PRIORITAIRES & DECES MATERNELS/NEONATALS
-- Dès qu'une alerte prioritaire ou décès maternel survient, les responsables du territoire sont immédiatement alertés
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notifier_responsables_territoire_alerte_critique()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_est_critique BOOLEAN := FALSE;
    v_titre TEXT;
    v_msg TEXT;
    v_resp RECORD;
BEGIN
    -- Condition d'alerte prioritaire épidémiologique
    IF (TG_TABLE_NAME = 'alertes_communautaires') THEN
        IF (NEW.est_prioritaire = TRUE 
            OR NEW.type_alerte_nom ILIKE '%CHOLERA%'
            OR NEW.type_alerte_nom ILIKE '%LASSA%'
            OR NEW.type_alerte_nom ILIKE '%EBOLA%'
            OR NEW.type_alerte_nom ILIKE '%RAGE%'
            OR NEW.type_alerte_nom ILIKE '%MENINGITE%'
            OR NEW.type_alerte_nom ILIKE '%PFA%'
            OR NEW.type_alerte_nom ILIKE '%PARALYSIE%'
            OR NEW.type_alerte_nom ILIKE '%ROUGEOLE%'
            OR NEW.type_alerte_nom ILIKE '%FIEVRE JAUNE%') THEN
            
            v_est_critique := TRUE;
            v_titre := '🚨 ALERTE EPIDEMIQUE PRIORITAIRE : ' || NEW.type_alerte_nom;
            v_msg := format('Alerte critique signalée au village %s (semaine %s). Délais de prise en charge et investigation requis immédiatement.', NEW.village_nom, NEW.semaine_epidemio);
        END IF;

    -- Condition de décès maternel ou néonatal
    ELSIF (TG_TABLE_NAME = 'deces_communautaires') THEN
        IF (NEW.type_deces_nom ILIKE '%MATERNEL%' OR NEW.type_deces_nom ILIKE '%NEONATAL%') THEN
            v_est_critique := TRUE;
            v_titre := '⚠️ DECES CRITIQUE NOTIFIE : ' || NEW.type_deces_nom;
            v_msg := format('Décès %s notifié au village %s. Nécessite une autopsie verbale et audit immédiat.', LOWER(NEW.type_deces_nom), NEW.village_nom);
        END IF;
    END IF;

    IF v_est_critique THEN
        -- Rechercher tous les responsables autorisés à voir cet arrondissement
        FOR v_resp IN
            SELECT DISTINCT u.id
            FROM public.utilisateurs u
            WHERE u.statut_compte = 'VALIDE'
              AND (
                  public.ce_responsable_peut_il_voir_cet_arrondissement(u.id, NEW.arrondissement_id)
                  OR u.role_technique = 'SUPER_ADMIN'
              )
        LOOP
            BEGIN
                INSERT INTO public.notifications (
                    destinataire_id,
                    titre,
                    message,
                    type,
                    type_notification,
                    priorite,
                    lu
                ) VALUES (
                    v_resp.id,
                    v_titre,
                    v_msg,
                    'URGENT',
                    'ALERTE_PRIORITAIRE',
                    'URGENTE',
                    FALSE
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_responsables_alerte ON public.alertes_communautaires;
CREATE TRIGGER trg_notif_responsables_alerte
AFTER INSERT ON public.alertes_communautaires
FOR EACH ROW EXECUTE FUNCTION public.notifier_responsables_territoire_alerte_critique();

DROP TRIGGER IF EXISTS trg_notif_responsables_deces ON public.deces_communautaires;
CREATE TRIGGER trg_notif_responsables_deces
AFTER INSERT ON public.deces_communautaires
FOR EACH ROW EXECUTE FUNCTION public.notifier_responsables_territoire_alerte_critique();

-- ---------------------------------------------------------------------
-- 8. TABLE & FONCTIONS : FICHE HEBDOMADAIRE D'ACTIVITES DU RELAIS (PNSC BENIN)
-- Conforme au document officiel Ministère de la Santé / PNSC
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fiches_activites_hebdo_relais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relais_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    ascq_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
    
    -- Localisation
    departement_id UUID REFERENCES public.departements(id),
    zone_sanitaire_id UUID REFERENCES public.zones_sanitaires(id),
    commune_id UUID REFERENCES public.communes(id),
    arrondissement_id UUID REFERENCES public.arrondissements(id),
    village_nom TEXT NOT NULL,
    grappe INTEGER DEFAULT 1,
    
    -- Période
    semaine_du DATE NOT NULL,
    annee INTEGER NOT NULL,
    semaine_num INTEGER NOT NULL,
    
    -- Grille d'activités selon formulaire officiel (JSON structuré)
    -- Contient les lignes d'activités avec : date, heure, activite, zone_ciblee, qte_prevue, qte_realisee, observations
    lignes_activites JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Synthèses quantitatives officielles
    nbre_vad_prevu INT DEFAULT 0,
    nbre_vad_realise INT DEFAULT 0,
    nbre_menages_visites INT DEFAULT 0,
    total_menages_en_charge INT DEFAULT 0,
    
    nbre_causeries INT DEFAULT 0,
    themes_causeries TEXT,
    
    nbre_salubrite INT DEFAULT 0,
    sante_animale_sites INT DEFAULT 0,
    affaires_sociales_visites INT DEFAULT 0,
    
    femmes_enceintes_suivies INT DEFAULT 0,
    femmes_suivi_cpn INT DEFAULT 0,
    femmes_suivi_vat INT DEFAULT 0,
    
    enfants_0_59_suivis INT DEFAULT 0,
    enfants_vaccination INT DEFAULT 0,
    enfants_nutrition INT DEFAULT 0,
    
    personnes_referees INT DEFAULT 0,
    autres_activites_texte TEXT,
    
    -- Signatures et Validation
    signature_rc TEXT,
    date_signature_rc TIMESTAMPTZ DEFAULT NOW(),
    
    lu_et_approuve_ascq BOOLEAN DEFAULT FALSE,
    date_approbation_ascq TIMESTAMPTZ,
    observations_ascq TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiches_rc_relais ON public.fiches_activites_hebdo_relais(relais_id);
CREATE INDEX IF NOT EXISTS idx_fiches_rc_ascq ON public.fiches_activites_hebdo_relais(ascq_id);
CREATE INDEX IF NOT EXISTS idx_fiches_rc_semaine ON public.fiches_activites_hebdo_relais(annee, semaine_num);

ALTER TABLE public.fiches_activites_hebdo_relais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture fiches RC proprieaire, ascq et gouvernance" ON public.fiches_activites_hebdo_relais;
CREATE POLICY "Lecture fiches RC proprieaire, ascq et gouvernance" ON public.fiches_activites_hebdo_relais
    FOR SELECT TO authenticated
    USING (
        relais_id = auth.uid()
        OR ascq_id = auth.uid()
        OR public.ce_responsable_peut_il_voir_cet_arrondissement(auth.uid(), arrondissement_id)
        OR auth.uid() IN (SELECT id FROM public.utilisateurs WHERE role_technique = 'SUPER_ADMIN')
    );

DROP POLICY IF EXISTS "Insertion fiches RC par le relais" ON public.fiches_activites_hebdo_relais;
CREATE POLICY "Insertion fiches RC par le relais" ON public.fiches_activites_hebdo_relais
    FOR INSERT TO authenticated
    WITH CHECK (relais_id = auth.uid());

DROP POLICY IF EXISTS "Modification fiches RC par le relais ou ascq" ON public.fiches_activites_hebdo_relais;
CREATE POLICY "Modification fiches RC par le relais ou ascq" ON public.fiches_activites_hebdo_relais
    FOR UPDATE TO authenticated
    USING (relais_id = auth.uid() OR ascq_id = auth.uid());

-- ---------------------------------------------------------------------
-- 9. PERMISSIONS D'EXECUTION
-- ---------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.ce_responsable_peut_il_voir_cet_arrondissement TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.est_responsable_consultation TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gouvernance_enregistrer_export TO authenticated;
GRANT ALL ON TABLE public.journal_exports_responsables TO authenticated;
GRANT ALL ON TABLE public.fiches_activites_hebdo_relais TO authenticated;
GRANT ALL ON TABLE public.rapports_hebdo_pnsc TO authenticated;

-- ---------------------------------------------------------------------
-- 10. EXTENSION DES DESTINATIONS DE RÉFÉRENCE COMMUNAUTAIRE : ASCQ, CS, GUPS
-- ---------------------------------------------------------------------

-- Assouplissement des contraintes de destination et typologie
ALTER TABLE public.references_communautaires DROP CONSTRAINT IF EXISTS references_communautaires_destination_type_check;
ALTER TABLE public.references_communautaires ADD CONSTRAINT references_communautaires_destination_type_check 
    CHECK (destination_type IN ('CENTRE_SANTE', 'GUPS', 'ASCQ'));

ALTER TABLE public.references_communautaires DROP CONSTRAINT IF EXISTS references_communautaires_type_reference_check;
ALTER TABLE public.references_communautaires ADD CONSTRAINT references_communautaires_type_reference_check 
    CHECK (type_reference IN ('SANTE', 'SOCIAL_GUPS', 'ASCQ'));

-- Adaptation de creer_reference_communautaire
CREATE OR REPLACE FUNCTION public.creer_reference_communautaire(
    p_type_reference TEXT,
    p_destination_type TEXT,
    p_destination_nom TEXT,
    p_motif_code TEXT,
    p_motif_libelle TEXT,
    p_motif_details TEXT DEFAULT NULL,
    p_degre_urgence TEXT DEFAULT 'NORMALE',
    p_one_health_concerne BOOLEAN DEFAULT false,
    p_one_health_secteur TEXT DEFAULT NULL,
    p_nom_patient TEXT DEFAULT '',
    p_prenoms_patient TEXT DEFAULT '',
    p_sexe TEXT DEFAULT 'M',
    p_age_valeur INTEGER DEFAULT 1,
    p_age_unite TEXT DEFAULT 'ANS',
    p_telephone_contact TEXT DEFAULT NULL,
    p_nom_parent_tuteur TEXT DEFAULT NULL,
    p_adresse_exacte TEXT DEFAULT NULL,
    p_village_nom TEXT DEFAULT NULL,
    p_relais_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_poste TEXT;
    v_user_nom TEXT;
    v_ascq_id UUID;
    v_ascq_nom TEXT;
    v_relais_id UUID := p_relais_id;
    v_relais_nom TEXT;
    v_relais_tel TEXT;
    v_dep_id UUID;
    v_com_id UUID;
    v_arr_id UUID;
    v_village TEXT := p_village_nom;
    v_annee INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    v_semaine INTEGER;
    v_count_today INTEGER;
    v_numero TEXT;
    v_new_id UUID;
    v_statut_initial TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.';
    END IF;

    -- Obtenir les infos de l'utilisateur connecté
    SELECT poste, nom || ' ' || prenoms, departement_id, commune_id, arrondissement_id
    INTO v_user_poste, v_user_nom, v_dep_id, v_com_id, v_arr_id
    FROM public.utilisateurs
    WHERE id = v_user_id;

    -- Semaine épidémiologique
    v_semaine := EXTRACT(WEEK FROM CURRENT_DATE)::INTEGER;

    -- Si c'est un RC qui émet la référence
    IF v_user_poste = 'RC' THEN
        SELECT id, nom || ' ' || prenoms, telephone, ascq_id, village_nom
        INTO v_relais_id, v_relais_nom, v_relais_tel, v_ascq_id, v_village
        FROM public.relais_communautaires
        WHERE user_id = v_user_id
        LIMIT 1;

        -- Obtenir nom de l'ASCQ superviseur
        IF v_ascq_id IS NOT NULL THEN
            SELECT nom || ' ' || prenoms, departement_id, commune_id, arrondissement_id
            INTO v_ascq_nom, v_dep_id, v_com_id, v_arr_id
            FROM public.utilisateurs
            WHERE id = v_ascq_id;
        END IF;

        v_statut_initial := 'EN_ATTENTE_ASCQ';
    ELSE
        -- Si c'est l'ASCQ lui-même
        v_ascq_id := v_user_id;
        v_ascq_nom := v_user_nom;
        v_relais_nom := 'Référence directe par ASCQ';
        v_statut_initial := 'VALIDEE';
    END IF;

    -- Numérotation officielle
    SELECT COUNT(*) + 1 INTO v_count_today
    FROM public.references_communautaires
    WHERE annee = v_annee AND semaine_epidemio = v_semaine;

    v_numero := format('REF-%s-W%s-%s', v_annee, LPAD(v_semaine::text, 2, '0'), LPAD(v_count_today::text, 4, '0'));

    -- Insertion dans la table
    INSERT INTO public.references_communautaires (
        numero_reference,
        relais_id,
        relais_nom,
        relais_telephone,
        ascq_id,
        ascq_nom,
        type_reference,
        destination_type,
        destination_nom,
        motif_code,
        motif_libelle,
        motif_details,
        degre_urgence,
        one_health_concerne,
        one_health_secteur,
        nom_patient,
        prenoms_patient,
        sexe,
        age_valeur,
        age_unite,
        telephone_contact,
        nom_parent_tuteur,
        adresse_exacte,
        village_nom,
        departement_id,
        commune_id,
        arrondissement_id,
        statut,
        date_validation_ascq,
        annee,
        semaine_epidemio
    ) VALUES (
        v_numero,
        v_relais_id,
        COALESCE(v_relais_nom, 'Relais Communautaire'),
        v_relais_tel,
        v_ascq_id,
        v_ascq_nom,
        p_type_reference,
        p_destination_type,
        p_destination_nom,
        p_motif_code,
        p_motif_libelle,
        p_motif_details,
        p_degre_urgence,
        p_one_health_concerne,
        p_one_health_secteur,
        p_nom_patient,
        p_prenoms_patient,
        p_sexe,
        p_age_valeur,
        p_age_unite,
        p_telephone_contact,
        p_nom_parent_tuteur,
        p_adresse_exacte,
        v_village,
        v_dep_id,
        v_com_id,
        v_arr_id,
        v_statut_initial,
        CASE WHEN v_statut_initial = 'VALIDEE' THEN NOW() ELSE NULL END,
        v_annee,
        v_semaine
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_new_id,
        'numero_reference', v_numero,
        'destination_nom', p_destination_nom,
        'statut', v_statut_initial
    );
END;
$$;
