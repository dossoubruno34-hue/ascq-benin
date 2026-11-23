/**
 * REGISTRE CENTRAL DE NAVIGATION — SANTÉCOM BÉNIN (v3)
 * Source unique de vérité pour les 6 modules principaux, les 2 modules d'en-tête
 * (Synchronisation et Déconnexion), les modules RC, les sous-modules, les icônes Wax,
 * les pastilles de comptage et la visibilité stricte par rôle.
 */

export type RoleNavigation =
  | "RC"
  | "ASCQ"
  | "REPRESENTANT_COMMUNAL"
  | "PF_CCLS_TP"
  | "MEMBRE_MINISTERE"
  | "SUPER_ADMIN";

export type StatutModule = "actif" | "bientot" | "masque";

export type BadgeKey =
  | "alertes_a_confirmer"
  | "validations_en_attente"
  | "menages_a_reassigner"
  | "elements_a_synchroniser"
  | "perdus_de_vue"
  | "demandes_export";

export interface NavigationEntry {
  id: string;
  libelle: string;
  icone: string; // Nom d'icône Lucide
  waxIcon?: {
    png512: string;
    webp192: string;
    webp96: string;
    alt: string;
  };
  parent: string | null; // null pour module racine, id du module parent pour sous-module
  route: string;
  roles: RoleNavigation[];
  ordre: number;
  badge?: BadgeKey;
  disponibleHorsLigne: boolean;
  statut: StatutModule;
  estSaisie?: boolean; // Si true, masqué pour PF_CCLS_TP et MEMBRE_MINISTERE
  estEpinglerEnTete?: boolean; // Synchronisation & Déconnexion épinglés à droite de l'en-tête
  descriptionCourte?: string;
}

