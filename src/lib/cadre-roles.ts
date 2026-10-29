// =====================================================================
// UTILITAIRE DE GESTION DES RÔLES : CADRES & RESPONSABLES DE GOUVERNANCE
// Ministère de la Santé du Bénin - Plateforme ASCQ & Gouvernance
// =====================================================================

// Liste des rôles des cadres hiérarchiques et administratifs (NON-ASCQ)
export const CADRES_RESPONSABLES_NON_ASCQ = [
  "PF_CCLS_TP",
  "MCC",
  "C_RAMS",
  "C-RAMS",
  "RCSE",
  "MCZS",
  "CCD_CDLS_TP",
  "CSSPR",
  "CSPSMEH",
  "CSPSMEMH",
  "DDS",
  "CADRE_COMMUNAL",
  "CADRE_ZONE_SANITAIRE",
  "CADRE_DEPARTEMENTAL",
  "CADRE_NATIONAL",
  "RESPONSABLE_COMMUNAL",
  "RESPONSABLE_ZONE_SANITAIRE",
  "RESPONSABLE_DEPARTEMENTAL",
  "RESPONSABLE_NATIONAL",
  "ADMIN_COMMUNAL",
  "ADMIN_DEPARTEMENTAL",
  "SUPER_ADMIN",
  "ADMINISTRATEUR"
];

/**
 * Détermine si un profil appartient à un Cadre ou Responsable (qui n'est PAS un ASCQ de terrain).
 * Note : Les Représentants Communaux et Départementaux SONT des ASCQ.
 */
export function estCadreNonAscq(user: any): boolean {
  if (!user) return false;

  const roles = [
    user.poste,
    user.role_technique,
    user.role_nomination,
    user.poste_autre
  ].filter(Boolean).map(r => String(r).toUpperCase());

  // Les représentants communaux et départementaux qui sont ASCQ
  const isPureRepresentantAscq = roles.some(r => 
    (r === "REPRESENTANT_COMMUNAL" || r === "REPRESENTANT_DEPARTEMENTAL") &&
    !roles.some(sub => sub.includes("CCD") || sub.includes("MCZS") || sub.includes("MCC") || sub.includes("PF_CCLS") || sub.includes("CSSPR") || sub.includes("CSPSM") || sub.includes("CADRE") || sub.includes("DDS") || sub.includes("ADMIN"))
  );

  if (isPureRepresentantAscq) {
    return false;
  }

  // Vérifier si un des rôles fait partie de la liste des cadres ou contient un mot-clé cadre
  return roles.some(r => 
    CADRES_RESPONSABLES_NON_ASCQ.includes(r) ||
    r.includes("CCD") ||
    r.includes("MCZS") ||
    r.includes("MCC") ||
    r.includes("PF_CCLS") ||
    r.includes("CSSPR") ||
    r.includes("CSPSM") ||
    r.includes("CADRE") ||
    r.includes("DDS") ||
    r.includes("COORDONNATEUR") ||
    r.includes("CHEF_SERVICE") ||
    r.includes("DIRECTEUR")
  );
}

/**
 * Retourne le titre officiel et honorifique du cadre pour l'affichage dans l'en-tête et les badges.
 */
export function getTitreCadreOfficiel(user: any): string {
  if (!user) return "Cadre de Supervision";
  
  const roles = [
    user.poste,
    user.role_technique,
    user.role_nomination,
    user.poste_autre
  ].filter(Boolean).map(r => String(r).toUpperCase());

  if (roles.includes("SUPER_ADMIN")) return "Super Administrateur National";
  if (roles.includes("ADMINISTRATEUR")) return "Administrateur National";
  if (roles.includes("CCD_CDLS_TP")) return "Chef Cellule Dép. CDLS-TP";
  if (roles.includes("CSSPR")) return "Chef Service Santé Publique & Recherche";
  if (roles.includes("CSPSMEH") || roles.includes("CSPSMEMH")) return "Chef Service Promotion Santé Mère-Enfant & Hygiène";
  if (roles.includes("DDS")) return "Directeur Départemental de la Santé";
  if (roles.includes("MCZS")) return "Médecin Coordonnateur de Zone Sanitaire";
  if (roles.includes("RCSE")) return "Resp. Communal Surveillance Épidémiologique";
  if (roles.includes("C_RAMS") || roles.includes("C-RAMS")) return "Chef Régie & Suivi RAMS";
  if (roles.includes("MCC")) return "Médecin Coordonnateur de Commune";
  if (roles.includes("PF_CCLS_TP")) return "Point Focal Santé Mairie (CCLS-TP)";
  if (roles.some(r => r.includes("DEPARTEMENT"))) return "Cadre Départemental";
  if (roles.some(r => r.includes("ZONE"))) return "Cadre Zone Sanitaire";
  if (roles.some(r => r.includes("COMMUN"))) return "Cadre Communal";
  if (roles.some(r => r.includes("NATIONAL"))) return "Responsable National";

  return user.poste || user.role_technique || "Cadre Hiérarchique";
}
