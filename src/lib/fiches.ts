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

// 30 symptômes officiels (Section 6.3)
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
