const fs = require('fs');
const path = require('path');

const base64Data = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/assets-base64.json'), 'utf8'));
const logoAsc = base64Data.logoAsc;
const bannerCnls = base64Data.bannerCnls;

// 1. GÉNÉRATION DE Code_Planning_RC.gs
const codeGs = `/**
 * PLANNING HEBDOMADAIRE D'ACTIVITÉS DU RELAIS COMMUNAUTAIRE (RC)
 * Plateforme Officielle de Santé Communautaire du Bénin
 * En-tête officiel validé : Présidence de la République / CNLS-TP & Ministère de la Santé
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('RC_Planning_Seul')
    .setTitle('Planning Hebdomadaire RC - Santé Communautaire Bénin')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

function processRcPlanningOnly(data) {
  try {
    var ss = getOrCreateRcPlanningSheet();
    var sheet = ss.getActiveSheet();
    
    var timestamp = new Date();
    var submissionId = data.id || timestamp.getTime();
    var pdfUrl = generateRcPlanningPDF(data);

    // Formatage lisible des créneaux pour Google Sheets
    var formatSlots = function(slots) {
      if (!slots || !slots.length) return '';
      return slots.map(function(s) {
        return (s.date || '') + ' ' + (s.heure || '') + ' [' + (s.zone || '') + ' : ' + (s.qte || '0') + ']';
      }).join(' | ');
    };

    var rowData = [
      submissionId,
      timestamp.toLocaleString('fr-FR'),
      data.departement || '',
      data.zoneSanitaire || '',
      data.commune || '',
      data.arrondissement || '',
      data.village || '',
      data.grappe || '',
      data.rcName || '',
      data.rcPhone || '',
      data.semaineNum || '',
      data.dateDebutStr || '',
      data.dateFinStr || '',
      formatSlots(data.act_vad),
      formatSlots(data.act_causerie),
      formatSlots(data.act_animale),
      formatSlots(data.act_sociales),
      formatSlots(data.act_femmes),
      formatSlots(data.act_enfants),
      formatSlots(data.act_referees),
      formatSlots(data.act_autres),
      data.observations || '',
      pdfUrl
    ];

    sheet.appendRow(rowData);

    return {
      status: 'success',
      message: 'Le planning hebdomadaire (Semaine ' + data.semaineNum + ') de ' + data.rcName + ' a été validé et enregistré avec succès !',
      pdfUrl: pdfUrl
    };

  } catch (error) {
    return {
      status: 'error',
      message: 'Erreur serveur : ' + error.toString()
    };
  }
}

function generateRcPlanningPDF(data) {
  var folderName = "Plannings_Hebdo_RC_Benin";
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

  var esc = function(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  var fmtDate = function(dStr) {
    if (!dStr) return '-';
    var p = dStr.split('-');
    return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : dStr;
  };

  var activitiesDef = [
    { key: 'act_vad', label: '1. Visites à domicile (VAD)' },
    { key: 'act_causerie', label: '2. Causeries / Sensibilisation / Salubrité' },
    { key: 'act_animale', label: '3. Santé animale (One Health)' },
    { key: 'act_sociales', label: '4. Affaires sociales' },
    { key: 'act_femmes', label: '5. Suivi des femmes enceintes' },
    { key: 'act_enfants', label: '6. Suivi des enfants de 0 à 59 mois' },
    { key: 'act_referees', label: '7. Personnes référées' },
    { key: 'act_autres', label: '8. Autres activités' }
  ];

  // Calcul du nombre total de lignes pour le rowspan de la colonne Observations
  var totalRows = 0;
  activitiesDef.forEach(function(act) {
    var slots = data[act.key] || [];
    totalRows += (slots.length > 0 ? slots.length : 1);
  });

  var rowsHtml = '';
  var firstRowDone = false;
  var obsText = esc(data.observations || 'Néant');

  activitiesDef.forEach(function(act) {
    var slots = data[act.key] || [];
    if (slots.length === 0) {
      rowsHtml += '<tr>' +
        '<td style="text-align:left; font-weight:bold; background:#f8fafc; border:1.2px solid #000; padding:4px 6px;">' + esc(act.label) + '</td>' +
        '<td style="color:#64748b; border:1.2px solid #000; padding:4px 5px; text-align:center;">-</td>' +
        '<td style="color:#64748b; border:1.2px solid #000; padding:4px 5px; text-align:center;">-</td>' +
        '<td style="color:#64748b; border:1.2px solid #000; padding:4px 6px;">-</td>' +
        '<td style="color:#64748b; border:1.2px solid #000; padding:4px 5px; text-align:center;">-</td>' +
        (!firstRowDone ? '<td rowspan="' + totalRows + '" style="vertical-align:middle; font-size:8.5pt; word-break:break-word; border:1.2px solid #000; padding:6px; text-align:left; background:#ffffff;">' + obsText + '</td>' : '') +
      '</tr>';
      firstRowDone = true;
    } else {
      slots.forEach(function(s, idx) {
        rowsHtml += '<tr>' +
          (idx === 0 ? '<td rowspan="' + slots.length + '" style="text-align:left; font-weight:bold; background:#f8fafc; vertical-align:middle; border:1.2px solid #000; padding:4px 6px;">' + esc(act.label) + '</td>' : '') +
          '<td style="border:1.2px solid #000; padding:4px 5px; text-align:center;">' + esc(fmtDate(s.date)) + '</td>' +
          '<td style="border:1.2px solid #000; padding:4px 5px; text-align:center;">' + esc(s.heure || '-') + '</td>' +
          '<td style="text-align:left; border:1.2px solid #000; padding:4px 6px;">' + esc(s.zone || '-') + '</td>' +
          '<td style="font-weight:bold; color:#005c30; border:1.2px solid #000; padding:4px 5px; text-align:center;">' + esc(s.qte || '0') + '</td>' +
          (!firstRowDone ? '<td rowspan="' + totalRows + '" style="vertical-align:middle; font-size:8.5pt; word-break:break-word; border:1.2px solid #000; padding:6px; text-align:left; background:#ffffff;">' + obsText + '</td>' : '') +
        '</tr>';
        firstRowDone = true;
      });
    }
  });

  var bannerHtml = '<img src="${bannerCnls}" style="width:100%; max-height:48px; object-fit:contain; display:block; margin:0 auto 3px auto;" />';
  var logoHtml = '<img src="${logoAsc}" style="max-height:55px; display:block;" />';

  var sigRcHtml = data.signatureRc 
    ? '<img src="' + data.signatureRc + '" style="max-height:40px; display:block; margin:2px auto;" />' 
    : '<div style="height:36px;"></div>';

  var sigAscqHtml = data.signatureAscq 
    ? '<img src="' + data.signatureAscq + '" style="max-height:40px; display:block; margin:2px auto;" />' 
    : '<div style="height:36px;"></div>';

  var htmlContent = 
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    '@page { size: A4 landscape; margin: 6mm 8mm; }' +
    'body { font-family: Arial, Helvetica, sans-serif; color: #000000; margin: 0; padding: 0; font-size: 8.5pt; line-height: 1.25; }' +
    '.header-table { width: 100%; border-collapse: collapse; margin-bottom: 3px; }' +
    '.header-table td { vertical-align: middle; border: none; padding: 0; }' +
    '.flag-bar { width: 100%; height: 3.5px; border-collapse: collapse; margin: 3px 0 5px 0; }' +
    '.flag-bar td { border: none; padding: 0; height: 3.5px; }' +
    '.title-box { text-align: center; margin-bottom: 5px; }' +
    '.title-box h2 { margin: 0; font-size: 12pt; color: #005c30; text-decoration: underline; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px; }' +
    '.title-box p { margin: 1px 0 0 0; font-size: 9pt; font-weight: bold; color: #1e293b; }' +
    '.meta-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 8.5pt; background: #f8fafc; }' +
    '.meta-table td { border: 1px solid #64748b; padding: 3px 6px; }' +
    'table.main-tbl { width: 100%; border-collapse: collapse; border: 1.5px solid #000; }' +
    'table.main-tbl th { border: 1.2px solid #000; padding: 4px 5px; text-align: center; font-size: 8.5pt; background-color: #e9eff7; color: #003573; font-weight: bold; text-transform: uppercase; }' +
    '.footer-grid { width: 100%; border-collapse: collapse; margin-top: 6px; }' +
    '.footer-grid td { border: none; vertical-align: top; width: 50%; text-align: center; font-size: 8.5pt; }' +
    '</style></head><body>' +

    bannerHtml +

    '<table class="header-table"><tr>' +
      '<td style="width: 20%; text-align: left;">' + logoHtml + '</td>' +
      '<td style="width: 60%; text-align: center;">' +
        '<div style="font-size: 8.5pt; font-weight: bold; letter-spacing: 0.8px; color: #1e293b; text-transform: uppercase;">RÉPUBLIQUE DU BÉNIN — MINISTÈRE DE LA SANTÉ</div>' +
        '<div style="font-size: 11pt; font-weight: 900; color: #005c30; margin: 1px 0;">POLITIQUE NATIONALE DE SANTÉ COMMUNAUTAIRE (PNSC)</div>' +
        '<div style="font-size: 7.5pt; font-weight: bold; color: #64748b;">DISPOSITIF COMMUNAUTAIRE DE PROXIMITÉ : RELAIS COMMUNAUTAIRES (RC) & ASCQ</div>' +
      '</td>' +
      '<td style="width: 20%; text-align: right; font-size: 7pt; line-height: 1.2; color: #475569;">' +
        '<strong>Contact Ministère :</strong><br>' +
        '01 BP 882 Cotonou<br>' +
        'Tél : +229 21 33 21 78<br>' +
        'sante.infos@gouv.bj' +
      '</td>' +
    '</tr></table>' +

    '<table class="flag-bar"><tr>' +
      '<td style="background:#008751; width:33.3%;"></td>' +
      '<td style="background:#FCD116; width:33.3%;"></td>' +
      '<td style="background:#E8112D; width:33.4%;"></td>' +
    '</tr></table>' +

    '<div class="title-box">' +
      '<h2>PLANNING HEBDOMADAIRE D\\'ACTIVITÉS DU RELAIS COMMUNAUTAIRE</h2>' +
      '<p>Semaine Épidémiologique N° ' + esc(data.semaineNum) + ' (Du ' + esc(data.dateDebutStr) + ' au ' + esc(data.dateFinStr) + ')</p>' +
    '</div>' +

    '<table class="meta-table">' +
      '<tr>' +
        '<td style="width:33%;"><strong>DÉPARTEMENT :</strong> ' + esc(data.departement).toUpperCase() + '</td>' +
        '<td style="width:34%;"><strong>ZONE SANITAIRE :</strong> ' + esc(data.zoneSanitaire).toUpperCase() + '</td>' +
        '<td style="width:33%;"><strong>COMMUNE :</strong> ' + esc(data.commune).toUpperCase() + '</td>' +
      '</tr>' +
      '<tr>' +
        '<td><strong>ARRONDISSEMENT :</strong> ' + esc(data.arrondissement).toUpperCase() + '</td>' +
        '<td><strong>VILLAGE / QUARTIER :</strong> ' + esc(data.village).toUpperCase() + '</td>' +
        '<td><strong>GRAPPE N° :</strong> ' + esc(data.grappe) + '</td>' +
      '</tr>' +
      '<tr>' +
        '<td colspan="2"><strong>NOM ET PRÉNOM(S) DU RC :</strong> ' + esc(data.rcName).toUpperCase() + '</td>' +
        '<td><strong>CONTACT (Tél) :</strong> ' + esc(data.rcPhone) + '</td>' +
      '</tr>' +
    '</table>' +

    '<table class="main-tbl">' +
      '<thead>' +
        '<tr>' +
          '<th style="width:26%;">Activités Planifiées</th>' +
          '<th style="width:10%;">Date</th>' +
          '<th style="width:9%;">Heure</th>' +
          '<th style="width:24%;">Zone / Cible</th>' +
          '<th style="width:11%;">Quantité</th>' +
          '<th style="width:20%;">Observations</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' + rowsHtml + '</tbody>' +
    '</table>' +

    '<table class="footer-grid"><tr>' +
      '<td><strong>Signature du Relais Communautaire (RC)</strong>' + sigRcHtml + '<u>' + esc(data.rcName) + '</u></td>' +
      '<td><strong>Lu et approuvé par l\\'ASCQ</strong>' + sigAscqHtml + '<u>' + esc(data.ascqName || "L'ASCQ Superviseur") + '</u></td>' +
    '</tr></table>' +

    '</body></html>';

  var blob = Utilities.newBlob(htmlContent, 'text/html', 'planning_rc.html');
  var pdf = blob.getAs('application/pdf');
  var safeName = "PLANNING_RC_S" + data.semaineNum + "_" + (data.commune || "BENIN") + "_" + (data.rcName || "RC").replace(/\\s+/g, '_');
  pdf.setName(safeName.toUpperCase() + ".pdf");

  var savedFile = folder.createFile(pdf);
  savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return savedFile.getUrl();
}

function getAllRcPlanningsOnly() {
  try {
    var ss = getOrCreateRcPlanningSheet();
    var sheet = ss.getActiveSheet();
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    var list = [];
    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      list.push({
        id: String(r[0]),
        timestamp: String(r[1]),
        departement: String(r[2]),
        zoneSanitaire: String(r[3]),
        commune: String(r[4]),
        arrondissement: String(r[5]),
        village: String(r[6]),
        grappe: String(r[7]),
        rcName: String(r[8]),
        rcPhone: String(r[9]),
        semaineNum: String(r[10]),
        dateDebutStr: String(r[11]),
        dateFinStr: String(r[12]),
        pdfUrl: String(r[22] || '')
      });
    }
    return list.reverse();
  } catch (e) {
    return [];
  }
}

function getOrCreateRcPlanningSheet() {
  var fileName = "Plannings_Hebdo_RC_Benin";
  var files = DriveApp.getFilesByName(fileName);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  } else {
    var ss = SpreadsheetApp.create(fileName);
    var sheet = ss.getActiveSheet();
    sheet.setName("Plannings_RC");
    var headers = [
      "ID", "Horodatage", "Département", "Zone Sanitaire", "Commune", "Arrondissement", 
      "Village", "Grappe", "Nom RC", "Tél RC", "Semaine N°", "Début", "Fin",
      "VAD", "Causeries/Salubrité", "Santé animale", "Affaires sociales",
      "Femmes enceintes", "Enfants 0-59 mois", "Personnes référées", "Autres",
      "Observations", "Lien PDF Drive"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#005c30").setFontColor("#ffffff");
    return ss;
  }
}
`;

