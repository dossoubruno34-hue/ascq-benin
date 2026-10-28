"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import NotificationsModal from "@/components/NotificationsModal";
import NetworkStatusIndicator from "@/components/NetworkStatusIndicator";
import { 
  Home, 
  Users, 
  ArrowLeftRight, 
  MessageSquareText, 
  BookOpen, 
  LogOut, 
  Bell, 
  UserPlus, 
  Activity, 
  Calendar, 
  CheckSquare, 
  ClipboardCheck, 
  FileText, 
  BarChart3, 
  ShieldCheck, 
  HeartPulse, 
  Crown, 
  Stethoscope, 
  Baby,
  Layers,
  Sparkles
} from "lucide-react";

interface Props {
  userProfile?: any;
}

// Rôles autorisés pour l'accès Périmètre de Supervision
const REPRESENTANT_ROLES = [
  "REPRESENTANT_COMMUNAL",
  "REPRESENTANT_DEPARTEMENTAL",
  "PF_CCLS_TP",
  "ADMIN_COMMUNAL",
  "ADMIN_DEPARTEMENTAL",
  "GESTIONNAIRE_PERIMETRE",
  "CADRE_COMMUNAL",
  "CADRE_ZONE_SANITAIRE",
  "CADRE_DEPARTEMENTAL",
  "DDS",
  "CCD_CDLS_TP",
  "CSSPR",
  "CSPSMEMH",
  "MCZS",
  "RCSE",
  "C_RAMS",
  "MCC",
  "SUPER_ADMIN",
  "ADMINISTRATEUR"
];

