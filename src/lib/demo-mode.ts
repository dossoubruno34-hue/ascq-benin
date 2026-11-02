/**
 * MODULE OFFICIEL DE DÉMONSTRATION INTERACTIVE EN 1 CLIC
 * Dédié à la Présentation Officielle au Bureau National des ASCQ du Bénin.
 * 
 * Permet de basculer instantanément entre tous les niveaux de la pyramide sanitaire
 * sans mot de passe, sans risque d'erreur SQL ou de coupure réseau.
 */

export interface DemoProfile {
  id: string;
  nom: string;
  prenoms: string;
  telephone: string;
  email: string;
  poste: string;
  poste_autre?: string;
  role_technique: string;
  role_nomination: string;
  titre_affiche: string;
  niveau_description: string;
  categorie: "NATIONAL" | "DEPARTEMENTAL" | "ZONE_SANITAIRE" | "COMMUNAL" | "TERRAIN_ASCQ";
  departement_id: string | null;
  departement_nom: string | null;
  zone_sanitaire_id: string | null;
  zone_sanitaire_nom: string | null;
  commune_id: string | null;
  commune_nom: string | null;
  arrondissement_id: string | null;
  arrondissement_nom: string | null;
  second_arrondissement_id?: string | null;
  second_arrondissement_nom?: string | null;
  source_financement?: string;
  nombre_rc_declare?: number;
  statut_compte: "VALIDE";
  target_url: string;
}

// -----------------------------------------------------------------------------------------
// RÉFÉRENTIELS D'IDENTITÉ TERRITORIALE (ZOU, CZO, OUINHI, TOHOUÈS, DASSO)
// -----------------------------------------------------------------------------------------
export const DEMO_GEO = {
  ZOU_ID: "e205cacd-e3f8-44b3-bc94-e354fa676b4e",
  ZOU_NOM: "Zou",
  CZO_ID: "733ea267-1d3d-4b16-80c3-dbd12c36aa00",
  CZO_NOM: "Covè - Zagnanado - Ouinhi",
  OUINHI_ID: "95967d23-5b0b-493a-9bd7-9286815be698",
  OUINHI_NOM: "Ouinhi",
  TOHOUES_ID: "1d451a4c-5386-4f79-9d9c-d8a4d19beef0",
  TOHOUES_NOM: "Tohouès",
  DASSO_ID: "85942f66-98f8-4f90-ac90-05eaa16fc8e9",
  DASSO_NOM: "Dasso",
  BRUNO_ID: "627b405a-8f74-46a8-bcb4-50ae421f168f",
};

