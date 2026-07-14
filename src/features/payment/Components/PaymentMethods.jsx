import {
    Banknote,
    CreditCard,
    Layers,
    FileText,
    Smartphone,
    MoreHorizontal,
    Landmark,
    Settings,
} from "lucide-react";
import useAuthStore from "../../authentication/stores/authStore";

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

// Mirrors legacy's takeposnew/index.php: a payment method is only usable if
// this terminal has a bank account assigned to it (CASHDESK_ID_BANKACCOUNT_
// {code}{terminal}), otherwise it's shown disabled with "Set up in module".
// api/login's terminal_config.payment_methods (already returned on every
// login, no extra fetch) only carries that check for 3 of the 8 codes today
// — the other 4 non-mobile codes have no signal to go on here, so they
// default to "needs setup" rather than optimistically enabling a method
// that would likely 400 server-side anyway (api/pos/payment validates the
// same constant on submit).
const BANK_ACCOUNT_KEY = { "01": "cash", "04": "cheque", "05": "card" };

// Mobile money (06) is deliberately excluded from this check — it already
// has its own real enable/disable gate via the LencoPay provider popup
// (PaymentProviderModal, opened by PaymentModal's handleSelectMethod),
// unrelated to bank-account configuration.
const isConfigured = (code, terminalConfig) => {
    if (code === "06") return true;
    const key = BANK_ACCOUNT_KEY[code];
    return key ? Boolean(terminalConfig?.payment_methods?.[key]) : false;
};

function PaymentMethods({ selected, onSelect }) {
    const terminalConfig = useAuthStore((state) => state.terminalConfig);

    return (
        <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">Select Payment Method:</h3>
            <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(({ code, label, icon: Icon }) => {
                    const configured = isConfigured(code, terminalConfig);
                    const active = configured && selected === code;
                    return (
                        <button
                            key={code}
                            type="button"
                            disabled={!configured}
                            onClick={() => onSelect(code)}
                            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 py-3 text-xs font-semibold transition-all ${
                                !configured
                                    ? "border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/50 text-gray-400 dark:text-slate-500 cursor-not-allowed opacity-60"
                                    : active
                                    ? "border-[#2c6291] bg-[#2c6291] text-white shadow-md"
                                    : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:border-[#397db9]/50 hover:shadow-sm"
                            }`}
                        >
                            <Icon size={20} className={!configured ? "text-gray-400 dark:text-slate-500" : active ? "text-white" : "text-[#397db9]"} />
                            {label}
                            {!configured && (
                                <span className="flex items-center gap-1 text-[10px] font-medium text-red-500 dark:text-red-400">
                                    <Settings size={10} /> Set up in module
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default PaymentMethods;
