-- =====================================================================
-- ASCQ BÉNIN - VALIDATION OFFICIELLE DES PLANNINGS RC PAR L'ASCQ
-- Mise à jour : 2026-11-17
-- Permet à l'ASCQ de visualiser, apposer sa signature tactile et valider
-- le planning hebdomadaire de chaque Relais Communautaire (RC).
-- Le planning validé devient immédiatement accessible et téléchargeable par le RC.
-- =====================================================================

-- 1. AJOUT DES COLONNES DE SIGNATURE ET VALIDATION SUR plannings_hebdo_relais
ALTER TABLE public.plannings_hebdo_relais 
    ADD COLUMN IF NOT EXISTS signature_rc TEXT,
    ADD COLUMN IF NOT EXISTS date_soumission_rc TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS signature_ascq TEXT,
    ADD COLUMN IF NOT EXISTS date_validation_ascq TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS observations_ascq TEXT,
    ADD COLUMN IF NOT EXISTS valide_par_nom TEXT,
    ADD COLUMN IF NOT EXISTS lu_et_approuve_ascq BOOLEAN DEFAULT FALSE;

-- 2. ÉLARGISSEMENT DE LA CONTRAINTE DE STATUT
ALTER TABLE public.plannings_hebdo_relais DROP CONSTRAINT IF EXISTS plannings_hebdo_relais_statut_check;
ALTER TABLE public.plannings_hebdo_relais ADD CONSTRAINT plannings_hebdo_relais_statut_check 
    CHECK (statut IN ('BROUILLON', 'SOUMIS', 'EN_ATTENTE', 'VALIDE', 'VALIDE_ASCQ', 'REJETE', 'TRANSMIS'));

-- 3. POLITIQUES RLS RENFORCÉES POUR LECTURE ET VALIDATION PAR L'ASCQ
DROP POLICY IF EXISTS "Lecture plannings RC pour tous authentifies" ON public.plannings_hebdo_relais;
CREATE POLICY "Lecture plannings RC pour tous authentifies" ON public.plannings_hebdo_relais
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Mise a jour plannings RC" ON public.plannings_hebdo_relais;
CREATE POLICY "Mise a jour plannings RC" ON public.plannings_hebdo_relais
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. FONCTION RPC : valider_planning_hebdo_rc_par_ascq
CREATE OR REPLACE FUNCTION public.valider_planning_hebdo_rc_par_ascq(
    p_planning_id UUID,
    p_approuve BOOLEAN,
    p_signature_ascq TEXT DEFAULT NULL,
    p_observations_ascq TEXT DEFAULT NULL,
    p_valide_par_nom TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_ascq_id UUID := auth.uid();
BEGIN
    UPDATE public.plannings_hebdo_relais
    SET
        lu_et_approuve_ascq = p_approuve,
        statut = CASE WHEN p_approuve THEN 'VALIDE_ASCQ' ELSE 'REJETE' END,
        signature_ascq = CASE WHEN p_approuve THEN COALESCE(p_signature_ascq, signature_ascq) ELSE NULL END,
        observations_ascq = p_observations_ascq,
        valide_par_nom = COALESCE(p_valide_par_nom, valide_par_nom),
        date_validation_ascq = CASE WHEN p_approuve THEN NOW() ELSE NULL END,
        ascq_id = COALESCE(v_ascq_id, ascq_id),
        updated_at = NOW()
    WHERE id = p_planning_id;

    RETURN jsonb_build_object(
        'success', true,
        'planning_id', p_planning_id,
        'approuve', p_approuve,
        'statut', CASE WHEN p_approuve THEN 'VALIDE_ASCQ' ELSE 'REJETE' END,
        'message', CASE WHEN p_approuve 
            THEN 'Planning hebdomadaire du Relais validé et signé avec succès par l''ASCQ.' 
            ELSE 'Planning hebdomadaire du Relais rejeté avec observations.' END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.valider_planning_hebdo_rc_par_ascq(UUID, BOOLEAN, TEXT, TEXT, TEXT) TO authenticated, anon;
