import { useState } from "react";
import { Armchair } from "lucide-react";
import useTableStore from "../stores/tableStore";
import TableSelectorModal from "./TableSelectorModal";

const ORDER_TYPES = [
    { value: "table", label: "On Table" },
    { value: "pickup", label: "On Pickup" },
];

function OrderTypeButton({ label, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1 rounded-md sm:rounded-lg px-1 sm:px-1.5 py-1.5 sm:py-2 border text-[11px] font-semibold whitespace-nowrap transition-colors ${
                active
                    ? "bg-blue-400 border-blue-400 text-white shadow-sm shadow-blue-400/30"
                    : "bg-gray-100 dark:bg-slate-800 border-gray-400 dark:border-slate-500 text-gray-800 dark:text-slate-100 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-white" : "bg-gray-500 dark:bg-slate-400"}`} />
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}

function OrderTypeBar() {
    const [modalOpen, setModalOpen] = useState(false);
    const orderType = useTableStore((state) => state.orderType);
    const selectedTable = useTableStore((state) => state.selectedTable);
    const setOrderType = useTableStore((state) => state.setOrderType);

    return (
        <div className="mt-1.5 sm:mt-3 flex items-center gap-1 sm:gap-1.5 text-sm">
            <button
                type="button"
                onClick={() => setModalOpen(true)}
                title={selectedTable ? selectedTable.label : "Select Table"}
                className="shrink-0 flex items-center justify-center gap-1 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-100 font-medium rounded-md sm:rounded-lg px-1.5 sm:px-2.5 py-1.5 sm:py-2 whitespace-nowrap hover:bg-gray-200 dark:hover:bg-slate-700"
            >
                <Armchair size={13} className="sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="hidden sm:inline text-[11px] truncate max-w-[72px]">{selectedTable ? selectedTable.label : "Select Table"}</span>
            </button>

            {ORDER_TYPES.map(({ value, label }) => (
                <OrderTypeButton key={value} label={label} active={orderType === value} onClick={() => setOrderType(value)} />
            ))}

            {modalOpen && <TableSelectorModal onClose={() => setModalOpen(false)} />}
        </div>
    );
}

export default OrderTypeBar;