export default function AscqNav({ userProfile }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [detectedRole, setDetectedRole] = useState<string | null>(
    userProfile?.role_technique || null
  );

  const [filtrePole, setFiltrePole] = useState<string>("TOUS");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/connexion");
  };

  const chargerNonLues = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("lu", false)
        .or(`destinataire_id.eq.${user.id},destinataire_id.is.null`);
      setUnreadCount(count || 0);
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    if (userProfile?.role_technique) {
      setDetectedRole(userProfile.role_technique);
    } else {
      supabase.rpc("obtenir_mon_profil").then(({ data }) => {
        if (data && data.length > 0) {
          setDetectedRole(data[0].role_technique);
        }
      });
    }
    chargerNonLues();
  }, [userProfile]);

  const rolesToCheck = [
    userProfile?.role_nomination,
    userProfile?.role_technique,
    userProfile?.poste,
    detectedRole
  ].filter(Boolean) as string[];

  const isRepresentant = rolesToCheck.some((r) => REPRESENTANT_ROLES.includes(r));
  const isAdmin = rolesToCheck.some((r) => ["SUPER_ADMIN", "ADMINISTRATEUR"].includes(r));

  const obtenirTitrePerimetre = () => {
    if (rolesToCheck.includes("SUPER_ADMIN")) return "Super Admin";
    if (rolesToCheck.includes("ADMINISTRATEUR")) return "Admin National";
    if (rolesToCheck.includes("DDS") || rolesToCheck.includes("REPRESENTANT_DEPARTEMENTAL") || rolesToCheck.includes("CADRE_DEPARTEMENTAL")) return "Cadre Dép.";
    if (rolesToCheck.includes("MCZS") || rolesToCheck.includes("CADRE_ZONE_SANITAIRE") || rolesToCheck.includes("RCSE")) return "Zone Sanitaire";
    if (rolesToCheck.includes("REPRESENTANT_COMMUNAL") || rolesToCheck.includes("MCC") || rolesToCheck.includes("CADRE_COMMUNAL")) return "Représentant Com.";
    if (rolesToCheck.includes("PF_CCLS_TP")) return "PF CCLS-TP";
    return "Périmètre";
  };

  // Pôles d'activités avec liaisons intelligentes
  const POLES = [
    { id: "TOUS", label: "Tous les onglets" },
    { id: "SOINS", label: "🩺 Soins & Maternité" },
    { id: "SURVEILLANCE", label: "🛡️ Surveillance" },
    { id: "TERRAIN", label: "👥 Terrain & RC" },
    { id: "RAPPORTS", label: "📊 Rapports SNIS" },
    { id: "GOUVERNANCE", label: "👑 Gouvernance" },
    { id: "OUTILS", label: "📚 Outils" }
  ];

  const allNavItems = [
    // Accueil & Profil
    { href: "/espace-ascq", label: "Mon espace", icon: Home, pole: "ACCUEIL" },

    // Pôle 1 : Soins & Maternité
    { href: "/espace-ascq/consultations", label: "Prise en charge iCCM", icon: Stethoscope, pole: "SOINS" },
    { href: "/espace-ascq/maternite-enfance", label: "Maternité & 1000 Jours", icon: Baby, pole: "SOINS" },
    { href: "/espace-ascq/references", label: "Références CS/GUPS", icon: HeartPulse, pole: "SOINS" },

    // Pôle 2 : Surveillance & Alertes
    { href: "/briefing", label: "Guide SIMR & Vaccins", icon: BookOpen, pole: "SURVEILLANCE" },
    { href: "/fiches", label: "Fiches Surveillance", icon: Activity, pole: "SURVEILLANCE" },

    // Pôle 3 : Terrain & RC
    { href: "/espace-ascq/planning", label: "Planning", icon: Calendar, pole: "TERRAIN" },
    { href: "/espace-ascq/activites-menees", label: "Activités", icon: CheckSquare, pole: "TERRAIN" },
    { href: "/espace-ascq/suivi-relais", label: "Suivi RC", icon: ClipboardCheck, pole: "TERRAIN" },
    { href: "/espace-ascq/relais", label: "Mes Relais", icon: Users, pole: "TERRAIN" },

    // Pôle 4 : Rapports SNIS
    { href: "/espace-ascq/rapport-hebdo-pnsc", label: "Suivi PNSC", icon: BarChart3, pole: "RAPPORTS" },
    { href: "/espace-ascq/rapport-mensuel", label: "Rapport mensuel", icon: FileText, pole: "RAPPORTS" },

    // Pôle 5 : Périmètre & Gouvernance
    ...(isRepresentant ? [{ href: "/perimetre", label: "Périmètre", icon: Crown, pole: "GOUVERNANCE" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Administration", icon: ShieldCheck, pole: "GOUVERNANCE" }] : []),

    // Pôle 6 : Outils & Ressources
    { href: "/espace-ascq/bibliotheque", label: "Bibliothèque", icon: BookOpen, pole: "OUTILS" },
    { href: "/espace-ascq/permutations", label: "Permutations", icon: ArrowLeftRight, pole: "OUTILS" },
    { href: "/espace-ascq/requetes", label: "Requêtes", icon: MessageSquareText, pole: "OUTILS" }
  ];

  const filteredNavItems = filtrePole === "TOUS" 
    ? allNavItems 
    : allNavItems.filter(item => item.pole === "ACCUEIL" || item.pole === filtrePole);

  return (
    <>
      {/* 1. En-tête officiel vert foncé avec bandeau tricolore */}
      <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md print:hidden">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/espace-ascq" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden group-hover:scale-105 transition-transform border border-emerald-400">
                {userProfile?.photo_url ? (
                  <img
                    src={userProfile.photo_url}
                    alt="Photo"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <Image
                    src="/logo-ascq.png"
                    alt="Logo ASCQ Bénin"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                )}
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                    ASCQ Bénin
                  </h1>
                  {isRepresentant && (
                    <Link
                      href="/perimetre"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 font-black text-[10px] shadow hover:from-amber-300 hover:to-amber-200 transition-all border border-amber-500/40"
                      title="Accéder à votre Espace Périmètre et Supervision Territoriale"
                    >
                      <Crown className="w-3 h-3 text-amber-950 fill-amber-950" />
                      <span>{obtenirTitrePerimetre()}</span>
                    </Link>
                  )}
                </div>
                <p className="text-[11px] text-white/80">
                  {userProfile ? `${userProfile.prenoms} ${userProfile.nom}` : "Espace ASCQ"}
                </p>
              </div>
            </Link>
          </div>

          {/* Actions d'en-tête */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <NetworkStatusIndicator />

            <Link
              href="/espace-ascq/relais"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#005c30] font-bold text-xs shadow hover:bg-emerald-50 active:scale-95 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Enrôler un RC</span>
            </Link>

            <button
              onClick={() => setIsNotifOpen(true)}
              className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bandeau tricolore béninois */}
        <div className="h-1 w-full flex">
          <span className="w-1/3 bg-[#008751]"></span>
          <span className="w-1/3 bg-[#FCD116]"></span>
          <span className="w-1/3 bg-[#E8112D]"></span>
        </div>

        {/* 2. Barre de filtrage intelligent par Pôle d'activité */}
        <div className="bg-[#00381c] border-b border-white/10 overflow-x-auto scrollbar-none px-2 py-1">
          <div className="max-w-4xl mx-auto flex items-center gap-1 min-w-max">
            {POLES.map((pole) => {
              // Masquer l'onglet gouvernance si pas autorisé
              if (pole.id === "GOUVERNANCE" && !isRepresentant && !isAdmin) return null;
              const isSelected = filtrePole === pole.id;
              return (
                <button
                  key={pole.id}
                  onClick={() => setFiltrePole(pole.id)}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
                    isSelected
                      ? "bg-emerald-500 text-white shadow-sm font-black scale-105"
                      : "text-emerald-100/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {pole.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Barre de navigation des onglets du pôle sélectionné */}
        <div className="bg-[#004724] overflow-x-auto scrollbar-none">
          <div className="max-w-4xl mx-auto px-2 flex items-center justify-start sm:justify-center gap-1 py-1.5 min-w-max">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-white text-[#005c30] shadow-sm ring-1 ring-emerald-300"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <NotificationsModal
        isOpen={isNotifOpen}
        onClose={() => {
          setIsNotifOpen(false);
          chargerNonLues();
        }}
        onNotificationsUpdated={chargerNonLues}
      />
    </>
  );
}
