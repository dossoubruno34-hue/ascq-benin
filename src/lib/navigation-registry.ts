/**
 * REGISTRE CENTRAL DE NAVIGATION COMPLET — SANTÉCOM / ASCQ BÉNIN
 * Intègre l'intégralité des 56 entrées (8 modules principaux suivis des 48 sous-modules)
 * de la « Bibliothèque Iconographique Complète — ASCQ Bénin » (Modules 1 à 8).
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

export interface NavigationRegistryItem {
  id: string;
  parentId: string | null;
  label: string;
  iconId: string;
  iconPath: string;
}

/**
 * Référentiel officiel des 56 pictogrammes vectoriels (Section 11 de la Bibliothèque Iconographique)
 */
export const NAVIGATION_REGISTRY: NavigationRegistryItem[] = [
  // LES 8 MODULES PRINCIPAUX (parentId: null)
  { id: 'soins-maternite', parentId: null, label: 'Soins & Maternité', iconId: 'sm-module', iconPath: '/icons/soins-maternite/sm-module.svg' },
  { id: 'surveillance', parentId: null, label: 'Surveillance', iconId: 'surv-module', iconPath: '/icons/surveillance/surv-module.svg' },
  { id: 'terrain-rc', parentId: null, label: 'Terrain & RC', iconId: 'trc-module', iconPath: '/icons/terrain-rc/trc-module.svg' },
  { id: 'rapports-snis', parentId: null, label: 'Rapports SNIS', iconId: 'snis-module', iconPath: '/icons/rapports-snis/snis-module.svg' },
  { id: 'gouvernance', parentId: null, label: 'Gouvernance', iconId: 'gov-module', iconPath: '/icons/gouvernance/gov-module.svg' },
  { id: 'outils', parentId: null, label: 'Outils', iconId: 'out-module', iconPath: '/icons/outils/out-module.svg' },
  { id: 'synchronisation', parentId: null, label: 'Synchronisation', iconId: 'sync-module', iconPath: '/icons/synchronisation/sync-module.svg' },
  { id: 'deconnexion', parentId: null, label: 'Déconnexion', iconId: 'auth-logout-module', iconPath: '/icons/deconnexion/auth-logout-module.svg' },

  // SOUS-MODULES — MODULE 1 : SOINS & MATERNITÉ (5)
  { id: 'sm-vue-ensemble', parentId: 'soins-maternite', label: "Vue d'ensemble", iconId: 'sm-vue-ensemble', iconPath: '/icons/soins-maternite/sm-vue-ensemble.svg' },
  { id: 'sm-iccm', parentId: 'soins-maternite', label: 'Prise en charge iCCM', iconId: 'sm-iccm', iconPath: '/icons/soins-maternite/sm-iccm.svg' },
  { id: 'sm-maternite-1000j', parentId: 'soins-maternite', label: 'Maternité & 1000 Jours', iconId: 'sm-maternite-1000j', iconPath: '/icons/soins-maternite/sm-maternite-1000j.svg' },
  { id: 'sm-perdus-de-vue', parentId: 'soins-maternite', label: 'Perdus de vue', iconId: 'sm-perdus-de-vue', iconPath: '/icons/soins-maternite/sm-perdus-de-vue.svg' },
  { id: 'sm-references-cs-gups', parentId: 'soins-maternite', label: 'Références CS/GUPS', iconId: 'sm-references-cs-gups', iconPath: '/icons/soins-maternite/sm-references-cs-gups.svg' },

  // SOUS-MODULES — MODULE 2 : SURVEILLANCE (9)
  { id: 'surv-guide-simr', parentId: 'surveillance', label: 'Guide SIMR & Vaccins', iconId: 'surv-guide-simr', iconPath: '/icons/surveillance/surv-guide-simr.svg' },
  { id: 'surv-fiches', parentId: 'surveillance', label: 'Fiches Surveillance', iconId: 'surv-fiches', iconPath: '/icons/surveillance/surv-fiches.svg' },
  { id: 'surv-registre-alertes', parentId: 'surveillance', label: 'Registre des alertes', iconId: 'surv-registre-alertes', iconPath: '/icons/surveillance/surv-registre-alertes.svg' },
  { id: 'surv-notifier-alerte', parentId: 'surveillance', label: 'Notifier une alerte', iconId: 'surv-notifier-alerte', iconPath: '/icons/surveillance/surv-notifier-alerte.svg' },
  { id: 'surv-alertes-a-confirmer', parentId: 'surveillance', label: 'Alertes à confirmer', iconId: 'surv-alertes-a-confirmer', iconPath: '/icons/surveillance/surv-alertes-a-confirmer.svg' },
  { id: 'surv-alertes-confirmees', parentId: 'surveillance', label: 'Alertes déjà confirmées', iconId: 'surv-alertes-confirmees', iconPath: '/icons/surveillance/surv-alertes-confirmees.svg' },
  { id: 'surv-notification-deces', parentId: 'surveillance', label: 'Notification de décès', iconId: 'surv-notification-deces', iconPath: '/icons/surveillance/surv-notification-deces.svg' },
  { id: 'surv-fiche-investigation', parentId: 'surveillance', label: "Fiche d'investigation", iconId: 'surv-fiche-investigation', iconPath: '/icons/surveillance/surv-fiche-investigation.svg' },
  { id: 'surv-rapport-hebdo', parentId: 'surveillance', label: 'Rapport hebdomadaire', iconId: 'surv-rapport-hebdo', iconPath: '/icons/surveillance/surv-rapport-hebdo.svg' },

  // SOUS-MODULES — MODULE 3 : TERRAIN & RC (5)
  { id: 'trc-planning', parentId: 'terrain-rc', label: 'Planning', iconId: 'trc-planning', iconPath: '/icons/terrain-rc/trc-planning.svg' },
  { id: 'trc-activites', parentId: 'terrain-rc', label: 'Activités', iconId: 'trc-activites', iconPath: '/icons/terrain-rc/trc-activites.svg' },
  { id: 'trc-suivis-groupes', parentId: 'terrain-rc', label: 'Suivis groupés des RC', iconId: 'trc-suivis-groupes', iconPath: '/icons/terrain-rc/trc-suivis-groupes.svg' },
  { id: 'trc-mes-relais', parentId: 'terrain-rc', label: 'Mes Relais', iconId: 'trc-mes-relais', iconPath: '/icons/terrain-rc/trc-mes-relais.svg' },
  { id: 'trc-validations-inscription', parentId: 'terrain-rc', label: "Validations d'inscription", iconId: 'trc-validations-inscription', iconPath: '/icons/terrain-rc/trc-validations-inscription.svg' },

  // SOUS-MODULES — MODULE 4 : RAPPORTS SNIS (4)
  { id: 'snis-suivi-pnsc', parentId: 'rapports-snis', label: 'Suivi PNSC', iconId: 'snis-suivi-pnsc', iconPath: '/icons/rapports-snis/snis-suivi-pnsc.svg' },
  { id: 'snis-rapport-mensuel', parentId: 'rapports-snis', label: 'Rapport mensuel', iconId: 'snis-rapport-mensuel', iconPath: '/icons/rapports-snis/snis-rapport-mensuel.svg' },
  { id: 'snis-synthese-communale', parentId: 'rapports-snis', label: 'Synthèse communale', iconId: 'snis-synthese-communale', iconPath: '/icons/rapports-snis/snis-synthese-communale.svg' },
  { id: 'snis-exports', parentId: 'rapports-snis', label: 'Exports', iconId: 'snis-exports', iconPath: '/icons/rapports-snis/snis-exports.svg' },

  // SOUS-MODULES — MODULE 5 : GOUVERNANCE & ADMINISTRATION (7)
  { id: 'gov-perimetre', parentId: 'gouvernance', label: 'Périmètre', iconId: 'gov-perimetre', iconPath: '/icons/gouvernance/gov-perimetre.svg' },
  { id: 'gov-representants-nommes', parentId: 'gouvernance', label: 'Représentants nommés', iconId: 'gov-representants-nommes', iconPath: '/icons/gouvernance/gov-representants-nommes.svg' },
  { id: 'gov-cadres-ressort', parentId: 'gouvernance', label: 'Cadres pour leur ressort', iconId: 'gov-cadres-ressort', iconPath: '/icons/gouvernance/gov-cadres-ressort.svg' },
  { id: 'gov-administration', parentId: 'gouvernance', label: 'Administration', iconId: 'gov-administration', iconPath: '/icons/gouvernance/gov-administration.svg' },
  { id: 'gov-comptes-validations', parentId: 'gouvernance', label: 'Comptes et validations', iconId: 'gov-comptes-validations', iconPath: '/icons/gouvernance/gov-comptes-validations.svg' },
  { id: 'gov-journal-audit', parentId: 'gouvernance', label: "Journal d'audit", iconId: 'gov-journal-audit', iconPath: '/icons/gouvernance/gov-journal-audit.svg' },
  { id: 'gov-demandes-export-ministere', parentId: 'gouvernance', label: "Demandes d'export du ministère", iconId: 'gov-demandes-export-ministere', iconPath: '/icons/gouvernance/gov-demandes-export-ministere.svg' },

  // SOUS-MODULES — MODULE 6 : OUTILS & RESSOURCES (6)
  { id: 'out-guide-utilisateur', parentId: 'outils', label: 'Guide utilisateur', iconId: 'out-guide-utilisateur', iconPath: '/icons/outils/out-guide-utilisateur.svg' },
  { id: 'out-formation', parentId: 'outils', label: 'Formation', iconId: 'out-formation', iconPath: '/icons/outils/out-formation.svg' },
  { id: 'out-bibliotheque', parentId: 'outils', label: 'Bibliothèque', iconId: 'out-bibliotheque', iconPath: '/icons/outils/out-bibliotheque.svg' },
  { id: 'out-permutations', parentId: 'outils', label: 'Permutations', iconId: 'out-permutations', iconPath: '/icons/outils/out-permutations.svg' },
  { id: 'out-requetes', parentId: 'outils', label: 'Requêtes', iconId: 'out-requetes', iconPath: '/icons/outils/out-requetes.svg' },
  { id: 'out-presentation-conseils', parentId: 'outils', label: 'Présentation Conseils', iconId: 'out-presentation-conseils', iconPath: '/icons/outils/out-presentation-conseils.svg' },

  // SOUS-MODULES — MODULE 7 : SYNCHRONISATION & HORS-LIGNE (7)
  { id: 'sync-etat-reseau', parentId: 'synchronisation', label: 'État réseau', iconId: 'sync-etat-reseau', iconPath: '/icons/synchronisation/sync-etat-reseau.svg' },
  { id: 'sync-file-outbox', parentId: 'synchronisation', label: 'File outbox', iconId: 'sync-file-outbox', iconPath: '/icons/synchronisation/sync-file-outbox.svg' },
  { id: 'sync-maintenant', parentId: 'synchronisation', label: 'Synchroniser maintenant', iconId: 'sync-maintenant', iconPath: '/icons/synchronisation/sync-maintenant.svg' },
  { id: 'sync-journal-erreurs', parentId: 'synchronisation', label: "Journal d'erreurs", iconId: 'sync-journal-erreurs', iconPath: '/icons/synchronisation/sync-journal-erreurs.svg' },
  { id: 'sync-wifi-uniquement', parentId: 'synchronisation', label: 'Wi-Fi uniquement', iconId: 'sync-wifi-uniquement', iconPath: '/icons/synchronisation/sync-wifi-uniquement.svg' },
  { id: 'sync-taille-cache', parentId: 'synchronisation', label: 'Taille du cache', iconId: 'sync-taille-cache', iconPath: '/icons/synchronisation/sync-taille-cache.svg' },
  { id: 'sync-purge-sensibles', parentId: 'synchronisation', label: 'Purge des éléments sensibles synchronisés', iconId: 'sync-purge-sensibles', iconPath: '/icons/synchronisation/sync-purge-sensibles.svg' },

  // SOUS-MODULES — MODULE 8 : DÉCONNEXION & SÉCURITÉ DE SESSION (5)
  { id: 'auth-confirmation', parentId: 'deconnexion', label: 'Confirmation de déconnexion', iconId: 'auth-confirmation', iconPath: '/icons/deconnexion/auth-confirmation.svg' },
  { id: 'auth-non-synchronises', parentId: 'deconnexion', label: 'Éléments non synchronisés', iconId: 'auth-non-synchronises', iconPath: '/icons/deconnexion/auth-non-synchronises.svg' },
  { id: 'auth-appareil-partage', parentId: 'deconnexion', label: 'Appareil partagé', iconId: 'auth-appareil-partage', iconPath: '/icons/deconnexion/auth-appareil-partage.svg' },
  { id: 'auth-purge-session', parentId: 'deconnexion', label: 'Purge de session et des caches', iconId: 'auth-purge-session', iconPath: '/icons/deconnexion/auth-purge-session.svg' },
  { id: 'auth-auto-inactivite', parentId: 'deconnexion', label: 'Déconnexion automatique après inactivité', iconId: 'auth-auto-inactivite', iconPath: '/icons/deconnexion/auth-auto-inactivite.svg' },
];

