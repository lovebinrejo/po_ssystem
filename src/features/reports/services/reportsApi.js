import { get } from "../../../services/axios";
import { getApiBaseUrl, isSameOriginBackend, buildRequestUrl, dynamicProxyHeaders } from "../../../services/apiConfig";
import { cacheInvoicesList, getCachedInvoicesList } from "../../../services/posCache";

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

    const response = await fetch(buildRequestUrl(`/takeposnew/api/reports_data.php?${params}`), {
        credentials: "same-origin",
        headers: dynamicProxyHeaders(),
    });
    let data;
    try {
        data = await response.json();
    } catch {
        // Most commonly means the session cookie wasn't actually sent/valid —
        // Dolibarr's login page HTML came back instead of JSON. See
        // [[pos_standalone_demo_proxy]] for why this specific failure mode is
        // what made "Author missing in Reports" so hard to diagnose blind.
        throw new Error(`reports_data.php returned non-JSON (status ${response.status}) — likely no valid session cookie was sent`);
    }
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
    if (!isSameOriginBackend()) {
        console.info(`[legacy-reports] skipped — isSameOriginBackend() is false (getApiBaseUrl="${getApiBaseUrl()}"). Falling back to api/invoices/index.php (no Author/Payment Type/Change on this server).`);
        return null;
    }
    try {
        const result = await fetchLegacyReports({ startDate, endDate, search });
        console.info(`[legacy-reports] reports_data.php succeeded — ${result.entries.length} entries with real Author/Payment Type.`);
        return result;
    } catch (err) {
        console.warn("[legacy-reports] reports_data.php failed, falling back to api/invoices/index.php:", err.message);
        return null;
    }
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
// [[legacy-dolibarr-pos-backend]]. Returns null on failure so the caller
// falls through to summarizeInvoicePayments below.
const fetchLegacyPaymentSummary = async () => {
    try {
        const response = await fetch(buildRequestUrl("/takeposnew/api/payment_summary.php"), {
            credentials: "same-origin",
            headers: dynamicProxyHeaders(),
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

// Universal fallback for when the same-origin legacy path above isn't
// available (the normal case — see [[pos_standalone_no_backend_changes]]:
// user explicitly doesn't want backend endpoints touched at all, even for a
// one-line typo fix, so this builds the aggregate client-side instead, from
// whichever per-invoice endpoint is actually working on the configured
// server). Tries api/pos/receipt/index.php first — its payments SQL is
// correct (uses the real `p.datep` column) and returns real payment data
// wherever that endpoint itself is reachable (confirmed live on local WAMP).
// Falls back to api/invoices/index.php's detail action otherwise (e.g.
// api/pos/receipt returning "Include of main fails" on the shared
// demo/demo1.ecuenta.online deployment — confirmed both hostnames resolve
// to the same backend, same bug, live) — but that endpoint's own payments
// sub-query references a nonexistent column (`p.datepaye` instead of
// `p.datep`) and always comes back empty, a real backend bug this project
// isn't touching. So on that server, every path comes up empty and this
// legitimately has no data to show — not a frontend gap, there's simply no
// working endpoint left to ask.
const fetchInvoicePayments = async (invoiceId) => {
    try {
        const data = await get(`/api/pos/receipt/index.php?id=${invoiceId}`);
        if (data.success) return data.receipt.payments || [];
    } catch {
        // fall through
    }
    try {
        const detail = await fetchInvoiceDetail(invoiceId);
        if (detail.success) {
            return (detail.invoice.payments || []).map((p) => ({ amount: p.amount, payment_label: p.method_label, payment_code: p.method_code }));
        }
    } catch {
        // no data available from either endpoint on this server
    }
    return [];
};

// api/invoices/index.php's list response has no payment-method field at all
// (see isPosInvoice's comment) — this fetches per-invoice payment data for
// every invoice in the current result set and aggregates client-side.
// Unlike the legacy path above, this genuinely reflects the selected date
// range (no "always current month" quirk) since there's no equivalent
// server-side default to replicate here.
// Capped at 100 invoices: this project has no way to batch/aggregate
// server-side, so a very wide date range would otherwise fire that many
// concurrent requests. Returns null past the cap rather than degrading
// silently — callers just don't show the section for such a wide range.
const PAYMENT_SUMMARY_INVOICE_CAP = 100;

const summarizeInvoicePayments = async (invoices) => {
    if (!invoices || invoices.length === 0 || invoices.length > PAYMENT_SUMMARY_INVOICE_CAP) return null;

    const perInvoicePayments = await Promise.all(invoices.map((inv) => fetchInvoicePayments(inv.id)));

    const byMethod = new Map();
    let total = 0;
    let totalCount = 0;
    for (const payments of perInvoicePayments) {
        for (const p of payments) {
            const key = p.payment_code || p.payment_label || "other";
            const existing = byMethod.get(key) || { code: p.payment_code || "", label: p.payment_label || "Not Specified", amount: 0, count: 0 };
            existing.amount += Number(p.amount) || 0;
            existing.count += 1;
            byMethod.set(key, existing);
            total += Number(p.amount) || 0;
            totalCount += 1;
        }
    }
    if (totalCount === 0) return null;
    return { payments: Array.from(byMethod.values()), total, totalCount };
};

export const getPaymentSummary = async (invoices) => {
    if (isSameOriginBackend()) {
        const legacy = await fetchLegacyPaymentSummary();
        if (legacy) return legacy;
    }
    return summarizeInvoicePayments(invoices);
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

// action=detail: full single-invoice fetch (customer, lines, payments, ZRA
// SDC data) — routed to automatically by the backend whenever `id` is
// present without an explicit `action`. Used by receiptApi.js as a fallback
// data source when api/pos/receipt/index.php itself is unavailable on the
// configured server (see [[pos_standalone_no_backend_changes]] — that
// endpoint is broken server-side on demo.ecuenta.online with no way for
// this project to patch it, so receipts fall back to reshaping this
// already-working, already-used-for-Reports endpoint instead).
export const fetchInvoiceDetail = (invoiceId) => get(`${ENDPOINT}?id=${invoiceId}`);

// api/invoices/index.php's query has no "AND f.pos_source IS NOT NULL" filter
// (unlike legacy's reports.php), so it returns every invoice in the entity —
// regular accounting invoices, credit notes, anything from other Dolibarr
// modules — not just POS sales. That field isn't even in the response to
// filter on directly. Approximated instead via the validated POS invoice's
// ref prefix, which is a client-side proxy for the missing pos_source column
// — but that mask is a per-instance Dolibarr admin setting, not a constant:
// the local WAMP instance is configured as "IPOS-{yy}-{seq}", while
// demo1.ecuenta.online is configured as "TC{terminal}-{yymm}-{seq}" (e.g.
// "TC1-2607-0081") instead. Both are recognized here; a third differently-
// configured instance would need its mask added too — this is inherently a
// heuristic, not the real pos_source filter (see [[legacy_dolibarr_pos_backend]]).
//
// True drafts (api/pos/draft) never get a validated ref — they stay a
// "(PROVxxx)" placeholder until paid — so the prefix check alone always
// excludes them, unlike legacy's own reports_data.php (which scopes by
// module_source/pos_source and has no status exclusion, so drafts show up
// labeled "Draft"). api/invoices/index.php doesn't return ref_client either,
// so there's no reliable way to confirm a draft's POS origin here; falling
// back to "any draft" is a deliberate, known-imprecise proxy (a non-POS
// draft invoice elsewhere in this entity would also show up) rather than
// the real pos_source filter.
const isPosInvoice = (invoice) => {
    const ref = invoice.ref || "";
    if (ref.startsWith("IPOS-") || /^TC\d+-/.test(ref)) return true;
    return invoice.status_label === "Draft";
};

// Pages through the full date range (the endpoint caps each response to
// `limit` rows), mirroring posCache.js's fetchAllCustomers. Network-first:
// invoices change constantly as new sales happen, so a live fetch is always
// attempted first — the cached copy of this exact date range is only used
// as a fallback if the live fetch fails outright (e.g. no network), so
// Reports keeps showing the last known-good data instead of an error.
export const getInvoicesInRange = async ({ startDate, endDate }) => {
    try {
        const all = [];
        let offset = 0;
        while (true) {
            const res = await fetchInvoicesPage({ startDate, endDate, limit: PAGE_SIZE, offset });
            if (!res.success) throw new Error(res.message || res.error || "Failed to load invoices");
            all.push(...res.invoices);
            offset += res.invoices.length;
            if (res.invoices.length === 0 || offset >= res.total_count) break;
        }
        const filtered = all.filter(isPosInvoice);
        cacheInvoicesList(startDate, endDate, filtered);
        return filtered;
    } catch (err) {
        const cached = await getCachedInvoicesList(startDate, endDate);
        if (cached) return cached;
        throw err;
    }
};
