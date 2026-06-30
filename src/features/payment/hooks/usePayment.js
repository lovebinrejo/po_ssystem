import { useEffect, useState } from "react";
import useAuthStore from "../../authentication/stores/authStore";
import usePosStore from "../../pos/stores/posStore";
import { fetchReceipt } from "../../reports/services/receiptApi";
import { TAX_RATE, buildPaymentLines, submitPayment } from "../services/paymentService";

// Orchestrates the single-payment-method flow (everything except Split
// Payment, which has its own hook for the sequential multi-call settlement).
export function usePayment() {
    const cart = usePosStore((state) => state.cart);
    const hasHydrated = usePosStore((state) => state.hasHydrated);
    const activePlace = usePosStore((state) => state.activePlace);
    const clearCart = usePosStore((state) => state.clearCart);
    const showToast = usePosStore((state) => state.showToast);
    const terminalConfig = useAuthStore((state) => state.terminalConfig);
    const terminalNumber = terminalConfig?.terminalNumber || 1;

    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const subtotalExcl = total / (1 + TAX_RATE);
    const tax = total - subtotalExcl;

    const [selectedMethod, setSelectedMethod] = useState("01");
    const [amountTendered, setAmountTendered] = useState(total.toFixed(2));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [completedReceipt, setCompletedReceipt] = useState(null);

    // Keep the tendered amount defaulted to the live total while the cart can
    // still change (mirrors legacy's openPaymentModal() re-seeding amount on
    // open) — stops once a payment has gone through so the receipt screen's
    // numbers don't shift under the cashier.
    useEffect(() => {
        if (!completedReceipt) setAmountTendered(total.toFixed(2));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [total]);

    const completePayment = async () => {
        setSubmitting(true);
        setError("");
        try {
            const res = await submitPayment({
                socid: terminalConfig?.defaultCustomerId,
                lines: buildPaymentLines(cart),
                payment_method_code: selectedMethod,
                payment_amount: parseFloat(amountTendered) || 0,
                terminal: terminalNumber,
                place: parseInt(activePlace, 10) || 0,
            });

            if (!res.success) throw new Error(res.error || "Payment failed");

            clearCart();
            showToast(`Payment successful — Invoice ${res.invoice_ref}`);

            const receipt = await fetchReceipt(res.invoice_id).catch(() => null);
            setCompletedReceipt(receipt || { invoice_id: res.invoice_id, invoice_ref: res.invoice_ref });
        } catch (err) {
            setError(err.response?.data?.error || err.message || "Payment failed");
        } finally {
            setSubmitting(false);
        }
    };

    return {
        cart,
        hasHydrated,
        itemCount,
        subtotalExcl,
        tax,
        total,
        selectedMethod,
        setSelectedMethod,
        amountTendered,
        setAmountTendered,
        submitting,
        error,
        completedReceipt,
        completePayment,
    };
}
