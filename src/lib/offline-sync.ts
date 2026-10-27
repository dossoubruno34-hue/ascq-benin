/**
 * MOTEUR DE GESTION DU MODE HORS-LIGNE & SYNCHRONISATION ASCQ BÉNIN
 * Permet aux ASCQ et RC de continuer à saisir des alertes, registres et décès
 * même sans aucune connexion internet (zones rurales blanches).
 */

const STORAGE_KEYS = {
  ALERTES_QUEUE: "ascq_offline_queue_alertes_v1",
  REGISTRES_QUEUE: "ascq_offline_queue_registres_v1",
  DECES_QUEUE: "ascq_offline_queue_deces_v1",
  RAPPORT_DRAFT: "ascq_offline_draft_rapport_mensuel_v1",
};

export interface OfflineItem<T = any> {
  id: string;
  type: "ALERTE" | "REGISTRE" | "DECES" | "RAPPORT";
  timestamp: string;
  data: T;
  retryCount: number;
  synced: boolean;
}

// 1. Détection de connectivité
export function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

// 2. Sauvegarde en file d'attente hors-ligne (LocalStorage sécurisé avec structure normalisée)
export function enqueueOfflineItem<T>(type: "ALERTE" | "REGISTRE" | "DECES", data: T): OfflineItem<T> {
  const item: OfflineItem<T> = {
    id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    timestamp: new Date().toISOString(),
    data,
    retryCount: 0,
    synced: false,
  };

  if (typeof window === "undefined") return item;

  const key = type === "ALERTE" 
    ? STORAGE_KEYS.ALERTES_QUEUE 
    : type === "REGISTRE" 
    ? STORAGE_KEYS.REGISTRES_QUEUE 
    : STORAGE_KEYS.DECES_QUEUE;

  try {
    const existingStr = localStorage.getItem(key);
    const list: OfflineItem<T>[] = existingStr ? JSON.parse(existingStr) : [];
    list.unshift(item);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    console.error("Erreur mise en file d'attente hors-ligne:", err);
  }

  return item;
}

// 3. Récupération des éléments en attente de synchronisation
export function getOfflineQueueCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const alertes = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALERTES_QUEUE) || "[]").length;
    const registres = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRES_QUEUE) || "[]").length;
    const deces = JSON.parse(localStorage.getItem(STORAGE_KEYS.DECES_QUEUE) || "[]").length;
    return alertes + registres + deces;
  } catch {
    return 0;
  }
}

// 4. Sauvegarde automatique du brouillon du rapport mensuel (anti-perte de données)
export function sauvegarderBrouillonRapport(mois: number, annee: number, data: any): void {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      mois,
      annee,
      savedAt: new Date().toISOString(),
      data,
    };
    localStorage.setItem(`${STORAGE_KEYS.RAPPORT_DRAFT}_${annee}_${mois}`, JSON.stringify(payload));
  } catch (e) {
    console.warn("Échec sauvegarde locale rapport:", e);
  }
}

export function chargerBrouillonRapport(mois: number, annee: number): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.RAPPORT_DRAFT}_${annee}_${mois}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data;
  } catch {
    return null;
  }
}
