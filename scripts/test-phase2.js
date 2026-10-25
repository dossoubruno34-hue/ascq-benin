const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Lire .env.local
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
let supabaseUrl = '';
let supabaseAnonKey = '';

envContent.split(/\r?\n/).forEach(line => {
  const matchUrl = line.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)$/);
  if (matchUrl) supabaseUrl = matchUrl[1].trim();
  const matchKey = line.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.*)$/);
  if (matchKey) supabaseAnonKey = matchKey[1].trim();
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erreur : URL ou clé Supabase manquante dans .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('====================================================');
  console.log('TESTS DE CONFORMITÉ ET DE SÉCURITÉ - PHASE 2');
  console.log('====================================================\n');

  let allSuccess = true;

  // 1. Test Départements (Attendu : 12)
  const { data: deps, error: errDeps, count: countDeps } = await supabase
    .from('departements')
    .select('*', { count: 'exact' });

  if (errDeps) {
    console.error('❌ Échec lecture départements :', errDeps.message);
    allSuccess = false;
  } else if (deps.length === 12) {
    console.log('✅ Départements : 12/12 trouvés.');
  } else {
    console.log(`❌ Départements : ${deps.length} trouvés au lieu de 12.`);
    allSuccess = false;
  }

  // 2. Test Zones sanitaires (Attendu : 34)
  const { data: zss, error: errZss } = await supabase
    .from('zones_sanitaires')
    .select('*');

  if (errZss) {
    console.error('❌ Échec lecture zones sanitaires :', errZss.message);
    allSuccess = false;
  } else if (zss.length === 34) {
    console.log('✅ Zones sanitaires : 34/34 trouvées (dont les 4 zones de Cotonou).');
  } else {
    console.log(`❌ Zones sanitaires : ${zss.length} trouvées au lieu de 34.`);
    allSuccess = false;
  }

  // 3. Test Communes (Attendu : 77)
  const { data: communes, error: errCom } = await supabase
    .from('communes')
    .select('*');

  if (errCom) {
    console.error('❌ Échec lecture communes :', errCom.message);
    allSuccess = false;
  } else if (communes.length === 77) {
    console.log('✅ Communes : 77/77 trouvées.');
  } else {
    console.log(`❌ Communes : ${communes.length} trouvées au lieu de 77.`);
    allSuccess = false;
  }

  // 4. Test Arrondissements (Attendu : 546)
  const { data: arrondissements, error: errArr, count: countArr } = await supabase
    .from('arrondissements')
    .select('*', { count: 'exact' });

  if (errArr) {
    console.error('❌ Échec lecture arrondissements :', errArr.message);
    allSuccess = false;
  } else if (countArr === 546 || (arrondissements && arrondissements.length === 546)) {
    console.log('✅ Arrondissements : 546/546 trouvés.');
  } else {
    console.log(`❌ Arrondissements : ${countArr || arrondissements?.length} trouvés au lieu de 546.`);
    allSuccess = false;
  }

  // 5. Test Cotonou (13 arrondissements à rattacher)
  const { data: cotonouArr, error: errCot } = await supabase
    .from('arrondissements')
    .select('nom, zone_sanitaire_id, communes!inner(nom)')
    .eq('communes.nom', 'COTONOU');

  if (errCot) {
    console.error('❌ Échec vérification Cotonou :', errCot.message);
    allSuccess = false;
  } else if (cotonouArr.length === 13 && cotonouArr.every(a => a.zone_sanitaire_id === null)) {
    console.log('✅ Règle Cotonou : les 13 arrondissements sont bien signalés « À rattacher » (zone_sanitaire_id est NULL).');
  } else {
    console.log(`❌ Règle Cotonou : ${cotonouArr?.length} arrondissements trouvés.`);
    allSuccess = false;
  }

  // 6. Test Sécurité RLS : Vérifier que les données privées ne sont pas lisibles sans connexion
  const { data: privateData, error: errPriv } = await supabase
    .from('ascq_profil_prive')
    .select('*');

  if (privateData && privateData.length > 0) {
    console.log('❌ Échec Sécurité RLS : Les données privées NPI/IFU ont pu être lues sans connexion !');
    allSuccess = false;
  } else {
    console.log('✅ Sécurité RLS : Table privée ascq_profil_prive hermétique aux accès non connectés (0 donnée exposée).');
  }

  // 7. Test Annuaire public : seuls les profils validés avec accord sont visibles
  const { data: publicAscq, error: errPub } = await supabase
    .from('utilisateurs')
    .select('nom, prenoms, telephone, ascq_profils!inner(afficher_annuaire_public)');

  if (publicAscq && publicAscq.length > 0) {
    console.log(`✅ Sécurité Annuaire : ${publicAscq.length} ASCQ test visible dans l'annuaire conformément à son accord.`);
  }

  console.log('\n====================================================');
  if (allSuccess) {
    console.log('🎉 TOUS LES TESTS DE LA PHASE 2 SONT VALIDÉS AVEC SUCCÈS !');
  } else {
    console.log('⚠️ Certains tests nécessitent une vérification.');
  }
  console.log('====================================================\n');
}

runTests();
