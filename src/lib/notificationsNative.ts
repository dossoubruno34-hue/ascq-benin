// =====================================================================
// GESTIONNAIRE DE NOTIFICATIONS NATIVES SMARTPHONE (STYLE WHATSAPP/FACEBOOK)
// & DEMANDE D'ACCÈS PERMISSIONS (GPS & NOTIFICATIONS)
// République du Bénin - Plateforme Nationale ASCQ & Gouvernance
// =====================================================================

export interface NativeNotificationOptions {
  body?: string;
  url?: string;
  tag?: string;
  data?: any;
}

/**
 * Vérifie si le navigateur supporte les notifications web et PWA
 */
export function supporteNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Obtient le statut de permission actuel des notifications
 */
export function getStatutPermissionNotifications(): NotificationPermission | "unsupported" {
  if (!supporteNotifications()) return "unsupported";
  return Notification.permission;
}

/**
 * Demande la permission système pour les notifications du téléphone
 */
export async function demanderPermissionNotifications(): Promise<boolean> {
  if (!supporteNotifications()) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (err) {
    console.warn("Erreur demande permission notifications:", err);
    return false;
  }
}

/**
 * Demande la permission système pour la géolocalisation GPS
 */
export async function demanderPermissionGps(): Promise<boolean> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) return false;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}

/**
 * Envoie une notification native sur le téléphone (sur l'écran de verrouillage et le volet déroulant, comme WhatsApp)
 */
export async function envoyerNotificationTelephone(
  titre: string,
  options?: NativeNotificationOptions
): Promise<boolean> {
  if (!supporteNotifications()) return false;

  if (Notification.permission !== "granted") {
    const accorde = await demanderPermissionNotifications();
    if (!accorde) return false;
  }

  const defaultOptions: any = {
    body: options?.body || "Nouvelle alerte sanitaire ou mise à jour disponible.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: options?.tag || "ascq_notification",
    // Vibration standard smartphone pour alertes : bip court, pause, bip court
    vibrate: [200, 100, 200, 100, 300],
    data: {
      url: options?.url || "/",
      date: new Date().toISOString(),
      ...(options?.data || {})
    },
    requireInteraction: true // Reste visible jusqu'à interaction de l'utilisateur
  };

  try {
    // 1. Tenter via le Service Worker actif (Recommandé pour PWA sur Android/iOS)
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && "showNotification" in registration) {
          await registration.showNotification(titre, defaultOptions);
          return true;
        }
      } catch (swErr) {
        console.warn("Échec showNotification via Service Worker, repli vers Notification directe:", swErr);
      }
    }

    // 2. Repli vers le constructeur standard Notification
    const notif = new Notification(titre, defaultOptions);
    notif.onclick = () => {
      window.focus();
      if (options?.url) {
        window.location.href = options.url;
      }
      notif.close();
    };
    return true;
  } catch (err) {
    console.warn("Erreur lors de l'envoi de la notification native:", err);
    return false;
  }
}
