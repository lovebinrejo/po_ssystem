import { useState, useCallback } from "react";
import { Menu, Search, ScanBarcode, ShoppingCart, Grid3x3 } from "lucide-react";
import usePosStore from "../features/pos/stores/posStore";
import ParallelSalesBar from "../features/pos/Components/ParallelSalesBar";
import { BarcodeScannerModal } from "../features/barcodeScanner";

function PosNavbar({ onToggleSidebar, onOpenCart }) {
    const searchTerm = usePosStore((state) => state.searchTerm);
    const setSearchTerm = usePosStore((state) => state.setSearchTerm);
    const cart = usePosStore((state) => state.cart);
    const createNewSale = usePosStore((state) => state.createNewSale);
    const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const [scannerOpen, setScannerOpen] = useState(false);

    const handleScan = useCallback(
        (value) => {
            setSearchTerm(value);
            setScannerOpen(false);
        },
        [setSearchTerm]
    );

    return (
        <nav className="flex items-center gap-3 h-11 px-3 bg-[var(--text-navy)]">
            <button
                type="button"
                onClick={onToggleSidebar}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/20 text-white hover:bg-black/30 shrink-0"
            >
                <Menu size={18} />
            </button>

            <div className="flex items-center gap-1.5 text-white font-bold tracking-wide shrink-0">
                <Grid3x3 size={18} />
                <span>ECUENTA</span>
            </div>

            <div className="flex-1 flex items-center gap-2 max-w-xs bg-white rounded-lg px-3 py-1.5">
                <Search size={14} className="text-[#397db9]" />
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-sm outline-none text-gray-700 placeholder-gray-400 bg-transparent"
                />
                <button
                    type="button"
                    title="Scan Barcode"
                    onClick={() => setScannerOpen(true)}
                    className="text-[#397db9] hover:text-[#2c6291] shrink-0"
                >
                    <ScanBarcode size={16} />
                </button>
            </div>

            <div className="flex items-center gap-2 ml-auto shrink-0">
                <ParallelSalesBar />

                <button
                    type="button"
                    onClick={createNewSale}
                    title="Start a new parallel sale"
                    className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#397db9] text-white text-sm font-semibold hover:bg-[#2c6291]"
                >
                    <ShoppingCart size={14} />
                    New Sale
                </button>

                <button
                    type="button"
                    onClick={onOpenCart}
                    className="relative w-9 h-8 flex items-center justify-center rounded-lg bg-slate-700 text-white hover:bg-slate-600"
                >
                    <ShoppingCart size={15} />
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-white text-center bg-blue-500 border-2 border-[var(--text-navy)] shadow-sm">
                        {cartCount}
                    </span>
                </button>
            </div>

            <BarcodeScannerModal
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleScan}
            />
        </nav>
    );
}

export default PosNavbar;
