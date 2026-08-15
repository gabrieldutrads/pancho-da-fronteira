/* ============================================================
   PANCHO DA FRONTEIRA — UI.JS
   Componentes de UI: toasts, modais, loading, skeletons.
============================================================ */

/* ----------------------------------------------------------
   TOAST NOTIFICATIONS
---------------------------------------------------------- */
let _toastContainer = null;

function getToastContainer() {
    if (_toastContainer) return _toastContainer;
    _toastContainer = document.createElement("div");
    _toastContainer.id = "toastContainer";
    _toastContainer.setAttribute("aria-live", "polite");
    _toastContainer.setAttribute("aria-atomic", "true");
    document.body.appendChild(_toastContainer);
    return _toastContainer;
}

/**
 * Exibir toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration em ms
 */
function showToast(message, type = "info", duration = 3500) {
    const container = getToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "alert");

    const icons = {
        success: `<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>`,
        error:   `<svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
        info:    `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
        warning: `<svg viewBox="0 0 24 24"><path d="m21.7 18-9-15.5a1 1 0 0 0-1.7 0l-9 15.5A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .7-1.5Z"/><path d="M12 10v4"/><path d="M12 16h.01"/></svg>`,
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Fechar">&times;</button>
    `;

    const close = () => {
        toast.classList.add("toast-hiding");
        toast.addEventListener("animationend", () => toast.remove(), { once: true });
    };

    toast.querySelector(".toast-close").addEventListener("click", close);
    container.appendChild(toast);

    // Auto-fechar
    setTimeout(close, duration);
    return toast;
}

window.showToast = showToast;

/* ----------------------------------------------------------
   MODAL DE CONFIRMAÇÃO
---------------------------------------------------------- */
function showConfirm({ title = "Confirmar ação", message, confirmText = "Confirmar",
    cancelText = "Cancelar", danger = false }) {
    return new Promise((resolve) => {
        // Remover modal anterior se existir
        document.getElementById("confirmModal")?.remove();

        const overlay = document.createElement("div");
        overlay.id = "confirmModal";
        overlay.className = "modal-overlay";
        overlay.innerHTML = `
            <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
                <h3 id="confirmTitle">${title}</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="confirmCancel">${cancelText}</button>
                    <button class="btn ${danger ? "btn-danger" : "btn-primary"}" id="confirmOk">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const cleanup = (result) => {
            overlay.classList.add("modal-hiding");
            overlay.addEventListener("animationend", () => overlay.remove(), { once: true });
            resolve(result);
        };

        overlay.querySelector("#confirmOk").addEventListener("click", () => cleanup(true));
        overlay.querySelector("#confirmCancel").addEventListener("click", () => cleanup(false));
        overlay.addEventListener("click", (e) => { if (e.target === overlay) cleanup(false); });

        // Focar botão de confirmação
        requestAnimationFrame(() => overlay.querySelector("#confirmOk").focus());
    });
}

window.showConfirm = showConfirm;

/* ----------------------------------------------------------
   LOADING STATE (spinner global)
---------------------------------------------------------- */
let _loadingEl = null;

function showLoading(message = "Carregando...") {
    if (_loadingEl) return;
    _loadingEl = document.createElement("div");
    _loadingEl.id = "globalLoading";
    _loadingEl.setAttribute("aria-label", message);
    _loadingEl.innerHTML = `<div class="loading-spinner"></div><span>${message}</span>`;
    document.body.appendChild(_loadingEl);
}

function hideLoading() {
    if (!_loadingEl) return;
    _loadingEl.remove();
    _loadingEl = null;
}

window.showLoading = showLoading;
window.hideLoading = hideLoading;

/* ----------------------------------------------------------
   SKELETON LOADER
---------------------------------------------------------- */
function createSkeleton(className = "skeleton-card", count = 3) {
    return Array.from({ length: count }, () => {
        const el = document.createElement("div");
        el.className = `skeleton ${className}`;
        return el;
    });
}

