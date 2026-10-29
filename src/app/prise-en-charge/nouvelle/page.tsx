"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCachedUserSession, getCachedRcSpace } from "@/lib/offline-sync";

export default function NouvellePriseEnChargeAliasPage() {
  const router = useRouter();
  useEffect(() => {
    const rc = getCachedRcSpace();
    const session = getCachedUserSession();
    const profile = rc || session.profile;
    const isRelais =
      profile?.role_technique === "RELAIS" ||
      profile?.role_technique === "RELAIS_COMMUNAUTAIRE" ||
      profile?.poste === "RC";

    if (isRelais) {
      router.replace("/relais/reference/nouvelle");
    } else {
      router.replace("/espace-ascq/consultations/nouvelle");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
      <p className="text-xs text-slate-500 font-bold">Orientation vers le formulaire adapté...</p>
    </div>
  );
}
