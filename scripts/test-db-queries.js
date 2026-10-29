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

async function testPublicData() {
  console.log("=== TEST CONSEILS SANTE ===");
  const { data: conseils, error: cErr } = await client
    .from('conseils_sante')
    .select('id, titre, categorie, est_publie')
    .limit(5);
  console.log("Conseils sante:", conseils ? conseils.length : 0, "Error:", cErr?.message || "none");

  console.log("\n=== TEST BIBLIOTHEQUE DOCUMENTS ===");
  const { data: biblio, error: bErr } = await client
    .from('bibliotheque_documents')
    .select('id, titre, categorie, est_actif')
    .limit(5);
  console.log("Bibliotheque docs:", biblio ? biblio.length : 0, "Error:", bErr?.message || "none");

  console.log("\n=== TEST CASCADES GEOGRAPHIQUES ===");
  const [depRes, zsRes, comRes] = await Promise.all([
    client.from('departements').select('id, nom').limit(3),
    client.from('zones_sanitaires').select('id, nom').limit(3),
    client.from('communes').select('id, nom').limit(3),
  ]);
  console.log("Departements:", depRes.data?.length, "Zones:", zsRes.data?.length, "Communes:", comRes.data?.length);
}

testPublicData();
