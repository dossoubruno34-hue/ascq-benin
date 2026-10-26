/**
 * ASCQ BÉNIN - Script de Sauvegarde et d'Export Complet des Données (Phase 11)
 * Sauvegarde localement les données de référence et d'activité dans un fichier JSON horodaté.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '';
let supabaseAnonKey = '';

envContent.split(/\r?\n/).forEach((line) => {
  const matchUrl = line.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)$/);
  if (matchUrl) supabaseUrl = matchUrl[1].trim();
  const matchKey = line.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.*)$/);
  if (matchKey) supabaseAnonKey = matchKey[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function sauvegarderDonnees() {
  console.log("=====================================================================");
  console.log("   ASCQ BÉNIN - SAUVEGARDE & EXTRACTION COMPLÈTE DE SÉCURITÉ");
  console.log("=====================================================================\n");

  const tables = [
    'departements',
    'zones_sanitaires',
    'communes',
    'arrondissements',
    'villages',
    'types_alertes_reference',
    'symptomes_reference',
    'deces_types_reference',
    'deces_lieux_reference',
    'deces_circonstances_reference',
    'conseils_sante',
    'bibliotheque_documents',
    'alertes_communautaires',
    'deces_communautaires',
    'rapports_mensuels_ascq',
    'plannings_ascq',
    'activites_menees'
  ];

  const backupData = {
    date_sauvegarde: new Date().toISOString(),
    version_systeme: "Phase 11 Production",
    tables: {}
  };

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*');
      if (error) {
        console.warn(`  ⚠️ Table '${t}' non exportée :`, error.message);
      } else {
        backupData.tables[t] = data || [];
        console.log(`  💾 Table '${t}' : ${data ? data.length : 0} enregistrements sauvegardés.`);
      }
    } catch (err) {
      console.warn(`  ⚠️ Erreur sur '${t}' :`, err.message);
    }
  }

  const backupDir = path.join(__dirname, '..', 'sauvegardes');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filePath = path.join(backupDir, `sauvegarde_ascq_benin_${dateStr}.json`);

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`\n✅ Sauvegarde enregistrée avec succès dans :\n👉 ${filePath}`);
}

sauvegarderDonnees().catch(console.error);
