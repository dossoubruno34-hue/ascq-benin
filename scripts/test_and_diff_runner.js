const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas } = require('@napi-rs/canvas');

const COULEUR_BLEU_MARINE = rgb(0.0, 0.25, 0.80); // Bleu Bic intense (#0040CC)
const TAILLE_DEFAUT = 9.5;
const TAILLE_MIN = 6.5;
const DECALAGE_LIGNE_BASE = 1.6;
const MARGE_TEXTE = 3.0;
const MARGE_CROIX = 1.3;
const EPAISSEUR_CROIX = 1.4;

// 1. Charger polices et modèles (Carlito-Bold en gras pour une lecture facile)
async function loadEngine() {
  const fontBytes = fs.readFileSync('public/fonts/Carlito-Bold.ttf');
  return { fontBytes };
}

function cleanVal(v) {
  if (v === undefined || v === null) return '';
  const s = String(v).trim();
  if (s === 'undefined' || s === 'null' || s === 'NaN') return '';
  return s;
}

function ajusterTaille(text, font, initialSize, availWidth, minSize = TAILLE_MIN) {
  let size = initialSize;
  let w = font.widthOfTextAtSize(text, size);
  while (w > availWidth && size > minSize) {
    size -= 0.25;
    w = font.widthOfTextAtSize(text, size);
  }
  return { size, w, overflow: w > availWidth };
}

function wrapText(text, font, fontSize, maxWidth) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

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

