/**
 * Moteur de surveillance épidémiologique et gestion des fiches
 * Système officiel ASCQ Bénin - Norme Ministère de la Santé
 */

export interface TypeAlerteRef {
  code: number;
  nom: string;
  description: string;
  estPrioritaire: boolean;
  concerneAnimaux: boolean;
}

export interface SymptomeRef {
  code: number;
  nom: string;
  categorie: "GENERAL" | "CUTANE" | "DIGESTIF" | "NEUROLOGIQUE" | "HEMORRAGIQUE" | "RESPIRATOIRE" | "URINAIRE" | "AUTRE";
}

// 20 types d'alertes officiels (Section 6.3 & Décret national)
export const TYPES_ALERTES_OFFICIELS: TypeAlerteRef[] = [
  { code: 1, nom: "Rougeole", description: "Fièvre avec éruption cutanée généralisée et boutons rouges", estPrioritaire: true, concerneAnimaux: false },
  { code: 2, nom: "Choléra", description: "Diarrhée aqueuse profuse soudaine avec déshydratation rapide", estPrioritaire: true, concerneAnimaux: false },
  { code: 3, nom: "Méningite", description: "Fièvre brutale avec raideur de la nuque, maux de tête intenses ou vomissements", estPrioritaire: true, concerneAnimaux: false },
  { code: 4, nom: "PFA - Paralysie Flasque Aiguë", description: "Faiblesse ou paralysie musculaire brutale d'un membre sans traumatisme (suspicion poliomyélite)", estPrioritaire: true, concerneAnimaux: false },
  { code: 5, nom: "FHV Lassa (Fièvre Hémorragique)", description: "Fièvre persistante ne répondant pas aux antipaludiques avec maux de gorge, douleurs musculaires ou saignements", estPrioritaire: true, concerneAnimaux: false },
  { code: 6, nom: "FHV Ebola", description: "Fièvre aiguë avec fatigue extrême et manifestations hémorragiques", estPrioritaire: true, concerneAnimaux: false },
  { code: 7, nom: "Fièvre Jaune", description: "Fièvre avec jaunisse (yeux jaunes) apparaissant dans les 14 jours", estPrioritaire: true, concerneAnimaux: false },
  { code: 8, nom: "Dengue", description: "Fièvre élevée soudaine avec douleurs rétro-orbitaires et courbatures intenses", estPrioritaire: false, concerneAnimaux: false },
  { code: 9, nom: "Anthrax / Charbon bactéridien", description: "Lésion cutanée noirâtre avec œdème ou détresse respiratoire après contact animal", estPrioritaire: false, concerneAnimaux: true },
  { code: 10, nom: "Shigellose / Dysenterie bacillaire", description: "Diarrhée avec présence visible de sang et de glaires, douleurs abdominales", estPrioritaire: false, concerneAnimaux: false },
  { code: 11, nom: "Grippe Aviaire", description: "Signes grippaux sévères après exposition à des volailles malades ou mortes", estPrioritaire: false, concerneAnimaux: true },
  { code: 12, nom: "Rage humaine", description: "Troubles du comportement, hydrophobie (peur de l'eau) suite à morsure animale", estPrioritaire: true, concerneAnimaux: true },
  { code: 13, nom: "COVID-19", description: "Fièvre, toux sèche, perte du goût ou de l'odorat, difficultés respiratoires", estPrioritaire: false, concerneAnimaux: false },
  { code: 14, nom: "Mpox (Variole du singe)", description: "Éruption vésiculeuse ou pustuleuse avec ganglions enflés et fièvre", estPrioritaire: false, concerneAnimaux: false },
  { code: 15, nom: "Morsure de chien", description: "Morsure ou griffure par un canidé suspect de rage", estPrioritaire: false, concerneAnimaux: true },
  { code: 16, nom: "Morsure de serpent", description: "Envenimation suite à une morsure de reptile", estPrioritaire: false, concerneAnimaux: false },
  { code: 17, nom: "Morsure d'autres animaux", description: "Morsure par chat, singe ou autre animal sauvage ou domestique", estPrioritaire: false, concerneAnimaux: true },
  { code: 18, nom: "Épizootie / Animaux malades", description: "Nombre inhabituel d'animaux présentant des signes pathologiques", estPrioritaire: false, concerneAnimaux: true },
  { code: 19, nom: "Mortalité inhabituelle d'animaux", description: "Découverte de cadavres groupés d'animaux sauvages ou domestiques", estPrioritaire: false, concerneAnimaux: true },
  { code: 20, nom: "Autre événement inhabituel", description: "Tout phénomène anormal de santé communautaire à préciser", estPrioritaire: false, concerneAnimaux: false },
];

