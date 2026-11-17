"use client";

import { useState, useEffect, useMemo } from "react";
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
  X
} from "lucide-react";
import AscqNav from "@/components/AscqNav";
import SignatureCanvas from "@/components/SignatureCanvas";
import { getCachedUserSession, getCachedMonEspace } from "@/lib/offline-sync";

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
  "Formation continue des RC"
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
  const [ongletActif, setOngletActif] = useState<"formulaire" | "historique">("formulaire");
  const [modalApercuOuvert, setModalApercuOuvert] = useState(false);
  const [historiquePlannings, setHistoriquePlannings] = useState<any[]>([]);

  // 1. Identification & Période
  const anneeActuelle = new Date().getFullYear();
  const [annee, setAnnee] = useState<number>(anneeActuelle);
  const [semaine, setSemaine] = useState<number>(getSemaineActuelle());
  const dates = useMemo(() => getDatesSemaine(annee, semaine), [annee, semaine]);

  const [departement, setDepartement] = useState<string>("OUÉMÉ");
  const [commune, setCommune] = useState<string>("ADJARRA");
  const [arrondissement, setArrondissement] = useState<string>("HONVIÉ");
  const [ascqNom, setAscqNom] = useState<string>("");
  const [ascqPhone, setAscqPhone] = useState<string>("");

  // 2. Relais Communautaires
  const [rcPlanifies, setRcPlanifies] = useState<number>(10);
  const [rcAttendus, setRcAttendus] = useState<number>(10);
  const [motifEcart, setMotifEcart] = useState<string>("");
  const aEcartRc = useMemo(() => Number(rcPlanifies) !== Number(rcAttendus), [rcPlanifies, rcAttendus]);

  // 3. Activités de la semaine (mapping des 10 activités avec leurs jours sélectionnés)
  const [activitesJours, setActivitesJours] = useState<Record<number, string[]>>({
    1: ["Lun", "Mer"],
    2: ["Mar", "Jeu"],
    3: ["Ven"],
    4: ["Lun", "Ven"],
    5: ["Mar", "Mer", "Jeu"],
    6: ["Mer"],
    7: ["Lun", "Mar", "Mer", "Jeu", "Ven"],
    8: [],
    9: ["Ven"],
    10: ["Sam"]
  });

  // 4. Autre activité optionnelle
  const [autreActiviteNom, setAutreActiviteNom] = useState<string>("");
  const [autreActiviteJours, setAutreActiviteJours] = useState<string[]>([]);

  // 5. Observations générales
  const [observations, setObservations] = useState<string>("Surveillance communautaire active et coordination de terrain assurées.");

  // 6. Signature manuscrite de l'ASCQ
  const [signatureTactile, setSignatureTactile] = useState<string | null>(null);
  const [statutPlanning, setStatutPlanning] = useState<"BROUILLON" | "VALIDE">("BROUILLON");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Basculer un jour pour une activité donnée
  const toggleJourActivite = (actIdx: number, jour: string) => {
    setActivitesJours(prev => {
      const existants = prev[actIdx] || [];
      const nouveau = existants.includes(jour)
        ? existants.filter(j => j !== jour)
        : [...existants, jour];
      return { ...prev, [actIdx]: nouveau };
    });
  };

  const toggleJourAutre = (jour: string) => {
    setAutreActiviteJours(prev => 
      prev.includes(jour) ? prev.filter(j => j !== jour) : [...prev, jour]
    );
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

      // Charger le planning sauvegardé pour cette semaine et année
      try {
        const uid = user?.id || activeProfile.id;
        const { data: existant } = await supabase
          .from("plannings_ascq")
          .select("*, lignes_planning_ascq(*)")
          .eq("ascq_id", uid)
          .eq("annee", annee)
          .eq("semaine", semaine)
          .maybeSingle();

        if (existant) {
          setStatutPlanning(existant.statut || "BROUILLON");
          if (existant.signature_tactile) setSignatureTactile(existant.signature_tactile);
          if (existant.observations) setObservations(existant.observations);
          if (existant.rc_planifies !== undefined) setRcPlanifies(existant.rc_planifies);
          if (existant.rc_attendus !== undefined) setRcAttendus(existant.rc_attendus);
          if (existant.motif_ecart) setMotifEcart(existant.motif_ecart);

          // Reconstitution des jours cochés à partir des lignes
          if (existant.lignes_planning_ascq && existant.lignes_planning_ascq.length > 0) {
            const nouvJours: Record<number, string[]> = {};
            existant.lignes_planning_ascq.forEach((l: any) => {
              const num = Number(l.ordre);
              if (num >= 1 && num <= 10) {
                const parts = (l.periode || l.jour_semaine || "").split(",").map((s: string) => s.trim()).filter(Boolean);
                nouvJours[num] = parts;
              } else if (num === 11) {
                setAutreActiviteNom(l.activite || "");
                setAutreActiviteJours((l.periode || l.jour_semaine || "").split(",").map((s: string) => s.trim()).filter(Boolean));
              }
            });
            setActivitesJours(prev => ({ ...prev, ...nouvJours }));
          }
        }
      } catch (errDb) {
        // Fallback local storage
        const localKey = `planning_cnlstp_${user?.id || activeProfile.id}_${annee}_${semaine}`;
        const localData = localStorage.getItem(localKey);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            setRcPlanifies(parsed.rcPlanifies || 10);
            setRcAttendus(parsed.rcAttendus || 10);
            setMotifEcart(parsed.motifEcart || "");
            setObservations(parsed.observations || "");
            setActivitesJours(parsed.activitesJours || {});
            setAutreActiviteNom(parsed.autreActiviteNom || "");
            setAutreActiviteJours(parsed.autreActiviteJours || []);
            setSignatureTactile(parsed.signatureData || null);
            setStatutPlanning(parsed.statut || "BROUILLON");
          } catch {}
        }
      }

      // Historique
      try {
        const { data: hist } = await supabase
          .from("plannings_ascq")
          .select("id, semaine, annee, statut, date_debut, date_fin, created_at")
          .order("annee", { ascending: false })
          .order("semaine", { ascending: false })
          .limit(10);
        if (hist) setHistoriquePlannings(hist);
      } catch {}

    } catch (err) {
      console.error("Erreur chargement plannings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [semaine, annee]);

  // Enregistrement du planning
  const enregistrerPlanning = async (valider: boolean = false) => {
    setSubmitting(true);
    setMessage(null);

    try {
      if (aEcartRc && !motifEcart.trim()) {
        throw new Error("Veuillez renseigner le motif de l'écart entre le nombre de RC planifiés et attendus.");
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

      // Sauvegarde dans la base Supabase si disponible
      try {
        const { data: saved, error } = await supabase
          .from("plannings_ascq")
          .upsert(donneesPlanning, { onConflict: "ascq_id,annee,semaine" })
          .select("id")
          .single();

        if (saved?.id) {
          // Sauvegarde des lignes d'activités
          await supabase.from("lignes_planning_ascq").delete().eq("planning_id", saved.id);
          const lignes = ACTIVITES_OFFICIELLES_CNLSTP.map((act, idx) => ({
            planning_id: saved.id,
            ordre: idx + 1,
            activite: act,
            periode: (activitesJours[idx + 1] || []).join(", "),
            jour_semaine: (activitesJours[idx + 1] || []).join(", "),
            lieu: arrondissement,
            personnes_impliquees: "ASCQ / Relais Communautaires",
            objectifs: "Exécution des interventions communautaires prioritaires"
          }));

          if (autreActiviteNom.trim()) {
            lignes.push({
              planning_id: saved.id,
              ordre: 11,
              activite: autreActiviteNom.trim(),
              periode: autreActiviteJours.join(", "),
              jour_semaine: autreActiviteJours.join(", "),
              lieu: arrondissement,
              personnes_impliquees: "ASCQ",
              objectifs: "Activité communautaire complémentaire"
            });
          }

          await supabase.from("lignes_planning_ascq").insert(lignes);
        }
      } catch (errDb) {
        console.warn("Enregistrement distant indisponible, sauvegarde locale active:", errDb);
      }

      // Toujours persister dans localStorage pour fiabilité tout-terrain
      const localKey = `planning_cnlstp_${ascqId}_${annee}_${semaine}`;
      localStorage.setItem(localKey, JSON.stringify({
        ...donneesPlanning,
        activitesJours,
        autreActiviteNom,
        autreActiviteJours,
        signatureData: signatureTactile
      }));

      setStatutPlanning(valider ? "VALIDE" : "BROUILLON");
      setMessage({
        text: valider 
          ? `Planning officiel de la Semaine ${semaine} validé et signé avec succès !`
          : `Brouillon de la Semaine ${semaine} enregistré avec succès.`,
        error: false
      });

      // Ouvrir automatiquement l'aperçu si l'utilisateur valide
      if (valider) {
        setModalApercuOuvert(true);
      }

    } catch (err: any) {
      setMessage({ text: err.message || "Erreur lors de l'enregistrement.", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  const imprimerFicheA4 = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-16 print:bg-white print:p-0">
      
      {/* Navigation supérieure */}
      <div className="print:hidden">
        <AscqNav userProfile={currentUser} />
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5 print:p-0 print:max-w-none">
        
        {/* Bannière officielle CNLS-TP & Présidence du Bénin */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm print:hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-32 h-16 shrink-0">
              <Image 
                src="/logo-asc-benin.jpg" 
                alt="ASC Santé Communautaire Bénin" 
                fill 
                className="object-contain" 
                priority
              />
            </div>
            <div className="relative w-full max-w-lg h-14 shrink-0">
              <Image 
                src="/banniere-cnlstp.png" 
                alt="CNLS-TP Présidence du Bénin" 
                fill 
                className="object-contain" 
                priority
              />
            </div>
          </div>
        </div>

        {/* Barre d'actions & En-tête de page */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4 print:hidden">
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
                Planning Hebdomadaire des ASCQ
              </h1>
              <p className="text-xs text-slate-500">
                Programmation officielle des 10 interventions clés de santé communautaire (Format A4 Paysage).
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setModalApercuOuvert(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs shadow-sm active:scale-95 transition-all"
                title="Prévisualiser et imprimer la fiche officielle A4 Paysage"
              >
                <Eye className="w-4 h-4" />
                <span>Aperçu Fidèle A4</span>
              </button>

              <button
                type="button"
                onClick={imprimerFicheA4}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-sm active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer (A4)</span>
              </button>
            </div>
          </div>

          {/* Sélecteur de Semaine & Année */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Année</label>
              <select
                value={annee}
                onChange={(e) => setAnnee(Number(e.target.value))}
                className="w-full font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
                <option value={2025}>2025</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Semaine Épidémiologique</label>
              <select
                value={semaine}
                onChange={(e) => setSemaine(Number(e.target.value))}
                className="w-full font-bold text-[#005c30] bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s}>
                    Semaine {s} {s === getSemaineActuelle() ? "(Actuelle)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Période calculée</label>
              <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 truncate">
                {dates.label}
              </div>
            </div>
          </div>
        </div>

        {/* Message de notification */}
        {message && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 print:hidden ${
            message.error ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}>
            {message.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* FORMULAIRE OFFICIEL DE SAISIE */}
        <form onSubmit={(e) => { e.preventDefault(); enregistrerPlanning(false); }} className="space-y-5 print:hidden">

          {/* SECTION 1 – Identification */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#005c30] text-xs font-black flex items-center justify-center">1</span>
              <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                Identification Géographique & Coordonnées ASCQ
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Département *</label>
                <input
                  type="text"
                  required
                  value={departement}
                  onChange={(e) => setDepartement(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold uppercase bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Commune *</label>
                <input
                  type="text"
                  required
                  value={commune}
                  onChange={(e) => setCommune(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold uppercase bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Arrondissement *</label>
                <input
                  type="text"
                  required
                  value={arrondissement}
                  onChange={(e) => setArrondissement(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold uppercase bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom et Prénom(s) de l'ASCQ *</label>
                <input
                  type="text"
                  required
                  value={ascqNom}
                  onChange={(e) => setAscqNom(e.target.value.toUpperCase())}
                  placeholder="Ex: DOSSOU Jean-Baptiste"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Téléphonique *</label>
                <input
                  type="tel"
                  required
                  value={ascqPhone}
                  onChange={(e) => setAscqPhone(e.target.value)}
                  placeholder="Ex: +229 01 97 00 00 00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2 – Suivi des Relais Communautaires (RC) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#005c30] text-xs font-black flex items-center justify-center">2</span>
              <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                Suivi des Relais Communautaires (RC)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre de RC planifiés *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={rcPlanifies}
                  onChange={(e) => setRcPlanifies(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-black text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre de RC attendus dans l'arrondissement *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={rcAttendus}
                  onChange={(e) => setRcAttendus(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-black text-slate-900 text-sm"
                />
              </div>

              {aEcartRc && (
                <div className="sm:col-span-2 p-3 bg-red-50 border border-red-200 rounded-2xl space-y-1">
                  <label className="block font-bold text-red-700 text-xs">
                    ⚠️ Motif de l'écart (Obligatoire : {rcPlanifies} planifié(s) vs {rcAttendus} attendu(s)) *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={motifEcart}
                    onChange={(e) => setMotifEcart(e.target.value)}
                    placeholder="Précisez la cause de l'écart (ex: Relais indisponible, absence justifiée, secteur vacant...)"
                    className="w-full p-2.5 rounded-xl border border-red-300 bg-white text-xs font-medium focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3 – Activités officielles CNLS-TP */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#005c30] text-xs font-black flex items-center justify-center">3</span>
                <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                  Programmation des 10 Activités Officielles CNLS-TP
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">Cochez les jours prévus</span>
            </div>

            <div className="space-y-2.5">
              {ACTIVITES_OFFICIELLES_CNLSTP.map((act, idx) => {
                const actNum = idx + 1;
                const cochés = activitesJours[actNum] || [];

                return (
                  <div 
                    key={actNum}
                    className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-emerald-300 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">
                        {actNum}. {act}
                      </span>
                      <span className="text-[10px] font-bold text-[#005c30] bg-emerald-100 px-2 py-0.5 rounded-full">
                        Resp : ASCQ
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
                      {JOURS_ABREV.map((jour) => {
                        const isChecked = cochés.includes(jour);
                        return (
                          <button
                            key={jour}
                            type="button"
                            onClick={() => toggleJourActivite(actNum, jour)}
                            className={`py-1 px-2 rounded-lg text-xs font-bold transition-all text-center border ${
                              isChecked
                                ? "bg-[#005c30] text-white border-[#005c30] shadow-xs scale-102"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {isChecked ? `✔ ${jour}` : jour}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4 – Autre activité (Optionnelle) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#005c30] text-xs font-black flex items-center justify-center">4</span>
              <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                Activité Complémentaire (11. Optionnel)
              </h2>
            </div>

            <div className="space-y-2 text-xs">
              <input
                type="text"
                value={autreActiviteNom}
                onChange={(e) => setAutreActiviteNom(e.target.value)}
                placeholder="Ex: Réunion de crise sanitaire, campagne de vaccination ciblée..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium"
              />

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
                {JOURS_ABREV.map((jour) => {
                  const isChecked = autreActiviteJours.includes(jour);
                  return (
                    <button
                      key={jour}
                      type="button"
                      onClick={() => toggleJourAutre(jour)}
                      className={`py-1 px-2 rounded-lg text-xs font-bold transition-all text-center border ${
                        isChecked
                          ? "bg-[#005c30] text-white border-[#005c30] shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isChecked ? `✔ ${jour}` : jour}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 5 – Observations générales */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#005c30] text-xs font-black flex items-center justify-center">5</span>
              <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                Observations Générales
              </h2>
            </div>

            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observations globales sur l'exécution des activités de la semaine..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>

          {/* SECTION 6 – Signature tactile exclusive de l'ASCQ */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#005c30] text-xs font-black flex items-center justify-center">6</span>
              <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                Signature & Engagement de l'ASCQ
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              En apposant votre signature tactile, vous engagez votre responsabilité quant à la régularité du planning.
            </p>

            <div className="max-w-md mx-auto pt-2">
              <SignatureCanvas
                defaultValue={signatureTactile}
                onSignatureChange={(sig) => setSignatureTactile(sig)}
              />
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => enregistrerPlanning(false)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>Enregistrer Brouillon</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => enregistrerPlanning(true)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
              <span>Valider & Générer la Fiche A4 Officielle</span>
            </button>
          </div>

        </form>

      </main>

      {/* ========================================================================= */}
      {/* MODAL APERÇU FIDÈLE OFFICIEL CNLS-TP (FORMAT A4 PAYSAGE IMPRIMABLE)       */}
      {/* ========================================================================= */}
      {modalApercuOuvert && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col p-2 sm:p-4 overflow-y-auto">
          
          {/* Barre supérieure d'actions */}
          <div className="bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-between gap-3 shadow-lg max-w-5xl w-full mx-auto mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
              <span className="font-black text-xs sm:text-sm">
                Fiche Officielle A4 Paysage — Semaine {semaine} ({annee})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={imprimerFicheA4}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow transition flex items-center gap-1.5 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer la Fiche (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setModalApercuOuvert(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Feuille A4 Paysage Officielle */}
          <div className="bg-white max-w-5xl w-full mx-auto p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-300 print:shadow-none print:border-none print:p-0">
            
            {/* 1. Bannière officielle CNLS-TP */}
            <div className="relative w-full h-14 sm:h-16 mb-2">
              <Image 
                src="/banniere-cnlstp.png" 
                alt="CNLS-TP Présidence de la République" 
                fill 
                className="object-contain" 
                priority
              />
            </div>

            {/* 2. En-tête avec logo ASC et titres */}
            <table className="w-full border-collapse mb-1 text-xs">
              <tbody>
                <tr>
                  <td className="w-[15%] align-middle text-left">
                    <div className="relative w-20 h-16">
                      <Image 
                        src="/logo-asc-benin.jpg" 
                        alt="ASC Bénin" 
                        fill 
                        className="object-contain" 
                        priority
                      />
                    </div>
                  </td>
                  <td className="w-[70%] align-middle text-center">
                    <div className="font-black text-sm sm:text-base text-[#005c30] uppercase tracking-wide">
                      PLANNING HEBDOMADAIRE D'ACTIVITÉS DES ASCQ
                    </div>
                    <div className="font-extrabold text-xs text-slate-800 mt-0.5">
                      Semaine Épidémiologique N° {semaine} — {dates.label}
                    </div>
                    <div className="font-extrabold text-[11px] text-[#005c30] uppercase mt-0.5">
                      DÉPARTEMENT : <u>{departement}</u> — COMMUNE : <u>{commune}</u> — ARRONDISSEMENT : <u>{arrondissement}</u>
                    </div>
                  </td>
                  <td className="w-[15%] align-middle text-right text-[10px] text-slate-600 font-bold leading-tight">
                    <span>CNLS-TP</span><br />
                    <span>Santé Communautaire</span><br />
                    <span>Bénin</span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Ligne tricolore béninoise */}
            <div className="h-1 w-full my-2 bg-gradient-to-r from-[#008751] via-[#FCD116] to-[#E8112D] rounded-full"></div>

            {/* 3. Tableau officiel à 10 colonnes (Format A4 Paysage) */}
            <table className="w-full border-collapse border-[1.5px] border-black text-xs text-black mt-2">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-extrabold">
                  <th rowSpan={2} className="border border-black p-1 text-center w-[4%]">N°</th>
                  <th rowSpan={2} className="border border-black p-2 text-center w-[36%]">ACTIVITÉS</th>
                  <th rowSpan={2} className="border border-black p-1 text-center w-[6%]">RESP.</th>
                  <th colSpan={7} className="border border-black p-1 text-center w-[28%]">PÉRIODES</th>
                  <th rowSpan={2} className="border border-black p-2 text-center w-[26%]">OBSERVATIONS</th>
                </tr>
                <tr className="bg-slate-100 text-slate-900 font-extrabold text-[11px]">
                  <th className="border border-black p-1 text-center w-[4%]">L</th>
                  <th className="border border-black p-1 text-center w-[4%]">M</th>
                  <th className="border border-black p-1 text-center w-[4%]">M</th>
                  <th className="border border-black p-1 text-center w-[4%]">J</th>
                  <th className="border border-black p-1 text-center w-[4%]">V</th>
                  <th className="border border-black p-1 text-center w-[4%]">S</th>
                  <th className="border border-black p-1 text-center w-[4%]">D</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVITES_OFFICIELLES_CNLSTP.map((act, idx) => {
                  const actNum = idx + 1;
                  const cochés = activitesJours[actNum] || [];
                  const totalLignes = ACTIVITES_OFFICIELLES_CNLSTP.length + (autreActiviteNom.trim() ? 1 : 0);

                  return (
                    <tr key={actNum} className="hover:bg-slate-50/50">
                      <td className="border border-black p-1 text-center font-bold">{String(actNum).padStart(2, "0")}</td>
                      <td className="border border-black p-1.5 text-left font-bold">{act}</td>
                      <td className="border border-black p-1 text-center font-bold text-[10px]">ASCQ</td>
                      {JOURS_ABREV.map(j => (
                        <td key={j} className="border border-black p-1 text-center font-extrabold text-[11px]">
                          {cochés.includes(j) ? <span className="text-[#005c30]">✔</span> : <span className="text-slate-400 font-normal">-</span>}
                        </td>
                      ))}
                      {idx === 0 && (
                        <td 
                          rowSpan={totalLignes}
                          className="border border-black p-3 text-left align-middle text-xs font-medium bg-white"
                        >
                          {observations || "Néant"}
                        </td>
                      )}
                    </tr>
                  );
                })}

                {autreActiviteNom.trim() && (
                  <tr>
                    <td className="border border-black p-1 text-center font-bold">11</td>
                    <td className="border border-black p-1.5 text-left font-bold">{autreActiviteNom}</td>
                    <td className="border border-black p-1 text-center font-bold text-[10px]">ASCQ</td>
                    {JOURS_ABREV.map(j => (
                      <td key={j} className="border border-black p-1 text-center font-extrabold text-[11px]">
                        {autreActiviteJours.includes(j) ? <span className="text-[#005c30]">✔</span> : <span className="text-slate-400 font-normal">-</span>}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>

            {/* 4. Pied de page officiel : Effectif RC & Signature */}
            <div className="flex items-end justify-between border-t border-slate-300 mt-4 pt-3 text-xs text-black">
              <div className="space-y-1">
                <div className="font-bold">
                  Relais Communautaires (RC) : <strong>{rcPlanifies} planifié(s) sur {rcAttendus} attendu(s).</strong>
                </div>
                {aEcartRc && motifEcart && (
                  <div className="text-red-700 font-bold text-[11px]">
                    Motif Écart : {motifEcart}
                  </div>
                )}
                <div>
                  <strong>ASCQ déclarant :</strong> {ascqNom} {ascqPhone ? `(Tél : ${ascqPhone})` : ""}
                </div>
              </div>

              <div className="text-center min-w-[200px]">
                <div className="font-extrabold text-xs mb-1">L'ASCQ Déclarant</div>
                {signatureTactile ? (
                  <img src={signatureTactile} alt="Signature ASCQ" className="max-h-12 mx-auto my-1 object-contain" />
                ) : (
                  <div className="h-10"></div>
                )}
                <div className="font-extrabold text-xs underline">{ascqNom || "Signature"}</div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
