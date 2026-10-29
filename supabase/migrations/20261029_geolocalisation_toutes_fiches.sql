-- =====================================================================
-- ASCQ BÉNIN - Migration Géolocalisation GPS Haute Précision sur toutes les fiches
-- Notification & Activités : RC & ASCQ
-- =====================================================================

-- 1. Ajout des colonnes GPS sur registre_alertes_rumeurs
ALTER TABLE public.registre_alertes_rumeurs 
ADD COLUMN IF NOT EXISTS gps_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_longitude DOUBLE PRECISION;

-- 2. Ajout des colonnes GPS sur references_communautaires
ALTER TABLE public.references_communautaires 
ADD COLUMN IF NOT EXISTS gps_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_longitude DOUBLE PRECISION;

-- 3. Ajout des colonnes GPS sur consultations_communautaires
ALTER TABLE public.consultations_communautaires 
ADD COLUMN IF NOT EXISTS gps_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_longitude DOUBLE PRECISION;

-- 4. Ajout des colonnes GPS sur fiches_activites_hebdo_relais
ALTER TABLE public.fiches_activites_hebdo_relais 
ADD COLUMN IF NOT EXISTS gps_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_longitude DOUBLE PRECISION;

-- 5. Mise à jour de la fonction RPC creer_ligne_registre pour intégrer les coordonnées GPS
CREATE OR REPLACE FUNCTION public.creer_ligne_registre(
    p_date_survenue DATE,
    p_departement_id UUID,
    p_commune_id UUID,
    p_arrondissement_id UUID,
    p_village_nom TEXT,
    p_lieu_detection TEXT,
    p_type_code INTEGER,
    p_autre_precision TEXT,
    p_nb_personnes_touchees INTEGER,
    p_nb_personnes_decedees INTEGER,
    p_mesure_prise TEXT,
    p_gps_latitude DOUBLE PRECISION DEFAULT NULL,
    p_gps_longitude DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_annee INTEGER;
    v_seq INTEGER;
    v_numero TEXT;
    v_new_id UUID;
BEGIN
    v_user_id := auth.uid();
    v_annee := EXTRACT(YEAR FROM p_date_survenue);

    -- Génération du numéro de séquence annuel
    SELECT COALESCE(MAX(sequence_annuelle), 0) + 1 INTO v_seq
    FROM public.registre_alertes_rumeurs
    WHERE annee = v_annee;

    v_numero := 'REG-' || v_annee || '-' || LPAD(v_seq::TEXT, 4, '0');

    INSERT INTO public.registre_alertes_rumeurs (
        numero_registre,
        annee,
        sequence_annuelle,
        date_survenue,
        notificateur_id,
        departement_id,
        commune_id,
        arrondissement_id,
        village_nom,
        lieu_detection,
        type_code,
        autre_precision,
        nb_personnes_touchees,
        nb_personnes_decedees,
        mesure_prise,
        gps_latitude,
        gps_longitude,
        statut
    ) VALUES (
        v_numero,
        v_annee,
        v_seq,
        p_date_survenue,
        v_user_id,
        p_departement_id,
        p_commune_id,
        p_arrondissement_id,
        p_village_nom,
        p_lieu_detection,
        p_type_code,
        p_autre_precision,
        p_nb_personnes_touchees,
        p_nb_personnes_decedees,
        p_mesure_prise,
        p_gps_latitude,
        p_gps_longitude,
        'ENREGISTREE'
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'id', v_new_id,
        'numero_registre', v_numero,
        'statut', 'ENREGISTREE'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.creer_ligne_registre TO authenticated;
