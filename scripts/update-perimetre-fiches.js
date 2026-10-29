const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/app/perimetre/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Mise à jour de la barre d'onglets de gouvernance
const targetTabs = `{/* ONGLETS DE GOUVERNANCE */}
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("dashboard_compile")}
            className={\`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap \${
              activeTab === "dashboard_compile" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
            }\`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Tableau de bord</span>
          </button>

          <button
            onClick={() => setActiveTab("suivi_individuel")}
            className={\`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap \${
              activeTab === "suivi_individuel" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
            }\`}
          >
            <Users className="w-4 h-4" />
            <span>2. ASCQ & RC Territoire</span>
          </button>`;

const newTabs = `{/* ONGLETS DE GOUVERNANCE */}
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("dashboard_compile")}
            className={\`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap \${
              activeTab === "dashboard_compile" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
            }\`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Tableau de bord</span>
          </button>

          <button
            onClick={() => setActiveTab("suivi_individuel")}
            className={\`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap \${
              activeTab === "suivi_individuel" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
            }\`}
          >
            <Users className="w-4 h-4" />
            <span>2. ASCQ & RC Territoire</span>
          </button>

          <button
            onClick={() => setActiveTab("fiches_territoire")}
            className={\`flex-1 py-2.5 px-2 text-center rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap \${
              activeTab === "fiches_territoire" ? "bg-[#e0f2e9] text-[#005c30] shadow-sm font-black" : "hover:text-slate-900"
            }\`}
          >
            <ClipboardList className="w-4 h-4 text-emerald-700" />
            <span>3. Fiches & Données ASCQ</span>
          </button>`;

if (!content.includes(targetTabs)) {
  console.error("targetTabs not found!");
  process.exit(1);
}

content = content.replace(targetTabs, newTabs);
console.log("Updated Tabs in header successfully.");

fs.writeFileSync(targetFile, content, 'utf8');
