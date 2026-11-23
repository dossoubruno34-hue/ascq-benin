"use client";

import React, { useState } from "react";
import { FileText, Share2, ExternalLink, Download, MessageCircle, HardDrive, Check } from "lucide-react";

interface SelecteurAppLecturePdfProps {
  blobUrl: string | null;
  pdfBytes?: Uint8Array | null;
  nomFichier: string;
  titreDocument?: string;
}

/**
 * Barre de sélection d'application pour lire ou partager un fichier PDF
 * (Lecteur PDF / Adobe / WPS, Google Drive, WhatsApp, Visionneuse système)
 */
export default function SelecteurAppLecturePdf({
  blobUrl,
  pdfBytes,
  nomFichier,
  titreDocument = "Document officiel SantéCom Bénin"
}: SelecteurAppLecturePdfProps) {
  const [statutAction, setStatutAction] = useState<string | null>(null);

  if (!blobUrl && !pdfBytes) return null;

  const obtenirBlobUrl = (): string => {
    if (blobUrl) return blobUrl;
    if (pdfBytes) {
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      return URL.createObjectURL(blob);
    }
    return "";
  };

  const obtenirBlob = async (): Promise<Blob | null> => {
    if (pdfBytes) {
      return new Blob([pdfBytes as any], { type: "application/pdf" });
    }
    if (blobUrl) {
      try {
        const res = await fetch(blobUrl);
        return await res.blob();
      } catch {
        return null;
      }
    }
    return null;
  };

  // 1. Lire directement avec Lecteur PDF natif (Adobe Acrobat, WPS, Lecteur PDF Android/iOS)
  const handleOuvrirLecteurPdf = async () => {
    const url = obtenirBlobUrl();
    const blob = await obtenirBlob();

    if (blob && typeof navigator !== "undefined" && navigator.canShare) {
      try {
        const file = new File([blob], nomFichier, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: nomFichier,
            text: `Lire ${nomFichier} avec Lecteur PDF / Adobe / WPS`,
          });
          setStatutAction("Ouvert dans le lecteur PDF");
          return;
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      setStatutAction("Ouvert en lecture directe");
    }
  };

  // 2. Lire directement avec Google Drive (Visionneuse PDF Drive sur mobile / navigateur)
  const handleOuvrirGoogleDrive = async () => {
    const url = obtenirBlobUrl();
    const blob = await obtenirBlob();

    if (blob && typeof navigator !== "undefined" && navigator.canShare) {
      try {
        const file = new File([blob], nomFichier, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: nomFichier,
            text: `Lire ${nomFichier} avec Google Drive PDF Viewer`,
          });
          setStatutAction("Ouvert avec Google Drive");
          return;
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }

    // Sur PC : ouvrir directement le PDF pour lecture immédiate (sans forcer uniquement le téléchargement)
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      setStatutAction("Document ouvert pour lecture directe");
      setTimeout(() => setStatutAction(null), 4000);
    }
  };

  // 3. Partager / Lire via WhatsApp
  const handlePartagerWhatsApp = async () => {
    if (pdfBytes && typeof navigator !== "undefined" && navigator.canShare) {
      try {
        const file = new File([pdfBytes as any], nomFichier, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: nomFichier,
            text: `📄 ${titreDocument} (${nomFichier}) — SantéCom Bénin`
          });
          return;
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }

    // Fallback universel : télécharger le fichier puis ouvrir WhatsApp avec le message pré-rempli
    const url = obtenirBlobUrl();
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = nomFichier;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch {}
      }, 400);
    }
    const texteWa = encodeURIComponent(`📄 *SantéCom Bénin* — ${titreDocument} (${nomFichier}). Le fichier PDF a été généré et téléchargé.`);
    window.open(`https://wa.me/?text=${texteWa}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-slate-100/90 border border-slate-200 rounded-2xl p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5 text-[#005c30]" />
          <span>Ouvrir ou lire avec une application :</span>
        </span>
        {statutAction && (
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>{statutAction}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={handleOuvrirLecteurPdf}
          className="py-2 px-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1.5 min-h-[40px]"
          title="Ouvrir avec Lecteur PDF, Adobe Acrobat ou WPS Office"
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">PDF Reader</span>
        </button>

        <button
          type="button"
          onClick={handleOuvrirGoogleDrive}
          className="py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1.5 min-h-[40px]"
          title="Ouvrir ou enregistrer avec Google Drive"
        >
          <HardDrive className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Google Drive</span>
        </button>

        <button
          type="button"
          onClick={handlePartagerWhatsApp}
          className="py-2 px-2.5 rounded-xl bg-[#128C7E] hover:bg-[#075E54] text-white font-bold text-xs shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1.5 min-h-[40px]"
          title="Envoyer ou ouvrir le PDF dans WhatsApp"
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const url = obtenirBlobUrl();
            if (url) window.open(url, "_blank", "noopener,noreferrer");
          }}
          className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1.5 min-h-[40px]"
          title="Visualiser en plein écran dans le navigateur"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Plein écran</span>
        </button>
      </div>
    </div>
  );
}
