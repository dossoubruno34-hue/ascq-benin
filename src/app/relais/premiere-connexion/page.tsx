"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Lock, CheckCircle2, AlertTriangle, KeyRound, Eye, EyeOff } from "lucide-react";

export default function PremiereConnexionRelaisPage() {
  const router = useRouter();
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    if (nouveauMotDePasse.length < 6) {
      setErrorMsg("Votre mot de passe doit comporter au moins 6 caractères.");
      setLoading(false);
      return;
    }

    if (nouveauMotDePasse !== confirmation) {
      setErrorMsg("Les deux mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    try {
      // 1. Mise à jour officielle directe via Supabase Auth (fonctionne pour RC, ASCQ et tout utilisateur authentifié)
      const { error: authErr } = await supabase.auth.updateUser({
        password: nouveauMotDePasse,
      });

      if (authErr) {
        console.warn("Échec updateUser direct, tentative RPC:", authErr);
      }

      // 2. Appeler également la RPC pour synchroniser le statut du code temporaire si RC
      try {
        await supabase.rpc("definir_mot_de_passe_rc", {
          p_nouveau_mot_de_passe: nouveauMotDePasse,
        });
      } catch (rpcE) {
        console.warn("RPC définir mot de passe RC:", rpcE);
      }

      setSuccess(true);

      // 3. Détecter le profil pour rediriger vers le bon espace (ASCQ ou RC)
      setTimeout(async () => {
        try {
          const { data: profils } = await supabase.rpc("obtenir_mon_profil");
          if (profils && profils[0]?.poste === "ASCQ") {
            router.push("/espace-ascq");
            return;
          }
        } catch (e) {
          // ignore
        }
        router.push("/espace-rc");
      }, 1800);

    } catch (err: any) {
      console.error("Erreur définition mot de passe:", err);
      setErrorMsg(err.message || "Une erreur est survenue lors de l'enregistrement de votre mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased flex flex-col justify-center px-4 py-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* En-tête avec Logo officiel */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-white p-1.5 shadow-sm mx-auto flex items-center justify-center overflow-hidden border border-slate-200">
            <Image
              src="/logo-ascq.png"
              alt="Logo ASCQ Bénin"
              width={56}
              height={56}
              className="object-contain"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Modification du mot de passe
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Définissez votre mot de passe personnel sécurisé
          </p>
        </div>

        {/* Boîte de configuration du mot de passe */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
          
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5">
            <KeyRound className="w-5 h-5 text-[#005c30] shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-950 leading-relaxed">
              Pour la sécurité de vos données, veuillez définir dès maintenant votre <strong>mot de passe personnel</strong> qui remplacera définitivement votre code par défaut.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#005c30] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base text-emerald-800">
                Votre mot de passe est changé avec succès
              </h3>
              <p className="text-xs text-slate-600">
                Redirection automatique vers votre espace de travail...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nouveau mot de passe personnel *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={nouveauMotDePasse}
                    onChange={(e) => setNouveauMotDePasse(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 pl-3 pr-10 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirmer le mot de passe *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="Répétez votre mot de passe"
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#005c30] hover:bg-[#004724] shadow-md transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                <Lock className="w-4 h-4" />
                <span>{loading ? "Enregistrement..." : "Valider et accéder à mon espace"}</span>
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
