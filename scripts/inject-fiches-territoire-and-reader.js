const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/app/perimetre/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Contenu de l'onglet fiches_territoire
const fichesTerritoireTabCode = `        {/* ------------------------------------------------------------- */}
        {/* ONGLET 3 : TOUTES LES FICHES & REGISTRES DU TERRITOIRE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "fiches_territoire" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-emerald-700" />
                    <span>Registre Central des Fiches du Territoire</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consultez toutes les fiches d'activité et dossiers cliniques remplis par les ASCQ de votre périmètre territorial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={chargerRegistreFichesTerritoire}
                  disabled={loadingRegistre}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 self-start sm:self-auto transition-all shadow-sm"
                >
                  <RefreshCw className={\`w-3.5 h-3.5 \${loadingRegistre ? "animate-spin text-[#005c30]" : ""}\`} />
                  <span>Actualiser le registre</span>
                </button>
              </div>

              {/* Filtres par module */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
                {[
                  { id: "TOUT", label: "Toutes les fiches" },
                  { id: "ICCM", label: "🩺 Soins iCCM" },
                  { id: "MATERNITE", label: "🤰 Maternité" },
                  { id: "ENFANTS_1000J", label: "👶 1000 Jours" },
                  { id: "REFERENCES", label: "🚑 Références CS" },
                  { id: "ALERTES", label: "🚨 Alertes SIMR" },
                  { id: "DECES", label: "⚰️ Décès" },
                  { id: "RMA", label: "📊 Rapports RMA" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltreTypeFiche(f.id)}
                    className={\`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all \${
                      filtreTypeFiche === f.id
                        ? "bg-[#005c30] text-white shadow-sm font-black"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }\`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Barre de recherche */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom de patient, village, nom d'ASCQ, diagnostic..."
                  value={rechercheRegistre}
                  onChange={(e) => setRechercheRegistre(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Liste des fiches */}
              <div className="space-y-2 pt-1">
                {loadingRegistre ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30] mb-2" />
                    Chargement du registre des fiches du territoire...
                  </div>
                ) : (
                  (() => {
                    const fichesFiltrees = registreFiches.filter((item) => {
                      if (filtreTypeFiche !== "TOUT" && item.type !== filtreTypeFiche) return false;
                      if (!rechercheRegistre.trim()) return true;
                      const q = rechercheRegistre.toLowerCase();
                      return (
                        item.titre?.toLowerCase().includes(q) ||
                        item.sousTitre?.toLowerCase().includes(q) ||
                        item.ascqNom?.toLowerCase().includes(q) ||
                        item.typeLibelle?.toLowerCase().includes(q)
                      );
                    });

                    if (fichesFiltrees.length === 0) {
                      return (
                        <div className="py-12 text-center bg-slate-50/80 rounded-2xl border border-slate-200/80 text-slate-400 text-xs">
                          Aucune fiche trouvée correspondant à vos critères de recherche.
                        </div>
                      );
                    }

                    return fichesFiltrees.map((item) => (
                      <div
                        key={\`\${item.type}_\${item.id}\`}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={\`px-2.5 py-0.5 rounded-full text-[10px] font-black border \${item.badgeColor}\`}>
                              {item.typeLibelle}
                            </span>
                            <span className="font-extrabold text-slate-900 text-sm">{item.titre}</span>
                            {item.decision && (
                              <span className={\`px-2 py-0.5 rounded-full text-[10px] font-bold \${item.decisionBadge || "bg-slate-100 text-slate-700"}\`}>
                                {item.decision}
                              </span>
                            )}
                          </div>

                          <p className="text-slate-600 text-[11px]">{item.sousTitre}</p>

                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                            <span>ASCQ : <strong className="text-slate-700">{item.ascqNom}</strong></span>
                            <span>•</span>
                            <span>Date : <strong>{new Date(item.dateFiche).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setFicheAffichee({ type: item.type, donnees: item.raw, ascq: { id: item.ascqId, nom: item.ascqNom } })}
                            className="py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Consulter</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSuggestionAscqId(item.ascqId);
                              setSuggestionModule(item.type);
                              setSuggestionTitre(\`Remarque sur \${item.typeLibelle} (\${item.titre})\`);
                              setActiveTab("suggestions");
                            }}
                            className="py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-all"
                            title="Suggérer une remarque sur cette fiche"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Remarque</span>
                          </button>
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          </div>
        )}
`;

