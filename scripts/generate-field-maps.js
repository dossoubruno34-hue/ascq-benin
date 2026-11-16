const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'src', 'lib', 'pdf-superposition', 'field-maps');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// 1. CARTE 01 : REGISTRE DES ALERTES ET RUMEURS COMMUNAUTAIRES
const carte01 = {
  id: "BJ_REGISTRE_ALERTES",
  titre: "Registre des alertes et rumeurs communautaires",
  modelePdf: "/modeles-officiels/modele_01_registre_alertes_relais.pdf",
  format: "A4",
  pageLargeur: 595.32,
  pageHauteur: 841.92,
  lignesParPage: 11,
  champsEnTete: [
    { id: "zone_sanitaire", page: 1, x: 135, y: 694.5, largeur: 90, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 25 },
    { id: "commune", page: 1, x: 280, y: 694.5, largeur: 95, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 25 },
    { id: "arrondissement", page: 1, x: 450, y: 694.5, largeur: 105, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 25 },
    { id: "centre_sante", page: 1, x: 200, y: 679.1, largeur: 350, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 60 },
    { id: "village", page: 1, x: 105, y: 663.6, largeur: 445, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 70 },
    { id: "mois", page: 1, x: 100, y: 648.0, largeur: 290, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 25 },
    { id: "annee", page: 1, x: 442, y: 648.0, largeur: 110, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 10 }
  ],
  colonnesTableau: [
    { id: "numero", x: 73, largeur: 18, alignement: "center", police: "bold", taille: 9, type: "nombre", maxCaracteres: 4 },
    { id: "type_code", x: 95, largeur: 108, alignement: "center", police: "bold", taille: 9, type: "texte", maxCaracteres: 20 },
    { id: "date_survenue", x: 208, largeur: 66, alignement: "center", police: "regular", taille: 8.5, type: "texte", maxCaracteres: 12 },
    { id: "lieu_detection", x: 279, largeur: 81, alignement: "left", police: "regular", taille: 8.5, type: "texte", maxCaracteres: 22 },
    { id: "nb_personnes_touchees", x: 364, largeur: 60, alignement: "center", police: "bold", taille: 9, type: "nombre", maxCaracteres: 6 },
    { id: "nb_personnes_decedees", x: 428, largeur: 60, alignement: "center", police: "bold", taille: 9, type: "nombre", maxCaracteres: 6 },
    { id: "mesure_prise", x: 492, largeur: 63, alignement: "center", police: "regular", taille: 8.5, type: "texte", maxCaracteres: 15 }
  ],
  // 11 rangées par page avec y de base descendant
  yRangées: [572, 532, 492, 452, 412, 372, 332, 292, 252, 212, 172]
};

