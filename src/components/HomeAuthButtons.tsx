"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, UserCheck, ArrowRight } from "lucide-react";
import { getCachedUserSession } from "@/lib/offline-sync";
import { estCadreNonAscq } from "@/lib/cadre-roles";
import { supabase } from "@/lib/supabase";

export default function HomeAuthButtons() {
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [targetUrl, setTargetUrl] = useState<string>("/espace-ascq");

  useEffect(() => {
    // 1. Détection synchrone depuis le cache local
    const { profile } = getCachedUserSession();
    if (profile && profile.statut_compte === "VALIDE") {
      setSessionUser(profile);
      determinerEspace(profile);
    }

    // 2. Vérification asynchrone auprès de Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.rpc("obtenir_mon_profil").then(({ data }) => {
          if (data && data.length > 0 && data[0].statut_compte === "VALIDE") {
            setSessionUser(data[0]);
            determinerEspace(data[0]);
          }
        });
      }
    });
  }, []);

  const determinerEspace = (userProfile: any) => {
    const cleanTel = (userProfile.telephone || "").replace(/\D/g, "");
    if (cleanTel.includes("69031463")) {
      setTargetUrl("/espace-ascq");
      return;
    }
    if (estCadreNonAscq(userProfile)) {
      setTargetUrl("/perimetre");
      return;
    }
    if (userProfile.role_technique === "SUPER_ADMIN" || userProfile.role_technique === "ADMINISTRATEUR") {
      setTargetUrl("/admin");
      return;
    }
    if (userProfile.poste === "RC") {
      setTargetUrl("/espace-rc");
      return;
    }
    setTargetUrl("/espace-ascq");
  };

  if (sessionUser) {
    return (
      <section className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1 w-full max-w-sm mx-auto">
        <Link
          href={targetUrl}
          className="w-full flex-1 py-2.5 px-5 rounded-2xl font-bold text-xs sm:text-sm text-center text-white bg-[#0e7f47] hover:bg-[#0b6d3c] shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>Accéder à mon espace ({sessionUser.poste || "Agent"})</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </Link>
        <Link
          href="/connexion?action=login"
          className="w-full sm:w-auto py-2 px-3 rounded-2xl font-medium text-[11px] text-center text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-colors"
        >
          Changer de compte
        </Link>
      </section>
    );
  }

  return (
    <section className="flex items-center justify-center gap-3 pt-1">
      <Link
        href="/connexion?action=login"
        className="flex-1 max-w-[170px] py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-center text-white bg-[#0e7f47] hover:bg-[#0b6d3c] shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
      >
        <LogIn className="w-4 h-4" />
        <span>Se connecter</span>
      </Link>

      <Link
        href="/inscription"
        className="flex-1 max-w-[170px] py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-center text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm transition-all active:scale-95"
      >
        S'inscrire
      </Link>
    </section>
  );
}
