import { get } from "../../../services/axios";

// api/pos/reports/index.php (a POS-scoped, payment-method-aware endpoint) isn't
// deployed on the live server, and this project can't push backend changes
// there (see [[pos_standalone_no_backend_changes]]). api/invoices/index.php IS
// already live and X-API-Key-authenticated, so Reports is built on top of that
// instead — at the cost of not being POS/terminal-scoped (it lists every
// invoice in the entity, not just this terminal's POS sales) and not exposing
// per-invoice payment method or change amount (only available via a separate
// detail call per invoice, which this "fast" version intentionally skips).
const ENDPOINT = "/api/invoices/index.php";
const PAGE_SIZE = 200;

const fetchInvoicesPage = ({ startDate, endDate, limit, offset }) =>
    get(
        `${ENDPOINT}?${new URLSearchParams({
            date_from: startDate,
            date_to: endDate,
            limit: String(limit),
            offset: String(offset),
        })}`
    );

// api/invoices/index.php's query has no "AND f.pos_source IS NOT NULL" filter
// (unlike legacy's reports.php), so it returns every invoice in the entity —
// regular accounting invoices, credit notes, anything from other Dolibarr
// modules — not just POS sales. That field isn't even in the response to
// filter on directly. Confirmed empirically instead: Dolibarr's POS numbering
// mask always prefixes a validated POS invoice's ref with "IPOS-" (e.g.
// "IPOS-26-0021"), while non-POS refs use other masks ("IN-V-...", "CR-V-...")
// or the generic "(PROVxxx)" placeholder before validation. Filtering on that
// prefix is a client-side proxy for the missing pos_source column, restoring
// legacy's POS-only scoping without a backend change.
const isPosInvoice = (invoice) => (invoice.ref || "").startsWith("IPOS-");

// Pages through the full date range (the endpoint caps each response to
// `limit` rows), mirroring posCache.js's fetchAllCustomers.
export const getInvoicesInRange = async ({ startDate, endDate }) => {
    const all = [];
    let offset = 0;
    while (true) {
        const res = await fetchInvoicesPage({ startDate, endDate, limit: PAGE_SIZE, offset });
        if (!res.success) throw new Error(res.message || res.error || "Failed to load invoices");
        all.push(...res.invoices);
        offset += res.invoices.length;
        if (res.invoices.length === 0 || offset >= res.total_count) break;
    }
    return all.filter(isPosInvoice);
};
