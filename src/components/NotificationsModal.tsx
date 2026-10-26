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
  FileText
} from "lucide-react";

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

export default function NotificationsModal({ isOpen, onClose, onNotificationsUpdated }: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const chargerNotifications = async () => {
    setLoading(true);
    try {
      // 1. Appel RPC officielle
      const { data, error } = await supabase.rpc("obtenir_mes_notifications");
      if (!error && data) {
        setNotifications(data);
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

      setNotifications(notifs || []);
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
    try {
      await supabase.rpc("marquer_notification_lue", { p_id: id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lu: true } : n))
      );
      if (onNotificationsUpdated) onNotificationsUpdated();
    } catch (err) {
      // Fallback
      await supabase.from("notifications").update({ lu: true }).eq("id", id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lu: true } : n))
      );
      if (onNotificationsUpdated) onNotificationsUpdated();
    }
  };

  const handleMarquerToutesLues = async () => {
    try {
      const nonLues = notifications.filter((n) => !n.lu);
      await Promise.all(
        nonLues.map((n) => supabase.from("notifications").update({ lu: true }).eq("id", n.id))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
      if (onNotificationsUpdated) onNotificationsUpdated();
    } catch (err) {
      console.error("Erreur marquer toutes lues:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* En-tête de la modale */}
        <div className="p-4 bg-[#005c30] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-200" />
            <h2 className="font-bold text-sm sm:text-base">Centre de Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.lu) && (
              <button
                type="button"
                onClick={handleMarquerToutesLues}
                className="text-[11px] font-semibold bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition-colors text-white"
              >
                Tout marquer comme lu
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Liste des notifications */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100 space-y-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              <div className="w-6 h-6 border-2 border-[#005c30] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Chargement des alertes et notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
              <p className="font-bold text-slate-600">Aucune notification</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Vous êtes à jour dans vos rapports et alertes épidémiologiques.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isUrgente = notif.priorite === "URGENTE";
              const isHaute = notif.priorite === "HAUTE";

              return (
                <div
                  key={notif.id}
                  className={`py-3 px-3 rounded-xl transition-all ${
                    !notif.lu
                      ? isUrgente
                        ? "bg-red-50/90 border border-red-200/80"
                        : "bg-emerald-50/70 border border-emerald-100"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
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
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3
                            className={`text-xs font-bold leading-tight ${
                              isUrgente ? "text-red-950" : "text-slate-900"
                            }`}
                          >
                            {notif.titre}
                          </h3>
                          {isUrgente && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-red-200 text-red-900">
                              Urgent
                            </span>
                          )}
                          {!notif.lu && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                          {notif.message}
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

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {!notif.lu && (
                        <button
                          type="button"
                          onClick={() => handleMarquerLue(notif.id)}
                          className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold p-1 hover:bg-emerald-100 rounded"
                          title="Marquer comme lu"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {notif.lien_action && (
                        <Link
                          href={notif.lien_action}
                          onClick={onClose}
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
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
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
