// =====================================================================
// GUIDE OFFICIEL DES MALADIES À SURVEILLANCE COMMUNAUTAIRE (SIMR)
// ET CALENDRIER VACCINAL EN VIGUEUR AU BÉNIN (PEV - MINISTÈRE DE LA SANTÉ)
// =====================================================================

export interface MaladieSimr {
  id: string;
  nom: string;
  categorieId: "epidemies" | "elimination" | "sante_publique" | "portee_internationale";
  categorieNom: string;
  badgeUrgence: "URGENCE_IMMEDIATE" | "ELIMINATION" | "SANTE_PUBLIQUE" | "ALERTE_MONDIALE";
  description: string; // "C'est quoi ?"
  signesAlerte: string[]; // "Signes qui alertent"
  contexteBenin: string; // Contexte épidémiologique béninois
  conduiteAscq: string; // Ce que l'ASCQ et le Relais doivent faire
  boutonAlerte: boolean;
}

export interface VaccinEtape {
  agePeriode: string;
  vaccins: {
    sigle: string;
    nomComplet: string;
    voie: string;
  }[];
  maladiesCiblees: string;
  observations: string;
}

export interface LigneGrilleVaccinale {
  nom: string;
  nomComplet: string;
  categorie: "VACCIN" | "PREVENTION" | "NUTRITION";
  couleurLigne?: "PALUDISME" | "TPIN" | "VITAMINE_A" | "FIEVRE_JAUNE" | "STANDARD";
  doses: {
    naissance?: string;
    s6?: string;
    s10?: string;
    s14?: string;
    m6?: string;
    m7?: string;
    m8?: string;
    m9?: string;
    m12?: string;
    m15?: string;
    m18?: string;
    m22?: string;
    m24?: string;
  };
}

export const COLONNES_AGES_CALENDRIER = [
  { id: "naissance", label: "Naissance", short: "Naiss." },
  { id: "s6", label: "6 semaines", short: "6 sem" },
  { id: "s10", label: "10 semaines", short: "10 sem" },
  { id: "s14", label: "14 semaines", short: "14 sem" },
  { id: "m6", label: "6 mois", short: "6 m" },
  { id: "m7", label: "7 mois", short: "7 m" },
  { id: "m8", label: "8 mois", short: "8 m" },
  { id: "m9", label: "9 mois", short: "9 m" },
  { id: "m12", label: "12 mois", short: "12 m" },
  { id: "m15", label: "15 mois", short: "15 m" },
  { id: "m18", label: "18 mois", short: "18 m" },
  { id: "m22", label: "22 mois", short: "22 m" },
  { id: "m24", label: "24 mois", short: "24 m" },
];

export const LIGNES_GRILLE_OFFICIELLE_UNICEF: LigneGrilleVaccinale[] = [
  {
    nom: "BCG",
    nomComplet: "Bacille de Calmette et Guérin (Tuberculose formes graves)",
    categorie: "VACCIN",
    doses: { naissance: "①" },
  },
  {
    nom: "Dose de Naissance HepB",
    nomComplet: "Hépatite B monovalente (à administrer dans les 24h de vie)",
    categorie: "VACCIN",
    doses: { naissance: "①" },
  },
  {
    nom: "Polio orale (VPO)",
    nomComplet: "Vaccin Poliomyélitique Oral (Gouttes)",
    categorie: "VACCIN",
    doses: { naissance: "⓪", s6: "①", s10: "②", s14: "③" },
  },
  {
    nom: "DTP-HepB-Hib (penta)",
    nomComplet: "Pentavalent (Diphtérie, Tétanos, Coqueluche, Hépatite B, Hib)",
    categorie: "VACCIN",
    doses: { s6: "①", s10: "②", s14: "③" },
  },
  {
    nom: "Pneumocoque conj. (VPC)",
    nomComplet: "Vaccin Pneumococcique Conjugué (Pneumonie, Méningite)",
    categorie: "VACCIN",
    doses: { s6: "①", s10: "②", s14: "③" },
  },
  {
    nom: "Rotavirus",
    nomComplet: "Vaccin anti-Rotavirus (Diarrhées aiguës sévères)",
    categorie: "VACCIN",
    doses: { s6: "①", s10: "②" },
  },
  {
    nom: "Polio inactivé (VPI)",
    nomComplet: "Vaccin Poliomyélitique Inactivé injectable",
    categorie: "VACCIN",
    doses: { s14: "①" },
  },
  {
    nom: "SP-IPTi",
    nomComplet: "Sulfadoxine-Pyriméthamine (Traitement Préventif Intermittent)",
    categorie: "PREVENTION",
    doses: { s10: "①", s14: "②", m9: "③" },
  },
  {
    nom: "Rougeole-Rubéole (RR)",
    nomComplet: "Vaccin combiné Rougeole et Rubéole",
    categorie: "VACCIN",
    doses: { m9: "①", m15: "②" },
  },
  {
    nom: "Fièvre jaune (VAA)",
    nomComplet: "Vaccin Anti-Amaril (protection conférée à vie)",
    categorie: "VACCIN",
    couleurLigne: "FIEVRE_JAUNE",
    doses: { m9: "①" },
  },
  {
    nom: "Paludisme (VAP)",
    nomComplet: "Vaccin antipaludique pédiatrique (RTS,S ou R21)",
    categorie: "VACCIN",
    couleurLigne: "PALUDISME",
    doses: { m6: "①", m7: "②", m9: "③", m18: "④" },
  },
  {
    nom: "TPIn+",
    nomComplet: "Traitement Préventif Intermittent du nourrisson plus",
    categorie: "PREVENTION",
    couleurLigne: "TPIN",
    doses: { s10: "①", s14: "②", m6: "③", m9: "④", m12: "⑤", m15: "⑥", m18: "⑦", m22: "⑧", m24: "⑨" },
  },
  {
    nom: "Vitamine A",
    nomComplet: "Supplémentation semestrielle en Vitamine A (100 000 / 200 000 UI)",
    categorie: "NUTRITION",
    couleurLigne: "VITAMINE_A",
    doses: { m6: "①", m12: "②", m18: "③", m24: "④" },
  },
  {
    nom: "Surveillance de la croissance",
    nomComplet: "Suivi mensuel de la courbe de poids et Périmètre Brachial",
    categorie: "NUTRITION",
    doses: { m12: "①", m18: "②" },
  },
  {
    nom: "Vermifuges",
    nomComplet: "Déparasitage semestriel (Albendazole ou Mébendazole)",
    categorie: "PREVENTION",
    doses: { m12: "①", m18: "②", m24: "③" },
  },
  {
    nom: "Distribution de MILD",
    nomComplet: "Moustiquaire Imprégnée d'Insecticide à Longue Durée d'Action",
    categorie: "PREVENTION",
    doses: { naissance: "①" },
  },
];

