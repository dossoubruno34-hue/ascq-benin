/**
 * Adaptateur universel : convertit les objets de données bruts de la base Supabase
 * ou de l'état de consultation en dictionnaire de données normalisé pour la superposition PDF.
 *
 * RÈGLE STRICTE N°6 :
 * Ne jamais écrire une valeur par défaut ("Zone - Sanitaire", "ASCQ", "1__", etc.).
 * Un champ vide reste vide. Aucun texte automatique dans les observations.
 */

function splitDate(dateStr?: string | null): { j: string; m: string; a: string } {
  if (!dateStr || typeof dateStr !== "string") return { j: "", m: "", a: "" };
  const clean = dateStr.trim();
  if (!clean) return { j: "", m: "", a: "" };

  const parts = clean.includes("-") ? clean.split("-") : clean.split("/");
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return { j: parts[2].padStart(2, "0"), m: parts[1].padStart(2, "0"), a: parts[0] };
    } else {
      // DD/MM/YYYY
      return { j: parts[0].padStart(2, "0"), m: parts[1].padStart(2, "0"), a: parts[2] };
    }
  }
  return { j: "", m: "", a: "" };
}

/**
 * Extrait proprement le Nom & Prénom du notificateur et son Titre ("ASCQ" ou "RC")
 */
function extraireNomEtTitre(
  rawNom?: string | null,
  rawTitre?: string | null,
  fallbackRole?: string | null
): { nom: string; titre: string } {
  let nom = String(rawNom || "").trim();
  let titre = String(rawTitre || "").trim().toUpperCase();

  // Si le nom contient un préfixe du type "ASCQ : Jean Dossou" ou "RC : Remy Gbede"
  const prefixMatch = nom.match(/^(ASCQ|RC|RELAIS|RELAIS COMMUNAUTAIRE)\s*:\s*(.+)$/i);
  if (prefixMatch) {
    const prefixRole = prefixMatch[1].toUpperCase();
    nom = prefixMatch[2].trim();
    if (!titre) {
      titre = prefixRole.startsWith("R") ? "RC" : "ASCQ";
    }
  }

  // Si le nom vaut juste "ASCQ" ou "RC" ou "Relais Communautaire" (ancien fallback), on le vide ou cherche mieux
  if (/^(ASCQ|RC|RELAIS COMMUNAUTAIRE|RAPPORTEUR ASCQ)$/i.test(nom)) {
    if (!titre) {
      titre = nom.toUpperCase().startsWith("R") ? "RC" : "ASCQ";
    }
    nom = "";
  }

  // Normalisation stricte du titre en "ASCQ" ou "RC"
  const roleSource = (titre || String(fallbackRole || "")).toUpperCase();
  let titreNormalise = "";
  if (roleSource.includes("RC") || roleSource.includes("RELAIS")) {
    titreNormalise = "RC";
  } else if (
    roleSource.includes("ASCQ") ||
    roleSource.includes("ADMIN") ||
    roleSource.includes("REPRESENTANT")
  ) {
    titreNormalise = "ASCQ";
  } else if (titre) {
    titreNormalise = titre;
  }

  return { nom, titre: titreNormalise };
}

