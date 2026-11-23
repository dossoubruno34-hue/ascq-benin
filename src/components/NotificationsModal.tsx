"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Bell,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Check,
  ShieldAlert,
  Calendar,
  MessageSquare,
  FileText,
  Inbox,
  Send
} from "lucide-react";
import {
  extraireMetaDemandeFichier,
  nettoyerMessageDemandeFichier,
  envoyerFichierAuDemandeur
} from "@/lib/demande-fichier";
import { getCachedUserSession } from "@/lib/offline-sync";

interface NotificationItem {
  id: string;
  titre: string;
  message: string;
  type_notification: string;
  priorite: "NORMALE" | "HAUTE" | "URGENTE";
  lu: boolean;
  lien_action?: string;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNotificationsUpdated?: () => void;
}

// Fonction de nettoyage et correction des textes UTF-8 / Mojibake
function corrigerTexteUtf8(text: string): string {
  if (!text) return "";
  let clean = text;
  try {
    // Si la chaîne contient des séquences typiques de double-encodage UTF-8 (Ã©, Ã¨, Ã , etc.)
    if (/[\u00C2\u00C3]/.test(clean) || clean.includes("Ã") || clean.includes("ð")) {
      clean = decodeURIComponent(escape(clean));
    }
  } catch (e) {
    // Fallback manuel si le décodage standard échoue
  }
  return clean
    .replace(/Ã©/g, "é")
    .replace(/Ã¨/g, "è")
    .replace(/Ãª/g, "ê")
    .replace(/Ã /g, "à")
    .replace(/Ã¢/g, "â")
    .replace(/Ã®/g, "î")
    .replace(/Ã¯/g, "ï")
    .replace(/Ã´/g, "ô")
    .replace(/Ã¹/g, "ù")
    .replace(/Ã»/g, "û")
    .replace(/Ã§/g, "ç")
    .replace(/Ã/g, "É")
    .replace(/Ã/g, "È")
    .replace(/Ã/g, "À")
    .replace(/Ã/g, "Ô")
    .replace(/Ã\s/g, "à ")
    .replace(/ð¨/g, "🚨")
    .replace(/ð/g, "🔄")
    .replace(/ð¬/g, "💬")
    .replace(/ð/g, "📊")
    .replace(/ð/g, "📋")
    .replace(/â/g, "—")
    .replace(/â/g, "’");
}

