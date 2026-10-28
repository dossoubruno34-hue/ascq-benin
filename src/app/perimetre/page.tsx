"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AscqNav from "@/components/AscqNav";
import {
  Crown,
  ShieldCheck,
  Building2,
  MapPin,
  Users,
  Search,
  Filter,
  Eye,
  Edit3,
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  BarChart3,
  FileSpreadsheet,
  KeyRound,
  RefreshCw,
  X,
  Save,
  Check,
  HelpCircle,
  FileText,
  MessageCircle
} from "lucide-react";
import { exporterCompilationCommunaleExcel } from "@/lib/excelExport";

export default function PerimetreSupervisionPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ascq" | "compilation_pnsc" | "assistance_mdp">("ascq");

  // Liste des ASCQ du périmètre
  const [ascqs, setAscqs] = useState<any[]>([]);
  const [searchAscq, setSearchAscq] = useState("");
  const [filtreArrondissement, setFiltreArrondissement] = useState("TOUS");
  const [listeArrondissements, setListeArrondissements] = useState<any[]>([]);

  // Dossier sélectionné pour inspection 360°
  const [selectedAscq, setSelectedAscq] = useState<any | null>(null);
  const [dossierAscq, setDossierAscq] = useState<{ relais: any[]; rma: any[]; hebdo: any[] }>({
    relais: [],
    rma: [],
    hebdo: [],
  });
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Modal d'édition avec JUSTIFICATION OBLIGATOIRE
  const [modalEditUser, setModalEditUser] = useState<any | null>(null);
  const [editTelephone, setEditTelephone] = useState("");
  const [editSourceFinancement, setEditSourceFinancement] = useState("LLF");
  const [editJustification, setEditJustification] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Compilation PNSC
  const now = new Date();
  const anneeActuelle = now.getFullYear();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semaineActuelle = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  const [semainePnsc, setSemainePnsc] = useState<number>(semaineActuelle);
  const [anneePnsc, setAnneePnsc] = useState<number>(anneeActuelle);
  const [compilationList, setCompilationList] = useState<any[]>([]);
  const [loadingCompilation, setLoadingCompilation] = useState(false);

  // Assistance mot de passe
  const [searchMdpTel, setSearchMdpTel] = useState("");
  const [rechercheMdpResult, setRechercheMdpResult] = useState<any | null>(null);
  const [nouveauMdpGenere, setNouveauMdpGenere] = useState("");
  const [motifAssistance, setMotifAssistance] = useState("");
  const [assistanceLoading, setAssistanceLoading] = useState(false);

  const initialiserPerimetre = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data: profil } = await supabase
        .from("utilisateurs")
        .select("*, departements(nom), communes(nom), arrondissements(nom)")
        .eq("id", user.id)
        .maybeSingle();

      if (!profil) {
        router.push("/connexion");
        return;
      }

      // Vérifier si l'utilisateur possède un rôle hiérarchique, de cadre ou de représentant
      const ALL_CADRE_ROLES = [
        "SUPER_ADMIN",
        "ADMINISTRATEUR",
        "REPRESENTANT_DEPARTEMENTAL",
        "ADMIN_DEPARTEMENTAL",
        "CADRE_DEPARTEMENTAL",
        "DDS",
        "CCD_CDLS_TP",
        "CSSPR",
        "CSPSMEMH",
        "CADRE_ZONE_SANITAIRE",
        "MCZS",
        "RCSE",
        "REPRESENTANT_COMMUNAL",
        "ADMIN_COMMUNAL",
        "CADRE_COMMUNAL",
        "PF_CCLS_TP",
        "MCC",
        "C_RAMS",
        "GESTIONNAIRE_PERIMETRE"
      ];

      const role = profil.role_technique || "";
      const poste = profil.poste || "";
      const nomination = profil.role_nomination || "";

      const isAuthorized = ALL_CADRE_ROLES.includes(role) || 
                           ALL_CADRE_ROLES.includes(poste) || 
                           ALL_CADRE_ROLES.includes(nomination) || 
                           Boolean(profil.role_nomination);

      if (!isAuthorized) {
        alert("Cet espace est réservé aux Représentants, Cadres hiérarchiques (Commune, Zone, Département) et Administrateurs.");
        router.push("/espace-ascq");
        return;
      }

      setCurrentUser(profil);

      // Déterminer le niveau territorial
      const isNational = ["SUPER_ADMIN", "ADMINISTRATEUR", "DIRECTEUR"].includes(role) || ["SUPER_ADMIN", "ADMINISTRATEUR"].includes(poste);
      const isDept = ["REPRESENTANT_DEPARTEMENTAL", "ADMIN_DEPARTEMENTAL", "CADRE_DEPARTEMENTAL", "DDS", "CCD_CDLS_TP", "CSPSMEMH", "CSSPR"].includes(role) ||
                     ["REPRESENTANT_DEPARTEMENTAL", "CADRE_DEPARTEMENTAL", "DDS", "CCD_CDLS_TP", "CSPSMEMH", "CSSPR"].includes(poste) ||
                     nomination === "REPRESENTANT_DEPARTEMENTAL" || nomination === "CADRE_DEPARTEMENTAL";
      const isZone = ["CADRE_ZONE_SANITAIRE", "MCZS", "RCSE"].includes(role) ||
                     ["CADRE_ZONE_SANITAIRE", "MCZS", "RCSE"].includes(poste) ||
                     nomination === "CADRE_ZONE_SANITAIRE";

      // Charger les arrondissements de son territoire
      if (profil.commune_id) {
        const { data: arrs } = await supabase
          .from("arrondissements")
          .select("id, nom")
          .eq("commune_id", profil.commune_id)
          .order("nom");
        setListeArrondissements(arrs || []);
      } else if (profil.departement_id) {
        const { data: arrs } = await supabase
          .from("arrondissements")
          .select("id, nom, commune_id, communes(nom, departement_id)")
          .order("nom");
        const filteredArrs = (arrs || []).filter((a: any) => a.communes?.departement_id === profil.departement_id);
        setListeArrondissements(filteredArrs);
      } else {
        const { data: arrs } = await supabase
          .from("arrondissements")
          .select("id, nom")
          .order("nom")
          .limit(100);
        setListeArrondissements(arrs || []);
      }

      // Charger les agents de son périmètre
      let query = supabase
        .from("utilisateurs")
        .select("*, departements(nom), communes(nom), arrondissements(nom)")
        .order("nom", { ascending: true });

      if (isNational) {
        // Accès national
      } else if (isDept && profil.departement_id) {
        // Scoper au département
        query = query.eq("departement_id", profil.departement_id);
      } else if (isZone && profil.zone_sanitaire_id) {
        // Scoper à la zone sanitaire
        query = query.eq("zone_sanitaire_id", profil.zone_sanitaire_id);
      } else if (profil.commune_id) {
        // Scoper à la commune
        query = query.eq("commune_id", profil.commune_id);
      }

      const { data: usersData } = await query;
      setAscqs((usersData || []).filter(u => ["ASCQ", "PF_CCLS_TP", "REPRESENTANT_COMMUNAL", "RC", "CADRE_COMMUNAL"].includes(u.poste) || u.role_technique === "ASCQ_OPERATEUR"));

      // Charger la compilation communale
      if (profil.commune_id) {
        chargerCompilation(profil.commune_id, anneePnsc, semainePnsc);
      }

    } catch (err) {
      console.error("Erreur initialisation périmètre:", err);
    } finally {
      setLoading(false);
    }
  };

  const chargerCompilation = async (communeId: string, a: number, s: number) => {
    setLoadingCompilation(true);
    try {
      const { data } = await supabase
        .from("rapports_hebdo_pnsc")
        .select("*, utilisateurs:ascq_id(nom, prenoms, telephone)")
        .eq("commune_id", communeId)
        .eq("annee", a)
        .eq("semaine", s);

      if (data && data.length > 0) {
        const formatted = data.map((item: any) => ({
          ...item,
          ascq_nom_complet: item.utilisateurs ? `${item.utilisateurs.prenoms} ${item.utilisateurs.nom}` : "ASCQ",
          ascq_telephone: item.utilisateurs?.telephone || "",
        }));
        setCompilationList(formatted);
      } else {
        setCompilationList([]);
      }
    } catch (e) {
      console.warn("Erreur compilation:", e);
    } finally {
      setLoadingCompilation(false);
    }
  };

  useEffect(() => {
    initialiserPerimetre();
  }, []);

  useEffect(() => {
    if (currentUser?.commune_id) {
      chargerCompilation(currentUser.commune_id, anneePnsc, semainePnsc);
    }
  }, [anneePnsc, semainePnsc]);

  // Inspection 360° du dossier d'un ASCQ
  const inspecterDossierAscq = async (ascq: any) => {
    setSelectedAscq(ascq);
    setLoadingDossier(true);
    try {
      const [relaisRes, rmaRes, hebdoRes] = await Promise.all([
        supabase.from("relais_communautaires").select("*").eq("ascq_id", ascq.id).order("nom"),
        supabase.from("rapports_mensuels_ascq").select("*").eq("ascq_id", ascq.id).order("annee", { ascending: false }).order("mois", { ascending: false }).limit(6),
        supabase.from("rapports_hebdo_pnsc").select("*").eq("ascq_id", ascq.id).order("annee", { ascending: false }).order("semaine", { ascending: false }).limit(8),
      ]);

      setDossierAscq({
        relais: relaisRes.data || [],
        rma: rmaRes.data || [],
        hebdo: hebdoRes.data || [],
      });
    } catch (err) {
      console.error("Erreur chargement dossier:", err);
    } finally {
      setLoadingDossier(false);
    }
  };

  // Ouverture modale d'édition avec justification
  const ouvrirModalEdition = (ascq: any) => {
    setModalEditUser(ascq);
    setEditTelephone(ascq.telephone || "");
    setEditSourceFinancement(ascq.source_financement || "LLF");
    setEditJustification("");
    setToastMsg(null);
  };

  // Enregistrement avec traçabilité et justification
  const handleSauvegarderModification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditUser) return;

    if (!editJustification || editJustification.trim().length < 5) {
      alert("⚠️ JUSTIFICATION OBLIGATOIRE : Veuillez fournir un motif ou une justification explicite pour valider cette modification.");
      return;
    }

    setEditSaving(true);
    try {
      const { error } = await supabase.rpc("admin_modifier_profil_ascq_avec_justification", {
        p_ascq_id: modalEditUser.id,
        p_nom: modalEditUser.nom,
        p_prenoms: modalEditUser.prenoms,
        p_telephone: editTelephone.trim(),
        p_departement_id: modalEditUser.departement_id,
        p_zone_sanitaire_id: modalEditUser.zone_sanitaire_id,
        p_commune_id: modalEditUser.commune_id,
        p_arrondissement_id: modalEditUser.arrondissement_id,
        p_source_financement: editSourceFinancement,
        p_diplome: modalEditUser.diplome || null,
        p_statut_compte: modalEditUser.statut_compte || "VALIDE",
        p_justification: `[Par ${currentUser.poste || currentUser.role_technique}] ${editJustification.trim()}`,
      });

      if (error) {
        // Fallback update direct
        await supabase
          .from("utilisateurs")
          .update({ telephone: editTelephone.trim() })
          .eq("id", modalEditUser.id);
      }

      setToastMsg({ text: `Informations de ${modalEditUser.nom} ${modalEditUser.prenoms} mises à jour avec justification !`, error: false });
      setModalEditUser(null);
      await initialiserPerimetre();
    } catch (err: any) {
      setToastMsg({ text: "Erreur modification : " + (err.message || err), error: true });
    } finally {
      setEditSaving(false);
    }
  };

  // Assistance mot de passe oublié
  const rechercherAscqPourMdp = () => {
    const cleanTel = searchMdpTel.replace(/\D/g, "");
    const found = ascqs.find(a => a.telephone?.replace(/\D/g, "").includes(cleanTel));
    if (found) {
      setRechercheMdpResult(found);
      setNouveauMdpGenere("000000");
      setMotifAssistance(`Réinitialisation de mot de passe à 000000 par le Représentant Communal pour ${found.nom} ${found.prenoms}`);
    } else {
      alert("Aucun agent trouvé avec ce numéro dans votre périmètre communal.");
    }
  };

  const executerResetMdp = async () => {
    if (!rechercheMdpResult) return;
    setAssistanceLoading(true);
    try {
      const codeFinal = nouveauMdpGenere.trim() || "000000";
      const { data, error } = await supabase.rpc("admin_reinitialiser_mot_de_passe", {
        p_target_user_id: rechercheMdpResult.id,
        p_nouveau_mot_de_passe: codeFinal,
        p_motif: motifAssistance,
      });

      if (error) {
        // Essayer l'autre RPC
        const { error: err2 } = await supabase.rpc("reinitialiser_mot_de_passe_ascq_a_zeros", {
          p_ascq_id: rechercheMdpResult.id,
          p_motif: motifAssistance,
        });
        if (err2) throw error;
      }

      alert(`✅ Succès ! Le mot de passe de ${rechercheMdpResult.prenoms} ${rechercheMdpResult.nom} a été réinitialisé à : ${codeFinal}\n\nL'ASCQ peut maintenant se connecter avec son numéro et le code ${codeFinal}, puis modifier son mot de passe personnel à son niveau.`);
      setRechercheMdpResult(null);
      setSearchMdpTel("");
    } catch (err: any) {
      alert("Erreur lors de la réinitialisation : " + (err.message || "Vérifiez que la fonction SQL est bien active dans Supabase."));
    } finally {
      setAssistanceLoading(false);
    }
  };

  // Export de la compilation communale
  const handleExportCompilation = () => {
    exporterCompilationCommunaleExcel(
      currentUser?.commune_nom || "Commune",
      currentUser?.departement_nom || "Département",
      semainePnsc,
      anneePnsc,
      compilationList
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="text-center space-y-2 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#005c30]" />
          <p className="text-xs font-semibold">Chargement de votre espace périmètre...</p>
        </div>
      </div>
    );
  }

  // Filtrage des ASCQ
  const ascqsFiltres = ascqs.filter(a => {
    if (filtreArrondissement !== "TOUS" && a.arrondissement_id !== filtreArrondissement) return false;
    if (searchAscq.trim() !== "") {
      const q = searchAscq.toLowerCase();
      return (
        a.nom?.toLowerCase().includes(q) ||
        a.prenoms?.toLowerCase().includes(q) ||
        a.telephone?.includes(q) ||
        a.arrondissements?.nom?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const libelleRole = currentUser?.poste === "REPRESENTANT_COMMUNAL" ? "Représentant Communal des ASCQ" :
                      currentUser?.poste === "REPRESENTANT_DEPARTEMENTAL" ? "Représentant Départemental" :
                      currentUser?.poste === "PF_CCLS_TP" ? "Point Focal CCLS-TP" :
                      "Cadre Administrateur du Périmètre";

  const libelleZone = currentUser?.commune_nom ? `Commune de ${currentUser.commune_nom}` :
                      currentUser?.departement_nom ? `Département du ${currentUser.departement_nom}` :
                      "Périmètre National";

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-28">
      <AscqNav userProfile={currentUser} />

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-4">
        
        {/* En-tête officiel du Périmètre */}
        <div className="bg-gradient-to-r from-emerald-950 via-[#005c30] to-teal-900 text-white rounded-3xl p-6 shadow-md space-y-3 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-sm mb-2">
                <Crown className="w-4 h-4 fill-current" />
                <span>{libelleRole}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Espace Périmètre • {libelleZone}
              </h1>
              <p className="text-xs text-emerald-100 font-medium">
                Coordination hiérarchique, supervision 360° des ASCQ, compilation PNSC et suivi des activités de la zone.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-2xl bg-white/10 text-white font-mono font-bold text-xs border border-white/20">
                {ascqs.length} ASCQ rattachés
              </span>
            </div>
          </div>
        </div>

        {toastMsg && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            toastMsg.error ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}>
            {toastMsg.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* Barre de navigation des 3 modules du périmètre */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200/80 shadow-sm flex items-center gap-1 text-xs font-black">
          <button
            onClick={() => setActiveTab("ascq")}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "ascq"
                ? "bg-[#005c30] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Les ASCQ du Périmètre ({ascqs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("compilation_pnsc")}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "compilation_pnsc"
                ? "bg-[#005c30] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>2. Compilation Communale PNSC</span>
          </button>

          <button
            onClick={() => setActiveTab("assistance_mdp")}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "assistance_mdp"
                ? "bg-[#005c30] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>3. Dépannage Mot de passe</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* ONGLET 1 : SUPERVISION DES ASCQ DU PÉRIMÈTRE */}
        {/* ========================================================================= */}
        {activeTab === "ascq" && (
          <div className="space-y-4">
            
            {/* Barre de recherche et filtre arrondissement */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un ASCQ par nom, téléphone, arrondissement..."
                  value={searchAscq}
                  onChange={(e) => setSearchAscq(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-medium focus:ring-2 focus:ring-[#005c30]"
                />
              </div>

              {listeArrondissements.length > 0 && (
                <select
                  value={filtreArrondissement}
                  onChange={(e) => setFiltreArrondissement(e.target.value)}
                  className="px-3 py-2 rounded-2xl bg-white border border-slate-200/80 text-xs font-bold text-slate-700"
                >
                  <option value="TOUS">Tous les arrondissements</option>
                  {listeArrondissements.map(a => (
                    <option key={a.id} value={a.id}>{a.nom}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Liste des agents ASCQ */}
            <div className="space-y-3">
              {ascqsFiltres.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-xs">
                  Aucun agent ASCQ trouvé pour cette recherche.
                </div>
              ) : (
                ascqsFiltres.map((ascq) => (
                  <div
                    key={ascq.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm sm:text-base font-black text-slate-900 uppercase">
                          {ascq.nom} {ascq.prenoms}
                        </strong>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {ascq.poste}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          Financement : {ascq.source_financement || "LLF"}
                        </span>
                      </div>

                      <div className="flex items-center flex-wrap gap-3 text-xs text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1 font-bold text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>Arrondissement : {ascq.arrondissements?.nom || ascq.arrondissement_nom || "Non précisé"}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ascq.telephone}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchMdpTel(ascq.telephone || "");
                          setRechercheMdpResult(ascq);
                          setNouveauMdpGenere("000000");
                          setMotifAssistance(`Réinitialisation suite à mot de passe oublié pour ${ascq.prenoms} ${ascq.nom}`);
                          setActiveTab("assistance_mdp");
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center gap-1 transition-all active:scale-95"
                        title="Réinitialiser le mot de passe de cet ASCQ à 000000"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                        <span>Reset (000000)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => inspecterDossierAscq(ascq)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Dossier 360°</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => ouvrirModalEdition(ascq)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-bold text-xs border border-emerald-200 transition-colors flex items-center gap-1"
                        title="Modifier et justifier les informations de l'agent"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Modifier & Justifier</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* VOLET D'INSPECTION 360° D'UN ASCQ SÉLECTIONNÉ */}
            {selectedAscq && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Dossier de terrain</span>
                    <h3 className="text-base font-black text-slate-900">
                      Détails d'activité de {selectedAscq.nom} {selectedAscq.prenoms}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAscq(null)}
                    className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {loadingDossier ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#005c30] mb-2" />
                    <span>Chargement des données terrain...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-500 block text-[10px] uppercase">Relais Communautaires</span>
                      <strong className="text-lg font-black text-slate-900 block">{dossierAscq.relais.length} enrôlés</strong>
                      <div className="pt-1 text-[11px] text-slate-600 max-h-32 overflow-y-auto space-y-0.5">
                        {dossierAscq.relais.map(r => (
                          <div key={r.id}>• {r.prenoms} {r.nom} ({r.village_nom})</div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-500 block text-[10px] uppercase">Rapports Hebdo PNSC</span>
                      <strong className="text-lg font-black text-slate-900 block">{dossierAscq.hebdo.length} récents</strong>
                      <div className="pt-1 text-[11px] text-slate-600 max-h-32 overflow-y-auto space-y-0.5">
                        {dossierAscq.hebdo.map(h => (
                          <div key={h.id}>• Semaine {h.semaine} ({h.annee}) : {h.statut}</div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-500 block text-[10px] uppercase">Rapports Mensuels RMA</span>
                      <strong className="text-lg font-black text-slate-900 block">{dossierAscq.rma.length} récents</strong>
                      <div className="pt-1 text-[11px] text-slate-600 max-h-32 overflow-y-auto space-y-0.5">
                        {dossierAscq.rma.map(m => (
                          <div key={m.id}>• Mois {m.mois}/{m.annee} : {m.statut}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 2 : COMPILATION COMMUNALE DU SUIVI PNSC */}
        {/* ========================================================================= */}
        {activeTab === "compilation_pnsc" && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Tableau Croisé de la Commune ({currentUser?.commune_nom || "Commune"})
                </h3>
                <p className="text-xs text-slate-500">
                  Agrégation des rapports hebdomadaires PNSC de tous les arrondissements pour transmission au Médecin Coordonnateur.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={semainePnsc}
                  onChange={(e) => setSemainePnsc(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  {Array.from({ length: 52 }, (_, i) => i + 1).map(s => (
                    <option key={s} value={s}>Semaine {s}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleExportCompilation}
                  className="px-3.5 py-1.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter Excel</span>
                </button>
              </div>
            </div>

            {loadingCompilation ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#005c30] mb-2" />
                <span>Chargement de la compilation...</span>
              </div>
            ) : compilationList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
                Aucun rapport hebdomadaire validé par les ASCQ pour la Semaine {semainePnsc} / {anneePnsc}.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-[11px] text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Arrondissement</th>
                      <th className="p-2.5">ASCQ</th>
                      <th className="p-2.5 text-center">RH Gap</th>
                      <th className="p-2.5 text-center">Motos Gap</th>
                      <th className="p-2.5 text-center">Ordis Gap</th>
                      <th className="p-2.5 text-center">Arriérés</th>
                      <th className="p-2.5 text-center">Internet</th>
                      <th className="p-2.5 text-center">Carburant</th>
                      <th className="p-2.5 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {compilationList.map((r, idx) => {
                      const totalArrieres = Number(r.remuneration_due_llf || 0) + Number(r.remuneration_due_fadec || 0) + Number(r.remuneration_due_srhr || 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="p-2.5 font-bold text-slate-900">{r.arrondissement_nom || "Arrondissement"}</td>
                          <td className="p-2.5">{r.ascq_nom_complet}</td>
                          <td className={`p-2.5 text-center font-bold ${r.rh_gap > 0 ? "text-red-600" : "text-emerald-700"}`}>{r.rh_gap}</td>
                          <td className={`p-2.5 text-center font-bold ${r.motos_gap > 0 ? "text-amber-600" : "text-emerald-700"}`}>{r.motos_gap}</td>
                          <td className={`p-2.5 text-center font-bold ${r.ordinateurs_gap > 0 ? "text-purple-600" : "text-emerald-700"}`}>{r.ordinateurs_gap}</td>
                          <td className="p-2.5 text-center font-bold">{totalArrieres > 0 ? `${totalArrieres} mois` : "0"}</td>
                          <td className="p-2.5 text-center">{r.forfait_internet_recu ? "✅" : "❌"}</td>
                          <td className="p-2.5 text-center">{r.carburant_recu ? "✅" : "❌"}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.statut === "VALIDE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {r.statut === "VALIDE" ? "Validé" : "Brouillon"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 3 : ASSISTANCE MOT DE PASSE OUBLIÉ */}
        {/* ========================================================================= */}
        {activeTab === "assistance_mdp" && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#005c30]" />
                <span>Assistance en cas de Mot de Passe Oublié</span>
              </h3>
              <p className="text-xs text-slate-500">
                En tant que Représentant, vous pouvez dépanner immédiatement un ASCQ de votre commune bloqué par un oubli de mot de passe.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="Numéro de téléphone de l'ASCQ bloqué..."
                value={searchMdpTel}
                onChange={(e) => setSearchMdpTel(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-medium"
              />
              <button
                type="button"
                onClick={rechercherAscqPourMdp}
                className="px-4 py-2.5 rounded-xl bg-[#005c30] text-white font-bold text-xs"
              >
                Rechercher l'agent
              </button>
            </div>

            {rechercheMdpResult && (
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 font-extrabold text-sm uppercase">
                    {rechercheMdpResult.nom} {rechercheMdpResult.prenoms}
                  </strong>
                  <span className="text-slate-500 font-mono">{rechercheMdpResult.telephone}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block text-[11px] mb-1">
                      Code officiel par défaut (000000)
                    </label>
                    <input
                      type="text"
                      value={nouveauMdpGenere}
                      onChange={(e) => setNouveauMdpGenere(e.target.value)}
                      placeholder="000000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block text-[11px] mb-1">Motif de l'assistance</label>
                    <input
                      type="text"
                      value={motifAssistance}
                      onChange={(e) => setMotifAssistance(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={assistanceLoading}
                    onClick={executerResetMdp}
                    className="w-full py-2.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{assistanceLoading ? "Réinitialisation en cours..." : "Valider la réinitialisation du mot de passe à 000000"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const cleanPhone = rechercheMdpResult.telephone.replace(/\D/g, "");
                      const appUrl = typeof window !== "undefined" ? window.location.origin + "/connexion" : "https://ascq.bj/connexion";
                      const message = `Bonjour ${rechercheMdpResult.prenoms},\nVotre mot de passe a été réinitialisé par votre Représentant Communal.\nVotre code d'accès temporaire est : *${nouveauMdpGenere || "000000"}*.\n\nConnectez-vous sur l'application avec votre numéro et le code 000000 pour définir votre mot de passe personnel :\n${appUrl}`;
                      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
                    }}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-[#25D366] hover:bg-[#1fb855] transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Transmettre les instructions par WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODALE DE MODIFICATION D'UN ASCQ AVEC JUSTIFICATION OBLIGATOIRE */}
      {/* ========================================================================= */}
      {modalEditUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden my-auto">
            <div className="bg-[#005c30] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Modifier les informations de l'agent ({modalEditUser.nom})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalEditUser(null)}
                className="p-1 rounded-lg bg-black/20 hover:bg-black/40 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSauvegarderModification} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Téléphone professionnel</label>
                <input
                  type="tel"
                  required
                  value={editTelephone}
                  onChange={(e) => setEditTelephone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Source de financement</label>
                <select
                  value={editSourceFinancement}
                  onChange={(e) => setEditSourceFinancement(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <option value="LLF">LLF</option>
                  <option value="LLF_FADEC">LLF et FADEC Santé communautaire</option>
                  <option value="SRHR">SRHR</option>
                  <option value="AUTRE">Autre source</option>
                </select>
              </div>

              {/* JUSTIFICATION OBLIGATOIRE */}
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-black text-red-700 block">
                    Justification administrative obligatoire *
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Traçabilité audit</span>
                </div>
                <textarea
                  rows={3}
                  required
                  value={editJustification}
                  onChange={(e) => setEditJustification(e.target.value)}
                  placeholder="Préciser obligatoirement la raison de cette modification (ex: Changement de numéro suite à perte, régularisation administrative du projet...)"
                  className="w-full px-3 py-2 rounded-xl border border-red-300 bg-red-50/20 text-xs focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEditUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{editSaving ? "Enregistrement..." : "Enregistrer avec justification"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
