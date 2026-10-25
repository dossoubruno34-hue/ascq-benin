import { HeartHandshake, Sparkles } from "lucide-react";

interface Conseil {
  id: string;
  titre: string;
  contenu: string;
  categorie: string;
  created_at: string;
}

interface ConseilsProps {
  conseils: Conseil[];
}

export default function ConseilsSanteSection({ conseils }: ConseilsProps) {
  // Liste de secours par défaut si la table est vide
  const defaultConseils = [
    {
      id: "1",
      titre: "Prévention du Paludisme en communauté",
      contenu: "Dormez toutes les nuits sous Moustiquaire Imprégnée d'Insecticide (MILDA). Au premier signe de fièvre, rendez-vous immédiatement chez l'ASCQ de votre village pour un test de dépistage rapide (TDR) gratuit.",
      categorie: "Paludisme",
      created_at: "2026-10-25"
    },
    {
      id: "2",
      titre: "Hygiène des mains et eau potable",
      contenu: "Lavez-vous toujours les mains à l'eau propre et au savon avant de cuisiner, avant de nourrir les enfants et en sortant des latrines. Utilisez une eau traitée ou bouillie pour la boisson.",
      categorie: "Hygiène & Eau",
      created_at: "2026-10-25"
    },
    {
      id: "3",
      titre: "Suivi de la vaccination des nourrissons",
      contenu: "Faites vacciner vos enfants selon le calendrier officiel du Bénin dès la naissance. La vaccination protège contre la rougeole, la poliomyélite, la diphtérie et la tuberculose.",
      categorie: "Vaccination",
      created_at: "2026-10-25"
    }
  ];

  const items = conseils && conseils.length > 0 ? conseils : defaultConseils;

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <HeartHandshake className="w-3.5 h-3.5" />
          Espace Conseils Santé
        </span>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Conseils et Bonnes Pratiques Sanitaires
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Recommandations officielles du Ministère de la Santé et des professionnels de santé communautaire du Bénin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((c) => (
          <div
            key={c.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                {c.categorie}
              </span>
              <h3 className="font-bold text-slate-900 text-sm leading-snug">
                {c.titre}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {c.contenu}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Santé Communautaire</span>
              <span>Bénin</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
