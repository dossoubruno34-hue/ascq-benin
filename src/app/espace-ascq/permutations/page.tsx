"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AscqNav from "@/components/AscqNav";
import { 
  ArrowLeftRight, 
  MapPin, 
  PlusCircle, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  User, 
  Send,
  Building,
  Check
} from "lucide-react";

export default function PermutationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"bourse" | "ma_demande">("bourse");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [permutations, setPermutations] = useState<any[]>([]);
  const [departements, setDepartements] = useState<Array<{ id: string; nom: string }>>([]);
  const [communes, setCommunes] = useState<Array<{ id: string; nom: string }>>([]);
  const [arrondissements, setArrondissements] = useState<Array<{ id: string; nom: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire de nouvelle demande
  const [depSouhaite, setDepSouhaite] = useState("");
  const [comSouhaite, setComSouhaite] = useState("");
  const [arrSouhaite, setArrSouhaite] = useState("");
  const [motif, setMotif] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Action de proposition de permutation
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 1. Profil de l'utilisateur
      const { data: profils } = await supabase.rpc("obtenir_mon_profil");
      if (!profils || profils.length === 0) {
        router.push("/connexion");
        return;
      }
      setUserProfile(profils[0]);

      // 2. Charger les départements pour le formulaire
      const { data: deps } = await supabase.from("departements").select("id, nom").order("nom");
      setDepartements(deps || []);

      // 3. Charger les permutations disponibles via RPC
      const { data: perms, error: permError } = await supabase.rpc("lister_permutations_disponibles");
      if (permError) throw permError;
      setPermutations(perms || []);

    } catch (err) {
      console.error("Erreur chargement permutations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Cascades géographiques pour la destination souhaitée
  useEffect(() => {
    if (!depSouhaite) {
      setCommunes([]);
      setComSouhaite("");
      setArrondissements([]);
      setArrSouhaite("");
      return;
    }

    async function loadCommunes() {
      const { data } = await supabase
        .from("communes")
        .select("id, nom")
        .eq("departement_id", depSouhaite)
        .order("nom");
      setCommunes(data || []);
      setComSouhaite("");
      setArrondissements([]);
      setArrSouhaite("");
    }
    loadCommunes();
  }, [depSouhaite]);

  useEffect(() => {
    if (!comSouhaite) {
      setArrondissements([]);
      setArrSouhaite("");
      return;
    }

    async function loadArrondissements() {
      const { data } = await supabase
        .from("arrondissements")
        .select("id, nom")
        .eq("commune_id", comSouhaite)
        .order("nom");
      setArrondissements(data || []);
      setArrSouhaite("");
    }
    loadArrondissements();
  }, [comSouhaite]);

  // Publication d'une demande
  const handlePublierDemande = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormMsg(null);

    try {
      const { data, error } = await supabase.rpc("publier_demande_permutation", {
        p_dep_souhaite_id: depSouhaite,
        p_com_souhaite_id: comSouhaite,
        p_arr_souhaite_id: arrSouhaite || null,
        p_motif: motif.trim() || null,
      });

      if (error) throw error;

      setFormMsg({ text: "Votre offre a été publiée avec succès sur la bourse !", error: false });
      setMotif("");
      await loadInitialData();
      setTimeout(() => setActiveTab("bourse"), 1500);

    } catch (err: any) {
      setFormMsg({ text: err.message || "Erreur lors de la publication.", error: true });
    } finally {
      setFormLoading(false);
    }
  };

  // Proposer une permutation avec un confrère
  const handleProposerPermutation = async (permutationId: string) => {
    if (!confirm("Confirmez-vous votre intérêt pour permuter votre poste avec ce confrère ? La proposition sera transmise à l'administration.")) {
      return;
    }

    setActionLoadingId(permutationId);
    try {
      const { data, error } = await supabase.rpc("proposer_permutation", {
        p_permutation_id: permutationId,
      });

      if (error) throw error;

      alert(data.message || "Proposition transmise avec succès !");
      await loadInitialData();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const maDemandeActive = permutations.find((p) => p.est_ma_demande && (p.statut === "OUVERTE" || p.statut === "PROPOSEE"));

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-20">
      <AscqNav userProfile={userProfile} />

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        
        {/* Titre et onglets */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Bourse des Permutations
            </h1>
            <p className="text-xs text-slate-500">
              Échangez votre poste avec un collègue ASCQ
            </p>
          </div>

          <button
            onClick={loadInitialData}
            disabled={loading}
            className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-[#005c30] shadow-sm transition-all"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Barre de sélection d'onglets */}
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab("bourse")}
            className={`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "bourse"
                ? "bg-[#e0f2e9] text-[#005c30]"
                : "hover:text-slate-900"
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Offres disponibles ({permutations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ma_demande")}
            className={`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "ma_demande"
                ? "bg-[#e0f2e9] text-[#005c30]"
                : "hover:text-slate-900"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{maDemandeActive ? "Ma demande active" : "Publier une demande"}</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 1 : BOURSE DES OFFRES DISPONIBLES */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "bourse" && (
          <section className="space-y-3">
            {loading ? (
              <div className="bg-white rounded-3xl p-8 text-center text-slate-500 border border-slate-200/80 shadow-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30] mb-2" />
                <p className="text-xs font-semibold">Recherche des offres de permutation...</p>
              </div>
            ) : permutations.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                  <ArrowLeftRight className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">
                    Aucune offre de permutation publiée
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Soyez le premier à publier votre souhait de permutation pour trouver un confrère intéressé.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("ma_demande")}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#005c30] text-white text-xs font-bold shadow hover:bg-[#004724] active:scale-95 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Publier mon offre</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {permutations.map((perm) => (
                  <div
                    key={perm.id}
                    className={`bg-white rounded-3xl p-5 border shadow-sm transition-all space-y-3 ${
                      perm.est_ma_demande
                        ? "border-[#005c30] ring-1 ring-[#005c30]/20"
                        : "border-slate-200/90 hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs uppercase">
                          {perm.demandeur_nom?.[0]}{perm.demandeur_prenoms?.[0]}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase">
                            {perm.demandeur_nom} {perm.demandeur_prenoms}
                          </h3>
                          <span className="text-[11px] text-slate-400">
                            Publiée le {new Date(perm.created_at).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>

                      {perm.est_ma_demande ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#005c30] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          <Check className="w-3 h-3" />
                          Mon offre
                        </span>
                      ) : perm.statut === "PROPOSEE" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                          <Clock className="w-3 h-3" />
                          En discussion
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                          Disponible
                        </span>
                      )}
                    </div>

                    {/* Comparaison : Poste actuel VS Destination souhaitée */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase block mb-0.5">
                          Poste actuel (Départ)
                        </span>
                        <p className="font-extrabold text-slate-900 uppercase">
                          {perm.arr_depart_nom}
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          {perm.com_depart_nom} ({perm.dep_depart_nom})
                        </p>
                      </div>

                      <div className="border-l border-slate-200 pl-3">
                        <span className="text-[11px] font-bold text-[#005c30] uppercase block mb-0.5">
                          Souhaite aller à
                        </span>
                        <p className="font-extrabold text-slate-900 uppercase">
                          {perm.arr_souhaite_nom || "TOUTE LA COMMUNE"}
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          {perm.com_souhaite_nom} ({perm.dep_souhaite_nom})
                        </p>
                      </div>
                    </div>

                    {perm.motif && (
                      <p className="text-xs text-slate-600 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                        « {perm.motif} »
                      </p>
                    )}

                    {/* Action de permutation */}
                    {!perm.est_ma_demande && perm.statut === "OUVERTE" && (
                      <button
                        onClick={() => handleProposerPermutation(perm.id)}
                        disabled={actionLoadingId === perm.id}
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-[#005c30] hover:bg-[#004724] shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>{actionLoadingId === perm.id ? "Transmission..." : "Proposer une permutation"}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 2 : MA DEMANDE DE PERMUTATION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "ma_demande" && (
          <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            
            {maDemandeActive ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-[#005c30]">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <h3 className="font-extrabold text-sm">
                      Vous avez une offre de permutation en ligne
                    </h3>
                  </div>
                  <p className="text-xs text-emerald-950">
                    Votre souhait de mutation vers <strong>{maDemandeActive.com_souhaite_nom} ({maDemandeActive.dep_souhaite_nom})</strong> est actuellement visible par vos confrères.
                  </p>
                </div>

                <div className="text-xs space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Statut de la demande :</span>
                    <span className="font-bold text-[#005c30] uppercase">{maDemandeActive.statut}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Département visé :</span>
                    <span className="font-bold text-slate-800">{maDemandeActive.dep_souhaite_nom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Commune visée :</span>
                    <span className="font-bold text-slate-800">{maDemandeActive.com_souhaite_nom}</span>
                  </div>
                  {maDemandeActive.arr_souhaite_nom && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Arrondissement visé :</span>
                      <span className="font-bold text-slate-800">{maDemandeActive.arr_souhaite_nom}</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  Pour changer votre destination ou annuler cette demande, vous pouvez publier une nouvelle offre ci-dessous.
                </p>
              </div>
            ) : null}

            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                {maDemandeActive ? "Modifier ma destination" : "Nouvelle demande de permutation"}
              </h2>
              <p className="text-xs text-slate-500">
                Indiquez la zone où vous souhaitez être affecté.
              </p>
            </div>

            {formMsg && (
              <div
                className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 border ${
                  formMsg.error
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                }`}
              >
                {formMsg.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePublierDemande} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Département souhaité *
                </label>
                <select
                  value={depSouhaite}
                  onChange={(e) => setDepSouhaite(e.target.value)}
                  required
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005c30] text-slate-800"
                >
                  <option value="">Choisir un département</option>
                  {departements.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Commune souhaitée *
                </label>
                <select
                  value={comSouhaite}
                  onChange={(e) => setComSouhaite(e.target.value)}
                  required
                  disabled={!depSouhaite}
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005c30] text-slate-800 disabled:opacity-50"
                >
                  <option value="">Choisir une commune</option>
                  {communes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Arrondissement souhaité (facultatif)
                </label>
                <select
                  value={arrSouhaite}
                  onChange={(e) => setArrSouhaite(e.target.value)}
                  disabled={!comSouhaite}
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005c30] text-slate-800 disabled:opacity-50"
                >
                  <option value="">Tous les arrondissements de la commune</option>
                  {arrondissements.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Motif de la demande (facultatif)
                </label>
                <textarea
                  rows={2}
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="ex: Rapprochement de conjoint, convenance familiale..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#005c30] hover:bg-[#004724] shadow-md transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>{formLoading ? "Publication en cours..." : "Publier ma demande de permutation"}</span>
              </button>
            </form>
          </section>
        )}

      </main>
    </div>
  );
}
