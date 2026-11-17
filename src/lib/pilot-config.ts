/**
 * Configuration et contrôles de la Phase Pilote Officielle - Département du ZOU
 * 
 * Durant cette phase pilote officielle, seul le département du ZOU est ouvert
 * aux inscriptions, aux activités de terrain, aux plannings et aux consultations.
 * Les 11 autres départements du Bénin sont verrouillés.
 */

export const PILOTE_CONFIG = {
  estActif: true,
  departementNom: "Zou",
  departementCode: "ZOU",
  messageVerrouillage: "Verrouillé - Phase pilote Zou",
  messageBanniere: "Phase Pilote Active : Seul le département du ZOU est actuellement ouvert aux inscriptions et aux opérations terrain. Les 11 autres départements sont temporairement verrouillés.",
  communesZou: [
    "Abomey",
    "Agbangnizoun",
    "Bohicon",
    "Covè",
    "Djidja",
    "Ouinhi",
    "Za-Kpota",
    "Zagnanado",
    "Zogbodomey"
  ]
} as const;

/**
 * Vérifie si le nom d'un département correspond au département pilote (Zou)
 */
export function estDepartementPilote(nom?: string | null): boolean {
  if (!nom) return false;
  const normalise = nom.trim().toLowerCase();
  return normalise === "zou" || normalise.startsWith("zou");
}

/**
 * Formate le libellé pour les listes déroulantes de sélection géographique
 */
export function formaterLibelleDepartementOption(nom: string): {
  libelle: string;
  estPilote: boolean;
  disabled: boolean;
} {
  const estPilote = estDepartementPilote(nom);
  if (estPilote) {
    return {
      libelle: `⭐ ${nom} (Département Pilote Actif)`,
      estPilote: true,
      disabled: false
    };
  }
  return {
    libelle: `🔒 ${nom} (${PILOTE_CONFIG.messageVerrouillage})`,
    estPilote: false,
    disabled: true
  };
}
