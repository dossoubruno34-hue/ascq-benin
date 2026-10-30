import React from "react";

export interface SocialPlatform {
  name: string;
  label: string;
  url: string;
  iconColor: string;
  borderColor: string;
  bgColor: string;
  svg: React.ReactNode;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    name: "Facebook",
    label: "Page Facebook officielle",
    url: "https://www.facebook.com/profile.php?id=61595028870500",
    iconColor: "text-[#1877F2]",
    borderColor: "hover:border-[#1877F2]/50",
    bgColor: "hover:bg-[#1877F2]/5",
    svg: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "X",
    label: "Compte X (Twitter) @ascqbenin",
    url: "https://x.com/ascqbenin",
    iconColor: "text-slate-900",
    borderColor: "hover:border-slate-800",
    bgColor: "hover:bg-slate-100",
    svg: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    label: "Instagram @ascqbenin",
    url: "https://www.instagram.com/ascqbenin?obrf=MXVkeWZ4MWNhYmZ5eA==",
    iconColor: "text-[#E4405F]",
    borderColor: "hover:border-[#E4405F]/50",
    bgColor: "hover:bg-[#E4405F]/5",
    svg: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    name: "Threads",
    label: "Threads @ascqbenin",
    url: "https://www.threads.com/@ascqbenin",
    iconColor: "text-slate-900",
    borderColor: "hover:border-slate-800",
    bgColor: "hover:bg-slate-100",
    svg: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.186 24C5.467 24 0 18.533 0 11.814 0 5.094 5.467 0 12.186 0c6.643 0 11.968 5.253 12.012 11.814v.77c-.015 3.324-2.316 5.882-5.467 5.882-1.892 0-3.471-.937-4.225-2.503-.896 1.579-2.585 2.503-4.516 2.503-3.238 0-5.748-2.51-5.748-5.748 0-3.24 2.51-5.75 5.748-5.75 1.931 0 3.62.924 4.516 2.503.754-1.566 2.333-2.503 4.225-2.503 2.148 0 3.79 1.492 3.823 3.48v.574c-.035-5.328-4.398-9.691-9.768-9.691-5.412 0-9.814 4.402-9.814 9.814s4.402 9.814 9.814 9.814c3.411 0 6.44-1.745 8.214-4.445l1.83 1.258C19.986 21.848 16.31 24 12.186 24zm-2.01-8.082c1.944 0 3.447-1.503 3.447-3.447 0-1.945-1.503-3.448-3.447-3.448-1.945 0-3.448 1.503-3.448 3.448 0 1.944 1.503 3.447 3.448 3.447z" />
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    label: "Canal WhatsApp officiel",
    url: "https://whatsapp.com/channel/0029VbE6MZcHbFV2YFxXoe05",
    iconColor: "text-[#25D366]",
    borderColor: "hover:border-[#25D366]/50",
    bgColor: "hover:bg-[#25D366]/5",
    svg: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    label: "Page LinkedIn ASCQ Bénin",
    url: "https://www.linkedin.com/company/ascq-benin/",
    iconColor: "text-[#0A66C2]",
    borderColor: "hover:border-[#0A66C2]/50",
    bgColor: "hover:bg-[#0A66C2]/5",
    svg: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
      </svg>
    ),
  },
  {
    name: "Email",
    label: "Contact Email direct",
    url: "mailto:ascqbenin@gmail.com",
    iconColor: "text-[#0e7f47]",
    borderColor: "hover:border-[#0e7f47]/50",
    bgColor: "hover:bg-[#0e7f47]/5",
    svg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export function SocialLinksRow({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses =
    size === "sm"
      ? "w-9 h-9 rounded-xl"
      : size === "lg"
      ? "w-13 h-13 rounded-2xl"
      : "w-11 h-11 sm:w-12 sm:h-12 rounded-2xl";

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
      {SOCIAL_PLATFORMS.map((platform) => (
        <a
          key={platform.name}
          href={platform.url}
          target={platform.url.startsWith("mailto:") ? undefined : "_blank"}
          rel={platform.url.startsWith("mailto:") ? undefined : "noopener noreferrer"}
          className={`${sizeClasses} bg-white border border-slate-200/90 shadow-sm flex items-center justify-center transition-all duration-200 active:scale-95 group ${platform.borderColor} ${platform.bgColor}`}
          title={platform.label}
          aria-label={platform.label}
        >
          <span className={`${platform.iconColor} transition-transform duration-200 group-hover:scale-110`}>
            {platform.svg}
          </span>
        </a>
      ))}
    </div>
  );
}

export function SocialPlatformsCard() {
  return (
    <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center space-y-4">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#0e7f47] text-[11px] font-black uppercase tracking-wider">
          <span>Communauté & Réseaux</span>
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
          Rejoignez nos plateformes officielles
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Suivez toutes les actualités, campagnes de santé et communiqués officiels des ASCQ du Bénin.
        </p>
      </div>

      <SocialLinksRow size="md" />

      <div className="pt-1 flex flex-wrap items-center justify-center gap-3 text-[11px] font-bold text-slate-400">
        <span>@ascqbenin</span>
        <span>•</span>
        <span>#ASCQBenin</span>
        <span>•</span>
        <span>Santé Communautaire</span>
      </div>
    </section>
  );
}
