import { CheckCircle2 } from "lucide-react";

function PaymentButtons({ onCancel, onComplete, submitting }) {
    return (
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-700">
            <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"
            >
                Cancel
            </button>
            <button
                type="button"
                disabled={submitting}
                onClick={onComplete}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-400 shadow-md shadow-green-500/30 hover:from-green-400 hover:to-emerald-300 disabled:opacity-50"
            >
                <CheckCircle2 size={16} />
                {submitting ? "Processing..." : "Complete Payment"}
            </button>
        </div>
    );
}

export default PaymentButtons;
