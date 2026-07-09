import { useState } from "react";
import { ShoppingCart, Trash2, Send, Lock, XCircle, Clock, Save, Pencil } from "lucide-react";
import CustomerSelector from "../../customers/Components/CustomerSelector";
import OrderTypeBar from "../../tables/Components/OrderTypeBar";
import EditCartItemModal from "./EditCartItemModal";
import PaymentModal from "../../payment/PaymentModal";
import ConfirmDialog from "../../../components/ConfirmDialog";
import useAuthStore from "../../authentication/stores/authStore";
import usePosStore from "../../pos/stores/posStore";
import { usePayment } from "../../payment/hooks/usePayment";
import { formatCurrency, formatAmount } from "../../../utils/currency";

// "ZMW" pinned to the left of a fixed-min-width column, digits right-aligned
// with tabular-nums — keeps the ZMW label in the same spot and the amounts'
// last digit lined up down the column, regardless of how many digits each
// row's number has (e.g. "9.66" vs "1,481.22").
function AmountValue({ value, className = "" }) {
    return (
        <span className={`inline-flex items-baseline justify-between gap-1 min-w-[62px] sm:min-w-[72px] ${className}`}>
            <span>ZMW</span>
            <span className="tabular-nums">{formatAmount(value)}</span>
        </span>
    );
}

// Product prices from the legacy API are tax-inclusive (price_ttc) and don't
// carry a per-product tax rate yet, so the Subtotal/Tax split below is a flat
// placeholder estimate until that data is available from the backend. Kept
// in sync with the same constant in payment/services/paymentService.js,
// which builds the actual payment line items in the payment modal.
const TAX_RATE = 0.16;

