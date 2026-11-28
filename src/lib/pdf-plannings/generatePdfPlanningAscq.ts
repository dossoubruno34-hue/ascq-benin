import { PDFDocument, rgb } from "pdf-lib";
import { AscqPlanningData } from "./types";
import { 
  loadPlanningFonts, 
  loadPlanningImages, 
  embedDataUrlImage, 
  drawBlackCheckmark, 
  sanitizeWinAnsi,
  wrapText
} from "./assets";

const ACTIVITES_OFFICIELLES_ASCQ = [
  "Causerie éducative",
  "Sensibilisation / démonstration / salubrité",
  "Vaccination poste fixe/avancée",
  "Supervision RC et validation VAD",
  "Prise en charge communautaire des cas",
  "Visites des sites prioritaires",
  "Visites à domicile et dépistage",
  "Campagne spécifique de santé publique",
  "Suivi groupé et orientation des RC",
  "Formation",
  "Réunion de coordination mensuelle avec le CCLS-TP",
];

const JOURS_ABREV_ASCQ = ["L", "M", "M", "J", "V", "S", "D"];
const JOURS_FULL_KEYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatDateFr(dStr?: string): string {
  if (!dStr) return "";
  if (dStr.includes("/")) return dStr;
  const parts = dStr.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
}

/**
 * Génère le PDF officiel du planning hebdomadaire de l'ASCQ
 * REPRODUCTION TRAIT POUR TRAIT DU MODÈLE OFFICIEL VALIDÉ CNLS-TP / PRÉSIDENCE DU BÉNIN
 * FORMAT IMPOSÉ : A4 Paysage [841.89, 595.28] - STRICTEMENT SUR 1 PAGE
 * MISE EN PAGE OPTIMISÉE : Tableau agrandi, colonne observations ajustée, signatures repoussées au bas
 */
