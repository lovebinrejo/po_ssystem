import { fetchProducts } from "../features/products/services/productApi";
import { fetchCustomersPage } from "../features/customers/services/customerApi";
import { fetchCategories } from "../features/categories/services/categoryApi";

// Mirrors legacy's pos-cache-manager.js / pos-cache-integration.js in
// behavior (same 24h expiry, same "load from storage if fresh, else fetch
// everything from the server" init behavior, same manual force-refresh
// triggered by the sidebar's "Sync Data (Refresh Cache)" button) but not in
// storage engine: legacy and this app's own earlier version both used
// localStorage, but a large product catalog can bump into localStorage's
// ~5-10MB ceiling and its synchronous JSON.stringify/parse blocks the main
// thread. This version persists to IndexedDB instead — effectively no size
// ceiling, and the get/put calls are async so they never block rendering.
// The in-memory `cache` object below is still the synchronous source of
// truth searchCachedCustomers reads from — only the on-disk persistence
// layer changed, so every existing caller (useCustomers, PosSidebar,
// Login.jsx) needed zero changes. searchCachedProducts still exists here but
// is currently unused — product loading was moved to always-live (see
// useProducts.jsx), matching useCategories.jsx, which never read from this
// cache either.
const CACHE_VERSION = "1.0";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
const CUSTOMER_PAGE_SIZE = 200;

const STORAGE_KEYS = {
    PRODUCTS: "pos_cache_products",
    CUSTOMERS: "pos_cache_customers",
    CATEGORIES: "pos_cache_categories",
    META: "pos_cache_meta",
};

const DB_NAME = "pos_standalone_cache";
const DB_VERSION = 1;
const STORE_NAME = "kv";

// One-time migration courtesy: the old localStorage-backed version of this
// cache used the same STORAGE_KEYS as plain top-level keys. Nothing reads
// those anymore, so drop them instead of leaving dead data sitting around.
try {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
} catch {
    // localStorage unavailable — nothing to migrate away from either.
}

const openDb = () =>
    new Promise((resolve, reject) => {
        try {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        } catch (err) {
            reject(err);
        }
    });

let cache = { products: [], customers: [], categories: [] };
let ready = false;
let initPromise = null;

const idbGet = async (key) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

const idbSet = async (key, value) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const idbDelete = async (key) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const loadFromStorage = async () => {
    try {
        const meta = await idbGet(STORAGE_KEYS.META);
        if (!meta || meta.version !== CACHE_VERSION) return null;
        if (Date.now() - meta.savedAt > CACHE_DURATION_MS) return null;
        const [products, customers, categories] = await Promise.all([
            idbGet(STORAGE_KEYS.PRODUCTS),
            idbGet(STORAGE_KEYS.CUSTOMERS),
            idbGet(STORAGE_KEYS.CATEGORIES),
        ]);
        return { products: products || [], customers: customers || [], categories: categories || [] };
    } catch {
        return null;
    }
};

const saveToStorage = async () => {
    try {
        await Promise.all([
            idbSet(STORAGE_KEYS.PRODUCTS, cache.products),
            idbSet(STORAGE_KEYS.CUSTOMERS, cache.customers),
            idbSet(STORAGE_KEYS.CATEGORIES, cache.categories),
            idbSet(STORAGE_KEYS.META, { version: CACHE_VERSION, savedAt: Date.now() }),
        ]);
    } catch {
        // IndexedDB full/unavailable (e.g. private browsing) — cache still
        // works for this session, it just won't survive a reload.
    }
};

const fetchAllCustomers = async () => {
    const all = [];
    let offset = 0;
    // Batches through every page (mirrors legacy's fetchAllCustomers), since
    // api/customers/index.php caps each response to `limit` rows.
    while (true) {
        const { customers: page, totalCount } = await fetchCustomersPage(CUSTOMER_PAGE_SIZE, offset);
        all.push(...page);
        offset += page.length;
        if (page.length === 0 || offset >= totalCount) break;
    }
    return all;
};

export const refreshCache = async () => {
    const [products, customers, categories] = await Promise.all([
        fetchProducts({}),
        fetchAllCustomers(),
        fetchCategories(),
    ]);
    cache = { products, customers, categories };
    ready = true;
    await saveToStorage();
    return cache;
};

