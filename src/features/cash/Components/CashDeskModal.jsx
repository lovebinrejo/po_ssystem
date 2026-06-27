import { useEffect, useState } from "react";
import { Landmark, X } from "lucide-react";
import useAuthStore from "../../authentication/stores/authStore";
import { getActiveSession, getTheoreticalAmount, openSession, closeSession } from "../services/cashApi";

const toPeriod = (dateCreation) => {
    if (!dateCreation) return "";
    return String(dateCreation).slice(0, 10);
};

const toCreationDateTime = (dateCreation) => {
    if (!dateCreation) return "";
    const normalized = String(dateCreation).includes("T") ? dateCreation : String(dateCreation).replace(" ", "T");
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? dateCreation : date.toLocaleString();
};

function CashDeskModal({ open, onClose }) {
    const terminalNumber = useAuthStore((state) => state.terminalConfig?.terminalNumber) || 1;

    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);
    const [summary, setSummary] = useState(null);
    const [openingAmount, setOpeningAmount] = useState("0.00");
    const [closingCash, setClosingCash] = useState("0.00");
    const [closingCheque, setClosingCheque] = useState("0.00");
    const [closingCard, setClosingCard] = useState("0.00");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setError("");
        setLoading(true);

        getActiveSession(terminalNumber)
            .then((res) => {
                if (!res.success) throw new Error(res.error || "Failed to load cash session");
                if (res.session) {
                    // summary now comes back inline with the session in one round-trip
                    // instead of a second getSummary request (was adding ~1s to open the modal).
                    setSession(res.session);
                    setSummary(res.summary);
                    setClosingCash(res.summary.expected_amount.toFixed(2));
                    setClosingCheque(res.summary.cheque_sales.toFixed(2));
                    setClosingCard(res.summary.card_sales.toFixed(2));
                    return undefined;
                }
                setSession(null);
                return getTheoreticalAmount(terminalNumber).then((theoRes) => {
                    if (theoRes.success) setOpeningAmount(theoRes.theoretical_amount.toFixed(2));
                });
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [open, terminalNumber]);

    if (!open) return null;

    const handleOpenSession = async () => {
        setSubmitting(true);
        setError("");
        try {
            const res = await openSession(terminalNumber, parseFloat(openingAmount) || 0);
            if (!res.success) throw new Error(res.error || "Failed to open cash session");
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseSession = async () => {
        setSubmitting(true);
        setError("");
        try {
            const res = await closeSession(session.id, terminalNumber, {
                closingCash: parseFloat(closingCash) || 0,
                closingCheque: parseFloat(closingCheque) || 0,
                closingCard: parseFloat(closingCard) || 0,
            });
            if (!res.success) throw new Error(res.error || "Failed to close cash session");
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto soft-scrollbar rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 bg-blue-600 dark:bg-blue-700 rounded-t-xl text-white">
                    <div className="flex items-center gap-2 text-base font-semibold uppercase tracking-wide">
                        <Landmark size={18} />
                        {session ? "POS Cash Desk Control" : "POS Cash Desk Control - New"}
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/20">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
                    )}

                    {loading ? (
                        <p className="text-sm text-gray-500 dark:text-slate-400">Loading cash session...</p>
                    ) : session ? (
                        <>
                            <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="font-semibold">Ref.: {session.id}</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-500 text-white">
                                        {session.status === 1 ? "Validated" : "Draft"}
                                    </span>
                                </div>
                                <Row label="Module/Application:" value={session.posmodule === "takepos" ? "Takepos" : session.posmodule} />
                                <Row label="Terminal:" value={session.posnumber} />
                                <Row label="Period:" value={toPeriod(session.date_creation)} />
                                <Row label="Creat. Date:" value={toCreationDateTime(session.date_creation)} />
                                <Row label="Initial Balance - Cash:" value={`${session.opening.toFixed(2)} ZMW`} />
                                <Row label="Cash:" value={`${session.cash.toFixed(2)} ZMW`} />
                                <Row label="Cheque:" value={`${session.cheque.toFixed(2)} ZMW`} />
                                <Row label="Credit Card:" value={`${session.card.toFixed(2)} ZMW`} />
                            </div>

                            {summary && (
                                <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                                    <div className="bg-gray-50 dark:bg-slate-800 px-3 py-2 text-sm font-medium">
                                        Amount At End Of Period (Day, Month Or Year)
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-slate-700">
                                                <th className="text-left px-3 py-2 font-medium"></th>
                                                <th className="text-center px-2 py-2 font-medium">Initial Balance Cash</th>
                                                <th className="text-center px-2 py-2 font-medium">Cash</th>
                                                <th className="text-center px-2 py-2 font-medium">Cheque</th>
                                                <th className="text-center px-2 py-2 font-medium">Credit Card</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b border-gray-100 dark:border-slate-800">
                                                <td className="px-3 py-2 font-medium">N° Of Invoices</td>
                                                <td className="text-center px-2 py-2">-</td>
                                                <td className="text-center px-2 py-2">{summary.cash_invoices}</td>
                                                <td className="text-center px-2 py-2">{summary.cheque_invoices}</td>
                                                <td className="text-center px-2 py-2">{summary.card_invoices}</td>
                                            </tr>
                                            <tr className="border-b border-gray-100 dark:border-slate-800">
                                                <td className="px-3 py-2 font-medium">Theorical Amount</td>
                                                <td className="text-center px-2 py-2">{summary.opening_amount.toFixed(2)}</td>
                                                <td className="text-center px-2 py-2">{summary.expected_amount.toFixed(2)}</td>
                                                <td className="text-center px-2 py-2">{summary.cheque_sales.toFixed(2)}</td>
                                                <td className="text-center px-2 py-2">{summary.card_sales.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td className="px-3 py-2 font-medium">Real Amount</td>
                                                <td className="text-center px-2 py-2">-</td>
                                                <td className="px-2 py-2">
                                                    <input
                                                        type="number"
                                                        value={closingCash}
                                                        onChange={(e) => setClosingCash(e.target.value)}
                                                        className="w-full text-center rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-1 py-1 outline-none focus:border-blue-500"
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input
                                                        type="number"
                                                        value={closingCheque}
                                                        onChange={(e) => setClosingCheque(e.target.value)}
                                                        className="w-full text-center rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-1 py-1 outline-none focus:border-blue-500"
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input
                                                        type="number"
                                                        value={closingCard}
                                                        onChange={(e) => setClosingCard(e.target.value)}
                                                        className="w-full text-center rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-1 py-1 outline-none focus:border-blue-500"
                                                    />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                No cash session is open for Terminal {terminalNumber} today. Enter the opening float to start one.
                            </p>
                            <div>
                                <label className="block text-sm font-medium mb-1">Initial Balance (Cash)</label>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-600 dark:text-slate-300">
                                        ZMW
                                    </span>
                                    <input
                                        type="number"
                                        value={openingAmount}
                                        onChange={(e) => setOpeningAmount(e.target.value)}
                                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                    >
                        Cancel
                    </button>
                    {!loading && (
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={session ? handleCloseSession : handleOpenSession}
                            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {session ? "Close" : "Save"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex justify-between">
            <span className="text-gray-500 dark:text-slate-400">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

export default CashDeskModal;
