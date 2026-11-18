"use client";

import React from "react";
import EnteteOfficiellePortrait from "./EnteteOfficiellePortrait";
import PiedDePageOfficiel from "./PiedDePageOfficiel";

interface Props {
  data?: {
    annee?: number | string;
    semaineEpidemio?: number | string;
    mois?: string | number;
    npiDefunt?: string;
    numeroDeces?: string;
    departement?: string;
    zoneSanitaire?: string;
    commune?: string;
    arrondissement?: string;
    village?: string;
    numeroGrappe?: number | string;
    adresse?: string;
    nomPrenomsDefunt?: string;
    nomParent?: string;
    telephoneParent?: string;
    dateNaissance?: string;
    ageAnnees?: number | string;
    ageMois?: number | string;
    ageJours?: number | string;
    sexe?: "M" | "F";
    gpsLongitude?: number | string;
    gpsLatitude?: number | string;
    typeDecesCode?: number | string;
    dateDeces?: string;
    dateNotification?: string;
    dateSaisie?: string;
    lieuDecesCode?: number | string;
    lieuPaysEtranger?: string;
    lieuAutrePrecision?: string;
    circonstancesCode?: number | string;
    circonstancesAutrePrecision?: string;
    causeProbableCim10?: string;
    notificateurNom?: string;
    notificateurTitre?: string;
    notificateurStructure?: string;
    notificateurTelephone?: string;
    signatureNotificateur?: string | null;
    dateSignature?: string;
  };
  isVierge?: boolean;
}

