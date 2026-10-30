// =====================================================================
// RÉFÉRENTIEL CLINIQUE & PRATIQUE COMMUNAUTAIRE DU BÉNIN
// Sources Officielles :
// 1. Guide de l'Agent de Santé Communautaire - CNLS-TP Présidence du Bénin (Décembre 2020)
// 2. Guide Communautaire des Maladies sous Surveillance (SIMR & PEV - Octobre 2026)
// =====================================================================

export interface SigneOrientation {
  id: string;
  signePrincipal: string;
  descriptionSigne: string;
  maladieCible: string;
  maladieId: string;
  niveauAlerte: "URGENCE_IMMEDIATE" | "ELIMINATION" | "SANTE_PUBLIQUE" | "ALERTE_MONDIALE";
  conduiteImmediate: string;
  iconType: "fever" | "diarrhea" | "skin" | "lungs" | "neuro" | "bite" | "maternal" | "warning";
}

export interface ProtocoleSecourisme {
  id: string;
  titre: string;
  situation: string;
  gestesCles: string[];
  interdictions: string[];
  alerteNumero: string;
}

export interface FichePratiqueMaternelle {
  id: string;
  titre: string;
  periode: string;
  pointsCles: string[];
  signesDanger: string[];
  conduiteAscq: string[];
}

export interface AttributionProfil {
  poste: "ASCQ" | "RC";
  titre: string;
  missionGenerale: string;
  activitesPrincipales: string[];
  tachesTerrain: string[];
  actesInterdits: string[];
}

