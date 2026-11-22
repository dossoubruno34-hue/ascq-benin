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

interface RcActivityRowDef {
  key: string;
  label: string;
  getSlot: (data: RcPlanningData) => RcPlanningSlot | undefined;
}

const ACTIVITES_RC_DEFS: RcActivityRowDef[] = [
  {
    key: "vad",
    label: "Visites à domicile",
    getSlot: (d) => d.act_vad?.[0],
  },
  {
    key: "causerie",
    label: "Causeries/Sensibilisation",
    getSlot: (d) => d.act_causerie?.[0],
  },
  {
    key: "salubrite",
    label: "Salubrité",
    getSlot: (d) => d.act_salubrite?.[0] || (d.act_causerie && d.act_causerie.length > 1 ? d.act_causerie[1] : undefined),
  },
  {
    key: "animale",
    label: "Santé animale",
    getSlot: (d) => d.act_animale?.[0],
  },
  {
    key: "sociales",
    label: "Affaires sociales",
    getSlot: (d) => d.act_sociales?.[0],
  },
  {
    key: "femmes",
    label: "Suivi des femmes enceintes",
    getSlot: (d) => d.act_femmes?.[0],
  },
  {
    key: "enfants",
    label: "Suivi des enfants de 0 à 59 mois",
    getSlot: (d) => d.act_enfants?.[0],
  },
  {
    key: "referees",
    label: "Personnes référées",
    getSlot: (d) => d.act_referees?.[0],
  },
  {
    key: "autres",
    label: "Autres",
    getSlot: (d) => d.act_autres?.[0],
  },
];

function formatDateFr(dStr?: string): string {
  if (!dStr) return "";
  if (dStr.includes("/")) return dStr;
  const parts = dStr.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
}

/**
 * Génère le PDF officiel du planning hebdomadaire du Relais Communautaire (RC)
 * REPRODUCTION TRAIT POUR TRAIT DU MODÈLE OFFICIEL VALIDÉ CNLS-TP / MINISTÈRE DE LA SANTÉ
 * FORMAT IMPOSÉ : A4 Paysage [841.89, 595.28] - STRICTEMENT SUR 1 PAGE
 */
