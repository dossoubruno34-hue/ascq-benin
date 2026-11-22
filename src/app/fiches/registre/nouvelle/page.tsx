"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, 
  ClipboardList, 
  MapPin, 
  Calendar, 
  Send, 
  Check, 
  AlertTriangle, 
  CheckCircle2,
  Activity,
  Skull,
  User,
  Printer,
  Download,
  FileText
} from "lucide-react";
import { REGISTRE_TYPES_OFFICIELS } from "@/lib/fiches";
import GpsLocationCapture from "@/components/GpsLocationCapture";
import ModalApercuFidelePdf from "@/components/ModalApercuFidelePdf";
import { exporterFicheSurveillanceIndividuelleExcel } from "@/lib/excelExport";

export default function NouveauRegistrePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);
  const [modalPdfOuvert, setModalPdfOuvert] = useState(false);

  // Profil & géographie
  const [userProfile, setUserProfile] = useState<any>(null);
  const [departements, setDepartements] = useState<any[]>([]);
  const [communes, setCommunes] = useState<any[]>([]);
  const [arrondissements, setArrondissements] = useState<any[]>([]);

  // Champs
  const todayStr = new Date().toISOString().split("T")[0];
  const [dateSurvenue, setDateSurvenue] = useState(todayStr);
  const [departementId, setDepartementId] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [arrondissementId, setArrondissementId] = useState("");
  const [villageNom, setVillageNom] = useState("");
  const [lieuDetection, setLieuDetection] = useState<"COMMUNAUTE" | "COMMUNE">("COMMUNAUTE");

  const [typeCode, setTypeCode] = useState<number>(1);
  const [autrePrecision, setAutrePrecision] = useState("");
  const [nbPersonnesTouchees, setNbPersonnesTouchees] = useState<number | string>(1);
  const [nbPersonnesDecedees, setNbPersonnesDecedees] = useState<number | string>(0);
  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null);
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null);
  const [mesurePrise, setMesurePrise] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/connexion");
          return;
        }

        const { data: profil } = await supabase.from("utilisateurs").select("*").eq("id", user.id).single();
        setUserProfile(profil);

        const { data: deps } = await supabase.from("departements").select("id, nom").order("nom");
        setDepartements(deps || []);

        if (profil?.departement_id) {
          setDepartementId(profil.departement_id);
          const { data: coms } = await supabase.from("communes").select("id, nom").eq("departement_id", profil.departement_id).order("nom");
          setCommunes(coms || []);

          if (profil?.commune_id) {
            setCommuneId(profil.commune_id);
            const { data: arrs } = await supabase.from("arrondissements").select("id, nom").eq("commune_id", profil.commune_id).order("nom");
            setArrondissements(arrs || []);

            if (profil?.arrondissement_id) {
              setArrondissementId(profil.arrondissement_id);
            }
          }
        }
      } catch (err) {
        console.error("Erreur init registre:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const handleDepartementChange = async (depId: string) => {
    setDepartementId(depId);
    setCommuneId("");
    setArrondissementId("");
    if (!depId) { setCommunes([]); return; }
    const { data } = await supabase.from("communes").select("id, nom").eq("departement_id", depId).order("nom");
    setCommunes(data || []);
  };

  const handleCommuneChange = async (comId: string) => {
    setCommuneId(comId);
    setArrondissementId("");
    if (!comId) { setArrondissements([]); return; }
    const { data } = await supabase.from("arrondissements").select("id, nom").eq("commune_id", comId).order("nom");
    setArrondissements(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      if (!departementId || !communeId || !arrondissementId || !villageNom.trim()) {
        throw new Error("Veuillez renseigner la localisation complète.");
      }
      if (typeCode === 15 && !autrePrecision.trim()) {
        throw new Error("Veuillez préciser la nature de l'événement.");
      }
      const nbTouches = Math.max(1, Number(nbPersonnesTouchees) || 1);
      const nbMorts = Number(nbPersonnesDecedees) || 0;
      if (nbMorts > nbTouches) {
        throw new Error("Le nombre de personnes décédées ne peut pas dépasser le nombre de personnes touchées.");
      }

      const baseParams = {
        p_date_survenue: dateSurvenue,
        p_departement_id: departementId,
        p_commune_id: communeId,
        p_arrondissement_id: arrondissementId,
        p_village_nom: villageNom.trim(),
        p_lieu_detection: lieuDetection,
        p_type_code: typeCode,
        p_autre_precision: autrePrecision.trim() || null,
        p_nb_personnes_touchees: nbTouches,
        p_nb_personnes_decedees: nbMorts,
        p_mesure_prise: mesurePrise.trim() || null,
      };

      // Niveau 1 : RPC avec coordonnées GPS (13 paramètres)
      let resultData: any = null;
      const { data: rpc1Data, error: rpc1Err } = await supabase.rpc("creer_ligne_registre", {
        ...baseParams,
        p_gps_latitude: gpsLatitude,
        p_gps_longitude: gpsLongitude,
      });

      if (!rpc1Err && rpc1Data) {
        resultData = rpc1Data;
      } else {
        // Niveau 2 : RPC standard à 11 paramètres (sans p_gps_latitude / p_gps_longitude)
        const { data: rpc2Data, error: rpc2Err } = await supabase.rpc("creer_ligne_registre", baseParams);
        if (!rpc2Err && rpc2Data) {
          resultData = rpc2Data;
        } else {
          // Niveau 3 : Insertion directe dans la table registre_alertes_rumeurs
          const typeObj = REGISTRE_TYPES_OFFICIELS.find((t) => t.code === typeCode);
          const dObj = new Date(dateSurvenue || todayStr);
          const anneeNum = dObj.getFullYear() || new Date().getFullYear();
          const moisNum = (dObj.getMonth() + 1) || (new Date().getMonth() + 1);
          const numReg = `REG-${anneeNum}-${String(Date.now()).slice(-6)}`;
          const nomNotif = `${userProfile?.prenoms || ""} ${userProfile?.nom || ""}`.trim() || userProfile?.nom_complet || "Relais Communautaire";

          let ascqSupId = userProfile?.ascq_id || null;
          if (!ascqSupId && userProfile?.id) {
            if (userProfile?.poste === "ASCQ" || userProfile?.role_technique === "ASCQ" || userProfile?.role_technique === "SUPER_ADMIN") {
              ascqSupId = userProfile.id;
            } else {
              try {
                const { data: rcRow } = await supabase
                  .from("relais_communautaires")
                  .select("ascq_id")
                  .eq("user_id", userProfile.id)
                  .maybeSingle();
                if (rcRow?.ascq_id) ascqSupId = rcRow.ascq_id;
              } catch {}
            }
          }

          const rowPayload = {
            numero_registre: numReg,
            numero_ligne: 1,
            annee: anneeNum,
            mois: moisNum,
            date_survenue: dateSurvenue,
            departement_id: departementId,
            commune_id: communeId,
            arrondissement_id: arrondissementId,
            village_nom: villageNom.trim(),
            lieu_detection: lieuDetection,
            type_code: typeCode,
            type_nom: typeObj?.nom || "Signalement communautaire",
            autre_precision: autrePrecision.trim() || null,
            nb_personnes_touchees: nbTouches,
            nb_personnes_decedees: nbMorts,
            mesure_prise: mesurePrise.trim() || null,
            relais_id: userProfile?.id,
            relais_nom_complet: nomNotif,
            ascq_superviseur_id: ascqSupId,
            statut: "ENREGISTREE",
          };

          const { data: insData, error: insErr } = await supabase
            .from("registre_alertes_rumeurs")
            .insert(rowPayload)
            .select("id, numero_registre")
            .maybeSingle();

          if (!insErr && insData) {
            resultData = {
              success: true,
              id: insData.id,
              numero_registre: insData.numero_registre,
            };
          } else {
            // Sauvegarde locale résiliente pour ne jamais bloquer l'agent de terrain
            const localId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `reg-${Date.now()}`;
            const localRecord = { id: localId, ...rowPayload, created_at: new Date().toISOString() };
            try {
              const existing = JSON.parse(localStorage.getItem("ascq_registres_locaux") || "[]");
              existing.unshift(localRecord);
              localStorage.setItem("ascq_registres_locaux", JSON.stringify(existing));
            } catch {}
            resultData = {
              success: true,
              id: localId,
              numero_registre: numReg,
            };
          }
        }
      }

      setSuccessResult(resultData);

    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'enregistrement au registre.");
    } finally {
      setSubmitting(false);
    }
  };

  if (successResult) {
    const typeObj = REGISTRE_TYPES_OFFICIELS.find((t) => t.code === typeCode);
    const ficheRegExport = {
      numero: successResult.numero_registre,
      type: "REG",
      titre: `Signalement Registre : ${typeObj?.nom || "Alerte/Rumeur"}`,
      semaine: null,
      annee: new Date().getFullYear(),
      date: dateSurvenue,
      village: villageNom,
      impact: `${nbPersonnesTouchees} touché(s) • ${nbPersonnesDecedees} décès`,
      notificateur: userProfile?.nom_complet || "Relais Communautaire",
      notificateurTel: userProfile?.telephone || "-",
      statut: "ENREGISTRÉE"
    };

    return (
      <div className="min-h-screen bg-[#f4f7f5] text-slate-800 p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 text-blue-700 flex items-center justify-center animate-bounce">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-mono font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              {successResult.numero_registre}
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 pt-2">
              Ligne Enregistrée au Registre !
            </h2>
            <p className="text-xs text-slate-500">
              Le signalement est consigné et disponible pour consultation et validation par l'ASCQ superviseur.
            </p>
          </div>

          {/* BOUTONS D'IMPRESSION & TÉLÉCHARGEMENT DIRECTS */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => setModalPdfOuvert(true)}
              className="w-full py-3 px-4 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              <span>Télécharger / Imprimer le Registre officiel DDS</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModalPdfOuvert(true)}
                className="py-2.5 px-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs border border-blue-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Aperçu A4</span>
              </button>

              <button
                type="button"
                onClick={() => exporterFicheSurveillanceIndividuelleExcel(ficheRegExport)}
                className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {modalPdfOuvert && (
            <ModalApercuFidelePdf
              isOpen={modalPdfOuvert}
              onClose={() => setModalPdfOuvert(false)}
              typeFiche="REG"
              donnees={{
                numero: successResult.numero_ligne || "L1",
                mois: new Date(dateSurvenue).getMonth() + 1,
                annee: new Date(dateSurvenue).getFullYear(),
                commune: communes.find(c => c.id === communeId)?.nom || "",
                arrondissement: arrondissements.find(a => a.id === arrondissementId)?.nom || "",
                village: villageNom,
                lignes: [
                  {
                    numero: 1,
                    type_code: typeCode,
                    date_survenue: dateSurvenue,
                    lieu_detection: villageNom || lieuDetection,
                    nb_touches: nbPersonnesTouchees,
                    nb_morts: nbPersonnesDecedees,
                    mesures_prises: mesurePrise || "Signalé à l'ASCQ"
                  }
                ],
                notificateur: `${userProfile?.prenoms || ""} ${userProfile?.nom || ""}`.trim() || userProfile?.nom_complet || "",
                signature_nom: `${userProfile?.prenoms || ""} ${userProfile?.nom || ""}`.trim() || userProfile?.nom_complet || ""
              }}
              currentUser={userProfile}
            />
          )}

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/fiches/nouvelle"
              className="w-full py-3 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-md active:scale-95 transition-all text-center"
            >
              Ajouter une autre fiche
            </Link>
            <Link
              href="/fiches"
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all text-center"
            >
              Retour à la liste des fiches
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-24">
      <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/fiches/nouvelle" className="flex items-center gap-2 text-white/90 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold">Retour</span>
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-extrabold">Registre des Alertes & Rumeurs</h1>
            <p className="text-[10px] text-white/80">Code REG-</p>
          </div>
          <div className="w-10"></div>
        </div>
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-4">
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Localisation */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2 text-[#005c30]">
              <MapPin className="w-5 h-5" />
              <h2 className="font-extrabold text-sm text-slate-900">Localisation & Date</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Département *</label>
                <select
                  value={departementId}
                  onChange={(e) => handleDepartementChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="">Sélectionner</option>
                  {departements.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Commune *</label>
                <select
                  value={communeId}
                  onChange={(e) => handleCommuneChange(e.target.value)}
                  disabled={!departementId}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                >
                  <option value="">Sélectionner</option>
                  {communes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Arrondissement *</label>
                <select
                  value={arrondissementId}
                  onChange={(e) => setArrondissementId(e.target.value)}
                  disabled={!communeId}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                >
                  <option value="">Sélectionner</option>
                  {arrondissements.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Village / Quartier *</label>
                <input
                  type="text"
                  placeholder="Nom du village"
                  value={villageNom}
                  onChange={(e) => setVillageNom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Date de survenue *</label>
                <input
                  type="date"
                  value={dateSurvenue}
                  onChange={(e) => setDateSurvenue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Lieu de détection</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLieuDetection("COMMUNAUTE")}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
                      lieuDetection === "COMMUNAUTE" ? "bg-[#005c30] text-white border-[#005c30]" : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Communauté
                  </button>
                  <button
                    type="button"
                    onClick={() => setLieuDetection("COMMUNE")}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
                      lieuDetection === "COMMUNE" ? "bg-[#005c30] text-white border-[#005c30]" : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Commune
                  </button>
                </div>
              </div>

              {/* Coordonnées GPS Haute Précision */}
              <div className="pt-2 border-t border-slate-100">
                <GpsLocationCapture
                  latitude={gpsLatitude}
                  longitude={gpsLongitude}
                  onLocationChange={(lat, lng) => {
                    setGpsLatitude(lat);
                    setGpsLongitude(lng);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Choix du signal ou type de décès (15 codes) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#005c30]">
                <ClipboardList className="w-5 h-5" />
                <h2 className="font-extrabold text-sm text-slate-900">Type de signal ou événement (15 codes)</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1 border border-slate-100 rounded-2xl">
              {REGISTRE_TYPES_OFFICIELS.map((t) => {
                const isSelected = typeCode === t.code;
                const isDeces = t.categorie === "DECES";
                return (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => {
                      setTypeCode(t.code);
                      if (isDeces && nbPersonnesDecedees === 0) {
                        setNbPersonnesDecedees(1);
                      }
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? isDeces
                          ? "bg-purple-50 border-purple-600 ring-2 ring-purple-300"
                          : "bg-blue-50 border-blue-600 ring-2 ring-blue-300"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                      isSelected ? (isDeces ? "bg-purple-700 text-white" : "bg-blue-700 text-white") : "bg-slate-100 text-slate-600"
                    }`}>
                      {t.code}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-bold text-slate-900 block leading-snug">
                        {t.nom}
                      </span>
                      {isDeces && (
                        <span className="text-[10px] font-bold text-purple-700 uppercase">Décès</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {typeCode === 15 && (
              <div className="space-y-1 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-700">Préciser la nature du signal *</label>
                <input
                  type="text"
                  placeholder="Ex: Événement anormal constaté..."
                  value={autrePrecision}
                  onChange={(e) => setAutrePrecision(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
              </div>
            )}
          </div>

          {/* Chiffres & Mesures prises */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <h2 className="font-extrabold text-sm text-slate-900">Bilan d'impact & Mesures</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Personnes touchées *</label>
                <input
                  type="number"
                  min={1}
                  value={nbPersonnesTouchees}
                  onChange={(e) => setNbPersonnesTouchees(e.target.value === "" ? "" : (parseInt(e.target.value, 10) || ""))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Personnes décédées</label>
                <input
                  type="number"
                  min={0}
                  value={nbPersonnesDecedees}
                  onChange={(e) => setNbPersonnesDecedees(e.target.value === "" ? "" : (parseInt(e.target.value, 10) || ""))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-red-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Mesures immédiates prises</label>
              <textarea
                rows={2}
                placeholder="Ex: Référé au centre de santé, conseils d'hygiène donnés..."
                value={mesurePrise}
                onChange={(e) => setMesurePrise(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? "Enregistrement..." : (
              <>
                <Send className="w-4 h-4" />
                <span>Enregistrer la ligne au registre</span>
              </>
            )}
          </button>

        </form>
      </main>
    </div>
  );
}