// ---------------------------------------------------------------------
// 1. TABLE D'ORIENTATION RAPIDE PAR LE SIGNE (« Je vois... je pense à... »)
// Reproduction fidèle de la Section 1 du Référentiel National (34 pathologies)
// ---------------------------------------------------------------------
export const TABLE_ORIENTATION_SIGNES: SigneOrientation[] = [
  {
    id: "signe-cholera",
    signePrincipal: "Diarrhée aqueuse abondante comme de « l'eau de riz »",
    descriptionSigne: "Selles très liquides, profuses, blanches/incolores, avec vomissements et soif intense.",
    maladieCible: "Choléra (Vibrio cholerae)",
    maladieId: "cholera",
    niveauAlerte: "URGENCE_IMMEDIATE",
    conduiteImmediate: "Alerte sanitaire immédiate. Réhydrater d'urgence par SRO à petites gorgées. Référer sans délai.",
    iconType: "diarrhea",
  },
  {
    id: "signe-shigellose",
    signePrincipal: "Selles avec sang et glaires (Diarrhée glairo-sanglante)",
    descriptionSigne: "Douleurs abdominales violentes avec crampes, envie continuelle d'aller à la selle (ténesme) et fièvre.",
    maladieCible: "Diarrhée sanglante – Shigellose",
    maladieId: "diarrhee_sanglante",
    niveauAlerte: "URGENCE_IMMEDIATE",
    conduiteImmediate: "Référer au centre de santé pour traitement antibiotique adapté. SRO et lavage des mains au savon.",
    iconType: "diarrhea",
  },
  {
    id: "signe-diarrhee-deshydratation",
    signePrincipal: "Diarrhée de l'enfant (< 5 ans) avec yeux enfoncés et pli cutané lent",
    descriptionSigne: "Au moins 3 selles liquides/jour, soif vive ou incapable de boire, fontanelle creuse, absence de larmes.",
    maladieCible: "Diarrhée aiguë avec déshydratation",
    maladieId: "diarrhee_deshydratation",
    niveauAlerte: "SANTE_PUBLIQUE",
    conduiteImmediate: "Préparer 1 sachet de SRO dans 1L d'eau potable. Donner SRO (50-100ml < 2 ans, 100-200ml >= 2 ans). Sulfate de Zinc pendant 10 jours.",
    iconType: "diarrhea",
  },
  {
    id: "signe-fievres-hemorragiques",
    signePrincipal: "Fièvre brutale avec saignements (nez, gencives, anus, peau)",
    descriptionSigne: "Fièvre très aiguë, abattement extrême, yeux rouges, saignements extériorisés inexpliqués.",
    maladieCible: "Ebola / Marburg / Lassa / Fièvre jaune / Dengue sévère",
    maladieId: "ebola_marburg",
    niveauAlerte: "ALERTE_MONDIALE",
    conduiteImmediate: "INTERDICTION STRICTE DE TOUCHER SANS EPI. Isoler immédiatement. Alerte téléphonique rouge au MCZS.",
    iconType: "fever",
  },
  {
    id: "signe-meningite",
    signePrincipal: "Fièvre brutale, raideur de la nuque, vomissements en jet",
    descriptionSigne: "Impossibilité de coller le menton sur la poitrine, photophobie. Nourrisson : fontanelle bombée et tendue, refus de téter.",
    maladieCible: "Méningite bactérienne cérébro-spinale",
    maladieId: "meningite",
    niveauAlerte: "URGENCE_IMMEDIATE",
    conduiteImmediate: "Alerte immédiate au centre de santé. Évacuation d'urgence pour ponction lombaire et antibiotiques rapides.",
    iconType: "neuro",
  },
  {
    id: "signe-boutons-eruptifs",
    signePrincipal: "Fièvre avec éruption cutanée de boutons ou cloques",
    descriptionSigne: "Éruption rouge débutant derrière les oreilles (rougeole) ou cloques remplies de pus avec ganglions (Mpox).",
    maladieCible: "Rougeole / Rubéole / Mpox / Dengue",
    maladieId: "rougeole",
    niveauAlerte: "ELIMINATION",
    conduiteImmediate: "Isoler le cas. Ne pas toucher les lésions sans gants. 3 cas dans un village = épidémie de rougeole. Vitamine A au centre de santé.",
    iconType: "skin",
  },
  {
    id: "signe-jaunisse",
    signePrincipal: "Yeux jaunes (Ictère) et urines foncées couleur bière",
    descriptionSigne: "Jaunissement des conjonctives et de la peau. Si fébrile : Fièvre jaune. Si groupé dans une concession sans fièvre : Aflatoxine.",
    maladieCible: "Fièvre jaune (si fièvre) ou Aflatoxicose (maïs/arachides moisis)",
    maladieId: "fievre_jaune",
    niveauAlerte: "URGENCE_IMMEDIATE",
    conduiteImmediate: "Isoler le malade sous moustiquaire MIILD (bloquer les piqûres d'Aedes). Notifier sans délai au centre de santé.",
    iconType: "warning",
  },
  {
    id: "signe-paralysie-flasque",
    signePrincipal: "Paralysie molle brutale d'un membre chez l'enfant < 15 ans",
    descriptionSigne: "Faiblesse musculaire subite sans traumatisme. Le membre devient tout mou (flasque), l'enfant ne peut plus marcher.",
    maladieCible: "Poliomyélite – Paralysie Flasque Aiguë (PFA)",
    maladieId: "poliomyelite",
    niveauAlerte: "ELIMINATION",
    conduiteImmediate: "Alerte immédiate. Un seul cas compte. Aider au prélèvement de 2 échantillons de selles à 24-48h d'intervalle dans les 14 jours.",
    iconType: "neuro",
  },
  {
    id: "signe-toux-chronique",
    signePrincipal: "Toux persistant depuis plus de 2 semaines (14 jours)",
    descriptionSigne: "Toux continue avec crachats parfois striés de sang, sueurs nocturnes abondantes, perte de poids rapide.",
    maladieCible: "Tuberculose pulmonaire (TB)",
    maladieId: "tuberculose",
    niveauAlerte: "SANTE_PUBLIQUE",
    conduiteImmediate: "Tout tousseur de plus de 14 jours doit être orienté au CDTL pour analyse des crachats (GeneXpert). Dépistage et traitement 100% gratuits.",
    iconType: "lungs",
  },
  {
    id: "signe-pneumonie-enfant",
    signePrincipal: "Toux avec respiration rapide et tirage sous-costal (< 5 ans)",
    descriptionSigne: "Le bas de la poitrine se creuse à l'inspiration. Respiration >= 60 (1-2 mois), >= 50 (2-12 mois), >= 40 (12-59 mois).",
    maladieCible: "Pneumonie aiguë sévère de l'enfant",
    maladieId: "pneumonie_grave",
    niveauAlerte: "SANTE_PUBLIQUE",
    conduiteImmediate: "Urgence vitale pédiatrique si tirage sous-costal ou geignement : référer d'urgence. Si simple : Amoxicilline PCIME.",
    iconType: "lungs",
  },
  {
    id: "signe-detresse-respiratoire-adulte",
    signePrincipal: "Fièvre, toux et difficulté respiratoire aiguë chez l'adulte",
    descriptionSigne: "Essoufflement rapide, perte brutale de l'odorat/goût, contact avec volailles malades ou pèlerinage.",
    maladieCible: "COVID-19 / IRAS / Grippe aviaire (HxNy)",
    maladieId: "covid19_iras",
    niveauAlerte: "URGENCE_IMMEDIATE",
    conduiteImmediate: "Port du masque chirurgical, aération, isolement. Référer au centre de dépistage ou appeler le numéro vert 136.",
    iconType: "lungs",
  },
  {
    id: "signe-fievre-paludisme",
    signePrincipal: "Fièvre, frissons, courbatures, corps chaud au toucher",
    descriptionSigne: "Température >= 38°C. Si convulsions, coma, prostration, urines sombres ou anémie extrême : Paludisme grave !",
    maladieCible: "Paludisme (Simple ou Grave)",
    maladieId: "paludisme",
    niveauAlerte: "SANTE_PUBLIQUE",
    conduiteImmediate: "Réaliser un Test de Diagnostic Rapide (TDR). Si positif sans gravité : CTA selon l'âge/poids. Si gravité : Artésunate rectal et référer en urgence.",
    iconType: "fever",
  },
  {
    id: "signe-peau-indolore",
    signePrincipal: "Plaie ou bosse sans douleur sur la peau (ou tache insensible)",
    descriptionSigne: "Grosse plaie aux bords décollés sans douleur (Buruli) ou tache claire insensible au chaud/douleur (Lèpre).",
    maladieCible: "Ulcère de Buruli / Lèpre (Maladie de Hansen)",
    maladieId: "ulcere_buruli",
    niveauAlerte: "ELIMINATION",
    conduiteImmediate: "Référer au CDTUB (Ulcère de Buruli) ou CTAL (Lèpre). Les traitements par antibiotiques / PCT sont entièrement gratuits.",
    iconType: "skin",
  },
  {
    id: "signe-gros-membre-elephantiasis",
    signePrincipal: "Gros gonflement monstrueux d'une jambe ou des bourses (hydrocèle)",
    descriptionSigne: "Éléphantiasis d'un membre avec épaississement de la peau, ou hydrocèle scrotale gênant la marche.",
    maladieCible: "Filariose lymphatique (Wuchereria bancrofti)",
    maladieId: "filariose_lymphatique",
    niveauAlerte: "ELIMINATION",
    conduiteImmediate: "Recenser le cas. Orienter pour hygiène cutanée à l'eau savonneuse et chirurgie gratuite de l'hydrocèle lors des campagnes nationales.",
    iconType: "skin",
  },
  {
    id: "signe-peau-lezard-vision",
    signePrincipal: "Démangeaisons intenses, peau rugueuse (lézard/léopard), nodules et baisse de la vue",
    descriptionSigne: "Kystes durs sous la peau (hanches, côtes, crâne), dépigmentation cutanée, trouble visuel progressif près d'un cours d'eau.",
    maladieCible: "Onchocercose (Cécité des rivières)",
    maladieId: "onchocercose",
    niveauAlerte: "ELIMINATION",
    conduiteImmediate: "Sensibiliser et assurer la distribution communautaire annuelle de l'Ivermectine (Mectizan). Référer pour excision des nodules.",
    iconType: "skin",
  },
  {
    id: "signe-ver-guinee",
    signePrincipal: "Cloque brûlante au pied/jambe d'où émerge un long ver blanc",
    descriptionSigne: "Cloque très douloureuse qui éclate au contact de l'eau en laissant sortir une filaire dracunculus.",
    maladieCible: "Dracunculose (Ver de Guinée)",
    maladieId: "dracunculose",
    niveauAlerte: "ELIMINATION",
    conduiteImmediate: "Alerte immédiate (prime financière prévue). INTERDICTION au patient de plonger le membre dans l'eau. Enrouler délicatement sur compresse.",
    iconType: "warning",
  },
  {
    id: "signe-noma-visage",
    signePrincipal: "Joue qui noircit, odeur fétide et trou dans la face chez l'enfant",
    descriptionSigne: "Gencives saignantes, gangrène foudroyante détruisant les tissus de la joue, des lèvres et des os de l'enfant malnutri.",
    maladieCible: "Noma (Cancrum Oris)",
    maladieId: "noma",
    niveauAlerte: "ELIMINATION",
    conduiteImmediate: "EXTRÊME URGENCE. Référer au centre de santé : les antibiotiques précoces sauvent la vie et empêchent la défiguration à vie.",
    iconType: "warning",
  },
  {
    id: "signe-tetanos-nourrisson",
    signePrincipal: "Nouveau-né qui ne tète plus, corps raide et mâchoires serrées (trismus)",
    descriptionSigne: "Entre 3 et 28 jours de vie : rictus sardonique, opisthotonos (dos arqué), spasmes au bruit, cordon ombilical infecté.",
    maladieCible: "Tétanos néonatal et maternel",
    maladieId: "tetanos_neonatal",
    niveauAlerte: "ELIMINATION",
    conduiteImmediate: "Évacuation d'urgence en réanimation pédiatrique. Promouvoir l'accouchement en maternité et l'usage exclusif de chlorhexidine 7,1% sur le cordon.",
    iconType: "neuro",
  },
  {
    id: "signe-malnutrition-shakir",
    signePrincipal: "Enfant très maigre (bras < 115 mm au ruban Shakir) ou pieds gonflés (œdèmes)",
    descriptionSigne: "Périmètre brachial rouge (< 11,5 cm) ou œdèmes prenant le godet (Kwashiorkor) ou fonte musculaire peau sur os (Marasme).",
    maladieCible: "Malnutrition Aiguë Sévère (MAS) ou Modérée (MAM)",
    maladieId: "malnutrition",
    niveauAlerte: "SANTE_PUBLIQUE",
    conduiteImmediate: "Tester l'appétit avec ATPE (Plumpy'Nut). Référer sans délai au CRENAS/CRENAM de la zone sanitaire.",
    iconType: "warning",
  },
  {
    id: "signe-morsure-serpent",
    signePrincipal: "Traces de crochets de serpent avec douleur vive et gonflement rapide",
    descriptionSigne: "Envenimation : saignements locaux ou généraux, paupières tombantes, difficulté à avaler ou respirer.",
    maladieCible: "Morsures de serpents (Envenimations)",
    maladieId: "morsures_serpents",
    niveauAlerte: "URGENCE_IMMEDIATE",
    conduiteImmediate: "Rassurer et immobiliser le membre blessé. STRICTEMENT INTERDIT : pas de garrot, pas d'incision, pas de pierre noire. Transférer d'urgence pour sérum.",
    iconType: "bite",
  },
  {
    id: "signe-morsure-chien-rage",
    signePrincipal: "Morsure ou griffure par un chien, chat ou animal errant",
    descriptionSigne: "Animal agressif ou baveux. Chez l'homme plus tard : panique de l'eau (hydrophobie), convulsions et mort à 100%.",
    maladieCible: "Rage & Morsures d'animaux",
    maladieId: "rage_morsures_chiens",
    niveauAlerte: "URGENCE_IMMEDIATE",
    conduiteImmediate: "GESTE QUI SAUVE : laver immédiatement la plaie à grande eau et savon pendant 15 minutes. Ne pas suturer. Référer pour vaccin antirabique.",
    iconType: "bite",
  },
  {
    id: "signe-anthrax-croute",
    signePrincipal: "Pustule cutanée devenant une croûte noire indolore chez un éleveur/boucher",
    descriptionSigne: "Escarre noirâtre entourée d'un œdème sans douleur après contact avec du bétail ou de la viande avariée.",
    maladieCible: "Anthrax (Charbon bactéridien)",
    maladieId: "anthrax",
    niveauAlerte: "URGENCE_IMMEDIATE",
    conduiteImmediate: "Isoler le cas, référer au centre de santé et alerter l'agent vétérinaire. Interdire strictement de consommer la viande d'animaux morts de maladie.",
    iconType: "skin",
  },
  {
    id: "signe-evenement-inhabituel",
    signePrincipal: "Plusieurs décès groupés ou maladie inconnue dans un village / mortalité animale massive",
    descriptionSigne: "Groupement de malades avec les mêmes symptômes en quelques jours, mort soudaine de volailles ou bétail, intoxication collective.",
    maladieCible: "Événement Sanitaire Inhabituel (RSI / One Health)",
    maladieId: "evenement_sanitaire_inhabituel",
    niveauAlerte: "ALERTE_MONDIALE",
    conduiteImmediate: "Alerte téléphonique immédiate au MCZS et à la DDS. Remplir la fiche d'alerte. Sécuriser les sources d'eau et les aliments suspects.",
    iconType: "warning",
  },
  {
    id: "signe-deces-maternel",
    signePrincipal: "Décès d'une femme enceinte, en couche ou dans les 42 jours après l'accouchement",
    descriptionSigne: "Survenue brutale suite à hémorragie du post-partum, fièvre puerpérale fétide, éclampsie ou anémie sévère.",
    maladieCible: "Décès maternel ou néonatal communautaire",
    maladieId: "deces_maternels",
    niveauAlerte: "SANTE_PUBLIQUE",
    conduiteImmediate: "Enregistrer et notifier immédiatement le décès communautaire au Chef Poste et à la coordination de zone pour audit maternel obligatoire.",
    iconType: "maternal",
  },
  {
    id: "signe-brucellose-lait",
    signePrincipal: "Fièvre ondulante sur plusieurs semaines avec sueurs nocturnes à odeur de paille",
    descriptionSigne: "Fièvre avec vagues ascendantes/descendantes, courbatures tenaces, notion de consommation de lait cru ou de wagashi non bouilli.",
    maladieCible: "Brucellose (Brucella abortus / melitensis)",
    maladieId: "brucellose",
    niveauAlerte: "URGENCE_IMMEDIATE",
    conduiteImmediate: "Référer au centre de santé. Sensibiliser les éleveurs et ménages à bouillir systématiquement tout lait de vache avant consommation.",
    iconType: "fever",
  },
];