// -----------------------------------------------------------------------------------------
// LES 10 PROFILS OFFICIELS DE DÉMONSTRATION
// -----------------------------------------------------------------------------------------
export const DEMO_PROFILES: DemoProfile[] = [
  // 1. NIVEAU NATIONAL : BUREAU NATIONAL DES ASCQ
  {
    id: "d0000000-0000-4000-a000-000000000001",
    nom: "HOUNSOU",
    prenoms: "Jérémie (Président National)",
    telephone: "+2290199000000",
    email: "bureau.national@demo-ascq.bj",
    poste: "COORDINATEUR_NATIONAL",
    role_technique: "SUPER_ADMIN",
    role_nomination: "RESPONSABLE_NATIONAL",
    titre_affiche: "Président du Bureau National des ASCQ",
    niveau_description: "Vue souveraine sur les 12 départements, 77 communes, 546 arrondissements et 1842 ASCQ.",
    categorie: "NATIONAL",
    departement_id: null,
    departement_nom: null,
    zone_sanitaire_id: null,
    zone_sanitaire_nom: null,
    commune_id: null,
    commune_nom: null,
    arrondissement_id: null,
    arrondissement_nom: null,
    statut_compte: "VALIDE",
    target_url: "/perimetre",
  },

  // 2. NIVEAU DÉPARTEMENTAL : CCD CDLS-TP ZOU
  {
    id: "d0000000-0000-4000-a000-000000000002",
    nom: "AGBOSSA",
    prenoms: "Symphorien",
    telephone: "+2290199000001",
    email: "ccd.zou@demo-ascq.bj",
    poste: "CCD_CDLS_TP",
    role_technique: "CADRE_DEPARTEMENTAL",
    role_nomination: "RESPONSABLE_DEPARTEMENTAL",
    titre_affiche: "Chef Cellule Dép. CDLS-TP Zou",
    niveau_description: "Coordination et suivi épidémiologique des 9 communes du département du Zou.",
    categorie: "DEPARTEMENTAL",
    departement_id: DEMO_GEO.ZOU_ID,
    departement_nom: DEMO_GEO.ZOU_NOM,
    zone_sanitaire_id: null,
    zone_sanitaire_nom: null,
    commune_id: null,
    commune_nom: null,
    arrondissement_id: null,
    arrondissement_nom: null,
    statut_compte: "VALIDE",
    target_url: "/perimetre",
  },

  // 3. NIVEAU DÉPARTEMENTAL : REPRÉSENTANT DÉPARTEMENTAL ZOU DES ASCQ
  {
    id: "d0000000-0000-4000-a000-000000000003",
    nom: "TOSSOU",
    prenoms: "Marcellin",
    telephone: "+2290199000002",
    email: "rep.zou@demo-ascq.bj",
    poste: "ASCQ",
    role_technique: "REPRESENTANT_DEPARTEMENTAL",
    role_nomination: "REPRESENTANT_DEPARTEMENTAL",
    titre_affiche: "Représentant Départemental Zou des ASCQ",
    niveau_description: "Gouvernance corporative des ASCQ du Zou, consolidation départementale et plannings.",
    categorie: "DEPARTEMENTAL",
    departement_id: DEMO_GEO.ZOU_ID,
    departement_nom: DEMO_GEO.ZOU_NOM,
    zone_sanitaire_id: null,
    zone_sanitaire_nom: null,
    commune_id: null,
    commune_nom: null,
    arrondissement_id: null,
    arrondissement_nom: null,
    statut_compte: "VALIDE",
    target_url: "/perimetre",
  },

  // 4. NIVEAU ZONE SANITAIRE : C-RAMS ZONE COVÈ-ZAGNANADO-OUINHI (CZO)
  {
    id: "d0000000-0000-4000-a000-000000000004",
    nom: "BIO",
    prenoms: "Chabi",
    telephone: "+2290199000003",
    email: "crams.czo@demo-ascq.bj",
    poste: "C_RAMS",
    role_technique: "CADRE_ZONE_SANITAIRE",
    role_nomination: "RESPONSABLE_ZONE_SANITAIRE",
    titre_affiche: "Coordonnateur RAMS - Zone Sanitaire CZO",
    niveau_description: "Supervision logistique, intrants et rapportage RAMS sur Covè, Zagnanado et Ouinhi.",
    categorie: "ZONE_SANITAIRE",
    departement_id: DEMO_GEO.ZOU_ID,
    departement_nom: DEMO_GEO.ZOU_NOM,
    zone_sanitaire_id: DEMO_GEO.CZO_ID,
    zone_sanitaire_nom: DEMO_GEO.CZO_NOM,
    commune_id: null,
    commune_nom: null,
    arrondissement_id: null,
    arrondissement_nom: null,
    statut_compte: "VALIDE",
    target_url: "/perimetre",
  },

  // 5. NIVEAU COMMUNAL : MÉDECIN CHEF COMMUNE (MCC OUINHI)
  {
    id: "d0000000-0000-4000-a000-000000000005",
    nom: "KOUDJO",
    prenoms: "Dr. Arnaud",
    telephone: "+2290199000004",
    email: "mcc.ouinhi@demo-ascq.bj",
    poste: "MCC",
    role_technique: "CADRE_COMMUNAL",
    role_nomination: "RESPONSABLE_COMMUNAL",
    titre_affiche: "Médecin Coordonnateur de Commune (MCC Ouinhi)",
    niveau_description: "Validation technique des fiches cliniques, contre-références CS et alerte choléra.",
    categorie: "COMMUNAL",
    departement_id: DEMO_GEO.ZOU_ID,
    departement_nom: DEMO_GEO.ZOU_NOM,
    zone_sanitaire_id: DEMO_GEO.CZO_ID,
    zone_sanitaire_nom: DEMO_GEO.CZO_NOM,
    commune_id: DEMO_GEO.OUINHI_ID,
    commune_nom: DEMO_GEO.OUINHI_NOM,
    arrondissement_id: null,
    arrondissement_nom: null,
    statut_compte: "VALIDE",
    target_url: "/perimetre",
  },

  // 6. NIVEAU COMMUNAL : POINT FOCAL SANTÉ MAIRIE (PF CCLS-TP OUINHI)
  {
    id: "d0000000-0000-4000-a000-000000000006",
    nom: "ADANHO",
    prenoms: "Clarisse",
    telephone: "+2290199000005",
    email: "pf.ccls.ouinhi@demo-ascq.bj",
    poste: "PF_CCLS_TP",
    role_technique: "CADRE_COMMUNAL",
    role_nomination: "RESPONSABLE_COMMUNAL",
    titre_affiche: "Point Focal Santé Mairie (CCLS-TP Ouinhi)",
    niveau_description: "Suivi municipal de l'hygiène, eau potable, sensibilisations et appui aux ASCQ.",
    categorie: "COMMUNAL",
    departement_id: DEMO_GEO.ZOU_ID,
    departement_nom: DEMO_GEO.ZOU_NOM,
    zone_sanitaire_id: DEMO_GEO.CZO_ID,
    zone_sanitaire_nom: DEMO_GEO.CZO_NOM,
    commune_id: DEMO_GEO.OUINHI_ID,
    commune_nom: DEMO_GEO.OUINHI_NOM,
    arrondissement_id: null,
    arrondissement_nom: null,
    statut_compte: "VALIDE",
    target_url: "/perimetre",
  },

  // 7. NIVEAU COMMUNAL : REPRÉSENTANT COMMUNAL OUINHI (BRUNO DOSSOU)
  {
    id: DEMO_GEO.BRUNO_ID,
    nom: "DOSSOU",
    prenoms: "Bruno (Représentant Communal)",
    telephone: "+2290169031463",
    email: "dossoubruno34@gmail.com",
    poste: "ASCQ",
    role_technique: "REPRESENTANT_COMMUNAL",
    role_nomination: "REPRESENTANT_COMMUNAL",
    titre_affiche: "Représentant Communal Ouinhi & ASCQ Tohouès",
    niveau_description: "Rapport consolidé Tohouès + Dasso (14 RC), validation des inscriptions et arbitrage RMA.",
    categorie: "COMMUNAL",
    departement_id: DEMO_GEO.ZOU_ID,
    departement_nom: DEMO_GEO.ZOU_NOM,
    zone_sanitaire_id: DEMO_GEO.CZO_ID,
    zone_sanitaire_nom: DEMO_GEO.CZO_NOM,
    commune_id: DEMO_GEO.OUINHI_ID,
    commune_nom: DEMO_GEO.OUINHI_NOM,
    arrondissement_id: DEMO_GEO.TOHOUES_ID,
    arrondissement_nom: DEMO_GEO.TOHOUES_NOM,
    second_arrondissement_id: DEMO_GEO.DASSO_ID,
    second_arrondissement_nom: DEMO_GEO.DASSO_NOM,
    source_financement: "LLF",
    nombre_rc_declare: 11,
    statut_compte: "VALIDE",
    target_url: "/perimetre",
  },

  // 8. NIVEAU ARRONDISSEMENT : ASCQ DASSO (GÉRARD KPODANHO)
  {
    id: "d0000000-0000-4000-a000-000000000007",
    nom: "KPODANHO",
    prenoms: "Gérard",
    telephone: "+2290199000007",
    email: "ascq.dasso@demo-ascq.bj",
    poste: "ASCQ",
    role_technique: "ASCQ_OPERATEUR",
    role_nomination: "ASCQ",
    titre_affiche: "ASCQ Arrondissement Dasso (Ouinhi)",
    niveau_description: "Superviseur de 3 RC à Dasso, prise en charge iCCM, 1 alerte choléra investiguée.",
    categorie: "TERRAIN_ASCQ",
    departement_id: DEMO_GEO.ZOU_ID,
    departement_nom: DEMO_GEO.ZOU_NOM,
    zone_sanitaire_id: DEMO_GEO.CZO_ID,
    zone_sanitaire_nom: DEMO_GEO.CZO_NOM,
    commune_id: DEMO_GEO.OUINHI_ID,
    commune_nom: DEMO_GEO.OUINHI_NOM,
    arrondissement_id: DEMO_GEO.DASSO_ID,
    arrondissement_nom: DEMO_GEO.DASSO_NOM,
    source_financement: "LLF",
    nombre_rc_declare: 3,
    statut_compte: "VALIDE",
    target_url: "/espace-ascq",
  },

  // 9. NIVEAU ARRONDISSEMENT : ASCQ TOHOUÈS (BRUNO DOSSOU TERRAIN)
  {
    id: DEMO_GEO.BRUNO_ID,
    nom: "DOSSOU",
    prenoms: "Bruno (Terrain Tohouès)",
    telephone: "+2290169031463",
    email: "dossoubruno34@gmail.com",
    poste: "ASCQ",
    role_technique: "SUPER_ADMIN",
    role_nomination: "REPRESENTANT_COMMUNAL",
    titre_affiche: "ASCQ Arrondissement Tohouès (Terrain)",
    niveau_description: "Espace terrain avec les 11 Relais réels enregistrés de Tohouès, planning et consultations.",
    categorie: "TERRAIN_ASCQ",
    departement_id: DEMO_GEO.ZOU_ID,
    departement_nom: DEMO_GEO.ZOU_NOM,
    zone_sanitaire_id: DEMO_GEO.CZO_ID,
    zone_sanitaire_nom: DEMO_GEO.CZO_NOM,
    commune_id: DEMO_GEO.OUINHI_ID,
    commune_nom: DEMO_GEO.OUINHI_NOM,
    arrondissement_id: DEMO_GEO.TOHOUES_ID,
    arrondissement_nom: DEMO_GEO.TOHOUES_NOM,
    source_financement: "LLF",
    nombre_rc_declare: 11,
    statut_compte: "VALIDE",
    target_url: "/espace-ascq",
  },

  // 10. NIVEAU EXTÉRIEUR : ASCQ DÉPARTEMENT DU LITTORAL (COTONOU)
  {
    id: "d0000000-0000-4000-a000-000000000010",
    nom: "DOSSOU-YOVO",
    prenoms: "Reine",
    telephone: "+2290199000010",
    email: "ascq.cotonou5@demo-ascq.bj",
    poste: "ASCQ",
    role_technique: "ASCQ_OPERATEUR",
    role_nomination: "ASCQ",
    titre_affiche: "ASCQ Cotonou 5ème (Littoral)",
    niveau_description: "Démonstration nationale montrant la portabilité de l'application dans les 12 départements.",
    categorie: "TERRAIN_ASCQ",
    departement_id: "lit00000-0000-4000-a000-000000000001",
    departement_nom: "Littoral",
    zone_sanitaire_id: "lit-zs00-0000-4000-a000-000000000001",
    zone_sanitaire_nom: "Cotonou 5",
    commune_id: "lit-com0-0000-4000-a000-000000000001",
    commune_nom: "Cotonou",
    arrondissement_id: "lit-arr0-0000-4000-a000-000000000005",
    arrondissement_nom: "5ème Arrondissement",
    source_financement: "LLF",
    nombre_rc_declare: 5,
    statut_compte: "VALIDE",
    target_url: "/espace-ascq",
  },
];

