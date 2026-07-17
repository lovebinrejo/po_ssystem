import { useEffect, useRef, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
    BarChart3,
    X,
    Filter,
    Search,
    Printer,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    FileSpreadsheet,
    FileDown,
    Loader2,
    Banknote,
    CreditCard,
    Smartphone,
    Landmark,
    FileCheck,
    HelpCircle,
    Eye,
    Ruler,
    AlertTriangle,
} from "lucide-react";
import useAuthStore from "../../authentication/stores/authStore";
import usePosStore from "../../pos/stores/posStore";
import { getInvoicesInRange, getReportsInRange, getPaymentSummary } from "../services/reportsApi";
import { fetchReceipt } from "../services/receiptApi";
import { buildReceiptHtml, printReceipt } from "./InvoiceReceipt";
import { exportReportExcel, exportReportPDF } from "./ReportExport";
import DateRangePicker from "./DateRangePicker";

const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// entry.date is a display string ("MM/DD/YYYY"), not a raw sortable value —
// parse it the same way the rest of this app formats dates so "Date" sorts
// chronologically instead of alphabetically.
const parseDisplayDate = (str) => {
    const [m, d, y] = str.split("/").map(Number);
    return new Date(y, m - 1, d).getTime();
};

// api/invoices/index.php returns `date` as a raw MySQL datetime string
// ("YYYY-MM-DD HH:MM:SS"), not pre-formatted like the old api/pos/reports
// endpoint was — reformat to the same "MM/DD/YYYY" display/sort convention
// the rest of this table already uses.
const formatInvoiceDate = (raw) => {
    if (!raw) return "";
    const [y, m, d] = raw.split(" ")[0].split("-").map(Number);
    return `${m}/${d}/${y}`;
};

const compareEntries = (a, b, field, dir) => {
    let result;
    if (field === "date") {
        result = parseDisplayDate(a.date) - parseDisplayDate(b.date);
    } else if (typeof a[field] === "number") {
        result = a[field] - b[field];
    } else {
        result = String(a[field] ?? "").localeCompare(String(b[field] ?? ""));
    }
    return dir === "asc" ? result : -result;
};

const reportsQueryKey = (terminal, filters) => [
    "reports",
    terminal,
    toIso(filters.start),
    toIso(filters.end),
    filters.search,
];

// Mirrors payment_summary.php's own icon heuristic (code/label substring
// match) so the cards look the same as legacy, just with lucide icons
// instead of FontAwesome classes.
const getPaymentIcon = (code, label) => {
    const s = `${code} ${label}`.toLowerCase();
    if (s.includes("card")) return CreditCard;
    if (s.includes("cash")) return Banknote;
    if (s.includes("mobile")) return Smartphone;
    if (s.includes("bank")) return Landmark;
    if (s.includes("cheque") || s.includes("check")) return FileCheck;
    return HelpCircle;
};

// api/invoices/index.php's own `status_label` only ever computes Draft/
// Unpaid/Paid (statut==0 -> Draft always, then paye==1 -> Paid overrides
// everything else) — it has no case for statut==3 (Abandoned) at all, so an
// abandoned invoice silently shows as "Draft" or "Paid" depending on `paye`,
// and statut==2 ("Classified Paid", a distinct Dolibarr state from a normal
// validated-and-settled invoice) is indistinguishable from statut==1+paye==1.
// Legacy's own takeposnew/api/reports_data.php computes this more precisely
// from the exact same raw `fk_statut`/`paye` fields (also present in this
// endpoint's response as `statut`/`paye`, just not used this way) — mirrored
// here verbatim so drop-down filtering like isSettleable's "Abandoned" check
// below actually has real data to match against instead of a value the old
// status_label could never produce.
const computeStatusLabel = (inv) => {
    if (inv.statut === 0) return "Draft";
    if (inv.statut === 1) return inv.paye === 1 ? "Paid" : "Validated (Unpaid)";
    if (inv.statut === 2) return "Classified Paid";
    if (inv.statut === 3) return "Abandoned";
    return inv.status_label || "Unknown";
};

// Maps api/invoices/index.php's generic invoice shape onto what this table
// needs. Only used as the fallback path when the real takeposnew endpoint
// (getReportsInRange, same-origin only) isn't reachable — see reportsApi.js.
// This fallback still isn't scoped to POS/this terminal (it's every invoice
// in the entity, filtered client-side by a per-instance ref-prefix heuristic
// — see isPosInvoice below). `author`/`payment_type`/`change` are also only
// present in newer deployments of this endpoint (confirmed absent from the
// shared demo/demo1.ecuenta.online deployment — a genuine backend-side gap
// there, not a frontend one) — the "-"/"Not Specified"/0 fallbacks below are
// what renders whenever a given server's copy doesn't return them.
const mapInvoiceToEntry = (inv) => {
    const paye = inv.paye === 1;
    const totalPaid = paye && inv.sumpayed === 0 ? inv.total_ttc : inv.sumpayed;
    const pending = Math.max(0, inv.total_ttc - totalPaid);
    return {
        id: inv.id,
        ref: inv.ref,
        date: formatInvoiceDate(inv.date),
        customer: inv.socname || inv.thirdparty_name || "-",
        paymentType: inv.payment_type || "Not Specified",
        total_ht: inv.total_ht,
        total_tva: inv.total_tva,
        total_ttc: inv.total_ttc,
        pending,
        change: inv.change || 0,
        received: totalPaid,
        author: inv.author || "-",
        currency: inv.currency || inv.multicurrency_code || "ZMW",
        status: computeStatusLabel(inv),
    };
};

