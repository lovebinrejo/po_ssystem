import { get, post } from "../../../services/axios";

// Mirrors legacy's customer_ajax.php (searchCustomers/getCustomerInfo), but
// against the X-API-Key-authenticated api/customers endpoint instead of the
// session-cookie one, which pos_standalone can't call cross-origin.
export const fetchCustomers = async (search = "", limit = 20) => {
    const params = new URLSearchParams({ action: "list", limit: String(limit) });
    if (search.trim()) params.set("search", search.trim());
    const res = await get(`/api/customers/index.php?${params.toString()}`);
    return res.customers;
};

// Used by posCache.js to batch through the full customer list (mirrors
// legacy's fetchAllCustomers() in pos-cache-manager.js) — exposes total_count
// so the caller knows when to stop paging.
export const fetchCustomersPage = async (limit, offset) => {
    const params = new URLSearchParams({ action: "list", limit: String(limit), offset: String(offset) });
    const res = await get(`/api/customers/index.php?${params.toString()}`);
    return { customers: res.customers, totalCount: res.total_count };
};

export const fetchCustomerById = async (id) => {
    const res = await get(`/api/customers/index.php?action=detail&id=${id}`);
    return res.customer;
};

export const createCustomer = async (payload) => {
    const res = await post("/api/customers/index.php?action=create", payload);
    return res.customer;
};