// ---------------------------------------------------------------------
// 15 TYPES DU REGISTRE COMMUNAUTAIRE (Section 6.2)
// ---------------------------------------------------------------------
export interface RegistreTypeRef {
  code: number;
  nom: string;
  categorie: "SIGNAL" | "DECES";
}

export const REGISTRE_TYPES_OFFICIELS: RegistreTypeRef[] = [
  { code: 1, nom: "Fièvre ou notion de fièvre", categorie: "SIGNAL" },
  { code: 2, nom: "Éruption cutanée", categorie: "SIGNAL" },
  { code: 3, nom: "Diarrhée", categorie: "SIGNAL" },
  { code: 4, nom: "Raideur de la nuque", categorie: "SIGNAL" },
  { code: 5, nom: "Paralysie flasque aiguë (PFA)", categorie: "SIGNAL" },
  { code: 6, nom: "Saignements inexpliqués", categorie: "SIGNAL" },
  { code: 7, nom: "Yeux jaunes", categorie: "SIGNAL" },
  { code: 8, nom: "Vomissements importants", categorie: "SIGNAL" },
  { code: 9, nom: "Douleurs abdominales", categorie: "SIGNAL" },
  { code: 10, nom: "Décès néonatal (0-28 jours)", categorie: "DECES" },
  { code: 11, nom: "Décès infantile (< 1 an, néonatals inclus)", categorie: "DECES" },
  { code: 12, nom: "Décès infanto-juvénile (0-5 ans)", categorie: "DECES" },
  { code: 13, nom: "Décès maternel", categorie: "DECES" },
  { code: 14, nom: "Décès ≥ 5 ans, sauf décès maternel", categorie: "DECES" },
  { code: 15, nom: "Autres (à préciser)", categorie: "SIGNAL" },
];

// ---------------------------------------------------------------------
// DÉCÈS COMMUNAUTAIRES (Section 6.4)
// ---------------------------------------------------------------------
export const DECES_TYPES_OFFICIELS = [
  { code: 1, nom: "Décès maternel", description: "Pendant la grossesse, lors de l'accouchement ou dans les 42 jours après" },
  { code: 2, nom: "Bébé de 0 à 28 jours", description: "Décès néonatal précoce ou tardif" },
  { code: 3, nom: "Enfant de 1 mois à moins d'1 an", description: "Décès infantile post-néonatal" },
  { code: 4, nom: "Enfant de 1 à 5 ans", description: "Décès infanto-juvénile" },
  { code: 5, nom: "Personne de plus de 5 ans", description: "Décès de tout individu âgé de 5 ans et plus (hors décès maternel)" },
];

export const DECES_LIEUX_OFFICIELS = [
  { code: 1, nom: "Centre de santé" },
  { code: 2, nom: "Domicile" },
  { code: 3, nom: "Accoucheuse traditionnelle" },
  { code: 4, nom: "Lieu de culte" },
  { code: 5, nom: "Au cours du transport" },
  { code: 6, nom: "À l'étranger (avec rapatriement du corps au Bénin)" },
  { code: 7, nom: "Autres lieux" },
];

export const DECES_CIRCONSTANCES_OFFICIELLES = [
  { code: 1, nom: "Grossesse / Avortement / Accouchement / Suites de couches" },
  { code: 2, nom: "Maladie" },
  { code: 3, nom: "Accident de la voie publique" },
  { code: 4, nom: "Accident domestique" },
  { code: 5, nom: "Mort subite" },
  { code: 6, nom: "Violence (agression, arme à feu, suicide...)" },
  { code: 7, nom: "Autres circonstances" },
];

