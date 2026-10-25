"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Home, 
  Users, 
  ArrowLeftRight, 
  MessageSquareText, 
  BookOpen, 
  LogOut, 
  Bell, 
  UserPlus, 
  User
} from "lucide-react";

interface Props {
  userProfile?: any;
}

export default function AscqNav({ userProfile }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/connexion");
  };

  const navItems = [
    { href: "/espace-ascq", label: "Mon espace", icon: Home },
    { href: "/espace-ascq/relais", label: "Mes Relais", icon: Users },
    { href: "/espace-ascq/permutations", label: "Permutations", icon: ArrowLeftRight },
    { href: "/espace-ascq/requetes", label: "Requêtes", icon: MessageSquareText },
    { href: "/espace-ascq/bibliotheque", label: "Bibliothèque", icon: BookOpen },
  ];

  return (
    <>
      {/* 1. En-tête officiel vert foncé avec bandeau tricolore */}
      <header className="bg-[#005c30] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-white p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                <Image
                  src="/logo-ascq.png"
                  alt="Logo ASCQ Bénin"
                  width={32}
                  height={32}
                  className="object-contain"
                />
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

          {/* Barre du haut : Enrôler un RC, Notifications, Déconnexion */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/espace-ascq/relais"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#005c30] font-bold text-xs shadow hover:bg-emerald-50 active:scale-95 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Enrôler un RC</span>
            </Link>

            <button
              onClick={() => alert("Aucune nouvelle notification pour le moment.")}
              className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
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
    </>
  );
}
