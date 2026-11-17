import { PDFDocument, rgb } from "pdf-lib";
import { AscqPlanningData } from "./types";
import { 
  loadPlanningFonts, 
  loadPlanningImages, 
  embedDataUrlImage, 
  drawVectorCheckmark, 
  sanitizeWinAnsi,
  wrapText
} from "./assets";

const ACTIVITES_OFFICIELLES_ASCQ = [
  "Causerie éducative",
  "Sensibilisation / démonstration / salubrité",
  "Vaccination poste fixe/avancée",
  "Supervision RC et validation VAD",
  "Prise en charge communautaire des cas (iCCM)",
  "Visites des sites prioritaires",
  "Visites à domicile et dépistage actif",
  "Campagne spécifique de santé publique",
  "Suivi groupé et orientation des RC",
  "Formation continue des RC",
];

const JOURS_COLS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * Génère le PDF officiel du planning hebdomadaire de l'ASCQ
 * FORMAT IMPOSÉ : A4 Paysage [841.89, 595.28] - STRICTEMENT SUR 1 PAGE
 * DESIGN ADMINISTRATIF OFFICIEL HAUT DE GAMME POUR LE MINISTÈRE DE LA SANTÉ & CNLS-TP
 */
export async function generatePdfPlanningAscq(data: AscqPlanningData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]);

  const { regular, bold } = await loadPlanningFonts(pdfDoc);
  const { bannerImg, logoImg } = await loadPlanningImages(pdfDoc);
  const signatureImg = await embedDataUrlImage(pdfDoc, data.signatureTactile);

  // Palette officielle République du Bénin / Santé Publique
  const cGreenPrimary = rgb(0 / 255, 92 / 255, 48 / 255);    // Vert institutionnel #005c30
  const cFlagGreen = rgb(0 / 255, 135 / 255, 81 / 255);       // Vert drapeau #008751
  const cFlagYellow = rgb(252 / 255, 209 / 255, 22 / 255);   // Jaune drapeau #FCD116
  const cFlagRed = rgb(232 / 255, 17 / 255, 45 / 255);       // Rouge drapeau #E8112D
  const cBlueNavy = rgb(0 / 255, 53 / 255, 115 / 255);       // Bleu foncé officiel #003573
  const cSlateDark = rgb(15 / 255, 23 / 255, 42 / 255);       // #0f172a
  const cSlateMuted = rgb(100 / 255, 116 / 255, 139 / 255);  // #64748b
  const cBorderSoft = rgb(203 / 255, 213 / 255, 225 / 255);  // #cbd5e1
  const cBgSoft = rgb(248 / 255, 250 / 255, 252 / 255);      // #f8fafc
  const cBgAlt = rgb(241 / 255, 245 / 255, 249 / 255);       // #f1f5f9
  const cWhite = rgb(1, 1, 1);
  const cRedAlert = rgb(185 / 255, 28 / 255, 28 / 255);      // #b91c1c
  const cRedBg = rgb(254 / 255, 242 / 255, 242 / 255);       // #fef2f2

  const marginX = 24;
  const contentWidth = 841.89 - marginX * 2; // 793.89 pt
  const pageCenterX = marginX + contentWidth / 2;

  // =========================================================================
  // 1. EN-TÊTE HARMONIEUX NON-DÉFORMÉ (LOGO ASC À GAUCHE + BANNIÈRE CNLS À DROITE)
  // =========================================================================
  const headerTopY = 582;
  const headerH = 46;

  // A. Logo officiel ASC Bénin (à gauche, ratio préservé)
  const logoH = 46;
  const logoW = 62;
  if (logoImg) {
    page.drawImage(logoImg, {
      x: marginX + 2,
      y: headerTopY - logoH,
      width: logoW,
      height: logoH,
    });
  }

  // B. Bannière officielle CNLS-TP (à droite, ratio original préservé ~5.59 : 1)
  const bannerH = 44;
  const bannerW = 246;
  const bannerX = marginX + contentWidth - bannerW - 2;
  if (bannerImg) {
    page.drawImage(bannerImg, {
      x: bannerX,
      y: headerTopY - bannerH - 1,
      width: bannerW,
      height: bannerH,
    });
  } else {
    page.drawRectangle({
      x: bannerX,
      y: headerTopY - bannerH - 1,
      width: bannerW,
      height: bannerH,
      color: cBgAlt,
      borderColor: cBorderSoft,
      borderWidth: 1,
    });
    page.drawText("CNLS-TP / PRÉSIDENCE DU BÉNIN", {
      x: bannerX + 15,
      y: headerTopY - 26,
      size: 9,
      font: bold,
      color: cBlueNavy,
    });
  }

  // C. Titres officiels centrés (entre les deux emblèmes)
  const centerTitleX = marginX + logoW + (contentWidth - logoW - bannerW) / 2;

  const tLine1 = "RÉPUBLIQUE DU BÉNIN — MINISTÈRE DE LA SANTÉ";
  const w1 = bold.widthOfTextAtSize(tLine1, 8.5);
  page.drawText(tLine1, {
    x: centerTitleX - w1 / 2,
    y: headerTopY - 10,
    size: 8.5,
    font: bold,
    color: cBlueNavy,
  });

  const tLine2 = "POLITIQUE NATIONALE DE SANTÉ COMMUNAUTAIRE (PNSC)";
  const w2 = bold.widthOfTextAtSize(tLine2, 9);
  page.drawText(tLine2, {
    x: centerTitleX - w2 / 2,
    y: headerTopY - 22,
    size: 9,
    font: bold,
    color: cGreenPrimary,
  });

  const tLine3 = "PLANNING HEBDOMADAIRE D'ACTIVITÉS DES ASCQ";
  const w3 = bold.widthOfTextAtSize(tLine3, 12);
  page.drawText(tLine3, {
    x: centerTitleX - w3 / 2,
    y: headerTopY - 36,
    size: 12,
    font: bold,
    color: cGreenPrimary,
  });

  const periodeTexte = sanitizeWinAnsi(
    data.periodeLabel || `Semaine Épidémiologique N° ${data.semaine} — Du ${data.dateDebut} au ${data.dateFin}`
  );
  const w4 = regular.widthOfTextAtSize(periodeTexte, 8.5);
  page.drawText(periodeTexte, {
    x: centerTitleX - w4 / 2,
    y: headerTopY - 47,
    size: 8.5,
    font: bold,
    color: cSlateDark,
  });

  // D. Bande tricolore béninoise pleine largeur
  const tricolorY = headerTopY - headerH - 8;
  const colW = contentWidth / 3;
  page.drawRectangle({ x: marginX, y: tricolorY, width: colW, height: 3, color: cFlagGreen });
  page.drawRectangle({ x: marginX + colW, y: tricolorY, width: colW, height: 3, color: cFlagYellow });
  page.drawRectangle({ x: marginX + colW * 2, y: tricolorY, width: colW, height: 3, color: cFlagRed });

  // =========================================================================
  // 2. SECTION 1 : CARTOUCHE D'IDENTIFICATION & LOCALISATION (2 LIGNES)
  // =========================================================================
  const cartoucheY = tricolorY - 40;
  const cartoucheH = 36;
  const cellW3 = contentWidth / 3;

  // Cadre global du cartouche
  page.drawRectangle({
    x: marginX,
    y: cartoucheY,
    width: contentWidth,
    height: cartoucheH,
    color: cBgSoft,
    borderColor: cBorderSoft,
    borderWidth: 1,
  });
  // Ligne de séparation horizontale
  page.drawLine({
    start: { x: marginX, y: cartoucheY + cartoucheH / 2 },
    end: { x: marginX + contentWidth, y: cartoucheY + cartoucheH / 2 },
    thickness: 1,
    color: cBorderSoft,
  });
  // Séparations verticales
  page.drawLine({
    start: { x: marginX + cellW3, y: cartoucheY },
    end: { x: marginX + cellW3, y: cartoucheY + cartoucheH },
    thickness: 1,
    color: cBorderSoft,
  });
  page.drawLine({
    start: { x: marginX + cellW3 * 2, y: cartoucheY },
    end: { x: marginX + cellW3 * 2, y: cartoucheY + cartoucheH },
    thickness: 1,
    color: cBorderSoft,
  });

  // Ligne 1 : Département, Commune, Arrondissement
  const r1Y = cartoucheY + cartoucheH / 2 + 5.5;
  page.drawText("DÉPARTEMENT :", { x: marginX + 8, y: r1Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(sanitizeWinAnsi(data.departement).toUpperCase() || "ZOU", { x: marginX + 85, y: r1Y, size: 8.5, font: bold, color: cSlateDark });

  page.drawText("COMMUNE :", { x: marginX + cellW3 + 8, y: r1Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(sanitizeWinAnsi(data.commune).toUpperCase() || "OUINHI", { x: marginX + cellW3 + 68, y: r1Y, size: 8.5, font: bold, color: cSlateDark });

  page.drawText("ARRONDISSEMENT :", { x: marginX + cellW3 * 2 + 8, y: r1Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(sanitizeWinAnsi(data.arrondissement).toUpperCase() || "TOHOUÈS", { x: marginX + cellW3 * 2 + 105, y: r1Y, size: 8.5, font: bold, color: cSlateDark });

  // Ligne 2 : Nom ASCQ, Contact Téléphonique, Relais Communautaires
  const r2Y = cartoucheY + 5.5;
  page.drawText("NOM ET PRÉNOM(S) ASCQ :", { x: marginX + 8, y: r2Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(sanitizeWinAnsi(data.ascqNom).toUpperCase() || "BRUNO DOSSOU", { x: marginX + 130, y: r2Y, size: 8.5, font: bold, color: cSlateDark });

  page.drawText("CONTACT (TÉL) :", { x: marginX + cellW3 + 8, y: r2Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(sanitizeWinAnsi(data.ascqPhone) || "-", { x: marginX + cellW3 + 88, y: r2Y, size: 8.5, font: bold, color: cSlateDark });

  const rcResume = `${data.rcPlanifies} planifié(s) / ${data.rcAttendus} attendu(s)`;
  page.drawText("RELAIS COMM. (RC) :", { x: marginX + cellW3 * 2 + 8, y: r2Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(rcResume, { 
    x: marginX + cellW3 * 2 + 105, 
    y: r2Y, 
    size: 8.5, 
    font: bold, 
    color: data.rcPlanifies !== data.rcAttendus ? cRedAlert : cGreenPrimary 
  });

  // =========================================================================
  // 3. TABLEAU DES 10+1 ACTIVITÉS PRINCIPALES (STYLE OFFICIEL AÉRÉ & LISIBLE)
  // =========================================================================
  const tblTopY = cartoucheY - 6;
  const colW_No = 25;
  const colW_Act = 285;
  const colW_Resp = 45;
  const colW_Day = 31;
  const colW_DaysTotal = colW_Day * 7; // 217 pt
  const colW_Obs = contentWidth - (colW_No + colW_Act + colW_Resp + colW_DaysTotal); // 221.89 pt

  const thH = 20;
  const rowH = 22.5;
  const nbRows = data.autreActiviteNom ? 11 : 10;
  const tblH = thH + nbRows * rowH;
  const tblBottomY = tblTopY - tblH;

  // Entête du tableau (Fond Vert Foncé Officiel #005c30, Texte Blanc)
  page.drawRectangle({
    x: marginX,
    y: tblTopY - thH,
    width: contentWidth,
    height: thH,
    color: cGreenPrimary,
  });

  // Textes des colonnes d'entête
  page.drawText("N°", { x: marginX + 7, y: tblTopY - 14, size: 8, font: bold, color: cWhite });
  page.drawText("ACTIVITÉS PRINCIPALES (CNLS-TP)", { x: marginX + colW_No + 10, y: tblTopY - 14, size: 8, font: bold, color: cWhite });
  page.drawText("RESP.", { x: marginX + colW_No + colW_Act + 8, y: tblTopY - 14, size: 8, font: bold, color: cWhite });

  JOURS_COLS.forEach((j, idx) => {
    const jX = marginX + colW_No + colW_Act + colW_Resp + idx * colW_Day;
    const jTextW = bold.widthOfTextAtSize(j, 7.5);
    page.drawText(j, { x: jX + (colW_Day - jTextW) / 2, y: tblTopY - 14, size: 7.5, font: bold, color: cWhite });
  });

  page.drawText("OBSERVATIONS & CIBLES SPÉCIFIQUES", { 
    x: marginX + colW_No + colW_Act + colW_Resp + colW_DaysTotal + 10, 
    y: tblTopY - 14, 
    size: 8, 
    font: bold, 
    color: cWhite 
  });

  // Lignes du tableau
  const activitiesList = [...ACTIVITES_OFFICIELLES_ASCQ];
  if (data.autreActiviteNom) {
    activitiesList.push(data.autreActiviteNom);
  }

  // Largeur du sous-tableau gauche (hors colonne observations fusionnée)
  const leftTableW = contentWidth - colW_Obs;
  const obsX = marginX + leftTableW;

  activitiesList.forEach((actName, idx) => {
    const rY = tblTopY - thH - (idx + 1) * rowH;
    const isAlt = idx % 2 === 1;

    // Fond alterné pour les colonnes de gauche uniquement
    page.drawRectangle({
      x: marginX,
      y: rY,
      width: leftTableW,
      height: rowH,
      color: isAlt ? cBgSoft : cWhite,
    });

    // Numéro formaté "01", "02", etc.
    const numStr = String(idx + 1).padStart(2, "0");
    page.drawText(numStr, { 
      x: marginX + 6, 
      y: rY + 7, 
      size: 8, 
      font: bold, 
      color: cSlateMuted 
    });

    // Titre de l'activité
    const cleanActName = sanitizeWinAnsi(actName);
    page.drawText(cleanActName, { 
      x: marginX + colW_No + 8, 
      y: rY + 7, 
      size: 8.2, 
      font: bold, 
      color: cSlateDark 
    });

    // Responsable
    page.drawText("ASCQ", { 
      x: marginX + colW_No + colW_Act + 9, 
      y: rY + 7, 
      size: 7.5, 
      font: bold, 
      color: cGreenPrimary 
    });

    // Cases des Jours (LUN à DIM)
    const selectedDays = idx < 10 
      ? (data.activitesJours[idx + 1] || []) 
      : (data.autreActiviteJours || []);

    JOURS_COLS.forEach((j, jIdx) => {
      const cellCenterX = marginX + colW_No + colW_Act + colW_Resp + jIdx * colW_Day + colW_Day / 2;
      const cellCenterY = rY + rowH / 2;
      const isChecked = selectedDays.includes(j);

      if (isChecked) {
        // Coche vectorielle verte nette et impeccable
        drawVectorCheckmark(page, cellCenterX, cellCenterY, 13);
      } else {
        // Tiret discret centré
        page.drawText("-", { 
          x: cellCenterX - 2, 
          y: cellCenterY - 3, 
          size: 8, 
          font: regular, 
          color: rgb(203 / 255, 213 / 255, 225 / 255) 
        });
      }
    });

    // Ligne de séparation horizontale fine (ne coupe pas la colonne Observations)
    page.drawLine({
      start: { x: marginX, y: rY },
      end: { x: marginX + leftTableW, y: rY },
      thickness: 0.75,
      color: cBorderSoft,
    });
  });

  // Colonne OBSERVATIONS FUSIONNÉE (style officiel rowspan sur toute la hauteur)
  page.drawRectangle({
    x: obsX,
    y: tblBottomY,
    width: colW_Obs,
    height: nbRows * rowH,
    color: cWhite,
  });

  const obsLines = wrapText(data.observations || "Néant / RAS", regular, 8.2, colW_Obs - 16);
  let obsLineY = tblTopY - thH - 16;
  const maxLines = Math.floor((nbRows * rowH - 24) / 12);
  obsLines.slice(0, maxLines).forEach((line) => {
    page.drawText(line, {
      x: obsX + 8,
      y: obsLineY,
      size: 8,
      font: regular,
      color: data.observations ? cSlateDark : cSlateMuted,
    });
    obsLineY -= 12;
  });

  // Grille verticale du tableau
  let currentBorderX = marginX;
  const vertCols = [colW_No, colW_Act, colW_Resp, ...Array(7).fill(colW_Day), colW_Obs];
  vertCols.forEach((w) => {
    currentBorderX += w;
    page.drawLine({
      start: { x: currentBorderX, y: tblBottomY },
      end: { x: currentBorderX, y: tblTopY },
      thickness: 0.75,
      color: cBorderSoft,
    });
  });

  // Bordure extérieure complète du tableau
  page.drawRectangle({
    x: marginX,
    y: tblBottomY,
    width: contentWidth,
    height: tblH,
    borderColor: cBorderSoft,
    borderWidth: 1.2,
  });

  // =========================================================================
  // 4. PIED DE PAGE : DEUX BLOCS OFFICIELS ÉQUILIBRÉS & INSTITUTIONNELS
  // =========================================================================
  const bottomCardY = 20;
  const bottomCardH = tblBottomY - bottomCardY - 8; // environ 170-175 pt
  const leftCardW = 430;
  const rightCardW = contentWidth - leftCardW - 12; // 351.89 pt
  const rightCardX = marginX + leftCardW + 12;

  // --- BLOC GAUCHE : STATUT & EFFECTIF DES RELAIS COMMUNAUTAIRES (RC) ---
  page.drawRectangle({
    x: marginX,
    y: bottomCardY,
    width: leftCardW,
    height: bottomCardH,
    color: cBgSoft,
    borderColor: cBorderSoft,
    borderWidth: 1,
  });
  // Barre accent gauche verte
  page.drawRectangle({
    x: marginX,
    y: bottomCardY,
    width: 4,
    height: bottomCardH,
    color: cGreenPrimary,
  });

  let curLeftY = bottomCardY + bottomCardH - 16;
  page.drawText("STATUT DES RELAIS COMMUNAUTAIRES (RC) DE L'ARRONDISSEMENT", {
    x: marginX + 14,
    y: curLeftY,
    size: 9,
    font: bold,
    color: cBlueNavy,
  });

  curLeftY -= 18;
  page.drawText(`- Nombre total de RC planifiés cette semaine : `, {
    x: marginX + 14,
    y: curLeftY,
    size: 8.5,
    font: regular,
    color: cSlateDark,
  });
  page.drawText(`${data.rcPlanifies} RC`, {
    x: marginX + 230,
    y: curLeftY,
    size: 8.5,
    font: bold,
    color: cGreenPrimary,
  });

  curLeftY -= 15;
  page.drawText(`- Nombre total de RC attendus selon la cartographie : `, {
    x: marginX + 14,
    y: curLeftY,
    size: 8.5,
    font: regular,
    color: cSlateDark,
  });
  page.drawText(`${data.rcAttendus} RC`, {
    x: marginX + 230,
    y: curLeftY,
    size: 8.5,
    font: bold,
    color: cSlateDark,
  });

  // Encadré Motif d'écart si écart constaté
  if (data.rcPlanifies !== data.rcAttendus) {
    curLeftY -= 36;
    page.drawRectangle({
      x: marginX + 14,
      y: curLeftY,
      width: leftCardW - 28,
      height: 30,
      color: cRedBg,
      borderColor: rgb(248 / 255, 113 / 255, 113 / 255),
      borderWidth: 1,
    });
    page.drawText("MOTIF DE L'ÉCART D'EFFECTIF DES RC :", {
      x: marginX + 22,
      y: curLeftY + 18,
      size: 7.5,
      font: bold,
      color: cRedAlert,
    });
    const motifStr = sanitizeWinAnsi(data.motifEcart || "Écart d'effectif signalé en attente de régularisation.");
    page.drawText(motifStr, {
      x: marginX + 22,
      y: curLeftY + 6,
      size: 8.5,
      font: bold,
      color: cSlateDark,
    });
  }

  // Mention légale de bas de bloc
  page.drawText("Document officiel validé conformément aux normes de la Direction Départementale de la Santé.", {
    x: marginX + 14,
    y: bottomCardY + 10,
    size: 6.8,
    font: regular,
    color: cSlateMuted,
  });

  // --- BLOC DROIT : VALIDATION ET SIGNATURE MANUSCRITE DE L'ASCQ ---
  page.drawRectangle({
    x: rightCardX,
    y: bottomCardY,
    width: rightCardW,
    height: bottomCardH,
    color: cWhite,
    borderColor: cBorderSoft,
    borderWidth: 1,
  });
  // Barre accent gauche verte
  page.drawRectangle({
    x: rightCardX,
    y: bottomCardY,
    width: 4,
    height: bottomCardH,
    color: cGreenPrimary,
  });

  let curRightY = bottomCardY + bottomCardH - 16;
  page.drawText("VALIDATION ET SIGNATURE MANUSCRITE DE L'ASCQ", {
    x: rightCardX + 14,
    y: curRightY,
    size: 9,
    font: bold,
    color: cBlueNavy,
  });

  curRightY -= 15;
  const dateStr = data.dateValidation || new Date().toLocaleDateString("fr-FR");
  page.drawText(`Fait à ${sanitizeWinAnsi(data.arrondissement || "Arrondissement")}, le ${dateStr}`, {
    x: rightCardX + 14,
    y: curRightY,
    size: 8,
    font: regular,
    color: cSlateMuted,
  });

  // Emplacement Signature tactile
  const sigBoxY = bottomCardY + 45;
  const sigBoxH = 50;
  const sigBoxW = rightCardW - 28;

  if (signatureImg) {
    const sAsp = signatureImg.width / signatureImg.height;
    let sW = sigBoxH * sAsp;
    let sH = sigBoxH;
    if (sW > sigBoxW) {
      sW = sigBoxW;
      sH = sW / sAsp;
    }
    page.drawImage(signatureImg, {
      x: rightCardX + 14 + (sigBoxW - sW) / 2,
      y: sigBoxY + (sigBoxH - sH) / 2,
      width: sW,
      height: sH,
    });
  } else {
    page.drawRectangle({
      x: rightCardX + 14,
      y: sigBoxY,
      width: sigBoxW,
      height: sigBoxH,
      color: cBgSoft,
      borderColor: cBorderSoft,
      borderWidth: 0.75,
    });
    page.drawText("[Signature tactile enregistrée numériquement]", {
      x: rightCardX + 28,
      y: sigBoxY + 22,
      size: 8,
      font: regular,
      color: cSlateMuted,
    });
  }

  // Nom de l'ASCQ et Cachet officiel
  const ascqSignerName = `L'ASCQ : ${sanitizeWinAnsi(data.ascqNom).toUpperCase() || "DÉCLARANT"}`;
  page.drawText(ascqSignerName, {
    x: rightCardX + 14,
    y: bottomCardY + 24,
    size: 9,
    font: bold,
    color: cGreenPrimary,
  });

  // Cachet officiel de conformité dans l'angle droit
  const stampW = 125;
  const stampH = 34;
  const stampX = rightCardX + rightCardW - stampW - 10;
  const stampY = bottomCardY + 10;

  page.drawRectangle({
    x: stampX,
    y: stampY,
    width: stampW,
    height: stampH,
    color: rgb(240 / 255, 253 / 255, 244 / 255),
    borderColor: cGreenPrimary,
    borderWidth: 1.2,
  });
  page.drawText("RÉPUBLIQUE DU BÉNIN", { x: stampX + 15, y: stampY + 23, size: 6.5, font: bold, color: cGreenPrimary });
  page.drawText("PNSC / CNLS-TP", { x: stampX + 28, y: stampY + 13, size: 6.5, font: bold, color: cBlueNavy });
  page.drawText("VALIDÉ OFFICIELLEMENT", { x: stampX + 12, y: stampY + 4, size: 6.5, font: bold, color: cGreenPrimary });

  return await pdfDoc.save();
}
