"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Activity, 
  Plus, 
  Trash2, 
  Check, 
  Send, 
  Camera, 
  Users, 
  MapPin, 
  Calendar, 
  FileCheck, 
  RefreshCw,
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import AscqNav from "@/components/AscqNav";

interface ActeurPresent {
  nom: string;
  prenoms: string;
  fonction: string;
}

interface ParticipantPresence {
  nom: string;
  prenoms: string;
  structure: string;
  telephone: string;
  emarge: boolean;
}

export default function ActivitesMeneesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activitesPassees, setActivitesPassees] = useState<any[]>([]);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Formulaire d'activité
  const todayStr = new Date().toISOString().split("T")[0];
  const [titreActivite, setTitreActivite] = useState("");
  const [categorie, setCategorie] = useState("SENSIBILISATION");
  const [dateActivite, setDateActivite] = useState(todayStr);
  const [periodeTexte, setPeriodeTexte] = useState("");
  const [lieu, setLieu] = useState("");

  // Superviseur (facultatif)
  const [superviseurNom, setSuperviseurNom] = useState("");
  const [superviseurFonction, setSuperviseurFonction] = useState("");

  // Acteurs présents
  const [acteursPresents, setActeursPresents] = useState<ActeurPresent[]>([
    { nom: "", prenoms: "", fonction: "Relais Communautaire" }
  ]);

  // Liste d'émargement / présence
  const [listePresence, setListePresence] = useState<ParticipantPresence[]>([
    { nom: "", prenoms: "", structure: "", telephone: "", emarge: true }
  ]);

  // Photo
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [commentaires, setCommentaires] = useState("");
  const [difficultes, setDifficultes] = useState("");

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/connexion"); return; }

      const { data: profil } = await supabase.from("utilisateurs").select("*").eq("id", user.id).single();
      setCurrentUser(profil);

      const { data: acts } = await supabase
        .from("activites_menees")
        .select("*")
        .order("date_activite", { ascending: false });

      setActivitesPassees(acts || []);

    } catch (err) {
      console.error("Erreur chargement activités:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  // Gestion des acteurs présents
  const ajouterActeur = () => {
    setActeursPresents([...acteursPresents, { nom: "", prenoms: "", fonction: "" }]);
  };

  const supprimerActeur = (idx: number) => {
    if (acteursPresents.length <= 1) return;
    setActeursPresents(acteursPresents.filter((_, i) => i !== idx));
  };

  const updateActeur = (idx: number, field: keyof ActeurPresent, val: string) => {
    const copy = [...acteursPresents];
    copy[idx][field] = val;
    setActeursPresents(copy);
  };

  // Gestion des participants / émargement
  const ajouterParticipant = () => {
    setListePresence([...listePresence, { nom: "", prenoms: "", structure: "", telephone: "", emarge: true }]);
  };

  const supprimerParticipant = (idx: number) => {
    if (listePresence.length <= 1) return;
    setListePresence(listePresence.filter((_, i) => i !== idx));
  };

  const updateParticipant = (idx: number, field: keyof ParticipantPresence, val: any) => {
    const copy = [...listePresence];
    (copy[idx] as any)[field] = val;
    setListePresence(copy);
  };

  // Gestion de la photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("La taille de l'image ne doit pas dépasser 2 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (!titreActivite.trim()) throw new Error("Le titre de l'activité est obligatoire.");
      if (!lieu.trim()) throw new Error("Le lieu de l'activité est obligatoire.");

      const acteursValides = acteursPresents.filter((a) => a.nom.trim() !== "");
      const presenceValide = listePresence.filter((p) => p.nom.trim() !== "");

      const { data, error } = await supabase.rpc("enregistrer_activite_menee", {
        p_titre_activite: titreActivite.trim(),
        p_categorie: categorie,
        p_date_activite: dateActivite,
        p_periode_texte: periodeTexte.trim() || null,
        p_lieu: lieu.trim(),
        p_superviseur_nom: superviseurNom.trim() || null,
        p_superviseur_fonction: superviseurFonction.trim() || null,
        p_acteurs_presents: acteursValides,
        p_liste_presence: presenceValide,
        p_photo_url: photoBase64,
        p_commentaires: commentaires.trim() || null,
        p_difficultes_rencontrees: difficultes.trim() || null,
      });

      if (error) throw error;

      setMessage({ text: "Compte-rendu d'activité enregistré avec succès !", error: false });

      // Réinitialiser le formulaire
      setTitreActivite("");
      setLieu("");
      setCommentaires("");
      setDifficultes("");
      setPhotoBase64(null);

      await chargerDonnees();

    } catch (err: any) {
      setMessage({ text: err.message || "Erreur lors de l'enregistrement de l'activité.", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
        <div className="text-center space-y-2 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#005c30]" />
          <p className="text-xs font-semibold">Chargement des activités...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 antialiased pb-28">
      <AscqNav userProfile={currentUser} />

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-4">
        
        {/* En-tête */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-emerald-100 text-[#005c30]">
              Compte-Rendu ASCQ
            </span>
            <span className="text-xs text-slate-400 font-bold">Phase 8</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Fiche d'Activité Menée
          </h1>
          <p className="text-xs text-slate-500">
            Enregistrez les activités réalisées sur le terrain avec présence des acteurs, liste d'émargement et photo justificative.
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            message.error ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}>
            {message.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Détails de l'activité */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3.5">
            <h2 className="font-extrabold text-sm text-slate-900">1. Nature & Lieu de l'activité</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Titre de l'activité *</label>
                <input
                  type="text"
                  placeholder="Ex: Causerie éducative sur la vaccination des enfants"
                  value={titreActivite}
                  onChange={(e) => setTitreActivite(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Catégorie</label>
                <select
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="SENSIBILISATION">Sensibilisation / Causerie</option>
                  <option value="VISITE_DOMICILE">Visite à domicile (VAD)</option>
                  <option value="SUPERVISION_RELAIS">Supervision des Relais</option>
                  <option value="REUNION_COMMUNAUTAIRE">Réunion communautaire</option>
                  <option value="CAMPAGNE_SANTE">Campagne de santé</option>
                  <option value="AUTRE">Autre activité</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Date *</label>
                <input
                  type="date"
                  value={dateActivite}
                  onChange={(e) => setDateActivite(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Période / Durée (facultatif)</label>
                <input
                  type="text"
                  placeholder="Ex: De 09h à 12h"
                  value={periodeTexte}
                  onChange={(e) => setPeriodeTexte(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Lieu précis *</label>
                <input
                  type="text"
                  placeholder="Ex: Village Gangban, Place du marché"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Superviseur & Acteurs présents */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3.5">
            <h2 className="font-extrabold text-sm text-slate-900">2. Superviseur & Autres acteurs présents</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/70 rounded-2xl border border-slate-200/70">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nom et prénoms du superviseur (facultatif)</label>
                <input
                  type="text"
                  placeholder="Ex: Dr KOSSOU (Médecin coordonnateur)"
                  value={superviseurNom}
                  onChange={(e) => setSuperviseurNom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Fonction du superviseur</label>
                <input
                  type="text"
                  placeholder="Ex: Médecin chef / Point focal"
                  value={superviseurFonction}
                  onChange={(e) => setSuperviseurFonction(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Autres acteurs présents</label>
                <button
                  type="button"
                  onClick={ajouterActeur}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#005c30] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un acteur</span>
                </button>
              </div>

              {acteursPresents.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nom"
                    value={a.nom}
                    onChange={(e) => updateActeur(i, "nom", e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Prénoms"
                    value={a.prenoms}
                    onChange={(e) => updateActeur(i, "prenoms", e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Fonction (ex: RC, Élu, Leader)"
                    value={a.fonction}
                    onChange={(e) => updateActeur(i, "fonction", e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => supprimerActeur(i)}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Liste de présence / Émargement */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-sm text-slate-900">3. Liste de présence & Émargement</h2>
                <p className="text-xs text-slate-500">Personnes présentes à l'activité</p>
              </div>
              <button
                type="button"
                onClick={ajouterParticipant}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#005c30] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un participant</span>
              </button>
            </div>

            <div className="space-y-2">
              {listePresence.map((p, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-slate-50/70 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    placeholder="Nom"
                    value={p.nom}
                    onChange={(e) => updateParticipant(i, "nom", e.target.value)}
                    className="w-full sm:flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Prénoms"
                    value={p.prenoms}
                    onChange={(e) => updateParticipant(i, "prenoms", e.target.value)}
                    className="w-full sm:flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Village / Structure"
                    value={p.structure}
                    onChange={(e) => updateParticipant(i, "structure", e.target.value)}
                    className="w-full sm:w-32 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Téléphone"
                    value={p.telephone}
                    onChange={(e) => updateParticipant(i, "telephone", e.target.value)}
                    className="w-full sm:w-28 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.emarge}
                      onChange={(e) => updateParticipant(i, "emarge", e.target.checked)}
                      className="rounded text-[#005c30] w-4 h-4"
                    />
                    <span>Présent(e)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => supprimerParticipant(i)}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Photo justificative & Commentaires */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3.5">
            <h2 className="font-extrabold text-sm text-slate-900">4. Justificatif photo & Commentaires</h2>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Photo de l'activité (caméra ou galerie - facultatif)</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-[#005c30] hover:file:bg-emerald-100 cursor-pointer"
                />
                {photoBase64 && (
                  <button
                    type="button"
                    onClick={() => setPhotoBase64(null)}
                    className="text-xs text-red-500 font-bold hover:underline"
                  >
                    Retirer la photo
                  </button>
                )}
              </div>

              {photoBase64 && (
                <div className="relative w-48 h-32 rounded-2xl overflow-hidden border border-emerald-300 mt-2">
                  <Image src={photoBase64} alt="Preuve photo" fill className="object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-xs font-bold text-slate-700">Commentaires & Résultats obtenus</label>
              <textarea
                rows={2}
                placeholder="Ex: Forte adhésion des mères d'enfants, 35 personnes sensibilisées..."
                value={commentaires}
                onChange={(e) => setCommentaires(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Difficultés rencontrées</label>
              <textarea
                rows={2}
                placeholder="Ex: Manque de boîtes à images, pluie en début de séance..."
                value={difficultes}
                onChange={(e) => setDifficultes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-[#005c30] hover:bg-[#004724] text-white text-xs font-extrabold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? "Enregistrement en cours..." : (
              <>
                <Send className="w-4 h-4" />
                <span>Enregistrer le compte-rendu d'activité</span>
              </>
            )}
          </button>

        </form>

        {/* Historique des activités passées */}
        {activitesPassees.length > 0 && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="font-extrabold text-sm text-slate-900">
              Historique des activités réalisées ({activitesPassees.length})
            </h2>
            <div className="divide-y divide-slate-100">
              {activitesPassees.map((a) => (
                <div key={a.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <strong className="text-slate-900 font-extrabold">{a.titre_activite}</strong>
                    <span className="text-slate-400">{a.date_activite}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Lieu : {a.lieu} • Catégorie : {a.categorie}
                  </p>
                  {a.commentaires && (
                    <p className="text-xs text-slate-700 italic">« {a.commentaires} »</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
