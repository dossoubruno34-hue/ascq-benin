// =====================================================================
// UTILITAIRE DE GESTION DES RÔLES & PÉRIMÈTRES (REFONTE ACCÈS COMMUNE)
// SantéCom Bénin - Rôles : SUPER_ADMIN, MEMBRE_MINISTERE, PF_CCLS_TP, ASCQ, RC
// Fonction cumulable : REPRESENTANT_COMMUNAL (attribuée à un ASCQ)
// Aucun rôle ni profil départemental ou zone sanitaire
// =====================================================================

export const ROLES_OFFICIELS = [
  "SUPER_ADMIN",
  "MEMBRE_MINISTERE",
  "PF_CCLS_TP",
  "ASCQ",
  "RC"
] as const;

export type RoleOfficiel = typeof ROLES_OFFICIELS[number];

// Cadres et responsables institutionnels (qui ne saisissent pas sur le terrain)
export const CADRES_RESPONSABLES_NON_ASCQ = [
  "MEMBRE_MINISTERE",
  "PF_CCLS_TP",
  "SUPER_ADMIN"
];

/**
 * Détermine si un profil appartient à un Cadre Non-ASCQ (Consultation/Supervision uniquement)
 * Remarque : Le Représentant Communal EST un ASCQ avec fonction cumulée de terrain.
 */
export function estCadreNonAscq(user: any): boolean {
  if (!user) return false;

  const cleanTel = String(user.telephone || "").replace(/\D/g, "");
  // Bruno DOSSOU (Super Admin National & ASCQ concepteur)
  if (cleanTel.includes("69031463")) {
    return false;
  }

  const roleTech = String(user.role_technique || "").toUpperCase();
  const poste = String(user.poste || "").toUpperCase();
  const nomination = String(user.role_nomination || "").toUpperCase();

  // Le représentant communal est un ASCQ de terrain
  if (nomination === "REPRESENTANT_COMMUNAL" || roleTech === "REPRESENTANT_COMMUNAL") {
    return false;
  }

  // PF CCLS-TP n'est PAS un ASCQ
  if (roleTech === "PF_CCLS_TP" || poste === "PF_CCLS_TP" || nomination === "PF_CCLS_TP") {
    return true;
  }

  // Membre du Ministère n'est PAS un ASCQ
  if (roleTech === "MEMBRE_MINISTERE" || poste === "MEMBRE_MINISTERE" || nomination === "MEMBRE_MINISTERE" || poste.includes("MINIST")) {
    return true;
  }

  return false;
}

/**
 * Retourne le titre officiel selon les rôles stricts de l'application
 */
export function getTitreCadreOfficiel(user: any): string {
  if (!user) return "Utilisateur";

  const cleanTel = String(user.telephone || "").replace(/\D/g, "");
  if (cleanTel.includes("69031463")) {
    return "Super Administrateur National (Concepteur)";
  }

  const roleTech = String(user.role_technique || "").toUpperCase();
  const nomination = String(user.role_nomination || "").toUpperCase();
  const poste = String(user.poste || "").toUpperCase();

  if (roleTech === "SUPER_ADMIN") return "Super Administrateur";
  if (nomination === "MEMBRE_MINISTERE" || roleTech === "MEMBRE_MINISTERE" || poste === "MEMBRE_MINISTERE") return "Ministère de la Santé (Désigné)";
  if (nomination === "REPRESENTANT_COMMUNAL") return "Représentant Communal des ASCQ";
  if (nomination === "PF_CCLS_TP" || roleTech === "PF_CCLS_TP" || poste === "PF_CCLS_TP") return "Point Focal CCLS-TP (Mairie)";
  if (roleTech === "ASCQ" || poste === "ASCQ" || roleTech === "ASCQ_OPERATEUR") return "Agent de Santé Communautaire Qualifié (ASCQ)";
  if (roleTech === "RC" || poste === "RC" || roleTech === "RELAIS") return "Relais Communautaire (RC)";

  return user.poste || user.role_technique || "Acteur SantéCom";
}

export interface PerimetreScope {
  level: "NATIONAL" | "COMMUNAL" | "TERRAIN";
  filterType: "all" | "commune_id" | "user_id";
  id: string | null;
  libelle: string;
}

/**
 * Détermine le périmètre territorial strict :
 * - SUPER_ADMIN & MEMBRE_MINISTERE : NATIONAL
 * - REPRESENTANT_COMMUNAL & PF_CCLS_TP : COMMUNAL (sa commune uniquement)
 * - ASCQ & RC : TERRAIN (ses propres données et ses RC rattachés)
 */
export function getPerimetreScope(user: any): PerimetreScope {
  if (!user) {
    return { level: "COMMUNAL", filterType: "commune_id", id: null, libelle: "Périmètre restreint" };
  }

  const cleanTel = String(user.telephone || "").replace(/\D/g, "");
  const role = String(user.role_technique || "").toUpperCase();
  const nomination = String(user.role_nomination || "").toUpperCase();
  const poste = String(user.poste || "").toUpperCase();

  // Règle d'or terrain : Si l'utilisateur a une commune de rattachement (ex: Bruno DOSSOU affecté à OUINHI),
  // dans "Mon Périmètre", il voit UNIQUEMENT sa commune (OUINHI) et ses arrondissements.
  // La vue globale de l'ensemble du pays (tous les départements et les 77 communes) est exclusivement réservée à l'Espace Administration (/admin).
  if (user.commune_id && (cleanTel.includes("69031463") || role === "SUPER_ADMIN" || poste === "ASCQ" || nomination === "REPRESENTANT_COMMUNAL" || role === "PF_CCLS_TP" || nomination === "PF_CCLS_TP")) {
    const comNom = user.commune_nom || (cleanTel.includes("69031463") ? "Ouinhi" : "Commune");
    return {
      level: "COMMUNAL",
      filterType: "commune_id",
      id: user.commune_id,
      libelle: `Commune : ${comNom}`
    };
  }

  // Périmètre National : Uniquement pour MEMBRE_MINISTERE ou profil national sans rattachement communal
  const isNational = role === "MEMBRE_MINISTERE" ||
    nomination === "MEMBRE_MINISTERE" ||
    poste === "MEMBRE_MINISTERE" ||
    (role === "SUPER_ADMIN" && !user.commune_id);

  if (isNational) {
    return { level: "NATIONAL", filterType: "all", id: null, libelle: "National (Tout le Bénin)" };
  }

  // Périmètre Communal strict
  return {
    level: "COMMUNAL",
    filterType: "commune_id",
    id: user.commune_id || null,
    libelle: user.commune_nom ? `Commune : ${user.commune_nom}` : "Périmètre Communal"
  };
}
