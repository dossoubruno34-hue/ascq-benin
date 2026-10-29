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

async function inspectBruno() {
  const { data, error } = await client
    .from('utilisateurs')
    .select('id, telephone, nom, prenoms, poste, role_technique, statut_compte, departement_id, zone_sanitaire_id, commune_id, arrondissement_id')
    .eq('telephone', '+2290169031463');

  console.log("Bruno user:", data, "error:", error);

  if (data && data.length > 0) {
    const u = data[0];
    if (u.departement_id) {
      const { data: dep } = await client.from('departements').select('nom').eq('id', u.departement_id).single();
      console.log("Dep nom:", dep);
    }
    if (u.commune_id) {
      const { data: com } = await client.from('communes').select('nom').eq('id', u.commune_id).single();
      console.log("Com nom:", com);
    }
    if (u.arrondissement_id) {
      const { data: arr } = await client.from('arrondissements').select('nom').eq('id', u.arrondissement_id).single();
      console.log("Arr nom:", arr);
    }
    if (u.zone_sanitaire_id) {
      const { data: zs } = await client.from('zones_sanitaires').select('nom').eq('id', u.zone_sanitaire_id).single();
      console.log("ZS nom:", zs);
    }
  }
}

inspectBruno();
