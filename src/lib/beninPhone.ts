// =====================================================================
// UTILITAIRE OFFICIEL DE NORMALISATION & ACTIONS TÉLÉPHONIQUES BÉNIN (+229)
// Système National de Numérotation Béninois (10 chiffres / préfixe 01)
// =====================================================================

export interface BeninPhoneInfo {
  raw: string;
  national10: string; // Ex: "0169031463"
  intlWithPlus: string; // Ex: "+2290169031463"
  intlDigits: string; // Ex: "2290169031463"
  displayFormatted: string; // Ex: "+229 01 69 03 14 63"
  displayShort: string; // Ex: "01 69 03 14 63"
  telUrl: string; // Ex: "tel:+2290169031463"
  whatsappUrl: string; // Ex: "https://wa.me/2290169031463"
}

/**
 * Normalise n'importe quel format de numéro béninois :
 * - 8 chiffres : "69031463" -> "+229 01 69 03 14 63"
 * - 10 chiffres : "0169031463" -> "+229 01 69 03 14 63"
 * - International : "+22969031463" ou "+2290169031463" -> "+229 01 69 03 14 63"
 * - Espacé : "+229 01 69 03 14 63"
 */
export function parseBeninPhone(phone: string | null | undefined): BeninPhoneInfo | null {
  if (!phone) return null;

  // Conserver uniquement les chiffres
  let digits = String(phone).replace(/\D/g, "");
  if (!digits || digits.length < 8) return null;

  // Si le numéro commence par l'indicatif pays 229
  if (digits.startsWith("229")) {
    digits = digits.substring(3);
  }

  // À ce stade, digits est le numéro national
  let national10 = digits;

  // Ancien plan à 8 chiffres -> Nouveau plan à 10 chiffres (préfixe 01)
  if (national10.length === 8) {
    national10 = "01" + national10;
  } else if (national10.length === 10 && !national10.startsWith("01")) {
    // Si 10 chiffres sans 01 (rare, précaution)
    national10 = "01" + national10.substring(2);
  }

  // Si nous n'avons toujours pas 10 chiffres, ajuster au mieux
  if (national10.length > 10) {
    national10 = national10.slice(-10);
    if (!national10.startsWith("01") && national10.length === 10) {
      national10 = "01" + national10.slice(2);
    }
  }

  const intlDigits = "229" + national10;
  const intlWithPlus = "+" + intlDigits;

  // Formatage aéré officiel : +229 01 XX XX XX XX
  const p1 = national10.slice(0, 2); // "01"
  const p2 = national10.slice(2, 4); // "69"
  const p3 = national10.slice(4, 6); // "03"
  const p4 = national10.slice(6, 8); // "14"
  const p5 = national10.slice(8, 10); // "63"

  const displayFormatted = `+229 ${p1} ${p2} ${p3} ${p4} ${p5}`;
  const displayShort = `${p1} ${p2} ${p3} ${p4} ${p5}`;

  return {
    raw: phone,
    national10,
    intlWithPlus,
    intlDigits,
    displayFormatted,
    displayShort,
    telUrl: `tel:${intlWithPlus}`,
    whatsappUrl: `https://wa.me/${intlDigits}`
  };
}

/**
 * Retourne le lien WhatsApp direct avec un message pré-rempli optionnel
 */
export function getBeninWhatsAppLink(phone: string | null | undefined, message?: string): string {
  const parsed = parseBeninPhone(phone);
  if (!parsed) return "#";
  if (message) {
    return `${parsed.whatsappUrl}?text=${encodeURIComponent(message)}`;
  }
  return parsed.whatsappUrl;
}

/**
 * Retourne l'URL tel: directe
 */
export function getBeninTelLink(phone: string | null | undefined): string {
  const parsed = parseBeninPhone(phone);
  return parsed ? parsed.telUrl : "#";
}
