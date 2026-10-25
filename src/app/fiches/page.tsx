"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  ShieldAlert,
  Filter
} from "lucide-react";
import AscqNav from "@/components/AscqNav";
import { recupererBrouillonsAlertes } from "@/lib/fiches";

export default function MesFichesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alertes, setAlertes] = useState<any[]>([]);
  const [filtreType, setFiltreType] = useState<string>("TOUT");
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

      // Charger les alertes via RPC
      const { data: alertesData, error } = await supabase.rpc("lister_mes_alertes");
      if (error) {
        console.error("Erreur lister_mes_alertes:", error);
      } else {
        setAlertes(alertesData || []);
      }

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

  // Filtrage
  const alertesFiltrees = alertes.filter((a) => {
    // Filtre statut
    if (filtreStatut === "PRIORITAIRE" && !a.est_prioritaire) return false;
    if (filtreStatut === "EN_ATTENTE" && a.resultat_verification !== "EN_ATTENTE") return false;
    if (filtreStatut === "AVEREE" && a.resultat_verification !== "AVEREE") return false;

    // Filtre recherche textuelle
    if (recherche.trim() !== "") {
      const q = recherche.toLowerCase();
      const matchNum = a.numero_alerte?.toLowerCase().includes(q);
      const matchType = a.type_alerte_nom?.toLowerCase().includes(q);
      const matchVillage = a.village_nom?.toLowerCase().includes(q);
      const matchCommune = a.commune_nom?.toLowerCase().includes(q);
      return matchNum || matchType || matchVillage || matchCommune;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-24">
      {/* Barre de navigation si ASCQ, sinon en-tête simple pour RC */}
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
        
        {/* Titre & Bouton Nouvelle fiche */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-emerald-100 text-[#005c30]">
                Module Surveillance
              </span>
              <span className="text-xs text-slate-400 font-bold">Phase 6</span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mt-1">
              Mes Fiches de Surveillance
            </h2>
            <p className="text-xs text-slate-500">
              Notification immédiate des alertes, registre et suivi épidémiologique.
            </p>
          </div>

          <Link
            href="/fiches/nouvelle"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md shadow-emerald-900/10 active:scale-95 transition-all shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nouvelle fiche</span>
          </Link>
        </div>

        {/* Alerte brouillons locaux en attente */}
        {brouillonsCount > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-900">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold">{brouillonsCount} brouillon(s)</span> enregistré(s) sur cet appareil.
              </div>
            </div>
            <Link
              href="/fiches/alerte/nouvelle"
              className="text-xs font-bold text-amber-700 underline hover:text-amber-900"
            >
              Reprendre
            </Link>
          </div>
        )}

        {/* Filtres par type de fiches (Onglets officiels) */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200/80 shadow-sm flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFiltreType("TOUT")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filtreType === "TOUT"
                ? "bg-[#005c30] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Toutes les fiches ({alertes.length})
          </button>

          <button
            onClick={() => setFiltreType("ALR")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filtreType === "ALR"
                ? "bg-[#005c30] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alertes (ALR)</span>
          </button>

          <button
            onClick={() => alert("Le Registre communautaire (REG) sera déployé en Phase 7.")}
            className="px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap text-slate-400 hover:bg-slate-50 opacity-60 cursor-pointer"
          >
            Registre (REG)
          </button>

          <button
            onClick={() => alert("La Notification de décès (DEC) sera déployée en Phase 7.")}
            className="px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap text-slate-400 hover:bg-slate-50 opacity-60 cursor-pointer"
          >
            Décès (DEC)
          </button>

          <button
            onClick={() => alert("L'Investigation d'événement (INV) sera déployée en Phase 7.")}
            className="px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap text-slate-400 hover:bg-slate-50 opacity-60 cursor-pointer"
          >
            Investigation (INV)
          </button>

          <button
            onClick={() => alert("Le Rapport hebdomadaire (RAP) sera déployé en Phase 7.")}
            className="px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap text-slate-400 hover:bg-slate-50 opacity-60 cursor-pointer"
          >
            Rapports (RAP)
          </button>
        </div>

        {/* Barre de recherche & Filtres rapides */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro, maladie, village..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30] shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setFiltreStatut(filtreStatut === "PRIORITAIRE" ? "TOUT" : "PRIORITAIRE")}
              className={`px-3 py-2 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filtreStatut === "PRIORITAIRE"
                  ? "bg-red-500 text-white border-red-600 shadow-sm"
                  : "bg-white text-red-600 border-red-200 hover:bg-red-50"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Prioritaires</span>
            </button>

            <button
              onClick={() => setFiltreStatut(filtreStatut === "EN_ATTENTE" ? "TOUT" : "EN_ATTENTE")}
              className={`px-3 py-2 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filtreStatut === "EN_ATTENTE"
                  ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                  : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>En attente vérif.</span>
            </button>

            <button
              onClick={() => setFiltreStatut(filtreStatut === "AVEREE" ? "TOUT" : "AVEREE")}
              className={`px-3 py-2 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filtreStatut === "AVEREE"
                  ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                  : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Avérées</span>
            </button>
          </div>
        </div>

        {/* Liste des fiches */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center space-y-2 border border-slate-200/80 shadow-sm">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#005c30]" />
            <p className="text-xs text-slate-500 font-semibold">Chargement des fiches...</p>
          </div>
        ) : alertesFiltrees.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center space-y-4 border border-slate-200/80 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-[#005c30] flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-900">
                {alertes.length === 0 ? "Aucune alerte enregistrée" : "Aucun résultat trouvé"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {alertes.length === 0
                  ? "Déclarez une alerte communautaire pour amorcer la surveillance épidémiologique de votre localité."
                  : "Essayez de modifier votre recherche ou vos filtres pour voir d'autres résultats."}
              </p>
            </div>
            {alertes.length === 0 && (
              <Link
                href="/fiches/alerte/nouvelle"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#005c30] text-white text-xs font-bold shadow-md hover:bg-[#004724] active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Déclarer une alerte pilote</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {alertesFiltrees.map((alerte) => {
              const isPrioritaire = alerte.est_prioritaire;
              return (
                <Link
                  key={alerte.id}
                  href={`/fiches/alerte/${alerte.id}`}
                  className={`block bg-white rounded-3xl p-4 sm:p-5 border transition-all hover:shadow-md ${
                    isPrioritaire
                      ? "border-red-300 hover:border-red-400 bg-red-50/20"
                      : "border-slate-200/80 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    {/* Colonne gauche : Type d'alerte, Numéro, Localisation */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-mono text-xs font-extrabold text-[#005c30] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                          {alerte.numero_alerte}
                        </span>

                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                          Semaine {alerte.semaine_epidemio} / {alerte.annee}
                        </span>

                        {isPrioritaire && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded-lg animate-pulse">
                            <Flame className="w-3 h-3 text-red-600" />
                            <span>Alerte Prioritaire</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                          {alerte.type_alerte_nom}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Village : <strong className="text-slate-700">{alerte.village_nom}</strong></span>
                          <span>•</span>
                          <span>{alerte.commune_nom}</span>
                        </p>
                      </div>

                      {/* Notificateur et date */}
                      <div className="flex items-center flex-wrap gap-3 text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{alerte.notificateur_titre} : {alerte.notificateur_nom_complet}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Notifié le {alerte.date_notification}</span>
                        </span>
                      </div>
                    </div>

                    {/* Colonne droite : Chiffres d'impact, Badge vérification & Flèche */}
                    <div className="flex flex-col items-end justify-between gap-3 shrink-0 self-stretch">
                      
                      {/* Statut vérification */}
                      <div>
                        {alerte.resultat_verification === "AVEREE" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Avérée</span>
                          </span>
                        ) : alerte.resultat_verification === "NON_AVEREE" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                            <span>Non avérée</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>À vérifier</span>
                          </span>
                        )}
                      </div>

                      {/* Bilan d'impact court */}
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-700 block">
                          {alerte.nb_personnes_touchees} touché(s)
                        </span>
                        {alerte.nb_personnes_mortes > 0 && (
                          <span className="text-[11px] font-bold text-red-600 block">
                            {alerte.nb_personnes_mortes} décès
                          </span>
                        )}
                      </div>

                      <div className="text-slate-400 group-hover:text-emerald-600">
                        <ChevronRight className="w-5 h-5" />
                      </div>
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
