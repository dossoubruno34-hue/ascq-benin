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
  EyeOff
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
              router.push("/admin/validation-comptes");
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

    const cleanPhone = telephone.replace(/\D/g, "");
    if (cleanPhone.length < 8) {
      setErrorMsg("Veuillez saisir un numéro de téléphone valide.");
      setLoading(false);
      return;
    }

    const technicalEmail = `tel_${cleanPhone}@ascq.local`;

    try {
      // 1. Authentification Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: technicalEmail,
        password: motDePasse,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          throw new Error("Numéro de téléphone ou mot de passe incorrect. Vérifiez vos identifiants.");
        }
        throw authError;
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
        if (userProfile.role_technique === "SUPER_ADMIN" || userProfile.role_technique === "ADMINISTRATEUR") {
          router.push("/admin/validation-comptes");
        } else if (userProfile.poste === "RC") {
          // Vérifier si le RC a déjà défini son mot de passe
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
        } else if (userProfile.poste === "ASCQ") {
          router.push("/espace-ascq");
        } else {
          router.push("/");
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
      </div>
    </main>
  );
}
