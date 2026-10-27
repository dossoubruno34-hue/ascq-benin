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
  User,
  Activity,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  FileText,
  ShieldCheck
} from "lucide-react";

interface Props {
  userProfile?: any;
}

export default function AscqNav({ userProfile }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [detectedRole, setDetectedRole] = useState<string | null>(
    userProfile?.role_technique || null
  );

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

  const isAdmin = [
    "SUPER_ADMIN",
    "ADMINISTRATEUR",
    "GESTIONNAIRE_PERIMETRE",
    "ADMIN_COMMUNAL",
    "ADMIN_DEPARTEMENTAL"
  ].includes(detectedRole || "");

  const navItems = [
    { href: "/espace-ascq", label: "Mon espace", icon: Home },
    { href: "/briefing", label: "Guide SIMR & Vaccins", icon: BookOpen },
    { href: "/fiches", label: "Surveillance", icon: Activity },
    { href: "/espace-ascq/planning", label: "Planning", icon: Calendar },
    { href: "/espace-ascq/activites-menees", label: "Activités", icon: CheckSquare },
    { href: "/espace-ascq/suivi-relais", label: "Suivi RC", icon: ClipboardCheck },
    { href: "/espace-ascq/rapport-mensuel", label: "Rapport mensuel", icon: FileText },
    { href: "/espace-ascq/relais", label: "Mes Relais", icon: Users },
    { href: "/espace-ascq/permutations", label: "Permutations", icon: ArrowLeftRight },
    { href: "/espace-ascq/requetes", label: "Requêtes", icon: MessageSquareText },
    { href: "/espace-ascq/bibliotheque", label: "Bibliothèque", icon: BookOpen },
    ...(isAdmin ? [{ href: "/admin", label: "Administration", icon: ShieldCheck }] : []),
  ];

  return (
    <>
      {/* 1. En-tête officiel vert foncé avec bandeau tricolore */}
      <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md print:hidden">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2.5 group">
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
                <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  ASCQ Bénin
                </h1>
                <p className="text-[11px] text-white/80">
                  {userProfile ? `${userProfile.prenoms} ${userProfile.nom}` : "Espace ASCQ"}
                </p>
              </div>
            </Link>
          </div>

          {/* Barre du haut : Indicateur réseau, Enrôler un RC, Notifications, Déconnexion */}
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

        {/* Barre de navigation secondaire : Onglets des modules ASCQ */}
        <div className="bg-[#004724] border-t border-white/10 overflow-x-auto scrollbar-none">
          <div className="max-w-3xl mx-auto px-2 flex items-center justify-start sm:justify-center gap-1 py-1.5 min-w-max">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-white text-[#005c30] shadow-sm"
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
