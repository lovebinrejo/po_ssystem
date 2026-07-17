import { useState } from "react";
import { Utensils, Check, X, Loader2, ShoppingBasket } from "lucide-react";
import { useTables } from "../hooks/useTables";
import useTableStore from "../stores/tableStore";
import usePosStore from "../../pos/stores/posStore";
import { fetchReceipt } from "../../reports/services/receiptApi";

function TableSelectorModal({ onClose }) {
    const { tables, loading } = useTables();
    const selectedTable = useTableStore((state) => state.selectedTable);
    const selectTable = useTableStore((state) => state.selectTable);
    const loadInvoiceIntoCart = usePosStore((state) => state.loadInvoiceIntoCart);
    const clearCart = usePosStore((state) => state.clearCart);
    const showToast = usePosStore((state) => state.showToast);
    const [resumingId, setResumingId] = useState(null);
    const [error, setError] = useState("");

    // Legacy (pos-table-selector.js): every table is clickable, including
    // occupied ones — selecting an occupied table loads that table's actual
    // in-progress order into the cart via waiter_ajax.php's getInvoice
    // action (same-origin-only). This app has no such session-cookie path
    // available cross-origin, but reuses the exact same cross-origin-capable
    // mechanism Reports already relies on for the same job (fetchReceipt +
    // loadInvoiceIntoCart) instead of adding a second, same-origin-only one.
    //
    // Every table selection resolves to a definite cart state — either the
    // real loaded order, or a clean slate — same as legacy's own branching
    // ("Found existing order" -> load it; "No existing order... starting
    // fresh" -> clearCartSilent()). The first version of this only handled
    // the load branch; picking an available table (or an occupied one that
    // turned out to have no real lines) left whatever was already in the
    // cart just sitting there — confirmed live: browsing products, then
    // picking a brand-new table, still showed the old items. This app has
    // no direct equivalent of clearCartSilent, but usePosStore's existing
    // clearCart() does the same job (empties the active place's cart/pending
    // invoice/draft link).
    const handleSelect = async (table) => {
        if (resumingId) return;
        setError("");
        let loadedExisting = false;
        if (table.occupied && table.invoiceId) {
            setResumingId(table.id);
            try {
                const receipt = await fetchReceipt(table.invoiceId);
                const items = (receipt.lines || []).map((line) => ({
                    id: line.product_id,
                    name: line.product_label || line.description || "Item",
                    ref: line.product_ref || "",
                    price: line.qty > 0 ? line.total_ttc / line.qty : line.price_unit,
                    qty: line.qty,
                }));
                if (items.length > 0) {
                    const totalPaid = (receipt.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                    const remainToPay = Math.max(0, (Number(receipt.total_ttc) || 0) - totalPaid);
                    loadInvoiceIntoCart({ id: table.invoiceId, ref: receipt.invoice_ref, remainToPay, items });
                    showToast(`${table.label}'s order loaded — ${items.length} item${items.length === 1 ? "" : "s"}`);
                    loadedExisting = true;
                }
            } catch (err) {
                setError(err.message || "Failed to load this table's order");
                setResumingId(null);
                return;
            }
            setResumingId(null);
        }
        if (!loadedExisting) {
            clearCart();
            showToast(`${table.label} selected — ready for a new order`);
        }
        selectTable(table);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl w-full max-w-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-2.5 bg-[#2c6291] text-white">
                    <h3 className="flex items-center gap-2 font-semibold">
                        <Utensils size={18} />
                        Select Table
                    </h3>
                    <button onClick={onClose} className="p-1 rounded hover:bg-white/20">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5">
                    {error && (
                        <p className="mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
                    )}
                    {loading ? (
                        <div className="grid grid-cols-4 gap-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-[110px] rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-4 pt-3">
                            {tables.map((table) => {
                                const isSelected = selectedTable?.id === table.id;
                                const isResuming = resumingId === table.id;
                                return (
                                    <button
                                        key={table.id}
                                        onClick={() => handleSelect(table)}
                                        disabled={!!resumingId}
                                        title={table.occupied ? `${table.label} — click to resume this order` : table.label}
                                        className={`relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl border-2 text-sm font-medium shadow-sm transition-all ${
                                            isSelected
                                                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400 text-emerald-700 dark:text-emerald-400"
                                                : table.occupied
                                                ? "bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                                                : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-100 hover:-translate-y-0.5 hover:border-[#2c6291] hover:shadow-md cursor-pointer"
                                        } ${resumingId && !isResuming ? "opacity-50" : ""}`}
                                    >
                                        {isSelected && (
                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-emerald-500 text-white px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow">
                                                <Check size={10} />
                                                Current
                                            </span>
                                        )}
                                        {isResuming ? (
                                            <Loader2 size={22} className="animate-spin" />
                                        ) : (
                                            <Utensils
                                                size={22}
                                                className={isSelected ? "text-emerald-500" : table.occupied ? "text-amber-500 dark:text-amber-400" : "text-[#2c6291] dark:text-blue-300"}
                                            />
                                        )}
                                        <span className="font-bold">{table.label}</span>
                                        {table.floor && <span className="text-[11px] font-normal text-gray-400 dark:text-slate-500">Floor {table.floor}</span>}
                                        {table.occupied && !isSelected && (
                                            <span className="text-[9px] uppercase tracking-wide opacity-75">Reserved</span>
                                        )}
                                        {table.occupied && table.itemCount > 0 && (
                                            <span
                                                className={`absolute -bottom-2.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow ${
                                                    isSelected ? "bg-emerald-500" : "bg-sky-500"
                                                }`}
                                            >
                                                <ShoppingBasket size={9} />
                                                {table.itemCount} item{table.itemCount === 1 ? "" : "s"}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end px-5 py-3 border-t border-gray-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TableSelectorModal;
