// Service Worker officiel ASCQ BÉNIN (PWA) - Mode Hors-Ligne Renforcé
const CACHE_NAME = "ascq-benin-v3";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/logo-ascq.png",
  "/icon-192.png",
  "/icon-512.png",
  "/connexion",
  "/espace-ascq",
  "/espace-rc",
  "/fiches",
  "/fiches/alerte/nouvelle",
  "/fiches/registre/nouvelle",
  "/fiches/deces/nouvelle"
];

// Installation du Service Worker et mise en cache des assets statiques
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation et nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Stratégie Réseau en premier, avec secours sur le cache hors-ligne
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes non GET ou externes aux extensions
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Pour les appels Supabase API ou auth, priorité absolue au réseau
  if (url.origin.includes("supabase.co")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache la réponse valide pour navigation hors ligne
        if (response && response.status === 200 && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // En cas de panne de réseau ou mode avion, renvoyer la ressource en cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si navigation HTML vers une page non en cache, renvoyer la page racine
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/");
          }
        });
      })
  );
});
