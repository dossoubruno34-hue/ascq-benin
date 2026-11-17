import { PDFDocument, PDFFont, PDFImage, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

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

export async function loadPlanningFonts(pdfDoc: PDFDocument): Promise<PlanningFonts> {
  try {
    pdfDoc.registerFontkit(fontkit);
    const [regBytes, boldBytes] = await Promise.all([
      fetchBytes("/fonts/Carlito-Regular.ttf"),
      fetchBytes("/fonts/Carlito-Bold.ttf"),
    ]);
    const regular = await pdfDoc.embedFont(regBytes, { subset: false });
    const bold = await pdfDoc.embedFont(boldBytes, { subset: false });
    return { regular, bold };
  } catch (err) {
    console.warn("[pdf-plannings] Repli vers Helvetica standard :", err);
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    return { regular, bold };
  }
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
