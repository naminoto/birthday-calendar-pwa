const SCOPE = self.registration.scope;
const CACHE_PREFIX = 'birthday-circle-shell-' + encodeURIComponent(new URL(SCOPE).pathname) + '-';
const CACHE_NAME = CACHE_PREFIX + '__CACHE_VERSION__';
const PRECACHE = __PRECACHE_JSON__;
const appUrl = (path) => new URL(path, SCOPE).href;
const allowedPaths = new Set(PRECACHE.map((path) => new URL(path, SCOPE).pathname));

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE.map(appUrl))));
  // 利用者が更新ボタンを押すまでは現在の画面を強制置換しません。
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CACHE_NAME') event.ports[0]?.postMessage({ cacheName: CACHE_NAME });
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.open(CACHE_NAME)).match(appUrl('./index.html'))
      || Response.error()));
    return;
  }
  if (!allowedPaths.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(request)) || fetch(request);
  })());
});
