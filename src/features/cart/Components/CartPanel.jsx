import { ShoppingCart, Plus, Minus, Trash2, CreditCard } from "lucide-react";
import CustomerSelector from "../../customers/Components/CustomerSelector";
import OrderTypeBar from "../../tables/Components/OrderTypeBar";
import useAuthStore from "../../authentication/stores/authStore";

// Product prices from the legacy API are tax-inclusive (price_ttc) and don't
// carry a per-product tax rate yet, so the Subtotal/Tax split below is a flat
// placeholder estimate until that data is available from the backend.
const TAX_RATE = 0.16;

function CartPanel({ cart, onChangeQty, onRemove, total }) {
    const terminalNumber = useAuthStore((state) => state.terminalConfig?.terminalNumber) || 1;
    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotalExcl = total / (1 + TAX_RATE);
    const tax = total - subtotalExcl;

    return (
        <div className="w-full lg:w-80 lg:shrink-0 h-full flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-transparent rounded-xl p-4 text-gray-900 dark:text-white">
            <div className="shrink-0">
                <CustomerSelector />
                <OrderTypeBar />
            </div>

            <div className="flex-1 min-h-[120px] overflow-y-auto soft-scrollbar mt-4">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 text-gray-400 dark:text-slate-500">
                        <ShoppingCart size={40} className="mb-3 opacity-50" />
                        <p className="text-sm">Cart is empty</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {cart.map((item) => (
                            <li key={item.id} className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium truncate">{item.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-slate-400">
                                        {item.price.toFixed(2)} ZMW x {item.qty}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => onChangeQty(item.id, -1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700">
                                        <Minus size={14} />
                                    </button>
                                    <button onClick={() => onChangeQty(item.id, 1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700">
                                        <Plus size={14} />
                                    </button>
                                    <button onClick={() => onRemove(item.id)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-red-500 dark:text-red-400">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="shrink-0 mt-2 pt-3 border-t border-gray-200 dark:border-slate-700 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-slate-400">
                    <span>Order Id</span>
                    <span className="text-gray-700 dark:text-slate-300">(PROV-POS{terminalNumber}-0)</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-slate-400">
                    <span>Items</span>
                    <span className="text-gray-700 dark:text-slate-300">{itemCount}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-slate-400">
                    <span>Subtotal (Excl)</span>
                    <span className="text-gray-700 dark:text-slate-300">ZMW {subtotalExcl.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-slate-400">
                    <span>Discount</span>
                    <span className="text-gray-700 dark:text-slate-300">ZMW 0.00</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-slate-400">
                    <span>Tax (VAT)</span>
                    <span className="text-gray-700 dark:text-slate-300">ZMW {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 dark:text-white pt-2 mt-1 border-t border-gray-200 dark:border-slate-700">
                    <span>Total (Incl)</span>
                    <span>ZMW {total.toFixed(2)}</span>
                </div>
            </div>

            <button
                type="button"
                disabled={cart.length === 0}
                className="shrink-0 mt-4 w-full flex items-center justify-center gap-2 rounded-lg py-3 font-semibold text-slate-900 bg-gradient-to-r from-sky-400 to-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <CreditCard size={16} />
                Proceed to Payment
            </button>
        </div>
    );
}

export default CartPanel;
