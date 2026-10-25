"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, 
  Activity, 
  ClipboardList, 
  Skull, 
  Search, 
  FileSpreadsheet, 
  ChevronRight, 
  Sparkles,
  Lock
} from "lucide-react";

export default function NouvelleFicheSelecteurPage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/connexion");
        return;
      }
      const { data } = await supabase
        .from("utilisateurs")
        .select("*")
        .eq("id", user.id)
        .single();
      setUserProfile(data);
      setLoading(false);
    }
    getProfile();
  }, [router]);

  const isAscq = userProfile?.poste === "ASCQ" || userProfile?.role_technique === "SUPER_ADMIN";

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-20">
      
      {/* En-tête officiel */}
      <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/fiches"
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold">Retour aux fiches</span>
          </Link>
          <h1 className="text-sm font-extrabold">Nouvelle fiche</h1>
          <div className="w-10"></div>
        </div>
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-4">
        
        {/* Titre & Explication */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-emerald-100 text-[#005c30]">
              Surveillance à base communautaire
            </span>
            <span className="text-xs text-slate-400 font-bold">Bénin</span>
          </div>
          <h2 className="text-base font-extrabold text-slate-900">
            Choisir le type de fiche à renseigner
          </h2>
          <p className="text-xs text-slate-500">
            Sélectionnez la fiche officielle correspondant à l'événement sanitaire observé sur le terrain.
          </p>
        </div>

        {/* Grille des 5 fiches officielles */}
        <div className="space-y-3">
          
          {/* 1. FICHE PILOTE ACTIVE : Notification d'alerte (ALR) */}
          <Link
            href="/fiches/alerte/nouvelle"
            className="block group bg-white rounded-3xl p-5 border-2 border-emerald-500 shadow-md hover:shadow-lg transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-[#005c30] text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
              Pilote Phase 6
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#005c30] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6 stroke-[2.5]" />
              </div>

              <div className="flex-1 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-extrabold text-[#005c30] bg-emerald-50 px-2 py-0.5 rounded-md">
                    Code ALR
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    RC & ASCQ
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  Notification d'alerte sanitaire
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Formulaire officiel BJ de notification immédiate d'une maladie à potentiel épidémique, épizootie ou rumeur anormale.
                </p>

                <div className="mt-3.5 inline-flex items-center gap-2 text-xs font-extrabold text-[#005c30] group-hover:translate-x-1 transition-transform">
                  <span>Renseigner cette fiche</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>

          {/* 2. Registre communautaire (REG) */}
          <Link
            href="/fiches/registre/nouvelle"
            className="block group bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:border-blue-400 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ClipboardList className="w-6 h-6" />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      Code REG
                    </span>
                    <span className="text-xs font-bold text-slate-400">RC & ASCQ</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Actif
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                  Registre des alertes et rumeurs
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Cahier de détection continue : suivi des 15 signes/symptômes et rumeurs en communauté avant transformation en alerte formelle.
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-700 group-hover:translate-x-1 transition-transform">
                  <span>Renseigner le registre</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>

          {/* 3. Notification de décès (DEC) */}
          <Link
            href="/fiches/deces/nouvelle"
            className="block group bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:border-purple-400 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Skull className="w-6 h-6" />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                      Code DEC
                    </span>
                    <span className="text-xs font-bold text-slate-400">RC & ASCQ</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Actif
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                  Notification des décès en communauté
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Déclaration des décès maternels, néonatals et communautaires avec autopsie verbale sous supervision médicale.
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-purple-700 group-hover:translate-x-1 transition-transform">
                  <span>Notifier un décès</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>

          {/* 4. Investigation d'un événement (INV) - ASCQ uniquement */}
          {isAscq ? (
            <Link
              href="/fiches/investigation/nouvelle"
              className="block group bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:border-amber-400 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Search className="w-6 h-6" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                        Code INV
                      </span>
                      <span className="text-xs font-bold text-slate-400">ASCQ</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      Actif
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                    Investigation des événements de santé
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Enquête de terrain approfondie sur une alerte avérée, ventilation par tranches d'âge et synthèse d'action.
                  </p>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-700 group-hover:translate-x-1 transition-transform">
                    <span>Créer une investigation</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-white/60 rounded-3xl p-5 border border-slate-200 opacity-60">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                  <Search className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-extrabold text-slate-400">Code INV</span>
                    <span className="text-[10px] font-bold text-slate-400">Réservé ASCQ</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-500 mt-1">Investigation d'événement</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Ce module d'enquête approfondie est réservé aux ASCQ superviseurs.</p>
                </div>
              </div>
            </div>
          )}

          {/* 5. Rapport hebdomadaire (RAP) - ASCQ uniquement */}
          {isAscq ? (
            <Link
              href="/fiches/rapport-hebdo/nouvelle"
              className="block group bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        Code RAP
                      </span>
                      <span className="text-xs font-bold text-slate-400">ASCQ</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      Actif
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                    Rapport hebdomadaire de surveillance
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Bilan par village et semaine épidémiologique, pré-rempli depuis les alertes et décès enregistrés.
                  </p>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 group-hover:translate-x-1 transition-transform">
                    <span>Créer le rapport hebdomadaire</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-white/60 rounded-3xl p-5 border border-slate-200 opacity-60">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-extrabold text-slate-400">Code RAP</span>
                    <span className="text-[10px] font-bold text-slate-400">Réservé ASCQ</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-500 mt-1">Rapport hebdomadaire</h3>
                  <p className="text-xs text-slate-400 mt-0.5">La synthèse hebdomadaire officielle est transmise par l'ASCQ superviseur.</p>
                </div>
              </div>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}
