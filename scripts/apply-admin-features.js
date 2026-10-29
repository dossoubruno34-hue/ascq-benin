const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../src/app/admin/page.tsx");
let content = fs.readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n");

function replaceOnce(target, replacement, desc) {
  target = target.replace(/\r\n/g, "\n");
  replacement = replacement.replace(/\r\n/g, "\n");
  if (!content.includes(target)) {
    console.error(`Target not found for: ${desc}`);
    process.exit(1);
  }
  const parts = content.split(target);
  if (parts.length > 2) {
    console.error(`Target appears multiple times (${parts.length - 1}) for: ${desc}`);
    process.exit(1);
  }
  content = parts.join(replacement);
  console.log(`Successfully replaced: ${desc}`);
}

// 1. Imports
replaceOnce(
`  Plus,
  Trash2,
  Check
} from "lucide-react";`,
`  Plus,
  Trash2,
  Check,
  BookOpen,
  Crown,
  Award,
  Edit3,
  ExternalLink,
  FileText,
  EyeOff
} from "lucide-react";`,
  "1. Lucide Imports"
);

// 2. Tab union
replaceOnce(
`  const [tab, setTab] = useState<
    | "dashboard"
    | "comptes_ascq"
    | "perimetre_activites"
    | "permutations_requetes"
    | "diffusion_alertes"
    | "ecoute_conseils"
    | "cotonou_referentiel"
    | "exports"
  >("dashboard");`,
`  const [tab, setTab] = useState<
    | "dashboard"
    | "comptes_ascq"
    | "perimetre_activites"
    | "permutations_requetes"
    | "diffusion_alertes"
    | "ecoute_conseils"
    | "bibliotheque"
    | "cotonou_referentiel"
    | "exports"
  >("dashboard");`,
  "2. Tab State Union"
);

// 3. States
replaceOnce(
`  // Écoute citoyenne & Conseils Santé
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [conseilsSante, setConseilsSante] = useState<any[]>([]);
  const [nouveauConseilTitre, setNouveauConseilTitre] = useState("");
  const [nouveauConseilContenu, setNouveauConseilContenu] = useState("");`,
`  // Écoute citoyenne & Conseils Santé
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [conseilsSante, setConseilsSante] = useState<any[]>([]);
  const [nouveauConseilTitre, setNouveauConseilTitre] = useState("");
  const [nouveauConseilContenu, setNouveauConseilContenu] = useState("");
  const [nouveauConseilCategorie, setNouveauConseilCategorie] = useState("Santé communautaire");
  const [nouveauConseilAuteur, setNouveauConseilAuteur] = useState("Coordination ASCQ");
  const [publierConseilLoading, setPublierConseilLoading] = useState(false);

  // Bibliothèque documentaire
  const [documentsBiblio, setDocumentsBiblio] = useState<any[]>([]);
  const [searchBiblio, setSearchBiblio] = useState("");
  const [filtreCatBiblio, setFiltreCatBiblio] = useState("TOUS");
  const [nouveauDocTitre, setNouveauDocTitre] = useState("");
  const [nouveauDocCategorie, setNouveauDocCategorie] = useState("GUIDE_CLINIQUE");
  const [nouveauDocDescription, setNouveauDocDescription] = useState("");
  const [nouveauDocLien, setNouveauDocLien] = useState("");
  const [nouveauDocFormat, setNouveauDocFormat] = useState("PDF");
  const [nouveauDocAuteur, setNouveauDocAuteur] = useState("MINISTERE DE LA SANTE");
  const [ajouterDocLoading, setAjouterDocLoading] = useState(false);

  // Nomination & Assignation de responsabilité (Super Admin exclusif)
  const [nominationModalUser, setNominationModalUser] = useState<any | null>(null);
  const [nominationPoste, setNominationPoste] = useState("ASCQ");
  const [nominationRoleTechnique, setNominationRoleTechnique] = useState("ASCQ");
  const [nominationDepId, setNominationDepId] = useState("");
  const [nominationZsId, setNominationZsId] = useState("");
  const [nominationComId, setNominationComId] = useState("");
  const [nominationLoading, setNominationLoading] = useState(false);

  // Modification profil communal / PF (Représentant Départemental ou Super Admin)
  const [profilModalUser, setProfilModalUser] = useState<any | null>(null);
  const [profilComId, setProfilComId] = useState("");
  const [profilArrId, setProfilArrId] = useState("");
  const [profilTelephone, setProfilTelephone] = useState("");
  const [profilLoading, setProfilLoading] = useState(false);

  // Données géographiques pour nominations et filtres
  const [listeDepartements, setListeDepartements] = useState<any[]>([]);
  const [listeZonesSanitaires, setListeZonesSanitaires] = useState<any[]>([]);
  const [listeCommunes, setListeCommunes] = useState<any[]>([]);
  const [listeArrondissements, setListeArrondissements] = useState<any[]>([]);`,
  "3. State Declarations"
);