// Remplacement avant inscriptions_ascq
const targetBeforeInscriptions = `        {/* ------------------------------------------------------------- */}
        {/* ONGLET 3 : VALIDATION DES INSCRIPTIONS ASCQ DU PERIMETRE */}`;

if (!content.includes(targetBeforeInscriptions)) {
  console.error("targetBeforeInscriptions not found!");
  process.exit(1);
}

content = content.replace(targetBeforeInscriptions, fichesTerritoireTabCode + "\n" + targetBeforeInscriptions);
console.log("Injected fiches_territoire tab successfully.");

// 2. Modale de lecture approfondie ficheAffichee
const ficheReaderModalCode = `
        {/* MODAL OFFICIEL DE CONSULTATION DE FICHE (SUPERVISION EN LECTURE SEULE) */}
        {ficheAffichee && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-xs">
              
              {/* En-tête officiel */}
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#005c30] text-[10px] font-black uppercase tracking-wide border border-emerald-300">
                      Supervision Officielle • Lecture Seule
                    </span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    {ficheAffichee.type === "ICCM" && \`Fiche Consultation iCCM : \${ficheAffichee.donnees.prenoms_patient} \${ficheAffichee.donnees.nom_patient}\`}
                    {ficheAffichee.type === "MATERNITE" && \`Fiche Maternité : \${ficheAffichee.donnees.prenoms} \${ficheAffichee.donnees.nom}\`}
                    {ficheAffichee.type === "ENFANTS_1000J" && \`Fiche Enfant 1000 Jours : \${ficheAffichee.donnees.prenoms || ""} \${ficheAffichee.donnees.nom || ""}\`}
                    {ficheAffichee.type === "REFERENCES" && \`Fiche Référence CS / GUPS : \${ficheAffichee.donnees.motif_reference || "Urgence"}\`}
                    {ficheAffichee.type === "ALERTES" && \`Notification Alerte SIMR : \${ficheAffichee.donnees.type_alerte_nom}\`}
                    {ficheAffichee.type === "DECES" && \`Notification Décès Communautaire : \${ficheAffichee.donnees.type_deces_nom}\`}
                    {ficheAffichee.type === "RMA" && \`Rapport Mensuel d'Activité (Mois \${ficheAffichee.donnees.mois} / \${ficheAffichee.donnees.annee})\`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Agent responsable : <strong>{ficheAffichee.ascq?.nom || "ASCQ"}</strong> • Village/Aire : <strong>{ficheAffichee.donnees.village || ficheAffichee.donnees.village_nom || "Territoire"}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFicheAffichee(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corps de la fiche */}
              <div className="p-5 overflow-y-auto space-y-3.5 max-h-[65vh]">
                
                {/* 1. FICHE ICCM */}
                {ficheAffichee.type === "ICCM" && (
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 text-xs">Identité de l'Enfant</h4>
                      <div className="grid grid-cols-2 gap-2 text-slate-700 text-[11px]">
                        <p>Nom & Prénoms : <strong>{ficheAffichee.donnees.prenoms_patient} {ficheAffichee.donnees.nom_patient}</strong></p>
                        <p>Âge : <strong>{ficheAffichee.donnees.age_valeur} {ficheAffichee.donnees.age_unite || "ans"}</strong> (Sexe: {ficheAffichee.donnees.sexe})</p>
                        <p>Village : <strong>{ficheAffichee.donnees.village}</strong></p>
                        <p>Parent / Tuteur : <strong>{ficheAffichee.donnees.nom_parent_tuteur || "Non précisé"}</strong></p>
                        <p>Téléphone : <strong>{ficheAffichee.donnees.telephone_contact || "Aucun"}</strong></p>
                        <p>Date : <strong>{ficheAffichee.donnees.date_consultation}</strong></p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 text-xs">Signes Cliniques & Dépistage</h4>
                      <p className="text-slate-700">Signe principal : <strong className="text-slate-900">{ficheAffichee.donnees.signe_principal}</strong></p>
                      {ficheAffichee.donnees.signes_secondaires && ficheAffichee.donnees.signes_secondaires.length > 0 && (
                        <p className="text-slate-600">Signes secondaires : {ficheAffichee.donnees.signes_secondaires.join(", ")}</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-bold">Test TDR Paludisme :</span>
                        <span className={\`px-2.5 py-0.5 rounded-full font-black text-[10px] \${
                          ficheAffichee.donnees.tdr_paludisme === "POSITIF" ? "bg-red-100 text-red-800" : ficheAffichee.donnees.tdr_paludisme === "NEGATIF" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                        }\`}>
                          {ficheAffichee.donnees.tdr_paludisme}
                        </span>
                      </div>
                      <p className="text-slate-700">Diagnostic posé : <strong className="text-slate-900">{ficheAffichee.donnees.diagnostic_possible}</strong></p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 text-xs">Décision Thérapeutique & Conduite</h4>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Décision :</span>
                        <span className={\`px-2.5 py-1 rounded-full font-black text-xs \${
                          ficheAffichee.donnees.decision === "REFERER_CS" ? "bg-red-600 text-white" : "bg-[#005c30] text-white"
                        }\`}>
                          {ficheAffichee.donnees.decision === "REFERER_CS" ? "🚨 Référence Immédiate vers Centre de Santé" : "✅ Prise en charge à domicile / communauté"}
                        </span>
                      </div>
                      {ficheAffichee.donnees.structure_cs_destination && (
                        <p className="text-slate-700">Structure de destination : <strong>{ficheAffichee.donnees.structure_cs_destination}</strong></p>
                      )}
                      {ficheAffichee.donnees.premier_geste_pose && (
                        <p className="text-slate-700">Premier geste posé : <strong>{ficheAffichee.donnees.premier_geste_pose}</strong></p>
                      )}
                      {ficheAffichee.donnees.theme_sensibilisation && (
                        <p className="text-slate-700">Sensibilisation : <strong>{ficheAffichee.donnees.theme_sensibilisation}</strong></p>
                      )}
                      {ficheAffichee.donnees.observations && (
                        <p className="text-slate-600 italic">Observations : "{ficheAffichee.donnees.observations}"</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. FICHE MATERNITE */}
                {ficheAffichee.type === "MATERNITE" && (
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 text-xs">Informations Patiente</h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                        <p>Nom & Prénoms : <strong>{ficheAffichee.donnees.prenoms} {ficheAffichee.donnees.nom}</strong></p>
                        <p>Âge : <strong>{ficheAffichee.donnees.age || "Non précisé"} ans</strong></p>
                        <p>Village : <strong>{ficheAffichee.donnees.village_nom || "-"}</strong></p>
                        <p>Statut Grossesse : <strong className="text-pink-800">{ficheAffichee.donnees.statut_grossesse || "En cours"}</strong></p>
                        <p>Terme actuel : <strong>{ficheAffichee.donnees.terme_sa || "?"} SA</strong></p>
                        <p>Date DPA : <strong>{ficheAffichee.donnees.date_dpa || "Non définie"}</strong></p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 text-xs">Consultations Prénatales & Prévention</h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                        <p>CPN1 : <strong>{ficheAffichee.donnees.date_cpn1 || "Non effectuée"}</strong></p>
                        <p>CPN2 : <strong>{ficheAffichee.donnees.date_cpn2 || "Non effectuée"}</strong></p>
                        <p>CPN3 : <strong>{ficheAffichee.donnees.date_cpn3 || "Non effectuée"}</strong></p>
                        <p>CPN4 : <strong>{ficheAffichee.donnees.date_cpn4 || "Non effectuée"}</strong></p>
                        <p>TPI / SP (Doses) : <strong>{ficheAffichee.donnees.doses_tpi || 0}</strong></p>
                        <p>Supplémentation Enov'Mum : <strong>{ficheAffichee.donnees.enov_mum_recu ? "Reçu" : "Non"}</strong></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. FICHE ENFANT 1000 JOURS */}
                {ficheAffichee.type === "ENFANTS_1000J" && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-slate-900 text-xs">Suivi Nutritionnel & Vaccinal</h4>
                    <p>Enfant : <strong>{ficheAffichee.donnees.prenoms} {ficheAffichee.donnees.nom}</strong></p>
                    <p>Village : <strong>{ficheAffichee.donnees.village_nom || "-"}</strong></p>
                    <p>Périmètre Brachial (PB) : <strong>{ficheAffichee.donnees.perimetre_brachial_mm || "?"} mm</strong></p>
                    <p>Poids mesuré : <strong>{ficheAffichee.donnees.poids_kg ? \`\${ficheAffichee.donnees.poids_kg} kg\` : "Non mesuré"}</strong></p>
                    <p>Statut Vaccinal : <strong>{ficheAffichee.donnees.statut_vaccinal || "Non renseigné"}</strong></p>
                  </div>
                )}

                {/* 4. FICHE REFERENCES */}
                {ficheAffichee.type === "REFERENCES" && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-slate-900 text-xs">Détails de l'Évacuation</h4>
                    <p>Motif de la Référence : <strong className="text-red-700">{ficheAffichee.donnees.motif_reference || "Urgence médicale"}</strong></p>
                    <p>Degré d'Urgence : <strong>{ficheAffichee.donnees.degre_urgence || "Moyenne"}</strong></p>
                    <p>Centre de Santé de Destination : <strong>{ficheAffichee.donnees.centre_sante_destination || "Centre de Santé"}</strong></p>
                    <p>Moyen de Transport : <strong>{ficheAffichee.donnees.moyen_transport || "Non renseigné"}</strong></p>
                    <p>Date : <strong>{ficheAffichee.donnees.date_reference}</strong></p>
                  </div>
                )}

                {/* 5. FICHE ALERTE */}
                {ficheAffichee.type === "ALERTES" && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-purple-900 text-xs">Détails Alerte Épidémiologique</h4>
                    <p>Pathologie / Événement : <strong className="text-purple-900">{ficheAffichee.donnees.type_alerte_nom}</strong></p>
                    <p>Semaine Épidémiologique : <strong>Semaine {ficheAffichee.donnees.semaine_epidemio} / {ficheAffichee.donnees.annee}</strong></p>
                    <p>Alerte Prioritaire : <strong>{ficheAffichee.donnees.est_prioritaire ? "OUI" : "NON"}</strong></p>
                    <p>Statut Investigation : <strong>{ficheAffichee.donnees.investigation_faite ? "Investigation Réalisée" : "Non encore investiguée"}</strong></p>
                    <p>Délai Détection & Notification : <strong>{ficheAffichee.donnees.delai_detection_notification_heures || "?"} heures</strong></p>
                  </div>
                )}

                {/* 6. FICHE DECES */}
                {ficheAffichee.type === "DECES" && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-slate-900 text-xs">Notification de Décès</h4>
                    <p>Type de Décès : <strong className="text-slate-900">{ficheAffichee.donnees.type_deces_nom}</strong></p>
                    <p>Défunt : <strong>{ficheAffichee.donnees.defunt_nom_prenom || "Non précisé"}</strong></p>
                    <p>Village : <strong>{ficheAffichee.donnees.village || "-"}</strong></p>
                    <p>Date Notification : <strong>{ficheAffichee.donnees.date_notification}</strong></p>
                  </div>
                )}

                {/* 7. FICHE RMA */}
                {ficheAffichee.type === "RMA" && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-blue-900 text-xs">Synthèse RMA Mois {ficheAffichee.donnees.mois} / {ficheAffichee.donnees.annee}</h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                      <p>VAD Réalisées : <strong>{ficheAffichee.donnees.total_visites_domiciliaires || 0}</strong></p>
                      <p>Causeries Éducatives : <strong>{ficheAffichee.donnees.total_seances_sensibilisation || 0}</strong></p>
                      <p>Femmes Enceintes Suivies : <strong>{ficheAffichee.donnees.femmes_enceintes_suivies || 0}</strong></p>
                      <p>Enfants 0-59m Suivis : <strong>{ficheAffichee.donnees.enfants_0_59_mois_suivis || 0}</strong></p>
                      <p>Cas Paludisme Pris en charge : <strong>{ficheAffichee.donnees.total_paludisme_confirme || 0}</strong></p>
                      <p>Références Évacuées : <strong>{ficheAffichee.donnees.total_references || 0}</strong></p>
                    </div>
                  </div>
                )}

              </div>

              {/* Pied de la modale */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500 font-bold">
                  🔒 Donnée officielle sous traçabilité
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (ficheAffichee.ascq?.id) {
                        setSuggestionAscqId(ficheAffichee.ascq.id);
                        setSuggestionModule(ficheAffichee.type);
                        setSuggestionTitre(\`Remarque sur \${ficheAffichee.type}\`);
                        setActiveTab("suggestions");
                      }
                      setFicheAffichee(null);
                    }}
                    className="py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>💡 Suggérer une remarque sur cette fiche</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFicheAffichee(null)}
                    className="py-1.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
                  >
                    Fermer
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
`;

const targetBeforeEndMain = `      </main>
    </div>
  );
}`;

if (!content.includes(targetBeforeEndMain)) {
  console.error("targetBeforeEndMain not found!");
  process.exit(1);
}

content = content.replace(targetBeforeEndMain, ficheReaderModalCode + "\n" + targetBeforeEndMain);
console.log("Injected ficheAffichee reader modal successfully.");

fs.writeFileSync(targetFile, content, 'utf8');
