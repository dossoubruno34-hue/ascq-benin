import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import QuiEstAscqCard from "@/components/QuiEstAscqCard";
import SuggestionsCard from "@/components/SuggestionsCard";
import { HeartPulse, ExternalLink } from "lucide-react";
import { SocialPlatformsCard, FacebookIcon } from "@/components/SocialLinks";
import CarteCouvertureBenin from "@/components/CarteCouvertureBenin";
import HomeAuthButtons from "@/components/HomeAuthButtons";
import DernieresPublicationsFacebook, { PublicationFacebook } from "@/components/DernieresPublicationsFacebook";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Récupérer les données réelles pour la page d'accueil
  let departements: any[] = [];
  let nbAscq = 0;
  let nbRc = 0;
  let nbMenages = 0;
  let nbPersonnes = "0";
  let conseils: any[] = [];
  let publicationsFacebook: PublicationFacebook[] = [];
  let couvertureData: Array<{ commune_id: string; nombre_ascq: number }> = [];

  try {
    const [depsRes, ascqCountRes, profilsRes, rcCountRes, rmaRes, conseilsRes, fbRes, couvertureRpcRes] = await Promise.all([
      supabase.from("departements").select("id, nom").order("nom"),
      supabase.from("utilisateurs").select("*", { count: "exact", head: true }).eq("poste", "ASCQ").eq("statut_compte", "VALIDE"),
      supabase.from("ascq_profils").select("nombre_rc"),
      supabase.from("relais_communautaires").select("*", { count: "exact", head: true }),
      supabase.from("rapports_mensuels_ascq").select("menages_visites, personnes_touchees_total"),
      supabase.from("conseils_sante").select("*").eq("est_publie", true).order("created_at", { ascending: false }),
      supabase.from("publications_facebook").select("id_facebook, message, permalink_url, created_time, fetched_at").order("created_time", { ascending: false }).limit(3),
      supabase.rpc("obtenir_couverture_communale_ascq"),
    ]);

    departements = depsRes.data || [];
    nbAscq = ascqCountRes.count ?? 0;
    const sumRcProfils = (profilsRes.data || []).reduce((acc: number, p: any) => acc + (Number(p.nombre_rc) || 0), 0);
    nbRc = Math.max(sumRcProfils, rcCountRes.count ?? 0);
    const sumMenages = (rmaRes.data || []).reduce((acc: number, r: any) => acc + (Number(r.menages_visites) || 0), 0);
    const sumPersonnes = (rmaRes.data || []).reduce((acc: number, r: any) => acc + (Number(r.personnes_touchees_total) || 0), 0);
    nbMenages = sumMenages;
    nbPersonnes = sumPersonnes > 0 ? sumPersonnes.toLocaleString("fr-FR") : "0";
    conseils = conseilsRes.data || [];
    publicationsFacebook = (fbRes?.data as PublicationFacebook[]) || [];

    if (!couvertureRpcRes.error && Array.isArray(couvertureRpcRes.data)) {
      couvertureData = couvertureRpcRes.data.map((c: any) => ({
        commune_id: c.commune_id,
        nombre_ascq: Number(c.nombre_ascq) || 0
      }));
    }
  } catch (err) {
    console.warn("Accueil hors-ligne / réseau instable :", err);
  }

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
            href="/connexion?action=login"
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

        {/* 4. Boutons intelligents d'acces */}
        <HomeAuthButtons />

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

        {/* 5 bis. Carte de couverture nationale des 77 communes */}
        {couvertureData && (
          <CarteCouvertureBenin couverture={couvertureData} />
        )}

        {/* 6. Zone « Dernières publications » Facebook (remplace l'ancienne carte Conseils santé) */}
        <DernieresPublicationsFacebook publications={publicationsFacebook} />

        {/* 7. Carte « Qui est l'ASCQ de mon milieu ? » */}
        <section>
          <QuiEstAscqCard departements={departements} />
        </section>

        {/* 8. Carte verte pâle « Aidez-nous à mieux vous servir » */}
        <section>
          <SuggestionsCard departements={departements} />
        </section>

        {/* 9. Réseaux sociaux & Plateformes officielles */}
        <SocialPlatformsCard />

      </main>
    </div>
  );
}
