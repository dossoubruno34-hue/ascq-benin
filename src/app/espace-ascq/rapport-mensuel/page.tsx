"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AscqNav from "@/components/AscqNav";
import SignatureCanvas from "@/components/SignatureCanvas";
import { sauvegarderBrouillonRapport, chargerBrouillonRapport } from "@/lib/offline-sync";
import {
  FileText,
  BarChart3,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Save,
  Check,
  RefreshCw,
  Sparkles,
  Users,
  Home,
  HeartPulse,
  Stethoscope,
  ShieldAlert,
  PawPrint,
  Share2,
  ListPlus,
  Plus,
  Trash2,
  Eye,
  Edit3,
  Clock
} from "lucide-react";

const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const PATHOLOGIES_SURVEILLANCE = [
  { key: "rougeole", label: "Rougeole", codeAlerte: 1 },
  { key: "cholera", label: "Choléra", codeAlerte: 2 },
  { key: "meningite", label: "Méningite cérébro-spinale", codeAlerte: 3 },
  { key: "pfa", label: "Paralysie Flasque Aiguë (PFA / Poliomyélite)", codeAlerte: 4 },
  { key: "lassa", label: "Fièvre Hémorragique Virale de Lassa", codeAlerte: 5 },
  { key: "ebola", label: "Fièvre Hémorragique Virale Ebola", codeAlerte: 6 },
  { key: "fievre_jaune", label: "Fièvre Jaune", codeAlerte: 7 },
  { key: "dengue", label: "Dengue", codeAlerte: 8 },
  { key: "anthrax", label: "Anthrax (Charbon bactéridien)", codeAlerte: 9 },
  { key: "shigellose", label: "Shigellose (Dysenterie bacillaire)", codeAlerte: 10 },
  { key: "grippe_aviaire", label: "Grippes aviaires", codeAlerte: 11 },
  { key: "rage", label: "Rage humaine", codeAlerte: 12 },
  { key: "covid_19", label: "COVID-19", codeAlerte: 13 },
  { key: "mpox", label: "Mpox (Variole du singe)", codeAlerte: 14 },
  { key: "hantavirus", label: "Hantavirus", codeAlerte: null },
  { key: "deces_maternel", label: "Décès maternels communautaires", codeAlerte: null, isDeces: true },
  { key: "deces_neonatal", label: "Décès néonatals (0 à 28 jours)", codeAlerte: null, isDeces: true },
];

