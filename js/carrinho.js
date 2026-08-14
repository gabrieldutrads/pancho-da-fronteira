const cartStorageKey = "panchoCart";

const readCart = () => {
    try {
        return JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
    } catch (error) {
        return [];
    }
};

const writeCart = (cart) => {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
};

const updateCartBadge = () => {
    const cartBadge = document.getElementById("cartCount");
    if (!cartBadge) return;

    const total = readCart().reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    cartBadge.textContent = String(total);
};

const formatPrice = (value) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(value);

const renderCart = () => {
    const cartItemsContainer = document.getElementById("cartItems");
    const emptyCart = document.getElementById("emptyCart");
    const subtotalValue = document.getElementById("subtotalValue");
    const shippingValue = document.getElementById("shippingValue");
    const totalValue = document.getElementById("totalValue");

    if (!cartItemsContainer) return;

    const cart = readCart();
    cartItemsContainer.innerHTML = "";

    if (!cart.length) {
        if (emptyCart) emptyCart.hidden = false;
        cartItemsContainer.innerHTML = "";
    } else if (emptyCart) {
        emptyCart.hidden = true;
    }

    cart.forEach((item) => {
        const row = document.createElement("article");
        row.className = "cart-item";
        row.dataset.name = item.name;
        row.innerHTML = `
            <div class="item-emoji">${item.icon || "🌭"}</div>
            <div class="item-info">
                <h3>${item.name}</h3>
                <p>${formatPrice(item.price)} cada</p>
                <div class="item-meta">
                    <div class="quantity-controls">
                        <button type="button" class="quantity-button" data-action="decrease" data-name="${item.name}">−</button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button type="button" class="quantity-button" data-action="increase" data-name="${item.name}">+</button>
                    </div>
                    <button type="button" class="remove-button" data-action="remove" data-name="${item.name}">×</button>
                </div>
            </div>
            <strong class="item-price">${formatPrice(item.price * item.quantity)}</strong>
        `;
        cartItemsContainer.appendChild(row);
    });

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal > 0 ? 6.9 : 0;
    const total = subtotal + shipping;

    if (subtotalValue) subtotalValue.textContent = formatPrice(subtotal);
    if (shippingValue) shippingValue.textContent = formatPrice(shipping);
    if (totalValue) totalValue.textContent = formatPrice(total);

    updateCartBadge();
};

const adjustQuantity = (name, delta) => {
    const cart = readCart();
    const target = cart.find((item) => item.name === name);
    if (!target) return;

    target.quantity += delta;
    if (target.quantity <= 0) {
        const filtered = cart.filter((item) => item.name !== name);
        writeCart(filtered);
        renderCart();
        return;
    }

    writeCart(cart);
    renderCart();
};

const removeItem = (name) => {
    const cart = readCart().filter((item) => item.name !== name);
    writeCart(cart);
    renderCart();
};

window.addEventListener("DOMContentLoaded", () => {
    const cartItemsContainer = document.getElementById("cartItems");
    if (!cartItemsContainer) return;

    cartItemsContainer.addEventListener("click", (event) => {
        const target = event.target.closest("button");
        if (!target) return;

        const action = target.dataset.action;
        const name = target.dataset.name;

        if (action === "increase") adjustQuantity(name, 1);
        if (action === "decrease") adjustQuantity(name, -1);
        if (action === "remove") removeItem(name);
    });

    renderCart();
});
