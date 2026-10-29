"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCachedRcSpace } from "@/lib/offline-sync";
import FicheHebdoActivitesRcOfficielle from "@/components/FicheHebdoActivitesRcOfficielle";
import { ArrowLeft, Printer, ShieldCheck, RefreshCw } from "lucide-react";

export default function FicheHebdoPage() {
  const router = useRouter();
  const [rcData, setRcData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const chargerProfil = async () => {
      setLoading(true);
      const cached = getCachedRcSpace();
      if (cached) {
        setRcData(cached);
        setLoading(false);
      }

      try {
        const { data, error } = await supabase.rpc("obtenir_espace_rc");
        if (error) {
          if (!cached) {
            router.push("/connexion");
          }
          return;
        }
        if (data) {
          setRcData(data);
        }
      } catch (err) {
        console.warn("Erreur chargement profil RC:", err);
        if (!cached) {
          router.push("/connexion");
        }
      } finally {
        setLoading(false);
      }
    };

    chargerProfil();
  }, [router]);

  if (loading && !rcData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4 max-w-sm w-full">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#005c30] flex items-center justify-center mx-auto animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">Chargement de la fiche d'activités...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 pb-16">
      {/* Barre de navigation supérieure (masquée à l'impression) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link
            href="/espace-rc"
            className="flex items-center gap-2 text-xs font-black text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Mon Espace RC</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Fiche Officielle PNSC Bénin
            </span>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
        {rcData ? (
          <FicheHebdoActivitesRcOfficielle rcProfile={rcData} isAscqSuperviseur={false} />
        ) : (
          <div className="p-8 text-center text-sm text-slate-500 bg-white rounded-3xl border border-slate-200">
            Profil Relais non trouvé. Veuillez vous reconnecter.
          </div>
        )}
      </main>
    </div>
  );
}