// 4. initialiserAdmin & allowedRoles
replaceOnce(
`      // Vérification du rôle d'accès
      const allowedRoles = [
        "SUPER_ADMIN",
        "ADMINISTRATEUR",
        "ADMIN_DEPARTEMENTAL",
        "ADMIN_COMMUNAL",
        "GESTIONNAIRE_PERIMETRE",
      ];
      if (!allowedRoles.includes(profil.role_technique)) {
        alert("Accès réservé aux administrateurs et gestionnaires de périmètre.");
        router.push("/espace-ascq");
        return;
      }

      setCurrentUser(profil);

      // Charger les statistiques selon le périmètre (commune ou département)
      await chargerStatistiques(profil);`,
`      // Lecture de l'onglet dans l'URL (?tab=)
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get("tab");
        if (urlTab && ["dashboard", "comptes_ascq", "perimetre_activites", "permutations_requetes", "diffusion_alertes", "ecoute_conseils", "bibliotheque", "cotonou_referentiel", "exports"].includes(urlTab)) {
          setTab(urlTab as any);
        }
      }

      // Rôles autorisés : Super Admin, Admins, Représentants et Cadres territoriaux
      const allowedRoles = [
        "SUPER_ADMIN",
        "ADMINISTRATEUR",
        "REPRESENTANT_DEPARTEMENTAL",
        "ADMIN_DEPARTEMENTAL",
        "CADRE_DEPARTEMENTAL",
        "CADRE_ZONE_SANITAIRE",
        "GESTIONNAIRE_PERIMETRE",
        "REPRESENTANT_COMMUNAL",
        "ADMIN_COMMUNAL",
        "CADRE_COMMUNAL",
      ];
      if (!allowedRoles.includes(profil.role_technique)) {
        alert("Accès réservé aux administrateurs, représentants et cadres territoriaux.");
        router.push("/espace-ascq");
        return;
      }

      setCurrentUser(profil);

      // Charger les données géographiques complètes pour nominations & profils
      try {
        const [depRes, zsRes, comRes, arrRes] = await Promise.all([
          supabase.from("departements").select("id, nom").order("nom"),
          supabase.from("zones_sanitaires").select("id, nom, departement_id").order("nom"),
          supabase.from("communes").select("id, nom, departement_id, zone_sanitaire_id").order("nom"),
          supabase.from("arrondissements").select("id, nom, commune_id").order("nom"),
        ]);
        setListeDepartements(depRes.data || []);
        setListeZonesSanitaires(zsRes.data || []);
        setListeCommunes(comRes.data || []);
        setListeArrondissements(arrRes.data || []);
      } catch (geoErr) {
        console.warn("Erreur chargement cascades géographiques:", geoErr);
      }

      // Charger les statistiques selon le périmètre (commune ou département)
      await chargerStatistiques(profil);`,
  "4. initialiserAdmin allowedRoles & geo"
);

// 5. chargerDonneesSecondaires biblio
replaceOnce(
`      const { data: zCotonou } = await supabase
        .from("zones_sanitaires")
        .select("id, nom")
        .ilike("nom", "%COTONOU%");
      setZonesCotonou(zCotonou || []);
    } catch (e) {`,
`      const { data: zCotonou } = await supabase
        .from("zones_sanitaires")
        .select("id, nom")
        .ilike("nom", "%COTONOU%");
      setZonesCotonou(zCotonou || []);

      // 7. Bibliothèque de documents
      const { data: biblio } = await supabase
        .from("bibliotheque_documents")
        .select("*")
        .order("created_at", { ascending: false });
      setDocumentsBiblio(biblio || []);
    } catch (e) {`,
  "5. chargerDonneesSecondaires biblio"
);

