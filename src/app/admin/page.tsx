"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  Download,
  Calendar,
  Search,
  RefreshCw,
  ArrowLeftRight,
  MessageSquareText,
  FileSpreadsheet,
  MapPin,
  HeartHandshake,
  HelpCircle,
  Eye,
  Sliders,
  BellRing,
  Activity,
  UserCheck,
  Building,
  Plus,
  Trash2,
  Check
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    | "dashboard"
    | "comptes_ascq"
    | "perimetre_activites"
    | "permutations_requetes"
    | "diffusion_alertes"
    | "ecoute_conseils"
    | "cotonou_referentiel"
    | "exports"
  >("dashboard");

  // Statistiques du tableau de bord
  const [stats, setStats] = useState<any>({
    total_alertes: 0,
    alertes_prioritaires: 0,
    alertes_averees: 0,
    alertes_investiguees: 0,
    alertes_non_investiguees: 0,
    delai_moyen_notification: 0,
    delai_moyen_investigation: 0,
    total_deces: 0,
    deces_maternels: 0,
    deces_neonatals: 0,
    deces_avec_cause: 0,
    total_ascq_actifs: 0,
    total_rc_actifs: 0,
    total_rma_deposes: 0,
    total_rma_retard: 0,
    top_pathologies: [],
  });

  // Comptes & ASCQ
  const [comptes, setComptes] = useState<any[]>([]);
  const [searchCompte, setSearchCompte] = useState("");
  const [filtreStatutCompte, setFiltreStatutCompte] = useState("EN_ATTENTE");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [vueSousOngletComptes, setVueSousOngletComptes] = useState<"validation" | "referentiel">("validation");
  const [referentielAscq, setReferentielAscq] = useState<any[]>([]);
  const [searchReferentiel, setSearchReferentiel] = useState("");
  const [loadingReferentiel, setLoadingReferentiel] = useState(false);
  const [pageComptes, setPageComptes] = useState(1);
  const [pageReferentiel, setPageReferentiel] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Activités demandées
  const [activitesDemandees, setActivitesDemandees] = useState<any[]>([]);
  const [titreActivite, setTitreActivite] = useState("");
  const [descActivite, setDescActivite] = useState("");
  const [typeActivite, setTypeActivite] = useState("SENSIBILISATION");
  const [dateEcheanceActivite, setDateEcheanceActivite] = useState("");
  const [prioriteActivite, setPrioriteActivite] = useState("NORMALE");
  const [envoiActiviteLoading, setEnvoiActiviteLoading] = useState(false);

  // Permutations & Requêtes
  const [permutations, setPermutations] = useState<any[]>([]);
  const [requetes, setRequetes] = useState<any[]>([]);
  const [selectedRequete, setSelectedRequete] = useState<any>(null);
  const [reponseRequeteTexte, setReponseRequeteTexte] = useState("");
  const [reponseRequeteStatut, setReponseRequeteStatut] = useState("RESOLUE");

  // Diffusion de message / alerte
  const [titreDiffusion, setTitreDiffusion] = useState("");
  const [messageDiffusion, setMessageDiffusion] = useState("");
  const [prioriteDiffusion, setPrioriteDiffusion] = useState("NORMALE");
  const [diffusionLoading, setDiffusionLoading] = useState(false);

  // Écoute citoyenne & Conseils Santé
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [conseilsSante, setConseilsSante] = useState<any[]>([]);
  const [nouveauConseilTitre, setNouveauConseilTitre] = useState("");
  const [nouveauConseilContenu, setNouveauConseilContenu] = useState("");

  // Cotonou - Arrondissements à rattacher
  const [arrondissementsCotonou, setArrondissementsCotonou] = useState<any[]>([]);
  const [zonesCotonou, setZonesCotonou] = useState<any[]>([]);

  // Messages d'alerte / toast
  const [toastMessage, setToastMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Vérification des droits et initialisation
  const initialiserAdmin = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/connexion");
        return;
      }

      let profil: any = null;

      // 1. Priorité à la fonction RPC obtenir_mon_profil (hermétique, sans récursion RLS)
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc("obtenir_mon_profil");
        if (!rpcErr && rpcData && rpcData.length > 0) {
          profil = rpcData[0];
        }
      } catch (e) {
        console.warn("RPC obtenir_mon_profil indisponible:", e);
      }

      // 2. Si non obtenu par RPC, tenter la requête directe
      if (!profil) {
        try {
          const { data: directData } = await supabase
            .from("utilisateurs")
            .select("*, departements(nom), communes(nom)")
            .eq("id", user.id)
            .maybeSingle();
          if (directData) profil = directData;
        } catch (e) {
          console.error("Erreur lecture profil directe:", e);
        }
      }

      if (!profil) {
        console.warn("Profil introuvable pour l'utilisateur connecté");
        setLoading(false);
        return;
      }

      // Vérification du rôle d'accès
      const allowedRoles = [
        "SUPER_ADMIN",
        "ADMINISTRATEUR",
        "ADMIN_DEPARTEMENTAL",
        "ADMIN_COMMUNAL",
        "GESTIONNAIRE_PERIMETRE",
      ];
      if (!allowedRoles.includes(profil.role_technique)) {
        alert("Accès réservé aux administrateurs et gestionnaires de périmètre.");
        router.push("/espace-ascq");
        return;
      }

      setCurrentUser(profil);

      // Charger les statistiques selon le périmètre (commune ou département)
      await chargerStatistiques(profil);

      // Charger les comptes
      await chargerComptes();

      // Charger les autres données
      await chargerDonneesSecondaires(profil);
    } catch (err) {
      console.error("Erreur initialisation admin:", err);
    } finally {
      setLoading(false);
    }
  };

  const chargerStatistiques = async (profil: any) => {
    try {
      const depId = profil.role_technique === "SUPER_ADMIN" || profil.role_technique === "ADMINISTRATEUR"
        ? null
        : profil.departement_id;
      const comId = profil.role_technique === "ADMIN_COMMUNAL" ? profil.commune_id : null;

      const { data: resStats, error } = await supabase.rpc("obtenir_statistiques_tableau_de_bord", {
        p_departement_id: depId,
        p_commune_id: comId,
      });

      if (!error && resStats) {
        setStats(resStats);
      }
    } catch (e) {
      console.error("Erreur stats:", e);
    }
  };

  const chargerComptes = async () => {
    try {
      const { data } = await supabase.rpc("lister_comptes_admin");
      if (data) {
        setComptes(data);
      } else {
        const { data: rawComptes } = await supabase
          .from("utilisateurs")
          .select("*, departements(nom), communes(nom), arrondissements(nom)")
          .order("created_at", { ascending: false });
        setComptes(rawComptes || []);
      }
    } catch (e) {
      console.error("Erreur chargement comptes:", e);
    }
  };

  const chargerDonneesSecondaires = async (profil: any) => {
    try {
      // 1. Activités demandées
      const { data: acts } = await supabase
        .from("activites_demandees_ascq")
        .select("*")
        .order("created_at", { ascending: false });
      setActivitesDemandees(acts || []);

      // 2. Permutations
      const { data: perms } = await supabase
        .from("permutations")
        .select("*, ascq:ascq_id(nom, prenoms, telephone), partenaire:partenaire_ascq_id(nom, prenoms, telephone)")
        .order("created_at", { ascending: false });
      setPermutations(perms || []);

      // 3. Requêtes
      const { data: reqs } = await supabase
        .from("requetes_ascq")
        .select("*, ascq:ascq_id(nom, prenoms, telephone)")
        .order("created_at", { ascending: false });
      setRequetes(reqs || []);

      // 4. Suggestions publiques
      const { data: suggs } = await supabase
        .from("suggestions_publiques")
        .select("*")
        .order("created_at", { ascending: false });
      setSuggestions(suggs || []);

      // 5. Conseils Santé
      const { data: conseils } = await supabase
        .from("conseils_sante")
        .select("*")
        .order("created_at", { ascending: false });
      setConseilsSante(conseils || []);

      // 6. Cotonou : Arrondissements et zones
      const { data: arrCotonou } = await supabase
        .from("arrondissements")
        .select("id, nom, statut_zone_sanitaire, zone_sanitaire_id, zones_sanitaires(nom)")
        .eq("commune_id", "c0000000-0000-0000-0000-000000000015") // Cotonou
        .order("nom");
      setArrondissementsCotonou(arrCotonou || []);

      const { data: zCotonou } = await supabase
        .from("zones_sanitaires")
        .select("id, nom")
        .ilike("nom", "%COTONOU%");
      setZonesCotonou(zCotonou || []);
    } catch (e) {
      console.error("Erreur chargement données secondaires:", e);
    }
  };

  useEffect(() => {
    initialiserAdmin();
  }, []);

  // Charger le Registre National officiel
  const chargerReferentielNational = async () => {
    setLoadingReferentiel(true);
    try {
      const { data, error } = await supabase
        .from("ascq_referentiel_national")
        .select("*")
        .order("departement")
        .order("commune")
        .order("nom_prenoms");
      if (!error && data) {
        setReferentielAscq(data);
      }
    } catch (e) {
      console.error("Erreur referentiel:", e);
    } finally {
      setLoadingReferentiel(false);
    }
  };

  // Actions Comptes
  const handleValiderCompte = async (compte: any) => {
    if (compte.poste === "ASCQ" && !compte.present_liste_nationale) {
      const confirmer = confirm(
        `⚠️ ALERTE REGISTRE NATIONAL :\n\nL'agent "${compte.nom} ${compte.prenoms}" n'apparaît pas dans la liste officielle consolidée des ASCQ du Bénin.\n\nSouhaitez-vous quand même valider ce compte ?`
      );
      if (!confirmer) return;
    }

    setActionLoadingId(compte.id);
    try {
      await supabase.rpc("changer_statut_compte", {
        p_id: compte.id,
        p_nouveau_statut: "VALIDE",
      });
      setToastMessage({ text: "Compte validé avec succès !", error: false });
      await chargerComptes();
    } catch (err: any) {
      setToastMessage({ text: err.message || "Erreur de validation", error: true });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAjouterAuReferentiel = async (compte: any) => {
    const nomComplet = prompt(
      "Confirmez ou ajustez le nom et prénoms officiel pour inscription au Registre National des ASCQ :",
      `${compte.nom} ${compte.prenoms}`
    );
    if (!nomComplet) return;

    try {
      const { data, error } = await supabase.rpc("admin_ajouter_ascq_referentiel", {
        p_nom_prenoms: nomComplet,
        p_departement: compte.departement_nom || "NON DEFINI",
        p_commune: compte.commune_nom || "NON DEFINIE",
        p_arrondissement: compte.arrondissement_nom || "NON DEFINI",
        p_date_prise_service: null,
      });
      if (error) throw error;
      setToastMessage({ text: `L'agent "${nomComplet}" a été inscrit avec succès au Registre National Officiel !`, error: false });
      await chargerComptes();
      await chargerReferentielNational();
    } catch (err: any) {
      alert("Erreur ajout registre : " + err.message);
    }
  };

  const handleAjouterNouveauASCQManuel = async () => {
    const nomComplet = prompt("Nom et prénoms de l'ASCQ :");
    if (!nomComplet) return;
    const dep = prompt("Département (ex: ZOU, ATLANTIQUE, ALIBORI...) :");
    if (!dep) return;
    const com = prompt("Commune (ex: OUINHI, ABOMEY-CALAVI...) :");
    if (!com) return;
    const arr = prompt("Arrondissement / Poste d'affectation :") || "CENTRE";
    const datePrise = prompt("Date de prise de service (AAAA-MM-JJ, optionnel) :") || null;

    try {
      const { data, error } = await supabase.rpc("admin_ajouter_ascq_referentiel", {
        p_nom_prenoms: nomComplet,
        p_departement: dep,
        p_commune: com,
        p_arrondissement: arr,
        p_date_prise_service: datePrise && datePrise.match(/^\d{4}-\d{2}-\d{2}$/) ? datePrise : null,
      });
      if (error) throw error;
      setToastMessage({ text: "ASCQ ajouté avec succès au Registre National !", error: false });
      await chargerReferentielNational();
      await chargerComptes();
    } catch (err: any) {
      alert("Erreur ajout : " + err.message);
    }
  };

  const handleRejeterCompte = async (id: string) => {
    if (!confirm("Voulez-vous suspendre ou refuser ce compte ?")) return;
    setActionLoadingId(id);
    try {
      await supabase.rpc("changer_statut_compte", {
        p_id: id,
        p_nouveau_statut: "REJETE",
      });
      setToastMessage({ text: "Compte rejeté.", error: false });
      await chargerComptes();
    } catch (err: any) {
      setToastMessage({ text: err.message, error: true });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Demander une activité à l'ASCQ
  const handleCreerActiviteDemandee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titreActivite || !descActivite || !dateEcheanceActivite) {
      alert("Veuillez renseigner le titre, la description et la date d'échéance.");
      return;
    }

    setEnvoiActiviteLoading(true);
    try {
      const { data, error } = await supabase.rpc("demander_activite_ascq", {
        p_titre: titreActivite,
        p_description: descActivite,
        p_type_activite: typeActivite,
        p_date_echeance: dateEcheanceActivite,
        p_priorite: prioriteActivite,
        p_commune_id: currentUser?.commune_id || null,
        p_ascq_cible_id: null,
      });

      if (error) throw error;

      setToastMessage({ text: "Consigne d'activité transmise avec succès aux ASCQ.", error: false });
      setTitreActivite("");
      setDescActivite("");
      setDateEcheanceActivite("");
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      setToastMessage({ text: err.message || "Erreur lors de l'envoi", error: true });
    } finally {
      setEnvoiActiviteLoading(false);
    }
  };

  // Répondre à une requête
  const handleRepondreRequete = async () => {
    if (!selectedRequete || !reponseRequeteTexte) return;
    try {
      await supabase.rpc("admin_repondre_requete", {
        p_requete_id: selectedRequete.id,
        p_reponse: reponseRequeteTexte,
        p_statut: reponseRequeteStatut,
      });
      setToastMessage({ text: "Réponse officielle envoyée à l'ASCQ avec succès.", error: false });
      setSelectedRequete(null);
      setReponseRequeteTexte("");
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  // Valider une permutation
  const handleValiderPermutation = async (id: string) => {
    if (!confirm("Confirmer la validation officielle de cette permutation ?")) return;
    try {
      await supabase.rpc("admin_valider_permutation", {
        p_permutation_id: id,
      });
      setToastMessage({ text: "Demande de permutation approuvée avec succès !", error: false });
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  // Diffuser une alerte
  const handleDiffuserAlerte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titreDiffusion || !messageDiffusion) return;

    setDiffusionLoading(true);
    try {
      await supabase.rpc("envoyer_notification_broadcast", {
        p_titre: titreDiffusion,
        p_message: messageDiffusion,
        p_priorite: prioriteDiffusion,
        p_departement_id: currentUser?.departement_id || null,
        p_commune_id: currentUser?.commune_id || null,
      });
      setToastMessage({ text: "Alerte diffusée avec succès à tous les agents du périmètre.", error: false });
      setTitreDiffusion("");
      setMessageDiffusion("");
    } catch (err: any) {
      setToastMessage({ text: err.message || "Erreur de diffusion", error: true });
    } finally {
      setDiffusionLoading(false);
    }
  };

  // Rattacher un arrondissement de Cotonou
  const handleRattacherCotonou = async (arrondissementId: string, zoneId: string) => {
    if (!zoneId) return;
    try {
      await supabase.rpc("admin_rattacher_arrondissement_cotonou", {
        p_arrondissement_id: arrondissementId,
        p_zone_sanitaire_id: zoneId,
      });
      setToastMessage({ text: "Arrondissement rattaché avec succès.", error: false });
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  // Exports de données CSV
  const exporterCsv = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent =
      headers.join(";") +
      "\n" +
      data
        .map((row) =>
          headers
            .map((field) => {
              const val = row[field];
              if (val === null || val === undefined) return '""';
              return `"${String(val).replace(/"/g, '""')}"`;
            })
            .join(";")
        )
        .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAscq = async () => {
    try {
      const { data, error } = await supabase.rpc("exporter_liste_ascq");
      if (error) throw error;
      exporterCsv(data, "ASCQ_BENIN_LISTE_OFFICIELLE");
    } catch (e: any) {
      alert("Erreur export : " + e.message);
    }
  };

  const handleExportSurveillance = async () => {
    try {
      const { data, error } = await supabase.rpc("exporter_donnees_surveillance_anonymisees");
      if (error) throw error;
      exporterCsv(data, "SURVEILLANCE_EPIDEMIO_ANONYMISEE");
    } catch (e: any) {
      alert("Erreur export : " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-bold text-sm">Chargement du portail d'administration...</p>
        </div>
      </div>
    );
  }

  // Filtrage des comptes
  const filteredComptes = comptes
    .filter((c) => (filtreStatutCompte === "TOUS" ? true : c.statut_compte === filtreStatutCompte))
    .filter((c) => {
      const full = `${c.nom} ${c.prenoms} ${c.telephone} ${c.commune_nom || ""}`.toLowerCase();
      return full.includes(searchCompte.toLowerCase());
    });

  const totalPagesComptes = Math.ceil(filteredComptes.length / ITEMS_PER_PAGE) || 1;
  const paginatedComptes = filteredComptes.slice((pageComptes - 1) * ITEMS_PER_PAGE, pageComptes * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col antialiased">
      {/* 1. EN-TÊTE D'ADMINISTRATION DU SYSTÈME */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/espace-ascq" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                <Image src="/logo-ascq.png" alt="Logo" width={32} height={32} className="object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-sm sm:text-base tracking-tight text-white">
                    Portail d'Administration & Périmètre
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {currentUser?.role_technique || "ADMIN"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {currentUser?.departement_nom ? `Département : ${currentUser.departement_nom}` : "Bénin National"} • {currentUser?.commune_nom ? `Commune : ${currentUser.commune_nom}` : "Toutes communes"}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/espace-ascq"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-sm transition-all active:scale-95"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Mon Espace ASCQ (Terrain)</span>
            </Link>
            <Link
              href="/fiches"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Surveillance</span>
            </Link>
          </div>
        </div>

        {/* BANDEAU TRICOLORE */}
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>

        {/* 2. BARRE D'ONGLETS DU PORTAIL */}
        <div className="bg-slate-950 border-t border-slate-800 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 py-1.5 min-w-max">
            {[
              { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
              { id: "comptes_ascq", label: "Comptes & ASCQ", icon: Users },
              { id: "perimetre_activites", label: "Périmètre & Activités", icon: Activity },
              { id: "permutations_requetes", label: "Permutations & Requêtes", icon: ArrowLeftRight },
              { id: "diffusion_alertes", label: "Diffusion Alertes", icon: BellRing },
              { id: "ecoute_conseils", label: "Conseils & Citoyens", icon: HeartHandshake },
              { id: "cotonou_referentiel", label: "Cotonou & Référentiel", icon: MapPin },
              { id: "exports", label: "Centre d'Exports", icon: FileSpreadsheet },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div className="max-w-7xl mx-auto px-4 mt-4 w-full">
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
              toastMessage.error
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200"
            }`}
          >
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="text-slate-500 hover:text-slate-800">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* CONTENU PRINCIPAL DES ONGLETS */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 space-y-6">
        {/* ========================================================= */}
        {/* ONGLET 1 : TABLEAU DE BORD ÉPIDÉMIOLOGIQUE & DÉCISIONNEL */}
        {/* ========================================================= */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Surveillance Épidémiologique & Décisions de Périmètre
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Indicateurs officiels de morbidité, mortalité, délais de riposte et effectifs de santé.
                </p>
              </div>
              <button
                type="button"
                onClick={() => chargerStatistiques(currentUser)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold hover:bg-slate-50 text-slate-700 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Actualiser les chiffres</span>
              </button>
            </div>

            {/* GRILLE DES INDICATEURS CLÉS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Total Alertes Notifiées</span>
                <span className="text-2xl font-black text-slate-900">{stats.total_alertes}</span>
                <span className="text-[10px] text-emerald-600 block mt-1 font-bold">
                  {stats.alertes_averees} confirmées avérées
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-sm bg-red-50/30">
                <span className="text-[11px] font-bold text-red-600 block uppercase">Alertes Prioritaires</span>
                <span className="text-2xl font-black text-red-700">{stats.alertes_prioritaires}</span>
                <span className="text-[10px] text-red-500 block mt-1 font-bold">
                  {stats.alertes_non_investiguees} en attente d'investigation
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Décès Communautaires</span>
                <span className="text-2xl font-black text-slate-900">{stats.total_deces}</span>
                <span className="text-[10px] text-amber-700 block mt-1 font-bold">
                  {stats.deces_maternels} maternels • {stats.deces_neonatals} néonatals
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Complétude RMA</span>
                <span className="text-2xl font-black text-slate-900">{stats.total_rma_deposes}</span>
                <span className="text-[10px] text-red-600 block mt-1 font-bold">
                  {stats.total_rma_retard} en retard (&gt; le 3 du mois)
                </span>
              </div>
            </div>

            {/* DÉLAIS DE RIPOSTE & EFFECTIFS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Délais Moyens de Surveillance & Riposte
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Détection &rarr; Notification</span>
                    <span className="text-xl font-black text-slate-900">
                      {stats.delai_moyen_notification} h
                    </span>
                    <span className="text-[10px] text-emerald-600 block font-bold">Norme : &lt; 24h</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Notification &rarr; Investigation</span>
                    <span className="text-xl font-black text-slate-900">
                      {stats.delai_moyen_investigation} h
                    </span>
                    <span className="text-[10px] text-blue-600 block font-bold">Norme : &lt; 48h</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Effectifs de Terrain Déployés
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 block">ASCQ Opérationnels</span>
                    <span className="text-xl font-black text-emerald-900">{stats.total_ascq_actifs}</span>
                    <span className="text-[10px] text-emerald-600 block font-bold">Comptes validés</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Relais Communautaires (RC)</span>
                    <span className="text-xl font-black text-slate-900">{stats.total_rc_actifs}</span>
                    <span className="text-[10px] text-slate-500 block font-bold">Enrôlés sur le périmètre</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TOP DES PATHOLOGIES SIGNALÉES */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Distribution des Pathologies Sous Surveillance (One Health)
              </h3>
              {stats.top_pathologies && stats.top_pathologies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {stats.top_pathologies.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-xs font-bold text-slate-800">{p.nom}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-[#005c30]">
                        {p.total}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Aucune alerte enregistrée pour cette période.</p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 2 : GESTION DES COMPTES & DES ASCQ */}
        {/* ========================================================= */}
        {tab === "comptes_ascq" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Gestion des Comptes ASCQ & Registre National
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Contrôle de conformité avec la liste officielle consolidée des 411 ASCQ déployés au Bénin.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportAscq}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter CSV</span>
                </button>
              </div>
            </div>

            {/* SOUS-NAVIGATION DES VUES */}
            <div className="flex border-b border-slate-200 gap-4">
              <button
                type="button"
                onClick={() => setVueSousOngletComptes("validation")}
                className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                  vueSousOngletComptes === "validation"
                    ? "border-emerald-600 text-emerald-800"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Inscriptions sur l'application ({filteredComptes.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setVueSousOngletComptes("referentiel");
                  if (referentielAscq.length === 0) chargerReferentielNational();
                }}
                className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                  vueSousOngletComptes === "referentiel"
                    ? "border-emerald-600 text-emerald-800"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Registre National Consolidé (411 ASCQ)</span>
              </button>
            </div>

            {/* VUE 1 : VALIDATION DES COMPTES D'INSCRIPTION */}
            {vueSousOngletComptes === "validation" && (
              <>
                {/* FILTRES & RECHERCHE */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom, téléphone, commune..."
                      value={searchCompte}
                      onChange={(e) => setSearchCompte(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto">
                    {["EN_ATTENTE", "VALIDE", "REJETE", "TOUS"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setFiltreStatutCompte(st)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          filtreStatutCompte === st
                            ? "bg-[#005c30] text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {st === "EN_ATTENTE" ? "En attente" : st === "VALIDE" ? "Validés" : st === "REJETE" ? "Rejetés" : "Tous"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* LISTE DES COMPTES (PAGINÉE) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                  {paginatedComptes.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Aucun compte correspondant aux critères de recherche.
                    </div>
                  ) : (
                    paginatedComptes.map((c) => (
                      <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900 uppercase">
                              {c.nom} {c.prenoms}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                c.statut_compte === "VALIDE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : c.statut_compte === "EN_ATTENTE"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {c.statut_compte}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              {c.poste}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            Tél : <span className="font-bold text-slate-700">{c.telephone}</span> • {c.commune_nom || c.communes?.nom || "Commune non assignée"} ({c.arrondissement_nom || c.arrondissements?.nom || "Arrondissement"}) • Financement : {c.source_financement || c.ascq_profils?.source_financement || "LLF"}
                          </p>

                          {/* CONTRÔLE REGISTRE NATIONAL OFFICIEL */}
                          {c.poste === "ASCQ" && (
                            <div className="pt-1">
                              {c.present_liste_nationale ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{c.details_liste_nationale || "Inscrit sur la liste nationale"}</span>
                                  {c.date_prise_service && (
                                    <span className="text-[10px] text-emerald-600 font-semibold">
                                      (Prise : {new Date(c.date_prise_service).toLocaleDateString("fr-FR")})
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <div className="inline-flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                  <span className="flex items-center gap-1 text-amber-700">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>⚠️ Nom absent dans la liste nationale consolidée</span>
                                  </span>
                                  {c.statut_compte === "EN_ATTENTE" && (
                                    <button
                                      type="button"
                                      onClick={() => handleAjouterAuReferentiel(c)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 text-[10px] font-extrabold transition-colors"
                                      title="Inscrire officiellement cet agent au registre national des ASCQ"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      <span>Inscrire au registre</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                          {c.statut_compte === "EN_ATTENTE" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleValiderCompte(c)}
                                disabled={actionLoadingId === c.id}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 active:scale-95 transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Valider</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejeterCompte(c.id)}
                                disabled={actionLoadingId === c.id}
                                className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Rejeter</span>
                              </button>
                            </>
                          )}
                          {c.statut_compte === "VALIDE" && (
                            <button
                              type="button"
                              onClick={() => handleRejeterCompte(c.id)}
                              className="px-2.5 py-1 text-slate-400 hover:text-red-600 text-xs font-semibold"
                            >
                              Suspendre
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {/* BARRE DE PAGINATION DES COMPTES */}
                  {totalPagesComptes > 1 && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        disabled={pageComptes <= 1}
                        onClick={() => setPageComptes(p => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                      >
                        &larr; Précédent
                      </button>
                      <span className="text-slate-500 font-semibold">
                        Page <strong>{pageComptes}</strong> sur <strong>{totalPagesComptes}</strong> ({filteredComptes.length} comptes)
                      </span>
                      <button
                        type="button"
                        disabled={pageComptes >= totalPagesComptes}
                        onClick={() => setPageComptes(p => Math.min(totalPagesComptes, p + 1))}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                      >
                        Suivant &rarr;
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* VUE 2 : REGISTRE NATIONAL CONSOLIDÉ */}
            {vueSousOngletComptes === "referentiel" && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Rechercher dans le registre officiel (Nom, commune, département...)"
                      value={searchReferentiel}
                      onChange={(e) => setSearchReferentiel(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={chargerReferentielNational}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1 shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Actualiser</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAjouterNouveauASCQManuel}
                      className="px-3 py-2 bg-[#005c30] text-white rounded-xl text-xs font-bold hover:bg-[#004a26] flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter un ASCQ officiel</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {(() => {
                    const filteredRef = referentielAscq.filter(r => 
                      `${r.nom_prenoms} ${r.commune} ${r.departement} ${r.arrondissement_poste}`.toLowerCase().includes(searchReferentiel.toLowerCase())
                    );
                    const totalPagesRef = Math.ceil(filteredRef.length / 20) || 1;
                    const paginatedRef = filteredRef.slice((pageReferentiel - 1) * 20, pageReferentiel * 20);

                    return (
                      <>
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
                          <span>
                            {loadingReferentiel
                              ? "Chargement du registre..."
                              : `${filteredRef.length} ASCQ recensés sur la liste consolidée officielle`}
                          </span>
                          <span className="text-[11px] text-slate-400">Source : Ministère de la Santé / Coordination</span>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                          {paginatedRef.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs">
                              Aucun ASCQ trouvé dans le registre officiel pour cette recherche.
                            </div>
                          ) : (
                            paginatedRef.map((r, idx) => (
                              <div key={r.id || idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 text-xs">
                                <div>
                                  <span className="font-black text-slate-900 block uppercase">
                                    {r.nom_prenoms}
                                  </span>
                                  <span className="text-slate-500 font-medium">
                                    {r.departement} &bull; <strong className="text-slate-700">{r.commune}</strong> ({r.arrondissement_poste})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {r.date_prise_service && (
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                      Prise de service : {new Date(r.date_prise_service).toLocaleDateString("fr-FR")}
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    Officiel
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {totalPagesRef > 1 && (
                          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                            <button
                              type="button"
                              disabled={pageReferentiel <= 1}
                              onClick={() => setPageReferentiel(p => Math.max(1, p - 1))}
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                            >
                              &larr; Précédent
                            </button>
                            <span className="text-slate-500 font-semibold">
                              Page <strong>{pageReferentiel}</strong> sur <strong>{totalPagesRef}</strong> ({filteredRef.length} ASCQ)
                            </span>
                            <button
                              type="button"
                              disabled={pageReferentiel >= totalPagesRef}
                              onClick={() => setPageReferentiel(p => Math.min(totalPagesRef, p + 1))}
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                            >
                              Suivant &rarr;
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 3 : PÉRIMITRE & ACTIVITÉS DEMANDÉES AUX ASCQ */}
        {/* ========================================================= */}
        {tab === "perimetre_activites" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Activity className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Demander une Activité ou Mission Spécifique aux ASCQ
                  </h2>
                  <p className="text-xs text-slate-500">
                    Diffuser une consigne de terrain ou un ordre de mission (Sensibilisation, riposte, ratissage) sur votre périmètre.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreerActiviteDemandee} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Titre de la mission</label>
                    <input
                      type="text"
                      placeholder="Ex : Ratissage vaccinal rougeole dans les hameaux isolés"
                      value={titreActivite}
                      onChange={(e) => setTitreActivite(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date d'échéance</label>
                    <input
                      type="date"
                      value={dateEcheanceActivite}
                      onChange={(e) => setDateEcheanceActivite(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Type d'activité</label>
                    <select
                      value={typeActivite}
                      onChange={(e) => setTypeActivite(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                    >
                      <option value="SENSIBILISATION">Campagne de Sensibilisation</option>
                      <option value="RATISSAGE_VACCINAL">Ratissage Vaccinal</option>
                      <option value="RIPOSTE_EPIDEMIQUE">Riposte Épidémique Immédiate</option>
                      <option value="ENQUETE_TERRAIN">Enquête et autopsie communautaire</option>
                      <option value="REUNION_COORDINATION">Réunion de Coordination</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Niveau d'Urgence</label>
                    <select
                      value={prioriteActivite}
                      onChange={(e) => setPrioriteActivite(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                    >
                      <option value="NORMALE">Priorité Normale</option>
                      <option value="HAUTE">Haute Priorité</option>
                      <option value="URGENTE">Urgente (Riposte immédiate)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description détaillée des consignes</label>
                  <textarea
                    rows={3}
                    placeholder="Précisez les objectifs, les zones ciblées et les résultats attendus..."
                    value={descActivite}
                    onChange={(e) => setDescActivite(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  ></textarea>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={envoiActiviteLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#005c30] text-white font-bold text-xs shadow-md hover:bg-[#004724] active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{envoiActiviteLoading ? "Transmission..." : "Transmettre la mission aux ASCQ"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* HISTORIQUE DES ACTIVITÉS DEMANDÉES */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">
                Missions transmises sur le périmètre
              </h3>
              <div className="divide-y divide-slate-100">
                {activitesDemandees.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400 italic">Aucune mission enregistrée pour le moment.</p>
                ) : (
                  activitesDemandees.map((act) => (
                    <div key={act.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{act.titre}</span>
                          <span className="px-2 py-0.2 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700">
                            {act.type_activite}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-1">{act.description}</p>
                        <p className="text-slate-400 text-[10px] mt-1">
                          Échéance : {act.date_echeance} • Statut : <span className="font-bold">{act.statut}</span>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 4 : PERMUTATIONS & REQUÊTES DES ASCQ */}
        {/* ========================================================= */}
        {tab === "permutations_requetes" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* A. PERMUTATIONS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Demandes de Permutation</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {permutations.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400 italic">Aucune demande de permutation en cours.</p>
                ) : (
                  permutations.map((p) => (
                    <div key={p.id} className="py-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">
                          {p.ascq?.prenoms} {p.ascq?.nom} {p.partenaire ? `⇄ ${p.partenaire.prenoms} ${p.partenaire.nom}` : ""}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {p.statut}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Motif : {p.motif} • Poste actuel : {p.commune_depart_id || "Origine"} &rarr; Souhait : {p.commune_souhaite_id || "Destination"}
                      </p>
                      {(p.statut === "OUVERTE" || p.statut === "PROPOSEE") && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleValiderPermutation(p.id)}
                            className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                          >
                            Approuver la permutation
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* B. REQUÊTES DES ASCQ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <MessageSquareText className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Requêtes & Doléances des ASCQ</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {requetes.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400 italic">Aucune requête en attente de réponse.</p>
                ) : (
                  requetes.map((r) => (
                    <div key={r.id} className="py-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{r.objet}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                          {r.statut}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{r.message}</p>
                      <p className="text-[10px] text-slate-400">
                        Par : {r.ascq?.prenoms} {r.ascq?.nom} ({r.ascq?.telephone})
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequete(r);
                          setReponseRequeteTexte(r.reponse_admin || "");
                        }}
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        {r.reponse_admin ? "Modifier la réponse officielle" : "Répondre à cette requête &rarr;"}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* MODALE DE RÉPONSE */}
              {selectedRequete && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mt-3">
                  <h4 className="text-xs font-bold text-slate-900">
                    Réponse officielle à : {selectedRequete.objet}
                  </h4>
                  <textarea
                    rows={3}
                    placeholder="Rédigez la réponse administrative..."
                    value={reponseRequeteTexte}
                    onChange={(e) => setReponseRequeteTexte(e.target.value)}
                    className="w-full p-2 bg-white rounded-lg border border-slate-300 text-xs font-semibold"
                  ></textarea>
                  <div className="flex items-center justify-between">
                    <select
                      value={reponseRequeteStatut}
                      onChange={(e) => setReponseRequeteStatut(e.target.value)}
                      className="text-xs font-bold bg-white p-1.5 rounded-lg border border-slate-300"
                    >
                      <option value="RESOLUE">Marquer Résolue</option>
                      <option value="EN_COURS">Marquer En cours</option>
                      <option value="REJETEE">Rejeter</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRequete(null)}
                        className="text-xs text-slate-500 font-bold px-2 py-1"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleRepondreRequete}
                        className="px-3 py-1.5 rounded-xl bg-[#005c30] text-white font-bold text-xs"
                      >
                        Envoyer la réponse
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 5 : DIFFUSION D'ALERTES & CONSIGNES OFFICIELLES */}
        {/* ========================================================= */}
        {tab === "diffusion_alertes" && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <BellRing className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Diffuser une Alerte Sanitaire ou Consigne Officielle
                </h2>
                <p className="text-xs text-slate-500">
                  Envoie instantanément une notification in-app haute priorité sur le téléphone des agents de votre périmètre.
                </p>
              </div>
            </div>

            <form onSubmit={handleDiffuserAlerte} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Titre du signal / message</label>
                <input
                  type="text"
                  placeholder="Ex : VIGILANCE CHOLÉRA : Signalements récents dans la zone sanitaire"
                  value={titreDiffusion}
                  onChange={(e) => setTitreDiffusion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Degré de Priorité</label>
                <select
                  value={prioriteDiffusion}
                  onChange={(e) => setPrioriteDiffusion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                >
                  <option value="NORMALE">Priorité Normale</option>
                  <option value="HAUTE">Haute Priorité (Avertissement)</option>
                  <option value="URGENTE">🚨 Alerte d'Urgence Sanitaire (Bandeau rouge)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contenu de la consigne</label>
                <textarea
                  rows={4}
                  placeholder="Rédigez les instructions opérationnelles à l'attention des ASCQ..."
                  value={messageDiffusion}
                  onChange={(e) => setMessageDiffusion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={diffusionLoading}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{diffusionLoading ? "Diffusion..." : "Diffuser l'alerte maintenant"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 6 : ÉCOUTE CITOYENNE & CONSEILS SANTÉ */}
        {/* ========================================================= */}
        {tab === "ecoute_conseils" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* A. SUGGESTIONS ET RÉCLAMATIONS DU PUBLIC */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <HeartHandshake className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Écoute Citoyenne (Suggestions du public)
                </h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {suggestions.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400 italic">Aucune suggestion ou réclamation enregistrée.</p>
                ) : (
                  suggestions.map((s) => (
                    <div key={s.id} className="py-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{s.objet}</span>
                        <span className="px-2 py-0.2 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700">
                          {s.type_message}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{s.message}</p>
                      <p className="text-[10px] text-slate-400">
                        De : {s.nom || "Anonyme"} {s.telephone ? `(${s.telephone})` : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* B. GESTION DES CONSEILS SANTÉ PUBLICS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Conseils Santé (Visibles sur la page d'accueil)
                </h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {conseilsSante.map((cs) => (
                  <div key={cs.id} className="py-2.5">
                    <h4 className="text-xs font-bold text-slate-900">{cs.titre}</h4>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{cs.contenu}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 7 : COTONOU & GESTION DES RÉFÉRENTIELS */}
        {/* ========================================================= */}
        {tab === "cotonou_referentiel" && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Rattachement des Arrondissements de Cotonou aux Zones Sanitaires
                </h2>
                <p className="text-xs text-slate-500">
                  Conformément aux directives officielles, attribuez chaque arrondissement de Cotonou à sa zone sanitaire (Cotonou 1, 2, 3 ou 4).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {arrondissementsCotonou.map((arr) => (
                <div key={arr.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-slate-900 uppercase">{arr.nom}</span>
                    <span className="text-[10px] text-slate-500 block">
                      Zone actuelle : <span className="font-bold">{arr.zones_sanitaires?.nom || "À rattacher"}</span>
                    </span>
                  </div>

                  <select
                    defaultValue={arr.zone_sanitaire_id || ""}
                    onChange={(e) => handleRattacherCotonou(arr.id, e.target.value)}
                    className="text-xs font-bold bg-white px-2 py-1 rounded-lg border border-slate-300 text-slate-800 focus:outline-none"
                  >
                    <option value="">-- Choisir la zone --</option>
                    {zonesCotonou.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.nom}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 8 : CENTRE D'EXPORTS DE DONNÉES */}
        {/* ========================================================= */}
        {tab === "exports" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-[#005c30] w-fit mb-2">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">Liste Officielle des ASCQ</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Extraction complète : nom, téléphone, affectation, source de financement et effectif des relais.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportAscq}
                className="w-full py-2 bg-[#005c30] hover:bg-[#004724] text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger CSV</span>
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 w-fit mb-2">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">Surveillance Épidémiologique</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Données des alertes et signaux One Health <strong>100% anonymisées</strong> sans NPI ni identité.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportSurveillance}
                className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger CSV</span>
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 w-fit mb-2">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">Rapports Mensuels RMA</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Consolidation de tous les indicateurs mensuels d'activité iCCM et One Health par commune.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportSurveillance}
                className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger CSV</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
