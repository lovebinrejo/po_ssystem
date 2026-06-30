// Mirrors legacy's showLoader('Processing payment... Please wait') —
// IntegratedPaymentHandler.processPayment() blocks the whole screen with
// this while the submitPayment()/createInvoiceWithPayment call is in flight.
function PaymentProcessingOverlay() {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
            <div className="bg-white dark:bg-slate-900 rounded-xl px-10 py-8 text-center shadow-2xl">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full border-4 border-gray-200 dark:border-slate-700 border-t-indigo-500 animate-spin" />
                <p className="text-base font-medium text-gray-900 dark:text-white">Processing payment... Please wait</p>
            </div>
        </div>
    );
}

export default PaymentProcessingOverlay;