export async function generatePdfPlanningAscq(data: AscqPlanningData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]); // A4 Paysage
  const { width: pageWidth, height: pageHeight } = page.getSize();

  const { regular, bold } = await loadPlanningFonts(pdfDoc);
  const { bannerImg, logoImg } = await loadPlanningImages(pdfDoc);
  const signatureImg = await embedDataUrlImage(pdfDoc, data.signatureTactile);

  // Palette officielle sobre et réglementaire + Bleu Bic pour les données saisies
  const cBlack = rgb(0, 0, 0);
  const cBleuBic = rgb(0.0, 0.25, 0.80); // Bleu Bic intense (#0040CC)
  const cNavyTitle = rgb(0 / 255, 53 / 255, 115 / 255); // #003573
  const cHeaderBg = rgb(233 / 255, 239 / 255, 247 / 255); // #e9eff7
  const cWhite = rgb(1, 1, 1);
  const cGrayFooter = rgb(100 / 255, 116 / 255, 139 / 255); // #64748b
  const cSlateText = rgb(30 / 255, 41 / 255, 59 / 255);

  const marginX = 35;
  const contentWidth = pageWidth - 2 * marginX; // 771.89 pt

  // =========================================================================
  // 1. EN-TÊTE SUPÉRIEUR HARMONISÉ AVEC LE RAM ASCQ
  // CNLS-TP À GAUCHE | NUMÉRO + EMAIL + LOGO ASC À DROITE + FILET VERT #008751
  // =========================================================================
  const headerTopY = pageHeight - 14;
  const cVertBenin = rgb(0 / 255, 135 / 255, 81 / 255);

  // Bannière CNLS-TP à gauche
  if (bannerImg) {
    const bAsp = bannerImg.width / bannerImg.height;
    const bH = 40;
    const bW = bH * bAsp;
    page.drawImage(bannerImg, {
      x: marginX,
      y: headerTopY - bH,
      width: Math.min(bW, 250),
      height: bH,
    });
  }

  // Logo ASC Santé Communautaire + Numéro & Email à droite (identique au RAM ASCQ)
  let logoW = 0;
  if (logoImg) {
    const lAsp = logoImg.width / logoImg.height;
    const lH = 40;
    logoW = lH * lAsp;
    page.drawImage(logoImg, {
      x: pageWidth - marginX - logoW,
      y: headerTopY - lH,
      width: logoW,
      height: lH,
    });
  }

  const telText = "0141285050/0196830551";
  const mailText = "ascqbenin@gmail.com";
  const rightInfoX = pageWidth - marginX - logoW - 8;
  const telW = bold.widthOfTextAtSize(telText, 8);
  const mailW = regular.widthOfTextAtSize(mailText, 7.5);
  page.drawText(telText, {
    x: rightInfoX - telW,
    y: headerTopY - 17,
    size: 8,
    font: bold,
    color: cBlack,
  });
  page.drawText(mailText, {
    x: rightInfoX - mailW,
    y: headerTopY - 29,
    size: 7.5,
    font: regular,
    color: rgb(71 / 255, 85 / 255, 105 / 255),
  });

  // Ligne de séparation verte officielle (#008751)
  page.drawLine({
    start: { x: marginX, y: headerTopY - 43 },
    end: { x: pageWidth - marginX, y: headerTopY - 43 },
    thickness: 1.5,
    color: cVertBenin,
  });

  // =========================================================================
  // 2. TITRE & LOCALISATION AU CENTRE
  // =========================================================================
  // Ligne 1 : DÉPARTEMENT : ZOU — COMMUNE : OUINHI — ARRONDISSEMENT : TOHOUÈS
  const deptStr = sanitizeWinAnsi(data.departement).toUpperCase() || "ZOU";
  const comStr = sanitizeWinAnsi(data.commune).toUpperCase() || "OUINHI";
  const arrStr = sanitizeWinAnsi(data.arrondissement).toUpperCase() || "TOHOUÈS";

  const locLine = `DÉPARTEMENT : ${deptStr} — COMMUNE : ${comStr} — ARRONDISSEMENT : ${arrStr}`;
  const locW = bold.widthOfTextAtSize(locLine, 10);
  const locY = headerTopY - 56;

  page.drawText(locLine, {
    x: (pageWidth - locW) / 2,
    y: locY,
    size: 10,
    font: bold,
    color: cNavyTitle,
  });

  // Soulignements sous les noms d'entités géographiques
  const p1 = "DÉPARTEMENT : ";
  const p1W = bold.widthOfTextAtSize(p1, 10);
  const dW = bold.widthOfTextAtSize(deptStr, 10);
  const startX = (pageWidth - locW) / 2;
  page.drawLine({
    start: { x: startX + p1W, y: locY - 1.5 },
    end: { x: startX + p1W + dW, y: locY - 1.5 },
    thickness: 1,
    color: cNavyTitle,
  });

  const p2 = `DÉPARTEMENT : ${deptStr} — COMMUNE : `;
  const p2W = bold.widthOfTextAtSize(p2, 10);
  const cW = bold.widthOfTextAtSize(comStr, 10);
  page.drawLine({
    start: { x: startX + p2W, y: locY - 1.5 },
    end: { x: startX + p2W + cW, y: locY - 1.5 },
    thickness: 1,
    color: cNavyTitle,
  });

  const p3 = `DÉPARTEMENT : ${deptStr} — COMMUNE : ${comStr} — ARRONDISSEMENT : `;
  const p3W = bold.widthOfTextAtSize(p3, 10);
  const aW = bold.widthOfTextAtSize(arrStr, 10);
  page.drawLine({
    start: { x: startX + p3W, y: locY - 1.5 },
    end: { x: startX + p3W + aW, y: locY - 1.5 },
    thickness: 1,
    color: cNavyTitle,
  });

  // Ligne 2 : PLANNING HEBDOMADAIRE DE LA SEMAINE N° XX (Souligné)
  const semTitle = `PLANNING HEBDOMADAIRE DE LA SEMAINE N° ${data.semaine || 47}`;
  const semW = bold.widthOfTextAtSize(semTitle, 13);
  const semY = locY - 16;

  page.drawText(semTitle, {
    x: (pageWidth - semW) / 2,
    y: semY,
    size: 13,
    font: bold,
    color: cNavyTitle,
  });

  page.drawLine({
    start: { x: (pageWidth - semW) / 2, y: semY - 2.5 },
    end: { x: (pageWidth + semW) / 2, y: semY - 2.5 },
    thickness: 1.2,
    color: cNavyTitle,
  });

  // Ligne 3 : (du 16/11/2026 au 22/11/2026)
  const dDeb = formatDateFr(data.dateDebut) || "16/11/2026";
  const dFin = formatDateFr(data.dateFin) || "22/11/2026";
  const dateSub = `(du ${dDeb} au ${dFin})`;
  const dateSubW = regular.widthOfTextAtSize(dateSub, 9);
  const dateSubY = semY - 13;

  page.drawText(dateSub, {
    x: (pageWidth - dateSubW) / 2,
    y: dateSubY,
    size: 9,
    font: regular,
    color: cSlateText,
  });

  // =========================================================================
  // 3. TABLEAU DES ACTIVITÉS AGRANDI ET AÉRÉ
  // Colonne Observations réduite, colonnes jours et activités élargies
  // =========================================================================
  const tblTopY = dateSubY - 10; // ~473 pt

  const colW_No = 32;
  const colW_Act = 315; // Élargi de 285 à 315 pt pour plus de confort
  const colW_Resp = 54;
  const colW_Day = 30;  // Élargi de 26 à 30 pt pour des cases aérées
  const colW_DaysTotal = colW_Day * 7; // 210 pt
  const colW_Obs = contentWidth - (colW_No + colW_Act + colW_Resp + colW_DaysTotal); // 160.89 pt (réduit pour rééquilibrer)

  // Construction dynamique des lignes : 10 activités standard + toutes les "Autres activités" ajoutées
  const baseTen = ACTIVITES_OFFICIELLES_ASCQ.slice(0, 10).map((nom, i) => {
    let displayNom = nom;
    if (i === 7 && data.campagneTitre?.trim()) {
      displayNom = `Campagne spécifique de santé publique (${data.campagneTitre.trim()})`;
    } else if (i === 9 && data.formationTitre?.trim()) {
      displayNom = `Formation (${data.formationTitre.trim()})`;
    }
    return {
      nom: displayNom,
      jours: data.activitesJours[i + 1] || [],
      isCustom: false,
    };
  });

  const extraList = Array.isArray(data.autresActivites) && data.autresActivites.some(a => a && a.nom && a.nom.trim())
    ? data.autresActivites
        .filter(a => a && a.nom && a.nom.trim())
        .map(a => ({ nom: a.nom.trim(), jours: a.jours || [], isCustom: true }))
    : data.autreActiviteNom && data.autreActiviteNom.trim()
    ? [{ nom: data.autreActiviteNom.trim(), jours: data.autreActiviteJours || [], isCustom: true }]
    : [{ nom: ACTIVITES_OFFICIELLES_ASCQ[10], jours: data.autreActiviteJours || [], isCustom: false }];

  const toutesLignesActivites = [...baseTen, ...extraList];

  const thH1 = 20;
  const thH2 = 20;
  const thTotalH = thH1 + thH2; // 40 pt
  const nbRows = toutesLignesActivites.length;
  const rowH = Math.min(30.5, 335.5 / Math.max(11, nbRows));
  const tblH = thTotalH + nbRows * rowH;
  const tblBottomY = tblTopY - tblH;

  // --- EN-TÊTE LIGNE 1 : Fond gris-bleu clair #e9eff7 ---
  page.drawRectangle({
    x: marginX,
    y: tblTopY - thTotalH,
    width: contentWidth,
    height: thTotalH,
    color: cHeaderBg,
  });

  // Cellule N° (sur 2 niveaux)
  const noW = bold.widthOfTextAtSize("N°", 8.5);
  page.drawText("N°", {
    x: marginX + (colW_No - noW) / 2,
    y: tblTopY - (thTotalH / 2) - 3,
    size: 8.5,
    font: bold,
    color: cBlack,
  });

  // Cellule ACTIVITÉS (sur 2 niveaux)
  const actHeaderW = bold.widthOfTextAtSize("ACTIVITÉS", 8.5);
  page.drawText("ACTIVITÉS", {
    x: marginX + colW_No + (colW_Act - actHeaderW) / 2,
    y: tblTopY - (thTotalH / 2) - 3,
    size: 8.5,
    font: bold,
    color: cBlack,
  });

  // Cellule RESP. (sur 2 niveaux)
  const respHeaderW = bold.widthOfTextAtSize("RESP.", 8.5);
  page.drawText("RESP.", {
    x: marginX + colW_No + colW_Act + (colW_Resp - respHeaderW) / 2,
    y: tblTopY - (thTotalH / 2) - 3,
    size: 8.5,
    font: bold,
    color: cBlack,
  });

  // Cellule PÉRIODES (Niveau 1, chapeautant les 7 jours)
  const perHeaderW = bold.widthOfTextAtSize("PÉRIODES", 8.5);
  const perStartX = marginX + colW_No + colW_Act + colW_Resp;
  page.drawText("PÉRIODES", {
    x: perStartX + (colW_DaysTotal - perHeaderW) / 2,
    y: tblTopY - 14,
    size: 8.5,
    font: bold,
    color: cBlack,
  });

  // Ligne horizontale sous "PÉRIODES" séparant le niveau 1 du niveau 2
  page.drawLine({
    start: { x: perStartX, y: tblTopY - thH1 },
    end: { x: perStartX + colW_DaysTotal, y: tblTopY - thH1 },
    thickness: 1,
    color: cBlack,
  });

  // Niveau 2 : les 7 jours L, M, M, J, V, S, D
  JOURS_ABREV_ASCQ.forEach((jAbrev, idx) => {
    const jX = perStartX + idx * colW_Day;
    const jW = bold.widthOfTextAtSize(jAbrev, 8.5);
    page.drawText(jAbrev, {
      x: jX + (colW_Day - jW) / 2,
      y: tblTopY - thH1 - 14,
      size: 8.5,
      font: bold,
      color: cBlack,
    });

    // Séparateur vertical entre les sous-colonnes de jours
    if (idx > 0) {
      page.drawLine({
        start: { x: jX, y: tblTopY - thTotalH },
        end: { x: jX, y: tblTopY - thH1 },
        thickness: 1,
        color: cBlack,
      });
    }
  });

  // Cellule OBSERVATIONS (sur 2 niveaux)
  const obsHeaderW = bold.widthOfTextAtSize("OBSERVATIONS", 8.5);
  const obsStartX = marginX + colW_No + colW_Act + colW_Resp + colW_DaysTotal;
  page.drawText("OBSERVATIONS", {
    x: obsStartX + (colW_Obs - obsHeaderW) / 2,
    y: tblTopY - (thTotalH / 2) - 3,
    size: 8.5,
    font: bold,
    color: cBlack,
  });

  // Ligne horizontale séparant l'en-tête du corps du tableau
  page.drawLine({
    start: { x: marginX, y: tblTopY - thTotalH },
    end: { x: marginX + contentWidth, y: tblTopY - thTotalH },
    thickness: 1,
    color: cBlack,
  });

  // =========================================================================
  // 4. LIGNES D'ACTIVITÉS (10 ACTIVITÉS + MULTIPLES AUTRES ACTIVITÉS)
  // =========================================================================
  const leftTableW = contentWidth - colW_Obs;

  toutesLignesActivites.forEach((item, idx) => {
    const rY = tblTopY - thTotalH - (idx + 1) * rowH;

    // Numéro formaté "01", "02", etc.
    const numStr = String(idx + 1).padStart(2, "0");
    const numW = bold.widthOfTextAtSize(numStr, 8.5);
    page.drawText(numStr, {
      x: marginX + (colW_No - numW) / 2,
      y: rY + (rowH - 8.5) / 2,
      size: 8.5,
      font: bold,
      color: cBlack,
    });

    // Libellé de l'activité avec retour à la ligne automatique (Bleu Bic si autre activité ajoutée par l'ASCQ)
    const maxActWidth = colW_Act - 14;
    let actFontSize = 8.5;
    let actLines = wrapText(sanitizeWinAnsi(item.nom), bold, actFontSize, maxActWidth);
    if (actLines.length > 2) {
      actFontSize = 7.3;
      actLines = wrapText(sanitizeWinAnsi(item.nom), bold, actFontSize, maxActWidth).slice(0, 3);
    } else if (actLines.length === 2) {
      actFontSize = 7.8;
      actLines = wrapText(sanitizeWinAnsi(item.nom), bold, actFontSize, maxActWidth).slice(0, 3);
    }
    const lineStep = actFontSize + 2;
    const totalTextH = actLines.length * lineStep - 2;
    const startLineY = rY + (rowH + totalTextH) / 2 - actFontSize;
    actLines.forEach((line, lIdx) => {
      page.drawText(line, {
        x: marginX + colW_No + 8,
        y: startLineY - lIdx * lineStep,
        size: actFontSize,
        font: bold,
        color: item.isCustom ? cBleuBic : cBlack,
      });
    });

    // Responsable ASCQ
    const respW = bold.widthOfTextAtSize("ASCQ", 8.5);
    page.drawText("ASCQ", {
      x: marginX + colW_No + colW_Act + (colW_Resp - respW) / 2,
      y: rY + (rowH - 8.5) / 2,
      size: 8.5,
      font: bold,
      color: cBlack,
    });

    // Jours cochés
    const selectedDays = item.jours || [];

    JOURS_FULL_KEYS.forEach((fullKey, jIdx) => {
      const cellCenterX = perStartX + jIdx * colW_Day + colW_Day / 2;
      const cellCenterY = rY + rowH / 2;
      const isChecked = selectedDays.includes(fullKey);

      if (isChecked) {
        // Coche noire officielle trait pour trait comme sur le modèle
        drawBlackCheckmark(page, cellCenterX, cellCenterY, 9);
      } else {
        // Tiret discret centré
        page.drawText("-", {
          x: cellCenterX - 2,
          y: cellCenterY - 3,
          size: 8.5,
          font: regular,
          color: rgb(0.2, 0.2, 0.2),
        });
      }
    });

    // Ligne horizontale sous chaque ligne d'activité (s'arrête avant la colonne Observations)
    page.drawLine({
      start: { x: marginX, y: rY },
      end: { x: marginX + leftTableW, y: rY },
      thickness: 1,
      color: cBlack,
    });
  });

  // =========================================================================
  // 5. COLONNE OBSERVATIONS FUSIONNÉE (ROWSPAN = 11, LARGEUR RÉAJUSTÉE)
  // =========================================================================
  const obsY = tblBottomY;
  const obsH = nbRows * rowH;

  // Texte des observations (Bleu Bic + Gras, vide si non renseigné)
  const obsText = sanitizeWinAnsi(data.observations || "");
  const obsLines = obsText ? wrapText(obsText, bold, 8.2, colW_Obs - 16) : [];

  // Centrage vertical harmonieux du bloc d'observations dans la cellule fusionnée
  const totalTextH = obsLines.length * 13;
  let curObsY = obsY + (obsH + totalTextH) / 2 - 10;

  obsLines.forEach((line) => {
    const lineW = bold.widthOfTextAtSize(line, 8.2);
    page.drawText(line, {
      x: obsStartX + (colW_Obs - lineW) / 2,
      y: curObsY,
      size: 8.2,
      font: bold,
      color: cBleuBic,
    });
    curObsY -= 13;
  });

  // =========================================================================
  // 6. GRILLE VERTICALE COMPLÈTE DU TABLEAU (LIGNES NOIRES 1 PT)
  // =========================================================================
  const colSeparators = [
    colW_No,
    colW_Act,
    colW_Resp,
    ...Array(7).fill(colW_Day),
    colW_Obs,
  ];

  let curX = marginX;
  colSeparators.forEach((w, idx) => {
    curX += w;
    // Si c'est l'une des séparations internes de jours (idx de 3 à 8), elle part du bas du sous-en-tête
    const isDayInnerSep = idx >= 3 && idx <= 8;
    const startY = isDayInnerSep ? tblTopY - thTotalH : tblTopY;

    page.drawLine({
      start: { x: curX, y: tblBottomY },
      end: { x: curX, y: startY },
      thickness: 1,
      color: cBlack,
    });
  });

  // Contour complet du tableau en noir 1 pt
  page.drawRectangle({
    x: marginX,
    y: tblBottomY,
    width: contentWidth,
    height: tblH,
    borderColor: cBlack,
    borderWidth: 1,
  });

  // =========================================================================
  // 7. BAS DE PAGE COMPLÈTEMENT REPOUSSÉ EN BAS
  // GAUCHE : STATUT DES RC & MOTIF D'ÉCART | DROITE : VISA DE L'ASCQ
  // =========================================================================
  const underTblY = 78; // Poussé complètement en bas (à 78 pt au-dessus du bas de page)

  // --- BLOC GAUCHE ---
  // Ligne 1 : Relais Communautaires (RC) : XX planifié(s) sur YY attendu(s).
  const rcPlan = data.rcPlanifies ?? 12;
  const rcAtt = data.rcAttendus ?? 14;

  const prefixRc = "Relais Communautaires (RC) : ";
  const pRcW = bold.widthOfTextAtSize(prefixRc, 8.5);
  page.drawText(prefixRc, {
    x: marginX,
    y: underTblY,
    size: 8.5,
    font: bold,
    color: cBlack,
  });

  const valRc = `${rcPlan} planifié(s) sur ${rcAtt} attendu(s).`;
  page.drawText(valRc, {
    x: marginX + pRcW,
    y: underTblY,
    size: 8.5,
    font: bold,
    color: cBleuBic,
  });

  // Ligne 2 : Motif de l'écart
  let motifY = underTblY - 14;
  if (data.motifEcart) {
    const motifPrefix = "Motif de l'écart : ";
    const mpW = bold.widthOfTextAtSize(motifPrefix, 8.5);
    page.drawText(motifPrefix, {
      x: marginX,
      y: motifY,
      size: 8.5,
      font: bold,
      color: cBlack,
    });

    const motifText = sanitizeWinAnsi(data.motifEcart);
    const motifLines = wrapText(motifText, bold, 8.5, contentWidth - mpW - 220);

    motifLines.forEach((mLine, mIdx) => {
      page.drawText(mLine, {
        x: marginX + (mIdx === 0 ? mpW : 0),
        y: motifY - mIdx * 11,
        size: 8.5,
        font: bold,
        color: cBleuBic,
      });
    });

    motifY -= motifLines.length * 11 + 3;
  }

  // Ligne 3 : Contact ASCQ : 01 XX XX XX XX
  const phonePrefix = "Contact ASCQ : ";
  const phW = bold.widthOfTextAtSize(phonePrefix, 8.5);
  page.drawText(phonePrefix, {
    x: marginX,
    y: motifY,
    size: 8.5,
    font: bold,
    color: cBlack,
  });

  const phoneVal = sanitizeWinAnsi(data.ascqPhone) || "";
  if (phoneVal) {
    page.drawText(phoneVal, {
      x: marginX + phW,
      y: motifY,
      size: 8.5,
      font: bold,
      color: cBleuBic,
    });
  }

  // --- BLOC DROIT : L'ASCQ + SIGNATURE + NOM SOULIGNÉ ---
  const rightCenterX = pageWidth - marginX - 110;

  // "L'ASCQ"
  const lascqStr = "L'ASCQ";
  const lascqW = bold.widthOfTextAtSize(lascqStr, 9);
  page.drawText(lascqStr, {
    x: rightCenterX - lascqW / 2,
    y: underTblY,
    size: 9,
    font: bold,
    color: cBlack,
  });

  // Signature tactile
  if (signatureImg) {
    const sAsp = signatureImg.width / signatureImg.height;
    let sW = 28 * sAsp;
    let sH = 28;
    if (sW > 90) {
      sW = 90;
      sH = sW / sAsp;
    }
    page.drawImage(signatureImg, {
      x: rightCenterX - sW / 2,
      y: underTblY - 34,
      width: sW,
      height: sH,
    });
  }

  // Nom et prénom de l'ASCQ (souligné)
  const nomAscq = sanitizeWinAnsi(data.ascqNom).toUpperCase();
  if (nomAscq) {
    const nomW = bold.widthOfTextAtSize(nomAscq, 9);
    const nomY = underTblY - 46;

    page.drawText(nomAscq, {
      x: rightCenterX - nomW / 2,
      y: nomY,
      size: 9,
      font: bold,
      color: cBleuBic,
    });

    page.drawLine({
      start: { x: rightCenterX - nomW / 2, y: nomY - 1.5 },
      end: { x: rightCenterX + nomW / 2, y: nomY - 1.5 },
      thickness: 1,
      color: cBlack,
    });
  }

  // =========================================================================
  // 8. NOTE DE PIED DE PAGE CENTRÉE
  // "SantéCom Bénin — fiche éditée le 17 novembre 2026"
  // =========================================================================
  const footerDateStr = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const footerText = `SantéCom Bénin — fiche éditée le ${footerDateStr}`;
  const fW = regular.widthOfTextAtSize(footerText, 7.5);

  page.drawText(footerText, {
    x: (pageWidth - fW) / 2,
    y: 14,
    size: 7.5,
    font: regular,
    color: cGrayFooter,
  });

  return await pdfDoc.save();
}
