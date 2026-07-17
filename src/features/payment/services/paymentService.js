import { post } from "../../../services/axios";
import { getApiBaseUrl } from "../../../services/apiConfig";

// Mirrors takeposnew/ajax/ajax.php's createInvoiceWithPayment via the clean
// REST endpoint built for this app: api/pos/payment. See that file's PHPDoc
// (handlePosPayment) for the full request/response contract. Supports
// existing_invoice_id to add another payment to an already-created invoice —
// the mechanism useSplitPayment uses to settle a sale across multiple methods
// without any backend changes.
export const submitPayment = (payload) => post("/api/pos/payment/index.php", payload);

// True Dolibarr draft (statut=0, never validated) — mirrors legacy's
// submitCartAsDraft. Unlike submitPayment's deferred_payment flag, this
// never decrements stock and the ref stays a (PROVxxx) placeholder until
// the sale is actually paid later via submitPayment's existing_invoice_id.
//
// This file isn't deployed on every backend (confirmed 404 on
// demo.ecuenta.online, present on local WAMP — see this repo's own
// backend-changes/README.md, tracked but never fully rolled out). Every
// usePayment.js saveDraft call already falls back to submitPayment's
// deferred_payment flag on failure — but on a backend missing this file,
// that meant TWO full sequential round-trips to a real, possibly remote
// server on every single Draft click (one guaranteed-404 attempt, then the
// real fallback), which is exactly the "why does Draft take a moment" delay
// reported live on demo.ecuenta.online — not present on local WAMP, where
// this file exists and near-zero localhost latency hides the extra
// round-trip anyway either way. A 404 here means "this backend's own copy
// of the file doesn't have this endpoint at all," a fact about the
// deployment that won't change on retry — so once observed for whichever
// backend URL is currently configured, it's cached and skipped on every
// later call, saving that wasted round-trip without hardcoding which URL
// this applies to (switching backends via the login screen re-probes fresh,
// same as a brand-new install would).
const knownUnavailable = new Map();
const DRAFT_ENDPOINT_MISSING_MESSAGE = "This feature isn't available on the currently configured server.";

export const saveDraftInvoice = async (payload) => {
    const backend = getApiBaseUrl();
    if (knownUnavailable.get(backend)) {
        throw new Error(DRAFT_ENDPOINT_MISSING_MESSAGE);
    }
    try {
        return await post("/api/pos/draft/index.php", payload);
    } catch (err) {
        if (err.message === DRAFT_ENDPOINT_MISSING_MESSAGE) knownUnavailable.set(backend, true);
        throw err;
    }
};

// Fallback only — used for cart items that genuinely have no VAT rate of
// their own (locked lines loaded from a Reports invoice via
// loadInvoiceIntoCart, which only carries id/name/price/qty; the real
// per-line rate already lives on the settled invoice server-side and isn't
// needed again for those). Every product fetched normally through
// productApi.js's normalizeProduct carries its own real `tvaRate` now, so
// this default is not applied to standard cart items.
export const TAX_RATE = 0.16;

// Real per-product VAT rate (0-100, e.g. 16 or 0) — api/pos/products/index.php
// already returns this (tva_tx/vat_src_code), previously dropped at the
// productApi.js normalization step, so every sale was charged a flat 16%
// regardless of the product's actual rate. That's not just a display bug:
// ZRA's own fiscal (SDC) validation rejects the invoice outright when the
// submitted VAT doesn't match what it independently computes from the
// product/rate on file ("Wrong Total Tax amount computation"), so every
// non-16%-rated product sold through this app was failing real tax-authority
// submission. Falls back to TAX_RATE*100 only for items with no rate of
// their own (see above).
const lineTaxRate = (item) => (item.tvaRate ?? TAX_RATE * 100) / 100;

// Shared by usePayment and useSplitPayment so both build identical line
// payloads for api/pos/payment regardless of how many payment calls a sale
// ends up needing.
export const buildPaymentLines = (cart) =>
    cart.map((item) => {
        const rate = lineTaxRate(item);
        const priceTtc = item.price;
        const priceHt = priceTtc / (1 + rate);
        return {
            fk_product: item.id,
            qty: item.qty,
            price: priceHt,
            subprice: priceTtc,
            tva_tx: String(Math.round(rate * 100)),
            vat_src_code: item.vatSrcCode || "",
            description: item.name,
        };
    });

// Cart-wide HT/VAT split for display (CartPanel, PaymentModal summaries) —
// summed per-line using each item's own real rate instead of applying one
// flat rate to the whole cart total, so mixed-VAT carts (e.g. one exempt
// item alongside standard-rated ones) show correct numbers on screen too,
// not just in the actual submitted invoice.
export const computeCartTotals = (cart) => {
    let subtotalExcl = 0;
    let tax = 0;
    let total = 0;
    cart.forEach((item) => {
        const rate = lineTaxRate(item);
        const lineTtc = item.price * item.qty;
        const lineHt = lineTtc / (1 + rate);
        subtotalExcl += lineHt;
        tax += lineTtc - lineHt;
        total += lineTtc;
    });
    return { subtotalExcl, tax, total };
};
