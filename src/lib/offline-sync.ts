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
export function clearAllUserCaches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION_CACHE);
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE_CACHE);
    localStorage.removeItem(STORAGE_KEYS.MON_ESPACE_CACHE);
    localStorage.removeItem(STORAGE_KEYS.RC_SPACE_CACHE);
  } catch (e) {
    console.warn("Échec purge caches utilisateur :", e);
  }
}

export function saveCachedUserSession(user: any, profile: any): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getCachedUserSession();
    if (existing?.user?.id && user?.id && existing.user.id !== user.id) {
      // Compte différent -> Purger immédiatement les caches de l'ancien utilisateur
      localStorage.removeItem(STORAGE_KEYS.MON_ESPACE_CACHE);
      localStorage.removeItem(STORAGE_KEYS.RC_SPACE_CACHE);
    }
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

export function saveOfflineCredentials(telephone: string, profile: any, user: any): void {
  if (typeof window === "undefined" || !telephone) return;
  try {
    const rawDigits = telephone.replace(/\D/g, "");
    const cleanTel = rawDigits.startsWith("229") ? rawDigits.substring(3) : rawDigits;
    const knownAccountsStr = localStorage.getItem("ascq_offline_known_accounts");
    const accounts = knownAccountsStr ? JSON.parse(knownAccountsStr) : {};
    accounts[cleanTel] = {
      profile,
      user,
      lastLogin: new Date().toISOString()
    };
    localStorage.setItem("ascq_offline_known_accounts", JSON.stringify(accounts));
    localStorage.setItem("ascq_offline_last_phone", cleanTel);
  } catch (e) {
    console.warn("Échec sauvegarde identifiants hors-ligne:", e);
  }
}

export function findOfflineAccount(telephone: string): { profile: any; user: any } | null {
  if (typeof window === "undefined" || !telephone) return null;
  try {
    const rawDigits = telephone.replace(/\D/g, "");
    const cleanTel = rawDigits.startsWith("229") ? rawDigits.substring(3) : rawDigits;
    const knownAccountsStr = localStorage.getItem("ascq_offline_known_accounts");
    if (knownAccountsStr) {
      const accounts = JSON.parse(knownAccountsStr);
      if (accounts[cleanTel]) return accounts[cleanTel];
    }
    // Vérifier aussi le profil en session actuelle
    const session = getCachedUserSession();
    if (session?.profile) {
      const sessTel = (session.profile.telephone || "").replace(/\D/g, "");
      const cleanSess = sessTel.startsWith("229") ? sessTel.substring(3) : sessTel;
      if (cleanSess === cleanTel || (cleanTel.length >= 8 && cleanSess.includes(cleanTel))) {
        return { profile: session.profile, user: session.user };
      }
    }
    return null;
  } catch {
    return null;
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
    const data = parsed.data || null;
    const session = getCachedUserSession();
    // Si les données en cache appartiennent à un autre utilisateur, on les purge
    if (data && session?.user?.id && data.id && data.id !== session.user.id) {
      localStorage.removeItem(STORAGE_KEYS.MON_ESPACE_CACHE);
      return null;
    }
    return data;
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
    const data = parsed.data || null;
    const session = getCachedUserSession();
    if (data && session?.user?.id && data.user_id && data.user_id !== session.user.id) {
      localStorage.removeItem(STORAGE_KEYS.RC_SPACE_CACHE);
      return null;
    }
    return data;
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
    const countFor = (key: string) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return 0;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return 0;
        return parsed.filter((x: any) => x && !x.synced).length;
      } catch {
        return 0;
      }
    };
    return (
      countFor(STORAGE_KEYS.ALERTES_QUEUE) +
      countFor(STORAGE_KEYS.REGISTRES_QUEUE) +
      countFor(STORAGE_KEYS.DECES_QUEUE) +
      countFor(STORAGE_KEYS.REFERENCES_QUEUE) +
      countFor(STORAGE_KEYS.CONSULTATIONS_QUEUE) +
      countFor(STORAGE_KEYS.PLANNING_QUEUE)
    );
  } catch {
    return 0;
  }
}

// 7b. Purge complète de toutes les files d'attente hors-ligne (nettoyage manuel ou forcé)
export function viderToutesLesFilesAttenteLocales(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.ALERTES_QUEUE);
    localStorage.removeItem(STORAGE_KEYS.REGISTRES_QUEUE);
    localStorage.removeItem(STORAGE_KEYS.DECES_QUEUE);
    localStorage.removeItem(STORAGE_KEYS.REFERENCES_QUEUE);
    localStorage.removeItem(STORAGE_KEYS.CONSULTATIONS_QUEUE);
    localStorage.removeItem(STORAGE_KEYS.PLANNING_QUEUE);
    window.dispatchEvent(new CustomEvent("ascq_queue_updated"));
  } catch (e) {
    console.warn("Échec purge files d'attente locales:", e);
  }
}

