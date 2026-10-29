const { CADRES_RESPONSABLES_NON_ASCQ } = require('../src/lib/cadre-roles.ts');

function estCadreNonAscq(user) {
  if (!user) return false;

  const roles = [
    user.poste,
    user.role_technique,
    user.role_nomination,
    user.poste_autre
  ].filter(Boolean).map(r => String(r).toUpperCase());

  const isPureRepresentantAscq = roles.some(r => 
    (r === "REPRESENTANT_COMMUNAL" || r === "REPRESENTANT_DEPARTEMENTAL") &&
    !roles.some(sub => sub.includes("CCD") || sub.includes("MCZS") || sub.includes("MCC") || sub.includes("PF_CCLS") || sub.includes("CSSPR") || sub.includes("CSPSM") || sub.includes("CADRE") || sub.includes("DDS") || sub.includes("ADMIN"))
  );

  if (isPureRepresentantAscq) {
    return false;
  }

  return roles.some(r => 
    [
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
    ].includes(r) ||
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

const u1 = { poste: "CCD_CDLS_TP" };
const u2 = { role_technique: "CADRE_DEPARTEMENTAL" };
const u3 = { poste: "ASCQ" };
const u4 = { poste: "ASCQ", role_nomination: "REPRESENTANT_COMMUNAL" };
const u5 = { poste: "REPRESENTANT_COMMUNAL" };

console.log("u1 CCD_CDLS_TP:", estCadreNonAscq(u1));
console.log("u2 CADRE_DEPARTEMENTAL:", estCadreNonAscq(u2));
console.log("u3 ASCQ:", estCadreNonAscq(u3));
console.log("u4 REP COMMUNAL (ASCQ):", estCadreNonAscq(u4));
console.log("u5 REP COMMUNAL:", estCadreNonAscq(u5));
