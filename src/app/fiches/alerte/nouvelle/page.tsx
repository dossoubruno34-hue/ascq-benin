"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, 
  Check, 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  User, 
  Calendar, 
  Clock, 
  FileCheck, 
  Activity, 
  ShieldAlert, 
  Save, 
  Send, 
  Flame, 
  Info,
  CheckCircle2,
  Lock,
  Printer,
  Download
} from "lucide-react";
import SignatureCanvas from "@/components/SignatureCanvas";
import GpsLocationCapture from "@/components/GpsLocationCapture";
import { exporterFicheSurveillanceIndividuelleExcel } from "@/lib/excelExport";
import { 
  TYPES_ALERTES_OFFICIELS, 
  SYMPTOMES_OFFICIELS, 
  getEpidemiologicalWeek, 
  calculateHoursDelay,
  sauvegarderBrouillonAlerte,
  recupererBrouillonsAlertes,
  supprimerBrouillonAlerte
} from "@/lib/fiches";

export default function NouvelleAlertePage() {
  const router = useRouter();

  // Étape active (1 à 4)
  const [etape, setEtape] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  // Profil utilisateur
  const [userProfile, setUserProfile] = useState<any>(null);

  // Référentiel géographique
  const [departements, setDepartements] = useState<any[]>([]);
  const [communes, setCommunes] = useState<any[]>([]);
  const [arrondissements, setArrondissements] = useState<any[]>([]);

  // -------------------------------------------------------------
  // Données du formulaire
  // -------------------------------------------------------------
  // Étape 1 : Localisation & Patient
  const [departementId, setDepartementId] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [arrondissementId, setArrondissementId] = useState("");
  const [villageNom, setVillageNom] = useState("");
  const [numeroGrappe, setNumeroGrappe] = useState<number | string>(1);
  const [nomGrappe, setNomGrappe] = useState("");
  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null);
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>("");

  // Patient / Cas index
  const [npiCas, setNpiCas] = useState("");
  const [nomCas, setNomCas] = useState("");
  const [prenomsCas, setPrenomsCas] = useState("");
  const [telephoneCas, setTelephoneCas] = useState("");
  const [adresseCas, setAdresseCas] = useState("");
  const [sexe, setSexe] = useState<"M" | "F">("M");
  const [ageValeur, setAgeValeur] = useState<number | string>(5);
  const [ageUnite, setAgeUnite] = useState<"ANS" | "MOIS" | "JOURS">("ANS");

  // Étape 2 : Événement sanitaire & Symptômes
  const [typeAlerteCode, setTypeAlerteCode] = useState<number>(1); // 1 = Rougeole par défaut
  const [autreEvenementPrecision, setAutreEvenementPrecision] = useState("");
  const [symptomesCodes, setSymptomesCodes] = useState<number[]>([]);
  const [autreSymptomePrecision, setAutreSymptomePrecision] = useState("");

  // Étape 3 : Bilan d'impact & Chronologie
  const todayStr = new Date().toISOString().split("T")[0];
  const nowTimeStr = new Date().toTimeString().slice(0, 5);

  const [dateNotification, setDateNotification] = useState(todayStr);
  const [dateDebutMaladie, setDateDebutMaladie] = useState(todayStr);
  const [heureSurvenue, setHeureSurvenue] = useState("08:00");
  const [dateDetection, setDateDetection] = useState(todayStr);
  const [heureDetection, setHeureDetection] = useState("10:00");

  const [nbPersonnesTouchees, setNbPersonnesTouchees] = useState<number | string>(1);
  const [nbPersonnesMortes, setNbPersonnesMortes] = useState<number | string>(0);
  const [nbAnimauxMalades, setNbAnimauxMalades] = useState<number | string>(0);
  const [nbAnimauxMorts, setNbAnimauxMorts] = useState<number | string>(0);
  const [animauxImpliques, setAnimauxImpliques] = useState(false);
  const [evenementEnCours, setEvenementEnCours] = useState(true);
  const [mesuresPrises, setMesuresPrises] = useState("");

  // Étape 4 : Notificateur & Signature
  const [signatureTactile, setSignatureTactile] = useState<string | null>(null);

  // Semaine épidémiologique calculée
  const epidemio = getEpidemiologicalWeek(dateNotification);
  const delaiHeures = calculateHoursDelay(dateDetection, heureDetection, dateNotification, "12:00");

  const selectedTypeObj = TYPES_ALERTES_OFFICIELS.find((t) => t.code === typeAlerteCode);
  const isAlertePrioritaire = selectedTypeObj?.estPrioritaire ?? false;

  // -------------------------------------------------------------
  // Initialisation et chargement des données
  // -------------------------------------------------------------
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/connexion");
          return;
        }

        // Profil connecté
        const { data: profil } = await supabase
          .from("utilisateurs")
          .select("*")
          .eq("id", user.id)
          .single();
        setUserProfile(profil);

        // Départements
        const { data: deps } = await supabase
          .from("departements")
          .select("id, nom")
          .order("nom");
        setDepartements(deps || []);

        // Pré-remplissage géographique selon le profil
        if (profil?.departement_id) {
          setDepartementId(profil.departement_id);
          // Communes du département
          const { data: coms } = await supabase
            .from("communes")
            .select("id, nom")
            .eq("departement_id", profil.departement_id)
            .order("nom");
          setCommunes(coms || []);

          if (profil?.commune_id) {
            setCommuneId(profil.commune_id);
            // Arrondissements
            const { data: arrs } = await supabase
              .from("arrondissements")
              .select("id, nom")
              .eq("commune_id", profil.commune_id)
              .order("nom");
            setArrondissements(arrs || []);

            if (profil?.arrondissement_id) {
              setArrondissementId(profil.arrondissement_id);
            }
          }
        }

        // Vérifier si un brouillon existe
        const drafts = recupererBrouillonsAlertes();
        if (drafts.length > 0) {
          const latest = drafts[0].data;
          if (latest.nomCas) setNomCas(latest.nomCas);
          if (latest.prenomsCas) setPrenomsCas(latest.prenomsCas);
          if (latest.villageNom) setVillageNom(latest.villageNom);
          if (latest.typeAlerteCode) setTypeAlerteCode(latest.typeAlerteCode);
        }

      } catch (err) {
        console.error("Erreur init alerte:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  // Chargement en cascade des communes
  const handleDepartementChange = async (depId: string) => {
    setDepartementId(depId);
    setCommuneId("");
    setArrondissementId("");
    setArrondissements([]);
    if (!depId) {
      setCommunes([]);
      return;
    }
    const { data } = await supabase
      .from("communes")
      .select("id, nom")
      .eq("departement_id", depId)
      .order("nom");
    setCommunes(data || []);
  };

  // Chargement en cascade des arrondissements
  const handleCommuneChange = async (comId: string) => {
    setCommuneId(comId);
    setArrondissementId("");
    if (!comId) {
      setArrondissements([]);
      return;
    }
    const { data } = await supabase
      .from("arrondissements")
      .select("id, nom")
      .eq("commune_id", comId)
      .order("nom");
    setArrondissements(data || []);
  };

  // Géolocalisation GPS du téléphone
  const detecterGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setGpsStatus("Recherche des coordonnées GPS en cours...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLatitude(Math.round(pos.coords.latitude * 1000000) / 1000000);
        setGpsLongitude(Math.round(pos.coords.longitude * 1000000) / 1000000);
        setGpsStatus("Position GPS capturée avec succès.");
      },
      (err) => {
        setGpsStatus(`Impossible d'obtenir la position GPS (${err.message}).`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Gestion des cases symptômes
  const toggleSymptome = (code: number) => {
    setSymptomesCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Enregistrer comme brouillon local
  const sauvegarderBrouillon = () => {
    const payload = {
      departementId,
      communeId,
      arrondissementId,
      villageNom,
      nomCas,
      prenomsCas,
      telephoneCas,
      sexe,
      ageValeur,
      ageUnite,
      typeAlerteCode,
      symptomesCodes,
      nbPersonnesTouchees,
      nbPersonnesMortes,
    };
    sauvegarderBrouillonAlerte(payload);
    alert("Brouillon sauvegardé localement sur cet appareil !");
  };

  // Soumission finale de l'alerte
  const soumettreAlerte = async () => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      // Validations obligatoires
      if (!departementId || !communeId || !arrondissementId || !villageNom.trim()) {
        throw new Error("Veuillez renseigner la localisation complète (Département, Commune, Arrondissement, Village).");
      }
      if (!nomCas.trim() || !prenomsCas.trim()) {
        throw new Error("Le nom et le prénom du cas index sont obligatoires.");
      }
      if (!typeAlerteCode) {
        throw new Error("Veuillez sélectionner le type d'alerte.");
      }
      if (typeAlerteCode === 20 && !autreEvenementPrecision.trim()) {
        throw new Error("Veuillez préciser la nature de l'événement inhabituel (Code 20).");
      }
      if (!signatureTactile) {
        throw new Error("La signature du notificateur est obligatoire avant la transmission.");
      }

      // Appel de la RPC Supabase `creer_notification_alerte`
      const { data, error } = await supabase.rpc("creer_notification_alerte", {
        p_date_notification: dateNotification,
        p_date_debut_maladie: dateDebutMaladie || dateNotification,
        p_heure_survenue: heureSurvenue || "08:00",
        p_date_detection: dateDetection || dateNotification,
        p_heure_detection: heureDetection || "10:00",
        p_departement_id: departementId,
        p_zone_sanitaire_id: null,
        p_commune_id: communeId,
        p_arrondissement_id: arrondissementId,
        p_village_id: null,
        p_village_nom: villageNom.trim(),
        p_numero_grappe: Number(numeroGrappe) || 1,
        p_nom_grappe: nomGrappe.trim() || null,
        p_gps_latitude: gpsLatitude,
        p_gps_longitude: gpsLongitude,
        p_type_alerte_code: typeAlerteCode,
        p_autre_evenement_precision: autreEvenementPrecision.trim() || null,
        p_symptomes_codes: symptomesCodes,
        p_autre_symptome_precision: autreSymptomePrecision.trim() || null,
        p_nb_personnes_touchees: Math.max(1, Number(nbPersonnesTouchees) || 1),
        p_nb_personnes_mortes: Number(nbPersonnesMortes) || 0,
        p_nb_animaux_malades: Number(nbAnimauxMalades) || 0,
        p_nb_animaux_morts: Number(nbAnimauxMorts) || 0,
        p_evenement_en_cours: evenementEnCours,
        p_mesures_prises: mesuresPrises.trim() || null,
        p_sexe: sexe,
        p_age_valeur: Number(ageValeur) || 0,
        p_age_unite: ageUnite,
        p_signature_tactile: signatureTactile,
        p_npi_cas: npiCas.trim() || null,
        p_nom_cas: nomCas.trim(),
        p_prenoms_cas: prenomsCas.trim(),
        p_telephone_cas: telephoneCas.trim() || null,
        p_adresse_cas: adresseCas.trim() || null,
        p_date_naissance_cas: null,
      });

      if (error) throw error;

      // Nettoyer les brouillons
      const drafts = recupererBrouillonsAlertes();
      if (drafts.length > 0) {
        supprimerBrouillonAlerte(drafts[0].localId);
      }

      setSuccessResult(data);

    } catch (err: any) {
      console.error("Erreur soumission alerte:", err);
      setErrorMessage(err.message || "Une erreur est survenue lors de l'enregistrement de l'alerte.");
    } finally {
      setSubmitting(false);
    }
  };

  // Écran de succès
  if (successResult) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] text-slate-800 p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-[#005c30] flex items-center justify-center animate-bounce">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-mono font-extrabold text-[#005c30] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              {successResult.numero_alerte}
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 pt-2">
              Alerte Sanitaire Notifiée !
            </h2>
            <p className="text-xs text-slate-500">
              {successResult.message}
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Semaine épidémiologique :</span>
              <strong className="text-slate-700">Semaine {successResult.semaine_epidemio} / {successResult.annee}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Statut :</span>
              <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">En attente de vérification</span>
            </div>
            {successResult.est_prioritaire && (
              <div className="p-2 rounded-xl bg-red-50 text-red-700 font-bold flex items-center gap-2">
                <Flame className="w-4 h-4 shrink-0 text-red-600" />
                <span>Alerte à potentiel épidémique prioritaire transmise d'urgence.</span>
              </div>
            )}
          </div>

          {/* BOUTONS D'IMPRESSION & TÉLÉCHARGEMENT DIRECTS */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => window.print()}
              className="py-2.5 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-bold text-xs border border-emerald-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer (A4)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const ficheAlrExport = {
                  numero: successResult.numero_alerte,
                  type: "ALR",
                  titre: `Alerte Épidémiologique SIMR`,
                  semaine: successResult.semaine_epidemio,
                  annee: successResult.annee,
                  date: new Date().toISOString().split("T")[0],
                  village: villageNom,
                  impact: `${nbPersonnesTouchees} touché(s) • ${nbPersonnesMortes} décès`,
                  estPrioritaire: successResult.est_prioritaire,
                  notificateur: userProfile?.nom_complet || "ASCQ Déclarant",
                  notificateurTel: userProfile?.telephone || "-",
                  statut: "EN_ATTENTE"
                };
                exporterFicheSurveillanceIndividuelleExcel(ficheAlrExport);
              }}
              className="py-2.5 px-3 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger Excel</span>
            </button>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href={`/fiches/alerte/${successResult.alerte_id}`}
              className="w-full py-3 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-md active:scale-95 transition-all text-center"
            >
              Consulter la fiche détaillée
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
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-28">
      
      {/* 1. En-tête officiel */}
      <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/fiches/nouvelle"
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold">Annuler</span>
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-extrabold tracking-tight">Notification d'alerte</h1>
            <p className="text-[10px] text-white/80">Semaine {epidemio.semaine} / {epidemio.annee}</p>
          </div>
          <button
            onClick={sauvegarderBrouillon}
            className="text-white/90 hover:text-white p-1.5 rounded-xl hover:bg-white/10"
            title="Sauvegarder brouillon"
          >
            <Save className="w-5 h-5" />
          </button>
        </div>

        {/* Bandeau tricolore béninois */}
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>
      </header>

      {/* 2. Barre de progression par étapes (1 à 4) */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-[68px] z-20">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          {[
            { num: 1, label: "Lieu & Cas" },
            { num: 2, label: "Maladie & Signes" },
            { num: 3, label: "Bilan & Délais" },
            { num: 4, label: "Signature" },
          ].map((s) => {
            const isCurrent = etape === s.num;
            const isDone = etape > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setEtape(s.num as any)}
                className="flex items-center gap-1.5 focus:outline-none"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                    isDone
                      ? "bg-[#005c30] text-white"
                      : isCurrent
                      ? "bg-emerald-100 text-[#005c30] ring-2 ring-[#005c30]"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                </div>
                <span
                  className={`hidden sm:inline text-xs font-bold ${
                    isCurrent ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-4">
        
        {/* Message d'erreur s'il y en a */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900 animate-shake">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="block font-bold">Erreur de validation :</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ÉTAPE 1 : LOCALISATION ADMINISTRATIVE & PATIENT */}
        {/* ------------------------------------------------------------- */}
        {etape === 1 && (
          <section className="space-y-4">
            
            {/* Cadre Localisation administrative */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 text-[#005c30]">
                <MapPin className="w-5 h-5" />
                <h2 className="font-extrabold text-sm text-slate-900">
                  Localisation de l'événement
                </h2>
              </div>

              {/* Département & Commune */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Département <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={departementId}
                    onChange={(e) => handleDepartementChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30]"
                  >
                    <option value="">Sélectionner un département</option>
                    {departements.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Commune <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={communeId}
                    onChange={(e) => handleCommuneChange(e.target.value)}
                    disabled={!departementId}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30] disabled:bg-slate-50 disabled:text-slate-400"
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

              {/* Arrondissement & Village */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Arrondissement <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={arrondissementId}
                    onChange={(e) => setArrondissementId(e.target.value)}
                    disabled={!communeId}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30] disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Sélectionner un arrondissement</option>
                    {arrondissements.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Village / Quartier de ville <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Houèzounmè, Tossota..."
                    value={villageNom}
                    onChange={(e) => setVillageNom(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30]"
                  />
                </div>
              </div>

              {/* Grappe */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Numéro de grappe
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={numeroGrappe}
                    onChange={(e) => setNumeroGrappe(e.target.value === "" ? "" : (parseInt(e.target.value, 10) || ""))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Nom de la grappe (facultatif)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Grappe 1"
                    value={nomGrappe}
                    onChange={(e) => setNomGrappe(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30]"
                  />
                </div>
              </div>

              {/* Coordonnées GPS Haute Précision */}
              <div className="pt-2 border-t border-slate-100">
                <GpsLocationCapture
                  latitude={gpsLatitude}
                  longitude={gpsLongitude}
                  onLocationChange={(lat, lng) => {
                    setGpsLatitude(lat);
                    setGpsLongitude(lng);
                  }}
                />
              </div>
            </div>

            {/* Cadre Identité du Cas (Protégée sous RLS) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#005c30]">
                  <User className="w-5 h-5" />
                  <h2 className="font-extrabold text-sm text-slate-900">
                    Identité du cas index
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  <Lock className="w-3 h-3" />
                  <span>Données de santé protégées</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Nom du cas <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: KOSSOU"
                    value={nomCas}
                    onChange={(e) => setNomCas(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium uppercase focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Prénoms du cas <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Jean"
                    value={prenomsCas}
                    onChange={(e) => setPrenomsCas(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Sexe <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSexe("M")}
                      className={`py-2 text-xs font-extrabold rounded-xl border transition-all ${
                        sexe === "M"
                          ? "bg-[#005c30] text-white border-[#005c30]"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      Masculin
                    </button>
                    <button
                      type="button"
                      onClick={() => setSexe("F")}
                      className={`py-2 text-xs font-extrabold rounded-xl border transition-all ${
                        sexe === "F"
                          ? "bg-[#005c30] text-white border-[#005c30]"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      Féminin
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Âge du cas <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      value={ageValeur}
                      onChange={(e) => setAgeValeur(e.target.value === "" ? "" : (parseInt(e.target.value, 10) || ""))}
                      className="w-16 px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-center"
                    />
                    <select
                      value={ageUnite}
                      onChange={(e) => setAgeUnite(e.target.value as any)}
                      className="flex-1 px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                    >
                      <option value="ANS">Ans</option>
                      <option value="MOIS">Mois</option>
                      <option value="JOURS">Jours</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Téléphone du cas ou parent
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex: 97000000"
                    value={telephoneCas}
                    onChange={(e) => setTelephoneCas(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    NPI du cas (facultatif)
                  </label>
                  <input
                    type="text"
                    placeholder="10 chiffres"
                    value={npiCas}
                    onChange={(e) => setNpiCas(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Adresse exacte du domicile / Repère
                </label>
                <input
                  type="text"
                  placeholder="Ex: Près de la grande place de Covè..."
                  value={adresseCas}
                  onChange={(e) => setAdresseCas(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30]"
                />
              </div>
            </div>

            {/* Bouton Suivant */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!departementId || !communeId || !arrondissementId || !villageNom.trim()) {
                    setErrorMessage("Veuillez renseigner la localisation complète avant de continuer.");
                    return;
                  }
                  if (!nomCas.trim() || !prenomsCas.trim()) {
                    setErrorMessage("Le nom et le prénom du cas index sont obligatoires.");
                    return;
                  }
                  setErrorMessage(null);
                  setEtape(2);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-md active:scale-95 transition-all"
              >
                <span>Étape suivante : Maladie & Signes</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ÉTAPE 2 : ÉVÉNEMENT SANITAIRE & SIGNES / SYMPTÔMES */}
        {/* ------------------------------------------------------------- */}
        {etape === 2 && (
          <section className="space-y-4">
            
            {/* Bannière Alerte Prioritaire si sélectionnée */}
            {isAlertePrioritaire && (
              <div className="p-4 bg-red-600 text-white rounded-3xl shadow-lg flex items-start gap-3 animate-pulse">
                <Flame className="w-6 h-6 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h3 className="font-black text-sm uppercase tracking-wide">
                    ALERTE À POTENTIEL ÉPIDÉMIQUE PRIORITAIRE
                  </h3>
                  <p className="opacity-95 leading-relaxed">
                    Cette maladie ({selectedTypeObj?.nom}) exige une notification d'urgence immédiate et une prise en charge rapide conformément aux directives du Ministère de la Santé.
                  </p>
                </div>
              </div>
            )}

            {/* Sélection du Type d'alerte (20 types) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#005c30]">
                  <Activity className="w-5 h-5" />
                  <h2 className="font-extrabold text-sm text-slate-900">
                    Type d'alerte ou événement suspect
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  20 types officiels
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1 border border-slate-100 rounded-2xl">
                {TYPES_ALERTES_OFFICIELS.map((type) => {
                  const isSelected = typeAlerteCode === type.code;
                  return (
                    <button
                      key={type.code}
                      type="button"
                      onClick={() => {
                        setTypeAlerteCode(type.code);
                        if (type.concerneAnimaux) {
                          setAnimauxImpliques(true);
                        }
                      }}
                      className={`p-3 rounded-2xl text-left border transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? type.estPrioritaire
                            ? "bg-red-50 border-red-500 ring-2 ring-red-400"
                            : "bg-emerald-50 border-[#005c30] ring-2 ring-emerald-500"
                          : "bg-white border-slate-200/80 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                          isSelected
                            ? type.estPrioritaire
                              ? "bg-red-600 text-white"
                              : "bg-[#005c30] text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {type.code}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-900">
                            {type.nom}
                          </span>
                          {type.estPrioritaire && (
                            <span className="text-[9px] font-black uppercase text-red-600 bg-red-100 px-1.5 py-0.2 rounded">
                              Prioritaire
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {type.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Si type 20 : Précision obligatoire */}
              {typeAlerteCode === 20 && (
                <div className="space-y-1 p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
                  <label className="text-xs font-bold text-amber-900">
                    Précisez la nature de l'événement inhabituel <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Description détaillée de l'événement inhabituel constaté..."
                    value={autreEvenementPrecision}
                    onChange={(e) => setAutreEvenementPrecision(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-medium"
                  />
                </div>
              )}
            </div>

            {/* Signes et symptômes (30 de référence) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#005c30]">
                  <CheckCircle2 className="w-5 h-5" />
                  <h2 className="font-extrabold text-sm text-slate-900">
                    Signes et symptômes constatés
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-[#005c30] bg-emerald-50 px-2 py-0.5 rounded-lg">
                  {symptomesCodes.length} sélectionné(s)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto p-1 border border-slate-100 rounded-2xl">
                {SYMPTOMES_OFFICIELS.map((symp) => {
                  const checked = symptomesCodes.includes(symp.code);
                  return (
                    <label
                      key={symp.code}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        checked
                          ? "bg-emerald-50 border-emerald-400 font-bold text-[#005c30]"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSymptome(symp.code)}
                        className="mt-0.5 rounded text-[#005c30] focus:ring-[#005c30] w-4 h-4"
                      />
                      <span className="text-xs leading-snug">
                        {symp.nom}
                      </span>
                    </label>
                  );
                })}
              </div>

              {symptomesCodes.includes(30) && (
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-slate-700">
                    Préciser les autres symptômes :
                  </label>
                  <input
                    type="text"
                    placeholder="Autres manifestations constatées..."
                    value={autreSymptomePrecision}
                    onChange={(e) => setAutreSymptomePrecision(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              )}
            </div>

            {/* Boutons Retour / Suivant */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setEtape(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeAlerteCode === 20 && !autreEvenementPrecision.trim()) {
                    setErrorMessage("Veuillez préciser la nature de l'événement inhabituel.");
                    return;
                  }
                  setErrorMessage(null);
                  setEtape(3);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-md active:scale-95 transition-all"
              >
                <span>Étape suivante : Bilan & Délais</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ÉTAPE 3 : BILAN D'IMPACT & CHRONOLOGIE */}
        {/* ------------------------------------------------------------- */}
        {etape === 3 && (
          <section className="space-y-4">
            
            {/* Cadre Temporalité & Semaine épidémiologique */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#005c30]">
                  <Calendar className="w-5 h-5" />
                  <h2 className="font-extrabold text-sm text-slate-900">
                    Chronologie & Semaine épidémiologique
                  </h2>
                </div>
                <span className="text-[11px] font-black text-[#005c30] bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                  Semaine {epidemio.semaine} / {epidemio.annee}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Date début de la maladie
                  </label>
                  <input
                    type="date"
                    value={dateDebutMaladie}
                    onChange={(e) => setDateDebutMaladie(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Heure de survenue
                  </label>
                  <input
                    type="time"
                    value={heureSurvenue}
                    onChange={(e) => setHeureSurvenue(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Date de détection <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateDetection}
                    onChange={(e) => setDateDetection(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Heure de détection
                  </label>
                  <input
                    type="time"
                    value={heureDetection}
                    onChange={(e) => setHeureDetection(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Délai détection → notification :</span>
                <span className="font-extrabold text-[#005c30]">
                  {delaiHeures} heure(s)
                </span>
              </div>
            </div>

            {/* Bilan d'impact (Sans plafond) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 text-[#005c30]">
                <ShieldAlert className="w-5 h-5" />
                <h2 className="font-extrabold text-sm text-slate-900">
                  Bilan d'impact (sans plafond)
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block">
                    Personnes touchées <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={nbPersonnesTouchees}
                    onChange={(e) => setNbPersonnesTouchees(e.target.value === "" ? "" : (parseInt(e.target.value, 10) || ""))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-extrabold text-slate-900"
                  />
                </div>

                <div className="space-y-1 bg-red-50/50 p-3 rounded-2xl border border-red-100">
                  <label className="text-xs font-bold text-red-900 block">
                    Personnes décédées
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={nbPersonnesMortes}
                    onChange={(e) => setNbPersonnesMortes(e.target.value === "" ? "" : (parseInt(e.target.value, 10) || ""))}
                    className="w-full px-3 py-2 rounded-xl border border-red-200 bg-white text-sm font-extrabold text-red-700"
                  />
                </div>
              </div>

              {/* Volet Animaux */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={animauxImpliques}
                    onChange={(e) => setAnimauxImpliques(e.target.checked)}
                    className="rounded text-[#005c30] focus:ring-[#005c30] w-4 h-4"
                  />
                  <span>Des animaux sont impliqués ou suspects (morsure, épizootie)</span>
                </label>

                {animauxImpliques && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-900 block">
                        Animaux malades
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={nbAnimauxMalades}
                        onChange={(e) => setNbAnimauxMalades(e.target.value === "" ? "" : (parseInt(e.target.value, 10) || ""))}
                        className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-900 block">
                        Animaux morts
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={nbAnimauxMorts}
                        onChange={(e) => setNbAnimauxMorts(e.target.value === "" ? "" : (parseInt(e.target.value, 10) || ""))}
                        className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white text-xs font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Événement en cours & Mesures prises */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">L'événement est-il toujours en cours ?</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEvenementEnCours(true)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                        evenementEnCours
                          ? "bg-[#005c30] text-white border-[#005c30]"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvenementEnCours(false)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                        !evenementEnCours
                          ? "bg-slate-700 text-white border-slate-700"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      Non
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Mesures immédiates prises
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Référé d'urgence au centre de santé, isolement, sensibilisation..."
                    value={mesuresPrises}
                    onChange={(e) => setMesuresPrises(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Boutons Retour / Suivant */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setEtape(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setEtape(4);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-md active:scale-95 transition-all"
              >
                <span>Étape suivante : Signature & Envoi</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ÉTAPE 4 : NOTIFICATEUR & SIGNATURE TACTILE */}
        {/* ------------------------------------------------------------- */}
        {etape === 4 && (
          <section className="space-y-4">
            
            {/* Récapitulatif notificateur */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-[#005c30]">
                <User className="w-5 h-5" />
                <h2 className="font-extrabold text-sm text-slate-900">
                  Identification du notificateur
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-medium block text-[11px]">Nom & Prénoms</span>
                  <span className="font-extrabold text-slate-900">
                    {userProfile ? `${userProfile.prenoms} ${userProfile.nom}` : "..."}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-medium block text-[11px]">Titre / Poste</span>
                  <span className="font-extrabold text-slate-900">
                    {userProfile?.poste || "ASCQ"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-medium block text-[11px]">Téléphone</span>
                  <span className="font-extrabold text-slate-900">
                    {userProfile?.telephone || "..."}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-medium block text-[11px]">Date de notification</span>
                  <span className="font-extrabold text-slate-900">
                    {dateNotification}
                  </span>
                </div>
              </div>
            </div>

            {/* Signature tactile Canvas */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#005c30]">
                  <FileCheck className="w-5 h-5" />
                  <h2 className="font-extrabold text-sm text-slate-900">
                    Signature officielle du notificateur
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-red-500">
                  Obligatoire
                </span>
              </div>

              <SignatureCanvas
                onSignatureChange={(sig) => setSignatureTactile(sig)}
                defaultValue={signatureTactile}
              />
            </div>

            {/* Actions finales */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={soumettreAlerte}
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-lg shadow-emerald-900/15 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
              >
                {submitting ? (
                  <span>Transmission de l'alerte en cours...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Transmettre l'alerte sanitaire (Officiel)</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setEtape(3)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Retour à l'étape 3</span>
                </button>

                <button
                  type="button"
                  onClick={sauvegarderBrouillon}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all border border-amber-200"
                >
                  <Save className="w-4 h-4" />
                  <span>Garder en brouillon</span>
                </button>
              </div>
            </div>

          </section>
        )}

      </main>
    </div>
  );
}
