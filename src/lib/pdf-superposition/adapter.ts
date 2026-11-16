/**
 * Adaptateur universel : convertit les objets de données bruts de la base Supabase
 * ou de l'état de consultation en dictionnaire de données normalisé pour la superposition PDF.
 */

export function adapterDonneesFicheVersPdf(type: string, raw: any): Record<string, any> {
  const d = raw || {};
  const r = d.rawData || d;

  switch (type) {
    case "REG": {
      // Si une liste d'alertes est fournie (registre complet), on l'utilise
      const lignesSource = Array.isArray(d.lignes)
        ? d.lignes
        : Array.isArray(r.lignes)
        ? r.lignes
        : [
            {
              numero: 1,
              type_code: r.type_code || r.titre || "Alerte communautaire",
              date_survenue: r.date_survenue || d.date || "",
              lieu_detection: d.village || r.village || "",
              nb_personnes_touchees: r.nb_personnes_touchees ?? 1,
              nb_personnes_decedees: r.nb_personnes_decedees ?? r.nb_personnes_mortes ?? 0,
              mesure_prise: r.mesure_prise || r.mesures_prises || "Transmis au superviseur ASCQ"
            }
          ];

      const lignesNormalisees = lignesSource.map((item: any, idx: number) => ({
        numero: item.numero || idx + 1,
        type_code: item.type_code || item.typeCode || item.titre || "",
        date_survenue: item.date_survenue || item.dateSurvenue || item.date || "",
        lieu_detection: item.lieu_detection || item.lieuDetection || item.village || "",
        nb_personnes_touchees: item.nb_personnes_touchees ?? item.nbTouchees ?? 0,
        nb_personnes_decedees: item.nb_personnes_decedees ?? item.nbDecedes ?? 0,
        mesure_prise: item.mesure_prise || item.mesurePrise || ""
      }));

      return {
        zone_sanitaire: r.zone_sanitaire_nom || r.zone_sanitaire || d.departement || "",
        commune: d.commune || r.commune || "",
        arrondissement: d.arrondissement || r.arrondissement || "",
        centre_sante: r.centre_sante || `CS ${d.arrondissement || ""}`,
        village: d.village || r.village || "",
        mois: r.mois || (d.date ? d.date.split("-")[1] : ""),
        annee: String(d.annee || r.annee || new Date().getFullYear()),
        lignes: lignesNormalisees
      };
    }

    case "ALR": {
      const decesNb = Number(r.nb_personnes_mortes || r.nbDeces || 0);
      const hasDeces = decesNb > 0 || r.deces_presence || r.decesPresence === "OUI";
      return {
        point_focal_nom: r.notificateur_nom_complet || d.notificateur || "",
        telephone: r.notificateur_telephone || d.notificateurTel || "",
        arrondissement: d.arrondissement || r.arrondissement || "",
        commune: d.commune || r.commune || "",
        zone_sanitaire: r.zone_sanitaire_nom || r.zone_sanitaire || d.departement || "",
        date_notification: r.date_notification || d.date || "",
        type_maladie: `${d.titre || r.type_alerte_nom || ""}${r.description_signes ? " — " + r.description_signes : ""}`,
        date_survenue: r.date_survenue ? `${r.date_survenue} ${r.heure_survenue || ""}`.trim() : "",
        date_detection: r.date_detection ? `${r.date_detection} ${r.heure_detection || ""}`.trim() : "",
        lieu_provenance: `${d.village || r.village || ""}${r.adresse_domicile ? " (" + r.adresse_domicile + ")" : ""}`,
        nb_personnes_touchees: r.nb_personnes_touchees ?? r.nbPersonnesTouchees ?? 1,
        deces_presence_nb: hasDeces ? `OUI (${decesNb} décès)` : "NON",
        animaux_impliques: r.animaux_impliques ? "OUI" : "NON",
        evenement_en_cours: r.evenement_en_cours !== false ? "OUI" : "NON",
        mesures_prises: r.mesures_prises || r.actions_immediates || "",
        signature_nom: r.notificateur_nom_complet || d.notificateur || ""
      };
    }

    case "DEC": {
      const defuntNom = r.defunt_nom_prenom || `${r.nom_defunt || ""} ${r.prenoms_defunt || ""}`.trim();
      return {
        annee: String(d.annee || r.annee || new Date().getFullYear()),
        semaine_epidemio: String(d.semaine || r.semaine_epidemio || ""),
        mois: r.mois || (d.date ? d.date.split("-")[1] : ""),
        npi_defunt: r.npi_defunt || r.defunt_npi || "",
        numero_deces: d.numero || r.numero_deces || "",
        departement: d.departement || r.departement || "",
        zone_sanitaire: r.zone_sanitaire_nom || r.zone_sanitaire || d.departement || "",
        commune: d.commune || r.commune || "",
        arrondissement: d.arrondissement || r.arrondissement || "",
        village: d.village || r.village || "",
        numero_grappe: r.numero_grappe || r.grappe || "",
        adresse: r.adresse_domicile || r.adresse || "",
        nom_prenoms_defunt: defuntNom,
        nom_parent: r.nom_parent || "",
        telephone_parent: r.telephone_parent || "",
        date_naissance: r.date_naissance || "",
        age_annees: r.age_annees ?? r.age_valeur ?? "",
        sexe: (r.sexe || "").toUpperCase() === "M" ? "M" : (r.sexe || "").toUpperCase() === "F" ? "F" : "",
        gps_longitude: r.gps_longitude || r.longitude || "",
        gps_latitude: r.gps_latitude || r.latitude || "",
        type_deces_code: r.type_deces_code || "",
        date_deces: r.date_deces || d.date || "",
        date_notification: r.date_notification || (r.created_at ? r.created_at.split("T")[0] : d.date || ""),
        date_saisie: r.created_at ? r.created_at.split("T")[0] : d.date || "",
        lieu_deces_code: r.lieu_deces_code || "",
        circonstances_code: r.circonstance_code || r.circonstances_code || "",
        cause_probable_cim10: r.cause_probable_cim10 || r.cause_probable || r.type_deces_nom || "",
        notificateur_nom: r.notificateur_nom_complet || d.notificateur || "",
        notificateur_titre: r.notificateur_titre || d.notificateurTitre || "ASCQ",
        notificateur_structure: r.notificateur_structure || `Arrondissement de ${d.arrondissement || ""}`,
        notificateur_telephone: r.notificateur_telephone || d.notificateurTel || "",
        signature_date: `Fait le ${d.date || new Date().toLocaleDateString('fr-FR')}`
      };
    }

    case "INV": {
      const c = r.cas || {};
      const dec = r.deces || {};
      return {
        departement: d.departement || r.departement || "",
        zone_sanitaire: r.zone_sanitaire_nom || r.zone_sanitaire || d.departement || "",
        commune: d.commune || r.commune || "",
        arrondissement: d.arrondissement || r.arrondissement || "",
        village: d.village || r.village || "",
        relais_nom: r.relais_nom_prenom || r.relais_nom || "",
        relais_tel: r.relais_telephone || "",
        ascq_nom: r.investigateur_nom || d.notificateur || "",
        ascq_tel: r.investigateur_telephone || d.notificateurTel || "",
        gps: r.coordonnees_gps || (r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : ""),
        evenement_avere: r.evenement_avere ? "OUI" : "NON",
        source_info: r.source_information || "Signalement communautaire",
        maladie_evenement: r.type_alerte_nom || d.titre || "",
        description_evenement: r.description_evenement || r.description || "",
        circonstances_survenue: r.circonstances_survenue || "",
        date_survenue: r.date_survenue || "",
        date_notification: r.date_notification || "",
        date_investigation: r.date_investigation || d.date || "",
        cas_0_11m_m: r.cas_0_11m_m ?? c.cas0_11m_m ?? 0,
        cas_0_11m_f: r.cas_0_11m_f ?? c.cas0_11m_f ?? 0,
        cas_1_5a_m: r.cas_1_5a_m ?? c.cas1_5a_m ?? 0,
        cas_1_5a_f: r.cas_1_5a_f ?? c.cas1_5a_f ?? 0,
        cas_6_15a_m: r.cas_6_15a_m ?? c.cas6_15a_m ?? 0,
        cas_6_15a_f: r.cas_6_15a_f ?? c.cas6_15a_f ?? 0,
        cas_plus_15a_m: r.cas_plus_15a_m ?? c.casPlus15a_m ?? 0,
        cas_plus_15a_f: r.cas_plus_15a_f ?? c.casPlus15a_f ?? 0,
        deces_0_11m_m: r.deces_0_11m_m ?? dec.deces0_11m_m ?? 0,
        deces_0_11m_f: r.deces_0_11m_f ?? dec.deces0_11m_f ?? 0,
        deces_1_5a_m: r.deces_1_5a_m ?? dec.deces1_5a_m ?? 0,
        deces_1_5a_f: r.deces_1_5a_f ?? dec.deces1_5a_f ?? 0,
        deces_6_15a_m: r.deces_6_15a_m ?? dec.deces6_15a_m ?? 0,
        deces_6_15a_f: r.deces_6_15a_f ?? dec.deces6_15a_f ?? 0,
        deces_plus_15a_m: r.deces_plus_15a_m ?? dec.decesPlus15a_m ?? 0,
        deces_plus_15a_f: r.deces_plus_15a_f ?? dec.decesPlus15a_f ?? 0,
        synthese_actions: r.synthese_actions || r.actions_menees || "",
        signature_investigateurs: r.investigateur_nom || d.notificateur || ""
      };
    }

    case "RAP": {
      const dateDeb = r.date_debut_semaine || d.date || "";
      const dateFin = r.date_fin_semaine || "";
      let debJ = "", debM = "";
      if (dateDeb) {
        const p = dateDeb.includes("-") ? dateDeb.split("-") : dateDeb.split("/");
        debJ = p[2] || p[0] || "";
        debM = p[1] || "";
      }
      let finJ = "", finM = "", finA = "";
      if (dateFin) {
        const p = dateFin.includes("-") ? dateFin.split("-") : dateFin.split("/");
        finJ = p[2] || p[0] || "";
        finM = p[1] || "";
        finA = p[0].length === 4 ? p[0] : p[2] || "";
      }

      return {
        departement: d.departement || r.departement || "",
        zone_sanitaire: r.zone_sanitaire_nom || r.zone_sanitaire || d.departement || "",
        commune: d.commune || r.commune || "",
        arrondissement: d.arrondissement || r.arrondissement || "",
        village: d.village || r.village || "",
        semaine_num: d.semaine || r.semaine_epidemio || r.semaineNum || "",
        date_debut_jour: debJ,
        date_debut_mois: debM,
        date_fin_jour: finJ,
        date_fin_mois: finM,
        date_fin_annee: finA,
        alertes_detectees: r.alertes_detectees ?? 0,
        personnes_touchees: r.personnes_touchees ?? 0,
        personnes_decedees: r.personnes_decedees ?? 0,
        alertes_verifiees_48h: r.alertes_verifiees_48h ?? 0,
        alertes_averees: r.alertes_averees ?? 0,
        deces_maternels: r.deces_maternels ?? 0,
        deces_neonatals: r.deces_neonatals ?? 0,
        deces_infantiles: r.deces_infantiles ?? 0,
        deces_infanto_juveniles: r.deces_infanto_juveniles ?? 0,
        deces_plus_5_ans: r.deces_plus_5_ans ?? 0,
        actions_menees: r.actions_menees || r.actions || "",
        signature_rapporteur: r.rapporteur_nom || d.notificateur || ""
      };
    }

    default:
      return r;
  }
}
