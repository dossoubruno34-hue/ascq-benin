"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, 
  Skull, 
  MapPin, 
  User, 
  Calendar, 
  Send, 
  Check, 
  AlertTriangle, 
  Lock,
  Phone,
  Clock,
  ChevronRight,
  Printer,
  Download
} from "lucide-react";
import SignatureCanvas from "@/components/SignatureCanvas";
import { exporterFicheSurveillanceIndividuelleExcel } from "@/lib/excelExport";
import { 
  DECES_TYPES_OFFICIELS, 
  DECES_LIEUX_OFFICIELS, 
  DECES_CIRCONSTANCES_OFFICIELLES,
  calculerTypeDecesParAge,
  getEpidemiologicalWeek
} from "@/lib/fiches";

export default function NouveauDecesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  // Profil & géographie
  const [userProfile, setUserProfile] = useState<any>(null);
  const [departements, setDepartements] = useState<any[]>([]);
  const [communes, setCommunes] = useState<any[]>([]);
  const [arrondissements, setArrondissements] = useState<any[]>([]);

  // Dates
  const todayStr = new Date().toISOString().split("T")[0];
  const [dateDeces, setDateDeces] = useState(todayStr);
  const [heureDeces, setHeureDeces] = useState("06:00");
  const [dateNotification, setDateNotification] = useState(todayStr);

  // Localisation
  const [departementId, setDepartementId] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [arrondissementId, setArrondissementId] = useState("");
  const [villageNom, setVillageNom] = useState("");
  const [numeroGrappe, setNumeroGrappe] = useState<number>(1);
  const [nomGrappe, setNomGrappe] = useState("");
  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null);
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null);

  // Défunt
  const [nomDefunt, setNomDefunt] = useState("");
  const [prenomsDefunt, setPrenomsDefunt] = useState("");
  const [npiDefunt, setNpiDefunt] = useState("");
  const [sexe, setSexe] = useState<"M" | "F">("M");
  const [ageValeur, setAgeValeur] = useState<number>(30);
  const [ageUnite, setAgeUnite] = useState<"ANS" | "MOIS" | "JOURS">("ANS");
  const [estDecesMaternel, setEstDecesMaternel] = useState(false);

  // Parent / Contact
  const [nomParent, setNomParent] = useState("");
  const [telephoneParent, setTelephoneParent] = useState("");
  const [adresseDomicile, setAdresseDomicile] = useState("");

  // Typologie
  const [typeDecesCode, setTypeDecesCode] = useState<number>(5);
  const [lieuDecesCode, setLieuDecesCode] = useState<number>(2); // Domicile par défaut
  const [lieuPaysEtranger, setLieuPaysEtranger] = useState("");
  const [circonstanceCode, setCirconstanceCode] = useState<number>(2); // Maladie par défaut
  const [circonstanceAutrePrecision, setCirconstanceAutrePrecision] = useState("");

  // Signature
  const [signatureTactile, setSignatureTactile] = useState<string | null>(null);

  const epidemio = getEpidemiologicalWeek(dateNotification);

  // Mise à jour automatique de la proposition de type selon l'âge et le sexe
  useEffect(() => {
    const codePropose = calculerTypeDecesParAge(ageValeur, ageUnite, estDecesMaternel);
    setTypeDecesCode(codePropose);
  }, [ageValeur, ageUnite, estDecesMaternel]);

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/connexion"); return; }

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
        console.error("Erreur init décès:", err);
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
      if (!nomDefunt.trim() || !prenomsDefunt.trim()) {
        throw new Error("Le nom et le prénom du défunt sont obligatoires.");
      }
      if (typeDecesCode === 1 && sexe !== "F") {
        throw new Error("Le décès maternel est strictement réservé au sexe féminin.");
      }
      if (lieuDecesCode === 6 && !lieuPaysEtranger.trim()) {
        throw new Error("Veuillez renseigner le nom du pays étranger de décès.");
      }
      if (circonstanceCode === 7 && !circonstanceAutrePrecision.trim()) {
        throw new Error("Veuillez préciser la circonstance du décès.");
      }
      if (!signatureTactile) {
        throw new Error("La signature du notificateur est requise.");
      }

      const { data, error } = await supabase.rpc("creer_notification_deces", {
        p_date_deces: dateDeces,
        p_heure_deces: heureDeces || "06:00",
        p_date_notification: dateNotification,
        p_departement_id: departementId,
        p_commune_id: communeId,
        p_arrondissement_id: arrondissementId,
        p_village_nom: villageNom.trim(),
        p_numero_grappe: numeroGrappe || 1,
        p_nom_grappe: nomGrappe.trim() || null,
        p_gps_latitude: gpsLatitude,
        p_gps_longitude: gpsLongitude,
        p_type_deces_code: typeDecesCode,
        p_lieu_deces_code: lieuDecesCode,
        p_lieu_pays_etranger: lieuPaysEtranger.trim() || null,
        p_circonstance_code: circonstanceCode,
        p_circonstance_autre_precision: circonstanceAutrePrecision.trim() || null,
        p_sexe: sexe,
        p_age_valeur: ageValeur,
        p_age_unite: ageUnite,
        p_signature_tactile: signatureTactile,
        p_nom_defunt: nomDefunt.trim(),
        p_prenoms_defunt: prenomsDefunt.trim(),
        p_npi_defunt: npiDefunt.trim() || null,
        p_date_naissance: null,
        p_nom_parent: nomParent.trim() || null,
        p_telephone_parent: telephoneParent.trim() || null,
        p_adresse_domicile: adresseDomicile.trim() || null,
      });

      if (error) throw error;
      setSuccessResult(data);

    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de la notification de décès.");
    } finally {
      setSubmitting(false);
    }
  };

  if (successResult) {
    const ficheDecesExport = {
      numero: successResult.numero_deces,
      type: "DEC",
      titre: `Décès Communautaire : ${nomDefunt} ${prenomsDefunt}`,
      semaine: successResult.semaine_epidemio,
      annee: successResult.annee,
      date: dateDeces,
      village: villageNom,
      impact: `1 décès (${ageValeur} ${ageUnite}, sexe ${sexe})`,
      notificateur: userProfile?.nom_complet || "ASCQ",
      notificateurTel: userProfile?.telephone || "-",
      statut: "ENREGISTRÉE"
    };

    return (
      <div className="min-h-screen bg-[#f4f7f5] text-slate-800 p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 text-purple-700 flex items-center justify-center animate-bounce">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-mono font-extrabold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              {successResult.numero_deces}
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 pt-2">
              Décès Communautaire Notifié !
            </h2>
            <p className="text-xs text-slate-500">
              La notification officielle est enregistrée pour autopsie verbale sous supervision médicale.
            </p>
          </div>

          {/* BOUTONS D'IMPRESSION & TÉLÉCHARGEMENT DIRECTS */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => window.print()}
              className="py-2.5 px-3 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer (A4)</span>
            </button>

            <button
              type="button"
              onClick={() => exporterFicheSurveillanceIndividuelleExcel(ficheDecesExport)}
              className="py-2.5 px-3 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger Excel</span>
            </button>
          </div>

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
            <h1 className="text-sm font-extrabold">Notification de Décès</h1>
            <p className="text-[10px] text-white/80">Code DEC-</p>
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
              <h2 className="font-extrabold text-sm text-slate-900">Localisation & Dates</h2>
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
                <label className="text-xs font-bold text-slate-700">Date du décès *</label>
                <input
                  type="date"
                  value={dateDeces}
                  onChange={(e) => setDateDeces(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Heure du décès</label>
                <input
                  type="time"
                  value={heureDeces}
                  onChange={(e) => setHeureDeces(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Identité du défunt (Protégée sous RLS) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#005c30]">
                <User className="w-5 h-5" />
                <h2 className="font-extrabold text-sm text-slate-900">Identité du défunt</h2>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Protégé RLS</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nom du défunt *</label>
                <input
                  type="text"
                  placeholder="Ex: DOSSOU"
                  value={nomDefunt}
                  onChange={(e) => setNomDefunt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 uppercase text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Prénoms du défunt *</label>
                <input
                  type="text"
                  placeholder="Ex: Paul"
                  value={prenomsDefunt}
                  onChange={(e) => setPrenomsDefunt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Sexe *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setSexe("M"); setEstDecesMaternel(false); }}
                    className={`flex-1 py-2 text-xs font-extrabold rounded-xl border ${
                      sexe === "M" ? "bg-[#005c30] text-white border-[#005c30]" : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Masculin
                  </button>
                  <button
                    type="button"
                    onClick={() => setSexe("F")}
                    className={`flex-1 py-2 text-xs font-extrabold rounded-xl border ${
                      sexe === "F" ? "bg-[#005c30] text-white border-[#005c30]" : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Féminin
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Âge *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={ageValeur}
                    onChange={(e) => setAgeValeur(parseInt(e.target.value) || 0)}
                    className="w-16 px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-center"
                  />
                  <select
                    value={ageUnite}
                    onChange={(e) => setAgeUnite(e.target.value as any)}
                    className="flex-1 px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    <option value="ANS">Ans</option>
                    <option value="MOIS">Mois</option>
                    <option value="JOURS">Jours</option>
                  </select>
                </div>
              </div>
            </div>

            {sexe === "F" && (
              <label className="flex items-center gap-2 p-2.5 bg-pink-50 rounded-xl border border-pink-200 cursor-pointer text-xs font-bold text-pink-950">
                <input
                  type="checkbox"
                  checked={estDecesMaternel}
                  onChange={(e) => {
                    setEstDecesMaternel(e.target.checked);
                    if (e.target.checked) {
                      setTypeDecesCode(1);
                      setCirconstanceCode(1);
                    }
                  }}
                  className="rounded text-pink-600 focus:ring-pink-500 w-4 h-4"
                />
                <span>Il s'agit d'un décès maternel (grossesse, accouchement, ou suites)</span>
              </label>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Parent / Proche contact</label>
                <input
                  type="text"
                  placeholder="Nom du proche"
                  value={nomParent}
                  onChange={(e) => setNomParent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Téléphone du proche</label>
                <input
                  type="tel"
                  placeholder="Ex: 97000000"
                  value={telephoneParent}
                  onChange={(e) => setTelephoneParent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Adresse exacte du domicile</label>
              <input
                type="text"
                placeholder="Ex: Maison DOSSOU près du grand baobab"
                value={adresseDomicile}
                onChange={(e) => setAdresseDomicile(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Typologie & Circonstances du décès */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <h2 className="font-extrabold text-sm text-slate-900">Type & Circonstances du décès</h2>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Type de décès (proposition automatique modifiable) *</label>
              <select
                value={typeDecesCode}
                onChange={(e) => setTypeDecesCode(parseInt(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-purple-300 bg-purple-50/50 text-xs font-bold text-purple-950"
              >
                {DECES_TYPES_OFFICIELS.map((td) => (
                  <option key={td.code} value={td.code}>
                    {td.code}. {td.nom} ({td.description})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Lieu du décès *</label>
                <select
                  value={lieuDecesCode}
                  onChange={(e) => setLieuDecesCode(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                >
                  {DECES_LIEUX_OFFICIELS.map((l) => (
                    <option key={l.code} value={l.code}>{l.nom}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Circonstance *</label>
                <select
                  value={circonstanceCode}
                  onChange={(e) => setCirconstanceCode(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                >
                  {DECES_CIRCONSTANCES_OFFICIELLES.map((c) => (
                    <option key={c.code} value={c.code}>{c.nom}</option>
                  ))}
                </select>
              </div>
            </div>

            {lieuDecesCode === 6 && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nom du pays étranger *</label>
                <input
                  type="text"
                  placeholder="Ex: Nigeria, Togo, France..."
                  value={lieuPaysEtranger}
                  onChange={(e) => setLieuPaysEtranger(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            )}
          </div>

          {/* Signature notificateur */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="font-extrabold text-sm text-slate-900">Signature du notificateur</h2>
            <SignatureCanvas onSignatureChange={(sig) => setSignatureTactile(sig)} />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? "Transmission en cours..." : (
              <>
                <Send className="w-4 h-4" />
                <span>Transmettre la notification de décès</span>
              </>
            )}
          </button>

        </form>
      </main>
    </div>
  );
}
