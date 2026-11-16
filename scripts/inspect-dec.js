const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'detailed-geometry.json'), 'utf8'));
const dec = data.DEC;

console.log('--- DEC Key Sections & Labels ---');
dec.textItems.forEach(t => {
  if (t.str.includes(':') || t.str.includes('SECTION') || t.str.includes('RESIDENCE') || t.str.includes('Année') || t.str.includes('NPI') || t.str.includes('N°') || t.str.includes('Sexe') || t.str.includes('GPS') || t.str.includes('Cause') || t.str.includes('Lieu du') || t.str.includes('Circonstances') || t.str.includes('INFORMATION SUR')) {
    console.log(`"${t.str}" -> x=${t.x}, y=${t.y}, w=${t.w}, h=${t.h}`);
  }
});
