import Link from "next/link";
import { ExternalLink, Calendar } from "lucide-react";
import { FacebookIcon } from "@/components/SocialLinks";

export interface PublicationFacebook {
  id_facebook: string;
  message: string;
  permalink_url: string;
  created_time: string;
  fetched_at?: string;
}

interface DernieresPublicationsProps {
  publications: PublicationFacebook[];
}

const PAGE_FACEBOOK_OFFICIELLE = "https://www.facebook.com/profile.php?id=61595028870500";

/**
 * Formate proprement une date ISO en français (ex: 4 nov. 2026)
 */
function formaterDatePublication(dateIso: string): string {
  try {
    const d = new Date(dateIso);
    if (isNaN(d.getTime())) return "Publication récente";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "Publication récente";
  }
}

export default function DernieresPublicationsFacebook({ publications }: DernieresPublicationsProps) {
  const hasPosts = Array.isArray(publications) && publications.length > 0;

  return (
    <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
      {/* En-tête de la zone */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center shrink-0 border border-blue-100">
            <FacebookIcon className="w-4 h-4 text-[#1877F2]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
              Dernières publications
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Page officielle du Collectif des ASCQ
            </p>
          </div>
        </div>

        <a
          href={PAGE_FACEBOOK_OFFICIELLE}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[11px] font-bold text-[#0e7f47] hover:text-[#005c30] flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/70 px-2.5 py-1 rounded-full transition-colors active:scale-95"
          title="Ouvrir la page Facebook officielle"
        >
          <span>Page officielle</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Contenu : liste des 3 publications OU message neutre si vide */}
      {hasPosts ? (
        <div className="space-y-3 pt-1">
          {publications.slice(0, 3).map((pub) => (
            <article
              key={pub.id_facebook}
              className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 hover:border-[#0e7f47]/40 transition-colors"
            >
              {/* Date de publication */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-[#0e7f47]" />
                  <span>Publié le {formaterDatePublication(pub.created_time)}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#1877F2] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                  Facebook
                </span>
              </div>

              {/* Texte brut avec 4 lignes max (line-clamp-4) et retours à la ligne conservés */}
              <p className="text-xs text-slate-700 whitespace-pre-line line-clamp-4 leading-relaxed break-words break-all">
                {pub.message}
              </p>

              {/* Lien direct pour lire la suite sur Facebook */}
              <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between">
                <a
                  href={pub.permalink_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#0e7f47] hover:text-[#005c30] active:scale-95 transition-transform"
                >
                  <FacebookIcon className="w-3.5 h-3.5 text-[#1877F2]" />
                  <span>Lire sur Facebook</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* État vide ou incident réseau : message neutre et bienveillant, sans aucun message d'erreur technique */
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-3">
          <p className="text-xs text-slate-600 font-semibold leading-relaxed">
            Retrouvez nos publications sur notre page Facebook
          </p>
          <a
            href={PAGE_FACEBOOK_OFFICIELLE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#005c30] hover:bg-[#004724] text-white font-bold text-xs shadow-sm transition-all active:scale-95"
          >
            <FacebookIcon className="w-4 h-4 text-white" />
            <span>Retrouvez nos publications sur notre page Facebook</span>
            <ExternalLink className="w-3.5 h-3.5 text-white/80" />
          </a>
        </div>
      )}
    </section>
  );
}
