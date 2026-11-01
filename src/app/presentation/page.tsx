"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Printer, 
  Home, 
  BookOpen, 
  ShieldAlert, 
  Award, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Stethoscope, 
  Baby, 
  HeartPulse, 
  Sparkles, 
  Building2, 
  Smartphone, 
  MapPin, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  PhoneCall,
  Crown,
  Share2,
  HelpCircle,
  Clock,
  Layers,
  ArrowRight,
  Filter,
  Trash2,
  Calendar,
  CheckSquare,
  BarChart3,
  FileSpreadsheet,
  ArrowLeftRight,
  MessageSquareText,
  Search
} from "lucide-react";

interface DetailedSlide {
  id: number;
  pole: string;
  ongletNom: string;
  titre: string;
  sousTitre: string;
  cibleProfils: string;
  pointsCles: {
    icon: string;
    titre: string;
    description: string;
    stat?: string;
  }[];
  lienOnglet: string;
  labelBoutonLien: string;
  scriptOrateur: string;
}

const TOUTES_LES_SLIDES: DetailedSlide[] = [
  // =========================================================================
  // PÔLE 1 : PORTAIL PUBLIC & SOUVERAINETÉ CITOYENNE
  // =========================================================================
  {
    id: 1,
    pole: "PORTAIL CITOYEN",
    ongletNom: "Page d'Accueil Publique",
    titre: "Portail Public & Transparence Sanitaire Communale",
    sousTitre: "La vitrine républicaine accessible sans mot de passe à tous les concitoyens pour restaurer la confiance.",
    cibleProfils: "Tous les Citoyens, Maires, Élus locaux, Partenaires",
    pointsCles: [
      {
        icon: "🌐",
        titre: "Accès Ouvert & Universel",
        description: "Accessible librement depuis tout smartphone sans identifiant, valorisant les efforts de la commune.",
        stat: "100% Libre"
      },
      {
        icon: "📊",
        titre: "Compteurs d'Impact en Temps Réel",
        description: "Nombre réel d'ASCQ en service, de Relais formés et de ménages régulièrement visités dans chaque commune.",
        stat: "Temps Réel"
      },
      {
        icon: "🇧🇯",
        titre: "Communication Institutionnelle",
        description: "Affichage des campagnes nationales (vaccination, moustiquaires, hygiène) et des conseils validés par l'État.",
        stat: "Officiel"
      }
    ],
    lienOnglet: "/",
    labelBoutonLien: "Ouvrir la Page d'Accueil Publique (/)",
    scriptOrateur: "Monsieur le Maire, Mesdames et Messieurs les Conseillers, voici la porte d'entrée de la commune. Tout citoyen peut consulter en direct la vitalité sanitaire de son milieu sans barrière technique. C'est l'incarnation de la redevabilité et de la transparence publique."
  },
  {
    id: 2,
    pole: "PORTAIL CITOYEN",
    ongletNom: "Module « Qui est mon ASCQ ? »",
    titre: "Géolocalisation Citoyenne de l'Agent de Santé",
    sousTitre: "Chaque famille béninoise sait désormais qui est son référent de santé et comment le joindre en 1 clic.",
    cibleProfils: "Ménages, Familles, Chefs de concession, Administrés",
    pointsCles: [
      {
        icon: "📍",
        titre: "Sélection Territoriale Simple",
        description: "Le citoyen choisit son département et sa commune pour afficher immédiatement l'ASCQ de son arrondissement.",
        stat: "77 Communes"
      },
      {
        icon: "📞",
        titre: "Contact Direct WhatsApp & Appel",
        description: "Affichage du nom officiel, de la photo et du numéro béninois normalisé avec bouton d'appel direct.",
        stat: "Appel & WhatsApp"
      },
      {
        icon: "🛡️",
        titre: "Fin de l'Isolement Rural",
        description: "Les familles ne se déplacent plus inutilement : elles peuvent joindre l'agent avant de se rendre au poste de santé.",
        stat: "Proximité Totale"
      }
    ],
    lienOnglet: "/#qui-est-mon-ascq",
    labelBoutonLien: "Tester « Qui est mon ASCQ ? » (/#qui-est-mon-ascq)",
    scriptOrateur: "Combien de fois un habitant de nos villages ne sait-il pas vers qui se tourner pour un enfant brûlant de fièvre ? Grâce à ce module, en 3 secondes, l'administré trouve la photo et le contact direct de son ASCQ d'arrondissement. C'est la fin du sentiment d'abandon."
  },
  {
    id: 3,
    pole: "PORTAIL CITOYEN",
    ongletNom: "Module « Aidez-nous à mieux vous servir »",
    titre: "Boîte à Suggestions & Écoute Communautaire",
    sousTitre: "Le canal démocratique direct permettant aux administrés de faire remonter alertes et propositions à la mairie.",
    cibleProfils: "Citoyens, Associations de développement, Comités de santé",
    pointsCles: [
      {
        icon: "💬",
        titre: "Expression Libre et Sécurisée",
        description: "Formulaire d'écoute permettant d'exprimer un besoin sanitaire, une suggestion d'amélioration ou un encouragement.",
        stat: "Participation"
      },
      {
        icon: "🚨",
        titre: "Remontée d'Alerte Communautaire",
        description: "Possibilité de signaler un événement suspect au village (cas groupés de vomissements, mortalité anormale de volailles).",
        stat: "Veille One Health"
      },
      {
        icon: "🏛️",
        titre: "Redevabilité Municipale",
        description: "Les messages sont centralisés et consultables par la commission des affaires sociales de la mairie.",
        stat: "Démocratie Locale"
      }
    ],
    lienOnglet: "/#suggestions",
    labelBoutonLien: "Tester l'Écoute Citoyenne (/#suggestions)",
    scriptOrateur: "Ce module d'écoute citoyenne donne la parole aux usagers. La municipalité dispose d'un thermomètre permanent pour évaluer la qualité des services de santé et recevoir des alertes sanitaires précoces directement depuis la population."
  },
  {
    id: 4,
    pole: "SOCLE TECHNIQUE",
    ongletNom: "Écran de Connexion & Sécurité",
    titre: "Authentification Sécurisée & Normes Bénin (+229)",
    sousTitre: "Reconnaissance universelle du format +229 01 XX XX XX XX, géolocalisation GPS et alertes push.",
    cibleProfils: "Tous les Utilisateurs enregistrés (ASCQ, Relais, Cadres)",
    pointsCles: [
      {
        icon: "🇧🇯",
        titre: "Normalisation Automatique Bénin",
        description: "Le système formate instantanément tous les numéros au format +229 avec boutons WhatsApp et Appel.",
        stat: "+229 Universel"
      },
      {
        icon: "📍",
        titre: "Autorisation GPS au 1er Accès",
        description: "Capture obligatoire des coordonnées satellitaires pour certifier la réalité physique des visites au village.",
        stat: "Traçabilité GPS"
      },
      {
        icon: "🔔",
        titre: "Notifications Push sur Mobile",
        description: "Les alertes sanitaires et ordres de mission s'affichent sur l'écran verrouillé du téléphone comme sur WhatsApp.",
        stat: "Instantané"
      }
    ],
    lienOnglet: "/connexion",
    labelBoutonLien: "Ouvrir l'Écran de Connexion (/connexion)",
    scriptOrateur: "L'accès à l'espace de travail est verrouillé par mot de passe. Dès la première connexion, le système active la balise GPS et les notifications push. Fini les déclarations fantômes : chaque acte médical est localisé précisément sur le territoire communal."
  },

  // =========================================================================
  // PÔLE 2 : ESPACE RELAIS COMMUNAUTAIRE (VILLAGES & HAMEAUX)
  // =========================================================================
  {
    id: 5,
    pole: "ESPACE RELAIS RC",
    ongletNom: "Tableau de Bord Relais (/espace-rc)",
    titre: "L'Interface Simplifiée du Relais Communautaire",
    sousTitre: "4 grands boutons ultra-visuels conçus pour être utilisés sans difficulté sur smartphone au village.",
    cibleProfils: "Relais Communautaires (RC) de village",
    pointsCles: [
      {
        icon: "🔴",
        titre: "Bouton Rouge : Alerte SIMR",
        description: "Signalement immédiat d'un cas épidémique suspect avec signature directe du doigt sur l'écran.",
        stat: "Urgence"
      },
      {
        icon: "⚫",
        titre: "Bouton Noir : Déclarer un Décès",
        description: "Notification immédiate de tout décès survenu dans la communauté pour lutter contre les décès invisibles.",
        stat: "État Civil & Santé"
      },
      {
        icon: "🔵",
        titre: "Boutons Bleus : Planning & Bilan",
        description: "Enregistrement des VAD prévues dans la semaine et transmission de la fiche d'activités PNSC.",
        stat: "VAD & Bilan"
      }
    ],
    lienOnglet: "/espace-rc",
    labelBoutonLien: "Ouvrir l'Espace Relais (/espace-rc)",
    scriptOrateur: "Nos Relais Communautaires sont souvent intimidés par l'informatique. Nous avons résolu cela en créant une télécommande simplifiée : 4 gros boutons colorés. Pas de calculs, pas de menus compliqués. Le Relais est opérationnel après seulement 30 minutes d'apprentissage."
  },
  {
    id: 6,
    pole: "ESPACE RELAIS RC",
    ongletNom: "Sous-Module : Alerte SIMR Relais",
    titre: "Déclenchement d'Alerte sans Visa Bureaucratique",
    sousTitre: "La fin des délais administratifs mortels : le Relais signe directement sur son écran tactile.",
    cibleProfils: "Relais Communautaires (RC), ASCQ Superviseur",
    pointsCles: [
      {
        icon: "✍️",
        titre: "Signature Digitale Directe",
        description: "Le Relais signe avec son doigt. Aucun visa du médecin coordonnateur n'est exigé comme préalable.",
        stat: "Zéro Blocage"
      },
      {
        icon: "⚡",
        titre: "Diffusion à Toute la Pyramide",
        description: "L'ASCQ, le Médecin Chef de commune et la Direction de la Santé reçoivent l'alerte à la seconde même.",
        stat: "< 2 secondes"
      },
      {
        icon: "📍",
        titre: "Localisation du Foyer Suspect",
        description: "Le point GPS du foyer épidémique est transmis automatiquement pour guider la riposte.",
        stat: "GPS du Hameau"
      }
    ],
    lienOnglet: "/fiches/alerte/nouvelle",
    labelBoutonLien: "Tester la Fiche d'Alerte (/fiches/alerte/nouvelle)",
    scriptOrateur: "Voici la révolution majeure voulue par les autorités sanitaires : quand une suspicion de Choléra ou de Fièvre Lassa survient dans un village, nous ne pouvons pas attendre 3 jours de signatures administratives. Le Relais signe, et l'alerte part instantanément."
  },
  {
    id: 7,
    pole: "ESPACE RELAIS RC",
    ongletNom: "Sous-Module : Déclaration de Décès",
    titre: "Notification des Décès au Niveau Communautaire",
    sousTitre: "Mettre fin aux décès non déclarés pour identifier les foyers de mortalité évitable dans la commune.",
    cibleProfils: "Relais Communautaires (RC), Officiers d'État Civil, Médecin Chef",
    pointsCles: [
      {
        icon: "⚰️",
        titre: "Enregistrement Exhaustif",
        description: "Saisie de l'âge du défunt, du sexe, des symptômes ayant précédé la mort et du lieu exact du décès.",
        stat: "Zéro Décès Oublié"
      },
      {
        icon: "🤱",
        titre: "Priorité Décès Maternels & Néonatals",
        description: "Signalement rouge immédiat si le décès concerne une femme enceinte ou un nouveau-né.",
        stat: "Audit Maternel"
      },
      {
        icon: "🏛️",
        titre: "Passerelle avec l'État Civil",
        description: "Permet aux mairies d'améliorer la complétude de leurs registres d'état civil dans les arrondissements ruraux.",
        stat: "Synergie Mairie"
      }
    ],
    lienOnglet: "/fiches/deces/nouveau",
    labelBoutonLien: "Tester la Fiche Décès (/fiches/deces/nouveau)",
    scriptOrateur: "Beaucoup de décès dans nos hameaux sont enterrés sans constat médical ni déclaration à l'état civil. Cette fiche permet à la mairie et aux médecins de savoir exactement de quoi meurent nos administrés, pour agir avant que d'autres ne soient touchés."
  },

  // =========================================================================
  // PÔLE 3 : PRISE EN CHARGE CLINIQUE ASCQ (ARRONDISSEMENT)
  // =========================================================================
  {
    id: 8,
    pole: "ESPACE ASCQ SOINS",
    ongletNom: "Mon Espace ASCQ (/espace-ascq)",
    titre: "Tableau de Bord Médical de l'Arrondissement",
    sousTitre: "Le poste de commandement de l'Agent de Santé Communautaire Qualifié pour ses soins de proximité.",
    cibleProfils: "ASCQ d'Arrondissement, Superviseurs techniques",
    pointsCles: [
      {
        icon: "🩺",
        titre: "Activités du Jour en Coup d'Œil",
        description: "Nombre d'enfants traités, consultations prénatales réalisées, alertes en cours et portefeuille de ménages.",
        stat: "Synthèse Live"
      },
      {
        icon: "📦",
        titre: "Suivi des Caissons de Dotation",
        description: "Contrôle des stocks d'intrants essentiels (CTA, TDR, Amoxicilline, SRO, Zinc, tests de grossesse).",
        stat: "Intrants Gratuits"
      },
      {
        icon: "👥",
        titre: "Équipe de Relais Rattachée",
        description: "Accès instantané à la liste de ses relais de village avec leurs indicateurs hebdomadaires.",
        stat: "Encadrement"
      }
    ],
    lienOnglet: "/espace-ascq",
    labelBoutonLien: "Ouvrir Mon Espace ASCQ (/espace-ascq)",
    scriptOrateur: "L'ASCQ qualifié est le cadre technique de santé de l'arrondissement. Son espace de travail lui donne une visibilité totale sur ses consultations, ses stocks de médicaments et l'activité de son équipe de relais."
  },
  {
    id: 9,
    pole: "ESPACE ASCQ SOINS",
    ongletNom: "Prise en Charge iCCM (/espace-ascq/consultations)",
    titre: "Consultations iCCM : Paludisme, Pneumonie, Diarrhée",
    sousTitre: "Prise en charge intégrée de l'enfant de 2 à 59 mois avec calcul automatique des posologies.",
    cibleProfils: "ASCQ, Enfants de moins de 5 ans, Mères de famille",
    pointsCles: [
      {
        icon: "🦟",
        titre: "Paludisme & Traitement CTA",
        description: "Test de Diagnostic Rapide (TDR), posologie CTA calculée selon l'âge et vérification de la prise de la 1ère dose.",
        stat: "TDR & CTA"
      },
      {
        icon: "🫁",
        titre: "Pneumonie & Minuteur Intégré",
        description: "Minuteur de 60 secondes pour compter les mouvements respiratoires et dispensation d'Amoxicilline dispersible.",
        stat: "Minuteur FR"
      },
      {
        icon: "💧",
        titre: "Diarrhée & Déshydratation",
        description: "Évaluation du pli cutané, préparation SRO et dispensation de 10 comprimés de Sulfate de Zinc.",
        stat: "SRO + Zinc 10j"
      },
      {
        icon: "📏",
        titre: "Dépistage Nutritionnel Shakir",
        description: "Mesure du périmètre brachial (PB) et détection immédiate de la malnutrition MAS et du Kwashiorkor.",
        stat: "Ruban Shakir"
      }
    ],
    lienOnglet: "/espace-ascq/consultations",
    labelBoutonLien: "Ouvrir les Consultations iCCM (/espace-ascq/consultations)",
    scriptOrateur: "Ce module traite les 3 maladies qui tuent le plus nos enfants de moins de 5 ans. L'application empêche toute erreur de dosage et bloque le traitement si l'enfant est en détresse vitale pour exiger une référence d'urgence immédiate."
  },
  {
    id: 10,
    pole: "ESPACE ASCQ SOINS",
    ongletNom: "Maternité & 1000 Jours (/espace-ascq/maternite-enfance)",
    titre: "Santé Maternelle, CPN & Soins du Nouveau-Né",
    sousTitre: "Le respect des 8 CPN, la méthode Kangourou et l'application exclusive de Chlorhexidine 7,1% au cordon.",
    cibleProfils: "Femmes enceintes, Mères accouchées, Nouveau-nés, ASCQ",
    pointsCles: [
      {
        icon: "🤰",
        titre: "Suivi des 8 Consultations Prénatales (CPN)",
        description: "Vérification de la supplémentation Fer-Acide folique, du TPI paludisme à la SP et du vaccin VAT.",
        stat: "8 CPN Bénin"
      },
      {
        icon: "👶",
        titre: "Soins Cordon Chlorhexidine 7,1%",
        description: "Application quotidienne exclusive sur le moignon ombilical pour éliminer les infections néonatales mortelles.",
        stat: "Norme 7,1%"
      },
      {
        icon: "🦘",
        titre: "Méthode Kangourou Peau-à-Peau",
        description: "Protocole thermique pour prématurés et nouveau-nés de faible poids (< 2,5 kg) et allaitement exclusif 6 mois.",
        stat: "Survie Néonatale"
      }
    ],
    lienOnglet: "/espace-ascq/maternite-enfance",
    labelBoutonLien: "Ouvrir Maternité & 1000 Jours (/espace-ascq/maternite-enfance)",
    scriptOrateur: "Chaque femme enceinte de notre commune doit être suivie de près. Ce module permet à l'ASCQ de s'assurer que la gestante a fait ses 8 CPN, dort sous moustiquaire, prend son fer et utilise la chlorhexidine pour protéger le nombril du bébé."
  },
  {
    id: 11,
    pole: "ESPACE ASCQ SOINS",
    ongletNom: "Références CS/GUPS (/espace-ascq/references)",
    titre: "Circuit d'Évacuation & Référence d'Urgence",
    sousTitre: "Fiches de transfert vers le Centre de Santé et le Guichet Unique de Protection Sociale (GUPS).",
    cibleProfils: "Cas graves, Femmes en détresse, Enfants léthargiques, ASCQ",
    pointsCles: [
      {
        icon: "🚑",
        titre: "Référence d'Urgence Immédiate",
        description: "Fiche électronique générée avec les signes de gravité constatés, adressée directement au médecin du centre de santé.",
        stat: "Contre-Transfert"
      },
      {
        icon: "🛡️",
        titre: "Liaison Sociale GUPS",
        description: "Orientation des familles indigentes vers le Guichet Unique de Protection Sociale pour l'exonération des frais.",
        stat: "Assistance Sociale"
      },
      {
        icon: "✅",
        titre: "Suivi de l'Issue du Patient",
        description: "L'ASCQ s'assure que le malade est bien arrivé au centre de santé et consigne le diagnostic de sortie.",
        stat: "Traçabilité Patient"
      }
    ],
    lienOnglet: "/espace-ascq/references",
    labelBoutonLien: "Ouvrir les Références d'Urgence (/espace-ascq/references)",
    scriptOrateur: "L'ASCQ n'est pas un médecin : quand un cas dépasse ses compétences, il a l'obligation formelle de référer. Ce module crée le bulletin d'évacuation d'urgence et permet de s'assurer que le malade a été effectivement pris en charge à l'hôpital."
  },

  // =========================================================================
  // PÔLE 4 : SURVEILLANCE ÉPIDÉMIOLOGIQUE SIMR (BÉNIN)
  // =========================================================================
  {
    id: 12,
    pole: "SURVEILLANCE SIMR",
    ongletNom: "Fiches de Surveillance (/fiches)",
    titre: "Le Registre Numérique des Alertes & Épidémies",
    sousTitre: "Historique exhaustif de tous les événements de santé sous surveillance notifiés dans la commune.",
    cibleProfils: "Responsables Épidémiologiques, MCZS, DDS, ASCQ",
    pointsCles: [
      {
        icon: "📋",
        titre: "Centralisation des Déclarations",
        description: "Toutes les alertes déclenchées par les Relais ou les ASCQ sont répertoriées avec horodatage et statut.",
        stat: "Historique Complet"
      },
      {
        icon: "🔍",
        titre: "Filtres par Pathologie & Arrondissement",
        description: "Tri instantané par maladie (Choléra, Lassa, Rougeole, Méningite, Rage) pour repérer les flambées locales.",
        stat: "Filtres Avancés"
      },
      {
        icon: "🗺️",
        titre: "Cartographie des Risques",
        description: "Chaque fiche contient la balise GPS permettant de cartographier la progression des foyers épidémiques.",
        stat: "Cartographie"
      }
    ],
    lienOnglet: "/fiches",
    labelBoutonLien: "Ouvrir les Fiches Surveillance (/fiches)",
    scriptOrateur: "Ce registre numérique remplace définitivement les cahiers poussiéreux. Le Médecin Coordonnateur et le Maire peuvent voir en temps réel l'ensemble des suspicions sanitaires apparues dans chaque arrondissement de la commune."
  },
  {
    id: 13,
    pole: "SURVEILLANCE SIMR",
    ongletNom: "Nouvelle Alerte SIMR (/fiches/alerte/nouvelle)",
    titre: "Déclaration d'Alerte avec Signature Directe ASCQ",
    sousTitre: "Notification formelle d'un cas suspect de l'une des 34 maladies sous surveillance avec signature tactile.",
    cibleProfils: "ASCQ, Relais, Responsable de zone sanitaire",
    pointsCles: [
      {
        icon: "🚨",
        titre: "Sélection parmi les 34 Maladies SIMR",
        description: "Menu déroulant conforme au Guide officiel SIMR Bénin 2026 (Choléra, PFA, Lassa, Méningite, Mpox, etc.).",
        stat: "34 Maladies"
      },
      {
        icon: "✍️",
        titre: "Signature Tactile Directe",
        description: "L'ASCQ signe directement sur l'écran de son téléphone. Aucun visa préalable du coordonnateur n'est requis.",
        stat: "Signature Directe"
      },
      {
        icon: "📲",
        titre: "Diffusion Instantanée Push & WhatsApp",
        description: "Transmission de l'alerte à la chaîne de commandement sanitaire en moins de 2 secondes.",
        stat: "Alerte Rouge"
      }
    ],
    lienOnglet: "/fiches/alerte/nouvelle",
    labelBoutonLien: "Déclencher une Alerte (/fiches/alerte/nouvelle)",
    scriptOrateur: "Voici l'écran exact où l'ASCQ saisit une alerte. En moins de 60 secondes, il sélectionne la pathologie suspectée, précise le nombre de cas et de décès observés, signe du doigt, et déclenche la riposte sanitaire communale."
  },
  {
    id: 14,
    pole: "SURVEILLANCE SIMR",
    ongletNom: "Nouveau Décès Communautaire (/fiches/deces/nouveau)",
    titre: "Déclaration d'un Décès Communautaire par l'ASCQ",
    sousTitre: "Audit systématique des causes de décès à domicile et renforcement de l'état civil de la commune.",
    cibleProfils: "ASCQ, Mairie, Officiers d'État Civil",
    pointsCles: [
      {
        icon: "👤",
        titre: "Identification Rigoureuse du Défunt",
        description: "Nom, prénoms, âge exact, profession, village et coordonnées de la personne ressource de la famille.",
        stat: "Identification"
      },
      {
        icon: "⚠️",
        titre: "Recherche des Circonstances Suspectes",
        description: "Évaluation des signes évocateurs d'épidémie (hémorragies, diarrhée foudroyante, paralysie, morsure).",
        stat: "Autopsie Verbale"
      },
      {
        icon: "🏛️",
        titre: "Appui à l'Arrondissement",
        description: "Permet au Chef d'Arrondissement de certifier les registres d'état civil avec des données sanitaires réelles.",
        stat: "Synergie Mairie"
      }
    ],
    lienOnglet: "/fiches/deces/nouveau",
    labelBoutonLien: "Enregistrer un Décès (/fiches/deces/nouveau)",
    scriptOrateur: "L'enregistrement des décès à domicile est un acte fondamental de salubrité publique. Cette fiche permet d'éviter que des épidémies ne se propagent lors des cérémonies funéraires et assure la complétude de l'état civil communal."
  },

  // =========================================================================
  // PÔLE 5 : CENTRE NATIONAL DE RÉFÉRENCE CLINIQUE (/briefing)
  // =========================================================================
  {
    id: 15,
    pole: "RÉFÉRENTIEL CLINIQUE",
    ongletNom: "Centre de Référence (/briefing)",
    titre: "L'Encyclopédie Clinique & Pratique du Bénin",
    sousTitre: "L'ensemble des protocoles nationaux officiels CNLS-TP et SIMR/PEV 2026 embarqués dans chaque smartphone.",
    cibleProfils: "Tous les Professionnels de Santé, ASCQ, Relais, Cadres",
    pointsCles: [
      {
        icon: "📚",
        titre: "6 Pôles d'Excellence Clinique",
        description: "Orientation par signe, répertoire SIMR, vaccins PEV, santé maternelle, secourisme et organisation terrain.",
        stat: "6 Grands Thèmes"
      },
      {
        icon: "🔎",
        titre: "Recherche Universelle Instantanée",
        description: "Tapez n'importe quel mot (fièvre, lassa, cordon, shakir, samu) pour trouver instantanément la fiche réflexe.",
        stat: "Moteur Intuitif"
      },
      {
        icon: "🖨️",
        titre: "Impression & Affiches de Poste",
        description: "Possibilité d'imprimer les fiches et calendriers pour affichage dans les centres de santé et mairies.",
        stat: "Format Papier/PDF"
      }
    ],
    lienOnglet: "/briefing",
    labelBoutonLien: "Ouvrir le Centre de Référence (/briefing)",
    scriptOrateur: "L'espace /briefing est le trésor scientifique de notre application. Chaque soignant, chaque relais et chaque cadre y retrouve les normes approuvées par la Présidence de la République et le Ministère de la Santé."
  },
  {
    id: 16,
    pole: "RÉFÉRENTIEL CLINIQUE",
    ongletNom: "Sous-Onglet « Je vois… je pense à… »",
    titre: "Table d'Orientation Clinique Rapide par le Signe",
    sousTitre: "25 tableaux cliniques répertoriés pour diagnostiquer et orienter immédiatement face au patient.",
    cibleProfils: "ASCQ, Relais Communautaires, Infirmiers de poste",
    pointsCles: [
      {
        icon: "💧",
        titre: "Diarrhée « Eau de Riz » ➔ Choléra",
        description: "Alerte sanitaire immédiate, réhydratation d'urgence par SRO, référence d'urgence sans délai.",
        stat: "Alerte Immédiate"
      },
      {
        icon: "🧠",
        titre: "Raideur Nuque / Vomissements ➔ Méningite",
        description: "Suspicion de méningite cérébro-spinale, alerte téléphonique et transfert d'urgence pour ponction lombaire.",
        stat: "Urgence Absolue"
      },
      {
        icon: "🫁",
        titre: "Toux > 2 Semaines + Sueurs ➔ Tuberculose",
        description: "Recherche de crachats striés de sang, port de masque et référence vers le centre de dépistage CDT.",
        stat: "Dépistage CDT"
      },
      {
        icon: "⚠️",
        titre: "Flaccidité d'un Membre ➔ PFA (Polio)",
        description: "Paralysie flasque aiguë chez l'enfant de moins de 15 ans : prélèvement de selles à J0 et J+24h.",
        stat: "Éradication Polio"
      }
    ],
    lienOnglet: "/briefing?tab=signes",
    labelBoutonLien: "Ouvrir « Je vois... je pense à... » (/briefing?tab=signes)",
    scriptOrateur: "C'est l'outil de diagnostic communautaire le plus simple et le plus puissant jamais conçu : l'agent voit un signe, et l'application lui dit immédiatement à quelle maladie penser et quelle conduite tenir à la seconde."
  },
  {
    id: 17,
    pole: "RÉFÉRENTIEL CLINIQUE",
    ongletNom: "Sous-Onglet « Maladies SIMR (34) »",
    titre: "Le Répertoire Exhaustif des 34 Maladies SIMR",
    sousTitre: "Définitions communautaires, contextes endémiques au Bénin et conduites à tenir d'urgence.",
    cibleProfils: "ASCQ, Relais, Équipes d'intervention rapide",
    pointsCles: [
      {
        icon: "🔥",
        titre: "Potentiel Épidémique (13)",
        description: "Choléra, Shigellose, Fièvre jaune, Dengue, Méningite, Fièvres hémorragiques (Lassa, Ebola), Mpox, etc.",
        stat: "13 Épidémies"
      },
      {
        icon: "🛡️",
        titre: "Élimination & Éradication (9)",
        description: "Poliomyélite (PFA), Tétanos néonatal, Buruli, Lèpre, Ver de Guinée, Filariose lymphatique, Noma.",
        stat: "9 Éliminations"
      },
      {
        icon: "🩺",
        titre: "Santé Publique & iCCM (10)",
        description: "Paludisme simple/grave, Malnutrition MAS/MAM, Pneumonie, Morsures de serpents, Rage humaine, Décès.",
        stat: "10 iCCM"
      },
      {
        icon: "🌐",
        titre: "Portée Internationale RSI (2)",
        description: "Événements sanitaires inhabituels One Health et grippe pandémique aviaire HxNy / SRAS.",
        stat: "2 RSI"
      }
    ],
    lienOnglet: "/briefing?tab=maladies",
    labelBoutonLien: "Consulter les 34 Maladies SIMR (/briefing?tab=maladies)",
    scriptOrateur: "Toutes les 34 maladies sous surveillance du Bénin sont détaillées ici avec leur définition simple, les signes qui doivent alerter la population, les zones à risque dans notre pays et la conduite immédiate à tenir."
  },
  {
    id: 18,
    pole: "RÉFÉRENTIEL CLINIQUE",
    ongletNom: "Sous-Onglet « Calendrier Vaccinal (PEV) »",
    titre: "Grille Officielle PEV & Nutrition (UNICEF / Bénin)",
    sousTitre: "13 tranches d'âge et 16 interventions prioritaires pour protéger chaque enfant contre les maladies évitables.",
    cibleProfils: "Mères, Nourrissons, Jeunes filles, ASCQ, Relais",
    pointsCles: [
      {
        icon: "👶",
        titre: "Grille Intégrée (0 à 24 mois)",
        description: "Schéma complet avec pastilles officielles : VAP (Paludisme 4 doses), TPIn+ (SP 9 passages), Vitamine A (4 doses), VAA.",
        stat: "UNICEF / PEV"
      },
      {
        icon: "👧",
        titre: "Vaccination HPV (9 à 14 ans)",
        description: "Protection des jeunes filles contre le cancer du col de l'utérus en milieu scolaire et communautaire.",
        stat: "Anti-Cancer Col"
      },
      {
        icon: "💉",
        titre: "Vaccin Td Femmes Enceintes",
        description: "Schéma des 5 doses VAT (VAT1 à VAT5) pour l'élimination définitive du tétanos de la mère et du nouveau-né.",
        stat: "5 Doses Td"
      }
    ],
    lienOnglet: "/briefing?tab=vaccins",
    labelBoutonLien: "Consulter la Grille Vaccinale (/briefing?tab=vaccins)",
    scriptOrateur: "Voici la grille officielle UNICEF et Direction de la Vaccination. Elle permet aux relais de faire du ratissage actif de porte en porte : aucun enfant de notre commune ne doit rester zéro-dose ou abandonner ses vaccins."
  },
  {
    id: 19,
    pole: "RÉFÉRENTIEL CLINIQUE",
    ongletNom: "Sous-Onglet « Santé Maternelle & CPN »",
    titre: "Protocoles de la Grossesse, CPoN & Nouveau-Né",
    sousTitre: "Norme nationale des 8 CPN, méthode Kangourou, Chlorhexidine 7,1% et planification familiale.",
    cibleProfils: "Gestantes, Accouchées, Nourrissons, ASCQ",
    pointsCles: [
      {
        icon: "🤰",
        titre: "Les 8 CPN Recommandées",
        description: "Dès le 1er trimestre : Fer-Acide folique, TPI paludisme à la SP, dépistage VIH pour la PTME.",
        stat: "8 CPN Bénin"
      },
      {
        icon: "⏰",
        titre: "Consultations Postnatales (CPoN)",
        description: "Surveillance des 48h en maternité, puis visites obligatoires à H6, J7, J15 et J42 post-partum.",
        stat: "CPoN H6-J42"
      },
      {
        icon: "🌿",
        titre: "Planification Familiale (PF)",
        description: "Espacement inter-génésique d'au moins 2 ans, méthodes modernes et naturelles OMS (MAMA, collier du cycle).",
        stat: "Espacement 2 ans"
      }
    ],
    lienOnglet: "/briefing?tab=maternelle",
    labelBoutonLien: "Ouvrir Santé Maternelle (/briefing?tab=maternelle)",
    scriptOrateur: "La mortalité maternelle et néonatale est une tragédie inacceptable. Ce sous-onglet formalise les soins essentiels : du dépistage de la pré-éclampsie lors des CPN jusqu'aux soins du cordon à la Chlorhexidine 7,1%."
  },
  {
    id: 20,
    pole: "RÉFÉRENTIEL CLINIQUE",
    ongletNom: "Sous-Onglet « Secourisme & Gestes Vitaux »",
    titre: "Protocoles de Premiers Secours & Numéros Verts",
    sousTitre: "6 protocoles d'urgence vitale et bandeau d'appel direct vers les secours d'urgence au Bénin.",
    cibleProfils: "ASCQ, Relais, Secouristes communautaires, Pompiers, SAMU",
    pointsCles: [
      {
        icon: "🩸",
        titre: "Hémorragies & Brûlures",
        description: "Tampon relais hémostatique (pas de garrot improvisé), arrosage 5 minutes eau propre (pas d'huile ni terre).",
        stat: "Gestes Vitaux"
      },
      {
        icon: "🫁",
        titre: "Étouffement & Arrêt Cardiaque",
        description: "5 claques dorsales puis méthode Heimlich, Massage Cardiaque Externe (MCE) 100-120/min et rythme 30:2.",
        stat: "MCE & Heimlich"
      },
      {
        icon: "📞",
        titre: "Lignes d'Urgence en 1 Clic",
        description: "SAMU (+229 21 30 73 36), Sapeurs-Pompiers (118), Police (17), Ligne 138 (Enfance/VBG), Ligne 136 (Épidémies MS).",
        stat: "Appel 24/7"
      }
    ],
    lienOnglet: "/briefing?tab=secourisme",
    labelBoutonLien: "Consulter le Secourisme (/briefing?tab=secourisme)",
    scriptOrateur: "Face à une défaillance vitale au village, chaque seconde compte. Cet onglet détaille les gestes qui sauvent et ceux qui sont formellement interdits, avec les numéros d'urgence nationaux joignables directement depuis l'écran."
  },
  {
    id: 21,
    pole: "RÉFÉRENTIEL CLINIQUE",
    ongletNom: "Sous-Onglet « Organisation & VAD Terrain »",
    titre: "Attributions, Actes Interdits & VAD en 6 Étapes",
    sousTitre: "Le cadre déontologique officiel CNLS-TP et la règle de gestion logistique PEPS / FEFO.",
    cibleProfils: "Relais Communautaires, ASCQ, Superviseurs, Maires",
    pointsCles: [
      {
        icon: "🚫",
        titre: "Les 5 Actes Strictement Interdits",
        description: "Pas d'injections/incisions, pas de vente de médicaments gratuits, pas de demande d'argent/repas, pas de garde de malade.",
        stat: "5 Interdictions"
      },
      {
        icon: "🏡",
        titre: "Protocole VAD en 6 Étapes",
        description: "Salutation officielle ➔ Objet de visite ➔ Recueil méthodique (père/mère/enfants) ➔ Conseil CCC ➔ Synthèse ➔ R-V.",
        stat: "6 Étapes VAD"
      },
      {
        icon: "📦",
        titre: "Règle Logistique PEPS / FEFO",
        description: "« Premier Expiré, Premier Sorti » en caisson métallique ignifugé pour zéro péremption d'intrants étatiques.",
        stat: "Règle FEFO"
      }
    ],
    lienOnglet: "/briefing?tab=organisation",
    labelBoutonLien: "Consulter Organisation & VAD (/briefing?tab=organisation)",
    scriptOrateur: "Ici est gravée la déontologie républicaine de l'agent communautaire : intégrité absolue, gratuité des médicaments, respect des familles et déroulement méthodique des visites à domicile en 6 étapes."
  },

  // =========================================================================
  // PÔLE 6 : TERRAIN, VISITES À DOMICILE & SUPERVISION RC
  // =========================================================================
  {
    id: 22,
    pole: "TERRAIN & SUPERVISION",
    ongletNom: "Planning d'Activités (/espace-ascq/planning)",
    titre: "Planification Hebdomadaire des Visites à Domicile",
    sousTitre: "Organisation des passages systématiques dans le portefeuille des 150 à 200 ménages assignés.",
    cibleProfils: "ASCQ, Relais Communautaires",
    pointsCles: [
      {
        icon: "📅",
        titre: "Programmation des Passages",
        description: "Planification des tournées de visites à domicile par quartier et identification des concessions prioritaires.",
        stat: "Hebdomadaire"
      },
      {
        icon: "🎯",
        titre: "Stratégies Fixes & Avancées",
        description: "Organisation des causeries éducatives de groupe et des séances de pesée communautaire.",
        stat: "Stratégies"
      },
      {
        icon: "📍",
        titre: "Suivi de Couverture Territoriale",
        description: "Permet de s'assurer qu'aucun hameau reculé de l'arrondissement n'est délaissé pendant le mois.",
        stat: "Équité Rurale"
      }
    ],
    lienOnglet: "/espace-ascq/planning",
    labelBoutonLien: "Ouvrir le Planning (/espace-ascq/planning)",
    scriptOrateur: "L'efficacité sur le terrain repose sur la rigueur de la planification. Ce module structure le calendrier des agents et relais pour garantir qu'aucune concession n'est oubliée."
  },
  {
    id: 23,
    pole: "TERRAIN & SUPERVISION",
    ongletNom: "Activités Menées (/espace-ascq/activites-menees)",
    titre: "Journal de Bord des Actions de Santé Publique",
    sousTitre: "La traçabilité horodatée de toutes les séances de sensibilisation et d'assainissement réalisées.",
    cibleProfils: "ASCQ, Chefs d'Arrondissement, Comités d'hygiène",
    pointsCles: [
      {
        icon: "🧼",
        titre: "Sensibilisation & CCC",
        description: "Comptes-rendus des causeries sur le lavage des mains au savon, l'utilisation des moustiquaires et la PF.",
        stat: "Éducation Santé"
      },
      {
        icon: "💧",
        titre: "Traitement de l'Eau de Boisson",
        description: "Démonstrations pratiques d'utilisation des comprimés Aquatabs et assainissement des points d'eau.",
        stat: "Eau Saine"
      },
      {
        icon: "📈",
        titre: "Indicateurs d'Assiduité",
        description: "Chaque action est enregistrée et contribue à la note de performance de l'arrondissement.",
        stat: "Performance"
      }
    ],
    lienOnglet: "/espace-ascq/activites-menees",
    labelBoutonLien: "Consulter les Activités Menées (/espace-ascq/activites-menees)",
    scriptOrateur: "Le travail communautaire ne se limite pas aux soins : il s'agit avant tout d'éducation et de prévention. Ce journal permet à la commune de mesurer l'effort de sensibilisation déployé auprès des habitants."
  },
  {
    id: 24,
    pole: "TERRAIN & SUPERVISION",
    ongletNom: "Suivi des Relais (/espace-ascq/suivi-relais)",
    titre: "Supervision Formative & Contrôle Qualité des RC",
    sousTitre: "L'encadrement pédagogique continu des Relais de village par l'ASCQ qualifié de l'arrondissement.",
    cibleProfils: "ASCQ Superviseur, Relais Communautaires",
    pointsCles: [
      {
        icon: "📋",
        titre: "Validation des Fiches Hebdomadaires",
        description: "L'ASCQ vérifie la cohérence des rapports soumis par ses relais avant consolidation dans le SNIS.",
        stat: "Contrôle Qualité"
      },
      {
        icon: "💡",
        titre: "Accompagnement Pédagogique",
        description: "Remarques et axes d'amélioration adressés au relais lors des visites de supervision sur le terrain.",
        stat: "Supervision Formative"
      },
      {
        icon: "🤝",
        titre: "Cohésion de l'Équipe Communale",
        description: "Maintien d'un lien direct entre les agents qualifiés et le réseau bénévole des villages.",
        stat: "Solidarité"
      }
    ],
    lienOnglet: "/espace-ascq/suivi-relais",
    labelBoutonLien: "Ouvrir le Suivi des Relais (/espace-ascq/suivi-relais)",
    scriptOrateur: "La force d'un réseau dépend de la qualité de sa supervision. L'ASCQ utilise ce module pour corriger les erreurs de ses relais, les encourager et s'assurer de l'exactitude des chiffres transmis."
  },
  {
    id: 25,
    pole: "TERRAIN & SUPERVISION",
    ongletNom: "Mes Relais (/espace-ascq/relais)",
    titre: "Annuaire Opérationnel des Relais du Secteur",
    sousTitre: "Gestion de l'équipe de proximité : affectation des villages, codes d'accès et contacts directs.",
    cibleProfils: "ASCQ d'Arrondissement, Relais Communautaires",
    pointsCles: [
      {
        icon: "👥",
        titre: "Liste Nominative des Relais",
        description: "Nom, prénoms, village ou quartier assigné, numéro béninois et statut d'activité de chaque relais.",
        stat: "Effectif Réel"
      },
      {
        icon: "🔐",
        titre: "Gestion des Codes d'Accès",
        description: "Facilite l'accompagnement des relais lors de leur première connexion ou réinitialisation de mot de passe.",
        stat: "Accès Sécurisé"
      },
      {
        icon: "💬",
        titre: "Communication Directe 1 Clic",
        description: "Boutons d'appel et WhatsApp pour échanger instantanément avec chaque relais de l'arrondissement.",
        stat: "Liaison Instantanée"
      }
    ],
    lienOnglet: "/espace-ascq/relais",
    labelBoutonLien: "Ouvrir « Mes Relais » (/espace-ascq/relais)",
    scriptOrateur: "Chaque ASCQ a sous sa responsabilité directe ses relais de quartier. Cet annuaire lui permet de garder le contact permanent avec ses équipes sur le terrain."
  },

  // =========================================================================
  // PÔLE 7 : RAPPORTS SNIS & DÉLAIS RÉGLEMENTAIRES
  // =========================================================================
  {
    id: 26,
    pole: "RAPPORTS SNIS",
    ongletNom: "Rapport Hebdomadaire PNSC (/espace-ascq/rapport-hebdo-pnsc)",
    titre: "Suivi Hebdomadaire de la Santé Communautaire",
    sousTitre: "La compilation à 7 jours des indicateurs clés pour la veille sanitaire d'arrondissement.",
    cibleProfils: "ASCQ, Points Focaux PNSC, Coordonnateurs",
    pointsCles: [
      {
        icon: "📊",
        titre: "Indicateurs d'Activités Hebdomadaires",
        description: "Nombre de ménages visités, enfants dépistés, cas de diarrhée traités et femmes référées pour CPN.",
        stat: "Rythme Hebdo"
      },
      {
        icon: "⚡",
        titre: "Détection Précoce des Anomalies",
        description: "Permet de repérer immédiatement une augmentation soudaine des fièvres dans un village avant la fin du mois.",
        stat: "Alerte Précoce"
      },
      {
        icon: "📝",
        titre: "Préparation du Bilan Mensuel",
        description: "Alimente automatiquement la synthèse mensuelle pour éviter le rush de saisie en fin de mois.",
        stat: "Zéro Surcharge"
      }
    ],
    lienOnglet: "/espace-ascq/rapport-hebdo-pnsc",
    labelBoutonLien: "Consulter le Suivi PNSC (/espace-ascq/rapport-hebdo-pnsc)",
    scriptOrateur: "Le suivi hebdomadaire permet de ne pas attendre la fin du mois pour savoir ce qui se passe. C'est l'instrument de pilotage à vue de l'état sanitaire de chaque village."
  },
  {
    id: 27,
    pole: "RAPPORTS SNIS",
    ongletNom: "Rapport Mensuel RMA (/espace-ascq/rapport-mensuel)",
    titre: "Rapport Mensuel d'Activité : Dépôt avant le 5",
    sousTitre: "La consolidation automatique des soins et le respect strict du délai officiel ministériel au 5 du mois.",
    cibleProfils: "ASCQ, Médecin Chef, Statisticiens DHIS2",
    pointsCles: [
      {
        icon: "🤖",
        titre: "Consolidation 100% Automatique",
        description: "L'application calcule elle-même les totaux d'après les consultations enregistrées : fin des erreurs manuelles.",
        stat: "Zéro Erreur"
      },
      {
        icon: "⏰",
        titre: "Le Verrou Réglementaire du 5",
        description: "Le rapport doit être soumis avant le 5 du mois suivant pour obtenir le statut officiel « DÉPOSÉ DANS LES DÉLAIS ».",
        stat: "Délai au 5"
      },
      {
        icon: "📈",
        titre: "Alimentation Directe du DHIS2",
        description: "Les données consolidées sont prêtes pour l'intégration dans le Système National d'Information Sanitaire.",
        stat: "Conforme DHIS2"
      }
    ],
    lienOnglet: "/espace-ascq/rapport-mensuel",
    labelBoutonLien: "Ouvrir le Rapport Mensuel RMA (/espace-ascq/rapport-mensuel)",
    scriptOrateur: "Le Rapport Mensuel d'Activité était autrefois le cauchemar des agents, qui passaient des nuits entières à recompter des lignes sur des cahiers. Ici, tout est calculé automatiquement. L'agent valide et dépose avant le 5 du mois en 1 clic."
  },

  // =========================================================================
  // PÔLE 8 : GOUVERNANCE PÉRIMÈTRE (LE TABLEAU DE BORD DES ÉLUS)
  // =========================================================================
  {
    id: 28,
    pole: "GOUVERNANCE PÉRIMÈTRE",
    ongletNom: "Périmètre — Dashboard Compilé (/perimetre)",
    titre: "Le Tableau de Bord Décisionnel du Conseil Communal",
    sousTitre: "La vision globale et consolidée de la santé de la commune pour le Maire, le SE et le Chef de Zone.",
    cibleProfils: "Maire, Secrétaire Exécutif, Médecin Chef, DDS, CDCC",
    pointsCles: [
      {
        icon: "👑",
        titre: "Cloisonnement Territorial Strict",
        description: "Chaque autorité communale visualise l'intégralité de sa commune, sans interférence avec les données voisines.",
        stat: "Territoire Maîtrisé"
      },
      {
        icon: "📈",
        titre: "Indicateurs de Performance Consolidés",
        description: "Nombre total de cas de paludisme traités, taux de détection de la malnutrition, nombre d'alertes résolues.",
        stat: "Indicateurs Clés"
      },
      {
        icon: "🗺️",
        titre: "Comparatif par Arrondissement",
        description: "Permet au Conseil Communal d'identifier immédiatement les arrondissements performants et ceux en difficulté.",
        stat: "Équité Communale"
      }
    ],
    lienOnglet: "/perimetre",
    labelBoutonLien: "Ouvrir le Périmètre Communal (/perimetre)",
    scriptOrateur: "Voici l'écran réservé aux dirigeants : Maires, Secrétaires Exécutifs de mairie et Médecins Chefs. Il vous offre une vue globale instantanée sur tous les arrondissements. Vous savez exactement où vont les ressources et quels sont les résultats."
  },
  {
    id: 29,
    pole: "GOUVERNANCE PÉRIMÈTRE",
    ongletNom: "Sous-Onglet « Suivi Individuel des ASCQ »",
    titre: "Contrôle des Délais RMA des Agents de la Commune",
    sousTitre: "La surveillance en temps réel du dépôt des rapports mensuels avant le 5 du mois.",
    cibleProfils: "Maire, SE Mairie, Représentant Communal ASCQ",
    pointsCles: [
      {
        icon: "🟢",
        titre: "Pastille Verte : DÉPOSÉ",
        description: "L'ASCQ de l'arrondissement a soumis son rapport dans les délais réglementaires avant le 5 du mois.",
        stat: "À Jour"
      },
      {
        icon: "🔴",
        titre: "Pastille Rouge : EN RETARD",
        description: "Signalement rouge immédiat si l'agent n'a pas encore déposé son rapport après la date limite.",
        stat: "Relance Requise"
      },
      {
        icon: "📲",
        titre: "Relance WhatsApp & Appel Direct",
        description: "Un clic sur l'icône WhatsApp ou téléphone permet au superviseur d'appeler directement l'agent sans chercher son numéro.",
        stat: "Action 1 Clic"
      }
    ],
    lienOnglet: "/perimetre?tab=suivi_individuel",
    labelBoutonLien: "Vérifier les Délais RMA (/perimetre?tab=suivi_individuel)",
    scriptOrateur: "Grâce à cette liste, le Secrétaire Exécutif de mairie et le Médecin Chef savent immédiatement qui est à jour et qui est en retard. En un clic sur le bouton WhatsApp, vous relancez directement l'agent en retard."
  },
  {
    id: 30,
    pole: "GOUVERNANCE PÉRIMÈTRE",
    ongletNom: "Sous-Onglet « Fiches du Territoire »",
    titre: "L'Audit Clinique des Fiches par Arrondissement",
    sousTitre: "La consultation approfondie de toutes les consultations, alertes et décès enregistrés dans la commune.",
    cibleProfils: "Médecin Chef, Coordonnateur de Zone, Superviseurs",
    pointsCles: [
      {
        icon: "🩺",
        titre: "Audit des Prises en Charge iCCM",
        description: "Vérification du respect des protocoles thérapeutiques et de la conformité des doses de CTA et d'antibiotiques.",
        stat: "Qualité des Soins"
      },
      {
        icon: "👶",
        titre: "Traçabilité des Nouveaux-Nés",
        description: "Consultation des accouchements à domicile signalés et vérification de la référence en maternité.",
        stat: "Survie Enfant"
      },
      {
        icon: "🔍",
        titre: "Transparence Totale des Actes",
        description: "Chaque fiche porte le nom de l'agent, la date, l'heure et les coordonnées GPS certifiées.",
        stat: "Zéro Fraude"
      }
    ],
    lienOnglet: "/perimetre?tab=fiches_territoire",
    labelBoutonLien: "Consulter les Fiches Territoire (/perimetre?tab=fiches_territoire)",
    scriptOrateur: "Les responsables techniques de la mairie et de la zone sanitaire peuvent ouvrir n'importe quelle fiche clinique pour auditer la qualité des soins donnés aux enfants de la commune. C'est la garantie d'une médecine communautaire irréprochable."
  },
  {
    id: 31,
    pole: "GOUVERNANCE PÉRIMÈTRE",
    ongletNom: "Sous-Onglet « Suggestions & Accompagnement »",
    titre: "Le Dialogue Constructif avec les Agents de Terrain",
    sousTitre: "L'envoi d'observations et d'encouragements personnalisés directement adressés à chaque ASCQ.",
    cibleProfils: "Cadres Communaux, Superviseurs, ASCQ",
    pointsCles: [
      {
        icon: "💡",
        titre: "Remarques Formatives Directes",
        description: "Le superviseur félicite un agent assidu ou formule des conseils pour corriger un point faible constaté.",
        stat: "Supervision Formative"
      },
      {
        icon: "📱",
        titre: "Notification Réceptionnée par l'Agent",
        description: "L'ASCQ reçoit le message directement sur son smartphone dans son espace personnel.",
        stat: "Liaison Directe"
      },
      {
        icon: "🤝",
        titre: "Climat de Travail Positif",
        description: "Remplace les sanctions aveugles par un accompagnement bienveillant et motivant.",
        stat: "Motivation"
      }
    ],
    lienOnglet: "/perimetre?tab=suggestions",
    labelBoutonLien: "Ouvrir les Suggestions (/perimetre?tab=suggestions)",
    scriptOrateur: "L'autorité ne consiste pas seulement à contrôler, elle consiste à accompagner. Cet onglet permet aux cadres de la commune de valoriser les agents méritants et de guider ceux qui rencontrent des difficultés."
  },
  {
    id: 32,
    pole: "GOUVERNANCE PÉRIMÈTRE",
    ongletNom: "Sous-Onglet « Alertes & Ordres de Mission »",
    titre: "Commandement Sanitaire & Riposte aux Épidémies",
    sousTitre: "La mobilisation immédiate d'équipes de riposte sanitaire dès confirmation d'une alerte épidémique.",
    cibleProfils: "Médecin Coordonnateur MCZS, Maire, Équipes d'investigation",
    pointsCles: [
      {
        icon: "🚨",
        titre: "Suivi des Alertes Actives",
        description: "Affichage des alertes prioritaires déclarées dans les arrondissements (fièvres jaunes, cas de rougeole, choléra).",
        stat: "Veille Active"
      },
      {
        icon: "📜",
        titre: "Émission d'Ordres de Mission",
        description: "Génération numérique formelle de l'ordre d'intervention avec attribution de l'équipe et des moyens.",
        stat: "Ordre de Mission"
      },
      {
        icon: "⏱️",
        titre: "Mesure des Délais de Riposte",
        description: "Chronométrage entre la déclaration de l'alerte et l'arrivée de l'équipe sur le terrain.",
        stat: "Rapidité Riposte"
      }
    ],
    lienOnglet: "/perimetre?tab=alertes_missions",
    labelBoutonLien: "Consulter Alertes & Missions (/perimetre?tab=alertes_missions)",
    scriptOrateur: "Dès qu'une alerte grave est confirmée au village, le Médecin Coordonnateur et le Maire utilisent cet onglet pour déclencher officiellement un ordre de mission. Tout est tracé pour une riposte rapide et coordonnée."
  },
  {
    id: 33,
    pole: "GOUVERNANCE PÉRIMÈTRE",
    ongletNom: "Sous-Onglet « Exports & Journal d'Audit »",
    titre: "Téléchargement des Données Communales en Excel/CSV",
    sousTitre: "La mise à disposition des statistiques pour les rapports de performance communaux et les partenaires.",
    cibleProfils: "Secrétaire Exécutif, Mairie, Statisticiens, Partenaires (PTF)",
    pointsCles: [
      {
        icon: "📥",
        titre: "Exports Bruts & Consolidés",
        description: "Téléchargement en un clic de l'intégralité des données en formats standards Excel (.xlsx) et CSV.",
        stat: "Excel & CSV"
      },
      {
        icon: "📑",
        titre: "Rapports pour le Conseil Communal",
        description: "Permet de produire les graphiques et tableaux insérés dans les rapports trimestriels de la municipalité.",
        stat: "Rapports Mairie"
      },
      {
        icon: "🛡️",
        titre: "Journal d'Audit Immuable",
        description: "Historique inviolable traçant chaque action, modification ou consultation effectuée dans le système.",
        stat: "Audit Inviolable"
      }
    ],
    lienOnglet: "/perimetre?tab=exports_journal",
    labelBoutonLien: "Ouvrir Exports & Audit (/perimetre?tab=exports_journal)",
    scriptOrateur: "Les données de votre commune vous appartiennent. À tout moment, le Secrétaire Exécutif peut exporter les chiffres bruts au format Excel pour alimenter le Plan de Développement Communal ou justifier des financements auprès des bailleurs."
  },
  {
    id: 34,
    pole: "GOUVERNANCE PÉRIMÈTRE",
    ongletNom: "Sous-Onglet « Nettoyage & Radiation »",
    titre: "Salubrité des Données & Radiation du Personnel",
    sousTitre: "Purge des fiches tests/doublons et révocation des comptes des agents n'étant plus en fonction.",
    cibleProfils: "Représentants Communaux, Cadres Départementaux, Super Admin",
    pointsCles: [
      {
        icon: "🧹",
        titre: "Nettoyage des Fiches Erronées",
        description: "Suppression sécurisée des fiches tests ou doublons accidentels pour préserver l'exactitude des statistiques.",
        stat: "Données Pures"
      },
      {
        icon: "⚖️",
        titre: "Radiation du Personnel Sortant",
        description: "Révocation formelle de l'accès des agents en fin de contrat, démissionnaires ou révoqués, avec motif légal.",
        stat: "Discipline"
      },
      {
        icon: "🔄",
        titre: "Rétablissement Possible",
        description: "Possibilité de réactiver immédiatement un compte en cas de réintégration ou de reprise d'activité.",
        stat: "Réactivation"
      }
    ],
    lienOnglet: "/perimetre?tab=nettoyage_radiation",
    labelBoutonLien: "Ouvrir Nettoyage & Radiation (/perimetre?tab=nettoyage_radiation)",
    scriptOrateur: "Cet onglet garantit la pureté de la base de données : vous pouvez purger les essais ou fiches erronées et radier officiellement les agents qui ne sont plus en fonction dans votre commune, avec archivage du motif légal."
  },

  // =========================================================================
  // PÔLE 9 : ADMINISTRATION MULTI-NIVEAUX & OUTILS TRANSVERSAUX
  // =========================================================================
  {
    id: 35,
    pole: "ADMINISTRATION CENTRALE",
    ongletNom: "Gestion des Comptes (/admin)",
    titre: "La Gouvernance Multi-Niveaux des Utilisateurs",
    sousTitre: "Validation, suspension et contrôle hiérarchique de l'ensemble des cadres et agents du pays.",
    cibleProfils: "Super Administrateur National, Administrateurs Nationaux",
    pointsCles: [
      {
        icon: "👑",
        titre: "Filtrage par Échelon Territorial",
        description: "Filtres instantanés : Tous, National, Départemental, Zone sanitaire, Communal, ASCQ, Relais (RC).",
        stat: "Multi-Niveaux"
      },
      {
        icon: "🔒",
        titre: "Précision Obligatoire des Fonctions",
        description: "Aucun cadre ne peut s'inscrire sans préciser sa fonction exacte (MCZS, Chef service DDS, Directeur ministère).",
        stat: "Zéro Faux Profil"
      },
      {
        icon: "🛡️",
        titre: "Suppression Définitive Sécurisée",
        description: "Action irréversible protégée par la saisie obligatoire du mot-clé SUPPRIMER en majuscules.",
        stat: "Sécurité Maximale"
      }
    ],
    lienOnglet: "/admin",
    labelBoutonLien: "Ouvrir l'Espace Administration (/admin)",
    scriptOrateur: "L'Espace Administration permet à la Coordination Nationale de veiller au respect de la hiérarchie. Chaque utilisateur est identifié, validé et rattaché à son niveau d'exercice légal."
  },
  {
    id: 36,
    pole: "OUTILS & RESSOURCES",
    ongletNom: "Bibliothèque Documentaire (/espace-ascq/bibliotheque)",
    titre: "Le Centre de Téléchargement des Directives Nationales",
    sousTitre: "Accès aux textes de lois, décrets, manuels de formation et guides cliniques officiels en format PDF.",
    cibleProfils: "Tous les Utilisateurs, Élus, Directeurs",
    pointsCles: [
      {
        icon: "📖",
        titre: "Manuels Officiels PNSC",
        description: "Téléchargement complet du Guide National de l'ASC (333 pages) et du Guide SIMR/PEV 2026.",
        stat: "Manuels PDF"
      },
      {
        icon: "⚖️",
        titre: "Textes Législatifs & Décrets",
        description: "Lois sur la décentralisation, arrêtés ministériels régissant la santé communautaire et déontologie.",
        stat: "Cadre Légal"
      },
      {
        icon: "📥",
        titre: "Disponible Hors-Ligne",
        description: "Les documents téléchargés restent consultables sur le téléphone même sans réseau internet.",
        stat: "Accès Permanent"
      }
    ],
    lienOnglet: "/espace-ascq/bibliotheque",
    labelBoutonLien: "Ouvrir la Bibliothèque (/espace-ascq/bibliotheque)",
    scriptOrateur: "Cet espace documentaire garantit que tous les acteurs de la commune disposent des mêmes textes de référence officiels, sans dépendre de photocopies égarées."
  },
  {
    id: 37,
    pole: "OUTILS & RESSOURCES",
    ongletNom: "Permutations Géographiques (/espace-ascq/permutations)",
    titre: "La Bourse d'Échange Transparente entre ASCQ",
    sousTitre: "Le mécanisme formel permettant aux agents qualifiés de solliciter une permutation de poste consensuelle.",
    cibleProfils: "ASCQ, Directeurs Départementaux DDS, Maires",
    pointsCles: [
      {
        icon: "🔄",
        titre: "Publication des Demandes de Permutation",
        description: "L'ASCQ publie son arrondissement d'origine et les communes souhaitées pour raisons familiales ou de santé.",
        stat: "Bourse d'Échange"
      },
      {
        icon: "🤝",
        titre: "Consentement Mutuel Transparent",
        description: "Mise en relation directe entre deux agents consentants avant soumission pour validation hiérarchique.",
        stat: "Transparence"
      },
      {
        icon: "🏛️",
        titre: "Approbation des Autorités",
        description: "Le transfert n'est effectif qu'après signature de l'arrêté conjoint par la DDS et les mairies concernées.",
        stat: "Cadre Légal"
      }
    ],
    lienOnglet: "/espace-ascq/permutations",
    labelBoutonLien: "Consulter les Permutations (/espace-ascq/permutations)",
    scriptOrateur: "Pour fidéliser nos agents de santé en milieu rural, nous devons écouter leurs contraintes familiales. Cette bourse d'échange évite les abandons de poste en organisant des permutations équilibrées et officielles."
  },
  {
    id: 38,
    pole: "OUTILS & RESSOURCES",
    ongletNom: "Requêtes & Assistance (/espace-ascq/requetes)",
    titre: "Le Guichet de Signalement & d'Assistance Technique",
    sousTitre: "Le canal direct pour soumettre une doléance matérielle, une panne ou un besoin de réapprovisionnement.",
    cibleProfils: "ASCQ, Relais, Administrateurs techniques",
    pointsCles: [
      {
        icon: "📩",
        titre: "Soumission Structurée des Requêtes",
        description: "Formulaire permettant d'exprimer un besoin d'intrants, une défaillance de matériel ou une question technique.",
        stat: "Assistance"
      },
      {
        icon: "⏱️",
        titre: "Suivi du Traitement en Temps Réel",
        description: "Statut de prise en charge : En attente, En cours de traitement, Résolu par la coordination.",
        stat: "Suivi Ticket"
      },
      {
        icon: "🛠️",
        titre: "Appui Réactif aux Agents Isolés",
        description: "Permet aux agents en poste reculé de ne jamais rester bloqués sans réponse de leur hiérarchie.",
        stat: "Zéro Rupture"
      }
    ],
    lienOnglet: "/espace-ascq/requetes",
    labelBoutonLien: "Ouvrir les Requêtes (/espace-ascq/requetes)",
    scriptOrateur: "Lorsqu'un agent fait face à une rupture de tests ou à un problème de téléphone sur le terrain, il n'a pas besoin de parcourir des dizaines de kilomètres : il dépose sa requête dans l'application et la coordination intervient."
  },

  // =========================================================================
  // PÔLE 10 : ADOPTION & VOTE DU CONSEIL
  // =========================================================================
  {
    id: 39,
    pole: "DÉLIBÉRATION DU CONSEIL",
    ongletNom: "Synthèse & Délibération Officielle",
    titre: "Projet de Délibération Soumis au Vote du Conseil",
    sousTitre: "Faire de notre commune le pionnier national de la santé communautaire numérique.",
    cibleProfils: "Maire, Secrétaire Exécutif, Membres du Conseil Communal",
    pointsCles: [
      {
        icon: "📜",
        titre: "Article 1er : Adoption de la Plateforme",
        description: "Le Conseil Communal adopte la plateforme ASCQ Bénin comme outil de référence pour la santé de proximité.",
        stat: "Vote Favorable"
      },
      {
        icon: "👥",
        titre: "Article 2 : Mobilisation des Chefs d'Arrondissement",
        description: "Les élus locaux et chefs de village sont instruits pour faciliter le travail des ASCQ et des Relais.",
        stat: "Mobilisation"
      },
      {
        icon: "☀️",
        titre: "Article 3 : Appui Logistique Communal",
        description: "Inscrire l'appui de proximité (recharge solaire, émulation des relais) dans le Plan de Développement Communal (PDC).",
        stat: "PDC 2026-2030"
      }
    ],
    lienOnglet: "/presentation",
    labelBoutonLien: "Consulter le Texte Complet de la Délibération",
    scriptOrateur: "Mesdames et Messieurs les Conseillers, vous avez vu l'intégralité des modules, des fiches et des fonctionnalités de l'application ASCQ Bénin. Nos équipes sur le terrain sont prêtes. Donnons-leur les outils du 21e siècle. Je vous invite à adopter solennellement ce projet de délibération au nom de la santé de nos concitoyens. Je vous remercie."
  }
];

