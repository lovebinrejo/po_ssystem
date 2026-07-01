// Shared card shell (header + bordered "Total Amount" row) used by every
// payment-method panel — CardPayment, CashPayment, MobilePayment and
// SplitPayment only differ in what they render below the total.
function PaymentDetailsPanel({
    title = "Payment Details:",
    titleClassName = "text-sm font-medium text-gray-700 dark:text-slate-200 mt-5 mb-2",
    contentClassName = "space-y-3",
    total,
    children,
}) {
    return (
        <div>
            <h3 className={titleClassName}>{title}</h3>
            <div className={`rounded-lg border border-gray-200 dark:border-slate-700 p-3 ${contentClassName}`}>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-slate-400">Total Amount:</span>
                    <span className="font-semibold">ZMW {total.toFixed(2)}</span>
                </div>
                {children}
            </div>
        </div>
    );
}

export default PaymentDetailsPanel;