// 6. Action handlers
replaceOnce(
`  const handleRejeterCompte = async (id: string) => {
    if (!confirm("Voulez-vous suspendre ou refuser ce compte ?")) return;
    setActionLoadingId(id);
    try {
      await supabase.rpc("changer_statut_compte", {
        p_id: id,
        p_nouveau_statut: "REJETE",
      });
      setToastMessage({ text: "Compte rejeté.", error: false });
      await chargerComptes();
    } catch (err: any) {
      setToastMessage({ text: err.message, error: true });
    } finally {
      setActionLoadingId(null);
    }
  };`,
`  const handleRejeterCompte = async (id: string) => {
    if (!confirm("Voulez-vous suspendre ou refuser ce compte ?")) return;
    setActionLoadingId(id);
    try {
      await supabase.rpc("changer_statut_compte", {
        p_id: id,
        p_nouveau_statut: "REJETE",
      });
      setToastMessage({ text: "Compte rejeté.", error: false });
      await chargerComptes();
    } catch (err: any) {
      setToastMessage({ text: err.message, error: true });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Contrôles de permissions hiérarchiques
  const peutValiderCompte = (compte: any) => {
    if (!currentUser) return false;
    const role = currentUser.role_technique;
    if (role === "SUPER_ADMIN" || role === "ADMINISTRATEUR") return true;
    if (role === "REPRESENTANT_DEPARTEMENTAL" || role === "ADMIN_DEPARTEMENTAL") {
      return (
        compte.departement_id === currentUser.departement_id &&
        ["ASCQ", "PF_CCLS_TP"].includes(compte.poste)
      );
    }
    if (role === "REPRESENTANT_COMMUNAL" || role === "ADMIN_COMMUNAL") {
      return compte.commune_id === currentUser.commune_id && compte.poste === "ASCQ";
    }
    return false;
  };

  const peutModifierProfil = (compte: any) => {
    if (!currentUser) return false;
    const role = currentUser.role_technique;
    if (role === "SUPER_ADMIN") return true;
    if (role === "REPRESENTANT_DEPARTEMENTAL" || role === "ADMIN_DEPARTEMENTAL") {
      return (
        compte.departement_id === currentUser.departement_id &&
        ["REPRESENTANT_COMMUNAL", "PF_CCLS_TP", "ASCQ"].includes(compte.poste)
      );
    }
    return false;
  };

  // Nomination & Assignation de responsabilité (Super Admin exclusif)
  const ouvrirModalNomination = (compte: any) => {
    setNominationModalUser(compte);
    setNominationPoste(compte.poste || "ASCQ");
    setNominationRoleTechnique(compte.role_technique || "ASCQ");
    setNominationDepId(compte.departement_id || "");
    setNominationZsId(compte.zone_sanitaire_id || "");
    setNominationComId(compte.commune_id || "");
  };

  const handleAssignerResponsabilite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nominationModalUser) return;
    setNominationLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_assigner_responsabilite", {
        p_target_user_id: nominationModalUser.id,
        p_nouveau_poste: nominationPoste,
        p_nouveau_role_technique: nominationRoleTechnique,
        p_departement_id: nominationDepId || null,
        p_zone_sanitaire_id: nominationZsId || null,
        p_commune_id: nominationComId || null,
      });
      if (error) throw error;
      setToastMessage({
        text: \`Responsabilité de \${nominationModalUser.nom} \${nominationModalUser.prenoms} assignée avec succès (\${nominationPoste} / \${nominationRoleTechnique}) !\`,
        error: false,
      });
      setNominationModalUser(null);
      await chargerComptes();
    } catch (err: any) {
      setToastMessage({ text: "Erreur assignation : " + (err.message || err), error: true });
    } finally {
      setNominationLoading(false);
    }
  };

  // Modification profil communal / PF (Représentant Départemental ou Super Admin)
  const ouvrirModalProfil = (compte: any) => {
    setProfilModalUser(compte);
    setProfilComId(compte.commune_id || "");
    setProfilArrId(compte.arrondissement_id || "");
    setProfilTelephone(compte.telephone || "");
  };

  const handleEnregistrerProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profilModalUser) return;
    setProfilLoading(true);
    try {
      const { error } = await supabase.rpc("representant_dept_modifier_profil", {
        p_target_user_id: profilModalUser.id,
        p_commune_id: profilComId || null,
        p_arrondissement_id: profilArrId || null,
        p_telephone: profilTelephone || null,
      });
      if (error) throw error;
      setToastMessage({
        text: \`Fiche profil de \${profilModalUser.nom} \${profilModalUser.prenoms} mise à jour avec succès !\`,
        error: false,
      });
      setProfilModalUser(null);
      await chargerComptes();
    } catch (err: any) {
      setToastMessage({ text: "Erreur modification profil : " + (err.message || err), error: true });
    } finally {
      setProfilLoading(false);
    }
  };

  // Conseils Santé Handlers
  const handlePublierConseil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nouveauConseilTitre.trim() || !nouveauConseilContenu.trim()) {
      alert("Veuillez renseigner le titre et le contenu du conseil santé.");
      return;
    }
    setPublierConseilLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_creer_conseil_sante", {
        p_titre: nouveauConseilTitre.trim(),
        p_contenu: nouveauConseilContenu.trim(),
        p_categorie: nouveauConseilCategorie,
        p_auteur: nouveauConseilAuteur.trim() || "Coordination ASCQ",
      });
      if (error) {
        const { error: insertErr } = await supabase.from("conseils_sante").insert({
          titre: nouveauConseilTitre.trim(),
          contenu: nouveauConseilContenu.trim(),
          categorie: nouveauConseilCategorie,
          auteur: nouveauConseilAuteur.trim() || "Coordination ASCQ",
          est_publie: true,
        });
        if (insertErr) throw insertErr;
      }
      setToastMessage({ text: "Conseil santé publié avec succès ! Visible sur la page d'accueil.", error: false });
      setNouveauConseilTitre("");
      setNouveauConseilContenu("");
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      setToastMessage({ text: "Erreur publication : " + (err.message || err), error: true });
    } finally {
      setPublierConseilLoading(false);
    }
  };

  const handleSupprimerConseil = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer définitivement ce conseil santé ?")) return;
    try {
      const { error } = await supabase.rpc("admin_supprimer_conseil_sante", { p_id: id });
      if (error) {
        const { error: delErr } = await supabase.from("conseils_sante").delete().eq("id", id);
        if (delErr) throw delErr;
      }
      setToastMessage({ text: "Conseil santé supprimé avec succès.", error: false });
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      alert("Erreur suppression : " + err.message);
    }
  };

  const handleToggleConseil = async (id: string, statutActuel: boolean) => {
    try {
      const { error } = await supabase.rpc("admin_toggle_conseil_sante", {
        p_id: id,
        p_est_publie: !statutActuel,
      });
      if (error) {
        const { error: updErr } = await supabase.from("conseils_sante").update({ est_publie: !statutActuel }).eq("id", id);
        if (updErr) throw updErr;
      }
      setToastMessage({ text: !statutActuel ? "Conseil rendu public !" : "Conseil masqué du public.", error: false });
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      alert("Erreur mise à jour : " + err.message);
    }
  };

  // Bibliothèque Documentaire Handlers
  const handleAjouterDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nouveauDocTitre.trim() || !nouveauDocLien.trim()) {
      alert("Veuillez renseigner le titre et le lien du document.");
      return;
    }
    setAjouterDocLoading(true);
    try {
      const { error } = await supabase.rpc("admin_creer_document_bibliotheque", {
        p_titre: nouveauDocTitre.trim(),
        p_categorie: nouveauDocCategorie,
        p_description: nouveauDocDescription.trim() || null,
        p_lien_drive: nouveauDocLien.trim(),
        p_format_fichier: nouveauDocFormat,
        p_auteur: nouveauDocAuteur.trim() || "MINISTERE DE LA SANTE",
      });
      if (error) {
        const { error: insertErr } = await supabase.from("bibliotheque_documents").insert({
          titre: nouveauDocTitre.trim(),
          categorie: nouveauDocCategorie,
          description: nouveauDocDescription.trim() || null,
          lien_drive: nouveauDocLien.trim(),
          format_fichier: nouveauDocFormat,
          auteur: nouveauDocAuteur.trim() || "MINISTERE DE LA SANTE",
          est_actif: true,
        });
        if (insertErr) throw insertErr;
      }
      setToastMessage({ text: "Document déposé avec succès dans la Bibliothèque Officielle !", error: false });
      setNouveauDocTitre("");
      setNouveauDocDescription("");
      setNouveauDocLien("");
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      setToastMessage({ text: "Erreur ajout document : " + (err.message || err), error: true });
    } finally {
      setAjouterDocLoading(false);
    }
  };

  const handleSupprimerDoc = async (id: string) => {
    if (!confirm("Voulez-vous supprimer ce document de la bibliothèque ?")) return;
    try {
      const { error } = await supabase.rpc("admin_supprimer_document_bibliotheque", { p_id: id });
      if (error) {
        const { error: delErr } = await supabase.from("bibliotheque_documents").delete().eq("id", id);
        if (delErr) throw delErr;
      }
      setToastMessage({ text: "Document retiré de la bibliothèque.", error: false });
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      alert("Erreur suppression : " + err.message);
    }
  };

  const handleToggleDoc = async (id: string, statutActuel: boolean) => {
    try {
      const { error } = await supabase.rpc("admin_toggle_document_bibliotheque", {
        p_id: id,
        p_est_actif: !statutActuel,
      });
      if (error) {
        const { error: updErr } = await supabase.from("bibliotheque_documents").update({ est_actif: !statutActuel }).eq("id", id);
        if (updErr) throw updErr;
      }
      setToastMessage({ text: !statutActuel ? "Document activé !" : "Document désactivé.", error: false });
      await chargerDonneesSecondaires(currentUser);
    } catch (err: any) {
      alert("Erreur mise à jour : " + err.message);
    }
  };`,
  "6. Action Handlers"
);

