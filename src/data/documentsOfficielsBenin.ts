// =====================================================================
// DOCUMENTS OFFICIELS DE SANTÉ COMMUNAUTAIRE EN VIGUEUR AU BÉNIN
// Références vérifiées : Ministère de la Santé du Bénin, UNICEF, OMS, FAOLEX
// =====================================================================

export interface DocumentOfficiel {
  id: string;
  titre: string;
  description: string;
  categorie: "GUIDE_CLINIQUE" | "SURVEILLANCE" | "OUTIL_GESTION" | "REGLEMENTATION" | "FORMATION";
  auteur: string;
  annee?: string;
  format_fichier: string;
  lien_url: string;
  label_source: string;
  ordre_affichage: number;
}

export const DOCUMENTS_OFFICIELS_BENIN: DocumentOfficiel[] = [
  {
    id: "doc-pnsc-2020",
    titre: "Politique Nationale de Santé Communautaire au Bénin (PNSC)",
    description: "Document cadre d'orientation stratégique définissant les rôles et attributions des ASCQ et des Relais Communautaires (RC), les paquets d'activités à haut impact, la gouvernance locale et le financement pérenne.",
    categorie: "REGLEMENTATION",
    auteur: "Ministère de la Santé de la République du Bénin",
    annee: "2020-2024",
    format_fichier: "PDF",
    lien_url: "https://www.fao.org/faolex/results/details/fr/c/LEX-FAOC179042/",
    label_source: "Portail Officiel FAOLEX / République du Bénin",
    ordre_affichage: 1
  },
  {
    id: "doc-unicef-sc-equitable",
    titre: "Santé Communautaire au Bénin pour un Accès Équitable aux Soins Essentiels",
    description: "Rapport national et cadre d'action de l'UNICEF et du Ministère de la Santé pour la couverture universelle des soins aux enfants et aux femmes enceintes dans les zones rurales et périurbaines du Bénin.",
    categorie: "GUIDE_CLINIQUE",
    auteur: "UNICEF Bénin & Ministère de la Santé",
    annee: "2022",
    format_fichier: "PDF / Rapport",
    lien_url: "https://www.unicef.org/benin/reports/sant%C3%A9-communautaire-au-b%C3%A9nin-pour-un-acc%C3%A8s-%C3%A9quitable",
    label_source: "UNICEF Bénin (unicef.org)",
    ordre_affichage: 2
  },
  {
    id: "doc-pnds-benin",
    titre: "Plan National de Développement Sanitaire du Bénin (PNDS)",
    description: "Plan directeur de la politique sanitaire de la République du Bénin : axes prioritaires pour la réduction de la mortalité maternelle, néonatale et infanto-juvénile, et renforcement du premier échelon sanitaire.",
    categorie: "REGLEMENTATION",
    auteur: "Ministère de la Santé / Ministère de l'Économie et des Finances",
    annee: "2018-2025",
    format_fichier: "PDF",
    lien_url: "https://budgetscolaire.finances.bj/download/plan-national-de-developpement-sanitaire-du-benin-2018-2022/",
    label_source: "Portail des Finances et du Budget du Bénin",
    ordre_affichage: 3
  },
  {
    id: "doc-nutrition-sante-benin",
    titre: "Politique du Secteur Santé pour la Nutrition de la République du Bénin",
    description: "Cadre normatif pour la prévention de la malnutrition aiguë (MAM, MAS), le protocole de supplémentation des 1 000 premiers jours (AME, Enov'Mum+, Nutributter+, Vitamine A) et l'enrichissement de l'alimentation de complément.",
    categorie: "FORMATION",
    auteur: "Ministère de la Santé & OMS (GINA)",
    annee: "Édition Nationale",
    format_fichier: "PDF",
    lien_url: "https://extranet.who.int/nutrition/gina/fr/node/8207",
    label_source: "Organisation Mondiale de la Santé (OMS)",
    ordre_affichage: 4
  },
  {
    id: "doc-pcime-c-benin",
    titre: "Guide Pratique PCIME-C (Prise en Charge Intégrée des Maladies de l'Enfant au niveau Communautaire)",
    description: "Arbre de décision diagnostique et thérapeutique pour les ASCQ : Paludisme simple (TDR + CTA pédiatrique), Diarrhée aiguë (SRO + Sulfate de Zinc), Pneumonie simple (Amoxicilline) et critères de référence d'urgence au Centre de Santé.",
    categorie: "GUIDE_CLINIQUE",
    auteur: "Direction de la Santé de la Mère et de l'Enfant (DSME)",
    annee: "Norme Nationale",
    format_fichier: "PDF / Fiche",
    lien_url: "https://www.medbox.org/document/prise-en-charge-integree-des-maladies-de-lenfant-au-niveau-communautaire-pcime-c",
    label_source: "Medbox Global Health / OMS",
    ordre_affichage: 5
  },
  {
    id: "doc-simr-surveillance-benin",
    titre: "Directives Techniques de Surveillance Épidémiologique à Base Communautaire (SIMR Bénin)",
    description: "Directives et fiches de notification immédiate et hebdomadaire des maladies à potentiel épidémique au Bénin (Choléra, Fièvre Jaune, Méningite, Rougeole, Fièvre de Lassa, PFA/Polio) et approche 'One Health'.",
    categorie: "SURVEILLANCE",
    auteur: "Direction Nationale de la Santé Publique (DNSP)",
    annee: "3ème Édition",
    format_fichier: "PDF",
    lien_url: "https://www.afro.who.int/fr/countries/benin",
    label_source: "Bureau Pays OMS Bénin",
    ordre_affichage: 6
  },
  {
    id: "doc-snis-canevas-dhis2",
    titre: "Canevas Officiel de Collecte Hebdomadaire et Mensuelle PNSC / SNIS (DHIS2 Bénin)",
    description: "Outil standardisé d'agrégation des données des Relais Communautaires par l'ASCQ : indicateurs de consultation, références au centre de santé et GUPS, dépistage nutritionnel et suivi des mères/enfants.",
    categorie: "OUTIL_GESTION",
    auteur: "Direction des Systèmes d'Information (DSI) / Ministère de la Santé",
    annee: "2026",
    format_fichier: "Modèle Officiel",
    lien_url: "https://sante.gouv.bj",
    label_source: "Ministère de la Santé du Bénin",
    ordre_affichage: 7
  },
  {
    id: "doc-pev-calendrier-benin",
    titre: "Guide Pratique du Calendrier Vaccinal Réajusté et des Soins Préventifs de l'Enfant",
    description: "Grille officielle PEV Bénin / UNICEF : schéma à 13 âges clés de la naissance à 24 mois (BCG, Polio, Pentavalent, Pneumocoque, Rotavirus, Paludisme VAP 4 doses, Fièvre jaune, TPIn+ 9 passages, Vitamine A, Vermifuges).",
    categorie: "FORMATION",
    auteur: "Direction de la Vaccination et des Soins Préventifs (PEV Bénin)",
    annee: "2024-2026",
    format_fichier: "PDF / Affiche",
    lien_url: "https://www.unicef.org/benin",
    label_source: "PEV Bénin & UNICEF",
    ordre_affichage: 8
  }
];
