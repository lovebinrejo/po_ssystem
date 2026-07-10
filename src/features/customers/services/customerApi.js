import { get, post } from "../../../services/axios";
import { getApiBaseUrl, isSameOriginBackend } from "../../../services/apiConfig";

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

// Legacy's own create endpoint (takeposnew/api/customer.php) — session-cookie
// authenticated, only reachable when pos_standalone is served same-origin
// (the "htdocs" build) with an established Dolibarr session (see
// authService.jsx's establishLegacySession). Verified live: creates a real
// customer with a correctly auto-numbered code_client — unlike
// api/customers/index.php's create action, which is missing that fix on the
// live server (see [[legacy-dolibarr-pos-backend]]).
const createCustomerViaLegacy = async (payload) => {
    const body = new URLSearchParams({
        name: payload.name,
        email: payload.email || "",
        phone: payload.phone || "",
        idprof1: payload.tpin || "",
        address: payload.address || "",
        zipcode: payload.zip || "",
        town: payload.town || "",
    });

    const response = await fetch(`${getApiBaseUrl()}/takeposnew/api/customer.php?action=create`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    const data = await response.json();
    if (!data.success) {
        const error = new Error(data.message || data.error || "Failed to create customer");
        error.response = { data };
        throw error;
    }

    return {
        id: Number(data.data.id),
        name: data.data.name,
        email: data.data.email,
        phone: data.data.phone,
        code_client: data.data.code_client,
        tpin: data.data.tpin,
        address: data.data.address,
        zip: data.data.zip,
        town: data.data.town,
    };
};

export const createCustomer = async (payload) => {
    if (isSameOriginBackend()) {
        return createCustomerViaLegacy(payload);
    }
    const res = await post("/api/customers/index.php?action=create", payload);
    return res.customer;
};
