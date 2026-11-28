"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Calendar, 
  Printer, 
  Check, 
  Save, 
  FileText, 
  Clock, 
  MapPin, 
  Users, 
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Download,
  Eye,
  Plus,
  Trash2,
  Phone,
  CheckCircle2,
  X,
  FileCheck,
  Send,
  UserCheck
} from "lucide-react";
import AscqNav from "@/components/AscqNav";
import SignatureCanvas from "@/components/SignatureCanvas";
import BoutonSuppressionSecurisee from "@/components/BoutonSuppressionSecurisee";
import SelecteurAppLecturePdf from "@/components/SelecteurAppLecturePdf";
import { getCachedUserSession, getCachedMonEspace } from "@/lib/offline-sync";
import { 
  generatePdfPlanningAscq, 
  generatePdfPlanningRc, 
  telechargerPdf, 
  imprimerPdf, 
  creerBlobPdfUrl,
  genererNomFichierPlanningAscq,
  genererNomFichierPlanningRc,
  AscqPlanningData,
  RcPlanningData,
  RcPlanningSlot
} from "@/lib/pdf-plannings";
import { PILOTE_CONFIG, estDepartementPilote } from "@/lib/pilot-config";

// Les 10 activités officielles validées CNLS-TP
const ACTIVITES_OFFICIELLES_CNLSTP = [
  "Causerie éducative",
  "Sensibilisation / démonstration / salubrité",
  "Vaccination poste fixe/avancée",
  "Supervision RC et validation VAD",
  "Prise en charge communautaire des cas (iCCM)",
  "Visites des sites prioritaires",
  "Visites à domicile et dépistage actif",
  "Campagne spécifique de santé publique",
  "Suivi groupé et orientation des RC",
  "Formation"
];

const JOURS_ABREV = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

