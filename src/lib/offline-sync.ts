/**
 * MOTEUR DE GESTION DU MODE HORS-LIGNE & SYNCHRONISATION ASCQ BÉNIN
 * Permet aux ASCQ et RC de continuer à ouvrir l'application et travailler à 100%
 * sans aucune connexion internet (zones rurales blanches).
 */

import { supabase } from "./supabase";

export const STORAGE_KEYS = {
  USER_SESSION_CACHE: "ascq_offline_session_cache_v2",
  USER_PROFILE_CACHE: "ascq_offline_profile_cache_v2",
  MON_ESPACE_CACHE: "ascq_offline_mon_espace_v2",
  RC_SPACE_CACHE: "ascq_offline_rc_space_v2",
  GEO_CACHE: "ascq_offline_geo_referentiel_v1",
  
  ALERTES_QUEUE: "ascq_offline_queue_alertes_v1",
  REGISTRES_QUEUE: "ascq_offline_queue_registres_v1",
  DECES_QUEUE: "ascq_offline_queue_deces_v1",
  REFERENCES_QUEUE: "ascq_offline_queue_references_v1",
  CONSULTATIONS_QUEUE: "ascq_offline_queue_consultations_v1",
  PLANNING_QUEUE: "ascq_offline_queue_planning_v1",
  
  RAPPORT_DRAFT: "ascq_offline_draft_rapport_mensuel_v1",
  RAPPORT_HEBDO_DRAFT: "ascq_offline_draft_rapport_hebdo_v1",
  INVENTAIRE_DRAFT: "ascq_offline_inventaire_draft_v1"
};

export interface OfflineItem<T = any> {
  id: string;
  type: "ALERTE" | "REGISTRE" | "DECES" | "REFERENCE" | "CONSULTATION" | "PLANNING" | "RAPPORT";
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

// 2. Gestion du profil et de la session utilisateur en mode hors-ligne
export function saveCachedUserSession(user: any, profile: any): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER_SESSION_CACHE, JSON.stringify(user));
    }
    if (profile) {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE_CACHE, JSON.stringify(profile));
    }
  } catch (e) {
    console.warn("Échec mise en cache session utilisateur :", e);
  }
}

export function getCachedUserSession(): { user: any | null; profile: any | null } {
  if (typeof window === "undefined") return { user: null, profile: null };
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER_SESSION_CACHE);
    const profStr = localStorage.getItem(STORAGE_KEYS.USER_PROFILE_CACHE);
    return {
      user: userStr ? JSON.parse(userStr) : null,
      profile: profStr ? JSON.parse(profStr) : null,
    };
  } catch (e) {
    return { user: null, profile: null };
  }
}

export function saveCachedMonEspace(data: any): void {
  if (typeof window === "undefined" || !data) return;
  try {
    localStorage.setItem(STORAGE_KEYS.MON_ESPACE_CACHE, JSON.stringify({
      data,
      savedAt: new Date().toISOString()
    }));
  } catch (e) {
    console.warn("Échec cache Mon Espace:", e);
  }
}

export function getCachedMonEspace(): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MON_ESPACE_CACHE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data || null;
  } catch {
    return null;
  }
}

export function saveCachedRcSpace(data: any): void {
  if (typeof window === "undefined" || !data) return;
  try {
    localStorage.setItem(STORAGE_KEYS.RC_SPACE_CACHE, JSON.stringify({
      data,
      savedAt: new Date().toISOString()
    }));
  } catch (e) {
    console.warn("Échec cache Espace RC:", e);
  }
}

export function getCachedRcSpace(): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RC_SPACE_CACHE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data || null;
  } catch {
    return null;
  }
}

// 3. Authentification résiliente sans blocage hors-ligne
export async function getEffectiveUser(): Promise<{ user: any | null; profile: any | null }> {
  if (typeof window === "undefined") return { user: null, profile: null };
  
  const cached = getCachedUserSession();

  // Si l'appareil est hors-ligne, retourner immédiatement le cache local sans faire de requête réseau
  if (!navigator.onLine) {
    return cached;
  }

  try {
    // 1. Lire la session locale Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      // Si aucune session active Supabase mais qu'on a du cache valide
      return cached;
    }

    const user = session.user;

    // 2. Tenter de rafraîchir le profil depuis Supabase
    try {
      const { data: profil } = await supabase
        .from("utilisateurs")
        .select("id, telephone, nom, prenoms, poste, poste_autre, role_technique, statut_compte, departement_id, zone_sanitaire_id, commune_id, arrondissement_id, second_arrondissement_id, role_nomination, departements(nom), communes(nom)")
        .eq("id", user.id)
        .maybeSingle();

      if (profil) {
        saveCachedUserSession(user, profil);
        return { user, profile: profil };
      }
    } catch {
      // Ignorer erreur réseau pour le profil
    }

    return { user, profile: cached.profile };
  } catch (err) {
    console.warn("Erreur getEffectiveUser, bascule locale:", err);
    return cached;
  }
}