// 7. Tab Bar
replaceOnce(
`              { id: "diffusion_alertes", label: "Diffusion Alertes", icon: BellRing },
              { id: "ecoute_conseils", label: "Conseils & Citoyens", icon: HeartHandshake },
              { id: "cotonou_referentiel", label: "Cotonou & Référentiel", icon: MapPin },`,
`              { id: "diffusion_alertes", label: "Diffusion Alertes", icon: BellRing },
              { id: "ecoute_conseils", label: "Conseils & Citoyens", icon: HeartHandshake },
              { id: "bibliotheque", label: "Bibliothèque", icon: BookOpen },
              { id: "cotonou_referentiel", label: "Cotonou & Référentiel", icon: MapPin },`,
  "7. Tab Bar"
);

// 8. Accounts Table Actions
replaceOnce(
`                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                          {c.statut_compte === "EN_ATTENTE" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleValiderCompte(c)}
                                disabled={actionLoadingId === c.id}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 active:scale-95 transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Valider</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejeterCompte(c.id)}
                                disabled={actionLoadingId === c.id}
                                className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Rejeter</span>
                              </button>
                            </>
                          )}
                          {c.statut_compte === "VALIDE" && (
                            <button
                              type="button"
                              onClick={() => handleRejeterCompte(c.id)}
                              className="px-2.5 py-1 text-slate-400 hover:text-red-600 text-xs font-semibold"
                            >
                              Suspendre
                            </button>
                          )}
                        </div>`,
`                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
                          {/* 1. BOUTON SUPER ADMIN : NOMINATION & RESPONSABILITÉ */}
                          {currentUser?.role_technique === "SUPER_ADMIN" && (
                            <button
                              type="button"
                              onClick={() => ouvrirModalNomination(c)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-300 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                              title="Nommer ou assigner le rôle hiérarchique et le territoire de cet agent"
                            >
                              <Crown className="w-3.5 h-3.5 text-amber-600" />
                              <span>Nommer / Rôle</span>
                            </button>
                          )}

                          {/* 2. BOUTON REPRÉSENTANT DÉPT / SUPER ADMIN : MODIFIER FICHE PROFIL */}
                          {peutModifierProfil(c) && (
                            <button
                              type="button"
                              onClick={() => ouvrirModalProfil(c)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
                              title="Modifier la fiche profil (commune, arrondissement, téléphone)"
                            >
                              <Edit3 className="w-3 h-3 text-slate-600" />
                              <span>Profil</span>
                            </button>
                          )}

                          {/* 3. VALIDATION SELON LA MATRICE HIÉRARCHIQUE */}
                          {c.statut_compte === "EN_ATTENTE" && (
                            <>
                              {peutValiderCompte(c) ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleValiderCompte(c)}
                                    disabled={actionLoadingId === c.id}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 active:scale-95 transition-all"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Valider</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejeterCompte(c.id)}
                                    disabled={actionLoadingId === c.id}
                                    className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Rejeter</span>
                                  </button>
                                </>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-bold border border-slate-200 italic" title="Ce rôle est en consultation sur ce territoire">
                                  Consultation
                                </span>
                              )}
                            </>
                          )}

                          {c.statut_compte === "VALIDE" && peutValiderCompte(c) && (
                            <button
                              type="button"
                              onClick={() => handleRejeterCompte(c.id)}
                              className="px-2.5 py-1 text-slate-400 hover:text-red-600 text-xs font-semibold"
                            >
                              Suspendre
                            </button>
                          )}
                        </div>`,
  "8. Accounts Table Actions"
);

