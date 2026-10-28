"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AscqNav from "@/components/AscqNav";
import { 
  Baby, 
  Heart, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Phone, 
  MapPin, 
  Sparkles, 
  ChevronRight, 
  ExternalLink, 
  Printer, 
  Bell, 
  ShieldCheck, 
  Activity, 
  UserPlus, 
  RefreshCw,
  X,
  Stethoscope,
  Apple,
  Pill,
  Syringe,
  AlertCircle,
  Edit3,
  Trash2
} from "lucide-react";

interface FemmeEnceinte {
  id: string;
  nom: string;
  prenoms: string;
  age?: number;
  telephone?: string;
  telephone_conjoint?: string;
  village_nom: string;
  date_ddr?: string;
  date_dpa?: string;
  terme_sa?: number;
  statut_grossesse: "EN_COURS" | "ACCOUCHEE" | "REFEREE_URGENCE" | "FAUSSE_COUCHE";
  cpn_effectuees: string[];
  prochaine_cpn_date?: string;
  tpi_sp_doses: number;
  fer_acide_folique: boolean;
  enov_mum: boolean;
  mild_distribuee: boolean;
  vaccin_td_doses: number;
  plan_accouchement_etabli: boolean;
  date_accouchement?: string;
  lieu_accouchement?: string;
  issue_bebe?: string;
  poids_naissance_kg?: number;
  notes_ascq?: string;
  created_at?: string;
}

interface Enfant1000Jours {
  id: string;
  nom: string;
  prenoms: string;
  sexe: "M" | "F";
  date_naissance: string;
  poids_naissance_kg?: number;
  nom_mere?: string;
  telephone_parent?: string;
  village_nom: string;
  allaitement_exclusif_6m: boolean;
  vitamine_a_doses: number;
  vermifuge_doses: number;
  produits_nutritionnels: string[];
  dernier_pb_mm?: number;
  statut_nutritionnel: "NORMAL" | "MAM" | "MAS" | "NON_EVALUE";
  presence_oedemes: boolean;
  vaccins_recus: Record<string, string>;
  est_zero_dose?: boolean;
  est_retard_vaccinal?: boolean;
  notes_ascq?: string;
  created_at?: string;
}