// ---------------------------------------------------------------------
// 2. FICHES PROTOCOLES SECOURISME & URGENCES DOMESTIQUES (CNLS-TP 2020)
// ---------------------------------------------------------------------
export const PROTOCOLES_SECOURISME: ProtocoleSecourisme[] = [
  {
    id: "secours-hemorragie",
    titre: "Hémorragie externe et plaies graves",
    situation: "Saignement abondant ne s'arrêtant pas spontanément après blessure ou coupure.",
    gestesCles: [
      "Appliquer immédiatement un tissu propre (compresse ou pagne propre) sur la plaie et exercer une pression directe avec la main.",
      "Remplacer rapidement la compression manuelle par un TAMPON RELAIS (pansement compressif) : bande ou lien large recouvrant toute la plaie et faisant au moins 2 fois le tour du membre.",
      "Serrer fermement le lien pour arrêter le saignement sans couper la circulation de l'extrémité.",
      "Si le saignement traverse le tampon, ajouter un second tampon par-dessus sans retirer le premier.",
      "Allonger la victime, la couvrir et vérifier son état de conscience.",
      "Vérifier impérativement le statut vaccinal contre le tétanos."
    ],
    interdictions: [
      "Ne pas poser de garrot artériel improvisé sans matériel spécifique et formation médicale.",
      "Ne pas retirer le premier tampon relais même s'il est imbibé.",
      "Ne pas appliquer de terre, de poudre ou de décoctions sur la plaie."
    ],
    alerteNumero: "SAMU : (229) 21 30 73 36 ou Sapeurs-Pompiers : 118",
  },
  {
    id: "secours-brulure",
    titre: "Brûlures thermiques ou chimiques",
    situation: "Brûlure par liquide bouillant, feu, fer chaud ou substance chimique (eau de javel, acide).",
    gestesCles: [
      "Refroidir immédiatement la partie brûlée sous un filet d'eau potable tempérée pendant 5 minutes au moins (jusqu'à sédation de la douleur).",
      "Retirer les vêtements non adhérents. Laisser en place les morceaux de tissu collés à la chair.",
      "Si brûlure simple (petite cloque) : désinfecter à l'antiseptique doux (sans alcool), couvrir d'un pansement stérile.",
      "Si brûlure grave (surface > paume de la main, visage, articulations, nourrisson) : couvrir d'un linge propre stérile sans pommade et évacuer d'urgence.",
      "Faire boire de l'eau ou de la SRO si la personne est consciente pour prévenir le choc hypovolémique."
    ],
    interdictions: [
      "Ne jamais appliquer d'alcool, de dentifrice, d'huile de palme, de beurre ou de tomate sur la brûlure.",
      "Ne pas percer les cloques (ampoules) pour éviter l'infection cutanée sévère.",
      "Ne pas arracher les vêtements collés à la peau brûlée."
    ],
    alerteNumero: "SAMU : (229) 21 30 73 36",
  },
  {
    id: "secours-fracture",
    titre: "Fractures et traumatismes des membres",
    situation: "Douleur aiguë suite à chute ou choc, craquement entendu, déformation visible et impotence fonctionnelle totale.",
    gestesCles: [
      "Immobiliser immédiatement le membre atteint dans la position où il se trouve, sans chercher à le redresser.",
      "Membre supérieur : soutenir le coude à angle droit contre le thorax avec une écharpe de tissu nouée derrière le cou.",
      "Membre inférieur : caler la jambe avec des coussins ou linges roulés sans bouger la victime en attendant les secours.",
      "En cas de fracture ouverte (os visible ou plaie) : recouvrir délicatement d'un linge propre stérile sans appuyer sur l'os."
    ],
    interdictions: [
      "Interdiction absolue de manipuler ou tenter de réduire la fracture par massage traditionnel.",
      "Ne pas faire marcher une personne suspecte de fracture de la jambe, de la hanche ou du bassin.",
      "Ne rien donner à manger ni à boire (en vue d'une anesthésie chirurgicale)."
    ],
    alerteNumero: "Sapeurs-Pompiers : 118 ou SAMU : (229) 21 30 73 36",
  },
  {
    id: "secours-etouffement",
    titre: "Étouffement et suffocation par corps étranger",
    situation: "Obstruction brutale des voies aériennes (bille, cacahuète, capuchon, bonbon) : victime incapable de parler ou respirer.",
    gestesCles: [
      "Étape 1 : Donner jusqu'à 5 claques vigoureuses dans le dos entre les omoplates avec le plat de la main, en penchant la victime vers l'avant.",
      "Étape 2 : Si les 5 claques échouent, réaliser 5 compressions abdominales (manœuvre de Heimlich) : poing fermé placé entre le nombril et le sternum, enfoncer d'un coup sec vers soi et vers le haut.",
      "Alterner 5 claques dans le dos et 5 compressions abdominales jusqu'à expulsion du corps étranger.",
      "Chez le nourrisson (< 1 an) : coucher sur l'avant-bras tête vers le bas, donner 5 tapes douces entre les omoplates, puis retourner sur le dos pour 5 compressions thoraciques avec 2 doigts."
    ],
    interdictions: [
      "Ne pas enfoncer les doigts à l'aveugle dans la bouche (risque d'enfoncer le corps étranger).",
      "Ne pas donner de liquide à boire tant que l'obstacle n'est pas évacué."
    ],
    alerteNumero: "SAMU : (229) 21 30 73 36",
  },
  {
    id: "secours-inconscience-pls",
    titre: "Perte de connaissance & Position Latérale de Sécurité (PLS)",
    situation: "Personne ne répondant pas aux questions, mais dont la poitrine se soulève et qui respire.",
    gestesCles: [
      "Libérer les voies aériennes (LVA) : basculer prudemment la tête en arrière et élever le menton.",
      "Vérifier la respiration pendant 10 secondes (regarder la poitrine, écouter le souffle sur la joue).",
      "Placer immédiatement la victime en Position Latérale de Sécurité (PLS) sur le côté : bras du côté du sauveteur plié à 90°, autre main plaquée contre l'oreille opposée, replier le genou opposé et faire rouler le corps vers soi.",
      "Ajuster la jambe du dessus à angle droit pour stabiliser le corps et ouvrir la bouche pour l'écoulement des sécrétions.",
      "Couvrir la victime et surveiller en continu la respiration jusqu'à l'arrivée des secours."
    ],
    interdictions: [
      "Ne jamais laisser une personne inconsciente sur le dos (risque d'asphyxie par la langue ou vomissements).",
      "Ne rien donner à boire à une personne inconsciente.",
      "Ne pas gifler ni secouer la victime."
    ],
    alerteNumero: "SAMU : (229) 21 30 73 36",
  },
  {
    id: "secours-arret-cardiaque",
    titre: "Arrêt cardio-respiratoire (Noyade, électrocution)",
    situation: "Victime inconsciente qui ne respire plus du tout (aucun mouvement de la poitrine).",
    gestesCles: [
      "Alerter immédiatement les secours ou envoyer un témoin appeler le SAMU (21 30 73 36) ou les Pompiers (118).",
      "Allonger la victime sur un plan dur à terre.",
      "Commencer le Massage Cardiaque Externe (MCE) : placer le talon de la main au centre de la poitrine nue, bras tendus verticaux.",
      "Comprimer le sternum de 5 à 6 cm à un rythme régulier de 100 à 120 compressions par minute.",
      "Effectuer 30 compressions thoraciques suivies de 2 insufflations (bouche-à-bouche), ou poursuivre le massage continu si insufflations impossibles.",
      "Continuer sans interruption jusqu'à l'arrivée de l'équipe médicale ou la reprise spontanée de la respiration."
    ],
    interdictions: [
      "Ne pas masser si la personne est consciente ou respire normalement.",
      "Ne pas interrompre les compressions plus de quelques secondes."
    ],
    alerteNumero: "SAMU : (229) 21 30 73 36 ou Pompiers : 118",
  },
];

