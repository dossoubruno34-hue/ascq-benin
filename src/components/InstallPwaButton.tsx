"use client";

import { useEffect, useState } from "react";
import { Download, CheckCircle2 } from "lucide-react";

export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si l'application est déjà en mode autonome (PWA installée)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("Pour installer l'application sur votre smartphone ou ordinateur :\n- Sur Chrome Android : appuyez sur le menu (3 points) puis « Installer l'application ».\n- Sur iPhone (Safari) : appuyez sur le bouton Partager puis « Sur l'écran d'accueil ».");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Application installée
      </span>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-sm transition-all active:scale-95"
      title="Installer l'application sur votre écran d'accueil"
    >
      <Download className="w-3.5 h-3.5 animate-bounce" />
      <span>Installer l'application</span>
    </button>
  );
}
