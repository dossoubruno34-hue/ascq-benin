"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AscqNav from "@/components/AscqNav";
import SignatureCanvas from "@/components/SignatureCanvas";
import { 
  exporterRapportHebdoIndividuel, 
  exporterCompilationCommunaleExcel, 
  RapportHebdoData 
} from "@/lib/excelExport";
import { 
  FileText, 
  BarChart3, 
  Save, 
  CheckCircle2, 
  Download, 
  Calendar, 
  MapPin, 
  Users, 
  Bike, 
  Laptop, 
  Coins, 
  AlertTriangle, 
  FileSpreadsheet, 
  Building2, 
  Clock, 
  RefreshCw,
  PlusCircle,
  HelpCircle,
  Sparkles,
  HeartPulse,
  Activity
} from "lucide-react";

// Calcul de la semaine ISO actuelle (1-52)
function getSemaineActuelle(): number {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Calcul des dates début (lundi) et fin (dimanche) d'une semaine
function getDatesSemaine(annee: number, semaine: number) {
  const simple = new Date(annee, 0, 1 + (semaine - 1) * 7);
  const dayOfWeek = simple.getDay();
  const ISOweekStart = simple;
  if (dayOfWeek <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  
  const ISOweekEnd = new Date(ISOweekStart);
  ISOweekEnd.setDate(ISOweekStart.getDate() + 6);
  
  return {
    debut: ISOweekStart.toISOString().slice(0, 10),
    fin: ISOweekEnd.toISOString().slice(0, 10),
    label: `Du lundi ${ISOweekStart.toLocaleDateString("fr-FR")} au dimanche ${ISOweekEnd.toLocaleDateString("fr-FR")}`
  };
}

export default function RapportHebdoPnscPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Semaine & Année
  const anneeActuelle = new Date().getFullYear();
  const [annee, setAnnee] = useState<number>(anneeActuelle);
  const [semaine, setSemaine] = useState<number>(getSemaineActuelle());

  // 1. Ressources Humaines
  const [rhBesoins, setRhBesoins] = useState<number>(10);
  const [rhFonct, setRhFonct] = useState<number>(10);
  const rhGap = useMemo(() => Math.max(0, Number(rhBesoins || 0) - Number(rhFonct || 0)), [rhBesoins, rhFonct]);

  // 2. Moyens de déplacement (Motos)
  const [motosMise, setMotosMise] = useState<number>(1);
  const [motosFonct, setMotosFonct] = useState<number>(1);
  const motosGap = useMemo(() => Math.max(0, Number(motosMise || 0) - Number(motosFonct || 0)), [motosMise, motosFonct]);

  // 3. Outils informatiques (Ordinateurs / Tablettes)
  const [ordisMise, setOrdisMise] = useState<number>(1);
  const [ordisFonct, setOrdisFonct] = useState<number>(1);
  const ordisGap = useMemo(() => Math.max(0, Number(ordisMise || 0) - Number(ordisFonct || 0)), [ordisMise, ordisFonct]);

  // 4. Rémunération due (Mois d'arriérés)
  const [remunLlf, setRemunLlf] = useState<number>(0);
  const [remunFadec, setRemunFadec] = useState<number>(0);
  const [remunSrhr, setRemunSrhr] = useState<number>(0);
  const remunTotalMois = useMemo(
    () => Number(remunLlf || 0) + Number(remunFadec || 0) + Number(remunSrhr || 0),
    [remunLlf, remunFadec, remunSrhr]
  );

  // 5. Activités, Difficultés, Suggestions
  const [activites, setActivites] = useState<string>("");
  const [difficultes, setDifficultes] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string>("");

  // 6. Dotations reçues
  const [internetRecu, setInternetRecu] = useState<boolean>(false);
  const [internetDetails, setInternetDetails] = useState<string>("");
  const [carburantRecu, setCarburantRecu] = useState<boolean>(false);
  const [carburantDetails, setCarburantDetails] = useState<string>("");
  const [autresRecus, setAutresRecus] = useState<string>("");
  const [observations, setObservations] = useState<string>("");

  // Signature tactile
  const [signatureTactile, setSignatureTactile] = useState<string | null>(null);
  const [statutRapport, setStatutRapport] = useState<"BROUILLON" | "VALIDE">("BROUILLON");

  // Compilation communale (pour Représentant Communal / PF CCLS-TP / Admins)
  const [compilationRapports, setCompilationRapports] = useState<any[]>([]);
  const [loadingCompilation, setLoadingCompilation] = useState(false);

  // Données consolidées en temps réel (alertes, décès, registre, références)
  const [statsTempsReel, setStatsTempsReel] = useState<any | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Charger profil et données du rapport sélectionné
  const dates = useMemo(() => getDatesSemaine(annee, semaine), [annee, semaine]);

  const chargerStatsTempsReel = async (debut: string, fin: string, forcerEcriture: boolean = false) => {
    setLoadingStats(true);
    try {
      const { data, error } = await supabase.rpc("obtenir_statistiques_temps_reel_rapport", {
        p_date_debut: debut,
        p_date_fin: fin,
      });

      if (!error && data) {
        setStatsTempsReel(data);
        if (forcerEcriture || activites.trim() === "") {
          const texteAuto = [
            `Surveillance communautaire & Activités Semaine ${semaine} :`,
            `- Alertes notifiées : ${data.total_alertes || 0} (${data.personnes_touchees || 0} personnes touchées, ${data.personnes_mortes_alertes || 0} décès)`,
            `- Références transmises : ${data.references_sante || 0} vers Centre de Santé, ${data.references_gups || 0} vers le GUPS (Protection Sociale)`,
            `- Décès communautaires : ${data.total_deces_communautaires || 0} (Maternels : ${data.deces_maternels || 0}, Néonatals : ${data.deces_neonatals || 0})`,
            `- Événements au registre : ${data.total_registre || 0}`,
            `- Relais Communautaires actifs suivis : ${data.rc_actifs || 0}`
          ].join("\n");
          setActivites(texteAuto);
        }
      }
    } catch (e) {
      console.warn("Erreur chargement stats temps réel:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data: profil } = await supabase
        .from("utilisateurs")
        .select("*")
        .eq("id", user.id)
        .single();

      setCurrentUser(profil);

      // Charger le rapport existant pour cette semaine et cette année
      try {
        const { data: rpt } = await supabase
          .from("rapports_hebdo_pnsc")
          .select("*")
          .eq("ascq_id", user.id)
          .eq("annee", annee)
          .eq("semaine", semaine)
          .maybeSingle();

        if (rpt) {
          setRhBesoins(rpt.rh_besoins_normes || 0);
          setRhFonct(rpt.rh_fonctionnel || 0);
          setMotosMise(rpt.motos_mise_a_dispo || 0);
          setMotosFonct(rpt.motos_fonctionnel || 0);
          setOrdisMise(rpt.ordinateurs_mise_a_dispo || 0);
          setOrdisFonct(rpt.ordinateurs_fonctionnel || 0);
          setRemunLlf(Number(rpt.remuneration_due_llf || 0));
          setRemunFadec(Number(rpt.remuneration_due_fadec || 0));
          setRemunSrhr(Number(rpt.remuneration_due_srhr || 0));
          setActivites(rpt.activites_realisees || "");
          setDifficultes(rpt.difficultes || "");
          setSuggestions(rpt.suggestions || "");
          setInternetRecu(Boolean(rpt.forfait_internet_recu));
          setInternetDetails(rpt.forfait_internet_details || "");
          setCarburantRecu(Boolean(rpt.carburant_recu));
          setCarburantDetails(rpt.carburant_details || "");
          setAutresRecus(rpt.autres_recus || "");
          setObservations(rpt.observations || "");
          setSignatureTactile(rpt.signature_tactile || null);
          setStatutRapport(rpt.statut || "BROUILLON");
        } else {
          // Réinitialiser pour une nouvelle semaine
          setActivites("");
          setDifficultes("");
          setSuggestions("");
          setObservations("");
          setSignatureTactile(null);
          setStatutRapport("BROUILLON");
        }
      } catch (errDb) {
        // Fallback local storage
        const localKey = `rapport_pnsc_${user.id}_${annee}_${semaine}`;
        const localData = localStorage.getItem(localKey);
        if (localData) {
          const parsed = JSON.parse(localData);
          setRhBesoins(parsed.rh_besoins_normes || 0);
          setRhFonct(parsed.rh_fonctionnel || 0);
          setMotosMise(parsed.motos_mise_a_dispo || 0);
          setMotosFonct(parsed.motos_fonctionnel || 0);
          setOrdisMise(parsed.ordinateurs_mise_a_dispo || 0);
          setOrdisFonct(parsed.ordinateurs_fonctionnel || 0);
          setRemunLlf(parsed.remuneration_due_llf || 0);
          setRemunFadec(parsed.remuneration_due_fadec || 0);
          setRemunSrhr(parsed.remuneration_due_srhr || 0);
          setActivites(parsed.activites_realisees || "");
          setDifficultes(parsed.difficultes || "");
          setSuggestions(parsed.suggestions || "");
          setInternetRecu(Boolean(parsed.forfait_internet_recu));
          setInternetDetails(parsed.forfait_internet_details || "");
          setCarburantRecu(Boolean(parsed.carburant_recu));
          setCarburantDetails(parsed.carburant_details || "");
          setAutresRecus(parsed.autres_recus || "");
          setObservations(parsed.observations || "");
          setSignatureTactile(parsed.signature_tactile || null);
          setStatutRapport(parsed.statut || "BROUILLON");
        }
      }

      // Charger la compilation communale si applicable
      if (profil?.commune_id) {
        chargerCompilation(profil.commune_id, annee, semaine);
      }

      // Synchroniser les statistiques réelles de terrain de la semaine
      await chargerStatsTempsReel(dates.debut, dates.fin, false);
    } catch (err) {
      console.error("Erreur chargement rapport hebdo:", err);
    } finally {
      setLoading(false);
    }
  };

  const chargerCompilation = async (communeId: string, a: number, s: number) => {
    setLoadingCompilation(true);
    try {
      const { data } = await supabase
        .from("rapports_hebdo_pnsc")
        .select("*, utilisateurs:ascq_id(nom, prenoms, telephone)")
        .eq("commune_id", communeId)
        .eq("annee", a)
        .eq("semaine", s);

      if (data && data.length > 0) {
        const formatted = data.map((item: any) => ({
          ...item,
          ascq_nom_complet: item.utilisateurs ? `${item.utilisateurs.prenoms} ${item.utilisateurs.nom}` : "ASCQ",
          ascq_telephone: item.utilisateurs?.telephone || "",
        }));
        setCompilationRapports(formatted);
      } else {
        setCompilationRapports([]);
      }
    } catch (e) {
      // Ignore
    } finally {
      setLoadingCompilation(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [annee, semaine]);

  // Sauvegarde (Brouillon ou Validation officielle)
  const handleEnregistrer = async (valider: boolean = false) => {
    if (valider && !signatureTactile) {
      alert("Veuillez apposer votre signature tactile au bas du formulaire avant de valider officiellement.");
      return;
    }

    setSaving(true);
    setSaveMsg(null);

    const payload = {
      ascq_id: currentUser.id,
      departement_id: currentUser.departement_id || null,
      departement_nom: currentUser.departement_nom || "",
      commune_id: currentUser.commune_id || null,
      commune_nom: currentUser.commune_nom || "",
      arrondissement_id: currentUser.arrondissement_id || null,
      arrondissement_nom: currentUser.arrondissement_nom || "",
      annee,
      semaine,
      date_debut: dates.debut,
      date_fin: dates.fin,
      statut: valider ? "VALIDE" : "BROUILLON",
      date_validation: valider ? new Date().toISOString() : null,
      signature_tactile: signatureTactile,

      rh_besoins_normes: Number(rhBesoins || 0),
      rh_fonctionnel: Number(rhFonct || 0),
      motos_mise_a_dispo: Number(motosMise || 0),
      motos_fonctionnel: Number(motosFonct || 0),
      ordinateurs_mise_a_dispo: Number(ordisMise || 0),
      ordinateurs_fonctionnel: Number(ordisFonct || 0),

      remuneration_due_llf: Number(remunLlf || 0),
      remuneration_due_fadec: Number(remunFadec || 0),
      remuneration_due_srhr: Number(remunSrhr || 0),

      activites_realisees: activites.trim(),
      difficultes: difficultes.trim(),
      suggestions: suggestions.trim(),

      forfait_internet_recu: internetRecu,
      forfait_internet_details: internetDetails.trim(),
      carburant_recu: carburantRecu,
      carburant_details: carburantDetails.trim(),
      autres_recus: autresRecus.trim(),
      observations: observations.trim(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from("rapports_hebdo_pnsc")
        .upsert(payload, { onConflict: "ascq_id,annee,semaine" });

      if (error) {
        // Sauvegarde de secours en localStorage
        const localKey = `rapport_pnsc_${currentUser.id}_${annee}_${semaine}`;
        localStorage.setItem(localKey, JSON.stringify(payload));
      }

      setStatutRapport(valider ? "VALIDE" : "BROUILLON");
      setSaveMsg({
        text: valider
          ? "Rapport hebdomadaire validé et signé avec succès !"
          : "Brouillon sauvegardé avec succès.",
        error: false,
      });

      if (currentUser?.commune_id) {
        chargerCompilation(currentUser.commune_id, annee, semaine);
      }
    } catch (err: any) {
      setSaveMsg({ text: "Erreur sauvegarde : " + (err.message || "Veuillez réessayer."), error: true });
    } finally {
      setSaving(false);
    }
  };

  // Exporter la fiche individuelle de l'ASCQ en Excel
  const handleExportIndividuel = () => {
    const data: RapportHebdoData = {
      departement_nom: currentUser?.departement_nom || "Département",
      commune_nom: currentUser?.commune_nom || "Commune",
      arrondissement_nom: currentUser?.arrondissement_nom || "Arrondissement",
      ascq_nom_complet: `${currentUser?.prenoms || ""} ${currentUser?.nom || ""}`,
      ascq_telephone: currentUser?.telephone || "",
      annee,
      semaine,
      date_debut: dates.debut,
      date_fin: dates.fin,
      rh_besoins_normes: rhBesoins,
      rh_fonctionnel: rhFonct,
      rh_gap: rhGap,
      motos_mise_a_dispo: motosMise,
      motos_fonctionnel: motosFonct,
      motos_gap: motosGap,
      ordinateurs_mise_a_dispo: ordisMise,
      ordinateurs_fonctionnel: ordisFonct,
      ordinateurs_gap: ordisGap,
      remuneration_due_llf: remunLlf,
      remuneration_due_fadec: remunFadec,
      remuneration_due_srhr: remunSrhr,
      activites_realisees: activites,
      difficultes,
      suggestions,
      forfait_internet_recu: internetRecu,
      forfait_internet_details: internetDetails,
      carburant_recu: carburantRecu,
      carburant_details: carburantDetails,
      autres_recus: autresRecus,
      observations,
    };

    exporterRapportHebdoIndividuel(data);
  };

  // Exporter la compilation communale
  const handleExportCompilation = () => {
    // Si la compilation distante n'a qu'un rapport ou si vide, on y inclut au moins le rapport en cours de l'ASCQ
    let liste = [...compilationRapports];
    if (liste.length === 0) {
      liste = [
        {
          arrondissement_nom: currentUser?.arrondissement_nom || "Arrondissement",
          ascq_nom_complet: `${currentUser?.prenoms || ""} ${currentUser?.nom || ""}`,
          rh_besoins_normes: rhBesoins,
          rh_fonctionnel: rhFonct,
          rh_gap: rhGap,
          motos_mise_a_dispo: motosMise,
          motos_fonctionnel: motosFonct,
          motos_gap: motosGap,
          ordinateurs_mise_a_dispo: ordisMise,
          ordinateurs_fonctionnel: ordisFonct,
          ordinateurs_gap: ordisGap,
          remuneration_due_llf: remunLlf,
          remuneration_due_fadec: remunFadec,
          remuneration_due_srhr: remunSrhr,
          forfait_internet_recu: internetRecu,
          carburant_recu: carburantRecu,
          activites_realisees: activites,
        },
      ];
    }

    exporterCompilationCommunaleExcel(
      currentUser?.commune_nom || "Commune",
      currentUser?.departement_nom || "Département",
      semaine,
      annee,
      liste
    );
  };

  const isRepresentantOuAdmin = [
    "SUPER_ADMIN",
    "ADMINISTRATEUR",
    "ADMIN_COMMUNAL",
    "ADMIN_DEPARTEMENTAL",
    "PF_CCLS_TP",
    "REPRESENTANT_COMMUNAL"
  ].includes(currentUser?.role_technique || "") || currentUser?.poste === "PF_CCLS_TP";

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-24">
      <AscqNav userProfile={currentUser} />

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-5">
        
        {/* 1. Onglets de basculement entre Suivi Hebdo PNSC et Rapport Mensuel RMA */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200/80 shadow-sm flex items-center gap-1">
          <Link
            href="/espace-ascq/rapport-hebdo-pnsc"
            className="flex-1 py-2 px-3 text-center rounded-xl bg-[#005c30] text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Suivi Hebdo PNSC</span>
          </Link>
          <Link
            href="/espace-ascq/rapport-mensuel"
            className="flex-1 py-2 px-3 text-center rounded-xl hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>2. Rapport Mensuel d'Activité (RMA)</span>
          </Link>
        </div>

        {/* 2. En-tête et Titre du Rapport Hebdo */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  PNSC • Suivi Hebdomadaire
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  statutRapport === "VALIDE" ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-800"
                }`}>
                  {statutRapport === "VALIDE" ? "Rapport Validé" : "Brouillon en cours"}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                Rapport de Suivi Hebdomadaire PNSC
              </h1>
              <p className="text-xs text-slate-500">
                Ressources humaines, logistique, dotations, arriérés de rémunération et activités de terrain.
              </p>
            </div>

            {/* Boutons d'export Excel direct */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportIndividuel}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
                title="Télécharger la fiche de mon arrondissement au format Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter ma fiche (Excel)</span>
              </button>

              <button
                onClick={handleExportCompilation}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#005c30] hover:bg-[#004724] text-amber-300 font-extrabold text-xs shadow-sm border border-amber-400/40 active:scale-95 transition-all"
                title="Exporter la compilation de tous les arrondissements de la commune"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Compilation Communale (Excel)</span>
              </button>
            </div>
          </div>

          {/* Sélecteur de Semaine & Année */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Année</label>
              <select
                value={annee}
                onChange={(e) => setAnnee(Number(e.target.value))}
                className="w-full font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
                <option value={2025}>2025</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Semaine Épidémiologique</label>
              <select
                value={semaine}
                onChange={(e) => setSemaine(Number(e.target.value))}
                className="w-full font-bold text-emerald-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s}>
                    Semaine {s} {s === getSemaineActuelle() ? "(Actuelle)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Période couverte</label>
              <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-600 truncate">
                {dates.label}
              </div>
            </div>
          </div>

          {/* Localisation administrative de l'ASCQ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block">Département</span>
              <strong className="text-emerald-950 text-xs">{currentUser?.departement_nom || "Non renseigné"}</strong>
            </div>
            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block">Commune</span>
              <strong className="text-emerald-950 text-xs">{currentUser?.commune_nom || "Non renseignée"}</strong>
            </div>
            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block">Arrondissement</span>
              <strong className="text-emerald-950 text-xs">{currentUser?.arrondissement_nom || "Non renseigné"}</strong>
            </div>
            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block">Agent ASCQ</span>
              <strong className="text-emerald-950 text-xs truncate block">{currentUser ? `${currentUser.prenoms} ${currentUser.nom}` : "Moi"}</strong>
            </div>
          </div>
        </div>

        {/* 3. Formulaire avec calculs automatiques intelligents des GAPS */}
        <form onSubmit={(e) => { e.preventDefault(); handleEnregistrer(false); }} className="space-y-4">
          
          {/* SECTION 1 : RESSOURCES HUMAINES & CALCUL DU GAP */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  1. Ressources Humaines (ASCQ & Relais)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Le GAP est calculé automatiquement (Besoins selon normes - Effectif fonctionnel).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Besoins selon les normes *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={rhBesoins}
                  onChange={(e) => setRhBesoins(Number(e.target.value))}
                  className="w-full text-sm font-bold text-center rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Effectif fonctionnel sur le terrain *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={rhFonct}
                  onChange={(e) => setRhFonct(Number(e.target.value))}
                  className="w-full text-sm font-bold text-center rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200 flex flex-col justify-center text-center">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  GAP Calculé (Déficit)
                </span>
                <span className={`text-xl font-black ${rhGap > 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {rhGap}
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  {rhGap === 0 ? "Conforme aux normes" : `${rhGap} agent(s) manquant(s)`}
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 2 : LOGISTIQUE ET MOYENS DE DÉPLACEMENT (MOTOS) */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Bike className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  2. Moyens de Déplacement : Motos
                </h3>
                <p className="text-[11px] text-slate-500">
                  Calcul automatique des motos en panne ou du déficit d'équipement.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motos mises à disposition *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={motosMise}
                  onChange={(e) => setMotosMise(Number(e.target.value))}
                  className="w-full text-sm font-bold text-center rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motos fonctionnelles (en état) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={motosFonct}
                  onChange={(e) => setMotosFonct(Number(e.target.value))}
                  className="w-full text-sm font-bold text-center rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200 flex flex-col justify-center text-center">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  GAP Motos (Pannes / Manquantes)
                </span>
                <span className={`text-xl font-black ${motosGap > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                  {motosGap}
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  {motosGap === 0 ? "Toutes fonctionnelles" : `${motosGap} moto(s) indisponible(s)`}
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 3 : OUTILS NUMÉRIQUES (ORDINATEURS / TABLETTES) */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  3. Outils Numériques : Ordinateurs & Tablettes
                </h3>
                <p className="text-[11px] text-slate-500">
                  Calcul du GAP matériel informatique fonctionnel.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ordinateurs / Tablettes mis à disposition *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={ordisMise}
                  onChange={(e) => setOrdisMise(Number(e.target.value))}
                  className="w-full text-sm font-bold text-center rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Appareils fonctionnels *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={ordisFonct}
                  onChange={(e) => setOrdisFonct(Number(e.target.value))}
                  className="w-full text-sm font-bold text-center rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200 flex flex-col justify-center text-center">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  GAP Numérique
                </span>
                <span className={`text-xl font-black ${ordisGap > 0 ? "text-purple-700" : "text-emerald-700"}`}>
                  {ordisGap}
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  {ordisGap === 0 ? "Matériel complet" : `${ordisGap} appareil(s) en panne`}
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 4 : SITUATION DES RÉMUNÉRATIONS DUES (ARRIÉRÉS EN MOIS) */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  4. Rémunérations Dues (Nombre de mois d'arriérés)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Préciser le nombre de mois dus pour chaque source de financement.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mois dus LLF
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={remunLlf}
                  onChange={(e) => setRemunLlf(Number(e.target.value))}
                  placeholder="0"
                  className="w-full text-sm font-bold text-center rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mois dus FADEC
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={remunFadec}
                  onChange={(e) => setRemunFadec(Number(e.target.value))}
                  placeholder="0"
                  className="w-full text-sm font-bold text-center rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mois dus SRHR
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={remunSrhr}
                  onChange={(e) => setRemunSrhr(Number(e.target.value))}
                  placeholder="0"
                  className="w-full text-sm font-bold text-center rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className={`rounded-2xl p-2.5 border flex flex-col justify-center text-center ${
                remunTotalMois > 0 ? "bg-amber-50 border-amber-300" : "bg-emerald-50 border-emerald-200"
              }`}>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  Total Mois Arriérés
                </span>
                <span className={`text-xl font-black ${remunTotalMois > 0 ? "text-amber-800" : "text-emerald-700"}`}>
                  {remunTotalMois} mois
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {remunTotalMois === 0 ? "À jour de paiement" : "Arriérés en cours"}
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 5 : DOTATIONS REÇUES (INTERNET, CARBURANT, AUTRES) */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 border-b border-slate-100 pb-2">
              5. Dotations et Appuis Reçus durant la Semaine
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Forfait Internet */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Forfait Internet reçu cette semaine ?
                  </label>
                  <input
                    type="checkbox"
                    checked={internetRecu}
                    onChange={(e) => setInternetRecu(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                </div>
                {internetRecu && (
                  <input
                    type="text"
                    value={internetDetails}
                    onChange={(e) => setInternetDetails(e.target.value)}
                    placeholder="Préciser (ex: Forfait 10 Go reçu le mardi)"
                    className="w-full text-xs bg-white rounded-xl border border-slate-200 px-3 py-2"
                  />
                )}
              </div>

              {/* Carburant */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Carburant reçu cette semaine ?
                  </label>
                  <input
                    type="checkbox"
                    checked={carburantRecu}
                    onChange={(e) => setCarburantRecu(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                </div>
                {carburantRecu && (
                  <input
                    type="text"
                    value={carburantDetails}
                    onChange={(e) => setCarburantDetails(e.target.value)}
                    placeholder="Préciser (ex: 10 litres de carburant reçus)"
                    className="w-full text-xs bg-white rounded-xl border border-slate-200 px-3 py-2"
                  />
                )}
              </div>

              {/* Autres reçus */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Autres matériels, fournitures ou intrants reçus
                </label>
                <input
                  type="text"
                  value={autresRecus}
                  onChange={(e) => setAutresRecus(e.target.value)}
                  placeholder="Ex: 5 boîtes de TDR paludisme, 2 registres papier, gants..."
                  className="w-full text-xs bg-slate-50/50 rounded-xl border border-slate-200 px-3.5 py-2.5 focus:bg-white"
                />
              </div>
            </div>
          </section>

          {/* SECTION 6 : ACTIVITÉS, DIFFICULTÉS & SUGGESTIONS */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                6. Activités Réalisées, Difficultés & Suggestions
              </h3>

              <button
                type="button"
                onClick={() => chargerStatsTempsReel(dates.debut, dates.fin, true)}
                disabled={loadingStats}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-bold text-xs border border-emerald-200 shadow-xs transition-colors self-start sm:self-auto"
                title="Pré-remplir automatiquement les activités à partir de vos fiches et de celles de vos RC"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{loadingStats ? "Calcul..." : "⚡ Synchroniser fiches semaine"}</span>
              </button>
            </div>

            {/* BANDEAU DES CHIFFRES TEMPS RÉEL DE LA SEMAINE */}
            {statsTempsReel && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Alertes notifiées</span>
                  <strong className="text-sm font-black text-emerald-800">{statsTempsReel.total_alertes || 0}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Personnes touchées</span>
                  <strong className="text-sm font-black text-slate-900">{statsTempsReel.personnes_touchees || 0}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Référées vers CS</span>
                  <strong className="text-sm font-black text-blue-700">{statsTempsReel.references_sante || 0}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Référées vers GUPS</span>
                  <strong className="text-sm font-black text-purple-700">{statsTempsReel.references_gups || 0}</strong>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 font-bold block">Décès déclarés</span>
                  <strong className="text-sm font-black text-red-600">{statsTempsReel.total_deces_communautaires || 0}</strong>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Activités réalisées durant la semaine *
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Modifiable avant validation</span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={activites}
                  onChange={(e) => setActivites(e.target.value)}
                  placeholder="Décrire les activités majeures menées : visites à domicile, réunions de suivi des RC, séances de sensibilisation..."
                  className="w-full text-xs bg-slate-50/50 rounded-xl border border-slate-200 p-3 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Difficultés rencontrées
                </label>
                <textarea
                  rows={2}
                  value={difficultes}
                  onChange={(e) => setDifficultes(e.target.value)}
                  placeholder="Pannes de moto, routes impraticables, ruptures d'intrants, refus communautaires..."
                  className="w-full text-xs bg-slate-50/50 rounded-xl border border-slate-200 p-3 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Suggestions & Recommandations
                </label>
                <textarea
                  rows={2}
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  placeholder="Propositions concrètes pour améliorer la mise en œuvre du PNSC..."
                  className="w-full text-xs bg-slate-50/50 rounded-xl border border-slate-200 p-3 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observations générales
                </label>
                <input
                  type="text"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Autres remarques ou faits marquants de la semaine..."
                  className="w-full text-xs bg-slate-50/50 rounded-xl border border-slate-200 px-3.5 py-2.5 focus:bg-white"
                />
              </div>
            </div>
          </section>

          {/* SECTION 7 : SIGNATURE TACTILE EXCLUSIVE DE L'ASCQ */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 border-b border-slate-100 pb-2">
              7. Signature & Certification de l'ASCQ
            </h3>
            <p className="text-xs text-slate-500">
              Tracez votre signature au doigt ou à la souris pour certifier l'exactitude des informations et chiffres déclarés.
            </p>

            <div className="max-w-md mx-auto">
              <SignatureCanvas
                defaultValue={signatureTactile}
                onSignatureChange={(sig) => setSignatureTactile(sig)}
              />
            </div>
          </section>

          {/* Message de succès ou d'erreur */}
          {saveMsg && (
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
              saveMsg.error ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveMsg.text}</span>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>Sauvegarder en brouillon</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleEnregistrer(true)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Valider & Signer officiellement</span>
            </button>
          </div>

        </form>

        {/* SECTION 8 : COMPILATION COMMUNALE (TABLEAU CROISÉ) */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-100 text-blue-900">
                  Vue Synthétique
                </span>
                <span className="text-xs text-slate-400 font-bold">Semaine {semaine} / {annee}</span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 mt-1">
                Compilation Communale des Arrondissements ({currentUser?.commune_nom || "Commune"})
              </h3>
              <p className="text-xs text-slate-500">
                Agrégation des données PNSC de tous les arrondissements pour la semaine avec calcul automatique des totaux.
              </p>
            </div>

            <button
              onClick={handleExportCompilation}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm active:scale-95 transition-all shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter la Compilation (Excel)</span>
            </button>
          </div>

          {/* Tableau synthétique */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[11px] text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Arrondissement</th>
                  <th className="p-2.5">ASCQ</th>
                  <th className="p-2.5 text-center">RH Gap</th>
                  <th className="p-2.5 text-center">Motos Gap</th>
                  <th className="p-2.5 text-center">Ordis Gap</th>
                  <th className="p-2.5 text-center">Arriérés</th>
                  <th className="p-2.5 text-center">Internet</th>
                  <th className="p-2.5 text-center">Carburant</th>
                  <th className="p-2.5 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compilationRapports.length > 0 ? (
                  compilationRapports.map((r, rIdx) => {
                    const totalArrieres = Number(r.remuneration_due_llf || 0) + Number(r.remuneration_due_fadec || 0) + Number(r.remuneration_due_srhr || 0);
                    return (
                      <tr key={rIdx} className="hover:bg-slate-50/70">
                        <td className="p-2.5 font-bold text-slate-900">{r.arrondissement_nom || "Arrondissement"}</td>
                        <td className="p-2.5">{r.ascq_nom_complet}</td>
                        <td className={`p-2.5 text-center font-bold ${r.rh_gap > 0 ? "text-red-600" : "text-emerald-700"}`}>{r.rh_gap}</td>
                        <td className={`p-2.5 text-center font-bold ${r.motos_gap > 0 ? "text-amber-600" : "text-emerald-700"}`}>{r.motos_gap}</td>
                        <td className={`p-2.5 text-center font-bold ${r.ordinateurs_gap > 0 ? "text-purple-600" : "text-emerald-700"}`}>{r.ordinateurs_gap}</td>
                        <td className="p-2.5 text-center font-bold">{totalArrieres > 0 ? `${totalArrieres} mois` : "0"}</td>
                        <td className="p-2.5 text-center">{r.forfait_internet_recu ? "✅ Oui" : "❌ Non"}</td>
                        <td className="p-2.5 text-center">{r.carburant_recu ? "✅ Oui" : "❌ Non"}</td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.statut === "VALIDE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {r.statut === "VALIDE" ? "Validé" : "Brouillon"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900">{currentUser?.arrondissement_nom || "Mon arrondissement"}</td>
                    <td className="p-2.5">{currentUser ? `${currentUser.prenoms} ${currentUser.nom}` : "Moi"}</td>
                    <td className={`p-2.5 text-center font-bold ${rhGap > 0 ? "text-red-600" : "text-emerald-700"}`}>{rhGap}</td>
                    <td className={`p-2.5 text-center font-bold ${motosGap > 0 ? "text-amber-600" : "text-emerald-700"}`}>{motosGap}</td>
                    <td className={`p-2.5 text-center font-bold ${ordisGap > 0 ? "text-purple-600" : "text-emerald-700"}`}>{ordisGap}</td>
                    <td className="p-2.5 text-center font-bold">{remunTotalMois > 0 ? `${remunTotalMois} mois` : "0"}</td>
                    <td className="p-2.5 text-center">{internetRecu ? "✅ Oui" : "❌ Non"}</td>
                    <td className="p-2.5 text-center">{carburantRecu ? "✅ Oui" : "❌ Non"}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        statutRapport === "VALIDE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {statutRapport === "VALIDE" ? "Validé" : "Brouillon"}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