// Loads from IndexedDB if it's still fresh, otherwise fetches everything
// from the server once. Safe to call multiple times — subsequent calls reuse
// the same in-flight/completed promise.
export const initCache = () => {
    if (initPromise) return initPromise;
    initPromise = (async () => {
        const stored = await loadFromStorage();
        if (stored) {
            cache = stored;
            ready = true;
            return cache;
        }
        return refreshCache();
    })();
    return initPromise;
};

export const isCacheReady = () => ready;

// Drops the cached products/customers/categories and forces the next
// initCache() call to fetch fresh, regardless of the 24h TTL. Used when the
// active backend URL changes (see Login.jsx) — a cache built from one
// Dolibarr instance is meaningless (or actively wrong) once pointed at a
// different one. Callers (Login.jsx) don't await this, so the IndexedDB
// deletes are fire-and-forget — the in-memory reset above is what actually
// matters synchronously; the deletes just keep the next reload from finding
// stale data.
export const clearCache = () => {
    cache = { products: [], customers: [], categories: [] };
    ready = false;
    initPromise = null;
    Object.values(STORAGE_KEYS).forEach((key) => idbDelete(key).catch(() => {}));
};

export const searchCachedProducts = ({ categoryId, search } = {}) => {
    const term = (search || "").trim().toLowerCase();
    return cache.products.filter((product) => {
        const matchesCategory = !categoryId || String(product.categoryId) === String(categoryId);
        const matchesSearch =
            !term ||
            product.name?.toLowerCase().includes(term) ||
            (product.barcode || "").toLowerCase().includes(term);
        return matchesCategory && matchesSearch;
    });
};

export const searchCachedCustomers = (search) => {
    const term = (search || "").trim().toLowerCase();
    if (!term) return [];
    return cache.customers.filter(
        (customer) =>
            (customer.name || "").toLowerCase().includes(term) ||
            (customer.tpin || "").toLowerCase().includes(term) ||
            (customer.phone || "").toLowerCase().includes(term) ||
            (customer.email || "").toLowerCase().includes(term)
    );
};

export const getCachedCategories = () => cache.categories;

// Read-only caching for Reports/receipts — network-first, cache-as-fallback
// (the opposite of products/customers/categories above, which are
// cache-first). Invoice/payment data changes constantly as new sales
// happen, so a stale cache should never be preferred over a live fetch; it
// only exists so Reports and receipt reprints keep working when the network
// briefly drops, showing the last known-good data instead of an error.
// Not part of the versioned `cache`/24h-TTL system above — these are simple
// per-key snapshots, always overwritten by the latest successful fetch.
const receiptKey = (invoiceId) => `pos_cache_receipt_${invoiceId}`;
const invoicesListKey = (dateFrom, dateTo) => `pos_cache_invoices_${dateFrom}_${dateTo}`;
const orderMetaKey = (invoiceId) => `pos_cache_order_meta_${invoiceId}`;

export const cacheReceipt = (invoiceId, receipt) => idbSet(receiptKey(invoiceId), receipt).catch(() => {});
export const getCachedReceipt = (invoiceId) => idbGet(receiptKey(invoiceId)).catch(() => null);

// Order Type/Table (dine-in vs pickup, which table) has nowhere to live on
// the backend — confirmed live 2026-07-17 that no api/pos/* endpoint reads
// or writes fk_transport_mode/place at all, unlike legacy's own
// receipt.php, which persists both server-side (see [[legacy_dolibarr_pos_backend]]).
// usePaymentBase.js's finalizePayment captures them from tableStore at the
// exact moment a sale completes and writes them here — a small, permanent
// (IndexedDB, not the receipt cache above's snapshot-of-one-fetch) local
// record keyed by invoice ID. fetchReceipt reads this back on every future
// fetch of that invoice, so a reprint from Reports later in the same
// browser still shows them — real limitation: only ever populated for
// sales actually completed in this app instance/browser, so an invoice
// from another terminal, a different browser, or paid before this existed
// still won't have it. That's the best available without touching the
// backend (see [[pos_standalone_no_backend_changes]]).
export const cacheOrderMeta = (invoiceId, meta) => idbSet(orderMetaKey(invoiceId), meta).catch(() => {});
export const getCachedOrderMeta = (invoiceId) => idbGet(orderMetaKey(invoiceId)).catch(() => null);

export const cacheInvoicesList = (dateFrom, dateTo, invoices) =>
    idbSet(invoicesListKey(dateFrom, dateTo), invoices).catch(() => {});
export const getCachedInvoicesList = (dateFrom, dateTo) =>
    idbGet(invoicesListKey(dateFrom, dateTo)).catch(() => null);