// Clés de persistance LocalStorage pour le Mode Démo
export const DEMO_STORAGE_KEYS = {
  IS_ACTIVE: "ascq_demo_mode_active_v1",
  ACTIVE_PROFILE_ID: "ascq_demo_active_profile_id_v1",
  COLLAPSED_BANNER: "ascq_demo_banner_collapsed_v1",
};

// -----------------------------------------------------------------------------------------
// FONCTIONS GESTIONNAIRES DU MODE DÉMONSTRATION
// -----------------------------------------------------------------------------------------

export function isDemoModeActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DEMO_STORAGE_KEYS.IS_ACTIVE) === "true";
  } catch {
    return false;
  }
}

export function getActiveDemoProfile(): DemoProfile | null {
  if (typeof window === "undefined") return null;
  try {
    if (!isDemoModeActive()) return null;
    const profId = localStorage.getItem(DEMO_STORAGE_KEYS.ACTIVE_PROFILE_ID);
    if (!profId) return DEMO_PROFILES[0];
    return DEMO_PROFILES.find((p) => p.id === profId) || DEMO_PROFILES[0];
  } catch {
    return null;
  }
}

export function activateDemoProfile(profileId: string): DemoProfile {
  const profile = DEMO_PROFILES.find((p) => p.id === profileId) || DEMO_PROFILES[0];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(DEMO_STORAGE_KEYS.IS_ACTIVE, "true");
      localStorage.setItem(DEMO_STORAGE_KEYS.ACTIVE_PROFILE_ID, profile.id);

      // Mettre à jour la session en cache pour offline-sync
      const simulatedSession = {
        user: {
          id: profile.id,
          phone: profile.telephone,
          email: profile.email,
          user_metadata: {
            nom: profile.nom,
            prenoms: profile.prenoms,
            poste: profile.poste,
          },
        },
        profile: { ...profile },
      };

      localStorage.setItem("ascq_offline_session_cache_v2", JSON.stringify(simulatedSession.user));
      localStorage.setItem("ascq_offline_profile_cache_v2", JSON.stringify(simulatedSession.profile));
      localStorage.setItem("ascq_offline_mon_espace_v2", JSON.stringify({
        data: {
          ...profile,
          nombre_rc_actifs: profile.nombre_rc_declare || 5,
          taux_completude_hebdo: 100,
          taux_completude_mensuel: 100,
        },
        savedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn("Échec activation profil démo dans localStorage :", e);
    }
  }
  return profile;
}

export function deactivateDemoMode(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DEMO_STORAGE_KEYS.IS_ACTIVE);
    localStorage.removeItem(DEMO_STORAGE_KEYS.ACTIVE_PROFILE_ID);
    // Restaurer le compte officiel Bruno DOSSOU
    const brunoProfile = DEMO_PROFILES.find((p) => p.telephone.includes("69031463"));
    if (brunoProfile) {
      localStorage.setItem(
        "ascq_offline_session_cache_v2",
        JSON.stringify({
          id: brunoProfile.id,
          phone: brunoProfile.telephone,
          email: brunoProfile.email,
        })
      );
      localStorage.setItem(
        "ascq_offline_profile_cache_v2",
        JSON.stringify({
          ...brunoProfile,
          role_technique: "SUPER_ADMIN",
          statut_compte: "VALIDE",
        })
      );
    }
  } catch (e) {
    console.warn("Échec désactivation mode démo :", e);
  }
}

