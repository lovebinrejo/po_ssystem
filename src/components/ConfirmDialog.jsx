import { AlertTriangle } from "lucide-react";

function ConfirmDialog({ open, title, message, confirmLabel = "OK", cancelLabel = "Cancel", variant = "danger", onConfirm, onCancel }) {
    if (!open) return null;

    const confirmClasses = variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700";

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
            <div
                className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl p-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-3">   
                    <div className="shrink-0 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <AlertTriangle size={18} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-sm">{title}</h3>
                        {message && <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{message}</p>}
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-5">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-1.5 rounded-full text-sm font-semibold border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold text-white ${confirmClasses}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmDialog;
