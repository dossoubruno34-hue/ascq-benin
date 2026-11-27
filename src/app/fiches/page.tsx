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
import {
  FicheOfficielleRegistreAlertes,
  FicheOfficielleNotificationAlerte,
  FicheOfficielleNotificationDeces,
  FicheOfficielleInvestigationEvenement,
  FicheOfficielleRapportHebdoSurveillance
} from "@/components/fiches-officielles";
import ModalApercuFidelePdf from "@/components/ModalApercuFidelePdf";
import BoutonSuppressionSecurisee from "@/components/BoutonSuppressionSecurisee";

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

  const [filtreType, setFiltreType] = useState<"TOUT" | "ALR" | "ALR_A_CONFIRMER" | "ALR_CONFIRMEES" | "REG" | "DEC" | "INV" | "RAP">("TOUT");
  const [filtreStatut, setFiltreStatut] = useState<string>("TOUT");
  const [idsSupprimes, setIdsSupprimes] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem("ascq_fiches_supprimees") || "[]");
        if (Array.isArray(saved)) setIdsSupprimes(saved);
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab");
        if (tab === "a_confirmer") setFiltreType("ALR_A_CONFIRMER");
        else if (tab === "confirmees") setFiltreType("ALR_CONFIRMEES");
        else if (tab === "registre") setFiltreType("REG");
        else if (tab === "deces") setFiltreType("DEC");
        else if (tab === "investigation") setFiltreType("INV");
        else if (tab === "rapport") setFiltreType("RAP");
      } catch {}
    }
  }, []);

  const handleSupprimerFiche = async (fiche: any) => {
    if (!fiche?.id) return;
    const tableMap: Record<string, string> = {
      ALR: "alertes_communautaires",
      REG: "registre_alertes_rumeurs",
      DEC: "deces_communautaires",
      INV: "investigations_evenements",
      RAP: "rapports_hebdomadaires"
    };
    const tableName = tableMap[fiche.type];
    if (tableName) {
      try {
        await supabase.from(tableName).delete().eq("id", fiche.id);
      } catch (e) {
        console.warn("Suppression distante:", e);
      }
    }
    if (typeof window !== "undefined") {
      try {
        const nextIds = Array.from(new Set([...idsSupprimes, fiche.id]));
        setIdsSupprimes(nextIds);
        localStorage.setItem("ascq_fiches_supprimees", JSON.stringify(nextIds));
        if (fiche.type === "REG") {
          const loc = JSON.parse(localStorage.getItem("ascq_registres_locaux") || "[]");
          localStorage.setItem("ascq_registres_locaux", JSON.stringify(loc.filter((x: any) => x.id !== fiche.id)));
        }
      } catch {}
    }
    if (ficheConsultation?.id === fiche.id) {
      setFicheConsultation(null);
    }
    await chargerFiches();
  };
  const [recherche, setRecherche] = useState("");
  const [brouillonsCount, setBrouillonsCount] = useState(0);
  const [page, setPage] = useState(1);
  const FICHES_PER_PAGE = 15;

  // Fiche sélectionnée pour consultation & impression officielle
  const [ficheConsultation, setFicheConsultation] = useState<any | null>(null);
  // Mode d'impression du registre complet
  const [imprimerModeRegistre, setImprimerModeRegistre] = useState<boolean>(false);
  // Mode modèle officiel vierge pour téléchargement/impression directe
  const [modeVierge, setModeVierge] = useState<boolean>(false);
  const [modalChoixModeleVierge, setModalChoixModeleVierge] = useState<boolean>(false);

  // État de l'Aperçu Fidèle Vectoriel Officiel DDS (pdf-lib superposition sur PDF officiel)
  const [ficheApercuPdf, setFicheApercuPdf] = useState<{
    type: "REG" | "ALR" | "DEC" | "INV" | "RAP";
    donnees: any;
    titre?: string;
    isVierge?: boolean;
  } | null>(null);

  const ouvrirApercuFidele = (fiche: any, isVierge: boolean = false) => {
    const type = (fiche.type || "ALR") as "REG" | "ALR" | "DEC" | "INV" | "RAP";
    setFicheApercuPdf({
      type,
      donnees: fiche,
      titre: fiche.typeLibelle || fiche.titre || "Fiche officielle de surveillance",
      isVierge
    });
  };

  // Mappings pour les fiches officielles du Ministère de la Santé
  const mapDecesData = (fc: any) => {
    const r = fc.rawData || {};
    let ageAnnees = r.age_annees;
    let ageMois = r.age_mois;
    let ageJours = r.age_jours;
    if (r.age_valeur !== undefined && r.age_valeur !== null) {
      if (r.age_unite === "mois") {
        ageMois = r.age_valeur;
      } else if (r.age_unite === "jours" || r.age_unite === "jour") {
        ageJours = r.age_valeur;
      } else {
        ageAnnees = r.age_valeur;
      }
    }

    let nomParent = (r.nom_parent || "").trim();
    let telephoneParent = (r.telephone_parent || "").trim();

    // Détection intelligente : si le nom du parent est en réalité un numéro de téléphone (ex: 0141424199)
    if (!telephoneParent && nomParent && /^(\+?229\s?)?[0-9\s-]{8,15}$/.test(nomParent.replace(/\s+/g, ""))) {
      telephoneParent = nomParent;
      nomParent = "";
    }

    return {
      annee: fc.annee || r.annee || new Date().getFullYear(),
      semaineEpidemio: fc.semaine || r.semaine_epidemio,
      mois: r.mois || (fc.date ? fc.date.split("-")[1] : ""),
      npiDefunt: r.npi_defunt || r.defunt_npi || "",
      numeroDeces: fc.numero || r.numero_deces,
      departement: fc.departement,
      zoneSanitaire: r.zone_sanitaire_nom || r.zone_sanitaire || fc.departement,
      commune: fc.commune,
      arrondissement: fc.arrondissement,
      village: fc.village,
      numeroGrappe: r.numero_grappe || r.grappe || "",
      adresse: r.adresse_domicile || r.adresse || "",
      nomPrenomsDefunt: r.defunt_nom_prenom || `${r.nom_defunt || ""} ${r.prenoms_defunt || ""}`.trim(),
      nomParent,
      telephoneParent,
      dateNaissance: r.date_naissance || "",
      ageAnnees,
      ageMois,
      ageJours,
      sexe: r.sexe,
      gpsLongitude: r.gps_longitude || r.longitude,
      gpsLatitude: r.gps_latitude || r.latitude,
      typeDecesCode: r.type_deces_code,
      dateDeces: r.date_deces || fc.date,
      dateNotification: r.date_notification || (r.created_at ? r.created_at.split("T")[0] : fc.date),
      dateSaisie: r.created_at ? r.created_at.split("T")[0] : fc.date,
      lieuDecesCode: r.lieu_deces_code,
      lieuPaysEtranger: r.lieu_pays_etranger,
      lieuAutrePrecision: r.lieu_autre_precision,
      circonstancesCode: r.circonstance_code || r.circonstances_code,
      circonstancesAutrePrecision: r.circonstance_autre_precision,
      causeProbableCim10: r.cause_probable_cim10 || r.cause_probable || r.type_deces_nom,
      notificateurNom: (r.notificateur_nom_complet || fc.notificateur || "").replace(/^(ASCQ|RC|RELAIS)\s*:\s*/i, ""),
      notificateurTitre: (r.notificateur_titre || fc.notificateurTitre || "").toUpperCase().includes("RC") || (r.notificateur_titre || fc.notificateurTitre || "").toUpperCase().includes("RELAIS") ? "RC" : "ASCQ",
      notificateurStructure: r.notificateur_structure || `Arrondissement de ${fc.arrondissement || ""}`,
      notificateurTelephone: r.notificateur_telephone || fc.notificateurTel || "",
      signatureNotificateur: r.signature_tactile || r.signature || fc.signature || null,
      dateSignature: r.date_notification || (r.created_at ? r.created_at.split("T")[0] : fc.date),
    };
  };

  const mapAlerteData = (fc: any) => {
    const r = fc.rawData || {};
    return {
      pointFocalNom: r.notificateur_nom_complet || fc.notificateur,
      telephone: r.notificateur_telephone || fc.notificateurTel || "",
      arrondissement: fc.arrondissement,
      commune: fc.commune,
      zoneSanitaire: r.zone_sanitaire_nom || r.zone_sanitaire || fc.departement,
      dateNotification: r.date_notification || fc.date,
      typeMaladieDescription: `${corrigerAccents(fc.titre || r.type_alerte_nom || "")}${r.description_signes ? " — " + r.description_signes : ""}`,
      dateSurvenueHeure: r.date_survenue ? `${r.date_survenue} ${r.heure_survenue || ""}`.trim() : "",
      dateDetectionHeure: r.date_detection ? `${r.date_detection} ${r.heure_detection || ""}`.trim() : "",
      lieuProvenance: `${fc.village || ""}${r.adresse_domicile ? " (" + r.adresse_domicile + ")" : ""}`,
      nbPersonnesTouchees: r.nb_personnes_touchees ?? 1,
      decesPresence: (Number(r.nb_personnes_mortes) > 0 || r.deces_presence) ? "OUI" : "NON",
      nbDeces: r.nb_personnes_mortes ?? 0,
      animauxImpliques: r.animaux_impliques ? "OUI" : "NON",
      evenementEnCours: r.evenement_en_cours !== false ? "OUI" : "NON",
      mesuresPrises: r.mesures_prises || r.actions_immediates || "",
      signatureNom: r.notificateur_nom_complet || fc.notificateur,
    };
  };

  const mapRegistreData = (fc: any) => {
    const r = fc.rawData || {};
    return {
      zoneSanitaire: r.zone_sanitaire_nom || fc.departement,
      commune: fc.commune,
      arrondissement: fc.arrondissement,
      centreSante: r.centre_sante || `CS ${fc.arrondissement || ""}`,
      village: fc.village,
      mois: r.mois || (fc.date ? fc.date.split("-")[1] : ""),
      annee: fc.annee || r.annee || new Date().getFullYear(),
      lignes: [
        {
          numero: 1,
          typeCode: r.type_code || 1,
          dateSurvenue: r.date_survenue || fc.date,
          lieuDetection: fc.village,
          nbTouchees: r.nb_personnes_touchees ?? 1,
          nbDecedes: r.nb_personnes_decedees ?? 0,
          mesurePrise: r.mesure_prise || r.mesures_prises || "Transmis à l'ASCQ",
        }
      ]
    };
  };

  const mapInvestigationData = (fc: any) => {
    const r = fc.rawData || {};
    return {
      departement: fc.departement,
      zoneSanitaire: r.zone_sanitaire_nom || fc.departement,
      commune: fc.commune,
      arrondissement: fc.arrondissement,
      village: fc.village,
      relaisNomPrenom: r.relais_nom_prenom || r.relais_nom || "",
      relaisTelephone: r.relais_telephone || "",
      ascqNomPrenom: r.investigateur_nom || fc.notificateur,
      ascqTelephone: r.investigateur_telephone || fc.notificateurTel || "",
      coordonneesGps: r.coordonnees_gps || (r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : ""),
      evenementAvere: r.evenement_avere ? "OUI" : "NON",
      sourceInformation: r.source_information || "Signalement communautaire",
      maladieEvenementConcerne: r.type_alerte_nom || fc.titre,
      descriptionEvenement: r.description_evenement || r.description || "",
      circonstancesSurvenue: r.circonstances_survenue || "",
      dateSurvenue: r.date_survenue || "",
      dateNotification: r.date_notification || "",
      dateInvestigation: r.date_investigation || fc.date,
      cas: {
        cas0_11m_m: r.cas_0_11m_m || 0,
        cas0_11m_f: r.cas_0_11m_f || 0,
        cas1_5a_m: r.cas_1_5a_m || 0,
        cas1_5a_f: r.cas_1_5a_f || 0,
        cas6_15a_m: r.cas_6_15a_m || 0,
        cas6_15a_f: r.cas_6_15a_f || 0,
        casPlus15a_m: r.cas_plus_15a_m || 0,
        casPlus15a_f: r.cas_plus_15a_f || 0,
      },
      deces: {
        deces0_11m_m: r.deces_0_11m_m || 0,
        deces0_11m_f: r.deces_0_11m_f || 0,
        deces1_5a_m: r.deces_1_5a_m || 0,
        deces1_5a_f: r.deces_1_5a_f || 0,
        deces6_15a_m: r.deces_6_15a_m || 0,
        deces6_15a_f: r.deces_6_15a_f || 0,
        decesPlus15a_m: r.deces_plus_15a_m || 0,
        decesPlus15a_f: r.deces_plus_15a_f || 0,
      },
      syntheseActions: r.synthese_actions || r.actions_menees || "",
      signatureInvestigateurs: r.investigateur_nom || fc.notificateur,
    };
  };

  const mapRapportData = (fc: any) => {
    const r = fc.rawData || {};
    return {
      departement: fc.departement,
      zoneSanitaire: r.zone_sanitaire_nom || fc.departement,
      commune: fc.commune,
      arrondissement: fc.arrondissement,
      village: fc.village,
      semaineNum: fc.semaine || r.semaine_epidemio,
      dateDebut: r.date_debut_semaine || fc.date,
      dateFin: r.date_fin_semaine || "",
      alertesDetectees: r.alertes_detectees || 0,
      personnesTouchees: r.personnes_touchees || 0,
      personnesDecedees: r.personnes_decedees || 0,
      alertesVerifiees48h: r.alertes_verifiees_48h || 0,
      alertesAverees: r.alertes_averees || 0,
      decesMaternels: r.deces_maternels || 0,
      decesNeonatals: r.deces_neonatals || 0,
      decesInfantiles: r.deces_infantiles || 0,
      decesInfantoJuveniles: r.deces_infanto_juveniles || 0,
      decesPlus5Ans: r.deces_plus_5_ans || 0,
      actionsMenees: r.actions_menees || r.actions || "",
      signatureRapporteur: (r.rapporteur_nom || fc.notificateur || "").replace(/^(ASCQ|RC)\s*:\s*/i, ""),
      signatureTactile: r.signature_tactile || fc.signature || null,
    };
  };

  const ouvrirModeleVierge = (type: "REG" | "ALR" | "DEC" | "INV" | "RAP", titre: string) => {
    setModalChoixModeleVierge(false);
    ouvrirApercuFidele({
      id: "modele-vierge",
      type,
      numero: "MODÈLE OFFICIEL VIERGE",
      typeLibelle: titre,
      titre,
      departement: currentUser?.departement_nom || "Zou",
      commune: currentUser?.commune_nom || "Ouinhi",
      arrondissement: currentUser?.arrondissement_nom || "Tohoues",
      village: currentUser?.village_nom || "",
      date: new Date().toISOString().split("T")[0],
      annee: new Date().getFullYear(),
      notificateur: currentUser ? `${currentUser.poste || 'ASCQ'} : ${currentUser.prenoms} ${currentUser.nom}` : "ASCQ",
      notificateurTel: currentUser?.telephone || "",
      notificateurTitre: currentUser?.poste || "ASCQ",
      rawData: {}
    }, true);
  };

  // État et action de validation par l'ASCQ superviseur
  const [validationEnCours, setValidationEnCours] = useState(false);
  const [observationValidation, setObservationValidation] = useState("");
  const [msgValidation, setMsgValidation] = useState<{ text: string; error: boolean } | null>(null);

  const handleValiderOuInvaliderNotification = async (action: "VALIDER" | "INVALIDER") => {
    if (!ficheConsultation) return;
    setValidationEnCours(true);
    setMsgValidation(null);

    const nouveauStatut = action === "VALIDER" ? "VALIDE" : "INVALIDE";
    const nouveauResultat = action === "VALIDER" ? "AVEREE" : "NON_AVEREE";

    try {
      let rpcOk = false;
      try {
        const { error: rpcErr } = await supabase.rpc("valider_notification_communautaire", {
          p_type: ficheConsultation.type,
          p_id: ficheConsultation.id,
          p_action: action,
          p_observations: observationValidation || (action === "VALIDER" ? "Validé par le superviseur ASCQ" : "Invalidé après vérification"),
        });
        if (!rpcErr) rpcOk = true;
      } catch {}

      if (!rpcOk) {
        if (ficheConsultation.type === "DEC") {
          let { error } = await supabase
            .from("deces_communautaires")
            .update({
              statut: nouveauStatut,
              ascq_superviseur_id: currentUser?.id || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", ficheConsultation.id);

          // Repli résilient si la contrainte PostgreSQL n'a pas encore été élargie à 'INVALIDE'
          if (error && (error.message?.includes("statut_check") || error.code === "23514")) {
            const fallbackStatut = action === "VALIDER" ? "VALIDE" : "CLOTURE";
            const retryRes = await supabase
              .from("deces_communautaires")
              .update({
                statut: fallbackStatut,
                ascq_superviseur_id: currentUser?.id || null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", ficheConsultation.id);
            if (!retryRes.error) {
              error = null;
            }
          }
          if (error) throw error;

          // Sauvegarde locale de l'acquittement pour lever immédiatement l'alerte 48h
          if (typeof window !== "undefined") {
            try {
              const raw = localStorage.getItem("ascq_deces_acquittes");
              const arr: string[] = raw ? JSON.parse(raw) : [];
              if (!arr.includes(ficheConsultation.id)) arr.push(ficheConsultation.id);
              localStorage.setItem("ascq_deces_acquittes", JSON.stringify(arr));
            } catch {}
          }
        } else if (ficheConsultation.type === "ALR") {
          const { error } = await supabase
            .from("alertes_communautaires")
            .update({
              statut: nouveauStatut,
              resultat_verification: nouveauResultat,
              commentaire_verification: observationValidation || (action === "VALIDER" ? "Validé par l'ASCQ" : "Invalidé"),
              ascq_superviseur_id: currentUser?.id || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", ficheConsultation.id);
          if (error) throw error;
        } else if (ficheConsultation.type === "REG") {
          const regStatut = action === "VALIDER" ? "TRANSFORMEE_ALERTE" : "CLASSEE_SANS_SUITE";
          let regUpdOk = false;
          try {
            const { error: err1 } = await supabase
              .from("registre_alertes_rumeurs")
              .update({
                statut: regStatut,
                ascq_superviseur_id: currentUser?.id || null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", ficheConsultation.id);
            if (!err1) regUpdOk = true;
          } catch {}

          if (!regUpdOk) {
            try {
              const { error: err2 } = await supabase
                .from("registre_alertes_rumeurs")
                .update({
                  statut: regStatut,
                })
                .eq("id", ficheConsultation.id);
              if (!err2) regUpdOk = true;
            } catch {}
          }

          // Persistance locale garantie pour résilience hors-ligne / RLS
          if (typeof window !== "undefined") {
            try {
              const rawVal = localStorage.getItem("ascq_registres_valides");
              const mapVal: Record<string, any> = rawVal ? JSON.parse(rawVal) : {};
              mapVal[ficheConsultation.id] = {
                statut: nouveauStatut,
                statut_db: regStatut,
                resultat: nouveauResultat,
                ascq_superviseur_id: currentUser?.id || null,
                observations: observationValidation || (action === "VALIDER" ? "Validé par l'ASCQ" : "Invalidé"),
                updated_at: new Date().toISOString()
              };
              localStorage.setItem("ascq_registres_valides", JSON.stringify(mapVal));
            } catch {}
          }
        }
      }

      setFicheConsultation((prev: any) => prev ? ({
        ...prev,
        statut: nouveauStatut,
        resultat: nouveauResultat,
      }) : null);

      setMsgValidation({
        text: action === "VALIDER" 
          ? "✅ Déclaration validée avec succès !" 
          : "⚠️ Déclaration invalidée avec succès.",
        error: false,
      });

      await chargerFiches();
    } catch (err: any) {
      setMsgValidation({ text: err.message || "Erreur lors de la mise à jour du statut", error: true });
    } finally {
      setValidationEnCours(false);
    }
  };
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

      // 2. Registre (REG) + fusion des lignes locales et validations locales
      const { data: regData } = await supabase
        .from("registre_alertes_rumeurs")
        .select("*")
        .order("created_at", { ascending: false });
      let regList: any[] = regData || [];
      if (typeof window !== "undefined") {
        try {
          const localRegs: any[] = JSON.parse(localStorage.getItem("ascq_registres_locaux") || "[]");
          const existingIds = new Set(regList.map((x: any) => x.id));
          localRegs.forEach((lr) => {
            if (lr?.id && !existingIds.has(lr.id)) regList.unshift(lr);
          });
          const mapVal: Record<string, any> = JSON.parse(localStorage.getItem("ascq_registres_valides") || "{}");
          regList = regList.map((r: any) => {
            const v = mapVal[r.id];
            if (v) {
              return { ...r, statut: v.statut || r.statut, ascq_superviseur_id: v.ascq_superviseur_id || r.ascq_superviseur_id };
            }
            return r;
          });
        } catch {}
      }
      setRegistres(regList);

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

  // Filtrage (avec exclusion des fiches supprimées et sous-onglets Alertes à confirmer / Alertes déjà confirmées)
  const fichesActives = fichesUnifiees.filter((f) => !idsSupprimes.includes(f.id));
  const nbAlertesAConfirmer = fichesActives.filter(
    (f) => f.type === "ALR" && f.statut !== "VALIDE" && f.resultat !== "AVEREE" && f.statut !== "INVALIDE"
  ).length;
  const nbAlertesConfirmees = fichesActives.filter(
    (f) => f.type === "ALR" && (f.statut === "VALIDE" || f.resultat === "AVEREE")
  ).length;

  const fichesFiltrees = fichesActives.filter((f) => {
    if (filtreType === "ALR_A_CONFIRMER") {
      if (f.type !== "ALR" || f.statut === "VALIDE" || f.resultat === "AVEREE" || f.statut === "INVALIDE") return false;
    } else if (filtreType === "ALR_CONFIRMEES") {
      if (f.type !== "ALR" || (f.statut !== "VALIDE" && f.resultat !== "AVEREE")) return false;
    } else if (filtreType !== "TOUT" && f.type !== filtreType) {
      return false;
    }
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

  const estRc = currentUser?.poste === "RC" || currentUser?.role_technique === "RC";
  const estObservateurLectureSeule =
    (currentUser?.poste === "PF_CCLS_TP" ||
      currentUser?.role_technique === "PF_CCLS_TP" ||
      currentUser?.poste === "MEMBRE_MINISTERE" ||
      currentUser?.role_technique === "MEMBRE_MINISTERE") &&
    currentUser?.role_technique !== "SUPER_ADMIN";

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-24">
      {/* Navigation normale - masquée à l'impression */}
      <div className="print:hidden">
        {estRc ? (
          <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md">
            <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link href="/espace-rc" className="flex items-center gap-2 text-white/90 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-xs font-bold">Retour Espace RC</span>
              </Link>
              <h1 className="text-sm font-extrabold">Surveillance Communautaire</h1>
              <div className="w-8"></div>
            </div>
            <div className="h-0.5 w-full flex">
              <span className="w-1/3 bg-[#008751]"></span>
              <span className="w-1/3 bg-[#FCD116]"></span>
              <span className="w-1/3 bg-[#E8112D]"></span>
            </div>
          </header>
        ) : (
          <AscqNav userProfile={currentUser} />
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
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-bold text-xs border border-emerald-200 transition-colors"
              >
                <img src="/icons/surveillance/surv-guide-simr.svg" alt="Guide SIMR" width={36} height={36} className="w-9 h-9 rounded-xl shrink-0" />
                <span>Guide SIMR</span>
              </Link>
              {!estObservateurLectureSeule && (
                <Link
                  href="/fiches/nouvelle"
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all"
                >
                  <img src="/icons/surveillance/surv-fiches.svg" alt="Nouvelle fiche" width={36} height={36} className="w-9 h-9 rounded-xl shrink-0" />
                  <span>Nouvelle fiche</span>
                </Link>
              )}
            </div>
          </div>

          {/* BARRE D'ACTION GLOBALE : EXPORT & IMPRESSION DU REGISTRE DE SURVEILLANCE */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/70 p-3 rounded-2xl">
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-[#005c30]" />
              <span>Registre filtré : <strong>{fichesFiltrees.length}</strong> fiche(s)</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setModalChoixModeleVierge(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 shadow-sm transition-all"
                title="Télécharger ou imprimer les modèles officiels vierges du Ministère (A4)"
              >
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                <span>Modèles Vierges Officiels</span>
              </button>

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

        {/* NOUVEAU MODULE OFFICIEL : PRISE EN CHARGE DES CAS EN COMMUNAUTÉ (iCCM) — Réservé ASCQ */}
        {!estRc && !estObservateurLectureSeule && (
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
        )}

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

        {/* Liste interne des sous-modules Fiches Surveillance en grille (ZÉRO défilement horizontal) */}
        <div className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Sous-modules Fiches Surveillance
            </span>
            <button
              type="button"
              onClick={() => { setFiltreType("TOUT"); setPage(1); }}
              className={`text-xs font-extrabold px-2.5 py-1 rounded-xl transition-all ${
                filtreType === "TOUT" ? "bg-[#005c30] text-white" : "text-[#005c30] bg-emerald-50 hover:bg-emerald-100"
              }`}
            >
              Toutes ({fichesActives.length})
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => { setFiltreType("REG"); setPage(1); }}
              className={`min-h-[82px] p-2.5 rounded-2xl text-xs font-extrabold border text-left flex items-center justify-between gap-2 transition-all ${
                filtreType === "REG" ? "bg-blue-700 text-white border-blue-800 shadow-sm" : "bg-slate-50 hover:bg-blue-50/60 text-slate-800 border-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <img src="/icons/surveillance/surv-registre-alertes.svg" alt="Registre des alertes" width={56} height={56} className="w-14 h-14 shrink-0 rounded-xl" />
                <span className="leading-tight">Registre des alertes</span>
              </span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                filtreType === "REG" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
              }`}>
                {registres.filter(r => !idsSupprimes.includes(r.id)).length}
              </span>
            </button>

            {!estObservateurLectureSeule && (
              <Link
                href="/fiches/alerte/nouvelle"
                className="min-h-[82px] p-2.5 rounded-2xl text-xs font-extrabold border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-[#005c30] text-left flex items-center justify-between gap-2 transition-all"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <img src="/icons/surveillance/surv-notifier-alerte.svg" alt="Notifier une alerte" width={56} height={56} className="w-14 h-14 shrink-0 rounded-xl" />
                  <span className="leading-tight">Notifier une alerte</span>
                </span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => { setFiltreType("ALR_A_CONFIRMER"); setPage(1); }}
              className={`min-h-[82px] p-2.5 rounded-2xl text-xs font-extrabold border text-left flex items-center justify-between gap-2 transition-all ${
                filtreType === "ALR_A_CONFIRMER" ? "bg-amber-600 text-white border-amber-700 shadow-sm" : "bg-slate-50 hover:bg-amber-50/70 text-slate-800 border-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <img src="/icons/surveillance/surv-alertes-a-confirmer.svg" alt="Alertes à confirmer" width={56} height={56} className="w-14 h-14 shrink-0 rounded-xl" />
                <span className="leading-tight">Alertes à confirmer</span>
              </span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                filtreType === "ALR_A_CONFIRMER" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-900"
              }`}>
                {nbAlertesAConfirmer}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setFiltreType("ALR_CONFIRMEES"); setPage(1); }}
              className={`min-h-[82px] p-2.5 rounded-2xl text-xs font-extrabold border text-left flex items-center justify-between gap-2 transition-all ${
                filtreType === "ALR_CONFIRMEES" ? "bg-[#005c30] text-white border-[#004724] shadow-sm" : "bg-slate-50 hover:bg-emerald-50/60 text-slate-800 border-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <img src="/icons/surveillance/surv-alertes-confirmees.svg" alt="Alertes déjà confirmées" width={56} height={56} className="w-14 h-14 shrink-0 rounded-xl" />
                <span className="leading-tight">Alertes déjà confirmées</span>
              </span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                filtreType === "ALR_CONFIRMEES" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
              }`}>
                {nbAlertesConfirmees}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setFiltreType("DEC"); setPage(1); }}
              className={`min-h-[82px] p-2.5 rounded-2xl text-xs font-extrabold border text-left flex items-center justify-between gap-2 transition-all ${
                filtreType === "DEC" ? "bg-purple-700 text-white border-purple-800 shadow-sm" : "bg-slate-50 hover:bg-purple-50/60 text-slate-800 border-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <img src="/icons/surveillance/surv-notification-deces.svg" alt="Notification de décès" width={56} height={56} className="w-14 h-14 shrink-0 rounded-xl" />
                <span className="leading-tight">Notification de décès</span>
              </span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                filtreType === "DEC" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"
              }`}>
                {deces.filter(d => !idsSupprimes.includes(d.id)).length}
              </span>
            </button>

            {!estRc && (
              <>
                <button
                  type="button"
                  onClick={() => { setFiltreType("INV"); setPage(1); }}
                  className={`min-h-[82px] p-2.5 rounded-2xl text-xs font-extrabold border text-left flex items-center justify-between gap-2 transition-all ${
                    filtreType === "INV" ? "bg-amber-700 text-white border-amber-800 shadow-sm" : "bg-slate-50 hover:bg-amber-50/60 text-slate-800 border-slate-200"
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <img src="/icons/surveillance/surv-fiche-investigation.svg" alt="Fiche d'investigation" width={56} height={56} className="w-14 h-14 shrink-0 rounded-xl" />
                    <span className="leading-tight">Fiche d&apos;investigation</span>
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                    filtreType === "INV" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                  }`}>
                    {investigations.filter(i => !idsSupprimes.includes(i.id)).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setFiltreType("RAP"); setPage(1); }}
                  className={`min-h-[82px] p-2.5 rounded-2xl text-xs font-extrabold border text-left flex items-center justify-between gap-2 transition-all col-span-2 sm:col-span-2 ${
                    filtreType === "RAP" ? "bg-indigo-700 text-white border-indigo-800 shadow-sm" : "bg-slate-50 hover:bg-indigo-50/60 text-slate-800 border-slate-200"
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <img src="/icons/surveillance/surv-rapport-hebdo.svg" alt="Rapport hebdomadaire" width={56} height={56} className="w-14 h-14 shrink-0 rounded-xl" />
                    <span className="leading-tight">Rapport hebdomadaire</span>
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                    filtreType === "RAP" ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-800"
                  }`}>
                    {rapports.filter(r => !idsSupprimes.includes(r.id)).length}
                  </span>
                </button>
              </>
            )}
          </div>
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

              const ficheIconPath =
                f.type === "DEC"
                  ? "/icons/surveillance/surv-notification-deces.svg"
                  : f.type === "REG"
                  ? "/icons/surveillance/surv-registre-alertes.svg"
                  : f.type === "INV"
                  ? "/icons/surveillance/surv-fiche-investigation.svg"
                  : f.type === "RAP"
                  ? "/icons/surveillance/surv-rapport-hebdo.svg"
                  : f.statut === "VALIDE" || f.resultat === "AVEREE"
                  ? "/icons/surveillance/surv-alertes-confirmees.svg"
                  : "/icons/surveillance/surv-alertes-a-confirmer.svg";

              return (
                <div
                  key={`${f.type}_${f.id}`}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all hover:shadow-md ${
                    f.estPrioritaire ? "border-red-300 bg-red-50/20" : "border-slate-200/80 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <img
                      src={ficheIconPath}
                      alt={f.typeLibelle}
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-2xl shrink-0 bg-[#F7F5EE]"
                    />
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
                        onClick={() => ouvrirApercuFidele(f, false)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-extrabold text-xs border border-emerald-300 shadow-sm active:scale-95 transition-all"
                        title="Aperçu fidèle vectoriel 100% conforme au PDF officiel de la DDS"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#005c30]" />
                        <span>Aperçu fidèle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => ouvrirApercuFidele(f, false)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FCD116] hover:bg-yellow-400 text-slate-900 font-extrabold text-xs shadow-sm active:scale-95 transition-all"
                        title="Télécharger le PDF officiel conforme DDS"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Télécharger le PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => ouvrirApercuFidele(f, false)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-300 shadow-sm transition-colors"
                        title="Imprimer au format officiel A4"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>Imprimer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => ouvrirApercuFidele(f, true)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-colors"
                        title="Télécharger ou imprimer le modèle officiel vierge"
                      >
                        <FileText className="w-3 h-3 text-slate-500" />
                        <span>PDF vierge</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFicheConsultation(f)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 font-medium text-xs border border-slate-200 transition-colors"
                        title="Consulter les détails terrain et métadonnées"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Détails</span>
                      </button>

                      {!estObservateurLectureSeule && (
                        <BoutonSuppressionSecurisee
                          titreElement={`${f.numero} — ${f.titre}`}
                          typeElement={`la fiche ${f.typeLibelle}`}
                          onConfirmerSuppression={() => handleSupprimerFiche(f)}
                          variant="compact"
                          label="Supprimer"
                        />
                      )}
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl border border-slate-200 shadow-2xl overflow-hidden my-auto print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none">
            
            {/* Barre d'outils de la modale (masquée à l'impression) */}
            <div className="bg-[#005c30] text-white p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-300 shrink-0" />
                <div>
                  <span className="text-xs font-mono font-bold block">{ficheConsultation.numero}</span>
                  <span className="text-[10px] text-emerald-100 font-semibold uppercase">Modèle Officiel Ministère de la Santé</span>
                </div>
              </div>

              {/* Sélecteur de version : Remplie avec données de terrain / Modèle vierge officiel */}
              <div className="flex items-center bg-black/25 p-1 rounded-xl gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModeVierge(false)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    !modeVierge ? "bg-white text-[#005c30] shadow" : "text-white/80 hover:text-white"
                  }`}
                >
                  Version Remplie
                </button>
                <button
                  type="button"
                  onClick={() => setModeVierge(true)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    modeVierge ? "bg-white text-[#005c30] shadow" : "text-white/80 hover:text-white"
                  }`}
                >
                  Modèle Vierge
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => ouvrirApercuFidele(ficheConsultation, modeVierge)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-400 text-slate-900 font-black text-xs shadow hover:bg-emerald-300 active:scale-95 transition-all"
                  title="Ouvrir l'Aperçu Fidèle Vectoriel DDS (Superposition 100% conforme sur PDF officiel)"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Aperçu fidèle PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => ouvrirApercuFidele(ficheConsultation, modeVierge)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#005c30] font-bold text-xs shadow hover:bg-emerald-50 active:scale-95 transition-all"
                  title="Imprimer ou enregistrer en PDF au format officiel A4"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer (A4)</span>
                </button>

                {!modeVierge && (
                  <button
                    type="button"
                    onClick={() => exporterFicheSurveillanceIndividuelleExcel(ficheConsultation)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FCD116] text-slate-900 font-black text-xs shadow hover:bg-yellow-400 active:scale-95 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setFicheConsultation(null);
                    setModeVierge(false);
                  }}
                  className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* BANDEAU ACTION DU SUPERVISEUR ASCQ EN TÊTE DE MODALE */}
            {!modeVierge && ficheConsultation && ["NOTIFIE", "EN_ATTENTE", ""].includes(ficheConsultation.statut || "") && (
              <div className="bg-amber-50 border-b-2 border-amber-300 p-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sticky top-0 z-20 shadow-xs print:hidden">
                <div className="flex items-center gap-2.5 text-xs text-amber-950">
                  <div className="p-1.5 rounded-xl bg-amber-500 text-white animate-pulse shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold block text-slate-900">
                      {ficheConsultation.type === "DEC" ? "Déclaration de Décès à Viser" : "Déclaration Terrain en Attente de Visa"}
                    </span>
                    <span className="text-[11px] text-amber-900">
                      En tant que Superviseur ASCQ, validez cette fiche pour lever le délai d'alerte réglementaire de 48h.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    disabled={validationEnCours}
                    onClick={() => handleValiderOuInvaliderNotification("VALIDER")}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-black text-xs text-white bg-[#005c30] hover:bg-[#004724] shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{validationEnCours ? "Validation..." : "✅ Valider & Viser officiellement"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={validationEnCours}
                    onClick={() => handleValiderOuInvaliderNotification("INVALIDER")}
                    className="px-3 py-2 rounded-xl font-bold text-xs text-red-700 bg-white border border-red-200 hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Rejeter</span>
                  </button>
                </div>
              </div>
            )}

            {!modeVierge && ficheConsultation && ficheConsultation.statut === "VALIDE" && (
              <div className="bg-emerald-50 border-b border-emerald-200 p-2.5 sm:px-6 flex items-center justify-between gap-2 text-xs text-emerald-900 font-bold print:hidden">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cette fiche est officiellement visée et validée par le Superviseur ASCQ. Alerte 48h levée.</span>
                </div>
                <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Statut : Validé ✓
                </span>
              </div>
            )}

            {/* Contenu officiel de la fiche — Typiquement la version officielle conforme DDS */}
            <div className="p-3 sm:p-6 print:p-0 text-slate-900 bg-white overflow-x-auto">
              {ficheConsultation.type === "DEC" && (
                <FicheOfficielleNotificationDeces
                  data={mapDecesData(ficheConsultation)}
                  isVierge={modeVierge}
                />
              )}
              {ficheConsultation.type === "ALR" && (
                <FicheOfficielleNotificationAlerte
                  data={mapAlerteData(ficheConsultation)}
                  isVierge={modeVierge}
                />
              )}
              {ficheConsultation.type === "REG" && (
                <FicheOfficielleRegistreAlertes
                  data={mapRegistreData(ficheConsultation)}
                  isVierge={modeVierge}
                />
              )}
              {ficheConsultation.type === "INV" && (
                <FicheOfficielleInvestigationEvenement
                  data={mapInvestigationData(ficheConsultation)}
                  isVierge={modeVierge}
                />
              )}
              {ficheConsultation.type === "RAP" && (
                <FicheOfficielleRapportHebdoSurveillance
                  data={mapRapportData(ficheConsultation)}
                  isVierge={modeVierge}
                />
              )}
              {!["DEC", "ALR", "REG", "INV", "RAP"].includes(ficheConsultation.type) && (
                <FicheOfficielleNotificationAlerte
                  data={mapAlerteData(ficheConsultation)}
                  isVierge={modeVierge}
                />
              )}
            </div>

            {/* Section de gestion & validation (Masquée à l'impression) */}
            <div className="p-4 sm:p-6 pt-0 space-y-4 print:hidden border-t border-slate-100 bg-slate-50/50">
              
              {/* CADRE OFFICIEL DE VALIDATION SUPERVISEUR ASCQ (Masqué à l'impression) */}
              {!modeVierge && (currentUser?.poste === "ASCQ" || currentUser?.role_technique === "SUPER_ADMIN" || currentUser?.role_technique === "ASCQ" || currentUser?.role_technique === "REPRESENTANT_COMMUNAL") && (
                <div className="bg-emerald-50/80 border-2 border-[#005c30] rounded-3xl p-4 sm:p-5 space-y-3 mt-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#005c30]" />
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                        Validation & Décision Superviseur ASCQ
                      </h4>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      ficheConsultation.statut === "VALIDE"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : ficheConsultation.statut === "INVALIDE" || ficheConsultation.statut === "CLOTURE"
                        ? "bg-red-100 text-red-800 border border-red-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}>
                      Statut actuel : {ficheConsultation.statut || "NOTIFIÉ"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    En tant que superviseur ASCQ d'arrondissement, validez ou invalidez cette fiche de surveillance transmise par votre Relais Communautaire (<strong>{ficheConsultation.notificateur}</strong>).
                  </p>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Observations / Motifs du superviseur (facultatif)</label>
                    <input
                      type="text"
                      placeholder="Ex: Événement vérifié sur le terrain à Gangban, conforme au protocole SIMR..."
                      value={observationValidation}
                      onChange={(e) => setObservationValidation(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                    />
                  </div>

                  {msgValidation && (
                    <div className={`p-2.5 rounded-xl text-xs font-bold ${
                      msgValidation.error ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    }`}>
                      {msgValidation.text}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      disabled={validationEnCours}
                      onClick={() => handleValiderOuInvaliderNotification("VALIDER")}
                      className="flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs text-white bg-[#005c30] hover:bg-[#004724] shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{validationEnCours ? "Validation..." : "✅ Valider officiellement cette déclaration"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={validationEnCours}
                      onClick={() => handleValiderOuInvaliderNotification("INVALIDER")}
                      className="py-2.5 px-4 rounded-xl font-bold text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      <span>{validationEnCours ? "Traitement..." : "❌ Invalider / Rejeter"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Lien optionnel vers la page complète alerte si ALR */}
              {!modeVierge && ficheConsultation.type === "ALR" && ficheConsultation.id !== "modele-vierge" && (
                <div className="pt-2 print:hidden text-center">
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
      {/* MODALE DE SÉLECTION D'UN MODÈLE OFFICIEL VIERGE DU MINISTÈRE (A4)         */}
      {/* ========================================================================= */}
      {modalChoixModeleVierge && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#005c30]" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Modèles Officiels Vierges (A4)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalChoixModeleVierge(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Sélectionnez le formulaire officiel conforme aux exigences du Ministère de la Santé à afficher, télécharger ou imprimer vierge pour le travail de terrain :
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => ouvrirModeleVierge("REG", "Registre des alertes et rumeurs communautaires")}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-[#005c30] hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800">REG</span>
                    <strong className="text-xs text-slate-900">Registre des alertes et rumeurs communautaires</strong>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">À remplir par le Relais Communautaire (RC) — 15 lignes & codes SIMR</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#005c30] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => ouvrirModeleVierge("ALR", "Fiche de notification des alertes communautaires")}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-[#005c30] hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">ALR</span>
                    <strong className="text-xs text-slate-900">Fiche de notification des alertes communautaires</strong>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">À remplir par l'ASCQ — 12 rubriques officielles</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#005c30] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => ouvrirModeleVierge("DEC", "Formulaire de notification des décès en communauté")}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-[#005c30] hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-800">DEC</span>
                    <strong className="text-xs text-slate-900">Formulaire de notification des décès en communauté</strong>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Sections 1, 2, 3 officielles avec bandeaux saumon #FCE4D6 et codes CIM-10</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#005c30] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => ouvrirModeleVierge("INV", "Fiche d’investigation des événements de santé")}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-[#005c30] hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800">INV</span>
                    <strong className="text-xs text-slate-900">Fiche d'investigation des événements de santé (ASCQ)</strong>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Version V14.11.2025 avec tableau officiel cas/décès par tranche d'âge</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#005c30] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => ouvrirModeleVierge("RAP", "Rapport hebdomadaire de la surveillance à base communautaire")}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-[#005c30] hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800">RAP</span>
                    <strong className="text-xs text-slate-900">Rapport hebdomadaire de surveillance communautaire</strong>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Version V29.05.2025 avec tableaux récapitulatifs et lignes pointillées</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#005c30] group-hover:translate-x-0.5 transition-all" />
              </button>
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

      {/* MODALE D'APERÇU FIDÈLE VECTORIEL SUR PDF OFFICIEL */}
      {ficheApercuPdf && (
        <ModalApercuFidelePdf
          isOpen={Boolean(ficheApercuPdf)}
          onClose={() => setFicheApercuPdf(null)}
          typeFiche={ficheApercuPdf.type}
          donnees={ficheApercuPdf.donnees}
          currentUser={currentUser}
          titre={ficheApercuPdf.titre}
          isViergeInitial={ficheApercuPdf.isVierge}
        />
      )}

    </div>
  );
}