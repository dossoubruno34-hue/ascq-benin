"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NouvellePriseEnChargeAliasPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/espace-ascq/consultations/nouvelle");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
      <p className="text-xs text-slate-500 font-bold">Redirection vers le formulaire de prise en charge...</p>
    </div>
  );
}