/**
 * Règle de correspondance officielle (Section 6.4) :
 * Détermine automatiquement le type de décès selon l'âge
 */
export function calculerTypeDecesParAge(
  ageValeur: number,
  ageUnite: "JOURS" | "MOIS" | "ANS",
  estDecesMaternel: boolean = false
): number {
  if (estDecesMaternel) return 1;

  if (ageUnite === "JOURS") {
    if (ageValeur <= 28) return 2; // Bébé de 0 à 28 jours
    return 3; // 29 jours à < 1 an
  }

  if (ageUnite === "MOIS") {
    if (ageValeur < 12) return 3; // Enfant de 1 mois à moins d'1 an
    if (ageValeur <= 60) return 4; // 1 à 5 ans
    return 5;
  }

  // ANS
  if (ageValeur < 1) return 3;
  if (ageValeur <= 5) return 4; // Enfant de 1 à 5 ans
  return 5; // Plus de 5 ans
}

/**
 * Calcule les dates de début (lundi) et fin (dimanche) d'une semaine épidémiologique
 */
export function calculerDatesSemaine(annee: number, semaine: number): { dateDebut: string; dateFin: string } {
  // Trouver le premier jeudi de l'année
  const firstThursday = new Date(Date.UTC(annee, 0, 4));
  const day = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - day);

  // Le lundi de la semaine ISO 1
  const firstMonday = new Date(firstThursday.getTime());
  firstMonday.setUTCDate(firstMonday.getUTCDate() - 3);

  // Le lundi de la semaine demandée
  const targetMonday = new Date(firstMonday.getTime() + (semaine - 1) * 7 * 86400000);
  const targetSunday = new Date(targetMonday.getTime() + 6 * 86400000);

  return {
    dateDebut: targetMonday.toISOString().split("T")[0],
    dateFin: targetSunday.toISOString().split("T")[0],
  };
}

export const SYMPTOMES_OFFICIELS: SymptomeRef[] = [
  { code: 1, nom: "Fièvre", categorie: "GENERAL" },
  { code: 2, nom: "Boutons sur le corps / Éruption cutanée", categorie: "CUTANE" },
  { code: 3, nom: "Diarrhée aqueuse", categorie: "DIGESTIF" },
  { code: 4, nom: "Vomissements", categorie: "DIGESTIF" },
  { code: 5, nom: "Selles avec du sang", categorie: "DIGESTIF" },
  { code: 6, nom: "Maux de tête intenses", categorie: "NEUROLOGIQUE" },
  { code: 7, nom: "Saignements inexpliqués (nez, gencives, peau)", categorie: "HEMORRAGIQUE" },
  { code: 8, nom: "Raideur de la nuque", categorie: "NEUROLOGIQUE" },
  { code: 9, nom: "Altération de la conscience / Somnolence", categorie: "NEUROLOGIQUE" },
  { code: 10, nom: "Bombement de la fontanelle (nourrisson)", categorie: "NEUROLOGIQUE" },
  { code: 11, nom: "Peur de la lumière (photophobie)", categorie: "NEUROLOGIQUE" },
  { code: 12, nom: "Peur de l'eau ou des bruits d'eau (hydrophobie)", categorie: "NEUROLOGIQUE" },
  { code: 13, nom: "Convulsions", categorie: "NEUROLOGIQUE" },
  { code: 14, nom: "Yeux jaunes / Ictère", categorie: "GENERAL" },
  { code: 15, nom: "Fatigue intense / Faiblesse extrême", categorie: "GENERAL" },
  { code: 16, nom: "Nausées", categorie: "DIGESTIF" },
  { code: 17, nom: "Maux de gorge", categorie: "RESPIRATOIRE" },
  { code: 18, nom: "Toux", categorie: "RESPIRATOIRE" },
  { code: 19, nom: "Douleurs abdominales", categorie: "DIGESTIF" },
  { code: 20, nom: "Manque d'appétit / Refus de téter", categorie: "GENERAL" },
  { code: 21, nom: "Paralysie ou difficulté brutale à marcher", categorie: "NEUROLOGIQUE" },
  { code: 22, nom: "Courbatures ou fatigues musculaires", categorie: "GENERAL" },
  { code: 23, nom: "Douleurs musculaires ou articulaires", categorie: "GENERAL" },
  { code: 24, nom: "Présence de sang dans les urines", categorie: "URINAIRE" },
  { code: 25, nom: "Irritabilité ou agressivité inhabituelle", categorie: "NEUROLOGIQUE" },
  { code: 26, nom: "Gonflement des ganglions lymphatiques", categorie: "GENERAL" },
  { code: 27, nom: "Crachats teintés de sang", categorie: "RESPIRATOIRE" },
  { code: 28, nom: "Lésions cutanées / Ulcères", categorie: "CUTANE" },
  { code: 29, nom: "Difficultés respiratoires / Essoufflement", categorie: "RESPIRATOIRE" },
  { code: 30, nom: "Autres symptômes à préciser", categorie: "AUTRE" },
];