// ---------------------------------------------------------------------
// 3. FICHES SANTÉ MATERNELLE, NOUVEAU-NÉ & PLANIFICATION FAMILIALE (CNLS-TP)
// ---------------------------------------------------------------------
export const GUIDE_SANTE_MATERNELLE: FichePratiqueMaternelle[] = [
  {
    id: "maternelle-cpn",
    titre: "Consultations Prénatales (CPN) & Vulnérabilité de la Grossesse",
    periode: "Tout au long de la grossesse (8 consultations recommandées)",
    pointsCles: [
      "La norme nationale au Bénin recommande 8 CPN dont la première dès le 1er trimestre (dès le retard de règles).",
      "Prévention de l'anémie : supplémentation systématique en Fer (60 mg/j) et Acide Folique (500 µg/j) à partir de la 2e CPN.",
      "Prévention du paludisme : Traitement Préventif Intermittent (TPI) à la Sulfadoxine-Pyriméthamine (SP) dès le 2e trimestre + dormir sous moustiquaire MIILD.",
      "Vaccination antitétanique : 5 doses VAT (VAT1 1er contact, VAT2 à 4 sem, VAT3 à 6 mois, VAT4 à 1 an, VAT5 à 1 an = protection à vie).",
      "Dépistage systématique du VIH et mise sous ARV immédiate pour la PTME (Prévention de la Transmission Mère-Enfant)."
    ],
    signesDanger: [
      "1er trimestre : Saignements vaginaux, douleurs pelviennes aiguës (risque de GEU mortelle), vomissements excessifs, fièvre.",
      "2e trimestre : Fièvre, arrêt des mouvements du bébé, pertes de liquide, gonflement anormal.",
      "3e trimestre : Saignement abondant (hématome rétro-placentaire), violents maux de tête avec vue trouble et œdèmes des mains/visage (pré-éclampsie/éclampsie), convulsions, contractions précoces."
    ],
    conduiteAscq: [
      "Sensibiliser le mari et la famille à accompagner la gestante à toutes ses CPN.",
      "Vérifier le carnet de CPN et la prise effective du Fer-Acide folique et de la SP.",
      "Référer d'URGENCE à la maternité devant le moindre signe de danger.",
      "Préparer avec la famille le plan d'accouchement assisté en maternité qualifiée."
    ],
  },
  {
    id: "maternelle-cpon-nouveau-ne",
    titre: "Soins du Nouveau-né, CPoN & Méthode Kangourou",
    periode: "De la naissance à 42 jours de vie (Période néonatale)",
    pointsCles: [
      "Surveillance obligatoire de 48 heures à la maternité après l'accouchement.",
      "Calendrier des Consultations Postnatales (CPoN) : à 6 heures de vie, au 7e jour (J7), au 15e jour (J15) et au 42e jour (J42).",
      "Soins du cordon ombilical : application exclusive de Chlorhexidine digluconate 7,1% (solution ou gel à 4% de chlorhexidine libre) chaque jour jusqu'à cicatrisation complète. Laisser à l'air libre, ne rien mettre d'autre.",
      "Allaitement maternel précoce dans la première heure de vie et EXCLUSIF sans eau ni tisanes jusqu'à 6 mois révolus.",
      "Protection thermique : méthode Kangourou peau-à-peau 24h/24 pour tout nouveau-né de faible poids (< 2,5 kg) ou prématuré (port de bonnet et chaussons)."
    ],
    signesDanger: [
      "Nouveau-né : Incapacité de téter, corps froid (< 36,5°C) ou très chaud (>= 38°C), respiration rapide (> 60/min) ou geignements, cyanose (bleuissement), fontanelle bombée, pus ou rougeur au nombril, convulsions.",
      "Mère accouchée : Saignements abondants, lochies nauséabondes fétides, fièvre, maux de tête intenses, vision floue."
    ],
    conduiteAscq: [
      "Démontrer aux parents la bonne technique d'application de la chlorhexidine sur le moignon ombilical.",
      "Apprendre à la mère la position d'allaitement et vérifier que le bébé vide bien les seins pour éviter l'engorgement et la mastite.",
      "Référer immédiatement au centre de santé tout nouveau-né léthargique ou fébrile.",
      "Rappeler la déclaration de naissance à l'état civil de l'arrondissement."
    ],
  },
  {
    id: "maternelle-planification-familiale",
    titre: "Planification Familiale (PF) & Espacement des Naissances",
    periode: "Femmes en âge de procréer et couples",
    pointsCles: [
      "Espacement sain des naissances : intervalle inter-génésique d'au moins 2 ans pour la survie et l'épanouissement de la mère et des enfants.",
      "Méthodes modernes : Pilules orales (combinées ou progestatif pur pour femmes allaitantes), Implants sous-cutanés (3 à 5 ans, efficacité > 99%), Injectables (tous les 3 mois), DIU cuivre (stérilet réversible sans hormones), Préservatifs (seule méthode protégeant à la fois contre les grossesses et les IST/VIH).",
      "Contraception d'urgence : pilule de lévonorgestrel 1,5 mg à prendre dans les 5 jours (120h) suivant un rapport à risque ou rupture de préservatif.",
      "Méthodes naturelles OMS : MAMA (allaitement exclusif jour/nuit, bébé < 6 mois, sans retour de couches = 99% efficace), Collier du cycle / jours fixes (perles blanches fertiles du J8 au J19)."
    ],
    signesDanger: [
      "Saignements vaginaux anormaux inexpliqués, douleurs pelviennes intenses après pose de stérilet, fièvre."
    ],
    conduiteAscq: [
      "Fournir une information neutre, bienveillante et confidentielle sur toutes les méthodes disponibles.",
      "Dissiper les fausses rumeurs (la PF ne rend pas stérile, les méthodes sont réversibles, subventionnées à coût symbolique par l'État).",
      "Distribuer les préservatifs masculins/féminins et le collier du cycle à la demande.",
      "Orienter le couple ou la femme vers la maternité du centre de santé pour le choix et la pose de la méthode."
    ],
  },
];

