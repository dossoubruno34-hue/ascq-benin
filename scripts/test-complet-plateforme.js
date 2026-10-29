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

const client = createClient(supabaseUrl, supabaseAnonKey);

async function testerPlateforme() {
  console.log("=================================================================");
  console.log("   BANC D'ESSAI TECHNIQUE COMPLET - TOUTES INTERFACES & PROFILS");
  console.log("=================================================================\n");

  // 1. Profil Public : Annuaire ASCQ
  console.log("1. TEST INTERFACE PUBLIQUE : Annuaire ASCQ...");
  const { data: annuaire, error: annErr } = await client.rpc('rechercher_annuaire_ascq', {
    p_departement_id: null,
    p_commune_id: null,
    p_arrondissement_id: null
  });
  console.log(`  -> Annuaire public: ${annuaire ? annuaire.length : 0} agents visibles. Erreur: ${annErr ? annErr.message : 'Aucune'}`);

  // 2. Profil Public : Conseils santé & Écoute citoyenne
  console.log("\n2. TEST INTERFACE PUBLIQUE : Conseils santé & Boîte à idées...");
  const { data: conseils, error: consErr } = await client.from('conseils_sante').select('*').limit(5);
  console.log(`  -> Conseils santé: ${conseils ? conseils.length : 0} trouvés. Erreur: ${consErr ? consErr.message : 'Aucune'}`);

  // 3. Test Étanchéité RLS sur Données Médicales Sensibles (Anonyme)
  console.log("\n3. TEST SÉCURITÉ : Tentative d'accès anonyme aux fiches de surveillance...");
  const { data: alr, error: alrErr } = await client.from('alertes_communautaires').select('id, type_evenement').limit(5);
  console.log(`  -> Alertes communautaires: ${alr ? alr.length : 0} fiches exposées. (Bloqué RLS: ${alrErr ? 'OUI (' + alrErr.message + ')' : (alr && alr.length === 0 ? 'OUI (0 ligne renvoyée)' : 'NON !')})`);

  const { data: cas, error: casErr } = await client.from('cas_identite_privee').select('*').limit(5);
  console.log(`  -> Cas identité privée: ${cas ? cas.length : 0} exposés. (Bloqué RLS: ${casErr ? 'OUI (' + casErr.message + ')' : (cas && cas.length === 0 ? 'OUI (0 ligne renvoyée)' : 'NON !')})`);

  // 4. Test Référentiel National des 411 ASCQ
  console.log("\n4. TEST BASE DE DONNÉES : Registre National Consolidé des 411 ASCQ...");
  const { count: refCount, error: refErr } = await client.from('ascq_referentiel_national').select('*', { count: 'exact', head: true });
  console.log(`  -> Registre national des ASCQ: ${refCount} enregistrements. Erreur: ${refErr ? refErr.message : 'Aucune'}`);

  // 5. Test Permutations disponibles
  console.log("\n5. TEST MODULE PERMUTATIONS : Bourse aux permutations...");
  const { data: perms, error: permErr } = await client.rpc('lister_permutations_disponibles');
  console.log(`  -> Permutations actives: ${perms ? perms.length : 0}. Erreur: ${permErr ? permErr.message : 'Aucune'}`);

  // 6. Test Bibliothèque officielle
  console.log("\n6. TEST BIBLIOTHÈQUE ASCQ : Documents et protocoles...");
  const { data: docs, error: docErr } = await client.from('bibliotheque_documents').select('*');
  console.log(`  -> Documents disponibles: ${docs ? docs.length : 0}. Erreur: ${docErr ? docErr.message : 'Aucune'}`);

  console.log("\n=================================================================");
  console.log("   FIN DU BANC D'ESSAI AUTOMATISÉ");
  console.log("=================================================================");
}

testerPlateforme();
