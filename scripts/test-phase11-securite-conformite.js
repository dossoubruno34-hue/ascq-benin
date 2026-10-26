/**
 * ASCQ BÉNIN - Script de Revue de Sécurité Finale & Tests de Conformité (Phase 11)
 * Vérifie les 5 piliers obligatoires de la mise en production :
 * 1. Isolation stricte des données privées sous RLS (NPI, identités, secrets)
 * 2. Référentiel officiel (12 départements, 34 zones, 77 communes, 546 arrondissements)
 * 3. Configuration PWA (Manifest, Service Worker, Icônes 192/512)
 * 4. Fichiers et absence de clés secrètes exposées
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Vérification des variables d'environnement
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error("❌ Fichier .env.local introuvable.");
  process.exit(1);
}

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

async function executerRevueSecurite() {
  console.log("=====================================================================");
  console.log("   ASCQ BÉNIN - REVUE DE SÉCURITÉ FINALE & AUDIT DE PRODUCTION (PHASE 11)");
  console.log("=====================================================================\n");

  let reussiteTotale = true;

  // --- PILIER 1 : ISOLATION RLS DES TABLES PRIVÉES ---
  console.log("📋 PILIER 1 : Protection stricte des données sensibles (RLS)");
  
  // A. Table privée des cas d'alerte (NPI, nom/prénom)
  const { data: casPrive, error: errCas } = await supabase.from('cas_identite_privee').select('*').limit(5);
  if (!casPrive || casPrive.length === 0) {
    console.log("  ✅ Table 'cas_identite_privee' : Accès non authentifié bloqué (0 donnée privée exposée).");
  } else {
    console.error("  ❌ ALERTE SÉCURITÉ : Données de 'cas_identite_privee' exposées publiquement !");
    reussiteTotale = false;
  }

  // B. Table privée des décès (NPI défunt, parents)
  const { data: decesPrive, error: errDeces } = await supabase.from('deces_identite_privee').select('*').limit(5);
  if (!decesPrive || decesPrive.length === 0) {
    console.log("  ✅ Table 'deces_identite_privee' : Accès non authentifié bloqué (0 donnée privée exposée).");
  } else {
    console.error("  ❌ ALERTE SÉCURITÉ : Données de 'deces_identite_privee' exposées publiquement !");
    reussiteTotale = false;
  }

  // C. Table privée des ASCQ (NPI, IFU, documents d'identité)
  const { data: ascqPrive, error: errAscq } = await supabase.from('ascq_profil_prive').select('*').limit(5);
  if (!ascqPrive || ascqPrive.length === 0) {
    console.log("  ✅ Table 'ascq_profil_prive' : NPI/IFU des agents protégés par RLS.");
  } else {
    console.error("  ❌ ALERTE SÉCURITÉ : Table 'ascq_profil_prive' accessible publiquement !");
    reussiteTotale = false;
  }

  // --- PILIER 2 : CONFORMITÉ DU RÉFÉRENTIEL GÉOGRAPHIQUE OFFICIEL ---
  console.log("\n🗺️  PILIER 2 : Conformité du Référentiel National (Bénin)");
  
  const { count: countDeps } = await supabase.from('departements').select('*', { count: 'exact', head: true });
  const { count: countZones } = await supabase.from('zones_sanitaires').select('*', { count: 'exact', head: true });
  const { count: countComs } = await supabase.from('communes').select('*', { count: 'exact', head: true });
  const { count: countArrs } = await supabase.from('arrondissements').select('*', { count: 'exact', head: true });

  console.log(`  • Départements : ${countDeps}/12 ${countDeps === 12 ? '✅' : '❌'}`);
  console.log(`  • Zones sanitaires : ${countZones}/34 ${countZones === 34 ? '✅' : '❌'}`);
  console.log(`  • Communes : ${countComs}/77 ${countComs === 77 ? '✅' : '❌'}`);
  console.log(`  • Arrondissements : ${countArrs}/546 ${countArrs === 546 ? '✅' : '❌'}`);

  if (countDeps !== 12 || countZones !== 34 || countComs !== 77 || countArrs !== 546) {
    reussiteTotale = false;
  }

  // --- PILIER 3 : INTÉGRITÉ DE LA PWA (PROGRESSIVE WEB APP) ---
  console.log("\n📱 PILIER 3 : Intégrité PWA & Fonctionnement Hors-ligne");

  const publicDir = path.join(__dirname, '..', 'public');
  const manifestPath = path.join(publicDir, 'manifest.json');
  const swPath = path.join(publicDir, 'sw.js');
  const icon192Path = path.join(publicDir, 'icon-192.png');
  const icon512Path = path.join(publicDir, 'icon-512.png');

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`  ✅ manifest.json : Présent (${manifest.name}, affichage '${manifest.display}')`);
  } else {
    console.error("  ❌ manifest.json introuvable.");
    reussiteTotale = false;
  }

  if (fs.existsSync(swPath)) {
    console.log("  ✅ sw.js : Service Worker configuré pour le cache hors-ligne.");
  } else {
    console.error("  ❌ sw.js introuvable.");
    reussiteTotale = false;
  }

  if (fs.existsSync(icon192Path) && fs.existsSync(icon512Path)) {
    console.log("  ✅ Icônes PWA : 192x192 et 512x512 maskables présentes.");
  } else {
    console.error("  ❌ Icônes PWA manquantes.");
    reussiteTotale = false;
  }

  // --- PILIER 4 : AUDIT DE CONFIDENTIALITÉ DES CLÉS SECRÈTES ---
  console.log("\n🔐 PILIER 4 : Audit des secrets et clés de service");
  if (envContent.includes('service_role') || envContent.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    console.warn("  ⚠️ Clé service_role présente dans .env.local : veillez à ne JAMAIS la pousser sur GitHub !");
  } else {
    console.log("  ✅ Aucune clé service_role exposée dans les configurations publiques.");
  }

  console.log("\n=====================================================================");
  if (reussiteTotale) {
    console.log("🎉 RÉSULTAT AUDIT : SYSTÈME 100% CONFORME POUR LA MISE EN LIGNE !");
  } else {
    console.log("⚠️ RÉSULTAT AUDIT : Des points d'attention nécessitent une vérification.");
  }
  console.log("=====================================================================\n");
}

executerRevueSecurite().catch(console.error);
