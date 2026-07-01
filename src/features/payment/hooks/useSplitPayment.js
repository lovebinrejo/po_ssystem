import { useState } from "react";
import { buildPaymentLines, submitPayment } from "../services/paymentService";
import { usePaymentBase } from "./usePaymentBase";

let nextLineId = 1;
const newLine = (amount = "") => ({ id: nextLineId++, method: "01", amount });

// Settles one sale across multiple payment methods by calling api/pos/payment
// sequentially — the endpoint only accepts one method/amount per call, but it
// does support adding another payment to an already-created invoice via
// existing_invoice_id, which is what lets this work with zero backend changes:
//   1st line: no existing_invoice_id  -> creates the invoice + records payment 1
//   2nd..nth line: existing_invoice_id -> adds payment N to that same invoice
export function useSplitPayment() {
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
    } = usePaymentBase();

    const [lines, setLines] = useState(() => [newLine(), newLine()]);

    const linesTotal = lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
    const remaining = total - linesTotal;

    const addLine = () => setLines((prev) => [...prev, newLine()]);
    const removeLine = (id) => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
    const updateLine = (id, updates) =>
        setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));

    const submitSplit = async () => {
        if (Math.abs(remaining) > 0.01) {
            setError("Split amounts must add up to the total before completing payment.");
            return;
        }

        setSubmitting(true);
        setError("");
        const baseLines = buildPaymentLines(cart);
        let invoiceId = null;
        let invoiceRef = "";

        try {
            for (const line of lines) {
                const amount = parseFloat(line.amount) || 0;
                if (amount <= 0) continue;

                const res = await submitPayment({
                    socid,
                    // Only the first call needs the cart lines — once the invoice
                    // exists, subsequent calls just add a payment to it.
                    lines: invoiceId ? [] : baseLines,
                    payment_method_code: line.method,
                    payment_amount: amount,
                    terminal: terminalNumber,
                    place: parseInt(activePlace, 10) || 0,
                    ...(invoiceId ? { existing_invoice_id: invoiceId } : {}),
                });

                if (!res.success) throw new Error(res.error || "Payment failed");
                invoiceId = res.invoice_id;
                invoiceRef = res.invoice_ref;
            }

            if (!invoiceId) throw new Error("Enter at least one payment amount.");

            await finalizePayment(invoiceId, invoiceRef);
        } catch (err) {
            handleError(err);
        } finally {
            setSubmitting(false);
        }
    };

    return {
        total,
        lines,
        addLine,
        removeLine,
        updateLine,
        remaining,
        submitting,
        error,
        completedReceipt,
        submitSplit,
    };
}
