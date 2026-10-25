-- =====================================================================
-- ASCQ BÉNIN - Migration Mise à Jour Complète (Phase 2 & Phase 3)
-- Noms en MAJUSCULES SANS ACCENTS + Résolution récursion RLS + Fonctions RPC
-- Date : 25/10/2026
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. TABLES DU RÉFÉRENTIEL (MAJUSCULES SANS ACCENTS)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.departements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    nom TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.zones_sanitaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departement_id UUID NOT NULL REFERENCES public.departements(id) ON DELETE RESTRICT,
    nom TEXT NOT NULL,
    communes_couvertes TEXT,
    statut_verification TEXT NOT NULL DEFAULT 'A CONFIRMER',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_zones_sanitaires UNIQUE (departement_id, nom)
);

CREATE TABLE IF NOT EXISTS public.communes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departement_id UUID NOT NULL REFERENCES public.departements(id) ON DELETE RESTRICT,
    zone_sanitaire_id UUID REFERENCES public.zones_sanitaires(id) ON DELETE RESTRICT,
    nom TEXT NOT NULL,
    alias TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_communes UNIQUE (departement_id, nom)
);

CREATE TABLE IF NOT EXISTS public.arrondissements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commune_id UUID NOT NULL REFERENCES public.communes(id) ON DELETE RESTRICT,
    zone_sanitaire_id UUID REFERENCES public.zones_sanitaires(id) ON DELETE RESTRICT,
    nom TEXT NOT NULL,
    statut_arrondissement TEXT NOT NULL DEFAULT 'A CONFIRMER',
    statut_zone_sanitaire TEXT NOT NULL DEFAULT 'A CONFIRMER',
    alias TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_arrondissements UNIQUE (commune_id, nom)
);

CREATE TABLE IF NOT EXISTS public.villages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arrondissement_id UUID NOT NULL REFERENCES public.arrondissements(id) ON DELETE RESTRICT,
    nom TEXT NOT NULL,
    code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_villages UNIQUE (arrondissement_id, nom)
);

CREATE TABLE IF NOT EXISTS public.structures_sante (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commune_id UUID NOT NULL REFERENCES public.communes(id) ON DELETE RESTRICT,
    arrondissement_id UUID REFERENCES public.arrondissements(id) ON DELETE RESTRICT,
    nom TEXT NOT NULL,
    type_structure TEXT NOT NULL DEFAULT 'CSA',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_structures UNIQUE (commune_id, nom)
);

