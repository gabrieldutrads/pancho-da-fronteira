/* ============================================================
   PANCHO DA FRONTEIRA — SUPABASE.JS
   Cliente Supabase e funções utilitárias de banco de dados.
============================================================ */

// Inicializar cliente Supabase (CDN)
let _supabase = null;

function getSupabase() {
    if (_supabase) return _supabase;
    if (typeof window.supabase === "undefined") {
        console.warn("[Supabase] SDK não carregado. Verifique o CDN.");
        return null;
    }
    if (!window.SUPABASE_URL || window.SUPABASE_URL === "SUA_URL_AQUI") {
        console.warn("[Supabase] Credenciais não configuradas. Edite js/config.js");
        return null;
    }
    _supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    return _supabase;
}

window.getSupabase = getSupabase;

function isValidUuid(value) {
    if (typeof value !== "string") return false;
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value.trim());
}

function normalizeUuidOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    return isValidUuid(String(value)) ? String(value).trim() : null;
}

/* ----------------------------------------------------------
   CATEGORIES
---------------------------------------------------------- */
async function fetchCategories() {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
        .from("categories")
        .select("*")
        .eq("active", true)
        .order("sort_order");
    if (error) { console.error("[Supabase] categories:", error.message); return []; }
    return data || [];
}

/* ----------------------------------------------------------
   PRODUCTS
---------------------------------------------------------- */
async function fetchProducts({ categoryId, featured, search, active = true } = {}) {
    const sb = getSupabase();
    if (!sb) return [];
    let query = sb
        .from("products")
        .select("*, categories(id, name, icon)")
        .order("sort_order");

    if (active !== null) query = query.eq("active", active);
    if (categoryId)      query = query.eq("category_id", categoryId);
    if (featured)        query = query.eq("featured", true);
    if (search)          query = query.ilike("name", `%${search}%`);

    const { data, error } = await query;
    if (error) { console.error("[Supabase] products:", error.message); return []; }
    return data || [];
}

async function fetchProductById(id) {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb
        .from("products")
        .select("*, categories(id, name, icon)")
        .eq("id", id)
        .eq("active", true)
        .single();
    if (error) { console.error("[Supabase] product:", error.message); return null; }
    return data;
}

/* ----------------------------------------------------------
   ORDERS
---------------------------------------------------------- */
async function createOrder({ userId, customerName, customerPhone, deliveryType,
    addressId, addressSnapshot, paymentMethod, subtotal, deliveryFee, deliveryFeeStatus, total, notes, items, whatsappOptIn = false }) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");

    const orderData = {
        user_id: normalizeUuidOrNull(userId), customer_name: customerName, customer_phone: customerPhone,
        delivery_type: deliveryType, address_snapshot: addressSnapshot || null, payment_method: paymentMethod,
        subtotal, delivery_fee: deliveryFee, delivery_fee_status: deliveryFeeStatus || "confirmed",
        total, notes: notes || null, whatsapp_opt_in: Boolean(whatsappOptIn),
    };
    const orderItems = (items || []).map(item => ({
        product_id: normalizeUuidOrNull(item?.id), product_name: item.name,
        quantity: Number(item.quantity), unit_price: Math.max(0, Number(item.base_price ?? item.price) || 0), notes: item.notes || null,
        selected_options: Array.isArray(item.selectedOptions) ? item.selectedOptions : [],
    }));
    const { data, error } = await sb.rpc("create_order_with_items", { p_order: orderData, p_items: orderItems });
    if (error) throw new Error(error.message);
    return data;
}

async function fetchOrdersByUser(userId) {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
    if (error) { console.error("[Supabase] orders:", error.message); return []; }
    return data || [];
}

async function fetchOrderById(orderId) {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb
        .from("orders")
        .select("*, order_items(*), order_status_history(*)")
        .eq("id", orderId)
        .single();
    if (error) { console.error("[Supabase] order:", error.message); return null; }
    return data;
}

async function updateOrderStatus(orderId, status, notes = null) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    const { error } = await sb.rpc("admin_update_order_status", {
        p_order_id: orderId,
        p_status: status,
        p_notes: notes,
    });
    if (error) throw new Error(error.message);
    const notification = await adminSendOrderNotification(orderId);
    return notification || { status: "pending", sent: false };
}

