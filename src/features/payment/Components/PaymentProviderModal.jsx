import { Globe, X, CreditCard } from "lucide-react";

// Mirrors legacy's showOnlinePaymentPopup() — only LencoPay is ever actually
// enabled there (Revolut/Airtel Money exist in the code but commented out),
// so that's the only provider listed here too. UI only: picking a provider
// just records the choice and continues to the normal Mobile Money confirm
// panel — the real LencoPay gateway/charging integration isn't wired up
// (flagged in MobilePayment.jsx), so this doesn't claim to actually charge
// anything via LencoPay yet.
function PaymentProviderModal({ open, onClose, onSelect }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
                        <Globe size={16} className="text-[#397db9]" />
                        Select Payment Provider
                    </h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-red-500">
                        <X size={18} />
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => onSelect("LencoPay")}
                    className="w-full flex items-center gap-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 px-4 py-3 text-left hover:border-[#397db9] hover:bg-[#397db9]/5 transition-colors"
                >
                    <CreditCard size={20} className="text-[#397db9]" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">LencoPay</span>
                </button>
            </div>
        </div>
    );
}

export default PaymentProviderModal;
