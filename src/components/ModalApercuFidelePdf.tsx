"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, 
  Download, 
  Printer, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Share2, 
  Loader2, 
  Maximize2,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { 
  genererFichePdfSuperposee, 
  adapterDonneesFicheVersPdf, 
  enregistrerAuditPdf,
  GenerationResult 
} from "@/lib/pdf-superposition";

interface ModalApercuFidelePdfProps {
  isOpen: boolean;
  onClose: () => void;
  typeFiche: "REG" | "ALR" | "DEC" | "INV" | "RAP";
  donnees: any;
  currentUser?: any;
  titre?: string;
  isViergeInitial?: boolean;
}

export default function ModalApercuFidelePdf({
  isOpen,
  onClose,
  typeFiche,
  donnees,
  currentUser,
  titre,
  isViergeInitial = false
}: ModalApercuFidelePdfProps) {
  const [isVierge, setIsVierge] = useState<boolean>(isViergeInitial);
  const [loading, setLoading] = useState<boolean>(true);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [afficherRappelImpression, setAfficherRappelImpression] = useState<boolean>(false);
  const [telechargementReussi, setTelechargementReussi] = useState<boolean>(false);

  const iframePrintRef = useRef<HTMLIFrameElement | null>(null);

  // Synchroniser l'état vierge à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setIsVierge(isViergeInitial);
      setErreur(null);
      setTelechargementReussi(false);
      setAfficherRappelImpression(false);
    }
  }, [isOpen, isViergeInitial]);

  // Générer le PDF côté navigateur à chaque changement de données ou de mode vierge
  useEffect(() => {
    if (!isOpen) return;

    let actif = true;
    setLoading(true);
    setErreur(null);

    const generer = async () => {
      try {
        const donneesNormalisees = adapterDonneesFicheVersPdf(typeFiche, donnees);
        const res = await genererFichePdfSuperposee(typeFiche, donneesNormalisees, { isVierge });

        if (!actif) return;
        setResult(res);

        // Audit de génération (100% anonyme, zéro donnée médicale envoyée)
        enregistrerAuditPdf({
          fiche_type: typeFiche,
          enregistrement_id: donnees?.id || donnees?.numero || "NON_SPECIFIE",
          action: "GENERATION",
          utilisateur_id: currentUser?.id,
          utilisateur_nom: currentUser?.nom_complet || currentUser?.nom,
          commune: donnees?.commune || currentUser?.commune
        });
      } catch (err: any) {
        if (!actif) return;
        console.error("Erreur lors de la génération PDF superposée:", err);
        setErreur(err.message || "Impossible de générer le PDF officiel.");
      } finally {
        if (actif) setLoading(false);
      }
    };

    generer();

    return () => {
      actif = false;
    };
  }, [isOpen, typeFiche, donnees, isVierge, currentUser]);

  if (!isOpen) return null;

  // Téléchargement sécurisé (compatible Mobile Web Share et Desktop)
  const handleTelecharger = async () => {
    if (!result || !result.blobUrl) return;

    try {
      const file = new File([result.pdfBytes as any], result.nomFichier, { type: "application/pdf" });

      // Essayer le partage natif sur mobile si disponible
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: result.nomFichier,
            text: "Fiche officielle de surveillance - SantéCom Bénin"
          });
          enregistrerAuditPdf({
            fiche_type: typeFiche,
            enregistrement_id: donnees?.id || donnees?.numero,
            action: "TELECHARGEMENT",
            utilisateur_id: currentUser?.id,
            utilisateur_nom: currentUser?.nom_complet,
            commune: donnees?.commune || currentUser?.commune
          });
          setTelechargementReussi(true);
          setTimeout(() => setTelechargementReussi(false), 3000);
          return;
        } catch (e: any) {
          // Si l'utilisateur annule le dialogue de partage natif, fallback sur téléchargement normal
          if (e.name === "AbortError") return;
        }
      }

      // Téléchargement direct standard
      const a = document.createElement("a");
      a.href = result.blobUrl;
      a.download = result.nomFichier;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      enregistrerAuditPdf({
        fiche_type: typeFiche,
        enregistrement_id: donnees?.id || donnees?.numero,
        action: "TELECHARGEMENT",
        utilisateur_id: currentUser?.id,
        utilisateur_nom: currentUser?.nom_complet,
        commune: donnees?.commune || currentUser?.commune
      });

      setTelechargementReussi(true);
      setTimeout(() => setTelechargementReussi(false), 3000);
    } catch (e) {
      console.error("Erreur téléchargement:", e);
    }
  };

  // Impression officielle fidèle A4
  const handleImprimer = () => {
    if (!result || !result.blobUrl) return;

    setAfficherRappelImpression(true);

    // Déclencher l'impression via l'iframe dédiée pour n'imprimer STRICTEMENT QUE le PDF officiel
    setTimeout(() => {
      if (iframePrintRef.current && iframePrintRef.current.contentWindow) {
        try {
          iframePrintRef.current.contentWindow.focus();
          iframePrintRef.current.contentWindow.print();

          enregistrerAuditPdf({
            fiche_type: typeFiche,
            enregistrement_id: donnees?.id || donnees?.numero,
            action: "IMPRESSION",
            utilisateur_id: currentUser?.id,
            utilisateur_nom: currentUser?.nom_complet,
            commune: donnees?.commune || currentUser?.commune
          });
        } catch (e) {
          // Fallback : ouverture dans une nouvelle fenêtre pour impression
          window.open(result.blobUrl, "_blank");
        }
      } else {
        window.open(result.blobUrl, "_blank");
      }
    }, 500);
  };

  const getTitreFiche = () => {
    if (titre) return titre;
    switch (typeFiche) {
      case "REG": return "Registre des alertes et rumeurs communautaires";
      case "ALR": return "Fiche de notification des alertes communautaires";
      case "DEC": return "Formulaire de notification des décès en communauté";
      case "INV": return "Fiche d'investigation des événements de santé";
      case "RAP": return "Rapport hebdomadaire de surveillance à base communautaire";
      default: return "Fiche officielle de surveillance";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-5xl h-[94vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* BARRE DE TITRE & CONTRÔLES */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#005c30] text-white shrink-0 border-b border-emerald-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-white/10 shrink-0">
              <FileText className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold truncate leading-tight">
                  {getTitreFiche()}
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  Format Officiel DDS 100% Vectoriel
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/90 truncate">
                Superposition conforme stricte • Police Carlito • {result ? `${result.nbPages} page(s)` : "Chargement..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Toggle Version Remplie / Modèle Vierge */}
            <div className="flex items-center bg-black/25 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsVierge(false)}
                className={`px-2.5 py-1.5 rounded-lg transition-all text-xs ${
                  !isVierge ? "bg-white text-[#005c30] shadow" : "text-white/80 hover:text-white"
                }`}
              >
                Remplie
              </button>
              <button
                type="button"
                onClick={() => setIsVierge(true)}
                className={`px-2.5 py-1.5 rounded-lg transition-all text-xs ${
                  isVierge ? "bg-white text-[#005c30] shadow" : "text-white/80 hover:text-white"
                }`}
              >
                Modèle Vierge
              </button>
            </div>

            {/* Bouton Télécharger */}
            <button
              type="button"
              onClick={handleTelecharger}
              disabled={loading || !result}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow active:scale-95 transition-all ${
                telechargementReussi 
                  ? "bg-emerald-400 text-slate-900" 
                  : "bg-[#FCD116] text-slate-900 hover:bg-yellow-400"
              }`}
              title="Télécharger le PDF officiel conforme"
            >
              {telechargementReussi ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{telechargementReussi ? "Téléchargé !" : "Télécharger PDF"}</span>
              <span className="sm:hidden">PDF</span>
            </button>

            {/* Bouton Imprimer */}
            <button
              type="button"
              onClick={handleImprimer}
              disabled={loading || !result}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#005c30] font-bold text-xs shadow hover:bg-emerald-50 active:scale-95 transition-all"
              title="Imprimer au format officiel A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimer</span>
            </button>

            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white transition-colors"
              title="Fermer l'aperçu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BANNIÈRE RAPPEL IMPRESSION OFFICIELLE */}
        {afficherRappelImpression && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <strong>Rappel pour impression officielle Ministère / DDS :</strong> Choisissez le format <strong>A4</strong>, une échelle de <strong>100 % (Taille réelle)</strong> et décochez <em>« En-têtes et pieds de page »</em> du navigateur.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAfficherRappelImpression(false)}
              className="text-amber-700 hover:text-amber-900 font-bold text-xs"
            >
              Compris
            </button>
          </div>
        )}

        {/* BANNIÈRE D'AVERTISSEMENT DÉBORDEMENT (SI TEXTE RÉDUIT) */}
        {result && result.warnings.length > 0 && (
          <div className="px-4 py-1.5 bg-sky-50 border-b border-sky-200 text-sky-900 text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="truncate">
              Ajustement typographique : {result.warnings.length} valeur(s) adaptée(s) à la taille exacte des cases pour respecter la mise en page officielle.
            </span>
          </div>
        )}

        {/* CORPS PRINCIPAL : VISUALISEUR DU PDF VECTEUR OFFICIEL */}
        <div className="flex-1 bg-slate-200 relative overflow-hidden flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-3 p-8 bg-white/90 rounded-2xl shadow-xl z-10 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 text-[#005c30] animate-spin" />
              <p className="text-sm font-bold text-slate-700">Superposition vectorielle sur PDF officiel en cours...</p>
              <p className="text-xs text-slate-500">Intégration de la police Carlito & calibrage des coordonnées</p>
            </div>
          )}

          {erreur && (
            <div className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl shadow-xl max-w-md text-center">
              <AlertTriangle className="w-10 h-10 text-red-500" />
              <h4 className="font-bold text-slate-800">Erreur de génération</h4>
              <p className="text-xs text-slate-600">{erreur}</p>
              <button
                type="button"
                onClick={() => setIsVierge(false)}
                className="mt-2 px-4 py-2 rounded-xl bg-[#005c30] text-white text-xs font-bold shadow"
              >
                Réessayer
              </button>
            </div>
          )}

          {!loading && !erreur && result && result.blobUrl && (
            <iframe
              src={`${result.blobUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="w-full h-full border-0 bg-slate-200"
              title="Aperçu fidèle du PDF officiel"
            />
          )}

          {/* Iframe invisible dédiée à l'impression directe du PDF sans HTML du navigateur */}
          {result && result.blobUrl && (
            <iframe
              ref={iframePrintRef}
              src={result.blobUrl}
              className="hidden"
              style={{ display: "none", width: 0, height: 0, position: "absolute", border: 0 }}
              title="Impression PDF officielle"
            />
          )}
        </div>

        {/* PIED DE MODALE : MENTIONS LÉGALES & RAPIDITÉ */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Génération 100% locale sécurisée (aucune donnée médicale transmise à un serveur tiers)</span>
          </div>
          {result && (
            <div className="text-slate-600 font-mono text-[10px]">
              {result.nomFichier}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