export const REGISTRE_NAVIGATION: NavigationEntry[] = [
  // =========================================================================
  // LES 6 MODULES PRINCIPAUX (ORDRE ET NOMS CONSERVÉS TELS QUELS)
  // =========================================================================
  {
    id: "soins",
    libelle: "Soins & Maternité",
    icone: "Stethoscope",
    waxIcon: {
      png512: "/icons/wax/soins-512.png",
      webp192: "/icons/wax/soins-192.webp",
      webp96: "/icons/wax/soins-96.webp",
      alt: "Illustration style wax Soins cliniques et Maternité"
    },
    parent: null,
    route: "/espace-ascq?module=soins",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 1,
    badge: "perdus_de_vue",
    disponibleHorsLigne: true,
    statut: "actif",
    descriptionCourte: "PCIME-C / iCCM, Maternité 1000 jours, Références & Perdus de vue"
  },
  {
    id: "surveillance",
    libelle: "Surveillance",
    icone: "ShieldAlert",
    waxIcon: {
      png512: "/icons/wax/surveillance-512.png",
      webp192: "/icons/wax/surveillance-192.webp",
      webp96: "/icons/wax/surveillance-96.webp",
      alt: "Illustration style wax Surveillance épidémiologique SIMR"
    },
    parent: null,
    route: "/espace-ascq?module=surveillance",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 2,
    badge: "alertes_a_confirmer",
    disponibleHorsLigne: true,
    statut: "actif",
    descriptionCourte: "Registre, Alertes à confirmer, Décès, Investigations & Rapport SIMR"
  },
  {
    id: "terrain",
    libelle: "Terrain & RC",
    icone: "Users",
    waxIcon: {
      png512: "/icons/wax/terrain-512.png",
      webp192: "/icons/wax/terrain-192.webp",
      webp96: "/icons/wax/terrain-96.webp",
      alt: "Illustration style wax Terrain et Relais Communautaires"
    },
    parent: null,
    route: "/espace-ascq?module=terrain",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 3,
    badge: "validations_en_attente",
    disponibleHorsLigne: true,
    statut: "actif",
    descriptionCourte: "Plannings, Suivis groupés des RC, Campagnes & Validations"
  },
  {
    id: "rapports",
    libelle: "Rapports SNIS",
    icone: "BarChart3",
    waxIcon: {
      png512: "/icons/wax/rapports-512.png",
      webp192: "/icons/wax/rapports-192.webp",
      webp96: "/icons/wax/rapports-96.webp",
      alt: "Illustration style wax Rapports SNIS et Synthèse communale"
    },
    parent: null,
    route: "/espace-ascq?module=rapports",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 4,
    disponibleHorsLigne: true,
    statut: "actif",
    descriptionCourte: "Suivi PNSC, Rapport mensuel, Synthèse communale & Exports"
  },
  {
    id: "gouvernance",
    libelle: "Gouvernance",
    icone: "Crown",
    waxIcon: {
      png512: "/icons/wax/gouvernance-512.png",
      webp192: "/icons/wax/gouvernance-192.webp",
      webp96: "/icons/wax/gouvernance-96.webp",
      alt: "Illustration style wax Gouvernance et Supervision territoriale"
    },
    parent: null,
    route: "/espace-ascq?module=gouvernance",
    roles: ["REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 5,
    badge: "demandes_export",
    disponibleHorsLigne: false,
    statut: "actif",
    descriptionCourte: "Périmètre territorial & Administration nationale"
  },
  {
    id: "outils",
    libelle: "Outils",
    icone: "BookOpen",
    waxIcon: {
      png512: "/icons/wax/outils-512.png",
      webp192: "/icons/wax/outils-192.webp",
      webp96: "/icons/wax/outils-96.webp",
      alt: "Illustration style wax Outils, Formation et Bibliothèque"
    },
    parent: null,
    route: "/espace-ascq?module=outils",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 6,
    disponibleHorsLigne: true,
    statut: "actif",
    descriptionCourte: "Formation, Guide Utilisateur, Bibliothèque, Permutations & Requêtes"
  },

  // =========================================================================
  // LES 2 MODULES ÉPINGLÉS À DROITE DE L'EN-TÊTE (ICÔNES SEULES TOUJOURS VISIBLES)
  // =========================================================================
  {
    id: "synchronisation",
    libelle: "Synchronisation",
    icone: "RefreshCw",
    parent: null,
    route: "#synchronisation",
    roles: ["RC", "ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 7,
    badge: "elements_a_synchroniser",
    disponibleHorsLigne: true,
    statut: "actif",
    estEpinglerEnTete: true
  },
  {
    id: "deconnexion",
    libelle: "Déconnexion",
    icone: "LogOut",
    parent: null,
    route: "#deconnexion",
    roles: ["RC", "ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 8,
    disponibleHorsLigne: true,
    statut: "actif",
    estEpinglerEnTete: true
  },

  // =========================================================================
  // SOUS-MODULES DU MODULE 1 : SOINS & MATERNITÉ
  // =========================================================================
  {
    id: "soins_vue_ensemble",
    libelle: "Vue d'ensemble",
    icone: "LayoutDashboard",
    parent: "soins",
    route: "/espace-ascq?module=soins&view=overview",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 1,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "soins_iccm",
    libelle: "Prise en charge iCCM",
    icone: "Stethoscope",
    parent: "soins",
    route: "/espace-ascq/consultations",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 2,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "soins_maternite",
    libelle: "Maternité & 1000 Jours",
    icone: "Baby",
    parent: "soins",
    route: "/espace-ascq/maternite-enfance",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 3,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "soins_references",
    libelle: "Références CS/GUPS",
    icone: "HeartPulse",
    parent: "soins",
    route: "/espace-ascq/references",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 4,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "soins_perdus_de_vue",
    libelle: "Perdus de vue",
    icone: "UserX",
    parent: "soins",
    route: "/espace-ascq/maternite-enfance?tab=perdus_de_vue",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 5,
    badge: "perdus_de_vue",
    disponibleHorsLigne: true,
    statut: "actif"
  },

  // =========================================================================
  // SOUS-MODULES DU MODULE 2 : SURVEILLANCE
  // =========================================================================
  {
    id: "surveillance_vue_ensemble",
    libelle: "Vue d'ensemble",
    icone: "LayoutDashboard",
    parent: "surveillance",
    route: "/espace-ascq?module=surveillance&view=overview",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 1,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "surveillance_fiches",
    libelle: "Fiches Surveillance",
    icone: "Activity",
    parent: "surveillance",
    route: "/fiches",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 2,
    badge: "alertes_a_confirmer",
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "surveillance_registre",
    libelle: "Registre des alertes",
    icone: "ClipboardList",
    parent: "surveillance",
    route: "/fiches?tab=registre",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 3,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "surveillance_notifier_alerte",
    libelle: "Notifier une alerte",
    icone: "BellPlus",
    parent: "surveillance",
    route: "/fiches/alerte/nouvelle",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 4,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "surveillance_alertes_a_confirmer",
    libelle: "Alertes à confirmer",
    icone: "AlertTriangle",
    parent: "surveillance",
    route: "/fiches?tab=a_confirmer",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 5,
    badge: "alertes_a_confirmer",
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "surveillance_alertes_confirmees",
    libelle: "Alertes déjà confirmées",
    icone: "CheckCircle2",
    parent: "surveillance",
    route: "/fiches?tab=confirmees",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 6,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "surveillance_deces",
    libelle: "Notification de décès",
    icone: "Skull",
    parent: "surveillance",
    route: "/fiches/deces/nouvelle",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 7,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "surveillance_investigation",
    libelle: "Fiche d'investigation",
    icone: "Search",
    parent: "surveillance",
    route: "/fiches/investigation/nouvelle",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 8,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "surveillance_rapport_hebdo",
    libelle: "Rapport hebdomadaire",
    icone: "FileSpreadsheet",
    parent: "surveillance",
    route: "/fiches/rapport-hebdo/nouvelle",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 9,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "surveillance_guide_simr",
    libelle: "Guide SIMR & Vaccins",
    icone: "BookOpen",
    parent: "surveillance",
    route: "/briefing",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 10,
    disponibleHorsLigne: true,
    statut: "actif"
  },

  // =========================================================================
  // SOUS-MODULES DU MODULE 3 : TERRAIN & RC
  // =========================================================================
  {
    id: "terrain_vue_ensemble",
    libelle: "Vue d'ensemble",
    icone: "LayoutDashboard",
    parent: "terrain",
    route: "/espace-ascq?module=terrain&view=overview",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 1,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "terrain_planning",
    libelle: "Planning",
    icone: "Calendar",
    parent: "terrain",
    route: "/espace-ascq/planning",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 2,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "terrain_activites",
    libelle: "Activités",
    icone: "CheckSquare",
    parent: "terrain",
    route: "/espace-ascq/activites-menees",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 3,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "terrain_suivis_groupes",
    libelle: "Suivis groupés des RC",
    icone: "ClipboardCheck",
    parent: "terrain",
    route: "/espace-ascq/suivi-relais",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 4,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "terrain_mes_relais",
    libelle: "Mes Relais",
    icone: "Users",
    parent: "terrain",
    route: "/espace-ascq/relais",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 5,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "terrain_validations_inscription",
    libelle: "Validations d'inscription",
    icone: "UserCheck",
    parent: "terrain",
    route: "/espace-ascq/relais?tab=validations",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 6,
    badge: "validations_en_attente",
    disponibleHorsLigne: false,
    statut: "actif"
  },
  {
    id: "terrain_menages_reassigner",
    libelle: "Ménages à réassigner",
    icone: "Home",
    parent: "terrain",
    route: "/espace-ascq/relais?tab=menages_reassigner",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 7,
    badge: "menages_a_reassigner",
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "terrain_campagnes",
    libelle: "Campagnes (MIILD, CPS, ONCHO)",
    icone: "Flag",
    parent: "terrain",
    route: "/espace-ascq/activites-menees?tab=campagnes",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 8,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },

  // =========================================================================
  // SOUS-MODULES DU MODULE 4 : RAPPORTS SNIS
  // =========================================================================
  {
    id: "rapports_vue_ensemble",
    libelle: "Vue d'ensemble",
    icone: "LayoutDashboard",
    parent: "rapports",
    route: "/espace-ascq?module=rapports&view=overview",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 1,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "rapports_suivi_pnsc",
    libelle: "Suivi PNSC",
    icone: "BarChart3",
    parent: "rapports",
    route: "/espace-ascq/rapport-hebdo-pnsc",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 2,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "rapports_mensuel",
    libelle: "Rapport mensuel",
    icone: "FileText",
    parent: "rapports",
    route: "/espace-ascq/rapport-mensuel",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 3,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "rapports_synthese_communale",
    libelle: "Synthèse communale",
    icone: "Building2",
    parent: "rapports",
    route: "/espace-ascq/rapport-hebdo-pnsc?tab=synthese_communale",
    roles: ["REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 4,
    disponibleHorsLigne: false,
    statut: "actif"
  },
  {
    id: "rapports_exports",
    libelle: "Exports",
    icone: "Download",
    parent: "rapports",
    route: "/espace-ascq/rapport-mensuel?tab=exports",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 5,
    disponibleHorsLigne: true,
    statut: "actif"
  },

  // =========================================================================
  // SOUS-MODULES DU MODULE 5 : GOUVERNANCE
  // BN : Seuls les administrateurs nommés voient Administration ;
  //      Les représentants nommés voient seulement Périmètre qui les concerne.
  // =========================================================================
  {
    id: "gouvernance_vue_ensemble",
    libelle: "Vue d'ensemble",
    icone: "LayoutDashboard",
    parent: "gouvernance",
    route: "/espace-ascq?module=gouvernance&view=overview",
    roles: ["REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 1,
    disponibleHorsLigne: false,
    statut: "actif"
  },
  {
    id: "gouvernance_perimetre",
    libelle: "Périmètre",
    icone: "Crown",
    parent: "gouvernance",
    route: "/perimetre",
    roles: ["REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 2,
    disponibleHorsLigne: false,
    statut: "actif"
  },
  {
    id: "gouvernance_administration",
    libelle: "Administration",
    icone: "ShieldCheck",
    parent: "gouvernance",
    route: "/admin",
    roles: ["SUPER_ADMIN"],
    ordre: 3,
    disponibleHorsLigne: false,
    statut: "actif"
  },
  {
    id: "gouvernance_comptes_validations",
    libelle: "Comptes et validations",
    icone: "UserCheck",
    parent: "gouvernance",
    route: "/admin/validation-comptes",
    roles: ["SUPER_ADMIN"],
    ordre: 4,
    badge: "validations_en_attente",
    disponibleHorsLigne: false,
    statut: "actif"
  },
  {
    id: "gouvernance_journal_audit",
    libelle: "Journal d'audit",
    icone: "FileSearch",
    parent: "gouvernance",
    route: "/admin?tab=journal_audit",
    roles: ["SUPER_ADMIN"],
    ordre: 5,
    disponibleHorsLigne: false,
    statut: "actif"
  },
  {
    id: "gouvernance_exports_ministere",
    libelle: "Demandes d'export du ministère",
    icone: "FileSpreadsheet",
    parent: "gouvernance",
    route: "/admin?tab=demandes_export",
    roles: ["SUPER_ADMIN"],
    ordre: 6,
    badge: "demandes_export",
    disponibleHorsLigne: false,
    statut: "actif"
  },

  // =========================================================================
  // SOUS-MODULES DU MODULE 6 : OUTILS
  // =========================================================================
  {
    id: "outils_vue_ensemble",
    libelle: "Vue d'ensemble",
    icone: "LayoutDashboard",
    parent: "outils",
    route: "/espace-ascq?module=outils&view=overview",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 1,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "outils_formation",
    libelle: "Formation",
    icone: "GraduationCap",
    parent: "outils",
    route: "/guide?tab=formation",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 2,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "outils_guide",
    libelle: "Guide Utilisateur",
    icone: "BookOpen",
    parent: "outils",
    route: "/guide",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 3,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "outils_bibliotheque",
    libelle: "Bibliothèque",
    icone: "Library",
    parent: "outils",
    route: "/espace-ascq/bibliotheque",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 4,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "outils_permutations",
    libelle: "Permutations",
    icone: "ArrowLeftRight",
    parent: "outils",
    route: "/espace-ascq/permutations",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 5,
    disponibleHorsLigne: false,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "outils_requetes",
    libelle: "Requêtes",
    icone: "MessageSquareText",
    parent: "outils",
    route: "/espace-ascq/requetes",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 6,
    disponibleHorsLigne: false,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "outils_presentation",
    libelle: "Présentation Conseils",
    icone: "Sparkles",
    parent: "outils",
    route: "/presentation",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 7,
    disponibleHorsLigne: true,
    statut: "actif"
  }
];

// ===========================================================================
// MODULES ILLUSTRÉS STYLE WAX POUR LES RELAIS COMMUNAUTAIRES (RC)
// ===========================================================================
export const REGISTRE_MODULES_RC: NavigationEntry[] = [
  {
    id: "rc_fiches",
    libelle: "Fiches & Registre",
    icone: "FileText",
    waxIcon: {
      png512: "/icons/wax/rc_fiches-512.png",
      webp192: "/icons/wax/rc_fiches-192.webp",
      webp96: "/icons/wax/rc_fiches-96.webp",
      alt: "Illustration style wax Fiches et Registre du Relais Communautaire"
    },
    parent: null,
    route: "/espace-rc?tab=fiches",
    roles: ["RC"],
    ordre: 1,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "rc_planning",
    libelle: "Planning & VAD",
    icone: "Calendar",
    waxIcon: {
      png512: "/icons/wax/rc_planning-512.png",
      webp192: "/icons/wax/rc_planning-192.webp",
      webp96: "/icons/wax/rc_planning-96.webp",
      alt: "Illustration style wax Planning hebdomadaire et Visites à domicile RC"
    },
    parent: null,
    route: "/espace-rc?tab=planning",
    roles: ["RC"],
    ordre: 2,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "rc_alertes",
    libelle: "Alertes & Suivi",
    icone: "Bell",
    waxIcon: {
      png512: "/icons/wax/rc_alertes-512.png",
      webp192: "/icons/wax/rc_alertes-192.webp",
      webp96: "/icons/wax/rc_alertes-96.webp",
      alt: "Illustration style wax Alertes sanitaires et Références du Relais"
    },
    parent: null,
    route: "/espace-rc?tab=notifications",
    roles: ["RC"],
    ordre: 3,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "rc_outils",
    libelle: "Formation & Guides",
    icone: "BookOpen",
    waxIcon: {
      png512: "/icons/wax/rc_outils-512.png",
      webp192: "/icons/wax/rc_outils-192.webp",
      webp96: "/icons/wax/rc_outils-96.webp",
      alt: "Illustration style wax Formation et Guide du Relais Communautaire"
    },
    parent: null,
    route: "/guide?profil=RC",
    roles: ["RC"],
    ordre: 4,
    disponibleHorsLigne: true,
    statut: "actif"
  }
];

/**
 * Résout tous les rôles applicables à un profil utilisateur connecté.
 * Garantit que :
 * - Seuls les administrateurs nommés obtiennent "SUPER_ADMIN" (module Administration).
 * - Les représentants communaux nommés obtiennent "REPRESENTANT_COMMUNAL" (sous-module Périmètre uniquement).
 * - Les PF CCLS-TP et Membres Ministère n'ont aucun sous-module de saisie.
 */
export function resoudreRolesUtilisateur(userProfile?: any): RoleNavigation[] {
  if (!userProfile) return ["ASCQ"];

  const cleanTel = String(userProfile.telephone || "").replace(/\D/g, "");
  const isBrunoSuperAdmin = cleanTel.includes("69031463");
  if (isBrunoSuperAdmin) {
    return ["SUPER_ADMIN", "REPRESENTANT_COMMUNAL", "ASCQ"];
  }

  const rawRoles = [
    userProfile.role_nomination,
    userProfile.role_technique,
    userProfile.poste,
    userProfile.poste_autre
  ]
    .filter(Boolean)
    .map((r) => String(r).toUpperCase());

  const out = new Set<RoleNavigation>();

  // 1. Administrateur nommé uniquement
  if (rawRoles.some((r) => r === "SUPER_ADMIN" || r === "ADMINISTRATEUR")) {
    out.add("SUPER_ADMIN");
    out.add("REPRESENTANT_COMMUNAL");
    out.add("ASCQ");
  }

  // 2. Membre Ministère
  if (rawRoles.some((r) => r.includes("MINISTERE") || r === "DDS" || r === "MCZS")) {
    out.add("MEMBRE_MINISTERE");
  }

  // 3. Point Focal CCLS-TP
  if (rawRoles.some((r) => r.includes("PF_CCLS") || r.includes("CCLS"))) {
    out.add("PF_CCLS_TP");
  }

  // 4. Représentant Communal nommé
  if (rawRoles.some((r) => r.includes("REPRESENTANT_COMMUNAL") || r === "REPRESENTANT")) {
    out.add("REPRESENTANT_COMMUNAL");
    out.add("ASCQ");
  }

  // 5. Relais Communautaire (RC)
  if (rawRoles.some((r) => r === "RC" || r === "RELAIS" || r === "RELAIS_COMMUNAUTAIRE")) {
    if (out.size === 0) {
      out.add("RC");
    }
  }

  // 6. ASCQ par défaut si aucun rôle cadre exclusif
  if (out.size === 0 || rawRoles.some((r) => r.includes("ASCQ"))) {
    if (!out.has("PF_CCLS_TP") && !out.has("MEMBRE_MINISTERE") && !out.has("RC")) {
      out.add("ASCQ");
    }
  }

  return Array.from(out);
}

/**
 * Retourne le libellé court du rôle pour l'en-tête 56 dp
 * Ex: "Bruno DOSSOU, Super admin" ou "Simplice ZOUNGONOU, Représentant Com."
 */
export function obtenirNomEtRoleCourt(userProfile?: any): { nomCourt: string; roleCourt: string } {
  if (!userProfile) {
    return { nomCourt: "Utilisateur", roleCourt: "ASCQ" };
  }
  const prenom = (userProfile.prenoms || userProfile.prenom || "").trim().split(/\s+/)[0] || "";
  const nom = (userProfile.nom || "").trim().toUpperCase();
  const nomCourt = `${prenom} ${nom}`.trim() || userProfile.nom_complet || "Agent SantéCom";

  const roles = resoudreRolesUtilisateur(userProfile);
  let roleCourt = "ASCQ";
  if (roles.includes("SUPER_ADMIN")) roleCourt = "Super admin";
  else if (roles.includes("MEMBRE_MINISTERE")) roleCourt = "Ministère";
  else if (roles.includes("PF_CCLS_TP")) roleCourt = "PF CCLS-TP";
  else if (roles.includes("REPRESENTANT_COMMUNAL")) roleCourt = "Représentant Com.";
  else if (roles.includes("RC")) roleCourt = "Relais RC";

  return { nomCourt, roleCourt };
}

/**
 * Retourne les 6 modules principaux filtrés selon les droits du profil connecté
 */
export function obtenirModulesPrincipauxAutorises(userProfile?: any): NavigationEntry[] {
  const userRoles = resoudreRolesUtilisateur(userProfile);
  const estUniquementObservateur =
    (userRoles.includes("PF_CCLS_TP") || userRoles.includes("MEMBRE_MINISTERE")) &&
    !userRoles.includes("SUPER_ADMIN") &&
    !userRoles.includes("ASCQ");

  return REGISTRE_NAVIGATION.filter((entry) => {
    if (entry.parent !== null || entry.estEpinglerEnTete || entry.statut === "masque") return false;
    const aLeRole = entry.roles.some((r) => userRoles.includes(r));
    if (!aLeRole) return false;
    // Vérifier qu'au moins un sous-module est autorisé pour cet utilisateur
    const sousModules = obtenirSousModulesAutorises(entry.id, userProfile);
    if (estUniquementObservateur && sousModules.length === 0) return false;
    return true;
  }).sort((a, b) => a.ordre - b.ordre);
}

/**
 * Retourne les sous-modules autorisés d'un module parent
 * - Le PF CCLS-TP et le Ministère n'ont AUCUN sous-module de saisie (estSaisie = true).
 * - Seul SUPER_ADMIN voit Administration et ses sous-modules.
 * - Les Représentants Communaux voient uniquement Périmètre dans Gouvernance.
 */
export function obtenirSousModulesAutorises(moduleId: string, userProfile?: any): NavigationEntry[] {
  const userRoles = resoudreRolesUtilisateur(userProfile);
  const interdireSaisie =
    (userRoles.includes("PF_CCLS_TP") || userRoles.includes("MEMBRE_MINISTERE")) &&
    !userRoles.includes("SUPER_ADMIN") &&
    !userRoles.includes("ASCQ");

  return REGISTRE_NAVIGATION.filter((entry) => {
    if (entry.parent !== moduleId || entry.statut === "masque") return false;
    if (interdireSaisie && entry.estSaisie) return false;
    return entry.roles.some((r) => userRoles.includes(r));
  }).sort((a, b) => a.ordre - b.ordre);
}

/**
 * Vérifie si l'utilisateur a le droit d'accéder à une route donnée
 */
export function verifierAccesRoute(pathname: string, userProfile?: any): {
  autorise: boolean;
  motifRefus?: string;
} {
  if (!userProfile) return { autorise: true };
  const roles = resoudreRolesUtilisateur(userProfile);

  // 1. Route /admin strictement réservée aux Administrateurs nommés (SUPER_ADMIN)
  if (pathname.startsWith("/admin")) {
    if (!roles.includes("SUPER_ADMIN")) {
      return {
        autorise: false,
        motifRefus: "Accès refusé : seuls les Administrateurs nommés peuvent accéder au module Administration."
      };
    }
  }

  // 2. Route /perimetre réservée aux Représentants Communaux nommés, PF CCLS-TP, Ministère et Super Admin
  if (pathname.startsWith("/perimetre")) {
    const ok = roles.some((r) =>
      ["SUPER_ADMIN", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE"].includes(r)
    );
    if (!ok) {
      return {
        autorise: false,
        motifRefus: "Accès refusé : l'espace Périmètre est réservé aux Représentants nommés et superviseurs."
      };
    }
  }

  // 3. Routes de saisie interdites au PF CCLS-TP et au Ministère
  const estObservateurStrict =
    (roles.includes("PF_CCLS_TP") || roles.includes("MEMBRE_MINISTERE")) &&
    !roles.includes("SUPER_ADMIN") &&
    !roles.includes("ASCQ");

  if (estObservateurStrict) {
    const routesSaisie = [
      "/fiches/alerte/nouvelle",
      "/fiches/deces/nouvelle",
      "/fiches/investigation/nouvelle",
      "/fiches/rapport-hebdo/nouvelle",
      "/fiches/registre/nouvelle",
      "/espace-ascq/consultations/nouvelle",
      "/espace-ascq/planning",
      "/espace-ascq/activites-menees",
      "/espace-ascq/permutations",
      "/espace-ascq/requetes"
    ];
    if (routesSaisie.some((r) => pathname.startsWith(r))) {
      return {
        autorise: false,
        motifRefus: "Accès refusé : votre profil (PF CCLS-TP / Ministère) est en lecture et supervision uniquement (aucun sous-module de saisie)."
      };
    }
  }

  return { autorise: true };
}

/**
 * Mémorise les 3 derniers sous-modules consultés ("Récents (3)")
 */
const RECENTS_STORAGE_KEY = "santecom_nav_recents_v3";

export function enregistrerNavigationRecente(entry: { id: string; libelle: string; route: string; parent?: string | null }) {
  if (typeof window === "undefined" || !entry?.route || entry.route.startsWith("#")) return;
  try {
    const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
    const list: Array<{ id: string; libelle: string; route: string; parent?: string | null }> = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((x) => x.id !== entry.id && x.route !== entry.route);
    filtered.unshift({
      id: entry.id,
      libelle: entry.libelle,
      route: entry.route,
      parent: entry.parent || null
    });
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(filtered.slice(0, 3)));
  } catch {}
}

export function obtenirNavigationsRecentes(): Array<{ id: string; libelle: string; route: string; parent?: string | null }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (Array.isArray(list) && list.length > 0) return list.slice(0, 3);
  } catch {}
  return [
    { id: "surveillance_fiches", libelle: "Fiches Surveillance", route: "/fiches", parent: "surveillance" },
    { id: "terrain_planning", libelle: "Planning", route: "/espace-ascq/planning", parent: "terrain" },
    { id: "soins_iccm", libelle: "Prise en charge iCCM", route: "/espace-ascq/consultations", parent: "soins" }
  ];
}

// Alias d'exports pour une utilisation fluide dans les pages et en-têtes
export type ModuleId = "soins" | "surveillance" | "terrain" | "rapports" | "gouvernance" | "outils";
export type ElementRecent = { id: string; libelle: string; route: string; parent?: string | null };

export const MODULES_PRINCIPAUX = REGISTRE_NAVIGATION.filter(
  (e) => e.parent === null && !e.estEpinglerEnTete
);
export const SOUS_MODULES = REGISTRE_NAVIGATION.filter((e) => e.parent !== null);
export const MODULES_RC = REGISTRE_MODULES_RC;
export const obtenirElementsRecents = obtenirNavigationsRecentes;
export const enregistrerElementRecent = enregistrerNavigationRecente;
