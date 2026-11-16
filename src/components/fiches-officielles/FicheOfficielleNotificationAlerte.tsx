"use client";

import React from "react";

interface Props {
  data?: {
    pointFocalNom?: string;
    telephone?: string;
    arrondissement?: string;
    commune?: string;
    zoneSanitaire?: string;
    dateNotification?: string;
    typeMaladieDescription?: string;
    dateSurvenueHeure?: string;
    dateDetectionHeure?: string;
    lieuProvenance?: string;
    nbPersonnesTouchees?: number | string;
    decesPresence?: string | boolean;
    nbDeces?: number | string;
    animauxImpliques?: string | boolean;
    evenementEnCours?: string | boolean;
    mesuresPrises?: string;
    signatureNom?: string;
  };
  isVierge?: boolean;
}

export default function FicheOfficielleNotificationAlerte({ data = {}, isVierge = false }: Props) {
  const d = isVierge ? {} : data;

  // Formater date notification sous forme JJ / MM / AAAA
  let dJour = "", dMois = "", dAnnee = "";
  if (d.dateNotification) {
    const parts = d.dateNotification.split("-");
    if (parts.length === 3) {
      dAnnee = parts[0];
      dMois = parts[1];
      dJour = parts[2];
    }
  }

  return (
    <div className="w-full max-w-[800px] mx-auto bg-white text-black p-4 sm:p-6 print:p-0 print:max-w-none text-xs leading-normal font-sans antialiased">
      {/* Titre officiel */}
      <div className="text-center mb-5">
        <h1 className="text-base sm:text-lg font-bold tracking-tight">
          Fiche de notification des alertes communautaires
        </h1>
        <p className="italic text-xs text-slate-800">
          ( A remplir par l’ASCQ)
        </p>
      </div>

      {/* Cadre officiel complet avec bordure extérieure */}
      <div className="border border-black">
        {/* Ligne d'en-tête obligatoire */}
        <div className="border-b border-black p-2 font-bold text-center sm:text-left text-xs bg-slate-50 print:bg-transparent">
          [Envoyer immédiatement à votre superviseur ou la formation sanitaire la plus proche]
        </div>

        {/* 1. Nom du point focal */}
        <div className="border-b border-black p-2">
          <span className="font-bold">1. Nom du point focal de la surveillance communautaire :</span>{" "}
          <span className="font-medium underline underline-offset-4">{d.pointFocalNom || ""}</span>
        </div>

        {/* 2. Coordonnées et localisation */}
        <div className="border-b border-black p-2 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-bold">2. Numéro de téléphone :</span>{" "}
              <span className="font-medium underline underline-offset-4">{d.telephone || "_________________________"}</span>
            </div>
            <div>
              <span className="font-bold">Arrondissement :</span>{" "}
              <span className="font-medium underline underline-offset-4">{d.arrondissement || "________________________"}</span>
            </div>
          </div>
          <div>
            <span className="font-bold">Commune :</span>{" "}
            <span className="font-medium underline underline-offset-4 mr-4">{d.commune || "_________________"}</span>
            <span className="font-bold">Zone Sanitaire :</span>{" "}
            <span className="font-medium underline underline-offset-4">{d.zoneSanitaire || "_____________________________________________________"}</span>
          </div>
        </div>

        {/* 3. Date de notification */}
        <div className="border-b border-black p-2 flex items-center gap-2 flex-wrap">
          <span className="font-bold">3. Date de notification (jour, mois, année) :</span>
          <div className="inline-flex items-center gap-1 font-mono font-bold text-xs">
            <span className="border border-black px-2 py-0.5 min-w-[28px] text-center">{dJour || "  "}</span>
            <span>/</span>
            <span className="border border-black px-2 py-0.5 min-w-[28px] text-center">{dMois || "  "}</span>
            <span>/</span>
            <span className="border border-black px-2 py-0.5 min-w-[42px] text-center">{dAnnee || "    "}</span>
          </div>
        </div>

        {/* 4. Type de maladie */}
        <div className="border-b border-black p-2">
          <span className="font-bold">4. Type de maladie ou affection/événement/alerte (veuillez décrire) :</span>{" "}
          <span className="font-medium">{d.typeMaladieDescription || ""}</span>
        </div>

        {/* 5. Date et Heure de survenue */}
        <div className="border-b border-black p-2">
          <span className="font-bold">5. Date (Jour/Mois/Année) ; Heure :</span>{" "}
          <span className="font-medium">{d.dateSurvenueHeure || ""}</span>
        </div>

        {/* 6. Date/heure de la détection */}
        <div className="border-b border-black p-2">
          <span className="font-bold">6. Date/heure de la détection (Date : Jour/Mois/Année) ; Heure :</span>{" "}
          <span className="font-medium">{d.dateDetectionHeure || ""}</span>
        </div>

        {/* 7. Lieu ou provenance */}
        <div className="border-b border-black p-2">
          <span className="font-bold">7. Lieu ou provenance du cas (Lieu : Village/Quartier, Arrondissement/Commune, Zone Sanitaire) :</span>
          <p className="font-medium mt-1 pl-4">{d.lieuProvenance || ""}</p>
        </div>

        {/* 8. Personnes touchées */}
        <div className="border-b border-black p-2">
          <span className="font-bold">8. Combien de personnes ont été touchées ?</span>{" "}
          <span className="font-medium underline underline-offset-4">{d.nbPersonnesTouchees ?? ""}</span>
        </div>

        {/* 9. Décès */}
        <div className="border-b border-black p-2">
          <span className="font-bold">9. Y a-t-il eu des décès ? Si oui, combien ?</span>{" "}
          <span className="font-medium">
            {d.decesPresence !== undefined
              ? (Number(d.nbDeces) > 0 ? `Oui (${d.nbDeces} décès)` : "Non")
              : ""}
          </span>
        </div>

        {/* 10. Animaux */}
        <div className="border-b border-black p-2">
          <span className="font-bold">10. Des animaux malades ou morts sont-ils impliqués ?</span>{" "}
          <span className="font-medium">
            {d.animauxImpliques !== undefined
              ? (d.animauxImpliques === true || d.animauxImpliques === "OUI" ? "Oui" : "Non")
              : ""}
          </span>
        </div>

        {/* 11. Événement en cours */}
        <div className="border-b border-black p-2">
          <span className="font-bold">11. L’événement est-il en cours au moment de cette notification ?</span>{" "}
          <span className="font-medium">
            {d.evenementEnCours !== undefined
              ? (d.evenementEnCours === true || d.evenementEnCours === "OUI" ? "Oui" : "Non")
              : ""}
          </span>
        </div>

        {/* 12. Quelles mesures ont été prises */}
        <div className="p-2 min-h-[90px]">
          <span className="font-bold">12. Quelles mesures ont été prises ?</span>
          <p className="font-medium mt-1 pl-4 whitespace-pre-wrap">{d.mesuresPrises || ""}</p>
        </div>
      </div>

      {/* Signature en bas à droite */}
      <div className="mt-8 flex justify-end">
        <div className="text-center min-w-[200px]">
          <p className="font-bold text-xs mb-8">Nom et signature</p>
          <p className="font-bold text-xs underline underline-offset-4">
            {d.signatureNom || "___________________________"}
          </p>
        </div>
      </div>
    </div>
  );
}
