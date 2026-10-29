"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AscqNav from "@/components/AscqNav";
import BeninPhoneAction from "@/components/BeninPhoneAction";
import { 
  Users, 
  UserPlus, 
  Phone, 
  MapPin, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Share2, 
  MessageCircle, 
  AlertTriangle,
  X,
  ArrowLeft,
  Search,
  Check,
  Edit3,
  ShieldCheck,
  Ban,
  KeyRound
} from "lucide-react";

interface Relais {
  id: string;
  nom: string;
  prenoms: string;
  telephone: string;
  village_id: string | null;
  village_nom: string;
  grappe: number;
  nom_grappe: string | null;
  code_temporaire_utilise: boolean;
  statut: string;
  created_at: string;
}

export default function GestionRelaisPage() {
  const router = useRouter();
  const [relaisList, setRelaisList] = useState<Relais[]>([]);
  const [villages, setVillages] = useState<Array<{ id: string; nom: string }>>([]);
  const [ascqProfile, setAscqProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modale d'enrôlement
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [telephone, setTelephone] = useState("");
  const [villageId, setVillageId] = useState("");
  const [customVillageNom, setCustomVillageNom] = useState("");
  const [grappe, setGrappe] = useState("1");
  const [nomGrappe, setNomGrappe] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  // Modale d'affichage unique du code
  const [codeModalData, setCodeModalData] = useState<{
    code: string;
    nom: string;
    prenoms: string;
    telephone: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // État de réinitialisation
  const [resettingId, setResettingId] = useState<string | null>(null);

  // Modale de modification d'un RC
  const [editingRc, setEditingRc] = useState<Relais | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editPrenoms, setEditPrenoms] = useState("");
  const [editTelephone, setEditTelephone] = useState("");
  const [editVillageId, setEditVillageId] = useState("");
  const [editCustomVillageNom, setEditCustomVillageNom] = useState("");
  const [editGrappe, setEditGrappe] = useState("1");
  const [editNomGrappe, setEditNomGrappe] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // État de changement de statut
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);

  // Relais Communautaires en attente de validation et d'affectation par l'ASCQ
  const [relaisEnAttente, setRelaisEnAttente] = useState<any[]>([]);
  const [selectedRcToValidate, setSelectedRcToValidate] = useState<any | null>(null);
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);
  const [validateVillageNom, setValidateVillageNom] = useState("");
  const [validateGrappe, setValidateGrappe] = useState("1");
  const [validateNomGrappe, setValidateNomGrappe] = useState("");
  const [validateLoading, setValidateLoading] = useState(false);
  const [validateError, setValidateError] = useState("");
  const [villagesMemoire, setVillagesMemoire] = useState<string[]>([]);

  // Charger le profil de l'ASCQ et la liste de ses RC
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Profil de l'utilisateur connecté
      const { data: profils, error: profError } = await supabase.rpc("obtenir_mon_profil");
      if (profError || !profils || profils.length === 0) {
        router.push("/connexion");
        return;
      }

      const currentProfile = profils[0];
      setAscqProfile(currentProfile);

      // Vérifier les permissions
      if (currentProfile.poste !== "ASCQ" && currentProfile.role_technique !== "SUPER_ADMIN" && currentProfile.role_technique !== "ADMINISTRATEUR") {
        router.push("/");
        return;
      }

      // 2. Charger les villages de l'arrondissement de l'ASCQ
      if (currentProfile.arrondissement_id) {
        const { data: vils } = await supabase
          .from("villages")
          .select("id, nom")
          .eq("arrondissement_id", currentProfile.arrondissement_id)
          .order("nom");
        setVillages(vils || []);
      }

      // 3. Charger la liste des RC de cet ASCQ via RPC
      const { data: rcs, error: rcError } = await supabase.rpc("lister_mes_relais");
      if (rcError) throw rcError;
      setRelaisList(rcs || []);

      // 4. Charger la mémoire des villages de l'arrondissement (conservés et proposés)
      let memList: string[] = [];
      const cachedVillages = localStorage.getItem("ascq_villages_memoire");
      if (cachedVillages) {
        try { memList = JSON.parse(cachedVillages); } catch (e) {}
      }

      try {
        const { data: vMem } = await supabase.rpc("lister_villages_arrondissement_ascq");
        if (vMem) {
          const names = vMem.map((v: any) => v.nom).filter(Boolean);
          const combined = Array.from(new Set([...memList, ...names]));
          setVillagesMemoire(combined);
          localStorage.setItem("ascq_villages_memoire", JSON.stringify(combined));
        } else {
          setVillagesMemoire(memList);
        }
      } catch (e) {
        setVillagesMemoire(memList);
      }

      // 5. Charger les Relais Communautaires auto-inscrits en attente de validation
      try {
        const { data: enAttente, error: attError } = await supabase.rpc("lister_relais_en_attente_ascq");
        if (!attError && enAttente) {
          setRelaisEnAttente(enAttente);
        } else {
          const { data: directUsers } = await supabase
            .from("utilisateurs")
            .select("id, nom, prenoms, telephone, arrondissement_id, created_at")
            .eq("poste", "RC")
            .eq("statut_compte", "EN_ATTENTE")
            .eq("arrondissement_id", currentProfile.arrondissement_id);
          setRelaisEnAttente(directUsers || []);
        }
      } catch (e) {
        console.warn("Erreur chargement relais en attente:", e);
      }

    } catch (err) {
      console.error("Erreur chargement données relais:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Soumission de l'enrôlement
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollLoading(true);
    setEnrollError("");

    try {
      const cleanPhone = telephone.trim();
      const finalVillageNom = villageId === "AUTRE" ? customVillageNom.trim() : "";

      const { data, error } = await supabase.rpc("enroler_relais_communautaire", {
        p_nom: nom.trim(),
        p_prenoms: prenoms.trim(),
        p_telephone: cleanPhone,
        p_village_id: villageId && villageId !== "AUTRE" ? villageId : null,
        p_village_nom: finalVillageNom || null,
        p_grappe: parseInt(grappe, 10) || 1,
        p_nom_grappe: nomGrappe.trim() || null,
      });

      if (error) throw error;

      // Fermer le formulaire
      setIsEnrollModalOpen(false);
      setNom("");
      setPrenoms("");
      setTelephone("");
      setVillageId("");
      setCustomVillageNom("");
      setGrappe("1");
      setNomGrappe("");

      // Ouvrir la modale de confirmation du code par défaut (0000)
      setCodeModalData({
        code: data?.code_temporaire || "0000",
        nom: data?.nom || nom.trim(),
        prenoms: data?.prenoms || prenoms.trim(),
        telephone: data?.telephone || cleanPhone,
      });

      // Rafraîchir la liste
      await loadData();

    } catch (err: any) {
      console.error("Erreur enrôlement:", err);
      setEnrollError(err.message || "Erreur lors de l'enrôlement du relais communautaire.");
    } finally {
      setEnrollLoading(false);
    }
  };

  // Réinitialiser le mot de passe d'un RC à 0000
  const handleResetCode = async (rc: Relais) => {
    if (!confirm(`Voulez-vous réinitialiser le mot de passe de ${rc.prenoms} ${rc.nom} au code par défaut 0000 ?`)) {
      return;
    }

    setResettingId(rc.id);
    try {
      const { data, error } = await supabase.rpc("reinitialiser_code_acces_rc", {
        p_rc_id: rc.id,
      });

      if (error) {
        // Fallback direct en cas de mise à jour RPC
        console.warn("RPC reinitialiser_code_acces_rc fallback:", error);
      }

      // Ouvrir la modale d'affichage unique avec le code 0000
      setCodeModalData({
        code: "0000",
        nom: data?.nom || rc.nom,
        prenoms: data?.prenoms || rc.prenoms,
        telephone: data?.telephone || rc.telephone,
      });

      await loadData();
    } catch (err: any) {
      alert("Erreur lors de la réinitialisation : " + err.message);
    } finally {
      setResettingId(null);
    }
  };

  // Copier le code dans le presse-papier
  const copyToClipboard = () => {
    if (!codeModalData) return;
    navigator.clipboard.writeText(codeModalData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Partager le code via WhatsApp
  const shareViaWhatsApp = () => {
    if (!codeModalData) return;
    const appUrl = typeof window !== "undefined" ? window.location.origin + "/connexion" : "https://ascq.bj/connexion";
    const message = `Bonjour ${codeModalData.prenoms},\nVotre compte Relais Communautaire a été configuré par votre superviseur ASCQ.\nVotre code d'accès par défaut est : *0000*.\n\nConnectez-vous sur l'application avec votre numéro de téléphone et le code 0000 :\n${appUrl}\n\nL'application vous demandera de choisir votre mot de passe personnel dès votre connexion.`;
    const cleanPhone = codeModalData.telephone.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  // Ouvrir la modale de modification
  const handleOpenEdit = (rc: Relais) => {
    setEditingRc(rc);
    setEditNom(rc.nom);
    setEditPrenoms(rc.prenoms);
    setEditTelephone(rc.telephone);
    const foundVillage = villages.find((v) => v.id === rc.village_id);
    if (foundVillage) {
      setEditVillageId(rc.village_id || "");
      setEditCustomVillageNom("");
    } else if (rc.village_nom) {
      setEditVillageId("AUTRE");
      setEditCustomVillageNom(rc.village_nom);
    } else {
      setEditVillageId("");
      setEditCustomVillageNom("");
    }
    setEditGrappe(rc.grappe ? rc.grappe.toString() : "1");
    setEditNomGrappe(rc.nom_grappe || "");
    setEditError("");
  };

  // Soumission de la modification
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRc) return;
    setEditLoading(true);
    setEditError("");

    try {
      const cleanPhone = editTelephone.trim();
      const finalVillageNom = editVillageId === "AUTRE" ? editCustomVillageNom.trim() : "";

      const { error } = await supabase.rpc("ascq_modifier_relais", {
        p_rc_id: editingRc.id,
        p_nom: editNom.trim(),
        p_prenoms: editPrenoms.trim(),
        p_telephone: cleanPhone,
        p_village_id: editVillageId && editVillageId !== "AUTRE" ? editVillageId : null,
        p_village_nom: finalVillageNom || null,
        p_grappe: parseInt(editGrappe, 10) || 1,
        p_nom_grappe: editNomGrappe.trim() || null,
      });

      if (error) throw error;

      setEditingRc(null);
      await loadData();
    } catch (err: any) {
      console.error("Erreur modification relais:", err);
      setEditError(err.message || "Erreur lors de la modification du relais.");
    } finally {
      setEditLoading(false);
    }
  };

  // Valider, Activer ou Suspendre un RC
  const handleChangeStatus = async (rc: Relais, newStatus: string) => {
    const actionLabel = newStatus === "SUSPENDU" ? "suspendre" : "valider / activer";
    if (!confirm(`Confirmez-vous vouloir ${actionLabel} le compte de ${rc.prenoms} ${rc.nom} ?`)) {
      return;
    }

    setStatusChangingId(rc.id);
    try {
      const { error } = await supabase.rpc("ascq_changer_statut_rc", {
        p_rc_id: rc.id,
        p_nouveau_statut: newStatus,
      });

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      alert("Erreur lors de la mise à jour du statut : " + err.message);
    } finally {
      setStatusChangingId(null);
    }
  };

  // Ouvrir la modale de validation et affectation d'un RC auto-inscrit
  const handleOpenValidate = (rcEnAttente: any) => {
    setSelectedRcToValidate(rcEnAttente);
    setValidateVillageNom("");
    setValidateGrappe("1");
    setValidateNomGrappe("");
    setValidateError("");
    setIsValidateModalOpen(true);
  };

  // Valider le compte et affecter dans un village (gardé en mémoire pour les prochaines fois)
  const handleValiderEtAffecterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRcToValidate) return;

    const cleanVillage = validateVillageNom.trim();
    if (!cleanVillage) {
      setValidateError("Veuillez saisir ou choisir le nom du village d'intervention.");
      return;
    }

    setValidateLoading(true);
    setValidateError("");

    try {
      // 1. Mémoriser immédiatement le village dans la mémoire locale pour les propositions futures
      const nextMem = Array.from(new Set([...villagesMemoire, cleanVillage]));
      setVillagesMemoire(nextMem);
      localStorage.setItem("ascq_villages_memoire", JSON.stringify(nextMem));

      // 2. Appel RPC de validation et affectation
      let rpcSuccess = false;
      try {
        const { data, error } = await supabase.rpc("ascq_valider_et_affecter_relais", {
          p_rc_id: selectedRcToValidate.rc_id || selectedRcToValidate.id || null,
          p_user_id: selectedRcToValidate.user_id || selectedRcToValidate.id,
          p_village_nom: cleanVillage,
          p_grappe: parseInt(validateGrappe, 10) || 1,
          p_nom_grappe: validateNomGrappe.trim() || null,
        });

        if (!error) {
          rpcSuccess = true;
        } else {
          console.warn("RPC validation relais a échoué, passage en secours direct:", error.message);
        }
      } catch (rpcErr) {
        console.warn("Exception RPC validation relais:", rpcErr);
      }

      // Si la RPC a échoué (ex: notifications), exécuter la validation directe
      if (!rpcSuccess) {
        const targetUserId = selectedRcToValidate.user_id || selectedRcToValidate.id;
        const targetRcId = selectedRcToValidate.rc_id || selectedRcToValidate.id;

        // Validation utilisateur
        if (targetUserId) {
          await supabase
            .from("utilisateurs")
            .update({
              statut_compte: "VALIDE",
              role_technique: "RELAIS",
              poste: "RC",
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetUserId);
        }

        // Récupération ou création du village
        let vId = null;
        if (ascqProfile?.arrondissement_id) {
          const { data: vExist } = await supabase
            .from("villages")
            .select("id")
            .eq("arrondissement_id", ascqProfile.arrondissement_id)
            .ilike("nom", cleanVillage)
            .maybeSingle();

          if (vExist?.id) {
            vId = vExist.id;
          } else {
            const { data: newV } = await supabase
              .from("villages")
              .insert({ nom: cleanVillage, arrondissement_id: ascqProfile.arrondissement_id })
              .select("id")
              .maybeSingle();
            vId = newV?.id;
          }
        }

        // Mise à jour ou insertion dans relais_communautaires
        const { data: existingRc } = await supabase
          .from("relais_communautaires")
          .select("id")
          .or(`id.eq.${targetRcId || "00000000-0000-0000-0000-000000000000"},user_id.eq.${targetUserId || "00000000-0000-0000-0000-000000000000"}`)
          .maybeSingle();

        if (existingRc) {
          await supabase
            .from("relais_communautaires")
            .update({
              ascq_id: ascqProfile.id,
              village_id: vId,
              village_nom: cleanVillage,
              grappe: parseInt(validateGrappe, 10) || 1,
              nom_grappe: validateNomGrappe.trim() || null,
              statut: "ACTIF",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingRc.id);
        } else if (targetUserId) {
          await supabase
            .from("relais_communautaires")
            .insert({
              user_id: targetUserId,
              ascq_id: ascqProfile.id,
              nom: selectedRcToValidate.nom,
              prenoms: selectedRcToValidate.prenoms,
              telephone: selectedRcToValidate.telephone,
              village_id: vId,
              village_nom: cleanVillage,
              grappe: parseInt(validateGrappe, 10) || 1,
              nom_grappe: validateNomGrappe.trim() || null,
              code_acces_temporaire: "0000",
              code_temporaire_utilise: true,
              statut: "ACTIF",
            });
        }
      }

      // 3. Fermer et rafraîchir
      setIsValidateModalOpen(false);
      setSelectedRcToValidate(null);
      setValidateVillageNom("");
      setValidateGrappe("1");
      setValidateNomGrappe("");

      await loadData();
    } catch (err: any) {
      console.error("Erreur validation relais:", err);
      setValidateError(err.message || "Erreur lors de la validation du relais.");
    } finally {
      setValidateLoading(false);
    }
  };

  const filteredRelais = relaisList.filter((rc) => {
    const q = searchTerm.toLowerCase();
    return (
      rc.nom.toLowerCase().includes(q) ||
      rc.prenoms.toLowerCase().includes(q) ||
      rc.telephone.includes(q) ||
      rc.village_nom?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-20">
      <AscqNav userProfile={ascqProfile} />

      {/* Contenu principal */}
      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        
        {/* Titre et Action d'enrôlement */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Mes Relais Communautaires
            </h1>
            <p className="text-xs text-slate-500">
              Gestion de vos agents communautaires et des codes d'accès
            </p>
          </div>

          <button
            onClick={() => setIsEnrollModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#005c30] text-white font-bold text-xs shadow hover:bg-[#004724] active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enrôler un RC</span>
          </button>
        </div>
        
        {/* Cartes d'indicateurs de l'ASCQ */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
            <p className="text-xl sm:text-2xl font-black text-[#005c30]">
              {relaisList.length}
            </p>
            <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
              Total RC enrôlés
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
            <p className="text-xl sm:text-2xl font-black text-amber-600">
              {relaisList.filter((r) => !r.code_temporaire_utilise).length}
            </p>
            <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
              Codes en attente
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
            <p className="text-xl sm:text-2xl font-black text-emerald-600">
              {relaisList.filter((r) => r.code_temporaire_utilise).length}
            </p>
            <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
              Comptes actifs
            </p>
          </div>
        </div>

        {/* SECTION : RELAIS AUTO-INSCRITS EN ATTENTE DE VALIDATION ET AFFECTATION */}
        {relaisEnAttente.length > 0 && (
          <div className="bg-amber-50/90 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-950 font-black text-xs sm:text-sm">
                <span className="p-1.5 rounded-xl bg-amber-500 text-white">
                  <UserPlus className="w-4 h-4" />
                </span>
                <span>Relais auto-inscrits en attente de validation ({relaisEnAttente.length})</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-full">
                Action requise
              </span>
            </div>

            <p className="text-xs text-amber-900 leading-relaxed">
              Ces relais se sont inscrits dans votre arrondissement. Veuillez valider leur inscription et les affecter à leur village d'intervention pour activer leur compte.
            </p>

            <div className="space-y-2.5 pt-1">
              {relaisEnAttente.map((rcAtt) => (
                <div
                  key={rcAtt.rc_id || rcAtt.user_id || rcAtt.id}
                  className="bg-white rounded-2xl p-3.5 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-emerald-400 transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm uppercase">
                        {rcAtt.nom} {rcAtt.prenoms}
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        En attente
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                      <BeninPhoneAction telephone={rcAtt.telephone} variant="button-group" />
                      {rcAtt.arrondissement_nom && (
                        <span className="text-slate-500">
                          • Arrondissement : <strong>{rcAtt.arrondissement_nom}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenValidate(rcAtt)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#005c30] text-white font-bold text-xs hover:bg-[#004724] shadow-xs active:scale-95 transition-all self-start sm:self-auto shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Valider & Affecter au village</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barre de recherche et actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, téléphone ou village..."
              className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30] shadow-sm text-slate-800"
            />
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-white rounded-2xl border border-slate-200 text-slate-600 hover:text-[#005c30] shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Rafraîchir la liste"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Liste des Relais Communautaires */}
        {loading ? (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-500 border border-slate-200/80 shadow-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30] mb-2" />
            <p className="text-xs font-semibold">Chargement des relais communautaires...</p>
          </div>
        ) : filteredRelais.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#005c30] flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm">
                {searchTerm ? "Aucun relais trouvé" : "Aucun relais communautaire enrôlé"}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchTerm
                  ? "Modifiez votre recherche pour afficher des résultats."
                  : "Commencez dès maintenant par enrôler les relais communautaires sous votre responsabilité."}
              </p>
            </div>
            {!searchTerm && (
              <button
                onClick={() => setIsEnrollModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#005c30] text-white text-xs font-bold shadow hover:bg-[#004724] active:scale-95 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Enrôler mon premier RC</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRelais.map((rc) => (
              <div
                key={rc.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:border-emerald-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm uppercase">
                      {rc.nom} {rc.prenoms}
                    </h3>
                    <div className="mt-1">
                      <BeninPhoneAction telephone={rc.telephone} variant="button-group" />
                    </div>
                  </div>

                  {/* Badge de statut du compte */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {rc.statut === "SUSPENDU" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <Ban className="w-3 h-3" />
                        Compte suspendu
                      </span>
                    ) : rc.code_temporaire_utilise ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Compte validé & actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                        <Clock className="w-3 h-3" />
                        Code en attente
                      </span>
                    )}
                  </div>
                </div>

                {/* Localisation et Grappe */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">
                      Village : {rc.village_nom || "Non précisé"}
                    </span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div>
                    <span className="font-semibold text-slate-800">
                      Grappe {rc.grappe}
                    </span>
                    {rc.nom_grappe && (
                      <span className="text-slate-500 ml-1">({rc.nom_grappe})</span>
                    )}
                  </div>
                </div>

                {/* Actions de l'ASCQ : Modifier, Valider/Suspendre, Code */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Bouton Modifier */}
                    <button
                      onClick={() => handleOpenEdit(rc)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95"
                      title="Modifier la fiche du relais"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Modifier</span>
                    </button>

                    {/* Bouton Valider / Activer ou Suspendre */}
                    {rc.statut === "SUSPENDU" ? (
                      <button
                        onClick={() => handleChangeStatus(rc, "ACTIF")}
                        disabled={statusChangingId === rc.id}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                        title="Activer et valider le compte"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{statusChangingId === rc.id ? "Validation..." : "Activer / Valider"}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleChangeStatus(rc, "SUSPENDU")}
                        disabled={statusChangingId === rc.id}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                        title="Suspendre temporairement ce compte"
                      >
                        <Ban className="w-3.5 h-3.5 text-rose-600" />
                        <span>{statusChangingId === rc.id ? "Suspension..." : "Suspendre"}</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleResetCode(rc)}
                    disabled={resettingId === rc.id}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                    title="Réinitialiser le mot de passe à 0000"
                  >
                    <KeyRound className={`w-3.5 h-3.5 text-amber-700 ${resettingId === rc.id ? "animate-spin" : ""}`} />
                    <span>{resettingId === rc.id ? "Réinitialisation..." : "Réinitialiser MDP (0000)"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 2. Modale : Formulaire d'enrôlement d'un nouveau RC */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#005c30] flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                    Enrôler un Relais Communautaire
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Code d'accès par défaut : <strong className="text-emerald-700 font-mono">0000</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2 text-xs text-emerald-950">
              <KeyRound className="w-4 h-4 text-[#005c30] shrink-0 mt-0.5" />
              <p>
                Le code d'accès par défaut du Relais sera <strong>0000</strong>. Dès sa connexion avec son numéro et 0000, l'application lui demandera de changer et confirmer son mot de passe.
              </p>
            </div>

            {enrollError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{enrollError}</span>
              </div>
            )}

            <form onSubmit={handleEnrollSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value.toUpperCase())}
                    placeholder="ex: KANHO"
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 uppercase font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prénoms *
                  </label>
                  <input
                    type="text"
                    required
                    value={prenoms}
                    onChange={(e) => setPrenoms(e.target.value)}
                    placeholder="ex: Marcel"
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Numéro de téléphone (Identifiant de connexion) *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="+229 01 97 00 00 00"
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 pl-3 pr-8 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                  <Phone className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Le RC utilisera ce numéro pour se connecter.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Village de rattachement *
                </label>
                <select
                  value={villageId}
                  onChange={(e) => setVillageId(e.target.value)}
                  required
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005c30] text-slate-800"
                >
                  <option value="">Sélectionner un village</option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nom}
                    </option>
                  ))}
                  <option value="AUTRE">+ Saisir un autre nom de village...</option>
                </select>
              </div>

              {villageId === "AUTRE" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom du nouveau village *
                  </label>
                  <input
                    type="text"
                    required
                    value={customVillageNom}
                    onChange={(e) => setCustomVillageNom(e.target.value.toUpperCase())}
                    placeholder="Nom du village en majuscules"
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 uppercase font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grappe (numéro) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={grappe}
                    onChange={(e) => setGrappe(e.target.value)}
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom de grappe (facultatif)
                  </label>
                  <input
                    type="text"
                    value={nomGrappe}
                    onChange={(e) => setNomGrappe(e.target.value)}
                    placeholder="ex: Quartier Nord"
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={enrollLoading}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#005c30] hover:bg-[#004724] shadow-md transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{enrollLoading ? "Enrôlement en cours..." : "Valider l'enrôlement"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2b. Modale : Modification d'un Relais Communautaire existant */}
      {editingRc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                    Modifier le Relais Communautaire
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Mise à jour des informations d'identité et d'affectation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRc(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={editNom}
                    onChange={(e) => setEditNom(e.target.value.toUpperCase())}
                    placeholder="ex: KANHO"
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 uppercase font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prénoms *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPrenoms}
                    onChange={(e) => setEditPrenoms(e.target.value)}
                    placeholder="ex: Marcel"
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Numéro de téléphone *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={editTelephone}
                    onChange={(e) => setEditTelephone(e.target.value)}
                    placeholder="+229 01 97 00 00 00"
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 pl-3 pr-8 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                  <Phone className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Village de rattachement *
                </label>
                <select
                  value={editVillageId}
                  onChange={(e) => setEditVillageId(e.target.value)}
                  required
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005c30] text-slate-800"
                >
                  <option value="">Sélectionner un village</option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nom}
                    </option>
                  ))}
                  <option value="AUTRE">+ Saisir un autre nom de village...</option>
                </select>
              </div>

              {editVillageId === "AUTRE" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom du village *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCustomVillageNom}
                    onChange={(e) => setEditCustomVillageNom(e.target.value.toUpperCase())}
                    placeholder="Nom du village en majuscules"
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 uppercase font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grappe (numéro) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editGrappe}
                    onChange={(e) => setEditGrappe(e.target.value)}
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom de grappe (facultatif)
                  </label>
                  <input
                    type="text"
                    value={editNomGrappe}
                    onChange={(e) => setEditNomGrappe(e.target.value)}
                    placeholder="ex: Quartier Nord"
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRc(null)}
                  className="w-1/3 py-3 px-3 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="w-2/3 py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#005c30] hover:bg-[#004724] shadow-md transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editLoading ? "Enregistrement..." : "Enregistrer"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modale : Affichage unique du code d'accès temporaire */}
      {codeModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-emerald-500 text-center space-y-4">
            
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#005c30] flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900">
                Compte Relais Prêt !
              </h2>
              <p className="text-xs text-slate-600">
                Pour <strong className="text-slate-900">{codeModalData.prenoms} {codeModalData.nom}</strong> ({codeModalData.telephone})
              </p>
            </div>

            {/* Information officielle */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-left flex items-start gap-2">
              <KeyRound className="w-4 h-4 text-[#005c30] shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-950 leading-snug">
                Le code d'accès par défaut est <strong>0000</strong>. Le relais se connecte avec son numéro et <strong>0000</strong>, puis l'application lui demandera obligatoirement de définir son mot de passe personnel.
              </p>
            </div>

            {/* Affichage géant du code 0000 */}
            <div className="bg-[#e8f5ee] rounded-2xl p-4 border border-[#c6e4d2] space-y-1">
              <p className="text-[11px] font-bold text-[#005c30] uppercase tracking-wider">
                Code d'accès par défaut
              </p>
              <p className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-[#005c30]">
                {codeModalData.code}
              </p>
            </div>

            {/* Boutons d'action pour partager */}
            <div className="space-y-2 pt-1">
              <button
                onClick={shareViaWhatsApp}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-[#25D366] hover:bg-[#1fb855] shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Transmettre via WhatsApp</span>
              </button>

              <button
                onClick={copyToClipboard}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Code copié dans le presse-papier !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copier le code</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setCodeModalData(null)}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-[#005c30] hover:bg-[#004724] shadow-sm transition-all active:scale-95 mt-2"
              >
                J'ai bien noté le code (Fermer)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modale : Valider et Affecter un Relais Communautaire auto-inscrit */}
      {isValidateModalOpen && selectedRcToValidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-100 text-[#005c30]">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-black text-slate-900 leading-tight">
                    Valider et Affecter le Relais
                  </h2>
                  <p className="text-xs text-slate-500">
                    Arrondissement de rattachement
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsValidateModalOpen(false);
                  setSelectedRcToValidate(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Identité du relais */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <p className="text-xs font-black text-slate-900 uppercase">
                {selectedRcToValidate.nom} {selectedRcToValidate.prenoms}
              </p>
              <div className="mt-1">
                <BeninPhoneAction telephone={selectedRcToValidate.telephone} variant="button-group" />
              </div>
            </div>

            {validateError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{validateError}</span>
              </div>
            )}

            <form onSubmit={handleValiderEtAffecterSubmit} className="space-y-4 text-xs">
              
              {/* Village d'intervention (Saisie libre avec propositions mémorisées) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 block">
                    Village d'intervention *
                  </label>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    (Mémorisation automatique)
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    list="villages-memoire-list"
                    value={validateVillageNom}
                    onChange={(e) => setValidateVillageNom(e.target.value)}
                    placeholder="Saisissez ou choisissez un village..."
                    className="w-full text-xs sm:text-sm pl-3.5 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30] font-semibold text-slate-800"
                  />
                  <datalist id="villages-memoire-list">
                    {villagesMemoire.map((vNom, vIdx) => (
                      <option key={vIdx} value={vNom} />
                    ))}
                  </datalist>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Vous pouvez saisir manuellement un nouveau village. Il sera automatiquement conservé en mémoire pour vos prochaines affectations.
                </p>
              </div>

              {/* Grappe & Nom de grappe */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Numéro de grappe *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={validateGrappe}
                    onChange={(e) => setValidateGrappe(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nom de grappe (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={validateNomGrappe}
                    onChange={(e) => setValidateNomGrappe(e.target.value)}
                    placeholder="Ex: Grappe Nord"
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsValidateModalOpen(false);
                    setSelectedRcToValidate(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={validateLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{validateLoading ? "Validation en cours..." : "Valider et Activer"}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
    </div>
  );
}
