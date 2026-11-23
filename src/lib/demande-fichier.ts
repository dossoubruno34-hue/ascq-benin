import { supabase } from "@/lib/supabase";

export interface DemandeFichierPayload {
  destinataireId: string;
  destinataireNom: string;
  demandeurId: string;
  demandeurNom: string;
  demandeurRole: string;
  typeFichier: string;
  referenceFichier: string;
  lienFichier: string;
}

export interface EnvoiFichierPayload {
  notificationId: string;
  demandeurId: string;
  proprietaireNom: string;
  typeFichier: string;
  referenceFichier: string;
  lienFichier: string;
}

const META_PREFIX = "[FICHIER_META:";
const META_SUFFIX = "]";

export interface DemandeFichierMeta {
  demandeurId: string;
  demandeurNom: string;
  typeFichier: string;
  referenceFichier: string;
  lienFichier: string;
}

/**
 * Extrait les métadonnées d'une notification de demande de fichier
 */
export function extraireMetaDemandeFichier(message: string): DemandeFichierMeta | null {
  if (!message) return null;
  const idx = message.indexOf(META_PREFIX);
  if (idx === -1) return null;
  const endIdx = message.indexOf(META_SUFFIX, idx + META_PREFIX.length);
  if (endIdx === -1) return null;
  try {
    const jsonStr = message.slice(idx + META_PREFIX.length, endIdx);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function nettoyerMessageDemandeFichier(message: string): string {
  if (!message) return "";
  const idx = message.indexOf(META_PREFIX);
  if (idx === -1) return message;
  return message.slice(0, idx).trim();
}

/**
 * Permet à un Représentant ou un Administrateur de demander un fichier ciblé à son propriétaire (ASCQ / RC).
 */
export async function demanderFichierAuProprietaire(payload: DemandeFichierPayload): Promise<{ ok: boolean; error?: string }> {
  const meta: DemandeFichierMeta = {
    demandeurId: payload.demandeurId,
    demandeurNom: payload.demandeurNom,
    typeFichier: payload.typeFichier,
    referenceFichier: payload.referenceFichier,
    lienFichier: payload.lienFichier,
  };

  const texteMessage =
    `${payload.demandeurNom} (${payload.demandeurRole}) vous demande l'envoi du fichier « ${payload.typeFichier} — ${payload.referenceFichier} ». Appuyez sur « Envoyer » pour le transmettre directement.\n` +
    `${META_PREFIX}${JSON.stringify(meta)}${META_SUFFIX}`;

  try {
    const { error } = await supabase.from("notifications").insert({
      destinataire_id: payload.destinataireId,
      titre: `DEMANDE DE FICHIER : ${payload.typeFichier} (${payload.referenceFichier})`,
      message: texteMessage,
      type_notification: "DEMANDE_FICHIER",
      priorite: "HAUTE",
      lien_action: payload.lienFichier,
      lu: false,
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur lors de l'envoi de la demande." };
  }
}

/**
 * Permet au propriétaire du fichier d'appuyer sur « Envoyer » pour transmettre le fichier au demandeur.
 */
export async function envoyerFichierAuDemandeur(payload: EnvoiFichierPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. Marquer la demande comme lue/traitée chez le propriétaire
    try {
      await supabase.from("notifications").update({ lu: true }).eq("id", payload.notificationId);
    } catch {}

    // 2. Envoyer la notification de réception du fichier au demandeur (Représentant / Admin)
    const { error } = await supabase.from("notifications").insert({
      destinataire_id: payload.demandeurId,
      titre: `FICHIER ENVOYÉ : ${payload.typeFichier} (${payload.referenceFichier})`,
      message: `${payload.proprietaireNom} a envoyé le fichier demandé « ${payload.typeFichier} — ${payload.referenceFichier} ». Cliquez sur « Voir » pour l'ouvrir ou l'exporter.`,
      type_notification: "FICHIER_ENVOYE",
      priorite: "HAUTE",
      lien_action: payload.lienFichier,
      lu: false,
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur lors de l'envoi du fichier." };
  }
}