// -----------------------------------------------------------------------------------------
// DONNÉES STATISTIQUES COHÉRENTES & RICHES SELON LE PÉRIMÈTRE DEMANDÉ
// -----------------------------------------------------------------------------------------

export function getDemoStatsForScope(scopeLevel: string, profile?: DemoProfile | null): any {
  // 1. NIVEAU NATIONAL (Tout le Bénin - 12 départements)
  if (scopeLevel === "NATIONAL") {
    return {
      total_alertes: 48,
      alertes_prioritaires: 12,
      alertes_non_investiguees: 0,
      delai_detection_heures: 4,
      total_deces: 19,
      deces_maternels: 3,
      deces_neonatals: 16,
      total_ascq: 1842,
      rma_deposes: 1742,
      rma_retard: 100,
      rma_manquants: 0,
      taux_completude_rma: 95,
      total_vad: 48920,
      total_causeries: 6240,
      total_femmes_suivies: 18450,
      total_enfants_suivis: 42100,
      total_references: 3120,
      consultations_stats: {
        total: 34812,
        palu_tdr_pos: 19420,
        diarrhee: 5210,
        ira: 6840,
        malnutrition: 890,
        autres: 2452,
        referes: 3120,
        pec: 31692,
        moins_5ans: 28400,
      },
      ventilation: [
        { id: "dep-zou", nom: "Zou", alertes: 5, deces: 2, rma_deposes: 190, ascq_count: 198, consultations: 3840, palu: 2100, vad: 5120, references: 310 },
        { id: "dep-atl", nom: "Atlantique", alertes: 7, deces: 3, rma_deposes: 220, ascq_count: 235, consultations: 4620, palu: 2410, vad: 6200, references: 420 },
        { id: "dep-lit", nom: "Littoral (Cotonou)", alertes: 4, deces: 1, rma_deposes: 145, ascq_count: 150, consultations: 3100, palu: 1450, vad: 4100, references: 280 },
        { id: "dep-oue", nom: "Ouémé", alertes: 6, deces: 2, rma_deposes: 180, ascq_count: 190, consultations: 3750, palu: 2050, vad: 4900, references: 330 },
        { id: "dep-bor", nom: "Borgou", alertes: 5, deces: 2, rma_deposes: 165, ascq_count: 175, consultations: 3400, palu: 1950, vad: 4600, references: 300 },
        { id: "dep-ali", nom: "Alibori", alertes: 3, deces: 1, rma_deposes: 120, ascq_count: 130, consultations: 2500, palu: 1400, vad: 3500, references: 240 },
        { id: "dep-ata", nom: "Atacora", alertes: 4, deces: 2, rma_deposes: 135, ascq_count: 145, consultations: 2700, palu: 1520, vad: 3800, references: 260 },
        { id: "dep-col", nom: "Collines", alertes: 4, deces: 1, rma_deposes: 150, ascq_count: 160, consultations: 2950, palu: 1680, vad: 4100, references: 270 },
        { id: "dep-cou", nom: "Couffo", alertes: 3, deces: 2, rma_deposes: 140, ascq_count: 148, consultations: 2800, palu: 1600, vad: 3900, references: 250 },
        { id: "dep-don", nom: "Donga", alertes: 2, deces: 1, rma_deposes: 105, ascq_count: 112, consultations: 2100, palu: 1200, vad: 3000, references: 200 },
        { id: "dep-mon", nom: "Mono", alertes: 3, deces: 1, rma_deposes: 112, ascq_count: 120, consultations: 2250, palu: 1300, vad: 3200, references: 210 },
        { id: "dep-pla", nom: "Plateau", alertes: 2, deces: 1, rma_deposes: 80, ascq_count: 87, consultations: 1602, palu: 960, vad: 2500, references: 150 },
      ],
    };
  }

  // 2. NIVEAU DÉPARTEMENTAL (Département du Zou - 9 communes)
  if (scopeLevel === "DEPARTEMENTAL") {
    return {
      total_alertes: 5,
      alertes_prioritaires: 2,
      alertes_non_investiguees: 0,
      delai_detection_heures: 3,
      total_deces: 2,
      deces_maternels: 0,
      deces_neonatals: 2,
      total_ascq: 198,
      rma_deposes: 190,
      rma_retard: 8,
      rma_manquants: 0,
      taux_completude_rma: 96,
      total_vad: 5120,
      total_causeries: 640,
      total_femmes_suivies: 1920,
      total_enfants_suivis: 4400,
      total_references: 310,
      consultations_stats: {
        total: 3840,
        palu_tdr_pos: 2100,
        diarrhee: 540,
        ira: 780,
        malnutrition: 95,
        autres: 325,
        referes: 310,
        pec: 3530,
        moins_5ans: 3150,
      },
      ventilation: [
        { id: DEMO_GEO.OUINHI_ID, nom: "Ouinhi", alertes: 1, deces: 1, rma_deposes: 4, ascq_count: 4, consultations: 390, palu: 215, vad: 580, references: 38 },
        { id: "com-bohicon", nom: "Bohicon", alertes: 1, deces: 0, rma_deposes: 32, ascq_count: 33, consultations: 680, palu: 370, vad: 890, references: 55 },
        { id: "com-abomey", nom: "Abomey", alertes: 0, deces: 0, rma_deposes: 28, ascq_count: 29, consultations: 590, palu: 320, vad: 780, references: 48 },
        { id: "com-cove", nom: "Covè", alertes: 1, deces: 0, rma_deposes: 18, ascq_count: 19, consultations: 360, palu: 195, vad: 490, references: 32 },
        { id: "com-zagnanado", nom: "Zagnanado", alertes: 0, deces: 0, rma_deposes: 16, ascq_count: 17, consultations: 340, palu: 180, vad: 460, references: 28 },
        { id: "com-zogbodomey", nom: "Zogbodomey", alertes: 1, deces: 1, rma_deposes: 26, ascq_count: 27, consultations: 510, palu: 280, vad: 680, references: 42 },
        { id: "com-djidja", nom: "Djidja", alertes: 1, deces: 0, rma_deposes: 28, ascq_count: 30, consultations: 540, palu: 300, vad: 710, references: 45 },
        { id: "com-zakpota", nom: "Za-Kpota", alertes: 0, deces: 0, rma_deposes: 24, ascq_count: 25, consultations: 460, palu: 250, vad: 620, references: 37 },
        { id: "com-agbangnizoun", nom: "Agbangnizoun", alertes: 0, deces: 0, rma_deposes: 18, ascq_count: 18, consultations: 360, palu: 190, vad: 490, references: 30 },
      ],
    };
  }

  // 3. NIVEAU ZONE SANITAIRE (Zone CZO : Covè, Zagnanado, Ouinhi)
  if (scopeLevel === "ZONE_SANITAIRE") {
    return {
      total_alertes: 2,
      alertes_prioritaires: 1,
      alertes_non_investiguees: 0,
      delai_detection_heures: 3,
      total_deces: 1,
      deces_maternels: 0,
      deces_neonatals: 1,
      total_ascq: 64,
      rma_deposes: 62,
      rma_retard: 2,
      rma_manquants: 0,
      taux_completude_rma: 97,
      total_vad: 1530,
      total_causeries: 190,
      total_femmes_suivies: 580,
      total_enfants_suivis: 1320,
      total_references: 98,
      consultations_stats: {
        total: 1090,
        palu_tdr_pos: 590,
        diarrhee: 150,
        ira: 220,
        malnutrition: 28,
        autres: 102,
        referes: 98,
        pec: 992,
        moins_5ans: 890,
      },
      ventilation: [
        { id: DEMO_GEO.OUINHI_ID, nom: "Ouinhi", alertes: 1, deces: 1, rma_deposes: 4, ascq_count: 4, consultations: 390, palu: 215, vad: 580, references: 38 },
        { id: "com-cove", nom: "Covè", alertes: 1, deces: 0, rma_deposes: 18, ascq_count: 19, consultations: 360, palu: 195, vad: 490, references: 32 },
        { id: "com-zagnanado", nom: "Zagnanado", alertes: 0, deces: 0, rma_deposes: 16, ascq_count: 17, consultations: 340, palu: 180, vad: 460, references: 28 },
      ],
    };
  }

  // 4. NIVEAU COMMUNAL (Commune de Ouinhi : Consolidation Tohouès + Dasso)
  return {
    total_alertes: 1,
    alertes_prioritaires: 1,
    alertes_non_investiguees: 0,
    delai_detection_heures: 2,
    total_deces: 1,
    deces_maternels: 0,
    deces_neonatals: 1,
    total_ascq: 2, // Tohouès + Dasso démonstration complète
    rma_deposes: 2,
    rma_retard: 0,
    rma_manquants: 0,
    taux_completude_rma: 100,
    total_vad: 30,
    total_causeries: 7,
    total_femmes_suivies: 28,
    total_enfants_suivis: 94,
    total_references: 14,
    consultations_stats: {
      total: 390,
      palu_tdr_pos: 215,
      diarrhee: 52,
      ira: 84,
      malnutrition: 9,
      autres: 30,
      referes: 14,
      pec: 376,
      moins_5ans: 320,
    },
    ventilation: [
      {
        id: DEMO_GEO.TOHOUES_ID,
        nom: "Tohouès (ASCQ Bruno DOSSOU)",
        alertes: 0,
        deces: 1,
        rma_deposes: 1,
        ascq_count: 1,
        consultations: 248,
        palu: 138,
        vad: 18,
        references: 9,
      },
      {
        id: DEMO_GEO.DASSO_ID,
        nom: "Dasso (ASCQ Gérard KPODANHO)",
        alertes: 1,
        deces: 0,
        rma_deposes: 1,
        ascq_count: 1,
        consultations: 142,
        palu: 77,
        vad: 12,
        references: 5,
      },
    ],
  };
}