// ---------------------------------------------------------------------
// 4. CADRE ORGANISATIONNEL & ATTRIBUTIONS OFFICIELLES (CNLS-TP 2020)
// ---------------------------------------------------------------------
export const ATTRIBUTIONS_OFFICIELLES_ASC: AttributionProfil[] = [
  {
    poste: "RC",
    titre: "Relais Communautaire (RC)",
    missionGenerale: "Interface de proximité entre les ménages de son quartier/village et le système de santé. Assure la veille sanitaire, les visites à domicile hebdomadaires, l'éducation pour la santé et l'orientation précoce.",
    activitesPrincipales: [
      "Contribuer à la veille sanitaire et à la surveillance épidémiologique communautaire des maladies sous surveillance (SIMR).",
      "Assurer les activités de prévention et de promotion de la santé auprès des familles (CCC).",
      "Concourir à la référence sans délai de tout cas suspect vers le centre de santé.",
      "Assurer le suivi régulier des ménages assignés (portefeuille de 150 à 200 ménages).",
      "Participer aux campagnes nationales de masse (JNV polio, moustiquaires MIILD, CPS paludisme, déparasitage).",
      "Distribuer les intrants communautaires de base (Aquatabs, SRO, préservatifs, collier du cycle, savon)."
    ],
    tachesTerrain: [
      "Visite à Domicile (VAD) hebdomadaire systématique de tous les ménages attribués.",
      "Renseigner les indicateurs du registre ménage et notifier tout événement sanitaire anormal.",
      "Effectuer un rapportage régulier à l'Agent de Santé Communautaire Qualifié (ASCQ).",
      "Rechercher activement les enfants non vaccinés (« zéro-dose ») et les perdus de vue du PEV et de la CPN.",
      "Effectuer l'enveloppement humide en cas de fièvre de l'enfant et référer immédiatement."
    ],
    actesInterdits: [
      "Interdiction formelle de poser des actes invasifs (pas d'injections, pas d'incisions, pas de sutures).",
      "Interdiction de prescrire ou de vendre des médicaments.",
      "Interdiction formelle de demander de l'argent, un repas ou des avantages personnels aux ménages suivis.",
      "Interdiction d'animer des causeries avec des mineurs sans autorisation préalable des parents/tuteurs.",
      "Interdiction de garder un malade à domicile au lieu de le référer au centre de santé."
    ],
  },
  {
    poste: "ASCQ",
    titre: "Agent de Santé Communautaire Qualifié (ASCQ)",
    missionGenerale: "Cadre technique de santé communautaire basé au niveau de l'arrondissement. Supervise les Relais Communautaires, assure le contrôle qualité des données, met en œuvre le paquet de soins intégrés (iCCM/PECADOM) et pilote la plateforme One Health locale.",
    activitesPrincipales: [
      "Collaborer étroitement avec le Médecin Chef / Chef Poste de la Formation Sanitaire (FOSA) et les élus communaux.",
      "Assurer la supervision formative, l'encadrement technique et l'évaluation continue des Relais Communautaires (RC).",
      "Consolider les données communautaires et réaliser l'assurance qualité avant transmission hebdomadaire dans le DHIS2.",
      "Mettre en œuvre les activités de prise en charge communautaire déléguées selon les protocoles officiels (TDR paludisme, CTA, Amoxicilline dispersible pour pneumonie simple, SRO-Zinc, dépistage MAS/MAM au ruban Shakir).",
      "Gérer le stock des produits de santé d'arrondissement (caisson métallique, règle FEFO/PEPS, eSIGL).",
      "Coordonner la veille One Health d'arrondissement avec les agents des Eaux et Forêts, de l'Élevage et de la Promotion Sociale (CPS)."
    ],
    tachesTerrain: [
      "Organiser des séances de soins et de sensibilisation en stratégie fixe et en stratégie avancée.",
      "Contrôler la complétude et la promptitude des rapports hebdomadaires soumis par les RC.",
      "Assurer la gestion rigoureuse des dotations en caisse métallique ignifugée : bon de commande, bordereau de livraison, fiche de stock avec inventaire physique mensuel.",
      "Conduire les investigations immédiates de rumeurs ou d'alertes épidémiques avec le Chef Poste.",
      "Animer les cadres de concertation trimestriels avec la composante locale du système de santé (CoLoSS)."
    ],
    actesInterdits: [
      "Interdiction de traiter un cas grave sans référence immédiate vers le centre de santé.",
      "Interdiction de vendre des intrants de santé fournis gratuitement par le Ministère de la Santé (CTA, TDR, SRO, Aquatabs).",
      "Interdiction de modifier unilatéralement un traitement médical prescrit par un médecin ou infirmier.",
      "Interdiction de conserver des produits périmés ou altérés dans la caisse de dotation."
    ],
  },
];

