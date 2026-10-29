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

async function inspectRelais() {
  const { data: rc, error } = await client
    .from('relais_communautaires')
    .select('id, nom, prenoms, telephone, ascq_id, village_nom');

  console.log("Relais communautaires:", rc ? rc.length : 0, error);
  if (rc && rc.length > 0) {
    console.log(rc.slice(0, 5));
  }
}

inspectRelais();
