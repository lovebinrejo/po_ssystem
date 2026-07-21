import { useEffect, useState } from "react";
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
import { fetchBankAccounts, fetchPaymentTypes } from "../services/paymentService";

// code/icon stay fixed here — PaymentModal.jsx/usePayment.js branch on these
// exact codes ("01" for cash, "06" for mobile money, etc.) to decide which
// payment sub-form to show, so the code list itself can't be swapped for
// whatever Dolibarr happens to have without touching that branching too.
// The label is the part that actually comes from Dolibarr now (see
// paymentTypeLabels below) — these strings are only the fallback shown
// before that fetch resolves, or if it fails.
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

// Mirrors takeposnew/index.php's own $standardPaymentMap — the actual PHP
// that decides whether this button shows enabled on the legacy screen this
// app is standing in for (verified live: 02/Credit checks CB, not a
// "CREDIT" constant that doesn't exist; 03/Cash-Credit checks CHEQUE, not
// "CASHCREDIT"; 04/05 have no named entry at all and fall straight to the
// generic per-code constant, not CHEQUE/CB). Note this is a *different*
// mapping than api/pos/payment/index.php's own $code_map, which the actual
// payment submission uses — the two legacy files disagree with each other
// for 02-05. This one is deliberately chosen to match what the cashier sees
// as clickable; a mismatched submission at that point is a pre-existing
// backend inconsistency, not something the frontend can paper over.
const PRIMARY_BANK_ACCOUNT_KEY = { "01": "cash", "02": "card", "03": "cheque" };

const getBankAccountId = (code, terminalConfig) => {
    const paymentMethods = terminalConfig?.payment_methods;
    if (!paymentMethods) return null;
    const primaryKey = PRIMARY_BANK_ACCOUNT_KEY[code];
    return (primaryKey && paymentMethods[primaryKey]) || paymentMethods[code] || null;
};

export const isConfigured = (code, terminalConfig) => Boolean(getBankAccountId(code, terminalConfig));

// Mirrors legacy's own pos-payment-integrated.js loadPaymentMethods(): renders
// configured methods first (in their original relative order), then
// unconfigured ones grouped at the end, instead of everything staying pinned
// to PAYMENT_METHODS' fixed array order regardless of what's actually usable.
export const orderPaymentMethods = (terminalConfig) => {
    const configured = PAYMENT_METHODS.filter((m) => isConfigured(m.code, terminalConfig));
    const unconfigured = PAYMENT_METHODS.filter((m) => !isConfigured(m.code, terminalConfig));
    return [...configured, ...unconfigured];
};

// Mirrors legacy's auto-select-on-load (same file, ~line 199): prefer a
// cash-like configured method (code "01"/"LIQ" or a label containing
// "cash"/"espece"), else fall back to whichever configured method sorts
// first — never a disabled one, since legacy's own selectPaymentMethod()
// only ever runs against configuredMethods.
export const pickDefaultPaymentMethod = (terminalConfig, paymentTypeLabels = {}) => {
    const configured = PAYMENT_METHODS.filter((m) => isConfigured(m.code, terminalConfig));
    if (configured.length === 0) return null;
    const cashLike = configured.find((m) => {
        const label = (paymentTypeLabels[m.code] ?? m.label).toLowerCase();
        return m.code === "01" || label.includes("cash") || label.includes("espece");
    });
    return (cashLike || configured[0]).code;
};

function PaymentMethods({ selected, onSelect }) {
    const terminalConfig = useAuthStore((state) => state.terminalConfig);
   
    const [bankAccountsById, setBankAccountsById] = useState({});
    
    const [paymentTypeLabels, setPaymentTypeLabels] = useState({});

    useEffect(() => {
        fetchBankAccounts().then((accounts) => {
            setBankAccountsById(Object.fromEntries(accounts.map((a) => [Number(a.id), a.label])));
        });
        fetchPaymentTypes().then((types) => {
            setPaymentTypeLabels(Object.fromEntries(types.map((t) => [t.code, t.text])));
        });
    }, []);

    
    useEffect(() => {
        console.table(
            PAYMENT_METHODS.map(({ code, label }) => {
                const bankAccountId = getBankAccountId(code, terminalConfig);
                return {
                    code,
                    fallbackLabel: label,
                    dolibarrLabel: paymentTypeLabels[code] ?? "(fetch pending/failed)",
                    bankAccountId,
                    bankAccountName: bankAccountId ? bankAccountsById[bankAccountId] ?? "(unknown)" : null,
                    configured: isConfigured(code, terminalConfig),
                };
            })
        );
    }, [terminalConfig, bankAccountsById, paymentTypeLabels]);

    return (
        <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">Select Payment Method:</h3>
            <div className="grid grid-cols-3 gap-2">
                {orderPaymentMethods(terminalConfig).map(({ code, label: fallbackLabel, icon: Icon }) => {
                    const label = paymentTypeLabels[code] ?? fallbackLabel;
                    const configured = isConfigured(code, terminalConfig);
                    const active = configured && selected === code;
                    const bankAccountId = getBankAccountId(code, terminalConfig);
                    const bankName = bankAccountId ? bankAccountsById[bankAccountId] : null;
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
                            <span className="w-full truncate text-center px-1">{label}</span>
                            {configured && bankName && (
                                <span className={`text-[10px] font-normal truncate max-w-full ${active ? "text-white/80" : "text-gray-400 dark:text-slate-500"}`}>
                                    {bankName}
                                </span>
                            )}
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
