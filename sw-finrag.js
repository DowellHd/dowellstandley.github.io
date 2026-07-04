// Minimal service worker — exists to satisfy PWA installability criteria
// (Android requires an active service worker for the install prompt to fire).
// It intentionally does no caching: FinRAG's demo hits a live API and
// shouldn't ever serve stale responses.

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});
