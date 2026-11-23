"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AscqNav from "@/components/AscqNav";
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Clock,
  Activity,
  Calendar,
  ShieldCheck,
  Sparkles,
  WifiOff,
  X,
} from "lucide-react";
import {
  getCachedMonEspace,
  saveCachedMonEspace,
  saveCachedUserSession,
  getCachedUserSession,
  STORAGE_KEYS,
} from "@/lib/offline-sync";
import { estCadreNonAscq } from "@/lib/cadre-roles";
import {
  obtenirModulesPrincipauxAutorises,
  obtenirSousModulesAutorises,
  obtenirElementsRecents,
  enregistrerElementRecent,
  MODULES_PRINCIPAUX,
  ModuleId,
  ElementRecent,
} from "@/lib/navigation-registry";

function calculerJoursAvantRapportDu3(): { texte: string; urgent: boolean } {
  const now = new Date();
  const jour = now.getDate();
  if (jour <= 3) {
    const rest = 3 - jour;
    return {
      texte: rest === 0 ? "Aujourd'hui (3 du mois)" : `Dans ${rest} jour(s) (le 3)`,
      urgent: true,
    };
  }
  const nextMonth3 = new Date(now.getFullYear(), now.getMonth() + 1, 3);
  const diffDays = Math.ceil((nextMonth3.getTime() - now.getTime()) / (1000 * 3600 * 24));
  return {
    texte: `Le 3 du mois prochain (J-${diffDays})`,
    urgent: diffDays <= 5,
  };
}

function MonEspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedModuleParam = (searchParams.get("module") as ModuleId | null) || null;

  const [espaceData, setEspaceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Compteurs temps réel pour le bandeau "À faire" (3 lignes) et les pastilles des 6 modules
  const [compteurs, setCompteurs] = useState({
    alertesAConfirmer: 0,
    validationsEnAttente: 0,
    menagesAReassigner: 0,
    perdusDeVue: 0,
    activitesSemaine: 0,
    consultationsSemaine: 0,
  });

  const [recents, setRecents] = useState<ElementRecent[]>([]);
  const [relances48h, setRelances48h] = useState<{ total: number; alertes: number; deces: number; relais: number }>({
    total: 0,
    alertes: 0,
    deces: 0,
    relais: 0,
  });
  const [listeDecesEnAttente, setListeDecesEnAttente] = useState<any[]>([]);
  const [showModalDeces, setShowModalDeces] = useState(false);
  const [acquittementEnCours, setAcquittementEnCours] = useState(false);

  const loadEspaceData = async () => {
    setLoading(true);
    setLoadError("");

    const session = getCachedUserSession();
    if (session?.profile && estCadreNonAscq(session.profile)) {
      window.location.replace("/perimetre");
      return;
    }

    const cached = getCachedMonEspace();
    if (cached) {
      if (estCadreNonAscq(cached)) {
        window.location.replace("/perimetre");
        return;
      }
      setEspaceData(cached);
      setLoading(false);
    }

    setRecents(obtenirElementsRecents());

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOfflineMode(true);
      setLoading(false);
      return;
    }

    try {
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
          .select(
            "id, nom, prenoms, telephone, poste, role_technique, role_nomination, poste_autre, structure_sante_id, statut_compte, departement_id, commune_id, arrondissement_id, zone_sanitaire_id, photo_url"
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("ascq_profils").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("relais_communautaires").select("*", { count: "exact", head: true }).eq("ascq_id", user.id),
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

      let depNom = "Non défini";
      let comNom = prof.commune_id ? "Commune" : "Tout le département";
      let arrNom = prof.arrondissement_id ? "Arrondissement" : "Tous les arrondissements";
      let zsNom = "Zone Sanitaire";

      const [dRes, cRes, aRes, zRes] = await Promise.all([
        prof.departement_id
          ? supabase.from("departements").select("nom").eq("id", prof.departement_id).maybeSingle()
          : Promise.resolve({ data: null }),
        prof.commune_id
          ? supabase.from("communes").select("nom").eq("id", prof.commune_id).maybeSingle()
          : Promise.resolve({ data: null }),
        prof.arrondissement_id
          ? supabase.from("arrondissements").select("nom").eq("id", prof.arrondissement_id).maybeSingle()
          : Promise.resolve({ data: null }),
        prof.zone_sanitaire_id
          ? supabase.from("zones_sanitaires").select("nom").eq("id", prof.zone_sanitaire_id).maybeSingle()
          : Promise.resolve({ data: null }),
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
        structure_sante_nom: prof.structure_sante_id
          ? "Structure Sanitaire"
          : "Direction Départementale de la Santé / Supervision",
        source_financement: ascqP.source_financement || "LLF",
        source_financement_autre: ascqP.source_financement_autre || "",
        nombre_rc_declare: ascqP.nombre_rc || 5,
        nombre_rc_enroles: rcCountRes.count || 0,
        nombre_requetes_en_cours: reqCountRes.count || 0,
        permutation_active: null,
      };

      setEspaceData(directData);
      saveCachedMonEspace(directData);
      saveCachedUserSession(user, prof);
      setIsOfflineMode(false);

      // Charger les compteurs de pastilles et du bandeau "À faire"
      try {
        const ilYADeuxJours = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
        const ilYASeptJours = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

        const [
          alertesAttenteRes,
          rcAttenteRes,
          planningsRcAttenteRes,
          activitesSemRes,
          consultSemRes,
          alRetard,
          rcRetard,
        ] = await Promise.all([
          supabase
            .from("alertes_communautaires")
            .select("id", { count: "exact", head: true })
            .eq("ascq_superviseur_id", prof.id)
            .in("statut", ["NOTIFIE", "EN_ATTENTE"]),
          supabase
            .from("relais_communautaires")
            .select("id", { count: "exact", head: true })
            .eq("ascq_id", prof.id)
            .eq("statut", "EN_ATTENTE"),
          supabase
            .from("plannings_hebdo_relais")
            .select("id", { count: "exact", head: true })
            .eq("ascq_superviseur_id", prof.id)
            .eq("statut", "SOUMIS_ASCQ"),
          supabase
            .from("activites_terrain_ascq")
            .select("id", { count: "exact", head: true })
            .eq("ascq_id", prof.id)
            .gte("created_at", ilYASeptJours),
          supabase
            .from("consultations_communautaires")
            .select("id", { count: "exact", head: true })
            .eq("ascq_id", prof.id)
            .gte("created_at", ilYASeptJours),
          supabase
            .from("alertes_communautaires")
            .select("id", { count: "exact", head: true })
            .eq("ascq_superviseur_id", prof.id)
            .in("statut", ["NOTIFIE", "EN_ATTENTE"])
            .lt("created_at", ilYADeuxJours),
          supabase
            .from("relais_communautaires")
            .select("id", { count: "exact", head: true })
            .eq("ascq_id", prof.id)
            .eq("statut", "EN_ATTENTE")
            .lt("created_at", ilYADeuxJours),
        ]);

        const nbAlertesAConf = alertesAttenteRes.count || 0;
        const nbValidations = (rcAttenteRes.count || 0) + (planningsRcAttenteRes.count || 0);

        setCompteurs({
          alertesAConfirmer: nbAlertesAConf,
          validationsEnAttente: nbValidations,
          menagesAReassigner: 0,
          perdusDeVue: 0,
          activitesSemaine: activitesSemRes.count || 0,
          consultationsSemaine: consultSemRes.count || 0,
        });

        const localAcquittes = new Set<string>();
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("ascq_deces_acquittes");
            if (raw) (JSON.parse(raw) || []).forEach((id: string) => localAcquittes.add(id));
          } catch {}
        }

        let decesList: any[] = [];
        try {
          const { data: rawDeces } = await supabase
            .from("deces_communautaires")
            .select(`
              id, numero_deces, date_deces, type_deces_nom, lieu_deces_nom, created_at, statut,
              deces_identite_privee (nom_defunt, prenoms_defunt)
            `)
            .eq("ascq_superviseur_id", prof.id)
            .in("statut", ["NOTIFIE", "EN_ATTENTE"])
            .lt("created_at", ilYADeuxJours);

          decesList = (rawDeces || []).filter((d: any) => !localAcquittes.has(d.id));
        } catch {
          decesList = [];
        }

        const nbAl = alRetard.count || 0;
        const nbDec = decesList.length;
        const nbRc = rcRetard.count || 0;
        setRelances48h({ total: nbAl + nbDec + nbRc, alertes: nbAl, deces: nbDec, relais: nbRc });
        setListeDecesEnAttente(decesList);
      } catch {
        // Ignore erreurs compteurs
      }
    } catch {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setIsOfflineMode(true);
      }
      if (!cached) {
        setLoadError("Impossible de joindre le serveur.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const handleAcquitterTousDeces = async () => {
    if (!espaceData?.id) return;
    setAcquittementEnCours(true);
    try {
      const idsToAcquit = listeDecesEnAttente.map((d) => d.id).filter(Boolean);
      try {
        if (idsToAcquit.length > 0) {
          await supabase
            .from("deces_communautaires")
            .update({ statut: "VALIDE", ascq_superviseur_id: espaceData.id, updated_at: new Date().toISOString() })
            .in("id", idsToAcquit);
        }
      } catch {}

      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("ascq_deces_acquittes");
          const arr: string[] = raw ? JSON.parse(raw) : [];
          idsToAcquit.forEach((id) => {
            if (!arr.includes(id)) arr.push(id);
          });
          localStorage.setItem("ascq_deces_acquittes", JSON.stringify(arr));
        } catch {}
      }

      const nbAncien = relances48h.deces;
      setRelances48h((prev) => ({
        ...prev,
        deces: 0,
        total: Math.max(0, prev.total - nbAncien),
      }));
      setListeDecesEnAttente([]);
      setShowModalDeces(false);
    } finally {
      setAcquittementEnCours(false);
    }
  };

  if (loading && !espaceData) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="text-center space-y-2.5 text-slate-500 max-w-sm mx-auto">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#008751]" />
          <p className="text-xs font-bold">Chargement de SantéCom Bénin...</p>
          {loadError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs">
              <p>{loadError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const modulesAutorises = obtenirModulesPrincipauxAutorises(espaceData);
  const echeanceRapport = calculerJoursAvantRapportDu3();

  // Pastilles de comptage générées par le code pour chaque module principal
  const obtenirBadgeModule = (modId: string): number => {
    if (modId === "surveillance") return compteurs.alertesAConfirmer + relances48h.deces;
    if (modId === "terrain") return compteurs.validationsEnAttente + compteurs.menagesAReassigner;
    if (modId === "soins") return compteurs.perdusDeVue;
    if (modId === "rapports") return echeanceRapport.urgent ? 1 : 0;
    return 0;
  };

  // Pastille par sous-module
  const obtenirBadgeSousModule = (subId: string): number => {
    if (subId === "surveillance_a_confirmer" || subId === "surveillance_fiches") return compteurs.alertesAConfirmer;
    if (subId === "terrain_validations" || subId === "terrain_relais") return compteurs.validationsEnAttente;
    if (subId === "terrain_menages_reassigner") return compteurs.menagesAReassigner;
    if (subId === "soins_perdus_de_vue") return compteurs.perdusDeVue;
    return 0;
  };

  const moduleActif = selectedModuleParam
    ? MODULES_PRINCIPAUX.find((m) => m.id === selectedModuleParam) || null
    : null;

  const sousModulesActifs = moduleActif
    ? obtenirSousModulesAutorises(moduleActif.id, espaceData)
    : [];

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-900 antialiased overflow-x-hidden">
      {/* En-tête compact fixe de 56 dp */}
      <AscqNav userProfile={espaceData} />

      {/* Contenu principal commençant à moins de 120 dp du haut (en-tête 56 dp + 8 dp padding = 64 dp) */}
      <main className="max-w-2xl mx-auto px-3 pt-2 pb-16 space-y-2.5">
        {isOfflineMode && (
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-950 flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="font-bold truncate">Hors ligne : vos saisies sont gardées sur l&apos;appareil.</span>
          </div>
        )}

        {/* VUE 1 : ACCUEIL SANS DÉFILEMENT (Grille 2x3 des 6 modules + Bandeau "À faire" 3 lignes) */}
        {!moduleActif ? (
          <>
            {/* Bandeau "À faire" de 3 lignes maximum */}
            <section
              aria-label="À faire"
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-3 py-2 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#003573]">
                  À faire aujourd&apos;hui
                </span>
                {relances48h.deces > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowModalDeces(true)}
                    className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200"
                  >
                    {relances48h.deces} décès &gt; 48h à viser
                  </button>
                )}
              </div>

              {/* Ligne 1 : Alertes à confirmer */}
              <Link
                href="/fiches?tab=a_confirmer"
                className="flex items-center justify-between py-0.5 text-xs hover:bg-slate-50 rounded-lg px-1 transition-colors"
              >
                <span className="font-bold text-slate-700 truncate flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E8112D] shrink-0" />
                  <span>Alertes à confirmer</span>
                </span>
                <span
                  className={`font-black text-[11px] px-2 py-0.2 rounded-full shrink-0 ${
                    compteurs.alertesAConfirmer > 0
                      ? "bg-rose-100 text-rose-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {compteurs.alertesAConfirmer}
                </span>
              </Link>

              {/* Ligne 2 : Validations en attente */}
              <Link
                href="/espace-ascq/relais?tab=validations"
                className="flex items-center justify-between py-0.5 text-xs hover:bg-slate-50 rounded-lg px-1 transition-colors"
              >
                <span className="font-bold text-slate-700 truncate flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FCD116] shrink-0" />
                  <span>Validations en attente (RC &amp; plannings)</span>
                </span>
                <span
                  className={`font-black text-[11px] px-2 py-0.2 rounded-full shrink-0 ${
                    compteurs.validationsEnAttente > 0
                      ? "bg-amber-100 text-amber-900"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {compteurs.validationsEnAttente}
                </span>
              </Link>

              {/* Ligne 3 : Échéance du rapport du 3 */}
              <Link
                href="/espace-ascq/rapport-mensuel"
                className="flex items-center justify-between py-0.5 text-xs hover:bg-slate-50 rounded-lg px-1 transition-colors"
              >
                <span className="font-bold text-slate-700 truncate flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#008751] shrink-0" />
                  <span>Échéance du rapport du 3</span>
                </span>
                <span
                  className={`font-black text-[10px] px-2 py-0.2 rounded-full shrink-0 ${
                    echeanceRapport.urgent
                      ? "bg-emerald-100 text-[#008751]"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {echeanceRapport.texte}
                </span>
              </Link>
            </section>

            {/* Grille des 6 modules principaux (2 colonnes × 3 lignes) avec illustrations Wax originales */}
            <section aria-label="Modules principaux SantéCom Bénin">
              <div className="grid grid-cols-2 gap-2.5">
                {modulesAutorises.map((mod) => {
                  const badgeCount = obtenirBadgeModule(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => router.push(`/espace-ascq?module=${mod.id}`)}
                      className="group relative bg-white hover:bg-emerald-50/40 active:scale-[0.98] rounded-2xl p-2.5 border-2 border-slate-200/90 hover:border-[#008751] shadow-xs transition-all flex items-center gap-2.5 text-left min-h-[96px] cursor-pointer overflow-hidden"
                    >
                      {/* Illustration Wax originale (< 25 Ko) */}
                      {mod.waxIcon && (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 shadow-xs border border-amber-300/60 bg-[#003573]">
                          <picture>
                            <source
                              srcSet={`${mod.waxIcon.webp96} 1x, ${mod.waxIcon.webp192} 2x`}
                              type="image/webp"
                            />
                            <img
                              src={mod.waxIcon.png512}
                              alt={mod.waxIcon.alt}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </picture>
                        </div>
                      )}

                      {/* Libellé du module */}
                      <div className="min-w-0 flex-1">
                        <span className="font-black text-xs sm:text-sm text-slate-900 leading-snug block break-words">
                          {mod.libelle}
                        </span>
                        <span className="text-[10px] font-bold text-[#008751] inline-flex items-center gap-0.5 mt-0.5">
                          <span>Ouvrir</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>

                      {/* Pastille de comptage faite par le code */}
                      {badgeCount > 0 && (
                        <span
                          className="absolute top-1.5 right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-[#E8112D] text-white font-black text-[10px] flex items-center justify-center shadow"
                          title={`${badgeCount} élément(s) à traiter`}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Ligne "Récents (3)" sous la grille */}
            {recents.length > 0 && (
              <section
                aria-label="Récents"
                className="bg-white/90 rounded-2xl border border-slate-200/80 px-3 py-2 flex items-center gap-2 flex-wrap"
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>Récents :</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                  {recents.slice(0, 3).map((rec) => (
                    <Link
                      key={rec.id}
                      href={rec.route}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-[#008751] font-bold text-[11px] truncate max-w-[140px] transition-colors"
                    >
                      {rec.libelle}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          /* VUE 2 : PAGE D'UN MODULE (Sous-modules en grille 2 colonnes + "Vue d'ensemble" sans données personnelles) */
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Barre de titre du module avec flèche retour vers l'accueil */}
            <div className="flex items-center justify-between bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => router.push("/espace-ascq")}
                  className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-[#008751] flex items-center justify-center shrink-0 active:scale-95 transition-all"
                  title="Retour à la grille des 6 modules"
                  aria-label="Retour à l'accueil"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {moduleActif.waxIcon && (
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-amber-300 bg-[#003573]">
                    <picture>
                      <source srcSet={moduleActif.waxIcon.webp96} type="image/webp" />
                      <img
                        src={moduleActif.waxIcon.png512}
                        alt={moduleActif.waxIcon.alt}
                        className="w-full h-full object-cover"
                      />
                    </picture>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#008751]">
                    Module SantéCom Bénin
                  </p>
                  <h1 className="text-sm sm:text-base font-black text-slate-900 truncate">
                    {moduleActif.libelle}
                  </h1>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push("/espace-ascq")}
                className="px-2.5 py-1.5 rounded-xl text-xs font-black text-[#003573] hover:bg-slate-100 shrink-0"
              >
                Tous les modules
              </button>
            </div>

            {/* Écran d'accueil du module : "Vue d'ensemble" (ce qu'il y a à faire, activité semaine, échéances, 3 raccourcis — Zéro donnée personnelle) */}
            <section
              aria-label="Vue d'ensemble du module"
              className="bg-gradient-to-br from-[#003573] to-[#005c30] text-white rounded-2xl p-3.5 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FCD116] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Vue d&apos;ensemble — {moduleActif.libelle}</span>
                </span>
                <span className="text-[10px] font-bold bg-white/15 px-2 py-0.5 rounded-full">
                  {espaceData?.arrondissement_nom || espaceData?.commune_nom || "Territoire actif"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/10 rounded-xl p-2">
                  <span className="text-[10px] text-emerald-100 block">À traiter</span>
                  <span className="text-base font-black text-[#FCD116]">
                    {obtenirBadgeModule(moduleActif.id)}
                  </span>
                </div>
                <div className="bg-white/10 rounded-xl p-2">
                  <span className="text-[10px] text-emerald-100 block">Cette semaine</span>
                  <span className="text-base font-black text-white">
                    {moduleActif.id === "soins"
                      ? compteurs.consultationsSemaine
                      : compteurs.activitesSemaine}
                  </span>
                </div>
                <div className="bg-white/10 rounded-xl p-2">
                  <span className="text-[10px] text-emerald-100 block">Prochaine échéance</span>
                  <span className="text-[11px] font-black text-emerald-200 leading-tight block pt-0.5">
                    3 du mois
                  </span>
                </div>
              </div>

              {/* 3 raccourcis directs */}
              <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black text-white/80">Raccourcis :</span>
                {sousModulesActifs.slice(0, 3).map((racc) => (
                  <Link
                    key={racc.id}
                    href={racc.route}
                    onClick={() =>
                      enregistrerElementRecent({
                        id: racc.id,
                        libelle: racc.libelle,
                        route: racc.route,
                        parent: racc.parent,
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] transition-colors"
                  >
                    {racc.libelle}
                  </Link>
                ))}
              </div>
            </section>

            {/* Grille de tuiles de 2 colonnes des sous-modules du module (zéro défilement horizontal) */}
            <section aria-label={`Sous-modules de ${moduleActif.libelle}`}>
              <div className="grid grid-cols-2 gap-2.5">
                {sousModulesActifs
                  .filter((s) => s.id !== "soins_overview")
                  .map((sub) => {
                    const subBadge = obtenirBadgeSousModule(sub.id);
                    return (
                      <Link
                        key={sub.id}
                        href={sub.route}
                        onClick={() =>
                          enregistrerElementRecent({
                            id: sub.id,
                            libelle: sub.libelle,
                            route: sub.route,
                            parent: sub.parent,
                          })
                        }
                        className="group relative bg-white hover:bg-emerald-50/50 active:scale-[0.98] rounded-2xl p-3.5 border-2 border-slate-200/90 hover:border-[#008751] shadow-xs transition-all flex flex-col justify-between min-h-[88px]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-black text-xs sm:text-sm text-slate-900 leading-snug break-words">
                            {sub.libelle}
                          </span>
                          {subBadge > 0 && (
                            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#E8112D] text-white font-black text-[10px] flex items-center justify-center shrink-0">
                              {subBadge}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-slate-500">
                            {sub.disponibleHorsLigne ? "✓ Hors ligne" : "En ligne"}
                          </span>
                          <ChevronRight className="w-4 h-4 text-[#008751] group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Modale de visa rapide des décès en dépassement 48h */}
      {showModalDeces && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Déclarations de décès en attente de visa ({relances48h.deces})
                </h3>
                <p className="text-[11px] text-slate-500">Dépassement du délai de 48 heures</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModalDeces(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Link
                href="/fiches?tab=deces"
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
              >
                Ouvrir les fiches décès
              </Link>
              <button
                type="button"
                disabled={acquittementEnCours}
                onClick={handleAcquitterTousDeces}
                className="px-4 py-2 rounded-xl bg-[#008751] text-white text-xs font-black"
              >
                {acquittementEnCours ? "Validation..." : "✓ Tout viser et lever l'alerte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MonEspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
          <RefreshCw className="w-7 h-7 animate-spin text-[#008751]" />
        </div>
      }
    >
      <MonEspaceContent />
    </Suspense>
  );
}
