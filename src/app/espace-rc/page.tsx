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
  Printer,
  Send,
  Sparkles,
  TrendingUp,
  CheckSquare,
  Eye,
  Edit3,
  Save
} from "lucide-react";
import { getCachedRcSpace, saveCachedRcSpace, saveCachedUserSession } from "@/lib/offline-sync";
import FicheHebdoActivitesRcOfficielle from "@/components/FicheHebdoActivitesRcOfficielle";

interface LignePlanningRC {
  id: string;
  activite: string;
  nombre_prevu: number;
  date: string;
  lieu: string;
}

interface LigneRapportRC {
  id: string;
  activite: string;
  nombre_prevu: number;
  nombre_fait: number;
  date: string;
  lieu: string;
  observation?: string;
}

const ACTIVITES_TYPES_RC = [
  "Visites à Domicile (VAD)",
  "Causeries / Sensibilisation",
  "Salubrité & Assainissement",
  "Santé animale (One Health)",
  "Affaires sociales (Cas vulnérables)",
  "Suivi des femmes enceintes (CPN)",
  "Suivi des enfants 0-59 mois (PEV/Nutrition)",
  "Personnes référées (vers CS / GUPS)",
  "Dépistage Paludisme / iCCM",
  "Autre activité communautaire"
];

function getSemaineActuelle() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semaine = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { annee: d.getUTCFullYear(), semaine };
}

