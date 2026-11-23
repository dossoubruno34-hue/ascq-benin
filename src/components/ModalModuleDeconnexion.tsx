"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  RefreshCw,
  Lock,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  X,
  Clock,
  Check
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  clearAllUserCaches,
  viderToutesLesFilesAttenteLocales,
  synchroniserToutesLesFilesAttente
} from "@/lib/offline-sync";
import {
  obtenirCompteursOutbox,
  chiffrerDonneesSensiblesLocales,
  purgerElementsSensiblesSynchronises
} from "@/components/ModalModuleSynchronisation";

export const SHARED_DEVICE_KEY = "santecom_appareil_partage_v3";

interface ModalModuleDeconnexionProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: any;
}

export default function ModalModuleDeconnexion({
  isOpen,
  onClose,
  userProfile
}: ModalModuleDeconnexionProps) {
  const router = useRouter();
  const [nbEnAttente, setNbEnAttente] = useState<number>(0);
  const [choixMode, setChoixMode] = useState<"SYNC_AND_LOGOUT" | "KEEP_ENCRYPTED" | "DELETE_UNSENT">("SYNC_AND_LOGOUT");
  const [appareilPartage, setAppareilPartage] = useState<boolean>(false);
  const [enCours, setEnCours] = useState<boolean>(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Surveillance d'inactivité (30 minutes = 1800s, alerte préalable 60s avant)
  const [alerteInactivite, setAlerteInactivite] = useState<boolean>(false);
  const [secondesAvantAutoLogout, setSecondesAvantAutoLogout] = useState<number>(60);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAppareilPartage(localStorage.getItem(SHARED_DEVICE_KEY) === "true");
    if (isOpen) {
      const c = obtenirCompteursOutbox();
      setNbEnAttente(c.total);
      setChoixMode("SYNC_AND_LOGOUT");
      setErreur(null);
    }
  }, [isOpen]);

  // Moniteur de déconnexion automatique après 30 minutes d'inactivité avec message préalable
  useEffect(() => {
    if (typeof window === "undefined") return;
    let timerAvertissement: any = null;
    let intervalDecompte: any = null;
    const INACTIVITE_AVERTISSEMENT_MS = 29 * 60 * 1000; // 29 minutes

    const reinitialiserInactivite = () => {
      if (alerteInactivite) return;
      if (timerAvertissement) clearTimeout(timerAvertissement);
      timerAvertissement = setTimeout(() => {
        setAlerteInactivite(true);
        setSecondesAvantAutoLogout(60);
      }, INACTIVITE_AVERTISSEMENT_MS);
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, reinitialiserInactivite, { passive: true }));
    reinitialiserInactivite();

    return () => {
      if (timerAvertissement) clearTimeout(timerAvertissement);
      if (intervalDecompte) clearInterval(intervalDecompte);
      events.forEach((ev) => window.removeEventListener(ev, reinitialiserInactivite));
    };
  }, [alerteInactivite]);

  useEffect(() => {
    if (!alerteInactivite) return;
    const intv = setInterval(() => {
      setSecondesAvantAutoLogout((prev) => {
        if (prev <= 1) {
          clearInterval(intv);
          executerDeconnexionFinale("KEEP_ENCRYPTED", true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intv);
  }, [alerteInactivite]);

  const toggleAppareilPartage = (val: boolean) => {
    setAppareilPartage(val);
    if (typeof window !== "undefined") {
      localStorage.setItem(SHARED_DEVICE_KEY, String(val));
    }
  };

  const inscrireAuditDeconnexion = async (modeUtilise: string, autoInactivite: boolean) => {
    try {
      const uid = userProfile?.id || (await supabase.auth.getUser())?.data?.user?.id;
      if (!uid) return;
      await supabase.from("journal_audit").insert({
        utilisateur_id: uid,
        capacite: userProfile?.role_nomination || userProfile?.role_technique || userProfile?.poste || "UTILISATEUR",
        commune_id: userProfile?.commune_id || null,
        action: autoInactivite ? "DECONNEXION_AUTO_INACTIVITE_30MIN" : "DECONNEXION_UTILISATEUR",
        details: {
          mode: modeUtilise,
          appareil_partage: appareilPartage,
          elements_en_attente: nbEnAttente,
          timestamp: new Date().toISOString()
        },
        table_cible: "utilisateurs",
        enregistrement_id: uid
      });
    } catch {}
  };

  const executerDeconnexionFinale = async (
    mode: "SYNC_AND_LOGOUT" | "KEEP_ENCRYPTED" | "DELETE_UNSENT",
    autoInactivite: boolean = false
  ) => {
    setEnCours(true);
    setErreur(null);
    try {
      // 1. Si "Synchroniser puis se déconnecter" et éléments en attente
      if (mode === "SYNC_AND_LOGOUT" && nbEnAttente > 0) {
        if (!navigator.onLine) {
          throw new Error(
            "Connexion internet absente : impossible de synchroniser maintenant. Choisissez « Conserver les données chiffrées sur cet appareil » pour ne rien perdre."
          );
        }
        await synchroniserToutesLesFilesAttente();
        purgerElementsSensiblesSynchronises();
      }

      // 2. Si "Conserver les données chiffrées"
      if (mode === "KEEP_ENCRYPTED") {
        chiffrerDonneesSensiblesLocales();
      }

      // 3. Journal d'audit avant révocation du jeton
      await inscrireAuditDeconnexion(mode, autoInactivite);

      // 4. Si "Supprimer les données non envoyées" OU option "Appareil partagé" cochée
      if (mode === "DELETE_UNSENT" || appareilPartage) {
        viderToutesLesFilesAttenteLocales();
        if (typeof window !== "undefined") {
          const sharedPref = appareilPartage;
          localStorage.clear();
          sessionStorage.clear();
          if (sharedPref && mode !== "DELETE_UNSENT") {
            // Après purge totale "Appareil partagé", aucune donnée locale ne subsiste
          }
        }
      } else {
        // Vider uniquement les caches de session privée tout en conservant la file d'attente chiffrée
        clearAllUserCaches();
      }

      // 5. Supprimer le jeton de session Supabase
      try {
        await supabase.auth.signOut();
      } catch {}

      setAlerteInactivite(false);
      onClose();
      // 6. Ramener à l'accueil public
      router.push("/");
    } catch (err: any) {
      setErreur(err?.message || "Erreur lors de la déconnexion.");
    } finally {
      setEnCours(false);
    }
  };

  // Bannière d'avertissement préalable 30 min d'inactivité
  if (alerteInactivite && !isOpen) {
    return (
      <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 border-2 border-amber-400 shadow-2xl space-y-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-base font-black text-slate-900">
            Inactivité détectée (30 minutes)
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pour protéger la confidentialité des données médicales de <strong>SantéCom Bénin</strong>, votre session sera fermée automatiquement dans <strong>{secondesAvantAutoLogout} secondes</strong>.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAlerteInactivite(false)}
              className="flex-1 min-h-[48px] py-3 px-4 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-black text-xs shadow-md"
            >
              Rester connecté
            </button>
            <button
              type="button"
              onClick={() => executerDeconnexionFinale("KEEP_ENCRYPTED", true)}
              className="min-h-[48px] py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={() => !enCours && onClose()}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                Module Déconnexion
              </span>
              <h2 className="text-base font-black text-slate-900">
                Confirmation de déconnexion
              </h2>
            </div>
          </div>

          <button
            type="button"
            disabled={enCours}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* S'il reste des éléments non synchronisés : les 3 choix réglementaires */}
        {nbEnAttente > 0 ? (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-black block">
                  {nbEnAttente} élément(s) non synchronisé(s) en attente
                </strong>
                <span className="text-[11px]">
                  Choisissez comment traiter vos saisies locales avant de fermer la session :
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {/* Choix 1 : Synchroniser puis se déconnecter (par défaut) */}
              <label
                onClick={() => setChoixMode("SYNC_AND_LOGOUT")}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer flex items-start gap-3 transition-all ${
                  choixMode === "SYNC_AND_LOGOUT"
                    ? "border-[#005c30] bg-emerald-50/70"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="logout_choice"
                  checked={choixMode === "SYNC_AND_LOGOUT"}
                  onChange={() => setChoixMode("SYNC_AND_LOGOUT")}
                  className="mt-1 accent-[#005c30]"
                />
                <div className="flex-1">
                  <div className="font-black text-slate-900 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-[#005c30]" />
                    <span>Synchroniser puis se déconnecter (Recommandé)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Envoie vos {nbEnAttente} élément(s) au serveur national avant de fermer la session.
                  </p>
                </div>
              </label>

              {/* Choix 2 : Se déconnecter en conservant les données chiffrées */}
              <label
                onClick={() => setChoixMode("KEEP_ENCRYPTED")}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer flex items-start gap-3 transition-all ${
                  choixMode === "KEEP_ENCRYPTED"
                    ? "border-blue-600 bg-blue-50/70"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="logout_choice"
                  checked={choixMode === "KEEP_ENCRYPTED"}
                  onChange={() => setChoixMode("KEEP_ENCRYPTED")}
                  className="mt-1 accent-blue-600"
                />
                <div className="flex-1">
                  <div className="font-black text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Se déconnecter en conservant les données chiffrées sur cet appareil</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Idéal hors connexion : vos saisies restent chiffrées et seront synchronisées à votre prochaine connexion.
                  </p>
                </div>
              </label>

              {/* Choix 3 : Se déconnecter et supprimer les données non envoyées */}
              <label
                onClick={() => setChoixMode("DELETE_UNSENT")}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer flex items-start gap-3 transition-all ${
                  choixMode === "DELETE_UNSENT"
                    ? "border-red-600 bg-red-50/80"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="logout_choice"
                  checked={choixMode === "DELETE_UNSENT"}
                  onChange={() => setChoixMode("DELETE_UNSENT")}
                  className="mt-1 accent-red-600"
                />
                <div className="flex-1">
                  <div className="font-black text-red-800 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Se déconnecter et supprimer les données non envoyées</span>
                  </div>
                  <p className="text-[11px] text-red-700 font-semibold mt-0.5">
                    ⚠️ Attention : les {nbEnAttente} élément(s) non synchronisés seront définitivement perdus.
                  </p>
                </div>
              </label>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2.5">
            <Check className="w-5 h-5 text-[#005c30] shrink-0" />
            <span>
              Toutes vos fiches et plannings sont synchronisés. Vous pouvez vous déconnecter en toute sécurité.
            </span>
          </div>
        )}

        {/* Option "Appareil partagé" */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <label className="flex items-start justify-between gap-3 cursor-pointer">
            <div>
              <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Option « Appareil partagé »</span>
              </span>
              <span className="text-[11px] text-slate-600 block mt-0.5">
                Purge intégralement toutes les données locales et caches de cet appareil à la déconnexion.
              </span>
            </div>
            <input
              type="checkbox"
              checked={appareilPartage}
              onChange={(e) => toggleAppareilPartage(e.target.checked)}
              className="w-5 h-5 mt-0.5 accent-[#005c30] rounded cursor-pointer shrink-0"
            />
          </label>
        </div>

        {erreur && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-900">
            {erreur}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <button
            type="button"
            disabled={enCours}
            onClick={onClose}
            className="w-full sm:w-1/2 min-h-[48px] py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition-all"
          >
            Annuler
          </button>

          <button
            type="button"
            disabled={enCours}
            onClick={() => executerDeconnexionFinale(choixMode, false)}
            className="w-full sm:w-1/2 min-h-[48px] py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {enCours ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Déconnexion...</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Confirmer la déconnexion</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
