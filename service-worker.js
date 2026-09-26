const CACHE_NAME = "pancho-cache-v2";
const STATIC_ASSETS = [
    "./",
    "./index.html",
    "./cardapio.html",
    "./carrinho.html",
    "./pedido.html",
    "./produto.html",
    "./manifest.json",
    "./assets/icon.svg",
    "./css/global.css",
    "./css/home.css",
    "./css/cardapio.css",
    "./css/carrinho.css",
    "./css/pedido.css",
    "./css/produto.css",
    "./css/auth.css",
    "./js/config.js",
    "./js/supabase.js",
    "./js/auth.js",
    "./js/ui.js",
    "./js/operacoes.js",
    "./js/cart.js",
    "./js/produtos.js",
    "./js/whatsapp.js"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            const assets = STATIC_ASSETS.map(asset => new URL(asset, self.registration.scope).toString());
            return cache.addAll(assets).catch(() => {});
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
