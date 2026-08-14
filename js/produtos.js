const CART_KEY = "panchoCart";

const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(value);
};

const getCart = () => {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch (error) {
        return [];
    }
};

const saveCart = (cart) => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
};

const updateCartBadge = () => {
    const countNode = document.getElementById("cartCount");
    const cart = getCart();
    const total = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

    if (countNode) {
        countNode.textContent = String(total);
    }
};

const addProductToCart = (name, price) => {
    const cart = getCart();
    const product = cart.find((item) => item.name === name);

    if (product) {
        product.quantity += 1;
    } else {
        cart.push({
            name,
            price: Number(price),
            quantity: 1,
            icon: '<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 9h14l-1.2 8.2A2 2 0 0 1 15.9 19H8.1a2 2 0 0 1-2-1.8L5 9Z"/><path d="M8 9V7.2A2.2 2.2 0 0 1 10.2 5h3.6A2.2 2.2 0 0 1 16.4 7.2V9"/><path d="M8 13h8"/></svg></span>'
        });
    }

    saveCart(cart);
    updateCartBadge();
};

const filterProducts = () => {
    const buttons = document.querySelectorAll(".filter-button");
    const searchInput = document.getElementById("searchInput");
    const emptyState = document.getElementById("emptyState");
    const sections = document.querySelectorAll(".product-category");

    if (!buttons.length || !searchInput || !sections.length) {
        return;
    }

    const selectedCategory = document.querySelector(".filter-button.active")?.dataset.category || "todos";
    const query = searchInput.value.trim().toLowerCase();

    let hasVisibleProduct = false;

    sections.forEach((section) => {
        const sectionCategory = section.dataset.section;
        const cards = section.querySelectorAll(".product-card");
        let sectionHasVisibleItem = false;

        cards.forEach((card) => {
            const categoryMatches = selectedCategory === "todos" || card.dataset.category === selectedCategory;
            const productName = (card.dataset.name || "").toLowerCase();
            const searchMatches = !query || productName.includes(query);
            const showCard = categoryMatches && searchMatches;

            card.hidden = !showCard;
            if (showCard) {
                sectionHasVisibleItem = true;
                hasVisibleProduct = true;
            }
        });

        if (sectionHasVisibleItem) {
            section.hidden = false;
        } else {
            section.hidden = true;
        }
    });

    if (emptyState) {
        emptyState.hidden = hasVisibleProduct;
    }
};

const setupProductInteractions = () => {
    document.querySelectorAll(".filter-button").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("active"));
            button.classList.add("active");
            filterProducts();
        });
    });

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", filterProducts);
    }

    document.querySelectorAll(".add-button, .mini-button").forEach((button) => {
        button.addEventListener("click", () => {
            const name = button.dataset.product;
            const price = button.dataset.price;

            if (!name || !price) return;
            addProductToCart(name, price);
        });
    });

    const chips = document.querySelectorAll(".chip");
    chips.forEach((chip) => {
        chip.addEventListener("click", () => {
            const group = chip.parentElement?.querySelectorAll(".chip");
            group?.forEach((item) => item.classList.remove("active"));
            chip.classList.add("active");
        });
    });
};

window.addEventListener("DOMContentLoaded", () => {
    updateCartBadge();
    setupProductInteractions();
    filterProducts();
});
