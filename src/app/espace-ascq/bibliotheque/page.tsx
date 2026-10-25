"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AscqNav from "@/components/AscqNav";
import { 
  BookOpen, 
  Search, 
  ExternalLink, 
  FileText, 
  Download, 
  RefreshCw, 
  FolderOpen,
  Building,
  CheckCircle2
} from "lucide-react";

export default function BibliothequePage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TOUS");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: profils } = await supabase.rpc("obtenir_mon_profil");
      if (!profils || profils.length === 0) {
        router.push("/connexion");
        return;
      }
      setUserProfile(profils[0]);

      // Charger les documents de la bibliothèque
      const { data: docs, error: docError } = await supabase
        .from("bibliotheque_documents")
        .select("*")
        .eq("est_actif", true)
        .order("ordre_affichage", { ascending: true });

      if (docError) throw docError;
      setDocuments(docs || []);

    } catch (err) {
      console.error("Erreur chargement bibliothèque:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = [
    { id: "TOUS", label: "Tous les documents" },
    { id: "GUIDE_CLINIQUE", label: "Guides cliniques (PCIME-C)" },
    { id: "SURVEILLANCE", label: "Surveillance épidémiologique" },
    { id: "OUTIL_GESTION", label: "Outils de gestion & Rapports" },
    { id: "REGLEMENTATION", label: "Textes réglementaires" },
    { id: "FORMATION", label: "Modules de formation" },
  ];

  const filteredDocs = documents.filter((doc) => {
    const matchCategory = selectedCategory === "TOUS" || doc.categorie === selectedCategory;
    const q = searchTerm.toLowerCase();
    const matchSearch = doc.titre.toLowerCase().includes(q) || (doc.description && doc.description.toLowerCase().includes(q));
    return matchCategory && matchSearch;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "GUIDE_CLINIQUE":
        return <span className="bg-emerald-50 text-[#005c30] border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">Guide clinique</span>;
      case "SURVEILLANCE":
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">Surveillance</span>;
      case "OUTIL_GESTION":
        return <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">Outil de gestion</span>;
      case "REGLEMENTATION":
        return <span className="bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-md">Réglementation</span>;
      case "FORMATION":
        return <span className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-md">Formation</span>;
      default:
        return <span className="bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md">Document</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-20">
      <AscqNav userProfile={userProfile} />

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Bibliothèque Officielle
            </h1>
            <p className="text-xs text-slate-500">
              Directives, manuels et documents déposés par le Ministère de la Santé
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-[#005c30] shadow-sm transition-all"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un guide, décret, outil..."
            className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#005c30] shadow-sm text-slate-800"
          />
        </div>

        {/* Catégories de documents (filtres horizontaux défilables) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
                selectedCategory === c.id
                  ? "bg-[#005c30] text-white border-[#005c30] shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Liste des documents */}
        {loading ? (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-500 border border-slate-200/80 shadow-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30] mb-2" />
            <p className="text-xs font-semibold">Chargement des documents...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm">
                Aucun document trouvé
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Modifiez vos filtres ou effectuez une autre recherche.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3 hover:border-emerald-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div>{getCategoryBadge(doc.categorie)}</div>
                    <h3 className="font-black text-slate-900 text-sm leading-snug">
                      {doc.titre}
                    </h3>
                  </div>

                  <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase shrink-0">
                    {doc.format_fichier || "PDF"}
                  </span>
                </div>

                {doc.description && (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    {doc.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {doc.auteur || "Ministère de la Santé"}
                  </span>

                  {/* Bouton cliquable direct vers Google Drive */}
                  <a
                    href={doc.lien_drive}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#005c30] text-white font-bold text-xs shadow-sm hover:bg-[#004724] active:scale-95 transition-all"
                  >
                    <span>Consulter sur Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
