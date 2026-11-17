"use client";

import React, { useState } from "react";
import { RefreshCw, Sparkles, CheckCircle } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

interface Props {
  variant?: "header" | "pill" | "card" | "compact";
  className?: string;
}

export default function BoutonVerifierMiseAJour({ variant = "pill", className = "" }: Props) {
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    setAnimating(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("verifier-maj-app"));
    }
    setTimeout(() => setAnimating(false), 2000);
  };

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all border border-white/15 active:scale-95 ${className}`}
        title="Vérifier si une nouvelle version de SantéCom Bénin est disponible sur le serveur"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-emerald-300 ${animating ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">Vérifier màj</span>
        <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/30 text-[9px] text-emerald-200">v{APP_VERSION}</span>
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#005c30] text-[10px] font-bold border border-emerald-200/60 transition-all ${className}`}
        title="Vérifier les mises à jour"
      >
        <RefreshCw className={`w-3 h-3 ${animating ? "animate-spin" : ""}`} />
        <span>v{APP_VERSION} • Màj</span>
      </button>
    );
  }

  if (variant === "card") {
    return (
      <div className={`p-4 rounded-3xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#005c30] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#005c30]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-xs text-slate-800">Version de l'application</h4>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-[#005c30] font-extrabold text-[10px]">
                v{APP_VERSION}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              SantéCom Bénin • Plannings officiels et fiches certifiés
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={animating}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${animating ? "animate-spin" : ""}`} />
          <span>{animating ? "Vérification..." : "Vérifier les mises à jour"}</span>
        </button>
      </div>
    );
  }

  // Variant "pill" par défaut
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={animating}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 active:scale-95 ${className}`}
      title="Vérifier manuellement les mises à jour"
    >
      <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${animating ? "animate-spin" : ""}`} />
      <span>Vérifier les mises à jour</span>
      <span className="text-[10px] text-slate-400 font-normal">v{APP_VERSION}</span>
    </button>
  );
}
