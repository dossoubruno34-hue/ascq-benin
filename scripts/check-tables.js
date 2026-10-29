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

async function check() {
  console.log("=== CHECK DB STATUS ===");
  
  // 1. Check referentiel national
  try {
    const { count, error } = await client.from('ascq_referentiel_national').select('*', { count: 'exact', head: true });
    console.log("ascq_referentiel_national count:", count, "error:", error ? error.message : "none");
  } catch (e) {
    console.log("ascq_referentiel_national exception:", e.message);
  }

  // 2. Check RPC obtenir_statistiques_tableau_de_bord
  try {
    const { data, error } = await client.rpc('obtenir_statistiques_tableau_de_bord');
    console.log("obtenir_statistiques_tableau_de_bord:", data, "error:", error ? error.message : "none");
  } catch (e) {
    console.log("obtenir_statistiques_tableau_de_bord exception:", e.message);
  }

  // 3. Check RPC lister_comptes_admin
  try {
    const { data, error } = await client.rpc('lister_comptes_admin');
    console.log("lister_comptes_admin count:", data ? data.length : 0, "error:", error ? error.message : "none");
  } catch (e) {
    console.log("lister_comptes_admin exception:", e.message);
  }
}

check();
