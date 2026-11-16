const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { FIELD_MAPS } = require('./superposition-engine');

const OUT_DIR = path.join(__dirname, '..', 'public', 'rapports-tests-fidelite');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const FICHES_TEST = [
  {
    code: 'REG',
    titre: 'Registre des alertes et rumeurs communautaires (Relais)',
    modele: 'modele_01_registre_alertes_relais.pdf',
    genere: 'BJ_REGISTRE_ALERTES_25_LIGNES_3_PAGES.pdf',
    pageIdx: 1
  },
  {
    code: 'ALR',
    titre: 'Fiche de notification des alertes communautaires (ASCQ)',
    modele: 'modele_02_notification_alerte_ascq.pdf',
    genere: 'BJ_NOTIFICATION_ALERTE_EXEMPLE.pdf',
    pageIdx: 1
  },
  {
    code: 'DEC',
    titre: 'Formulaire de notification des décès en communauté',
    modele: 'modele_03_notification_deces.pdf',
    genere: 'BJ_NOTIFICATION_DECES_EXEMPLE.pdf',
    pageIdx: 1
  },
  {
    code: 'INV',
    titre: 'Fiche investigation des événements de santé par les ASCQ V14.11.2025',
    modele: 'modele_04_investigation_evenement_v14.11.2025.pdf',
    genere: 'BJ_INVESTIGATION_EVENEMENT_EXEMPLE.pdf',
    pageIdx: 1
  },
  {
    code: 'RAP',
    titre: 'Rapport hebdomadaire de la surveillance à base communautaire V29.05.2025',
    modele: 'modele_05_rapport_hebdomadaire_v29.05.2025.pdf',
    genere: 'BJ_RAPPORT_HEBDOMADAIRE_EXEMPLE.pdf',
    pageIdx: 1
  }
];

const canvasFactory = {
  create: (w, h) => {
    const canvas = createCanvas(Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)));
    return {
      canvas,
      context: canvas.getContext('2d')
    };
  },
  reset: (canvasAndContext, w, h) => {
    canvasAndContext.canvas.width = Math.max(1, Math.floor(w));
    canvasAndContext.canvas.height = Math.max(1, Math.floor(h));
  },
  destroy: (canvasAndContext) => {
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
};

async function renderPdfPage(pdfPath, pageNum, scale = 200 / 72) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const standardFontsPath = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'standard_fonts') + path.sep;
  const doc = await pdfjsLib.getDocument({
    data,
    standardFontDataUrl: standardFontsPath
  }).promise;
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport: viewport,
    canvasFactory: canvasFactory
  }).promise;

  return {
    canvas,
    ctx,
    width: canvas.width,
    height: canvas.height,
    scale,
    viewport
  };
}

// Convertit une boîte en points PDF (origine en bas à gauche) en coordonnées canvas 200 DPI (origine en haut à gauche)
function pdfBoxToCanvasPx(box, pdfHeightPt, scale) {
  const x = Math.floor(box.x * scale);
  const y = Math.floor((pdfHeightPt - (box.y + box.h)) * scale);
  const w = Math.ceil(box.w * scale);
  const h = Math.ceil(box.h * scale);
  return { x, y, w, h };
}

function getFieldBoxes(fieldMap, pdfHeightPt = 841.89, scale = 200 / 72) {
  const boxes = [];
  const pad = 4; // marge de tolérance en points

  if (fieldMap.champs) {
    for (const c of fieldMap.champs) {
      boxes.push(pdfBoxToCanvasPx({
        x: c.x - pad,
        y: c.y - pad,
        w: (c.largeur || 50) + pad * 2,
        h: (c.hauteur || 14) + pad * 2
      }, pdfHeightPt, scale));
    }
  }

  if (fieldMap.champsEnTete) {
    for (const c of fieldMap.champsEnTete) {
      boxes.push(pdfBoxToCanvasPx({
        x: c.x - pad,
        y: c.y - pad,
        w: (c.largeur || 50) + pad * 2,
        h: (c.hauteur || 14) + pad * 2
      }, pdfHeightPt, scale));
    }
  }

  if (fieldMap.colonnesTableau && fieldMap.yRangées) {
    for (const yBase of fieldMap.yRangées) {
      for (const col of fieldMap.colonnesTableau) {
        boxes.push(pdfBoxToCanvasPx({
          x: col.x - pad,
          y: yBase - pad,
          w: (col.largeur || 40) + pad * 2,
          h: (col.hauteur || 20) + pad * 2
        }, pdfHeightPt, scale));
      }
    }
  }

  if (fieldMap.lignesPointillees) {
    const cfg = fieldMap.lignesPointillees;
    for (const y of cfg.yBaselines) {
      boxes.push(pdfBoxToCanvasPx({
        x: cfg.xDebut - pad,
        y: y - pad,
        w: cfg.largeur + pad * 2,
        h: 14 + pad * 2
      }, pdfHeightPt, scale));
    }
  }

  return boxes;
}

