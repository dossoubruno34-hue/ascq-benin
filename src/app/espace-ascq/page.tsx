"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AscqNav from "@/components/AscqNav";
import { 
  Home, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Building2, 
  Wallet, 
  Users, 
  Lock, 
  Edit3, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeftRight, 
  MessageSquareText, 
  RefreshCw,
  ExternalLink,
  Camera,
  Trash2,
  WifiOff,
  Baby,
  Stethoscope,
  HeartPulse,
  Calendar,
  BarChart3,
  ChevronRight
} from "lucide-react";
import { getCachedMonEspace, saveCachedMonEspace, saveCachedUserSession, getCachedUserSession } from "@/lib/offline-sync";
import { estCadreNonAscq } from "@/lib/cadre-roles";

export default function MonEspacePage() {
  const router = useRouter();
  const [espaceData, setEspaceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Édition des champs autorisés (Téléphone, Source de financement, Nombre de RC)
  const [isEditing, setIsEditing] = useState(false);
  const [telephone, setTelephone] = useState("");
  const [sourceFinancement, setSourceFinancement] = useState("LLF");
  const [sourceFinancementAutre, setSourceFinancementAutre] = useState("");
  const [nombreRc, setNombreRc] = useState(0);

  // Gestion de la photo de profil
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; error: boolean } | null>(null);

  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [derniereSynchro, setDerniereSynchro] = useState<string | null>(null);

  const handleSynchroniserEspace = async () => {
    setIsSyncing(true);
    try {
      await loadEspaceData();
      const heureStr = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      setDerniereSynchro(heureStr);
      setSaveMsg({ text: `Espace synchronisé avec succès à ${heureStr} !`, error: false });
      setTimeout(() => setSaveMsg(null), 3500);
    } catch (e: any) {
      setSaveMsg({ text: "Erreur lors de la synchronisation.", error: true });
    } finally {
      setIsSyncing(false);
    }
  };

  const loadEspaceData = async () => {
    setLoading(true);
    setLoadError("");

    // Vérifier si l'utilisateur connecté est un Cadre / Responsable de santé (qui n'est pas ASCQ)
    const session = getCachedUserSession();
    if (session?.profile && estCadreNonAscq(session.profile)) {
      window.location.replace("/perimetre");
      return;
    }

    // 1. Charger immédiatement le cache local hors-ligne pour affichage instantané (0ms)
    const cached = getCachedMonEspace();
    if (cached) {
      if (estCadreNonAscq(cached)) {
        window.location.replace("/perimetre");
        return;
      }
      setEspaceData(cached);
      setTelephone(cached.telephone || "");
      setSourceFinancement(cached.source_financement || "LLF");
      setSourceFinancementAutre(cached.source_financement_autre || "");
      setNombreRc(cached.nombre_rc_declare || 5);
      setPhotoUrl(cached.photo_url || null);
      setLoading(false);
    }

    // Si l'appareil est hors-ligne, s'arrêter là sans faire de requête réseau
    if (!navigator.onLine) {
      setIsOfflineMode(true);
      setLoading(false);
      return;
    }

    try {
      // 2. Essayer la RPC Phase 5 obtenir_mon_espace
      try {
        const { data, error } = await supabase.rpc("obtenir_mon_espace");
        if (!error && data && data.nom) {
          if (estCadreNonAscq(data)) {
            window.location.replace("/perimetre");
            return;
          }
          setEspaceData(data);
          saveCachedMonEspace(data);
          setTelephone(data.telephone || "");
          setSourceFinancement(data.source_financement || "LLF");
          setSourceFinancementAutre(data.source_financement_autre || "");
          setNombreRc(data.nombre_rc_declare || 0);
          setPhotoUrl(data.photo_url || null);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("RPC obtenir_mon_espace non accessible, bascule directe:", e);
      }

      // 3. Récupération directe et transparente des données complètes
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (cached) {
          setIsOfflineMode(true);
          return;
        }
        router.push("/connexion");
        return;
      }

      const [uRes, pRes, rcCountRes, reqCountRes] = await Promise.all([
        supabase
          .from("utilisateurs")
          .select("id, nom, prenoms, telephone, poste, role_technique, role_nomination, poste_autre, structure_sante_id, statut_compte, departement_id, commune_id, arrondissement_id, zone_sanitaire_id, photo_url")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("ascq_profils")
          .select("*")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("relais_communautaires")
          .select("*", { count: "exact", head: true })
          .eq("ascq_id", user.id),
        supabase
          .from("requetes_ascq")
          .select("*", { count: "exact", head: true })
          .eq("ascq_id", user.id)
          .in("statut", ["ENVOYEE", "EN_COURS"]),
      ]);

      const prof: any = uRes.data;
      if (!prof) {
        if (cached) {
          setIsOfflineMode(true);
          return;
        }
        router.push("/connexion");
        return;
      }

      if (estCadreNonAscq(prof)) {
        window.location.replace("/perimetre");
        return;
      }

      const ascqP = pRes.data || {};

      // Récupérer les libellés géographiques
      let depNom = "Non défini";
      let comNom = prof.commune_id ? "Commune" : "Tout le département";
      let arrNom = prof.arrondissement_id ? "Arrondissement" : "Tous les arrondissements";
      let zsNom = "Zone Sanitaire";

      const [dRes, cRes, aRes, zRes] = await Promise.all([
        prof.departement_id ? supabase.from("departements").select("nom").eq("id", prof.departement_id).maybeSingle() : Promise.resolve({ data: null }),
        prof.commune_id ? supabase.from("communes").select("nom").eq("id", prof.commune_id).maybeSingle() : Promise.resolve({ data: null }),
        prof.arrondissement_id ? supabase.from("arrondissements").select("nom").eq("id", prof.arrondissement_id).maybeSingle() : Promise.resolve({ data: null }),
        prof.zone_sanitaire_id ? supabase.from("zones_sanitaires").select("nom").eq("id", prof.zone_sanitaire_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      if (dRes.data?.nom) depNom = dRes.data.nom;
      if (cRes.data?.nom) comNom = cRes.data.nom;
      if (aRes.data?.nom) arrNom = aRes.data.nom;
      if (zRes.data?.nom) zsNom = zRes.data.nom;

      const directData = {
        id: prof.id,
        nom: prof.nom,
        prenoms: prof.prenoms,
        telephone: prof.telephone,
        poste: prof.poste,
        role_technique: prof.role_technique,
        role_nomination: prof.role_nomination,
        poste_autre: prof.poste_autre,
        photo_url: prof.photo_url || null,
        departement_id: prof.departement_id,
        departement_nom: depNom,
        commune_id: prof.commune_id,
        commune_nom: comNom,
        arrondissement_id: prof.arrondissement_id,
        arrondissement_nom: arrNom,
        second_arrondissement_nom: null,
        cumul_deux_arrondissements: ascqP.cumul_deux_arrondissements || false,
        zone_sanitaire_nom: zsNom,
        structure_sante_nom: prof.structure_sante_id ? "Structure Sanitaire" : "Direction Départementale de la Santé / Supervision",
        source_financement: ascqP.source_financement || "LLF",
        source_financement_autre: ascqP.source_financement_autre || "",
        nombre_rc_declare: ascqP.nombre_rc || 5,
        nombre_rc_enroles: rcCountRes.count || 0,
        nombre_requetes_en_cours: reqCountRes.count || 0,
        permutation_active: null,
        is_fallback: false,
      };

      setEspaceData(directData);
      saveCachedMonEspace(directData);
      saveCachedUserSession(user, prof);

      setTelephone(prof.telephone || "");
      setSourceFinancement(ascqP.source_financement || "LLF");
      setSourceFinancementAutre(ascqP.source_financement_autre || "");
      setNombreRc(ascqP.nombre_rc || 5);
      setPhotoUrl(prof.photo_url || null);

    } catch (err: any) {
      console.warn("Erreur chargement mon espace, maintien du mode hors-ligne:", err);
      if (cached) {
        setIsOfflineMode(true);
      } else {
        setLoadError("Impossible de joindre le serveur. Vos données locales sont en cours de chargement.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 0. Garde-fou immédiat synchrone dès le premier cycle
    const session = getCachedUserSession();
    if (session?.profile && estCadreNonAscq(session.profile)) {
      window.location.replace("/perimetre");
      return;
    }
    const cached = getCachedMonEspace();
    if (cached && estCadreNonAscq(cached)) {
      window.location.replace("/perimetre");
      return;
    }
    loadEspaceData();
  }, []);

  const handleSaveModifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);

    try {
      let cleanFinancement = sourceFinancement;
      if (cleanFinancement === "LLF et FADEC Santé communautaire") {
        cleanFinancement = "LLF_FADEC";
      }

      const { data, error } = await supabase.rpc("mettre_a_jour_mon_espace", {
        p_telephone: telephone.trim(),
        p_source_financement: cleanFinancement,
        p_source_financement_autre: cleanFinancement === "AUTRE" ? sourceFinancementAutre.trim() : "",
        p_nombre_rc: parseInt(nombreRc as any, 10) || 0,
      });

      if (error) throw error;

      setSaveMsg({ text: "Informations modifiées avec succès !", error: false });
      setIsEditing(false);
      await loadEspaceData();
    } catch (err: any) {
      setSaveMsg({ text: err.message || "Erreur lors de la mise à jour.", error: true });
    } finally {
      setSaving(false);
    }
  };

  // Compression automatique de la photo de profil (Canvas HTML5)
  const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Envoi et mise à jour de la photo de profil
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Le fichier sélectionné est trop lourd (maximum 10 Mo).");
      return;
    }

    setPhotoUploading(true);
    try {
      const compressedDataUrl = await compressImage(file, 400, 400, 0.8);

      const { error } = await supabase.rpc("mettre_a_jour_photo_profil", {
        p_photo_url: compressedDataUrl,
      });

      if (error) {
        // Fallback mise à jour directe sur la table
        const { error: directErr } = await supabase
          .from("utilisateurs")
          .update({ photo_url: compressedDataUrl, updated_at: new Date().toISOString() })
          .eq("id", espaceData.id);
        if (directErr) throw directErr;
      }

      setPhotoUrl(compressedDataUrl);
      setSaveMsg({ text: "Photo de profil mise à jour avec succès !", error: false });
    } catch (err: any) {
      console.error("Erreur mise à jour photo:", err);
      alert("Erreur lors de la mise à jour de la photo : " + (err.message || "Veuillez réessayer."));
    } finally {
      setPhotoUploading(false);
    }
  };

  // Suppression de la photo de profil
  const handleRemovePhoto = async () => {
    if (!confirm("Voulez-vous vraiment retirer votre photo de profil ?")) return;
    setPhotoUploading(true);
    try {
      const { error } = await supabase.rpc("mettre_a_jour_photo_profil", {
        p_photo_url: null,
      });
      if (error) {
        await supabase.from("utilisateurs").update({ photo_url: null }).eq("id", espaceData.id);
      }
      setPhotoUrl(null);
      setSaveMsg({ text: "Photo de profil retirée.", error: false });
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setPhotoUploading(false);
    }
  };

  // Sécurité absolue : Ne jamais rendre la page si les données ne sont pas chargées
  if (loading || !espaceData) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="text-center space-y-3 text-slate-500 max-w-sm mx-auto">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#005c30]" />
          <p className="text-xs font-semibold">Chargement de votre situation...</p>
          {loadError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs space-y-2">
              <p>{loadError}</p>
              <Link href="/connexion" className="inline-block text-[#005c30] font-bold underline">
                Aller à la page de connexion
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Si l'utilisateur chargé est un Cadre (NON-ASCQ), bascule immédiate vers /perimetre
  if (espaceData && estCadreNonAscq(espaceData)) {
    if (typeof window !== "undefined") {
      window.location.replace("/perimetre");
    }
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex flex-col items-center justify-center p-4 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#005c30]" />
        <p className="text-xs font-bold text-slate-700">Redirection vers votre Périmètre de Gouvernance...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-20">
      <AscqNav userProfile={espaceData} />

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        
        {/* 0. Point "Synchronisé" officiel pour synchroniser */}
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              {isSyncing ? (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              ) : isOfflineMode ? (
                <span className="inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              ) : (
                <span className="inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isSyncing ? "bg-amber-500" : isOfflineMode ? "bg-amber-500" : "bg-emerald-500"}`}></span>
            </span>
            <div className="leading-tight">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <span>{isSyncing ? "Synchronisation en cours..." : isOfflineMode ? "Mode Hors-Ligne (Données locales)" : "Synchronisé"}</span>
                {!isSyncing && !isOfflineMode && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                    ✓ En ligne
                  </span>
                )}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                {derniereSynchro ? `Dernière synchronisation : ${derniereSynchro}` : "Cliquez sur Synchroniser pour actualiser"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSynchroniserEspace}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#005c30] text-white font-black text-xs hover:bg-[#004724] active:scale-95 transition-all shadow-xs disabled:opacity-50"
            title="Cliquer pour synchroniser maintenant"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Synchroniser</span>
          </button>
        </div>

        {/* Titre et statut */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Mon Espace Professionnel
            </h1>
            <p className="text-xs text-slate-500">
              Agent de Santé Communautaire Qualifié (ASCQ)
            </p>
          </div>
        </div>

        {/* Message de succès ou d'erreur de sauvegarde */}
        {saveMsg && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 border ${
              saveMsg.error
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200"
            }`}
          >
            {saveMsg.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{saveMsg.text}</span>
          </div>
        )}

        {/* BANDEAU MODE HORS-LIGNE DÉTECTÉ */}
        {isOfflineMode && (
          <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-xs text-amber-950 flex items-start gap-2.5 shadow-sm">
            <WifiOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="block text-amber-900 font-extrabold">Mode Hors-Ligne Actif (Zone Blanche)</strong>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Vos données sont chargées depuis la mémoire locale sécurisée de votre téléphone. Vous pouvez continuer à enregistrer vos consultations, alertes, plannings et références ; ils seront synchronisés dès le retour du réseau.
              </p>
            </div>
          </div>
        )}

        {/* Alerte si la migration n'a pas encore été exécutée */}
        {espaceData?.is_fallback && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong>Action requise :</strong> Pensez à exécuter la migration Phase 5 (fichier <code className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-amber-300">supabase/migrations/20261025_phase5_modules_ascq.sql</code>) dans l'éditeur SQL Supabase pour activer la gestion complète de votre espace.
            </p>
          </div>
        )}

        {/* CARTE 0 : Identité Officielle et Photo de Profil */}
        <section className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            {/* Avatar avec badge et bouton d'appareil photo */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-emerald-500/20 bg-slate-100 flex items-center justify-center shadow-md">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Photo de profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-2xl font-black text-[#005c30] uppercase">
                    {espaceData?.prenoms?.[0] || ""}{espaceData?.nom?.[0] || ""}
                  </div>
                )}
              </div>

              <label
                htmlFor="photo-upload-input"
                className="absolute bottom-0 right-0 p-2 rounded-full bg-[#005c30] hover:bg-[#004724] text-white shadow-lg cursor-pointer active:scale-90 transition-transform"
                title="Changer ma photo de profil"
              >
                <Camera className="w-4 h-4" />
                <input
                  id="photo-upload-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={photoUploading}
                />
              </label>
            </div>

            {/* Identité textuelle */}
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase">
                  {espaceData?.prenoms} {espaceData?.nom}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Compte Validé
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Poste : <strong className="text-slate-800">{espaceData?.poste}</strong> • Téléphone : <strong className="text-slate-800 font-mono">{espaceData?.telephone}</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                Aire : {espaceData?.commune_nom} • Arrondissement : {espaceData?.arrondissement_nom}
              </p>

              <div className="pt-2 flex items-center justify-center sm:justify-start gap-2">
                <label
                  htmlFor="photo-upload-input"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-bold text-xs cursor-pointer active:scale-95 transition-all border border-emerald-200/60"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>
                    {photoUploading
                      ? "Envoi en cours..."
                      : photoUrl
                      ? "Changer ma photo"
                      : "Ajouter ma photo de profil"}
                  </span>
                </label>
                {photoUrl && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={photoUploading}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Retirer</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 1. Carte Ma Situation & Affectation (Lecture seule) */}
        <section className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-[#005c30]">
              <MapPin className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Zone d'intervention & Affectation
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
              <Lock className="w-3 h-3" />
              Verrouillé
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Département</span>
              <span className="font-extrabold text-slate-900 uppercase">
                {espaceData?.departement_nom || "NON DÉFINI"}
              </span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Zone Sanitaire</span>
              <span className="font-extrabold text-slate-900 uppercase">
                {espaceData?.zone_sanitaire_nom || "NON DÉFINIE"}
              </span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Commune</span>
              <span className="font-extrabold text-slate-900 uppercase">
                {espaceData?.commune_nom || "NON DÉFINIE"}
              </span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Arrondissement</span>
              <span className="font-extrabold text-slate-900 uppercase">
                {espaceData?.arrondissement_nom || "NON DÉFINI"}
                {espaceData?.cumul_deux_arrondissements && espaceData?.second_arrondissement_nom && (
                  <span className="text-emerald-700 block text-[11px] font-semibold">
                    + {espaceData.second_arrondissement_nom} (Cumul)
                  </span>
                )}
              </span>
            </div>

            <div className="col-span-2 p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Structure de santé de référence</span>
              <span className="font-extrabold text-slate-900 uppercase">
                {espaceData?.structure_sante_nom || "CENTRE DE SANTÉ COMMUNAL"}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 flex items-center justify-between">
            <span>Une erreur sur votre affectation ou structure ?</span>
            <Link
              href="/espace-ascq/requetes"
              className="font-bold underline text-[#005c30] hover:text-[#004724]"
            >
              Faire une requête
            </Link>
          </div>
        </section>

        {/* 2. Carte Informations Modifiables (Téléphone, Financement, RC) */}
        <section className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-[#005c30]">
              <Edit3 className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Paramètres d'activité modifiables
              </h2>
            </div>

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs font-bold text-[#005c30] hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Annuler
              </button>
            )}
          </div>

          {!isEditing ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>Numéro de téléphone professionnel</span>
                </div>
                <span className="font-bold text-slate-900">{espaceData?.telephone || "Non renseigné"}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <Wallet className="w-4 h-4 text-slate-400" />
                  <span>Source de financement</span>
                </div>
                <span className="font-bold text-slate-900">
                  {espaceData?.source_financement === "LLF_FADEC"
                    ? "LLF et FADEC Santé communautaire"
                    : espaceData?.source_financement || "LLF"}
                  {espaceData?.source_financement_autre ? ` (${espaceData.source_financement_autre})` : ""}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Relais communautaires en charge</span>
                </div>
                <span className="font-bold text-slate-900">
                  {espaceData?.nombre_rc_declare ?? 0} déclarés ({espaceData?.nombre_rc_enroles ?? 0} enrôlés)
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveModifications} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Téléphone professionnel
                </label>
                <input
                  type="tel"
                  required
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Source de financement
                </label>
                <select
                  value={sourceFinancement}
                  onChange={(e) => setSourceFinancement(e.target.value)}
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                >
                  <option value="LLF">LLF</option>
                  <option value="LLF_FADEC">LLF et FADEC Santé communautaire</option>
                  <option value="SRHR">SRHR</option>
                  <option value="AUTRE">Autre (préciser)</option>
                </select>
              </div>

              {sourceFinancement === "AUTRE" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Préciser la source de financement
                  </label>
                  <input
                    type="text"
                    required
                    value={sourceFinancementAutre}
                    onChange={(e) => setSourceFinancementAutre(e.target.value)}
                    placeholder="ex: Financement Spécifique ONG"
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre de Relais Communautaires (RC) sous votre responsabilité
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={nombreRc}
                  onChange={(e) => setNombreRc(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005c30]"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-[#005c30] hover:bg-[#004724] shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Enregistrement..." : "Enregistrer les modifications"}</span>
              </button>
            </form>
          )}
        </section>

        {/* 3. PÔLES D'ACTIVITÉS ET SOINS COMMUNAUTAIRES (LIAISONS INTELLIGENTES) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Pôles Métiers & Soins Communautaires
            </h2>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Accès directs
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Prise en charge des cas iCCM */}
            <Link
              href="/espace-ascq/consultations"
              className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all group flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#005c30] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-xs sm:text-sm pt-1">
                  Prise en charge iCCM
                </h3>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Consultation, premier geste posé, protocoles & traitement
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#005c30] group-hover:translate-x-0.5 transition-all mt-1" />
            </Link>

            {/* Maternité & 1000 Jours */}
            <Link
              href="/espace-ascq/maternite-enfance"
              className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm hover:border-pink-300 hover:shadow-md transition-all group flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="w-9 h-9 rounded-2xl bg-pink-50 text-pink-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Baby className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-xs sm:text-sm pt-1">
                  Maternité & 1000 Jours
                </h3>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Femmes enceintes, CPN, Enov'Mum, enfants 0-59 mois & vaccins
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-pink-600 group-hover:translate-x-0.5 transition-all mt-1" />
            </Link>

            {/* Références CS & GUPS */}
            <Link
              href="/espace-ascq/references"
              className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm hover:border-amber-400 hover:shadow-md transition-all group flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-xs sm:text-sm pt-1">
                  Références CS & GUPS
                </h3>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Évacuation médicale, cas sociaux, approche One Health
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all mt-1" />
            </Link>

            {/* Suivi PNSC Hebdo */}
            <Link
              href="/espace-ascq/rapport-hebdo-pnsc"
              className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all group flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-xs sm:text-sm pt-1">
                  Suivi PNSC Hebdo
                </h3>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Transmission du rapport hebdomadaire et consolidation SNIS
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all mt-1" />
            </Link>

            {/* Mes Relais Communautaires */}
            <Link
              href="/espace-ascq/relais"
              className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm hover:border-teal-400 hover:shadow-md transition-all group flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-xs sm:text-sm pt-1">
                  Mes Relais (RC)
                </h3>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Validation des inscriptions, affectation village, réinitialisation PIN
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-all mt-1" />
            </Link>

            {/* Planning & Activités */}
            <Link
              href="/espace-ascq/planning"
              className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm hover:border-blue-400 hover:shadow-md transition-all group flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-xs sm:text-sm pt-1">
                  Planning & Activités
                </h3>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Planification mensuelle terrain, suivi groupé des RC
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all mt-1" />
            </Link>
          </div>
        </div>

        {/* 4. Cartes d'accès secondaire : Requêtes & Permutation */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* Suivi des Requêtes */}
          <Link
            href="/espace-ascq/requetes"
            className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm hover:border-emerald-300 transition-all space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <MessageSquareText className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                {espaceData?.nombre_requetes_en_cours ?? 0} en cours
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs">Mes Requêtes</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Suivre mes demandes et réponses de l'administration
              </p>
            </div>
          </Link>

          {/* Permutation */}
          <Link
            href="/espace-ascq/permutations"
            className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm hover:border-emerald-300 transition-all space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                {espaceData?.permutation_active ? "Demande active" : "Bourse ouverte"}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs">Permutation</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Consulter les offres et changer d'affectation
              </p>
            </div>
          </Link>

        </div>

      </main>
    </div>
  );
}
