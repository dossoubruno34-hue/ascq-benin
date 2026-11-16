const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const https = require('https');

const UPLOAD_DIR = 'C:/Users/STUDIO SHANTI/.gemini/antigravity/brain/d5e815d1-9f91-4ab4-8859-6f9e21e4aec7/.user_uploaded';

const SRC_FILES = {
  WA0093: path.join(UPLOAD_DIR, 'media_1794815596360_1a7986a0.pdf'),
  WA0091: path.join(UPLOAD_DIR, 'media_1794815596234_e8bfbf71.pdf'),
  WA0092: path.join(UPLOAD_DIR, 'media_1794815596017_05997b36.pdf'),
  WA0088: path.join(UPLOAD_DIR, 'media_1794815596017_ec4ccea5.pdf')
};

const BASE_OUT = path.join(__dirname, '..', 'public', 'modeles-officiels');
const ORIGINAUX_OUT = path.join(BASE_OUT, 'originaux');
const FONTS_OUT = path.join(__dirname, '..', 'public', 'fonts');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: status ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close(resolve);
      });
    }).on('error', reject);
  });
}

async function main() {
  ensureDir(BASE_OUT);
  ensureDir(ORIGINAUX_OUT);
  ensureDir(FONTS_OUT);

  console.log('1. Copie des fichiers originaux officiels...');
  fs.copyFileSync(SRC_FILES.WA0093, path.join(ORIGINAUX_OUT, 'DOC-20260529-WA0093_BJ_RAPPORT_HEBDOMADAIRE_V29.05.2025.pdf'));
  fs.copyFileSync(SRC_FILES.WA0091, path.join(ORIGINAUX_OUT, 'DOC-20260529-WA0091_10_BJ_Fiche_investigation_V14.11.2025.pdf'));
  fs.copyFileSync(SRC_FILES.WA0092, path.join(ORIGINAUX_OUT, 'DOC-20260529-WA0092_BJ_FORMULAIRE_NOTIFICATION_DECES.pdf'));
  fs.copyFileSync(SRC_FILES.WA0088, path.join(ORIGINAUX_OUT, 'DOC-20260529-WA0088_Registre_et_Notification_Alertes.pdf'));
  console.log('   Originaux copiés avec succès.');

  console.log('2. Séparation de DOC-20260529-WA0088 en 2 modèles distincts...');
  const wa0088Bytes = fs.readFileSync(SRC_FILES.WA0088);
  const wa0088Doc = await PDFDocument.load(wa0088Bytes);

  // Modèle 1: Registre (Page 1 de WA0088)
  const docReg = await PDFDocument.create();
  const [page1] = await docReg.copyPages(wa0088Doc, [0]);
  docReg.addPage(page1);
  const regBytes = await docReg.save();
  fs.writeFileSync(path.join(BASE_OUT, 'modele_01_registre_alertes_relais.pdf'), regBytes);
  console.log('   modele_01_registre_alertes_relais.pdf généré.');

  // Modèle 2: Notification Alerte ASCQ (Page 2 de WA0088)
  const docAlr = await PDFDocument.create();
  const [page2] = await docAlr.copyPages(wa0088Doc, [1]);
  docAlr.addPage(page2);
  const alrBytes = await docAlr.save();
  fs.writeFileSync(path.join(BASE_OUT, 'modele_02_notification_alerte_ascq.pdf'), alrBytes);
  console.log('   modele_02_notification_alerte_ascq.pdf généré.');

  // Modèle 3: Décès (WA0092)
  fs.copyFileSync(SRC_FILES.WA0092, path.join(BASE_OUT, 'modele_03_notification_deces.pdf'));
  console.log('   modele_03_notification_deces.pdf copié.');

  // Modèle 4: Investigation (WA0091)
  fs.copyFileSync(SRC_FILES.WA0091, path.join(BASE_OUT, 'modele_04_investigation_evenement_v14.11.2025.pdf'));
  console.log('   modele_04_investigation_evenement_v14.11.2025.pdf copié.');

  // Modèle 5: Rapport Hebdomadaire (WA0093)
  fs.copyFileSync(SRC_FILES.WA0093, path.join(BASE_OUT, 'modele_05_rapport_hebdomadaire_v29.05.2025.pdf'));
  console.log('   modele_05_rapport_hebdomadaire_v29.05.2025.pdf copié.');

  console.log('3. Préparation des polices Carlito & Calibri...');
  // Télécharger Carlito (Google Fonts)
  const carlitoRegUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/carlito/Carlito-Regular.ttf';
  const carlitoBoldUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/carlito/Carlito-Bold.ttf';

  try {
    console.log('   Téléchargement de Carlito-Regular.ttf...');
    await downloadFile(carlitoRegUrl, path.join(FONTS_OUT, 'Carlito-Regular.ttf'));
    console.log('   Téléchargement de Carlito-Bold.ttf...');
    await downloadFile(carlitoBoldUrl, path.join(FONTS_OUT, 'Carlito-Bold.ttf'));
    console.log('   Polices Carlito téléchargées avec succès.');
  } catch (e) {
    console.warn('   Téléchargement Carlito échoué, repli sur polices Windows locales :', e.message);
    if (fs.existsSync('C:/Windows/Fonts/calibri.ttf')) {
      fs.copyFileSync('C:/Windows/Fonts/calibri.ttf', path.join(FONTS_OUT, 'Carlito-Regular.ttf'));
      fs.copyFileSync('C:/Windows/Fonts/calibrib.ttf', path.join(FONTS_OUT, 'Carlito-Bold.ttf'));
      console.log('   Calibri copié comme Carlito-Regular.ttf et Carlito-Bold.ttf.');
    }
  }

  console.log('Terminé avec succès.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
