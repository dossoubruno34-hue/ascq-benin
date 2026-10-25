const fs = require('fs');
const path = require('path');

function stripAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function escapeSql(str) {
  if (!str) return "''";
  return "'" + str.replace(/'/g, "''") + "'";
}

// 1. Lire les 34 zones sanitaires
const zssExtracted = JSON.parse(fs.readFileSync('scripts/zones_sanitaires_extracted.json', 'utf8'));

// 2. Lire le CSV des 546 arrondissements
const csvLines = fs.readFileSync('data/referentiel_geographique_benin.csv', 'utf8')
  .split(/\r?\n/)
  .map(l => l.trim())
  .filter(l => l.length > 0);

const csvRows = csvLines.slice(1).map(l => {
  return {
    dep: stripAccents(l.split(',')[0]),
    zs: stripAccents(l.split(',')[1]),
    commune: stripAccents(l.split(',')[2]),
    arrond: stripAccents(l.split(',')[3]),
    statut_arrond: stripAccents(l.split(',')[4]),
    statut_zs: stripAccents(l.split(',')[5])
  };
});

let sql = `-- =====================================================================
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
`;

// 12 Départements
const departementsUniques = Array.from(new Set(csvRows.map(r => r.dep))).sort();
sql += `\n-- 12 Départements sans accents\nINSERT INTO public.departements (code, nom) VALUES\n`;
sql += departementsUniques.map(d => `(${escapeSql(d.substring(0, 3))}, ${escapeSql(d)})`).join(',\n');
sql += `\nON CONFLICT (nom) DO UPDATE SET nom = EXCLUDED.nom;\n\n`;

// 34 Zones Sanitaires
sql += `-- 34 Zones Sanitaires sans accents\n`;
sql += `INSERT INTO public.zones_sanitaires (departement_id, nom, communes_couvertes, statut_verification) VALUES\n`;
const zsRowsSql = zssExtracted.map(z => {
  const depClean = stripAccents(z.dep);
  const nomClean = stripAccents(z.nom);
  const communesClean = stripAccents(z.communes);
  const statutClean = stripAccents(z.statut);
  return `((SELECT d.id FROM public.departements d WHERE d.nom = ${escapeSql(depClean)} LIMIT 1), ${escapeSql(nomClean)}, ${escapeSql(communesClean)}, ${escapeSql(statutClean)})`;
});
sql += zsRowsSql.join(',\n');
sql += `\nON CONFLICT (departement_id, nom) DO UPDATE SET \n` +
       `nom = EXCLUDED.nom,\n` +
       `communes_couvertes = EXCLUDED.communes_couvertes,\n` +
       `statut_verification = EXCLUDED.statut_verification;\n\n`;

// 77 Communes
const communesMap = new Map();
csvRows.forEach(r => {
  if (!communesMap.has(r.commune)) {
    communesMap.set(r.commune, {
      dep: r.dep,
      commune: r.commune,
      zs: r.zs
    });
  }
});

sql += `-- 77 Communes sans accents\n`;
sql += `INSERT INTO public.communes (departement_id, zone_sanitaire_id, nom, alias) VALUES\n`;
const communesSql = Array.from(communesMap.values()).map(c => {
  if (c.commune === 'COTONOU') {
    return `((SELECT d.id FROM public.departements d WHERE d.nom = ${escapeSql(c.dep)} LIMIT 1), NULL, ${escapeSql(c.commune)}, NULL)`;
  } else {
    return `((SELECT d.id FROM public.departements d WHERE d.nom = ${escapeSql(c.dep)} LIMIT 1), ` +
           `(SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = ${escapeSql(c.zs)} LIMIT 1), ` +
           `${escapeSql(c.commune)}, NULL)`;
  }
});
sql += communesSql.join(',\n');
sql += `\nON CONFLICT (departement_id, nom) DO UPDATE SET \n` +
       `nom = EXCLUDED.nom,\n` +
       `zone_sanitaire_id = EXCLUDED.zone_sanitaire_id;\n\n`;

// 546 Arrondissements
sql += `-- 546 Arrondissements sans accents\n`;
sql += `INSERT INTO public.arrondissements (commune_id, zone_sanitaire_id, nom, statut_arrondissement, statut_zone_sanitaire, alias) VALUES\n`;
const arrondSql = csvRows.map(r => {
  if (r.commune === 'COTONOU') {
    return `((SELECT c.id FROM public.communes c WHERE c.nom = 'COTONOU' LIMIT 1), ` +
           `NULL, ` +
           `${escapeSql(r.arrond)}, ${escapeSql(r.statut_arrond)}, ${escapeSql(r.statut_zs)}, NULL)`;
  } else {
    return `((SELECT c.id FROM public.communes c JOIN public.departements d ON c.departement_id = d.id WHERE c.nom = ${escapeSql(r.commune)} AND d.nom = ${escapeSql(r.dep)} LIMIT 1), ` +
           `(SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = ${escapeSql(r.zs)} LIMIT 1), ` +
           `${escapeSql(r.arrond)}, ${escapeSql(r.statut_arrond)}, ${escapeSql(r.statut_zs)}, NULL)`;
  }
});
sql += arrondSql.join(',\n');
sql += `\nON CONFLICT (commune_id, nom) DO UPDATE SET \n` +
       `nom = EXCLUDED.nom,\n` +
       `statut_arrondissement = EXCLUDED.statut_arrondissement,\n` +
       `statut_zone_sanitaire = EXCLUDED.statut_zone_sanitaire;\n\n`;

// ---------------------------------------------------------------------
// 6. DONNÉES DE TEST DANS LE ZOU (SANS ACCENTS)
// ---------------------------------------------------------------------
sql += `-- ---------------------------------------------------------------------
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
`;

fs.writeFileSync('supabase/migrations/20261025_phase2_fondations.sql', sql, 'utf8');
console.log('Migration generated successfully with all RPC functions!');
