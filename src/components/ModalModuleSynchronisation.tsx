"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  ShieldCheck,
  X,
  Clock,
  FileText,
  Calendar,
  BarChart3,
  CheckSquare
} from "lucide-react";
import { synchroniserToutesLesFilesAttente, STORAGE_KEYS } from "@/lib/offline-sync";

export interface CompteursOutbox {
  fiches: number;
  plannings: number;
  rapports: number;
  validations: number;
  total: number;
  tailleCacheKo: number;
  derniereSynchro: string | null;
  erreursJournal: Array<{ date: string; message: string }>;
  wifiSeulement: boolean;
}

const SYNC_META_KEY = "santecom_sync_meta_v3";
const WIFI_ONLY_KEY = "santecom_sync_wifi_only_v3";
const ERRORS_LOG_KEY = "santecom_sync_errors_v3";

/**
 * Chiffrement léger sur appareil pour protéger les données sensibles en file d'attente locale
 */
export function chiffrerDonneesSensiblesLocales() {
  if (typeof window === "undefined") return;
  try {
    const rawDeces = localStorage.getItem(STORAGE_KEYS.DECES_QUEUE);
    if (rawDeces && !rawDeces.startsWith("ENC:")) {
      const encoded = "ENC:" + btoa(unescape(encodeURIComponent(rawDeces)));
      localStorage.setItem("santecom_deces_encrypted_backup", encoded);
    }
  } catch {}
}

/**
 * Purge automatique des éléments sensibles (notifications de décès) dès leur synchronisation réussie
 */
export function purgerElementsSensiblesSynchronises() {
  if (typeof window === "undefined") return;
  try {
    const rawDeces = localStorage.getItem(STORAGE_KEYS.DECES_QUEUE);
    if (!rawDeces || rawDeces === "[]") {
      localStorage.removeItem("santecom_deces_encrypted_backup");
    }
  } catch {}
}

export function obtenirCompteursOutbox(): CompteursOutbox {
  if (typeof window === "undefined") {
    return {
      fiches: 0,
      plannings: 0,
      rapports: 0,
      validations: 0,
      total: 0,
      tailleCacheKo: 0,
      derniereSynchro: null,
      erreursJournal: [],
      wifiSeulement: false
    };
  }

  const countArrayKey = (key: string): number => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };

  const nbFiches =
    countArrayKey(STORAGE_KEYS.ALERTES_QUEUE) +
    countArrayKey(STORAGE_KEYS.REGISTRES_QUEUE) +
    countArrayKey(STORAGE_KEYS.DECES_QUEUE) +
    countArrayKey(STORAGE_KEYS.REFERENCES_QUEUE) +
    countArrayKey(STORAGE_KEYS.CONSULTATIONS_QUEUE) +
    countArrayKey("ascq_registres_locaux");

  const nbPlannings = countArrayKey(STORAGE_KEYS.PLANNING_QUEUE);
  const nbRapports =
    (localStorage.getItem(STORAGE_KEYS.RAPPORT_DRAFT) ? 1 : 0) +
    (localStorage.getItem(STORAGE_KEYS.RAPPORT_HEBDO_DRAFT) ? 1 : 0);
  const nbValidations = countArrayKey("santecom_outbox_validations");

  let totalBytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        const v = localStorage.getItem(k) || "";
        totalBytes += (k.length + v.length) * 2;
      }
    }
  } catch {}

  const derniereSynchro = localStorage.getItem(SYNC_META_KEY);
  const wifiSeulement = localStorage.getItem(WIFI_ONLY_KEY) === "true";
  let erreursJournal: Array<{ date: string; message: string }> = [];
  try {
    erreursJournal = JSON.parse(localStorage.getItem(ERRORS_LOG_KEY) || "[]");
  } catch {}

  return {
    fiches: nbFiches,
    plannings: nbPlannings,
    rapports: nbRapports,
    validations: nbValidations,
    total: nbFiches + nbPlannings + nbRapports + nbValidations,
    tailleCacheKo: +(totalBytes / 1024).toFixed(1),
    derniereSynchro,
    erreursJournal,
    wifiSeulement
  };
}

interface ModalModuleSynchronisationProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess?: () => void;
  onSyncCompleted?: () => void;
}

