"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AscqNav from "@/components/AscqNav";
import { 
  GUIDE_MALADIES_SIMR, 
  CALENDRIER_VACCINAL_BENIN, 
  COLONNES_AGES_CALENDRIER,
  LIGNES_GRILLE_OFFICIELLE_UNICEF,
  MaladieSimr 
} from "@/data/guideMaladiesEtVaccins";
import { 
  Search, 
  AlertTriangle, 
  Syringe, 
  ShieldAlert, 
  BookOpen, 
  ArrowLeft, 
  CheckCircle2, 
  MapPin, 
  Activity, 
  Printer, 
  ExternalLink, 
  HelpCircle,
  Clock,
  Sparkles,
  Baby,
  Users,
  Flame,
  Globe2,
  FileText,
  Lock
} from "lucide-react";

export default function BriefingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<
    "tous" | "epidemies" | "elimination" | "sante_publique" | "portee_internationale" | "vaccins"
  >("vaccins");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vueVaccinMode, setVueVaccinMode] = useState<"grille" | "detail">("grille");

  // Vérification de sécurité : espace strictement réservé aux utilisateurs connectés à un compte
  useEffect(() => {
    async function verifierConnexion() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/connexion?redirect=/briefing");
          return;
        }

        const { data: profil } = await supabase
          .from("utilisateurs")
          .select("id, nom, prenoms, poste, role_technique, photo_url")
          .eq("id", user.id)
          .maybeSingle();

        setCurrentUser(profil || { id: user.id });
      } catch (e) {
        router.replace("/connexion");
      } finally {
        setAuthLoading(false);
      }
    }

    verifierConnexion();
  }, [router]);

  // Filtrage intelligent selon l'onglet et le mot-clé
  const filteredMaladies = useMemo(() => {
    return GUIDE_MALADIES_SIMR.filter((m) => {
      // Filtre catégorie
      if (activeTab !== "tous" && activeTab !== "vaccins" && m.categorieId !== activeTab) {
        return false;
      }

      // Filtre texte
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inNom = m.nom.toLowerCase().includes(q);
      const inDesc = m.description.toLowerCase().includes(q);
      const inSignes = m.signesAlerte.some((s) => s.toLowerCase().includes(q));
      const inContexte = m.contexteBenin.toLowerCase().includes(q);
      const inConduite = m.conduiteAscq.toLowerCase().includes(q);

      return inNom || inDesc || inSignes || inContexte || inConduite;
    });
  }, [activeTab, searchQuery]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#005c30] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-bold text-xs sm:text-sm text-slate-700">
            Vérification de l'accès sécurisé au Guide SIMR...
          </p>
        </div>
      </div>
    );
  }

  const retourLien = currentUser?.poste === "RC" ? "/espace-rc" : "/espace-ascq";

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-800 antialiased pb-20">
      
      {/* 1. En-tête : AscqNav pour ASCQ / Cadres, ou header dédié pour RC */}
      {currentUser?.poste === "RC" ? (
        <header className="bg-[#005c30] text-white shadow-md print:hidden">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
            <Link href={retourLien} className="flex items-center gap-2 text-white hover:text-emerald-200 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold">Retour Espace RC</span>
            </Link>
            <h1 className="text-sm font-extrabold truncate">Guide SIMR & Calendrier Vaccinal</h1>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimer</span>
            </button>
          </div>
          <div className="h-1 w-full flex">
            <span className="w-1/3 bg-[#008751]"></span>
            <span className="w-1/3 bg-[#FCD116]"></span>
            <span className="w-1/3 bg-[#E8112D]"></span>
          </div>
        </header>
      ) : (
        <AscqNav userProfile={currentUser} />
      )}

      {/* 2. Titre et Bandeau du module */}
      <div className="bg-gradient-to-b from-[#005c30]/10 to-transparent pt-6 pb-4">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-black text-[11px] uppercase tracking-wider mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Référentiel National SIMR & PEV</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Guide des Maladies & Calendrier Vaccinal
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                Définitions simples au niveau communautaire pour les ASCQ, Relais Communautaires, professionnels de santé et citoyens. Conforme aux protocoles officiels de la Surveillance Intégrée des Maladies et Riposte (SIMR) et du Programme Élargi de Vaccination (PEV) du Bénin.
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
              <Link
                href="/fiches/alerte/nouvelle"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md active:scale-95 transition-all"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Déclencher une alerte</span>
              </Link>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs border border-slate-200 shadow-xs transition-colors"
                title="Imprimer ce guide ou l'enregistrer en PDF"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Imprimer / PDF</span>
              </button>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="mt-6 relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une maladie, un vaccin, un signe (ex: fièvre, lassa, choléra, sang, nuque, vaccin...)"
              className="w-full text-sm sm:text-base rounded-2xl border border-slate-200/90 bg-white pl-11 pr-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>

          {/* 3. Sélecteur d'onglets horizontaux (scrollable mobile) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-4 pb-1">
            <button
              onClick={() => setActiveTab("vaccins")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeTab === "vaccins"
                  ? "bg-[#005c30] text-white ring-2 ring-[#005c30]/20"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              <Syringe className="w-3.5 h-3.5 text-amber-300" />
              <span>Calendrier Vaccinal Bénin (PEV)</span>
            </button>

            <button
              onClick={() => setActiveTab("tous")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeTab === "tous"
                  ? "bg-[#005c30] text-white ring-2 ring-[#005c30]/20"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Toutes les maladies ({GUIDE_MALADIES_SIMR.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("epidemies")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeTab === "epidemies"
                  ? "bg-red-700 text-white ring-2 ring-red-700/20"
                  : "bg-white text-red-700 hover:bg-red-50 border border-red-200"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-red-500" />
              <span>Potentiel Épidémique (Urgent)</span>
            </button>

            <button
              onClick={() => setActiveTab("elimination")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeTab === "elimination"
                  ? "bg-purple-700 text-white ring-2 ring-purple-700/20"
                  : "bg-white text-purple-700 hover:bg-purple-50 border border-purple-200"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-purple-500" />
              <span>Élimination & Éradication</span>
            </button>

            <button
              onClick={() => setActiveTab("sante_publique")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeTab === "sante_publique"
                  ? "bg-blue-700 text-white ring-2 ring-blue-700/20"
                  : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span>Santé Publique & Urgences</span>
            </button>

            <button
              onClick={() => setActiveTab("portee_internationale")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeTab === "portee_internationale"
                  ? "bg-amber-600 text-white ring-2 ring-amber-600/20"
                  : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200"
              }`}
            >
              <Globe2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Portée Internationale</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Contenu Principal */}
      <main className="max-w-5xl mx-auto px-4 mt-4">
        
        {/* ========================================================= */}
        {/* ONGLET 1 : CALENDRIER VACCINAL OFFICIEL DU BÉNIN          */}
        {/* ========================================================= */}
        {activeTab === "vaccins" && (
          <div className="space-y-6">
            
            {/* Carte d'introduction officielle */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Syringe className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      Programme Élargi de Vaccination (PEV Bénin) & UNICEF
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      Calendrier Vaccinal de Routine & Supplémentation Nutritionnelle
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {CALENDRIER_VACCINAL_BENIN.introduction}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-colors shrink-0 print:hidden shadow-xs"
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <span>Imprimer le Calendrier</span>
                </button>
              </div>

              {/* Sélecteur de vue : Grille officielle UNICEF vs Vue chronologique */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => setVueVaccinMode("grille")}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    vueVaccinMode === "grille"
                      ? "bg-[#005c30] text-white shadow-sm ring-2 ring-[#005c30]/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Grille Synthétique Officielle (UNICEF / PEV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVueVaccinMode("detail")}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    vueVaccinMode === "detail"
                      ? "bg-[#005c30] text-white shadow-sm ring-2 ring-[#005c30]/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Vue Détaillée Chronologique (Étapes)</span>
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* VUE 1 : GRILLE SYNTHÉTIQUE OFFICIELLE UNICEF / PEV BÉNIN  */}
            {/* ========================================================= */}
            {vueVaccinMode === "grille" && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4">
                <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                      <Baby className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-emerald-950">
                        Grille Intégrée PEV / Nutrition / Santé de l'Enfant (0 à 24 mois)
                      </h3>
                      <p className="text-[11px] text-emerald-800">
                        13 tranches d'âge • 16 lignes de vaccins et interventions prioritaires
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-900 bg-emerald-100/90 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
                    Norme Nationale Bénin
                  </span>
                </div>

                {/* Tableau à défilement horizontal */}
                <div className="overflow-x-auto px-2 sm:px-4 pb-2">
                  <table className="w-full min-w-[980px] border-collapse text-xs border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white text-[11px] font-bold">
                        <th className="p-2.5 text-left sticky left-0 z-20 bg-slate-900 min-w-[210px] border-r border-slate-700 shadow-sm">
                          Vaccins & Interventions
                        </th>
                        {COLONNES_AGES_CALENDRIER.map((col) => (
                          <th
                            key={col.id}
                            className="p-2 text-center border-l border-slate-700 min-w-[58px]"
                            title={col.label}
                          >
                            <span className="block text-slate-100 font-extrabold text-[11px]">
                              {col.short}
                            </span>
                            <span className="block text-[9px] text-slate-400 font-medium whitespace-nowrap">
                              {col.id.startsWith("s") ? "Semaine" : col.id.startsWith("m") ? "Mois" : "Vie"}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {LIGNES_GRILLE_OFFICIELLE_UNICEF.map((ligne, lIdx) => {
                        // Couleurs de fond de ligne
                        const bgLigne = 
                          ligne.couleurLigne === "PALUDISME" ? "bg-amber-100/80 hover:bg-amber-100 text-amber-950 font-medium" :
                          ligne.couleurLigne === "TPIN" ? "bg-emerald-100/90 hover:bg-emerald-100 text-emerald-950 font-medium" :
                          ligne.couleurLigne === "VITAMINE_A" ? "bg-cyan-100/80 hover:bg-cyan-100 text-cyan-950 font-medium" :
                          ligne.couleurLigne === "FIEVRE_JAUNE" ? "bg-yellow-100/80 hover:bg-yellow-100 text-yellow-950 font-medium" :
                          lIdx % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/60 hover:bg-slate-100/70";

                        const pillColor = 
                          ligne.couleurLigne === "PALUDISME" ? "bg-amber-500 text-white ring-2 ring-amber-300" :
                          ligne.couleurLigne === "TPIN" ? "bg-emerald-700 text-white ring-2 ring-emerald-300" :
                          ligne.couleurLigne === "VITAMINE_A" ? "bg-cyan-600 text-white ring-2 ring-cyan-200" :
                          ligne.couleurLigne === "FIEVRE_JAUNE" ? "bg-yellow-500 text-slate-950 ring-2 ring-yellow-200 font-black" :
                          "bg-blue-600 text-white ring-2 ring-blue-200";

                        return (
                          <tr key={lIdx} className={`${bgLigne} transition-colors border-b border-slate-200`}>
                            {/* Nom du vaccin / intervention (sticky à gauche) */}
                            <td className="p-2 sm:p-2.5 sticky left-0 z-10 bg-inherit border-r border-slate-200 shadow-xs">
                              <div className="leading-tight">
                                <span className="font-black text-xs block">
                                  {ligne.nom}
                                </span>
                                <span className="text-[10px] text-slate-500 block truncate max-w-[200px]" title={ligne.nomComplet}>
                                  {ligne.nomComplet}
                                </span>
                              </div>
                            </td>

                            {/* Doses par colonne d'âge */}
                            {COLONNES_AGES_CALENDRIER.map((col) => {
                              const dose = (ligne.doses as any)[col.id];
                              return (
                                <td
                                  key={col.id}
                                  className="p-1.5 text-center border-l border-slate-200 align-middle"
                                >
                                  {dose ? (
                                    <span
                                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black shadow-xs ${pillColor}`}
                                      title={`${ligne.nom} - ${col.label} (${dose})`}
                                    >
                                      {dose}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 text-xs font-light">·</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Légende officielle UNICEF & Ministère */}
                <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-3 text-xs text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider">
                        Légende officielle :
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold border border-amber-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        VAP (Paludisme 4 doses)
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-950 font-bold border border-emerald-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>
                        TPIn+ (SP 9 passages)
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-100 text-cyan-950 font-bold border border-cyan-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-600"></span>
                        Vitamine A (4 doses)
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-100 text-yellow-950 font-bold border border-yellow-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                        VAA (Fièvre jaune)
                      </span>
                    </div>

                    {/* Logo UNICEF / Ministère */}
                    <div className="flex items-center gap-2 text-right">
                      <div className="leading-tight">
                        <span className="text-[11px] font-black text-[#005c30] block">
                          Direction de la Vaccination (PEV)
                        </span>
                        <span className="text-[10px] font-bold text-sky-700 block tracking-tight">
                          unicef | for every child
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic leading-relaxed">
                    Les pastilles chiffrées (① à ⑨) indiquent l'ordre chronologique des doses prescrites. Tout enfant zéro-dose ou en retard vaccinal doit être activement ratissé par le Relais Communautaire et orienté sans délai vers le centre de santé le plus proche.
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* VUE 2 : TABLEAU DÉTAILLÉ DU NOURRISSON (0 à 18 mois)      */}
            {/* ========================================================= */}
            {vueVaccinMode === "detail" && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-b border-emerald-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Baby className="w-5 h-5 text-emerald-700" />
                  <h3 className="font-black text-sm sm:text-base text-emerald-950">
                    Schéma de Routine : Du Nouveau-né au Jeune Enfant (0 à 18 mois)
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-lg">
                  9 rendez-vous clés
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {CALENDRIER_VACCINAL_BENIN.nourrisson.map((etape, idx) => (
                  <div key={idx} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      
                      {/* Période / Âge */}
                      <div className="md:w-1/4 shrink-0">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-900 font-extrabold text-xs">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{etape.agePeriode}</span>
                        </div>
                      </div>

                      {/* Vaccins administrés */}
                      <div className="md:w-1/3 shrink-0 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">
                          Vaccins administrés
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {etape.vaccins.map((v, vIdx) => (
                            <div
                              key={vIdx}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-900 font-extrabold text-xs shadow-2xs"
                              title={`${v.nomComplet} (${v.voie})`}
                            >
                              <span className="text-emerald-950">{v.sigle}</span>
                              <span className="text-[10px] text-emerald-700 font-medium block">
                                {v.voie}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Maladies ciblées & Observations */}
                      <div className="md:w-5/12 space-y-1">
                        <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">
                          Protection conférée
                        </span>
                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                          {etape.maladiesCiblees}
                        </p>
                        <p className="text-[11px] text-slate-500 italic">
                          ℹ️ {etape.observations}
                        </p>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Autres cibles prioritaires du PEV Bénin (Jeunes filles HPV & Femmes enceintes Td) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CALENDRIER_VACCINAL_BENIN.ciblesSpeciales.map((spec, sIdx) => (
                <div
                  key={sIdx}
                  className="bg-white rounded-3xl p-5 border border-purple-200/80 shadow-sm space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-purple-100 text-purple-800">
                      <Users className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">
                        {spec.cible}
                      </h4>
                      <p className="text-xs font-bold text-purple-700">
                        {spec.vaccin}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-700 bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
                    <p>
                      <strong>Schéma :</strong> {spec.schema}
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      <strong>Objectif national :</strong> {spec.justification}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Rôle et Directives pour l'ASCQ et le Relais Communautaire */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2 font-black text-amber-950 text-sm sm:text-base">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span>Rôle de l'ASCQ et des Relais Communautaires dans la Vaccination</span>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-amber-950">
                {CALENDRIER_VACCINAL_BENIN.directivesTerrain.map((dir, dIdx) => (
                  <li key={dIdx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{dir}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 2+ : GUIDE DES MALADIES SIMR BÉNIN                */}
        {/* ========================================================= */}
        {activeTab !== "vaccins" && (
          <div className="space-y-4">
            
            {/* Compteur de résultats */}
            <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
              <span>
                {filteredMaladies.length} maladie(s) identifiée(s) pour cette sélection
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-emerald-700 font-bold hover:underline"
                >
                  Effacer la recherche
                </button>
              )}
            </div>

            {/* Liste des fiches de maladies */}
            <div className="grid grid-cols-1 gap-4">
              {filteredMaladies.map((m) => {
                const isExpanded = expandedId === m.id || searchQuery.length > 0;
                
                // Couleurs du badge
                const badgeConfig = {
                  URGENCE_IMMEDIATE: {
                    bg: "bg-red-50 text-red-800 border-red-200",
                    label: "Alerte Immédiate"
                  },
                  ELIMINATION: {
                    bg: "bg-purple-50 text-purple-800 border-purple-200",
                    label: "Élimination"
                  },
                  SANTE_PUBLIQUE: {
                    bg: "bg-blue-50 text-blue-800 border-blue-200",
                    label: "Santé Publique"
                  },
                  ALERTE_MONDIALE: {
                    bg: "bg-amber-50 text-amber-900 border-amber-200",
                    label: "Alerte Internationale"
                  }
                }[m.badgeUrgence];

                return (
                  <article
                    key={m.id}
                    className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow space-y-4"
                  >
                    
                    {/* En-tête de la maladie */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${badgeConfig.bg}`}>
                            {badgeConfig.label}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {m.categorieNom}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-slate-900">
                          {m.nom}
                        </h3>
                      </div>

                      {/* Bouton direct d'alerte */}
                      {m.boutonAlerte && (
                        <Link
                          href={`/fiches/alerte/nouvelle?motif=${encodeURIComponent(m.nom)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 shrink-0 self-start sm:self-auto transition-colors"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Alerter sur ce cas</span>
                        </Link>
                      )}
                    </div>

                    {/* C'est quoi ? (Définition simple) */}
                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      <strong className="text-slate-900 font-bold">C'est quoi ?</strong> {m.description}
                    </div>

                    {/* Signes qui alertent (Symptômes communautaires) */}
                    <div className="bg-amber-50/60 rounded-2xl p-3.5 sm:p-4 border border-amber-200/80 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 uppercase tracking-wide">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Signes qui doivent alerter la communauté</span>
                      </div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-amber-950 font-medium">
                        {m.signesAlerte.map((signe, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-1.5">
                            <span className="text-amber-600 font-bold">•</span>
                            <span>{signe}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Contexte spécifique Bénin & Conduite à tenir */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                      
                      {/* Contexte Bénin */}
                      <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Contexte & zones à risque au Bénin</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-[11px] sm:text-xs">
                          {m.contexteBenin}
                        </p>
                      </div>

                      {/* Conduite de l'ASCQ et du Relais */}
                      <div className="bg-emerald-50/60 rounded-2xl p-3.5 border border-emerald-200/80 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Que faire immédiatement (ASCQ / Relais)</span>
                        </div>
                        <p className="text-emerald-900 leading-relaxed text-[11px] sm:text-xs">
                          {m.conduiteAscq}
                        </p>
                      </div>

                    </div>

                  </article>
                );
              })}

              {filteredMaladies.length === 0 && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
                  <HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-base text-slate-800">
                    Aucune maladie ne correspond à votre recherche « {searchQuery} »
                  </h4>
                  <p className="text-xs text-slate-500">
                    Essayez avec un mot-clé plus simple comme « fièvre », « sang », « toux » ou « vaccin ».
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setActiveTab("tous");
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
