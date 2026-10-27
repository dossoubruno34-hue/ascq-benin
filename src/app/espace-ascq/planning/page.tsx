"use client";

import { useState, useEffect, useMemo } from "react";
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
  ChevronRight,
  Download
} from "lucide-react";
import AscqNav from "@/components/AscqNav";
import SignatureCanvas from "@/components/SignatureCanvas";

interface LignePlanning {
  jour_semaine: string;
  activite: string;
  lieu: string;
  personnes_impliquees: string;
  objectifs: string;
}

// Calcul de la semaine ISO actuelle (1-52)
function getSemaineActuelle(): number {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Calcul des dates début (lundi) et fin (dimanche) d'une semaine
function getDatesSemaine(annee: number, semaine: number) {
  const simple = new Date(annee, 0, 1 + (semaine - 1) * 7);
  const dayOfWeek = simple.getDay();
  const ISOweekStart = simple;
  if (dayOfWeek <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  
  const ISOweekEnd = new Date(ISOweekStart);
  ISOweekEnd.setDate(ISOweekStart.getDate() + 6);
  
  return {
    debut: ISOweekStart.toISOString().slice(0, 10),
    fin: ISOweekEnd.toISOString().slice(0, 10),
    debutFr: ISOweekStart.toLocaleDateString("fr-FR"),
    finFr: ISOweekEnd.toLocaleDateString("fr-FR"),
    label: `Du lundi ${ISOweekStart.toLocaleDateString("fr-FR")} au dimanche ${ISOweekEnd.toLocaleDateString("fr-FR")}`
  };
}

const JOURS_SEMAINE = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche"
];

export default function PlanningAscqPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [historiquePlannings, setHistoriquePlannings] = useState<any[]>([]);

  // Planning hebdomadaire en cours
  const anneeActuelle = new Date().getFullYear();
  const [semaine, setSemaine] = useState<number>(getSemaineActuelle());
  const [annee, setAnnee] = useState<number>(anneeActuelle);
  
  const dates = useMemo(() => getDatesSemaine(annee, semaine), [annee, semaine]);
  const [titre, setTitre] = useState<string>(`Planning hebdomadaire — Semaine ${semaine} (${annee})`);

  const [lignes, setLignes] = useState<LignePlanning[]>([
    {
      jour_semaine: "Lundi",
      activite: "Supervision et collecte des fiches de surveillance auprès des Relais Communautaires",
      lieu: "Secteurs et villages de l'arrondissement",
      personnes_impliquees: "Relais communautaires (RC)",
      objectifs: "Vérifier la complétude des registres, détecter les signaux et remonter les alertes"
    },
    {
      jour_semaine: "Mardi",
      activite: "Visites à Domicile (VAD) ciblées : suivi des femmes enceintes et des nouveau-nés",
      lieu: "Ménages ciblés",
      personnes_impliquees: "Femmes enceintes, mères d'enfants de moins de 5 ans",
      objectifs: "Vérifier la vaccination, l'utilisation de la MILDA et le dépistage de la malnutrition"
    },
    {
      jour_semaine: "Mercredi",
      activite: "Séance de sensibilisation communautaire IEC / CCC",
      lieu: "Place publique ou centre de santé",
      personnes_impliquees: "Chefs de ménage, leaders communautaires, groupements de femmes",
      objectifs: "Sensibilisation sur l'hygiène de l'eau, le lavage des mains et la prévention du paludisme"
    },
    {
      jour_semaine: "Jeudi",
      activite: "Prise en charge intégrée communautaire (iCCM) et suivi des cas référés",
      lieu: "Poste de santé communautaire",
      personnes_impliquees: "Enfants fébriles, personnes présentant des symptômes",
      objectifs: "Réaliser les TDR paludisme, administrer les CTA et référer les cas de danger"
    },
    {
      jour_semaine: "Vendredi",
      activite: "Réunion hebdomadaire de coordination avec les RC et consolidation des données",
      lieu: "Bureau de l'arrondissement",
      personnes_impliquees: "Tous les Relais Communautaires de l'aire",
      objectifs: "Faire le point des activités, résoudre les difficultés et préparer le rapport hebdo PNSC"
    }
  ]);

  const [signatureTactile, setSignatureTactile] = useState<string | null>(null);
  const [statutPlanning, setStatutPlanning] = useState<"BROUILLON" | "VALIDE">("BROUILLON");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/connexion"); return; }

      const { data: profil } = await supabase.from("utilisateurs").select("*").eq("id", user.id).single();
      setCurrentUser(profil);

      // Charger l'historique des plannings hebdomadaires
      try {
        const { data: plannings } = await supabase
          .from("plannings_ascq")
          .select("*, lignes_planning_ascq(*)")
          .order("annee", { ascending: false })
          .order("semaine", { ascending: false });

        setHistoriquePlannings(plannings || []);

        // Chercher le planning existant pour cette semaine et année
        const existant = plannings?.find((p) => (p.semaine === semaine || p.mois === Math.ceil(semaine / 4.3)) && p.annee === annee);
        if (existant) {
          setTitre(existant.titre || `Planning hebdomadaire — Semaine ${semaine} (${annee})`);
          setStatutPlanning(existant.statut || "BROUILLON");
          if (existant.lignes_planning_ascq && existant.lignes_planning_ascq.length > 0) {
            setLignes(existant.lignes_planning_ascq.map((l: any) => ({
              jour_semaine: l.jour_semaine || l.periode || "Lundi",
              activite: l.activite,
              lieu: l.lieu,
              personnes_impliquees: l.personnes_impliquees || "",
              objectifs: l.objectifs || "",
            })));
          }
          if (existant.signature_tactile) {
            setSignatureTactile(existant.signature_tactile);
          }
        }
      } catch (errDb) {
        // Fallback localStorage
        const localKey = `planning_hebdo_${user.id}_${annee}_${semaine}`;
        const localData = localStorage.getItem(localKey);
        if (localData) {
          const parsed = JSON.parse(localData);
          setTitre(parsed.titre);
          setLignes(parsed.lignes || []);
          setSignatureTactile(parsed.signature_tactile || null);
          setStatutPlanning(parsed.statut || "BROUILLON");
        }
      }

    } catch (err) {
      console.error("Erreur chargement plannings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTitre(`Planning hebdomadaire — Semaine ${semaine} (${annee})`);
    chargerDonnees();
  }, [semaine, annee]);

  const ajouterLigne = () => {
    setLignes([
      ...lignes,
      { jour_semaine: "Lundi", activite: "", lieu: "", personnes_impliquees: "", objectifs: "" }
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
      if (valider && !signatureTactile) throw new Error("La signature tactile de l'ASCQ est requise pour valider officiellement le planning.");

      const payload = {
        ascq_id: currentUser.id,
        semaine,
        annee,
        mois: Math.ceil(semaine / 4.3) || 1,
        titre: titre.trim(),
        statut: valider ? "VALIDE" : "BROUILLON",
        date_debut: dates.debut,
        date_fin: dates.fin,
        date_validation: valider ? new Date().toISOString() : null,
        signature_tactile: signatureTactile,
        updated_at: new Date().toISOString(),
      };

      try {
        // Enregistrement dans plannings_ascq
        const { data: planningEnregistre, error } = await supabase
          .from("plannings_ascq")
          .upsert(payload, { onConflict: "ascq_id,annee,semaine" })
          .select("id")
          .single();

        if (error) {
          // Essai avec l'ancienne contrainte si pas encore migrée
          await supabase.from("plannings_ascq").upsert({
            ...payload,
            mois: Math.min(12, Math.max(1, Math.ceil(semaine / 4.3))),
          }, { onConflict: "ascq_id,mois,annee" });
        }

        // Si ID récupéré, enregistrer les lignes
        if (planningEnregistre?.id) {
          await supabase.from("lignes_planning_ascq").delete().eq("planning_id", planningEnregistre.id);
          const lignesAInserer = lignesValides.map((l, idx) => ({
            planning_id: planningEnregistre.id,
            ordre: idx + 1,
            periode: l.jour_semaine,
            jour_semaine: l.jour_semaine,
            activite: l.activite,
            lieu: l.lieu,
            personnes_impliquees: l.personnes_impliquees,
            objectifs: l.objectifs,
          }));
          await supabase.from("lignes_planning_ascq").insert(lignesAInserer);
        }
      } catch (eDb) {
        // Fallback localStorage sécurisé
        const localKey = `planning_hebdo_${currentUser.id}_${annee}_${semaine}`;
        localStorage.setItem(localKey, JSON.stringify({
          ...payload,
          lignes: lignesValides,
        }));
      }

      setStatutPlanning(valider ? "VALIDE" : "BROUILLON");
      setMessage({
        text: valider ? "Planning hebdomadaire validé et signé avec succès !" : "Planning sauvegardé en brouillon.",
        error: false,
      });

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
          <p className="text-xs font-semibold">Chargement du planning hebdomadaire...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-28 print:bg-white print:p-0">
      
      {/* Barre de navigation officielle */}
      <div className="print:hidden">
        <AscqNav userProfile={currentUser} />
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-4 print:p-0 print:max-w-none">
        
        {/* En-tête officiel imprimable */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3 print:border-none print:shadow-none print:p-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-[#005c30] print:hidden">
                  Planning Hebdomadaire
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider print:hidden ${
                  statutPlanning === "VALIDE" ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-900"
                }`}>
                  {statutPlanning === "VALIDE" ? "Validé & Signé" : "Brouillon"}
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 mt-1">
                Planning Hebdomadaire des Activités de l'ASCQ
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

          {/* Sélecteurs Semaine & Année */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 print:hidden text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Semaine Épidémiologique</label>
              <select
                value={semaine}
                onChange={(e) => setSemaine(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s}>
                    Semaine {s} {s === getSemaineActuelle() ? "(Cette semaine)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Année</label>
              <input
                type="number"
                value={annee}
                onChange={(e) => setAnnee(parseInt(e.target.value) || anneeActuelle)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Période calculée</label>
              <div className="px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-700 bg-slate-50 truncate">
                {dates.label}
              </div>
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="font-bold text-slate-700">Intitulé du planning</label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="hidden print:block text-xs space-y-1 pt-2">
            <p><strong>Période hebdomadaire :</strong> Semaine {semaine} ({dates.label})</p>
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

        {/* Tableau des activités planifiées par jour de la semaine */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 print:border-none print:p-0">
          <div className="flex items-center justify-between print:hidden">
            <div>
              <h2 className="font-extrabold text-sm text-slate-900">
                Activités Hebdomadaires Programmées ({lignes.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Programmez vos interventions par jour de la semaine (Lundi au Samedi).
              </p>
            </div>
            <button
              type="button"
              onClick={ajouterLigne}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter une ligne</span>
            </button>
          </div>

          <div className="space-y-3">
            {lignes.map((l, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5 relative group print:bg-white print:border-b print:border-slate-300 print:rounded-none"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#005c30] text-xs font-extrabold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <select
                      value={l.jour_semaine}
                      onChange={(e) => updateLigne(idx, "jour_semaine", e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                    >
                      {JOURS_SEMAINE.map((j) => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>

                  {lignes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => supprimerLigne(idx)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors print:hidden"
                      title="Supprimer cette ligne"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-bold text-slate-700">Activité planifiée *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Supervision RC, Visites à domicile, Dépistage malnutrition..."
                      value={l.activite}
                      onChange={(e) => updateLigne(idx, "activite", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Lieu d'intervention (Village / Hameau)</label>
                    <input
                      type="text"
                      placeholder="Ex: Village Danji, Quartier Tokpa"
                      value={l.lieu}
                      onChange={(e) => updateLigne(idx, "lieu", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Personnes / Cibles impliquées</label>
                    <input
                      type="text"
                      placeholder="Ex: Relais, Mères d'enfants, Ménages"
                      value={l.personnes_impliquees}
                      onChange={(e) => updateLigne(idx, "personnes_impliquees", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-bold text-slate-700">Objectifs / Résultats attendus</label>
                    <input
                      type="text"
                      placeholder="Ex: Contrôler 10 registres, dépister 20 enfants, sensibiliser 15 ménages"
                      value={l.objectifs}
                      onChange={(e) => updateLigne(idx, "objectifs", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-center print:hidden">
            <button
              type="button"
              onClick={ajouterLigne}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-emerald-400 text-[#005c30] text-xs font-bold hover:bg-emerald-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une autre activité pour cette semaine</span>
            </button>
          </div>
        </div>

        {/* Signature tactile exclusive de l'ASCQ */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
          <h2 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
            Signature & Engagement de l'ASCQ
          </h2>
          <p className="text-xs text-slate-500">
            En apposant votre signature tactile, vous certifiez l'exactitude de votre programmation d'activités hebdomadaire.
          </p>

          <div className="max-w-md mx-auto pt-2">
            <SignatureCanvas
              defaultValue={signatureTactile}
              onSignatureChange={(sig) => setSignatureTactile(sig)}
            />
          </div>
        </div>

        {/* Boutons de soumission */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 print:hidden">
          <button
            type="button"
            disabled={submitting}
            onClick={() => enregistrerPlanning(false)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>Enregistrer en brouillon</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => enregistrerPlanning(true)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
            <span>Valider & Signer le planning hebdomadaire</span>
          </button>
        </div>

      </main>
    </div>
  );
}
