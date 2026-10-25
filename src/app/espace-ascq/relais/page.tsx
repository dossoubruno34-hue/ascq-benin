"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  Check
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

      // Ouvrir la modale d'affichage unique du code
      setCodeModalData({
        code: data.code_temporaire,
        nom: data.nom,
        prenoms: data.prenoms,
        telephone: data.telephone,
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

  // Réinitialiser le code d'accès d'un RC
  const handleResetCode = async (rc: Relais) => {
    if (!confirm(`Voulez-vous générer un nouveau code d'accès temporaire pour ${rc.prenoms} ${rc.nom} ? L'ancien mot de passe sera réinitialisé.`)) {
      return;
    }

    setResettingId(rc.id);
    try {
      const { data, error } = await supabase.rpc("reinitialiser_code_acces_rc", {
        p_rc_id: rc.id,
      });

      if (error) throw error;

      // Ouvrir la modale d'affichage unique avec le nouveau code
      setCodeModalData({
        code: data.nouveau_code,
        nom: data.nom,
        prenoms: data.prenoms,
        telephone: data.telephone,
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
    const message = `Bonjour ${codeModalData.prenoms},\nVoici votre code d'accès temporaire pour l'application ASCQ Bénin : *${codeModalData.code}*.\n\nRendez-vous sur http://localhost:3000/connexion pour vous connecter et choisir votre mot de passe personnel.`;
    const cleanPhone = codeModalData.telephone.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
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
      {/* 1. En-tête ASCQ */}
      <header className="bg-[#005c30] text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-white"
              title="Retour à l'accueil"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight leading-tight">
                Relais Communautaires
              </h1>
              <p className="text-[11px] text-white/80">
                {ascqProfile ? `${ascqProfile.prenoms} ${ascqProfile.nom} (ASCQ)` : "Espace Superviseur"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEnrollModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-[#005c30] font-bold text-xs shadow hover:bg-emerald-50 active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Enrôler un RC</span>
            <span className="sm:hidden">Enrôler</span>
          </button>
        </div>

        {/* Bandeau tricolore béninois */}
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-600 font-medium">
                        {rc.telephone}
                      </span>
                      <a
                        href={`tel:${rc.telephone}`}
                        className="text-[#005c30] p-1 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Appeler ce relais"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Badge de statut du code */}
                  <div>
                    {rc.code_temporaire_utilise ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Compte actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
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

                {/* Actions de l'ASCQ */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400">
                    Enrôlé le {new Date(rc.created_at).toLocaleDateString("fr-FR")}
                  </span>

                  <button
                    onClick={() => handleResetCode(rc)}
                    disabled={resettingId === rc.id}
                    className="font-bold text-[#005c30] hover:text-[#004724] hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resettingId === rc.id ? "animate-spin" : ""}`} />
                    <span>Réinitialiser le code d'accès</span>
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
                    Génère un code d'accès pour sa première connexion
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

      {/* 3. Modale : Affichage unique du code d'accès temporaire */}
      {codeModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-emerald-500 text-center space-y-4">
            
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#005c30] flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900">
                Relais Enrôlé avec Succès !
              </h2>
              <p className="text-xs text-slate-600">
                Pour <strong className="text-slate-900">{codeModalData.prenoms} {codeModalData.nom}</strong> ({codeModalData.telephone})
              </p>
            </div>

            {/* Avertissement important */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-left flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-900 leading-snug">
                <strong>Attention :</strong> Ce code d'accès temporaire ne sera affiché <u>qu'une seule fois</u>. Transmettez-le dès maintenant à votre relais communautaire.
              </p>
            </div>

            {/* Affichage géant du code à 6 chiffres */}
            <div className="bg-[#e8f5ee] rounded-2xl p-4 border border-[#c6e4d2] space-y-1">
              <p className="text-[11px] font-bold text-[#005c30] uppercase tracking-wider">
                Code d'accès temporaire
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
    </div>
  );
}
