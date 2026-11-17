import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import QuiEstAscqCard from "@/components/QuiEstAscqCard";
import SuggestionsCard from "@/components/SuggestionsCard";
import { HeartPulse, ExternalLink, RefreshCw, Sparkles, MapPin } from "lucide-react";
import { SocialPlatformsCard, FacebookIcon } from "@/components/SocialLinks";
import CarteCouvertureBenin from "@/components/CarteCouvertureBenin";
import HomeAuthButtons from "@/components/HomeAuthButtons";
import DernieresPublicationsFacebook, { PublicationFacebook } from "@/components/DernieresPublicationsFacebook";
import BoutonVerifierMiseAJour from "@/components/BoutonVerifierMiseAJour";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function HomePage() {
  // Récupérer les données réelles pour la page d'accueil
  let departements: any[] = [];
  let nbAscq = 0;
  let nbRc = 0;
  let nbMenages = 0;
  let nbPersonnes = "0";
  let conseils: any[] = [];
  let publicationsFacebook: PublicationFacebook[] = [];
  let couvertureData: Array<{
    commune_id: string;
    commune_nom?: string;
    nombre_ascq: number;
    nombre_rc?: number;
    total_agents?: number;
  }> = [];

  try {
    const [
      depsRes,
      ascqCountRes,
      rcUsersRes,
      rcTableRes,
      usersCommunesRes,
      rmaRes,
      conseilsRes,
      fbRes,
      couvertureRpcRes,
    ] = await Promise.all([
      supabase.from("departements").select("id, nom").order("nom"),
      supabase.from("utilisateurs").select("*", { count: "exact", head: true }).eq("poste", "ASCQ").eq("statut_compte", "VALIDE"),
      supabase.from("utilisateurs").select("*", { count: "exact", head: true }).eq("poste", "RC"),
      supabase.from("relais_communautaires").select("*", { count: "exact", head: true }),
      supabase.from("utilisateurs").select("commune_id, poste, statut_compte").not("commune_id", "is", null),
      supabase.from("rapports_mensuels_ascq").select("menages_visites, personnes_touchees_total"),
      supabase.from("conseils_sante").select("*").eq("est_publie", true).order("created_at", { ascending: false }),
      supabase.from("publications_facebook").select("id_facebook, message, permalink_url, created_time, fetched_at").order("created_time", { ascending: false }).limit(3),
      supabase.rpc("obtenir_couverture_communale_ascq"),
    ]);

    departements = depsRes.data || [];
    nbAscq = ascqCountRes.count ?? 0;
    
    // Nombre réel de RC inscrits (utilisateurs avec poste = RC ou table relais_communautaires)
    nbRc = Math.max(rcUsersRes.count ?? 0, rcTableRes.count ?? 0);

    const sumMenages = (rmaRes.data || []).reduce((acc: number, r: any) => acc + (Number(r.menages_visites) || 0), 0);
    const sumPersonnes = (rmaRes.data || []).reduce((acc: number, r: any) => acc + (Number(r.personnes_touchees_total) || 0), 0);
    nbMenages = sumMenages;
    nbPersonnes = sumPersonnes > 0 ? sumPersonnes.toLocaleString("fr-FR") : "0";
    conseils = conseilsRes.data || [];
    publicationsFacebook = (fbRes?.data as PublicationFacebook[]) || [];

    // Priorité 1 : RPC si disponible
    if (!couvertureRpcRes.error && Array.isArray(couvertureRpcRes.data) && couvertureRpcRes.data.length > 0) {
      couvertureData = couvertureRpcRes.data.map((c: any) => ({
        commune_id: c.commune_id,
        nombre_ascq: Number(c.nombre_ascq) || 0,
      }));
    } else {
      // Priorité 2 : Agréger directement depuis les utilisateurs réels en base
      const communeMap = new Map<string, { total: number; ascq: number; rc: number }>();
      (usersCommunesRes.data || []).forEach((u: any) => {
        if (!u.commune_id) return;
        const cur = communeMap.get(u.commune_id) || { total: 0, ascq: 0, rc: 0 };
        cur.total += 1;
        if (u.poste === "ASCQ") cur.ascq += 1;
        if (u.poste === "RC") cur.rc += 1;
        communeMap.set(u.commune_id, cur);
      });

      couvertureData = Array.from(communeMap.entries()).map(([commune_id, c]) => ({
        commune_id,
        nombre_ascq: c.ascq,
        nombre_rc: c.rc,
        total_agents: c.total,
      }));
    }
  } catch (err) {
    console.warn("Accueil hors-ligne / réseau instable :", err);
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-16">
      {/* 1. En-tête officiel certifié : Bannière CNLS-TP / Présidence du Bénin & Logo ASC Santé Communautaire */}
      <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30">
        <div className="max-w-xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/banniere-cnlstp.png"
              alt="Bannière Officielle CNLS-TP"
              width={220}
              height={50}
              priority
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <BoutonVerifierMiseAJour variant="compact" />
            <div className="w-9 h-9 rounded-full overflow-hidden border border-emerald-500/30 shadow-xs shrink-0">
              <Image
                src="/logo-asc-benin.jpg"
                alt="Logo ASC Bénin"
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Bandeau tricolore vert, jaune, rouge officiel */}
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>

        {/* Bandeau Phase Pilote Officielle Département du Zou */}
        <div className="bg-[#005c30] text-white px-3 py-1.5 text-center text-xs font-bold flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>
          <span>📍 PHASE PILOTE OFFICIELLE EN COURS — DÉPARTEMENT DU ZOU</span>
        </div>
      </header>

      {/* Contenu principal : mobile-first, centré, largeur maximale confortable */}
      <main className="max-w-md sm:max-w-lg mx-auto px-4 pt-4 space-y-4">
        
        {/* 2. Titre officiel certifié & Logo Santé Communautaire */}
        <section className="text-center space-y-2 pt-1 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] uppercase tracking-widest font-black text-slate-500">
            République du Bénin • Présidence de la République
          </p>

          <h2 className="text-lg sm:text-xl font-black text-[#002d62] uppercase tracking-wide leading-tight">
            Santé Communautaire du Bénin
          </h2>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#005c30] text-xs font-black border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Programme National de Santé Communautaire (PNSC)</span>
          </div>

          <div className="pt-2 flex flex-col items-center justify-center">
            <div className="w-44 sm:w-52 h-auto drop-shadow-xs">
              <Image
                src="/logo-asc-benin.jpg"
                alt="ASC - Santé Communautaire du Bénin"
                width={208}
                height={208}
                priority
                className="w-full h-auto object-contain rounded-2xl"
              />
            </div>
            <p className="mt-2 text-xs font-black tracking-widest text-[#005c30] uppercase">
              Proximité • Prévention • Solidarité
            </p>
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

        {/* Barre de statut dynamique et synchronisation en direct */}
        <div className="flex items-center justify-between text-[11px] bg-white px-3.5 py-2 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-slate-800">Données en direct</span>
            <span className="text-slate-400 font-mono text-[10px]">• v{APP_VERSION}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Phase Pilote Zou
            </span>
          </div>
        </div>

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
              ASCQ opérationnels (Zou)
            </p>
          </div>

          {/* Carte 2 */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-1">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#005b60] tracking-tight">
              {nbRc}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight">
              Relais communautaires inscrits
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

        {/* 10. Point de vérification des Mises à jour */}
        <BoutonVerifierMiseAJour variant="card" />

      </main>
    </div>
  );
}
