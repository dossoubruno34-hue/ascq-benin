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
  EyeOff,
  Mail,
  ShieldCheck,
  Check,
  X
} from "lucide-react";

export default function InscriptionPage() {
  // Données du formulaire
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [poste, setPoste] = useState("ASCQ");
  const [posteAutre, setPosteAutre] = useState("");

  // Rôles officiels SantéCom Bénin : SUPER_ADMIN, MEMBRE_MINISTERE, PF_CCLS_TP, ASCQ, RC
  const isMembreMinistere = poste === "MEMBRE_MINISTERE";
  const isPfCclsTp = poste === "PF_CCLS_TP";
  const isTerrainAscq = poste === "ASCQ";
  const isTerrainRc = poste === "RC";

  // ASCQ de rattachement pour l'auto-enrôlement autonome du RC
  const [selectedAscqRattachement, setSelectedAscqRattachement] = useState("");
  const [ascqsCommune, setAscqsCommune] = useState<Array<{ id: string; nom: string; prenoms: string; telephone: string }>>([]);
  const [loadingAscqs, setLoadingAscqs] = useState(false);

  // Critères de robustesse du mot de passe (obligatoire pour ASCQ et cadres - anti-hack)
  const pwdMinLength = motDePasse.length >= 8;
  const pwdSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/]/.test(motDePasse);
  const pwdLetter = /[a-zA-Z]/.test(motDePasse);
  const pwdNumber = /[0-9]/.test(motDePasse);
  const pwdRobustesseConforme = isTerrainRc ? (motDePasse.length === 4 && /^\d{4}$/.test(motDePasse)) : (pwdMinLength && pwdSpecialChar && pwdLetter && pwdNumber);
  const necessitePrecision = false;

  const showDepartement = !isMembreMinistere;
  const showZoneSanitaire = isTerrainAscq;
  const showCommune = !isMembreMinistere;
  const showArrondissement = isTerrainAscq;
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

  // Cascade : Si profil RC, charger les ASCQ validés de la commune pour le rattachement
  useEffect(() => {
    if (!selectedCom || !isTerrainRc) {
      setAscqsCommune([]);
      setSelectedAscqRattachement("");
      return;
    }

    async function loadAscqsDeLaCommune() {
      setLoadingAscqs(true);
      try {
        const { data } = await supabase
          .from("utilisateurs")
          .select("id, nom, prenoms, telephone")
          .eq("commune_id", selectedCom)
          .in("role_technique", ["ASCQ", "ASCQ_OPERATEUR"])
          .eq("statut_compte", "VALIDE")
          .order("nom");
        setAscqsCommune(data || []);
      } catch (e) {
        console.warn("Erreur chargement ASCQ commune:", e);
      } finally {
        setLoadingAscqs(false);
      }
    }
    loadAscqsDeLaCommune();
  }, [selectedCom, isTerrainRc]);

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

    if (necessitePrecision && !posteAutre.trim()) {
      setErrorMsg("Veuillez obligatoirement préciser votre fonction ou titre officiel.");
      setLoading(false);
      return;
    }

    if (isTerrainRc) {
      if (motDePasse.length !== 4 || !/^\d{4}$/.test(motDePasse)) {
        setErrorMsg("Le mot de passe pour le RC doit comporter exactement 4 chiffres (ex: 1234).");
        setLoading(false);
        return;
      }
      if (!selectedDep || !selectedCom) {
        setErrorMsg("Veuillez sélectionner le département et la commune pour votre rattachement en tant que RC.");
        setLoading(false);
        return;
      }
      if (!selectedAscqRattachement) {
        setErrorMsg("Veuillez sélectionner votre ASCQ de rattachement dans cette commune.");
        setLoading(false);
        return;
      }
    } else {
      // 1. Validation de l'adresse email professionnelle obligatoire pour ASCQ et cadres
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        setErrorMsg("Veuillez renseigner une adresse email valide.");
        setLoading(false);
        return;
      }

      // 2. Validation du mot de passe robuste anti-hack (8+ car., lettre, chiffre, caractère spécial)
      if (!pwdMinLength) {
        setErrorMsg("Le mot de passe doit comporter au moins 8 caractères.");
        setLoading(false);
        return;
      }
      if (!pwdLetter || !pwdNumber) {
        setErrorMsg("Le mot de passe doit contenir au moins une lettre et au moins un chiffre.");
        setLoading(false);
        return;
      }
      if (!pwdSpecialChar) {
        setErrorMsg("Pour éviter tout piratage, votre mot de passe doit obligatoirement inclure au moins un caractère spécial (! @ # $ % ^ & * ( ) _ + - = . ? : { } | < >).");
        setLoading(false);
        return;
      }

      if (isTerrainAscq) {
        if (!selectedDep || !selectedCom || !selectedArr) {
          setErrorMsg("Veuillez sélectionner le département, la commune et l'arrondissement d'affectation de l'ASCQ.");
          setLoading(false);
          return;
        }
      } else if (isPfCclsTp) {
        if (!selectedDep || !selectedCom) {
          setErrorMsg("Veuillez sélectionner votre département et votre commune de rattachement pour le Point Focal CCLS-TP.");
          setLoading(false);
          return;
        }
      }
    }

    const technicalEmail = isTerrainRc ? `tel_${cleanPhone}@ascq.local` : email.trim().toLowerCase();
    const technicalPassword = isTerrainRc ? motDePasse.padStart(6, '0') : motDePasse;

    try {
      // 1. Inscription dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: technicalEmail,
        password: technicalPassword,
        options: {
          data: {
            telephone: cleanPhone.startsWith("229") ? `+${cleanPhone}` : `+229${cleanPhone}`,
            nom: nom.trim().toUpperCase(),
            prenoms: prenoms.trim(),
            email: isTerrainRc ? null : email.trim().toLowerCase(),
            poste: poste,
          }
        }
      });

      if (authError) {
        if (authError.message.includes("already registered") || authError.message.includes("User already registered")) {
          throw new Error("Un compte existe déjà avec cette adresse email ou ce numéro de téléphone. Si vous avez oublié votre mot de passe, contactez l'administrateur.");
        }
        throw authError;
      }

      const userId = authData.user?.id;
      if (!userId) {
        throw new Error("Impossible de générer l'identifiant du compte. Veuillez réessayer.");
      }

      // 2. Appel de la fonction RPC sécurisée (anti-récursion et écriture garantie)
      const rpcParams: any = {
        p_id: userId,
        p_telephone: cleanPhone.startsWith("229") ? `+${cleanPhone}` : `+229${cleanPhone}`,
        p_nom: nom.trim().toUpperCase(),
        p_prenoms: prenoms.trim(),
        p_poste: poste,
        p_poste_autre: null,
        p_departement_id: isMembreMinistere ? null : (selectedDep || null),
        p_zone_sanitaire_id: isTerrainAscq ? (selectedZs || null) : null,
        p_commune_id: isMembreMinistere ? null : (selectedCom || null),
        p_arrondissement_id: isTerrainAscq ? (selectedArr || null) : null,
        p_second_arrondissement_id: (isTerrainAscq && cumulArrondissements) ? (selectedSecondArr || null) : null,
        p_source_financement: showAscqProfil ? sourceFinancement : "LLF_FADEC",
        p_source_financement_autre: (showAscqProfil && sourceFinancement === "AUTRE") ? sourceFinancementAutre.trim() : null,
        p_nombre_rc: showAscqProfil ? (Number(nombreRc) || 0) : 0,
        p_afficher_annuaire: showAscqProfil ? afficherAnnuaire : false,
        p_cumul_deux_arrondissements: isTerrainAscq ? cumulArrondissements : false,
        p_email: isTerrainRc ? null : email.trim().toLowerCase(),
        p_ascq_rattachement_id: isTerrainRc ? selectedAscqRattachement : null,
      };

      let { error: rpcError } = await supabase.rpc("inscrire_nouvel_agent", rpcParams);

      if (rpcError && (rpcError.message.includes("p_ascq_rattachement_id") || rpcError.message.includes("p_email") || rpcError.message.includes("schema cache") || rpcError.message.includes("function") || rpcError.message.includes("not found"))) {
        // Fallback sans p_ascq_rattachement_id si la nouvelle signature RPC n'a pas encore été migrée sur Supabase
        const { p_ascq_rattachement_id, ...paramsWithoutAscq } = rpcParams;
        let fallback = await supabase.rpc("inscrire_nouvel_agent", paramsWithoutAscq);
        if (fallback.error && fallback.error.message.includes("p_email")) {
          const { p_email, ...paramsLegacy } = paramsWithoutAscq;
          fallback = await supabase.rpc("inscrire_nouvel_agent", paramsLegacy);
        }
        rpcError = fallback.error;
      }

      if (rpcError) throw rpcError;

      // Si RC avec ASCQ de rattachement, enregistrement direct de la liaison en attente dans relais_communautaires
      if (isTerrainRc && selectedAscqRattachement) {
        try {
          await supabase.from("relais_communautaires").insert({
            user_id: userId,
            ascq_id: selectedAscqRattachement,
            commune_id: selectedCom,
            nom: nom.trim().toUpperCase(),
            prenoms: prenoms.trim(),
            telephone: cleanPhone.startsWith("229") ? `+${cleanPhone}` : `+229${cleanPhone}`,
            statut: "EN_ATTENTE"
          });
        } catch (e) {
          console.warn("Liaison RC enregistrée via RPC:", e);
        }
      }

      // Mise à jour de sécurité directe de l'email si non-RC
      if (!isTerrainRc && email.trim()) {
        try {
          await supabase.from("utilisateurs").update({ email: email.trim().toLowerCase() }).eq("id", userId);
        } catch {}
      }

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
                    ? "Statut : En attente de validation par votre ASCQ ou le Représentant Communal" 
                    : poste === "PF_CCLS_TP"
                    ? "Statut : En attente de validation par le Super Administrateur National"
                    : poste === "MEMBRE_MINISTERE"
                    ? "Statut : En attente de nomination par le Super Administrateur National"
                    : "Statut du compte : En attente de validation par votre Représentant Communal"}
                </span>
              </div>
              <p>
                {poste === "RC"
                  ? "Votre auto-enrôlement a bien été enregistré. Votre ASCQ de rattachement ou le Représentant Communal de votre commune a été notifié pour valider votre compte."
                  : poste === "PF_CCLS_TP"
                  ? "Votre demande a bien été enregistrée pour votre commune. Le Super Administrateur National a été notifié pour valider votre accès en consultation communale."
                  : poste === "MEMBRE_MINISTERE"
                  ? "Votre inscription a bien été enregistrée. Le Super Administrateur National procèdera à votre nomination officielle pour l'accès en consultation nationale."
                  : "Votre demande a bien été enregistrée. Elle sera validée par le Représentant Communal des ASCQ de votre commune ou le Super Administrateur."}
              </p>
              <p className="font-semibold text-slate-800 pt-1">
                {poste === "RC"
                  ? `Dès validation par votre ASCQ ou le représentant communal, vous pourrez vous connecter directement avec votre numéro ${telephone} et votre code à 4 chiffres.`
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

                {/* Champ Email obligatoire pour ASCQ et cadres (caché pour les RC) */}
                {!isTerrainRc && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Adresse Email Professionnelle ou Personnelle *</span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Obligatoire ASCQ & Cadres
                      </span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        required={!isTerrainRc}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ex: prenom.nom@sante.gouv.bj ou email@gmail.com"
                        className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Obligatoire pour les ASCQ et cadres : permet de sécuriser vos accès officiels, recevoir les notifications et éviter les piratages de comptes.
                    </p>
                  </div>
                )}

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
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>{isTerrainRc ? "Code secret à 4 chiffres (PIN) *" : "Mot de passe renforcé *"}</span>
                    {!isTerrainRc && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pwdRobustesseConforme ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {pwdRobustesseConforme ? "Sécurisé ✓" : "Caractère spécial requis"}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      maxLength={isTerrainRc ? 4 : undefined}
                      minLength={isTerrainRc ? 4 : 8}
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
                      placeholder={isTerrainRc ? "Ex: 1234" : "8 caractères min. avec @#$%"}
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
                  
                  {isTerrainRc ? (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Code PIN à 4 chiffres que vous utiliserez pour vous connecter avec votre numéro.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px]">
                      <span className="text-slate-500 font-bold block mb-1">Critères de sécurité anti-piratage :</span>
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <div className={`flex items-center gap-1 font-semibold ${pwdMinLength ? "text-emerald-700" : "text-slate-400"}`}>
                          {pwdMinLength ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-400" />}
                          <span>Au moins 8 caractères</span>
                        </div>
                        <div className={`flex items-center gap-1 font-semibold ${(pwdLetter && pwdNumber) ? "text-emerald-700" : "text-slate-400"}`}>
                          {(pwdLetter && pwdNumber) ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-400" />}
                          <span>Lettres & Chiffres</span>
                        </div>
                        <div className={`col-span-2 flex items-center gap-1 font-semibold ${pwdSpecialChar ? "text-emerald-700" : "text-amber-700"}`}>
                          {pwdSpecialChar ? <Check className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-amber-600" />}
                          <span>Caractère spécial (!@#$%^&*...)</span>
                        </div>
                      </div>
                    </div>
                  )}
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
                      if (newP === "MEMBRE_MINISTERE") {
                        setSelectedDep("");
                        setSelectedZs("");
                        setSelectedCom("");
                        setSelectedArr("");
                        setSelectedAscqRattachement("");
                      } else if (newP === "PF_CCLS_TP") {
                        setSelectedZs("");
                        setSelectedArr("");
                        setSelectedAscqRattachement("");
                      }
                    }}
                    className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                  >
                    <option value="ASCQ">Agent de Santé Communautaire Qualifié (ASCQ)</option>
                    <option value="RC">Relais Communautaire (RC) — Auto-enrôlement</option>
                    <option value="PF_CCLS_TP">Point Focal CCLS-TP (Mairie)</option>
                    <option value="MEMBRE_MINISTERE">Ministère de la Santé (désigné)</option>
                  </select>
                </div>

                {isTerrainRc && (
                  <div className="sm:col-span-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-1.5">
                    <p className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      Auto-enrôlement autonome du Relais Communautaire (RC)
                    </p>
                    <p className="text-[11px] leading-relaxed text-emerald-800">
                      Renseignez votre département, votre commune et sélectionnez votre ASCQ de rattachement. Dès validation par votre ASCQ ou le Représentant Communal, votre compte sera immédiatement actif.
                    </p>
                  </div>
                )}

                {isPfCclsTp && (
                  <div className="sm:col-span-2 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1.5">
                    <p className="font-extrabold text-blue-900">
                      🏛️ Point Focal CCLS-TP (Mairie)
                    </p>
                    <p className="text-[11px] leading-relaxed text-blue-800">
                      Sélectionnez votre département et votre commune de rattachement. Après validation par le Super Administrateur, vous accéderez en consultation seule aux données et synthèses de votre commune.
                    </p>
                  </div>
                )}

                {isMembreMinistere && (
                  <div className="sm:col-span-2 p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-950 space-y-1.5">
                    <p className="font-extrabold text-purple-900">
                      🇧🇯 Ministère de la Santé (Désigné)
                    </p>
                    <p className="text-[11px] leading-relaxed text-purple-800">
                      Votre compte sera nommé par le Super Administrateur National pour la consultation seule de l'ensemble du territoire national. Aucun rattachement communal n'est requis.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3 : Aire géographique */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  3. Affectation Géographique
                </h2>
                <span className="text-[11px] text-slate-500">Filtrage en cascade</span>
              </div>

              {isMembreMinistere ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 text-center font-medium">
                  ✅ Aire géographique : <strong>Territoire National (Tout le Bénin)</strong>. Consultation seule globale.
                </div>
              ) : (
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
                        Zone sanitaire
                      </label>
                      <select
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
                        Commune *
                      </label>
                      <select
                        required
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

                  {isTerrainRc && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ASCQ de rattachement (Superviseur) *
                      </label>
                      <select
                        required
                        value={selectedAscqRattachement}
                        onChange={(e) => setSelectedAscqRattachement(e.target.value)}
                        disabled={!selectedCom || loadingAscqs}
                        className="w-full text-sm rounded-xl border border-emerald-300 bg-emerald-50/40 px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800 disabled:opacity-50"
                      >
                        <option value="">
                          {loadingAscqs
                            ? "Chargement des ASCQ..."
                            : selectedCom
                            ? ascqsCommune.length > 0
                              ? "Sélectionnez votre ASCQ superviseur"
                              : "Aucun ASCQ trouvé dans cette commune"
                            : "Sélectionnez d'abord votre commune"}
                        </option>
                        {ascqsCommune.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nom} {a.prenoms} {a.telephone ? `(${a.telephone})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {showArrondissement && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Arrondissement d'affectation *
                      </label>
                      <select
                        required
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

                  {isTerrainAscq && selectedCom && (
                    <div className="sm:col-span-2 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
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