async function adminSendOrderNotification(orderId) {
    const sb = getSupabase();
    if (!sb) return { status: "not_configured", sent: false };
    const { data: queued, error: queueError } = await sb.rpc("admin_retry_order_notification", { p_order_id: orderId });
    if (queueError) return { status: "pending", sent: false, reason: queueError.message };
    if (!queued || !["pending", "failed"].includes(queued.status)) return queued;
    const { data: notification, error: notificationError } = await sb.functions.invoke("send-order-notification", { body: { orderId } });
    if (notificationError) return { status: "pending", sent: false, reason: notificationError.message };
    return notification || { status: "pending", sent: false };
}

async function fetchUserNotifications(userId, limit = 30) {
    const sb = getSupabase();
    if (!sb || !isValidUuid(userId)) return [];
    const { data, error } = await sb.from("notifications").select("id,order_id,event_type,title,message,read_at,created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
}

async function markNotificationRead(notificationId) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    const { error } = await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId);
    if (error) throw new Error(error.message);
}

async function getGuestOrderTracking(token) {
    const sb = getSupabase();
    if (!sb || !isValidUuid(token)) return null;
    const { data, error } = await sb.rpc("get_guest_order_tracking", { p_token: token });
    if (error) throw new Error(error.message);
    return Array.isArray(data) ? data[0] || null : data;
}

async function fetchProductOptionGroups(productId) {
    const sb = getSupabase();
    if (!sb || !isValidUuid(productId)) return [];
    const { data, error } = await sb.from("product_option_groups")
        .select("sort_order, option_groups!inner(*)")
        .eq("product_id", productId)
        .eq("option_groups.active", true)
        .order("sort_order");
    if (error) { console.error("[Supabase] product options:", error.message); return []; }
    return (data || []).map(row => ({ ...row.option_groups, sort_order: row.sort_order }));
}

async function adminConfirmOrderDeliveryFee(orderId, fee) {
    const sb = getSupabase();
    fee = Number(fee);
    if (!sb) throw new Error("Supabase não configurado.");
    if (!Number.isFinite(fee) || fee < 0) throw new Error("Informe uma taxa válida.");
    const { data, error } = await sb.rpc("admin_confirm_order_delivery_fee", { p_order_id: orderId, p_fee: fee });
    if (error) throw new Error(error.message);
    return data;
}

