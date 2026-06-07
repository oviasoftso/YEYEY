// ═══════════════════════════════════════════════════════════
// OVIA Prep — Service Worker (Basic for offline support)
// Simple service worker that only caches the app shell
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = "ovi-prep-v2";

// Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([
      "/",
      "/index.html",
      "/favicon.png",
      "/manifest.json",
    ]))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: simple cache-first for everything
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Don't cache the JS/CSS files - always fetch fresh
        if (event.request.url.endsWith(".js") || event.request.url.endsWith(".css")) {
          return response;
        }
        // Cache other requests
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
