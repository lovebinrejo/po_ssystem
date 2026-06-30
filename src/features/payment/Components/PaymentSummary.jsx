function PaymentSummary({ itemCount, subtotalExcl, tax, total }) {
    return (
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-2 text-sm">
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
    );
}

export default PaymentSummary;