// ---------------------------------------------------------------------
// 5. PROTOCOLE OFFICIEL DES VISITES À DOMICILE (VAD) (CNLS-TP 2020)
// ---------------------------------------------------------------------
export const PROTOCOLE_VAD_OFFICIEL = {
  titre: "Protocole Standardisé de Visite à Domicile (VAD)",
  normePortefeuille: "150 à 200 ménages par Relais Communautaire, avec un passage hebdomadaire ou plus en cas d'alerte.",
  etapesDeroulement: [
    {
      etape: 1,
      titre: "Salutation & Présentation formelle",
      actions: "Saluer selon les us et coutumes locaux. Se présenter avec son badge officiel d'identification. Ne jamais entrer dans la concession sans autorisation explicite du chef de ménage."
    },
    {
      etape: 2,
      titre: "Explication claire de l'objet de la visite",
      actions: "Expliquer avec respect et humilité l'objet de l'échange sanitaire. Adopter un langage simple et accessible sans jargon médical."
    },
    {
      etape: 3,
      titre: "Recueil méthodique des renseignements dans l'ordre officiel",
      actions: "Interroger et examiner selon l'ordre chronologique réglementaire : 1. Le père -> 2. La mère (statut grossesse, CPN, suites de couches, PF) -> 3. Les enfants (nourrissons, pesée/toise/Shakir, calendrier vaccinal, fièvres) -> 4. Les autres membres du foyer -> 5. Les maladies en cours -> 6. L'hygiène du milieu (latrines, eau de boisson, enclos des animaux)."
    },
    {
      etape: 4,
      titre: "Conseil personnalisé & Négociation comportementale (CCC)",
      actions: "Partir des préoccupations exprimées par la famille. Utiliser la boîte à images (BAI). Faire des démonstrations pratiques (lavage des mains au savon, préparation de la SRO Orasel, utilisation des Aquatabs, positionnement du bracelet Shakir). Négocier l'engagement ferme de la famille."
    },
    {
      etape: 5,
      titre: "Synthèse participative & Félicitations",
      actions: "Vérifier la bonne compréhension de l'interlocuteur en lui demandant de reformuler. Féliciter les efforts et progrès constatés dans le ménage."
    },
    {
      etape: 6,
      titre: "Remerciements & Fixation du prochain rendez-vous",
      actions: "Remercier chaleureusement la famille pour son accueil. Renseigner immédiatement le registre de ménage et convenir d'une date ferme pour la prochaine visite."
    }
  ],
  reglesOrAscq: [
    "Être neutre, bienveillant, ponctuel et empathique sans jamais juger ni critiquer la famille.",
    "Ne jamais rien demander de personnel : aucun repas, aucun don d'argent ni cadeau.",
    "Respecter le secret professionnel et la stricte confidentialité des données familiales.",
    "Conserver son registre dans son sac à l'abri de l'eau et de la poussière."
  ]
};

// ---------------------------------------------------------------------
// 6. NUMÉROS D'URGENCE OFFICIELS AU BÉNIN
// ---------------------------------------------------------------------
export const NUMEROS_URGENCE_BENIN = [
  { nom: "SAMU Bénin (Secours Médical d'Urgence)", numero: "+229 21 30 73 36", call: "tel:+22921307336", badge: "Secours Médical" },
  { nom: "Sapeurs-Pompiers (Incendies & Traumatismes)", numero: "118", call: "tel:118", badge: "Urgences & Accidents" },
  { nom: "Police Républicaine (Secours & Protection)", numero: "17", call: "tel:17", badge: "Sécurité Publique" },
  { nom: "Ligne Verte Protection de l'Enfant & Violences (MASM)", numero: "138", call: "tel:138", badge: "Violences & Enfance (Gratuit 24/7)" },
  { nom: "Numéro Vert Épidémies & Urgences Sanitaires (MS)", numero: "136", call: "tel:136", badge: "Alerte Sanitaire (Gratuit)" },
];
