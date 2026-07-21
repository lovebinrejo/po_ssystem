import { useState } from "react";
import useAuthStore from "../../authentication/stores/authStore";
import usePosStore from "../../pos/stores/posStore";
import useTableStore from "../../tables/stores/tableStore";
import { fetchReceipt } from "../../reports/services/receiptApi";
import { cacheOrderMeta } from "../../../services/posCache";


export function usePaymentBase() {
    const cart = usePosStore((state) => state.cart);
  
    const activePlace = usePosStore((state) => state.activePlace);
    const orderType = useTableStore((state) => state.orderType);
    const selectedTable = useTableStore((state) => state.selectedTable);
   
    const tablePlace = orderType === "table" && selectedTable ? selectedTable.id : 0;
    const clearCart = usePosStore((state) => state.clearCart);
    const showToast = usePosStore((state) => state.showToast);
    const pendingInvoice = usePosStore((state) => state.pendingInvoice);
    const terminalConfig = useAuthStore((state) => state.terminalConfig);
    const terminalNumber = terminalConfig?.terminalNumber || 1;
    const selectedCustomer = usePosStore((state) => state.selectedCustomer);

    const socid = selectedCustomer?.id;

  
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const total = pendingInvoice ? pendingInvoice.remainToPay : cartTotal;
    const existingInvoiceId = pendingInvoice?.id || null;

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [completedReceipt, setCompletedReceipt] = useState(null);

    const finalizePayment = async (invoiceId, invoiceRef) => {
      
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


    const isUnrecoverableBackendError = (message) => /unknown column|doesn't exist|no such table/i.test(message || "");

    const handleError = (err) => {
        const message = err.response?.data?.error || err.message || "Payment failed";
        setError(message);
     
        setTimeout(() => setError(""), 2500);
        if (isUnrecoverableBackendError(message)) {
            showToast(message, "error");
            usePosStore.getState().setCheckoutBlocked(message);
        }
    };


    const requireCustomer = () => {
        if (!socid) throw new Error("No customer selected");
    };


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
