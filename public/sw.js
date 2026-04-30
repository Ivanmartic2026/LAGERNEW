// Service Worker for Lager AI PWA
// Handles push notifications and offline functionality

const CACHE_NAME = 'lager-ai-v2-dev';
const VAPID_PUBLIC_KEY = 'BKhWuD-M_--GJd3qhKoT1--B51R6WQvdlW_CnjpVrdAt0DddD6Tx5IUKykr5LRH5plX-1_xS718BZKkGlv9L8gw';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v2');
  // Clear old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v2');
  event.waitUntil(clients.claim());
});

// Fetch event — NETWORK FIRST for dev, cache as fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful GETs
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.destination === 'image') {
            return new Response('<svg></svg>', { headers: { 'Content-Type': 'image/svg+xml' } });
          }
          return null;
        });
      })
  );
});

// Handle push events
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW] Push received with no data');
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch {
    notificationData = {
      title: 'Lager AI',
      body: event.data.text()
    };
  }

  const {
    title = 'Lager AI',
    body = 'Du har ett nytt meddelande',
    icon = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png',
    badge = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png',
    tag = 'notification',
    workOrderId = null,
    chatThreadId = null
  } = notificationData;

  const options = {
    body,
    icon,
    badge,
    tag,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      workOrderId,
      chatThreadId,
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[SW] Notification shown:', title))
      .catch((err) => console.error('[SW] Notification error:', err))
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { workOrderId, chatThreadId } = event.notification.data || {};
  let targetUrl = '/';

  if (workOrderId) {
    targetUrl = `/WorkOrders/${workOrderId}`;
    if (chatThreadId) {
      targetUrl += `?thread=${chatThreadId}`;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if any window already has the target URL
      for (let client of clientList) {
        if (client.url.includes(targetUrl)) {
          client.focus();
          return;
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle notification close (for tracking dismissal)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed by user');
});
