"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  Check, 
  Send, 
  Calendar, 
  MapPin, 
  ClipboardCheck, 
  Package, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Percent,
  FileText,
  Search,
  Eye,
  Edit3,
  HeartPulse,
  Building2,
  Skull,
  ClipboardList,
  Activity,
  Save,
  X,
  Phone
} from "lucide-react";
import AscqNav from "@/components/AscqNav";
import SignatureCanvas from "@/components/SignatureCanvas";
import { getCachedUserSession, getCachedMonEspace } from "@/lib/offline-sync";

interface RelaisPresence {
  relais_id: string;
  nom_complet: string;
  village: string;
  present: boolean;
  motif: string;
}

interface MaterielInventaire {
  materiel_nom: string;
  categorie?: string;
  etat: "BON_ETAT" | "DEGRADE" | "EN_PANNE" | "EPUISE";
  recommandations: string;
}

const ARTICLES_OFFICIELS_RC = [
  { nom: "Boîtes à images", cat: "Sensibilisation" },
  { nom: "Tablette", cat: "Outils de travail" },
  { nom: "Thermomètre", cat: "Équipement médical" },
  { nom: "Sac", cat: "Transport" },
  { nom: "Bottes", cat: "Protection" },
  { nom: "Gilets d'identification", cat: "Visibilité" },
  { nom: "Badge", cat: "Identification" },
  { nom: "Seau plastique", cat: "Hygiène" },
  { nom: "Lampe torche", cat: "Équipement" },
  { nom: "Vélo / Barque", cat: "Mobilité" },
  { nom: "Cuillère à café ou à soupe", cat: "Nutrition & Dosage" },
  { nom: "Imperméable", cat: "Protection" },
  { nom: "Serviette", cat: "Hygiène" },
  { nom: "Savon", cat: "Hygiène" },
  { nom: "Gobelet", cat: "Hygiène" },
  { nom: "Caisse métallique", cat: "Stockage" },
  { nom: "Préservatif", cat: "Santé reproductive" },
  { nom: "Gel lubrifiant", cat: "Santé reproductive" },
  { nom: "Cahier", cat: "Papeterie" },
  { nom: "Bic", cat: "Papeterie" },
  { nom: "Crayon", cat: "Papeterie" },
  { nom: "Taille crayon", cat: "Papeterie" },
];

const ARTICLES_SPECIFIQUES_ASCQ = [
  { nom: "Tensiomètre", cat: "Matériel médical ASCQ" },
  { nom: "SRO / ZINC", cat: "Médicaments & Intrants" },
  { nom: "AMOXI (Amoxicilline)", cat: "Médicaments & Intrants" },
  { nom: "PARA (Paracétamol)", cat: "Médicaments & Intrants" },
  { nom: "CTA (Combinaison Thérapeutique à base d'Artémisinine)", cat: "Médicaments & Intrants" },
  { nom: "ALBEN / MEBEN (Albendazole / Mébendazole)", cat: "Médicaments & Intrants" },
  { nom: "AQUATABS", cat: "Hygiène & Eau" },
  { nom: "FER et acide folique", cat: "Nutrition & Supplémentation" },
  { nom: "Plumpy'Nut (Prompt Nut)", cat: "Nutrition d'urgence" },
  { nom: "Enov'Mum+", cat: "Nutrition d'urgence" },
  { nom: "Nutributter+", cat: "Nutrition d'urgence" },
];

function genererInventaireInitial(type: "RC" | "ASCQ"): MaterielInventaire[] {
  const base = ARTICLES_OFFICIELS_RC.map((a) => ({
    materiel_nom: a.nom,
    categorie: a.cat,
    etat: "BON_ETAT" as const,
    recommandations: "",
  }));
  if (type === "ASCQ") {
    const ascqItems = ARTICLES_SPECIFIQUES_ASCQ.map((a) => ({
      materiel_nom: a.nom,
      categorie: a.cat,
      etat: "BON_ETAT" as const,
      recommandations: "",
    }));
    return [...base, ...ascqItems];
  }
  return base;
}

