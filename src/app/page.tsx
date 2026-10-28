import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import QuiEstAscqCard from "@/components/QuiEstAscqCard";
import SuggestionsCard from "@/components/SuggestionsCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Récupérer les données réelles pour la page d'accueil
  const [depsRes, ascqCountRes, profilsRes, rcCountRes, rmaRes, conseilsRes] = await Promise.all([
    supabase.from("departements").select("id, nom").order("nom"),
    supabase.from("utilisateurs").select("*", { count: "exact", head: true }).eq("poste", "ASCQ").eq("statut_compte", "VALIDE"),
    supabase.from("ascq_profils").select("nombre_rc"),
    supabase.from("relais_communautaires").select("*", { count: "exact", head: true }),
    supabase.from("rapports_mensuels_ascq").select("menages_visites, personnes_touchees_total"),
    supabase.from("conseils_sante").select("*").eq("est_publie", true).order("created_at", { ascending: false }),
  ]);

  const departements = depsRes.data || [];
  
  // Chiffres réels strictement calculés d'après les enregistrements de la base de données
  const nbAscq = ascqCountRes.count ?? 0;
  
  // Nombre de RC : somme exacte déclarée par les ASCQ validés dans leurs profils ou comptes créés
  const sumRcProfils = (profilsRes.data || []).reduce((acc: number, p: any) => acc + (Number(p.nombre_rc) || 0), 0);
  const nbRc = Math.max(sumRcProfils, rcCountRes.count ?? 0);
  
  // Ménages & Personnes touchées d'après les rapports mensuels et activités réelles (0 si aucun rapport)
  const sumMenages = (rmaRes.data || []).reduce((acc: number, r: any) => acc + (Number(r.menages_visites) || 0), 0);
  const sumPersonnes = (rmaRes.data || []).reduce((acc: number, r: any) => acc + (Number(r.personnes_touchees_total) || 0), 0);
  
  const nbMenages = sumMenages;
  const nbPersonnes = sumPersonnes > 0 ? sumPersonnes.toLocaleString("fr-FR") : "0";
  const conseils = conseilsRes.data || [];

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-16">
      {/* 1. En-tête vert foncé avec le logo, « ASCQ Bénin » et « Ministère de la Santé » */}
      <header className="bg-[#005c30] text-white">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            <Image
              src="/logo-ascq.png"
              alt="Logo ASCQ Bénin"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div className="leading-tight">
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
              ASCQ Bénin
            </h1>
            <p className="text-[11px] text-white/80 font-normal">
              Ministère de la Santé
            </p>
          </div>
        </div>

        {/* Bandeau tricolore vert, jaune, rouge juste en dessous */}
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>
      </header>

      {/* Contenu principal : mobile-first, centré, largeur maximale confortable */}
      <main className="max-w-md sm:max-w-lg mx-auto px-4 pt-6 space-y-5">
        
        {/* 2. Titre « Bienvenue », pastille « ASCQ DU BÉNIN » et Logo officiel */}
        <section className="text-center space-y-3 pt-2">
          <h2 className="font-handwritten text-[#1e3a8a] text-4xl sm:text-5xl font-bold tracking-wide">
            Bienvenue
          </h2>
          
          <p className="text-xs sm:text-sm font-semibold text-slate-700">
            sur l'application officielle des
          </p>

          <div>
            <span className="inline-block bg-[#0e7f47] text-white font-extrabold text-sm sm:text-base px-6 py-2 rounded-2xl shadow-sm tracking-wider uppercase">
              ASCQ DU BÉNIN
            </span>
          </div>

          {/* Logo officiel centré sans chevauchement */}
          <div className="pt-2 flex justify-center">
            <div className="w-48 sm:w-56 h-auto drop-shadow-sm">
              <Image
                src="/logo-ascq.png"
                alt="Collectif des Agents de Santé Communautaire Qualifiés du Bénin"
                width={240}
                height={140}
                priority
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </section>

        {/* 3. Barre d'onglets : Accueil, Connexion, Inscription, Suggestions */}
        <nav className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
          <Link
            href="/"
            className="flex-1 py-2 px-1 text-center rounded-xl bg-[#e0f2e9] text-[#0e7f47] transition-colors"
          >
            Accueil
          </Link>
          <Link
            href="/connexion"
            className="flex-1 py-2 px-1 text-center rounded-xl hover:text-slate-900 transition-colors"
          >
            Connexion
          </Link>
          <Link
            href="/inscription"
            className="flex-1 py-2 px-1 text-center rounded-xl hover:text-slate-900 transition-colors"
          >
            Inscription
          </Link>
          <a
            href="#suggestions"
            className="flex-1 py-2 px-1 text-center rounded-xl hover:text-slate-900 transition-colors"
          >
            Suggestions
          </a>
        </nav>

        {/* 4. Boutons « Se connecter » (vert plein) et « S'inscrire » (contour) */}
        <section className="flex items-center justify-center gap-3 pt-1">
          <Link
            href="/connexion"
            className="flex-1 max-w-[170px] py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-center text-white bg-[#0e7f47] hover:bg-[#0b6d3c] shadow-sm transition-all active:scale-95"
          >
            Se connecter
          </Link>

          <Link
            href="/inscription"
            className="flex-1 max-w-[170px] py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-center text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm transition-all active:scale-95"
          >
            S'inscrire
          </Link>
        </section>

        {/* 5. 4 cartes de chiffres en 2 colonnes */}
        <section className="grid grid-cols-2 gap-3 pt-1">
          {/* Carte 1 */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-1">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#005b60] tracking-tight">
              {nbAscq}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight">
              ASCQ opérationnels
            </p>
          </div>

          {/* Carte 2 */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-1">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#005b60] tracking-tight">
              {nbRc}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight">
              Relais communautaires opérationnels
            </p>
          </div>

          {/* Carte 3 */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-1">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#005b60] tracking-tight">
              {nbMenages}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight">
              Ménages touchés cette année
            </p>
          </div>

          {/* Carte 4 */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-1">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#005b60] tracking-tight">
              {nbPersonnes}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight">
              Personnes touchées cette année
            </p>
          </div>
        </section>

        {/* Module Prise en charge des cas en communauté */}
        <section className="bg-gradient-to-r from-emerald-950 to-[#005c30] text-white rounded-3xl p-5 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-white/20 text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                Soins & Surveillance PCIME-C
              </span>
              <h2 className="text-sm font-extrabold text-white">
                Prise en charge des cas en communauté
              </h2>
            </div>
          </div>
          <p className="text-xs text-emerald-100/90 leading-relaxed">
            Module officiel réservé aux professionnels : diagnostic, TDR Paludisme, décision de soins sur place (intrants essentiels) ou référence au CS avec bulletin officiel imprimable.
          </p>
          <div className="pt-1">
            <Link
              href="/espace-ascq/consultations"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow transition-all active:scale-95"
            >
              <span>Accéder au module Prise en charge</span>
              <span>→</span>
            </Link>
          </div>
        </section>

        {/* 6. Carte « Conseils santé » */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            Conseils santé
          </h2>

          {conseils && conseils.length > 0 ? (
            <div className="space-y-3 pt-1">
              {conseils.slice(0, 2).map((c) => (
                <div key={c.id} className="text-xs space-y-1 border-l-2 border-[#0e7f47] pl-3 py-0.5">
                  <p className="font-bold text-slate-900">{c.titre}</p>
                  <p className="text-slate-600 line-clamp-2">{c.contenu}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-normal">
              Aucun conseil publié pour le moment.
            </p>
          )}
        </section>

        {/* 7. Carte « Qui est l'ASCQ de mon milieu ? » */}
        <section>
          <QuiEstAscqCard departements={departements} />
        </section>

        {/* 8. Carte verte pâle « Aidez-nous à mieux vous servir » */}
        <section>
          <SuggestionsCard departements={departements} />
        </section>

        {/* 9. Carte « Suivez-nous » avec 4 icônes */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Suivez-nous
          </h2>

          <div className="flex items-center justify-center gap-3">
            {/* Facebook */}
            <a
              href="https://www.facebook.com/profile.php?id=61595028870500"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 hover:border-blue-300 transition-all active:scale-95"
              title="Facebook"
            >
              <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>

            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/company/ascq-benin/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 hover:border-sky-300 transition-all active:scale-95"
              title="LinkedIn"
            >
              <svg className="w-5 h-5 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
              </svg>
            </a>

            {/* Email */}
            <a
              href="mailto:ascqbenin@gmail.com"
              className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 hover:border-emerald-300 transition-all active:scale-95"
              title="E-mail"
            >
              <svg className="w-5 h-5 text-[#0e7f47]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>

            {/* WhatsApp */}
            <a
              href="https://whatsapp.com/channel/0029VbE6MZcHbFV2YFxXoe05"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 hover:border-emerald-300 transition-all active:scale-95"
              title="WhatsApp"
            >
              <svg className="w-5 h-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
              </svg>
            </a>
          </div>
        </section>

      </main>
    </div>
  );
}
