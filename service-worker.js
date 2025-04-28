importScripts('/scripts/idb.js');
importScripts('/scripts/utils.js');

const CACHE_NAME = 'pwa-coppercloud-cache-v6';
const urlsToCache = [
  '/',
  '/login.html',
  '/index.html',
  '/scripts/idb.js',
  '/scripts/app.js',
  '/scripts/utils.js',
  '/scripts/login.js',
  '/scripts/permissions.js',
  '/styles/style.css',
  '/styles/login.css',
  "https://unpkg.com/html5-qrcode",
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


// Activate event
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('[ServiceWorker] Deleting cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
  return self.clients.claim();
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


// Receives push notifications from push API
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  const data = event.data.json();
  const title = data.title || 'Notification';
  const options = {
    body: data.body || 'You have a new message',
    icon: '/icons/icon.png',
    badge: '/icons/icon.png',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});


// useful when adding action option in push-notifications
self.addEventListener('notification-click', (event) => {
  var notification = event.notification;
  var action = event.action;
  // console.log(notification);
  if (action === 'confirm') {
    // console.log('Confirm was chosen');
    notification.close();
  }
  else {
    // console.log(action);
    notification.close();
  }
});

// useful when notification was closed without clicking on it
self.addEventListener('notificationclose', (event) => {
  // console.log('Notification was closed', event);
});