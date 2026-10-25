"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Printer, 
  Check, 
  Save, 
  FileText, 
  Clock, 
  MapPin, 
  Users, 
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  ChevronRight
} from "lucide-react";
import AscqNav from "@/components/AscqNav";
import SignatureCanvas from "@/components/SignatureCanvas";

interface LignePlanning {
  activite: string;
  periode: string;
  lieu: string;
  personnes_impliquees: string;
  objectifs: string;
}

export default function PlanningAscqPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [historiquePlannings, setHistoriquePlannings] = useState<any[]>([]);

  // Planning en cours
  const moisActuel = new Date().getMonth() + 1;
  const anneeActuelle = new Date().getFullYear();

  const [mois, setMois] = useState<number>(moisActuel);
  const [annee, setAnnee] = useState<number>(anneeActuelle);
  const [titre, setTitre] = useState<string>(`Planning des activités du mois`);
  const [lignes, setLignes] = useState<LignePlanning[]>([
    {
      activite: "Supervision et collecte des fiches de surveillance auprès des RC",
      periode: "Semaine 1",
      lieu: "Villages de la zone",
      personnes_impliquees: "Relais communautaires",
      objectifs: "Vérifier la complétude des registres et remonter les alertes"
    },
    {
      activite: "Séance de sensibilisation communautaire sur la prévention du paludisme et de la diarrhée",
      periode: "Semaine 2",
      lieu: "Place publique du village",
      personnes_impliquees: "Mères d'enfants, ménages, chefs de ménage",
      objectifs: "Promouvoir l'utilisation des moustiquaires imprégnées et l'hygiène de l'eau"
    }
  ]);
  const [signatureTactile, setSignatureTactile] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/connexion"); return; }

      const { data: profil } = await supabase.from("utilisateurs").select("*").eq("id", user.id).single();
      setCurrentUser(profil);

      // Charger l'historique des plannings
      const { data: plannings } = await supabase
        .from("plannings_ascq")
        .select("*, lignes_planning_ascq(*)")
        .order("annee", { ascending: false })
        .order("mois", { ascending: false });

      setHistoriquePlannings(plannings || []);

      // Si un planning existe déjà pour ce mois et cette année, le charger
      const existant = plannings?.find((p) => p.mois === mois && p.annee === annee);
      if (existant) {
        setTitre(existant.titre);
        if (existant.lignes_planning_ascq && existant.lignes_planning_ascq.length > 0) {
          setLignes(existant.lignes_planning_ascq.map((l: any) => ({
            activite: l.activite,
            periode: l.periode,
            lieu: l.lieu,
            personnes_impliquees: l.personnes_impliquees || "",
            objectifs: l.objectifs || "",
          })));
        }
        if (existant.signature_tactile) {
          setSignatureTactile(existant.signature_tactile);
        }
      }

    } catch (err) {
      console.error("Erreur chargement plannings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [mois, annee]);

  const ajouterLigne = () => {
    setLignes([
      ...lignes,
      { activite: "", periode: "", lieu: "", personnes_impliquees: "", objectifs: "" }
    ]);
  };

  const supprimerLigne = (idx: number) => {
    if (lignes.length <= 1) return;
    setLignes(lignes.filter((_, i) => i !== idx));
  };

  const updateLigne = (idx: number, field: keyof LignePlanning, val: string) => {
    const copy = [...lignes];
    copy[idx][field] = val;
    setLignes(copy);
  };

  const enregistrerPlanning = async (valider: boolean = false) => {
    setSubmitting(true);
    setMessage(null);

    try {
      if (!titre.trim()) throw new Error("Veuillez donner un titre au planning.");
      const lignesValides = lignes.filter((l) => l.activite.trim() !== "");
      if (lignesValides.length === 0) throw new Error("Veuillez renseigner au moins une activité planifiée.");
      if (valider && !signatureTactile) throw new Error("La signature de l'ASCQ est requise pour valider officiellement le planning.");

      const { data, error } = await supabase.rpc("enregistrer_planning_ascq", {
        p_mois: mois,
        p_annee: annee,
        p_titre: titre.trim(),
        p_lignes: lignesValides,
        p_signature_tactile: signatureTactile,
        p_valider: valider,
      });

      if (error) throw error;

      setMessage({
        text: valider ? "Planning validé et signé officiellement avec succès !" : "Planning sauvegardé en brouillon.",
        error: false,
      });

      await chargerDonnees();

    } catch (err: any) {
      setMessage({ text: err.message || "Erreur lors de l'enregistrement.", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  const moisNoms = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="text-center space-y-2 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#005c30]" />
          <p className="text-xs font-semibold">Chargement du planning...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-28 print:bg-white print:p-0">
      
      {/* Barre de navigation (masquée à l'impression) */}
      <div className="print:hidden">
        <AscqNav userProfile={currentUser} />
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-4 print:p-0 print:max-w-none">
        
        {/* En-tête officiel imprimable */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3 print:border-none print:shadow-none print:p-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-emerald-100 text-[#005c30] print:hidden">
                  Module ASCQ
                </span>
                <span className="text-xs text-slate-400 font-bold print:hidden">Phase 8</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 mt-1">
                Planning Mensuel des Activités de l'ASCQ
              </h1>
              <p className="text-xs text-slate-500">
                Agent : <strong className="text-slate-800">{currentUser?.prenoms} {currentUser?.nom}</strong> ({currentUser?.telephone})
              </p>
            </div>

            {/* Boutons d'action impression */}
            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer / PDF</span>
              </button>
            </div>
          </div>

          {/* Sélecteurs Mois & Année */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 print:hidden">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Mois</label>
              <select
                value={mois}
                onChange={(e) => setMois(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
              >
                {moisNoms.map((nom, i) => (
                  <option key={i + 1} value={i + 1}>
                    {nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Année</label>
              <input
                type="number"
                value={annee}
                onChange={(e) => setAnnee(parseInt(e.target.value) || anneeActuelle)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Intitulé du planning</label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="hidden print:block text-xs space-y-1 pt-2">
            <p><strong>Période :</strong> {moisNoms[mois - 1]} {annee}</p>
            <p><strong>Arrondissement :</strong> {currentUser?.arrondissement_nom || "Arrondissement"} • <strong>Commune :</strong> {currentUser?.commune_nom || "Commune"}</p>
          </div>
        </div>

        {/* Message de notification */}
        {message && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 print:hidden ${
            message.error ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}>
            {message.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tableau des activités planifiées */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 print:border-none print:p-0">
          <div className="flex items-center justify-between print:hidden">
            <h2 className="font-extrabold text-sm text-slate-900">
              Grille des activités programmées ({lignes.length})
            </h2>
            <button
              type="button"
              onClick={ajouterLigne}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] text-xs font-bold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter une activité</span>
            </button>
          </div>

          <div className="space-y-3">
            {lignes.map((l, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5 relative group print:bg-white print:border-b print:border-slate-300 print:rounded-none"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-[#005c30] bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    Activité #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => supprimerLigne(idx)}
                    disabled={lignes.length <= 1}
                    className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 print:hidden transition-colors"
                    title="Supprimer cette activité"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Description de l'activité *</label>
                  <input
                    type="text"
                    placeholder="Ex: Réunion de coordination avec les relais communautaires"
                    value={l.activite}
                    onChange={(e) => updateLigne(idx, "activite", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Période / Date *</label>
                    <input
                      type="text"
                      placeholder="Ex: Semaine 1 ou Du 03 au 05"
                      value={l.periode}
                      onChange={(e) => updateLigne(idx, "periode", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Lieu d'exécution *</label>
                    <input
                      type="text"
                      placeholder="Ex: Centre de santé / Village..."
                      value={l.lieu}
                      onChange={(e) => updateLigne(idx, "lieu", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Personnes / Acteurs impliqués</label>
                    <input
                      type="text"
                      placeholder="Ex: RC, Chef de village, Élus locaux"
                      value={l.personnes_impliquees}
                      onChange={(e) => updateLigne(idx, "personnes_impliquees", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Objectifs visés</label>
                    <input
                      type="text"
                      placeholder="Ex: 100% des registres vérifiés"
                      value={l.objectifs}
                      onChange={(e) => updateLigne(idx, "objectifs", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={ajouterLigne}
            className="w-full py-2.5 rounded-2xl border-2 border-dashed border-emerald-300 text-xs font-bold text-[#005c30] hover:bg-emerald-50/50 flex items-center justify-center gap-2 transition-all print:hidden"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une autre activité au planning</span>
          </button>
        </div>

        {/* Signature tactile de l'ASCQ */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3 print:border-none print:p-0">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-sm text-slate-900">
              Signature tactile de validation
            </h2>
            <span className="text-xs text-slate-400 font-bold">ASCQ Titulaire</span>
          </div>
          <SignatureCanvas
            defaultValue={signatureTactile}
            onSignatureChange={(sig) => setSignatureTactile(sig)}
          />
        </div>

        {/* Boutons d'enregistrement (masqués à l'impression) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 print:hidden">
          <button
            type="button"
            onClick={() => enregistrerPlanning(false)}
            disabled={submitting}
            className="w-full sm:flex-1 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer en brouillon</span>
          </button>

          <button
            type="button"
            onClick={() => enregistrerPlanning(true)}
            disabled={submitting}
            className="w-full sm:flex-1 py-3.5 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Valider et signer officiellement</span>
          </button>
        </div>

        {/* Historique des plannings antérieurs */}
        {historiquePlannings.length > 0 && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3 print:hidden">
            <h3 className="font-extrabold text-sm text-slate-900">
              Mes plannings enregistrés
            </h3>
            <div className="divide-y divide-slate-100">
              {historiquePlannings.map((p) => (
                <div
                  key={p.id}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <strong>{moisNoms[p.mois - 1]} {p.annee}</strong>
                    <span className="text-slate-400">• {p.titre}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    p.statut === "VALIDE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                  }`}>
                    {p.statut}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
