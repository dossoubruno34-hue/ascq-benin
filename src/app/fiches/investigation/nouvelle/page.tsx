"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, 
  Search, 
  MapPin, 
  Calendar, 
  Send, 
  Check, 
  AlertTriangle, 
  Activity,
  Users,
  CheckCircle2,
  XCircle,
  Printer,
  Download
} from "lucide-react";
import SignatureCanvas from "@/components/SignatureCanvas";
import { TYPES_ALERTES_OFFICIELS, getEpidemiologicalWeek } from "@/lib/fiches";
import { exporterFicheSurveillanceIndividuelleExcel } from "@/lib/excelExport";

export const dynamic = "force-dynamic";

function NouvelleInvestigationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const alerteIdParam = searchParams.get("alerte_id");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  // Profil & géographie
  const [userProfile, setUserProfile] = useState<any>(null);
  const [alertesDisponibles, setAlertesDisponibles] = useState<any[]>([]);
  const [departements, setDepartements] = useState<any[]>([]);
  const [communes, setCommunes] = useState<any[]>([]);
  const [arrondissements, setArrondissements] = useState<any[]>([]);

  // Champs de l'investigation
  const todayStr = new Date().toISOString().split("T")[0];
  const [alerteId, setAlerteId] = useState<string>(alerteIdParam || "");
  const [dateSurvenue, setDateSurvenue] = useState(todayStr);
  const [dateNotification, setDateNotification] = useState(todayStr);
  const [dateInvestigation, setDateInvestigation] = useState(todayStr);

  const [departementId, setDepartementId] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [arrondissementId, setArrondissementId] = useState("");
  const [villageNom, setVillageNom] = useState("");
  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null);
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null);

  const [typeAlerteCode, setTypeAlerteCode] = useState<number>(1);
  const [evenementAvere, setEvenementAvere] = useState<boolean>(true);
  const [sourceInformation, setSourceInformation] = useState<string>("RELAIS");
  const [descriptionEvenement, setDescriptionEvenement] = useState("");
  const [circonstancesDetails, setCirconstancesDetails] = useState("");

  // Ventilation des CAS (8 tranches)
  const [cas0_11m_m, setCas0_11m_m] = useState<number>(0);
  const [cas0_11m_f, setCas0_11m_f] = useState<number>(0);
  const [cas1_5a_m, setCas1_5a_m] = useState<number>(0);
  const [cas1_5a_f, setCas1_5a_f] = useState<number>(0);
  const [cas6_15a_m, setCas6_15a_m] = useState<number>(0);
  const [cas6_15a_f, setCas6_15a_f] = useState<number>(0);
  const [casPlus15a_m, setCasPlus15a_m] = useState<number>(0);
  const [casPlus15a_f, setCasPlus15a_f] = useState<number>(0);

  // Ventilation des DÉCÈS (8 tranches)
  const [deces0_11m_m, setDeces0_11m_m] = useState<number>(0);
  const [deces0_11m_f, setDeces0_11m_f] = useState<number>(0);
  const [deces1_5a_m, setDeces1_5a_m] = useState<number>(0);
  const [deces1_5a_f, setDeces1_5a_f] = useState<number>(0);
  const [deces6_15a_m, setDeces6_15a_m] = useState<number>(0);
  const [deces6_15a_f, setDeces6_15a_f] = useState<number>(0);
  const [decesPlus15a_m, setDecesPlus15a_m] = useState<number>(0);
  const [decesPlus15a_f, setDecesPlus15a_f] = useState<number>(0);

  // Totaux calculés
  const totalCas = cas0_11m_m + cas0_11m_f + cas1_5a_m + cas1_5a_f + cas6_15a_m + cas6_15a_f + casPlus15a_m + casPlus15a_f;
  const totalDeces = deces0_11m_m + deces0_11m_f + deces1_5a_m + deces1_5a_f + deces6_15a_m + deces6_15a_f + decesPlus15a_m + decesPlus15a_f;

  const [syntheseActions, setSyntheseActions] = useState("");
  const [relaisNom, setRelaisNom] = useState("");
  const [relaisTelephone, setRelaisTelephone] = useState("");
  const [signatureTactile, setSignatureTactile] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/connexion"); return; }

        const { data: profil } = await supabase.from("utilisateurs").select("*").eq("id", user.id).single();
        setUserProfile(profil);

        // Alertes récentes pour pré-remplissage
        const { data: alertes } = await supabase.from("alertes_communautaires").select("id, numero_alerte, type_alerte_nom, village_nom").limit(20);
        setAlertesDisponibles(alertes || []);

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
        console.error("Erreur init investigation:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const handleDepartementChange = async (depId: string) => {
    setDepartementId(depId);
    setCommuneId("");
    setArrondissementId("");
    if (!depId) { setCommunes([]); return; }
    const { data } = await supabase.from("communes").select("id, nom").eq("departement_id", depId).order("nom");
    setCommunes(data || []);
  };

  const handleCommuneChange = async (comId: string) => {
    setCommuneId(comId);
    setArrondissementId("");
    if (!comId) { setArrondissements([]); return; }
    const { data } = await supabase.from("arrondissements").select("id, nom").eq("commune_id", comId).order("nom");
    setArrondissements(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      if (!departementId || !communeId || !arrondissementId || !villageNom.trim()) {
        throw new Error("Veuillez renseigner la localisation complète.");
      }
      if (totalDeces > totalCas) {
        throw new Error("Le total des décès ne peut pas être supérieur au total des cas investigués.");
      }
      if (!signatureTactile) {
        throw new Error("La signature de l'investigateur est requise.");
      }

      const { data, error } = await supabase.rpc("creer_investigation", {
        p_alerte_id: alerteId || null,
        p_date_survenue: dateSurvenue,
        p_date_notification: dateNotification,
        p_date_investigation: dateInvestigation,
        p_departement_id: departementId,
        p_commune_id: communeId,
        p_arrondissement_id: arrondissementId,
        p_village_nom: villageNom.trim(),
        p_gps_latitude: gpsLatitude,
        p_gps_longitude: gpsLongitude,
        p_type_alerte_code: typeAlerteCode,
        p_evenement_avere: evenementAvere,
        p_source_information: sourceInformation,
        p_description_evenement: descriptionEvenement.trim() || null,
        p_circonstances_details: circonstancesDetails.trim() || null,
        p_cas_0_11m_m: cas0_11m_m, p_cas_0_11m_f: cas0_11m_f,
        p_cas_1_5a_m: cas1_5a_m, p_cas_1_5a_f: cas1_5a_f,
        p_cas_6_15a_m: cas6_15a_m, p_cas_6_15a_f: cas6_15a_f,
        p_cas_plus_15a_m: casPlus15a_m, p_cas_plus_15a_f: casPlus15a_f,
        p_deces_0_11m_m: deces0_11m_m, p_deces_0_11m_f: deces0_11m_f,
        p_deces_1_5a_m: deces1_5a_m, p_deces_1_5a_f: deces1_5a_f,
        p_deces_6_15a_m: deces6_15a_m, p_deces_6_15a_f: deces6_15a_f,
        p_deces_plus_15a_m: decesPlus15a_m, p_deces_plus_15a_f: decesPlus15a_f,
        p_synthese_actions: syntheseActions.trim() || null,
        p_relais_nom: relaisNom.trim() || null,
        p_relais_telephone: relaisTelephone.trim() || null,
        p_signature_tactile: signatureTactile,
      });

      if (error) throw error;
      setSuccessResult(data);

    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'enregistrement de l'investigation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (successResult) {
    const typeObj = TYPES_ALERTES_OFFICIELS.find((t) => t.code === typeAlerteCode);
    const ficheInvExport = {
      numero: successResult.numero_investigation,
      type: "INV",
      titre: `Investigation : ${typeObj?.nom || "Événement Sanitaire"}`,
      semaine: semaineEpidemio,
      annee: annee,
      date: dateInvestigation,
      village: villageNom,
      impact: `${totalCas} cas investigué(s) • ${totalDeces} décès`,
      notificateur: userProfile?.nom_complet || "Investigateur ASCQ",
      notificateurTel: userProfile?.telephone || "-",
      statut: evenementAvere ? "AVEREE" : "NON_AVEREE"
    };

    return (
      <div className="min-h-screen bg-[#f4f7f5] text-slate-800 p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center animate-bounce">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-mono font-extrabold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              {successResult.numero_investigation}
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 pt-2">
              Investigation Enregistrée !
            </h2>
            <p className="text-xs text-slate-500">
              La fiche officielle d'investigation a été clôturée et les indicateurs consolidés.
            </p>
          </div>

          {/* BOUTONS D'IMPRESSION & TÉLÉCHARGEMENT DIRECTS */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => window.print()}
              className="py-2.5 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer (A4)</span>
            </button>

            <button
              type="button"
              onClick={() => exporterFicheSurveillanceIndividuelleExcel(ficheInvExport)}
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
            <h1 className="text-sm font-extrabold">Investigation d'Événement</h1>
            <p className="text-[10px] text-white/80">Code INV- (ASCQ)</p>
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
          
          {/* Rattachement Alerte ou Autonome */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-sm text-slate-900">Origine de l'investigation</h2>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                Option B validée
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Alerte liée (facultatif)</label>
              <select
                value={alerteId}
                onChange={(e) => setAlerteId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
              >
                <option value="">Investigation autonome (sans alerte préalable)</option>
                {alertesDisponibles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.numero_alerte} - {a.type_alerte_nom} ({a.village_nom})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Localisation & Dates */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <h2 className="font-extrabold text-sm text-slate-900">Localisation & Dates</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Département *</label>
                <select
                  value={departementId}
                  onChange={(e) => handleDepartementChange(e.target.value)}
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
                  onChange={(e) => handleCommuneChange(e.target.value)}
                  disabled={!departementId}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white disabled:bg-slate-50"
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
                  disabled={!communeId}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white disabled:bg-slate-50"
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

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Date d'investigation *</label>
                <input
                  type="date"
                  value={dateInvestigation}
                  onChange={(e) => setDateInvestigation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Source d'information</label>
                <select
                  value={sourceInformation}
                  onChange={(e) => setSourceInformation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  <option value="RELAIS">Relais Communautaire</option>
                  <option value="COMMUNAUTE">Communauté / Population</option>
                  <option value="STRUCTURE_SANTE">Structure de santé</option>
                  <option value="RUMEUR">Rumeur / Signal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Diagnostic & Conclusion */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <h2 className="font-extrabold text-sm text-slate-900">Diagnostic & Confirmation</h2>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Maladie ou Événement suspecté *</label>
              <select
                value={typeAlerteCode}
                onChange={(e) => setTypeAlerteCode(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              >
                {TYPES_ALERTES_OFFICIELS.map((t) => (
                  <option key={t.code} value={t.code}>{t.nom}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-slate-700">L'événement est-il avéré ?</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEvenementAvere(true)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                    evenementAvere ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  Avéré
                </button>
                <button
                  type="button"
                  onClick={() => setEvenementAvere(false)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                    !evenementAvere ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  Non avéré
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Description des symptômes et circonstances</label>
              <textarea
                rows={2}
                placeholder="Description du début des cas, signes dominants..."
                value={descriptionEvenement}
                onChange={(e) => setDescriptionEvenement(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Grille de ventilation des 8 tranches d'âge / sexe */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-sm text-slate-900">Bilan des Cas & Décès par tranche d'âge</h2>
              <span className="text-xs font-extrabold text-[#005c30]">
                {totalCas} Cas • {totalDeces} Décès
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-2 text-left">Tranche d'âge</th>
                    <th className="p-2 bg-emerald-50/50 text-[#005c30]">Cas (M)</th>
                    <th className="p-2 bg-emerald-50/50 text-[#005c30]">Cas (F)</th>
                    <th className="p-2 bg-red-50/50 text-red-700">Décès (M)</th>
                    <th className="p-2 bg-red-50/50 text-red-700">Décès (F)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2 text-left font-medium">0 à 11 mois</td>
                    <td className="p-1"><input type="number" min={0} value={cas0_11m_m} onChange={(e) => setCas0_11m_m(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs" /></td>
                    <td className="p-1"><input type="number" min={0} value={cas0_11m_f} onChange={(e) => setCas0_11m_f(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs" /></td>
                    <td className="p-1"><input type="number" min={0} value={deces0_11m_m} onChange={(e) => setDeces0_11m_m(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs text-red-600" /></td>
                    <td className="p-1"><input type="number" min={0} value={deces0_11m_f} onChange={(e) => setDeces0_11m_f(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs text-red-600" /></td>
                  </tr>
                  <tr>
                    <td className="p-2 text-left font-medium">1 à 5 ans</td>
                    <td className="p-1"><input type="number" min={0} value={cas1_5a_m} onChange={(e) => setCas1_5a_m(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs" /></td>
                    <td className="p-1"><input type="number" min={0} value={cas1_5a_f} onChange={(e) => setCas1_5a_f(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs" /></td>
                    <td className="p-1"><input type="number" min={0} value={deces1_5a_m} onChange={(e) => setDeces1_5a_m(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs text-red-600" /></td>
                    <td className="p-1"><input type="number" min={0} value={deces1_5a_f} onChange={(e) => setDeces1_5a_f(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs text-red-600" /></td>
                  </tr>
                  <tr>
                    <td className="p-2 text-left font-medium">6 à 15 ans</td>
                    <td className="p-1"><input type="number" min={0} value={cas6_15a_m} onChange={(e) => setCas6_15a_m(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs" /></td>
                    <td className="p-1"><input type="number" min={0} value={cas6_15a_f} onChange={(e) => setCas6_15a_f(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs" /></td>
                    <td className="p-1"><input type="number" min={0} value={deces6_15a_m} onChange={(e) => setDeces6_15a_m(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs text-red-600" /></td>
                    <td className="p-1"><input type="number" min={0} value={deces6_15a_f} onChange={(e) => setDeces6_15a_f(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs text-red-600" /></td>
                  </tr>
                  <tr>
                    <td className="p-2 text-left font-medium">Plus de 15 ans</td>
                    <td className="p-1"><input type="number" min={0} value={casPlus15a_m} onChange={(e) => setCasPlus15a_m(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs" /></td>
                    <td className="p-1"><input type="number" min={0} value={casPlus15a_f} onChange={(e) => setCasPlus15a_f(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs" /></td>
                    <td className="p-1"><input type="number" min={0} value={decesPlus15a_m} onChange={(e) => setDecesPlus15a_m(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs text-red-600" /></td>
                    <td className="p-1"><input type="number" min={0} value={decesPlus15a_f} onChange={(e) => setDecesPlus15a_f(parseInt(e.target.value)||0)} className="w-12 p-1 border rounded text-center text-xs text-red-600" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Synthèse d'actions & Signature */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <h2 className="font-extrabold text-sm text-slate-900">Actions menées & Signature</h2>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Synthèse des actions menées sur le terrain</label>
              <textarea
                rows={2}
                placeholder="Ex: Prise en charge, chloration des puits, sensibilisation des ménages..."
                value={syntheseActions}
                onChange={(e) => setSyntheseActions(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <SignatureCanvas onSignatureChange={(sig) => setSignatureTactile(sig)} />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? "Enregistrement..." : (
              <>
                <Send className="w-4 h-4" />
                <span>Enregistrer la fiche d'investigation</span>
              </>
            )}
          </button>

        </form>
      </main>
    </div>
  );
}

export default function NouvelleInvestigationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center text-slate-600">
            <div className="w-8 h-8 border-3 border-[#005c30] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-semibold">Chargement de la fiche d'investigation...</p>
          </div>
        </div>
      }
    >
      <NouvelleInvestigationContent />
    </Suspense>
  );
}
