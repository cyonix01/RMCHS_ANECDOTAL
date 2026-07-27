// Project CARE - Service Worker for PWA and Android App Wrapper support
const CACHE_NAME = "project-care-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico"
];

// Service Worker Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching static app shell");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[Service Worker] Cache addAll warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Service Worker Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Clearing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event handler: Network-first for API requests, Stale-while-revalidate / Network-first for app shell
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Ignore non-GET requests or browser extension/chrome-extension requests
  if (request.method !== "GET" || !request.url.startsWith("http")) {
    return;
  }

  // Handle API routes with network-only strategy
  if (request.url.includes("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Offline mode active. API unavailable." }),
          { headers: { "Content-[#type]": "application/json" } }
        );
      })
    );
    return;
  }

  // For app navigation or static assets
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If offline, serve from cache if available
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === "navigate") {
            return caches.match("/index.html") || caches.match("/");
          }
        });
      })
  );
});
