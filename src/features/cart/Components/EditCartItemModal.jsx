import { useEffect, useState } from "react";
import { Pencil, X, Minus, Plus, Scale, Tag, Percent, Trash2, Save } from "lucide-react";

// Same palette/initials rule as ProductGrid, so the avatar matches what the
// shopper saw when they added the item.
const AVATAR_COLORS = ["#F59E0B", "#85C1E2", "#EC4899", "#A78BFA", "#10B981", "#F472B6", "#60A5FA", "#34D399"];

const getInitials = (name = "Product") => {
    const words = name.trim().split(" ");
    if (words.length >= 2) {
        return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
};

const getAvatarColor = (productId) => AVATAR_COLORS[(productId || 0) % AVATAR_COLORS.length];

function EditCartItemModal({ item, onClose, onSave, onRemove }) {
    const [qty, setQty] = useState(1);
    const [reduceStock, setReduceStock] = useState(true);
    const [priceLocked, setPriceLocked] = useState(true);
    const [unitPrice, setUnitPrice] = useState(0);
    const [discountPercent, setDiscountPercent] = useState(0);

    useEffect(() => {
        if (item) {
            setQty(item.qty);
            setUnitPrice(item.price);
            setDiscountPercent(item.discountPercent || 0);
            setReduceStock(item.reduceStock ?? true);
            setPriceLocked(true);
        }
    }, [item]);

    if (!item) return null;

    const subtotal = unitPrice * qty;
    const discountAmount = subtotal * (discountPercent / 100);
    const lineTotal = subtotal - discountAmount;

    const handleSave = () => {
        onSave(item.id, {
            qty: Math.max(1, qty),
            price: unitPrice,
            discountPercent,
            reduceStock,
        });
        onClose();
    };

    const handleRemove = () => {
        onRemove(item.id);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto soft-scrollbar rounded-2xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 bg-blue-500 dark:bg-blue-600 rounded-t-2xl text-white">
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <Pencil size={18} />
                        Edit Cart Item
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/20">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-slate-800/70 rounded-xl p-3">
                        <div>
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">Ref: {item.ref || "N/A"}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">
                                VAT: {item.vatCode || "N/A"} | Unit: {item.unit || "N/A"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">
                                Total Stock: {item.stock ?? "N/A"}
                            </div>
                        </div>
                        <div
                            className="w-16 h-16 shrink-0 rounded-lg flex items-center justify-center text-white text-2xl font-semibold"
                            style={{ backgroundColor: getAvatarColor(item.id) }}
                        >
                            {getInitials(item.name)}
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
                            <Scale size={15} />
                            Quantity / Weight
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setQty((q) => Math.max(1, q - 1))}
                                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                <Minus size={16} />
                            </button>
                            <input
                                type="number"
                                value={qty}
                                onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                                className="flex-1 h-9 text-center rounded-lg border border-gray-300 dark:border-slate-600 bg-slate-800 text-white outline-none focus:border-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => setQty((q) => q + 1)}
                                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                <Plus size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setReduceStock((v) => !v)}
                                title="Reduce stock when saving"
                                className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border transition-colors ${
                                    reduceStock
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-300"
                                }`}
                            >
                                <Scale size={16} />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            Reduce stock when saving — use for weighing scale products (e.g. 0.5 kg, 1.25 kg).
                        </p>
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
                            <Tag size={15} />
                            Unit Price
                        </label>
                        <div className="flex items-center gap-2">
                            <span className="px-3 h-9 flex items-center rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-600 dark:text-slate-300">
                                ZMW
                            </span>
                            <input
                                type="number"
                                value={unitPrice}
                                disabled={priceLocked}
                                onClick={() => setPriceLocked(false)}
                                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                                className="flex-1 h-9 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-slate-800 text-white outline-none focus:border-blue-500 disabled:cursor-pointer disabled:opacity-90"
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            Click the price field to unlock it from inside this window.
                        </p>
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
                            <Percent size={15} />
                            Discount
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={discountPercent}
                                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                className="flex-1 h-9 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-slate-800 text-white outline-none focus:border-blue-500"
                            />
                            <span className="px-3 h-9 flex items-center rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-600 dark:text-slate-300">
                                %
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Enter discount percentage (0-100)</p>
                    </div>

                    <div className="flex justify-between text-sm pt-2">
                        <div>
                            <div className="text-gray-500 dark:text-slate-400">Subtotal</div>
                            <div className="text-lg font-semibold">ZMW {subtotal.toFixed(2)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-gray-500 dark:text-slate-400">Discount</div>
                            <div className="text-lg font-semibold text-red-500">- ZMW {discountAmount.toFixed(2)}</div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                        <div className="text-gray-500 dark:text-slate-400 text-sm">Line Total</div>
                        <div className="text-2xl font-bold text-emerald-500">ZMW {lineTotal.toFixed(2)}</div>
                    </div>
                </div>

                <div className="flex gap-2 px-5 py-4 border-t border-gray-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600"
                    >
                        <Trash2 size={15} />
                        Remove Item
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-slate-600 hover:bg-slate-700"
                    >
                        <X size={15} />
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <Save size={15} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EditCartItemModal;
