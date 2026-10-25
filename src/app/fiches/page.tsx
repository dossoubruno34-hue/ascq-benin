"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  FileText, 
  Plus, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  User, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  RefreshCw,
  Search,
  ArrowLeft,
  Flame,
  ClipboardList,
  Skull,
  FileSpreadsheet
} from "lucide-react";
import AscqNav from "@/components/AscqNav";
import { recupererBrouillonsAlertes, corrigerAccents } from "@/lib/fiches";

export default function MesFichesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Données de surveillance
  const [alertes, setAlertes] = useState<any[]>([]);
  const [registres, setRegistres] = useState<any[]>([]);
  const [deces, setDeces] = useState<any[]>([]);
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [rapports, setRapports] = useState<any[]>([]);

  const [filtreType, setFiltreType] = useState<"TOUT" | "ALR" | "REG" | "DEC" | "INV" | "RAP">("TOUT");
  const [filtreStatut, setFiltreStatut] = useState<string>("TOUT");
  const [recherche, setRecherche] = useState("");
  const [brouillonsCount, setBrouillonsCount] = useState(0);

  const chargerFiches = async () => {
    setLoading(true);
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

      // 1. Alertes (ALR)
      const { data: alertesData } = await supabase.rpc("lister_mes_alertes");
      setAlertes(alertesData || []);

      // 2. Registre (REG)
      const { data: regData } = await supabase
        .from("registre_alertes_rumeurs")
        .select("*")
        .order("created_at", { ascending: false });
      setRegistres(regData || []);

      // 3. Décès (DEC)
      const { data: decData } = await supabase
        .from("deces_communautaires")
        .select("*")
        .order("created_at", { ascending: false });
      setDeces(decData || []);

      // 4. Investigations (INV)
      const { data: invData } = await supabase
        .from("investigations_evenements")
        .select("*")
        .order("created_at", { ascending: false });
      setInvestigations(invData || []);

      // 5. Rapports hebdomadaires (RAP)
      const { data: rapData } = await supabase
        .from("rapports_hebdomadaires")
        .select("*")
        .order("created_at", { ascending: false });
      setRapports(rapData || []);

      // Vérifier les brouillons locaux
      const drafts = recupererBrouillonsAlertes();
      setBrouillonsCount(drafts.length);

    } catch (err) {
      console.error("Erreur chargement fiches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerFiches();
  }, []);

  // Unification des fiches pour affichage et filtrage
  const fichesUnifiees: any[] = [
    ...alertes.map((a) => ({
      id: a.id,
      type: "ALR",
      numero: a.numero_alerte,
      titre: corrigerAccents(a.type_alerte_nom),
      village: a.village_nom,
      commune: a.commune_nom,
      date: a.date_notification,
      annee: a.annee,
      semaine: a.semaine_epidemio,
      statut: a.statut,
      resultat: a.resultat_verification,
      estPrioritaire: a.est_prioritaire,
      impact: `${a.nb_personnes_touchees} touché(s) • ${a.nb_personnes_mortes} décès`,
      notificateur: `${a.notificateur_titre} : ${a.notificateur_nom_complet}`,
      url: `/fiches/alerte/${a.id}`,
    })),
    ...registres.map((r) => ({
      id: r.id,
      type: "REG",
      numero: r.numero_registre,
      titre: corrigerAccents(r.type_nom),
      village: r.village_nom,
      commune: "Communauté",
      date: r.date_survenue,
      annee: r.annee,
      semaine: null,
      statut: r.statut,
      resultat: null,
      estPrioritaire: false,
      impact: `${r.nb_personnes_touchees} touché(s) • ${r.nb_personnes_decedees} décès`,
      notificateur: r.relais_nom_complet,
      url: `/fiches/registre/nouvelle`,
    })),
    ...deces.map((d) => ({
      id: d.id,
      type: "DEC",
      numero: d.numero_deces,
      titre: corrigerAccents(d.type_deces_nom),
      village: d.village_nom,
      commune: "Zone sanitaire",
      date: d.date_deces,
      annee: d.annee,
      semaine: d.semaine_epidemio,
      statut: d.statut,
      resultat: null,
      estPrioritaire: d.type_deces_code === 1 || d.type_deces_code === 2,
      impact: `Lieu : ${corrigerAccents(d.lieu_deces_nom)}`,
      notificateur: `${d.notificateur_titre} : ${d.notificateur_nom_complet}`,
      url: `/fiches/deces/nouvelle`,
    })),
    ...investigations.map((i) => ({
      id: i.id,
      type: "INV",
      numero: i.numero_investigation,
      titre: `Investigation : ${corrigerAccents(i.type_alerte_nom)}`,
      village: i.village_nom,
      commune: "Zone sanitaire",
      date: i.date_investigation,
      annee: i.annee,
      semaine: i.semaine_epidemio,
      statut: i.statut,
      resultat: i.evenement_avere ? "AVEREE" : "NON_AVEREE",
      estPrioritaire: false,
      impact: `${i.total_cas} cas investigué(s) • ${i.total_deces} décès`,
      notificateur: i.investigateur_nom,
      url: `/fiches/investigation/nouvelle`,
    })),
    ...rapports.map((rap) => ({
      id: rap.id,
      type: "RAP",
      numero: rap.numero_rapport,
      titre: `Rapport Hebdomadaire Semaine ${rap.semaine_epidemio}`,
      village: rap.village_nom,
      commune: "Zone sanitaire",
      date: rap.date_debut_semaine,
      annee: rap.annee,
      semaine: rap.semaine_epidemio,
      statut: rap.statut,
      resultat: null,
      estPrioritaire: false,
      impact: `${rap.alertes_detectees} alertes • ${rap.deces_maternels + rap.deces_neonatals + rap.deces_infantiles + rap.deces_plus_5_ans} décès`,
      notificateur: rap.rapporteur_nom,
      url: `/fiches/rapport-hebdo/nouvelle`,
    })),
  ];

  // Tri antichronologique
  fichesUnifiees.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filtrage
  const fichesFiltrees = fichesUnifiees.filter((f) => {
    if (filtreType !== "TOUT" && f.type !== filtreType) return false;
    if (filtreStatut === "PRIORITAIRE" && !f.estPrioritaire) return false;
    if (filtreStatut === "EN_ATTENTE" && f.resultat !== "EN_ATTENTE") return false;
    if (filtreStatut === "AVEREE" && f.resultat !== "AVEREE") return false;

    if (recherche.trim() !== "") {
      const q = recherche.toLowerCase();
      const matchNum = f.numero?.toLowerCase().includes(q);
      const matchTitre = f.titre?.toLowerCase().includes(q);
      const matchVillage = f.village?.toLowerCase().includes(q);
      return matchNum || matchTitre || matchVillage;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-24">
      {currentUser?.poste === "ASCQ" ? (
        <AscqNav userProfile={currentUser} />
      ) : (
        <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/espace-rc" className="flex items-center gap-2 text-white/90 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-xs font-bold">Retour Espace RC</span>
            </Link>
            <h1 className="text-sm font-extrabold">Surveillance Communautaire</h1>
            <div className="w-8"></div>
          </div>
          <div className="h-1 w-full flex">
            <span className="w-1/3 bg-[#008751]"></span>
            <span className="w-1/3 bg-[#FCD116]"></span>
            <span className="w-1/3 bg-[#E8112D]"></span>
          </div>
        </header>
      )}

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-4">
        
        {/* En-tête de section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-emerald-100 text-[#005c30]">
                Surveillance Officielle
              </span>
              <span className="text-xs text-slate-400 font-bold">Phase 7 Active</span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mt-1">
              Fiches de Surveillance Communautaire
            </h2>
            <p className="text-xs text-slate-500">
              Alertes, Registre, Décès, Investigations et Rapports hebdomadaires.
            </p>
          </div>

          <Link
            href="/fiches/nouvelle"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nouvelle fiche</span>
          </Link>
        </div>

        {/* Brouillons en attente */}
        {brouillonsCount > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-900">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold">{brouillonsCount} brouillon(s)</span> d'alerte sauvegardé(s) localement.
              </div>
            </div>
            <Link href="/fiches/alerte/nouvelle" className="text-xs font-bold text-amber-700 underline">
              Reprendre
            </Link>
          </div>
        )}

        {/* Onglets de filtrage par type officiel */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200/80 shadow-sm flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFiltreType("TOUT")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filtreType === "TOUT" ? "bg-[#005c30] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Toutes ({fichesUnifiees.length})
          </button>

          <button
            onClick={() => setFiltreType("ALR")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filtreType === "ALR" ? "bg-[#005c30] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alertes ({alertes.length})</span>
          </button>

          <button
            onClick={() => setFiltreType("REG")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filtreType === "REG" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Registre ({registres.length})</span>
          </button>

          <button
            onClick={() => setFiltreType("DEC")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filtreType === "DEC" ? "bg-purple-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Skull className="w-3.5 h-3.5" />
            <span>Décès ({deces.length})</span>
          </button>

          <button
            onClick={() => setFiltreType("INV")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filtreType === "INV" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Investigations ({investigations.length})</span>
          </button>

          <button
            onClick={() => setFiltreType("RAP")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filtreType === "RAP" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Rapports ({rapports.length})</span>
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro, titre, village..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFiltreStatut(filtreStatut === "PRIORITAIRE" ? "TOUT" : "PRIORITAIRE")}
              className={`px-3 py-2 rounded-2xl text-xs font-bold border flex items-center gap-1.5 whitespace-nowrap ${
                filtreStatut === "PRIORITAIRE" ? "bg-red-500 text-white border-red-600" : "bg-white text-red-600 border-red-200"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Prioritaires</span>
            </button>
          </div>
        </div>

        {/* Liste des fiches */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center space-y-2 border border-slate-200/80 shadow-sm">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#005c30]" />
            <p className="text-xs text-slate-500 font-semibold">Chargement des fiches...</p>
          </div>
        ) : fichesFiltrees.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center space-y-4 border border-slate-200/80 shadow-sm">
            <FileText className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-extrabold text-slate-900">Aucune fiche trouvée</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Sélectionnez une nouvelle fiche à renseigner pour débuter la saisie.
            </p>
            <Link
              href="/fiches/nouvelle"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#005c30] text-white text-xs font-bold shadow-md hover:bg-[#004724]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Créer une fiche</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {fichesFiltrees.map((f) => {
              const badgeBg = f.type === "ALR" ? "bg-emerald-50 text-[#005c30] border-emerald-100" :
                              f.type === "REG" ? "bg-blue-50 text-blue-700 border-blue-100" :
                              f.type === "DEC" ? "bg-purple-50 text-purple-700 border-purple-100" :
                              f.type === "INV" ? "bg-amber-50 text-amber-800 border-amber-100" :
                              "bg-indigo-50 text-indigo-700 border-indigo-100";

              return (
                <Link
                  key={`${f.type}_${f.id}`}
                  href={f.url}
                  className={`block bg-white rounded-3xl p-4 sm:p-5 border transition-all hover:shadow-md ${
                    f.estPrioritaire ? "border-red-300 bg-red-50/20" : "border-slate-200/80 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg border ${badgeBg}`}>
                          {f.numero}
                        </span>

                        {f.semaine && (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                            Semaine {f.semaine}
                          </span>
                        )}

                        {f.estPrioritaire && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-lg">
                            <Flame className="w-3 h-3 text-red-600" />
                            <span>Prioritaire</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                        {f.titre}
                      </h3>

                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Village : <strong className="text-slate-700">{f.village}</strong></span>
                      </p>

                      <div className="flex items-center flex-wrap gap-3 text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{f.notificateur}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{f.date}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between gap-3 shrink-0 self-stretch">
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        {f.impact}
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}
