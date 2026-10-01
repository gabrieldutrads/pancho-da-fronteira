/* ============================================================
   PANCHO DA FRONTEIRA ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ADMIN.JS
   LÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³gica e controladores do Painel Administrativo.
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

        // EstatÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­sticas
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

        // Tabela de ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ltimos Pedidos no Dashboard
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
        console.warn("[Admin Dashboard] Erro ao carregar mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©tricas:", e);
    }
}

/* ----------------------------------------------------------
   GESTÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢O DE PEDIDOS (admin/pedidos.html)
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
                <td><span class="status-badge ${o.delivery_type === 'entrega' ? 'status-confirmed' : 'status-inactive'}">${o.delivery_type === 'entrega' ? 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµ Entrega' : 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  Retirada'}</span></td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(itemsText)}">${itemsText}</td>
                <td><strong>${o.total == null ? 'Taxa a confirmar' : (window.formatPrice ? window.formatPrice(o.total) : 'R$ ' + o.total)}</strong></td>
                <td>
                    <select class="form-select status-changer" data-order-id="${o.id}" style="padding:4px 8px; font-size:0.8rem; font-weight:600;">
                        <option value="recebido" ${o.status === 'recebido' ? 'selected' : ''}>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¹ Recebido</option>
                        <option value="confirmado" ${o.status === 'confirmado' ? 'selected' : ''}>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Confirmado</option>
                        <option value="preparando" ${o.status === 'preparando' ? 'selected' : ''}>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ Em preparo</option>
                        <option value="pronto" ${o.status === 'pronto' ? 'selected' : ''}>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Pronto</option>
                        <option value="saiu_para_entrega" ${o.status === 'saiu_para_entrega' ? 'selected' : ''}>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµ Saiu p/ Entrega</option>
                        <option value="entregue" ${o.status === 'entregue' ? 'selected' : ''}>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  Entregue</option>
                        <option value="cancelado" ${o.status === 'cancelado' ? 'selected' : ''}>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Cancelado</option>
                    </select>
                </td>
                <td>
                    <button type="button" class="btn btn-ghost btn-sm view-order-btn" data-order-id="${o.id}">
                        Detalhes
                    </button>
                </td>
            `;
            const deliveryBadge = tr.querySelector(".status-badge");
            if (deliveryBadge) deliveryBadge.textContent = o.delivery_type === "entrega" ? "Entrega" : "Retirada";
            const statusLabels = {
                recebido: "Recebido",
                confirmado: "Confirmado",
                preparando: "Em preparo",
                pronto: "Pronto",
                saiu_para_entrega: "Saiu para entrega",
                entregue: "Entregue",
                cancelado: "Cancelado"
            };
            const validNextStatuses = new Set(["cancelado"]);
            if (["recebido", "confirmado"].includes(o.status)) validNextStatuses.add("preparando");
            if (o.status === "preparando") validNextStatuses.add("pronto");
            if (o.status === "pronto") validNextStatuses.add(o.delivery_type === "entrega" ? "saiu_para_entrega" : "entregue");
            if (o.status === "saiu_para_entrega") validNextStatuses.add("entregue");
            if (["entregue", "cancelado"].includes(o.status)) validNextStatuses.add(o.status);
            tr.querySelectorAll(".status-changer option").forEach(option => {
                option.textContent = statusLabels[option.value] || option.value;
                option.disabled = !validNextStatuses.has(option.value);
            });
            tbody.appendChild(tr);
        });
    }

    // MudanÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§a de Status
    tbody?.addEventListener("change", async (e) => {
        const select = e.target.closest(".status-changer");
        if (!select) return;

        const orderId = select.dataset.orderId;
        const newStatus = select.value;
        const target = allOrders.find(o => o.id === orderId);
        const previousStatus = target?.status || "recebido";
        let cancelReason = null;

        if (newStatus === "cancelado") {
            cancelReason = typeof requestCancelReason === "function"
                ? await requestCancelReason(target?.order_number || orderId.slice(0, 8))
                : window.prompt("Informe o motivo do cancelamento:");
            if (!cancelReason) {
                select.value = previousStatus;
                return;
            }
        }

        try {
            if (typeof updateOrderStatus === "function") {
                const notification = await updateOrderStatus(orderId, newStatus, cancelReason);
                if (typeof showToast === "function") showToast("Status do pedido atualizado!", "success");
            if (notification?.status === "not_configured" && typeof showToast === "function") showToast("WhatsApp sem configuração ativa; nenhuma mensagem foi enviada.", "warning", 6000);
            if (notification?.status === "failed" && typeof showToast === "function") showToast("Status atualizado, mas a mensagem do WhatsApp falhou.", "warning", 6000);
                if (target) target.status = newStatus;
            }
        } catch (err) {
            select.value = previousStatus;
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
            <p><strong>Forma de Entrega:</strong> ${order.delivery_type === 'entrega' ? 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµ Entrega em EndereÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o' : 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  Retirada no BalcÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o'}</p>
            ${order.address_snapshot ? `
                <div style="background:var(--color-surface-strong); padding:10px; border-radius:var(--radius-sm); margin:10px 0;">
                    <strong>EndereÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o de Entrega:</strong><br>
                    ${escapeHtml(order.address_snapshot.street)}, ${escapeHtml(order.address_snapshot.number)} ${order.address_snapshot.complement ? '- ' + escapeHtml(order.address_snapshot.complement) : ''}<br>
                    Bairro: ${escapeHtml(order.address_snapshot.neighborhood)}<br>
                    ${order.address_snapshot.reference ? `<small>Ponto de Ref: ${escapeHtml(order.address_snapshot.reference)}</small>` : ''}
                </div>
            ` : ''}
            <p><strong>Forma de Pagamento:</strong> ${order.payment_method?.toUpperCase()}</p>
            ${order.notes ? `<p><strong>ObservaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes Gerais:</strong> ${escapeHtml(order.notes)}</p>` : ''}
            
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

        const deliveryLine = Array.from(modalBody.querySelectorAll("p")).find(line => line.textContent.includes("Forma de Entrega:"));
        if (deliveryLine) deliveryLine.innerHTML = `<strong>Forma de entrega:</strong> ${order.delivery_type === "entrega" ? "Entrega em endereco" : "Retirada no balcao"}`;
        const addressHeading = Array.from(modalBody.querySelectorAll("strong")).find(label => label.textContent.startsWith("Endere"));
        if (addressHeading) addressHeading.textContent = "Endereco de entrega:";
        const notesHeading = Array.from(modalBody.querySelectorAll("strong")).find(label => label.textContent.startsWith("Observ"));
        if (notesHeading) notesHeading.textContent = "Observacoes gerais:";

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
                showToast("NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o foi possÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­vel confirmar a taxa: " + error.message, "error");
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
   GESTÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢O DE CLIENTES (admin/clientes.html)
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
                <td>${escapeHtml(p.telefone || 'Não informado')}</td>
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

    const byId = id => document.getElementById(id);
    const zonesList = byId("deliveryZonesList");
    const hoursList = byId("openingHoursList");
    const exceptionsList = byId("openingExceptionsList");
    const paymentMethodsList = byId("paymentMethodsList");
    const saveButton = form.querySelector('[type="submit"]');
    const weekdays = [
        { key: "segunda", label: "Segunda-feira" },
        { key: "terca", label: "Terça-feira", fixedClosed: true },
        { key: "quarta", label: "Quarta-feira" },
        { key: "quinta", label: "Quinta-feira" },
        { key: "sexta", label: "Sexta-feira" },
        { key: "sabado", label: "Sábado" },
        { key: "domingo", label: "Domingo", fixedClosed: true }
    ];
    let operations = await loadOperationalSettings();
    let paymentMethods = [
        { id: "dinheiro", label: "Dinheiro" }, { id: "pix", label: "PIX" },
        { id: "cartao_debito", label: "Cartão de débito" }, { id: "cartao_credito", label: "Cartão de crédito" },
    ];
    let whatsappSettings = { provider: "meta", enabled: false, language: "pt_BR", templates: {} };
    const whatsappEvents = [["recebido", "Pedido recebido"], ["preparando", "Em preparo"], ["pronto", "Pronto / retirada"], ["saiu_para_entrega", "Saiu para entrega"], ["entregue", "Finalizado"], ["cancelado", "Cancelado"]];
    function renderPaymentMethods() {
        const enabled = new Set(paymentMethods.filter(method => method.enabled !== false).map(method => method.id));
        paymentMethodsList.innerHTML = paymentMethods.map(method => `<label class="settings-payment-method"><input type="checkbox" data-payment-method="${escapeHtml(method.id)}"${enabled.has(method.id) ? " checked" : ""}>${escapeHtml(method.label)}</label>`).join("");
    }
    function renderWhatsappSettings() {
        byId("whatsappEnabled").checked = Boolean(whatsappSettings.enabled);
        byId("whatsappTemplates").innerHTML = whatsappEvents.map(([id,label]) => `<div class="form-group"><label class="settings-editor-toggle"><input type="checkbox" data-whatsapp-event="${id}"${whatsappSettings.events?.[id] === false ? "" : " checked"}> Enviar: ${label}</label><label for="whatsappTemplate-${id}">Template aprovado</label><input id="whatsappTemplate-${id}" class="form-input" data-whatsapp-template="${id}" maxlength="100" value="${escapeHtml(whatsappSettings.templates?.[id] || "")}" placeholder="Nome cadastrado na Meta"></div>`).join("");
    }

    function updateDeliveryZoneRow(row) {
        const feeType = row.querySelector("[data-zone-fee-type]").value;
        const feeInput = row.querySelector("[data-zone-fee]");
        row.querySelector("[data-zone-fee-field]").hidden = feeType !== "FIXED";
        feeInput.disabled = feeType !== "FIXED";
        feeInput.required = feeType === "FIXED";
    }

    function renderDeliveryZones(zones) {
        zonesList.innerHTML = zones.map((zone, index) => `
            <article class="settings-editor-item" data-zone-row>
                <div class="settings-editor-item-heading"><strong>Bairro ${index + 1}</strong><button type="button" class="btn btn-ghost btn-sm" data-remove-zone>Remover</button></div>
                <div class="settings-zone-fields">
                    <div class="form-group"><label class="form-label" for="zoneName${index}">Nome do bairro</label><input id="zoneName${index}" class="form-input" data-zone-name required maxlength="100" value="${escapeHtml(zone.name || "")}" placeholder="Ex.: Centro"></div>
                    <div class="form-group"><label class="form-label" for="zoneAliases${index}">Outros nomes (opcional)</label><input id="zoneAliases${index}" class="form-input" data-zone-aliases value="${escapeHtml((zone.aliases || []).join(", "))}" placeholder="Ex.: Centro, Centro da cidade"></div>
                    <div class="form-group"><label class="form-label" for="zoneFeeType${index}">Taxa de entrega</label><select id="zoneFeeType${index}" class="form-select" data-zone-fee-type><option value="FREE"${zone.fee_type === "FREE" ? " selected" : ""}>Grátis</option><option value="FIXED"${zone.fee_type === "FIXED" ? " selected" : ""}>Valor fixo</option><option value="CONSULT"${zone.fee_type === "CONSULT" ? " selected" : ""}>Confirmar com o cliente</option></select></div>
                    <div class="form-group" data-zone-fee-field><label class="form-label" for="zoneFee${index}">Valor (R$)</label><input id="zoneFee${index}" class="form-input" data-zone-fee type="number" min="0" step="0.01" value="${Number(zone.fee) || 0}"></div>
                    <label class="settings-editor-toggle"><input type="checkbox" data-zone-active${zone.active !== false ? " checked" : ""}> Bairro disponível para entrega</label>
                </div>
            </article>`).join("");
        zonesList.querySelectorAll("[data-zone-row]").forEach(updateDeliveryZoneRow);
    }

    function readDeliveryZones() {
        return Array.from(zonesList.querySelectorAll("[data-zone-row]"), row => {
            const feeType = row.querySelector("[data-zone-fee-type]").value;
            return {
                name: row.querySelector("[data-zone-name]").value.trim(),
                aliases: row.querySelector("[data-zone-aliases]").value.split(",").map(alias => alias.trim()).filter(Boolean),
                fee_type: feeType,
                fee: feeType === "FIXED" ? Number(row.querySelector("[data-zone-fee]").value) : feeType === "FREE" ? 0 : null,
                active: row.querySelector("[data-zone-active]").checked
            };
        });
    }

    function updateOpeningDay(row) {
        if (row.dataset.fixedClosed === "true") return;
        const open = row.querySelector("[data-day-status]").value === "open";
        row.querySelectorAll("[data-day-time]").forEach(input => {
            input.disabled = !open;
            input.required = false;
        });
    }

    function renderOpeningHours(hours) {
        hoursList.innerHTML = weekdays.map(day => {
            const schedule = hours[day.key] || {};
            const status = day.key === "segunda" && schedule.configured !== true ? "unset" : schedule.active === true ? "open" : "closed";
            return `
                <div class="settings-hours-row" data-opening-day="${day.key}" data-fixed-closed="${Boolean(day.fixedClosed)}">
                    <strong>${day.label}</strong>
                    ${day.fixedClosed ? '<span class="settings-day-closed">Fechado automaticamente</span>' : `<select class="form-select" data-day-status aria-label="Funcionamento ${day.label}">${day.key === "segunda" ? `<option value="unset"${status === "unset" ? " selected" : ""}>Ainda não configurado</option>` : ""}<option value="open"${status === "open" ? " selected" : ""}>Aberto</option><option value="closed"${status === "closed" ? " selected" : ""}>Fechado</option></select>`}
                    ${day.fixedClosed ? '<span class="settings-day-closed">Não recebe pedidos</span>' : `<label>Abre <input class="form-input" type="time" data-day-time="open" aria-label="Abre ${day.label}" value="${escapeHtml(schedule.open || "")}"></label><label>Fecha <input class="form-input" type="time" data-day-time="close" aria-label="Fecha ${day.label}" value="${escapeHtml(schedule.close || "")}"></label>`}
                </div>`;
        }).join("");
        hoursList.querySelectorAll("[data-opening-day]").forEach(updateOpeningDay);
    }

    function readOpeningHours() {
        return Object.fromEntries(weekdays.map(day => {
            const row = hoursList.querySelector(`[data-opening-day="${day.key}"]`);
            if (day.fixedClosed) return [day.key, { active: false, open: null, close: null }];
            const status = row.querySelector("[data-day-status]").value;
            if (status === "unset") return [day.key, { active: null, configured: false, open: null, close: null }];
            return [day.key, {
                active: status === "open",
                ...(day.key === "segunda" ? { configured: true } : {}),
                open: row.querySelector('[data-day-time="open"]').value || null,
                close: row.querySelector('[data-day-time="close"]').value || null
            }];
        }));
    }

    function renderOpeningExceptions(exceptions) {
        const dates = exceptions;
        exceptionsList.innerHTML = dates.length ? dates.map((exception, index) => `
            <div class="settings-exception-row" data-exception-row>
                <div class="form-group"><label class="form-label" for="openingException${index}">Data em que a loja ficará fechada</label><input id="openingException${index}" class="form-input" type="date" data-exception-date required value="${escapeHtml(exception.date)}"></div>
                <button type="button" class="btn btn-ghost btn-sm" data-remove-exception>Remover</button>
            </div>`).join("") : '<p class="settings-empty-state">Nenhuma data especial cadastrada.</p>';
    }

    function readOpeningExceptions() {
        return Array.from(exceptionsList.querySelectorAll("[data-exception-row]"), row => ({
            date: row.querySelector("[data-exception-date]").value,
            active: false
        }));
    }

    try {
        if (typeof fetchStoreSettings === "function") {
            const settings = await fetchStoreSettings();
            if (settings) {
                if (byId("storeName")) byId("storeName").value = settings.name || "";
                if (byId("storePhone")) byId("storePhone").value = settings.phone || settings.whatsapp || byId("storePhone").value;
                if (byId("storeAddress")) byId("storeAddress").value = settings.address || "";
                if (byId("storeDesc")) byId("storeDesc").value = settings.description || "";
                if (Array.isArray(settings.payment_methods)) paymentMethods = settings.payment_methods;
                if (settings.whatsapp_settings) whatsappSettings = settings.whatsapp_settings;
                operations = await loadOperationalSettings(settings);
            }
        }
    } catch (error) {
        console.warn("[Settings] Using available configuration", error);
    }

    renderDeliveryZones(operations.delivery_zones);
    renderOpeningHours(operations.opening_hours);
    renderOpeningExceptions(operations.opening_exceptions.filter(exception => exception?.date));
    renderPaymentMethods();
    renderWhatsappSettings();

    zonesList.addEventListener("change", event => {
        if (!event.target.matches("[data-zone-fee-type]")) return;
        updateDeliveryZoneRow(event.target.closest("[data-zone-row]"));
    });
    zonesList.addEventListener("click", event => {
        if (!event.target.closest("[data-remove-zone]")) return;
        const zones = readDeliveryZones();
        zones.splice(Array.from(zonesList.querySelectorAll("[data-zone-row]")).indexOf(event.target.closest("[data-zone-row]")), 1);
        renderDeliveryZones(zones);
    });
    byId("addDeliveryZoneButton").addEventListener("click", () => {
        const zones = readDeliveryZones();
        zones.push({ name: "", aliases: [], fee_type: "FREE", fee: 0, active: true });
        renderDeliveryZones(zones);
        zonesList.lastElementChild?.querySelector("[data-zone-name]").focus();
    });

    hoursList.addEventListener("change", event => {
        if (!event.target.matches("[data-day-status]")) return;
        updateOpeningDay(event.target.closest("[data-opening-day]"));
    });
    byId("addOpeningExceptionButton").addEventListener("click", () => {
        const exceptions = readOpeningExceptions();
        exceptions.push({ date: "", active: false });
        renderOpeningExceptions(exceptions);
        exceptionsList.lastElementChild?.querySelector("[data-exception-date]").focus();
    });
    exceptionsList.addEventListener("click", event => {
        if (!event.target.closest("[data-remove-exception]")) return;
        const exceptions = readOpeningExceptions();
        exceptions.splice(Array.from(exceptionsList.querySelectorAll("[data-exception-row]")).indexOf(event.target.closest("[data-exception-row]")), 1);
        renderOpeningExceptions(exceptions);
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!zonesList || !hoursList || !exceptionsList) {
            if (typeof showToast === "function") showToast("Não foi possível carregar as configurações de entrega e horário.", "error");
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
            if (!paymentMethodsList.querySelector("[data-payment-method]:checked")) throw new Error("Mantenha pelo menos uma forma de pagamento ativa.");
            deliveryZones = readDeliveryZones();
            schedule = { opening_hours: readOpeningHours(), opening_exceptions: readOpeningExceptions() };
            if (!deliveryZones.length) throw new Error("Cadastre ao menos uma zona de entrega.");
            const names = new Set();
            const invalidZone = deliveryZones.find(zone => {
                if (!zone || typeof zone.name !== "string" || !zone.name.trim() || !["FREE", "FIXED", "CONSULT"].includes(zone.fee_type)) return true;
                const key = zone.name.trim().toLocaleLowerCase("pt-BR");
                if (names.has(key)) return true;
                names.add(key);
                if (zone.fee_type === "FIXED" && (!Number.isFinite(Number(zone.fee)) || Number(zone.fee) < 0)) return true;
                return !Array.isArray(zone.aliases) || zone.aliases.some(alias => typeof alias !== "string");
            });
            if (invalidZone) throw new Error("Confira os nomes, tipos de taxa e valores. Não repita nomes de bairros.");
            if (weekdays.some(day => !schedule.opening_hours[day.key])) throw new Error("Confira os horários de todos os dias.");
            for (const [day, hours] of Object.entries(schedule.opening_hours)) {
                if (hours?.active === true && ((hours.open && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hours.open)) || (hours.close && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hours.close)))) {
                    throw new Error(`Informe horários válidos para ${day}.`);
                }
            }
            const exceptionDates = new Set();
            for (const exception of schedule.opening_exceptions) {
                if (!exception.date || !/^\d{4}-\d{2}-\d{2}$/.test(exception.date)) throw new Error("Informe uma data válida para cada exceção.");
                if (exceptionDates.has(exception.date)) throw new Error("Não repita a mesma data nas exceções.");
                exceptionDates.add(exception.date);
            }
        } catch (error) {
            if (typeof showToast === "function") showToast(error.message, "warning", 6000);
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
                    payment_methods: Array.from(paymentMethodsList.querySelectorAll("[data-payment-method]"), input => ({
                        id: input.dataset.paymentMethod,
                        label: paymentMethods.find(method => method.id === input.dataset.paymentMethod)?.label || input.dataset.paymentMethod,
                        enabled: input.checked,
                    })),
                    whatsapp_settings: {
                        provider: "meta",
                        enabled: byId("whatsappEnabled").checked,
                        language: whatsappSettings.language || "pt_BR",
                        events: Object.fromEntries(Array.from(byId("whatsappTemplates").querySelectorAll("[data-whatsapp-event]"), input => [input.dataset.whatsappEvent, input.checked])),
                        templates: Object.fromEntries(Array.from(byId("whatsappTemplates").querySelectorAll("[data-whatsapp-template]"), input => [input.dataset.whatsappTemplate, input.value.trim()]).filter(([, value]) => value)),
                    },
                    address: addr, description: desc
                });
                operations = await loadOperationalSettings({ delivery_zones: deliveryZones, opening_hours: schedule.opening_hours, opening_exceptions: schedule.opening_exceptions });
                localStorage.setItem("panchoOperations", JSON.stringify(operations));
            } else {
                operations = await saveOperationalSettings({ delivery_zones: deliveryZones, opening_hours: schedule.opening_hours, opening_exceptions: schedule.opening_exceptions });
            }
            if (typeof showToast === "function") showToast("Configurações salvas com sucesso!", "success");
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
async function initAdminCategoriesPage() {
    const grid = document.getElementById("categoriesGrid");
    const form = document.getElementById("categoryForm");
    if (!grid || !form) return;

    const byId = id => document.getElementById(id);
    const modal = byId("categoryModal");
    const search = byId("categorySearch");
    const filter = byId("statusFilter");
    let categories = [];
    let products = [];

    const categoryIcon = () => '<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6A2.5 2.5 0 0 1 20.5 9.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z"/></svg></span>';
    function closeModal() {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
    }
    function openModal(category = null) {
        form.reset();
        byId("categoryId")?.remove();
        if (category) {
            const hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.id = "categoryId";
            hidden.name = "id";
            hidden.value = category.id;
            form.appendChild(hidden);
            byId("categoryName").value = category.name || "";
            byId("categoryDescription").value = category.description || "";
            byId("categoryIcon").value = category.icon || "";
            byId("categoryStatus").value = category.active === false ? "inactive" : "active";
            byId("modalTitle").textContent = "Editar categoria";
        } else {
            byId("modalTitle").textContent = "Nova categoria";
        }
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
        byId("categoryName").focus();
    }
    function render() {
        const query = search?.value.trim().toLocaleLowerCase("pt-BR") || "";
        const status = filter?.value || "all";
        const visible = categories.filter(category => {
            const matchesName = !query || `${category.name} ${category.description || ""}`.toLocaleLowerCase("pt-BR").includes(query);
            const active = category.active !== false;
            return matchesName && (status === "all" || (status === "active" ? active : !active));
        });

        grid.innerHTML = visible.map(category => {
            const active = category.active !== false;
            const count = products.filter(product => product.category_id === category.id).length;
            return `<article class="admin-category-card">
                <div class="admin-category-header"><div class="admin-category-icon">${categoryIcon()}</div>
                    <span class="category-order">${count} ${count === 1 ? "produto" : "produtos"}</span></div>
                <div class="admin-category-body"><div class="admin-category-title-row"><h3>${escapeHtml(category.name)}</h3>
                    <span class="status-badge ${active ? "status-active" : "status-inactive"}">${active ? "Ativa" : "Inativa"}</span></div>
                    <p>${escapeHtml(category.description || "Sem descrição")}</p></div>
                <div class="admin-category-footer"><span class="product-count">${categoryIcon()}<strong>${count}</strong> ${count === 1 ? "produto" : "produtos"}</span>
                    <div class="category-actions"><button type="button" class="icon-action" title="Editar categoria" aria-label="Editar ${escapeHtml(category.name)}" data-category-edit="${escapeHtml(category.id)}">Editar</button>
                    <button type="button" class="icon-action ${active ? "icon-action-danger" : ""}" title="${active ? "Arquivar" : "Ativar"} categoria" data-category-toggle="${escapeHtml(category.id)}">${active ? "Arquivar" : "Ativar"}</button></div></div>
            </article>`;
        }).join("");
        byId("emptyCategories").hidden = visible.length > 0;
        byId("totalCategories").textContent = String(categories.length);
        byId("activeCategories").textContent = String(categories.filter(category => category.active !== false).length);
        byId("totalProducts").textContent = String(products.length);
        const counts = categories.map(category => ({ name: category.name, count: products.filter(product => product.category_id === category.id).length }));
        const mostUsed = counts.sort((a, b) => b.count - a.count)[0];
        byId("topCategory").textContent = mostUsed?.name || "—";
    }
    async function reload() {
        try {
            [categories, products] = await Promise.all([adminFetchAllCategories(), adminFetchAllProducts()]);
            render();
        } catch (error) {
            showToast("Não foi possível carregar as categorias: " + error.message, "error");
        }
    }

    byId("newCategoryButton").addEventListener("click", () => openModal());
    byId("modalClose").addEventListener("click", closeModal);
    byId("cancelModal").addEventListener("click", closeModal);
    byId("modalOverlay").addEventListener("click", closeModal);
    document.addEventListener("keydown", event => { if (event.key === "Escape" && modal.classList.contains("open")) closeModal(); });
    search?.addEventListener("input", render);
    filter?.addEventListener("change", render);

    grid.addEventListener("click", async event => {
        const edit = event.target.closest("[data-category-edit]");
        const toggle = event.target.closest("[data-category-toggle]");
        if (edit) {
            const category = categories.find(item => item.id === edit.dataset.categoryEdit);
            if (category) openModal(category);
        }
        if (toggle) {
            const category = categories.find(item => item.id === toggle.dataset.categoryToggle);
            if (!category) return;
            const active = category.active === false;
            try {
                await adminUpsertCategory({ id: category.id, name: category.name, description: category.description, icon: category.icon, sort_order: category.sort_order, active });
                showToast(active ? "Categoria ativada." : "Categoria arquivada.", "success");
                await reload();
            } catch (error) { showToast("Não foi possível atualizar a categoria: " + error.message, "error"); }
        }
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        const id = byId("categoryId")?.value;
        const name = byId("categoryName").value.trim();
        if (!name) return;
        const duplicate = categories.some(category => category.id !== id && category.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"));
        if (duplicate) { showToast("Já existe uma categoria com esse nome.", "warning"); return; }
        const current = categories.find(category => category.id === id);
        try {
            await adminUpsertCategory({ ...(id ? { id } : {}), name, description: byId("categoryDescription").value.trim(), icon: byId("categoryIcon").value.trim() || null, active: byId("categoryStatus").value === "active", sort_order: current?.sort_order ?? categories.length });
            closeModal();
            showToast(id ? "Categoria atualizada." : "Categoria criada.", "success");
            await reload();
        } catch (error) { showToast("Não foi possível salvar a categoria: " + error.message, "error", 6000); }
    });

    await reload();
}

async function initAdminProductsPage() {
    const form = document.getElementById("adminProductForm");
    const list = document.getElementById("adminProductsList");
    if (!form || !list) return;
    const byId = id => document.getElementById(id);
    const dialog = byId("adminProductDialog");
    const search = byId("productSearchInput");
    let products = [];
    let categories = [];

    function resetForm() {
        form.reset();
        byId("adminProductId").value = "";
        byId("adminProductFormTitle").textContent = "Cadastrar produto";
        if (dialog.open) dialog.close();
    }
    function render() {
        const query = search?.value.trim().toLocaleLowerCase("pt-BR") || "";
        const shown = products.filter(product => !query || product.name.toLocaleLowerCase("pt-BR").includes(query));
        byId("productCountTotal").textContent = String(products.length);
        byId("productCountActive").textContent = String(products.filter(product => product.active !== false).length);
        byId("productCountFeatured").textContent = String(products.filter(product => product.featured).length);
        list.innerHTML = shown.length ? shown.map(product => `
            <article class="admin-product-item admin-product-card">
                <div class="admin-product-text"><h3>${escapeHtml(product.name)}</h3>
                <p>${escapeHtml(product.categories?.name || "Sem categoria")} · ${window.formatPrice(Number(product.price))} · ${product.active ? "Disponível" : "Desativado"}</p></div>
                <div class="admin-product-actions"><button type="button" class="btn btn-ghost btn-sm" data-edit-product="${escapeHtml(product.id)}">Editar</button>
                <button type="button" class="btn btn-ghost btn-sm" data-toggle-product="${escapeHtml(product.id)}" data-active="${product.active !== false}">${product.active === false ? "Ativar" : "Desativar"}</button>
                <button type="button" class="btn btn-danger btn-sm" data-delete-product="${escapeHtml(product.id)}">Excluir</button></div>
            </article>`).join("") : '<p>Nenhum produto cadastrado.</p>';
    }
    async function reload() {
        try {
            [products, categories] = await Promise.all([adminFetchAllProducts(), adminFetchAllCategories()]);
            byId("adminProductCategory").innerHTML = '<option value="">Sem categoria</option>' + categories.map(category =>
                `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}${category.active === false ? " (inativa)" : ""}</option>`).join("");
            render();
            window.dispatchEvent(new Event("productsChanged"));
        } catch (error) { showToast("Não foi possível carregar os produtos: " + error.message, "error"); }
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
            if (!Number.isFinite(price) || price < 0) throw new Error("O preço deve ser um valor válido maior ou igual a zero.");
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
            showToast("Produto salvo no catálogo.", "success");
            resetForm();
            await reload();
        } catch (error) { showToast("Não foi possível salvar o produto: " + error.message, "error", 6000); }
    });

    list.addEventListener("click", async event => {
        const editButton = event.target.closest("[data-edit-product]");
        const toggleButton = event.target.closest("[data-toggle-product]");
        const deleteButton = event.target.closest("[data-delete-product]");
        if (deleteButton) {
            const product = products.find(item => item.id === deleteButton.dataset.deleteProduct);
            if (!product) return;
            const confirmed = await showConfirm({
                title: "Excluir produto?",
                message: `O produto \"${product.name}\" será removido do catálogo. Os dados dos pedidos antigos serão preservados.`,
                confirmText: "Excluir",
                danger: true
            });
            if (!confirmed) return;
            try {
                await adminDeleteProduct(product.id);
                showToast("Produto excluído do catálogo.", "success");
                await reload();
            } catch (error) {
                showToast("Não foi possível excluir o produto: " + error.message, "error", 6000);
            }
            return;
        }
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
            dialog.showModal();
            byId("adminProductName").focus();
        } else if (toggleButton) {
            try {
                const active = toggleButton.dataset.active !== "true";
                await adminSetProductActive(toggleButton.dataset.toggleProduct, active);
                showToast(active ? "Produto reativado." : "Produto desativado no catálogo.", "success");
                await reload();
            } catch (error) { showToast("Não foi possível alterar a disponibilidade: " + error.message, "error"); }
        }
    });
    search?.addEventListener("input", render);
    byId("cancelProductEdit")?.addEventListener("click", resetForm);
    byId("closeProductDialog")?.addEventListener("click", resetForm);
    byId("newProductButton")?.addEventListener("click", () => {
        resetForm();
        dialog.showModal();
        byId("adminProductName").focus();
    });
    await reload();
}

/* ----------------------------------------------------------
   GRUPOS DE OPÇÕES REUTILIZÁVEIS (molhos e adicionais)
---------------------------------------------------------- */
async function initAdminOptionGroupsPage() {
    const groupForm = document.getElementById("optionGroupForm");
    const productForm = document.getElementById("productOptionGroupForm");
    if (!groupForm || !productForm) return;

    const byId = id => document.getElementById(id);
    const groupList = byId("optionGroupsList");
    const linksList = byId("productOptionLinksList");
    const associationProductList = byId("optionProductsForGroups");
    const selectAllProducts = byId("selectAllOptionProducts");
    const productSelectionCount = byId("optionProductSelectionCount");
    const associationGroupList = byId("optionGroupsForProduct");
    const selectAllGroups = byId("selectAllOptionGroups");
    const selectionCount = byId("optionGroupSelectionCount");
    const groupFormCard = byId("optionGroupFormCard");
    const choicesList = byId("optionGroupChoicesList");
    let groups = [];
    let products = [];
    let links = [];

    function readOptionChoices() {
        return Array.from(choicesList.querySelectorAll(".admin-option-choice-row"), row => ({
            name: row.querySelector("[data-choice-name]").value.trim(),
            price_delta: Number(row.querySelector("[data-choice-price]").value)
        }));
    }

    function renderOptionChoices(options = [{}]) {
        const choices = options.length ? options : [{}];
        choicesList.innerHTML = choices.map((option, index) => {
            const price = Number(option.price_delta ?? 0);
            return `
                <div class="admin-option-choice-row">
                    <div>
                        <label class="form-label" for="optionChoiceName${index}">Nome da opção</label>
                        <input id="optionChoiceName${index}" class="form-input" data-choice-name required maxlength="80" value="${escapeHtml(option.name || "")}" placeholder="Ex.: Granola">
                    </div>
                    <div>
                        <label class="form-label" for="optionChoicePrice${index}">Adicional (R$)</label>
                        <input id="optionChoicePrice${index}" class="form-input" data-choice-price type="number" min="0" step="0.01" required value="${Number.isFinite(price) ? price : 0}">
                    </div>
                    <button type="button" class="btn btn-ghost btn-sm admin-option-choice-remove" data-remove-option-choice aria-label="Remover opção ${index + 1}">Remover</button>
                </div>`;
        }).join("");
    }

    function resetGroupForm() {
        groupForm.reset();
        byId("optionGroupId").value = "";
        byId("optionGroupFormTitle").textContent = "Novo grupo de opções";
        renderOptionChoices();
    }

    function updateGroupSelectionCount() {
        const checkboxes = Array.from(associationGroupList.querySelectorAll("[data-association-group]"));
        const selectedCount = checkboxes.filter(checkbox => checkbox.checked).length;
        selectAllGroups.checked = checkboxes.length > 0 && selectedCount === checkboxes.length;
        selectAllGroups.indeterminate = selectedCount > 0 && selectedCount < checkboxes.length;
        selectionCount.textContent = `${selectedCount} ${selectedCount === 1 ? "grupo selecionado" : "grupos selecionados"}`;
    }

    function updateProductSelectionCount() {
        const checkboxes = Array.from(associationProductList.querySelectorAll("[data-association-product]"));
        const selectedCount = checkboxes.filter(checkbox => checkbox.checked).length;
        selectAllProducts.checked = checkboxes.length > 0 && selectedCount === checkboxes.length;
        selectAllProducts.indeterminate = selectedCount > 0 && selectedCount < checkboxes.length;
        productSelectionCount.textContent = `${selectedCount} ${selectedCount === 1 ? "produto selecionado" : "produtos selecionados"}`;
    }

    function renderAssociationProducts() {
        associationProductList.innerHTML = products.length ? products.map(product => `
            <label class="admin-association-group-option">
                <input type="checkbox" data-association-product value="${escapeHtml(product.id)}">
                <span>${escapeHtml(product.name)}${product.active === false ? " (inativo)" : ""}</span>
            </label>`).join("") : '<p class="admin-association-empty">Nenhum produto cadastrado.</p>';
        selectAllProducts.checked = false;
        selectAllProducts.indeterminate = false;
        selectAllProducts.disabled = !products.length;
        updateProductSelectionCount();
    }

    function renderAssociationGroups() {
        const activeGroups = groups.filter(group => group.active);
        associationGroupList.innerHTML = activeGroups.length ? activeGroups.map(group => `
            <label class="admin-association-group-option">
                <input type="checkbox" data-association-group value="${escapeHtml(group.id)}">
                <span>${escapeHtml(group.name)}</span>
            </label>`).join("") : '<p class="admin-association-empty">Nenhum grupo ativo disponível.</p>';
        selectAllGroups.checked = false;
        selectAllGroups.indeterminate = false;
        selectAllGroups.disabled = !activeGroups.length;
        updateGroupSelectionCount();
    }

    async function reload() {
        try {
            [groups, products, links] = await Promise.all([
                adminFetchAllOptionGroups(), adminFetchAllProducts(), adminFetchProductOptionLinks()
            ]);
            renderAssociationProducts();
            renderAssociationGroups();
            groupList.innerHTML = groups.length ? groups.map(group => `
                <article class="admin-product-item admin-product-card">
                    <div class="admin-product-text"><h3>${escapeHtml(group.name)}${group.active ? "" : " (inativo)"}</h3>
                    <p>${group.selection_type === "single" ? "Uma escolha" : "Múltiplas escolhas"} · ${(group.options || []).length} opções · ${group.required ? "Obrigatório" : "Opcional"}</p></div>
                    <button type="button" class="btn btn-ghost btn-sm" data-edit-option-group="${escapeHtml(group.id)}">Editar</button>
                </article>`).join("") : '<p>Nenhum grupo cadastrado ainda.</p>';
            linksList.innerHTML = links.length ? links.map(link => `
                <article class="admin-product-item admin-product-card">
                    <div class="admin-product-text"><strong>${escapeHtml(link.products?.name || "Produto")}</strong><p>${escapeHtml(link.option_groups?.name || "Grupo")}</p></div>
                    <button type="button" class="btn btn-ghost btn-sm" data-unlink-product="${escapeHtml(link.product_id)}" data-unlink-group="${escapeHtml(link.group_id)}">Desassociar</button>
                </article>`).join("") : '<p>Nenhuma associação cadastrada.</p>';
        } catch (error) {
            showToast("Não foi possível carregar os grupos. Confira se o esquema do Supabase foi aplicado: " + error.message, "error", 7000);
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
        renderOptionChoices(group.options || []);
        byId("optionGroupFormTitle").textContent = "Editar grupo de opções";
        groupFormCard.showModal();
        byId("optionGroupName").focus();
    });

    byId("addOptionChoiceButton")?.addEventListener("click", () => {
        const options = readOptionChoices();
        options.push({ name: "", price_delta: 0 });
        renderOptionChoices(options);
        choicesList.lastElementChild?.querySelector("[data-choice-name]").focus();
    });

    choicesList.addEventListener("click", event => {
        if (!event.target.closest("[data-remove-option-choice]")) return;
        const row = event.target.closest(".admin-option-choice-row");
        row?.remove();
        if (!choicesList.children.length) renderOptionChoices();
    });

    byId("newOptionGroupButton")?.addEventListener("click", () => {
        resetGroupForm();
        groupFormCard.showModal();
        byId("optionGroupName").focus();
    });
    byId("cancelOptionGroupEdit")?.addEventListener("click", () => {
        resetGroupForm();
        groupFormCard.close();
    });
    byId("closeOptionGroupDialog")?.addEventListener("click", () => {
        resetGroupForm();
        groupFormCard.close();
    });

    selectAllGroups.addEventListener("change", () => {
        associationGroupList.querySelectorAll("[data-association-group]").forEach(checkbox => {
            checkbox.checked = selectAllGroups.checked;
        });
        updateGroupSelectionCount();
    });

    associationGroupList.addEventListener("change", updateGroupSelectionCount);
    selectAllProducts.addEventListener("change", () => {
        associationProductList.querySelectorAll("[data-association-product]").forEach(checkbox => {
            checkbox.checked = selectAllProducts.checked;
        });
        updateProductSelectionCount();
    });

    associationProductList.addEventListener("change", updateProductSelectionCount);

    groupForm.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            const options = readOptionChoices();
            if (!options.length || options.some(option => !option.name || !Number.isFinite(option.price_delta) || option.price_delta < 0)) {
                throw new Error("Adicione pelo menos uma opção com nome e valor válido.");
            }
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
            resetGroupForm();
            groupFormCard.close();
            showToast("Grupo de opções salvo.", "success");
            await reload();
        } catch (error) {
            showToast("Confira o grupo: " + error.message, "warning", 6000);
        }
    });

    productForm.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            const selectedProductIds = Array.from(associationProductList.querySelectorAll("[data-association-product]:checked"), checkbox => checkbox.value);
            const selectedGroupIds = Array.from(associationGroupList.querySelectorAll("[data-association-group]:checked"), checkbox => checkbox.value);
            if (!selectedProductIds.length) throw new Error("Selecione pelo menos um produto.");
            if (!selectedGroupIds.length) throw new Error("Selecione pelo menos um grupo para associar.");
            const successCount = await adminLinkOptionGroupsToProducts(selectedProductIds, selectedGroupIds);
            await reload();
            showToast(`${successCount} vínculos associados a ${selectedProductIds.length} produto(s).`, "success");
        } catch (error) { showToast(error.message, "warning", 7000); }
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

