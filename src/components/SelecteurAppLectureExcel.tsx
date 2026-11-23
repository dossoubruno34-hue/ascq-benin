"use client";

import React, { useState, useEffect } from "react";
import { FileSpreadsheet, ExternalLink, Download, MessageCircle, X, Check, HardDrive } from "lucide-react";

export interface ExcelReadyDetail {
  blob: Blob;
  blobUrl: string;
  nomFichier: string;
  titreDocument?: string;
}

/**
 * Modale / Barre globale permettant de lire directement un fichier Excel (.xls / .xlsx / .csv)
 * avec les applications compatibles de l'appareil (Microsoft Excel, Google Sheets, WPS Office, Drive, WhatsApp)
 */
export default function SelecteurAppLectureExcel() {
  const [fichier, setFichier] = useState<ExcelReadyDetail | null>(null);
  const [statut, setStatut] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<ExcelReadyDetail>;
      if (custom?.detail) {
        setFichier(custom.detail);
        setStatut(null);
      }
    };
    window.addEventListener("santecom_excel_ready", handler as EventListener);
    return () => window.removeEventListener("santecom_excel_ready", handler as EventListener);
  }, []);

  if (!fichier) return null;

  const ouvrirAvecAppCompatible = async (cibleLabel: string) => {
    // 1. Utiliser l'API Web Share Files pour ouvrir directement dans Excel / Google Sheets / WPS Office / Drive sur mobile
    if (typeof navigator !== "undefined" && navigator.canShare) {
      try {
        const file = new File([fichier.blob], fichier.nomFichier, {
          type: fichier.blob.type || "application/vnd.ms-excel",
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: fichier.nomFichier,
            text: `Lire ${fichier.nomFichier} avec ${cibleLabel}`,
          });
          setStatut(`Ouvert avec ${cibleLabel}`);
          return;
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }

    // 2. Fallback PC / navigateur : ouverture directe ou téléchargement pour ouverture automatique par le système
    const a = document.createElement("a");
    a.href = fichier.blobUrl;
    a.download = fichier.nomFichier;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch {}
    }, 300);
    setStatut(`Fichier prêt pour ${cibleLabel} (${fichier.nomFichier})`);
  };

  const partagerWhatsApp = async () => {
    if (typeof navigator !== "undefined" && navigator.canShare) {
      try {
        const file = new File([fichier.blob], fichier.nomFichier, {
          type: fichier.blob.type || "application/vnd.ms-excel",
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: fichier.nomFichier,
            text: `📊 ${fichier.titreDocument || fichier.nomFichier} — SantéCom Bénin`,
          });
          return;
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }
    ouvrirAvecAppCompatible("WhatsApp");
    const texte = encodeURIComponent(`📊 *SantéCom Bénin* — ${fichier.nomFichier}`);
    window.open(`https://wa.me/?text=${texte}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-lg z-[105] bg-white rounded-3xl border-2 border-[#008751] shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#005c30] flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#008751]">
              Fichier Excel prêt
            </p>
            <h3 className="text-xs font-black text-slate-900 truncate">{fichier.nomFichier}</h3>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setFichier(null)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {statut && (
        <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-[#008751]" />
          <span>{statut}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => ouvrirAvecAppCompatible("Excel / WPS / Calc")}
          className="py-2.5 px-2.5 rounded-xl bg-[#1D8F5A] hover:bg-[#167347] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Lire (Excel)</span>
        </button>

        <button
          type="button"
          onClick={() => ouvrirAvecAppCompatible("Google Sheets / Drive")}
          className="py-2.5 px-2.5 rounded-xl bg-[#0E8A94] hover:bg-[#0b6f77] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
        >
          <HardDrive className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Google Sheets</span>
        </button>

        <button
          type="button"
          onClick={partagerWhatsApp}
          className="py-2.5 px-2.5 rounded-xl bg-[#128C7E] hover:bg-[#075E54] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => ouvrirAvecAppCompatible("Appareil")}
          className="py-2.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Télécharger</span>
        </button>
      </div>
    </div>
  );
}
