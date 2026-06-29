import { useEffect, useState } from "react";
import { Boxes, Minus, Plus, X } from "lucide-react";

function UOMSelectorModal({ product, onClose, onConfirm }) {
    const [qty, setQty] = useState(1);

    useEffect(() => {
        if (product) setQty(1);
    }, [product]);

    if (!product) return null;

    const basePrice = product.price || 0;
    const units = [
        { id: "base", label: "Each", code: "EA", factor: 1, price: basePrice, isBase: true },
        ...product.uomUnits.map((unit) => ({
            id: unit.id,
            label: unit.label,
            code: unit.code,
            factor: unit.factor,
            price: unit.price_override_ttc > 0 ? unit.price_override_ttc : basePrice * unit.factor,
            isBase: false,
        })),
    ];

    const handleSelect = (unit) => {
        onConfirm(product, unit, qty);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto soft-scrollbar rounded-2xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl">
                <div className="flex items-center justify-between px-5 py-2.5 bg-[#2c6291] rounded-t-2xl text-white">
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <Boxes size={18} />
                        Select Unit of Measure
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/20">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    <div>
                        <h3 className="font-medium">{product.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            Select the unit and quantity to add to cart
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Quantity:</label>
                        <button
                            type="button"
                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                            <Minus size={14} />
                        </button>
                        <span className="w-10 text-center font-semibold bg-slate-800 text-white rounded-lg py-1">{qty}</span>
                        <button
                            type="button"
                            onClick={() => setQty((q) => q + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {units.map((unit) => (
                            <button
                                key={unit.id}
                                type="button"
                                onClick={() => handleSelect(unit)}
                                className={`w-full flex items-center justify-between gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                                    unit.isBase
                                        ? "border-green-500 bg-green-50 dark:bg-green-500/10"
                                        : "border-gray-200 dark:border-slate-700 hover:border-blue-400"
                                }`}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">
                                            {unit.label} ({unit.code})
                                        </span>
                                        {unit.isBase && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-600 text-white">
                                                Base Unit
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                        {unit.isBase ? "Base unit" : `1 ${unit.label} = ${unit.factor} EA`}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-lg font-bold text-violet-600 dark:text-violet-400">
                                        {unit.price.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-gray-400">per {unit.label}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end px-5 py-4 border-t border-gray-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <X size={15} />
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UOMSelectorModal;
