// Beddel version-kan markaad koodh cusub diraysid si uu cache-gii hore toos u tirtiro
const CACHE_NAME = 'adcon-v1.1.0';

// Faylasha loo baahan yahay in lagu kaydiyo cache-ka
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './logo.jpeg',
  './logo.jpg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 1. INSTALL EVENT - Kaydinta faylasha & Khasab shaqo gelinta Service Worker-ka cusub
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing new SW version...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting()) // Khasab ku samee in uu toos u shaqeeyo
  );
});

// 2. ACTIVATE EVENT - Tirtirida dhammaan cache-yadii hore
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating new SW version...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Toos ugu xidh dhammaan tabs-ka furan
  );
});

// 3. FETCH EVENT - Network First (Toos ugu xidh Netlify si updates-ka laga helo)
self.addEventListener('fetch', (event) => {
  // Ka dhaaf Firebase ama APIs
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebase')) {
    return;
  }

  event.respondWith(
    // 1. Ugu horrayn ka soo hag Netlify (Network)
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 2. Haddii uu Internet-ku go'an yahay keliya ka soo akhriso Cache-ga
        console.log('[Service Worker] Fetching from offline cache...');
        return caches.match(event.request);
      })
  );
});