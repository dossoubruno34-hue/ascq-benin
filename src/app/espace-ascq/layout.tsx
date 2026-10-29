"use client";

import { useEffect, useState } from "react";
import { getCachedUserSession, getCachedMonEspace } from "@/lib/offline-sync";
import { estCadreNonAscq } from "@/lib/cadre-roles";
import { supabase } from "@/lib/supabase";

export default function EspaceAscqLayout({ children }: { children: React.ReactNode }) {
  const [isCadre, setIsCadre] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const session = getCachedUserSession();
        if (session?.profile && estCadreNonAscq(session.profile)) {
          window.location.replace("/perimetre");
          return true;
        }
        const cachedEspace = getCachedMonEspace();
        if (cachedEspace && estCadreNonAscq(cachedEspace)) {
          window.location.replace("/perimetre");
          return true;
        }
      } catch (e) {
        // Ignore
      }
    }
    return false;
  });

  useEffect(() => {
    // 1. Détection synchrone immédiate (0ms) depuis les données de session en cache
    const session = getCachedUserSession();
    if (session?.profile && estCadreNonAscq(session.profile)) {
      setIsCadre(true);
      window.location.replace("/perimetre");
      return;
    }

    const cachedEspace = getCachedMonEspace();
    if (cachedEspace && estCadreNonAscq(cachedEspace)) {
      setIsCadre(true);
      window.location.replace("/perimetre");
      return;
    }

    // 2. Détection via Supabase Auth pour vérification continue
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("utilisateurs")
          .select("id, poste, role_technique, role_nomination, poste_autre")
          .eq("id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data && estCadreNonAscq(data)) {
              setIsCadre(true);
              window.location.replace("/perimetre");
            }
          });
      }
    });
  }, []);

  // Si l'utilisateur est un Cadre hiérarchique, ne JAMAIS rendre l'espace de terrain ASCQ
  if (isCadre) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex flex-col items-center justify-center p-4 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#005c30] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-700">
          Redirection vers votre Périmètre de Gouvernance...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
