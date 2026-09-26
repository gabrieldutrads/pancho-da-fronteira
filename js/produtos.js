/* ============================================================
   PANCHO DA FRONTEIRA — PRODUCTS.JS
   Gerenciamento e renderização de produtos e cardápio.
   Suporta dados dinâmicos do Supabase com fallback estático.
============================================================ */

// Dados de fallback locais (caso o Supabase ainda não esteja configurado)
const FALLBACK_CATEGORIES = [
    { id: "panchos", name: "Panchos", icon: '<svg viewBox="0 0 24 24"><path d="M5 9h14l-1.2 8.2A2 2 0 0 1 15.9 19H8.1a2 2 0 0 1-2-1.8L5 9Z"/><path d="M8 9V7.2A2.2 2.2 0 0 1 10.2 5h3.6A2.2 2.2 0 0 1 16.4 7.2V9"/><path d="M8 13h8"/></svg>', label: "Especialidade da casa", description: "Nosso clássico, preparado do jeitinho Pancho da Fronteira." },
    { id: "combos", name: "Combos", icon: '<svg viewBox="0 0 24 24"><path d="M7 8h10l-1 10H8L7 8Z"/><path d="M9 8V5.5a3 3 0 0 1 6 0V8"/><path d="M8 11h8"/></svg>', label: "Para compartilhar", description: "A combinação perfeita para aproveitar com quem você gosta." },
    { id: "bebidas", name: "Bebidas", icon: '<svg viewBox="0 0 24 24"><path d="M7 3h10l-1 15a2 2 0 0 1-2 1.8H10a2 2 0 0 1-2-1.8L7 3Z"/><path d="M10 3V2h4v1"/><path d="M9 8h6"/></svg>', label: "Para acompanhar", description: "Para completar seu pedido com bebidas bem geladas." },
    { id: "promocoes", name: "Promoções", icon: '<svg viewBox="0 0 24 24"><path d="M13.5 2.5c1.4 2 1.7 3.4 1.2 5-.6 1.9-2.3 2.7-3.5 4.1-1.2 1.4-1.2 3.9-.4 5.4 1.7 2.9 5.7 3.1 8.2 1.4 2.7-1.8 3.8-5.1 2.6-8-1.4-3.4-5.3-6.4-7.1-7.9Z"/><path d="M10 13c.5 1.6 1.5 2.6 3 3.3"/></svg>', label: "Aproveita!", description: "Ofertas especiais por tempo limitado." }
];

const FALLBACK_PRODUCTS = [
    { id: "11111111-1111-4111-8111-111111111111", category_slug: "panchos", category_name: "Panchos", name: "Pancho da Casa", description: "Nosso pão artesanal, salsicha premium, salada fresca e molho especial.", price: 24.90, featured: true, badge: "Mais pedido", image_url: null },
    { id: "22222222-2222-4222-8222-222222222222", category_slug: "panchos", category_name: "Panchos", name: "Pancho Especial", description: "Uma combinação especial e marcante para quem ama muito sabor.", price: 27.90, featured: false, badge: null, image_url: null },
    { id: "33333333-3333-4333-8333-333333333333", category_slug: "panchos", category_name: "Panchos", name: "Pancho Bacon", description: "Para quem não abre mão daquele toque defumado e bacon crocante.", price: 28.90, featured: true, badge: "Defumado", image_url: null },
    { id: "44444444-4444-4444-8444-444444444444", category_slug: "combos", category_name: "Combos", name: "Combo Família", description: "4 Panchos da Casa + 4 Bebidas. Uma opção completa para compartilhar.", price: 89.90, featured: true, badge: "Família", image_url: null },
    { id: "55555555-5555-4555-8555-555555555555", category_slug: "combos", category_name: "Combos", name: "Combo Dupla", description: "2 Panchos Especiais + 2 Bebidas para dividir momentos deliciosos.", price: 49.90, featured: false, badge: null, image_url: null },
    { id: "66666666-6666-4666-8666-666666666666", category_slug: "bebidas", category_name: "Bebidas", name: "Refrigerante Lata", description: "Lata gelada 350ml (Coca-Cola, Guaraná, Sprite).", price: 6.00, featured: false, badge: null, image_url: null },
    { id: "77777777-7777-4777-8777-777777777777", category_slug: "bebidas", category_name: "Bebidas", name: "Água Mineral", description: "Garrafa 500ml sem gás.", price: 4.00, featured: false, badge: null, image_url: null },
    { id: "88888888-8888-4888-8888-888888888888", category_slug: "promocoes", category_name: "Promoções", name: "Pancho + Bebida", description: "1 Pancho Especial acompanhado de 1 refrigerante lata bem gelado.", price: 25.90, original_price: 31.90, featured: true, badge: "-20%", image_url: null }
];

