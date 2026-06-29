import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    BarChart3,
    X,
    Filter,
    Search,
    Banknote,
    CreditCard,
    Landmark,
    Smartphone,
    FileText,
    HelpCircle,
    Printer,
    ChevronLeft,
    ChevronRight,
    FileSpreadsheet,
    FileDown,
    Loader2,
} from "lucide-react";
import useAuthStore from "../../authentication/stores/authStore";
import { getPaymentSummary, getReportsData } from "../services/reportsApi";
import { fetchReceipt } from "../services/receiptApi";
import { printReceipt } from "./InvoiceReceipt";
import { exportReportExcel, exportReportPDF } from "./ReportExport";
import DateRangePicker from "./DateRangePicker";

const ICONS = { cash: Banknote, credit: CreditCard, bank: Landmark, mobile: Smartphone, cheque: FileText, other: HelpCircle };
// Distinct accent color per payment method so cards are scannable at a glance,
// instead of every icon/badge being the same generic blue.
const ACCENTS = {
    cash: "bg-emerald-600",
    credit: "bg-indigo-600",
    bank: "bg-sky-600",
    mobile: "bg-violet-600",
    cheque: "bg-amber-600",
    other: "bg-slate-600",
};

const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const reportsQueryKey = (terminal, filters) => [
    "reports",
    terminal,
    toIso(filters.start),
    toIso(filters.end),
    filters.search,
];

const fetchReports = async (terminal, filters) => {
    const [summaryRes, reportsRes] = await Promise.all([
        getPaymentSummary({ terminal }),
        getReportsData({ terminal, startDate: toIso(filters.start), endDate: toIso(filters.end), search: filters.search }),
    ]);
    if (!summaryRes.success) throw new Error(summaryRes.error || "Failed to load payment summary");
    if (!reportsRes.success) throw new Error(reportsRes.error || "Failed to load reports data");

    return {
        payments: summaryRes.payments,
        total: summaryRes.total,
        entries: reportsRes.entries,
        totals: reportsRes.totals,
    };
};

