const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/app/perimetre/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Nouvelle Modale Sub-Tabs pour selectedAscq
const oldModalContentTarget = `                  {/* Contenu */}
                  <div className="p-5 overflow-y-auto space-y-4 text-xs">
                    {loadingDossier ? (
                      <div className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30] mb-2" />
                        Chargement du dossier complet de l'ASCQ...
                      </div>
                    ) : (
                      <>
                        {/* Section 1 : Rapports Mensuels (RMA) */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <h4 className="font-bold text-slate-900 flex items-center justify-between">
                            <span>📊 Rapports Mensuels d'Activités (RMA)</span>
                            <span className="text-[10px] text-slate-500">{dossierAscq.rma.length} trouvés</span>
                          </h4>
                          {dossierAscq.rma.length === 0 ? (
                            <p className="text-slate-400 text-[11px]">Aucun rapport mensuel déposé.</p>
                          ) : (
                            <div className="space-y-2">
                              {dossierAscq.rma.map((r: any) => (
                                <div key={r.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-slate-900">Mois {r.mois} / {r.annee}</span>
                                      <span className={\`px-2 py-0.5 rounded-full text-[10px] font-bold \${
                                        r.statut === "VALIDE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                                      }\`}>
                                        {r.statut === "VALIDE" ? "✅ Validé" : "⏳ En attente de validation"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      Déposé le {new Date(r.created_at).toLocaleDateString("fr-FR")}
                                      {r.date_validation && \` • Validé le \${new Date(r.date_validation).toLocaleDateString("fr-FR")}\`}
                                    </p>
                                    <div className="text-[10px] text-slate-600 mt-1 flex flex-wrap gap-2">
                                      <span>VAD : <strong>{r.total_visites_domiciliaires || 0}</strong></span>
                                      <span>Causeries : <strong>{r.total_seances_sensibilisation || 0}</strong></span>
                                      <span>Femmes suivies : <strong>{r.femmes_enceintes_suivies || 0}</strong></span>
                                      <span>Enfants : <strong>{r.enfants_0_59_mois_suivis || 0}</strong></span>
                                    </div>
                                  </div>

                                  {isRepresentantCommunal && (
                                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                      {r.statut !== "VALIDE" && (
                                        <button
                                          type="button"
                                          disabled={actionInProgress === r.id}
                                          onClick={() => handleValiderRma(r.id)}
                                          className="py-1.5 px-3 rounded-lg bg-[#005c30] hover:bg-[#004724] text-white font-bold text-[11px] flex items-center gap-1 transition-all"
                                        >
                                          {actionInProgress === r.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                          <span>Valider RMA</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setEditingRma(r)}
                                        className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all"
                                      >
                                        Modifier / Corriger
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section 2 : Rapports Hebdomadaires PNSC */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <h4 className="font-bold text-slate-900 flex items-center justify-between">
                            <span>📋 Rapports Hebdomadaires PNSC</span>
                            <span className="text-[10px] text-slate-500">{dossierAscq.hebdo.length} trouvés</span>
                          </h4>
                          {dossierAscq.hebdo.length === 0 ? (
                            <p className="text-slate-400 text-[11px]">Aucun rapport hebdomadaire PNSC déposé.</p>
                          ) : (
                            <div className="space-y-2">
                              {dossierAscq.hebdo.map((h: any) => (
                                <div key={h.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900">Semaine {h.semaine} / {h.annee}</span>
                                      <span className={\`px-2 py-0.5 rounded-full text-[10px] font-bold \${
                                        h.statut === "VALIDE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                                      }\`}>
                                        {h.statut === "VALIDE" ? "✅ Validé" : "⏳ Soumis"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      GAP RH : <strong>{h.rh_gap ?? 0}</strong> • GAP Moto : <strong>{h.motos_gap ?? 0}</strong> • Forfait : <strong>{h.forfait_internet_recu ? "Reçu" : "Non reçu"}</strong>
                                    </p>
                                    {h.activites_realisees && (
                                      <p className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">
                                        Activité : {h.activites_realisees}
                                      </p>
                                    )}
                                  </div>

                                  {isRepresentantCommunal && h.statut !== "VALIDE" && (
                                    <button
                                      type="button"
                                      disabled={actionInProgress === h.id}
                                      onClick={() => handleValiderHebdoPnsc(h.id)}
                                      className="py-1.5 px-3 rounded-lg bg-[#005c30] hover:bg-[#004724] text-white font-bold text-[11px] flex items-center gap-1 self-end sm:self-auto shrink-0 transition-all"
                                    >
                                      {actionInProgress === h.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                      <span>Valider Hebdo</span>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section 3 : Plannings et Activités */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <h4 className="font-bold text-slate-900 flex items-center justify-between">
                            <span>📅 Plannings & Activités menées</span>
                            <span className="text-[10px] text-slate-500">{dossierAscq.activites.length} activités</span>
                          </h4>
                          {dossierAscq.activites.length === 0 ? (
                            <p className="text-slate-400 text-[11px]">Aucune activité enregistrée récemment.</p>
                          ) : (
                            <div className="space-y-1">
                              {dossierAscq.activites.slice(0, 5).map((a: any) => (
                                <div key={a.id} className="p-2 bg-white rounded-xl border border-slate-200/60 flex items-center justify-between">
                                  <span className="font-bold">{a.titre_activite}</span>
                                  <span className="text-slate-500">{a.date_activite}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section 4 : Alertes Épidémiologiques Notifiées */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <h4 className="font-bold text-slate-900 flex items-center justify-between">
                            <span>🚨 Alertes épidémiologiques notifiées</span>
                            <span className="text-[10px] text-slate-500">{dossierAscq.alertes.length} alertes</span>
                          </h4>
                          {dossierAscq.alertes.length === 0 ? (
                            <p className="text-slate-400 text-[11px]">Aucune alerte signalée par cet agent.</p>
                          ) : (
                            <div className="space-y-1">
                              {dossierAscq.alertes.map((al: any) => (
                                <div key={al.id} className="p-2 bg-white rounded-xl border border-slate-200/60 flex items-center justify-between">
                                  <span className="font-bold text-slate-800">{al.type_alerte_nom}</span>
                                  <span className="text-emerald-700 font-bold">{al.date_notification} (Sem. {al.semaine_epidemio})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Section 5 : Relais Communautaires (RC) rattachés */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <h4 className="font-bold text-slate-900 flex items-center justify-between">
                            <span>👥 Relais Communautaires (RC) rattachés</span>
                            <span className="text-[10px] text-slate-500">{dossierAscq.relais.length} RC déclarés</span>
                          </h4>
                          {dossierAscq.relais.length === 0 ? (
                            <p className="text-slate-400 text-[11px]">Aucun RC rattaché à cet ASCQ.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {dossierAscq.relais.map((rc: any) => (
                                <div key={rc.id} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm text-xs">
                                  <p className="font-bold text-slate-900">{rc.nom} {rc.prenoms}</p>
                                  <p className="text-[11px] text-slate-500">Village : <strong>{rc.village_nom || "Non affecté"}</strong> • Tél : {rc.telephone}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section 6 : Suivi Maternité & 1000 Jours */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <h4 className="font-bold text-slate-900 flex items-center justify-between">
                            <span>👶 Femmes enceintes & 1 000 Jours suivies</span>
                            <span className="text-[10px] text-slate-500">{dossierAscq.femmes.length} cas récents</span>
                          </h4>
                          {dossierAscq.femmes.length === 0 ? (
                            <p className="text-slate-400 text-[11px]">Aucune fiche maternité enregistrée.</p>
                          ) : (
                            <div className="space-y-1">
                              {dossierAscq.femmes.map((f: any) => (
                                <div key={f.id} className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-bold text-slate-900">{f.nom} {f.prenoms}</span>
                                    <span className="text-[10px] text-slate-500 ml-2">Village : {f.village_nom}</span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                    {f.statut_grossesse || "EN COURS"} {f.terme_sa ? \`(\${f.terme_sa} SA)\` : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>`;

