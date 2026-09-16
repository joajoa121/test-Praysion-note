const APP_VERSION = "1.0.84-visual-viewport-shell";
const CACHE_NAME = `irum-prayer-v${APP_VERSION}`;

const CORE_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./core.js",
  "./lock.js",
  "./settings.js",
  "./router.js",
  "./topbar.js",
  "./pwa.js",
  "./prayer.js",
  "./category.js",
  "./backup.js",
  "./bootstrap.js",
  "./assets/local-icons.css",
  "./assets/app.css"
];

const OPTIONAL_REMOTE_FILES = [
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
  "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.34.1/dist/tabler-icons.min.css"
];

async function cacheFilesIndividually(cache, files) {
  await Promise.all(files.map(async file => {
    try {
      await cache.add(file);
    } catch (error) {
      console.warn("Optional cache entry skipped:", file, error);
    }
  }));
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(CORE_FILES);
      await cacheFilesIndividually(cache, OPTIONAL_REMOTE_FILES);
    })
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, isNavigation) {
  try {
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (isNavigation) return caches.match("./index.html");
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return networkFirst(request, false);
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = request.mode === "navigate";
  const isStaticAsset = isSameOrigin && !isNavigation;
  const isTablerAsset = url.hostname === "cdn.jsdelivr.net" &&
    url.pathname.includes("/@tabler/icons-webfont@3.34.1/");
  const isGoogleFontAsset = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

  event.respondWith(
    (isStaticAsset || isTablerAsset || isGoogleFontAsset)
      ? cacheFirst(request)
      : networkFirst(request, isNavigation)
  );
});
