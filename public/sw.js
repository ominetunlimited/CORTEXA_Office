/* CORTEXA service worker — app-shell cache + offline fallback.
   Strategy:
   - Install: warm the shell cache (best-effort; never blocks activation).
   - Navigation requests: network-first, fall back to the cached shell offline.
   - Same-origin hashed assets: cache-first with background refresh.
   - A new deployment activates immediately (skipWaiting) and claims clients
     (clientsClaim) so users are never stranded on a stale cached build.
   Everything resolves relative to the worker's own scope, so the worker is
   safe whether CORTEXA is hosted at a domain root or a sub-path.           */

const CACHE = 'cortexa-shell-v3';

self.addEventListener('install', (event) => {
  const shell = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        /* best-effort warm-up — individual misses must not fail the install */
        Promise.allSettled(shell.map((url) => cache.add(url).catch(() => undefined)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;

  // App navigations: try the network (always fresh), fall back to the shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => undefined);
          return res;
        })
        .catch(() =>
          caches.match('./index.html').then((hit) => hit || caches.match('./'))
        )
    );
    return;
  }

  // Static assets (content-hashed by the build): cache-first + refresh.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
