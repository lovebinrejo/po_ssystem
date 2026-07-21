import { post } from "../../../services/axios";
import { getApiBaseUrl, isSameOriginBackend, buildRequestUrl, dynamicProxyHeaders } from "../../../services/apiConfig";


export const submitPayment = (payload) => post("/api/pos/payment/index.php", payload);


export const fetchBankAccounts = async () => {
    if (!isSameOriginBackend()) return [];
    try {
        const response = await fetch(buildRequestUrl("/api/bank_accounts.php"), {
            credentials: "same-origin",
            headers: { ...dynamicProxyHeaders() },
        });
        const data = await response.json();
        return data.success ? data.results : [];
    } catch {
        return [];
    }
};


export const fetchPaymentTypes = async () => {
    if (!isSameOriginBackend()) return [];
    try {
        const response = await fetch(buildRequestUrl("/api/payment_types.php"), {
            credentials: "same-origin",
            headers: { ...dynamicProxyHeaders() },
        });
        const data = await response.json();
        return data.success ? data.results : [];
    } catch {
        return [];
    }
};


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

export const TAX_RATE = 0.16;


const lineTaxRate = (item) => (item.tvaRate ?? TAX_RATE * 100) / 100;


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