// 9. Conseils Santé & Bibliothèque Tab
replaceOnce(
`            {/* B. GESTION DES CONSEILS SANTÉ PUBLICS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Conseils Santé (Visibles sur la page d'accueil)
                </h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {conseilsSante.map((cs) => (
                  <div key={cs.id} className="py-2.5">
                    <h4 className="text-xs font-bold text-slate-900">{cs.titre}</h4>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{cs.contenu}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}`,
`            {/* B. GESTION ET PUBLICATION DES CONSEILS SANTÉ PUBLICS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Conseils Santé Publics
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Visibles en direct sur la page d'accueil par tous les citoyens ({conseilsSante.length})
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulaire de publication */}
              <form onSubmit={handlePublierConseil} className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900 uppercase">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Publier un nouveau conseil santé</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Titre du conseil *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex : Prévention du paludisme : utilisation systématique de la moustiquaire"
                    value={nouveauConseilTitre}
                    onChange={(e) => setNouveauConseilTitre(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Catégorie</label>
                    <select
                      value={nouveauConseilCategorie}
                      onChange={(e) => setNouveauConseilCategorie(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="Santé communautaire">Santé communautaire</option>
                      <option value="Nutrition">Nutrition & Alimentation</option>
                      <option value="Hygiène & Eau">Hygiène & Eau potable</option>
                      <option value="Santé Maternelle & Infantile">Santé Maternelle & Infantile</option>
                      <option value="Paludisme & Épidémies">Paludisme & Épidémies</option>
                      <option value="Vaccination">Vaccination</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Auteur / Source</label>
                    <input
                      type="text"
                      value={nouveauConseilAuteur}
                      onChange={(e) => setNouveauConseilAuteur(e.target.value)}
                      placeholder="Ex : Coordination Nationale ASCQ"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Contenu / Message clé *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Détaillez le conseil de santé publique pour la communauté..."
                    value={nouveauConseilContenu}
                    onChange={(e) => setNouveauConseilContenu(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  ></textarea>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={publierConseilLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{publierConseilLoading ? "Publication..." : "Publier le conseil"}</span>
                  </button>
                </div>
              </form>

              {/* Liste des conseils publiés ou masqués */}
              <div className="space-y-2 max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
                {conseilsSante.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400 italic">Aucun conseil de santé publié pour le moment.</p>
                ) : (
                  conseilsSante.map((cs) => (
                    <div key={cs.id} className="pt-2.5 pb-2 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900">{cs.titre}</span>
                            <span className="px-2 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {cs.categorie || "Santé"}
                            </span>
                            <span className={\`px-2 py-0.2 rounded text-[9px] font-black uppercase \${
                              cs.est_publie ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                            }\`}>
                              {cs.est_publie ? "En ligne" : "Masqué"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Par : {cs.auteur || "Coordination ASCQ"} {cs.created_at ? \`• \${new Date(cs.created_at).toLocaleDateString("fr-FR")}\` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleConseil(cs.id, cs.est_publie)}
                            className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
                            title={cs.est_publie ? "Masquer ce conseil" : "Rendre public ce conseil"}
                          >
                            {cs.est_publie ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSupprimerConseil(cs.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs font-semibold"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-lg">{cs.contenu}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET BIBLIOTHÈQUE DOCUMENTAIRE OFFICIELLE */}
        {/* ========================================================= */}
        {tab === "bibliotheque" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Bibliothèque Documentaire & Directives Officielles
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Déposez et gérez les guides cliniques, protocoles PCIME-C, textes réglementaires et manuels pour les ASCQ.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/espace-ascq/bibliotheque"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-sm transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Voir vue utilisateur</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulaire de dépôt */}
              <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Déposer un document officiel
                  </h3>
                </div>

                <form onSubmit={handleAjouterDoc} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Titre du document *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex : Guide National de Traitement du Paludisme"
                      value={nouveauDocTitre}
                      onChange={(e) => setNouveauDocTitre(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Catégorie officielle *</label>
                    <select
                      value={nouveauDocCategorie}
                      onChange={(e) => setNouveauDocCategorie(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      <option value="GUIDE_CLINIQUE">Guide clinique (PCIME-C, Soins...)</option>
                      <option value="SURVEILLANCE">Surveillance épidémiologique</option>
                      <option value="OUTIL_GESTION">Outil de gestion & Rapports</option>
                      <option value="REGLEMENTATION">Textes réglementaires & Politiques</option>
                      <option value="FORMATION">Modules de formation</option>
                      <option value="AUTRE">Autre document officiel</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Format</label>
                      <select
                        value={nouveauDocFormat}
                        onChange={(e) => setNouveauDocFormat(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      >
                        <option value="PDF">PDF</option>
                        <option value="DOCX">DOCX</option>
                        <option value="XLSX">Excel / XLSX</option>
                        <option value="LIEN">Lien Web</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Auteur / Source</label>
                      <input
                        type="text"
                        value={nouveauDocAuteur}
                        onChange={(e) => setNouveauDocAuteur(e.target.value)}
                        placeholder="Ex : MINISTERE DE LA SANTE"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Lien Google Drive / Téléchargement *</label>
                    <input
                      type="url"
                      required
                      placeholder="https://drive.google.com/..."
                      value={nouveauDocLien}
                      onChange={(e) => setNouveauDocLien(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Description / Objectif (optionnel)</label>
                    <textarea
                      rows={3}
                      placeholder="Décrivez brièvement le contenu ou les instructions d'application..."
                      value={nouveauDocDescription}
                      onChange={(e) => setNouveauDocDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={ajouterDocLoading}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{ajouterDocLoading ? "Enregistrement..." : "Ajouter à la bibliothèque"}</span>
                  </button>
                </form>
              </div>

              {/* Liste des documents existants */}
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Documents en ligne ({documentsBiblio.length})
                  </h3>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Rechercher par titre..."
                      value={searchBiblio}
                      onChange={(e) => setSearchBiblio(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                {/* Filtre catégorie */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
                  {["TOUS", "GUIDE_CLINIQUE", "SURVEILLANCE", "OUTIL_GESTION", "REGLEMENTATION", "FORMATION"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFiltreCatBiblio(cat)}
                      className={\`px-2.5 py-1 rounded-lg shrink-0 transition-all \${
                        filtreCatBiblio === cat
                          ? "bg-[#005c30] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }\`}
                    >
                      {cat === "TOUS" ? "Tous" : cat.replace("_", " ")}
                    </button>
                  ))}
                </div>

                {/* Liste des documents */}
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
                  {documentsBiblio
                    .filter((d) => (filtreCatBiblio === "TOUS" ? true : d.categorie === filtreCatBiblio))
                    .filter((d) => \`\${d.titre} \${d.description || ""}\`.toLowerCase().includes(searchBiblio.toLowerCase()))
                    .length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400 italic">Aucun document correspondant.</p>
                  ) : (
                    documentsBiblio
                      .filter((d) => (filtreCatBiblio === "TOUS" ? true : d.categorie === filtreCatBiblio))
                      .filter((d) => \`\${d.titre} \${d.description || ""}\`.toLowerCase().includes(searchBiblio.toLowerCase()))
                      .map((d) => (
                        <div key={d.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-slate-50 transition-colors">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-xs text-slate-900">{d.titre}</span>
                              <span className="px-2 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {d.categorie}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-blue-50 text-blue-700">
                                {d.format_fichier || "PDF"}
                              </span>
                              <span className={\`px-2 py-0.2 rounded text-[9px] font-bold \${
                                d.est_actif ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                              }\`}>
                                {d.est_actif ? "Actif" : "Inactif"}
                              </span>
                            </div>
                            {d.description && (
                              <p className="text-[11px] text-slate-600 line-clamp-2">{d.description}</p>
                            )}
                            <p className="text-[10px] text-slate-400">
                              Émis par : <span className="font-semibold">{d.auteur || "MINISTERE DE LA SANTE"}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                            <a
                              href={d.lien_drive}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Ouvrir</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleToggleDoc(d.id, d.est_actif)}
                              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              title={d.est_actif ? "Désactiver" : "Activer"}
                            >
                              {d.est_actif ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSupprimerDoc(d.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}`,
  "9. Conseils Sante & Bibliotheque Tab"
);