/**
 * Calcule la semaine épidémiologique selon la norme officielle du Ministère de la Santé du Bénin
 * La semaine épidémiologique commence strictement le LUNDI (Norme ISO 8601).
 */
export function getEpidemiologicalWeek(inputDate?: Date | string): {
  annee: number;
  semaine: number;
  mois: number;
} {
  const d = inputDate ? new Date(inputDate) : new Date();
  
  // Date UTC pour éviter les décalages de fuseau
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  
  // Le jour de la semaine (0 = dimanche, 1 = lundi, ..., 6 = samedi)
  // En ISO 8601, le lundi est le jour 1, dimanche le jour 7
  const dayNr = (target.getUTCDay() + 6) % 7;
  
  // Ajuster pour viser le jeudi de la semaine actuelle
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  
  // Le premier jeudi de l'année ISO
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  
  // Calcul du numéro de semaine
  const weekNumber = 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
  const isoYear = new Date(firstThursday).getUTCFullYear();
  const month = d.getMonth() + 1;

  return {
    annee: isoYear,
    semaine: weekNumber,
    mois: month,
  };
}

/**
 * Calcule le délai détection -> notification en heures décimales
 */
export function calculateHoursDelay(
  dateDetection: string,
  heureDetection?: string,
  dateNotification?: string,
  heureNotification?: string
): number {
  if (!dateDetection) return 0;
  
  const notifDateStr = dateNotification || new Date().toISOString().split("T")[0];
  const notifTimeStr = heureNotification || "12:00";
  const detTimeStr = heureDetection || "12:00";
  
  const dtDetection = new Date(`${dateDetection}T${detTimeStr}:00`);
  const dtNotification = new Date(`${notifDateStr}T${notifTimeStr}:00`);
  
  const diffMs = dtNotification.getTime() - dtDetection.getTime();
  if (diffMs <= 0) return 0;
  
  return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
}

// ---------------------------------------------------------------------
// Nettoyage et correction des encodages (mojibake)
// ---------------------------------------------------------------------

/**
 * Corrige les problèmes d'encodage (mojibake : CholÃ©ra -> Choléra, FiÃ¨vre -> Fièvre)
 */
export function corrigerAccents(texte?: string | null): string {
  if (!texte) return "";
  let clean = texte;
  try {
    if (/[\u00C2\u00C3]/.test(clean)) {
      clean = decodeURIComponent(escape(clean));
    }
  } catch {
    // Si decodeURIComponent échoue, on continue avec les remplacements ciblés
  }
  return clean
    .replace(/Ã©/g, "é")
    .replace(/Ã¨/g, "è")
    .replace(/Ãª/g, "ê")
    .replace(/Ã«/g, "ë")
    .replace(/Ã /g, "à")
    .replace(/Ã¢/g, "â")
    .replace(/Ã®/g, "î")
    .replace(/Ã¯/g, "ï")
    .replace(/Ã´/g, "ô")
    .replace(/Ã¹/g, "ù")
    .replace(/Ã»/g, "û")
    .replace(/Ã§/g, "ç")
    .replace(/Ã‰/g, "É")
    .replace(/Ã%/g, "É")
    .replace(/Ãˆ/g, "È")
    .replace(/ÃŠ/g, "Ê")
    .replace(/Ã€/g, "À")
    .replace(/Ã‚/g, "Â")
    .replace(/Ã”/g, "Ô");
}

