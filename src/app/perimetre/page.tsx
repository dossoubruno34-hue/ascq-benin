"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  BarChart3,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  X,
  Lock,
  Send,
  Printer,
  History,
  Activity,
  Skull,
  TrendingUp,
  Stethoscope,
  ChevronRight,
  Info,
  Sparkles,
  Target,
  Compass,
  MessageSquare,
  Baby,
  ClipboardList,
  HeartPulse,
  Trash2,
  UserX
} from "lucide-react";
import { getCachedUserSession, getCachedMonEspace } from "@/lib/offline-sync";
import { estCadreNonAscq, getTitreCadreOfficiel, getPerimetreScope, PerimetreScope } from "@/lib/cadre-roles";
import BeninPhoneAction from "@/components/BeninPhoneAction";
import {
  telechargerCsvBOM,
  telechargerExcelHtml,
  imprimerRapportPdf,
  journaliserExport,
  anonymiserPetitEffectif
} from "@/lib/gouvernanceExports";

export default function PerimetreGouvernancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 animate-spin text-[#005c30]" />
      </div>
    }>
      <PerimetreGouvernanceContent />
    </Suspense>
  );
}

function PerimetreGouvernanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  
  // Onglets principaux de gouvernance
  const [activeTab, setActiveTab] = useState<
    | "dashboard_compile"
    | "suivi_individuel"
    | "fiches_territoire"
    | "inscriptions_ascq"
    | "suggestions"
    | "alertes_missions"
    | "exports_journal"
    | "nettoyage_radiation"
  >("dashboard_compile");

  // Inscriptions ASCQ en attente (Validation par le Représentant Communal)
  const [inscriptionsEnAttente, setInscriptionsEnAttente] = useState<any[]>([]);
  const [loadingInscriptions, setLoadingInscriptions] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Modal d'édition/correction d'un RMA par le Représentant Communal
  const [editingRma, setEditingRma] = useState<any | null>(null);
  const [savingRma, setSavingRma] = useState(false);

  // -------------------------------------------------------------------
  // NETTOYAGE DES DONNÉES ERRONÉES & GESTION / RADIATION DES ASCQ
  // -------------------------------------------------------------------
  const [sousOngletNettoyage, setSousOngletNettoyage] = useState<"donnees" | "ascq">("donnees");
  const [searchNettoyageDonnees, setSearchNettoyageDonnees] = useState("");
  const [filtreTypeDonneeNettoyage, setFiltreTypeDonneeNettoyage] = useState("TOUT");

  // Modal Nettoyage de Donnée
  const [modalNettoyageDonnee, setModalNettoyageDonnee] = useState<{ record: any; table: string } | null>(null);
  const [motifNettoyage, setMotifNettoyage] = useState("DONNEE_TEST");
  const [explicationNettoyage, setExplicationNettoyage] = useState("");
  const [submittingNettoyage, setSubmittingNettoyage] = useState(false);

  // Gestion & Radiation des ASCQ dans le périmètre
  const [tousLesAscqsPerimetre, setTousLesAscqsPerimetre] = useState<any[]>([]);
  const [loadingTousLesAscqs, setLoadingTousLesAscqs] = useState(false);
  const [searchGestionAscq, setSearchGestionAscq] = useState("");
  const [filtreStatutGestionAscq, setFiltreStatutGestionAscq] = useState("TOUS");

  // Modal Radiation ASCQ
  const [modalRadiationAscq, setModalRadiationAscq] = useState<any | null>(null);
  const [motifRadiation, setMotifRadiation] = useState("FIN_CONTRAT");
  const [explicationRadiation, setExplicationRadiation] = useState("");
  const [submittingRadiation, setSubmittingRadiation] = useState(false);

  // Modal Suppression définitive ASCQ
  const [modalSuppressionAscq, setModalSuppressionAscq] = useState<any | null>(null);
  const [confirmSuppressionTexte, setConfirmSuppressionTexte] = useState("");
  const [submittingSuppression, setSubmittingSuppression] = useState(false);

  // Période d'analyse
  const now = new Date();
  const anneeActuelle = now.getFullYear();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semaineActuelle = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  const [annee, setAnnee] = useState<number>(anneeActuelle);
  const [mois, setMois] = useState<number>(now.getMonth() + 1);
  const [semaine, setSemaine] = useState<number>(semaineActuelle);

  // Filtres territoriaux
  const [listeTerritoiresInf, setListeTerritoiresInf] = useState<any[]>([]);
  const [filtreTerritoireId, setFiltreTerritoireId] = useState<string>("TOUS");

  // Indicateurs compilés
  const [stats, setStats] = useState<any>({
    total_alertes: 0,
    alertes_prioritaires: 0,
    alertes_non_investiguees: 0,
    delai_detection_heures: 0,
    delai_investigation_heures: 0,
    total_deces: 0,
    deces_maternels: 0,
    deces_neonatals: 0,
    total_ascq: 0,
    rma_deposes: 0,
    rma_retard: 0,
    rma_manquants: 0,
    taux_completude_rma: 0,
    hebdo_deposes: 0,
    total_vad: 0,
    total_causeries: 0,
    ventilation: []
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Liste des ASCQ du territoire
  const [ascqs, setAscqs] = useState<any[]>([]);
  const [searchAscq, setSearchAscq] = useState("");
  const [filtreStatutRapport, setFiltreStatutRapport] = useState<"TOUS" | "DEPOSE" | "EN_RETARD" | "MANQUANT">("TOUS");

  // Inspection individuelle 360° en CONSULTATION SEULE
  const [selectedAscq, setSelectedAscq] = useState<any | null>(null);
  const [dossierSubTab, setDossierSubTab] = useState<"ICCM" | "MATERNITE" | "REFERENCES" | "RAPPORTS" | "SIMR" | "RELAIS" | "PLANNING">("ICCM");
  const [dossierAscq, setDossierAscq] = useState<{
    plannings: any[];
    activites: any[];
    rma: any[];
    hebdo: any[];
    alertes: any[];
    deces: any[];
    relais: any[];
    rapportsRc: any[];
    planningsRc: any[];
    consultations: any[];
    references: any[];
    femmes: any[];
    enfants: any[];
  }>({
    plannings: [],
    activites: [],
    rma: [],
    hebdo: [],
    alertes: [],
    deces: [],
    relais: [],
    rapportsRc: [],
    planningsRc: [],
    consultations: [],
    references: [],
    femmes: [],
    enfants: []
  });
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Modal de consultation approfondie d'une fiche officielle (Lecture seule)
  const [ficheAffichee, setFicheAffichee] = useState<{
    type: "ICCM" | "MATERNITE" | "ENFANTS_1000J" | "REFERENCES" | "ALERTES" | "DECES" | "RMA" | "PNSC_HEBDO" | "RAPPORT_RC" | "PLANNING_RC";
    donnees: any;
    ascq?: any;
  } | null>(null);

  // Registre global des Fiches du Territoire
  const [registreFiches, setRegistreFiches] = useState<any[]>([]);
  const [loadingRegistre, setLoadingRegistre] = useState(false);
  const [filtreTypeFiche, setFiltreTypeFiche] = useState<string>("TOUT");
  const [rechercheRegistre, setRechercheRegistre] = useState<string>("");

  // Suggestions de modification & Observations des Cadres sur les fiches ASCQ
  const [suggestionsList, setSuggestionsList] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionAscqId, setSuggestionAscqId] = useState("");
  const [suggestionModule, setSuggestionModule] = useState("RMA");
  const [suggestionType, setSuggestionType] = useState("CORRECTION_DEMANDEE");
  const [suggestionTitre, setSuggestionTitre] = useState("");
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  // Alertes Territoriales & Ordres de Mission
  const [missionSubMode, setMissionSubMode] = useState<"ALERTE" | "MISSION">("MISSION");
  const [alerteTitre, setAlerteTitre] = useState("");
  const [alerteMessage, setAlerteMessage] = useState("");
  const [alertePriorite, setAlertePriorite] = useState<"NORMALE" | "HAUTE" | "URGENTE">("HAUTE");
  const [sendingAlerte, setSendingAlerte] = useState(false);

  const [missionsList, setMissionsList] = useState<any[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [missionCibleType, setMissionCibleType] = useState<"TOUS_ASCQ" | "ASCQ_SPECIFIQUE">("TOUS_ASCQ");
  const [missionAscqId, setMissionAscqId] = useState("");
  const [missionTitre, setMissionTitre] = useState("");
  const [missionType, setMissionType] = useState("INVESTIGATION");
  const [missionPriorite, setMissionPriorite] = useState<"NORMALE" | "HAUTE" | "URGENTE">("HAUTE");
  const [missionDateEcheance, setMissionDateEcheance] = useState("");
  const [missionDirectives, setMissionDirectives] = useState("");
  const [submittingMission, setSubmittingMission] = useState(false);

  const [toastMsg, setToastMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Historique des exports
  const [journalExports, setJournalExports] = useState<any[]>([]);
  const [loadingJournal, setLoadingJournal] = useState(false);

  // Synchronisation du paramètre d'URL ?tab=...
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      if (tabParam === "diffusion_alertes") setActiveTab("alertes_missions");
      else if (
        [
          "dashboard_compile",
          "suivi_individuel",
          "fiches_territoire",
          "inscriptions_ascq",
          "suggestions",
          "alertes_missions",
          "exports_journal",
          "nettoyage_radiation"
        ].includes(tabParam)
      ) {
        setActiveTab(tabParam as any);
      }
    }
  }, [searchParams]);

  // 1. INITIALISATION DU PROFIL ET VERIFICATION STRICTE DU NIVEAU
  const initialiserPerimetre = async () => {
    setLoading(true);
    try {
      let profil: any = null;
      const cached = getCachedUserSession();
      if (cached?.profile) profil = { ...cached.profile };
      const cachedEspace = getCachedMonEspace();
      if (!profil && cachedEspace) profil = { ...cachedEspace };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user && !profil) {
        router.push("/connexion");
        return;
      }

      if (user) {
        const { data: dbUser } = await supabase
          .from("utilisateurs")
          .select("id, telephone, nom, prenoms, poste, poste_autre, role_technique, statut_compte, departement_id, zone_sanitaire_id, commune_id, arrondissement_id, second_arrondissement_id, role_nomination")
          .eq("id", user.id)
          .maybeSingle();

        if (dbUser) profil = { ...(profil || {}), ...dbUser };
      }

      if (!profil) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      // Compléter les libellés géographiques
      if (profil.commune_id && !profil.commune_nom) {
        const { data: c } = await supabase.from("communes").select("nom").eq("id", profil.commune_id).maybeSingle();
        if (c) profil.commune_nom = c.nom;
      }
      if (profil.departement_id && !profil.departement_nom) {
        const { data: d } = await supabase.from("departements").select("nom").eq("id", profil.departement_id).maybeSingle();
        if (d) profil.departement_nom = d.nom;
      }
      if (profil.zone_sanitaire_id && !profil.zone_sanitaire_nom) {
        const { data: z } = await supabase.from("zones_sanitaires").select("nom").eq("id", profil.zone_sanitaire_id).maybeSingle();
        if (z) profil.zone_sanitaire_nom = z.nom;
      }

      const cleanTel = (profil.telephone || "").replace(/\D/g, "");
      const role = (profil.role_technique || "").toUpperCase();
      const poste = (profil.poste || "").toUpperCase();
      const nomination = (profil.role_nomination || "").toUpperCase();

      const ALL_CADRE_ROLES = [
        "SUPER_ADMIN", "ADMINISTRATEUR", "CADRE_NATIONAL",
        "REPRESENTANT_DEPARTEMENTAL", "ADMIN_DEPARTEMENTAL", "CADRE_DEPARTEMENTAL", "DDS", "CCD_CDLS_TP", "CSSPR", "CSPSMEMH",
        "CADRE_ZONE_SANITAIRE", "MCZS", "RCSE", "C_RAMS",
        "REPRESENTANT_COMMUNAL", "ADMIN_COMMUNAL", "CADRE_COMMUNAL", "PF_CCLS_TP", "MCC"
      ];

      const isBrunoSuperAdmin = cleanTel.includes("69031463") || role === "SUPER_ADMIN";

      const isAuthorized = 
        isBrunoSuperAdmin ||
        ALL_CADRE_ROLES.includes(role) || 
        ALL_CADRE_ROLES.includes(poste) || 
        ALL_CADRE_ROLES.includes(nomination) || 
        role.includes("REPRESENTANT") ||
        poste.includes("REPRESENTANT") ||
        role.includes("CADRE") ||
        poste.includes("CADRE") ||
        poste === "PF_CCLS_TP" ||
        poste === "MCC";

      if (!isAuthorized) {
        setCurrentUser(profil);
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      setUnauthorized(false);
      setCurrentUser(profil);

      // Charger les territoires inférieurs selon le niveau
      await chargerTerritoiresInferieurs(profil);

      // Charger les indicateurs
      await chargerIndicateursCompiles(profil);

      // Charger les ASCQ du périmètre
      await chargerListeAscq(profil);

      // Charger les inscriptions ASCQ en attente de validation
      await chargerInscriptionsEnAttente(profil);

    } catch (err) {
      console.error("Erreur initialisation gouvernance:", err);
    } finally {
      setLoading(false);
    }
  };

  // Chargement des territoires inférieurs (ex: Département -> Communes, Commune -> Arrondissements)
  const chargerTerritoiresInferieurs = async (profil: any) => {
    try {
      const scope = getPerimetreScope(profil);

      if (scope.level === "NATIONAL") {
        // Niveau National -> Territoires inférieurs : Départements
        const { data } = await supabase.from("departements").select("id, nom").order("nom");
        setListeTerritoiresInf(data || []);
      } else if (scope.level === "DEPARTEMENTAL" && profil.departement_id) {
        // Niveau Départemental -> Territoires inférieurs : Communes du département
        const { data } = await supabase.from("communes").select("id, nom").eq("departement_id", profil.departement_id).order("nom");
        setListeTerritoiresInf(data || []);
      } else if (scope.level === "ZONE_SANITAIRE" && profil.zone_sanitaire_id) {
        // Niveau Zone Sanitaire -> Territoires inférieurs : Communes de la zone
        const { data } = await supabase.from("communes").select("id, nom").eq("zone_sanitaire_id", profil.zone_sanitaire_id).order("nom");
        setListeTerritoiresInf(data || []);
      } else if (profil.commune_id) {
        // Niveau Communal -> Territoires inférieurs : Arrondissements
        const { data } = await supabase.from("arrondissements").select("id, nom").eq("commune_id", profil.commune_id).order("nom");
        setListeTerritoiresInf(data || []);
      }
    } catch (e) {
      console.warn("Erreur territoires inférieurs:", e);
    }
  };

  // 2. CHARGEMENT DES INDICATEURS COMPILÉS
  const chargerIndicateursCompiles = async (profil: any) => {
    setLoadingStats(true);
    try {
      const scope = getPerimetreScope(profil);

      // 1. Récupérer les alertes du territoire
      let queryAlertes = supabase.from("alertes_communautaires").select("id, est_prioritaire, type_alerte_nom, investigation_faite, delai_detection_notification_heures, delai_notification_investigation_heures, commune_id, arrondissement_id, departement_id, zone_sanitaire_id, semaine_epidemio, created_at").eq("annee", annee);
      if (scope.filterType === "commune_id" && scope.id) queryAlertes = queryAlertes.eq("commune_id", scope.id);
      else if (scope.filterType === "zone_sanitaire_id" && scope.id) queryAlertes = queryAlertes.eq("zone_sanitaire_id", scope.id);
      else if (scope.filterType === "departement_id" && scope.id) queryAlertes = queryAlertes.eq("departement_id", scope.id);

      const { data: alertesData } = await queryAlertes;
      const alertes = alertesData || [];

      // 2. Récupérer les décès du territoire
      let queryDeces = supabase.from("deces_communautaires").select("id, type_deces_nom, commune_id, arrondissement_id, departement_id, zone_sanitaire_id, created_at").eq("annee", annee);
      if (scope.filterType === "commune_id" && scope.id) queryDeces = queryDeces.eq("commune_id", scope.id);
      else if (scope.filterType === "zone_sanitaire_id" && scope.id) queryDeces = queryDeces.eq("zone_sanitaire_id", scope.id);
      else if (scope.filterType === "departement_id" && scope.id) queryDeces = queryDeces.eq("departement_id", scope.id);

      const { data: decesData } = await queryDeces;
      const deces = decesData || [];

      // 3. Récupérer les ASCQ pour complétude
      let queryAscq = supabase.from("utilisateurs").select("id, nom, prenoms, telephone, commune_id, arrondissement_id, departement_id, zone_sanitaire_id").eq("statut_compte", "VALIDE").or("poste.eq.ASCQ,role_technique.eq.ASCQ_OPERATEUR");
      if (scope.filterType === "commune_id" && scope.id) queryAscq = queryAscq.eq("commune_id", scope.id);
      else if (scope.filterType === "zone_sanitaire_id" && scope.id) queryAscq = queryAscq.eq("zone_sanitaire_id", scope.id);
      else if (scope.filterType === "departement_id" && scope.id) queryAscq = queryAscq.eq("departement_id", scope.id);

      const { data: ascqsList } = await queryAscq;
      const totalAscq = (ascqsList || []).length;
      const ascqIds = (ascqsList || []).map((a: any) => a.id);

      // 4. Récupérer les RMA
      let rmas: any[] = [];
      if (ascqIds.length > 0) {
        const { data: rmaData } = await supabase
          .from("rapports_mensuels_ascq")
          .select("id, ascq_id, mois, annee, date_depot, commune_id, arrondissement_id")
          .eq("annee", annee)
          .eq("mois", mois)
          .in("ascq_id", ascqIds);
        rmas = rmaData || [];
      }

      // Calcul RMA déposés à temps vs en retard vs manquants (délai : 5 du mois suivant)
      let rmaDeposes = 0;
      let rmaRetard = 0;
      rmas.forEach((r: any) => {
        const depot = r.date_depot ? new Date(r.date_depot) : null;
        if (depot && depot.getDate() <= 5) rmaDeposes++;
        else rmaRetard++;
      });
      const rmaManquants = Math.max(0, totalAscq - (rmaDeposes + rmaRetard));
      const tauxCompletude = totalAscq > 0 ? Math.round(((rmaDeposes + rmaRetard) / totalAscq) * 100) : 0;

      // Délais moyens en heures
      const delaisDetec = alertes.filter((a: any) => a.delai_detection_notification_heures).map((a: any) => Number(a.delai_detection_notification_heures));
      const delaiMoyenDetec = delaisDetec.length > 0 ? Math.round(delaisDetec.reduce((acc, v) => acc + v, 0) / delaisDetec.length) : 0;

      // Ventilation par territoire inférieur
      const ventilationMap = new Map<string, any>();
      listeTerritoiresInf.forEach(t => {
        ventilationMap.set(t.id, {
          id: t.id,
          nom: t.nom,
          alertes: 0,
          deces: 0,
          rma_deposes: 0,
          ascq_count: 0
        });
      });

      const ventilationKey = scope.level === "COMMUNAL" ? "arrondissement_id" : (scope.level === "NATIONAL" ? "departement_id" : "commune_id");

      (ascqsList || []).forEach((u: any) => {
        const key = u[ventilationKey];
        if (ventilationMap.has(key)) {
          ventilationMap.get(key).ascq_count++;
        }
      });

      alertes.forEach((a: any) => {
        const key = a[ventilationKey];
        if (ventilationMap.has(key)) {
          ventilationMap.get(key).alertes++;
        }
      });

      deces.forEach((d: any) => {
        const key = d[ventilationKey];
        if (ventilationMap.has(key)) {
          ventilationMap.get(key).deces++;
        }
      });

      setStats({
        total_alertes: alertes.length,
        alertes_prioritaires: alertes.filter((a: any) => a.est_prioritaire).length,
        alertes_non_investiguees: alertes.filter((a: any) => !a.investigation_faite).length,
        delai_detection_heures: delaiMoyenDetec,
        total_deces: deces.length,
        deces_maternels: deces.filter((d: any) => d.type_deces_nom?.includes("MATERNEL")).length,
        deces_neonatals: deces.filter((d: any) => d.type_deces_nom?.includes("NEONATAL")).length,
        total_ascq: totalAscq,
        rma_deposes: rmaDeposes,
        rma_retard: rmaRetard,
        rma_manquants: rmaManquants,
        taux_completude_rma: tauxCompletude,
        ventilation: Array.from(ventilationMap.values())
      });

    } catch (e) {
      console.warn("Erreur calcul indicateurs:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  // 3. CHARGEMENT DE LA LISTE DES ASCQ ET STATUT DU MOIS
  const chargerListeAscq = async (profil: any) => {
    try {
      const scope = getPerimetreScope(profil);
      let query = supabase
        .from("utilisateurs")
        .select("id, nom, prenoms, telephone, poste, role_technique, statut_compte, commune_id, arrondissement_id, second_arrondissement_id, departement_id, zone_sanitaire_id")
        .eq("statut_compte", "VALIDE")
        .or("poste.eq.ASCQ,role_technique.eq.ASCQ_OPERATEUR");

      if (scope.filterType === "commune_id" && scope.id) query = query.eq("commune_id", scope.id);
      else if (scope.filterType === "zone_sanitaire_id" && scope.id) query = query.eq("zone_sanitaire_id", scope.id);
      else if (scope.filterType === "departement_id" && scope.id) query = query.eq("departement_id", scope.id);

      const { data: users } = await query.order("nom");

      if (users && users.length > 0) {
        const ascqIds = users.map((u: any) => u.id);
        const { data: rmas } = await supabase
          .from("rapports_mensuels_ascq")
          .select("ascq_id, date_depot, created_at")
          .eq("annee", annee)
          .eq("mois", mois)
          .in("ascq_id", ascqIds);

        const rmaMap = new Map((rmas || []).map((r: any) => [r.ascq_id, r]));

        const arrIds = Array.from(new Set(users.map((u: any) => u.arrondissement_id).filter(Boolean)));
        let arrMap = new Map();
        if (arrIds.length > 0) {
          const { data: arrData } = await supabase.from("arrondissements").select("id, nom").in("id", arrIds);
          arrMap = new Map((arrData || []).map((a: any) => [a.id, a.nom]));
        }

        const enriched = users.map((u: any) => {
          const rma = rmaMap.get(u.id) as any;
          let statutRapport = "MANQUANT";
          if (rma) {
            const dDepot = rma.date_depot ? new Date(rma.date_depot) : new Date(rma.created_at);
            statutRapport = dDepot.getDate() <= 5 ? "DEPOSE" : "EN_RETARD";
          }

          return {
            ...u,
            arrondissement_nom: arrMap.get(u.arrondissement_id) || "Arrondissement",
            statut_rapport_mois: statutRapport,
          };
        });

        setAscqs(enriched);
      } else {
        setAscqs([]);
      }
    } catch (e) {
      console.warn("Erreur liste ASCQ:", e);
    }
  };

  // 3b. CHARGEMENT DE TOUS LES ASCQ DU PÉRIMÈTRE (ACTIFS, RADIÉS, EN ATTENTE)
  const chargerTousLesAscqsPerimetre = async (profil: any) => {
    if (!profil) return;
    setLoadingTousLesAscqs(true);
    try {
      const scope = getPerimetreScope(profil);
      let q = supabase
        .from("utilisateurs")
        .select("id, nom, prenoms, telephone, poste, role_technique, role_nomination, statut_compte, motif_radiation, date_radiation, commune_id, arrondissement_id, departement_id, created_at")
        .or("poste.eq.ASCQ,role_technique.eq.ASCQ_OPERATEUR,poste.eq.REPRESENTANT_COMMUNAL,poste.eq.REPRESENTANT_DEPARTEMENTAL");

      if (scope.filterType === "commune_id" && scope.id) q = q.eq("commune_id", scope.id);
      else if (scope.filterType === "zone_sanitaire_id" && scope.id) q = q.eq("zone_sanitaire_id", scope.id);
      else if (scope.filterType === "departement_id" && scope.id) q = q.eq("departement_id", scope.id);

      const { data, error } = await q.order("nom");
      if (!error && data) {
        const arrIds = Array.from(new Set(data.map((u: any) => u.arrondissement_id).filter(Boolean)));
        let arrMap = new Map();
        if (arrIds.length > 0) {
          const { data: arrData } = await supabase.from("arrondissements").select("id, nom").in("id", arrIds);
          arrMap = new Map((arrData || []).map((a: any) => [a.id, a.nom]));
        }
        const enriched = data.map((u: any) => ({
          ...u,
          arrondissement_nom: arrMap.get(u.arrondissement_id) || "Arrondissement"
        }));
        setTousLesAscqsPerimetre(enriched);
      }
    } catch (e) {
      console.warn("Erreur chargement tous ASCQ périmètre:", e);
    } finally {
      setLoadingTousLesAscqs(false);
    }
  };

  // HANDLERS NETTOYAGE DES DONNEES ERRONÉES
  const ouvrirModalNettoyage = (record: any) => {
    let tableName = "consultations_communautaires";
    if (record.type === "ICCM") tableName = "consultations_communautaires";
    else if (record.type === "MATERNITE") tableName = "suivi_femmes_enceintes";
    else if (record.type === "ENFANTS_1000J") tableName = "suivi_enfants_1000_jours";
    else if (record.type === "REFERENCES") tableName = "references_communautaires";
    else if (record.type === "ALERTES") tableName = "alertes_communautaires";
    else if (record.type === "DECES") tableName = "deces_communautaires";
    else if (record.type === "RMA") tableName = "rapports_mensuels_ascq";

    setModalNettoyageDonnee({ record, table: tableName });
    setMotifNettoyage("DONNEE_TEST");
    setExplicationNettoyage("");
  };

  const handleConfirmerNettoyageDonnee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalNettoyageDonnee) return;
    setSubmittingNettoyage(true);
    try {
      const { record, table } = modalNettoyageDonnee;
      const { error } = await supabase.rpc("nettoyer_donnee_erronee", {
        p_table: table,
        p_id: record.id,
        p_motif: motifNettoyage,
        p_explication: explicationNettoyage || null
      });

      if (error) {
        await supabase.from(table).delete().eq("id", record.id);
      }

      setRegistreFiches(prev => prev.filter(f => f.id !== record.id));
      setModalNettoyageDonnee(null);
      setExplicationNettoyage("");
      if (ficheAffichee && ((ficheAffichee as any).id === record.id || (ficheAffichee as any).donnees?.id === record.id)) {
        setFicheAffichee(null);
      }
      alert("Donnée erronée nettoyée et archivée dans l'audit avec succès.");
    } catch (err: any) {
      alert("Erreur lors du nettoyage : " + err.message);
    } finally {
      setSubmittingNettoyage(false);
    }
  };

  // HANDLERS RADIATION ET SUPPRESSION COMPTES ASCQ
  const handleConfirmerRadiationAscq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalRadiationAscq) return;
    setSubmittingRadiation(true);
    try {
      const motifFinal = `${motifRadiation}${explicationRadiation ? " - " + explicationRadiation : ""}`;
      const { error } = await supabase.rpc("radier_compte_ascq", {
        p_user_id: modalRadiationAscq.id,
        p_motif: motifRadiation,
        p_explication: explicationRadiation || null
      });

      if (error) {
        await supabase.from("utilisateurs").update({
          statut_compte: "RADIE",
          motif_radiation: motifFinal,
          date_radiation: new Date().toISOString()
        }).eq("id", modalRadiationAscq.id);
      }

      alert(`Compte de ${modalRadiationAscq.prenoms} ${modalRadiationAscq.nom} radié avec succès.`);
      setModalRadiationAscq(null);
      setExplicationRadiation("");
      if (currentUser) {
        await chargerTousLesAscqsPerimetre(currentUser);
        await chargerListeAscq(currentUser);
      }
    } catch (err: any) {
      alert("Erreur lors de la radiation : " + err.message);
    } finally {
      setSubmittingRadiation(false);
    }
  };

  const handleRetablirAscq = async (ascq: any) => {
    if (!confirm(`Rétablir le compte de ${ascq.prenoms} ${ascq.nom} au statut VALIDE ?`)) return;
    try {
      const { error } = await supabase.rpc("retablir_compte_ascq", {
        p_user_id: ascq.id
      });

      if (error) {
        await supabase.from("utilisateurs").update({
          statut_compte: "VALIDE",
          motif_radiation: null,
          date_radiation: null
        }).eq("id", ascq.id);
      }

      alert("Compte rétabli en fonction.");
      if (currentUser) {
        await chargerTousLesAscqsPerimetre(currentUser);
        await chargerListeAscq(currentUser);
      }
    } catch (err: any) {
      alert("Erreur rétablissement : " + err.message);
    }
  };

  const handleConfirmerSuppressionAscq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSuppressionAscq) return;
    if (confirmSuppressionTexte !== "SUPPRIMER") {
      alert("Veuillez saisir exactement le mot 'SUPPRIMER'.");
      return;
    }
    setSubmittingSuppression(true);
    try {
      const { error } = await supabase.rpc("supprimer_compte_ascq", {
        p_user_id: modalSuppressionAscq.id,
        p_motif: "Suppression définitive par le représentant territorial"
      });

      if (error) {
        await supabase.from("ascq_profils").delete().eq("id", modalSuppressionAscq.id);
        await supabase.from("relais_communautaires").delete().or(`ascq_id.eq.${modalSuppressionAscq.id},user_id.eq.${modalSuppressionAscq.id}`);
        await supabase.from("utilisateurs").delete().eq("id", modalSuppressionAscq.id);
      }

      alert("Compte supprimé définitivement.");
      setModalSuppressionAscq(null);
      setConfirmSuppressionTexte("");
      if (currentUser) {
        await chargerTousLesAscqsPerimetre(currentUser);
        await chargerListeAscq(currentUser);
      }
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + err.message);
    } finally {
      setSubmittingSuppression(false);
    }
  };

  // 4. CHARGEMENT DES INSCRIPTIONS ASCQ EN ATTENTE (Pour le Représentant Communal)
  const chargerInscriptionsEnAttente = async (profil: any) => {
    if (!profil) return;
    setLoadingInscriptions(true);
    try {
      const scope = getPerimetreScope(profil);
      let query = supabase
        .from("utilisateurs")
        .select("id, nom, prenoms, telephone, poste, role_technique, statut_compte, commune_id, arrondissement_id, second_arrondissement_id, created_at")
        .eq("statut_compte", "EN_ATTENTE")
        .or("poste.eq.ASCQ,role_technique.eq.ASCQ_OPERATEUR");

      if (scope.filterType === "commune_id" && scope.id) {
        query = query.eq("commune_id", scope.id);
      } else if (scope.filterType === "zone_sanitaire_id" && scope.id) {
        query = query.eq("zone_sanitaire_id", scope.id);
      } else if (scope.filterType === "departement_id" && scope.id) {
        query = query.eq("departement_id", scope.id);
      }

      const { data } = await query.order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const arrIds = data.map((u: any) => u.arrondissement_id).filter(Boolean);
        let arrMap = new Map();
        if (arrIds.length > 0) {
          const { data: arrData } = await supabase.from("arrondissements").select("id, nom").in("id", arrIds);
          arrMap = new Map((arrData || []).map((a: any) => [a.id, a.nom]));
        }
        setInscriptionsEnAttente(data.map((u: any) => ({
          ...u,
          arrondissement_nom: arrMap.get(u.arrondissement_id) || "Arrondissement"
        })));
      } else {
        setInscriptionsEnAttente([]);
      }
    } catch (e) {
      console.warn("Erreur chargement inscriptions:", e);
    } finally {
      setLoadingInscriptions(false);
    }
  };

  // Action : Valider l'inscription d'un ASCQ par le Représentant Communal
  const handleValiderAscq = async (ascqId: string, nomComplet: string) => {
    setActionInProgress(ascqId);
    try {
      const { data, error } = await supabase.rpc("valider_inscription_ascq_communal", {
        p_ascq_id: ascqId,
        p_nouveau_statut: "VALIDE"
      });

      if (error) {
        // Fallback update direct
        const { error: upErr } = await supabase.from("utilisateurs").update({
          statut_compte: "VALIDE",
          date_validation: new Date().toISOString(),
          valide_par: currentUser.id
        }).eq("id", ascqId);

        if (upErr) throw upErr;
      }

      setToastMsg({ text: `🎉 Compte ASCQ de ${nomComplet} validé avec succès !`, error: false });
      setTimeout(() => setToastMsg(null), 3500);

      // Rafraîchir
      await chargerInscriptionsEnAttente(currentUser);
      await chargerListeAscq(currentUser);
      await chargerIndicateursCompiles(currentUser);
    } catch (err: any) {
      setToastMsg({ text: "Erreur validation: " + err.message, error: true });
    } finally {
      setActionInProgress(null);
    }
  };

  // Action : Rejeter l'inscription d'un ASCQ
  const handleRejeterAscq = async (ascqId: string, nomComplet: string) => {
    if (!confirm(`Confirmez-vous le rejet de l'inscription de l'ASCQ ${nomComplet} ?`)) return;
    setActionInProgress(ascqId);
    try {
      const { data, error } = await supabase.rpc("valider_inscription_ascq_communal", {
        p_ascq_id: ascqId,
        p_nouveau_statut: "REJETE"
      });

      if (error) {
        const { error: upErr } = await supabase.from("utilisateurs").update({
          statut_compte: "REJETE"
        }).eq("id", ascqId);
        if (upErr) throw upErr;
      }

      setToastMsg({ text: `Inscription de ${nomComplet} rejetée.`, error: false });
      setTimeout(() => setToastMsg(null), 3500);
      await chargerInscriptionsEnAttente(currentUser);
    } catch (err: any) {
      setToastMsg({ text: "Erreur rejet: " + err.message, error: true });
    } finally {
      setActionInProgress(null);
    }
  };

  // Action : Valider un RMA par le Représentant Communal
  const handleValiderRma = async (rmaId: string) => {
    setActionInProgress(rmaId);
    try {
      const { error } = await supabase.from("rapports_mensuels_ascq").update({
        statut: "VALIDE",
        date_validation: new Date().toISOString(),
        valide_par: currentUser.id,
        observations_validation: `Validé le ${new Date().toLocaleDateString("fr-FR")} par ${currentUser.nom || "Superviseur"} (${currentUser.poste || "Représentant Communal"})`
      }).eq("id", rmaId);

      if (error) throw error;

      setToastMsg({ text: "✅ Rapport Mensuel (RMA) validé avec succès !", error: false });
      setTimeout(() => setToastMsg(null), 3500);
      if (selectedAscq) await inspecterAscq360(selectedAscq);
    } catch (err: any) {
      setToastMsg({ text: "Erreur validation RMA: " + err.message, error: true });
    } finally {
      setActionInProgress(null);
    }
  };

  // Action : Valider un rapport hebdomadaire PNSC par le Représentant Communal
  const handleValiderHebdoPnsc = async (hebdoId: string) => {
    setActionInProgress(hebdoId);
    try {
      const { error } = await supabase.from("rapports_hebdo_pnsc").update({
        statut: "VALIDE",
        date_validation: new Date().toISOString(),
        observations: `Validé par ${currentUser.nom || "Superviseur"} (${currentUser.poste || "Représentant Communal"})`
      }).eq("id", hebdoId);

      if (error) throw error;

      setToastMsg({ text: "✅ Rapport hebdomadaire PNSC validé avec succès !", error: false });
      setTimeout(() => setToastMsg(null), 3500);
      if (selectedAscq) await inspecterAscq360(selectedAscq);
    } catch (err: any) {
      setToastMsg({ text: "Erreur validation rapport hebdomadaire: " + err.message, error: true });
    } finally {
      setActionInProgress(null);
    }
  };

  // Action : Enregistrer les corrections d'un RMA par le Représentant Communal
  const handleSaveRmaModifications = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRma) return;
    setSavingRma(true);
    try {
      const { error } = await supabase.from("rapports_mensuels_ascq").update({
        total_visites_domiciliaires: Number(editingRma.total_visites_domiciliaires) || 0,
        total_seances_sensibilisation: Number(editingRma.total_seances_sensibilisation) || 0,
        femmes_enceintes_suivies: Number(editingRma.femmes_enceintes_suivies) || 0,
        enfants_0_59_mois_suivis: Number(editingRma.enfants_0_59_mois_suivis) || 0,
        statut: "VALIDE",
        date_validation: new Date().toISOString(),
        valide_par: currentUser.id,
        observations_validation: editingRma.observations_validation || `Validé et corrigé par le Représentant Communal ${currentUser.nom || ""}`
      }).eq("id", editingRma.id);

      if (error) throw error;

      setToastMsg({ text: "✅ RMA corrigé et validé avec succès !", error: false });
      setTimeout(() => setToastMsg(null), 3500);
      setEditingRma(null);
      if (selectedAscq) await inspecterAscq360(selectedAscq);
    } catch (err: any) {
      setToastMsg({ text: "Erreur enregistrement RMA: " + err.message, error: true });
    } finally {
      setSavingRma(false);
    }
  };

  // Inspection individuelle 360° en CONSULTATION SEULE
  const inspecterAscq360 = async (ascq: any) => {
    setSelectedAscq(ascq);
    setLoadingDossier(true);
    setDossierSubTab("ICCM");
    try {
      const [
        planningsRes,
        activitesRes,
        rmaRes,
        hebdoRes,
        alertesRes,
        decesRes,
        relaisRes,
        rcRapportsRes,
        rcPlanningsRes,
        consultationsRes,
        referencesRes,
        femmesRes,
        enfantsRes
      ] = await Promise.all([
        supabase.from("plannings_ascq").select("*, lignes_planning_ascq(*)").eq("ascq_id", ascq.id).order("annee", { ascending: false }).order("mois", { ascending: false }).limit(6),
        supabase.from("activites_menees").select("*").eq("ascq_id", ascq.id).order("date_activite", { ascending: false }).limit(20),
        supabase.from("rapports_mensuels_ascq").select("*").eq("ascq_id", ascq.id).order("annee", { ascending: false }).order("mois", { ascending: false }).limit(12),
        supabase.from("rapports_hebdo_pnsc").select("*").eq("ascq_id", ascq.id).order("annee", { ascending: false }).order("semaine", { ascending: false }).limit(12),
        supabase.from("alertes_communautaires").select("*").eq("notificateur_id", ascq.id).order("date_notification", { ascending: false }).limit(20),
        supabase.from("deces_communautaires").select("*").eq("notificateur_id", ascq.id).order("date_notification", { ascending: false }).limit(20),
        supabase.from("relais_communautaires").select("*").eq("ascq_id", ascq.id),
        supabase.from("rapports_hebdo_activites_relais").select("*").eq("ascq_id", ascq.id).order("date_rapport", { ascending: false }).limit(20),
        supabase.from("plannings_hebdo_relais").select("*").eq("ascq_id", ascq.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("consultations_communautaires").select("*").eq("ascq_id", ascq.id).order("date_consultation", { ascending: false }).limit(50),
        supabase.from("references_communautaires").select("*").eq("ascq_id", ascq.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("suivi_femmes_enceintes").select("*").eq("ascq_id", ascq.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("suivi_enfants_1000_jours").select("*").eq("ascq_id", ascq.id).order("created_at", { ascending: false }).limit(30)
      ]);

      setDossierAscq({
        plannings: planningsRes.data || [],
        activites: activitesRes.data || [],
        rma: rmaRes.data || [],
        hebdo: hebdoRes.data || [],
        alertes: alertesRes.data || [],
        deces: decesRes.data || [],
        relais: relaisRes.data || [],
        rapportsRc: rcRapportsRes.data || [],
        planningsRc: rcPlanningsRes.data || [],
        consultations: consultationsRes.data || [],
        references: referencesRes.data || [],
        femmes: femmesRes.data || [],
        enfants: enfantsRes.data || []
      });
    } catch (e) {
      console.warn("Erreur inspection 360°:", e);
    } finally {
      setLoadingDossier(false);
    }
  };

  // Chargement du registre global des fiches du territoire
  const chargerRegistreFichesTerritoire = async () => {
    if (!currentUser) return;
    setLoadingRegistre(true);
    try {
      const scope = getPerimetreScope(currentUser);
      let ascqQuery = supabase
        .from("utilisateurs")
        .select("id, nom, prenoms, telephone, commune_id, arrondissement_id")
        .eq("statut_compte", "VALIDE")
        .or("poste.eq.ASCQ,role_technique.eq.ASCQ_OPERATEUR");

      if (scope.filterType === "commune_id" && scope.id) ascqQuery = ascqQuery.eq("commune_id", scope.id);
      else if (scope.filterType === "zone_sanitaire_id" && scope.id) ascqQuery = ascqQuery.eq("zone_sanitaire_id", scope.id);
      else if (scope.filterType === "departement_id" && scope.id) ascqQuery = ascqQuery.eq("departement_id", scope.id);

      const { data: usersData } = await ascqQuery;
      const ascqsTerritoire = usersData || [];
      const ascqMap = new Map(ascqsTerritoire.map(u => [u.id, u]));
      const ids = ascqsTerritoire.map(u => u.id);

      if (ids.length === 0) {
        setRegistreFiches([]);
        setLoadingRegistre(false);
        return;
      }

      const [
        consultationsRes,
        femmesRes,
        enfantsRes,
        referencesRes,
        alertesRes,
        decesRes,
        rmaRes
      ] = await Promise.all([
        supabase.from("consultations_communautaires").select("*").in("ascq_id", ids).order("date_consultation", { ascending: false }).limit(40),
        supabase.from("suivi_femmes_enceintes").select("*").in("ascq_id", ids).order("created_at", { ascending: false }).limit(30),
        supabase.from("suivi_enfants_1000_jours").select("*").in("ascq_id", ids).order("created_at", { ascending: false }).limit(30),
        supabase.from("references_communautaires").select("*").in("ascq_id", ids).order("created_at", { ascending: false }).limit(30),
        supabase.from("alertes_communautaires").select("*").in("notificateur_id", ids).order("date_notification", { ascending: false }).limit(30),
        supabase.from("deces_communautaires").select("*").in("notificateur_id", ids).order("date_notification", { ascending: false }).limit(30),
        supabase.from("rapports_mensuels_ascq").select("*").in("ascq_id", ids).order("annee", { ascending: false }).order("mois", { ascending: false }).limit(30)
      ]);

      const allItems: any[] = [];

      (consultationsRes.data || []).forEach(c => {
        const u = ascqMap.get(c.ascq_id);
        allItems.push({
          id: c.id,
          type: "ICCM",
          typeLibelle: "Consultation iCCM",
          badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
          titre: `${c.prenoms_patient} ${c.nom_patient} (${c.age_valeur} ${c.age_unite || "ans"})`,
          sousTitre: `Village: ${c.village} • Diag: ${c.diagnostic_possible || "Symptômes"} • TDR: ${c.tdr_paludisme}`,
          decision: c.decision === "REFERER_CS" ? "Référé au CS" : "PEC Communautaire",
          decisionBadge: c.decision === "REFERER_CS" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800",
          dateFiche: c.date_consultation || c.created_at,
          ascqNom: u ? `${u.nom} ${u.prenoms}` : (c.ascq_nom || "ASCQ"),
          ascqId: c.ascq_id,
          raw: c
        });
      });

      (femmesRes.data || []).forEach(f => {
        const u = ascqMap.get(f.ascq_id);
        allItems.push({
          id: f.id,
          type: "MATERNITE",
          typeLibelle: "Grossesse & Maternité",
          badgeColor: "bg-pink-100 text-pink-800 border-pink-300",
          titre: `${f.prenoms} ${f.nom}`,
          sousTitre: `Village: ${f.village_nom || "-"} • Terme: ${f.terme_sa || "?"} SA`,
          decision: f.statut_grossesse || "En cours",
          decisionBadge: "bg-pink-100 text-pink-800",
          dateFiche: f.created_at,
          ascqNom: u ? `${u.nom} ${u.prenoms}` : "ASCQ",
          ascqId: f.ascq_id,
          raw: f
        });
      });

      (enfantsRes.data || []).forEach(enf => {
        const u = ascqMap.get(enf.ascq_id);
        allItems.push({
          id: enf.id,
          type: "ENFANTS_1000J",
          typeLibelle: "Enfant 1000 Jours",
          badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
          titre: `${enf.prenoms || ""} ${enf.nom || ""}`,
          sousTitre: `Village: ${enf.village_nom || "-"} • Vaccins: ${enf.statut_vaccinal || "Non précisé"}`,
          decision: enf.etat_nutritionnel || "Suivi régulier",
          decisionBadge: "bg-amber-100 text-amber-800",
          dateFiche: enf.created_at,
          ascqNom: u ? `${u.nom} ${u.prenoms}` : "ASCQ",
          ascqId: enf.ascq_id,
          raw: enf
        });
      });

      (referencesRes.data || []).forEach(r => {
        const u = ascqMap.get(r.ascq_id);
        allItems.push({
          id: r.id,
          type: "REFERENCES",
          typeLibelle: "Référence CS/GUPS",
          badgeColor: "bg-red-100 text-red-800 border-red-300",
          titre: `Évacuation : ${r.motif_reference || "Urgence médicale"}`,
          sousTitre: `Vers : ${r.centre_sante_destination || "Centre de Santé"} • Urgence: ${r.degre_urgence || "Moyenne"}`,
          decision: r.statut_reference || "EN_COURS",
          decisionBadge: "bg-red-100 text-red-800",
          dateFiche: r.date_reference || r.created_at,
          ascqNom: u ? `${u.nom} ${u.prenoms}` : "ASCQ",
          ascqId: r.ascq_id,
          raw: r
        });
      });

      (alertesRes.data || []).forEach(a => {
        const u = ascqMap.get(a.notificateur_id);
        allItems.push({
          id: a.id,
          type: "ALERTES",
          typeLibelle: "Alerte SIMR",
          badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
          titre: `${a.type_alerte_nom || "Alerte Épidémio"} (Sem. ${a.semaine_epidemio})`,
          sousTitre: `Prioritaire: ${a.est_prioritaire ? "OUI" : "NON"} • Détection: ${a.delai_detection_notification_heures || "?"}h`,
          decision: a.investigation_faite ? "Investiguée" : "Non investiguée",
          decisionBadge: a.investigation_faite ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
          dateFiche: a.date_notification || a.created_at,
          ascqNom: u ? `${u.nom} ${u.prenoms}` : "ASCQ",
          ascqId: a.notificateur_id,
          raw: a
        });
      });

      (decesRes.data || []).forEach(d => {
        const u = ascqMap.get(d.notificateur_id);
        allItems.push({
          id: d.id,
          type: "DECES",
          typeLibelle: "Décès Communautaire",
          badgeColor: "bg-slate-200 text-slate-800 border-slate-400",
          titre: `${d.type_deces_nom || "Décès"}`,
          sousTitre: `Village: ${d.village || "-"} • Défunt: ${d.defunt_nom_prenom || "Non précisé"}`,
          decision: "Déclaré",
          decisionBadge: "bg-slate-200 text-slate-800",
          dateFiche: d.date_notification || d.created_at,
          ascqNom: u ? `${u.nom} ${u.prenoms}` : "ASCQ",
          ascqId: d.notificateur_id,
          raw: d
        });
      });

      (rmaRes.data || []).forEach(rma => {
        const u = ascqMap.get(rma.ascq_id);
        allItems.push({
          id: rma.id,
          type: "RMA",
          typeLibelle: "RMA Mensuel",
          badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
          titre: `RMA Mois ${rma.mois}/${rma.annee}`,
          sousTitre: `Soins: ${rma.total_enfants_pris_en_charge || 0} • Palu: ${rma.total_paludisme_confirme || 0} • Référés: ${rma.total_references || 0}`,
          decision: rma.statut_validation || "TRANSMIS",
          decisionBadge: rma.statut_validation === "VALIDE" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800",
          dateFiche: rma.date_depot || rma.created_at,
          ascqNom: u ? `${u.nom} ${u.prenoms}` : "ASCQ",
          ascqId: rma.ascq_id,
          raw: rma
        });
      });

      allItems.sort((a, b) => new Date(b.dateFiche).getTime() - new Date(a.dateFiche).getTime());
      setRegistreFiches(allItems);
    } catch (e) {
      console.warn("Erreur chargement registre fiches:", e);
    } finally {
      setLoadingRegistre(false);
    }
  };

  // Chargement des suggestions de modifications émises par le cadre
  const chargerSuggestions = async () => {
    if (!currentUser) return;
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase
        .from("suggestions_modifications_cadres")
        .select("*, ascq:utilisateurs!ascq_id(nom, prenoms, telephone)")
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        setSuggestionsList(data);
      } else {
        const { data: notifData } = await supabase
          .from("notifications")
          .select("*")
          .eq("type_notification", "SUGGESTION_CADRE")
          .order("created_at", { ascending: false })
          .limit(30);
        setSuggestionsList(notifData || []);
      }
    } catch (e) {
      console.warn("Erreur chargement suggestions:", e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Soumission d'une suggestion de modification sur une fiche d'ASCQ
  const handleCreerSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionAscqId) {
      alert("Veuillez sélectionner l'ASCQ concerné.");
      return;
    }
    if (!suggestionTitre.trim() || !suggestionMessage.trim()) {
      alert("Veuillez renseigner un titre et un message détaillé.");
      return;
    }

    setSubmittingSuggestion(true);
    const cadreTitre = getTitreCadreOfficiel(currentUser);
    const targetAscq = ascqs.find(a => a.id === suggestionAscqId);
    const ascqNom = targetAscq ? `${targetAscq.nom} ${targetAscq.prenoms}` : "l'agent";

    try {
      try {
        await supabase.from("suggestions_modifications_cadres").insert({
          cadre_id: currentUser.id,
          ascq_id: suggestionAscqId,
          commune_id: targetAscq?.commune_id || currentUser.commune_id,
          arrondissement_id: targetAscq?.arrondissement_id,
          departement_id: targetAscq?.departement_id || currentUser.departement_id,
          module_concerne: suggestionModule,
          type_suggestion: suggestionType,
          titre: suggestionTitre.trim(),
          message: suggestionMessage.trim(),
          statut: "EN_ATTENTE"
        });
      } catch (errDb) {
        console.warn("Fallback direct notifications:", errDb);
      }

      await supabase.from("notifications").insert([{
        destinataire_id: suggestionAscqId,
        titre: `💡 Remarque Superviseur (${cadreTitre}) : ${suggestionTitre.trim()}`,
        message: `[Module: ${suggestionModule}] ${currentUser.nom || "Cadre"} ${currentUser.prenoms || ""} vous adresse l'observation suivante : ${suggestionMessage.trim()}`,
        type: "SUGGESTION",
        type_notification: "SUGGESTION_CADRE",
        priorite: "HAUTE",
        lu: false,
      }]);

      setToastMsg({ text: `Observation transmise avec succès à ${ascqNom} !`, error: false });
      setSuggestionTitre("");
      setSuggestionMessage("");
      setTimeout(() => setToastMsg(null), 3500);
      await chargerSuggestions();
    } catch (err: any) {
      setToastMsg({ text: "Erreur enregistrement observation : " + err.message, error: true });
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  // Chargement des ordres de mission du territoire
  const chargerMissions = async () => {
    if (!currentUser) return;
    setLoadingMissions(true);
    try {
      const { data, error } = await supabase
        .from("ordres_mission_territoire")
        .select("*, ascq:utilisateurs!ascq_cible_id(nom, prenoms)")
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        setMissionsList(data);
      } else {
        const { data: notifs } = await supabase
          .from("notifications")
          .select("*")
          .eq("type_notification", "ORDRE_MISSION")
          .order("created_at", { ascending: false })
          .limit(30);
        setMissionsList(notifs || []);
      }
    } catch (e) {
      console.warn("Erreur chargement missions:", e);
    } finally {
      setLoadingMissions(false);
    }
  };

  // Émission d'un ordre de mission ou d'une consigne de terrain
  const handleCreerOrdreMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (missionCibleType === "ASCQ_SPECIFIQUE" && !missionAscqId) {
      alert("Veuillez sélectionner l'ASCQ spécifique à missionner.");
      return;
    }
    if (!missionTitre.trim() || !missionDirectives.trim()) {
      alert("Veuillez préciser l'intitulé et les directives de la mission.");
      return;
    }

    setSubmittingMission(true);
    const cadreTitre = getTitreCadreOfficiel(currentUser);

    const cibles = missionCibleType === "ASCQ_SPECIFIQUE" 
      ? ascqs.filter(a => a.id === missionAscqId)
      : ascqs;

    if (cibles.length === 0) {
      alert("Aucun agent cible trouvé dans votre territoire.");
      setSubmittingMission(false);
      return;
    }

    try {
      try {
        await supabase.from("ordres_mission_territoire").insert({
          cadre_id: currentUser.id,
          cible_type: missionCibleType,
          ascq_cible_id: missionCibleType === "ASCQ_SPECIFIQUE" ? missionAscqId : null,
          departement_id: currentUser.departement_id,
          commune_id: currentUser.commune_id,
          zone_sanitaire_id: currentUser.zone_sanitaire_id,
          titre: missionTitre.trim(),
          type_mission: missionType,
          priorite: missionPriorite,
          date_echeance: missionDateEcheance || null,
          directives: missionDirectives.trim(),
          statut: "TRANSMIS"
        });
      } catch (errDb) {
        console.warn("Fallback ordres_mission:", errDb);
      }

      const notifs = cibles.map((a: any) => ({
        destinataire_id: a.id,
        titre: `🎯 Ordre de Mission (${cadreTitre}) : ${missionTitre.trim()}`,
        message: `[Priorité: ${missionPriorite} • Échéance: ${missionDateEcheance || "Immédiate"}] ${currentUser.nom || "Cadre"} ${currentUser.prenoms || ""} vous assigne la mission suivante : ${missionDirectives.trim()}`,
        type: "MISSION",
        type_notification: "ORDRE_MISSION",
        priorite: missionPriorite,
        lu: false,
      }));

      await supabase.from("notifications").insert(notifs);

      setToastMsg({ text: `Ordre de mission diffusé à ${cibles.length} agent(s) du territoire !`, error: false });
      setMissionTitre("");
      setMissionDirectives("");
      setMissionDateEcheance("");
      setTimeout(() => setToastMsg(null), 3500);
      await chargerMissions();
    } catch (err: any) {
      setToastMsg({ text: "Erreur envoi ordre de mission : " + err.message, error: true });
    } finally {
      setSubmittingMission(false);
    }
  };

  // Envoi d'une alerte sanitaire officielle par le responsable
  const handleDiffuserAlerte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alerteTitre.trim() || !alerteMessage.trim()) {
      alert("Veuillez renseigner le titre et le contenu de l'alerte.");
      return;
    }

    setSendingAlerte(true);
    const cadreTitre = getTitreCadreOfficiel(currentUser);
    try {
      const cibles = ascqs.map(a => a.id);
      if (cibles.length === 0) {
        alert("Aucun agent cible trouvé dans votre territoire.");
        setSendingAlerte(false);
        return;
      }

      const notifs = cibles.map(uid => ({
        destinataire_id: uid,
        titre: `[🚨 ALERTE SANITAIRE ${cadreTitre.toUpperCase()}] ${alerteTitre.trim()}`,
        message: alerteMessage.trim(),
        type: alertePriorite === "URGENTE" ? "URGENT" : "ALERTE",
        type_notification: alertePriorite === "URGENTE" ? "ALERTE_PRIORITAIRE" : "CONSIGNE_ADMIN",
        priorite: alertePriorite,
        lu: false,
      }));

      await supabase.from("notifications").insert(notifs);

      setToastMsg({ text: `Alerte sanitaire officielle transmise à ${cibles.length} agents de votre périmètre !`, error: false });
      setAlerteTitre("");
      setAlerteMessage("");
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      setToastMsg({ text: "Erreur envoi : " + err.message, error: true });
    } finally {
      setSendingAlerte(false);
    }
  };

  // Chargement du journal d'exports
  const chargerJournalExports = async () => {
    setLoadingJournal(true);
    try {
      const { data } = await supabase
        .from("journal_exports_responsables")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setJournalExports(data || []);
    } catch (e) {
      console.warn("Erreur journal exports:", e);
    } finally {
      setLoadingJournal(false);
    }
  };

  useEffect(() => {
    initialiserPerimetre();
  }, []);

  useEffect(() => {
    if (activeTab === "exports_journal" && currentUser) {
      chargerJournalExports();
    } else if (activeTab === "suggestions" && currentUser) {
      chargerSuggestions();
    } else if (activeTab === "alertes_missions" && currentUser) {
      chargerMissions();
    } else if (activeTab === "fiches_territoire" && currentUser) {
      chargerRegistreFichesTerritoire();
    }
  }, [activeTab, currentUser]);

  // Déclencheur des exports
  const executerExportCompilé = async (format: "EXCEL" | "CSV" | "PDF") => {
    const territoireLibelle = currentUser.commune_nom || currentUser.departement_nom || "National";
    const niveau = currentUser.commune_id ? "COMMUNE" : currentUser.departement_id ? "DEPARTEMENT" : "NATIONAL";

    const enTetes = ["Territoire", "ASCQ Actifs", "Alertes Notifiées", "Décès Déclarés", "RMA Déposés", "Complétude %"];
    const lignes = stats.ventilation.map((v: any) => [
      v.nom,
      v.ascq_count,
      anonymiserPetitEffectif(v.alertes),
      anonymiserPetitEffectif(v.deces),
      v.rma_deposes,
      v.ascq_count > 0 ? `${Math.round((v.rma_deposes / v.ascq_count) * 100)}%` : "0%"
    ]);

    const nomFichier = `Compilation_Gouvernance_${territoireLibelle}_${annee}_M${mois}`;

    if (format === "CSV") {
      telechargerCsvBOM(nomFichier, enTetes, lignes);
    } else if (format === "EXCEL") {
      telechargerExcelHtml(nomFichier, `COMPILATION SANITAIRE - ${territoireLibelle.toUpperCase()}`, `Année ${annee} • Mois ${mois}`, enTetes, lignes);
    } else if (format === "PDF") {
      imprimerRapportPdf(
        `COMPILATION SANITAIRE - ${territoireLibelle.toUpperCase()}`,
        `Supervision territoriale • Année ${annee} • Mois ${mois}`,
        enTetes,
        lignes,
        { "Territoire": territoireLibelle, "Superviseur": `${currentUser.nom} ${currentUser.prenoms}`, "Rôle": currentUser.poste || currentUser.role_technique }
      );
    }

    await journaliserExport("COMPILATION_TERRITOIRE", format, territoireLibelle, niveau, lignes.length, { annee, mois });
  };

  const executerExportAscq = async (format: "EXCEL" | "CSV" | "PDF") => {
    const territoireLibelle = currentUser.commune_nom || currentUser.departement_nom || "National";
    const niveau = currentUser.commune_id ? "COMMUNE" : currentUser.departement_id ? "DEPARTEMENT" : "NATIONAL";

    const enTetes = ["Nom", "Prénoms", "Téléphone", "Arrondissement", "Rapport du mois", "Statut Compte"];
    const lignes = ascqs.map((a: any) => [
      a.nom,
      a.prenoms,
      a.telephone,
      a.arrondissement_nom,
      a.statut_rapport_mois === "DEPOSE" ? "Déposé à temps" : a.statut_rapport_mois === "EN_RETARD" ? "En retard" : "Manquant",
      a.statut_compte
    ]);

    const nomFichier = `Liste_ASCQ_${territoireLibelle}_${annee}_M${mois}`;

    if (format === "CSV") {
      telechargerCsvBOM(nomFichier, enTetes, lignes);
    } else if (format === "EXCEL") {
      telechargerExcelHtml(nomFichier, `LISTE DU PERSONNEL ASCQ - ${territoireLibelle.toUpperCase()}`, `Année ${annee} • Mois ${mois}`, enTetes, lignes);
    } else if (format === "PDF") {
      imprimerRapportPdf(
        `LISTE DU PERSONNEL ASCQ - ${territoireLibelle.toUpperCase()}`,
        `État des agents et ponctualité des rapports • Année ${annee} • Mois ${mois}`,
        enTetes,
        lignes,
        { "Territoire": territoireLibelle, "Effectif total": `${ascqs.length} agents`, "Généré par": `${currentUser.nom} ${currentUser.prenoms}` }
      );
    }

    await journaliserExport("LISTE_ASCQ", format, territoireLibelle, niveau, lignes.length, { annee, mois });
  };

  // Filtrage des ASCQ
  const ascqsFiltres = ascqs.filter(a => {
    if (filtreTerritoireId !== "TOUS" && a.arrondissement_id !== filtreTerritoireId && a.commune_id !== filtreTerritoireId) return false;
    if (filtreStatutRapport !== "TOUS" && a.statut_rapport_mois !== filtreStatutRapport) return false;
    if (searchAscq.trim() !== "") {
      const q = searchAscq.toLowerCase();
      return (
        a.nom?.toLowerCase().includes(q) ||
        a.prenoms?.toLowerCase().includes(q) ||
        a.telephone?.includes(q) ||
        a.arrondissement_nom?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="text-center space-y-2 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#005c30]" />
          <p className="text-xs font-semibold">Chargement du module de gouvernance territoriale...</p>
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-28">
        <AscqNav userProfile={currentUser} />
        <main className="max-w-xl mx-auto px-4 pt-10 sm:pt-16 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-200 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Espace Réservé aux Responsables de Santé
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Ce module est dédié à la <strong>supervision et consultation exclusive</strong> pour les Cadres Nationaux, Départementaux (DDS), de Zone Sanitaire (MCZS) et Communaux (MCC / Représentants).
              </p>
            </div>

            {currentUser && (
              <div className="p-4 bg-slate-50 rounded-2xl text-left border border-slate-200/80 text-xs space-y-1.5 font-medium">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vos identifiants actuels :</p>
                <p className="text-slate-800"><strong>Nom :</strong> {currentUser.nom} {currentUser.prenoms}</p>
                <div className="text-slate-800 flex items-center gap-2">
                  <strong>Téléphone :</strong>
                  <BeninPhoneAction telephone={currentUser.telephone} variant="button-group" />
                </div>
                <p className="text-slate-800"><strong>Poste :</strong> {currentUser.poste || "Non renseigné"} {currentUser.poste_autre ? `(${currentUser.poste_autre})` : ""}</p>
                <p className="text-slate-800"><strong>Statut :</strong> <span className="font-bold text-emerald-700">{currentUser.statut_compte || "VALIDE"}</span></p>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => router.push("/espace-ascq")}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#005c30] text-white font-bold text-xs hover:bg-[#004724] transition-all shadow-sm"
              >
                Retourner à mon espace ASCQ
              </button>
              <a
                href="tel:0169031463"
                className="py-3 px-4 rounded-2xl bg-amber-100 text-amber-900 font-bold text-xs hover:bg-amber-200 transition-all flex items-center justify-center gap-1.5"
              >
                <Phone className="w-4 h-4" /> Contacter Super Admin
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const libelleTerritoire = currentUser?.commune_nom ? `Commune de ${currentUser.commune_nom}` :
                            currentUser?.zone_sanitaire_nom ? `Zone Sanitaire ${currentUser.zone_sanitaire_nom}` :
                            currentUser?.departement_nom ? `Département du ${currentUser.departement_nom}` :
                            "Territoire National";

  const libelleRole = getTitreCadreOfficiel(currentUser);

  const isSuperAdmin = (currentUser?.telephone || "").includes("69031463") || currentUser?.role_technique === "SUPER_ADMIN";
  const isRepresentantCommunal = isSuperAdmin || 
    currentUser?.poste === "REPRESENTANT_COMMUNAL" || 
    currentUser?.role_technique === "REPRESENTANT_COMMUNAL" || 
    (currentUser?.role_nomination || "").toUpperCase().includes("REPRESENTANT_COMMUNAL") ||
    (currentUser?.role_nomination || "").toUpperCase().includes("COMMUNAL") ||
    currentUser?.poste === "PF_CCLS_TP";

  const isRepresentantDepartemental = isSuperAdmin ||
    currentUser?.poste === "REPRESENTANT_DEPARTEMENTAL" ||
    currentUser?.role_technique === "REPRESENTANT_DEPARTEMENTAL" ||
    (currentUser?.role_nomination || "").toUpperCase().includes("DEPARTEMENTAL") ||
    currentUser?.poste === "DDS" ||
    currentUser?.poste === "CCD_CDLS_TP";

  const peutGererNettoyageEtRadiation = isSuperAdmin || isRepresentantCommunal || isRepresentantDepartemental;

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-28">
      <AscqNav userProfile={currentUser} />

      <main className="max-w-5xl mx-auto px-4 pt-5 space-y-4">
        
        {/* BANDEAU GOUVERNANCE OFFICIEL */}
        <div className="bg-gradient-to-r from-emerald-950 via-[#005c30] to-teal-900 text-white rounded-3xl p-6 shadow-md space-y-3 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-sm">
                  <Crown className="w-4 h-4 fill-current" />
                  <span>{libelleRole}</span>
                </span>
                <span className="text-[10px] bg-slate-900 text-amber-300 px-2.5 py-0.5 rounded-full uppercase font-bold tracking-wide">
                  {isRepresentantCommunal ? "Supervision & Validation" : "Supervision & Consultation"}
                </span>
                {currentUser?.departement_nom && (
                  <span className="text-[10px] bg-white/10 text-emerald-100 px-2.5 py-0.5 rounded-full border border-white/20">
                    Dép : {currentUser.departement_nom}
                  </span>
                )}
                {currentUser?.zone_sanitaire_nom && (
                  <span className="text-[10px] bg-white/10 text-emerald-100 px-2.5 py-0.5 rounded-full border border-white/20">
                    Zone : {currentUser.zone_sanitaire_nom}
                  </span>
                )}
                {currentUser?.commune_nom && (
                  <span className="text-[10px] bg-white/10 text-emerald-100 px-2.5 py-0.5 rounded-full border border-white/20">
                    Commune : {currentUser.commune_nom}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Gouvernance Sanitaire • {libelleTerritoire}
              </h1>
              <p className="text-xs text-emerald-100 font-medium">
                {isRepresentantCommunal
                  ? "Validation des inscriptions ASCQ, contrôle et visa des rapports RMA/Hebdo, et pilotage sanitaire communal."
                  : "Supervision du périmètre territorial, observation des fiches d'ASCQ, suggestions de corrections, alertes sanitaires et ordres de mission."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1.5 rounded-2xl bg-white/10 text-white font-mono font-bold text-xs border border-white/20">
                {stats.total_ascq} ASCQ rattachés
              </span>
              {isRepresentantCommunal && inscriptionsEnAttente.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("inscriptions_ascq")}
                  className="px-3 py-1.5 rounded-2xl bg-amber-400 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1.5 hover:bg-amber-300 transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{inscriptionsEnAttente.length} inscription(s) à valider</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {toastMsg && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            toastMsg.error ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}>
            <Info className="w-4 h-4 shrink-0" />
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* ONGLETS DE GOUVERNANCE */}
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("dashboard_compile")}
            className={`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "dashboard_compile" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Tableau de bord</span>
          </button>

          <button
            onClick={() => setActiveTab("suivi_individuel")}
            className={`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "suivi_individuel" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. ASCQ & RC Territoire</span>
          </button>

          {(isRepresentantCommunal || isSuperAdmin) && (
            <button
              onClick={() => setActiveTab("inscriptions_ascq")}
              className={`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap relative ${
                activeTab === "inscriptions_ascq" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>3. Inscriptions ASCQ</span>
              {inscriptionsEnAttente.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500 text-white font-black animate-pulse">
                  {inscriptionsEnAttente.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab("suggestions")}
            className={`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap relative ${
              activeTab === "suggestions" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>4. Suggestions & Remarques</span>
            {suggestionsList.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-700 text-white font-black">
                {suggestionsList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("alertes_missions")}
            className={`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "alertes_missions" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>5. Alertes & Missions</span>
          </button>

          <button
            onClick={() => setActiveTab("exports_journal")}
            className={`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "exports_journal" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>6. Exports & Audit</span>
          </button>

          {peutGererNettoyageEtRadiation && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("nettoyage_radiation");
                if (tousLesAscqsPerimetre.length === 0 && currentUser) chargerTousLesAscqsPerimetre(currentUser);
                if (registreFiches.length === 0) chargerRegistreFichesTerritoire();
              }}
              className={`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === "nettoyage_radiation" ? "bg-rose-100 text-rose-950 shadow-sm font-black border border-rose-300" : "hover:text-slate-900 text-rose-900"
              }`}
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>7. Nettoyage & Radiation</span>
            </button>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 1 : TABLEAU DE BORD COMPILÉ */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "dashboard_compile" && (
          <div className="space-y-4">
            
            {/* Filtres de Période & Actions Export */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-700">Période :</span>
                <select
                  value={annee}
                  onChange={(e) => setAnnee(parseInt(e.target.value, 10))}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>

                <select
                  value={mois}
                  onChange={(e) => setMois(parseInt(e.target.value, 10))}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Mois {i + 1} ({new Date(2026, i).toLocaleString("fr-FR", { month: "short" })})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => chargerIndicateursCompiles(currentUser)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Rafraîchir"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingStats ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Boutons d'export rapide de la compilation */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Exporter :</span>
                <button
                  type="button"
                  onClick={() => executerExportCompilé("EXCEL")}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-1 transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => executerExportCompilé("CSV")}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-xs flex items-center gap-1 transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>CSV (BOM)</span>
                </button>
                <button
                  type="button"
                  onClick={() => executerExportCompilé("PDF")}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs flex items-center gap-1 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Cartes d'Indicateurs Clés */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-emerald-600">
                  <Activity className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {anonymiserPetitEffectif(stats.alertes_prioritaires)} urgentes
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900">
                  {anonymiserPetitEffectif(stats.total_alertes)}
                </div>
                <p className="text-[11px] font-bold text-slate-500">Alertes Notifiées</p>
                <span className="text-[10px] text-amber-700 block font-medium">
                  {anonymiserPetitEffectif(stats.alertes_non_investiguees)} non investiguées
                </span>
              </div>

              <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-blue-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">SIMR</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900">
                  {stats.delai_detection_heures}h
                </div>
                <p className="text-[11px] font-bold text-slate-500">Délai Détection-Notif</p>
                <span className="text-[10px] text-slate-400 block font-medium">Norme &le; 24h</span>
              </div>

              <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-purple-600">
                  <Skull className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                    Maternels: {anonymiserPetitEffectif(stats.deces_maternels)}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900">
                  {anonymiserPetitEffectif(stats.total_deces)}
                </div>
                <p className="text-[11px] font-bold text-slate-500">Décès Communautaires</p>
                <span className="text-[10px] text-purple-700 block font-medium">
                  Néonatals : {anonymiserPetitEffectif(stats.deces_neonatals)}
                </span>
              </div>

              <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-amber-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">RMA</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900">
                  {stats.taux_completude_rma}%
                </div>
                <p className="text-[11px] font-bold text-slate-500">Complétude RMA</p>
                <span className="text-[10px] text-emerald-700 block font-medium">
                  {stats.rma_deposes} à temps • {stats.rma_retard} retard • {stats.rma_manquants} manquants
                </span>
              </div>
            </div>

            {/* Tableau de Ventilation par Territoire Inférieur */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Ventilation par Territoire Inférieur
                  </h3>
                  <p className="text-xs text-slate-500">
                    Détail des totaux compilés selon les normes de confidentialité (petits effectifs &lt; 5 masqués).
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-black">
                      <th className="py-2.5 px-3">Territoire</th>
                      <th className="py-2.5 px-3 text-center">ASCQ Actifs</th>
                      <th className="py-2.5 px-3 text-center">Alertes Notifiées</th>
                      <th className="py-2.5 px-3 text-center">Décès Déclarés</th>
                      <th className="py-2.5 px-3 text-center">RMA Déposés</th>
                      <th className="py-2.5 px-3 text-right">Complétude</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {stats.ventilation.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Aucun territoire rattaché.
                        </td>
                      </tr>
                    ) : (
                      stats.ventilation.map((v: any) => {
                        const completude = v.ascq_count > 0 ? Math.round((v.rma_deposes / v.ascq_count) * 100) : 0;
                        return (
                          <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-bold text-slate-900">{v.nom}</td>
                            <td className="py-3 px-3 text-center text-slate-600">{v.ascq_count}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold">
                                {anonymiserPetitEffectif(v.alertes)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 font-bold">
                                {anonymiserPetitEffectif(v.deces)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center text-slate-700 font-bold">{v.rma_deposes}</td>
                            <td className="py-3 px-3 text-right font-black text-emerald-800">{completude}%</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 7 : NETTOYAGE DES DONNEES ERRONÉES & GESTION ASCQ */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "nettoyage_radiation" && (
          <div className="space-y-4">
            
            {/* BANDEAU SUPERIEUR D'INFORMATION */}
            <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-0.5 rounded-full bg-rose-500/30 text-rose-200 text-[10px] font-black uppercase border border-rose-400/30">
                      Gouvernance & Assainissement
                    </span>
                    <span className="text-[10px] text-rose-200 font-bold">
                      {libelleTerritoire}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                    <Trash2 className="w-6 h-6 text-rose-300 shrink-0" />
                    <span>Nettoyage & Radiation des Comptes</span>
                  </h2>
                  <p className="text-xs text-rose-100 max-w-2xl leading-relaxed">
                    Espace habilité pour les Représentants Communaux, Représentants Départementaux et le Super Administrateur National. Supprimez les données jugées erronées sur le terrain avec traçabilité d'audit obligatoire, et gérez la fin de fonction des agents qui ne sont plus ASCQ.
                  </p>
                </div>
              </div>

              {/* COMMUTATEUR DES 2 SOUS-VOLETS */}
              <div className="flex items-center gap-2 bg-black/20 p-1 rounded-2xl w-full sm:w-auto self-start border border-white/10">
                <button
                  type="button"
                  onClick={() => setSousOngletNettoyage("donnees")}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    sousOngletNettoyage === "donnees"
                      ? "bg-white text-slate-900 shadow-md font-black"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  <ClipboardList className="w-4 h-4 text-rose-700" />
                  <span>1. Nettoyage des Données Erronées ({registreFiches.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSousOngletNettoyage("ascq");
                    if (tousLesAscqsPerimetre.length === 0 && currentUser) {
                      chargerTousLesAscqsPerimetre(currentUser);
                    }
                  }}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    sousOngletNettoyage === "ascq"
                      ? "bg-white text-slate-900 shadow-md font-black"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  <Users className="w-4 h-4 text-rose-700" />
                  <span>2. Radiation & Gestion des ASCQ ({tousLesAscqsPerimetre.length})</span>
                </button>
              </div>
            </div>

            {/* --------------------------------------------------------- */}
            {/* SOUS-VOLET 1 : NETTOYAGE DES DONNÉES ERRONÉES */}
            {/* --------------------------------------------------------- */}
            {sousOngletNettoyage === "donnees" && (
              <div className="space-y-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Fiches d'activité et déclarations du périmètre</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Sélectionnez une donnée signalée erronée (test, doublon, fausse alerte) pour la retirer et l'archiver dans l'audit.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={chargerRegistreFichesTerritoire}
                      disabled={loadingRegistre}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingRegistre ? "animate-spin text-[#005c30]" : ""}`} />
                      <span>Actualiser</span>
                    </button>
                  </div>

                  {/* Filtres par Module / Type */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
                    {[
                      { id: "TOUT", label: "Toutes les fiches" },
                      { id: "ICCM", label: "🩺 Soins iCCM" },
                      { id: "MATERNITE", label: "🤰 Maternité" },
                      { id: "ENFANTS_1000J", label: "👶 1000 Jours" },
                      { id: "REFERENCES", label: "🚑 Références CS" },
                      { id: "ALERTES", label: "🚨 Alertes SIMR" },
                      { id: "DECES", label: "⚰️ Décès" },
                      { id: "RMA", label: "📊 Rapports RMA" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFiltreTypeDonneeNettoyage(f.id)}
                        className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                          filtreTypeDonneeNettoyage === f.id
                            ? "bg-rose-900 text-white shadow-sm font-black"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Recherche rapide */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom de patient, titre, village ou ASCQ..."
                      value={searchNettoyageDonnees}
                      onChange={(e) => setSearchNettoyageDonnees(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-600"
                    />
                  </div>

                  {/* Liste des données */}
                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                    {(() => {
                      const fichesFiltrees = registreFiches.filter((f) => {
                        if (filtreTypeDonneeNettoyage !== "TOUT" && f.type !== filtreTypeDonneeNettoyage) return false;
                        if (searchNettoyageDonnees.trim() !== "") {
                          const q = searchNettoyageDonnees.toLowerCase();
                          return (
                            (f.titre && f.titre.toLowerCase().includes(q)) ||
                            (f.sousTitre && f.sousTitre.toLowerCase().includes(q)) ||
                            (f.ascqNom && f.ascqNom.toLowerCase().includes(q)) ||
                            (f.typeLibelle && f.typeLibelle.toLowerCase().includes(q))
                          );
                        }
                        return true;
                      });

                      if (fichesFiltrees.length === 0) {
                        return (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            Aucune fiche ou donnée trouvée selon vos filtres.
                          </div>
                        );
                      }

                      return fichesFiltrees.map((item) => (
                        <div key={item.id} className="p-3.5 hover:bg-rose-50/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${item.badgeColor}`}>
                                {item.typeLibelle}
                              </span>
                              <span className="text-xs font-black text-slate-900">
                                {item.titre}
                              </span>
                              {item.decision && (
                                <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${item.decisionBadge || "bg-slate-100 text-slate-700"}`}>
                                  {item.decision}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 font-medium">
                              {item.sousTitre}
                            </p>

                            <p className="text-[10px] text-slate-400">
                              Enregistré par : <strong className="text-slate-700">{item.ascqNom}</strong> • Date : {new Date(item.dateFiche).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => setFicheAffichee(item)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Consulter</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => ouvrirModalNettoyage(item)}
                              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-xs"
                              title="Supprimer cette donnée erronée"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              <span>Nettoyer</span>
                            </button>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------- */}
            {/* SOUS-VOLET 2 : RADIATION & SUPPRESSION DES COMPTES ASCQ */}
            {/* --------------------------------------------------------- */}
            {sousOngletNettoyage === "ascq" && (
              <div className="space-y-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-rose-700" />
                        <span>Personnel ASCQ du Périmètre ({libelleTerritoire})</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Radiez les agents qui ne sont plus en fonction (fin de contrat, démission, révocation) ou supprimez définitivement les comptes de test et doublons.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => currentUser && chargerTousLesAscqsPerimetre(currentUser)}
                      disabled={loadingTousLesAscqs}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingTousLesAscqs ? "animate-spin text-rose-700" : ""}`} />
                      <span>Actualiser</span>
                    </button>
                  </div>

                  {/* Filtres par statut */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
                    {[
                      { id: "TOUS", label: "Tous les statuts" },
                      { id: "VALIDE", label: "✅ En fonction (Validés)" },
                      { id: "RADIE", label: "⛔ Radiés (Fin de fonction)" },
                      { id: "EN_ATTENTE", label: "⏳ En attente" },
                      { id: "SUSPENDU", label: "⏸️ Suspendus" },
                    ].map((st) => {
                      const count = st.id === "TOUS" 
                        ? tousLesAscqsPerimetre.length 
                        : tousLesAscqsPerimetre.filter((a) => a.statut_compte === st.id).length;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setFiltreStatutGestionAscq(st.id)}
                          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                            filtreStatutGestionAscq === st.id
                              ? "bg-slate-900 text-white shadow-sm font-black"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <span>{st.label}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            filtreStatutGestionAscq === st.id ? "bg-white/20 text-white" : "bg-white text-slate-700 shadow-xs"
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Recherche rapide */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom, prénom, téléphone, arrondissement..."
                      value={searchGestionAscq}
                      onChange={(e) => setSearchGestionAscq(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-600"
                    />
                  </div>

                  {/* Grille / Liste des comptes ASCQ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(() => {
                      const ascqsFiltres = tousLesAscqsPerimetre.filter((a) => {
                        if (filtreStatutGestionAscq !== "TOUS" && a.statut_compte !== filtreStatutGestionAscq) return false;
                        if (searchGestionAscq.trim() !== "") {
                          const q = searchGestionAscq.toLowerCase();
                          return (
                            (a.nom && a.nom.toLowerCase().includes(q)) ||
                            (a.prenoms && a.prenoms.toLowerCase().includes(q)) ||
                            (a.telephone && a.telephone.includes(q)) ||
                            (a.arrondissement_nom && a.arrondissement_nom.toLowerCase().includes(q))
                          );
                        }
                        return true;
                      });

                      if (ascqsFiltres.length === 0) {
                        return (
                          <div className="col-span-full p-8 text-center text-slate-400 text-xs">
                            Aucun agent ASCQ correspondant aux critères dans ce périmètre.
                          </div>
                        );
                      }

                      return ascqsFiltres.map((agent) => (
                        <div
                          key={agent.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                            agent.statut_compte === "RADIE"
                              ? "bg-rose-50/40 border-rose-200"
                              : agent.statut_compte === "VALIDE"
                              ? "bg-white border-slate-200/90 hover:border-slate-300"
                              : "bg-amber-50/30 border-amber-200"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-black text-sm text-slate-900 uppercase">
                                  {agent.nom} {agent.prenoms}
                                </h4>
                                <p className="text-[11px] text-slate-500 font-medium">
                                  Arrondissement : <strong className="text-slate-800">{agent.arrondissement_nom || "Arrondissement"}</strong>
                                </p>
                              </div>

                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  agent.statut_compte === "VALIDE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : agent.statut_compte === "RADIE"
                                    ? "bg-rose-100 text-rose-800 border border-rose-300 font-extrabold"
                                    : agent.statut_compte === "SUSPENDU"
                                    ? "bg-slate-200 text-slate-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {agent.statut_compte === "RADIE" ? "RADIÉ (FIN FONCTION)" : agent.statut_compte}
                              </span>
                            </div>

                            {/* Contact Benin WhatsApp et Appel */}
                            <div>
                              <BeninPhoneAction telephone={agent.telephone} variant="button-group" />
                            </div>

                            {/* Alerte si Radié */}
                            {agent.statut_compte === "RADIE" && (
                              <div className="text-[11px] bg-rose-100/70 border border-rose-200 text-rose-950 p-2.5 rounded-xl space-y-1">
                                <p className="font-extrabold flex items-center gap-1.5 text-rose-900">
                                  <UserX className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>Agent radié - Accès révoqué</span>
                                </p>
                                {agent.motif_radiation && (
                                  <p className="text-rose-900 text-xs">
                                    <strong>Motif :</strong> {agent.motif_radiation}
                                  </p>
                                )}
                                {agent.date_radiation && (
                                  <p className="text-rose-700 text-[10px]">
                                    Date : {new Date(agent.date_radiation).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Boutons d'action territoriale */}
                          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 flex-wrap justify-end">
                            {agent.statut_compte === "VALIDE" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setModalRadiationAscq(agent);
                                  setMotifRadiation("FIN_CONTRAT");
                                  setExplicationRadiation("");
                                }}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-xs"
                                title="Radier cet agent suite à fin de contrat ou cessation d'activité"
                              >
                                <UserX className="w-3.5 h-3.5 text-rose-600" />
                                <span>Radier (Fin de fonction)</span>
                              </button>
                            )}

                            {(agent.statut_compte === "RADIE" || agent.statut_compte === "SUSPENDU") && (
                              <button
                                type="button"
                                onClick={() => handleRetablirAscq(agent)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-xs"
                                title="Rétablir les fonctions de cet agent"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Rétablir en fonction</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setModalSuppressionAscq(agent);
                                setConfirmSuppressionTexte("");
                              }}
                              className="px-2 py-1.5 rounded-xl text-slate-400 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
                              title="Supprimer définitivement ce compte (doublon ou test)"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Supprimer</span>
                            </button>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 2 : SUIVI INDIVIDUEL DES ASCQ */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "suivi_individuel" && (
          <div className="space-y-4">
            
            {/* Filtres et Recherche ASCQ */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 text-xs">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom, téléphone ou arrondissement..."
                  value={searchAscq}
                  onChange={(e) => setSearchAscq(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                />
              </div>

              <select
                value={filtreTerritoireId}
                onChange={(e) => setFiltreTerritoireId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
              >
                <option value="TOUS">Tous les territoires</option>
                {listeTerritoiresInf.map(t => (
                  <option key={t.id} value={t.id}>{t.nom}</option>
                ))}
              </select>

              <select
                value={filtreStatutRapport}
                onChange={(e) => setFiltreStatutRapport(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
              >
                <option value="TOUS">Tous les statuts de rapport</option>
                <option value="DEPOSE">🟢 Déposé à temps</option>
                <option value="EN_RETARD">🟡 Déposé en retard</option>
                <option value="MANQUANT">🔴 Rapport manquant</option>
              </select>

              <button
                type="button"
                onClick={() => executerExportAscq("EXCEL")}
                className="px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold flex items-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Exporter liste</span>
              </button>
            </div>

            {/* Liste des ASCQ */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">
                  {ascqsFiltres.length} ASCQ dans votre périmètre
                </h3>
                <span className="text-[11px] text-slate-400">Consultation seule 360°</span>
              </div>

              <div className="divide-y divide-slate-100">
                {ascqsFiltres.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Aucun ASCQ ne correspond à vos filtres.
                  </div>
                ) : (
                  ascqsFiltres.map((ascq) => (
                    <div key={ascq.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{ascq.nom} {ascq.prenoms}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            ascq.statut_rapport_mois === "DEPOSE" ? "bg-emerald-100 text-emerald-800" :
                            ascq.statut_rapport_mois === "EN_RETARD" ? "bg-amber-100 text-amber-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {ascq.statut_rapport_mois === "DEPOSE" ? "🟢 Rapport déposé" :
                             ascq.statut_rapport_mois === "EN_RETARD" ? "🟡 Dépôt en retard" : "🔴 Rapport manquant"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <BeninPhoneAction telephone={ascq.telephone} variant="button-group" />
                          <span>•</span>
                          <span>📍 {ascq.arrondissement_nom}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => inspecterAscq360(ascq)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#005c30] hover:text-white text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspecter dossier 360°</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* MODALE D'INSPECTION 360° (CONSULTATION STRICTEMENT LECTURE SEULE) */}
            {selectedAscq && (
              <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
                  
                  {/* En-tête */}
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-black uppercase">
                          {isRepresentantCommunal ? "Supervision & Validation Communale" : "Consultation Seule 360°"}
                        </span>
                        {isRepresentantCommunal ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                      <h3 className="text-base font-black text-slate-900 mt-1">
                        Dossier de {selectedAscq.nom} {selectedAscq.prenoms}
                      </h3>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <BeninPhoneAction telephone={selectedAscq.telephone} variant="button-group" />
                        <span>•</span>
                        <span>{selectedAscq.arrondissement_nom}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedAscq(null)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Barre de navigation des sous-onglets 360° */}
                  <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center gap-1 overflow-x-auto scrollbar-none text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDossierSubTab("ICCM")}
                      className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        dossierSubTab === "ICCM" ? "bg-emerald-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Soins iCCM ({dossierAscq.consultations.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierSubTab("MATERNITE")}
                      className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        dossierSubTab === "MATERNITE" ? "bg-pink-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Baby className="w-3.5 h-3.5" />
                      <span>Maternité & 1000J ({dossierAscq.femmes.length + dossierAscq.enfants.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierSubTab("REFERENCES")}
                      className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        dossierSubTab === "REFERENCES" ? "bg-red-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <HeartPulse className="w-3.5 h-3.5" />
                      <span>Références ({dossierAscq.references.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierSubTab("RAPPORTS")}
                      className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        dossierSubTab === "RAPPORTS" ? "bg-blue-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Rapports ({dossierAscq.rma.length + dossierAscq.hebdo.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierSubTab("SIMR")}
                      className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        dossierSubTab === "SIMR" ? "bg-purple-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Alertes & Décès ({dossierAscq.alertes.length + dossierAscq.deces.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierSubTab("RELAIS")}
                      className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        dossierSubTab === "RELAIS" ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Relais RC ({dossierAscq.relais.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierSubTab("PLANNING")}
                      className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        dossierSubTab === "PLANNING" ? "bg-amber-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Activités ({dossierAscq.activites.length})</span>
                    </button>
                  </div>

                  {/* Contenu filtré par sous-onglet */}
                  <div className="p-5 overflow-y-auto space-y-3 text-xs max-h-[60vh]">
                    {loadingDossier ? (
                      <div className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30] mb-2" />
                        Chargement des fiches et données complètes de l'agent...
                      </div>
                    ) : (
                      <>
                        {/* 1. SOUS-ONGLET : SOINS iCCM */}
                        {dossierSubTab === "ICCM" && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between pb-1">
                              <h4 className="font-extrabold text-slate-900 text-xs">🩺 Consultations et Soins Communautaires iCCM</h4>
                              <span className="text-[10px] text-slate-500">{dossierAscq.consultations.length} fiches enregistrées</span>
                            </div>

                            {dossierAscq.consultations.length === 0 ? (
                              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 text-slate-400">
                                Aucune consultation enregistrée par cet agent.
                              </div>
                            ) : (
                              dossierAscq.consultations.map((c: any) => (
                                <div key={c.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-black text-slate-900 text-sm">{c.prenoms_patient} {c.nom_patient}</span>
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                          {c.age_valeur} {c.age_unite || "ans"} • Sexe: {c.sexe}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5">
                                        Village : <strong>{c.village}</strong> • Date : {c.date_consultation || new Date(c.created_at).toLocaleDateString("fr-FR")}
                                      </p>
                                    </div>

                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                      c.decision === "REFERER_CS" ? "bg-red-100 text-red-800 border border-red-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    }`}>
                                      {c.decision === "REFERER_CS" ? "🚨 Référé vers CS" : "✅ PEC Communautaire"}
                                    </span>
                                  </div>

                                  <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 border border-slate-100">
                                    <div>
                                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Signe Principal & Diagnostic</span>
                                      <p className="font-bold text-slate-900">{c.signe_principal || "Non spécifié"}</p>
                                      <p className="text-slate-600 text-[10px]">Diag : {c.diagnostic_possible || "iCCM"}</p>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Test TDR Paludisme</span>
                                      <p className={`font-black text-[11px] ${
                                        c.tdr_paludisme === "POSITIF" ? "text-red-700" : c.tdr_paludisme === "NEGATIF" ? "text-emerald-700" : "text-slate-500"
                                      }`}>
                                        TDR : {c.tdr_paludisme}
                                      </p>
                                      {c.structure_cs_destination && (
                                        <p className="text-slate-600 text-[10px]">Vers : {c.structure_cs_destination}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setFicheAffichee({ type: "ICCM", donnees: c, ascq: selectedAscq })}
                                      className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-bold text-[11px] flex items-center gap-1 transition-all"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Consulter la fiche complète</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSuggestionAscqId(selectedAscq.id);
                                        setSuggestionModule("ICCM");
                                        setSuggestionTitre(`Observation Fiche Consultation ${c.prenoms_patient} ${c.nom_patient}`);
                                        setActiveTab("suggestions");
                                        setSelectedAscq(null);
                                      }}
                                      className="py-1 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] flex items-center gap-1 transition-all"
                                    >
                                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Remarque</span>
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {/* 2. SOUS-ONGLET : MATERNITÉ & 1000 PREMIERS JOURS */}
                        {dossierSubTab === "MATERNITE" && (
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-extrabold text-pink-900 text-xs mb-2">🤰 Femmes Enceintes Suivies ({dossierAscq.femmes.length})</h4>
                              {dossierAscq.femmes.length === 0 ? (
                                <p className="text-slate-400 text-[11px] bg-slate-50 p-4 rounded-xl text-center">Aucune femme enceinte suivie enregistrée.</p>
                              ) : (
                                <div className="space-y-2">
                                  {dossierAscq.femmes.map((f: any) => (
                                    <div key={f.id} className="p-3 bg-white rounded-2xl border border-pink-100 shadow-sm flex items-center justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900">{f.prenoms} {f.nom}</span>
                                          <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 text-[10px] font-bold">
                                            {f.statut_grossesse || "En cours"} {f.terme_sa ? `(${f.terme_sa} SA)` : ""}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                          Village : {f.village_nom || "-"} • DPA : {f.date_dpa || "Non définie"}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => setFicheAffichee({ type: "MATERNITE", donnees: f, ascq: selectedAscq })}
                                          className="p-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-800 font-bold"
                                          title="Voir détails"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSuggestionAscqId(selectedAscq.id);
                                            setSuggestionModule("MATERNITE");
                                            setSuggestionTitre(`Remarque Suivi Grossesse ${f.prenoms} ${f.nom}`);
                                            setActiveTab("suggestions");
                                            setSelectedAscq(null);
                                          }}
                                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold"
                                          title="Suggérer correction"
                                        >
                                          <Sparkles className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                              <h4 className="font-extrabold text-amber-900 text-xs mb-2">👶 Enfants 1000 Premiers Jours & Nutrition ({dossierAscq.enfants.length})</h4>
                              {dossierAscq.enfants.length === 0 ? (
                                <p className="text-slate-400 text-[11px] bg-slate-50 p-4 rounded-xl text-center">Aucun suivi enfant 1000 jours enregistré.</p>
                              ) : (
                                <div className="space-y-2">
                                  {dossierAscq.enfants.map((enf: any) => (
                                    <div key={enf.id} className="p-3 bg-white rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900">{enf.prenoms} {enf.nom}</span>
                                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                            PB: {enf.perimetre_brachial_mm || "?"} mm
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                          Village : {enf.village_nom || "-"} • Vaccins : {enf.statut_vaccinal || "Non renseigné"}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setFicheAffichee({ type: "ENFANTS_1000J", donnees: enf, ascq: selectedAscq })}
                                        className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 3. SOUS-ONGLET : RÉFÉRENCES CS & GUPS */}
                        {dossierSubTab === "REFERENCES" && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between pb-1">
                              <h4 className="font-extrabold text-slate-900 text-xs">🚑 Références & Évacuations vers CS / GUPS</h4>
                              <span className="text-[10px] text-slate-500">{dossierAscq.references.length} références</span>
                            </div>
                            {dossierAscq.references.length === 0 ? (
                              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 text-slate-400">
                                Aucune évacuation ou référence enregistrée.
                              </div>
                            ) : (
                              dossierAscq.references.map((r: any) => (
                                <div key={r.id} className="p-3 bg-white rounded-2xl border border-red-100 shadow-sm flex items-center justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-slate-900">{r.motif_reference || "Urgence médicale"}</span>
                                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                                        Urgence : {r.degre_urgence || "Moyenne"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      Destination : <strong>{r.centre_sante_destination || "Centre de Santé"}</strong> • Date : {r.date_reference || new Date(r.created_at).toLocaleDateString("fr-FR")}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setFicheAffichee({ type: "REFERENCES", donnees: r, ascq: selectedAscq })}
                                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 font-bold"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {/* 4. SOUS-ONGLET : RAPPORTS RMA & PNSC */}
                        {dossierSubTab === "RAPPORTS" && (
                          <div className="space-y-3">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                              <h4 className="font-bold text-slate-900 flex items-center justify-between">
                                <span>📊 Rapports Mensuels d'Activités (RMA)</span>
                                <span className="text-[10px] text-slate-500">{dossierAscq.rma.length} trouvés</span>
                              </h4>
                              {dossierAscq.rma.length === 0 ? (
                                <p className="text-slate-400 text-[11px]">Aucun rapport mensuel déposé.</p>
                              ) : (
                                <div className="space-y-2">
                                  {dossierAscq.rma.map((r: any) => (
                                    <div key={r.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-extrabold text-slate-900">Mois {r.mois} / {r.annee}</span>
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            r.statut === "VALIDE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                                          }`}>
                                            {r.statut === "VALIDE" ? "✅ Validé" : "⏳ En attente de validation"}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                          Déposé le {new Date(r.created_at).toLocaleDateString("fr-FR")}
                                          {r.date_validation && ` • Validé le ${new Date(r.date_validation).toLocaleDateString("fr-FR")}`}
                                        </p>
                                        <div className="text-[10px] text-slate-600 mt-1 flex flex-wrap gap-2">
                                          <span>VAD : <strong>{r.total_visites_domiciliaires || 0}</strong></span>
                                          <span>Causeries : <strong>{r.total_seances_sensibilisation || 0}</strong></span>
                                          <span>Femmes : <strong>{r.femmes_enceintes_suivies || 0}</strong></span>
                                          <span>Enfants : <strong>{r.enfants_0_59_mois_suivis || 0}</strong></span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => setFicheAffichee({ type: "RMA", donnees: r, ascq: selectedAscq })}
                                          className="py-1 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[11px] flex items-center gap-1"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>Consulter</span>
                                        </button>

                                        {isRepresentantCommunal && (
                                          <>
                                            {r.statut !== "VALIDE" && (
                                              <button
                                                type="button"
                                                disabled={actionInProgress === r.id}
                                                onClick={() => handleValiderRma(r.id)}
                                                className="py-1 px-2 rounded-lg bg-[#005c30] hover:bg-[#004724] text-white font-bold text-[11px] flex items-center gap-1 transition-all"
                                              >
                                                {actionInProgress === r.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                                <span>Valider</span>
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => setEditingRma(r)}
                                              className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all"
                                            >
                                              Modifier
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                              <h4 className="font-bold text-slate-900 flex items-center justify-between">
                                <span>📋 Rapports Hebdomadaires PNSC</span>
                                <span className="text-[10px] text-slate-500">{dossierAscq.hebdo.length} trouvés</span>
                              </h4>
                              {dossierAscq.hebdo.length === 0 ? (
                                <p className="text-slate-400 text-[11px]">Aucun rapport hebdomadaire PNSC déposé.</p>
                              ) : (
                                <div className="space-y-2">
                                  {dossierAscq.hebdo.map((h: any) => (
                                    <div key={h.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900">Semaine {h.semaine} / {h.annee}</span>
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            h.statut === "VALIDE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                                          }`}>
                                            {h.statut === "VALIDE" ? "✅ Validé" : "⏳ Soumis"}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                          GAP RH : <strong>{h.rh_gap ?? 0}</strong> • Moto : <strong>{h.motos_gap ?? 0}</strong> • Forfait : <strong>{h.forfait_internet_recu ? "Reçu" : "Non reçu"}</strong>
                                        </p>
                                      </div>

                                      {isRepresentantCommunal && h.statut !== "VALIDE" && (
                                        <button
                                          type="button"
                                          disabled={actionInProgress === h.id}
                                          onClick={() => handleValiderHebdoPnsc(h.id)}
                                          className="py-1 px-2.5 rounded-lg bg-[#005c30] hover:bg-[#004724] text-white font-bold text-[11px] flex items-center gap-1 self-end sm:self-auto shrink-0 transition-all"
                                        >
                                          {actionInProgress === h.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                          <span>Valider</span>
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 5. SOUS-ONGLET : ALERTES SIMR & DÉCÈS */}
                        {dossierSubTab === "SIMR" && (
                          <div className="space-y-2">
                            <h4 className="font-extrabold text-slate-900 text-xs">🚨 Alertes Épidémiologiques & Décès Communautaires</h4>
                            {dossierAscq.alertes.length === 0 && dossierAscq.deces.length === 0 ? (
                              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                                Aucune alerte ni aucun décès notifié par cet agent.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {dossierAscq.alertes.map((al: any) => (
                                  <div key={al.id} className="p-3 bg-white rounded-xl border border-purple-100 shadow-sm flex items-center justify-between">
                                    <div>
                                      <span className="font-bold text-slate-900">{al.type_alerte_nom} (Sem. {al.semaine_epidemio})</span>
                                      <p className="text-[10px] text-slate-500">Notifié le {al.date_notification} • Délai: {al.delai_detection_notification_heures}h</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setFicheAffichee({ type: "ALERTES", donnees: al, ascq: selectedAscq })}
                                      className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}

                                {dossierAscq.deces.map((d: any) => (
                                  <div key={d.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div>
                                      <span className="font-bold text-slate-900">{d.type_deces_nom} ({d.village || "-"})</span>
                                      <p className="text-[10px] text-slate-500">Défunt : {d.defunt_nom_prenom || "Non précisé"} • Date: {d.date_notification}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setFicheAffichee({ type: "DECES", donnees: d, ascq: selectedAscq })}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 6. SOUS-ONGLET : RELAIS COMMUNAUTAIRES */}
                        {dossierSubTab === "RELAIS" && (
                          <div className="space-y-2">
                            <h4 className="font-extrabold text-slate-900 text-xs">👥 Relais Communautaires (RC) sous la responsabilité de cet ASCQ</h4>
                            {dossierAscq.relais.length === 0 ? (
                              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                                Aucun Relais Communautaire enrôlé.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {dossierAscq.relais.map((rc: any) => (
                                  <div key={rc.id} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
                                    <p className="font-black text-slate-900">{rc.nom} {rc.prenoms}</p>
                                    <p className="text-[11px] text-slate-500">Village : <strong>{rc.village_nom || "Non affecté"}</strong></p>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                                      <span>Tél :</span>
                                      <BeninPhoneAction telephone={rc.telephone} variant="compact" />
                                    </div>
                                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                      Enrôlé & Actif
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 7. SOUS-ONGLET : PLANNINGS & ACTIVITÉS */}
                        {dossierSubTab === "PLANNING" && (
                          <div className="space-y-2">
                            <h4 className="font-extrabold text-slate-900 text-xs">📅 Activités Menées et Plannings de l'ASCQ</h4>
                            {dossierAscq.activites.length === 0 ? (
                              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                                Aucune activité enregistrée.
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {dossierAscq.activites.map((a: any) => (
                                  <div key={a.id} className="p-2.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between">
                                    <div>
                                      <span className="font-bold text-slate-900">{a.titre_activite}</span>
                                      <p className="text-[10px] text-slate-500">Date : {a.date_activite} • Type : {a.type_activite || "Terrain"}</p>
                                    </div>
                                    <span className="text-slate-400 text-[10px] font-bold">Enregistré</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions Cadre directes sur cet ASCQ & Pied */}
                  <div className="p-3.5 bg-emerald-50/70 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-[#005c30] font-bold">Action hiérarchique sur cet ASCQ :</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSuggestionAscqId(selectedAscq.id);
                          setSelectedAscq(null);
                          setActiveTab("suggestions");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Suggérer une modification</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMissionAscqId(selectedAscq.id);
                          setMissionCibleType("ASCQ_SPECIFIQUE");
                          setMissionSubMode("MISSION");
                          setSelectedAscq(null);
                          setActiveTab("alertes_missions");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Target className="w-3.5 h-3.5" />
                        <span>Missionner cet agent</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedAscq(null)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 font-bold text-xs rounded-xl"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 3 : TOUTES LES FICHES & REGISTRES DU TERRITOIRE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "fiches_territoire" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-emerald-700" />
                    <span>Registre Central des Fiches du Territoire</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consultez toutes les fiches d'activité et dossiers cliniques remplis par les ASCQ de votre périmètre territorial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={chargerRegistreFichesTerritoire}
                  disabled={loadingRegistre}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 self-start sm:self-auto transition-all shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingRegistre ? "animate-spin text-[#005c30]" : ""}`} />
                  <span>Actualiser le registre</span>
                </button>
              </div>

              {/* Filtres par module */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
                {[
                  { id: "TOUT", label: "Toutes les fiches" },
                  { id: "ICCM", label: "🩺 Soins iCCM" },
                  { id: "MATERNITE", label: "🤰 Maternité" },
                  { id: "ENFANTS_1000J", label: "👶 1000 Jours" },
                  { id: "REFERENCES", label: "🚑 Références CS" },
                  { id: "ALERTES", label: "🚨 Alertes SIMR" },
                  { id: "DECES", label: "⚰️ Décès" },
                  { id: "RMA", label: "📊 Rapports RMA" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltreTypeFiche(f.id)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                      filtreTypeFiche === f.id
                        ? "bg-[#005c30] text-white shadow-sm font-black"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Barre de recherche */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom de patient, village, nom d'ASCQ, diagnostic..."
                  value={rechercheRegistre}
                  onChange={(e) => setRechercheRegistre(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Liste des fiches */}
              <div className="space-y-2 pt-1">
                {loadingRegistre ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30] mb-2" />
                    Chargement du registre des fiches du territoire...
                  </div>
                ) : (
                  (() => {
                    const fichesFiltrees = registreFiches.filter((item) => {
                      if (filtreTypeFiche !== "TOUT" && item.type !== filtreTypeFiche) return false;
                      if (!rechercheRegistre.trim()) return true;
                      const q = rechercheRegistre.toLowerCase();
                      return (
                        item.titre?.toLowerCase().includes(q) ||
                        item.sousTitre?.toLowerCase().includes(q) ||
                        item.ascqNom?.toLowerCase().includes(q) ||
                        item.typeLibelle?.toLowerCase().includes(q)
                      );
                    });

                    if (fichesFiltrees.length === 0) {
                      return (
                        <div className="py-12 text-center bg-slate-50/80 rounded-2xl border border-slate-200/80 text-slate-400 text-xs">
                          Aucune fiche trouvée correspondant à vos critères de recherche.
                        </div>
                      );
                    }

                    return fichesFiltrees.map((item) => (
                      <div
                        key={`${item.type}_${item.id}`}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${item.badgeColor}`}>
                              {item.typeLibelle}
                            </span>
                            <span className="font-extrabold text-slate-900 text-sm">{item.titre}</span>
                            {item.decision && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.decisionBadge || "bg-slate-100 text-slate-700"}`}>
                                {item.decision}
                              </span>
                            )}
                          </div>

                          <p className="text-slate-600 text-[11px]">{item.sousTitre}</p>

                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                            <span>ASCQ : <strong className="text-slate-700">{item.ascqNom}</strong></span>
                            <span>•</span>
                            <span>Date : <strong>{new Date(item.dateFiche).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setFicheAffichee({ type: item.type, donnees: item.raw, ascq: { id: item.ascqId, nom: item.ascqNom } })}
                            className="py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Consulter</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSuggestionAscqId(item.ascqId);
                              setSuggestionModule(item.type);
                              setSuggestionTitre(`Remarque sur ${item.typeLibelle} (${item.titre})`);
                              setActiveTab("suggestions");
                            }}
                            className="py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-all"
                            title="Suggérer une remarque sur cette fiche"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Remarque</span>
                          </button>
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 3 : VALIDATION DES INSCRIPTIONS ASCQ DU PERIMETRE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "inscriptions_ascq" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] uppercase border border-amber-300">
                    Validation Communale Obligatoire
                  </span>
                </div>
                <h2 className="text-base font-black text-slate-900 mt-1">
                  Inscriptions d'ASCQ en attente de validation ({inscriptionsEnAttente.length})
                </h2>
                <p className="text-xs text-slate-500">
                  En tant que Représentant Communal, vous examinez et validez les inscriptions des nouveaux ASCQ de votre commune avant qu'ils ne puissent se connecter.
                </p>
              </div>

              <button
                type="button"
                onClick={() => chargerInscriptionsEnAttente(currentUser)}
                disabled={loadingInscriptions}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingInscriptions ? "animate-spin text-[#005c30]" : ""}`} />
                <span>Actualiser</span>
              </button>
            </div>

            {loadingInscriptions ? (
              <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30] mb-2" />
                Chargement des inscriptions en attente...
              </div>
            ) : inscriptionsEnAttente.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Aucune inscription en attente dans votre périmètre
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Tous les agents de santé communautaire qualifiés de votre commune ont été validés ou aucune nouvelle inscription n'a été soumise.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {inscriptionsEnAttente.map((agent: any) => (
                  <div key={agent.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-slate-900">
                            {agent.nom} {agent.prenoms}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                            En attente
                          </span>
                        </div>
                        <div className="mt-1">
                          <BeninPhoneAction telephone={agent.telephone} variant="button-group" />
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(agent.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1 text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Arrondissement :</span>
                        <span className="font-bold">{agent.arrondissement_nom}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Poste demandé :</span>
                        <span className="font-bold text-emerald-800">Agent de Santé Communautaire (ASCQ)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={actionInProgress === agent.id}
                        onClick={() => handleValiderAscq(agent.id, `${agent.nom} ${agent.prenoms}`)}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        {actionInProgress === agent.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Valider l'ASCQ</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionInProgress === agent.id}
                        onClick={() => handleRejeterAscq(agent.id, `${agent.nom} ${agent.prenoms}`)}
                        className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-all"
                      >
                        Rejeter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 4 : SUGGESTIONS DE MODIFICATION & REMARQUES SUR LES FICHES */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "suggestions" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] uppercase border border-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Prérogative de Suivi & Régulation</span>
                  </span>
                </div>
                <h2 className="text-base font-black text-slate-900 mt-1">
                  Suggestions de Modification & Observations Sanitaires
                </h2>
                <p className="text-xs text-slate-500">
                  En tant que responsable de santé, vous observez les rapports et fiches des ASCQ de votre périmètre ({libelleTerritoire}). Vous pouvez leur notifier des demandes de correction chiffrée, des précisions ou des rappels protocolaires.
                </p>
              </div>

              <button
                type="button"
                onClick={chargerSuggestions}
                disabled={loadingSuggestions}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSuggestions ? "animate-spin text-[#005c30]" : ""}`} />
                <span>Actualiser le registre</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Formulaire de formulation d'une remarque */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="font-extrabold text-sm text-slate-900">Formuler une Remarque / Correction</h3>
                </div>

                <form onSubmit={handleCreerSuggestion} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ASCQ Destinataire *</label>
                    <select
                      value={suggestionAscqId}
                      onChange={(e) => setSuggestionAscqId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                    >
                      <option value="">-- Choisir un ASCQ du périmètre ({ascqs.length}) --</option>
                      {ascqs.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.nom} {a.prenoms} ({a.arrondissement_nom || "Arrondissement"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Module / Document *</label>
                      <select
                        value={suggestionModule}
                        onChange={(e) => setSuggestionModule(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                      >
                        <option value="RMA">Rapport Mensuel (RMA)</option>
                        <option value="PNSC_HEBDO">Suivi PNSC Hebdo</option>
                        <option value="SIMR_ALERTE">Fiche SIMR / Décès</option>
                        <option value="PLANNING_ACTIVITES">Planning & Activités</option>
                        <option value="MATERNITE_1000J">Maternité & 1000 Jours</option>
                        <option value="PEC_SOINS">Prise en charge iCCM</option>
                        <option value="AUTRE">Autre observation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Type d'Intervention *</label>
                      <select
                        value={suggestionType}
                        onChange={(e) => setSuggestionType(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                      >
                        <option value="CORRECTION_DEMANDEE">✏️ Correction de chiffres</option>
                        <option value="PRECISION_REQUISE">❓ Justification requise</option>
                        <option value="RAPPEL_PROTOCOLE">📋 Rappel protocole</option>
                        <option value="OBSERVATION">💬 Observation générale</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Objet de la Remarque *</label>
                    <input
                      type="text"
                      placeholder="Ex : Incohérence entre VAD déclarées et plannings des RC..."
                      value={suggestionTitre}
                      onChange={(e) => setSuggestionTitre(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Instructions détaillées pour l'ASCQ *</label>
                    <textarea
                      rows={4}
                      placeholder="Précisez les lignes à modifier, les vérifications à faire auprès des relais du village ou les règles à appliquer..."
                      value={suggestionMessage}
                      onChange={(e) => setSuggestionMessage(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingSuggestion}
                    className="w-full py-2.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {submittingSuggestion ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{submittingSuggestion ? "Transmission en cours..." : "Notifier l'ASCQ de cette remarque"}</span>
                  </button>
                </form>
              </div>

              {/* Registre des suggestions émises */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#005c30]" />
                    <h3 className="font-extrabold text-sm text-slate-900">Historique des Observations Émises</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono font-bold">
                    {suggestionsList.length} observation(s)
                  </span>
                </div>

                {loadingSuggestions ? (
                  <div className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30] mb-2" />
                    Chargement des observations...
                  </div>
                ) : suggestionsList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-600">Aucune observation émise récemment</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Utilisez le formulaire pour faire part de vos recommandations ou remarques aux ASCQ de votre périmètre.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {suggestionsList.map((s: any) => (
                      <div key={s.id} className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 transition-all">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900">
                              {s.ascq ? `${s.ascq.nom} ${s.ascq.prenoms}` : "Agent ASCQ"}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                              {s.module_concerne || "Rapport"}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                              {s.type_suggestion === "CORRECTION_DEMANDEE" ? "✏️ Correction demandée" :
                               s.type_suggestion === "PRECISION_REQUISE" ? "❓ Précision requise" :
                               s.type_suggestion === "RAPPEL_PROTOCOLE" ? "📋 Rappel protocole" : "💬 Observation"}
                            </span>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.statut === "CLOTURE" ? "bg-slate-200 text-slate-700" :
                            s.statut === "PRIS_EN_COMPTE" ? "bg-emerald-100 text-emerald-800" :
                            "bg-amber-100 text-amber-800"
                          }`}>
                            {s.statut === "CLOTURE" ? "🔒 Clôturé" :
                             s.statut === "PRIS_EN_COMPTE" ? "✅ Pris en compte" : "⏳ Transmis à l'ASCQ"}
                          </span>
                        </div>

                        <p className="font-bold text-slate-800 text-xs">
                          {s.titre}
                        </p>
                        <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-3">
                          {s.message}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono border-t border-slate-200/60 mt-1">
                          <span>Émis le {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          {s.reponse_ascq && (
                            <span className="text-emerald-700 font-bold">Réponse ASCQ reçue</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 5 : ALERTES SANITAIRES & ORDRES DE MISSION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "alertes_missions" && (
          <div className="space-y-4">
            {/* Bascule Volet Alertes vs Volet Ordres de mission */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                  Direction Opérationnelle de Santé
                </span>
                <h2 className="text-base font-black text-slate-900 mt-1">
                  Alertes Territoriales & Ordres de Mission de Terrain
                </h2>
                <p className="text-xs text-slate-500">
                  Périmètre d'action : <strong>{libelleTerritoire}</strong> ({ascqs.length} agents de santé communautaire qualifiés rattachés).
                </p>
              </div>

              <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setMissionSubMode("MISSION")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                    missionSubMode === "MISSION"
                      ? "bg-[#005c30] text-white shadow-sm font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>🎯 Ordres de Mission</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMissionSubMode("ALERTE")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                    missionSubMode === "ALERTE"
                      ? "bg-red-600 text-white shadow-sm font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>🚨 Alerte Sanitaire</span>
                </button>
              </div>
            </div>

            {/* VOLET A : ORDRES DE MISSION / CONSIGNES DE TERRAIN */}
            {missionSubMode === "MISSION" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Formulaire émission ordre de mission */}
                <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <Target className="w-4 h-4 text-[#005c30]" />
                    <h3 className="font-extrabold text-sm text-slate-900">Assigner une Mission de Terrain</h3>
                  </div>

                  <form onSubmit={handleCreerOrdreMission} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Cible de la mission *</label>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setMissionCibleType("TOUS_ASCQ")}
                          className={`py-2 px-2 rounded-xl border text-center font-bold text-[11px] transition-all ${
                            missionCibleType === "TOUS_ASCQ"
                              ? "bg-[#005c30] text-white border-[#004724]"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          👥 Tout le territoire ({ascqs.length} ASCQ)
                        </button>
                        <button
                          type="button"
                          onClick={() => setMissionCibleType("ASCQ_SPECIFIQUE")}
                          className={`py-2 px-2 rounded-xl border text-center font-bold text-[11px] transition-all ${
                            missionCibleType === "ASCQ_SPECIFIQUE"
                              ? "bg-[#005c30] text-white border-[#004724]"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          👤 ASCQ spécifique
                        </button>
                      </div>

                      {missionCibleType === "ASCQ_SPECIFIQUE" && (
                        <select
                          value={missionAscqId}
                          onChange={(e) => setMissionAscqId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                        >
                          <option value="">-- Sélectionner l'ASCQ à missionner --</option>
                          {ascqs.map((a: any) => (
                            <option key={a.id} value={a.id}>
                              {a.nom} {a.prenoms} ({a.arrondissement_nom || "Arrondissement"})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Type de Mission *</label>
                        <select
                          value={missionType}
                          onChange={(e) => setMissionType(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                        >
                          <option value="INVESTIGATION">🔍 Investigation de foyer</option>
                          <option value="RATISSAGE_VACCINAL">💉 Ratissage vaccinal</option>
                          <option value="SUPERVISION_RELAIS">👥 Supervision des RC</option>
                          <option value="SENSIBILISATION">📢 Sensibilisation ciblée</option>
                          <option value="AUDIT_DECES">⚠️ Audit de décès</option>
                          <option value="AUTRE">📌 Directive de terrain</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Date d'Échéance</label>
                        <input
                          type="date"
                          value={missionDateEcheance}
                          onChange={(e) => setMissionDateEcheance(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Priorité *</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["NORMALE", "HAUTE", "URGENTE"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setMissionPriorite(p)}
                            className={`py-1.5 px-2 rounded-xl border text-center font-bold text-[11px] transition-all ${
                              missionPriorite === p
                                ? p === "URGENTE" ? "bg-red-500 text-white border-red-600" : "bg-[#005c30] text-white border-[#004724]"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            {p === "URGENTE" ? "🚨 Urgente" : p === "HAUTE" ? "⚠️ Haute" : "ℹ️ Normale"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Intitulé de la Mission *</label>
                      <input
                        type="text"
                        placeholder="Ex : Recherche active des enfants zéro dose ou perdus de vue..."
                        value={missionTitre}
                        onChange={(e) => setMissionTitre(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Directives Opérationnelles & Livrables *</label>
                      <textarea
                        rows={4}
                        placeholder="Détaillez les villages cibles, la méthode d'intervention, le rôle attendu des Relais et les chiffres à rapporter..."
                        value={missionDirectives}
                        onChange={(e) => setMissionDirectives(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingMission}
                      className="w-full py-2.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {submittingMission ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                      <span>{submittingMission ? "Diffusion en cours..." : "Transmettre l'Ordre de Mission"}</span>
                    </button>
                  </form>
                </div>

                {/* Historique des missions */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#005c30]" />
                      <h3 className="font-extrabold text-sm text-slate-900">Missions & Consignes Transmises</h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono font-bold">
                      {missionsList.length} mission(s)
                    </span>
                  </div>

                  {loadingMissions ? (
                    <div className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30] mb-2" />
                      Chargement des missions...
                    </div>
                  ) : missionsList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <Target className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-600">Aucun ordre de mission émis</p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Assignez une consigne ou un ordre de mission de terrain aux agents de votre territoire.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {missionsList.map((m: any) => (
                        <div key={m.id} className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 transition-all">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900">
                                {m.cible_type === "TOUS_ASCQ" || !m.ascq_cible_id
                                  ? "👥 Tous les ASCQ du territoire"
                                  : m.ascq ? `👤 ${m.ascq.nom} ${m.ascq.prenoms}` : "👤 Agent ciblé"}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                m.priorite === "URGENTE" ? "bg-red-100 text-red-800" :
                                m.priorite === "HAUTE" ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-900"
                              }`}>
                                {m.priorite}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                                {m.type_mission || "Mission"}
                              </span>
                            </div>

                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              {m.statut || "TRANSMIS"}
                            </span>
                          </div>

                          <p className="font-bold text-slate-800 text-xs">
                            {m.titre}
                          </p>
                          <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-3">
                            {m.directives || m.message}
                          </p>

                          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono border-t border-slate-200/60 mt-1">
                            <span>Émis le {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                            {m.date_echeance && (
                              <span className="text-amber-800 font-bold">Échéance : {m.date_echeance}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VOLET B : ALERTE SANITAIRE TERRITORIALE */}
            {missionSubMode === "ALERTE" && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 max-w-xl mx-auto text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-red-800 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-300">
                    Alerte Sanitaire Officielle
                  </span>
                  <h2 className="text-base font-black text-slate-900">
                    Diffuser une Alerte Sanitaire Prioritaire
                  </h2>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Transmettez instantanément une notification prioritaire de vigilance ou de riposte épidémiologique à l'ensemble des {ascqs.length} ASCQ de votre périmètre ({libelleTerritoire}).
                  </p>
                </div>

                <form onSubmit={handleDiffuserAlerte} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Niveau d'Urgence *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["NORMALE", "HAUTE", "URGENTE"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setAlertePriorite(p)}
                          className={`py-2 px-2 rounded-xl border text-center font-bold text-[11px] transition-all ${
                            alertePriorite === p
                              ? p === "URGENTE" ? "bg-red-500 text-white border-red-600" : "bg-[#005c30] text-white border-[#004724]"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {p === "URGENTE" ? "🚨 Urgente" : p === "HAUTE" ? "⚠️ Haute" : "ℹ️ Normale"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Objet / Pathologie Cible *</label>
                    <input
                      type="text"
                      placeholder="Ex : Alerte Choléra / Rougeole - Signalement cas suspects immédiat..."
                      value={alerteTitre}
                      onChange={(e) => setAlerteTitre(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Directive ou Consigne Sanitaire *</label>
                    <textarea
                      rows={4}
                      placeholder="Détaillez la définition de cas, la conduite à tenir, les mesures barrières et consignes pour les ASCQ et Relais..."
                      value={alerteMessage}
                      onChange={(e) => setAlerteMessage(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingAlerte}
                    className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {sendingAlerte ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{sendingAlerte ? "Diffusion en cours..." : "Diffuser immédiatement l'Alerte Sanitaire"}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 4 : EXPORTS ET JOURNAL D'AUDIT OBLIGATOIRE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "exports_journal" && (
          <div className="space-y-4">
            
            {/* Centre d'Exports Officiels */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Centre d'Exports Téléchargeables
                </h3>
                <p className="text-xs text-slate-500">
                  Formats conformes : Excel, CSV (point-virgule et encodage UTF-8 avec BOM), et PDF officiel. Tout export hors périmètre est formellement bloqué.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs">📊 Compilation Sanitaire Territoriale</h4>
                  <p className="text-[11px] text-slate-500">Totaux compilés par commune/arrondissement avec anonymisation des petits effectifs (&lt; 5).</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button type="button" onClick={() => executerExportCompilé("EXCEL")} className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs">Excel</button>
                    <button type="button" onClick={() => executerExportCompilé("CSV")} className="px-3 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-xs">CSV (BOM)</button>
                    <button type="button" onClick={() => executerExportCompilé("PDF")} className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-xs">PDF</button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs">👥 Liste et Ponctualité du Personnel ASCQ</h4>
                  <p className="text-[11px] text-slate-500">Répertoire des agents avec suivi des dépôts de rapports mensuels.</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button type="button" onClick={() => executerExportAscq("EXCEL")} className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs">Excel</button>
                    <button type="button" onClick={() => executerExportAscq("CSV")} className="px-3 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-xs">CSV (BOM)</button>
                    <button type="button" onClick={() => executerExportAscq("PDF")} className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-xs">PDF</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Journal d'Audit Obligatoire */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#005c30]" />
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Journal d'Audit des Exports Réalisés
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={chargerJournalExports}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                >
                  Rafraîchir
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-black">
                      <th className="py-2.5 px-3">Date & Heure</th>
                      <th className="py-2.5 px-3">Type d'Export</th>
                      <th className="py-2.5 px-3">Format</th>
                      <th className="py-2.5 px-3">Territoire Cible</th>
                      <th className="py-2.5 px-3 text-right">Lignes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {journalExports.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Aucun export n'a encore été enregistré dans votre journal.
                        </td>
                      </tr>
                    ) : (
                      journalExports.map((j: any) => (
                        <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-slate-500 font-mono">
                            {new Date(j.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{j.type_export}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-800">
                              {j.format_export}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{j.territoire_nom}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-800">{j.nb_lignes}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* MODAL NETTOYAGE DE DONNEE ERRONEE */}
        {modalNettoyageDonnee && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b pb-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Nettoyage d'une Donnée Erronée
                  </h3>
                  <p className="text-xs text-slate-500">
                    Module : {modalNettoyageDonnee.record.typeLibelle || modalNettoyageDonnee.record.type}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Traçabilité & Audit</span>
                </p>
                <p>
                  Élément ciblé : <strong>{modalNettoyageDonnee.record.titre || "Fiche sélectionnée"}</strong>
                </p>
                <p className="text-[11px] text-amber-700">
                  Cette donnée sera supprimée des registres actifs mais conservée dans le journal d'audit de nettoyage au nom de votre profil de supervision.
                </p>
              </div>

              <form onSubmit={handleConfirmerNettoyageDonnee} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Motif du nettoyage *
                  </label>
                  <select
                    value={motifNettoyage}
                    onChange={(e) => setMotifNettoyage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-rose-500"
                    required
                  >
                    <option value="DONNEE_TEST">Donnée de test / Saisie fictive d'entraînement</option>
                    <option value="DOUBLON">Doublon de déclaration (déjà enregistrée)</option>
                    <option value="ERREUR_CIBLE">Erreur manifeste de cible ou hors territoire</option>
                    <option value="FAUSSE_ALERTE">Fausse alerte confirmée après investigation</option>
                    <option value="SAISIE_ERRONEE">Saisie incomplète ou informations erronées</option>
                    <option value="AUTRE">Autre motif justifié</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Explication & Justification de terrain
                  </label>
                  <textarea
                    value={explicationNettoyage}
                    onChange={(e) => setExplicationNettoyage(e.target.value)}
                    placeholder="Précisez le contexte du constat d'erreur ou la concertation avec l'agent..."
                    rows={3}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setModalNettoyageDonnee(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingNettoyage}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submittingNettoyage ? "Nettoyage en cours..." : "Confirmer le nettoyage"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL RADIATION ASCQ */}
        {modalRadiationAscq && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b pb-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Radier un ASCQ (Fin de fonction)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalRadiationAscq.nom} {modalRadiationAscq.prenoms} ({modalRadiationAscq.arrondissement_nom || "Arrondissement"})
                  </p>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-900">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Conséquence de la radiation</span>
                </p>
                <p>
                  L'accès de cet agent à l'application sera bloqué avec mention du motif de fin de fonction. Son compte est archivé dans le statut <strong>RADIÉ</strong>.
                </p>
              </div>

              <form onSubmit={handleConfirmerRadiationAscq} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Motif officiel de radiation *
                  </label>
                  <select
                    value={motifRadiation}
                    onChange={(e) => setMotifRadiation(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-rose-500"
                    required
                  >
                    <option value="FIN_CONTRAT">Fin de contrat / Mission achevée</option>
                    <option value="DEMISSION">Démission volontaire</option>
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
                    value={explicationRadiation}
                    onChange={(e) => setExplicationRadiation(e.target.value)}
                    placeholder="Numéro de note de service, date de passation, observations..."
                    rows={3}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setModalRadiationAscq(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRadiation}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submittingRadiation ? "Radiation en cours..." : "Confirmer la radiation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL SUPPRESSION DEFINITIVE COMPTE ASCQ */}
        {modalSuppressionAscq && (
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
                    {modalSuppressionAscq.nom} {modalSuppressionAscq.prenoms} ({modalSuppressionAscq.telephone})
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

              <form onSubmit={handleConfirmerSuppressionAscq} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Pour confirmer, tapez le mot <strong className="text-red-700">SUPPRIMER</strong> ci-dessous :
                  </label>
                  <input
                    type="text"
                    value={confirmSuppressionTexte}
                    onChange={(e) => setConfirmSuppressionTexte(e.target.value)}
                    placeholder="SUPPRIMER"
                    className="w-full p-2.5 rounded-xl border border-red-300 font-black tracking-widest text-center focus:ring-2 focus:ring-red-500 uppercase"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setModalSuppressionAscq(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSuppression || confirmSuppressionTexte !== "SUPPRIMER"}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40"
                  >
                    {submittingSuppression ? "Suppression..." : "Supprimer définitivement"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CORRECTION / VALIDATION DE RMA PAR LE REPRESENTANT COMMUNAL */}
        {editingRma && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                      Supervision Communale
                    </span>
                  </div>
                  <h3 className="font-black text-sm text-slate-900">
                    Modifier / Corriger le RMA (Mois {editingRma.mois} / {editingRma.annee})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Agent supervisé : {selectedAscq?.nom} {selectedAscq?.prenoms}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setEditingRma(null)} 
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRmaModifications} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Total VAD Réalisées</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRma.total_visites_domiciliaires ?? 0}
                      onChange={(e) => setEditingRma({ ...editingRma, total_visites_domiciliaires: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Séances de Causerie</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRma.total_seances_sensibilisation ?? 0}
                      onChange={(e) => setEditingRma({ ...editingRma, total_seances_sensibilisation: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Femmes Enceintes Suivies</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRma.femmes_enceintes_suivies ?? 0}
                      onChange={(e) => setEditingRma({ ...editingRma, femmes_enceintes_suivies: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Enfants 0-59 mois Suivis</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRma.enfants_0_59_mois_suivis ?? 0}
                      onChange={(e) => setEditingRma({ ...editingRma, enfants_0_59_mois_suivis: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Visa & Observations du Représentant Communal</label>
                  <textarea
                    rows={3}
                    placeholder="Saisissez vos observations, validations ou corrections supervisées..."
                    value={editingRma.observations_validation || ""}
                    onChange={(e) => setEditingRma({ ...editingRma, observations_validation: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingRma}
                    className="flex-1 py-2.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {savingRma ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Enregistrer et Valider le RMA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRma(null)}
                    className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* MODAL OFFICIEL DE CONSULTATION DE FICHE (SUPERVISION EN LECTURE SEULE) */}
        {ficheAffichee && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-xs">
              
              {/* En-tête officiel */}
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#005c30] text-[10px] font-black uppercase tracking-wide border border-emerald-300">
                      Supervision Officielle • Lecture Seule
                    </span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    {ficheAffichee.type === "ICCM" && `Fiche Consultation iCCM : ${ficheAffichee.donnees.prenoms_patient} ${ficheAffichee.donnees.nom_patient}`}
                    {ficheAffichee.type === "MATERNITE" && `Fiche Maternité : ${ficheAffichee.donnees.prenoms} ${ficheAffichee.donnees.nom}`}
                    {ficheAffichee.type === "ENFANTS_1000J" && `Fiche Enfant 1000 Jours : ${ficheAffichee.donnees.prenoms || ""} ${ficheAffichee.donnees.nom || ""}`}
                    {ficheAffichee.type === "REFERENCES" && `Fiche Référence CS / GUPS : ${ficheAffichee.donnees.motif_reference || "Urgence"}`}
                    {ficheAffichee.type === "ALERTES" && `Notification Alerte SIMR : ${ficheAffichee.donnees.type_alerte_nom}`}
                    {ficheAffichee.type === "DECES" && `Notification Décès Communautaire : ${ficheAffichee.donnees.type_deces_nom}`}
                    {ficheAffichee.type === "RMA" && `Rapport Mensuel d'Activité (Mois ${ficheAffichee.donnees.mois} / ${ficheAffichee.donnees.annee})`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Agent responsable : <strong>{ficheAffichee.ascq?.nom || "ASCQ"}</strong> • Village/Aire : <strong>{ficheAffichee.donnees.village || ficheAffichee.donnees.village_nom || "Territoire"}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFicheAffichee(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corps de la fiche */}
              <div className="p-5 overflow-y-auto space-y-3.5 max-h-[65vh]">
                
                {/* 1. FICHE ICCM */}
                {ficheAffichee.type === "ICCM" && (
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 text-xs">Identité de l'Enfant</h4>
                      <div className="grid grid-cols-2 gap-2 text-slate-700 text-[11px]">
                        <p>Nom & Prénoms : <strong>{ficheAffichee.donnees.prenoms_patient} {ficheAffichee.donnees.nom_patient}</strong></p>
                        <p>Âge : <strong>{ficheAffichee.donnees.age_valeur} {ficheAffichee.donnees.age_unite || "ans"}</strong> (Sexe: {ficheAffichee.donnees.sexe})</p>
                        <p>Village : <strong>{ficheAffichee.donnees.village}</strong></p>
                        <p>Parent / Tuteur : <strong>{ficheAffichee.donnees.nom_parent_tuteur || "Non précisé"}</strong></p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>Téléphone :</span>
                          {ficheAffichee.donnees.telephone_contact ? (
                            <BeninPhoneAction telephone={ficheAffichee.donnees.telephone_contact} variant="compact" />
                          ) : (
                            <strong>Aucun</strong>
                          )}
                        </div>
                        <p>Date : <strong>{ficheAffichee.donnees.date_consultation}</strong></p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 text-xs">Signes Cliniques & Dépistage</h4>
                      <p className="text-slate-700">Signe principal : <strong className="text-slate-900">{ficheAffichee.donnees.signe_principal}</strong></p>
                      {ficheAffichee.donnees.signes_secondaires && ficheAffichee.donnees.signes_secondaires.length > 0 && (
                        <p className="text-slate-600">Signes secondaires : {ficheAffichee.donnees.signes_secondaires.join(", ")}</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-bold">Test TDR Paludisme :</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] ${
                          ficheAffichee.donnees.tdr_paludisme === "POSITIF" ? "bg-red-100 text-red-800" : ficheAffichee.donnees.tdr_paludisme === "NEGATIF" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                        }`}>
                          {ficheAffichee.donnees.tdr_paludisme}
                        </span>
                      </div>
                      <p className="text-slate-700">Diagnostic posé : <strong className="text-slate-900">{ficheAffichee.donnees.diagnostic_possible}</strong></p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 text-xs">Décision Thérapeutique & Conduite</h4>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Décision :</span>
                        <span className={`px-2.5 py-1 rounded-full font-black text-xs ${
                          ficheAffichee.donnees.decision === "REFERER_CS" ? "bg-red-600 text-white" : "bg-[#005c30] text-white"
                        }`}>
                          {ficheAffichee.donnees.decision === "REFERER_CS" ? "🚨 Référence Immédiate vers Centre de Santé" : "✅ Prise en charge à domicile / communauté"}
                        </span>
                      </div>
                      {ficheAffichee.donnees.structure_cs_destination && (
                        <p className="text-slate-700">Structure de destination : <strong>{ficheAffichee.donnees.structure_cs_destination}</strong></p>
                      )}
                      {ficheAffichee.donnees.premier_geste_pose && (
                        <p className="text-slate-700">Premier geste posé : <strong>{ficheAffichee.donnees.premier_geste_pose}</strong></p>
                      )}
                      {ficheAffichee.donnees.theme_sensibilisation && (
                        <p className="text-slate-700">Sensibilisation : <strong>{ficheAffichee.donnees.theme_sensibilisation}</strong></p>
                      )}
                      {ficheAffichee.donnees.observations && (
                        <p className="text-slate-600 italic">Observations : "{ficheAffichee.donnees.observations}"</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. FICHE MATERNITE */}
                {ficheAffichee.type === "MATERNITE" && (
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 text-xs">Informations Patiente</h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                        <p>Nom & Prénoms : <strong>{ficheAffichee.donnees.prenoms} {ficheAffichee.donnees.nom}</strong></p>
                        <p>Âge : <strong>{ficheAffichee.donnees.age || "Non précisé"} ans</strong></p>
                        <p>Village : <strong>{ficheAffichee.donnees.village_nom || "-"}</strong></p>
                        <p>Statut Grossesse : <strong className="text-pink-800">{ficheAffichee.donnees.statut_grossesse || "En cours"}</strong></p>
                        <p>Terme actuel : <strong>{ficheAffichee.donnees.terme_sa || "?"} SA</strong></p>
                        <p>Date DPA : <strong>{ficheAffichee.donnees.date_dpa || "Non définie"}</strong></p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 text-xs">Consultations Prénatales & Prévention</h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                        <p>CPN1 : <strong>{ficheAffichee.donnees.date_cpn1 || "Non effectuée"}</strong></p>
                        <p>CPN2 : <strong>{ficheAffichee.donnees.date_cpn2 || "Non effectuée"}</strong></p>
                        <p>CPN3 : <strong>{ficheAffichee.donnees.date_cpn3 || "Non effectuée"}</strong></p>
                        <p>CPN4 : <strong>{ficheAffichee.donnees.date_cpn4 || "Non effectuée"}</strong></p>
                        <p>TPI / SP (Doses) : <strong>{ficheAffichee.donnees.doses_tpi || 0}</strong></p>
                        <p>Supplémentation Enov'Mum : <strong>{ficheAffichee.donnees.enov_mum_recu ? "Reçu" : "Non"}</strong></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. FICHE ENFANT 1000 JOURS */}
                {ficheAffichee.type === "ENFANTS_1000J" && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-slate-900 text-xs">Suivi Nutritionnel & Vaccinal</h4>
                    <p>Enfant : <strong>{ficheAffichee.donnees.prenoms} {ficheAffichee.donnees.nom}</strong></p>
                    <p>Village : <strong>{ficheAffichee.donnees.village_nom || "-"}</strong></p>
                    <p>Périmètre Brachial (PB) : <strong>{ficheAffichee.donnees.perimetre_brachial_mm || "?"} mm</strong></p>
                    <p>Poids mesuré : <strong>{ficheAffichee.donnees.poids_kg ? `${ficheAffichee.donnees.poids_kg} kg` : "Non mesuré"}</strong></p>
                    <p>Statut Vaccinal : <strong>{ficheAffichee.donnees.statut_vaccinal || "Non renseigné"}</strong></p>
                  </div>
                )}

                {/* 4. FICHE REFERENCES */}
                {ficheAffichee.type === "REFERENCES" && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-slate-900 text-xs">Détails de l'Évacuation</h4>
                    <p>Motif de la Référence : <strong className="text-red-700">{ficheAffichee.donnees.motif_reference || "Urgence médicale"}</strong></p>
                    <p>Degré d'Urgence : <strong>{ficheAffichee.donnees.degre_urgence || "Moyenne"}</strong></p>
                    <p>Centre de Santé de Destination : <strong>{ficheAffichee.donnees.centre_sante_destination || "Centre de Santé"}</strong></p>
                    <p>Moyen de Transport : <strong>{ficheAffichee.donnees.moyen_transport || "Non renseigné"}</strong></p>
                    <p>Date : <strong>{ficheAffichee.donnees.date_reference}</strong></p>
                  </div>
                )}

                {/* 5. FICHE ALERTE */}
                {ficheAffichee.type === "ALERTES" && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-purple-900 text-xs">Détails Alerte Épidémiologique</h4>
                    <p>Pathologie / Événement : <strong className="text-purple-900">{ficheAffichee.donnees.type_alerte_nom}</strong></p>
                    <p>Semaine Épidémiologique : <strong>Semaine {ficheAffichee.donnees.semaine_epidemio} / {ficheAffichee.donnees.annee}</strong></p>
                    <p>Alerte Prioritaire : <strong>{ficheAffichee.donnees.est_prioritaire ? "OUI" : "NON"}</strong></p>
                    <p>Statut Investigation : <strong>{ficheAffichee.donnees.investigation_faite ? "Investigation Réalisée" : "Non encore investiguée"}</strong></p>
                    <p>Délai Détection & Notification : <strong>{ficheAffichee.donnees.delai_detection_notification_heures || "?"} heures</strong></p>
                  </div>
                )}

                {/* 6. FICHE DECES */}
                {ficheAffichee.type === "DECES" && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-slate-900 text-xs">Notification de Décès</h4>
                    <p>Type de Décès : <strong className="text-slate-900">{ficheAffichee.donnees.type_deces_nom}</strong></p>
                    <p>Défunt : <strong>{ficheAffichee.donnees.defunt_nom_prenom || "Non précisé"}</strong></p>
                    <p>Village : <strong>{ficheAffichee.donnees.village || "-"}</strong></p>
                    <p>Date Notification : <strong>{ficheAffichee.donnees.date_notification}</strong></p>
                  </div>
                )}

                {/* 7. FICHE RMA */}
                {ficheAffichee.type === "RMA" && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-blue-900 text-xs">Synthèse RMA Mois {ficheAffichee.donnees.mois} / {ficheAffichee.donnees.annee}</h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                      <p>VAD Réalisées : <strong>{ficheAffichee.donnees.total_visites_domiciliaires || 0}</strong></p>
                      <p>Causeries Éducatives : <strong>{ficheAffichee.donnees.total_seances_sensibilisation || 0}</strong></p>
                      <p>Femmes Enceintes Suivies : <strong>{ficheAffichee.donnees.femmes_enceintes_suivies || 0}</strong></p>
                      <p>Enfants 0-59m Suivis : <strong>{ficheAffichee.donnees.enfants_0_59_mois_suivis || 0}</strong></p>
                      <p>Cas Paludisme Pris en charge : <strong>{ficheAffichee.donnees.total_paludisme_confirme || 0}</strong></p>
                      <p>Références Évacuées : <strong>{ficheAffichee.donnees.total_references || 0}</strong></p>
                    </div>
                  </div>
                )}

              </div>

              {/* Pied de la modale */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500 font-bold">
                  🔒 Donnée officielle sous traçabilité
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (ficheAffichee.ascq?.id) {
                        setSuggestionAscqId(ficheAffichee.ascq.id);
                        setSuggestionModule(ficheAffichee.type);
                        setSuggestionTitre(`Remarque sur ${ficheAffichee.type}`);
                        setActiveTab("suggestions");
                      }
                      setFicheAffichee(null);
                    }}
                    className="py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>💡 Suggérer une remarque sur cette fiche</span>
                  </button>

                  {peutGererNettoyageEtRadiation && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetItem = ficheAffichee.donnees ? {
                          id: ficheAffichee.donnees.id,
                          type: ficheAffichee.type,
                          typeLibelle: ficheAffichee.type,
                          titre: ficheAffichee.donnees.titre_alerte || ficheAffichee.donnees.nom_defunt || ficheAffichee.donnees.nom_patient || "Fiche"
                        } : ficheAffichee;
                        ouvrirModalNettoyage(targetItem);
                      }}
                      className="py-1.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center gap-1 shadow-xs transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      <span>Nettoyer cette fiche</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setFicheAffichee(null)}
                    className="py-1.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
                  >
                    Fermer
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
