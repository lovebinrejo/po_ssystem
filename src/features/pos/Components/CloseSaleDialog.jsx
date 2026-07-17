import { useState } from "react";
import { X, XCircle, Trash2, AlertTriangle } from "lucide-react";
import { deleteLegacyDraftInvoice } from "../../payment/services/draftManageApi";

// Mirrors legacy's closeDraft() confirm (takeposnew/index.php) — same two
// choices, same "cannot be undone" framing — but fixes the bug that
// prompted porting this over: legacy computes its item count from
// parallelSales[].cart, a local snapshot that can drift stale (confirmed
// live: a pending invoice loaded via the Reports modal showed "This draft
// has 0 item(s)" despite having real lines). This app already tracks the
// same place's cart in cartsByPlace and passes the real, live item count in
// directly — nothing here reads a second, possibly-stale source of truth.
//
// "Delete Permanently" only ever shows for a draftInvoice (this app's own
// concept — see posStore's draftInvoicesByPlace), never for a pendingInvoice
// (an already-validated sale loaded from Reports for settlement): deleting a
// real, already-validated invoice isn't a legitimate action, so that choice
// simply isn't offered for that case, same as legacy's own
// "Cannot delete: Not a draft invoice" guard — just not offering the button
// at all instead of letting the click round-trip to fail.
function CloseSaleDialog({ sale, itemCount, pendingInvoice, draftInvoice, onCancel, onClosed, showToast }) {
    const [deleting, setDeleting] = useState(false);

    if (!sale) return null;

    const ref = pendingInvoice?.ref || draftInvoice?.ref || null;

    const handleRemoveOnly = () => {
        onClosed(sale.place);
        showToast(ref ? `${ref} hidden from this session.` : "Sale removed from this session.", "info");
    };

    const handleDeletePermanently = async () => {
        if (!draftInvoice) return;
        setDeleting(true);
        try {
            await deleteLegacyDraftInvoice(draftInvoice.id);
            onClosed(sale.place);
            showToast(`${draftInvoice.ref} deleted permanently.`, "success");
        } catch (err) {
            showToast(err.message || "Failed to delete draft invoice", "error");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
            <div
                className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-2.5 bg-[#2c6291] text-white">
                    <h3 className="font-semibold">Confirm</h3>
                    <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-white/20">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-3">
                    {ref && <div className="font-bold">{ref}</div>}
                    <div className="text-sm text-gray-600 dark:text-slate-300">
                        This sale has {itemCount} item{itemCount === 1 ? "" : "s"}.
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-300">What would you like to do?</div>

                    <button
                        type="button"
                        onClick={handleRemoveOnly}
                        disabled={deleting}
                        className="w-full flex flex-col items-center gap-0.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 px-4 py-2.5 disabled:opacity-60"
                    >
                        <span className="flex items-center gap-1.5 font-semibold text-sm">
                            <XCircle size={15} />
                            Remove from Parallel Sales
                        </span>
                        <span className="text-xs opacity-80">Hides this sale from your current session</span>
                    </button>

                    {draftInvoice && (
                        <button
                            type="button"
                            onClick={handleDeletePermanently}
                            disabled={deleting}
                            className="w-full flex flex-col items-center gap-0.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 disabled:opacity-60"
                        >
                            <span className="flex items-center gap-1.5 font-semibold text-sm">
                                <Trash2 size={15} />
                                {deleting ? "Deleting..." : "Delete Permanently from Database"}
                            </span>
                            <span className="text-xs opacity-90 flex items-center gap-1">
                                <AlertTriangle size={11} /> This cannot be undone!
                            </span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={deleting}
                        className="w-full rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CloseSaleDialog;