fs.writeFileSync(path.join(__dirname, '../plannings-modeles-officiels/Code_Planning_RC.gs'), codeGs, 'utf8');
console.log('✓ Code_Planning_RC.gs créé avec succès !');

// 2. GÉNÉRATION DE Planning_Hebdo_ASCQ.html (Formulaire & Fiche A4 Paysage CNLS-TP)
const planningAscqHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Planning Hebdomadaire des ASCQ - CNLS-TP Bénin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      @page { 
        size: A4 landscape; 
        margin: 5mm 6mm; 
      }
      html, body { 
        width: 297mm !important; 
        height: 210mm !important;
        margin: 0 !important; 
        padding: 0 !important; 
        background: #ffffff !important; 
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print { display: none !important; }
      .print-only-container { 
        display: block !important; 
        position: absolute !important; 
        top: 0 !important; 
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: #ffffff !important; 
      }
      .pdf-sheet { 
        box-shadow: none !important; 
        border: none !important;
        width: 285mm !important; 
        margin: 0 auto !important;
        padding: 0 !important;
        page-break-inside: avoid !important;
      }
    }
  </style>
</head>
<body class="bg-slate-100 text-slate-800 antialiased min-h-screen">

  <!-- CONTENEUR DU MODULE PLANNING -->
  <div id="planningModuleContainer" class="no-print max-w-4xl mx-auto p-3 sm:p-5">
    
    <!-- Bannière officielle CNLS-TP en tête du formulaire -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
      <img src="${logoAsc}" alt="ASC Santé Communautaire" class="h-14 object-contain" />
      <img src="${bannerCnls}" alt="CNLS-TP Présidence du Bénin" class="h-12 sm:h-14 object-contain max-w-full" />
    </div>

    <!-- Navigation du module Planning -->
    <div class="flex border-b border-slate-200 mb-5 bg-white rounded-2xl overflow-hidden shadow-sm">
      <button id="plnTabFormBtn" onclick="plnSwitchTab('form')" class="flex-1 py-3 px-4 font-bold text-xs sm:text-sm text-center border-b-2 border-emerald-700 text-emerald-800 bg-emerald-50/60 flex items-center justify-center gap-2 transition">
        <span>📝</span> Saisir mon Planning
      </button>
      <button id="plnTabListBtn" onclick="plnSwitchTab('list')" class="flex-1 py-3 px-4 font-bold text-xs sm:text-sm text-center border-b-2 border-transparent text-slate-500 hover:text-emerald-700 flex items-center justify-center gap-2 transition">
        <span>📊</span> Historique des Plannings
      </button>
    </div>

    <!-- VUE 1 : FORMULAIRE DE SAISIE -->
    <div id="plnTabForm" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-7">
      
      <div class="text-center pb-4 mb-6 border-b-2 border-emerald-700">
        <div class="font-extrabold text-sm sm:text-base text-slate-900 tracking-wider uppercase">RÉPUBLIQUE DU BÉNIN</div>
        <div class="font-bold text-[11px] sm:text-xs text-slate-600 uppercase">PRÉSIDENCE DE LA RÉPUBLIQUE</div>
        <div class="font-black text-base sm:text-lg text-emerald-800 uppercase mt-0.5">CNLS-TP (SECRÉTARIAT EXÉCUTIF)</div>
        <div class="h-1 w-44 my-2 mx-auto rounded-full bg-gradient-to-r from-emerald-600 via-amber-400 to-red-600"></div>
        <div class="font-bold text-xs sm:text-sm text-slate-700 uppercase tracking-wide">PLANNING HEBDOMADAIRE DES ASCQ</div>
      </div>

      <form id="planningForm" onsubmit="plnHandleFormSubmit(event)">

        <!-- SECTION 1 – Identification Nationale -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 border-l-4 border-l-emerald-700 mb-5">
          <div class="font-extrabold text-xs text-emerald-800 uppercase mb-3 tracking-wider flex items-center gap-2">
            <span>📍</span> SECTION 1 – Identification Géographique & Période
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label class="block font-bold text-xs mb-1 text-slate-700">Département *</label>
              <select id="plnDepartement" required onchange="plnOnDeptChange()" class="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600">
                <option value="">-- Choisir le département --</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-xs mb-1 text-slate-700">Commune *</label>
              <select id="plnCommune" required disabled onchange="plnOnCommuneChange()" class="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-xl bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-emerald-600">
                <option value="">-- Choisir la commune --</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-xs mb-1 text-slate-700">Arrondissement *</label>
              <select id="plnArrondissement" required disabled class="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-xl bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-emerald-600">
                <option value="">-- Choisir l'arrondissement --</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block font-bold text-xs mb-1 text-slate-700">Nom et Prénoms de l'ASCQ *</label>
              <input type="text" id="plnAscqName" required placeholder="Ex: DOSSOU Jean-Baptiste" class="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 uppercase">
            </div>

            <div>
              <label class="block font-bold text-xs mb-1 text-slate-700">Contact téléphonique (Flotte / WhatsApp) *</label>
              <input type="tel" id="plnAscqPhone" required placeholder="Ex: +229 01 97 00 00 00" class="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-bold text-xs mb-1 text-slate-700">Début de semaine (Lundi) *</label>
              <input type="date" id="plnDateDebut" required onchange="plnCalculateWeek()" class="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600">
            </div>

            <div>
              <label class="block font-bold text-xs mb-1 text-slate-700">Période couverte</label>
              <input type="text" id="plnPeriodeStr" readonly placeholder="Calcul automatique..." class="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-emerald-50/60 font-bold text-emerald-900">
            </div>

            <div>
              <label class="block font-bold text-xs mb-1 text-slate-700">Semaine Épidémiologique</label>
              <input type="number" id="plnSemaineNum" readonly placeholder="Auto" class="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-emerald-50/60 font-extrabold text-emerald-900 text-center">
            </div>
          </div>
        </div>

        <!-- SECTION 2 – Relais Communautaires -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 border-l-4 border-l-emerald-700 mb-5">
          <div class="font-extrabold text-xs text-emerald-800 uppercase mb-3 tracking-wider flex items-center gap-2">
            <span>👥</span> SECTION 2 – Relais Communautaires (RC)
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-xs mb-1 text-slate-700">Nombre de RC planifiés *</label>
              <input type="number" id="plnRcPlanifies" required min="0" oninput="plnCheckRcEcart()" class="w-full p-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600">
            </div>

            <div>
              <label class="block font-bold text-xs mb-1 text-slate-700">Nombre de RC attendus dans l'arrondissement *</label>
              <input type="number" id="plnRcAttendus" required min="0" oninput="plnCheckRcEcart()" class="w-full p-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600">
            </div>

            <div id="plnMotifContainer" class="sm:col-span-2 hidden">
              <label class="block font-bold text-xs text-red-600 mb-1">Motif de l'écart (Obligatoire si différent) *</label>
              <textarea id="plnMotifEcart" rows="2" placeholder="Expliquez la cause de la différence entre le nombre de RC planifiés et attendus..." class="w-full p-2.5 text-xs border border-red-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500 font-medium"></textarea>
            </div>
          </div>
        </div>

        <!-- SECTION 3 – Activités de la semaine (10 activités officielles CNLS-TP) -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 border-l-4 border-l-emerald-700 mb-5">
          <div class="font-extrabold text-xs text-emerald-800 uppercase mb-1 tracking-wider flex items-center gap-2">
            <span>📋</span> SECTION 3 – Activités officielles de la semaine (CNLS-TP)
          </div>
          <p class="text-xs text-slate-500 mb-3">Sélectionnez les jours d'exécution prévus pour chacune des 10 activités clés :</p>
          <div id="plnActivitiesList" class="space-y-2.5"></div>
        </div>

        <!-- SECTION 4 – Autre activité personnalisée -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 border-l-4 border-l-emerald-700 mb-5">
          <div class="font-extrabold text-xs text-emerald-800 uppercase mb-3 tracking-wider flex items-center gap-2">
            <span>➕</span> SECTION 4 – Autre activité (Optionnelle)
          </div>
          <div class="space-y-3">
            <div>
              <label class="block font-bold text-xs mb-1 text-slate-700">Libellé de l'activité complémentaire</label>
              <input type="text" id="plnAutreActiviteNom" placeholder="Ex: Réunion de crise sanitaire, campagne de vaccination ciblée..." class="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-xl bg-white">
            </div>
            <div>
              <label class="block font-bold text-xs mb-1 text-slate-700">Jours concernés</label>
              <div id="plnAutreActDaysGrid" class="grid grid-cols-4 sm:grid-cols-7 gap-1.5"></div>
            </div>
          </div>
        </div>

        <!-- SECTION 5 – Observations générales -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 border-l-4 border-l-emerald-700 mb-5">
          <div class="font-extrabold text-xs text-emerald-800 uppercase mb-2 tracking-wider flex items-center gap-2">
            <span>📝</span> SECTION 5 – Observations Générales
          </div>
          <textarea id="plnObservations" rows="2" placeholder="Observations générales couvrant l'ensemble du planning de la semaine (Optionnel)..." class="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white font-medium"></textarea>
        </div>

        <!-- SECTION 6 – Signature manuscrite de l'ASCQ -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 border-l-4 border-l-emerald-700 mb-6">
          <div class="font-extrabold text-xs text-emerald-800 uppercase mb-2 tracking-wider flex items-center gap-2">
            <span>✍️</span> SECTION 6 – Signature & Engagement de l'ASCQ
          </div>
          <label class="block font-bold text-xs mb-1 text-slate-700">Signature manuscrite tactile de l'ASCQ *</label>
          <div class="border-2 border-dashed border-emerald-600 rounded-xl p-2 bg-white text-center">
            <canvas id="plnSignatureCanvas" class="w-full h-32 touch-none bg-white rounded-lg cursor-crosshair"></canvas>
            <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span class="text-[11px] text-slate-400">Signez au doigt sur mobile ou à la souris sur PC</span>
              <button type="button" onclick="plnClearSignature()" class="text-xs font-bold px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">
                Effacer la signature
              </button>
            </div>
          </div>
        </div>

        <button type="submit" id="plnSubmitBtn" class="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-sm rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2">
          <span>✓</span> Valider et générer la Fiche A4 Officielle
        </button>

      </form>
    </div>

    <!-- VUE 2 : HISTORIQUE DES PLANNINGS -->
    <div id="plnTabList" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-7 hidden">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 mb-5 border-b border-slate-200">
        <div>
          <h2 class="font-black text-base sm:text-lg text-emerald-950">Plannings Hebdomadaires Transmis</h2>
          <p class="text-xs text-slate-500">Retrouvez et réimprimez vos plannings hebdomadaires pour vos rapports mensuels.</p>
        </div>
        
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <input type="text" id="plnSearchFilter" oninput="plnRenderSubmissionsList()" placeholder="Rechercher (Commune, ASCQ...)" class="flex-1 sm:w-48 p-2 text-xs border border-slate-300 rounded-xl bg-white">
        </div>
      </div>

      <div id="plnSubmissionsList" class="space-y-3"></div>
    </div>

  </div>

  <!-- MODAL APERÇU & IMPRESSION A4 PAYSAGE OFFICIEL -->
  <div id="plnPreviewModal" class="print-only-container fixed inset-0 bg-slate-900/90 z-50 hidden flex-col">
    <div class="no-print bg-slate-900 text-white p-3 flex justify-between items-center gap-2 shadow-md">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
        <span class="font-bold text-xs sm:text-sm">Aperçu Fidèle Officiel CNLS-TP (Format A4 Paysage)</span>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="window.print()" class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl shadow transition flex items-center gap-1.5 active:scale-95">
          <span>🖨️</span> Imprimer / Enregistrer PDF
        </button>
        <button onclick="plnClosePreview()" class="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition">
          ✕ Fermer
        </button>
      </div>
    </div>

    <div class="preview-body flex-1 overflow-auto p-4 flex justify-center items-start bg-slate-700">
      <div id="plnSheetScaler" class="sheet-scaler transition-transform">
        <div id="plnPdfSheetRender" class="pdf-sheet bg-white shadow-2xl"></div>
      </div>
    </div>
  </div>

