const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Lire .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  console.log("Vérification de la connexion Supabase...");
  const { data, error } = await supabase.from('departements').select('id, nom').limit(1);
  if (error) {
    console.error("Erreur departements:", error);
  } else {
    console.log("Connecté avec succès. Exemple département:", data);
  }
}

check();
