/* ============================================================
   PANCHO DA FRONTEIRA — CART.JS
   Gerenciamento completo do carrinho via localStorage.
   Usa ID do produto (quando disponível) para identificação única.
============================================================ */

const CART_KEY = "panchoCart";

/* ----------------------------------------------------------
   LEITURA / ESCRITA
---------------------------------------------------------- */
function readCart() {
    try {
        const value = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
        if (!Array.isArray(value)) return [];
        return value.filter((item) => item && typeof item === "object")
            .map((item) => ({
                id: typeof item.id === "string" ? item.id : null,
                name: String(item.name || "Produto").slice(0, 160),
                price: Number(item.price),
                image: typeof item.image === "string" ? item.image : null,
                notes: String(item.notes || "").slice(0, 500),
                quantity: Number(item.quantity),
            }))
            .filter((item) => Number.isFinite(item.price) && item.price >= 0
                && Number.isInteger(item.quantity) && item.quantity > 0);
    } catch {
        return [];
    }
}

function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    syncCartBadge?.();
}

/* ----------------------------------------------------------
   ADICIONAR AO CARRINHO
---------------------------------------------------------- */
function addToCart({ id, name, price, image, notes = "", quantity = 1 }) {
    price = Number(price);
    quantity = Number(quantity);
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Produto ou quantidade inválida.");
    }
    name = String(name).slice(0, 160);
    notes = String(notes || "").slice(0, 500);
    const cart = readCart();
    // Chave única = id do produto (se houver) + notes (para mesma observação)
    const key = id ? `${id}::${notes}` : `${name}::${notes}`;
    const existing = cart.find(i => (i.id ? `${i.id}::${i.notes}` : `${i.name}::${i.notes}`) === key);

    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ id: id || null, name, price: Number(price), image: image || null, notes, quantity });
    }
    writeCart(cart);
    return cart;
}

/* ----------------------------------------------------------
   REMOVER DO CARRINHO
---------------------------------------------------------- */
function removeFromCart(cartIndex) {
    const cart = readCart();
    cart.splice(cartIndex, 1);
    writeCart(cart);
}

/* ----------------------------------------------------------
   AJUSTAR QUANTIDADE
---------------------------------------------------------- */
function adjustCartQuantity(cartIndex, delta) {
    const cart = readCart();
    if (!cart[cartIndex]) return;
    cart[cartIndex].quantity += delta;
    if (cart[cartIndex].quantity <= 0) {
        cart.splice(cartIndex, 1);
    }
    writeCart(cart);
}

/* ----------------------------------------------------------
   LIMPAR CARRINHO
---------------------------------------------------------- */
function clearCart() {
    writeCart([]);
}

/* ----------------------------------------------------------
   TOTAIS
---------------------------------------------------------- */
function getCartTotals(deliveryFee = 0) {
    const cart = readCart();
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const fee      = subtotal > 0 ? deliveryFee : 0;
    return { subtotal, deliveryFee: fee, total: subtotal + fee, itemCount: cart.reduce((s, i) => s + i.quantity, 0) };
}