-- ---------------------------------------------------------------------
-- 2. UTILISATEURS, PROFILS ET DROITS D'ACCÈS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.utilisateurs (
    id UUID PRIMARY KEY,
    telephone TEXT UNIQUE NOT NULL,
    nom TEXT NOT NULL,
    prenoms TEXT NOT NULL,
    poste TEXT NOT NULL CHECK (poste IN ('ASCQ', 'RC', 'PF_CCLS_TP', 'RCSE', 'CCD_CNLS_TP', 'AUTRE')),
    poste_autre TEXT,
    role_technique TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (role_technique IN ('PUBLIC', 'RELAIS', 'ASCQ_OPERATEUR', 'GESTIONNAIRE_PERIMETRE', 'ADMINISTRATEUR', 'SUPER_ADMIN')),
    statut_compte TEXT NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut_compte IN ('EN_ATTENTE', 'VALIDE', 'SUSPENDU', 'REJETE')),
    departement_id UUID REFERENCES public.departements(id),
    zone_sanitaire_id UUID REFERENCES public.zones_sanitaires(id),
    commune_id UUID REFERENCES public.communes(id),
    arrondissement_id UUID REFERENCES public.arrondissements(id),
    second_arrondissement_id UUID REFERENCES public.arrondissements(id),
    structure_sante_id UUID REFERENCES public.structures_sante(id),
    date_validation TIMESTAMPTZ,
    valide_par UUID REFERENCES public.utilisateurs(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ascq_profils (
    id UUID PRIMARY KEY REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    source_financement TEXT CHECK (source_financement IN ('LLF', 'LLF_FADEC', 'SRHR', 'AUTRE')),
    source_financement_autre TEXT,
    nombre_rc INTEGER NOT NULL DEFAULT 0,
    afficher_annuaire_public BOOLEAN NOT NULL DEFAULT FALSE,
    cumul_deux_arrondissements BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ascq_profil_prive (
    id UUID PRIMARY KEY REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    npi TEXT,
    ifu TEXT,
    document_identite_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.relais_communautaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ascq_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    prenoms TEXT NOT NULL,
    telephone TEXT NOT NULL,
    village_id UUID REFERENCES public.villages(id),
    village_nom TEXT,
    grappe INTEGER NOT NULL,
    nom_grappe TEXT,
    code_acces_temporaire TEXT NOT NULL,
    code_temporaire_utilise BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_rc_ascq_tel UNIQUE (ascq_id, telephone)
);

CREATE TABLE IF NOT EXISTS public.conseils_sante (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre TEXT NOT NULL,
    contenu TEXT NOT NULL,
    categorie TEXT NOT NULL DEFAULT 'SANTE COMMUNAUTAIRE',
    auteur TEXT NOT NULL DEFAULT 'COORDINATION ASCQ',
    est_publie BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suggestions_publiques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_message TEXT NOT NULL CHECK (type_message IN ('SUGGESTION', 'RECOMMANDATION', 'RECLAMATION')),
    objet TEXT NOT NULL,
    message TEXT NOT NULL,
    nom TEXT,
    telephone TEXT,
    departement_id UUID REFERENCES public.departements(id),
    commune_id UUID REFERENCES public.communes(id),
    statut TEXT NOT NULL DEFAULT 'NOUVEAU',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 3. FONCTIONS HELPER ET ANTI-RÉCURSION RLS (SECURITY DEFINER)
-- ---------------------------------------------------------------------

-- A. Fonction pour vérifier si un utilisateur est admin SANS récursion
CREATE OR REPLACE FUNCTION public.est_administrateur()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = auth.uid() AND role_technique IN ('ADMINISTRATEUR', 'SUPER_ADMIN')
  );
$$;

-- B. Fonction RPC pour l'inscription d'un agent (bypasse les soucis de session)
CREATE OR REPLACE FUNCTION public.inscrire_nouvel_agent(
    p_id UUID,
    p_telephone TEXT,
    p_nom TEXT,
    p_prenoms TEXT,
    p_poste TEXT,
    p_poste_autre TEXT,
    p_departement_id UUID,
    p_zone_sanitaire_id UUID,
    p_commune_id UUID,
    p_arrondissement_id UUID,
    p_second_arrondissement_id UUID,
    p_source_financement TEXT,
    p_source_financement_autre TEXT,
    p_nombre_rc INTEGER,
    p_afficher_annuaire BOOLEAN,
    p_cumul_deux_arrondissements BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.utilisateurs (
        id, telephone, nom, prenoms, poste, poste_autre,
        role_technique, statut_compte,
        departement_id, zone_sanitaire_id, commune_id, arrondissement_id, second_arrondissement_id
    ) VALUES (
        p_id, p_telephone, UPPER(TRIM(p_nom)), TRIM(p_prenoms), p_poste, p_poste_autre,
        CASE WHEN p_poste = 'ASCQ' THEN 'ASCQ_OPERATEUR' ELSE 'PUBLIC' END,
        'EN_ATTENTE',
        p_departement_id, p_zone_sanitaire_id, p_commune_id, p_arrondissement_id, p_second_arrondissement_id
    )
    ON CONFLICT (id) DO UPDATE SET
        telephone = EXCLUDED.telephone,
        nom = EXCLUDED.nom,
        prenoms = EXCLUDED.prenoms,
        statut_compte = 'EN_ATTENTE';

    IF p_poste = 'ASCQ' THEN
        INSERT INTO public.ascq_profils (
            id, source_financement, source_financement_autre,
            nombre_rc, afficher_annuaire_public, cumul_deux_arrondissements
        ) VALUES (
            p_id, p_source_financement, p_source_financement_autre,
            COALESCE(p_nombre_rc, 0), COALESCE(p_afficher_annuaire, true), COALESCE(p_cumul_deux_arrondissements, false)
        )
        ON CONFLICT (id) DO UPDATE SET
            source_financement = EXCLUDED.source_financement,
            nombre_rc = EXCLUDED.nombre_rc,
            afficher_annuaire_public = EXCLUDED.afficher_annuaire_public;
    END IF;

    RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;

-- C. Fonction RPC pour rechercher dans l'annuaire (ultra-rapide et hermétique)
CREATE OR REPLACE FUNCTION public.rechercher_annuaire_ascq(
    p_departement_id UUID DEFAULT NULL,
    p_commune_id UUID DEFAULT NULL,
    p_arrondissement_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    nom TEXT,
    prenoms TEXT,
    telephone TEXT,
    departement_nom TEXT,
    commune_nom TEXT,
    arrondissement_nom TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id, u.nom, u.prenoms, u.telephone,
    d.nom AS departement_nom,
    c.nom AS commune_nom,
    a.nom AS arrondissement_nom
  FROM public.utilisateurs u
  JOIN public.ascq_profils p ON u.id = p.id
  LEFT JOIN public.departements d ON u.departement_id = d.id
  LEFT JOIN public.communes c ON u.commune_id = c.id
  LEFT JOIN public.arrondissements a ON u.arrondissement_id = a.id
  WHERE u.statut_compte = 'VALIDE'
    AND u.role_technique = 'ASCQ_OPERATEUR'
    AND p.afficher_annuaire_public = true
    AND (p_departement_id IS NULL OR u.departement_id = p_departement_id)
    AND (p_commune_id IS NULL OR u.commune_id = p_commune_id)
    AND (p_arrondissement_id IS NULL OR u.arrondissement_id = p_arrondissement_id)
  ORDER BY u.nom, u.prenoms;
$$;

-- D. Fonction RPC pour récupérer son profil à la connexion
CREATE OR REPLACE FUNCTION public.obtenir_mon_profil()
RETURNS TABLE (
    id UUID,
    telephone TEXT,
    nom TEXT,
    prenoms TEXT,
    poste TEXT,
    role_technique TEXT,
    statut_compte TEXT,
    commune_nom TEXT,
    arrondissement_nom TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id, u.telephone, u.nom, u.prenoms, u.poste, u.role_technique, u.statut_compte,
    c.nom AS commune_nom,
    a.nom AS arrondissement_nom
  FROM public.utilisateurs u
  LEFT JOIN public.communes c ON u.commune_id = c.id
  LEFT JOIN public.arrondissements a ON u.arrondissement_id = a.id
  WHERE u.id = auth.uid();
$$;

-- E. Fonction RPC pour lister les comptes pour l'écran de validation
CREATE OR REPLACE FUNCTION public.lister_comptes_admin()
RETURNS TABLE (
    id UUID,
    telephone TEXT,
    nom TEXT,
    prenoms TEXT,
    poste TEXT,
    role_technique TEXT,
    statut_compte TEXT,
    created_at TIMESTAMPTZ,
    departement_nom TEXT,
    commune_nom TEXT,
    arrondissement_nom TEXT,
    source_financement TEXT,
    nombre_rc INTEGER,
    afficher_annuaire_public BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id, u.telephone, u.nom, u.prenoms, u.poste, u.role_technique, u.statut_compte, u.created_at,
    d.nom AS departement_nom,
    c.nom AS commune_nom,
    a.nom AS arrondissement_nom,
    p.source_financement,
    p.nombre_rc,
    p.afficher_annuaire_public
  FROM public.utilisateurs u
  LEFT JOIN public.departements d ON u.departement_id = d.id
  LEFT JOIN public.communes c ON u.commune_id = c.id
  LEFT JOIN public.arrondissements a ON u.arrondissement_id = a.id
  LEFT JOIN public.ascq_profils p ON u.id = p.id
  ORDER BY u.created_at DESC;
$$;

-- F. Fonction RPC pour valider ou rejeter un compte
CREATE OR REPLACE FUNCTION public.changer_statut_compte(p_id UUID, p_nouveau_statut TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.utilisateurs
  SET statut_compte = p_nouveau_statut,
      role_technique = CASE 
        WHEN p_nouveau_statut = 'VALIDE' AND poste = 'ASCQ' THEN 'ASCQ_OPERATEUR'
        WHEN p_nouveau_statut = 'VALIDE' AND poste != 'ASCQ' THEN 'PUBLIC'
        ELSE role_technique
      END,
      date_validation = CASE WHEN p_nouveau_statut = 'VALIDE' THEN NOW() ELSE date_validation END
  WHERE id = p_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.est_administrateur TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inscrire_nouvel_agent TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rechercher_annuaire_ascq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obtenir_mon_profil TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lister_comptes_admin TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.changer_statut_compte TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. POLITIQUES RLS SANS RÉCURSION
-- ---------------------------------------------------------------------

ALTER TABLE public.departements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones_sanitaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrondissements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structures_sante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ascq_profils ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ascq_profil_prive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relais_communautaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conseils_sante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions_publiques ENABLE ROW LEVEL SECURITY;

-- Nettoyer les anciennes politiques
DROP POLICY IF EXISTS "Lecture ouverte departements" ON public.departements;
DROP POLICY IF EXISTS "Lecture ouverte zones_sanitaires" ON public.zones_sanitaires;
DROP POLICY IF EXISTS "Lecture ouverte communes" ON public.communes;
DROP POLICY IF EXISTS "Lecture ouverte arrondissements" ON public.arrondissements;
DROP POLICY IF EXISTS "Lecture ouverte villages" ON public.villages;
DROP POLICY IF EXISTS "Lecture ouverte structures_sante" ON public.structures_sante;
DROP POLICY IF EXISTS "Lecture ouverte conseils_sante" ON public.conseils_sante;
DROP POLICY IF EXISTS "Envoi public suggestion" ON public.suggestions_publiques;
DROP POLICY IF EXISTS "Lecture utilisateurs securisee" ON public.utilisateurs;
DROP POLICY IF EXISTS "Inscription libre utilisateurs" ON public.utilisateurs;
DROP POLICY IF EXISTS "Mise a jour utilisateurs" ON public.utilisateurs;
DROP POLICY IF EXISTS "Lecture profil ASCQ" ON public.ascq_profils;
DROP POLICY IF EXISTS "Gestion profil ASCQ" ON public.ascq_profils;
DROP POLICY IF EXISTS "Acces profil prive" ON public.ascq_profil_prive;

CREATE POLICY "Lecture ouverte departements" ON public.departements FOR SELECT USING (true);
CREATE POLICY "Lecture ouverte zones_sanitaires" ON public.zones_sanitaires FOR SELECT USING (true);
CREATE POLICY "Lecture ouverte communes" ON public.communes FOR SELECT USING (true);
CREATE POLICY "Lecture ouverte arrondissements" ON public.arrondissements FOR SELECT USING (true);
CREATE POLICY "Lecture ouverte villages" ON public.villages FOR SELECT USING (true);
CREATE POLICY "Lecture ouverte structures_sante" ON public.structures_sante FOR SELECT USING (true);
CREATE POLICY "Lecture ouverte conseils_sante" ON public.conseils_sante FOR SELECT USING (true);
CREATE POLICY "Envoi public suggestion" ON public.suggestions_publiques FOR INSERT WITH CHECK (true);

-- Politiques Utilisateurs sans récursion
CREATE POLICY "Lecture utilisateurs securisee" ON public.utilisateurs
    FOR SELECT USING (
        auth.uid() = id OR
        statut_compte = 'VALIDE' OR
        public.est_administrateur()
    );

CREATE POLICY "Inscription libre utilisateurs" ON public.utilisateurs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Mise a jour utilisateurs" ON public.utilisateurs
    FOR UPDATE USING (
        auth.uid() = id OR public.est_administrateur()
    );

CREATE POLICY "Lecture profil ASCQ" ON public.ascq_profils
    FOR SELECT USING (true);

CREATE POLICY "Gestion profil ASCQ" ON public.ascq_profils
    FOR ALL USING (auth.uid() = id OR public.est_administrateur());

CREATE POLICY "Acces profil prive" ON public.ascq_profil_prive
    FOR ALL USING (auth.uid() = id);

-- ---------------------------------------------------------------------
-- 5. INSERTION RÉFÉRENTIEL (MAJUSCULES SANS ACCENTS)
-- ---------------------------------------------------------------------

-- 12 Départements sans accents
INSERT INTO public.departements (code, nom) VALUES
('ALI', 'ALIBORI'),
('ATA', 'ATACORA'),
('ATL', 'ATLANTIQUE'),
('BOR', 'BORGOU'),
('COL', 'COLLINES'),
('COU', 'COUFFO'),
('DON', 'DONGA'),
('LIT', 'LITTORAL'),
('MON', 'MONO'),
('OUE', 'OUEME'),
('PLA', 'PLATEAU'),
('ZOU', 'ZOU')
ON CONFLICT (nom) DO UPDATE SET nom = EXCLUDED.nom;

-- 34 Zones Sanitaires sans accents
INSERT INTO public.zones_sanitaires (departement_id, nom, communes_couvertes, statut_verification) VALUES
((SELECT d.id FROM public.departements d WHERE d.nom = 'ALIBORI' LIMIT 1), 'BANIKOARA', 'BANIKOARA', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ALIBORI' LIMIT 1), 'KANDI-GOGOUNOU-SEGBANA', 'KANDI, GOGOUNOU, SEGBANA', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ALIBORI' LIMIT 1), 'MALANVILLE-KARIMAMA', 'MALANVILLE, KARIMAMA', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATACORA' LIMIT 1), 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA', 'NATITINGOU, BOUKOUMBE, TOUCOUNTOUNA', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATACORA' LIMIT 1), 'TANGUIETA-COBLY-MATERI', 'TANGUIETA, COBLY, MATERI', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATACORA' LIMIT 1), 'KOUANDE-PEHUNCO-KEROU', 'KOUANDE, PEHUNCO, KEROU', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATLANTIQUE' LIMIT 1), 'ABOMEY-CALAVI-SO-AVA', 'ABOMEY-CALAVI, SO-AVA', 'CONFIRME (DOCUMENT)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATLANTIQUE' LIMIT 1), 'ALLADA-ZE-TOFFO', 'ALLADA, ZE, TOFFO', 'CONFIRME (DOCUMENT)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATLANTIQUE' LIMIT 1), 'OUIDAH-KPOMASSE-TORI-BOSSITO', 'OUIDAH, KPOMASSE, TORI-BOSSITO', 'CONFIRME (DOCUMENT)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'BORGOU' LIMIT 1), 'PARAKOU-N&APOS;DALI', 'PARAKOU, N&APOS;DALI', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'BORGOU' LIMIT 1), 'TCHAOUROU', 'TCHAOUROU', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'BORGOU' LIMIT 1), 'NIKKI-KALALE-PERERE', 'NIKKI, KALALE, PERERE', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'BORGOU' LIMIT 1), 'BEMBEREKE-SINENDE', 'BEMBEREKE, SINENDE', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COLLINES' LIMIT 1), 'DASSA-GLAZOUE', 'DASSA-ZOUME, GLAZOUE', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COLLINES' LIMIT 1), 'SAVALOU-BANTE', 'SAVALOU, BANTE', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COLLINES' LIMIT 1), 'SAVE-OUESSE', 'SAVE, OUESSE', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COUFFO' LIMIT 1), 'APLAHOUE-DJAKOTOMEY-DOGBO', 'APLAHOUE, DJAKOTOMEY, DOGBO-TOTA', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COUFFO' LIMIT 1), 'KLOUEKANME-TOVIKLIN-LALO', 'KLOUEKANME, TOVIKLIN, LALO', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'DONGA' LIMIT 1), 'DJOUGOU-OUAKE-COPARGO', 'DJOUGOU, OUAKE, COPARGO', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'DONGA' LIMIT 1), 'BASSILA', 'BASSILA', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'LITTORAL' LIMIT 1), 'COTONOU 1-4', 'COTONOU (ARRONDISSEMENTS A REPARTIR)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'LITTORAL' LIMIT 1), 'COTONOU 2-3', 'COTONOU (ARRONDISSEMENTS A REPARTIR)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'LITTORAL' LIMIT 1), 'COTONOU 5', 'COTONOU (ARRONDISSEMENTS A REPARTIR)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'LITTORAL' LIMIT 1), 'COTONOU 6', 'COTONOU (ARRONDISSEMENTS A REPARTIR)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'MONO' LIMIT 1), 'LOKOSSA-ATHIEME', 'LOKOSSA, ATHIEME', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'MONO' LIMIT 1), 'COME-GRAND-POPO-BOPA-HOUEYOGBE', 'COME, GRAND-POPO, BOPA, HOUEYOGBE', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'OUEME' LIMIT 1), 'PORTO-NOVO-AGUEGUES-SEME-PODJI', 'PORTO-NOVO, AGUEGUES, SEME-KPODJI', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'OUEME' LIMIT 1), 'ADJARRA-AVRANKOU-AKPRO-MISSERETE', 'ADJARRA, AVRANKOU, AKPRO-MISSERETE', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'OUEME' LIMIT 1), 'ADJOHOUN-BONOU-DANGBO', 'ADJOHOUN, BONOU, DANGBO', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'PLATEAU' LIMIT 1), 'POBE-ADJA-OUERE-KETOU', 'POBE, ADJA-OUERE, KETOU', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'PLATEAU' LIMIT 1), 'SAKETE-IFANGNI', 'SAKETE, IFANGNI', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ZOU' LIMIT 1), 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)', 'DJIDJA, ABOMEY, AGBANGNIZOUN', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ZOU' LIMIT 1), 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)', 'ZOGBODOMEY, BOHICON, ZA-KPOTA', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)'),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ZOU' LIMIT 1), 'COVE-ZAGNANADO-OUINHI (COZO)', 'COVE, ZAGNANADO, OUINHI', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)')
ON CONFLICT (departement_id, nom) DO UPDATE SET 
nom = EXCLUDED.nom,
communes_couvertes = EXCLUDED.communes_couvertes,
statut_verification = EXCLUDED.statut_verification;

