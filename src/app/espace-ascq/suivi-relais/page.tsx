"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  Check, 
  Send, 
  Calendar, 
  MapPin, 
  ClipboardCheck, 
  Package, 
  AlertTriangle, 
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Percent
} from "lucide-react";
import AscqNav from "@/components/AscqNav";
import SignatureCanvas from "@/components/SignatureCanvas";

interface RelaisPresence {
  relais_id: string;
  nom_complet: string;
  village: string;
  present: boolean;
  motif: string;
}

interface MaterielInventaire {
  materiel_nom: string;
  etat: "BON_ETAT" | "DEGRADE" | "EN_PANNE" | "EPUISE";
  recommandations: string;
}

export default function SuiviRelaisPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [seancesPassees, setSeancesPassees] = useState<any[]>([]);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Formulaire de séance
  const todayStr = new Date().toISOString().split("T")[0];
  const [dateSeance, setDateSeance] = useState(todayStr);
  const [lieu, setLieu] = useState("");
  const [ordreDuJour, setOrdreDuJour] = useState("Réunion mensuelle de suivi des RC et contrôle des fiches de surveillance");

  // Liste des RC de l'ASCQ
  const [relaisPresences, setRelaisPresences] = useState<RelaisPresence[]>([]);

  // Grille d'inventaire du matériel officiel
  const [inventaireMateriel, setInventaireMateriel] = useState<MaterielInventaire[]>([
    { materiel_nom: "Registres communautaires des alertes et rumeurs", etat: "BON_ETAT", recommandations: "" },
    { materiel_nom: "Boîtes à images de sensibilisation iCCM", etat: "BON_ETAT", recommandations: "" },
    { materiel_nom: "Tests de Diagnostic Rapide (TDR Paludisme)", etat: "BON_ETAT", recommandations: "" },
    { materiel_nom: "Médicaments essentiels (ACT, SRO, Zinc, Amox)", etat: "BON_ETAT", recommandations: "" },
    { materiel_nom: "Lampes torches / Équipement solaire", etat: "BON_ETAT", recommandations: "" },
    { materiel_nom: "Sacoches et vestes d'identification", etat: "BON_ETAT", recommandations: "" },
  ]);

  const [pointsDiscutes, setPointsDiscutes] = useState("");
  const [decisionsPrises, setDecisionsPrises] = useState("");
  const [dateProchaineSeance, setDateProchaineSeance] = useState("");
  const [signatureTactile, setSignatureTactile] = useState<string | null>(null);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/connexion"); return; }

      const { data: profil } = await supabase.from("utilisateurs").select("*").eq("id", user.id).single();
      setCurrentUser(profil);

      // Charger les RC enrôlés par cet ASCQ
      const { data: rcs } = await supabase
        .from("relais_communautaires")
        .select("*")
        .eq("ascq_id", user.id)
        .order("nom");

      if (rcs && rcs.length > 0) {
        setRelaisPresences(rcs.map((r) => ({
          relais_id: r.id,
          nom_complet: `${r.prenoms} ${r.nom}`,
          village: r.village_nom,
          present: true,
          motif: "",
        })));
      }

      // Charger l'historique des séances de suivi
      const { data: seances } = await supabase
        .from("seances_suivi_relais")
        .select("*")
        .order("date_seance", { ascending: false });

      setSeancesPassees(seances || []);

    } catch (err) {
      console.error("Erreur chargement suivi relais:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  const togglePresence = (idx: number) => {
    const copy = [...relaisPresences];
    copy[idx].present = !copy[idx].present;
    setRelaisPresences(copy);
  };

  const updateMotif = (idx: number, motif: string) => {
    const copy = [...relaisPresences];
    copy[idx].motif = motif;
    setRelaisPresences(copy);
  };

  const updateMaterielEtat = (idx: number, etat: any) => {
    const copy = [...inventaireMateriel];
    copy[idx].etat = etat;
    setInventaireMateriel(copy);
  };

  const updateMaterielRecommandation = (idx: number, rec: string) => {
    const copy = [...inventaireMateriel];
    copy[idx].recommandations = rec;
    setInventaireMateriel(copy);
  };

  // Calcul du taux de présence
  const totalRC = relaisPresences.length;
  const nbPresents = relaisPresences.filter((r) => r.present).length;
  const tauxPresence = totalRC > 0 ? Math.round((nbPresents / totalRC) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (!lieu.trim()) throw new Error("Le lieu de la séance de suivi est obligatoire.");
      if (!ordreDuJour.trim()) throw new Error("L'ordre du jour est obligatoire.");
      if (!signatureTactile) throw new Error("La signature de l'ASCQ est requise.");

      const { data, error } = await supabase.rpc("enregistrer_suivi_relais", {
        p_date_seance: dateSeance,
        p_lieu: lieu.trim(),
        p_ordre_du_jour: ordreDuJour.trim(),
        p_relais_presents: relaisPresences,
        p_inventaire_materiel: inventaireMateriel,
        p_points_discutes: pointsDiscutes.trim() || null,
        p_decisions_prises: decisionsPrises.trim() || null,
        p_date_prochaine_seance: dateProchaineSeance || null,
        p_signature_tactile: signatureTactile,
      });

      if (error) throw error;

      setMessage({ text: "Séance de suivi groupé enregistrée avec succès !", error: false });
      setPointsDiscutes("");
      setDecisionsPrises("");

      await chargerDonnees();

    } catch (err: any) {
      setMessage({ text: err.message || "Erreur lors de l'enregistrement.", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="text-center space-y-2 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#005c30]" />
          <p className="text-xs font-semibold">Chargement du module de suivi des Relais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-28">
      <AscqNav userProfile={currentUser} />

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-4">
        
        {/* En-tête */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-emerald-100 text-[#005c30]">
              Supervision ASCQ
            </span>
            <span className="text-xs text-slate-400 font-bold">Phase 8</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Suivi Groupé des Relais Communautaires (RC)
          </h1>
          <p className="text-xs text-slate-500">
            Séance périodique de coordination, contrôle de présence de vos Relais, inventaire du matériel et décisions.
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            message.error ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}>
            {message.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Informations générales */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3.5">
            <h2 className="font-extrabold text-sm text-slate-900">1. Informations de la séance</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Date de la séance *</label>
                <input
                  type="date"
                  value={dateSeance}
                  onChange={(e) => setDateSeance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Lieu de réunion *</label>
                <input
                  type="text"
                  placeholder="Ex: Centre de santé de Gangban"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Ordre du jour *</label>
              <textarea
                rows={2}
                value={ordreDuJour}
                onChange={(e) => setOrdreDuJour(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Présence des RC */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-extrabold text-sm text-slate-900">2. Contrôle de présence des Relais ({totalRC} attendus)</h2>
                <p className="text-xs text-slate-500">Cochez les Relais présents à la séance</p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-100">
                <Percent className="w-4 h-4 text-[#005c30]" />
                <span className="text-xs font-extrabold text-[#005c30]">
                  Présence : {nbPresents} / {totalRC} ({tauxPresence}%)
                </span>
              </div>
            </div>

            {totalRC === 0 ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs text-slate-500">
                Aucun Relais Communautaire enrôlé pour le moment. Vous pouvez enrôler des RC dans l'onglet « Mes Relais ».
              </div>
            ) : (
              <div className="space-y-2">
                {relaisPresences.map((r, i) => (
                  <div
                    key={r.relais_id}
                    className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      r.present ? "bg-emerald-50/40 border-emerald-200" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => togglePresence(i)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          r.present ? "bg-[#005c30] text-white" : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        {r.present ? <Check className="w-4 h-4 stroke-[3]" /> : "✕"}
                      </button>
                      <div>
                        <strong className="text-xs font-extrabold text-slate-900 block">{r.nom_complet}</strong>
                        <span className="text-[11px] text-slate-500">Village : {r.village}</span>
                      </div>
                    </div>

                    {!r.present && (
                      <div className="w-full sm:w-64">
                        <input
                          type="text"
                          placeholder="Motif d'absence (facultatif)"
                          value={r.motif}
                          onChange={(e) => updateMotif(i, e.target.value)}
                          className="w-full px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventaire du matériel communautaire */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3.5">
            <div>
              <h2 className="font-extrabold text-sm text-slate-900">3. Inventaire & État du matériel des Relais</h2>
              <p className="text-xs text-slate-500">Vérification de l'état des outils de travail</p>
            </div>

            <div className="space-y-2.5">
              {inventaireMateriel.map((mat, i) => (
                <div key={i} className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/70 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <strong className="text-xs text-slate-800 font-extrabold">{mat.materiel_nom}</strong>
                    <select
                      value={mat.etat}
                      onChange={(e) => updateMaterielEtat(i, e.target.value as any)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                        mat.etat === "BON_ETAT" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                        mat.etat === "DEGRADE" ? "bg-amber-50 text-amber-800 border-amber-200" :
                        "bg-red-50 text-red-800 border-red-200"
                      }`}
                    >
                      <option value="BON_ETAT">Bon état</option>
                      <option value="DEGRADE">Dégradé / Usé</option>
                      <option value="EN_PANNE">En panne</option>
                      <option value="EPUISE">Épuisé / Manquant</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Besoins de renouvellement ou observations..."
                    value={mat.recommandations}
                    onChange={(e) => updateMaterielRecommandation(i, e.target.value)}
                    className="w-full px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Points discutés & Décisions */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3.5">
            <h2 className="font-extrabold text-sm text-slate-900">4. Synthèse des échanges & Décisions</h2>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Points discutés lors de la réunion</label>
              <textarea
                rows={2}
                placeholder="Ex: Analyse des fiches de surveillance remplies, rappel sur les signes de méningite..."
                value={pointsDiscutes}
                onChange={(e) => setPointsDiscutes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Décisions prises & Recommandations</label>
              <textarea
                rows={2}
                placeholder="Ex: Intensifier la recherche active des enfants non vaccinés, remise de 50 TDR supplémentaires..."
                value={decisionsPrises}
                onChange={(e) => setDecisionsPrises(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-xs font-bold text-slate-700">Date prévue de la prochaine séance</label>
              <input
                type="date"
                value={dateProchaineSeance}
                onChange={(e) => setDateProchaineSeance(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Signature de l'ASCQ */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="font-extrabold text-sm text-slate-900">Signature officielle de l'ASCQ</h2>
            <SignatureCanvas onSignatureChange={(sig) => setSignatureTactile(sig)} />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? "Enregistrement en cours..." : (
              <>
                <Send className="w-4 h-4" />
                <span>Enregistrer le procès-verbal de suivi</span>
              </>
            )}
          </button>

        </form>

        {/* Historique des séances de suivi passées */}
        {seancesPassees.length > 0 && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="font-extrabold text-sm text-slate-900">
              Historique des séances de suivi ({seancesPassees.length})
            </h2>
            <div className="divide-y divide-slate-100">
              {seancesPassees.map((s) => (
                <div key={s.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <strong className="text-slate-900 font-extrabold">{s.ordre_du_jour}</strong>
                    <span className="text-slate-400">{s.date_seance}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Lieu : {s.lieu} • Relais suivis : {Array.isArray(s.relais_presents) ? s.relais_presents.length : 0}
                  </p>
                  {s.decisions_prises && (
                    <p className="text-xs text-slate-700 italic">Décisions : « {s.decisions_prises} »</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
