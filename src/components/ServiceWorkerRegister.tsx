"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Rechargement automatique fluide lorsque la nouvelle version (v3) prend le contrôle
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Forcer la vérification et l'activation immédiate de la dernière version
          registration.update();
        })
        .catch((error) => {
          console.warn("Échec enregistrement Service Worker :", error);
        });
    }
  }, []);

  return null;
}