export default function RapportMensuelPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Vue courante : "formulaire" ou "apercu_imprimable"
  const [modeVue, setModeVue] = useState<"formulaire" | "apercu">("formulaire");

  // Mois & Année sélectionnés
  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth() + 1); // 1..12

  // Métadonnées du rapport actuel
  const [rapportId, setRapportId] = useState<string | null>(null);
  const [numeroRapport, setNumeroRapport] = useState<string>("");
  const [statut, setStatut] = useState<"BROUILLON" | "VALIDE">("BROUILLON");
  const [dateValidation, setDateValidation] = useState<string | null>(null);
  const [signatureTactile, setSignatureTactile] = useState<string | null>(null);

  // Historique des rapports
  const [historiqueRapports, setHistoriqueRapports] = useState<any[]>([]);

  // Section 1 : Effectifs RC
  const [rcEnCharge, setRcEnCharge] = useState<number>(0);
  const [rcActifs, setRcActifs] = useState<number>(0);

  // Section 2 : Ménages & Hygiène
  const [menagesEnCharge, setMenagesEnCharge] = useState<number>(0);
  const [menagesVisites, setMenagesVisites] = useState<number>(0);
  const [personnesToucheesTotal, setPersonnesToucheesTotal] = useState<number>(0);
  const [menagesEauPotable, setMenagesEauPotable] = useState<number>(0);
  const [menagesLatrines, setMenagesLatrines] = useState<number>(0);
  const [menagesMildBonEtat, setMenagesMildBonEtat] = useState<number>(0);

  // Section 3 : Santé Mère-Enfant
  const [enfants05Ans, setEnfants05Ans] = useState<number>(0);
  const [femmesEnceintes, setFemmesEnceintes] = useState<number>(0);
  const [enfantsSousVaccinesOrientes, setEnfantsSousVaccinesOrientes] = useState<number>(0);

  // Section 4 : Prise en charge iCCM / PCIME-C
  const [casDiarrhee, setCasDiarrhee] = useState<number>(0);
  const [casIra, setCasIra] = useState<number>(0);
  const [casMalnutrition, setCasMalnutrition] = useState<number>(0);
  const [casPaluTdrPositif, setCasPaluTdrPositif] = useState<number>(0);
  const [casPaluTdrNegatif, setCasPaluTdrNegatif] = useState<number>(0);
  const [casTuberculose, setCasTuberculose] = useState<number>(0);
  const [casHta, setCasHta] = useState<number>(0);
  const [casDiabete, setCasDiabete] = useState<number>(0);

  // Section 5 : Surveillance communautaire (17 pathologies)
  const [donneesSurveillance, setDonneesSurveillance] = useState<Record<string, number>>({
    rougeole: 0,
    cholera: 0,
    meningite: 0,
    pfa: 0,
    lassa: 0,
    ebola: 0,
    fievre_jaune: 0,
    dengue: 0,
    anthrax: 0,
    shigellose: 0,
    grippe_aviaire: 0,
    rage: 0,
    covid_19: 0,
    mpox: 0,
    hantavirus: 0,
    deces_maternel: 0,
    deces_neonatal: 0,
  });

  // Section 6 : Santé animale & Zoonoses
  const [santeAnimale, setSanteAnimale] = useState({
    chiens_recenses: 0,
    chiens_vaccines: 0,
    morsures_chiens: 0,
    chats_recenses: 0,
    chats_vaccines: 0,
    morsures_sauvages: 0,
    mortalites_cheptels: 0,
  });

  // Section 7 : Références & Prise en charge
  const [casReferesCs, setCasReferesCs] = useState<number>(0);
  const [casReferesGups, setCasReferesGups] = useState<number>(0);
  const [casPrisEnChargeCommunaute, setCasPrisEnChargeCommunaute] = useState<number>(0);

  // Section 8 : Autres activités, difficultés et recommandations
  const [autresActivites, setAutresActivites] = useState<Array<{ activite: string; participants: number; observation: string }>>([
    { activite: "Causerie éducative sur la vaccination et le lavage des mains", participants: 45, observation: "Bonne participation des mères" }
  ]);
  const [difficultes, setDifficultes] = useState<Array<{ difficulte: string; impact: string; solution: string }>>([
    { difficulte: "Rupture ponctuelle de tests TDR Paludisme", impact: "Retard de dépistage chez 6 enfants", solution: "Réapprovisionnement d'urgence demandé au CSC" }
  ]);
  const [recommandations, setRecommandations] = useState<Array<{ recommandation: string; cible: string }>>([
    { recommandation: "Accélérer la dotation en intrants iCCM", cible: "Médecin Coordonnateur de Commune (MCC)" }
  ]);

  // Calcul réglementaire de l'échéance : le 3 du mois suivant
  const calculerEcheanceDate = (m: number, a: number) => {
    if (m === 12) {
      return new Date(a + 1, 0, 3);
    }
    return new Date(a, m, 3);
  };

  const echeanceDate = calculerEcheanceDate(mois, annee);
  const echeanceStr = `03/${String(mois === 12 ? 1 : mois + 1).padStart(2, "0")}/${mois === 12 ? annee + 1 : annee}`;
  const estEnRetard = now > echeanceDate && statut !== "VALIDE";

  // Initialisation et chargement du profil
  const initialiserPage = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data: profil } = await supabase
        .from("utilisateurs")
        .select("*, departements(nom), communes(nom), arrondissements(nom)")
        .eq("id", user.id)
        .single();

      setCurrentUser(profil);

      // Charger l'historique des RMA de cet ASCQ
      const { data: historique } = await supabase
        .from("rapports_mensuels_ascq")
        .select("id, numero_rapport, mois, annee, statut, echeance_date, est_en_retard, date_validation, created_at")
        .eq("ascq_id", user.id)
        .order("annee", { ascending: false })
        .order("mois", { ascending: false });

      if (historique) {
        setHistoriqueRapports(historique);
      }

      // Charger le rapport du mois sélectionné
      await chargerRapportDuMois(user.id, mois, annee, profil);
    } catch (err) {
      console.error("Erreur initialisation RMA:", err);
    } finally {
      setLoading(false);
    }
  };

  // Charger les données d'un mois spécifique
  const chargerRapportDuMois = async (userId: string, targetMois: number, targetAnnee: number, profil?: any) => {
    try {
      const { data: rma, error } = await supabase
        .from("rapports_mensuels_ascq")
        .select("*")
        .eq("ascq_id", userId)
        .eq("mois", targetMois)
        .eq("annee", targetAnnee)
        .maybeSingle();

      if (rma) {
        setRapportId(rma.id);
        setNumeroRapport(rma.numero_rapport || "");
        setStatut(rma.statut || "BROUILLON");
        setDateValidation(rma.date_validation || null);
        setSignatureTactile(rma.signature_tactile || null);

        setRcEnCharge(rma.rc_en_charge ?? 0);
        setRcActifs(rma.rc_actifs ?? 0);

        setMenagesEnCharge(rma.menages_en_charge ?? 0);
        setMenagesVisites(rma.menages_visites ?? 0);
        setPersonnesToucheesTotal(rma.personnes_touchees_total ?? 0);
        setMenagesEauPotable(rma.menages_eau_potable ?? 0);
        setMenagesLatrines(rma.menages_latrines ?? 0);
        setMenagesMildBonEtat(rma.menages_mild_bon_etat ?? 0);

        setEnfants05Ans(rma.enfants_0_5_ans ?? 0);
        setFemmesEnceintes(rma.femmes_enceintes ?? 0);
        setEnfantsSousVaccinesOrientes(rma.enfants_sous_vaccines_orientes ?? 0);

        setCasDiarrhee(rma.cas_diarrhee ?? 0);
        setCasIra(rma.cas_ira ?? 0);
        setCasMalnutrition(rma.cas_malnutrition ?? 0);
        setCasPaluTdrPositif(rma.cas_palu_tdr_positif ?? 0);
        setCasPaluTdrNegatif(rma.cas_palu_tdr_negatif ?? 0);
        setCasTuberculose(rma.cas_tuberculose ?? 0);
        setCasHta(rma.cas_hta ?? 0);
        setCasDiabete(rma.cas_diabete ?? 0);

        if (rma.donnees_surveillance) {
          setDonneesSurveillance((prev) => ({ ...prev, ...rma.donnees_surveillance }));
        }
        if (rma.sante_animale) {
          setSanteAnimale((prev) => ({ ...prev, ...rma.sante_animale }));
        }

        setCasReferesCs(rma.cas_referes_centre_sante ?? 0);
        setCasReferesGups(rma.cas_referes_gups ?? 0);
        setCasPrisEnChargeCommunaute(rma.cas_pris_en_charge_communaute ?? 0);

        if (Array.isArray(rma.autres_activites) && rma.autres_activites.length > 0) {
          setAutresActivites(rma.autres_activites);
        }
        if (Array.isArray(rma.difficultes) && rma.difficultes.length > 0) {
          setDifficultes(rma.difficultes);
        }
        if (Array.isArray(rma.recommandations) && rma.recommandations.length > 0) {
          setRecommandations(rma.recommandations);
        }
      } else {
        // Nouveau rapport pour ce mois
        setRapportId(null);
        setNumeroRapport(`RMA-${targetAnnee}-${String(targetMois).padStart(2, "0")}-NOUV`);
        setStatut("BROUILLON");
        setDateValidation(null);
        setSignatureTactile(null);

        // Valeurs par défaut depuis le profil si disponible
        const defaultRc = profil?.nombre_rc_declare || currentUser?.nombre_rc_declare || 0;
        setRcEnCharge(defaultRc);
        setRcActifs(defaultRc);
      }
    } catch (err) {
      console.error("Erreur chargement RMA mois:", err);
    }
  };

  useEffect(() => {
    initialiserPage();
  }, []);

  // Changement de mois ou année
  const handleChangerPeriode = async (nouveauMois: number, nouvelleAnnee: number) => {
    setMois(nouveauMois);
    setAnnee(nouvelleAnnee);
    if (currentUser?.id) {
      setLoading(true);
      await chargerRapportDuMois(currentUser.id, nouveauMois, nouvelleAnnee, currentUser);
      setLoading(false);
    }
  };

  // Pré-remplissage magique de la surveillance
  const executerPreRemplissage = async () => {
    setPrefilling(true);
    setMessage(null);
    try {
      // 1. Appel RPC officielle Phase 9
      const { data, error } = await supabase.rpc("generer_pre_remplissage_surveillance_mensuelle", {
        p_mois: mois,
        p_annee: annee,
      });

      if (!error && data) {
        setDonneesSurveillance((prev) => ({
          ...prev,
          ...data,
        }));
        setMessage({
          text: `Surveillance pré-remplie automatiquement pour ${MOIS_NOMS[mois - 1]} ${annee} avec succès depuis vos fiches d'alerte et de décès.`,
          error: false,
        });
        return;
      }

      // 2. Fallback direct client si la fonction SQL n'est pas encore créée
      if (currentUser?.id) {
        const { data: alertes } = await supabase
          .from("alertes_communautaires")
          .select("type_alerte_code")
          .eq("ascq_superviseur_id", currentUser.id)
          .eq("annee", annee)
          .eq("mois", mois);

        const { data: deces } = await supabase
          .from("deces_communautaires")
          .select("type_deces_code")
          .eq("ascq_superviseur_id", currentUser.id)
          .eq("annee", annee)
          .eq("mois", mois);

        const newCounts: Record<string, number> = { ...donneesSurveillance };
        PATHOLOGIES_SURVEILLANCE.forEach((p) => {
          if (p.codeAlerte) {
            newCounts[p.key] = (alertes || []).filter((a) => a.type_alerte_code === p.codeAlerte).length;
          }
        });
        newCounts["deces_maternel"] = (deces || []).filter((d) => d.type_deces_code === 1).length;
        newCounts["deces_neonatal"] = (deces || []).filter((d) => d.type_deces_code === 2).length;

        // Récupérer également les références Santé et GUPS du mois
        const dateDebutMois = `${annee}-${String(mois).padStart(2, "0")}-01`;
        const dernierJour = new Date(annee, mois, 0).getDate();
        const dateFinMois = `${annee}-${String(mois).padStart(2, "0")}-${String(dernierJour).padStart(2, "0")}`;

        const { data: refsMois } = await supabase
          .from("references_communautaires")
          .select("type_reference, motif_code, one_health_concerne")
          .eq("ascq_id", currentUser.id)
          .gte("date_reference", dateDebutMois)
          .lte("date_reference", dateFinMois);

        if (refsMois && refsMois.length > 0) {
          const nbSante = refsMois.filter(r => r.type_reference === "SANTE").length;
          const nbGups = refsMois.filter(r => r.type_reference === "SOCIAL_GUPS").length;
          const nbMorsures = refsMois.filter(r => r.motif_code && r.motif_code.includes("MORSURE")).length;

          setCasReferesCs(nbSante);
          setCasReferesGups(nbGups);
          if (nbMorsures > 0) {
            setSanteAnimale(prev => ({ ...prev, morsures_chiens: Math.max(prev.morsures_chiens, nbMorsures) }));
          }
        }

        setDonneesSurveillance(newCounts);
        setMessage({
          text: `Pré-remplissage effectué (calcul direct) pour ${MOIS_NOMS[mois - 1]} ${annee} : pathologies, alertes et références vers CS (${casReferesCs}) et GUPS (${casReferesGups}) synchronisées.`,
          error: false,
        });
      }
    } catch (err: any) {
      console.error("Erreur pré-remplissage:", err);
      setMessage({
        text: "Impossible de pré-remplir automatiquement : " + (err.message || "erreur inconnue"),
        error: true,
      });
    } finally {
      setPrefilling(false);
    }
  };

  // Enregistrer ou Valider
  const handleSauvegarder = async (validerOfficiellement: boolean) => {
    if (validerOfficiellement && !signatureTactile) {
      alert("Veuillez apposer votre signature tactile avant de valider officiellement le rapport.");
      return;
    }

    if (validerOfficiellement) {
      const confirmVal = confirm(
        `Êtes-vous sûr de vouloir valider définitivement le Rapport Mensuel d'Activité de ${MOIS_NOMS[mois - 1]} ${annee} ? Cette validation fige le rapport pour le Médecin Coordonnateur de Commune.`
      );
      if (!confirmVal) return;
    }

    setSaving(true);
    setMessage(null);

    const payloadRpc = {
      p_mois: mois,
      p_annee: annee,
      p_rc_en_charge: Number(rcEnCharge) || 0,
      p_rc_actifs: Number(rcActifs) || 0,
      p_menages_en_charge: Number(menagesEnCharge) || 0,
      p_menages_visites: Number(menagesVisites) || 0,
      p_personnes_touchees_total: Number(personnesToucheesTotal) || 0,
      p_menages_eau_potable: Number(menagesEauPotable) || 0,
      p_menages_latrines: Number(menagesLatrines) || 0,
      p_menages_mild_bon_etat: Number(menagesMildBonEtat) || 0,
      p_enfants_0_5_ans: Number(enfants05Ans) || 0,
      p_femmes_enceintes: Number(femmesEnceintes) || 0,
      p_enfants_sous_vaccines_orientes: Number(enfantsSousVaccinesOrientes) || 0,
      p_cas_diarrhee: Number(casDiarrhee) || 0,
      p_cas_ira: Number(casIra) || 0,
      p_cas_malnutrition: Number(casMalnutrition) || 0,
      p_cas_palu_tdr_positif: Number(casPaluTdrPositif) || 0,
      p_cas_palu_tdr_negatif: Number(casPaluTdrNegatif) || 0,
      p_cas_tuberculose: Number(casTuberculose) || 0,
      p_cas_hta: Number(casHta) || 0,
      p_cas_diabete: Number(casDiabete) || 0,
      p_donnees_surveillance: donneesSurveillance,
      p_sante_animale: santeAnimale,
      p_cas_referes_centre_sante: Number(casReferesCs) || 0,
      p_cas_referes_gups: Number(casReferesGups) || 0,
      p_cas_pris_en_charge_communaute: Number(casPrisEnChargeCommunaute) || 0,
      p_autres_activites: autresActivites,
      p_difficultes: difficultes,
      p_recommandations: recommandations,
      p_signature_tactile: signatureTactile,
      p_valider: validerOfficiellement,
    };

    try {
      // 1. Tentative d'enregistrement via la fonction RPC
      const { data: resRpc, error: errRpc } = await supabase.rpc("enregistrer_rapport_mensuel_ascq", payloadRpc);

      if (!errRpc && resRpc) {
        setStatut(validerOfficiellement ? "VALIDE" : "BROUILLON");
        if (validerOfficiellement) {
          setDateValidation(new Date().toISOString());
        }
        if (resRpc.numero_rapport) {
          setNumeroRapport(resRpc.numero_rapport);
        }
        setMessage({
          text: validerOfficiellement
            ? `✅ Rapport Mensuel de ${MOIS_NOMS[mois - 1]} ${annee} VALIDÉ et signé officiellement avec succès !`
            : `💾 Rapport Mensuel de ${MOIS_NOMS[mois - 1]} ${annee} enregistré en brouillon avec succès.`,
          error: false,
        });

        // Recharger historique
        if (currentUser?.id) {
          const { data: hist } = await supabase
            .from("rapports_mensuels_ascq")
            .select("id, numero_rapport, mois, annee, statut, echeance_date, est_en_retard, date_validation, created_at")
            .eq("ascq_id", currentUser.id)
            .order("annee", { ascending: false })
            .order("mois", { ascending: false });
          if (hist) setHistoriqueRapports(hist);
        }
        return;
      }

      // 2. Si la RPC n'a pas encore été créée dans Supabase, guider l'utilisateur
      console.warn("RPC enregistrer_rapport_mensuel_ascq non trouvée, tentative d'upsert direct:", errRpc);

      const generatedNum = numeroRapport.startsWith("RMA-") && !numeroRapport.endsWith("-NOUV")
        ? numeroRapport
        : `RMA-${annee}-${String(mois).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { data: resUpsert, error: errUpsert } = await supabase
        .from("rapports_mensuels_ascq")
        .upsert(
          {
            numero_rapport: generatedNum,
            ascq_id: currentUser.id,
            mois,
            annee,
            statut: validerOfficiellement ? "VALIDE" : "BROUILLON",
            echeance_date: echeanceDate.toISOString().split("T")[0],
            est_en_retard: estEnRetard,
            date_validation: validerOfficiellement ? new Date().toISOString() : dateValidation,
            signature_tactile: signatureTactile,
            rc_en_charge: Number(rcEnCharge) || 0,
            rc_actifs: Number(rcActifs) || 0,
            menages_en_charge: Number(menagesEnCharge) || 0,
            menages_visites: Number(menagesVisites) || 0,
            personnes_touchees_total: Number(personnesToucheesTotal) || 0,
            menages_eau_potable: Number(menagesEauPotable) || 0,
            menages_latrines: Number(menagesLatrines) || 0,
            menages_mild_bon_etat: Number(menagesMildBonEtat) || 0,
            enfants_0_5_ans: Number(enfants05Ans) || 0,
            femmes_enceintes: Number(femmesEnceintes) || 0,
            enfants_sous_vaccines_orientes: Number(enfantsSousVaccinesOrientes) || 0,
            cas_diarrhee: Number(casDiarrhee) || 0,
            cas_ira: Number(casIra) || 0,
            cas_malnutrition: Number(casMalnutrition) || 0,
            cas_palu_tdr_positif: Number(casPaluTdrPositif) || 0,
            cas_palu_tdr_negatif: Number(casPaluTdrNegatif) || 0,
            cas_tuberculose: Number(casTuberculose) || 0,
            cas_hta: Number(casHta) || 0,
            cas_diabete: Number(casDiabete) || 0,
            donnees_surveillance: donneesSurveillance,
            sante_animale: santeAnimale,
            cas_referes_centre_sante: Number(casReferesCs) || 0,
            cas_referes_gups: Number(casReferesGups) || 0,
            cas_pris_en_charge_communaute: Number(casPrisEnChargeCommunaute) || 0,
            autres_activites: autresActivites,
            difficultes: difficultes,
            recommandations: recommandations,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "ascq_id,mois,annee" }
        )
        .select()
        .single();

      if (errUpsert) {
        throw new Error(
          "Impossible d'enregistrer. Avez-vous exécuté le script SQL Phase 9 dans Supabase ? (" +
          errUpsert.message +
          ")"
        );
      }

      setNumeroRapport(generatedNum);
      setStatut(validerOfficiellement ? "VALIDE" : "BROUILLON");
      if (validerOfficiellement) setDateValidation(new Date().toISOString());

      setMessage({
        text: validerOfficiellement
          ? `✅ Rapport Mensuel de ${MOIS_NOMS[mois - 1]} ${annee} VALIDÉ et signé officiellement avec succès !`
          : `💾 Rapport Mensuel de ${MOIS_NOMS[mois - 1]} ${annee} enregistré en brouillon avec succès.`,
        error: false,
      });
    } catch (err: any) {
      console.error("Erreur enregistrement RMA:", err);
      setMessage({
        text: err.message || "Erreur lors de l'enregistrement du rapport mensuel.",
        error: true,
      });
    } finally {
      setSaving(false);
    }
  };

  // Gestion des listes dynamiques (activités, difficultés, recommandations)
  const ajouterActivite = () => {
    setAutresActivites([
      ...autresActivites,
      { activite: "", participants: 0, observation: "" },
    ]);
  };

  const supprimerActivite = (index: number) => {
    setAutresActivites(autresActivites.filter((_, i) => i !== index));
  };

  const ajouterDifficulte = () => {
    setDifficultes([
      ...difficultes,
      { difficulte: "", impact: "", solution: "" },
    ]);
  };

  const supprimerDifficulte = (index: number) => {
    setDifficultes(difficultes.filter((_, i) => i !== index));
  };

  const ajouterRecommandation = () => {
    setRecommandations([
      ...recommandations,
      { recommandation: "", cible: "MCC" },
    ]);
  };

  const supprimerRecommandation = (index: number) => {
    setRecommandations(recommandations.filter((_, i) => i !== index));
  };

  // Impression officielle
  const handleImprimer = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AscqNav userProfile={currentUser} />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="w-10 h-10 border-4 border-[#005c30] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Chargement du Rapport Mensuel d'Activité...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">
      <AscqNav userProfile={currentUser} />

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6">
        {/* ========================================================= */}
        {/* EN-TÊTE ÉCRAN & COMMUTATION DES MODES (MASQUÉ À L'IMPRESSION) */}
        {/* ========================================================= */}
        <div className="print:hidden space-y-4 mb-6">
          {/* Onglets de basculement entre les 2 types de rapports */}
          <div className="bg-white rounded-2xl p-1.5 border border-slate-200/80 shadow-sm flex items-center gap-1">
            <Link
              href="/espace-ascq/rapport-hebdo-pnsc"
              className="flex-1 py-2 px-3 text-center rounded-xl hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <BarChart3 className="w-4 h-4 text-emerald-700" />
              <span>1. Suivi Hebdo PNSC</span>
            </Link>
            <div className="flex-1 py-2 px-3 text-center rounded-xl bg-[#005c30] text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              <span>2. Rapport Mensuel d'Activité (RMA)</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-100 text-[#005c30]">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Rapport Mensuel d'Activité (RMA)
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Suivi mensuel des relais, ménages, soins iCCM et surveillance One Health
                  </p>
                </div>
              </div>
            </div>

            {/* Sélecteur de période (Mois / Année) */}
            <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200">
              <select
                value={mois}
                onChange={(e) => handleChangerPeriode(Number(e.target.value), annee)}
                className="bg-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#005c30]"
              >
                {MOIS_NOMS.map((nom, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {nom}
                  </option>
                ))}
              </select>

              <select
                value={annee}
                onChange={(e) => handleChangerPeriode(mois, Number(e.target.value))}
                className="bg-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#005c30]"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>

          {/* BANNIÈRE D'ÉCHÉANCE ET DE RETARD RÉGLEMENTAIRE (ÉCHÉANCE AU 3 DU MOIS SUIVANT) */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
              statut === "VALIDE"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : estEnRetard
                ? "bg-red-50 border-red-200 text-red-900"
                : "bg-blue-50 border-blue-200 text-blue-900"
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs">
              {statut === "VALIDE" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : estEnRetard ? (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 animate-pulse" />
              ) : (
                <Clock className="w-5 h-5 text-blue-600 shrink-0" />
              )}
              <div>
                <p className="font-bold">
                  {statut === "VALIDE"
                    ? `Rapport validé et signé officiellement (${numeroRapport || "RMA"})`
                    : estEnRetard
                    ? `Attention : Rapport en retard ! Échéance réglementaire dépassée depuis le ${echeanceStr}.`
                    : `Échéance réglementaire : Le ${echeanceStr} (au plus tard le 3 du mois suivant).`}
                </p>
                <p className="text-[11px] opacity-80">
                  {statut === "VALIDE"
                    ? `Transmis au Médecin Coordonnateur le ${dateValidation ? new Date(dateValidation).toLocaleDateString("fr-FR") : "ce jour"}.`
                    : "Pensez à faire valider vos chiffres par vos Relais Communautaires avant soumission."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full ${
                  statut === "VALIDE"
                    ? "bg-emerald-200 text-emerald-900"
                    : estEnRetard
                    ? "bg-red-200 text-red-900"
                    : "bg-amber-200 text-amber-900"
                }`}
              >
                {statut === "VALIDE" ? "Validé" : estEnRetard ? "En retard" : "Brouillon"}
              </span>
            </div>
          </div>

          {/* BARRE D'ACTIONS : MODE FORMULAIRE / APERÇU / IMPRESSION */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setModeVue("formulaire")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modeVue === "formulaire"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Formulaire de saisie</span>
              </button>
              <button
                type="button"
                onClick={() => setModeVue("apercu")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modeVue === "apercu"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Aperçu officiel (Imprimable / PDF)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleImprimer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs shadow hover:bg-slate-900 active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimer / PDF officiel</span>
              <span className="sm:hidden">Imprimer</span>
            </button>
          </div>

          {/* BANDEAU PRÉ-REMPLISSAGE MAGIQUE ONE HEALTH (GAIN DE TEMPS MOBILE) */}
          <div className="bg-gradient-to-r from-emerald-700 via-[#005c30] to-teal-800 text-white p-3.5 sm:p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-600/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
                <Sparkles className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black">
                  Consolidation automatique One Health
                </h3>
                <p className="text-[11px] text-white/85">
                  Agrège automatiquement les 17 pathologies et les décès depuis vos fiches d'alerte validées du mois.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={executerPreRemplissage}
              disabled={prefilling || statut === "VALIDE"}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-black text-xs shadow-md hover:bg-emerald-50 active:scale-95 transition-all disabled:opacity-50 shrink-0"
            >
              {prefilling ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Calcul en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pré-remplir les données du mois</span>
                </>
              )}
            </button>
          </div>

          {/* Notification Toast */}
          {message && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                message.error
                  ? "bg-red-50 text-red-800 border-red-200"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}
            >
              {message.error ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              ) : (
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              )}
              <span>{message.text}</span>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* MODE 1 : FORMULAIRE DE SAISIE */}
        {/* ========================================================= */}
        {modeVue === "formulaire" && (
          <div className="space-y-6 print:hidden">
            {/* SECTION 1 : EFFECTIFS DES RELAIS COMMUNAUTAIRES */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Users className="w-4 h-4 text-[#005c30]" />
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Section 1 : Effectifs des Relais Communautaires (RC)
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre total de RC en charge :
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rcEnCharge}
                    onChange={(e) => setRcEnCharge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Relais rattachés à votre périmètre de supervision.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre de RC actifs ce mois-ci :
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rcActifs}
                    onChange={(e) => setRcActifs(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    RC ayant transmis au moins un signal ou rapport d'activité.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 2 : MÉNAGES & HYGIÈNE */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Home className="w-4 h-4 text-[#005c30]" />
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Section 2 : Ménages & Hygiène du milieu
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ménages en charge</label>
                  <input
                    type="number"
                    min="0"
                    value={menagesEnCharge}
                    onChange={(e) => setMenagesEnCharge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ménages visités</label>
                  <input
                    type="number"
                    min="0"
                    value={menagesVisites}
                    onChange={(e) => setMenagesVisites(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Personnes touchées</label>
                  <input
                    type="number"
                    min="0"
                    value={personnesToucheesTotal}
                    onChange={(e) => setPersonnesToucheesTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ménages avec eau potable</label>
                  <input
                    type="number"
                    min="0"
                    value={menagesEauPotable}
                    onChange={(e) => setMenagesEauPotable(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ménages avec latrines fonctionnelles</label>
                  <input
                    type="number"
                    min="0"
                    value={menagesLatrines}
                    onChange={(e) => setMenagesLatrines(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ménages avec MILD bon état</label>
                  <input
                    type="number"
                    min="0"
                    value={menagesMildBonEtat}
                    onChange={(e) => setMenagesMildBonEtat(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3 : SANTÉ MÈRE-ENFANT */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <HeartPulse className="w-4 h-4 text-[#005c30]" />
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Section 3 : Santé Mère-Enfant
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Enfants de 0 à 5 ans suivis</label>
                  <input
                    type="number"
                    min="0"
                    value={enfants05Ans}
                    onChange={(e) => setEnfants05Ans(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Femmes enceintes suivies</label>
                  <input
                    type="number"
                    min="0"
                    value={femmesEnceintes}
                    onChange={(e) => setFemmesEnceintes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Enfants sous-vaccinés orientés</label>
                  <input
                    type="number"
                    min="0"
                    value={enfantsSousVaccinesOrientes}
                    onChange={(e) => setEnfantsSousVaccinesOrientes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4 : PRISE EN CHARGE iCCM / PCIME-C */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Stethoscope className="w-4 h-4 text-[#005c30]" />
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Section 4 : Prise en charge des maladies (iCCM / PCIME-C)
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cas de Diarrhée (SRO/Zinc)</label>
                  <input
                    type="number"
                    min="0"
                    value={casDiarrhee}
                    onChange={(e) => setCasDiarrhee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cas d'IRA (Pneumonie)</label>
                  <input
                    type="number"
                    min="0"
                    value={casIra}
                    onChange={(e) => setCasIra(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cas de Malnutrition</label>
                  <input
                    type="number"
                    min="0"
                    value={casMalnutrition}
                    onChange={(e) => setCasMalnutrition(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Paludisme : TDR Positifs</label>
                  <input
                    type="number"
                    min="0"
                    value={casPaluTdrPositif}
                    onChange={(e) => setCasPaluTdrPositif(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-sm font-semibold text-emerald-800 focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Paludisme : TDR Négatifs</label>
                  <input
                    type="number"
                    min="0"
                    value={casPaluTdrNegatif}
                    onChange={(e) => setCasPaluTdrNegatif(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Suspicion Tuberculose</label>
                  <input
                    type="number"
                    min="0"
                    value={casTuberculose}
                    onChange={(e) => setCasTuberculose(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Suspicion Hypertension (HTA)</label>
                  <input
                    type="number"
                    min="0"
                    value={casHta}
                    onChange={(e) => setCasHta(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Suspicion Diabète</label>
                  <input
                    type="number"
                    min="0"
                    value={casDiabete}
                    onChange={(e) => setCasDiabete(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 5 : SURVEILLANCE COMMUNAUTAIRE AVEC PRÉ-REMPLISSAGE MAGIQUE */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#005c30]" />
                  <div>
                    <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                      Section 5 : Surveillance à base communautaire (17 pathologies)
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Intègre les alertes vérifiées et les décès communautaires enregistrés ce mois-ci.
                    </p>
                  </div>
                </div>

                {/* Bouton Magique : Pré-remplir */}
                <button
                  type="button"
                  onClick={executerPreRemplissage}
                  disabled={prefilling}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all disabled:opacity-50 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
                  <span>{prefilling ? "Calcul en cours..." : "Pré-remplir automatiquement"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {PATHOLOGIES_SURVEILLANCE.map((p) => {
                  const val = donneesSurveillance[p.key] || 0;
                  return (
                    <div
                      key={p.key}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-colors"
                    >
                      <span className="text-xs font-medium text-slate-800 pr-2 leading-tight">
                        {p.label}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={val}
                        onChange={(e) =>
                          setDonneesSurveillance({
                            ...donneesSurveillance,
                            [p.key]: Number(e.target.value),
                          })
                        }
                        className={`w-16 px-2 py-1 rounded-lg border text-center text-xs font-bold focus:ring-2 focus:ring-[#005c30] focus:outline-none ${
                          val > 0
                            ? "bg-amber-50 border-amber-300 text-amber-900 font-black"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 6 : SANTÉ ANIMALE & ZOONOSES (ONE HEALTH) */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <PawPrint className="w-4 h-4 text-[#005c30]" />
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Section 6 : Santé animale & Zoonoses (Approche One Health)
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chiens recensés</label>
                  <input
                    type="number"
                    min="0"
                    value={santeAnimale.chiens_recenses}
                    onChange={(e) =>
                      setSanteAnimale({ ...santeAnimale, chiens_recenses: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chiens vaccinés rage</label>
                  <input
                    type="number"
                    min="0"
                    value={santeAnimale.chiens_vaccines}
                    onChange={(e) =>
                      setSanteAnimale({ ...santeAnimale, chiens_vaccines: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Morsures de chiens</label>
                  <input
                    type="number"
                    min="0"
                    value={santeAnimale.morsures_chiens}
                    onChange={(e) =>
                      setSanteAnimale({ ...santeAnimale, morsures_chiens: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chats vaccinés</label>
                  <input
                    type="number"
                    min="0"
                    value={santeAnimale.chats_vaccines}
                    onChange={(e) =>
                      setSanteAnimale({ ...santeAnimale, chats_vaccines: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Morsures d'autres animaux</label>
                  <input
                    type="number"
                    min="0"
                    value={santeAnimale.morsures_sauvages}
                    onChange={(e) =>
                      setSanteAnimale({ ...santeAnimale, morsures_sauvages: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mortalités bétail / troupeaux</label>
                  <input
                    type="number"
                    min="0"
                    value={santeAnimale.mortalites_cheptels}
                    onChange={(e) =>
                      setSanteAnimale({ ...santeAnimale, mortalites_cheptels: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 7 : RÉFÉRENCES & PRISE EN CHARGE */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Share2 className="w-4 h-4 text-[#005c30]" />
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Section 7 : Références & Prise en charge
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Référés au Centre de Santé (CSC / CS)</label>
                  <input
                    type="number"
                    min="0"
                    value={casReferesCs}
                    onChange={(e) => setCasReferesCs(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Référés au GUPS (Affaires Sociales)</label>
                  <input
                    type="number"
                    min="0"
                    value={casReferesGups}
                    onChange={(e) => setCasReferesGups(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pris en charge dans la communauté</label>
                  <input
                    type="number"
                    min="0"
                    value={casPrisEnChargeCommunaute}
                    onChange={(e) => setCasPrisEnChargeCommunaute(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-[#005c30] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 8 : AUTRES ACTIVITÉS, DIFFICULTÉS & RECOMMANDATIONS */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ListPlus className="w-4 h-4 text-[#005c30]" />
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Section 8 : Autres activités, difficultés et recommandations
                </h2>
              </div>

              {/* A. Autres activités */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    A. Autres activités menées
                  </h3>
                  <button
                    type="button"
                    onClick={ajouterActivite}
                    className="text-xs font-bold text-[#005c30] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter une activité
                  </button>
                </div>
                {autresActivites.map((act, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      placeholder="Intitulé de l'activité"
                      value={act.activite}
                      onChange={(e) => {
                        const copy = [...autresActivites];
                        copy[idx].activite = e.target.value;
                        setAutresActivites(copy);
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#005c30]"
                    />
                    <input
                      type="number"
                      placeholder="Participants"
                      value={act.participants}
                      onChange={(e) => {
                        const copy = [...autresActivites];
                        copy[idx].participants = Number(e.target.value);
                        setAutresActivites(copy);
                      }}
                      className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#005c30]"
                    />
                    <input
                      type="text"
                      placeholder="Observations"
                      value={act.observation}
                      onChange={(e) => {
                        const copy = [...autresActivites];
                        copy[idx].observation = e.target.value;
                        setAutresActivites(copy);
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#005c30]"
                    />
                    <button
                      type="button"
                      onClick={() => supprimerActivite(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* B. Difficultés */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    B. Difficultés rencontrées
                  </h3>
                  <button
                    type="button"
                    onClick={ajouterDifficulte}
                    className="text-xs font-bold text-[#005c30] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter une difficulté
                  </button>
                </div>
                {difficultes.map((dif, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      placeholder="Description de la difficulté"
                      value={dif.difficulte}
                      onChange={(e) => {
                        const copy = [...difficultes];
                        copy[idx].difficulte = e.target.value;
                        setDifficultes(copy);
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#005c30]"
                    />
                    <input
                      type="text"
                      placeholder="Impact sur le travail"
                      value={dif.impact}
                      onChange={(e) => {
                        const copy = [...difficultes];
                        copy[idx].impact = e.target.value;
                        setDifficultes(copy);
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#005c30]"
                    />
                    <input
                      type="text"
                      placeholder="Solution envisagée / apportée"
                      value={dif.solution}
                      onChange={(e) => {
                        const copy = [...difficultes];
                        copy[idx].solution = e.target.value;
                        setDifficultes(copy);
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#005c30]"
                    />
                    <button
                      type="button"
                      onClick={() => supprimerDifficulte(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* C. Recommandations */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    C. Recommandations formulées
                  </h3>
                  <button
                    type="button"
                    onClick={ajouterRecommandation}
                    className="text-xs font-bold text-[#005c30] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter une recommandation
                  </button>
                </div>
                {recommandations.map((rec, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      placeholder="Recommandation"
                      value={rec.recommandation}
                      onChange={(e) => {
                        const copy = [...recommandations];
                        copy[idx].recommandation = e.target.value;
                        setRecommandations(copy);
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#005c30]"
                    />
                    <input
                      type="text"
                      placeholder="Destinataire (ex: MCC, DDS, Mairie)"
                      value={rec.cible}
                      onChange={(e) => {
                        const copy = [...recommandations];
                        copy[idx].cible = e.target.value;
                        setRecommandations(copy);
                      }}
                      className="w-48 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#005c30]"
                    />
                    <button
                      type="button"
                      onClick={() => supprimerRecommandation(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 9 : SIGNATURE TACTILE DE L'ASCQ */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#005c30]" />
                  <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Section 9 : Signature tactile de l'ASCQ
                  </h2>
                </div>
                {statut === "VALIDE" && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Signé le {dateValidation ? new Date(dateValidation).toLocaleDateString("fr-FR") : ""}
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-600 mb-2">
                  Tracez votre signature au doigt ou à la souris dans le cadre ci-dessous pour certifier l'exactitude de vos déclarations :
                </p>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-2 bg-slate-50 flex justify-center">
                  <SignatureCanvas
                    defaultValue={signatureTactile}
                    onSignatureChange={(sig) => setSignatureTactile(sig)}
                  />
                </div>
              </div>

              {/* BOUTONS D'ENREGISTREMENT ET DE VALIDATION */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSauvegarder(false)}
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Enregistrement..." : "Enregistrer comme Brouillon"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSauvegarder(true)}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#005c30] text-white font-bold text-xs shadow-md hover:bg-[#004724] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? "Validation..." : "Valider et Signer Officiellement"}</span>
                </button>
              </div>
            </div>

            {/* HISTORIQUE DES RAPPORTS MENSUELS */}
            {historiqueRapports.length > 0 && (
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                  Historique de vos rapports mensuels
                </h3>
                <div className="divide-y divide-slate-100">
                  {historiqueRapports.map((h) => (
                    <div
                      key={h.id}
                      className="py-2.5 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 px-2 rounded-xl transition-colors"
                      onClick={() => handleChangerPeriode(h.mois, h.annee)}
                    >
                      <div>
                        <span className="font-bold text-slate-900">
                          {MOIS_NOMS[h.mois - 1]} {h.annee}
                        </span>
                        <span className="text-slate-400 ml-2 font-mono text-[11px]">
                          ({h.numero_rapport})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            h.statut === "VALIDE"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {h.statut}
                        </span>
                        <span className="text-slate-400 text-[11px]">Consulter &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 2 : APERÇU OFFICIEL IMPRIMABLE (OU IMPRESSION PAPIER) */}
        {/* ========================================================= */}
        {(modeVue === "apercu" || typeof window !== "undefined") && (
          <div
            className={`bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 print:block ${
              modeVue === "formulaire" ? "hidden print:block" : "block"
            }`}
          >
            {/* EN-TÊTE RÉPUBLIQUE DU BÉNIN */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="w-16 h-16 relative shrink-0">
                  <Image
                    src="/logo-ascq.png"
                    alt="Logo ASCQ"
                    width={64}
                    height={64}
                    className="object-contain"
                  />
                </div>
                <div className="text-center leading-tight">
                  <p className="font-black text-xs uppercase tracking-widest text-slate-800">
                    RÉPUBLIQUE DU BÉNIN
                  </p>
                  <p className="text-[10px] italic text-slate-600">Fraternité - Justice - Travail</p>
                  <p className="font-bold text-xs uppercase text-slate-900 mt-0.5">
                    MINISTÈRE DE LA SANTÉ
                  </p>
                  <p className="text-[11px] font-medium text-slate-700">
                    Direction Départementale de la Santé : {currentUser?.departement_nom || "Bénin"}
                  </p>
                </div>
                <div className="w-16 text-right shrink-0">
                  <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded border border-slate-300">
                    {statut === "VALIDE" ? "OFFICIEL" : "BROUILLON"}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-[#005c30]">
                  RAPPORT MENSUEL D'ACTIVITÉ DE L'ASCQ (RMA)
                </h1>
                <p className="text-xs font-bold text-slate-700">
                  Période : {MOIS_NOMS[mois - 1].toUpperCase()} {annee} • N° {numeroRapport || "RMA-EN-COURS"}
                </p>
              </div>
            </div>

            {/* IDENTIFICATION DE L'ASCQ ET DU PÉRIMÈTRE */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 print:bg-white print:border-slate-300">
              <div>
                <span className="text-slate-500 block font-medium">Nom & Prénoms ASCQ :</span>
                <span className="font-bold text-slate-900 uppercase">
                  {currentUser ? `${currentUser.prenoms} ${currentUser.nom}` : "Bruno DOSSOU"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Téléphone :</span>
                <span className="font-bold text-slate-900">
                  {currentUser?.telephone || "Non renseigné"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Arrondissement / Commune :</span>
                <span className="font-bold text-slate-900 uppercase">
                  {currentUser?.arrondissement_nom || "Arrondissement"} / {currentUser?.commune_nom || "Commune"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Financement & CS :</span>
                <span className="font-bold text-slate-900">
                  {currentUser?.source_financement || "LLF"} • {currentUser?.structure_sante_nom || "CSC"}
                </span>
              </div>
            </div>

            {/* TABLEAU 1 : EFFECTIFS RC ET MÉNAGES */}
            <div className="mb-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-1.5 bg-slate-100 p-1.5 rounded">
                1. Effectifs Relais Communautaires & Ménages Visités
              </h3>
              <table className="w-full text-[11px] border border-slate-300">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="p-1.5 font-medium bg-slate-50 w-1/3">RC en charge :</td>
                    <td className="p-1.5 font-bold w-1/6">{rcEnCharge}</td>
                    <td className="p-1.5 font-medium bg-slate-50 w-1/3">RC actifs ce mois :</td>
                    <td className="p-1.5 font-bold w-1/6">{rcActifs}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-1.5 font-medium bg-slate-50">Ménages en charge :</td>
                    <td className="p-1.5 font-bold">{menagesEnCharge}</td>
                    <td className="p-1.5 font-medium bg-slate-50">Ménages visités :</td>
                    <td className="p-1.5 font-bold">{menagesVisites}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-1.5 font-medium bg-slate-50">Personnes touchées :</td>
                    <td className="p-1.5 font-bold">{personnesToucheesTotal}</td>
                    <td className="p-1.5 font-medium bg-slate-50">Ménages avec eau potable :</td>
                    <td className="p-1.5 font-bold">{menagesEauPotable}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-medium bg-slate-50">Latrines hygiéniques :</td>
                    <td className="p-1.5 font-bold">{menagesLatrines}</td>
                    <td className="p-1.5 font-medium bg-slate-50">MILD en bon état :</td>
                    <td className="p-1.5 font-bold">{menagesMildBonEtat}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TABLEAU 2 : SANTÉ MÈRE-ENFANT & PRISE EN CHARGE iCCM */}
            <div className="mb-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-1.5 bg-slate-100 p-1.5 rounded">
                2. Santé Mère-Enfant & Prise en charge des maladies (iCCM)
              </h3>
              <table className="w-full text-[11px] border border-slate-300">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="p-1.5 font-medium bg-slate-50">Enfants de 0 à 5 ans suivis :</td>
                    <td className="p-1.5 font-bold">{enfants05Ans}</td>
                    <td className="p-1.5 font-medium bg-slate-50">Femmes enceintes suivies :</td>
                    <td className="p-1.5 font-bold">{femmesEnceintes}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-1.5 font-medium bg-slate-50">Enfants sous-vaccinés orientés :</td>
                    <td className="p-1.5 font-bold">{enfantsSousVaccinesOrientes}</td>
                    <td className="p-1.5 font-medium bg-slate-50">Cas de Diarrhée (SRO/Zinc) :</td>
                    <td className="p-1.5 font-bold">{casDiarrhee}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-1.5 font-medium bg-slate-50">Cas d'IRA (Pneumonie) :</td>
                    <td className="p-1.5 font-bold">{casIra}</td>
                    <td className="p-1.5 font-medium bg-slate-50">Cas de Malnutrition :</td>
                    <td className="p-1.5 font-bold">{casMalnutrition}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-1.5 font-medium bg-slate-50">Palu : TDR Positifs :</td>
                    <td className="p-1.5 font-bold text-emerald-800">{casPaluTdrPositif}</td>
                    <td className="p-1.5 font-medium bg-slate-50">Palu : TDR Négatifs :</td>
                    <td className="p-1.5 font-bold">{casPaluTdrNegatif}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-medium bg-slate-50">Suspicion Tuberculose :</td>
                    <td className="p-1.5 font-bold">{casTuberculose}</td>
                    <td className="p-1.5 font-medium bg-slate-50">Suspicion HTA / Diabète :</td>
                    <td className="p-1.5 font-bold">{casHta} / {casDiabete}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TABLEAU 3 : SURVEILLANCE COMMUNAUTAIRE ONE HEALTH (17 PATHOLOGIES) */}
            <div className="mb-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-1.5 bg-slate-100 p-1.5 rounded">
                3. Surveillance épidémiologique à base communautaire (17 signaux)
              </h3>
              <table className="w-full text-[10px] border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-left">
                    <th className="p-1 font-bold">Pathologie / Signal</th>
                    <th className="p-1 font-bold text-center">Cas</th>
                    <th className="p-1 font-bold">Pathologie / Signal</th>
                    <th className="p-1 font-bold text-center">Cas</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.ceil(PATHOLOGIES_SURVEILLANCE.length / 2) }).map((_, i) => {
                    const p1 = PATHOLOGIES_SURVEILLANCE[i * 2];
                    const p2 = PATHOLOGIES_SURVEILLANCE[i * 2 + 1];
                    return (
                      <tr key={i} className="border-b border-slate-300">
                        <td className="p-1 font-medium">{p1 ? p1.label : ""}</td>
                        <td className="p-1 text-center font-bold">
                          {p1 ? donneesSurveillance[p1.key] || 0 : ""}
                        </td>
                        <td className="p-1 font-medium">{p2 ? p2.label : ""}</td>
                        <td className="p-1 text-center font-bold">
                          {p2 ? donneesSurveillance[p2.key] || 0 : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TABLEAU 4 : SANTÉ ANIMALE & RÉFÉRENCES */}
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-1.5 bg-slate-100 p-1.5 rounded">
                  4. Santé Animale & Zoonoses
                </h3>
                <table className="w-full text-[10px] border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="p-1 bg-slate-50">Chiens recensés / vaccinés :</td>
                      <td className="p-1 font-bold text-right">{santeAnimale.chiens_recenses} / {santeAnimale.chiens_vaccines}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="p-1 bg-slate-50">Morsures de chiens :</td>
                      <td className="p-1 font-bold text-right">{santeAnimale.morsures_chiens}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="p-1 bg-slate-50">Chats vaccinés rage :</td>
                      <td className="p-1 font-bold text-right">{santeAnimale.chats_vaccines}</td>
                    </tr>
                    <tr>
                      <td className="p-1 bg-slate-50">Mortalités bétail / troupeaux :</td>
                      <td className="p-1 font-bold text-right">{santeAnimale.mortalites_cheptels}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-1.5 bg-slate-100 p-1.5 rounded">
                  5. Références & Prise en charge
                </h3>
                <table className="w-full text-[10px] border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="p-1 bg-slate-50">Cas référés au Centre de Santé (CSC) :</td>
                      <td className="p-1 font-bold text-right">{casReferesCs}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="p-1 bg-slate-50">Cas référés au GUPS (Affaires Sociales) :</td>
                      <td className="p-1 font-bold text-right">{casReferesGups}</td>
                    </tr>
                    <tr>
                      <td className="p-1 bg-slate-50">Cas pris en charge dans la communauté :</td>
                      <td className="p-1 font-bold text-right">{casPrisEnChargeCommunaute}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLEAU 5 : SYNTHÈSE DES ACTIONS, DIFFICULTÉS & RECOMMANDATIONS */}
            <div className="mb-6 space-y-2 text-[10px]">
              <div className="bg-slate-50 p-2 rounded border border-slate-300">
                <span className="font-bold block uppercase text-slate-800">Autres activités notables :</span>
                {autresActivites.map((a, i) => (
                  <p key={i}>• {a.activite} ({a.participants} participants) {a.observation && `- ${a.observation}`}</p>
                ))}
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-300">
                <span className="font-bold block uppercase text-slate-800">Difficultés & Recommandations :</span>
                {difficultes.map((d, i) => (
                  <p key={i}>• Problème : {d.difficulte} {d.solution && `(Solution : ${d.solution})`}</p>
                ))}
                {recommandations.map((r, i) => (
                  <p key={i} className="font-semibold text-slate-900">• Recommandation ({r.cible}) : {r.recommandation}</p>
                ))}
              </div>
            </div>

            {/* SIGNATURE OFFICIELLE UNIQUE DE L'ASCQ */}
            <div className="pt-4 border-t-2 border-slate-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-extrabold uppercase text-slate-900 text-sm">
                  Signature & Engagement de l'ASCQ :
                </p>
                <p className="text-xs text-slate-600">
                  Fait à <strong className="text-slate-900">{currentUser?.commune_nom || "la commune"}</strong>, le <strong className="text-slate-900">{dateValidation ? new Date(dateValidation).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")}</strong>
                </p>
                <p className="text-[11px] text-slate-500 italic max-w-md">
                  « Je soussigné(e), Agent de Santé Communautaire Qualifié (ASCQ), certifie sur l'honneur l'exactitude des informations et chiffres consignés dans le présent rapport. »
                </p>
                <p className="font-black text-slate-900 uppercase text-sm pt-1">
                  {currentUser ? `${currentUser.prenoms} ${currentUser.nom}` : "ASCQ Bénin"}
                </p>
              </div>

              <div className="shrink-0 sm:text-right">
                {signatureTactile ? (
                  <div className="border border-slate-300 rounded-xl p-2 inline-block bg-white shadow-2xs">
                    <img
                      src={signatureTactile}
                      alt="Signature officielle de l'ASCQ"
                      className="h-20 max-w-[240px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-48 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-xs italic bg-slate-50">
                    Signature tactile non enregistrée
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
