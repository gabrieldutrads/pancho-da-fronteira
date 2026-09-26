/* ============================================================
   PANCHO DA FRONTEIRA Ã¢â‚¬â€ ADMIN.JS
   LÃƒÂ³gica e controladores do Painel Administrativo.
============================================================ */

/* ----------------------------------------------------------
   ESTRUTURA GERAL & SIDEBAR MOBILE & LOGOUT
---------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    const adminMobileToggle = document.getElementById("adminMobileToggle");
    const adminSidebar = document.getElementById("adminSidebar");

    if (adminMobileToggle && adminSidebar) {
        adminMobileToggle.addEventListener("click", () => {
            adminSidebar.classList.toggle("open");
        });
    }

    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            if (typeof signOut === "function") {
                await signOut();
            }
            window.location.href = "./login.html";
        });
    }
});

/* ----------------------------------------------------------
   DASHBOARD (admin/index.html)
---------------------------------------------------------- */
async function initAdminDashboard() {
    try {
        let orders = [];
        let products = [];
        let profiles = [];

        if (typeof adminFetchAllOrders === "function") {
            orders = await adminFetchAllOrders({ limit: 100 });
        }
        if (typeof adminFetchAllProducts === "function") {
            products = await adminFetchAllProducts();
        }
        if (typeof adminFetchAllProfiles === "function") {
            profiles = await adminFetchAllProfiles();
        }

        // EstatÃƒÂ­sticas
        const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelado' ? Number(o.total || 0) : 0), 0);
        const todayStr = new Date().toISOString().split("T")[0];
        const ordersToday = orders.filter(o => o.created_at && o.created_at.startsWith(todayStr)).length;
        const activeProducts = products.filter(p => p.active !== false).length;

        // Atualizar Cards
        const revEl = document.getElementById("dashRevenue");
        if (revEl) revEl.textContent = window.formatPrice ? window.formatPrice(totalRevenue) : `R$ ${totalRevenue.toFixed(2)}`;

        const todayEl = document.getElementById("dashOrdersToday");
        if (todayEl) todayEl.textContent = String(ordersToday);

        const prodEl = document.getElementById("dashProductsCount");
        if (prodEl) prodEl.textContent = String(activeProducts || products.length);

        // Tabela de ÃƒÅ¡ltimos Pedidos no Dashboard
        const tbody = document.getElementById("dashRecentOrdersBody");
        if (tbody) {
            tbody.innerHTML = "";
            const recentOrders = orders.slice(0, 6);

            if (recentOrders.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum pedido recente.</td></tr>`;
            } else {
                recentOrders.forEach(o => {
                    const info = window.getStatusInfo ? window.getStatusInfo(o.status) : { label: o.status, color: 'status-pending' };
                    const itemsSummary = (o.order_items || []).map(i => `${i.quantity}x ${i.product_name}`).join(", ") || "Sem itens";
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td><strong>${escapeHtml(o.order_number || o.id.slice(0,6))}</strong></td>
                        <td>${escapeHtml(o.customer_name)}</td>
                        <td>${escapeHtml(itemsSummary)}</td>
                        <td><strong>${o.total == null ? 'Taxa a confirmar' : (window.formatPrice ? window.formatPrice(o.total) : 'R$ ' + Number(o.total).toFixed(2))}</strong></td>
                        <td><span class="status-badge ${info.color}">${info.label}</span></td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }
    } catch (e) {
        console.warn("[Admin Dashboard] Erro ao carregar mÃƒÂ©tricas:", e);
    }
}

/* ----------------------------------------------------------
   GESTÃƒÆ’O DE PEDIDOS (admin/pedidos.html)
---------------------------------------------------------- */
async function initAdminOrdersPage() {
    const tbody = document.getElementById("ordersTableBody");
    const emptyState = document.getElementById("emptyOrdersState");
    const searchInput = document.getElementById("orderSearchInput");
    const filterSelect = document.getElementById("statusFilterSelect");
    const refreshBtn = document.getElementById("refreshOrdersBtn");

    let allOrders = [];

    async function loadOrders() {
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px;">Carregando pedidos...</td></tr>`;

        try {
            if (typeof adminFetchAllOrders === "function") {
                allOrders = await adminFetchAllOrders({ limit: 100 });
            }
        } catch (err) {
            console.error(err);
            allOrders = [];
        }

        renderOrdersTable();
    }

    function renderOrdersTable() {
        if (!tbody) return;
        const q = searchInput?.value.trim().toLowerCase() || "";
        const st = filterSelect?.value || "all";

        const filtered = allOrders.filter(o => {
            const matchSearch = !q || (o.customer_name && o.customer_name.toLowerCase().includes(q)) || (o.order_number && o.order_number.toLowerCase().includes(q));
            const matchStatus = st === "all" || o.status === st;
            return matchSearch && matchStatus;
        });

        tbody.innerHTML = "";

        if (filtered.length === 0) {
            if (emptyState) emptyState.hidden = false;
            return;
        }

        if (emptyState) emptyState.hidden = true;

        filtered.forEach(o => {
            const info = window.getStatusInfo ? window.getStatusInfo(o.status) : { label: o.status, color: 'status-pending' };
            const itemsText = (o.order_items || []).map(i => `${Number(i.quantity)}x ${escapeHtml(i.product_name)}`).join(", ") || "-";
            const dateStr = window.formatDate ? window.formatDate(o.created_at) : o.created_at;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${escapeHtml(o.order_number || o.id.slice(0,8))}</strong></td>
                <td><small>${dateStr}</small></td>
                <td>${escapeHtml(o.customer_name)}<br><small style="color:var(--color-text-muted);">${escapeHtml(o.customer_phone || '')}</small></td>
                <td><span class="status-badge ${o.delivery_type === 'entrega' ? 'status-confirmed' : 'status-inactive'}">${o.delivery_type === 'entrega' ? 'Ã°Å¸â€ºÂµ Entrega' : 'Ã°Å¸ÂÂ  Retirada'}</span></td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(itemsText)}">${itemsText}</td>
                <td><strong>${o.total == null ? 'Taxa a confirmar' : (window.formatPrice ? window.formatPrice(o.total) : 'R$ ' + o.total)}</strong></td>
                <td>
                    <select class="form-select status-changer" data-order-id="${o.id}" style="padding:4px 8px; font-size:0.8rem; font-weight:600;">
                        <option value="recebido" ${o.status === 'recebido' ? 'selected' : ''}>Ã°Å¸â€œâ€¹ Recebido</option>
                        <option value="confirmado" ${o.status === 'confirmado' ? 'selected' : ''}>Ã¢Å“â€¦ Confirmado</option>
                        <option value="preparando" ${o.status === 'preparando' ? 'selected' : ''}>Ã°Å¸ÂÂ³ Em preparo</option>
                        <option value="pronto" ${o.status === 'pronto' ? 'selected' : ''}>Ã¢Å“â€Ã¯Â¸Â Pronto</option>
                        <option value="saiu_para_entrega" ${o.status === 'saiu_para_entrega' ? 'selected' : ''}>Ã°Å¸â€ºÂµ Saiu p/ Entrega</option>
                        <option value="entregue" ${o.status === 'entregue' ? 'selected' : ''}>Ã°Å¸ÂÂ  Entregue</option>
                        <option value="cancelado" ${o.status === 'cancelado' ? 'selected' : ''}>Ã¢ÂÅ’ Cancelado</option>
                    </select>
                </td>
                <td>
                    <button type="button" class="btn btn-ghost btn-sm view-order-btn" data-order-id="${o.id}">
                        Detalhes
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // MudanÃƒÂ§a de Status
    tbody?.addEventListener("change", async (e) => {
        const select = e.target.closest(".status-changer");
        if (!select) return;

        const orderId = select.dataset.orderId;
        const newStatus = select.value;

        try {
            if (typeof updateOrderStatus === "function") {
                await updateOrderStatus(orderId, newStatus);
                if (typeof showToast === "function") showToast("Status do pedido atualizado!", "success");
                const target = allOrders.find(o => o.id === orderId);
                if (target) target.status = newStatus;
            }
        } catch (err) {
            if (typeof showToast === "function") showToast("Erro ao atualizar status: " + err.message, "error");
        }
    });

    // Abrir Modal de Detalhes
    const modal = document.getElementById("orderDetailModal");
    const modalNum = document.getElementById("modalOrderNum");
    const modalBody = document.getElementById("modalOrderBody");
    const closeModalBtn = document.getElementById("closeOrderModalBtn");

    function closeOrderModal() {
        if (!modal) return;
        modal.hidden = true;
        modalBody.innerHTML = "";
    }

    tbody?.addEventListener("click", (e) => {
        const btn = e.target.closest(".view-order-btn");
        if (!btn) return;
        const orderId = btn.dataset.orderId;
        const order = allOrders.find(o => o.id === orderId);
        if (!order || !modal) return;

        modalNum.textContent = `Pedido ${order.order_number || order.id}`;
        const itemsHtml = (order.order_items || []).map(i => `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--color-border);">
                <div>
                    <strong>${Number(i.quantity)}x ${escapeHtml(i.product_name)}</strong>
                    ${i.notes ? `<br><small style="color:var(--color-text-muted);">Obs: ${escapeHtml(i.notes)}</small>` : ''}
                </div>
                <span>${window.formatPrice ? window.formatPrice(i.subtotal || (i.unit_price * i.quantity)) : 'R$ ' + i.unit_price}</span>
            </div>
        `).join("");

        modalBody.innerHTML = `
            <p><strong>Cliente:</strong> ${escapeHtml(order.customer_name)} (${escapeHtml(order.customer_phone)})</p>
            <p><strong>Forma de Entrega:</strong> ${order.delivery_type === 'entrega' ? 'Ã°Å¸â€ºÂµ Entrega em EndereÃ§o' : 'Ã°Å¸ÂÂ  Retirada no BalcÃƒÂ£o'}</p>
            ${order.address_snapshot ? `
                <div style="background:var(--color-surface-strong); padding:10px; border-radius:var(--radius-sm); margin:10px 0;">
                    <strong>EndereÃ§o de Entrega:</strong><br>
                    ${escapeHtml(order.address_snapshot.street)}, ${escapeHtml(order.address_snapshot.number)} ${order.address_snapshot.complement ? '- ' + escapeHtml(order.address_snapshot.complement) : ''}<br>
                    Bairro: ${escapeHtml(order.address_snapshot.neighborhood)}<br>
                    ${order.address_snapshot.reference ? `<small>Ponto de Ref: ${escapeHtml(order.address_snapshot.reference)}</small>` : ''}
                </div>
            ` : ''}
            <p><strong>Forma de Pagamento:</strong> ${order.payment_method?.toUpperCase()}</p>
            ${order.notes ? `<p><strong>ObservaÃƒÂ§ÃƒÂµes Gerais:</strong> ${escapeHtml(order.notes)}</p>` : ''}
            
            <h4 style="margin:16px 0 8px;">Itens Pedidos:</h4>
            ${itemsHtml}

            <div style="margin-top:16px; text-align:right;">
                <div>Subtotal: ${window.formatPrice ? window.formatPrice(order.subtotal) : 'R$ ' + order.subtotal}</div>
                <div>Taxa de Entrega: ${order.delivery_fee == null ? 'Consultar taxa' : (window.formatPrice ? window.formatPrice(order.delivery_fee) : 'R$ ' + order.delivery_fee)}</div>
                ${order.delivery_fee_status === 'pending' ? `
                    <div style="display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:12px;">
                        <label for="confirmDeliveryFeeInput">Confirmar taxa (R$)</label>
                        <input id="confirmDeliveryFeeInput" type="number" min="0" step="0.01" class="form-input" style="max-width:130px" placeholder="0,00" required>
                        <button type="button" id="confirmDeliveryFeeBtn" class="btn btn-primary btn-sm" data-order-id="${escapeHtml(order.id)}">Salvar taxa</button>
                    </div>
                ` : ''}
                <div style="font-size:1.2rem; font-weight:700; color:var(--color-accent-dark); margin-top:4px;">
                    Total: ${order.total == null ? 'A confirmar' : (window.formatPrice ? window.formatPrice(order.total) : 'R$ ' + order.total)}
                </div>
            </div>
        `;

        modal.hidden = false;
    });

    document.addEventListener("click", async (event) => {
        const confirmFeeButton = event.target.closest("#confirmDeliveryFeeBtn");
        if (confirmFeeButton) {
            const feeInput = document.getElementById("confirmDeliveryFeeInput");
            const target = allOrders.find(order => order.id === confirmFeeButton.dataset.orderId);
            if (!feeInput?.value.trim()) {
                showToast("Informe a taxa confirmada antes de salvar.", "warning");
                return;
            }
            try {
                const updated = await adminConfirmOrderDeliveryFee(confirmFeeButton.dataset.orderId, feeInput?.value);
                if (target) Object.assign(target, updated);
                renderOrdersTable();
                closeOrderModal();
                showToast("Taxa e total do pedido confirmados.", "success");
            } catch (error) {
                showToast("NÃƒÂ£o foi possÃƒÂ­vel confirmar a taxa: " + error.message, "error");
            }
            return;
        }
        if (event.target.closest("#closeOrderModalBtn")) {
            closeOrderModal();
            return;
        }
        if (event.target === modal) closeOrderModal();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal && !modal.hidden) {
            closeOrderModal();
        }
    });

    searchInput?.addEventListener("input", renderOrdersTable);
    filterSelect?.addEventListener("change", renderOrdersTable);
    refreshBtn?.addEventListener("click", loadOrders);

    loadOrders();
}

/* ----------------------------------------------------------
   GESTÃƒÆ’O DE CLIENTES (admin/clientes.html)
---------------------------------------------------------- */
async function initAdminClientsPage() {
    const tbody = document.getElementById("clientsTableBody");
    const searchInput = document.getElementById("clientSearchInput");

    let allProfiles = [];

    async function loadProfiles() {
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px;">Carregando clientes...</td></tr>`;

        try {
            if (typeof adminFetchAllProfiles === "function") {
                allProfiles = await adminFetchAllProfiles();
            }
        } catch (e) {
            allProfiles = [];
        }

        renderProfilesTable();
    }

    function renderProfilesTable() {
        if (!tbody) return;
        const q = searchInput?.value.trim().toLowerCase() || "";
        const filtered = allProfiles.filter(p => !q || (p.nome && p.nome.toLowerCase().includes(q)) || (p.telefone && p.telefone.includes(q)));

        tbody.innerHTML = "";

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Nenhum cliente cadastrado.</td></tr>`;
            return;
        }

        filtered.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${escapeHtml(p.nome || 'Cliente sem nome')}</strong></td>
                <td>${escapeHtml(p.telefone || 'NÃƒÂ£o informado')}</td>
                <td><span class="status-badge ${p.role === 'admin' ? 'status-confirmed' : 'status-inactive'}">${p.role}</span></td>
                <td><small>${window.formatDate ? window.formatDate(p.created_at) : p.created_at}</small></td>
            `;
            tbody.appendChild(tr);
        });
    }

    searchInput?.addEventListener("input", renderProfilesTable);
    loadProfiles();
}

/* ----------------------------------------------------------
   CONFIGURAÃƒâ€¡Ãƒâ€¢ES DA LOJA (admin/configuracoes.html)
---------------------------------------------------------- */
async function initAdminSettingsPage() {
    const form = document.getElementById("storeSettingsForm");
    if (!form) return;

    const byId = id => document.getElementById(id);
    const zonesInput = byId("deliveryZonesConfig");
    const hoursInput = byId("openingHoursConfig");
    const saveButton = form.querySelector('[type="submit"]');
    let operations = await loadOperationalSettings();

    try {
        if (typeof fetchStoreSettings === "function") {
            const settings = await fetchStoreSettings();
            if (settings) {
                if (byId("storeName")) byId("storeName").value = settings.name || "";
                if (byId("storePhone")) byId("storePhone").value = settings.phone || settings.whatsapp || byId("storePhone").value;
                if (byId("storeAddress")) byId("storeAddress").value = settings.address || "";
                if (byId("storeDesc")) byId("storeDesc").value = settings.description || "";
                operations = await loadOperationalSettings(settings);
            }
        }
    } catch (error) {
        console.warn("[Settings] Usando configuraÃ§Ãµes disponÃƒÂ­veis localmente", error);
    }

    if (zonesInput) zonesInput.value = JSON.stringify(operations.delivery_zones, null, 2);
    if (hoursInput) hoursInput.value = JSON.stringify({ opening_hours: operations.opening_hours, opening_exceptions: operations.opening_exceptions }, null, 2);

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!zonesInput || !hoursInput) {
            if (typeof showToast === "function") showToast("NÃƒÂ£o foi possÃƒÂ­vel carregar entrega e horÃ¡rios.", "error");
            return;
        }
        if (saveButton) { saveButton.disabled = true; saveButton.setAttribute("aria-busy", "true"); }

        const name = byId("storeName")?.value.trim() || "";
        const phone = byId("storePhone")?.value.trim() || "";
        const addr = byId("storeAddress")?.value.trim() || "";
        const desc = byId("storeDesc")?.value.trim() || "";
        if (!name) {
            if (typeof showToast === "function") showToast("Informe o nome do estabelecimento.", "warning");
            if (saveButton) { saveButton.disabled = false; saveButton.removeAttribute("aria-busy"); }
            byId("storeName")?.focus();
            return;
        }

        let deliveryZones;
        let schedule;
        try {
            deliveryZones = JSON.parse(zonesInput.value);
            schedule = JSON.parse(hoursInput.value);
            if (!Array.isArray(deliveryZones) || !schedule.opening_hours || !Array.isArray(schedule.opening_exceptions)) throw new Error("Estrutura de zonas ou horÃ¡rios incompleta.");
            if (!deliveryZones.length) throw new Error("Cadastre ao menos uma zona de entrega.");
            const names = new Set();
            const invalidZone = deliveryZones.find(zone => {
                if (!zone || typeof zone.name !== "string" || !zone.name.trim() || !["FREE", "FIXED", "CONSULT"].includes(zone.fee_type)) return true;
                const key = zone.name.trim().toLocaleLowerCase("pt-BR");
                if (names.has(key)) return true;
                names.add(key);
                if (zone.fee_type === "FIXED" && (!Number.isFinite(Number(zone.fee)) || Number(zone.fee) < 0)) return true;
                return zone.aliases !== undefined && !Array.isArray(zone.aliases);
            });
            if (invalidZone) throw new Error("Confira nome, tipo, taxa e aliases das zonas. Os nomes precisam ser diferentes.");
            const requiredDays = ["segunda", "quarta", "quinta", "sexta", "sabado"];
            if (requiredDays.some(day => !schedule.opening_hours[day])) throw new Error("Faltam dias obrigatÃ³rios na configuraÃ§Ã£o dos horÃ¡rios.");
            for (const [day, hours] of Object.entries(schedule.opening_hours)) {
                if (hours?.active === true && ((hours.open && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hours.open)) || (hours.close && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hours.close)))) throw new Error(`HorÃƒÂ¡rio invÃ¡lido em ${day}. Use HH:MM.`);
            }
            for (const exception of schedule.opening_exceptions) {
                if (!exception || (exception.date && !/^\d{4}-\d{2}-\d{2}$/.test(exception.date))) throw new Error("ExceÃ§Ãµes devem conter datas no formato AAAA-MM-DD.");
            }
        } catch (error) {
            if (typeof showToast === "function") showToast("Revise as configuraÃ§Ãµes: " + error.message, "warning", 6000);
            if (saveButton) { saveButton.disabled = false; saveButton.removeAttribute("aria-busy"); }
            return;
        }

        try {
            if (typeof getSupabase === "function" && getSupabase() && typeof adminUpdateStoreSettings === "function") {
                await adminUpdateStoreSettings({
                    name, phone, whatsapp: phone,
                    delivery_zones: deliveryZones,
                    opening_hours: schedule.opening_hours,
                    opening_exceptions: schedule.opening_exceptions,
                    address: addr, description: desc
                });
                operations = await loadOperationalSettings({ delivery_zones: deliveryZones, opening_hours: schedule.opening_hours, opening_exceptions: schedule.opening_exceptions });
                localStorage.setItem("panchoOperations", JSON.stringify(operations));
            } else {
                operations = await saveOperationalSettings({ delivery_zones: deliveryZones, opening_hours: schedule.opening_hours, opening_exceptions: schedule.opening_exceptions });
            }
            if (typeof showToast === "function") showToast("ConfiguraÃ§Ãµes salvas com sucesso!", "success");
        } catch (error) {
            if (typeof showToast === "function") showToast("Erro ao salvar: " + error.message, "error");
        } finally {
            if (saveButton) { saveButton.disabled = false; saveButton.removeAttribute("aria-busy"); }
        }
    });
}
/* ----------------------------------------------------------
   PRODUTOS E CATEGORIAS (sem excluir registros comerciais)
---------------------------------------------------------- */
async function initAdminProductsPage() {
    const form = document.getElementById("adminProductForm");
    const list = document.getElementById("adminProductsList");
    if (!form || !list) return;
    const byId = id => document.getElementById(id);
    const search = byId("productSearchInput");
    let products = [];
    let categories = [];

    function resetForm() {
        form.reset();
        byId("adminProductId").value = "";
        byId("adminProductFormTitle").textContent = "Cadastrar produto";
    }
    function render() {
        const query = search?.value.trim().toLocaleLowerCase("pt-BR") || "";
        const shown = products.filter(product => !query || product.name.toLocaleLowerCase("pt-BR").includes(query));
        byId("productCountTotal").textContent = String(products.length);
        byId("productCountActive").textContent = String(products.filter(product => product.active !== false).length);
        byId("productCountFeatured").textContent = String(products.filter(product => product.featured).length);
        list.innerHTML = shown.length ? shown.map(product => `
            <article class="admin-product-item">
                <div class="admin-product-text"><h3>${escapeHtml(product.name)}</h3>
                <p>${escapeHtml(product.categories?.name || "Sem categoria")} Ã‚Â· ${window.formatPrice(Number(product.price))} Ã‚Â· ${product.active ? "DisponÃƒÂ­vel" : "Desativado"}</p></div>
                <div class="admin-product-actions"><button type="button" class="btn btn-ghost btn-sm" data-edit-product="${escapeHtml(product.id)}">Editar</button>
                <button type="button" class="btn btn-ghost btn-sm" data-toggle-product="${escapeHtml(product.id)}" data-active="${product.active !== false}">${product.active === false ? "Ativar" : "Desativar"}</button></div>
            </article>`).join("") : '<p>Nenhum produto cadastrado.</p>';
    }
    async function reload() {
        try {
            [products, categories] = await Promise.all([adminFetchAllProducts(), adminFetchAllCategories()]);
            byId("adminProductCategory").innerHTML = '<option value="">Sem categoria</option>' + categories.map(category =>
                `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}${category.active === false ? " (inativa)" : ""}</option>`).join("");
            render();
            window.dispatchEvent(new Event("productsChanged"));
        } catch (error) { showToast("NÃƒÂ£o foi possÃƒÂ­vel carregar os produtos: " + error.message, "error"); }
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            const categoryName = byId("adminProductNewCategory").value.trim();
            let categoryId = byId("adminProductCategory").value || null;
            if (categoryName) {
                let category = categories.find(item => item.name.toLocaleLowerCase("pt-BR") === categoryName.toLocaleLowerCase("pt-BR"));
                if (!category) category = await adminUpsertCategory({ name: categoryName, active: true, sort_order: categories.length });
                else if (category.active === false) category = await adminUpsertCategory({ id: category.id, name: category.name, active: true, sort_order: category.sort_order || 0 });
                categoryId = category.id;
            }
            const price = Number(byId("adminProductPrice").value);
            if (!Number.isFinite(price) || price < 0) throw new Error("O preÃƒÂ§o deve ser um valor vÃƒÂ¡lido maior ou igual a zero.");
            const productId = byId("adminProductId").value;
            await adminUpsertProduct({
                ...(productId ? { id: productId } : {}),
                name: byId("adminProductName").value.trim(),
                description: byId("adminProductDescription").value.trim(),
                price,
                category_id: categoryId,
                image_url: byId("adminProductImage").value.trim() || null,
                active: byId("adminProductActive").checked,
                featured: byId("adminProductFeatured").checked
            });
            showToast("Produto salvo no catÃƒÂ¡logo.", "success");
            resetForm();
            await reload();
        } catch (error) { showToast("NÃƒÂ£o foi possÃƒÂ­vel salvar o produto: " + error.message, "error", 6000); }
    });

    list.addEventListener("click", async event => {
        const editButton = event.target.closest("[data-edit-product]");
        const toggleButton = event.target.closest("[data-toggle-product]");
        if (editButton) {
            const product = products.find(item => item.id === editButton.dataset.editProduct);
            if (!product) return;
            byId("adminProductId").value = product.id;
            byId("adminProductName").value = product.name || "";
            byId("adminProductPrice").value = product.price;
            byId("adminProductCategory").value = product.category_id || "";
            byId("adminProductDescription").value = product.description || "";
            byId("adminProductImage").value = product.image_url || "";
            byId("adminProductActive").checked = product.active !== false;
            byId("adminProductFeatured").checked = Boolean(product.featured);
            byId("adminProductFormTitle").textContent = "Editar produto";
            form.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (toggleButton) {
            try {
                const active = toggleButton.dataset.active !== "true";
                await adminSetProductActive(toggleButton.dataset.toggleProduct, active);
                showToast(active ? "Produto reativado." : "Produto desativado no catÃƒÂ¡logo.", "success");
                await reload();
            } catch (error) { showToast("NÃƒÂ£o foi possÃƒÂ­vel alterar a disponibilidade: " + error.message, "error"); }
        }
    });
    search?.addEventListener("input", render);
    byId("cancelProductEdit")?.addEventListener("click", resetForm);
    byId("newProductButton")?.addEventListener("click", () => {
        resetForm();
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        byId("adminProductName").focus();
    });
    await reload();
}