export default function SuiviRelaisPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [seancesPassees, setSeancesPassees] = useState<any[]>([]);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Basculement entre les 2 modes
  const [modeVue, setModeVue] = useState<"fiches_rc" | "seance_suivi">("fiches_rc");

  // Liste des RC et recherche
  const [listeRelais, setListeRelais] = useState<any[]>([]);
  const [searchRc, setSearchRc] = useState("");
  const [selectedRc, setSelectedRc] = useState<any | null>(null);
  const [rcFiches, setRcFiches] = useState<{
    alertes: any[];
    registre: any[];
    references: any[];
    deces: any[];
  }>({
    alertes: [],
    registre: [],
    references: [],
    deces: [],
  });
  const [loadingFichesRc, setLoadingFichesRc] = useState(false);

  // Modale d'édition d'une fiche RC par l'ASCQ
  const [modalFicheEdit, setModalFicheEdit] = useState<{ type: string; item: any } | null>(null);
  const [editValeurs, setEditValeurs] = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);

  // Formulaire de séance
  const todayStr = new Date().toISOString().split("T")[0];
  const [dateSeance, setDateSeance] = useState(todayStr);
  const [lieu, setLieu] = useState("");
  const [ordreDuJour, setOrdreDuJour] = useState("Réunion mensuelle de suivi des RC et contrôle des fiches de surveillance");

  // Liste des RC pour la présence
  const [relaisPresences, setRelaisPresences] = useState<RelaisPresence[]>([]);

  // Grille d'inventaire du matériel officiel (22 articles RC ou 33 articles ASCQ)
  const [typeInventaire, setTypeInventaire] = useState<"RC" | "ASCQ">("RC");
  const [inventaireMateriel, setInventaireMateriel] = useState<MaterielInventaire[]>(() => genererInventaireInitial("RC"));
  const [filtreCategorie, setFiltreCategorie] = useState<string>("TOUT");
  const [rechercheMateriel, setRechercheMateriel] = useState<string>("");

  const handleBasculerTypeInventaire = (type: "RC" | "ASCQ") => {
    setTypeInventaire(type);
    setInventaireMateriel((prev) => {
      const nouveauBase = genererInventaireInitial(type);
      // Conserver les états et recommandations déjà saisis
      return nouveauBase.map((item) => {
        const existant = prev.find((p) => p.materiel_nom === item.materiel_nom);
        return existant ? { ...item, etat: existant.etat, recommandations: existant.recommandations } : item;
      });
    });
  };

  const [pointsDiscutes, setPointsDiscutes] = useState("");
  const [decisionsPrises, setDecisionsPrises] = useState("");
  const [dateProchaineSeance, setDateProchaineSeance] = useState("");
  const [signatureTactile, setSignatureTactile] = useState<string | null>(null);

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
        if (monEspace) {
          profil = monEspace;
        }
      }

      if (!user && !profil) {
        router.push("/connexion");
        return;
      }

      if (user && !profil) {
        const { data } = await supabase.from("utilisateurs").select("*").eq("id", user.id).maybeSingle();
        profil = data;
      }

      setCurrentUser(profil);

      // Charger les RC enrôlés par cet ASCQ
      let rcs: any[] = [];
      if (user?.id || profil?.id) {
        const uid = user?.id || profil?.id;
        const { data } = await supabase
          .from("relais_communautaires")
          .select("*")
          .eq("ascq_id", uid)
          .order("nom");
        rcs = data || [];
      }

      if (rcs && rcs.length > 0) {
        setListeRelais(rcs);
        setRelaisPresences(rcs.map((r) => ({
          relais_id: r.id,
          nom_complet: `${r.prenoms} ${r.nom}`,
          village: r.village_nom || "Village",
          present: true,
          motif: "",
        })));

        // Sélectionner par défaut le premier RC pour afficher ses fiches
        chargerFichesDuRc(rcs[0]);
      }

      // Charger l'historique des séances de suivi
      const { data: seances } = await supabase
        .from("seances_suivi_relais")
        .select("*")
        .order("date_seance", { ascending: false });

      setSeancesPassees(seances || []);

    } catch (err) {
      console.warn("Erreur chargement suivi relais, maintien local:", err);
    } finally {
      setLoading(false);
    }
  };

  const chargerFichesDuRc = async (rc: any) => {
    setSelectedRc(rc);
    setLoadingFichesRc(true);
    try {
      // 1. Tenter la RPC lister_fiches_rc_pour_ascq
      const { data: rpcData, error: rpcErr } = await supabase.rpc("lister_fiches_rc_pour_ascq", {
        p_rc_id: rc.id,
      });

      if (!rpcErr && rpcData) {
        setRcFiches({
          alertes: rpcData.alertes || [],
          registre: rpcData.registre || [],
          references: rpcData.references || [],
          deces: [],
        });
      } else {
        // Fallback requêtes directes
        const [alrRes, regRes, refRes, decRes] = await Promise.all([
          supabase.from("alertes_communautaires").select("*").or(`declare_par_id.eq.${rc.user_id},notificateur_nom_complet.ilike.%${rc.nom}%`),
          supabase.from("registre_alertes_rumeurs").select("*").or(`relais_id.eq.${rc.id},relais_nom_complet.ilike.%${rc.nom}%`),
          supabase.from("references_communautaires").select("*").eq("relais_id", rc.id),
          supabase.from("deces_communautaires").select("*").or(`notificateur_id.eq.${rc.user_id},notificateur_nom_complet.ilike.%${rc.nom}%`),
        ]);

        setRcFiches({
          alertes: alrRes.data || [],
          registre: regRes.data || [],
          references: refRes.data || [],
          deces: decRes.data || [],
        });
      }
    } catch (err) {
      console.error("Erreur chargement fiches du RC:", err);
    } finally {
      setLoadingFichesRc(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  const togglePresence = (idx: number) => {
    const copy = [...relaisPresences];
    copy[idx].present = !copy[idx].present;
    setRelaisPresences(copy);
  };

  const updateMotif = (idx: number, motif: string) => {
    const copy = [...relaisPresences];
    copy[idx].motif = motif;
    setRelaisPresences(copy);
  };

  const updateMaterielEtat = (idx: number, etat: any) => {
    const copy = [...inventaireMateriel];
    copy[idx].etat = etat;
    setInventaireMateriel(copy);
  };

  const updateMaterielRecommandation = (idx: number, rec: string) => {
    const copy = [...inventaireMateriel];
    copy[idx].recommandations = rec;
    setInventaireMateriel(copy);
  };

  // Calcul du taux de présence
  const totalRC = relaisPresences.length;
  const nbPresents = relaisPresences.filter((r) => r.present).length;
  const tauxPresence = totalRC > 0 ? Math.round((nbPresents / totalRC) * 100) : 0;

  // Ouvrir la modale d'édition pour corriger une fiche
  const handleOuvrirEditionFiche = (type: string, item: any) => {
    setModalFicheEdit({ type, item });
    if (type === "ALERTE") {
      setEditValeurs({
        type_alerte_nom: item.type_alerte_nom,
        nb_personnes_touchees: item.nb_personnes_touchees || 0,
        nb_personnes_mortes: item.nb_personnes_mortes || 0,
        mesures_prises: item.mesures_prises || "",
        statut: item.statut || "SOUMISE",
      });
    } else if (type === "REGISTRE") {
      setEditValeurs({
        type_nom: item.type_nom,
        nb_personnes_touchees: item.nb_personnes_touchees || 0,
        nb_personnes_decedees: item.nb_personnes_decedees || 0,
        actions_menees: item.actions_menees || "",
      });
    } else if (type === "REFERENCE") {
      setEditValeurs({
        destination_nom: item.destination_nom,
        nom_patient: item.nom_patient,
        prenoms_patient: item.prenoms_patient,
        age_valeur: item.age_valeur,
        motif_details: item.motif_details || "",
        statut: item.statut,
      });
    }
  };

  // Enregistrer la correction de la fiche par l'ASCQ
  const handleEnregistrerCorrectionFiche = async () => {
    if (!modalFicheEdit) return;
    setEditSaving(true);
    try {
      const { type, item } = modalFicheEdit;
      if (type === "ALERTE") {
        await supabase
          .from("alertes_communautaires")
          .update({
            type_alerte_nom: editValeurs.type_alerte_nom,
            nb_personnes_touchees: Number(editValeurs.nb_personnes_touchees) || 0,
            nb_personnes_mortes: Number(editValeurs.nb_personnes_mortes) || 0,
            mesures_prises: editValeurs.mesures_prises,
            statut: editValeurs.statut,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      } else if (type === "REGISTRE") {
        await supabase
          .from("registre_alertes_rumeurs")
          .update({
            type_nom: editValeurs.type_nom,
            nb_personnes_touchees: Number(editValeurs.nb_personnes_touchees) || 0,
            nb_personnes_decedees: Number(editValeurs.nb_personnes_decedees) || 0,
            actions_menees: editValeurs.actions_menees,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      } else if (type === "REFERENCE") {
        await supabase
          .from("references_communautaires")
          .update({
            destination_nom: editValeurs.destination_nom,
            nom_patient: editValeurs.nom_patient.toUpperCase(),
            prenoms_patient: editValeurs.prenoms_patient,
            age_valeur: Number(editValeurs.age_valeur) || 1,
            motif_details: editValeurs.motif_details,
            statut: editValeurs.statut,
            modifie_par_ascq: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      }

      setMessage({ text: "Fiche corrigée et validée avec succès par l'ASCQ !", error: false });
      setModalFicheEdit(null);
      if (selectedRc) {
        await chargerFichesDuRc(selectedRc);
      }
    } catch (err: any) {
      alert("Erreur lors de la modification : " + err.message);
    } finally {
      setEditSaving(false);
    }
  };

  // Envoi du PV de réunion
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (!lieu.trim()) throw new Error("Le lieu de la séance de suivi est obligatoire.");
      if (!ordreDuJour.trim()) throw new Error("L'ordre du jour est obligatoire.");
      if (!signatureTactile) throw new Error("La signature de l'ASCQ est requise.");

      const { data, error } = await supabase.rpc("enregistrer_suivi_relais", {
        p_date_seance: dateSeance,
        p_lieu: lieu.trim(),
        p_ordre_du_jour: ordreDuJour.trim(),
        p_relais_presents: relaisPresences,
        p_inventaire_materiel: inventaireMateriel,
        p_points_discutes: pointsDiscutes.trim() || null,
        p_decisions_prises: decisionsPrises.trim() || null,
        p_date_prochaine_seance: dateProchaineSeance || null,
        p_signature_tactile: signatureTactile,
      });

      if (error) throw error;

      setMessage({ text: "Séance de suivi groupé enregistrée avec succès !", error: false });
      setPointsDiscutes("");
      setDecisionsPrises("");

      await chargerDonnees();

    } catch (err: any) {
      setMessage({ text: err.message || "Erreur lors de l'enregistrement.", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="text-center space-y-2 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#005c30]" />
          <p className="text-xs font-semibold">Chargement du module de supervision des Relais...</p>
        </div>
      </div>
    );
  }

  const relaisFiltres = listeRelais.filter((r) => {
    if (!searchRc.trim()) return true;
    const q = searchRc.toLowerCase();
    return (
      r.nom?.toLowerCase().includes(q) ||
      r.prenoms?.toLowerCase().includes(q) ||
      r.village_nom?.toLowerCase().includes(q) ||
      r.telephone?.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-28">
      <AscqNav userProfile={currentUser} />

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-4">
        
        {/* En-tête */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-emerald-100 text-[#005c30]">
                  Supervision ASCQ
                </span>
                <span className="text-xs text-slate-400 font-bold">Phase 12</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 mt-1">
                Supervision & Données des Relais Communautaires (RC)
              </h1>
              <p className="text-xs text-slate-500">
                Consultez, modifiez et validez toutes les fiches de vos Relais. Leurs activités sont directement intégrées à vos bilans.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/espace-ascq/relais"
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Gérer mes Relais
              </Link>
            </div>
          </div>

          {/* BANDEAU DE COMPTABILISATION AUTOMATIQUE */}
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#005c30] shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong>Liaison directe & intelligente :</strong> Toutes les alertes, fiches de registre, décès et références renseignés par vos <strong>{listeRelais.length} Relais Communautaires</strong> sont comptabilisés dans vos statistiques de terrain et alimentent vos rapports hebdomadaires et mensuels.
            </p>
          </div>

          {/* ONGLETS DE COMMUTATION */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModeVue("fiches_rc")}
              className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                modeVue === "fiches_rc"
                  ? "bg-[#005c30] text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>1. Données & Fiches de mes Relais ({listeRelais.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setModeVue("seance_suivi")}
              className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                modeVue === "seance_suivi"
                  ? "bg-[#005c30] text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>2. Procès-Verbal de Réunion Mensuelle</span>
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            message.error ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}>
            {message.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 1 : CONSULTATION, MODIFICATION ET VALIDATION DES FICHES DE SES RC */}
        {/* ========================================================================= */}
        {modeVue === "fiches_rc" && (
          <div className="space-y-4">
            
            {/* Barre de recherche du Relais */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un Relais par nom, prénom, village, téléphone..."
                  value={searchRc}
                  onChange={(e) => setSearchRc(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-medium focus:ring-2 focus:ring-[#005c30]"
                />
              </div>
            </div>

            {/* Sélecteur horizontal de Relais */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              {relaisFiltres.map((r) => {
                const isSelected = selectedRc?.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => chargerFichesDuRc(r)}
                    className={`px-3.5 py-2 rounded-2xl border text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                      isSelected
                        ? "bg-[#005c30] text-white border-[#005c30] shadow-sm"
                        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span>{r.prenoms} {r.nom}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {r.village_nom}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dossier du Relais sélectionné */}
            {selectedRc && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Dossier de surveillance du Relais
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      {selectedRc.prenoms} {selectedRc.nom}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Village : <strong className="text-slate-800">{selectedRc.village_nom}</strong> • Téléphone : <strong className="text-slate-800 font-mono">{selectedRc.telephone}</strong> • Grappe {selectedRc.grappe}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold">
                      {rcFiches.alertes.length} Alertes
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 font-bold">
                      {rcFiches.registre.length} Rumeurs
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-bold">
                      {rcFiches.references.length} Références
                    </span>
                  </div>
                </div>

                {loadingFichesRc ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30]" />
                    <p className="text-xs">Chargement des fiches du Relais...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* SECTION A : ALERTES DU RC */}
                    <div className="space-y-2">
                      <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        <span>Alertes SIMR notifiées par ce Relais ({rcFiches.alertes.length})</span>
                      </h3>

                      {rcFiches.alertes.length === 0 ? (
                        <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-400 text-center">
                          Aucune alerte déclarée pour le moment.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {rcFiches.alertes.map((a) => (
                            <div key={a.id} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200">{a.numero_alerte}</span>
                                  <strong className="text-slate-900 font-extrabold">{a.type_alerte_nom}</strong>
                                  <span className="text-[10px] text-slate-500 font-medium">({a.date_notification})</span>
                                </div>
                                <p className="text-[11px] text-slate-600 mt-0.5">
                                  Impact : {a.nb_personnes_touchees} touché(s) • {a.nb_personnes_mortes} décès • Village : {a.village_nom}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOuvrirEditionFiche("ALERTE", a)}
                                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 font-bold text-xs flex items-center gap-1 text-slate-700"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Modifier / Valider</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION B : REGISTRE DES RUMEURS DU RC */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-blue-600" />
                        <span>Saisies au Registre des Rumeurs ({rcFiches.registre.length})</span>
                      </h3>

                      {rcFiches.registre.length === 0 ? (
                        <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-400 text-center">
                          Aucune ligne de registre renseignée.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {rcFiches.registre.map((reg) => (
                            <div key={reg.id} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200">{reg.numero_registre}</span>
                                  <strong className="text-slate-900 font-extrabold">{reg.type_nom}</strong>
                                </div>
                                <p className="text-[11px] text-slate-600 mt-0.5">
                                  Survenue le {reg.date_survenue} • {reg.nb_personnes_touchees} touché(s) • {reg.nb_personnes_decedees} décès
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleOuvrirEditionFiche("REGISTRE", reg)}
                                className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 font-bold text-xs flex items-center gap-1 text-slate-700"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Corriger</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION C : RÉFÉRENCES DU RC (SANTÉ & GUPS) */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                        <HeartPulse className="w-4 h-4 text-emerald-600" />
                        <span>Références de cas (CS & GUPS) ({rcFiches.references.length})</span>
                      </h3>

                      {rcFiches.references.length === 0 ? (
                        <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-400 text-center">
                          Aucune référence transmise par ce Relais.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {rcFiches.references.map((rf) => (
                            <div key={rf.id} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200">{rf.numero_reference}</span>
                                  <strong className="text-slate-900 font-extrabold">{rf.nom_patient} {rf.prenoms_patient}</strong>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    {rf.type_reference === "SANTE" ? "Santé (CS)" : "Social (GUPS)"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 mt-0.5">
                                  Motif : {rf.motif_libelle} • Vers : {rf.destination_nom} ({rf.statut})
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleOuvrirEditionFiche("REFERENCE", rf)}
                                className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 font-bold text-xs flex items-center gap-1 text-slate-700"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Examiner</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2 : PROCÈS-VERBAL DE RÉUNION MENSUELLE (CODE EXISTANT PRÉSERVÉ) */}
        {/* ========================================================================= */}
        {modeVue === "seance_suivi" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Informations générales */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3.5">
              <h2 className="font-extrabold text-sm text-slate-900">1. Informations de la séance</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Date de la séance *</label>
                  <input
                    type="date"
                    value={dateSeance}
                    onChange={(e) => setDateSeance(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Lieu de réunion *</label>
                  <input
                    type="text"
                    placeholder="Ex: Centre de santé de Gangban"
                    value={lieu}
                    onChange={(e) => setLieu(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Ordre du jour *</label>
                <textarea
                  rows={2}
                  value={ordreDuJour}
                  onChange={(e) => setOrdreDuJour(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Présence des RC */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900">2. Contrôle de présence des Relais ({totalRC} attendus)</h2>
                  <p className="text-xs text-slate-500">Cochez les Relais présents à la séance</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-100">
                  <Percent className="w-4 h-4 text-[#005c30]" />
                  <span className="text-xs font-extrabold text-[#005c30]">
                    Présence : {nbPresents} / {totalRC} ({tauxPresence}%)
                  </span>
                </div>
              </div>

              {totalRC === 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs text-slate-500">
                  Aucun Relais Communautaire enrôlé pour le moment.
                </div>
              ) : (
                <div className="space-y-2">
                  {relaisPresences.map((r, i) => (
                    <div
                      key={r.relais_id}
                      className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        r.present ? "bg-emerald-50/40 border-emerald-200" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => togglePresence(i)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                            r.present ? "bg-[#005c30] text-white" : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          {r.present ? <Check className="w-4 h-4 stroke-[3]" /> : "✕"}
                        </button>
                        <div>
                          <strong className="text-xs font-extrabold text-slate-900 block">{r.nom_complet}</strong>
                          <span className="text-[11px] text-slate-500">Village : {r.village}</span>
                        </div>
                      </div>

                      {!r.present && (
                        <div className="w-full sm:w-64">
                          <input
                            type="text"
                            placeholder="Motif d'absence (facultatif)"
                            value={r.motif}
                            onChange={(e) => updateMotif(i, e.target.value)}
                            className="w-full px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inventaire officiel du matériel : RC (22 articles) ou ASCQ (33 articles) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900">
                    3. Inventaire & Contrôle des Dotations de Terrain
                  </h2>
                  <p className="text-xs text-slate-500">
                    Vérification de l'état du matériel, des équipements de protection et des intrants
                  </p>
                </div>

                {/* SÉLECTEUR RC (22) vs ASCQ (33) */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleBasculerTypeInventaire("RC")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      typeInventaire === "RC"
                        ? "bg-[#005c30] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    📦 Relais (22 articles)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBasculerTypeInventaire("ASCQ")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      typeInventaire === "ASCQ"
                        ? "bg-[#005c30] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🩺 ASCQ (33 articles complets)
                  </button>
                </div>
              </div>

              {/* STATISTIQUES EN DIRECT DU MATÉRIEL */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-bold block">Bon état / Disponible</span>
                  <strong className="text-base font-black text-emerald-800">
                    {inventaireMateriel.filter((m) => m.etat === "BON_ETAT").length}
                  </strong>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-amber-700 font-bold block">Dégradé / Usé</span>
                  <strong className="text-base font-black text-amber-800">
                    {inventaireMateriel.filter((m) => m.etat === "DEGRADE").length}
                  </strong>
                </div>
                <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                  <span className="text-[10px] text-rose-700 font-bold block">En panne</span>
                  <strong className="text-base font-black text-rose-800">
                    {inventaireMateriel.filter((m) => m.etat === "EN_PANNE").length}
                  </strong>
                </div>
                <div className="p-2.5 bg-red-50 rounded-xl border border-red-100">
                  <span className="text-[10px] text-red-700 font-bold block">Épuisé / Manquant</span>
                  <strong className="text-base font-black text-red-800">
                    {inventaireMateriel.filter((m) => m.etat === "EPUISE").length}
                  </strong>
                </div>
              </div>

              {/* BARRE DE RECHERCHE DANS LE MATÉRIEL */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher un produit (ex: thermomètre, Plumpy'Nut, gilet, bottes, CTA...)"
                  value={rechercheMateriel}
                  onChange={(e) => setRechercheMateriel(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                />
              </div>

              {/* LISTE DES ARTICLES DE L'INVENTAIRE */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {inventaireMateriel
                  .filter((mat) => {
                    if (!rechercheMateriel.trim()) return true;
                    const q = rechercheMateriel.toLowerCase();
                    return (
                      mat.materiel_nom.toLowerCase().includes(q) ||
                      mat.categorie?.toLowerCase().includes(q)
                    );
                  })
                  .map((mat, i) => {
                    // Trouver l'index original dans inventaireMateriel pour la mise à jour
                    const realIndex = inventaireMateriel.findIndex((m) => m.materiel_nom === mat.materiel_nom);
                    return (
                      <div key={mat.materiel_nom} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2 hover:border-slate-300 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-black flex items-center justify-center shrink-0">
                              {realIndex + 1}
                            </span>
                            <div>
                              <strong className="text-xs text-slate-900 font-extrabold block">
                                {mat.materiel_nom}
                              </strong>
                              {mat.categorie && (
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {mat.categorie}
                                </span>
                              )}
                            </div>
                          </div>

                          <select
                            value={mat.etat}
                            onChange={(e) => updateMaterielEtat(realIndex, e.target.value as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              mat.etat === "BON_ETAT" ? "bg-emerald-50 text-emerald-800 border-emerald-300" :
                              mat.etat === "DEGRADE" ? "bg-amber-50 text-amber-800 border-amber-300" :
                              mat.etat === "EN_PANNE" ? "bg-rose-50 text-rose-800 border-rose-300" :
                              "bg-red-50 text-red-800 border-red-300"
                            }`}
                          >
                            <option value="BON_ETAT">✅ Bon état / Disponible</option>
                            <option value="DEGRADE">⚠️ Dégradé / Usé</option>
                            <option value="EN_PANNE">🔧 En panne</option>
                            <option value="EPUISE">🛑 Épuisé / Manquant</option>
                          </select>
                        </div>

                        <input
                          type="text"
                          placeholder="Recommandations, quantité en stock ou besoin de réapprovisionnement..."
                          value={mat.recommandations}
                          onChange={(e) => updateMaterielRecommandation(realIndex, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#005c30]"
                        />
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Synthèse des échanges & Décisions */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3.5">
              <h2 className="font-extrabold text-sm text-slate-900">4. Synthèse des échanges & Décisions</h2>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Points discutés lors de la réunion</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Analyse des fiches de surveillance remplies, rappel sur les signes de méningite..."
                  value={pointsDiscutes}
                  onChange={(e) => setPointsDiscutes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Décisions prises & Recommandations</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Intensifier la recherche active des enfants non vaccinés, remise de 50 TDR supplémentaires..."
                  value={decisionsPrises}
                  onChange={(e) => setDecisionsPrises(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-slate-700">Date prévue de la prochaine séance</label>
                <input
                  type="date"
                  value={dateProchaineSeance}
                  onChange={(e) => setDateProchaineSeance(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Signature de l'ASCQ */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
              <h2 className="font-extrabold text-sm text-slate-900">Signature officielle de l'ASCQ</h2>
              <SignatureCanvas onSignatureChange={(sig) => setSignatureTactile(sig)} />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? "Enregistrement en cours..." : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enregistrer le procès-verbal de suivi</span>
                </>
              )}
            </button>
          </form>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODALE D'ÉDITION D'UNE FICHE DU RELAIS PAR L'ASCQ */}
      {/* ========================================================================= */}
      {modalFicheEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden my-auto">
            <div className="bg-[#005c30] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Modifier la fiche du Relais ({modalFicheEdit.type})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalFicheEdit(null)}
                className="p-1 rounded-lg bg-black/20 hover:bg-black/40 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-500 text-[11px]">
                En tant qu'ASCQ superviseur, vous pouvez corriger les erreurs de saisie de votre Relais avant validation définitive.
              </p>

              {modalFicheEdit.type === "ALERTE" && (
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Pathologie / Alerte</label>
                    <input
                      type="text"
                      value={editValeurs.type_alerte_nom}
                      onChange={(e) => setEditValeurs({ ...editValeurs, type_alerte_nom: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Personnes touchées</label>
                      <input
                        type="number"
                        value={editValeurs.nb_personnes_touchees}
                        onChange={(e) => setEditValeurs({ ...editValeurs, nb_personnes_touchees: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Décès constatés</label>
                      <input
                        type="number"
                        value={editValeurs.nb_personnes_mortes}
                        onChange={(e) => setEditValeurs({ ...editValeurs, nb_personnes_mortes: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mesures prises sur le terrain</label>
                    <textarea
                      rows={2}
                      value={editValeurs.mesures_prises}
                      onChange={(e) => setEditValeurs({ ...editValeurs, mesures_prises: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
              )}

              {modalFicheEdit.type === "REGISTRE" && (
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Événement / Rumeur</label>
                    <input
                      type="text"
                      value={editValeurs.type_nom}
                      onChange={(e) => setEditValeurs({ ...editValeurs, type_nom: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Personnes touchées</label>
                      <input
                        type="number"
                        value={editValeurs.nb_personnes_touchees}
                        onChange={(e) => setEditValeurs({ ...editValeurs, nb_personnes_touchees: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Décès constatés</label>
                      <input
                        type="number"
                        value={editValeurs.nb_personnes_decedees}
                        onChange={(e) => setEditValeurs({ ...editValeurs, nb_personnes_decedees: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              {modalFicheEdit.type === "REFERENCE" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Nom patient</label>
                      <input
                        type="text"
                        value={editValeurs.nom_patient}
                        onChange={(e) => setEditValeurs({ ...editValeurs, nom_patient: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Prénoms</label>
                      <input
                        type="text"
                        value={editValeurs.prenoms_patient}
                        onChange={(e) => setEditValeurs({ ...editValeurs, prenoms_patient: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Destination (CS ou GUPS)</label>
                    <input
                      type="text"
                      value={editValeurs.destination_nom}
                      onChange={(e) => setEditValeurs({ ...editValeurs, destination_nom: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalFicheEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={handleEnregistrerCorrectionFiche}
                  className="px-5 py-2 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{editSaving ? "Enregistrement..." : "Enregistrer la correction"}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