const fetchReports = async (terminal, filters) => {
    // Real, terminal-scoped takeposnew data when available (htdocs build with
    // a working legacy session) — see getReportsInRange. Returns null (rather
    // than throwing) when not applicable/available, so this always falls back
    // to the api/invoices/index.php path below instead of breaking Reports.
    const legacy = await getReportsInRange({
        startDate: toIso(filters.start),
        endDate: toIso(filters.end),
        search: filters.search,
    });
    if (legacy) return legacy;

    const invoices = await getInvoicesInRange({ startDate: toIso(filters.start), endDate: toIso(filters.end) });
    const term = filters.search.trim().toLowerCase();
    const entries = invoices
        .map(mapInvoiceToEntry)
        .filter((e) => !term || e.ref?.toLowerCase().includes(term) || e.customer?.toLowerCase().includes(term));

    const totals = entries.reduce(
        (acc, e) => ({
            total_ht: acc.total_ht + e.total_ht,
            total_tva: acc.total_tva + e.total_tva,
            total_ttc: acc.total_ttc + e.total_ttc,
            pending: acc.pending + e.pending,
            received: acc.received + e.received,
        }),
        { total_ht: 0, total_tva: 0, total_ttc: 0, pending: 0, received: 0 }
    );

    return { entries, totals };
};

