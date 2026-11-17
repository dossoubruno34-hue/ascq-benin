"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ArrowRight,
  ShieldCheck,
  X
} from "lucide-react";
import { APP_VERSION, APP_BUILD_DATE, APP_RELEASE_NOTES } from "@/lib/version";

interface VersionInfo {
  version: string;
  buildTimestamp?: number;
  buildDate?: string;
  releaseNotes?: string;
}

export default function AppUpdateManager() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersionInfo, setNewVersionInfo] = useState<VersionInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  
  // État pour la vérification manuelle par l'utilisateur
  const [manualChecking, setManualChecking] = useState(false);
  const [showUpToDateModal, setShowUpToDateModal] = useState(false);

  // 1. Déclenchement de la mise à jour immédiate
  const appliquerMiseAJour = useCallback(async () => {
    setIsUpdating(true);
    try {
      // 1. Envoyer le signal SKIP_WAITING au Service Worker en attente
      if (swRegistration?.waiting) {
        swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      // 2. Vider les caches du navigateur pour éviter tout reste d'ancien JS/HTML
      if (typeof window !== "undefined" && "caches" in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        } catch (e) {
          console.warn("Erreur purge caches:", e);
        }
      }

      // 3. Mettre à jour l'identifiant local de version
      if (typeof window !== "undefined") {
        localStorage.setItem("ascq_client_version", newVersionInfo?.version || APP_VERSION);
      }

      // 4. Forcer un rechargement dur sans cache
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error("Erreur lors de l'application de la mise à jour:", err);
      window.location.reload();
    }
  }, [swRegistration, newVersionInfo]);

  // 2. Fonction de vérification des versions
  const verifierNouvelleVersion = useCallback(async (isManual: boolean = false) => {
    if (!navigator.onLine) {
      if (isManual) {
        alert("Vous êtes actuellement hors-ligne. Impossible de vérifier les mises à jour sans connexion internet.");
      }
      return;
    }

    if (isManual) setManualChecking(true);

    try {
      // A. Forcer la mise à jour du Service Worker s'il existe
      if (swRegistration) {
        try {
          await swRegistration.update();
        } catch (e) {
          // Erreur réseau tolérée
        }
      }

      // B. Interroger l'endpoint /api/version avec cache-busting
      const timestamp = Date.now();
      let serverData: VersionInfo | null = null;

      try {
        const res = await fetch(`/api/version?_t=${timestamp}`, {
          cache: "no-store",
          headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" }
        });
        if (res.ok) {
          serverData = await res.json();
        }
      } catch (err) {
        // Fallback sur /version.json
        try {
          const resJson = await fetch(`/version.json?_t=${timestamp}`, {
            cache: "no-store"
          });
          if (resJson.ok) {
            serverData = await resJson.json();
          }
        } catch (e) {
          // Échec silencieux si indisponible
        }
      }

      // Comparaison avec la version actuellement exécutée dans le bundle
      if (serverData && serverData.version) {
        const versionServeur = serverData.version.trim();
        const versionLocale = APP_VERSION.trim();

        if (versionServeur !== versionLocale) {
          setNewVersionInfo(serverData);
          setUpdateAvailable(true);
          if (isManual) setManualChecking(false);
          return;
        }
      }

      // Si le Service Worker a un travailleur en attente (waiting)
      if (swRegistration?.waiting) {
        setUpdateAvailable(true);
        if (isManual) setManualChecking(false);
        return;
      }

      // Si vérification manuelle et application déjà à jour
      if (isManual) {
        setShowUpToDateModal(true);
      }
    } catch (err) {
      console.warn("Vérification mise à jour :", err);
    } finally {
      if (isManual) setManualChecking(false);
    }
  }, [swRegistration]);

  // 3. Enregistrement initial du Service Worker et écouteurs d'événements
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.register("/sw.js")
      .then((registration) => {
        setSwRegistration(registration);

        // Si une mise à jour est déjà en attente d'activation
        if (registration.waiting) {
          setUpdateAvailable(true);
        }

        // Détection de nouveau worker installé
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // Une nouvelle version a été téléchargée en arrière-plan
              setUpdateAvailable(true);
            }
          });
        });

        // Vérification périodique discrète
        if (navigator.onLine) {
          registration.update().catch(() => {});
        }
      })
      .catch((error) => {
        console.warn("Service Worker registration:", error);
      });

    // Écouter l'événement global pour déclencher la vérification depuis n'importe où
    const handleCustomCheck = () => {
      verifierNouvelleVersion(true);
    };

    window.addEventListener("verifier-maj-app", handleCustomCheck);

    // Vérifier également au retour sur l'onglet
    const handleFocus = () => {
      if (navigator.onLine) {
        verifierNouvelleVersion(false);
      }
    };
    window.addEventListener("focus", handleFocus);

    // Polling toutes les 2 minutes si connecté
    const interval = setInterval(() => {
      if (navigator.onLine) {
        verifierNouvelleVersion(false);
      }
    }, 120000);

    return () => {
      window.removeEventListener("verifier-maj-app", handleCustomCheck);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [verifierNouvelleVersion]);

  return (
    <>
      {/* 1. MODALE MAJEURE DE NOUVELLE VERSION DÉPLOYÉE (OBLIGATOIRE / FORTE VISIBILITÉ) */}
      {updateAvailable && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-2 border-emerald-500 overflow-hidden transform scale-100 transition-all">
            
            {/* Bannière d'en-tête */}
            <div className="bg-gradient-to-r from-[#005c30] via-[#007a40] to-[#004724] text-white p-5 text-center relative">
              <div className="w-14 h-14 bg-white/10 rounded-2xl mx-auto flex items-center justify-center mb-2 shadow-inner border border-white/20">
                <Sparkles className="w-7 h-7 text-amber-300 animate-bounce" />
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-wider">
                Mise à jour officielle requise
              </span>
              <h3 className="text-lg font-black mt-2 text-white">
                Nouvelle version disponible !
              </h3>
              <p className="text-xs text-emerald-100 mt-1">
                SantéCom Bénin — Ministère de la Santé
              </p>
            </div>

            {/* Contenu de la mise à jour */}
            <div className="p-5 space-y-4 text-xs text-slate-700">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80 font-bold">
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">Version actuelle</span>
                  <span className="text-slate-600">v{APP_VERSION}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-right">
                  <span className="text-[10px] text-emerald-600 block font-normal">Nouvelle version</span>
                  <span className="text-emerald-800 font-extrabold text-sm">
                    v{newVersionInfo?.version || "2.5.0"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-[11px] uppercase tracking-wide">
                  Nouveautés & Corrections incluses :
                </h4>
                <ul className="space-y-1.5 text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Plannings officiels A4 Paysage</strong> : génération vectorielle fidèle sur 1 page stricte sans débordement.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Circuit ASCQ ↔ Relais</strong> : validation et visa tactile en direct avec retour automatique au Relais.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Impression & Téléchargement mobile</strong> : support natif Android & iOS garanti.</span>
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Pour garantir la synchronisation correcte de vos données avec le serveur national, veuillez mettre à jour avant de continuer.
                </span>
              </div>

              {/* Bouton d'action principal */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={appliquerMiseAJour}
                  disabled={isUpdating}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isUpdating ? "animate-spin" : ""}`} />
                  <span>{isUpdating ? "Mise à jour en cours..." : "Mettre à jour maintenant"}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. MODALE DE CONFIRMATION : APPLICATION DÉJÀ À JOUR */}
      {showUpToDateModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#005c30] flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Application à jour !
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Vous utilisez déjà la dernière version officielle de SantéCom Bénin (v{APP_VERSION}).
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Version installée :</span>
                <span className="font-bold text-slate-700">v{APP_VERSION}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date de version :</span>
                <span className="font-bold text-slate-700">{APP_BUILD_DATE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Statut réseau :</span>
                <span className="font-bold text-emerald-600">Connecté & Conforme</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowUpToDateModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Indicateur de chargement lors d'une vérification manuelle */}
      {manualChecking && (
        <div className="fixed bottom-5 right-5 z-[9990] bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Vérification des mises à jour sur le serveur national...</span>
        </div>
      )}
    </>
  );
}