/* ----------------------------------------------------------
   OBTER PRODUTOS & CATEGORIAS (com fallback)
---------------------------------------------------------- */
async function loadMenuData() {
    let categories = [];
    let products = [];

    try {
        if (typeof fetchCategories === "function" && typeof fetchProducts === "function") {
            const dbCategories = await fetchCategories();
            const dbProducts = await fetchProducts();

            if (dbCategories && dbCategories.length > 0) {
                categories = dbCategories;
            }
            if (dbProducts && dbProducts.length > 0) {
                products = dbProducts;
            }
        }
    } catch (err) {
        console.warn("[Products] Usando fallback local:", err);
    }

    if (categories.length === 0) categories = FALLBACK_CATEGORIES;
    if (products.length === 0) products = FALLBACK_PRODUCTS;

    return { categories, products };
}

/* ----------------------------------------------------------
   OBTER PRODUTO POR ID OU NOME
---------------------------------------------------------- */
async function getProductDetail(idOrSlug) {
    if (!idOrSlug) return null;

    try {
        if (typeof fetchProductById === "function") {
            const prod = await fetchProductById(idOrSlug);
            if (prod) return prod;
        }
    } catch (e) {
        console.warn("[Products] Buscando no fallback local");
    }

    // Procura no fallback
    const normalizedId = String(idOrSlug).toLowerCase();
    const found = FALLBACK_PRODUCTS.find(p => p.id.toLowerCase() === normalizedId
        || p.name.toLowerCase() === normalizedId);
    return found || null;
}

