"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AscqNav from "@/components/AscqNav";
import { 
  MessageSquareText, 
  Send, 
  PlusCircle, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  HelpCircle,
  FileCheck2,
  X
} from "lucide-react";

export default function RequetesPage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [requetes, setRequetes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState<string>("TOUS");

  // Modale de nouvelle requête
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [typeRequete, setTypeRequete] = useState("MODIFICATION_AFFECTATION");
  const [objet, setObjet] = useState("");
  const [message, setMessage] = useState("");
  const [priorite, setPriorite] = useState("NORMALE");
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ text: string; error: boolean } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: profils } = await supabase.rpc("obtenir_mon_profil");
      if (!profils || profils.length === 0) {
        router.push("/connexion");
        return;
      }
      setUserProfile(profils[0]);

      const { data, error } = await supabase.rpc("lister_mes_requetes");
      if (error) throw error;
      setRequetes(data || []);

    } catch (err) {
      console.error("Erreur chargement requêtes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitRequete = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg(null);

    try {
      const { data, error } = await supabase.rpc("soumettre_requete_ascq", {
        p_type_requete: typeRequete,
        p_objet: objet.trim(),
        p_message: message.trim(),
        p_priorite: priorite,
      });

      if (error) throw error;

      setIsModalOpen(false);
      setObjet("");
      setMessage("");
      setPriorite("NORMALE");
      await loadData();
      alert("Votre requête a bien été soumise à l'administration.");
    } catch (err: any) {
      setFormMsg({ text: err.message || "Erreur lors de la soumission.", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequetes = requetes.filter((r) => {
    if (filterStatut === "TOUS") return true;
    if (filterStatut === "EN_COURS") return r.statut === "ENVOYEE" || r.statut === "EN_COURS";
    if (filterStatut === "RESOLUE") return r.statut === "RESOLUE";
    if (filterStatut === "REJETEE") return r.statut === "REJETEE";
    return true;
  });

  const getTypeLabel = (t: string) => {
    switch (t) {
      case "MODIFICATION_AFFECTATION": return "Affectation / Périmètre";
      case "ADMINISTRATIVE": return "Administrative / Attestation";
      case "TECHNIQUE": return "Problème Technique";
      case "SUGGESTION": return "Suggestion d'amélioration";
      default: return "Autre demande";
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-20">
      <AscqNav userProfile={userProfile} />

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        
        {/* Titre et bouton Nouvelle requête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Mes Requêtes & Demandes
            </h1>
            <p className="text-xs text-slate-500">
              Échangez directement avec la coordination administrative
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#005c30] text-white font-bold text-xs shadow hover:bg-[#004724] active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nouvelle requête</span>
          </button>
        </div>

        {/* Filtres par statut */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: "TOUS", label: `Toutes (${requetes.length})` },
            { id: "EN_COURS", label: `En cours (${requetes.filter(r => r.statut === "ENVOYEE" || r.statut === "EN_COURS").length})` },
            { id: "RESOLUE", label: `Résolues (${requetes.filter(r => r.statut === "RESOLUE").length})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatut(f.id)}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
                filterStatut === f.id
                  ? "bg-[#005c30] text-white border-[#005c30]"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Liste des requêtes */}
        {loading ? (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-500 border border-slate-200/80 shadow-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30] mb-2" />
            <p className="text-xs font-semibold">Chargement de vos requêtes...</p>
          </div>
        ) : filteredRequetes.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <MessageSquareText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm">
                Aucune requête enregistrée
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Besoin d'une modification d'affectation, d'une attestation ou d'un support ? Transmettez votre demande en un clic.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#005c30] text-white text-xs font-bold shadow hover:bg-[#004724] active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Créer une requête</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequetes.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3 hover:border-emerald-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {getTypeLabel(req.type_requete)}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm mt-0.5">
                      {req.objet}
                    </h3>
                  </div>

                  {/* Badge de statut */}
                  <div>
                    {req.statut === "ENVOYEE" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                        <Clock className="w-3 h-3" />
                        Envoyée
                      </span>
                    )}
                    {req.statut === "EN_COURS" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse">
                        <Clock className="w-3 h-3" />
                        En traitement
                      </span>
                    )}
                    {req.statut === "RESOLUE" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Résolue
                      </span>
                    )}
                    {req.statut === "REJETEE" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                        <XCircle className="w-3 h-3" />
                        Refusée
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                  {req.message}
                </p>

                {/* Réponse de l'administration */}
                {req.reponse_admin ? (
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 text-[#005c30] text-xs font-bold">
                      <FileCheck2 className="w-4 h-4" />
                      <span>Réponse de l'Administration :</span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed">
                      {req.reponse_admin}
                    </p>
                    {req.repondu_at && (
                      <span className="text-[10px] text-slate-400 block pt-0.5">
                        Rendu le {new Date(req.repondu_at).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>Priorité : {req.priorite === "URGENTE" ? "🚨 Urgente" : "Normale"}</span>
                    <span>Soumise le {new Date(req.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modale de création d'une nouvelle requête */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <MessageSquareText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                    Nouvelle Requête
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Transmise à l'équipe d'administration
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRequete} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Type de requête *
                </label>
                <select
                  value={typeRequete}
                  onChange={(e) => setTypeRequete(e.target.value)}
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                >
                  <option value="MODIFICATION_AFFECTATION">Modification d'affectation / Périmètre</option>
                  <option value="ADMINISTRATIVE">Demande administrative / Attestation / Congé</option>
                  <option value="TECHNIQUE">Problème technique (Application ou téléphone)</option>
                  <option value="SUGGESTION">Suggestion ou retour d'expérience</option>
                  <option value="AUTRE">Autre requête</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Objet du message *
                </label>
                <input
                  type="text"
                  required
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                  placeholder="ex: Rectification de l'arrondissement rattaché"
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Détail de votre requête *
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Décrivez précisément votre demande ou le problème rencontré..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Niveau de priorité
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriorite("NORMALE")}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      priorite === "NORMALE"
                        ? "bg-[#005c30] text-white border-[#005c30]"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    Normale
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriorite("URGENTE")}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      priorite === "URGENTE"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    🚨 Urgente
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#005c30] hover:bg-[#004724] shadow-md transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? "Envoi en cours..." : "Transmettre ma requête"}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
