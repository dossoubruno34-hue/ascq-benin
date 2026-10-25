"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { MessageSquarePlus, Send, CheckCircle2, AlertCircle } from "lucide-react";

interface FormulaireProps {
  departements: Array<{ id: string; nom: string }>;
}

export default function FormulaireSuggestions({ departements }: FormulaireProps) {
  const [typeMessage, setTypeMessage] = useState("SUGGESTION");
  const [objet, setObjet] = useState("");
  const [message, setMessage] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [selectedDep, setSelectedDep] = useState("");
  const [selectedCom, setSelectedCom] = useState("");

  const [communes, setCommunes] = useState<Array<{ id: string; nom: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!selectedDep) {
      setCommunes([]);
      setSelectedCom("");
      return;
    }

    async function loadCommunes() {
      const { data } = await supabase
        .from("communes")
        .select("id, nom")
        .eq("departement_id", selectedDep)
        .order("nom");
      setCommunes(data || []);
      setSelectedCom("");
    }
    loadCommunes();
  }, [selectedDep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.from("suggestions_publiques").insert({
        type_message: typeMessage,
        objet: objet.trim(),
        message: message.trim(),
        nom: nom.trim() || null,
        telephone: telephone.trim() || null,
        departement_id: selectedDep || null,
        commune_id: selectedCom || null,
      });

      if (error) throw error;

      setSuccess(true);
      setObjet("");
      setMessage("");
      setNom("");
      setTelephone("");
      setSelectedDep("");
      setSelectedCom("");
    } catch (err: any) {
      console.error("Erreur envoi suggestion:", err);
      setErrorMsg("Une erreur est survenue lors de l'envoi de votre message. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
      <div className="max-w-xl mx-auto text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 mb-2">
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Votre voix compte
        </span>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Aidez-nous à mieux vous servir
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Partagez vos suggestions, recommandations ou réclamations pour améliorer la santé communautaire dans votre localité.
        </p>
      </div>

      {success ? (
        <div className="max-w-lg mx-auto bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="font-bold text-emerald-900 text-base">
            Message bien reçu !
          </h3>
          <p className="text-xs text-emerald-700">
            Nous vous remercions pour votre contribution citoyenne. Votre message a été transmis à la coordination des ASCQ.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="text-xs font-semibold text-emerald-800 hover:underline pt-2 inline-block"
          >
            Envoyer un autre message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type de message */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Type de contribution *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "SUGGESTION", label: "Suggestion" },
                { id: "RECOMMANDATION", label: "Recommandation" },
                { id: "RECLAMATION", label: "Réclamation" },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTypeMessage(t.id)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-all ${
                    typeMessage === t.id
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Objet */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Objet de votre message *
            </label>
            <input
              type="text"
              required
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              placeholder="Ex: Disponibilité des intrants à Naogon"
              className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Détails de votre message *
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Expliquez clairement votre situation, proposition ou observation..."
              className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Localisation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Département concerné
              </label>
              <select
                value={selectedDep}
                onChange={(e) => setSelectedDep(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Sélectionner un département</option>
                {departements.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Commune concernée
              </label>
              <select
                value={selectedCom}
                onChange={(e) => setSelectedCom(e.target.value)}
                disabled={!selectedDep}
                className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                <option value="">Sélectionner une commune</option>
                {communes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Coordonnées facultatives */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Votre nom (facultatif)
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Paul Bio"
                className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Votre numéro de téléphone (facultatif)
              </label>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Ex: 0197000000"
                className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {loading ? "Envoi en cours..." : "Transmettre mon message"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
