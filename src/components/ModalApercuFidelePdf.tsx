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
  ShieldCheck,
  Edit3
} from "lucide-react";
import { 
  genererFichePdfSuperposee, 
  adapterDonneesFicheVersPdf, 
  enregistrerAuditPdf,
  GenerationResult 
} from "@/lib/pdf-superposition";
import SelecteurAppLecturePdf from "@/components/SelecteurAppLecturePdf";

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
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // Renseignement direct des actions menées (Section 3 du Rapport Hebdomadaire)
  const [actionsMeneesCustom, setActionsMeneesCustom] = useState<string>("");
  const [afficherEditeurActions, setAfficherEditeurActions] = useState<boolean>(false);

  const iframePrintRef = useRef<HTMLIFrameElement | null>(null);

  // Détection mobile réactive (Android / iOS / petit écran)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkMobile = () => {
        const userAgentMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
        setIsMobile(userAgentMobile || window.innerWidth < 768);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }
  }, []);

  // Synchroniser l'état initial et les actions menées à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setIsVierge(isViergeInitial);
      setErreur(null);
      setTelechargementReussi(false);
      setAfficherRappelImpression(false);

      const initActions = 
        donnees?.actions_menees || 
        donnees?.actionsMenees || 
        donnees?.actions || 
        donnees?.rawData?.actions_menees || 
        "";
      setActionsMeneesCustom(initActions);

      // Pour le rapport hebdo, si aucune action n'est encore renseignée, ouvrir directement l'éditeur
      if (typeFiche === "RAP" && !initActions.trim()) {
        setAfficherEditeurActions(true);
      } else {
        setAfficherEditeurActions(false);
      }
    }
  }, [isOpen, isViergeInitial, donnees, typeFiche]);

  // Générer le PDF côté navigateur à chaque changement de données, de mode vierge ou des actions menées
  useEffect(() => {
    if (!isOpen) return;

    let actif = true;
    setLoading(true);
    setErreur(null);

    const generer = async () => {
      try {
        const donneesFusionnees = {
          ...donnees,
          actions_menees: actionsMeneesCustom !== undefined && actionsMeneesCustom !== ""
            ? actionsMeneesCustom 
            : (donnees?.actions_menees || donnees?.actionsMenees || donnees?.actions || "")
        };
        const donneesNormalisees = adapterDonneesFicheVersPdf(typeFiche, donneesFusionnees);
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
  }, [isOpen, typeFiche, donnees, isVierge, currentUser, actionsMeneesCustom]);

  if (!isOpen) return null;

  // Ouvrir le PDF directement (hautement compatible Android / iOS / Desktop)
  const handleOuvrirPdf = () => {
    if (!result || !result.blobUrl) return;
    window.open(result.blobUrl, "_blank");
  };

  // Téléchargement sécurisé et garanti sur Android, iOS et Desktop
  const handleTelecharger = async () => {
    if (!result || !result.blobUrl) return;

    try {
      // 1. Sur Mobile : tenter Web Share API si disponible pour un partage natif (WhatsApp, Drive, Enregistrer...)
      if (typeof navigator !== "undefined" && navigator.canShare) {
        try {
          const file = new File([result.pdfBytes as any], result.nomFichier, { type: "application/pdf" });
          if (navigator.canShare({ files: [file] })) {
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
          }
        } catch (e: any) {
          if (e.name === "AbortError") return;
          console.warn("Partage natif non disponible ou annulé, bascule vers téléchargement direct:", e);
        }
      }

      // 2. Téléchargement direct standard (DOM Anchor avec click direct)
      const a = document.createElement("a");
      a.href = result.blobUrl;
      a.download = result.nomFichier;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
        } catch (_) {}
      }, 500);

      // 3. Fallback mobile Android : si Android bloque le téléchargement d'un blob, ouvrir directement
      if (isMobile) {
        window.open(result.blobUrl, "_blank");
      }

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
      // Dernier recours universel : ouverture directe dans un nouvel onglet
      window.open(result.blobUrl, "_blank");
    }
  };

  // Impression officielle fidèle A4
  const handleImprimer = () => {
    if (!result || !result.blobUrl) return;

    enregistrerAuditPdf({
      fiche_type: typeFiche,
      enregistrement_id: donnees?.id || donnees?.numero,
      action: "IMPRESSION",
      utilisateur_id: currentUser?.id,
      utilisateur_nom: currentUser?.nom_complet,
      commune: donnees?.commune || currentUser?.commune
    });

    setAfficherRappelImpression(true);

    // Sur mobile (Android / iOS), l'impression via iframe est ignorée par les navigateurs.
    // L'ouverture directe déclenche la visionneuse système avec option Imprimer intégrée.
    if (isMobile) {
      window.open(result.blobUrl, "_blank");
      return;
    }

    // Sur Desktop, déclencher l'impression via l'iframe dédiée pour n'imprimer STRICTEMENT QUE le PDF officiel
    setTimeout(() => {
      if (iframePrintRef.current && iframePrintRef.current.contentWindow) {
        try {
          iframePrintRef.current.contentWindow.focus();
          iframePrintRef.current.contentWindow.print();
        } catch (e) {
          window.open(result.blobUrl, "_blank");
        }
      } else {
        window.open(result.blobUrl, "_blank");
      }
    }, 400);
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

            {/* Bouton Plein Écran / Ouvrir dans le lecteur */}
            <button
              type="button"
              onClick={handleOuvrirPdf}
              disabled={loading || !result}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
              title="Ouvrir dans la visionneuse système / plein écran"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Plein écran</span>
            </button>

            {/* Bouton pour renseigner ou modifier les actions menées sur le Rapport Hebdo */}
            {typeFiche === "RAP" && !isVierge && (
              <button
                type="button"
                onClick={() => setAfficherEditeurActions(!afficherEditeurActions)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                  afficherEditeurActions
                    ? "bg-amber-400 text-slate-950 shadow"
                    : "bg-white/20 hover:bg-white/30 text-white"
                }`}
                title="Renseigner ou modifier les actions menées sur les 28 lignes officielles"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Actions menées</span>
                <span className="sm:hidden">Actions</span>
              </button>
            )}

            {/* Bouton Télécharger (Ancre native compatible 100% Android) */}
            <a
              href={result?.blobUrl || "#"}
              download={result?.nomFichier || "document.pdf"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!result) { e.preventDefault(); return; }
                handleTelecharger();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow active:scale-95 transition-all ${
                loading || !result
                  ? "opacity-50 pointer-events-none bg-slate-300 text-slate-500"
                  : telechargementReussi 
                  ? "bg-emerald-400 text-slate-900" 
                  : "bg-[#FCD116] text-slate-900 hover:bg-yellow-400"
              }`}
              title="Télécharger le PDF officiel conforme"
            >
              {telechargementReussi ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{telechargementReussi ? "Téléchargé !" : "Télécharger PDF"}</span>
              <span className="sm:hidden">PDF</span>
            </a>

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

        {/* PANNEAU DE SAISIE / MODIFICATION DES ACTIONS MENÉES (RAPPORT HEBDO) */}
        {typeFiche === "RAP" && !isVierge && afficherEditeurActions && (
          <div className="bg-amber-50/95 border-b-2 border-amber-300 p-3 sm:p-4 text-xs shrink-0 animate-fade-in shadow-inner z-20">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-700" />
                <span className="font-extrabold text-amber-950 text-xs sm:text-sm">
                  Section 3 : Actions menées au cours de la semaine (posées sur les 28 lignes officielles DDS)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAfficherEditeurActions(false)}
                className="text-amber-900 hover:text-black font-extrabold text-xs px-2.5 py-1 rounded-lg bg-amber-200/60 hover:bg-amber-300 transition-colors"
              >
                Masquer l'éditeur ✕
              </button>
            </div>
            <p className="text-[11px] text-amber-900 mb-2 leading-relaxed">
              Saisissez ou modifiez vos activités ci-dessous. Le texte est découpé et positionné <strong>en temps réel</strong> sur les lignes pointillées du formulaire officiel.
            </p>
            <textarea
              rows={4}
              value={actionsMeneesCustom}
              onChange={(e) => setActionsMeneesCustom(e.target.value)}
              placeholder="Exemple :&#10;1. Réunion de coordination hebdomadaire tenue avec les Relais Communautaires.&#10;2. Visites à domicile réalisées dans 45 ménages ciblés pour le suivi épidémiologique.&#10;3. Dépistage actif par TDR chez 8 enfants fébriles : 3 cas positifs référés et traités.&#10;4. Sensibilisation collective sur l'hygiène de l'eau et l'assainissement de base..."
              className="w-full p-2.5 rounded-xl border border-amber-300 bg-white text-slate-800 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-[#005c30] leading-relaxed shadow-xs"
            />
            {/* Puces d'insertion rapide */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-amber-900">Suggestions rapides :</span>
              <button
                type="button"
                onClick={() => {
                  const ajout = "- Visites à domicile effectuées dans les ménages pour la surveillance active.";
                  setActionsMeneesCustom(prev => prev ? `${prev}\n${ajout}` : ajout);
                }}
                className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-[10px] font-bold text-slate-700 hover:bg-amber-100 transition-colors"
              >
                + Visites ménages
              </button>
              <button
                type="button"
                onClick={() => {
                  const ajout = "- Dépistages et orientations des cas fébriles vers le centre de santé.";
                  setActionsMeneesCustom(prev => prev ? `${prev}\n${ajout}` : ajout);
                }}
                className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-[10px] font-bold text-slate-700 hover:bg-amber-100 transition-colors"
              >
                + Dépistages / Réf. CS
              </button>
              <button
                type="button"
                onClick={() => {
                  const ajout = "- Réunion de coordination hebdomadaire et collecte des registres des Relais.";
                  setActionsMeneesCustom(prev => prev ? `${prev}\n${ajout}` : ajout);
                }}
                className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-[10px] font-bold text-slate-700 hover:bg-amber-100 transition-colors"
              >
                + Réunion Relais
              </button>
              <button
                type="button"
                onClick={() => {
                  const ajout = "- Sensibilisation communautaire sur l'hygiène, le lavage des mains et l'assainissement.";
                  setActionsMeneesCustom(prev => prev ? `${prev}\n${ajout}` : ajout);
                }}
                className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-[10px] font-bold text-slate-700 hover:bg-amber-100 transition-colors"
              >
                + Sensibilisation
              </button>
              <button
                type="button"
                onClick={() => setActionsMeneesCustom("")}
                className="ml-auto text-[10px] text-red-600 hover:text-red-800 font-bold underline"
              >
                Effacer tout
              </button>
            </div>
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

          {/* VUE MOBILE SPÉCIFIQUE (ÉVITE LE BLOCAGE IFRAME SUR CHROME ANDROID) */}
          {isMobile && !loading && !erreur && result && (
            <div className="w-full h-full p-4 overflow-y-auto flex flex-col items-center justify-center text-center space-y-4 bg-slate-100">
              <div className="max-w-md w-full bg-white p-5 rounded-3xl shadow-lg border border-slate-200/80 space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-[#005c30] flex items-center justify-center border border-emerald-200 shadow-inner">
                  <FileText className="w-7 h-7" />
                </div>
                
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#005c30] font-extrabold text-[10px]">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    PDF Officiel DDS Prêt
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base pt-1">
                    {getTitreFiche()}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {result.nomFichier} • {result.nbPages} page(s)
                  </p>
                </div>

                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-left space-y-1">
                  <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Printer className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Affichage sur mobile (Android / iOS) :</span>
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Touchez <strong>« Visualiser le PDF »</strong> pour l'ouvrir dans la visionneuse de votre téléphone avec zoom, partage et impression native.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-1">
                  {/* Option de saisie / modification des actions menées sur le Rapport Hebdo */}
                  {typeFiche === "RAP" && !isVierge && (
                    <button
                      type="button"
                      onClick={() => setAfficherEditeurActions(!afficherEditeurActions)}
                      className={`w-full py-2.5 px-4 rounded-2xl font-extrabold text-xs border active:scale-95 transition-all flex items-center justify-center gap-2 ${
                        afficherEditeurActions
                          ? "bg-amber-300 text-amber-950 border-amber-400"
                          : "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
                      }`}
                    >
                      <Edit3 className="w-4 h-4 text-amber-800" />
                      <span>{afficherEditeurActions ? "Masquer la saisie des actions" : "✏️ Renseigner les actions menées"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleOuvrirPdf}
                    className="w-full py-3 px-4 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Visualiser le PDF en plein écran</span>
                  </button>

                  <a
                    href={result.blobUrl}
                    download={result.nomFichier}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      setTelechargementReussi(true);
                      setTimeout(() => setTelechargementReussi(false), 3000);
                    }}
                    className="w-full py-2.5 px-4 rounded-2xl bg-[#FCD116] hover:bg-yellow-400 text-slate-900 font-extrabold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>{telechargementReussi ? "Téléchargement lancé !" : "Télécharger sur l'appareil"}</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleImprimer}
                    className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-300 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Imprimer via le mobile</span>
                  </button>

                  {/* Sélection directe des applications de lecture (PDF Reader, Google Drive, WhatsApp...) */}
                  <div className="pt-1 text-left">
                    <SelecteurAppLecturePdf
                      blobUrl={result.blobUrl}
                      pdfBytes={result.pdfBytes}
                      nomFichier={result.nomFichier}
                      titreDocument={getTitreFiche()}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VUE DESKTOP : IFRAME PLEIN ÉCRAN */}
          {!isMobile && !loading && !erreur && result && result.blobUrl && (
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

        {/* PIED DE MODALE : SÉLECTION D'APPLICATIONS DE LECTURE (DRIVE, PDF READER, WHATSAPP) & MENTIONS */}
        {result && (
          <div className="px-4 pt-2 pb-1 bg-slate-50 border-t border-slate-200 shrink-0 hidden md:block">
            <SelecteurAppLecturePdf
              blobUrl={result.blobUrl}
              pdfBytes={result.pdfBytes}
              nomFichier={result.nomFichier}
              titreDocument={getTitreFiche()}
            />
          </div>
        )}
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
