import { useState } from "react";
import { MapPin, Utensils, Lock } from "lucide-react";
import useTableStore from "../stores/tableStore";
import TableSelectorModal from "./TableSelectorModal";

const ORDER_TYPES = [
    { value: "table", label: "Table", icon: Utensils },
    { value: "pickup", label: "Pickup", icon: Lock },
];

function OrderTypeButton({ label, icon: Icon, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1 rounded-md sm:rounded-lg px-1 sm:px-1.5 py-1.5 sm:py-2 border text-[13px] font-semibold whitespace-nowrap transition-colors ${
                active
                    ? "bg-gray-900 dark:bg-black border-gray-900 dark:border-black text-white shadow-sm shadow-gray-900/30"
                    : "bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-200 hover:border-gray-400 dark:hover:bg-slate-600 dark:hover:border-slate-500"
            }`}
        >
            <Icon size={12} className="shrink-0 sm:w-3.5 sm:h-3.5" />
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
                className="flex-1 min-w-0 flex items-center justify-center gap-1 bg-[#397db9] border border-[#397db9] text-white font-medium rounded-md sm:rounded-lg px-1.5 sm:px-2.5 py-1.5 sm:py-2 whitespace-nowrap shadow-sm shadow-[#397db9]/30 hover:bg-[#2c6291]"
            >
                <MapPin size={13} className="sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="hidden sm:inline text-[13px] truncate">{selectedTable ? selectedTable.label : "Table"}</span>
            </button>

            {ORDER_TYPES.map(({ value, label, icon }) => (
                <OrderTypeButton key={value} label={label} icon={icon} active={orderType === value} onClick={() => setOrderType(value)} />
            ))}

            {modalOpen && <TableSelectorModal onClose={() => setModalOpen(false)} />}
        </div>
    );
}

export default OrderTypeBar;
