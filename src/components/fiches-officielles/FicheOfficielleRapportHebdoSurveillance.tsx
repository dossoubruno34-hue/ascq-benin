"use client";

import React from "react";

interface Props {
  data?: {
    departement?: string;
    zoneSanitaire?: string;
    commune?: string;
    arrondissement?: string;
    village?: string;
    semaineNum?: number | string;
    dateDebut?: string;
    dateFin?: string;
    alertesDetectees?: number | string;
    personnesTouchees?: number | string;
    personnesDecedees?: number | string;
    alertesVerifiees48h?: number | string;
    alertesAverees?: number | string;
    decesMaternels?: number | string;
    decesNeonatals?: number | string;
    decesInfantiles?: number | string;
    decesInfantoJuveniles?: number | string;
    decesPlus5Ans?: number | string;
    actionsMenees?: string;
    signatureRapporteur?: string;
  };
  isVierge?: boolean;
}

export default function FicheOfficielleRapportHebdoSurveillance({ data = {}, isVierge = false }: Props) {
  const d = isVierge ? {} : data;

  const renderDateCasiers = (dateStr?: string) => {
    let jj = "", mm = "", aaaa = "";
    if (dateStr) {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        aaaa = parts[0];
        mm = parts[1];
        jj = parts[2];
      }
    }
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-xs">
        <span className="border border-black px-1.5 py-0.5 min-w-[22px] text-center font-bold">{jj}</span> /{" "}
        <span className="border border-black px-1.5 py-0.5 min-w-[22px] text-center font-bold">{mm}</span> /{" "}
        <span className="border border-black px-1.5 py-0.5 min-w-[36px] text-center font-bold">{aaaa}</span>
      </span>
    );
  };

  // 28 lignes pointillées officielles
  const TOTAL_DOTTED_LINES = 22;
  const actionsList = d.actionsMenees ? d.actionsMenees.split("\n").filter(Boolean) : [];

  return (
    <div className="w-full max-w-[800px] mx-auto bg-white text-black p-4 sm:p-6 print:p-0 print:max-w-none text-xs leading-normal font-sans antialiased">
      {/* En-tête supérieur */}
      <div className="flex items-center justify-between font-bold text-xs mb-3">
        <span>Ministère de la Santé</span>
        <span>République du Bénin</span>
      </div>

      {/* Titre officiel avec encadré à bordures festonnées / coins courbés */}
      <div className="relative border-2 border-black rounded-3xl p-3 text-center my-3 bg-white shadow-sm print:shadow-none">
        <h1 className="font-bold text-xs sm:text-sm tracking-wide uppercase">
          BJ_RAPPORT HEBDOMADAIRE DE LA SURVEILLANCE A BASE COMMUNUTAIRE
          <span className="text-red-600 font-bold ml-1">_V29.05.2025</span>
        </h1>
        <p className="italic text-xs text-slate-800 mt-0.5">
          (A remplir par l’ASCQ)
        </p>
      </div>

      {/* Lignes administratives */}
      <div className="space-y-1.5 text-xs mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span>Département : </span>
            <span className="font-bold underline">{d.departement || "_________________________"}</span>
          </div>
          <div>
            <span>Zone sanitaire : </span>
            <span className="font-bold underline">{d.zoneSanitaire || "_________________________________"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span>Commune : </span>
            <span className="font-bold underline">{d.commune || "_____________________"}</span>
          </div>
          <div>
            <span>Arrondissement : </span>
            <span className="font-bold underline">{d.arrondissement || "_____________________"}</span>
          </div>
          <div>
            <span>Village : </span>
            <span className="font-bold underline">{d.village || "_____________________"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div>
            <span>Semaine N° / </span>
            <span className="inline-block border border-black px-2 py-0.5 font-bold font-mono text-center min-w-[35px]">
              {d.semaineNum || ""}
            </span>
            <span> /</span>
          </div>
          <div className="flex items-center gap-2">
            <span>du </span>
            {renderDateCasiers(d.dateDebut)}
            <span> au </span>
            {renderDateCasiers(d.dateFin)}
          </div>
        </div>
      </div>

      {/* Tableau officiel */}
      <table className="w-full border-collapse border border-black text-xs leading-tight mb-4">
        <thead>
          <tr className="bg-[#FCE4D6] border-b border-black text-left">
            <th className="p-1.5 border-r border-black font-bold">Synthèse des alertes</th>
            <th className="p-1.5 font-bold text-center w-[120px]">Nombre</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black">
            <td className="p-1.5 border-r border-black">Nombre total d’alertes détectées</td>
            <td className="p-1.5 text-center font-bold">{d.alertesDetectees ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="p-1.5 border-r border-black">Nombre de personnes touchées</td>
            <td className="p-1.5 text-center font-bold">{d.personnesTouchees ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="p-1.5 border-r border-black">Nombre de personnes décédées</td>
            <td className="p-1.5 text-center font-bold">{d.personnesDecedees ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="p-1.5 border-r border-black">Nombre total d’alertes vérifiées dans un délai de 24-48h</td>
            <td className="p-1.5 text-center font-bold">{d.alertesVerifiees48h ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="p-1.5 border-r border-black">Nombre total d’alertes avérées comme événement</td>
            <td className="p-1.5 text-center font-bold">{d.alertesAverees ?? ""}</td>
          </tr>

          {/* Section Décès */}
          <tr className="bg-[#FCE4D6] border-b border-black text-left">
            <th className="p-1.5 border-r border-black font-bold">Synthèse des décès communautaires</th>
            <th className="p-1.5 font-bold text-center">Nombre</th>
          </tr>
          <tr className="border-b border-black">
            <td className="p-1.5 border-r border-black">Décès maternel</td>
            <td className="p-1.5 text-center font-bold">{d.decesMaternels ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="p-1.5 border-r border-black">Décès néonatal (0 à 28 jours)</td>
            <td className="p-1.5 text-center font-bold">{d.decesNeonatals ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="p-1.5 border-r border-black">Décès infantile (&lt;1 an ; inclure aussi les décès néonataux)</td>
            <td className="p-1.5 text-center font-bold">{d.decesInfantiles ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="p-1.5 border-r border-black">Décès infanto-juvénile (0-5ans)</td>
            <td className="p-1.5 text-center font-bold">{d.decesInfantoJuveniles ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="p-1.5 border-r border-black">Décès ≥ 5 ans</td>
            <td className="p-1.5 text-center font-bold">{d.decesPlus5Ans ?? ""}</td>
          </tr>

          {/* Actions menées */}
          <tr className="bg-[#FCE4D6] border-b border-black text-left">
            <th colSpan={2} className="p-1.5 font-bold">Actions menées</th>
          </tr>
          <tr>
            <td colSpan={2} className="p-2 space-y-1">
              {Array.from({ length: TOTAL_DOTTED_LINES }).map((_, idx) => (
                <div key={idx} className="relative h-4 flex items-center">
                  <span className="w-full border-b border-dotted border-slate-700 block" />
                  {actionsList[idx] && (
                    <span className="absolute left-0 top-0 bg-white pr-2 font-medium text-[11px]">
                      {actionsList[idx]}
                    </span>
                  )}
                </div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature en pied de page */}
      <div className="mt-8 flex justify-end">
        <div className="text-center min-w-[240px]">
          <p className="font-bold text-xs mb-8">Nom et signature du rapporteur</p>
          <p className="font-bold text-xs underline underline-offset-4">
            {d.signatureRapporteur || "_________________________________"}
          </p>
        </div>
      </div>
    </div>
  );
}
