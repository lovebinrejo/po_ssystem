import { useState } from "react";
import useAuthStore from "../../authentication/stores/authStore";
import usePosStore from "../../pos/stores/posStore";
import useCustomerStore from "../../customers/stores/customerStore";
import { fetchReceipt } from "../../reports/services/receiptApi";

// Cart/terminal wiring and submit-outcome handling shared by the
// single-method flow (usePayment) and the multi-line flow (useSplitPayment).
export function usePaymentBase() {
    const cart = usePosStore((state) => state.cart);
    const activePlace = usePosStore((state) => state.activePlace);
    const clearCart = usePosStore((state) => state.clearCart);
    const showToast = usePosStore((state) => state.showToast);
    const pendingInvoice = usePosStore((state) => state.pendingInvoice);
    const terminalConfig = useAuthStore((state) => state.terminalConfig);
    const terminalNumber = terminalConfig?.terminalNumber || 1;
    const selectedCustomer = useCustomerStore((state) => state.selectedCustomer);
    // Mirrors legacy's createInvoiceWithPayment: the customer picked in the
    // cart drives the invoice's socid, falling back to the terminal's
    // configured default customer if none was explicitly selected.
    const socid = selectedCustomer?.id || terminalConfig?.defaultCustomerId;

    // Settling a Reports invoice (pendingInvoice set): the amount actually due
    // is what's left to pay on that invoice, not the cart's line total — some
    // of it may already be paid. A fresh sale has no pendingInvoice, so total
    // is just the cart sum as before.
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const total = pendingInvoice ? pendingInvoice.remainToPay : cartTotal;
    const existingInvoiceId = pendingInvoice?.id || null;

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [completedReceipt, setCompletedReceipt] = useState(null);

    const finalizePayment = async (invoiceId, invoiceRef) => {
        clearCart();
        showToast(`Payment successful — Invoice ${invoiceRef}`);
        const receipt = await fetchReceipt(invoiceId).catch(() => null);
        setCompletedReceipt(receipt || { invoice_id: invoiceId, invoice_ref: invoiceRef });
    };

    const handleError = (err) => {
        setError(err.response?.data?.error || err.message || "Payment failed");
    };

    // Clears the previous sale's outcome — PaymentModal stays mounted across
    // opens (only its `open` prop toggles), so without this the next sale
    // would keep showing the last completed receipt instead of a fresh form.
    const resetPaymentState = () => {
        setError("");
        setCompletedReceipt(null);
    };

    return {
        cart,
        activePlace,
        terminalConfig,
        terminalNumber,
        socid,
        total,
        pendingInvoice,
        existingInvoiceId,
        submitting,
        setSubmitting,
        error,
        setError,
        completedReceipt,
        finalizePayment,
        handleError,
        resetPaymentState,
        showToast,
    };
}