/* ----------------------------------------------------------
   ADDRESSES
---------------------------------------------------------- */
async function fetchAddressesByUser(userId) {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
        .from("addresses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
    if (error) return [];
    return data || [];
}

async function saveAddress(addressData) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    const { data, error } = await sb
        .from("addresses")
        .insert(addressData)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

/* ----------------------------------------------------------
   STORE SETTINGS
---------------------------------------------------------- */
async function fetchStoreSettings() {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb
        .from("store_settings")
        .select("*")
        .limit(1)
        .single();
    if (error) return null;
    return data;
}

/* ----------------------------------------------------------
   ADMIN: funções exclusivas para o painel admin
---------------------------------------------------------- */
async function adminFetchAllOrders({ status, search, limit = 50 } = {}) {
    const sb = getSupabase();
    if (!sb) return [];
    let query = sb
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false })
        .limit(limit);
    if (status) query = query.eq("status", status);
    if (search) query = query.or(`customer_name.ilike.%${search}%,order_number.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) { console.error("[Supabase] adminOrders:", error.message); return []; }
    return data || [];
}

async function adminFetchAllProducts() {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
        .from("products")
        .select("*, categories(id, name)")
        .order("sort_order");
    if (error) return [];
    return data || [];
}

async function adminUpsertProduct(product) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    const { data, error } = await sb
        .from("products")
        .upsert(product)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

async function adminDeleteProduct(id) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    const { error } = await sb.from("products").delete().eq("id", id);
    if (error) throw new Error(error.message);
}

async function adminFetchAllCategories() {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
        .from("categories")
        .select("*, products(count)")
        .order("sort_order");
    if (error) return [];
    return data || [];
}

async function adminUpsertCategory(category) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    const { data, error } = await sb
        .from("categories")
        .upsert(category)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

async function adminDeleteCategory(id) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    const { error } = await sb.from("categories").update({ active: false }).eq("id", id);
    if (error) throw new Error(error.message);
}

async function adminFetchAllProfiles() {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb.rpc("admin_list_profiles");
    if (error) return [];
    return data || [];
}

async function adminSetProductActive(id, active) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    const { error } = await sb.from("products").update({ active: Boolean(active) }).eq("id", id);
    if (error) throw new Error(error.message);
}

async function adminFetchAllOptionGroups() {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb.from("option_groups").select("*").order("name");
    if (error) throw new Error(error.message);
    return data || [];
}

async function adminUpsertOptionGroup(group) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    const name = String(group.name || "").trim();
    const type = group.selection_type === "single" ? "single" : "multiple";
    const options = (Array.isArray(group.options) ? group.options : []).map(option => ({
        name: String(option.name || "").trim(),
        price_delta: Number(option.price_delta ?? 0),
        active: option.active !== false
    })).filter(option => option.name);
    if (!name || !options.length || options.some(option => !Number.isFinite(option.price_delta) || option.price_delta < 0)) {
        throw new Error("Informe o nome do grupo e ao menos uma opção com preço válido.");
    }
    const min = Math.max(Boolean(group.required) ? 1 : 0, Number(group.min_selection) || 0);
    const max = type === "single" ? 1 : Math.min(options.length, Math.max(min, Number(group.max_selection) || options.length));
    if (min > options.length) throw new Error("A seleção mínima supera a quantidade de opções.");
    const payload = { name, selection_type: type, required: Boolean(group.required), min_selection: min, max_selection: max, options, active: group.active !== false };
    let query = sb.from("option_groups");
    query = group.id ? query.update(payload).eq("id", group.id) : query.insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);
    return data;
}

async function adminLinkOptionGroup(productId, groupId, sortOrder = 0) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    if (!isValidUuid(productId) || !isValidUuid(groupId)) throw new Error("Selecione um produto e um grupo válidos.");
    const { error } = await sb.from("product_option_groups").upsert({ product_id: productId, group_id: groupId, sort_order: Number(sortOrder) || 0 });
    if (error) throw new Error(error.message);
}

async function adminLinkOptionGroupsToProducts(productIds, groupIds) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    if (!Array.isArray(productIds) || !Array.isArray(groupIds) || !productIds.length || !groupIds.length ||
        [...productIds, ...groupIds].some(id => !isValidUuid(id))) {
        throw new Error("Selecione produtos e grupos válidos.");
    }

    const associations = productIds.flatMap(productId => groupIds.map((groupId, sortOrder) => ({
        product_id: productId,
        group_id: groupId,
        sort_order: sortOrder
    })));
    let savedCount = 0;

    for (let index = 0; index < associations.length; index += 100) {
        const batch = associations.slice(index, index + 100);
        const { error } = await sb.from("product_option_groups").upsert(batch);
        if (error) throw new Error(`Foram salvos ${savedCount} de ${associations.length} vínculos. ${error.message}`);
        savedCount += batch.length;
    }

    return savedCount;
}

async function adminFetchProductOptionLinks() {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb.from("product_option_groups")
        .select("product_id, group_id, sort_order, products(name), option_groups(name)")
        .order("sort_order");
    if (error) throw new Error(error.message);
    return data || [];
}

async function adminUnlinkOptionGroup(productId, groupId) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    const { error } = await sb.from("product_option_groups").delete().eq("product_id", productId).eq("group_id", groupId);
    if (error) throw new Error(error.message);
}

async function adminUpdateStoreSettings(settings) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    const { data: existing } = await sb.from("store_settings").select("id").limit(1).single();
    let result;
    if (existing) {
        const { data, error } = await sb.from("store_settings").update(settings).eq("id", existing.id).select().single();
        if (error) throw new Error(error.message);
        result = data;
    } else {
        const { data, error } = await sb.from("store_settings").insert(settings).select().single();
        if (error) throw new Error(error.message);
        result = data;
    }
    return result;
}

/* ----------------------------------------------------------
   UPLOAD DE IMAGEM (Supabase Storage)
---------------------------------------------------------- */
async function uploadImage(bucket, path, file) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    const { data, error } = await sb.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    const { data: urlData } = sb.storage.from(bucket).getPublicUrl(path);
    return urlData.publicUrl;
}

// Expor globalmente
Object.assign(window, {
    fetchCategories, fetchProducts, fetchProductById, fetchProductOptionGroups,
    createOrder, fetchOrdersByUser, fetchOrderById, updateOrderStatus, adminConfirmOrderDeliveryFee,
    fetchUserNotifications, markNotificationRead, getGuestOrderTracking, adminSendOrderNotification,
    fetchAddressesByUser, saveAddress,
    fetchStoreSettings,
    adminFetchAllOrders, adminFetchAllProducts, adminUpsertProduct, adminDeleteProduct, adminSetProductActive,
    adminFetchAllCategories, adminUpsertCategory, adminDeleteCategory,
    adminFetchAllProfiles, adminFetchAllOptionGroups, adminUpsertOptionGroup, adminLinkOptionGroup, adminLinkOptionGroupsToProducts, adminFetchProductOptionLinks, adminUnlinkOptionGroup, adminUpdateStoreSettings,
    uploadImage,
});
