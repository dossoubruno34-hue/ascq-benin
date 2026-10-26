"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Phone, 
  MapPin, 
  User, 
  RefreshCw,
  Search
} from "lucide-react";

export default function AdminValidationComptesPage() {
  const [comptes, setComptes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState("EN_ATTENTE");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadComptes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("lister_comptes_admin");
      if (error) throw error;
      setComptes(data || []);
    } catch (err) {
      console.error("Erreur chargement comptes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComptes();
  }, []);

  // Valider un compte via RPC
  const handleValiderCompte = async (id: string) => {
    setActionLoadingId(id);
    try {
      const { error } = await supabase.rpc("changer_statut_compte", {
        p_id: id,
        p_nouveau_statut: "VALIDE",
      });

      if (error) throw error;
      await loadComptes();
    } catch (err: any) {
      alert("Erreur lors de la validation du compte : " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Rejeter ou suspendre un compte
  const handleRejeterCompte = async (id: string) => {
    if (!confirm("Voulez-vous vraiment refuser / suspendre ce compte ?")) return;
    setActionLoadingId(id);
    try {
      const { error } = await supabase.rpc("changer_statut_compte", {
        p_id: id,
        p_nouveau_statut: "REJETE",
      });

      if (error) throw error;
      await loadComptes();
    } catch (err: any) {
      alert("Erreur lors du rejet du compte : " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredComptes = comptes
    .filter((c) => {
      if (filterStatut === "TOUS") return true;
      return c.statut_compte === filterStatut;
    })
    .filter((c) => {
      const full = `${c.nom} ${c.prenoms} ${c.telephone} ${c.commune_nom || ""}`.toLowerCase();
      return full.includes(searchTerm.toLowerCase());
    });

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Accueil</span>
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1 rounded-xl transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Portail Complet d'Administration</span>
            </Link>
          </div>

          <button
            onClick={loadComptes}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualiser la liste</span>
          </button>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Espace Administration
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Validation des Comptes Professionnels
            </h1>
            <p className="text-xs text-slate-500">
              Examinez les inscriptions des ASCQ et autorisez l'accès aux modules de santé communautaire.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Statut :</span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {[
                { id: "EN_ATTENTE", label: "En attente" },
                { id: "VALIDE", label: "Validés" },
                { id: "TOUS", label: "Tous" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFilterStatut(s.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    filterStatut === s.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, prénom, numéro de téléphone ou commune..."
            className="w-full text-sm rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/80">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Chargement des comptes...</p>
          </div>
        ) : filteredComptes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/80 text-slate-500 text-sm space-y-2">
            <User className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">Aucun compte dans cette vue</p>
            <p className="text-xs text-slate-400">
              {filterStatut === "EN_ATTENTE"
                ? "Il n'y a aucun compte en attente de validation pour le moment."
                : "Aucun compte ne correspond à vos critères."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredComptes.map((compte) => {
              const isPending = compte.statut_compte === "EN_ATTENTE";
              const isValide = compte.statut_compte === "VALIDE";
              const isBusy = actionLoadingId === compte.id;

              return (
                <div
                  key={compte.id}
                  className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all ${
                    isPending
                      ? "border-amber-200 shadow-sm bg-gradient-to-r from-amber-50/20 to-white"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-base uppercase">
                          {compte.nom} {compte.prenoms}
                        </span>

                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                          {compte.poste}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isPending
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : isValide
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {isPending && <Clock className="w-3 h-3" />}
                          {isValide && <CheckCircle className="w-3 h-3" />}
                          {compte.statut_compte}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <strong className="text-slate-800">{compte.telephone}</strong>
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {compte.arrondissement_nom || "ARRONDISSEMENT"}, {compte.commune_nom || "COMMUNE"} ({compte.departement_nom})
                          </span>
                        </span>
                      </div>

                      {compte.source_financement && (
                        <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 pt-1 border-t border-slate-100">
                          <span>Financement : <strong>{compte.source_financement}</strong></span>
                          <span>•</span>
                          <span>RC en charge : <strong>{compte.nombre_rc}</strong></span>
                          <span>•</span>
                          <span>Annuaire public : <strong>{compte.afficher_annuaire_public ? "Oui" : "Non"}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isPending ? (
                        <>
                          <button
                            onClick={() => handleValiderCompte(compte.id)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Valider le compte</span>
                          </button>

                          <button
                            onClick={() => handleRejeterCompte(compte.id)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Refuser</span>
                          </button>
                        </>
                      ) : isValide ? (
                        <button
                          onClick={() => handleRejeterCompte(compte.id)}
                          disabled={isBusy}
                          className="text-xs font-medium text-slate-400 hover:text-red-600 transition-colors"
                        >
                          Suspendre
                        </button>
                      ) : (
                        <button
                          onClick={() => handleValiderCompte(compte.id)}
                          disabled={isBusy}
                          className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                          Réactiver
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
