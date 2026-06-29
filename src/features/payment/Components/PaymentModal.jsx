import { useEffect, useState } from "react";
import {
    X,
    Banknote,
    CreditCard,
    Layers,
    FileText,
    Smartphone,
    MoreHorizontal,
    Landmark,
    QrCode,
    CheckCircle2,
} from "lucide-react";

const PAYMENT_METHODS = [
    { code: "01", label: "Cash", icon: Banknote },
    { code: "02", label: "Credit", icon: CreditCard },
    { code: "03", label: "Cash/Credit", icon: Layers },
    { code: "04", label: "Bank cheque", icon: FileText },
    { code: "05", label: "Debit card", icon: CreditCard },
    { code: "06", label: "Mobile money", icon: Smartphone },
    { code: "07", label: "Other", icon: MoreHorizontal },
    { code: "08", label: "Bank transfer", icon: Landmark },
];

function PaymentModal({ open, onClose, onComplete, itemCount, subtotalExcl, tax, total }) {
    const [selectedMethod, setSelectedMethod] = useState("01");
    const [amountTendered, setAmountTendered] = useState(total.toFixed(2));

    useEffect(() => {
        if (open) {
            setSelectedMethod("01");
            setAmountTendered(total.toFixed(2));
        }
    }, [open, total]);

    if (!open) return null;

    const isMobileMoney = selectedMethod === "06";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto soft-scrollbar rounded-2xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl">
                <div className="flex items-center justify-between px-6 py-2.5 bg-[#2c6291] rounded-t-2xl text-white">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                        <CreditCard size={20} />
                        Complete Payment
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded hover:bg-white/20"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 px-6 py-5">
                    <div>
                        <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300 mb-3">
                            Select Payment Method:
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {PAYMENT_METHODS.map(({ code, label, icon: Icon }) => (
                                <button
                                    key={code}
                                    type="button"
                                    onClick={() => setSelectedMethod(code)}
                                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border py-3 text-xs font-medium transition-colors ${
                                        selectedMethod === code
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300"
                                            : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                                    }`}
                                >
                                    <Icon size={18} />
                                    {label}
                                </button>
                            ))}
                        </div>

                        <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300 mt-5 mb-2">
                            Payment Details:
                        </h3>
                        <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-slate-400">Total Amount:</span>
                                <span className="font-semibold">ZMW {total.toFixed(2)}</span>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">
                                    Amount Tendered:
                                </label>
                                <input
                                    type="number"
                                    value={amountTendered}
                                    onChange={(e) => setAmountTendered(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300 mb-3">Scan to Pay:</h3>
                        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 h-32 text-gray-400 dark:text-slate-500">
                            <QrCode size={32} className="opacity-50" />
                            <p className="text-xs text-center px-4">
                                {isMobileMoney
                                    ? "Scan QR code to complete payment"
                                    : "QR code available for mobile money"}
                            </p>
                        </div>

                        <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300 mt-5 mb-2">
                            Order Summary:
                        </h3>
                        <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-500 dark:text-slate-400">
                                <span>Items:</span>
                                <span>{itemCount}</span>
                            </div>
                            <div className="flex justify-between text-gray-500 dark:text-slate-400">
                                <span>Subtotal:</span>
                                <span>ZMW {subtotalExcl.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500 dark:text-slate-400">
                                <span>Tax (VAT):</span>
                                <span>ZMW {tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-semibold pt-2 mt-1 border-t border-gray-200 dark:border-slate-700">
                                <span>Total:</span>
                                <span>ZMW {total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onComplete?.({ method: selectedMethod, amountTendered: parseFloat(amountTendered) || 0 })}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-400 shadow-md shadow-green-500/30 hover:from-green-400 hover:to-emerald-300"
                    >
                        <CheckCircle2 size={16} />
                        Complete Payment
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PaymentModal;