/* ----------------------------------------------------------
   RENDERIZAR CARRINHO (carrinho.html)
---------------------------------------------------------- */
function renderCart(deliveryFee = null) {
    const container    = document.getElementById("cartItems");
    const emptyEl      = document.getElementById("emptyCart");
    const subtotalEl   = document.getElementById("subtotalValue");
    const shippingEl   = document.getElementById("shippingValue");
    const totalEl      = document.getElementById("totalValue");
    const checkoutBtn  = document.getElementById("checkoutBtn");

    if (!container) return;

    const cart = readCart();
    container.innerHTML = "";

    if (cart.length === 0) {
        if (emptyEl) emptyEl.hidden = false;
        if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
        if (emptyEl) emptyEl.hidden = true;
        if (checkoutBtn) checkoutBtn.disabled = false;

        cart.forEach((item, index) => {
            const article = document.createElement("article");
            article.className = "cart-item";
            article.innerHTML = `
                <div class="item-image">
                    ${item.image
                        ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy">`
                        : `<div class="item-placeholder"><svg viewBox="0 0 24 24"><path d="M5 9h14l-1.2 8.2A2 2 0 0 1 15.9 19H8.1a2 2 0 0 1-2-1.8L5 9Z"/><path d="M8 9V7.2A2.2 2.2 0 0 1 10.2 5h3.6A2.2 2.2 0 0 1 16.4 7.2V9"/><path d="M8 13h8"/></svg></div>`
                    }
                </div>
                <div class="item-info">
                    <h3>${escapeHtml(item.name)}</h3>
                    <p class="item-unit-price">${formatPrice(item.price)} cada</p>
                    ${item.notes ? `<p class="item-notes">📝 ${escapeHtml(item.notes)}</p>` : ""}
                    <div class="item-meta">
                        <div class="quantity-controls">
                            <button type="button" class="quantity-btn" data-action="decrease" data-index="${index}" aria-label="Diminuir quantidade">−</button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button type="button" class="quantity-btn" data-action="increase" data-index="${index}" aria-label="Aumentar quantidade">+</button>
                        </div>
                        <button type="button" class="remove-btn" data-action="remove" data-index="${index}" aria-label="Remover ${escapeHtml(item.name)}">
                            <svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 12h8l1-12"/></svg>
                        </button>
                    </div>
                </div>
                <strong class="item-total">${formatPrice(item.price * item.quantity)}</strong>
            `;
            container.appendChild(article);
        });
    }

    // Totais
    const { subtotal, deliveryFee: fee, total } = getCartTotals(deliveryFee ?? 0);
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (shippingEl) shippingEl.textContent = deliveryFee === null ? "Calculada no checkout" : (fee > 0 ? formatPrice(fee) : "Grátis");
    if (totalEl)    totalEl.textContent    = formatPrice(total);

    syncCartBadge?.();
}

/* ----------------------------------------------------------
   INICIALIZAR EVENTOS DO CARRINHO
---------------------------------------------------------- */
function initCartPage() {
    const container = document.getElementById("cartItems");
    if (!container) return;

    container.addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const { action, index } = btn.dataset;
        const idx = parseInt(index, 10);

        if (action === "increase") { adjustCartQuantity(idx, 1); renderCart(); }
        if (action === "decrease") { adjustCartQuantity(idx, -1); renderCart(); }
        if (action === "remove")   {
            const item = readCart()[idx];
            const confirmed = await showConfirm({
                title: "Remover item",
                message: `Deseja remover ${item?.name || "este item"} do carrinho?`,
                confirmText: "Remover",
                danger: true,
            });
            if (!confirmed) return;
            removeFromCart(idx);
            renderCart();
            showToast("Item removido do carrinho.", "info", 2000);
        }
    });

    // Botão limpar carrinho
    const clearBtn = document.getElementById("clearCartBtn");
    if (clearBtn) {
        clearBtn.addEventListener("click", async () => {
            const ok = await showConfirm({
                title: "Limpar carrinho",
                message: "Deseja remover todos os itens do carrinho?",
                confirmText: "Limpar",
                cancelText: "Cancelar",
                danger: true,
            });
            if (ok) { clearCart(); renderCart(); showToast("Carrinho esvaziado.", "info"); }
        });
    }

    // Botão checkout
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", () => {
            const cart = readCart();
            if (cart.length === 0) {
                showToast("Seu carrinho está vazio!", "warning");
                return;
            }
            window.location.href = "/pedido.html";
        });
    }

    renderCart();
}

/* ----------------------------------------------------------
   BOTÃO "ADICIONAR AO CARRINHO" (cardápio e produto)
---------------------------------------------------------- */
function initAddButtons() {
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".add-button, .mini-button");
        if (!btn) return;

        const productId   = btn.dataset.id || null;
        const productName = btn.dataset.product;
        const productPrice = parseFloat(btn.dataset.price);

        if (!productName || isNaN(productPrice)) return;

        addToCart({ id: productId, name: productName, price: productPrice });

        // Feedback visual
        btn.classList.add("added");
        const original = btn.textContent;
        btn.textContent = "✓";
        showToast(`${productName} adicionado ao carrinho!`, "success", 2500);

        setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove("added");
        }, 1200);
    });
}

// Expor globalmente
Object.assign(window, {
    readCart, writeCart, addToCart, removeFromCart,
    adjustCartQuantity, clearCart, getCartTotals,
    renderCart, initCartPage, initAddButtons,
});

// Auto-inicializar
document.addEventListener("DOMContentLoaded", () => {
    initAddButtons();
    if (document.getElementById("cartItems")) {
        initCartPage();
    }
});
