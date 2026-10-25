"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Phone, MapPin, User, ShieldCheck } from "lucide-react";

interface AnnuaireProps {
  departements: Array<{ id: string; nom: string }>;
}

export default function AnnuairePublic({ departements }: AnnuaireProps) {
  const [selectedDep, setSelectedDep] = useState("");
  const [selectedCom, setSelectedCom] = useState("");
  const [selectedArr, setSelectedArr] = useState("");

  const [communes, setCommunes] = useState<Array<{ id: string; nom: string }>>([]);
  const [arrondissements, setArrondissements] = useState<Array<{ id: string; nom: string }>>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Charger les communes lorsque le département change
  useEffect(() => {
    if (!selectedDep) {
      setCommunes([]);
      setSelectedCom("");
      setArrondissements([]);
      setSelectedArr("");
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
      setArrondissements([]);
      setSelectedArr("");
    }
    loadCommunes();
  }, [selectedDep]);

  // Charger les arrondissements lorsque la commune change
  useEffect(() => {
    if (!selectedCom) {
      setArrondissements([]);
      setSelectedArr("");
      return;
    }

    async function loadArrondissements() {
      const { data } = await supabase
        .from("arrondissements")
        .select("id, nom")
        .eq("commune_id", selectedCom)
        .order("nom");
      setArrondissements(data || []);
      setSelectedArr("");
    }
    loadArrondissements();
  }, [selectedCom]);

  // Rechercher les ASCQ validés avec option annuaire cochée
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      let query = supabase
        .from("utilisateurs")
        .select(`
          id, nom, prenoms, telephone, poste,
          departements:departement_id(nom),
          communes:commune_id(nom),
          arrondissements:arrondissement_id(nom),
          ascq_profils!inner(afficher_annuaire_public)
        `)
        .eq("statut_compte", "VALIDE")
        .eq("role_technique", "ASCQ_OPERATEUR")
        .eq("ascq_profils.afficher_annuaire_public", true);

      if (selectedDep) query = query.eq("departement_id", selectedDep);
      if (selectedCom) query = query.eq("commune_id", selectedCom);
      if (selectedArr) query = query.eq("arrondissement_id", selectedArr);

      const { data, error } = await query;
      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error("Erreur recherche annuaire:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
      <div className="max-w-2xl mx-auto text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          Annuaire officiel des ASCQ
        </span>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Qui est l'ASCQ de mon milieu ?
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          Trouvez facilement l'Agent de Santé Communautaire Qualifié assigné à votre commune et votre arrondissement.
        </p>
      </div>

      {/* Formulaire de filtres en cascade */}
      <form onSubmit={handleSearch} className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Département
          </label>
          <select
            value={selectedDep}
            onChange={(e) => setSelectedDep(e.target.value)}
            className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Tous les départements</option>
            {departements.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Commune
          </label>
          <select
            value={selectedCom}
            onChange={(e) => setSelectedCom(e.target.value)}
            disabled={!selectedDep}
            className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            <option value="">Toutes les communes</option>
            {communes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Arrondissement
          </label>
          <select
            value={selectedArr}
            onChange={(e) => setSelectedArr(e.target.value)}
            disabled={!selectedCom}
            className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            <option value="">Tous les arrondissements</option>
            {arrondissements.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3 mt-2 flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all active:scale-95 disabled:opacity-60"
          >
            <Search className="w-4 h-4" />
            {loading ? "Recherche en cours..." : "Rechercher mon ASCQ"}
          </button>
        </div>
      </form>

      {/* Résultats */}
      <div className="max-w-3xl mx-auto mt-8">
        {searched && (
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Résultats trouvés ({results.length})
              </span>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-slate-600 text-sm">
                <User className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="font-semibold text-slate-800">Aucun ASCQ trouvé pour cette zone</p>
                <p className="text-xs text-slate-500 mt-1">
                  L'ASCQ de cette localité n'a pas encore validé son compte ou n'a pas activé la visibilité publique de son numéro.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((ascq) => (
                  <div
                    key={ascq.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <h3 className="font-bold text-slate-900 text-sm">
                          {ascq.nom} {ascq.prenoms}
                        </h3>
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800">
                          ASCQ Certifié
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {ascq.arrondissements?.nom || "Arrondissement"}, {ascq.communes?.nom || "Commune"} ({ascq.departements?.nom})
                        </span>
                      </div>
                    </div>

                    {ascq.telephone && (
                      <div className="pt-2 border-t border-slate-100">
                        <a
                          href={`tel:${ascq.telephone}`}
                          className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-800 font-semibold text-xs border border-slate-200/70 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Appeler : {ascq.telephone}</span>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