-- 77 Communes sans accents
INSERT INTO public.communes (departement_id, zone_sanitaire_id, nom, alias) VALUES
((SELECT d.id FROM public.departements d WHERE d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BANIKOARA' LIMIT 1), 'BANIKOARA', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'GOGOUNOU', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'KANDI', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'MALANVILLE-KARIMAMA' LIMIT 1), 'KARIMAMA', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'MALANVILLE-KARIMAMA' LIMIT 1), 'MALANVILLE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'SEGBANA', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'BOUKOUMBE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'COBLY', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'KEROU', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'KOUANDE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'MATERI', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'NATITINGOU', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'PEHUNCO', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'TANGUIETA', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'TOUCOUNTOUNA', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'ABOMEY-CALAVI', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'ALLADA', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'KPOMASSE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'OUIDAH', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'SO-AVA', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'TOFFO', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'TORI-BOSSITO', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'ZE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BEMBEREKE-SINENDE' LIMIT 1), 'BEMBEREKE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'KALALE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PARAKOU-N''DALI' LIMIT 1), 'N''DALI', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'NIKKI', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PARAKOU-N''DALI' LIMIT 1), 'PARAKOU', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'PERERE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BEMBEREKE-SINENDE' LIMIT 1), 'SINENDE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TCHAOUROU' LIMIT 1), 'TCHAOUROU', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'BANTE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'DASSA-ZOUME', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'GLAZOUE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'OUESSE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'SAVALOU', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'SAVE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BASSILA' LIMIT 1), 'BASSILA', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'COPARGO', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'DJOUGOU', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'OUAKE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'APLAHOUE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'DJAKOTOMEY', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'DOGBO-TOTA', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'KLOUEKANME', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'LALO', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'TOVIKLIN', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'LITTORAL' LIMIT 1), NULL, 'COTONOU', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'LOKOSSA-ATHIEME' LIMIT 1), 'ATHIEME', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'BOPA', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'COME', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'GRAND-POPO', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'HOUEYOGBE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'LOKOSSA-ATHIEME' LIMIT 1), 'LOKOSSA', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'ADJARRA', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'ADJOHOUN', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), 'AGUEGUES', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'AKPRO-MISSERETE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'AVRANKOU', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'BONOU', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'DANGBO', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), 'PORTO-NOVO', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), 'SEME-KPODJI', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'ADJA-OUERE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAKETE-IFANGNI' LIMIT 1), 'IFANGNI', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'KETOU', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'POBE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAKETE-IFANGNI' LIMIT 1), 'SAKETE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'ABOMEY', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'AGBANGNIZOUN', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'BOHICON', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'COVE', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'DJIDJA', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'OUINHI', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'ZA-KPOTA', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'ZAGNANADO', NULL),
((SELECT d.id FROM public.departements d WHERE d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'ZOGBODOMEY', NULL)
ON CONFLICT (departement_id, nom) DO UPDATE SET 
nom = EXCLUDED.nom,
zone_sanitaire_id = EXCLUDED.zone_sanitaire_id;

-- 546 Arrondissements sans accents
INSERT INTO public.arrondissements (commune_id, zone_sanitaire_id, nom, statut_arrondissement, statut_zone_sanitaire, alias) VALUES
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANIKOARA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BANIKOARA' LIMIT 1), 'BANIKOARA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANIKOARA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BANIKOARA' LIMIT 1), 'FOUNOUGO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANIKOARA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BANIKOARA' LIMIT 1), 'GOMPAROU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANIKOARA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BANIKOARA' LIMIT 1), 'GOUMORI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANIKOARA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BANIKOARA' LIMIT 1), 'KOKEY', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANIKOARA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BANIKOARA' LIMIT 1), 'KOKIBOROU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANIKOARA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BANIKOARA' LIMIT 1), 'OUNET', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANIKOARA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BANIKOARA' LIMIT 1), 'SOMPEREKOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANIKOARA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BANIKOARA' LIMIT 1), 'SOROKO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANIKOARA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BANIKOARA' LIMIT 1), 'TOURA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GOGOUNOU' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'BAGOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GOGOUNOU' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'GOGOUNOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GOGOUNOU' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'GOUNAROU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GOGOUNOU' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'OUARA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GOGOUNOU' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'SORI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GOGOUNOU' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'ZOUNGOU-PANTROSSI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KANDI' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'ANGARADEBOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KANDI' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'BENSEKOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KANDI' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'DONWARI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KANDI' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'KANDI I', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KANDI' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'KANDI II', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KANDI' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'KANDI III', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KANDI' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'KASSAKOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KANDI' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'SAAH', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KANDI' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'SAM', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KANDI' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'SONSORO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KARIMAMA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'MALANVILLE-KARIMAMA' LIMIT 1), 'BIRNI LAFIA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KARIMAMA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'MALANVILLE-KARIMAMA' LIMIT 1), 'BOGO-BOGO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KARIMAMA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'MALANVILLE-KARIMAMA' LIMIT 1), 'KARIMAMA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KARIMAMA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'MALANVILLE-KARIMAMA' LIMIT 1), 'KOMPA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KARIMAMA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'MALANVILLE-KARIMAMA' LIMIT 1), 'MONSEY', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'MALANVILLE' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'MALANVILLE-KARIMAMA' LIMIT 1), 'GAROU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'MALANVILLE' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'MALANVILLE-KARIMAMA' LIMIT 1), 'GUENE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'MALANVILLE' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'MALANVILLE-KARIMAMA' LIMIT 1), 'MALANVILLE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'MALANVILLE' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'MALANVILLE-KARIMAMA' LIMIT 1), 'MADECALI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'MALANVILLE' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'MALANVILLE-KARIMAMA' LIMIT 1), 'TOUMBOUTOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SEGBANA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'LIBANTE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SEGBANA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'LIBOUSSOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SEGBANA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'LOUGOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SEGBANA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'SEGBANA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SEGBANA' AND d.nom = 'ALIBORI' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KANDI-GOGOUNOU-SEGBANA' LIMIT 1), 'SOKOTINDJI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOUKOUMBE' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'BOUKOUMBE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOUKOUMBE' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'DIPOLI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOUKOUMBE' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'KORONTIERE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOUKOUMBE' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'KOSSOUCOINGOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOUKOUMBE' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'MANTA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOUKOUMBE' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'NATTA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOUKOUMBE' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'TABOTA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COBLY' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'COBLY', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COBLY' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'DATORI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COBLY' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'KOUNTORI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COBLY' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'TAPOGA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KEROU' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'BRIGNAMARO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KEROU' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'FIROU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KEROU' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'KEROU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KEROU' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'KOABAGOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KOUANDE' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'BIRNI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KOUANDE' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'CHABI-COUMA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KOUANDE' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'FO-TANCE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KOUANDE' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'GUILMARO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KOUANDE' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'KOUANDE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KOUANDE' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'OROUKAYO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'MATERI' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'DASSARI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'MATERI' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'GOUANDE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'MATERI' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'MATERI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'MATERI' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'NODI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'MATERI' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'TANTEGA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'MATERI' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'TCHIANHOUN-COSSI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NATITINGOU' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'KOTOPOUNGA', 'ORTHOGRAPHE A CONFIRMER', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NATITINGOU' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'KOUABA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NATITINGOU' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'KOUNDATA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NATITINGOU' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'NATITINGOU I', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NATITINGOU' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'NATITINGOU II', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NATITINGOU' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'NATITINGOU III', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NATITINGOU' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'NATITINGOU IV', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NATITINGOU' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'PERMA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NATITINGOU' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'TCHOUMI-TCHOUMI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PEHUNCO' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'GNEMASSON', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PEHUNCO' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'PEHUNCO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PEHUNCO' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KOUANDE-PEHUNCO-KEROU' LIMIT 1), 'TOBRE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TANGUIETA' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'COTIAKOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TANGUIETA' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'N''DAHONTA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TANGUIETA' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'TAIAKOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TANGUIETA' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'TANGUIETA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TANGUIETA' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TANGUIETA-COBLY-MATERI' LIMIT 1), 'TANONGOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOUCOUNTOUNA' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'KOUARFA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOUCOUNTOUNA' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'TAMPEGRE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOUCOUNTOUNA' AND d.nom = 'ATACORA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NATITINGOU-BOUKOUMBE-TOUCOUNTOUNA' LIMIT 1), 'TOUCOUNTOUNA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY-CALAVI' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'ABOMEY-CALAVI', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY-CALAVI' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'AKASSATO', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY-CALAVI' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'GODOMEY', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY-CALAVI' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'GLO-DJIGBE', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY-CALAVI' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'HEVIE', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY-CALAVI' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'KPANROUN', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY-CALAVI' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'OUEDO', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY-CALAVI' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'TOGBA', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY-CALAVI' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'ZINVIE', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ALLADA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'AGBANOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ALLADA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'AHOUANNONZOUN', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ALLADA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'ALLADA', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ALLADA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'ATTOGON', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ALLADA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'AVAKPA', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ALLADA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'AYOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ALLADA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'HINVI', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ALLADA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'LISSEGAZOUN', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ALLADA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'LON-AGONMEY', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ALLADA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'SEKOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ALLADA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'TOGOUDO', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ALLADA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'TOKPA-AVAGOUDO', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KPOMASSE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'AGANMALOME', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KPOMASSE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'AGBANTO', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KPOMASSE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'AGONKANME', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KPOMASSE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'DEDOME', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KPOMASSE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'DEKANME', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KPOMASSE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'KPOMASSE', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KPOMASSE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'SEGBEYA', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KPOMASSE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'SEGBOHOUE', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KPOMASSE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'TOKPA-DOME', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUIDAH' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'AVLEKETE', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUIDAH' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'DJEGBADJI', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUIDAH' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'GAKPE', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUIDAH' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'HOUAKPE-DAHO', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUIDAH' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'OUIDAH I', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUIDAH' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'OUIDAH II', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUIDAH' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'OUIDAH III', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUIDAH' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'OUIDAH IV', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUIDAH' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'PAHOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUIDAH' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'SAVI', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SO-AVA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'AHOMEY-LOKPO', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SO-AVA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'DEKANMEY', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SO-AVA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'GANVIE I', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SO-AVA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'GANVIE II', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SO-AVA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'HOUEDO-AGUEKON', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SO-AVA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'SO-AVA', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SO-AVA' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ABOMEY-CALAVI-SO-AVA' LIMIT 1), 'VEKKY', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOFFO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'AGUE', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOFFO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'COLLI-AGBAME', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOFFO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'COUSSI', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOFFO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'DAME', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOFFO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'DJANGLANME', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOFFO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'HOUEGBO', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOFFO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'KPOME', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOFFO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'SE', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOFFO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'SEHOUE', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOFFO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'TOFFO-AGUE', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TORI-BOSSITO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'AVAME', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TORI-BOSSITO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'AZOHOUE-ALIHO', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TORI-BOSSITO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'AZOHOUE-CADA', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TORI-BOSSITO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'TORI-BOSSITO', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TORI-BOSSITO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'TORI-CADA', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TORI-BOSSITO' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'OUIDAH-KPOMASSE-TORI-BOSSITO' LIMIT 1), 'TORI-GARE', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'ADJAN', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'DAWE', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'DJIGBE', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'DODJI-BATA', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'HEKANME', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'KOUNDOKPOE', 'ORTHOGRAPHE A CONFIRMER', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'SEDJE-DENOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'SEDJE-HOUEGOUDO', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'TANGBO-DJEVIE', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'YOKPO', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZE' AND d.nom = 'ATLANTIQUE' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ALLADA-ZE-TOFFO' LIMIT 1), 'ZE', 'VERIFIE (SOURCE WIKIPEDIA)', 'CONFIRME (DOCUMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BEMBEREKE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BEMBEREKE-SINENDE' LIMIT 1), 'BEMBEREKE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BEMBEREKE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BEMBEREKE-SINENDE' LIMIT 1), 'BEROUBOUAY', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BEMBEREKE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BEMBEREKE-SINENDE' LIMIT 1), 'BOUANRI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BEMBEREKE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BEMBEREKE-SINENDE' LIMIT 1), 'GAMIA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BEMBEREKE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BEMBEREKE-SINENDE' LIMIT 1), 'INA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KALALE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'BASSO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KALALE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'BOUKA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KALALE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'DERASSI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KALALE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'DUNKASSA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KALALE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'KALALE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KALALE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'PEONGA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'N''DALI' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PARAKOU-N''DALI' LIMIT 1), 'BORI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'N''DALI' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PARAKOU-N''DALI' LIMIT 1), 'GBEGOUROU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'N''DALI' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PARAKOU-N''DALI' LIMIT 1), 'N''DALI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'N''DALI' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PARAKOU-N''DALI' LIMIT 1), 'OUENOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'N''DALI' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PARAKOU-N''DALI' LIMIT 1), 'SIRAROU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NIKKI' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'BIRO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NIKKI' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'GNONKOURAKALI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NIKKI' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'NIKKI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NIKKI' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'OUENOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NIKKI' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'SEREKALE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NIKKI' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'SUYA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'NIKKI' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'TASSO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PARAKOU' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PARAKOU-N''DALI' LIMIT 1), '1ER ARRONDISSEMENT DE PARAKOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PARAKOU' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PARAKOU-N''DALI' LIMIT 1), '2E ARRONDISSEMENT DE PARAKOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PARAKOU' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PARAKOU-N''DALI' LIMIT 1), '3E ARRONDISSEMENT DE PARAKOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PERERE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'GNINSY', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PERERE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'GUINAGOUROU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PERERE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'KPANE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PERERE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'PEBIE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PERERE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'PERERE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PERERE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'NIKKI-KALALE-PERERE' LIMIT 1), 'SONTOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SINENDE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BEMBEREKE-SINENDE' LIMIT 1), 'FO-BOURE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SINENDE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BEMBEREKE-SINENDE' LIMIT 1), 'SEKERE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SINENDE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BEMBEREKE-SINENDE' LIMIT 1), 'SIKKI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SINENDE' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BEMBEREKE-SINENDE' LIMIT 1), 'SINENDE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TCHAOUROU' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TCHAOUROU' LIMIT 1), 'ALAFIAROU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TCHAOUROU' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TCHAOUROU' LIMIT 1), 'BETEROU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TCHAOUROU' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TCHAOUROU' LIMIT 1), 'GORO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TCHAOUROU' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TCHAOUROU' LIMIT 1), 'KIKA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TCHAOUROU' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TCHAOUROU' LIMIT 1), 'SANSON', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TCHAOUROU' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TCHAOUROU' LIMIT 1), 'TCHAOUROU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TCHAOUROU' AND d.nom = 'BORGOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'TCHAOUROU' LIMIT 1), 'TCHATCHOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANTE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'AGOUA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANTE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'AKPASSI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANTE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'ATOKOLIGBE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANTE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'BANTE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANTE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'BOBE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANTE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'GOUKA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANTE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'KOKO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANTE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'LOUGBA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BANTE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'PIRA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DASSA-ZOUME' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'AKOFODJOULE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DASSA-ZOUME' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'DASSA I', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DASSA-ZOUME' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'DASSA II', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DASSA-ZOUME' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'GBAFFO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DASSA-ZOUME' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'KERE', 'ORTHOGRAPHE A CONFIRMER', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DASSA-ZOUME' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'KPINGNI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DASSA-ZOUME' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'LEMA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DASSA-ZOUME' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'PAOUIGNAN', 'ORTHOGRAPHE A CONFIRMER', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DASSA-ZOUME' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'SOCLOGBO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DASSA-ZOUME' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'TRE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GLAZOUE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'AKLANKPA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GLAZOUE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'ASSANTE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GLAZOUE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'GLAZOUE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GLAZOUE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'GOME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GLAZOUE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'KPAKPAZA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GLAZOUE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'MAGOUMI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GLAZOUE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'OUEDEME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GLAZOUE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'SOKPONTA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GLAZOUE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'THIO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GLAZOUE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DASSA-GLAZOUE' LIMIT 1), 'ZAFFE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUESSE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'CHALLA-OGOI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUESSE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'DJEGBE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUESSE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'GBANLIN', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUESSE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'KEMON', 'ORTHOGRAPHE A CONFIRMER', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUESSE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'KILIBO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUESSE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'LAMINOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUESSE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'ODOUGBA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUESSE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'OUESSE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUESSE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'TOUI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVALOU' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'DJALOUKOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVALOU' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'DOUME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVALOU' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'GOBADA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVALOU' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'KPATABA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVALOU' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'LAHOTAN', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVALOU' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'LEMA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVALOU' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'LOGOZOHE', 'ORTHOGRAPHE A CONFIRMER', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVALOU' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'MONKPA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVALOU' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'OTTOLA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVALOU' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'OUESSE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVALOU' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'SAVALOU-AGA', 'ORTHOGRAPHE A CONFIRMER', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVALOU' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'SAVALOU-AGBADO', 'ORTHOGRAPHE A CONFIRMER', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVALOU' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'SAVALOU-ATTAKE', 'ORTHOGRAPHE A CONFIRMER', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVALOU' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVALOU-BANTE' LIMIT 1), 'TCHETTI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'ADIDO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'BESSE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'BONI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'KABOUA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'OFE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'OKPARA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'PLATEAU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAVE' AND d.nom = 'COLLINES' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAVE-OUESSE' LIMIT 1), 'SAKIN', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BASSILA' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BASSILA' LIMIT 1), 'ALEDJO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BASSILA' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BASSILA' LIMIT 1), 'BASSILA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BASSILA' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BASSILA' LIMIT 1), 'MANIGRI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BASSILA' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'BASSILA' LIMIT 1), 'PENESSOULOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COPARGO' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'ANANDANA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COPARGO' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'COPARGO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COPARGO' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'PABEGOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COPARGO' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'SINGRE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJOUGOU' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'BAREI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJOUGOU' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'BARIENOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJOUGOU' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'BELLEFOUNGOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJOUGOU' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'BOUGOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJOUGOU' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'DJOUGOU I', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJOUGOU' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'DJOUGOU II', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJOUGOU' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'DJOUGOU III', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJOUGOU' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'KOLOKONDE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJOUGOU' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'ONKLOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJOUGOU' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'PATARGO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJOUGOU' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'PELEBINA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJOUGOU' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'SEROU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUAKE' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'BADJOUDE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUAKE' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'KONDE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUAKE' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'OUAKE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUAKE' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'SEMERE I', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUAKE' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'SEMERE II', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUAKE' AND d.nom = 'DONGA' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJOUGOU-OUAKE-COPARGO' LIMIT 1), 'TCHALINGA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'APLAHOUE' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'APLAHOUE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'APLAHOUE' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'ATOME', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'APLAHOUE' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'AZOVE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'APLAHOUE' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'DEKPO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'APLAHOUE' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'GODOHOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'APLAHOUE' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'KISSAMEY', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'APLAHOUE' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'LONKLY', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJAKOTOMEY' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'ADJINTIMEY', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJAKOTOMEY' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'BETOUMEY', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJAKOTOMEY' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'DJAKOTOMEY I', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJAKOTOMEY' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'DJAKOTOMEY II', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJAKOTOMEY' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'GOHOMEY', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJAKOTOMEY' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'HOUEGAMEY', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJAKOTOMEY' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'KINKINHOUE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJAKOTOMEY' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'KOKOHOUE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJAKOTOMEY' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'KPOBA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJAKOTOMEY' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'SOKOUHOUE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DOGBO-TOTA' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'AYOMI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DOGBO-TOTA' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'DEVE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DOGBO-TOTA' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'HONTON', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DOGBO-TOTA' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'LOKOGOHOUE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DOGBO-TOTA' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'MADJRE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DOGBO-TOTA' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'TOTA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DOGBO-TOTA' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'APLAHOUE-DJAKOTOMEY-DOGBO' LIMIT 1), 'TOTCHAGNI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KLOUEKANME' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'ADJANHONME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KLOUEKANME' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'AHOGBEYA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KLOUEKANME' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'AYA-HOHOUE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KLOUEKANME' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'DJOTTO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KLOUEKANME' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'HONDJI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KLOUEKANME' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'KLOUEKANME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KLOUEKANME' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'LANTA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KLOUEKANME' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'TCHIKPE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LALO' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'ADOUKANDJI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LALO' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'AHONDJINNAKO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LALO' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'AHOMADEGBE', 'ORTHOGRAPHE A CONFIRMER', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LALO' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'BANIGBE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LALO' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'GNIZOUNME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LALO' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'HLASSAME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LALO' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'LALO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LALO' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'LOKOGBA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LALO' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'TCHITO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LALO' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'TOHOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LALO' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'ZALLI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOVIKLIN' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'ADJIDO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOVIKLIN' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'AVEDJIN', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOVIKLIN' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'DOKO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOVIKLIN' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'HOUEDOGLI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOVIKLIN' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'MISSINKO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOVIKLIN' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'TANNOU-GOLA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'TOVIKLIN' AND d.nom = 'COUFFO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'KLOUEKANME-TOVIKLIN-LALO' LIMIT 1), 'TOVIKLIN', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c WHERE c.nom = 'COTONOU' LIMIT 1), NULL, '1ER ARRONDISSEMENT DE COTONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A RATTACHER (ARRONDISSEMENT PAR ARRONDISSEMENT)', NULL),
((SELECT c.id FROM public.communes c WHERE c.nom = 'COTONOU' LIMIT 1), NULL, '2E ARRONDISSEMENT DE COTONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A RATTACHER (ARRONDISSEMENT PAR ARRONDISSEMENT)', NULL),
((SELECT c.id FROM public.communes c WHERE c.nom = 'COTONOU' LIMIT 1), NULL, '3E ARRONDISSEMENT DE COTONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A RATTACHER (ARRONDISSEMENT PAR ARRONDISSEMENT)', NULL),
((SELECT c.id FROM public.communes c WHERE c.nom = 'COTONOU' LIMIT 1), NULL, '4E ARRONDISSEMENT DE COTONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A RATTACHER (ARRONDISSEMENT PAR ARRONDISSEMENT)', NULL),
((SELECT c.id FROM public.communes c WHERE c.nom = 'COTONOU' LIMIT 1), NULL, '5E ARRONDISSEMENT DE COTONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A RATTACHER (ARRONDISSEMENT PAR ARRONDISSEMENT)', NULL),
((SELECT c.id FROM public.communes c WHERE c.nom = 'COTONOU' LIMIT 1), NULL, '6E ARRONDISSEMENT DE COTONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A RATTACHER (ARRONDISSEMENT PAR ARRONDISSEMENT)', NULL),
((SELECT c.id FROM public.communes c WHERE c.nom = 'COTONOU' LIMIT 1), NULL, '7E ARRONDISSEMENT DE COTONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A RATTACHER (ARRONDISSEMENT PAR ARRONDISSEMENT)', NULL),
((SELECT c.id FROM public.communes c WHERE c.nom = 'COTONOU' LIMIT 1), NULL, '8E ARRONDISSEMENT DE COTONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A RATTACHER (ARRONDISSEMENT PAR ARRONDISSEMENT)', NULL),
((SELECT c.id FROM public.communes c WHERE c.nom = 'COTONOU' LIMIT 1), NULL, '9E ARRONDISSEMENT DE COTONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A RATTACHER (ARRONDISSEMENT PAR ARRONDISSEMENT)', NULL),
((SELECT c.id FROM public.communes c WHERE c.nom = 'COTONOU' LIMIT 1), NULL, '10E ARRONDISSEMENT DE COTONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A RATTACHER (ARRONDISSEMENT PAR ARRONDISSEMENT)', NULL),
((SELECT c.id FROM public.communes c WHERE c.nom = 'COTONOU' LIMIT 1), NULL, '11E ARRONDISSEMENT DE COTONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A RATTACHER (ARRONDISSEMENT PAR ARRONDISSEMENT)', NULL),
((SELECT c.id FROM public.communes c WHERE c.nom = 'COTONOU' LIMIT 1), NULL, '12E ARRONDISSEMENT DE COTONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A RATTACHER (ARRONDISSEMENT PAR ARRONDISSEMENT)', NULL),
((SELECT c.id FROM public.communes c WHERE c.nom = 'COTONOU' LIMIT 1), NULL, '13E ARRONDISSEMENT DE COTONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A RATTACHER (ARRONDISSEMENT PAR ARRONDISSEMENT)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ATHIEME' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'LOKOSSA-ATHIEME' LIMIT 1), 'ADOHOUN', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ATHIEME' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'LOKOSSA-ATHIEME' LIMIT 1), 'ATCHANNOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ATHIEME' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'LOKOSSA-ATHIEME' LIMIT 1), 'ATHIEME', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ATHIEME' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'LOKOSSA-ATHIEME' LIMIT 1), 'DEDEKPOE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ATHIEME' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'LOKOSSA-ATHIEME' LIMIT 1), 'KPINNOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOPA' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'AGBODJI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOPA' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'BADAZOUI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOPA' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'BOPA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOPA' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'GBAKPODJI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOPA' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'LOBOGO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOPA' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'POSSOTOME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOPA' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'YEGODOE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COME' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'AGATOGBO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COME' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'AKODEHA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COME' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'COME', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COME' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'OUEDEME-PEDAH', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COME' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'OUMAKO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GRAND-POPO' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'ADJAHA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GRAND-POPO' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'AGOUE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GRAND-POPO' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'AVLOH', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GRAND-POPO' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'DJANGLANMEY', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GRAND-POPO' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'GBEHOUE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GRAND-POPO' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'GRAND-POPO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'GRAND-POPO' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'SAZOUE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'HOUEYOGBE' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'DAHE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'HOUEYOGBE' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'DOUTOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'HOUEYOGBE' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'HONHOUE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'HOUEYOGBE' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'HOUEYOGBE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'HOUEYOGBE' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'SE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'HOUEYOGBE' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COME-GRAND-POPO-BOPA-HOUEYOGBE' LIMIT 1), 'ZOUNGBONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LOKOSSA' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'LOKOSSA-ATHIEME' LIMIT 1), 'AGAME', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LOKOSSA' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'LOKOSSA-ATHIEME' LIMIT 1), 'HOUIN', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LOKOSSA' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'LOKOSSA-ATHIEME' LIMIT 1), 'KOUDO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LOKOSSA' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'LOKOSSA-ATHIEME' LIMIT 1), 'LOKOSSA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'LOKOSSA' AND d.nom = 'MONO' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'LOKOSSA-ATHIEME' LIMIT 1), 'OUEDEME', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJARRA' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'ADJARRA I', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJARRA' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'ADJARRA II', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJARRA' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'AGLOGBE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJARRA' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'HONVIE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJARRA' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'MALANHOUI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJARRA' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'MEDEDJONOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJOHOUN' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'ADJOHOUN', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJOHOUN' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'AKPADANOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJOHOUN' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'AWONOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJOHOUN' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'AZOWLISSE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJOHOUN' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'DEME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJOHOUN' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'GANGBAN', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJOHOUN' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'KODE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJOHOUN' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'TOGBOTA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AGUEGUES' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), 'AVAGBODJI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AGUEGUES' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), 'HOUEDOME', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AGUEGUES' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), 'ZOUNGAME', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AKPRO-MISSERETE' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'AKPRO-MISSERETE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AKPRO-MISSERETE' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'GOME-SOTA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AKPRO-MISSERETE' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'KATAGON', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AKPRO-MISSERETE' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'VAKON', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AKPRO-MISSERETE' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'ZODOGBOMEY', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AVRANKOU' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'ATCHOUKPA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AVRANKOU' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'AVRANKOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AVRANKOU' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'DJOMON', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AVRANKOU' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'GBOZOUNME', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AVRANKOU' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'KOUTY', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AVRANKOU' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'OUANHO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AVRANKOU' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJARRA-AVRANKOU-AKPRO-MISSERETE' LIMIT 1), 'SADO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BONOU' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'AFFAME', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BONOU' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'ATCHONSA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BONOU' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'BONOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BONOU' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'DAME-WOGON', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BONOU' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'HOUINVIGUE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DANGBO' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'DANGBO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DANGBO' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'DEKIN', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DANGBO' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'GBEKO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DANGBO' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'HOUEDOMEY', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DANGBO' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'HOZIN', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DANGBO' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'KESSOUNOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DANGBO' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ADJOHOUN-BONOU-DANGBO' LIMIT 1), 'ZOUNGUE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PORTO-NOVO' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), '1ER ARRONDISSEMENT DE PORTO-NOVO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PORTO-NOVO' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), '2E ARRONDISSEMENT DE PORTO-NOVO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PORTO-NOVO' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), '3E ARRONDISSEMENT DE PORTO-NOVO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PORTO-NOVO' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), '4E ARRONDISSEMENT DE PORTO-NOVO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'PORTO-NOVO' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), '5E ARRONDISSEMENT DE PORTO-NOVO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SEME-KPODJI' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), 'AGBLANGANDAN', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SEME-KPODJI' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), 'AHOLOUYEME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SEME-KPODJI' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), 'DJEREGBE', 'ORTHOGRAPHE A CONFIRMER', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SEME-KPODJI' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), 'EKPE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SEME-KPODJI' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), 'SEME-KPODJI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SEME-KPODJI' AND d.nom = 'OUEME' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'PORTO-NOVO-AGUEGUES-SEME-PODJI' LIMIT 1), 'TOHOUE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJA-OUERE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'ADJA-OUERE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJA-OUERE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'IKPINLE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJA-OUERE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'KPOULOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJA-OUERE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'MASSE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJA-OUERE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'OKO-AKARE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ADJA-OUERE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'TOTONNOUKON', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'IFANGNI' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAKETE-IFANGNI' LIMIT 1), 'BANIGBE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'IFANGNI' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAKETE-IFANGNI' LIMIT 1), 'DAAGBE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'IFANGNI' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAKETE-IFANGNI' LIMIT 1), 'IFANGNI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'IFANGNI' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAKETE-IFANGNI' LIMIT 1), 'KO-KOUMOLOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'IFANGNI' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAKETE-IFANGNI' LIMIT 1), 'LAGBE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'IFANGNI' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAKETE-IFANGNI' LIMIT 1), 'TCHAADA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KETOU' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'ADAKPLAME', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KETOU' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'IDIGNY', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KETOU' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'KPANKOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KETOU' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'KETOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KETOU' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'ODOMETA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'KETOU' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'OKPOMETA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'POBE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'AHOYEYE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'POBE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'IGANA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'POBE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'ISSABA', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'POBE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'POBE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'POBE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'POBE-ADJA-OUERE-KETOU' LIMIT 1), 'TOWE', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAKETE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAKETE-IFANGNI' LIMIT 1), 'AGUIDI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAKETE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAKETE-IFANGNI' LIMIT 1), 'ITA-DJEBOU', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAKETE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAKETE-IFANGNI' LIMIT 1), 'SAKETE I', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAKETE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAKETE-IFANGNI' LIMIT 1), 'SAKETE II', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAKETE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAKETE-IFANGNI' LIMIT 1), 'TAKON', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'SAKETE' AND d.nom = 'PLATEAU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'SAKETE-IFANGNI' LIMIT 1), 'YOKO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'AGBOKPA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'DETOHOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'DJEGBE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'HOUNLI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'SEHOUN', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'VIDOLE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ABOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'ZOUNZOUNME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AGBANGNIZOUN' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'ADAHONDJIGON', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AGBANGNIZOUN' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'ADINGNINGON', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AGBANGNIZOUN' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'AGBANGNIZOUN', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AGBANGNIZOUN' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'KINTA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AGBANGNIZOUN' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'KPOTA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AGBANGNIZOUN' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'LISSAZOUNME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AGBANGNIZOUN' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'SAHE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AGBANGNIZOUN' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'SIWE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AGBANGNIZOUN' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'TANVE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'AGBANGNIZOUN' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'ZOUNGOUDO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOHICON' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'AGONGOINTO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOHICON' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'AVOGBANNA', 'ORTHOGRAPHE A CONFIRMER', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOHICON' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'BOHICON I', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOHICON' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'BOHICON II', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOHICON' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'GNIDJAZOUN', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOHICON' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'LISSEZOUN', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOHICON' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'OUASSAHO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOHICON' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'PASSAGON', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOHICON' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'SACLO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'BOHICON' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'SODOHOME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COVE' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'ADOGBE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COVE' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'GOUNLI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COVE' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'HOUEKO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COVE' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'HOUEN-HOUNSO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COVE' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'LAINTA-COGBE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COVE' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'NAOGON', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COVE' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'SOLI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'COVE' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'ZOGBA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJIDJA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'AGONDJI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJIDJA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'AGOUNA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJIDJA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'DAN', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJIDJA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'DJIDJA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJIDJA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'DOHOUIME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJIDJA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'GOBAIX', 'ORTHOGRAPHE A CONFIRMER', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJIDJA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'MONSOUROU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJIDJA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'MOUGNON', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJIDJA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'OUNGBEGAME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJIDJA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'HOUTO', 'ORTHOGRAPHE A CONFIRMER', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJIDJA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'SETTO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'DJIDJA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'DJIDJA-ABOMEY-AGBANGNIZOUN (DAA)' LIMIT 1), 'ZOUKON', 'ORTHOGRAPHE A CONFIRMER', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUINHI' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'DASSO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUINHI' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'OUINHI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUINHI' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'SAGON', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'OUINHI' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'TOHOUES', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZA-KPOTA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'ALLAHE', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZA-KPOTA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'ASSALIN', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZA-KPOTA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'HOUNGOMEY', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZA-KPOTA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'KPAKPAME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZA-KPOTA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'KPOZOUN', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZA-KPOTA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'ZA-KPOTA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZA-KPOTA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'ZA-TANTA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZA-KPOTA' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'ZEKO', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZAGNANADO' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'AGONLI-HOUEGBO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZAGNANADO' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'BANAME', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZAGNANADO' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'N''-TAN', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZAGNANADO' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'DOVI', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZAGNANADO' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'KPEDEKPO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZAGNANADO' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1), 'ZAGNANADO', 'A CONFIRMER (SOURCE OFFICIELLE)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZOGBODOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'AKIZA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZOGBODOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'AVLAME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZOGBODOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'CANA I', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZOGBODOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'CANA II', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZOGBODOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'DOME', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZOGBODOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'KOUSSOUKPA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZOGBODOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'KPOKISSA', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZOGBODOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'MASSI', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZOGBODOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'TANWE-HESSOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZOGBODOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'ZOGBODOMEY', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL),
((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = 'ZOGBODOMEY' AND d.nom = 'ZOU' LIMIT 1), (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'ZOGBODOMEY-BOHICON-ZA-KPOTA (ZOBOZA)' LIMIT 1), 'ZOUKOU', 'VERIFIE (SOURCE WIKIPEDIA)', 'A CONFIRMER (CONNAISSANCE DU DECOUPAGE)', NULL)
ON CONFLICT (commune_id, nom) DO UPDATE SET 
nom = EXCLUDED.nom,
statut_arrondissement = EXCLUDED.statut_arrondissement,
statut_zone_sanitaire = EXCLUDED.statut_zone_sanitaire;