// 4. Référentiel géographique hors-ligne
export function saveCachedGeoReferentiel(deps: any[], communes: any[] = [], arrondissements: any[] = []): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.GEO_CACHE, JSON.stringify({ deps, communes, arrondissements }));
  } catch (e) {
    console.warn("Échec cache géo:", e);
  }
}

export function getCachedGeoReferentiel(): { deps: any[]; communes: any[]; arrondissements: any[] } {
  if (typeof window === "undefined") return { deps: [], communes: [], arrondissements: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GEO_CACHE);
    if (!raw) return { deps: [], communes: [], arrondissements: [] };
    return JSON.parse(raw);
  } catch {
    return { deps: [], communes: [], arrondissements: [] };
  }
}

// 5. Sauvegarde en file d'attente hors-ligne
export function enqueueOfflineItem<T>(
  type: "ALERTE" | "REGISTRE" | "DECES" | "REFERENCE" | "CONSULTATION" | "PLANNING",
  data: T
): OfflineItem<T> {
  const item: OfflineItem<T> = {
    id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    timestamp: new Date().toISOString(),
    data,
    retryCount: 0,
    synced: false,
  };

  if (typeof window === "undefined") return item;

  let key = STORAGE_KEYS.ALERTES_QUEUE;
  if (type === "REGISTRE") key = STORAGE_KEYS.REGISTRES_QUEUE;
  else if (type === "DECES") key = STORAGE_KEYS.DECES_QUEUE;
  else if (type === "REFERENCE") key = STORAGE_KEYS.REFERENCES_QUEUE;
  else if (type === "CONSULTATION") key = STORAGE_KEYS.CONSULTATIONS_QUEUE;
  else if (type === "PLANNING") key = STORAGE_KEYS.PLANNING_QUEUE;

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

// 6. Récupérer les éléments enregistrés localement
export function getOfflineList<T = any>(type: "ALERTE" | "REGISTRE" | "DECES" | "REFERENCE" | "CONSULTATION"): OfflineItem<T>[] {
  if (typeof window === "undefined") return [];
  let key = STORAGE_KEYS.ALERTES_QUEUE;
  if (type === "REGISTRE") key = STORAGE_KEYS.REGISTRES_QUEUE;
  else if (type === "DECES") key = STORAGE_KEYS.DECES_QUEUE;
  else if (type === "REFERENCE") key = STORAGE_KEYS.REFERENCES_QUEUE;
  else if (type === "CONSULTATION") key = STORAGE_KEYS.CONSULTATIONS_QUEUE;

  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

// 7. Nombre total d'éléments en attente de synchronisation
export function getOfflineQueueCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const alertes = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALERTES_QUEUE) || "[]").filter((x: any) => !x.synced).length;
    const registres = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRES_QUEUE) || "[]").filter((x: any) => !x.synced).length;
    const deces = JSON.parse(localStorage.getItem(STORAGE_KEYS.DECES_QUEUE) || "[]").filter((x: any) => !x.synced).length;
    const refs = JSON.parse(localStorage.getItem(STORAGE_KEYS.REFERENCES_QUEUE) || "[]").filter((x: any) => !x.synced).length;
    const consults = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONSULTATIONS_QUEUE) || "[]").filter((x: any) => !x.synced).length;
    return alertes + registres + deces + refs + consults;
  } catch {
    return 0;
  }
}

// 8. Sauvegarde automatique des brouillons de rapports et inventaires
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

export function sauvegarderInventaireLocal(data: any): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.INVENTAIRE_DRAFT, JSON.stringify({
      data,
      savedAt: new Date().toISOString()
    }));
  } catch (e) {
    console.warn("Échec sauvegarde inventaire:", e);
  }
}

export function chargerInventaireLocal(): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTAIRE_DRAFT);
    if (!raw) return null;
    return JSON.parse(raw).data;
  } catch {
    return null;
  }
}
