"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker ASCQ BÉNIN enregistré avec succès :", registration.scope);
        })
        .catch((error) => {
          console.warn("Échec enregistrement Service Worker :", error);
        });
    }
  }, []);

  return null;
}
