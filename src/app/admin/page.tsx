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
  Check,
  BookOpen,
  Crown,
  Award,
  Edit3,
  ExternalLink,
  FileText,
  EyeOff,
  Key,
  KeyRound,
  Copy,
  History,
  UserX,
  ChevronDown,
  ChevronUp,
  FileCheck,
  PhoneCall
} from "lucide-react";

import BeninPhoneAction from "@/components/BeninPhoneAction";
import { parseBeninPhone } from "@/lib/beninPhone";

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
    | "bibliotheque"
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
  // Filtre par Niveau Hiérarchique (Super Admin - Demande officielle)
  const [filtreNiveauCompte, setFiltreNiveauCompte] = useState<string>("TOUS");

  // Modal Radiation compte (Super Admin / Représentant)
  const [modalRadiationUser, setModalRadiationUser] = useState<any | null>(null);
  const [motifRadiationAdmin, setMotifRadiationAdmin] = useState("FIN_CONTRAT");
  const [explicationRadiationAdmin, setExplicationRadiationAdmin] = useState("");
  const [submittingRadiationAdmin, setSubmittingRadiationAdmin] = useState(false);

  // Modal Suppression définitive (Test / Doublon)
  const [modalSuppressionUser, setModalSuppressionUser] = useState<any | null>(null);
  const [confirmTexteSuppressionAdmin, setConfirmTexteSuppressionAdmin] = useState("");
  const [submittingSuppressionAdmin, setSubmittingSuppressionAdmin] = useState(false);
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
  const [nouveauConseilCategorie, setNouveauConseilCategorie] = useState("Santé communautaire");
  const [nouveauConseilAuteur, setNouveauConseilAuteur] = useState("Coordination ASCQ");
  const [publierConseilLoading, setPublierConseilLoading] = useState(false);

  // Bibliothèque documentaire
  const [documentsBiblio, setDocumentsBiblio] = useState<any[]>([]);
  const [searchBiblio, setSearchBiblio] = useState("");
  const [filtreCatBiblio, setFiltreCatBiblio] = useState("TOUS");
  const [nouveauDocTitre, setNouveauDocTitre] = useState("");
  const [nouveauDocCategorie, setNouveauDocCategorie] = useState("GUIDE_CLINIQUE");
  const [nouveauDocDescription, setNouveauDocDescription] = useState("");
  const [nouveauDocLien, setNouveauDocLien] = useState("");
  const [nouveauDocFormat, setNouveauDocFormat] = useState("PDF");
  const [nouveauDocAuteur, setNouveauDocAuteur] = useState("MINISTERE DE LA SANTE");
  const [ajouterDocLoading, setAjouterDocLoading] = useState(false);

  // -------------------------------------------------------------------
  // DÉTERMINATION DU NIVEAU HIÉRARCHIQUE & CONFIGURATION BADGES
  // -------------------------------------------------------------------
  const determinerNiveauCompte = (c: any): "NATIONAL" | "DEPARTEMENTAL" | "ZONE_SANITAIRE" | "COMMUNAL" | "ASCQ" | "RELAIS" => {
    const tel = (c.telephone || "").replace(/\D/g, "");
    const role = (c.role_technique || "").toUpperCase();
    const poste = (c.poste || "").toUpperCase();
    const nom = (c.role_nomination || "").toUpperCase();
    
    if (tel.includes("69031463") || role.includes("SUPER_ADMIN") || role === "ADMINISTRATEUR" || poste === "CADRE_NATIONAL" || role === "CADRE_NATIONAL" || nom.includes("NATIONAL")) {
      return "NATIONAL";
    }
    if (poste === "RC" || role === "RELAIS_COMMUNAUTAIRE" || role === "RC") {
      return "RELAIS";
    }
    if (["DDS", "CCD_CDLS_TP", "CSSPR", "CSPSMEH", "CSPSMEMH", "CADRE_DEPARTEMENTAL", "REPRESENTANT_DEPARTEMENTAL"].includes(poste) ||
        role.includes("DEPARTEMENTAL") || nom.includes("DEPARTEMENTAL")) {
      return "DEPARTEMENTAL";
    }
    if (["MCZS", "RCSE", "C_RAMS", "C-RAMS", "CADRE_ZONE_SANITAIRE"].includes(poste) ||
        role.includes("ZONE_SANITAIRE") || role === "MCZS" || nom.includes("ZONE")) {
      return "ZONE_SANITAIRE";
    }
    if (["MCC", "PF_CCLS_TP", "REPRESENTANT_COMMUNAL", "CADRE_COMMUNAL", "ADMIN_COMMUNAL"].includes(poste) ||
        role.includes("COMMUNAL") || nom.includes("COMMUNAL")) {
      return "COMMUNAL";
    }
    return "ASCQ";
  };

  const getNiveauBadgeConfig = (niveau: string) => {
    switch (niveau) {
      case "NATIONAL":
        return { label: "Niveau National", bg: "bg-purple-100 text-purple-900 border-purple-300", icon: ShieldCheck };
      case "DEPARTEMENTAL":
        return { label: "Niveau Département", bg: "bg-indigo-100 text-indigo-900 border-indigo-300", icon: Crown };
      case "ZONE_SANITAIRE":
        return { label: "Niveau Zone Sanitaire", bg: "bg-cyan-100 text-cyan-900 border-cyan-300", icon: Activity };
      case "COMMUNAL":
        return { label: "Niveau Commune", bg: "bg-blue-100 text-blue-900 border-blue-300", icon: Building };
      case "RELAIS":
        return { label: "Niveau Village (RC)", bg: "bg-amber-100 text-amber-900 border-amber-300", icon: Users };
      case "ASCQ":
      default:
        return { label: "Niveau Arrondissement (ASCQ)", bg: "bg-emerald-100 text-emerald-900 border-emerald-300", icon: UserCheck };
    }
  };

  // Actions de Radiation, Rétablissement et Suppression Définitive
  const handleRadierCompteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalRadiationUser) return;
    setSubmittingRadiationAdmin(true);
    try {
      const { error } = await supabase.rpc("radier_compte_ascq", {
        p_user_id: modalRadiationUser.id,
        p_motif: motifRadiationAdmin,
        p_explication: explicationRadiationAdmin || null,
      });

      if (error) {
        const motifFinal = `${motifRadiationAdmin}${explicationRadiationAdmin ? " - " + explicationRadiationAdmin : ""}`;
        let updOk = false;
        try {
          const { error: e1 } = await (supabase.from("utilisateurs").update({
            statut_compte: "RADIE",
            motif_radiation: motifFinal,
            date_radiation: new Date().toISOString(),
          } as any) as any).eq("id", modalRadiationUser.id);
          if (!e1) updOk = true;
        } catch (e) {}

        if (!updOk) {
          try {
            const { error: e2 } = await supabase.from("utilisateurs").update({
              statut_compte: "RADIE",
              poste_autre: `RADIE: ${motifFinal}`
            }).eq("id", modalRadiationUser.id);
            if (!e2) updOk = true;
          } catch (e) {}
        }

        if (!updOk) {
          await supabase.from("utilisateurs").update({
            statut_compte: "SUSPENDU",
            poste_autre: `RADIE: ${motifFinal}`
          }).eq("id", modalRadiationUser.id);
        }
      }

      setToastMessage({ text: `Compte de ${modalRadiationUser.prenoms} ${modalRadiationUser.nom} radié avec succès.`, error: false });
      setModalRadiationUser(null);
      setExplicationRadiationAdmin("");
      await chargerComptes();
    } catch (err: any) {
      setToastMessage({ text: `Erreur radiation : ${err.message}`, error: true });
    } finally {
      setSubmittingRadiationAdmin(false);
    }
  };

  const handleRetablirCompteAdmin = async (c: any) => {
    if (!confirm(`Rétablir le compte de ${c.prenoms} ${c.nom} au statut VALIDE ?`)) return;
    try {
      const { error } = await supabase.rpc("retablir_compte_ascq", {
        p_user_id: c.id,
      });
      if (error) {
        let updOk = false;
        try {
          const { error: e1 } = await (supabase.from("utilisateurs").update({
            statut_compte: "VALIDE",
            motif_radiation: null,
            date_radiation: null,
          } as any) as any).eq("id", c.id);
          if (!e1) updOk = true;
        } catch (e) {}

        if (!updOk) {
          await supabase.from("utilisateurs").update({
            statut_compte: "VALIDE",
            poste_autre: null
          }).eq("id", c.id);
        }
      }
      setToastMessage({ text: `Compte rétabli au statut VALIDE avec succès.`, error: false });
      await chargerComptes();
    } catch (err: any) {
      setToastMessage({ text: `Erreur rétablissement : ${err.message}`, error: true });
    }
  };

  const handleSupprimerCompteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSuppressionUser) return;
    if (confirmTexteSuppressionAdmin !== "SUPPRIMER") {
      alert("Veuillez saisir exactement le mot 'SUPPRIMER' pour confirmer.");
      return;
    }
    setSubmittingSuppressionAdmin(true);
    try {
      const { error } = await supabase.rpc("supprimer_compte_ascq", {
        p_user_id: modalSuppressionUser.id,
        p_motif: "Suppression définitive par l'administrateur",
      });
      if (error) {
        await supabase.from("ascq_profils").delete().eq("id", modalSuppressionUser.id);
        await supabase.from("relais_communautaires").delete().or(`ascq_id.eq.${modalSuppressionUser.id},user_id.eq.${modalSuppressionUser.id}`);
        await supabase.from("utilisateurs").delete().eq("id", modalSuppressionUser.id);
      }
      setToastMessage({ text: `Compte supprimé définitivement.`, error: false });
      setModalSuppressionUser(null);
      setConfirmTexteSuppressionAdmin("");
      await chargerComptes();
    } catch (err: any) {
      setToastMessage({ text: `Erreur suppression : ${err.message}`, error: true });
    } finally {
      setSubmittingSuppressionAdmin(false);
    }
  };

  // Nomination & Assignation de responsabilité (Super Admin exclusif)
  const [nominationModalUser, setNominationModalUser] = useState<any | null>(null);
  const [nominationPoste, setNominationPoste] = useState("ASCQ");
  const [nominationRoleTechnique, setNominationRoleTechnique] = useState("ASCQ");
  const [nominationDepId, setNominationDepId] = useState("");
  const [nominationZsId, setNominationZsId] = useState("");
  const [nominationComId, setNominationComId] = useState("");
  const [nominationMotif, setNominationMotif] = useState("");
  const [nominationLoading, setNominationLoading] = useState(false);

  // Modification profil communal / PF avec JUSTIFICATION OBLIGATOIRE
  const [profilModalUser, setProfilModalUser] = useState<any | null>(null);
  const [profilNom, setProfilNom] = useState("");
  const [profilPrenoms, setProfilPrenoms] = useState("");
  const [profilTelephone, setProfilTelephone] = useState("");
  const [profilDepId, setProfilDepId] = useState("");
  const [profilZsId, setProfilZsId] = useState("");
  const [profilComId, setProfilComId] = useState("");
  const [profilArrId, setProfilArrId] = useState("");
  const [profilSourceFinancement, setProfilSourceFinancement] = useState("LLF");
  const [profilDiplome, setProfilDiplome] = useState("");
  const [profilStatutCompte, setProfilStatutCompte] = useState("VALIDE");
  const [profilJustification, setProfilJustification] = useState("");
  const [profilLoading, setProfilLoading] = useState(false);

  // Espace Périmètre : Supervision 360°, Dossier complet & Recherche ASCQ
  const [perimetreSousOnglet, setPerimetreSousOnglet] = useState<"supervision" | "missions" | "demandes_mdp">("supervision");
  const [searchPerimetreAscq, setSearchPerimetreAscq] = useState("");
  const [selectedPerimetreAscq, setSelectedPerimetreAscq] = useState<any | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [dossierAscq, setDossierAscq] = useState<{ relais: any[]; rma: any[]; hebdo: any[]; audits: any[] }>({
    relais: [],
    rma: [],
    hebdo: [],
    audits: [],
  });

  // Réinitialisation de Mot de Passe & Demandes reçues
  const [resetMdpModalUser, setResetMdpModalUser] = useState<any | null>(null);
  const [nouveauMdp, setNouveauMdp] = useState("Benin2026!");
  const [motifResetMdp, setMotifResetMdp] = useState("Réinitialisation suite à mot de passe oublié");
  const [resetMdpLoading, setResetMdpLoading] = useState(false);
  const [resetMdpResult, setResetMdpResult] = useState<{ telephone: string; mdp: string } | null>(null);
  const [demandesMdpList, setDemandesMdpList] = useState<any[]>([]);

  // Données géographiques pour nominations et filtres
  const [listeDepartements, setListeDepartements] = useState<any[]>([]);
  const [listeZonesSanitaires, setListeZonesSanitaires] = useState<any[]>([]);
  const [listeCommunes, setListeCommunes] = useState<any[]>([]);
  const [listeArrondissements, setListeArrondissements] = useState<any[]>([]);

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

      // Lecture de l'onglet dans l'URL (?tab=)
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get("tab");
        if (urlTab && ["dashboard", "comptes_ascq", "perimetre_activites", "permutations_requetes", "diffusion_alertes", "ecoute_conseils", "bibliotheque", "cotonou_referentiel", "exports"].includes(urlTab)) {
          setTab(urlTab as any);
        }
      }

      // Rôles autorisés : Super Admin, Admins, Représentants et Cadres territoriaux
      const allowedRoles = [
        "SUPER_ADMIN",
        "ADMINISTRATEUR",
        "REPRESENTANT_DEPARTEMENTAL",
        "ADMIN_DEPARTEMENTAL",
        "CADRE_DEPARTEMENTAL",
        "CADRE_ZONE_SANITAIRE",
        "GESTIONNAIRE_PERIMETRE",
        "REPRESENTANT_COMMUNAL",
        "ADMIN_COMMUNAL",
        "CADRE_COMMUNAL",
        "PF_CCLS_TP",
      ];
      
      const isAllowed = 
        allowedRoles.includes(profil.role_technique) ||
        allowedRoles.includes(profil.poste) ||
        allowedRoles.includes(profil.role_nomination) ||
        profil.poste === "REPRESENTANT_COMMUNAL" ||
        profil.poste === "REPRESENTANT_DEPARTEMENTAL" ||
        profil.poste === "PF_CCLS_TP";

      if (!isAllowed) {
        alert("Accès réservé aux administrateurs, représentants et cadres territoriaux.");
        router.push("/espace-ascq");
        return;
      }

      setCurrentUser(profil);

      // Charger les données géographiques complètes pour nominations & profils
      try {
        const [depRes, zsRes, comRes, arrRes] = await Promise.all([
          supabase.from("departements").select("id, nom").order("nom"),
          supabase.from("zones_sanitaires").select("id, nom, departement_id").order("nom"),
          supabase.from("communes").select("id, nom, departement_id, zone_sanitaire_id").order("nom"),
          supabase.from("arrondissements").select("id, nom, commune_id").order("nom"),
        ]);
        setListeDepartements(depRes.data || []);
        setListeZonesSanitaires(zsRes.data || []);
        setListeCommunes(comRes.data || []);
        setListeArrondissements(arrRes.data || []);
      } catch (geoErr) {
        console.warn("Erreur chargement cascades géographiques:", geoErr);
      }

      // Charger les statistiques selon le périmètre (commune ou département)
      await chargerStatistiques(profil);

      // Charger les comptes
      await chargerComptes();

      // Charger les autres données
      await chargerDonneesSecondaires(profil);
      await chargerDemandesResetMdp();
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
          .select("*, departements(nom), communes(nom), arrondissements!utilisateurs_arrondissement_id_fkey(nom)")
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

      // 7. Bibliothèque de documents
      const { data: biblio } = await supabase
        .from("bibliotheque_documents")
        .select("*")
        .order("created_at", { ascending: false });
      setDocumentsBiblio(biblio || []);
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

  // Contrôles de permissions hiérarchiques
  const peutValiderCompte = (compte: any) => {
    if (!currentUser) return false;
    const role = currentUser.role_technique;
    if (role === "SUPER_ADMIN" || role === "ADMINISTRATEUR") return true;
    if (role === "REPRESENTANT_DEPARTEMENTAL" || role === "ADMIN_DEPARTEMENTAL") {
      return (
        compte.departement_id === currentUser.departement_id &&
        ["ASCQ", "PF_CCLS_TP"].includes(compte.poste)
      );
    }
    if (role === "REPRESENTANT_COMMUNAL" || role === "ADMIN_COMMUNAL") {
      return compte.commune_id === currentUser.commune_id && compte.poste === "ASCQ";
    }
    return false;
  };

  const peutModifierProfil = (compte: any) => {
    if (!currentUser) return false;
    const role = currentUser.role_technique;
    if (role === "SUPER_ADMIN") return true;
    if (role === "REPRESENTANT_DEPARTEMENTAL" || role === "ADMIN_DEPARTEMENTAL") {
      return (
        compte.departement_id === currentUser.departement_id &&
        ["REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "ASCQ"].includes(compte.poste)
      );
    }
    return false;
  };

  // Nomination & Assignation de responsabilité (Super Admin exclusif)
  const ouvrirModalNomination = (compte: any) => {
    setNominationModalUser(compte);
    setNominationPoste(compte.poste || "ASCQ");
    setNominationRoleTechnique(compte.role_technique || "ASCQ");
    setNominationDepId(compte.departement_id || "");
    setNominationZsId(compte.zone_sanitaire_id || "");
    setNominationComId(compte.commune_id || "");
    setNominationMotif("Nomination officielle par le Super Administrateur National");
  };

  const handleAssignerResponsabilite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nominationModalUser) return;
    if (!nominationMotif.trim()) {
      alert("Veuillez renseigner le motif ou la référence de la nomination.");
      return;
    }
    setNominationLoading(true);
    try {
      // 1. Tenter la fonction dédiée avec traçabilité et justification
      const { data, error } = await supabase.rpc("admin_nommer_ascq_responsabilite", {
        p_ascq_id: nominationModalUser.id,
        p_nouveau_poste: nominationPoste,
        p_nouveau_role_technique: nominationRoleTechnique,
        p_departement_id: nominationDepId || null,
        p_zone_sanitaire_id: nominationZsId || null,
        p_commune_id: nominationComId || null,
        p_motif_nomination: nominationMotif.trim(),
      });

      if (error) {
        // Fallback sur la fonction d'assignation standard
        const { error: errFallback } = await supabase.rpc("admin_assigner_responsabilite", {
          p_target_user_id: nominationModalUser.id,
          p_nouveau_poste: nominationPoste,
          p_nouveau_role_technique: nominationRoleTechnique,
          p_departement_id: nominationDepId || null,
          p_zone_sanitaire_id: nominationZsId || null,
          p_commune_id: nominationComId || null,
        });
        if (errFallback) {
          // Secours direct sur la table utilisateurs
          const { error: directErr } = await supabase
            .from("utilisateurs")
            .update({
              poste: nominationPoste,
              role_technique: nominationRoleTechnique,
              role_nomination: nominationPoste,
              departement_id: nominationDepId || null,
              zone_sanitaire_id: nominationZsId || null,
              commune_id: nominationComId || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", nominationModalUser.id);
          if (directErr) throw directErr;
        }
      }

      setToastMessage({
        text: `Nomination réussie : ${nominationModalUser.nom} ${nominationModalUser.prenoms} est désormais ${nominationPoste} (${nominationRoleTechnique}) avec accès élargi !`,
        error: false,
      });

      if (selectedPerimetreAscq?.id === nominationModalUser.id) {
        setSelectedPerimetreAscq((prev: any) => ({
          ...prev,
          poste: nominationPoste,
          role_technique: nominationRoleTechnique,
          departement_id: nominationDepId || prev?.departement_id,
          zone_sanitaire_id: nominationZsId || prev?.zone_sanitaire_id,
          commune_id: nominationComId || prev?.commune_id,
        }));
      }

      setNominationModalUser(null);
      await chargerComptes();
    } catch (err: any) {
      setToastMessage({ text: "Erreur assignation : " + (err.message || err), error: true });
    } finally {
      setNominationLoading(false);
    }
  };

  // Modification profil ASCQ avec JUSTIFICATION OBLIGATOIRE
  const ouvrirModalProfil = (compte: any) => {
    setProfilModalUser(compte);
    setProfilNom(compte.nom || "");
    setProfilPrenoms(compte.prenoms || "");
    setProfilTelephone(compte.telephone || "");
    setProfilDepId(compte.departement_id || "");
    setProfilZsId(compte.zone_sanitaire_id || "");
    setProfilComId(compte.commune_id || "");
    setProfilArrId(compte.arrondissement_id || "");
    setProfilSourceFinancement(compte.source_financement || compte.ascq_profils?.source_financement || "LLF");
    setProfilDiplome(compte.diplome || compte.ascq_profils?.diplome || "");
    setProfilStatutCompte(compte.statut_compte || "VALIDE");
    setProfilJustification("");
  };

  const handleEnregistrerProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profilModalUser) return;

    if (!profilJustification || profilJustification.trim().length < 5) {
      alert("⚠️ JUSTIFICATION OBLIGATOIRE : Veuillez fournir un motif ou une justification administrative explicite (au moins 5 caractères) pour valider cette modification.");
      return;
    }

    setProfilLoading(true);
    try {
      // 1. Appel RPC complet avec traçabilité d'audit
      const { data, error } = await supabase.rpc("admin_modifier_profil_ascq_avec_justification", {
        p_ascq_id: profilModalUser.id,
        p_nom: profilNom.trim(),
        p_prenoms: profilPrenoms.trim(),
        p_telephone: profilTelephone.trim(),
        p_departement_id: profilDepId || null,
        p_zone_sanitaire_id: profilZsId || null,
        p_commune_id: profilComId || null,
        p_arrondissement_id: profilArrId || null,
        p_source_financement: profilSourceFinancement,
        p_diplome: profilDiplome.trim() || null,
        p_statut_compte: profilStatutCompte,
        p_justification: profilJustification.trim(),
      });

      if (error) {
        // Fallback update direct si la migration SQL n'est pas encore appliquée
        const { error: errDirect } = await supabase
          .from("utilisateurs")
          .update({
            nom: profilNom.trim(),
            prenoms: profilPrenoms.trim(),
            telephone: profilTelephone.trim(),
            departement_id: profilDepId || null,
            zone_sanitaire_id: profilZsId || null,
            commune_id: profilComId || null,
            arrondissement_id: profilArrId || null,
            statut_compte: profilStatutCompte,
          })
          .eq("id", profilModalUser.id);
        if (errDirect) throw errDirect;

        await supabase
          .from("ascq_profils")
          .upsert({
            user_id: profilModalUser.id,
            source_financement: profilSourceFinancement,
            diplome: profilDiplome.trim() || null,
          });
      }

      setToastMessage({
        text: `Fiche profil de ${profilNom} ${profilPrenoms} mise à jour et justifiée avec succès !`,
        error: false,
      });

      if (selectedPerimetreAscq?.id === profilModalUser.id) {
        chargerDossierCompletAscq(profilModalUser);
      }

      setProfilModalUser(null);
      await chargerComptes();
    } catch (err: any) {
      setToastMessage({ text: "Erreur modification profil : " + (err.message || err), error: true });
    } finally {
      setProfilLoading(false);
    }
  };

  // Chargement exhaustif du dossier 360° d'un ASCQ (Relais, RMA, PNSC, Plannings, Audits)
  const chargerDossierCompletAscq = async (ascq: any) => {
    setSelectedPerimetreAscq(ascq);
    setLoadingDossier(true);
    try {
      // 1. Relais communautaires supervisés
      const { data: relais } = await supabase
        .from("relais_communautaires")
        .select("*")
        .eq("ascq_id", ascq.id)
        .order("nom", { ascending: true });

      // 2. Rapports Mensuels RMA
      const { data: rma } = await supabase
        .from("rapports_mensuels_ascq")
        .select("id, mois, annee, statut, date_validation, created_at, numero_rapport")
        .eq("ascq_id", ascq.id)
        .order("annee", { ascending: false })
        .order("mois", { ascending: false });

      // 3. Suivis Hebdo PNSC
      const { data: hebdo } = await supabase
        .from("rapports_hebdo_pnsc")
        .select("id, annee, semaine, statut, rh_gap, motos_gap, ordinateurs_gap, remuneration_due_llf, remuneration_due_fadec, remuneration_due_srhr, created_at")
        .eq("ascq_id", ascq.id)
        .order("annee", { ascending: false })
        .order("semaine", { ascending: false });

      // 4. Audits & Justifications
      const { data: audits } = await supabase
        .from("audit_modifications_ascq")
        .select("*, admin:admin_id(nom, prenoms)")
        .eq("ascq_id", ascq.id)
        .order("created_at", { ascending: false });

      setDossierAscq({
        relais: relais || [],
        rma: rma || [],
        hebdo: hebdo || [],
        audits: audits || [],
      });
    } catch (err) {
      console.error("Erreur chargement dossier complet ASCQ:", err);
    } finally {
      setLoadingDossier(false);
    }
  };

  // Réinitialisation de mot de passe (En cas d'oubli)
  const ouvrirModalResetMdp = (compte: any) => {
    setResetMdpModalUser(compte);
    setNouveauMdp("Benin2026!");
    setMotifResetMdp("Réinitialisation suite à mot de passe oublié");
    setResetMdpResult(null);
  };

  const handleResetMdp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetMdpModalUser) return;
    if (!nouveauMdp || nouveauMdp.length < 6) {
      alert("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }
    setResetMdpLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_reinitialiser_mot_de_passe", {
        p_target_user_id: resetMdpModalUser.id,
        p_nouveau_mot_de_passe: nouveauMdp,
        p_motif: motifResetMdp.trim(),
      });

      if (error) {
        // Notification d'information si la fonction SQL n'est pas encore créée
        throw new Error(error.message || "Erreur réinitialisation mot de passe.");
      }

      setResetMdpResult({
        telephone: resetMdpModalUser.telephone,
        mdp: nouveauMdp,
      });

      setToastMessage({
        text: `Mot de passe réinitialisé avec succès pour ${resetMdpModalUser.nom} ${resetMdpModalUser.prenoms} !`,
        error: false,
      });

      await chargerDemandesResetMdp();
    } catch (err: any) {
      setToastMessage({ text: "Erreur réinitialisation : " + (err.message || err), error: true });
    } finally {
      setResetMdpLoading(false);
    }
  };

  // Charger les demandes de réinitialisation de mot de passe en attente
  const chargerDemandesResetMdp = async () => {
    try {
      const { data, error } = await supabase
        .from("demandes_reinitialisation_mdp")
        .select("*")
        .eq("statut", "EN_ATTENTE")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setDemandesMdpList(data);
      }
    } catch (e) {
      // Ignorer si la table n'est pas encore créée
    }
  };

  // Conseils Santé Handlers
  const handlePublierConseil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nouveauConseilTitre.trim() || !nouveauConseilContenu.trim()) {
      alert("Veuillez renseigner le titre et le contenu du conseil santé.");
      return;
    }
    setPublierConseilLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_creer_conseil_sante", {
        p_titre: nouveauConseilTitre.trim(),
        p_contenu: nouveauConseilContenu.trim(),
        p_categorie: nouveauConseilCategorie,
        p_auteur: nouveauConseilAuteur.trim() || "Coordination ASCQ",
      });
      if (error) {
        const { error: insertErr } = await supabase.from("conseils_sante").insert({
          titre: nouveauConseilTitre.trim(),
          contenu: nouveauConseilContenu.trim(),
          categorie: nouveauConseilCategorie,
          auteur: nouveauConseilAuteur.trim() || "Coordination ASCQ",
          est_publie: true,
        });
        if (insertErr) throw insertErr;
      }
      setToastMessage({ text: "Conseil santé publié avec succès ! Visible sur la page d'accueil.", error: false });
      setNouveauConseilTitre("");
      setNouveauConseilContenu("");
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      setToastMessage({ text: "Erreur publication : " + (err.message || err), error: true });
    } finally {
      setPublierConseilLoading(false);
    }
  };

  const handleSupprimerConseil = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer définitivement ce conseil santé ?")) return;
    try {
      const { error } = await supabase.rpc("admin_supprimer_conseil_sante", { p_id: id });
      if (error) {
        const { error: delErr } = await supabase.from("conseils_sante").delete().eq("id", id);
        if (delErr) throw delErr;
      }
      setToastMessage({ text: "Conseil santé supprimé avec succès.", error: false });
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      alert("Erreur suppression : " + err.message);
    }
  };

  const handleToggleConseil = async (id: string, statutActuel: boolean) => {
    try {
      const { error } = await supabase.rpc("admin_toggle_conseil_sante", {
        p_id: id,
        p_est_publie: !statutActuel,
      });
      if (error) {
        const { error: updErr } = await supabase.from("conseils_sante").update({ est_publie: !statutActuel }).eq("id", id);
        if (updErr) throw updErr;
      }
      setToastMessage({ text: !statutActuel ? "Conseil rendu public !" : "Conseil masqué du public.", error: false });
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      alert("Erreur mise à jour : " + err.message);
    }
  };

  // Bibliothèque Documentaire Handlers
  const handleAjouterDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nouveauDocTitre.trim() || !nouveauDocLien.trim()) {
      alert("Veuillez renseigner le titre et le lien du document.");
      return;
    }
    setAjouterDocLoading(true);
    try {
      const { error } = await supabase.rpc("admin_creer_document_bibliotheque", {
        p_titre: nouveauDocTitre.trim(),
        p_categorie: nouveauDocCategorie,
        p_description: nouveauDocDescription.trim() || null,
        p_lien_drive: nouveauDocLien.trim(),
        p_format_fichier: nouveauDocFormat,
        p_auteur: nouveauDocAuteur.trim() || "MINISTERE DE LA SANTE",
      });
      if (error) {
        const { error: insertErr } = await supabase.from("bibliotheque_documents").insert({
          titre: nouveauDocTitre.trim(),
          categorie: nouveauDocCategorie,
          description: nouveauDocDescription.trim() || null,
          lien_drive: nouveauDocLien.trim(),
          format_fichier: nouveauDocFormat,
          auteur: nouveauDocAuteur.trim() || "MINISTERE DE LA SANTE",
          est_actif: true,
        });
        if (insertErr) throw insertErr;
      }
      setToastMessage({ text: "Document déposé avec succès dans la Bibliothèque Officielle !", error: false });
      setNouveauDocTitre("");
      setNouveauDocDescription("");
      setNouveauDocLien("");
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      setToastMessage({ text: "Erreur ajout document : " + (err.message || err), error: true });
    } finally {
      setAjouterDocLoading(false);
    }
  };

  const handleSupprimerDoc = async (id: string) => {
    if (!confirm("Voulez-vous supprimer ce document de la bibliothèque ?")) return;
    try {
      const { error } = await supabase.rpc("admin_supprimer_document_bibliotheque", { p_id: id });
      if (error) {
        const { error: delErr } = await supabase.from("bibliotheque_documents").delete().eq("id", id);
        if (delErr) throw delErr;
      }
      setToastMessage({ text: "Document retiré de la bibliothèque.", error: false });
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      alert("Erreur suppression : " + err.message);
    }
  };

  const handleToggleDoc = async (id: string, statutActuel: boolean) => {
    try {
      const { error } = await supabase.rpc("admin_toggle_document_bibliotheque", {
        p_id: id,
        p_est_actif: !statutActuel,
      });
      if (error) {
        const { error: updErr } = await supabase.from("bibliotheque_documents").update({ est_actif: !statutActuel }).eq("id", id);
        if (updErr) throw updErr;
      }
      setToastMessage({ text: !statutActuel ? "Document activé !" : "Document désactivé.", error: false });
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      alert("Erreur mise à jour : " + err.message);
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
              href="/briefing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-extrabold shadow-sm transition-all active:scale-95"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guide SIMR & Vaccins</span>
            </Link>
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
              { id: "perimetre_activites", label: "Périmètre & Supervision ASCQ", icon: Activity, badge: demandesMdpList.length > 0 ? demandesMdpList.length : null },
              { id: "permutations_requetes", label: "Permutations & Requêtes", icon: ArrowLeftRight },
              { id: "diffusion_alertes", label: "Diffusion Alertes", icon: BellRing },
              { id: "ecoute_conseils", label: "Conseils & Citoyens", icon: HeartHandshake },
              { id: "bibliotheque", label: "Bibliothèque", icon: BookOpen },
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
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-red-600 text-white font-black ml-0.5">
                      {item.badge}
                    </span>
                  )}
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
                    {["EN_ATTENTE", "VALIDE", "SUSPENDU", "RADIE", "REJETE", "TOUS"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setFiltreStatutCompte(st)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          filtreStatutCompte === st
                            ? "bg-[#005c30] text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {st === "EN_ATTENTE" ? "En attente" : st === "VALIDE" ? "Validés" : st === "SUSPENDU" ? "Suspendus" : st === "RADIE" ? "Radiés" : st === "REJETE" ? "Rejetés" : "Tous"}
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
                        <div className="flex items-start gap-3 flex-1">
                          {/* Photo de profil de l'agent */}
                          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center font-bold text-xs text-slate-700 shadow-sm mt-0.5">
                            {c.photo_url ? (
                              <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="uppercase text-emerald-800">{c.prenoms?.[0] || ""}{c.nom?.[0] || ""}</span>
                            )}
                          </div>

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
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
                          {/* 1. BOUTON SUPER ADMIN : NOMINATION & RESPONSABILITÉ */}
                          {currentUser?.role_technique === "SUPER_ADMIN" && (
                            <button
                              type="button"
                              onClick={() => ouvrirModalNomination(c)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-300 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                              title="Nommer ou assigner le rôle hiérarchique et le territoire de cet agent"
                            >
                              <Crown className="w-3.5 h-3.5 text-amber-600" />
                              <span>Nommer / Rôle</span>
                            </button>
                          )}

                          {/* 2. BOUTON REPRÉSENTANT DÉPT / SUPER ADMIN : MODIFIER FICHE PROFIL */}
                          {peutModifierProfil(c) && (
                            <button
                              type="button"
                              onClick={() => ouvrirModalProfil(c)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
                              title="Modifier la fiche profil (avec justification obligatoire)"
                            >
                              <Edit3 className="w-3 h-3 text-slate-600" />
                              <span>Profil</span>
                            </button>
                          )}

                          {/* 2b. BOUTON RÉINITIALISER MOT DE PASSE */}
                          {(currentUser?.role_technique === "SUPER_ADMIN" || currentUser?.role_technique === "ADMINISTRATEUR" || currentUser?.role_technique === "REPRESENTANT_DEPARTEMENTAL") && (
                            <button
                              type="button"
                              onClick={() => ouvrirModalResetMdp(c)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
                              title="Réinitialiser le mot de passe de cet agent"
                            >
                              <KeyRound className="w-3 h-3 text-amber-600" />
                              <span>MDP</span>
                            </button>
                          )}

                          {/* 3. VALIDATION SELON LA MATRICE HIÉRARCHIQUE */}
                          {c.statut_compte === "EN_ATTENTE" && (
                            <>
                              {peutValiderCompte(c) ? (
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
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-bold border border-slate-200 italic" title="Ce rôle est en consultation sur ce territoire">
                                  Consultation
                                </span>
                              )}
                            </>
                          )}

                          {c.statut_compte === "VALIDE" && peutValiderCompte(c) && (
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
        {/* ========================================================= */}
        {/* ONGLET 3 : PÉRIMÈTRE, SUPERVISION ASCQ & ORDRES DE MISSION */}
        {/* ========================================================= */}
        {tab === "perimetre_activites" && (
          <div className="space-y-6">
            {/* EN-TÊTE ET SOUS-ONGLETS DE L'ESPACE PÉRIMÈTRE */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-[#005c30] rounded-xl">
                    <Activity className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                      Supervision du Périmètre & Gestion des ASCQ
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Accès 360° aux ASCQ, modifications justifiées, nominations aux postes territoriaux et gestion des accès.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {currentUser?.role_technique === "SUPER_ADMIN" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold">
                      <Crown className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pouvoir National de Nomination</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Sous-navigation de l'espace périmètre */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPerimetreSousOnglet("supervision")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    perimetreSousOnglet === "supervision"
                      ? "bg-[#005c30] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>1. Recherche & Dossier 360° ASCQ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPerimetreSousOnglet("demandes_mdp");
                    chargerDemandesResetMdp();
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    perimetreSousOnglet === "demandes_mdp"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>2. Mots de Passe Oubliés</span>
                  {demandesMdpList.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-black">
                      {demandesMdpList.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPerimetreSousOnglet("missions")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    perimetreSousOnglet === "missions"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>3. Ordres de Mission & Activités ({activitesDemandees.length})</span>
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* SOUS-ONGLET 1 : SUPERVISION 360° & ACCÈS COMPLET ASCQ */}
            {/* ========================================================= */}
            {perimetreSousOnglet === "supervision" && (
              <div className="space-y-5">
                {/* 1. MOTEUR DE RECHERCHE DYNAMIQUE UNIVERSEL */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Rechercher un ASCQ par nom, prénom, téléphone, département, commune, arrondissement..."
                        value={searchPerimetreAscq}
                        onChange={(e) => setSearchPerimetreAscq(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                      />
                    </div>
                  </div>

                  {/* Résumé des effectifs supervisés */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/60">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Total ASCQ</p>
                      <p className="text-base font-black text-slate-900">
                        {comptes.filter((c) => ["ASCQ", "REPRESENTANT_COMMUNAL", "REPRESENTANT_DEPARTEMENTAL"].includes(c.poste)).length}
                      </p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200/60">
                      <p className="text-[10px] text-emerald-800 font-bold uppercase">Registre National</p>
                      <p className="text-base font-black text-[#005c30]">
                        {comptes.filter((c) => c.present_liste_nationale).length}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-xl border border-blue-200/60">
                      <p className="text-[10px] text-blue-800 font-bold uppercase">Représentants Communaux</p>
                      <p className="text-base font-black text-blue-900">
                        {comptes.filter((c) => c.poste === "REPRESENTANT_COMMUNAL" || c.role_technique === "REPRESENTANT_COMMUNAL").length}
                      </p>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-xl border border-purple-200/60">
                      <p className="text-[10px] text-purple-800 font-bold uppercase">Représentants Départementaux</p>
                      <p className="text-base font-black text-purple-900">
                        {comptes.filter((c) => c.poste === "REPRESENTANT_DEPARTEMENTAL" || c.role_technique === "REPRESENTANT_DEPARTEMENTAL").length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. RÉSULTATS DE LA RECHERCHE & SÉLECTEUR D'AGENT */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    <span>Sélectionner un ASCQ pour ouvrir son dossier complet 360°</span>
                    <span className="text-slate-400 font-medium normal-case text-[11px]">
                      Cliquez sur un agent pour afficher ses données
                    </span>
                  </h3>

                  {(() => {
                    const ascqList = comptes
                      .filter((c) => ["ASCQ", "REPRESENTANT_COMMUNAL", "REPRESENTANT_DEPARTEMENTAL", "PF_CCLS_TP"].includes(c.poste) || c.role_technique === "ASCQ")
                      .filter((c) => {
                        if (!searchPerimetreAscq.trim()) return true;
                        const query = searchPerimetreAscq.toLowerCase();
                        const full = `${c.nom} ${c.prenoms} ${c.telephone} ${c.commune_nom || ""} ${c.departement_nom || ""} ${c.arrondissement_nom || ""}`.toLowerCase();
                        return full.includes(query);
                      });

                    if (ascqList.length === 0) {
                      return (
                        <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          Aucun ASCQ trouvé correspondant à « {searchPerimetreAscq} ».
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                        {ascqList.map((ascq) => {
                          const isSelected = selectedPerimetreAscq?.id === ascq.id;
                          return (
                            <button
                              key={ascq.id}
                              type="button"
                              onClick={() => chargerDossierCompletAscq(ascq)}
                              className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 active:scale-[0.99] ${
                                isSelected
                                  ? "bg-emerald-50/80 border-[#005c30] ring-2 ring-[#005c30]/20 shadow-sm"
                                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center font-black text-xs text-[#005c30]">
                                {ascq.photo_url ? (
                                  <img src={ascq.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span>{ascq.prenoms?.[0] || ""}{ascq.nom?.[0] || ""}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-extrabold text-xs text-slate-900 truncate">
                                    {ascq.nom} {ascq.prenoms}
                                  </p>
                                  {ascq.poste === "REPRESENTANT_COMMUNAL" && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-blue-800">
                                      Rep. Com
                                    </span>
                                  )}
                                  {ascq.poste === "REPRESENTANT_DEPARTEMENTAL" && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 text-purple-800">
                                      Rep. Dép
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 font-mono">
                                  {ascq.telephone}
                                </p>
                                <p className="text-[10px] text-slate-600 truncate mt-0.5">
                                  {ascq.commune_nom || "Commune N/A"} • {ascq.arrondissement_nom || "Arrond."}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* 3. DOSSIER 360° DE L'ASCQ SÉLECTIONNÉ (« ACCÈS À TOUT ») */}
                {selectedPerimetreAscq ? (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden space-y-5 animate-in fade-in">
                    {/* BANDEAU EN-TÊTE DU DOSSIER */}
                    <div className="bg-gradient-to-r from-[#005c30] to-emerald-800 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white p-1 overflow-hidden shrink-0 shadow-lg border-2 border-emerald-300">
                          {selectedPerimetreAscq.photo_url ? (
                            <img src={selectedPerimetreAscq.photo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <div className="w-full h-full bg-emerald-50 flex items-center justify-center font-black text-lg text-[#005c30] rounded-xl">
                              {selectedPerimetreAscq.prenoms?.[0] || ""}{selectedPerimetreAscq.nom?.[0] || ""}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                              {selectedPerimetreAscq.nom} {selectedPerimetreAscq.prenoms}
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-400 text-emerald-950">
                              {selectedPerimetreAscq.statut_compte}
                            </span>
                          </div>
                          <p className="text-xs text-emerald-100 font-medium">
                            Identifiant : <span className="font-mono font-bold text-white">{selectedPerimetreAscq.telephone}</span> • Affectation : {selectedPerimetreAscq.commune_nom || "Commune"} ({selectedPerimetreAscq.arrondissement_nom || "Arrondissement"})
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-white/20 text-white">
                              Poste : {selectedPerimetreAscq.poste}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-white/20 text-white">
                              Rôle : {selectedPerimetreAscq.role_technique}
                            </span>
                            {selectedPerimetreAscq.present_liste_nationale && (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-amber-400 text-amber-950 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Inscrit Registre National</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3 BOUTONS D'ACTION MAJEURS DE L'ADMINISTRATEUR */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* Action 1 : Nommer à un poste territorial */}
                        {currentUser?.role_technique === "SUPER_ADMIN" && (
                          <button
                            type="button"
                            onClick={() => ouvrirModalNomination(selectedPerimetreAscq)}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                            title="Nommer cet ASCQ à un poste pour ouvrir ses accès de suivi"
                          >
                            <Crown className="w-4 h-4 text-white" />
                            <span>Nommer au poste</span>
                          </button>
                        )}

                        {/* Action 2 : Modifier la fiche avec justification */}
                        <button
                          type="button"
                          onClick={() => ouvrirModalProfil(selectedPerimetreAscq)}
                          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                          title="Modifier les informations de l'ASCQ avec justification obligatoire"
                        >
                          <Edit3 className="w-4 h-4 text-emerald-700" />
                          <span>Modifier (Justifié)</span>
                        </button>

                        {/* Action 3 : Réinitialiser mot de passe */}
                        <button
                          type="button"
                          onClick={() => ouvrirModalResetMdp(selectedPerimetreAscq)}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                          title="Réinitialiser le mot de passe en cas d'oubli"
                        >
                          <KeyRound className="w-4 h-4 text-amber-400" />
                          <span>Réinitialiser MDP</span>
                        </button>
                      </div>
                    </div>

                    {/* CORPS DU DOSSIER : DONNÉES CROISÉES ET RELAIS */}
                    <div className="p-5 sm:p-6 space-y-6">
                      {loadingDossier ? (
                        <div className="p-8 text-center text-xs text-slate-500 font-bold flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                          <span>Chargement complet du dossier (Relais, RMA, PNSC, Audits)...</span>
                        </div>
                      ) : (
                        <>
                          {/* 1. GRILLE RÉCAPITULATIVE DU PROFIL */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Territoire d'Affectation
                              </span>
                              <p className="text-xs font-black text-slate-900">
                                {selectedPerimetreAscq.departement_nom || "National"} &rarr; {selectedPerimetreAscq.commune_nom || "Commune"}
                              </p>
                              <p className="text-[11px] text-slate-600">
                                Arrondissement : <strong>{selectedPerimetreAscq.arrondissement_nom || "N/A"}</strong>
                              </p>
                            </div>

                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Financement & Qualification
                              </span>
                              <p className="text-xs font-black text-slate-900">
                                Source : <span className="text-emerald-700">{selectedPerimetreAscq.source_financement || selectedPerimetreAscq.ascq_profils?.source_financement || "LLF"}</span>
                              </p>
                              <p className="text-[11px] text-slate-600">
                                Diplôme : {selectedPerimetreAscq.diplome || selectedPerimetreAscq.ascq_profils?.diplome || "Diplôme d'état en santé"}
                              </p>
                            </div>

                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Droits de Suivi Accordés
                              </span>
                              <p className="text-xs font-black text-slate-900">
                                {selectedPerimetreAscq.poste === "REPRESENTANT_COMMUNAL"
                                  ? "Accès complet à TOUTE sa Commune"
                                  : selectedPerimetreAscq.poste === "REPRESENTANT_DEPARTEMENTAL"
                                  ? "Accès complet à TOUT son Département"
                                  : "Accès standard Arrondissement"}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Relais supervisés : <strong>{dossierAscq.relais.length}</strong>
                              </p>
                            </div>
                          </div>

                          {/* 2. LISTE DES RELAIS COMMUNAUTAIRES (RC) RATTACHÉS */}
                          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-600" />
                                <span>Relais Communautaires (RC) sous la tutelle de cet ASCQ ({dossierAscq.relais.length})</span>
                              </h4>
                              <span className="text-[11px] text-slate-500">
                                Total ménages suivis : <strong>{dossierAscq.relais.reduce((acc, r) => acc + (Number(r.menages_charge) || 0), 0)}</strong>
                              </span>
                            </div>

                            {dossierAscq.relais.length === 0 ? (
                              <p className="py-4 text-center text-xs text-slate-400 italic bg-white rounded-xl border border-slate-200/60">
                                Aucun relais communautaire n'a encore été créé par cet ASCQ.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {dossierAscq.relais.map((rc) => (
                                  <div key={rc.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1 shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="font-extrabold text-slate-900">{rc.nom} {rc.prenoms}</span>
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${rc.statut_compte === "VALIDE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                        {rc.statut_compte || "VALIDE"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-mono">{rc.telephone || "Sans téléphone"}</p>
                                    <p className="text-[10px] text-slate-600">
                                      Village : <strong>{rc.village || "Non spécifié"}</strong> • Ménages : <strong>{rc.menages_charge || 0}</strong>
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 3. ACTIVITÉ & SUIVIS (RMA & PNSC) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Suivis Hebdo PNSC */}
                            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2">
                              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                  <span>Suivis Hebdo PNSC Déposés</span>
                                </span>
                                <span className="text-emerald-700 font-black">{dossierAscq.hebdo.length}</span>
                              </h4>
                              {dossierAscq.hebdo.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic">Aucun suivi hebdomadaire PNSC enregistré.</p>
                              ) : (
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                  {dossierAscq.hebdo.map((h) => (
                                    <div key={h.id} className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] flex items-center justify-between">
                                      <div>
                                        <span className="font-bold text-slate-800">Semaine {h.semaine} ({h.annee})</span>
                                        <p className="text-[10px] text-slate-500">
                                          Gap RH : {h.rh_gap} • Gap Moto : {h.motos_gap} • Arriérés : {Number(h.remuneration_due_llf || 0) + Number(h.remuneration_due_fadec || 0) + Number(h.remuneration_due_srhr || 0)} mois
                                        </p>
                                      </div>
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800">
                                        {h.statut}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Rapports Mensuels RMA */}
                            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2">
                              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <FileText className="w-4 h-4 text-emerald-600" />
                                  <span>Rapports Mensuels RMA</span>
                                </span>
                                <span className="text-emerald-700 font-black">{dossierAscq.rma.length}</span>
                              </h4>
                              {dossierAscq.rma.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic">Aucun RMA mensuel déposé.</p>
                              ) : (
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                  {dossierAscq.rma.map((r) => (
                                    <div key={r.id} className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] flex items-center justify-between">
                                      <div>
                                        <span className="font-bold text-slate-800">{r.numero_rapport || `RMA-${r.annee}-${r.mois}`}</span>
                                        <p className="text-[10px] text-slate-500">
                                          Mois : {r.mois}/{r.annee}
                                        </p>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${r.statut === "VALIDE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                        {r.statut}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 4. HISTORIQUE DES JUSTIFICATIONS ET AUDITS DE MODIFICATIONS */}
                          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-2">
                            <h4 className="font-extrabold text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                              <History className="w-4 h-4 text-amber-700" />
                              <span>Journal des Justifications Administratives & Audits ({dossierAscq.audits.length})</span>
                            </h4>
                            {dossierAscq.audits.length === 0 ? (
                              <p className="text-[11px] text-amber-700 italic">Aucune modification antérieure enregistrée dans le journal d'audit.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {dossierAscq.audits.map((a) => (
                                  <div key={a.id} className="p-2 bg-white rounded-lg border border-amber-200 text-[11px] space-y-0.5 shadow-sm">
                                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                                      <span>Action : <strong className="text-slate-800">{a.type_action}</strong></span>
                                      <span>{new Date(a.created_at).toLocaleString("fr-FR")}</span>
                                    </div>
                                    <p className="font-semibold text-slate-800">
                                      Justification : <span className="text-amber-900 font-bold">{a.motif_justification}</span>
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Aucun ASCQ sélectionné</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Veuillez utiliser la recherche ci-dessus pour sélectionner un ASCQ et afficher l'intégralité de son dossier de supervision.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* SOUS-ONGLET 2 : GESTION DES MOTS DE PASSE OUBLIÉS */}
            {/* ========================================================= */}
            {perimetreSousOnglet === "demandes_mdp" && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Demandes de Réinitialisation de Mot de Passe en Attente
                      </h3>
                      <p className="text-xs text-slate-500">
                        Agents n'arrivant pas à se connecter et ayant soumis une demande depuis l'écran de connexion.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={chargerDemandesResetMdp}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Actualiser</span>
                  </button>
                </div>

                {demandesMdpList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Aucune demande en attente</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tous les agents accèdent normalement à leur compte.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {demandesMdpList.map((d) => {
                      const userFound = comptes.find(
                        (c) => c.telephone?.replace(/\D/g, "") === d.telephone?.replace(/\D/g, "")
                      );
                      return (
                        <div key={d.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-sm">
                                {d.nom_declare || (userFound ? `${userFound.nom} ${userFound.prenoms}` : "Agent")}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                {userFound?.poste || "ASCQ"}
                              </span>
                            </div>
                            <p className="text-slate-600 font-mono font-bold">
                              Téléphone : {d.telephone} {userFound?.commune_nom && `• Commune : ${userFound.commune_nom}`}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Demande reçue le {new Date(d.created_at).toLocaleString("fr-FR")}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {userFound ? (
                              <button
                                type="button"
                                onClick={() => ouvrirModalResetMdp(userFound)}
                                className="px-4 py-2 bg-[#005c30] hover:bg-[#004724] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                              >
                                <Key className="w-3.5 h-3.5" />
                                <span>Réinitialiser en 1 clic</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-amber-700 italic">
                                Numéro non relié directement à un compte existant
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* SOUS-ONGLET 3 : ORDRES DE MISSION & ACTIVITÉS DEMANDÉES */}
            {/* ========================================================= */}
            {perimetreSousOnglet === "missions" && (
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

            {/* B. GESTION ET PUBLICATION DES CONSEILS SANTÉ PUBLICS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Conseils Santé Publics
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Visibles en direct sur la page d'accueil par tous les citoyens ({conseilsSante.length})
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulaire de publication */}
              <form onSubmit={handlePublierConseil} className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900 uppercase">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Publier un nouveau conseil santé</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Titre du conseil *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex : Prévention du paludisme : utilisation systématique de la moustiquaire"
                    value={nouveauConseilTitre}
                    onChange={(e) => setNouveauConseilTitre(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Catégorie</label>
                    <select
                      value={nouveauConseilCategorie}
                      onChange={(e) => setNouveauConseilCategorie(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="Santé communautaire">Santé communautaire</option>
                      <option value="Nutrition">Nutrition & Alimentation</option>
                      <option value="Hygiène & Eau">Hygiène & Eau potable</option>
                      <option value="Santé Maternelle & Infantile">Santé Maternelle & Infantile</option>
                      <option value="Paludisme & Épidémies">Paludisme & Épidémies</option>
                      <option value="Vaccination">Vaccination</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Auteur / Source</label>
                    <input
                      type="text"
                      value={nouveauConseilAuteur}
                      onChange={(e) => setNouveauConseilAuteur(e.target.value)}
                      placeholder="Ex : Coordination Nationale ASCQ"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Contenu / Message clé *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Détaillez le conseil de santé publique pour la communauté..."
                    value={nouveauConseilContenu}
                    onChange={(e) => setNouveauConseilContenu(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  ></textarea>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={publierConseilLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{publierConseilLoading ? "Publication..." : "Publier le conseil"}</span>
                  </button>
                </div>
              </form>

              {/* Liste des conseils publiés ou masqués */}
              <div className="space-y-2 max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
                {conseilsSante.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400 italic">Aucun conseil de santé publié pour le moment.</p>
                ) : (
                  conseilsSante.map((cs) => (
                    <div key={cs.id} className="pt-2.5 pb-2 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900">{cs.titre}</span>
                            <span className="px-2 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {cs.categorie || "Santé"}
                            </span>
                            <span className={`px-2 py-0.2 rounded text-[9px] font-black uppercase ${
                              cs.est_publie ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                            }`}>
                              {cs.est_publie ? "En ligne" : "Masqué"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Par : {cs.auteur || "Coordination ASCQ"} {cs.created_at ? `• ${new Date(cs.created_at).toLocaleDateString("fr-FR")}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleConseil(cs.id, cs.est_publie)}
                            className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
                            title={cs.est_publie ? "Masquer ce conseil" : "Rendre public ce conseil"}
                          >
                            {cs.est_publie ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSupprimerConseil(cs.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs font-semibold"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-lg">{cs.contenu}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET BIBLIOTHÈQUE DOCUMENTAIRE OFFICIELLE */}
        {/* ========================================================= */}
        {tab === "bibliotheque" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Bibliothèque Documentaire & Directives Officielles
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Déposez et gérez les guides cliniques, protocoles PCIME-C, textes réglementaires et manuels pour les ASCQ.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/espace-ascq/bibliotheque"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-sm transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Voir vue utilisateur</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulaire de dépôt */}
              <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Déposer un document officiel
                  </h3>
                </div>

                <form onSubmit={handleAjouterDoc} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Titre du document *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex : Guide National de Traitement du Paludisme"
                      value={nouveauDocTitre}
                      onChange={(e) => setNouveauDocTitre(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Catégorie officielle *</label>
                    <select
                      value={nouveauDocCategorie}
                      onChange={(e) => setNouveauDocCategorie(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      <option value="GUIDE_CLINIQUE">Guide clinique (PCIME-C, Soins...)</option>
                      <option value="SURVEILLANCE">Surveillance épidémiologique</option>
                      <option value="OUTIL_GESTION">Outil de gestion & Rapports</option>
                      <option value="REGLEMENTATION">Textes réglementaires & Politiques</option>
                      <option value="FORMATION">Modules de formation</option>
                      <option value="AUTRE">Autre document officiel</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Format</label>
                      <select
                        value={nouveauDocFormat}
                        onChange={(e) => setNouveauDocFormat(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      >
                        <option value="PDF">PDF</option>
                        <option value="DOCX">DOCX</option>
                        <option value="XLSX">Excel / XLSX</option>
                        <option value="LIEN">Lien Web</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Auteur / Source</label>
                      <input
                        type="text"
                        value={nouveauDocAuteur}
                        onChange={(e) => setNouveauDocAuteur(e.target.value)}
                        placeholder="Ex : MINISTERE DE LA SANTE"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Lien Google Drive / Téléchargement *</label>
                    <input
                      type="url"
                      required
                      placeholder="https://drive.google.com/..."
                      value={nouveauDocLien}
                      onChange={(e) => setNouveauDocLien(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Description / Objectif (optionnel)</label>
                    <textarea
                      rows={3}
                      placeholder="Décrivez brièvement le contenu ou les instructions d'application..."
                      value={nouveauDocDescription}
                      onChange={(e) => setNouveauDocDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={ajouterDocLoading}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{ajouterDocLoading ? "Enregistrement..." : "Ajouter à la bibliothèque"}</span>
                  </button>
                </form>
              </div>

              {/* Liste des documents existants */}
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Documents en ligne ({documentsBiblio.length})
                  </h3>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Rechercher par titre..."
                      value={searchBiblio}
                      onChange={(e) => setSearchBiblio(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                {/* Filtre catégorie */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
                  {["TOUS", "GUIDE_CLINIQUE", "SURVEILLANCE", "OUTIL_GESTION", "REGLEMENTATION", "FORMATION"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFiltreCatBiblio(cat)}
                      className={`px-2.5 py-1 rounded-lg shrink-0 transition-all ${
                        filtreCatBiblio === cat
                          ? "bg-[#005c30] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {cat === "TOUS" ? "Tous" : cat.replace("_", " ")}
                    </button>
                  ))}
                </div>

                {/* Liste des documents */}
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
                  {documentsBiblio
                    .filter((d) => (filtreCatBiblio === "TOUS" ? true : d.categorie === filtreCatBiblio))
                    .filter((d) => `${d.titre} ${d.description || ""}`.toLowerCase().includes(searchBiblio.toLowerCase()))
                    .length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400 italic">Aucun document correspondant.</p>
                  ) : (
                    documentsBiblio
                      .filter((d) => (filtreCatBiblio === "TOUS" ? true : d.categorie === filtreCatBiblio))
                      .filter((d) => `${d.titre} ${d.description || ""}`.toLowerCase().includes(searchBiblio.toLowerCase()))
                      .map((d) => (
                        <div key={d.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-slate-50 transition-colors">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-xs text-slate-900">{d.titre}</span>
                              <span className="px-2 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {d.categorie}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-blue-50 text-blue-700">
                                {d.format_fichier || "PDF"}
                              </span>
                              <span className={`px-2 py-0.2 rounded text-[9px] font-bold ${
                                d.est_actif ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                              }`}>
                                {d.est_actif ? "Actif" : "Inactif"}
                              </span>
                            </div>
                            {d.description && (
                              <p className="text-[11px] text-slate-600 line-clamp-2">{d.description}</p>
                            )}
                            <p className="text-[10px] text-slate-400">
                              Émis par : <span className="font-semibold">{d.auteur || "MINISTERE DE LA SANTE"}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                            <a
                              href={d.lien_drive}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Ouvrir</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleToggleDoc(d.id, d.est_actif)}
                              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              title={d.est_actif ? "Désactiver" : "Activer"}
                            >
                              {d.est_actif ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSupprimerDoc(d.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
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

        {/* ========================================================= */}
        {/* MODALE 1 : NOMINATION & RESPONSABILITÉ (SUPER ADMIN) */}
        {/* ========================================================= */}
        {/* MODAL RADIATION OFFICIELLE DE COMPTE */}
        {modalRadiationUser && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b pb-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Radier un compte (Fin de fonction)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalRadiationUser.nom} {modalRadiationUser.prenoms} ({modalRadiationUser.poste})
                  </p>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-900">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Conséquence de la radiation</span>
                </p>
                <p>
                  L'accès de cet agent sera immédiatement bloqué. Son statut sera marqué <strong>RADIÉ</strong> et le motif sera archivé dans le registre de traçabilité.
                </p>
              </div>

              <form onSubmit={handleRadierCompteAdmin} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Motif officiel de la fin de fonction *
                  </label>
                  <select
                    value={motifRadiationAdmin}
                    onChange={(e) => setMotifRadiationAdmin(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-rose-500"
                    required
                  >
                    <option value="FIN_CONTRAT">Fin de contrat / Mission achevée</option>
                    <option value="DEMISSION">Démission volontaire de l'agent</option>
                    <option value="MUTATION_HORS_COMMUNAUTAIRE">Mutation / Réaffectation hors santé communautaire</option>
                    <option value="ABANDON_POSTE">Abandon de poste / Inactivité prolongée</option>
                    <option value="REVOCATION_DISCIPLINAIRE">Révocation / Décision disciplinaire</option>
                    <option value="DECES">Décès de l'agent</option>
                    <option value="AUTRE">Autre motif justifié</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Précisions & Références (Optionnel)
                  </label>
                  <textarea
                    value={explicationRadiationAdmin}
                    onChange={(e) => setExplicationRadiationAdmin(e.target.value)}
                    placeholder="Numéro de note de service, date de passation, observations..."
                    rows={3}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setModalRadiationUser(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRadiationAdmin}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submittingRadiationAdmin ? "Radiation en cours..." : "Confirmer la radiation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL SUPPRESSION DÉFINITIVE DE COMPTE */}
        {modalSuppressionUser && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b pb-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Suppression Définitive de Compte
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalSuppressionUser.nom} {modalSuppressionUser.prenoms} ({modalSuppressionUser.telephone})
                  </p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-800 space-y-1">
                <p className="font-black flex items-center gap-1.5 text-red-900">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>Action Irréversible</span>
                </p>
                <p>
                  Ce compte sera <strong>définitivement supprimé</strong> de la base de données. Utilisez cette action uniquement pour éliminer les comptes de test ou les doublons créés par erreur.
                </p>
              </div>

              <form onSubmit={handleSupprimerCompteAdmin} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Pour confirmer, tapez le mot <strong className="text-red-700">SUPPRIMER</strong> ci-dessous :
                  </label>
                  <input
                    type="text"
                    value={confirmTexteSuppressionAdmin}
                    onChange={(e) => setConfirmTexteSuppressionAdmin(e.target.value)}
                    placeholder="SUPPRIMER"
                    className="w-full p-2.5 rounded-xl border border-red-300 font-black tracking-widest text-center focus:ring-2 focus:ring-red-500 uppercase"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setModalSuppressionUser(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSuppressionAdmin || confirmTexteSuppressionAdmin !== "SUPPRIMER"}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40"
                  >
                    {submittingSuppressionAdmin ? "Suppression..." : "Supprimer définitivement"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {nominationModalUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                    <Crown className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900">
                      Nomination & Attribution de Responsabilité
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Acte institutionnel réservé exclusivement au Super Administrateur National
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNominationModalUser(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
                >
                  ✕
                </button>
              </div>

              {/* Fiche agent sélectionné */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 uppercase">
                    {nominationModalUser.nom} {nominationModalUser.prenoms}
                  </span>
                  <span className="font-bold text-slate-600">{nominationModalUser.telephone}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Poste actuel : <strong>{nominationModalUser.poste}</strong> • Rôle technique : <strong>{nominationModalUser.role_technique}</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  Territoire actuel : {nominationModalUser.departement_nom || "National"} &rarr; {nominationModalUser.commune_nom || "Non assigné"}
                </p>
              </div>

              <form onSubmit={handleAssignerResponsabilite} className="space-y-3.5">
                {/* 1. Poste Institutionnel */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Poste / Titre Institutionnel *
                  </label>
                  <select
                    value={nominationPoste}
                    onChange={(e) => {
                      const np = e.target.value;
                      setNominationPoste(np);
                      if (["DDS", "CCD_CDLS_TP", "CSSPR", "CSPSMEMH"].includes(np)) {
                        setNominationRoleTechnique("CADRE_DEPARTEMENTAL");
                      } else if (np === "REPRESENTANT_DEPARTEMENTAL") {
                        setNominationRoleTechnique("REPRESENTANT_DEPARTEMENTAL");
                      } else if (["MCZS", "RCSE", "C_RAMS"].includes(np)) {
                        setNominationRoleTechnique("CADRE_ZONE_SANITAIRE");
                      } else if (np === "MCC") {
                        setNominationRoleTechnique("CADRE_COMMUNAL");
                      } else if (np === "REPRESENTANT_COMMUNAL") {
                        setNominationRoleTechnique("REPRESENTANT_COMMUNAL");
                      } else if (np === "PF_CCLS_TP") {
                        setNominationRoleTechnique("ADMIN_COMMUNAL");
                      } else if (np === "SUPER_ADMIN") {
                        setNominationRoleTechnique("SUPER_ADMIN");
                      } else {
                        setNominationRoleTechnique("ASCQ");
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <optgroup label="Niveau National">
                      <option value="SUPER_ADMIN">SUPER ADMIN</option>
                      <option value="ASCQ">ASCQ</option>
                    </optgroup>
                    <optgroup label="Niveau Départemental">
                      <option value="REPRESENTANT_DEPARTEMENTAL">REP. DEPARTEMENTAL</option>
                      <option value="DDS">DDS</option>
                      <option value="CCD_CDLS_TP">CCD CDLS-TP</option>
                      <option value="CSSPR">CSSPR</option>
                      <option value="CSPSMEMH">CSPSMEMH</option>
                    </optgroup>
                    <optgroup label="Niveau Zone Sanitaire">
                      <option value="MCZS">MCZS</option>
                      <option value="RCSE">RCSE</option>
                      <option value="C_RAMS">C-RAMS</option>
                    </optgroup>
                    <optgroup label="Niveau Communal">
                      <option value="MCC">MCC</option>
                      <option value="REPRESENTANT_COMMUNAL">REP. COMMUNAL</option>
                      <option value="PF_CCLS_TP">PF CCLS-TP</option>
                    </optgroup>
                  </select>
                </div>

                {/* 2. Rôle Technique Système */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Privilèges Système (Rôle Technique) *
                  </label>
                  <select
                    value={nominationRoleTechnique}
                    onChange={(e) => setNominationRoleTechnique(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Pleins pouvoirs nationaux & nominations)</option>
                    <option value="ADMINISTRATEUR">ADMINISTRATEUR (Supervision nationale générale)</option>
                    <option value="REPRESENTANT_DEPARTEMENTAL">REPRESENTANT_DEPARTEMENTAL (Valide ASCQ/PF dépt, modifie profil communal, alertes)</option>
                    <option value="CADRE_DEPARTEMENTAL">CADRE_DEPARTEMENTAL (DDS/CCD : Rapports dépt, alertes)</option>
                    <option value="CADRE_ZONE_SANITAIRE">CADRE_ZONE_SANITAIRE (MCZS/RCSE : Rapports zone, alertes)</option>
                    <option value="REPRESENTANT_COMMUNAL">REPRESENTANT_COMMUNAL (Valide ASCQ commune, alertes, rapports commune)</option>
                    <option value="ADMIN_COMMUNAL">ADMIN_COMMUNAL (PF CCLS-TP : Valide ASCQ commune, alertes)</option>
                    <option value="CADRE_COMMUNAL">CADRE_COMMUNAL (MCC : Rapports commune, alerte au représentant)</option>
                    <option value="ASCQ">ASCQ</option>
                  </select>
                </div>

                {/* 3. Territoire d'assignation */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <span className="text-[11px] font-extrabold text-slate-700 block">
                    Territoire d'Affectation
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Département</label>
                      <select
                        value={nominationDepId}
                        onChange={(e) => {
                          setNominationDepId(e.target.value);
                          setNominationZsId("");
                          setNominationComId("");
                        }}
                        className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                      >
                        <option value="">-- National --</option>
                        {listeDepartements.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.nom}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Zone Sanitaire</label>
                      <select
                        value={nominationZsId}
                        onChange={(e) => setNominationZsId(e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                      >
                        <option value="">-- Toutes zones --</option>
                        {listeZonesSanitaires
                          .filter((z) => !nominationDepId || z.departement_id === nominationDepId)
                          .map((z) => (
                            <option key={z.id} value={z.id}>
                              {z.nom}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Commune</label>
                      <select
                        value={nominationComId}
                        onChange={(e) => setNominationComId(e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                      >
                        <option value="">-- Toutes communes --</option>
                        {listeCommunes
                          .filter((c) => !nominationDepId || c.departement_id === nominationDepId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nom}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. Motif & Référence de la nomination (OBLIGATOIRE) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Référence de l'Acte de Nomination / Motif Administratif *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex : Décision ministérielle n°..., Note de service de nomination..."
                    value={nominationMotif}
                    onChange={(e) => setNominationMotif(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Cette référence sera notifiée à l'agent et inscrite de manière indélébile dans le journal d'audit national.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setNominationModalUser(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={nominationLoading}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    <span>{nominationLoading ? "Enregistrement..." : "Confirmer la nomination"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODALE 2 : MODIFICATION FICHE ASCQ AVEC JUSTIFICATION OBLIGATOIRE */}
        {/* ========================================================= */}
        {profilModalUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-[#005c30] rounded-xl">
                    <Edit3 className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900">
                      Modifier la Fiche ASCQ
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Toute modification nécessite obligatoirement une justification administrative
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProfilModalUser(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                <span className="font-extrabold text-slate-900 uppercase block">
                  {profilModalUser.nom} {profilModalUser.prenoms}
                </span>
                <span className="text-slate-500 text-[11px]">
                  Poste : {profilModalUser.poste} • Territoire : {profilModalUser.departement_nom || "Dép"} &rarr; {profilModalUser.commune_nom || "Commune"}
                </span>
              </div>

              <form onSubmit={handleEnregistrerProfil} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nom de famille *</label>
                    <input
                      type="text"
                      required
                      value={profilNom}
                      onChange={(e) => setProfilNom(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Prénoms *</label>
                    <input
                      type="text"
                      required
                      value={profilPrenoms}
                      onChange={(e) => setProfilPrenoms(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Numéro de Téléphone *</label>
                    <input
                      type="text"
                      required
                      value={profilTelephone}
                      onChange={(e) => setProfilTelephone(e.target.value)}
                      placeholder="0197000000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Statut du Compte</label>
                    <select
                      value={profilStatutCompte}
                      onChange={(e) => setProfilStatutCompte(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      <option value="VALIDE">VALIDE (Compte actif)</option>
                      <option value="EN_ATTENTE">EN_ATTENTE (En cours d'approbation)</option>
                      <option value="SUSPENDU">SUSPENDU (Accès bloqué)</option>
                    </select>
                  </div>
                </div>

                {/* Territoire */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Commune d'Affectation</label>
                    <select
                      value={profilComId}
                      onChange={(e) => {
                        setProfilComId(e.target.value);
                        setProfilArrId("");
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      <option value="">-- Choisir la commune --</option>
                      {listeCommunes
                        .filter((c) => !profilModalUser.departement_id || c.departement_id === profilModalUser.departement_id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nom}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Arrondissement</label>
                    <select
                      value={profilArrId}
                      onChange={(e) => setProfilArrId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      <option value="">-- Choisir l'arrondissement --</option>
                      {listeArrondissements
                        .filter((a) => !profilComId || a.commune_id === profilComId)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nom}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Financement & Diplôme */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Source de Financement</label>
                    <select
                      value={profilSourceFinancement}
                      onChange={(e) => setProfilSourceFinancement(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      <option value="LLF">LLF</option>
                      <option value="FADEC">FADEC</option>
                      <option value="LLF_FADEC">LLF et FADEC Santé communautaire</option>
                      <option value="SRHR">SRHR</option>
                      <option value="GAVI">GAVI</option>
                      <option value="AUTRE">AUTRE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Diplôme / Qualification</label>
                    <input
                      type="text"
                      value={profilDiplome}
                      onChange={(e) => setProfilDiplome(e.target.value)}
                      placeholder="Ex : Infirmier d'État, Sage-Femme..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                {/* CHAMP STRICTEMENT OBLIGATOIRE : JUSTIFICATION ADMINISTRATIVE */}
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 space-y-1">
                  <label className="block text-[11px] font-black text-amber-950 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Motif & Justification Administrative de la Modification * (OBLIGATOIRE)</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Précisez obligatoirement le motif administratif ou légal (ex : Mutation sur arrêté ministériel n°..., correction suite à régularisation de puce, changement de commune d'affectation...)"
                    value={profilJustification}
                    onChange={(e) => setProfilJustification(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-600"
                  ></textarea>
                  <p className="text-[10px] text-amber-800 font-medium">
                    ⚠️ Cette justification est archivée dans le journal d'audit national avec votre nom, l'horodatage et les anciennes valeurs modifiées.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setProfilModalUser(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={profilLoading}
                    className="px-5 py-2 bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{profilLoading ? "Enregistrement & Audit..." : "Enregistrer et Justifier"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODALE 3 : RÉINITIALISATION DU MOT DE PASSE (OUBLI MDP) */}
        {/* ========================================================= */}
        {resetMdpModalUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                    <KeyRound className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900">
                      Réinitialiser le Mot de Passe
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Gestion des accès en cas d'oubli ou perte de mot de passe
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResetMdpModalUser(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
                >
                  ✕
                </button>
              </div>

              {resetMdpResult ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-3">
                  <div className="flex items-start gap-2 text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-sm">Mot de passe réinitialisé avec succès !</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Transmettez les identifiants ci-dessous à l'agent :
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-emerald-200 font-mono text-xs space-y-1.5 select-all">
                    <p>Identifiant (Téléphone) : <strong>{resetMdpResult.telephone}</strong></p>
                    <p>Nouveau Mot de Passe : <strong className="text-[#005c30] text-sm">{resetMdpResult.mdp}</strong></p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Bonjour ${resetMdpModalUser.prenoms}, vos identifiants pour l'application ASCQ Bénin ont été réinitialisés :\nIdentifiant : ${resetMdpResult.telephone}\nMot de passe : ${resetMdpResult.mdp}\nLien : https://ascq-benin.vercel.app/connexion`
                      );
                      alert("Identifiants copiés dans le presse-papier ! Vous pouvez les coller dans WhatsApp ou SMS.");
                    }}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copier le message prêt pour SMS / WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResetMdpModalUser(null)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetMdp} className="space-y-3.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="font-extrabold text-slate-900 uppercase block">
                      {resetMdpModalUser.nom} {resetMdpModalUser.prenoms}
                    </span>
                    <span className="text-slate-600 font-mono">
                      Téléphone de connexion : <strong>{resetMdpModalUser.telephone}</strong>
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Nouveau Mot de Passe *
                      </label>
                      <button
                        type="button"
                        onClick={() => setNouveauMdp("Benin2026!")}
                        className="text-[10px] font-extrabold text-[#005c30] hover:underline"
                      >
                        Utiliser "Benin2026!"
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={nouveauMdp}
                      onChange={(e) => setNouveauMdp(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Motif de la réinitialisation
                    </label>
                    <input
                      type="text"
                      value={motifResetMdp}
                      onChange={(e) => setMotifResetMdp(e.target.value)}
                      placeholder="Ex : Perte de mot de passe signalée par l'agent"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setResetMdpModalUser(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={resetMdpLoading}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>{resetMdpLoading ? "Réinitialisation..." : "Valider le nouveau mot de passe"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
