// ═══════════════════════════════════════════════════════════
// OVIA Prep — Service Worker (PWA Foundation)
// Workbox-based caching strategy for offline-first support
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = "ovi-prep-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/favicon.png",
  "/manifest.json",
];

// Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
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

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== "GET") return;

  // API calls (Supabase): network-first with 5s timeout
  if (url.hostname.includes("supabase") && url.pathname.includes("/functions/")) {
    event.respondWith(
      Promise.race([
        fetch(request),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ])
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.match(/\.(js|css|png|svg|woff2|ttf|ico)$/) ||
    url.pathname === "/" ||
    url.pathname === "/index.html"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Navigation requests: network-first, fallback to cached index.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Default: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
      return cached || fetchPromise;
    })
  );
});

// Background sync for offline queue
self.addEventListener("sync", (event) => {
  if (event.tag === "ovi-sync-queue") {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  // Notify the main thread to process the sync queue
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: "PROCESS_SYNC_QUEUE" });
  }
}
