const fs = require('fs');
const path = require('path');
const { genererFiche: genererFichePdfSuperposee } = require('./superposition-engine');

const OUT_DIR = path.join(__dirname, '..', 'public', 'fiches-exemples-generees');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function runTests() {
  console.log('=== DÉBUT DES TESTS DE GÉNÉRATION DES 5 FICHES OFFICIELLES ===\n');

  // TEST 1 : REGISTRE AVEC 25 ALERTES (3 PAGES)
  console.log('1. Test Registre avec 25 alertes (pagination sur 3 pages)...');
  const lignes25 = [];
  for (let i = 1; i <= 25; i++) {
    lignes25.push({
      numero: i,
      type_code: `Code ${(i % 15) + 1} (Alerte ${i})`,
      date_survenue: `1${i % 9}/05/2026`,
      lieu_detection: `Hameau Akassa ${i}, Tohouès`,
      nb_personnes_touchees: (i % 4) + 1,
      nb_personnes_decedees: i === 7 ? 1 : 0,
      mesure_prise: `Code ${(i % 6) + 1} - Réf CS`
    });
  }

  const resReg = await genererFichePdfSuperposee('REG', {
    zone_sanitaire: 'Ouinhi-Zogbodomey-Bohicon',
    commune: 'Ouinhi',
    arrondissement: 'Tohouès',
    centre_sante: 'Centre de Santé Communal de Tohouès',
    village: 'Akassa & Environs',
    mois: 'Mai',
    annee: '2026',
    lignes: lignes25
  });

  fs.writeFileSync(path.join(OUT_DIR, 'BJ_REGISTRE_ALERTES_25_LIGNES_3_PAGES.pdf'), resReg.pdfBytes);
  console.log(`   -> Succès : ${resReg.nbPages} pages générées (attendu : 3 pages).`);
  console.log(`   -> Avertissements : ${resReg.warnings.length}`);

  // TEST 2 : NOTIFICATION ALERTE (ALR)
  console.log('\n2. Test Fiche de Notification Alerte (ALR)...');
  const resAlr = await genererFichePdfSuperposee('ALR', {
    point_focal_nom: 'Bruno DOSSOU (ASCQ Principal)',
    telephone: '+229 01 69 03 14 63',
    arrondissement: 'Tohouès',
    commune: 'Ouinhi',
    zone_sanitaire: 'Zou - Ouinhi',
    date_notification: '2026-05-18',
    type_maladie: 'Suspicion Choléra (Diarrhée fébrile aqueuse)',
    date_survenue: '17/05/2026 à 14h30',
    date_detection: '18/05/2026 à 07h15',
    lieu_provenance: 'Village Akassa, Hameau Zounmè, Maison Aïkolé',
    nb_personnes_touchees: 4,
    deces_presence_nb: 'OUI (1 décès constaté)',
    animaux_impliques: 'NON',
    evenement_en_cours: 'OUI (Isolement du foyer)',
    mesures_prises: 'Distribution de comprimés SRO/Zinc, désinfection des points d\'eau avec chlore, sensibilisation communautaire porte-à-porte et référence urgente vers le Centre de Santé d\'arrondissement.',
    signature_nom: 'Bruno DOSSOU'
  });

  fs.writeFileSync(path.join(OUT_DIR, 'BJ_NOTIFICATION_ALERTE_EXEMPLE.pdf'), resAlr.pdfBytes);
  console.log(`   -> Succès : ${resAlr.nbPages} page générée. Nom : ${resAlr.nomFichier}`);

  // TEST 3 : NOTIFICATION DÉCÈS (DEC)
  console.log('\n3. Test Formulaire Notification Décès en Communauté (DEC)...');
  const resDec = await genererFichePdfSuperposee('DEC', {
    annee: '2026',
    semaine_epidemio: '20',
    mois: 'Mai',
    npi_defunt: '1234567890123456',
    numero_deces: 'DEC-2026-TOH-008',
    departement: 'Zou',
    zone_sanitaire: 'Ouinhi-Zogbodomey-Bohicon',
    commune: 'Ouinhi',
    arrondissement: 'Tohouès',
    village: 'Akassa',
    numero_grappe: 'GRP-02',
    adresse: 'Concession Familiale Tossou, Akassa Centre',
    nom_prenoms_defunt: 'KOUASSI Marcelle Akpedje',
    nom_parent: 'KOUASSI Emmanuel',
    telephone_parent: '+229 01 61 87 54 74',
    date_naissance: '1998-07-14',
    age_annees: 27,
    sexe: 'F',
    gps_longitude: '2.483120',
    gps_latitude: '7.021450',
    type_deces_code: 1, // Décès maternel
    date_deces: '2026-05-16',
    date_notification: '2026-05-17',
    date_saisie: '2026-05-18',
    lieu_deces_code: 2, // Domicile
    circonstances_code: 1, // Grossesse/Accouchement
    cause_probable_cim10: 'O72.0',
    notificateur_nom: 'Hélène AIKOLE',
    notificateur_titre: 'RC (Relais Communautaire)',
    notificateur_structure: 'Arrondissement de Tohouès',
    notificateur_telephone: '+229 01 61 87 54 74',
    signature_date: 'Fait à Tohouès, le 18 Mai 2026'
  });

  fs.writeFileSync(path.join(OUT_DIR, 'BJ_NOTIFICATION_DECES_EXEMPLE.pdf'), resDec.pdfBytes);
  console.log(`   -> Succès : ${resDec.nbPages} page générée. Nom : ${resDec.nomFichier}`);

  // TEST 4 : INVESTIGATION ÉVÉNEMENT (INV)
  console.log('\n4. Test Fiche Investigation Événement (INV V14.11.2025)...');
  const resInv = await genererFichePdfSuperposee('INV', {
    departement: 'Zou',
    zone_sanitaire: 'Ouinhi-Zogbodomey-Bohicon',
    commune: 'Ouinhi',
    arrondissement: 'Tohouès',
    village: 'Akassa',
    relais_nom: 'Hélène AIKOLE',
    relais_tel: '+229 01 61 87 54 74',
    ascq_nom: 'Bruno DOSSOU',
    ascq_tel: '+229 01 69 03 14 63',
    gps: '7.021450 N, 2.483120 E',
    evenement_avere: 'Oui',
    source_info: 'Signalement Relais Communautaire lors de la visite ménage hebdomadaire',
    maladie_evenement: 'Flambée de gastro-entérite aiguë fébrile chez les enfants',
    description_evenement: 'Apparition brutale de vomissements et de selles liquides fébriles chez 5 enfants de deux concessions voisines après consommation d\'eau de puits non traitée.',
    circonstances_survenue: 'Le puits traditionnel a été contaminé lors des fortes pluies du 14 mai. Les premiers symptômes sont apparus dans la nuit du 15 au 16 mai 2026.',
    date_survenue: '15/05/2026 à 22h',
    date_notification: '16/05/2026 à 08h',
    date_investigation: '16/05/2026 à 10h',
    cas_0_11m_m: 1,
    cas_0_11m_f: 1,
    cas_1_5a_m: 2,
    cas_1_5a_f: 1,
    cas_6_15a_m: 0,
    cas_6_15a_f: 0,
    cas_plus_15a_m: 0,
    cas_plus_15a_f: 0,
    deces_0_11m_m: 0,
    deces_0_11m_f: 0,
    deces_1_5a_m: 0,
    deces_1_5a_f: 0,
    deces_6_15a_m: 0,
    deces_6_15a_f: 0,
    deces_plus_15a_m: 0,
    deces_plus_15a_f: 0,
    synthese_actions: 'Prélèvement d\'échantillons, chloration immédiate du puits avec Aquatabs, prise en charge des 5 enfants au CS de Tohouès.',
    signature_investigateurs: 'Équipe d\'enquête : Bruno DOSSOU (ASCQ) & Dr. Médecin Chef CS'
  });

  fs.writeFileSync(path.join(OUT_DIR, 'BJ_INVESTIGATION_EVENEMENT_EXEMPLE.pdf'), resInv.pdfBytes);
  console.log(`   -> Succès : ${resInv.nbPages} page générée. Nom : ${resInv.nomFichier}`);

  // TEST 5 : RAPPORT HEBDOMADAIRE (RAP V29.05.2025)
  console.log('\n5. Test Rapport Hebdomadaire (RAP V29.05.2025 avec lignes pointillées)...');
  const texteActions = [
    "1. Réunion de coordination hebdomadaire tenue avec les 12 Relais Communautaires de Tohouès.",
    "2. Visites à domicile réalisées dans 214 ménages ciblés pour le suivi nutritionnel et vaccinal.",
    "3. Investigation conjointe de 2 alertes communautaires de fièvre éruptive à Akassa : alertes vérifiées et classées non avérées.",
    "4. Dépistage actif du paludisme par TDR chez 34 enfants fébriles : 18 cas positifs traités sur place par CTA (Artéméther-Luméfantrine).",
    "5. Sensibilisation collective sur l'hygiène de l'eau, le lavage des mains au savon et l'utilisation continue des MILDA.",
    "6. Référence de 2 femmes enceintes au 3ème trimestre vers la maternité pour leur CPN4.",
    "7. Suivi rigoureux de l'approvisionnement en intrants communautaires (TDR, CTA, SRO-Zinc) avec le Médecin Coordonnateur."
  ].join("\n");

  const resRap = await genererFichePdfSuperposee('RAP', {
    departement: 'Zou',
    zone_sanitaire: 'Ouinhi-Zogbodomey-Bohicon',
    commune: 'Ouinhi',
    arrondissement: 'Tohouès',
    village: 'Akassa / Secteur 1',
    semaine_num: 20,
    date_debut_jour: '11',
    date_debut_mois: '05',
    date_fin_jour: '17',
    date_fin_mois: '05',
    date_fin_annee: '2026',
    alertes_detectees: 3,
    personnes_touchees: 7,
    personnes_decedees: 1,
    alertes_verifiees_48h: 3,
    alertes_averees: 1,
    deces_maternels: 1,
    deces_neonatals: 0,
    deces_infantiles: 0,
    deces_infanto_juveniles: 0,
    deces_plus_5_ans: 0,
    actions_menees: texteActions,
    signature_rapporteur: 'Bruno DOSSOU (ASCQ Tohouès)'
  });

  fs.writeFileSync(path.join(OUT_DIR, 'BJ_RAPPORT_HEBDOMADAIRE_EXEMPLE.pdf'), resRap.pdfBytes);
  console.log(`   -> Succès : ${resRap.nbPages} page générée. Nom : ${resRap.nomFichier}`);
  console.log(`   -> Avertissements : ${resRap.warnings.length}`);

  console.log('\n=== TOUS LES 5 MODÈLES ONT ÉTÉ GÉNÉRÉS AVEC SUCCÈS DANS public/fiches-exemples-generees/ ===');
}

runTests().catch(console.error);
