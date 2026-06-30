import { QrCode } from "lucide-react";

// Legacy shows this static "Scan to Pay" placeholder in the right column at
// all times, regardless of which payment method is selected on the left —
// not conditional on Mobile Money specifically.
function ScanToPay() {
    return (
        <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300 mb-3">Scan to Pay:</h3>
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 h-40 text-gray-400 dark:text-slate-500">
                <QrCode size={28} className="opacity-50" />
                <p className="text-xs text-center px-4">Scan QR code to complete payment</p>
            </div>
        </div>
    );
}

export default ScanToPay;