async function initKitchenBoard() {
    const board = document.getElementById("kitchenBoard");
    const connection = document.getElementById("kitchenConnection");
    if (!board) return;
    const stages = [
        { id: "recebido", title: "Novos", statuses: ["recebido", "confirmado"] },
        { id: "preparando", title: "Preparando", statuses: ["preparando"] },
        { id: "pronto", title: "Prontos", statuses: ["pronto"] },
        { id: "saiu_para_entrega", title: "Em entrega", statuses: ["saiu_para_entrega"] },
        { id: "entregue", title: "Finalizados", statuses: ["entregue"] },
    ];
    let orders = [];
    let loading = false;
    const nextStep = order => {
        if (["recebido", "confirmado"].includes(order.status)) return { status: "preparando", label: "Iniciar preparo" };
        if (order.status === "preparando") return { status: "pronto", label: "Marcar pronto" };
        if (order.status === "pronto" && order.delivery_type === "entrega") return { status: "saiu_para_entrega", label: "Saiu para entrega" };
        if (order.status === "pronto" && order.delivery_type === "retirada") return { status: "entregue", label: "Concluir retirada" };
        if (order.status === "saiu_para_entrega") return { status: "entregue", label: "Finalizar pedido" };
        return null;
    };
    const renderOrder = order => {
        const next = nextStep(order);
        const address = order.delivery_type === "entrega" && order.address_snapshot
            ? [order.address_snapshot.street, order.address_snapshot.number, order.address_snapshot.complement, order.address_snapshot.neighborhood, order.address_snapshot.reference && `Ref.: ${order.address_snapshot.reference}`].filter(Boolean).join(", ")
            : "";
        const items = (order.order_items || []).map(item => {
            const options = Array.isArray(item.selected_options) ? item.selected_options.map(option => `${option.group ? `${option.group}: ` : ""}${option.name || ""}`).filter(Boolean).join(", ") : "";
            const details = [options, item.notes].filter(Boolean).join(" · ");
            return `<div class="kitchen-order-item"><strong>${Number(item.quantity) || 1}×</strong> ${escapeHtml(item.product_name)}${details ? `<small>${escapeHtml(details)}</small>` : ""}</div>`;
        }).join("") || '<div class="kitchen-order-item">Itens não disponíveis</div>';
        const payment = ({ dinheiro: "Dinheiro", pix: "PIX", cartao_debito: "Débito", cartao_credito: "Crédito" })[order.payment_method] || order.payment_method || "A combinar";
        const time = order.created_at ? new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";
        return `<article class="kitchen-order-card" data-order-card="${escapeHtml(order.id)}">
            <div class="kitchen-order-top"><span class="kitchen-order-number">${escapeHtml(order.order_number || order.id.slice(0, 8))}</span><time class="kitchen-order-time">${time}</time></div>
            <div class="kitchen-order-body"><strong>${escapeHtml(order.customer_name)} · ${escapeHtml(order.customer_phone)}</strong>
                <div class="kitchen-order-meta"><span>${order.delivery_type === "entrega" ? "Entrega" : "Retirada"}</span><span>${escapeHtml(payment)}</span><span>${order.total == null ? "Taxa a confirmar" : formatPrice(Number(order.total))}</span></div>
                <div class="kitchen-order-items">${items}</div>${address ? `<div class="kitchen-order-address">${escapeHtml(address)}</div>` : ""}
                ${order.notes ? `<div class="kitchen-order-notes"><strong>Observação:</strong> ${escapeHtml(order.notes)}</div>` : ""}</div>
            <div class="kitchen-order-footer">${next ? `<button type="button" class="btn btn-primary" data-kitchen-next="${escapeHtml(order.id)}">${next.label}</button>` : ""}${!['entregue','cancelado'].includes(order.status) ? `<button type="button" class="btn btn-ghost btn-sm" data-kitchen-cancel="${escapeHtml(order.id)}">Cancelar pedido</button>` : ""}</div>
        </article>`;
    };
    function render() {
        board.innerHTML = stages.map(stage => {
            const items = orders.filter(order => stage.statuses.includes(order.status));
            return `<section class="kitchen-column" aria-labelledby="kitchenStage-${stage.id}"><header class="kitchen-column-heading"><h2 id="kitchenStage-${stage.id}">${stage.title}</h2><span class="kitchen-column-count">${items.length}</span></header><div class="kitchen-order-list">${items.length ? items.map(renderOrder).join("") : '<div class="kitchen-empty">Nenhum pedido nesta etapa.</div>'}</div></section>`;
        }).join("");
    }
    async function reload() {
        if (loading) return;
        loading = true;
        try {
            orders = await adminFetchAllOrders({ limit: 1000 });
            render();
            connection.textContent = "Tempo real ativo";
            connection.classList.add("is-live");
            connection.classList.remove("is-error");
        } catch (error) {
            connection.textContent = "Falha na atualização";
            connection.classList.add("is-error");
            showToast("Não foi possível carregar pedidos: " + error.message, "error");
        } finally { loading = false; }
    }
    board.addEventListener("click", async event => {
        const nextButton = event.target.closest("[data-kitchen-next]");
        const cancelButton = event.target.closest("[data-kitchen-cancel]");
        const order = orders.find(item => item.id === (nextButton?.dataset.kitchenNext || cancelButton?.dataset.kitchenCancel));
        if (!order) return;
        let status;
        let reason = null;
        if (cancelButton) {
            reason = await requestCancelReason(order.order_number || order.id.slice(0, 8));
            if (!reason) return;
            status = "cancelado";
        } else {
            status = nextStep(order)?.status;
            if (!status) return;
        }
        try {
            const notification = await updateOrderStatus(order.id, status, reason);
            showToast(status === "cancelado" ? "Pedido cancelado." : "Pedido avançou de etapa.", "success");
            if (notification?.status === "not_configured") showToast("WhatsApp não configurado; o status foi atualizado e nenhuma mensagem foi enviada.", "warning", 6000);
            if (notification?.status === "failed") showToast("Status atualizado, mas a mensagem do WhatsApp falhou.", "warning", 6000);
            await reload();
        } catch (error) { showToast("Não foi possível atualizar o pedido: " + error.message, "error", 6000); }
    });
    document.getElementById("kitchenRefresh")?.addEventListener("click", reload);
    const sb = getSupabase();
    if (sb) sb.channel("kitchen-orders-live").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, reload).subscribe(state => {
        if (state === "SUBSCRIBED") { connection.textContent = "Tempo real ativo"; connection.classList.add("is-live"); }
        if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") { connection.textContent = "Reconectando…"; connection.classList.remove("is-live"); connection.classList.add("is-error"); }
    });
    await reload();
}

// Expor controladores
Object.assign(window, {
    initAdminCategoriesPage,
    initAdminDashboard,
    initAdminOrdersPage,
    initAdminClientsPage,
    initAdminSettingsPage,
    initAdminProductsPage,
    initAdminOptionGroupsPage,
    initKitchenBoard
});
