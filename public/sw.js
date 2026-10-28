// Service Worker officiel ASCQ BÉNIN (PWA) - Mode Hors-Ligne Renforcé V6
// Garanti d'ouverture 100% hors-ligne en zones rurales blanches

const CACHE_NAME = "ascq-benin-v6";

// Pages et ressources critiques à pré-mettre en cache
const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/logo-ascq.png",
  "/icon-192.png",
  "/icon-512.png",
  "/connexion",
  "/espace-ascq",
  "/espace-rc",
  "/briefing",
  "/fiches",
  "/fiches/alerte/nouvelle",
  "/fiches/registre/nouvelle",
  "/fiches/deces/nouvelle",
  "/relais/reference/nouvelle",
  "/espace-ascq/consultations",
  "/espace-ascq/consultations/nouvelle",
  "/espace-ascq/references",
  "/espace-ascq/suivi-relais",
  "/espace-ascq/rapport-hebdo-pnsc",
  "/espace-ascq/rapport-mensuel"
];

// 1. Installation résiliente : ne jamais échouer même si une ressource est indisponible
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Pré-cacher individuellement pour éviter l'échec global de cache.addAll
      const promises = PRECACHE_ASSETS.map(async (url) => {
        try {
          const response = await fetch(url, { cache: "no-cache" });
          if (response && response.status === 200) {
            await cache.put(url, response);
          }
        } catch (err) {
          // Ignorer silencieusement pour ne pas bloquer l'installation du SW
          console.warn("[SW] Pré-cache ignoré pour", url);
        }
      });
      return Promise.allSettled(promises);
    })
  );
  self.skipWaiting();
});

// 2. Nettoyage des anciennes versions de cache
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

// 3. Gestion intelligente des requêtes (Stratégie hybride adaptée à Next.js et aux zones blanches)
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes autres que GET
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Ignorer les requêtes d'extensions de navigateur ou schémas non supportés
  if (!url.protocol.startsWith("http")) return;

  // Supabase API ou Auth : laisser passer vers le réseau, la résilience est gérée dans l'application
  if (url.origin.includes("supabase.co")) {
    return;
  }

  // A. Fichiers statiques Next.js (_next/static, chunks, CSS, images, logos, polices) : CACHE FIRST
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff")
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Si non présent en cache, aller chercher sur le réseau et mettre en cache pour le prochain hors-ligne
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            // En cas d'échec total, retourner une réponse vide sécurisée
            return new Response("", { status: 408, statusText: "Offline Asset Unavailable" });
          });
      })
    );
    return;
  }

  // B. Navigation de pages HTML : RÉSEAU AVEC TIMEOUT COURT (1.2s), SECOURS INSTANTANÉ SUR CACHE
  const isNavigation = event.request.mode === "navigate" || event.request.headers.get("accept")?.includes("text/html");

  if (isNavigation) {
    event.respondWith(
      new Promise((resolve) => {
        let timedOut = false;

        // Timeout rapide de 1.2s pour éviter les blocages de réseau 2G/3G instable
        const timeoutId = setTimeout(() => {
          timedOut = true;
          // Chercher d'abord dans le cache
          caches.match(event.request).then((cached) => {
            if (cached) {
              resolve(cached);
            } else {
              // Si la page exacte n'est pas en cache, renvoyer la racine ou /espace-ascq
              caches.match("/").then((fallback) => {
                if (fallback) resolve(fallback);
                else resolve(createOfflineResponse());
              });
            }
          });
        }, 1200);

        // Tentative réseau
        fetch(event.request)
          .then((response) => {
            clearTimeout(timeoutId);
            if (!timedOut) {
              if (response && response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
              }
              resolve(response);
            }
          })
          .catch(() => {
            clearTimeout(timeoutId);
            if (!timedOut) {
              caches.match(event.request).then((cached) => {
                if (cached) {
                  resolve(cached);
                } else {
                  caches.match("/").then((fallback) => {
                    if (fallback) resolve(fallback);
                    else resolve(createOfflineResponse());
                  });
                }
              });
            }
          });
      })
    );
    return;
  }

  // C. Autres requêtes GET (API locales, manifests, etc.) : Stale While Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Écran de secours minimaliste si la page demandée n'est absolument pas en cache
function createOfflineResponse() {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mode Hors-Ligne - ASCQ Bénin</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f4f7f5; color: #1e293b; margin: 0; padding: 24px; text-align: center; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: white; border-radius: 24px; padding: 32px 24px; max-width: 420px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .logo { width: 64px; height: 64px; margin: 0 auto 16px; display: block; }
    h1 { font-size: 1.25rem; font-weight: 800; color: #005c30; margin-bottom: 8px; }
    p { font-size: 0.875rem; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
    .btn { display: block; width: 100%; box-sizing: border-box; padding: 12px 16px; margin-bottom: 10px; background: #005c30; color: white; text-decoration: none; font-weight: 700; font-size: 0.875rem; border-radius: 14px; }
    .btn-secondary { background: #e2e8f0; color: #334155; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 999px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <img src="/logo-ascq.png" alt="Logo ASCQ" class="logo" />
    <span class="badge">📡 MODE HORS-LIGNE ACTIF</span>
    <h1>ASCQ BÉNIN</h1>
    <p>Vous êtes en zone sans connexion internet. Vous pouvez continuer à saisir vos fiches et consulter vos outils enregistrés en local.</p>
    <a href="/espace-ascq" class="btn">Accéder à Mon Espace ASCQ</a>
    <a href="/espace-rc" class="btn btn-secondary">Espace Relais Communautaire</a>
    <a href="/fiches" class="btn btn-secondary">Formulaires & Fiches Hors-Ligne</a>
  </div>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
    status: 200,
  });
}