// 2. CARTE 02 : FICHE DE NOTIFICATION DES ALERTES COMMUNAUTAIRES (ASCQ)
const carte02 = {
  id: "BJ_NOTIFICATION_ALERTE",
  titre: "Fiche de notification des alertes communautaires",
  modelePdf: "/modeles-officiels/modele_02_notification_alerte_ascq.pdf",
  format: "A4",
  pageLargeur: 595.32,
  pageHauteur: 841.92,
  champs: [
    { id: "point_focal_nom", page: 1, x: 290, y: 677.6, largeur: 235, hauteur: 12, police: "bold", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 50 },
    { id: "telephone", page: 1, x: 160, y: 658.8, largeur: 130, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 20 },
    { id: "arrondissement", page: 1, x: 372, y: 658.8, largeur: 155, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 30 },
    { id: "commune", page: 1, x: 100, y: 632.4, largeur: 85, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 25 },
    { id: "zone_sanitaire", page: 1, x: 265, y: 632.4, largeur: 260, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 45 },
    { id: "date_notification_jour", page: 1, x: 235, y: 601.4, largeur: 22, hauteur: 12, police: "bold", taille: 9.5, alignement: "center", type: "date_jour", maxCaracteres: 2 },
    { id: "date_notification_mois", page: 1, x: 270, y: 601.4, largeur: 22, hauteur: 12, police: "bold", taille: 9.5, alignement: "center", type: "date_mois", maxCaracteres: 2 },
    { id: "date_notification_annee", page: 1, x: 304, y: 601.4, largeur: 25, hauteur: 12, police: "bold", taille: 9.5, alignement: "center", type: "date_annee", maxCaracteres: 4 },
    { id: "type_maladie", page: 1, x: 340, y: 577.3, largeur: 185, hauteur: 12, police: "bold", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 45 },
    { id: "date_survenue", page: 1, x: 200, y: 546.6, largeur: 325, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 40 },
    { id: "date_detection", page: 1, x: 325, y: 513.7, largeur: 200, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 35 },
    { id: "lieu_provenance", page: 1, x: 50, y: 468.0, largeur: 475, hauteur: 20, police: "regular", taille: 9, alignement: "left", type: "multiligne", maxCaracteres: 120 },
    { id: "nb_personnes_touchees", page: 1, x: 245, y: 430.8, largeur: 280, hauteur: 12, police: "bold", taille: 9.5, alignement: "left", type: "nombre", maxCaracteres: 15 },
    { id: "deces_presence_nb", page: 1, x: 230, y: 401.8, largeur: 295, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 25 },
    { id: "animaux_impliques", page: 1, x: 285, y: 368.5, largeur: 240, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 20 },
    { id: "evenement_en_cours", page: 1, x: 330, y: 335.1, largeur: 195, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 20 },
    { id: "mesures_prises", page: 1, x: 50, y: 285.0, largeur: 475, hauteur: 60, police: "regular", taille: 9, alignement: "left", type: "multiligne", maxCaracteres: 300 },
    { id: "signature_nom", page: 1, x: 420, y: 180.0, largeur: 130, hauteur: 12, police: "bold", taille: 9.5, alignement: "center", type: "texte", maxCaracteres: 35 }
  ]
};

