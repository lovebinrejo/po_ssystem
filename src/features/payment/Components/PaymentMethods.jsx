import {
    Banknote,
    CreditCard,
    Layers,
    FileText,
    Smartphone,
    MoreHorizontal,
    Landmark,
} from "lucide-react";

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
            <h3 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">Select Payment Method:</h3>
            <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(({ code, label, icon: Icon }) => (
                    <button
                        key={code}
                        type="button"
                        onClick={() => onSelect(code)}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 py-3 text-xs font-semibold transition-all ${
                            selected === code
                                ? "border-[#397db9] bg-gradient-to-br from-[#397db9] to-[#2c6a9e] text-white shadow-md"
                                : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:border-[#397db9]/50 hover:shadow-sm"
                        }`}
                    >
                        <Icon size={20} className={selected === code ? "text-white" : "text-[#397db9]"} />
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default PaymentMethods;