const newModalContent = `                  {/* Barre de navigation des sous-onglets 360° */}
                  <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center gap-1 overflow-x-auto scrollbar-none text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDossierSubTab("ICCM")}
                      className={\`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 \${
                        dossierSubTab === "ICCM" ? "bg-emerald-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }\`}
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Soins iCCM ({dossierAscq.consultations.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierSubTab("MATERNITE")}
                      className={\`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 \${
                        dossierSubTab === "MATERNITE" ? "bg-pink-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }\`}
                    >
                      <Baby className="w-3.5 h-3.5" />
                      <span>Maternité & 1000J ({dossierAscq.femmes.length + dossierAscq.enfants.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierSubTab("REFERENCES")}
                      className={\`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 \${
                        dossierSubTab === "REFERENCES" ? "bg-red-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }\`}
                    >
                      <HeartPulse className="w-3.5 h-3.5" />
                      <span>Références ({dossierAscq.references.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierSubTab("RAPPORTS")}
                      className={\`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 \${
                        dossierSubTab === "RAPPORTS" ? "bg-blue-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }\`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Rapports ({dossierAscq.rma.length + dossierAscq.hebdo.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierSubTab("SIMR")}
                      className={\`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 \${
                        dossierSubTab === "SIMR" ? "bg-purple-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }\`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Alertes & Décès ({dossierAscq.alertes.length + dossierAscq.deces.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierSubTab("RELAIS")}
                      className={\`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 \${
                        dossierSubTab === "RELAIS" ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }\`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Relais RC ({dossierAscq.relais.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierSubTab("PLANNING")}
                      className={\`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 \${
                        dossierSubTab === "PLANNING" ? "bg-amber-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }\`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Activités ({dossierAscq.activites.length})</span>
                    </button>
                  </div>

                  {/* Contenu filtré par sous-onglet */}
                  <div className="p-5 overflow-y-auto space-y-3 text-xs max-h-[60vh]">
                    {loadingDossier ? (
                      <div className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005c30] mb-2" />
                        Chargement des fiches et données complètes de l'agent...
                      </div>
                    ) : (
                      <>
                        {/* 1. SOUS-ONGLET : SOINS iCCM */}
                        {dossierSubTab === "ICCM" && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between pb-1">
                              <h4 className="font-extrabold text-slate-900 text-xs">🩺 Consultations et Soins Communautaires iCCM</h4>
                              <span className="text-[10px] text-slate-500">{dossierAscq.consultations.length} fiches enregistrées</span>
                            </div>

                            {dossierAscq.consultations.length === 0 ? (
                              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 text-slate-400">
                                Aucune consultation enregistrée par cet agent.
                              </div>
                            ) : (
                              dossierAscq.consultations.map((c: any) => (
                                <div key={c.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-black text-slate-900 text-sm">{c.prenoms_patient} {c.nom_patient}</span>
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                          {c.age_valeur} {c.age_unite || "ans"} • Sexe: {c.sexe}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5">
                                        Village : <strong>{c.village}</strong> • Date : {c.date_consultation || new Date(c.created_at).toLocaleDateString("fr-FR")}
                                      </p>
                                    </div>

                                    <span className={\`px-2.5 py-1 rounded-full text-[10px] font-black \${
                                      c.decision === "REFERER_CS" ? "bg-red-100 text-red-800 border border-red-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    }\`}>
                                      {c.decision === "REFERER_CS" ? "🚨 Référé vers CS" : "✅ PEC Communautaire"}
                                    </span>
                                  </div>

                                  <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 border border-slate-100">
                                    <div>
                                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Signe Principal & Diagnostic</span>
                                      <p className="font-bold text-slate-900">{c.signe_principal || "Non spécifié"}</p>
                                      <p className="text-slate-600 text-[10px]">Diag : {c.diagnostic_possible || "iCCM"}</p>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Test TDR Paludisme</span>
                                      <p className={\`font-black text-[11px] \${
                                        c.tdr_paludisme === "POSITIF" ? "text-red-700" : c.tdr_paludisme === "NEGATIF" ? "text-emerald-700" : "text-slate-500"
                                      }\`}>
                                        TDR : {c.tdr_paludisme}
                                      </p>
                                      {c.structure_cs_destination && (
                                        <p className="text-slate-600 text-[10px]">Vers : {c.structure_cs_destination}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setFicheAffichee({ type: "ICCM", donnees: c, ascq: selectedAscq })}
                                      className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#005c30] font-bold text-[11px] flex items-center gap-1 transition-all"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Consulter la fiche complète</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSuggestionAscqId(selectedAscq.id);
                                        setSuggestionModule("ICCM");
                                        setSuggestionTitre(\`Observation Fiche Consultation \${c.prenoms_patient} \${c.nom_patient}\`);
                                        setActiveTab("suggestions");
                                        setSelectedAscq(null);
                                      }}
                                      className="py-1 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] flex items-center gap-1 transition-all"
                                    >
                                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Remarque</span>
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {/* 2. SOUS-ONGLET : MATERNITÉ & 1000 PREMIERS JOURS */}
                        {dossierSubTab === "MATERNITE" && (
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-extrabold text-pink-900 text-xs mb-2">🤰 Femmes Enceintes Suivies ({dossierAscq.femmes.length})</h4>
                              {dossierAscq.femmes.length === 0 ? (
                                <p className="text-slate-400 text-[11px] bg-slate-50 p-4 rounded-xl text-center">Aucune femme enceinte suivie enregistrée.</p>
                              ) : (
                                <div className="space-y-2">
                                  {dossierAscq.femmes.map((f: any) => (
                                    <div key={f.id} className="p-3 bg-white rounded-2xl border border-pink-100 shadow-sm flex items-center justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900">{f.prenoms} {f.nom}</span>
                                          <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 text-[10px] font-bold">
                                            {f.statut_grossesse || "En cours"} {f.terme_sa ? \`(\${f.terme_sa} SA)\` : ""}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                          Village : {f.village_nom || "-"} • DPA : {f.date_dpa || "Non définie"}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => setFicheAffichee({ type: "MATERNITE", donnees: f, ascq: selectedAscq })}
                                          className="p-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-800 font-bold"
                                          title="Voir détails"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSuggestionAscqId(selectedAscq.id);
                                            setSuggestionModule("MATERNITE");
                                            setSuggestionTitre(\`Remarque Suivi Grossesse \${f.prenoms} \${f.nom}\`);
                                            setActiveTab("suggestions");
                                            setSelectedAscq(null);
                                          }}
                                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold"
                                          title="Suggérer correction"
                                        >
                                          <Sparkles className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                              <h4 className="font-extrabold text-amber-900 text-xs mb-2">👶 Enfants 1000 Premiers Jours & Nutrition ({dossierAscq.enfants.length})</h4>
                              {dossierAscq.enfants.length === 0 ? (
                                <p className="text-slate-400 text-[11px] bg-slate-50 p-4 rounded-xl text-center">Aucun suivi enfant 1000 jours enregistré.</p>
                              ) : (
                                <div className="space-y-2">
                                  {dossierAscq.enfants.map((enf: any) => (
                                    <div key={enf.id} className="p-3 bg-white rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900">{enf.prenoms} {enf.nom}</span>
                                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                            PB: {enf.perimetre_brachial_mm || "?"} mm
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                          Village : {enf.village_nom || "-"} • Vaccins : {enf.statut_vaccinal || "Non renseigné"}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setFicheAffichee({ type: "ENFANTS_1000J", donnees: enf, ascq: selectedAscq })}
                                        className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 3. SOUS-ONGLET : RÉFÉRENCES CS & GUPS */}
                        {dossierSubTab === "REFERENCES" && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between pb-1">
                              <h4 className="font-extrabold text-slate-900 text-xs">🚑 Références & Évacuations vers CS / GUPS</h4>
                              <span className="text-[10px] text-slate-500">{dossierAscq.references.length} références</span>
                            </div>
                            {dossierAscq.references.length === 0 ? (
                              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 text-slate-400">
                                Aucune évacuation ou référence enregistrée.
                              </div>
                            ) : (
                              dossierAscq.references.map((r: any) => (
                                <div key={r.id} className="p-3 bg-white rounded-2xl border border-red-100 shadow-sm flex items-center justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-slate-900">{r.motif_reference || "Urgence médicale"}</span>
                                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                                        Urgence : {r.degre_urgence || "Moyenne"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      Destination : <strong>{r.centre_sante_destination || "Centre de Santé"}</strong> • Date : {r.date_reference || new Date(r.created_at).toLocaleDateString("fr-FR")}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setFicheAffichee({ type: "REFERENCES", donnees: r, ascq: selectedAscq })}
                                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 font-bold"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {/* 4. SOUS-ONGLET : RAPPORTS RMA & PNSC */}
                        {dossierSubTab === "RAPPORTS" && (
                          <div className="space-y-3">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                              <h4 className="font-bold text-slate-900 flex items-center justify-between">
                                <span>📊 Rapports Mensuels d'Activités (RMA)</span>
                                <span className="text-[10px] text-slate-500">{dossierAscq.rma.length} trouvés</span>
                              </h4>
                              {dossierAscq.rma.length === 0 ? (
                                <p className="text-slate-400 text-[11px]">Aucun rapport mensuel déposé.</p>
                              ) : (
                                <div className="space-y-2">
                                  {dossierAscq.rma.map((r: any) => (
                                    <div key={r.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-extrabold text-slate-900">Mois {r.mois} / {r.annee}</span>
                                          <span className={\`px-2 py-0.5 rounded-full text-[10px] font-bold \${
                                            r.statut === "VALIDE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                                          }\`}>
                                            {r.statut === "VALIDE" ? "✅ Validé" : "⏳ En attente de validation"}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                          Déposé le {new Date(r.created_at).toLocaleDateString("fr-FR")}
                                          {r.date_validation && \` • Validé le \${new Date(r.date_validation).toLocaleDateString("fr-FR")}\`}
                                        </p>
                                        <div className="text-[10px] text-slate-600 mt-1 flex flex-wrap gap-2">
                                          <span>VAD : <strong>{r.total_visites_domiciliaires || 0}</strong></span>
                                          <span>Causeries : <strong>{r.total_seances_sensibilisation || 0}</strong></span>
                                          <span>Femmes : <strong>{r.femmes_enceintes_suivies || 0}</strong></span>
                                          <span>Enfants : <strong>{r.enfants_0_59_mois_suivis || 0}</strong></span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => setFicheAffichee({ type: "RMA", donnees: r, ascq: selectedAscq })}
                                          className="py-1 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[11px] flex items-center gap-1"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>Consulter</span>
                                        </button>

                                        {isRepresentantCommunal && (
                                          <>
                                            {r.statut !== "VALIDE" && (
                                              <button
                                                type="button"
                                                disabled={actionInProgress === r.id}
                                                onClick={() => handleValiderRma(r.id)}
                                                className="py-1 px-2 rounded-lg bg-[#005c30] hover:bg-[#004724] text-white font-bold text-[11px] flex items-center gap-1 transition-all"
                                              >
                                                {actionInProgress === r.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                                <span>Valider</span>
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => setEditingRma(r)}
                                              className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all"
                                            >
                                              Modifier
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                              <h4 className="font-bold text-slate-900 flex items-center justify-between">
                                <span>📋 Rapports Hebdomadaires PNSC</span>
                                <span className="text-[10px] text-slate-500">{dossierAscq.hebdo.length} trouvés</span>
                              </h4>
                              {dossierAscq.hebdo.length === 0 ? (
                                <p className="text-slate-400 text-[11px]">Aucun rapport hebdomadaire PNSC déposé.</p>
                              ) : (
                                <div className="space-y-2">
                                  {dossierAscq.hebdo.map((h: any) => (
                                    <div key={h.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900">Semaine {h.semaine} / {h.annee}</span>
                                          <span className={\`px-2 py-0.5 rounded-full text-[10px] font-bold \${
                                            h.statut === "VALIDE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                                          }\`}>
                                            {h.statut === "VALIDE" ? "✅ Validé" : "⏳ Soumis"}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                          GAP RH : <strong>{h.rh_gap ?? 0}</strong> • Moto : <strong>{h.motos_gap ?? 0}</strong> • Forfait : <strong>{h.forfait_internet_recu ? "Reçu" : "Non reçu"}</strong>
                                        </p>
                                      </div>

                                      {isRepresentantCommunal && h.statut !== "VALIDE" && (
                                        <button
                                          type="button"
                                          disabled={actionInProgress === h.id}
                                          onClick={() => handleValiderHebdoPnsc(h.id)}
                                          className="py-1 px-2.5 rounded-lg bg-[#005c30] hover:bg-[#004724] text-white font-bold text-[11px] flex items-center gap-1 self-end sm:self-auto shrink-0 transition-all"
                                        >
                                          {actionInProgress === h.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                          <span>Valider</span>
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 5. SOUS-ONGLET : ALERTES SIMR & DÉCÈS */}
                        {dossierSubTab === "SIMR" && (
                          <div className="space-y-2">
                            <h4 className="font-extrabold text-slate-900 text-xs">🚨 Alertes Épidémiologiques & Décès Communautaires</h4>
                            {dossierAscq.alertes.length === 0 && dossierAscq.deces.length === 0 ? (
                              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                                Aucune alerte ni aucun décès notifié par cet agent.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {dossierAscq.alertes.map((al: any) => (
                                  <div key={al.id} className="p-3 bg-white rounded-xl border border-purple-100 shadow-sm flex items-center justify-between">
                                    <div>
                                      <span className="font-bold text-slate-900">{al.type_alerte_nom} (Sem. {al.semaine_epidemio})</span>
                                      <p className="text-[10px] text-slate-500">Notifié le {al.date_notification} • Délai: {al.delai_detection_notification_heures}h</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setFicheAffichee({ type: "ALERTES", donnees: al, ascq: selectedAscq })}
                                      className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}

                                {dossierAscq.deces.map((d: any) => (
                                  <div key={d.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div>
                                      <span className="font-bold text-slate-900">{d.type_deces_nom} ({d.village || "-"})</span>
                                      <p className="text-[10px] text-slate-500">Défunt : {d.defunt_nom_prenom || "Non précisé"} • Date: {d.date_notification}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setFicheAffichee({ type: "DECES", donnees: d, ascq: selectedAscq })}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 6. SOUS-ONGLET : RELAIS COMMUNAUTAIRES */}
                        {dossierSubTab === "RELAIS" && (
                          <div className="space-y-2">
                            <h4 className="font-extrabold text-slate-900 text-xs">👥 Relais Communautaires (RC) sous la responsabilité de cet ASCQ</h4>
                            {dossierAscq.relais.length === 0 ? (
                              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                                Aucun Relais Communautaire enrôlé.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {dossierAscq.relais.map((rc: any) => (
                                  <div key={rc.id} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
                                    <p className="font-black text-slate-900">{rc.nom} {rc.prenoms}</p>
                                    <p className="text-[11px] text-slate-500">Village : <strong>{rc.village_nom || "Non affecté"}</strong></p>
                                    <p className="text-[11px] text-slate-500">Tél : {rc.telephone}</p>
                                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                      Enrôlé & Actif
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 7. SOUS-ONGLET : PLANNINGS & ACTIVITÉS */}
                        {dossierSubTab === "PLANNING" && (
                          <div className="space-y-2">
                            <h4 className="font-extrabold text-slate-900 text-xs">📅 Activités Menées et Plannings de l'ASCQ</h4>
                            {dossierAscq.activites.length === 0 ? (
                              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                                Aucune activité enregistrée.
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {dossierAscq.activites.map((a: any) => (
                                  <div key={a.id} className="p-2.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between">
                                    <div>
                                      <span className="font-bold text-slate-900">{a.titre_activite}</span>
                                      <p className="text-[10px] text-slate-500">Date : {a.date_activite} • Type : {a.type_activite || "Terrain"}</p>
                                    </div>
                                    <span className="text-slate-400 text-[10px] font-bold">Enregistré</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>`;

if (!content.includes(oldModalContentTarget)) {
  console.error("oldModalContentTarget not found!");
  process.exit(1);
}

content = content.replace(oldModalContentTarget, newModalContent);
console.log("Updated 360 modal sub-tabs successfully.");

fs.writeFileSync(targetFile, content, 'utf8');
