-- ==============================================================================
-- SANTÉCOM BÉNIN - ASSOUPLISSEMENT CONTRAINTE ÂGE & SYNCHRONISATION DÉCÈS
-- À coller et exécuter dans le SQL Editor de Supabase
-- ==============================================================================

-- 1. Assouplissement de la contrainte pour accepter 'ANS', 'ans', 'MOIS', 'mois', 'JOURS', 'jours'
ALTER TABLE public.deces_communautaires DROP CONSTRAINT IF EXISTS deces_communautaires_age_unite_check;
ALTER TABLE public.deces_communautaires ADD CONSTRAINT deces_communautaires_age_unite_check 
    CHECK (UPPER(age_unite) IN ('JOURS', 'MOIS', 'ANS'));

ALTER TABLE public.alertes_communautaires DROP CONSTRAINT IF EXISTS alertes_communautaires_age_unite_check;
ALTER TABLE public.alertes_communautaires ADD CONSTRAINT alertes_communautaires_age_unite_check 
    CHECK (UPPER(age_unite) IN ('JOURS', 'MOIS', 'ANS'));

-- 2. Normalisation en majuscules des unités existantes
UPDATE public.deces_communautaires 
SET age_unite = UPPER(age_unite) 
WHERE age_unite IS NOT NULL;

-- 3. Synchronisation générale des identités depuis la table miroir
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

-- 4. Mise à jour propre pour DEC-2026-000004
UPDATE public.deces_communautaires
SET nom_defunt = 'HOUNTO',
    prenoms_defunt = 'KOUGBE',
    defunt_nom_prenom = 'HOUNTO KOUGBE',
    nom_parent = 'GOVI Basile',
    adresse_domicile = 'YETCHENOUHOUE',
    sexe = 'M',
    age_valeur = 82,
    age_unite = 'ANS'
WHERE numero_deces = 'DEC-2026-000004';

SELECT 'SYNCHRONISATION ET CONTRAINTE MISES À JOUR AVEC SUCCÈS' AS statut;
