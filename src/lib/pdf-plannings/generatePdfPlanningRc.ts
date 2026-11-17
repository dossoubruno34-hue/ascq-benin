import { PDFDocument, rgb } from "pdf-lib";
import { RcPlanningData, RcPlanningSlot } from "./types";
import { loadPlanningFonts, loadPlanningImages, embedDataUrlImage } from "./assets";

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

/**
 * Formate une date en format français JJ/MM/AAAA
 */
function formatDateFr(dStr?: string): string {
  if (!dStr) return "-";
  if (dStr.includes("/")) return dStr;
  const p = dStr.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dStr;
}

/**
 * Génère le PDF officiel du planning hebdomadaire du Relais Communautaire (RC)
 * FORMAT IMPOSÉ : A4 Paysage [841.89, 595.28] - EXACTEMENT SUR 1 PAGE
 * AVEC DOUBLE SIGNATURE (RC + VISA / VALIDATION ASCQ)
 */
export async function generatePdfPlanningRc(data: RcPlanningData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]);

  const { regular, bold } = await loadPlanningFonts(pdfDoc);
  const { bannerImg, logoImg } = await loadPlanningImages(pdfDoc);
  const sigRcImg = await embedDataUrlImage(pdfDoc, data.signatureRc);
  const sigAscqImg = await embedDataUrlImage(pdfDoc, data.signatureAscq);

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
  const cAmberWait = rgb(180 / 255, 83 / 255, 9 / 255);
  const cAmberBg = rgb(254 / 255, 243 / 255, 199 / 255);

  const marginX = 24;
  const contentWidth = 841.89 - marginX * 2; // 793.89 pt

  // =========================================================================
  // 1. BANNIÈRE OFFICIELLE CNLS-TP
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

  // Contact Ministère
  const contactX = marginX + contentWidth - 110;
  page.drawText("Contact Ministère :", { x: contactX, y: subY + 32, size: 7, font: bold, color: cTextDark });
  page.drawText("01 BP 882 Cotonou", { x: contactX, y: subY + 23, size: 6.5, font: regular, color: cTextMuted });
  page.drawText("Tél : +229 21 33 21 78", { x: contactX, y: subY + 14, size: 6.5, font: regular, color: cTextMuted });
  page.drawText("sante.infos@gouv.bj", { x: contactX, y: subY + 5, size: 6.5, font: regular, color: cTextMuted });

  // Titre principal du RC
  const mainTitle = "PLANNING HEBDOMADAIRE D'ACTIVITÉS DU RELAIS COMMUNAUTAIRE (RC)";
  const mainTitleW = bold.widthOfTextAtSize(mainTitle, 11.5);
  page.drawText(mainTitle, {
    x: titleCenterX - mainTitleW / 2,
    y: subY - 10,
    size: 11.5,
    font: bold,
    color: cGreen,
  });
  page.drawLine({
    start: { x: titleCenterX - mainTitleW / 2, y: subY - 12 },
    end: { x: titleCenterX + mainTitleW / 2, y: subY - 12 },
    thickness: 1,
    color: cGreen,
  });

  const semPeriodeStr = `Semaine Épidémiologique N° ${data.semaineNum} (Du ${formatDateFr(data.dateDebutStr)} au ${formatDateFr(data.dateFinStr)})`;
  const semW = bold.widthOfTextAtSize(semPeriodeStr, 9);
  page.drawText(semPeriodeStr, {
    x: titleCenterX - semW / 2,
    y: subY - 23,
    size: 9,
    font: bold,
    color: cTextDark,
  });

  // Barre tricolore
  const flagY = subY - 28;
  const flagW = contentWidth / 3;
  page.drawRectangle({ x: marginX, y: flagY, width: flagW, height: 2.5, color: cFlagGreen });
  page.drawRectangle({ x: marginX + flagW, y: flagY, width: flagW, height: 2.5, color: cFlagYellow });
  page.drawRectangle({ x: marginX + flagW * 2, y: flagY, width: flagW, height: 2.5, color: cFlagRed });

  // =========================================================================
  // 3. TABLEAU DES MÉTADONNÉES DU RELAIS COMMUNAUTAIRE (3 Lignes)
  // =========================================================================
  const metaY = flagY - 42;
  const metaH = 36;

  page.drawRectangle({
    x: marginX,
    y: metaY,
    width: contentWidth,
    height: metaH,
    color: rgb(248 / 255, 250 / 255, 252 / 255),
    borderColor: cDarkBorder,
    borderWidth: 1,
  });

  // Séparations horizontales
  const mRowH = metaH / 3; // 12 pt par ligne
  page.drawLine({
    start: { x: marginX, y: metaY + mRowH * 2 },
    end: { x: marginX + contentWidth, y: metaY + mRowH * 2 },
    thickness: 0.6,
    color: cGrayBorder,
  });
  page.drawLine({
    start: { x: marginX, y: metaY + mRowH },
    end: { x: marginX + contentWidth, y: metaY + mRowH },
    thickness: 0.6,
    color: cGrayBorder,
  });

  // Séparations verticales (3 colonnes)
  const mCol1 = contentWidth * 0.33;
  const mCol2 = contentWidth * 0.34;
  page.drawLine({
    start: { x: marginX + mCol1, y: metaY },
    end: { x: marginX + mCol1, y: metaY + metaH },
    thickness: 0.6,
    color: cGrayBorder,
  });
  page.drawLine({
    start: { x: marginX + mCol1 + mCol2, y: metaY },
    end: { x: marginX + mCol1 + mCol2, y: metaY + metaH },
    thickness: 0.6,
    color: cGrayBorder,
  });

  // Ligne 1 : Département, Zone Sanitaire, Commune
  const mr1Y = metaY + mRowH * 2 + 3;
  page.drawText("DÉPARTEMENT : ", { x: marginX + 6, y: mr1Y, size: 7, font: bold, color: cTextDark });
  page.drawText((data.departement || "-").toUpperCase(), { x: marginX + 70, y: mr1Y, size: 7, font: regular, color: cTextDark });

  page.drawText("ZONE SANITAIRE : ", { x: marginX + mCol1 + 6, y: mr1Y, size: 7, font: bold, color: cTextDark });
  page.drawText((data.zoneSanitaire || "-").toUpperCase(), { x: marginX + mCol1 + 80, y: mr1Y, size: 7, font: regular, color: cTextDark });

  page.drawText("COMMUNE : ", { x: marginX + mCol1 + mCol2 + 6, y: mr1Y, size: 7, font: bold, color: cTextDark });
  page.drawText((data.commune || "-").toUpperCase(), { x: marginX + mCol1 + mCol2 + 55, y: mr1Y, size: 7, font: regular, color: cTextDark });

  // Ligne 2 : Arrondissement, Village/Quartier, Grappe N°
  const mr2Y = metaY + mRowH + 3;
  page.drawText("ARRONDISSEMENT : ", { x: marginX + 6, y: mr2Y, size: 7, font: bold, color: cTextDark });
  page.drawText((data.arrondissement || "-").toUpperCase(), { x: marginX + 85, y: mr2Y, size: 7, font: regular, color: cTextDark });

  page.drawText("VILLAGE / QUARTIER : ", { x: marginX + mCol1 + 6, y: mr2Y, size: 7, font: bold, color: cTextDark });
  page.drawText((data.village || "-").toUpperCase(), { x: marginX + mCol1 + 95, y: mr2Y, size: 7, font: regular, color: cTextDark });

  page.drawText("GRAPPE N° : ", { x: marginX + mCol1 + mCol2 + 6, y: mr2Y, size: 7, font: bold, color: cTextDark });
  page.drawText(String(data.grappe || "1"), { x: marginX + mCol1 + mCol2 + 55, y: mr2Y, size: 7, font: bold, color: cGreen });

  // Ligne 3 : Nom RC, Contact, ASCQ Superviseur
  const mr3Y = metaY + 3;
  page.drawText("NOM DU RELAIS : ", { x: marginX + 6, y: mr3Y, size: 7, font: bold, color: cTextDark });
  page.drawText((data.rcName || "-").toUpperCase(), { x: marginX + 75, y: mr3Y, size: 7, font: regular, color: cTextDark });

  page.drawText("CONTACT (TÉL) : ", { x: marginX + mCol1 + 6, y: mr3Y, size: 7, font: bold, color: cTextDark });
  page.drawText(data.rcPhone || "-", { x: marginX + mCol1 + 75, y: mr3Y, size: 7, font: regular, color: cTextDark });

  page.drawText("ASCQ SUPERVISEUR : ", { x: marginX + mCol1 + mCol2 + 6, y: mr3Y, size: 7, font: bold, color: cTextDark });
  page.drawText((data.ascqName || "ASCQ de l'arrondissement").toUpperCase(), {
    x: marginX + mCol1 + mCol2 + 95,
    y: mr3Y,
    size: 7,
    font: regular,
    color: cTextDark,
  });

  // =========================================================================
  // 4. TABLEAU DES 8 ACTIVITÉS PLANIFIÉES (Structure officielle)
  // =========================================================================
  const tblTop = metaY - 6;
  const tblH = 260; // Hauteur totale du tableau (header + 8 activités)
  const headerH = 20;
  const rowH = (tblH - headerH) / 8; // 240 / 8 = 30 pt par activité

  // Largeurs de colonnes
  const wAct = 210;
  const wDate = 70;
  const wHeure = 60;
  const wZone = 160;
  const wQte = 60;
  const wObs = contentWidth - (wAct + wDate + wHeure + wZone + wQte); // 793.89 - 560 = 233.89 pt

  // Cadre extérieur
  page.drawRectangle({
    x: marginX,
    y: tblTop - tblH,
    width: contentWidth,
    height: tblH,
    color: cWhite,
    borderColor: cDarkBorder,
    borderWidth: 1.2,
  });

  // En-tête
  page.drawRectangle({
    x: marginX,
    y: tblTop - headerH,
    width: contentWidth,
    height: headerH,
    color: cTblHeaderBg,
  });

  const thY = tblTop - 14;
  page.drawText("ACTIVITÉS PLANIFIÉES", { x: marginX + 8, y: thY, size: 8, font: bold, color: cBlueHeader });
  page.drawText("DATE", { x: marginX + wAct + 15, y: thY, size: 8, font: bold, color: cBlueHeader });
  page.drawText("HEURE", { x: marginX + wAct + wDate + 12, y: thY, size: 8, font: bold, color: cBlueHeader });
  page.drawText("ZONE / CIBLE", { x: marginX + wAct + wDate + wHeure + 20, y: thY, size: 8, font: bold, color: cBlueHeader });
  page.drawText("QUANTITÉ", { x: marginX + wAct + wDate + wHeure + wZone + 8, y: thY, size: 8, font: bold, color: cBlueHeader });
  page.drawText("OBSERVATIONS", { x: marginX + wAct + wDate + wHeure + wZone + wQte + 15, y: thY, size: 8, font: bold, color: cBlueHeader });

  // Lignes verticales de colonnes
  let cx = marginX + wAct;
  page.drawLine({ start: { x: cx, y: tblTop }, end: { x: cx, y: tblTop - tblH }, thickness: 0.8, color: cDarkBorder });
  cx += wDate;
  page.drawLine({ start: { x: cx, y: tblTop }, end: { x: cx, y: tblTop - tblH }, thickness: 0.6, color: cGrayBorder });
  cx += wHeure;
  page.drawLine({ start: { x: cx, y: tblTop }, end: { x: cx, y: tblTop - tblH }, thickness: 0.6, color: cGrayBorder });
  cx += wZone;
  page.drawLine({ start: { x: cx, y: tblTop }, end: { x: cx, y: tblTop - tblH }, thickness: 0.6, color: cGrayBorder });
  cx += wQte;
  page.drawLine({ start: { x: cx, y: tblTop }, end: { x: cx, y: tblTop - tblH }, thickness: 0.8, color: cDarkBorder });

  // Ligne sous en-tête
  page.drawLine({
    start: { x: marginX, y: tblTop - headerH },
    end: { x: marginX + contentWidth, y: tblTop - headerH },
    thickness: 1,
    color: cDarkBorder,
  });

  // Affichage des 8 lignes d'activités
  ACTIVITES_OFFICIELLES_RC.forEach((act, idx) => {
    const rowY = tblTop - headerH - (idx + 1) * rowH;

    // Fond zébré
    if (idx % 2 === 1) {
      page.drawRectangle({
        x: marginX + 1,
        y: rowY,
        width: contentWidth - 2,
        height: rowH,
        color: rgb(250 / 255, 252 / 255, 254 / 255),
      });
    }

    // Séparateur horizontal
    page.drawLine({
      start: { x: marginX, y: rowY },
      end: { x: marginX + contentWidth, y: rowY },
      thickness: 0.5,
      color: cGrayBorder,
    });

    // Intitulé activité
    page.drawText(act.label, {
      x: marginX + 6,
      y: rowY + rowH / 2 - 3,
      size: 7.5,
      font: bold,
      color: cTextDark,
    });

    // Données de créneaux
    const slots: RcPlanningSlot[] = (data as any)[act.key] || [];
    if (slots.length > 0) {
      // Si 1 ou plusieurs créneaux, formater le premier proprement
      const s0 = slots[0];
      page.drawText(formatDateFr(s0.date), {
        x: marginX + wAct + 8,
        y: rowY + rowH / 2 - 3,
        size: 7.5,
        font: regular,
        color: cTextDark,
      });
      page.drawText(s0.heure || "-", {
        x: marginX + wAct + wDate + 8,
        y: rowY + rowH / 2 - 3,
        size: 7.5,
        font: regular,
        color: cTextDark,
      });
      page.drawText((s0.zone || "Ménages grappe").slice(0, 32), {
        x: marginX + wAct + wDate + wHeure + 6,
        y: rowY + rowH / 2 - 3,
        size: 7,
        font: regular,
        color: cTextDark,
      });
      page.drawText(String(s0.qte || "0"), {
        x: marginX + wAct + wDate + wHeure + wZone + 22,
        y: rowY + rowH / 2 - 3,
        size: 8,
        font: bold,
        color: cGreen,
      });
    } else {
      // Créneau vide par défaut
      const emptyY = rowY + rowH / 2 - 3;
      page.drawText("-", { x: marginX + wAct + 28, y: emptyY, size: 7.5, font: regular, color: cTextMuted });
      page.drawText("-", { x: marginX + wAct + wDate + 25, y: emptyY, size: 7.5, font: regular, color: cTextMuted });
      page.drawText("Ménages cibles", { x: marginX + wAct + wDate + wHeure + 6, y: emptyY, size: 7, font: regular, color: cTextMuted });
      page.drawText("-", { x: marginX + wAct + wDate + wHeure + wZone + 26, y: emptyY, size: 7.5, font: regular, color: cTextMuted });
    }
  });

  // Colonne Observations fusionnée (à droite)
  const obsX = marginX + wAct + wDate + wHeure + wZone + wQte + 6;
  const obsMaxW = wObs - 12;
  const obsText = (data.observations || "").trim() || "Aucune observation particulière signalée par le Relais.";
  const obsWords = obsText.split(/\s+/);
  let curLine = "";
  let lCount = 0;
  const obsStartY = tblTop - headerH - 16;

  obsWords.forEach((word) => {
    const testLine = curLine ? `${curLine} ${word}` : word;
    const testW = regular.widthOfTextAtSize(testLine, 7.5);
    if (testW < obsMaxW) {
      curLine = testLine;
    } else {
      if (lCount < 10) {
        page.drawText(curLine, {
          x: obsX,
          y: obsStartY - lCount * 11,
          size: 7.5,
          font: regular,
          color: cTextDark,
        });
        lCount++;
      }
      curLine = word;
    }
  });
  if (curLine && lCount < 10) {
    page.drawText(curLine, {
      x: obsX,
      y: obsStartY - lCount * 11,
      size: 7.5,
      font: regular,
      color: cTextDark,
    });
  }

  // =========================================================================
  // 5. BAS DE PAGE : DOUBLE SIGNATURE & VALIDATION OFFICIELLE
  // =========================================================================
  const footerY = 22;
  const footerH = tblTop - tblH - footerY - 6; // ~100 pt
  const sigBoxW = (contentWidth - 10) / 2; // 391.89 pt

  // Carte gauche : Signature du Relais Communautaire
  page.drawRectangle({
    x: marginX,
    y: footerY,
    width: sigBoxW,
    height: footerH,
    color: cWhite,
    borderColor: cDarkBorder,
    borderWidth: 1,
  });

  page.drawText("SIGNATURE DU RELAIS COMMUNAUTAIRE (RC)", {
    x: marginX + 10,
    y: footerY + footerH - 14,
    size: 8,
    font: bold,
    color: cGreen,
  });

  const soumStr = data.dateSoumissionRc || new Date().toLocaleDateString("fr-FR");
  page.drawText(`Fait au village ${data.village || ""}, le ${soumStr}`, {
    x: marginX + 10,
    y: footerY + footerH - 26,
    size: 7.5,
    font: regular,
    color: cTextDark,
  });

  if (sigRcImg) {
    page.drawImage(sigRcImg, {
      x: marginX + 25,
      y: footerY + 20,
      width: 130,
      height: 38,
    });
  } else {
    page.drawText("[Signature tactile enregistrée numériquement]", {
      x: marginX + 15,
      y: footerY + 32,
      size: 7,
      font: regular,
      color: cTextMuted,
    });
  }

  page.drawText(`Le Relais Communautaire : ${(data.rcName || "").toUpperCase()}`, {
    x: marginX + 10,
    y: footerY + 8,
    size: 7.5,
    font: bold,
    color: cTextDark,
  });

  // Carte droite : Approbation & Validation par l'ASCQ Superviseur
  const rightX = marginX + sigBoxW + 10;
  page.drawRectangle({
    x: rightX,
    y: footerY,
    width: sigBoxW,
    height: footerH,
    color: cWhite,
    borderColor: cDarkBorder,
    borderWidth: 1,
  });

  page.drawText("VISA, VALIDATION & APPROBATION DE L'ASCQ SUPERVISEUR", {
    x: rightX + 10,
    y: footerY + footerH - 14,
    size: 8,
    font: bold,
    color: cBlueHeader,
  });

  const estValide = data.luEtApprouveAscq || data.statut === "VALIDE_ASCQ" || data.statut === "VALIDE";
  if (estValide) {
    // Badge vert officiel
    page.drawRectangle({
      x: rightX + 10,
      y: footerY + footerH - 32,
      width: 210,
      height: 14,
      color: rgb(240 / 255, 253 / 255, 244 / 255),
      borderColor: cGreen,
      borderWidth: 0.8,
    });
    page.drawText("✓ PLANNING APPROUVÉ ET VALIDÉ PAR L'ASCQ", {
      x: rightX + 16,
      y: footerY + footerH - 28,
      size: 7,
      font: bold,
      color: cGreen,
    });

    const dateValStr = data.dateValidationAscq ? formatDateFr(data.dateValidationAscq) : new Date().toLocaleDateString("fr-FR");
    page.drawText(`Date de validation : ${dateValStr}`, {
      x: rightX + 10,
      y: footerY + footerH - 44,
      size: 7,
      font: regular,
      color: cTextDark,
    });

    if (sigAscqImg) {
      page.drawImage(sigAscqImg, {
        x: rightX + 25,
        y: footerY + 18,
        width: 130,
        height: 34,
      });
    }

    // Tampon vert officiel
    const stampX = rightX + sigBoxW - 110;
    const stampY = footerY + 14;
    page.drawRectangle({
      x: stampX,
      y: stampY,
      width: 100,
      height: 44,
      borderColor: cGreen,
      borderWidth: 1.2,
      color: rgb(240 / 255, 253 / 255, 244 / 255),
    });
    page.drawText("RÉPUBLIQUE DU BÉNIN", { x: stampX + 10, y: stampY + 32, size: 6.5, font: bold, color: cGreen });
    page.drawText("PNSC / ARRONDISSEMENT", { x: stampX + 8, y: stampY + 22, size: 6.5, font: bold, color: cGreen });
    page.drawText("VISA ASCQ : VALIDÉ", { x: stampX + 12, y: stampY + 10, size: 7, font: bold, color: cGreen });

    page.drawText(`L'ASCQ : ${(data.ascqName || "Superviseur").toUpperCase()}`, {
      x: rightX + 10,
      y: footerY + 8,
      size: 7.5,
      font: bold,
      color: cTextDark,
    });
  } else {
    // Statut en attente de visa ASCQ
    page.drawRectangle({
      x: rightX + 10,
      y: footerY + footerH - 34,
      width: 250,
      height: 16,
      color: cAmberBg,
      borderColor: cAmberWait,
      borderWidth: 0.8,
    });
    page.drawText("⏳ EN ATTENTE DE VISA ET SIGNATURE DE L'ASCQ", {
      x: rightX + 16,
      y: footerY + footerH - 29,
      size: 7.5,
      font: bold,
      color: cAmberWait,
    });

    page.drawText("Le planning a été transmis à l'ASCQ référent pour vérification et validation.", {
      x: rightX + 10,
      y: footerY + 35,
      size: 7,
      font: regular,
      color: cTextMuted,
    });
    page.drawText(`ASCQ Superviseur assigné : ${(data.ascqName || "Non assigné").toUpperCase()}`, {
      x: rightX + 10,
      y: footerY + 12,
      size: 7.5,
      font: bold,
      color: cTextDark,
    });
  }

  return await pdfDoc.save();
}
