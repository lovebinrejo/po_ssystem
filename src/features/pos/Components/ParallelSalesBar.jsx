import { ShoppingCart, X } from "lucide-react";
import usePosStore from "../stores/posStore";

function ParallelSalesBar() {
    const sales = usePosStore((state) => state.sales);
    const activePlace = usePosStore((state) => state.activePlace);
    const cartsByPlace = usePosStore((state) => state.cartsByPlace);
    const switchSale = usePosStore((state) => state.switchSale);
    const deleteSale = usePosStore((state) => state.deleteSale);

    // Mirrors legacy's row-reverse container: the newest sale renders
    // leftmost, pushing older ones further right (toward "New Sale").
    const orderedSales = [...sales].reverse();

    return (
        <div className="flex items-center gap-2 overflow-x-auto soft-scrollbar shrink-0 max-w-[40vw]">
            {orderedSales.map((sale) => {
                const isActive = sale.place === activePlace;
                const itemCount = (cartsByPlace[sale.place] || []).reduce((sum, item) => sum + item.qty, 0);
                const canDelete = sale.place !== "0";

                return (
                    <div key={sale.place} className="relative group shrink-0">
                        <button
                            type="button"
                            onClick={() => switchSale(sale.place)}
                            title={`Sale started at ${sale.time}${itemCount > 0 ? ` - ${itemCount} items` : ""}`}
                            className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium shadow transition-all hover:-translate-y-0.5 ${
                                isActive ? "bg-slate-500 text-white font-semibold" : "bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                            <ShoppingCart size={14} className={isActive ? "text-white" : "text-indigo-500"} />
                            {sale.time}
                        </button>

                        {itemCount > 0 && (
                            <span
                                className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] leading-4 text-center border-2 border-white ${
                                    isActive ? "bg-amber-400 text-blue-900" : "bg-red-500 text-white"
                                }`}
                            >
                                {itemCount}
                            </span>
                        )}

                        {canDelete && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (itemCount === 0 || window.confirm("This sale has items. Cancel it anyway?")) {
                                        deleteSale(sale.place);
                                    }
                                }}
                                title="Cancel sale"
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 border-2 border-white opacity-80 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={9} className="text-white" />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default ParallelSalesBar;
