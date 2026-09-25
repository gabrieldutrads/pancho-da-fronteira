/* ============================================================
   PANCHO DA FRONTEIRA — ADMIN.JS
   Lógica e controladores do Painel Administrativo.
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

        // Estatísticas
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

        // Tabela de Últimos Pedidos no Dashboard
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
                        <td><strong>${o.order_number || o.id.slice(0,6)}</strong></td>
                        <td>${o.customer_name}</td>
                        <td>${itemsSummary}</td>
                        <td><strong>${window.formatPrice ? window.formatPrice(o.total) : 'R$ ' + Number(o.total).toFixed(2)}</strong></td>
                        <td><span class="status-badge ${info.color}">${info.label}</span></td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }
    } catch (e) {
        console.warn("[Admin Dashboard] Erro ao carregar métricas:", e);
    }
}

/* ----------------------------------------------------------
   GESTÃO DE PEDIDOS (admin/pedidos.html)
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
            const itemsText = (o.order_items || []).map(i => `${i.quantity}x ${i.product_name}`).join(", ") || "-";
            const dateStr = window.formatDate ? window.formatDate(o.created_at) : o.created_at;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${o.order_number || o.id.slice(0,8)}</strong></td>
                <td><small>${dateStr}</small></td>
                <td>${o.customer_name}<br><small style="color:var(--color-text-muted);">${o.customer_phone || ''}</small></td>
                <td><span class="status-badge ${o.delivery_type === 'entrega' ? 'status-confirmed' : 'status-inactive'}">${o.delivery_type === 'entrega' ? '🛵 Entrega' : '🏠 Retirada'}</span></td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${itemsText}">${itemsText}</td>
                <td><strong>${window.formatPrice ? window.formatPrice(o.total) : 'R$ ' + o.total}</strong></td>
                <td>
                    <select class="form-select status-changer" data-order-id="${o.id}" style="padding:4px 8px; font-size:0.8rem; font-weight:600;">
                        <option value="recebido" ${o.status === 'recebido' ? 'selected' : ''}>📋 Recebido</option>
                        <option value="confirmado" ${o.status === 'confirmado' ? 'selected' : ''}>✅ Confirmado</option>
                        <option value="preparando" ${o.status === 'preparando' ? 'selected' : ''}>🍳 Em preparo</option>
                        <option value="pronto" ${o.status === 'pronto' ? 'selected' : ''}>✔️ Pronto</option>
                        <option value="saiu_para_entrega" ${o.status === 'saiu_para_entrega' ? 'selected' : ''}>🛵 Saiu p/ Entrega</option>
                        <option value="entregue" ${o.status === 'entregue' ? 'selected' : ''}>🏠 Entregue</option>
                        <option value="cancelado" ${o.status === 'cancelado' ? 'selected' : ''}>❌ Cancelado</option>
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

    // Mudança de Status
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
                    <strong>${i.quantity}x ${i.product_name}</strong>
                    ${i.notes ? `<br><small style="color:var(--color-text-muted);">Obs: ${i.notes}</small>` : ''}
                </div>
                <span>${window.formatPrice ? window.formatPrice(i.subtotal || (i.unit_price * i.quantity)) : 'R$ ' + i.unit_price}</span>
            </div>
        `).join("");

        modalBody.innerHTML = `
            <p><strong>Cliente:</strong> ${order.customer_name} (${order.customer_phone})</p>
            <p><strong>Forma de Entrega:</strong> ${order.delivery_type === 'entrega' ? '🛵 Entrega em Endereço' : '🏠 Retirada no Balcão'}</p>
            ${order.address_snapshot ? `
                <div style="background:var(--color-surface-strong); padding:10px; border-radius:var(--radius-sm); margin:10px 0;">
                    <strong>Endereço de Entrega:</strong><br>
                    ${order.address_snapshot.street}, ${order.address_snapshot.number} ${order.address_snapshot.complement ? '- ' + order.address_snapshot.complement : ''}<br>
                    Bairro: ${order.address_snapshot.neighborhood}<br>
                    ${order.address_snapshot.reference ? `<small>Ponto de Ref: ${order.address_snapshot.reference}</small>` : ''}
                </div>
            ` : ''}
            <p><strong>Forma de Pagamento:</strong> ${order.payment_method?.toUpperCase()}</p>
            ${order.notes ? `<p><strong>Observações Gerais:</strong> ${order.notes}</p>` : ''}
            
            <h4 style="margin:16px 0 8px;">Itens Pedidos:</h4>
            ${itemsHtml}

            <div style="margin-top:16px; text-align:right;">
                <div>Subtotal: ${window.formatPrice ? window.formatPrice(order.subtotal) : 'R$ ' + order.subtotal}</div>
                <div>Taxa de Entrega: ${window.formatPrice ? window.formatPrice(order.delivery_fee) : 'R$ ' + order.delivery_fee}</div>
                <div style="font-size:1.2rem; font-weight:700; color:var(--color-accent-dark); margin-top:4px;">
                    Total: ${window.formatPrice ? window.formatPrice(order.total) : 'R$ ' + order.total}
                </div>
            </div>
        `;

        modal.hidden = false;
    });

    document.addEventListener("click", (event) => {
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
   GESTÃO DE CLIENTES (admin/clientes.html)
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
                <td><strong>${p.nome || 'Cliente sem nome'}</strong></td>
                <td>${p.telefone || 'Não informado'}</td>
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
   CONFIGURAÇÕES DA LOJA (admin/configuracoes.html)
---------------------------------------------------------- */
async function initAdminSettingsPage() {
    const form = document.getElementById("storeSettingsForm");
    if (!form) return;

    try {
        if (typeof fetchStoreSettings === "function") {
            const settings = await fetchStoreSettings();
            if (settings) {
                if (document.getElementById("storeName")) document.getElementById("storeName").value = settings.name || "";
                if (document.getElementById("storePhone")) document.getElementById("storePhone").value = settings.phone || settings.whatsapp || "";
                if (document.getElementById("storeDeliveryFee")) document.getElementById("storeDeliveryFee").value = settings.delivery_fee || 6.90;
                if (document.getElementById("storeAddress")) document.getElementById("storeAddress").value = settings.address || "";
                if (document.getElementById("storeDesc")) document.getElementById("storeDesc").value = settings.description || "";
            }
        }
    } catch (e) {
        console.warn("[Settings] Usando padrões");
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("storeName").value.trim();
        const phone = document.getElementById("storePhone").value.trim();
        const fee = parseFloat(document.getElementById("storeDeliveryFee").value) || 0;
        const addr = document.getElementById("storeAddress").value.trim();
        const desc = document.getElementById("storeDesc").value.trim();

        try {
            if (typeof adminUpdateStoreSettings === "function") {
                await adminUpdateStoreSettings({
                    name,
                    phone,
                    whatsapp: phone,
                    delivery_fee: fee,
                    address: addr,
                    description: desc
                });
                if (typeof showToast === "function") showToast("Configurações salvas com sucesso!", "success");
            }
        } catch (err) {
            if (typeof showToast === "function") showToast("Erro ao salvar: " + err.message, "error");
        }
    });
}

// Expor controladores
Object.assign(window, {
    initAdminDashboard,
    initAdminOrdersPage,
    initAdminClientsPage,
    initAdminSettingsPage
});
