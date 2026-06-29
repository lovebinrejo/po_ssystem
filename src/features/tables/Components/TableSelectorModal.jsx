import { Armchair, Check, X } from "lucide-react";
import { useTables } from "../hooks/useTables";
import useTableStore from "../stores/tableStore";

function TableSelectorModal({ onClose }) {
    const { tables, loading } = useTables();
    const selectedTable = useTableStore((state) => state.selectedTable);
    const selectTable = useTableStore((state) => state.selectTable);

    const handleSelect = (table) => {
        selectTable(table);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-5 py-2.5 bg-[#2c6291] text-white">
                    <h3 className="font-semibold">Select a table</h3>
                    <button onClick={onClose} className="p-1 rounded hover:bg-white/20">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5">
                    {loading ? (
                        <div className="grid grid-cols-3 gap-3">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <div key={i} className="h-[78px] rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            {tables.map((table) => {
                                const isSelected = selectedTable?.id === table.id;
                                return (
                                    <button
                                        key={table.id}
                                        onClick={() => handleSelect(table)}
                                        disabled={table.occupied}
                                        className={`relative flex flex-col items-center justify-center gap-1 py-3.5 rounded-xl border-2 text-sm font-medium transition-all ${
                                            isSelected
                                                ? "bg-[#2c6291] border-[#2c6291] text-white shadow-md shadow-[#2c6291]/30"
                                                : table.occupied
                                                ? "bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
                                                : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-100 hover:-translate-y-0.5 hover:border-[#2c6291] hover:shadow-md cursor-pointer"
                                        }`}
                                    >
                                        {isSelected && (
                                            <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900">
                                                <Check size={11} className="text-white" />
                                            </span>
                                        )}
                                        <Armchair size={20} className={isSelected ? "text-white" : table.occupied ? "text-gray-400 dark:text-slate-500" : "text-[#2c6291] dark:text-blue-300"} />
                                        {table.label}
                                        <span className="text-[9px] uppercase tracking-wide opacity-75">
                                            {table.occupied ? "Occupied" : "Available"}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TableSelectorModal;
