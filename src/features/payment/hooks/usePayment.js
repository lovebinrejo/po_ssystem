import { useEffect, useState } from "react";
import usePosStore from "../../pos/stores/posStore";
import useCustomerStore from "../../customers/stores/customerStore";
import { TAX_RATE, buildPaymentLines, submitPayment } from "../services/paymentService";
import { openLencoWidget } from "../services/lencoService";
import { usePaymentBase } from "./usePaymentBase";

// Orchestrates the single-payment-method flow (everything except Split
// Payment, which has its own hook for the sequential multi-call settlement).
export function usePayment() {
    const hasHydrated = usePosStore((state) => state.hasHydrated);
    const selectedCustomer = useCustomerStore((state) => state.selectedCustomer);
    const {
        cart,
        activePlace,
        terminalNumber,
        socid,
        total,
        submitting,
        setSubmitting,
        error,
        setError,
        completedReceipt,
        finalizePayment,
        handleError,
        resetPaymentState,
        showToast,
    } = usePaymentBase();

    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotalExcl = total / (1 + TAX_RATE);
    const tax = total - subtotalExcl;

    const [selectedMethod, setSelectedMethod] = useState("01");
    const [amountTendered, setAmountTendered] = useState(total.toFixed(2));

    // Keep the tendered amount defaulted to the live total while the cart can
    // still change (mirrors legacy's openPaymentModal() re-seeding amount on
    // open) — stops once a payment has gone through so the receipt screen's
    // numbers don't shift under the cashier.
    useEffect(() => {
        if (!completedReceipt) setAmountTendered(total.toFixed(2));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [total]);

    const settlePayment = async (methodCode, amount) => {
        setSubmitting(true);
        setError("");
        try {
            const res = await submitPayment({
                socid,
                lines: buildPaymentLines(cart),
                payment_method_code: methodCode,
                payment_amount: amount,
                terminal: terminalNumber,
                place: parseInt(activePlace, 10) || 0,
            });

            if (!res.success) throw new Error(res.error || "Payment failed");

            await finalizePayment(res.invoice_id, res.invoice_ref);
        } catch (err) {
            handleError(err);
        } finally {
            setSubmitting(false);
        }
    };

    const completePayment = () => settlePayment(selectedMethod, parseFloat(amountTendered) || 0);

    // Called when the modal is dismissed after a completed sale, so the next
    // "Proceed to Payment" starts clean instead of re-showing this receipt.
    const resetForNewSale = () => {
        resetPaymentState();
        setSelectedMethod("01");
        setAmountTendered(total.toFixed(2));
    };

    // Mirrors legacy's openLencoPayWidget(): opens the LencoPay hosted widget
    // (public key, client-side only) and, once the cashier actually pays,
    // settles the sale through the exact same api/pos/payment call every
    // other method uses — Lenco only replaces the "collect the money" step.
    const payViaLenco = async () => {
        setError("");
        const amount = parseFloat(amountTendered) || 0;
        if (amount <= 0) {
            setError("Enter a valid payment amount.");
            return;
        }

        const nameParts = (selectedCustomer?.name || "Customer").trim().split(" ");

        try {
            await openLencoWidget({
                amount,
                currency: "ZMW",
                email: selectedCustomer?.email || "customer@pos.local",
                phone: selectedCustomer?.phone || "",
                firstName: nameParts[0] || "Customer",
                lastName: nameParts.slice(1).join(" "),
                reference: `pos-${terminalNumber}-${Date.now()}`,
                onSuccess: () => settlePayment("06", amount),
                onClose: () => showToast("Payment was cancelled"),
            });
        } catch (err) {
            setError(err.message || "Unable to open LencoPay");
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
        payViaLenco,
        resetForNewSale,
    };
}
