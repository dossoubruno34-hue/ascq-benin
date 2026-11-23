"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import NotificationsModal from "@/components/NotificationsModal";
import ModalModuleSynchronisation from "@/components/ModalModuleSynchronisation";
import ModalModuleDeconnexion from "@/components/ModalModuleDeconnexion";
import ModalMonProfil from "@/components/ModalMonProfil";
import {
  LogOut,
  Bell,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  LayoutGrid,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import { estCadreNonAscq } from "@/lib/cadre-roles";
import {
  getCachedUserSession,
  synchroniserToutesLesFilesAttente,
} from "@/lib/offline-sync";
import { obtenirCompteursOutbox } from "@/components/ModalModuleSynchronisation";
import {
  obtenirNomEtRoleCourt,
  verifierAccesRoute,
  enregistrerElementRecent,
  MODULES_PRINCIPAUX,
  SOUS_MODULES,
} from "@/lib/navigation-registry";

interface Props {
  userProfile?: any;
}

export default function AscqNav({ userProfile }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isProfilOpen, setIsProfilOpen] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [hasSyncError, setHasSyncError] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const cachedProfile = typeof window !== "undefined" ? getCachedUserSession()?.profile : null;
  const [localProfile, setLocalProfile] = useState<any>(null);
  const activeUser = localProfile || userProfile || cachedProfile;

  const chargerEtatSync = () => {
    if (typeof window === "undefined") return;
    const c = obtenirCompteursOutbox();
    setPendingSyncCount(c.total);
    setHasSyncError(c.erreursJournal.length > 0 && c.total > 0);
  };

  const chargerNonLues = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("lu", false)
        .or(`destinataire_id.eq.${user.id},destinataire_id.is.null`);
      setUnreadCount(count || 0);
    } catch {
      // Ignore hors ligne
    }
  };

  useEffect(() => {
    chargerNonLues();
    chargerEtatSync();

    const interval = setInterval(() => {
      chargerEtatSync();
    }, 4000);

    const handleOnline = async () => {
      setIsSyncingNow(true);
      try {
        await synchroniserToutesLesFilesAttente();
      } finally {
        setIsSyncingNow(false);
        chargerEtatSync();
      }
    };

    window.addEventListener("online", handleOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
    };
  }, [userProfile]);

  // Enregistrer automatiquement les sous-modules visités dans "Récents (3)"
  useEffect(() => {
    if (!pathname) return;
    const foundSub = SOUS_MODULES.find((s) => s.route.split("?")[0] === pathname);
    if (foundSub && foundSub.id !== "soins_overview" && foundSub.id !== "gouvernance_perimetre") {
      enregistrerElementRecent({
        id: foundSub.id,
        libelle: foundSub.libelle,
        route: foundSub.route,
        parent: foundSub.parent,
      });
    }
  }, [pathname]);

  const cleanTelNav = (activeUser?.telephone || "").replace(/\D/g, "");
  const isBrunoSuperAdmin = cleanTelNav.includes("69031463");
  const isCadre = !isBrunoSuperAdmin && estCadreNonAscq(activeUser);

  const { nomCourt, roleCourt } = obtenirNomEtRoleCourt(activeUser);
  const homeHref = isCadre ? "/perimetre" : "/espace-ascq";

  // Vérification d'accès par rôle (Registre Central)
  const accesVerif = activeUser ? verifierAccesRoute(pathname || "/", activeUser) : { autorise: true };

  return (
    <>
      {/* En-tête compact fixe de 56 dp (h-14) — Zéro barre horizontale défilante */}
      <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md print:hidden h-14 flex flex-col justify-between">
        <div className="max-w-4xl w-full mx-auto px-2.5 flex-1 flex items-center justify-between gap-1.5">
          {/* Gauche : Photo (ouvre Mon profil) + Nom court & Rôle + Bouton Grille d'accueil */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsProfilOpen(true)}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 hover:bg-white/10 active:scale-95 transition-all"
              title="Ouvrir Mon profil"
              aria-label="Ouvrir Mon profil"
            >
              <div className="w-8 h-8 rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden shadow-sm border-2 border-[#FCD116]">
                {activeUser?.photo_url ? (
                  <img
                    src={activeUser.photo_url}
                    alt={nomCourt}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <Image
                    src="/logo-ascq.png"
                    alt="SantéCom Bénin"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsProfilOpen(true)}
              className="text-left min-w-0 leading-tight py-1 pr-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Mon profil — SantéCom Bénin"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs sm:text-sm tracking-tight text-white truncate">
                  SantéCom Bénin
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-bold truncate max-w-[145px] sm:max-w-[260px]">
                {nomCourt}, <span className="text-[#FCD116]">{roleCourt}</span>
              </p>
            </button>

            {pathname !== homeHref && (
              <Link
                href={homeHref}
                className="inline-flex items-center gap-1 px-2.5 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white font-black text-[11px] shrink-0 transition-all active:scale-95 border border-white/20"
                title="Retourner à la grille des 6 modules"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-[#FCD116]" />
                <span className="hidden xs:inline">Modules</span>
              </Link>
            )}
          </div>

          {/* Droite : Synchronisation (épinglé) + Notifications + Déconnexion (épinglé) */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Module Synchronisation épinglé */}
            <button
              type="button"
              onClick={() => {
                chargerEtatSync();
                setIsSyncOpen(true);
              }}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white/95 hover:text-white hover:bg-white/10 transition-colors relative"
              title={
                pendingSyncCount > 0
                  ? `Synchronisation : ${pendingSyncCount} élément(s) en attente`
                  : "Synchronisation : Tout est à jour"
              }
              aria-label="Synchronisation"
            >
              {isSyncingNow ? (
                <RefreshCw className="w-4 h-4 text-[#FCD116] animate-spin" />
              ) : hasSyncError ? (
                <AlertTriangle className="w-4 h-4 text-rose-300" />
              ) : pendingSyncCount > 0 ? (
                <RefreshCw className="w-4 h-4 text-amber-300" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              )}

              {pendingSyncCount > 0 && (
                <span
                  className={`absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full text-white text-[9px] font-black flex items-center justify-center shadow ${
                    hasSyncError ? "bg-[#E8112D]" : "bg-amber-500 text-slate-950"
                  }`}
                >
                  {pendingSyncCount > 9 ? "9+" : pendingSyncCount}
                </span>
              )}
            </button>

            {/* Cloche de notifications */}
            <button
              type="button"
              onClick={() => setIsNotifOpen(true)}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white/95 hover:text-white hover:bg-white/10 transition-colors relative"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#E8112D] text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Module Déconnexion épinglé */}
            <button
              type="button"
              onClick={() => {
                chargerEtatSync();
                setIsLogoutOpen(true);
              }}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white/95 hover:text-white hover:bg-white/10 transition-colors"
              title="Déconnexion"
              aria-label="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bandeau tricolore béninois (2px) */}
        <div className="h-0.5 w-full flex shrink-0">
          <span className="w-1/3 bg-[#008751]" />
          <span className="w-1/3 bg-[#FCD116]" />
          <span className="w-1/3 bg-[#E8112D]" />
        </div>
      </header>

      {/* Barrière d'accès direct aux routes non autorisées selon le rôle */}
      {!accesVerif.autorise && (
        <div className="max-w-xl mx-auto my-6 px-4 print:hidden">
          <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-5 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-base font-black text-rose-950">
              Accès non autorisé pour votre rôle ({roleCourt})
            </h2>
            <p className="text-xs text-rose-800 leading-relaxed">
              {accesVerif.motifRefus || "Ce sous-module n'est pas ouvert à votre profil."}
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => router.push(homeHref)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#008751] text-white font-black text-xs shadow hover:bg-[#006b40]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retourner à l&apos;accueil SantéCom Bénin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Notifications */}
      <NotificationsModal
        isOpen={isNotifOpen}
        onClose={() => {
          setIsNotifOpen(false);
          chargerNonLues();
        }}
        onNotificationsUpdated={chargerNonLues}
      />

      {/* Modale Module Synchronisation */}
      <ModalModuleSynchronisation
        isOpen={isSyncOpen}
        onClose={() => {
          setIsSyncOpen(false);
          chargerEtatSync();
        }}
        onSyncCompleted={chargerEtatSync}
      />

      {/* Modale Module Déconnexion */}
      <ModalModuleDeconnexion
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        userProfile={activeUser}
      />

      {/* Modale Mon Profil (ouverte en touchant la photo) */}
      <ModalMonProfil
        isOpen={isProfilOpen}
        onClose={() => setIsProfilOpen(false)}
        userProfile={activeUser}
        onProfileUpdated={(updated) => setLocalProfile(updated)}
        onOpenLogout={() => setIsLogoutOpen(true)}
      />
    </>
  );
}
