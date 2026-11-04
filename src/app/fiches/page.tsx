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
  FileSpreadsheet,
  Printer,
  Download,
  Eye,
  X,
  ExternalLink,
  ShieldCheck,
  Phone,
  Activity,
  Stethoscope,
  HeartPulse
} from "lucide-react";
import AscqNav from "@/components/AscqNav";
import { recupererBrouillonsAlertes, corrigerAccents } from "@/lib/fiches";
import { 
  exporterRegistreSurveillanceExcel, 
  exporterFicheSurveillanceIndividuelleExcel 
} from "@/lib/excelExport";

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
  const [page, setPage] = useState(1);
  const FICHES_PER_PAGE = 15;

  // Fiche sélectionnée pour consultation & impression officielle
  const [ficheConsultation, setFicheConsultation] = useState<any | null>(null);
  // Mode d'impression du registre complet
  const [imprimerModeRegistre, setImprimerModeRegistre] = useState<boolean>(false);
  // Référentiel territorial en état React
  const [territoryMaps, setTerritoryMaps] = useState<{
    dMap: Record<string, string>;
    cMap: Record<string, string>;
    aMap: Record<string, string>;
  }>({ dMap: {}, cMap: {}, aMap: {} });

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

      // Chargement référentiel territorial pour résolution immédiate des libellés réels
      const [
        { data: depsData },
        { data: comsData },
        { data: arrsData }
      ] = await Promise.all([
        supabase.from("departements").select("id, nom"),
        supabase.from("communes").select("id, nom"),
        supabase.from("arrondissements").select("id, nom"),
      ]);

      const dMap: Record<string, string> = {};
      depsData?.forEach((d) => { dMap[d.id] = d.nom; });
      const cMap: Record<string, string> = {};
      comsData?.forEach((c) => { cMap[c.id] = c.nom; });
      const aMap: Record<string, string> = {};
      arrsData?.forEach((a) => { aMap[a.id] = a.nom; });

      setTerritoryMaps({ dMap, cMap, aMap });

      // 1. Alertes (ALR) avec identité miroir
      const { data: alertesData } = await supabase
        .from("alertes_communautaires")
        .select(`
          *,
          cas_identite_privee (nom, prenoms, telephone_contact, adresse_domicile)
        `)
        .order("created_at", { ascending: false });
      setAlertes(alertesData || []);

      // 2. Registre (REG)
      const { data: regData } = await supabase
        .from("registre_alertes_rumeurs")
        .select("*")
        .order("created_at", { ascending: false });
      setRegistres(regData || []);

      // 3. Décès (DEC) avec identité miroir
      const { data: decData } = await supabase
        .from("deces_communautaires")
        .select(`
          *,
          deces_identite_privee (nom_defunt, prenoms_defunt, nom_parent, telephone_parent, adresse_domicile)
        `)
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

      // Brouillons locaux
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

  const { dMap = {}, cMap = {}, aMap = {} } = territoryMaps;

  // Unification des fiches pour affichage, filtrage, consultation, impression et export
  const fichesUnifiees: any[] = [
    ...alertes.map((a) => {
      const privee = Array.isArray(a.cas_identite_privee) ? a.cas_identite_privee[0] : a.cas_identite_privee;
      const nomCas = a.nom_cas || privee?.nom || "";
      const prenomsCas = a.prenoms_cas || privee?.prenoms || "";
      const nomCompletCas = (a.cas_nom_prenom || `${nomCas} ${prenomsCas}`.trim()) || "Cas index";
      const telCas = a.telephone_contact || privee?.telephone_contact || "";
      const adrCas = a.adresse_domicile || privee?.adresse_domicile || "";
      const depNom = (!a.departement_nom || a.departement_nom === "Département" || a.departement_nom === "Zone Sanitaire")
        ? (dMap[a.departement_id] || "Zou")
        : a.departement_nom;
      const comNom = (!a.commune_nom || a.commune_nom === "Zone sanitaire" || a.commune_nom === "Communauté")
        ? (cMap[a.commune_id] || "Ouinhi")
        : a.commune_nom;
      const arrNom = (!a.arrondissement_nom || a.arrondissement_nom === "Local" || a.arrondissement_nom === "Arrondissement")
        ? (aMap[a.arrondissement_id] || "Tohoues")
        : a.arrondissement_nom;

      const rawEnriched = {
        ...a,
        nom_cas: nomCas,
        prenoms_cas: prenomsCas,
        cas_nom_prenom: nomCompletCas,
        cas_nom: nomCas,
        cas_prenoms: prenomsCas,
        telephone_contact: telCas,
        adresse_domicile: adrCas,
        departement_nom: depNom,
        commune_nom: comNom,
        arrondissement_nom: arrNom
      };

      return {
        id: a.id,
        type: "ALR",
        typeLibelle: "Alerte SIMR",
        numero: a.numero_alerte,
        titre: `${nomCompletCas} — ${corrigerAccents(a.type_alerte_nom)}`,
        village: a.village_nom || "Non précisé",
        commune: comNom,
        departement: depNom,
        arrondissement: arrNom,
        date: a.date_notification,
        annee: a.annee,
        semaine: a.semaine_epidemio,
        statut: a.statut,
        resultat: a.resultat_verification,
        estPrioritaire: a.est_prioritaire,
        impact: `${a.nb_personnes_touchees} touché(s) • ${a.nb_personnes_mortes} décès`,
        notificateur: `${a.notificateur_titre || 'ASCQ'} : ${a.notificateur_nom_complet}`,
        notificateurTel: a.notificateur_telephone,
        notificateurTitre: a.notificateur_titre,
        url: `/fiches/alerte/${a.id}`,
        rawData: rawEnriched
      };
    }),
    ...registres.map((r) => ({
      id: r.id,
      type: "REG",
      typeLibelle: "Registre Rumeurs",
      numero: r.numero_registre,
      titre: corrigerAccents(r.type_nom),
      village: r.village_nom || "Non précisé",
      commune: cMap[r.commune_id] || "Communauté",
      departement: dMap[r.departement_id] || "Zone Sanitaire",
      arrondissement: aMap[r.arrondissement_id] || "Local",
      date: r.date_survenue,
      annee: r.annee,
      semaine: null,
      statut: r.statut,
      resultat: null,
      estPrioritaire: false,
      impact: `${r.nb_personnes_touchees} touché(s) • ${r.nb_personnes_decedees} décès`,
      notificateur: r.relais_nom_complet,
      notificateurTel: r.relais_telephone,
      notificateurTitre: "RC",
      url: `/fiches/registre/nouvelle`,
      rawData: r
    })),
    ...deces.map((d) => {
      const privee = Array.isArray(d.deces_identite_privee) ? d.deces_identite_privee[0] : d.deces_identite_privee;
      const nomDef = d.nom_defunt || privee?.nom_defunt || "";
      const prenomsDef = d.prenoms_defunt || privee?.prenoms_defunt || "";
      const defuntComplet = (d.defunt_nom_prenom || `${nomDef} ${prenomsDef}`.trim()) || "Défunt";
      const nomParent = d.nom_parent || privee?.nom_parent || "";
      const telParent = d.telephone_parent || privee?.telephone_parent || "";
      const adrDefunt = d.adresse_domicile || privee?.adresse_domicile || "";
      const depNom = (!d.departement_nom || d.departement_nom === "Département" || d.departement_nom === "Zone Sanitaire")
        ? (dMap[d.departement_id] || "Zou")
        : d.departement_nom;
      const comNom = (!d.commune_nom || d.commune_nom === "Zone sanitaire" || d.commune_nom === "Communauté")
        ? (cMap[d.commune_id] || "Ouinhi")
        : d.commune_nom;
      const arrNom = (!d.arrondissement_nom || d.arrondissement_nom === "Local" || d.arrondissement_nom === "Arrondissement")
        ? (aMap[d.arrondissement_id] || "Tohoues")
        : d.arrondissement_nom;

      const rawEnriched = {
        ...d,
        nom_defunt: nomDef,
        prenoms_defunt: prenomsDef,
        defunt_nom_prenom: defuntComplet,
        nom_parent: nomParent,
        telephone_parent: telParent,
        adresse_domicile: adrDefunt,
        departement_nom: depNom,
        commune_nom: comNom,
        arrondissement_nom: arrNom
      };

      return {
        id: d.id,
        type: "DEC",
        typeLibelle: "Décès Communautaire",
        numero: d.numero_deces,
        titre: `${defuntComplet} — ${corrigerAccents(d.type_deces_nom)}`,
        village: d.village_nom || "Non précisé",
        commune: comNom,
        departement: depNom,
        arrondissement: arrNom,
        date: d.date_deces,
        annee: d.annee,
        semaine: d.semaine_epidemio,
        statut: d.statut,
        resultat: null,
        estPrioritaire: d.type_deces_code === 1 || d.type_deces_code === 2,
        impact: `Lieu : ${corrigerAccents(d.lieu_deces_nom)} • Circonstance : ${corrigerAccents(d.circonstance_nom || '')}`,
        notificateur: `${d.notificateur_titre || 'ASCQ'} : ${d.notificateur_nom_complet}`,
        notificateurTel: d.notificateur_telephone,
        notificateurTitre: d.notificateur_titre,
        url: `/fiches/deces/nouvelle`,
        rawData: rawEnriched
      };
    }),
    ...investigations.map((i) => ({
      id: i.id,
      type: "INV",
      typeLibelle: "Investigation",
      numero: i.numero_investigation,
      titre: `Investigation : ${corrigerAccents(i.type_alerte_nom)}`,
      village: i.village_nom,
      commune: cMap[i.commune_id] || "Zone sanitaire",
      departement: dMap[i.departement_id] || "Département",
      arrondissement: aMap[i.arrondissement_id] || "Arrondissement",
      date: i.date_investigation,
      annee: i.annee,
      semaine: i.semaine_epidemio,
      statut: i.statut,
      resultat: i.evenement_avere ? "AVEREE" : "NON_AVEREE",
      estPrioritaire: false,
      impact: `${i.total_cas} cas investigué(s) • ${i.total_deces} décès`,
      notificateur: i.investigateur_nom,
      notificateurTel: i.investigateur_telephone || "-",
      notificateurTitre: "ASCQ",
      url: `/fiches/investigation/nouvelle`,
      rawData: i
    })),
    ...rapports.map((rap) => ({
      id: rap.id,
      type: "RAP",
      typeLibelle: "Rapport Hebdo",
      numero: rap.numero_rapport,
      titre: `Rapport Hebdomadaire Semaine ${rap.semaine_epidemio}`,
      village: rap.village_nom,
      commune: cMap[rap.commune_id] || "Zone sanitaire",
      departement: dMap[rap.departement_id] || "Département",
      arrondissement: aMap[rap.arrondissement_id] || "Arrondissement",
      date: rap.date_debut_semaine,
      annee: rap.annee,
      semaine: rap.semaine_epidemio,
      statut: rap.statut,
      resultat: null,
      estPrioritaire: false,
      impact: `${rap.alertes_detectees} alertes • ${rap.deces_maternels + rap.deces_neonatals + rap.deces_infantiles + rap.deces_plus_5_ans} décès`,
      notificateur: rap.rapporteur_nom,
      notificateurTel: rap.rapporteur_telephone || "-",
      notificateurTitre: "ASCQ",
      url: `/fiches/rapport-hebdo/nouvelle`,
      rawData: rap
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

  const totalPages = Math.ceil(fichesFiltrees.length / FICHES_PER_PAGE) || 1;
  const paginatedFiches = fichesFiltrees.slice((page - 1) * FICHES_PER_PAGE, page * FICHES_PER_PAGE);

  // Déclencheurs d'impression et d'export
  const handleImprimerFiche = (fiche: any) => {
    setImprimerModeRegistre(false);
    setFicheConsultation(fiche);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handleImprimerRegistre = () => {
    setFicheConsultation(null);
    setImprimerModeRegistre(true);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-24">
      {/* Navigation normale - masquée à l'impression */}
      <div className="print:hidden">
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
      </div>

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-4 print:hidden">
        
        {/* En-tête de section officiel */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-emerald-100 text-[#005c30]">
                  Surveillance Officielle
                </span>
                <span className="text-xs text-slate-400 font-bold">Phase 7 SIMR Active</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-1">
                Fiches de Surveillance Communautaire
              </h2>
              <p className="text-xs text-slate-500">
                Alertes, Registre, Décès, Investigations et Rapports hebdomadaires.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/briefing"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-bold text-xs border border-emerald-200 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Guide SIMR</span>
              </Link>
              <Link
                href="/fiches/nouvelle"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Nouvelle fiche</span>
              </Link>
            </div>
          </div>

          {/* BARRE D'ACTION GLOBALE : EXPORT & IMPRESSION DU REGISTRE DE SURVEILLANCE */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/70 p-3 rounded-2xl">
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-[#005c30]" />
              <span>Registre filtré : <strong>{fichesFiltrees.length}</strong> fiche(s)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleImprimerRegistre}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 shadow-sm transition-all"
                title="Imprimer la liste officielle complète au format A4"
              >
                <Printer className="w-3.5 h-3.5 text-[#005c30]" />
                <span>Imprimer Registre</span>
              </button>

              <button
                type="button"
                onClick={() => exporterRegistreSurveillanceExcel(fichesFiltrees, filtreType)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
                title="Télécharger le registre de surveillance au format Excel officiel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter Registre (Excel)</span>
              </button>
            </div>
          </div>
        </div>

        {/* NOUVEAU MODULE OFFICIEL : PRISE EN CHARGE DES CAS EN COMMUNAUTÉ (iCCM) */}
        <div className="bg-gradient-to-r from-emerald-950 to-[#005c30] text-white rounded-3xl p-5 border-2 border-emerald-400 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0 backdrop-blur-sm shadow-inner">
                <Stethoscope className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                  Soins Cliniques & PCIME-C
                </span>
                <h3 className="text-base font-black text-white">
                  Prise en charge des cas en communauté
                </h3>
                <p className="text-xs text-emerald-100/90 mt-0.5">
                  Diagnostic des cas, TDR Paludisme, décision de prise en charge sur place (CTA, SRO/Zinc, Amoxi, etc.) ou référence au CS avec fiche officielle imprimable.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/espace-ascq/consultations/nouvelle"
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xs transition-colors shadow-sm"
              >
                + Nouvelle prise en charge
              </Link>
              <Link
                href="/espace-ascq/consultations"
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all"
              >
                Registre iCCM
              </Link>
            </div>
          </div>
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
            onClick={() => { setFiltreType("TOUT"); setPage(1); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filtreType === "TOUT" ? "bg-[#005c30] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Toutes ({fichesUnifiees.length})
          </button>

          <button
            onClick={() => { setFiltreType("ALR"); setPage(1); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filtreType === "ALR" ? "bg-[#005c30] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alertes ({alertes.length})</span>
          </button>

          <button
            onClick={() => { setFiltreType("REG"); setPage(1); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filtreType === "REG" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Registre ({registres.length})</span>
          </button>

          <button
            onClick={() => { setFiltreType("DEC"); setPage(1); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filtreType === "DEC" ? "bg-purple-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Skull className="w-3.5 h-3.5" />
            <span>Décès ({deces.length})</span>
          </button>

          <button
            onClick={() => { setFiltreType("INV"); setPage(1); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filtreType === "INV" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Investigations ({investigations.length})</span>
          </button>

          <button
            onClick={() => { setFiltreType("RAP"); setPage(1); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filtreType === "RAP" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Rapports ({rapports.length})</span>
          </button>
        </div>

        {/* Barre de recherche et filtre priorité */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro, titre, village..."
              value={recherche}
              onChange={(e) => { setRecherche(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-[#005c30]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setFiltreStatut(filtreStatut === "PRIORITAIRE" ? "TOUT" : "PRIORITAIRE"); setPage(1); }}
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
            <p className="text-xs text-slate-500 font-semibold">Chargement des fiches de surveillance...</p>
          </div>
        ) : fichesFiltrees.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center space-y-4 border border-slate-200/80 shadow-sm">
            <FileText className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-extrabold text-slate-900">Aucune fiche trouvée</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Aucune donnée ne correspond aux critères sélectionnés.
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
            {paginatedFiches.map((f) => {
              const badgeBg = f.type === "ALR" ? "bg-emerald-50 text-[#005c30] border-emerald-100" :
                              f.type === "REG" ? "bg-blue-50 text-blue-700 border-blue-100" :
                              f.type === "DEC" ? "bg-purple-50 text-purple-700 border-purple-100" :
                              f.type === "INV" ? "bg-amber-50 text-amber-800 border-amber-100" :
                              "bg-indigo-50 text-indigo-700 border-indigo-100";

              return (
                <div
                  key={`${f.type}_${f.id}`}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all hover:shadow-md ${
                    f.estPrioritaire ? "border-red-300 bg-red-50/20" : "border-slate-200/80 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg border ${badgeBg}`}>
                          {f.numero}
                        </span>

                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {f.typeLibelle}
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

                        {f.resultat === "AVEREE" && (
                          <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                            ✓ Avérée
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                        {f.titre}
                      </h3>

                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Village : <strong className="text-slate-700">{f.village}</strong> • Commune : <strong className="text-slate-700">{f.commune}</strong></span>
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
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                        {f.impact}
                      </span>
                    </div>
                  </div>

                  {/* BARRE D'ACTIONS INDIVIDUELLE : CONSULTER, IMPRIMER, TÉLÉCHARGER */}
                  <div className="pt-3.5 mt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-400 font-mono">
                      Ref: {f.numero}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setFicheConsultation(f)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                        title="Consulter tous les détails officiels de la fiche"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>Consulter</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleImprimerFiche(f)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-bold text-xs border border-emerald-200 transition-colors"
                        title="Imprimer directement cette fiche au format A4"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => exporterFicheSurveillanceIndividuelleExcel(f)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
                        title="Télécharger cette fiche en format Excel officiel"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Télécharger (Excel)</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* BARRE DE PAGINATION DES FICHES */}
            {totalPages > 1 && (
              <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex items-center justify-between text-xs mt-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  &larr; Précédent
                </button>
                <span className="text-slate-500 font-semibold">
                  Page <strong>{page}</strong> sur <strong>{totalPages}</strong> ({fichesFiltrees.length} fiches)
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  Suivant &rarr;
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODALE OFFICIELLE DE CONSULTATION ET D'IMPRESSION A4 D'UNE FICHE INDIVIDUELLE */}
      {/* ========================================================================= */}
      {ficheConsultation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto print:border-none print:shadow-none print:rounded-none">
            
            {/* Barre d'outils de la modale (masquée à l'impression) */}
            <div className="bg-[#005c30] text-white p-4 flex items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span className="text-xs font-mono font-bold">{ficheConsultation.numero}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#005c30] font-bold text-xs shadow hover:bg-emerald-50 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer la Fiche (A4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => exporterFicheSurveillanceIndividuelleExcel(ficheConsultation)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FCD116] text-slate-900 font-black text-xs shadow hover:bg-yellow-400 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFicheConsultation(null)}
                  className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenu officiel de la fiche (affiché et imprimé) */}
            <div className="p-6 sm:p-8 space-y-6 print:p-0 text-slate-800">
              
              {/* En-tête officiel République du Bénin */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-8 h-1 bg-[#008751]"></span>
                  <span className="w-8 h-1 bg-[#FCD116]"></span>
                  <span className="w-8 h-1 bg-[#E8112D]"></span>
                </div>
                <h1 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  RÉPUBLIQUE DU BÉNIN
                </h1>
                <h2 className="text-xs font-bold uppercase text-slate-700">
                  Ministère de la Santé — Direction Nationale de la Santé Publique
                </h2>
                <h3 className="text-xs font-bold text-[#005c30]">
                  Surveillance Intégrée des Maladies et de la Riposte (SIMR Bénin)
                </h3>
                <div className="inline-block mt-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-300">
                  <span className="text-xs font-extrabold uppercase text-slate-900">
                    FICHE OFFICIELLE : {ficheConsultation.typeLibelle || "SURVEILLANCE"} — N° {ficheConsultation.numero}
                  </span>
                </div>
              </div>

              {/* 1. Identification & Période SIMR */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-2 bg-slate-50/50 print:bg-transparent">
                <h4 className="text-xs font-black uppercase text-[#005c30] border-b pb-1 border-slate-200">
                  1. Identification de l'événement & Période SIMR
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Type d'événement :</span>
                    <strong className="text-slate-900">{ficheConsultation.titre}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Semaine & Année :</span>
                    <strong className="text-slate-900">Semaine {ficheConsultation.semaine || "N/A"} ({ficheConsultation.annee})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Date d'enregistrement :</span>
                    <strong className="text-slate-900">{ficheConsultation.date}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Niveau de Priorité :</span>
                    <strong className={ficheConsultation.estPrioritaire ? "text-red-700" : "text-emerald-700"}>
                      {ficheConsultation.estPrioritaire ? "⚠️ Haute Priorité (Alerte Riposte)" : "Normale (Routine)"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Statut / Résultat :</span>
                    <strong className="text-slate-900">{ficheConsultation.resultat || ficheConsultation.statut || "ENREGISTRÉE"}</strong>
                  </div>
                </div>
              </div>

              {/* 2. Localisation Administrative */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-2 bg-slate-50/50 print:bg-transparent">
                <h4 className="text-xs font-black uppercase text-[#005c30] border-b pb-1 border-slate-200">
                  2. Localisation Administrative
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Département :</span>
                    <strong className="text-slate-900">{(!ficheConsultation.departement || ficheConsultation.departement === "Département" || ficheConsultation.departement === "Zone Sanitaire") ? "Zou" : ficheConsultation.departement}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Commune :</span>
                    <strong className="text-slate-900">{(!ficheConsultation.commune || ficheConsultation.commune === "Zone sanitaire" || ficheConsultation.commune === "Communauté") ? "Ouinhi" : ficheConsultation.commune}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Arrondissement :</span>
                    <strong className="text-slate-900">{(!ficheConsultation.arrondissement || ficheConsultation.arrondissement === "Local" || ficheConsultation.arrondissement === "Arrondissement") ? "Tohoues" : ficheConsultation.arrondissement}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Village / Quartier :</span>
                    <strong className="text-[#005c30]">{ficheConsultation.village || "Akassa"}</strong>
                  </div>
                </div>
              </div>

              {/* 3. Données Sanitaires & Impact Communautaire */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-2 bg-slate-50/50 print:bg-transparent">
                <h4 className="text-xs font-black uppercase text-[#005c30] border-b pb-1 border-slate-200">
                  3. Données Sanitaires & Impact Communautaire
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Impact sanitaire constaté :</span>
                    <strong className="text-slate-900 text-sm">{ficheConsultation.impact}</strong>
                  </div>
                  
                  {/* Détails du cas ou du défunt (Identité complète sans masquage) */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs sm:col-span-2 space-y-1">
                    <span className="text-slate-500 font-bold block text-[11px] mb-1">
                      {ficheConsultation.type === "DEC" ? "Identité Officielle du Défunt & Proches :" : "Identité Officielle du Patient / Cas Index :"}
                    </span>
                    <p className="text-slate-900 font-bold text-sm">
                      {ficheConsultation.type === "DEC"
                        ? (ficheConsultation.rawData?.defunt_nom_prenom || `${ficheConsultation.rawData?.nom_defunt || ''} ${ficheConsultation.rawData?.prenoms_defunt || ''}`.trim() || "Défunt notifié")
                        : (ficheConsultation.rawData?.cas_nom_prenom || `${ficheConsultation.rawData?.nom_cas || ficheConsultation.rawData?.cas_nom || ''} ${ficheConsultation.rawData?.prenoms_cas || ficheConsultation.rawData?.cas_prenoms || ''}`.trim() || "Patient / Cas index")
                      } 
                      {ficheConsultation.rawData?.sexe && ` • Sexe : ${ficheConsultation.rawData.sexe === "M" ? "Masculin" : "Féminin"}`}
                      {ficheConsultation.rawData?.age_valeur && ` • Âge : ${ficheConsultation.rawData.age_valeur} ${ficheConsultation.rawData.age_unite || "ans"}`}
                    </p>
                    {(ficheConsultation.rawData?.nom_parent || ficheConsultation.rawData?.telephone_parent) && (
                      <p className="text-[11px] text-slate-700">
                        Parent / Proche : <strong className="text-slate-900">{ficheConsultation.rawData.nom_parent || "-"}</strong>
                        {ficheConsultation.rawData.telephone_parent && ` (${ficheConsultation.rawData.telephone_parent})`}
                      </p>
                    )}
                    {(ficheConsultation.rawData?.telephone || ficheConsultation.rawData?.telephone_contact) && (
                      <p className="text-[11px] text-slate-700">
                        Téléphone contact : <strong className="text-slate-900">{ficheConsultation.rawData.telephone || ficheConsultation.rawData.telephone_contact}</strong>
                      </p>
                    )}
                    {(ficheConsultation.rawData?.adresse || ficheConsultation.rawData?.adresse_domicile) && (
                      <p className="text-[11px] text-slate-700">
                        Adresse / Hameau : <strong className="text-slate-900">{ficheConsultation.rawData.adresse || ficheConsultation.rawData.adresse_domicile}</strong>
                      </p>
                    )}
                  </div>

                  {/* Symptômes ou manifestations cliniques */}
                  {ficheConsultation.rawData?.symptomes_noms && ficheConsultation.rawData.symptomes_noms.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[10px]">Signes et symptômes constatés :</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ficheConsultation.rawData.symptomes_noms.map((s: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#005c30] font-bold text-[10px] border border-emerald-200">
                            ✓ {corrigerAccents(s)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {ficheConsultation.rawData?.mesures_prises && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">Mesures immédiates prises :</span>
                      <p className="text-slate-800 italic mt-0.5">{ficheConsultation.rawData.mesures_prises}</p>
                    </div>
                  )}

                  {ficheConsultation.rawData?.commentaire_verification && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[10px]">Commentaire de vérification superviseur :</span>
                      <p className="text-slate-800 italic mt-0.5">« {ficheConsultation.rawData.commentaire_verification} »</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Notificateur & Traçabilité */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-2 bg-slate-50/50 print:bg-transparent">
                <h4 className="text-xs font-black uppercase text-[#005c30] border-b pb-1 border-slate-200">
                  4. Déclarant & Traçabilité Officielle
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Agent Déclarant / Enquêteur :</span>
                    <strong className="text-slate-900">{ficheConsultation.notificateur}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Téléphone officiel :</span>
                    <strong className="text-slate-900">{ficheConsultation.notificateurTel || "-"}</strong>
                  </div>
                </div>
              </div>

              {/* 5. Cadre Officiel de Validation & Signature (Une seule personne signe selon le rôle du notificateur) */}
              {(() => {
                const notifTitre = (ficheConsultation.rawData?.notificateur_titre || ficheConsultation.notificateurTitre || "").toUpperCase();
                const notifNom = (ficheConsultation.notificateur || "").toUpperCase();
                const estNotifieParAscq = notifTitre === "ASCQ" || notifNom.startsWith("ASCQ") || notifNom.includes("ASCQ");

                return (
                  <div className="pt-4 text-xs border-t border-slate-300">
                    <div className="max-w-md mx-auto p-4 bg-slate-50/80 rounded-2xl border border-slate-300 text-center space-y-2">
                      <p className="font-black text-slate-900 uppercase text-xs tracking-wide">
                        {estNotifieParAscq
                          ? "SIGNATURE DU NOTIFICATEUR (ASCQ D'ARRONDISSEMENT)"
                          : "SIGNATURE DU NOTIFICATEUR (RELAIS COMMUNAUTAIRE)"
                        }
                      </p>
                      <p className="text-xs font-bold text-slate-800">
                        {ficheConsultation.notificateur}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {estNotifieParAscq ? (
                          <>Arrondissement : <strong>{ficheConsultation.arrondissement || "Arrondissement sanitaire"}</strong> • Commune : <strong>{ficheConsultation.commune || "Commune"}</strong></>
                        ) : (
                          <>Village / Quartier : <strong>{ficheConsultation.village || "Village"}</strong> • Arrondissement : <strong>{ficheConsultation.arrondissement || "Arrondissement"}</strong></>
                        )}
                      </p>
                      
                      {ficheConsultation.rawData?.signature_tactile ? (
                        <div className="my-2 p-2 bg-white border border-slate-300 rounded-xl inline-block shadow-sm">
                          <img
                            src={ficheConsultation.rawData.signature_tactile}
                            alt={estNotifieParAscq ? "Signature ASCQ" : "Signature RC"}
                            className="max-h-20 w-auto object-contain mx-auto"
                          />
                        </div>
                      ) : (
                        <div className="my-6 border-b border-black w-48 mx-auto"></div>
                      )}
                      
                      <p className="text-[10px] text-slate-500 font-medium">
                        Signature tactile officielle enregistrée le {ficheConsultation.date}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Lien optionnel vers la page complète alerte si ALR */}
              {ficheConsultation.type === "ALR" && (
                <div className="pt-3 print:hidden text-center">
                  <Link
                    href={`/fiches/alerte/${ficheConsultation.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#005c30] hover:underline"
                  >
                    <span>Ouvrir la page de vérification approfondie de cette alerte</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE D'IMPRESSION DU REGISTRE OFFICIEL DE SURVEILLANCE ÉPIDÉMIOLOGIQUE SIMR */}
      {/* (Visible uniquement lors de l'impression du registre complet) */}
      {/* ========================================================================= */}
      {imprimerModeRegistre && (
        <div className="hidden print:block p-4 text-black bg-white">
          <div className="text-center border-b-2 border-black pb-3 mb-4 space-y-1">
            <h1 className="text-base font-black uppercase">RÉPUBLIQUE DU BÉNIN — MINISTÈRE DE LA SANTÉ</h1>
            <h2 className="text-xs font-bold uppercase text-slate-800">Direction Nationale de la Santé Publique — SIMR Bénin</h2>
            <h3 className="text-xs font-extrabold text-[#005c30]">REGISTRE OFFICIEL DE SURVEILLANCE ÉPIDÉMIOLOGIQUE COMMUNAUTAIRE</h3>
            <p className="text-[10px] text-slate-600">
              Filtre actif : {filtreType === "TOUT" ? "Toutes les catégories" : filtreType} • {fichesFiltrees.length} fiche(s) enregistrée(s)
            </p>
          </div>

          <table className="w-full border-collapse border border-black text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black p-1 text-left">N° Fiche</th>
                <th className="border border-black p-1 text-left">Type</th>
                <th className="border border-black p-1 text-left">Événement / Pathologie</th>
                <th className="border border-black p-1 text-center">Semaine</th>
                <th className="border border-black p-1 text-center">Date</th>
                <th className="border border-black p-1 text-left">Village / Commune</th>
                <th className="border border-black p-1 text-left">Impact</th>
                <th className="border border-black p-1 text-left">Déclarant</th>
                <th className="border border-black p-1 text-center">Statut</th>
              </tr>
            </thead>
            <tbody>
              {fichesFiltrees.map((f, idx) => (
                <tr key={idx} className="border-b border-black">
                  <td className="border border-black p-1 font-mono font-bold">{f.numero}</td>
                  <td className="border border-black p-1">{f.typeLibelle}</td>
                  <td className="border border-black p-1 font-bold">{f.titre}</td>
                  <td className="border border-black p-1 text-center">{f.semaine ? `Semaine ${f.semaine}` : "-"}</td>
                  <td className="border border-black p-1 text-center">{f.date}</td>
                  <td className="border border-black p-1">{f.village} ({f.commune})</td>
                  <td className="border border-black p-1">{f.impact}</td>
                  <td className="border border-black p-1">{f.notificateur}</td>
                  <td className="border border-black p-1 text-center font-bold">{f.resultat || f.statut || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 pt-4 border-t border-black grid grid-cols-2 text-xs">
            <div>
              <p className="font-bold">1. Relais Communautaires Notificateurs :</p>
              <div className="mt-8 border-b border-black w-48"></div>
              <p className="text-[9px] text-slate-500 mt-1">Signatures de terrain et dates</p>
            </div>
            <div className="text-right">
              <p className="font-bold">2. Visa & Signature de l'ASCQ Superviseur :</p>
              <div className="mt-8 border-b border-black w-48 ml-auto"></div>
              <p className="text-[9px] text-slate-500 mt-1">Validation d'arrondissement</p>
            </div>
          </div>

          <p className="text-[9px] text-center text-slate-500 italic pt-2 mt-3 border-t border-slate-300">
            Conforme aux directives SIMR / PNSC de la République du Bénin : La validation des fiches de notification terrain s'effectue exclusivement entre le RC et l'ASCQ Superviseur. Aucun visa du médecin coordonnateur n'est requis.
          </p>
        </div>
      )}

    </div>
  );
}