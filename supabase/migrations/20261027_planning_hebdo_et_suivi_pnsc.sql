-- =====================================================================
-- ASCQ BÉNIN - Migration : Planning Hebdomadaire & Suivi Hebdo PNSC
-- 1. Évolution du Planning vers un format strictement hebdomadaire
-- 2. Création de la table des Rapports Hebdomadaires de Suivi PNSC
-- 3. Sécurité RLS et droits de compilation communale
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ÉVOLUTION DU PLANNING VERS UN FORMAT HEBDOMADAIRE
-- ---------------------------------------------------------------------

-- Ajout des colonnes semaine et dates au planning si elles n'existent pas
ALTER TABLE public.plannings_ascq ADD COLUMN IF NOT EXISTS semaine INTEGER;
ALTER TABLE public.plannings_ascq ADD COLUMN IF NOT EXISTS date_debut DATE;
ALTER TABLE public.plannings_ascq ADD COLUMN IF NOT EXISTS date_fin DATE;

-- Rendre la contrainte d'unicité basée sur (ascq_id, annee, semaine)
ALTER TABLE public.plannings_ascq DROP CONSTRAINT IF EXISTS uq_planning_ascq_mois_annee;
ALTER TABLE public.plannings_ascq DROP CONSTRAINT IF EXISTS uq_planning_ascq_semaine_annee;
ALTER TABLE public.plannings_ascq ADD CONSTRAINT uq_planning_ascq_semaine_annee UNIQUE(ascq_id, annee, semaine);

-- Permettre un mois optionnel ou calculé
ALTER TABLE public.plannings_ascq ALTER COLUMN mois DROP NOT NULL;

-- Ajout du jour de la semaine dans les lignes de planning (Lundi à Dimanche)
ALTER TABLE public.lignes_planning_ascq ADD COLUMN IF NOT EXISTS jour_semaine TEXT DEFAULT 'Lundi';


-- ---------------------------------------------------------------------
-- 2. TABLE DU RAPPORT HEBDOMADAIRE DE SUIVI PNSC
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rapports_hebdo_pnsc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ascq_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    
    -- Localisation administrative
    departement_id UUID REFERENCES public.departements(id),
    departement_nom TEXT,
    commune_id UUID REFERENCES public.communes(id),
    commune_nom TEXT,
    arrondissement_id UUID REFERENCES public.arrondissements(id),
    arrondissement_nom TEXT,
    
    -- Temporalité hebdomadaire
    annee INTEGER NOT NULL,
    semaine INTEGER NOT NULL CHECK (semaine BETWEEN 1 AND 53),
    date_debut DATE,
    date_fin DATE,

    -- Statut du rapport
    statut TEXT NOT NULL DEFAULT 'BROUILLON' CHECK (statut IN ('BROUILLON', 'VALIDE')),
    date_validation TIMESTAMPTZ,
    signature_tactile TEXT,

    -- 1. Ressources Humaines (Besoins, Fonctionnel, Gap)
    rh_besoins_normes INTEGER NOT NULL DEFAULT 0,
    rh_fonctionnel INTEGER NOT NULL DEFAULT 0,
    rh_gap INTEGER GENERATED ALWAYS AS (GREATEST(0, rh_besoins_normes - rh_fonctionnel)) STORED,

    -- 2. Moyens de déplacement : Motos (Mise à dispo, Fonctionnel, Gap)
    motos_mise_a_dispo INTEGER NOT NULL DEFAULT 0,
    motos_fonctionnel INTEGER NOT NULL DEFAULT 0,
    motos_gap INTEGER GENERATED ALWAYS AS (GREATEST(0, motos_mise_a_dispo - motos_fonctionnel)) STORED,

    -- 3. Outils de travail numériques : Ordinateurs / Tablettes (Mise à dispo, Fonctionnel, Gap)
    ordinateurs_mise_a_dispo INTEGER NOT NULL DEFAULT 0,
    ordinateurs_fonctionnel INTEGER NOT NULL DEFAULT 0,
    ordinateurs_gap INTEGER GENERATED ALWAYS AS (GREATEST(0, ordinateurs_mise_a_dispo - ordinateurs_fonctionnel)) STORED,

    -- 4. Rémunération due (Nombre de mois arriérés par source de financement)
    remuneration_due_llf NUMERIC(5,1) NOT NULL DEFAULT 0,
    remuneration_due_fadec NUMERIC(5,1) NOT NULL DEFAULT 0,
    remuneration_due_srhr NUMERIC(5,1) NOT NULL DEFAULT 0,

    -- 5. Activités réalisées, Difficultés, Suggestions
    activites_realisees TEXT NOT NULL DEFAULT '',
    difficultes TEXT NOT NULL DEFAULT '',
    suggestions TEXT NOT NULL DEFAULT '',

    -- 6. Observations & Dotations reçues (Forfait internet, Carburant, Autres)
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

-- Index pour recherche et compilation rapide
CREATE INDEX IF NOT EXISTS idx_rapports_hebdo_pnsc_commune ON public.rapports_hebdo_pnsc(commune_id, annee, semaine);
CREATE INDEX IF NOT EXISTS idx_rapports_hebdo_pnsc_ascq ON public.rapports_hebdo_pnsc(ascq_id, annee, semaine);

-- Activation de RLS
ALTER TABLE public.rapports_hebdo_pnsc ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
DROP POLICY IF EXISTS "rapports_hebdo_pnsc_lecture" ON public.rapports_hebdo_pnsc;
CREATE POLICY "rapports_hebdo_pnsc_lecture" ON public.rapports_hebdo_pnsc
FOR SELECT TO authenticated
USING (
    ascq_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.utilisateurs u
        WHERE u.id = auth.uid() AND (
            u.role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR', 'ADMIN_DEPARTEMENTAL', 'ADMIN_COMMUNAL') OR
            u.poste IN ('PF_CCLS_TP', 'MCC', 'MCZS', 'RCSE', 'C_RAMS', 'DDS', 'CCD_CDLS_TP', 'CSSPR', 'CSPSMEMH') OR
            (u.commune_id = rapports_hebdo_pnsc.commune_id)
        )
    )
);

DROP POLICY IF EXISTS "rapports_hebdo_pnsc_ecriture" ON public.rapports_hebdo_pnsc;
CREATE POLICY "rapports_hebdo_pnsc_ecriture" ON public.rapports_hebdo_pnsc
FOR ALL TO authenticated
USING (
    ascq_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.utilisateurs u
        WHERE u.id = auth.uid() AND u.role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR')
    )
);