export function adapterDonneesFicheVersPdf(type: string, raw: any): Record<string, any> {
  const d = raw || {};
  const r = d.rawData || d;

  switch (type) {
    case "REG": {
      const lignesSource = Array.isArray(d.lignes)
        ? d.lignes
        : Array.isArray(r.lignes)
        ? r.lignes
        : [];

      const lignesNormalisees = lignesSource.map((item: any, idx: number) => ({
        numero: item.numero || idx + 1,
        type_code: item.type_code || item.typeCode || item.code || item.titre || "",
        date_survenue: item.date_survenue || item.dateSurvenue || item.date || "",
        lieu_detection: item.lieu_detection || item.lieuDetection || item.village || "",
        nb_personnes_touchees: item.nb_personnes_touchees ?? item.nbTouchees ?? "",
        nb_personnes_decedees: item.nb_personnes_decedees ?? item.nbDecedes ?? "",
        mesure_prise: item.mesure_prise || item.mesurePrise || ""
      }));

      const regNotif = extraireNomEtTitre(
        r.relais_nom_complet || r.notificateur_nom_complet || d.signature_nom || d.notificateur,
        r.notificateur_titre || d.notificateurTitre,
        "RC"
      );

      return {
        zone_sanitaire: r.zone_sanitaire_nom || r.zone_sanitaire || "",
        commune: d.commune || r.commune || "",
        arrondissement: d.arrondissement || r.arrondissement || "",
        centre_sante: r.centre_sante || r.centre_sante_nom || "",
        village: d.village || r.village || r.village_nom || "",
        mois: r.mois ? String(r.mois) : d.date ? splitDate(d.date).m : "",
        annee: d.annee ? String(d.annee) : r.annee ? String(r.annee) : d.date ? splitDate(d.date).a : "",
        lignes: lignesNormalisees,
        signature_nom: regNotif.nom,
        signature_tactile: r.signature_tactile || d.signature_tactile || d.signature || null
      };
    }

    case "ALR": {
      const notDate = splitDate(r.date_notification || d.date);
      const decesNb = Number(r.nb_personnes_mortes || r.nbDeces || 0);
      const hasDeces = decesNb > 0 || r.deces_presence === true || r.decesPresence === "OUI";

      let decesTxt = "";
      if (hasDeces) {
        decesTxt = decesNb > 0 ? `OUI (${decesNb})` : "OUI";
      } else if (r.deces_presence === false || r.decesPresence === "NON") {
        decesTxt = "NON";
      }

      let animTxt = "";
      if (r.animaux_impliques === true || r.animaux_impliques === "OUI") {
        animTxt = "OUI";
      } else if (r.animaux_impliques === false || r.animaux_impliques === "NON") {
        animTxt = "NON";
      }

      let encoursTxt = "";
      if (r.evenement_en_cours === true || r.evenement_en_cours === "OUI") {
        encoursTxt = "OUI";
      } else if (r.evenement_en_cours === false || r.evenement_en_cours === "NON") {
        encoursTxt = "NON";
      }

      const survDateStr = r.date_survenue ? `${r.date_survenue}${r.heure_survenue ? " " + r.heure_survenue : ""}` : "";
      const detDateStr = r.date_detection ? `${r.date_detection}${r.heure_detection ? " " + r.heure_detection : ""}` : "";
      const alrNotif = extraireNomEtTitre(
        r.notificateur_nom_complet || d.signature_nom || d.notificateur,
        r.notificateur_titre || d.notificateurTitre
      );

      return {
        point_focal_nom: alrNotif.nom,
        telephone: r.notificateur_telephone || d.notificateurTel || "",
        arrondissement: d.arrondissement || r.arrondissement || "",
        commune: d.commune || r.commune || "",
        zone_sanitaire: r.zone_sanitaire_nom || r.zone_sanitaire || "",
        date_notification_j: notDate.j,
        date_notification_m: notDate.m,
        date_notification_a: notDate.a,
        type_maladie: `${d.titre || r.type_alerte_nom || ""}${r.description_signes ? " — " + r.description_signes : ""}`.trim(),
        date_heure_survenue: survDateStr,
        date_heure_detection: detDateStr,
        lieu_provenance: `${d.village || r.village || ""}${r.adresse_domicile ? " (" + r.adresse_domicile + ")" : ""}`.trim(),
        nb_personnes_touchees: r.nb_personnes_touchees ?? r.nbPersonnesTouchees ?? "",
        deces_presence_nb: decesTxt,
        animaux_impliques: animTxt,
        evenement_en_cours: encoursTxt,
        mesures_prises: r.mesures_prises || r.actions_immediates || "",
        signature_nom: alrNotif.nom,
        signature_tactile: r.signature_tactile || d.signature_tactile || d.signature || null
      };
    }

    case "DEC": {
      const defNom = r.defunt_nom_prenom || d.nom_prenoms_defunt || `${r.nom_defunt || ""} ${r.prenoms_defunt || ""}`.trim();
      const naissDate = splitDate(r.date_naissance || d.date_naissance);
      const decDate = splitDate(r.date_deces || d.date);
      const notDate = splitDate(r.date_notification || d.date);
      const saiDate = splitDate(r.date_saisie || (r.created_at ? r.created_at.split("T")[0] : d.date));

      let faitLeStr = "";
      if (d.date) {
        faitLeStr = `Fait le ${d.date}`;
      } else if (r.date_notification) {
        faitLeStr = `Fait le ${r.date_notification}`;
      }

      const decNotif = extraireNomEtTitre(
        r.notificateur_nom_complet || r.notif_nom || d.notificateur_nom_complet || d.signature_nom || d.notificateur,
        r.notificateur_titre || r.notif_titre || d.notificateurTitre || d.notificateur_titre
      );

      let ageAns = r.age_annees !== undefined && r.age_annees !== null ? String(r.age_annees) : "";
      let ageMois = r.age_mois !== undefined && r.age_mois !== null ? String(r.age_mois) : "";
      let ageJours = r.age_jours !== undefined && r.age_jours !== null ? String(r.age_jours) : "";
      if (!ageAns && !ageMois && !ageJours && r.age_valeur !== undefined && r.age_valeur !== null) {
        const u = String(r.age_unite || "ANS").toUpperCase();
        if (u.startsWith("M")) ageMois = String(r.age_valeur);
        else if (u.startsWith("J")) ageJours = String(r.age_valeur);
        else ageAns = String(r.age_valeur);
      }

      return {
        annee: d.annee ? String(d.annee) : r.annee ? String(r.annee) : "",
        semaine: d.semaine ? String(d.semaine) : r.semaine_epidemio ? String(r.semaine_epidemio) : "",
        mois: r.mois ? String(r.mois) : d.date ? splitDate(d.date).m : "",
        npi: r.npi_defunt || r.npiDefunt || r.defunt_npi || d.npi_defunt || "",
        num_deces: d.numero || r.numero_deces || "",
        departement: d.departement || r.departement || "",
        zone_sanitaire: r.zone_sanitaire_nom || r.zone_sanitaire || "",
        commune: d.commune || r.commune || "",
        arrondissement: d.arrondissement || r.arrondissement || "",
        village: d.village || r.village || r.village_nom || "",
        grappe: r.numero_grappe || r.numeroGrappe || r.grappe || d.numero_grappe || "",
        adresse: r.adresse_domicile || r.adresse || "",
        nom_defunt: defNom,
        parent_nom: r.nom_parent || "",
        parent_tel: r.telephone_parent || "",
        naiss_j: naissDate.j,
        naiss_m: naissDate.m,
        naiss_a: naissDate.a,
        age_ans: ageAns,
        age_mois: ageMois,
        age_jours: ageJours,
        sexe: (r.sexe || "").toUpperCase() === "M" ? "M" : (r.sexe || "").toUpperCase() === "F" ? "F" : "",
        longitude: r.gps_longitude !== undefined && r.gps_longitude !== null ? String(r.gps_longitude) : (r.longitude ? String(r.longitude) : ""),
        latitude: r.gps_latitude !== undefined && r.gps_latitude !== null ? String(r.gps_latitude) : (r.latitude ? String(r.latitude) : ""),
        type_deces: r.type_deces_code !== undefined && r.type_deces_code !== null ? String(r.type_deces_code) : "",
        dec_j: decDate.j,
        dec_m: decDate.m,
        dec_a: decDate.a,
        not_j: notDate.j,
        not_m: notDate.m,
        not_a: notDate.a,
        sai_j: saiDate.j,
        sai_m: saiDate.m,
        sai_a: saiDate.a,
        lieu: r.lieu_deces_code !== undefined && r.lieu_deces_code !== null ? String(r.lieu_deces_code) : "",
        circ: r.circonstance_code !== undefined && r.circonstance_code !== null ? String(r.circonstance_code) : (r.circonstances_code ? String(r.circonstances_code) : ""),
        cause: r.cause_probable_cim10 || r.cause_probable || r.type_deces_nom || "",
        notif_nom: decNotif.nom,
        notif_titre: decNotif.titre,
        notif_struct: r.notificateur_structure || (d.arrondissement ? `Arrondissement de ${d.arrondissement}` : ""),
        notif_tel: r.notificateur_telephone || d.notificateurTel || "",
        fait_le: faitLeStr,
        signature_nom: decNotif.nom,
        signature_tactile: r.signature_tactile || d.signature_tactile || d.signature || null
      };
    }

    case "INV": {
      const c = r.cas || {};
      const dec = r.deces || {};
      const invNotif = extraireNomEtTitre(
        r.investigateur_nom || d.signature_nom || d.notificateur,
        "ASCQ"
      );
      return {
        departement: d.departement || r.departement || "",
        zone_sanitaire: r.zone_sanitaire_nom || r.zone_sanitaire || "",
        commune: d.commune || r.commune || "",
        arrondissement: d.arrondissement || r.arrondissement || "",
        village: d.village || r.village || "",
        relais_nom: r.relais_nom_prenom || r.relais_nom || "",
        relais_tel: r.relais_telephone || "",
        ascq_nom: invNotif.nom,
        ascq_tel: r.investigateur_telephone || d.notificateurTel || "",
        gps: r.coordonnees_gps || (r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : ""),
        evenement_avere: r.evenement_avere === true ? "OUI" : (r.evenement_avere === false ? "NON" : ""),
        source_info: r.source_information || "",
        maladie_evenement: r.type_alerte_nom || d.titre || "",
        description_evenement: r.description_evenement || r.description || "",
        circonstances_survenue: r.circonstances_survenue || "",
        date_survenue: r.date_survenue || "",
        date_notification: r.date_notification || "",
        date_investigation: r.date_investigation || d.date || "",
        cas_total: r.cas_total !== undefined && r.cas_total !== null ? String(r.cas_total) : "",
        cas_0_11m_m: r.cas_0_11m_m !== undefined && r.cas_0_11m_m !== null ? String(r.cas_0_11m_m) : (c.cas0_11m_m !== undefined ? String(c.cas0_11m_m) : ""),
        cas_0_11m_f: r.cas_0_11m_f !== undefined && r.cas_0_11m_f !== null ? String(r.cas_0_11m_f) : (c.cas0_11m_f !== undefined ? String(c.cas0_11m_f) : ""),
        cas_1_5a_m: r.cas_1_5a_m !== undefined && r.cas_1_5a_m !== null ? String(r.cas_1_5a_m) : (c.cas1_5a_m !== undefined ? String(c.cas1_5a_m) : ""),
        cas_1_5a_f: r.cas_1_5a_f !== undefined && r.cas_1_5a_f !== null ? String(r.cas_1_5a_f) : (c.cas1_5a_f !== undefined ? String(c.cas1_5a_f) : ""),
        cas_6_15a_m: r.cas_6_15a_m !== undefined && r.cas_6_15a_m !== null ? String(r.cas_6_15a_m) : (c.cas6_15a_m !== undefined ? String(c.cas6_15a_m) : ""),
        cas_6_15a_f: r.cas_6_15a_f !== undefined && r.cas_6_15a_f !== null ? String(r.cas_6_15a_f) : (c.cas6_15a_f !== undefined ? String(c.cas6_15a_f) : ""),
        cas_plus_15a_m: r.cas_plus_15a_m !== undefined && r.cas_plus_15a_m !== null ? String(r.cas_plus_15a_m) : (c.casPlus15a_m !== undefined ? String(c.casPlus15a_m) : ""),
        cas_plus_15a_f: r.cas_plus_15a_f !== undefined && r.cas_plus_15a_f !== null ? String(r.cas_plus_15a_f) : (c.casPlus15a_f !== undefined ? String(c.casPlus15a_f) : ""),
        deces_total: r.deces_total !== undefined && r.deces_total !== null ? String(r.deces_total) : "",
        deces_0_11m_m: r.deces_0_11m_m !== undefined && r.deces_0_11m_m !== null ? String(r.deces_0_11m_m) : (dec.deces0_11m_m !== undefined ? String(dec.deces0_11m_m) : ""),
        deces_0_11m_f: r.deces_0_11m_f !== undefined && r.deces_0_11m_f !== null ? String(r.deces_0_11m_f) : (dec.deces0_11m_f !== undefined ? String(dec.deces0_11m_f) : ""),
        deces_1_5a_m: r.deces_1_5a_m !== undefined && r.deces_1_5a_m !== null ? String(r.deces_1_5a_m) : (dec.deces1_5a_m !== undefined ? String(dec.deces1_5a_m) : ""),
        deces_1_5a_f: r.deces_1_5a_f !== undefined && r.deces_1_5a_f !== null ? String(r.deces_1_5a_f) : (dec.deces1_5a_f !== undefined ? String(dec.deces1_5a_f) : ""),
        deces_6_15a_m: r.deces_6_15a_m !== undefined && r.deces_6_15a_m !== null ? String(r.deces_6_15a_m) : (dec.deces6_15a_m !== undefined ? String(dec.deces6_15a_m) : ""),
        deces_6_15a_f: r.deces_6_15a_f !== undefined && r.deces_6_15a_f !== null ? String(r.deces_6_15a_f) : (dec.deces6_15a_f !== undefined ? String(dec.deces6_15a_f) : ""),
        deces_plus_15a_m: r.deces_plus_15a_m !== undefined && r.deces_plus_15a_m !== null ? String(r.deces_plus_15a_m) : (dec.decesPlus15a_m !== undefined ? String(dec.decesPlus15a_m) : ""),
        deces_plus_15a_f: r.deces_plus_15a_f !== undefined && r.deces_plus_15a_f !== null ? String(r.deces_plus_15a_f) : (dec.decesPlus15a_f !== undefined ? String(dec.decesPlus15a_f) : ""),
        synthese_actions: r.synthese_actions || r.actions_menees || "",
        signature_investigateurs: invNotif.nom,
        signature_nom: invNotif.nom,
        signature_tactile: r.signature_tactile || d.signature_tactile || d.signature || null
      };
    }

    case "RAP": {
      const debDate = splitDate(r.date_debut_semaine || d.date_debut || d.date);
      const finDate = splitDate(r.date_fin_semaine || d.date_fin);
      const rapNotif = extraireNomEtTitre(
        r.rapporteur_nom || r.signature_rapporteur || r.signature_nom || d.signature_rapporteur || d.signature_nom || d.notificateur,
        "ASCQ"
      );

      return {
        departement: d.departement || r.departement || "",
        zone_sanitaire: r.zone_sanitaire_nom || r.zone_sanitaire || "",
        commune: d.commune || r.commune || "",
        arrondissement: d.arrondissement || r.arrondissement || "",
        village: d.village || r.village || "",
        semaine_num: d.semaine ? String(d.semaine) : r.semaine_epidemio ? String(r.semaine_epidemio) : (r.semaineNum ? String(r.semaineNum) : ""),
        date_deb_j: debDate.j,
        date_deb_m: debDate.m,
        date_fin_j: finDate.j,
        date_fin_m: finDate.m,
        date_fin_a: finDate.a,
        alertes_detectees: r.alertes_detectees !== undefined && r.alertes_detectees !== null ? String(r.alertes_detectees) : "",
        personnes_touchees: r.personnes_touchees !== undefined && r.personnes_touchees !== null ? String(r.personnes_touchees) : "",
        personnes_decedees: r.personnes_decedees !== undefined && r.personnes_decedees !== null ? String(r.personnes_decedees) : "",
        alertes_verifiees_48h: r.alertes_verifiees_48h !== undefined && r.alertes_verifiees_48h !== null ? String(r.alertes_verifiees_48h) : "",
        alertes_averees: r.alertes_averees !== undefined && r.alertes_averees !== null ? String(r.alertes_averees) : "",
        deces_maternels: r.deces_maternels !== undefined && r.deces_maternels !== null ? String(r.deces_maternels) : "",
        deces_neonatals: r.deces_neonatals !== undefined && r.deces_neonatals !== null ? String(r.deces_neonatals) : "",
        deces_infantiles: r.deces_infantiles !== undefined && r.deces_infantiles !== null ? String(r.deces_infantiles) : "",
        deces_infanto_juveniles: r.deces_infanto_juveniles !== undefined && r.deces_infanto_juveniles !== null ? String(r.deces_infanto_juveniles) : "",
        deces_plus_5_ans: r.deces_plus_5_ans !== undefined && r.deces_plus_5_ans !== null ? String(r.deces_plus_5_ans) : "",
        actions_menees: r.actions_menees || r.actionsMenees || r.actions || d.actions_menees || "",
        signature_nom: rapNotif.nom,
        signature_tactile: r.signature_tactile || d.signature_tactile || d.signature || null
      };
    }

    default:
      return r;
  }
}
