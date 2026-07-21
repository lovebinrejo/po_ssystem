import { get, post } from "../../../services/axios";
import { isSameOriginBackend, buildRequestUrl, dynamicProxyHeaders } from "../../../services/apiConfig";


export const fetchCustomers = async (search = "", limit = 20) => {
    const params = new URLSearchParams({ action: "list", limit: String(limit) });
    if (search.trim()) params.set("search", search.trim());
    const res = await get(`/api/customers/index.php?${params.toString()}`);
    return res.customers;
};


export const fetchCustomersPage = async (limit, offset) => {
    const params = new URLSearchParams({ action: "list", limit: String(limit), offset: String(offset) });
    const res = await get(`/api/customers/index.php?${params.toString()}`);
    return { customers: res.customers, totalCount: res.total_count };
};

export const fetchCustomerById = async (id) => {
    const res = await get(`/api/customers/index.php?action=detail&id=${id}`);
    return res.customer;
};
 
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

    const response = await fetch(buildRequestUrl("/takeposnew/api/customer.php?action=create"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...dynamicProxyHeaders() },
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
