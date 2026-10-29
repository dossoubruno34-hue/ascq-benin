"use client";

import React from "react";
import { Phone, MessageCircle } from "lucide-react";
import { parseBeninPhone } from "@/lib/beninPhone";

// Icône WhatsApp officielle SVG pour un rendu net et immédiatement reconnaissable
function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface BeninPhoneActionProps {
  telephone: string | null | undefined;
  variant?: "badge" | "compact" | "full" | "button-group";
  showNumber?: boolean;
  messageWhatsApp?: string;
  className?: string;
  label?: string;
}

export default function BeninPhoneAction({
  telephone,
  variant = "badge",
  showNumber = true,
  messageWhatsApp,
  className = "",
  label
}: BeninPhoneActionProps) {
  const phoneInfo = parseBeninPhone(telephone);

  if (!phoneInfo) {
    return (
      <span className={`text-slate-400 font-mono text-xs ${className}`}>
        {telephone || "Non renseigné"}
      </span>
    );
  }

  const waHref = messageWhatsApp 
    ? `${phoneInfo.whatsappUrl}?text=${encodeURIComponent(messageWhatsApp)}`
    : phoneInfo.whatsappUrl;

  // 1. Variante Boutons d'action directs (Appel + WhatsApp côte à côte)
  if (variant === "button-group") {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        {showNumber && (
          <span className="font-mono text-xs font-bold text-slate-800">
            {phoneInfo.displayFormatted}
          </span>
        )}
        <a
          href={phoneInfo.telUrl}
          className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-all hover:scale-105 active:scale-95 shadow-xs"
          title={`Appeler ${phoneInfo.displayFormatted}`}
        >
          <Phone className="w-3.5 h-3.5" />
        </a>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#128C7E] transition-all hover:scale-105 active:scale-95 shadow-xs"
          title={`Écrire sur WhatsApp à ${phoneInfo.displayFormatted}`}
        >
          <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
        </a>
      </div>
    );
  }

  // 2. Variante Compacte (icônes seules devant le numéro)
  if (variant === "compact") {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-[#25D366] hover:text-[#128C7E] transition-transform hover:scale-110 shrink-0"
          title="WhatsApp direct"
        >
          <WhatsAppIcon className="w-3.5 h-3.5" />
        </a>
        <a
          href={phoneInfo.telUrl}
          className="inline-flex text-[#005c30] hover:text-[#008751] transition-transform hover:scale-110 shrink-0"
          title="Appel direct"
        >
          <Phone className="w-3 h-3" />
        </a>
        {showNumber && (
          <a
            href={phoneInfo.telUrl}
            className="font-mono text-[11px] font-bold text-slate-700 hover:text-[#005c30] hover:underline transition-colors"
          >
            {phoneInfo.displayFormatted}
          </a>
        )}
      </span>
    );
  }

  // 3. Variante Badge complet cliquable (Style par défaut)
  return (
    <div className={`inline-flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs ${className}`}>
      {label && <span className="text-[10px] text-slate-500 font-medium mr-1">{label}:</span>}
      
      {/* Bouton WhatsApp */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1 rounded-md text-[#25D366] hover:bg-emerald-50 transition-all hover:scale-110 active:scale-95"
        title="Ouvrir la conversation WhatsApp"
      >
        <WhatsAppIcon className="w-4 h-4" />
      </a>

      {/* Bouton Téléphone */}
      <a
        href={phoneInfo.telUrl}
        className="p-1 rounded-md text-[#005c30] hover:bg-emerald-50 transition-all hover:scale-110 active:scale-95"
        title="Passer un appel téléphonique"
      >
        <Phone className="w-3.5 h-3.5" />
      </a>

      {/* Numéro au format officiel Bénin */}
      {showNumber && (
        <a
          href={phoneInfo.telUrl}
          className="font-mono text-xs font-black text-slate-800 hover:text-[#005c30] hover:underline pl-0.5 tracking-tight"
          title="Cliquer pour composer le numéro"
        >
          {phoneInfo.displayFormatted}
        </a>
      )}
    </div>
  );
}