// 10. Modals
const targetModals = `            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 w-fit mb-2">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">Rapports Mensuels RMA</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Consolidation de tous les indicateurs mensuels d'activité iCCM et One Health par commune.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportSurveillance}
                className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger CSV</span>
              </button>
            </div>
          </div>
        )}
      </main>`;

const replacementModals = `            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 w-fit mb-2">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">Rapports Mensuels RMA</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Consolidation de tous les indicateurs mensuels d'activité iCCM et One Health par commune.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportSurveillance}
                className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODALE 1 : NOMINATION & RESPONSABILITÉ (SUPER ADMIN) */}
        {/* ========================================================= */}
        {nominationModalUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                    <Crown className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900">
                      Nomination & Attribution de Responsabilité
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Acte institutionnel réservé exclusivement au Super Administrateur National
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNominationModalUser(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
                >
                  ✕
                </button>
              </div>

              {/* Fiche agent sélectionné */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 uppercase">
                    {nominationModalUser.nom} {nominationModalUser.prenoms}
                  </span>
                  <span className="font-bold text-slate-600">{nominationModalUser.telephone}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Poste actuel : <strong>{nominationModalUser.poste}</strong> • Rôle technique : <strong>{nominationModalUser.role_technique}</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  Territoire actuel : {nominationModalUser.departement_nom || "National"} &rarr; {nominationModalUser.commune_nom || "Non assigné"}
                </p>
              </div>

              <form onSubmit={handleAssignerResponsabilite} className="space-y-3.5">
                {/* 1. Poste Institutionnel */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Poste / Titre Institutionnel *
                  </label>
                  <select
                    value={nominationPoste}
                    onChange={(e) => {
                      const np = e.target.value;
                      setNominationPoste(np);
                      if (["DDS", "CCD_CDLS_TP", "CSSPR", "CSPSMEMH"].includes(np)) {
                        setNominationRoleTechnique("CADRE_DEPARTEMENTAL");
                      } else if (np === "REPRESENTANT_DEPARTEMENTAL") {
                        setNominationRoleTechnique("REPRESENTANT_DEPARTEMENTAL");
                      } else if (["MCZS", "RCSE", "C_RAMS"].includes(np)) {
                        setNominationRoleTechnique("CADRE_ZONE_SANITAIRE");
                      } else if (np === "MCC") {
                        setNominationRoleTechnique("CADRE_COMMUNAL");
                      } else if (np === "REPRESENTANT_COMMUNAL") {
                        setNominationRoleTechnique("REPRESENTANT_COMMUNAL");
                      } else if (np === "PF_CCLS_TP") {
                        setNominationRoleTechnique("ADMIN_COMMUNAL");
                      } else if (np === "SUPER_ADMIN") {
                        setNominationRoleTechnique("SUPER_ADMIN");
                      } else {
                        setNominationRoleTechnique("ASCQ");
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <optgroup label="Niveau National">
                      <option value="SUPER_ADMIN">👑 Super Administrateur National</option>
                      <option value="ASCQ">ASCQ (Agent de Santé Communautaire Qualifié)</option>
                    </optgroup>
                    <optgroup label="Niveau Départemental">
                      <option value="REPRESENTANT_DEPARTEMENTAL">Représentant Départemental des ASCQ</option>
                      <option value="DDS">DDS (Directeur Départemental de la Santé)</option>
                      <option value="CCD_CDLS_TP">CCD CDLS-TP (Coordination Dép. CDLS-TP)</option>
                      <option value="CSSPR">CSSPR (Chef Service Santé Publique & Réponse)</option>
                      <option value="CSPSMEMH">CSPSMEMH (Chef Service Pharmacie & Santé Mère-Enfant)</option>
                    </optgroup>
                    <optgroup label="Niveau Zone Sanitaire">
                      <option value="MCZS">MCZS (Médecin Coordonnateur Zone Sanitaire)</option>
                      <option value="RCSE">RCSE (Resp. Cellule Surveillance Épidémiologique)</option>
                      <option value="C_RAMS">C-RAMS (Chargé Registre & Audit Mortalité)</option>
                    </optgroup>
                    <optgroup label="Niveau Communal">
                      <option value="MCC">MCC (Médecin Coordonnateur de Commune)</option>
                      <option value="REPRESENTANT_COMMUNAL">Représentant Communal des ASCQ</option>
                      <option value="PF_CCLS_TP">PF CCLS-TP (Point Focal Santé Commune)</option>
                    </optgroup>
                  </select>
                </div>

                {/* 2. Rôle Technique Système */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Privilèges Système (Rôle Technique) *
                  </label>
                  <select
                    value={nominationRoleTechnique}
                    onChange={(e) => setNominationRoleTechnique(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Pleins pouvoirs nationaux & nominations)</option>
                    <option value="ADMINISTRATEUR">ADMINISTRATEUR (Supervision nationale générale)</option>
                    <option value="REPRESENTANT_DEPARTEMENTAL">REPRESENTANT_DEPARTEMENTAL (Valide ASCQ/PF dépt, modifie profil communal, alertes)</option>
                    <option value="CADRE_DEPARTEMENTAL">CADRE_DEPARTEMENTAL (DDS/CCD : Rapports dépt, alertes)</option>
                    <option value="CADRE_ZONE_SANITAIRE">CADRE_ZONE_SANITAIRE (MCZS/RCSE : Rapports zone, alertes)</option>
                    <option value="REPRESENTANT_COMMUNAL">REPRESENTANT_COMMUNAL (Valide ASCQ commune, alertes, rapports commune)</option>
                    <option value="ADMIN_COMMUNAL">ADMIN_COMMUNAL (PF CCLS-TP : Valide ASCQ commune, alertes)</option>
                    <option value="CADRE_COMMUNAL">CADRE_COMMUNAL (MCC : Rapports commune, alerte au représentant)</option>
                    <option value="ASCQ">ASCQ (Agent de santé communautaire terrain)</option>
                  </select>
                </div>

                {/* 3. Territoire d'assignation */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <span className="text-[11px] font-extrabold text-slate-700 block">
                    Territoire d'Affectation
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Département</label>
                      <select
                        value={nominationDepId}
                        onChange={(e) => {
                          setNominationDepId(e.target.value);
                          setNominationZsId("");
                          setNominationComId("");
                        }}
                        className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                      >
                        <option value="">-- National --</option>
                        {listeDepartements.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.nom}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Zone Sanitaire</label>
                      <select
                        value={nominationZsId}
                        onChange={(e) => setNominationZsId(e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                      >
                        <option value="">-- Toutes zones --</option>
                        {listeZonesSanitaires
                          .filter((z) => !nominationDepId || z.departement_id === nominationDepId)
                          .map((z) => (
                            <option key={z.id} value={z.id}>
                              {z.nom}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Commune</label>
                      <select
                        value={nominationComId}
                        onChange={(e) => setNominationComId(e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                      >
                        <option value="">-- Toutes communes --</option>
                        {listeCommunes
                          .filter((c) => !nominationDepId || c.departement_id === nominationDepId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nom}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setNominationModalUser(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={nominationLoading}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    <span>{nominationLoading ? "Enregistrement..." : "Confirmer la nomination"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODALE 2 : MODIFICATION PROFIL COMMUNAL (REPRÉSENTANT DÉPT) */}
        {/* ========================================================= */}
        {profilModalUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-[#005c30] rounded-xl">
                    <Edit3 className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900">
                      Mise à jour Fiche Profil
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Représentant Communal, PF CCLS-TP ou ASCQ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProfilModalUser(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                <span className="font-extrabold text-slate-900 uppercase block">
                  {profilModalUser.nom} {profilModalUser.prenoms}
                </span>
                <span className="text-slate-500 text-[11px]">
                  Poste : {profilModalUser.poste} • Département : {profilModalUser.departement_nom}
                </span>
              </div>

              <form onSubmit={handleEnregistrerProfil} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Numéro de Téléphone Officiel
                  </label>
                  <input
                    type="text"
                    value={profilTelephone}
                    onChange={(e) => setProfilTelephone(e.target.value)}
                    placeholder="+229 01..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Commune d'Affectation
                  </label>
                  <select
                    value={profilComId}
                    onChange={(e) => {
                      setProfilComId(e.target.value);
                      setProfilArrId("");
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    <option value="">-- Choisir la commune --</option>
                    {listeCommunes
                      .filter((c) => !profilModalUser.departement_id || c.departement_id === profilModalUser.departement_id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Arrondissement d'Affectation
                  </label>
                  <select
                    value={profilArrId}
                    onChange={(e) => setProfilArrId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    <option value="">-- Choisir l'arrondissement --</option>
                    {listeArrondissements
                      .filter((a) => !profilComId || a.commune_id === profilComId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nom}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setProfilModalUser(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={profilLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{profilLoading ? "Enregistrement..." : "Mettre à jour la fiche"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>`;

replaceOnce(targetModals, replacementModals, "10. Modals");

fs.writeFileSync(filePath, content, "utf-8");
console.log("ALL FEATURES APPLIED SUCCESSFULLY TO src/app/admin/page.tsx");
