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
                    // No vertical translate on hover here — the navbar sits flush at the
                    // top of an overflow-hidden layout, so any upward shift clips the
                    // badge/cancel button against that boundary.
                    <div key={sale.place} className="relative group shrink-0">
                        <button
                            type="button"
                            onClick={() => switchSale(sale.place)}
                            title={`Sale started at ${sale.time}${itemCount > 0 ? ` - ${itemCount} items` : ""}`}
                            className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium shadow cursor-pointer ${
                                isActive ? "bg-[#2c6291] text-white font-semibold" : "bg-slate-700 text-white hover:bg-slate-600"
                            }`}
                        >
                            <ShoppingCart size={14} className="text-white" />
                            {sale.time}
                        </button>

                        {itemCount > 0 && (
                            <span
                                title={`${itemCount} item${itemCount === 1 ? "" : "s"} in this sale`}
                                className={`absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center border-2 border-[var(--text-navy)] shadow-sm pointer-events-none ${
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
                                className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-red-600 border-2 border-[var(--text-navy)] shadow-sm cursor-pointer opacity-0 group-hover:opacity-100 hover:scale-110 transition-all"
                            >
                                <X size={11} className="text-white" />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default ParallelSalesBar;
