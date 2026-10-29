"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { envoyerNotificationTelephone } from "@/lib/notificationsNative";
import PermissionsFirstLoginModal from "./PermissionsFirstLoginModal";

export default function NotificationWatcher() {
  const channelRef = useRef<any>(null);

  // Émission d'un son discret d'alerte sanitaire (Web Audio API, aucune ressource externe requise)
  const jouerSonAlerte = () => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Ré5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // La5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio autoplay peut être restreint par le navigateur avant la première interaction
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initListener() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        // Écoute en temps réel des notifications destinées à cet utilisateur
        const channel = supabase
          .channel(`user-notifications-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
            },
            (payload) => {
              const notif = payload.new;
              if (!notif) return;

              // Filtrer si c'est pour cet utilisateur ou broadcast public
              if (!notif.destinataire_id || notif.destinataire_id === user.id) {
                jouerSonAlerte();

                // Déclencher la notification native smartphone (volet déroulant / écran verrouillé)
                envoyerNotificationTelephone(notif.titre || "ASCQ Bénin - Notification", {
                  body: notif.message || "Nouvelle information sanitaire disponible.",
                  url: notif.lien_action || "/perimetre",
                  tag: `notif_${notif.id || Date.now()}`
                });
              }
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch (err) {
        console.warn("Échec initialisation écoute notifications:", err);
      }
    }

    initListener();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return <PermissionsFirstLoginModal />;
}