export default function NotificationsModal({ isOpen, onClose, onNotificationsUpdated }: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtreActif, setFiltreActif] = useState<"non_lues" | "toutes">("non_lues");
  const [sendingNotifId, setSendingNotifId] = useState<string | null>(null);
  const [sentNotifIds, setSentNotifIds] = useState<Set<string>>(new Set());

  const handleEnvoyerFichierDemande = async (notif: NotificationItem) => {
    const meta = extraireMetaDemandeFichier(notif.message);
    if (!meta) return;
    setSendingNotifId(notif.id);
    try {
      const session = getCachedUserSession();
      const prof = session?.profile;
      const proprietaireNom = prof ? `${prof.prenoms || ""} ${prof.nom || ""}`.trim() : "Agent SantéCom";
      const res = await envoyerFichierAuDemandeur({
        notificationId: notif.id,
        demandeurId: meta.demandeurId,
        proprietaireNom,
        typeFichier: meta.typeFichier,
        referenceFichier: meta.referenceFichier,
        lienFichier: meta.lienFichier,
      });
      if (res.ok) {
        setSentNotifIds((prev) => new Set(prev).add(notif.id));
        await handleMarquerLue(notif.id);
      } else {
        alert("Erreur lors de l'envoi : " + (res.error || "Réessayez"));
      }
    } finally {
      setSendingNotifId(null);
    }
  };

  const getLocalReadIds = (): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem("ascq_notifications_lues");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };

  const saveLocalReadIds = (ids: string[]) => {
    if (typeof window === "undefined") return;
    try {
      const set = getLocalReadIds();
      ids.forEach((id) => set.add(id));
      localStorage.setItem("ascq_notifications_lues", JSON.stringify(Array.from(set)));
    } catch {}
  };

  const chargerNotifications = async () => {
    setLoading(true);
    try {
      const localReadIds = getLocalReadIds();

      // 1. Appel RPC officielle
      const { data, error } = await supabase.rpc("obtenir_mes_notifications");
      if (!error && Array.isArray(data)) {
        const enriched = data.map((n: any) => ({
          ...n,
          lu: n.lu || localReadIds.has(n.id)
        }));
        setNotifications(enriched);
        return;
      }

      // 2. Fallback direct table
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .or(`destinataire_id.eq.${user.id},destinataire_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(30);

      const enriched = (notifs || []).map((n: any) => ({
        ...n,
        lu: n.lu || localReadIds.has(n.id)
      }));
      setNotifications(enriched);
    } catch (err) {
      console.error("Erreur chargement notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      chargerNotifications();
    }
  }, [isOpen]);

  const handleMarquerLue = async (id: string) => {
    saveLocalReadIds([id]);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lu: true } : n))
    );
    try {
      await supabase.rpc("marquer_notification_lue", { p_id: id });
    } catch (err) {
      // Fallback
      await supabase.from("notifications").update({ lu: true }).eq("id", id);
    }
    if (onNotificationsUpdated) onNotificationsUpdated();
  };

  const handleMarquerToutesLues = async () => {
    const ids = notifications.map((n) => n.id);
    saveLocalReadIds(ids);
    setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));

    try {
      const nonLues = notifications.filter((n) => !n.lu);
      await Promise.all(
        nonLues.map((n) => supabase.from("notifications").update({ lu: true }).eq("id", n.id))
      );
    } catch (err) {
      console.error("Erreur marquer toutes lues:", err);
    }
    if (onNotificationsUpdated) onNotificationsUpdated();
  };

  if (!isOpen) return null;

  const nbNonLues = notifications.filter((n) => !n.lu).length;
  const notificationsAffichees = filtreActif === "non_lues"
    ? notifications.filter((n) => !n.lu)
    : notifications;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* En-tête de la modale */}
        <div className="p-4 bg-[#005c30] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-200" />
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight">Centre de Notifications</h2>
              <p className="text-[10px] text-emerald-200">
                {nbNonLues > 0 ? `${nbNonLues} nouvelle(s) notification(s)` : "Toutes les alertes sont lues"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {nbNonLues > 0 && (
              <button
                type="button"
                onClick={handleMarquerToutesLues}
                className="text-[11px] font-semibold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors text-white active:scale-95"
              >
                Tout marquer comme lu
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barre d'onglets de filtrage : Non lues (disparaissent quand vues) VS Historique complet */}
        <div className="bg-slate-100 p-1.5 border-b border-slate-200 flex items-center justify-between gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFiltreActif("non_lues")}
            className={`flex-1 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              filtreActif === "non_lues"
                ? "bg-white text-[#005c30] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>À traiter / Non lues</span>
            {nbNonLues > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-black">
                {nbNonLues}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFiltreActif("toutes")}
            className={`flex-1 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              filtreActif === "toutes"
                ? "bg-white text-[#005c30] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Historique ({notifications.length})</span>
          </button>
        </div>

        {/* Liste des notifications */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100 space-y-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              <div className="w-6 h-6 border-2 border-[#005c30] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Chargement des alertes et notifications...
            </div>
          ) : notificationsAffichees.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto" />
              <div>
                <p className="font-bold text-slate-700 text-sm">
                  {filtreActif === "non_lues" ? "Aucune notification non lue" : "Aucune notification"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  {filtreActif === "non_lues"
                    ? "Toutes les notifications consultées ont été archivées. Vous êtes à jour !"
                    : "Votre journal de bord et de surveillance sanitaire est vide pour le moment."}
                </p>
              </div>
              {filtreActif === "non_lues" && notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltreActif("toutes")}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#005c30] hover:underline pt-2"
                >
                  <span>Consulter l'historique des notifications ({notifications.length})</span>
                </button>
              )}
            </div>
          ) : (
            notificationsAffichees.map((notif) => {
              const isUrgente = notif.priorite === "URGENTE";
              const titrePropre = corrigerTexteUtf8(notif.titre);
              const metaDemande = extraireMetaDemandeFichier(notif.message);
              const messagePropre = corrigerTexteUtf8(nettoyerMessageDemandeFichier(notif.message));
              const estDemandeFichier = notif.type_notification === "DEMANDE_FICHIER" || Boolean(metaDemande);
              const dejaEnvoye = sentNotifIds.has(notif.id);

              return (
                <div
                  key={notif.id}
                  className={`py-3 px-3 rounded-xl transition-all ${
                    !notif.lu
                      ? isUrgente
                        ? "bg-red-50/90 border border-red-200/80 shadow-2xs"
                        : "bg-emerald-50/70 border border-emerald-100 shadow-2xs"
                      : "hover:bg-slate-50 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="mt-0.5 shrink-0">
                        {isUrgente ? (
                          <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                        ) : notif.type_notification === "RMA_RAPPEL" ? (
                          <Clock className="w-4 h-4 text-amber-600" />
                        ) : notif.type_notification === "ACTIVITE_DEMANDEE" ? (
                          <Calendar className="w-4 h-4 text-blue-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-[#005c30]" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3
                            className={`text-xs font-bold leading-tight ${
                              isUrgente ? "text-red-950" : "text-slate-900"
                            }`}
                          >
                            {titrePropre}
                          </h3>
                          {isUrgente && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-red-200 text-red-900">
                              Urgent
                            </span>
                          )}
                          {!notif.lu ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" title="Non lu"></span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">✓ Lu</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-snug break-words">
                          {messagePropre}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-1.5 font-medium">
                          {new Date(notif.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                      {estDemandeFichier && metaDemande && !dejaEnvoye && (
                        <button
                          type="button"
                          disabled={sendingNotifId === notif.id}
                          onClick={() => handleEnvoyerFichierDemande(notif)}
                          className="inline-flex items-center gap-1.5 text-xs text-white bg-[#008751] hover:bg-[#006b40] font-black px-3 py-1.5 rounded-xl shadow-sm active:scale-95 transition-all disabled:opacity-60"
                          title={`Envoyer le fichier demandé à ${metaDemande.demandeurNom}`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{sendingNotifId === notif.id ? "Envoi..." : "Envoyer"}</span>
                        </button>
                      )}
                      {dejaEnvoye && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3" />
                          <span>Envoyé</span>
                        </span>
                      )}
                      {!notif.lu ? (
                        <button
                          type="button"
                          onClick={() => handleMarquerLue(notif.id)}
                          className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-100 hover:bg-emerald-200 font-bold px-2 py-0.5 rounded-md transition-colors"
                          title="Marquer comme lu (retire de la liste)"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Marquer lu</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold px-1 py-0.5">Traité</span>
                      )}
                      {notif.lien_action && (
                        <Link
                          href={notif.lien_action}
                          onClick={() => {
                            if (!notif.lu) handleMarquerLue(notif.id);
                            onClose();
                          }}
                          className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#005c30] hover:underline"
                        >
                          <span>Voir</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pied de la modale */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            {nbNonLues > 0 ? `${nbNonLues} non lue(s)` : "Aucune alerte en attente"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
