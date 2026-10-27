"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Download, Smartphone, X, Share, PlusSquare, CheckCircle2 } from "lucide-react";

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Détecter si l'application est déjà lancée en mode autonome (PWA installée)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // 2. Détecter si l'utilisateur est sur iOS (iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 3. Écouter l'événement standard de proposition d'installation PWA
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 4. Écouter l'événement d'installation réussie
    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Ne rien afficher si déjà installé en mode autonome, déjà installé aujourd'hui, ou fermé manuellement
  if (isStandalone || isDismissed || installed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Déclencher le prompt natif du navigateur (Android / Chrome / Edge)
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      // Afficher les consignes spécifiques pour Safari iOS
      setShowIosModal(true);
    } else {
      // Sur PC ou autre navigateur
      alert(
        "Pour installer l'application sur cet appareil :\n\n1. Cliquez sur l'icône d'installation dans la barre d'adresse de votre navigateur (à droite de l'URL),\nOU\n2. Ouvrez le menu de votre navigateur (les trois points) et choisissez « Installer ASCQ Bénin »."
      );
    }
  };

  return (
    <>
      {/* Bandeau d'installation en haut de l'application */}
      <aside aria-label="Installer l'application" className="bg-gradient-to-r from-[#005c30] via-[#00703c] to-[#004724] text-white border-b-2 border-amber-400 shadow-md relative z-40 transition-all">
        <div className="max-w-4xl mx-auto px-3.5 py-2 sm:py-2.5 flex items-center justify-between gap-3">
          
          {/* Logo & Description */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-inner">
              <Image
                src="/logo-ascq.png"
                alt="Logo ASCQ Bénin"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-xs sm:text-sm tracking-tight text-white truncate">
                  Application Officielle ASCQ Bénin
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-900 uppercase">
                  PWA Mobile & PC
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 hidden sm:block truncate">
                Installez l'application sur votre écran d'accueil pour un accès rapide, direct et hors-ligne.
              </p>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span>Installer l'application</span>
            </button>

            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
              title="Fermer ce bandeau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Modale d'instructions pour iPhone / iPad (Safari) */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#005c30] flex items-center justify-center mx-auto shadow-inner">
              <Smartphone className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-base">
                Installer sur votre iPhone / iPad
              </h3>
              <p className="text-xs text-slate-500">
                Suivez ces 2 étapes simples depuis Safari :
              </p>
            </div>

            <div className="text-left bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Appuyez sur le bouton de <strong>Partage</strong> en bas de Safari (l'icône <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" />).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Faites défiler le menu et sélectionnez <strong>« Sur l'écran d'accueil »</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-800" />).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Appuyez sur <strong>« Ajouter »</strong> en haut à droite. L'icône ASCQ Bénin apparaîtra sur votre écran d'accueil !
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
