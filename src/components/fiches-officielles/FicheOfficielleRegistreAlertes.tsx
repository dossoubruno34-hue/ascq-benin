"use client";

import React from "react";

interface Props {
  data?: {
    zoneSanitaire?: string;
    commune?: string;
    arrondissement?: string;
    centreSante?: string;
    village?: string;
    mois?: string | number;
    annee?: string | number;
    lignes?: Array<{
      numero?: number | string;
      typeCode?: number | string;
      dateSurvenue?: string;
      lieuDetection?: string;
      nbTouchees?: number | string;
      nbDecedes?: number | string;
      mesurePrise?: string;
    }>;
  };
  isVierge?: boolean;
}

export default function FicheOfficielleRegistreAlertes({ data = {}, isVierge = false }: Props) {
  const d = isVierge ? {} : data;
  const rows = isVierge ? [] : (d.lignes || []);
  
  // Remplir jusqu'à 15 lignes comme sur le modèle officiel
  const totalRows = Math.max(15, rows.length);
  const displayRows = Array.from({ length: totalRows }, (_, idx) => rows[idx] || null);

  return (
    <div className="w-full max-w-[800px] mx-auto bg-white text-black p-4 sm:p-6 print:p-0 print:max-w-none text-[11px] leading-tight font-sans antialiased">
      {/* Titre officiel du Registre */}
      <div className="text-center mb-4">
        <h1 className="text-base sm:text-lg font-bold tracking-tight">
          Registre des alertes et rumeurs communautaires
        </h1>
        <p className="italic text-xs text-slate-800">
          ( A remplir par le relais communautaire)
        </p>
      </div>

      {/* Cadre d'identification administratif */}
      <table className="w-full border-collapse border border-black mb-0 text-xs">
        <tbody>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 w-1/3">
              <span className="font-bold">Zone sanitaire:</span>{" "}
              <span className="font-medium">{d.zoneSanitaire || ""}</span>
            </td>
            <td className="border-r border-black p-1.5 w-1/3">
              <span className="font-bold">Commune:</span>{" "}
              <span className="font-medium">{d.commune || ""}</span>
            </td>
            <td className="p-1.5 w-1/3">
              <span className="font-bold">Arrondissement:</span>{" "}
              <span className="font-medium">{d.arrondissement || ""}</span>
            </td>
          </tr>
          <tr className="border-b border-black">
            <td colSpan={3} className="p-1.5">
              <span className="font-bold">Centre de santé de référence :</span>{" "}
              <span className="font-medium">{d.centreSante || ""}</span>
            </td>
          </tr>
          <tr className="border-b border-black">
            <td colSpan={3} className="p-1.5">
              <span className="font-bold">Village:</span>{" "}
              <span className="font-medium">{d.village || ""}</span>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="border-r border-black p-1.5">
              <span className="font-bold">Mois:</span>{" "}
              <span className="font-medium">{d.mois || ""}</span>
            </td>
            <td className="p-1.5">
              <span className="font-bold">Année:</span>{" "}
              <span className="font-medium">{d.annee || new Date().getFullYear()}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Tableau principal des alertes */}
      <table className="w-full border-collapse border border-black text-[10px] leading-tight mt-[-1px]">
        <thead>
          <tr className="border-b border-black text-center font-bold">
            <th className="border-r border-black p-1.5 w-[32px]">N°</th>
            <th className="border-r border-black p-1.5 w-[140px]">
              Type de maladie/<br />
              Affection/Événement/Alerte<br />
              <span className="font-normal text-[9px]">(Mettre le numéro 1 à 15)</span>
            </th>
            <th className="border-r border-black p-1.5 w-[85px]">
              Date de survenue<br />
              de l’évènement<br />
              <span className="font-normal text-[9px]">(JJ/MM/AAA)</span>
            </th>
            <th className="border-r border-black p-1.5 w-[110px]">
              Lieu de détection<br />
              (Communauté,<br />
              Commune)
            </th>
            <th className="border-r border-black p-1.5 w-[75px]">
              Nombre de<br />
              personnes<br />
              touchées
            </th>
            <th className="border-r border-black p-1.5 w-[75px]">
              Nombre de<br />
              personnes<br />
              décédées
            </th>
            <th className="p-1.5">
              Quelle mesure<br />
              a été prise ?
            </th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, idx) => (
            <tr key={idx} className="border-b border-black h-[28px] text-center">
              <td className="border-r border-black p-1 font-bold">
                {row?.numero || idx + 1}
              </td>
              <td className="border-r border-black p-1 text-center font-bold">
                {row?.typeCode || ""}
              </td>
              <td className="border-r border-black p-1 text-center">
                {row?.dateSurvenue || ""}
              </td>
              <td className="border-r border-black p-1 text-left">
                {row?.lieuDetection || ""}
              </td>
              <td className="border-r border-black p-1 font-bold">
                {row?.nbTouchees ?? ""}
              </td>
              <td className="border-r border-black p-1 font-bold">
                {row?.nbDecedes ?? ""}
              </td>
              <td className="p-1 text-left">
                {row?.mesurePrise || ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Légende officielle en pied de page */}
      <div className="mt-2 text-[9.5px] leading-relaxed text-justify">
        <p>
          <strong>1=</strong> fièvre ou notion de fièvre. <strong>2=</strong> éruption cutanée. <strong>3=</strong> Diarrhée. <strong>4=</strong> raideur de la nuque. <strong>5=</strong>Paralysie Flasque Aigue (PFA). <strong>6=</strong>saignements inexpliqués. <strong>7=</strong> yeux jaunes. <strong>8=</strong> vomissements importants. <strong>9=</strong> douleurs abdominales. <strong>10=</strong> décès néonatal (0 – 28jrs). <strong>11 =</strong> Décès infantile (&lt;1 an ; inclure aussi les décès néonataux), <strong>12 =</strong> Décès infanto-juvénile (0-5ans). <strong>13 =</strong> décès maternel. <strong>14 =</strong> Décès ≥ 5 ans ans sauf décès maternel). <strong>15=</strong> autres (à préciser).
        </p>
      </div>
    </div>
  );
}
