// Minimal service worker — required by Chrome/Edge/Android for
// installability. Does not cache anything yet; just needs to exist
// and be registered so the browser treats Gathrd as an installable PWA.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Pass-through for now — no offline caching yet.
});