// 3. CARTE 03 : NOTIFICATION DES DECES EN COMMUNAUTE
const carte03 = {
  id: "BJ_NOTIFICATION_DECES",
  titre: "BJ_FORMULAIRE DE NOTIFICATION DES DECES EN COMMUNAUTE",
  modelePdf: "/modeles-officiels/modele_03_notification_deces.pdf",
  format: "A4",
  pageLargeur: 595.56,
  pageHauteur: 842.04,
  champs: [
    { id: "annee", page: 1, x: 74, y: 777.0, largeur: 40, hauteur: 12, police: "bold", taille: 9.5, alignement: "center", type: "texte", maxCaracteres: 6 },
    { id: "semaine_epidemio", page: 1, x: 298, y: 777.0, largeur: 35, hauteur: 12, police: "bold", taille: 9.5, alignement: "center", type: "texte", maxCaracteres: 4 },
    { id: "mois", page: 1, x: 460, y: 777.0, largeur: 90, hauteur: 12, police: "regular", taille: 9.5, alignement: "center", type: "texte", maxCaracteres: 20 },
    { id: "npi_defunt", page: 1, x: 170, y: 747.1, largeur: 190, hauteur: 12, police: "bold", taille: 9, alignement: "left", type: "texte", maxCaracteres: 30 },
    { id: "numero_deces", page: 1, x: 420, y: 747.1, largeur: 110, hauteur: 12, police: "bold", taille: 9, alignement: "left", type: "texte", maxCaracteres: 20 },
    // Section 1
    { id: "departement", page: 1, x: 92, y: 711.7, largeur: 130, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 25 },
    { id: "zone_sanitaire", page: 1, x: 300, y: 711.7, largeur: 265, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 45 },
    { id: "commune", page: 1, x: 80, y: 692.6, largeur: 125, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 25 },
    { id: "arrondissement", page: 1, x: 285, y: 692.6, largeur: 140, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 25 },
    { id: "village", page: 1, x: 472, y: 692.6, largeur: 95, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 25 },
    { id: "numero_grappe", page: 1, x: 92, y: 673.3, largeur: 45, hauteur: 12, police: "bold", taille: 9.5, alignement: "center", type: "texte", maxCaracteres: 8 },
    { id: "adresse", page: 1, x: 325, y: 673.3, largeur: 240, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 60 },
    // Section 2
    { id: "nom_prenoms_defunt", page: 1, x: 185, y: 653.1, largeur: 380, hauteur: 12, police: "bold", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 60 },
    { id: "nom_parent", page: 1, x: 168, y: 633.9, largeur: 245, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 45 },
    { id: "telephone_parent", page: 1, x: 470, y: 633.9, largeur: 95, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 20 },
    { id: "date_naissance_jour", page: 1, x: 185, y: 614.7, largeur: 22, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "date_jour", maxCaracteres: 2 },
    { id: "date_naissance_mois", page: 1, x: 214, y: 614.7, largeur: 22, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "date_mois", maxCaracteres: 2 },
    { id: "date_naissance_annee", page: 1, x: 242, y: 614.7, largeur: 45, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "date_annee", maxCaracteres: 4 },
    { id: "age_annees", page: 1, x: 230, y: 594.5, largeur: 25, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 3 },
    { id: "age_mois", page: 1, x: 227, y: 575.4, largeur: 25, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 3 },
    { id: "age_jours", page: 1, x: 220, y: 556.2, largeur: 25, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 3 },
    { id: "sexe_m", page: 1, x: 57.0, y: 532.6, largeur: 9.6, hauteur: 16, type: "case_a_cocher" },
    { id: "sexe_f", page: 1, x: 80.9, y: 532.6, largeur: 9.6, hauteur: 16, type: "case_a_cocher" },
    { id: "gps_longitude", page: 1, x: 322, y: 532.6, largeur: 80, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 15 },
    { id: "gps_latitude", page: 1, x: 468, y: 532.6, largeur: 95, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 15 },
    // Casier type décès
    { id: "type_deces_code", page: 1, x: 92, y: 496.4, largeur: 40, hauteur: 12, police: "bold", taille: 11, alignement: "center", type: "nombre", maxCaracteres: 2 },
    // Dates décès et notification
    { id: "date_deces_jour", page: 1, x: 100, y: 388.0, largeur: 20, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "date_jour", maxCaracteres: 2 },
    { id: "date_deces_mois", page: 1, x: 124, y: 388.0, largeur: 20, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "date_mois", maxCaracteres: 2 },
    { id: "date_deces_annee", page: 1, x: 150, y: 388.0, largeur: 40, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "date_annee", maxCaracteres: 4 },
    { id: "date_notification_jour", page: 1, x: 384, y: 388.0, largeur: 20, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "date_jour", maxCaracteres: 2 },
    { id: "date_notification_mois", page: 1, x: 408, y: 388.0, largeur: 20, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "date_mois", maxCaracteres: 2 },
    { id: "date_notification_annee", page: 1, x: 434, y: 388.0, largeur: 40, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "date_annee", maxCaracteres: 4 },
    { id: "date_saisie_jour", page: 1, x: 138, y: 364.0, largeur: 20, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "date_jour", maxCaracteres: 2 },
    { id: "date_saisie_mois", page: 1, x: 162, y: 364.0, largeur: 20, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "date_mois", maxCaracteres: 2 },
    { id: "date_saisie_annee", page: 1, x: 188, y: 364.0, largeur: 40, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "date_annee", maxCaracteres: 4 },
    // Section 3 : Casiers
    { id: "lieu_deces_code", page: 1, x: 98, y: 310.7, largeur: 24, hauteur: 12, police: "bold", taille: 11, alignement: "center", type: "nombre", maxCaracteres: 2 },
    { id: "lieu_pays_etranger", page: 1, x: 140, y: 207.9, largeur: 140, hauteur: 10, police: "regular", taille: 8.5, alignement: "left", type: "texte", maxCaracteres: 25 },
    { id: "lieu_autre_precision", page: 1, x: 110, y: 196.0, largeur: 170, hauteur: 10, police: "regular", taille: 8.5, alignement: "left", type: "texte", maxCaracteres: 30 },
    { id: "circonstances_code", page: 1, x: 478, y: 310.7, largeur: 32, hauteur: 12, police: "bold", taille: 11, alignement: "center", type: "nombre", maxCaracteres: 2 },
    { id: "circonstances_autre_precision", page: 1, x: 385, y: 196.0, largeur: 180, hauteur: 10, police: "regular", taille: 8.5, alignement: "left", type: "texte", maxCaracteres: 35 },
    { id: "cause_probable_cim10", page: 1, x: 495, y: 169.8, largeur: 60, hauteur: 12, police: "bold", taille: 10, alignement: "center", type: "texte", maxCaracteres: 10 },
    // Notificateur
    { id: "notificateur_nom", page: 1, x: 90, y: 115.6, largeur: 215, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 40 },
    { id: "notificateur_titre", page: 1, x: 342, y: 115.6, largeur: 100, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 20 },
    { id: "notificateur_structure", page: 1, x: 72, y: 90.6, largeur: 258, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 50 },
    { id: "notificateur_telephone", page: 1, x: 390, y: 90.6, largeur: 175, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 20 },
    { id: "signature_date", page: 1, x: 140, y: 65.8, largeur: 300, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 50 }
  ]
};

