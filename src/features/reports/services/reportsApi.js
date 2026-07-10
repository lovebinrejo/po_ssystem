import { get } from "../../../services/axios";
import { getApiBaseUrl, isSameOriginBackend } from "../../../services/apiConfig";

// api/pos/reports/index.php (a POS-scoped, payment-method-aware endpoint) isn't
// deployed on the live server, and this project can't push backend changes
// there (see [[pos_standalone_no_backend_changes]]). api/invoices/index.php IS
// already live and X-API-Key-authenticated, so Reports is built on top of that
// instead — at the cost of not being POS/terminal-scoped (it lists every
// invoice in the entity, not just this terminal's POS sales).
const ENDPOINT = "/api/invoices/index.php";
const PAGE_SIZE = 200;

// ISO "YYYY-MM-DD" -> legacy's expected "MM/DD/YYYY" (matches this instance's
// configured FormatDateShortInput, confirmed against langs/en_US/main.lang).
const toLegacyDate = (iso) => {
    const [y, m, d] = iso.split("-");
    return `${m}/${d}/${y}`;
};

// Same-origin only: takeposnew's own reports_data.php, session-cookie
// authenticated via the DOLSESSID established by authService.jsx's
// establishLegacySession at login. Unlike api/invoices/index.php this is
// properly POS/terminal-scoped server-side (module_source='takepos' AND
// pos_source=$_SESSION['takeposterminal']), already includes payment_type/
// change/author per row, and its "pending" accounts for credit notes and
// deposits used against the invoice (api/invoices/index.php's doesn't). Only
// reachable when the configured backend is same-origin (see apiConfig.js's
// isSameOriginBackend) — no CORS headers on this file, cookie-only auth.
const fetchLegacyReports = async ({ startDate, endDate, search }) => {
    const params = new URLSearchParams({
        start_date: toLegacyDate(startDate),
        end_date: toLegacyDate(endDate),
    });
    if (search) params.set("search", search);

    const response = await fetch(`${getApiBaseUrl()}/takeposnew/api/reports_data.php?${params}`, {
        credentials: "same-origin",
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "Failed to load reports");

    return {
        entries: data.entries.map((e) => ({
            id: e.id,
            ref: e.ref,
            date: e.date,
            customer: e.customer || "-",
            paymentType: e.payment_type || "Not Specified",
            total_ht: (Number(e.total_ht) || 0),
            total_tva: (Number(e.total_tva) || 0),
            total_ttc: (Number(e.total_ttc) || 0),
            pending: (Number(e.pending) || 0),
            change: (Number(e.change) || 0),
            received: (Number(e.received) || 0),
            author: e.author || "-",
            currency: e.currency || "ZMW",
            status: e.status,
        })),
        totals: data.totals,
    };
};

// Tries the real takeposnew report endpoint first (same-origin backend
// only); falls back to the api/invoices/index.php-based path below on any
// failure — e.g. establishLegacySession never succeeded for this login, or
// the legacy session expired independently of the JWT one. Keeps Reports
// working either way instead of hard-depending on the legacy session.
export const getReportsInRange = async ({ startDate, endDate, search }) => {
    if (isSameOriginBackend()) {
        try {
            return await fetchLegacyReports({ startDate, endDate, search });
        } catch {
            // fall through to the invoices-API path below
        }
    }
    return null;
};

// Same-origin only: takeposnew's own payment_summary.php — totals grouped by
// payment method, for the summary cards legacy shows above its reports
// table. Deliberately called with NO params: confirmed live (both by reading
// pos-reports.js's loadPaymentSummary(), which never sends `daterange`, and
// by watching the real request fire from demo1.ecuenta.online) that legacy's
// own UI does the same — so despite the endpoint technically accepting a
// `daterange` param, this always reflects the *current month* regardless of
// whatever range is selected in the entries table below. Known legacy quirk,
// intentionally replicated here rather than "fixed" — see
// [[legacy-dolibarr-pos-backend]]. Returns null (not a throw) on any failure
// or when not same-origin, so callers can treat it as a pure enhancement.
export const getPaymentSummary = async () => {
    if (!isSameOriginBackend()) return null;
    try {
        const response = await fetch(`${getApiBaseUrl()}/takeposnew/api/payment_summary.php`, {
            credentials: "same-origin",
        });
        const data = await response.json();
        if (!data.success) return null;
        return {
            payments: (data.payments || []).map((p) => ({
                code: p.code || "",
                label: p.label || "Not Specified",
                amount: Number(p.amount) || 0,
                count: Number(p.count) || 0,
            })),
            total: Number(data.total) || 0,
            totalCount: Number(data.total_count) || 0,
        };
    } catch {
        return null;
    }
};

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
