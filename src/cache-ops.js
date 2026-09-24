export const SHELL_PREFIX = 'birthday-circle-shell-';

export function obsoleteCacheNames(names, activeName) {
  const prefix = activeName?.match(/^(birthday-circle-shell-.+-)[0-9a-f]{16}$/)?.[1];
  return prefix ? names.filter((name) => name.startsWith(prefix) && name !== activeName) : [];
}

async function activeCacheName() {
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return null;
  return new Promise((resolve) => {
    const channel = new MessageChannel(); const timer = setTimeout(() => resolve(null), 1200);
    channel.port1.onmessage = (event) => { clearTimeout(timer); resolve(event.data?.cacheName ?? null); };
    controller.postMessage({ type: 'CACHE_NAME' }, [channel.port2]);
  });
}

// 現在のアプリシェルと他アプリのCacheは保持し、IndexedDBには一切触れません。
export async function clearOldShellCaches() {
  if (!('caches' in globalThis)) return 0;
  const active = await activeCacheName();
  if (!active) return 0;
  const obsolete = obsoleteCacheNames(await caches.keys(), active);
  await Promise.all(obsolete.map((name) => caches.delete(name)));
  return obsolete.length;
}

export async function cacheBytes() {
  if (!('caches' in globalThis)) return 0;
  const active = await activeCacheName();
  const prefix = active?.match(/^(birthday-circle-shell-.+-)[0-9a-f]{16}$/)?.[1];
  if (!prefix) return 0;
  let bytes = 0;
  for (const name of (await caches.keys()).filter((key) => key.startsWith(prefix))) {
    const cache = await caches.open(name);
    for (const request of await cache.keys()) {
      const response = await cache.match(request);
      bytes += (await response.clone().arrayBuffer()).byteLength;
    }
  }
  return bytes;
}
