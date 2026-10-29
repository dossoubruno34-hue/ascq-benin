"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Stethoscope,
  HeartPulse,
  Activity,
  CheckCircle2,
  AlertTriangle,
  User,
  MapPin,
  Calendar,
  Clock,
  Printer,
  Save,
  Check,
  Send,
  Sparkles,
  ShieldAlert,
  Info,
  Pill,
  FileText
} from "lucide-react";
import { enqueueOfflineItem, getCachedUserSession, getCachedMonEspace } from "@/lib/offline-sync";

// 1. Référentiel des signes principaux
const SIGNES_PRINCIPAUX = [
  "Fièvre (≥ 37.5°C ou sensation de chaleur)",
  "Diarrhée (≥ 3 selles liquides par 24h)",
  "Toux ou difficultés respiratoires",
  "Vomissements fréquents",
  "Faiblesse extrême / Altération de l'état général",
  "Amaigrissement visible ou gonflement des membres (Malnutrition)",
  "Éruption cutanée ou boutons anormaux",
  "Douleurs abdominales intenses",
  "Lésions cutanées / Plaies",
  "Autre symptôme inhabituel"
];

// 2. Signes secondaires et signes généraux de danger (PCIME-C)
const SIGNES_SECONDAIRES_DANGER = [
  "Incapacité de boire ou de téter",
  "Vomissements incoercibles (vomit tout)",
  "Convulsions récentes ou en cours",
  "Léthargie, somnolence excessive ou perte de connaissance",
  "Tirage sous-costal (creusement du thorax)",
  "Respiration anormalement rapide",
  "Pâleur palmaire intense",
  "Œdèmes bilatéraux prenant le godet",
  "Pli cutané s'effaçant très lentement",
  "Sang dans les selles (dysenterie)",
  "Raideur de la nuque",
  "Température très élevée (> 39.5°C)"
];

// 3. Diagnostics possibles
const DIAGNOSTICS_POSSIBLES = [
  "Paludisme simple confirmé (TDR+)",
  "Paludisme grave suspecté (TDR+ avec signe de danger)",
  "Diarrhée aiguë sans déshydratation",
  "Diarrhée aiguë avec déshydratation modérée",
  "Diarrhée sévère / Suspicion Choléra",
  "Infection respiratoire aiguë simple (Toux / Rhume)",
  "Pneumonie simple (Toux + Respiration rapide)",
  "Pneumonie grave suspectée (avec tirage sous-costal)",
  "Malnutrition Aiguë Modérée (MAM)",
  "Malnutrition Aiguë Sévère (MAS)",
  "Anémie clinique suspectée",
  "Parasitose intestinale",
  "Infection cutanée bénigne",
  "Autre affection bénigne"
];

// 4. Intrants et produits officiels de prise en charge communautaire ASCQ (11 produits officiels + Enveloppement humide + Autre)
const PRODUITS_OFFICIELS_ASCQ = [
  { id: "cta", nom: "CTA (ACT - Artéméther/Luméfantrine)", unite: "comprimés", dosageDefaut: "6 comprimés (selon poids)" },
  { id: "sro", nom: "SRO (Sels de Réhydratation Orale)", unite: "sachets", dosageDefaut: "2 sachets dans 2L d'eau propre" },
  { id: "zinc", nom: "ZINC (Comprimés dispersibles 20mg)", unite: "comprimés", dosageDefaut: "1 cp/jour pendant 10 jours" },
  { id: "amoxi", nom: "AMOXI (Amoxicilline 250mg dispersible)", unite: "comprimés", dosageDefaut: "2 cp 2x/jour pendant 5 jours" },
  { id: "para", nom: "PARA (Paracétamol)", unite: "comprimés/sirop", dosageDefaut: "1 dose toutes les 6h si fièvre" },
  { id: "enveloppement_humide", nom: "Enveloppement humide (linges tièdes)", unite: "procédure", dosageDefaut: "Linges humides tièdes appliqués 15-20 min pour faire baisser la fièvre" },
  { id: "alben", nom: "ALBEN / MEBEN (Albendazole / Mébendazole)", unite: "comprimés", dosageDefaut: "1 dose unique" },
  { id: "aquatab", nom: "AQUATABS (Purification d'eau)", unite: "comprimés", dosageDefaut: "1 cp pour 20L d'eau" },
  { id: "fer_folique", nom: "FER et acide folique", unite: "comprimés", dosageDefaut: "1 cp/jour" },
  { id: "plumpy", nom: "Plumpy'Nut (Prompt Nut - ATPE)", unite: "sachets", dosageDefaut: "2 à 3 sachets par jour" },
  { id: "enov_mum", nom: "Enov'Mum+", unite: "sachets", dosageDefaut: "1 sachet par jour" },
  { id: "nutributter", nom: "Nutributter+", unite: "sachets", dosageDefaut: "1 sachet par jour" },
  { id: "autre_produit", nom: "Autre geste / soin (à préciser)", unite: "libre", dosageDefaut: "Selon besoin clinique" }
];