// 7c. Synchronisation réelle des files d'attente locales vers Supabase
export async function synchroniserToutesLesFilesAttente(): Promise<{
  success: boolean;
  nbSynchronises: number;
  erreurs: string[];
}> {
  if (typeof window === "undefined") return { success: true, nbSynchronises: 0, erreurs: [] };
  if (!navigator.onLine) return { success: false, nbSynchronises: 0, erreurs: ["Appareil hors-ligne"] };

  let nbSynchronises = 0;
  const erreurs: string[] = [];

  // 1. Décès en attente
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DECES_QUEUE);
    if (raw) {
      const items: OfflineItem[] = JSON.parse(raw);
      const remaining: OfflineItem[] = [];
      for (const item of items) {
        if (item.synced) continue;
        try {
          if (item.data) {
            const { error } = await supabase.from("deces_communautaires").insert({
              ...item.data,
              updated_at: new Date().toISOString()
            });
            if (!error || error.code === "23505") {
              nbSynchronises++;
            } else {
              remaining.push(item);
              erreurs.push(`Décès ${item.id}: ${error.message}`);
            }
          }
        } catch (e: any) {
          remaining.push(item);
          erreurs.push(e.message || "Erreur de synchro décès");
        }
      }
      localStorage.setItem(STORAGE_KEYS.DECES_QUEUE, JSON.stringify(remaining));
    }
  } catch (err: any) {
    console.warn("Erreur synchro file décès:", err);
  }

  // 2. Alertes en attente
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALERTES_QUEUE);
    if (raw) {
      const items: OfflineItem[] = JSON.parse(raw);
      const remaining: OfflineItem[] = [];
      for (const item of items) {
        if (item.synced) continue;
        try {
          if (item.data) {
            const { error } = await supabase.from("alertes_communautaires").insert({
              ...item.data,
              updated_at: new Date().toISOString()
            });
            if (!error || error.code === "23505") {
              nbSynchronises++;
            } else {
              remaining.push(item);
              erreurs.push(`Alerte ${item.id}: ${error.message}`);
            }
          }
        } catch (e: any) {
          remaining.push(item);
          erreurs.push(e.message || "Erreur de synchro alerte");
        }
      }
      localStorage.setItem(STORAGE_KEYS.ALERTES_QUEUE, JSON.stringify(remaining));
    }
  } catch (err: any) {
    console.warn("Erreur synchro file alertes:", err);
  }

  // 3. Registres en attente
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTRES_QUEUE);
    if (raw) {
      const items: OfflineItem[] = JSON.parse(raw);
      const remaining: OfflineItem[] = [];
      for (const item of items) {
        if (item.synced) continue;
        try {
          if (item.data) {
            const { error } = await supabase.from("registre_alertes_rumeurs").insert({
              ...item.data,
              updated_at: new Date().toISOString()
            });
            if (!error || error.code === "23505") {
              nbSynchronises++;
            } else {
              remaining.push(item);
              erreurs.push(`Registre ${item.id}: ${error.message}`);
            }
          }
        } catch (e: any) {
          remaining.push(item);
          erreurs.push(e.message || "Erreur de synchro registre");
        }
      }
      localStorage.setItem(STORAGE_KEYS.REGISTRES_QUEUE, JSON.stringify(remaining));
    }
  } catch (err: any) {
    console.warn("Erreur synchro file registre:", err);
  }

  // 4. Références en attente
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REFERENCES_QUEUE);
    if (raw) {
      const items: OfflineItem[] = JSON.parse(raw);
      const remaining: OfflineItem[] = [];
      for (const item of items) {
        if (item.synced) continue;
        try {
          if (item.data) {
            const { error } = await supabase.from("references_urgences").insert({
              ...item.data,
              updated_at: new Date().toISOString()
            });
            if (!error || error.code === "23505") {
              nbSynchronises++;
            } else {
              remaining.push(item);
              erreurs.push(`Référence ${item.id}: ${error.message}`);
            }
          }
        } catch (e: any) {
          remaining.push(item);
          erreurs.push(e.message || "Erreur de synchro référence");
        }
      }
      localStorage.setItem(STORAGE_KEYS.REFERENCES_QUEUE, JSON.stringify(remaining));
    }
  } catch (err: any) {
    console.warn("Erreur synchro file références:", err);
  }

  // 5. Nettoyage des items marqués 'synced: true' pour ne pas encombrer le stockage local
  try {
    const cleanQueue = (key: string) => {
      const r = localStorage.getItem(key);
      if (!r) return;
      try {
        const arr = JSON.parse(r);
        if (Array.isArray(arr)) {
          const unsynced = arr.filter((x: any) => x && !x.synced);
          localStorage.setItem(key, JSON.stringify(unsynced));
        }
      } catch {}
    };
    cleanQueue(STORAGE_KEYS.ALERTES_QUEUE);
    cleanQueue(STORAGE_KEYS.REGISTRES_QUEUE);
    cleanQueue(STORAGE_KEYS.DECES_QUEUE);
    cleanQueue(STORAGE_KEYS.REFERENCES_QUEUE);
    cleanQueue(STORAGE_KEYS.CONSULTATIONS_QUEUE);
    cleanQueue(STORAGE_KEYS.PLANNING_QUEUE);
  } catch {}

  // Déclencher l'événement d'actualisation globale du compteur
  window.dispatchEvent(new CustomEvent("ascq_queue_updated"));

  return {
    success: erreurs.length === 0,
    nbSynchronises,
    erreurs
  };
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
