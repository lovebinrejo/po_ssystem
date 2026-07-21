import { isSameOriginBackend, buildRequestUrl, dynamicProxyHeaders } from "../../../services/apiConfig";


export const saveLegacyDraftInvoice = async ({ cart, customerId, terminal, place }) => {
    if (!isSameOriginBackend()) {
        throw new Error("Saving a true draft needs a same-origin session — not available on the currently configured connection.");
    }
    const items = cart.map((item) => ({
        label: item.name,
        product_id: item.id,
        qty: item.qty,
        price: item.price,
        price_ttc: item.price,
        price_base_type: "TTC",
        tva_tx: String(item.tvaRate ?? 0),
        vat_src_code: item.vatSrcCode || "",
        discount_percent: item.discountPercent || 0,
    }));

    const response = await fetch(buildRequestUrl("/takeposnew/ajax/ajax.php"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", ...dynamicProxyHeaders() },
        body: new URLSearchParams({
            action: "saveDraft",
            cart: JSON.stringify(items),
            customer_id: String(customerId || 0),
            terminal: String(terminal || 1),
            place: String(place || 0),
        }),
    });
    let data;
    try {
        data = await response.json();
    } catch {
        
        const err = new Error(`saveDraft returned non-JSON (status ${response.status}) — likely no valid session cookie was sent`);
        err.staleSession = true;
        throw err;
    }
    
    if (data.error || !data.success) throw new Error(data.error || "Failed to save draft");
    return data;
};

export const deleteLegacyDraftInvoice = async (invoiceId) => {
    if (!isSameOriginBackend()) {
        throw new Error("Deleting a draft needs a same-origin session — not available on the currently configured connection.");
    }
    const response = await fetch(buildRequestUrl("/takeposnew/ajax/ajax.php"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", ...dynamicProxyHeaders() },
        body: new URLSearchParams({ action: "deleteDraftInvoice", invoice_id: invoiceId }),
    });
    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error(`deleteDraftInvoice returned non-JSON (status ${response.status}) — likely no valid session cookie was sent`);
    }
    if (!data.success) throw new Error(data.error || "Failed to delete draft invoice");
    return data;
};
