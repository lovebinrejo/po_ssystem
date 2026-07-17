import { isSameOriginBackend, buildRequestUrl, dynamicProxyHeaders } from "../../../services/apiConfig";

// takeposnew/ajax/ajax.php's deleteDraftInvoice action — stock/shared code,
// confirmed byte-for-byte present on both ecnta10 and ecuenta9 (same file
// this app already relies on for UOM data, see productApi.js). Same-origin/
// session-cookie only, same constraint as every other legacy fetch in this
// app (tableApi.js's fetchLegacyTables, productApi.js's fetchLegacyUomMap).
//
// The backend already refuses to delete anything that isn't a true
// Dolibarr draft (`$invoice->statut != Facture::STATUS_DRAFT` -> a clear
// JSON error, not a silent no-op or something destructive) — so this is
// safe to offer even for a draftInvoicesByPlace entry that's actually a
// validated deferred_payment invoice (see paymentService.js's
// saveDraftInvoice fallback path): the backend rejects that case on its own
// instead of this needing to know which kind of "draft" it's looking at.
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
