/* Chillout service worker — çevrimdışı kabuk önbelleği.
   Yalnızca aynı-köken GET istekleri yönetilir; Firebase/Firestore, hava durumu,
   önizleme ve favicon gibi dış kaynaklar dokunulmadan ağa gider. */

const VERSION = "chillout-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icon.svg"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname === "/icon.svg" ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Dış kaynaklara (Firebase, open-meteo, thum.io, gstatic, mp3 vb.) karışma
  if (url.origin !== self.location.origin) {
    return;
  }

  // Müzik/video gibi büyük medya akışlarını önbelleğe alma (Range istekleri)
  if (url.pathname.startsWith("/music/") || /\.(?:mp4|mp3|webm)$/.test(url.pathname)) {
    return;
  }

  // Sayfa gezinmeleri: önce ağ, çevrimdışıysa kabuk
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(OFFLINE_URL, copy));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL).then((r) => r || caches.match(request)))
    );
    return;
  }

  // Statik varlıklar: stale-while-revalidate
  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
