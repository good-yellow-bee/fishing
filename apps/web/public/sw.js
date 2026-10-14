// Stillwater's service worker: keeps the app shell and the built assets so the lake and the
// field log open without a network. The API is never cached; catches queue offline on their own.
const SHELL = "stillwater-shell-v1";
const ASSETS = "stillwater-assets-v1";
const MAX_ASSETS = 120;
const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

// How a request is served: "skip" leaves it to the browser, "page" tries the network and falls back
// to the cached shell, "asset" serves hashed builds from cache, "static" serves from cache and refreshes.
function cachePlan(url, method, mode, origin) {
  if (method !== "GET") return "skip";
  const { origin: from, pathname } = new URL(url);
  if (from !== origin) return "skip";
  if (pathname.startsWith("/api/")) return "skip";
  if (mode === "navigate") return "page";
  if (pathname.startsWith("/assets/")) return "asset";
  if (/^\/(models|textures|env|icons)\//.test(pathname) || pathname === "/manifest.webmanifest") return "static";
  return "skip";
}

async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(key);
}

async function page(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL);
      await cache.put("/", response.clone());
    }
    return response;
  } catch (error) {
    const shell = await caches.match("/", { cacheName: SHELL });
    if (shell) return shell;
    throw error;
  }
}

async function asset(request) {
  const cached = await caches.match(request, { cacheName: ASSETS });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSETS);
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

async function fresh(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
        await trim(cache);
      }
      return response;
    })
    .catch(() => undefined);
  if (cached) return cached;
  const response = await update;
  if (response) return response;
  return Response.error();
}

self.cachePlan = cachePlan;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== SHELL && name !== ASSETS).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const plan = cachePlan(event.request.url, event.request.method, event.request.mode, self.location.origin);
  if (plan === "page") event.respondWith(page(event.request));
  else if (plan === "asset") event.respondWith(asset(event.request));
  else if (plan === "static") event.respondWith(fresh(event.request));
});
