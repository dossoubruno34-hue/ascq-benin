"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AscqNav from "@/components/AscqNav";
import {
  Stethoscope,
  HeartPulse,
  Activity,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  Calendar,
  MapPin,
  User,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Eye,
  X,
  Pill,
  Send
} from "lucide-react";
import { exporterRegistreConsultationsExcel } from "@/lib/excelExport";
import { getOfflineList, getCachedUserSession, getCachedMonEspace } from "@/lib/offline-sync";

export default function RegistreConsultationsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [filtreDecision, setFiltreDecision] = useState<string>("TOUT");
  const [recherche, setRecherche] = useState("");
  const [selectedConsultation, setSelectedConsultation] = useState<any | null>(null);

  const chargerConsultations = async () => {
    setLoading(true);
    try {
      let user: any = null;
      let profil: any = null;

      if (navigator.onLine) {
        try {
          const { data } = await supabase.auth.getUser();
          user = data?.user;
        } catch {}
      }

      if (!user) {
        const cachedSession = getCachedUserSession();
        user = cachedSession.user;
        profil = cachedSession.profile;
      }

      if (!user && !profil) {
        const monEspace = getCachedMonEspace();
        if (monEspace) profil = monEspace;
      }

      if (user && !profil) {
        const { data } = await supabase.from("utilisateurs").select("*").eq("id", user.id).maybeSingle();
        profil = data;
      }

      setCurrentUser(profil);

      let listData: any[] = [];

      // 1. Lire sur Supabase si connecté
      if (navigator.onLine && (user?.id || profil?.id)) {
        const uid = user?.id || profil?.id;
        try {
          let query = supabase
            .from("consultations_communautaires")
            .select("*")
            .order("date_consultation", { ascending: false });

          if (profil?.role_technique !== "SUPER_ADMIN" && profil?.role_technique !== "ADMINISTRATEUR") {
            query = query.eq("ascq_id", uid);
          }

          const { data, error } = await query;
          if (!error && data) {
            listData = data;
          }
        } catch (e) {
          console.warn("Échec requête consultations serveur:", e);
        }
      }

      // 2. Fusionner avec la file d'attente hors-ligne locale
      const offlineQueue = getOfflineList<any>("CONSULTATION");
      if (offlineQueue.length > 0) {
        const offlineItems = offlineQueue.map((item) => ({
          ...item.data,
          id: item.id,
          isOffline: true,
        }));
        // Dédupliquer et concaténer
        const ids = new Set(listData.map((x) => x.id));
        offlineItems.forEach((off) => {
          if (!ids.has(off.id)) {
            listData.unshift(off);
          }
        });
      }

      setConsultations(listData);

    } catch (err) {
      console.warn("Erreur chargement registre consultations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerConsultations();
  }, []);

  // Filtrage
  const consultationsFiltrees = consultations.filter((c) => {
    if (filtreDecision !== "TOUT" && c.decision !== filtreDecision) {
      return false;
    }
    if (!recherche.trim()) return true;
    const q = recherche.toLowerCase();
    return (
      c.nom_patient?.toLowerCase().includes(q) ||
      c.prenoms_patient?.toLowerCase().includes(q) ||
      c.village?.toLowerCase().includes(q) ||
      c.diagnostic_possible?.toLowerCase().includes(q) ||
      c.signe_principal?.toLowerCase().includes(q)
    );
  });

  // Statistiques calculées en temps réel
  const totalConsultations = consultations.length;
  const totalPec = consultations.filter((c) => c.decision === "PRISE_EN_CHARGE_COMMUNAUTAIRE").length;
  const totalReferes = consultations.filter((c) => c.decision === "REFERER_CS").length;
  const totalTdrPositifs = consultations.filter((c) => c.tdr_paludisme === "POSITIF").length;
  const totalMoins5Ans = consultations.filter((c) => (c.age_unite === "ANS" && c.age_valeur < 5) || c.age_unite !== "ANS").length;

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-28">
      <AscqNav userProfile={currentUser} />

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-4">
        
        {/* EN-TÊTE DU REGISTRE */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-emerald-100 text-[#005c30]">
                  Soins & iCCM
                </span>
                <span className="text-xs text-slate-400 font-bold">Bénin</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 mt-1">
                Registre des Consultations & Prises en Charge
              </h1>
              <p className="text-xs text-slate-500">
                Suivi clinique en communauté : paludisme (TDR), diarrhée, pneumonie, malnutrition et références.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/espace-ascq/consultations/nouvelle"
                className="px-4 py-2.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nouvelle Prise en Charge</span>
              </Link>
            </div>
          </div>

          {/* TABLEAU DE BORD STATISTIQUE */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 text-[10px] font-extrabold uppercase block">Total Consultés</span>
              <strong className="text-lg font-black text-slate-900">{totalConsultations}</strong>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span className="text-emerald-700 text-[10px] font-extrabold uppercase block">Pris en charge</span>
              <strong className="text-lg font-black text-[#005c30]">{totalPec}</strong>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
              <span className="text-amber-800 text-[10px] font-extrabold uppercase block">Référés au CS</span>
              <strong className="text-lg font-black text-amber-700">{totalReferes}</strong>
            </div>

            <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
              <span className="text-red-700 text-[10px] font-extrabold uppercase block">TDR Palu (+)</span>
              <strong className="text-lg font-black text-red-700">{totalTdrPositifs}</strong>
            </div>

            <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 col-span-2 sm:col-span-1">
              <span className="text-blue-700 text-[10px] font-extrabold uppercase block">Moins de 5 ans</span>
              <strong className="text-lg font-black text-blue-900">{totalMoins5Ans}</strong>
            </div>
          </div>

          {/* BARRE D'ACTIONS : RECHERCHE, FILTRES, EXPORT */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher patient, village, diagnostic..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#005c30]"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                value={filtreDecision}
                onChange={(e) => setFiltreDecision(e.target.value)}
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white font-bold"
              >
                <option value="TOUT">Toutes décisions</option>
                <option value="PRISE_EN_CHARGE_COMMUNAUTAIRE">Prise en charge locale</option>
                <option value="REFERER_CS">Référés CS</option>
              </select>

              <button
                type="button"
                onClick={() => exporterRegistreConsultationsExcel(
                  consultationsFiltrees,
                  currentUser ? `${currentUser.prenoms} ${currentUser.nom}` : "ASCQ Bénin"
                )}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1"
                title="Exporter au format Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Excel</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1"
                title="Imprimer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>

              <button
                type="button"
                onClick={chargerConsultations}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                title="Rafraîchir"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* LISTE DES CONSULTATIONS */}
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-3xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30] mb-2" />
            <span>Chargement du registre...</span>
          </div>
        ) : consultationsFiltrees.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <Stethoscope className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-sm text-slate-700">Aucune consultation trouvée</h3>
            <p className="text-xs text-slate-400">
              Enregistrez vos premières prises en charge pour alimenter automatiquement vos rapports.
            </p>
            <Link
              href="/espace-ascq/consultations/nouvelle"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005c30] text-white font-bold text-xs shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Enregistrer une consultation</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {consultationsFiltrees.map((c) => {
              const isPec = c.decision === "PRISE_EN_CHARGE_COMMUNAUTAIRE";

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs ${
                        isPec ? "bg-emerald-100 text-[#005c30]" : "bg-amber-100 text-amber-800"
                      }`}>
                        {isPec ? <Pill className="w-4 h-4" /> : <HeartPulse className="w-4 h-4" />}
                      </span>
                      <div>
                        <strong className="text-sm font-extrabold text-slate-900 block">
                          {c.nom_patient} {c.prenoms_patient}
                        </strong>
                        <span className="text-[11px] text-slate-500">
                          {c.age_valeur} {c.age_unite?.toLowerCase()} • Sexe : {c.sexe} • Village : {c.village}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        isPec ? "bg-emerald-50 text-[#005c30] border border-emerald-200" : "bg-amber-50 text-amber-900 border border-amber-200"
                      }`}>
                        {isPec ? "✓ Prise en charge locale" : "⚠️ Référé au CS"}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedConsultation(c)}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Détails</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Signe principal :</span>
                      <strong className="text-[#005c30] font-bold">{c.signe_principal}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">TDR Paludisme :</span>
                      <strong className={c.tdr_paludisme === "POSITIF" ? "text-red-700 font-extrabold" : "text-slate-800 font-bold"}>
                        {c.tdr_paludisme}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Diagnostic :</span>
                      <strong className="text-slate-900">{c.diagnostic_possible}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Date consultation :</span>
                      <span className="text-slate-600 font-bold">{c.date_consultation || "Aujourd'hui"}</span>
                    </div>
                  </div>

                  {/* Produits ou Geste posé */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] flex flex-wrap items-center justify-between gap-2">
                    <div>
                      {isPec ? (
                        <span>
                          <strong>Produits utilisés :</strong>{" "}
                          {Array.isArray(c.produits_utilises) && c.produits_utilises.length > 0
                            ? c.produits_utilises.map((p: any) => p.nom).join(", ")
                            : "Traitements essentiels"}
                        </span>
                      ) : (
                        <span>
                          <strong>1er geste :</strong> {c.premier_geste_pose} → <strong>Destination :</strong> {c.structure_cs_destination || "Centre de Santé"}
                        </span>
                      )}
                    </div>

                    {isPec && c.date_rendez_vous_suivi && (
                      <span className="text-[#005c30] font-bold">
                        📅 RDV Suivi : {c.date_rendez_vous_suivi}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODALE DE DÉTAIL D'UNE CONSULTATION */}
        {selectedConsultation && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 border border-slate-200 shadow-2xl">
              <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-[#005c30]" />
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Fiche Clinique de Consultation Communautaire
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedConsultation(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* DÉTAILS DU PATIENT */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Patient :</span>
                  <strong className="text-slate-900 text-sm">{selectedConsultation.nom_patient} {selectedConsultation.prenoms_patient}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Âge & Sexe :</span>
                  <strong>{selectedConsultation.age_valeur} {selectedConsultation.age_unite?.toLowerCase()} • Sexe {selectedConsultation.sexe}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Localisation :</span>
                  <strong>Village {selectedConsultation.village}</strong>
                </div>
                {selectedConsultation.nom_parent_tuteur && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Parent / Tuteur :</span>
                    <span>{selectedConsultation.nom_parent_tuteur} ({selectedConsultation.telephone_contact || "N/A"})</span>
                  </div>
                )}
              </div>

              {/* EXAMEN & TDR */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs space-y-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">Signe principal :</span>
                  <strong className="text-[#005c30] text-sm">{selectedConsultation.signe_principal}</strong>
                </div>

                {Array.isArray(selectedConsultation.signes_secondaires) && selectedConsultation.signes_secondaires.length > 0 && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">Signes associés / Signes de gravité :</span>
                    <ul className="list-disc pl-4 text-red-800 font-bold">
                      {selectedConsultation.signes_secondaires.map((s: string, idx: number) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-400">Résultat TDR Paludisme :</span>
                  <strong className={selectedConsultation.tdr_paludisme === "POSITIF" ? "text-red-700 font-black" : "text-slate-800"}>
                    {selectedConsultation.tdr_paludisme}
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Diagnostic retenu :</span>
                  <strong className="text-slate-900">{selectedConsultation.diagnostic_possible}</strong>
                </div>
              </div>

              {/* DÉCISION & PRODUITS */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 text-xs space-y-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-[#005c30] block">
                  {selectedConsultation.decision === "PRISE_EN_CHARGE_COMMUNAUTAIRE" ? "Prise en charge locale" : "Référence au Centre de Santé"}
                </span>

                {selectedConsultation.decision === "PRISE_EN_CHARGE_COMMUNAUTAIRE" ? (
                  <>
                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold block">Intrants administrés :</span>
                      {Array.isArray(selectedConsultation.produits_utilises) && selectedConsultation.produits_utilises.length > 0 ? (
                        <ul className="list-disc pl-4 space-y-1 text-slate-800">
                          {selectedConsultation.produits_utilises.map((p: any, i: number) => (
                            <li key={i}>
                              <strong>{p.nom}</strong> — Posologie : {p.posologie}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="italic text-slate-400">Aucun médicament spécifique renseigné</span>
                      )}
                    </div>

                    {selectedConsultation.theme_sensibilisation && (
                      <div className="pt-2 border-t border-emerald-100 text-[11px] text-slate-700">
                        <strong>Sensibilisation dispensée :</strong> {selectedConsultation.theme_sensibilisation}
                      </div>
                    )}

                    {selectedConsultation.date_rendez_vous_suivi && (
                      <div className="text-[11px] text-[#005c30] font-black">
                        📅 Rendez-vous de suivi : {selectedConsultation.date_rendez_vous_suivi}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold block">1er Geste posé avant transfert :</span>
                      <strong className="text-amber-900">{selectedConsultation.premier_geste_pose}</strong>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold block">Centre de Santé destinataire :</span>
                      <strong>{selectedConsultation.structure_cs_destination || "Centre de Santé d'Arrondissement"}</strong>
                    </div>

                    <div className="pt-2">
                      <Link
                        href="/espace-ascq/references"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#005c30] text-white font-bold text-xs shadow-sm hover:bg-[#004724]"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>🖨️ Ouvrir le Bulletin de Référence Officiel</span>
                      </Link>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedConsultation(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