/* ----------------------------------------------------------
   RENDERIZAR CARDÁPIO COMPLETO (cardapio.html)
---------------------------------------------------------- */
async function renderFullMenu() {
    const categoriesFilterContainer = document.getElementById("categoryFilter");
    const menuContainer = document.getElementById("menuCategoriesContainer");
    const emptyState = document.getElementById("emptyState");

    if (!menuContainer) return;

    const { categories, products } = await loadMenuData();

    // Renderizar Botões de Filtro se o container existir
    if (categoriesFilterContainer) {
        categoriesFilterContainer.innerHTML = `
            <button class="filter-button active" data-category="todos">Todos</button>
            ${categories.map(cat => `
                <button class="filter-button" data-category="${cat.id || cat.name.toLowerCase()}">
                    <span class="icon" aria-hidden="true">${cat.icon && cat.icon.includes('<svg') ? cat.icon : '<svg viewBox="0 0 24 24"><path d="M5 9h14l-1.2 8.2A2 2 0 0 1 15.9 19H8.1a2 2 0 0 1-2-1.8L5 9Z"/><path d="M8 9V7.2A2.2 2.2 0 0 1 10.2 5h3.6A2.2 2.2 0 0 1 16.4 7.2V9"/><path d="M8 13h8"/></svg>'}</span>
                    ${escapeHtml(cat.name)}
                </button>
            `).join("")}
        `;
    }

    // Renderizar Seções de Categorias com Produtos
    menuContainer.innerHTML = categories.map(cat => {
        const catKey = cat.id || cat.name.toLowerCase();
        const catProducts = products.filter(p => {
            if (p.category_id) return p.category_id === cat.id;
            if (p.category_slug) return p.category_slug === catKey;
            if (p.categories?.name) return p.categories.name.toLowerCase() === cat.name.toLowerCase();
            return false;
        });

        if (catProducts.length === 0) return "";

        return `
            <section class="product-category" data-section="${catKey}">
                <div class="category-heading">
                    <div>
                        <span class="category-label">
                            <span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 9h14l-1.2 8.2A2 2 0 0 1 15.9 19H8.1a2 2 0 0 1-2-1.8L5 9Z"/><path d="M8 9V7.2A2.2 2.2 0 0 1 10.2 5h3.6A2.2 2.2 0 0 1 16.4 7.2V9"/><path d="M8 13h8"/></svg></span>
                            ${escapeHtml(cat.label || cat.name)}
                        </span>
                        <h2>${escapeHtml(cat.name)}</h2>
                    </div>
                    ${cat.description ? `<p>${escapeHtml(cat.description)}</p>` : ""}
                </div>

                <div class="products-grid">
                    ${catProducts.map(prod => `
                        <article class="product-card ${prod.original_price ? 'product-card-promotion' : ''}" data-category="${escapeHtml(catKey)}" data-name="${escapeHtml(prod.name)}">
                            <a href="./produto.html?id=${encodeURIComponent(prod.id || prod.name)}" class="product-image-link" aria-label="Ver detalhes de ${escapeHtml(prod.name)}">
                                <div class="product-image">
                                    ${prod.image_url 
                                        ? `<img src="${escapeHtml(prod.image_url)}" alt="${escapeHtml(prod.name)}" loading="lazy">`
                                        : `<div class="product-placeholder"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 9h14l-1.2 8.2A2 2 0 0 1 15.9 19H8.1a2 2 0 0 1-2-1.8L5 9Z"/><path d="M8 9V7.2A2.2 2.2 0 0 1 10.2 5h3.6A2.2 2.2 0 0 1 16.4 7.2V9"/><path d="M8 13h8"/></svg></span></div>`
                                    }
                                    ${prod.badge || prod.featured ? `
                                        <span class="product-badge">
                                            <span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 2.8 2.7 5.4 5.9.9-4.3 4.2 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.4 9.1l5.9-.9L12 2.8Z"/></svg></span>
                                            ${escapeHtml(prod.badge || 'Destaque')}
                                        </span>
                                    ` : ''}
                                </div>
                            </a>

                            <div class="product-info">
                                <a href="./produto.html?id=${encodeURIComponent(prod.id || prod.name)}">
                                    <h3>${escapeHtml(prod.name)}</h3>
                                </a>
                                <p>${escapeHtml(prod.description || '')}</p>

                                <div class="product-bottom">
                                    <div class="price-container">
                                        ${prod.original_price ? `<del>${window.formatPrice ? window.formatPrice(prod.original_price) : 'R$ ' + prod.original_price.toFixed(2)}</del>` : ''}
                                        <strong class="product-price">${window.formatPrice ? window.formatPrice(prod.price) : 'R$ ' + prod.price.toFixed(2)}</strong>
                                    </div>
                                    <button class="add-button" data-id="${escapeHtml(prod.id || '')}" data-product="${escapeHtml(prod.name)}" data-price="${Number(prod.price) || 0}" title="Adicionar ao carrinho" aria-label="Adicionar ${escapeHtml(prod.name)}">
                                        +
                                    </button>
                                </div>
                            </div>
                        </article>
                    `).join("")}
                </div>
            </section>
        `;
    }).join("");

    setupFilterHandlers();
}

/* ----------------------------------------------------------
   FILTRAGEM E BUSCA NO CARDÁPIO
---------------------------------------------------------- */
function setupFilterHandlers() {
    const buttons = document.querySelectorAll(".filter-button");
    const searchInput = document.getElementById("searchInput");
    const emptyState = document.getElementById("emptyState");
    const sections = document.querySelectorAll(".product-category");

    const runFilter = () => {
        const selectedCategory = document.querySelector(".filter-button.active")?.dataset.category || "todos";
        const query = searchInput?.value.trim().toLowerCase() || "";
        let hasVisibleProduct = false;

        sections.forEach(section => {
            const sectionCategory = section.dataset.section;
            const cards = section.querySelectorAll(".product-card");
            let sectionHasVisible = false;

            cards.forEach(card => {
                const categoryMatches = selectedCategory === "todos" || card.dataset.category === selectedCategory || sectionCategory === selectedCategory;
                const productName = (card.dataset.name || "").toLowerCase();
                const searchMatches = !query || productName.includes(query);
                const show = categoryMatches && searchMatches;

                card.hidden = !show;
                if (show) {
                    sectionHasVisible = true;
                    hasVisibleProduct = true;
                }
            });

            section.hidden = !sectionHasVisible;
        });

        if (emptyState) {
            emptyState.hidden = hasVisibleProduct;
        }
    };

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            runFilter();
        });
    });

    if (searchInput) {
        searchInput.addEventListener("input", runFilter);
    }
}

