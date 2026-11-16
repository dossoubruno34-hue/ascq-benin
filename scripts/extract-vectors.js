const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const BASE_DIR = path.join(__dirname, '..', 'public', 'modeles-officiels');

async function analyzeLines(fileName) {
  const filePath = path.join(BASE_DIR, fileName);
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const opList = await page.getOperatorList();
  
  const lines = [];
  const rectangles = [];
  
  // Analyser les opérations de tracé vectoriel
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];
    
    // OPS.rectangle = 19
    if (fn === pdfjsLib.OPS.rectangle) {
      rectangles.push({
        x: Math.round(args[0] * 100) / 100,
        y: Math.round(args[1] * 100) / 100,
        w: Math.round(args[2] * 100) / 100,
        h: Math.round(args[3] * 100) / 100
      });
    }
    // OPS.constructPath = 91
    if (fn === pdfjsLib.OPS.constructPath) {
      const ops = args[0];
      const coords = args[1];
      let cIdx = 0;
      let currentX = 0, currentY = 0;
      for (const op of ops) {
        if (op === pdfjsLib.OPS.moveTo) {
          currentX = coords[cIdx++];
          currentY = coords[cIdx++];
        } else if (op === pdfjsLib.OPS.lineTo) {
          const nextX = coords[cIdx++];
          const nextY = coords[cIdx++];
          lines.push({
            x1: Math.round(currentX * 100) / 100,
            y1: Math.round(currentY * 100) / 100,
            x2: Math.round(nextX * 100) / 100,
            y2: Math.round(nextY * 100) / 100
          });
          currentX = nextX;
          currentY = nextY;
        } else if (op === pdfjsLib.OPS.rectangle) {
          const rx = coords[cIdx++];
          const ry = coords[cIdx++];
          const rw = coords[cIdx++];
          const rh = coords[cIdx++];
          rectangles.push({
            x: Math.round(rx * 100) / 100,
            y: Math.round(ry * 100) / 100,
            w: Math.round(rw * 100) / 100,
            h: Math.round(rh * 100) / 100
          });
        }
      }
    }
  }

  return { lines, rectangles };
}

async function main() {
  const models = [
    'modele_01_registre_alertes_relais.pdf',
    'modele_02_notification_alerte_ascq.pdf',
    'modele_03_notification_deces.pdf',
    'modele_04_investigation_evenement_v14.11.2025.pdf',
    'modele_05_rapport_hebdomadaire_v29.05.2025.pdf'
  ];

  for (const m of models) {
    const res = await analyzeLines(m);
    console.log(`\n=== ${m} ===`);
    console.log(`  Rectangles trouvés: ${res.rectangles.length}`);
    console.log(`  Lignes trouvées: ${res.lines.length}`);
    // Filtrer les lignes horizontales significatives
    const horizontalLines = res.lines.filter(l => Math.abs(l.y1 - l.y2) < 1 && Math.abs(l.x1 - l.x2) > 20);
    console.log(`  Lignes horizontales (>20pt): ${horizontalLines.length}`);
    horizontalLines.slice(0, 10).forEach(l => {
      console.log(`    y=${l.y1}, x1=${l.x1} -> x2=${l.x2} (len=${Math.round(l.x2 - l.x1)})`);
    });
  }
}

main().catch(console.error);
