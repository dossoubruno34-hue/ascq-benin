"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  LogIn, 
  ArrowLeft, 
  Phone, 
  Lock, 
  AlertCircle, 
  ShieldAlert, 
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  HelpCircle,
  Send
} from "lucide-react";

export default function ConnexionPage() {
  const router = useRouter();
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [pendingAccount, setPendingAccount] = useState<any>(null);
  const [loginSuccess, setLoginSuccess] = useState<any>(null);

  // Gestion Mot de passe oublié
  const [showOubliModal, setShowOubliModal] = useState(false);
  const [oubliTelephone, setOubliTelephone] = useState("");
  const [oubliNom, setOubliNom] = useState("");
  const [oubliLoading, setOubliLoading] = useState(false);
  const [oubliSuccessMsg, setOubliSuccessMsg] = useState<string | null>(null);
  const [oubliErrorMsg, setOubliErrorMsg] = useState<string | null>(null);

  const handleDemandeOubli = async (e: React.FormEvent) => {
    e.preventDefault();
    setOubliLoading(true);
    setOubliErrorMsg(null);
    setOubliSuccessMsg(null);

    const cleanTel = oubliTelephone.replace(/\D/g, "");
    if (cleanTel.length < 8) {
      setOubliErrorMsg("Veuillez saisir un numéro de téléphone valide à 8 ou 10 chiffres.");
      setOubliLoading(false);
      return;
    }

    try {
      // 1. Tenter l'appel RPC sécurisé
      const { data, error } = await supabase.rpc("demander_reinitialisation_mot_de_passe", {
        p_telephone: cleanTel,
        p_nom: oubliNom.trim() || null,
      });

      if (error) {
        // En cas d'absence de la fonction SQL, insertion de secours dans notifications
        await supabase.from("notifications").insert({
          destinataire_id: null,
          titre: "Demande réinitialisation mot de passe",
          message: `L'agent ${oubliNom || "Non précisé"} (${cleanTel}) a oublié son mot de passe et demande une réinitialisation.`,
          type: "URGENT",
          lu: false,
        });
      }

      setOubliSuccessMsg(
        `Votre demande pour le numéro ${cleanTel} a été transmise avec succès à l'Administrateur National. Vos nouveaux identifiants vous seront communiqués. Pour une urgence immédiate, contactez la coordination au 01 69 03 14 63.`
      );
    } catch (err: any) {
      setOubliErrorMsg(err.message || "Erreur lors de la transmission de la demande.");
    } finally {
      setOubliLoading(false);
    }
  };

  // Redirection automatique si déjà connecté
  useEffect(() => {
    async function checkCurrentSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profils } = await supabase.rpc("obtenir_mon_profil");
        if (profils && profils.length > 0) {
          const userProfile = profils[0];
          if (userProfile.statut_compte === "VALIDE") {
            if (userProfile.role_technique === "SUPER_ADMIN" || userProfile.role_technique === "ADMINISTRATEUR") {
              router.push("/admin");
            } else if (userProfile.poste === "RC") {
              router.push("/espace-rc");
            } else if (userProfile.poste === "ASCQ") {
              router.push("/espace-ascq");
            }
          }
        }
      }
    }
    checkCurrentSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setPendingAccount(null);
    setLoginSuccess(null);

    const rawDigits = telephone.replace(/\D/g, "");
    if (rawDigits.length < 8) {
      setErrorMsg("Veuillez saisir un numéro de téléphone valide.");
      setLoading(false);
      return;
    }

    // Gestion intelligente des formats béninois (+229, 01, 8 chiffres ou 10 chiffres)
    const nationalDigits = rawDigits.startsWith("229") ? rawDigits.substring(3) : rawDigits;
    const candidateEmails = [
      `tel_${rawDigits}@ascq.local`,
      `tel_${nationalDigits}@ascq.local`,
      nationalDigits.startsWith("01") ? `tel_${nationalDigits.substring(2)}@ascq.local` : `tel_01${nationalDigits}@ascq.local`,
      `tel_229${nationalDigits}@ascq.local`
    ];
    const uniqueEmails = Array.from(new Set(candidateEmails));

    try {
      // 1. Authentification Supabase avec tentative sur les formats de téléphone
      let authData: any = null;
      let lastAuthError: any = null;

      for (const emailAttempt of uniqueEmails) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailAttempt,
          password: motDePasse,
        });

        if (!error && data?.user) {
          authData = data;
          lastAuthError = null;
          break;
        } else {
          lastAuthError = error;
          // Si l'erreur est un mauvais mot de passe avéré, inutile d'essayer d'autres emails si le compte a été trouvé
          if (error?.message?.includes("Invalid login credentials") && !error?.message?.includes("schema")) {
            // Continuer pour tester un autre format au cas où
          }
        }
      }

      if (lastAuthError && !authData) {
        if (lastAuthError.message?.toLowerCase().includes("database error querying schema")) {
          throw new Error("Erreur de synchronisation du compte. Demandez à votre superviseur ASCQ de cliquer sur 'Réinitialiser le code d'accès' dans son espace Relais.");
        }
        if (lastAuthError.message?.includes("Invalid login credentials")) {
          throw new Error("Numéro de téléphone ou mot de passe incorrect. Vérifiez vos identifiants ou votre code temporaire.");
        }
        throw lastAuthError;
      }

      // 2. Récupérer le profil via RPC (sans aucun problème de politique RLS récursive)
      const { data: profils, error: rpcError } = await supabase.rpc("obtenir_mon_profil");

      if (rpcError || !profils || profils.length === 0) {
        throw new Error("Profil utilisateur introuvable. Veuillez contacter un administrateur.");
      }

      const userProfile = profils[0];

      // Si le compte est EN_ATTENTE : on déconnecte et on affiche le message clair
      if (userProfile.statut_compte === "EN_ATTENTE") {
        await supabase.auth.signOut();
        setPendingAccount(userProfile);
        setLoading(false);
        return;
      }

      if (userProfile.statut_compte === "SUSPENDU" || userProfile.statut_compte === "REJETE") {
        await supabase.auth.signOut();
        setErrorMsg("Ce compte a été suspendu ou refusé par l'administration. Veuillez contacter votre direction.");
        setLoading(false);
        return;
      }

      // Compte validé !
      setLoginSuccess(userProfile);

      setTimeout(async () => {
        const isCadreOuRepresentant = [
          "REPRESENTANT_COMMUNAL",
          "REPRESENTANT_DEPARTEMENTAL",
          "PF_CCLS_TP",
          "MCC",
          "MCZS",
          "RCSE",
          "C_RAMS",
          "DDS",
          "ADMIN_COMMUNAL",
          "ADMIN_DEPARTEMENTAL"
        ].includes(userProfile.poste) || [
          "ADMIN_COMMUNAL",
          "ADMIN_DEPARTEMENTAL"
        ].includes(userProfile.role_technique);

        if (userProfile.poste === "ASCQ" || isCadreOuRepresentant) {
          // L'ASCQ et les représentants territoriaux arrivent sur leur espace de travail complet
          router.push("/espace-ascq");
        } else if (userProfile.role_technique === "SUPER_ADMIN" || userProfile.role_technique === "ADMINISTRATEUR") {
          router.push("/admin");
        } else if (userProfile.poste === "RC") {
          // Vérifier si le RC a déjà défini son mot de passe personnel
          const { data: rcData } = await supabase
            .from("relais_communautaires")
            .select("code_temporaire_utilise")
            .eq("user_id", userProfile.id)
            .maybeSingle();

          if (rcData && rcData.code_temporaire_utilise === false) {
            router.push("/relais/premiere-connexion");
          } else {
            router.push("/espace-rc");
          }
        } else {
          router.push("/espace-ascq");
        }
      }, 1200);

    } catch (err: any) {
      console.error("Erreur connexion:", err);
      setErrorMsg(err.message || "Erreur de connexion. Veuillez vérifier vos identifiants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 flex flex-col justify-center">
      <div className="max-w-md w-full mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'accueil</span>
        </Link>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 mb-1">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Connexion Professionnelle
          </h1>
          <p className="text-xs text-slate-600">
            Accédez à votre espace ASCQ, Relais ou Administration.
          </p>
        </div>

        {pendingAccount && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-xs sm:text-sm text-amber-900 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-base">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Compte en cours de validation</span>
            </div>
            <p>
              Bonjour <strong>{pendingAccount.prenoms} {pendingAccount.nom}</strong>. Votre inscription a bien été enregistrée.
            </p>
            <p className="bg-white/80 p-3 rounded-xl border border-amber-200/60 text-slate-700">
              Votre compte ({pendingAccount.poste} à {pendingAccount.commune_nom || "votre commune"}) est actuellement au statut <strong>« En attente de validation »</strong> par l'administrateur.
            </p>
            <p className="text-[11px] text-amber-800">
              Dès validation administrative, vous pourrez accéder à l'ensemble de vos modules.
            </p>
          </div>
        )}

        {loginSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-2 text-emerald-900 shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h2 className="font-bold text-base">Connexion réussie !</h2>
            <p className="text-xs text-emerald-700">
              Bienvenue, {loginSuccess.prenoms} {loginSuccess.nom}. Redirection en cours...
            </p>
          </div>
        )}

        {!loginSuccess && (
          <form
            onSubmit={handleLogin}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4"
          >
            {errorMsg && (
              <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Numéro de téléphone *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mot de passe *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="Votre mot de passe"
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
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOubliTelephone(telephone);
                    setOubliErrorMsg(null);
                    setOubliSuccessMsg(null);
                    setShowOubliModal(true);
                  }}
                  className="text-xs text-emerald-800 font-bold hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {loading ? "Connexion en cours..." : "Se connecter"}
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Vous n'avez pas encore de compte ?{" "}
                <Link href="/inscription" className="text-emerald-700 font-bold hover:underline">
                  Inscrivez-vous ici
                </Link>
              </p>
            </div>
          </form>
        )}

        {/* MODALE ASSISTANCE MOT DE PASSE OUBLIÉ */}
        {showOubliModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-[#005c30] rounded-xl">
                    <KeyRound className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900">
                      Mot de passe oublié ?
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Procédure officielle d'assistance et réinitialisation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOubliModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
                >
                  ✕
                </button>
              </div>

              {oubliSuccessMsg ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{oubliSuccessMsg}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 text-[11px] text-slate-700 space-y-1">
                    <p className="font-bold text-slate-900">Assistance d'urgence :</p>
                    <p>Super Administrateur National : <strong>01 69 03 14 63</strong> (Appel / WhatsApp)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOubliModal(false)}
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs"
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                <form onSubmit={handleDemandeOubli} className="space-y-3.5">
                  <p className="text-xs text-slate-600">
                    Les comptes ASCQ et Relais étant rattachés à votre numéro de téléphone professionnel, la réinitialisation est validée par l'Administrateur National.
                  </p>

                  {oubliErrorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                      {oubliErrorMsg}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Votre numéro de téléphone enregistré *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex : 0197000000"
                      value={oubliTelephone}
                      onChange={(e) => setOubliTelephone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Votre nom et prénoms (facultatif mais recommandé)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex : DOSSOU Bruno"
                      value={oubliNom}
                      onChange={(e) => setOubliNom(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800">Support direct :</p>
                    <p>En cas d'urgence sur le terrain, contactez directement la Coordination Nationale au <strong className="text-slate-900">01 69 03 14 63</strong>.</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowOubliModal(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={oubliLoading}
                      className="px-5 py-2 bg-[#005c30] hover:bg-[#004724] text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{oubliLoading ? "Transmission..." : "Envoyer la demande"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
