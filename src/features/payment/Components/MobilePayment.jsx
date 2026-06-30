import { QrCode, CheckCircle2 } from "lucide-react";

// Code "06" Mobile Money. Legacy routes this method to a real gateway
// (LencoPay's hosted widget, selected via PaymentProviderModal) — that
// integration isn't wired up here, so this just mirrors legacy's "Scan to
// Pay" placeholder and otherwise behaves like any other non-cash method:
// confirm the amount, record it.
function MobilePayment({ total, provider }) {
    return (
        <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300 mt-5 mb-2">Payment Details:</h3>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-slate-400">Total Amount:</span>
                    <span className="font-semibold">ZMW {total.toFixed(2)}</span>
                </div>
                {provider && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={14} />
                        Provider: {provider}
                    </div>
                )}
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 h-28 text-gray-400 dark:text-slate-500">
                    <QrCode size={28} className="opacity-50" />
                    <p className="text-xs text-center px-4">Scan QR code to complete mobile money payment</p>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                    Confirm once the customer's mobile money payment has gone through.
                </p>
            </div>
        </div>
    );
}

export default MobilePayment;