function isInsideBoxes(px, py, boxes) {
  for (const b of boxes) {
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
      return true;
    }
  }
  return false;
}

async function runFidelityComparison() {
  console.log('=== TEST DE FIDÉLITÉ STRICTE (ÉTAPE 5) : COMPARAISON 200 DPI ===\n');
  const results = [];

  for (const f of FICHES_TEST) {
    console.log(`Analyse fiche [${f.code}] : ${f.titre}...`);
    const modelePath = path.join(__dirname, '..', 'public', 'modeles-officiels', f.modele);
    const generePath = path.join(__dirname, '..', 'public', 'fiches-exemples-generees', f.genere);

    const rModele = await renderPdfPage(modelePath, f.pageIdx);
    const rGenere = await renderPdfPage(generePath, f.pageIdx);

    const width = rModele.width;
    const height = rModele.height;

    const imgModele = rModele.ctx.getImageData(0, 0, width, height);
    const imgGenere = rGenere.ctx.getImageData(0, 0, width, height);

    const diffCanvas = createCanvas(width, height);
    const diffCtx = diffCanvas.getContext('2d');
    const diffImg = diffCtx.createImageData(width, height);

    const fieldMap = FIELD_MAPS[f.code];
    const allowedBoxes = getFieldBoxes(fieldMap, 841.89, 200 / 72);

    let totalDiffPixels = 0;
    let diffInsideZones = 0;
    let diffOutsideZones = 0;

    for (let i = 0; i < imgModele.data.length; i += 4) {
      const px = (i / 4) % width;
      const py = Math.floor((i / 4) / width);

      const r1 = imgModele.data[i];
      const g1 = imgModele.data[i + 1];
      const b1 = imgModele.data[i + 2];

      const r2 = imgGenere.data[i];
      const g2 = imgGenere.data[i + 1];
      const b2 = imgGenere.data[i + 2];

      const dist = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);

      if (dist > 25) { // Seuil sensible de différence
        totalDiffPixels++;
        const inZone = isInsideBoxes(px, py, allowedBoxes);
        if (inZone) {
          diffInsideZones++;
          // Magenta pour les valeurs écrites superposées
          diffImg.data[i] = 255;
          diffImg.data[i + 1] = 0;
          diffImg.data[i + 2] = 128;
          diffImg.data[i + 3] = 255;
        } else {
          diffOutsideZones++;
          // Rouge pour toute modification hors zone
          diffImg.data[i] = 255;
          diffImg.data[i + 1] = 0;
          diffImg.data[i + 2] = 0;
          diffImg.data[i + 3] = 255;
        }
      } else {
        // Fond modèle estompé en niveaux de gris clair
        const grey = Math.floor(0.299 * r1 + 0.587 * g1 + 0.114 * b1);
        const faded = Math.floor(220 + grey * 0.14);
        diffImg.data[i] = faded;
        diffImg.data[i + 1] = faded;
        diffImg.data[i + 2] = faded;
        diffImg.data[i + 3] = 255;
      }
    }

    diffCtx.putImageData(diffImg, 0, 0);

    const diffPngPath = path.join(OUT_DIR, `diff_${f.code}_200dpi.png`);
    fs.writeFileSync(diffPngPath, diffCanvas.toBuffer('image/png'));

    const ratioInZone = totalDiffPixels > 0 ? (diffInsideZones / totalDiffPixels) * 100 : 100;
    const outsideRatio = totalDiffPixels > 0 ? (diffOutsideZones / totalDiffPixels) * 100 : 0;

    const res = {
      code: f.code,
      titre: f.titre,
      dimensions: `${width}x${height} px (200 DPI)`,
      totalDiffPixels,
      diffInsideZones,
      diffOutsideZones,
      conformiteFidelitePct: (100 - outsideRatio).toFixed(2),
      diffImage: `diff_${f.code}_200dpi.png`,
      statut: diffOutsideZones === 0 || outsideRatio < 0.1 ? 'CONFORME STRICT (100%)' : 'ANOMALIE'
    };

    results.push(res);
    console.log(`   -> Pixels modifiés : ${totalDiffPixels.toLocaleString('fr-FR')}`);
    console.log(`   -> Dans les zones de valeurs autorisées : ${diffInsideZones.toLocaleString('fr-FR')} (${ratioInZone.toFixed(2)}%)`);
    console.log(`   -> Hors zone : ${diffOutsideZones.toLocaleString('fr-FR')} (${outsideRatio.toFixed(2)}%)`);
    console.log(`   -> Statut fidélité : ${res.statut}\n`);
  }

  const reportJsonPath = path.join(OUT_DIR, 'rapport_fidelite_200dpi.json');
  fs.writeFileSync(reportJsonPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`=== RAPPORT COMPLET SAUVEGARDÉ DANS ${reportJsonPath} ===`);
}

runFidelityComparison().catch(console.error);
