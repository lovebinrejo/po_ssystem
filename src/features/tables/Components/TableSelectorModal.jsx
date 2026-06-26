import { X } from "lucide-react";
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
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl w-full max-w-md p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-900 dark:text-white font-semibold">Select a table</h3>
                    <button onClick={onClose} className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400">Loading tables...</p>
                ) : (
                    <div className="grid grid-cols-3 gap-3">
                        {tables.map((table) => (
                            <button
                                key={table.id}
                                onClick={() => handleSelect(table)}
                                className={`py-3 rounded-lg text-sm font-medium border transition-colors ${
                                    selectedTable?.id === table.id
                                        ? "bg-blue-600 border-blue-500 text-white"
                                        : "bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                                }`}
                            >
                                {table.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default TableSelectorModal;
