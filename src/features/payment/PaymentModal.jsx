import { useState } from "react";
import { CheckCircle2, CreditCard, X } from "lucide-react";
import { usePayment } from "./hooks/usePayment";
import PaymentSummary from "./Components/PaymentSummary";
import ScanToPay from "./Components/ScanToPay";
import PaymentMethods from "./Components/PaymentMethods";
import CashPayment from "./Components/CashPayment";
import CardPayment from "./Components/CardPayment";
import MobilePayment from "./Components/MobilePayment";
import PaymentButtons from "./Components/PaymentButtons";
import ReceiptOptions from "./Components/ReceiptOptions";
import PaymentProviderModal from "./Components/PaymentProviderModal";
import PaymentProcessingOverlay from "./Components/PaymentProcessingOverlay";

function PaymentModal({ open, onClose }) {
    const [providerModalOpen, setProviderModalOpen] = useState(false);
    const [provider, setProvider] = useState("");

    const payment = usePayment();
    const mode = payment.selectedMethod;
    const isLenco = mode === "06" && provider === "LencoPay";

    const handleSelectMethod = (code) => {
        payment.setSelectedMethod(code);
        if (code === "06") setProviderModalOpen(true);
    };

    const handleSelectProvider = (name) => {
        setProvider(name);
        setProviderModalOpen(false);
        payment.setSelectedMethod("06");
    };

    if (!open) return null;

    // If a sale just completed, dismissing the modal (Cancel/X/New Sale)
    // should clear that outcome — the modal stays mounted between opens, so
    // without this the next sale would reopen straight to this old receipt.
    const handleClose = () => {
        if (payment.completedReceipt) {
            payment.resetForNewSale();
            setProvider("");
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto soft-scrollbar rounded-2xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl">
                <div
                    className={`flex items-center justify-between px-6 py-2.5 rounded-t-2xl ${
                        payment.completedReceipt
                            ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700"
                            : "bg-[#2c6291] text-white"
                    }`}
                >
                    <div className="flex items-center gap-2 text-lg font-semibold">
                        {payment.completedReceipt ? (
                            <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <CreditCard size={20} />
                        )}
                        {payment.completedReceipt
                            ? "Payment Successful - Receipt"
                            : payment.pendingInvoice
                            ? `Settle Invoice ${payment.pendingInvoice.ref}`
                            : "Complete Payment"}
                    </div>
                    {!payment.submitting && (
                        <button
                            type="button"
                            onClick={handleClose}
                            className={`p-1 rounded ${payment.completedReceipt ? "text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800" : "hover:bg-white/20"}`}
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {payment.completedReceipt ? (
                    // Close and New Transaction both reset+close here (unlike legacy's
                    // separate buttons) — this modal stays mounted across opens, so any
                    // dismissal that doesn't reset completedReceipt would show this same
                    // stale receipt again next time (see handleClose above).
                    <ReceiptOptions receipt={payment.completedReceipt} onClose={handleClose} onNewSale={handleClose} />
                ) : (
                    <>
                        <div className="grid sm:grid-cols-[7fr_5fr] gap-6 px-6 py-5">
                            <div>
                                <PaymentMethods selected={mode} onSelect={handleSelectMethod} />
                                {mode === "01" && (
                                    <CashPayment
                                        total={payment.total}
                                        amountTendered={payment.amountTendered}
                                        setAmountTendered={payment.setAmountTendered}
                                    />
                                )}
                                {mode === "06" && (
                                    <MobilePayment
                                        total={payment.total}
                                        amountTendered={payment.amountTendered}
                                        setAmountTendered={payment.setAmountTendered}
                                    />
                                )}
                                {mode !== "01" && mode !== "06" && (
                                    <CardPayment
                                        total={payment.total}
                                        amountTendered={payment.amountTendered}
                                        setAmountTendered={payment.setAmountTendered}
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

                        {payment.error && (
                            <p className="mx-6 mb-3 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
                                {payment.error}
                            </p>
                        )}

                        <PaymentButtons
                            onCancel={handleClose}
                            onComplete={isLenco ? payment.payViaLenco : payment.completePayment}
                            submitting={payment.submitting}
                        />
                    </>
                )}

                <PaymentProviderModal
                    open={providerModalOpen}
                    onClose={() => setProviderModalOpen(false)}
                    onSelect={handleSelectProvider}
                />
                {payment.submitting && <PaymentProcessingOverlay />}
            </div>
        </div>
    );
}

export default PaymentModal;
