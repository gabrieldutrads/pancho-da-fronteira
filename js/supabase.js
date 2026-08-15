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
    addressId, addressSnapshot, paymentMethod, subtotal, deliveryFee, total, notes, items }) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");

    // Criar pedido
    const { data: order, error: orderError } = await sb
        .from("orders")
        .insert({
            user_id: userId,
            customer_name: customerName,
            customer_phone: customerPhone,
            delivery_type: deliveryType,
            address_id: addressId || null,
            address_snapshot: addressSnapshot || null,
            payment_method: paymentMethod,
            subtotal,
            delivery_fee: deliveryFee,
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
        product_id:   item.id || null,
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
        .select("*, order_items(*), profiles(nome, telefone)")
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
    const { error } = await sb.from("categories").delete().eq("id", id);
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
    fetchCategories, fetchProducts, fetchProductById,
    createOrder, fetchOrdersByUser, fetchOrderById, updateOrderStatus,
    fetchAddressesByUser, saveAddress,
    fetchStoreSettings,
    adminFetchAllOrders, adminFetchAllProducts, adminUpsertProduct, adminDeleteProduct,
    adminFetchAllCategories, adminUpsertCategory, adminDeleteCategory,
    adminFetchAllProfiles, adminUpdateStoreSettings,
    uploadImage,
});
