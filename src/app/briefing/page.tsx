"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
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
  TABLE_ORIENTATION_SIGNES,
  PROTOCOLES_SECOURISME,
  GUIDE_SANTE_MATERNELLE,
  ATTRIBUTIONS_OFFICIELLES_ASC,
  PROTOCOLE_VAD_OFFICIEL,
  NUMEROS_URGENCE_BENIN,
  SigneOrientation,
  ProtocoleSecourisme,
  FichePratiqueMaternelle
} from "@/data/guideCliniquePratique";
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
  HelpCircle,
  Clock,
  Sparkles,
  Baby,
  Users,
  Flame,
  Globe2,
  FileText,
  PhoneCall,
  HeartPulse,
  Ban,
  ShieldCheck,
  Thermometer,
  Droplets,
  Wind,
  Brain,
  Heart,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Info
} from "lucide-react";

type MainTab = 
  | "signes" 
  | "maladies" 
  | "vaccins" 
  | "maternelle" 
  | "secourisme" 
  | "organisation";

type MaladieSubFilter = 
  | "tous" 
  | "epidemies" 
  | "elimination" 
  | "sante_publique" 
  | "portee_internationale";

export default function BriefingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Navigation par Onglets
  const [activeTab, setActiveTab] = useState<MainTab>("signes");
  const [maladieFilter, setMaladieFilter] = useState<MaladieSubFilter>("tous");
  const [signeCategoryFilter, setSigneCategoryFilter] = useState<string>("tous");
  
  // Recherche globale
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modes d'affichage
  const [vueVaccinMode, setVueVaccinMode] = useState<"grille" | "detail">("grille");
  const [expandedDiseaseId, setExpandedDiseaseId] = useState<string | null>(null);
  const [selectedSecourismeId, setSelectedSecourismeId] = useState<string | null>(null);

  // Vérification de sécurité de la session
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

  // Filtrage des signes cliniques (« Je vois... je pense à... »)
  const filteredSignes = useMemo(() => {
    return TABLE_ORIENTATION_SIGNES.filter((s) => {
      if (signeCategoryFilter !== "tous" && s.iconType !== signeCategoryFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.signePrincipal.toLowerCase().includes(q) ||
        s.descriptionSigne.toLowerCase().includes(q) ||
        s.maladieCible.toLowerCase().includes(q) ||
        s.conduiteImmediate.toLowerCase().includes(q)
      );
    });
  }, [signeCategoryFilter, searchQuery]);

  // Filtrage des maladies SIMR (34)
  const filteredMaladies = useMemo(() => {
    return GUIDE_MALADIES_SIMR.filter((m) => {
      if (maladieFilter !== "tous" && m.categorieId !== maladieFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inNom = m.nom.toLowerCase().includes(q);
      const inDesc = m.description.toLowerCase().includes(q);
      const inSignes = m.signesAlerte.some((s) => s.toLowerCase().includes(q));
      const inContexte = m.contexteBenin.toLowerCase().includes(q);
      const inConduite = m.conduiteAscq.toLowerCase().includes(q);
      return inNom || inDesc || inSignes || inContexte || inConduite;
    });
  }, [maladieFilter, searchQuery]);

  // Filtrage secourisme
  const filteredSecourisme = useMemo(() => {
    if (!searchQuery.trim()) return PROTOCOLES_SECOURISME;
    const q = searchQuery.toLowerCase();
    return PROTOCOLES_SECOURISME.filter(p => 
      p.titre.toLowerCase().includes(q) ||
      p.situation.toLowerCase().includes(q) ||
      p.gestesCles.some(g => g.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Filtrage santé maternelle
  const filteredMaternelle = useMemo(() => {
    if (!searchQuery.trim()) return GUIDE_SANTE_MATERNELLE;
    const q = searchQuery.toLowerCase();
    return GUIDE_SANTE_MATERNELLE.filter(m => 
      m.titre.toLowerCase().includes(q) ||
      m.pointsCles.some(p => p.toLowerCase().includes(q)) ||
      m.signesDanger.some(s => s.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#005c30] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-bold text-xs sm:text-sm text-slate-700">
            Chargement du Centre de Référence Clinique & Guides Nationaux...
          </p>
        </div>
      </div>
    );
  }

  const retourLien = currentUser?.poste === "RC" ? "/espace-rc" : "/espace-ascq";

  // Helper pour l'icône de signe clinique
  const renderSigneIcon = (type: string) => {
    switch (type) {
      case "fever": return <Thermometer className="w-5 h-5 text-red-600" />;
      case "diarrhea": return <Droplets className="w-5 h-5 text-amber-600" />;
      case "lungs": return <Wind className="w-5 h-5 text-blue-600" />;
      case "neuro": return <Brain className="w-5 h-5 text-purple-600" />;
      case "skin": return <Sparkles className="w-5 h-5 text-rose-600" />;
      case "maternal": return <Baby className="w-5 h-5 text-pink-600" />;
      case "bite": return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      default: return <Activity className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-800 antialiased pb-24">
      
      {/* 1. Header Officiel */}
      {currentUser?.poste === "RC" ? (
        <header className="bg-[#005c30] text-white shadow-md print:hidden">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
            <Link href={retourLien} className="flex items-center gap-2 text-white hover:text-emerald-200 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold">Retour Espace RC</span>
            </Link>
            <div className="text-center truncate">
              <h1 className="text-xs sm:text-sm font-extrabold truncate">Guide Clinique & Pratique ASCQ / RC</h1>
              <span className="text-[10px] text-emerald-200">République du Bénin • Ministère de la Santé</span>
            </div>
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

      {/* 2. Bandeau National & Numéros d'urgence */}
      <div className="bg-gradient-to-b from-[#005c30]/15 via-[#005c30]/5 to-transparent pt-6 pb-4">
        <div className="max-w-6xl mx-auto px-4 space-y-4">
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 font-black text-[11px] uppercase tracking-wider mb-2 border border-emerald-200 shadow-2xs">
                <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                <span>Centre National de Référence Clinique Communautaire</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Guide des Pratiques, Maladies SIMR & PEV
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                Référentiel officiel standardisé à l'usage des <strong>ASCQ</strong>, <strong>Relais Communautaires</strong>, équipes d'arrondissement et superviseurs. Conforme au <em>Guide de l'ASC (CNLS-TP Présidence du Bénin, 2020)</em> et au <em>Guide Communautaire des Maladies sous Surveillance (SIMR & PEV, Octobre 2026)</em>.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Link
                href="/fiches/alerte/nouvelle"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md active:scale-95 transition-all"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Déclencher une alerte</span>
              </Link>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs border border-slate-200 shadow-xs transition-colors"
                title="Imprimer ce guide complet ou sauvegarder en PDF"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Imprimer / PDF</span>
              </button>
            </div>
          </div>

          {/* Bandeau permanent des numéros d'urgence nationaux */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-1.5 tracking-wider">
                <PhoneCall className="w-3.5 h-3.5 text-red-600" />
                Lignes d'Urgence Sanitaire & Secours au Bénin (Appel Direct) :
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">24h/24 • 7j/7</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {NUMEROS_URGENCE_BENIN.map((num, nIdx) => (
                <a
                  key={nIdx}
                  href={num.call}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition-all group flex flex-col justify-between"
                  title={`Appeler ${num.nom}`}
                >
                  <span className="text-[10px] text-slate-500 font-bold block truncate">
                    {num.badge}
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-black text-xs text-slate-900 group-hover:text-emerald-700">
                      {num.numero}
                    </span>
                    <PhoneCall className="w-3 h-3 text-emerald-600 group-hover:scale-110 transition-transform" />
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Barre de Recherche Globale */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par signe, maladie, vaccin, urgence, geste ou mot-clé (ex: diarrhée riz, lassa, cordon 7,1%, shakir, étouffement, samu...)"
              className="w-full text-xs sm:text-sm rounded-2xl border border-slate-200 bg-white pl-11 pr-10 py-3 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#005c30] focus:border-transparent placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* 3. Sélecteur des Grands Thèmes Professionnels */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 pb-1">
            
            {/* Onglet 1 : Orientation par le signe */}
            <button
              onClick={() => { setActiveTab("signes"); }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-2xs ${
                activeTab === "signes"
                  ? "bg-[#005c30] text-white ring-2 ring-[#005c30]/20"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-emerald-300" />
              <span>« Je vois... je pense à... » ({TABLE_ORIENTATION_SIGNES.length})</span>
            </button>

            {/* Onglet 2 : Maladies SIMR */}
            <button
              onClick={() => { setActiveTab("maladies"); }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-2xs ${
                activeTab === "maladies"
                  ? "bg-[#005c30] text-white ring-2 ring-[#005c30]/20"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Maladies SIMR ({GUIDE_MALADIES_SIMR.length})</span>
            </button>

            {/* Onglet 3 : Calendrier PEV */}
            <button
              onClick={() => { setActiveTab("vaccins"); }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-2xs ${
                activeTab === "vaccins"
                  ? "bg-[#005c30] text-white ring-2 ring-[#005c30]/20"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Syringe className="w-3.5 h-3.5 text-teal-300" />
              <span>Calendrier Vaccinal (PEV)</span>
            </button>

            {/* Onglet 4 : Santé Maternelle & CPN */}
            <button
              onClick={() => { setActiveTab("maternelle"); }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-2xs ${
                activeTab === "maternelle"
                  ? "bg-[#005c30] text-white ring-2 ring-[#005c30]/20"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Baby className="w-3.5 h-3.5 text-pink-300" />
              <span>Santé Maternelle & Nouveau-Né</span>
            </button>

            {/* Onglet 5 : Secourisme d'Urgence */}
            <button
              onClick={() => { setActiveTab("secourisme"); }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-2xs ${
                activeTab === "secourisme"
                  ? "bg-red-700 text-white ring-2 ring-red-700/20"
                  : "bg-white text-red-700 hover:bg-red-50 border border-red-200"
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5 text-red-300" />
              <span>Secourisme & Premiers Gestes</span>
            </button>

            {/* Onglet 6 : Organisation ASC & VAD */}
            <button
              onClick={() => { setActiveTab("organisation"); }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-2xs ${
                activeTab === "organisation"
                  ? "bg-[#005c30] text-white ring-2 ring-[#005c30]/20"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
              <span>Organisation & VAD Terrain</span>
            </button>

          </div>

        </div>
      </div>

      {/* 4. Contenu Principal */}
      <main className="max-w-6xl mx-auto px-4 mt-4">
        
        {/* ========================================================= */}
        {/* THÈME 1 : TABLE D'ORIENTATION RAPIDE (« Je vois... »)      */}
        {/* ========================================================= */}
        {activeTab === "signes" && (
          <div className="space-y-4">
            
            {/* Entête thématique */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-2xs relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-950">
                    Outil de Triage Clinique Communautaire
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    Table d'Orientation Clinique : « Je vois… je pense à… »
                  </h2>
                  <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                    Face à un patient ou un événement sanitaire inhabituel dans la communauté, identifiez immédiatement le tableau clinique, la pathologie sous surveillance suspectée et la conduite à tenir sans perte de temps.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-500">
                    {filteredSignes.length} situation(s) listée(s)
                  </span>
                </div>
              </div>

              {/* Sous-filtres par catégorie de signes */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: "tous", label: "Tous les signes" },
                  { id: "fever", label: "🌡️ Fièvre" },
                  { id: "diarrhea", label: "💧 Diarrhée & Digestif" },
                  { id: "lungs", label: "🫁 Respiration & Toux" },
                  { id: "neuro", label: "🧠 Neurologique & Paralysie" },
                  { id: "skin", label: "🩹 Peau & Éruptions" },
                  { id: "bite", label: "🐍 Morsures & Venins" },
                  { id: "maternal", label: "🤰 Mère & Nouveau-né" }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSigneCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      signeCategoryFilter === cat.id
                        ? "bg-[#005c30] text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grille des cartes de signes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSignes.map((signe) => {
                const badgeAlert = {
                  URGENCE_IMMEDIATE: { bg: "bg-red-50 text-red-800 border-red-200", label: "Urgence Immédiate" },
                  ELIMINATION: { bg: "bg-purple-50 text-purple-800 border-purple-200", label: "Élimination" },
                  SANTE_PUBLIQUE: { bg: "bg-blue-50 text-blue-800 border-blue-200", label: "Santé Publique" },
                  ALERTE_MONDIALE: { bg: "bg-amber-50 text-amber-900 border-amber-200", label: "Alerte RSI" },
                }[signe.niveauAlerte];

                return (
                  <div
                    key={signe.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                            {renderSigneIcon(signe.iconType)}
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              Je vois...
                            </span>
                            <h3 className="font-black text-sm sm:text-base text-slate-900 leading-snug">
                              {signe.signePrincipal}
                            </h3>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider shrink-0 ${badgeAlert.bg}`}>
                          {badgeAlert.label}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed pl-10">
                        {signe.descriptionSigne}
                      </p>

                      <div className="bg-emerald-50/70 rounded-2xl p-3 border border-emerald-200/80 space-y-1">
                        <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                          👉 Je pense immédiatement à :
                        </span>
                        <p className="font-extrabold text-xs sm:text-sm text-emerald-950">
                          {signe.maladieCible}
                        </p>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                          ⚡ Conduite réflexe de l'ASCQ / RC :
                        </span>
                        <p className="text-xs text-slate-800 leading-relaxed">
                          {signe.conduiteImmediate}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setActiveTab("maladies");
                          setSearchQuery(signe.maladieCible.split(" ")[0]);
                        }}
                        className="text-xs font-bold text-[#005c30] hover:underline inline-flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Consulter la fiche maladie</span>
                      </button>

                      <Link
                        href={`/fiches/alerte/nouvelle?motif=${encodeURIComponent(signe.maladieCible)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-colors"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Alerter</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredSignes.length === 0 && (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
                <HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="font-bold text-sm text-slate-700">Aucun signe ne correspond à votre recherche « {searchQuery} ».</p>
                <button
                  onClick={() => { setSearchQuery(""); setSigneCategoryFilter("tous"); }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Réinitialiser
                </button>
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* THÈME 2 : LES 34 MALADIES SIMR BÉNIN                       */}
        {/* ========================================================= */}
        {activeTab === "maladies" && (
          <div className="space-y-4">
            
            {/* Sélecteur de sous-catégories SIMR */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setMaladieFilter("tous")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  maladieFilter === "tous"
                    ? "bg-[#005c30] text-white shadow-2xs"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                Toutes ({GUIDE_MALADIES_SIMR.length})
              </button>
              <button
                onClick={() => setMaladieFilter("epidemies")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  maladieFilter === "epidemies"
                    ? "bg-red-700 text-white shadow-2xs"
                    : "bg-white text-red-700 border border-red-200 hover:bg-red-50"
                }`}
              >
                <Flame className="w-3.5 h-3.5 inline mr-1" />
                Potentiel Épidémique (13)
              </button>
              <button
                onClick={() => setMaladieFilter("elimination")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  maladieFilter === "elimination"
                    ? "bg-purple-700 text-white shadow-2xs"
                    : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 inline mr-1" />
                Élimination & Éradication (9)
              </button>
              <button
                onClick={() => setMaladieFilter("sante_publique")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  maladieFilter === "sante_publique"
                    ? "bg-blue-700 text-white shadow-2xs"
                    : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                }`}
              >
                <Activity className="w-3.5 h-3.5 inline mr-1" />
                Santé Publique & iCCM (10)
              </button>
              <button
                onClick={() => setMaladieFilter("portee_internationale")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  maladieFilter === "portee_internationale"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
                }`}
              >
                <Globe2 className="w-3.5 h-3.5 inline mr-1" />
                Portée Internationale (2)
              </button>
            </div>

            {/* Compteur */}
            <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
              <span>{filteredMaladies.length} maladie(s) répertoriée(s)</span>
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-emerald-700 font-bold hover:underline">
                  Effacer le filtre
                </button>
              )}
            </div>

            {/* Liste des Fiches SIMR */}
            <div className="grid grid-cols-1 gap-4">
              {filteredMaladies.map((m) => {
                const isExpanded = expandedDiseaseId === m.id || searchQuery.length > 0;
                const badgeAlert = {
                  URGENCE_IMMEDIATE: { bg: "bg-red-50 text-red-800 border-red-200", label: "Urgence Immédiate" },
                  ELIMINATION: { bg: "bg-purple-50 text-purple-800 border-purple-200", label: "Élimination" },
                  SANTE_PUBLIQUE: { bg: "bg-blue-50 text-blue-800 border-blue-200", label: "Santé Publique" },
                  ALERTE_MONDIALE: { bg: "bg-amber-50 text-amber-900 border-amber-200", label: "Alerte RSI" },
                }[m.badgeUrgence];

                return (
                  <article
                    key={m.id}
                    className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${badgeAlert.bg}`}>
                            {badgeAlert.label}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {m.categorieNom}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-slate-900">
                          {m.nom}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {m.boutonAlerte && (
                          <Link
                            href={`/fiches/alerte/nouvelle?motif=${encodeURIComponent(m.nom)}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 shrink-0 transition-colors"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Alerter sur ce cas</span>
                          </Link>
                        )}
                        <button
                          onClick={() => setExpandedDiseaseId(isExpanded ? null : m.id)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 sm:hidden"
                          title="Déplier / Replier"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      <strong className="text-slate-900 font-bold">C'est quoi ?</strong> {m.description}
                    </div>

                    {/* Signes d'alerte */}
                    <div className="bg-amber-50/70 rounded-2xl p-3.5 sm:p-4 border border-amber-200/80 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 uppercase tracking-wide">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Signes communautaires qui doivent alerter</span>
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

                    {/* Bloc repliable sur mobile si non cherché */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs ${!isExpanded ? "hidden sm:grid" : "grid"}`}>
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

                      {/* Conduite immédiate */}
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
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* THÈME 3 : CALENDRIER VACCINAL OFFICIEL PEV BÉNIN          */}
        {/* ========================================================= */}
        {activeTab === "vaccins" && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-2xs relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Syringe className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      Programme Élargi de Vaccination (PEV Bénin) & UNICEF
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      Calendrier Vaccinal de Routine & Supplémentation Nutritionnelle
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                      {CALENDRIER_VACCINAL_BENIN.introduction}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-colors shrink-0 print:hidden"
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <span>Imprimer le Calendrier</span>
                </button>
              </div>

              {/* Mode d'affichage */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => setVueVaccinMode("grille")}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    vueVaccinMode === "grille"
                      ? "bg-[#005c30] text-white shadow-2xs ring-2 ring-[#005c30]/20"
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
                      ? "bg-[#005c30] text-white shadow-2xs ring-2 ring-[#005c30]/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Vue Détaillée Chronologique (Étapes)</span>
                </button>
              </div>
            </div>

            {/* VUE 1 : GRILLE UNICEF */}
            {vueVaccinMode === "grille" && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-4">
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
                  <span className="text-[10px] font-extrabold text-emerald-900 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
                    Norme Nationale Bénin
                  </span>
                </div>

                <div className="overflow-x-auto px-2 sm:px-4 pb-2">
                  <table className="w-full min-w-[980px] border-collapse text-xs border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
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
                            <td className="p-2 sm:p-2.5 sticky left-0 z-10 bg-inherit border-r border-slate-200 shadow-2xs">
                              <div className="leading-tight">
                                <span className="font-black text-xs block">{ligne.nom}</span>
                                <span className="text-[10px] text-slate-500 block truncate max-w-[200px]" title={ligne.nomComplet}>
                                  {ligne.nomComplet}
                                </span>
                              </div>
                            </td>

                            {COLONNES_AGES_CALENDRIER.map((col) => {
                              const dose = (ligne.doses as any)[col.id];
                              return (
                                <td key={col.id} className="p-1.5 text-center border-l border-slate-200 align-middle">
                                  {dose ? (
                                    <span
                                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black shadow-2xs ${pillColor}`}
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

                {/* Légende officielle */}
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

                    <div className="leading-tight text-right">
                      <span className="text-[11px] font-black text-[#005c30] block">
                        Direction de la Vaccination (PEV)
                      </span>
                      <span className="text-[10px] font-bold text-sky-700 block tracking-tight">
                        unicef | for every child
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    Tout enfant zéro-dose ou en retard vaccinal doit être activement recherché par le Relais Communautaire et orienté sans délai vers le centre de santé.
                  </p>
                </div>
              </div>
            )}

            {/* VUE 2 : DÉTAIL CHRONOLOGIQUE */}
            {vueVaccinMode === "detail" && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden divide-y divide-slate-100">
                <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-b border-emerald-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Baby className="w-5 h-5 text-emerald-700" />
                    <h3 className="font-black text-sm sm:text-base text-emerald-950">
                      Schéma de Routine : Du Nouveau-né au Jeune Enfant (0 à 18 mois)
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg">
                    9 rendez-vous clés
                  </span>
                </div>

                {CALENDRIER_VACCINAL_BENIN.nourrisson.map((etape, idx) => (
                  <div key={idx} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="md:w-1/4 shrink-0">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-900 font-extrabold text-xs">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{etape.agePeriode}</span>
                        </div>
                      </div>

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
                              <span className="text-[10px] text-emerald-700 font-medium block">{v.voie}</span>
                            </div>
                          ))}
                        </div>
                      </div>

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
            )}

            {/* Cibles spéciales : Jeunes filles HPV & Femmes enceintes Td */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CALENDRIER_VACCINAL_BENIN.ciblesSpeciales.map((spec, sIdx) => (
                <div key={sIdx} className="bg-white rounded-3xl p-5 border border-purple-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-purple-100 text-purple-800">
                      <Users className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">{spec.cible}</h4>
                      <p className="text-xs font-bold text-purple-700">{spec.vaccin}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-slate-700 bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
                    <p><strong>Schéma :</strong> {spec.schema}</p>
                    <p className="text-slate-600 leading-relaxed"><strong>Objectif national :</strong> {spec.justification}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Directives de terrain */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 font-black text-amber-950 text-sm sm:text-base">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span>Rôle de l'ASCQ et du Relais Communautaire dans la Vaccination</span>
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
        {/* THÈME 4 : SANTÉ MATERNELLE, NOUVEAU-NÉ & PLANIFICATION PF */}
        {/* ========================================================= */}
        {activeTab === "maternelle" && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-2xs relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
                  <Baby className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-pink-100 text-pink-900">
                    Guide National de l'ASC • CNLS-TP Bénin
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    Santé Maternelle, Nouveau-Né & Planification Familiale (PF)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
                    Protocoles officiels pour le suivi de la grossesse (8 CPN), les soins essentiels au nouveau-né (Chlorhexidine 7,1%, méthode Kangourou), les consultations postnatales (CPoN) et l'espacement sain des naissances.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {filteredMaternelle.map((fiche) => (
                <div
                  key={fiche.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-pink-700 block">
                        {fiche.periode}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        {fiche.titre}
                      </h3>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-pink-50 text-pink-800 border border-pink-200 text-xs font-bold self-start sm:self-auto">
                      Norme Nationale Bénin
                    </span>
                  </div>

                  {/* Points clés */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Prescriptions & Recommandations Officielles :
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-700 pl-2">
                      {fiche.pointsCles.map((pt, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span className="leading-relaxed">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Signes de danger (Alerte Rouge) */}
                  <div className="bg-red-50/80 rounded-2xl p-4 border border-red-200 space-y-2">
                    <span className="text-xs font-black uppercase text-red-900 tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      Signes de Danger Absolu (Référer d'URGENCE à la maternité) :
                    </span>
                    <ul className="space-y-1.5 text-xs text-red-950 font-medium pl-2">
                      {fiche.signesDanger.map((sd, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">⚠️</span>
                          <span className="leading-relaxed">{sd}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Conduite ASCQ */}
                  <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/80 space-y-2">
                    <span className="text-xs font-black uppercase text-emerald-950 tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      Actions de Terrain de l'ASCQ et du Relais :
                    </span>
                    <ul className="space-y-1.5 text-xs text-emerald-950 pl-2">
                      {fiche.conduiteAscq.map((ca, cIdx) => (
                        <li key={cIdx} className="flex items-start gap-2">
                          <span className="text-emerald-700 font-bold">✓</span>
                          <span className="leading-relaxed">{ca}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>
              ))}
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* THÈME 5 : SECOURISME D'URGENCE & PREMIERS GESTES           */}
        {/* ========================================================= */}
        {activeTab === "secourisme" && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-red-200 shadow-2xs relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-red-100 text-red-900">
                      Module Secourisme • CNLS-TP Bénin & SAMU
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      Protocoles de Secourisme & Premiers Gestes Vitaux
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
                      Conduite réflexe de l'ASCQ et du Relais Communautaire face aux défaillances vitales et traumatismes graves dans les ménages et la communauté avant l'évacuation médicale.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <a
                    href="tel:+22921307336"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition-all"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>SAMU : 21 30 73 36</span>
                  </a>
                  <a
                    href="tel:118"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md transition-all"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Pompiers : 118</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Liste des protocoles de secourisme */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSecourisme.map((protocole) => (
                <div
                  key={protocole.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="text-[10px] font-black uppercase text-red-600 tracking-wider block">
                          Situation d'Urgence
                        </span>
                        <h3 className="font-black text-base text-slate-900 leading-snug">
                          {protocole.titre}
                        </h3>
                      </div>
                      <span className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                        <HeartPulse className="w-4 h-4" />
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 italic">
                      🎯 {protocole.situation}
                    </p>

                    {/* Gestes clés obligatoires */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider block">
                        ✅ Gestes Clés Immédiats :
                      </span>
                      <ol className="space-y-1.5 text-xs text-slate-800 pl-1">
                        {protocole.gestesCles.map((geste, gIdx) => (
                          <li key={gIdx} className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] shrink-0 mt-0.5">
                              {gIdx + 1}
                            </span>
                            <span className="leading-relaxed">{geste}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Ce qui est STRICTEMENT INTERDIT */}
                    <div className="bg-red-50/90 rounded-2xl p-3.5 border border-red-200 space-y-1.5">
                      <span className="text-[11px] font-black uppercase text-red-900 tracking-wider flex items-center gap-1.5">
                        <Ban className="w-3.5 h-3.5 text-red-600" />
                        Ce qui est STRICTEMENT INTERDIT :
                      </span>
                      <ul className="space-y-1 text-xs text-red-950 font-medium pl-1">
                        {protocole.interdictions.map((interdit, iIdx) => (
                          <li key={iIdx} className="flex items-start gap-1.5">
                            <span className="text-red-600 font-bold">✕</span>
                            <span className="leading-relaxed">{interdit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold truncate max-w-[200px]">
                      🚨 {protocole.alerteNumero}
                    </span>
                    <a
                      href={protocole.alerteNumero.includes("118") ? "tel:118" : "tel:+22921307336"}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 text-white font-black hover:bg-red-700 transition-colors shrink-0"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Appeler Secours</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* THÈME 6 : ORGANISATION, VAD & ATTRIBUTIONS ASCQ / RC       */}
        {/* ========================================================= */}
        {activeTab === "organisation" && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-2xs relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900">
                    Cadre Opérationnel & Déontologique • Présidence du Bénin
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    Attributions Officielles, Protocole VAD & Règle PEPS/FEFO
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
                    Normes d'encadrement, répartition des rôles entre le Relais Communautaire (RC) et l'ASCQ, les 6 étapes officielles de la Visite à Domicile (VAD), et les règles d'intégrité déontologique.
                  </p>
                </div>
              </div>
            </div>

            {/* Protocole Standardisé de VAD en 6 Étapes */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                    Méthodologie Officielle
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {PROTOCOLE_VAD_OFFICIEL.titre}
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                  {PROTOCOLE_VAD_OFFICIEL.normePortefeuille}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {PROTOCOLE_VAD_OFFICIEL.etapesDeroulement.map((et) => (
                  <div key={et.etape} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#005c30] text-white font-black text-xs flex items-center justify-center shrink-0">
                        {et.etape}
                      </span>
                      <h4 className="font-black text-xs sm:text-sm text-slate-900">
                        {et.titre}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pl-8">
                      {et.actions}
                    </p>
                  </div>
                ))}
              </div>

              {/* Règles d'or ASC */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-black uppercase text-emerald-950 tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Les 4 Règles d'Or Déontologiques pendant la VAD :
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-950 font-medium pl-1">
                  {PROTOCOLE_VAD_OFFICIEL.reglesOrAscq.map((ro, rIdx) => (
                    <li key={rIdx} className="flex items-start gap-1.5">
                      <span className="text-emerald-700 font-bold">•</span>
                      <span>{ro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Attributions comparatives RC vs ASCQ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {ATTRIBUTIONS_OFFICIELLES_ASC.map((profil) => (
                <div
                  key={profil.poste}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center text-white ${
                        profil.poste === "ASCQ" ? "bg-[#005c30]" : "bg-teal-700"
                      }`}>
                        {profil.poste}
                      </span>
                      <div>
                        <h4 className="font-black text-sm sm:text-base text-slate-900">
                          {profil.titre}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">Niveau réglementaire</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    « {profil.missionGenerale} »
                  </p>

                  <div className="space-y-2">
                    <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider block">
                      📌 Activités Principales Réglementaires :
                    </span>
                    <ul className="space-y-1 text-xs text-slate-700 pl-1">
                      {profil.activitesPrincipales.map((act, aIdx) => (
                        <li key={aIdx} className="flex items-start gap-1.5">
                          <span className="text-[#005c30] font-bold">✓</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actes interdits */}
                  <div className="bg-red-50/90 rounded-2xl p-4 border border-red-200 space-y-2">
                    <span className="text-xs font-black uppercase text-red-900 tracking-wider flex items-center gap-1.5">
                      <Ban className="w-4 h-4 text-red-600" />
                      Actes STRICTEMENT INTERDITS au {profil.poste} :
                    </span>
                    <ul className="space-y-1.5 text-xs text-red-950 font-medium pl-1">
                      {profil.actesInterdits.map((interdit, iIdx) => (
                        <li key={iIdx} className="flex items-start gap-1.5">
                          <span className="text-red-600 font-bold">✕</span>
                          <span>{interdit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>
              ))}
            </div>

            {/* Règle de gestion des intrants FEFO / PEPS */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-900">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <h4 className="font-black text-sm sm:text-base text-slate-900">
                  Gestion Logistique des Produits de Santé : Règle PEPS / FEFO
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tout produit de santé (tests de dépistage rapide TDR, combinaisons thérapeutiques à base d'artémisinine CTA, sachets de SRO, comprimés de Zinc, Aquatabs) doit être conservé dans un <strong>caisson métallique étanche et sécurisé</strong> à l'abri de l'humidité et des rongeurs.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block font-black">1. Règle FEFO / PEPS</strong>
                  <span className="text-slate-600 text-[11px]">« Premier Périmé, Premier Sorti ». Toujours distribuer en priorité les lots ayant la date d'expiration la plus proche.</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block font-black">2. Inventaire Physique</strong>
                  <span className="text-slate-600 text-[11px]">Inventaire mensuel obligatoire avec fiche de stock à jour. Signalement immédiat de tout risque de rupture de stock.</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block font-black">3. Gratuité Absolue</strong>
                  <span className="text-slate-600 text-[11px]">Interdiction formelle de vendre ou d'échanger les médicaments et intrants fournis gratuitement par l'État.</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