/* ----------------------------------------------------------
   INICIALIZADOR DA PÁGINA DE PRODUTO INDIVIDUAL (produto.html)
---------------------------------------------------------- */
async function initProductDetailPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id") || "1";

    const product = await getProductDetail(productId);
    if (!product) {
        const container = document.getElementById("productDetailContainer");
        if (container) container.innerHTML = '<div class="empty-state"><h2>Produto indisponível</h2><p>Este produto não existe ou não está disponível no momento.</p><a class="btn btn-primary" href="./cardapio.html">Voltar ao cardápio</a></div>';
        return;
    }

    // Atualizar títulos e SEO
    document.title = `${product.name} | Pancho da Fronteira`;
    const nameEls = document.querySelectorAll(".product-detail-name");
    nameEls.forEach(el => el.textContent = product.name);

    const priceEl = document.getElementById("productPrice");
    if (priceEl) priceEl.textContent = window.formatPrice ? window.formatPrice(product.price) : `R$ ${product.price.toFixed(2)}`;

    const descEl = document.getElementById("productDescription");
    if (descEl) descEl.textContent = product.description;

    const visualEl = document.querySelector(".product-visual");
    if (visualEl && product.image_url) {
        const image = document.createElement("img");
        image.src = product.image_url;
        image.alt = product.name;
        image.loading = "eager";
        visualEl.replaceChildren(image);
    }

    const badgeEl = document.getElementById("productBadge");
    if (badgeEl) {
        if (product.badge || product.featured) {
            badgeEl.textContent = product.badge || "Destaque";
            badgeEl.hidden = false;
        } else {
            badgeEl.hidden = true;
        }
    }

    // Botão Adicionar
    const addBtn = document.getElementById("addToCartMainBtn");
    if (addBtn) {
        addBtn.dataset.id = product.id;
        addBtn.dataset.product = product.name;
        addBtn.dataset.price = product.price;

        addBtn.addEventListener("click", () => {
            const qty = parseInt(document.getElementById("productQuantity")?.value || "1", 10);
            if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
                showToast("Escolha uma quantidade entre 1 e 20.", "warning");
                return;
            }
            const notes = document.getElementById("productNotes")?.value.trim() || "";

            // Opções selecionadas (chips ativos)
            const activeOptions = Array.from(document.querySelectorAll(".chip.active")).map(c => c.textContent.trim());
            const fullNotes = [notes, activeOptions.length > 0 ? `Opções: ${activeOptions.join(", ")}` : ""].filter(Boolean).join(" | ");

            if (typeof addToCart === "function") {
                addToCart({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image_url,
                    notes: fullNotes,
                    quantity: qty
                });
                if (typeof showToast === "function") {
                    showToast(`${qty}x ${product.name} adicionado ao carrinho!`, "success");
                }
            }
        });
    }

    // Seleção de Chips (Molhos / Adicionais)
    document.querySelectorAll(".option-chips").forEach(group => {
        group.addEventListener("click", (e) => {
            const chip = e.target.closest(".chip");
            if (!chip) return;
            // Se o grupo permitir múltiplo ou single
            const isSingle = group.dataset.multiple !== "true";
            if (isSingle) {
                group.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
            } else {
                chip.classList.toggle("active");
            }
        });
    });
}

// Auto-inicializar ao carregar
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("menuCategoriesContainer")) {
        renderFullMenu();
    }
    if (document.getElementById("productDetailContainer")) {
        initProductDetailPage();
    }
});

// Expor globalmente
Object.assign(window, {
    loadMenuData,
    getProductDetail,
    renderFullMenu,
    initProductDetailPage
});
