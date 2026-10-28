"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Vérifier discrètement les mises à jour sans couper la session de travail
          if (navigator.onLine) {
            registration.update().catch(() => {});
          }
        })
        .catch((error) => {
          console.warn("Service Worker :", error);
        });
    }
  }, []);

  return null;
}
