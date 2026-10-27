"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminValidationComptesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin?tab=comptes_ascq");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center text-white space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="font-bold text-sm">Redirection vers le portail d'administration complet...</p>
      </div>
    </div>
  );
}