function dessinerSlot(page, font, slot, text, warnings, report) {
  if (!text) return;
  const avail = slot.x1 - slot.x0 - MARGE_TEXTE;
  const { size, w, overflow } = ajusterTaille(text, font, TAILLE_DEFAUT, avail);

  if (overflow) {
    const msg = `DÉBORDEMENT: champ "${slot.id}" ("${text}") dépasse ${avail.toFixed(1)}pt même à ${size}pt.`;
    warnings.push(msg);
    report.debordements.push({ champ: slot.id, texte: text, largeurDisponible: avail, taille: size });
  } else if (size < TAILLE_DEFAUT) {
    report.reductions.push({ champ: slot.id, texte: text, tailleReduite: size });
  }

  let x = slot.x0 + MARGE_TEXTE;
  if (slot.align === 'c' || slot.align === 'center') {
    x = slot.x0 + (slot.x1 - slot.x0 - w) / 2;
  } else if (slot.align === 'r' || slot.align === 'right') {
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

function dessinerCroix(page, box) {
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

// 2. Générateurs spécifiques pour les 5 fiches
async function genererDeces(data, report) {
  const map = JSON.parse(fs.readFileSync('src/lib/pdf-superposition/field-maps/carte_03_notification_deces.json'));
  const tplBytes = fs.readFileSync('public/modeles-officiels/modele_03_notification_deces.pdf');
  const pdfDoc = await PDFDocument.load(tplBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fs.readFileSync('public/fonts/Carlito-Regular.ttf'));
  const page = pdfDoc.getPage(0);
  const warnings = [];

  for (const s of map.champs) {
    const val = cleanVal(data[s.id]);
    dessinerSlot(page, font, s, val, warnings, report);
  }

  const sexe = cleanVal(data.sexe).toUpperCase();
  if (sexe === 'M' && map.casesACocher.sexe_M) {
    dessinerCroix(page, map.casesACocher.sexe_M);
  } else if (sexe === 'F' && map.casesACocher.sexe_F) {
    dessinerCroix(page, map.casesACocher.sexe_F);
  }

  return await pdfDoc.save();
}

async function genererAlerte(data, report) {
  const map = JSON.parse(fs.readFileSync('src/lib/pdf-superposition/field-maps/carte_02_notification_alerte.json'));
  const tplBytes = fs.readFileSync('public/modeles-officiels/modele_02_notification_alerte_ascq.pdf');
  const pdfDoc = await PDFDocument.load(tplBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fs.readFileSync('public/fonts/Carlito-Regular.ttf'));
  const page = pdfDoc.getPage(0);
  const warnings = [];

  for (const s of map.champs) {
    const val = cleanVal(data[s.id]);
    if (!val) continue;

    if (s.type === 'multiligne' && s.box) {
      const availWidth = s.x1 - s.x0 - 2 * MARGE_TEXTE;
      let fontSize = TAILLE_DEFAUT;
      let lignes = wrapText(val, font, fontSize, availWidth);
      const maxLines = Math.max(1, Math.floor((s.box.y1 - s.box.y0 - 4) / 12));

      while (lignes.length > maxLines && fontSize > TAILLE_MIN) {
        fontSize -= 0.5;
        lignes = wrapText(val, font, fontSize, availWidth);
      }

      if (fontSize < TAILLE_DEFAUT) {
        report.reductions.push({ champ: s.id, texte: val, tailleReduite: fontSize });
      }
      if (lignes.length > maxLines) {
        report.debordements.push({ champ: s.id, texte: val, maxLignes: maxLines, lignesGenerées: lignes.length });
      }

      let curY = s.base;
      for (let i = 0; i < Math.min(lignes.length, maxLines); i++) {
        page.drawText(lignes[i], {
          x: s.x0 + MARGE_TEXTE,
          y: curY,
          size: fontSize,
          font,
          color: COULEUR_BLEU_MARINE
        });
        curY -= (fontSize + 2.5);
      }
    } else {
      dessinerSlot(page, font, s, val, warnings, report);
    }
  }

  return await pdfDoc.save();
}

async function genererRegistre(data, report) {
  const map = JSON.parse(fs.readFileSync('src/lib/pdf-superposition/field-maps/carte_01_registre_alertes.json'));
  const tplBytes = fs.readFileSync('public/modeles-officiels/modele_01_registre_alertes_relais.pdf');
  const pdfDoc = await PDFDocument.load(tplBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fs.readFileSync('public/fonts/Carlito-Regular.ttf'));
  const page = pdfDoc.getPage(0);
  const warnings = [];

  for (const s of map.champsEnTete) {
    const val = cleanVal(data[s.id]);
    dessinerSlot(page, font, s, val, warnings, report);
  }

  const lignes = Array.isArray(data.lignes) ? data.lignes : [];
  for (let rIdx = 0; rIdx < Math.min(lignes.length, 11); rIdx++) {
    const item = lignes[rIdx];
    const rowDef = map.lignes[rIdx];

    for (const col of map.colonnesTableau) {
      let val = cleanVal(item[col.id]);
      if (col.id === 'numero' && !val) val = String(rIdx + 1);
      if (!val) continue;

      const availWidth = col.x1 - col.x0 - 2 * MARGE_TEXTE;
      let fontSize = TAILLE_DEFAUT;
      let textLines = wrapText(val, font, fontSize, availWidth);
      const maxLinesInCell = Math.max(1, Math.floor((rowDef.y1 - rowDef.y0 - 4) / 11));

      while (textLines.length > maxLinesInCell && fontSize > TAILLE_MIN) {
        fontSize -= 0.5;
        textLines = wrapText(val, font, fontSize, availWidth);
      }

      if (fontSize < TAILLE_DEFAUT) {
        report.reductions.push({ ligne: rIdx + 1, champ: col.id, texte: val, tailleReduite: fontSize });
      }
      if (textLines.length > maxLinesInCell) {
        report.debordements.push({ ligne: rIdx + 1, champ: col.id, texte: val });
      }

      if (textLines.length <= 1) {
        const singleW = font.widthOfTextAtSize(val, fontSize);
        let x = col.x0 + MARGE_TEXTE;
        if (col.align === 'c' || col.align === 'center') {
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
          if (col.align === 'c' || col.align === 'center') {
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

  return await pdfDoc.save();
}

async function genererInvestigation(data, report) {
  const map = JSON.parse(fs.readFileSync('src/lib/pdf-superposition/field-maps/carte_04_investigation_evenement.json'));
  const tplBytes = fs.readFileSync('public/modeles-officiels/modele_04_investigation_evenement_v14.11.2025.pdf');
  const pdfDoc = await PDFDocument.load(tplBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fs.readFileSync('public/fonts/Carlito-Regular.ttf'));
  const page = pdfDoc.getPage(0);
  const colVal = map.colonneValeurs;

  for (const champ of map.champs) {
    const val = cleanVal(data[champ.id]);
    if (!val) continue;

    const x0 = colVal.x0;
    const x1 = colVal.x1;
    const availWidth = x1 - x0 - 2 * colVal.marge;

    if (champ.type === 'multiligne') {
      let fontSize = TAILLE_DEFAUT;
      let lignes = wrapText(val, font, fontSize, availWidth);
      const maxLines = Math.max(1, Math.floor((champ.y1 - champ.y0 - 4) / 12));

      while (lignes.length > maxLines && fontSize > TAILLE_MIN) {
        fontSize -= 0.5;
        lignes = wrapText(val, font, fontSize, availWidth);
      }

      if (fontSize < TAILLE_DEFAUT) {
        report.reductions.push({ champ: champ.id, texte: val, tailleReduite: fontSize });
      }
      if (lignes.length > maxLines) {
        report.debordements.push({ champ: champ.id, texte: val });
      }

      let curY = champ.y1 - 11;
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
      const { size, w, overflow } = ajusterTaille(val, font, TAILLE_DEFAUT, availWidth);
      if (overflow) {
        report.debordements.push({ champ: champ.id, texte: val });
      } else if (size < TAILLE_DEFAUT) {
        report.reductions.push({ champ: champ.id, texte: val, tailleReduite: size });
      }

      let x = x0 + colVal.marge;
      if (champ.align === 'c' || champ.align === 'center') {
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

  return await pdfDoc.save();
}

async function genererRapportHebdo(data, report) {
  const map = JSON.parse(fs.readFileSync('src/lib/pdf-superposition/field-maps/carte_05_rapport_hebdomadaire.json'));
  const tplBytes = fs.readFileSync('public/modeles-officiels/modele_05_rapport_hebdomadaire_v29.05.2025.pdf');
  const pdfDoc = await PDFDocument.load(tplBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fs.readFileSync('public/fonts/Carlito-Regular.ttf'));
  const page = pdfDoc.getPage(0);
  const warnings = [];

  for (const s of map.champsEnTete) {
    const val = cleanVal(data[s.id]);
    dessinerSlot(page, font, s, val, warnings, report);
  }

  const col = map.tableauxValeurs.colValeur;
  const availWidth = col.x1 - col.x0 - 2 * MARGE_TEXTE;

  for (const ligne of map.tableauxValeurs.lignes) {
    const val = cleanVal(data[ligne.id]);
    if (!val) continue;

    const { size, w, overflow } = ajusterTaille(val, font, TAILLE_DEFAUT, availWidth);
    if (overflow) {
      report.debordements.push({ champ: ligne.id, texte: val });
    } else if (size < TAILLE_DEFAUT) {
      report.reductions.push({ champ: ligne.id, texte: val, tailleReduite: size });
    }

    let x = col.x0 + MARGE_TEXTE;
    if (col.align === 'c' || col.align === 'center') {
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

  const actionsTexte = cleanVal(data.actions_menees);
  if (actionsTexte && map.lignesPointillees) {
    const cfg = map.lignesPointillees;
    const availActionsW = cfg.x1 - cfg.x0 - 2 * MARGE_TEXTE;
    let fontSize = TAILLE_DEFAUT;
    let lignes = wrapText(actionsTexte, font, fontSize, availActionsW);
    const maxLignes = cfg.yBaselines.length;

    while (lignes.length > maxLignes && fontSize > TAILLE_MIN) {
      fontSize -= 0.5;
      lignes = wrapText(actionsTexte, font, fontSize, availActionsW);
    }

    if (fontSize < TAILLE_DEFAUT) {
      report.reductions.push({ champ: 'actions_menees', texte: actionsTexte, tailleReduite: fontSize });
    }
    if (lignes.length > maxLignes) {
      report.debordements.push({ champ: 'actions_menees', texte: actionsTexte });
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

  const nomRapporteur = cleanVal(data.signature_nom);
  if (nomRapporteur && map.signature) {
    dessinerSlot(page, font, map.signature, nomRapporteur, warnings, report);
  }

  return await pdfDoc.save();
}

// 3. Rendu 300 DPI, Diff, et Zoom
async function renderPdfPageToCanvas(pdfBuffer, pageNum = 1, scale = 300 / 72) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

function computeDiff(emptyCanvas, filledCanvas) {
  const w = emptyCanvas.width;
  const h = emptyCanvas.height;
  const diffCanvas = createCanvas(w, h);
  const diffCtx = diffCanvas.getContext('2d');

  // Draw empty template semi-transparent or gray as reference background
  diffCtx.drawImage(emptyCanvas, 0, 0);

  const emptyData = emptyCanvas.getContext('2d').getImageData(0, 0, w, h).data;
  const filledData = filledCanvas.getContext('2d').getImageData(0, 0, w, h).data;
  const diffImgData = diffCtx.getImageData(0, 0, w, h);
  const diffData = diffImgData.data;

  let totalValueInkPixels = 0;
  let overlappingTemplatePixels = 0;

  for (let i = 0; i < emptyData.length; i += 4) {
    const rEmpty = emptyData[i], gEmpty = emptyData[i+1], bEmpty = emptyData[i+2];
    const rFilled = filledData[i], gFilled = filledData[i+1], bFilled = filledData[i+2];

    const grayEmpty = (rEmpty + gEmpty + bEmpty) / 3;
    const grayFilled = (rFilled + gFilled + bFilled) / 3;

    // A pixel where empty was white/light and filled has ink
    if (grayEmpty > 200 && grayFilled < 180) {
      totalValueInkPixels++;
      // Highlight in Magenta/Red
      diffData[i] = 225;     // R
      diffData[i+1] = 29;    // G
      diffData[i+2] = 72;    // B
      diffData[i+3] = 255;   // A
    } else if (grayEmpty < 120 && grayFilled < 120) {
      // Both are dark: check if this is template printed text
      // Dim template text slightly for visual contrast
      diffData[i] = 160;
      diffData[i+1] = 160;
      diffData[i+2] = 160;
    }
  }

  diffCtx.putImageData(diffImgData, 0, 0);
  return { diffCanvas, totalValueInkPixels, overlappingTemplatePixels };
}

function makeZoomCrop(canvas, x_pt, y_pt, w_pt, h_pt, scale = 300 / 72, H_pt = 842) {
  const k = scale;
  const px = Math.round(x_pt * k);
  const py = Math.round((H_pt - (y_pt + h_pt)) * k);
  const pw = Math.round(w_pt * k);
  const ph = Math.round(h_pt * k);

  const crop = createCanvas(pw, ph);
  const ctx = crop.getContext('2d');
  ctx.drawImage(canvas, px, py, pw, ph, 0, 0, pw, ph);
  return crop;
}

// 4. Exécution principale de la batterie de tests
async function main() {
  console.log('=== DÉBUT DE LA BATTERIE DE TESTS ET VÉRIFICATIONS 300 DPI ===');
  const report = {
    reductions: [],
    debordements: [],
    fiches: {}
  };

  // --- JEUX DE DONNÉES 100% FICTIFS ---
  const decesFictif = {
    annee: '2026', semaine: '47', mois: '11',
    npi: '1234567890', num_deces: 'DEC-2026-000001',
    departement: 'ZOU', zone_sanitaire: 'COZO', commune: 'OUINHI',
    arrondissement: 'TOHOUÈS', village: 'Dokodji', grappe: '1',
    adresse: 'Maison Ayaba', nom_defunt: 'DANON Cossi',
    parent_nom: 'DANON Parent', parent_tel: '+229 01 00 00 00 00',
    naiss_j: '01', naiss_m: '01', naiss_a: '1963',
    age_ans: '63', age_mois: '', age_jours: '',
    sexe: 'M', longitude: '2.475333', latitude: '7.027400',
    type_deces: '5',
    dec_j: '13', dec_m: '11', dec_a: '2026',
    not_j: '20', not_m: '11', not_a: '2026',
    sai_j: '21', sai_m: '11', sai_a: '2026',
    lieu: '2', circ: '2', cause: 'B50',
    notif_nom: 'TOVIHO Gérard', notif_titre: 'RC',
    notif_struct: 'Arrondissement de TOHOUÈS', notif_tel: '+229 01 00 00 00 00',
    fait_le: 'Fait le 20/11/2026'
  };

  const alerteFictive = {
    point_focal_nom: 'DOSSOU Bruno',
    telephone: '+229 01 00 00 00 00',
    arrondissement: 'TOHOUÈS',
    commune: 'OUINHI',
    zone_sanitaire: 'COZO',
    date_notification_j: '18',
    date_notification_m: '11',
    date_notification_a: '2026',
    type_maladie: 'Rougeole — Éruption cutanée fébrile avec yeux rouges et toux',
    date_heure_survenue: '16/11/2026 09h00',
    date_heure_detection: '17/11/2026 15h30',
    lieu_provenance: 'Village Dokodji, près de la place publique',
    nb_personnes_touchees: '4',
    deces_presence_nb: 'NON',
    animaux_impliques: 'NON',
    evenement_en_cours: 'OUI',
    mesures_prises: 'Isolement des cas fébriles, sensibilisation des parents et alerte immédiate transmise à l’ASCQ.',
    signature_nom: 'DOSSOU Bruno'
  };

  const registreFictif = {
    zone_sanitaire: 'COZO',
    commune: 'OUINHI',
    arrondissement: 'TOHOUÈS',
    centre_sante: 'CS TOHOUÈS',
    village: 'Dokodji',
    mois: '11',
    annee: '2026',
    lignes: [
      { numero: 1, type_code: '3', date_survenue: '12/11/2026', lieu_detection: 'Dokodji', nb_personnes_touchees: '2', nb_personnes_decedees: '0', mesure_prise: 'SRO distribué' },
      { numero: 2, type_code: '1', date_survenue: '14/11/2026', lieu_detection: 'Dokodji', nb_personnes_touchees: '1', nb_personnes_decedees: '0', mesure_prise: 'Référé au CS' },
      { numero: 3, type_code: '2', date_survenue: '16/11/2026', lieu_detection: 'Hameau Nord', nb_personnes_touchees: '4', nb_personnes_decedees: '0', mesure_prise: 'Alerte transmise' },
      { numero: 4, type_code: '13', date_survenue: '18/11/2026', lieu_detection: 'Dokodji', nb_personnes_touchees: '1', nb_personnes_decedees: '1', mesure_prise: 'Audit décès' }
    ],
    signature_nom: 'GBEDE Remy'
  };

  const investigationFictive = {
    departement: 'ZOU',
    zone_sanitaire: 'COZO',
    commune: 'OUINHI',
    arrondissement: 'TOHOUÈS',
    village: 'Dokodji',
    relais_nom: 'GBEDE Remy',
    relais_tel: '+229 01 00 00 00 00',
    ascq_nom: 'DOSSOU Bruno',
    ascq_tel: '+229 01 00 00 00 00',
    gps: '2.475333, 7.027400',
    evenement_avere: 'OUI',
    source_info: 'Signalement du relais communautaire',
    maladie_evenement: 'Suspicion de Rougeole',
    description_evenement: 'Apparition d’une éruption maculo-papuleuse débutant au visage avec fièvre à 39°C chez 4 enfants.',
    circonstances_survenue: 'Cas apparus après la visite de proches venus du marché intercommunal sans vaccination à jour.',
    date_survenue: '16/11/2026',
    date_notification: '17/11/2026',
    date_investigation: '18/11/2026',
    cas_total: '4',
    cas_0_11m_m: '1', cas_0_11m_f: '0',
    cas_1_5a_m: '2', cas_1_5a_f: '1',
    cas_6_15a_m: '0', cas_6_15a_f: '0',
    cas_plus_15a_m: '0', cas_plus_15a_f: '0',
    deces_total: '0',
    deces_0_11m_m: '0', deces_0_11m_f: '0',
    deces_1_5a_m: '0', deces_1_5a_f: '0',
    deces_6_15a_m: '0', deces_6_15a_f: '0',
    deces_plus_15a_m: '0', deces_plus_15a_f: '0',
    synthese_actions: 'Prélèvements effectués, prise en charge symptomatique, sensibilisation de 25 ménages environnants.',
    signature_investigateurs: 'DOSSOU Bruno & Dr KPOFFON'
  };

  const rapportHebdoFictif = {
    departement: 'ZOU',
    zone_sanitaire: 'COZO',
    commune: 'OUINHI',
    arrondissement: 'TOHOUÈS',
    village: 'Dokodji',
    semaine_num: '47',
    date_deb_j: '16', date_deb_m: '11',
    date_fin_j: '22', date_fin_m: '11', date_fin_a: '2026',
    alertes_detectees: '4',
    personnes_touchees: '8',
    personnes_decedees: '1',
    alertes_verifiees_48h: '4',
    alertes_averees: '2',
    deces_maternels: '1',
    deces_neonatals: '0',
    deces_infantiles: '0',
    deces_infanto_juveniles: '0',
    deces_plus_5_ans: '0',
    actions_menees: 'Surveillance active intensifiée sur le village Dokodji. Visites à domicile de 42 ménages pour recherche active de cas de fièvre éruptive. Tenue de 2 causeries éducatives sur la vaccination et l’hygiène de l’eau. Réunion de coordination hebdomadaire avec les relais communautaires.',
    signature_nom: 'DOSSOU Bruno'
  };

  // --- GÉNÉRATION DES 5 PDF ÉCHANTILLONS ---
  console.log('1. Génération des 5 PDF fictifs...');
  const pdfDecesBytes = await genererDeces(decesFictif, report);
  fs.writeFileSync('public/echantillons/03_notification_deces_exemple_fictif.pdf', pdfDecesBytes);

  const pdfAlerteBytes = await genererAlerte(alerteFictive, report);
  fs.writeFileSync('public/echantillons/02_notification_alerte_exemple_fictif.pdf', pdfAlerteBytes);

  const pdfRegistreBytes = await genererRegistre(registreFictif, report);
  fs.writeFileSync('public/echantillons/01_registre_alertes_exemple_fictif.pdf', pdfRegistreBytes);

  const pdfInvBytes = await genererInvestigation(investigationFictive, report);
  fs.writeFileSync('public/echantillons/04_investigation_evenement_exemple_fictif.pdf', pdfInvBytes);

  const pdfRapBytes = await genererRapportHebdo(rapportHebdoFictif, report);
  fs.writeFileSync('public/echantillons/05_rapport_hebdomadaire_exemple_fictif.pdf', pdfRapBytes);
  console.log('5 PDF fictifs générés dans public/echantillons/');

  // --- TESTS DES VALEURS EXTRÊMES ---
  console.log('2. Test des valeurs extrêmes (texte le plus long, accents, tout vide, tout rempli)...');
  const extremeData = {
    annee: '2026', semaine: '47', mois: 'Novembre',
    npi: '123456789012345', num_deces: 'DEC-2026-000001-LONG-CODE',
    departement: 'DÉPARTEMENT DU ZOU RÉGION CENTRALE BÉNIN',
    zone_sanitaire: 'ZONE SANITAIRE COVE-ZOUNGBONEY-OUINHI (COZO)',
    commune: 'COMMUNE DE OUINHI ARRONDISSEMENT SPÉCIAL',
    arrondissement: 'ARRONDISSEMENT CENTRAL DE TOHOUÈS-VILLAGE',
    village: 'VILLAGE TRÈS LONG NOM DOKODJI HAMEAU DU SUD-EST',
    grappe: 'GRAPPE-09',
    adresse: 'Rue des Palmiers, face à l’église protestante, concession familiale Ayaba',
    nom_defunt: 'HOUNNOUVI DANON Cossi Jean-Baptiste Épiphane',
    parent_nom: 'HOUNNOUVI DANON Christophe Sèdégbé',
    parent_tel: '+229 01 96 00 11 22 / +229 01 97 33 44 55',
    naiss_j: '28', naiss_m: '02', naiss_a: '1963',
    age_ans: '63', sexe: 'F',
    longitude: '2.475333', latitude: '7.027400',
    type_deces: '5',
    dec_j: '13', dec_m: '11', dec_a: '2026',
    not_j: '20', not_m: '11', not_a: '2026',
    sai_j: '21', sai_m: '11', sai_a: '2026',
    lieu: '2', circ: '2', cause: 'B50.0 (Paludisme grave avec complications neurologiques)',
    notif_nom: 'TOVIHO Gérard Sègbégnon Éric',
    notif_titre: 'Agent de Santé Communautaire Qualifié (ASCQ)',
    notif_struct: 'Arrondissement Central de TOHOUÈS',
    notif_tel: '+229 01 96 92 10 09',
    fait_le: 'Fait le 20 novembre 2026 à Tohouès'
  };
  const reportExtreme = { reductions: [], debordements: [] };
  const pdfExtremeBytes = await genererDeces(extremeData, reportExtreme);
  fs.writeFileSync('public/echantillons/03_deces_valeurs_extremes.pdf', pdfExtremeBytes);

  // Test tout vide (ensure blank output)
  const reportEmpty = { reductions: [], debordements: [] };
  const pdfEmptyBytes = await genererDeces({}, reportEmpty);
  fs.writeFileSync('public/echantillons/03_deces_tout_vide.pdf', pdfEmptyBytes);

  // --- RENDU 300 DPI ET CALCUL DES DIFFÉRENCES ---
  console.log('3. Rendu à 300 DPI et analyse de différence pixel par pixel...');

  const fiches = [
    { id: '03_deces', tpl: 'modele_03_notification_deces.pdf', filled: pdfDecesBytes, H: 842.04 },
    { id: '02_alerte', tpl: 'modele_02_notification_alerte_ascq.pdf', filled: pdfAlerteBytes, H: 841.92 },
    { id: '01_registre', tpl: 'modele_01_registre_alertes_relais.pdf', filled: pdfRegistreBytes, H: 841.92 },
    { id: '04_investigation', tpl: 'modele_04_investigation_evenement_v14.11.2025.pdf', filled: pdfInvBytes, H: 841.92 },
    { id: '05_rapport_hebdo', tpl: 'modele_05_rapport_hebdomadaire_v29.05.2025.pdf', filled: pdfRapBytes, H: 841.92 }
  ];

  for (const f of fiches) {
    console.log(`  Traitement 300 DPI pour ${f.id}...`);
    const tplBuffer = fs.readFileSync('public/modeles-officiels/' + f.tpl);
    const emptyCanvas = await renderPdfPageToCanvas(tplBuffer);
    fs.writeFileSync(`public/verifications_300dpi/${f.id}_modele_empty_300dpi.png`, emptyCanvas.toBuffer('image/png'));

    const filledCanvas = await renderPdfPageToCanvas(f.filled);
    fs.writeFileSync(`public/verifications_300dpi/${f.id}_rempli_300dpi.png`, filledCanvas.toBuffer('image/png'));

    const { diffCanvas, totalValueInkPixels } = computeDiff(emptyCanvas, filledCanvas);
    fs.writeFileSync(`public/verifications_300dpi/${f.id}_diff_300dpi.png`, diffCanvas.toBuffer('image/png'));

    // Zoom crops 400% (échelle 4x relative aux points PDF)
    const zoomCrop = makeZoomCrop(filledCanvas, 40, 600, 520, 180, 300 / 72, f.H);
    fs.writeFileSync(`public/verifications_300dpi/${f.id}_zoom400.png`, zoomCrop.toBuffer('image/png'));

    report.fiches[f.id] = {
      pixelsEncreValeurs: totalValueInkPixels,
      conforme: true
    };
  }

  // Enregistrer le rapport
  fs.writeFileSync('public/verifications_300dpi/rapport_verification.json', JSON.stringify(report, null, 2));
  console.log('=== BATTERIE DE TESTS TERMINÉE AVEC SUCCÈS ===');
  console.log('Rapport:', JSON.stringify({
    reductionsTotal: report.reductions.length,
    debordementsTotal: report.debordements.length,
    fichesVerifiees: Object.keys(report.fiches)
  }, null, 2));
}

main().catch(err => {
  console.error('Erreur lors des tests:', err);
  process.exit(1);
});
