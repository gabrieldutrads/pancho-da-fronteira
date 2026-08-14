const adminMobileToggle = document.getElementById("adminMobileToggle");
const adminSidebar = document.getElementById("adminSidebar");

if (adminMobileToggle && adminSidebar) {
    adminMobileToggle.addEventListener("click", () => {
        adminSidebar.classList.toggle("open");
    });
}

const logoutButton = document.getElementById("logoutButton");
if (logoutButton) {
    logoutButton.addEventListener("click", () => {
        window.location.href = "./login.html";
    });
}

const loginForm = document.querySelector(".login-form");
if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        window.location.href = "./index.html";
    });
}

const categoryModal = document.getElementById("categoryModal");
const categoryForm = document.getElementById("categoryForm");
const categorySearch = document.getElementById("categorySearch");
const statusFilter = document.getElementById("statusFilter");
const categoriesGrid = document.getElementById("categoriesGrid");
const emptyCategories = document.getElementById("emptyCategories");

if (categoryModal && categoryForm && categoriesGrid) {
    const openModal = () => {
        categoryModal.classList.add("open");
        categoryModal.setAttribute("aria-hidden", "false");
    };

    const closeModal = () => {
        categoryModal.classList.remove("open");
        categoryModal.setAttribute("aria-hidden", "true");
        categoryForm.reset();
    };

    document.getElementById("newCategoryButton")?.addEventListener("click", openModal);
    document.getElementById("modalClose")?.addEventListener("click", closeModal);
    document.getElementById("cancelModal")?.addEventListener("click", closeModal);
    document.getElementById("modalOverlay")?.addEventListener("click", closeModal);

    categoryForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const nameInput = document.getElementById("categoryName");
        const descriptionInput = document.getElementById("categoryDescription");
        const iconInput = document.getElementById("categoryIcon");
        const statusInput = document.getElementById("categoryStatus");

        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim() || "Categoria do cardápio.";
        const icon = iconInput.value.trim() || '<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 9h14l-1.2 8.2A2 2 0 0 1 15.9 19H8.1a2 2 0 0 1-2-1.8L5 9Z"/><path d="M8 9V7.2A2.2 2.2 0 0 1 10.2 5h3.6A2.2 2.2 0 0 1 16.4 7.2V9"/><path d="M8 13h8"/></svg></span>';
        const status = statusInput.value;

        if (!name) return;

        const card = document.createElement("article");
        card.className = "admin-category-card";
        card.dataset.name = name;
        card.dataset.status = status;
        card.innerHTML = `
            <div class="admin-category-header">
                <div class="admin-category-icon">${icon}</div>
                <button type="button" class="category-more-button" aria-label="Mais opções">⋮</button>
            </div>
            <div class="admin-category-body">
                <div class="admin-category-title-row">
                    <h3>${name}</h3>
                    <span class="status-badge ${status === "active" ? "status-active" : "status-inactive"}">${status === "active" ? "Ativa" : "Inativa"}</span>
                </div>
                <p>${description}</p>
            </div>
            <div class="admin-category-footer">
                <span class="product-count">${icon}<strong>0</strong> produtos</span>
                <div class="category-actions">
                    <button type="button" class="icon-action" title="Editar categoria" data-action="edit"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 17.5V20h2.5L17 9.5l-2.5-2.5L4 17.5Z"/><path d="M14.5 5.5l2.5 2.5"/></svg></span></button>
                    <button type="button" class="icon-action icon-action-danger" title="Excluir categoria" data-action="delete"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 12h8l1-12"/><path d="M10 11v5"/><path d="M14 11v5"/></svg></span></button>
                </div>
            </div>
        `;

        categoriesGrid.appendChild(card);
        closeModal();
        applyCategoryFilters();
    });

    const applyCategoryFilters = () => {
        const searchTerm = categorySearch?.value.trim().toLowerCase() || "";
        const selectedStatus = statusFilter?.value || "all";
        const cards = [...categoriesGrid.querySelectorAll(".admin-category-card")];
        let visibleCount = 0;

        cards.forEach((card) => {
            const matchesSearch = !searchTerm || card.dataset.name.toLowerCase().includes(searchTerm);
            const matchesStatus = selectedStatus === "all" || card.dataset.status === selectedStatus;
            const shouldShow = matchesSearch && matchesStatus;
            card.hidden = !shouldShow;
            if (shouldShow) visibleCount += 1;
        });

        if (emptyCategories) {
            emptyCategories.hidden = visibleCount > 0;
        }
    };

    categorySearch?.addEventListener("input", applyCategoryFilters);
    statusFilter?.addEventListener("change", applyCategoryFilters);

    categoriesGrid.addEventListener("click", (event) => {
        const btn = event.target.closest("button");
        if (!btn) return;

        const card = btn.closest(".admin-category-card");
        if (!card) return;

        if (btn.dataset.action === "delete") {
            if (confirm("Deseja excluir esta categoria?")) {
                card.remove();
                applyCategoryFilters();
            }
        }
    });
}

if (document.querySelector(".admin-table")) {
    const searchInput = document.querySelector(".admin-search input");
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const term = searchInput.value.trim().toLowerCase();
            const rows = document.querySelectorAll(".admin-table tbody tr");
            rows.forEach((row) => {
                const text = row.textContent.toLowerCase();
                row.hidden = term.length > 0 && !text.includes(term);
            });
        });
    }
}
