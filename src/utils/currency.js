// Zambian Kwacha with proper thousand separators, using the "ZMW" code
// (currencyDisplay: "code") rather than Intl's "K" symbol, to match the
// ZMW label used everywhere else in the app.
export const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-ZM", { style: "currency", currency: "ZMW", currencyDisplay: "code" }).format(amount || 0);

// Number only (no "ZMW" prefix) — for layouts that pin the "ZMW" label in its
// own column and right-align just the digits, e.g. a stacked bill/receipt
// where every row's currency label should line up regardless of amount width.
export const formatAmount = (amount) =>
    new Intl.NumberFormat("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);
