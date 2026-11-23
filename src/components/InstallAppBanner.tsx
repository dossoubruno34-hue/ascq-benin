"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Download, Smartphone, X, Share, PlusSquare } from "lucide-react";

const INSTALL_DISMISSED_KEY = "santecom_install_banner_dismissed_v1";
const INSTALL_SESSION_SEEN_KEY = "santecom_install_banner_session_seen_v1";
const APP_INSTALLED_KEY = "santecom_app_installed_v1";

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(true); // true par défaut pour éviter le flash
  const [isDismissed, setIsDismissed] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://") ||
        localStorage.getItem(APP_INSTALLED_KEY) === "1";
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Vérifier si déjà refusée ou déjà vue dans cette session
    const dismissedPersist = localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
    const seenSession = sessionStorage.getItem(INSTALL_SESSION_SEEN_KEY) === "1";
    if (!dismissedPersist && !seenSession) {
      setIsDismissed(false);
      sessionStorage.setItem(INSTALL_SESSION_SEEN_KEY, "1");
    } else {
      setIsDismissed(true);
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem(APP_INSTALLED_KEY, "1");
      } catch {
        // Ignore
      }
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
      sessionStorage.setItem(INSTALL_SESSION_SEEN_KEY, "1");
    } catch {
      // Ignore
    }
  };

  if (isStandalone || isDismissed || installed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setInstalled(true);
        setDeferredPrompt(null);
        try {
          localStorage.setItem(APP_INSTALLED_KEY, "1");
        } catch {
          // Ignore
        }
      } else {
        handleDismiss();
      }
    } else if (isIos) {
      setShowIosModal(true);
    } else {
      alert(
        "Pour installer SantéCom Bénin sur cet appareil :\n\n1. Cliquez sur l'icône d'installation dans la barre d'adresse de votre navigateur,\nOU\n2. Ouvrez le menu du navigateur (⋮) et choisissez « Installer SantéCom Bénin »."
      );
      handleDismiss();
    }
  };

  return (
    <>
      {/* Bannière discrète en bas de l'écran (ne s'empile jamais au-dessus de l'en-tête 56 dp) */}
      <aside
        aria-label="Installer SantéCom Bénin"
        className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-40 bg-[#003573] text-white rounded-2xl border border-amber-400/70 shadow-xl px-3 py-2 flex items-center justify-between gap-2.5 print:hidden"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center shrink-0">
            <Image
              src="/logo-asc.png"
              alt="Logo SantéCom Bénin"
              width={24}
              height={24}
              className="object-contain"
            />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="font-black text-xs text-white truncate">SantéCom Bénin</p>
            <p className="text-[10px] text-sky-100 truncate">Accès direct et hors ligne</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FCD116] hover:bg-amber-300 text-slate-950 font-black text-[11px] shadow active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Installer</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors"
            title="Ne plus afficher"
            aria-label="Fermer la bannière d'installation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#008751] flex items-center justify-center mx-auto shadow-inner">
              <Smartphone className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-base">
                Installer SantéCom Bénin sur iPhone / iPad
              </h3>
              <p className="text-xs text-slate-500">
                Suivez ces étapes simples depuis Safari :
              </p>
            </div>

            <div className="text-left bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#008751] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Appuyez sur le bouton de <strong>Partage</strong> en bas de Safari (<Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" />).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#008751] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Sélectionnez <strong>« Sur l&apos;écran d&apos;accueil »</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-800" />).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowIosModal(false);
                handleDismiss();
              }}
              className="w-full py-2.5 rounded-xl bg-[#008751] hover:bg-[#006b40] text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              J&apos;ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
