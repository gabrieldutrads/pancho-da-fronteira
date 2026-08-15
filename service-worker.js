const CACHE_NAME = "pancho-cache-v1";
const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/cardapio.html",
    "/carrinho.html",
    "/css/global.css",
    "/css/home.css",
    "/css/cardapio.css",
    "/css/carrinho.css",
    "/js/main.js",
    "/js/cart.js"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => {});
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    // Permitir requisições de API e Supabase passarem direto pela rede
    if (event.request.url.includes("supabase.co") || event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
