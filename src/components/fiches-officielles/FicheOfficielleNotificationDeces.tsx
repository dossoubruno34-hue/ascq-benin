"use client";

import React from "react";

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
  };
  isVierge?: boolean;
}

export default function FicheOfficielleNotificationDeces({ data = {}, isVierge = false }: Props) {
  const d = isVierge ? {} : data;

  const renderCasier = (val?: string | number, minWidth = "40px") => (
    <span
      className="inline-block border border-black px-2 py-0.5 text-center font-mono font-bold text-xs bg-white"
      style={{ minWidth }}
    >
      {val !== undefined && val !== null ? String(val) : ""}
    </span>
  );

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
        <span className="border border-black px-1.5 py-0.5 min-w-[24px] text-center font-bold">{jj}</span> /{" "}
        <span className="border border-black px-1.5 py-0.5 min-w-[24px] text-center font-bold">{mm}</span> /{" "}
        <span className="border border-black px-1.5 py-0.5 min-w-[38px] text-center font-bold">{aaaa}</span> /
      </span>
    );
  };

  return (
    <div className="w-full max-w-[800px] mx-auto bg-white text-black p-4 sm:p-6 print:p-0 print:max-w-none text-[11px] leading-tight font-sans antialiased">
      {/* En-tête supérieur officiel */}
      <div className="flex items-center justify-between font-bold text-xs mb-1">
        <span>Ministère de la Santé</span>
        <span>République du Bénin</span>
      </div>
      <div className="border-t-2 border-black mb-2" />

      {/* Titre officiel du formulaire */}
      <div className="text-center font-bold text-sm tracking-wide mb-2 uppercase">
        BJ_FORMULAIRE DE NOTIFICATION DES DECES EN COMMUNAUTE
      </div>

      {/* Ligne Année, Semaine, Mois, NPI, N° Décès */}
      <div className="flex flex-wrap items-center justify-between text-xs mb-3 gap-2">
        <div>
          <span>Année : / </span>
          <span className="font-bold underline">{d.annee || "________"}</span>
          <span> /</span>
        </div>
        <div>
          <span>Semaine épidémiologique : / </span>
          <span className="font-bold underline">{d.semaineEpidemio || "_____"}</span>
          <span> /</span>
        </div>
        <div>
          <span>Mois : / </span>
          <span className="font-bold underline">{d.mois || "_________________"}</span>
          <span> /</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs mb-3 gap-2">
        <div>
          <span>NPI de la personne décédée : / </span>
          <span className="font-bold font-mono underline">{d.npiDefunt || "____________________________________"}</span>
          <span> /</span>
        </div>
        <div>
          <span>N° décès : / </span>
          <span className="font-bold font-mono underline">{d.numeroDeces || "_____________________"}</span>
          <span> /</span>
        </div>
      </div>

      {/* SECTION 1 : RESIDENCE ET IDENTIFICATION DU DEFUNT(E) */}
      <div className="bg-[#FCE4D6] border border-black px-2 py-1 font-bold text-xs uppercase mb-2">
        RESIDENCE ET IDENTIFICATION DU DEFUNT(E)
      </div>

      <div className="space-y-1.5 text-xs mb-3">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <div className="flex-1 min-w-[220px]">
            <span>Département : </span>
            <span className="font-bold underline">{d.departement || "_________________________"}</span>
          </div>
          <div className="flex-1 min-w-[280px]">
            <span>Zone sanitaire : </span>
            <span className="font-bold underline">{d.zoneSanitaire || "____________________________________________"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1">
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

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <span>N° de grappe : / </span>
            <span className="font-bold underline">{d.numeroGrappe || "________"}</span>
            <span> /</span>
          </div>
          <div className="flex-1">
            <span>Adresse du/de la défunt(e) ou des parents : </span>
            <span className="font-bold underline">{d.adresse || "_____________________________________________"}</span>
          </div>
        </div>

        <div>
          <span>Nom(s) & prénoms du/de la défunt(e) : </span>
          <span className="font-bold underline uppercase">{d.nomPrenomsDefunt || "___________________________________________________________"}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex-1 min-w-[240px]">
            <span>Nom d’un parent ou proche: </span>
            <span className="font-bold underline">{d.nomParent || "____________________________"}</span>
          </div>
          <div>
            <span>Téléphone d’un parent ou proche : </span>
            <span className="font-bold underline font-mono">{d.telephoneParent || "___________________________"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span>Date de naissance du/de la défunt(e): </span>
            {renderDateCasiers(d.dateNaissance)}
          </div>
          <div>
            <span>Ou âge au moment du décès (en année) : </span>
            <span className="font-bold underline">{d.ageAnnees !== undefined ? `${d.ageAnnees} Ans` : "______Ans"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span>Ou âge au moment du décès (en mois) : </span>
            <span className="font-bold underline">{d.ageMois !== undefined ? `${d.ageMois} mois` : "______mois"} (pour les enfants moins d’un an)</span>
          </div>
          <div>
            <span>Ou âge au moment du décès (en jour) : </span>
            <span className="font-bold underline">{d.ageJours !== undefined ? `${d.ageJours} jours` : "______jours"} (pour les enfants moins d’un mois)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span>Sexe :</span>
            <label className="inline-flex items-center gap-1 font-bold">
              <span className="inline-block border border-black w-3.5 h-3.5 text-center leading-[12px] font-mono text-[10px]">
                {d.sexe === "M" ? "X" : ""}
              </span>
              <span>M</span>
            </label>
            <label className="inline-flex items-center gap-1 font-bold">
              <span className="inline-block border border-black w-3.5 h-3.5 text-center leading-[12px] font-mono text-[10px]">
                {d.sexe === "F" ? "X" : ""}
              </span>
              <span>F</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span>Coordonnée GPS du domicile : longitude : </span>
            <span className="font-bold underline font-mono">{d.gpsLongitude || "____________________"}</span>
            <span>latitude : </span>
            <span className="font-bold underline font-mono">{d.gpsLatitude || "____________________"}</span>
          </div>
        </div>

        <div className="pt-1">
          <span>Type décès / </span>
          {renderCasier(d.typeDecesCode, "50px")}
          <span> / ( mettre le chiffre correspond en bas dans le casier)</span>
        </div>

        {/* Encadré explicatif Type de décès 1 à 5 */}
        <div className="border border-black p-2 text-[10.5px] leading-tight space-y-0.5 bg-slate-50/50 print:bg-transparent">
          <p><strong>1 = Décès maternel :</strong> décès maternel signifie les décès liés à la maternité qui surviennent pendant la grossesse ou lors de l’accouchement ou dans les 42 jours après l’accouchement</p>
          <p><strong>2 = Décès de bébé âgé de 0-28 jours</strong></p>
          <p><strong>3 = Décès d’enfant âgé de 1 mois à 1 an (&lt; 1 an)</strong></p>
          <p><strong>4 = Décès d’enfant âgé 1 à 5 ans</strong></p>
          <p><strong>5 = Décès de personne âgée de plus de 5 ans</strong></p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div>
            <span>Date du décès : </span>
            {renderDateCasiers(d.dateDeces)}
          </div>
          <div>
            <span>Date de notification du décès : </span>
            {renderDateCasiers(d.dateNotification)}
          </div>
        </div>

        <div>
          <span>Date de saisie de la fiche: </span>
          {renderDateCasiers(d.dateSaisie || d.dateNotification)}
        </div>
      </div>

      {/* SECTION 2 : INFORMATION SUR LA CAUSE ET LE LIEU DU DECES */}
      <div className="bg-[#FCE4D6] border border-black px-2 py-1 font-bold text-xs uppercase mb-2">
        INFORMATION SUR LA CAUSE ET LE LIEU DU DECES
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 border border-black text-[10.5px] leading-tight mb-2">
        {/* Colonne 1 : Lieu du décès */}
        <div className="border-b sm:border-b-0 sm:border-r border-black p-2 space-y-1">
          <div className="font-bold text-xs mb-1">
            Lieu du décès / {renderCasier(d.lieuDecesCode, "35px")} /
            <p className="font-normal text-[9.5px] italic">(mettre le chiffre correspond en bas dans le casier)</p>
          </div>
          <p><strong>1-</strong> Centre de santé</p>
          <p><strong>2-</strong> Domicile</p>
          <p><strong>3-</strong> Accoucheuse</p>
          <p><strong>4-</strong> Lieu de culte</p>
          <p><strong>5-</strong> Au cours du transport</p>
          <p><strong>6-</strong> A l’étranger avec transport du cours au Bénin</p>
          <p className="pl-4 italic">(Si à l’étranger préciser le pays : <span className="underline font-bold not-italic">{d.lieuPaysEtranger || "……………………."}</span>)</p>
          <p><strong>7-</strong> Autres à préciser : <span className="underline font-bold">{d.lieuAutrePrecision || "………………………………………………………………..…"}</span></p>
        </div>

        {/* Colonne 2 : Circonstances du décès */}
        <div className="p-2 space-y-1">
          <div className="font-bold text-xs mb-1">
            Circonstances du décès selon les parents : / {renderCasier(d.circonstancesCode, "35px")} /
            <p className="font-normal text-[9.5px] italic">(mettre le chiffre correspond en bas dans le casier)</p>
          </div>
          <p><strong>1-</strong> Grossesse/Avortement/Accouchement/Suites de couches</p>
          <p><strong>2-</strong> Maladie</p>
          <p><strong>3-</strong> Accident de route</p>
          <p><strong>4-</strong> Accident domestique</p>
          <p><strong>5-</strong> Mort subite</p>
          <p><strong>6-</strong> Violence (agression, arme à feu, suicide…)</p>
          <p><strong>7-</strong> Autres :</p>
          <p className="pl-4">Autres à préciser : <span className="underline font-bold">{d.circonstancesAutrePrecision || "…………………………………………………….……………."}</span></p>
        </div>
      </div>

      <div className="text-xs mb-3">
        <span>Cause probable du décès après l’autopsie verbale réalisée par l’ASCQ sous la supervision du MCC (utiliser la CIM 10) / </span>
        <span className="font-bold font-mono underline">{d.causeProbableCim10 || "____________"}</span>
        <span> /</span>
      </div>

      {/* SECTION 3 : INFORMATION SUR LE NOTIFICATEUR */}
      <div className="bg-[#FCE4D6] border border-black px-2 py-1 font-bold text-xs uppercase mb-2">
        INFORMATION SUR LE NOTIFICATEUR
      </div>

      <div className="text-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex-1 min-w-[280px]">
            <span>Nom prénom : </span>
            <span className="font-bold underline">{d.notificateurNom || "_________________________________________"}</span>
          </div>
          <div>
            <span>Titre : </span>
            <span className="font-bold underline">{d.notificateurTitre || "____________________________"}</span>
            <span className="text-[10px] text-slate-600"> (Liste des profils ciblés)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex-1 min-w-[280px]">
            <span>Structure : </span>
            <span className="font-bold underline">{d.notificateurStructure || "_____________________________________________"}</span>
          </div>
          <div>
            <span>Téléphone : </span>
            <span className="font-bold underline font-mono">{d.notificateurTelephone || "_________________________________________"}</span>
          </div>
        </div>

        <div className="pt-2">
          <span>Signature du notificateur :</span>
        </div>
      </div>
    </div>
  );
}
