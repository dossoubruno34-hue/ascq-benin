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
  ArrowRight
} from "lucide-react";

interface SlideData {
  id: number;
  tag: string;
  titre: string;
  sousTitre: string;
  pointsCles: {
    icon: string;
    titre: string;
    description: string;
    stat?: string;
  }[];
  visuelType: "stats" | "pyramide" | "iccm" | "alerte" | "briefing" | "citoyen" | "offline" | "perimetre" | "fefo" | "deliberation" | "comparaison";
  scriptOrateur: string;
  actionDemo?: {
    label: string;
    lien: string;
  };
}

const SLIDES_PRESENTATION: SlideData[] = [
  {
    id: 1,
    tag: "VISION & SOUVERAINETÉ",
    titre: "Révolutionner la Santé Communautaire au Bénin",
    sousTitre: "L'Application Officielle ASCQ Bénin : Le pont numérique interactif entre les ménages, les élus locaux et la pyramide sanitaire nationale.",
    pointsCles: [
      {
        icon: "🇧🇯",
        titre: "Conforme aux Normes Nationales",
        description: "Alignée sur le Guide de l'ASC (CNLS-TP Présidence du Bénin 2020) et le Guide SIMR/PEV (Octobre 2026).",
        stat: "100% Officiel"
      },
      {
        icon: "⚡",
        titre: "Temps Réel & Zéro Papier",
        description: "Fin des retards de 90 jours : les données cliniques et alertes remontent instantanément de chaque village.",
        stat: "< 2 min"
      },
      {
        icon: "🏛️",
        titre: "Outil Dédié aux Élus Locaux",
        description: "Permet aux Maires, SE et Chefs d'Arrondissement de piloter la santé de leur commune en toute transparence.",
        stat: "77 Communes"
      }
    ],
    visuelType: "stats",
    scriptOrateur: "Monsieur le Maire, Mesdames et Messieurs les Conseillers communaux, honorables invités. La santé de nos concitoyens, en particulier des femmes enceintes et des tout-petits dans nos hameaux les plus reculés, est le premier socle du développement économique et social de notre commune. Jusqu'à présent, nous étions confrontés à un aveuglement statistique : des registres papier abîmés, des rapports qui arrivent avec 3 mois de retard, et des épidémies découvertes quand il est déjà trop tard. Aujourd'hui, nous vous présentons l'outil officiel qui change définitivement la donne : l'application ASCQ Bénin."
  },
  {
    id: 2,
    tag: "CONSTAT & DIAGNOSTIC",
    titre: "Pourquoi l'Ancien Système Atteignait ses Limites ?",
    sousTitre: "Les 4 goulets d'étranglement majeurs qui paralysaient l'action sanitaire dans nos arrondissements.",
    pointsCles: [
      {
        icon: "📄",
        titre: "La Rupture du Papier",
        description: "Des milliers de fiches manuscrites sujettes à l'usure, aux erreurs de calcul et aux pertes lors des pluies en visite à domicile.",
        stat: "30% de pertes"
      },
      {
        icon: "⏳",
        titre: "Retard Critique du DHIS2",
        description: "Les rapports mensuels mettaient entre 30 et 90 jours pour parvenir au niveau central, empêchant toute riposte précoce.",
        stat: "J+60 jours"
      },
      {
        icon: "🚸",
        titre: "Enfants « Zéro-Dose » Invisibles",
        description: "Impossible d'identifier nominativement les enfants non vaccinés ou les femmes ayant abandonné les consultations prénatales.",
        stat: "Perdus de vue"
      },
      {
        icon: "💊",
        titre: "Risques sur les Médicaments",
        description: "Péremption d'intrants faute de visibilité des stocks, ou ruptures inexpliquées alors que le magasin de zone est approvisionné.",
        stat: "Gaspillage"
      }
    ],
    visuelType: "comparaison",
    scriptOrateur: "Combien d'enfants meurent encore d'un simple accès de paludisme ou d'une pneumonie parce que l'alerte n'a pas été donnée à temps ? Combien de fois nos arrondissements ont-ils manqué d'intrants alors que le magasin de zone était plein ? Ce n'est pas un manque de dévouement de nos agents et relais, c'est un manque d'outil moderne. Voici ce que l'application résout immédiatement."
  },
  {
    id: 3,
    tag: "ARCHITECTURE NATIONALE",
    titre: "Une Pyramide Interactive sans Court-Circuit",
    sousTitre: "Chaque niveau territorial conserve ses prérogatives, sa visibilité et son autorité régalienne.",
    pointsCles: [
      {
        icon: "🤝",
        titre: "Niveau 1 : Village & Hameau",
        description: "Les Relais Communautaires (RC) suivent 150 à 200 ménages, réalisent les VAD et déclarent les alertes en 1 clic.",
        stat: "Village"
      },
      {
        icon: "🩺",
        titre: "Niveau 2 : Arrondissement",
        description: "Les ASCQ qualifiés dispensent les soins iCCM (palu, pneumonie, diarrhée), supervisent les RC et consolident les données.",
        stat: "Arrondissement"
      },
      {
        icon: "🏛️",
        titre: "Niveau 3 : Commune & Zone",
        description: "Le Maire, le SE, le Médecin Chef (MCC) et le Coordonnateur de Zone (MCZS) supervisent les indicateurs et gèrent le personnel.",
        stat: "Commune / Zone"
      },
      {
        icon: "👑",
        titre: "Niveau 4 & 5 : Département & Ministère",
        description: "La DDS, le Préfet et la Direction Nationale de la Santé Publique pilotent la stratégie et allouent les ressources.",
        stat: "National"
      }
    ],
    visuelType: "pyramide",
    scriptOrateur: "Dans cette architecture, aucune autorité n'est court-circuitée. Le Maire et les Chefs d'Arrondissement ne sont plus de simples spectateurs : ils ont sous les yeux, au jour le jour, la réalité sanitaire de leur population, arrondissement par arrondissement."
  },
  {
    id: 4,
    tag: "CLINIQUE & SOINS VITAUX",
    titre: "Sauver des Vies dès le Village : Le Module iCCM",
    sousTitre: "La prise en charge intégrée des maladies de l'enfant de 2 à 59 mois sans risque d'erreur posologique.",
    pointsCles: [
      {
        icon: "🦟",
        titre: "Paludisme Simple & Grave",
        description: "Dépistage par TDR, calcul automatique de la dose de CTA selon le poids/âge, référence immédiate si signes de danger.",
        stat: "TDR & CTA"
      },
      {
        icon: "🫁",
        titre: "Pneumonie de l'Enfant",
        description: "Minuteur de 60 secondes intégré pour le comptage de la fréquence respiratoire et dispensation d'Amoxicilline dispersible.",
        stat: "Minuteur FR"
      },
      {
        icon: "💧",
        titre: "Diarrhées & Déshydratation",
        description: "Évaluation du pli cutané et prescription du protocole officiel SRO (Orasel) + Sulfate de Zinc pendant 10 jours.",
        stat: "SRO + Zinc"
      },
      {
        icon: "📏",
        titre: "Dépistage Malnutrition",
        description: "Mesure du périmètre brachial au ruban Shakir (MAS / MAM) et recherche systématique des œdèmes du Kwashiorkor.",
        stat: "Ruban Shakir"
      }
    ],
    visuelType: "iccm",
    scriptOrateur: "Grâce au module iCCM embarqué sur le téléphone de l'ASCQ, l'erreur de posologie devient impossible. L'application guide le praticien étape par étape. Si l'enfant présente des signes de danger vital, l'application bloque le traitement à domicile et ordonne la référence d'urgence vers le centre de santé avec fiche pré-remplie."
  },
  {
    id: 5,
    tag: "VEILLE & SÉCURITÉ SANITAIRE",
    titre: "Riposte Épidémique en Temps Réel : L'Alerte SIMR",
    sousTitre: "Du soupçon au village à la mobilisation de la riposte en moins de deux minutes chrono.",
    pointsCles: [
      {
        icon: "✍️",
        titre: "Signature Tactile Directe",
        description: "L'alerte est signée du doigt sur l'écran tactile soit par le Relais, soit par l'ASCQ. Aucun visa préalable n'est exigé.",
        stat: "Signature Directe"
      },
      {
        icon: "📍",
        titre: "Balise GPS Automatique",
        description: "Coordonnées géographiques précises attachées au foyer épidémique pour guider directement les équipes de désinfection.",
        stat: "GPS Précis"
      },
      {
        icon: "📲",
        titre: "Notification Push Immédiate",
        description: "Le Médecin Chef, la mairie, la DDS et le Ministère reçoivent un pop-up d'alerte sur leur écran comme sur WhatsApp.",
        stat: "Instantané"
      }
    ],
    visuelType: "alerte",
    actionDemo: {
      label: "Simuler une alerte SIMR",
      lien: "/fiches/alerte/nouvelle"
    },
    scriptOrateur: "Imaginez qu'un cas suspect de Choléra, de Fièvre Lassa ou de Rougeole survienne dans un hameau reculé de notre commune à 2 heures du matin. Avec l'ancien système, il fallait attendre des jours. Avec ASCQ Bénin, le Relais ou l'ASCQ signe immédiatement l'alerte sur son téléphone. À la seconde suivante, le Médecin Coordonnateur et le Ministère reçoivent la notification avec les coordonnées GPS exactes du foyer."
  },
  {
    id: 6,
    tag: "RÉFÉRENTIEL SCIENTIFIQUE",
    titre: "Le Centre National de Référence Clinique (/briefing)",
    sousTitre: "Toute la médecine communautaire officielle du Bénin intégrée dans la poche de chaque agent.",
    pointsCles: [
      {
        icon: "🔍",
        titre: "« Je vois... je pense à... »",
        description: "25 tableaux cliniques pour orienter immédiatement le diagnostic communautaire par le signe apparent.",
        stat: "25 Orientations"
      },
      {
        icon: "🚨",
        titre: "34 Maladies SIMR Décryptées",
        description: "Définitions simples, signes qui alertent la communauté, contextes au Bénin et conduites à tenir officielles.",
        stat: "34 Fiches SIMR"
      },
      {
        icon: "💉",
        titre: "Grille Vaccinale UNICEF / PEV",
        description: "13 tranches d'âge et 16 interventions prioritaires (Paludisme VAP, TPIn+, Vitamine A, Fièvre jaune, HPV 9-14 ans).",
        stat: "Norme PEV"
      },
      {
        icon: "🩹",
        titre: "Secourisme & Numéros Verts",
        description: "6 protocoles vitaux (hémorragies, brûlures, Heimlich, PLS, arrêt cardiaque) et appel direct SAMU 21 30 73 36, Pompiers 118.",
        stat: "Urgences 24/7"
      }
    ],
    visuelType: "briefing",
    actionDemo: {
      label: "Ouvrir le Centre de Référence",
      lien: "/briefing"
    },
    scriptOrateur: "Chaque agent de santé et chaque relais dispose dans sa main de l'encyclopédie clinique complète validée par les autorités sanitaires nationales. Rien n'est inventé, tout est conforme aux décrets et guides nationaux. Même en l'absence de médecin sur place, l'agent sait exactement quel réflexe adopter."
  },
  {
    id: 7,
    tag: "TRANSPARENCE & DÉMOCRATIE",
    titre: "Redevabilité & Écoute Citoyenne : L'Espace Grand Public",
    sousTitre: "Rapprocher l'administration communale et le système de santé des préoccupations réelles des habitants.",
    pointsCles: [
      {
        icon: "🌐",
        titre: "Accès Libre sans Mot de Passe",
        description: "Chaque citoyen peut consulter la plateforme depuis son propre téléphone pour suivre l'actualité sanitaire.",
        stat: "100% Libre"
      },
      {
        icon: "📍",
        titre: "« Qui est mon ASCQ ? »",
        description: "L'habitant sélectionne sa commune et son arrondissement pour afficher la photo, le nom et le contact direct de son agent.",
        stat: "Géolocalisé"
      },
      {
        icon: "💬",
        titre: "Boîte à Suggestions Sécurisée",
        description: "« Aidez-nous à mieux vous servir » : formulaire permettant aux administrés d'exprimer leurs besoins ou alertes.",
        stat: "Écoute Citoyenne"
      },
      {
        icon: "📱",
        titre: "Canaux Réseaux Sociaux",
        description: "Liaisons directes vers Threads, Instagram, X/Twitter (@ascqbenin), WhatsApp officiel et Facebook.",
        stat: "7 Réseaux"
      }
    ],
    visuelType: "citoyen",
    actionDemo: {
      label: "Tester « Qui est mon ASCQ ? »",
      lien: "/"
    },
    scriptOrateur: "C'est un instrument d'inclusion démocratique remarquable. Vos administrés ne se sentent plus abandonnés. Ils savent exactement qui est l'agent de santé de leur quartier, peuvent le joindre d'un clic sur WhatsApp ou par téléphone, et peuvent faire remonter leurs doléances directement à la mairie."
  },
  {
    id: 8,
    tag: "INNOVATION RURALE",
    titre: "Une Technologie Conçue pour nos Réalités de Terrain",
    sousTitre: "Pourquoi l'application fonctionne parfaitement même dans les villages les plus isolés du Bénin.",
    pointsCles: [
      {
        icon: "📡",
        titre: "100% Hors-Ligne (PWA Offline)",
        description: "L'agent ouvre ses fiches, enregistre ses consultations et consulte les guides même sans aucune connexion internet.",
        stat: "Zéro Réseau Requis"
      },
      {
        icon: "🔄",
        titre: "Synchronisation Silencieuse",
        description: "Dès que l'agent se déplace au marché ou près d'une antenne, les données sont transmises automatiquement sans perte.",
        stat: "Auto-Sync"
      },
      {
        icon: "🇧🇯",
        titre: "Normalisation Bénin +229",
        description: "Tous les numéros sont reconnus sous le standard +229 01 XX XX XX XX avec boutons d'action WhatsApp et Appel.",
        stat: "+229 Universel"
      },
      {
        icon: "🔋",
        titre: "Interface Simplifiée Relais",
        description: "Grands boutons colorés pour les Relais, utilisable sur des smartphones d'entrée de gamme sans vider la batterie.",
        stat: "Accessible à Tous"
      }
    ],
    visuelType: "offline",
    scriptOrateur: "L'objection habituelle face au numérique est : 'Il n'y a pas de réseau au village'. Avec ASCQ Bénin, cet argument n'existe plus. L'application a été programmée comme une application web progressive (PWA). Tout est stocké dans la puce mémoire du téléphone. L'agent travaille en brousse en toute sérénité."
  },
  {
    id: 9,
    tag: "CONTRÔLE & GOUVERNANCE",
    titre: "Le Tableau de Bord des Élus : L'Espace Périmètre",
    sousTitre: "Une maîtrise complète de la performance sanitaire pour le Conseil Communal et le Secrétaire Exécutif.",
    pointsCles: [
      {
        icon: "📊",
        titre: "Suivi des Délais RMA (Rapports)",
        description: "Visualisation immédiate du statut de dépôt : vert si déposé avant le 5 du mois, rouge si en retard.",
        stat: "Délai au 5 du Mois"
      },
      {
        icon: "🧹",
        titre: "Nettoyage des Données Erronées",
        description: "Droit pour le représentant communal de purger les fiches de tests et doublons pour garantir la pureté des statistiques.",
        stat: "Base Fiabilisée"
      },
      {
        icon: "⚖️",
        titre: "Radiation & Rétablissement",
        description: "Pouvoir de révoquer l'accès des agents qui ne sont plus en fonction avec traçabilité du motif légal obligatoire.",
        stat: "Discipline & Ordre"
      },
      {
        icon: "🔒",
        titre: "Inscription Sécurisée des Cadres",
        description: "Obligation stricte de préciser la fonction exacte pour tout cadre communal, de zone ou départemental.",
        stat: "Zéro Compte Fictif"
      }
    ],
    visuelType: "perimetre",
    actionDemo: {
      label: "Accéder au Périmètre",
      lien: "/perimetre"
    },
    scriptOrateur: "Pour vous, membres du Conseil et Secrétaires Exécutifs de mairie, c'est l'assurance d'une gouvernance rigoureuse. Vous savez exactement qui travaille, dans quel arrondissement, quels sont les agents assidus et ceux qui sont en retard pour déposer leur rapport."
  },
  {
    id: 10,
    tag: "GESTION DES INTRANTS & ÉCONOMIES",
    titre: "Zéro Gaspillage : La Règle Logistique PEPS / FEFO",
    sousTitre: "Protéger les médicaments gratuits de l'État et éliminer les détournements ou péremptions.",
    pointsCles: [
      {
        icon: "📦",
        titre: "Règle d'Or FEFO / PEPS",
        description: "« Premier Expiré, Premier Sorti » : obligation de distribuer en priorité les lots de CTA et TDR les plus proches de péremption.",
        stat: "Zéro Péremption"
      },
      {
        icon: "🚫",
        titre: "Traçabilité & Gratuité Absolue",
        description: "Chaque dose de CTA, sachet de SRO ou test TDR délivré est associé nominativement à un enfant identifié avec son tuteur.",
        stat: "Fin du Coulage"
      },
      {
        icon: "💰",
        titre: "Économies Budgétaires Réelles",
        description: "Suppression des coûts récurrents d'impression et d'acheminement de milliers de cahiers et registres papier chaque année.",
        stat: "Économies Mairie"
      }
    ],
    visuelType: "fefo",
    scriptOrateur: "Chaque boîte de médicament qui périme ou qui est détournée est un préjudice direct pour les familles de notre commune. Avec la traçabilité numérique nominative, chaque comprimé donné par l'État est justifié. Nous protégeons les ressources publiques et renforçons la confiance des partenaires financiers."
  },
  {
    id: 11,
    tag: "PERSPECTIVES & ALLIANCE",
    titre: "Ce que le Conseil Communal Gagne Concrètement",
    sousTitre: "Un investissement d'avenir pour le rayonnement sanitaire et l'attractivité de la commune.",
    pointsCles: [
      {
        icon: "📉",
        titre: "Baisse de la Mortalité Maternelle & Infantile",
        description: "Détection précoce des grossesses à risque, 8 CPN respectées, et traitement précoce du paludisme et de la pneumonie.",
        stat: "-40% Mortalité"
      },
      {
        icon: "🏆",
        titre: "Leadership & Performance Communale",
        description: "Positionne notre commune parmi les plus transparentes et modernes du Bénin lors des revues sectorielles de la santé.",
        stat: "Commune Modèle"
      },
      {
        icon: "🤝",
        titre: "Attractivité auprès des Bailleurs",
        description: "Les partenaires (UNICEF, USAID, Banque Mondiale) privilégient les communes disposant de données sanitaires fiables et vérifiables.",
        stat: "Financements PTF"
      }
    ],
    visuelType: "stats",
    scriptOrateur: "Les bailleurs de fonds internationaux et les ministères ne financent plus les promesses sur papier. Ils financent les communes capables de produire des indicateurs réels, géolocalisés et incontestables. En adoptant ASCQ Bénin, notre commune prend une longueur d'avance décisive."
  },
  {
    id: 12,
    tag: "DÉCISION & ENGAGEMENT",
    titre: "Projet de Délibération Soumis au Conseil Communal",
    sousTitre: "Faire de notre commune le pionnier national de la santé communautaire numérique.",
    pointsCles: [
      {
        icon: "📜",
        titre: "Article 1er : Adoption Officielle",
        description: "Le Conseil adopte la plateforme ASCQ Bénin comme outil communal de référence pour la santé de proximité.",
        stat: "Adoption"
      },
      {
        icon: "👥",
        titre: "Article 2 : Mobilisation des Élus Locaux",
        description: "Les Chefs d'Arrondissement et élus de village sont mandatés pour accompagner le travail des ASCQ et Relais.",
        stat: "Arrondissements"
      },
      {
        icon: "☀️",
        titre: "Article 3 : Appui Logistique Communal",
        description: "Inscrire l'appui aux relais (kits de recharge solaire, facilitation) dans le Plan de Développement Communal (PDC).",
        stat: "PDC 2026-2030"
      }
    ],
    visuelType: "deliberation",
    scriptOrateur: "Mesdames et Messieurs les Conseillers, le train de la modernisation de notre système de santé avance à grande vitesse. Nos ASCQ et Relais font un travail héroïque sur le terrain. Donnons-leur les outils du 21e siècle. Je vous invite à adopter solennellement ce projet de délibération et à faire de notre commune un modèle pour toute la République du Bénin. Je vous remercie."
  }
];

