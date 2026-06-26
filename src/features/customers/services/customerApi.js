// Placeholder data until a legacy-backed endpoint exists. customer_ajax.php
// (searchCustomers/getCustomerInfo) is session-cookie auth only and can't be
// called cross-origin from this app's X-API-Key-based session — see api/pos/
// products/index.php for the auth pattern a future api/pos/customers
// endpoint should follow.
const MOCK_CUSTOMERS = [
    { id: 1, name: "customer1", tpin: "1000000000", email: "geno@voxforem.com" },
    { id: 2, name: "Walk-in Customer", tpin: "—", email: "" },
    { id: 3, name: "Jane Banda", tpin: "1000123456", email: "jane.banda@example.com" },
    { id: 4, name: "Mwansa Stores Ltd", tpin: "1000987654", email: "accounts@mwansastores.zm" },
];

export const fetchCustomers = async (search = "") => {
    const term = search.trim().toLowerCase();
    if (!term) return MOCK_CUSTOMERS;
    return MOCK_CUSTOMERS.filter(
        (c) => c.name.toLowerCase().includes(term) || c.tpin.toLowerCase().includes(term)
    );
};

export const DEFAULT_CUSTOMER = MOCK_CUSTOMERS[0];