-- ---------------------------------------------------------------------
-- 6. DONNÉES DE TEST DANS LE ZOU (COVE, ZAGNANADO, OUINHI) SANS ACCENTS
-- ---------------------------------------------------------------------

-- Centres de santé
INSERT INTO public.structures_sante (commune_id, nom, type_structure)
SELECT c.id, 'CENTRE DE SANTE COMMUNAL DE COVE', 'CSC'
FROM public.communes c WHERE c.nom = 'COVE'
ON CONFLICT (commune_id, nom) DO NOTHING;

INSERT INTO public.structures_sante (commune_id, nom, type_structure)
SELECT c.id, 'CENTRE DE SANTE COMMUNAL DE ZAGNANADO', 'CSC'
FROM public.communes c WHERE c.nom = 'ZAGNANADO'
ON CONFLICT (commune_id, nom) DO NOTHING;

INSERT INTO public.structures_sante (commune_id, nom, type_structure)
SELECT c.id, 'CENTRE DE SANTE COMMUNAL DE OUINHI', 'CSC'
FROM public.communes c WHERE c.nom = 'OUINHI'
ON CONFLICT (commune_id, nom) DO NOTHING;

-- Villages
INSERT INTO public.villages (arrondissement_id, nom, code)
SELECT a.id, 'AHITO', 'AHI-01'
FROM public.arrondissements a 
JOIN public.communes c ON a.commune_id = c.id 
WHERE c.nom = 'COVE' AND a.nom = 'NAOGON'
ON CONFLICT (arrondissement_id, nom) DO NOTHING;

