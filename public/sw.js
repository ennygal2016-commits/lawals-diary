/* Lawal's diary service worker — offline handling for the app shell.
 *
 * Privacy rule: nothing private is ever cached. Pages (HTML) always come from the network; when the network is
 * down, the precached /offline page is shown instead. Only build assets (/_next/static — hashed, public code and
 * fonts), the icons and the offline page itself are cached. API routes, auth, Supabase (other origin) and signed
 * photo URLs are never touched.
 */
const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const STATIC = `static-${VERSION}`;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL && k !== STATIC).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network only; offline → the offline page. Never stored.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () => (await caches.match("/offline", { cacheName: SHELL })) ?? Response.error(),
      ),
    );
    return;
  }

  // Hashed build assets: cache first (they never change under the same URL).
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request)));
  }
  // Everything else (API, auth, images, RSC payloads) goes straight to the network.
});
