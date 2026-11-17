import { PDFDocument, rgb } from "pdf-lib";
import { AscqPlanningData } from "./types";
import { loadPlanningFonts, loadPlanningImages, embedDataUrlImage } from "./assets";

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
 * FORMAT IMPOSÉ : A4 Paysage [841.89, 595.28] - EXACTEMENT SUR 1 PAGE
 */
export async function generatePdfPlanningAscq(data: AscqPlanningData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]);

  const { regular, bold } = await loadPlanningFonts(pdfDoc);
  const { bannerImg, logoImg } = await loadPlanningImages(pdfDoc);
  const signatureImg = await embedDataUrlImage(pdfDoc, data.signatureTactile);

  // Couleurs institutionnelles Bénin
  const cGreen = rgb(0 / 255, 92 / 255, 48 / 255);       // #005c30
  const cFlagGreen = rgb(0 / 255, 135 / 255, 81 / 255);   // #008751
  const cFlagYellow = rgb(252 / 255, 209 / 255, 22 / 255);// #FCD116
  const cFlagRed = rgb(232 / 255, 17 / 255, 45 / 255);    // #E8112D
  const cBlueHeader = rgb(0 / 255, 53 / 255, 115 / 255);  // #003573
  const cTblHeaderBg = rgb(233 / 255, 239 / 255, 247 / 255); // #e9eff7
  const cGrayBorder = rgb(180 / 255, 190 / 255, 205 / 255);
  const cDarkBorder = rgb(60 / 255, 75 / 255, 95 / 255);
  const cTextDark = rgb(25 / 255, 30 / 255, 40 / 255);
  const cTextMuted = rgb(90 / 255, 105 / 255, 125 / 255);
  const cWhite = rgb(1, 1, 1);
  const cRedAlert = rgb(185 / 255, 28 / 255, 28 / 255);
  const cRedAlertBg = rgb(254 / 255, 242 / 255, 242 / 255);

  const marginX = 24;
  const contentWidth = 841.89 - marginX * 2; // 793.89 pt

  // =========================================================================
  // 1. BANNIÈRE OFFICIELLE CNLS-TP (Plein format supérieur)
  // =========================================================================
  const bannerY = 552;
  const bannerH = 32;
  if (bannerImg) {
    page.drawImage(bannerImg, {
      x: marginX,
      y: bannerY,
      width: contentWidth,
      height: bannerH,
    });
  } else {
    // Repli graphique si image non disponible
    page.drawRectangle({
      x: marginX,
      y: bannerY,
      width: contentWidth,
      height: bannerH,
      color: rgb(245 / 255, 247 / 255, 250 / 255),
      borderColor: cBlueHeader,
      borderWidth: 1,
    });
    page.drawText("CONSEIL NATIONAL DE LUTTE CONTRE LE VIH/SIDA, LA TUBERCULOSE, LE PALUDISME ET LES ÉPIDÉMIES (CNLS-TP)", {
      x: marginX + 15,
      y: bannerY + 12,
      size: 9,
      font: bold,
      color: cBlueHeader,
    });
  }

  // =========================================================================
  // 2. EN-TÊTE MINISTÉRIEL + LOGO ASC BÉNIN
  // =========================================================================
  const subY = 502;
  const logoW = 42;
  const logoH = 42;
  if (logoImg) {
    page.drawImage(logoImg, {
      x: marginX + 4,
      y: subY,
      width: logoW,
      height: logoH,
    });
  }

  // Textes centraux
  const titleCenterX = marginX + contentWidth / 2;
  
  const line1 = "RÉPUBLIQUE DU BÉNIN — MINISTÈRE DE LA SANTÉ";
  const line1W = bold.widthOfTextAtSize(line1, 8.5);
  page.drawText(line1, {
    x: titleCenterX - line1W / 2,
    y: subY + 34,
    size: 8.5,
    font: bold,
    color: cTextDark,
  });

  const line2 = "POLITIQUE NATIONALE DE SANTÉ COMMUNAUTAIRE (PNSC)";
  const line2W = bold.widthOfTextAtSize(line2, 10.5);
  page.drawText(line2, {
    x: titleCenterX - line2W / 2,
    y: subY + 22,
    size: 10.5,
    font: bold,
    color: cGreen,
  });

  const line3 = "DISPOSITIF COMMUNAUTAIRE DE PROXIMITÉ : RELAIS COMMUNAUTAIRES (RC) & ASCQ";
  const line3W = regular.widthOfTextAtSize(line3, 7.5);
  page.drawText(line3, {
    x: titleCenterX - line3W / 2,
    y: subY + 12,
    size: 7.5,
    font: regular,
    color: cTextMuted,
  });

  // Bloc Contact Ministère à droite
  const contactX = marginX + contentWidth - 110;
  page.drawText("Contact Ministère :", { x: contactX, y: subY + 32, size: 7, font: bold, color: cTextDark });
  page.drawText("01 BP 882 Cotonou", { x: contactX, y: subY + 23, size: 6.5, font: regular, color: cTextMuted });
  page.drawText("Tél : +229 21 33 21 78", { x: contactX, y: subY + 14, size: 6.5, font: regular, color: cTextMuted });
  page.drawText("sante.infos@gouv.bj", { x: contactX, y: subY + 5, size: 6.5, font: regular, color: cTextMuted });

  // Titre principal du document
  const mainTitle = "PLANNING HEBDOMADAIRE D'ACTIVITÉS DES ASCQ";
  const mainTitleW = bold.widthOfTextAtSize(mainTitle, 12);
  page.drawText(mainTitle, {
    x: titleCenterX - mainTitleW / 2,
    y: subY - 10,
    size: 12,
    font: bold,
    color: cGreen,
  });
  // Soulignement du titre
  page.drawLine({
    start: { x: titleCenterX - mainTitleW / 2, y: subY - 12 },
    end: { x: titleCenterX + mainTitleW / 2, y: subY - 12 },
    thickness: 1,
    color: cGreen,
  });

  const semPeriodeStr = `Semaine Épidémiologique N° ${data.semaine} (Du ${data.dateDebut} au ${data.dateFin})`;
  const semW = bold.widthOfTextAtSize(semPeriodeStr, 9);
  page.drawText(semPeriodeStr, {
    x: titleCenterX - semW / 2,
    y: subY - 23,
    size: 9,
    font: bold,
    color: cTextDark,
  });

  // Barre tricolore du Bénin
  const flagY = subY - 28;
  const flagW = contentWidth / 3;
  page.drawRectangle({ x: marginX, y: flagY, width: flagW, height: 2.5, color: cFlagGreen });
  page.drawRectangle({ x: marginX + flagW, y: flagY, width: flagW, height: 2.5, color: cFlagYellow });
  page.drawRectangle({ x: marginX + flagW * 2, y: flagY, width: flagW, height: 2.5, color: cFlagRed });

  // =========================================================================
  // 3. BLOC D'IDENTIFICATION & CARTOGRAPHIE (Cadre structuré)
  // =========================================================================
  const metaY = flagY - 34;
  const metaH = 28;

  page.drawRectangle({
    x: marginX,
    y: metaY,
    width: contentWidth,
    height: metaH,
    color: rgb(248 / 255, 250 / 255, 252 / 255),
    borderColor: cDarkBorder,
    borderWidth: 1,
  });

  // Ligne de séparation médiane horizontale
  page.drawLine({
    start: { x: marginX, y: metaY + metaH / 2 },
    end: { x: marginX + contentWidth, y: metaY + metaH / 2 },
    thickness: 0.8,
    color: cGrayBorder,
  });

  // Lignes de séparation verticales (3 colonnes)
  const colW1 = contentWidth * 0.32;
  const colW2 = contentWidth * 0.34;
  page.drawLine({
    start: { x: marginX + colW1, y: metaY },
    end: { x: marginX + colW1, y: metaY + metaH },
    thickness: 0.8,
    color: cGrayBorder,
  });
  page.drawLine({
    start: { x: marginX + colW1 + colW2, y: metaY },
    end: { x: marginX + colW1 + colW2, y: metaY + metaH },
    thickness: 0.8,
    color: cGrayBorder,
  });

  // Ligne 1 : Département, Commune, Arrondissement
  const r1Y = metaY + metaH / 2 + 4;
  page.drawText("DÉPARTEMENT : ", { x: marginX + 6, y: r1Y, size: 7.5, font: bold, color: cTextDark });
  page.drawText((data.departement || "-").toUpperCase(), { x: marginX + 75, y: r1Y, size: 7.5, font: regular, color: cTextDark });

  page.drawText("COMMUNE : ", { x: marginX + colW1 + 6, y: r1Y, size: 7.5, font: bold, color: cTextDark });
  page.drawText((data.commune || "-").toUpperCase(), { x: marginX + colW1 + 58, y: r1Y, size: 7.5, font: regular, color: cTextDark });

  page.drawText("ARRONDISSEMENT : ", { x: marginX + colW1 + colW2 + 6, y: r1Y, size: 7.5, font: bold, color: cTextDark });
  page.drawText((data.arrondissement || "-").toUpperCase(), { x: marginX + colW1 + colW2 + 90, y: r1Y, size: 7.5, font: regular, color: cTextDark });

  // Ligne 2 : Nom ASCQ, Contact, Relais Communautaires
  const r2Y = metaY + 4;
  page.drawText("NOM ET PRÉNOM(S) ASCQ : ", { x: marginX + 6, y: r2Y, size: 7.5, font: bold, color: cTextDark });
  page.drawText((data.ascqNom || "-").toUpperCase(), { x: marginX + 115, y: r2Y, size: 7.5, font: regular, color: cTextDark });

  page.drawText("CONTACT (TÉL) : ", { x: marginX + colW1 + 6, y: r2Y, size: 7.5, font: bold, color: cTextDark });
  page.drawText(data.ascqPhone || "-", { x: marginX + colW1 + 75, y: r2Y, size: 7.5, font: regular, color: cTextDark });

  const rcResumeStr = `${data.rcPlanifies} planifié(s) / ${data.rcAttendus} attendu(s)`;
  page.drawText("RELAIS COMM. (RC) : ", { x: marginX + colW1 + colW2 + 6, y: r2Y, size: 7.5, font: bold, color: cTextDark });
  page.drawText(rcResumeStr, {
    x: marginX + colW1 + colW2 + 95,
    y: r2Y,
    size: 7.5,
    font: bold,
    color: Number(data.rcPlanifies) !== Number(data.rcAttendus) ? cRedAlert : cGreen,
  });

  // =========================================================================
  // 4. TABLEAU PRINCIPAL DES ACTIVITÉS (11 Lignes, 10 Colonnes)
  // =========================================================================
  const tblTop = metaY - 6;
  const tblH = 264; // 11 data rows * ~22pt + header 22pt = 264pt
  const rowH = 22;
  const headerH = 22;

  // Définition des largeurs de colonnes
  const wNum = 24;
  const wAct = 260;
  const wResp = 64;
  const wJour = 24; // 7 jours * 24 = 168 pt
  const wJoursTotal = wJour * 7;
  const wObs = contentWidth - (wNum + wAct + wResp + wJoursTotal); // 793.89 - (24 + 260 + 64 + 168) = 277.89 pt

  // Cadre extérieur du tableau
  page.drawRectangle({
    x: marginX,
    y: tblTop - tblH,
    width: contentWidth,
    height: tblH,
    color: cWhite,
    borderColor: cDarkBorder,
    borderWidth: 1.2,
  });

  // En-tête du tableau
  page.drawRectangle({
    x: marginX,
    y: tblTop - headerH,
    width: contentWidth,
    height: headerH,
    color: cTblHeaderBg,
  });

  // Titres des colonnes de l'en-tête
  const thY = tblTop - 15;
  page.drawText("N°", { x: marginX + 6, y: thY, size: 8, font: bold, color: cBlueHeader });
  page.drawText("ACTIVITÉS PRINCIPALES (CNLS-TP)", { x: marginX + wNum + 8, y: thY, size: 8, font: bold, color: cBlueHeader });
  page.drawText("RESP.", { x: marginX + wNum + wAct + 16, y: thY, size: 8, font: bold, color: cBlueHeader });

  JOURS_COLS.forEach((j, idx) => {
    const jX = marginX + wNum + wAct + wResp + idx * wJour;
    page.drawText(j.toUpperCase(), { x: jX + 3, y: thY, size: 7.5, font: bold, color: cBlueHeader });
  });

  page.drawText("OBSERVATIONS & CIBLES SPÉCIFIQUES", {
    x: marginX + wNum + wAct + wResp + wJoursTotal + 15,
    y: thY,
    size: 8,
    font: bold,
    color: cBlueHeader,
  });

  // Lignes de séparation verticales de l'en-tête
  let curX = marginX + wNum;
  page.drawLine({ start: { x: curX, y: tblTop }, end: { x: curX, y: tblTop - tblH }, thickness: 0.8, color: cDarkBorder });
  curX += wAct;
  page.drawLine({ start: { x: curX, y: tblTop }, end: { x: curX, y: tblTop - tblH }, thickness: 0.8, color: cDarkBorder });
  curX += wResp;
  page.drawLine({ start: { x: curX, y: tblTop }, end: { x: curX, y: tblTop - tblH }, thickness: 0.8, color: cDarkBorder });

  for (let i = 0; i < 7; i++) {
    curX += wJour;
    page.drawLine({ start: { x: curX, y: tblTop }, end: { x: curX, y: tblTop - tblH }, thickness: 0.6, color: cGrayBorder });
  }

  // Ligne après la colonne Dimanche (avant Observations)
  page.drawLine({ start: { x: curX, y: tblTop }, end: { x: curX, y: tblTop - tblH }, thickness: 0.8, color: cDarkBorder });

  // Ligne horizontale sous l'en-tête
  page.drawLine({
    start: { x: marginX, y: tblTop - headerH },
    end: { x: marginX + contentWidth, y: tblTop - headerH },
    thickness: 1,
    color: cDarkBorder,
  });

  // Tracé des 11 lignes d'activités
  const activitesTotal = [...ACTIVITES_OFFICIELLES_ASCQ];
  const autreNom = (data.autreActiviteNom || "").trim();
  activitesTotal.push(autreNom ? `11. ${autreNom}` : "11. Autre activité communautaire");

  activitesTotal.forEach((actTitre, rowIdx) => {
    const rowY = tblTop - headerH - (rowIdx + 1) * rowH;
    const textY = rowY + 6.5;

    // Fond alterné zébré très léger pour une lisibilité parfaite
    if (rowIdx % 2 === 1) {
      page.drawRectangle({
        x: marginX + 1,
        y: rowY,
        width: contentWidth - 2,
        height: rowH,
        color: rgb(250 / 255, 252 / 255, 254 / 255),
      });
    }

    // Ligne horizontale de séparation
    page.drawLine({
      start: { x: marginX, y: rowY },
      end: { x: marginX + contentWidth, y: rowY },
      thickness: 0.5,
      color: cGrayBorder,
    });

    // Numéro
    const numStr = String(rowIdx + 1);
    page.drawText(numStr, { x: marginX + 8, y: textY, size: 7.5, font: bold, color: cTextDark });

    // Intitulé de l'activité
    const nomAffiche = actTitre.startsWith(`${rowIdx + 1}. `) ? actTitre.replace(`${rowIdx + 1}. `, "") : actTitre;
    page.drawText(nomAffiche, {
      x: marginX + wNum + 6,
      y: textY,
      size: 7.5,
      font: rowIdx === 10 && autreNom ? bold : regular,
      color: cTextDark,
    });

    // Responsable (toujours ASCQ)
    page.drawText("ASCQ", {
      x: marginX + wNum + wAct + 18,
      y: textY,
      size: 7.5,
      font: regular,
      color: cTextDark,
    });

    // Jours cochés
    const joursSelectionnes = rowIdx < 10 
      ? (data.activitesJours?.[rowIdx + 1] || [])
      : (data.autreActiviteJours || []);

    JOURS_COLS.forEach((jAbrev, jIdx) => {
      const cellX = marginX + wNum + wAct + wResp + jIdx * wJour;
      const isChecked = joursSelectionnes.some(s => s.toLowerCase().startsWith(jAbrev.toLowerCase()));

      if (isChecked) {
        // Case cochée : petit carré avec croix / coche verte
        page.drawRectangle({
          x: cellX + 5,
          y: rowY + 4,
          width: 14,
          height: 14,
          color: rgb(236 / 255, 253 / 255, 245 / 255),
          borderColor: cGreen,
          borderWidth: 1,
        });
        page.drawText("X", {
          x: cellX + 8.5,
          y: rowY + 7,
          size: 9.5,
          font: bold,
          color: cGreen,
        });
      } else {
        // Case vide légère
        page.drawRectangle({
          x: cellX + 6,
          y: rowY + 5,
          width: 12,
          height: 12,
          color: cWhite,
          borderColor: rgb(215 / 255, 222 / 255, 230 / 255),
          borderWidth: 0.6,
        });
      }
    });
  });

  // Colonne Observations (texte fusionné ou indications globales)
  const obsBoxX = marginX + wNum + wAct + wResp + wJoursTotal + 6;
  const obsBoxY = tblTop - headerH - tblH + headerH + 6;
  const obsW = wObs - 12;

  // Affichage des observations générales de l'ASCQ
  const obsRaw = (data.observations || "").trim() || "Aucune observation particulière signalée.";
  // Découpage automatique des lignes d'observations
  const obsWords = obsRaw.split(/\s+/);
  let currentObsLine = "";
  let obsLineCount = 0;
  const obsStartY = tblTop - headerH - 14;

  obsWords.forEach((word) => {
    const testLine = currentObsLine ? `${currentObsLine} ${word}` : word;
    const testW = regular.widthOfTextAtSize(testLine, 7.5);
    if (testW < obsW) {
      currentObsLine = testLine;
    } else {
      if (obsLineCount < 10) {
        page.drawText(currentObsLine, {
          x: obsBoxX,
          y: obsStartY - obsLineCount * 11,
          size: 7.5,
          font: regular,
          color: cTextDark,
        });
        obsLineCount++;
      }
      currentObsLine = word;
    }
  });
  if (currentObsLine && obsLineCount < 10) {
    page.drawText(currentObsLine, {
      x: obsBoxX,
      y: obsStartY - obsLineCount * 11,
      size: 7.5,
      font: regular,
      color: cTextDark,
    });
  }

  // =========================================================================
  // 5. BAS DE PAGE : STATUT DES RELAIS (RC) & SIGNATURE ASCQ
  // =========================================================================
  const footerY = 22;
  const footerH = tblTop - tblH - footerY - 6; // ~100 pt
  const leftW = contentWidth * 0.58; // 460 pt
  const rightW = contentWidth - leftW - 10; // 323.89 pt

  // Carte gauche : Statut des RC et respect de la cartographie
  page.drawRectangle({
    x: marginX,
    y: footerY,
    width: leftW,
    height: footerH,
    color: rgb(248 / 255, 250 / 255, 252 / 255),
    borderColor: cDarkBorder,
    borderWidth: 1,
  });

  page.drawText("STATUT DES RELAIS COMMUNAUTAIRES (RC) DE L'ARRONDISSEMENT", {
    x: marginX + 10,
    y: footerY + footerH - 14,
    size: 8,
    font: bold,
    color: cGreen,
  });

  const rcLine1 = `• Nombre total de RC planifiés cette semaine : ${data.rcPlanifies}`;
  const rcLine2 = `• Nombre total de RC attendus selon la cartographie : ${data.rcAttendus}`;
  page.drawText(rcLine1, { x: marginX + 12, y: footerY + footerH - 28, size: 7.5, font: bold, color: cTextDark });
  page.drawText(rcLine2, { x: marginX + 12, y: footerY + footerH - 40, size: 7.5, font: bold, color: cTextDark });

  const aEcart = Number(data.rcPlanifies) !== Number(data.rcAttendus);
  if (aEcart) {
    // Alerte rouge explicite pour le motif de l'écart
    page.drawRectangle({
      x: marginX + 10,
      y: footerY + 18,
      width: leftW - 20,
      height: 28,
      color: cRedAlertBg,
      borderColor: cRedAlert,
      borderWidth: 0.8,
    });
    page.drawText("MOTIF DE L'ÉCART D'EFFECTIF DES RC :", {
      x: marginX + 16,
      y: footerY + 34,
      size: 7,
      font: bold,
      color: cRedAlert,
    });
    const motifTxt = (data.motifEcart || "Écart non justifié").trim();
    page.drawText(motifTxt.slice(0, 90), {
      x: marginX + 16,
      y: footerY + 23,
      size: 7,
      font: regular,
      color: cRedAlert,
    });
  } else {
    // Validation complète
    page.drawText("✓ Effectif complet mobilisé : 100% des Relais Communautaires sont planifiés.", {
      x: marginX + 12,
      y: footerY + 30,
      size: 7.5,
      font: bold,
      color: cGreen,
    });
  }

  page.drawText("Document officiel validé conformément aux normes de la Direction Départementale de la Santé.", {
    x: marginX + 12,
    y: footerY + 7,
    size: 6.5,
    font: regular,
    color: cTextMuted,
  });

  // Carte droite : Signature & Validation officielle de l'ASCQ
  const rightX = marginX + leftW + 10;
  page.drawRectangle({
    x: rightX,
    y: footerY,
    width: rightW,
    height: footerH,
    color: cWhite,
    borderColor: cDarkBorder,
    borderWidth: 1,
  });

  page.drawText("VALIDATION ET SIGNATURE MANUSCRITE DE L'ASCQ", {
    x: rightX + 10,
    y: footerY + footerH - 14,
    size: 8,
    font: bold,
    color: cBlueHeader,
  });

  const dateValStr = data.dateValidation || new Date().toLocaleDateString("fr-FR");
  page.drawText(`Fait à ${data.arrondissement || data.commune || "Honvié"}, le ${dateValStr}`, {
    x: rightX + 10,
    y: footerY + footerH - 26,
    size: 7.5,
    font: regular,
    color: cTextDark,
  });

  // Espace pour la signature tactile
  if (signatureImg) {
    page.drawImage(signatureImg, {
      x: rightX + 25,
      y: footerY + 20,
      width: 140,
      height: 38,
    });
  } else {
    page.drawText("[Signature tactile enregistrée numériquement]", {
      x: rightX + 20,
      y: footerY + 34,
      size: 7,
      font: regular,
      color: cTextMuted,
    });
  }

  // Nom complet de l'ASCQ sous la signature
  const nomAscqAffiche = `L'ASCQ : ${(data.ascqNom || "").toUpperCase()}`;
  page.drawText(nomAscqAffiche, {
    x: rightX + 10,
    y: footerY + 8,
    size: 7.5,
    font: bold,
    color: cTextDark,
  });

  // Tampon visuel "CERTIFIÉ CONFORME"
  const stampX = rightX + rightW - 105;
  const stampY = footerY + 16;
  page.drawRectangle({
    x: stampX,
    y: stampY,
    width: 95,
    height: 42,
    borderColor: cGreen,
    borderWidth: 1.2,
    color: rgb(240 / 255, 253 / 255, 244 / 255),
  });
  page.drawText("RÉPUBLIQUE DU BÉNIN", { x: stampX + 8, y: stampY + 30, size: 6.5, font: bold, color: cGreen });
  page.drawText("PNSC / CNLS-TP", { x: stampX + 18, y: stampY + 20, size: 7, font: bold, color: cGreen });
  page.drawText("VALIDÉ OFFICIELLEMENT", { x: stampX + 5, y: stampY + 9, size: 6.5, font: bold, color: cGreen });

  return await pdfDoc.save();
}
