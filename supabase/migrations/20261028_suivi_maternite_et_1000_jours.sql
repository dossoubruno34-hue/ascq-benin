-- =====================================================================
-- MIGRATION : MODULE SUIVI DE LA MATERNITÉ & 1 000 PREMIERS JOURS
-- (Femmes enceintes, accouchements, enfants 0-59 mois, nutrition, vaccins, rappels)
-- =====================================================================

-- 1. TABLE : SUIVI DES FEMMES ENCEINTES & MATERNITÉ
CREATE TABLE IF NOT EXISTS public.suivi_femmes_enceintes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ascq_id UUID REFERENCES public.profils(id) ON DELETE SET NULL,
    relais_id UUID REFERENCES public.profils(id) ON DELETE SET NULL,
    nom TEXT NOT NULL,
    prenoms TEXT NOT NULL,
    age INT,
    telephone TEXT,
    telephone_conjoint TEXT,
    commune_nom TEXT,
    arrondissement_nom TEXT,
    village_nom TEXT NOT NULL,
    
    -- Date Dernières Règles & Calculs
    date_ddr DATE,
    date_dpa DATE, -- Date Présumée d'Accouchement (DDR + 9 mois + 7 jours)
    terme_sa INT, -- Semaines d'Aménorrhée estimées
    
    -- Statut grossesse
    statut_grossesse TEXT NOT NULL DEFAULT 'EN_COURS' CHECK (statut_grossesse IN ('EN_COURS', 'ACCOUCHEE', 'REFEREE_URGENCE', 'FAUSSE_COUCHE')),
    
    -- Suivi Consultations Prénatales (CPN)
    cpn_effectuees JSONB DEFAULT '[]'::jsonb, -- ex: ["CPN1", "CPN2", "CPN3"]
    prochaine_cpn_date DATE,
    
    -- Interventions clés reçues
    tpi_sp_doses INT DEFAULT 0, -- Nombre de doses de SP reçues
    fer_acide_folique BOOLEAN DEFAULT false,
    enov_mum BOOLEAN DEFAULT false, -- Supplémentation Enov'Mum+
    mild_distribuee BOOLEAN DEFAULT false, -- Moustiquaire
    vaccin_td_doses INT DEFAULT 0, -- Td1, Td2...
    plan_accouchement_etabli BOOLEAN DEFAULT false,
    
    -- Issue de l'accouchement (renseignée si accouchée)
    date_accouchement DATE,
    lieu_accouchement TEXT, -- CS, Maternité, Hôpital, Domicile
    issue_bebe TEXT CHECK (issue_bebe IS NULL OR issue_bebe IN ('VIVANT', 'MORT_NE', 'JUMEAUX_VIVANTS')),
    poids_naissance_kg NUMERIC(4,2),
    complications TEXT,
    
    notes_ascq TEXT,
    est_synchronise BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_suivi_femmes_ascq ON public.suivi_femmes_enceintes(ascq_id);
CREATE INDEX IF NOT EXISTS idx_suivi_femmes_dpa ON public.suivi_femmes_enceintes(date_dpa);
CREATE INDEX IF NOT EXISTS idx_suivi_femmes_statut ON public.suivi_femmes_enceintes(statut_grossesse);

-- 2. TABLE : SUIVI DES ENFANTS 0-59 MOIS (1 000 PREMIERS JOURS)
CREATE TABLE IF NOT EXISTS public.suivi_enfants_1000_jours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ascq_id UUID REFERENCES public.profils(id) ON DELETE SET NULL,
    relais_id UUID REFERENCES public.profils(id) ON DELETE SET NULL,
    mere_suivi_id UUID REFERENCES public.suivi_femmes_enceintes(id) ON DELETE SET NULL,
    
    nom TEXT NOT NULL,
    prenoms TEXT NOT NULL,
    sexe TEXT NOT NULL CHECK (sexe IN ('M', 'F')),
    date_naissance DATE NOT NULL,
    poids_naissance_kg NUMERIC(4,2),
    
    nom_mere TEXT,
    telephone_parent TEXT,
    commune_nom TEXT,
    arrondissement_nom TEXT,
    village_nom TEXT NOT NULL,
    
    -- Suivi de la nutrition (Programme des 1 000 Premiers Jours)
    allaitement_exclusif_6m BOOLEAN DEFAULT true,
    vitamine_a_doses INT DEFAULT 0, -- 1 à 4 doses (6, 12, 18, 24m)
    vermifuge_doses INT DEFAULT 0, -- 1 à 3 doses (12, 18, 24m)
    
    -- Produits nutritionnels reçus
    produits_nutritionnels JSONB DEFAULT '[]'::jsonb, -- ex: ["Nutributter+", "Plumpy'Nut", "Prompt Nut"]
    
    -- Surveillance de la croissance & Dépistage Malnutrition
    dernier_pb_mm INT, -- Périmètre brachial en millimètres
    statut_nutritionnel TEXT DEFAULT 'NORMAL' CHECK (statut_nutritionnel IN ('NORMAL', 'MAM', 'MAS', 'NON_EVALUE')),
    presence_oedemes BOOLEAN DEFAULT false,
    
    -- Suivi Vaccinal (Grille officielle PEV Bénin / UNICEF)
    -- Stockage des doses reçues sous forme clé/valeur { "bcg": "2026-01-01", "penta_1": "2026-02-15", ... }
    vaccins_recus JSONB DEFAULT '{}'::jsonb,
    est_zero_dose BOOLEAN DEFAULT false,
    est_retard_vaccinal BOOLEAN DEFAULT false,
    
    -- Prochains rendez-vous & Rappels
    prochain_rendez_vous_date DATE,
    motif_prochain_rdv TEXT,
    
    notes_ascq TEXT,
    est_synchronise BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_suivi_enfants_ascq ON public.suivi_enfants_1000_jours(ascq_id);
CREATE INDEX IF NOT EXISTS idx_suivi_enfants_naissance ON public.suivi_enfants_1000_jours(date_naissance);
CREATE INDEX IF NOT EXISTS idx_suivi_enfants_nutrition ON public.suivi_enfants_1000_jours(statut_nutritionnel);

-- 3. POLITIQUES DE SÉCURITÉ (RLS)
ALTER TABLE public.suivi_femmes_enceintes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suivi_enfants_1000_jours ENABLE ROW LEVEL SECURITY;

-- Lecture : ASCQ, RC, Super Admin, Représentants
DROP POLICY IF EXISTS "Lecture suivi_femmes_enceintes" ON public.suivi_femmes_enceintes;
CREATE POLICY "Lecture suivi_femmes_enceintes" ON public.suivi_femmes_enceintes
    FOR SELECT TO authenticated
    USING (true);

-- Écriture : Tout utilisateur connecté (ASCQ / Relais)
DROP POLICY IF EXISTS "Ecriture suivi_femmes_enceintes" ON public.suivi_femmes_enceintes;
CREATE POLICY "Ecriture suivi_femmes_enceintes" ON public.suivi_femmes_enceintes
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Lecture enfants
DROP POLICY IF EXISTS "Lecture suivi_enfants_1000_jours" ON public.suivi_enfants_1000_jours;
CREATE POLICY "Lecture suivi_enfants_1000_jours" ON public.suivi_enfants_1000_jours
    FOR SELECT TO authenticated
    USING (true);

-- Écriture enfants
DROP POLICY IF EXISTS "Ecriture suivi_enfants_1000_jours" ON public.suivi_enfants_1000_jours;
CREATE POLICY "Ecriture suivi_enfants_1000_jours" ON public.suivi_enfants_1000_jours
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
