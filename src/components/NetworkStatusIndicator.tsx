"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, CloudUpload, Trash2 } from "lucide-react";
import { isOnline, getOfflineQueueCount, synchroniserToutesLesFilesAttente, viderToutesLesFilesAttenteLocales } from "@/lib/offline-sync";

export default function NetworkStatusIndicator() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

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

    const handleQueueUpdated = () => {
      setPendingCount(getOfflineQueueCount());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("ascq_queue_updated", handleQueueUpdated);
    window.addEventListener("storage", updateStatus);
    const interval = setInterval(updateStatus, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("ascq_queue_updated", handleQueueUpdated);
      window.removeEventListener("storage", updateStatus);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await synchroniserToutesLesFilesAttente();
      setPendingCount(getOfflineQueueCount());
      if (res.nbSynchronises > 0) {
        alert(`✓ ${res.nbSynchronises} élément(s) synchronisé(s) avec succès avec le serveur national !`);
      }
    } catch (err: any) {
      console.warn("Erreur synchronisation manuelle:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleForcePurge = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Voulez-vous purger les données locales en attente ? Utilisez cette option si les éléments ont déjà été envoyés ou restent bloqués.")) {
      viderToutesLesFilesAttenteLocales();
      setPendingCount(0);
    }
  };

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
      title={`${pendingCount} signalement(s) local(aux) en attente. Cliquez pour synchroniser.`}
    >
      <button
        type="button"
        onClick={handleManualSync}
        disabled={syncing}
        className="inline-flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-50"
      >
        {syncing ? (
          <RefreshCw className="w-3 h-3 text-sky-300 animate-spin" />
        ) : (
          <CloudUpload className="w-3 h-3 text-sky-300" />
        )}
        <span>{syncing ? "Synchronisation..." : `${pendingCount} à synchroniser`}</span>
      </button>

      <button
        type="button"
        onClick={handleForcePurge}
        className="ml-1 text-sky-300/70 hover:text-red-300 transition-colors"
        title="Purger les données locales en attente"
      >
        <Trash2 className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}
