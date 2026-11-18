"use client";

import React from "react";

interface Props {
  data?: {
    departement?: string;
    zoneSanitaire?: string;
    commune?: string;
    arrondissement?: string;
    village?: string;
    relaisNomPrenom?: string;
    relaisTelephone?: string;
    ascqNomPrenom?: string;
    ascqTelephone?: string;
    coordonneesGps?: string;
    evenementAvere?: boolean | string;
    sourceInformation?: string;
    maladieEvenementConcerne?: string;
    descriptionEvenement?: string;
    circonstancesSurvenue?: string;
    dateSurvenue?: string;
    dateNotification?: string;
    dateInvestigation?: string;
    cas?: {
      cas0_11m_m?: number | string;
      cas0_11m_f?: number | string;
      cas1_5a_m?: number | string;
      cas1_5a_f?: number | string;
      cas6_15a_m?: number | string;
      cas6_15a_f?: number | string;
      casPlus15a_m?: number | string;
      casPlus15a_f?: number | string;
    };
    deces?: {
      deces0_11m_m?: number | string;
      deces0_11m_f?: number | string;
      deces1_5a_m?: number | string;
      deces1_5a_f?: number | string;
      deces6_15a_m?: number | string;
      deces6_15a_f?: number | string;
      decesPlus15a_m?: number | string;
      decesPlus15a_f?: number | string;
    };
    syntheseActions?: string;
    signatureInvestigateurs?: string;
  };
  isVierge?: boolean;
}

