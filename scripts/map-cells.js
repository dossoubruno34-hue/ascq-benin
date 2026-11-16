const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const BASE_DIR = path.join(__dirname, '..', 'public', 'modeles-officiels');

async function getModelDetails(fileName) {
  const filePath = path.join(BASE_DIR, fileName);
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();
  const opList = await page.getOperatorList();

  const textItems = textContent.items.map(it => ({
    str: it.str,
    x: Math.round(it.transform[4] * 10) / 10,
    y: Math.round(it.transform[5] * 10) / 10,
    w: Math.round(it.width * 10) / 10,
    h: Math.round(it.height * 10) / 10,
    font: it.fontName
  }));

  const rects = [];
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];
    if (fn === pdfjsLib.OPS.rectangle) {
      rects.push({
        x: Math.round(args[0] * 10) / 10,
        y: Math.round(args[1] * 10) / 10,
        w: Math.round(args[2] * 10) / 10,
        h: Math.round(args[3] * 10) / 10
      });
    }
    if (fn === pdfjsLib.OPS.constructPath) {
      const ops = args[0];
      const coords = args[1];
      let cIdx = 0;
      for (const op of ops) {
        if (op === pdfjsLib.OPS.moveTo || op === pdfjsLib.OPS.lineTo) {
          cIdx += 2;
        } else if (op === pdfjsLib.OPS.rectangle) {
          rects.push({
            x: Math.round(coords[cIdx] * 10) / 10,
            y: Math.round(coords[cIdx + 1] * 10) / 10,
            w: Math.round(coords[cIdx + 2] * 10) / 10,
            h: Math.round(coords[cIdx + 3] * 10) / 10
          });
          cIdx += 4;
        }
      }
    }
  }

  // Filtrer les rectangles représentant des cellules ou boîtes (largeur >= 15 et hauteur >= 8)
  const cellRects = rects.filter(r => Math.abs(r.w) >= 15 && Math.abs(r.h) >= 8).map(r => ({
    x: r.w < 0 ? r.x + r.w : r.x,
    y: r.h < 0 ? r.y + r.h : r.y,
    w: Math.abs(r.w),
    h: Math.abs(r.h)
  }));

  return {
    pageWidth: viewport.width,
    pageHeight: viewport.height,
    textItems,
    cellRects
  };
}

async function main() {
  const models = [
    { id: 'REG', file: 'modele_01_registre_alertes_relais.pdf' },
    { id: 'ALR', file: 'modele_02_notification_alerte_ascq.pdf' },
    { id: 'DEC', file: 'modele_03_notification_deces.pdf' },
    { id: 'INV', file: 'modele_04_investigation_evenement_v14.11.2025.pdf' },
    { id: 'RAP', file: 'modele_05_rapport_hebdomadaire_v29.05.2025.pdf' }
  ];

  const fullAnalysis = {};
  for (const m of models) {
    const details = await getModelDetails(m.file);
    fullAnalysis[m.id] = details;
    console.log(`Modèle ${m.id}: ${details.textItems.length} textes, ${details.cellRects.length} cellules potentielles`);
  }

  fs.writeFileSync(path.join(__dirname, 'detailed-geometry.json'), JSON.stringify(fullAnalysis, null, 2));
  console.log('detailed-geometry.json sauvegardé.');
}

main().catch(console.error);
