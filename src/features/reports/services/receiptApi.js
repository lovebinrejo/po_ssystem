import { get } from "../../../services/axios";

// api/pos/receipt/index.php returns full invoice detail (company, customer,
// line items, payments) needed to render a real receipt — distinct from the
// reports list endpoint, which only has one summary row per invoice.
export const fetchReceipt = async (invoiceId) => {
    const data = await get(`/api/pos/receipt/index.php?id=${invoiceId}`);
    if (!data.success) throw new Error(data.error || data.message || "Failed to load receipt");
    return data.receipt;
};
