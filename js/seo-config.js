/* Defina aqui a origem pública final do site, sem barra no fim. */
window.SITE_ORIGIN = "https://SEU-DOMINIO-PUBLICO";

window.applyCanonicalUrl = function (path) {
    if (!window.SITE_ORIGIN || window.SITE_ORIGIN.includes("SEU-DOMINIO-PUBLICO")) return;
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = new URL(path, `${window.SITE_ORIGIN}/`).href;
};