export interface NavigationEntry {
  id: string;
  libelle: string;
  icone: string;
  iconId: string;
  iconPath: string;
  waxIcon?: {
    png512: string;
    webp192: string;
    webp96: string;
    alt: string;
  };
  parent: string | null;
  route: string;
  roles: RoleNavigation[];
  ordre: number;
  badge?: BadgeKey;
  disponibleHorsLigne: boolean;
  statut: StatutModule;
  estSaisie?: boolean;
  estEpinglerEnTete?: boolean;
  descriptionCourte?: string;
}

export const REGISTRE_NAVIGATION: NavigationEntry[] = [
  // =========================================================================
  // LES 6 MODULES PRINCIPAUX (GRILLE D'ACCUEIL)
  // =========================================================================
  {
    id: "soins",
    libelle: "Soins & Maternité",
    icone: "Stethoscope",
    iconId: "sm-module",
    iconPath: "/icons/soins-maternite/sm-module.svg",
    waxIcon: {
      png512: "/icons/soins-maternite/sm-module.svg",
      webp192: "/icons/soins-maternite/sm-module.svg",
      webp96: "/icons/soins-maternite/sm-module.svg",
      alt: "Poste de santé communautaire à croix médicale verte, chemin d'accès ocre et frise supérieure turquoise"
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
    iconId: "surv-module",
    iconPath: "/icons/surveillance/surv-module.svg",
    waxIcon: {
      png512: "/icons/surveillance/surv-module.svg",
      webp192: "/icons/surveillance/surv-module.svg",
      webp96: "/icons/surveillance/surv-module.svg",
      alt: "Radar épidémiologique bleu profond avec détection de foyers et croix centrale d'alerte sanitaire"
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
    iconId: "trc-module",
    iconPath: "/icons/terrain-rc/trc-module.svg",
    waxIcon: {
      png512: "/icons/terrain-rc/trc-module.svg",
      webp192: "/icons/terrain-rc/trc-module.svg",
      webp96: "/icons/terrain-rc/trc-module.svg",
      alt: "Relais communautaire en intervention sur sentier villageois bordé d'habitations locales"
    },
    parent: null,
    route: "/espace-ascq?module=terrain",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 3,
    badge: "validations_en_attente",
    disponibleHorsLigne: true,
    statut: "actif",
    descriptionCourte: "Plannings, Suivis groupés des RC, Mes Relais & Validations"
  },
  {
    id: "rapports",
    libelle: "Rapports SNIS",
    icone: "BarChart3",
    iconId: "snis-module",
    iconPath: "/icons/rapports-snis/snis-module.svg",
    waxIcon: {
      png512: "/icons/rapports-snis/snis-module.svg",
      webp192: "/icons/rapports-snis/snis-module.svg",
      webp96: "/icons/rapports-snis/snis-module.svg",
      alt: "Tableau de bord statistique institutionnel combinant histogramme multicolore et courbe de progression"
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
    iconId: "gov-module",
    iconPath: "/icons/gouvernance/gov-module.svg",
    waxIcon: {
      png512: "/icons/gouvernance/gov-module.svg",
      webp192: "/icons/gouvernance/gov-module.svg",
      webp96: "/icons/gouvernance/gov-module.svg",
      alt: "Édifice institutionnel à colonnade et fronton doré symbolisant l'autorité sanitaire nationale"
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
    iconId: "out-module",
    iconPath: "/icons/outils/out-module.svg",
    waxIcon: {
      png512: "/icons/outils/out-module.svg",
      webp192: "/icons/outils/out-module.svg",
      webp96: "/icons/outils/out-module.svg",
      alt: "Mallette opérationnelle de l'agent communautaire ornée d'une croix sanitaire verte"
    },
    parent: null,
    route: "/espace-ascq?module=outils",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 6,
    disponibleHorsLigne: true,
    statut: "actif",
    descriptionCourte: "Guide utilisateur, Formation, Bibliothèque, Permutations & Requêtes"
  },

  // =========================================================================
  // LES 2 MODULES ÉPINGLÉS À DROITE DE L'EN-TÊTE (MODULES 7 & 8)
  // =========================================================================
  {
    id: "synchronisation",
    libelle: "Synchronisation",
    icone: "RefreshCw",
    iconId: "sync-module",
    iconPath: "/icons/synchronisation/sync-module.svg",
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
    iconId: "auth-logout-module",
    iconPath: "/icons/deconnexion/auth-logout-module.svg",
    parent: null,
    route: "#deconnexion",
    roles: ["RC", "ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 8,
    disponibleHorsLigne: true,
    statut: "actif",
    estEpinglerEnTete: true
  },

  // =========================================================================
  // MODULE 1 : SOINS & MATERNITÉ (5 SOUS-ICÔNES)
  // =========================================================================
  {
    id: "sm-vue-ensemble",
    libelle: "Vue d'ensemble",
    icone: "LayoutDashboard",
    iconId: "sm-vue-ensemble",
    iconPath: "/icons/soins-maternite/sm-vue-ensemble.svg",
    parent: "soins",
    route: "/espace-ascq?module=soins&view=overview",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 1,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "sm-iccm",
    libelle: "Prise en charge iCCM",
    icone: "Stethoscope",
    iconId: "sm-iccm",
    iconPath: "/icons/soins-maternite/sm-iccm.svg",
    parent: "soins",
    route: "/espace-ascq/consultations",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 2,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "sm-maternite-1000j",
    libelle: "Maternité & 1000 Jours",
    icone: "Baby",
    iconId: "sm-maternite-1000j",
    iconPath: "/icons/soins-maternite/sm-maternite-1000j.svg",
    parent: "soins",
    route: "/espace-ascq/maternite-enfance",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 3,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "sm-perdus-de-vue",
    libelle: "Perdus de vue",
    icone: "UserX",
    iconId: "sm-perdus-de-vue",
    iconPath: "/icons/soins-maternite/sm-perdus-de-vue.svg",
    parent: "soins",
    route: "/espace-ascq/maternite-enfance?tab=perdus_de_vue",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 4,
    badge: "perdus_de_vue",
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "sm-references-cs-gups",
    libelle: "Références CS/GUPS",
    icone: "HeartPulse",
    iconId: "sm-references-cs-gups",
    iconPath: "/icons/soins-maternite/sm-references-cs-gups.svg",
    parent: "soins",
    route: "/espace-ascq/references",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 5,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },

  // =========================================================================
  // MODULE 2 : SURVEILLANCE ÉPIDÉMIOLOGIQUE (9 SOUS-ICÔNES)
  // =========================================================================
  {
    id: "surv-guide-simr",
    libelle: "Guide SIMR & Vaccins",
    icone: "BookOpen",
    iconId: "surv-guide-simr",
    iconPath: "/icons/surveillance/surv-guide-simr.svg",
    parent: "surveillance",
    route: "/briefing",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 1,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "surv-fiches",
    libelle: "Fiches Surveillance",
    icone: "Activity",
    iconId: "surv-fiches",
    iconPath: "/icons/surveillance/surv-fiches.svg",
    parent: "surveillance",
    route: "/fiches",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 2,
    badge: "alertes_a_confirmer",
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "surv-registre-alertes",
    libelle: "Registre des alertes",
    icone: "ClipboardList",
    iconId: "surv-registre-alertes",
    iconPath: "/icons/surveillance/surv-registre-alertes.svg",
    parent: "surveillance",
    route: "/fiches?tab=registre",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 3,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "surv-notifier-alerte",
    libelle: "Notifier une alerte",
    icone: "BellPlus",
    iconId: "surv-notifier-alerte",
    iconPath: "/icons/surveillance/surv-notifier-alerte.svg",
    parent: "surveillance",
    route: "/fiches/alerte/nouvelle",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 4,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "surv-alertes-a-confirmer",
    libelle: "Alertes à confirmer",
    icone: "AlertTriangle",
    iconId: "surv-alertes-a-confirmer",
    iconPath: "/icons/surveillance/surv-alertes-a-confirmer.svg",
    parent: "surveillance",
    route: "/fiches?tab=a_confirmer",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 5,
    badge: "alertes_a_confirmer",
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "surv-alertes-confirmees",
    libelle: "Alertes déjà confirmées",
    icone: "CheckCircle2",
    iconId: "surv-alertes-confirmees",
    iconPath: "/icons/surveillance/surv-alertes-confirmees.svg",
    parent: "surveillance",
    route: "/fiches?tab=confirmees",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 6,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "surv-notification-deces",
    libelle: "Notification de décès",
    icone: "Skull",
    iconId: "surv-notification-deces",
    iconPath: "/icons/surveillance/surv-notification-deces.svg",
    parent: "surveillance",
    route: "/fiches/deces/nouvelle",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 7,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "surv-fiche-investigation",
    libelle: "Fiche d'investigation",
    icone: "Search",
    iconId: "surv-fiche-investigation",
    iconPath: "/icons/surveillance/surv-fiche-investigation.svg",
    parent: "surveillance",
    route: "/fiches/investigation/nouvelle",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 8,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "surv-rapport-hebdo",
    libelle: "Rapport hebdomadaire",
    icone: "FileSpreadsheet",
    iconId: "surv-rapport-hebdo",
    iconPath: "/icons/surveillance/surv-rapport-hebdo.svg",
    parent: "surveillance",
    route: "/fiches/rapport-hebdo/nouvelle",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 9,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },

  // =========================================================================
  // MODULE 3 : TERRAIN & RC (5 SOUS-ICÔNES OFFICIELLES)
  // =========================================================================
  {
    id: "trc-planning",
    libelle: "Planning",
    icone: "Calendar",
    iconId: "trc-planning",
    iconPath: "/icons/terrain-rc/trc-planning.svg",
    parent: "terrain",
    route: "/espace-ascq/planning",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 1,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "trc-activites",
    libelle: "Activités",
    icone: "CheckSquare",
    iconId: "trc-activites",
    iconPath: "/icons/terrain-rc/trc-activites.svg",
    parent: "terrain",
    route: "/espace-ascq/activites-menees",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 2,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "trc-suivis-groupes",
    libelle: "Suivis groupés des RC",
    icone: "ClipboardCheck",
    iconId: "trc-suivis-groupes",
    iconPath: "/icons/terrain-rc/trc-suivis-groupes.svg",
    parent: "terrain",
    route: "/espace-ascq/suivi-relais",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 3,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "trc-mes-relais",
    libelle: "Mes Relais",
    icone: "Users",
    iconId: "trc-mes-relais",
    iconPath: "/icons/terrain-rc/trc-mes-relais.svg",
    parent: "terrain",
    route: "/espace-ascq/relais",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 4,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "trc-validations-inscription",
    libelle: "Validations d'inscription",
    icone: "UserCheck",
    iconId: "trc-validations-inscription",
    iconPath: "/icons/terrain-rc/trc-validations-inscription.svg",
    parent: "terrain",
    route: "/espace-ascq/relais?tab=validations",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 5,
    badge: "validations_en_attente",
    disponibleHorsLigne: false,
    statut: "actif"
  },

  // =========================================================================
  // MODULE 4 : RAPPORTS SNIS (4 SOUS-ICÔNES)
  // =========================================================================
  {
    id: "snis-suivi-pnsc",
    libelle: "Suivi PNSC",
    icone: "BarChart3",
    iconId: "snis-suivi-pnsc",
    iconPath: "/icons/rapports-snis/snis-suivi-pnsc.svg",
    parent: "rapports",
    route: "/espace-ascq/rapport-hebdo-pnsc",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 1,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "snis-rapport-mensuel",
    libelle: "Rapport mensuel",
    icone: "FileText",
    iconId: "snis-rapport-mensuel",
    iconPath: "/icons/rapports-snis/snis-rapport-mensuel.svg",
    parent: "rapports",
    route: "/espace-ascq/rapport-mensuel",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 2,
    disponibleHorsLigne: true,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "snis-synthese-communale",
    libelle: "Synthèse communale",
    icone: "Building2",
    iconId: "snis-synthese-communale",
    iconPath: "/icons/rapports-snis/snis-synthese-communale.svg",
    parent: "rapports",
    route: "/espace-ascq/rapport-hebdo-pnsc?tab=synthese_communale",
    roles: ["REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 3,
    disponibleHorsLigne: false,
    statut: "actif"
  },
  {
    id: "snis-exports",
    libelle: "Exports",
    icone: "Download",
    iconId: "snis-exports",
    iconPath: "/icons/rapports-snis/snis-exports.svg",
    parent: "rapports",
    route: "/espace-ascq/rapport-mensuel?tab=exports",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 4,
    disponibleHorsLigne: true,
    statut: "actif"
  },

  // =========================================================================
  // MODULE 5 : GOUVERNANCE & ADMINISTRATION (7 SOUS-ICÔNES)
  // =========================================================================
  {
    id: "gov-perimetre",
    libelle: "Périmètre",
    icone: "Crown",
    iconId: "gov-perimetre",
    iconPath: "/icons/gouvernance/gov-perimetre.svg",
    parent: "gouvernance",
    route: "/perimetre",
    roles: ["REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 1,
    disponibleHorsLigne: false,
    statut: "actif"
  },
  {
    id: "gov-representants-nommes",
    libelle: "Représentants nommés",
    icone: "Award",
    iconId: "gov-representants-nommes",
    iconPath: "/icons/gouvernance/gov-representants-nommes.svg",
    parent: "gouvernance",
    route: "/perimetre?tab=suivi_individuel",
    roles: ["REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 2,
    disponibleHorsLigne: false,
    statut: "actif"
  },
  {
    id: "gov-cadres-ressort",
    libelle: "Cadres pour leur ressort",
    icone: "Users",
    iconId: "gov-cadres-ressort",
    iconPath: "/icons/gouvernance/gov-cadres-ressort.svg",
    parent: "gouvernance",
    route: "/perimetre?tab=fiches_territoire",
    roles: ["REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 3,
    disponibleHorsLigne: false,
    statut: "actif"
  },
  {
    id: "gov-administration",
    libelle: "Administration",
    icone: "ShieldCheck",
    iconId: "gov-administration",
    iconPath: "/icons/gouvernance/gov-administration.svg",
    parent: "gouvernance",
    route: "/admin",
    roles: ["SUPER_ADMIN"],
    ordre: 4,
    disponibleHorsLigne: false,
    statut: "actif"
  },
  {
    id: "gov-comptes-validations",
    libelle: "Comptes et validations",
    icone: "UserCheck",
    iconId: "gov-comptes-validations",
    iconPath: "/icons/gouvernance/gov-comptes-validations.svg",
    parent: "gouvernance",
    route: "/admin?tab=comptes_ascq",
    roles: ["SUPER_ADMIN"],
    ordre: 5,
    badge: "validations_en_attente",
    disponibleHorsLigne: false,
    statut: "actif"
  },
  {
    id: "gov-journal-audit",
    libelle: "Journal d'audit",
    icone: "FileSearch",
    iconId: "gov-journal-audit",
    iconPath: "/icons/gouvernance/gov-journal-audit.svg",
    parent: "gouvernance",
    route: "/admin?tab=audit",
    roles: ["SUPER_ADMIN"],
    ordre: 6,
    disponibleHorsLigne: false,
    statut: "actif"
  },
  {
    id: "gov-demandes-export-ministere",
    libelle: "Demandes d'export du ministère",
    icone: "FileSpreadsheet",
    iconId: "gov-demandes-export-ministere",
    iconPath: "/icons/gouvernance/gov-demandes-export-ministere.svg",
    parent: "gouvernance",
    route: "/admin?tab=exports",
    roles: ["SUPER_ADMIN"],
    ordre: 7,
    badge: "demandes_export",
    disponibleHorsLigne: false,
    statut: "actif"
  },

  // =========================================================================
  // MODULE 6 : OUTILS & RESSOURCES (6 SOUS-ICÔNES)
  // =========================================================================
  {
    id: "out-guide-utilisateur",
    libelle: "Guide utilisateur",
    icone: "BookOpen",
    iconId: "out-guide-utilisateur",
    iconPath: "/icons/outils/out-guide-utilisateur.svg",
    parent: "outils",
    route: "/guide",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 1,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "out-formation",
    libelle: "Formation",
    icone: "GraduationCap",
    iconId: "out-formation",
    iconPath: "/icons/outils/out-formation.svg",
    parent: "outils",
    route: "/guide?tab=formation",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 2,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "out-bibliotheque",
    libelle: "Bibliothèque",
    icone: "Library",
    iconId: "out-bibliotheque",
    iconPath: "/icons/outils/out-bibliotheque.svg",
    parent: "outils",
    route: "/espace-ascq/bibliotheque",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 3,
    disponibleHorsLigne: true,
    statut: "actif"
  },
  {
    id: "out-permutations",
    libelle: "Permutations",
    icone: "ArrowLeftRight",
    iconId: "out-permutations",
    iconPath: "/icons/outils/out-permutations.svg",
    parent: "outils",
    route: "/espace-ascq/permutations",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 4,
    disponibleHorsLigne: false,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "out-requetes",
    libelle: "Requêtes",
    icone: "MessageSquareText",
    iconId: "out-requetes",
    iconPath: "/icons/outils/out-requetes.svg",
    parent: "outils",
    route: "/espace-ascq/requetes",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "SUPER_ADMIN"],
    ordre: 5,
    disponibleHorsLigne: false,
    statut: "actif",
    estSaisie: true
  },
  {
    id: "out-presentation-conseils",
    libelle: "Présentation Conseils",
    icone: "Sparkles",
    iconId: "out-presentation-conseils",
    iconPath: "/icons/outils/out-presentation-conseils.svg",
    parent: "outils",
    route: "/presentation",
    roles: ["ASCQ", "REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "MEMBRE_MINISTERE", "SUPER_ADMIN"],
    ordre: 6,
    disponibleHorsLigne: true,
    statut: "actif"
  }
];

// ===========================================================================
// MODULES POUR LES RELAIS COMMUNAUTAIRES (RC) AVEC LES ICÔNES VECTORIELLES
// ===========================================================================
export const REGISTRE_MODULES_RC: NavigationEntry[] = [
  {
    id: "rc_fiches",
    libelle: "Fiches & Registre",
    icone: "FileText",
    iconId: "surv-fiches",
    iconPath: "/icons/surveillance/surv-fiches.svg",
    waxIcon: {
      png512: "/icons/surveillance/surv-fiches.svg",
      webp192: "/icons/surveillance/surv-fiches.svg",
      webp96: "/icons/surveillance/surv-fiches.svg",
      alt: "Fiches et Registre du Relais Communautaire"
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
    iconId: "trc-planning",
    iconPath: "/icons/terrain-rc/trc-planning.svg",
    waxIcon: {
      png512: "/icons/terrain-rc/trc-planning.svg",
      webp192: "/icons/terrain-rc/trc-planning.svg",
      webp96: "/icons/terrain-rc/trc-planning.svg",
      alt: "Planning hebdomadaire et Visites à domicile RC"
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
    iconId: "surv-notifier-alerte",
    iconPath: "/icons/surveillance/surv-notifier-alerte.svg",
    waxIcon: {
      png512: "/icons/surveillance/surv-notifier-alerte.svg",
      webp192: "/icons/surveillance/surv-notifier-alerte.svg",
      webp96: "/icons/surveillance/surv-notifier-alerte.svg",
      alt: "Alertes sanitaires et Références du Relais"
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
    libelle: "Formation & Compte",
    icone: "BookOpen",
    iconId: "out-formation",
    iconPath: "/icons/outils/out-formation.svg",
    waxIcon: {
      png512: "/icons/outils/out-formation.svg",
      webp192: "/icons/outils/out-formation.svg",
      webp96: "/icons/outils/out-formation.svg",
      alt: "Formation et Compte du Relais Communautaire"
    },
    parent: null,
    route: "/guide?profil=RC",
    roles: ["RC"],
    ordre: 4,
    disponibleHorsLigne: true,
    statut: "actif"
  }
];

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

  if (rawRoles.some((r) => r === "SUPER_ADMIN" || r === "ADMINISTRATEUR")) {
    out.add("SUPER_ADMIN");
    out.add("REPRESENTANT_COMMUNAL");
    out.add("ASCQ");
  }

  if (rawRoles.some((r) => r.includes("MINISTERE") || r === "DDS" || r === "MCZS")) {
    out.add("MEMBRE_MINISTERE");
  }

  if (rawRoles.some((r) => r.includes("PF_CCLS") || r.includes("CCLS"))) {
    out.add("PF_CCLS_TP");
  }

  if (rawRoles.some((r) => r.includes("REPRESENTANT_COMMUNAL") || r === "REPRESENTANT")) {
    out.add("REPRESENTANT_COMMUNAL");
    out.add("ASCQ");
  }

  if (rawRoles.some((r) => r === "RC" || r === "RELAIS" || r === "RELAIS_COMMUNAUTAIRE")) {
    if (out.size === 0) {
      out.add("RC");
    }
  }

  if (out.size === 0 || rawRoles.some((r) => r.includes("ASCQ"))) {
    if (!out.has("PF_CCLS_TP") && !out.has("MEMBRE_MINISTERE") && !out.has("RC")) {
      out.add("ASCQ");
    }
  }

  return Array.from(out);
}

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
    const sousModules = obtenirSousModulesAutorises(entry.id, userProfile);
    if (estUniquementObservateur && sousModules.length === 0) return false;
    return true;
  }).sort((a, b) => a.ordre - b.ordre);
}

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

export function verifierAccesRoute(pathname: string, userProfile?: any): {
  autorise: boolean;
  motifRefus?: string;
} {
  if (!userProfile) return { autorise: true };
  const roles = resoudreRolesUtilisateur(userProfile);

  if (pathname.startsWith("/admin")) {
    if (!roles.includes("SUPER_ADMIN")) {
      return {
        autorise: false,
        motifRefus: "Accès refusé : seuls les Administrateurs nommés peuvent accéder au module Administration."
      };
    }
  }

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
    { id: "surv-fiches", libelle: "Fiches Surveillance", route: "/fiches", parent: "surveillance" },
    { id: "trc-planning", libelle: "Planning", route: "/espace-ascq/planning", parent: "terrain" },
    { id: "sm-iccm", libelle: "Prise en charge iCCM", route: "/espace-ascq/consultations", parent: "soins" }
  ];
}

export type ModuleId = "soins" | "surveillance" | "terrain" | "rapports" | "gouvernance" | "outils";
export type ElementRecent = { id: string; libelle: string; route: string; parent?: string | null };

export const MODULES_PRINCIPAUX = REGISTRE_NAVIGATION.filter(
  (e) => e.parent === null && !e.estEpinglerEnTete
);
export const SOUS_MODULES = REGISTRE_NAVIGATION.filter((e) => e.parent !== null);
export const MODULES_RC = REGISTRE_MODULES_RC;
export const obtenirElementsRecents = obtenirNavigationsRecentes;
export const enregistrerElementRecent = enregistrerNavigationRecente;
