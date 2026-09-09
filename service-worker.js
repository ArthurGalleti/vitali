const CACHE_NAME = "vitalia-v3";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json"
];

// ======================================================
// INSTALAÇÃO
// ======================================================

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(FILES_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// ======================================================
// ATIVAÇÃO
// ======================================================

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => caches.delete(name))
                );
            })
            .then(() => self.clients.claim())
    );
});

// ======================================================
// FETCH
// ======================================================

self.addEventListener("fetch", event => {

    // Só intercepta requisições GET.
    // POST, PUT, DELETE etc. continuam normalmente.
    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {

                // Só salva respostas válidas no cache.
                if (
                    response &&
                    response.status === 200 &&
                    response.type !== "opaque"
                ) {
                    const responseClone = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseClone);
                        });
                }

                return response;
            })
            .catch(() => {
                // Se estiver offline, tenta usar o cache.
                return caches.match(event.request);
            })
    );
});