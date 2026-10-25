"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, 
  MapPin, 
  User, 
  Calendar, 
  Clock, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Flame, 
  FileText, 
  Lock, 
  RefreshCw,
  AlertCircle,
  Phone,
  Check
} from "lucide-react";
import { corrigerAccents, getNomTypeAlerte } from "@/lib/fiches";

export default function DetailAlertePage() {
  const params = useParams();
  const router = useRouter();
  const alerteId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [alerte, setAlerte] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // État pour la vérification par l'ASCQ superviseur
  const [verifResultat, setVerifResultat] = useState<"AVEREE" | "NON_AVEREE">("AVEREE");
  const [verifCommentaire, setVerifCommentaire] = useState("");
  const [verifLoading, setVerifLoading] = useState(false);
  const [verifSuccess, setVerifSuccess] = useState<string | null>(null);

  const chargerAlerte = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/connexion");
        return;
      }

      // Profil
      const { data: profil } = await supabase
        .from("utilisateurs")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profil);

      // Charger le détail de l'alerte via RPC
      const { data, error } = await supabase.rpc("obtenir_detail_alerte", {
        p_alerte_id: alerteId,
      });

      if (error) throw error;
      setAlerte(data);

    } catch (err: any) {
      console.error("Erreur chargement alerte:", err);
      setErrorMsg(err.message || "Impossible de charger les détails de cette alerte.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (alerteId) {
      chargerAlerte();
    }
  }, [alerteId]);

  const handleVerifier = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifLoading(true);
    setVerifSuccess(null);
    try {
      const { data, error } = await supabase.rpc("verifier_alerte", {
        p_alerte_id: alerteId,
        p_resultat: verifResultat,
        p_commentaire: verifCommentaire || null,
      });

      if (error) throw error;

      setVerifSuccess(data?.message || "L'alerte a été vérifiée avec succès !");
      await chargerAlerte();

    } catch (err: any) {
      alert(err.message || "Erreur lors de la vérification de l'alerte.");
    } finally {
      setVerifLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="text-center space-y-2 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#005c30]" />
          <p className="text-xs font-semibold">Chargement de la fiche d'alerte...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !alerte) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-slate-200 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-extrabold text-slate-900">Alerte introuvable</h2>
          <p className="text-xs text-slate-500">{errorMsg || "Cette alerte n'existe pas ou vos droits ne vous permettent pas d'y accéder."}</p>
          <Link
            href="/fiches"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005c30] text-white text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux fiches</span>
          </Link>
        </div>
      </div>
    );
  }

  const isPrioritaire = alerte.est_prioritaire;

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-24">
      
      {/* 1. En-tête officiel */}
      <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/fiches"
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold">Mes fiches</span>
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-extrabold font-mono tracking-tight">{alerte.numero_alerte}</h1>
            <p className="text-[10px] text-white/80">Semaine {alerte.semaine_epidemio} / {alerte.annee}</p>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Bandeau tricolore béninois */}
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-4">
        
        {/* En-tête de la fiche d'alerte */}
        <div className={`p-5 rounded-3xl border shadow-sm space-y-3 ${
          isPrioritaire
            ? "bg-red-50/40 border-red-300"
            : "bg-white border-slate-200/80"
        }`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-mono text-xs font-black text-[#005c30] bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
              {alerte.numero_alerte}
            </span>

            {/* Statut vérification */}
            {alerte.resultat_verification === "AVEREE" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Alerte Avérée</span>
              </span>
            ) : alerte.resultat_verification === "NON_AVEREE" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                <XCircle className="w-4 h-4 text-slate-500" />
                <span>Alerte Non Avérée</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>En attente de vérification</span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">
                {getNomTypeAlerte(alerte.type_alerte_code, alerte.type_alerte_nom)}
              </h2>
              {isPrioritaire && (
                <span className="text-[10px] font-black uppercase text-red-700 bg-red-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-600" />
                  <span>Prioritaire</span>
                </span>
              )}
            </div>
            {alerte.autre_evenement_precision && (
              <p className="text-xs text-slate-600 italic mt-1">
                « {alerte.autre_evenement_precision} »
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Semaine épidémiologique :</span>
            <strong className="text-slate-700">Semaine {alerte.semaine_epidemio} ({alerte.annee})</strong>
          </div>
        </div>

        {/* 1. Cadre Localisation */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-[#005c30]">
            <MapPin className="w-5 h-5" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Localisation de l'événement
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Département</span>
              <strong className="font-extrabold text-slate-900">{alerte.departement_nom}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Commune</span>
              <strong className="font-extrabold text-slate-900">{alerte.commune_nom}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Arrondissement</span>
              <strong className="font-extrabold text-slate-900">{alerte.arrondissement_nom}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Village / Quartier</span>
              <strong className="font-extrabold text-[#005c30]">{alerte.village_nom}</strong>
            </div>
          </div>

          {(alerte.numero_grappe || alerte.nom_grappe) && (
            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between">
              <span>Grappe :</span>
              <strong>N° {alerte.numero_grappe} {alerte.nom_grappe ? `(${alerte.nom_grappe})` : ""}</strong>
            </div>
          )}

          {alerte.gps_latitude && alerte.gps_longitude && (
            <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
              <span>Coordonnées GPS :</span>
              <span className="font-mono text-[11px] text-slate-700">
                Lat {alerte.gps_latitude}, Lon {alerte.gps_longitude}
              </span>
            </div>
          )}
        </div>

        {/* 2. Cadre Identité du Cas (Données de santé protégées) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#005c30]">
              <User className="w-5 h-5" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Identité du cas index
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              <Lock className="w-3 h-3" />
              <span>Protégé RLS</span>
            </span>
          </div>

          {alerte.cas_prive ? (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Nom & Prénoms</span>
                  <strong className="font-extrabold text-slate-900 text-sm">
                    {alerte.cas_prive.nom} {alerte.cas_prive.prenoms}
                  </strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Sexe & Âge</span>
                  <strong className="font-extrabold text-slate-900 text-sm">
                    {alerte.sexe === "M" ? "Masculin" : "Féminin"} • {alerte.age_valeur} {alerte.age_unite?.toLowerCase()}
                  </strong>
                </div>
              </div>

              {alerte.cas_prive.telephone && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Téléphone :</span>
                  </span>
                  <strong className="text-slate-900 font-bold">{alerte.cas_prive.telephone}</strong>
                </div>
              )}

              {alerte.cas_prive.adresse && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Adresse exacte</span>
                  <p className="font-medium text-slate-800 mt-0.5">{alerte.cas_prive.adresse}</p>
                </div>
              )}

              {alerte.cas_prive.npi && (
                <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                  <span>NPI du cas :</span>
                  <strong className="font-mono text-slate-700">{alerte.cas_prive.npi}</strong>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Données nominatives masquées conformément à la politique de confidentialité.
            </p>
          )}
        </div>

        {/* 3. Cadre Signes et Symptômes constatés */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-[#005c30]">
            <Activity className="w-5 h-5" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Signes et symptômes constatés
            </h3>
          </div>

          {alerte.symptomes_noms && alerte.symptomes_noms.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {alerte.symptomes_noms.map((nom: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 text-[#005c30] font-bold text-xs border border-emerald-100"
                >
                  ✓ {corrigerAccents(nom)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Aucun symptôme spécifique coché.</p>
          )}

          {alerte.autre_symptome_precision && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <span className="text-slate-400 block text-[11px]">Autres symptômes précisés :</span>
              <p className="font-medium text-slate-800">{alerte.autre_symptome_precision}</p>
            </div>
          )}
        </div>

        {/* 4. Cadre Bilan d'impact & Délais */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-[#005c30]">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Bilan d'impact & Délais
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-slate-400 block text-[11px]">Personnes touchées</span>
              <strong className="text-lg font-black text-slate-900">{alerte.nb_personnes_touchees}</strong>
            </div>

            <div className={`p-3 rounded-2xl border text-center ${
              alerte.nb_personnes_mortes > 0
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-slate-50 border-slate-100 text-slate-900"
            }`}>
              <span className="text-[11px] opacity-75 block">Personnes décédées</span>
              <strong className="text-lg font-black">{alerte.nb_personnes_mortes}</strong>
            </div>
          </div>

          {alerte.animaux_impliques && (
            <div className="grid grid-cols-2 gap-3 text-xs p-3 bg-amber-50 rounded-2xl border border-amber-100">
              <div>
                <span className="text-amber-800 block text-[11px]">Animaux malades</span>
                <strong className="text-base font-bold text-amber-900">{alerte.nb_animaux_malades}</strong>
              </div>
              <div>
                <span className="text-amber-800 block text-[11px]">Animaux morts</span>
                <strong className="text-base font-bold text-amber-900">{alerte.nb_animaux_morts}</strong>
              </div>
            </div>
          )}

          <div className="space-y-1.5 pt-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Date de détection :</span>
              <strong>{alerte.date_detection} {alerte.heure_detection ? `(${alerte.heure_detection})` : ""}</strong>
            </div>
            <div className="flex justify-between">
              <span>Date de notification :</span>
              <strong>{alerte.date_notification}</strong>
            </div>
            <div className="flex justify-between">
              <span>Délai détection → notification :</span>
              <strong className="text-[#005c30]">{alerte.delai_detection_notification_heures || 0} heure(s)</strong>
            </div>
          </div>

          {alerte.mesures_prises && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <span className="text-slate-400 block text-[11px]">Mesures immédiates prises :</span>
              <p className="font-medium text-slate-800 mt-0.5">{alerte.mesures_prises}</p>
            </div>
          )}
        </div>

        {/* 5. Cadre Notificateur */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-2 text-xs">
          <div className="flex items-center gap-2 text-[#005c30]">
            <FileText className="w-5 h-5" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Notificateur officiel
            </h3>
          </div>

          <div className="flex justify-between pt-1">
            <span className="text-slate-400">Agent notificateur :</span>
            <strong className="text-slate-900">{alerte.notificateur_titre} : {alerte.notificateur_nom_complet}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Téléphone de l'agent :</span>
            <strong className="text-slate-900">{alerte.notificateur_telephone}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Centre de santé :</span>
            <strong className="text-slate-900">{alerte.centre_sante_nom || "CSC"}</strong>
          </div>
        </div>

        {/* 6. Zone de vérification (ASCQ Superviseur) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900">
              Vérification de l'alerte
            </h3>
            <span className="text-[11px] font-bold text-slate-400">
              ASCQ Superviseur
            </span>
          </div>

          {alerte.resultat_verification !== "EN_ATTENTE" ? (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Statut vérifié :</span>
                <span className={`font-extrabold px-2.5 py-0.5 rounded-lg ${
                  alerte.resultat_verification === "AVEREE"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-700"
                }`}>
                  {alerte.resultat_verification === "AVEREE" ? "Alerte Avérée" : "Alerte Non avérée"}
                </span>
              </div>
              {alerte.commentaire_verification && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Commentaire de vérification :</span>
                  <p className="font-medium text-slate-800 italic mt-0.5">
                    « {alerte.commentaire_verification} »
                  </p>
                </div>
              )}
              {alerte.date_verification && (
                <div className="text-[11px] text-slate-400 pt-1">
                  Vérifiée le {new Date(alerte.date_verification).toLocaleString("fr-FR")}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleVerifier} className="space-y-3">
              <p className="text-xs text-slate-500">
                En tant qu'ASCQ superviseur, confirmez si cette alerte est avérée après vos vérifications d'usage.
              </p>

              {verifSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{verifSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVerifResultat("AVEREE")}
                  className={`py-2.5 text-xs font-extrabold rounded-2xl border transition-all flex items-center justify-center gap-1.5 ${
                    verifResultat === "AVEREE"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                      : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Alerte Avérée</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVerifResultat("NON_AVEREE")}
                  className={`py-2.5 text-xs font-extrabold rounded-2xl border transition-all flex items-center justify-center gap-1.5 ${
                    verifResultat === "NON_AVEREE"
                      ? "bg-slate-700 text-white border-slate-700 shadow-md"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Non Avérée</span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Commentaire ou observations de vérification :
                </label>
                <textarea
                  rows={2}
                  placeholder="Observations sur le terrain, confirmation clinique..."
                  value={verifCommentaire}
                  onChange={(e) => setVerifCommentaire(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30]"
                />
              </div>

              <button
                type="submit"
                disabled={verifLoading}
                className="w-full py-3 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {verifLoading ? (
                  <span>Enregistrement en cours...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Enregistrer la vérification officielle</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

      </main>
    </div>
  );
}
