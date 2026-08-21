/*
 * The offline shell. Stale-while-revalidate over same origin GETs, so a
 * student who has opened the app once can open the periodic table on a train.
 *
 * No precache manifest on purpose: Vite content-hashes every chunk, so a
 * static list in this file goes stale on every build. Caching what the page
 * actually fetched is the boring version that cannot drift. The cache name
 * carries a version so a future change here can drop the old one cleanly.
 */

const CACHE = "blueberry-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
