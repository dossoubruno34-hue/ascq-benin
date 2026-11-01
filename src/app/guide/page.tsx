"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  BookOpen, 
  Search, 
  ArrowLeft, 
  Printer, 
  ShieldCheck, 
  Lock, 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Crown, 
  Building2, 
  Stethoscope, 
  Baby, 
  Activity, 
  MapPin, 
  Phone, 
  HelpCircle, 
  HeartPulse,
  Sparkles, 
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Download,
  Share2,
  Check,
  Filter
} from "lucide-react";
import { getCachedUserSession } from "@/lib/offline-sync";

type ProfilType = "RC" | "ASCQ" | "COMMUNE" | "ZONE" | "DEPARTEMENT" | "NATIONAL";

export default function GuideUtilisateurPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Profil affiché (auto-détecté ou forcé pour les admins)
  const [selectedProfil, setSelectedProfil] = useState<ProfilType>("ASCQ");
  const [isSuperAdminOrNational, setIsSuperAdminOrNational] = useState(false);
  const [search, setSearch] = useState("");

  // Détection du profil au montage
  useEffect(() => {
    async function detectUserRole() {
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
          const cached = getCachedUserSession();
          user = cached?.user;
          profil = cached?.profile;
        }

        if (user && !profil) {
          const { data } = await supabase.from("utilisateurs").select("*").eq("id", user.id).maybeSingle();
          profil = data;
        }

        setCurrentUser(profil);

        // Détection du profil selon le rôle ou poste
        const role = (profil?.role_technique || "").toUpperCase();
        const poste = (profil?.poste || "").toUpperCase();
        const tel = (profil?.telephone || "").replace(/\D/g, "");

        const isSuperAdmin = role === "SUPER_ADMIN" || tel.includes("69031463");
        const isNational = isSuperAdmin || role === "ADMINISTRATEUR" || ["CADRE_NATIONAL", "DIRECTEUR", "MINISTRE"].includes(poste);
        setIsSuperAdminOrNational(isNational);

        // Paramètre d'URL éventuel (?profil=RC ou ?profil=ASCQ...)
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const pParam = params.get("profil") as ProfilType;
          if (pParam && ["RC", "ASCQ", "COMMUNE", "ZONE", "DEPARTEMENT", "NATIONAL"].includes(pParam)) {
            setSelectedProfil(pParam);
            setLoading(false);
            return;
          }
        }

        if (poste === "RC" || role === "RELAIS_COMMUNAUTAIRE") {
          setSelectedProfil("RC");
        } else if (poste === "ASCQ" || role === "ASCQ") {
          setSelectedProfil("ASCQ");
        } else if (["CADRE_COMMUNAL", "MCC", "PF_CCLS_TP"].includes(poste) || ["REPRESENTANT_COMMUNAL", "ADMIN_COMMUNAL"].includes(role)) {
          setSelectedProfil("COMMUNE");
        } else if (["CADRE_ZONE_SANITAIRE", "MCZS", "RCSE", "C_RAMS"].includes(poste)) {
          setSelectedProfil("ZONE");
        } else if (["CADRE_DEPARTEMENTAL", "DDS", "CSSPR", "CSPSMEMH", "CCD_CDLS_TP"].includes(poste) || role === "ADMIN_DEPARTEMENTAL") {
          setSelectedProfil("DEPARTEMENT");
        } else if (isNational) {
          setSelectedProfil("NATIONAL");
        } else {
          setSelectedProfil("ASCQ");
        }
      } catch (e) {
        console.warn("Erreur détection profil guide:", e);
      } finally {
        setLoading(false);
      }
    }
    detectUserRole();
  }, []);

  const getNomProfilAffiche = (p: ProfilType) => {
    switch (p) {
      case "RC": return "Relais Communautaire (RC)";
      case "ASCQ": return "Agent de Santé Communautaire Qualifié (ASCQ)";
      case "COMMUNE": return "Représentant Communal & Cadres Locaux";
      case "ZONE": return "Médecin Coordonnateur Zone Sanitaire (MCZS)";
      case "DEPARTEMENT": return "Cadre Départemental (DDS / CSSPR)";
      case "NATIONAL": return "Super Administrateur & Niveau National";
    }
  };

  const getBadgeColor = (p: ProfilType) => {
    switch (p) {
      case "RC": return "bg-amber-100 text-amber-900 border-amber-200";
      case "ASCQ": return "bg-emerald-100 text-[#005c30] border-emerald-200";
      case "COMMUNE": return "bg-blue-100 text-blue-900 border-blue-200";
      case "ZONE": return "bg-indigo-100 text-indigo-900 border-indigo-200";
      case "DEPARTEMENT": return "bg-purple-100 text-purple-900 border-purple-200";
      case "NATIONAL": return "bg-slate-900 text-white border-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 antialiased pb-24 print:bg-white print:p-0 print:pb-0">
      
      {/* 1. EN-TÊTE OFFICIEL - MASQUÉ À L'IMPRESSION */}
      <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md print:hidden">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href={selectedProfil === "RC" ? "/espace-rc" : currentUser?.role_technique === "SUPER_ADMIN" ? "/perimetre" : "/espace-ascq"}
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold">Retour à mon espace</span>
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-extrabold tracking-tight">Mon Guide d'Utilisateur</h1>
            <p className="text-[10px] text-white/80">{getNomProfilAffiche(selectedProfil)}</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Imprimer ce guide au format officiel A4"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimer (A4)</span>
          </button>
        </div>

        {/* Bandeau tricolore béninois */}
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>
      </header>

      {/* EN-TÊTE OFFICIEL POUR L'IMPRESSION FORMAT A4 */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-base font-black uppercase text-black">RÉPUBLIQUE DU BÉNIN</h1>
        <h2 className="text-xs font-bold uppercase text-slate-800">Ministère de la Santé — Direction Nationale de la Santé Publique</h2>
        <h3 className="text-xs font-extrabold text-[#005c30]">GUIDE D'UTILISATEUR OFFICIEL PAS-À-PAS : {getNomProfilAffiche(selectedProfil).toUpperCase()}</h3>
        <p className="text-[11px] text-slate-600 mt-1">Programme National de Santé Communautaire (PNSC) & SIMR Bénin • Version V4.0</p>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6 print:max-w-none print:px-0 print:pt-0">
        
        {/* BANNIÈRE DE BIENVENUE & PROFIL ACTIF */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${getBadgeColor(selectedProfil)}`}>
                  Niveau {selectedProfil}
                </span>
                <span className="text-[11px] text-slate-400 font-bold">Guide Personnalisé</span>
              </div>
              <h2 className="text-lg font-black text-slate-900">
                Guide Opérationnel Exclusif : {getNomProfilAffiche(selectedProfil)}
              </h2>
              <p className="text-xs text-slate-500">
                Ce guide pas-à-pas présente uniquement les fonctions, écrans et responsabilités rattachés à votre profil.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/briefing"
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-bold text-xs border border-emerald-200 flex items-center gap-1.5 transition-all"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Guide Clinique SIMR</span>
              </Link>
            </div>
          </div>

          {/* SÉLECTEUR DE PROFIL POUR SUPER ADMIN & CADRES NATIONAUX (AFIN D'EXPLIQUER OU AUDITER) */}
          {isSuperAdminOrNational && (
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span>Vue Superviseur National : Choisir le profil à afficher</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["RC", "ASCQ", "COMMUNE", "ZONE", "DEPARTEMENT", "NATIONAL"] as ProfilType[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedProfil(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      selectedProfil === p
                        ? "bg-[#005c30] text-white border-[#005c30] shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* VUE 1 : GUIDE PAS-À-PAS RELAIS COMMUNAUTAIRE (RC) */}
        {/* ========================================================================= */}
        {selectedProfil === "RC" && (
          <div className="space-y-4">
            
            {/* Résumé profil RC */}
            <div className="p-4 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-1">
              <span className="text-xs font-black uppercase text-amber-900 block">Votre Mission de Terrain (Village)</span>
              <p className="text-xs text-slate-700">
                En tant que Relais Communautaire (RC), vous êtes l'éclaireur de santé du village. Vous assurez les visites à domicile (VAD), vous donnez l'alerte précoce en cas de maladie suspecte et vous déclarez les décès survenus au village.
              </p>
            </div>

            {/* Étape 1 : Connexion RC */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-amber-800">
                <span className="w-6 h-6 rounded-full bg-amber-100 font-black text-xs flex items-center justify-center">1</span>
                <h3 className="font-extrabold text-sm text-slate-900">Connexion et Code PIN Secret</h3>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-8">
                <li><strong>Identifiant</strong> : Votre numéro de téléphone béninois (ex. : <code>01 96 92 10 09</code>).</li>
                <li><strong>Mot de passe</strong> : Votre <strong>Code PIN secret à 4 chiffres</strong>.</li>
                <li><strong>Pas besoin d'email</strong> : Aucun email n'est exigé pour les Relais Communautaires.</li>
                <li><strong>En cas d'oubli de code</strong> : Votre superviseur ASCQ peut réinitialiser votre code PIN à <code>0000</code> depuis son application.</li>
              </ul>
            </div>

            {/* Étape 2 : Signaler une Alerte SIMR */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-red-700">
                <span className="w-6 h-6 rounded-full bg-red-100 font-black text-xs flex items-center justify-center">2</span>
                <h3 className="font-extrabold text-sm text-slate-900">Signaler une Alerte Sanitaire au Village (Gros bouton rouge)</h3>
              </div>
              <ol className="text-xs text-slate-700 space-y-2 list-decimal pl-8">
                <li>Sur votre écran d'accueil, appuyez sur le bouton rouge <strong>« Signaler une Alerte »</strong>.</li>
                <li>Choisissez la maladie suspectée (ex. : <em>Diarrhée abondante en eau de riz</em>, <em>Fièvre avec saignement</em>, <em>Morsure de serpent</em>, <em>Morts groupées d'animaux</em>).</li>
                <li>Indiquez le village / hameau et le nombre de personnes malades ou décédées.</li>
                <li><strong>Signez directement avec votre doigt sur l'écran tactile du téléphone</strong>.</li>
                <li>Appuyez sur <strong>« Transmettre l'alerte »</strong>. Votre ASCQ superviseur est immédiatement averti sur son téléphone pour venir faire l'investigation.</li>
              </ol>
              <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-[11px] text-red-900 font-bold">
                ℹ️ Règle officielle : Aucun visa de médecin coordonnateur n'est exigé. La signature se fait directement entre vous (RC) et votre ASCQ.
              </div>
            </div>

            {/* Étape 3 : Notifier un Décès */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <span className="w-6 h-6 rounded-full bg-slate-200 font-black text-xs flex items-center justify-center">3</span>
                <h3 className="font-extrabold text-sm text-slate-900">Notifier un Décès Communautaire au Village</h3>
              </div>
              <ol className="text-xs text-slate-700 space-y-1.5 list-decimal pl-8">
                <li>Appuyez sur le bouton noir <strong>« Notifier un Décès »</strong>.</li>
                <li>Renseignez le nom du défunt, son âge, son sexe et les circonstances du décès (à domicile, en cours de route...).</li>
                <li>Signez avec votre doigt sur l'écran tactile et validez. La déclaration est transmise immédiatement.</li>
              </ol>
            </div>

            {/* Étape 4 : Planning et Fiche Hebdo */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-[#005c30]">
                <span className="w-6 h-6 rounded-full bg-emerald-100 font-black text-xs flex items-center justify-center">4</span>
                <h3 className="font-extrabold text-sm text-slate-900">Planning & Fiche Hebdomadaire d'Activités PNSC</h3>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-8">
                <li><strong>Planning</strong> : En début de semaine, planifiez les ménages que vous allez visiter.</li>
                <li><strong>Fiche Hebdo</strong> : En fin de semaine, indiquez le nombre de ménages visités, de causeries réalisées, de femmes enceintes sensibilisées et d'enfants orientés vers la vaccination.</li>
                <li>Cette fiche est automatiquement envoyée à votre ASCQ qui l'intègre dans le rapport d'arrondissement.</li>
              </ul>
            </div>

            {/* Étape 5 : Travail hors-ligne */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-blue-700">
                <span className="w-6 h-6 rounded-full bg-blue-100 font-black text-xs flex items-center justify-center">5</span>
                <h3 className="font-extrabold text-sm text-slate-900">Travail en Zone Blanche (Sans Connexion Internet)</h3>
              </div>
              <p className="text-xs text-slate-700 pl-8">
                Même s'il n'y a pas de réseau internet au village, l'application fonctionne à 100%. Enregistrez vos alertes et fiches normalement : elles sont gardées en mémoire dans le téléphone. Dès que vous retrouvez du réseau, elles sont envoyées automatiquement.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VUE 2 : GUIDE PAS-À-PAS ASCQ (ARRONDISSEMENT) */}
        {/* ========================================================================= */}
        {selectedProfil === "ASCQ" && (
          <div className="space-y-4">
            
            {/* Résumé profil ASCQ */}
            <div className="p-4 rounded-3xl bg-emerald-50/70 border border-emerald-200 space-y-1">
              <span className="text-xs font-black uppercase text-[#005c30] block">Votre Rôle Clé : Superviseur d'Arrondissement</span>
              <p className="text-xs text-slate-700">
                L'ASCQ assure les soins communautaires iCCM (Paludisme, Diarrhée, Pneumonie, Malnutrition), le suivi maternité 1000 jours, la supervision des Relais Communautaires, la vérification des alertes et le dépôt du rapport mensuel (RMA) avant le 5 du mois.
              </p>
            </div>

            {/* Inscription & Sécurité ASCQ */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-[#005c30]">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900">1. Inscription Sécurisée (Anti-Piratage)</h3>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-6">
                <li><strong>Email professionnel obligatoire</strong> : Requis pour la protection de votre compte.</li>
                <li><strong>Mot de passe renforcé</strong> : Au moins 8 caractères contenant obligatoirement des lettres, des chiffres et un <strong>caractère spécial</strong> (ex. : <code>@ # $ % !</code>).</li>
                <li><strong>Connexion</strong> : Vous pouvez vous connecter indifféremment avec votre numéro de téléphone ou votre adresse email.</li>
              </ul>
            </div>

            {/* Consultations iCCM & Secret Médical */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-[#005c30]">
                <Stethoscope className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900">2. Prise en Charge iCCM & Déontologie du Secret Médical</h3>
              </div>
              <ol className="text-xs text-slate-700 space-y-1.5 list-decimal pl-6">
                <li>Ouvrez <strong>Prise en charge iCCM</strong> $\rightarrow$ <strong>+ Nouvelle Prise en Charge</strong>.</li>
                <li>Renseignez les données cliniques : TDR Paludisme (Positif/Négatif), Fréquence respiratoire au minuteur 60 sec, Déshydratation, Périmètre brachial Shakir.</li>
                <li>Dispensez le traitement selon les protocoles (CTA, SRO+Zinc, Amoxicilline). Si signe de danger $\rightarrow$ Référer au Centre de Santé.</li>
                <li><strong>Garantie du Secret Médical</strong> : Dans tous les registres et tableaux partagés, les données nominatives des patients sont anonymisées. Seuls les décomptes par maladie sont transmis.</li>
              </ol>
            </div>

            {/* Vérification des Alertes RC */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-red-700">
                <Activity className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900">3. Investigation & Visa des Alertes SIMR des RC</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-[#005c30] space-y-1">
                <strong>RÈGLE DE SIGNATURE : STRICTEMENT ENTRE LE RC ET L'ASCQ</strong>
                <p>Le médecin coordonnateur n'a rien à signer sur les notifications. Votre rôle est :</p>
              </div>
              <ol className="text-xs text-slate-700 space-y-1.5 list-decimal pl-6">
                <li>Recevoir l'alerte transmise et signée par le Relais Communautaire (RC).</li>
                <li>Vous déplacer dans le village pour investiguer cliniquement le foyer.</li>
                <li>Ouvrir la fiche d'alerte et sélectionner : <strong>✓ Alerte Avérée</strong> ou <strong>✗ Alerte Non Avérée</strong>.</li>
                <li>Renseigner vos observations cliniques de terrain.</li>
                <li>Cliquer sur <strong>« Apposer le Visa Officiel de l'ASCQ Superviseur »</strong>. L'alerte est certifiée et immédiatement visible à tous les échelons.</li>
              </ol>
            </div>

            {/* Rapport Mensuel RMA */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-[#005c30]">
                <FileSpreadsheet className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900">4. Rapport Mensuel Agrégé d'Arrondissement (Dépôt avant le 5)</h3>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-6">
                <li>L'application consolide automatiquement les activités hebdomadaires de tous vos Relais (VAD, causeries, CPN, PEV).</li>
                <li>Vérifiez les totaux dans l'onglet <strong>Rapport Mensuel</strong>.</li>
                <li>Déposez officiellement le rapport <strong>impérativement avant le 5 du mois suivant</strong>.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VUE 3 : GUIDE REPRÉSENTANT COMMUNAL */}
        {/* ========================================================================= */}
        {selectedProfil === "COMMUNE" && (
          <div className="space-y-4">
            <div className="p-4 rounded-3xl bg-blue-50/70 border border-blue-200 space-y-1">
              <span className="text-xs font-black uppercase text-blue-900 block">Votre Rôle : Coordination et Contrôle Communal</span>
              <p className="text-xs text-slate-700">
                Le Représentant Communal encadre l'ensemble des ASCQ et des Relais de la commune. Il valide les inscriptions, suit la complétude des dépôts RMA et gère le personnel communal.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-blue-900">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900">1. Validation des Inscriptions en Attente</h3>
              </div>
              <p className="text-xs text-slate-700">
                Depuis votre Espace Périmètre (<Link href="/perimetre" className="text-blue-700 font-bold underline">/perimetre</Link>), contrôlez les nouveaux agents inscrits sur votre commune. Vérifiez leur affectation et approuvez leur compte pour leur donner accès.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-blue-900">
                <FileSpreadsheet className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900">2. Rapport Consolidé Communal & Contrôle des Délais RMA</h3>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-6">
                <li>Suivez en direct les arrondissements ayant déposé leur RMA : badge vert 🟢 <strong>DÉPOSÉ</strong> ou rouge 🔴 <strong>EN RETARD</strong>.</li>
                <li>Relancez les ASCQ retardataires en 1 clic via le bouton WhatsApp ou appel téléphonique.</li>
                <li>Consultez la consolidation communale agrégeant tous les ASCQ de la commune.</li>
              </ul>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-blue-900">
                <Users className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900">3. Gestion du Personnel & Radiation Administrative</h3>
              </div>
              <p className="text-xs text-slate-700">
                Dans l'onglet Personnel, consultez l'annuaire des ASCQ et RC. En cas de fin de contrat ou de démission, prononcez la radiation avec motif réglementaire obligatoire. Vous pouvez également réinitialiser le mot de passe d'un ASCQ à <code>000000</code> en cas d'oubli.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VUE 4 : GUIDE MÉDECIN COORDONNATEUR ZONE SANITAIRE (MCZS) */}
        {/* ========================================================================= */}
        {selectedProfil === "ZONE" && (
          <div className="space-y-4">
            <div className="p-4 rounded-3xl bg-indigo-50/70 border border-indigo-200 space-y-1">
              <span className="text-xs font-black uppercase text-indigo-900 block">Votre Rôle : Riposte Épidémiologique & Intrants de Zone</span>
              <p className="text-xs text-slate-700">
                Le MCZS et l'équipe cadre de zone sanitaire pilotent la riposte aux alertes épidémiques, fluidifient la référence vers l'Hôpital de Zone et approvisionnent les postes en médicaments traceurs.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-indigo-900">
                <Activity className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900">1. Surveillance des Alertes & Absence de Visa Administratif</h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
                ℹ️ <strong>Rappel réglementaire fondamental :</strong> Le MCZS n'a pas à signer les fiches de notification terrain (la validation est faite par le RC et l'ASCQ). Votre rôle est d'analyser les données transmises en temps réel pour déclencher immédiatement la riposte médicale.
              </div>
              <p className="text-xs text-slate-700 pt-1">
                Toutes les informations vous sont accessibles à 100% : coordonnées GPS réelles, bilan d'impact humain/animal, symptômes et signature tactile du notificateur.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-indigo-900">
                <HeartPulse className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900">2. Références vers l'Hôpital de Zone & Ordres de Mission</h3>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-6">
                <li>Suivez les bulletins officiels de référence émis par les ASCQ vers les centres de santé de la zone.</li>
                <li>Déclenchez des ordres de mission de zone pour dépêcher une équipe médicale sur un foyer d'alerte.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VUE 5 : GUIDE CADRE DÉPARTEMENTAL (DDS) */}
        {/* ========================================================================= */}
        {selectedProfil === "DEPARTEMENT" && (
          <div className="space-y-4">
            <div className="p-4 rounded-3xl bg-purple-50/70 border border-purple-200 space-y-1">
              <span className="text-xs font-black uppercase text-purple-900 block">Votre Rôle : Pilotage Stratégique Départemental (DDS)</span>
              <p className="text-xs text-slate-700">
                La Direction Départementale de la Santé supervise les communes de son département, analyse les rapports mensuels consolidés et conduit la gouvernance sanitaire départementale.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-purple-900">
                <Building2 className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900">1. Cloisonnement Territorial & Rapport Départemental Consolidé</h3>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-6">
                <li>Votre accès est strictement limité aux communes de votre département d'affectation.</li>
                <li>Consultez le <strong>Rapport Consolidé Départemental</strong> agrégeant l'ensemble des activités communautaires (VAD, Causeries, Femmes CPN, Enfants PEV, Références).</li>
                <li>Décompte épidémiologique par pathologie (Paludisme TDR+, Diarrhée, Pneumonie, Malnutrition) dans le respect du secret médical (zéro nom de patient exposé).</li>
              </ul>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-purple-900">
                <Activity className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900">2. Transparence Intégrale des Fiches d'Alerte et Décès</h3>
              </div>
              <p className="text-xs text-slate-700">
                Vous visualisez 100% des informations des fiches d'alerte et de décès notifiées dans votre département : localisation GPS, symptômes, défunt/cas index, contact du notificateur et visualisation de la signature tactile du RC et du visa de l'ASCQ superviseur.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-purple-900">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-900">3. Suggestions Formatives & Ordres de Mission Départementaux</h3>
              </div>
              <p className="text-xs text-slate-700">
                Envoyez des remarques constructives et des suggestions formatives directement ciblées vers un ASCQ ou déclenchez un ordre de mission départemental d'investigation.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VUE 6 : GUIDE SUPER ADMINISTRATEUR & NIVEAU NATIONAL */}
        {/* ========================================================================= */}
        {selectedProfil === "NATIONAL" && (
          <div className="space-y-4">
            <div className="p-4 rounded-3xl bg-slate-900 text-white space-y-1">
              <span className="text-xs font-black uppercase text-amber-400 block flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Gouvernance Nationale Suprême & Administration Système</span>
              </span>
              <p className="text-xs text-slate-300">
                Supervision intégrale des 12 départements, 34 zones sanitaires et 77 communes du Bénin. Nettoyage universel des données, radiation, et consolidation macro-stratégique nationale.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-sm text-slate-900">1. Rapport Consolidé National des 12 Départements</h3>
              </div>
              <p className="text-xs text-slate-700">
                Accès au rapport macro-économique et épidémiologique consolidant l'ensemble de la République du Bénin pour transmission au Ministère de la Santé, au Conseil des Ministres et aux bailleurs de fonds.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <ShieldCheck className="w-5 h-5 text-purple-700" />
                <h3 className="font-extrabold text-sm text-slate-900">2. Nettoyage Universel des Données & Radiation du Personnel</h3>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-6">
                <li>Purge des fiches de tests et doublons accidentels dans n'importe quel arrondissement du Bénin avec motif réglementaire obligatoire.</li>
                <li>Gestion globale des comptes dans <Link href="/admin" className="text-[#005c30] font-bold underline">/admin</Link> : validation, suspension, radiation et suppression sécurisée par mot-clé <code>SUPPRIMER</code>.</li>
              </ul>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
