import { get } from "../../../services/axios";
import { cacheReceipt, getCachedReceipt, getCachedOrderMeta } from "../../../services/posCache";
import { fetchInvoiceDetail } from "./reportsApi";

// api/invoices/index.php's ?id= detail action returns `date` as a raw
// Dolibarr Unix timestamp (seconds, e.g. 1784246400), not a formatted
// string — confirmed by reading that file's source (`'date' => $invoice->date`,
// no dol_print_date() wrapping, unlike its own zra_sdc block a few lines
// below, which does format its date). Left as-is, this rendered the raw
// epoch number straight onto the receipt ("Date: 1784246400") — confirmed
// live 2026-07-17. Guards against a value that's already a date string too
// (defensive, in case this differs by Dolibarr version/config), since
// `Number("2026-07-17")` is NaN, not a false positive.
const formatUnixDate = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || String(value) !== String(num)) return value;
    return new Date(num * 1000).toISOString().split("T")[0];
};

// Reshapes api/invoices/index.php's ?id= detail response (already live and
// working everywhere Reports works) into the shape InvoiceReceipt.jsx's
// buildReceiptHtml expects. Only used when api/pos/receipt/index.php itself
// is unavailable on the configured server — verified live 2026-07-17 on
// both demo.ecuenta.online and a local WAMP instance (ecnta10), where that
// endpoint returns HTTP 200 with the raw PHP failure text "Include of main
// fails" (a broken include path, not fixable from this project — see
// [[pos_standalone_no_backend_changes]]). This fallback endpoint has no
// module_source/pos_source/terminal/sales-associate/change data (see
// [[pos_standalone_reports_rebuilt_on_invoices_api]]) and no `company`
// object of its own either — fetchReceipt below fills that gap in from
// fetchCompanyBranding instead, so a receipt built this way is missing
// terminal number, sales associate, and any change amount, but no longer
// missing the shop's letterhead the way it used to.
const receiptFromInvoiceDetail = (invoice) => ({
    invoice_ref: invoice.ref,
    invoice_date: formatUnixDate(invoice.date),
    customer: { name: invoice.customer?.name, tpin: invoice.customer?.tpin },
    currency: invoice.currency,
    currency_symbol: invoice.currency_symbol,
    lines: (invoice.lines || []).map((line) => ({
        product_label: line.product_label,
        description: line.description,
        tva_tx: line.tva_tx,
        qty: line.qty,
        price_unit: line.subprice,
        total_ttc: line.total_ttc,
    })),
    total_ht: invoice.total_ht,
    total_tva: invoice.total_tva,
    total_ttc: invoice.total_ttc,
    payments: (invoice.payments || []).map((p) => ({
        payment_label: p.method_label,
        payment_code: p.method_code,
        amount: p.amount,
    })),
    // ZRA (Zambia Revenue Authority) fiscal e-invoicing data — unlike the
    // rest of this fallback, api/invoices/index.php's detail response
    // actually already includes this (confirmed live: id=405 on
    // demo.ecuenta.online returns a populated zra_sdc block), api/pos/
    // receipt/index.php does NOT. So this is the one piece where the
    // fallback path is strictly more complete than the primary endpoint.
    zra_sdc: invoice.zra_sdc || null,
});

// api/invoices/details.php — a third, separate api/invoices/ file (not the
// same as api/invoices/index.php's own ?id= detail action, confirmed by
// diff) that happens to carry fields the other two paths don't reliably
// have between them: a zra_sdc block, and — the reason this is also relied
// on for company info now — a full company name/address/zip/town/phone/tpin
// block, same shape as api/pos/receipt/index.php's own. X-API-Key auth,
// proper CORS headers, same as every other api/* endpoint — confirmed live
// 2026-07-17: reachable (401 without a key, i.e. the file exists and runs)
// cross-origin on all three test backends with no same-origin trick
// needed. Best-effort and non-fatal: a receipt is still usable without any
// of this, so a failure here just means it's missing, same as before this
// existed.
//
// This also returns a `company.logo` (built server-side from Dolibarr's
// MAIN_INFO_SOCIETE_LOGO config), deliberately dropped here rather than
// merged in — InvoiceReceipt.jsx now always renders this app's own bundled
// logo instead (see that file's comment), so there's nothing to do with a
// per-merchant logo URL even when the backend has a real one configured.
const fetchCompanyBranding = async (invoiceId) => {
    try {
        const data = await get(`/api/invoices/details.php?id=${invoiceId}`);
        if (!data.success) return null;
        const company = data.data?.company || null;
        return { company, zra_sdc: data.data?.zra_sdc || null };
    } catch {
        return null;
    }
};

// api/pos/receipt/index.php returns full invoice detail (company, customer,
// line items, payments) needed to render a real receipt — distinct from the
// reports list endpoint, which only has one summary row per invoice.
// Network-first: always tries the live endpoint (an invoice's payments/
// change can update after the fact). On failure, tries reshaping
// api/invoices/index.php's detail response (see above) before finally
// falling back to the last cached copy of this exact invoice — e.g. no
// network at all. Successful fetches (from either endpoint) refresh the
// cache for next time.
//
// fetchCompanyBranding and getCachedOrderMeta are both fired immediately,
// in parallel with whichever of the two paths above ends up running,
// rather than after — independent lookups, no reason to pay their latency
// sequentially. Only merged onto a receipt that actually loaded; the final
// offline-cache fallback returns as-is (no network/lookup left to ask).
//
// Company info merge order is branding's fields first, then receipt's own
// spread on top — receiptFromInvoiceDetail (the "Include of main fails"
// fallback path, confirmed live 2026-07-17 on ecnta10 for at least one real
// invoice, not just demo.ecuenta.online as previously thought) never sets
// `company` at all, so without this a receipt built that way rendered a
// completely blank letterhead — no company name, address, phone, or tpin —
// even though api/invoices/details.php had all of it the whole time. When
// the primary endpoint *did* succeed, its own company fields still win
// (spread last), branding's copy of the same fields just goes unused.
//
// order_type/table_label come from getCachedOrderMeta (see posCache.js) —
// neither backend path ever sets these at all (no api/pos/* endpoint reads
// or writes fk_transport_mode/place), so there's no "receipt's own wins"
// precedence to worry about here, unlike company — always safe to just
// spread the cached copy in when present.
export const fetchReceipt = async (invoiceId) => {
    const brandingPromise = fetchCompanyBranding(invoiceId);
    const orderMetaPromise = getCachedOrderMeta(invoiceId);
    let receipt;
    try {
        const data = await get(`/api/pos/receipt/index.php?id=${invoiceId}`);
        if (!data.success) throw new Error(data.error || data.message || "Failed to load receipt");
        receipt = data.receipt;
    } catch (primaryErr) {
        try {
            const detail = await fetchInvoiceDetail(invoiceId);
            if (!detail.success) throw new Error(detail.error || "Failed to load invoice detail", { cause: primaryErr });
            receipt = receiptFromInvoiceDetail(detail.invoice);
        } catch (fallbackErr) {
            const cached = await getCachedReceipt(invoiceId);
            if (cached) return cached;
            throw new Error(primaryErr.message, { cause: fallbackErr });
        }
    }

    const [branding, orderMeta] = await Promise.all([brandingPromise, orderMetaPromise]);
    const finalReceipt = {
        ...receipt,
        ...(branding
            ? { company: { ...branding.company, ...receipt.company }, zra_sdc: receipt.zra_sdc || branding.zra_sdc }
            : {}),
        ...(orderMeta || {}),
    };
    cacheReceipt(invoiceId, finalReceipt);
    return finalReceipt;
};
