"use client";

import React, { useState, useEffect } from "react";
import { Trash2, AlertTriangle, X, Loader2, ShieldAlert } from "lucide-react";

interface BoutonSuppressionSecuriseeProps {
  titreElement: string;
  typeElement?: string; // Ex: "Fiche de notification", "Planning hebdomadaire", "Rapport"
  onConfirmerSuppression: () => Promise<void> | void;
  variant?: "icon" | "compact" | "full";
  label?: string;
  className?: string;
}

/**
 * Bouton de suppression sécurisée avec avertissement obligatoire
 * et compte à rebours strict de 8 à 0 secondes avant d'activer "Supprimer définitivement".
 */
export default function BoutonSuppressionSecurisee({
  titreElement,
  typeElement = "cet élément",
  onConfirmerSuppression,
  variant = "compact",
  label = "Supprimer",
  className = ""
}: BoutonSuppressionSecuriseeProps) {
  const [modalOuvert, setModalOuvert] = useState(false);
  const [compteur, setCompteur] = useState(8);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!modalOuvert) {
      setCompteur(8);
      setErreur(null);
      return;
    }

    setCompteur(8);
    const interval = setInterval(() => {
      setCompteur((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [modalOuvert]);

  const handleExecuterSuppression = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (compteur > 0 || suppressionEnCours) return;
    setSuppressionEnCours(true);
    setErreur(null);
    try {
      await onConfirmerSuppression();
      setModalOuvert(false);
    } catch (err: any) {
      setErreur(err?.message || "Erreur lors de la suppression.");
    } finally {
      setSuppressionEnCours(false);
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setModalOuvert(true);
          }}
          className={`p-2 rounded-xl text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center ${className}`}
          title={`Supprimer ${titreElement}`}
          aria-label={`Supprimer ${titreElement}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ) : variant === "full" ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setModalOuvert(true);
          }}
          className={`w-full py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition-all flex items-center justify-center gap-2 min-h-[44px] ${className}`}
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          <span>{label}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setModalOuvert(true);
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition-all active:scale-95 ${className}`}
          title={`Supprimer ${titreElement}`}
        >
          <Trash2 className="w-3.5 h-3.5 shrink-0" />
          <span>{label}</span>
        </button>
      )}

      {modalOuvert && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            if (!suppressionEnCours) setModalOuvert(false);
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 border-2 border-red-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    Sécurité Anti-Erreur
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">
                    Avertissement de suppression
                  </h3>
                </div>
              </div>
              <button
                type="button"
                disabled={suppressionEnCours}
                onClick={() => setModalOuvert(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-red-50/80 border border-red-200 space-y-1.5 text-xs text-red-950">
              <p className="font-bold flex items-center gap-1.5 text-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>Action irréversible : vous allez supprimer {typeElement}</span>
              </p>
              <p className="font-black text-slate-900 bg-white/90 px-3 py-2 rounded-xl border border-red-200 break-words">
                {titreElement}
              </p>
              <p className="text-[11px] text-red-800/90 leading-relaxed">
                Cette fiche ou ce planning sera retiré définitivement. Par mesure de sécurité, veuillez patienter jusqu'à la fin du décompte de <strong>8 à 0</strong> pour confirmer.
              </p>
            </div>

            {/* Indicateur visuel du compte à rebours 8 -> 0 */}
            <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-600">
                {compteur > 0
                  ? "Délai de sécurité avant activation :"
                  : "Bouton déverrouillé et opérationnel :"}
              </span>
              <span
                className={`w-10 h-10 rounded-full font-mono font-black text-base flex items-center justify-center transition-all ${
                  compteur > 0
                    ? "bg-amber-100 text-amber-900 border-2 border-amber-400 animate-pulse"
                    : "bg-red-600 text-white shadow-md scale-105"
                }`}
              >
                {compteur}
              </span>
            </div>

            {erreur && (
              <div className="p-3 rounded-xl bg-red-100 text-red-900 text-xs font-bold border border-red-300">
                {erreur}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={suppressionEnCours}
                onClick={() => setModalOuvert(false)}
                className="w-full sm:w-1/2 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition-all min-h-[48px]"
              >
                Annuler et conserver
              </button>

              <button
                type="button"
                disabled={compteur > 0 || suppressionEnCours}
                onClick={handleExecuterSuppression}
                className={`w-full sm:w-1/2 py-3 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 min-h-[48px] ${
                  compteur > 0
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 text-white shadow-lg active:scale-95"
                }`}
              >
                {suppressionEnCours ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : compteur > 0 ? (
                  <span>Patientez ({compteur}s)...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer définitivement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
