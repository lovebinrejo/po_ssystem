import { getApiBaseUrl, isSameOriginBackend, buildRequestUrl, dynamicProxyHeaders } from "../../../services/apiConfig";

// Fallback shown whenever the real same-origin endpoint below isn't
// reachable — no cross-origin equivalent exists for this yet (unlike
// Reports, which has api/invoices/index.php as a real fallback; see
// [[pos_standalone_no_backend_changes]] for why this project doesn't add
// one). Table occupancy just isn't knowable at all on a cross-origin
// deployment with no legacy session — this mock keeps TableSelectorModal
// functional (so table selection itself still works) rather than breaking,
// but "occupied" here is fake, not real data.
const MOCK_TABLES = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    label: `Table ${i + 1}`,
    occupied: (i + 1) % 4 === 0,
    invoiceId: null,
    itemCount: 0,
    floor: null,
    totalTtc: 0,
}));

// Same-origin only: takeposnew's own tables.php?action=list — session-cookie
// authenticated, same constraint as reports_data.php/payment_summary.php
// (see reportsApi.js). Chosen over the file's other read action (getTables,
// which is scoped to a single `floor`) because this component shows every
// table in one flat grid with no floor concept — "list" already returns
// every floor's tables in one call, exactly matching that shape, and is
// explicitly documented server-side as "Used by waiter table selection
// modal", i.e. built for exactly this UI. Real occupancy is derived from an
// actual unpaid draft invoice tied to this table (`f.floorid`), not the mock
// list's `(id + 1) % 4` placeholder pattern.
const fetchLegacyTables = async () => {
    const response = await fetch(buildRequestUrl("/takeposnew/api/tables.php?action=list"), {
        credentials: "same-origin",
        headers: dynamicProxyHeaders(),
    });
    let data;
    try {
        data = await response.json();
    } catch {
        // Same failure mode as reports_data.php's non-JSON case — most
        // commonly means the session cookie wasn't actually sent/valid.
        throw new Error(`tables.php returned non-JSON (status ${response.status}) — likely no valid session cookie was sent`);
    }
    if (!data.success) throw new Error(data.error || "Failed to load tables");

    // invoiceId/itemCount/floor: legacy's own pos-table-selector.js shows an
    // item-count badge per occupied table and (when selected) loads that
    // table's actual in-progress order into the cart via a same-origin-only
    // ajax.php action this project avoids depending on (see
    // TableSelectorModal.jsx's handleSelect) — invoiceId is what lets that
    // reuse the already-existing, cross-origin-capable fetchReceipt/
    // loadInvoiceIntoCart path Reports uses instead, rather than a second,
    // same-origin-only mechanism.
    return data.tables.map((t) => ({
        id: t.rowid,
        label: t.label,
        occupied: t.status === "occupied",
        invoiceId: t.invoice_id || null,
        itemCount: t.item_count || 0,
        floor: t.floor || null,
        totalTtc: Number(t.total_ttc) || 0,
    }));
};

export const fetchTables = async () => {
    if (!isSameOriginBackend()) {
        console.info(`[legacy-tables] skipped — isSameOriginBackend() is false (getApiBaseUrl="${getApiBaseUrl()}"). Falling back to mock table data.`);
        return MOCK_TABLES;
    }
    try {
        const tables = await fetchLegacyTables();
        console.info(`[legacy-tables] tables.php succeeded — ${tables.length} real tables with real occupancy.`);
        return tables;
    } catch (err) {
        console.warn("[legacy-tables] tables.php failed, falling back to mock table data:", err.message);
        return MOCK_TABLES;
    }
};