export function getNomTypeAlerte(code: number, fallback?: string): string {
  const found = TYPES_ALERTES_OFFICIELS.find((t) => t.code === code);
  if (found) return found.nom;
  return corrigerAccents(fallback) || `Type ${code}`;
}

export function getNomSymptome(code: number, fallback?: string): string {
  const found = SYMPTOMES_OFFICIELS.find((s) => s.code === code);
  if (found) return found.nom;
  return corrigerAccents(fallback) || `Symptôme ${code}`;
}

// ---------------------------------------------------------------------
// Gestion des brouillons hors-ligne (localStorage)
// ---------------------------------------------------------------------
const STORAGE_BROUILLONS_ALERTES_KEY = "ascq_brouillons_alertes_v1";

export interface BrouillonAlerte {
  localId: string;
  savedAt: string;
  data: any;
}

export function sauvegarderBrouillonAlerte(data: any): string {
  if (typeof window === "undefined") return "";
  try {
    const localId = data.localId || `draft_${Date.now()}`;
    const payload: BrouillonAlerte = {
      localId,
      savedAt: new Date().toISOString(),
      data: { ...data, localId },
    };
    
    const existing = recupererBrouillonsAlertes();
    const filtered = existing.filter((b) => b.localId !== localId);
    filtered.unshift(payload);
    
    localStorage.setItem(STORAGE_BROUILLONS_ALERTES_KEY, JSON.stringify(filtered));
    return localId;
  } catch (err) {
    console.error("Erreur sauvegarde brouillon alerte:", err);
    return "";
  }
}

export function recupererBrouillonsAlertes(): BrouillonAlerte[] {
  if (typeof window === "undefined") return [];
  try {
    const str = localStorage.getItem(STORAGE_BROUILLONS_ALERTES_KEY);
    return str ? JSON.parse(str) : [];
  } catch {
    return [];
  }
}

export function supprimerBrouillonAlerte(localId: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = recupererBrouillonsAlertes();
    const filtered = existing.filter((b) => b.localId !== localId);
    localStorage.setItem(STORAGE_BROUILLONS_ALERTES_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Erreur suppression brouillon:", err);
  }
}

// ---------------------------------------------------------------------
// RÉFÉRENTIELS OFFICIELS : RÉFÉRENCES COMMUNAUTAIRES (SANTÉ & GUPS)
// ---------------------------------------------------------------------

export interface MotifReferenceRef {
  code: string;
  nom: string;
  description: string;
  urgence: "NORMALE" | "URGENTE" | "EVACUATION_IMMEDIATE";
  oneHealth?: boolean;
}

