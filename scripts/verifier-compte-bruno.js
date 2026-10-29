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

async function verifier() {
  console.log("Vérification des comptes enregistrés...");
  
  // 1. Recherche via l'annuaire public
  const { data: annuaire, error: aErr } = await client.rpc('rechercher_annuaire_ascq', {
    p_departement_id: null,
    p_commune_id: null,
    p_arrondissement_id: null
  });
  
  console.log("Annuaire public (résultats) :", annuaire ? annuaire.length : 0, aErr ? aErr.message : "");
  if (annuaire && annuaire.length > 0) {
    annuaire.forEach(a => {
      console.log(` - ${a.nom} ${a.prenoms} | Tél: ${a.telephone} | ${a.departement_nom} > ${a.commune_nom} > ${a.arrondissement_nom}`);
    });
  }

  // 2. Vérification directe dans la table utilisateurs (si validé, la politique permet de voir son existence)
  const { data: users, error: uErr } = await client
    .from('utilisateurs')
    .select('id, telephone, nom, prenoms, role_technique, statut_compte')
    .or('telephone.ilike.%69031463%,telephone.ilike.%44485650%');

  console.log("\nUtilisateurs trouvés :", users, uErr ? uErr.message : "");
}

verifier();
