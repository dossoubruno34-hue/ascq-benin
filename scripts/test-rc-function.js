const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  console.log("Vérification de la table relais_communautaires...");
  const { data, error } = await supabase.from('relais_communautaires').select('*').limit(1);
  if (error) {
    console.error("Erreur lecture relais_communautaires:", error);
  } else {
    console.log("Lecture relais_communautaires réussie:", data);
  }
}

test();
