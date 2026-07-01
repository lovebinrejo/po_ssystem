import { fetchProducts } from "../features/products/services/productApi";
import { fetchCustomersPage } from "../features/customers/services/customerApi";
import { fetchCategories } from "../features/categories/services/categoryApi";

// Mirrors legacy's pos-cache-manager.js / pos-cache-integration.js: a
// localStorage-backed cache of products/customers/categories so searches run
// instantly against local data instead of round-tripping to the server on
// every keystroke. Same 24h expiry, same "load from storage if fresh, else
// fetch everything from the server" init behavior, same manual force-refresh
// triggered by the sidebar's "Sync Data (Refresh Cache)" button.
const CACHE_VERSION = "1.0";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
const CUSTOMER_PAGE_SIZE = 200;

const STORAGE_KEYS = {
    PRODUCTS: "pos_cache_products",
    CUSTOMERS: "pos_cache_customers",
    CATEGORIES: "pos_cache_categories",
    META: "pos_cache_meta",
};

let cache = { products: [], customers: [], categories: [] };
let ready = false;
let initPromise = null;

const loadFromStorage = () => {
    try {
        const meta = JSON.parse(localStorage.getItem(STORAGE_KEYS.META) || "null");
        if (!meta || meta.version !== CACHE_VERSION) return null;
        if (Date.now() - meta.savedAt > CACHE_DURATION_MS) return null;
        return {
            products: JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || "[]"),
            customers: JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || "[]"),
            categories: JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || "[]"),
        };
    } catch {
        return null;
    }
};

const saveToStorage = () => {
    try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(cache.products));
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(cache.customers));
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cache.categories));
        localStorage.setItem(STORAGE_KEYS.META, JSON.stringify({ version: CACHE_VERSION, savedAt: Date.now() }));
    } catch {
        // localStorage full/unavailable (e.g. private browsing) — cache still
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
    saveToStorage();
    return cache;
};

// Loads from localStorage if it's still fresh, otherwise fetches everything
// from the server once. Safe to call multiple times — subsequent calls reuse
// the same in-flight/completed promise.
export const initCache = () => {
    if (initPromise) return initPromise;
    initPromise = (async () => {
        const stored = loadFromStorage();
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