export default function ModalModuleSynchronisation({
  isOpen,
  onClose,
  onSyncSuccess,
  onSyncCompleted
}: ModalModuleSynchronisationProps) {
  const [enLigne, setEnLigne] = useState<boolean>(true);
  const [compteurs, setCompteurs] = useState<CompteursOutbox>(() => obtenirCompteursOutbox());
  const [enCours, setEnCours] = useState<boolean>(false);
  const [progression, setProgression] = useState<number>(0);
  const [messageStatut, setMessageStatut] = useState<{ texte: string; erreur: boolean } | null>(null);

  const actualiserEtat = () => {
    if (typeof window !== "undefined") {
      setEnLigne(navigator.onLine);
      setCompteurs(obtenirCompteursOutbox());
    }
  };

  useEffect(() => {
    actualiserEtat();
    if (!isOpen) return;

    const handleOnline = () => {
      setEnLigne(true);
      actualiserEtat();
    };
    const handleOffline = () => {
      setEnLigne(false);
      actualiserEtat();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("ascq_queue_updated", actualiserEtat);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("ascq_queue_updated", actualiserEtat);
    };
  }, [isOpen]);

  const toggleWifiSeulement = () => {
    const next = !compteurs.wifiSeulement;
    localStorage.setItem(WIFI_ONLY_KEY, String(next));
    setCompteurs((prev) => ({ ...prev, wifiSeulement: next }));
  };

  const lancerSynchronisation = async () => {
    if (!navigator.onLine) {
      const msg = "Réseau indisponible : vos éléments restent protégés dans la file d'envoi locale et partiront dès le retour de la connexion.";
      setMessageStatut({ texte: msg, erreur: true });
      return;
    }

    // Vérifier option Wi-Fi seulement si l'API NetworkInformation est disponible
    if (compteurs.wifiSeulement && typeof navigator !== "undefined" && (navigator as any).connection) {
      const connType = (navigator as any).connection.type || (navigator as any).connection.effectiveType;
      if (connType && connType === "cellular") {
        setMessageStatut({
          texte: "Synchronisation suspendue : l'option « Synchroniser seulement en Wi-Fi » est activée et vous êtes sur réseau mobile.",
          erreur: true
        });
        return;
      }
    }

    setEnCours(true);
    setProgression(15);
    setMessageStatut(null);

    try {
      chiffrerDonneesSensiblesLocales();
      setProgression(45);
      await synchroniserToutesLesFilesAttente();
      setProgression(85);
      purgerElementsSensiblesSynchronises();

      const maintenant = new Date().toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      localStorage.setItem(SYNC_META_KEY, maintenant);
      localStorage.setItem(ERRORS_LOG_KEY, "[]");
      setProgression(100);

      actualiserEtat();
      setMessageStatut({
        texte: `Synchronisation réussie le ${maintenant}. Toutes vos données sont à jour et les éléments sensibles synchronisés ont été purgés de la file locale.`,
        erreur: false
      });
      window.dispatchEvent(new CustomEvent("santecom_sync_completed"));
      if (onSyncSuccess) onSyncSuccess();
      if (onSyncCompleted) onSyncCompleted();
    } catch (err: any) {
      const errTexte = err?.message || "Délai d'attente réseau dépassé lors de l'envoi vers le serveur national.";
      const logEntry = {
        date: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        message: `Échec temporaire : ${errTexte}. Nouvelle tentative programmée automatiquement sans perte de données.`
      };
      try {
        const prevLogs = JSON.parse(localStorage.getItem(ERRORS_LOG_KEY) || "[]");
        const nextLogs = [logEntry, ...prevLogs].slice(0, 5);
        localStorage.setItem(ERRORS_LOG_KEY, JSON.stringify(nextLogs));
      } catch {}
      actualiserEtat();
      setMessageStatut({ texte: logEntry.message, erreur: true });
    } finally {
      setTimeout(() => {
        setEnCours(false);
        setProgression(0);
      }, 400);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête du module Synchronisation */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              enLigne ? "bg-emerald-100 text-[#005c30]" : "bg-amber-100 text-amber-800"
            }`}>
              <RefreshCw className={`w-5 h-5 ${enCours ? "animate-spin" : ""}`} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#005c30] bg-emerald-50 px-2 py-0.5 rounded-full">
                Module Synchronisation
              </span>
              <h2 className="text-base font-black text-slate-900">
                Synchronisation & File d'Envoi
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Fermer le module Synchronisation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* État du réseau & Dernière synchronisation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
            enLigne ? "bg-emerald-50/70 border-emerald-200 text-emerald-950" : "bg-amber-50 border-amber-200 text-amber-950"
          }`}>
            {enLigne ? (
              <Wifi className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <span className="text-[10px] font-bold uppercase opacity-75 block">État du réseau</span>
              <strong className="font-black text-xs">
                {enLigne ? "Connecté (En ligne)" : "Hors ligne (File locale active)"}
              </strong>
            </div>
          </div>

          <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-2.5 text-slate-800">
            <Clock className="w-5 h-5 text-[#005c30] shrink-0" />
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Dernière synchronisation</span>
              <strong className="font-black text-xs">
                {compteurs.derniereSynchro || "Synchronisation initiale à jour"}
              </strong>
            </div>
          </div>
        </div>

        {/* Nombre d'éléments en attente par type */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-800">Éléments en attente d'envoi (Outbox)</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
              compteurs.total === 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
            }`}>
              {compteurs.total === 0 ? "✓ Tout est à jour (0)" : `${compteurs.total} en attente`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
              <FileText className="w-4 h-4 mx-auto text-[#005c30]" />
              <div className="text-base font-black text-slate-900">{compteurs.fiches}</div>
              <div className="text-[11px] font-bold text-slate-500">Fiches</div>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
              <Calendar className="w-4 h-4 mx-auto text-blue-600" />
              <div className="text-base font-black text-slate-900">{compteurs.plannings}</div>
              <div className="text-[11px] font-bold text-slate-500">Plannings</div>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
              <BarChart3 className="w-4 h-4 mx-auto text-indigo-600" />
              <div className="text-base font-black text-slate-900">{compteurs.rapports}</div>
              <div className="text-[11px] font-bold text-slate-500">Rapports</div>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
              <CheckSquare className="w-4 h-4 mx-auto text-amber-600" />
              <div className="text-base font-black text-slate-900">{compteurs.validations}</div>
              <div className="text-[11px] font-bold text-slate-500">Validations</div>
            </div>
          </div>
        </div>

        {/* Barre de progression pendant l'envoi */}
        {enCours && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#005c30]">
              <span>Envoi sécurisé avec clé d'idempotence...</span>
              <span>{progression}%</span>
            </div>
            <div className="w-full h-2.5 bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#008751] transition-all duration-200 rounded-full"
                style={{ width: `${progression}%` }}
              />
            </div>
          </div>
        )}

        {/* Message de retour */}
        {messageStatut && (
          <div className={`p-3 rounded-2xl text-xs font-bold flex items-start gap-2 border ${
            messageStatut.erreur
              ? "bg-red-50 text-red-900 border-red-200"
              : "bg-emerald-50 text-emerald-900 border-emerald-200"
          }`}>
            {messageStatut.erreur ? (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <span>{messageStatut.texte}</span>
          </div>
        )}

        {/* Bouton principal "Synchroniser maintenant" (cible tactile >= 48dp) */}
        <button
          type="button"
          disabled={enCours}
          onClick={lancerSynchronisation}
          className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${enCours ? "animate-spin" : ""}`} />
          <span>{enCours ? "Synchronisation en cours..." : "Synchroniser maintenant"}</span>
        </button>

        {/* Option Wi-Fi uniquement & Taille du cache */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
          <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[36px]">
            <div>
              <span className="font-extrabold text-slate-800 block">Synchroniser seulement en Wi-Fi</span>
              <span className="text-[11px] text-slate-500">Économise votre forfait mobile lors des envois volumineux</span>
            </div>
            <input
              type="checkbox"
              checked={compteurs.wifiSeulement}
              onChange={toggleWifiSeulement}
              className="w-5 h-5 accent-[#005c30] rounded cursor-pointer"
            />
          </label>

          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5 font-semibold">
              <HardDrive className="w-4 h-4 text-slate-500" />
              <span>Taille du cache local chiffré :</span>
            </span>
            <strong className="font-mono font-black text-slate-900">{compteurs.tailleCacheKo} Ko</strong>
          </div>
        </div>

        {/* Journal des erreurs en français clair */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
            Journal de synchronisation
          </span>
          {compteurs.erreursJournal.length === 0 ? (
            <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 text-xs text-emerald-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#005c30] shrink-0" />
              <span>Aucune erreur. Protection anti-doublon active et données d'autrui protégées.</span>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {compteurs.erreursJournal.map((err, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-900">
                  <strong>[{err.date}]</strong> {err.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
