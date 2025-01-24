const CACHE_NAME = 'pwa-coppercloud-cache-v1';
const urlsToCache = [
  '/',
  '/login.html',
  '/index.html',
  '/scripts/app.js',
  '/scripts/login.js',
  '/styles/style.css',
  '/styles/login.css',
  'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js',
  'https://cdn.jsdelivr.net/npm/idb@7/build/umd.js',
  '/icons/icon.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache).catch((error) => {
        console.error('Failed to cache resources:', error);
      });
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Serve cached response if available, else fetch from network
      return response || fetch(event.request);
    }).catch((error) => {
      console.error('Failed to fetch resource:', error);
    })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const title = data.title || 'Notification';
  const options = {
    body: data.body || 'You have a new message',
    icon: data.icon || '/icons/icon.png',
    badge: data.badge || '/icons/badge.png',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});