window.createSkeleton = createSkeleton;

/* ----------------------------------------------------------
   FORMATAÇÃO
---------------------------------------------------------- */
const formatPrice = (value) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);

const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
};

window.formatPrice = formatPrice;
window.formatDate  = formatDate;

/* ----------------------------------------------------------
   STATUS DO PEDIDO — label e cor
---------------------------------------------------------- */
const ORDER_STATUS_MAP = {
    recebido:          { label: "Recebido",          color: "status-pending",    emoji: "📋" },
    confirmado:        { label: "Confirmado",         color: "status-confirmed",  emoji: "✅" },
    preparando:        { label: "Em preparo",         color: "status-preparing",  emoji: "🍳" },
    pronto:            { label: "Pronto",             color: "status-ready",      emoji: "✔️" },
    saiu_para_entrega: { label: "Saiu para entrega",  color: "status-delivery",   emoji: "🛵" },
    entregue:          { label: "Entregue",           color: "status-delivered",  emoji: "🏠" },
    cancelado:         { label: "Cancelado",          color: "status-cancelled",  emoji: "❌" },
};

function getStatusInfo(status) {
    return ORDER_STATUS_MAP[status] || { label: status, color: "status-pending", emoji: "❓" };
}

window.ORDER_STATUS_MAP = ORDER_STATUS_MAP;
window.getStatusInfo    = getStatusInfo;

/* ----------------------------------------------------------
   EMPTY STATE
---------------------------------------------------------- */
function createEmptyState({ icon = "🍽️", title = "Nada por aqui", message = "", actionText, actionHref } = {}) {
    const el = document.createElement("div");
    el.className = "empty-state";
    el.innerHTML = `
        <div class="empty-state-icon">${icon}</div>
        <h3>${title}</h3>
        ${message ? `<p>${message}</p>` : ""}
        ${actionText && actionHref ? `<a href="${actionHref}" class="btn btn-primary">${actionText}</a>` : ""}
    `;
    return el;
}

window.createEmptyState = createEmptyState;

/* ----------------------------------------------------------
   MENU MOBILE (header)
---------------------------------------------------------- */
function initMobileMenu() {
    const toggle = document.getElementById("menuToggle");
    const nav    = document.getElementById("navMenu");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    });

    // Fechar ao clicar em link
    nav.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            nav.classList.remove("open");
            toggle.setAttribute("aria-expanded", "false");
        });
    });

    // Fechar ao clicar fora
    document.addEventListener("click", (e) => {
        if (!nav.contains(e.target) && !toggle.contains(e.target)) {
            nav.classList.remove("open");
            toggle.setAttribute("aria-expanded", "false");
        }
    });
}

window.initMobileMenu = initMobileMenu;

/* ----------------------------------------------------------
   SCROLL DO HEADER
---------------------------------------------------------- */
function initHeaderScroll() {
    const header = document.getElementById("header") || document.querySelector(".header");
    if (!header) return;
    const onScroll = () => {
        header.classList.toggle("header-scrolled", window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
}

window.initHeaderScroll = initHeaderScroll;

/* ----------------------------------------------------------
   BADGE DO CARRINHO
---------------------------------------------------------- */
function syncCartBadge() {
    const badge = document.getElementById("cartCount");
    if (!badge) return;
    try {
        const cart  = JSON.parse(localStorage.getItem("panchoCart") || "[]");
        const total = cart.reduce((s, i) => s + Number(i.quantity || 1), 0);
        badge.textContent = String(total);
        badge.style.display = total > 0 ? "flex" : "none";
    } catch {
        badge.textContent = "0";
    }
}

window.syncCartBadge = syncCartBadge;

// Auto-sync ao carregar e ao mudar storage
document.addEventListener("DOMContentLoaded", () => {
    initMobileMenu();
    initHeaderScroll();
    syncCartBadge();
});
window.addEventListener("storage", syncCartBadge);
