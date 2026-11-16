import { supabase } from "@/lib/supabase";
import { AuditLogEntry } from "./types";

/**
 * Enregistre une action d'impression, génération ou téléchargement de fiche officielle
 * dans le journal d'audit conformément à la directive DDS (sans enregistrer le contenu médical).
 */
export async function enregistrerAuditPdf(entry: AuditLogEntry): Promise<void> {
  try {
    // 1. Sauvegarde locale immédiate (mode hors-ligne)
    if (typeof window !== "undefined") {
      const LOCAL_KEY = "santecom_audit_pdf_log";
      const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
      existing.unshift({
        ...entry,
        timestamp: new Date().toISOString()
      });
      // Garder les 100 derniers logs locaux
      localStorage.setItem(LOCAL_KEY, JSON.stringify(existing.slice(0, 100)));
    }

    // 2. Synchronisation Supabase (si connecté et en ligne)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = entry.utilisateur_id || user?.id || null;

    await supabase.from("journal_audit_actions").insert({
      action: `PDF_${entry.action}`,
      entite: "FICHE_SURVEILLANCE",
      entite_id: entry.enregistrement_id || null,
      details: {
        fiche_type: entry.fiche_type,
        action: entry.action,
        client: typeof navigator !== "undefined" ? navigator.userAgent : "browser"
      },
      utilisateur_id: userId,
      created_at: entry.date || new Date().toISOString()
    });
  } catch (err) {
    // Audit résilient en mode hors-ligne : ne bloque jamais la consultation de l'agent
    console.warn("Journal d'audit PDF (hors-ligne ou RPC indisponible) :", err);
  }
}
