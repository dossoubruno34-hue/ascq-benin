const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function testRender() {
  const pdfPath = path.join(__dirname, '..', 'public', 'modeles-officiels', 'modele_01_registre_alertes_relais.pdf');
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const page = await doc.getPage(1);

  const scale = 200 / 72; // 200 DPI
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
  const ctx = canvas.getContext('2d');

  // Fill white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport: viewport
  }).promise;

  const pngBuffer = canvas.toBuffer('image/png');
  const outPath = path.join(__dirname, 'test-render-page1.png');
  fs.writeFileSync(outPath, pngBuffer);
  console.log(`Succès: page rendue à 200 DPI (${canvas.width}x${canvas.height}) sauvegardée dans ${outPath} (${pngBuffer.length} octets)`);
}

testRender().catch(console.error);
