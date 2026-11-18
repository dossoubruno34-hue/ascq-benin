"use client";

import React from "react";

interface Props {
  departement?: string;
  commune?: string;
  arrondissement?: string;
  titreFormulaire?: string;
  afficherBandeauTerritorial?: boolean;
  className?: string;
}

export default function EnteteOfficiellePortrait({
  departement,
  commune,
  arrondissement,
  titreFormulaire,
  afficherBandeauTerritorial = true,
  className = "",
}: Props) {
  const dep = (departement || "ZOU").toUpperCase().trim();
  const com = (commune || "OUINHI").toUpperCase().trim();
  const arr = (arrondissement || "TOHOUÈS").toUpperCase().trim();

  return (
    <header className={`w-full text-slate-900 select-none ${className}`}>
      {/* 1. LIGNE D'EN-TÊTE SUPÉRIEURE (Bannière CNLS-TP à gauche, Contacts + Logo ASC à droite) */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 pb-1">
        {/* Gauche : Bannière officielle CNLS-TP / Présidence de la République */}
        <div className="flex items-center shrink-0">
          <img
            src="/banniere-cnlstp.png"
            alt="CNLS-TP — Présidence de la République du Bénin"
            className="h-12 sm:h-14 md:h-16 w-auto object-contain"
          />
        </div>

        {/* Droite : Téléphones + Email + Logo circulaire ASC Santé Communautaire */}
        <div className="flex items-center gap-2 sm:gap-3 text-right shrink-0">
          <div className="flex flex-col text-[10.5px] sm:text-[12px] leading-tight font-bold text-slate-900">
            <span className="font-mono tracking-tight font-extrabold text-slate-950">
              0141285050/0196830551
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-800 font-semibold lowercase">
              ascqbenin@gmail.com
            </span>
          </div>
          <img
            src="/logo-ascq.png"
            alt="ASC Santé Communautaire Bénin"
            className="h-11 sm:h-13 md:h-15 w-auto object-contain shrink-0"
          />
        </div>
      </div>

      {/* 2. LIGNE DE SÉPARATION VERTE NATIONALE (Bénin Green #008751) */}
      <div className="h-[2px] bg-[#008751] w-full mt-1 mb-2"></div>

      {/* 3. BANDEAU TERRITORIAL OFFICIEL (DÉPARTEMENT — COMMUNE — ARRONDISSEMENT) */}
      {afficherBandeauTerritorial && (
        <div className="text-center my-1.5 py-1 px-2 bg-blue-50/70 border border-blue-200 rounded-md">
          <span className="text-[10.5px] sm:text-[11px] font-black tracking-wide text-[#002B7F] uppercase">
            DÉPARTEMENT : <span className="underline font-black">{dep}</span> — COMMUNE :{" "}
            <span className="underline font-black">{com}</span> — ARRONDISSEMENT :{" "}
            <span className="underline font-black">{arr}</span>
          </span>
        </div>
      )}

      {/* 4. TITRE OFFICIEL DU FORMULAIRE (OPTIONNEL) */}
      {titreFormulaire && (
        <div className="text-center font-black text-xs sm:text-sm tracking-wide my-2 uppercase text-slate-900 py-1 bg-slate-100 rounded border border-slate-300">
          {titreFormulaire}
        </div>
      )}
    </header>
  );
}