export default function FicheOfficielleInvestigationEvenement({ data = {}, isVierge = false }: Props) {
  const d = isVierge ? {} : data;
  const cas = isVierge ? {} : (d.cas || {});
  const deces = isVierge ? {} : (d.deces || {});

  return (
    <div className="w-full max-w-[800px] mx-auto bg-white text-black p-4 sm:p-6 print:p-0 print:max-w-none text-xs leading-tight font-sans antialiased">
      {/* En-tête officiel Ministère de la Santé */}
      <div className="flex items-center justify-between font-bold text-xs mb-3">
        <span>Ministère de la Santé</span>
        <span>République du Bénin</span>
      </div>

      {/* Cadre de titre officiel arrondi avec version rouge */}
      <div className="border-2 border-black rounded-2xl p-2.5 text-center my-3 bg-white">
        <h1 className="font-bold text-xs sm:text-sm tracking-wide">
          10_BJ_Fiche d’investigation des événements de santé par les Agents de Santé Communautaires Qualifiés (ASCQ)
          <span className="text-red-600 font-bold ml-1">_V14.11.2025</span>
        </h1>
      </div>

      {/* Tableau structuré à 2 colonnes */}
      <table className="w-full border-collapse border border-black text-[11px] leading-snug">
        <tbody>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 w-1/2 font-bold">Département de notification</td>
            <td className="p-1.5 font-medium">{d.departement || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Zone sanitaire de notification</td>
            <td className="p-1.5 font-medium">{d.zoneSanitaire || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Commune concernée l’événement</td>
            <td className="p-1.5 font-medium">{d.commune || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Arrondissement concernée l’événement</td>
            <td className="p-1.5 font-medium">{d.arrondissement || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Village concernée l’événement</td>
            <td className="p-1.5 font-medium">{d.village || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Nom et prénom du relais</td>
            <td className="p-1.5 font-medium">{d.relaisNomPrenom || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Tél relais</td>
            <td className="p-1.5 font-mono font-medium">{d.relaisTelephone || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Nom et prénom de l’ASCQ</td>
            <td className="p-1.5 font-medium">{d.ascqNomPrenom || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Tél de l’ASCQ</td>
            <td className="p-1.5 font-mono font-medium">{d.ascqTelephone || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Coordonnées GPS</td>
            <td className="p-1.5 font-mono font-medium">{d.coordonneesGps || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Evénement avéré ? (Oui/Non)</td>
            <td className="p-1.5 font-medium">
              {d.evenementAvere !== undefined ? (d.evenementAvere === true || d.evenementAvere === "Oui" ? "Oui" : "Non") : ""}
            </td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Source d’information sur l’événement</td>
            <td className="p-1.5 font-medium">{d.sourceInformation || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Maladie/ événement concerné</td>
            <td className="p-1.5 font-medium">{d.maladieEvenementConcerne || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">
              Décrire l’événement (signes et symptômes, date de début, les personnes touchées)
            </td>
            <td className="p-1.5 font-medium whitespace-pre-wrap">{d.descriptionEvenement || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">
              Décrire les circonstances de survenue (comment l’événement a démarré, notion de voyage etc)
            </td>
            <td className="p-1.5 font-medium whitespace-pre-wrap">{d.circonstancesSurvenue || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Date de survenue de l’événement</td>
            <td className="p-1.5 font-medium">{d.dateSurvenue || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Date de notification de l’événement avec l’envoi du formulaire</td>
            <td className="p-1.5 font-medium">{d.dateNotification || ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1.5 font-bold">Date de l’investigation de l’événement</td>
            <td className="p-1.5 font-medium">{d.dateInvestigation || ""}</td>
          </tr>

          {/* 8 Tranches d'âge - CAS */}
          <tr className="border-b border-black bg-slate-50 print:bg-transparent">
            <td colSpan={2} className="p-1.5 font-bold">Nombre total de cas de cas</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• 0-11 mois masculin</td>
            <td className="p-1 font-bold">{cas.cas0_11m_m ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• 0-11 mois féminin</td>
            <td className="p-1 font-bold">{cas.cas0_11m_f ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• 1 à 5 ans masculin</td>
            <td className="p-1 font-bold">{cas.cas1_5a_m ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• 1 à 5 ans féminin</td>
            <td className="p-1 font-bold">{cas.cas1_5a_f ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• 6 à 15 ans masculin</td>
            <td className="p-1 font-bold">{cas.cas6_15a_m ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• 6 à 15 ans féminin</td>
            <td className="p-1 font-bold">{cas.cas6_15a_f ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• &gt;15 ans masculin</td>
            <td className="p-1 font-bold">{cas.casPlus15a_m ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• &gt;15 ans féminin</td>
            <td className="p-1 font-bold">{cas.casPlus15a_f ?? ""}</td>
          </tr>

          {/* 8 Tranches d'âge - DÉCÈS */}
          <tr className="border-b border-black bg-slate-50 print:bg-transparent">
            <td colSpan={2} className="p-1.5 font-bold">Nombre total de décès</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• 0-11 mois masculin</td>
            <td className="p-1 font-bold">{deces.deces0_11m_m ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• 0-11 mois féminin</td>
            <td className="p-1 font-bold">{deces.deces0_11m_f ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• 1 à 5 ans masculin</td>
            <td className="p-1 font-bold">{deces.deces1_5a_m ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• 1 à 5 ans féminin</td>
            <td className="p-1 font-bold">{deces.deces1_5a_f ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• 6 à 15 ans masculin</td>
            <td className="p-1 font-bold">{deces.deces6_15a_m ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• 6 à 15 ans féminin</td>
            <td className="p-1 font-bold">{deces.deces6_15a_f ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• &gt;15 ans masculin</td>
            <td className="p-1 font-bold">{deces.decesPlus15a_m ?? ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1 pl-4">• &gt;15 ans féminin</td>
            <td className="p-1 font-bold">{deces.decesPlus15a_f ?? ""}</td>
          </tr>

          {/* Synthèse des actions menées */}
          <tr>
            <td className="border-r border-black p-1.5 font-bold align-top">
              Synthèse des actions menées
            </td>
            <td className="p-1.5 font-medium min-h-[60px] whitespace-pre-wrap">{d.syntheseActions || ""}</td>
          </tr>
        </tbody>
      </table>

      {/* Signature en pied de page */}
      <div className="mt-6 flex justify-end">
        <div className="text-center min-w-[240px]">
          <p className="font-bold text-xs mb-8">Nom et signature des investigateurs</p>
          <p className="font-bold text-xs underline underline-offset-4">
            {d.signatureInvestigateurs || "_________________________________"}
          </p>
        </div>
      </div>
    </div>
  );
}
