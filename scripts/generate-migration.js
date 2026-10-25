const fs = require('fs');
const path = require('path');

// 1. Lire les 34 zones sanitaires
const zssExtracted = JSON.parse(fs.readFileSync('scripts/zones_sanitaires_extracted.json', 'utf8'));

// 2. Lire le CSV des 546 arrondissements
const csvLines = fs.readFileSync('data/referentiel_geographique_benin.csv', 'utf8')
  .split(/\r?\n/)
  .map(l => l.trim())
  .filter(l => l.length > 0);

const csvRows = csvLines.slice(1).map(l => {
  const parts = l.split(',');
  return {
    dep: parts[0]?.trim(),
    zs: parts[1]?.trim(),
    commune: parts[2]?.trim(),
    arrond: parts[3]?.trim(),
    statut_arrond: parts[4]?.trim(),
    statut_zs: parts[5]?.trim()
  };
});

function escapeSql(str) {
  if (!str) return "''";
  return "'" + str.replace(/'/g, "''") + "'";
}

let sql = `-- =====================================================================
-- ASCQ BÉNIN - Migration Phase 2 : Fondations de la Base de Données
-- Création des tables, sécurité RLS, référentiel géographique et données de test
-- Date : 25/10/2026
-- =====================================================================

-- Extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. RÉFÉRENTIEL GÉOGRAPHIQUE
-- ---------------------------------------------------------------------

-- A. Départements (12)
CREATE TABLE IF NOT EXISTS public.departements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    nom TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. Zones sanitaires (34)
CREATE TABLE IF NOT EXISTS public.zones_sanitaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departement_id UUID NOT NULL REFERENCES public.departements(id) ON DELETE RESTRICT,
    nom TEXT NOT NULL,
    communes_couvertes TEXT,
    statut_verification TEXT NOT NULL DEFAULT 'À CONFIRMER (CONNAISSANCE DU DÉCOUPAGE)',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_zones_sanitaires UNIQUE (departement_id, nom)
);

-- C. Communes (77)
CREATE TABLE IF NOT EXISTS public.communes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departement_id UUID NOT NULL REFERENCES public.departements(id) ON DELETE RESTRICT,
    zone_sanitaire_id UUID REFERENCES public.zones_sanitaires(id) ON DELETE RESTRICT, -- NULL pour Cotonou
    nom TEXT NOT NULL,
    alias TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_communes UNIQUE (departement_id, nom)
);

-- D. Arrondissements (546)
CREATE TABLE IF NOT EXISTS public.arrondissements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commune_id UUID NOT NULL REFERENCES public.communes(id) ON DELETE RESTRICT,
    zone_sanitaire_id UUID REFERENCES public.zones_sanitaires(id) ON DELETE RESTRICT, -- Rempli pour Cotonou une fois rattaché
    nom TEXT NOT NULL,
    statut_arrondissement TEXT NOT NULL DEFAULT 'À CONFIRMER (SOURCE OFFICIELLE)',
    statut_zone_sanitaire TEXT NOT NULL DEFAULT 'À CONFIRMER (CONNAISSANCE DU DÉCOUPAGE)',
    alias TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_arrondissements UNIQUE (commune_id, nom)
);

-- E. Villages (Alimentés par commune)
CREATE TABLE IF NOT EXISTS public.villages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arrondissement_id UUID NOT NULL REFERENCES public.arrondissements(id) ON DELETE RESTRICT,
    nom TEXT NOT NULL,
    code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_villages UNIQUE (arrondissement_id, nom)
);

-- F. Structures de santé (Centres de santé, dispensaires)
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

-- Table publique des utilisateurs
CREATE TABLE IF NOT EXISTS public.utilisateurs (
    id UUID PRIMARY KEY, -- Référence auth.users(id)
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

-- Profil spécifique pour l'ASCQ
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

-- Table hautement privée pour les données sensibles de l'ASCQ
CREATE TABLE IF NOT EXISTS public.ascq_profil_prive (
    id UUID PRIMARY KEY REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    npi TEXT,
    ifu TEXT,
    document_identite_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des Relais Communautaires (RC)
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

-- Mandats de représentants communaux ou départementaux
CREATE TABLE IF NOT EXISTS public.mandats_territoire (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    type_mandat TEXT NOT NULL CHECK (type_mandat IN ('COMMUNAL', 'DEPARTEMENTAL')),
    commune_id UUID REFERENCES public.communes(id),
    departement_id UUID REFERENCES public.departements(id),
    statut TEXT NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'REVOQUE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_mandat_unique UNIQUE (utilisateur_id, type_mandat)
);

-- Journal d'audit pour la traçabilité des modifications sensibles
CREATE TABLE IF NOT EXISTS public.journal_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID REFERENCES public.utilisateurs(id),
    action TEXT NOT NULL,
    table_cible TEXT NOT NULL,
    enregistrement_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 3. SÉCURITÉ AU NIVEAU DES LIGNES (RLS) SUR TOUTES LES TABLES
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
ALTER TABLE public.mandats_territoire ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_audit ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si ré-exécution
DROP POLICY IF EXISTS "Lecture ouverte departements" ON public.departements;
DROP POLICY IF EXISTS "Lecture ouverte zones_sanitaires" ON public.zones_sanitaires;
DROP POLICY IF EXISTS "Lecture ouverte communes" ON public.communes;
DROP POLICY IF EXISTS "Lecture ouverte arrondissements" ON public.arrondissements;
DROP POLICY IF EXISTS "Lecture ouverte villages" ON public.villages;
DROP POLICY IF EXISTS "Lecture ouverte structures_sante" ON public.structures_sante;
DROP POLICY IF EXISTS "Utilisateurs lisent leur propre compte" ON public.utilisateurs;
DROP POLICY IF EXISTS "Admins lisent tous les comptes" ON public.utilisateurs;
DROP POLICY IF EXISTS "Annuaire public ascq" ON public.utilisateurs;
DROP POLICY IF EXISTS "Inscription d'un utilisateur" ON public.utilisateurs;
DROP POLICY IF EXISTS "Modification profil utilisateur" ON public.utilisateurs;
DROP POLICY IF EXISTS "Lecture profil ASCQ" ON public.ascq_profils;
DROP POLICY IF EXISTS "Modification profil ASCQ" ON public.ascq_profils;
DROP POLICY IF EXISTS "Acces profil prive strict" ON public.ascq_profil_prive;
DROP POLICY IF EXISTS "ASCQ gere ses propres RC" ON public.relais_communautaires;
DROP POLICY IF EXISTS "RC lit son enregistrement" ON public.relais_communautaires;

-- Politiques Référentiel : Lecture ouverte
CREATE POLICY "Lecture ouverte departements" ON public.departements FOR SELECT USING (true);
CREATE POLICY "Lecture ouverte zones_sanitaires" ON public.zones_sanitaires FOR SELECT USING (true);
CREATE POLICY "Lecture ouverte communes" ON public.communes FOR SELECT USING (true);
CREATE POLICY "Lecture ouverte arrondissements" ON public.arrondissements FOR SELECT USING (true);
CREATE POLICY "Lecture ouverte villages" ON public.villages FOR SELECT USING (true);
CREATE POLICY "Lecture ouverte structures_sante" ON public.structures_sante FOR SELECT USING (true);

-- Politiques Utilisateurs :
CREATE POLICY "Utilisateurs lisent leur propre compte" ON public.utilisateurs
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins lisent tous les comptes" ON public.utilisateurs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.utilisateurs u 
            WHERE u.id = auth.uid() AND u.role_technique IN ('ADMINISTRATEUR', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Annuaire public ascq" ON public.utilisateurs
    FOR SELECT USING (
        statut_compte = 'VALIDE' AND
        role_technique = 'ASCQ_OPERATEUR' AND
        EXISTS (
            SELECT 1 FROM public.ascq_profils p 
            WHERE p.id = public.utilisateurs.id AND p.afficher_annuaire_public = true
        )
    );

CREATE POLICY "Inscription d'un utilisateur" ON public.utilisateurs
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Modification profil utilisateur" ON public.utilisateurs
    FOR UPDATE USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM public.utilisateurs u 
            WHERE u.id = auth.uid() AND u.role_technique IN ('ADMINISTRATEUR', 'SUPER_ADMIN')
        )
    );

-- Politiques Profil ASCQ :
CREATE POLICY "Lecture profil ASCQ" ON public.ascq_profils
    FOR SELECT USING (
        auth.uid() = id OR
        afficher_annuaire_public = true OR
        EXISTS (
            SELECT 1 FROM public.utilisateurs u 
            WHERE u.id = auth.uid() AND u.role_technique IN ('ADMINISTRATEUR', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Modification profil ASCQ" ON public.ascq_profils
    FOR ALL USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM public.utilisateurs u 
            WHERE u.id = auth.uid() AND u.role_technique IN ('ADMINISTRATEUR', 'SUPER_ADMIN')
        )
    );

-- Politiques Profil Privé : STRICTEMENT l'utilisateur lui-même ou SUPER_ADMIN
CREATE POLICY "Acces profil prive strict" ON public.ascq_profil_prive
    FOR ALL USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM public.utilisateurs u 
            WHERE u.id = auth.uid() AND u.role_technique = 'SUPER_ADMIN'
        )
    );

-- Politiques Relais Communautaires :
CREATE POLICY "ASCQ gere ses propres RC" ON public.relais_communautaires
    FOR ALL USING (
        ascq_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.utilisateurs u 
            WHERE u.id = auth.uid() AND u.role_technique IN ('ADMINISTRATEUR', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "RC lit son enregistrement" ON public.relais_communautaires
    FOR SELECT USING (
        telephone = (SELECT u.telephone FROM public.utilisateurs u WHERE u.id = auth.uid())
    );

-- ---------------------------------------------------------------------
-- 4. INSERTION DU RÉFÉRENTIEL GÉOGRAPHIQUE OFFICIEL DU BÉNIN
-- ---------------------------------------------------------------------
`;

// Insérer les 12 Départements
const departementsUniques = Array.from(new Set(csvRows.map(r => r.dep))).sort();
sql += `\n-- 12 Départements\nINSERT INTO public.departements (code, nom) VALUES\n`;
sql += departementsUniques.map(d => `(${escapeSql(d.substring(0, 3).toUpperCase())}, ${escapeSql(d)})`).join(',\n');
sql += `\nON CONFLICT (nom) DO UPDATE SET nom = EXCLUDED.nom;\n\n`;

// Insérer les 34 Zones Sanitaires
sql += `-- 34 Zones Sanitaires\n`;
sql += `INSERT INTO public.zones_sanitaires (departement_id, nom, communes_couvertes, statut_verification) VALUES\n`;
const zsRowsSql = zssExtracted.map(z => {
  return `((SELECT d.id FROM public.departements d WHERE d.nom = ${escapeSql(z.dep)} LIMIT 1), ${escapeSql(z.nom)}, ${escapeSql(z.communes)}, ${escapeSql(z.statut)})`;
});
sql += zsRowsSql.join(',\n');
sql += `\nON CONFLICT (departement_id, nom) DO UPDATE SET \n` +
       `communes_couvertes = EXCLUDED.communes_couvertes,\n` +
       `statut_verification = EXCLUDED.statut_verification;\n\n`;

// Insérer les 77 Communes
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

sql += `-- 77 Communes\n`;
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
sql += `\nON CONFLICT (departement_id, nom) DO UPDATE SET zone_sanitaire_id = EXCLUDED.zone_sanitaire_id;\n\n`;

// Insérer les 546 Arrondissements (avec c.id explicitement pour éviter l'ambiguïté !)
sql += `-- 546 Arrondissements\n`;
sql += `INSERT INTO public.arrondissements (commune_id, zone_sanitaire_id, nom, statut_arrondissement, statut_zone_sanitaire, alias) VALUES\n`;
const arrondSql = csvRows.map(r => {
  if (r.commune === 'COTONOU') {
    // Cotonou : zone_sanitaire_id = NULL
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
       `statut_arrondissement = EXCLUDED.statut_arrondissement,\n` +
       `statut_zone_sanitaire = EXCLUDED.statut_zone_sanitaire;\n\n`;

// ---------------------------------------------------------------------
// 5. DONNÉES DE TEST FICTIVES DANS LE DÉPARTEMENT DU ZOU
// ---------------------------------------------------------------------
sql += `-- ---------------------------------------------------------------------
-- 5. DONNÉES DE TEST FICTIVES DANS LE DÉPARTEMENT DU ZOU (COVÈ, ZAGNANADO, OUINHI)
-- ---------------------------------------------------------------------

-- A. Centres de santé de test dans le Zou
INSERT INTO public.structures_sante (commune_id, nom, type_structure)
SELECT c.id, 'Centre de Santé Communal de Covè', 'CSC'
FROM public.communes c WHERE c.nom = 'COVÈ'
ON CONFLICT (commune_id, nom) DO NOTHING;

INSERT INTO public.structures_sante (commune_id, nom, type_structure)
SELECT c.id, 'Centre de Santé Communal de Zagnanado', 'CSC'
FROM public.communes c WHERE c.nom = 'ZAGNANADO'
ON CONFLICT (commune_id, nom) DO NOTHING;

INSERT INTO public.structures_sante (commune_id, nom, type_structure)
SELECT c.id, 'Centre de Santé Communal de Ouinhi', 'CSC'
FROM public.communes c WHERE c.nom = 'OUINHI'
ON CONFLICT (commune_id, nom) DO NOTHING;

-- B. Villages de test pour l'arrondissement de Naogon (Covè)
INSERT INTO public.villages (arrondissement_id, nom, code)
SELECT a.id, 'Ahito', 'AHI-01'
FROM public.arrondissements a 
JOIN public.communes c ON a.commune_id = c.id 
WHERE c.nom = 'COVÈ' AND a.nom = 'NAOGON'
ON CONFLICT (arrondissement_id, nom) DO NOTHING;

INSERT INTO public.villages (arrondissement_id, nom, code)
SELECT a.id, 'Adjamè', 'ADJ-02'
FROM public.arrondissements a 
JOIN public.communes c ON a.commune_id = c.id 
WHERE c.nom = 'COVÈ' AND a.nom = 'NAOGON'
ON CONFLICT (arrondissement_id, nom) DO NOTHING;

-- C. Utilisateur Test : 1 Super Administrateur (fictif)
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
) ON CONFLICT (telephone) DO NOTHING;

-- D. Utilisateur Test : 1 ASCQ Fictif à Covè (Arrondissement Naogon)
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
    (SELECT z.id FROM public.zones_sanitaires z WHERE z.nom = 'COVÈ-ZAGNANADO-OUINHI (COZO)' LIMIT 1),
    (SELECT c.id FROM public.communes c WHERE c.nom = 'COVÈ' LIMIT 1),
    (SELECT a.id FROM public.arrondissements a JOIN public.communes c ON a.commune_id = c.id WHERE c.nom = 'COVÈ' AND a.nom = 'NAOGON' LIMIT 1)
) ON CONFLICT (telephone) DO NOTHING;

-- Profil ASCQ correspondant
INSERT INTO public.ascq_profils (
    id, source_financement, nombre_rc, afficher_annuaire_public
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'LLF',
    3,
    true
) ON CONFLICT (id) DO NOTHING;

-- Profil privé correspondant (NPI fictif)
INSERT INTO public.ascq_profil_prive (
    id, npi, ifu
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    '1234567890-FICTIF',
    '0202612345678'
) ON CONFLICT (id) DO NOTHING;

-- Relais Communautaire rattaché à cet ASCQ
INSERT INTO public.relais_communautaires (
    ascq_id, nom, prenoms, telephone, village_nom, grappe, nom_grappe, code_acces_temporaire
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'KPADONOU',
    'Michel Test',
    '+2290100000003',
    'Ahito',
    1,
    'Grappe 1 - Ahito Centre',
    '123456'
) ON CONFLICT (ascq_id, telephone) DO NOTHING;
`;

// Écrire en UTF-8 sans BOM
fs.writeFileSync('supabase/migrations/20261025_phase2_fondations.sql', sql, 'utf8');
console.log('Migration generated successfully: supabase/migrations/20261025_phase2_fondations.sql');
console.log('SQL file size:', Math.round(sql.length / 1024), 'KB');
