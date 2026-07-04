import { useState } from "react";
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Lock, XCircle, Clock } from "lucide-react";
import CustomerSelector from "../../customers/Components/CustomerSelector";
import OrderTypeBar from "../../tables/Components/OrderTypeBar";
import EditCartItemModal from "./EditCartItemModal";
import PaymentModal from "../../payment/PaymentModal";
import ConfirmDialog from "../../../components/ConfirmDialog";
import useAuthStore from "../../authentication/stores/authStore";
import usePosStore from "../../pos/stores/posStore";

// Product prices from the legacy API are tax-inclusive (price_ttc) and don't
// carry a per-product tax rate yet, so the Subtotal/Tax split below is a flat
// placeholder estimate until that data is available from the backend. Kept
// in sync with the same constant in payment/services/paymentService.js,
// which builds the actual payment line items in the payment modal.
const TAX_RATE = 0.16;

function CartPanel({ cart, onChangeQty, onRemove, total, cashSessionOpen = true }) {
    const terminalConfig = useAuthStore((state) => state.terminalConfig);
    const terminalNumber = terminalConfig?.terminalNumber || 1;
    const updateCartItem = usePosStore((state) => state.updateCartItem);
    const pendingInvoice = usePosStore((state) => state.pendingInvoice);
    const cancelPendingInvoice = usePosStore((state) => state.cancelPendingInvoice);
    const showToast = usePosStore((state) => state.showToast);
    const [editingItem, setEditingItem] = useState(null);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotalExcl = total / (1 + TAX_RATE);
    const tax = total - subtotalExcl;

    return (
        <div className="w-32 sm:w-44 md:w-64 lg:w-80 shrink-0 h-full flex flex-col bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-transparent rounded-xl sm:rounded-2xl shadow-sm p-1.5 sm:p-3 lg:p-4 text-gray-900 dark:text-white overflow-hidden">
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
                            Items locked · ZMW {pendingInvoice.remainToPay.toFixed(2)} due
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
                    <ul className="space-y-1.5 sm:space-y-2">
                        {cart.map((item) => (
                            <li
                                key={item.id}
                                className={`flex items-center justify-between gap-1 sm:gap-2 rounded-lg sm:rounded-xl px-1.5 sm:px-2.5 py-1.5 sm:py-2 ${
                                    item.locked
                                        ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"
                                        : "bg-gray-50 dark:bg-slate-800/70"
                                }`}
                            >
                                {item.locked ? (
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1 min-w-0 flex-wrap">
                                            <span className="text-[11px] sm:text-sm font-medium truncate">{item.name}</span>
                                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-semibold bg-amber-400 dark:bg-amber-500 text-amber-950 border border-amber-500 dark:border-amber-400">
                                                <Lock size={8} /> Locked
                                            </span>
                                            {/* Mirrors legacy's KOT-status badge: locked items already exist as saved
                                                invoice lines, so they show "Pending" instead of the fresh-cart "Draft". */}
                                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                                                <Clock size={8} /> Pending
                                            </span>
                                        </div>
                                        {item.ref && (
                                            <div className="text-[9px] sm:text-[11px] text-gray-400 dark:text-slate-500 truncate">{item.ref}</div>
                                        )}
                                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 truncate">
                                            {item.price.toFixed(2)} ZMW x {item.qty}
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setEditingItem(item)}
                                        className="min-w-0 text-left hover:opacity-80"
                                    >
                                        <div className="flex items-center gap-1 min-w-0">
                                            <span className="text-[11px] sm:text-sm font-medium truncate">{item.name}</span>
                                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-medium bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 border border-gray-300 dark:border-slate-600">
                                                📝 Draft
                                            </span>
                                        </div>
                                        {item.ref && (
                                            <div className="text-[9px] sm:text-[11px] text-gray-400 dark:text-slate-500 truncate">{item.ref}</div>
                                        )}
                                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 truncate">
                                            {item.price.toFixed(2)} ZMW x {item.qty}
                                        </div>
                                    </button>
                                )}
                                {!item.locked && (
                                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                        <button
                                            onClick={() => onChangeQty(item.id, -1)}
                                            aria-label="Decrease quantity"
                                            className="w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-100 shadow-sm transition-all hover:bg-gray-300 dark:hover:bg-slate-500 active:scale-90"
                                        >
                                            <Minus size={5} className="sm:w-3 sm:h-3" />
                                        </button>
                                        <button
                                            onClick={() => onChangeQty(item.id, 1)}
                                            aria-label="Increase quantity"
                                            className="w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-white bg-emerald-500 shadow-sm shadow-emerald-500/30 transition-all hover:bg-emerald-600 active:scale-90"
                                        >
                                            <Plus size={5} className="sm:w-3 sm:h-3" />
                                        </button>
                                        <button
                                            onClick={() => onRemove(item.id)}
                                            aria-label="Remove item"
                                            className="w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-gray-200 dark:bg-slate-600 text-red-500 dark:text-red-400 shadow-sm transition-all hover:bg-red-100 dark:hover:bg-red-500/20 active:scale-90"
                                        >
                                            <Trash2 size={5} className="sm:w-3 sm:h-3" />
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="shrink-0 mt-1 sm:mt-2 pt-1.5 sm:pt-3 border-t border-gray-200 dark:border-slate-700 space-y-1 sm:space-y-1.5 text-[10px] sm:text-sm">
                <div className="flex justify-between gap-1 text-gray-500 dark:text-slate-400">
                    <span className="truncate">Order Id</span>
                    <span className="text-gray-700 dark:text-slate-300 truncate text-right">(PROV-POS{terminalNumber}-0)</span>
                </div>
                <div className="flex justify-between gap-1 items-center text-gray-500 dark:text-slate-400">
                    <span className="truncate">Status</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600">
                        📝 Draft
                    </span>
                </div>
                <div className="flex justify-between gap-1 text-gray-500 dark:text-slate-400">
                    <span className="truncate">Items</span>
                    <span className="text-gray-700 dark:text-slate-300">{itemCount}</span>
                </div>
                <div className="flex justify-between gap-1 text-gray-500 dark:text-slate-400">
                    <span className="truncate">Subtotal (Excl)</span>
                    <span className="text-gray-700 dark:text-slate-300 truncate text-right">ZMW {subtotalExcl.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-1 text-gray-500 dark:text-slate-400">
                    <span className="truncate">Discount</span>
                    <span className="text-gray-700 dark:text-slate-300 truncate text-right">ZMW 0.00</span>
                </div>
                <div className="flex justify-between gap-1 text-gray-500 dark:text-slate-400">
                    <span className="truncate">Tax (VAT)</span>
                    <span className="text-gray-700 dark:text-slate-300 truncate text-right">ZMW {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-1 font-semibold text-gray-900 dark:text-white pt-1.5 sm:pt-2 mt-0.5 sm:mt-1 border-t border-gray-200 dark:border-slate-700">
                    <span className="truncate">Total (Incl)</span>
                    <span className="truncate text-right">ZMW {total.toFixed(2)}</span>
                </div>
            </div>

            <button
                type="button"
                disabled={cart.length === 0 || !cashSessionOpen}
                onClick={() => setPaymentOpen(true)}
                className="shrink-0 mt-2 sm:mt-4 w-full flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg py-2 sm:py-3 text-[11px] sm:text-sm font-semibold border border-transparent text-white bg-gradient-to-r from-green-500 to-emerald-400 shadow-md shadow-green-500/30 transition-all hover:from-green-400 hover:to-emerald-300 hover:shadow-lg hover:shadow-green-500/40 active:scale-[0.98] disabled:bg-gradient-to-r disabled:from-gray-100 disabled:to-gray-100 disabled:border-gray-300 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed dark:disabled:from-slate-800 dark:disabled:to-slate-800 dark:disabled:border-slate-600 dark:disabled:text-slate-500"
            >
                <CreditCard size={14} className="sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">{pendingInvoice ? "Settle Invoice" : "Proceed to Payment"}</span>
                <span className="sm:hidden">Pay</span>
            </button>

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