INSERT INTO public.villages (arrondissement_id, nom, code)
SELECT a.id, 'ADJAME', 'ADJ-02'
FROM public.arrondissements a 
JOIN public.communes c ON a.commune_id = c.id 
WHERE c.nom = 'COVE' AND a.nom = 'NAOGON'
ON CONFLICT (arrondissement_id, nom) DO NOTHING;

-- Utilisateur test 1 : Super Admin
INSERT INTO public.utilisateurs (
    id, telephone, nom, prenoms, poste, role_technique, statut_compte
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '+2290100000001',
    'ADMIN',
    'National Test',
    'AUTRE',
    'SUPER_ADMIN',
    'VALIDE'
) ON CONFLICT (id) DO UPDATE SET
    telephone = EXCLUDED.telephone,
    role_technique = 'SUPER_ADMIN',
    statut_compte = 'VALIDE';

-- Utilisateur test 2 : ASCQ Test (COVE / NAOGON)
INSERT INTO public.utilisateurs (
    id, telephone, nom, prenoms, poste, role_technique, statut_compte,
    departement_id, zone_sanitaire_id, commune_id, arrondissement_id
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    '+2290100000002',
    'DOSSOU',
    'Bruno Test',
    'ASCQ',
    'ASCQ_OPERATEUR',
    'VALIDE',
    (SELECT d.id FROM public.departements d WHERE d.nom = 'ZOU' LIMIT 1),
    (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1),
    (SELECT c.id FROM public.communes c WHERE c.nom = 'COVE' LIMIT 1),
    (SELECT a.id FROM public.arrondissements a JOIN public.communes c ON a.commune_id = c.id WHERE c.nom = 'COVE' AND a.nom = 'NAOGON' LIMIT 1)
) ON CONFLICT (id) DO UPDATE SET
    nom = EXCLUDED.nom,
    prenoms = EXCLUDED.prenoms,
    role_technique = 'ASCQ_OPERATEUR',
    statut_compte = 'VALIDE',
    departement_id = EXCLUDED.departement_id,
    zone_sanitaire_id = EXCLUDED.zone_sanitaire_id,
    commune_id = EXCLUDED.commune_id,
    arrondissement_id = EXCLUDED.arrondissement_id;

-- Profil ASCQ correspondant
INSERT INTO public.ascq_profils (
    id, source_financement, nombre_rc, afficher_annuaire_public
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'LLF',
    3,
    true
) ON CONFLICT (id) DO UPDATE SET
    afficher_annuaire_public = true,
    nombre_rc = 3;

-- Conseils santé
INSERT INTO public.conseils_sante (titre, contenu, categorie) VALUES
('PREVENTION DU PALUDISME EN COMMUNAUTE', 'Dormez toutes les nuits sous Moustiquaire Impregnee d''Insecticide (MILDA). Au premier signe de fievre, rendez-vous immediatement chez l''ASCQ de votre village pour un test rapide.', 'PALUDISME'),
('HYGIENE DES MAINS ET EAU POTABLE', 'Lavez-vous toujours les mains a l''eau propre et au savon avant de cuisiner, avant de nourrir les enfants et en sortant des latrines.', 'HYGIENE'),
('VACCINATION DES NOURRISSONS', 'Faites vacciner vos enfants selon le calendrier officiel du Benin des la naissance pour les proteger des maladies graves.', 'VACCINATION')
ON CONFLICT DO NOTHING;