export async function generatePdfPlanningRc(data: RcPlanningData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]); // A4 Paysage
  const { width: pageWidth, height: pageHeight } = page.getSize();

  const { regular, bold } = await loadPlanningFonts(pdfDoc);
  const { bannerImg, logoImg } = await loadPlanningImages(pdfDoc);
  const sigRcImg = await embedDataUrlImage(pdfDoc, data.signatureRc);
  const sigAscqImg = await embedDataUrlImage(pdfDoc, data.signatureAscq);

  // Palette officielle sobre et réglementaire + Bleu Bic pour les données saisies
  const cBlack = rgb(0, 0, 0);
  const cBleuBic = rgb(0.0, 0.25, 0.80); // Bleu Bic intense (#0040CC)
  const cHeaderBg = rgb(233 / 255, 239 / 255, 247 / 255); // #e9eff7
  const cWhite = rgb(1, 1, 1);
  const cGrayFooter = rgb(100 / 255, 116 / 255, 139 / 255); // #64748b

  const marginX = 35;
  const contentWidth = pageWidth - 2 * marginX; // 771.89 pt

  // =========================================================================
  // 1. EN-TÊTE SUPÉRIEUR (TRAIT POUR TRAIT)
  // CNLS-TP À GAUCHE | LOGO ASC SANTÉ COMM. DU BÉNIN À DROITE
  // =========================================================================
  const headerTopY = pageHeight - 16;

  // Bannière CNLS-TP à gauche
  if (bannerImg) {
    const bAsp = bannerImg.width / bannerImg.height;
    const bH = 40;
    const bW = bH * bAsp;
    page.drawImage(bannerImg, {
      x: marginX,
      y: headerTopY - bH,
      width: Math.min(bW, 235),
      height: bH,
    });
  }

  // Logo ASC Santé Communautaire à droite
  if (logoImg) {
    const lAsp = logoImg.width / logoImg.height;
    const lH = 40;
    const lW = lH * lAsp;
    page.drawImage(logoImg, {
      x: pageWidth - marginX - lW,
      y: headerTopY - lH,
      width: lW,
      height: lH,
    });
  }

  // =========================================================================
  // 2. TITRE OFFICIEL AU CENTRE (PARFAITEMENT DÉGAGÉ DES LOGOS)
  // =========================================================================
  // Ligne 1 : POLITIQUE NATIONALE DE SANTÉ COMMUNAUTAIRE
  const t1 = "POLITIQUE NATIONALE DE SANTÉ COMMUNAUTAIRE";
  const t1W = bold.widthOfTextAtSize(t1, 11.5);
  const t1Y = headerTopY - 48;

  page.drawText(t1, {
    x: (pageWidth - t1W) / 2,
    y: t1Y,
    size: 11.5,
    font: bold,
    color: cBlack,
  });

  // Ligne 2 : Fiche hebdomadaire d'activités du relais communautaire (Souligné)
  const t2 = "Fiche hebdomadaire d'activités du relais communautaire";
  const t2W = bold.widthOfTextAtSize(t2, 11.5);
  const t2Y = t1Y - 14;

  page.drawText(t2, {
    x: (pageWidth - t2W) / 2,
    y: t2Y,
    size: 11.5,
    font: bold,
    color: cBlack,
  });

  page.drawLine({
    start: { x: (pageWidth - t2W) / 2, y: t2Y - 2 },
    end: { x: (pageWidth + t2W) / 2, y: t2Y - 2 },
    thickness: 1,
    color: cBlack,
  });

  // =========================================================================
  // 3. CARTOUCHE DE MÉTADONNÉES (2 LIGNES AVEC SOULIGNEMENTS)
  // =========================================================================
  const cartoucheY1 = t2Y - 18; // ~484 pt
  const cartoucheY2 = cartoucheY1 - 14; // ~470 pt

  // Helper pour dessiner un champ "Libellé : Valeur" avec valeur en Bleu Bic et Gras
  const drawField = (label: string, value: string, x: number, y: number): number => {
    const cleanVal = sanitizeWinAnsi(value);
    page.drawText(label, { x, y, size: 8, font: bold, color: cBlack });
    const lblW = bold.widthOfTextAtSize(label, 8);
    const valX = x + lblW;
    page.drawText(cleanVal, { x: valX, y, size: 8, font: bold, color: cBleuBic });
    const valW = bold.widthOfTextAtSize(cleanVal, 8);
    // Soulignement discret de la valeur
    page.drawLine({
      start: { x: valX, y: y - 1.5 },
      end: { x: valX + Math.max(valW, 15), y: y - 1.5 },
      thickness: 0.75,
      color: cBlack,
    });
    return lblW + Math.max(valW, 15);
  };

  // Ligne 1 : Département | Zone sanitaire | Commune | Arrondissement | Village
  const fDept = sanitizeWinAnsi(data.departement) || "Zou";
  const fZone = sanitizeWinAnsi(data.zoneSanitaire) || "Covè-Zagnanado-Ouinhi";
  const fCommune = sanitizeWinAnsi(data.commune) || "Ouinhi";
  const fArr = sanitizeWinAnsi(data.arrondissement) || "Tohouès";
  const fVillage = sanitizeWinAnsi(data.village) || "Tohouès (centre)";

  let curL1X = marginX;
  curL1X += drawField("Département : ", fDept, curL1X, cartoucheY1) + 14;
  curL1X += drawField("Zone sanitaire : ", fZone, curL1X, cartoucheY1) + 14;
  curL1X += drawField("Commune : ", fCommune, curL1X, cartoucheY1) + 14;
  curL1X += drawField("Arrondissement : ", fArr, curL1X, cartoucheY1) + 14;
  drawField("Village : ", fVillage, curL1X, cartoucheY1);

  // Ligne 2 : Grappe | Nom et prénom(s) du RC | Tél | Semaine de
  const fGrappe = String(data.grappe || "G12");
  const fRcName = sanitizeWinAnsi(data.rcName) || "HOUNKPATIN Rosine";
  const fPhone = sanitizeWinAnsi(data.rcPhone) || "01 96 00 00 00";
  const dDeb = formatDateFr(data.dateDebutStr) || "16/11/2026";
  const dFin = formatDateFr(data.dateFinStr) || "22/11/2026";
  const fSemaine = `${dDeb} au ${dFin}`;

  let curL2X = marginX;
  curL2X += drawField("Grappe : ", fGrappe, curL2X, cartoucheY2) + 20;
  curL2X += drawField("Nom et prénom(s) du RC : ", fRcName, curL2X, cartoucheY2) + 20;
  curL2X += drawField("Tél : ", fPhone, curL2X, cartoucheY2) + 20;
  drawField("Semaine de : ", fSemaine, curL2X, cartoucheY2);

  // =========================================================================
  // 4. TABLEAU DES ACTIVITÉS DU RELAIS (TRAIT POUR TRAIT)
  // BORDURES NOIRES 1 PT, FOND D'ENTÊTE #e9eff7, FOND DE LIGNES BLANC
  // =========================================================================
  const tblTopY = cartoucheY2 - 12; // ~452 pt

  const colW_Date = 70;
  const colW_Heure = 52;
  const colW_Act = 175;
  const colW_Zone = 120;
  const colW_Qte = 190;
  const colW_Obs = contentWidth - (colW_Date + colW_Heure + colW_Act + colW_Zone + colW_Qte); // 164.89 pt

  const thH = 20;

  // Calcul dynamique des hauteurs de lignes pour que les libellés multi-lignes respirent parfaitement
  const rowHeights: number[] = ACTIVITES_RC_DEFS.map((def, idx) => {
    const slot = def.getSlot(data);
    if (!slot) return 33;
    // Vérification du nombre de lignes de quantité
    const qteStr = String(slot.qte || "");
    const qteLines = qteStr.split(/[\n\r]+/);
    if (qteLines.length >= 3) return 43;
    if (qteLines.length === 2) return 37;
    return 33;
  });

  const totalRowsH = rowHeights.reduce((acc, h) => acc + h, 0);
  const tblH = thH + totalRowsH;
  const tblBottomY = tblTopY - tblH;

  // --- Entête du tableau ---
  page.drawRectangle({
    x: marginX,
    y: tblTopY - thH,
    width: contentWidth,
    height: thH,
    color: cHeaderBg,
  });

  const drawHeaderTitle = (title: string, x: number, width: number) => {
    const tW = bold.widthOfTextAtSize(title, 8.5);
    page.drawText(title, {
      x: x + (width - tW) / 2,
      y: tblTopY - 14,
      size: 8.5,
      font: bold,
      color: cBlack,
    });
  };

  let headerX = marginX;
  drawHeaderTitle("Date", headerX, colW_Date);
  headerX += colW_Date;
  drawHeaderTitle("Heure", headerX, colW_Heure);
  headerX += colW_Heure;
  drawHeaderTitle("Activités", headerX, colW_Act);
  headerX += colW_Act;
  drawHeaderTitle("Zone ciblée", headerX, colW_Zone);
  headerX += colW_Zone;
  drawHeaderTitle("Quantité prévue", headerX, colW_Qte);
  headerX += colW_Qte;
  drawHeaderTitle("Observations", headerX, colW_Obs);

  // Ligne horizontale sous l'en-tête
  page.drawLine({
    start: { x: marginX, y: tblTopY - thH },
    end: { x: marginX + contentWidth, y: tblTopY - thH },
    thickness: 1,
    color: cBlack,
  });

  // --- Lignes de contenu ---
  let curRowY = tblTopY - thH;

  ACTIVITES_RC_DEFS.forEach((def, idx) => {
    const h = rowHeights[idx];
    const rY = curRowY - h;
    const slot = def.getSlot(data);

    // Fond blanc
    page.drawRectangle({
      x: marginX,
      y: rY,
      width: contentWidth,
      height: h,
      color: cWhite,
    });

    // 1. Colonne Date (Bleu Bic + Gras)
    const dateText = slot?.date ? sanitizeWinAnsi(formatDateFr(slot.date)) : "";
    if (dateText) {
      const dW = bold.widthOfTextAtSize(dateText, 8.2);
      page.drawText(dateText, {
        x: marginX + (colW_Date - dW) / 2,
        y: rY + h - 16,
        size: 8.2,
        font: bold,
        color: cBleuBic,
      });
    }

    // 2. Colonne Heure (Bleu Bic + Gras)
    const heureText = slot?.heure ? sanitizeWinAnsi(slot.heure) : "";
    if (heureText) {
      const hW = bold.widthOfTextAtSize(heureText, 8.2);
      page.drawText(heureText, {
        x: marginX + colW_Date + (colW_Heure - hW) / 2,
        y: rY + h - 16,
        size: 8.2,
        font: bold,
        color: cBleuBic,
      });
    }

    // 3. Colonne Activités (Libellé imprimé officiel en noir)
    let actLabel = def.label;
    if (def.key === "autres" && data.autreActiviteLabel) {
      actLabel = data.autreActiviteLabel;
    }
    const cleanActLabel = sanitizeWinAnsi(actLabel);
    page.drawText(cleanActLabel, {
      x: marginX + colW_Date + colW_Heure + 8,
      y: rY + h - 16,
      size: 8.2,
      font: bold,
      color: def.key === "autres" && data.autreActiviteLabel ? cBleuBic : cBlack,
    });

    // 4. Colonne Zone ciblée (Bleu Bic + Gras)
    const zoneText = slot?.zone ? sanitizeWinAnsi(slot.zone) : "";
    if (zoneText) {
      page.drawText(fitText(zoneText, bold, 8, colW_Zone - 12), {
        x: marginX + colW_Date + colW_Heure + colW_Act + 8,
        y: rY + h - 16,
        size: 8,
        font: bold,
        color: cBleuBic,
      });
    }

    // 5. Colonne Quantité prévue (supporte multi-lignes, Bleu Bic + Gras)
    if (slot && slot.qte !== undefined && slot.qte !== null && String(slot.qte).trim() !== "") {
      const rawQte = String(slot.qte);
      const qteLines = rawQte.includes("\n") 
        ? rawQte.split(/[\n\r]+/)
        : rawQte.includes(" | ")
        ? rawQte.split(" | ")
        : [rawQte];

      let qteY = rY + h - 14;
      qteLines.slice(0, 3).forEach((line) => {
        const cleanL = sanitizeWinAnsi(line.trim());
        if (cleanL.includes(" : ")) {
          const [k, v] = cleanL.split(" : ");
          const kStr = `${k} : `;
          page.drawText(kStr, {
            x: marginX + colW_Date + colW_Heure + colW_Act + colW_Zone + 8,
            y: qteY,
            size: 7.8,
            font: regular,
            color: cBlack,
          });
          const kW = regular.widthOfTextAtSize(kStr, 7.8);
          page.drawText(boldText(v), {
            x: marginX + colW_Date + colW_Heure + colW_Act + colW_Zone + 8 + kW,
            y: qteY,
            size: 7.8,
            font: bold,
            color: cBleuBic,
          });
        } else {
          page.drawText(cleanL, {
            x: marginX + colW_Date + colW_Heure + colW_Act + colW_Zone + 8,
            y: qteY,
            size: 8,
            font: bold,
            color: cBleuBic,
          });
        }
        qteY -= 11;
      });
    }

    // 6. Colonne Observations (Bleu Bic + Gras)
    const obsText = slot?.observation || slot?.obs || (idx === 0 && data.observations ? data.observations : "");
    if (obsText) {
      const obsLines = wrapText(obsText, bold, 7.8, colW_Obs - 14);
      let obsY = rY + h - 14;
      obsLines.slice(0, 3).forEach((line) => {
        page.drawText(line, {
          x: marginX + colW_Date + colW_Heure + colW_Act + colW_Zone + colW_Qte + 8,
          y: obsY,
          size: 7.8,
          font: bold,
          color: cBleuBic,
        });
        obsY -= 11;
      });
    }

    // Ligne horizontale sous chaque ligne
    page.drawLine({
      start: { x: marginX, y: rY },
      end: { x: marginX + contentWidth, y: rY },
      thickness: 1,
      color: cBlack,
    });

    curRowY -= h;
  });

  // Grille verticale complète du tableau en noir 1 pt
  const colSeparators = [
    colW_Date,
    colW_Heure,
    colW_Act,
    colW_Zone,
    colW_Qte,
    colW_Obs,
  ];

  let curX = marginX;
  colSeparators.forEach((w) => {
    curX += w;
    page.drawLine({
      start: { x: curX, y: tblBottomY },
      end: { x: curX, y: tblTopY },
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
  // 5. BAS DE PAGE (SOUS LE TABLEAU - TRAIT POUR TRAIT)
  // GAUCHE : Signature RC | DROITE : Lu et approuvé par l'ASCQ
  // =========================================================================
  const footerSecY = tblBottomY - 22;

  // Gauche : Signature RC + Nom et prénom du RC en bas
  page.drawText("Signature RC", {
    x: marginX + 40,
    y: footerSecY,
    size: 9,
    font: bold,
    color: cBlack,
  });

  if (sigRcImg) {
    const sAsp = sigRcImg.width / sigRcImg.height;
    let sW = 28 * sAsp;
    let sH = 28;
    if (sW > 90) {
      sW = 90;
      sH = sW / sAsp;
    }
    page.drawImage(sigRcImg, {
      x: marginX + 40,
      y: footerSecY - 30,
      width: sW,
      height: sH,
    });
  }

  if (fRcName) {
    page.drawText(fRcName, {
      x: marginX + 40,
      y: footerSecY - 40,
      size: 8.5,
      font: bold,
      color: cBleuBic,
    });
  }

  // Droite : Lu et approuvé par l'ASCQ + Signature + Nom et prénom de l'ASCQ en bas
  const luStr = "Lu et approuvé par l'ASCQ";
  const luW = bold.widthOfTextAtSize(luStr, 9);
  const luX = pageWidth - marginX - 40 - luW;

  page.drawText(luStr, {
    x: luX,
    y: footerSecY,
    size: 9,
    font: bold,
    color: cBlack,
  });

  if (sigAscqImg) {
    const sAsp = sigAscqImg.width / sigAscqImg.height;
    let sW = 28 * sAsp;
    let sH = 28;
    if (sW > 90) {
      sW = 90;
      sH = sW / sAsp;
    }
    page.drawImage(sigAscqImg, {
      x: luX + (luW - sW) / 2,
      y: footerSecY - 30,
      width: sW,
      height: sH,
    });
  }

  const nomAscqVisa = sanitizeWinAnsi(data.ascqName || "");
  if (nomAscqVisa && (sigAscqImg || data.luEtApprouveAscq)) {
    const ascqW = bold.widthOfTextAtSize(nomAscqVisa, 8.5);
    page.drawText(nomAscqVisa, {
      x: luX + (luW - ascqW) / 2,
      y: footerSecY - 40,
      size: 8.5,
      font: bold,
      color: cBleuBic,
    });
  }

  // =========================================================================
  // 6. NOTE DE PIED DE PAGE CENTRÉE
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
    y: 18,
    size: 7.5,
    font: regular,
    color: cGrayFooter,
  });

  return await pdfDoc.save();
}

function boldText(s: string): string {
  return sanitizeWinAnsi(s || "");
}
