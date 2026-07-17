import { useState } from "react";
import useAuthStore from "../../authentication/stores/authStore";
import usePosStore from "../../pos/stores/posStore";
import useTableStore from "../../tables/stores/tableStore";
import { fetchReceipt } from "../../reports/services/receiptApi";
import { cacheOrderMeta } from "../../../services/posCache";

// Cart/terminal wiring and submit-outcome handling shared by the
// single-method flow (usePayment) and the multi-line flow (useSplitPayment).
export function usePaymentBase() {
    const cart = usePosStore((state) => state.cart);
    // Not the same `place` the backend means — activePlace is this app's
    // parallel-sale slot index (see posStore.jsx's own comment: "0", "1",
    // "2"... for concurrent carts), a pure frontend concept unrelated to any
    // physical table. api/pos/payment/index.php and api/pos/draft/index.php
    // both read their own `place` param straight into $invoice->floorid —
    // confirmed live 2026-07-17 that this already works correctly server-side,
    // it's just never been sent — see tablePlace below for the actual value
    // that belongs there.
    const activePlace = usePosStore((state) => state.activePlace);
    const orderType = useTableStore((state) => state.orderType);
    const selectedTable = useTableStore((state) => state.selectedTable);
    // The real physical-table id, only when dine-in with a table actually
    // picked — 0 otherwise (pickup, or "On Table" selected but no specific
    // table yet), matching legacy's own "place=0 or no place = pickup mode"
    // convention (pos-table-selector.js). This is what makes a table
    // actually show as occupied in tables.php?action=list afterward, and
    // what TableSelectorModal's resume-existing-order flow depends on.
    const tablePlace = orderType === "table" && selectedTable ? selectedTable.id : 0;
    const clearCart = usePosStore((state) => state.clearCart);
    const showToast = usePosStore((state) => state.showToast);
    const pendingInvoice = usePosStore((state) => state.pendingInvoice);
    const terminalConfig = useAuthStore((state) => state.terminalConfig);
    const terminalNumber = terminalConfig?.terminalNumber || 1;
    const selectedCustomer = usePosStore((state) => state.selectedCustomer);
    // Deliberately no fallback to terminalConfig.defaultCustomerId here —
    // by explicit request, a customer must always be picked for this cart,
    // even on terminals with a configured default. This is stricter than
    // legacy's own createInvoiceWithPayment, which does fall back silently.
    const socid = selectedCustomer?.id;

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
        // Legacy's receipt.php reads Order Type/Table off the saved invoice
        // itself (fk_transport_mode/place), because it persists there
        // server-side. This app's api/pos/payment payload never sends either
        // value, so there's nothing to read back from a fetched invoice —
        // captured here instead, straight from tableStore, right at the
        // moment this specific sale completes. Also written to posCache's
        // small local order-meta record (see cacheOrderMeta) so a later
        // reprint from Reports in this same browser can still show them —
        // fetchReceipt reads it back automatically. Real limitation: an
        // invoice from another terminal/browser, or paid before this
        // existed, still has no such record and won't show these fields.
        const { orderType, selectedTable } = useTableStore.getState();
        const orderMeta = { order_type: orderType, table_label: selectedTable?.label || null };
        cacheOrderMeta(invoiceId, orderMeta);
        clearCart();
        showToast(`Payment successful — Invoice ${invoiceRef}`);
        const receipt = await fetchReceipt(invoiceId).catch(() => null);
        setCompletedReceipt({
            ...(receipt || { invoice_id: invoiceId, invoice_ref: invoiceRef }),
            ...orderMeta,
        });
    };

    const handleError = (err) => {
        setError(err.response?.data?.error || err.message || "Payment failed");
    };

    // Mirrors legacy's processPayment() guard (pos-payment-integrated.js),
    // but stricter: throws right before submission whenever no customer is
    // selected, full stop — there's no default-customer fallback to check
    // against (see `socid` above). Legacy surfaces this as a toast; callers
    // here let handleError's catch do the same via the `error` state.
    const requireCustomer = () => {
        if (!socid) throw new Error("No customer selected");
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
        tablePlace,
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
        requireCustomer,
        resetPaymentState,
        showToast,
    };
}