/* ----------------------------------------------------------
   GRUPOS DE OPÃƒâ€¡Ãƒâ€¢ES REUTILIZÃƒÂVEIS (aÃƒÂ§aÃƒÂ­, molhos e adicionais)
---------------------------------------------------------- */
async function initAdminOptionGroupsPage() {
    const groupForm = document.getElementById("optionGroupForm");
    const productForm = document.getElementById("productOptionGroupForm");
    if (!groupForm || !productForm) return;

    const byId = id => document.getElementById(id);
    const groupList = byId("optionGroupsList");
    const linksList = byId("productOptionLinksList");
    const productSelect = byId("optionProductSelect");
    const groupSelect = byId("optionGroupSelect");
    let groups = [];
    let products = [];
    let links = [];

    async function reload() {
        try {
            [groups, products, links] = await Promise.all([
                adminFetchAllOptionGroups(), adminFetchAllProducts(), adminFetchProductOptionLinks()
            ]);
            productSelect.innerHTML = '<option value="">Escolha um produto</option>' + products.map(product =>
                `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)}${product.active === false ? " (inativo)" : ""}</option>`).join("");
            groupSelect.innerHTML = '<option value="">Escolha um grupo ativo</option>' + groups.filter(group => group.active)
                .map(group => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`).join("");
            groupList.innerHTML = groups.length ? groups.map(group => `
                <article class="admin-product-item">
                    <div class="admin-product-text"><h3>${escapeHtml(group.name)}${group.active ? "" : " (inativo)"}</h3>
                    <p>${group.selection_type === "single" ? "Uma escolha" : "MÃƒÂºltiplas escolhas"} Ã‚Â· ${(group.options || []).length} opÃƒÂ§ÃƒÂµes Ã‚Â· ${group.required ? "ObrigatÃƒÂ³rio" : "Opcional"}</p></div>
                    <button type="button" class="btn btn-ghost btn-sm" data-edit-option-group="${escapeHtml(group.id)}">Editar</button>
                </article>`).join("") : '<p>Nenhum grupo cadastrado ainda.</p>';
            linksList.innerHTML = links.length ? links.map(link => `
                <article class="admin-product-item">
                    <div class="admin-product-text"><strong>${escapeHtml(link.products?.name || "Produto")}</strong><p>${escapeHtml(link.option_groups?.name || "Grupo")}</p></div>
                    <button type="button" class="btn btn-ghost btn-sm" data-unlink-product="${escapeHtml(link.product_id)}" data-unlink-group="${escapeHtml(link.group_id)}">Desassociar</button>
                </article>`).join("") : '<p>Nenhuma associaÃƒÂ§ÃƒÂ£o cadastrada.</p>';
        } catch (error) {
            showToast("NÃƒÂ£o foi possÃƒÂ­vel carregar os grupos. Confira se o schema do Supabase foi aplicado: " + error.message, "error", 7000);
        }
    }

    groupList.addEventListener("click", event => {
        const button = event.target.closest("[data-edit-option-group]");
        if (!button) return;
        const group = groups.find(item => item.id === button.dataset.editOptionGroup);
        if (!group) return;
        byId("optionGroupId").value = group.id;
        byId("optionGroupName").value = group.name;
        byId("optionGroupType").value = group.selection_type;
        byId("optionGroupMin").value = group.min_selection;
        byId("optionGroupMax").value = group.max_selection;
        byId("optionGroupRequired").checked = group.required;
        byId("optionGroupActive").checked = group.active;
        byId("optionGroupChoices").value = JSON.stringify(group.options || [], null, 2);
        byId("optionGroupName").focus();
    });

    groupForm.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            const options = JSON.parse(byId("optionGroupChoices").value);
            if (!Array.isArray(options)) throw new Error("As opÃƒÂ§ÃƒÂµes precisam estar em uma lista JSON.");
            await adminUpsertOptionGroup({
                id: byId("optionGroupId").value || null,
                name: byId("optionGroupName").value,
                selection_type: byId("optionGroupType").value,
                min_selection: byId("optionGroupRequired").checked ? Math.max(1, Number(byId("optionGroupMin").value)) : Number(byId("optionGroupMin").value),
                max_selection: Number(byId("optionGroupMax").value),
                required: byId("optionGroupRequired").checked,
                active: byId("optionGroupActive").checked,
                options
            });
            groupForm.reset();
            byId("optionGroupId").value = "";
            byId("optionGroupChoices").value = "";
            showToast("Grupo de opÃƒÂ§ÃƒÂµes salvo.", "success");
            await reload();
        } catch (error) {
            showToast("Confira o grupo: " + error.message, "warning", 6000);
        }
    });

    productForm.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            await adminLinkOptionGroup(productSelect.value, groupSelect.value);
            showToast("Grupo associado ao produto.", "success");
            await reload();
        } catch (error) { showToast(error.message, "warning"); }
    });

    linksList.addEventListener("click", async event => {
        const button = event.target.closest("[data-unlink-product]");
        if (!button) return;
        try {
            await adminUnlinkOptionGroup(button.dataset.unlinkProduct, button.dataset.unlinkGroup);
            showToast("Grupo desassociado.", "success");
            await reload();
        } catch (error) { showToast(error.message, "error"); }
    });

    await reload();
    window.addEventListener("productsChanged", reload);
}

// Expor controladores
Object.assign(window, {
    initAdminDashboard,
    initAdminOrdersPage,
    initAdminClientsPage,
    initAdminSettingsPage,
    initAdminProductsPage,
    initAdminOptionGroupsPage
});
