-- ==============================================================================
-- SANTÉCOM BÉNIN - SYNCHRONISATION NOMINATIVE DES FICHES DE DÉCÈS
-- À coller et exécuter dans le SQL Editor de Supabase
-- ==============================================================================

-- 1. Synchronisation générale de tous les décès depuis la table miroir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deces_identite_privee') THEN
        UPDATE public.deces_communautaires d
        SET nom_defunt = COALESCE(NULLIF(d.nom_defunt, ''), p.nom_defunt),
            prenoms_defunt = COALESCE(NULLIF(d.prenoms_defunt, ''), p.prenoms_defunt),
            defunt_nom_prenom = COALESCE(NULLIF(d.defunt_nom_prenom, ''), TRIM(COALESCE(p.nom_defunt, '') || ' ' || COALESCE(p.prenoms_defunt, ''))),
            nom_parent = COALESCE(NULLIF(d.nom_parent, ''), p.nom_parent),
            telephone_parent = COALESCE(NULLIF(d.telephone_parent, ''), p.telephone_parent),
            adresse_domicile = COALESCE(NULLIF(d.adresse_domicile, ''), p.adresse_domicile),
            date_naissance = COALESCE(d.date_naissance, p.date_naissance)
        FROM public.deces_identite_privee p
        WHERE p.deces_id = d.id;
    END IF;
END $$;

-- 2. Garantir les informations complètes pour la fiche DEC-2026-000004
UPDATE public.deces_communautaires
SET nom_defunt = 'HOUNTO',
    prenoms_defunt = 'KOUGBE',
    defunt_nom_prenom = 'HOUNTO KOUGBE',
    nom_parent = 'GOVI Basile',
    adresse_domicile = 'YETCHENOUHOUE',
    sexe = 'M',
    age_valeur = 82,
    age_unite = 'ans'
WHERE numero_deces = 'DEC-2026-000004';

SELECT 'SYNCHRONISATION TERMINÉE : IDENTITÉS DES DÉFUNTS MISES À JOUR' AS statut;
