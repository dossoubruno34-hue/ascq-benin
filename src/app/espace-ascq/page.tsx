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
  ExternalLink
} from "lucide-react";

export default function MonEspacePage() {
  const router = useRouter();
  const [espaceData, setEspaceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Édition des champs autorisés (Téléphone, Source de financement, Nombre de RC)
  const [isEditing, setIsEditing] = useState(false);
  const [telephone, setTelephone] = useState("");
  const [sourceFinancement, setSourceFinancement] = useState("");
  const [sourceFinancementAutre, setSourceFinancementAutre] = useState("");
  const [nombreRc, setNombreRc] = useState(0);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; error: boolean } | null>(null);

  const loadEspaceData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("obtenir_mon_espace");
      if (error) {
        router.push("/connexion");
        return;
      }

      setEspaceData(data);
      setTelephone(data.telephone || "");
      setSourceFinancement(data.source_financement || "LLF");
      setSourceFinancementAutre(data.source_financement_autre || "");
      setNombreRc(data.nombre_rc_declare || 0);

    } catch (err) {
      console.error("Erreur chargement mon espace:", err);
      router.push("/connexion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEspaceData();
  }, []);

  const handleSaveModifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);

    try {
      const { data, error } = await supabase.rpc("mettre_a_jour_mon_espace", {
        p_telephone: telephone.trim(),
        p_source_financement: sourceFinancement,
        p_source_financement_autre: sourceFinancement === "AUTRE" ? sourceFinancementAutre.trim() : "",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="text-center space-y-2 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#005c30]" />
          <p className="text-xs font-semibold">Chargement de votre situation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-20">
      <AscqNav userProfile={espaceData} />

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        
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

          <button
            onClick={loadEspaceData}
            className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-[#005c30] shadow-sm transition-all"
            title="Rafraîchir"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Message de succès ou d'erreur */}
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
              <span className="font-extrabold text-slate-900 uppercase">{espaceData.departement_nom}</span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Zone Sanitaire</span>
              <span className="font-extrabold text-slate-900 uppercase">{espaceData.zone_sanitaire_nom}</span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Commune</span>
              <span className="font-extrabold text-slate-900 uppercase">{espaceData.commune_nom}</span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Arrondissement</span>
              <span className="font-extrabold text-slate-900 uppercase">
                {espaceData.arrondissement_nom}
                {espaceData.cumul_deux_arrondissements && espaceData.second_arrondissement_nom && (
                  <span className="text-emerald-700 block text-[11px] font-semibold">
                    + {espaceData.second_arrondissement_nom} (Cumul)
                  </span>
                )}
              </span>
            </div>

            <div className="col-span-2 p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Structure de santé de référence</span>
              <span className="font-extrabold text-slate-900 uppercase">{espaceData.structure_sante_nom}</span>
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
                <span className="font-bold text-slate-900">{espaceData.telephone}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <Wallet className="w-4 h-4 text-slate-400" />
                  <span>Source de financement</span>
                </div>
                <span className="font-bold text-slate-900">
                  {espaceData.source_financement}
                  {espaceData.source_financement_autre ? ` (${espaceData.source_financement_autre})` : ""}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Relais communautaires en charge</span>
                </div>
                <span className="font-bold text-slate-900">
                  {espaceData.nombre_rc_declare} déclarés ({espaceData.nombre_rc_enroles} enrôlés)
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
                  <option value="LLF et FADEC Santé communautaire">LLF et FADEC Santé communautaire</option>
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

        {/* 3. Cartes d'accès rapide : Requêtes & Permutation */}
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
                {espaceData.nombre_requetes_en_cours} en cours
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
                {espaceData.permutation_active ? "Demande active" : "Bourse ouverte"}
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
