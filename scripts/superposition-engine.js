const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

// Field maps
const FIELD_MAPS = {
  REG: require('../src/lib/pdf-superposition/field-maps/carte_01_registre_alertes.json'),
  ALR: require('../src/lib/pdf-superposition/field-maps/carte_02_notification_alerte.json'),
  DEC: require('../src/lib/pdf-superposition/field-maps/carte_03_notification_deces.json'),
  INV: require('../src/lib/pdf-superposition/field-maps/carte_04_investigation_evenement.json'),
  RAP: require('../src/lib/pdf-superposition/field-maps/carte_05_rapport_hebdomadaire.json')
};

function cleanVal(v) {
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  if (s === "undefined" || s === "null" || s === "NaN") return "";
  return s;
}

function wrapText(text, font, fontSize, maxWidth) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines = [];
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

function fitFontSize(text, font, initialSize, maxWidth, minSize = 7) {
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

function genererNomFichierOfficiel(typeFiche, data) {
  const sanitize = (s) =>
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

async function genererFiche(typeFiche, donnees, isVierge = false) {
  const fieldMap = FIELD_MAPS[typeFiche];
  if (!fieldMap) throw new Error(`Modèle de fiche inconnu : ${typeFiche}`);

  const warnings = [];
  const templatePath = path.join(__dirname, '..', 'public', fieldMap.modelePdf.replace(/^\//, ''));
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  const fontRegBytes = fs.readFileSync(path.join(__dirname, '..', 'public', 'fonts', 'Carlito-Regular.ttf'));
  const fontBoldBytes = fs.readFileSync(path.join(__dirname, '..', 'public', 'fonts', 'Carlito-Bold.ttf'));
  const fontRegular = await pdfDoc.embedFont(fontRegBytes);
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);

  if (isVierge) {
    const pdfBytes = await pdfDoc.save();
    return {
      pdfBytes,
      warnings: [],
      nbPages: pdfDoc.getPageCount(),
      nomFichier: `BJ_${typeFiche}_VIERGE_OFFICIEL.pdf`
    };
  }

  // REG
  if (typeFiche === 'REG') {
    const lignes = Array.isArray(donnees.lignes) ? donnees.lignes : [];
    const lignesParPage = fieldMap.lignesParPage || 11;
    const nbPagesNecessaires = Math.max(1, Math.ceil(lignes.length / lignesParPage));

    for (let p = 1; p < nbPagesNecessaires; p++) {
      const [nouvellePage] = await pdfDoc.copyPages(pdfDoc, [0]);
      pdfDoc.addPage(nouvellePage);
    }

    for (let pageIdx = 0; pageIdx < nbPagesNecessaires; pageIdx++) {
      const page = pdfDoc.getPage(pageIdx);

      if (fieldMap.champsEnTete) {
        for (const champ of fieldMap.champsEnTete) {
          const rawVal = donnees[champ.id];
          const val = cleanVal(rawVal);
          if (!val) continue;

          const font = champ.police === "bold" ? fontBold : fontRegular;
          const { size, overflow } = fitFontSize(val, font, champ.taille || 9, champ.largeur);
          if (overflow) warnings.push(`Champ "${champ.id}" réduit à ${size}pt.`);

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
          if (col.id === "numero" && !val) {
            val = String(debutLignes + rIdx + 1);
          }
          if (!val) continue;

          const font = col.police === "bold" ? fontBold : fontRegular;
          const { size, overflow } = fitFontSize(val, font, col.taille || 8.5, col.largeur);
          if (overflow) warnings.push(`Ligne ${debutLignes + rIdx + 1}, colonne "${col.id}" réduite à ${size}pt.`);

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
  } else if (typeFiche === 'RAP') {
    const page = pdfDoc.getPage(0);

    if (fieldMap.champs) {
      for (const champ of fieldMap.champs) {
        const rawVal = donnees[champ.id];
        const val = cleanVal(rawVal);
        if (!val) continue;

        const font = champ.police === "bold" ? fontBold : fontRegular;
        const { size, overflow } = fitFontSize(val, font, champ.taille || 9.5, champ.largeur);
        if (overflow) warnings.push(`Champ "${champ.id}" réduit à ${size}pt.`);

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

    const actionsTexte = cleanVal(donnees.actions_menees);
    if (actionsTexte && fieldMap.lignesPointillees) {
      const cfg = fieldMap.lignesPointillees;
      let fontSize = 9.5;
      let lines = wrapText(actionsTexte, fontRegular, fontSize, cfg.largeur);

      while (lines.length > cfg.maxLignes && fontSize > 7.0) {
        fontSize -= 0.5;
        lines = wrapText(actionsTexte, fontRegular, fontSize, cfg.largeur);
      }

      if (lines.length > cfg.maxLignes) {
        warnings.push(`Le texte "Actions menées" dépasse les 28 lignes officielles (${lines.length} lignes générées).`);
      }

      const totalLignes = Math.min(lines.length, cfg.maxLignes);
      for (let i = 0; i < totalLignes; i++) {
        const ligneTexte = lines[i];
        const yBaseline = cfg.yBaselines[i];
        if (yBaseline) {
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
  } else {
    const page = pdfDoc.getPage(0);
    if (fieldMap.champs) {
      for (const champ of fieldMap.champs) {
        let rawVal = donnees[champ.id];

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

        if (champ.type === "multiligne") {
          const baseSize = champ.taille || 9;
          const lines = wrapText(val, font, baseSize, champ.largeur);
          const lineHeight = baseSize + 2.5;
          let currentY = champ.y + champ.hauteur - baseSize;

          for (const ligne of lines) {
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

        const { size, overflow } = fitFontSize(val, font, champ.taille || 9.5, champ.largeur);
        if (overflow) warnings.push(`Champ "${champ.id}" réduit à ${size}pt.`);

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

  const pdfBytes = await pdfDoc.save();
  const nomFichier = genererNomFichierOfficiel(typeFiche, donnees);

  return {
    pdfBytes,
    warnings,
    nbPages: pdfDoc.getPageCount(),
    nomFichier
  };
}

module.exports = {
  FIELD_MAPS,
  genererFiche,
  cleanVal,
  wrapText,
  fitFontSize,
  genererNomFichierOfficiel
};
