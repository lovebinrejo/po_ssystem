import { post } from "../../../services/axios";

// Mirrors takeposnew/ajax/ajax.php's createInvoiceWithPayment via the clean
// REST endpoint built for this app: api/pos/payment. See that file's PHPDoc
// (handlePosPayment) for the full request/response contract. Supports
// existing_invoice_id to add another payment to an already-created invoice —
// the mechanism useSplitPayment uses to settle a sale across multiple methods
// without any backend changes.
export const submitPayment = (payload) => post("/api/pos/payment/index.php", payload);

// Product prices from the legacy API are tax-inclusive (price_ttc) and don't
// carry a per-product tax rate yet, so the HT/TTC split below is a flat
// placeholder estimate until that data is available from the backend.
export const TAX_RATE = 0.16;

// Shared by usePayment and useSplitPayment so both build identical line
// payloads for api/pos/payment regardless of how many payment calls a sale
// ends up needing.
export const buildPaymentLines = (cart) =>
    cart.map((item) => {
        const priceTtc = item.price;
        const priceHt = priceTtc / (1 + TAX_RATE);
        return {
            fk_product: item.id,
            qty: item.qty,
            price: priceHt,
            subprice: priceTtc,
            tva_tx: String(Math.round(TAX_RATE * 100)),
            description: item.name,
        };
    });
