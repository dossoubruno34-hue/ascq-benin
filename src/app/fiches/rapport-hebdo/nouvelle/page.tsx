"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, 
  FileSpreadsheet, 
  MapPin, 
  Calendar, 
  Send, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw,
  Info,
  Printer,
  Download
} from "lucide-react";
import SignatureCanvas from "@/components/SignatureCanvas";
import { getEpidemiologicalWeek, calculerDatesSemaine } from "@/lib/fiches";
import { exporterFicheSurveillanceIndividuelleExcel } from "@/lib/excelExport";

export default function NouveauRapportHebdoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [preLoading, setPreLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  // Profil & géographie
  const [userProfile, setUserProfile] = useState<any>(null);
  const [departements, setDepartements] = useState<any[]>([]);
  const [communes, setCommunes] = useState<any[]>([]);
  const [arrondissements, setArrondissements] = useState<any[]>([]);

  // Semaine épidémiologique courante
  const epidemioNow = getEpidemiologicalWeek();
  const [annee, setAnnee] = useState<number>(epidemioNow.annee);
  const [semaine, setSemaine] = useState<number>(epidemioNow.semaine);

  const datesSemaine = calculerDatesSemaine(annee, semaine);
  const [dateDebut, setDateDebut] = useState(datesSemaine.dateDebut);
  const [dateFin, setDateFin] = useState(datesSemaine.dateFin);

  // Localisation
  const [departementId, setDepartementId] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [arrondissementId, setArrondissementId] = useState("");
  const [villageNom, setVillageNom] = useState("");

  // Synthèse Alertes
  const [alertesDetectees, setAlertesDetectees] = useState<number>(0);
  const [personnesTouchees, setPersonnesTouchees] = useState<number>(0);
  const [personnesDecedees, setPersonnesDecedees] = useState<number>(0);
  const [alertesVerifiees48h, setAlertesVerifiees48h] = useState<number>(0);
  const [alertesAverees, setAlertesAverees] = useState<number>(0);

  // Synthèse Décès
  const [decesMaternels, setDecesMaternels] = useState<number>(0);
  const [decesNeonatals, setDecesNeonatals] = useState<number>(0);
  const [decesInfantiles, setDecesInfantiles] = useState<number>(0);
  const [decesInfantoJuveniles, setDecesInfantoJuveniles] = useState<number>(0);
  const [decesPlus5Ans, setDecesPlus5Ans] = useState<number>(0);

  const [rapportZeroConfirme, setRapportZeroConfirme] = useState(false);
  const [actionsMenees, setActionsMenees] = useState("");
  const [difficultes, setDifficultes] = useState("");
  const [signatureTactile, setSignatureTactile] = useState<string | null>(null);

  // Mise à jour des dates quand la semaine change
  useEffect(() => {
    const d = calculerDatesSemaine(annee, semaine);
    setDateDebut(d.dateDebut);
    setDateFin(d.dateFin);
  }, [annee, semaine]);

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/connexion"); return; }

        const { data: profil } = await supabase.from("utilisateurs").select("*").eq("id", user.id).single();
        setUserProfile(profil);

        const { data: deps } = await supabase.from("departements").select("id, nom").order("nom");
        setDepartements(deps || []);

        if (profil?.departement_id) {
          setDepartementId(profil.departement_id);
          const { data: coms } = await supabase.from("communes").select("id, nom").eq("departement_id", profil.departement_id).order("nom");
          setCommunes(coms || []);

          if (profil?.commune_id) {
            setCommuneId(profil.commune_id);
            const { data: arrs } = await supabase.from("arrondissements").select("id, nom").eq("commune_id", profil.commune_id).order("nom");
            setArrondissements(arrs || []);

            if (profil?.arrondissement_id) {
              setArrondissementId(profil.arrondissement_id);
            }
          }
        }
      } catch (err) {
        console.error("Erreur init rapport hebdo:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  // Pré-remplissage automatique depuis la base Supabase
  const handlePreRemplissage = async () => {
    if (!villageNom.trim()) {
      alert("Veuillez d'abord saisir le nom du village pour calculer les données de surveillance.");
      return;
    }
    setPreLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase.rpc("generer_pre_remplissage_hebdo", {
        p_annee: annee,
        p_semaine: semaine,
        p_village_nom: villageNom.trim(),
      });

      if (error) throw error;

      if (data) {
        setAlertesDetectees(data.alertes_detectees || 0);
        setPersonnesTouchees(data.personnes_touchees || 0);
        setPersonnesDecedees(data.personnes_decedees || 0);
        setAlertesVerifiees48h(data.alertes_verifiees_48h || 0);
        setAlertesAverees(data.alertes_averees || 0);
        setDecesMaternels(data.deces_maternels || 0);
        setDecesNeonatals(data.deces_neonatals || 0);
        setDecesInfantiles(data.deces_infantiles || 0);
        setDecesInfantoJuveniles(data.deces_infanto_juveniles || 0);
        setDecesPlus5Ans(data.deces_plus_5_ans || 0);
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors du calcul du pré-remplissage.");
    } finally {
      setPreLoading(false);
    }
  };

  const isRapportZero = alertesDetectees === 0 && personnesTouchees === 0 && decesMaternels === 0 && decesNeonatals === 0 && decesInfantiles === 0 && decesInfantoJuveniles === 0 && decesPlus5Ans === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      if (!departementId || !communeId || !arrondissementId || !villageNom.trim()) {
        throw new Error("Veuillez renseigner la localisation complète.");
      }
      if (personnesDecedees > personnesTouchees) {
        throw new Error("Les personnes décédées ne peuvent pas dépasser les personnes touchées.");
      }
      if (alertesAverees > alertesVerifiees48h && alertesVerifiees48h > 0) {
        // Warning logic
      }
      if (decesNeonatals > decesInfantiles) {
        throw new Error("Le nombre de décès néonatals (0-28 j) ne peut pas dépasser le nombre de décès infantiles (< 1 an).");
      }
      if (decesInfantiles > decesInfantoJuveniles) {
        throw new Error("Le nombre de décès infantiles (< 1 an) ne peut pas dépasser le nombre de décès infanto-juvéniles (0-5 ans).");
      }
      if (isRapportZero && !rapportZeroConfirme) {
        throw new Error("Toutes les données sont à zéro. Veuillez cocher la confirmation explicite de « Rapport Zéro ».");
      }
      if (!signatureTactile) {
        throw new Error("La signature du rapporteur est requise.");
      }

      const { data, error } = await supabase.rpc("creer_rapport_hebdomadaire", {
        p_annee: annee,
        p_semaine: semaine,
        p_date_debut: dateDebut,
        p_date_fin: dateFin,
        p_departement_id: departementId,
        p_commune_id: communeId,
        p_arrondissement_id: arrondissementId,
        p_village_nom: villageNom.trim(),
        p_alertes_detectees: alertesDetectees,
        p_personnes_touchees: personnesTouchees,
        p_personnes_decedees: personnesDecedees,
        p_alertes_verifiees_48h: alertesVerifiees48h,
        p_alertes_averees: alertesAverees,
        p_deces_maternels: decesMaternels,
        p_deces_neonatals: decesNeonatals,
        p_deces_infantiles: decesInfantiles,
        p_deces_infanto_juveniles: decesInfantoJuveniles,
        p_deces_plus_5_ans: decesPlus5Ans,
        p_rapport_zero_confirme: rapportZeroConfirme,
        p_actions_menees: actionsMenees.trim() || null,
        p_difficultes: difficultes.trim() || null,
        p_signature_tactile: signatureTactile,
      });

      if (error) throw error;
      setSuccessResult(data);

    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de la soumission du rapport hebdomadaire.");
    } finally {
      setSubmitting(false);
    }
  };

  if (successResult) {
    const ficheRapExport = {
      numero: successResult.numero_rapport,
      type: "RAP",
      titre: `Rapport Hebdomadaire Semaine ${semaine} (${annee})`,
      semaine: semaine,
      annee: annee,
      date: dateDebut,
      village: villageNom,
      impact: `${alertesDetectees} alertes • ${decesMaternels + decesNeonatals + decesInfantiles + decesPlus5Ans} décès`,
      notificateur: userProfile?.nom_complet || "Rapporteur ASCQ",
      notificateurTel: userProfile?.telephone || "-",
      statut: "TRANSMIS"
    };

    return (
      <div className="min-h-screen bg-[#f4f7f5] text-slate-800 p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center animate-bounce">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-mono font-extrabold text-indigo-800 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              {successResult.numero_rapport}
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 pt-2">
              Rapport Hebdomadaire Transmis !
            </h2>
            <p className="text-xs text-slate-500">
              Le rapport de la Semaine {semaine} ({annee}) a été validé et intégré aux statistiques nationales.
            </p>
          </div>

          {/* BOUTONS D'IMPRESSION & TÉLÉCHARGEMENT DIRECTS */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => window.print()}
              className="py-2.5 px-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs border border-indigo-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer (A4)</span>
            </button>

            <button
              type="button"
              onClick={() => exporterFicheSurveillanceIndividuelleExcel(ficheRapExport)}
              className="py-2.5 px-3 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger Excel</span>
            </button>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/fiches/nouvelle"
              className="w-full py-3 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-md active:scale-95 transition-all text-center"
            >
              Ajouter une autre fiche
            </Link>
            <Link
              href="/fiches"
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all text-center"
            >
              Retour à la liste des fiches
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-24">
      <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/fiches/nouvelle" className="flex items-center gap-2 text-white/90 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold">Retour</span>
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-extrabold">Rapport Hebdomadaire</h1>
            <p className="text-[10px] text-white/80">Semaine {semaine} / {annee} (RAP-)</p>
          </div>
          <div className="w-10"></div>
        </div>
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-4">
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Semaine épidémiologique & Dates */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#005c30]">
                <Calendar className="w-5 h-5" />
                <h2 className="font-extrabold text-sm text-slate-900">Semaine Épidémiologique</h2>
              </div>
              <span className="text-[11px] font-black text-[#005c30] bg-emerald-50 px-2 py-0.5 rounded-lg">
                Norme Lundi
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Année</label>
                <input
                  type="number"
                  value={annee}
                  onChange={(e) => setAnnee(parseInt(e.target.value) || 2026)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Semaine (1 à 53)</label>
                <input
                  type="number"
                  min={1}
                  max={53}
                  value={semaine}
                  onChange={(e) => setSemaine(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Période :</span>
              <strong className="text-slate-800">Du lundi {dateDebut} au dimanche {dateFin}</strong>
            </div>
          </div>

          {/* Localisation & Bouton Pré-remplissage */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <h2 className="font-extrabold text-sm text-slate-900">Localisation du rapport</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Département *</label>
                <select
                  value={departementId}
                  onChange={(e) => setDepartementId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="">Sélectionner</option>
                  {departements.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Commune *</label>
                <select
                  value={communeId}
                  onChange={(e) => setCommuneId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="">Sélectionner</option>
                  {communes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Arrondissement *</label>
                <select
                  value={arrondissementId}
                  onChange={(e) => setArrondissementId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="">Sélectionner</option>
                  {arrondissements.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Village / Quartier *</label>
                <input
                  type="text"
                  placeholder="Nom du village"
                  value={villageNom}
                  onChange={(e) => setVillageNom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>
            </div>

            {/* Bouton Magique : Pré-remplir */}
            <button
              type="button"
              onClick={handlePreRemplissage}
              disabled={preLoading}
              className="w-full py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] text-xs font-bold border border-emerald-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {preLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#005c30]" />
              ) : (
                <Sparkles className="w-4 h-4 text-emerald-600" />
              )}
              <span>Pré-remplir automatiquement depuis les alertes et décès enregistrés</span>
            </button>
          </div>

          {/* Synthèse des Alertes */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <h2 className="font-extrabold text-sm text-slate-900">1. Synthèse des Alertes de la semaine</h2>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <label className="text-[10px] font-bold text-slate-500 block">Alertes détectées</label>
                <input type="number" min={0} value={alertesDetectees} onChange={(e) => setAlertesDetectees(parseInt(e.target.value)||0)} className="w-full p-1 text-center font-bold text-xs" />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <label className="text-[10px] font-bold text-slate-500 block">Personnes touchées</label>
                <input type="number" min={0} value={personnesTouchees} onChange={(e) => setPersonnesTouchees(parseInt(e.target.value)||0)} className="w-full p-1 text-center font-bold text-xs" />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <label className="text-[10px] font-bold text-slate-500 block">Décès liés</label>
                <input type="number" min={0} value={personnesDecedees} onChange={(e) => setPersonnesDecedees(parseInt(e.target.value)||0)} className="w-full p-1 text-center font-bold text-xs text-red-600" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <label className="text-[10px] font-bold text-slate-500 block">Vérifiées en 24-48 h</label>
                <input type="number" min={0} value={alertesVerifiees48h} onChange={(e) => setAlertesVerifiees48h(parseInt(e.target.value)||0)} className="w-full p-1 text-center font-bold text-xs" />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <label className="text-[10px] font-bold text-slate-500 block">Alertes avérées</label>
                <input type="number" min={0} value={alertesAverees} onChange={(e) => setAlertesAverees(parseInt(e.target.value)||0)} className="w-full p-1 text-center font-bold text-xs text-[#005c30]" />
              </div>
            </div>
          </div>

          {/* Synthèse des Décès Communautaires */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <h2 className="font-extrabold text-sm text-slate-900">2. Synthèse des Décès Communautaires</h2>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-pink-50/50 rounded-xl border border-pink-100 flex items-center justify-between">
                <span className="font-bold text-pink-950">Décès maternels</span>
                <input type="number" min={0} value={decesMaternels} onChange={(e) => setDecesMaternels(parseInt(e.target.value)||0)} className="w-14 p-1 text-center font-bold rounded border bg-white" />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-700">Néonatals (0-28 j)</span>
                <input type="number" min={0} value={decesNeonatals} onChange={(e) => setDecesNeonatals(parseInt(e.target.value)||0)} className="w-14 p-1 text-center font-bold rounded border bg-white" />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-700">Infantiles (&lt; 1 an)</span>
                <input type="number" min={0} value={decesInfantiles} onChange={(e) => setDecesInfantiles(parseInt(e.target.value)||0)} className="w-14 p-1 text-center font-bold rounded border bg-white" />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-700">0 à 5 ans</span>
                <input type="number" min={0} value={decesInfantoJuveniles} onChange={(e) => setDecesInfantoJuveniles(parseInt(e.target.value)||0)} className="w-14 p-1 text-center font-bold rounded border bg-white" />
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs pt-1">
              <span className="font-bold text-slate-700">Décès ≥ 5 ans (hors maternels)</span>
              <input type="number" min={0} value={decesPlus5Ans} onChange={(e) => setDecesPlus5Ans(parseInt(e.target.value)||0)} className="w-14 p-1 text-center font-bold rounded border bg-white" />
            </div>
          </div>

          {/* Rapport Zéro si tout est à zéro */}
          {isRapportZero && (
            <div className="p-4 bg-amber-50 rounded-3xl border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Info className="w-4 h-4 text-amber-600" />
                <span>Rapport de surveillance « Zéro » détecté</span>
              </div>
              <label className="flex items-start gap-2 text-xs text-amber-950 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={rapportZeroConfirme}
                  onChange={(e) => setRapportZeroConfirme(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 mt-0.5"
                />
                <span>Je confirme expressément qu'aucune alerte ni aucun décès communautaire n'a été enregistré cette semaine dans ce village.</span>
              </label>
            </div>
          )}

          {/* Signature */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="font-extrabold text-sm text-slate-900">Signature officielle du rapporteur (ASCQ)</h2>
            <SignatureCanvas onSignatureChange={(sig) => setSignatureTactile(sig)} />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? "Transmission en cours..." : (
              <>
                <Send className="w-4 h-4" />
                <span>Soumettre le rapport hebdomadaire officiel</span>
              </>
            )}
          </button>

        </form>
      </main>
    </div>
  );
}
