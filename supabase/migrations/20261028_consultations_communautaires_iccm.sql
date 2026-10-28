-- ==============================================================================
-- MIGRATION : MODULE OFFICIEL DE PRISE EN CHARGE DES CAS EN COMMUNAUTÉ (iCCM)
-- ET SURVEILLANCE CLINIQUE COMMUNAUTAIRE PAR L'ASCQ
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.consultations_communautaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ascq_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
    ascq_nom TEXT,
    relais_id UUID REFERENCES public.relais_communautaires(id) ON DELETE SET NULL,
    relais_nom TEXT,
    date_consultation DATE NOT NULL DEFAULT CURRENT_DATE,
    village TEXT NOT NULL,
    nom_patient TEXT NOT NULL,
    prenoms_patient TEXT NOT NULL,
    age_valeur INTEGER NOT NULL,
    age_unite TEXT NOT NULL DEFAULT 'ANS' CHECK (age_unite IN ('ANS', 'MOIS', 'JOURS')),
    sexe TEXT NOT NULL CHECK (sexe IN ('M', 'F')),
    nom_parent_tuteur TEXT,
    telephone_contact TEXT,
    
    -- Signes cliniques & dépistage
    signe_principal TEXT NOT NULL,
    signes_secondaires TEXT[] DEFAULT '{}',
    tdr_paludisme TEXT NOT NULL CHECK (tdr_paludisme IN ('POSITIF', 'NEGATIF', 'NON_FAIT')),
    diagnostic_possible TEXT NOT NULL,
    
    -- Décision clinique ASCQ
    decision TEXT NOT NULL CHECK (decision IN ('PRISE_EN_CHARGE_COMMUNAUTAIRE', 'REFERER_CS')),
    
    -- Si prise en charge communautaire
    produits_utilises JSONB DEFAULT '[]'::jsonb,
    theme_sensibilisation TEXT,
    date_rendez_vous_suivi DATE,
    
    -- Si référé au Centre de Santé
    premier_geste_pose TEXT,
    reference_id UUID REFERENCES public.references_communautaires(id) ON DELETE SET NULL,
    structure_cs_destination TEXT,
    
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherches rapides et agrégations de rapports
CREATE INDEX IF NOT EXISTS idx_consultations_ascq_id ON public.consultations_communautaires(ascq_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON public.consultations_communautaires(date_consultation);
CREATE INDEX IF NOT EXISTS idx_consultations_decision ON public.consultations_communautaires(decision);
CREATE INDEX IF NOT EXISTS idx_consultations_tdr ON public.consultations_communautaires(tdr_paludisme);

-- Activer RLS
ALTER TABLE public.consultations_communautaires ENABLE ROW LEVEL SECURITY;

-- Politiques RLS permissives pour les professionnels de santé ASCQ & Admins
DROP POLICY IF EXISTS "Lecture consultations pour ascq et admin" ON public.consultations_communautaires;
CREATE POLICY "Lecture consultations pour ascq et admin" ON public.consultations_communautaires
    FOR SELECT TO authenticated
    USING (
        ascq_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.utilisateurs 
            WHERE id = auth.uid() 
            AND role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR', 'ADMIN_COMMUNAL', 'ADMIN_DEPARTEMENTAL')
        )
    );

DROP POLICY IF EXISTS "Insertion consultations pour ascq" ON public.consultations_communautaires;
CREATE POLICY "Insertion consultations pour ascq" ON public.consultations_communautaires
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Modification consultations pour ascq et admin" ON public.consultations_communautaires;
CREATE POLICY "Modification consultations pour ascq et admin" ON public.consultations_communautaires
    FOR UPDATE TO authenticated
    USING (
        ascq_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.utilisateurs 
            WHERE id = auth.uid() 
            AND role_technique IN ('SUPER_ADMIN', 'ADMINISTRATEUR')
        )
    );

-- Vue d'agrégation statistique pour les rapports hebdo et mensuels
CREATE OR REPLACE FUNCTION public.obtenir_statistiques_consultations_ascq(p_ascq_id UUID, p_date_debut DATE, p_date_fin DATE)
RETURNS TABLE (
    total_consultes BIGINT,
    total_pris_en_charge BIGINT,
    total_referes BIGINT,
    total_tdr_positifs BIGINT,
    total_paludisme BIGINT,
    total_diarrhee BIGINT,
    total_infections_respiratoires BIGINT,
    total_malnutrition BIGINT,
    total_moins_5ans BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_consultes,
        COUNT(*) FILTER (WHERE c.decision = 'PRISE_EN_CHARGE_COMMUNAUTAIRE')::BIGINT AS total_pris_en_charge,
        COUNT(*) FILTER (WHERE c.decision = 'REFERER_CS')::BIGINT AS total_referes,
        COUNT(*) FILTER (WHERE c.tdr_paludisme = 'POSITIF')::BIGINT AS total_tdr_positifs,
        COUNT(*) FILTER (WHERE c.diagnostic_possible ILIKE '%palu%')::BIGINT AS total_paludisme,
        COUNT(*) FILTER (WHERE c.diagnostic_possible ILIKE '%diarrh%')::BIGINT AS total_diarrhee,
        COUNT(*) FILTER (WHERE c.diagnostic_possible ILIKE '%pneumo%' OR c.diagnostic_possible ILIKE '%respiratoire%')::BIGINT AS total_infections_respiratoires,
        COUNT(*) FILTER (WHERE c.diagnostic_possible ILIKE '%malnut%')::BIGINT AS total_malnutrition,
        COUNT(*) FILTER (WHERE (c.age_unite = 'ANS' AND c.age_valeur < 5) OR c.age_unite IN ('MOIS', 'JOURS'))::BIGINT AS total_moins_5ans
    FROM public.consultations_communautaires c
    WHERE (c.ascq_id = p_ascq_id OR p_ascq_id IS NULL)
      AND c.date_consultation BETWEEN p_date_debut AND p_date_fin;
END;
$$;
