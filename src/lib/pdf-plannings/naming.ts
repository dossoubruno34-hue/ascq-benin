/**
 * UTILITAIRE UNIVERSEL DE NOMMAGE CLAIR DES FICHIERS TÉLÉCHARGÉS
 * SantéCom Bénin (PNSC / CNLS-TP / Présidence de la République du Bénin)
 * 
 * Norme d'identification immédiate demandée :
 * Format standardisé : [Type Document] [Période] [Lieu] [Nom et Prénom]
 * Exemple officiel : "Planning RC S26 TOHOUES NADJO Victor.pdf"
 *                   "Planning ASCQ S47 TOHOUES DOSSOU Bruno.pdf"
 */

/**
 * Nettoie une chaîne pour former un nom de fichier propre, sûr et lisible
 * - Supprime les accents (évite les corruptions UTF-8 / URL sur Windows/Android/iOS)
 * - Élimine les caractères interdits sur les systèmes de fichiers (/ \ : * ? " < > | # % & etc.)
 * - Supprime les parenthèses superflues et condense les espaces
 */
export function nettoyerChaineNomFichier(str?: string | null): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les diacritiques (accents)
    .replace(/[()[\]{}]/g, " ")      // Remplace les parenthèses par des espaces
    .replace(/[/\\:*?"<>|#%&^$!@;=~`+]/g, " ") // Caractères système interdits
    .replace(/\s+/g, " ")           // Condense les espaces multiples
    .trim();
}

export interface PlanningRcFileNameParams {
  semaineNum?: number | string | null;
  annee?: number | string | null;
  arrondissement?: string | null;
  village?: string | null;
  rcName?: string | null;
}

/**
 * Génère le nom de fichier officiel pour le Planning d'un Relais Communautaire (RC)
 * Exemple : "Planning RC S26 TOHOUES NADJO Victor.pdf"
 */
export function genererNomFichierPlanningRc(params: PlanningRcFileNameParams): string {
  const parts: string[] = ["Planning RC"];

  // 1. Période (Semaine épidémiologique)
  if (params.semaineNum !== undefined && params.semaineNum !== null && String(params.semaineNum).trim() !== "") {
    const sStr = String(params.semaineNum).trim().toUpperCase();
    parts.push(sStr.startsWith("S") ? sStr : `S${sStr}`);
  }

  // 2. Lieu (Arrondissement et/ou Village)
  const cleanArr = nettoyerChaineNomFichier(params.arrondissement).toUpperCase();
  const cleanVil = nettoyerChaineNomFichier(params.village).toUpperCase();

  if (cleanArr && cleanVil) {
    if (cleanVil === cleanArr || cleanVil.startsWith(cleanArr)) {
      parts.push(cleanArr);
    } else {
      parts.push(`${cleanArr} ${cleanVil}`);
    }
  } else if (cleanArr) {
    parts.push(cleanArr);
  } else if (cleanVil) {
    parts.push(cleanVil);
  }

  // 3. Nom et Prénom du Relais Communautaire
  const cleanRc = nettoyerChaineNomFichier(params.rcName);
  if (cleanRc) {
    parts.push(cleanRc);
  }

  const baseName = parts.filter(Boolean).join(" ");
  return `${baseName || "Planning RC"}.pdf`;
}

export interface PlanningAscqFileNameParams {
  semaine?: number | string | null;
  annee?: number | string | null;
  arrondissement?: string | null;
  commune?: string | null;
  ascqNom?: string | null;
}

/**
 * Génère le nom de fichier officiel pour le Planning d'un ASCQ
 * Exemple : "Planning ASCQ S47 TOHOUES DOSSOU Bruno.pdf"
 */
export function genererNomFichierPlanningAscq(params: PlanningAscqFileNameParams): string {
  const parts: string[] = ["Planning ASCQ"];

  // 1. Période (Semaine)
  if (params.semaine !== undefined && params.semaine !== null && String(params.semaine).trim() !== "") {
    const sStr = String(params.semaine).trim().toUpperCase();
    parts.push(sStr.startsWith("S") ? sStr : `S${sStr}`);
  }

  // 2. Lieu (Arrondissement prioritaire, sinon Commune)
  const cleanArr = nettoyerChaineNomFichier(params.arrondissement).toUpperCase();
  const cleanCom = nettoyerChaineNomFichier(params.commune).toUpperCase();

  if (cleanArr) {
    parts.push(cleanArr);
  } else if (cleanCom) {
    parts.push(cleanCom);
  }

  // 3. Nom et Prénom de l'ASCQ
  const cleanAscq = nettoyerChaineNomFichier(params.ascqNom);
  if (cleanAscq) {
    parts.push(cleanAscq);
  }

  const baseName = parts.filter(Boolean).join(" ");
  return `${baseName || "Planning ASCQ"}.pdf`;
}

export interface FicheFileNameParams {
  typeLabel: string;
  periodeOuDate?: string | number | null;
  lieu?: string | null;
  nomPersonne?: string | null;
  isVierge?: boolean;
  extension?: string;
}

/**
 * Générateur générique pour toute fiche ou document officiel
 */
export function genererNomFichierDocument(params: FicheFileNameParams): string {
  const ext = (params.extension || "pdf").replace(/^\./, "");
  const cleanLabel = nettoyerChaineNomFichier(params.typeLabel);

  if (params.isVierge) {
    return `${cleanLabel} VIERGE OFFICIEL.${ext}`;
  }

  const parts: string[] = [cleanLabel];

  if (params.periodeOuDate !== undefined && params.periodeOuDate !== null) {
    const pStr = String(params.periodeOuDate).trim().replace(/[/\\:]/g, "-");
    parts.push(pStr);
  }

  if (params.lieu) {
    const cleanLieu = nettoyerChaineNomFichier(params.lieu).toUpperCase();
    if (cleanLieu) parts.push(cleanLieu);
  }

  if (params.nomPersonne) {
    const cleanNom = nettoyerChaineNomFichier(params.nomPersonne);
    if (cleanNom) parts.push(cleanNom);
  }

  const baseName = parts.filter(Boolean).join(" ");
  return `${baseName || cleanLabel}.${ext}`;
}
