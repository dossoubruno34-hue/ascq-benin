const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'detailed-geometry.json'), 'utf8'));
const rap = data.RAP;

console.log('--- RAP Dotted lines and text ---');
rap.textItems.forEach(t => {
  if (t.str.includes('…') || t.str.includes('...')) {
    console.log(`Dotted line: y=${t.y}, x=${t.x}, w=${t.w}, len=${t.str.length}`);
  } else if (t.str.includes(':') || t.str.includes('Semaine') || t.str.includes('Synthèse') || t.str.includes('Décès') || t.str.includes('Actions') || t.str.includes('signature')) {
    console.log(`"${t.str}" -> x=${t.x}, y=${t.y}, w=${t.w}, h=${t.h}`);
  }
});

// Cellules des tableaux alertes et décès (valeurs dans la colonne Nombre)
const valueCells = rap.cellRects.filter(r => r.x > 400 && r.y > 400);
console.log('\nCellules Nombre (valeurs) :');
valueCells.sort((a,b) => b.y - a.y).forEach(c => {
  console.log(`  Cell x=${c.x}, y=${c.y}, w=${c.w}, h=${c.h}`);
});