export default function FicheOfficielleNotificationDeces({ data = {}, isVierge = false }: Props) {
  const d = isVierge ? {} : data;

  // Rendu de valeur renseignée : GRAS et BLEU OFFICIEL (#002B7F), avec protection de débordement
  const renderValeur = (val?: string | number, minWidth = "min-w-[120px]", fallback = "____________________") => {
    const v = val !== undefined && val !== null ? String(val).trim() : "";
    if (v) {
      return (
        <span className="font-black text-[#002B7F] px-1.5 py-0.5 bg-blue-50/70 rounded border-b-2 border-[#002B7F] inline-block tracking-wide break-words max-w-full">
          {v}
        </span>
      );
    }
    return (
      <span className={`inline-block border-b border-dotted border-slate-400 ${minWidth} h-4 align-middle text-slate-300 text-[10px]`}>
        {fallback}
      </span>
    );
  };

  // Casier officiel calibré : chiffre en gras et en bleu officiel (#002B7F)
  const renderCasier = (val?: string | number, minWidth = "36px") => {
    const v = val !== undefined && val !== null ? String(val).trim() : "";
    const hasVal = Boolean(v && v !== "-");
    return (
      <span
        className={`inline-flex items-center justify-center border font-mono font-black text-xs px-2 py-0.5 rounded-xs transition-colors ${
          hasVal
            ? "border-[#002B7F] text-[#002B7F] bg-blue-50/90 shadow-2xs"
            : "border-slate-800 text-slate-400 bg-white"
        }`}
        style={{ minWidth }}
      >
        {v || "-"}
      </span>
    );
  };

  // Casiers pour les dates : [JJ] / [MM] / [AAAA] sans collision avec les slashs
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
    const hasVal = Boolean(jj || mm || aaaa);
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs">
        <span className={`border px-1.5 py-0.5 min-w-[28px] text-center font-black rounded-xs ${
          hasVal && jj ? "border-[#002B7F] text-[#002B7F] bg-blue-50/80" : "border-slate-800 text-slate-400"
        }`}>
          {jj || "JJ"}
        </span>
        <span className="text-slate-400 font-bold">/</span>
        <span className={`border px-1.5 py-0.5 min-w-[28px] text-center font-black rounded-xs ${
          hasVal && mm ? "border-[#002B7F] text-[#002B7F] bg-blue-50/80" : "border-slate-800 text-slate-400"
        }`}>
          {mm || "MM"}
        </span>
        <span className="text-slate-400 font-bold">/</span>
        <span className={`border px-1.5 py-0.5 min-w-[44px] text-center font-black rounded-xs ${
          hasVal && aaaa ? "border-[#002B7F] text-[#002B7F] bg-blue-50/80" : "border-slate-800 text-slate-400"
        }`}>
          {aaaa || "AAAA"}
        </span>
      </span>
    );
  };

  return (
    <div className="w-full max-w-[820px] mx-auto bg-white text-black p-4 sm:p-6 print:p-0 print:max-w-none text-[11px] leading-tight font-sans antialiased">
      
      {/* ========================================================================= */}
      {/* 1. EN-TÊTE PORTRAIT OFFICIEL VALIDÉ (Conforme arrêté et capture validée)   */}
      {/* ========================================================================= */}
      <EnteteOfficiellePortrait
        departement={d.departement || "ZOU"}
        commune={d.commune || "OUINHI"}
        arrondissement={d.arrondissement || "TOHOUÈS"}
        titreFormulaire="BJ_FORMULAIRE DE NOTIFICATION DES DÉCÈS EN COMMUNAUTÉ"
      />

      {/* Ligne Année, Semaine, Mois, NPI, N° Décès */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">Année :</span>
            {renderCasier(d.annee, "50px")}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">Semaine épidémio :</span>
            {renderCasier(d.semaineEpidemio, "36px")}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">Mois :</span>
            {renderCasier(d.mois, "36px")}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:justify-end">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">NPI défunt :</span>
            {renderCasier(d.npiDefunt || "-", "120px")}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">N° décès :</span>
            {renderCasier(d.numeroDeces || "-", "130px")}
          </div>
        </div>
      </div>

      {/* SECTION 1 : RESIDENCE ET IDENTIFICATION DU DEFUNT(E) */}
      <div className="bg-[#FCE4D6] border border-black px-2 py-1 font-black text-xs uppercase mb-2 text-slate-900">
        RÉSIDENCE ET IDENTIFICATION DU DÉFUNT(E)
      </div>

      <div className="space-y-2 text-xs mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex-1 min-w-[200px] flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Département :</span>
            {renderValeur(d.departement, "min-w-[120px]")}
          </div>
          <div className="flex-1 min-w-[240px] flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Zone sanitaire :</span>
            {renderValeur(d.zoneSanitaire, "min-w-[140px]")}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Commune :</span>
            {renderValeur(d.commune, "min-w-[100px]")}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Arrondissement :</span>
            {renderValeur(d.arrondissement, "min-w-[100px]")}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Village :</span>
            {renderValeur(d.village, "min-w-[100px]")}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">N° de grappe :</span>
            {renderCasier(d.numeroGrappe, "36px")}
          </div>
          <div className="flex-1 min-w-[240px] flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Adresse du/de la défunt(e) ou parents :</span>
            {renderValeur(d.adresse, "min-w-[160px]")}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-700">Nom(s) & prénoms du/de la défunt(e) :</span>
          {renderValeur(d.nomPrenomsDefunt, "min-w-[220px]")}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex-1 min-w-[240px] flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Nom d'un parent ou proche :</span>
            {renderValeur(d.nomParent, "min-w-[140px]")}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Téléphone d'un parent ou proche :</span>
            {renderValeur(d.telephoneParent, "min-w-[130px]")}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Date de naissance du/de la défunt(e) :</span>
            {renderDateCasiers(d.dateNaissance)}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Ou âge au moment du décès (en année) :</span>
            {d.ageAnnees !== undefined && d.ageAnnees !== null && String(d.ageAnnees).trim() !== "" ? (
              <span className="font-black text-[#002B7F] px-2 py-0.5 bg-blue-50/90 rounded border border-[#002B7F]">
                {d.ageAnnees} an(s)
              </span>
            ) : (
              renderCasier("-", "36px")
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[10.5px]">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Ou âge au décès (en mois, &lt; 1 an) :</span>
            {d.ageMois !== undefined && d.ageMois !== null && String(d.ageMois).trim() !== "" ? (
              <span className="font-black text-[#002B7F] px-2 py-0.5 bg-blue-50/90 rounded border border-[#002B7F]">
                {d.ageMois} mois
              </span>
            ) : (
              renderCasier("-", "36px")
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Ou âge au décès (en jour, &lt; 1 mois) :</span>
            {d.ageJours !== undefined && d.ageJours !== null && String(d.ageJours).trim() !== "" ? (
              <span className="font-black text-[#002B7F] px-2 py-0.5 bg-blue-50/90 rounded border border-[#002B7F]">
                {d.ageJours} jour(s)
              </span>
            ) : (
              renderCasier("-", "36px")
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">Sexe :</span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded border text-xs ${
              d.sexe === "M"
                ? "border-[#002B7F] bg-blue-50/90 font-black text-[#002B7F]"
                : "border-slate-300 text-slate-400 bg-white"
            }`}>
              <span className="font-mono text-xs">{d.sexe === "M" ? "☑" : "☐"}</span> M
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded border text-xs ${
              d.sexe === "F"
                ? "border-[#002B7F] bg-blue-50/90 font-black text-[#002B7F]"
                : "border-slate-300 text-slate-400 bg-white"
            }`}>
              <span className="font-mono text-xs">{d.sexe === "F" ? "☑" : "☐"}</span> F
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[10.5px]">
            <span className="font-semibold text-slate-700">Coordonnées GPS domicile :</span>
            <span className="font-mono text-slate-600">Long :</span>
            {renderValeur(d.gpsLongitude, "min-w-[60px]")}
            <span className="font-mono text-slate-600">Lat :</span>
            {renderValeur(d.gpsLatitude, "min-w-[60px]")}
          </div>
        </div>

        <div className="pt-1 flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-800">Type de décès :</span>
          {renderCasier(d.typeDecesCode, "42px")}
          <span className="text-[10px] text-slate-500 italic">
            (mettre le chiffre correspondant dans le casier ci-dessus)
          </span>
        </div>

        {/* Encadré explicatif officiel Type de décès 1 à 5 */}
        <div className="border border-slate-300 p-2.5 text-[10px] leading-tight space-y-1 bg-slate-50 rounded-lg print:bg-transparent">
          <p>
            <strong className="text-slate-900">1 = Décès maternel :</strong> Décès lié à la maternité survenant pendant la grossesse, lors de l'accouchement ou dans les 42 jours après.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-700">
            <p><strong>2 =</strong> Décès de bébé âgé de 0-28 jours</p>
            <p><strong>3 =</strong> Décès d'enfant âgé de 1 mois à 1 an (&lt; 1 an)</p>
            <p><strong>4 =</strong> Décès d'enfant âgé de 1 à 5 ans</p>
            <p><strong>5 =</strong> Décès de personne âgée de plus de 5 ans</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Date du décès :</span>
            {renderDateCasiers(d.dateDeces)}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Date notification :</span>
            {renderDateCasiers(d.dateNotification)}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Date saisie :</span>
            {renderDateCasiers(d.dateSaisie || d.dateNotification)}
          </div>
        </div>
      </div>

      {/* SECTION 2 : INFORMATION SUR LA CAUSE ET LE LIEU DU DECES */}
      <div className="bg-[#FCE4D6] border border-black px-2 py-1 font-black text-xs uppercase mb-2 text-slate-900">
        INFORMATION SUR LA CAUSE ET LE LIEU DU DÉCÈS
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 border border-black text-[10.5px] leading-tight mb-2 rounded-xs overflow-hidden">
        {/* Colonne 1 : Lieu du décès */}
        <div className="border-b sm:border-b-0 sm:border-r border-black p-2.5 space-y-1 bg-white">
          <div className="font-bold text-xs mb-1.5 flex items-center justify-between">
            <span>Lieu du décès :</span>
            {renderCasier(d.lieuDecesCode, "36px")}
          </div>
          <p><strong>1-</strong> Centre de santé</p>
          <p><strong>2-</strong> Domicile</p>
          <p><strong>3-</strong> Accoucheuse</p>
          <p><strong>4-</strong> Lieu de culte</p>
          <p><strong>5-</strong> Au cours du transport</p>
          <p><strong>6-</strong> À l'étranger avec transport du corps au Bénin</p>
          <p className="pl-4 italic text-[10px]">
            (Pays étranger : {renderValeur(d.lieuPaysEtranger, "min-w-[100px]")})
          </p>
          <p><strong>7-</strong> Autres à préciser : {renderValeur(d.lieuAutrePrecision, "min-w-[120px]")}</p>
        </div>

        {/* Colonne 2 : Circonstances du décès */}
        <div className="p-2.5 space-y-1 bg-white">
          <div className="font-bold text-xs mb-1.5 flex items-center justify-between">
            <span>Circonstances du décès selon les parents :</span>
            {renderCasier(d.circonstancesCode, "36px")}
          </div>
          <p><strong>1-</strong> Grossesse / Avortement / Accouchement / Suites de couches</p>
          <p><strong>2-</strong> Maladie</p>
          <p><strong>3-</strong> Accident de route</p>
          <p><strong>4-</strong> Accident domestique</p>
          <p><strong>5-</strong> Mort subite</p>
          <p><strong>6-</strong> Violence (agression, arme à feu, suicide…)</p>
          <p><strong>7-</strong> Autres à préciser : {renderValeur(d.circonstancesAutrePrecision, "min-w-[120px]")}</p>
        </div>
      </div>

      <div className="text-xs mb-3 p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 flex-wrap">
        <span className="font-bold text-slate-800">
          Cause probable du décès après l'autopsie verbale sous supervision du MCC :
        </span>
        {renderValeur(d.causeProbableCim10, "min-w-[160px]")}
      </div>

      {/* SECTION 3 : INFORMATION SUR LE NOTIFICATEUR */}
      <div className="bg-[#FCE4D6] border border-black px-2 py-1 font-black text-xs uppercase mb-2 text-slate-900">
        INFORMATION SUR LE NOTIFICATEUR
      </div>

      <div className="text-xs space-y-2 p-2 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex-1 min-w-[240px] flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Nom & prénom :</span>
            {renderValeur(d.notificateurNom, "min-w-[180px]")}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Titre :</span>
            {renderValeur(d.notificateurTitre || "RC", "min-w-[80px]")}
            <span className="text-[10px] text-slate-500">(Profil ciblé)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex-1 min-w-[240px] flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Structure :</span>
            {renderValeur(d.notificateurStructure, "min-w-[180px]")}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Téléphone :</span>
            {renderValeur(d.notificateurTelephone, "min-w-[130px]")}
          </div>
        </div>

        {/* Signature tactile officielle du notificateur */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-200 mt-2">
          <div>
            <span className="font-bold text-slate-800">Signature du notificateur :</span>
            {d.dateSignature && (
              <span className="text-[11px] text-slate-500 ml-2 font-mono">
                Fait le {d.dateSignature}
              </span>
            )}
          </div>
          {d.signatureNotificateur ? (
            <div className="border border-slate-300 rounded-lg p-1.5 bg-slate-50/50 shadow-2xs">
              <img
                src={d.signatureNotificateur}
                alt="Signature manuscrite du notificateur"
                className="h-12 max-w-[150px] object-contain"
              />
            </div>
          ) : (
            <div className="border-b border-dashed border-slate-400 w-36 h-8 flex items-end justify-center text-[10px] text-slate-400 pb-0.5">
              (Signature)
            </div>
          )}
        </div>
      </div>

      {/* Pied de page officiel */}
      <PiedDePageOfficiel className="mt-4" />
    </div>
  );
}
