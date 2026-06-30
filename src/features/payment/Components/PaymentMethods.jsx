import {
    Banknote,
    CreditCard,
    Layers,
    FileText,
    Smartphone,
    MoreHorizontal,
    Landmark,
    SplitSquareHorizontal,
} from "lucide-react";

// Matches legacy's llx_c_paiement codes exactly (PaymentModal originally,
// now shared here) plus a "Split Payment" option, which isn't a real
// payment-method code — selecting it switches the page into SplitPayment
// mode instead of a single payment_method_code.
export const PAYMENT_METHODS = [
    { code: "01", label: "Cash", icon: Banknote },
    { code: "02", label: "Credit", icon: CreditCard },
    { code: "03", label: "Cash/Credit", icon: Layers },
    { code: "04", label: "Bank cheque", icon: FileText },
    { code: "05", label: "Debit card", icon: CreditCard },
    { code: "06", label: "Mobile money", icon: Smartphone },
    { code: "07", label: "Other", icon: MoreHorizontal },
    { code: "08", label: "Bank transfer", icon: Landmark },
];

function PaymentMethods({ selected, onSelect }) {
    return (
        <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300 mb-3">Select Payment Method:</h3>
            <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(({ code, label, icon: Icon }) => (
                    <button
                        key={code}
                        type="button"
                        onClick={() => onSelect(code)}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border py-3 text-xs font-medium transition-colors ${
                            selected === code
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300"
                                : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                        }`}
                    >
                        <Icon size={18} />
                        {label}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => onSelect("split")}
                    className={`col-span-2 flex items-center justify-center gap-1.5 rounded-lg border py-3 text-xs font-medium transition-colors ${
                        selected === "split"
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300"
                            : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                    }`}
                >
                    <SplitSquareHorizontal size={18} />
                    Split Payment
                </button>
            </div>
        </div>
    );
}

export default PaymentMethods;
