import { PDFDocument, rgb } from "pdf-lib";
import { RcPlanningData, RcPlanningSlot } from "./types";
import { 
  loadPlanningFonts, 
  loadPlanningImages, 
  embedDataUrlImage, 
  sanitizeWinAnsi,
  wrapText,
  fitText
} from "./assets";

const ACTIVITES_OFFICIELLES_RC = [
  { key: "act_vad", label: "1. Visites à domicile (VAD)" },
  { key: "act_causerie", label: "2. Causeries / Sensibilisation / Salubrité" },
  { key: "act_animale", label: "3. Santé animale (One Health)" },
  { key: "act_sociales", label: "4. Affaires sociales" },
  { key: "act_femmes", label: "5. Suivi des femmes enceintes" },
  { key: "act_enfants", label: "6. Suivi des enfants de 0 à 59 mois" },
  { key: "act_referees", label: "7. Personnes référées" },
  { key: "act_autres", label: "8. Autres activités" },
] as const;

function formatDateFr(dStr?: string): string {
  if (!dStr) return "-";
  if (dStr.includes("/")) return dStr;
  const p = dStr.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dStr;
}

/**
 * Génère le PDF officiel du planning hebdomadaire du Relais Communautaire (RC)
 * FORMAT IMPOSÉ : A4 Paysage [841.89, 595.28] - STRICTEMENT SUR 1 PAGE
 * DESIGN ADMINISTRATIF OFFICIEL HAUT DE GAMME POUR LE MINISTÈRE DE LA SANTÉ & CNLS-TP
 */
