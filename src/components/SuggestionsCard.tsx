"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Send, CheckCircle2, AlertCircle, Mail, MessageSquare } from "lucide-react";

interface Props {
  departements: Array<{ id: string; nom: string }>;
}

export default function SuggestionsCard({ departements }: Props) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [typeMessage, setTypeMessage] = useState("SUGGESTION");
  const [objet, setObjet] = useState("");
  const [message, setMessage] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [selectedDep, setSelectedDep] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
      });

      if (error) throw error;

      setSuccess(true);
      setObjet("");
      setMessage("");
      setNom("");
      setTelephone("");
      setSelectedDep("");
    } catch (err: any) {
      console.error("Erreur envoi suggestion:", err);
      setErrorMsg("Une erreur est survenue lors de l'envoi de votre message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="suggestions" className="bg-[#e2f0e8] rounded-3xl p-6 border border-[#c6e4d2] space-y-4">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-[#0c4a29]">
          Aidez-nous à mieux vous servir
        </h2>
        <p className="text-xs sm:text-sm text-[#14532d] mt-1 leading-relaxed">
          Une suggestion, une réclamation ? Dites-le-nous : aucun compte n'est nécessaire.
        </p>
      </div>

      {/* Boutons d'action visibles comme sur la maquette */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#0e7f47] hover:bg-[#0b6d3c] shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{isFormOpen ? "Fermer le formulaire" : "Écrire un message"}</span>
        </button>

        <a
          href="mailto:ascqbenin@gmail.com"
          className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all flex items-center gap-1.5"
        >
          <Mail className="w-3.5 h-3.5 text-[#0e7f47]" />
          <span>ascqbenin@gmail.com</span>
        </a>
      </div>

      {/* Formulaire dépliable */}
      {isFormOpen && (
        <div className="pt-3 border-t border-[#c6e4d2]">
          {success ? (
            <div className="bg-white rounded-2xl p-5 text-center space-y-2 border border-emerald-200">
              <CheckCircle2 className="w-8 h-8 text-[#0e7f47] mx-auto" />
              <h3 className="font-bold text-slate-900 text-sm">Message transmis avec succès !</h3>
              <p className="text-xs text-slate-600">
                Merci pour votre contribution à l'amélioration de la santé communautaire.
              </p>
              <button
                onClick={() => {
                  setSuccess(false);
                  setIsFormOpen(false);
                }}
                className="text-xs font-bold text-[#0e7f47] hover:underline pt-1 inline-block"
              >
                Fermer
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 sm:p-5 border border-[#c6e4d2] space-y-3">
              {errorMsg && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "SUGGESTION", label: "Suggestion" },
                  { id: "RECOMMANDATION", label: "Recommandation" },
                  { id: "RECLAMATION", label: "Réclamation" },
                ].map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setTypeMessage(t.id)}
                    className={`py-1.5 px-1 text-xs font-bold rounded-lg border text-center transition-all ${
                      typeMessage === t.id
                        ? "bg-[#0e7f47] text-white border-[#0e7f47]"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div>
                <input
                  type="text"
                  required
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                  placeholder="Objet du message *"
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0e7f47]"
                />
              </div>

              <div>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Votre message, suggestion ou réclamation..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0e7f47]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Votre nom (facultatif)"
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0e7f47]"
                />
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="Téléphone (facultatif)"
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0e7f47]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#0e7f47] hover:bg-[#0b6d3c] shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? "Envoi..." : "Envoyer mon message"}</span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
