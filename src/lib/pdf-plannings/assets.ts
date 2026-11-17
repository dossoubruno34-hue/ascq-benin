import { PDFDocument, PDFFont, PDFImage, StandardFonts, PDFPage, rgb } from "pdf-lib";

// Cache mémoire pour optimiser les performances
const memoryCache: Record<string, Uint8Array> = {};

export async function fetchBytes(urlOrPath: string): Promise<Uint8Array> {
  if (memoryCache[urlOrPath]) {
    return memoryCache[urlOrPath];
  }

  // Environnement Node.js
  if (typeof window === "undefined") {
    const fs = await import("fs");
    const path = await import("path");
    let localPath = urlOrPath;
    if (urlOrPath.startsWith("/")) {
      localPath = path.join(process.cwd(), "public", urlOrPath.replace(/^\//, ""));
    }
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      const uint8 = new Uint8Array(buffer);
      memoryCache[urlOrPath] = uint8;
      return uint8;
    }
  }

  // Environnement Navigateur
  try {
    const response = await fetch(urlOrPath);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      memoryCache[urlOrPath] = uint8;
      return uint8;
    }
  } catch (e) {
    console.warn(`[pdf-plannings] Échec du fetch direct de ${urlOrPath}:`, e);
  }

  throw new Error(`Impossible de charger la ressource : ${urlOrPath}`);
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(",");
  const base64 = parts.length > 1 ? parts[1] : parts[0];
  if (typeof window !== "undefined" && typeof atob === "function") {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } else {
    // Node.js fallback
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
}

export interface PlanningFonts {
  regular: PDFFont;
  bold: PDFFont;
}

/**
 * Charge les polices administratives standards sans bogue de ligature Unicode
 * (Garantit que "ti", "tt", etc. ne sont JAMAIS corrompus en caractères bizarres)
 */
export async function loadPlanningFonts(pdfDoc: PDFDocument): Promise<PlanningFonts> {
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  return { regular, bold };
}

export interface PlanningImages {
  bannerImg: PDFImage | null;
  logoImg: PDFImage | null;
}

export async function loadPlanningImages(pdfDoc: PDFDocument): Promise<PlanningImages> {
  let bannerImg: PDFImage | null = null;
  let logoImg: PDFImage | null = null;

  try {
    const bannerBytes = await fetchBytes("/banniere-cnlstp.png");
    bannerImg = await pdfDoc.embedPng(bannerBytes);
  } catch (e) {
    console.warn("[pdf-plannings] Échec chargement bannière CNLS-TP:", e);
  }

  try {
    const logoBytes = await fetchBytes("/logo-asc-benin.jpg");
    logoImg = await pdfDoc.embedJpg(logoBytes);
  } catch (e) {
    console.warn("[pdf-plannings] Échec chargement logo ASC Bénin:", e);
  }

  return { bannerImg, logoImg };
}

export async function embedDataUrlImage(pdfDoc: PDFDocument, dataUrl?: string | null): Promise<PDFImage | null> {
  if (!dataUrl || !dataUrl.includes("data:image")) return null;
  try {
    const bytes = dataUrlToUint8Array(dataUrl);
    if (dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg")) {
      return await pdfDoc.embedJpg(bytes);
    }
    return await pdfDoc.embedPng(bytes);
  } catch (err) {
    console.warn("[pdf-plannings] Échec intégration signature dataUrl:", err);
    return null;
  }
}

/**
 * Dessine une coche officielle vectorielle verte (remplace le caractère Unicode non supporté)
 */
export function drawVectorCheckmark(
  page: PDFPage,
  centerX: number,
  centerY: number,
  boxSize: number = 13
) {
  // 1. Fond carré vert clair
  page.drawRectangle({
    x: centerX - boxSize / 2,
    y: centerY - boxSize / 2,
    width: boxSize,
    height: boxSize,
    color: rgb(220 / 255, 252 / 255, 231 / 255), // emerald-100
    borderColor: rgb(0 / 255, 92 / 255, 48 / 255), // #005c30
    borderWidth: 1.2,
  });

  // 2. Trait de gauche de la coche ✔
  page.drawLine({
    start: { x: centerX - boxSize * 0.28, y: centerY },
    end: { x: centerX - boxSize * 0.05, y: centerY - boxSize * 0.25 },
    thickness: 1.8,
    color: rgb(0 / 255, 92 / 255, 48 / 255),
  });

  // 3. Trait de droite de la coche ✔
  page.drawLine({
    start: { x: centerX - boxSize * 0.05, y: centerY - boxSize * 0.25 },
    end: { x: centerX + boxSize * 0.32, y: centerY + boxSize * 0.28 },
    thickness: 1.8,
    color: rgb(0 / 255, 92 / 255, 48 / 255),
  });
}

/**
 * Nettoie une chaîne pour WinAnsi (remplace les caractères hors-WinAnsi par leur équivalent)
 */
export function sanitizeWinAnsi(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/[•●]/g, "-")
    .replace(/[✔✓]/g, "V")
    .replace(/[“”]/g, '"')
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .trim();
}

/**
 * Découpe un texte en lignes ne dépassant pas maxWidth pour une police et une taille données
 */
export function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const clean = sanitizeWinAnsi(text);
  if (!clean) return [];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Tronque élégamment une chaîne avec points de suspension si elle dépasse maxWidth
 */
export function fitText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string {
  const clean = sanitizeWinAnsi(text);
  if (!clean) return "";
  if (font.widthOfTextAtSize(clean, fontSize) <= maxWidth) {
    return clean;
  }
  let truncated = clean;
  while (truncated.length > 2 && font.widthOfTextAtSize(truncated + "...", fontSize) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
}

