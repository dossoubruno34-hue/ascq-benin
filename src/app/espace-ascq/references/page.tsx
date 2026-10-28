"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AscqNav from "@/components/AscqNav";
import {
  HeartPulse,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Printer,
  Download,
  Share2,
  Plus,
  Eye,
  Edit3,
  Trees,
  User,
  Phone,
  MapPin,
  Calendar,
  RefreshCw,
  X,
  Send,
  FileSpreadsheet
} from "lucide-react";
import { exporterFicheReferenceExcel } from "@/lib/excelExport";

export default function GestionReferencesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [references, setReferences] = useState<any[]>([]);
  const [filtreStatut, setFiltreStatut] = useState<string>("TOUT");
  const [filtreType, setFiltreType] = useState<string>("TOUT");
  const [recherche, setRecherche] = useState("");

  // Modale de consultation / validation / modification
  const [selectedRef, setSelectedRef] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Champs modifiables par l'ASCQ
  const [editNomPatient, setEditNomPatient] = useState("");
  const [editPrenomsPatient, setEditPrenomsPatient] = useState("");
  const [editAgeValeur, setEditAgeValeur] = useState<number>(1);
  const [editAgeUnite, setEditAgeUnite] = useState("ANS");
  const [editDestinationNom, setEditDestinationNom] = useState("");
  const [editMotifDetails, setEditMotifDetails] = useState("");
  const [validationCommentaire, setValidationCommentaire] = useState("");
  const [motifRejet, setMotifRejet] = useState("");

  const chargerReferences = async () => {
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

      setCurrentUser(profil);

      // Charger les références de cet ASCQ (ou toutes si administrateur)
      let query = supabase
        .from("references_communautaires")
        .select("*")
        .order("created_at", { ascending: false });

      if (profil?.role_technique !== "SUPER_ADMIN" && profil?.role_technique !== "ADMINISTRATEUR") {
        query = query.or(`ascq_id.eq.${user.id},relais_id.in.(select id from relais_communautaires where ascq_id='${user.id}')`);
      }

      const { data, error } = await query;
      if (!error && data) {
        setReferences(data);
      } else {
        // Fallback requêtes directes
        const { data: directData } = await supabase
          .from("references_communautaires")
          .select("*")
          .eq("ascq_id", user.id)
          .order("created_at", { ascending: false });
        setReferences(directData || []);
      }
    } catch (err) {
      console.error("Erreur chargement références:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerReferences();
  }, []);

  // Ouvrir la modale
  const handleOpenModal = (refItem: any) => {
    setSelectedRef(refItem);
    setIsEditing(false);
    setEditNomPatient(refItem.nom_patient || "");
    setEditPrenomsPatient(refItem.prenoms_patient || "");
    setEditAgeValeur(refItem.age_valeur || 1);
    setEditAgeUnite(refItem.age_unite || "ANS");
    setEditDestinationNom(refItem.destination_nom || "");
    setEditMotifDetails(refItem.motif_details || "");
    setValidationCommentaire(refItem.commentaire_ascq || "");
    setMotifRejet(refItem.motif_rejet || "");
    setActionMsg(null);
  };

  // Action de validation par l'ASCQ
  const handleValiderReference = async () => {
    if (!selectedRef) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      const { data, error } = await supabase.rpc("valider_reference_communautaire", {
        p_reference_id: selectedRef.id,
        p_decision: "VALIDEE",
        p_commentaire: validationCommentaire.trim() || null,
        p_ajustement_destination: editDestinationNom.trim() || null,
      });

      if (error) {
        // Fallback update direct
        const { error: updErr } = await supabase
          .from("references_communautaires")
          .update({
            statut: "VALIDEE",
            date_validation_ascq: new Date().toISOString(),
            commentaire_ascq: validationCommentaire.trim() || null,
            destination_nom: editDestinationNom.trim() || selectedRef.destination_nom,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedRef.id);
        if (updErr) throw updErr;
      }

      setActionMsg({ text: "Référence validée avec succès ! Le bulletin officiel est prêt.", error: false });
      await chargerReferences();
      setTimeout(() => setSelectedRef(null), 1500);
    } catch (err: any) {
      setActionMsg({ text: err.message || "Erreur lors de la validation.", error: true });
    } finally {
      setActionLoading(false);
    }
  };

  // Action de rejet
  const handleRejeterReference = async () => {
    if (!selectedRef) return;
    if (!motifRejet.trim()) {
      alert("Veuillez renseigner un motif pour justifier le rejet.");
      return;
    }
    setActionLoading(true);
    setActionMsg(null);
    try {
      const { data, error } = await supabase.rpc("valider_reference_communautaire", {
        p_reference_id: selectedRef.id,
        p_decision: "REJETEE",
        p_commentaire: null,
        p_motif_rejet: motifRejet.trim(),
      });

      if (error) {
        const { error: updErr } = await supabase
          .from("references_communautaires")
          .update({
            statut: "REJETEE",
            motif_rejet: motifRejet.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedRef.id);
        if (updErr) throw updErr;
      }

      setActionMsg({ text: "Référence rejetée avec motif.", error: false });
      await chargerReferences();
      setTimeout(() => setSelectedRef(null), 1500);
    } catch (err: any) {
      setActionMsg({ text: err.message || "Erreur lors du rejet.", error: true });
    } finally {
      setActionLoading(false);
    }
  };

  // Enregistrement des modifications apportées par l'ASCQ
  const handleSaveModifications = async () => {
    if (!selectedRef) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      const { error } = await supabase
        .from("references_communautaires")
        .update({
          nom_patient: editNomPatient.trim().toUpperCase(),
          prenoms_patient: editPrenomsPatient.trim(),
          age_valeur: Number(editAgeValeur) || 1,
          age_unite: editAgeUnite,
          destination_nom: editDestinationNom.trim(),
          motif_details: editMotifDetails.trim() || null,
          modifie_par_ascq: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedRef.id);

      if (error) throw error;

      setActionMsg({ text: "Informations du patient et de la référence mises à jour !", error: false });
      setIsEditing(false);
      await chargerReferences();
    } catch (err: any) {
      setActionMsg({ text: err.message || "Erreur de mise à jour.", error: true });
    } finally {
      setActionLoading(false);
    }
  };

  // Impression officielle A4
  const handlePrint = (refItem: any) => {
    setSelectedRef(refItem);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Partage WhatsApp du bulletin
  const handleShareWhatsApp = (refItem: any) => {
    const text = encodeURIComponent(
      `🏛️ BULLETIN DE RÉFÉRENCE ASCQ BÉNIN\n` +
      `N° Référence : ${refItem.numero_reference}\n` +
      `Date : ${refItem.date_reference}\n` +
      `Destination : ${refItem.destination_nom}\n` +
      `Patient : ${refItem.nom_patient} ${refItem.prenoms_patient} (${refItem.age_valeur} ${refItem.age_unite})\n` +
      `Village : ${refItem.village_nom}\n` +
      `Motif : ${refItem.motif_libelle}\n` +
      `Degré : ${refItem.degre_urgence}\n` +
      `Relais déclarant : ${refItem.relais_nom} (${refItem.relais_telephone || 'N/A'})\n` +
      `ASCQ Superviseur : ${refItem.ascq_nom || 'ASCQ'}\n` +
      `Statut : ${refItem.statut === 'VALIDEE' ? 'VALIDÉ OFFICIELLEMENT' : 'EN ATTENTE'}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // Statistiques
  const totalRef = references.length;
  const enAttenteCount = references.filter(r => r.statut === "EN_ATTENTE_ASCQ").length;
  const valideesCount = references.filter(r => r.statut === "VALIDEE").length;
  const santeCount = references.filter(r => r.type_reference === "SANTE").length;
  const gupsCount = references.filter(r => r.type_reference === "SOCIAL_GUPS").length;

  // Filtrage
  const referencesFiltrees = references.filter(r => {
    if (filtreStatut !== "TOUT" && r.statut !== filtreStatut) return false;
    if (filtreType !== "TOUT" && r.type_reference !== filtreType) return false;
    if (recherche.trim() !== "") {
      const q = recherche.toLowerCase();
      const matchNum = r.numero_reference?.toLowerCase().includes(q);
      const matchNom = r.nom_patient?.toLowerCase().includes(q) || r.prenoms_patient?.toLowerCase().includes(q);
      const matchVillage = r.village_nom?.toLowerCase().includes(q);
      const matchRelais = r.relais_nom?.toLowerCase().includes(q);
      return matchNum || matchNom || matchVillage || matchRelais;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-28">
      <div className="print:hidden">
        <AscqNav userProfile={currentUser} />
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-4 print:hidden">
        {/* En-tête */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Système de Références
                </span>
                <span className="text-xs text-slate-400 font-bold">Centre de Santé & GUPS</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                Gestion des Références Communautaires
              </h1>
              <p className="text-xs text-slate-500">
                Validez, modifiez et téléchargez les références transmises par vos Relais Communautaires vers le CS ou le GUPS.
              </p>
            </div>

            <Link
              href="/relais/reference/nouvelle"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Émettre une référence</span>
            </Link>
          </div>

          {/* Cartes statistiques */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Total Références</span>
              <strong className="text-xl font-black text-slate-900 block">{totalRef}</strong>
            </div>

            <div className={`p-3 rounded-2xl border ${enAttenteCount > 0 ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-slate-50 border-slate-200/80"}`}>
              <span className="text-[10px] font-black uppercase">À Valider (RC)</span>
              <strong className={`text-xl font-black block ${enAttenteCount > 0 ? "text-amber-700" : "text-slate-800"}`}>
                {enAttenteCount}
              </strong>
            </div>

            <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Vers Santé (CS)</span>
              <strong className="text-xl font-black text-emerald-900 block">{santeCount}</strong>
            </div>

            <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-200">
              <span className="text-[10px] font-bold text-purple-800 uppercase">Vers Social (GUPS)</span>
              <strong className="text-xl font-black text-purple-900 block">{gupsCount}</strong>
            </div>
          </div>
        </div>

        {/* Barre de filtrage & Recherche */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro, patient, village, relais..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-medium focus:ring-2 focus:ring-[#005c30]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFiltreStatut("TOUT")}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filtreStatut === "TOUT" ? "bg-[#005c30] text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Tous ({totalRef})
            </button>
            <button
              onClick={() => setFiltreStatut("EN_ATTENTE_ASCQ")}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                filtreStatut === "EN_ATTENTE_ASCQ" ? "bg-amber-600 text-white shadow-sm" : "bg-white text-amber-800 border border-amber-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>En attente ({enAttenteCount})</span>
            </button>
            <button
              onClick={() => setFiltreStatut("VALIDEE")}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                filtreStatut === "VALIDEE" ? "bg-emerald-700 text-white shadow-sm" : "bg-white text-emerald-800 border border-emerald-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Validées ({valideesCount})</span>
            </button>
          </div>
        </div>

        {/* Liste des références */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center space-y-2 border border-slate-200/80 shadow-sm">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#005c30]" />
            <p className="text-xs text-slate-500 font-semibold">Chargement des références communautaires...</p>
          </div>
        ) : referencesFiltrees.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center space-y-3 border border-slate-200/80 shadow-sm">
            <HeartPulse className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-extrabold text-slate-900">Aucune référence trouvée</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Aucune référence ne correspond aux critères sélectionnés. Vous pouvez en créer une ou attendre les saisies de vos Relais.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {referencesFiltrees.map((ref) => {
              const isSante = ref.type_reference === "SANTE";
              const isEnAttente = ref.statut === "EN_ATTENTE_ASCQ";
              const isValidee = ref.statut === "VALIDEE";

              return (
                <div
                  key={ref.id}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all hover:shadow-md ${
                    isEnAttente ? "border-amber-400 bg-amber-50/15" : "border-slate-200/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200">
                          {ref.numero_reference}
                        </span>

                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          isSante ? "bg-emerald-100 text-emerald-900" : "bg-purple-100 text-purple-900"
                        }`}>
                          {isSante ? <HeartPulse className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                          <span>{isSante ? "Santé (CS)" : "Social (GUPS)"}</span>
                        </span>

                        {ref.one_health_concerne && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
                            <Trees className="w-3 h-3 text-teal-700" />
                            <span>One Health</span>
                          </span>
                        )}

                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isValidee ? "bg-emerald-100 text-emerald-800" :
                          isEnAttente ? "bg-amber-100 text-amber-900 animate-pulse" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {isValidee ? "✓ Validée par ASCQ" : isEnAttente ? "⏳ En attente de validation" : "✕ Rejetée"}
                        </span>
                      </div>

                      <h3 className="font-black text-slate-900 text-base">
                        {ref.nom_patient} {ref.prenoms_patient} <span className="text-xs font-bold text-slate-500 font-normal">({ref.age_valeur} {ref.age_unite?.toLowerCase()}, {ref.sexe === 'M' ? 'Masculin' : 'Féminin'})</span>
                      </h3>

                      <p className="text-xs font-bold text-[#005c30]">
                        Motif : {ref.motif_libelle}
                      </p>

                      <div className="flex items-center flex-wrap gap-3 text-[11px] text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>Village : <strong className="text-slate-700">{ref.village_nom}</strong></span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>Destination : <strong className="text-slate-700">{ref.destination_nom}</strong></span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Relais : <strong className="text-slate-700">{ref.relais_nom}</strong></span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{ref.date_reference}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-xl border ${
                        ref.degre_urgence === "EVACUATION_IMMEDIATE" ? "bg-red-50 text-red-700 border-red-200" :
                        ref.degre_urgence === "URGENTE" ? "bg-amber-50 text-amber-800 border-amber-200" :
                        "bg-slate-50 text-slate-700 border-slate-200"
                      }`}>
                        {ref.degre_urgence === "EVACUATION_IMMEDIATE" ? "🚨 Évacuation" :
                         ref.degre_urgence === "URGENTE" ? "⚠️ Urgent" : "Normal"}
                      </span>
                    </div>
                  </div>

                  {/* BARRE D'ACTIONS */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-400 font-mono">
                      Ref: {ref.numero_reference}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(ref)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all ${
                          isEnAttente
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isEnAttente ? "Examiner & Valider" : "Consulter / Modifier"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrint(ref)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-bold text-xs border border-emerald-200 transition-colors"
                        title="Imprimer le Bulletin Officiel de Référence A4 avec volet détachable"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimer Bulletin</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => exporterFicheReferenceExcel(ref)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
                        title="Télécharger la fiche officielle en format Excel"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Excel</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(ref)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 font-bold text-xs border border-green-200 transition-colors"
                        title="Partager les détails par WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODALE D'EXAMEN, MODIFICATION, VALIDATION & REJET PAR L'ASCQ */}
      {/* ========================================================================= */}
      {selectedRef && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto print:border-none print:shadow-none print:rounded-none">
            
            {/* Barre d'en-tête de la modale */}
            <div className="bg-[#005c30] text-white p-4 flex items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-emerald-200" />
                <span className="text-xs font-mono font-bold">{selectedRef.numero_reference}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-[#005c30] font-bold text-xs shadow hover:bg-emerald-50 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => exporterFicheReferenceExcel(selectedRef)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRef(null)}
                  className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MESSAGE D'ACTION */}
            {actionMsg && (
              <div className={`m-4 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                actionMsg.error ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
              }`}>
                {actionMsg.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{actionMsg.text}</span>
              </div>
            )}

            {/* CONTENU OFFICIEL IMPRIMABLE (FORMAT RÉPUBLIQUE DU BÉNIN AVEC VOLET RETOUR) */}
            <div className="p-6 sm:p-8 space-y-6 text-slate-800 print:p-0">
              
              {/* En-tête officiel */}
              <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-8 h-1 bg-[#008751]"></span>
                  <span className="w-8 h-1 bg-[#FCD116]"></span>
                  <span className="w-8 h-1 bg-[#E8112D]"></span>
                </div>
                <h1 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  RÉPUBLIQUE DU BÉNIN
                </h1>
                <h2 className="text-xs font-bold uppercase text-slate-700">
                  Ministère de la Santé • Ministère des Affaires Sociales et de la Microfinance
                </h2>
                <h3 className="text-xs font-bold text-[#005c30]">
                  BULLETIN OFFICIEL DE RÉFÉRENCE COMMUNAUTAIRE (VOLET ALLER & RETOUR)
                </h3>
                <div className="inline-block mt-1 px-3 py-0.5 bg-slate-100 rounded-lg border border-slate-300">
                  <span className="text-xs font-extrabold text-slate-900">
                    N° {selectedRef.numero_reference} • Semaine {selectedRef.semaine_epidemio} ({selectedRef.annee})
                  </span>
                </div>
              </div>

              {/* VOLET ALLER (RÉFÉRENCE PAR LA COMMUNAUTÉ) */}
              <div className="border border-slate-300 rounded-2xl p-4 space-y-3 bg-slate-50/50 print:bg-transparent text-xs">
                <div className="flex items-center justify-between border-b pb-1.5 border-slate-200">
                  <h4 className="font-black uppercase text-[#005c30]">
                    VOLET ALLER : ÉMISSION DE LA RÉFÉRENCE
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                    selectedRef.statut === "VALIDEE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {selectedRef.statut === "VALIDEE" ? "VALIDÉ PAR L'ASCQ" : "EN ATTENTE"}
                  </span>
                </div>

                {!isEditing ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Patient / Bénéficiaire :</span>
                      <strong className="text-slate-900 font-extrabold text-sm">{selectedRef.nom_patient} {selectedRef.prenoms_patient}</strong>
                      <span className="text-slate-500 block text-[11px]">{selectedRef.age_valeur} {selectedRef.age_unite?.toLowerCase()} • Sexe : {selectedRef.sexe}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Structure Destinataire :</span>
                      <strong className="text-slate-900">{selectedRef.destination_nom}</strong>
                      <span className="text-slate-500 block text-[11px]">{selectedRef.type_reference === 'SANTE' ? 'Centre de Santé' : 'GUPS (Protection Sociale)'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Motif de référence :</span>
                      <strong className="text-[#005c30]">{selectedRef.motif_libelle}</strong>
                      {selectedRef.motif_details && (
                        <p className="text-slate-600 italic text-[11px] mt-0.5">{selectedRef.motif_details}</p>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Localisation & Contact :</span>
                      <strong className="text-slate-900">Village {selectedRef.village_nom}</strong>
                      <span className="text-slate-500 block text-[11px]">Parent : {selectedRef.nom_parent_tuteur || 'Non précisé'} • Tél : {selectedRef.telephone_contact || 'N/A'}</span>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Relais déclarant : <strong>{selectedRef.relais_nom}</strong> ({selectedRef.relais_telephone || 'N/A'})</span>
                      <span>ASCQ Superviseur : <strong>{selectedRef.ascq_nom || currentUser?.nom}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold text-slate-700 block text-[11px]">Nom patient</label>
                        <input
                          type="text"
                          value={editNomPatient}
                          onChange={(e) => setEditNomPatient(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block text-[11px]">Prénoms</label>
                        <input
                          type="text"
                          value={editPrenomsPatient}
                          onChange={(e) => setEditPrenomsPatient(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold text-slate-700 block text-[11px]">Âge</label>
                        <input
                          type="number"
                          value={editAgeValeur}
                          onChange={(e) => setEditAgeValeur(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block text-[11px]">Structure de destination</label>
                        <input
                          type="text"
                          value={editDestinationNom}
                          onChange={(e) => setEditDestinationNom(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block text-[11px]">Détails cliniques / sociaux</label>
                      <textarea
                        rows={2}
                        value={editMotifDetails}
                        onChange={(e) => setEditMotifDetails(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 font-bold"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleSaveModifications}
                        className="px-4 py-1.5 rounded-xl bg-[#005c30] text-white font-bold"
                      >
                        Enregistrer les modifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* VOLET RETOUR DÉTACHABLE POUR LE CENTRE DE SANTÉ OU LE GUPS */}
              <div className="border-2 border-dashed border-slate-400 rounded-2xl p-4 space-y-3 bg-white text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h4 className="font-black uppercase text-slate-900 flex items-center gap-1.5">
                    <span>✂️ VOLET RETOUR : COMPTE-RENDU DE PRISE EN CHARGE</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold">À remplir par le CS ou le GUPS</span>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Ce volet détachable est à compléter par le Médecin/Infirmier chef de poste ou le Responsable GUPS, puis retourné à l'ASCQ pour classement et compte rendu mensuel.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="h-8 border-b border-dotted border-slate-400 flex items-end">
                    <span className="text-slate-500 text-[11px]">Date et heure d'arrivée : .................................</span>
                  </div>
                  <div className="h-8 border-b border-dotted border-slate-400 flex items-end">
                    <span className="text-slate-500 text-[11px]">Diagnostic / Décision retenue : ........................</span>
                  </div>
                  <div className="col-span-2 h-10 border-b border-dotted border-slate-400 flex items-end">
                    <span className="text-slate-500 text-[11px]">Soins ou accompagnement apporté : .........................................................................................................</span>
                  </div>
                  <div className="h-10 border-b border-dotted border-slate-400 flex items-end">
                    <span className="text-slate-500 text-[11px]">Évolution (Guéri, Référé niveau 2, Suivi) : ...........</span>
                  </div>
                  <div className="h-10 border-b border-dotted border-slate-400 flex items-end">
                    <span className="text-slate-500 text-[11px]">Nom & Signature du Responsable CS/GUPS : .....</span>
                  </div>
                </div>
              </div>

              {/* PANNEAU DE CONTRÔLE DE L'ASCQ (MASQUÉ À L'IMPRESSION) */}
              <div className="print:hidden pt-4 border-t border-slate-200 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase">
                  Action de Supervision ASCQ
                </h4>

                {!isEditing && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Modifier les données du patient</span>
                    </button>
                  </div>
                )}

                {selectedRef.statut === "EN_ATTENTE_ASCQ" ? (
                  <div className="space-y-3 bg-amber-50 p-4 rounded-2xl border border-amber-200">
                    <div className="space-y-1">
                      <label className="font-bold text-amber-950 text-xs">
                        Avis ou consignes de l'ASCQ (optionnel) :
                      </label>
                      <input
                        type="text"
                        value={validationCommentaire}
                        onChange={(e) => setValidationCommentaire(e.target.value)}
                        placeholder="Ex: Référence validée, cas urgent orienté vers le CS de référence..."
                        className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1">
                      <div className="flex-1 w-full sm:w-auto">
                        <input
                          type="text"
                          value={motifRejet}
                          onChange={(e) => setMotifRejet(e.target.value)}
                          placeholder="Motif si rejet (facultatif)..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleRejeterReference}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs transition-colors"
                      >
                        Rejeter
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleValiderReference}
                        className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Valider la référence</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                    <span className="font-bold">
                      ✓ Cette référence a été validée le {selectedRef.date_validation_ascq ? new Date(selectedRef.date_validation_ascq).toLocaleDateString("fr-FR") : "ce jour"}.
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePrint(selectedRef)}
                      className="px-3 py-1 rounded-xl bg-white border border-emerald-300 font-bold text-[#005c30]"
                    >
                      Imprimer le bulletin
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
