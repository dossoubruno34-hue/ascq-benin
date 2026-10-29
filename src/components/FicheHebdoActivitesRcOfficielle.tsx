"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import GpsLocationCapture from "@/components/GpsLocationCapture";
import { 
  Calendar, 
  Printer, 
  Save, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  Check, 
  RefreshCw,
  Send,
  AlertCircle
} from "lucide-react";

interface Props {
  rcProfile: any;
  isAscqSuperviseur?: boolean;
}

export default function FicheHebdoActivitesRcOfficielle({ rcProfile, isAscqSuperviseur = false }: Props) {
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [ficheId, setFicheId] = useState<string | null>(null);

  // Semaine épidémiologique
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semaineActuelle = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  const [annee, setAnnee] = useState<number | string>(now.getFullYear());
  const [semaineNum, setSemaineNum] = useState<number | string>(semaineActuelle);
  const [dateSemaineDu, setDateSemaineDu] = useState(new Date().toISOString().split("T")[0]);
  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null);
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null);

  // Champs de la fiche officielle
  const [vadPrevue, setVadPrevue] = useState<string>("5");
  const [vadRealisee, setVadRealisee] = useState<string>("5");
  const [vadMenagesVisites, setVadMenagesVisites] = useState<string>("5");
  const [vadTotalMenages, setVadTotalMenages] = useState<string>("45");
  const [vadZone, setVadZone] = useState<string>("Grappe 1");
  const [vadObs, setVadObs] = useState<string>("Ménages cibles visités");

  const [causeriePrevue, setCauseriePrevue] = useState<string>("1");
  const [causerieRealisee, setCauserieRealisee] = useState<string>("1");
  const [causerieTheme, setCauserieTheme] = useState<string>("Utilisation des MILD et lavage des mains");
  const [causerieZone, setCauserieZone] = useState<string>("Place publique du village");
  const [causerieObs, setCauserieObs] = useState<string>("Forte mobilisation des mères");

  const [salubritePrevue, setSalubritePrevue] = useState<string>("1");
  const [salubriteRealisee, setSalubriteRealisee] = useState<string>("1");
  const [salubriteZone, setSalubriteZone] = useState<string>("Points d'eau du village");
  const [salubriteObs, setSalubriteObs] = useState<string>("Désherbage et assainissement des abords");

  const [santeAnimaleSites, setSanteAnimaleSites] = useState<string>("2");
  const [santeAnimaleZone, setSanteAnimaleZone] = useState<string>("Enclos communautaires");
  const [santeAnimaleObs, setSanteAnimaleObs] = useState<string>("Aucun animal malade signalé");

  const [affairesSocialesVisites, setAffairesSocialesVisites] = useState<string>("1");
  const [affairesSocialesZone, setAffairesSocialesZone] = useState<string>("Ménages indigents");
  const [affairesSocialesObs, setAffairesSocialesObs] = useState<string>("Suivi d'un orphelin vulnérable");

  const [femmesEnceintesNbre, setFemmesEnceintesNbre] = useState<string>("4");
  const [femmesCpn, setFemmesCpn] = useState<string>("3");
  const [femmesVat, setFemmesVat] = useState<string>("2");
  const [femmesZone, setFemmesZone] = useState<string>("Ménages de la grappe");
  const [femmesObs, setFemmesObs] = useState<string>("Rappel CPN3 effectué");

  const [enfants059Nbre, setEnfants059Nbre] = useState<string>("18");
  const [enfantsVaccin, setEnfantsVaccin] = useState<string>("16");
  const [enfantsNutrition, setEnfantsNutrition] = useState<string>("18");
  const [enfantsZone, setEnfantsZone] = useState<string>("Ménages de la grappe");
  const [enfantsObs, setEnfantsObs] = useState<string>("Dépistage PB normal");

  const [personnesReferees, setPersonnesReferees] = useState<string>("2");
  const [refereesZone, setRefereesZone] = useState<string>("Vers CS et ASCQ");
  const [refereesObs, setRefereesObs] = useState<string>("1 fièvre persistante vers CS + 1 malnutrition vers ASCQ");

  const [autresActivites, setAutresActivites] = useState<string>("");
  const [autresZone, setAutresZone] = useState<string>("");
  const [autresObs, setAutresObs] = useState<string>("");

  // Approbation ASCQ
  const [luEtApprouveAscq, setLuEtApprouveAscq] = useState(false);
  const [observationsAscq, setObservationsAscq] = useState("");

  // Chargement de la fiche existante si elle existe
  useEffect(() => {
    const chargerFiche = async () => {
      if (!rcProfile?.id) return;
      try {
        const { data } = await supabase
          .from("fiches_activites_hebdo_relais")
          .select("*")
          .eq("relais_id", rcProfile.id)
          .eq("annee", annee)
          .eq("semaine_num", semaineNum)
          .maybeSingle();

        if (data) {
          setFicheId(data.id);
          setDateSemaineDu(data.semaine_du || dateSemaineDu);
          setVadPrevue(String(data.nbre_vad_prevu ?? "5"));
          setVadRealisee(String(data.nbre_vad_realise ?? "5"));
          setVadMenagesVisites(String(data.nbre_menages_visites ?? "5"));
          setVadTotalMenages(String(data.total_menages_en_charge ?? "45"));
          setCauserieRealisee(String(data.nbre_causeries ?? "1"));
          setCauserieTheme(data.themes_causeries || "");
          setSalubriteRealisee(String(data.nbre_salubrite ?? "1"));
          setSanteAnimaleSites(String(data.sante_animale_sites ?? "0"));
          setAffairesSocialesVisites(String(data.affaires_sociales_visites ?? "0"));
          setFemmesEnceintesNbre(String(data.femmes_enceintes_suivies ?? "0"));
          setFemmesCpn(String(data.femmes_suivi_cpn ?? "0"));
          setFemmesVat(String(data.femmes_suivi_vat ?? "0"));
          setEnfants059Nbre(String(data.enfants_0_59_suivis ?? "0"));
          setEnfantsVaccin(String(data.enfants_vaccination ?? "0"));
          setEnfantsNutrition(String(data.enfants_nutrition ?? "0"));
          setPersonnesReferees(String(data.personnes_referees ?? "0"));
          setAutresActivites(data.autres_activites_texte || "");
          if (data.gps_latitude) setGpsLatitude(Number(data.gps_latitude));
          if (data.gps_longitude) setGpsLongitude(Number(data.gps_longitude));
          setLuEtApprouveAscq(data.lu_et_approuve_ascq || false);
          setObservationsAscq(data.observations_ascq || "");
        }
      } catch (e) {
        console.warn("Erreur chargement fiche:", e);
      }
    };

    chargerFiche();
  }, [rcProfile?.id, annee, semaineNum]);

  const handleEnregistrer = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const payload: any = {
        relais_id: rcProfile.id,
        ascq_id: rcProfile.ascq_id || null,
        departement_id: rcProfile.departement_id || null,
        zone_sanitaire_id: rcProfile.zone_sanitaire_id || null,
        commune_id: rcProfile.commune_id || null,
        arrondissement_id: rcProfile.arrondissement_id || null,
        village_nom: rcProfile.village_nom || "Village",
        grappe: rcProfile.grappe || 1,
        semaine_du: dateSemaineDu,
        annee,
        semaine_num: semaineNum,
        nbre_vad_prevu: parseInt(vadPrevue, 10) || 0,
        nbre_vad_realise: parseInt(vadRealisee, 10) || 0,
        nbre_menages_visites: parseInt(vadMenagesVisites, 10) || 0,
        total_menages_en_charge: parseInt(vadTotalMenages, 10) || 0,
        nbre_causeries: parseInt(causerieRealisee, 10) || 0,
        themes_causeries: causerieTheme,
        nbre_salubrite: parseInt(salubriteRealisee, 10) || 0,
        sante_animale_sites: parseInt(santeAnimaleSites, 10) || 0,
        affaires_sociales_visites: parseInt(affairesSocialesVisites, 10) || 0,
        femmes_enceintes_suivies: parseInt(femmesEnceintesNbre, 10) || 0,
        femmes_suivi_cpn: parseInt(femmesCpn, 10) || 0,
        femmes_suivi_vat: parseInt(femmesVat, 10) || 0,
        enfants_0_59_suivis: parseInt(enfants059Nbre, 10) || 0,
        enfants_vaccination: parseInt(enfantsVaccin, 10) || 0,
        enfants_nutrition: parseInt(enfantsNutrition, 10) || 0,
        personnes_referees: parseInt(personnesReferees, 10) || 0,
        autres_activites_texte: autresActivites,
        gps_latitude: gpsLatitude,
        gps_longitude: gpsLongitude,
        updated_at: new Date().toISOString(),
      };

      if (isAscqSuperviseur) {
        payload.lu_et_approuve_ascq = luEtApprouveAscq;
        payload.observations_ascq = observationsAscq;
        payload.date_approbation_ascq = luEtApprouveAscq ? new Date().toISOString() : null;
      }

      if (ficheId) {
        await supabase.from("fiches_activites_hebdo_relais").update(payload).eq("id", ficheId);
      } else {
        const { data: newRow } = await supabase.from("fiches_activites_hebdo_relais").insert(payload).select("id").maybeSingle();
        if (newRow?.id) setFicheId(newRow.id);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Erreur enregistrement fiche hebdo RC:", err);
      alert("Erreur lors de l'enregistrement de la fiche.");
    } finally {
      setSaving(false);
    }
  };

  const imprimerFicheOfficielle = () => {
    const win = window.open("", "_blank");
    if (!win) {
      alert("Veuillez autoriser les fenêtres pop-up.");
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fiche Hebdomadaire d'Activités du Relais Communautaire - PNSC Bénin</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 10px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
            .header-table td { vertical-align: top; }
            .rep { font-weight: 800; font-size: 11px; text-transform: uppercase; }
            .min { font-size: 10px; text-transform: uppercase; }
            .contact { font-size: 8.5px; text-align: right; color: #333; }
            .flag { height: 4px; width: 100%; margin: 6px 0; background: linear-gradient(to right, #008751 33%, #FCD116 33%, #FCD116 66%, #E8112D 66%); }
            .main-title { text-align: center; font-size: 13px; font-weight: 900; text-transform: uppercase; text-decoration: underline; margin: 6px 0 2px 0; }
            .sub-title { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 8px; }
            .cartouche { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
            .cartouche td { padding: 3px 4px; }
            .dots { border-bottom: 1px dotted #000; font-weight: bold; }
            
            table.grille { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 10px; }
            table.grille th, table.grille td { border: 1px solid #000; padding: 4px; vertical-align: middle; }
            table.grille th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .footer-sign { width: 100%; margin-top: 25px; display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 15px; text-align: right;">
            <button onclick="window.print()" style="background:#005c30; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer;">
              🖨️ Imprimer la fiche officielle
            </button>
          </div>

          <table class="header-table">
            <tr>
              <td style="width: 50%;">
                <div class="min">MINISTÈRE DE LA SANTÉ</div>
                <div class="rep">RÉPUBLIQUE DU BÉNIN</div>
              </td>
              <td class="contact" style="width: 50%;">
                Adresse postale : 01 BP 882<br/>
                Téléphone : +229 21 33 21 78 / 21 33 21 63<br/>
                Adresse mail : sante.infos@gouv.bj<br/>
                Site web : www.sante.gouv.bj
              </td>
            </tr>
          </table>

          <div class="flag"></div>

          <div class="main-title">POLITIQUE NATIONALE DE SANTÉ COMMUNAUTAIRE</div>
          <div class="sub-title">Fiche hebdomadaire d’activités du relais communautaire</div>

          <table class="cartouche">
            <tr>
              <td>Département : <span class="dots">${rcProfile.departement_nom || "Atlantique"}</span></td>
              <td>Zone sanitaire : <span class="dots">${rcProfile.zone_sanitaire_nom || "Zone"}</span></td>
              <td>Commune : <span class="dots">${rcProfile.commune_nom || "Commune"}</span></td>
              <td>Arrondissement : <span class="dots">${rcProfile.arrondissement_nom || "Arrondissement"}</span></td>
              <td>Village : <span class="dots">${rcProfile.village_nom || "Village"}</span></td>
            </tr>
            <tr>
              <td>Grappe : <span class="dots">${rcProfile.grappe || 1}</span></td>
              <td colspan="2">NOM ET PRENOM(S) DU RC : <span class="dots">${rcProfile.nom} ${rcProfile.prenoms}</span></td>
              <td>Tél : <span class="dots">${rcProfile.telephone || ""}</span></td>
              <td>Semaine de : <span class="dots">${dateSemaineDu} (Sem. ${semaineNum})</span></td>
            </tr>
          </table>

          <table class="grille">
            <thead>
              <tr>
                <th rowspan="2" style="width: 7%;">Date</th>
                <th rowspan="2" style="width: 6%;">Heure</th>
                <th rowspan="2" style="width: 28%;">Activités</th>
                <th rowspan="2" style="width: 17%;">Zone ciblée</th>
                <th colspan="2" style="width: 20%;">QUANTITE</th>
                <th rowspan="2" style="width: 22%;">Observations</th>
              </tr>
              <tr>
                <th style="width: 10%;">PREVUE</th>
                <th style="width: 10%;">REALISEE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="center" rowspan="3">${dateSemaineDu}</td>
                <td class="center" rowspan="3">08h-12h</td>
                <td class="bold">Visites à domicile :<br/>• Nbre VAD<br/>• Nbre ménages visités<br/>• Total ménages en charge</td>
                <td>${vadZone}</td>
                <td class="center">${vadPrevue} VAD</td>
                <td class="center">${vadRealisee} VAD<br/>${vadMenagesVisites} ménages<br/>Total: ${vadTotalMenages}</td>
                <td>${vadObs}</td>
              </tr>
              <tr>
                <td class="bold">Causeries/Sensibilisation :<br/>• Nbre : ${causerieRealisee}<br/>• Thème : ${causerieTheme}</td>
                <td>${causerieZone}</td>
                <td class="center">${causeriePrevue}</td>
                <td class="center">${causerieRealisee}</td>
                <td>${causerieObs}</td>
              </tr>
              <tr>
                <td class="bold">Salubrité</td>
                <td>${salubriteZone}</td>
                <td class="center">${salubritePrevue}</td>
                <td class="center">${salubriteRealisee}</td>
                <td>${salubriteObs}</td>
              </tr>
              <tr>
                <td class="center">${dateSemaineDu}</td>
                <td class="center">14h-16h</td>
                <td class="bold">Santé animale :<br/>• Nombre de site visité : ${santeAnimaleSites}</td>
                <td>${santeAnimaleZone}</td>
                <td class="center">-</td>
                <td class="center">${santeAnimaleSites} site(s)</td>
                <td>${santeAnimaleObs}</td>
              </tr>
              <tr>
                <td class="center">${dateSemaineDu}</td>
                <td class="center">16h-17h</td>
                <td class="bold">Affaires sociales :<br/>• Nbre de visite : ${affairesSocialesVisites}</td>
                <td>${affairesSocialesZone}</td>
                <td class="center">-</td>
                <td class="center">${affairesSocialesVisites} visite(s)</td>
                <td>${affairesSocialesObs}</td>
              </tr>
              <tr>
                <td class="center" rowspan="2">${dateSemaineDu}</td>
                <td class="center" rowspan="2">08h-11h</td>
                <td class="bold">Suivi des femmes enceintes :<br/>• Nbre de femmes enceintes : ${femmesEnceintesNbre}<br/>• Suivi pour CPN : ${femmesCpn}<br/>• Suivi pour VAT : ${femmesVat}</td>
                <td>${femmesZone}</td>
                <td class="center">-</td>
                <td class="center">${femmesEnceintesNbre} femmes<br/>CPN: ${femmesCpn}<br/>VAT: ${femmesVat}</td>
                <td>${femmesObs}</td>
              </tr>
              <tr>
                <td class="bold">Suivi des enfants de 0 à 59 mois :<br/>• Nbre enfants 0 à 59 mois : ${enfants059Nbre}<br/>• Suivi pour vaccination : ${enfantsVaccin}<br/>• Suivi pour nutrition : ${enfantsNutrition}</td>
                <td>${enfantsZone}</td>
                <td class="center">-</td>
                <td class="center">${enfants059Nbre} enfants<br/>Vaccin: ${enfantsVaccin}<br/>Nutr: ${enfantsNutrition}</td>
                <td>${enfantsObs}</td>
              </tr>
              <tr>
                <td class="center">${dateSemaineDu}</td>
                <td class="center">En continu</td>
                <td class="bold">Personnes référées :<br/>• Nombre référés : ${personnesReferees}</td>
                <td>${refereesZone}</td>
                <td class="center">-</td>
                <td class="center">${personnesReferees} cas</td>
                <td>${refereesObs}</td>
              </tr>
              <tr>
                <td class="center">-</td>
                <td class="center">-</td>
                <td class="bold">Autres : ${autresActivites || "Néant"}</td>
                <td>${autresZone || "-"}</td>
                <td class="center">-</td>
                <td class="center">-</td>
                <td>${autresObs || "-"}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer-sign">
            <div>
              Signature RC :<br/>
              <span style="font-weight: normal; font-size: 10px;">Émargé électroniquement par ${rcProfile.nom} ${rcProfile.prenoms}</span>
            </div>
            <div style="text-align: right;">
              Lu et approuvé par l’ASCQ :<br/>
              <span style="font-weight: normal; font-size: 10px;">${luEtApprouveAscq ? "✅ Approuvé le " + (now.toLocaleDateString("fr-FR")) : "[ ] En attente d'approbation"}</span>
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-md space-y-5">
      
      {/* En-tête officiel */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#005c30] text-[10px] font-black uppercase tracking-wider">
              Modèle Officiel PNSC Bénin
            </span>
            <span className="text-xs font-bold text-slate-400">Semaine {semaineNum} / {annee}</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1">
            Fiche hebdomadaire d’activités du Relais Communautaire
          </h2>
          <p className="text-xs text-slate-500">
            Village de {rcProfile.village_nom || "votre zone"} • Grappe {rcProfile.grappe || 1} • {rcProfile.nom} {rcProfile.prenoms}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={imprimerFicheOfficielle}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Imprimer la fiche (PDF)</span>
          </button>

          <button
            type="button"
            onClick={handleEnregistrer}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? "Enregistrement..." : "Enregistrer la semaine"}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Fiche hebdomadaire d'activités enregistrée avec succès !</span>
        </div>
      )}

      {/* Cartouche Période */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Semaine du *</label>
          <input
            type="date"
            value={dateSemaineDu}
            onChange={(e) => setDateSemaineDu(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Numéro de Semaine *</label>
          <input
            type="number"
            min={1}
            max={53}
            value={semaineNum}
            onChange={(e) => setSemaineNum(e.target.value === "" ? "" : (parseInt(e.target.value, 10) || ""))}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Année *</label>
          <input
            type="number"
            value={annee}
            onChange={(e) => setAnnee(e.target.value === "" ? "" : (parseInt(e.target.value, 10) || ""))}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold"
          />
        </div>
      </div>

      {/* Géolocalisation GPS Haute Précision */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <GpsLocationCapture
          latitude={gpsLatitude}
          longitude={gpsLongitude}
          onLocationChange={(lat, lng) => {
            setGpsLatitude(lat);
            setGpsLongitude(lng);
          }}
        />
      </div>

      {/* Grille des 9 activités officielles de la PNSC */}
      <div className="space-y-4">
        
        {/* 1. Visites à domicile */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase">
              1. Visites à Domicile (VAD)
            </h3>
            <span className="text-[10px] font-bold text-slate-500">Prévue vs Réalisée</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[10px] text-slate-500">Nbre VAD Prévu</label>
              <input type="number" value={vadPrevue} onChange={e => setVadPrevue(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500">Nbre VAD Réalisé</label>
              <input type="number" value={vadRealisee} onChange={e => setVadRealisee(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold text-emerald-800" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500">Ménages visités</label>
              <input type="number" value={vadMenagesVisites} onChange={e => setVadMenagesVisites(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500">Total ménages en charge</label>
              <input type="number" value={vadTotalMenages} onChange={e => setVadTotalMenages(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <input type="text" placeholder="Zone ciblée (ex: Grappe 1, Hameau nord...)" value={vadZone} onChange={e => setVadZone(e.target.value)} className="p-2 rounded-xl border bg-white" />
            <input type="text" placeholder="Observations VAD..." value={vadObs} onChange={e => setVadObs(e.target.value)} className="p-2 rounded-xl border bg-white" />
          </div>
        </div>

        {/* 2. Causeries / Sensibilisations */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase">
              2. Causeries & Sensibilisations
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[10px] text-slate-500">Séances Prévues</label>
              <input type="number" value={causeriePrevue} onChange={e => setCauseriePrevue(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500">Séances Réalisées</label>
              <input type="number" value={causerieRealisee} onChange={e => setCauserieRealisee(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold text-emerald-800" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] text-slate-500">Thème principal</label>
              <input type="text" value={causerieTheme} onChange={e => setCauserieTheme(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <input type="text" placeholder="Zone ciblée (ex: Place publique...)" value={causerieZone} onChange={e => setCauserieZone(e.target.value)} className="p-2 rounded-xl border bg-white" />
            <input type="text" placeholder="Observations Causeries..." value={causerieObs} onChange={e => setCauserieObs(e.target.value)} className="p-2 rounded-xl border bg-white" />
          </div>
        </div>

        {/* 3, 4, 5. Salubrité, Santé animale, Affaires sociales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2 text-xs">
            <h4 className="font-bold text-slate-800">3. Salubrité</h4>
            <input type="number" placeholder="Séances réalisées" value={salubriteRealisee} onChange={e => setSalubriteRealisee(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold" />
            <input type="text" placeholder="Zone ciblée..." value={salubriteZone} onChange={e => setSalubriteZone(e.target.value)} className="w-full p-1.5 rounded-xl border bg-white text-[11px]" />
          </div>

          <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2 text-xs">
            <h4 className="font-bold text-slate-800">4. Santé animale</h4>
            <input type="number" placeholder="Sites visités" value={santeAnimaleSites} onChange={e => setSanteAnimaleSites(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold" />
            <input type="text" placeholder="Zone ciblée..." value={santeAnimaleZone} onChange={e => setSanteAnimaleZone(e.target.value)} className="w-full p-1.5 rounded-xl border bg-white text-[11px]" />
          </div>

          <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2 text-xs">
            <h4 className="font-bold text-slate-800">5. Affaires sociales</h4>
            <input type="number" placeholder="Nbre visites sociales" value={affairesSocialesVisites} onChange={e => setAffairesSocialesVisites(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold" />
            <input type="text" placeholder="Zone ciblée..." value={affairesSocialesZone} onChange={e => setAffairesSocialesZone(e.target.value)} className="w-full p-1.5 rounded-xl border bg-white text-[11px]" />
          </div>
        </div>

        {/* 6. Suivi femmes enceintes & 7. Enfants 0-59 mois */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3 text-xs">
            <h4 className="font-black text-slate-900 uppercase">6. Suivi des Femmes Enceintes</h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500">Femmes suivies</label>
                <input type="number" value={femmesEnceintesNbre} onChange={e => setFemmesEnceintesNbre(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Suivi CPN</label>
                <input type="number" value={femmesCpn} onChange={e => setFemmesCpn(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold text-emerald-800" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Suivi VAT</label>
                <input type="number" value={femmesVat} onChange={e => setFemmesVat(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold" />
              </div>
            </div>
            <input type="text" placeholder="Observations femmes enceintes..." value={femmesObs} onChange={e => setFemmesObs(e.target.value)} className="w-full p-2 rounded-xl border bg-white text-[11px]" />
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3 text-xs">
            <h4 className="font-black text-slate-900 uppercase">7. Suivi Enfants 0-59 Mois</h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500">Enfants suivis</label>
                <input type="number" value={enfants059Nbre} onChange={e => setEnfants059Nbre(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Vaccination PEV</label>
                <input type="number" value={enfantsVaccin} onChange={e => setEnfantsVaccin(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold text-emerald-800" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Nutrition (PB)</label>
                <input type="number" value={enfantsNutrition} onChange={e => setEnfantsNutrition(e.target.value)} className="w-full p-2 rounded-xl border bg-white font-bold" />
              </div>
            </div>
            <input type="text" placeholder="Observations enfants..." value={enfantsObs} onChange={e => setEnfantsObs(e.target.value)} className="w-full p-2 rounded-xl border bg-white text-[11px]" />
          </div>
        </div>

        {/* 8. Personnes référées & 9. Autres */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2">
            <h4 className="font-bold text-slate-800">8. Personnes référées (CS, ASCQ, GUPS)</h4>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" placeholder="Nombre" value={personnesReferees} onChange={e => setPersonnesReferees(e.target.value)} className="p-2 rounded-xl border bg-white font-bold" />
              <input type="text" placeholder="Destinations..." value={refereesZone} onChange={e => setRefereesZone(e.target.value)} className="col-span-2 p-2 rounded-xl border bg-white text-[11px]" />
            </div>
            <input type="text" placeholder="Motifs des références..." value={refereesObs} onChange={e => setRefereesObs(e.target.value)} className="w-full p-1.5 rounded-xl border bg-white text-[11px]" />
          </div>

          <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2">
            <h4 className="font-bold text-slate-800">9. Autres activités réalisées</h4>
            <input type="text" placeholder="Précisez les autres activités..." value={autresActivites} onChange={e => setAutresActivites(e.target.value)} className="w-full p-2 rounded-xl border bg-white text-[11px]" />
            <input type="text" placeholder="Observations complémentaires..." value={autresObs} onChange={e => setAutresObs(e.target.value)} className="w-full p-1.5 rounded-xl border bg-white text-[11px]" />
          </div>
        </div>

      </div>

      {/* Approbation ASCQ */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <span className="font-bold text-slate-700">Signature & Validation de conformité</span>
          <p className="text-[11px] text-slate-500">
            Signé électroniquement par le Relais Communautaire <strong>{rcProfile.nom} {rcProfile.prenoms}</strong>.
          </p>
        </div>

        {isAscqSuperviseur ? (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={luEtApprouveAscq}
                onChange={(e) => setLuEtApprouveAscq(e.target.checked)}
                className="w-4 h-4 rounded text-[#005c30] focus:ring-[#005c30]"
              />
              <span>Lu et approuvé par l'ASCQ superviseur</span>
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
              luEtApprouveAscq ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}>
              {luEtApprouveAscq ? "✅ Lu et approuvé par votre ASCQ" : "⏳ En attente de validation par l'ASCQ"}
            </span>
          </div>
        )}
      </div>

    </div>
  );
}
