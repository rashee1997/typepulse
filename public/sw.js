// Minimal offline shell cache: cache-first for hashed Next.js static assets,
// network-first (falling back to cache) for everything else (HTML/API/etc).
// ponytail: single-cache static-shell strategy is the ceiling; add versioned
// runtime caches / Workbox only if richer offline routing is ever requested.
//
// Bump CACHE_NAME whenever the strategy changes: `activate` deletes every cache
// that does not match, which is what evicts entries stored by an older build.
const CACHE_NAME = 'runewright-shell-v2';

/**
 * Store a response only when the server says it may be cached.
 *
 * The Cache API ignores `Cache-Control`, so an unguarded `cache.put` happily
 * stores responses the server marked `no-store`. `next dev` serves chunks from
 * stable, un-hashed paths with exactly that header, so caching them makes a
 * later page load pair a pre-refactor bundle with a fresh webpack runtime —
 * surfacing in the browser as `__webpack_require__.n is not a function`.
 * Production chunks are hashed and immutable, so they are still cached.
 */
function cacheIfStorable(request, response) {
  const cacheControl = response.headers.get('cache-control') || '';
  if (!response.ok || /no-store|no-cache/.test(cacheControl)) return;
  const clone = response.clone();
  caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(request, clone))
    .catch(() => {});
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isStaticAsset = url.pathname.startsWith('/_next/static/');

  if (isStaticAsset) {
    // Cache-first: hashed filenames never change content.
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            cacheIfStorable(request, response);
            return response;
          })
      )
    );
    return;
  }

  // Network-first for HTML/navigation and everything else; cache fallback when offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        cacheIfStorable(request, response);
        return response;
      })
      .catch(() => caches.match(request))
  );
});