// -----------------------------------------------------------------------------------------
// LISTE DES ASCQ DU TERRITOIRE AVEC STATUT DU RAPPORT DU MOIS
// -----------------------------------------------------------------------------------------

export function getDemoAscqListForScope(scopeLevel: string): any[] {
  if (scopeLevel === "NATIONAL") {
    return [
      {
        id: DEMO_GEO.BRUNO_ID,
        nom: "DOSSOU",
        prenoms: "Bruno",
        telephone: "+2290169031463",
        departement_nom: "Zou",
        commune_nom: "Ouinhi",
        arrondissement_nom: "Tohouès",
        nombre_relais: 11,
        statut_rapport: "DEPOSE",
        rapport_date_depot: "2026-11-01T08:30:00Z",
        source_financement: "LLF",
        consultations_count: 248,
        alertes_count: 0,
      },
      {
        id: "d0000000-0000-4000-a000-000000000007",
        nom: "KPODANHO",
        prenoms: "Gérard",
        telephone: "+2290199000007",
        departement_nom: "Zou",
        commune_nom: "Ouinhi",
        arrondissement_nom: "Dasso",
        nombre_relais: 3,
        statut_rapport: "DEPOSE",
        rapport_date_depot: "2026-11-01T09:15:00Z",
        source_financement: "LLF",
        consultations_count: 142,
        alertes_count: 1,
      },
      {
        id: "d0000000-0000-4000-a000-000000000010",
        nom: "DOSSOU-YOVO",
        prenoms: "Reine",
        telephone: "+2290199000010",
        departement_nom: "Littoral",
        commune_nom: "Cotonou",
        arrondissement_nom: "5ème Arrondissement",
        nombre_relais: 5,
        statut_rapport: "DEPOSE",
        rapport_date_depot: "2026-11-01T10:00:00Z",
        source_financement: "LLF",
        consultations_count: 195,
        alertes_count: 0,
      },
      {
        id: "ascq-nat-04",
        nom: "SOSSOU",
        prenoms: "Parfait",
        telephone: "+2290199000014",
        departement_nom: "Atlantique",
        commune_nom: "Allada",
        arrondissement_nom: "Allada Centre",
        nombre_relais: 6,
        statut_rapport: "DEPOSE",
        rapport_date_depot: "2026-11-02T07:45:00Z",
        source_financement: "LLF",
        consultations_count: 180,
        alertes_count: 0,
      },
      {
        id: "ascq-nat-05",
        nom: "BIO GUERA",
        prenoms: "Moumouni",
        telephone: "+2290199000015",
        departement_nom: "Borgou",
        commune_nom: "Parakou",
        arrondissement_nom: "1er Arrondissement",
        nombre_relais: 6,
        statut_rapport: "DEPOSE",
        rapport_date_depot: "2026-11-01T11:20:00Z",
        source_financement: "LLF",
        consultations_count: 210,
        alertes_count: 1,
      },
    ];
  }

  // Pour le Zou / CZO / Ouinhi
  return [
    {
      id: DEMO_GEO.BRUNO_ID,
      nom: "DOSSOU",
      prenoms: "Bruno",
      telephone: "+2290169031463",
      departement_nom: "Zou",
      commune_nom: "Ouinhi",
      arrondissement_nom: "Tohouès",
      nombre_relais: 11,
      statut_rapport: "DEPOSE",
      rapport_date_depot: "2026-11-01T08:30:00Z",
      source_financement: "LLF",
      consultations_count: 248,
      alertes_count: 0,
    },
    {
      id: "d0000000-0000-4000-a000-000000000007",
      nom: "KPODANHO",
      prenoms: "Gérard",
      telephone: "+2290199000007",
      departement_nom: "Zou",
      commune_nom: "Ouinhi",
      arrondissement_nom: "Dasso",
      nombre_relais: 3,
      statut_rapport: "DEPOSE",
      rapport_date_depot: "2026-11-01T09:15:00Z",
      source_financement: "LLF",
      consultations_count: 142,
      alertes_count: 1,
    },
  ];
}

