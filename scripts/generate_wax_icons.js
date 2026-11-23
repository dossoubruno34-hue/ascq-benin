const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');

const OUT_DIR = path.join(process.cwd(), 'public', 'icons', 'wax');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Palette officielle Wax SantéCom Bénin
const PALETTE = {
  vert: '#008751',
  jaune: '#FCD116',
  rouge: '#E8112D',
  marine: '#003573',
  turquoise: '#00A896',
  orangeTerre: '#D95D39',
  creme: '#FFFDF5'
};

const MODULES = [
  { id: 'soins', bg: PALETTE.vert, ring: PALETTE.jaune, accent: PALETTE.orangeTerre, centerBg: PALETTE.creme },
  { id: 'surveillance', bg: PALETTE.marine, ring: PALETTE.jaune, accent: PALETTE.rouge, centerBg: PALETTE.creme },
  { id: 'terrain', bg: PALETTE.turquoise, ring: PALETTE.jaune, accent: PALETTE.vert, centerBg: PALETTE.creme },
  { id: 'rapports', bg: PALETTE.orangeTerre, ring: PALETTE.jaune, accent: PALETTE.marine, centerBg: PALETTE.creme },
  { id: 'gouvernance', bg: PALETTE.marine, ring: PALETTE.jaune, accent: PALETTE.vert, centerBg: PALETTE.creme },
  { id: 'outils', bg: PALETTE.vert, ring: PALETTE.jaune, accent: PALETTE.turquoise, centerBg: PALETTE.creme },
  // Modules dédiés Relais Communautaires (RC)
  { id: 'rc_fiches', bg: PALETTE.vert, ring: PALETTE.jaune, accent: PALETTE.marine, centerBg: PALETTE.creme },
  { id: 'rc_planning', bg: PALETTE.turquoise, ring: PALETTE.jaune, accent: PALETTE.orangeTerre, centerBg: PALETTE.creme },
  { id: 'rc_alertes', bg: PALETTE.rouge, ring: PALETTE.jaune, accent: PALETTE.marine, centerBg: PALETTE.creme },
  { id: 'rc_outils', bg: PALETTE.orangeTerre, ring: PALETTE.jaune, accent: PALETTE.vert, centerBg: PALETTE.creme }
];

function drawWaxBackground(ctx, size, mod) {
  const cx = size / 2;
  const cy = size / 2;
  const rMax = size * 0.46;

  ctx.clearRect(0, 0, size, size);

  // Fond médaillon arrondi style pagne wax
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92, size * 0.22);
  ctx.fillStyle = mod.bg;
  ctx.fill();
  ctx.lineWidth = size * 0.03;
  ctx.strokeStyle = mod.ring;
  ctx.stroke();

  // Motifs géométriques wax aux 4 coins (losanges africains)
  const corners = [
    [size * 0.16, size * 0.16],
    [size * 0.84, size * 0.16],
    [size * 0.16, size * 0.84],
    [size * 0.84, size * 0.84]
  ];
  ctx.fillStyle = mod.ring;
  for (const [x, y] of corners) {
    const d = size * 0.055;
    ctx.beginPath();
    ctx.moveTo(x, y - d);
    ctx.lineTo(x + d, y);
    ctx.lineTo(x, y + d);
    ctx.lineTo(x - d, y);
    ctx.closePath();
    ctx.fill();
  }

  // Couronne de pétales wax autour du centre (12 rayons)
  const nbPetals = 12;
  for (let i = 0; i < nbPetals; i++) {
    const angle = (i * Math.PI * 2) / nbPetals;
    const px = cx + Math.cos(angle) * (rMax * 0.78);
    const py = cy + Math.sin(angle) * (rMax * 0.78);
    ctx.beginPath();
    ctx.arc(px, py, size * 0.038, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? mod.ring : mod.accent;
    ctx.fill();
  }

  // Disque central crème bordé de bleu marine
  ctx.beginPath();
  ctx.arc(cx, cy, rMax * 0.64, 0, Math.PI * 2);
  ctx.fillStyle = mod.centerBg;
  ctx.fill();
  ctx.lineWidth = size * 0.025;
  ctx.strokeStyle = PALETTE.marine;
  ctx.stroke();
  ctx.restore();
}