// Calcul de la semaine ISO actuelle (1-52)
function getSemaineActuelle(): number {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Calcul des dates début (lundi) et fin (dimanche)
function getDatesSemaine(annee: number, semaine: number) {
  const simple = new Date(annee, 0, 1 + (semaine - 1) * 7);
  const dayOfWeek = simple.getDay();
  const ISOweekStart = simple;
  if (dayOfWeek <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  
  const ISOweekEnd = new Date(ISOweekStart);
  ISOweekEnd.setDate(ISOweekStart.getDate() + 6);
  
  const pad = (n: number) => String(n).padStart(2, "0");
  const debutStr = `${ISOweekStart.getFullYear()}-${pad(ISOweekStart.getMonth() + 1)}-${pad(ISOweekStart.getDate())}`;
  const finStr = `${ISOweekEnd.getFullYear()}-${pad(ISOweekEnd.getMonth() + 1)}-${pad(ISOweekEnd.getDate())}`;
  const debutFr = `${pad(ISOweekStart.getDate())}/${pad(ISOweekStart.getMonth() + 1)}/${ISOweekStart.getFullYear()}`;
  const finFr = `${pad(ISOweekEnd.getDate())}/${pad(ISOweekEnd.getMonth() + 1)}/${ISOweekEnd.getFullYear()}`;

  return {
    debut: debutStr,
    fin: finStr,
    debutFr,
    finFr,
    label: `Du ${debutFr} au ${finFr}`
  };
}

export default function PlanningAscqPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ongletActif, setOngletActif] = useState<"formulaire" | "historique" | "plannings_rc">("formulaire");
  
  // Aperçu PDF Vectoriel
  const [modalApercuOuvert, setModalApercuOuvert] = useState(false);
  const [previewPdfBlobUrl, setPreviewPdfBlobUrl] = useState<string | null>(null);
  const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [historiquePlannings, setHistoriquePlannings] = useState<any[]>([]);

  // 1. Identification & Période
  const anneeActuelle = new Date().getFullYear();
  const [annee, setAnnee] = useState<number>(anneeActuelle);
  const [semaine, setSemaine] = useState<number>(getSemaineActuelle());
  const dates = useMemo(() => getDatesSemaine(annee, semaine), [annee, semaine]);

  const [departement, setDepartement] = useState<string>("Zou");
  const [commune, setCommune] = useState<string>("Ouinhî");
  const [arrondissement, setArrondissement] = useState<string>("Tohouès");
  const [ascqNom, setAscqNom] = useState<string>("DOSSOU BRUNO");
  const [ascqPhone, setAscqPhone] = useState<string>("0169031463");

  // 2. Relais Communautaires
  const [rcPlanifies, setRcPlanifies] = useState<number>(16);
  const [rcAttendus, setRcAttendus] = useState<number>(15);
  const [motifEcart, setMotifEcart] = useState<string>("Un RC malade");
  const aEcartRc = useMemo(() => Number(rcPlanifies) !== Number(rcAttendus), [rcPlanifies, rcAttendus]);

  // 3. Activités de la semaine (mapping des 10 activités avec leurs jours sélectionnés)
  const [activitesJours, setActivitesJours] = useState<Record<number, string[]>>({
    1: ["Lun"],
    2: ["Mar"],
    3: ["Mer"],
    4: ["Mar"],
    5: ["Mar"],
    6: ["Mer"],
    7: [],
    8: ["Mer"],
    9: ["Mar"],
    10: ["Mar"]
  });
  const [campagneTitre, setCampagneTitre] = useState<string>("");
  const [formationTitre, setFormationTitre] = useState<string>("");
  const campagneInputRef = useRef<HTMLInputElement | null>(null);
  const formationInputRef = useRef<HTMLInputElement | null>(null);

  // 4. Autres activités (Possibilité d'ajouter plusieurs autres activités)
  const [autresActivites, setAutresActivites] = useState<Array<{ id: string; nom: string; jours: string[] }>>([
    { id: "autre-1", nom: "Réunion de coordination mensuelle avec le CCLS-TP", jours: ["Mer"] }
  ]);
  const [autreActiviteNom, setAutreActiviteNom] = useState<string>("");
  const [autreActiviteJours, setAutreActiviteJours] = useState<string[]>(["Mer"]);

  // 5. Observations générales
  const [observations, setObservations] = useState<string>("RAS");

  // 6. Signature manuscrite de l'ASCQ
  const [signatureTactile, setSignatureTactile] = useState<string | null>(null);
  const [statutPlanning, setStatutPlanning] = useState<"BROUILLON" | "VALIDE">("BROUILLON");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  // GESTION DES PLANNINGS DES RELAIS (RC) POUR L'ASCQ (Onglet 3)
  const [planningsRelais, setPlanningsRelais] = useState<any[]>([]);
  const [loadingPlanningsRelais, setLoadingPlanningsRelais] = useState(false);
  const [modalRcPlanningOuvert, setModalRcPlanningOuvert] = useState(false);
  const [selectedRcPlanning, setSelectedRcPlanning] = useState<any | null>(null);
  const [signatureAscqValidationRc, setSignatureAscqValidationRc] = useState<string | null>(null);
  const [observationsAscqValidationRc, setObservationsAscqValidationRc] = useState<string>("");
  const [validatingRcPlanning, setValidatingRcPlanning] = useState(false);
  const [modalApercuRcOuvert, setModalApercuRcOuvert] = useState(false);
  const [previewRcPdfUrl, setPreviewRcPdfUrl] = useState<string | null>(null);
  const [previewRcPdfBytes, setPreviewRcPdfBytes] = useState<Uint8Array | null>(null);

  // Suppression sécurisée d'un planning ASCQ
  const handleSupprimerPlanningAscq = async (p: any) => {
    const uid = currentUser?.id;
    try {
      if (p.id && !String(p.id).startsWith("planning_cnlstp_")) {
        await supabase.from("lignes_planning_ascq").delete().eq("planning_id", p.id);
        await supabase.from("plannings_ascq").delete().eq("id", p.id);
      } else if (uid && p.annee && p.semaine) {
        await supabase.from("plannings_ascq").delete().eq("ascq_id", uid).eq("annee", p.annee).eq("semaine", p.semaine);
      }
    } catch {}
    if (typeof window !== "undefined") {
      try {
        if (uid) localStorage.removeItem(`planning_cnlstp_${uid}_${p.annee}_${p.semaine}`);
        if (String(p.id).startsWith("planning_cnlstp_")) localStorage.removeItem(String(p.id));
      } catch {}
    }
    setHistoriquePlannings(prev => prev.filter(item => !(item.annee === p.annee && item.semaine === p.semaine)));
  };

  // Suppression sécurisée d'un planning RC
  const handleSupprimerPlanningRc = async (p: any) => {
    if (!p?.id) return;
    try {
      await supabase.from("plannings_hebdo_relais").delete().eq("id", p.id);
    } catch {}
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`validation_rc_planning_${p.id}`);
        const allValids = JSON.parse(localStorage.getItem("all_validations_rc_plannings") || "{}");
        delete allValids[p.id];
        localStorage.setItem("all_validations_rc_plannings", JSON.stringify(allValids));
      } catch {}
    }
    setPlanningsRelais(prev => prev.filter(item => item.id !== p.id));
  };

  // Basculer un jour pour une activité donnée
  const toggleJourActivite = (actIdx: number, jour: string) => {
    const existants = activitesJours[actIdx] || [];
    const seraAjoute = !existants.includes(jour);
    setActivitesJours(prev => {
      const cur = prev[actIdx] || [];
      const nouveau = cur.includes(jour)
        ? cur.filter(j => j !== jour)
        : [...cur, jour];
      return { ...prev, [actIdx]: nouveau };
    });
    if (seraAjoute) {
      if (actIdx === 8 && !campagneTitre.trim()) {
        setTimeout(() => campagneInputRef.current?.focus(), 60);
      } else if (actIdx === 10 && !formationTitre.trim()) {
        setTimeout(() => formationInputRef.current?.focus(), 60);
      }
    }
  };

  const toggleJourAutre = (jour: string) => {
    setAutreActiviteJours(prev => 
      prev.includes(jour) ? prev.filter(j => j !== jour) : [...prev, jour]
    );
  };

  // Gestion multi-activités pour Section 4 (Autres activités)
  const ajouterAutreActivite = () => {
    setAutresActivites(prev => [
      ...prev,
      { id: `autre-${Date.now()}-${prev.length + 1}`, nom: "", jours: [] }
    ]);
  };

  const modifierNomAutreActivite = (id: string, nom: string) => {
    setAutresActivites(prev => prev.map(a => a.id === id ? { ...a, nom } : a));
  };

  const toggleJourAutreActivite = (id: string, jour: string) => {
    setAutresActivites(prev => prev.map(a => {
      if (a.id !== id) return a;
      const exist = a.jours.includes(jour);
      return {
        ...a,
        jours: exist ? a.jours.filter(j => j !== jour) : [...a.jours, jour]
      };
    }));
  };

  const supprimerAutreActivite = (id: string) => {
    setAutresActivites(prev => prev.length <= 1 ? [{ id: "autre-1", nom: "", jours: [] }] : prev.filter(a => a.id !== id));
  };

  // Helper pour scanner tous les plannings locaux de l'ASCQ dans localStorage
  const lireHistoriqueLocalAscq = (uid?: string): any[] => {
    if (typeof window === "undefined") return [];
    const items: any[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith("planning_cnlstp_")) continue;
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.semaine && parsed.annee) {
            if (!uid || !parsed.ascq_id || parsed.ascq_id === uid) {
              const dSem = getDatesSemaine(Number(parsed.annee), Number(parsed.semaine));
              items.push({
                id: parsed.id || k,
                semaine: Number(parsed.semaine),
                annee: Number(parsed.annee),
                statut: parsed.statut || "BROUILLON",
                date_debut: parsed.date_debut || dSem.debut,
                date_fin: parsed.date_fin || dSem.fin,
                created_at: parsed.updated_at || parsed.date_validation || new Date().toISOString(),
                localData: parsed
              });
            }
          }
        } catch {}
      }
    } catch {}
    return items;
  };

  // Chargement des données du profil et du planning existant
  const chargerDonnees = async () => {
    setLoading(true);
    try {
      let user: any = null;
      let profil: any = null;

      if (navigator.onLine) {
        try {
          const { data } = await supabase.auth.getUser();
          user = data?.user;
        } catch {}
      }

      if (!user) {
        const cached = getCachedUserSession();
        user = cached.user;
        profil = cached.profile;
      }

      if (!user && !profil) {
        const monEspace = getCachedMonEspace();
        if (monEspace) profil = monEspace;
      }

      if (!user && !profil) {
        router.push("/connexion");
        return;
      }

      if (user && !profil) {
        const { data } = await supabase.from("utilisateurs").select("*").eq("id", user.id).maybeSingle();
        profil = data || { id: user.id, email: user.email, poste: "ASCQ" };
      }

      const activeProfile = profil || { id: user?.id, email: user?.email, poste: "ASCQ" };
      setCurrentUser(activeProfile);

      // Pré-remplissage géographique et coordonnées
      if (activeProfile.departement_nom || activeProfile.departement) {
        setDepartement(activeProfile.departement_nom || activeProfile.departement);
      }
      if (activeProfile.commune_nom || activeProfile.commune) {
        setCommune(activeProfile.commune_nom || activeProfile.commune);
      }
      if (activeProfile.arrondissement_nom || activeProfile.arrondissement) {
        setArrondissement(activeProfile.arrondissement_nom || activeProfile.arrondissement);
      }
      const nomComplet = `${activeProfile.prenoms || activeProfile.prenom || ""} ${activeProfile.nom || ""}`.trim();
      if (nomComplet) setAscqNom(nomComplet);
      if (activeProfile.telephone) setAscqPhone(activeProfile.telephone);

      // Charger le planning sauvegardé pour cette semaine et année (Supabase + fusion LocalStorage)
      const uid = user?.id || activeProfile.id;
      const localKey = `planning_cnlstp_${uid}_${annee}_${semaine}`;
      const localRaw = typeof window !== "undefined" ? localStorage.getItem(localKey) : null;
      let localParsed: any = null;
      if (localRaw) {
        try { localParsed = JSON.parse(localRaw); } catch {}
      }

      let dbFound = false;
      try {
        const { data: existant } = await supabase
          .from("plannings_ascq")
          .select("*, lignes_planning_ascq(*)")
          .eq("ascq_id", uid)
          .eq("annee", annee)
          .eq("semaine", semaine)
          .maybeSingle();

        if (existant) {
          dbFound = true;
          setStatutPlanning(existant.statut || localParsed?.statut || "BROUILLON");
          if (existant.signature_tactile || localParsed?.signatureData) {
            setSignatureTactile(existant.signature_tactile || localParsed?.signatureData);
          }
          if (existant.observations || localParsed?.observations) {
            setObservations(existant.observations || localParsed?.observations);
          }
          if (existant.rc_planifies !== undefined) setRcPlanifies(existant.rc_planifies);
          else if (localParsed?.rcPlanifies !== undefined) setRcPlanifies(localParsed.rcPlanifies);
          if (existant.rc_attendus !== undefined) setRcAttendus(existant.rc_attendus);
          else if (localParsed?.rcAttendus !== undefined) setRcAttendus(localParsed.rcAttendus);
          if (existant.motif_ecart || localParsed?.motifEcart) {
            setMotifEcart(existant.motif_ecart || localParsed?.motifEcart);
          }

          // Reconstitution des jours cochés à partir des lignes
          if (existant.lignes_planning_ascq && existant.lignes_planning_ascq.length > 0) {
            const nouvJours: Record<number, string[]> = {};
            const autresDb: Array<{ id: string; nom: string; jours: string[] }> = [];
            existant.lignes_planning_ascq.forEach((l: any) => {
              const num = Number(l.ordre);
              const parts = (l.periode || l.jour_semaine || "").split(",").map((s: string) => s.trim()).filter(Boolean);
              if (num >= 1 && num <= 10) {
                nouvJours[num] = parts;
                if (num === 8 && typeof l.activite === "string") {
                  const m = l.activite.match(/\(([^)]+)\)\s*$/);
                  if (m?.[1]) setCampagneTitre(m[1].trim());
                } else if (num === 10 && typeof l.activite === "string") {
                  const m = l.activite.match(/\(([^)]+)\)\s*$/);
                  if (m?.[1]) setFormationTitre(m[1].trim());
                }
              } else if (num >= 11) {
                autresDb.push({
                  id: `autre-db-${num}`,
                  nom: l.activite || "",
                  jours: parts
                });
              }
            });
            setActivitesJours(prev => ({ ...prev, ...nouvJours }));
            if (autresDb.length > 0) {
              setAutresActivites(autresDb);
              setAutreActiviteNom(autresDb[0].nom);
              setAutreActiviteJours(autresDb[0].jours);
            } else if (Array.isArray(localParsed?.autresActivites) && localParsed.autresActivites.length > 0) {
              setAutresActivites(localParsed.autresActivites);
            }
          } else if (localParsed) {
            if (localParsed.activitesJours) setActivitesJours(localParsed.activitesJours);
        if (typeof localParsed.campagneTitre === "string") setCampagneTitre(localParsed.campagneTitre);
        if (typeof localParsed.formationTitre === "string") setFormationTitre(localParsed.formationTitre);
            if (Array.isArray(localParsed.autresActivites) && localParsed.autresActivites.length > 0) {
              setAutresActivites(localParsed.autresActivites);
            }
          }
        }
      } catch {}

      if (!dbFound && localParsed) {
        setRcPlanifies(localParsed.rc_planifies ?? localParsed.rcPlanifies ?? 16);
        setRcAttendus(localParsed.rc_attendus ?? localParsed.rcAttendus ?? 15);
        setMotifEcart(localParsed.motif_ecart ?? localParsed.motifEcart ?? "Un RC malade");
        setObservations(localParsed.observations ?? "RAS");
        if (localParsed.activitesJours) setActivitesJours(localParsed.activitesJours);
        if (typeof localParsed.campagneTitre === "string") setCampagneTitre(localParsed.campagneTitre);
        if (typeof localParsed.formationTitre === "string") setFormationTitre(localParsed.formationTitre);
        if (Array.isArray(localParsed.autresActivites) && localParsed.autresActivites.length > 0) {
          setAutresActivites(localParsed.autresActivites);
        } else if (localParsed.autreActiviteNom) {
          setAutresActivites([{ id: "autre-1", nom: localParsed.autreActiviteNom, jours: localParsed.autreActiviteJours || [] }]);
        }
        setSignatureTactile(localParsed.signature_tactile || localParsed.signatureData || null);
        setStatutPlanning(localParsed.statut || "BROUILLON");
      }

      // Historique complet (Fusion Supabase + LocalStorage afin que l'historique ne soit jamais vide)
      let dbHist: any[] = [];
      try {
        let hQuery = supabase
          .from("plannings_ascq")
          .select("id, ascq_id, semaine, annee, statut, date_debut, date_fin, created_at")
          .order("annee", { ascending: false })
          .order("semaine", { ascending: false })
          .limit(30);
        if (uid) {
          hQuery = hQuery.eq("ascq_id", uid);
        }
        const { data: hist } = await hQuery;
        if (hist && hist.length > 0) {
          dbHist = hist;
        } else {
          const { data: histAll } = await supabase
            .from("plannings_ascq")
            .select("id, ascq_id, semaine, annee, statut, date_debut, date_fin, created_at")
            .order("annee", { ascending: false })
            .order("semaine", { ascending: false })
            .limit(20);
          if (histAll) dbHist = histAll;
        }
      } catch {}

      const localHist = lireHistoriqueLocalAscq(uid);
      const mergedMap = new Map<string, any>();
      dbHist.forEach((item) => {
        const key = `${item.annee}-${item.semaine}`;
        mergedMap.set(key, item);
      });
      localHist.forEach((item) => {
        const key = `${item.annee}-${item.semaine}`;
        const exist = mergedMap.get(key);
        if (!exist) {
          mergedMap.set(key, item);
        } else {
          mergedMap.set(key, {
            ...exist,
            statut: item.statut === "VALIDE" ? "VALIDE" : exist.statut,
            localData: item.localData
          });
        }
      });

      const mergedHist = Array.from(mergedMap.values()).sort((a, b) => {
        if (Number(b.annee) !== Number(a.annee)) return Number(b.annee) - Number(a.annee);
        return Number(b.semaine) - Number(a.semaine);
      });
      setHistoriquePlannings(mergedHist);

      // Charger plannings des relais
      await chargerPlanningsDesRelais(activeProfile);

    } catch (err) {
      console.error("Erreur chargement plannings:", err);
    } finally {
      setLoading(false);
    }
  };

  // Chargement des plannings soumis par les Relais Communautaires (RC)
  const chargerPlanningsDesRelais = async (profileUser?: any) => {
    setLoadingPlanningsRelais(true);
    try {
      const ascqProfile = profileUser || currentUser;
      const ascqId = ascqProfile?.id;
      const arrId = ascqProfile?.arrondissement_id;

      let query = supabase
        .from("plannings_hebdo_relais")
        .select(`
          *,
          relais:relais_id (
            id, nom, prenoms, telephone, village, village_nom
          )
        `)
        .order("semaine_num", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);

      // Filtrer par ascq_id ou arrondissement si disponible
      if (ascqId && arrId) {
        query = query.or(`ascq_id.eq.${ascqId},arrondissement_id.eq.${arrId}`);
      } else if (ascqId) {
        query = query.eq("ascq_id", ascqId);
      }

      let planningsList: any[] = [];
      const { data, error } = await query;
      if (!error && data) {
        planningsList = data;
      } else {
        // Fallback sans jointure si le schéma relationnel est restreint
        const { data: fallbackData } = await supabase
          .from("plannings_hebdo_relais")
          .select("*")
          .order("semaine_num", { ascending: false })
          .limit(30);
        if (fallbackData) {
          planningsList = fallbackData;
        }
      }

      // Fusion avec les validations enregistrées localement (résilience schema cache)
      try {
        const allValids = JSON.parse(localStorage.getItem("all_validations_rc_plannings") || "{}");
        planningsList = planningsList.map((item) => {
          const localVal = allValids[item.id] || JSON.parse(localStorage.getItem(`validation_rc_planning_${item.id}`) || "null");
          if (localVal) {
            return {
              ...item,
              ...localVal,
              statut: localVal.statut || item.statut || "VALIDE",
              lu_et_approuve_ascq: localVal.lu_et_approuve_ascq ?? true,
              signature_ascq: localVal.signature_ascq || item.signature_ascq,
              date_validation_ascq: localVal.date_validation_ascq || item.date_validation_ascq,
              observations_ascq: localVal.observations_ascq ?? item.observations_ascq,
              valide_par_nom: localVal.valide_par_nom || item.valide_par_nom
            };
          }
          return item;
        });
      } catch (errLocal) {
        console.warn("Erreur fusion validations locales :", errLocal);
      }

      setPlanningsRelais(planningsList);
    } catch (e) {
      console.warn("Échec chargement plannings relais:", e);
    } finally {
      setLoadingPlanningsRelais(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [semaine, annee]);

  // Préparation des données complètes ASCQ pour le PDF
  const preparerDonneesAscqPdf = (): AscqPlanningData => {
    const autresValides = autresActivites.filter(a => a.nom && a.nom.trim());
    return {
      departement,
      commune,
      arrondissement,
      ascqNom,
      ascqPhone,
      semaine,
      annee,
      dateDebut: dates.debutFr,
      dateFin: dates.finFr,
      periodeLabel: dates.label,
      rcPlanifies: Number(rcPlanifies),
      rcAttendus: Number(rcAttendus),
      motifEcart: aEcartRc ? motifEcart.trim() : null,
      activitesJours,
      campagneTitre: campagneTitre.trim() || undefined,
      formationTitre: formationTitre.trim() || undefined,
      autresActivites: autresValides,
      autreActiviteNom: autresValides[0]?.nom || autreActiviteNom.trim() || undefined,
      autreActiviteJours: autresValides[0]?.jours || autreActiviteJours,
      observations: observations.trim() || undefined,
      signatureTactile,
      dateValidation: statutPlanning === "VALIDE" ? new Date().toLocaleDateString("fr-FR") : null,
      statut: statutPlanning
    };
  };

  // Génération du PDF vectoriel de l'ASCQ (A4 Paysage 1 Page)
  const genererEtOuvrirApercuAscq = async () => {
    setGeneratingPdf(true);
    try {
      const dataPdf = preparerDonneesAscqPdf();
      const pdfBytes = await generatePdfPlanningAscq(dataPdf);
      setPreviewPdfBytes(pdfBytes);
      const blobUrl = creerBlobPdfUrl(pdfBytes);
      setPreviewPdfBlobUrl(blobUrl);
      setModalApercuOuvert(true);
    } catch (err: any) {
      alert("Erreur lors de la génération du PDF vectoriel : " + (err.message || String(err)));
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Téléchargement direct du PDF ASCQ
  const telechargerPdfAscqDirect = async () => {
    try {
      const bytes = previewPdfBytes || (await generatePdfPlanningAscq(preparerDonneesAscqPdf()));
      const nomFichier = genererNomFichierPlanningAscq({
        semaine,
        annee,
        arrondissement,
        commune,
        ascqNom
      });
      await telechargerPdf(bytes, nomFichier);
    } catch (e: any) {
      alert("Erreur téléchargement PDF : " + e.message);
    }
  };

  // Impression native du PDF ASCQ
  const imprimerPdfAscqDirect = async () => {
    try {
      const bytes = previewPdfBytes || (await generatePdfPlanningAscq(preparerDonneesAscqPdf()));
      const nomFichier = genererNomFichierPlanningAscq({
        semaine,
        annee,
        arrondissement,
        commune,
        ascqNom
      });
      await imprimerPdf(bytes, nomFichier);
    } catch (e: any) {
      alert("Erreur impression PDF : " + e.message);
    }
  };

  // Enregistrement & Validation du planning ASCQ
  const enregistrerPlanning = async (valider: boolean = false) => {
    setSubmitting(true);
    setMessage(null);

    try {
      if (aEcartRc && !motifEcart.trim()) {
        throw new Error("Veuillez renseigner le motif de l'écart entre le nombre de RC planifiés et attendus.");
      }
      if ((activitesJours[8] || []).length > 0 && !campagneTitre.trim()) {
        campagneInputRef.current?.focus();
        throw new Error("Veuillez saisir le titre obligatoire de la campagne spécifique de santé publique avant de continuer.");
      }
      if ((activitesJours[10] || []).length > 0 && !formationTitre.trim()) {
        formationInputRef.current?.focus();
        throw new Error("Veuillez saisir le titre obligatoire de la formation avant de continuer.");
      }
      if (valider && !signatureTactile) {
        throw new Error("Veuillez apposer votre signature manuscrite tactile avant de valider officiellement le planning.");
      }

      let ascqId = currentUser?.id;
      if (!ascqId) {
        const { data: { user } } = await supabase.auth.getUser();
        ascqId = user?.id || getCachedUserSession()?.user?.id || getCachedMonEspace()?.id;
      }

      const donneesPlanning = {
        ascq_id: ascqId,
        semaine,
        annee,
        titre: `Planning Hebdo S${semaine} - ${commune} (${arrondissement})`,
        statut: valider ? "VALIDE" : "BROUILLON",
        date_debut: dates.debut,
        date_fin: dates.fin,
        rc_planifies: Number(rcPlanifies),
        rc_attendus: Number(rcAttendus),
        motif_ecart: aEcartRc ? motifEcart.trim() : null,
        observations: observations.trim(),
        signature_tactile: signatureTactile,
        date_validation: valider ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      // Sauvegarde dans la base Supabase si disponible (avec repli sur colonnes minimales garanties)
      try {
        let savedId: string | null = null;
        const { data: saved, error: upsertErr } = await supabase
          .from("plannings_ascq")
          .upsert(donneesPlanning, { onConflict: "ascq_id,annee,semaine" })
          .select("id")
          .maybeSingle();

        if (!upsertErr && saved?.id) {
          savedId = saved.id;
        } else {
          // Repli avec les colonnes de base si le cache de schéma ne contient pas encore rc_planifies/observations
          const basePayload = {
            ascq_id: ascqId,
            semaine,
            annee,
            titre: `Planning Hebdo S${semaine} - ${commune} (${arrondissement})`,
            statut: valider ? "VALIDE" : "BROUILLON",
            date_debut: dates.debut,
            date_fin: dates.fin,
            updated_at: new Date().toISOString(),
          };
          const { data: existRow } = await supabase
            .from("plannings_ascq")
            .select("id")
            .eq("ascq_id", ascqId)
            .eq("annee", annee)
            .eq("semaine", semaine)
            .maybeSingle();

          if (existRow?.id) {
            await supabase.from("plannings_ascq").update(basePayload).eq("id", existRow.id);
            savedId = existRow.id;
          } else {
            const { data: insertedRow } = await supabase
              .from("plannings_ascq")
              .insert(basePayload)
              .select("id")
              .maybeSingle();
            if (insertedRow?.id) savedId = insertedRow.id;
          }
        }

        if (savedId) {
          await supabase.from("lignes_planning_ascq").delete().eq("planning_id", savedId);
          const lignes = ACTIVITES_OFFICIELLES_CNLSTP.map((act, idx) => {
            const actNum = idx + 1;
            let activiteLabel = act;
            if (actNum === 8 && campagneTitre.trim()) {
              activiteLabel = `Campagne spécifique de santé publique (${campagneTitre.trim()})`;
            } else if (actNum === 10 && formationTitre.trim()) {
              activiteLabel = `Formation (${formationTitre.trim()})`;
            }
            return {
              planning_id: savedId,
              ordre: actNum,
              activite: activiteLabel,
              periode: (activitesJours[actNum] || []).join(", "),
              jour_semaine: (activitesJours[actNum] || []).join(", "),
              lieu: arrondissement,
              personnes_impliquees: "ASCQ / Relais Communautaires",
              objectifs: "Exécution des interventions communautaires prioritaires"
            };
          });

          const autresValides = autresActivites.filter(a => a.nom && a.nom.trim());
          autresValides.forEach((aut, aIdx) => {
            lignes.push({
              planning_id: savedId,
              ordre: 11 + aIdx,
              activite: aut.nom.trim(),
              periode: (aut.jours || []).join(", "),
              jour_semaine: (aut.jours || []).join(", "),
              lieu: arrondissement,
              personnes_impliquees: "ASCQ",
              objectifs: "Activité communautaire complémentaire"
            });
          });

          await supabase.from("lignes_planning_ascq").insert(lignes);
        }
      } catch (errDb) {
        console.warn("Enregistrement distant indisponible, sauvegarde locale active:", errDb);
      }

      // Toujours persister dans localStorage pour fiabilité tout-terrain et historique immédiat
      const localKey = `planning_cnlstp_${ascqId}_${annee}_${semaine}`;
      localStorage.setItem(localKey, JSON.stringify({
        ...donneesPlanning,
        rcPlanifies: Number(rcPlanifies),
        rcAttendus: Number(rcAttendus),
        motifEcart: aEcartRc ? motifEcart.trim() : null,
        activitesJours,
        campagneTitre: campagneTitre.trim(),
        formationTitre: formationTitre.trim(),
        autresActivites,
        autreActiviteNom: autresActivites[0]?.nom || "",
        autreActiviteJours: autresActivites[0]?.jours || [],
        signatureData: signatureTactile
      }));

      // Mettre à jour immédiatement la liste d'historique en mémoire
      await chargerDonnees();

      setStatutPlanning(valider ? "VALIDE" : "BROUILLON");
      setMessage({
        text: valider 
          ? `Planning officiel de la Semaine ${semaine} validé et signé avec succès !`
          : `Brouillon de la Semaine ${semaine} enregistré avec succès.`,
        error: false
      });

      // Ouvrir automatiquement l'aperçu PDF vectoriel si l'utilisateur valide
      if (valider) {
        await genererEtOuvrirApercuAscq();
      }

    } catch (err: any) {
      setMessage({ text: err.message || "Erreur lors de l'enregistrement.", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  // Convertit les données d'un planning Relais en RcPlanningData pour le PDF
  const mapperPlanningRcVersPdfData = (p: any): RcPlanningData => {
    const rcUser = p.relais || {};
    const nomRc = `${rcUser.prenoms || rcUser.prenom || ""} ${rcUser.nom || ""}`.trim() || p.nom_relais || "Relais Communautaire";
    const telRc = rcUser.telephone || p.telephone_relais || "-";
    const village = p.village_nom || rcUser.village || rcUser.village_nom || "Village";

    // Reconstitution des 8 activités du RC à partir des lignes JSON
    const lignes: any[] = Array.isArray(p.lignes_planning) ? p.lignes_planning : [];
    const actVad: RcPlanningSlot[] = [];
    const actCauserie: RcPlanningSlot[] = [];
    const actAnimale: RcPlanningSlot[] = [];
    const actSociales: RcPlanningSlot[] = [];
    const actFemmes: RcPlanningSlot[] = [];
    const actEnfants: RcPlanningSlot[] = [];
    const actReferees: RcPlanningSlot[] = [];
    const actAutres: RcPlanningSlot[] = [];

    lignes.forEach((l) => {
      const actNom = (l.activite || "").toLowerCase();
      const slot: RcPlanningSlot = {
        date: l.date || "Toute la semaine",
        heure: l.heure || "-",
        zone: l.lieu || l.zone || "Ménages grappe",
        qte: l.nombre_prevu || 1
      };

      if (actNom.includes("vad") || actNom.includes("visite")) {
        actVad.push(slot);
      } else if (actNom.includes("causerie") || actNom.includes("salubrité") || actNom.includes("sensibilisation")) {
        actCauserie.push(slot);
      } else if (actNom.includes("animale") || actNom.includes("one health")) {
        actAnimale.push(slot);
      } else if (actNom.includes("sociale") || actNom.includes("indigent")) {
        actSociales.push(slot);
      } else if (actNom.includes("femme") || actNom.includes("cpn") || actNom.includes("enceinte")) {
        actFemmes.push(slot);
      } else if (actNom.includes("enfant") || actNom.includes("0-59") || actNom.includes("vaccin")) {
        actEnfants.push(slot);
      } else if (actNom.includes("référ") || actNom.includes("refer")) {
        actReferees.push(slot);
      } else {
        actAutres.push(slot);
      }
    });

    const datesSem = getDatesSemaine(p.annee || annee, p.semaine_num || semaine);

    return {
      id: p.id,
      departement: departement,
      zoneSanitaire: `${commune} - Zone Sanitaire`,
      commune: commune,
      arrondissement: arrondissement,
      village: village,
      grappe: p.grappe || 1,
      rcName: nomRc,
      rcPhone: telRc,
      semaineNum: p.semaine_num || semaine,
      annee: p.annee || annee,
      dateDebutStr: datesSem.debutFr,
      dateFinStr: datesSem.finFr,
      act_vad: actVad,
      act_causerie: actCauserie,
      act_animale: actAnimale,
      act_sociales: actSociales,
      act_femmes: actFemmes,
      act_enfants: actEnfants,
      act_referees: actReferees,
      act_autres: actAutres,
      observations: p.observations || p.observations_relais || "Planning hebdomadaire transmis pour validation.",
      signatureRc: p.signature_rc || null,
      dateSoumissionRc: p.created_at ? new Date(p.created_at).toLocaleDateString("fr-FR") : null,
      luEtApprouveAscq: p.lu_et_approuve_ascq || p.statut === "VALIDE_ASCQ" || p.statut === "VALIDE",
      ascqName: p.valide_par_nom || ascqNom,
      ascqPhone: ascqPhone,
      dateValidationAscq: p.date_validation_ascq ? new Date(p.date_validation_ascq).toLocaleDateString("fr-FR") : null,
      signatureAscq: p.signature_ascq || null,
      observationsAscq: p.observations_ascq || null,
      statut: p.statut
    };
  };

  // Télécharger le PDF officiel d'un Relais
  const telechargerPdfRc = async (p: any) => {
    try {
      const dataPdf = mapperPlanningRcVersPdfData(p);
      const bytes = await generatePdfPlanningRc(dataPdf);
      const nom = genererNomFichierPlanningRc({
        semaineNum: p.semaine_num || p.semaine || dataPdf.semaineNum,
        annee: p.annee || dataPdf.annee,
        arrondissement: p.arrondissement_nom || p.arrondissement || dataPdf.arrondissement,
        village: p.village_nom || p.village || dataPdf.village,
        rcName: p.rc_nom || p.relais_nom || p.nom_complet || dataPdf.rcName
      });
      await telechargerPdf(bytes, nom);
    } catch (e: any) {
      alert("Erreur lors de la génération du PDF RC : " + e.message);
    }
  };

  // Imprimer le PDF officiel d'un Relais
  const imprimerPdfRc = async (p: any) => {
    try {
      const dataPdf = mapperPlanningRcVersPdfData(p);
      const bytes = await generatePdfPlanningRc(dataPdf);
      const nom = genererNomFichierPlanningRc({
        semaineNum: p.semaine_num || p.semaine || dataPdf.semaineNum,
        annee: p.annee || dataPdf.annee,
        arrondissement: p.arrondissement_nom || p.arrondissement || dataPdf.arrondissement,
        village: p.village_nom || p.village || dataPdf.village,
        rcName: p.rc_nom || p.relais_nom || p.nom_complet || dataPdf.rcName
      });
      await imprimerPdf(bytes, nom);
    } catch (e: any) {
      alert("Erreur lors de l'impression du PDF RC : " + e.message);
    }
  };

  // Ouvrir l'aperçu PDF vectoriel d'un Relais
  const ouvrirApercuPdfRc = async (p: any) => {
    try {
      const dataPdf = mapperPlanningRcVersPdfData(p);
      const bytes = await generatePdfPlanningRc(dataPdf);
      setPreviewRcPdfBytes(bytes);
      const blobUrl = creerBlobPdfUrl(bytes);
      setPreviewRcPdfUrl(blobUrl);
      setSelectedRcPlanning(p);
      setModalApercuRcOuvert(true);
    } catch (e: any) {
      alert("Erreur aperçu PDF RC : " + e.message);
    }
  };

  // Validation & Signature d'un planning Relais par l'ASCQ
  const validerEtSignerPlanningRc = async (approuve: boolean) => {
    if (!selectedRcPlanning) return;
    if (approuve && !signatureAscqValidationRc) {
      alert("Veuillez apposer votre signature tactile pour certifier la validation du planning du Relais.");
      return;
    }

    setValidatingRcPlanning(true);
    try {
      const planningId = selectedRcPlanning.id;

      // 1. Tenter l'appel RPC sécurisé
      let rpcOk = false;
      try {
        const { data, error } = await supabase.rpc("valider_planning_hebdo_rc_par_ascq", {
          p_planning_id: planningId,
          p_approuve: approuve,
          p_signature_ascq: signatureAscqValidationRc,
          p_observations_ascq: observationsAscqValidationRc.trim() || null,
          p_valide_par_nom: ascqNom
        });
        if (!error && data?.success) {
          rpcOk = true;
        }
      } catch (errRpc) {
        console.warn("RPC indisponible, tentative de mise à jour directe :", errRpc);
      }

      // 2. Repli direct sur la table si la RPC n'est pas encore synchronisée
      if (!rpcOk) {
        let updReussi = false;
        try {
          const { error: updErr } = await supabase
            .from("plannings_hebdo_relais")
            .update({
              lu_et_approuve_ascq: approuve,
              statut: approuve ? "VALIDE" : "BROUILLON",
              signature_ascq: approuve ? signatureAscqValidationRc : null,
              date_validation_ascq: approuve ? new Date().toISOString() : null,
              observations_ascq: observationsAscqValidationRc.trim() || null,
              valide_par_nom: ascqNom,
              ascq_id: currentUser?.id || null,
              updated_at: new Date().toISOString()
            })
            .eq("id", planningId);

          if (!updErr) {
            updReussi = true;
          } else {
            console.warn("Mise à jour complète avec nouvelles colonnes refusée, tentative minimale :", updErr);
          }
        } catch (e) {
          console.warn("Exception lors de la mise à jour complète :", e);
        }

        // Si la mise à jour complète échoue (par exemple colonne date_validation_ascq absente du cache de schéma),
        // mise à jour avec les colonnes minimales garanties dans la table
        if (!updReussi) {
          const { error: minErr } = await supabase
            .from("plannings_hebdo_relais")
            .update({
              statut: approuve ? "VALIDE" : "BROUILLON",
              ascq_id: currentUser?.id || null,
              updated_at: new Date().toISOString()
            })
            .eq("id", planningId);

          if (minErr) {
            console.warn("Mise à jour minimale Supabase échouée (sauvegarde locale maintenue) :", minErr);
          }
        }
      }

      // 3. Sauvegarde locale infaillible des métadonnées de validation (accessible hors-ligne et résiliente)
      const validationMeta = {
        planning_id: planningId,
        statut: approuve ? "VALIDE" : "REJETE",
        lu_et_approuve_ascq: approuve,
        signature_ascq: approuve ? signatureAscqValidationRc : null,
        date_validation_ascq: approuve ? new Date().toISOString() : null,
        observations_ascq: observationsAscqValidationRc.trim() || null,
        valide_par_nom: ascqNom,
        ascq_id: currentUser?.id || null,
        updated_at: new Date().toISOString()
      };

      try {
        localStorage.setItem(`validation_rc_planning_${planningId}`, JSON.stringify(validationMeta));
        const allValids = JSON.parse(localStorage.getItem("all_validations_rc_plannings") || "{}");
        allValids[planningId] = validationMeta;
        localStorage.setItem("all_validations_rc_plannings", JSON.stringify(allValids));

        // Déclencher un événement local pour synchroniser les vues
        window.dispatchEvent(new CustomEvent("rc_planning_valide", { detail: validationMeta }));
      } catch (eLocal) {
        console.warn("Erreur stockage validation locale :", eLocal);
      }

      alert(approuve 
        ? "✅ Le planning du Relais Communautaire a été validé et signé avec succès ! Le document officiel est immédiatement mis à disposition du Relais."
        : "Le planning a été renvoyé avec vos observations.");

      setModalRcPlanningOuvert(false);
      setSelectedRcPlanning(null);
      setSignatureAscqValidationRc(null);
      setObservationsAscqValidationRc("");

      // Recharger la liste des plannings
      await chargerPlanningsDesRelais();

    } catch (err: any) {
      alert("Erreur lors de la validation : " + (err.message || String(err)));
    } finally {
      setValidatingRcPlanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-16">
      
      {/* Navigation supérieure */}
      <AscqNav userProfile={currentUser} />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
        
        {/* ========================================================================= */}
        {/* BARRE D'ONGLETS OFFICIELLE (Conforme à la capture d'écran validée)        */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200/90 shadow-sm flex items-center justify-between gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setOngletActif("formulaire")}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              ongletActif === "formulaire"
                ? "bg-[#005c30] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Saisir mon Planning</span>
          </button>

          <button
            type="button"
            onClick={() => setOngletActif("historique")}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              ongletActif === "historique"
                ? "bg-[#005c30] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Historique des Plannings</span>
          </button>

          <button
            type="button"
            onClick={() => setOngletActif("plannings_rc")}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 relative ${
              ongletActif === "plannings_rc"
                ? "bg-[#005c30] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Plannings de mes Relais (RC)</span>
            {planningsRelais.filter(p => !p.lu_et_approuve_ascq && p.statut !== "VALIDE_ASCQ").length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-2 right-2 animate-pulse"></span>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* ONGLET 1 : FORMULAIRE DE SAISIE DE L'ASCQ (Sections 1 à 6)                */}
        {/* ========================================================================= */}
        {ongletActif === "formulaire" && (
          <div className="space-y-5">
            {/* Bannière officielle CNLS-TP & Présidence du Bénin */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full max-w-lg h-14 shrink-0">
                  <Image 
                    src="/banniere-cnlstp.png" 
                    alt="CNLS-TP Présidence du Bénin" 
                    fill 
                    className="object-contain object-left" 
                    priority
                  />
                </div>
                <div className="flex items-center gap-3 text-right shrink-0">
                  <div className="flex flex-col text-xs font-bold text-slate-800 leading-tight">
                    <span className="font-mono font-extrabold text-slate-900">0141285050/0196830551</span>
                    <span className="text-[11px] text-slate-600 font-semibold lowercase">ascqbenin@gmail.com</span>
                  </div>
                  <div className="relative w-14 h-14 shrink-0">
                    <Image 
                      src="/logo-ascq.png" 
                      alt="ASC Santé Communautaire Bénin" 
                      fill 
                      className="object-contain object-right" 
                      priority
                    />
                  </div>
                </div>
              </div>
              <div className="h-[2px] bg-[#008751] w-full mt-3"></div>
            </div>

            {/* Titre & Actions A4 Paysage */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-[#005c30]">
                      Modèle Officiel Validé • CNLS-TP
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      statutPlanning === "VALIDE" ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-800"
                    }`}>
                      {statutPlanning === "VALIDE" ? "Planning Validé" : "Brouillon"}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                    PLANNING HEBDOMADAIRE DES ASCQ
                  </h1>
                  <p className="text-xs text-slate-500">
                    Agents de santé communautaire qualifiés • Rendu vectoriel strict sur 1 page A4 Paysage.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={genererEtOuvrirApercuAscq}
                    disabled={generatingPdf}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs shadow-sm active:scale-95 transition-all"
                    title="Aperçu fidèle du PDF 1 page A4 Paysage"
                  >
                    {generatingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    <span>Aperçu Fidèle A4</span>
                  </button>

                  <button
                    type="button"
                    onClick={imprimerPdfAscqDirect}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-sm active:scale-95 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimer (A4)</span>
                  </button>

                  <button
                    type="button"
                    onClick={telechargerPdfAscqDirect}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs shadow-sm active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger</span>
                  </button>
                </div>
              </div>

              {/* Message de notification */}
              {message && (
                <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  message.error ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}>
                  {message.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}
            </div>

            {/* FORMULAIRE OFFICIEL DE SAISIE */}
            <form onSubmit={(e) => { e.preventDefault(); enregistrerPlanning(false); }} className="space-y-5">

              {/* SECTION 1 – Identification */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#005c30] text-xs font-black flex items-center justify-center">1</span>
                  <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                    SECTION 1 — IDENTIFICATION
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Département *</span>
                      <span className="text-[10px] bg-emerald-100 text-[#005c30] px-1.5 py-0.5 rounded font-extrabold">Phase Pilote</span>
                    </label>
                    <select
                      value={departement}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!estDepartementPilote(val)) {
                          alert("Seul le département du ZOU est ouvert pour la phase pilote.");
                          return;
                        }
                        setDepartement(val);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#005c30]"
                      required
                    >
                      <option value="Zou">⭐ Zou (Département Pilote Actif)</option>
                      <option value="Alibori" disabled>🔒 Alibori (Verrouillé - Phase pilote Zou)</option>
                      <option value="Atacora" disabled>🔒 Atacora (Verrouillé - Phase pilote Zou)</option>
                      <option value="Atlantique" disabled>🔒 Atlantique (Verrouillé - Phase pilote Zou)</option>
                      <option value="Borgou" disabled>🔒 Borgou (Verrouillé - Phase pilote Zou)</option>
                      <option value="Collines" disabled>🔒 Collines (Verrouillé - Phase pilote Zou)</option>
                      <option value="Couffo" disabled>🔒 Couffo (Verrouillé - Phase pilote Zou)</option>
                      <option value="Donga" disabled>🔒 Donga (Verrouillé - Phase pilote Zou)</option>
                      <option value="Littoral" disabled>🔒 Littoral (Verrouillé - Phase pilote Zou)</option>
                      <option value="Mono" disabled>🔒 Mono (Verrouillé - Phase pilote Zou)</option>
                      <option value="Ouémé" disabled>🔒 Ouémé (Verrouillé - Phase pilote Zou)</option>
                      <option value="Plateau" disabled>🔒 Plateau (Verrouillé - Phase pilote Zou)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Commune *</label>
                    <select
                      value={commune}
                      onChange={(e) => setCommune(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#005c30]"
                      required
                    >
                      {PILOTE_CONFIG.communesZou.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Arrondissement *</label>
                    <input
                      type="text"
                      value={arrondissement}
                      onChange={(e) => setArrondissement(e.target.value)}
                      placeholder="Ex: Tohouès"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#005c30]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nom et Prénoms de l'ASCQ *</label>
                    <input
                      type="text"
                      value={ascqNom}
                      onChange={(e) => setAscqNom(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contact téléphonique (Flotte / Perso)</label>
                    <input
                      type="tel"
                      value={ascqPhone}
                      onChange={(e) => setAscqPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Début semaine (Lundi) *</label>
                    <input
                      type="date"
                      value={dates.debut}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Période calculée</label>
                    <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 truncate">
                      {dates.label}
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Semaine N° (ISO)</label>
                    <select
                      value={semaine}
                      onChange={(e) => setSemaine(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-[#005c30]"
                    >
                      {Array.from({ length: 52 }, (_, i) => i + 1).map((s) => (
                        <option key={s} value={s}>
                          Semaine {s} {s === getSemaineActuelle() ? "(Actuelle)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2 – Relais Communautaires (RC) */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#005c30] text-xs font-black flex items-center justify-center">2</span>
                  <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                    SECTION 2 — RELAIS COMMUNAUTAIRES (RC)
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nombre de RC planifiés *</label>
                    <input
                      type="number"
                      min={0}
                      value={rcPlanifies}
                      onChange={(e) => setRcPlanifies(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nombre de RC attendus dans l'arrondissement *</label>
                    <input
                      type="number"
                      min={0}
                      value={rcAttendus}
                      onChange={(e) => setRcAttendus(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                      required
                    />
                  </div>
                </div>

                {/* Motif de l'écart affiché obligatoirement si différent */}
                {aEcartRc && (
                  <div className="bg-red-50 rounded-2xl p-4 border border-red-200 space-y-1 text-xs">
                    <label className="block font-black text-red-700">
                      Motif de l'écart * (Obligatoire : {rcPlanifies} planifié(s) vs {rcAttendus} attendu(s))
                    </label>
                    <input
                      type="text"
                      value={motifEcart}
                      onChange={(e) => setMotifEcart(e.target.value)}
                      placeholder="Ex: Un RC malade, congé maternité, mission externe..."
                      className="w-full bg-white border border-red-300 rounded-xl px-3 py-2 font-medium text-red-900 focus:ring-2 focus:ring-red-400"
                      required
                    />
                  </div>
                )}
              </div>

              {/* SECTION 3 – Activités de la semaine (10 activités avec Lun..Dim) */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#005c30] text-xs font-black flex items-center justify-center">3</span>
                    <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                      SECTION 3 — ACTIVITÉS DE LA SEMAINE
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-500">Cochez les jours prévus pour chaque activité</span>
                </div>

                <div className="space-y-2.5">
                  {ACTIVITES_OFFICIELLES_CNLSTP.map((act, idx) => {
                    const actNum = idx + 1;
                    const selectionnes = activitesJours[actNum] || [];
                    const estCampagne = actNum === 8;
                    const estFormation = actNum === 10;
                    const titreSpecifique = estCampagne ? campagneTitre : estFormation ? formationTitre : "";
                    const libelleAffiche =
                      (estCampagne || estFormation) && titreSpecifique.trim()
                        ? `${act} (${titreSpecifique.trim()})`
                        : act;

                    return (
                      <div 
                        key={actNum}
                        className="p-3 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-200/70 transition-all space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-2 sm:max-w-[45%]">
                            <span className="font-bold text-xs text-slate-500 shrink-0">{actNum}.</span>
                            <span className="font-bold text-xs text-slate-800 whitespace-normal break-words leading-snug">
                              {libelleAffiche}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {JOURS_ABREV.map((j) => {
                              const actif = selectionnes.includes(j);
                              return (
                                <button
                                  key={j}
                                  type="button"
                                  onClick={() => toggleJourActivite(actNum, j)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                    actif
                                      ? "bg-[#005c30] text-white shadow-sm scale-105"
                                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  {j}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {estCampagne && selectionnes.length > 0 && (
                          <div
                            className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                              !campagneTitre.trim()
                                ? "bg-amber-50 border-amber-300"
                                : "bg-emerald-50/50 border-emerald-200"
                            }`}
                          >
                            <label className="font-bold text-slate-800 block">
                              Titre de la campagne spécifique de santé publique <span className="text-red-600">*</span>
                            </label>
                            <input
                              ref={campagneInputRef}
                              type="text"
                              value={campagneTitre}
                              onChange={(e) => setCampagneTitre(e.target.value)}
                              placeholder="Ex: Campagne de distribution de MILDA / Chimio-prévention..."
                              required
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        )}

                        {estFormation && selectionnes.length > 0 && (
                          <div
                            className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                              !formationTitre.trim()
                                ? "bg-amber-50 border-amber-300"
                                : "bg-emerald-50/50 border-emerald-200"
                            }`}
                          >
                            <label className="font-bold text-slate-800 block">
                              Titre de la formation (ASCQ ou RC) <span className="text-red-600">*</span>
                            </label>
                            <input
                              ref={formationInputRef}
                              type="text"
                              value={formationTitre}
                              onChange={(e) => setFormationTitre(e.target.value)}
                              placeholder="Ex: Formation iCCM / Surveillance épidémiologique..."
                              required
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4 – Autres activités (Possibilité d'en ajouter plusieurs) */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#005c30] text-xs font-black flex items-center justify-center">4</span>
                    <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                      SECTION 4 — AUTRES ACTIVITÉS ({autresActivites.length})
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={ajouterAutreActivite}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] border border-emerald-200 font-extrabold text-xs transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Ajouter une autre activité</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {autresActivites.map((aut, idx) => (
                    <div key={aut.id} className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <label className="font-bold text-slate-700">
                          Activité complémentaire n° {11 + idx}
                        </label>
                        {autresActivites.length > 1 && (
                          <button
                            type="button"
                            onClick={() => supprimerAutreActivite(aut.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 font-bold text-[11px] transition-colors"
                            title="Supprimer cette activité"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Retirer</span>
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={aut.nom}
                        onChange={(e) => modifierNomAutreActivite(aut.id, e.target.value)}
                        placeholder="Ex: Réunion de coordination mensuelle avec le CCLS-TP, campagne spécifique..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-[#005c30]"
                      />

                      <div className="pt-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="font-bold text-slate-700">Jours prévus :</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {JOURS_ABREV.map((j) => {
                            const actif = aut.jours.includes(j);
                            return (
                              <button
                                key={j}
                                type="button"
                                onClick={() => toggleJourAutreActivite(aut.id, j)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                  actif
                                    ? "bg-[#005c30] text-white shadow-sm scale-105"
                                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {j}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 5 – Observations générales */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#005c30] text-xs font-black flex items-center justify-center">5</span>
                  <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                    SECTION 5 — OBSERVATIONS GÉNÉRALES
                  </h2>
                </div>

                <div className="text-xs">
                  <textarea
                    rows={3}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="RAS, contraintes de terrain, matériels nécessaires..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* SECTION 6 – Validation & Signature tactile exclusive de l'ASCQ */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#005c30] text-xs font-black flex items-center justify-center">6</span>
                  <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                    SECTION 6 — VALIDATION & SIGNATURE
                  </h2>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-600 font-medium">
                    Signature manuscrite de l'ASCQ * :
                  </p>
                  
                  <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200 max-w-lg mx-auto">
                    <SignatureCanvas
                      onChange={(dataUrl) => setSignatureTactile(dataUrl)}
                      initialData={signatureTactile || undefined}
                    />
                  </div>
                </div>
              </div>

              {/* Bouton d'action principal pleine largeur (Exactement comme sur la capture) */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => enregistrerPlanning(true)}
                  className="w-full py-4 px-6 rounded-2xl bg-[#005c30] hover:bg-[#004724] active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Validation et génération en cours...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 text-emerald-300 stroke-[3]" />
                      <span>Valider et envoyer le planning</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 2 : HISTORIQUE DES PLANNINGS DE L'ASCQ                             */}
        {/* ========================================================================= */}
        {ongletActif === "historique" && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">Historique de mes Plannings Hebdomadaires</h2>
                <p className="text-xs text-slate-500">Consultez, téléchargez ou réimprimez vos fiches officielles</p>
              </div>
              <button
                type="button"
                onClick={chargerDonnees}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                title="Actualiser"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {historiquePlannings.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Aucun planning enregistré pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {historiquePlannings.map((p) => (
                  <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          Semaine Épidémiologique {p.semaine} ({p.annee})
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.statut === "VALIDE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {p.statut === "VALIDE" ? "Validé" : "Brouillon"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Période : {p.date_debut} au {p.date_fin}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSemaine(p.semaine);
                          setAnnee(p.annee);
                          setOngletActif("formulaire");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ouvrir</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          setSemaine(p.semaine);
                          setAnnee(p.annee);
                          await genererEtOuvrirApercuAscq();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-bold transition flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Aperçu PDF</span>
                      </button>

                      <BoutonSuppressionSecurisee
                        titreElement={`Planning ASCQ — Semaine ${p.semaine} (${p.annee})`}
                        typeElement="ce planning hebdomadaire ASCQ"
                        onConfirmerSuppression={() => handleSupprimerPlanningAscq(p)}
                        variant="compact"
                        label="Supprimer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 3 : PLANNINGS DES RELAIS COMMUNAUTAIRES (RC) & VALIDATION ASCQ      */}
        {/* ========================================================================= */}
        {ongletActif === "plannings_rc" && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-[#005c30]">
                    Supervision & Visa ASCQ
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                  Plannings Hebdomadaires des Relais Communautaires (RC)
                </h2>
                <p className="text-xs text-slate-500">
                  Examinez, apposez votre signature tactile et validez officiellement le planning de chaque Relais.
                </p>
              </div>

              <button
                type="button"
                onClick={() => chargerPlanningsDesRelais()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPlanningsRelais ? "animate-spin" : ""}`} />
                <span>Actualiser les plannings</span>
              </button>
            </div>

            {loadingPlanningsRelais ? (
              <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#005c30]" />
                <span>Chargement des plannings des Relais...</span>
              </div>
            ) : planningsRelais.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-slate-500 text-xs font-bold">
                  Aucun planning de Relais Communautaire reçu pour le moment.
                </p>
                <p className="text-slate-400 text-[11px]">
                  Dès qu'un Relais de votre arrondissement transmet son planning hebdomadaire, il apparaîtra ici pour signature.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {planningsRelais.map((p) => {
                  const rcUser = p.relais || {};
                  const nomRc = `${rcUser.prenoms || rcUser.prenom || ""} ${rcUser.nom || ""}`.trim() || p.nom_relais || "Relais Communautaire";
                  const village = p.village_nom || rcUser.village || rcUser.village_nom || "Village";
                  const estValide = p.lu_et_approuve_ascq || p.statut === "VALIDE_ASCQ" || p.statut === "VALIDE";
                  const totalPrev = p.total_prevu || (Array.isArray(p.lignes_planning) ? p.lignes_planning.reduce((acc: number, l: any) => acc + (Number(l.nombre_prevu) || 0), 0) : 0);

                  return (
                    <div 
                      key={p.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        estValide 
                          ? "bg-white border-slate-200/90 shadow-sm"
                          : "bg-amber-50/40 border-amber-300 shadow-sm"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-slate-900">
                              {nomRc.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-500">• {village} (Grappe {p.grappe || 1})</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              estValide
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-amber-200 text-amber-900 border border-amber-300 animate-pulse"
                            }`}>
                              {estValide ? "✓ Validé & Signé par ASCQ" : "⏳ En attente de signature ASCQ"}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
                            <span><strong>Semaine Épidémio :</strong> {p.semaine_num} ({p.annee})</span>
                            <span><strong>Activités prévues :</strong> {totalPrev}</span>
                            {p.date_validation_ascq && (
                              <span className="text-emerald-700">
                                <strong>Validé le :</strong> {new Date(p.date_validation_ascq).toLocaleDateString("fr-FR")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Boutons d'action pour le planning du RC */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {!estValide ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRcPlanning(p);
                                setSignatureAscqValidationRc(null);
                                setObservationsAscqValidationRc("");
                                setModalRcPlanningOuvert(true);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-black shadow-sm transition flex items-center gap-1.5 active:scale-95"
                            >
                              <UserCheck className="w-4 h-4" />
                              <span>Examiner & Signer</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRcPlanning(p);
                                setSignatureAscqValidationRc(p.signature_ascq || null);
                                setObservationsAscqValidationRc(p.observations_ascq || "");
                                setModalRcPlanningOuvert(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Détails</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => ouvrirApercuPdfRc(p)}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition flex items-center gap-1"
                            title="Aperçu du PDF officiel A4 Paysage"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Aperçu A4</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => telechargerPdfRc(p)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition flex items-center gap-1"
                            title="Télécharger le PDF A4 Paysage"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => imprimerPdfRc(p)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="Imprimer directement"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <BoutonSuppressionSecurisee
                            titreElement={`Planning RC ${nomRc} — Semaine ${p.semaine_num} (${p.annee})`}
                            typeElement="ce planning de Relais Communautaire"
                            onConfirmerSuppression={() => handleSupprimerPlanningRc(p)}
                            variant="icon"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL 1 : APERÇU FIDÈLE OFFICIEL DU PLANNING ASCQ (PDF VECTORIEL 1 PAGE)  */}
      {/* ========================================================================= */}
      {modalApercuOuvert && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col p-2 sm:p-4">
          
          {/* Barre d'outils supérieure */}
          <div className="bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-between gap-3 shadow-lg max-w-5xl w-full mx-auto mb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
              <span className="font-black text-xs sm:text-sm">
                PDF Officiel A4 Paysage (1 Page) — ASCQ Semaine {semaine} ({annee})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={telechargerPdfAscqDirect}
                className="px-3.5 py-1.5 bg-[#005c30] hover:bg-[#004724] text-white text-xs font-black rounded-xl shadow transition flex items-center gap-1.5 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger (PDF)</span>
              </button>

              <button
                type="button"
                onClick={imprimerPdfAscqDirect}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow transition flex items-center gap-1.5 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer</span>
              </button>

              <button
                type="button"
                onClick={() => setModalApercuOuvert(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Barre d'ouverture multi-applications (PDF Reader, Google Drive, WhatsApp...) */}
          <div className="max-w-5xl w-full mx-auto mb-2">
            <SelecteurAppLecturePdf
              blobUrl={previewPdfBlobUrl}
              pdfBytes={previewPdfBytes}
              nomFichier={genererNomFichierPlanningAscq({ semaine, annee, arrondissement, commune, ascqNom })}
              titreDocument={`Planning Hebdomadaire ASCQ Semaine ${semaine} (${annee})`}
            />
          </div>

          {/* Rendu du PDF dans iframe intégrée */}
          <div className="flex-1 max-w-5xl w-full mx-auto bg-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {previewPdfBlobUrl ? (
              <iframe
                src={previewPdfBlobUrl}
                className="w-full flex-1 border-none rounded-2xl bg-white"
                title="Aperçu PDF officiel A4 Paysage ASCQ"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-white text-xs">
                Génération du document en cours...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2 : EXAMEN & VALIDATION DU PLANNING DU RELAIS (RC) PAR L'ASCQ        */}
      {/* ========================================================================= */}
      {modalRcPlanningOuvert && selectedRcPlanning && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-[#005c30]">
                  Visa & Validation Superviseur
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  Planning du Relais : {(selectedRcPlanning.relais?.nom || selectedRcPlanning.nom_relais || "RC").toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500">
                  Semaine {selectedRcPlanning.semaine_num} ({selectedRcPlanning.annee}) • Village : {selectedRcPlanning.village_nom || "Village"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalRcPlanningOuvert(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Liste des activités planifiées par le Relais */}
            <div className="space-y-2 max-h-56 overflow-y-auto p-1 text-xs">
              <div className="font-bold text-slate-700">Activités renseignées dans le planning :</div>
              {Array.isArray(selectedRcPlanning.lignes_planning) && selectedRcPlanning.lignes_planning.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedRcPlanning.lignes_planning.map((l: any, i: number) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{l.activite}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="font-semibold text-slate-700">{l.date ? `📅 Date : ${l.date}` : "📅 Toute la semaine"}</span>
                          {l.heure && (
                            <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              ⏰ Heure : {l.heure}
                            </span>
                          )}
                          <span>📍 Lieu : {l.lieu || l.zone || "Ménages"}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-[#005c30] font-black text-xs">
                        Qté : {l.nombre_prevu || 1}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">Aucune activité détaillée renseignée.</p>
              )}
            </div>

            {/* Observations de l'ASCQ */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">
                Observations ou Recommandations de l'ASCQ (Optionnel) :
              </label>
              <textarea
                rows={2}
                value={observationsAscqValidationRc}
                onChange={(e) => setObservationsAscqValidationRc(e.target.value)}
                placeholder="Ex: Planning validé. Veiller au respect scrupuleux des créneaux de VAD..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
              />
            </div>

            {/* Zone de signature manuscrite de l'ASCQ */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 text-xs">
                Votre Signature Tactile pour Validation Officielle * :
              </label>
              <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <SignatureCanvas
                  onChange={(dUrl) => setSignatureAscqValidationRc(dUrl)}
                  initialData={signatureAscqValidationRc || undefined}
                />
              </div>
            </div>

            {/* Boutons de validation */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={validatingRcPlanning}
                onClick={() => validerEtSignerPlanningRc(true)}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-black shadow-md transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {validatingRcPlanning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                )}
                <span>Valider et Signer le Planning du RC</span>
              </button>

              <button
                type="button"
                disabled={validatingRcPlanning}
                onClick={() => validerEtSignerPlanningRc(false)}
                className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Rejeter avec observations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3 : APERÇU FIDÈLE OFFICIEL DU PLANNING RC (PDF VECTORIEL 1 PAGE)    */}
      {/* ========================================================================= */}
      {modalApercuRcOuvert && selectedRcPlanning && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col p-2 sm:p-4">
          <div className="bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-between gap-3 shadow-lg max-w-5xl w-full mx-auto mb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
              <span className="font-black text-xs sm:text-sm">
                PDF Officiel RC (A4 Paysage 1 Page) — Semaine {selectedRcPlanning.semaine_num}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => telechargerPdfRc(selectedRcPlanning)}
                className="px-3.5 py-1.5 bg-[#005c30] hover:bg-[#004724] text-white text-xs font-black rounded-xl shadow transition flex items-center gap-1.5 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => imprimerPdfRc(selectedRcPlanning)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow transition flex items-center gap-1.5 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer</span>
              </button>

              <button
                type="button"
                onClick={() => setModalApercuRcOuvert(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-w-5xl w-full mx-auto mb-2">
            <SelecteurAppLecturePdf
              blobUrl={previewRcPdfUrl}
              pdfBytes={previewRcPdfBytes}
              nomFichier={`Planning_RC_S${selectedRcPlanning.semaine_num}_${selectedRcPlanning.annee}.pdf`}
              titreDocument={`Planning Hebdomadaire RC Semaine ${selectedRcPlanning.semaine_num}`}
            />
          </div>

          <div className="flex-1 max-w-5xl w-full mx-auto bg-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {previewRcPdfUrl ? (
              <iframe
                src={previewRcPdfUrl}
                className="w-full flex-1 border-none rounded-2xl bg-white"
                title="Aperçu PDF officiel A4 Paysage Relais"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-white text-xs">
                Génération du document en cours...
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
