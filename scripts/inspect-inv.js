const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'detailed-geometry.json'), 'utf8'));
const inv = data.INV;

console.log('--- INV All Label Items ---');
inv.textItems.forEach(t => {
  if (t.w > 20 && !t.str.startsWith('01') && !t.str.startsWith('+229') && !t.str.startsWith('sante.')) {
    console.log(`"${t.str}" -> x=${t.x}, y=${t.y}, w=${t.w}, h=${t.h}`);
  }
});
