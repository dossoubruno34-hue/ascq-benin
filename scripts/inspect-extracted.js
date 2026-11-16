const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'pdf-extracted-items.json'), 'utf8'));

for (const [key, val] of Object.entries(data)) {
  console.log(`\n=================== MODÈLE ${key} (${val.file}) ===================`);
  const page1 = val.pages[0];
  console.log(`Page dimensions: width=${page1.width}, height=${page1.height}`);
  console.log(`Nombre total d'éléments texte: ${page1.items.length}`);
  
  // Affiche les 20 premiers éléments significatifs
  page1.items.slice(0, 30).forEach((it, idx) => {
    if (it.str.trim()) {
      console.log(`  [${idx}] "${it.str}" -> x=${it.x}, y=${it.y}, w=${it.width}, h=${it.height}`);
    }
  });
}
