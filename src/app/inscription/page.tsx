"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  UserPlus, 
  ArrowLeft, 
  Phone, 
  Lock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";

export default function InscriptionPage() {
  // Données du formulaire
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [poste, setPoste] = useState("ASCQ");
  const [posteAutre, setPosteAutre] = useState("");

  // Rôles et niveaux hiérarchiques
  // Les responsables de santé ne sont pas rattachés à un arrondissement ni à un centre de santé mais selon leur périmètre
  const isCadreNational = ["CADRE_NATIONAL", "DIRECTEUR", "MINISTRE", "COORDINATEUR_NATIONAL"].includes(poste);
  const isCadreDept = ["DDS", "CCD_CDLS_TP", "CSSPR", "CSPSMEMH", "CADRE_DEPARTEMENTAL"].includes(poste);
  const isCadreZone = ["MCZS", "RCSE", "C_RAMS", "CADRE_ZONE_SANITAIRE"].includes(poste);
  const isCadreCommune = ["MCC", "PF_CCLS_TP", "CADRE_COMMUNAL"].includes(poste);
  const isTerrainAscq = poste === "ASCQ";
  const isTerrainRc = poste === "RC";
  const isAutre = poste === "AUTRE";

  const showDepartement = !isCadreNational;
  const showZoneSanitaire = isCadreZone || isTerrainAscq || isTerrainRc || isAutre;
  const showCommune = isCadreCommune || isTerrainAscq || isTerrainRc || isAutre;
  const showArrondissement = isTerrainAscq || isTerrainRc || isAutre;
  const showAscqProfil = isTerrainAscq;

  // Localisation
  const [selectedDep, setSelectedDep] = useState("");
  const [selectedZs, setSelectedZs] = useState("");
  const [selectedCom, setSelectedCom] = useState("");
  const [selectedArr, setSelectedArr] = useState("");
  const [cumulArrondissements, setCumulArrondissements] = useState(false);
  const [selectedSecondArr, setSelectedSecondArr] = useState("");

  // Profil ASCQ
  const [sourceFinancement, setSourceFinancement] = useState("LLF");
  const [sourceFinancementAutre, setSourceFinancementAutre] = useState("");
  const [nombreRc, setNombreRc] = useState(10);
  const [afficherAnnuaire, setAfficherAnnuaire] = useState(true);

  // Données des cascades
  const [departements, setDepartements] = useState<Array<{ id: string; nom: string }>>([]);
  const [zonesSanitaires, setZonesSanitaires] = useState<Array<{ id: string; nom: string }>>([]);
  const [communes, setCommunes] = useState<Array<{ id: string; nom: string; zone_sanitaire_id?: string | null }>>([]);
  const [arrondissements, setArrondissements] = useState<Array<{ id: string; nom: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Charger les départements au montage
  useEffect(() => {
    async function loadDeps() {
      const { data } = await supabase.from("departements").select("id, nom").order("nom");
      setDepartements(data || []);
    }
    loadDeps();
  }, []);

  // Cascade : Charger les zones sanitaires et communes selon le département
  useEffect(() => {
    if (!selectedDep) {
      setZonesSanitaires([]);
      setSelectedZs("");
      setCommunes([]);
      setSelectedCom("");
      setArrondissements([]);
      setSelectedArr("");
      setSelectedSecondArr("");
      return;
    }

    async function loadZsAndCommunes() {
      const [zsRes, comRes] = await Promise.all([
        supabase.from("zones_sanitaires").select("id, nom").eq("departement_id", selectedDep).order("nom"),
        supabase.from("communes").select("id, nom, zone_sanitaire_id").eq("departement_id", selectedDep).order("nom"),
      ]);
      setZonesSanitaires(zsRes.data || []);
      setCommunes(comRes.data || []);
      setSelectedZs("");
      setSelectedCom("");
      setArrondissements([]);
      setSelectedArr("");
      setSelectedSecondArr("");
    }
    loadZsAndCommunes();
  }, [selectedDep]);

  // Cascade : Si une zone sanitaire est choisie, filtrer les communes rattachées
  const filteredCommunes = selectedZs
    ? communes.filter((c) => !c.zone_sanitaire_id || c.zone_sanitaire_id === selectedZs)
    : communes;

  // Cascade : Charger les arrondissements selon la commune
  useEffect(() => {
    if (!selectedCom) {
      setArrondissements([]);
      setSelectedArr("");
      setSelectedSecondArr("");
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
      setSelectedSecondArr("");
    }
    loadArrondissements();
  }, [selectedCom]);

  // Soumission du formulaire d'inscription
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const cleanPhone = telephone.replace(/\D/g, "");
    if (cleanPhone.length < 8) {
      setErrorMsg("Veuillez renseigner un numéro de téléphone valide à au moins 8 chiffres.");
      setLoading(false);
      return;
    }

    if (isTerrainRc) {
      if (motDePasse.length !== 4 || !/^\d{4}$/.test(motDePasse)) {
        setErrorMsg("Le mot de passe pour le RC doit comporter exactement 4 chiffres (ex: 1234).");
        setLoading(false);
        return;
      }
      if (!selectedDep || !selectedCom || !selectedArr) {
        setErrorMsg("Veuillez sélectionner le département, la commune et l'arrondissement pour votre rattachement en tant que RC.");
        setLoading(false);
        return;
      }
    } else {
      if (motDePasse.length < 6) {
        setErrorMsg("Le mot de passe doit comporter au moins 6 caractères.");
        setLoading(false);
        return;
      }
      if (isTerrainAscq) {
        if (!selectedDep || !selectedCom || !selectedArr) {
          setErrorMsg("Veuillez sélectionner le département, la commune et l'arrondissement d'affectation de l'ASCQ.");
          setLoading(false);
          return;
        }
      } else if (isCadreCommune) {
        if (!selectedDep || !selectedCom) {
          setErrorMsg("Veuillez sélectionner votre département et votre commune de rattachement.");
          setLoading(false);
          return;
        }
      } else if (isCadreZone) {
        if (!selectedDep || !selectedZs) {
          setErrorMsg("Veuillez sélectionner votre département et votre zone sanitaire de rattachement.");
          setLoading(false);
          return;
        }
      } else if (isCadreDept) {
        if (!selectedDep) {
          setErrorMsg("Veuillez sélectionner votre département de rattachement.");
          setLoading(false);
          return;
        }
      }
    }

    const technicalEmail = `tel_${cleanPhone}@ascq.local`;
    const technicalPassword = isTerrainRc ? motDePasse.padStart(6, '0') : motDePasse;

    try {
      // 1. Inscription dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: technicalEmail,
        password: technicalPassword,
      });

      if (authError) {
        if (authError.message.includes("already registered") || authError.message.includes("User already registered")) {
          throw new Error("Un compte existe déjà avec ce numéro de téléphone. Si vous avez oublié votre mot de passe, contactez l'administrateur.");
        }
        throw authError;
      }

      const userId = authData.user?.id;
      if (!userId) {
        throw new Error("Impossible de générer l'identifiant du compte. Veuillez réessayer.");
      }

      // 2. Appel de la fonction RPC sécurisée (anti-récursion et écriture garantie)
      const { error: rpcError } = await supabase.rpc("inscrire_nouvel_agent", {
        p_id: userId,
        p_telephone: cleanPhone.startsWith("229") ? `+${cleanPhone}` : `+229${cleanPhone}`,
        p_nom: nom.trim().toUpperCase(),
        p_prenoms: prenoms.trim(),
        p_poste: poste,
        p_poste_autre: poste === "AUTRE" ? posteAutre.trim() : null,
        p_departement_id: selectedDep || null,
        p_zone_sanitaire_id: showZoneSanitaire ? (selectedZs || null) : null,
        p_commune_id: showCommune ? (selectedCom || null) : null,
        p_arrondissement_id: showArrondissement ? (selectedArr || null) : null,
        p_second_arrondissement_id: (isTerrainAscq && cumulArrondissements) ? (selectedSecondArr || null) : null,
        p_source_financement: showAscqProfil ? sourceFinancement : "LLF_FADEC",
        p_source_financement_autre: (showAscqProfil && sourceFinancement === "AUTRE") ? sourceFinancementAutre.trim() : null,
        p_nombre_rc: showAscqProfil ? (Number(nombreRc) || 0) : 0,
        p_afficher_annuaire: showAscqProfil ? afficherAnnuaire : false,
        p_cumul_deux_arrondissements: isTerrainAscq ? cumulArrondissements : false,
      });

      if (rpcError) throw rpcError;

      // 3. Déconnexion immédiate : compte en attente
      await supabase.auth.signOut();

      setSuccess(true);
    } catch (err: any) {
      console.error("Erreur inscription:", err);
      setErrorMsg(err.message || "Une erreur est survenue lors de l'enregistrement de votre inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'accueil officiel</span>
        </Link>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 mb-2">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Inscription Professionnelle
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            Formulaire réservé aux ASCQ et cadres de santé communautaire du Bénin. Votre compte sera activé après vérification administrative.
          </p>
        </div>

        {success ? (
          <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Inscription enregistrée avec succès !
            </h2>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs sm:text-sm text-amber-900 text-left space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {poste === "RC" 
                    ? "Statut : Transmis à l'ASCQ de votre arrondissement" 
                    : "Statut du compte : En attente de validation"}
                </span>
              </div>
              <p>
                {poste === "RC"
                  ? "Votre demande a bien été enregistrée. L'ASCQ de votre arrondissement a été automatiquement notifié pour valider votre compte et vous affecter à votre village d'intervention."
                  : "Votre demande a bien été enregistrée. Elle est visible dans l'espace administration pour être validée par votre responsable communal ou départemental."}
              </p>
              <p className="font-semibold text-slate-800 pt-1">
                {poste === "RC"
                  ? `Dès validation par votre ASCQ, vous pourrez vous connecter directement avec votre numéro ${telephone} et votre code à 4 chiffres.`
                  : "Dès validation, vous pourrez vous connecter directement avec votre numéro de téléphone et votre mot de passe."}
              </p>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/connexion"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
              >
                Aller à la page de connexion
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Retour à l'accueil
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6"
          >
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Section 1 : Identité & Connexion */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                1. Identité et Connexion
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom de famille *
                  </label>
                  <input
                    type="text"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Ex: DOSSOU"
                    className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prénoms *
                  </label>
                  <input
                    type="text"
                    required
                    value={prenoms}
                    onChange={(e) => setPrenoms(e.target.value)}
                    placeholder="Ex: Bruno"
                    className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Numéro de téléphone (Votre identifiant) *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      required
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="0197000000"
                      className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pas besoin de code par SMS. Votre numéro servira à vous connecter.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isTerrainRc ? "Code d'accès secret à 4 chiffres (Mot de passe) *" : "Mot de passe *"}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      maxLength={isTerrainRc ? 4 : undefined}
                      minLength={isTerrainRc ? 4 : 6}
                      inputMode={isTerrainRc ? "numeric" : "text"}
                      pattern={isTerrainRc ? "[0-9]{4}" : undefined}
                      value={motDePasse}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (isTerrainRc) {
                          setMotDePasse(val.replace(/\D/g, "").slice(0, 4));
                        } else {
                          setMotDePasse(val);
                        }
                      }}
                      placeholder={isTerrainRc ? "Ex: 1234" : "6 caractères minimum"}
                      className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {isTerrainRc 
                      ? "Code PIN à 4 chiffres que vous utiliserez pour vous connecter avec votre numéro." 
                      : "Utilisez au moins 6 caractères pour sécuriser votre compte."}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2 : Poste professionnel */}
            <div className="space-y-4 pt-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                2. Poste Professionnel
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Votre fonction ou poste *
                  </label>
                  <select
                    value={poste}
                    onChange={(e) => {
                      const newP = e.target.value;
                      setPoste(newP);
                      if (newP === "RC") {
                        setNombreRc(0);
                      }
                      if (["CADRE_NATIONAL", "DIRECTEUR", "MINISTRE", "COORDINATEUR_NATIONAL"].includes(newP)) {
                        setSelectedDep("");
                        setSelectedZs("");
                        setSelectedCom("");
                        setSelectedArr("");
                      } else if (["DDS", "CCD_CDLS_TP", "CSSPR", "CSPSMEMH", "CADRE_DEPARTEMENTAL"].includes(newP)) {
                        setSelectedZs("");
                        setSelectedCom("");
                        setSelectedArr("");
                      } else if (["MCZS", "RCSE", "C_RAMS", "CADRE_ZONE_SANITAIRE"].includes(newP)) {
                        setSelectedCom("");
                        setSelectedArr("");
                      } else if (["MCC", "PF_CCLS_TP", "CADRE_COMMUNAL"].includes(newP)) {
                        setSelectedArr("");
                      }
                    }}
                    className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                  >
                    <optgroup label="Terrain">
                      <option value="ASCQ">ASCQ</option>
                      <option value="RC">RC</option>
                    </optgroup>
                    <optgroup label="Commune">
                      <option value="MCC">MCC</option>
                      <option value="PF_CCLS_TP">PF CCLS-TP</option>
                      <option value="CADRE_COMMUNAL">CADRE COMMUNE</option>
                    </optgroup>
                    <optgroup label="Zone Sanitaire">
                      <option value="MCZS">MCZS</option>
                      <option value="RCSE">RCSE</option>
                      <option value="C_RAMS">C-RAMS</option>
                      <option value="CADRE_ZONE_SANITAIRE">CADRE ZONE</option>
                    </optgroup>
                    <optgroup label="Département">
                      <option value="DDS">DDS</option>
                      <option value="CCD_CDLS_TP">CCD CDLS-TP</option>
                      <option value="CSSPR">CSSPR</option>
                      <option value="CSPSMEMH">CSPSMEMH</option>
                      <option value="CADRE_DEPARTEMENTAL">CADRE DEPARTEMENT</option>
                    </optgroup>
                    <optgroup label="National">
                      <option value="CADRE_NATIONAL">CADRE NATIONAL</option>
                    </optgroup>
                    <optgroup label="Autre">
                      <option value="AUTRE">AUTRE</option>
                    </optgroup>
                  </select>
                </div>

                {isTerrainRc && (
                  <div className="sm:col-span-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-1">
                    <p className="font-extrabold text-emerald-900">
                      ℹ️ Inscription RC
                    </p>
                    <p className="text-[11px] leading-relaxed text-emerald-800">
                      Renseignez votre département, zone sanitaire, commune et arrondissement. Dès validation par l'ASCQ de votre arrondissement, votre compte sera affecté à votre village d'intervention et actif pour la connexion.
                    </p>
                  </div>
                )}

                {isCadreNational && (
                  <div className="sm:col-span-2 p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-950 space-y-1">
                    <p className="font-extrabold text-teal-900">
                      🏛️ Périmètre National (Supervision globale Bénin)
                    </p>
                    <p className="text-[11px] leading-relaxed text-teal-800">
                      En tant que cadre national, vous supervisez l'ensemble du territoire national en consultation seule. Aucun rattachement à un arrondissement ou centre de santé n'est requis.
                    </p>
                  </div>
                )}

                {isCadreDept && (
                  <div className="sm:col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1">
                    <p className="font-extrabold text-blue-900">
                      🗺️ Périmètre Départemental (Supervision du département)
                    </p>
                    <p className="text-[11px] leading-relaxed text-blue-800">
                      Sélectionnez uniquement votre département. Vous superviserez toutes les communes et arrondissements de ce département. Aucun rattachement à un arrondissement ou centre de santé n'est requis.
                    </p>
                  </div>
                )}

                {isCadreZone && (
                  <div className="sm:col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1">
                    <p className="font-extrabold text-blue-900">
                      🏥 Périmètre Zone Sanitaire (Supervision de la zone)
                    </p>
                    <p className="text-[11px] leading-relaxed text-blue-800">
                      Sélectionnez votre département et votre zone sanitaire. Vous superviserez toutes les communes rattachées. Aucun rattachement à un arrondissement ou centre de santé n'est requis.
                    </p>
                  </div>
                )}

                {isCadreCommune && (
                  <div className="sm:col-span-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-1">
                    <p className="font-extrabold text-emerald-900">
                      🏛️ Périmètre Communal (Supervision de la commune)
                    </p>
                    <p className="text-[11px] leading-relaxed text-emerald-800">
                      Sélectionnez votre département et votre commune. Votre périmètre couvrira tous les arrondissements de la commune. Aucun rattachement à un arrondissement ou centre de santé spécifique n'est requis.
                    </p>
                  </div>
                )}

                {poste === "AUTRE" && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Précisez votre poste *
                    </label>
                    <input
                      type="text"
                      required
                      value={posteAutre}
                      onChange={(e) => setPosteAutre(e.target.value)}
                      placeholder="Ex: Superviseur de zone"
                      className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 3 : Aire géographique (EN MAJUSCULES SANS ACCENTS) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  3. Affectation Géographique
                </h2>
                <span className="text-[11px] text-slate-500">Filtrage en cascade</span>
              </div>

              {isCadreNational ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 text-center font-medium">
                  ✅ Aire géographique : <strong>Territoire National (Tout le Bénin)</strong>. Aucune sous-division n'est requise.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {showDepartement && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Département *
                        </label>
                        <select
                          required
                          value={selectedDep}
                          onChange={(e) => setSelectedDep(e.target.value)}
                          className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Sélectionnez un département</option>
                          {departements.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {showZoneSanitaire && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Zone sanitaire {isAutre ? "" : "*"}
                        </label>
                        <select
                          required={!isAutre}
                          value={selectedZs}
                          onChange={(e) => setSelectedZs(e.target.value)}
                          disabled={!selectedDep}
                          className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                        >
                          <option value="">Sélectionnez une zone sanitaire</option>
                          {zonesSanitaires.map((z) => (
                            <option key={z.id} value={z.id}>
                              {z.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {showCommune && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Commune {isAutre ? "" : "*"}
                        </label>
                        <select
                          required={!isAutre}
                          value={selectedCom}
                          onChange={(e) => setSelectedCom(e.target.value)}
                          disabled={!selectedDep}
                          className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                        >
                          <option value="">Sélectionnez une commune</option>
                          {filteredCommunes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {showArrondissement && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Arrondissement principal {isTerrainAscq ? "*" : ""}
                        </label>
                        <select
                          required={isTerrainAscq}
                          value={selectedArr}
                          onChange={(e) => setSelectedArr(e.target.value)}
                          disabled={!selectedCom}
                          className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                        >
                          <option value="">Sélectionnez un arrondissement</option>
                          {arrondissements.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {isTerrainAscq && selectedCom && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={cumulArrondissements}
                          onChange={(e) => setCumulArrondissements(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span>Je cumule deux arrondissements</span>
                      </label>

                      {cumulArrondissements && (
                        <div className="pt-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Second arrondissement cumulé *
                          </label>
                          <select
                            required={cumulArrondissements}
                            value={selectedSecondArr}
                            onChange={(e) => setSelectedSecondArr(e.target.value)}
                            className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">Sélectionnez le second arrondissement</option>
                            {arrondissements
                              .filter((a) => a.id !== selectedArr)
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.nom}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Section 4 : Paramètres spécifiques ASCQ */}
            {showAscqProfil && (
              <div className="space-y-4 pt-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  4. Financement et Équipe RC
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Source de financement *
                    </label>
                    <select
                      value={sourceFinancement}
                      onChange={(e) => setSourceFinancement(e.target.value)}
                      className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="LLF">LLF</option>
                      <option value="LLF_FADEC">LLF et FADEC Santé communautaire</option>
                      <option value="SRHR">SRHR</option>
                      <option value="AUTRE">Autre (à préciser)</option>
                    </select>
                  </div>

                  {sourceFinancement === "AUTRE" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Précisez la source de financement *
                      </label>
                      <input
                        type="text"
                        required
                        value={sourceFinancementAutre}
                        onChange={(e) => setSourceFinancementAutre(e.target.value)}
                        placeholder="Ex: Partenaire technique"
                        className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nombre de RC en charge *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={50}
                      value={nombreRc}
                      onChange={(e) => setNombreRc(parseInt(e.target.value) || 0)}
                      className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100 mt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={afficherAnnuaire}
                      onChange={(e) => setAfficherAnnuaire(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-emerald-950">
                        Afficher mon numéro dans l'annuaire public
                      </span>
                      <p className="text-[11px] text-emerald-800">
                        Permet aux populations et usagers de votre aire de voir votre nom et de vous joindre pour les urgences communautaires.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {loading ? "Création du compte en cours..." : "Créer mon compte professionnel"}
              </button>
              <p className="text-center text-xs text-slate-500 mt-3">
                Vous avez déjà un compte ?{" "}
                <Link href="/connexion" className="text-emerald-700 font-bold hover:underline">
                  Connectez-vous ici
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