function ReportsModal({ open, onClose }) {
    const terminalNumber = useAuthStore((state) => state.terminalConfig?.terminalNumber) || 1;
    const loadInvoiceIntoCart = usePosStore((state) => state.loadInvoiceIntoCart);
    const showToast = usePosStore((state) => state.showToast);
    const overlayRef = useRef(null);

    // Draft inputs for the filter bar; only become the active query when "Apply Filter" is clicked.
    const [startDate, setStartDate] = useState(today());
    const [endDate, setEndDate] = useState(today());
    const [search, setSearch] = useState("");
    const [tableSearch, setTableSearch] = useState("");
    const [pageSize, setPageSize] = useState(25); // number of rows, or "All"
    const [page, setPage] = useState(1);
    // Mirrors legacy's DataTables default (order: [[0, 'desc']] — Date, newest first).
    const [sortField, setSortField] = useState("date");
    const [sortDir, setSortDir] = useState("desc");
    const [printingId, setPrintingId] = useState(null);
    const [previewReceipt, setPreviewReceipt] = useState(null);
    // Mirrors legacy's receipt.php controls (togglePreview/toggleWidth): a
    // dark, perforated-edge "thermal roll" simulation on/off, and which of
    // the two common thermal-printer paper widths the actual print job (and
    // the simulation, when on) targets. Reset per-preview-open below.
    const [thermalPreview, setThermalPreview] = useState(false);
    const [thermalWidth, setThermalWidth] = useState(80);
    const [exportingExcel, setExportingExcel] = useState(false);
    const [printError, setPrintError] = useState("");
    const [loadingInvoiceId, setLoadingInvoiceId] = useState(null);
    const [loadError, setLoadError] = useState("");

    // This modal stays mounted across opens (only `open` toggles), so without
    // this a "nothing to settle" message from a previous visit would still be
    // sitting there next time it's reopened. Auto-dismiss like a toast instead.
    useEffect(() => {
        if (!loadError) return;
        const timer = setTimeout(() => setLoadError(""), 3500);
        return () => clearTimeout(timer);
    }, [loadError]);

    // Submitted filters drive the query key, so reopening with the same filters serves cached data instantly.
    const [filters, setFilters] = useState({ start: today(), end: today(), search: "" });

    const { data, isLoading, isFetching, error: queryError } = useQuery({
        queryKey: reportsQueryKey(terminalNumber, filters),
        queryFn: () => fetchReports(terminalNumber, filters),
        enabled: open,
        // Applying a new date range/search builds a brand-new query key with no
        // cached data yet, so without this the full skeleton would re-flash on
        // every "Apply Filter" click instead of just updating the numbers in
        // place — keeps showing the previous result while the new one loads.
        placeholderData: keepPreviousData,
        // Overrides the app-wide 30s staleTime (main.jsx) — that default is
        // fine for products/customers, which barely change, but Reports
        // reflects live transaction state. With the default, closing the
        // modal right after completing a payment and reopening it within
        // 30s would silently reuse the pre-payment cached result and keep
        // showing that invoice as "Pending" until 30s passed — confirmed
        // live (the invoices API fired zero times on such a reopen before
        // this fix). staleTime: 0 makes every open refetch immediately.
        staleTime: 0,
    });

    // Keyed by the same filters as the main query (unlike the legacy
    // same-origin path inside getPaymentSummary, the client-side fallback it
    // falls back to genuinely respects the selected date range — see
    // reportsApi.js) and depends on `data` being loaded first, since that
    // fallback aggregates from the invoices the main query already fetched.
    // Resolves to null on the same-origin path's own failure, when there's
    // nothing to summarize, or past the invoice-count cap for a wide range;
    // rendered as a pure enhancement below either way.
    const { data: paymentSummary } = useQuery({
        queryKey: [...reportsQueryKey(terminalNumber, filters), "payment-summary"],
        queryFn: () => getPaymentSummary(data?.entries),
        enabled: open && !!data,
        staleTime: 0, // same reasoning as the query above — this is live payment data too.
    });

    const entries = data?.entries ?? [];
    const totals = data?.totals ?? null;

    // Mirrors legacy: picking a date range just sets the field value; the
    // separate "Apply Filter" button below actually triggers the data fetch.
    const handleApplyDateRange = (start, end) => {
        setStartDate(start);
        setEndDate(end);
    };

    const handleApplyFilter = () => {
        setFilters({ start: startDate, end: endDate, search });
        setPage(1);
    };

    const handleSort = (field) => {
        if (field === sortField) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDir("asc");
        }
        setPage(1);
    };

    const filteredEntries = entries
        .filter((e) => {
            if (!tableSearch) return true;
            const term = tableSearch.toLowerCase();
            return [e.ref, e.customer, e.status].some((field) =>
                field?.toLowerCase().includes(term)
            );
        })
        .sort((a, b) => compareEntries(a, b, sortField, sortDir));

    const totalPages = pageSize === "All" ? 1 : Math.max(1, Math.ceil(filteredEntries.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const rangeStart = filteredEntries.length === 0 ? 0 : pageSize === "All" ? 1 : (safePage - 1) * pageSize + 1;
    const rangeEnd = pageSize === "All" ? filteredEntries.length : Math.min(safePage * pageSize, filteredEntries.length);
    const visibleEntries =
        pageSize === "All" ? filteredEntries : filteredEntries.slice((safePage - 1) * pageSize, safePage * pageSize);

    // The footer Total row should reflect what's actually visible/filtered in the
    // table, not the unfiltered date-range totals — otherwise a table search that
    // matches 0 rows still showed the old full-range totals, looking broken.
    const displayTotals = filteredEntries.reduce(
        (acc, e) => ({
            total_ht: acc.total_ht + e.total_ht,
            total_tva: acc.total_tva + e.total_tva,
            total_ttc: acc.total_ttc + e.total_ttc,
            pending: acc.pending + e.pending,
            change: acc.change + e.change,
            received: acc.received + e.received,
        }),
        { total_ht: 0, total_tva: 0, total_ttc: 0, pending: 0, change: 0, received: 0 }
    );

    // Re-clamp the current page whenever the page size or filtered result count changes
    // (e.g. switching from 10 to 100 per page, or narrowing the table search).
    useEffect(() => {
        setPage((p) => Math.min(p, totalPages));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageSize, tableSearch, filteredEntries.length]);

    // Prevent the product grid behind the overlay from scrolling while this modal is open.
    // The DashboardLayout content pane has its own explicit overflow-y-auto
    // (independent of document.body), so a wheel/touch gesture over the backdrop
    // still scrolls the grid underneath even though it's visually covered.
    // React's onWheel/onTouchMove props attach passive listeners, so calling
    // preventDefault() there is silently ignored — needs a manually-attached
    // non-passive listener to actually block it. The entries table is excluded
    // so it keeps scrolling normally.
    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const blockBackgroundScroll = (e) => {
            if (!e.target.closest(".reports-entries-scroll")) {
                e.preventDefault();
            }
        };
        const node = overlayRef.current;
        node?.addEventListener("wheel", blockBackgroundScroll, { passive: false });
        node?.addEventListener("touchmove", blockBackgroundScroll, { passive: false });

        return () => {
            document.body.style.overflow = previousOverflow;
            node?.removeEventListener("wheel", blockBackgroundScroll);
            node?.removeEventListener("touchmove", blockBackgroundScroll);
        };
    }, [open]);

    if (!open) return null;

    const showSkeleton = isLoading && !data;

    const handleExportExcel = async () => {
        setExportingExcel(true);
        setPrintError("");
        try {
            await exportReportExcel({
                entries: filteredEntries,
                totals,
                startIso: toIso(filters.start),
                endIso: toIso(filters.end),
                terminal: terminalNumber,
                searchTerm: tableSearch || search,
            });
        } catch (err) {
            setPrintError(err.message || "Failed to export Excel report");
        } finally {
            setExportingExcel(false);
        }
    };

    const handleExportPDF = () => {
        exportReportPDF({
            entries: filteredEntries,
            totals,
            startIso: toIso(filters.start),
            endIso: toIso(filters.end),
            terminal: terminalNumber,
            searchTerm: tableSearch || search,
        });
    };

    // Mirrors legacy's own receipt.php: reprinting from Reports shows a full
    // preview first (Toggle Thermal Preview / Switch to 58mm / Print Receipt
    // buttons there) rather than firing straight to window.print() with no
    // chance to review — previewReceipt below renders that step.
    const handlePrintInvoice = async (entry) => {
        setPrintingId(entry.id);
        setPrintError("");
        try {
            const receipt = await fetchReceipt(entry.id);
            setPreviewReceipt(receipt);
        } catch (err) {
            setPrintError(err.message || "Failed to load receipt");
        } finally {
            setPrintingId(null);
        }
    };

    // Legacy: clicking a Reports row loads that invoice's lines back into the
    // cart as locked items and switches the pay button to settle this invoice
    // (via existing_invoice_id) instead of starting a new sale. Draft invoices
    // never reach this table (the backend query excludes them); Abandoned
    // invoices are excluded here client-side to mirror legacy's server-side gate.
    // Invoices with nothing left to pay (entry.pending <= 0 — already fully
    // settled, possibly even overpaid) are excluded too: legacy itself has no
    // such guard and will happily record another payment (capped at the full
    // invoice total, not the — already zero/negative — remaining balance),
    // producing a spurious extra payment and a nonsense "change" amount.
    const isSettleable = (entry) => entry.status !== "Abandoned" && entry.pending > 0;

    // Flags a specific backend data-integrity bug (not a legacy behavior to
    // mirror — this is a real corruption, confirmed live 2026-07-17): an
    // intermittent "Unknown column 'cost_price'" SQL error during payment
    // validation can leave an invoice's own total_ht/total_tva/total_ttc
    // columns at 0 even though its line items are real and non-empty —
    // confirmed by cross-checking the same invoice via api/invoices/index.php
    // (which recomputes totals from line items), which showed real values
    // (e.g. total_ttc: 116) for an invoice reports_data.php reported as all
    // zeros. A genuine "Validated (Unpaid)"/"Paid"/"Classified Paid"/
    // "Abandoned" invoice always has real totals — only a Draft can
    // legitimately still be 0 (an empty cart never had a chance to total
    // anything). No frontend fix can repair the underlying row — this is
    // surfaced as a visible warning rather than the equally-wrong default
    // (rendering it as if the zero total were trustworthy, e.g. showing
    // "ZMW 0.00" as an ordinary paid-in-full amount).
    const isDataIncomplete = (entry) => entry.status !== "Draft" && entry.total_ht === 0 && entry.total_tva === 0 && entry.total_ttc === 0;

    // Deliberate departure from legacy here (confirmed live 2026-07-17 —
    // legacy's own reports_data.php/pos-reports.js show the exact same thing):
    // `payment_type` comes from the invoice's fk_mode_reglement field, which
    // is a separate concept from whether a payment was actually ever
    // recorded (paiement/paiement_facture) — Dolibarr can populate it from
    // the customer's own default payment terms at validation time, even for
    // an invoice with zero actual payments. A true Draft already correctly
    // shows "Not Specified" (fk_mode_reglement is genuinely unset until
    // validation), but a "Validated (Unpaid)" invoice showed "Cash" despite
    // `received` being 0 — confusing on a real-world receipt/report, since
    // it reads as "this was a cash sale" when no money has changed hands
    // yet. Overridden here purely for display: any entry with nothing
    // actually received shows "Not Specified" regardless of what
    // fk_mode_reglement says, until a real payment exists to attribute a
    // method to.
    const displayPaymentType = (entry) => (entry.received === 0 ? "Not Specified" : entry.paymentType);

    const handleLoadInvoiceToCart = async (entry) => {
        if (loadingInvoiceId) return;
        if (!isSettleable(entry)) {
            showToast(
                entry.status === "Abandoned"
                    ? "This invoice has been abandoned and can't be loaded into the cart."
                    : "This invoice has no remaining balance — nothing to settle.",
                "warning"
            );
            return;
        }
        setLoadingInvoiceId(entry.id);
        setLoadError("");
        try {
            const receipt = await fetchReceipt(entry.id);
            const items = receipt.lines.map((line) => ({
                id: line.product_id,
                name: line.product_label || line.description || "Item",
                ref: line.product_ref || "",
                price: line.qty > 0 ? line.total_ttc / line.qty : line.price_unit,
                qty: line.qty,
            }));
            loadInvoiceIntoCart({ id: entry.id, ref: entry.ref, remainToPay: entry.pending, items });
            showToast(`Invoice ${entry.ref} loaded into cart — ZMW ${entry.pending.toFixed(2)} due`);
            onClose();
        } catch (err) {
            setLoadError(err.message || "Failed to load invoice into cart");
        } finally {
            setLoadingInvoiceId(null);
        }
    };

    return (
        <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2">
            <div className="w-[89vw] h-[88vh] flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl">
                <div className="shrink-0 flex items-center justify-between px-5 py-1.5 bg-[#2c6291] rounded-t-xl text-white">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                            <BarChart3 size={16} />
                        </div>
                        <div>
                            <div className="font-semibold leading-tight text-sm">POS Reports</div>
                            <div className="text-[11px] text-white/80 leading-tight">Sales & Payment Analytics</div>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/20">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 min-h-0 flex flex-col px-3 py-3 gap-3">
                    {/* Filter bar */}
                    <div className="shrink-0 flex flex-wrap items-end gap-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg p-2.5">
                        <div>
                            <label className="block text-xs font-medium mb-1">Date Range</label>
                            <DateRangePicker startDate={startDate} endDate={endDate} onApply={handleApplyDateRange} />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-medium mb-1">Search</label>
                            <div className="flex items-center gap-2 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 transition-colors focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                                <Search size={14} className="text-gray-500 dark:text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Invoice, customer, reference..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full text-sm outline-none bg-transparent placeholder-gray-400 dark:placeholder-slate-500"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleApplyFilter}
                            disabled={isFetching}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white bg-[#397db9] hover:bg-[#2c6291] disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Filter size={14} />}
                            {isFetching ? "Applying..." : "Apply Filter"}
                        </button>
                    </div>

                    {/* staleTime: 0 means every open triggers a background refetch — if
                        that refetch fails, React Query keeps showing the last successful
                        `data` (by design) while also setting `queryError`. Showing a hard
                        "can't reach the server" banner above a table that's actually
                        populated with real data is misleading, so the two states get
                        different treatment: a small non-alarming note when we still have
                        something to show, the full error only when there's nothing at all. */}
                    {queryError && (
                        data ? (
                            <p className="shrink-0 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-1.5">
                                Showing last loaded data — refreshing failed ({queryError.message})
                            </p>
                        ) : (
                            <p className="shrink-0 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{queryError.message}</p>
                        )
                    )}

                    {printError && (
                        <p className="shrink-0 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{printError}</p>
                    )}

                    {loadError && (
                        <p className="shrink-0 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{loadError}</p>
                    )}

                    {showSkeleton ? (
                        <ReportsSkeleton />
                    ) : (
                        <div className={`flex-1 min-h-0 flex flex-col gap-3 transition-opacity ${isFetching ? "opacity-50" : ""}`}>
                            {/* Payment method breakdown — mirrors legacy's payment-summary-cards.
                                Only populated same-origin (see getPaymentSummary); silently absent
                                otherwise, same as legacy's own "always current month" quirk. */}
                            {paymentSummary && paymentSummary.payments.length > 0 && (
                                <div className="shrink-0 grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
                                    {paymentSummary.payments.map((p) => {
                                        const Icon = getPaymentIcon(p.code, p.label);
                                        const pct = paymentSummary.total > 0 ? ((p.amount / paymentSummary.total) * 100).toFixed(1) : "0.0";
                                        return (
                                            <div
                                                key={p.code || p.label}
                                                className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm px-3 py-2"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-8 h-8 shrink-0 rounded-lg bg-[#397db9] text-white flex items-center justify-center">
                                                        <Icon size={15} />
                                                    </div>
                                                    <span className="text-xs font-semibold truncate">{p.label}</span>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0">
                                                    <span className="text-sm font-bold whitespace-nowrap">ZMW {p.amount.toFixed(2)}</span>
                                                    <span className="text-[10px] text-gray-500 dark:text-slate-400 whitespace-nowrap">{p.count} · {pct}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Totals summary row. */}
                            {totals && (
                                <div className="shrink-0 flex flex-wrap gap-3">
                                    <div className="flex-1 min-w-[150px] flex flex-col justify-center leading-tight rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm px-4 py-1">
                                        <span className="text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">Total Invoices</span>
                                        <span className="text-xl font-bold text-blue-600 whitespace-nowrap">{entries.length}</span>
                                    </div>
                                    <div className="flex-1 min-w-[150px] flex flex-col justify-center leading-tight rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm px-4 py-1">
                                        <span className="text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">Total Amount</span>
                                        <span className="text-xl font-bold text-emerald-600 whitespace-nowrap">ZMW {totals.total_ttc.toFixed(2)}</span>
                                    </div>
                                    <div className="flex-1 min-w-[150px] flex flex-col justify-center leading-tight rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm px-4 py-1">
                                        <span className="text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">Received</span>
                                        <span className="text-xl font-bold text-sky-600 whitespace-nowrap">ZMW {totals.received.toFixed(2)}</span>
                                    </div>
                                    <div className="flex-1 min-w-[150px] flex flex-col justify-center leading-tight rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm px-4 py-1">
                                        <span className="text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">Pending</span>
                                        <span className="text-xl font-bold text-amber-500 whitespace-nowrap">ZMW {totals.pending.toFixed(2)}</span>
                                    </div>
                                    <div className="shrink-0 w-[340px] flex flex-col rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30 overflow-hidden">
                                        <div className="flex items-center gap-2.5 px-4 py-1">
                                            <div className="w-8 h-8 shrink-0 rounded-xl bg-white/20 flex items-center justify-center">
                                                <BarChart3 size={15} />
                                            </div>
                                            <span className="flex-1 min-w-0 text-base font-semibold whitespace-nowrap truncate">Total</span>
                                            <div className="w-px h-5 shrink-0 bg-white/20" />
                                            <span className="shrink-0 text-xs font-bold rounded-full bg-white/20 px-2.5 py-1 whitespace-nowrap">
                                                {entries.length}×
                                            </span>
                                        </div>
                                        <div className="h-px bg-white/20" />
                                        <div className="flex items-center gap-2.5 px-4 py-1">
                                            <span className="flex-1 min-w-0 text-xl font-extrabold whitespace-nowrap truncate">
                                                ZMW {totals.total_ttc.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                            <div className="w-px h-5 shrink-0 bg-white/20" />
                                            <span className="shrink-0 text-sm font-bold rounded-full bg-white/20 px-3 py-1 whitespace-nowrap">100%</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Entries table — this is the only part of the modal that scrolls;
                                everything above (filters, summary, totals) stays fixed in place. */}
                            <div className="flex-1 min-h-0 flex flex-col">
                                <div className="shrink-0 flex items-center justify-between gap-3 mb-1.5 text-sm">
                                    <div className="flex items-center gap-1.5">
                                        Show
                                        <select
                                            value={pageSize}
                                            onChange={(e) => setPageSize(e.target.value === "All" ? "All" : parseInt(e.target.value, 10))}
                                            className="rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-2 py-1 cursor-pointer outline-none focus:border-blue-500"
                                        >
                                            {[5, 10, 25, 50, 100, "All"].map((n) => (
                                                <option key={n} value={n}>
                                                    {n}
                                                </option>
                                            ))}
                                        </select>
                                        entries
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={tableSearch}
                                        onChange={(e) => setTableSearch(e.target.value)}
                                        className="rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1"
                                    />
                                </div>

                                <div className="reports-entries-scroll flex-1 min-h-0 overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700 overflow-y-auto soft-scrollbar">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 uppercase">
                                            <tr>
                                                <SortableHeader label="Date" field="date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                                <SortableHeader label="Invoice No" field="ref" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                                <SortableHeader label="Third Party" field="customer" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                                <SortableHeader label="Payment Type" field="paymentType" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                                <SortableHeader label="Amount (Excl. Tax)" field="total_ht" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                                                <SortableHeader label="VAT" field="total_tva" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                                                <SortableHeader label="Amount (Inc. Tax)" field="total_ttc" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                                                <SortableHeader label="Pending" field="pending" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                                                <SortableHeader label="Change" field="change" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                                                <SortableHeader label="Received" field="received" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                                                <SortableHeader label="Author" field="author" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                                <SortableHeader label="Currency" field="currency" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                                <SortableHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                                <th className="text-center px-2.5 py-1 text-xs whitespace-nowrap bg-gray-50 dark:bg-slate-800">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibleEntries.length === 0 ? (
                                                <tr>
                                                    <td colSpan={14} className="text-center py-6 text-gray-400 dark:text-slate-500">
                                                        No entries found
                                                    </td>
                                                </tr>
                                            ) : (
                                                visibleEntries.map((entry) => (
                                                    <tr
                                                        key={entry.id}
                                                        onClick={() => handleLoadInvoiceToCart(entry)}
                                                        title={isSettleable(entry) ? "Click to load this invoice into the cart" : undefined}
                                                        className={`border-t border-gray-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800/60 ${
                                                            isSettleable(entry) ? "cursor-pointer" : ""
                                                        } ${loadingInvoiceId === entry.id ? "opacity-50 pointer-events-none" : ""} ${
                                                            isDataIncomplete(entry) ? "bg-red-50 dark:bg-red-500/10" : ""
                                                        }`}
                                                    >
                                                        <td className="px-2.5 py-1 whitespace-nowrap">{entry.date}</td>
                                                        <td
                                                            className={`px-2.5 py-1 font-semibold whitespace-nowrap ${
                                                                entry.pending > 0 ? "text-blue-600 dark:text-blue-400" : ""
                                                            }`}
                                                        >
                                                            {entry.pending > 0 && <CreditCard size={11} className="inline mr-1 -mt-0.5" />}
                                                            {entry.ref}
                                                        </td>
                                                        <td className="px-2.5 py-1 max-w-[90px] truncate">{entry.customer}</td>
                                                        <td className="px-2.5 py-1 whitespace-nowrap">{displayPaymentType(entry)}</td>
                                                        <td className="px-2.5 py-1 text-right">{entry.total_ht.toFixed(2)}</td>
                                                        <td className="px-2.5 py-1 text-right">{entry.total_tva.toFixed(2)}</td>
                                                        <td className="px-2.5 py-1 text-right font-semibold">{entry.total_ttc.toFixed(2)}</td>
                                                        <td className={`px-2.5 py-1 text-right ${entry.pending > 0 ? "text-amber-500 font-semibold" : ""}`}>
                                                            {entry.pending.toFixed(2)}
                                                        </td>
                                                        <td className={`px-2.5 py-1 text-right ${entry.change > 0 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}`}>
                                                            {entry.change.toFixed(2)}
                                                        </td>
                                                        <td className="px-2.5 py-1 text-right">{entry.received.toFixed(2)}</td>
                                                        <td className="px-2.5 py-1 max-w-[80px] truncate">{entry.author}</td>
                                                        <td className="px-2.5 py-1 whitespace-nowrap">{entry.currency}</td>
                                                        <td className="px-2.5 py-1 whitespace-nowrap">
                                                            {isDataIncomplete(entry) && (
                                                                <span title="This invoice's totals are missing even though it's validated — a known backend bug (intermittent 'cost_price' SQL error during payment) left this record incomplete. The line items are real; the invoice's own total fields never saved. Not fixable from this app.">
                                                                    <AlertTriangle
                                                                        size={12}
                                                                        className="inline mr-1 -mt-0.5 text-red-500"
                                                                    />
                                                                </span>
                                                            )}
                                                            {entry.status}
                                                        </td>
                                                        <td className="px-2.5 py-1 text-center">
                                                            <button
                                                                type="button"
                                                                title="Print Invoice"
                                                                disabled={printingId === entry.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handlePrintInvoice(entry);
                                                                }}
                                                                className="p-1 rounded-md border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:border-blue-500 dark:hover:text-blue-400 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-wait"
                                                            >
                                                                {printingId === entry.id ? (
                                                                    <Loader2 size={12} className="animate-spin" />
                                                                ) : (
                                                                    <Printer size={12} />
                                                                )}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {totals && filteredEntries.length > 0 && (
                                            <tfoot className="sticky bottom-0 z-10 bg-gray-50 dark:bg-slate-800 font-semibold shadow-[0_-1px_0_0_rgba(0,0,0,0.1)]">
                                                <tr>
                                                    <td colSpan={4} className="text-right px-2.5 py-1">
                                                        Total
                                                    </td>
                                                    <td className="text-right px-2.5 py-1">{displayTotals.total_ht.toFixed(2)}</td>
                                                    <td className="text-right px-2.5 py-1">{displayTotals.total_tva.toFixed(2)}</td>
                                                    <td className="text-right px-2.5 py-1">{displayTotals.total_ttc.toFixed(2)}</td>
                                                    <td className="text-right px-2.5 py-1">{displayTotals.pending.toFixed(2)}</td>
                                                    <td
                                                        className={`text-right px-2.5 py-1 ${
                                                            displayTotals.change > 0 ? "text-emerald-600 dark:text-emerald-400" : ""
                                                        }`}
                                                    >
                                                        {displayTotals.change.toFixed(2)}
                                                    </td>
                                                    <td className="text-right px-2.5 py-1">{displayTotals.received.toFixed(2)}</td>
                                                    <td colSpan={4}></td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>

                                {/* Pagination footer, mirrors legacy's "Showing X to Y of Z entries" + page controls */}
                                <div className="shrink-0 flex items-center justify-between gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400">
                                    <span>
                                        Showing {rangeStart} to {rangeEnd} of {filteredEntries.length} entries
                                    </span>
                                    {pageSize !== "All" && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                disabled={safePage <= 1}
                                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                                className={`w-6 h-6 flex items-center justify-center rounded border font-semibold transition-colors ${
                                                    safePage <= 1
                                                        ? "border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600 cursor-not-allowed"
                                                        : "border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer"
                                                }`}
                                            >
                                                <ChevronLeft size={12} />
                                            </button>
                                            <span className="w-7 h-6 flex items-center justify-center rounded bg-[#2c6291] text-white font-semibold">
                                                {safePage}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={safePage >= totalPages}
                                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                                className={`w-6 h-6 flex items-center justify-center rounded border font-semibold transition-colors ${
                                                    safePage >= totalPages
                                                        ? "border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600 cursor-not-allowed"
                                                        : "border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer"
                                                }`}
                                            >
                                                <ChevronRight size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer: Close + Export, mirrors legacy's Export Excel / Export PDF buttons */}
                <div className="shrink-0 flex items-center justify-end gap-2.5 px-5 py-1.5 border-t border-gray-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:border-gray-400 dark:hover:border-slate-500 cursor-pointer transition-colors"
                    >
                        <X size={14} />
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        disabled={showSkeleton || exportingExcel}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/30 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
                    >
                        {exportingExcel ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                        Export Excel
                    </button>
                    <button
                        type="button"
                        onClick={handleExportPDF}
                        disabled={showSkeleton}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-b from-red-500 to-red-600 shadow-md shadow-red-500/30 hover:from-red-600 hover:to-red-700 hover:shadow-lg hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
                    >
                        <FileDown size={14} />
                        Export PDF
                    </button>
                </div>
            </div>

            {previewReceipt && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-slate-700">
                            <div className="font-semibold text-sm">Invoice {previewReceipt.invoice_ref}</div>
                            <button
                                type="button"
                                onClick={() => {
                                    setPreviewReceipt(null);
                                    setThermalPreview(false);
                                }}
                                className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4">
                            {/* Mirrors legacy's .thermal-preview: a dark backdrop with
                                perforated top/bottom edges simulating a thermal paper
                                roll, sized to the selected width — purely a visual
                                on-screen simulation, doesn't affect the actual print
                                output's own sizing (that's driven by thermalWidth
                                directly, same as legacy's own preview-vs-print split). */}
                            {thermalPreview ? (
                                <div className="rounded-lg bg-[#333] p-4 flex justify-center">
                                    <div className="bg-white rounded-sm overflow-hidden" style={{ width: `${thermalWidth}mm` }}>
                                        <div
                                            className="h-2.5"
                                            style={{
                                                backgroundImage:
                                                    "repeating-linear-gradient(90deg, #fff, #fff 2px, transparent 2px, transparent 4px)",
                                                backgroundColor: "#333",
                                            }}
                                        />
                                        <iframe title="Receipt preview" srcDoc={buildReceiptHtml(previewReceipt, { thermalWidth })} className="w-full h-96 block" />
                                        <div
                                            className="h-2.5"
                                            style={{
                                                backgroundImage:
                                                    "repeating-linear-gradient(90deg, #fff, #fff 2px, transparent 2px, transparent 4px)",
                                                backgroundColor: "#333",
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden bg-white">
                                    <iframe title="Receipt preview" srcDoc={buildReceiptHtml(previewReceipt)} className="w-full h-96" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-center gap-2.5 px-5 py-3 border-t border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setThermalPreview((v) => !v)}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
                                >
                                    <Eye size={14} />
                                    Toggle Thermal Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setThermalWidth((w) => (w === 80 ? 58 : 80))}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600"
                                >
                                    <Ruler size={14} />
                                    Switch to {thermalWidth === 80 ? 58 : 80}mm
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPreviewReceipt(null);
                                        setThermalPreview(false);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                                >
                                    <X size={14} />
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={() => printReceipt(previewReceipt, { thermalWidth })}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#397db9] hover:bg-[#2c6291]"
                                >
                                    <Printer size={14} />
                                    Print Receipt
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Mirrors legacy's DataTables sortable column headers (every column sortable,
// default Date desc) — click to sort ascending, click again to reverse.
function SortableHeader({ label, field, sortField, sortDir, onSort, align = "left" }) {
    const isActive = sortField === field;
    return (
        <th
            onClick={() => onSort(field)}
            className={`px-2.5 py-1.5 text-xs whitespace-nowrap cursor-pointer select-none bg-gray-50 dark:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-200 ${
                align === "right" ? "text-right" : "text-left"
            }`}
        >
            <span className={`inline-flex items-center gap-0.5 ${align === "right" ? "flex-row-reverse" : ""}`}>
                {label}
                {isActive ? (
                    sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                ) : (
                    <ChevronsUpDown size={11} className="opacity-30" />
                )}
            </span>
        </th>
    );
}

function Bar({ className = "" }) {
    return <div className={`animate-pulse rounded bg-gray-200 dark:bg-slate-700 ${className}`} />;
}

function ReportsSkeleton() {
    return (
        <>
            <div>
                <Bar className="h-4 w-36 mb-2" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 px-3 py-2.5">
                            <Bar className="w-8 h-8 shrink-0 rounded-lg" />
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <Bar className="h-3 w-16" />
                                <Bar className="h-4 w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                        <Bar className="h-3 w-20" />
                        <Bar className="h-5 w-24" />
                    </div>
                ))}
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-gray-50 dark:bg-slate-800 px-3 py-2.5 flex gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Bar key={i} className="h-3 flex-1" />
                    ))}
                </div>
                {Array.from({ length: 6 }).map((_, row) => (
                    <div key={row} className="px-3 py-2.5 flex gap-3 border-t border-gray-100 dark:border-slate-800">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Bar key={i} className="h-3 flex-1" />
                        ))}
                    </div>
                ))}
            </div>
        </>
    );
}

export default ReportsModal;