export const MOTIFS_REFERENCES_SANTE: MotifReferenceRef[] = [
  { code: "PALU_GRAVE", nom: "Paludisme grave / Fièvre persistante", description: "Fièvre élevée avec léthargie, convulsions ou refus de s'alimenter", urgence: "URGENTE", oneHealth: false },
  { code: "DIARRHEE_SEV", nom: "Diarrhée aiguë avec déshydratation sévère", description: "Selles liquides abondantes, pli cutané persistant, yeux enfoncés", urgence: "URGENTE", oneHealth: false },
  { code: "IRA_PNEUMO", nom: "Infection Respiratoire Aiguë / Suspicion Pneumonie", description: "Toux avec tirage sous-costal et respiration rapide sifflante", urgence: "URGENTE", oneHealth: false },
  { code: "MALNUTRITION", nom: "Malnutrition aiguë sévère (MAS)", description: "Émaciement visible extrême, œdèmes bilatéraux des membres inférieurs", urgence: "NORMALE", oneHealth: false },
  { code: "GROSSESSE_DANGER", nom: "Femme enceinte : Signes de danger / Travail", description: "Saignement vaginal, maux de tête violents, fièvre, début de travail", urgence: "EVACUATION_IMMEDIATE", oneHealth: false },
  { code: "NOUVEAU_NE", nom: "Nouveau-né malade / Danger néonatal", description: "Refus de téter, léthargie, hypothermie ou coloration anormale", urgence: "EVACUATION_IMMEDIATE", oneHealth: false },
  { code: "MORSURE_RAGE", nom: "Morsure de chien / Suspicion Rage", description: "Morsure ou griffure par un animal suspect (protocole post-exposition)", urgence: "URGENTE", oneHealth: true },
  { code: "MORSURE_SERPENT", nom: "Morsure de serpent / Piqûre vénimeuse", description: "Envenimation nécessitant l'administration rapide de sérum", urgence: "EVACUATION_IMMEDIATE", oneHealth: false },
  { code: "TRAUMATISME", nom: "Traumatisme / Accident / Brûlure grave", description: "Plaie profonde, fracture suspectée, hémorragie ou brûlure étendue", urgence: "EVACUATION_IMMEDIATE", oneHealth: false },
  { code: "AUTRE_SANTE", nom: "Autre problème de santé nécessitant un avis médical", description: "Toute autre affection requérant un diagnostic au Centre de Santé", urgence: "NORMALE", oneHealth: false },
];

export const MOTIFS_REFERENCES_GUPS: MotifReferenceRef[] = [
  { code: "VBG_VIOLENCE", nom: "Violences Basées sur le Genre (VBG) / Violences conjugales", description: "Femme ou fille victime d'agression physique, sexuelle ou psychologique", urgence: "URGENTE" },
  { code: "MALTRAITANCE_ENFANT", nom: "Protection de l'enfant : Maltraitance / Travail forcé", description: "Enfant exploité, battu, non scolarisé ou en détresse manifeste", urgence: "URGENTE" },
  { code: "ENFANT_RUE_ABANDON", nom: "Enfant abandonné / Enfant en situation de rue", description: "Mineur sans tuteur légal, orphelin non pris en charge dans la communauté", urgence: "URGENTE" },
  { code: "HANDICAP_VULNERABLE", nom: "Personne en situation de handicap sans assistance", description: "Incapacité sévère sans soutien familial ni matériel adapté", urgence: "NORMALE" },
  { code: "EXTREME_INDIGENCE", nom: "Extrême indigence / Famine / Précarité absolue", description: "Famille incapable de subvenir aux besoins minimaux de nutrition et de survie", urgence: "NORMALE" },
  { code: "GROSSESSE_PRECOCE", nom: "Grossesse précoce non accompagnée / Fille-mère rejetée", description: "Adolescente enceinte isolée sans soutien social ni prise en charge", urgence: "NORMALE" },
  { code: "PERSONNE_AGEE", nom: "Personne âgée isolée en grande détresse", description: "Aîné sans soutien familial vivant dans des conditions d'abandon", urgence: "NORMALE" },
  { code: "RUPTURE_SOINS_SOCIAL", nom: "Rupture de soins vitaux pour motif économique", description: "Malade chronique ou enfant indigent privé de soins par manque de moyens", urgence: "URGENTE" },
  { code: "AUTRE_GUPS", nom: "Autre vulnérabilité sociale relevant du GUPS", description: "Cas social spécifique nécessitant l'appui de l'Assistant Social communal", urgence: "NORMALE" },
];

export const ONE_HEALTH_SECTEURS = [
  { code: "SANTE_HUMAINE", nom: "Santé Humaine", icone: "🧑‍⚕️", description: "Affections communautaires et maladies humaines transmissibles" },
  { code: "SANTE_ANIMALE_ZOONOSE", nom: "Santé Animale & Zoonoses", icone: "🐾", description: "Maladies transmissibles de l'animal à l'homme (rage, charbon, grippe aviaire)" },
  { code: "ENVIRONNEMENT_EAU_SALUBRITE", nom: "Santé Environnementale", icone: "🌿", description: "Points d'eau souillés, décharges, inondations et insalubrité" },
];

