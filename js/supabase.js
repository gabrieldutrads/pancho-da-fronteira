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
    addressId, addressSnapshot, paymentMethod, subtotal, deliveryFee, deliveryFeeStatus, total, notes, items }) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");

    // Criar pedido
    const { data: order, error: orderError } = await sb
        .from("orders")
        .insert({
            user_id: normalizeUuidOrNull(userId),
            customer_name: customerName,
            customer_phone: customerPhone,
            delivery_type: deliveryType,
            address_id: normalizeUuidOrNull(addressId),
            address_snapshot: addressSnapshot || null,
            payment_method: paymentMethod,
            subtotal,
            delivery_fee: deliveryFee,
            delivery_fee_status: deliveryFeeStatus || "confirmed",
            total,
            notes: notes || null,
            status: "recebido",
        })
        .select()
        .single();

    if (orderError) throw new Error(orderError.message);

    // Inserir itens
    const orderItems = items.map(item => ({
        order_id:     order.id,
        product_id:   normalizeUuidOrNull(item?.id),
        product_name: item.name,
        quantity:     item.quantity,
        unit_price:   item.price,
        subtotal:     item.price * item.quantity,
        notes:        item.notes || null,
    }));

    const { error: itemsError } = await sb.from("order_items").insert(orderItems);
    if (itemsError) throw new Error(itemsError.message);

    return order;
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

async function updateOrderStatus(orderId, status) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    const { error } = await sb
        .from("orders")
        .update({ status })
        .eq("id", orderId);
    if (error) throw new Error(error.message);
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
    const { data: order, error: readError } = await sb.from("orders").select("subtotal, delivery_fee_status").eq("id", orderId).single();
    if (readError) throw new Error(readError.message);
    if (!order || order.delivery_fee_status !== "pending") throw new Error("Este pedido não está aguardando confirmação da taxa.");
    const { data, error } = await sb.from("orders").update({ delivery_fee: fee, delivery_fee_status: "confirmed", total: Number(order.subtotal) + fee }).eq("id", orderId).select().single();
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
    return adminSetProductActive(id, false);
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
    const { data, error } = await sb
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
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
    fetchAddressesByUser, saveAddress,
    fetchStoreSettings,
    adminFetchAllOrders, adminFetchAllProducts, adminUpsertProduct, adminDeleteProduct, adminSetProductActive,
    adminFetchAllCategories, adminUpsertCategory, adminDeleteCategory,
    adminFetchAllProfiles, adminFetchAllOptionGroups, adminUpsertOptionGroup, adminLinkOptionGroup, adminFetchProductOptionLinks, adminUnlinkOptionGroup, adminUpdateStoreSettings,
    uploadImage,
});
