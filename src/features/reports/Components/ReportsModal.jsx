import { useEffect, useState } from "react";
import { BarChart3, X, Filter, Search, Banknote, CreditCard, Landmark, Smartphone, FileText, HelpCircle, Printer } from "lucide-react";
import useAuthStore from "../../authentication/stores/authStore";
import { getPaymentSummary, getReportsData } from "../services/reportsApi";
import DateRangePicker from "./DateRangePicker";

const ICONS = { cash: Banknote, credit: CreditCard, bank: Landmark, mobile: Smartphone, cheque: FileText, other: HelpCircle };

const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function ReportsModal({ open, onClose }) {
    const terminalNumber = useAuthStore((state) => state.terminalConfig?.terminalNumber) || 1;

    const [startDate, setStartDate] = useState(today());
    const [endDate, setEndDate] = useState(today());
    const [search, setSearch] = useState("");
    const [tableSearch, setTableSearch] = useState("");
    const [pageSize, setPageSize] = useState(25);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [payments, setPayments] = useState([]);
    const [total, setTotal] = useState(0);
    const [entries, setEntries] = useState([]);
    const [totals, setTotals] = useState(null);

    const loadData = async (overrides = {}) => {
        const rangeStart = overrides.start || startDate;
        const rangeEnd = overrides.end || endDate;
        const filterSearch = overrides.search ?? search;

        setLoading(true);
        setError("");
        try {
            const [summaryRes, reportsRes] = await Promise.all([
                getPaymentSummary({ terminal: terminalNumber }),
                getReportsData({ terminal: terminalNumber, startDate: toIso(rangeStart), endDate: toIso(rangeEnd), search: filterSearch }),
            ]);
            if (!summaryRes.success) throw new Error(summaryRes.error || "Failed to load payment summary");
            if (!reportsRes.success) throw new Error(reportsRes.error || "Failed to load reports data");

            setPayments(summaryRes.payments);
            setTotal(summaryRes.total);
            setEntries(reportsRes.entries);
            setTotals(reportsRes.totals);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Mirrors legacy: picking a date range just sets the field value; the
    // separate "Apply Filter" button below actually triggers the data fetch.
    const handleApplyDateRange = (start, end) => {
        setStartDate(start);
        setEndDate(end);
    };

    useEffect(() => {
        if (open) loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;

    const visibleEntries = entries
        .filter((e) => {
            if (!tableSearch) return true;
            const term = tableSearch.toLowerCase();
            return e.ref?.toLowerCase().includes(term) || e.customer?.toLowerCase().includes(term);
        })
        .slice(0, pageSize);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl">
                <div className="shrink-0 flex items-center justify-between px-5 py-4 bg-blue-600 dark:bg-blue-700 rounded-t-xl text-white">
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

                <div className="flex-1 min-h-0 overflow-y-auto soft-scrollbar px-5 py-4 space-y-4">
                    {/* Filter bar */}
                    <div className="flex flex-wrap items-end gap-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg p-3">
                        <div>
                            <label className="block text-xs font-medium mb-1">Date Range</label>
                            <DateRangePicker startDate={startDate} endDate={endDate} onApply={handleApplyDateRange} />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-medium mb-1">Search</label>
                            <div className="flex items-center gap-2 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5">
                                <Search size={14} className="text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Invoice, customer, reference..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full text-sm outline-none bg-transparent"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => loadData()}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
                        >
                            <Filter size={14} />
                            Apply Filter
                        </button>
                    </div>

                    {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

                    {loading ? (
                        <p className="text-sm text-gray-500 dark:text-slate-400 py-10 text-center">Loading reports data...</p>
                    ) : (
                        <>
                            {/* Payment summary cards */}
                            <div>
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                                    <BarChart3 size={15} className="text-blue-500" />
                                    Payment Summary
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {payments.map((p) => {
                                        const Icon = ICONS[p.icon] || HelpCircle;
                                        const pct = total > 0 ? ((p.amount / total) * 100).toFixed(1) : "0.0";
                                        return (
                                            <div
                                                key={p.code || p.label}
                                                className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 px-3 py-2.5"
                                            >
                                                <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                                                    <Icon size={15} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs text-gray-500 dark:text-slate-400 truncate">{p.label}</div>
                                                    <div className="font-bold">ZMW {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                </div>
                                                <span className="text-[11px] rounded bg-white dark:bg-slate-700 px-1.5 py-0.5">{p.count}</span>
                                                <span className="text-[11px] rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5">{pct}%</span>
                                            </div>
                                        );
                                    })}
                                    <div className="flex items-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-2.5">
                                        <div className="w-8 h-8 shrink-0 rounded-lg bg-white/20 flex items-center justify-center">
                                            <BarChart3 size={15} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs text-white/80">Total</div>
                                            <div className="font-bold">ZMW {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        </div>
                                        <span className="text-[11px] rounded bg-white/20 px-1.5 py-0.5">
                                            {payments.reduce((sum, p) => sum + p.count, 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Totals strip */}
                            {totals && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center py-2">
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

                            {/* Entries table */}
                            <div>
                                <div className="flex items-center justify-between gap-3 mb-2 text-sm">
                                    <div className="flex items-center gap-1.5">
                                        Show
                                        <input
                                            type="number"
                                            value={pageSize}
                                            onChange={(e) => setPageSize(parseInt(e.target.value, 10) || 25)}
                                            className="w-16 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-center"
                                        />
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

                                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700 max-h-[40vh] overflow-y-auto soft-scrollbar">
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
                                                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500"
                                                            >
                                                                <Printer size={13} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {totals && entries.length > 0 && (
                                            <tfoot className="bg-gray-50 dark:bg-slate-800 font-semibold">
                                                <tr>
                                                    <td colSpan={4} className="text-right px-3 py-2">
                                                        Total
                                                    </td>
                                                    <td className="text-right px-3 py-2">{totals.total_ht.toFixed(2)}</td>
                                                    <td className="text-right px-3 py-2">{totals.total_tva.toFixed(2)}</td>
                                                    <td className="text-right px-3 py-2">{totals.total_ttc.toFixed(2)}</td>
                                                    <td className="text-right px-3 py-2">{totals.pending.toFixed(2)}</td>
                                                    <td className="text-right px-3 py-2 text-emerald-600">{totals.change.toFixed(2)}</td>
                                                    <td className="text-right px-3 py-2">{totals.received.toFixed(2)}</td>
                                                    <td colSpan={3}></td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ReportsModal;