// 4. CARTE 04 : FICHE D'INVESTIGATION DES EVENEMENTS DE SANTE (ASCQ) V14.11.2025
const carte04 = {
  id: "BJ_INVESTIGATION_EVENEMENT",
  titre: "10_BJ_Fiche d’investigation des événements de santé par les Agents de Santé Communautaires Qualifiés (ASCQ)_V14.11.2025",
  modelePdf: "/modeles-officiels/modele_04_investigation_evenement_v14.11.2025.pdf",
  format: "A4",
  pageLargeur: 595.32,
  pageHauteur: 841.92,
  champs: [
    { id: "departement", page: 1, x: 236, y: 691.0, largeur: 310, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 50 },
    { id: "zone_sanitaire", page: 1, x: 236, y: 676.4, largeur: 310, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 50 },
    { id: "commune", page: 1, x: 236, y: 661.7, largeur: 310, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 50 },
    { id: "arrondissement", page: 1, x: 236, y: 647.1, largeur: 310, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 50 },
    { id: "village", page: 1, x: 236, y: 632.4, largeur: 310, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 50 },
    { id: "relais_nom", page: 1, x: 236, y: 617.7, largeur: 310, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 50 },
    { id: "relais_tel", page: 1, x: 236, y: 603.0, largeur: 310, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 30 },
    { id: "ascq_nom", page: 1, x: 236, y: 588.4, largeur: 310, hauteur: 12, police: "bold", taille: 9, alignement: "left", type: "texte", maxCaracteres: 50 },
    { id: "ascq_tel", page: 1, x: 236, y: 573.8, largeur: 310, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 30 },
    { id: "gps", page: 1, x: 236, y: 559.1, largeur: 310, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 40 },
    { id: "evenement_avere", page: 1, x: 236, y: 544.5, largeur: 310, hauteur: 12, police: "bold", taille: 9, alignement: "left", type: "texte", maxCaracteres: 10 },
    { id: "source_info", page: 1, x: 236, y: 529.8, largeur: 310, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 60 },
    { id: "maladie_evenement", page: 1, x: 236, y: 515.2, largeur: 310, hauteur: 12, police: "bold", taille: 9, alignement: "left", type: "texte", maxCaracteres: 60 },
    { id: "description_evenement", page: 1, x: 236, y: 468.0, largeur: 310, hauteur: 40, police: "regular", taille: 8.5, alignement: "left", type: "multiligne", maxCaracteres: 200 },
    { id: "circonstances_survenue", page: 1, x: 236, y: 412.0, largeur: 310, hauteur: 40, police: "regular", taille: 8.5, alignement: "left", type: "multiligne", maxCaracteres: 200 },
    { id: "date_survenue", page: 1, x: 236, y: 389.0, largeur: 310, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 30 },
    { id: "date_notification", page: 1, x: 236, y: 363.0, largeur: 310, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 30 },
    { id: "date_investigation", page: 1, x: 236, y: 344.0, largeur: 310, hauteur: 12, police: "regular", taille: 9, alignement: "left", type: "texte", maxCaracteres: 30 },
    // Tranches d'âge cas
    { id: "cas_0_11m_m", page: 1, x: 380, y: 314.5, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "cas_0_11m_f", page: 1, x: 380, y: 299.8, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "cas_1_5a_m", page: 1, x: 380, y: 285.2, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "cas_1_5a_f", page: 1, x: 380, y: 270.5, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "cas_6_15a_m", page: 1, x: 380, y: 255.9, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "cas_6_15a_f", page: 1, x: 380, y: 241.2, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "cas_plus_15a_m", page: 1, x: 380, y: 226.6, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "cas_plus_15a_f", page: 1, x: 380, y: 211.9, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    // Tranches d'âge décès
    { id: "deces_0_11m_m", page: 1, x: 380, y: 182.6, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "deces_0_11m_f", page: 1, x: 380, y: 168.0, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "deces_1_5a_m", page: 1, x: 380, y: 153.3, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "deces_1_5a_f", page: 1, x: 380, y: 138.7, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "deces_6_15a_m", page: 1, x: 380, y: 124.0, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "deces_6_15a_f", page: 1, x: 380, y: 109.4, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "deces_plus_15a_m", page: 1, x: 380, y: 94.7, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "deces_plus_15a_f", page: 1, x: 380, y: 80.1, largeur: 50, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "nombre", maxCaracteres: 6 },
    // Synthèse et signature
    { id: "synthese_actions", page: 1, x: 236, y: 44.0, largeur: 310, hauteur: 30, police: "regular", taille: 8.5, alignement: "left", type: "multiligne", maxCaracteres: 150 },
    { id: "signature_investigateurs", page: 1, x: 240, y: 15.0, largeur: 300, hauteur: 12, police: "bold", taille: 9, alignement: "center", type: "texte", maxCaracteres: 50 }
  ]
};

// 5. CARTE 05 : RAPPORT HEBDOMADAIRE DE LA SURVEILLANCE A BASE COMMUNAUTAIRE (ASCQ) V29.05.2025
const carte05 = {
  id: "BJ_RAPPORT_HEBDOMADAIRE",
  titre: "BJ_RAPPORT HEBDOMADAIRE DE LA SURVEILLANCE A BASE COMMUNUTAIRE_V29.05.2025",
  modelePdf: "/modeles-officiels/modele_05_rapport_hebdomadaire_v29.05.2025.pdf",
  format: "A4",
  pageLargeur: 595.32,
  pageHauteur: 841.92,
  champs: [
    { id: "departement", page: 1, x: 90, y: 742.4, largeur: 80, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 20 },
    { id: "zone_sanitaire", page: 1, x: 248, y: 742.4, largeur: 310, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 50 },
    { id: "commune", page: 1, x: 75, y: 715.5, largeur: 95, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 20 },
    { id: "arrondissement", page: 1, x: 254, y: 715.5, largeur: 75, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 20 },
    { id: "village", page: 1, x: 370, y: 715.5, largeur: 190, hauteur: 12, police: "regular", taille: 9.5, alignement: "left", type: "texte", maxCaracteres: 35 },
    { id: "semaine_num", page: 1, x: 80, y: 678.9, largeur: 50, hauteur: 12, police: "bold", taille: 10, alignement: "center", type: "nombre", maxCaracteres: 4 },
    { id: "date_debut_jour", page: 1, x: 315, y: 678.9, largeur: 20, hauteur: 12, police: "bold", taille: 9.5, alignement: "center", type: "date_jour", maxCaracteres: 2 },
    { id: "date_debut_mois", page: 1, x: 354, y: 678.9, largeur: 20, hauteur: 12, police: "bold", taille: 9.5, alignement: "center", type: "date_mois", maxCaracteres: 2 },
    { id: "date_fin_jour", page: 1, x: 414, y: 678.9, largeur: 20, hauteur: 12, police: "bold", taille: 9.5, alignement: "center", type: "date_jour", maxCaracteres: 2 },
    { id: "date_fin_mois", page: 1, x: 445, y: 678.9, largeur: 20, hauteur: 12, police: "bold", taille: 9.5, alignement: "center", type: "date_mois", maxCaracteres: 2 },
    { id: "date_fin_annee", page: 1, x: 475, y: 678.9, largeur: 40, hauteur: 12, police: "bold", taille: 9.5, alignement: "center", type: "date_annee", maxCaracteres: 4 },
    // Synthèse alertes
    { id: "alertes_detectees", page: 1, x: 465, y: 632.0, largeur: 100, hauteur: 14, police: "bold", taille: 10, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "personnes_touchees", page: 1, x: 465, y: 614.5, largeur: 100, hauteur: 14, police: "bold", taille: 10, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "personnes_decedees", page: 1, x: 465, y: 597.0, largeur: 100, hauteur: 14, police: "bold", taille: 10, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "alertes_verifiees_48h", page: 1, x: 465, y: 579.5, largeur: 100, hauteur: 14, police: "bold", taille: 10, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "alertes_averees", page: 1, x: 465, y: 562.0, largeur: 100, hauteur: 14, police: "bold", taille: 10, alignement: "center", type: "nombre", maxCaracteres: 6 },
    // Synthèse décès
    { id: "deces_maternels", page: 1, x: 465, y: 527.0, largeur: 100, hauteur: 14, police: "bold", taille: 10, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "deces_neonatals", page: 1, x: 465, y: 509.5, largeur: 100, hauteur: 14, police: "bold", taille: 10, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "deces_infantiles", page: 1, x: 465, y: 492.0, largeur: 100, hauteur: 14, police: "bold", taille: 10, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "deces_infanto_juveniles", page: 1, x: 465, y: 474.5, largeur: 100, hauteur: 14, police: "bold", taille: 10, alignement: "center", type: "nombre", maxCaracteres: 6 },
    { id: "deces_plus_5_ans", page: 1, x: 465, y: 457.0, largeur: 100, hauteur: 14, police: "bold", taille: 10, alignement: "center", type: "nombre", maxCaracteres: 6 },
    // Signature
    { id: "signature_rapporteur", page: 1, x: 380, y: 48.0, largeur: 180, hauteur: 12, police: "bold", taille: 9.5, alignement: "center", type: "texte", maxCaracteres: 35 }
  ],
  // 28 lignes pointillées pour "Actions menées"
  lignesPointillees: {
    xDebut: 28,
    largeur: 535,
    hauteurLigne: 12.0,
    yBaselines: [
      416.4, 404.4, 392.6, 380.6, 368.5, 356.5, 344.5, 332.7, 320.7, 308.7,
      296.7, 284.7, 272.7, 260.8, 248.8, 236.8, 224.8, 212.8, 200.9, 188.9,
      176.9, 164.9, 152.9, 141.0, 129.0, 117.0, 105.0, 93.0
    ],
    maxLignes: 28
  }
};

fs.writeFileSync(path.join(OUT_DIR, 'carte_01_registre_alertes.json'), JSON.stringify(carte01, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'carte_02_notification_alerte.json'), JSON.stringify(carte02, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'carte_03_notification_deces.json'), JSON.stringify(carte03, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'carte_04_investigation_evenement.json'), JSON.stringify(carte04, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'carte_05_rapport_hebdomadaire.json'), JSON.stringify(carte05, null, 2));

console.log('Les 5 cartes JSON ont été générées avec succès dans :', OUT_DIR);
