"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import NetworkStatusIndicator from "@/components/NetworkStatusIndicator";
import { 
  FileText, 
  Bell, 
  User, 
  AlertTriangle, 
  Phone, 
  MapPin, 
  LogOut, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Activity, 
  Skull, 
  ClipboardList,
  RefreshCw,
  Lock
} from "lucide-react";

export default function EspaceRelaisPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"fiches" | "notifications" | "compte">("fiches");
  const [rcData, setRcData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Changement de mot de passe dans Mon compte
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmMdp, setConfirmMdp] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ text: string; error: boolean } | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("obtenir_espace_rc");
      if (error) {
        // Si non trouvé ou non connecté, renvoyer vers la connexion
        router.push("/connexion");
        return;
      }

      setRcData(data);

      // Si le code temporaire n'a pas encore été changé, forcer la redirection
      if (data && data.code_temporaire_utilise === false) {
        router.push("/relais/premiere-connexion");
      }

    } catch (err) {
      console.error("Erreur chargement profil RC:", err);
      router.push("/connexion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/connexion");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdMsg(null);

    if (nouveauMdp.length < 6) {
      setPwdMsg({ text: "Le mot de passe doit comporter au moins 6 caractères.", error: true });
      setPwdLoading(false);
      return;
    }

    if (nouveauMdp !== confirmMdp) {
      setPwdMsg({ text: "Les mots de passe ne correspondent pas.", error: true });
      setPwdLoading(false);
      return;
    }

    try {
      const { error } = await supabase.rpc("definir_mot_de_passe_rc", {
        p_nouveau_mot_de_passe: nouveauMdp,
      });

      if (error) throw error;

      setPwdMsg({ text: "Mot de passe modifié avec succès !", error: false });
      setNouveauMdp("");
      setConfirmMdp("");
      setTimeout(() => setIsChangingPassword(false), 2000);
    } catch (err: any) {
      setPwdMsg({ text: err.message || "Erreur lors de la modification du mot de passe.", error: true });
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="text-center space-y-2 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#005c30]" />
          <p className="text-xs font-semibold">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-20">
      
      {/* 1. En-tête officiel du Relais Communautaire */}
      <header className="bg-[#005c30] text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-md sm:max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              <Image
                src="/logo-ascq.png"
                alt="Logo ASCQ Bénin"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight leading-tight">
                Espace Relais Communautaire
              </h1>
              <p className="text-[11px] text-white/80">
                {rcData ? `${rcData.prenoms} ${rcData.nom}` : "Relais Communautaire"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NetworkStatusIndicator />
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bandeau tricolore béninois */}
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-md sm:max-w-lg mx-auto px-4 pt-5 space-y-4">
        
        {/* Barre de navigation simple du RC (3 onglets prévus par AGENTS.md) */}
        <nav className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab("fiches")}
            className={`flex-1 py-2.5 px-1 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "fiches"
                ? "bg-[#e0f2e9] text-[#005c30]"
                : "hover:text-slate-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Mes fiches</span>
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex-1 py-2.5 px-1 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "notifications"
                ? "bg-[#e0f2e9] text-[#005c30]"
                : "hover:text-slate-900"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => setActiveTab("compte")}
            className={`flex-1 py-2.5 px-1 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "compte"
                ? "bg-[#e0f2e9] text-[#005c30]"
                : "hover:text-slate-900"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Mon compte</span>
          </button>
        </nav>

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 1 : MES FICHES */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "fiches" && (
          <section className="space-y-3.5">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-1">
              <h2 className="text-sm font-extrabold text-slate-900">
                Surveillance à base communautaire
              </h2>
              <p className="text-xs text-slate-500">
                Vos saisies sont directement transmises à votre superviseur ASCQ.
              </p>
            </div>

            {/* Fiche 1 : Registre communautaire */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3 hover:border-emerald-300 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Registre communautaire
                    </h3>
                    <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      Actif
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Suivi régulier des ménages, signaux d'événements et décompte des cas observés.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <Link
                  href="/fiches"
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                >
                  Voir mes saisies
                </Link>
                <Link
                  href="/fiches/registre/nouvelle"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-700 hover:bg-blue-800 text-white shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>Renseigner le registre</span>
                </Link>
              </div>
            </div>

            {/* Fiche 2 : Notification d'alerte (Active en Phase 6) */}
            <div className="bg-white rounded-3xl p-5 border-2 border-emerald-500 shadow-md space-y-3 hover:border-emerald-600 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#005c30] flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Notification d'alerte
                    </h3>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Actif
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Signalement immédiat d'une maladie à potentiel épidémique, épizootie ou symptôme suspect.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <Link
                  href="/fiches"
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                >
                  Voir mes alertes
                </Link>
                <Link
                  href="/fiches/alerte/nouvelle"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#005c30] hover:bg-[#004724] text-white shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>Notifier une alerte</span>
                </Link>
              </div>
            </div>

            {/* Fiche 3 : Notification de décès */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3 hover:border-purple-300 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Skull className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Notification de décès
                    </h3>
                    <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      Actif
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Notification des décès communautaires (néonatal, maternel ou autre).
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <Link
                  href="/fiches"
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                >
                  Voir les déclarations
                </Link>
                <Link
                  href="/fiches/deces/nouvelle"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-purple-700 hover:bg-purple-800 text-white shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>Déclarer un décès</span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 2 : NOTIFICATIONS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "notifications" && (
          <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#005c30] flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm">
                Aucune notification
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Les consignes et alertes de votre superviseur ASCQ s'afficheront directement ici.
              </p>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ONGLET 3 : MON COMPTE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "compte" && rcData && (
          <section className="space-y-4">
            
            {/* Carte Identité du RC */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#005c30] text-white flex items-center justify-center font-extrabold text-base">
                  {rcData.prenoms?.[0]}{rcData.nom?.[0]}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base uppercase">
                    {rcData.nom} {rcData.prenoms}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#005c30] bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5">
                    <ShieldCheck className="w-3 h-3" />
                    Relais Communautaire Actif
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Téléphone :</span>
                  <span className="font-bold text-slate-800">{rcData.telephone}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Village :</span>
                  <span className="font-bold text-slate-800">{rcData.village_nom || "Non précisé"}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Grappe assignée :</span>
                  <span className="font-bold text-slate-800">
                    Grappe {rcData.grappe} {rcData.nom_grappe ? `(${rcData.nom_grappe})` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Carte Mon ASCQ Référent */}
            <div className="bg-[#e8f5ee] rounded-3xl p-5 border border-[#c6e4d2] space-y-3">
              <div className="flex items-center gap-2 text-[#005c30]">
                <User className="w-4 h-4 font-bold" />
                <h4 className="font-bold text-xs uppercase tracking-wide">
                  Mon Superviseur ASCQ
                </h4>
              </div>

              <div>
                <p className="font-extrabold text-sm text-slate-900 uppercase">
                  {rcData.ascq_nom} {rcData.ascq_prenoms}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Agent de Santé Communautaire Qualifié
                </p>
              </div>

              {rcData.ascq_telephone && (
                <a
                  href={`tel:${rcData.ascq_telephone}`}
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#005c30] text-white font-bold text-xs shadow-sm hover:bg-[#004724] active:scale-95 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Appeler mon ASCQ : {rcData.ascq_telephone}</span>
                </a>
              )}
            </div>

            {/* Sécurité : Changement de mot de passe */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
              <button
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="w-full text-left flex items-center justify-between text-xs font-bold text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Changer mon mot de passe</span>
                </div>
                <span className="text-slate-400 text-xs">
                  {isChangingPassword ? "Fermer" : "Modifier"}
                </span>
              </button>

              {isChangingPassword && (
                <form onSubmit={handleChangePassword} className="space-y-3 pt-2 border-t border-slate-100">
                  {pwdMsg && (
                    <div
                      className={`p-2.5 rounded-xl text-xs ${
                        pwdMsg.error
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {pwdMsg.text}
                    </div>
                  )}

                  <input
                    type="password"
                    required
                    value={nouveauMdp}
                    onChange={(e) => setNouveauMdp(e.target.value)}
                    placeholder="Nouveau mot de passe"
                    className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />

                  <input
                    type="password"
                    required
                    value={confirmMdp}
                    onChange={(e) => setConfirmMdp(e.target.value)}
                    placeholder="Confirmer le nouveau mot de passe"
                    className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />

                  <button
                    type="submit"
                    disabled={pwdLoading}
                    className="w-full py-2 px-3 rounded-xl bg-[#005c30] text-white font-bold text-xs shadow-sm hover:bg-[#004724] transition-all"
                  >
                    {pwdLoading ? "Enregistrement..." : "Mettre à jour le mot de passe"}
                  </button>
                </form>
              )}
            </div>

            {/* Déconnexion */}
            <div className="pt-2">
              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-red-600 bg-white hover:bg-red-50 border border-red-200 shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Se déconnecter</span>
              </button>
            </div>

          </section>
        )}

      </main>
    </div>
  );
}
