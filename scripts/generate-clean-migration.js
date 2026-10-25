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
-- ASCQ BÉNIN - Nettoyage des Doublons & Référentiel 100% Propre (MAJUSCULES SANS ACCENT)
-- =====================================================================

-- 1. Détachement temporaire des utilisateurs et nettoyage des tables dépendantes
UPDATE public.utilisateurs 
SET departement_id = NULL, 
    zone_sanitaire_id = NULL, 
    commune_id = NULL, 
    arrondissement_id = NULL, 
    second_arrondissement_id = NULL;

UPDATE public.relais_communautaires SET village_id = NULL;
DELETE FROM public.structures_sante;
DELETE FROM public.villages;

-- 2. Suppression de tous les anciens enregistrements et doublons corrompus
DELETE FROM public.arrondissements;
DELETE FROM public.communes;
DELETE FROM public.zones_sanitaires;
DELETE FROM public.departements;

-- ---------------------------------------------------------------------
-- 3. INSERTION DU RÉFÉRENTIEL OFFICIEL (EXACTEMENT 12 DEP, 34 ZS, 77 COM, 546 ARR)
-- ---------------------------------------------------------------------
`;

// 12 Départements
const departementsUniques = Array.from(new Set(csvRows.map(r => r.dep))).sort();
sql += `\n-- A. Les 12 Départements\nINSERT INTO public.departements (code, nom) VALUES\n`;
sql += departementsUniques.map(d => `(${escapeSql(d.substring(0, 3))}, ${escapeSql(d)})`).join(',\n');
sql += `;\n\n`;

// 34 Zones Sanitaires
sql += `-- B. Les 34 Zones Sanitaires\n`;
sql += `INSERT INTO public.zones_sanitaires (departement_id, nom, communes_couvertes, statut_verification) VALUES\n`;
const zsRowsSql = zssExtracted.map(z => {
  const depClean = stripAccents(z.dep);
  const nomClean = stripAccents(z.nom);
  const communesClean = stripAccents(z.communes);
  const statutClean = stripAccents(z.statut);
  return `((SELECT d.id FROM public.departements d WHERE d.nom = ${escapeSql(depClean)} LIMIT 1), ${escapeSql(nomClean)}, ${escapeSql(communesClean)}, ${escapeSql(statutClean)})`;
});
sql += zsRowsSql.join(',\n');
sql += `;\n\n`;

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

sql += `-- C. Les 77 Communes\n`;
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
sql += `;\n\n`;

// 546 Arrondissements
sql += `-- D. Les 546 Arrondissements\n`;
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
sql += `;\n\n`;

// ---------------------------------------------------------------------
// 4. RÉAFFECTATION DU JEU DE TEST DANS LE ZOU (COVE / NAOGON)
// ---------------------------------------------------------------------
sql += `-- ---------------------------------------------------------------------
-- 4. RÉAFFECTATION DES STRUCTURES ET DE L'ASCQ TEST (COVE, NAOGON)
-- ---------------------------------------------------------------------

-- A. Centres de santé de test
INSERT INTO public.structures_sante (commune_id, nom, type_structure)
VALUES 
((SELECT id FROM public.communes WHERE nom = 'COVE' LIMIT 1), 'CENTRE DE SANTE COMMUNAL DE COVE', 'CSC'),
((SELECT id FROM public.communes WHERE nom = 'ZAGNANADO' LIMIT 1), 'CENTRE DE SANTE COMMUNAL DE ZAGNANADO', 'CSC'),
((SELECT id FROM public.communes WHERE nom = 'OUINHI' LIMIT 1), 'CENTRE DE SANTE COMMUNAL DE OUINHI', 'CSC')
ON CONFLICT DO NOTHING;

-- B. Villages de test pour NAOGON (COVE)
INSERT INTO public.villages (arrondissement_id, nom, code)
VALUES
((SELECT a.id FROM public.arrondissements a JOIN public.communes c ON a.commune_id = c.id WHERE c.nom = 'COVE' AND a.nom = 'NAOGON' LIMIT 1), 'AHITO', 'AHI-01'),
((SELECT a.id FROM public.arrondissements a JOIN public.communes c ON a.commune_id = c.id WHERE c.nom = 'COVE' AND a.nom = 'NAOGON' LIMIT 1), 'ADJAME', 'ADJ-02')
ON CONFLICT DO NOTHING;

-- C. Réassignation propre de l'ASCQ test à COVE / NAOGON
UPDATE public.utilisateurs
SET departement_id = (SELECT id FROM public.departements WHERE nom = 'ZOU' LIMIT 1),
    zone_sanitaire_id = (SELECT id FROM public.zones_sanitaires WHERE nom = 'COVE-ZAGNANADO-OUINHI (COZO)' LIMIT 1),
    commune_id = (SELECT id FROM public.communes WHERE nom = 'COVE' LIMIT 1),
    arrondissement_id = (SELECT a.id FROM public.arrondissements a JOIN public.communes c ON a.commune_id = c.id WHERE c.nom = 'COVE' AND a.nom = 'NAOGON' LIMIT 1)
WHERE telephone = '+2290100000002';
`;

fs.writeFileSync('supabase/migrations/nettoyage_doublons_accents.sql', sql, 'utf8');
console.log('Script nettoyage_doublons_accents.sql regenerated successfully with DELETE structures_sante!');
