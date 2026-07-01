function PaymentSummary({ itemCount, subtotalExcl, tax, total }) {
    return (
        <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">Order Summary:</h3>
            <div className="rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-slate-400">
                    <span>Items:</span>
                    <span>{itemCount}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <span>ZMW {subtotalExcl.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-slate-400">
                    <span>Tax (VAT):</span>
                    <span>ZMW {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 mt-1 border-t border-gray-200 dark:border-slate-700">
                    <span>Total:</span>
                    <span>ZMW {total.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}

export default PaymentSummary;
