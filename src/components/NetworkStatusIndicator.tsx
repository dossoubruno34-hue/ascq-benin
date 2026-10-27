"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, CloudUpload } from "lucide-react";
import { isOnline, getOfflineQueueCount } from "@/lib/offline-sync";

export default function NetworkStatusIndicator() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const updateStatus = () => {
    setOnline(isOnline());
    setPendingCount(getOfflineQueueCount());
  };

  useEffect(() => {
    updateStatus();

    const handleOnline = () => {
      setOnline(true);
      setPendingCount(getOfflineQueueCount());
    };

    const handleOffline = () => {
      setOnline(false);
      setPendingCount(getOfflineQueueCount());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const interval = setInterval(updateStatus, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (online && pendingCount === 0) {
    return (
      <div 
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-100 text-[10px] font-semibold border border-emerald-400/20"
        title="Connexion établie avec le serveur national"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="hidden sm:inline">En ligne</span>
      </div>
    );
  }

  if (!online) {
    return (
      <div 
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 text-[10px] font-bold border border-amber-400/30 animate-pulse"
        title="Zone blanche / Hors-ligne : vos saisies sont conservées en mémoire locale sécurisée"
      >
        <WifiOff className="w-3 h-3 text-amber-300" />
        <span>Hors-ligne {pendingCount > 0 && `(${pendingCount} en attente)`}</span>
      </div>
    );
  }

  // En ligne mais avec des éléments à synchroniser
  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-200 text-[10px] font-semibold border border-sky-400/30"
      title={`${pendingCount} signalement(s) prêt(s) pour synchronisation`}
    >
      <CloudUpload className="w-3 h-3 text-sky-300" />
      <span>{pendingCount} à synchroniser</span>
    </div>
  );
}
