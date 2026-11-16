const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'detailed-geometry.json'), 'utf8'));
const reg = data.REG;

console.log('--- REG Labels & Positions ---');
reg.textItems.forEach(t => {
  if (t.str.includes(':') || t.str.includes('Mois') || t.str.includes('Année') || t.str.includes('Village') || t.str.includes('N°')) {
    console.log(`"${t.str}" -> x=${t.x}, y=${t.y}, w=${t.w}, h=${t.h}`);
  }
});

// Trouver les coordonnées des cellules de tableau (y entre 170 et 720)
// On cherche les rectangles de la grille
const gridRects = reg.cellRects.filter(r => r.y >= 160 && r.y <= 720 && r.w > 15 && r.h > 15);
console.log(`\nGrid rects count: ${gridRects.length}`);

// Grouper par y pour trouver les rangées
const yMap = {};
gridRects.forEach(r => {
  const yKey = Math.round(r.y);
  if (!yMap[yKey]) yMap[yKey] = [];
  yMap[yKey].push(r);
});

const sortedY = Object.keys(yMap).map(Number).sort((a, b) => b - a);
console.log('\nLignes détectées (Y descendant) :');
sortedY.forEach(y => {
  const row = yMap[y].sort((a, b) => a.x - b.x);
  console.log(`Row y=${y}: ${row.length} colonnes -> x = ${row.map(c => Math.round(c.x)).join(', ')}`);
});
