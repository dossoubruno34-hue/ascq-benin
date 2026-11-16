const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const MODELS = [
  { id: 'REG', file: 'modele_01_registre_alertes_relais.pdf' },
  { id: 'ALR', file: 'modele_02_notification_alerte_ascq.pdf' },
  { id: 'DEC', file: 'modele_03_notification_deces.pdf' },
  { id: 'INV', file: 'modele_04_investigation_evenement_v14.11.2025.pdf' },
  { id: 'RAP', file: 'modele_05_rapport_hebdomadaire_v29.05.2025.pdf' },
];

const BASE_DIR = path.join(__dirname, '..', 'public', 'modeles-officiels');

async function extractPageTextItems(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const numPages = doc.numPages;
  const pagesData = [];

  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const items = textContent.items.map(item => {
      // transform: [scaleX, skewY, skewX, scaleY, tx, ty]
      // PDF points: (tx, ty) with origin at bottom-left
      return {
        str: item.str,
        x: Math.round(item.transform[4] * 100) / 100,
        y: Math.round(item.transform[5] * 100) / 100,
        width: Math.round(item.width * 100) / 100,
        height: Math.round(item.height * 100) / 100,
        fontName: item.fontName
      };
    });
    pagesData.push({
      page: p,
      width: viewport.width,
      height: viewport.height,
      items
    });
  }
  return pagesData;
}

async function main() {
  const result = {};
  for (const m of MODELS) {
    const filePath = path.join(BASE_DIR, m.file);
    const pageData = await extractPageTextItems(filePath);
    result[m.id] = {
      file: m.file,
      pages: pageData
    };
  }

  const outPath = path.join(__dirname, 'pdf-extracted-items.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Géométrie extraite pour les 5 modèles dans ${outPath}`);
}

main().catch(console.error);
