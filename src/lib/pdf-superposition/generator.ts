import { PDFDocument, rgb, PDFFont, PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { FieldMap, SlotFieldDefinition, GenerationOptions, GenerationResult, BoxCoords } from "./types";
import { FIELD_MAPS } from "./field-maps";

// Couleur Bleu Bic intense (#0040CC) et police Carlito-Bold pour une lecture ultra-facile des données saisies
const COULEUR_BLEU_MARINE = rgb(0.0, 0.25, 0.80);
const TAILLE_DEFAUT = 9.5;
const TAILLE_MIN = 6.5;
const DECALAGE_LIGNE_BASE = 1.6;
const MARGE_TEXTE = 3.0;
const MARGE_CROIX = 1.3;
const EPAISSEUR_CROIX = 1.4;

// Cache mémoire des octets
const memoryCache: Record<string, Uint8Array> = {};

async function fetchBytes(urlOrPath: string): Promise<Uint8Array> {
  if (memoryCache[urlOrPath]) {
    return memoryCache[urlOrPath];
  }

  if (typeof window === "undefined") {
    const fs = await import("fs");
    const path = await import("path");
    let localPath = urlOrPath;
    if (urlOrPath.startsWith("/")) {
      localPath = path.join(process.cwd(), "public", urlOrPath.replace(/^\//, ""));
    }
    const buffer = fs.readFileSync(localPath);
    const uint8 = new Uint8Array(buffer);
    memoryCache[urlOrPath] = uint8;
    return uint8;
  }

  const response = await fetch(urlOrPath);
  if (!response.ok) {
    throw new Error(`Impossible de charger la ressource ${urlOrPath} : statut ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  memoryCache[urlOrPath] = uint8;
  return uint8;
}

function cleanVal(v: any): string {
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  if (s === "undefined" || s === "null" || s === "NaN") return "";
  return s;
}

/**
 * Ajuste la taille de police pour tenir dans availableWidth (min 6.5pt)
 */
function ajusterTaillePolice(
  text: string,
  font: PDFFont,
  initialSize: number,
  availWidth: number,
  minSize: number = TAILLE_MIN
): { size: number; w: number; overflow: boolean } {
  let size = initialSize;
  let w = font.widthOfTextAtSize(text, size);
  while (w > availWidth && size > minSize) {
    size -= 0.25;
    w = font.widthOfTextAtSize(text, size);
  }
  return {
    size,
    w,
    overflow: w > availWidth
  };
}

/**
 * Découpe un texte en lignes pour s'adapter à une largeur maximale
 */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Dessine une valeur sur un emplacement mesuré (slot)
 */
function dessinerSlot(
  page: PDFPage,
  font: PDFFont,
  slot: { x0: number; x1: number; base: number; align: string; id?: string },
  text: string,
  warnings: string[]
) {
  if (!text) return;
  const avail = slot.x1 - slot.x0 - MARGE_TEXTE;
  const { size, w, overflow } = ajusterTaillePolice(text, font, TAILLE_DEFAUT, avail);

  if (overflow) {
    warnings.push(`DÉBORDEMENT: champ "${slot.id || 'inconnu'}" ("${text}") dépasse ${avail.toFixed(1)}pt même à ${size}pt.`);
  }

  let x = slot.x0 + MARGE_TEXTE;
  if (slot.align === "c" || slot.align === "center") {
    x = slot.x0 + (slot.x1 - slot.x0 - w) / 2;
  } else if (slot.align === "r" || slot.align === "right") {
    x = slot.x1 - w - MARGE_TEXTE;
  }

  page.drawText(text, {
    x,
    y: slot.base + DECALAGE_LIGNE_BASE,
    size,
    font,
    color: COULEUR_BLEU_MARINE
  });
}

/**
 * Dessine une croix dans une case à cocher
 */
function dessinerCroix(page: PDFPage, box: BoxCoords) {
  const m = MARGE_CROIX;
  const x0 = box.x0 + m;
  const x1 = box.x1 - m;
  const y0 = box.y0 + m;
  const y1 = box.y1 - m;

  page.drawLine({
    start: { x: x0, y: y0 },
    end: { x: x1, y: y1 },
    thickness: EPAISSEUR_CROIX,
    color: COULEUR_BLEU_MARINE
  });
  page.drawLine({
    start: { x: x0, y: y1 },
    end: { x: x1, y: y0 },
    thickness: EPAISSEUR_CROIX,
    color: COULEUR_BLEU_MARINE
  });
}

/**
 * Dessine la signature tactile ET systématiquement le Nom et Prénom de l'intéressé en bas
 */
async function dessinerSignature(
  pdfDoc: PDFDocument,
  page: PDFPage,
  box: { x0: number; x1: number; y0: number; y1: number; base?: number },
  signatureTactile: string | null | undefined,
  nomSignataire: string,
  font: PDFFont
) {
  const hasName = Boolean(nomSignataire && nomSignataire.trim());
  const yNameBase = box.base !== undefined ? box.base : box.y0;
  // Si un nom est présent, réserver les 11 pt inférieurs pour le nom et prénom en bas de la signature
  const imgBottomY = hasName ? Math.min(box.y1 - 12, yNameBase + 10) : box.y0;

  if (signatureTactile && typeof signatureTactile === "string" && signatureTactile.trim().length > 50) {
    try {
      let rawBase64 = signatureTactile.trim();
      const isJpg = rawBase64.includes("image/jpeg") || rawBase64.includes("image/jpg");
      rawBase64 = rawBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

      let bytes: Uint8Array;
      if (typeof Buffer !== "undefined") {
        bytes = new Uint8Array(Buffer.from(rawBase64, "base64"));
      } else {
        const bin = atob(rawBase64);
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          bytes[i] = bin.charCodeAt(i);
        }
      }

      const img = isJpg ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);
      const wBox = Math.max(20, box.x1 - box.x0);
      const hBox = Math.max(14, box.y1 - imgBottomY);
      const dims = img.scaleToFit(wBox, hBox);
      const drawX = box.x0 + Math.max(0, (wBox - dims.width) / 2);
      const drawY = imgBottomY + Math.max(0, (hBox - dims.height) / 2);

      page.drawImage(img, {
        x: drawX,
        y: drawY,
        width: dims.width,
        height: dims.height
      });
    } catch (err) {
      console.warn("Échec du décodage de la signature tactile :", err);
    }
  }

  // RÈGLE GÉNÉRALE : À chaque fois qu'il y a signature, toujours mettre le nom et prénom de l'intéressé en bas
  if (hasName) {
    const cleanName = nomSignataire.trim();
    const availW = Math.max(40, box.x1 - box.x0 - 4);
    const { size, w } = ajusterTaillePolice(cleanName, font, 8.5, availW, 6.5);
    const nameX = box.x0 + Math.max(0, (box.x1 - box.x0 - w) / 2);
    page.drawText(cleanName, {
      x: nameX,
      y: yNameBase,
      size,
      font,
      color: COULEUR_BLEU_MARINE
    });
  }
}

const LABELS_FICHES_OFFICIELLES: Record<string, string> = {
  REG: "Registre Alertes",
  ALR: "Notification Alerte",
  DEC: "Notification Deces",
  INV: "Investigation Evenement",
  RAP: "Rapport Hebdo SIMR"
};

export function genererNomFichierOfficiel(
  typeFiche: string,
  data: Record<string, any>
): string {
  const sanitize = (s?: string | null) =>
    (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[()[\]{}]/g, " ")
      .replace(/[/\\:*?"<>|#%&^$!@;=~`+]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const typeLabel = LABELS_FICHES_OFFICIELLES[typeFiche] || sanitize(typeFiche) || "Fiche";

  const dateOrSemaine = data.semaine || data.semaine_epidemio || data.semaine_num
    ? `S${data.semaine || data.semaine_epidemio || data.semaine_num}`
    : data.date_survenue || data.date || data.date_deces || data.date_notification || new Date().toISOString().split("T")[0];

  const cleanPeriode = sanitize(String(dateOrSemaine)).replace(/[/\\:]/g, "-");
  const cleanArr = sanitize(data.arrondissement).toUpperCase();
  const cleanVil = sanitize(data.village).toUpperCase();
  const cleanCom = sanitize(data.commune).toUpperCase();

  let lieu = cleanArr;
  if (cleanArr && cleanVil && cleanVil !== cleanArr && !cleanVil.startsWith(cleanArr)) {
    lieu = `${cleanArr} ${cleanVil}`;
  } else if (!cleanArr && cleanVil) {
    lieu = cleanVil;
  } else if (!lieu && cleanCom) {
    lieu = cleanCom;
  }

  const cleanNom = sanitize(
    data.relais_nom ||
    data.nom_relais ||
    data.ascq_nom ||
    data.nom_ascq ||
    data.notif_nom ||
    data.notificateur_nom ||
    data.point_focal_nom ||
    data.nom_defunt ||
    ""
  );

  const parts = [typeLabel];
  if (cleanPeriode) parts.push(cleanPeriode);
  if (lieu) parts.push(lieu);
  if (cleanNom) parts.push(cleanNom);

  return `${parts.filter(Boolean).join(" ") || typeLabel}.pdf`;
}

/**
 * Moteur principal de superposition vectorielle sur PDF officiel
 */
export async function genererFichePdfSuperposee(
  typeFiche: "REG" | "ALR" | "DEC" | "INV" | "RAP",
  donnees: Record<string, any>,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const fieldMap: FieldMap = FIELD_MAPS[typeFiche];
  if (!fieldMap) {
    throw new Error(`Modèle de fiche inconnu : ${typeFiche}`);
  }

  const warnings: string[] = [];
  const isVierge = options.isVierge === true;

  // 1. Charger le modèle PDF vectoriel officiel
  const templateBytes = await fetchBytes(fieldMap.modelePdf);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  // 2. Charger et intégrer la police Carlito-Bold (Gras) pour une lecture facile
  const fontBoldBytes = await fetchBytes("/fonts/Carlito-Bold.ttf");
  const font = await pdfDoc.embedFont(fontBoldBytes);

  // Modèle vierge
  if (isVierge) {
    const pdfBytes = await pdfDoc.save();
    let blobUrl = "";
    if (typeof window !== "undefined") {
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      blobUrl = URL.createObjectURL(blob);
    }
    return {
      pdfBytes,
      blobUrl,
      warnings: [],
      nbPages: pdfDoc.getPageCount(),
      nomFichier: `${LABELS_FICHES_OFFICIELLES[typeFiche] || typeFiche} VIERGE OFFICIEL.pdf`
    };
  }

  // =========================================================================
  // TYPE DEC : Formulaire de notification des décès
  // =========================================================================
  if (typeFiche === "DEC") {
    const page = pdfDoc.getPage(0);

    // 1. Slots de texte
    if (fieldMap.champs) {
      for (const slot of fieldMap.champs) {
        const val = cleanVal(donnees[slot.id]);
        if (!val) continue;
        dessinerSlot(page, font, slot, val, warnings);
      }
    }

    // 2. Cases à cocher (Sexe M / F)
    if (fieldMap.casesACocher) {
      const sexe = cleanVal(donnees.sexe).toUpperCase();
      if (sexe === "M" && fieldMap.casesACocher.sexe_M) {
        dessinerCroix(page, fieldMap.casesACocher.sexe_M);
      } else if (sexe === "F" && fieldMap.casesACocher.sexe_F) {
        dessinerCroix(page, fieldMap.casesACocher.sexe_F);
      }
    }

    // 3. Signature placée directement SOUS "Signature du notificateur :" avec le Nom et Prénom en bas
    const nomNotif = cleanVal(donnees.notif_nom || donnees.signature_nom);
    if (donnees.signature_tactile || nomNotif) {
      await dessinerSignature(
        pdfDoc,
        page,
        { x0: 28.0, x1: 215.0, y0: 14.0, y1: 58.0, base: 14.5 },
        donnees.signature_tactile,
        nomNotif,
        font
      );
    }
  }

  // =========================================================================
  // TYPE ALR : Fiche de notification des alertes
  // =========================================================================
  else if (typeFiche === "ALR") {
    const page = pdfDoc.getPage(0);

    if (fieldMap.champs) {
      for (const slot of fieldMap.champs) {
        const val = cleanVal(donnees[slot.id]);
        if (!val) continue;

        if (slot.type === "multiligne" && slot.box) {
          const availWidth = slot.x1 - slot.x0 - 2 * MARGE_TEXTE;
          let fontSize = TAILLE_DEFAUT;
          let lignes = wrapText(val, font, fontSize, availWidth);
          const maxLines = Math.max(1, Math.floor((slot.box.y1 - slot.box.y0 - 4) / 12));

          while (lignes.length > maxLines && fontSize > TAILLE_MIN) {
            fontSize -= 0.5;
            lignes = wrapText(val, font, fontSize, availWidth);
          }

          if (lignes.length > maxLines) {
            warnings.push(`DÉBORDEMENT: champ multiligne "${slot.id}" dépasse le nombre de lignes disponibles.`);
          }

          let curY = slot.base;
          for (let i = 0; i < Math.min(lignes.length, maxLines); i++) {
            page.drawText(lignes[i], {
              x: slot.x0 + MARGE_TEXTE,
              y: curY,
              size: fontSize,
              font,
              color: COULEUR_BLEU_MARINE
            });
            curY -= (fontSize + 2.5);
          }
        } else {
          dessinerSlot(page, font, slot, val, warnings);
        }
      }
    }

    // Signature + Nom et Prénom en bas
    const nomPointFocal = cleanVal(donnees.point_focal_nom || donnees.signature_nom);
    if (donnees.signature_tactile || nomPointFocal) {
      await dessinerSignature(
        pdfDoc,
        page,
        { x0: 405.0, x1: 555.0, y0: 95.0, y1: 145.0, base: 96.0 },
        donnees.signature_tactile,
        nomPointFocal,
        font
      );
    }
  }

  // =========================================================================
  // TYPE REG : Registre des alertes (tableaux 11 lignes par page)
  // =========================================================================
  else if (typeFiche === "REG") {
    const lignes = Array.isArray(donnees.lignes) ? donnees.lignes : [];
    const lignesParPage = fieldMap.lignesParPage || 11;
    const nbPagesNecessaires = Math.max(1, Math.ceil(lignes.length / lignesParPage));

    for (let p = 1; p < nbPagesNecessaires; p++) {
      const [nouvellePage] = await pdfDoc.copyPages(pdfDoc, [0]);
      pdfDoc.addPage(nouvellePage);
    }

    for (let pageIdx = 0; pageIdx < nbPagesNecessaires; pageIdx++) {
      const page = pdfDoc.getPage(pageIdx);

      // En-tête
      if (fieldMap.champsEnTete) {
        for (const slot of fieldMap.champsEnTete) {
          const val = cleanVal(donnees[slot.id]);
          if (!val) continue;
          dessinerSlot(page, font, slot, val, warnings);
        }
      }

      // Lignes de tableau
      const debutLignes = pageIdx * lignesParPage;
      const finLignes = Math.min(debutLignes + lignesParPage, lignes.length);
      const lignesCettePage = lignes.slice(debutLignes, finLignes);
      const rowSlots = fieldMap.lignes || [];

      for (let rIdx = 0; rIdx < lignesCettePage.length; rIdx++) {
        const item = lignesCettePage[rIdx];
        const rowDef = rowSlots[rIdx];
        if (!rowDef || !fieldMap.colonnesTableau) continue;

        for (const col of fieldMap.colonnesTableau) {
          let val = cleanVal(item[col.id]);
          if (col.id === "numero" && !val) {
            val = String(debutLignes + rIdx + 1);
          }
          if (!val) continue;

          const availWidth = col.x1 - col.x0 - 2 * MARGE_TEXTE;
          let fontSize = TAILLE_DEFAUT;
          let textLines = wrapText(val, font, fontSize, availWidth);
          const maxLinesInCell = Math.max(1, Math.floor((rowDef.y1 - rowDef.y0 - 4) / 11));

          while (textLines.length > maxLinesInCell && fontSize > TAILLE_MIN) {
            fontSize -= 0.5;
            textLines = wrapText(val, font, fontSize, availWidth);
          }

          if (textLines.length > maxLinesInCell) {
            warnings.push(`DÉBORDEMENT: Ligne ${debutLignes + rIdx + 1}, col "${col.id}" dépasse la cellule.`);
          }

          if (textLines.length <= 1) {
            const singleW = font.widthOfTextAtSize(val, fontSize);
            let x = col.x0 + MARGE_TEXTE;
            if (col.align === "c" || col.align === "center") {
              x = col.x0 + (col.x1 - col.x0 - singleW) / 2;
            }
            page.drawText(val, {
              x,
              y: rowDef.base,
              size: fontSize,
              font,
              color: COULEUR_BLEU_MARINE
            });
          } else {
            let curY = rowDef.y1 - 10;
            for (let li = 0; li < Math.min(textLines.length, maxLinesInCell); li++) {
              const lineTxt = textLines[li];
              const lineW = font.widthOfTextAtSize(lineTxt, fontSize);
              let x = col.x0 + MARGE_TEXTE;
              if (col.align === "c" || col.align === "center") {
                x = col.x0 + (col.x1 - col.x0 - lineW) / 2;
              }
              page.drawText(lineTxt, {
                x,
                y: curY,
                size: fontSize,
                font,
                color: COULEUR_BLEU_MARINE
              });
              curY -= (fontSize + 1.5);
            }
          }
        }
      }
    }

    // Signature sur la dernière page + Nom et Prénom en bas
    const dernierePage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
    const nomRelais = cleanVal(donnees.signature_nom);
    if (donnees.signature_tactile || nomRelais) {
      await dessinerSignature(
        pdfDoc,
        dernierePage,
        { x0: 390.0, x1: 555.0, y0: 22.0, y1: 68.0, base: 23.0 },
        donnees.signature_tactile,
        nomRelais,
        font
      );
    }
  }

  // =========================================================================
  // TYPE INV : Investigation des événements
  // =========================================================================
  else if (typeFiche === "INV") {
    const page = pdfDoc.getPage(0);
    const colVal = fieldMap.colonneValeurs || { x0: 232.3, x1: 551.0, marge: 3.0 };

    if (fieldMap.champs) {
      for (const champ of fieldMap.champs) {
        const val = cleanVal(donnees[champ.id]);
        if (!val) continue;

        const x0 = colVal.x0;
        const x1 = colVal.x1;
        const availWidth = x1 - x0 - 2 * colVal.marge;

        if (champ.type === "multiligne") {
          let fontSize = TAILLE_DEFAUT;
          let lignes = wrapText(val, font, fontSize, availWidth);
          const maxLines = Math.max(1, Math.floor((champ.y1! - champ.y0! - 4) / 12));

          while (lignes.length > maxLines && fontSize > TAILLE_MIN) {
            fontSize -= 0.5;
            lignes = wrapText(val, font, fontSize, availWidth);
          }

          if (lignes.length > maxLines) {
            warnings.push(`DÉBORDEMENT: champ multiligne "${champ.id}" dépasse sa cellule.`);
          }

          let curY = champ.y1! - 11;
          for (let li = 0; li < Math.min(lignes.length, maxLines); li++) {
            page.drawText(lignes[li], {
              x: x0 + colVal.marge,
              y: curY,
              size: fontSize,
              font,
              color: COULEUR_BLEU_MARINE
            });
            curY -= (fontSize + 2.0);
          }
        } else {
          const { size, w, overflow } = ajusterTaillePolice(val, font, TAILLE_DEFAUT, availWidth);
          if (overflow) {
            warnings.push(`DÉBORDEMENT: champ "${champ.id}" ("${val}") dépasse la cellule à ${size}pt.`);
          }

          let x = x0 + colVal.marge;
          if (champ.align === "c" || champ.align === "center") {
            x = x0 + (x1 - x0 - w) / 2;
          }

          page.drawText(val, {
            x,
            y: champ.base,
            size,
            font,
            color: COULEUR_BLEU_MARINE
          });
        }
      }
    }

    // Signature + Nom et Prénom en bas
    const nomInvestigateurs = cleanVal(donnees.signature_investigateurs || donnees.signature_nom || donnees.ascq_nom);
    if (donnees.signature_tactile || nomInvestigateurs) {
      await dessinerSignature(
        pdfDoc,
        page,
        { x0: 392.0, x1: 555.0, y0: 5.0, y1: 36.0, base: 5.5 },
        donnees.signature_tactile,
        nomInvestigateurs,
        font
      );
    }
  }

  // =========================================================================
  // TYPE RAP : Rapport hebdomadaire
  // =========================================================================
  else if (typeFiche === "RAP") {
    const page = pdfDoc.getPage(0);

    // 1. En-tête
    if (fieldMap.champsEnTete) {
      for (const slot of fieldMap.champsEnTete) {
        const val = cleanVal(donnees[slot.id]);
        if (!val) continue;
        dessinerSlot(page, font, slot, val, warnings);
      }
    }

    // 2. Tableaux de valeurs (Alertes & Décès)
    if (fieldMap.tableauxValeurs) {
      const col = fieldMap.tableauxValeurs.colValeur;
      const availWidth = col.x1 - col.x0 - 2 * MARGE_TEXTE;

      for (const ligne of fieldMap.tableauxValeurs.lignes) {
        const val = cleanVal(donnees[ligne.id]);
        if (!val) continue;

        const { size, w, overflow } = ajusterTaillePolice(val, font, TAILLE_DEFAUT, availWidth);
        if (overflow) {
          warnings.push(`DÉBORDEMENT: rapport hebdo ligne "${ligne.id}" dépasse à ${size}pt.`);
        }

        let x = col.x0 + MARGE_TEXTE;
        if (col.align === "c") {
          x = col.x0 + (col.x1 - col.x0 - w) / 2;
        }

        page.drawText(val, {
          x,
          y: ligne.base + DECALAGE_LIGNE_BASE,
          size,
          font,
          color: COULEUR_BLEU_MARINE
        });
      }
    }

    // 3. Actions menées (28 lignes pointillées)
    const actionsTexte = cleanVal(donnees.actions_menees);
    if (actionsTexte && fieldMap.lignesPointillees) {
      const cfg = fieldMap.lignesPointillees;
      const availWidth = cfg.x1 - cfg.x0 - 2 * MARGE_TEXTE;
      let fontSize = TAILLE_DEFAUT;
      let lignes = wrapText(actionsTexte, font, fontSize, availWidth);
      const maxLignes = cfg.yBaselines.length;

      while (lignes.length > maxLignes && fontSize > TAILLE_MIN) {
        fontSize -= 0.5;
        lignes = wrapText(actionsTexte, font, fontSize, availWidth);
      }

      if (lignes.length > maxLignes) {
        warnings.push(`DÉBORDEMENT: "Actions menées" dépasse les 28 lignes officielles (${lignes.length} lignes).`);
      }

      for (let i = 0; i < Math.min(lignes.length, maxLignes); i++) {
        const yBaseline = cfg.yBaselines[i];
        page.drawText(lignes[i], {
          x: cfg.x0 + MARGE_TEXTE,
          y: yBaseline + DECALAGE_LIGNE_BASE,
          size: fontSize,
          font,
          color: COULEUR_BLEU_MARINE
        });
      }
    }

    // 4. Signature de l'ASCQ + Nom et Prénom en bas sous "Nom et signature du rapporteur"
    const nomRapporteur = cleanVal(donnees.signature_nom || donnees.signature_rapporteur || donnees.rapporteur_nom);
    if (donnees.signature_tactile || nomRapporteur) {
      await dessinerSignature(
        pdfDoc,
        page,
        { x0: 380.0, x1: 565.0, y0: 14.0, y1: 56.0, base: 14.5 },
        donnees.signature_tactile,
        nomRapporteur,
        font
      );
    }
  }

  // 4. Sauvegarde finale
  const pdfBytes = await pdfDoc.save();
  let blobUrl = "";
  if (typeof window !== "undefined") {
    const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
    blobUrl = URL.createObjectURL(blob);
  }

  const nomFichier = genererNomFichierOfficiel(typeFiche, donnees);

  return {
    pdfBytes,
    blobUrl,
    warnings,
    nbPages: pdfDoc.getPageCount(),
    nomFichier
  };
}
