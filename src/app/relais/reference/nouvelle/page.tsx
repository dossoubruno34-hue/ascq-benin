"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Building2,
  HeartPulse,
  ShieldAlert,
  Send,
  AlertTriangle,
  CheckCircle2,
  User,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  HelpCircle,
  FileText,
  Activity,
  Trees,
  Check
} from "lucide-react";
import {
  MOTIFS_REFERENCES_SANTE,
  MOTIFS_REFERENCES_GUPS,
  ONE_HEALTH_SECTEURS
} from "@/lib/fiches";

export default function NouvelleReferenceCommunautairePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Typologie & Destination
  const [typeReference, setTypeReference] = useState<"SANTE" | "SOCIAL_GUPS">("SANTE");
  const [destinationNom, setDestinationNom] = useState("");
  const [degreUrgence, setDegreUrgence] = useState<"NORMALE" | "URGENTE" | "EVACUATION_IMMEDIATE">("NORMALE");

  // 2. Motif sélectionné
  const [motifCode, setMotifCode] = useState<string>("");
  const [motifLibelle, setMotifLibelle] = useState<string>("");
  const [motifDetails, setMotifDetails] = useState<string>("");

  // 3. Approche One Health
  const [oneHealthConcerne, setOneHealthConcerne] = useState<boolean>(false);
  const [oneHealthSecteur, setOneHealthSecteur] = useState<string>("SANTE_HUMAINE");

  // 4. Identification du patient / bénéficiaire
  const [nomPatient, setNomPatient] = useState("");
  const [prenomsPatient, setPrenomsPatient] = useState("");
  const [sexe, setSexe] = useState<"M" | "F">("M");
  const [ageValeur, setAgeValeur] = useState<number>(1);
  const [ageUnite, setAgeUnite] = useState<"ANS" | "MOIS" | "JOURS">("ANS");
  const [telephoneContact, setTelephoneContact] = useState("");
  const [nomParentTuteur, setNomParentTuteur] = useState("");
  const [villageNom, setVillageNom] = useState("");
  const [adresseExacte, setAdresseExacte] = useState("");
  const [premiersSecours, setPremiersSecours] = useState("");

  useEffect(() => {
    const init = async () => {
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
          .maybeSingle();

        setCurrentUser(profil);

        // Si c'est un Relais Communautaire, récupérer son village et son ASCQ
        if (profil?.poste === "RC") {
          const { data: rcData } = await supabase
            .from("relais_communautaires")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (rcData) {
            setVillageNom(rcData.village_nom || "");
            setDestinationNom(`Centre de Santé de ${rcData.village_nom || "la zone"}`);
          }
        } else {
          setDestinationNom(profil?.commune_nom ? `Centre de Santé Communal de ${profil.commune_nom}` : "Centre de Santé");
        }

        // Motif par défaut
        setMotifCode(MOTIFS_REFERENCES_SANTE[0].code);
        setMotifLibelle(MOTIFS_REFERENCES_SANTE[0].nom);

      } catch (err) {
        console.error("Erreur init nouvelle référence:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  // Basculement Type : ajuster destination et motifs
  const handleTypeChange = (newType: "SANTE" | "SOCIAL_GUPS") => {
    setTypeReference(newType);
    if (newType === "SANTE") {
      setMotifCode(MOTIFS_REFERENCES_SANTE[0].code);
      setMotifLibelle(MOTIFS_REFERENCES_SANTE[0].nom);
      setDestinationNom(
        currentUser?.commune_nom 
          ? `Centre de Santé Communal de ${currentUser.commune_nom}` 
          : "Centre de Santé le plus proche"
      );
    } else {
      setMotifCode(MOTIFS_REFERENCES_GUPS[0].code);
      setMotifLibelle(MOTIFS_REFERENCES_GUPS[0].nom);
      setDestinationNom(
        currentUser?.commune_nom 
          ? `Guichet Unique de Protection Sociale (GUPS) de ${currentUser.commune_nom}` 
          : "Guichet Unique de Protection Sociale (GUPS)"
      );
    }
  };

  const handleMotifSelect = (code: string) => {
    const list = typeReference === "SANTE" ? MOTIFS_REFERENCES_SANTE : MOTIFS_REFERENCES_GUPS;
    const found = list.find(m => m.code === code);
    if (found) {
      setMotifCode(found.code);
      setMotifLibelle(found.nom);
      // Si morsure ou cas One Health détecté
      if (found.code.includes("MORSURE") || found.code.includes("RAGE") || found.code.includes("ZOONOSE")) {
        setOneHealthConcerne(true);
        setOneHealthSecteur("SANTE_ANIMALE_ZOONOSE");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomPatient.trim() || !prenomsPatient.trim()) {
      setErrorMsg("Veuillez renseigner le nom et le prénom de la personne référée.");
      return;
    }
    if (!destinationNom.trim()) {
      setErrorMsg("Veuillez préciser la structure de destination (Centre de Santé ou GUPS).");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const destinationType = typeReference === "SANTE" ? "CENTRE_SANTE" : "GUPS";
    const detailsComplets = [
      motifDetails.trim(),
      premiersSecours.trim() ? `Premiers soins / mesures communautaires : ${premiersSecours.trim()}` : null
    ].filter(Boolean).join(" | ");

    try {
      // 1. Tenter l'appel RPC sécurisé
      const { data, error } = await supabase.rpc("creer_reference_communautaire", {
        p_type_reference: typeReference,
        p_destination_type: destinationType,
        p_destination_nom: destinationNom.trim(),
        p_motif_code: motifCode,
        p_motif_libelle: motifLibelle,
        p_motif_details: detailsComplets || null,
        p_degre_urgence: degreUrgence,
        p_one_health_concerne: oneHealthConcerne,
        p_one_health_secteur: oneHealthConcerne ? oneHealthSecteur : null,
        p_nom_patient: nomPatient.trim(),
        p_prenoms_patient: prenomsPatient.trim(),
        p_sexe: sexe,
        p_age_valeur: Number(ageValeur) || 1,
        p_age_unite: ageUnite,
        p_telephone_contact: telephoneContact.trim() || null,
        p_nom_parent_tuteur: nomParentTuteur.trim() || null,
        p_adresse_exacte: adresseExacte.trim() || null,
        p_village_nom: villageNom.trim() || null,
      });

      if (error) {
        // Fallback insertion directe sur la table
        const now = new Date();
        const annee = now.getFullYear();
        const semaine = Math.ceil((((now.getTime() - new Date(annee, 0, 1).getTime()) / 86400000) + 1) / 7);
        const numeroDirect = `REF-${annee}-W${String(semaine).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`;

        const { data: insData, error: insErr } = await supabase
          .from("references_communautaires")
          .insert({
            numero_reference: numeroDirect,
            type_reference: typeReference,
            destination_type: destinationType,
            destination_nom: destinationNom.trim(),
            motif_code: motifCode,
            motif_libelle: motifLibelle,
            motif_details: detailsComplets || null,
            degre_urgence: degreUrgence,
            one_health_concerne: oneHealthConcerne,
            one_health_secteur: oneHealthConcerne ? oneHealthSecteur : null,
            semaine_epidemio: semaine,
            annee: annee,
            departement_id: currentUser?.departement_id || null,
            commune_id: currentUser?.commune_id || null,
            arrondissement_id: currentUser?.arrondissement_id || null,
            village_nom: villageNom.trim() || "Communauté",
            nom_patient: nomPatient.trim().toUpperCase(),
            prenoms_patient: prenomsPatient.trim(),
            sexe: sexe,
            age_valeur: Number(ageValeur) || 1,
            age_unite: ageUnite,
            telephone_contact: telephoneContact.trim() || null,
            nom_parent_tuteur: nomParentTuteur.trim() || null,
            adresse_exacte: adresseExacte.trim() || null,
            statut: currentUser?.poste === "RC" ? "EN_ATTENTE_ASCQ" : "VALIDEE",
            relais_nom: currentUser ? `${currentUser.prenoms} ${currentUser.nom}` : "Relais Communautaire",
            relais_telephone: currentUser?.telephone || "",
            ascq_id: currentUser?.poste === "ASCQ" ? currentUser.id : null,
            ascq_nom: currentUser?.poste === "ASCQ" ? `${currentUser.prenoms} ${currentUser.nom}` : "Superviseur ASCQ",
          })
          .select()
          .single();

        if (insErr) throw insErr;

        setSuccessResult({
          numero_reference: numeroDirect,
          destination_nom: destinationNom,
          statut: currentUser?.poste === "RC" ? "EN_ATTENTE_ASCQ" : "VALIDEE",
        });
        return;
      }

      setSuccessResult(data);
    } catch (err: any) {
      console.error("Erreur enregistrement référence:", err);
      setErrorMsg(err.message || "Erreur lors de la création de la référence.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="text-center space-y-2 text-slate-500">
          <Activity className="w-8 h-8 animate-spin mx-auto text-[#005c30]" />
          <p className="text-xs font-semibold">Chargement du formulaire de référence...</p>
        </div>
      </div>
    );
  }

  // ÉCRAN DE SUCCÈS
  if (successResult) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#005c30] flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Référence transmise avec succès
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-2">
              N° {successResult.numero_reference}
            </h2>
            <p className="text-xs text-slate-600">
              Destination : <strong className="text-slate-900">{successResult.destination_nom || destinationNom}</strong>
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left text-xs space-y-2">
            <p className="text-slate-700 font-medium leading-relaxed">
              {currentUser?.poste === "RC" ? (
                <>
                  ✅ L'alerte de référence a été transmise à votre <strong>ASCQ Superviseur</strong>. Dès qu'il la valide, le bulletin officiel est généré pour remise au responsable du centre de santé ou du GUPS.
                </>
              ) : (
                <>
                  ✅ La référence est validée d'office. Le bulletin officiel est disponible immédiatement dans votre espace pour impression ou téléchargement Excel.
                </>
              )}
            </p>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              Patient référé : <strong>{nomPatient.toUpperCase()} {prenomsPatient}</strong> ({ageValeur} {ageUnite.toLowerCase()})
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Link
              href={currentUser?.poste === "RC" ? "/espace-rc" : "/espace-ascq/references"}
              className="w-full py-3 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>{currentUser?.poste === "RC" ? "Retour à mon espace RC" : "Voir mes références ASCQ"}</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setSuccessResult(null);
                setNomPatient("");
                setPrenomsPatient("");
                setMotifDetails("");
                setPremiersSecours("");
              }}
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Référer un autre cas
            </button>
          </div>
        </div>
      </div>
    );
  }

  const listeMotifs = typeReference === "SANTE" ? MOTIFS_REFERENCES_SANTE : MOTIFS_REFERENCES_GUPS;

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-28">
      {/* En-tête mobile officiel */}
      <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href={currentUser?.poste === "RC" ? "/espace-rc" : "/espace-ascq"}
            className="flex items-center gap-2 text-white/90 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold">Retour</span>
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-extrabold tracking-tight">Fiche de Référence Communautaire</h1>
            <p className="text-[10px] text-white/80">Santé Publique & GUPS (Protection Sociale)</p>
          </div>
          <div className="w-8"></div>
        </div>
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {/* En-tête explicatif */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
              Circuit de Référence Officiel
            </span>
            <span className="text-xs text-slate-400 font-bold">Phase 12 One Health</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">
            Orientation de Cas : Centre de Santé ou GUPS
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Permet au Relais ou à l'ASCQ de référer rapidement un malade vers le centre de santé ou un cas de vulnérabilité / violence vers le Guichet Unique de Protection Sociale (GUPS).
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. SÉLECTION DE LA DESTINATION : SANTÉ OU GUPS */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900">1. Destination de la Référence *</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleTypeChange("SANTE")}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                  typeReference === "SANTE"
                    ? "bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <HeartPulse className={`w-5 h-5 ${typeReference === "SANTE" ? "text-[#005c30]" : "text-slate-400"}`} />
                  {typeReference === "SANTE" && <Check className="w-4 h-4 text-[#005c30] stroke-[3]" />}
                </div>
                <div>
                  <strong className="block text-xs font-black">Centre de Santé</strong>
                  <span className="text-[10px] text-slate-500 leading-tight block">Maladies, urgences médicales, iCCM</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange("SOCIAL_GUPS")}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                  typeReference === "SOCIAL_GUPS"
                    ? "bg-purple-50/80 border-purple-500 text-purple-950 ring-2 ring-purple-500/20 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Building2 className={`w-5 h-5 ${typeReference === "SOCIAL_GUPS" ? "text-purple-700" : "text-slate-400"}`} />
                  {typeReference === "SOCIAL_GUPS" && <Check className="w-4 h-4 text-purple-700 stroke-[3]" />}
                </div>
                <div>
                  <strong className="block text-xs font-black">GUPS (Social)</strong>
                  <span className="text-[10px] text-slate-500 leading-tight block">VBG, indigence, enfance, handicap</span>
                </div>
              </button>
            </div>

            <div className="space-y-1 pt-1">
              <label className="font-bold text-slate-700">Nom de la structure destinataire *</label>
              <input
                type="text"
                required
                value={destinationNom}
                onChange={(e) => setDestinationNom(e.target.value)}
                placeholder={typeReference === "SANTE" ? "Ex: Centre de Santé d'Arrondissement de Gangban" : "Ex: Guichet Unique de Protection Sociale (GUPS) de Ouinhi"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-[#005c30]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Niveau d'urgence *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDegreUrgence("NORMALE")}
                  className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold ${
                    degreUrgence === "NORMALE" ? "bg-slate-800 text-white border-slate-900" : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  Normale
                </button>
                <button
                  type="button"
                  onClick={() => setDegreUrgence("URGENTE")}
                  className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold ${
                    degreUrgence === "URGENTE" ? "bg-amber-600 text-white border-amber-700" : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  ⚠️ Urgente
                </button>
                <button
                  type="button"
                  onClick={() => setDegreUrgence("EVACUATION_IMMEDIATE")}
                  className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold ${
                    degreUrgence === "EVACUATION_IMMEDIATE" ? "bg-red-600 text-white border-red-700" : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  🚨 Évacuation
                </button>
              </div>
            </div>
          </div>

          {/* 2. MOTIF DE LA RÉFÉRENCE */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900">
              2. Motif Officiel de Référence ({typeReference === "SANTE" ? "Médical" : "Social"}) *
            </h3>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Sélectionner le motif principal</label>
              <select
                value={motifCode}
                onChange={(e) => handleMotifSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#005c30]"
              >
                {listeMotifs.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Signes observés / Description détaillée du cas</label>
              <textarea
                rows={2}
                value={motifDetails}
                onChange={(e) => setMotifDetails(e.target.value)}
                placeholder="Ex: Fièvre élevée depuis 3 jours, vomissements, pâleur conjonctivale..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-[#005c30]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Premiers soins ou mesures prises à domicile</label>
              <input
                type="text"
                value={premiersSecours}
                onChange={(e) => setPremiersSecours(e.target.value)}
                placeholder="Ex: SRO donné, lavage de la plaie à grande eau savonneuse, mise à l'abri..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-[#005c30]"
              />
            </div>
          </div>

          {/* 3. APPROCHE ONE HEALTH (UNE SEULE SANTÉ) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trees className="w-4 h-4 text-emerald-700" />
                <h3 className="font-extrabold text-sm text-slate-900">3. Approche One Health (Une Seule Santé)</h3>
              </div>
              <input
                type="checkbox"
                checked={oneHealthConcerne}
                onChange={(e) => setOneHealthConcerne(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Cochez cette case si le cas implique une exposition animale (morsure, bête malade, cadavre suspect) ou environnementale (eau souillée, pollution).
            </p>

            {oneHealthConcerne && (
              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2">
                <label className="font-bold text-emerald-950 block">Secteur One Health concerné :</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ONE_HEALTH_SECTEURS.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => setOneHealthSecteur(s.code)}
                      className={`p-2 rounded-xl border text-left text-[11px] font-bold ${
                        oneHealthSecteur === s.code
                          ? "bg-white text-emerald-900 border-emerald-500 shadow-sm"
                          : "bg-emerald-100/50 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {s.nom}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. IDENTIFICATION DU PATIENT OU BÉNÉFICIAIRE */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <h3 className="font-extrabold text-sm text-slate-900">4. Bénéficiaire / Patient Référé *</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nom de famille *</label>
                <input
                  type="text"
                  required
                  value={nomPatient}
                  onChange={(e) => setNomPatient(e.target.value)}
                  placeholder="Ex: BIO"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold uppercase focus:ring-2 focus:ring-[#005c30]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Prénoms *</label>
                <input
                  type="text"
                  required
                  value={prenomsPatient}
                  onChange={(e) => setPrenomsPatient(e.target.value)}
                  placeholder="Ex: Christiane"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-[#005c30]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Sexe *</label>
                <select
                  value={sexe}
                  onChange={(e) => setSexe(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                >
                  <option value="M">Masculin (M)</option>
                  <option value="F">Féminin (F)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Âge *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={ageValeur}
                  onChange={(e) => setAgeValeur(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-center font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Unité d'âge *</label>
                <select
                  value={ageUnite}
                  onChange={(e) => setAgeUnite(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                >
                  <option value="ANS">Ans</option>
                  <option value="MOIS">Mois</option>
                  <option value="JOURS">Jours</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nom du Parent / Tuteur / Chef de ménage</label>
                <input
                  type="text"
                  value={nomParentTuteur}
                  onChange={(e) => setNomParentTuteur(e.target.value)}
                  placeholder="Ex: BIO Sabi (Père)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Téléphone de contact</label>
                <input
                  type="tel"
                  value={telephoneContact}
                  onChange={(e) => setTelephoneContact(e.target.value)}
                  placeholder="Ex: 97000000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Village / Quartier de résidence *</label>
                <input
                  type="text"
                  required
                  value={villageNom}
                  onChange={(e) => setVillageNom(e.target.value)}
                  placeholder="Ex: Gangban Kpodji"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Adresse ou repère géographique</label>
                <input
                  type="text"
                  value={adresseExacte}
                  onChange={(e) => setAdresseExacte(e.target.value)}
                  placeholder="Ex: Près du grand fromager / Maison du chef"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

          {/* 5. BOUTON DE SOUMISSION */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span>Transmission en cours...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  {currentUser?.poste === "RC"
                    ? "Transmettre la référence à mon ASCQ"
                    : "Enregistrer & Valider la référence"}
                </span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