export async function generatePdfPlanningRc(data: RcPlanningData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]);

  const { regular, bold } = await loadPlanningFonts(pdfDoc);
  const { bannerImg, logoImg } = await loadPlanningImages(pdfDoc);
  const sigRcImg = await embedDataUrlImage(pdfDoc, data.signatureRc);
  const sigAscqImg = await embedDataUrlImage(pdfDoc, data.signatureAscq);

  // Palette officielle
  const cGreenPrimary = rgb(0 / 255, 92 / 255, 48 / 255);    // #005c30
  const cFlagGreen = rgb(0 / 255, 135 / 255, 81 / 255);       // #008751
  const cFlagYellow = rgb(252 / 255, 209 / 255, 22 / 255);   // #FCD116
  const cFlagRed = rgb(232 / 255, 17 / 255, 45 / 255);       // #E8112D
  const cBlueNavy = rgb(0 / 255, 53 / 255, 115 / 255);       // #003573
  const cSlateDark = rgb(15 / 255, 23 / 255, 42 / 255);       // #0f172a
  const cSlateMuted = rgb(100 / 255, 116 / 255, 139 / 255);  // #64748b
  const cBorderSoft = rgb(203 / 255, 213 / 255, 225 / 255);  // #cbd5e1
  const cBgSoft = rgb(248 / 255, 250 / 255, 252 / 255);      // #f8fafc
  const cBgAlt = rgb(241 / 255, 245 / 255, 249 / 255);       // #f1f5f9
  const cWhite = rgb(1, 1, 1);
  const cAmberWait = rgb(180 / 255, 83 / 255, 9 / 255);
  const cAmberBg = rgb(254 / 255, 243 / 255, 199 / 255);

  const marginX = 24;
  const contentWidth = 841.89 - marginX * 2; // 793.89 pt

  // =========================================================================
  // 1. EN-TÊTE HARMONIEUX (LOGO ASC À GAUCHE + BANNIÈRE CNLS À DROITE)
  // =========================================================================
  const headerTopY = 582;
  const headerH = 46;

  // Logo officiel ASC Bénin à gauche
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

  // Bannière officielle CNLS-TP à droite
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

  // Titres officiels centrés
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

  const tLine3 = "PLANNING HEBDOMADAIRE D'ACTIVITÉS DU RELAIS COMMUNAUTAIRE (RC)";
  const w3 = bold.widthOfTextAtSize(tLine3, 11);
  page.drawText(tLine3, {
    x: centerTitleX - w3 / 2,
    y: headerTopY - 36,
    size: 11,
    font: bold,
    color: cGreenPrimary,
  });

  const semStr = `Semaine Épidémiologique N° ${data.semaineNum} — Du ${formatDateFr(data.dateDebutStr)} au ${formatDateFr(data.dateFinStr)}`;
  const w4 = bold.widthOfTextAtSize(semStr, 8.5);
  page.drawText(semStr, {
    x: centerTitleX - w4 / 2,
    y: headerTopY - 47,
    size: 8.5,
    font: bold,
    color: cSlateDark,
  });

  // Bande tricolore béninoise
  const tricolorY = headerTopY - headerH - 8;
  const colW = contentWidth / 3;
  page.drawRectangle({ x: marginX, y: tricolorY, width: colW, height: 3, color: cFlagGreen });
  page.drawRectangle({ x: marginX + colW, y: tricolorY, width: colW, height: 3, color: cFlagYellow });
  page.drawRectangle({ x: marginX + colW * 2, y: tricolorY, width: colW, height: 3, color: cFlagRed });

  // =========================================================================
  // 2. SECTION 1 : CARTOUCHE DE LOCALISATION & DU RELAIS (3 LIGNES COMPACTES)
  // =========================================================================
  const cartoucheY = tricolorY - 48;
  const cartoucheH = 44;
  const cellW3 = contentWidth / 3;

  page.drawRectangle({
    x: marginX,
    y: cartoucheY,
    width: contentWidth,
    height: cartoucheH,
    color: cBgSoft,
    borderColor: cBorderSoft,
    borderWidth: 1,
  });

  // 2 séparations horizontales
  const lineH1 = cartoucheY + (cartoucheH / 3) * 2;
  const lineH2 = cartoucheY + cartoucheH / 3;
  page.drawLine({ start: { x: marginX, y: lineH1 }, end: { x: marginX + contentWidth, y: lineH1 }, thickness: 1, color: cBorderSoft });
  page.drawLine({ start: { x: marginX, y: lineH2 }, end: { x: marginX + contentWidth, y: lineH2 }, thickness: 1, color: cBorderSoft });

  // Séparations verticales
  page.drawLine({ start: { x: marginX + cellW3, y: cartoucheY }, end: { x: marginX + cellW3, y: cartoucheY + cartoucheH }, thickness: 1, color: cBorderSoft });
  page.drawLine({ start: { x: marginX + cellW3 * 2, y: cartoucheY }, end: { x: marginX + cellW3 * 2, y: cartoucheY + cartoucheH }, thickness: 1, color: cBorderSoft });

  // Ligne 1 : Département, Zone Sanitaire, Commune
  const r1Y = lineH1 + 3.5;
  page.drawText("DÉPARTEMENT :", { x: marginX + 8, y: r1Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(sanitizeWinAnsi(data.departement).toUpperCase() || "ZOU", { x: marginX + 85, y: r1Y, size: 8, font: bold, color: cSlateDark });

  page.drawText("ZONE SANITAIRE :", { x: marginX + cellW3 + 8, y: r1Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(sanitizeWinAnsi(data.zoneSanitaire).toUpperCase() || "ZONE", { x: marginX + cellW3 + 90, y: r1Y, size: 8, font: bold, color: cSlateDark });

  page.drawText("COMMUNE :", { x: marginX + cellW3 * 2 + 8, y: r1Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(sanitizeWinAnsi(data.commune).toUpperCase() || "OUINHI", { x: marginX + cellW3 * 2 + 65, y: r1Y, size: 8, font: bold, color: cSlateDark });

  // Ligne 2 : Arrondissement, Village/Quartier, Grappe
  const r2Y = lineH2 + 3.5;
  page.drawText("ARRONDISSEMENT :", { x: marginX + 8, y: r2Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(sanitizeWinAnsi(data.arrondissement).toUpperCase() || "TOHOUÈS", { x: marginX + 100, y: r2Y, size: 8, font: bold, color: cSlateDark });

  page.drawText("VILLAGE / QUARTIER :", { x: marginX + cellW3 + 8, y: r2Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(sanitizeWinAnsi(data.village).toUpperCase() || "HONVIÉ", { x: marginX + cellW3 + 110, y: r2Y, size: 8, font: bold, color: cSlateDark });

  page.drawText("GRAPPE N° :", { x: marginX + cellW3 * 2 + 8, y: r2Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(String(data.grappe || "1"), { x: marginX + cellW3 * 2 + 65, y: r2Y, size: 8, font: bold, color: cSlateDark });

  // Ligne 3 : Nom du Relais, Téléphone, ASCQ Superviseur
  const r3Y = cartoucheY + 3.5;
  page.drawText("NOM DU RELAIS :", { x: marginX + 8, y: r3Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(sanitizeWinAnsi(data.rcName).toUpperCase() || "RELAIS", { x: marginX + 90, y: r3Y, size: 8, font: bold, color: cSlateDark });

  page.drawText("CONTACT (TÉL) :", { x: marginX + cellW3 + 8, y: r3Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(sanitizeWinAnsi(data.rcPhone) || "-", { x: marginX + cellW3 + 85, y: r3Y, size: 8, font: bold, color: cSlateDark });

  page.drawText("ASCQ SUPERVISEUR :", { x: marginX + cellW3 * 2 + 8, y: r3Y, size: 7.5, font: bold, color: cSlateMuted });
  page.drawText(sanitizeWinAnsi(data.ascqName).toUpperCase() || "DOSSOU BRUNO", { x: marginX + cellW3 * 2 + 110, y: r3Y, size: 8, font: bold, color: cGreenPrimary });

  // =========================================================================
  // 3. TABLEAU DES 8 ACTIVITÉS HEBDOMADAIRES DU RELAIS (STYLE OFFICIEL AÉRÉ)
  // =========================================================================
  const tblTopY = cartoucheY - 6;
  const colW_No = 25;
  const colW_Act = 210;
  const colW_Date = 75;
  const colW_Heure = 65;
  const colW_Zone = 135;
  const colW_Qte = 80;
  const colW_Obs = contentWidth - (colW_No + colW_Act + colW_Date + colW_Heure + colW_Zone + colW_Qte); // 203.89 pt

  const leftTableW = contentWidth - colW_Obs;
  const obsX = marginX + leftTableW;

  const thH = 20;
  const rowH = 28.5; // Espacement généreux pour les 8 activités
  const tblH = thH + 8 * rowH;
  const tblBottomY = tblTopY - tblH;

  // Entête du tableau
  page.drawRectangle({
    x: marginX,
    y: tblTopY - thH,
    width: contentWidth,
    height: thH,
    color: cGreenPrimary,
  });

  page.drawText("N°", { x: marginX + 7, y: tblTopY - 14, size: 8, font: bold, color: cWhite });
  page.drawText("ACTIVITÉS DU RELAIS (RC)", { x: marginX + colW_No + 10, y: tblTopY - 14, size: 8, font: bold, color: cWhite });
  page.drawText("DATE PRÉVUE", { x: marginX + colW_No + colW_Act + 8, y: tblTopY - 14, size: 8, font: bold, color: cWhite });
  page.drawText("HEURE", { x: marginX + colW_No + colW_Act + colW_Date + 8, y: tblTopY - 14, size: 8, font: bold, color: cWhite });
  page.drawText("ZONE / LIEU CIBLÉ", { x: marginX + colW_No + colW_Act + colW_Date + colW_Heure + 8, y: tblTopY - 14, size: 8, font: bold, color: cWhite });
  page.drawText("QUANTITÉ", { x: marginX + colW_No + colW_Act + colW_Date + colW_Heure + colW_Zone + 8, y: tblTopY - 14, size: 8, font: bold, color: cWhite });
  page.drawText("OBSERVATIONS", { x: marginX + colW_No + colW_Act + colW_Date + colW_Heure + colW_Zone + colW_Qte + 8, y: tblTopY - 14, size: 8, font: bold, color: cWhite });

  // 8 Lignes d'activités
  ACTIVITES_OFFICIELLES_RC.forEach((actDef, idx) => {
    const rY = tblTopY - thH - (idx + 1) * rowH;
    const isAlt = idx % 2 === 1;

    // Fond alterné pour les colonnes de données à gauche
    page.drawRectangle({
      x: marginX,
      y: rY,
      width: leftTableW,
      height: rowH,
      color: isAlt ? cBgSoft : cWhite,
    });

    // Numéro
    page.drawText(`0${idx + 1}`, { x: marginX + 6, y: rY + 10, size: 8, font: bold, color: cSlateMuted });

    // Libellé de l'activité
    page.drawText(sanitizeWinAnsi(actDef.label), { 
      x: marginX + colW_No + 8, 
      y: rY + 10, 
      size: 8.2, 
      font: bold, 
      color: cSlateDark 
    });

    // Données du créneau planifié
    const slots = (data as any)[actDef.key] as RcPlanningSlot[] | undefined;
    const slot = slots && slots.length > 0 ? slots[0] : null;

    if (slot) {
      // Date
      page.drawText(sanitizeWinAnsi(formatDateFr(slot.date)), { 
        x: marginX + colW_No + colW_Act + 8, 
        y: rY + 10, 
        size: 8, 
        font: bold, 
        color: cSlateDark 
      });

      // Heure (sécurisée en largeur)
      page.drawText(fitText(slot.heure || "-", regular, 8, colW_Heure - 10), { 
        x: marginX + colW_No + colW_Act + colW_Date + 8, 
        y: rY + 10, 
        size: 8, 
        font: regular, 
        color: cSlateDark 
      });

      // Zone (sur 1 ou 2 lignes si nécessaire pour éviter la troncature)
      const zoneLines = wrapText(slot.zone || "Grappe", regular, 7.5, colW_Zone - 10);
      if (zoneLines.length <= 1) {
        page.drawText(zoneLines[0] || "-", { 
          x: marginX + colW_No + colW_Act + colW_Date + colW_Heure + 8, 
          y: rY + 10, 
          size: 7.8, 
          font: regular, 
          color: cSlateDark 
        });
      } else {
        page.drawText(zoneLines[0], { 
          x: marginX + colW_No + colW_Act + colW_Date + colW_Heure + 8, 
          y: rY + 15, 
          size: 7.2, 
          font: regular, 
          color: cSlateDark 
        });
        page.drawText(fitText(zoneLines.slice(1).join(" "), regular, 7.2, colW_Zone - 10), { 
          x: marginX + colW_No + colW_Act + colW_Date + colW_Heure + 8, 
          y: rY + 5, 
          size: 7.2, 
          font: regular, 
          color: cSlateDark 
        });
      }

      // Quantité (sur 1 ou 2 lignes si nécessaire)
      const qteLines = wrapText(String(slot.qte || "1"), bold, 7.8, colW_Qte - 10);
      if (qteLines.length <= 1) {
        page.drawText(qteLines[0] || "1", { 
          x: marginX + colW_No + colW_Act + colW_Date + colW_Heure + colW_Zone + 8, 
          y: rY + 10, 
          size: 8, 
          font: bold, 
          color: cGreenPrimary 
        });
      } else {
        page.drawText(qteLines[0], { 
          x: marginX + colW_No + colW_Act + colW_Date + colW_Heure + colW_Zone + 8, 
          y: rY + 15, 
          size: 7.5, 
          font: bold, 
          color: cGreenPrimary 
        });
        page.drawText(fitText(qteLines.slice(1).join(" "), bold, 7.5, colW_Qte - 10), { 
          x: marginX + colW_No + colW_Act + colW_Date + colW_Heure + colW_Zone + 8, 
          y: rY + 5, 
          size: 7.5, 
          font: bold, 
          color: cGreenPrimary 
        });
      }
    } else {
      // Affichage sobre et propre en cas d'absence de créneau
      const dashX = (w: number) => w / 2 - 2;
      page.drawText("-", { x: marginX + colW_No + colW_Act + dashX(colW_Date), y: rY + 10, size: 8, font: regular, color: cBorderSoft });
      page.drawText("-", { x: marginX + colW_No + colW_Act + colW_Date + dashX(colW_Heure), y: rY + 10, size: 8, font: regular, color: cBorderSoft });
      page.drawText("Ménages cibles", { x: marginX + colW_No + colW_Act + colW_Date + colW_Heure + 8, y: rY + 10, size: 7.5, font: regular, color: cSlateMuted });
      page.drawText("-", { x: marginX + colW_No + colW_Act + colW_Date + colW_Heure + colW_Zone + dashX(colW_Qte), y: rY + 10, size: 8, font: regular, color: cBorderSoft });
    }

    // Ligne horizontale qui s'arrête avant la colonne Observations fusionnée
    page.drawLine({
      start: { x: marginX, y: rY },
      end: { x: marginX + leftTableW, y: rY },
      thickness: 0.75,
      color: cBorderSoft,
    });
  });

  // Colonne OBSERVATIONS FUSIONNÉE (style officiel rowspan sur toute la hauteur des 8 activités)
  page.drawRectangle({
    x: obsX,
    y: tblBottomY,
    width: colW_Obs,
    height: 8 * rowH,
    color: cWhite,
  });

  let curObsY = tblTopY - thH - 16;
  if (data.observations) {
    page.drawText("Observations du RC :", { 
      x: obsX + 8, 
      y: curObsY, 
      size: 8, 
      font: bold, 
      color: cBlueNavy 
    });
    curObsY -= 12;
    const obsLines = wrapText(data.observations, regular, 7.8, colW_Obs - 16);
    obsLines.slice(0, 7).forEach((l) => {
      page.drawText(l, { 
        x: obsX + 8, 
        y: curObsY, 
        size: 7.8, 
        font: regular, 
        color: cSlateDark 
      });
      curObsY -= 11;
    });
  }

  if (data.observationsAscq) {
    curObsY -= 6;
    page.drawText("Avis Superviseur ASCQ :", { 
      x: obsX + 8, 
      y: curObsY, 
      size: 8, 
      font: bold, 
      color: cGreenPrimary 
    });
    curObsY -= 12;
    const ascqLines = wrapText(data.observationsAscq, regular, 7.8, colW_Obs - 16);
    ascqLines.slice(0, 5).forEach((l) => {
      page.drawText(l, { 
        x: obsX + 8, 
        y: curObsY, 
        size: 7.8, 
        font: regular, 
        color: cSlateDark 
      });
      curObsY -= 11;
    });
  }

  if (!data.observations && !data.observationsAscq) {
    page.drawText("Néant / RAS", { 
      x: obsX + 8, 
      y: curObsY, 
      size: 8, 
      font: regular, 
      color: cSlateMuted 
    });
  }

  // Grille verticale du tableau
  let curBX = marginX;
  const vertCols = [colW_No, colW_Act, colW_Date, colW_Heure, colW_Zone, colW_Qte, colW_Obs];
  vertCols.forEach((w) => {
    curBX += w;
    page.drawLine({
      start: { x: curBX, y: tblBottomY },
      end: { x: curBX, y: tblTopY },
      thickness: 0.75,
      color: cBorderSoft,
    });
  });

  page.drawRectangle({
    x: marginX,
    y: tblBottomY,
    width: contentWidth,
    height: tblH,
    borderColor: cBorderSoft,
    borderWidth: 1.2,
  });

  // =========================================================================
  // 4. PIED DE PAGE : DOUBLE SIGNATURE & VISA SUPERVISEUR ÉQUILIBRÉS
  // =========================================================================
  const bottomCardY = 20;
  const bottomCardH = tblBottomY - bottomCardY - 8; // environ 150 pt
  const dualCardW = (contentWidth - 12) / 2; // 390.9 pt
  const rightDualX = marginX + dualCardW + 12;

  // --- BLOC GAUCHE : SIGNATURE DU RELAIS COMMUNAUTAIRE (RC) ---
  page.drawRectangle({
    x: marginX,
    y: bottomCardY,
    width: dualCardW,
    height: bottomCardH,
    color: cWhite,
    borderColor: cBorderSoft,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: marginX,
    y: bottomCardY,
    width: 4,
    height: bottomCardH,
    color: cGreenPrimary,
  });

  let curLeftY = bottomCardY + bottomCardH - 16;
  page.drawText("SIGNATURE DU RELAIS COMMUNAUTAIRE (RC)", {
    x: marginX + 14,
    y: curLeftY,
    size: 9,
    font: bold,
    color: cBlueNavy,
  });

  curLeftY -= 15;
  const dateRcSoumis = formatDateFr(data.dateSoumissionRc || data.dateDebutStr);
  page.drawText(`Fait au village ${sanitizeWinAnsi(data.village || "Local")}, le ${dateRcSoumis}`, {
    x: marginX + 14,
    y: curLeftY,
    size: 8,
    font: regular,
    color: cSlateMuted,
  });

  const sigBoxY = bottomCardY + 45;
  const sigBoxH = 48;
  const sigBoxW = dualCardW - 28;

  if (sigRcImg) {
    const sAsp = sigRcImg.width / sigRcImg.height;
    let sW = sigBoxH * sAsp;
    let sH = sigBoxH;
    if (sW > sigBoxW) {
      sW = sigBoxW;
      sH = sW / sAsp;
    }
    page.drawImage(sigRcImg, {
      x: marginX + 14 + (sigBoxW - sW) / 2,
      y: sigBoxY + (sigBoxH - sH) / 2,
      width: sW,
      height: sH,
    });
  } else {
    page.drawRectangle({
      x: marginX + 14,
      y: sigBoxY,
      width: sigBoxW,
      height: sigBoxH,
      color: cBgSoft,
      borderColor: cBorderSoft,
      borderWidth: 0.75,
    });
    page.drawText("[Signature tactile enregistrée numériquement]", {
      x: marginX + 28,
      y: sigBoxY + 20,
      size: 8,
      font: regular,
      color: cSlateMuted,
    });
  }

  page.drawText(`Le Relais Communautaire : ${sanitizeWinAnsi(data.rcName).toUpperCase() || "RELAIS"}`, {
    x: marginX + 14,
    y: bottomCardY + 22,
    size: 9,
    font: bold,
    color: cSlateDark,
  });

  // --- BLOC DROIT : VISA, VALIDATION & APPROBATION DE L'ASCQ SUPERVISEUR ---
  page.drawRectangle({
    x: rightDualX,
    y: bottomCardY,
    width: dualCardW,
    height: bottomCardH,
    color: cWhite,
    borderColor: cBorderSoft,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: rightDualX,
    y: bottomCardY,
    width: 4,
    height: bottomCardH,
    color: cGreenPrimary,
  });

  let curRightY = bottomCardY + bottomCardH - 16;
  page.drawText("VISA, VALIDATION & APPROBATION DE L'ASCQ SUPERVISEUR", {
    x: rightDualX + 14,
    y: curRightY,
    size: 9,
    font: bold,
    color: cBlueNavy,
  });

  curRightY -= 20;
  const isValide = data.luEtApprouveAscq || data.statut === "VALIDE_ASCQ" || data.statut === "VALIDE";

  if (isValide) {
    // Badge vert officiel "Validé et Approuvé"
    page.drawRectangle({
      x: rightDualX + 14,
      y: curRightY - 4,
      width: dualCardW - 28,
      height: 22,
      color: rgb(240 / 255, 253 / 255, 244 / 255),
      borderColor: rgb(187 / 255, 247 / 255, 208 / 255),
      borderWidth: 1,
    });
    page.drawText("PLANNING APPROUVE ET VALIDE PAR L'ASCQ", {
      x: rightDualX + 26,
      y: curRightY + 3,
      size: 8.5,
      font: bold,
      color: cGreenPrimary,
    });

    curRightY -= 20;
    const dateVal = data.dateValidationAscq ? formatDateFr(data.dateValidationAscq.split("T")[0]) : new Date().toLocaleDateString("fr-FR");
    page.drawText(`Date de validation : ${dateVal}`, {
      x: rightDualX + 14,
      y: curRightY,
      size: 8,
      font: regular,
      color: cSlateMuted,
    });
  } else {
    // Badge ambre en attente
    page.drawRectangle({
      x: rightDualX + 14,
      y: curRightY - 4,
      width: dualCardW - 28,
      height: 22,
      color: cAmberBg,
      borderColor: rgb(253 / 255, 230 / 255, 138 / 255),
      borderWidth: 1,
    });
    page.drawText("EN ATTENTE DE VISA ET APPROBATION PAR L'ASCQ", {
      x: rightDualX + 26,
      y: curRightY + 3,
      size: 8.5,
      font: bold,
      color: cAmberWait,
    });
  }

  // Signature de l'ASCQ si présente
  if (sigAscqImg) {
    const sAsp = sigAscqImg.width / sigAscqImg.height;
    let sW = 40 * sAsp;
    let sH = 40;
    if (sW > 120) {
      sW = 120;
      sH = sW / sAsp;
    }
    page.drawImage(sigAscqImg, {
      x: rightDualX + 14,
      y: bottomCardY + 42,
      width: sW,
      height: sH,
    });
  }

  page.drawText(`L'ASCQ : ${sanitizeWinAnsi(data.ascqName).toUpperCase() || "SUPERVISEUR"}`, {
    x: rightDualX + 14,
    y: bottomCardY + 22,
    size: 9,
    font: bold,
    color: cGreenPrimary,
  });

  // Cachet officiel de conformité dans l'angle droit
  const stampW = 125;
  const stampH = 34;
  const stampX = rightDualX + dualCardW - stampW - 10;
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
  page.drawText("PNSC / ARRONDISSEMENT", { x: stampX + 14, y: stampY + 13, size: 6.5, font: bold, color: cBlueNavy });
  page.drawText("VISA ASCQ : VALIDÉ", { x: stampX + 22, y: stampY + 4, size: 6.5, font: bold, color: cGreenPrimary });

  return await pdfDoc.save();
}
