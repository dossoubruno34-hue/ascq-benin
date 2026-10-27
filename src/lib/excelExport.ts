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