// -----------------------------------------------------------------------------------------
// FICHES DU REGISTRE DU TERRITOIRE (ALERTES SIMR, DÉCÈS, RMA)
// -----------------------------------------------------------------------------------------

export function getDemoFichesForScope(): any[] {
  return [
    {
      id: "fiche-demo-01",
      table: "alertes_communautaires",
      type_label: "Alerte SIMR",
      numero: "ALR-2026-DASSO-001",
      date_fiche: "2026-10-30",
      titre: "Suspicion de Choléra (2 cas suspects)",
      arrondissement_nom: "Dasso",
      village_nom: "Dasso Centre",
      notificateur_nom_complet: "Mathias SOSSOU (RC)",
      ascq_nom: "Gérard KPODANHO",
      statut: "VERIFIEE",
      resultat_verification: "AVEREE",
      est_prioritaire: true,
      mesures_prises: "Isolation des malades, chloration des puits, référence d'urgence au CSC Ouinhi",
      created_at: "2026-10-30T10:00:00Z",
    },
    {
      id: "fiche-demo-02",
      table: "deces_communautaires",
      type_label: "Décès Communautaire",
      numero: "DEC-2026-TOHOUES-001",
      date_fiche: "2026-10-28",
      titre: "Décès néonatal à domicile (4 jours de vie)",
      arrondissement_nom: "Tohouès",
      village_nom: "Tohouès Centre",
      notificateur_nom_complet: "Bruno DOSSOU (ASCQ)",
      ascq_nom: "Bruno DOSSOU",
      statut: "VALIDE",
      est_prioritaire: true,
      mesures_prises: "Investigation néonatale réalisée, sensibilisation de la famille sur les signes de danger",
      created_at: "2026-10-28T14:20:00Z",
    },
    {
      id: "fiche-demo-03",
      table: "rapports_mensuels_ascq",
      type_label: "Rapport Mensuel RMA",
      numero: "RMA-2026-10-TOHOUES",
      date_fiche: "2026-11-01",
      titre: "RMA Mensuel Octobre 2026 - Tohouès",
      arrondissement_nom: "Tohouès",
      village_nom: "11 villages couverts",
      notificateur_nom_complet: "Bruno DOSSOU (ASCQ)",
      ascq_nom: "Bruno DOSSOU",
      statut: "DEPOSE",
      est_prioritaire: false,
      mesures_prises: "248 consultations iCCM, 18 VAD, 0 décès maternel, 100% de complétude",
      created_at: "2026-11-01T08:30:00Z",
    },
    {
      id: "fiche-demo-04",
      table: "rapports_mensuels_ascq",
      type_label: "Rapport Mensuel RMA",
      numero: "RMA-2026-10-DASSO",
      date_fiche: "2026-11-01",
      titre: "RMA Mensuel Octobre 2026 - Dasso",
      arrondissement_nom: "Dasso",
      village_nom: "3 villages couverts",
      notificateur_nom_complet: "Gérard KPODANHO (ASCQ)",
      ascq_nom: "Gérard KPODANHO",
      statut: "DEPOSE",
      est_prioritaire: false,
      mesures_prises: "142 consultations iCCM, 12 VAD, 1 alerte choléra investiguée",
      created_at: "2026-11-01T09:15:00Z",
    },
  ];
}

