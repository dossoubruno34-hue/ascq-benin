const fs = require('fs');
const path = require('path');

const tempExtracted = path.join(process.env.TEMP, 'ref_extracted');
const shared = fs.readFileSync(path.join(tempExtracted, 'xl', 'sharedStrings.xml'), 'utf8');

const strings = [];
const regex = /<si>(?:(?!<\/si>).)*?<\/si>/gs;
const tRegex = /<t[^>]*>(.*?)<\/t>/gs;
let match;
while ((match = regex.exec(shared)) !== null) {
  let text = '';
  let tMatch;
  while ((tMatch = tRegex.exec(match[0])) !== null) {
    text += tMatch[1];
  }
  strings.push(text);
}

const sheet3 = fs.readFileSync(path.join(tempExtracted, 'xl', 'worksheets', 'sheet3.xml'), 'utf8');
const rowRegex = /<row r="(\d+)"[^>]*>(.*?)<\/row>/gs;
const cellRegex = /<c r="([A-Z]+)\d+"(?:[^>]*t="s")?[^>]*>(?:<f>.*?<\/f>)?<v>(\d+)<\/v><\/c>/g;

let rMatch;
const zss = [];
while ((rMatch = rowRegex.exec(sheet3)) !== null) {
  const rowNum = parseInt(rMatch[1]);
  if (rowNum === 1) continue;
  const rowContent = rMatch[2];
  const cells = {};
  let cMatch;
  while ((cMatch = cellRegex.exec(rowContent)) !== null) {
    const col = cMatch[1];
    const val = parseInt(cMatch[2]);
    cells[col] = strings[val] !== undefined ? strings[val] : val;
  }
  zss.push({
    row: rowNum,
    dep: cells['A'],
    nom: cells['B'],
    communes: cells['C'],
    statut: cells['F']
  });
}

console.log('Total ZS:', zss.length);
console.log(JSON.stringify(zss, null, 2));
fs.writeFileSync('scripts/zones_sanitaires_extracted.json', JSON.stringify(zss, null, 2));
