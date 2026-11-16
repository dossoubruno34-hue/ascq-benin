const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'detailed-geometry.json'), 'utf8'));
const alr = data.ALR;

console.log('--- ALR All Items & Underscores ---');
alr.textItems.forEach(t => {
  console.log(`"${t.str}" -> x=${t.x}, y=${t.y}, w=${t.w}, h=${t.h}`);
});
