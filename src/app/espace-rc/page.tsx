"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import NetworkStatusIndicator from "@/components/NetworkStatusIndicator";
import { 
  FileText, 
  Bell, 
  User, 
  AlertTriangle, 
  Phone, 
  MapPin, 
  LogOut, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Activity, 
  Skull, 
  ClipboardList,
  RefreshCw,
  Lock,
  Calendar,
  Building2,
  HeartPulse,
  Plus,
  Check,
  Trash2,
  WifiOff,
  ExternalLink,
  Printer
} from "lucide-react";
import { getCachedRcSpace, saveCachedRcSpace, saveCachedUserSession } from "@/lib/offline-sync";
import FicheHebdoActivitesRcOfficielle from "@/components/FicheHebdoActivitesRcOfficielle";

export default function EspaceRelaisPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"fiches" | "planning" | "notifications" | "compte">("fiches");
  const [rcData, setRcData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [planningMode, setPlanningMode] = useState<"officielle" | "rapide">("officielle");

  // Planning hebdomadaire du Relais
  const [planningTaches, setPlanningTaches] = useState<Array<{ id: string; jour: string; activite: string; fait: boolean }>>([
    { id: "1", jour: "Lundi", activite: "Visites à Domicile (VAD) - 5 ménages cibles", fait: true },
    { id: "2", jour: "Mardi", activite: "Recherche active & Dépistage iCCM (TDR Paludisme)", fait: false },
    { id: "3", jour: "Mercredi", activite: "Sensibilisation hygiène & eau potable au quartier", fait: false },
    { id: "4", jour: "Jeudi", activite: "Ratissage des enfants sous-vaccinés (Calendrier PEV)", fait: false },
    { id: "5", jour: "Vendredi", activite: "Point hebdomadaire et transmission des fiches à l'ASCQ", fait: false },
  ]);
  const [nouvelleTacheJour, setNouvelleTacheJour] = useState("Lundi");
  const [nouvelleTacheTitre, setNouvelleTacheTitre] = useState("");

  // Changement de mot de passe dans Mon compte
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmMdp, setConfirmMdp] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ text: string; error: boolean } | null>(null);

  const [isOffline, setIsOffline] = useState(false);

  const loadProfile = async () => {
    setLoading(true);

    // 1. Charger immédiatement le cache local du Relais s'il existe
    const cached = getCachedRcSpace();
    if (cached) {
      setRcData(cached);
      setLoading(false);
    }

    if (!navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("obtenir_espace_rc");
      if (error) {
        if (cached) {
          setIsOffline(true);
          return;
        }
        router.push("/connexion");
        return;
      }

      setRcData(data);
      saveCachedRcSpace(data);

      // Si le code temporaire n'a pas encore été changé, forcer la redirection
      if (data && data.code_temporaire_utilise === false) {
        router.push("/relais/premiere-connexion");
      }

    } catch (err) {
      console.warn("Erreur réseau chargement profil RC, maintien hors-ligne:", err);
      if (cached) {
        setIsOffline(true);
      } else {
        router.push("/connexion");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/connexion");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdMsg(null);

    if (nouveauMdp.length < 6) {
      setPwdMsg({ text: "Le mot de passe doit comporter au moins 6 caractères.", error: true });
      setPwdLoading(false);
      return;
    }

    if (nouveauMdp !== confirmMdp) {
      setPwdMsg({ text: "Les mots de passe ne correspondent pas.", error: true });
      setPwdLoading(false);
      return;
    }

    try {
      const { error } = await supabase.rpc("definir_mot_de_passe_rc", {
        p_nouveau_mot_de_passe: nouveauMdp,
      });

      if (error) throw error;

      setPwdMsg({ text: "Mot de passe modifié avec succès !", error: false });
      setNouveauMdp("");
      setConfirmMdp("");
      setTimeout(() => setIsChangingPassword(false), 2000);
    } catch (err: any) {
      setPwdMsg({ text: err.message || "Erreur lors de la modification du mot de passe.", error: true });
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="text-center space-y-2 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#005c30]" />
          <p className="text-xs font-semibold">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-20">
      
      {/* 1. En-tête officiel du Relais Communautaire */}
      <header className="bg-[#005c30] text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-md sm:max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              <Image
                src="/logo-ascq.png"
                alt="Logo ASCQ Bénin"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight leading-tight">
                Espace Relais Communautaire
              </h1>
              <p className="text-[11px] text-white/80">
                {rcData ? `${rcData.prenoms} ${rcData.nom}` : "Relais Communautaire"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NetworkStatusIndicator />
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bandeau tricolore béninois */}
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-md sm:max-w-lg mx-auto px-4 pt-5 space-y-4">

        {isOffline && (
          <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-xs text-amber-950 flex items-start gap-2 shadow-sm">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-900 font-extrabold">Zone sans réseau internet</strong>
              <p className="text-amber-800 text-[11px]">
                Vous pouvez continuer à remplir vos fiches d'alertes, registres et références. Elles sont sauvegardées sur votre téléphone et seront envoyées automatiquement dès la reconnexion.
              </p>
            </div>
          </div>
        )}
        
        {/* Barre de navigation simple du RC (4 onglets prévus : fiches, planning, notifications, compte) */}
        <nav className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600 gap-0.5">
          <button
            onClick={() => setActiveTab("fiches")}
            className={`flex-1 py-2.5 px-1 text-center rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === "fiches"
                ? "bg-[#e0f2e9] text-[#005c30]"
                : "hover:text-slate-900"
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">Fiches</span>
          </button>

          <button
            onClick={() => setActiveTab("planning")}
            className={`flex-1 py-2.5 px-1 text-center rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === "planning"
                ? "bg-[#e0f2e9] text-[#005c30]"
                : "hover:text-slate-900"
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="truncate">Planning</span>
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex-1 py-2.5 px-1 text-center rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === "notifications"
                ? "bg-[#e0f2e9] text-[#005c30]"
                : "hover:text-slate-900"
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span className="truncate">Alertes</span>
          </button>

          <button
            onClick={() => setActiveTab("compte")}
            className={`flex-1 py-2.5 px-1 text-center rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === "compte"
                ? "bg-[#e0f2e9] text-[#005c30]"
                : "hover:text-slate-900"
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">Compte</span>
          </button>
        </nav>

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 1 : MES FICHES */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "fiches" && (
          <section className="space-y-3.5">
            {/* Guide des maladies et calendrier vaccinal pour le Relais */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-4 shadow-sm flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                  Outil de terrain SIMR & PEV
                </span>
                <h3 className="font-black text-sm text-white truncate">
                  Guide Maladies & Calendrier Vaccinal
                </h3>
                <p className="text-[11px] text-emerald-100 line-clamp-1">
                  Définitions simples, signes d'alerte et calendrier vaccinal officiel du Bénin.
                </p>
              </div>
              <Link
                href="/briefing"
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 shadow-md active:scale-95 transition-all"
              >
                Ouvrir le guide
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-1">
              <h2 className="text-sm font-extrabold text-slate-900">
                Surveillance à base communautaire
              </h2>
              <p className="text-xs text-slate-500">
                Vos saisies sont directement transmises à votre superviseur ASCQ.
              </p>
            </div>

            {/* Fiche 0 : Fiche hebdomadaire d'activités PNSC Officielle */}
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white rounded-3xl p-5 border-2 border-[#005c30] shadow-md space-y-3 hover:shadow-lg transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#005c30] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Calendar className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-slate-900 text-sm">
                      Fiche hebdomadaire d'activités (PNSC Officielle)
                    </h3>
                    <span className="text-[10px] font-black uppercase text-[#005c30] bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      Officiel Bénin
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    VAD, causeries, salubrité, santé animale, affaires sociales, suivi femmes enceintes & enfants 0-59 mois, références et signature ASCQ.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-emerald-100">
                <Link
                  href="/espace-rc/fiche-hebdo"
                  className="text-xs font-bold text-[#005c30] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Version plein écran & PDF</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("planning");
                    setPlanningMode("officielle");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-[#005c30] hover:bg-[#004724] text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Remplir ma fiche</span>
                </button>
              </div>
            </div>

            {/* Fiche 1 : Registre communautaire */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3 hover:border-emerald-300 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Registre communautaire
                    </h3>
                    <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      Actif
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Suivi régulier des ménages, signaux d'événements et décompte des cas observés.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <Link
                  href="/fiches"
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                >
                  Voir mes saisies
                </Link>
                <Link
                  href="/fiches/registre/nouvelle"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-700 hover:bg-blue-800 text-white shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>Renseigner le registre</span>
                </Link>
              </div>
            </div>

            {/* Fiche 2 : Notification d'alerte (Active en Phase 6) */}
            <div className="bg-white rounded-3xl p-5 border-2 border-emerald-500 shadow-md space-y-3 hover:border-emerald-600 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#005c30] flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Notification d'alerte
                    </h3>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Actif
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Signalement immédiat d'une maladie à potentiel épidémique, épizootie ou symptôme suspect.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <Link
                  href="/fiches"
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                >
                  Voir mes alertes
                </Link>
                <Link
                  href="/fiches/alerte/nouvelle"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#005c30] hover:bg-[#004724] text-white shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>Notifier une alerte</span>
                </Link>
              </div>
            </div>

            {/* Fiche 3 : Notification de décès */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3 hover:border-purple-300 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Skull className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Notification de décès
                    </h3>
                    <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      Actif
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Notification des décès communautaires (néonatal, maternel ou autre).
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <Link
                  href="/fiches"
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                >
                  Voir les déclarations
                </Link>
                <Link
                  href="/fiches/deces/nouvelle"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-purple-700 hover:bg-purple-800 text-white shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>Déclarer un décès</span>
                </Link>
              </div>
            </div>

            {/* Fiche 4 : Référence communautaire (Santé & GUPS / One Health) */}
            <div className="bg-gradient-to-br from-emerald-50/60 to-teal-50/40 rounded-3xl p-5 border-2 border-[#005c30] shadow-md space-y-3 hover:shadow-lg transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#005c30] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <HeartPulse className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-slate-900 text-sm">
                      Référer un cas (Santé / GUPS)
                    </h3>
                    <span className="text-[10px] font-black uppercase text-[#005c30] bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      Santé & Social
                    </span>
                    <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                      One Health
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Transférez un malade vers le centre de santé ou un cas social (VBG, détresse, enfance) vers le GUPS. Validation par votre ASCQ et bulletin officiel téléchargeable.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-emerald-100">
                <span className="text-[11px] font-bold text-slate-500">
                  Validation immédiate par votre ASCQ
                </span>
                <Link
                  href="/relais/reference/nouvelle"
                  className="px-4 py-2 rounded-xl text-xs font-black bg-[#005c30] hover:bg-[#004724] text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Référer un cas</span>
                </Link>
              </div>
            </div>

          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 2 : MON PLANNING & FICHE HEBDOMADAIRE (OFFICIEL PNSC) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "planning" && (
          <section className="space-y-4">
            {/* Barre de sélection de mode (Fiche Officielle vs Tâches rapides) */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPlanningMode("officielle")}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    planningMode === "officielle"
                      ? "bg-white text-[#005c30] shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Calendar className="w-4 h-4 text-[#005c30]" />
                  <span>Fiche Officielle PNSC</span>
                  <span className="hidden md:inline-block text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-[#005c30] font-black">
                    Validée
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlanningMode("rapide")}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    planningMode === "rapide"
                      ? "bg-white text-[#005c30] shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Tâches au jour le jour</span>
                </button>
              </div>

              <Link
                href="/espace-rc/fiche-hebdo"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-sm transition-all active:scale-95 shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Format Plein Écran & PDF</span>
              </Link>
            </div>

            {/* Mode 1 : Fiche hebdomadaire officielle PNSC Bénin */}
            {planningMode === "officielle" && (
              <div className="space-y-4">
                <FicheHebdoActivitesRcOfficielle rcProfile={rcData} isAscqSuperviseur={false} />
              </div>
            )}

            {/* Mode 2 : Tâches rapides au jour le jour */}
            {planningMode === "rapide" && (
              <div className="space-y-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#005c30]">
                      <Calendar className="w-5 h-5" />
                      <h2 className="font-extrabold text-sm text-slate-900">
                        Planning d'Activités du Relais
                      </h2>
                    </div>
                    <span className="text-[11px] font-black bg-emerald-50 text-[#005c30] px-2.5 py-1 rounded-xl border border-emerald-200">
                      {planningTaches.filter(t => t.fait).length} / {planningTaches.length} réalisées
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Planifiez vos Visites à Domicile (VAD), séances de sensibilisation, ratissage vaccinal et dépistage iCCM sur votre grappe.
                  </p>
                </div>

                {/* Formulaire d'ajout rapide d'activité */}
                <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm space-y-3">
                  <h3 className="font-bold text-xs text-slate-700">Ajouter une activité au planning</h3>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={nouvelleTacheJour}
                      onChange={(e) => setNouvelleTacheJour(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                    >
                      <option value="Lundi">Lundi</option>
                      <option value="Mardi">Mardi</option>
                      <option value="Mercredi">Mercredi</option>
                      <option value="Jeudi">Jeudi</option>
                      <option value="Vendredi">Vendredi</option>
                      <option value="Samedi">Samedi</option>
                      <option value="Dimanche">Dimanche</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Ex: Visite des 4 ménages du hameau sud..."
                      value={nouvelleTacheTitre}
                      onChange={(e) => setNouvelleTacheTitre(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#005c30]"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        if (!nouvelleTacheTitre.trim()) return;
                        setPlanningTaches([
                          ...planningTaches,
                          {
                            id: Date.now().toString(),
                            jour: nouvelleTacheJour,
                            activite: nouvelleTacheTitre.trim(),
                            fait: false,
                          }
                        ]);
                        setNouvelleTacheTitre("");
                      }}
                      className="px-4 py-2 bg-[#005c30] hover:bg-[#004724] text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter</span>
                    </button>
                  </div>

                  {/* Raccourcis d'activités recommandées */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap text-[10px]">
                    <span className="text-slate-400 font-medium">Modèles rapides :</span>
                    {[
                      "5 VAD avec boîte à images",
                      "Ratissage vaccinal PEV",
                      "Dépistage Palu TDR",
                      "Sensibilisation eau & latrines"
                    ].map((modele, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNouvelleTacheTitre(modele)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      >
                        + {modele}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Liste des activités planifiées */}
                <div className="space-y-2">
                  {planningTaches.map((t) => (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        t.fait ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-slate-200/80 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPlanningTaches(planningTaches.map(item => item.id === t.id ? { ...item, fait: !item.fait } : item));
                          }}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            t.fait ? "bg-[#005c30] text-white" : "border-2 border-slate-300 bg-white"
                          }`}
                        >
                          {t.fait && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {t.jour}
                            </span>
                            {t.fait && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                Terminé
                              </span>
                            )}
                          </div>
                          <p className={`text-xs font-medium mt-1 truncate ${t.fait ? "line-through text-slate-400" : "text-slate-800 font-bold"}`}>
                            {t.activite}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPlanningTaches(planningTaches.filter(item => item.id !== t.id));
                        }}
                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 2 : NOTIFICATIONS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "notifications" && (
          <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#005c30] flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm">
                Aucune notification
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Les consignes et alertes de votre superviseur ASCQ s'afficheront directement ici.
              </p>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 3 : MON COMPTE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "compte" && rcData && (
          <section className="space-y-4">
            
            {/* Carte Identité du RC */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#005c30] text-white flex items-center justify-center font-extrabold text-base">
                  {rcData.prenoms?.[0]}{rcData.nom?.[0]}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base uppercase">
                    {rcData.nom} {rcData.prenoms}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#005c30] bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5">
                    <ShieldCheck className="w-3 h-3" />
                    Relais Communautaire Actif
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Téléphone :</span>
                  <span className="font-bold text-slate-800">{rcData.telephone}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Village :</span>
                  <span className="font-bold text-slate-800">{rcData.village_nom || "Non précisé"}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Grappe assignée :</span>
                  <span className="font-bold text-slate-800">
                    Grappe {rcData.grappe} {rcData.nom_grappe ? `(${rcData.nom_grappe})` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Carte Mon ASCQ Référent */}
            <div className="bg-[#e8f5ee] rounded-3xl p-5 border border-[#c6e4d2] space-y-3">
              <div className="flex items-center gap-2 text-[#005c30]">
                <User className="w-4 h-4 font-bold" />
                <h4 className="font-bold text-xs uppercase tracking-wide">
                  Mon Superviseur ASCQ
                </h4>
              </div>

              <div>
                <p className="font-extrabold text-sm text-slate-900 uppercase">
                  {rcData.ascq_nom} {rcData.ascq_prenoms}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Agent de Santé Communautaire Qualifié
                </p>
              </div>

              {rcData.ascq_telephone && (
                <a
                  href={`tel:${rcData.ascq_telephone}`}
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#005c30] text-white font-bold text-xs shadow-sm hover:bg-[#004724] active:scale-95 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Appeler mon ASCQ : {rcData.ascq_telephone}</span>
                </a>
              )}
            </div>

            {/* Sécurité : Changement de mot de passe */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
              <button
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="w-full text-left flex items-center justify-between text-xs font-bold text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Changer mon mot de passe</span>
                </div>
                <span className="text-slate-400 text-xs">
                  {isChangingPassword ? "Fermer" : "Modifier"}
                </span>
              </button>

              {isChangingPassword && (
                <form onSubmit={handleChangePassword} className="space-y-3 pt-2 border-t border-slate-100">
                  {pwdMsg && (
                    <div
                      className={`p-2.5 rounded-xl text-xs ${
                        pwdMsg.error
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {pwdMsg.text}
                    </div>
                  )}

                  <input
                    type="password"
                    required
                    value={nouveauMdp}
                    onChange={(e) => setNouveauMdp(e.target.value)}
                    placeholder="Nouveau mot de passe"
                    className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />

                  <input
                    type="password"
                    required
                    value={confirmMdp}
                    onChange={(e) => setConfirmMdp(e.target.value)}
                    placeholder="Confirmer le nouveau mot de passe"
                    className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />

                  <button
                    type="submit"
                    disabled={pwdLoading}
                    className="w-full py-2 px-3 rounded-xl bg-[#005c30] text-white font-bold text-xs shadow-sm hover:bg-[#004724] transition-all"
                  >
                    {pwdLoading ? "Enregistrement..." : "Mettre à jour le mot de passe"}
                  </button>
                </form>
              )}
            </div>

            {/* Déconnexion */}
            <div className="pt-2">
              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-red-600 bg-white hover:bg-red-50 border border-red-200 shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Se déconnecter</span>
              </button>
            </div>

          </section>
        )}

      </main>
    </div>
  );
}
