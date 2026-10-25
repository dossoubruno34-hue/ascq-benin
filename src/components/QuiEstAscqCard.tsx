"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Phone, MapPin, User, Search, CheckCircle2 } from "lucide-react";

interface Props {
  departements: Array<{ id: string; nom: string }>;
}

export default function QuiEstAscqCard({ departements }: Props) {
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase.rpc("rechercher_annuaire_ascq", {
        p_departement_id: selectedDep || null,
        p_commune_id: selectedCom || null,
        p_arrondissement_id: selectedArr || null,
      });

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
    <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
      <h2 className="text-lg font-bold text-slate-900">
        Qui est l'ASCQ de mon milieu ?
      </h2>

      <form onSubmit={handleSearch} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Département
          </label>
          <select
            value={selectedDep}
            onChange={(e) => setSelectedDep(e.target.value)}
            className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0e7f47] text-slate-800"
          >
            <option value="">Choisir</option>
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
            className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0e7f47] text-slate-800 disabled:opacity-50"
          >
            <option value="">Choisir</option>
            {communes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Arrondissement (facultatif)
          </label>
          <select
            value={selectedArr}
            onChange={(e) => setSelectedArr(e.target.value)}
            disabled={!selectedCom}
            className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0e7f47] text-slate-800 disabled:opacity-50"
          >
            <option value="">Tous les arrondissements</option>
            {arrondissements.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#0e7f47] hover:bg-[#0b6d3c] shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? "Recherche en cours..." : "Rechercher"}</span>
        </button>
      </form>

      {/* Résultats de recherche */}
      {searched && (
        <div className="pt-2 space-y-3 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Résultats trouvés ({results.length})
          </p>

          {results.length === 0 ? (
            <div className="text-center py-5 px-3 bg-slate-50 rounded-2xl border border-slate-200/60 text-slate-600 text-xs space-y-1">
              <User className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              <p className="font-semibold text-slate-800">Aucun ASCQ trouvé pour cette zone</p>
              <p className="text-slate-500">
                L'ASCQ de cette localité n'a pas encore activé sa visibilité ou validé son compte.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((ascq) => (
                <div
                  key={ascq.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#0e7f47] transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm uppercase">
                        {ascq.nom} {ascq.prenoms}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0e7f47] bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        ASCQ Certifié
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {ascq.arrondissement_nom || "ARRONDISSEMENT"}, {ascq.commune_nom || "COMMUNE"} ({ascq.departement_nom})
                    </span>
                  </div>

                  {ascq.telephone && (
                    <div className="pt-1.5">
                      <a
                        href={`tel:${ascq.telephone}`}
                        className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-[#0e7f47] text-slate-800 font-semibold text-xs border border-slate-200 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#0e7f47]" />
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
  );
}
