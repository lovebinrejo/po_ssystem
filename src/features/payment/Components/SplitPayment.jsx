import { Plus, Trash2 } from "lucide-react";
import { PAYMENT_METHODS } from "./PaymentMethods";
import PaymentDetailsPanel from "./PaymentDetailsPanel";

function SplitPayment({ total, lines, addLine, removeLine, updateLine, remaining }) {
    return (
        <PaymentDetailsPanel
            title="Split Payment:"
            titleClassName="text-sm font-medium text-gray-600 dark:text-slate-300 mt-5 mb-2"
            total={total}
        >
            <div className="space-y-2">
                {lines.map((line) => (
                    <div key={line.id} className="flex items-center gap-2">
                        <select
                            value={line.method}
                            onChange={(e) => updateLine(line.id, { method: e.target.value })}
                            className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-xs outline-none focus:border-blue-500"
                        >
                            {PAYMENT_METHODS.map(({ code, label }) => (
                                <option key={code} value={code}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={line.amount}
                            onChange={(e) => updateLine(line.id, { amount: e.target.value })}
                            className="w-24 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-sm outline-none focus:border-blue-500"
                        />
                        <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            disabled={lines.length === 1}
                            className="p-2 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-300 hover:underline"
            >
                <Plus size={14} /> Add payment line
            </button>

            <div
                className={`flex justify-between items-center rounded-lg px-3 py-2.5 text-sm font-semibold ${
                    Math.abs(remaining) < 0.01
                        ? "bg-emerald-500 text-white"
                        : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                }`}
            >
                <span>{Math.abs(remaining) < 0.01 ? "Fully covered" : "Remaining:"}</span>
                {Math.abs(remaining) >= 0.01 && <span>ZMW {remaining.toFixed(2)}</span>}
            </div>
        </PaymentDetailsPanel>
    );
}

export default SplitPayment;