function CartPanel({ cart, onRemove, total, cashSessionOpen = true }) {
    const terminalConfig = useAuthStore((state) => state.terminalConfig);
    const terminalNumber = terminalConfig?.terminalNumber || 1;
    const updateCartItem = usePosStore((state) => state.updateCartItem);
    const pendingInvoice = usePosStore((state) => state.pendingInvoice);
    const cancelPendingInvoice = usePosStore((state) => state.cancelPendingInvoice);
    const showToast = usePosStore((state) => state.showToast);
    const { saveDraft, savingDraft, draftInvoice } = usePayment();
    const [editingItem, setEditingItem] = useState(null);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotalExcl = total / (1 + TAX_RATE);
    const tax = total - subtotalExcl;

    return (
        <div className="w-[182px] sm:w-[250px] md:w-[361px] lg:w-[452px] h-full shrink-0 flex flex-col bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-transparent rounded-xl sm:rounded-2xl shadow-sm px-1 sm:px-2 lg:px-2.5 text-gray-900 dark:text-white overflow-hidden">
            <div className={`shrink-0 ${!cashSessionOpen ? "opacity-50 pointer-events-none" : ""}`}>
                <CustomerSelector />
                <OrderTypeBar />
            </div>

            {pendingInvoice && (
                <div className="shrink-0 mt-2 flex items-center justify-between gap-1.5 rounded-lg sm:rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-2 sm:px-3 py-1.5 sm:py-2">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold text-[10px] sm:text-xs">
                            <Lock size={11} className="shrink-0" />
                            <span className="truncate">Pending Payment — {pendingInvoice.ref}</span>
                        </div>
                        <div className="text-[9px] sm:text-[11px] text-amber-600/80 dark:text-amber-400/70 truncate">
                            Items locked · {formatCurrency(pendingInvoice.remainToPay)} due
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setConfirmCancelOpen(true)}
                        title="Cancel & New Sale"
                        className="shrink-0 flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-md text-[9px] sm:text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                    >
                        <XCircle size={11} />
                        <span className="hidden sm:inline">Cancel</span>
                    </button>
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto soft-scrollbar mt-2 sm:mt-4 flex flex-col">
                {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-4 sm:py-10 text-gray-400 dark:text-slate-500">
                        <ShoppingCart size={28} className="mb-2 sm:mb-3 opacity-50 sm:w-10 sm:h-10" />
                        <p className="text-[11px] sm:text-sm">Cart is empty</p>
                    </div>
                ) : (
                    <ul className="space-y-[2.4px] sm:space-y-[3.2px]">
                        {cart.map((item) => {
                            const lineTotal = item.price * item.qty;
                            return (
                                <li
                                    key={item.id}
                                    onClick={() => !item.locked && setEditingItem(item)}
                                    className={`rounded-lg sm:rounded-xl px-1.5 sm:px-2.5 py-1 sm:py-1.5 ${
                                        item.locked
                                            ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"
                                            : "bg-gray-50 dark:bg-slate-800/70 cursor-pointer hover:opacity-90"
                                    }`}
                                >
                                    <div className="flex items-center gap-1 min-w-0 flex-wrap leading-none">
                                        <span className="min-w-0 max-w-[55%] sm:max-w-[60%] text-[10px] sm:text-xs font-bold text-gray-900 dark:text-white truncate" title={item.name}>{item.name}</span>
                                        {item.unit && (
                                            <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-semibold bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-500/30">
                                                {item.unit}
                                            </span>
                                        )}
                                        {item.discountPercent > 0 && (
                                            <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold bg-emerald-500 text-white">
                                                -{item.discountPercent}%
                                            </span>
                                        )}
                                        {item.locked ? (
                                            <>
                                                <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-semibold bg-amber-400 dark:bg-amber-500 text-amber-950 border border-amber-500 dark:border-amber-400">
                                                    <Lock size={8} /> Locked
                                                </span>
                                                {/* Mirrors legacy's KOT-status badge: locked items already exist as saved
                                                    invoice lines, so they show "Pending" instead of the fresh-cart "Draft". */}
                                                <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                                                    <Clock size={8} /> Pending
                                                </span>
                                            </>
                                        ) : draftInvoice ? (
                                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                                                <Clock size={8} /> Pending
                                            </span>
                                        ) : (
                                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-medium bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 border border-gray-300 dark:border-slate-600">
                                                📝 Draft
                                            </span>
                                        )}
                                    </div>

                                    {/* Price sits on this second line, alongside the ref code. */}
                                    <div className="flex items-center justify-between gap-1.5 sm:gap-2 leading-none">
                                        <span className="min-w-0 flex-1 text-[9px] sm:text-[11px] text-gray-400 dark:text-slate-500 truncate">
                                            {item.ref}
                                        </span>
                                        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                            <AmountValue
                                                value={lineTotal}
                                                className="text-[#2c6291] dark:text-[#7fb0d8] text-[10px] sm:text-xs font-semibold whitespace-nowrap"
                                            />
                                            {!item.locked && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRemove(item.id);
                                                    }}
                                                    aria-label="Remove item"
                                                    className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                                                >
                                                    <Trash2 size={9} className="sm:w-[11px] sm:h-[11px]" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 truncate leading-none">
                                        <span className="truncate">
                                            {formatCurrency(item.price)} x {item.qty}
                                        </span>
                                        {!item.locked && <Pencil size={9} className="shrink-0 text-gray-400 dark:text-slate-500" />}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="shrink-0 mt-1 sm:mt-1.5 pt-[3.6px] sm:pt-[5.4px] pb-1.5 sm:pb-2 px-2 sm:px-2.5 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 rounded-lg space-y-[1.8px] sm:space-y-[3.6px] text-[9px] sm:text-xs">
                <div className="flex justify-between gap-1 text-gray-500 dark:text-slate-400">
                    <span className="truncate">Order Id</span>
                    <span className="text-gray-700 dark:text-slate-300 truncate text-right">(PROV-POS{terminalNumber}-0)</span>
                </div>
                <div className="flex justify-between gap-1 items-center text-gray-500 dark:text-slate-400">
                    <span className="truncate">Status</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-amber-400 dark:bg-amber-500 text-amber-950 border border-amber-500 dark:border-amber-400">
                        📝 Draft
                    </span>
                </div>
                <div className="flex justify-between gap-1 text-gray-500 dark:text-slate-400">
                    <span className="truncate">Items</span>
                    <span className="text-gray-700 dark:text-slate-300">{itemCount}</span>
                </div>
                <div className="flex justify-between gap-1 text-gray-500 dark:text-slate-400">
                    <span className="truncate">Subtotal (Excl)</span>
                    <AmountValue value={subtotalExcl} className="text-gray-700 dark:text-slate-300" />
                </div>
                <div className="flex justify-between gap-1 text-gray-500 dark:text-slate-400">
                    <span className="truncate">Discount</span>
                    <AmountValue value={0} className="text-gray-700 dark:text-slate-300" />
                </div>
                <div className="flex justify-between gap-1 text-gray-500 dark:text-slate-400">
                    <span className="truncate">Tax (VAT)</span>
                    <AmountValue value={tax} className="text-gray-700 dark:text-slate-300" />
                </div>
                <div className="flex justify-between gap-1 font-semibold text-gray-900 dark:text-white pt-[3.6px] sm:pt-[5.4px] mt-[1.8px] border-t border-gray-300 dark:border-slate-600">
                    <span className="truncate">Total (Incl)</span>
                    <AmountValue value={total} />
                </div>
            </div>

            <div className="shrink-0 mt-2 sm:mt-4 flex items-center gap-1.5 sm:gap-2">
                {!pendingInvoice && (
                    <button
                        type="button"
                        disabled={cart.length === 0 || !cashSessionOpen || savingDraft || !!draftInvoice}
                        onClick={saveDraft}
                        title={draftInvoice ? `Draft saved successfully — ${draftInvoice.ref}` : "Save as draft"}
                        className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold border shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:pointer-events-none ${
                            draftInvoice
                                ? "bg-amber-100 dark:bg-amber-500/15 border-amber-400 dark:border-amber-500/40 text-amber-800 dark:text-amber-300"
                                : "bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-200 hover:border-gray-400 dark:hover:bg-slate-600 dark:hover:border-slate-500 disabled:opacity-50"
                        }`}
                    >
                        <Save size={14} className="sm:w-4 sm:h-4 shrink-0" />
                        <span className="hidden sm:inline">{savingDraft ? "Saving..." : draftInvoice ? "Drafted" : "Draft"}</span>
                    </button>
                )}
                <button
                    type="button"
                    disabled={cart.length === 0 || !cashSessionOpen}
                    onClick={() => setPaymentOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold tracking-wide border border-transparent text-white bg-[#397db9] transition-all hover:bg-[#2c6291] active:scale-[0.98] disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed dark:disabled:bg-slate-800 dark:disabled:border-slate-600 dark:disabled:text-slate-500"
                >
                    <Send size={14} className="sm:w-4 sm:h-4 shrink-0" />
                    <span className="hidden sm:inline">{pendingInvoice ? "Settle Invoice" : "Proceed Sale's"}</span>
                    <span className="sm:hidden">Pay</span>
                </button>
            </div>

            <EditCartItemModal
                item={editingItem}
                onClose={() => setEditingItem(null)}
                onSave={updateCartItem}
                onRemove={onRemove}
            />

            <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} />

            <ConfirmDialog
                open={confirmCancelOpen}
                title="Cancel pending payment and start a new sale?"
                message="This will clear the current cart and reset the payment state."
                confirmLabel="Cancel Payment"
                cancelLabel="Keep Cart"
                onCancel={() => setConfirmCancelOpen(false)}
                onConfirm={() => {
                    cancelPendingInvoice();
                    setConfirmCancelOpen(false);
                    showToast("Pending payment canceled. Ready for new sale.");
                }}
            />
        </div>
    );
}

export default CartPanel;
