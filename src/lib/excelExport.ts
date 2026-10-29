// =====================================================================
// UTILITAIRE D'EXPORT EXCEL POUR LE SUIVI HEBDO PNSC
// Compatible PC, Mac, Android, iPhone, Microsoft Excel, Calc & Google Sheets
// =====================================================================

export interface RapportHebdoData {
  departement_nom: string;
  commune_nom: string;
  arrondissement_nom: string;
  ascq_nom_complet: string;
  ascq_telephone: string;
  annee: number;
  semaine: number;
  date_debut?: string;
  date_fin?: string;
  
  // Ressources Humaines
  rh_besoins_normes: number;
  rh_fonctionnel: number;
  rh_gap: number;

  // Motos
  motos_mise_a_dispo: number;
  motos_fonctionnel: number;
  motos_gap: number;

  // Ordinateurs
  ordinateurs_mise_a_dispo: number;
  ordinateurs_fonctionnel: number;
  ordinateurs_gap: number;

  // Rémunération due
  remuneration_due_llf: number;
  remuneration_due_fadec: number;
  remuneration_due_srhr: number;
  remuneration_total_mois?: number;

  // Activités, difficultés, suggestions
  activites_realisees: string;
  difficultes: string;
  suggestions: string;

  // Dotations reçues
  forfait_internet_recu: boolean;
  forfait_internet_details: string;
  carburant_recu: boolean;
  carburant_details: string;
  autres_recus: string;
  observations: string;
}

