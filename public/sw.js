// Project CARE - Advanced Service Worker with Periodic Sync, Background Sync & Push Notifications
const CACHE_NAME = "project-care-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png"
];

// Service Worker Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Project CARE SW] Pre-caching static app shell & icons");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[Project CARE SW] Non-fatal caching warning:", err);
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
            console.log("[Project CARE SW] Purging obsolete cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event handler
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET" || !request.url.startsWith("http")) {
    return;
  }

  // Handle API routes with network-first strategy
  if (request.url.includes("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Offline mode active. Server currently unreachable." }),
          { headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // App shell & static assets strategy (Cache then Network fallback)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// ==========================================
// 1. BACKGROUND SYNC ('sync' event)
// ==========================================
self.addEventListener("sync", (event) => {
  console.log("[Project CARE SW] Background Sync triggered:", event.tag);
  if (event.tag === "sync-care-reports" || event.tag === "background-sync") {
    event.waitUntil(performBackgroundSync());
  }
});

async function performBackgroundSync() {
  try {
    console.log("[Project CARE SW] Executing background sync queue...");
    // Broadcast message to open clients
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      client.postMessage({ type: "SYNC_COMPLETED", timestamp: Date.now() });
    }
    // Show notification to user if permissions allowed
    if (self.registration.showNotification) {
      await self.registration.showNotification("Project C.A.R.E. Background Sync", {
        body: "Offline guidance records and reports were successfully synchronized.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [100, 50, 100],
        tag: "care-bg-sync"
      });
    }
  } catch (err) {
    console.error("[Project CARE SW] Background sync error:", err);
  }
}

// ==========================================
// 2. PERIODIC BACKGROUND SYNC ('periodicsync')
// ==========================================
self.addEventListener("periodicsync", (event) => {
  console.log("[Project CARE SW] Periodic Background Sync triggered:", event.tag);
  if (event.tag === "periodic-care-update" || event.tag === "periodic-sync") {
    event.waitUntil(performPeriodicSync());
  }
});

async function performPeriodicSync() {
  try {
    console.log("[Project CARE SW] Fetching periodic guidance updates...");
    const response = await fetch("/api/notifications");
    if (response.ok) {
      const notifications = await response.json();
      const unreadCount = Array.isArray(notifications) 
        ? notifications.filter((n) => !n.read_by || n.read_by.length === 0).length 
        : 0;

      if (unreadCount > 0 && self.registration.showNotification) {
        await self.registration.showNotification("Project C.A.R.E. Updates", {
          body: `You have ${unreadCount} new guidance case updates waiting in Project CARE.`,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "periodic-update-notification",
          data: { url: "/" }
        });
      }
    }
  } catch (err) {
    console.warn("[Project CARE SW] Periodic sync check skipped (offline or server error)");
  }
}

// ==========================================
// 3. PUSH NOTIFICATIONS ('push' & 'notificationclick')
// ==========================================
self.addEventListener("push", (event) => {
  console.log("[Project CARE SW] Push notification received.");
  let pushData = { title: "Project C.A.R.E. Notification", body: "New student guidance or academic update received." };

  if (event.data) {
    try {
      pushData = event.data.json();
    } catch (e) {
      pushData.body = event.data.text();
    }
  }

  const options = {
    body: pushData.body || "New notification from Ramon Magsaysay High School Guidance Office.",
    icon: pushData.icon || "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: { url: pushData.url || "/" },
    actions: [
      { action: "open", title: "Open Portal" },
      { action: "dismiss", title: "Dismiss" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(pushData.title || "Project C.A.R.E.", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Client Message Listener
self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "TEST_NOTIFICATION") {
    self.registration.showNotification(event.data.title || "Project C.A.R.E. Test Notification", {
      body: event.data.body || "Push notifications are working smoothly on your device!",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [100, 50, 100],
      actions: [{ action: "open", title: "View Dashboard" }]
    });
  } else if (event.data.type === "TRIGGER_SYNC") {
    performBackgroundSync();
  }
});
