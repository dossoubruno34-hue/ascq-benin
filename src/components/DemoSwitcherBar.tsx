"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Crown,
  Building2,
  Users,
  ShieldCheck,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  LogOut,
  MapPin,
  Eye,
  Info
} from "lucide-react";
import {
  DEMO_PROFILES,
  DemoProfile,
  isDemoModeActive,
  getActiveDemoProfile,
  activateDemoProfile,
  deactivateDemoMode,
  DEMO_STORAGE_KEYS
} from "@/lib/demo-mode";

export default function DemoSwitcherBar() {
  const router = useRouter();
  const pathname = usePathname();

  const [activeProfile, setActiveProfile] = useState<DemoProfile | null>(null);
  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronisation au montage et lors des changements d'URL
  useEffect(() => {
    const active = isDemoModeActive();
    setIsDemoActive(active);
    if (active) {
      setActiveProfile(getActiveDemoProfile());
    }
    try {
      const collapsed = localStorage.getItem(DEMO_STORAGE_KEYS.COLLAPSED_BANNER) === "true";
      setIsCollapsed(collapsed);
    } catch {
      // Ignore
    }
  }, [pathname]);

  const handleSelectProfile = (profileId: string) => {
    const profile = activateDemoProfile(profileId);
    setActiveProfile(profile);
    setIsDemoActive(true);
    setIsModalOpen(false);

    setToastMessage(`Profil activé : ${profile.prenoms} ${profile.nom} (${profile.titre_affiche})`);
    setTimeout(() => setToastMessage(null), 3500);

    // Rediriger vers la page cible du profil et forcer le rafraîchissement
    if (pathname !== profile.target_url) {
      router.push(profile.target_url);
    } else {
      window.location.reload();
    }
  };

  const handleQuitDemo = () => {
    deactivateDemoMode();
    setIsDemoActive(false);
    setActiveProfile(null);
    setIsModalOpen(false);

    setToastMessage("Mode Démo désactivé. Retour au compte officiel Bruno DOSSOU.");
    setTimeout(() => setToastMessage(null), 3000);

    // Revenir sur l'espace ASCQ de Bruno
    router.push("/espace-ascq");
    setTimeout(() => window.location.reload(), 200);
  };

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    try {
      localStorage.setItem(DEMO_STORAGE_KEYS.COLLAPSED_BANNER, String(nextState));
    } catch {
      // Ignore
    }
  };

  // Ne pas afficher si le mode démo n'est pas actif ET qu'on est sur une page publique non démo
  // MAIS fournir un bouton discret pour lancer la démo à tout moment !
  if (!isDemoActive) {
    return (
      <>
        {/* Bouton discret flottant pour lancer la démo du Bureau National */}
        <div className="fixed bottom-4 right-4 z-50 print:hidden">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r from-emerald-800 to-emerald-950 text-white font-bold text-xs shadow-xl border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all group"
            title="Lancer la démonstration Bureau National"
          >
            <span className="text-base">🇧🇯</span>
            <span className="hidden sm:inline">Mode Démo Bureau National</span>
            <span className="sm:hidden">Démo</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
          </button>
        </div>

        {/* Modal de sélection de profil */}
        {isModalOpen && (
          <DemoProfileModal
            onClose={() => setIsModalOpen(false)}
            onSelect={handleSelectProfile}
            onQuit={handleQuitDemo}
            activeProfileId={null}
          />
        )}
      </>
    );
  }

  // Si le bandeau est réduit (pour la projection grand écran)
  if (isCollapsed) {
    return (
      <>
        <div className="fixed top-2 right-2 z-50 print:hidden flex items-center gap-1.5 bg-slate-900/90 text-white px-3 py-1.5 rounded-full shadow-lg border border-emerald-500/50 backdrop-blur-sm">
          <span className="text-sm">🇧🇯</span>
          <span className="text-xs font-bold text-amber-300 truncate max-w-[150px]">
            {activeProfile?.titre_affiche || "Mode Démo"}
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white"
            title="Changer de rôle"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleCollapse}
            className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white"
            title="Agrandir le bandeau"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {isModalOpen && (
          <DemoProfileModal
            onClose={() => setIsModalOpen(false)}
            onSelect={handleSelectProfile}
            onQuit={handleQuitDemo}
            activeProfileId={activeProfile?.id || null}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Toast de confirmation */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-400 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Bandeau principal officiel de démo */}
      <div className="bg-gradient-to-r from-slate-950 via-[#00381d] to-slate-950 text-white text-xs sticky top-0 z-40 border-b border-amber-500/40 shadow-xl print:hidden">
        <div className="max-w-7xl mx-auto px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          {/* Logo & Titre Démo */}
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg">🇧🇯</span>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold uppercase tracking-wide text-amber-400 text-[10px] sm:text-xs">
                  DÉMO BUREAU NATIONAL
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded text-[10px] font-bold">
                  SIMULATION OFFICIELLE
                </span>
              </div>
              <p className="text-[11px] text-slate-300 hidden sm:block">
                Rôle actif : <strong className="text-white">{activeProfile?.prenoms} {activeProfile?.nom}</strong> ({activeProfile?.titre_affiche})
              </p>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {/* Bouton de sélection de rôle */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-950" />
              <span>Changer de Rôle (1-Clic)</span>
              <ChevronDown className="w-3 h-3 text-slate-950" />
            </button>

            {/* Bouton Quitter Démo / Mode Réel Bruno */}
            <button
              onClick={handleQuitDemo}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-colors border border-slate-700"
              title="Désactiver la démo et revenir au profil réel Bruno DOSSOU"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden md:inline">Mode Réel</span>
            </button>

            {/* Bouton Réduire */}
            <button
              onClick={toggleCollapse}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Réduire le bandeau pour la projection"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modale de sélection des rôles */}
      {isModalOpen && (
        <DemoProfileModal
          onClose={() => setIsModalOpen(false)}
          onSelect={handleSelectProfile}
          onQuit={handleQuitDemo}
          activeProfileId={activeProfile?.id || null}
        />
      )}
    </>
  );
}

// -----------------------------------------------------------------------------------------
// MODALE INTERACTIVE DE SÉLECTION DU RÔLE
// -----------------------------------------------------------------------------------------

interface ModalProps {
  onClose: () => void;
  onSelect: (id: string) => void;
  onQuit: () => void;
  activeProfileId: string | null;
}

function DemoProfileModal({ onClose, onSelect, onQuit, activeProfileId }: ModalProps) {
  // Regroupement des profils par catégorie
  const categories = [
    {
      id: "NATIONAL",
      titre: "🏛️ Niveau 1 : National & Présidence du Bureau",
      desc: "Supervision souveraine sur l'ensemble de la République du Bénin (12 départements, 77 communes)",
      color: "border-amber-500 bg-amber-500/10",
      badgeColor: "bg-amber-400 text-slate-950 font-black",
    },
    {
      id: "DEPARTEMENTAL",
      titre: "🏢 Niveau 2 : Départemental (Département du Zou)",
      desc: "Coordination des 9 communes du Zou (Ouinhi, Bohicon, Abomey, Covè, Zagnanado, etc.)",
      color: "border-blue-500 bg-blue-500/10",
      badgeColor: "bg-blue-600 text-white font-bold",
    },
    {
      id: "ZONE_SANITAIRE",
      titre: "🏥 Niveau 3 : Zone Sanitaire (CZO : Covè - Zagnanado - Ouinhi)",
      desc: "Gestion logistique, approvisionnement RAMS et surveillance épidémiologique de zone",
      color: "border-purple-500 bg-purple-500/10",
      badgeColor: "bg-purple-600 text-white font-bold",
    },
    {
      id: "COMMUNAL",
      titre: "🏛️ Niveau 4 : Communal (Commune de Ouinhi)",
      desc: "Consolidation Tohouès + Dasso (14 RC), arbitrage RMA communal et validation médicale MCC",
      color: "border-emerald-500 bg-emerald-500/10",
      badgeColor: "bg-emerald-600 text-white font-bold",
    },
    {
      id: "TERRAIN_ASCQ",
      titre: "🩺 Niveau 5 : Espace Terrain ASCQ & Relais Communautaires",
      desc: "Consultations iCCM, maternité, alertes SIMR, suivi direct des Relais de Tohouès, Dasso et Littoral",
      color: "border-teal-500 bg-teal-500/10",
      badgeColor: "bg-teal-600 text-white font-bold",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* En-tête de la modale */}
        <div className="bg-[#005c30] text-white p-4 sm:p-5 flex items-center justify-between border-b border-emerald-600 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇧🇯</span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Sélecteur de Rôle Immédiat (Présentation Officielle)</span>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  1-Clic
                </span>
              </h2>
              <p className="text-xs text-emerald-100">
                Basculez instantanément sans mot de passe devant le Bureau National pour convaincre sur tous les niveaux !
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps avec les groupes de profils */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 divide-y divide-slate-100">
          {categories.map((cat) => {
            const profilsCat = DEMO_PROFILES.filter((p) => p.categorie === cat.id);
            if (profilsCat.length === 0) return null;

            return (
              <div key={cat.id} className="pt-4 first:pt-0 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <span>{cat.titre}</span>
                    </h3>
                    <p className="text-xs text-slate-500">{cat.desc}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {profilsCat.map((profile) => {
                    const isSelected = activeProfileId === profile.id;

                    return (
                      <div
                        key={profile.id}
                        onClick={() => onSelect(profile.id)}
                        className={`group relative p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500 shadow-md"
                            : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-800 transition-colors">
                                {profile.prenoms} {profile.nom}
                              </span>
                              {isSelected && (
                                <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Actif
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                              <span>{profile.titre_affiche}</span>
                            </p>

                            <p className="text-[11px] text-slate-500 line-clamp-2">
                              {profile.niveau_description}
                            </p>

                            <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {profile.arrondissement_nom || profile.commune_nom || profile.departement_nom || "National (Bénin)"}
                              </span>
                              <span>•</span>
                              <span>Tél : {profile.telephone}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`shrink-0 p-2 rounded-lg font-bold text-xs transition-all ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-700"
                            }`}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pied de page de la modale */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Les données affichées dans chaque rôle sont complètes, prêtes pour la démonstration et sécurisées.
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onQuit}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200 font-semibold text-xs transition-colors"
            >
              Quitter la Démo (Compte Réel Bruno)
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
