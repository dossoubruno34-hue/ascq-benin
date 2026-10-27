"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Forcer la vérification d'une nouvelle version à chaque chargement
          registration.update();
        })
        .catch((error) => {
          console.warn("Échec enregistrement Service Worker :", error);
        });
    }
  }, []);

  return null;
}
