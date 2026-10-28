"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PriseEnChargeAliasPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/espace-ascq/consultations");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
      <p className="text-xs text-slate-500 font-bold">Redirection vers le registre des prises en charge...</p>
    </div>
  );
}