// Suggestions rapides de premiers gestes avant référence
const SUGGESTIONS_PREMIERS_GESTES = [
  "Enveloppement humide (linges humides tièdes pour faire baisser la fièvre)",
  "Première dose de Paracétamol administrée pour faire baisser la fièvre",
  "SRO par cuillerée / Réhydratation orale immédiate",
  "Position Latérale de Sécurité (PLS)",
  "Libération des voies respiratoires",
  "Autre geste (à préciser)"
];

// 5. Thèmes de sensibilisation
const THEMES_SENSIBILISATION = [
  "Respect strict du traitement jusqu'au bout, même si le malade semble guéri",
  "Dormir chaque nuit sous moustiquaire imprégnée (MILDA)",
  "Lavage systématique des mains à l'eau propre et au savon aux moments clés",
  "Utilisation exclusive d'eau potable traitée (Aquatabs / ébullition)",
  "Alimentation riche et allaitement maternel continu",
  "Surveillance des signes de danger nécessitant une référence immédiate au Centre de Santé"
];

export default function NouvelleConsultationPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Étape 1 : Patient & Localisation
  const [village, setVillage] = useState("");
  const [nomPatient, setNomPatient] = useState("");
  const [prenomsPatient, setPrenomsPatient] = useState("");
  const [ageValeur, setAgeValeur] = useState<number>(3);
  const [ageUnite, setAgeUnite] = useState<"ANS" | "MOIS" | "JOURS">("ANS");
  const [sexe, setSexe] = useState<"M" | "F">("M");
  const [nomParentTuteur, setNomParentTuteur] = useState("");
  const [telephoneContact, setTelephoneContact] = useState("");

  // Détection patient de plus de 5 ans (> 5 ans ou > 59 mois)
  const isPlusDe5Ans = (ageUnite === "ANS" && Number(ageValeur) > 5) || (ageUnite === "MOIS" && Number(ageValeur) > 59);

  // Étape 2 : Signes & Dépistage
  const [signePrincipal, setSignePrincipal] = useState(SIGNES_PRINCIPAUX[0]);
  const [signePrincipalAutre, setSignePrincipalAutre] = useState("");
  const [signesSecondaires, setSignesSecondaires] = useState<string[]>([]);
  const [tdrPaludisme, setTdrPaludisme] = useState<"POSITIF" | "NEGATIF" | "NON_FAIT">("NON_FAIT");
  const [diagnosticPossible, setDiagnosticPossible] = useState(DIAGNOSTICS_POSSIBLES[0]);
  const [diagnosticAutre, setDiagnosticAutre] = useState("");

  // Étape 3 : Décision clinique
  const [decision, setDecision] = useState<"PRISE_EN_CHARGE_COMMUNAUTAIRE" | "REFERER_CS">("PRISE_EN_CHARGE_COMMUNAUTAIRE");

  // Si Prise en charge communautaire
  const [produitsChoisis, setProduitsChoisis] = useState<Array<{ id: string; nom: string; quantite: string; posologie: string }>>([]);
  const [themeSensibilisation, setThemeSensibilisation] = useState(THEMES_SENSIBILISATION[0]);
  const [dateRdvSuivi, setDateRdvSuivi] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });

  // Si Référé au Centre de Santé
  const [premierGestePose, setPremierGestePose] = useState("Enveloppement humide (linges humides tièdes pour faire baisser la fièvre)");
  const [premierGesteAutre, setPremierGesteAutre] = useState("");
  const [structureCsDestination, setStructureCsDestination] = useState("Centre de Santé de l'Arrondissement");
  const [observations, setObservations] = useState("");

  // Pour tout patient de plus de 5 ans, orienter et basculer systématiquement vers la référence au CS
  useEffect(() => {
    if (isPlusDe5Ans) {
      setDecision("REFERER_CS");
    }
  }, [ageValeur, ageUnite, isPlusDe5Ans]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        let user: any = null;
        let profil: any = null;

        if (navigator.onLine) {
          try {
            const { data } = await supabase.auth.getUser();
            user = data?.user;
          } catch {}
        }

        if (!user) {
          const cachedSession = getCachedUserSession();
          user = cachedSession.user;
          profil = cachedSession.profile;
        }

        if (user && !profil) {
          try {
            const { data } = await supabase
              .from("utilisateurs")
              .select("*, departements(nom), communes(nom), arrondissements(nom)")
              .eq("id", user.id)
              .maybeSingle();
            profil = data;
          } catch {}
        }

        if (!user && !profil) {
          const monEspace = getCachedMonEspace();
          if (monEspace) {
            profil = monEspace;
          }
        }

        if (!user && !profil) {
          router.push("/connexion");
          return;
        }

        setCurrentUser(profil);
        if (profil?.commune_nom) {
          setStructureCsDestination(`Centre de Santé Communal de ${profil.commune_nom}`);
        }
        if (profil?.arrondissement_nom) {
          setVillage(`Arrondissement de ${profil.arrondissement_nom}`);
        }

      } catch (err) {
        console.warn("Bascule locale nouvelle consultation:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  // Gestion de la sélection des signes secondaires
  const toggleSigneSecondaire = (signe: string) => {
    if (signesSecondaires.includes(signe)) {
      setSignesSecondaires(signesSecondaires.filter((s) => s !== signe));
    } else {
      setSignesSecondaires([...signesSecondaires, signe]);
      // Si un signe général de danger est coché, suggérer automatiquement la référence
      if (
        signe.includes("Vomissements incoercibles") ||
        signe.includes("Convulsions") ||
        signe.includes("Léthargie") ||
        signe.includes("Tirage sous-costal") ||
        signe.includes("Incapacité de boire")
      ) {
        setDecision("REFERER_CS");
      }
    }
  };

  // Gestion des produits utilisés
  const toggleProduit = (produit: typeof PRODUITS_OFFICIELS_ASCQ[0]) => {
    const existe = produitsChoisis.find((p) => p.id === produit.id);
    if (existe) {
      setProduitsChoisis(produitsChoisis.filter((p) => p.id !== produit.id));
    } else {
      setProduitsChoisis([
        ...produitsChoisis,
        {
          id: produit.id,
          nom: produit.nom,
          quantite: "1 boîte / flacon",
          posologie: produit.dosageDefaut,
        },
      ]);
    }
  };

  const updateProduitPosologie = (id: string, champ: "quantite" | "posologie", valeur: string) => {
    setProduitsChoisis(
      produitsChoisis.map((p) => (p.id === id ? { ...p, [champ]: valeur } : p))
    );
  };

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!village.trim()) {
      setErrorMsg("Veuillez indiquer le village.");
      return;
    }
    if (!nomPatient.trim() || !prenomsPatient.trim()) {
      setErrorMsg("Veuillez renseigner le nom et le prénom du patient.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const signeFinal = signePrincipal === "Autre symptôme inhabituel" && signePrincipalAutre.trim()
      ? signePrincipalAutre.trim()
      : signePrincipal;

    const diagnosticFinal = diagnosticPossible === "Autre affection bénigne" && diagnosticAutre.trim()
      ? diagnosticAutre.trim()
      : diagnosticPossible;

    const gesteFinal = premierGestePose.includes("Autre") && premierGesteAutre.trim()
      ? `Autre: ${premierGesteAutre.trim()}`
      : premierGestePose;

    const payload = {
      ascq_id: currentUser?.id || null,
      ascq_nom: currentUser ? `${currentUser.prenoms} ${currentUser.nom}` : "ASCQ Bénin",
      village: village.trim(),
      nom_patient: nomPatient.trim().toUpperCase(),
      prenoms_patient: prenomsPatient.trim(),
      age_valeur: Number(ageValeur) || 1,
      age_unite: ageUnite,
      sexe,
      nom_parent_tuteur: nomParentTuteur.trim() || null,
      telephone_contact: telephoneContact.trim() || null,
      signe_principal: signeFinal,
      signes_secondaires: signesSecondaires,
      tdr_paludisme: tdrPaludisme,
      diagnostic_possible: diagnosticFinal,
      decision,
      produits_utilises: decision === "PRISE_EN_CHARGE_COMMUNAUTAIRE" ? produitsChoisis : [],
      theme_sensibilisation: decision === "PRISE_EN_CHARGE_COMMUNAUTAIRE" ? themeSensibilisation : null,
      date_rendez_vous_suivi: decision === "PRISE_EN_CHARGE_COMMUNAUTAIRE" ? dateRdvSuivi : null,
      premier_geste_pose: decision === "REFERER_CS" ? gesteFinal.trim() : null,
      structure_cs_destination: decision === "REFERER_CS" ? structureCsDestination.trim() : null,
      observations: observations.trim() || null,
      date_consultation: new Date().toISOString().split("T")[0],
    };

    try {
      // 1. Si référé au Centre de Santé, générer également une référence officielle
      let refCreee: any = null;
      if (decision === "REFERER_CS") {
        const now = new Date();
        const annee = now.getFullYear();
        const semaine = Math.ceil((((now.getTime() - new Date(annee, 0, 1).getTime()) / 86400000) + 1) / 7);
        const numeroRef = `REF-${annee}-W${String(semaine).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`;

        const refPayload = {
          numero_reference: numeroRef,
          type_reference: "SANTE",
          destination_type: "CENTRE_SANTE",
          destination_nom: structureCsDestination.trim(),
          motif_code: "MOTIF_CLINIQUE",
          motif_libelle: `${diagnosticFinal} (${signeFinal})`,
          motif_details: `Signe principal: ${signeFinal}. Signes de gravité: ${signesSecondaires.join(", ") || "Aucun"}. TDR: ${tdrPaludisme}. 1er geste administré: ${gesteFinal}`,
          degre_urgence: signesSecondaires.length > 0 ? "TRES_URGENT" : "URGENT",
          one_health_concerne: false,
          semaine_epidemio: semaine,
          annee: annee,
          village_nom: village.trim(),
          nom_patient: nomPatient.trim().toUpperCase(),
          prenoms_patient: prenomsPatient.trim(),
          sexe,
          age_valeur: Number(ageValeur) || 1,
          age_unite: ageUnite,
          telephone_contact: telephoneContact.trim() || null,
          nom_parent_tuteur: nomParentTuteur.trim() || null,
          statut: "VALIDEE",
          ascq_id: currentUser?.id || null,
          ascq_nom: currentUser ? `${currentUser.prenoms} ${currentUser.nom}` : "ASCQ Bénin",
        };

        if (navigator.onLine) {
          try {
            const { data: insRef } = await supabase.from("references_communautaires").insert(refPayload).select().single();
            refCreee = insRef || refPayload;
          } catch {
            enqueueOfflineItem("REFERENCE", refPayload);
            refCreee = refPayload;
          }
        } else {
          enqueueOfflineItem("REFERENCE", refPayload);
          refCreee = refPayload;
        }
      }

      // 2. Insérer la consultation
      if (navigator.onLine) {
        try {
          const { data: insCons, error: insErr } = await supabase
            .from("consultations_communautaires")
            .insert({
              ...payload,
              reference_id: refCreee?.id || null,
            })
            .select()
            .single();

          if (insErr) throw insErr;
          setSuccessResult({
            ...payload,
            id: insCons?.id || "temp",
            reference: refCreee,
            isOffline: false,
          });
          return;
        } catch (e) {
          console.warn("Échec insertion consultation sur serveur, sauvegarde locale:", e);
        }
      }

      // 3. Fallback Hors-Ligne
      enqueueOfflineItem("CONSULTATION", {
        ...payload,
        reference: refCreee,
      });

      setSuccessResult({
        ...payload,
        id: `local_${Date.now()}`,
        reference: refCreee,
        isOffline: true,
      });

    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="text-center space-y-2 text-slate-500">
          <Activity className="w-8 h-8 animate-spin mx-auto text-[#005c30]" />
          <p className="text-xs font-semibold">Chargement du module de soins iCCM...</p>
        </div>
      </div>
    );
  }

  const isRelais =
    currentUser?.role_technique === "RELAIS" ||
    currentUser?.role_technique === "RELAIS_COMMUNAUTAIRE" ||
    currentUser?.poste === "RC";

  if (!loading && isRelais) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-300 shadow-xl space-y-5 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200 shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
              Périmètre Clinique Strict
            </span>
            <h2 className="text-lg font-black text-slate-900">
              Module Réservé aux ASCQ Qualifiés
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              En tant que <strong>Relais Communautaire (RC)</strong>, vous n'avez pas l'habilitation pour réaliser une consultation clinique directe ni administrer ou délivrer des médicaments (CTA, Amoxicilline, SRO/Zinc, etc.).
            </p>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-left text-xs text-emerald-900 leading-relaxed">
              💡 <strong>Rôle du Relais Communautaire :</strong> Vous devez établir immédiatement une <strong>Référence</strong> vers :
              <ul className="list-disc list-inside mt-1 font-semibold space-y-0.5">
                <li>Votre <strong>ASCQ Superviseur</strong> (iCCM au village)</li>
                <li>Le <strong>Centre de Santé (CS)</strong> (dispensaire / maternité)</li>
                <li>Le <strong>GUPS</strong> (protection sociale, indigent, VBG)</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/relais/reference/nouvelle"
              className="w-full py-3 px-4 rounded-xl text-xs font-black bg-[#005c30] hover:bg-[#004724] text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Référer le cas (ASCQ / CS / GUPS)</span>
            </Link>
            <Link
              href="/espace-rc"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Retourner à Mon Espace RC
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ÉCRAN DE SUCCÈS
  if (successResult) {
    const isPec = successResult.decision === "PRISE_EN_CHARGE_COMMUNAUTAIRE";

    return (
      <div className="min-h-screen bg-[#f4f7f5] p-4 flex items-center justify-center pb-20">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-md text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#005c30] flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {successResult.isOffline ? "💾 Enregistré Hors-Ligne" : "✓ Enregistré avec succès"}
            </span>
            <h1 className="text-lg font-black text-slate-900 mt-2">
              {isPec ? "Prise en Charge Communautaire Enregistrée" : "Référence au Centre de Santé Validée"}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Patient : <strong className="text-slate-900">{successResult.nom_patient} {successResult.prenoms_patient}</strong> ({successResult.age_valeur} {successResult.age_unite.toLowerCase()})
            </p>
          </div>

          {/* RÉSUMÉ CLINIQUE */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2.5">
            <div className="flex justify-between border-b pb-1.5 border-slate-200">
              <span className="text-slate-500">Village :</span>
              <strong className="text-slate-800">{successResult.village}</strong>
            </div>
            <div className="flex justify-between border-b pb-1.5 border-slate-200">
              <span className="text-slate-500">Signe principal :</span>
              <strong className="text-[#005c30]">{successResult.signe_principal}</strong>
            </div>
            <div className="flex justify-between border-b pb-1.5 border-slate-200">
              <span className="text-slate-500">TDR Paludisme :</span>
              <strong className={successResult.tdr_paludisme === "POSITIF" ? "text-red-700 font-extrabold" : "text-slate-800"}>
                {successResult.tdr_paludisme}
              </strong>
            </div>
            <div className="flex justify-between border-b pb-1.5 border-slate-200">
              <span className="text-slate-500">Diagnostic possible :</span>
              <strong className="text-slate-900">{successResult.diagnostic_possible}</strong>
            </div>

            {isPec ? (
              <div className="pt-1 space-y-1">
                <span className="text-slate-500 block font-bold">Produits administrés :</span>
                <ul className="list-disc pl-4 text-[11px] text-slate-700 space-y-0.5">
                  {successResult.produits_utilises.map((p: any, idx: number) => (
                    <li key={idx}><strong>{p.nom}</strong> — {p.posologie}</li>
                  ))}
                </ul>
                <div className="pt-2 text-[11px] text-emerald-800 font-bold">
                  📅 Rendez-vous de suivi : {successResult.date_rendez_vous_suivi || "Dans 3 jours"}
                </div>
              </div>
            ) : (
              <div className="pt-1 space-y-2 bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-950">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">1er Geste posé avant transfert :</span>
                  <strong>{successResult.premier_geste_pose}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Centre de Santé :</span>
                  <strong>{successResult.structure_cs_destination}</strong>
                </div>
                {successResult.reference?.numero_reference && (
                  <div className="pt-1 border-t border-amber-200 flex items-center justify-between">
                    <span className="text-xs font-bold">N° Référence Officielle :</span>
                    <span className="font-mono font-extrabold text-[#005c30] bg-white px-2 py-0.5 rounded border border-emerald-300">
                      {successResult.reference.numero_reference}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACTIONS & IMPRESSION */}
          <div className="space-y-2 pt-2">
            {!isPec && (
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-3 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ Imprimer le Bulletin de Référence (Aller & Retour)</span>
              </button>
            )}

            <Link
              href="/espace-ascq/consultations"
              className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Consulter le Registre des Consultations</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setSuccessResult(null);
                setNomPatient("");
                setPrenomsPatient("");
                setSignesSecondaires([]);
                setProduitsChoisis([]);
              }}
              className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold"
            >
              + Enregistrer une autre consultation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-28">
      {/* En-tête */}
      <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/espace-ascq/consultations"
            className="flex items-center gap-2 text-white/90 hover:text-white font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Registre</span>
          </Link>
          <span className="font-extrabold text-xs uppercase tracking-wider">
            Prise en charge iCCM
          </span>
          <span className="w-12"></span>
        </div>
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {/* Titre & Description */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-emerald-100 text-[#005c30]">
              <Stethoscope className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#005c30] block">
                Protocole National PCIME-C / Bénin
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Nouvelle Consultation & Prise en Charge
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Enregistrez les soins dispensés au niveau communautaire ou référez le cas vers le Centre de Santé avec le bulletin officiel.
          </p>

          {/* LIAISONS INTELLIGENTES */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px]">
            <Link
              href="/espace-ascq/maternite-enfance"
              className="px-2.5 py-1 rounded-xl bg-pink-50 border border-pink-200 text-pink-900 font-bold hover:bg-pink-100 transition-all flex items-center gap-1 shrink-0"
            >
              <span>👶 Maternité & 1000 Jours</span>
            </Link>
            <Link
              href="/espace-ascq/references"
              className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold hover:bg-amber-100 transition-all flex items-center gap-1 shrink-0"
            >
              <span>🏥 Références CS/GUPS</span>
            </Link>
            <Link
              href="/briefing"
              className="px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-bold hover:bg-blue-100 transition-all flex items-center gap-1 shrink-0"
            >
              <span>📖 Guide SIMR & Vaccins</span>
            </Link>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* SECTION 1 : PATIENT & LOCALISATION */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#005c30] flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>1. Identification du Patient & Localisation</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Village / Hameau de résidence *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Village Kpèdékpo, Zounzounmè..."
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nom de famille *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: DOSSOU"
                    value={nomPatient}
                    onChange={(e) => setNomPatient(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prénoms *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Eric"
                    value={prenomsPatient}
                    onChange={(e) => setPrenomsPatient(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Âge *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={ageValeur}
                    onChange={(e) => setAgeValeur(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unité</label>
                  <select
                    value={ageUnite}
                    onChange={(e) => setAgeUnite(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white font-bold"
                  >
                    <option value="ANS">Ans</option>
                    <option value="MOIS">Mois</option>
                    <option value="JOURS">Jours</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sexe *</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSexe("M")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        sexe === "M" ? "bg-[#005c30] text-white border-[#005c30]" : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      Masculin (M)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSexe("F")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        sexe === "F" ? "bg-[#005c30] text-white border-[#005c30]" : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      Féminin (F)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nom du parent / tuteur</label>
                  <input
                    type="text"
                    placeholder="Nom du père ou de la mère"
                    value={nomParentTuteur}
                    onChange={(e) => setNomParentTuteur(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone de contact</label>
                  <input
                    type="tel"
                    placeholder="Ex: 01 97 00 00 00"
                    value={telephoneContact}
                    onChange={(e) => setTelephoneContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 : SIGNES CLINIQUES & DÉPISTAGE */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#005c30] flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>2. Examen Clinique & Dépistage</span>
            </h2>

            {/* SIGNE PRINCIPAL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Signe principal de consultation *
              </label>
              <select
                value={signePrincipal}
                onChange={(e) => setSignePrincipal(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
              >
                {SIGNES_PRINCIPAUX.map((s, i) => (
                  <option key={i} value={s}>{s}</option>
                ))}
              </select>
              {signePrincipal === "Autre symptôme inhabituel" && (
                <input
                  type="text"
                  required
                  placeholder="Préciser le symptôme observé..."
                  value={signePrincipalAutre}
                  onChange={(e) => setSignePrincipalAutre(e.target.value)}
                  className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              )}
            </div>

            {/* SIGNES SECONDAIRES & DANGER */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Signes secondaires & Signes généraux de danger (Cochez si présent) :
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Tout signe de danger impose une référence d'urgence au Centre de Santé.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SIGNES_SECONDAIRES_DANGER.map((sd, i) => {
                  const checked = signesSecondaires.includes(sd);
                  const isDanger = i < 5;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleSigneSecondaire(sd)}
                      className={`p-2.5 rounded-xl text-left text-xs font-semibold border transition-all flex items-start gap-2 ${
                        checked
                          ? isDanger
                            ? "bg-red-50 border-red-300 text-red-900"
                            : "bg-emerald-50 border-emerald-300 text-emerald-950"
                          : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${
                        checked ? (isDanger ? "bg-red-600 text-white" : "bg-[#005c30] text-white") : "border border-slate-300 bg-white"
                      }`}>
                        {checked && "✓"}
                      </span>
                      <span className="leading-tight">{sd}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TEST DE DIAGNOSTIC RAPIDE (TDR PALUDISME) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Résultat Test de Diagnostic Rapide Paludisme (TDR) *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTdrPaludisme("POSITIF");
                    setDiagnosticPossible(DIAGNOSTICS_POSSIBLES[0]);
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold border transition-all ${
                    tdrPaludisme === "POSITIF"
                      ? "bg-red-600 text-white border-red-700 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  🔴 POSITIF (Paludisme)
                </button>
                <button
                  type="button"
                  onClick={() => setTdrPaludisme("NEGATIF")}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold border transition-all ${
                    tdrPaludisme === "NEGATIF"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  🟢 NÉGATIF
                </button>
                <button
                  type="button"
                  onClick={() => setTdrPaludisme("NON_FAIT")}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold border transition-all ${
                    tdrPaludisme === "NON_FAIT"
                      ? "bg-slate-800 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  ⚪ NON FAIT
                </button>
              </div>
            </div>

            {/* DIAGNOSTIC POSSIBLE */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Diagnostic possible retenu *
              </label>
              <select
                value={diagnosticPossible}
                onChange={(e) => setDiagnosticPossible(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
              >
                {DIAGNOSTICS_POSSIBLES.map((d, i) => (
                  <option key={i} value={d}>{d}</option>
                ))}
              </select>
              {diagnosticPossible === "Autre affection bénigne" && (
                <input
                  type="text"
                  required
                  placeholder="Préciser le diagnostic présumé..."
                  value={diagnosticAutre}
                  onChange={(e) => setDiagnosticAutre(e.target.value)}
                  className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              )}
            </div>
          </div>

          {/* SECTION 3 : DÉCISION CLINIQUE & CONDUITE À TENIR */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Conduite à tenir
              </span>
              <h2 className="text-sm font-black text-slate-900">
                3. Décision Thérapeutique
              </h2>
            </div>

            {/* DIRECTIVE OFFICIELLE PATIENT DE PLUS DE 5 ANS */}
            {isPlusDe5Ans && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 text-amber-950 text-xs shadow-sm space-y-2">
                <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Directive Nationale : Patient de plus de 5 ans ({ageValeur} {ageUnite.toLowerCase()})</span>
                </div>
                <p className="leading-relaxed text-amber-900 font-medium">
                  Au Bénin, la prise en charge curative médicamenteuse en communauté (iCCM) est <strong>strictement réservée aux enfants de moins de 5 ans</strong>.
                </p>
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200 text-amber-950 space-y-1.5">
                  <p className="font-extrabold text-amber-950">
                    Pour toute personne de plus de 5 ans présentant le moindre signe plus ou moins grave :
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[11px]">
                    <li><strong>Conseils & Orientations :</strong> rassurer la famille et dispenser les conseils d'hygiène et de prévention.</li>
                    <li><strong>Premiers gestes de secours :</strong> administrer les premiers soins de confort (ex : <strong>Enveloppement humide</strong> avec linges tièdes si fièvre, hydratation).</li>
                    <li><strong>RÉFÉRENCE SYSTÉMATIQUE :</strong> diriger systématiquement le patient vers le Centre de Santé le plus proche avec un bulletin officiel.</li>
                  </ul>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-200/80 text-amber-950 font-black text-[11px]">
                  <span>⚡ Référence au Centre de Santé activée et recommandée</span>
                </div>
              </div>
            )}

            {/* COMMUTATEUR DÉCISION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isPlusDe5Ans) {
                    alert("Rappel : Pour les patients de plus de 5 ans, la directive officielle recommande la référence systématique au Centre de Santé après conseils et premiers gestes.");
                  }
                  setDecision("PRISE_EN_CHARGE_COMMUNAUTAIRE");
                }}
                className={`p-4 rounded-2xl text-left border-2 transition-all space-y-1 ${
                  decision === "PRISE_EN_CHARGE_COMMUNAUTAIRE"
                    ? "bg-emerald-50/70 border-[#005c30] shadow-sm"
                    : "bg-slate-50 border-slate-200 opacity-70 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-extrabold text-[#005c30] flex items-center gap-1.5">
                    <Pill className="w-4 h-4" />
                    <span>Prise en charge en communauté</span>
                  </strong>
                  {decision === "PRISE_EN_CHARGE_COMMUNAUTAIRE" && (
                    <span className="w-5 h-5 rounded-full bg-[#005c30] text-white text-xs flex items-center justify-center font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {isPlusDe5Ans 
                    ? "Réservé aux conseils, orientations et gestes de confort (directive nationale)."
                    : "Traitement sur place par l'ASCQ (CTA, SRO, Zinc, Amox, conseils nutritionnels) et suivi à domicile."}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDecision("REFERER_CS")}
                className={`p-4 rounded-2xl text-left border-2 transition-all space-y-1 ${
                  decision === "REFERER_CS"
                    ? "bg-amber-50/70 border-amber-600 shadow-sm"
                    : "bg-slate-50 border-slate-200 opacity-70 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-extrabold text-amber-800 flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4" />
                    <span>Référer au Centre de Santé (CS)</span>
                  </strong>
                  {decision === "REFERER_CS" && (
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {isPlusDe5Ans 
                    ? "Systématique > 5 ans : premier geste posé (ex: enveloppement humide) et bulletin de référence imprimable."
                    : "Premier geste d'urgence administré et établissement du bulletin officiel de référence imprimable."}
                </p>
              </button>
            </div>

            {/* CAS 1 : PRISE EN CHARGE COMMUNAUTAIRE */}
            {decision === "PRISE_EN_CHARGE_COMMUNAUTAIRE" && (
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Produits et intrants utilisés (Sélectionnez) :
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRODUITS_OFFICIELS_ASCQ.map((p) => {
                      const sel = produitsChoisis.find((item) => item.id === p.id);
                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-2xl border transition-all space-y-2 ${
                            sel ? "bg-emerald-50/50 border-emerald-300" : "bg-slate-50/60 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => toggleProduit(p)}
                              className="text-xs font-extrabold text-left flex items-center gap-2"
                            >
                              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                                sel ? "bg-[#005c30] text-white" : "border border-slate-300 bg-white"
                              }`}>
                                {sel && "✓"}
                              </span>
                              <span className={sel ? "text-[#005c30]" : "text-slate-800"}>{p.nom}</span>
                            </button>
                          </div>

                          {sel && (
                            <div className="space-y-1.5 pt-1 border-t border-emerald-100 text-[11px]">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Posologie / Recommandation :</span>
                                <input
                                  type="text"
                                  value={sel.posologie}
                                  onChange={(e) => updateProduitPosologie(p.id, "posologie", e.target.value)}
                                  className="w-full px-2 py-1 rounded-lg border border-emerald-200 bg-white text-xs"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* THÈME DE SENSIBILISATION */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thème de sensibilisation dispensé au parent / patient *
                  </label>
                  <select
                    value={themeSensibilisation}
                    onChange={(e) => setThemeSensibilisation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    {THEMES_SENSIBILISATION.map((t, i) => (
                      <option key={i} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* DATE DE RENDEZ-VOUS DE SUIVI */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date du rendez-vous de suivi / contrôle à domicile (J+3) *
                  </label>
                  <input
                    type="date"
                    required
                    value={dateRdvSuivi}
                    onChange={(e) => setDateRdvSuivi(e.target.value)}
                    className="w-full sm:w-64 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>
            )}

            {/* CAS 2 : RÉFÉRÉ AU CENTRE DE SANTÉ */}
            {decision === "REFERER_CS" && (
              <div className="space-y-4 pt-3 border-t border-amber-200 bg-amber-50/40 p-4 rounded-2xl border">
                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">
                    1er Geste posé avant référence *
                  </label>
                  <p className="text-[11px] text-amber-800 mb-1.5">
                    Sélectionnez un geste rapide ci-dessous ou décrivez les soins d'urgence apportés (ex : enveloppement humide en cas de fièvre) :
                  </p>

                  {/* Boutons d'accès rapide aux 1ers gestes */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {SUGGESTIONS_PREMIERS_GESTES.map((geste, gIdx) => {
                      const isSel = premierGestePose === geste;
                      return (
                        <button
                          key={gIdx}
                          type="button"
                          onClick={() => setPremierGestePose(geste)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all text-left ${
                            isSel
                              ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-700 font-black"
                              : "bg-white border border-amber-300 text-amber-900 hover:bg-amber-100"
                          }`}
                        >
                          {geste.startsWith("Enveloppement") ? "💧 " : geste.startsWith("Première dose") ? "💊 " : geste.startsWith("SRO") ? "🥤 " : geste.startsWith("Position") ? "🛡️ " : "✏️ "}
                          {geste}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    rows={2}
                    required
                    placeholder="Préciser les premiers soins ou gestes de secours administrés avant le départ..."
                    value={premierGestePose}
                    onChange={(e) => setPremierGestePose(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-medium"
                  />

                  {premierGestePose.includes("Autre") && (
                    <div className="mt-2 p-3 bg-amber-100/60 rounded-xl border border-amber-300">
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
                        Si autre geste, précisez le soin administré ou l'orientation apportée *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex : Conseils diététiques, enveloppement spécifique, immobilisation d'un membre..."
                        value={premierGesteAutre}
                        onChange={(e) => setPremierGesteAutre(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-amber-400 bg-white text-xs font-semibold"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">
                    Centre de Santé de destination *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nom du Centre de Santé (CSA / CS)"
                    value={structureCsDestination}
                    onChange={(e) => setStructureCsDestination(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-bold"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong>Génération automatique du bulletin :</strong> Dès l'enregistrement, un numéro officiel de référence sera attribué et vous pourrez immédiatement imprimer le bulletin officiel comportant le <strong>Volet Aller</strong> et le <strong>Volet Retour détachable</strong> pour le Centre de Santé.
                  </p>
                </div>
              </div>
            )}

            {/* OBSERVATIONS COMPLÉMENTAIRES */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observations complémentaires (facultatif)
              </label>
              <input
                type="text"
                placeholder="Remarques particulières sur l'état général, l'environnement du ménage..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* BOUTON D'ENREGISTREMENT */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? "Enregistrement en cours..." : "Valider & Enregistrer la Consultation"}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