// -----------------------------------------------------------------------------------------
// RELAIS COMMUNAUTAIRES PAR ASCQ (3 POUR DASSO, 11 POUR BRUNO TOHOUÈS)
// -----------------------------------------------------------------------------------------

export function getDemoRelaisForAscq(ascqId: string): any[] {
  if (ascqId === "d0000000-0000-4000-a000-000000000007") {
    // Dasso : 3 RC fictifs
    return [
      {
        id: "rc-dasso-01",
        nom: "SOSSOU",
        prenoms: "Mathias",
        telephone: "+2290199010001",
        village_nom: "Dasso Centre",
        grappe: 1,
        statut: "ACTIF",
        actif: true,
        code_temporaire_utilise: true,
        created_at: "2026-10-01T08:00:00Z",
      },
      {
        id: "rc-dasso-02",
        nom: "HOUNHOUI",
        prenoms: "Béatrice",
        telephone: "+2290199010002",
        village_nom: "Gbèkô",
        grappe: 2,
        statut: "ACTIF",
        actif: true,
        code_temporaire_utilise: true,
        created_at: "2026-10-01T08:00:00Z",
      },
      {
        id: "rc-dasso-03",
        nom: "HOUNWANOU",
        prenoms: "Cosme",
        telephone: "+2290199010003",
        village_nom: "Ahito",
        grappe: 1,
        statut: "ACTIF",
        actif: true,
        code_temporaire_utilise: true,
        created_at: "2026-10-01T08:00:00Z",
      },
    ];
  }

  // Pour Bruno Tohouès : ses 11 Relais enregistrés
  return [
    { id: "rc-bruno-01", nom: "DOSSOU", prenoms: "Barthélémy", telephone: "+2290161000001", village_nom: "Tohouès Centre", grappe: 1, statut: "ACTIF", actif: true, code_temporaire_utilise: true },
    { id: "rc-bruno-02", nom: "AGBODJOGBE", prenoms: "Colette", telephone: "+2290161000002", village_nom: "KpédékPO", grappe: 1, statut: "ACTIF", actif: true, code_temporaire_utilise: true },
    { id: "rc-bruno-03", nom: "HOUNSOU", prenoms: "Michel", telephone: "+2290161000003", village_nom: "Zounmè", grappe: 2, statut: "ACTIF", actif: true, code_temporaire_utilise: true },
    { id: "rc-bruno-04", nom: "ADIMI", prenoms: "Sophie", telephone: "+2290161000004", village_nom: "Gbécon", grappe: 2, statut: "ACTIF", actif: true, code_temporaire_utilise: true },
    { id: "rc-bruno-05", nom: "KPATINVO", prenoms: "Éric", telephone: "+2290161000005", village_nom: "Avlamè", grappe: 3, statut: "ACTIF", actif: true, code_temporaire_utilise: true },
    { id: "rc-bruno-06", nom: "TOSSOU", prenoms: "Justine", telephone: "+2290161000006", village_nom: "Dénou", grappe: 3, statut: "ACTIF", actif: true, code_temporaire_utilise: true },
    { id: "rc-bruno-07", nom: "HOUNGBO", prenoms: "David", telephone: "+2290161000007", village_nom: "Adingnindo", grappe: 4, statut: "ACTIF", actif: true, code_temporaire_utilise: true },
    { id: "rc-bruno-08", nom: "ZANNOU", prenoms: "Félicité", telephone: "+2290161000008", village_nom: "Hlassamè", grappe: 4, statut: "ACTIF", actif: true, code_temporaire_utilise: true },
    { id: "rc-bruno-09", nom: "AÏSSO", prenoms: "Gaston", telephone: "+2290161000009", village_nom: "Kpodji", grappe: 5, statut: "ACTIF", actif: true, code_temporaire_utilise: true },
    { id: "rc-bruno-10", nom: "NOUATIN", prenoms: "Monique", telephone: "+2290161000010", village_nom: "Sèkè", grappe: 5, statut: "ACTIF", actif: true, code_temporaire_utilise: true },
    { id: "rc-bruno-11", nom: "GBEDJI", prenoms: "Paul", telephone: "+2290161000011", village_nom: "Womè", grappe: 6, statut: "ACTIF", actif: true, code_temporaire_utilise: true },
  ];
}
