import { useState } from "react";
import { Armchair } from "lucide-react";
import useTableStore from "../stores/tableStore";
import TableSelectorModal from "./TableSelectorModal";

function OrderTypeBar() {
    const [modalOpen, setModalOpen] = useState(false);
    const orderType = useTableStore((state) => state.orderType);
    const selectedTable = useTableStore((state) => state.selectedTable);
    const setOrderType = useTableStore((state) => state.setOrderType);

    return (
        <div className="mt-3 flex items-center gap-2 text-sm">
            <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-lg px-3 py-2 hover:bg-gray-200 dark:hover:bg-slate-700"
            >
                <Armchair size={14} />
                <span className="text-xs">{selectedTable ? selectedTable.label : "Select Table"}</span>
            </button>

            <button
                type="button"
                onClick={() => setOrderType("table")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 border text-xs ${
                    orderType === "table"
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300"
                }`}
            >
                <span className={`w-2 h-2 rounded-full ${orderType === "table" ? "bg-white" : "bg-slate-500"}`} />
                On Table
            </button>

            <button
                type="button"
                onClick={() => setOrderType("pickup")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 border text-xs ${
                    orderType === "pickup"
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300"
                }`}
            >
                <span className={`w-2 h-2 rounded-full ${orderType === "pickup" ? "bg-white" : "bg-slate-500"}`} />
                On Pickup
            </button>

            {modalOpen && <TableSelectorModal onClose={() => setModalOpen(false)} />}
        </div>
    );
}

export default OrderTypeBar;
