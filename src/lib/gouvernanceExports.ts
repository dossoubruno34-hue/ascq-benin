// =====================================================================
// EXPORTS GOUVERNANCE TERRITORIALE (EXCEL, CSV UTF-8 AVEC BOM, PDF)
// Avec masquage des petits effectifs (< 5) et journalisation d'audit
// =====================================================================

import { supabase } from "./supabase";

/**
 * Règle de confidentialité : masque les effectifs < 5 dans les données compilées
 */
export function anonymiserPetitEffectif(valeur: number | string | null | undefined): string {
  if (valeur === null || valeur === undefined || valeur === "") return "0";
  const num = typeof valeur === "number" ? valeur : parseInt(valeur, 10);
  if (isNaN(num)) return String(valeur);
  if (num > 0 && num < 5) return "< 5";
  return String(num);
}

/**
 * Journalise l'export auprès de Supabase
 */
export async function journaliserExport(
  typeExport: string,
  formatExport: "EXCEL" | "CSV" | "PDF",
  territoireNom: string,
  niveauTerritoire: "NATIONAL" | "DEPARTEMENT" | "ZONE" | "COMMUNE",
  nbLignes: number,
  parametres: any = {}
) {
  try {
    await supabase.rpc("gouvernance_enregistrer_export", {
      p_type_export: typeExport,
      p_format_export: formatExport,
      p_territoire_nom: territoireNom,
      p_niveau_territoire: niveauTerritoire,
      p_nb_lignes: nbLignes,
      p_parametres: parametres,
    });
  } catch (err) {
    console.warn("Échec enregistrement journal d'export:", err);
  }
}

/**
 * Télécharge un fichier CSV avec délimiteur point-virgule et encodage UTF-8 avec BOM (\uFEFF)
 * Garanti 100% lisible sous Excel Windows, Mac, Linux avec accents français préservés
 */
export function telechargerCsvBOM(nomFichier: string, enTetes: string[], lignes: (string | number)[][]) {
  const separateur = ";";
  const lignesCsv = [
    enTetes.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(separateur),
    ...lignes.map((row) =>
      row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(separateur)
    ),
  ];

  const contenuCsv = "\uFEFF" + lignesCsv.join("\r\n");
  const blob = new Blob([contenuCsv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", nomFichier.endsWith(".csv") ? nomFichier : `${nomFichier}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Télécharge un tableau HTML en format Excel (.xls compatible Excel, LibreOffice et Calc)
 */
export function telechargerExcelHtml(nomFichier: string, titre: string, sousTitre: string, enTetes: string[], lignes: (string | number)[][]) {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>${titre.substring(0, 30)}</x:Name>
      <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        body { font-family: Calibri, Arial, sans-serif; }
        .titre { font-size: 16pt; font-weight: bold; color: #005c30; text-align: center; }
        .soustitre { font-size: 10pt; font-style: italic; color: #555555; text-align: center; margin-bottom: 15px; }
        th { background-color: #005c30; color: #ffffff; font-weight: bold; border: 1px solid #cccccc; padding: 8px; text-align: center; }
        td { border: 1px solid #e0e0e0; padding: 6px; }
        .num { text-align: right; }
        .center { text-align: center; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="${enTetes.length}" class="titre">${titre}</td></tr>
        <tr><td colspan="${enTetes.length}" class="soustitre">${sousTitre} - Extrait le ${new Date().toLocaleDateString("fr-FR")}</td></tr>
        <tr></tr>
        <thead>
          <tr>
            ${enTetes.map((h) => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${lignes
            .map(
              (row) =>
                `<tr>${row
                  .map((val) => {
                    const isNum = typeof val === "number";
                    return `<td class="${isNum ? "num" : ""}">${val ?? ""}</td>`;
                  })
                  .join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", nomFichier.endsWith(".xls") ? nomFichier : `${nomFichier}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Génère une impression / PDF prête pour impression navigateur de haute qualité
 */
export function imprimerRapportPdf(titre: string, sousTitre: string, enTetes: string[], lignes: (string | number)[][], meta: Record<string, string> = {}) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Veuillez autoriser les fenêtres pop-up pour afficher le rapport PDF.");
    return;
  }

  const metaHtml = Object.entries(meta)
    .map(([k, v]) => `<div style="display:inline-block; margin-right: 20px; font-size: 11px;"><strong>${k} :</strong> ${v}</div>`)
    .join("");

  const rowsHtml = lignes
    .map(
      (r) =>
        `<tr>${r
          .map((c) => `<td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${c ?? ""}</td>`)
          .join("")}</tr>`
    )
    .join("");

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${titre}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; }
          .header { text-align: center; border-bottom: 2px solid #005c30; padding-bottom: 10px; margin-bottom: 15px; }
          .republique { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #005c30; }
          .ministere { font-size: 10px; color: #475569; margin-top: 2px; }
          .titre { font-size: 15px; font-weight: 900; color: #0f172a; margin: 8px 0 3px 0; text-transform: uppercase; }
          .sous-titre { font-size: 11px; color: #64748b; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #005c30; color: white; border: 1px solid #004724; padding: 7px 8px; font-size: 11px; text-transform: uppercase; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 20px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; text-align: right;">
          <button onclick="window.print()" style="background:#005c30; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer;">
            🖨️ Lancer l'impression / Enregistrer en PDF
          </button>
        </div>

        <div class="header">
          <div class="republique">République du Bénin • Ministère de la Santé</div>
          <div class="ministere">Direction Nationale de la Santé Communautaire & Soins Primaires</div>
          <div class="titre">${titre}</div>
          <div class="sous-titre">${sousTitre} • Généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
        </div>

        ${metaHtml ? `<div class="meta-box">${metaHtml}</div>` : ""}

        <table>
          <thead>
            <tr>
              ${enTetes.map((h) => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <span>Application Nationale ASCQ Bénin & Relais Communautaires • Système National d'Information Sanitaire (SNIS)</span>
          <span>Document officiel de supervision territoriale</span>
        </div>
      </body>
    </html>
  `);
  win.document.close();
}