function ReportsModal({ open, onClose }) {
    const terminalNumber = useAuthStore((state) => state.terminalConfig?.terminalNumber) || 1;

    // Draft inputs for the filter bar; only become the active query when "Apply Filter" is clicked.
    const [startDate, setStartDate] = useState(today());
    const [endDate, setEndDate] = useState(today());
    const [search, setSearch] = useState("");
    const [tableSearch, setTableSearch] = useState("");
    const [pageSize, setPageSize] = useState(25); // number of rows, or "All"
    const [page, setPage] = useState(1);
    const [printingId, setPrintingId] = useState(null);
    const [exportingExcel, setExportingExcel] = useState(false);
    const [printError, setPrintError] = useState("");

    // Submitted filters drive the query key, so reopening with the same filters serves cached data instantly.
    const [filters, setFilters] = useState({ start: today(), end: today(), search: "" });

    const { data, isLoading, error: queryError } = useQuery({
        queryKey: reportsQueryKey(terminalNumber, filters),
        queryFn: () => fetchReports(terminalNumber, filters),
        enabled: open,
    });

    const payments = data?.payments ?? [];
    const total = data?.total ?? 0;
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

    const filteredEntries = entries.filter((e) => {
        if (!tableSearch) return true;
        const term = tableSearch.toLowerCase();
        return [e.ref, e.customer, e.payment_type, e.author, e.status].some((field) =>
            field?.toLowerCase().includes(term)
        );
    });

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

    if (!open) return null;

    const showSkeleton = isLoading && !data;

    const handleExportExcel = async () => {
        setExportingExcel(true);
        setPrintError("");
        try {
            await exportReportExcel({
                entries: filteredEntries,
                payments,
                total,
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
            payments,
            total,
            totals,
            startIso: toIso(filters.start),
            endIso: toIso(filters.end),
            terminal: terminalNumber,
            searchTerm: tableSearch || search,
        });
    };

    const handlePrintInvoice = async (entry) => {
        setPrintingId(entry.id);
        setPrintError("");
        try {
            const receipt = await fetchReceipt(entry.id);
            printReceipt(receipt);
        } catch (err) {
            setPrintError(err.message || "Failed to load receipt");
        } finally {
            setPrintingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-[95vw] xl:max-w-7xl max-h-[95vh] flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl">
                <div className="shrink-0 flex items-center justify-between px-5 py-2.5 bg-[#2c6291] rounded-t-xl text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                            <BarChart3 size={18} />
                        </div>
                        <div>
                            <div className="font-semibold leading-tight">POS Reports</div>
                            <div className="text-xs text-white/80 leading-tight">Sales & Payment Analytics</div>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/20">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 min-h-0 flex flex-col px-5 py-3 gap-3">
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
                            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
                        >
                            <Filter size={14} />
                            Apply Filter
                        </button>
                    </div>

                    {queryError && (
                        <p className="shrink-0 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{queryError.message}</p>
                    )}

                    {printError && (
                        <p className="shrink-0 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{printError}</p>
                    )}

                    {showSkeleton ? (
                        <ReportsSkeleton />
                    ) : (
                        <>
                            {/* Payment summary cards */}
                            <div className="shrink-0">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-1.5">
                                    <BarChart3 size={15} className="text-blue-500" />
                                    Payment Summary
                                </h3>
                                <div className="flex flex-wrap gap-2.5">
                                    {payments.map((p) => {
                                        const Icon = ICONS[p.icon] || HelpCircle;
                                        const accent = ACCENTS[p.icon] || "bg-slate-600";
                                        const pct = total > 0 ? ((p.amount / total) * 100).toFixed(1) : "0.0";
                                        return (
                                            <div
                                                key={p.code || p.label}
                                                className="flex-1 min-w-[300px] flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 px-3 py-2.5 transition-shadow hover:shadow-md"
                                            >
                                                {/* Left: icon + label (mirrors legacy .payment-item-info) — shrink-0 so the
                                                    label is never sacrificed to make room for the amount/badges. */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className={`w-9 h-9 shrink-0 rounded-lg ${accent} text-white flex items-center justify-center`}>
                                                        <Icon size={16} />
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-800 dark:text-slate-100 whitespace-nowrap">{p.label}</span>
                                                </div>

                                                {/* Right: amount + count + percent, single row (mirrors legacy .payment-item-details) */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                                        ZMW {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-[11px] font-semibold rounded bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-100 px-1.5 py-0.5 border border-gray-300 dark:border-slate-500">
                                                        {p.count}×
                                                    </span>
                                                    <span className={`text-[11px] font-semibold rounded text-white px-1.5 py-0.5 ${accent}`}>{pct}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="flex-1 min-w-[300px] flex items-center justify-between gap-3 rounded-lg bg-blue-600 text-white px-3 py-2.5">
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="w-9 h-9 shrink-0 rounded-lg bg-white/20 flex items-center justify-center">
                                                <BarChart3 size={16} />
                                            </div>
                                            <span className="text-sm font-semibold whitespace-nowrap">Total</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-sm font-bold whitespace-nowrap">ZMW {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            <span className="text-[11px] font-semibold rounded bg-white text-blue-700 px-1.5 py-0.5">
                                                {payments.reduce((sum, p) => sum + p.count, 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Totals strip */}
                            {totals && (
                                <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                    <div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">Total Invoices</div>
                                        <div className="text-lg font-bold text-blue-600">{entries.length}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">Total Amount</div>
                                        <div className="text-lg font-bold text-emerald-600">ZMW {totals.total_ttc.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">Received</div>
                                        <div className="text-lg font-bold text-sky-600">ZMW {totals.received.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">Pending</div>
                                        <div className="text-lg font-bold text-amber-500">ZMW {totals.pending.toFixed(2)}</div>
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

                                <div className="flex-1 min-h-[320px] overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700 overflow-y-auto soft-scrollbar">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 uppercase">
                                            <tr>
                                                <th className="text-left px-3 py-2">Date</th>
                                                <th className="text-left px-3 py-2">Invoice No</th>
                                                <th className="text-left px-3 py-2">Third Party</th>
                                                <th className="text-left px-3 py-2">Payment Type</th>
                                                <th className="text-right px-3 py-2">Amt (Excl)</th>
                                                <th className="text-right px-3 py-2">VAT</th>
                                                <th className="text-right px-3 py-2">Amt (Incl)</th>
                                                <th className="text-right px-3 py-2">Pending</th>
                                                <th className="text-right px-3 py-2">Change</th>
                                                <th className="text-right px-3 py-2">Received</th>
                                                <th className="text-left px-3 py-2">Author</th>
                                                <th className="text-left px-3 py-2">Status</th>
                                                <th className="text-center px-3 py-2">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibleEntries.length === 0 ? (
                                                <tr>
                                                    <td colSpan={13} className="text-center py-6 text-gray-400 dark:text-slate-500">
                                                        No entries found
                                                    </td>
                                                </tr>
                                            ) : (
                                                visibleEntries.map((entry) => (
                                                    <tr
                                                        key={entry.id}
                                                        className="border-t border-gray-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800/60"
                                                    >
                                                        <td className="px-3 py-2">{entry.date}</td>
                                                        <td className="px-3 py-2 font-semibold">{entry.ref}</td>
                                                        <td className="px-3 py-2">{entry.customer}</td>
                                                        <td className="px-3 py-2">{entry.payment_type}</td>
                                                        <td className="px-3 py-2 text-right">{entry.total_ht.toFixed(2)}</td>
                                                        <td className="px-3 py-2 text-right">{entry.total_tva.toFixed(2)}</td>
                                                        <td className="px-3 py-2 text-right font-semibold">{entry.total_ttc.toFixed(2)}</td>
                                                        <td className={`px-3 py-2 text-right ${entry.pending > 0 ? "text-amber-500 font-semibold" : ""}`}>
                                                            {entry.pending.toFixed(2)}
                                                        </td>
                                                        <td className={`px-3 py-2 text-right ${entry.change > 0 ? "text-emerald-600 font-semibold" : ""}`}>
                                                            {entry.change.toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">{entry.received.toFixed(2)}</td>
                                                        <td className="px-3 py-2">{entry.author}</td>
                                                        <td className="px-3 py-2">{entry.status}</td>
                                                        <td className="px-3 py-2 text-center">
                                                            <button
                                                                type="button"
                                                                title="Print Invoice"
                                                                disabled={printingId === entry.id}
                                                                onClick={() => handlePrintInvoice(entry)}
                                                                className="p-1.5 rounded-md border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:border-blue-500 dark:hover:text-blue-400 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-wait"
                                                            >
                                                                {printingId === entry.id ? (
                                                                    <Loader2 size={13} className="animate-spin" />
                                                                ) : (
                                                                    <Printer size={13} />
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
                                                    <td colSpan={4} className="text-right px-3 py-2">
                                                        Total
                                                    </td>
                                                    <td className="text-right px-3 py-2">{displayTotals.total_ht.toFixed(2)}</td>
                                                    <td className="text-right px-3 py-2">{displayTotals.total_tva.toFixed(2)}</td>
                                                    <td className="text-right px-3 py-2">{displayTotals.total_ttc.toFixed(2)}</td>
                                                    <td className="text-right px-3 py-2">{displayTotals.pending.toFixed(2)}</td>
                                                    <td className="text-right px-3 py-2 text-emerald-600">{displayTotals.change.toFixed(2)}</td>
                                                    <td className="text-right px-3 py-2">{displayTotals.received.toFixed(2)}</td>
                                                    <td colSpan={3}></td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>

                                {/* Pagination footer, mirrors legacy's "Showing X to Y of Z entries" + page controls */}
                                <div className="shrink-0 flex items-center justify-between gap-3 mt-2 text-sm text-gray-500 dark:text-slate-400">
                                    <span>
                                        Showing {rangeStart} to {rangeEnd} of {filteredEntries.length} entries
                                    </span>
                                    {pageSize !== "All" && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                disabled={safePage <= 1}
                                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                                className={`w-7 h-7 flex items-center justify-center rounded border font-semibold transition-colors ${
                                                    safePage <= 1
                                                        ? "border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600 cursor-not-allowed"
                                                        : "border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer"
                                                }`}
                                            >
                                                <ChevronLeft size={14} />
                                            </button>
                                            <span className="w-8 h-7 flex items-center justify-center rounded bg-blue-600 text-white font-semibold">
                                                {safePage}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={safePage >= totalPages}
                                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                                className={`w-7 h-7 flex items-center justify-center rounded border font-semibold transition-colors ${
                                                    safePage >= totalPages
                                                        ? "border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600 cursor-not-allowed"
                                                        : "border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer"
                                                }`}
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer: Close + Export, mirrors legacy's Export Excel / Export PDF buttons */}
                <div className="shrink-0 flex items-center justify-end gap-2.5 px-5 py-3 border-t border-gray-200 dark:border-slate-700">
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
        </div>
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
