/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope;

// Precache the app shell
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// API responses: network-first with 5s timeout, fallback to cache
registerRoute(
  ({ url }) => url.pathname.startsWith("/functions/v1/") || url.pathname.startsWith("/rest/v1/"),
  new NetworkFirst({
    cacheName: "api-v1",
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }), // 1 day
    ],
  })
);

// Revision notes: stale-while-revalidate (fast load, background update)
registerRoute(
  ({ url }) => url.pathname.includes("/notes") || url.pathname.includes("/revision_notes"),
  new StaleWhileRevalidate({
    cacheName: "notes-v1",
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 }), // 7 days
    ],
  })
);

// Media/images: cache-first (immutable CDN assets)
registerRoute(
  ({ request }) => request.destination === "image" || request.destination === "font",
  new CacheFirst({
    cacheName: "media-v1",
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }), // 30 days
    ],
  })
);

// Static assets (JS/CSS): cache-first for app shell
registerRoute(
  ({ request }) => request.destination === "script" || request.destination === "style",
  new CacheFirst({
    cacheName: "static-v1",
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// Background sync for offline queue
self.addEventListener("sync", (event) => {
  if (event.tag === "ovi-sync-queue") {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  // Open IndexedDB and process pending sync items
  const db = await openDB();
  const tx = db.transaction("sync_queue", "readwrite");
  const store = tx.objectStore("sync_queue");
  const pending = store.index("status").getAll("pending");

  // Items will be processed by the app when it comes online
  // This just ensures the sync event fires
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = self.indexedDB.open("ovia-prep", 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Push notification handling
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "OVIA Prep", {
      body: data.body || "",
      icon: "/favicon.png",
      badge: "/favicon.png",
      data: data.data || {},
      tag: data.tag || "ovi-notification",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      self.clients.openWindow(url);
    })
  );
});
