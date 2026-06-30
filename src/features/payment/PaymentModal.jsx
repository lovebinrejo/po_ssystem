import { useState } from "react";
import { CreditCard, X } from "lucide-react";
import { usePayment } from "./hooks/usePayment";
import { useSplitPayment } from "./hooks/useSplitPayment";
import PaymentSummary from "./Components/PaymentSummary";
import ScanToPay from "./Components/ScanToPay";
import PaymentMethods from "./Components/PaymentMethods";
import CashPayment from "./Components/CashPayment";
import CardPayment from "./Components/CardPayment";
import MobilePayment from "./Components/MobilePayment";
import SplitPayment from "./Components/SplitPayment";
import PaymentButtons from "./Components/PaymentButtons";
import ReceiptOptions from "./Components/ReceiptOptions";
import PaymentProviderModal from "./Components/PaymentProviderModal";
import PaymentProcessingOverlay from "./Components/PaymentProcessingOverlay";

// Overlays the live /pos screen with a dimmed backdrop, mirroring legacy's
// actual payment modal (a real overlay on top of the POS screen, not a
// separate page) — same bg-black/60 dim treatment as the original
// PaymentModal this replaced.
function PaymentModal({ open, onClose }) {
    const [mode, setMode] = useState("01");
    const [providerModalOpen, setProviderModalOpen] = useState(false);
    const [provider, setProvider] = useState("");
    const isSplit = mode === "split";

    // Mobile Money (06) behaves like every other method on click — selects
    // immediately, panel switches right away — so there's no dead-feeling
    // gap if the cashier misses or dismisses the provider popup. The popup
    // (mirroring legacy's showOnlinePaymentPopup()) opens on top as a
    // supplementary step, not a blocking gate before anything shows.
    const handleSelectMethod = (code) => {
        setMode(code);
        if (code === "06") setProviderModalOpen(true);
    };

    const handleSelectProvider = (name) => {
        setProvider(name);
        setProviderModalOpen(false);
        setMode("06");
    };

    // Both hooks are called unconditionally (Rules of Hooks) — only one's
    // result is actually displayed/submitted, based on `mode`. Both read the
    // same cart from posStore, so there's no state duplication risk.
    const payment = usePayment();
    const split = useSplitPayment();

    if (!open) return null;

    const activeReceipt = isSplit ? split.completedReceipt : payment.completedReceipt;
    const activeSubmitting = isSplit ? split.submitting : payment.submitting;
    const activeError = isSplit ? split.error : payment.error;

    const handleComplete = () => (isSplit ? split.submitSplit() : payment.completePayment());
    const handleNewSale = () => {
        setMode("01");
        setProvider("");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto soft-scrollbar rounded-2xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl">
                <div className="flex items-center justify-between px-6 py-2.5 bg-[#2c6291] rounded-t-2xl text-white">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                        <CreditCard size={20} />
                        Complete Payment
                    </div>
                    {!activeSubmitting && (
                        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/20">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {activeReceipt ? (
                    <ReceiptOptions receipt={activeReceipt} onNewSale={handleNewSale} />
                ) : (
                    <>
                        <div className="grid sm:grid-cols-2 gap-6 px-6 py-5">
                            <div>
                                <PaymentMethods selected={mode} onSelect={handleSelectMethod} />
                                {mode === "01" && (
                                    <CashPayment
                                        total={payment.total}
                                        amountTendered={payment.amountTendered}
                                        setAmountTendered={payment.setAmountTendered}
                                    />
                                )}
                                {mode === "06" && <MobilePayment total={payment.total} provider={provider} />}
                                {!isSplit && mode !== "01" && mode !== "06" && (
                                    <CardPayment method={mode} total={payment.total} />
                                )}
                                {isSplit && (
                                    <SplitPayment
                                        total={split.total}
                                        lines={split.lines}
                                        addLine={split.addLine}
                                        removeLine={split.removeLine}
                                        updateLine={split.updateLine}
                                        remaining={split.remaining}
                                    />
                                )}
                            </div>

                            <div className="space-y-6">
                                <ScanToPay />
                                <PaymentSummary
                                    itemCount={payment.itemCount}
                                    subtotalExcl={payment.subtotalExcl}
                                    tax={payment.tax}
                                    total={payment.total}
                                />
                            </div>
                        </div>

                        {activeError && (
                            <p className="mx-6 mb-3 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
                                {activeError}
                            </p>
                        )}

                        <PaymentButtons onCancel={onClose} onComplete={handleComplete} submitting={activeSubmitting} />
                    </>
                )}

                <PaymentProviderModal
                    open={providerModalOpen}
                    onClose={() => setProviderModalOpen(false)}
                    onSelect={handleSelectProvider}
                />
                {activeSubmitting && <PaymentProcessingOverlay />}
            </div>
        </div>
    );
}

export default PaymentModal;
