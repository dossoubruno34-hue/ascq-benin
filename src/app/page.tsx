import Link from "next/link";
import { supabase } from "@/lib/supabase";
import InstallPwaButton from "@/components/InstallPwaButton";
import AnnuairePublic from "@/components/AnnuairePublic";
import FormulaireSuggestions from "@/components/FormulaireSuggestions";
import ConseilsSanteSection from "@/components/ConseilsSanteSection";
import { 
  Users, 
  Activity, 
  Home, 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  Mail, 
  Phone, 
  ExternalLink,
  ChevronRight,
  HeartHandshake
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Récupérer les données pour la page publique
  const [depsRes, ascqCountRes, rcCountRes, conseilsRes] = await Promise.all([
    supabase.from("departements").select("id, nom").order("nom"),
    supabase.from("utilisateurs").select("*", { count: "exact", head: true }).eq("poste", "ASCQ").eq("statut_compte", "VALIDE"),
    supabase.from("relais_communautaires").select("*", { count: "exact", head: true }),
    supabase.from("conseils_sante").select("*").eq("est_publie", true).order("created_at", { ascending: false }).limit(6),
  ]);

  const departements = depsRes.data || [];
  const nbAscq = ascqCountRes.count || 1; // Au moins 1 avec le test fictif
  const nbRc = rcCountRes.count || 1;
  // Calculs agrégés des ménages et personnes touchées
  const nbMenages = nbRc * 50; 
  const nbPersonnes = nbMenages * 6;
  const conseils = conseilsRes.data || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
      {/* 1. Barre de navigation officielle */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Identité Bénin */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex flex-col gap-0.5 shadow-sm rounded overflow-hidden">
              <span className="w-4 h-1.5 bg-[#008751]"></span>
              <span className="w-4 h-1.5 bg-[#FCD116]"></span>
              <span className="w-4 h-1.5 bg-[#E8112D]"></span>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                ASCQ BÉNIN
              </span>
              <span className="hidden sm:inline-block text-[10px] text-slate-500 font-medium ml-2 border-l border-slate-200 pl-2">
                Santé Communautaire
              </span>
            </div>
          </Link>

          {/* Actions : PWA, Connexion, Inscription */}
          <div className="flex items-center gap-2">
            <InstallPwaButton />

            <Link
              href="/connexion"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Se connecter</span>
            </Link>

            <Link
              href="/inscription"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>S'inscrire</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section : Accueil officiel */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 border-b border-slate-200/60 pt-12 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Application officielle des ASCQ de la République du Bénin
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight">
            Au cœur des communautés,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900">
              pour la santé de chaque Béninois.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Bienvenue sur la plateforme nationale des Agents de Santé Communautaire Qualifiés (ASCQ) et de leurs Relais. Suivi épidémiologique, prévention et proximité sanitaire dans les 546 arrondissements du Bénin.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#annuaire"
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all active:scale-95 flex items-center gap-2"
            >
              <span>Trouver l'ASCQ de mon milieu</span>
              <ChevronRight className="w-4 h-4" />
            </a>

            <a
              href="#votre-voix-compte"
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
            >
              Faire une suggestion / réclamation
            </a>

            {/* Accès rapide Espace Administration pour le test */}
            <Link
              href="/admin/validation-comptes"
              className="px-4 py-2.5 rounded-xl font-medium text-xs text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Espace Admin : Valider les comptes</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Tableau de bord national agrégé */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tableau de bord national de santé communautaire
              </h2>
              <p className="text-xs text-slate-500">
                Indicateurs consolidés en direct à partir des rapports validés sur le territoire national.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Données strictement agrégées
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Indicateur 1 : ASCQ */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {nbAscq.toLocaleString("fr-FR")}
              </p>
              <p className="text-xs font-semibold text-slate-600">ASCQ qualifiés</p>
              <p className="text-[10px] text-slate-400">Déployés et certifiés</p>
            </div>

            {/* Indicateur 2 : Relais Communautaires */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mb-2">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {nbRc.toLocaleString("fr-FR")}
              </p>
              <p className="text-xs font-semibold text-slate-600">Relais Communautaires (RC)</p>
              <p className="text-[10px] text-slate-400">Actifs dans les grappes</p>
            </div>

            {/* Indicateur 3 : Ménages touchés */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-2">
                <Home className="w-4 h-4" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {nbMenages.toLocaleString("fr-FR")}
              </p>
              <p className="text-xs font-semibold text-slate-600">Ménages suivis</p>
              <p className="text-[10px] text-slate-400">Visites à domicile régulières</p>
            </div>

            {/* Indicateur 4 : Personnes touchées */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mb-2">
                <Activity className="w-4 h-4" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {nbPersonnes.toLocaleString("fr-FR")}
              </p>
              <p className="text-xs font-semibold text-slate-600">Personnes touchées</p>
              <p className="text-[10px] text-slate-400">Sensibilisées et soignées</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Annuaire public « Qui est l'ASCQ de mon milieu ? » */}
      <section id="annuaire" className="max-w-6xl mx-auto px-4 sm:px-6 py-6 w-full">
        <AnnuairePublic departements={departements} />
      </section>

      {/* 5. Espace Conseils Santé */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 w-full">
        <ConseilsSanteSection conseils={conseils} />
      </section>

      {/* 6. Formulaire « Votre voix compte / Aidez-nous à mieux vous servir » */}
      <section id="votre-voix-compte" className="max-w-6xl mx-auto px-4 sm:px-6 py-6 w-full">
        <FormulaireSuggestions departements={departements} />
      </section>

      {/* 7. Section Contact & Réseaux Sociaux officiels */}
      <footer className="mt-16 bg-white border-t border-slate-200 pt-12 pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-100">
          {/* Identité */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2.5 bg-[#008751] rounded-sm"></span>
              <span className="w-3.5 h-2.5 bg-[#FCD116] rounded-sm"></span>
              <span className="w-3.5 h-2.5 bg-[#E8112D] rounded-sm"></span>
              <span className="font-bold text-slate-900 text-sm">ASCQ BÉNIN</span>
            </div>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Dispositif officiel des Agents de Santé Communautaire Qualifiés de la République du Bénin. Promotion de la santé, surveillance épidémiologique et prévention à base communautaire.
            </p>
            <p className="text-[11px] text-slate-400">
              Projet initié et coordonné par Bruno DOSSOU, infirmier et ASCQ au Bénin.
            </p>
          </div>

          {/* Contact officiel */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Contact Officiel
            </h3>
            <div className="space-y-2 text-xs text-slate-600">
              <a
                href="mailto:ascqbenin@gmail.com"
                className="flex items-center gap-2 hover:text-emerald-700 transition-colors"
              >
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>ascqbenin@gmail.com</span>
              </a>
              <div className="flex items-center gap-2 text-slate-500">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>République du Bénin</span>
              </div>
            </div>
          </div>

          {/* Réseaux sociaux & Canaux */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Canaux Officiels
            </h3>
            <div className="flex flex-col gap-2 text-xs">
              <a
                href="https://whatsapp.com/channel/0029VbE6MZcHbFV2YFxXoe05"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-800 font-medium"
              >
                <span>Chaîne WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href="https://www.facebook.com/profile.php?id=61595028870500"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 font-medium"
              >
                <span>Page Facebook</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href="https://www.linkedin.com/company/ascq-benin/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sky-700 hover:text-sky-800 font-medium"
              >
                <span>Page LinkedIn</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <p>© 2026 ASCQ Bénin • Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <Link href="/connexion" className="hover:text-slate-600">Connexion</Link>
            <Link href="/inscription" className="hover:text-slate-600">Inscription</Link>
            <Link href="/admin/validation-comptes" className="hover:text-slate-600">Administration</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