export default function EspaceRelaisPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"fiches" | "planning" | "notifications" | "compte">("fiches");
  const [rcData, setRcData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Sous-onglets Planning / Rapport du RC
  const [sousOngletPlanning, setSousOngletPlanning] = useState<"planning_hebdo" | "rapport_hebdo" | "officielle">("planning_hebdo");
  
  // Période sélectionnée (Semaine épidémiologique et Année)
  const semInit = getSemaineActuelle();
  const [anneeChoisie, setAnneeChoisie] = useState<number>(semInit.annee);
  const [semaineChoisie, setSemaineChoisie] = useState<number>(semInit.semaine);

  // 1. Planning Hebdo du RC (activité, nombre prévu, date, lieu)
  const [lignesPlanning, setLignesPlanning] = useState<LignePlanningRC[]>([
    { id: "1", activite: "Visites à Domicile (VAD)", nombre_prevu: 5, date: new Date().toISOString().split("T")[0], lieu: "Grappe principale" },
    { id: "2", activite: "Causeries / Sensibilisation", nombre_prevu: 1, date: new Date().toISOString().split("T")[0], lieu: "Place publique" },
    { id: "3", activite: "Suivi des femmes enceintes (CPN)", nombre_prevu: 3, date: new Date().toISOString().split("T")[0], lieu: "Hameau Sud" },
    { id: "4", activite: "Suivi des enfants 0-59 mois (PEV/Nutrition)", nombre_prevu: 6, date: new Date().toISOString().split("T")[0], lieu: "Hameau Nord" },
    { id: "5", activite: "Salubrité & Assainissement", nombre_prevu: 1, date: new Date().toISOString().split("T")[0], lieu: "Points d'eau" },
  ]);

  // Formulaire d'ajout dans le planning
  const [formPlanningActivite, setFormPlanningActivite] = useState<string>("Visites à Domicile (VAD)");
  const [formPlanningPrevu, setFormPlanningPrevu] = useState<number>(5);
  const [formPlanningDate, setFormPlanningDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formPlanningLieu, setFormPlanningLieu] = useState<string>("");

  const [planningSaving, setPlanningSaving] = useState(false);
  const [planningMsg, setPlanningMsg] = useState<{ text: string; error: boolean } | null>(null);

  // 2. Rapport Hebdo du RC (activité, nombre prévu, nombre fait, date, lieu, observation facultatif)
  const [lignesRapport, setLignesRapport] = useState<LigneRapportRC[]>([]);
  const [rapportSaving, setRapportSaving] = useState(false);
  const [rapportMsg, setRapportMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [rapportStatut, setRapportStatut] = useState<string>("BROUILLON");
  const [luEtApprouveAscq, setLuEtApprouveAscq] = useState<boolean>(false);
  const [observationsAscq, setObservationsAscq] = useState<string | null>(null);
  const [dateApprobationAscq, setDateApprobationAscq] = useState<string | null>(null);

  // Formulaire d'ajout dans le rapport (activité imprévue ou complémentaire)
  const [formRapportActivite, setFormRapportActivite] = useState<string>("Visites à Domicile (VAD)");
  const [formRapportPrevu, setFormRapportPrevu] = useState<number>(0);
  const [formRapportFait, setFormRapportFait] = useState<number>(1);
  const [formRapportDate, setFormRapportDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formRapportLieu, setFormRapportLieu] = useState<string>("");
  const [formRapportObs, setFormRapportObs] = useState<string>("");

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

  // Charger les données de la semaine (planning & rapport)
  const chargerDonneesSemaine = async (annee: number, semaine: number, userId?: string) => {
    const uid = userId || rcData?.id;
    if (!uid) return;
    try {
      // 1. Charger planning hebdo
      const { data: pData } = await supabase
        .from("plannings_hebdo_relais")
        .select("*")
        .eq("relais_id", uid)
        .eq("annee", annee)
        .eq("semaine_num", semaine)
        .maybeSingle();

      let currentPlanning: LignePlanningRC[] = [];
      if (pData && Array.isArray(pData.lignes_planning) && pData.lignes_planning.length > 0) {
        currentPlanning = pData.lignes_planning;
        setLignesPlanning(pData.lignes_planning);
      }

      // 2. Charger rapport hebdo
      const { data: rData } = await supabase
        .from("rapports_hebdo_activites_relais")
        .select("*")
        .eq("relais_id", uid)
        .eq("annee", annee)
        .eq("semaine_num", semaine)
        .maybeSingle();

      if (rData && Array.isArray(rData.lignes_rapport) && rData.lignes_rapport.length > 0) {
        setLignesRapport(rData.lignes_rapport);
        setRapportStatut(rData.statut || "SOUMIS");
        setLuEtApprouveAscq(rData.lu_et_approuve_ascq || false);
        setObservationsAscq(rData.observations_ascq || null);
        setDateApprobationAscq(rData.date_approbation_ascq || null);
      } else {
        // Pré-remplir automatiquement le rapport depuis le planning de la semaine
        if (currentPlanning.length > 0) {
          const preRempli: LigneRapportRC[] = currentPlanning.map((p) => ({
            id: p.id,
            activite: p.activite,
            nombre_prevu: p.nombre_prevu,
            nombre_fait: p.nombre_prevu,
            date: p.date,
            lieu: p.lieu,
            observation: "",
          }));
          setLignesRapport(preRempli);
        } else {
          setLignesRapport([]);
        }
        setRapportStatut("BROUILLON");
        setLuEtApprouveAscq(false);
        setObservationsAscq(null);
        setDateApprobationAscq(null);
      }
    } catch (err) {
      console.warn("Erreur chargement planning/rapport RC:", err);
    }
  };

  useEffect(() => {
    if (rcData?.id) {
      chargerDonneesSemaine(anneeChoisie, semaineChoisie, rcData.id);
    }
  }, [rcData?.id, anneeChoisie, semaineChoisie]);

  // Enregistrer Planning
  const handleSauvegarderPlanning = async () => {
    setPlanningSaving(true);
    setPlanningMsg(null);
    try {
      const { data, error } = await supabase.rpc("enregistrer_planning_hebdo_rc", {
        p_annee: anneeChoisie,
        p_semaine: semaineChoisie,
        p_date_debut: new Date().toISOString().split("T")[0],
        p_lignes: lignesPlanning,
        p_village: rcData?.village_nom || null,
      });

      if (error) throw error;

      setPlanningMsg({ text: "Planning hebdomadaire transmis avec succès à votre superviseur ASCQ !", error: false });
      // Synchroniser le rapport s'il était vide
      if (lignesRapport.length === 0) {
        setLignesRapport(
          lignesPlanning.map((p) => ({
            id: p.id,
            activite: p.activite,
            nombre_prevu: p.nombre_prevu,
            nombre_fait: p.nombre_prevu,
            date: p.date,
            lieu: p.lieu,
            observation: "",
          }))
        );
      }
    } catch (err: any) {
      setPlanningMsg({ text: err.message || "Erreur lors de l'enregistrement du planning.", error: true });
    } finally {
      setPlanningSaving(false);
    }
  };

  // Enregistrer Rapport
  const handleSauvegarderRapport = async () => {
    setRapportSaving(true);
    setRapportMsg(null);
    try {
      const signatureNom = (rcData?.nom || "") + " " + (rcData?.prenoms || "");
      const { data, error } = await supabase.rpc("enregistrer_rapport_hebdo_rc", {
        p_annee: anneeChoisie,
        p_semaine: semaineChoisie,
        p_lignes: lignesRapport,
        p_village: rcData?.village_nom || null,
        p_signature: signatureNom,
      });

      if (error) throw error;

      setRapportStatut("SOUMIS");
      setRapportMsg({ text: "Rapport hebdomadaire transmis avec succès ! Votre ASCQ peut le consulter et le valider.", error: false });
    } catch (err: any) {
      setRapportMsg({ text: err.message || "Erreur lors de la transmission du rapport.", error: true });
    } finally {
      setRapportSaving(false);
    }
  };

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
                    setSousOngletPlanning("officielle");
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
        {/* ONGLET 2 : MON PLANNING & RAPPORT HEBDOMADAIRE (OFFICIEL PNSC) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "planning" && (
          <section className="space-y-4">
            
            {/* SÉLECTEUR DE SEMAINE & SOUS-ONGLETS */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#005c30] flex items-center justify-center font-black">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">
                      Activités Hebdomadaires du Relais
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Planning prévisionnel et rapport d'activités transmis en temps réel à l'ASCQ
                    </p>
                  </div>
                </div>

                {/* Sélecteur de Semaine et Année */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
                    <span className="text-[10px] text-slate-400 pl-1">Semaine</span>
                    <select
                      value={semaineChoisie}
                      onChange={(e) => setSemaineChoisie(Number(e.target.value))}
                      className="bg-white px-2 py-1 rounded-lg border border-slate-200 font-extrabold text-[#005c30] text-xs"
                    >
                      {Array.from({ length: 52 }, (_, i) => i + 1).map((s) => (
                        <option key={s} value={s}>
                          S{s} {s === semInit.semaine ? "(Actuelle)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={anneeChoisie}
                    onChange={(e) => setAnneeChoisie(Number(e.target.value))}
                    className="bg-slate-100 px-2 py-1.5 rounded-xl border-none font-bold text-slate-700 text-xs"
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              </div>

              {/* Barre des 3 sous-onglets */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setSousOngletPlanning("planning_hebdo")}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    sousOngletPlanning === "planning_hebdo"
                      ? "bg-white text-[#005c30] shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>1. Planning Hebdo</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-[#005c30]">
                    {lignesPlanning.reduce((acc, l) => acc + (Number(l.nombre_prevu) || 0), 0)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSousOngletPlanning("rapport_hebdo");
                    if (lignesRapport.length === 0 && lignesPlanning.length > 0) {
                      setLignesRapport(
                        lignesPlanning.map((p) => ({
                          id: p.id,
                          activite: p.activite,
                          nombre_prevu: p.nombre_prevu,
                          nombre_fait: p.nombre_prevu,
                          date: p.date,
                          lieu: p.lieu,
                          observation: "Effectué",
                        }))
                      );
                    }
                  }}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    sousOngletPlanning === "rapport_hebdo"
                      ? "bg-white text-[#005c30] shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>2. Rapport Hebdo</span>
                  {luEtApprouveAscq ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black">
                      Validé
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                      {rapportStatut}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSousOngletPlanning("officielle")}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    sousOngletPlanning === "officielle"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Printer className="w-3.5 h-3.5 text-slate-700" />
                  <span>3. Fiche PNSC A4</span>
                </button>
              </div>
            </div>

            {/* ============================================================= */}
            {/* SOUS-ONGLET 1 : PLANNING HEBDOMADAIRE DU RC                   */}
            {/* ============================================================= */}
            {sousOngletPlanning === "planning_hebdo" && (
              <div className="space-y-3.5">
                {/* Bandeau d'information */}
                <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#005c30] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      Planning prévisionnel de la Semaine {semaineChoisie} ({anneeChoisie})
                    </p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Renseignez vos activités prévues avec leur quantité, la date ciblée et le lieu. Dès enregistrement, votre superviseur ASCQ y a accès instantanément.
                    </p>
                  </div>
                </div>

                {/* Formulaire d'ajout d'activité dans le planning */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-xs text-slate-800 uppercase tracking-wide">
                      Ajouter une activité au planning
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold">Semaine {semaineChoisie}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Activité */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Activité</label>
                      <select
                        value={formPlanningActivite}
                        onChange={(e) => setFormPlanningActivite(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-[#005c30]"
                      >
                        {ACTIVITES_TYPES_RC.map((act) => (
                          <option key={act} value={act}>
                            {act}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Nombre prévu */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Nombre prévu</label>
                      <input
                        type="number"
                        min="1"
                        value={formPlanningPrevu}
                        onChange={(e) => setFormPlanningPrevu(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-[#005c30]"
                      />
                    </div>

                    {/* Date prévue */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Date prévue</label>
                      <input
                        type="date"
                        value={formPlanningDate}
                        onChange={(e) => setFormPlanningDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-[#005c30]"
                      />
                    </div>

                    {/* Lieu / Zone ciblée */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Lieu / Zone ciblée</label>
                      <input
                        type="text"
                        placeholder="Ex: Hameau Sud, quartier marché, ménages de la grappe 1..."
                        value={formPlanningLieu}
                        onChange={(e) => setFormPlanningLieu(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#005c30]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!formPlanningActivite) return;
                      const newLine: LignePlanningRC = {
                        id: Date.now().toString(),
                        activite: formPlanningActivite,
                        nombre_prevu: formPlanningPrevu,
                        date: formPlanningDate,
                        lieu: formPlanningLieu || rcData?.village_nom || "Village",
                      };
                      setLignesPlanning([...lignesPlanning, newLine]);
                      setFormPlanningLieu("");
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Ajouter cette activité au planning</span>
                  </button>
                </div>

                {/* Liste des activités du planning */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="font-black text-xs text-slate-800 uppercase tracking-wide">
                        Activités programmées pour la semaine {semaineChoisie}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {lignesPlanning.length} ligne(s) d'activités
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Total prévu</span>
                      <span className="text-base font-black text-[#005c30]">
                        {lignesPlanning.reduce((acc, l) => acc + (Number(l.nombre_prevu) || 0), 0)}
                      </span>
                    </div>
                  </div>

                  {lignesPlanning.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Aucune activité programmée pour cette semaine. Utilisez le formulaire ci-dessus pour ajouter vos prévisions.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lignesPlanning.map((ligne, idx) => (
                        <div
                          key={ligne.id || idx}
                          className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white hover:shadow-sm transition-all"
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-900">
                                {ligne.activite}
                              </span>
                              <span className="text-[10px] font-black uppercase text-[#005c30] bg-emerald-100 px-2 py-0.5 rounded-md">
                                Prévu : {ligne.nombre_prevu}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {ligne.date || "Date non spécifiée"}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {ligne.lieu || "Lieu non précisé"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => {
                                setLignesPlanning(lignesPlanning.filter((_, i) => i !== idx));
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Feedback message */}
                  {planningMsg && (
                    <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      planningMsg.error ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}>
                      {planningMsg.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      <span>{planningMsg.text}</span>
                    </div>
                  )}

                  {/* Bouton de sauvegarde du planning */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      disabled={planningSaving || lignesPlanning.length === 0}
                      onClick={handleSauvegarderPlanning}
                      className="flex-1 py-3 px-4 rounded-2xl bg-[#005c30] hover:bg-[#004724] disabled:opacity-50 text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {planningSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Enregistrement en cours...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>💾 Enregistrer & Transmettre mon Planning à l'ASCQ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* SOUS-ONGLET 2 : RAPPORT HEBDOMADAIRE DU RC                     */}
            {/* ============================================================= */}
            {sousOngletPlanning === "rapport_hebdo" && (
              <div className="space-y-3.5">
                
                {/* Statut d'approbation ASCQ */}
                <div className={`p-4 rounded-3xl border flex items-start gap-3 ${
                  luEtApprouveAscq
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                    : rapportStatut === "SOUMIS"
                    ? "bg-blue-50 border-blue-200 text-blue-950"
                    : "bg-amber-50 border-amber-200 text-amber-950"
                }`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    luEtApprouveAscq ? "bg-emerald-600 text-white" : rapportStatut === "SOUMIS" ? "bg-blue-600 text-white" : "bg-amber-500 text-white"
                  }`}>
                    {luEtApprouveAscq ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="font-black text-xs uppercase tracking-wide">
                        {luEtApprouveAscq
                          ? "✅ Rapport Lu et Approuvé par votre ASCQ"
                          : rapportStatut === "SOUMIS"
                          ? "🕒 Rapport transmis à votre ASCQ - En attente de validation"
                          : "📝 Rapport en cours d'édition (Brouillon)"}
                      </h4>
                      {dateApprobationAscq && (
                        <span className="text-[10px] font-bold text-slate-500">
                          Validé le {new Date(dateApprobationAscq).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {observationsAscq && (
                      <p className="text-xs mt-1.5 p-2 bg-white/70 rounded-xl border border-emerald-200 font-medium">
                        <strong>Remarque de votre ASCQ :</strong> {observationsAscq}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-600 mt-1">
                      Les totaux de vos activités réalisées sont directement intégrés et comptabilisés dans le rapport de votre ASCQ.
                    </p>
                  </div>
                </div>

                {/* Synthèse des réalisations */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Prévues</span>
                    <span className="text-lg font-black text-slate-700">
                      {lignesRapport.reduce((acc, l) => acc + (Number(l.nombre_prevu) || 0), 0)}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Réalisées</span>
                    <span className="text-lg font-black text-[#005c30]">
                      {lignesRapport.reduce((acc, l) => acc + (Number(l.nombre_fait) || 0), 0)}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Taux</span>
                    <span className="text-lg font-black text-emerald-600">
                      {(() => {
                        const prev = lignesRapport.reduce((acc, l) => acc + (Number(l.nombre_prevu) || 0), 0);
                        const fait = lignesRapport.reduce((acc, l) => acc + (Number(l.nombre_fait) || 0), 0);
                        return prev > 0 ? Math.round((fait / prev) * 100) : fait > 0 ? 100 : 0;
                      })()}%
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">VAD Ménages</span>
                    <span className="text-lg font-black text-blue-600">
                      {lignesRapport
                        .filter(l => l.activite.toLowerCase().includes("vad") || l.activite.toLowerCase().includes("visite"))
                        .reduce((acc, l) => acc + (Number(l.nombre_fait) || 0), 0)}
                    </span>
                  </div>
                </div>

                {/* Grille du rapport hebdomadaire */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="font-black text-xs text-slate-800 uppercase tracking-wide">
                        Lignes du Rapport (Semaine {semaineChoisie})
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Saisissez le « Nombre fait » et d'éventuelles « Observations »
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (lignesPlanning.length === 0) {
                          alert("Le planning de la semaine est vide. Renseignez d'abord le planning.");
                          return;
                        }
                        setLignesRapport(
                          lignesPlanning.map((p) => ({
                            id: p.id,
                            activite: p.activite,
                            nombre_prevu: p.nombre_prevu,
                            nombre_fait: p.nombre_prevu,
                            date: p.date,
                            lieu: p.lieu,
                            observation: "Effectué",
                          }))
                        );
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Recharger depuis le Planning</span>
                    </button>
                  </div>

                  {lignesRapport.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Aucune activité dans le rapport. Cliquez sur « Recharger depuis le Planning » ou ajoutez une activité ci-dessous.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lignesRapport.map((ligne, idx) => (
                        <div
                          key={ligne.id || idx}
                          className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-black text-slate-900 block truncate">
                                {ligne.activite}
                              </span>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {ligne.date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {ligne.lieu}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setLignesRapport(lignesRapport.filter((_, i) => i !== idx));
                              }}
                              className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                              title="Supprimer la ligne"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Saisies : Nombre Prévu, Nombre Fait, Observation */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-200/60">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                Prévu
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={ligne.nombre_prevu}
                                onChange={(e) => {
                                  const copy = [...lignesRapport];
                                  copy[idx].nombre_prevu = Number(e.target.value) || 0;
                                  setLignesRapport(copy);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-black text-[#005c30] uppercase block mb-1">
                                Nombre fait *
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={ligne.nombre_fait}
                                onChange={(e) => {
                                  const copy = [...lignesRapport];
                                  copy[idx].nombre_fait = Number(e.target.value) || 0;
                                  setLignesRapport(copy);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-xl border-2 border-emerald-300 text-xs font-black bg-white focus:ring-2 focus:ring-[#005c30]"
                              />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                Observation (facultatif)
                              </label>
                              <input
                                type="text"
                                placeholder="Détails, thème, difficultés..."
                                value={ligne.observation || ""}
                                onChange={(e) => {
                                  const copy = [...lignesRapport];
                                  copy[idx].observation = e.target.value;
                                  setLignesRapport(copy);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulaire rapide pour ajouter une activité imprévue */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-[11px] font-black text-slate-700 block">
                      + Ajouter une activité supplémentaire au rapport
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <select
                        value={formRapportActivite}
                        onChange={(e) => setFormRapportActivite(e.target.value)}
                        className="sm:col-span-2 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      >
                        {ACTIVITES_TYPES_RC.map((act) => (
                          <option key={act} value={act}>
                            {act}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        placeholder="Nb fait"
                        value={formRapportFait}
                        onChange={(e) => setFormRapportFait(Math.max(1, Number(e.target.value) || 1))}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const newLine: LigneRapportRC = {
                            id: Date.now().toString(),
                            activite: formRapportActivite,
                            nombre_prevu: 0,
                            nombre_fait: formRapportFait,
                            date: new Date().toISOString().split("T")[0],
                            lieu: rcData?.village_nom || "Village",
                            observation: "Activité additionnelle",
                          };
                          setLignesRapport([...lignesRapport, newLine]);
                        }}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>

                  {/* Feedback message */}
                  {rapportMsg && (
                    <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      rapportMsg.error ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}>
                      {rapportMsg.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      <span>{rapportMsg.text}</span>
                    </div>
                  )}

                  {/* Bouton de transmission du rapport */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={rapportSaving || lignesRapport.length === 0}
                      onClick={handleSauvegarderRapport}
                      className="w-full py-3.5 px-4 rounded-2xl bg-[#005c30] hover:bg-[#004724] disabled:opacity-50 text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {rapportSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Transmission en cours...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>🚀 Transmettre mon Rapport Hebdomadaire à mon ASCQ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* ============================================================= */}
            {/* SOUS-ONGLET 3 : FICHE OFFICIELLE PNSC (A4 / PDF)              */}
            {/* ============================================================= */}
            {sousOngletPlanning === "officielle" && (
              <div className="space-y-4">
                <FicheHebdoActivitesRcOfficielle rcProfile={rcData} isAscqSuperviseur={false} />
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
                  ASCQ
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
