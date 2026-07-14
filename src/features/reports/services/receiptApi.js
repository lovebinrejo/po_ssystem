import { get } from "../../../services/axios";
import { cacheReceipt, getCachedReceipt } from "../../../services/posCache";
import { fetchInvoiceDetail } from "./reportsApi";

// Reshapes api/invoices/index.php's ?id= detail response (already live and
// working everywhere Reports works) into the shape InvoiceReceipt.jsx's
// buildReceiptHtml expects. Only used when api/pos/receipt/index.php itself
// is unavailable on the configured server — verified live against
// demo.ecuenta.online, where that endpoint returns HTTP 200 with the raw
// PHP failure text "Include of main fails" (a broken include path in that
// specific deployment, not fixable from this project — see
// [[pos_standalone_no_backend_changes]]). This fallback endpoint has no
// module_source/pos_source/terminal/sales-associate/company/change data
// (see [[pos_standalone_reports_rebuilt_on_invoices_api]]), so a receipt
// built this way is missing the shop's letterhead (name/address/phone/tpin),
// terminal number, sales associate, and any change amount — a real
// degradation, but still a usable itemized receipt with real totals/
// customer/payments instead of a hard failure.
const receiptFromInvoiceDetail = (invoice) => ({
    invoice_ref: invoice.ref,
    invoice_date: invoice.date,
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

// api/pos/receipt/index.php returns full invoice detail (company, customer,
// line items, payments) needed to render a real receipt — distinct from the
// reports list endpoint, which only has one summary row per invoice.
// Network-first: always tries the live endpoint (an invoice's payments/
// change can update after the fact). On failure, tries reshaping
// api/invoices/index.php's detail response (see above) before finally
// falling back to the last cached copy of this exact invoice — e.g. no
// network at all. Successful fetches (from either endpoint) refresh the
// cache for next time.
export const fetchReceipt = async (invoiceId) => {
    try {
        const data = await get(`/api/pos/receipt/index.php?id=${invoiceId}`);
        if (!data.success) throw new Error(data.error || data.message || "Failed to load receipt");
        cacheReceipt(invoiceId, data.receipt);
        return data.receipt;
    } catch (primaryErr) {
        try {
            const detail = await fetchInvoiceDetail(invoiceId);
            if (!detail.success) throw new Error(detail.error || "Failed to load invoice detail", { cause: primaryErr });
            const receipt = receiptFromInvoiceDetail(detail.invoice);
            cacheReceipt(invoiceId, receipt);
            return receipt;
        } catch (fallbackErr) {
            const cached = await getCachedReceipt(invoiceId);
            if (cached) return cached;
            throw new Error(primaryErr.message, { cause: fallbackErr });
        }
    }
};