// ---------------------------------------------------------------------
// 1. CALENDRIER VACCINAL EN VIGUEUR AU BÉNIN (PEV / MINISTÈRE DE LA SANTÉ)
// ---------------------------------------------------------------------
export const CALENDRIER_VACCINAL_BENIN: {
  introduction: string;
  nourrisson: VaccinEtape[];
  ciblesSpeciales: {
    cible: string;
    vaccin: string;
    schema: string;
    justification: string;
  }[];
  directivesTerrain: string[];
} = {
  introduction:
    "Le calendrier vaccinal de routine en vigueur au Bénin, établi par le Programme Élargi de Vaccination (PEV) sous l'égide du Ministère de la Santé et avec l'appui de l'OMS et de l'UNICEF, comprend les antigènes systématiques chez le nourrisson, la jeune fille et la femme enceinte. Il intègre notamment le vaccin antipaludique (VAP) introduit en routine nationale.",
  nourrisson: [
    {
      agePeriode: "Naissance (dans les 24 premières heures de vie)",
      vaccins: [
        { sigle: "BCG", nomComplet: "Bacille de Calmette et Guérin", voie: "Intradermique" },
        { sigle: "VPO-0", nomComplet: "Vaccin Poliomyélitique Oral (dose zéro)", voie: "Orale (gouttes)" },
        { sigle: "HepB-0", nomComplet: "Hépatite B (dose monovalente de naissance)", voie: "Intramusculaire" }
      ],
      maladiesCiblees: "Tuberculose (formes graves miliaires et méningées), Poliomyélite, Hépatite B périnatale.",
      observations:
        "À administrer idéalement dans les 24h suivant l'accouchement pour bloquer la transmission mère-enfant de l'hépatite B."
    },
    {
      agePeriode: "6 semaines (1 mois ½)",
      vaccins: [
        { sigle: "Penta-1", nomComplet: "Pentavalent 1 (DTC-HepB-Hib)", voie: "Intramusculaire (cuisse gauche)" },
        { sigle: "VPO-1", nomComplet: "Vaccin Poliomyélitique Oral 1", voie: "Orale" },
        { sigle: "VPC-13-1", nomComplet: "Vaccin Pneumococcique Conjugué 13-valent 1", voie: "Intramusculaire (cuisse droite)" },
        { sigle: "Rota-1", nomComplet: "Vaccin antirotavirus 1", voie: "Orale" }
      ],
      maladiesCiblees:
        "Diphtérie, Tétanos, Coqueluche, Hépatite B, Infections invasives à Haemophilus influenzae type b, Poliomyélite, Pneumonies et méningites à pneumocoque, Gastro-entérites graves à Rotavirus.",
      observations: "Début de la primo-vaccination systématique en centre de santé ou en stratégie avancée."
    },
    {
      agePeriode: "10 semaines (2 mois ½)",
      vaccins: [
        { sigle: "Penta-2", nomComplet: "Pentavalent 2 (DTC-HepB-Hib)", voie: "Intramusculaire" },
        { sigle: "VPO-2", nomComplet: "Vaccin Poliomyélitique Oral 2", voie: "Orale" },
        { sigle: "VPC-13-2", nomComplet: "Vaccin Pneumococcique Conjugué 13-valent 2", voie: "Intramusculaire" },
        { sigle: "Rota-2", nomComplet: "Vaccin antirotavirus 2", voie: "Orale" }
      ],
      maladiesCiblees: "Rappels de la 2ᵉ série pour consolider l'immunité contre les 8 pathologies ciblées.",
      observations: "Respecter au minimum 4 semaines d'intervalle avec la première série."
    },
    {
      agePeriode: "14 semaines (3 mois ½)",
      vaccins: [
        { sigle: "Penta-3", nomComplet: "Pentavalent 3 (DTC-HepB-Hib)", voie: "Intramusculaire" },
        { sigle: "VPO-3", nomComplet: "Vaccin Poliomyélitique Oral 3", voie: "Orale" },
        { sigle: "VPC-13-3", nomComplet: "Vaccin Pneumococcique Conjugué 13-valent 3", voie: "Intramusculaire" },
        { sigle: "VPI-1", nomComplet: "Vaccin Poliomyélitique Inactivé injectable", voie: "Intramusculaire" },
        { sigle: "Rota-3", nomComplet: "Vaccin antirotavirus 3 (selon le conditionnement national)", voie: "Orale" }
      ],
      maladiesCiblees: "Clôture de la primo-vaccination de base et renforcement renforcé contre le poliovirus.",
      observations: "Le VPI injectable apporte une protection essentielle contre les souches dérivées du poliovirus."
    },
    {
      agePeriode: "6 mois",
      vaccins: [
        { sigle: "VAP-1", nomComplet: "Vaccin Antipaludique 1 (RTS,S ou R21/Matrix-M)", voie: "Intramusculaire" },
        { sigle: "Vitamine A", nomComplet: "Supplémentation en Vitamine A (100 000 UI)", voie: "Orale" }
      ],
      maladiesCiblees: "Paludisme chez le nourrisson (forme grave), renforcement de l'immunité générale et vision.",
      observations: "Le Bénin déploie le vaccin antipaludique dans les zones sanitaires prioritaires du PEV."
    },
    {
      agePeriode: "7 mois",
      vaccins: [
        { sigle: "VAP-2", nomComplet: "Vaccin Antipaludique 2", voie: "Intramusculaire" }
      ],
      maladiesCiblees: "Paludisme chez le nourrisson (2ᵉ dose).",
      observations: "À administrer un mois après la 1ère dose de VAP."
    },
    {
      agePeriode: "9 mois",
      vaccins: [
        { sigle: "RR-1", nomComplet: "Vaccin combiné Rougeole - Rubéole 1", voie: "Sous-cutanée" },
        { sigle: "VAA", nomComplet: "Vaccin Anti-Amaril (Fièvre jaune)", voie: "Sous-cutanée" },
        { sigle: "Men A", nomComplet: "Vaccin conjugué contre le Méningocoque A (MenAfriVac)", voie: "Intramusculaire" },
        { sigle: "VAP-3", nomComplet: "Vaccin Antipaludique 3", voie: "Intramusculaire" }
      ],
      maladiesCiblees: "Rougeole, Rubéole, Fièvre jaune (protection à vie), Méningite à méningocoque A, Paludisme (3ᵉ dose).",
      observations: "Pivot crucial de l'immunisation de l'enfant. La dose de VAA confère une immunité protectrice à vie."
    },
    {
      agePeriode: "15 mois",
      vaccins: [
        { sigle: "RR-2", nomComplet: "Vaccin combiné Rougeole - Rubéole 2", voie: "Sous-cutanée" }
      ],
      maladiesCiblees: "Rougeole et rubéole (rappel).",
      observations: "Rappel capital pour éliminer définitivement la circulation de la rougeole dans la communauté."
    },
    {
      agePeriode: "18 mois",
      vaccins: [
        { sigle: "VAP-4", nomComplet: "Vaccin Antipaludique 4", voie: "Intramusculaire" }
      ],
      maladiesCiblees: "Paludisme chez le jeune enfant (4ᵉ dose de consolidation).",
      observations: "Assure la prolongation de la protection antipaludique chez le jeune enfant."
    }
  ],
  ciblesSpeciales: [
    {
      cible: "Jeunes filles adolescentes (âgées de 9 à 14 ans)",
      vaccin: "Vaccin contre le Papillomavirus humain (HPV)",
      schema: "1 à 2 doses selon le protocole national en milieu scolaire et communautaire.",
      justification: "Prévention primaire essentielle contre le cancer du col de l'utérus, première cause de mortalité par cancer chez la femme au Bénin."
    },
    {
      cible: "Femmes enceintes / Femmes en âge de procréer (15 à 49 ans)",
      vaccin: "Vaccin Td (Tétanos - Diphtérie)",
      schema: "5 doses selon le calendrier : Td1 au 1er contact, Td2 à 4 semaines, Td3 à 6 mois, Td4 à 1 an, Td5 à 1 an.",
      justification: "Protection de la mère lors de l'accouchement et élimination du tétanos maternel et néonatal (TMN)."
    }
  ],
  directivesTerrain: [
    "Vérifier systématiquement le carnet de santé de l'enfant lors de chaque visite à domicile par le Relais Communautaire.",
    "Repérer et enregistrer immédiatement les enfants « zéro-dose » (qui n'ont reçu aucun vaccin) et les sous-vaccinés.",
    "Orienter sans délai les parents vers le Centre de Santé le plus proche ou lors des séances de stratégie avancée.",
    "Surveiller et notifier toute Manifestation Post-Vaccinale Indésirable (MAPI) : forte fièvre, abcès au point d'injection, convulsions, éruption.",
    "Sensibiliser les leaders religieux, chefs de village et associations de mères pour dissiper les rumeurs et fausses informations sur les vaccins."
  ]
};

