export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-4 sm:p-8 max-w-xl mx-auto">
      {/* En-tête avec les couleurs du drapeau béninois */}
      <header className="pt-6 text-center space-y-3">
        <div className="flex justify-center items-center gap-1.5 mb-2">
          <span className="w-4 h-3 bg-[#008751] rounded-sm inline-block shadow-sm"></span>
          <span className="w-4 h-3 bg-[#FCD116] rounded-sm inline-block shadow-sm"></span>
          <span className="w-4 h-3 bg-[#E8112D] rounded-sm inline-block shadow-sm"></span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          ASCQ BÉNIN
        </h1>
        <p className="text-sm font-medium text-slate-600">
          Application officielle des Agents de Santé Communautaire Qualifiés
        </p>
      </header>

      {/* Carte d'état de la Phase 0 */}
      <section className="my-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
            0
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Phase 0 terminée avec succès
            </h2>
            <p className="text-xs text-slate-500">
              Préparation et fondations techniques
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-600">Moteur Node.js</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-xs bg-emerald-50 px-2.5 py-1 rounded-full">
              ✓ Installé (v24)
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-600">Gestionnaire Git</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-xs bg-emerald-50 px-2.5 py-1 rounded-full">
              ✓ Configuré
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-600">Référentiel géographique</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-xs bg-emerald-50 px-2.5 py-1 rounded-full">
              ✓ 546 arrondissements prêts
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600">Dépôt & Sauvegarde</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-xs bg-emerald-50 px-2.5 py-1 rounded-full">
              ✓ Initialisés (main)
            </span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">Prêt pour la Phase 1 :</p>
          <p>Architecture, modèle de données Supabase, géographie et rôles d'accès.</p>
        </div>
      </section>

      {/* Pied de page */}
      <footer className="text-center text-xs text-slate-400 pb-4">
        ASCQ Bénin • Projet initié par Bruno DOSSOU
      </footer>
    </main>
  );
}