<script>
  // Base géographique officielle du Bénin (12 Départements, 77 Communes, 546 Arrondissements)
  const beninGeoData = {
    "Alibori": {
      "Banikoara": ["Banikoara", "Founougo", "Gomparou", "Goumori", "Kokey", "Kokiborou", "Ounet", "Sompérékou", "Soroko", "Toura"],
      "Gogounou": ["Bagou", "Gogounou", "Gounarou", "Ouara", "Sori", "Zoungou-Pantrossi"],
      "Kandi": ["Angaradébou", "Bensékou", "Donwari", "Kandi I", "Kandi II", "Kandi III", "Kassakou", "Saah", "Sam", "Sonsoro"],
      "Karimama": ["Birni-Lafia", "Bogo-Bogo", "Karimama", "Kompa", "Monsey"],
      "Malanville": ["Garou", "Guéné", "Malanville", "Mandécali", "Tomboutou"],
      "Segbana": ["Libantè", "Liboussou", "Lougou", "Segbana", "Sokotindji"]
    },
    "Atacora": {
      "Boukoumbé": ["Boukoumbé", "Dipoli", "Korontière", "Kossoucoingou", "Manta", "Natta", "Tabota"],
      "Cobly": ["Cobly", "Datori", "Kountori", "Tapoga"],
      "Kérou": ["Brignamaro", "Firou", "Kérou", "Koabagou"],
      "Kouandé": ["Birni", "Chabi-Couma", "Fô-Tancé", "Guilmaro", "Kouandé", "Oroukayo"],
      "Matéri": ["Dassari", "Gouandé", "Matéri", "Nodi", "Tantéga", "Tchianhoun-Cossi"],
      "Natitingou": ["Kotopounga", "Kouaba", "Koundata", "Natitingou I", "Natitingou II", "Natitingou III", "Natitingou IV", "Perma", "Tchoumi-Tchoumi"],
      "Péhunco": ["Gnémasson", "Péhunco", "Tobré"],
      "Tanguiéta": ["Cotiakou", "N'Dahonta", "Taiacou", "Tanguiéta", "Tanongou"],
      "Toucountouna": ["Kouarfa", "Tampégré", "Toucountouna"]
    },
    "Atlantique": {
      "Abomey-Calavi": ["Abomey-Calavi", "Akassato", "Godomey", "Glo-Djigbé", "Hêvié", "Kpanroun", "Ouèdo", "Togba", "Zinvié"],
      "Allada": ["Agbanou", "Ahouannonzoun", "Allada", "Attogon", "Avakpa", "Ayou", "Hinvi", "Lissègazoun", "Lon-Agonmey", "Sékou", "Togoudo", "Tokpa-Avagoudo"],
      "Kpomassè": ["Aganmalomè", "Agbanto", "Agonkanmè", "Dédomè", "Dékanmè", "Kpomassè", "Sègbèya", "Sègbohouè", "Tokpa-Domè"],
      "Ouidah": ["Avlékété", "Djègbadji", "Gakpé", "Houakpè-Daho", "Ouidah I", "Ouidah II", "Ouidah III", "Ouidah IV", "Pahou", "Savi"],
      "Sô-Ava": ["Ahomey-Lokpo", "Dékanmey", "Ganvié I", "Ganvié II", "Houédo-Aguékon", "Sô-Ava", "Vekky"],
      "Toffo": ["Agué", "Colli-Agbamè", "Coussi", "Damè", "Djanglanmè", "Houègbo", "Kpomè", "Sè", "Sèhouè", "Toffo-Agué"],
      "Tori-Bossito": ["Avamè", "Azohouè-Aliho", "Azohouè-Cada", "Tori-Bossito", "Tori-Cada", "Tori-Gare", "Tori-Aïdohoué", "Tori-Acadjamè"],
      "Zè": ["Adjan", "Dawè", "Djigbé", "Dodji-Bata", "Hèkanmè", "Koundokpoé", "Sèdjè-Dénou", "Sèdjè-Houégoudo", "Tangbo-Djevié", "Yokpo", "Zè"]
    },
    "Borgou": {
      "Bembéréké": ["Bembéréké", "Béroubouay", "Bouanri", "Gamia", "Ina"],
      "Kalalé": ["Basso", "Bouca", "Dérassi", "Dunkassa", "Kalalé", "Péonga"],
      "N'Dali": ["Bori", "Gbégourou", "N'Dali", "Ouénou", "Sirarou"],
      "Nikki": ["Biro", "Gnonkourakali", "Nikki", "Ouénou", "Sérékalé", "Suya", "Tasso"],
      "Parakou": ["1er Arrondissement", "2e Arrondissement", "3e Arrondissement"],
      "Pèrèrè": ["Gninsy", "Guinagourou", "Kpané", "Pébié", "Pèrèrè", "Sontou"],
      "Sinendé": ["Fô-Bourè", "Sèkèrè", "Sikki", "Sinendé"],
      "Tchaourou": ["Alafiarou", "Bétérou", "Goro", "Kika", "Sanson", "Tchaourou", "Tchatchou"]
    },
    "Collines": {
      "Bantè": ["Agoua", "Akpassi", "Atokoligbé", "Bantè", "Bobè", "Gouka", "Koko", "Lougba", "Pira"],
      "Dassa-Zoumè": ["Akofodjoulé", "Dassa I", "Dassa II", "Gbaffo", "Kèrè", "Kpingni", "Lèma", "Paouignan", "Soclogbo", "Tré"],
      "Glazoué": ["Aklankpa", "Assanté", "Glazoué", "Gomè", "Kpakpaza", "Magoumi", "Ouèdèmè", "Sokponta", "Thio", "Zaffé"],
      "Ouèssè": ["Challa-Ogoi", "Djègbè", "Gbanlin", "Kémon", "Kilibo", "Laminou", "Odougba", "Ouèssè", "Toui"],
      "Savalou": ["Djaloukou", "Doumè", "Gobada", "Kpataba", "Lahotan", "Lèma", "Logozohè", "Monkpa", "Ottola", "Ouèssè", "Savalou-Aga", "Savalou-Agbado", "Savalou-Attakè", "Tchetti"],
      "Savè": ["Adido", "Bèssè", "Boni", "Kaboua", "Ofè", "Okpara", "Plateau", "Sakin"]
    },
    "Couffo": {
      "Aplahoué": ["Aplahoué", "Atomè", "Azovè", "Dekpo", "Godohou", "Kissamey", "Lonkly"],
      "Djakotomey": ["Adjintimey", "Bètoumey", "Djakotomey I", "Djakotomey II", "Gohomey", "Houégamey", "Kinkinhoué", "Kokohoué", "Kpoba", "Sokouhoué"],
      "Dogbo": ["Ayomi", "Dèvè", "Honton", "Lokogohoué", "Madjrè", "Tota", "Totchagni"],
      "Klouékanmè": ["Adjanhonmè", "Ahogbèya", "Aya-Hohoué", "Djotto", "Hondjin", "Klouékanmè", "Lanta", "Tchikpé"],
      "Lalo": ["Adoukandji", "Ahondjinnako", "Ahomadégbé", "Banigbé", "Gnizounmè", "Hlassamè", "Lalo", "Lokogba", "Tchito", "Tohou", "Zalli"],
      "Toviklin": ["Adjido", "Avédjin", "Doko", "Houédogli", "Missinko", "Tannou-Gola", "Toviklin"]
    },
    "Donga": {
      "Bassila": ["Alédjo", "Bassila", "Manigri", "Pénéssoulou"],
      "Copargo": ["Anandana", "Copargo", "Pabégou", "Singré"],
      "Djougou": ["Barei", "Bariénou", "Bélléfoungou", "Bougou", "Djougou I", "Djougou II", "Djougou III", "Kolokondé", "Onklou", "Patargo", "Pélébina", "Sérou"],
      "Ouaké": ["Badjoudè", "Kondé", "Ouaké", "Sèmèrè I", "Sèmèrè II", "Tchalinga"]
    },
    "Littoral": {
      "Cotonou": ["1er Arrondissement", "2e Arrondissement", "3e Arrondissement", "4e Arrondissement", "5e Arrondissement", "6e Arrondissement", "7e Arrondissement", "8e Arrondissement", "9e Arrondissement", "10e Arrondissement", "11e Arrondissement", "12e Arrondissement", "13e Arrondissement"]
    },
    "Mono": {
      "Athiémé": ["Adohoun", "Atchannou", "Athiémé", "Dédékpoé", "Kpinnou"],
      "Bopa": ["Agbodji", "Badazoui", "Bopa", "Gbakpodji", "Lobogo", "Possotomè", "Yégodoé"],
      "Comè": ["Agatogbo", "Akodéha", "Comè", "Oumako", "Ouèdèmè-Pédah"],
      "Grand-Popo": ["Adjaha", "Agoué", "Avlo", "Djanglanmey", "Gbéhoué", "Grand-Popo", "Sazoué"],
      "Houéyogbé": ["Dahé", "Doutou", "Honhoué", "Houéyogbé", "Sè", "Zoungbonou"],
      "Lokossa": ["Agamè", "Houin", "Koudo", "Lokossa", "Ouèdèmè"]
    },
    "Ouémé": {
      "Adjarra": ["Adjarra I", "Adjarra II", "Aglogbè", "Honvié", "Malanhoui", "Médédjonou"],
      "Adjohoun": ["Adjohoun", "Akpadanou", "Awonou", "Azowlissè", "Dèmè", "Gangban", "Kodè", "Togbota"],
      "Aguégués": ["Avagbodji", "Houédomè", "Zoungamè"],
      "Akpro-Missérété": ["Akpro-Missérété", "Gomè-Sota", "Katagon", "Vakon", "Zoungbomè"],
      "Avrankou": ["Atchoukpa", "Avrankou", "Djomon", "Gbozounmè", "Kouty", "Ouanho", "Sado"],
      "Bonou": ["Affamè", "Atchonsa", "Bonou", "Damè-Wogon", "Houinviguè"],
      "Dangbo": ["Dangbo", "Dèkin", "Gbéko", "Houédomey", "Hozin", "Késsounou", "Zounguè"],
      "Porto-Novo": ["1er Arrondissement", "2e Arrondissement", "3e Arrondissement", "4e Arrondissement", "5e Arrondissement"],
      "Sèmè-Podji": ["Agblangandan", "Aholouyèmè", "Djèrègbé", "Ekpè", "Sèmè-Podji", "Tohouè"]
    },
    "Plateau": {
      "Adja-Ouèrè": ["Adja-Ouèrè", "Ikpinlè", "Kpoulou", "Massè", "Oko-Akarè", "Totonnoukon"],
      "Ifangni": ["Banigbé", "Daagbé", "Ifangni", "Ko-Koumolou", "Lagbé", "Tchaada"],
      "Kétou": ["Adakplamé", "Idigny", "Kpankou", "Kétou", "Odometa", "Okpometa"],
      "Pobè": ["Ahoyéyé", "Igana", "Issaba", "Pobè", "Towé"],
      "Sakété": ["Aguidi", "Ita-Djèbou", "Sakété I", "Sakété II", "Takon", "Yoko"]
    },
    "Zou": {
      "Abomey": ["Agbokpa", "Dètohou", "Djègbè", "Hounli", "Sèhoun", "Vidolè", "Zounzounmè"],
      "Agbangnizoun": ["Adahondjigon", "Adingningon", "Agbangnizoun", "Kinta", "Kpota", "Lissazounmè", "Sahé", "Siwé", "Tanvé", "Zoungoudo"],
      "Bohicon": ["Agongointo", "Avogbanna", "Bohicon I", "Bohicon II", "Gnidjazoun", "Lissèzoun", "Ouassaho", "Passagon", "Saclo", "Sodohomè"],
      "Covè": ["Adogbé", "Gounli", "Houéko", "Houen-Hounso", "Lainta-Cogbè", "Naogon", "Soli", "Zogba"],
      "Djidja": ["Agondji", "Agouna", "Dan", "Djidja", "Dohouimè", "Gobaix", "Monsourou", "Mougnon", "Oungbègamè", "Outo", "Setto", "Zoukon"],
      "Ouinhi": ["Dasso", "Ouinhi-Centre", "Sagon", "Tohouès"],
      "Zagnanado": ["Agonli-Houégbo", "Banamè", "N'-Tan", "Dovi", "Kpédékpo", "Zagnanado"],
      "Za-Kpota": ["Allahè", "Assalin", "Houngomey", "Kpakpamè", "Kpozoun", "Za-Kpota", "Za-Tanta", "Zèko"],
      "Zogbodomey": ["Akiza", "Avlamè", "Cana I", "Cana II", "Domè", "Koussoukpa", "Kpokissa", "Massi", "Tanwé-Hessou", "Zogbodomey", "Zoukou"]
    }
  };

  const plnActivities = [
    "Causerie éducative",
    "Sensibilisation / démonstration / salubrité",
    "Vaccination poste fixe/avancée",
    "Supervision RC et validation VAD",
    "Prise en charge communautaire des cas (iCCM)",
    "Visites des sites prioritaires",
    "Visites à domicile et dépistage actif",
    "Campagne spécifique de santé publique",
    "Suivi groupé et orientation des RC",
    "Formation continue des RC"
  ];

  const plnDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  let plnCurrentData = {};
  let plnAllSubmissions = [];

  function initPlanningModule() {
    plnPopulateDepartements();
    plnBuildActivitiesUI();
    plnLoadLocalSubmissions();
    setTimeout(plnSetupCanvasHD, 150);
  }

  window.addEventListener('DOMContentLoaded', initPlanningModule);

  function plnPopulateDepartements() {
    const deptSelect = document.getElementById("plnDepartement");
    if (!deptSelect) return;
    const depts = Object.keys(beninGeoData).sort();
    deptSelect.innerHTML = '<option value="">-- Choisir le département --</option>' + 
      depts.map(d => '<option value="' + d + '">' + d + '</option>').join('');
  }

  function plnOnDeptChange() {
    const dept = document.getElementById("plnDepartement").value;
    const comSelect = document.getElementById("plnCommune");
    const arrSelect = document.getElementById("plnArrondissement");

    arrSelect.innerHTML = '<option value="">-- Choisir l\\'arrondissement --</option>';
    arrSelect.disabled = true;

    if (dept && beninGeoData[dept]) {
      const communes = Object.keys(beninGeoData[dept]).sort();
      comSelect.innerHTML = '<option value="">-- Choisir la commune --</option>' + 
        communes.map(c => '<option value="' + c + '">' + c + '</option>').join('');
      comSelect.disabled = false;
    } else {
      comSelect.innerHTML = '<option value="">-- Choisir la commune --</option>';
      comSelect.disabled = true;
    }
  }

  function plnOnCommuneChange() {
    const dept = document.getElementById("plnDepartement").value;
    const com = document.getElementById("plnCommune").value;
    const arrSelect = document.getElementById("plnArrondissement");

    if (dept && com && beninGeoData[dept] && beninGeoData[dept][com]) {
      const arrs = beninGeoData[dept][com].slice().sort();
      arrSelect.innerHTML = '<option value="">-- Choisir l\\'arrondissement --</option>' + 
        arrs.map(a => '<option value="' + a + '">' + a + '</option>').join('');
      arrSelect.disabled = false;
    } else {
      arrSelect.innerHTML = '<option value="">-- Choisir l\\'arrondissement --</option>';
      arrSelect.disabled = true;
    }
  }

  function plnBuildActivitiesUI() {
    const container = document.getElementById("plnActivitiesList");
    if (!container) return;
    container.innerHTML = plnActivities.map((act, idx) => \`
      <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div class="font-bold text-xs text-slate-800 mb-2">\${idx + 1}. \${act}</div>
        <div class="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          \${plnDays.map(d => \`
            <label class="flex items-center justify-center p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-emerald-50 transition">
              <input type="checkbox" name="pln_act_\${idx + 1}" value="\${d}" class="mr-1.5 accent-emerald-700 w-3.5 h-3.5"> \${d}
            </label>
          \`).join('')}
        </div>
      </div>
    \`).join('');

    const autreGrid = document.getElementById("plnAutreActDaysGrid");
    if (autreGrid) {
      autreGrid.innerHTML = plnDays.map(d => \`
        <label class="flex items-center justify-center p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-emerald-50 transition">
          <input type="checkbox" name="pln_autre_days" value="\${d}" class="mr-1.5 accent-emerald-700 w-3.5 h-3.5"> \${d}
        </label>
      \`).join('');
    }
  }

  function plnCalculateWeek() {
    const dateInput = document.getElementById("plnDateDebut").value;
    if (!dateInput) return;

    const parts = dateInput.split('-');
    const startDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const fmt = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    document.getElementById("plnPeriodeStr").value = 'Du ' + fmt(startDate) + ' au ' + fmt(endDate);

    const target = new Date(startDate.valueOf());
    const dayNr = (startDate.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    const semaine = 1 + Math.round((firstThursday - target) / 604800000);
    document.getElementById("plnSemaineNum").value = semaine;
  }

  function plnCheckRcEcart() {
    const planifies = parseInt(document.getElementById("plnRcPlanifies").value, 10);
    const attendus = parseInt(document.getElementById("plnRcAttendus").value, 10);
    const motifContainer = document.getElementById("plnMotifContainer");
    const motifEcart = document.getElementById("plnMotifEcart");

    if (!isNaN(planifies) && !isNaN(attendus) && planifies !== attendus) {
      motifContainer.classList.remove("hidden");
      motifEcart.required = true;
    } else {
      motifContainer.classList.add("hidden");
      motifEcart.required = false;
      motifEcart.value = "";
    }
  }

  // Canvas Signature
  const plnCanvas = document.getElementById("plnSignatureCanvas");
  const plnCtx = plnCanvas.getContext("2d");
  let plnIsDrawing = false;
  let plnHasSigned = false;

  function plnSetupCanvasHD() {
    if (!plnCanvas) return;
    const rect = plnCanvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = window.devicePixelRatio || 1;
    plnCanvas.width = rect.width * ratio;
    plnCanvas.height = rect.height * ratio;
    plnCtx.scale(ratio, ratio);
    plnCtx.lineWidth = 2.5;
    plnCtx.strokeStyle = "#000080";
    plnCtx.lineCap = "round";
    plnCtx.lineJoin = "round";
  }

  window.addEventListener("resize", plnSetupCanvasHD);

  function plnGetPos(e) {
    const rect = plnCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  plnCanvas.addEventListener("touchstart", (e) => { plnIsDrawing = true; plnHasSigned = true; const p = plnGetPos(e); plnCtx.beginPath(); plnCtx.moveTo(p.x, p.y); e.preventDefault(); });
  plnCanvas.addEventListener("touchmove", (e) => { if (plnIsDrawing) { const p = plnGetPos(e); plnCtx.lineTo(p.x, p.y); plnCtx.stroke(); } e.preventDefault(); });
  plnCanvas.addEventListener("touchend", () => { plnIsDrawing = false; });
  plnCanvas.addEventListener("mousedown", (e) => { plnIsDrawing = true; plnHasSigned = true; const p = plnGetPos(e); plnCtx.beginPath(); plnCtx.moveTo(p.x, p.y); });
  plnCanvas.addEventListener("mousemove", (e) => { if (plnIsDrawing) { const p = plnGetPos(e); plnCtx.lineTo(p.x, p.y); plnCtx.stroke(); } });
  plnCanvas.addEventListener("mouseup", () => { plnIsDrawing = false; });

  function plnClearSignature() {
    plnCtx.clearRect(0, 0, plnCanvas.width, plnCanvas.height);
    plnHasSigned = false;
  }

  function plnHandleFormSubmit(e) {
    e.preventDefault();
    if (!plnHasSigned) {
      alert("Veuillez apposer votre signature manuscrite tactile avant de valider.");
      return;
    }

    const getChecked = (name) => Array.from(document.querySelectorAll('input[name="' + name + '"]:checked')).map(c => c.value);
    const dateInput = document.getElementById("plnDateDebut").value;
    const parts = dateInput.split('-');
    const startDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const fmt = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();

    plnCurrentData = {
      id: Date.now(),
      departement: document.getElementById("plnDepartement").value,
      commune: document.getElementById("plnCommune").value,
      arrondissement: document.getElementById("plnArrondissement").value,
      ascqName: document.getElementById("plnAscqName").value.trim().toUpperCase(),
      ascqPhone: document.getElementById("plnAscqPhone").value.trim(),
      dateDebutStr: fmt(startDate),
      dateFinStr: fmt(endDate),
      semaineNum: document.getElementById("plnSemaineNum").value,
      rcPlanifies: document.getElementById("plnRcPlanifies").value,
      rcAttendus: document.getElementById("plnRcAttendus").value,
      motifEcart: document.getElementById("plnMotifEcart").value,
      act1: getChecked("pln_act_1"),
      act2: getChecked("pln_act_2"),
      act3: getChecked("pln_act_3"),
      act4: getChecked("pln_act_4"),
      act5: getChecked("pln_act_5"),
      act6: getChecked("pln_act_6"),
      act7: getChecked("pln_act_7"),
      act8: getChecked("pln_act_8"),
      act9: getChecked("pln_act_9"),
      act10: getChecked("pln_act_10"),
      autreActiviteNom: document.getElementById("plnAutreActiviteNom").value.trim(),
      autreActiviteJours: getChecked("pln_autre_days"),
      observations: document.getElementById("plnObservations").value.trim(),
      signatureData: plnCanvas.toDataURL()
    };

    plnSaveToLocal(plnCurrentData);
    plnOpenPreviewCurrent();
  }

  function plnSaveToLocal(data) {
    let items = [];
    const saved = localStorage.getItem("ascq_cnlstp_plannings");
    if (saved) { try { items = JSON.parse(saved); } catch(e){} }
    items = items.filter(i => String(i.id) !== String(data.id));
    items.unshift(data);
    localStorage.setItem("ascq_cnlstp_plannings", JSON.stringify(items));
    plnAllSubmissions = items;
    plnRenderSubmissionsList();
  }

  function plnLoadLocalSubmissions() {
    const saved = localStorage.getItem("ascq_cnlstp_plannings");
    if (saved) {
      try { plnAllSubmissions = JSON.parse(saved); plnRenderSubmissionsList(); } catch(e){}
    }
  }

  function plnSwitchTab(tab) {
    const tabForm = document.getElementById("plnTabForm");
    const tabList = document.getElementById("plnTabList");
    const btnForm = document.getElementById("plnTabFormBtn");
    const btnList = document.getElementById("plnTabListBtn");

    if (tab === 'form') {
      tabForm.classList.remove("hidden");
      tabList.classList.add("hidden");
      btnForm.className = "flex-1 py-3 px-4 font-bold text-xs sm:text-sm text-center border-b-2 border-emerald-700 text-emerald-800 bg-emerald-50/60 flex items-center justify-center gap-2 transition";
      btnList.className = "flex-1 py-3 px-4 font-bold text-xs sm:text-sm text-center border-b-2 border-transparent text-slate-500 hover:text-emerald-700 flex items-center justify-center gap-2 transition";
      setTimeout(plnSetupCanvasHD, 100);
    } else {
      tabForm.classList.add("hidden");
      tabList.classList.remove("hidden");
      btnList.className = "flex-1 py-3 px-4 font-bold text-xs sm:text-sm text-center border-b-2 border-emerald-700 text-emerald-800 bg-emerald-50/60 flex items-center justify-center gap-2 transition";
      btnForm.className = "flex-1 py-3 px-4 font-bold text-xs sm:text-sm text-center border-b-2 border-transparent text-slate-500 hover:text-emerald-700 flex items-center justify-center gap-2 transition";
      plnRenderSubmissionsList();
    }
  }

  function plnRenderSubmissionsList() {
    const query = (document.getElementById("plnSearchFilter").value || "").toLowerCase();
    const container = document.getElementById("plnSubmissionsList");

    let items = plnAllSubmissions;
    if (query) {
      items = items.filter(s => 
        (s.commune || "").toLowerCase().includes(query) ||
        (s.arrondissement || "").toLowerCase().includes(query) ||
        (s.ascqName || "").toLowerCase().includes(query) ||
        String(s.semaineNum || "").includes(query)
      );
    }

    if (items.length === 0) {
      container.innerHTML = '<div class="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">Aucun planning enregistré pour le moment.</div>';
      return;
    }

    container.innerHTML = items.map(sub => \`
      <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-emerald-500 transition">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-bold text-sm text-emerald-950">\${sub.commune} - \${sub.arrondissement}</span>
            <span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full">Semaine \${sub.semaineNum}</span>
          </div>
          <div class="text-xs text-slate-700 font-bold">\${sub.ascqName} <span class="text-slate-400 font-normal">(\${sub.departement})</span></div>
          <div class="text-[11px] text-slate-400 mt-0.5">Du \${sub.dateDebutStr} au \${sub.dateFinStr}</div>
        </div>

        <button onclick="plnOpenPreviewById('\${sub.id}')" class="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5">
          <span>🔍</span> Ouvrir Fiche A4
        </button>
      </div>
    \`).join('');
  }

  function plnOpenPreviewCurrent() {
    plnRenderPdfSheet(plnCurrentData);
    document.getElementById("plnPreviewModal").classList.remove("hidden");
    document.getElementById("plnPreviewModal").classList.add("flex");
  }

  function plnOpenPreviewById(id) {
    const item = plnAllSubmissions.find(s => String(s.id) === String(id));
    if (item) {
      plnRenderPdfSheet(item);
      document.getElementById("plnPreviewModal").classList.remove("hidden");
      document.getElementById("plnPreviewModal").classList.add("flex");
    }
  }

  function plnClosePreview() {
    document.getElementById("plnPreviewModal").classList.add("hidden");
    document.getElementById("plnPreviewModal").classList.remove("flex");
  }

  function plnRenderPdfSheet(data) {
    const daysArr = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const hasAutre = data.autreActiviteNom && data.autreActiviteNom.trim() !== '';
    const totalRows = plnActivities.length + (hasAutre ? 1 : 0);
    const obsText = (data.observations && data.observations.trim() !== '') ? data.observations : 'Néant';

    let tableRows = plnActivities.map((actName, idx) => {
      let selectedDays = data['act' + (idx + 1)] || [];
      let daysCells = daysArr.map(d => selectedDays.includes(d) 
        ? '<span style="color:#005c30; font-weight:900; font-size:13px;">✔</span>' 
        : '<span style="color:#94a3b8; font-size:11px;">-</span>'
      ).join('</td><td style="border:1.2px solid #000; text-align:center; padding:2px;">');
      
      let numStr = String(idx + 1).padStart(2, '0');
      let obsTd = (idx === 0) ? \`<td rowspan="\${totalRows}" style="border:1.2px solid #000; padding:4px 6px; text-align:left; vertical-align:middle; font-size:8.5pt; word-break:break-word; background:#ffffff;">\${obsText}</td>\` : '';

      return \`
        <tr>
          <td style="border:1.2px solid #000; padding:2px; text-align:center; font-weight:bold; font-size:8.5pt; background:#f8fafc;">\${numStr}</td>
          <td style="border:1.2px solid #000; padding:3px 6px; text-align:left; font-weight:bold; font-size:8.5pt;">\${actName}</td>
          <td style="border:1.2px solid #000; padding:2px; text-align:center; font-weight:bold; font-size:8.5pt;">ASCQ</td>
          <td style="border:1.2px solid #000; padding:2px; text-align:center;">\${daysCells}</td>
          \${obsTd}
        </tr>
      \`;
    }).join('');

    if (hasAutre) {
      let selectedAutreDays = data.autreActiviteJours || [];
      let autreDaysCells = daysArr.map(d => selectedAutreDays.includes(d) 
        ? '<span style="color:#005c30; font-weight:900; font-size:13px;">✔</span>' 
        : '<span style="color:#94a3b8; font-size:11px;">-</span>'
      ).join('</td><td style="border:1.2px solid #000; text-align:center; padding:2px;">');

      tableRows += \`
        <tr>
          <td style="border:1.2px solid #000; padding:2px; text-align:center; font-weight:bold; font-size:8.5pt; background:#f8fafc;">11</td>
          <td style="border:1.2px solid #000; padding:3px 6px; text-align:left; font-weight:bold; font-size:8.5pt;">\${data.autreActiviteNom}</td>
          <td style="border:1.2px solid #000; padding:2px; text-align:center; font-weight:bold; font-size:8.5pt;">ASCQ</td>
          <td style="border:1.2px solid #000; padding:2px; text-align:center;">\${autreDaysCells}</td>
        </tr>
      \`;
    }

    const sheetHTML = \`
      <div style="width:285mm; min-height:192mm; padding:5mm 7mm; box-sizing:border-box; font-family:Arial, Helvetica, sans-serif; color:#000000; display:flex; flex-direction:column; justify-content:space-between; background:#ffffff;">
        
        <div>
          <!-- Bannière officielle CNLS-TP & Présidence du Bénin -->
          <img src="${bannerCnls}" style="width:100%; max-height:46px; object-fit:contain; display:block; margin:0 auto 2px auto;" />

          <table style="width:100%; border-collapse:collapse; margin-bottom:2px;">
            <tr>
              <td style="width:15%; vertical-align:middle;">
                <img src="${logoAsc}" style="max-height:50px; display:block;" />
              </td>
              <td style="width:70%; text-align:center; vertical-align:middle;">
                <div style="font-weight:900; font-size:11.5pt; text-transform:uppercase; color:#005c30; letter-spacing:0.5px;">
                  PLANNING HEBDOMADAIRE D'ACTIVITÉS DES ASCQ
                </div>
                <div style="font-size:9pt; font-weight:bold; color:#1e293b; margin-top:1px;">
                  Semaine Épidémiologique N° \${data.semaineNum} — Du \${data.dateDebutStr} au \${data.dateFinStr}
                </div>
                <div style="font-size:8pt; font-weight:bold; color:#005c30; text-transform:uppercase; margin-top:1px;">
                  DÉPARTEMENT : <u>\${(data.departement || '').toUpperCase()}</u> — COMMUNE : <u>\${(data.commune || '').toUpperCase()}</u> — ARRONDISSEMENT : <u>\${(data.arrondissement || '').toUpperCase()}</u>
                </div>
              </td>
              <td style="width:15%; text-align:right; vertical-align:middle; font-size:7pt; color:#475569; line-height:1.2;">
                <strong>CNLS-TP</strong><br>
                Santé Communautaire<br>
                Bénin
              </td>
            </tr>
          </table>

          <div style="height:3px; width:100%; margin-bottom:4px; background:linear-gradient(to right, #008751 33.3%, #FCD116 33.3% 66.6%, #E8112D 66.6%);"></div>

          <!-- Tableau officiel A4 Paysage -->
          <table style="width:100%; border-collapse:collapse; border:1.5px solid #000000;">
            <thead>
              <tr style="background-color:#e9eff7; font-weight:bold; font-size:8.5pt; color:#003573;">
                <th rowspan="2" style="border:1.2px solid #000000; padding:3px 2px; width:3.5%; text-align:center;">N°</th>
                <th rowspan="2" style="border:1.2px solid #000000; padding:3px 6px; width:38%; text-align:center;">ACTIVITÉS</th>
                <th rowspan="2" style="border:1.2px solid #000000; padding:3px 2px; width:6%; text-align:center;">RESP.</th>
                <th colspan="7" style="border:1.2px solid #000000; padding:2px; width:28.5%; text-align:center;">PÉRIODES</th>
                <th rowspan="2" style="border:1.2px solid #000000; padding:3px 4px; width:24%; text-align:center;">OBSERVATIONS</th>
              </tr>
              <tr style="background-color:#e9eff7; font-weight:bold; font-size:8pt; color:#003573;">
                <th style="border:1.2px solid #000000; padding:2px; width:4%;">L</th>
                <th style="border:1.2px solid #000000; padding:2px; width:4%;">M</th>
                <th style="border:1.2px solid #000000; padding:2px; width:4%;">M</th>
                <th style="border:1.2px solid #000000; padding:2px; width:4%;">J</th>
                <th style="border:1.2px solid #000000; padding:2px; width:4%;">V</th>
                <th style="border:1.2px solid #000000; padding:2px; width:4%;">S</th>
                <th style="border:1.2px solid #000000; padding:2px; width:4.5%;">D</th>
              </tr>
            </thead>
            <tbody>
              \${tableRows}
            </tbody>
          </table>
        </div>

        <!-- Pied de page officiel avec effectif RC et signature manuscrite -->
        <table style="width:100%; border-collapse:collapse; margin-top:5px; border-top:1px solid #cbd5e1; padding-top:3px;">
          <tr>
            <td style="width:60%; vertical-align:bottom; font-size:8.5pt; line-height:1.35; color:#000000;">
              <div>Relais Communautaires (RC) : <strong>\${data.rcPlanifies} planifié(s) sur \${data.rcAttendus} attendu(s).</strong></div>
              \${data.motifEcart ? \`<div style="color:#b91c1c; font-weight:bold; font-size:8pt;">Motif Écart : \${data.motifEcart}</div>\` : ''}
              <div><strong>ASCQ déclarant :</strong> \${data.ascqName} \${data.ascqPhone ? '— Tél : ' + data.ascqPhone : ''}</div>
            </td>

            <td style="width:40%; text-align:center; vertical-align:bottom; color:#000000;">
              <div style="font-weight:bold; font-size:8.5pt; margin-bottom:1px;">L'ASCQ Déclarant</div>
              \${data.signatureData ? \`<img style="max-height:42px; margin:1px auto; display:block;" src="\${data.signatureData}" />\` : '<div style="height:36px;"></div>'}
              <div style="font-weight:bold; font-size:8.5pt;"><u>\${data.ascqName}</u></div>
            </td>
          </tr>
        </table>

      </div>
    \`;

    document.getElementById("plnPdfSheetRender").innerHTML = sheetHTML;
  }
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '../plannings-modeles-officiels/Planning_Hebdo_ASCQ.html'), planningAscqHtml, 'utf8');
console.log('✓ Planning_Hebdo_ASCQ.html créé avec succès !');

// 3. GÉNÉRATION DE RC_Planning_Seul.html (Formulaire RC Google Apps Script)
const rcPlanningSeulHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Planning Hebdomadaire RC - Ministère de la Santé Bénin</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 text-slate-800 antialiased min-h-screen p-3 sm:p-5">

  <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-7">
    
    <!-- En-tête officiel validé -->
    <div class="border-b-2 border-emerald-700 pb-4 mb-5 text-center">
      <img src="${bannerCnls}" alt="CNLS-TP Bénin" class="h-12 sm:h-14 object-contain mx-auto mb-2" />
      <div class="flex items-center justify-center gap-3">
        <img src="${logoAsc}" alt="ASC Santé Communautaire" class="h-10 sm:h-12 object-contain" />
        <div>
          <div class="font-extrabold text-xs sm:text-sm text-slate-900 uppercase">RÉPUBLIQUE DU BÉNIN — MINISTÈRE DE LA SANTÉ</div>
          <div class="font-black text-sm sm:text-base text-emerald-800 uppercase">POLITIQUE NATIONALE DE SANTÉ COMMUNAUTAIRE (PNSC)</div>
          <div class="font-bold text-[11px] text-slate-600 uppercase">PLANNING HEBDOMADAIRE D'ACTIVITÉS DU RELAIS COMMUNAUTAIRE (RC)</div>
        </div>
      </div>
      <div class="h-1 w-44 my-2 mx-auto rounded-full bg-gradient-to-r from-emerald-600 via-amber-400 to-red-600"></div>
    </div>

    <form id="rcForm" onsubmit="handleRcSubmit(event)" class="space-y-5">
      
      <!-- Section 1 : Identification -->
      <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 border-l-4 border-l-emerald-700 space-y-3">
        <div class="font-extrabold text-xs text-emerald-800 uppercase">📍 SECTION 1 – Localisation & Période</div>
        
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Département *</label>
            <input type="text" id="rcDept" required placeholder="Ex: OUÉMÉ" class="w-full p-2.5 text-xs font-semibold border rounded-xl bg-white uppercase">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Zone Sanitaire *</label>
            <input type="text" id="rcZoneSanitaire" required placeholder="Ex: Porto-Novo / Sèmè-Podji" class="w-full p-2.5 text-xs font-semibold border rounded-xl bg-white">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Commune *</label>
            <input type="text" id="rcCommune" required placeholder="Ex: ADJARRA" class="w-full p-2.5 text-xs font-semibold border rounded-xl bg-white uppercase">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Arrondissement *</label>
            <input type="text" id="rcArrondissement" required placeholder="Ex: HONVIÉ" class="w-full p-2.5 text-xs font-semibold border rounded-xl bg-white uppercase">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Village / Quartier *</label>
            <input type="text" id="rcVillage" required placeholder="Ex: DANJI" class="w-full p-2.5 text-xs font-semibold border rounded-xl bg-white uppercase">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Grappe N° *</label>
            <input type="text" id="rcGrappe" required placeholder="Ex: 01" class="w-full p-2.5 text-xs font-semibold border rounded-xl bg-white">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Nom et Prénom(s) du Relais (RC) *</label>
            <input type="text" id="rcName" required placeholder="Ex: HOUNGBO Michel" class="w-full p-2.5 text-xs font-semibold border rounded-xl bg-white uppercase">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Numéro de Téléphone *</label>
            <input type="tel" id="rcPhone" required placeholder="Ex: +229 01 97 12 34 56" class="w-full p-2.5 text-xs font-semibold border rounded-xl bg-white">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Date début (Lundi) *</label>
            <input type="date" id="rcDateDebut" required onchange="rcCalcWeek()" class="w-full p-2.5 text-xs font-semibold border rounded-xl bg-white">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Date fin (Dimanche)</label>
            <input type="text" id="rcDateFinStr" readonly class="w-full p-2.5 text-xs font-bold border rounded-xl bg-emerald-50 text-emerald-900">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Semaine Épidémio N°</label>
            <input type="number" id="rcSemaineNum" readonly class="w-full p-2.5 text-xs font-extrabold border rounded-xl bg-emerald-50 text-emerald-900 text-center">
          </div>
        </div>
      </div>

      <!-- Section 2 : Les 8 Activités du RC -->
      <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 border-l-4 border-l-emerald-700 space-y-4">
        <div class="font-extrabold text-xs text-emerald-800 uppercase">📋 SECTION 2 – Programmation des 8 Activités Clés</div>
        <div id="rcActivitiesSlots" class="space-y-3"></div>
      </div>

      <!-- Section 3 : Observations -->
      <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 border-l-4 border-l-emerald-700">
        <label class="block text-xs font-bold text-emerald-800 uppercase mb-2">SECTION 3 – Observations Générales</label>
        <textarea id="rcObservations" rows="2" placeholder="Observations générales (Néant si aucune observation particulière)..." class="w-full p-2.5 text-xs font-medium border rounded-xl bg-white"></textarea>
      </div>

      <!-- Section 4 : Signature tactile RC -->
      <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 border-l-4 border-l-emerald-700">
        <label class="block text-xs font-bold text-emerald-800 uppercase mb-2">SECTION 4 – Signature du Relais Communautaire *</label>
        <div class="border-2 border-dashed border-emerald-600 rounded-xl p-2 bg-white text-center">
          <canvas id="rcSigCanvas" class="w-full h-32 touch-none bg-white rounded-lg cursor-crosshair"></canvas>
          <div class="flex justify-between items-center mt-2 text-xs">
            <span class="text-[11px] text-slate-400">Signez au doigt sur mobile ou à la souris</span>
            <button type="button" onclick="clearRcSig()" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold">Effacer</button>
          </div>
        </div>
      </div>

      <button type="submit" id="rcSubmitBtn" class="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-sm rounded-xl shadow-lg transition active:scale-95">
        Valider et envoyer le Planning RC
      </button>

    </form>

    <div id="rcSuccessModal" class="fixed inset-0 bg-slate-900/80 hidden items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
        <div class="w-14 h-14 bg-emerald-100 text-emerald-700 text-2xl font-black rounded-full flex items-center justify-center mx-auto">✓</div>
        <h3 class="font-black text-base text-slate-900">Planning Enregistré avec Succès !</h3>
        <p id="rcSuccessMsg" class="text-xs text-slate-600"></p>
        <a id="rcPdfLink" href="#" target="_blank" class="block w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition">
          📄 Consulter le PDF Officiel Généré
        </a>
        <button onclick="document.getElementById('rcSuccessModal').classList.add('hidden')" class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">
          Fermer
        </button>
      </div>
    </div>

  </div>

<script>
  const rcActsDef = [
    { key: "act_vad", label: "1. Visites à domicile (VAD)" },
    { key: "act_causerie", label: "2. Causeries / Sensibilisation / Salubrité" },
    { key: "act_animale", label: "3. Santé animale (One Health)" },
    { key: "act_sociales", label: "4. Affaires sociales" },
    { key: "act_femmes", label: "5. Suivi des femmes enceintes" },
    { key: "act_enfants", label: "6. Suivi des enfants de 0 à 59 mois" },
    { key: "act_referees", label: "7. Personnes référées" },
    { key: "act_autres", label: "8. Autres activités" }
  ];

  function initRcApp() {
    const container = document.getElementById("rcActivitiesSlots");
    container.innerHTML = rcActsDef.map(act => \`
      <div class="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
        <div class="font-bold text-xs text-slate-800">\${act.label}</div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Date prévue</label>
            <input type="date" id="\${act.key}_date" class="w-full p-2 text-xs border rounded-lg bg-slate-50">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Heure (Ex: 08h-11h)</label>
            <input type="text" id="\${act.key}_heure" placeholder="08h-10h" class="w-full p-2 text-xs border rounded-lg bg-slate-50">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Zone ciblée</label>
            <input type="text" id="\${act.key}_zone" placeholder="Grappe 1, etc." class="w-full p-2 text-xs border rounded-lg bg-slate-50">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Quantité prévue</label>
            <input type="number" id="\${act.key}_qte" min="0" placeholder="Ex: 5" class="w-full p-2 text-xs border rounded-lg bg-slate-50 font-bold text-emerald-800">
          </div>
        </div>
      </div>
    \`).join('');

    setTimeout(setupRcCanvas, 150);
  }

  window.addEventListener('DOMContentLoaded', initRcApp);

  function rcCalcWeek() {
    const val = document.getElementById("rcDateDebut").value;
    if (!val) return;
    const parts = val.split('-');
    const start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const fmt = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    document.getElementById("rcDateFinStr").value = fmt(end);

    const target = new Date(start.valueOf());
    const dayNr = (start.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    document.getElementById("rcSemaineNum").value = 1 + Math.round((firstThursday - target) / 604800000);
  }

  const rcCanvas = document.getElementById("rcSigCanvas");
  const rcCtx = rcCanvas.getContext("2d");
  let rcDrawing = false;
  let rcSigned = false;

  function setupRcCanvas() {
    const rect = rcCanvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = window.devicePixelRatio || 1;
    rcCanvas.width = rect.width * ratio;
    rcCanvas.height = rect.height * ratio;
    rcCtx.scale(ratio, ratio);
    rcCtx.lineWidth = 2.5;
    rcCtx.strokeStyle = "#000080";
    rcCtx.lineCap = "round";
    rcCtx.lineJoin = "round";
  }

  function getRcPos(e) {
    const rect = rcCanvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - rect.left, y: cy - rect.top };
  }

  rcCanvas.addEventListener("touchstart", (e) => { rcDrawing = true; rcSigned = true; const p = getRcPos(e); rcCtx.beginPath(); rcCtx.moveTo(p.x, p.y); e.preventDefault(); });
  rcCanvas.addEventListener("touchmove", (e) => { if (rcDrawing) { const p = getRcPos(e); rcCtx.lineTo(p.x, p.y); rcCtx.stroke(); } e.preventDefault(); });
  rcCanvas.addEventListener("touchend", () => { rcDrawing = false; });
  rcCanvas.addEventListener("mousedown", (e) => { rcDrawing = true; rcSigned = true; const p = getRcPos(e); rcCtx.beginPath(); rcCtx.moveTo(p.x, p.y); });
  rcCanvas.addEventListener("mousemove", (e) => { if (rcDrawing) { const p = getRcPos(e); rcCtx.lineTo(p.x, p.y); rcCtx.stroke(); } });
  rcCanvas.addEventListener("mouseup", () => { rcDrawing = false; });

  function clearRcSig() {
    rcCtx.clearRect(0, 0, rcCanvas.width, rcCanvas.height);
    rcSigned = false;
  }

  function handleRcSubmit(e) {
    e.preventDefault();
    if (!rcSigned) {
      alert("Veuillez apposer votre signature avant de soumettre le planning.");
      return;
    }

    const val = document.getElementById("rcDateDebut").value;
    const parts = val.split('-');
    const start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const fmt = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();

    const data = {
      id: Date.now(),
      departement: document.getElementById("rcDept").value.trim().toUpperCase(),
      zoneSanitaire: document.getElementById("rcZoneSanitaire").value.trim(),
      commune: document.getElementById("rcCommune").value.trim().toUpperCase(),
      arrondissement: document.getElementById("rcArrondissement").value.trim().toUpperCase(),
      village: document.getElementById("rcVillage").value.trim().toUpperCase(),
      grappe: document.getElementById("rcGrappe").value.trim(),
      rcName: document.getElementById("rcName").value.trim().toUpperCase(),
      rcPhone: document.getElementById("rcPhone").value.trim(),
      semaineNum: document.getElementById("rcSemaineNum").value,
      dateDebutStr: fmt(start),
      dateFinStr: document.getElementById("rcDateFinStr").value,
      observations: document.getElementById("rcObservations").value.trim(),
      signatureRc: rcCanvas.toDataURL()
    };

    rcActsDef.forEach(act => {
      const d = document.getElementById(act.key + "_date").value;
      const h = document.getElementById(act.key + "_heure").value.trim();
      const z = document.getElementById(act.key + "_zone").value.trim();
      const q = document.getElementById(act.key + "_qte").value.trim();
      if (d || h || z || q) {
        data[act.key] = [{ date: d, heure: h, zone: z, qte: q || "0" }];
      } else {
        data[act.key] = [];
      }
    });

    if (typeof google !== 'undefined' && google.script && google.script.run) {
      const btn = document.getElementById("rcSubmitBtn");
      btn.disabled = true;
      btn.innerText = "Génération du PDF officiel en cours...";

      google.script.run
        .withSuccessHandler(function(res) {
          btn.disabled = false;
          btn.innerText = "Valider et envoyer le Planning RC";
          document.getElementById("rcSuccessMsg").innerText = res.message;
          if (res.pdfUrl) {
            document.getElementById("rcPdfLink").href = res.pdfUrl;
            document.getElementById("rcPdfLink").classList.remove("hidden");
          } else {
            document.getElementById("rcPdfLink").classList.add("hidden");
          }
          document.getElementById("rcSuccessModal").classList.remove("hidden");
          document.getElementById("rcSuccessModal").classList.add("flex");
        })
        .withFailureHandler(function(err) {
          btn.disabled = false;
          btn.innerText = "Valider et envoyer le Planning RC";
          alert("Erreur serveur : " + err);
        })
        .processRcPlanningOnly(data);
    } else {
      alert("Mode local : Planning validé avec succès !");
    }
  }
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '../plannings-modeles-officiels/RC_Planning_Seul.html'), rcPlanningSeulHtml, 'utf8');
console.log('✓ RC_Planning_Seul.html créé avec succès !');
