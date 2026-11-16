import { PDFDocument, rgb, PDFFont, PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { FieldMap, FieldDefinition, GenerationOptions, GenerationResult } from "./types";
import { FIELD_MAPS } from "./field-maps";

// Cache mémoire des octets de modèles et de polices pour éviter les re-téléchargements inutiles
const memoryCache: Record<string, Uint8Array> = {};

async function fetchBytes(urlOrPath: string): Promise<Uint8Array> {
  if (memoryCache[urlOrPath]) {
    return memoryCache[urlOrPath];
  }

  // Environnement Node.js (tests ou scripts locaux)
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

  // Environnement Navigateur client (aucun envoi de données, fetch de ressource statique locale)
  const response = await fetch(urlOrPath);
  if (!response.ok) {
    throw new Error(`Impossible de charger la ressource ${urlOrPath} : statut ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  memoryCache[urlOrPath] = uint8;
  return uint8;
}

/**
 * Nettoie une valeur : renvoie chaîne vide si null/undefined/NaN/"undefined"/"null"
 */
function cleanVal(v: any): string {
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  if (s === "undefined" || s === "null" || s === "NaN") return "";
  return s;
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
 * Calcule la taille de police adaptée pour ne jamais déborder d'une case (min 7pt)
 */
function fitFontSize(
  text: string,
  font: PDFFont,
  initialSize: number,
  maxWidth: number,
  minSize: number = 7
): { size: number; overflow: boolean } {
  let size = initialSize;
  let textWidth = font.widthOfTextAtSize(text, size);

  while (textWidth > maxWidth && size > minSize) {
    size -= 0.5;
    textWidth = font.widthOfTextAtSize(text, size);
  }

  return {
    size,
    overflow: textWidth > maxWidth
  };
}

/**
 * Construit le nom de fichier officiel selon la convention :
 * BJ_[TYPE]_[SEMAINE ou DATE]_[VILLAGE].pdf
 */
export function genererNomFichierOfficiel(
  typeFiche: string,
  data: Record<string, any>
): string {
  const sanitize = (s: string) =>
    (s || "SANS_NOM")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .toUpperCase();

  const type = sanitize(typeFiche);
  const dateOrSemaine = sanitize(
    data.semaine_epidemio
      ? `S${data.semaine_epidemio}`
      : data.semaine_num
      ? `S${data.semaine_num}`
      : data.date_survenue || data.date || data.date_deces || data.date_notification || new Date().toISOString().split("T")[0]
  );
  const village = sanitize(data.village || data.arrondissement || data.commune || "COMMUNAUTE");

  return `BJ_${type}_${dateOrSemaine}_${village}.pdf`;
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

  // 2. Charger et intégrer la police Carlito (équivalent métrique libre de Calibri)
  const fontRegularBytes = await fetchBytes("/fonts/Carlito-Regular.ttf");
  const fontBoldBytes = await fetchBytes("/fonts/Carlito-Bold.ttf");
  const fontRegular = await pdfDoc.embedFont(fontRegularBytes);
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);

  // Si modèle vierge demandé, retourner le PDF original non altéré
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
      nomFichier: `BJ_${typeFiche}_VIERGE_OFFICIEL.pdf`
    };
  }

  // 3. Traitement selon le type de fiche

  // =========================================================================
  // TYPE REG : Registre (pagination 11 lignes par page avec copie de page)
  // =========================================================================
  if (typeFiche === "REG") {
    const lignes = Array.isArray(donnees.lignes) ? donnees.lignes : [];
    const lignesParPage = fieldMap.lignesParPage || 11;
    const nbPagesNecessaires = Math.max(1, Math.ceil(lignes.length / lignesParPage));

    // Cloner la page du modèle pour les pages suivantes
    for (let p = 1; p < nbPagesNecessaires; p++) {
      const [nouvellePage] = await pdfDoc.copyPages(pdfDoc, [0]);
      pdfDoc.addPage(nouvellePage);
    }

    // Remplir chaque page
    for (let pageIdx = 0; pageIdx < nbPagesNecessaires; pageIdx++) {
      const page = pdfDoc.getPage(pageIdx);

      // En-tête de la page
      if (fieldMap.champsEnTete) {
        for (const champ of fieldMap.champsEnTete) {
          const rawVal = donnees[champ.id];
          const val = cleanVal(rawVal);
          if (!val) continue;

          const font = champ.police === "bold" ? fontBold : fontRegular;
          const { size, overflow } = fitFontSize(val, font, champ.taille || 9, champ.largeur);
          if (overflow) {
            warnings.push(`Champ "${champ.id}" réduit à ${size}pt.`);
          }

          let drawX = champ.x;
          if (champ.alignement === "center") {
            const w = font.widthOfTextAtSize(val, size);
            drawX = champ.x + Math.max(0, (champ.largeur - w) / 2);
          }

          page.drawText(val, {
            x: drawX,
            y: champ.y,
            size,
            font,
            color: rgb(0, 0, 0)
          });
        }
      }

      // Lignes de tableau pour cette page
      const debutLignes = pageIdx * lignesParPage;
      const finLignes = Math.min(debutLignes + lignesParPage, lignes.length);
      const lignesCettePage = lignes.slice(debutLignes, finLignes);
      const yRanges = fieldMap.yRangées || [];

      for (let rIdx = 0; rIdx < lignesCettePage.length; rIdx++) {
        const item = lignesCettePage[rIdx];
        const yBase = yRanges[rIdx];
        if (!yBase || !fieldMap.colonnesTableau) continue;

        for (const col of fieldMap.colonnesTableau) {
          let val = cleanVal(item[col.id]);
          // Numéro automatique si manquant
          if (col.id === "numero" && !val) {
            val = String(debutLignes + rIdx + 1);
          }
          if (!val) continue;

          const font = col.police === "bold" ? fontBold : fontRegular;
          const { size, overflow } = fitFontSize(val, font, col.taille || 8.5, col.largeur);
          if (overflow) {
            warnings.push(`Ligne ${debutLignes + rIdx + 1}, colonne "${col.id}" réduite à ${size}pt.`);
          }

          let drawX = col.x;
          if (col.alignement === "center") {
            const w = font.widthOfTextAtSize(val, size);
            drawX = col.x + Math.max(0, (col.largeur - w) / 2);
          } else if (col.alignement === "right") {
            const w = font.widthOfTextAtSize(val, size);
            drawX = col.x + Math.max(0, col.largeur - w);
          }

          page.drawText(val, {
            x: drawX,
            y: yBase,
            size,
            font,
            color: rgb(0, 0, 0)
          });
        }
      }
    }
  }

  // =========================================================================
  // TYPE RAP : Rapport Hebdomadaire (champs + tableaux + 28 lignes pointillées)
  // =========================================================================
  else if (typeFiche === "RAP") {
    const page = pdfDoc.getPage(0);

    // 1. Remplissage des champs simples
    if (fieldMap.champs) {
      for (const champ of fieldMap.champs) {
        const rawVal = donnees[champ.id];
        const val = cleanVal(rawVal);
        if (!val) continue;

        const font = champ.police === "bold" ? fontBold : fontRegular;
        const { size, overflow } = fitFontSize(val, font, champ.taille || 9.5, champ.largeur);
        if (overflow) {
          warnings.push(`Champ "${champ.id}" réduit à ${size}pt.`);
        }

        let drawX = champ.x;
        if (champ.alignement === "center") {
          const w = font.widthOfTextAtSize(val, size);
          drawX = champ.x + Math.max(0, (champ.largeur - w) / 2);
        }

        page.drawText(val, {
          x: drawX,
          y: champ.y,
          size,
          font,
          color: rgb(0, 0, 0)
        });
      }
    }

    // 2. Remplissage des actions menées sur les lignes pointillées
    const actionsTexte = cleanVal(donnees.actions_menees);
    if (actionsTexte && fieldMap.lignesPointillees) {
      const cfg = fieldMap.lignesPointillees;
      let fontSize = 9.5;
      let lignes = wrapText(actionsTexte, fontRegular, fontSize, cfg.largeur);

      // Si débordement au-delà de 28 lignes, réduire jusqu'à 7pt
      while (lignes.length > cfg.maxLignes && fontSize > 7.0) {
        fontSize -= 0.5;
        lignes = wrapText(actionsTexte, fontRegular, fontSize, cfg.largeur);
      }

      if (lignes.length > cfg.maxLignes) {
        warnings.push(`Le texte "Actions menées" dépasse les 28 lignes officielles (${lignes.length} lignes générées).`);
      }

      const totalLignes = Math.min(lignes.length, cfg.maxLignes);
      for (let i = 0; i < totalLignes; i++) {
        const ligneTexte = lignes[i];
        const yBaseline = cfg.yBaselines[i];
        if (yBaseline) {
          // Poser le texte juste au-dessus du pointillé (+2pt)
          page.drawText(ligneTexte, {
            x: cfg.xDebut,
            y: yBaseline + 2.0,
            size: fontSize,
            font: fontRegular,
            color: rgb(0, 0, 0)
          });
        }
      }
    }
  }

  // =========================================================================
  // TYPES ALR, DEC, INV : Fiches standards
  // =========================================================================
  else {
    const page = pdfDoc.getPage(0);
    if (fieldMap.champs) {
      for (const champ of fieldMap.champs) {
        // Extraction de la valeur
        let rawVal = donnees[champ.id];

        // Dérivation intelligente des dates (ex: date_deces -> date_deces_jour, mois, annee)
        if (champ.type.startsWith("date_") && (rawVal === undefined || rawVal === null || rawVal === "")) {
          const prefix = champ.id.replace(/_(jour|mois|annee)$/, "");
          const sourceDate = cleanVal(donnees[prefix] || donnees[`${prefix}_date`]);
          if (sourceDate) {
            const parts = sourceDate.includes("-") ? sourceDate.split("-") : sourceDate.split("/");
            if (parts.length === 3) {
              if (champ.type === "date_jour") {
                rawVal = parts[0].length === 4 ? parts[2] : parts[0];
              } else if (champ.type === "date_mois") {
                rawVal = parts[1];
              } else if (champ.type === "date_annee") {
                rawVal = parts[0].length === 4 ? parts[0] : parts[2];
              }
            }
          }
        }

        // Cas particuliers : Cases à cocher
        if (champ.type === "case_a_cocher") {
          let coche = false;
          if (champ.id === "sexe_m") {
            coche = donnees.sexe === "M" || donnees.sexe_m === true;
          } else if (champ.id === "sexe_f") {
            coche = donnees.sexe === "F" || donnees.sexe_f === true;
          } else {
            coche = Boolean(rawVal);
          }

          if (coche) {
            // Dessiner une croix 'X' centrée dans la case
            const crossSize = 9;
            const wX = fontBold.widthOfTextAtSize("X", crossSize);
            const drawX = champ.x + Math.max(0, (champ.largeur - wX) / 2);
            const drawY = champ.y + Math.max(0, (champ.hauteur - crossSize) / 2) + 1;

            page.drawText("X", {
              x: drawX,
              y: drawY,
              size: crossSize,
              font: fontBold,
              color: rgb(0, 0, 0)
            });
          }
          continue;
        }

        const val = cleanVal(rawVal);
        if (!val) continue;

        const font = champ.police === "bold" ? fontBold : fontRegular;

        // Cas multilinge
        if (champ.type === "multiligne") {
          const baseSize = champ.taille || 9;
          const lignes = wrapText(val, font, baseSize, champ.largeur);
          const lineHeight = baseSize + 2.5;
          let currentY = champ.y + champ.hauteur - baseSize;

          for (const ligne of lignes) {
            if (currentY < champ.y) {
              warnings.push(`Champ multiligne "${champ.id}" a débordé de sa boîte.`);
              break;
            }
            page.drawText(ligne, {
              x: champ.x,
              y: currentY,
              size: baseSize,
              font,
              color: rgb(0, 0, 0)
            });
            currentY -= lineHeight;
          }
          continue;
        }

        // Texte standard ou nombre
        const { size, overflow } = fitFontSize(val, font, champ.taille || 9.5, champ.largeur);
        if (overflow) {
          warnings.push(`Champ "${champ.id}" réduit à ${size}pt.`);
        }

        let drawX = champ.x;
        if (champ.alignement === "center") {
          const w = font.widthOfTextAtSize(val, size);
          drawX = champ.x + Math.max(0, (champ.largeur - w) / 2);
        } else if (champ.alignement === "right") {
          const w = font.widthOfTextAtSize(val, size);
          drawX = champ.x + Math.max(0, champ.largeur - w);
        }

        page.drawText(val, {
          x: drawX,
          y: champ.y,
          size,
          font,
          color: rgb(0, 0, 0)
        });
      }
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
