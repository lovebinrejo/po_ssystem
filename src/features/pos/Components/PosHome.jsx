import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import usePosStore from "../stores/posStore";
import { useCategories } from "../../categories/hooks/useCategories";
import { useProducts } from "../../products/hooks/useProducts";
import CategoryTabs from "../../categories/Components/CategoryTabs";
import ProductGrid, { ProductGridSkeleton } from "../../products/Components/ProductGrid";
import CartPanel from "../../cart/Components/CartPanel";
import CartToast from "./CartToast";

// Matches legacy's productsPerPage default (pos-app.js: `window.ECUENTA_POS?.productsPerPage || 25`).
const PRODUCTS_PER_PAGE = 25;


function CashDeskClosedOverlay({ targetRef }) {
    const [rect, setRect] = useState(null);

    useEffect(() => {
        
        let frameId;
        const tick = () => {
            if (targetRef.current) {
                const next = targetRef.current.getBoundingClientRect();
                setRect((prev) => {
                    if (prev && prev.top === next.top && prev.left === next.left && prev.width === next.width && prev.height === next.height) {
                        return prev;
                    }
                    return next;
                });
            }
            frameId = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(frameId);
    }, [targetRef]);

    if (!rect) return null;

    return (
        <div
            className="fixed z-40 flex items-center justify-center bg-black/35 dark:bg-black/60 rounded-lg"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        >
            <div className="max-w-[400px] mx-4 rounded-xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-8 text-center">
                <Lock size={48} className="text-red-600 mb-5" style={{ display: "inline-block" }} />
                <h3 className="text-base font-semibold text-gray-800 mb-2">Cash Desk Closed</h3>
                <p className="text-sm text-gray-500">
                    Please open the cash desk before starting operations.
                </p>
            </div>
        </div>
    );
}


function ProductPagination({ page, totalPages, onChange }) {
    if (totalPages <= 1) return null;

    return (
        <div className="shrink-0 flex items-center justify-center gap-2 pt-2">
            <button
                type="button"
                disabled={page <= 1}
                onClick={() => onChange(page - 1)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border font-semibold transition-colors ${
                    page <= 1
                        ? "border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600 cursor-not-allowed"
                        : "border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer"
                }`}
            >
                <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-gray-600 dark:text-slate-300">
                Page {page} of {totalPages}
            </span>
            <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onChange(page + 1)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border font-semibold transition-colors ${
                    page >= totalPages
                        ? "border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600 cursor-not-allowed"
                        : "border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer"
                }`}
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
}

function PosHome() {
    const cart = usePosStore((state) => state.cart);
    const searchTerm = usePosStore((state) => state.searchTerm);
    const addToCart = usePosStore((state) => state.addToCart);
    const changeQty = usePosStore((state) => state.changeQty);
    const removeFromCart = usePosStore((state) => state.removeFromCart);
    const cashSessionOpen = usePosStore((state) => state.cashSessionOpen);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [page, setPage] = useState(1);
    const gridWrapperRef = useRef(null);

    const { categories, error: categoriesError } = useCategories();
    const selectedCategoryId = categories.find((c) => c.label === selectedCategory)?.id;
    const { products, loading, error: productsError } = useProducts({
        categoryId: selectedCategoryId,
        search: searchTerm,
    });

    const categoryLabels = ["All", ...categories.map((c) => c.label)];
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    
    const filterKey = `${selectedCategoryId ?? "all"}::${searchTerm}`;
    const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
    if (filterKey !== prevFilterKey) {
        setPrevFilterKey(filterKey);
        setPage(1);
    }

    const totalPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const visibleProducts = products.slice(
        (safePage - 1) * PRODUCTS_PER_PAGE,
        safePage * PRODUCTS_PER_PAGE
    );

    return (
        <div className="flex flex-row gap-1 h-full min-h-0">
            <div ref={gridWrapperRef} className="relative flex-1 min-w-0 flex flex-col min-h-0">
                <div className="shrink-0 pb-2 sm:pb-3">
                    <CategoryTabs
                        categories={categoryLabels}
                        selectedCategory={selectedCategory}
                        onSelect={setSelectedCategory}
                    />
                </div>
                {(categoriesError || productsError) && (
                    <p className="shrink-0 text-sm text-red-500 mb-3">{categoriesError || productsError}</p>
                )}
                <div
                    className={`flex-1 min-h-0 soft-scrollbar ${cashSessionOpen ? "overflow-y-auto" : "overflow-hidden"}`}
                    onWheel={cashSessionOpen ? undefined : (e) => e.preventDefault()}
                    onTouchMove={cashSessionOpen ? undefined : (e) => e.preventDefault()}
                >
                    {loading ? (
                        <ProductGridSkeleton />
                    ) : (
                        <ProductGrid
                            products={visibleProducts}
                            onAddToCart={addToCart}
                            onDecrement={(id) => changeQty(id, -1)}
                        />
                    )}
                </div>
                {!loading && <ProductPagination page={safePage} totalPages={totalPages} onChange={setPage} />}
                {!cashSessionOpen && <CashDeskClosedOverlay targetRef={gridWrapperRef} />}
            </div>

            <CartPanel
                cart={cart}
                onChangeQty={changeQty}
                onRemove={removeFromCart}
                total={total}
                cashSessionOpen={cashSessionOpen}
            />
            <CartToast />
        </div>
    );
}

export default PosHome;