export default function PresentationConseilsPage() {
  const router = useRouter();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentSlide = SLIDES_PRESENTATION[currentSlideIndex];
  const totalSlides = SLIDES_PRESENTATION.length;

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
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shrink-0 flex items-center justify-between gap-3 print:hidden">
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
            <span className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-200">
              Session Officielle Conseil
            </span>
          </div>
        </div>

        {/* Sélecteur de diapositives rapide */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-md hidden md:flex">
          {SLIDES_PRESENTATION.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                currentSlideIndex === idx
                  ? "bg-[#008751] text-white ring-2 ring-emerald-400"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
              title={`Diapositive ${s.id} : ${s.titre}`}
            >
              {s.id}
            </button>
          ))}
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

      {/* 3. Corps Central : La Diapositive Active (Canvas Haute Visibilité) */}
      <main className="flex-1 flex flex-col justify-center max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="space-y-6">
          
          {/* Tag & Numéro de Slide */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {currentSlide.tag}
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                République du Bénin • Ministère de la Santé
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono font-black text-xs text-slate-400">
              <span className="text-emerald-400 text-sm">{currentSlide.id}</span>
              <span>/</span>
              <span>{totalSlides}</span>
            </div>
          </div>

          {/* Titre & Sous-titre de la Diapositive */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              {currentSlide.titre}
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-4xl">
              {currentSlide.sousTitre}
            </p>
          </div>

          {/* Cartes de contenu (Grille Responsive) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {currentSlide.pointsCles.map((pt, pIdx) => (
              <div
                key={pIdx}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-3 group shadow-lg"
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
                  <h3 className="font-black text-base text-white group-hover:text-emerald-400 transition-colors">
                    {pt.titre}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {pt.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bouton de démonstration interactive en direct (si disponible) */}
          {currentSlide.actionDemo && (
            <div className="pt-2 flex items-center justify-end">
              <Link
                href={currentSlide.actionDemo.lien}
                target="_blank"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg active:scale-95 transition-all group"
              >
                <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                <span>{currentSlide.actionDemo.label}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}

          {/* 4. Notes de l'orateur (Script de parole mot à mot) */}
          {showNotes && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-4 sm:p-5 space-y-2 animate-in fade-in print:bg-slate-50 print:text-slate-800 print:border-slate-300">
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

      {/* 5. Barre de navigation inférieure (Flèches & Progression) */}
      <footer className="bg-slate-900/90 backdrop-blur-md border-t border-slate-800 px-4 py-3 shrink-0 flex items-center justify-between gap-3 print:hidden">
        <button
          onClick={prevSlide}
          disabled={currentSlideIndex === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-extrabold text-white transition-all active:scale-95 shadow-md"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Diapositive Précédente</span>
        </button>

        {/* Indicateur de pagination */}
        <div className="text-center">
          <span className="text-xs font-black text-slate-300 block">
            {currentSlide.titre}
          </span>
          <span className="text-[10px] text-slate-500">
            Utilisez les flèches du clavier [←] et [→] ou [Espace]
          </span>
        </div>

        <button
          onClick={nextSlide}
          disabled={currentSlideIndex === totalSlides - 1}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-[#008751] hover:bg-emerald-600 disabled:opacity-30 disabled:pointer-events-none text-xs font-extrabold text-white transition-all active:scale-95 shadow-md"
        >
          <span className="hidden sm:inline">Diapositive Suivante</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>

    </div>
  );
}
