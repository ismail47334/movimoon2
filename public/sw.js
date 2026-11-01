// MoviMoon - Combined SW: Ad Network + PWA (v35)

// --- 1. YOUR AD NETWORK CODE - DO NOT REMOVE ---
self.options = {
  "domain": "3nbf4.com",
  "zoneId": 11982654
}
self.lary = ""
try {
  importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')
} catch(e) {
  console.log('Ad SW failed', e)
}

// --- 2. PWA CODE FOR APP ---
const CACHE_NAME = 'movimoon-v35-pwa';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/logo.svg',
  '/css/style.css',
  '/js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE).catch(()=>{})).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
    }).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Skip TMDB API and functions - always network
  if (event.request.url.includes('/api/') || event.request.url.includes('3nbf4.com')) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then(res => res || caches.match('/')))
  );
});