// ---------------------------------------------------------------------
// 2. GUIDE DES MALADIES À SURVEILLER DANS LA COMMUNAUTÉ (SIMR BÉNIN)
// ---------------------------------------------------------------------
export const GUIDE_MALADIES_SIMR: MaladieSimr[] = [
  // ==================== 1. MALADIES À POTENTIEL ÉPIDÉMIQUE ====================
  {
    id: "cholera",
    nom: "Choléra",
    categorieId: "epidemies",
    categorieNom: "1. Maladies à potentiel épidémique",
    badgeUrgence: "URGENCE_IMMEDIATE",
    description: "Infection intestinale très contagieuse et brutale due à de l'eau ou des aliments contaminés par des matières fécales. Elle entraîne une perte d'eau massive capable d'entraîner la mort par déshydratation en quelques heures.",
    signesAlerte: [
      "Diarrhée aqueuse abondante et foudroyante ressemblant à de « l'eau de riz »",
      "Vomissements fréquents et incoercibles",
      "Soif intense, sécheresse de la bouche et fatigue extrême",
      "Perte de conscience ou crampes musculaires violentes"
    ],
    contexteBenin: "Surveillance prioritaire dans les zones lacustres et fluviales (Lac Nokoué, fleuve Ouémé, So-Ava, Sèmè-Podji, Malanville, Grand-Popo, Cotonou). Risque accru lors de la saison des pluies et des inondations.",
    conduiteAscq: "1. Déclencher immédiatement l'alerte sanitaire. 2. Faire boire d'urgence de la Solution de Réhydratation Orale (SRO) à petites gorgées. 3. Transférer d'urgence vers le centre de santé / unité de traitement choléra. 4. Isoler et désinfecter les latrines et le linge à l'eau de Javel.",
    boutonAlerte: true
  },
  {
    id: "lassa",
    nom: "Fièvre hémorragique de Lassa",
    categorieId: "epidemies",
    categorieNom: "1. Maladies à potentiel épidémique",
    badgeUrgence: "URGENCE_IMMEDIATE",
    description: "Fièvre hémorragique virale aiguë transmise par les rongeurs péri-domestiques (rats Mastomys natalensis) par leurs déjections ou leurs urines. Très dangereuse, elle se propage ensuite d'une personne à l'autre par contact avec les liquides biologiques.",
    signesAlerte: [
      "Fièvre brutale qui ne cède pas aux antipaludiques",
      "Maux de gorge sévères avec gorge rouge et ulcères",
      "Douleurs thoraciques, musculaires et abdominales",
      "Vomissements, yeux rouges (conjonctivite)",
      "Saignements inexpliqués par la bouche, le nez, l'anus ou sous la peau (stade avancé)"
    ],
    contexteBenin: "Endémique dans le Nord et Centre Bénin (départements du Borgou, Alibori, Collines, Donga). Pic habituel en saison sèche (décembre à avril) avec la chasse aux rats et le brûlis des champs.",
    conduiteAscq: "1. Alerte rouge immédiate. 2. NE PAS TOUCHER le malade sans équipement de protection individuel (EPI). 3. Isoler le malade. 4. Conserver les aliments dans des récipients métalliques fermés et sensibiliser à ne pas consommer ni manipuler de rats.",
    boutonAlerte: true
  },
  {
    id: "meningite",
    nom: "Méningite bactérienne cérébro-spinale",
    categorieId: "epidemies",
    categorieNom: "1. Maladies à potentiel épidémique",
    badgeUrgence: "URGENCE_IMMEDIATE",
    description: "Infection bactérienne gravissime des méninges (enveloppes du cerveau et de la moelle épinière). Elle se transmet par les gouttelettes de toux et les éternuements, avec un risque élevé de décès ou de séquelles neurologiques (surdité, handicap).",
    signesAlerte: [
      "Fièvre très élevée d'apparition brutale",
      "Raideur douloureuse de la nuque (incapacité de coller le menton sur la poitrine)",
      "Maux de tête intolérables et sensibilité excessive à la lumière (photophobie)",
      "Vomissements en jet sans nausée préalable",
      "Chez le nourrisson : fontanelle bombée et tendue, refus de téter, gémissements plaintifs"
    ],
    contexteBenin: "Le Bénin fait partie de la ceinture de la méningite. Départements à haut risque : Atacora, Donga, Alibori, Borgou, Collines. Période critique : saison sèche avec poussière d'harmattan (décembre à mai).",
    conduiteAscq: "1. Alerte immédiate au centre de santé de rattrapage. 2. Évacuation d'urgence pour ponction lombaire et antibiothérapie immédiate. 3. Dépistage des contacts pour antibioprophylaxie de cercle.",
    boutonAlerte: true
  },
  {
    id: "dengue",
    nom: "Dengue",
    categorieId: "epidemies",
    categorieNom: "1. Maladies à potentiel épidémique",
    badgeUrgence: "URGENCE_IMMEDIATE",
    description: "Maladie virale aiguë transmise par la piqûre de moustiques tigres (Aedes aegypti) piquant principalement le jour. Elle peut évoluer vers une forme hémorragique mortelle.",
    signesAlerte: [
      "Fièvre élevée et soudaine",
      "Douleur caractéristique derrière les yeux (rétro-orbitaire)",
      "Douleurs intenses des os, des articulations et des muscles (« fièvre brise-os »)",
      "Éruption cutanée (petits boutons rouges)",
      "Signes d'alarme : saignements de gencives, vomissements persistants, mal de ventre violent"
    ],
    contexteBenin: "Épidémies récurrentes en milieu urbain et périurbain (Grand Nokoué, Cotonou, Abomey-Calavi, Porto-Novo, Parakou), favorisées par les dépôts d'eau stagnante (pneus usés, canaris, gouttières).",
    conduiteAscq: "1. Signaler tout cas suspect. 2. Proscrire formellement l'aspirine et l'ibuprofène (risque majeur d'hémorragie). 3. Sensibiliser à la destruction systématique des gîtes larvaires péri-domestiques.",
    boutonAlerte: true
  },
  {
    id: "mpox",
    nom: "Mpox (Variole du singe)",
    categorieId: "epidemies",
    categorieNom: "1. Maladies à potentiel épidémique",
    badgeUrgence: "URGENCE_IMMEDIATE",
    description: "Maladie virale zoonotique réémergente transmissible de certains animaux sauvages à l'homme, puis d'humain à humain par contact étroit de peau à peau, gouttelettes respiratoires ou manipulation d'objets contaminés.",
    signesAlerte: [
      "Fièvre avec gonflement douloureux des ganglions (cou, aisselle, aine)",
      "Maux de tête, douleurs musculaires et fatigue",
      "Éruption cutanée débutant souvent sur le visage puis s'étendant aux paumes des mains, plantes des pieds et parties génitales",
      "Les boutons se transforment en cloques remplies de pus puis en croûtes"
    ],
    contexteBenin: "Surveillance renforcée dans toutes les communes et zones frontalières suite aux alertes sanitaires sous-régionales en Afrique de l'Ouest.",
    conduiteAscq: "1. Alerter immédiatement le Médecin Coordonnateur de Zone Sanitaire (MCZS). 2. Isoler le patient. 3. Éviter tout contact direct avec les lésions sans gants. 4. Identifier et lister les personnes contacts.",
    boutonAlerte: true
  },
  {
    id: "fievre_jaune",
    nom: "Fièvre jaune",
    categorieId: "epidemies",
    categorieNom: "1. Maladies à potentiel épidémique",
    badgeUrgence: "URGENCE_IMMEDIATE",
    description: "Arbovirose aiguë grave transmise par les moustiques Aedes. Elle débute comme un état grippal puis peut basculer vers une phase toxique avec ictère (jaunisse) et hémorragies fatales.",
    signesAlerte: [
      "Fièvre brutale avec frissons et maux de tête",
      "Jaunissement des yeux et de la peau (ictère) survenant après quelques jours",
      "Urines très sombres (couleur bière)",
      "Vomissements de sang noirâtre (« vomito negro ») et saignements cutanés"
    ],
    contexteBenin: "Le Bénin est en zone d'endémie amarile. La vaccination systématique à 9 mois (VAA) est obligatoire et confère une protection à vie.",
    conduiteAscq: "1. Notification immédiate. 2. Isoler le patient sous moustiquaire pour empêcher les moustiques de propager le virus. 3. Vérifier le statut vaccinal de la communauté et organiser le rattrapage.",
    boutonAlerte: true
  },
  {
    id: "ebola_marburg",
    nom: "Fièvres à virus Ebola et Marburg",
    categorieId: "epidemies",
    categorieNom: "1. Maladies à potentiel épidémique",
    badgeUrgence: "ALERTE_MONDIALE",
    description: "Infections virales hautement létales (jusqu'à 90% de mortalité). Contamination par la viande de brousse (chauves-souris, singes) ou par contact direct avec les liquides corporels d'un malade ou d'un défunt.",
    signesAlerte: [
      "Fièvre d'apparition foudroyante, abattement complet",
      "Douleurs musculaires, articulaires et céphalées intenses",
      "Diarrhée et vomissements incoercibles",
      "Hémorragies internes et externes massives (saignements orificiels)"
    ],
    contexteBenin: "Alerte maximale permanente aux postes frontières terrestres, maritimes et aéroportuaires. Aucun cas toléré.",
    conduiteAscq: "1. Alerte rouge absolue. 2. INTERDICTION STRICTE DE TOUCHER LE PATIENT OU LE DÉFUNT. 3. Délimiter un périmètre de sécurité et attendre les équipes d'intervention rapide formées aux enterrements sécurisés.",
    boutonAlerte: true
  },
  {
    id: "diarrhee_sanglante",
    nom: "Diarrhée sanglante (Shigellose)",
    categorieId: "epidemies",
    categorieNom: "1. Maladies à potentiel épidémique",
    badgeUrgence: "URGENCE_IMMEDIATE",
    description: "Infection bactérienne aiguë du côlon transmise par les mains sales, l'eau ou des aliments souillés par des excréments.",
    signesAlerte: [
      "Selles glairo-sanglantes (présence visible de sang rouge et de glaires)",
      "Douleurs abdominales violentes avec crampes et épreintes",
      "Envies continuelles d'aller à la selle (ténesme)",
      "Fièvre"
    ],
    contexteBenin: "Fréquente dans les zones à faible assainissement et lors des marchés ruraux. Menace particulièrement les enfants malnutris.",
    conduiteAscq: "1. Alerter et référer au centre de santé pour traitement antibiotique adapté. 2. Réhydrater au SRO. 3. Sensibiliser au lavage systématique des mains au savon.",
    boutonAlerte: true
  },
  {
    id: "covid19_iras",
    nom: "COVID-19 & Infections Respiratoires Aiguës Sévères (IRAS)",
    categorieId: "epidemies",
    categorieNom: "1. Maladies à potentiel épidémique",
    badgeUrgence: "URGENCE_IMMEDIATE",
    description: "Affections virales transmissibles par voie aérienne pouvant causer une détresse respiratoire aiguë chez les sujets âgés ou vulnérables.",
    signesAlerte: [
      "Fièvre, toux sèche ou grasse",
      "Difficulté à respirer ou essoufflement rapide",
      "Perte brutale du goût (agueusie) ou de l'odorat (anosmie)",
      "Fatigue intense et douleurs musculaires"
    ],
    contexteBenin: "Surveillance sentinelle continue dans les formations sanitaires et chez les pèlerins ou voyageurs.",
    conduiteAscq: "1. Référer au centre de santé pour test de dépistage. 2. Recommander l'aération, le port du masque et l'isolement du cas suspect.",
    boutonAlerte: false
  },
  {
    id: "fievre_typhoide",
    nom: "Fièvre typhoïde",
    categorieId: "epidemies",
    categorieNom: "1. Maladies à potentiel épidémique",
    badgeUrgence: "URGENCE_IMMEDIATE",
    description: "Infection bactérienne généralisée due à Salmonella enterica, transmise par ingestion d'eau ou aliments contaminés par des matières fécales.",
    signesAlerte: [
      "Fièvre continue montant en marche d'escalier sur plusieurs jours",
      "Maux de tête intenses, insomnie et abattement (tuphos)",
      "Douleurs abdominales avec constipation puis diarrhée « jus de melon »",
      "Risque d'hémorragie ou de perforation digestive"
    ],
    contexteBenin: "Endémique dans les agglomérations et zones où l'accès à l'eau potable contrôlée reste limité.",
    conduiteAscq: "1. Référer pour bilan sanguin et antibiothérapie. 2. Promouvoir la désinfection de l'eau de boisson (chlore ou ébullition).",
    boutonAlerte: false
  },
  {
    id: "anthrax",
    nom: "Anthrax (Charbon bactéridien)",
    categorieId: "epidemies",
    categorieNom: "1. Maladies à potentiel épidémique",
    badgeUrgence: "URGENCE_IMMEDIATE",
    description: "Zoonose due à Bacillus anthracis transmise par contact avec des animaux infectés ou consommation de viande issue d'animaux morts de maladie.",
    signesAlerte: [
      "Pustule cutanée devenant une croûte noire charbonneuse indolore avec œdème",
      "En cas d'ingestion : violentes douleurs de ventre, vomissements de sang et diarrhée",
      "En cas d'inhalation : détresse respiratoire sévère"
    ],
    contexteBenin: "Surveillance accrue dans les zones pastorales du Nord (Alibori, Borgou, Atacora) lors de la transhumance et du dépeçage d'animaux morts.",
    conduiteAscq: "1. Alerte conjointe santé humaine et vétérinaire. 2. Interdire formellement la consommation de viande d'animaux morts de cause inconnue.",
    boutonAlerte: true
  },
  {
    id: "brucellose",
    nom: "Brucellose",
    categorieId: "epidemies",
    categorieNom: "1. Maladies à potentiel épidémique",
    badgeUrgence: "URGENCE_IMMEDIATE",
    description: "Infection transmise par le lait cru non pasteurisé, les fromages locaux (wagashi) non bouillis ou le contact avec des produits d'avortement de bétail.",
    signesAlerte: [
      "Fièvre ondulante qui monte et descend sur plusieurs semaines",
      "Sueurs nocturnes abondantes d'odeur caractéristique de paille mouillée",
      "Douleurs des articulations et fatigue tenace"
    ],
    contexteBenin: "Zones d'élevage bovin et marchés à bétail. Risque lié à la consommation de lait cru ou de wagashi non pasteurisé.",
    conduiteAscq: "1. Référer au centre de santé. 2. Sensibiliser à faire bouillir systématiquement le lait de vache avant consommation.",
    boutonAlerte: false
  },
  {
    id: "chikungunya_zika",
    nom: "Chikungunya & Zika",
    categorieId: "epidemies",
    categorieNom: "1. Maladies à potentiel épidémique",
    badgeUrgence: "URGENCE_IMMEDIATE",
    description: "Arboviroses transmises par les moustiques Aedes. Le Zika peut causer des microcéphalies congénitales chez les bébés nés de mères infectées.",
    signesAlerte: [
      "Fièvre d'intensité variable",
      "Douleurs articulaires très invalidantes obligeant le malade à se courber (Chikungunya)",
      "Yeux rouges (conjonctivite sans pus) et éruptions cutanées (Zika)"
    ],
    contexteBenin: "Surveillance entomologique active dans le Sud et le Centre Bénin.",
    conduiteAscq: "1. Référer au centre de santé. 2. Protéger les femmes enceintes des piqûres diurnes de moustiques. 3. Détruire les réservoirs d'eau.",
    boutonAlerte: false
  },

  // ==================== 2. MALADIES À ÉLIMINER OU À ÉRADIQUER ====================
  {
    id: "poliomyelite",
    nom: "Poliomyélite (Paralysie Flasque Aiguë - PFA)",
    categorieId: "elimination",
    categorieNom: "2. Maladies à éliminer ou à éradiquer",
    badgeUrgence: "ELIMINATION",
    description: "Maladie virale hautement contagieuse transmise par voie féco-orale pouvant paralyser un enfant à vie en quelques heures. Fait l'objet d'un programme mondial d'éradication.",
    signesAlerte: [
      "Paralysie brutale et sans traumatisme d'un membre (jambe ou bras) chez un enfant de moins de 15 ans",
      "Le membre devient tout mou (flasque), l'enfant ne peut plus se tenir debout ni lever le membre",
      "Apparition souvent précédée de fièvre"
    ],
    contexteBenin: "Surveillance de haute priorité dans les 77 communes du Bénin. Chaque cas suspect de PFA doit obligatoirement faire l'objet de 2 prélèvements de selles à 24-48h d'intervalle.",
    conduiteAscq: "1. NOTIFIER IMMÉDIATEMENT AU CENTRE DE SANTÉ. 2. Aider l'équipe cadre à prélever 2 échantillons de selles dans les 14 jours suivant la paralysie. 3. Vérifier le statut vaccinal de tous les enfants du village.",
    boutonAlerte: true
  },
  {
    id: "rougeole",
    nom: "Rougeole & Rubéole",
    categorieId: "elimination",
    categorieNom: "2. Maladies à éliminer ou à éradiquer",
    badgeUrgence: "ELIMINATION",
    description: "Maladie virale respiratoire extrêmement contagieuse. Peut entraîner des complications mortelles (pneumonie, encéphalite, cécité, malnutrition sévère).",
    signesAlerte: [
      "Forte fièvre",
      "Éruption cutanée de boutons rouges débutant derrière les oreilles et sur le visage avant de gagner tout le corps",
      "Yeux rouges, larmoiement et peur de la lumière",
      "Nez qui coule et toux sèche"
    ],
    contexteBenin: "Flambées épidémiques saisonnières si la couverture vaccinale (RR-1 à 9 mois et RR-2 à 15 mois) baisse.",
    conduiteAscq: "1. Notifier immédiatement : 3 cas suspects dans un village = alerte épidémique. 2. Isoler l'enfant. 3. Donner de la Vitamine A au centre de santé pour prévenir la cécité. 4. Rattrapage vaccinal.",
    boutonAlerte: true
  },
  {
    id: "tetanos_neonatal",
    nom: "Tétanos néonatal et maternel",
    categorieId: "elimination",
    categorieNom: "2. Maladies à éliminer ou à éradiquer",
    badgeUrgence: "ELIMINATION",
    description: "Infection mortelle chez le nouveau-né causée par la bactérie Clostridium tetani introduite lors de la coupe ou du pansement du cordon avec des instruments non stériles ou des substances traditionnelles.",
    signesAlerte: [
      "Nouveau-né entre 3 et 28 jours qui tétait normalement puis devient incapable de téter",
      "Corps raide, mâchoires serrées (trismus), spasmes musculaires au moindre bruit ou contact",
      "Infection ou salissure du moignon ombilical"
    ],
    contexteBenin: "Le Bénin a validé l'élimination du TMN, mais la vigilance reste totale dans les zones rurales à fort taux d'accouchements à domicile.",
    conduiteAscq: "1. Référer d'urgence en réanimation pédiatrique. 2. Promouvoir l'accouchement en maternité et l'application exclusive de chlorhexidine sur le cordon. 3. Vérifier la vaccination Td des femmes.",
    boutonAlerte: true
  },
  {
    id: "ulcere_buruli",
    nom: "Ulcère de Buruli",
    categorieId: "elimination",
    categorieNom: "2. Maladies à éliminer ou à éradiquer",
    badgeUrgence: "ELIMINATION",
    description: "Infection mycobactérienne chronique de la peau causée par Mycobacterium ulcerans présent dans les milieux marécageux. Non soignée, elle détruit la chair et entraîne de lourdes difformités.",
    signesAlerte: [
      "Bouton sous la peau (nodule), zone dure et bombée (plaque) ou membre enflé SANS DOULEUR",
      "Puis la peau s'ouvre pour former une grande plaie aux bords décollés et indolores"
    ],
    contexteBenin: "Foyers historiques majeurs dans le Sud et Centre Bénin : communes de Lalo, Ouinhi, Bonou, Zagnanado, Pobè, Allada.",
    conduiteAscq: "1. Référencer immédiatement vers un Centre de Dépistage et de Traitement de l'Ulcère de Buruli (CDTUB). 2. Rappeler à la communauté que le traitement par antibiotiques est GRATUIT et guérit sans séquelles s'il est pris tôt.",
    boutonAlerte: true
  },
  {
    id: "lepre",
    nom: "Lèpre",
    categorieId: "elimination",
    categorieNom: "2. Maladies à éliminer ou à éradiquer",
    badgeUrgence: "ELIMINATION",
    description: "Maladie infectieuse chronique peu contagieuse transmise par les voies respiratoires après de longues années de promiscuité. Elle attaque la peau et les nerfs périphériques.",
    signesAlerte: [
      "Tache claire ou rougeâtre sur la peau qui a perdu toute sensibilité au toucher, à la douleur et au chaud",
      "Engourdissement ou faiblesse des doigts, des mains ou des pieds",
      "Plaies indolores aux pieds ou aux mains"
    ],
    contexteBenin: "Programme national d'élimination actif. Traitement par polychimiothérapie (PCT) gratuit dans tous les centres de santé.",
    conduiteAscq: "1. Référer pour test de sensibilité cutanée et mise sous PCT gratuite. 2. Combattre la stigmatisation : la lèpre se guérit complètement.",
    boutonAlerte: false
  },
  {
    id: "filariose_lymphatique",
    nom: "Filariose lymphatique (Éléphantiasis)",
    categorieId: "elimination",
    categorieNom: "2. Maladies à éliminer ou à éradiquer",
    badgeUrgence: "ELIMINATION",
    description: "Maladie parasitaire transmise par les moustiques, provoquant l'obstruction des vaisseaux lymphatiques et des gonflements monstrueux et irréversibles.",
    signesAlerte: [
      "Gonflement spectaculaire et épaississement d'une jambe ou d'un bras (éléphantiasis)",
      "Gonflement volumineux des bourses chez l'homme (hydrocèle)",
      "Épisodes répétés d'inflammation avec fièvre et peau brûlante"
    ],
    contexteBenin: "Le Bénin a mené de vastes campagnes de traitement de masse (Ivermectine + Albendazole) et est en voie de certification d'élimination.",
    conduiteAscq: "1. Identifier et recenser les porteurs d'hydrocèle pour chirurgie gratuite dans les campagnes nationales. 2. Enseigner l'hygiène des membres atteints pour éviter les surinfections.",
    boutonAlerte: false
  },
  {
    id: "onchocercose",
    nom: "Onchocercose (Cécité des rivières)",
    categorieId: "elimination",
    categorieNom: "2. Maladies à éliminer ou à éradiquer",
    badgeUrgence: "ELIMINATION",
    description: "Parasitose transmise par la piqûre de simulies (petites mouches noires vivant près des cours d'eau rapides). Les microfilaires provoquent des démangeaisons intolérables et la cécité.",
    signesAlerte: [
      "Démangeaisons intenses et lésions de grattage",
      "Peau de léopard (dépigmentation) ou peau épaissie",
      "Kystes durs sous la peau (nodules onchocerquiens)",
      "Baisse progressive de la vue jusqu'à la cécité"
    ],
    contexteBenin: "Bassins fluviaux du Mono, du Couffo et de l'Ouémé. Campagnes annuelles de distribution d'Ivermectine.",
    conduiteAscq: "1. Assurer la distribution communautaire de l'Ivermectine (Mectizan). 2. Référer les cas de nodules pour excision.",
    boutonAlerte: false
  },
  {
    id: "dracunculose",
    nom: "Dracunculose (Ver de Guinée)",
    categorieId: "elimination",
    categorieNom: "2. Maladies à éliminer ou à éradiquer",
    badgeUrgence: "ELIMINATION",
    description: "Maladie parasitaire transmise par l'eau de mare contaminée par des puces d'eau. Un long ver blanc femelle émerge douloureusement à travers la peau.",
    signesAlerte: [
      "Cloque extrêmement douloureuse, le plus souvent sur le pied ou la jambe",
      "Rupture de la cloque laissant émerger un long ver blanchâtre fin comme une ficelle"
    ],
    contexteBenin: "Le Bénin a été certifié indemne de transmission du Ver de Guinée. La surveillance reste requise (prime financière pour tout cas notifié et confirmé).",
    conduiteAscq: "1. Notification immédiate. 2. Interdire formellement au patient de plonger son membre dans une source ou mare d'eau. 3. Enrouler délicatement le ver sur une compresse.",
    boutonAlerte: true
  },
  {
    id: "noma",
    nom: "Noma (Cancrum Oris)",
    categorieId: "elimination",
    categorieNom: "2. Maladies à éliminer ou à éradiquer",
    badgeUrgence: "ELIMINATION",
    description: "Gangrène foudroyante de la face et de la bouche touchant principalement les très jeunes enfants malnutris vivant dans une extrême pauvreté.",
    signesAlerte: [
      "Gingivite avec saignement et mauvaise haleine fétide",
      "Joue gonflée et douloureuse qui noircit rapidement puis se troue",
      "Destruction rapide des tissus de la joue, des lèvres et des os"
    ],
    contexteBenin: "Zones rurales défavorisées avec forte malnutrition. Classé comme maladie tropicale négligée par l'OMS.",
    conduiteAscq: "1. Référer en extrême urgence au centre de santé : des antibiotiques simples au stade initial sauvent la vie et évitent la défiguration.",
    boutonAlerte: true
  },

  // ==================== 3. SANTÉ PUBLIQUE ET URGENCES COURANTES ====================
  {
    id: "paludisme",
    nom: "Paludisme (Simple et Grave)",
    categorieId: "sante_publique",
    categorieNom: "3. Autres maladies et problèmes de santé publique",
    badgeUrgence: "SANTE_PUBLIQUE",
    description: "Parasitose transmise par les moustiques Anophèles femelles piquant la nuit. Première cause de consultation, d'hospitalisation et de mortalité infantile au Bénin.",
    signesAlerte: [
      "Paludisme simple : Fièvre, frissons, courbatures, maux de tête, sueurs, vomissements",
      "Signes de paludisme grave (Urgence vitale) : Convulsions, coma ou perte de connaissance, prostration (enfant incapable de s'asseoir), pâleur extrême (anémie sévère), vomissements continus, urines sombres"
    ],
    contexteBenin: "Endémique sur tout le territoire national avec recrudescence en saison pluvieuse. L'ASCQ est le premier maillon du protocole PECADOM (Test de Diagnostic Rapide TDR + traitement CTA).",
    conduiteAscq: "1. Faire immédiatement un TDR. 2. Si positif et simple : administrer la Combinaison Thérapeutique à base d'Artémisinine (CTA) selon le poids. 3. Si signes de danger : administrer de l'Artésunate rectal (si disponible) et référer d'URGENCE à l'hôpital.",
    boutonAlerte: false
  },
  {
    id: "malnutrition",
    nom: "Malnutrition aiguë (Enfant de moins de 5 ans)",
    categorieId: "sante_publique",
    categorieNom: "3. Autres maladies et problèmes de santé publique",
    badgeUrgence: "SANTE_PUBLIQUE",
    description: "Carence nutritionnelle sévère menaçant directement la survie et le développement de l'enfant.",
    signesAlerte: [
      "Périmètre brachial (Ruban de Shakir) dans la zone ROUGE (< 115 mm) = Malnutrition Aiguë Sévère (MAS)",
      "Périmètre brachial dans la zone JAUNE (115 - 124 mm) = Malnutrition Aiguë Modérée (MAM)",
      "Présence d'œdèmes bilatéraux prenant le godet sur le dos des deux pieds (Kwashiorkor)",
      "Enfant extrêmement maigre avec peau plissée (Marasme), refus de manger, tristesse"
    ],
    contexteBenin: "Préoccupation majeure dans les communes rurales, particulièrement lors de la période de soudure.",
    conduiteAscq: "1. Mesurer le PB et vérifier les œdèmes lors de chaque visite à domicile. 2. Tester l'appétit avec l'Aliment Thérapeutique Prêt à l'Emploi (ATPE / Plumpy'Nut). 3. Référer au CRENAM/CRENAS de la zone.",
    boutonAlerte: false
  },
  {
    id: "pneumonie_grave",
    nom: "Pneumonie grave de l'enfant (< 5 ans)",
    categorieId: "sante_publique",
    categorieNom: "3. Autres maladies et problèmes de santé publique",
    badgeUrgence: "SANTE_PUBLIQUE",
    description: "Infection aiguë des poumons causée par des bactéries (Pneumocoque) ou des virus, principale cause infectieuse de mortalité chez le jeune enfant.",
    signesAlerte: [
      "Toux et respiration rapide (plus de 50 respirations/min chez le bébé de 2 à 11 mois, plus de 40/min de 12 à 59 mois)",
      "Tirage sous-costal (le bas de la poitrine se creuse à chaque inspiration)",
      "Battement des ailes du nez, geignement expiratoire",
      "Incapacité de téter ou de boire, léthargie"
    ],
    contexteBenin: "Complication fréquente lors des changements de saison et dans les foyers utilisant le bois de chauffe à l'intérieur des habitations.",
    conduiteAscq: "1. Si tirage ou signe de danger : RÉFÉRENCE D'URGENCE au centre de santé. 2. Si pneumonie simple : Amoxicilline dispersible selon le protocole PCIME communautaire. 3. Revoir l'enfant après 48h.",
    boutonAlerte: false
  },
  {
    id: "diarrhee_deshydratation",
    nom: "Diarrhée aiguë avec déshydratation (< 5 ans)",
    categorieId: "sante_publique",
    categorieNom: "3. Autres maladies et problèmes de santé publique",
    badgeUrgence: "SANTE_PUBLIQUE",
    description: "Émission d'au moins 3 selles liquides par jour entraînant une fuite rapide d'eau et de sels minéraux indispensables.",
    signesAlerte: [
      "Yeux enfoncés dans les orbites",
      "Pli cutané sur le ventre qui s'efface lentement",
      "Soif insatiable (boit avidement) ou au contraire enfant incapable de boire",
      "Fontanelle déprimée, absence de larmes"
    ],
    contexteBenin: "Deuxième cause de mortalité évitable chez le nourrisson au Bénin.",
    conduiteAscq: "1. Donner immédiatement la Solution de Réhydratation Orale (SRO) préparée avec de l'eau potable. 2. Prescrire du Sulfate de Zinc (20 mg/jour pendant 10 jours). 3. Poursuivre l'allaitement.",
    boutonAlerte: false
  },
  {
    id: "morsures_serpents",
    nom: "Morsures de serpents (Envenimations)",
    categorieId: "sante_publique",
    categorieNom: "3. Autres maladies et problèmes de santé publique",
    badgeUrgence: "URGENCE_IMMEDIATE",
    description: "Urgence médicale fréquente en milieu rural agricole due aux vipères (Echis ocellatus, Bitis) ou cobras, injectant un venin hémotoxique ou neurotoxique.",
    signesAlerte: [
      "Traces de crochets avec douleur aiguë et gonflement rapide qui s'étend",
      "Saignements au point de morsure, des gencives ou du nez",
      "Paupières tombantes, difficulté à parler ou à respirer (venin neurotoxique)"
    ],
    contexteBenin: "Fréquence élevée chez les agriculteurs dans les champs de coton, maïs et igname (Borgou, Atacora, Collines, Zou).",
    conduiteAscq: "1. RASSURER LE PATIENT ET L'IMMOBILISER. 2. INTERDICTIONS FORMELLES : Ne pas poser de garrot, ne pas inciser, ne pas sucer la plaie, ne pas appliquer de pierre noire ou décoctions. 3. Évacuer d'urgence vers le centre de santé pour sérum antivenimeux.",
    boutonAlerte: true
  },
  {
    id: "rage_morsures_chiens",
    nom: "Rage & Morsures de chiens",
    categorieId: "sante_publique",
    categorieNom: "3. Autres maladies et problèmes de santé publique",
    badgeUrgence: "URGENCE_IMMEDIATE",
    description: "Infection virale mortelle à 100% une fois les symptômes déclarés, transmise par la salive d'un chien, chat ou animal enragé (morsure, griffure ou léchage sur peau lésée).",
    signesAlerte: [
      "Chez l'animal : agressivité anormale, bave abondante, paralysie de la mâchoire, aboiement rauque",
      "Chez l'homme : anxiété, hydrophobie (peur panique de l'eau à la vue ou déglutition), spasmes, convulsions puis coma"
    ],
    contexteBenin: "Nombreux chiens errants non vaccinés dans les villages et quartiers urbains.",
    conduiteAscq: "1. GESTE QUI SAUVE : Laver abondamment la plaie à grande eau et au savon pendant au moins 15 minutes. 2. Désinfecter. 3. NE PAS COUDRE LA PLAIE. 4. Envoyer immédiatement au centre de santé pour vaccin antirabique. 5. Faire enfermer et surveiller le chien pendant 14 jours par les services vétérinaires.",
    boutonAlerte: true
  },
  {
    id: "deces_maternels",
    nom: "Surveillance des décès maternels et néonatals",
    categorieId: "sante_publique",
    categorieNom: "3. Autres maladies et problèmes de santé publique",
    badgeUrgence: "SANTE_PUBLIQUE",
    description: "Tout décès survenant chez une femme pendant la grossesse, lors de l'accouchement ou dans les 42 jours suivant l'accouchement.",
    signesAlerte: [
      "Saignement vaginal abondant pendant la grossesse ou après l'accouchement (hémorragie du post-partum)",
      "Forte fièvre avec pertes vaginales nauséabondes",
      "Maux de tête intenses, vision floue, gonflement des pieds et du visage (Pré-éclampsie)",
      "Convulsions (Éclampsie)"
    ],
    contexteBenin: "Priorité nationale absolue du Ministère de la Santé : audit systématique de chaque décès maternel et néonatal.",
    conduiteAscq: "1. Orienter toute femme enceinte dès les premiers signes de danger. 2. Enregistrer et notifier immédiatement tout décès communautaire de femme en âge de procréer via la fiche décès.",
    boutonAlerte: true
  },
  {
    id: "tuberculose",
    nom: "Tuberculose (TB)",
    categorieId: "sante_publique",
    categorieNom: "3. Autres maladies et problèmes de santé publique",
    badgeUrgence: "SANTE_PUBLIQUE",
    description: "Maladie bactérienne contagieuse des poumons transmise par les gouttelettes de toux dans l'air. Elle guérit grâce à un traitement antibiotique de 6 mois entièrement gratuit.",
    signesAlerte: [
      "Toux persistante depuis plus de 2 semaines",
      "Crachats contenant parfois des filets de sang",
      "Fièvre modérée le soir et sueurs abondantes la nuit",
      "Perte de poids rapide et manque d'appétit"
    ],
    contexteBenin: "Dépistage et traitement 100% gratuits dans tous les Centres de Dépistage et de Traitement de la Tuberculose (CDTL) du pays.",
    conduiteAscq: "1. Tout tousseur de plus de 14 jours est suspect : l'orienter au CDTL pour analyse des crachats (GeneXpert). 2. Accompagner le patient pour qu'il prenne ses médicaments chaque jour sans interruption (stratégie DOT).",
    boutonAlerte: false
  },
  {
    id: "aflatoxicose",
    nom: "Aflatoxicose (Maïs et arachides moisis)",
    categorieId: "sante_publique",
    categorieNom: "3. Autres maladies et problèmes de santé publique",
    badgeUrgence: "SANTE_PUBLIQUE",
    description: "Intoxication toxique du foie causée par l'ingestion de toxines produites par des champignons microscopiques sur les récoltes de maïs, d'arachides ou de manioc mal séchées.",
    signesAlerte: [
      "Perte d'appétit, nausées, vomissements répétés",
      "Ventre gonflé avec liquide (ascite)",
      "Jaunissement des yeux et de la peau (atteinte hépatique sévère)",
      "Apparition de cas similaires dans une même concession consommant le même stock de céréales"
    ],
    contexteBenin: "Problème récurrent lors du stockage en période humide dans les greniers traditionnels.",
    conduiteAscq: "1. Alerte en cas de cas groupés. 2. Sensibiliser à bien sécher les céréales et arachides au soleil et jeter tout grain présentant des moisissures verdâtres ou noirâtres.",
    boutonAlerte: false
  },
  {
    id: "hypertension_diabete",
    nom: "Hypertension artérielle & Diabète",
    categorieId: "sante_publique",
    categorieNom: "3. Autres maladies et problèmes de santé publique",
    badgeUrgence: "SANTE_PUBLIQUE",
    description: "Maladies chroniques non transmissibles en forte hausse dans la population béninoise, responsables d'accidents vasculaires cérébraux (AVC) et d'insuffisances rénales.",
    signesAlerte: [
      "HTA : Souvent silencieuse, parfois maux de tête le matin, vertiges, bourdonnements d'oreille",
      "Diabète : Soif permanente, urines très abondantes jour et nuit, faim constante, amaigrissement, plaies aux pieds qui cicatrisent mal"
    ],
    contexteBenin: "Sensibilisation accrue sur la réduction du sel, du sucre, du bouillon cube et la pratique de l'activité physique.",
    conduiteAscq: "1. Inciter au dépistage gratuit régulier de la tension et de la glycémie. 2. Référer les cas vers les centres de santé.",
    boutonAlerte: false
  },

  // ==================== 4. ÉVÉNEMENTS DE PORTÉE INTERNATIONALE ====================
  {
    id: "evenement_sanitaire_inhabituel",
    nom: "Événement sanitaire inhabituel (ESI)",
    categorieId: "portee_internationale",
    categorieNom: "4. Événements de portée internationale",
    badgeUrgence: "ALERTE_MONDIALE",
    description: "Tout phénomène anormal ou inattendu menaçant la santé collective : regroupement de décès inexpliqués, maladie inconnue, mortalité massive d'animaux domestiques ou sauvages, intoxication collective.",
    signesAlerte: [
      "Plusieurs personnes d'un même village ou famille tombant malades ou décédant en quelques jours avec les mêmes symptômes",
      "Mortalité soudaine et anormale de poulets, bovins, moutons ou oiseaux sauvages",
      "Intoxication massive après un repas de fête, une cérémonie ou la consommation d'eau d'un puits"
    ],
    contexteBenin: "Déclaration obligatoire dans le cadre du Règlement Sanitaire International (RSI) et de l'approche « One Health » (Une seule santé).",
    conduiteAscq: "1. ALERTE TÉLÉPHONIQUE IMMÉDIATE au Médecin Coordonnateur de Zone Sanitaire et à la Direction Départementale de la Santé (DDS). 2. Remplir sans délai une fiche d'alerte. 3. Sécuriser la source d'eau ou les aliments suspects.",
    boutonAlerte: true
  },
  {
    id: "sras_grippe_aviaire",
    nom: "Grippe humaine due à un nouveau sous-type & SRAS",
    categorieId: "portee_internationale",
    categorieNom: "4. Événements de portée internationale",
    badgeUrgence: "ALERTE_MONDIALE",
    description: "Nouveau virus respiratoire émergent à forte contagiosité et potentiel pandémique mondial.",
    signesAlerte: [
      "Forte fièvre et toux sèche évoluant très rapidement vers une détresse respiratoire",
      "Contexte de contact avec des volailles malades ou de voyage récent en zone d'épidémie"
    ],
    contexteBenin: "Surveillance vétérinaire et humaine conjointe aux frontières et dans les élevages avicoles.",
    conduiteAscq: "1. Alerte immédiate. 2. Isolement strict du cas suspect.",
    boutonAlerte: true
  }
];
