import { useEffect, useState } from "react";
import usePosStore from "../../pos/stores/posStore";
import useCustomerStore from "../../customers/stores/customerStore";
import { TAX_RATE, buildPaymentLines, submitPayment, saveDraftInvoice } from "../services/paymentService";
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
        existingInvoiceId,
        pendingInvoice,
        submitting,
        setSubmitting,
        error,
        setError,
        completedReceipt,
        finalizePayment,
        handleError,
        requireCustomer,
        resetPaymentState,
        showToast,
    } = usePaymentBase();

    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotalExcl = total / (1 + TAX_RATE);
    const tax = total - subtotalExcl;

    const draftInvoice = usePosStore((state) => state.draftInvoice);
    const setDraftInvoice = usePosStore((state) => state.setDraftInvoice);

    const [selectedMethod, setSelectedMethod] = useState("01");
    const [amountTendered, setAmountTendered] = useState(total.toFixed(2));
    const [savingDraft, setSavingDraft] = useState(false);

    // draftInvoice is cleared by the store the moment the cart is edited
    // (add/remove/qty change) — so its mere presence already means "still
    // matches what's saved," and settling can safely reuse it.
    const draftInvoiceId = draftInvoice?.id || null;

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
            requireCustomer();
            // A cart already saved as a Draft has a validated invoice sitting
            // behind it (see saveDraft below) — settle that same invoice
            // instead of creating a second one for the same sale.
            const settleInvoiceId = existingInvoiceId || draftInvoiceId;
            const res = await submitPayment({
                socid,
                // An existing (already-validated) invoice already has its lines —
                // the backend only adds `lines` to invoices still in draft.
                lines: settleInvoiceId ? [] : buildPaymentLines(cart),
                payment_method_code: methodCode,
                payment_amount: amount,
                terminal: terminalNumber,
                place: parseInt(activePlace, 10) || 0,
                ...(settleInvoiceId ? { existing_invoice_id: settleInvoiceId } : {}),
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

    // Saves the current cart as a TRUE Dolibarr draft invoice (statut=0,
    // never validated) via api/pos/draft — mirrors legacy's submitCartAsDraft
    // (takeposnew/ajax/waiter_ajax.php). Stock is not decremented and the ref
    // stays a (PROVxxx) placeholder until the sale is actually paid. The cart
    // is deliberately left as-is (not cleared): the cashier keeps working the
    // same sale, cart items just flip to a "Pending" badge, and settlePayment
    // above reuses this invoice via existing_invoice_id when the cart hasn't
    // been touched since — that path already validates correctly at pay time
    // (api/pos/payment only validates `if ($invoice->statut == STATUS_DRAFT)`).
    const saveDraft = async () => {
        if (cart.length === 0 || pendingInvoice || draftInvoiceId) return;
        // Reference snapshot: posStore's cart mutations always replace the
        // array (never mutate in place), so if this reference differs once
        // the request resolves, the cashier changed the cart mid-request —
        // the invoice we're about to link no longer matches it.
        const cartSnapshot = cart;
        setSavingDraft(true);
        setError("");
        try {
            requireCustomer();
            const res = await saveDraftInvoice({
                socid,
                lines: buildPaymentLines(cart),
                terminal: terminalNumber,
                place: parseInt(activePlace, 10) || 0,
            });

            if (!res.success) throw new Error(res.error || "Failed to save draft");

            if (usePosStore.getState().cart === cartSnapshot) {
                setDraftInvoice({ id: res.invoice_id, ref: res.invoice_ref });
                showToast(`Draft saved successfully — ${res.invoice_ref}`);
            } else {
                showToast(`Draft saved successfully — ${res.invoice_ref} (cart changed meanwhile, re-save to link it)`);
            }
        } catch (err) {
            // handleError only sets `error` state, which nothing outside
            // PaymentModal renders — CartPanel (where this button actually
            // lives) never shows it, so a failure here was previously
            // completely silent to the cashier. A toast is the only feedback
            // mechanism CartPanel already has wired up.
            handleError(err);
            const message = err.response?.data?.error || err.message || "Failed to save draft";
            showToast(message, "error");
        } finally {
            setSavingDraft(false);
        }
    };

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
        pendingInvoice,
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
        saveDraft,
        savingDraft,
        draftInvoice,
    };
}
