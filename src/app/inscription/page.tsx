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
  const isCadreDept = ["DDS", "CCD_CDLS_TP", "CSSPR", "CSPSMEMH", "REPRESENTANT_DEPARTEMENTAL"].includes(poste);
  const isCadreZone = ["MCZS", "RCSE", "C_RAMS"].includes(poste);
  const isCadreCommune = ["MCC", "PF_CCLS_TP", "REPRESENTANT_COMMUNAL"].includes(poste);
  const isTerrainAscq = poste === "ASCQ";
  const isAutre = poste === "AUTRE";

  const showZoneSanitaire = isCadreZone || isCadreCommune || isTerrainAscq || isAutre;
  const showCommune = isCadreCommune || isTerrainAscq || isAutre;
  const showArrondissement = isTerrainAscq || isAutre;
  const showAscqProfil = isTerrainAscq || ["REPRESENTANT_COMMUNAL", "REPRESENTANT_DEPARTEMENTAL"].includes(poste);

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

    if (motDePasse.length < 6) {
      setErrorMsg("Le mot de passe doit comporter au moins 6 caractères.");
      setLoading(false);
      return;
    }

    const technicalEmail = `tel_${cleanPhone}@ascq.local`;

    try {
      // 1. Inscription dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: technicalEmail,
        password: motDePasse,
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
                <span>Statut du compte : En attente de validation</span>
              </div>
              <p>
                Votre demande a bien été enregistrée. Elle est visible dans l'espace administration pour être validée par votre responsable communal ou départemental.
              </p>
              <p className="font-semibold text-slate-800 pt-1">
                Dès validation, vous pourrez vous connecter directement avec votre numéro de téléphone et votre mot de passe.
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
                    Mot de passe *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      placeholder="6 caractères minimum"
                      className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                      if (["DDS", "CCD_CDLS_TP", "CSSPR", "CSPSMEMH"].includes(newP)) {
                        setSelectedZs("");
                        setSelectedCom("");
                        setSelectedArr("");
                      } else if (["MCZS", "RCSE", "C_RAMS"].includes(newP)) {
                        setSelectedCom("");
                        setSelectedArr("");
                      } else if (["MCC", "PF_CCLS_TP"].includes(newP)) {
                        setSelectedArr("");
                      }
                    }}
                    className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <optgroup label="Terrain (Communautaire)">
                      <option value="ASCQ">ASCQ (Agent de Santé Communautaire Qualifié)</option>
                    </optgroup>
                    <optgroup label="Niveau Communal">
                      <option value="PF_CCLS_TP">PF CCLS-TP (Point Focal Santé Communale)</option>
                      <option value="MCC">MCC (Médecin Coordonnateur de Commune)</option>
                      <option value="REPRESENTANT_COMMUNAL">Représentant Communal des ASCQ</option>
                    </optgroup>
                    <optgroup label="Niveau Zone Sanitaire">
                      <option value="MCZS">MCZS (Médecin Coordonnateur de Zone Sanitaire)</option>
                      <option value="RCSE">RCSE (Responsable Cellule Surveillance Épidémiologique)</option>
                      <option value="C_RAMS">C-RAMS (Chargé Registre & Audit Mortalité)</option>
                    </optgroup>
                    <optgroup label="Niveau Départemental">
                      <option value="DDS">DDS (Directeur Départemental de la Santé)</option>
                      <option value="CCD_CDLS_TP">CCD CDLS-TP (Coordination Dép. CDLS-TP)</option>
                      <option value="CSSPR">CSSPR (Chef Service Santé Publique & Réponse)</option>
                      <option value="CSPSMEMH">CSPSMEMH (Chef Service Pharmacie & Santé Mère-Enfant)</option>
                      <option value="REPRESENTANT_DEPARTEMENTAL">Représentant Départemental des ASCQ</option>
                    </optgroup>
                    <optgroup label="Autre">
                      <option value="AUTRE">Autre poste (à préciser)</option>
                    </optgroup>
                  </select>
                </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            {/* Section 4 : Paramètres spécifiques ASCQ */}
            {showAscqProfil && (
              <div className="space-y-4 pt-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  4. Financement et Équipe de Relais
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
                      Nombre de Relais Communautaires (RC) en charge *
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