function drawSubject(ctx, size, id) {
  const s = size / 512;
  ctx.save();
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (id === 'soins') {
    // Sujet unique : Coeur médical & croix de soins maternels
    ctx.fillStyle = PALETTE.rouge;
    ctx.beginPath();
    ctx.moveTo(256, 355);
    ctx.bezierCurveTo(150, 285, 145, 185, 205, 175);
    ctx.bezierCurveTo(235, 170, 256, 195, 256, 210);
    ctx.bezierCurveTo(256, 195, 277, 170, 307, 175);
    ctx.bezierCurveTo(367, 185, 362, 285, 256, 355);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = PALETTE.marine;
    ctx.stroke();

    // Croix blanche au centre
    ctx.fillStyle = PALETTE.creme;
    ctx.fillRect(242, 215, 28, 76);
    ctx.fillRect(218, 239, 76, 28);
  } else if (id === 'surveillance') {
    // Sujet unique : Bouclier de veille épidémiologique
    ctx.fillStyle = PALETTE.vert;
    ctx.beginPath();
    ctx.moveTo(256, 150);
    ctx.lineTo(345, 185);
    ctx.lineTo(345, 265);
    ctx.quadraticCurveTo(345, 340, 256, 370);
    ctx.quadraticCurveTo(167, 340, 167, 265);
    ctx.lineTo(167, 185);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = PALETTE.marine;
    ctx.stroke();

    // Onde de pouls jaune au centre du bouclier
    ctx.strokeStyle = PALETTE.jaune;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(190, 260);
    ctx.lineTo(225, 260);
    ctx.lineTo(242, 210);
    ctx.lineTo(268, 305);
    ctx.lineTo(286, 260);
    ctx.lineTo(322, 260);
    ctx.stroke();
  } else if (id === 'terrain') {
    // Sujet unique : Agent communautaire en terrain (silhouette stylisée)
    ctx.fillStyle = PALETTE.orangeTerre;
    ctx.beginPath();
    ctx.arc(256, 195, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = PALETTE.marine;
    ctx.stroke();

    ctx.fillStyle = PALETTE.vert;
    ctx.beginPath();
    ctx.moveTo(185, 345);
    ctx.quadraticCurveTo(195, 248, 256, 248);
    ctx.quadraticCurveTo(317, 248, 327, 345);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Étoile jaune sur la poitrine
    ctx.fillStyle = PALETTE.jaune;
    ctx.beginPath();
    ctx.arc(256, 300, 16, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'rapports') {
    // Sujet unique : Histogramme analytique ascendant
    const bars = [
      { x: 175, y: 275, h: 75, c: PALETTE.turquoise },
      { x: 235, y: 225, h: 125, c: PALETTE.vert },
      { x: 295, y: 175, h: 175, c: PALETTE.rouge }
    ];
    ctx.lineWidth = 10;
    ctx.strokeStyle = PALETTE.marine;
    for (const b of bars) {
      ctx.fillStyle = b.c;
      ctx.fillRect(b.x, b.y, 42, b.h);
      ctx.strokeRect(b.x, b.y, 42, b.h);
    }
  } else if (id === 'gouvernance') {
    // Sujet unique : Couronne / étoile de supervision territoriale
    ctx.fillStyle = PALETTE.jaune;
    ctx.beginPath();
    ctx.moveTo(170, 330);
    ctx.lineTo(185, 205);
    ctx.lineTo(225, 255);
    ctx.lineTo(256, 175);
    ctx.lineTo(287, 255);
    ctx.lineTo(327, 205);
    ctx.lineTo(342, 330);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = PALETTE.marine;
    ctx.stroke();

    ctx.fillStyle = PALETTE.rouge;
    ctx.beginPath();
    ctx.arc(256, 292, 16, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'outils' || id === 'rc_outils') {
    // Sujet unique : Livre ouvert du savoir communautaire
    ctx.fillStyle = PALETTE.jaune;
    ctx.beginPath();
    ctx.moveTo(256, 200);
    ctx.lineTo(165, 180);
    ctx.lineTo(165, 325);
    ctx.lineTo(256, 345);
    ctx.lineTo(347, 325);
    ctx.lineTo(347, 180);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = PALETTE.marine;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(256, 200);
    ctx.lineTo(256, 345);
    ctx.stroke();
  } else if (id === 'rc_fiches') {
    // Sujet unique : Presse-papiers de registre communautaire
    ctx.fillStyle = PALETTE.jaune;
    ctx.fillRect(185, 165, 142, 185);
    ctx.lineWidth = 10;
    ctx.strokeStyle = PALETTE.marine;
    ctx.strokeRect(185, 165, 142, 185);

    ctx.fillStyle = PALETTE.rouge;
    ctx.fillRect(225, 148, 62, 26);
    ctx.strokeRect(225, 148, 62, 26);

    ctx.strokeStyle = PALETTE.vert;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(212, 230);
    ctx.lineTo(300, 230);
    ctx.moveTo(212, 270);
    ctx.lineTo(300, 270);
    ctx.moveTo(212, 310);
    ctx.lineTo(275, 310);
    ctx.stroke();
  } else if (id === 'rc_planning') {
    // Sujet unique : Case / Maison familiale de visite à domicile (VAD)
    ctx.fillStyle = PALETTE.orangeTerre;
    ctx.beginPath();
    ctx.moveTo(256, 155);
    ctx.lineTo(350, 235);
    ctx.lineTo(162, 235);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = PALETTE.marine;
    ctx.stroke();

    ctx.fillStyle = PALETTE.jaune;
    ctx.fillRect(185, 235, 142, 110);
    ctx.strokeRect(185, 235, 142, 110);

    ctx.fillStyle = PALETTE.vert;
    ctx.fillRect(236, 275, 40, 70);
    ctx.strokeRect(236, 275, 40, 70);
  } else if (id === 'rc_alertes') {
    // Sujet unique : Cloche d'alerte communautaire
    ctx.fillStyle = PALETTE.jaune;
    ctx.beginPath();
    ctx.moveTo(256, 160);
    ctx.quadraticCurveTo(325, 165, 330, 285);
    ctx.lineTo(350, 310);
    ctx.lineTo(162, 310);
    ctx.lineTo(182, 285);
    ctx.quadraticCurveTo(187, 165, 256, 160);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = PALETTE.marine;
    ctx.stroke();

    ctx.fillStyle = PALETTE.rouge;
    ctx.beginPath();
    ctx.arc(256, 335, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function renderIcon(mod, size, quantizeForPng = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  drawWaxBackground(ctx, size, mod);
  drawSubject(ctx, size, mod.id);
  if (quantizeForPng) {
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = (d[i] >> 5) * 36;
      d[i + 1] = (d[i + 1] >> 5) * 36;
      d[i + 2] = (d[i + 2] >> 5) * 36;
      d[i + 3] = d[i + 3] > 128 ? 255 : 0;
    }
    ctx.putImageData(imgData, 0, 0);
  }
  return canvas;
}

const report = [];
for (const mod of MODULES) {
  const c512 = renderIcon(mod, 512, true);
  const b512 = c512.toBuffer('image/png');
  const p512 = path.join(OUT_DIR, `${mod.id}-512.png`);
  fs.writeFileSync(p512, b512);

  const c192 = renderIcon(mod, 192);
  const b192 = c192.toBuffer('image/webp', 80);
  const p192 = path.join(OUT_DIR, `${mod.id}-192.webp`);
  fs.writeFileSync(p192, b192);

  const c96 = renderIcon(mod, 96);
  const b96 = c96.toBuffer('image/webp', 80);
  const p96 = path.join(OUT_DIR, `${mod.id}-96.webp`);
  fs.writeFileSync(p96, b96);

  report.push({
    id: mod.id,
    png512_ko: +(b512.length / 1024).toFixed(2),
    webp192_ko: +(b192.length / 1024).toFixed(2),
    webp96_ko: +(b96.length / 1024).toFixed(2)
  });
}

console.log('Icônes Wax générées avec succès :');
console.table(report);