export default function MaterniteEnfancePage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"femmes" | "enfants" | "rappels">("femmes");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>("TOUS");

  const [femmes, setFemmes] = useState<FemmeEnceinte[]>([]);
  const [enfants, setEnfants] = useState<Enfant1000Jours[]>([]);

  // Modals
  const [showModalFemme, setShowModalFemme] = useState(false);
  const [showModalEnfant, setShowModalEnfant] = useState(false);
  const [showModalAccouchement, setShowModalAccouchement] = useState(false);
  const [femmePourAccouchement, setFemmePourAccouchement] = useState<FemmeEnceinte | null>(null);

  // Formulaire Femme
  const [formFemme, setFormFemme] = useState({
    nom: "",
    prenoms: "",
    age: "24",
    telephone: "",
    telephone_conjoint: "",
    village_nom: "",
    date_ddr: "",
    date_dpa: "",
    cpn_effectuees: [] as string[],
    tpi_sp_doses: 0,
    fer_acide_folique: true,
    enov_mum: false,
    mild_distribuee: true,
    vaccin_td_doses: 1,
    plan_accouchement_etabli: true,
    notes_ascq: ""
  });

  // Formulaire Enfant
  const [formEnfant, setFormEnfant] = useState({
    nom: "",
    prenoms: "",
    sexe: "M" as "M" | "F",
    date_naissance: "",
    poids_naissance_kg: "3.2",
    nom_mere: "",
    telephone_parent: "",
    village_nom: "",
    allaitement_exclusif_6m: true,
    vitamine_a_doses: 0,
    vermifuge_doses: 0,
    produits_nutritionnels: [] as string[],
    dernier_pb_mm: "135",
    presence_oedemes: false,
    vaccins_recus: {} as Record<string, string>,
    notes_ascq: ""
  });

  // Formulaire Clôture Accouchement
  const [formAccouchement, setFormAccouchement] = useState({
    date_accouchement: new Date().toISOString().split("T")[0],
    lieu_accouchement: "Centre de Santé (Maternité)",
    issue_bebe: "VIVANT",
    sexe_bebe: "M" as "M" | "F",
    nom_bebe: "",
    prenoms_bebe: "",
    poids_naissance_kg: "3.1",
    creerFicheEnfant: true
  });

  // Modal Édition Femme Enceinte
  const [showModalEditFemme, setShowModalEditFemme] = useState(false);
  const [selectedFemmeToEdit, setSelectedFemmeToEdit] = useState<FemmeEnceinte | null>(null);
  const [editFormFemme, setEditFormFemme] = useState({
    nom: "",
    prenoms: "",
    age: "24",
    telephone: "",
    telephone_conjoint: "",
    village_nom: "",
    date_ddr: "",
    date_dpa: "",
    statut_grossesse: "EN_COURS" as "EN_COURS" | "ACCOUCHEE" | "REFEREE_URGENCE" | "FAUSSE_COUCHE",
    cpn_effectuees: [] as string[],
    tpi_sp_doses: 0,
    fer_acide_folique: true,
    enov_mum: false,
    mild_distribuee: true,
    vaccin_td_doses: 1,
    plan_accouchement_etabli: true,
    notes_ascq: ""
  });

  // Modal Édition Enfant 1000 Jours
  const [showModalEditEnfant, setShowModalEditEnfant] = useState(false);
  const [selectedEnfantToEdit, setSelectedEnfantToEdit] = useState<Enfant1000Jours | null>(null);
  const [editFormEnfant, setEditFormEnfant] = useState({
    nom: "",
    prenoms: "",
    sexe: "M" as "M" | "F",
    date_naissance: "",
    poids_naissance_kg: "3.2",
    nom_mere: "",
    telephone_parent: "",
    village_nom: "",
    allaitement_exclusif_6m: true,
    vitamine_a_doses: 0,
    vermifuge_doses: 0,
    produits_nutritionnels: [] as string[],
    dernier_pb_mm: "135",
    statut_nutritionnel: "NORMAL" as "NORMAL" | "MAM" | "MAS" | "NON_EVALUE",
    presence_oedemes: false,
    vaccins_recus: {} as Record<string, string>,
    notes_ascq: ""
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const viderDonneesLocales = () => {
    if (confirm("Voulez-vous réinitialiser le cache local et effacer les fiches de test ?")) {
      localStorage.removeItem("ascq_suivi_femmes");
      localStorage.removeItem("ascq_suivi_enfants");
      setFemmes([]);
      setEnfants([]);
      setToastMsg("Données locales nettoyées à zéro.");
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const ouvrirModalEditFemme = (femme: FemmeEnceinte) => {
    setSelectedFemmeToEdit(femme);
    setEditFormFemme({
      nom: femme.nom,
      prenoms: femme.prenoms,
      age: femme.age ? String(femme.age) : "24",
      telephone: femme.telephone || "",
      telephone_conjoint: femme.telephone_conjoint || "",
      village_nom: femme.village_nom,
      date_ddr: femme.date_ddr || "",
      date_dpa: femme.date_dpa || "",
      statut_grossesse: femme.statut_grossesse,
      cpn_effectuees: femme.cpn_effectuees || [],
      tpi_sp_doses: Number(femme.tpi_sp_doses) || 0,
      fer_acide_folique: femme.fer_acide_folique,
      enov_mum: femme.enov_mum,
      mild_distribuee: femme.mild_distribuee,
      vaccin_td_doses: Number(femme.vaccin_td_doses) || 1,
      plan_accouchement_etabli: femme.plan_accouchement_etabli,
      notes_ascq: femme.notes_ascq || ""
    });
    setShowModalEditFemme(true);
  };

  const handleSauvegarderEditFemme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFemmeToEdit) return;

    const { dpa, sa } = calculerDpaEtSa(editFormFemme.date_ddr);
    const finalDpa = editFormFemme.date_dpa || dpa;

    const updatedFemme: FemmeEnceinte = {
      ...selectedFemmeToEdit,
      nom: editFormFemme.nom.trim().toUpperCase(),
      prenoms: editFormFemme.prenoms.trim(),
      age: Number(editFormFemme.age) || undefined,
      telephone: editFormFemme.telephone.trim() || undefined,
      telephone_conjoint: editFormFemme.telephone_conjoint.trim() || undefined,
      village_nom: editFormFemme.village_nom.trim(),
      date_ddr: editFormFemme.date_ddr || undefined,
      date_dpa: finalDpa || undefined,
      terme_sa: sa || selectedFemmeToEdit.terme_sa,
      statut_grossesse: editFormFemme.statut_grossesse,
      cpn_effectuees: editFormFemme.cpn_effectuees,
      tpi_sp_doses: Number(editFormFemme.tpi_sp_doses),
      fer_acide_folique: editFormFemme.fer_acide_folique,
      enov_mum: editFormFemme.enov_mum,
      mild_distribuee: editFormFemme.mild_distribuee,
      vaccin_td_doses: Number(editFormFemme.vaccin_td_doses),
      plan_accouchement_etabli: editFormFemme.plan_accouchement_etabli,
      notes_ascq: editFormFemme.notes_ascq.trim() || undefined
    };

    const nextList = femmes.map(f => f.id === selectedFemmeToEdit.id ? updatedFemme : f);
    setFemmes(nextList);
    localStorage.setItem("ascq_suivi_femmes", JSON.stringify(nextList));

    try {
      await supabase.from("suivi_femmes_enceintes").update({
        nom: updatedFemme.nom,
        prenoms: updatedFemme.prenoms,
        age: updatedFemme.age,
        telephone: updatedFemme.telephone,
        telephone_conjoint: updatedFemme.telephone_conjoint,
        village_nom: updatedFemme.village_nom,
        date_ddr: updatedFemme.date_ddr,
        date_dpa: updatedFemme.date_dpa,
        terme_sa: updatedFemme.terme_sa,
        statut_grossesse: updatedFemme.statut_grossesse,
        cpn_effectuees: updatedFemme.cpn_effectuees,
        tpi_sp_doses: updatedFemme.tpi_sp_doses,
        fer_acide_folique: updatedFemme.fer_acide_folique,
        enov_mum: updatedFemme.enov_mum,
        mild_distribuee: updatedFemme.mild_distribuee,
        vaccin_td_doses: updatedFemme.vaccin_td_doses,
        plan_accouchement_etabli: updatedFemme.plan_accouchement_etabli,
        notes_ascq: updatedFemme.notes_ascq,
        updated_at: new Date().toISOString()
      }).eq("id", selectedFemmeToEdit.id);
    } catch (e) {
      console.warn("Mise à jour en ligne différée");
    }

    setShowModalEditFemme(false);
    setSelectedFemmeToEdit(null);
    setToastMsg(`Fiche de ${updatedFemme.nom} ${updatedFemme.prenoms} mise à jour avec succès.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const supprimerFemme = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette fiche de suivi ?")) return;
    const nextList = femmes.filter(f => f.id !== id);
    setFemmes(nextList);
    localStorage.setItem("ascq_suivi_femmes", JSON.stringify(nextList));
    try {
      await supabase.from("suivi_femmes_enceintes").delete().eq("id", id);
    } catch (e) {}
    setToastMsg("Fiche supprimée.");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const ouvrirModalEditEnfant = (enfant: Enfant1000Jours) => {
    setSelectedEnfantToEdit(enfant);
    setEditFormEnfant({
      nom: enfant.nom,
      prenoms: enfant.prenoms,
      sexe: enfant.sexe,
      date_naissance: enfant.date_naissance,
      poids_naissance_kg: enfant.poids_naissance_kg ? String(enfant.poids_naissance_kg) : "3.2",
      nom_mere: enfant.nom_mere || "",
      telephone_parent: enfant.telephone_parent || "",
      village_nom: enfant.village_nom,
      allaitement_exclusif_6m: enfant.allaitement_exclusif_6m,
      vitamine_a_doses: Number(enfant.vitamine_a_doses) || 0,
      vermifuge_doses: Number(enfant.vermifuge_doses) || 0,
      produits_nutritionnels: enfant.produits_nutritionnels || [],
      dernier_pb_mm: enfant.dernier_pb_mm ? String(enfant.dernier_pb_mm) : "135",
      statut_nutritionnel: enfant.statut_nutritionnel || "NORMAL",
      presence_oedemes: Boolean(enfant.presence_oedemes),
      vaccins_recus: enfant.vaccins_recus || {},
      notes_ascq: enfant.notes_ascq || ""
    });
    setShowModalEditEnfant(true);
  };

  const handleSauvegarderEditEnfant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnfantToEdit) return;

    const pbNum = Number(editFormEnfant.dernier_pb_mm);
    let statutCalcule = editFormEnfant.statut_nutritionnel;
    if (editFormEnfant.presence_oedemes || (pbNum > 0 && pbNum < 115)) {
      statutCalcule = "MAS";
    } else if (pbNum >= 115 && pbNum < 125) {
      statutCalcule = "MAM";
    } else if (pbNum >= 125) {
      statutCalcule = "NORMAL";
    }

    const updatedEnfant: Enfant1000Jours = {
      ...selectedEnfantToEdit,
      nom: editFormEnfant.nom.trim().toUpperCase(),
      prenoms: editFormEnfant.prenoms.trim(),
      sexe: editFormEnfant.sexe,
      date_naissance: editFormEnfant.date_naissance,
      poids_naissance_kg: Number(editFormEnfant.poids_naissance_kg) || undefined,
      nom_mere: editFormEnfant.nom_mere.trim() || undefined,
      telephone_parent: editFormEnfant.telephone_parent.trim() || undefined,
      village_nom: editFormEnfant.village_nom.trim(),
      allaitement_exclusif_6m: editFormEnfant.allaitement_exclusif_6m,
      vitamine_a_doses: Number(editFormEnfant.vitamine_a_doses),
      vermifuge_doses: Number(editFormEnfant.vermifuge_doses),
      produits_nutritionnels: editFormEnfant.produits_nutritionnels,
      dernier_pb_mm: pbNum || undefined,
      statut_nutritionnel: statutCalcule,
      presence_oedemes: editFormEnfant.presence_oedemes,
      vaccins_recus: editFormEnfant.vaccins_recus,
      notes_ascq: editFormEnfant.notes_ascq.trim() || undefined
    };

    const nextList = enfants.map(enf => enf.id === selectedEnfantToEdit.id ? updatedEnfant : enf);
    setEnfants(nextList);
    localStorage.setItem("ascq_suivi_enfants", JSON.stringify(nextList));

    try {
      await supabase.from("suivi_enfants_1000_jours").update({
        nom: updatedEnfant.nom,
        prenoms: updatedEnfant.prenoms,
        sexe: updatedEnfant.sexe,
        date_naissance: updatedEnfant.date_naissance,
        poids_naissance_kg: updatedEnfant.poids_naissance_kg,
        nom_mere: updatedEnfant.nom_mere,
        telephone_parent: updatedEnfant.telephone_parent,
        village_nom: updatedEnfant.village_nom,
        allaitement_exclusif_6m: updatedEnfant.allaitement_exclusif_6m,
        vitamine_a_doses: updatedEnfant.vitamine_a_doses,
        vermifuge_doses: updatedEnfant.vermifuge_doses,
        produits_nutritionnels: updatedEnfant.produits_nutritionnels,
        dernier_pb_mm: updatedEnfant.dernier_pb_mm,
        statut_nutritionnel: updatedEnfant.statut_nutritionnel,
        presence_oedemes: updatedEnfant.presence_oedemes,
        vaccins_recus: updatedEnfant.vaccins_recus,
        notes_ascq: updatedEnfant.notes_ascq,
        updated_at: new Date().toISOString()
      }).eq("id", selectedEnfantToEdit.id);
    } catch (e) {
      console.warn("Mise à jour en ligne différée");
    }

    setShowModalEditEnfant(false);
    setSelectedEnfantToEdit(null);
    setToastMsg(`Fiche de ${updatedEnfant.nom} ${updatedEnfant.prenoms} mise à jour avec succès.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const supprimerEnfant = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette fiche d'enfant ?")) return;
    const nextList = enfants.filter(enf => enf.id !== id);
    setEnfants(nextList);
    localStorage.setItem("ascq_suivi_enfants", JSON.stringify(nextList));
    try {
      await supabase.from("suivi_enfants_1000_jours").delete().eq("id", id);
    } catch (e) {}
    setToastMsg("Fiche supprimée.");
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Calcul DPA automatique (Règle de Naegele : DDR + 9 mois + 7 jours = DDR + 280 jours)
  const calculerDpaEtSa = (ddrStr: string) => {
    if (!ddrStr) return { dpa: "", sa: 0 };
    const ddr = new Date(ddrStr);
    if (isNaN(ddr.getTime())) return { dpa: "", sa: 0 };

    const dpaDate = new Date(ddr.getTime() + 280 * 24 * 60 * 60 * 1000);
    const dpaStr = dpaDate.toISOString().split("T")[0];

    const today = new Date();
    const diffDays = Math.floor((today.getTime() - ddr.getTime()) / (1000 * 60 * 60 * 24));
    const sa = Math.max(1, Math.floor(diffDays / 7));

    return { dpa: dpaStr, sa };
  };

  // Chargement des données
  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const { data: profils } = await supabase.rpc("obtenir_mon_profil");
      if (!profils || profils.length === 0) {
        router.push("/connexion");
        return;
      }
      setUserProfile(profils[0]);

      // Charger femmes enceintes
      let loadedFemmes: FemmeEnceinte[] = [];
      try {
        const { data: dbFemmes, error } = await supabase
          .from("suivi_femmes_enceintes")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && dbFemmes && dbFemmes.length > 0) {
          loadedFemmes = dbFemmes;
        }
      } catch (e) {
        console.warn("Table suivi_femmes_enceintes inaccessible en ligne, lecture cache local");
      }

      // Si base vide ou hors-ligne, lire localStorage sans données fictives forcées
      if (loadedFemmes.length === 0) {
        const localFemmes = localStorage.getItem("ascq_suivi_femmes");
        if (localFemmes) {
          try {
            const parsed = JSON.parse(localFemmes);
            // Éliminer les anciens mock d'exemples s'ils existaient
            loadedFemmes = parsed.filter((f: any) => f.id !== "femme-1" && f.id !== "femme-2");
          } catch (e) {
            loadedFemmes = [];
          }
        }
      }
      setFemmes(loadedFemmes);

      // Charger enfants 1000 jours
      let loadedEnfants: Enfant1000Jours[] = [];
      try {
        const { data: dbEnfants, error } = await supabase
          .from("suivi_enfants_1000_jours")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && dbEnfants && dbEnfants.length > 0) {
          loadedEnfants = dbEnfants;
        }
      } catch (e) {
        console.warn("Table suivi_enfants_1000_jours inaccessible en ligne, lecture cache local");
      }

      if (loadedEnfants.length === 0) {
        const localEnfants = localStorage.getItem("ascq_suivi_enfants");
        if (localEnfants) {
          try {
            const parsed = JSON.parse(localEnfants);
            // Éliminer les anciens mock d'exemples s'ils existaient
            loadedEnfants = parsed.filter((enf: any) => enf.id !== "enfant-1" && enf.id !== "enfant-2");
          } catch (e) {
            loadedEnfants = [];
          }
        }
      }
      setEnfants(loadedEnfants);

    } catch (err) {
      console.error("Erreur générale maternité/enfance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  // Calcul de l'âge d'un enfant en mois / jours
  const calculerAgeEnfant = (dateNaissStr: string) => {
    const naiss = new Date(dateNaissStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - naiss.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const mois = Math.floor(diffDays / 30.4375);
    const semaines = Math.floor(diffDays / 7);

    if (diffDays < 30) return `${diffDays} jour(s) (${semaines} sem.)`;
    return `${mois} mois (${semaines} sem.)`;
  };

  // Enregistrement d'une femme enceinte
  const handleEnregistrerFemme = async (e: React.FormEvent) => {
    e.preventDefault();
    const { dpa, sa } = calculerDpaEtSa(formFemme.date_ddr);

    const nouvelleFemme: FemmeEnceinte = {
      id: "femme-" + Date.now(),
      nom: formFemme.nom.toUpperCase(),
      prenoms: formFemme.prenoms,
      age: parseInt(formFemme.age) || 20,
      telephone: formFemme.telephone,
      telephone_conjoint: formFemme.telephone_conjoint,
      village_nom: formFemme.village_nom || (userProfile?.village_nom || "Village"),
      date_ddr: formFemme.date_ddr,
      date_dpa: formFemme.date_dpa || dpa,
      terme_sa: sa,
      statut_grossesse: "EN_COURS",
      cpn_effectuees: formFemme.cpn_effectuees,
      tpi_sp_doses: formFemme.tpi_sp_doses,
      fer_acide_folique: formFemme.fer_acide_folique,
      enov_mum: formFemme.enov_mum,
      mild_distribuee: formFemme.mild_distribuee,
      vaccin_td_doses: formFemme.vaccin_td_doses,
      plan_accouchement_etabli: formFemme.plan_accouchement_etabli,
      notes_ascq: formFemme.notes_ascq,
      created_at: new Date().toISOString()
    };

    // Sauvegarde locale
    const updated = [nouvelleFemme, ...femmes];
    setFemmes(updated);
    localStorage.setItem("ascq_suivi_femmes", JSON.stringify(updated));

    // Tentative Supabase
    try {
      await supabase.from("suivi_femmes_enceintes").insert([{
        ascq_id: userProfile?.id,
        nom: nouvelleFemme.nom,
        prenoms: nouvelleFemme.prenoms,
        age: nouvelleFemme.age,
        telephone: nouvelleFemme.telephone,
        telephone_conjoint: nouvelleFemme.telephone_conjoint,
        village_nom: nouvelleFemme.village_nom,
        date_ddr: nouvelleFemme.date_ddr,
        date_dpa: nouvelleFemme.date_dpa,
        terme_sa: nouvelleFemme.terme_sa,
        statut_grossesse: "EN_COURS",
        cpn_effectuees: nouvelleFemme.cpn_effectuees,
        tpi_sp_doses: nouvelleFemme.tpi_sp_doses,
        fer_acide_folique: nouvelleFemme.fer_acide_folique,
        enov_mum: nouvelleFemme.enov_mum,
        mild_distribuee: nouvelleFemme.mild_distribuee,
        vaccin_td_doses: nouvelleFemme.vaccin_td_doses,
        plan_accouchement_etabli: nouvelleFemme.plan_accouchement_etabli,
        notes_ascq: nouvelleFemme.notes_ascq
      }]);
    } catch (e) {
      console.warn("Échec insertion distante, stocké en local");
    }

    setShowModalFemme(false);
    // Reset form
    setFormFemme({
      nom: "",
      prenoms: "",
      age: "24",
      telephone: "",
      telephone_conjoint: "",
      village_nom: "",
      date_ddr: "",
      date_dpa: "",
      cpn_effectuees: [],
      tpi_sp_doses: 0,
      fer_acide_folique: true,
      enov_mum: false,
      mild_distribuee: true,
      vaccin_td_doses: 1,
      plan_accouchement_etabli: true,
      notes_ascq: ""
    });
  };

  // Enregistrement d'un enfant
  const handleEnregistrerEnfant = async (e: React.FormEvent) => {
    e.preventDefault();

    const pbMm = parseInt(formEnfant.dernier_pb_mm) || 130;
    let statutNutrition: "NORMAL" | "MAM" | "MAS" = "NORMAL";
    if (pbMm < 115 || formEnfant.presence_oedemes) {
      statutNutrition = "MAS";
    } else if (pbMm < 125) {
      statutNutrition = "MAM";
    }

    const nouvelEnfant: Enfant1000Jours = {
      id: "enfant-" + Date.now(),
      nom: formEnfant.nom.toUpperCase(),
      prenoms: formEnfant.prenoms,
      sexe: formEnfant.sexe,
      date_naissance: formEnfant.date_naissance,
      poids_naissance_kg: parseFloat(formEnfant.poids_naissance_kg) || 3.0,
      nom_mere: formEnfant.nom_mere,
      telephone_parent: formEnfant.telephone_parent,
      village_nom: formEnfant.village_nom || (userProfile?.village_nom || "Village"),
      allaitement_exclusif_6m: formEnfant.allaitement_exclusif_6m,
      vitamine_a_doses: formEnfant.vitamine_a_doses,
      vermifuge_doses: formEnfant.vermifuge_doses,
      produits_nutritionnels: formEnfant.produits_nutritionnels,
      dernier_pb_mm: pbMm,
      statut_nutritionnel: statutNutrition,
      presence_oedemes: formEnfant.presence_oedemes,
      vaccins_recus: formEnfant.vaccins_recus,
      notes_ascq: formEnfant.notes_ascq,
      created_at: new Date().toISOString()
    };

    const updated = [nouvelEnfant, ...enfants];
    setEnfants(updated);
    localStorage.setItem("ascq_suivi_enfants", JSON.stringify(updated));

    try {
      await supabase.from("suivi_enfants_1000_jours").insert([{
        ascq_id: userProfile?.id,
        nom: nouvelEnfant.nom,
        prenoms: nouvelEnfant.prenoms,
        sexe: nouvelEnfant.sexe,
        date_naissance: nouvelEnfant.date_naissance,
        poids_naissance_kg: nouvelEnfant.poids_naissance_kg,
        nom_mere: nouvelEnfant.nom_mere,
        telephone_parent: nouvelEnfant.telephone_parent,
        village_nom: nouvelEnfant.village_nom,
        allaitement_exclusif_6m: nouvelEnfant.allaitement_exclusif_6m,
        vitamine_a_doses: nouvelEnfant.vitamine_a_doses,
        vermifuge_doses: nouvelEnfant.vermifuge_doses,
        produits_nutritionnels: nouvelEnfant.produits_nutritionnels,
        dernier_pb_mm: nouvelEnfant.dernier_pb_mm,
        statut_nutritionnel: nouvelEnfant.statut_nutritionnel,
        presence_oedemes: nouvelEnfant.presence_oedemes,
        vaccins_recus: nouvelEnfant.vaccins_recus,
        notes_ascq: nouvelEnfant.notes_ascq
      }]);
    } catch (e) {
      console.warn("Échec insertion distante enfant, stocké en local");
    }

    setShowModalEnfant(false);
    setFormEnfant({
      nom: "",
      prenoms: "",
      sexe: "M",
      date_naissance: "",
      poids_naissance_kg: "3.2",
      nom_mere: "",
      telephone_parent: "",
      village_nom: "",
      allaitement_exclusif_6m: true,
      vitamine_a_doses: 0,
      vermifuge_doses: 0,
      produits_nutritionnels: [],
      dernier_pb_mm: "135",
      presence_oedemes: false,
      vaccins_recus: {},
      notes_ascq: ""
    });
  };

  // Clôturer l'accouchement et éventuellement créer l'enfant
  const handleValiderAccouchement = async () => {
    if (!femmePourAccouchement) return;

    // 1. Mettre à jour la femme
    const updatedFemmes = femmes.map(f => {
      if (f.id === femmePourAccouchement.id) {
        return {
          ...f,
          statut_grossesse: "ACCOUCHEE" as const,
          date_accouchement: formAccouchement.date_accouchement,
          lieu_accouchement: formAccouchement.lieu_accouchement,
          issue_bebe: formAccouchement.issue_bebe,
          poids_naissance_kg: parseFloat(formAccouchement.poids_naissance_kg) || 3.0
        };
      }
      return f;
    });
    setFemmes(updatedFemmes);
    localStorage.setItem("ascq_suivi_femmes", JSON.stringify(updatedFemmes));

    // 2. Si création automatique de l'enfant
    if (formAccouchement.creerFicheEnfant && formAccouchement.issue_bebe === "VIVANT") {
      const bebeNom = formAccouchement.nom_bebe.trim() || femmePourAccouchement.nom;
      const bebePrenom = formAccouchement.prenoms_bebe.trim() || "Nouveau-né";

      const bebe: Enfant1000Jours = {
        id: "enfant-" + Date.now(),
        nom: bebeNom.toUpperCase(),
        prenoms: bebePrenom,
        sexe: formAccouchement.sexe_bebe,
        date_naissance: formAccouchement.date_accouchement,
        poids_naissance_kg: parseFloat(formAccouchement.poids_naissance_kg) || 3.0,
        nom_mere: `${femmePourAccouchement.nom} ${femmePourAccouchement.prenoms}`,
        telephone_parent: femmePourAccouchement.telephone,
        village_nom: femmePourAccouchement.village_nom,
        allaitement_exclusif_6m: true,
        vitamine_a_doses: 0,
        vermifuge_doses: 0,
        produits_nutritionnels: [],
        dernier_pb_mm: 128,
        statut_nutritionnel: "NORMAL",
        presence_oedemes: false,
        vaccins_recus: {
          "BCG": "En attente / CS",
          "HepB_naiss": "En attente / CS",
          "VPO_0": "En attente / CS"
        },
        notes_ascq: `Né(e) à ${formAccouchement.lieu_accouchement}. Poids: ${formAccouchement.poids_naissance_kg} kg.`
      };

      const updatedEnfants = [bebe, ...enfants];
      setEnfants(updatedEnfants);
      localStorage.setItem("ascq_suivi_enfants", JSON.stringify(updatedEnfants));
    }

    setShowModalAccouchement(false);
    setFemmePourAccouchement(null);
  };

  // Liste des alertes et rappels calculés en temps réel
  const rappelsTerrain = useMemo(() => {
    const alerts: {
      id: string;
      type: "DPA_IMMINENTE" | "CPN_RETARD" | "VACCIN_RETARD" | "ZERO_DOSE" | "NUTRITION_ALERTE";
      titre: string;
      cible: string;
      village: string;
      details: string;
      telephone?: string;
      gravite: "HAUTE" | "MOYENNE" | "INFO";
    }[] = [];

    const now = new Date();

    // 1. Alertes Grossesses
    femmes.forEach(f => {
      if (f.statut_grossesse === "EN_COURS") {
        // DPA imminente (< 15 jours)
        if (f.date_dpa) {
          const dpaDate = new Date(f.date_dpa);
          const diffJours = Math.ceil((dpaDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffJours <= 15 && diffJours >= -5) {
            alerts.push({
              id: `dpa-${f.id}`,
              type: "DPA_IMMINENTE",
              titre: diffJours <= 0 ? "Terme atteint / Dépassement imminent" : `Accouchement prévu dans ${diffJours} jour(s)`,
              cible: `${f.nom} ${f.prenoms} (${f.age || 20} ans)`,
              village: f.village_nom,
              details: `DPA : ${new Date(f.date_dpa).toLocaleDateString("fr-FR")}. S'assurer que le plan d'accouchement sécurisé est prêt (transport, maternité, épargne).`,
              telephone: f.telephone,
              gravite: "HAUTE"
            });
          }
        }

        // CPN en retard (ex: > 16 SA sans CPN 2, ou > 28 SA sans CPN 3)
        const sa = f.terme_sa || 0;
        if (sa >= 16 && !f.cpn_effectuees.includes("CPN2")) {
          alerts.push({
            id: `cpn-${f.id}`,
            type: "CPN_RETARD",
            titre: `CPN 2 attendue (${sa} SA)`,
            cible: `${f.nom} ${f.prenoms}`,
            village: f.village_nom,
            details: "La femme a dépassé 16 semaines sans validation de la 2ème CPN et de la 1ère dose de SP-IPT.",
            telephone: f.telephone,
            gravite: "MOYENNE"
          });
        }
      }
    });

    // 2. Alertes Enfants (Vaccins & Nutrition)
    enfants.forEach(e => {
      const naiss = new Date(e.date_naissance);
      const diffJours = Math.floor((now.getTime() - naiss.getTime()) / (1000 * 60 * 60 * 24));
      const mois = Math.floor(diffJours / 30.4375);

      // Zéro dose
      if (Object.keys(e.vaccins_recus).length === 0 && diffJours > 14) {
        alerts.push({
          id: `zerodose-${e.id}`,
          type: "ZERO_DOSE",
          titre: "Enfant ZÉRO-DOSE détecté !",
          cible: `${e.nom} ${e.prenoms} (Mère: ${e.nom_mere || "N/A"})`,
          village: e.village_nom,
          details: "Aucun vaccin de routine enregistré après 14 jours de vie. Ratissage prioritaire requis vers le CS.",
          telephone: e.telephone_parent,
          gravite: "HAUTE"
        });
      }

      // Retard Penta 1 (> 8 semaines)
      if (diffJours > 56 && !e.vaccins_recus["Penta_1"]) {
        alerts.push({
          id: `penta1-${e.id}`,
          type: "VACCIN_RETARD",
          titre: "Retard vaccinal Pentavalent 1",
          cible: `${e.nom} ${e.prenoms} (${calculerAgeEnfant(e.date_naissance)})`,
          village: e.village_nom,
          details: "Enfant de plus de 8 semaines sans dose de Penta 1 / VPO 1 / Pneumo 1 / Rota 1.",
          telephone: e.telephone_parent,
          gravite: "HAUTE"
        });
      }

      // Retard Rougeole-Rubéole / Fièvre Jaune (> 9 mois)
      if (mois >= 9 && !e.vaccins_recus["RR_1"]) {
        alerts.push({
          id: `rr-${e.id}`,
          type: "VACCIN_RETARD",
          titre: "Eligible Rougeole-Rubéole & Fièvre Jaune (9 mois)",
          cible: `${e.nom} ${e.prenoms} (${mois} mois)`,
          village: e.village_nom,
          details: "Vaccin RR 1, Fièvre jaune (VAA) et 3ème dose de vaccin antipaludique (VAP 3) à administrer.",
          telephone: e.telephone_parent,
          gravite: "MOYENNE"
        });
      }

      // Dépistage Malnutrition (MAM ou MAS)
      if (e.statut_nutritionnel === "MAS" || e.presence_oedemes) {
        alerts.push({
          id: `mas-${e.id}`,
          type: "NUTRITION_ALERTE",
          titre: "URGENCE : Malnutrition Aiguë Sévère (PB Rouge)",
          cible: `${e.nom} ${e.prenoms} (PB: ${e.dernier_pb_mm || "<115"} mm)`,
          village: e.village_nom,
          details: "Référence d'urgence requise au Centre de Santé / CREN pour prise en charge médicale et ATPE (Plumpy'Nut).",
          telephone: e.telephone_parent,
          gravite: "HAUTE"
        });
      } else if (e.statut_nutritionnel === "MAM") {
        alerts.push({
          id: `mam-${e.id}`,
          type: "NUTRITION_ALERTE",
          titre: "Malnutrition Aiguë Modérée (PB Jaune : 115-124 mm)",
          cible: `${e.nom} ${e.prenoms}`,
          village: e.village_nom,
          details: "Supplémentation Nutributter+ et démonstration culinaire de bouillies enrichies requises.",
          telephone: e.telephone_parent,
          gravite: "MOYENNE"
        });
      }
    });

    return alerts;
  }, [femmes, enfants]);

  // Filtrage femmes
  const filteredFemmes = useMemo(() => {
    return femmes.filter(f => {
      const matchSearch = 
        f.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.prenoms.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.village_nom.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatut = 
        filterStatut === "TOUS" || 
        (filterStatut === "EN_COURS" && f.statut_grossesse === "EN_COURS") ||
        (filterStatut === "ACCOUCHEE" && f.statut_grossesse === "ACCOUCHEE");

      return matchSearch && matchStatut;
    });
  }, [femmes, searchQuery, filterStatut]);

  // Filtrage enfants
  const filteredEnfants = useMemo(() => {
    return enfants.filter(e => {
      const matchSearch = 
        e.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.prenoms.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.village_nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.nom_mere && e.nom_mere.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatut =
        filterStatut === "TOUS" ||
        (filterStatut === "NORMAL" && e.statut_nutritionnel === "NORMAL") ||
        (filterStatut === "MAM" && e.statut_nutritionnel === "MAM") ||
        (filterStatut === "MAS" && e.statut_nutritionnel === "MAS");

      return matchSearch && matchStatut;
    });
  }, [enfants, searchQuery, filterStatut]);

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-24">
      <AscqNav userProfile={userProfile} />

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-4">
        
        {/* En-tête officiel */}
        <div className="bg-gradient-to-r from-[#005c30] to-emerald-800 rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-emerald-100 text-xs font-bold backdrop-blur-xs">
                <Baby className="w-3.5 h-3.5" />
                <span>Programme National de Santé Communautaire & 1 000 Jours</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Suivi Maternité & Petite Enfance (0-59 mois)
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 max-w-xl leading-relaxed">
                Suivi continu des femmes enceintes jusqu'à l'accouchement, surveillance nutritionnelle dans les 1 000 premiers jours et rattrapage vaccinal de routine.
              </p>
            </div>

            {/* Actions d'ajout rapide */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowModalFemme(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white text-[#005c30] font-black text-xs shadow-sm hover:bg-emerald-50 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>Enregistrer Femme Enceinte</span>
              </button>
              <button
                type="button"
                onClick={() => setShowModalEnfant(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-emerald-600/90 text-white font-black text-xs border border-white/20 shadow-sm hover:bg-emerald-600 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Enregistrer Nouveau-né / Enfant</span>
              </button>
            </div>
          </div>

          {/* Statistiques clés en bas du bandeau */}
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/15 text-center">
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
              <span className="block text-lg sm:text-xl font-black text-white">
                {femmes.filter(f => f.statut_grossesse === "EN_COURS").length}
              </span>
              <span className="text-[11px] text-emerald-100 font-semibold">
                Grossesses en cours
              </span>
            </div>
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
              <span className="block text-lg sm:text-xl font-black text-white">
                {enfants.length}
              </span>
              <span className="text-[11px] text-emerald-100 font-semibold">
                Enfants 0-59 mois
              </span>
            </div>
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
              <span className="block text-lg sm:text-xl font-black text-amber-300">
                {rappelsTerrain.length}
              </span>
              <span className="text-[11px] text-amber-100 font-semibold">
                Rappels & Alertes
              </span>
            </div>
          </div>
        </div>

        {/* TOAST MESSAGE */}
        {toastMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-950 font-bold flex items-center justify-between shadow-sm">
            <span>✅ {toastMsg}</span>
            <button onClick={() => setToastMsg(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* LIAISONS INTELLIGENTES & NETTOYAGE */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/espace-ascq/consultations"
              className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 font-bold flex items-center gap-1 shrink-0 shadow-2xs"
            >
              <Stethoscope className="w-3.5 h-3.5 text-[#005c30]" />
              <span>Prise en charge iCCM</span>
            </Link>
            <Link
              href="/espace-ascq/references"
              className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 font-bold flex items-center gap-1 shrink-0 shadow-2xs"
            >
              <Heart className="w-3.5 h-3.5 text-amber-600" />
              <span>Références CS/GUPS</span>
            </Link>
            <Link
              href="/briefing"
              className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 font-bold flex items-center gap-1 shrink-0 shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Guide SIMR & Vaccins</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={viderDonneesLocales}
            className="px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] shrink-0 transition-all flex items-center gap-1"
            title="Effacer les données de test locales"
          >
            <Trash2 className="w-3 h-3 text-red-600" />
            <span>Nettoyer cache à zéro</span>
          </button>
        </div>

        {/* Onglets de navigation principale */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => { setActiveTab("femmes"); setFilterStatut("TOUS"); }}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === "femmes"
                ? "bg-[#005c30] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Femmes Enceintes & Maternité</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-extrabold">
              {femmes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("enfants"); setFilterStatut("TOUS"); }}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === "enfants"
                ? "bg-[#005c30] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Baby className="w-4 h-4" />
            <span>Enfants 1000 Jours & Nutrition</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-extrabold">
              {enfants.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rappels")}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all relative ${
              activeTab === "rappels"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Bell className="w-4 h-4 text-amber-500" />
            <span>Rappels & Vigilance</span>
            {rappelsTerrain.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-black animate-pulse">
                {rappelsTerrain.length}
              </span>
            )}
          </button>
        </div>

        {/* Barre de recherche et filtres rapides */}
        {activeTab !== "rappels" && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === "femmes"
                    ? "Rechercher une femme enceinte par nom, prénom ou village..."
                    : "Rechercher un enfant, mère ou village..."
                }
                className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30] shadow-sm text-slate-800"
              />
            </div>

            {/* Filtre d'état */}
            {activeTab === "femmes" ? (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: "TOUS", label: "Toutes" },
                  { id: "EN_COURS", label: "Grossesses en cours" },
                  { id: "ACCOUCHEE", label: "Accouchées" }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setFilterStatut(opt.id)}
                    className={`px-3 py-2 rounded-xl font-bold border transition-all shrink-0 ${
                      filterStatut === opt.id
                        ? "bg-[#005c30] text-white border-[#005c30]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: "TOUS", label: "Tous les statuts" },
                  { id: "NORMAL", label: "🟢 Normal" },
                  { id: "MAM", label: "🟡 MAM" },
                  { id: "MAS", label: "🔴 MAS" }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setFilterStatut(opt.id)}
                    className={`px-3 py-2 rounded-xl font-bold border transition-all shrink-0 ${
                      filterStatut === opt.id
                        ? "bg-[#005c30] text-white border-[#005c30]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 1 : FEMMES ENCEINTES & MATERNITÉ                   */}
        {/* ========================================================= */}
        {activeTab === "femmes" && (
          <div className="space-y-3">
            {filteredFemmes.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm space-y-3">
                <Heart className="w-10 h-10 text-rose-300 mx-auto" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Aucune femme enceinte enregistrée
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Enregistrez les femmes enceintes de votre zone pour suivre leur calendrier CPN, la supplémentation Enov'Mum+ et leur accouchement sécurisé.
                </p>
                <button
                  type="button"
                  onClick={() => setShowModalFemme(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005c30] text-white font-bold text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enregistrer une femme enceinte</span>
                </button>
              </div>
            ) : (
              filteredFemmes.map((femme) => {
                const estAccouchee = femme.statut_grossesse === "ACCOUCHEE";

                return (
                  <div
                    key={femme.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3 hover:border-emerald-300 transition-all"
                  >
                    {/* Ligne 1 : Nom, Statut, SA */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-base">
                            {femme.nom} {femme.prenoms}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">
                            • {femme.age || 20} ans
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {femme.village_nom}
                          </span>
                        </div>

                        {/* Téléphone & Contact */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          {femme.telephone && (
                            <a
                              href={`tel:${femme.telephone}`}
                              className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>{femme.telephone}</span>
                            </a>
                          )}
                          {femme.telephone_conjoint && (
                            <span className="text-slate-400">
                              Conjoint : {femme.telephone_conjoint}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Statut & Terme SA */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {estAccouchee ? (
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            🎉 Accouchée le {femme.date_accouchement || "Récemment"}
                          </span>
                        ) : (
                          <div className="text-right">
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-200 block">
                              {femme.terme_sa || 0} Semaines d'Aménorrhée (SA)
                            </span>
                            {femme.date_dpa && (
                              <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
                                DPA : {new Date(femme.date_dpa).toLocaleDateString("fr-FR")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ligne 2 : Suivi CPN & Interventions Bénin */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                      <div className="space-y-1.5">
                        <span className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider block">
                          Consultations Prénatales (CPN)
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {["CPN1", "CPN2", "CPN3", "CPN4", "CPN5", "CPN6", "CPN7", "CPN8"].map((cpnName) => {
                            const estFait = femme.cpn_effectuees.includes(cpnName);
                            return (
                              <span
                                key={cpnName}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                                  estFait
                                    ? "bg-emerald-600 text-white shadow-2xs"
                                    : "bg-slate-200/70 text-slate-400"
                                }`}
                              >
                                {cpnName}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider block">
                          Interventions Reçues
                        </span>
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <span className={`px-2 py-0.5 rounded-md font-bold ${
                            femme.tpi_sp_doses > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                          }`}>
                            💊 SP-IPT : {femme.tpi_sp_doses} dose(s)
                          </span>
                          <span className={`px-2 py-0.5 rounded-md font-bold ${
                            femme.fer_acide_folique ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                          }`}>
                            🩸 Fer/Ac. Folique
                          </span>
                          {femme.enov_mum && (
                            <span className="px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              ✨ Enov'Mum+
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-md font-bold ${
                            femme.mild_distribuee ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-500"
                          }`}>
                            🛡️ MILD
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Notes de l'ASCQ */}
                    {femme.notes_ascq && (
                      <p className="text-xs text-slate-600 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/80">
                        ✍️ {femme.notes_ascq}
                      </p>
                    )}

                    {/* Ligne 3 : Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        {femme.telephone && (
                          <a
                            href={`https://wa.me/${femme.telephone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100"
                          >
                            <span>WhatsApp</span>
                          </a>
                        )}
                        <Link
                          href={`/espace-ascq/references?type=cs&nom=${encodeURIComponent(femme.nom + " " + femme.prenoms)}&village=${encodeURIComponent(femme.village_nom)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                        >
                          <span>Référer CS</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => ouvrirModalEditFemme(femme)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-800 font-bold hover:bg-blue-100 transition-all border border-blue-200"
                          title="Modifier les informations de la fiche"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Modifier fiche</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => supprimerFemme(femme.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Supprimer la fiche"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Bouton Clôture accouchement */}
                      {!estAccouchee && (
                        <button
                          type="button"
                          onClick={() => {
                            setFemmePourAccouchement(femme);
                            setFormAccouchement(prev => ({
                              ...prev,
                              nom_bebe: femme.nom,
                              prenoms_bebe: ""
                            }));
                            setShowModalAccouchement(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#005c30] text-white font-black text-xs hover:bg-[#004724] shadow-xs active:scale-95 transition-all shrink-0"
                        >
                          <Baby className="w-3.5 h-3.5" />
                          <span>Enregistrer Accouchement</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 2 : ENFANTS 1 000 JOURS & NUTRITION                */}
        {/* ========================================================= */}
        {activeTab === "enfants" && (
          <div className="space-y-3">
            {filteredEnfants.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm space-y-3">
                <Baby className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Aucun enfant enregistré
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Enregistrez les nourrissons et enfants de 0 à 59 mois pour suivre leurs vaccins PEV, la mesure du périmètre brachial et la supplémentation Nutributter+.
                </p>
                <button
                  type="button"
                  onClick={() => setShowModalEnfant(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005c30] text-white font-bold text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enregistrer un enfant</span>
                </button>
              </div>
            ) : (
              filteredEnfants.map((enfant) => {
                const ageLibelle = calculerAgeEnfant(enfant.date_naissance);

                const badgeNutrition = {
                  NORMAL: { bg: "bg-emerald-100 text-emerald-900 border-emerald-200", label: "🟢 Normal (PB ≥ 125mm)" },
                  MAM: { bg: "bg-amber-100 text-amber-900 border-amber-300", label: "🟡 MAM (PB 115-124mm)" },
                  MAS: { bg: "bg-red-100 text-red-900 border-red-300 font-black animate-pulse", label: "🔴 MAS (PB < 115mm ou Œdèmes)" },
                  NON_EVALUE: { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Non évalué" }
                }[enfant.statut_nutritionnel];

                return (
                  <div
                    key={enfant.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3 hover:border-emerald-300 transition-all"
                  >
                    {/* Ligne 1 : Nom, Sexe, Âge, Village */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-base">
                            {enfant.nom} {enfant.prenoms}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            enfant.sexe === "M" ? "bg-blue-100 text-blue-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            {enfant.sexe === "M" ? "Garçon" : "Fille"}
                          </span>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            ⏳ {ageLibelle}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {enfant.village_nom}
                          </span>
                        </div>

                        {/* Mère / Parent */}
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {enfant.nom_mere && (
                            <span>Mère : <strong>{enfant.nom_mere}</strong></span>
                          )}
                          {enfant.telephone_parent && (
                            <a
                              href={`tel:${enfant.telephone_parent}`}
                              className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{enfant.telephone_parent}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Badge Nutritionnel */}
                      <div className="self-start sm:self-auto">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border block ${badgeNutrition.bg}`}>
                          {badgeNutrition.label}
                        </span>
                        {enfant.dernier_pb_mm && (
                          <span className="text-[11px] text-slate-500 text-right block mt-0.5 font-medium">
                            PB mesuré : <strong>{enfant.dernier_pb_mm} mm</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ligne 2 : Nutrition & 1000 Jours */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100">
                      <div className="space-y-1">
                        <span className="font-extrabold text-emerald-950 uppercase text-[10px] tracking-wider block">
                          Nutrition 1 000 Premiers Jours
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                          <span className={`px-2 py-0.5 rounded-md font-bold ${
                            enfant.allaitement_exclusif_6m ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-500"
                          }`}>
                            🤱 AME 6 mois : {enfant.allaitement_exclusif_6m ? "Oui" : "Non"}
                          </span>
                          <span className="px-2 py-0.5 rounded-md font-bold bg-cyan-100 text-cyan-900">
                            💧 Vit. A : {enfant.vitamine_a_doses} dose(s)
                          </span>
                          <span className="px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-900">
                            🪱 Vermifuge : {enfant.vermifuge_doses} dose(s)
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="font-extrabold text-emerald-950 uppercase text-[10px] tracking-wider block">
                          Produits Spécifiques Reçus
                        </span>
                        <div className="flex items-center gap-1 flex-wrap text-[11px]">
                          {enfant.produits_nutritionnels && enfant.produits_nutritionnels.length > 0 ? (
                            enfant.produits_nutritionnels.map((prod, pIdx) => (
                              <span
                                key={pIdx}
                                className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-900 font-black shadow-2xs"
                              >
                                {prod}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Aucun produit spécifique</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Doses de vaccins enregistrées */}
                    <div className="space-y-1.5">
                      <span className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider block">
                        Vaccins reçus (PEV Bénin)
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        {Object.keys(enfant.vaccins_recus).length > 0 ? (
                          Object.entries(enfant.vaccins_recus).map(([vaccinKey, val]) => (
                            <span
                              key={vaccinKey}
                              className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-900 font-extrabold"
                            >
                              ✓ {vaccinKey}
                            </span>
                          ))
                        ) : (
                          <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            ⚠️ Aucun vaccin renseigné (Vérifier carnet de santé)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions rapides */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        {enfant.telephone_parent && (
                          <a
                            href={`https://wa.me/${enfant.telephone_parent.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100"
                          >
                            <span>WhatsApp</span>
                          </a>
                        )}
                        <Link
                          href={`/espace-ascq/consultations?enfantId=${enfant.id}&nom=${encodeURIComponent(enfant.nom + " " + enfant.prenoms)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>Prise en charge</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => ouvrirModalEditEnfant(enfant)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-800 font-bold hover:bg-blue-100 transition-all border border-blue-200"
                          title="Modifier les informations de la fiche"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Modifier fiche</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => supprimerEnfant(enfant.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Supprimer la fiche"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <Link
                        href={`/espace-ascq/references?type=cs&nom=${encodeURIComponent(enfant.nom + " " + enfant.prenoms)}&village=${encodeURIComponent(enfant.village_nom)}&motif=${encodeURIComponent("Suivi croissance / vaccin " + enfant.statut_nutritionnel)}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs hover:bg-rose-100 shrink-0"
                      >
                        <span>Référer CS</span>
                      </Link>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 3 : RAPPELS & VIGILANCE TERRAIN                     */}
        {/* ========================================================= */}
        {activeTab === "rappels" && (
          <div className="space-y-4">
            
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-2">
              <div className="flex items-center gap-2 font-black text-amber-950 text-sm">
                <Bell className="w-5 h-5 text-amber-600 animate-bounce" />
                <span>Rappels Automatiques & Détection Proactive des Retards</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Ce module analyse en continu les dates présumées d'accouchement (DPA), les rendez-vous CPN, les tranches d'âge vaccinales et le ruban nutritionnel pour guider les visites à domicile du Relais Communautaire.
              </p>
            </div>

            {rappelsTerrain.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Aucun retard ou alerte pour le moment !
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Toutes les femmes enceintes et les enfants enregistrés sont à jour dans leurs CPN et calendriers de soins.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rappelsTerrain.map((alerte) => {
                  const isHaute = alerte.gravite === "HAUTE";

                  return (
                    <div
                      key={alerte.id}
                      className={`rounded-3xl p-4 sm:p-5 border transition-all ${
                        isHaute
                          ? "bg-red-50/60 border-red-200 shadow-sm"
                          : "bg-amber-50/50 border-amber-200"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isHaute ? "bg-red-600 text-white" : "bg-amber-600 text-white"
                            }`}>
                              {alerte.type.replace(/_/g, " ")}
                            </span>
                            <span className="font-black text-slate-900 text-sm sm:text-base">
                              {alerte.titre}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-slate-700">
                            Cible : {alerte.cible} • <span className="text-slate-500">{alerte.village}</span>
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {alerte.details}
                          </p>
                        </div>

                        {/* Actions directes */}
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                          {alerte.telephone && (
                            <a
                              href={`tel:${alerte.telephone}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs shadow-2xs hover:bg-slate-50"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Appeler</span>
                            </a>
                          )}
                          <Link
                            href={`/espace-ascq/references?nom=${encodeURIComponent(alerte.cible)}&village=${encodeURIComponent(alerte.village)}&motif=${encodeURIComponent(alerte.titre)}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#005c30] text-white font-bold text-xs shadow-2xs hover:bg-[#004724]"
                          >
                            <span>Référer CS</span>
                          </Link>
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

      {/* ========================================================= */}
      {/* MODAL 4 : MODIFIER UNE FEMME ENCEINTE */}
      {showModalEditFemme && selectedFemmeToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-base">
                  Modifier Fiche : {selectedFemmeToEdit.nom} {selectedFemmeToEdit.prenoms}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalEditFemme(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSauvegarderEditFemme} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={editFormFemme.nom}
                    onChange={(e) => setEditFormFemme({ ...editFormFemme, nom: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prénoms *</label>
                  <input
                    type="text"
                    required
                    value={editFormFemme.prenoms}
                    onChange={(e) => setEditFormFemme({ ...editFormFemme, prenoms: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Âge</label>
                  <input
                    type="number"
                    value={editFormFemme.age}
                    onChange={(e) => setEditFormFemme({ ...editFormFemme, age: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Village / Quartier *</label>
                  <input
                    type="text"
                    required
                    value={editFormFemme.village_nom}
                    onChange={(e) => setEditFormFemme({ ...editFormFemme, village_nom: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Téléphone Femme</label>
                  <input
                    type="tel"
                    value={editFormFemme.telephone}
                    onChange={(e) => setEditFormFemme({ ...editFormFemme, telephone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Téléphone Conjoint</label>
                  <input
                    type="tel"
                    value={editFormFemme.telephone_conjoint}
                    onChange={(e) => setEditFormFemme({ ...editFormFemme, telephone_conjoint: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
                <div>
                  <label className="font-bold text-purple-950 block mb-1">Date DDR</label>
                  <input
                    type="date"
                    value={editFormFemme.date_ddr}
                    onChange={(e) => {
                      const ddr = e.target.value;
                      const { dpa } = calculerDpaEtSa(ddr);
                      setEditFormFemme({ ...editFormFemme, date_ddr: ddr, date_dpa: dpa || editFormFemme.date_dpa });
                    }}
                    className="w-full p-2 rounded-xl border border-purple-200 bg-white text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-purple-950 block mb-1">DPA calculée</label>
                  <input
                    type="date"
                    value={editFormFemme.date_dpa}
                    onChange={(e) => setEditFormFemme({ ...editFormFemme, date_dpa: e.target.value })}
                    className="w-full p-2 rounded-xl border border-purple-200 bg-white text-slate-800 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Statut de la grossesse</label>
                <select
                  value={editFormFemme.statut_grossesse}
                  onChange={(e) => setEditFormFemme({ ...editFormFemme, statut_grossesse: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-bold"
                >
                  <option value="EN_COURS">Grossesse en cours</option>
                  <option value="ACCOUCHEE">Accouchée</option>
                  <option value="REFEREE_URGENCE">Référée d'urgence au Centre de Santé</option>
                  <option value="FAUSSE_COUCHE">Fausse couche / Interruption</option>
                </select>
              </div>

              {/* CPN Effectuées */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Consultations Prénatales (CPN) faites :</label>
                <div className="flex flex-wrap gap-1.5">
                  {["CPN1", "CPN2", "CPN3", "CPN4", "CPN5", "CPN6", "CPN7", "CPN8"].map((cpn) => {
                    const active = editFormFemme.cpn_effectuees.includes(cpn);
                    return (
                      <button
                        key={cpn}
                        type="button"
                        onClick={() => {
                          const nextCpn = active 
                            ? editFormFemme.cpn_effectuees.filter(c => c !== cpn)
                            : [...editFormFemme.cpn_effectuees, cpn];
                          setEditFormFemme({ ...editFormFemme, cpn_effectuees: nextCpn });
                        }}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${
                          active
                            ? "bg-purple-700 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {cpn} {active ? "✓" : "+"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interventions reçues */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Doses TPI / SP (Paludisme)</label>
                  <select
                    value={editFormFemme.tpi_sp_doses}
                    onChange={(e) => setEditFormFemme({ ...editFormFemme, tpi_sp_doses: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} dose(s)</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vaccin Td (Tétanos)</label>
                  <select
                    value={editFormFemme.vaccin_td_doses}
                    onChange={(e) => setEditFormFemme({ ...editFormFemme, vaccin_td_doses: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Td {n}</option>)}
                  </select>
                </div>

                <div className="col-span-2 space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormFemme.fer_acide_folique}
                      onChange={(e) => setEditFormFemme({ ...editFormFemme, fer_acide_folique: e.target.checked })}
                      className="rounded text-[#005c30]"
                    />
                    <span className="font-bold text-slate-700">Fer et Acide Folique reçus</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormFemme.enov_mum}
                      onChange={(e) => setEditFormFemme({ ...editFormFemme, enov_mum: e.target.checked })}
                      className="rounded text-[#005c30]"
                    />
                    <span className="font-bold text-amber-900">Supplémentation Enov'Mum+ reçue</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormFemme.mild_distribuee}
                      onChange={(e) => setEditFormFemme({ ...editFormFemme, mild_distribuee: e.target.checked })}
                      className="rounded text-[#005c30]"
                    />
                    <span className="font-bold text-teal-900">Moustiquaire imprégnée (MILD) remise</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormFemme.plan_accouchement_etabli}
                      onChange={(e) => setEditFormFemme({ ...editFormFemme, plan_accouchement_etabli: e.target.checked })}
                      className="rounded text-[#005c30]"
                    />
                    <span className="font-bold text-slate-700">Plan d'accouchement sécurisé établi</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes et observations ASCQ</label>
                <textarea
                  rows={2}
                  value={editFormFemme.notes_ascq}
                  onChange={(e) => setEditFormFemme({ ...editFormFemme, notes_ascq: e.target.value })}
                  placeholder="Remarques particulières..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModalEditFemme(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#005c30] text-white font-bold hover:bg-[#004724] shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5 : MODIFIER UN ENFANT 1000 JOURS */}
      {showModalEditEnfant && selectedEnfantToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-base">
                  Modifier Fiche : {selectedEnfantToEdit.nom} {selectedEnfantToEdit.prenoms}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalEditEnfant(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSauvegarderEditEnfant} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={editFormEnfant.nom}
                    onChange={(e) => setEditFormEnfant({ ...editFormEnfant, nom: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prénoms *</label>
                  <input
                    type="text"
                    required
                    value={editFormEnfant.prenoms}
                    onChange={(e) => setEditFormEnfant({ ...editFormEnfant, prenoms: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sexe *</label>
                  <select
                    value={editFormEnfant.sexe}
                    onChange={(e) => setEditFormEnfant({ ...editFormEnfant, sexe: e.target.value as "M" | "F" })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                  >
                    <option value="M">Masculin (M)</option>
                    <option value="F">Féminin (F)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date Naissance *</label>
                  <input
                    type="date"
                    required
                    value={editFormEnfant.date_naissance}
                    onChange={(e) => setEditFormEnfant({ ...editFormEnfant, date_naissance: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Poids naiss. (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editFormEnfant.poids_naissance_kg}
                    onChange={(e) => setEditFormEnfant({ ...editFormEnfant, poids_naissance_kg: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nom de la Mère</label>
                  <input
                    type="text"
                    value={editFormEnfant.nom_mere}
                    onChange={(e) => setEditFormEnfant({ ...editFormEnfant, nom_mere: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Téléphone Parent</label>
                  <input
                    type="tel"
                    value={editFormEnfant.telephone_parent}
                    onChange={(e) => setEditFormEnfant({ ...editFormEnfant, telephone_parent: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Village de résidence *</label>
                <input
                  type="text"
                  required
                  value={editFormEnfant.village_nom}
                  onChange={(e) => setEditFormEnfant({ ...editFormEnfant, village_nom: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                />
              </div>

              {/* Nutrition & Dépistage */}
              <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 space-y-2">
                <span className="font-black text-emerald-950 uppercase text-[10px] block">
                  Surveillance Nutritionnelle (1 000 Jours)
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Périmètre Brachial PB (mm)</label>
                    <input
                      type="number"
                      value={editFormEnfant.dernier_pb_mm}
                      onChange={(e) => setEditFormEnfant({ ...editFormEnfant, dernier_pb_mm: e.target.value })}
                      placeholder="Ex: 130"
                      className="w-full p-2 rounded-xl border border-emerald-200 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Statut Nutritionnel</label>
                    <select
                      value={editFormEnfant.statut_nutritionnel}
                      onChange={(e) => setEditFormEnfant({ ...editFormEnfant, statut_nutritionnel: e.target.value as any })}
                      className="w-full p-2 rounded-xl border border-emerald-200 bg-white font-bold"
                    >
                      <option value="NORMAL">🟢 Normal (Vert &ge; 125mm)</option>
                      <option value="MAM">🟡 MAM Modérée (Jaune 115-124mm)</option>
                      <option value="MAS">🔴 MAS Sévère (Rouge &lt; 115mm ou œdèmes)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-950">
                    <input
                      type="checkbox"
                      checked={editFormEnfant.allaitement_exclusif_6m}
                      onChange={(e) => setEditFormEnfant({ ...editFormEnfant, allaitement_exclusif_6m: e.target.checked })}
                      className="rounded text-[#005c30]"
                    />
                    <span>Allaitement Maternel Exclusif (AME 6m)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-red-900">
                    <input
                      type="checkbox"
                      checked={editFormEnfant.presence_oedemes}
                      onChange={(e) => setEditFormEnfant({ ...editFormEnfant, presence_oedemes: e.target.checked })}
                      className="rounded text-red-600"
                    />
                    <span>Présence d'œdèmes bilatéraux</span>
                  </label>
                </div>

                {/* Produits nutritionnels reçus */}
                <div className="pt-2">
                  <label className="font-bold text-slate-700 block mb-1">Produits nutritionnels remis :</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Nutributter+", "Plumpy'Nut", "Prompt Nut", "Enov'Mum"].map((pName) => {
                      const sel = editFormEnfant.produits_nutritionnels.includes(pName);
                      return (
                        <button
                          key={pName}
                          type="button"
                          onClick={() => {
                            const next = sel 
                              ? editFormEnfant.produits_nutritionnels.filter(x => x !== pName)
                              : [...editFormEnfant.produits_nutritionnels, pName];
                            setEditFormEnfant({ ...editFormEnfant, produits_nutritionnels: next });
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                            sel ? "bg-emerald-700 text-white" : "bg-white border border-emerald-200 text-emerald-900"
                          }`}
                        >
                          {pName} {sel ? "✓" : "+"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Grille Vaccinale PEV Bénin */}
              <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 space-y-1.5">
                <span className="font-black text-blue-950 uppercase text-[10px] block">
                  Vaccins Reçus (Cocher les doses administrées selon le carnet)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "BCG", "HepB_naiss", "VPO_0", 
                    "Penta_1", "Penta_2", "Penta_3", 
                    "VPO_1", "VPO_2", "VPO_3", 
                    "Pneumo_1", "Pneumo_2", "Pneumo_3", 
                    "Rota_1", "Rota_2", "Rota_3", 
                    "VPI_1", "VPI_2", 
                    "VAR_1", "VAR_2", "VAA", "MenA"
                  ].map((vKey) => {
                    const isFait = Boolean(editFormEnfant.vaccins_recus[vKey]);
                    return (
                      <button
                        key={vKey}
                        type="button"
                        onClick={() => {
                          const nextVaccins = { ...editFormEnfant.vaccins_recus };
                          if (isFait) {
                            delete nextVaccins[vKey];
                          } else {
                            nextVaccins[vKey] = "Fait";
                          }
                          setEditFormEnfant({ ...editFormEnfant, vaccins_recus: nextVaccins });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          isFait 
                            ? "bg-blue-700 text-white shadow-2xs" 
                            : "bg-white border border-blue-200 text-blue-900 hover:bg-blue-50"
                        }`}
                      >
                        {vKey} {isFait ? "✓" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes et observations ASCQ</label>
                <textarea
                  rows={2}
                  value={editFormEnfant.notes_ascq}
                  onChange={(e) => setEditFormEnfant({ ...editFormEnfant, notes_ascq: e.target.value })}
                  placeholder="Remarques particulières..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModalEditEnfant(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#005c30] text-white font-bold hover:bg-[#004724] shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {showModalFemme && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-600" />
                <h3 className="font-black text-slate-900 text-base">
                  Enregistrer une Femme Enceinte
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalFemme(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnregistrerFemme} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={formFemme.nom}
                    onChange={(e) => setFormFemme({ ...formFemme, nom: e.target.value })}
                    placeholder="Ex: HOUNGBO"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prénoms *</label>
                  <input
                    type="text"
                    required
                    value={formFemme.prenoms}
                    onChange={(e) => setFormFemme({ ...formFemme, prenoms: e.target.value })}
                    placeholder="Ex: Reine"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Âge</label>
                  <input
                    type="number"
                    value={formFemme.age}
                    onChange={(e) => setFormFemme({ ...formFemme, age: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Village / Quartier *</label>
                  <input
                    type="text"
                    required
                    value={formFemme.village_nom}
                    onChange={(e) => setFormFemme({ ...formFemme, village_nom: e.target.value })}
                    placeholder="Ex: Gbedji"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Téléphone femme</label>
                  <input
                    type="text"
                    value={formFemme.telephone}
                    onChange={(e) => setFormFemme({ ...formFemme, telephone: e.target.value })}
                    placeholder="Ex: +229 97000000"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Téléphone conjoint</label>
                  <input
                    type="text"
                    value={formFemme.telephone_conjoint}
                    onChange={(e) => setFormFemme({ ...formFemme, telephone_conjoint: e.target.value })}
                    placeholder="Ex: +229 96000000"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Date Dernières Règles & Calcul automatique DPA */}
              <div className="grid grid-cols-2 gap-2.5 bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100">
                <div>
                  <label className="font-bold text-emerald-950 block mb-1">
                    Date Dernières Règles (DDR) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formFemme.date_ddr}
                    onChange={(e) => {
                      const ddrVal = e.target.value;
                      const { dpa } = calculerDpaEtSa(ddrVal);
                      setFormFemme({ ...formFemme, date_ddr: ddrVal, date_dpa: dpa });
                    }}
                    className="w-full p-2 rounded-xl border border-emerald-200 bg-white text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-emerald-950 block mb-1">
                    Date Présumée Accouchement (DPA)
                  </label>
                  <input
                    type="date"
                    value={formFemme.date_dpa}
                    onChange={(e) => setFormFemme({ ...formFemme, date_dpa: e.target.value })}
                    className="w-full p-2 rounded-xl border border-emerald-200 bg-white text-slate-800 font-semibold"
                  />
                </div>
              </div>

              {/* CPN Effectuées */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Consultations Prénatales (CPN) déjà effectuées
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {["CPN1", "CPN2", "CPN3", "CPN4", "CPN5", "CPN6", "CPN7", "CPN8"].map((cpn) => {
                    const checked = formFemme.cpn_effectuees.includes(cpn);
                    return (
                      <button
                        type="button"
                        key={cpn}
                        onClick={() => {
                          const next = checked
                            ? formFemme.cpn_effectuees.filter(c => c !== cpn)
                            : [...formFemme.cpn_effectuees, cpn];
                          setFormFemme({ ...formFemme, cpn_effectuees: next });
                        }}
                        className={`py-1.5 rounded-lg font-bold border transition-all text-center ${
                          checked
                            ? "bg-[#005c30] text-white border-[#005c30]"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {cpn}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interventions reçues */}
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-700 block">Interventions & Nutrition Bénin</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formFemme.fer_acide_folique}
                      onChange={(e) => setFormFemme({ ...formFemme, fer_acide_folique: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Fer + Acide Folique</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formFemme.enov_mum}
                      onChange={(e) => setFormFemme({ ...formFemme, enov_mum: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Enov'Mum+ (1000 Jours)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formFemme.mild_distribuee}
                      onChange={(e) => setFormFemme({ ...formFemme, mild_distribuee: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>MILD Distribuée</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formFemme.plan_accouchement_etabli}
                      onChange={(e) => setFormFemme({ ...formFemme, plan_accouchement_etabli: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Plan Accouchement Sécurisé</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes & Observations</label>
                <textarea
                  rows={2}
                  value={formFemme.notes_ascq}
                  onChange={(e) => setFormFemme({ ...formFemme, notes_ascq: e.target.value })}
                  placeholder="Facteurs de risque, antécédents, etc."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModalFemme(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#005c30] text-white font-bold hover:bg-[#004724] shadow-sm"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2 : ENREGISTRER UN ENFANT (0-59 MOIS)               */}
      {/* ========================================================= */}
      {showModalEnfant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Baby className="w-5 h-5 text-emerald-700" />
                <h3 className="font-black text-slate-900 text-base">
                  Enregistrer un Enfant (0-59 mois)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalEnfant(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnregistrerEnfant} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nom de l'enfant *</label>
                  <input
                    type="text"
                    required
                    value={formEnfant.nom}
                    onChange={(e) => setFormEnfant({ ...formEnfant, nom: e.target.value })}
                    placeholder="Ex: BIO"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prénoms *</label>
                  <input
                    type="text"
                    required
                    value={formEnfant.prenoms}
                    onChange={(e) => setFormEnfant({ ...formEnfant, prenoms: e.target.value })}
                    placeholder="Ex: Gloria"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sexe *</label>
                  <select
                    value={formEnfant.sexe}
                    onChange={(e) => setFormEnfant({ ...formEnfant, sexe: e.target.value as "M" | "F" })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                  >
                    <option value="M">Garçon (M)</option>
                    <option value="F">Fille (F)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Date de naissance *</label>
                  <input
                    type="date"
                    required
                    value={formEnfant.date_naissance}
                    onChange={(e) => setFormEnfant({ ...formEnfant, date_naissance: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nom de la mère / tutrice</label>
                  <input
                    type="text"
                    value={formEnfant.nom_mere}
                    onChange={(e) => setFormEnfant({ ...formEnfant, nom_mere: e.target.value })}
                    placeholder="Ex: BIO Chantal"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Téléphone parent</label>
                  <input
                    type="text"
                    value={formEnfant.telephone_parent}
                    onChange={(e) => setFormEnfant({ ...formEnfant, telephone_parent: e.target.value })}
                    placeholder="Ex: +229 97000000"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Évaluation nutritionnelle Ruban PB */}
              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 space-y-2">
                <span className="font-bold text-emerald-950 block">Dépistage Malnutrition (Ruban PB de Shakir)</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Périmètre Brachial (mm)</label>
                    <input
                      type="number"
                      value={formEnfant.dernier_pb_mm}
                      onChange={(e) => setFormEnfant({ ...formEnfant, dernier_pb_mm: e.target.value })}
                      placeholder="Ex: 130"
                      className="w-full p-2 rounded-xl border border-emerald-200 bg-white text-slate-800 font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Œdèmes bilatéraux ?</label>
                    <select
                      value={formEnfant.presence_oedemes ? "OUI" : "NON"}
                      onChange={(e) => setFormEnfant({ ...formEnfant, presence_oedemes: e.target.value === "OUI" })}
                      className="w-full p-2 rounded-xl border border-emerald-200 bg-white text-slate-800 font-bold"
                    >
                      <option value="NON">Non (Absents)</option>
                      <option value="OUI">Oui (Signe de Kwashiorkor)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Nutrition 1000 Jours */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-700 block">Programme 1 000 Jours & Produits Reçus</span>
                <div className="flex items-center gap-3 flex-wrap">
                  {["Nutributter+", "Plumpy'Nut", "Prompt Nut", "Enov'Nutributter"].map((prod) => {
                    const checked = formEnfant.produits_nutritionnels.includes(prod);
                    return (
                      <label key={prod} className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...formEnfant.produits_nutritionnels, prod]
                              : formEnfant.produits_nutritionnels.filter(p => p !== prod);
                            setFormEnfant({ ...formEnfant, produits_nutritionnels: next });
                          }}
                          className="rounded text-emerald-600"
                        />
                        <span>{prod}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModalEnfant(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#005c30] text-white font-bold hover:bg-[#004724] shadow-sm"
                >
                  Enregistrer l'enfant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3 : CLÔTURER L'ACCOUCHEMENT                         */}
      {/* ========================================================= */}
      {showModalAccouchement && femmePourAccouchement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-slate-900 text-base">
                  Enregistrer l'Accouchement & Issue
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalAccouchement(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <p className="text-slate-600">
                Mère : <strong>{femmePourAccouchement.nom} {femmePourAccouchement.prenoms}</strong> ({femmePourAccouchement.village_nom})
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date réelle d'accouchement *</label>
                  <input
                    type="date"
                    required
                    value={formAccouchement.date_accouchement}
                    onChange={(e) => setFormAccouchement({ ...formAccouchement, date_accouchement: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lieu de l'accouchement *</label>
                  <select
                    value={formAccouchement.lieu_accouchement}
                    onChange={(e) => setFormAccouchement({ ...formAccouchement, lieu_accouchement: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                  >
                    <option value="Centre de Santé (Maternité)">Centre de Santé / Maternité</option>
                    <option value="Hôpital de Zone">Hôpital de Zone</option>
                    <option value="Clinique Privée Agréée">Clinique Privée Agréée</option>
                    <option value="Domicile (Référé d'urgence)">Domicile (Référé d'urgence)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Issue bébé</label>
                  <select
                    value={formAccouchement.issue_bebe}
                    onChange={(e) => setFormAccouchement({ ...formAccouchement, issue_bebe: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                  >
                    <option value="VIVANT">Enfant Vivant</option>
                    <option value="MORT_NE">Mort-né</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sexe</label>
                  <select
                    value={formAccouchement.sexe_bebe}
                    onChange={(e) => setFormAccouchement({ ...formAccouchement, sexe_bebe: e.target.value as "M" | "F" })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                  >
                    <option value="M">Garçon</option>
                    <option value="F">Fille</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Poids (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formAccouchement.poids_naissance_kg}
                    onChange={(e) => setFormAccouchement({ ...formAccouchement, poids_naissance_kg: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                  />
                </div>
              </div>

              {formAccouchement.issue_bebe === "VIVANT" && (
                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-950">
                    <input
                      type="checkbox"
                      checked={formAccouchement.creerFicheEnfant}
                      onChange={(e) => setFormAccouchement({ ...formAccouchement, creerFicheEnfant: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Créer immédiatement la fiche de suivi 1 000 jours du bébé</span>
                  </label>

                  {formAccouchement.creerFicheEnfant && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Nom du bébé</label>
                        <input
                          type="text"
                          value={formAccouchement.nom_bebe}
                          onChange={(e) => setFormAccouchement({ ...formAccouchement, nom_bebe: e.target.value })}
                          className="w-full p-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Prénoms</label>
                        <input
                          type="text"
                          value={formAccouchement.prenoms_bebe}
                          onChange={(e) => setFormAccouchement({ ...formAccouchement, prenoms_bebe: e.target.value })}
                          placeholder="Ex: Moïse"
                          className="w-full p-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModalAccouchement(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleValiderAccouchement}
                  className="px-5 py-2 rounded-xl bg-[#005c30] text-white font-bold hover:bg-[#004724] shadow-sm"
                >
                  Valider l'Accouchement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
