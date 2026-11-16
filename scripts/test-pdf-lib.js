const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

async function test() {
  const templatePath = path.join(__dirname, '..', 'public', 'modeles-officiels', 'modele_01_registre_alertes_relais.pdf');
  const fontPath = path.join(__dirname, '..', 'public', 'fonts', 'Carlito-Regular.ttf');
  const fontBoldPath = path.join(__dirname, '..', 'public', 'fonts', 'Carlito-Bold.ttf');

  const pdfBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = fs.readFileSync(fontPath);
  const fontBoldBytes = fs.readFileSync(fontBoldPath);

  const customFont = await pdfDoc.embedFont(fontBytes);
  const customFontBold = await pdfDoc.embedFont(fontBoldBytes);

  const page = pdfDoc.getPage(0);
  page.drawText('TEST BÉNIN ÉPIDÉMIO ≥ 5 ANS', {
    x: 150,
    y: 694.5,
    size: 10,
    font: customFontBold,
    color: rgb(0, 0, 0)
  });

  const outBytes = await pdfDoc.save();
  const outPath = path.join(__dirname, 'test-output.pdf');
  fs.writeFileSync(outPath, outBytes);
  console.log(`Succès: PDF test généré avec Carlito (${outBytes.length} octets) dans ${outPath}`);
}

test().catch(console.error);
