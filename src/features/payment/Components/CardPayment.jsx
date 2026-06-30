import { CheckCircle2 } from "lucide-react";
import { PAYMENT_METHODS } from "./PaymentMethods";

// Covers Credit, Cash/Credit, Bank cheque, Debit card, Other, and Bank
// transfer. Legacy has no card-entry UI for any of these methods — clicking
// one and completing payment just records the method label against the
// invoice, on the assumption the cashier already took payment through a
// separate physical card machine/cheque/etc. This panel mirrors that
// directly: confirm the amount, no fake card-number fields.
function CardPayment({ method, total }) {
    const label = PAYMENT_METHODS.find((m) => m.code === method)?.label || "this method";

    return (
        <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300 mt-5 mb-2">Payment Details:</h3>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-slate-400">Total Amount:</span>
                    <span className="font-semibold">ZMW {total.toFixed(2)}</span>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs px-3 py-2.5">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                    <span>
                        Take payment via {label.toLowerCase()} on your card terminal/device, then confirm below to
                        record it against this invoice.
                    </span>
                </div>
            </div>
        </div>
    );
}

export default CardPayment;
