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
  Info
} from "lucide-react";
import { getCachedUserSession, getCachedMonEspace } from "@/lib/offline-sync";
import {
  telechargerCsvBOM,
  telechargerExcelHtml,
  imprimerRapportPdf,
  journaliserExport,
  anonymiserPetitEffectif
} from "@/lib/gouvernanceExports";

export default function PerimetreGouvernancePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  
  // Onglets principaux de gouvernance
  const [activeTab, setActiveTab] = useState<"dashboard_compile" | "suivi_individuel" | "diffusion_alertes" | "exports_journal">("dashboard_compile");

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
  const [dossierAscq, setDossierAscq] = useState<{ plannings: any[]; activites: any[]; rma: any[]; hebdo: any[]; alertes: any[]; deces: any[] }>({
    plannings: [],
    activites: [],
    rma: [],
    hebdo: [],
    alertes: [],
    deces: [],
  });
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Diffusion d'alerte officielle par le responsable
  const [alerteTitre, setAlerteTitre] = useState("");
  const [alerteMessage, setAlerteMessage] = useState("");
  const [alertePriorite, setAlertePriorite] = useState<"NORMALE" | "HAUTE" | "URGENTE">("HAUTE");
  const [sendingAlerte, setSendingAlerte] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Historique des exports
  const [journalExports, setJournalExports] = useState<any[]>([]);
  const [loadingJournal, setLoadingJournal] = useState(false);

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

    } catch (err) {
      console.error("Erreur initialisation gouvernance:", err);
    } finally {
      setLoading(false);
    }
  };

  // Chargement des territoires inférieurs (ex: Département -> Communes, Commune -> Arrondissements)
  const chargerTerritoiresInferieurs = async (profil: any) => {
    try {
      const role = (profil.role_technique || "").toUpperCase();
      const poste = (profil.poste || "").toUpperCase();
      const isNational = ["SUPER_ADMIN", "ADMINISTRATEUR", "CADRE_NATIONAL"].includes(role) || ["SUPER_ADMIN", "ADMINISTRATEUR"].includes(poste);
      const isDept = ["CADRE_DEPARTEMENTAL", "REPRESENTANT_DEPARTEMENTAL", "ADMIN_DEPARTEMENTAL"].includes(role) || ["DDS", "CCD_CDLS_TP", "CSSPR", "CSPSMEMH"].includes(poste);
      const isZone = ["CADRE_ZONE_SANITAIRE"].includes(role) || ["MCZS", "RCSE", "C_RAMS"].includes(poste);

      if (isNational) {
        // Niveau National -> Territoires inférieurs : Départements
        const { data } = await supabase.from("departements").select("id, nom").order("nom");
        setListeTerritoiresInf(data || []);
      } else if (isDept && profil.departement_id) {
        // Niveau Départemental -> Territoires inférieurs : Communes
        const { data } = await supabase.from("communes").select("id, nom").eq("departement_id", profil.departement_id).order("nom");
        setListeTerritoiresInf(data || []);
      } else if (isZone && profil.zone_sanitaire_id) {
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
      // 1. Récupérer les alertes du territoire
      let queryAlertes = supabase.from("alertes_communautaires").select("id, est_prioritaire, type_alerte_nom, investigation_faite, delai_detection_notification_heures, delai_notification_investigation_heures, commune_id, arrondissement_id, semaine_epidemio, created_at").eq("annee", annee);
      if (profil.commune_id) queryAlertes = queryAlertes.eq("commune_id", profil.commune_id);
      else if (profil.departement_id) queryAlertes = queryAlertes.eq("departement_id", profil.departement_id);

      const { data: alertesData } = await queryAlertes;
      const alertes = alertesData || [];

      // 2. Récupérer les décès du territoire
      let queryDeces = supabase.from("deces_communautaires").select("id, type_deces_nom, commune_id, arrondissement_id, created_at").eq("annee", annee);
      if (profil.commune_id) queryDeces = queryDeces.eq("commune_id", profil.commune_id);
      else if (profil.departement_id) queryDeces = queryDeces.eq("departement_id", profil.departement_id);

      const { data: decesData } = await queryDeces;
      const deces = decesData || [];

      // 3. Récupérer les RMA et rapports hebdo PNSC
      let queryRma = supabase.from("rapports_mensuels_ascq").select("id, ascq_id, mois, annee, date_depot, commune_id, arrondissement_id").eq("annee", annee).eq("mois", mois);
      if (profil.commune_id) queryRma = queryRma.eq("commune_id", profil.commune_id);

      const { data: rmaData } = await queryRma;
      const rmas = rmaData || [];

      // 4. Récupérer les ASCQ pour complétude
      let queryAscq = supabase.from("utilisateurs").select("id, nom, prenoms, telephone, commune_id, arrondissement_id").eq("statut_compte", "VALIDE").or("poste.eq.ASCQ,role_technique.eq.ASCQ_OPERATEUR");
      if (profil.commune_id) queryAscq = queryAscq.eq("commune_id", profil.commune_id);
      else if (profil.departement_id) queryAscq = queryAscq.eq("departement_id", profil.departement_id);

      const { data: ascqsList } = await queryAscq;
      const totalAscq = (ascqsList || []).length;

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

      (ascqsList || []).forEach((u: any) => {
        const key = profil.commune_id ? u.arrondissement_id : u.commune_id;
        if (ventilationMap.has(key)) {
          ventilationMap.get(key).ascq_count++;
        }
      });

      alertes.forEach((a: any) => {
        const key = profil.commune_id ? a.arrondissement_id : a.commune_id;
        if (ventilationMap.has(key)) {
          ventilationMap.get(key).alertes++;
        }
      });

      deces.forEach((d: any) => {
        const key = profil.commune_id ? d.arrondissement_id : d.commune_id;
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
      let query = supabase
        .from("utilisateurs")
        .select("id, nom, prenoms, telephone, poste, role_technique, statut_compte, commune_id, arrondissement_id, second_arrondissement_id")
        .eq("statut_compte", "VALIDE")
        .or("poste.eq.ASCQ,role_technique.eq.ASCQ_OPERATEUR");

      if (profil.commune_id) query = query.eq("commune_id", profil.commune_id);
      else if (profil.departement_id) query = query.eq("departement_id", profil.departement_id);

      const { data: users } = await query.order("nom");

      if (users && users.length > 0) {
        // Croiser avec les RMA du mois
        const { data: rmas } = await supabase
          .from("rapports_mensuels_ascq")
          .select("ascq_id, date_depot, created_at")
          .eq("annee", annee)
          .eq("mois", mois);

        const rmaMap = new Map((rmas || []).map((r: any) => [r.ascq_id, r]));

        const arrNames = new Map(listeTerritoiresInf.map(t => [t.id, t.nom]));

        const enriched = users.map((u: any) => {
          const rma = rmaMap.get(u.id);
          let statutRapport = "MANQUANT";
          if (rma) {
            const dDepot = rma.date_depot ? new Date(rma.date_depot) : new Date(rma.created_at);
            statutRapport = dDepot.getDate() <= 5 ? "DEPOSE" : "EN_RETARD";
          }

          return {
            ...u,
            arrondissement_nom: arrNames.get(u.arrondissement_id) || "Arrondissement",
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

  // Inspection individuelle 360° en CONSULTATION SEULE
  const inspecterAscq360 = async (ascq: any) => {
    setSelectedAscq(ascq);
    setLoadingDossier(true);
    try {
      const [planningsRes, activitesRes, rmaRes, hebdoRes, alertesRes, decesRes] = await Promise.all([
        supabase.from("plannings_ascq").select("*, lignes_planning_ascq(*)").eq("ascq_id", ascq.id).order("annee", { ascending: false }).order("mois", { ascending: false }).limit(6),
        supabase.from("activites_menees").select("*").eq("ascq_id", ascq.id).order("date_activite", { ascending: false }).limit(10),
        supabase.from("rapports_mensuels_ascq").select("*").eq("ascq_id", ascq.id).order("annee", { ascending: false }).order("mois", { ascending: false }).limit(6),
        supabase.from("rapports_hebdo_pnsc").select("*").eq("ascq_id", ascq.id).order("annee", { ascending: false }).order("semaine", { ascending: false }).limit(8),
        supabase.from("alertes_communautaires").select("*").eq("notificateur_id", ascq.id).order("date_notification", { ascending: false }).limit(10),
        supabase.from("deces_communautaires").select("*").eq("notificateur_id", ascq.id).order("date_notification", { ascending: false }).limit(10),
      ]);

      setDossierAscq({
        plannings: planningsRes.data || [],
        activites: activitesRes.data || [],
        rma: rmaRes.data || [],
        hebdo: hebdoRes.data || [],
        alertes: alertesRes.data || [],
        deces: decesRes.data || [],
      });
    } catch (e) {
      console.warn("Erreur inspection 360°:", e);
    } finally {
      setLoadingDossier(false);
    }
  };

  // Envoi d'une alerte ou consigne officielle par le responsable
  const handleDiffuserAlerte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alerteTitre.trim() || !alerteMessage.trim()) {
      alert("Veuillez renseigner le titre et le contenu de l'alerte.");
      return;
    }

    setSendingAlerte(true);
    try {
      // Notifier tous les ASCQ de son territoire
      const cibles = ascqs.map(a => a.id);
      if (cibles.length === 0) {
        alert("Aucun agent cible trouvé dans votre territoire.");
        setSendingAlerte(false);
        return;
      }

      const notifs = cibles.map(uid => ({
        destinataire_id: uid,
        titre: `[OFFICIEL ${currentUser.poste || "SUPERVISEUR"}] ${alerteTitre.trim()}`,
        message: alerteMessage.trim(),
        type: alertePriorite === "URGENTE" ? "URGENT" : "ALERTE",
        type_notification: alertePriorite === "URGENTE" ? "ALERTE_PRIORITAIRE" : "CONSIGNE_ADMIN",
        priorite: alertePriorite,
        lu: false,
      }));

      await supabase.from("notifications").insert(notifs);

      setToastMsg({ text: `Alerte officielle transmise à ${cibles.length} agents de votre périmètre !`, error: false });
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
    }
  }, [activeTab]);

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
                <p className="text-slate-800"><strong>Téléphone :</strong> {currentUser.telephone}</p>
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

  const libelleRole = currentUser?.poste === "REPRESENTANT_COMMUNAL" ? "Représentant Communal" :
                      currentUser?.poste === "REPRESENTANT_DEPARTEMENTAL" ? "Représentant Départemental" :
                      currentUser?.poste === "DDS" ? "Directeur Départemental de la Santé" :
                      currentUser?.poste === "MCZS" ? "Médecin Coordonnateur Zone" :
                      currentUser?.poste === "MCC" ? "Médecin Coordonnateur Commune" :
                      currentUser?.poste === "PF_CCLS_TP" ? "Point Focal CCLS-TP" :
                      currentUser?.poste || "Responsable de Santé";

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-28">
      <AscqNav userProfile={currentUser} />

      <main className="max-w-5xl mx-auto px-4 pt-5 space-y-4">
        
        {/* BANDEAU GOUVERNANCE OFFICIEL */}
        <div className="bg-gradient-to-r from-emerald-950 via-[#005c30] to-teal-900 text-white rounded-3xl p-6 shadow-md space-y-3 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-sm mb-2">
                <Crown className="w-4 h-4 fill-current" />
                <span>{libelleRole}</span>
                <span className="text-[10px] bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded-full uppercase">Consultation Seule</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Gouvernance Sanitaire • {libelleTerritoire}
              </h1>
              <p className="text-xs text-emerald-100 font-medium">
                Suivi épidémiologique, ponctualité des rapports, supervision 360° des ASCQ et exports audités.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1.5 rounded-2xl bg-white/10 text-white font-mono font-bold text-xs border border-white/20">
                {stats.total_ascq} ASCQ rattachés
              </span>
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

        {/* 4 ONGLETS DE GOUVERNANCE */}
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("dashboard_compile")}
            className={`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "dashboard_compile" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Tableau de bord Compilé</span>
          </button>

          <button
            onClick={() => setActiveTab("suivi_individuel")}
            className={`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "suivi_individuel" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Suivi Individuel des ASCQ</span>
          </button>

          <button
            onClick={() => setActiveTab("diffusion_alertes")}
            className={`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "diffusion_alertes" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>3. Envoyer une Alerte</span>
          </button>

          <button
            onClick={() => setActiveTab("exports_journal")}
            className={`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "exports_journal" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>4. Exports & Journal d'Audit</span>
          </button>
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
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>📞 {ascq.telephone}</span>
                          <span>•</span>
                          <span>📍 {ascq.arrondissement_nom}</span>
                        </p>
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
                          Consultation Seule 360°
                        </span>
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <h3 className="text-base font-black text-slate-900 mt-1">
                        Dossier de {selectedAscq.nom} {selectedAscq.prenoms}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {selectedAscq.telephone} • {selectedAscq.arrondissement_nom}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedAscq(null)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Contenu */}
                  <div className="p-5 overflow-y-auto space-y-4 text-xs">
                    {loadingDossier ? (
                      <div className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30] mb-2" />
                        Chargement du dossier complet de l'ASCQ...
                      </div>
                    ) : (
                      <>
                        {/* Section 1 : Rapports Mensuels */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <h4 className="font-bold text-slate-900 flex items-center justify-between">
                            <span>📊 Rapports Mensuels Déposés (RMA)</span>
                            <span className="text-[10px] text-slate-500">{dossierAscq.rma.length} trouvés</span>
                          </h4>
                          {dossierAscq.rma.length === 0 ? (
                            <p className="text-slate-400 text-[11px]">Aucun rapport mensuel déposé.</p>
                          ) : (
                            <div className="space-y-1">
                              {dossierAscq.rma.map((r: any) => (
                                <div key={r.id} className="p-2 bg-white rounded-xl border border-slate-200/60 flex items-center justify-between">
                                  <span>Mois {r.mois} / {r.annee}</span>
                                  <span className="font-bold text-emerald-700">Déposé le {new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section 2 : Plannings et Activités */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <h4 className="font-bold text-slate-900 flex items-center justify-between">
                            <span>📅 Plannings & Activités menées</span>
                            <span className="text-[10px] text-slate-500">{dossierAscq.activites.length} activités</span>
                          </h4>
                          {dossierAscq.activites.length === 0 ? (
                            <p className="text-slate-400 text-[11px]">Aucune activité enregistrée récemment.</p>
                          ) : (
                            <div className="space-y-1">
                              {dossierAscq.activites.slice(0, 5).map((a: any) => (
                                <div key={a.id} className="p-2 bg-white rounded-xl border border-slate-200/60 flex items-center justify-between">
                                  <span className="font-bold">{a.titre_activite}</span>
                                  <span className="text-slate-500">{a.date_activite}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section 3 : Alertes Épidémiologiques Notifiées */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <h4 className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🚨 Alertes épidémiologiques notifiées</span>
                            <span className="text-[10px] text-slate-500">{dossierAscq.alertes.length} alertes</span>
                          </h4>
                          {dossierAscq.alertes.length === 0 ? (
                            <p className="text-slate-400 text-[11px]">Aucune alerte signalée par cet agent.</p>
                          ) : (
                            <div className="space-y-1">
                              {dossierAscq.alertes.map((al: any) => (
                                <div key={al.id} className="p-2 bg-white rounded-xl border border-slate-200/60 flex items-center justify-between">
                                  <span className="font-bold text-slate-800">{al.type_alerte_nom}</span>
                                  <span className="text-emerald-700 font-bold">{al.date_notification} (Sem. {al.semaine_epidemio})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Pied */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedAscq(null)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold text-xs rounded-xl"
                    >
                      Fermer le dossier
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 3 : ENVOYER UNE ALERTE OFFICIELLE AU TERRITOIRE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "diffusion_alertes" && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 max-w-xl mx-auto text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                Prérogative Officielle de Supervision
              </span>
              <h2 className="text-base font-black text-slate-900">
                Diffuser une Alerte ou Consigne au Territoire
              </h2>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Transmettez instantanément une notification prioritaire ou une directive sanitaire à l'ensemble des {ascqs.length} ASCQ de votre périmètre ({libelleTerritoire}).
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
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Objet / Titre de l'Alerte *</label>
                <input
                  type="text"
                  placeholder="Ex : Riposte rougeole - Ratissage immédiat demandé..."
                  value={alerteTitre}
                  onChange={(e) => setAlerteTitre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Directive ou Consigne Sanitaire *</label>
                <textarea
                  rows={4}
                  placeholder="Détaillez la conduite à tenir, les délais et les consignes pour les ASCQ et Relais..."
                  value={alerteMessage}
                  onChange={(e) => setAlerteMessage(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={sendingAlerte}
                className="w-full py-3 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {sendingAlerte ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{sendingAlerte ? "Diffusion en cours..." : "Diffuser immédiatement aux ASCQ du périmètre"}</span>
              </button>
            </form>
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

      </main>
    </div>
  );
}
