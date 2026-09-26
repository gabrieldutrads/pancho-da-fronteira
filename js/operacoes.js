/* Regras comerciais e de funcionamento: compartilhadas pelo checkout e pelo admin. */
const OPERATIONS_STORAGE_KEY = "panchoOperations";
const DEFAULT_OPERATIONS = {
    delivery_zones: [
        { name: "Loteamento Jardins 1", aliases: ["Jardins 1", "Loteamento Jardins 1"], fee_type: "FREE", fee: 0, active: true },
        { name: "Loteamento Jardins 2", aliases: ["Jardins 2", "Loteamento Jardins 2"], fee_type: "FREE", fee: 0, active: true },
        { name: "Loteamento Jardins 3", aliases: ["Jardins 3", "Loteamento Jardins 3"], fee_type: "FREE", fee: 0, active: true },
        { name: "Parque das Rosas", aliases: ["Parque das Rosas"], fee_type: "FREE", fee: 0, active: true },
        { name: "Tabuleiro", aliases: ["Tabuleiro"], fee_type: "FREE", fee: 0, active: true },
        { name: "Bela Vista", aliases: ["Bela Vista"], fee_type: "FIXED", fee: 5, active: true },
        { name: "Demais localidades", aliases: [], fee_type: "CONSULT", fee: null, active: true }
    ],
    opening_hours: {
        segunda: { active: null, configured: false, open: null, close: null },
        terca: { active: false, open: null, close: null },
        quarta: { active: true, open: null, close: null },
        quinta: { active: true, open: null, close: null },
        sexta: { active: true, open: null, close: null },
        sabado: { active: true, open: null, close: null },
        domingo: { active: false, open: null, close: null }
    },
    opening_exceptions: [{ type: "first_saturday_closed", active: true }]
};

function normalizeLocality(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
}

function mergeOperations(settings = {}) {
    const suppliedHours = settings.opening_hours && typeof settings.opening_hours === "object" ? settings.opening_hours : {};
    const openingHours = Object.fromEntries(Object.entries(DEFAULT_OPERATIONS.opening_hours).map(([day, defaults]) => [
        day,
        {
            ...defaults,
            ...(suppliedHours[day] || {}),
            active: day === "segunda" ? (suppliedHours[day]?.configured === true ? Boolean(suppliedHours[day]?.active) : null) : defaults.active,
            ...(day === "segunda" ? { configured: suppliedHours[day]?.configured === true } : {})
        }
    ]));
    const exceptions = Array.isArray(settings.opening_exceptions) ? settings.opening_exceptions : DEFAULT_OPERATIONS.opening_exceptions;
    const saturdayException = { type: "first_saturday_closed", active: true };
    return {
        ...DEFAULT_OPERATIONS,
        ...settings,
        delivery_zones: Array.isArray(settings.delivery_zones) ? settings.delivery_zones : DEFAULT_OPERATIONS.delivery_zones,
        opening_hours: openingHours,
        opening_exceptions: [...exceptions.filter(item => item && item.type !== "first_saturday_closed"), saturdayException]
    };
}

function resolveDeliveryFee(locality, settings) {
    const operations = mergeOperations(settings || {});
    const target = normalizeLocality(locality);
    if (!target) return { type: "CONSULT", fee: null, pending: true, label: "Informe o bairro" };
    const zone = operations.delivery_zones.find(item => item && item.active !== false &&
        [item.name, ...(Array.isArray(item.aliases) ? item.aliases : [])].some(alias => normalizeLocality(alias) === target));
    if (!zone || zone.fee_type === "CONSULT") return { type: "CONSULT", fee: null, pending: true, label: "Consultar taxa" };
    if (zone.fee_type === "FREE") return { type: "FREE", fee: 0, pending: false, label: "Grátis" };
    if (zone.fee_type === "FIXED" && Number.isFinite(Number(zone.fee)) && Number(zone.fee) >= 0) {
        const fee = Number(zone.fee);
        return { type: "FIXED", fee, pending: false, label: fee === 0 ? "Grátis" : formatPrice(fee) };
    }
    return { type: "CONSULT", fee: null, pending: true, label: "Consultar taxa" };
}

function isStoreOpen(date = new Date(), settings) {
    const operations = mergeOperations(settings || {});
    const dayKeys = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (operations.opening_exceptions.some(item => item.date === dateKey && item.active === false)) return false;
    if (date.getDay() === 0 || date.getDay() === 2) return false;
    if (date.getDay() === 6 && date.getDate() <= 7 && operations.opening_exceptions.some(x => x.type === "first_saturday_closed" && x.active !== false)) return false;
    const day = operations.opening_hours[dayKeys[date.getDay()]];
    if (!day || day.active === null || day.active === undefined) return null;
    if (!day.active) return false;
    if (!day.open || !day.close) return null;
    const now = date.getHours() * 60 + date.getMinutes();
    const [openHour, openMinute] = day.open.split(":").map(Number);
    const [closeHour, closeMinute] = day.close.split(":").map(Number);
    if (![openHour, openMinute, closeHour, closeMinute].every(Number.isFinite)) return null;
    return now >= openHour * 60 + openMinute && now < closeHour * 60 + closeMinute;
}

async function loadOperationalSettings(supabaseSettings = null) {
    if (supabaseSettings && (supabaseSettings.delivery_zones || supabaseSettings.opening_hours)) return mergeOperations(supabaseSettings);
    try {
        const local = JSON.parse(localStorage.getItem(OPERATIONS_STORAGE_KEY) || "null");
        if (local) return mergeOperations(local);
    } catch (error) { console.warn("Configuração local inválida; usando regras padrão.", error); }
    return mergeOperations();
}

async function saveOperationalSettings(settings) {
    const clean = mergeOperations(settings);
    if (typeof getSupabase === "function" && getSupabase() && typeof adminUpdateStoreSettings === "function") {
        return adminUpdateStoreSettings({ delivery_zones: clean.delivery_zones, opening_hours: clean.opening_hours, opening_exceptions: clean.opening_exceptions });
    }
    localStorage.setItem(OPERATIONS_STORAGE_KEY, JSON.stringify(clean));
    return clean;
}

Object.assign(window, { DEFAULT_OPERATIONS, normalizeLocality, resolveDeliveryFee, isStoreOpen, loadOperationalSettings, saveOperationalSettings });