// Fonction utilitaire pour déclencher le téléchargement dans le navigateur
function telechargerFichierExcel(contenuHtml: string, nomFichier: string) {
  const blob = new Blob(["\uFEFF" + contenuHtml], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------
// 1. EXPORT INDIVIDUEL PAR ASCQ (RAPPORT DE SON ARRONDISSEMENT)
// ---------------------------------------------------------------------
export function exporterRapportHebdoIndividuel(data: RapportHebdoData) {
  const totalMoisDus =
    Number(data.remuneration_due_llf || 0) +
    Number(data.remuneration_due_fadec || 0) +
    Number(data.remuneration_due_srhr || 0);

  const html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
      th, td { border: 1px solid #999999; padding: 6px 10px; text-align: left; vertical-align: top; }
      th { background-color: #005c30; color: #ffffff; font-weight: bold; text-align: center; }
      .header-title { font-size: 14pt; font-weight: bold; color: #005c30; text-align: center; border: none; padding: 10px; }
      .sub-title { font-size: 10pt; color: #555555; text-align: center; border: none; padding-bottom: 15px; }
      .section-hdr { background-color: #e8f5e9; font-weight: bold; color: #004d25; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .gap-cell { background-color: #ffebee; color: #c62828; font-weight: bold; text-align: center; }
      .ok-cell { background-color: #e8f5e9; color: #2e7d32; font-weight: bold; text-align: center; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="5" class="header-title">RÉPUBLIQUE DU BÉNIN — MINISTÈRE DE LA SANTÉ</td>
      </tr>
      <tr>
        <td colspan="5" class="header-title" style="font-size: 12pt; color: #004d25;">PROGRAMME NATIONAL DE SANTÉ COMMUNAUTAIRE (PNSC)</td>
      </tr>
      <tr>
        <td colspan="5" class="sub-title">RAPPORT HEBDOMADAIRE DE SUIVI PNSC — SEMAINE ${data.semaine} / ${data.annee}</td>
      </tr>
    </table>

    <table>
      <tr class="section-hdr"><th colspan="4" style="text-align: left;">1. LOCALISATION ADMINISTRATIVE & IDENTIFICATION</th></tr>
      <tr>
        <td width="25%"><strong>Département :</strong></td>
        <td width="25%">${data.departement_nom || "Non précisé"}</td>
        <td width="25%"><strong>Commune :</strong></td>
        <td width="25%">${data.commune_nom || "Non précisée"}</td>
      </tr>
      <tr>
        <td><strong>Arrondissement :</strong></td>
        <td>${data.arrondissement_nom || "Non précisé"}</td>
        <td><strong>Semaine Épidémiologique :</strong></td>
        <td>Semaine ${data.semaine} (${data.annee})</td>
      </tr>
      <tr>
        <td><strong>ASCQ Déclarant :</strong></td>
        <td>${data.ascq_nom_complet || "Non précisé"}</td>
        <td><strong>Téléphone :</strong></td>
        <td>${data.ascq_telephone || "Non précisé"}</td>
      </tr>
    </table>

    <table>
      <tr class="section-hdr"><th colspan="5" style="text-align: left;">2. SITUATION DES RESSOURCES & ÉQUIPEMENTS (CALCUL DES GAPS)</th></tr>
      <tr>
        <th>Indicateur</th>
        <th>Besoins selon normes / Dotation</th>
        <th>Fonctionnel / Opérationnel</th>
        <th>GAP Calculé (Déficit / Pannes)</th>
        <th>Statut</th>
      </tr>
      <tr>
        <td><strong>Ressources Humaines (ASCQ / RC)</strong></td>
        <td class="text-center">${data.rh_besoins_normes}</td>
        <td class="text-center">${data.rh_fonctionnel}</td>
        <td class="${data.rh_gap > 0 ? "gap-cell" : "ok-cell"}">${data.rh_gap}</td>
        <td class="text-center">${data.rh_gap === 0 ? "Conforme aux normes" : "Déficit à combler"}</td>
      </tr>
      <tr>
        <td><strong>Moyens de Déplacement (Motos)</strong></td>
        <td class="text-center">${data.motos_mise_a_dispo}</td>
        <td class="text-center">${data.motos_fonctionnel}</td>
        <td class="${data.motos_gap > 0 ? "gap-cell" : "ok-cell"}">${data.motos_gap}</td>
        <td class="text-center">${data.motos_gap === 0 ? "Parc motos complet" : data.motos_gap + " moto(s) en panne ou manquante(s)"}</td>
      </tr>
      <tr>
        <td><strong>Outils Numériques (Ordinateurs / Tablettes)</strong></td>
        <td class="text-center">${data.ordinateurs_mise_a_dispo}</td>
        <td class="text-center">${data.ordinateurs_fonctionnel}</td>
        <td class="${data.ordinateurs_gap > 0 ? "gap-cell" : "ok-cell"}">${data.ordinateurs_gap}</td>
        <td class="text-center">${data.ordinateurs_gap === 0 ? "Matériel informatique complet" : data.ordinateurs_gap + " appareil(s) défaillant(s)"}</td>
      </tr>
    </table>

    <table>
      <tr class="section-hdr"><th colspan="4" style="text-align: left;">3. SITUATION DES RÉMUNÉRATIONS DUES (ARRIÉRÉS EN MOIS)</th></tr>
      <tr>
        <th>Source de Financement</th>
        <th>Nombre de mois dus</th>
        <th>Statut du paiement</th>
        <th>Observations</th>
      </tr>
      <tr>
        <td><strong>LLF (Lives & Livelihoods Fund)</strong></td>
        <td class="text-center">${data.remuneration_due_llf} mois</td>
        <td class="text-center">${data.remuneration_due_llf > 0 ? "Arriéré en cours" : "À jour"}</td>
        <td>${data.remuneration_due_llf > 0 ? "Paiement attendu" : "Régulier"}</td>
      </tr>
      <tr>
        <td><strong>FADEC Santé</strong></td>
        <td class="text-center">${data.remuneration_due_fadec} mois</td>
        <td class="text-center">${data.remuneration_due_fadec > 0 ? "Arriéré en cours" : "À jour"}</td>
        <td>${data.remuneration_due_fadec > 0 ? "Paiement attendu" : "Régulier"}</td>
      </tr>
      <tr>
        <td><strong>SRHR (Santé Reproductive)</strong></td>
        <td class="text-center">${data.remuneration_due_srhr} mois</td>
        <td class="text-center">${data.remuneration_due_srhr > 0 ? "Arriéré en cours" : "À jour"}</td>
        <td>${data.remuneration_due_srhr > 0 ? "Paiement attendu" : "Régulier"}</td>
      </tr>
      <tr style="background-color: #fff9c4; font-weight: bold;">
        <td>TOTAL GÉNÉRAL ARRIÉRÉS DUS :</td>
        <td class="text-center">${totalMoisDus} mois</td>
        <td colspan="2" class="text-center">${totalMoisDus === 0 ? "Aucun arriéré de salaire" : "ATTENTION : " + totalMoisDus + " mois de salaires cumulés impayés"}</td>
      </tr>
    </table>

    <table>
      <tr class="section-hdr"><th colspan="2" style="text-align: left;">4. DOTATIONS ET APPQUIS LOGISTIQUES REÇUS DURANT LA SEMAINE</th></tr>
      <tr>
        <td width="30%"><strong>Forfait Internet reçu ?</strong></td>
        <td>${data.forfait_internet_recu ? "OUI — " + (data.forfait_internet_details || "Forfait opérationnel") : "NON — Aucun forfait internet reçu"}</td>
      </tr>
      <tr>
        <td><strong>Dotation Carburant reçue ?</strong></td>
        <td>${data.carburant_recu ? "OUI — " + (data.carburant_details || "Carburant perçu") : "NON — Pas de carburant reçu cette semaine"}</td>
      </tr>
      <tr>
        <td><strong>Autres matériels / intrants reçus :</strong></td>
        <td>${data.autres_recus || "Néant"}</td>
      </tr>
      <tr>
        <td><strong>Observations générales :</strong></td>
        <td>${data.observations || "Néant"}</td>
      </tr>
    </table>

    <table>
      <tr class="section-hdr"><th style="text-align: left;">5. ACTIVITÉS RÉALISÉES DURANT LA SEMAINE</th></tr>
      <tr>
        <td style="white-space: pre-wrap; padding: 12px;">${data.activites_realisees || "Aucune activité renseignée pour cette semaine."}</td>
      </tr>
    </table>

    <table>
      <tr class="section-hdr"><th style="text-align: left;">6. DIFFICULTÉS RENCONTRÉES SUR LE TERRAIN</th></tr>
      <tr>
        <td style="white-space: pre-wrap; padding: 12px; color: #b71c1c;">${data.difficultes || "Aucune difficulté majeure signalée."}</td>
      </tr>
    </table>

    <table>
      <tr class="section-hdr"><th style="text-align: left;">7. SUGGESTIONS ET RECOMMANDATIONS</th></tr>
      <tr>
        <td style="white-space: pre-wrap; padding: 12px; color: #1b5e20;">${data.suggestions || "Aucune suggestion émise."}</td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const nomFichier = `Suivi_Hebdo_PNSC_Semaine${data.semaine}_${data.commune_nom}_${(data.arrondissement_nom || "Arr").replace(/\s+/g, "_")}.xls`;
  telechargerFichierExcel(html, nomFichier);
}

// ---------------------------------------------------------------------
// 2. EXPORT COMPILATION COMMUNALE (POUR REPRÉSENTANT ASCQ OU PF CCLS-TP)
// ---------------------------------------------------------------------
export function exporterCompilationCommunaleExcel(
  communeNom: string,
  departementNom: string,
  semaine: number,
  annee: number,
  rapportsArrondissements: RapportHebdoData[]
) {
  // Calculs automatiques intelligents des totaux et moyennes
  const totaux = rapportsArrondissements.reduce(
    (acc, r) => {
      acc.rh_besoins += Number(r.rh_besoins_normes || 0);
      acc.rh_fonct += Number(r.rh_fonctionnel || 0);
      acc.rh_gap += Number(r.rh_gap || 0);

      acc.motos_mise += Number(r.motos_mise_a_dispo || 0);
      acc.motos_fonct += Number(r.motos_fonctionnel || 0);
      acc.motos_gap += Number(r.motos_gap || 0);

      acc.ordis_mise += Number(r.ordinateurs_mise_a_dispo || 0);
      acc.ordis_fonct += Number(r.ordinateurs_fonctionnel || 0);
      acc.ordis_gap += Number(r.ordinateurs_gap || 0);

      acc.mois_llf += Number(r.remuneration_due_llf || 0);
      acc.mois_fadec += Number(r.remuneration_due_fadec || 0);
      acc.mois_srhr += Number(r.remuneration_due_srhr || 0);

      if (r.forfait_internet_recu) acc.nb_forfait_recu += 1;
      if (r.carburant_recu) acc.nb_carburant_recu += 1;

      return acc;
    },
    {
      rh_besoins: 0,
      rh_fonct: 0,
      rh_gap: 0,
      motos_mise: 0,
      motos_fonct: 0,
      motos_gap: 0,
      ordis_mise: 0,
      ordis_fonct: 0,
      ordis_gap: 0,
      mois_llf: 0,
      mois_fadec: 0,
      mois_srhr: 0,
      nb_forfait_recu: 0,
      nb_carburant_recu: 0,
    }
  );

  const totalArrieresCommune = totaux.mois_llf + totaux.mois_fadec + totaux.mois_srhr;

  const html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
      th, td { border: 1px solid #999999; padding: 5px 8px; vertical-align: middle; }
      th { background-color: #005c30; color: #ffffff; font-weight: bold; text-align: center; font-size: 10pt; }
      .header-title { font-size: 14pt; font-weight: bold; color: #005c30; text-align: center; border: none; padding: 10px; }
      .sub-title { font-size: 11pt; color: #333333; text-align: center; border: none; padding-bottom: 15px; font-weight: bold; }
      .total-row { background-color: #fff59d; font-weight: bold; }
      .gap-cell { background-color: #ffebee; color: #c62828; font-weight: bold; text-align: center; }
      .ok-cell { background-color: #e8f5e9; color: #2e7d32; font-weight: bold; text-align: center; }
      .center { text-align: center; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="19" class="header-title">RÉPUBLIQUE DU BÉNIN — MINISTÈRE DE LA SANTÉ</td>
      </tr>
      <tr>
        <td colspan="19" class="header-title" style="font-size: 12pt; color: #004d25;">PROGRAMME NATIONAL DE SANTÉ COMMUNAUTAIRE (PNSC)</td>
      </tr>
      <tr>
        <td colspan="19" class="sub-title">COMPILATION COMMUNALE HEBDOMADAIRE DU SUIVI PNSC</td>
      </tr>
      <tr>
        <td colspan="19" style="border: none; text-align: center; font-size: 10pt; color: #555555; padding-bottom: 10px;">
          <strong>Département :</strong> ${departementNom || "N/A"} • <strong>Commune :</strong> ${communeNom || "N/A"} • <strong>Semaine :</strong> ${semaine} / ${annee} • <strong>Nombre d'arrondissements déclarés :</strong> ${rapportsArrondissements.length}
        </td>
      </tr>
    </table>

    <table>
      <thead>
        <tr>
          <th rowspan="2">Arrondissement</th>
          <th rowspan="2">ASCQ Responsable</th>
          <th colspan="3" style="background-color: #00703c;">Ressources Humaines</th>
          <th colspan="3" style="background-color: #1b5e20;">Motos</th>
          <th colspan="3" style="background-color: #2e7d32;">Outils Numériques</th>
          <th colspan="4" style="background-color: #e65100;">Rémunération due (Mois d'arriérés)</th>
          <th colspan="2" style="background-color: #0d47a1;">Dotations reçues</th>
          <th rowspan="2">Activités principales & Difficultés</th>
        </tr>
        <tr>
          <th style="background-color: #00703c;">Normes</th>
          <th style="background-color: #00703c;">Fonct.</th>
          <th style="background-color: #00703c;">GAP</th>
          <th style="background-color: #1b5e20;">Dotées</th>
          <th style="background-color: #1b5e20;">Fonct.</th>
          <th style="background-color: #1b5e20;">GAP</th>
          <th style="background-color: #2e7d32;">Dotés</th>
          <th style="background-color: #2e7d32;">Fonct.</th>
          <th style="background-color: #2e7d32;">GAP</th>
          <th style="background-color: #e65100;">LLF</th>
          <th style="background-color: #e65100;">FADEC</th>
          <th style="background-color: #e65100;">SRHR</th>
          <th style="background-color: #bf360c;">TOTAL</th>
          <th style="background-color: #0d47a1;">Internet</th>
          <th style="background-color: #0d47a1;">Carburant</th>
        </tr>
      </thead>
      <tbody>
        ${rapportsArrondissements
          .map((r) => {
            const sumArrieres =
              Number(r.remuneration_due_llf || 0) +
              Number(r.remuneration_due_fadec || 0) +
              Number(r.remuneration_due_srhr || 0);

            return `
          <tr>
            <td><strong>${r.arrondissement_nom || "Arrondissement"}</strong></td>
            <td>${r.ascq_nom_complet || "ASCQ"}</td>
            
            <!-- RH -->
            <td class="center">${r.rh_besoins_normes}</td>
            <td class="center">${r.rh_fonctionnel}</td>
            <td class="${r.rh_gap > 0 ? "gap-cell" : "ok-cell"}">${r.rh_gap}</td>

            <!-- Motos -->
            <td class="center">${r.motos_mise_a_dispo}</td>
            <td class="center">${r.motos_fonctionnel}</td>
            <td class="${r.motos_gap > 0 ? "gap-cell" : "ok-cell"}">${r.motos_gap}</td>

            <!-- Ordis -->
            <td class="center">${r.ordinateurs_mise_a_dispo}</td>
            <td class="center">${r.ordinateurs_fonctionnel}</td>
            <td class="${r.ordinateurs_gap > 0 ? "gap-cell" : "ok-cell"}">${r.ordinateurs_gap}</td>

            <!-- Salaires -->
            <td class="center">${r.remuneration_due_llf}</td>
            <td class="center">${r.remuneration_due_fadec}</td>
            <td class="center">${r.remuneration_due_srhr}</td>
            <td class="center" style="font-weight: bold; background-color: ${sumArrieres > 0 ? "#ffe082" : "#ffffff"}">${sumArrieres}</td>

            <!-- Dotations -->
            <td class="center">${r.forfait_internet_recu ? "OUI" : "NON"}</td>
            <td class="center">${r.carburant_recu ? "OUI" : "NON"}</td>

            <!-- Synthèse -->
            <td style="font-size: 9pt;">${r.activites_realisees ? r.activites_realisees.slice(0, 100) + "..." : "R.A.S"}</td>
          </tr>
          `;
          })
          .join("")}

        <!-- LIGNE DES TOTAUX INTELLIGENTS DE LA COMMUNE -->
        <tr class="total-row">
          <td colspan="2" style="text-align: center; font-size: 11pt;">TOTAUX COMMUNAUX :</td>
          
          <td class="center">${totaux.rh_besoins}</td>
          <td class="center">${totaux.rh_fonct}</td>
          <td class="center" style="color: #c62828;">${totaux.rh_gap}</td>

          <td class="center">${totaux.motos_mise}</td>
          <td class="center">${totaux.motos_fonct}</td>
          <td class="center" style="color: #c62828;">${totaux.motos_gap}</td>

          <td class="center">${totaux.ordis_mise}</td>
          <td class="center">${totaux.ordis_fonct}</td>
          <td class="center" style="color: #c62828;">${totaux.ordis_gap}</td>

          <td class="center">${totaux.mois_llf}</td>
          <td class="center">${totaux.mois_fadec}</td>
          <td class="center">${totaux.mois_srhr}</td>
          <td class="center" style="background-color: #ffca28; font-size: 11pt;">${totalArrieresCommune} mois</td>

          <td class="center">${totaux.nb_forfait_recu} / ${rapportsArrondissements.length}</td>
          <td class="center">${totaux.nb_carburant_recu} / ${rapportsArrondissements.length}</td>

          <td style="font-size: 9pt; font-style: italic;">Compilation validée pour le compte de la Commune de ${communeNom}</td>
        </tr>
      </tbody>
    </table>

    <table style="width: 60%; margin-top: 30px;">
      <tr>
        <td style="border: none; width: 50%; text-align: left;">
          <strong>Le Représentant Communal ASCQ :</strong><br /><br /><br />
          _________________________________
        </td>
        <td style="border: none; width: 50%; text-align: right;">
          <strong>Le Point Focal CCLS-TP :</strong><br /><br /><br />
          _________________________________
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const nomFichier = `Compilation_Communale_PNSC_${communeNom}_Semaine${semaine}_${annee}.xls`;
  telechargerFichierExcel(html, nomFichier);
}

// =====================================================================
// EXPORT DU REGISTRE COMPLET DES FICHES DE SURVEILLANCE ÉPIDÉMIOLOGIQUE
// =====================================================================
export function exporterRegistreSurveillanceExcel(fiches: any[], filtreType: string = "TOUT") {
  if (!fiches || fiches.length === 0) {
    alert("Aucune fiche de surveillance à exporter.");
    return;
  }

  const dateExport = new Date().toLocaleDateString("fr-FR");
  const heureExport = new Date().toLocaleTimeString("fr-FR");

  const html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <style>
      body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 10pt; color: #222; }
      .header-title { font-size: 14pt; font-weight: bold; color: #005c30; text-align: center; }
      .header-sub { font-size: 10pt; font-weight: bold; color: #555; text-align: center; }
      .tricolor { height: 4px; background: #008751; }
      table { border-collapse: collapse; width: 100%; margin-top: 15px; }
      th { background-color: #005c30; color: #ffffff; font-weight: bold; padding: 8px 6px; border: 1px solid #004724; font-size: 9pt; text-align: center; }
      td { border: 1px solid #cccccc; padding: 6px; font-size: 9pt; vertical-align: middle; }
      tr:nth-child(even) { background-color: #f9fbf9; }
      .center { text-align: center; }
      .badge-alr { background-color: #e8f5e9; color: #2e7d32; font-weight: bold; text-align: center; }
      .badge-dec { background-color: #f3e5f5; color: #7b1fa2; font-weight: bold; text-align: center; }
      .badge-reg { background-color: #e3f2fd; color: #1565c0; font-weight: bold; text-align: center; }
      .badge-inv { background-color: #fff8e1; color: #f57f17; font-weight: bold; text-align: center; }
      .badge-rap { background-color: #ede7f6; color: #4527a0; font-weight: bold; text-align: center; }
      .prioritaire { color: #c62828; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="header-title">RÉPUBLIQUE DU BÉNIN — MINISTÈRE DE LA SANTÉ</div>
    <div class="header-sub">DIRECTION NATIONALE DE LA SANTÉ PUBLIQUE — SURVEILLANCE ÉPIDÉMIOLOGIQUE SIMR</div>
    <div class="header-sub">REGISTRE GÉNÉRAL DES FICHES DE SURVEILLANCE COMMUNAUTAIRE</div>
    <div style="text-align: center; font-size: 9pt; color: #666; margin-top: 5px;">
      Exporté le ${dateExport} à ${heureExport} • Filtre appliqué : <strong>${filtreType}</strong> • Total : <strong>${fiches.length} fiche(s)</strong>
    </div>

    <table>
      <thead>
        <tr>
          <th>N° Fiche</th>
          <th>Type</th>
          <th>Titre / Pathologie / Événement</th>
          <th>Semaine</th>
          <th>Année</th>
          <th>Date</th>
          <th>Village / Quartier</th>
          <th>Commune / Zone</th>
          <th>Notificateur / Enquêteur</th>
          <th>Impact (Cas / Décès)</th>
          <th>Priorité</th>
          <th>Statut</th>
        </tr>
      </thead>
      <tbody>
        ${fiches.map((f) => {
          const typeClass = f.type === "ALR" ? "badge-alr" :
                            f.type === "DEC" ? "badge-dec" :
                            f.type === "REG" ? "badge-reg" :
                            f.type === "INV" ? "badge-inv" : "badge-rap";
          const typeLibelle = f.type === "ALR" ? "Alerte SIMR" :
                              f.type === "DEC" ? "Décès Communautaire" :
                              f.type === "REG" ? "Registre Rumeurs" :
                              f.type === "INV" ? "Investigation" : "Rapport Hebdo";
          return `
          <tr>
            <td class="center" style="font-family: monospace; font-weight: bold;">${f.numero || "-"}</td>
            <td class="${typeClass}">${typeLibelle}</td>
            <td><strong>${f.titre || "-"}</strong></td>
            <td class="center">${f.semaine ? "Semaine " + f.semaine : "-"}</td>
            <td class="center">${f.annee || "-"}</td>
            <td class="center">${f.date || "-"}</td>
            <td>${f.village || "-"}</td>
            <td>${f.commune || "-"}</td>
            <td>${f.notificateur || "-"}</td>
            <td>${f.impact || "-"}</td>
            <td class="center ${f.estPrioritaire ? "prioritaire" : ""}">
              ${f.estPrioritaire ? "OUI (Prioritaire)" : "Normale"}
            </td>
            <td class="center" style="font-weight: bold;">${f.resultat || f.statut || "-"}</td>
          </tr>
          `;
        }).join("")}
      </tbody>
    </table>

    <div style="margin-top: 25px; font-size: 8pt; color: #777; text-align: center;">
      Document extrait de l'application officielle ASCQ Bénin — Système d'Information Sanitaire Communautaire (PNSC)
    </div>
  </body>
  </html>
  `;

  const nomFichier = `Registre_Surveillance_SIMR_Benin_${filtreType}_${new Date().toISOString().slice(0, 10)}.xls`;
  telechargerFichierExcel(html, nomFichier);
}

// =====================================================================
// EXPORT D'UNE FICHE INDIVIDUELLE DE SURVEILLANCE EN FICHIER EXCEL (.XLS)
// =====================================================================
export function exporterFicheSurveillanceIndividuelleExcel(fiche: any) {
  if (!fiche) return;

  const dateExport = new Date().toLocaleDateString("fr-FR");
  const heureExport = new Date().toLocaleTimeString("fr-FR");

  // Normalisation des champs quelle que soit la source (vue unifiée ou objet RPC complet)
  const numero = fiche.numero || fiche.numero_alerte || fiche.numero_deces || fiche.numero_registre || fiche.numero_investigation || fiche.numero_rapport || "SIMR-000";
  const typeCode = fiche.type || (fiche.numero_alerte ? "ALR" : fiche.numero_deces ? "DEC" : fiche.numero_registre ? "REG" : fiche.numero_investigation ? "INV" : fiche.numero_rapport ? "RAP" : "SIMR");
  const typeLibelle = typeCode === "ALR" ? "Alerte Épidémiologique SIMR" :
                      typeCode === "DEC" ? "Notification de Décès Communautaire" :
                      typeCode === "REG" ? "Registre des Alertes & Rumeurs" :
                      typeCode === "INV" ? "Investigation d'Événement Sanitaire" :
                      typeCode === "RAP" ? "Rapport Hebdomadaire de Surveillance" : "Fiche de Surveillance Sanitaire";
  
  const titre = fiche.titre || fiche.type_alerte_nom || fiche.type_deces_nom || fiche.type_nom || "Événement Sanitaire";
  const semaine = fiche.semaine || fiche.semaine_epidemio || fiche.rawData?.semaine_epidemio || "N/A";
  const annee = fiche.annee || fiche.rawData?.annee || new Date().getFullYear();
  const dateEvent = fiche.date || fiche.date_notification || fiche.date_deces || fiche.date_survenue || fiche.date_investigation || fiche.date_debut_semaine || dateExport;
  
  const departement = fiche.departement || fiche.departement_nom || fiche.rawData?.departement_nom || "Non précisé";
  const commune = fiche.commune || fiche.commune_nom || fiche.rawData?.commune_nom || "Non précisée";
  const arrondissement = fiche.arrondissement || fiche.arrondissement_nom || fiche.rawData?.arrondissement_nom || "Non précisé";
  const village = fiche.village || fiche.village_nom || fiche.rawData?.village_nom || "Non précisé";
  
  const estPrioritaire = Boolean(fiche.estPrioritaire || fiche.est_prioritaire);
  const impact = fiche.impact || (fiche.nb_personnes_touchees !== undefined ? `${fiche.nb_personnes_touchees} touché(s) • ${fiche.nb_personnes_mortes ?? fiche.nb_personnes_decedees ?? 0} décès` : "Non spécifié");
  const statut = fiche.resultat || fiche.resultat_verification || fiche.statut || "ENREGISTRÉE";
  
  const notificateur = fiche.notificateur || (fiche.notificateur_nom_complet ? `${fiche.notificateur_titre || 'ASCQ'} : ${fiche.notificateur_nom_complet}` : (fiche.relais_nom_complet || fiche.rapporteur_nom || "Agent PNSC"));
  const notificateurTel = fiche.notificateur_telephone || fiche.relais_telephone || fiche.rawData?.notificateur_telephone || "-";
  
  const casNom = fiche.cas_prive ? `${fiche.cas_prive.nom} ${fiche.cas_prive.prenoms}` : (fiche.nomCas ? `${fiche.nomCas} ${fiche.prenomsCas || ''}` : "Confidentiel / Non applicable");
  const casSexeAge = (fiche.sexe ? (fiche.sexe === 'M' ? 'Masculin' : 'Féminin') : '') + (fiche.age_valeur ? ` • ${fiche.age_valeur} ${fiche.age_unite || 'ans'}` : '');
  
  const symptomes = fiche.symptomes_noms && fiche.symptomes_noms.length > 0 
    ? fiche.symptomes_noms.join(", ") 
    : (fiche.rawData?.symptomes_noms?.join(", ") || "-");
    
  const mesures = fiche.mesures_prises || fiche.rawData?.mesures_prises || fiche.rawData?.actions_recommandees || fiche.rawData?.actions_menees || "-";
  const commentaireVerif = fiche.commentaire_verification || fiche.rawData?.commentaire_verification || null;

  const html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <style>
      body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 10pt; color: #222; }
      .header-title { font-size: 13pt; font-weight: bold; color: #005c30; text-align: center; }
      .header-sub { font-size: 9pt; font-weight: bold; color: #555; text-align: center; }
      table { border-collapse: collapse; width: 100%; margin-top: 15px; }
      th { background-color: #005c30; color: #ffffff; font-weight: bold; padding: 6px; border: 1px solid #004724; font-size: 9pt; text-align: left; }
      td { border: 1px solid #cccccc; padding: 6px 8px; font-size: 9pt; }
      .label-cell { background-color: #f4f7f5; font-weight: bold; width: 30%; color: #333; }
      .val-cell { width: 70%; }
      .box-alert { border: 2px solid #005c30; padding: 10px; margin-top: 10px; }
      .prio-high { color: #c62828; font-weight: bold; background-color: #ffebee; }
      .prio-normal { color: #2e7d32; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="header-title">RÉPUBLIQUE DU BÉNIN — MINISTÈRE DE LA SANTÉ</div>
    <div class="header-sub">DIRECTION NATIONALE DE LA SANTÉ PUBLIQUE (DNSP) — PROGRAMME NATIONAL DE SANTÉ COMMUNAUTAIRE</div>
    <div class="header-sub">SURVEILLANCE INTÉGRÉE DES MALADIES ET DE LA RIPOSTE (SIMR BÉNIN)</div>
    <div class="header-sub" style="color: #005c30; font-size: 10pt; margin-top: 4px;">
      FICHE OFFICIELLE : ${typeLibelle.toUpperCase()} — N° ${numero}
    </div>
    
    <div style="font-size: 8pt; text-align: right; color: #666; margin-top: 6px;">
      Document officiel généré le ${dateExport} à ${heureExport}
    </div>

    <table>
      <thead>
        <tr>
          <th colspan="2">1. IDENTIFICATION DE L'ÉVÉNEMENT & LOCALISATION ADMINISTRATIVE</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="label-cell">Numéro d'enregistrement officiel :</td>
          <td class="val-cell" style="font-family: monospace; font-weight: bold; font-size: 11pt; color: #005c30;">${numero}</td>
        </tr>
        <tr>
          <td class="label-cell">Nature du document :</td>
          <td class="val-cell"><strong>${typeLibelle}</strong></td>
        </tr>
        <tr>
          <td class="label-cell">Titre / Pathologie / Cause :</td>
          <td class="val-cell" style="font-weight: bold; color: #005c30; font-size: 10pt;">${titre}</td>
        </tr>
        <tr>
          <td class="label-cell">Période épidémiologique :</td>
          <td class="val-cell">Semaine <strong>${semaine}</strong> • Année <strong>${annee}</strong></td>
        </tr>
        <tr>
          <td class="label-cell">Date de l'événement / notification :</td>
          <td class="val-cell">${dateEvent}</td>
        </tr>
        <tr>
          <td class="label-cell">Département & Commune :</td>
          <td class="val-cell">${departement} • ${commune}</td>
        </tr>
        <tr>
          <td class="label-cell">Arrondissement & Village / Quartier :</td>
          <td class="val-cell">${arrondissement} • <strong>${village}</strong></td>
        </tr>
      </tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th colspan="2">2. SITUATION SANITAIRE, IMPACT & DONNÉES CLINIQUES</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="label-cell">Niveau de Priorité Épidémiologique :</td>
          <td class="val-cell ${estPrioritaire ? 'prio-high' : 'prio-normal'}">
            ${estPrioritaire ? "⚠️ ALERTE PRIORITAIRE À POTENTIEL ÉPIDÉMIQUE — RIPOSTE IMMÉDIATE" : "Surveillance épidémiologique de routine"}
          </td>
        </tr>
        <tr>
          <td class="label-cell">Bilan d'impact sanitaire :</td>
          <td class="val-cell" style="font-weight: bold; font-size: 10pt;">${impact}</td>
        </tr>
        ${casNom !== "Confidentiel / Non applicable" ? `
        <tr>
          <td class="label-cell">Identité du cas (si applicable) :</td>
          <td class="val-cell"><strong>${casNom}</strong> (${casSexeAge || "Non précisé"})</td>
        </tr>
        ` : ""}
        ${symptomes !== "-" ? `
        <tr>
          <td class="label-cell">Signes & symptômes constatés :</td>
          <td class="val-cell">${symptomes}</td>
        </tr>
        ` : ""}
        <tr>
          <td class="label-cell">Mesures immédiates prises :</td>
          <td class="val-cell">${mesures}</td>
        </tr>
        <tr>
          <td class="label-cell">Statut & Résultat de vérification :</td>
          <td class="val-cell" style="font-weight: bold; color: #005c30;">${statut}</td>
        </tr>
        ${commentaireVerif ? `
        <tr>
          <td class="label-cell">Commentaire du superviseur :</td>
          <td class="val-cell" style="font-style: italic;">« ${commentaireVerif} »</td>
        </tr>
        ` : ""}
      </tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th colspan="2">3. DÉCLARATION, TRAÇABILITÉ & ENGAGEMENT OFFICIEL</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="label-cell">Agent Notificateur / Déclarant :</td>
          <td class="val-cell"><strong>${notificateur}</strong></td>
        </tr>
        <tr>
          <td class="label-cell">Contact téléphonique de l'agent :</td>
          <td class="val-cell">${notificateurTel}</td>
        </tr>
        <tr>
          <td class="label-cell">Cadre de Conformité PNSC :</td>
          <td class="val-cell" style="font-style: italic;">
            Fiche enregistrée conformément aux directives de la Politique Nationale de Santé Communautaire (PNSC) et du guide SIMR du Ministère de la Santé de la République du Bénin.
          </td>
        </tr>
      </tbody>
    </table>

    <table style="width: 100%; margin-top: 35px; border: none;">
      <tr>
        <td style="width: 100%; border: none; text-align: right; vertical-align: top;">
          <strong>Signature du Déclarant (Relais Communautaire ou ASCQ) :</strong><br />
          <span style="font-size: 8pt; color: #555;">Signature officielle et date (Aucun visa hiérarchique requis) :</span><br /><br /><br />
          ___________________________________________
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const nomFichier = `Fiche_Surveillance_${numero}_${typeCode}.xls`;
  telechargerFichierExcel(html, nomFichier);
}

// =====================================================================
// EXPORT DU BULLETIN OFFICIEL DE RÉFÉRENCE COMMUNAUTAIRE (SANTÉ & GUPS)
// =====================================================================
export function exporterFicheReferenceExcel(ref: any) {
  if (!ref) return;

  const dateExport = new Date().toLocaleDateString("fr-FR");
  const heureExport = new Date().toLocaleTimeString("fr-FR");

  const numero = ref.numero_reference || "REF-000";
  const isGups = ref.type_reference === "SOCIAL_GUPS" || ref.destination_type === "GUPS";
  const typeTitre = isGups ? "BULLETIN DE RÉFÉRENCE SOCIALE — GUPS (PROTECTION SOCIALE)" : "BULLETIN DE RÉFÉRENCE MÉDICALE — CENTRE DE SANTÉ";

  const html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <style>
      body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 10pt; color: #222; }
      .header-title { font-size: 12pt; font-weight: bold; color: #005c30; text-align: center; }
      .header-sub { font-size: 9pt; font-weight: bold; color: #555; text-align: center; }
      table { border-collapse: collapse; width: 100%; margin-top: 15px; }
      th { background-color: ${isGups ? '#1e40af' : '#005c30'}; color: #ffffff; font-weight: bold; padding: 6px; border: 1px solid #333; font-size: 9pt; text-align: left; }
      td { border: 1px solid #cccccc; padding: 6px 8px; font-size: 9pt; }
      .label-cell { background-color: #f8fafc; font-weight: bold; width: 30%; color: #333; }
      .val-cell { width: 70%; }
      .urgence-evac { color: #b91c1c; font-weight: bold; background-color: #fef2f2; }
      .volet-retour { background-color: #f0fdf4; border: 2px dashed #15803d; padding: 10px; margin-top: 15px; }
    </style>
  </head>
  <body>
    <div class="header-title">RÉPUBLIQUE DU BÉNIN</div>
    <div class="header-sub">
      ${isGups 
        ? "MINISTÈRE DES AFFAIRES SOCIALES ET DE LA MICROFINANCE — DIRECTION GÉNÉRALE DE LA FAMILLE ET DES AFFAIRES SOCIALES"
        : "MINISTÈRE DE LA SANTÉ — PROGRAMME NATIONAL DE SANTÉ COMMUNAUTAIRE (PNSC)"}
    </div>
    <div class="header-sub" style="color: ${isGups ? '#1e40af' : '#005c30'}; font-size: 11pt; margin-top: 5px;">
      ${typeTitre} — N° ${numero}
    </div>
    
    <div style="font-size: 8pt; text-align: right; color: #666; margin-top: 4px;">
      Généré le ${dateExport} à ${heureExport}
    </div>

    <table>
      <thead>
        <tr>
          <th colspan="2">1. STRUCTURE DESTINATAIRE & LOCALISATION</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="label-cell">Structure d'accueil réceptrice :</td>
          <td class="val-cell" style="font-weight: bold; color: ${isGups ? '#1e40af' : '#005c30'}; font-size: 11pt;">
            ${ref.destination_nom || (isGups ? "Guichet Unique de Protection Sociale (GUPS)" : "Centre de Santé le plus proche")}
          </td>
        </tr>
        <tr>
          <td class="label-cell">Degré d'urgence :</td>
          <td class="val-cell ${ref.degre_urgence === 'EVACUATION_IMMEDIATE' ? 'urgence-evac' : ''}">
            ${ref.degre_urgence === 'EVACUATION_IMMEDIATE' ? '🚨 ÉVACUATION IMMÉDIATE' : ref.degre_urgence === 'URGENTE' ? '⚠️ URGENT' : 'Normale (Consultation de routine)'}
          </td>
        </tr>
        <tr>
          <td class="label-cell">Village / Quartier de provenance :</td>
          <td class="val-cell"><strong>${ref.village_nom || ref.village || "Non précisé"}</strong></td>
        </tr>
        <tr>
          <td class="label-cell">Date et heure de la référence :</td>
          <td class="val-cell">${ref.date_reference || dateExport} ${ref.heure_reference ? 'à ' + ref.heure_reference : ''}</td>
        </tr>
      </tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th colspan="2">2. IDENTITÉ DU BÉNÉFICIAIRE / PATIENT</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="label-cell">Nom & Prénoms :</td>
          <td class="val-cell" style="font-weight: bold; font-size: 11pt;">${ref.nom_patient} ${ref.prenoms_patient}</td>
        </tr>
        <tr>
          <td class="label-cell">Sexe & Âge :</td>
          <td class="val-cell">
            ${ref.sexe === 'M' ? 'Masculin' : 'Féminin'} • ${ref.age_valeur} ${ref.age_unite || 'ans'}
          </td>
        </tr>
        <tr>
          <td class="label-cell">Parent / Tuteur / Accompagnateur :</td>
          <td class="val-cell">${ref.nom_parent_tuteur || "Non précisé"}</td>
        </tr>
        <tr>
          <td class="label-cell">Téléphone de contact :</td>
          <td class="val-cell"><strong>${ref.telephone_contact || "Aucun"}</strong></td>
        </tr>
        <tr>
          <td class="label-cell">Adresse / Repère domicile :</td>
          <td class="val-cell">${ref.adresse_exacte || "-"}</td>
        </tr>
      </tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th colspan="2">3. MOTIF OFFICIEL DE LA RÉFÉRENCE & CONSTAT DU TERRAIN</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="label-cell">Motif principal :</td>
          <td class="val-cell" style="font-weight: bold; color: #b91c1c;">
            ${ref.motif_libelle || ref.motif_code}
          </td>
        </tr>
        <tr>
          <td class="label-cell">Détails des signes / Situation sociale :</td>
          <td class="val-cell">${ref.motif_details || "Aucun détail complémentaire renseigné."}</td>
        </tr>
        ${ref.one_health_concerne ? `
        <tr>
          <td class="label-cell">Approche One Health :</td>
          <td class="val-cell" style="color: #047857; font-weight: bold;">
            🌿 Cas impliquant l'approche One Health (Santé Animale / Zoonose ou Environnement)
          </td>
        </tr>
        ` : ''}
      </tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th colspan="2">4. AGENTS DE RÉFÉRENCE & VALIDATION DE TERRAIN</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="label-cell">Relais Communautaire (Déclarant) :</td>
          <td class="val-cell"><strong>${ref.relais_nom}</strong> (Tél : ${ref.relais_telephone || "-"})</td>
        </tr>
        <tr>
          <td class="label-cell">ASCQ Superviseur (Validateur) :</td>
          <td class="val-cell"><strong>${ref.ascq_nom || "ASCQ Superviseur"}</strong></td>
        </tr>
        <tr>
          <td class="label-cell">Statut de validation :</td>
          <td class="val-cell" style="font-weight: bold; color: ${ref.statut === 'VALIDEE' ? '#15803d' : '#d97706'};">
            ${ref.statut === 'VALIDEE' ? '✓ VALIDÉE PAR L’ASCQ' : ref.statut || 'EN ATTENTE'}
          </td>
        </tr>
        ${ref.commentaire_ascq ? `
        <tr>
          <td class="label-cell">Commentaire ASCQ :</td>
          <td class="val-cell" style="font-style: italic;">« ${ref.commentaire_ascq} »</td>
        </tr>
        ` : ''}
      </tbody>
    </table>

    <table style="width: 100%; margin-top: 25px; border: 2px dashed #15803d; background-color: #f0fdf4;">
      <tr>
        <td colspan="2" style="background-color: #dcfce7; font-weight: bold; color: #166534; padding: 8px;">
          VOLET RETOUR (À REMPLIR PAR LA STRUCTURE D'ACCUEIL : CS OU GUPS ET À RENVOYER À L'ASCQ)
        </td>
      </tr>
      <tr>
        <td style="width: 50%; padding: 10px; border: none; vertical-align: top;">
          <strong>Date et heure d'arrivée au centre :</strong> ..../..../........ à ........h........<br /><br />
          <strong>Diagnostic clinique ou mesure sociale retenue :</strong><br /><br />
          ........................................................................................................<br /><br />
          <strong>Nom et Titre de l'Agent Récepteur :</strong> ........................................
        </td>
        <td style="width: 50%; padding: 10px; border: none; vertical-align: top; text-align: right;">
          <strong>Décision de prise en charge :</strong><br />
          [ ] Traitement ambulatoire [ ] Hospitalisation [ ] Appui social GUPS<br /><br /><br />
          <strong>Signature et Cachet officiel de la structure :</strong><br /><br /><br />
          __________________________________________________
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const nomFichier = `Bulletin_Reference_${isGups ? 'GUPS' : 'CS'}_${numero}.xls`;
  telechargerFichierExcel(html, nomFichier);
}

// =====================================================================
// EXPORT EXCEL DU REGISTRE DES PRISES EN CHARGE ET CONSULTATIONS (iCCM)
// =====================================================================
export function exporterRegistreConsultationsExcel(
  consultations: any[],
  agentNom: string = "ASCQ Bénin",
  titrePeriode: string = "Toutes les dates"
) {
  const html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
      th { background-color: #005c30; color: white; border: 1px solid #003e20; padding: 8px; text-align: left; font-size: 11pt; }
      td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; font-size: 10pt; }
      .header-title { font-size: 15pt; font-weight: bold; color: #005c30; text-align: center; }
      .sub-title { font-size: 11pt; font-weight: bold; color: #334155; text-align: center; }
      .badge-pec { background-color: #dcfce7; color: #15803d; font-weight: bold; }
      .badge-ref { background-color: #fef3c7; color: #b45309; font-weight: bold; }
      .badge-pos { background-color: #fee2e2; color: #b91c1c; font-weight: bold; }
      .footer-note { font-size: 9pt; color: #64748b; font-style: italic; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="12" class="header-title">RÉPUBLIQUE DU BÉNIN • MINISTÈRE DE LA SANTÉ</td>
      </tr>
      <tr>
        <td colspan="12" class="sub-title">REGISTRE DES PRISES EN CHARGE EN COMMUNAUTÉ (iCCM / PCIME-C)</td>
      </tr>
      <tr>
        <td colspan="6"><strong>Agent :</strong> ${agentNom}</td>
        <td colspan="6" style="text-align: right;"><strong>Période / Date :</strong> ${titrePeriode} • Exporté le ${new Date().toLocaleDateString('fr-BJ')}</td>
      </tr>
    </table>

    <table>
      <thead>
        <tr>
          <th>N°</th>
          <th>Date</th>
          <th>Village</th>
          <th>Nom & Prénoms Patient</th>
          <th>Âge</th>
          <th>Sexe</th>
          <th>Signe Principal</th>
          <th>Signes Associés</th>
          <th>TDR Paludisme</th>
          <th>Diagnostic Possible</th>
          <th>Décision Clinique</th>
          <th>Produits Utilisés / 1er Geste Posé</th>
          <th>RDV Contrôle / Destination</th>
        </tr>
      </thead>
      <tbody>
        ${consultations.map((c, i) => {
          const isPec = c.decision === 'PRISE_EN_CHARGE_COMMUNAUTAIRE';
          const produitsStr = Array.isArray(c.produits_utilises)
            ? c.produits_utilises.map((p: any) => `${p.nom || p.produit} (${p.quantite || p.posologie || '1'})`).join(', ')
            : (c.produits_utilises || '-');

          return `
            <tr>
              <td style="text-align: center; font-weight: bold;">${i + 1}</td>
              <td>${c.date_consultation || '-'}</td>
              <td><strong>${c.village || '-'}</strong></td>
              <td><strong>${c.nom_patient}</strong> ${c.prenoms_patient}</td>
              <td style="text-align: center;">${c.age_valeur} ${c.age_unite?.toLowerCase()}</td>
              <td style="text-align: center;">${c.sexe}</td>
              <td style="color: #005c30; font-weight: bold;">${c.signe_principal}</td>
              <td>${Array.isArray(c.signes_secondaires) && c.signes_secondaires.length > 0 ? c.signes_secondaires.join(', ') : '-'}</td>
              <td style="text-align: center;" class="${c.tdr_paludisme === 'POSITIF' ? 'badge-pos' : ''}">${c.tdr_paludisme || '-'}</td>
              <td><strong>${c.diagnostic_possible}</strong></td>
              <td class="${isPec ? 'badge-pec' : 'badge-ref'}">${isPec ? 'Prise en charge locale' : 'RÉFÉRÉ AU CS'}</td>
              <td>${isPec ? produitsStr : (c.premier_geste_pose || '1er geste administré')}</td>
              <td>${isPec ? (c.date_rendez_vous_suivi ? `RDV le ${c.date_rendez_vous_suivi}` : 'Conseils donnés') : (c.structure_cs_destination || 'Centre de Santé')}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <table>
      <tr>
        <td colspan="12" class="footer-note">
          Total consultations enregistrées : <strong>${consultations.length}</strong> | 
          Pris en charge sur place : <strong>${consultations.filter(x => x.decision === 'PRISE_EN_CHARGE_COMMUNAUTAIRE').length}</strong> | 
          Référés au CS : <strong>${consultations.filter(x => x.decision === 'REFERER_CS').length}</strong> | 
          TDR Paludisme Positifs : <strong>${consultations.filter(x => x.tdr_paludisme === 'POSITIF').length}</strong>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const dateStr = new Date().toISOString().split("T")[0];
  telechargerFichierExcel(html, `Registre_Consultations_iCCM_${dateStr}.xls`);
}
