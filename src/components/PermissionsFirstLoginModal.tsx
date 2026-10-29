"use client";

import { useState, useEffect } from "react";
import { MapPin, Bell, CheckCircle2, ShieldCheck, X, Sparkles } from "lucide-react";
import { demanderPermissionNotifications, demanderPermissionGps, supporteNotifications } from "@/lib/notificationsNative";

export default function PermissionsFirstLoginModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusResult, setStatusResult] = useState<{ gps: boolean; notifs: boolean } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Vérifier si l'utilisateur a déjà été sollicité pour les permissions
    const alreadyPrompted = localStorage.getItem("ascq_permissions_demanded_v2");
    if (!alreadyPrompted) {
      // Afficher le modal après 1.5s pour ne pas surprendre lors du chargement initial de la page
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccepterTous = async () => {
    setIsProcessing(true);
    try {
      // 1. Demande d'autorisation pour les notifications
      const notifAccorde = await demanderPermissionNotifications();

      // 2. Demande d'autorisation pour la géolocalisation GPS
      const gpsAccorde = await demanderPermissionGps();

      setStatusResult({ gps: gpsAccorde, notifs: notifAccorde });
      localStorage.setItem("ascq_permissions_demanded_v2", "true");

      // Fermer après avoir affiché le résultat positif pendant 1.5s
      setTimeout(() => {
        setIsOpen(false);
      }, 1800);
    } catch (e) {
      localStorage.setItem("ascq_permissions_demanded_v2", "true");
      setIsOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIgnorer = () => {
    localStorage.setItem("ascq_permissions_demanded_v2", "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        {/* Bandeau tricolore béninois */}
        <div className="h-1.5 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>

        {/* Bouton fermer en haut à droite */}
        <button
          onClick={handleIgnorer}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7 space-y-5 text-center">
          {/* Icône d'en-tête animée */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#005c30] to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Bienvenue sur ASCQ Bénin
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pour vous garantir une utilisation fluide sur le terrain et ne manquer aucune alerte urgente, activez vos autorisations en un clic.
            </p>
          </div>

          {/* Cartes d'explications des 2 permissions */}
          <div className="space-y-3 text-left">
            {/* 1. Géolocalisation GPS */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#005c30] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-slate-900">Position GPS automatique</p>
                <p className="text-slate-600 leading-tight">
                  Géolocalise immédiatement vos fiches de surveillance, consultations et alertes sans aucune saisie manuelle.
                </p>
              </div>
            </div>

            {/* 2. Notifications Mobile (Style WhatsApp) */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <Bell className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-slate-900">Notifications instantanées sur téléphone</p>
                <p className="text-slate-600 leading-tight">
                  Recevez les alertes épidémiques, validations et ordres de mission directement sur l'écran de votre téléphone comme pour WhatsApp ou Facebook.
                </p>
              </div>
            </div>
          </div>

          {/* Statut si en cours ou terminé */}
          {statusResult && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-950 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Autorisations enregistrées avec succès !</span>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleAccepterTous}
              disabled={isProcessing}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#005c30] to-emerald-700 hover:from-[#004a27] hover:to-emerald-800 text-white font-extrabold text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Activation en cours...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Autoriser le GPS et les Notifications</span>
                </>
              )}
            </button>

            <button
              onClick={handleIgnorer}
              disabled={isProcessing}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Configurer plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
