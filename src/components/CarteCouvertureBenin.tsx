"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Maximize2, X, MapPin, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import beninMapData from "@/data/benin-communes-map.json";

export interface CouvertureItem {
  commune_id: string;
  nombre_ascq: number;
}

interface Props {
  couverture: CouvertureItem[];
  simulation100?: boolean;
}

export default function CarteCouvertureBenin({ couverture = [], simulation100 = false }: Props) {
  const [selectedCommune, setSelectedCommune] = useState<{
    id: string;
    nom: string;
    nomAffiche: string;
    count: number;
    center: [number, number];
  } | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTest100, setIsTest100] = useState(simulation100);

  // Détection d'un paramètre URL de test ?couverture=100 ou ?test100=true
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("couverture") === "100" || params.get("test100") === "true") {
        setIsTest100(true);
      }
    }
  }, []);

  // Fermer la modal en appuyant sur Echap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
        setSelectedCommune(null);
      }
    };
    if (isFullscreen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Dictionnaire de couverture { [commune_id]: nombre_ascq }
  const countsMap = useMemo(() => {
    const map = new Map<string, number>();
    if (isTest100) {
      // Simulation 100% : toutes les communes ont au moins 1 ASCQ
      beninMapData.communes.forEach((c) => {
        map.set(c.id, 1);
      });
      return map;
    }
    couverture.forEach((item) => {
      if (item.commune_id) {
        map.set(item.commune_id, item.nombre_ascq || 0);
      }
    });
    return map;
  }, [couverture, isTest100]);

  // Calcul des statistiques
  const totalCommunes = beninMapData.totalCommunes || 77;
  const nbCouvertes = useMemo(() => {
    let count = 0;
    beninMapData.communes.forEach((c) => {
      if ((countsMap.get(c.id) || 0) > 0) count++;
    });
    return count;
  }, [countsMap]);

  const pourcentage = Math.round((nbCouvertes / totalCommunes) * 100);

  // Si le fichier de données est absent ou corrompu, ne rien afficher (sécurité dégradation propre)
  if (!beninMapData || !beninMapData.communes || beninMapData.communes.length === 0) {
    return null;
  }

  const handleCommuneClick = (c: (typeof beninMapData.communes)[0]) => {
    const count = countsMap.get(c.id) || 0;
    setSelectedCommune({
      id: c.id,
      nom: c.nom,
      nomAffiche: c.nomAffiche,
      count,
      center: c.center as [number, number],
    });
  };

  return (
    <>
      <section 
        className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3"
        aria-label="Carte de la couverture nationale des ASCQ au Bénin"
      >
        {/* En-tête de la carte */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0e7f47] animate-pulse motion-reduce:animate-none" />
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                Notre couverture nationale
              </h2>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              <span className="font-extrabold text-[#0e7f47]">{nbCouvertes}</span> / {totalCommunes} communes couvertes
              <span className="text-slate-400 font-normal ml-1.5">({pourcentage}%)</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-[#0e7f47] text-slate-700 text-[11px] font-bold border border-slate-200/80 transition-colors shadow-2xs active:scale-95"
            title="Agrandir la carte du Bénin"
            aria-label="Agrandir la carte"
          >
            <Maximize2 className="w-3 h-3 text-[#0e7f47]" />
            <span>Agrandir</span>
          </button>
        </div>

        {/* Barre de progression verte */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-[#008751] via-[#0e7f47] to-[#10b981] transition-all duration-700 ease-out"
            style={{ width: `${Math.max(2, pourcentage)}%` }}
            role="progressbar"
            aria-valuenow={pourcentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        {/* Conteneur SVG compact (hauteur max adaptée pour ~300px sur mobile) */}
        <div className="relative w-full h-[230px] sm:h-[250px] flex items-center justify-center bg-[#f8fafc] rounded-2xl border border-slate-150 p-2 overflow-hidden select-none">
          <svg
            viewBox={beninMapData.viewBox}
            className="w-full h-full max-h-[220px] sm:max-h-[240px] drop-shadow-xs transition-transform"
            role="img"
            aria-label="Carte vectorielle des 77 communes du Bénin"
          >
            <g id="communes-benin" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
              {beninMapData.communes.map((c) => {
                const count = countsMap.get(c.id) || 0;
                const isCovered = count > 0;
                const isSelected = selectedCommune?.id === c.id;

                return (
                  <path
                    key={c.id}
                    id={`commune-${c.id}`}
                    d={c.path}
                    onClick={() => handleCommuneClick(c)}
                    onMouseEnter={() => handleCommuneClick(c)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${c.nomAffiche}: ${isCovered ? `${count} ASCQ présent(s)` : "Pas encore couverte"}`}
                    className={`cursor-pointer transition-colors duration-200 focus:outline-hidden ${
                      isCovered
                        ? "fill-[#0e7f47] hover:fill-[#0b6d3c] active:fill-[#095730]"
                        : "fill-[#e2e8f0] hover:fill-[#cbd5e1] active:fill-[#94a3b8]"
                    } ${
                      isSelected
                        ? "stroke-[#f59e0b] stroke-[2.2] filter drop-shadow-md brightness-110"
                        : "stroke-[#ffffff]"
                    } ${
                      isCovered
                        ? "animate-pulse-slow motion-reduce:animate-none"
                        : ""
                    }`}
                  />
                );
              })}
            </g>
          </svg>

          {/* Mini-infobulle contextuelle lors d'un tap / clic sur mobile */}
          {selectedCommune && (
            <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200/90 shadow-md text-xs flex items-center justify-between gap-2 z-10 animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-[#0e7f47] shrink-0" />
                <div className="truncate">
                  <p className="font-extrabold text-slate-900 leading-tight truncate">
                    {selectedCommune.nomAffiche}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedCommune.count > 0 ? (
                      <span className="text-[#0e7f47] font-bold">
                        ✓ {selectedCommune.count} ASCQ présent{selectedCommune.count > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-slate-500">Pas encore couverte</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCommune(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg shrink-0"
                aria-label="Fermer l'infobulle"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Légende minimale à 2 pastilles */}
        <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-slate-600 font-semibold border-t border-slate-100">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0e7f47] shadow-2xs" />
              <span>Couverte ({nbCouvertes})</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e2e8f0] border border-slate-300 shadow-2xs" />
              <span>À couvrir ({totalCommunes - nbCouvertes})</span>
            </span>
          </div>

          <span className="text-[10px] text-slate-400 font-normal">
            Touchez une commune
          </span>
        </div>
      </section>

      {/* Modal Plein Écran pour la présentation */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Vue agrandie de la carte du Bénin"
        >
          <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* En-tête Modal */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0e7f47]" />
                  <span>Couverture Nationale des ASCQ au Bénin</span>
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  {nbCouvertes} sur {totalCommunes} communes couvertes ({pourcentage}%)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corps Modal */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Barre de recherche rapide de commune */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Rechercher une commune (ex: Ouinhi, Cové, Za-Kpota)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0e7f47]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-slate-400 hover:text-slate-600 px-2"
                  >
                    Effacer
                  </button>
                )}
              </div>

              {/* Grande carte SVG */}
              <div className="relative w-full h-[52vh] min-h-[340px] bg-slate-50 rounded-2xl border border-slate-150 flex items-center justify-center p-3">
                <svg
                  viewBox={beninMapData.viewBox}
                  className="w-full h-full max-h-[50vh] object-contain drop-shadow-sm"
                  role="img"
                >
                  <g id="communes-benin-large" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">
                    {beninMapData.communes.map((c) => {
                      const count = countsMap.get(c.id) || 0;
                      const isCovered = count > 0;
                      const isSelected = selectedCommune?.id === c.id;
                      const isQueried = searchQuery.trim().length > 1 &&
                        (c.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.nomAffiche.toLowerCase().includes(searchQuery.toLowerCase()));

                      return (
                        <path
                          key={`large-${c.id}`}
                          d={c.path}
                          onClick={() => handleCommuneClick(c)}
                          onMouseEnter={() => handleCommuneClick(c)}
                          className={`cursor-pointer transition-all duration-200 ${
                            isCovered
                              ? "fill-[#0e7f47] hover:fill-[#0b6d3c]"
                              : "fill-[#e2e8f0] hover:fill-[#cbd5e1]"
                          } ${
                            isSelected || isQueried
                              ? "stroke-[#f59e0b] stroke-[2.5] filter drop-shadow-md brightness-110"
                              : "stroke-[#ffffff]"
                          }`}
                        />
                      );
                    })}
                  </g>
                </svg>

                {/* Infobulle détaillée dans la modal */}
                {selectedCommune && (
                  <div className="absolute top-3 right-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-lg text-xs space-y-1 min-w-[180px] animate-fade-in">
                    <p className="font-extrabold text-slate-900 text-sm">
                      {selectedCommune.nomAffiche}
                    </p>
                    <p className="text-[11px] font-semibold">
                      {selectedCommune.count > 0 ? (
                        <span className="text-[#0e7f47] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{selectedCommune.count} ASCQ validé{selectedCommune.count > 1 ? "s" : ""}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Aucun ASCQ validé</span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Bouton de simulation 100% discret (pour la démonstration au Bureau National) */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setIsTest100(!isTest100)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {isTest100 ? "Revenir aux données réelles (4 ASCQ)" : "Simuler Bénin 100% couvert (Démo)"}
                  </span>
                </button>

                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="inline-flex items-center gap-1 text-[#0e7f47]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0e7f47]" />
                    <span>Couverte ({nbCouvertes})</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#e2e8f0] border border-slate-300" />
                    <span>À couvrir ({totalCommunes - nbCouvertes})</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