export default function PresentationConseilsPage() {
  const router = useRouter();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedPole, setSelectedPole] = useState("TOUS");

  const totalSlides = TOUTES_LES_SLIDES.length;
  const currentSlide = TOUTES_LES_SLIDES[currentSlideIndex];

  // Liste unique des pôles pour le sélecteur
  const POLES_DISPONIBLES = ["TOUS", ...Array.from(new Set(TOUTES_LES_SLIDES.map(s => s.pole)))];

  const nextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Gestion des touches du clavier pour projeter (Flèches, Espace, F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Space") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-white print:bg-white print:text-black">
      
      {/* 1. Barre d'outils supérieure de présentation */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 shrink-0 flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/espace-ascq"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Quitter</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <div className="leading-tight">
              <span className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-200 block">
                Session Officielle Conseil
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:block">
                Présentation Exhaustive par Onglet & Sous-Onglet (1 Slide = 1 Onglet)
              </span>
            </div>
          </div>
        </div>

        {/* Sélecteur de pôle thématique */}
        <div className="hidden lg:flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Pôle :</span>
          <select
            value={selectedPole}
            onChange={(e) => {
              setSelectedPole(e.target.value);
              if (e.target.value !== "TOUS") {
                const firstSlide = TOUTES_LES_SLIDES.findIndex(s => s.pole === e.target.value);
                if (firstSlide !== -1) setCurrentSlideIndex(firstSlide);
              }
            }}
            className="bg-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-400 font-bold"
          >
            {POLES_DISPONIBLES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Boutons d'action (Notes, Plein écran, Impression) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              showNotes
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
            title="Afficher ou masquer les notes orales de l'orateur"
          >
            {showNotes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Script Orateur</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            title="Imprimer les transparents officiels pour le Conseil"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Imprimer Dossier</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Plein écran (Touche F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. Bandeau Tricolore Bénin Officiel */}
      <div className="h-1.5 w-full flex shrink-0">
        <span className="w-1/3 bg-[#008751]"></span>
        <span className="w-1/3 bg-[#FCD116]"></span>
        <span className="w-1/3 bg-[#E8112D]"></span>
      </div>

      {/* 3. Bandeau de saut rapide aux onglets (Scrollable horizontalement) */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 print:hidden">
        {TOUTES_LES_SLIDES.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => setCurrentSlideIndex(idx)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
              currentSlideIndex === idx
                ? "bg-[#008751] text-white shadow-sm ring-1 ring-emerald-400"
                : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            title={`Slide ${s.id} : ${s.ongletNom}`}
          >
            <span className="opacity-70 text-[9px] font-mono">{s.id}.</span>
            <span>{s.ongletNom}</span>
          </button>
        ))}
      </div>

      {/* 4. Corps Central : La Diapositive Active (Canvas Haute Visibilité) */}
      <main className="flex-1 flex flex-col justify-center max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="space-y-5">
          
          {/* Tag & Numéro de Slide */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {currentSlide.pole}
              </span>
              <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg">
                Onglet : {currentSlide.ongletNom}
              </span>
              <span className="text-xs text-slate-500 hidden md:inline">
                • Cible : {currentSlide.cibleProfils}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono font-black text-xs text-slate-400 shrink-0">
              <span className="text-emerald-400 text-sm">{currentSlide.id}</span>
              <span>/</span>
              <span>{totalSlides}</span>
            </div>
          </div>

          {/* Titre & Sous-titre de la Diapositive */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              {currentSlide.titre}
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-400 leading-relaxed max-w-4xl">
              {currentSlide.sousTitre}
            </p>
          </div>

          {/* Cartes de contenu opérationnel (Grille Responsive) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {currentSlide.pointsCles.map((pt, pIdx) => (
              <div
                key={pIdx}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-2.5 group shadow-lg"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-2xl p-2 rounded-2xl bg-slate-800/80 group-hover:scale-110 transition-transform">
                      {pt.icon}
                    </span>
                    {pt.stat && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {pt.stat}
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors">
                    {pt.titre}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {pt.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* LE BOUTON MAJEUR EXIGÉ : REDIRECTION DIRECTE VERS L'ONGLET CORRESPONDANT */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-4 rounded-3xl border border-emerald-500/30 shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ExternalLink className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-black text-emerald-400 tracking-wider block">
                  Lien Direct Vers le Module Réel :
                </span>
                <span className="font-mono text-xs text-slate-300 font-bold">
                  {currentSlide.lienOnglet}
                </span>
              </div>
            </div>

            <Link
              href={currentSlide.lienOnglet}
              target="_blank"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#008751] hover:bg-emerald-600 text-white font-black text-xs shadow-lg active:scale-95 transition-all group shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
              <span>{currentSlide.labelBoutonLien}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* 5. Notes de l'orateur (Script de parole mot à mot) */}
          {showNotes && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-4 sm:p-5 space-y-1.5 animate-in fade-in print:bg-slate-50 print:text-slate-800 print:border-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Script de Parole Officiel pour l'Orateur (Ce que vous dites au Conseil) :
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed italic font-serif pl-2 border-l-2 border-amber-500/40 print:text-slate-900">
                « {currentSlide.scriptOrateur} »
              </p>
            </div>
          )}

        </div>
      </main>

      {/* 6. Barre de navigation inférieure (Flèches & Progression) */}
      <footer className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-3 shrink-0 flex items-center justify-between gap-3 print:hidden">
        <button
          onClick={prevSlide}
          disabled={currentSlideIndex === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-extrabold text-white transition-all active:scale-95 shadow-md"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Précédent</span>
        </button>

        {/* Indicateur de pagination */}
        <div className="text-center truncate max-w-md">
          <span className="text-xs font-black text-slate-200 block truncate">
            Slide {currentSlide.id} : {currentSlide.ongletNom} — {currentSlide.titre}
          </span>
          <span className="text-[10px] text-slate-500 hidden sm:block">
            Utilisez les touches clavier [←] et [→] ou [Espace] • Touche [F] pour Plein Écran
          </span>
        </div>

        <button
          onClick={nextSlide}
          disabled={currentSlideIndex === totalSlides - 1}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-[#008751] hover:bg-emerald-600 disabled:opacity-30 disabled:pointer-events-none text-xs font-extrabold text-white transition-all active:scale-95 shadow-md"
        >
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>

    </div>
  );
}
