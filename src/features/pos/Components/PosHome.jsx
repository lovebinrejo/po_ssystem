import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import usePosStore from "../stores/posStore";
import { useCategories } from "../../categories/hooks/useCategories";
import { useProducts } from "../../products/hooks/useProducts";
import CategoryTabs from "../../categories/Components/CategoryTabs";
import ProductGrid, { ProductGridSkeleton } from "../../products/Components/ProductGrid";
import CartPanel from "../../cart/Components/CartPanel";
import CartToast from "./CartToast";

// Mirrors legacy's disablePOSOperations() overlay injected onto .products-grid
// when no cash session is open for this terminal.
//
// This tracks the grid wrapper's actual on-screen position via getBoundingClientRect
// and renders as `position: fixed` at those exact coordinates, instead of being
// `absolute`-positioned inside the grid wrapper. Two independent ancestors scroll
// this app (DashboardLayout's page-level overflow-y-auto AND the grid's own
// internal scroll area) — an absolutely-positioned overlay nested in either one
// gets carried away by that ancestor's scroll, exposing unobscured products
// underneath. `fixed` + a live-tracked rect is immune to that regardless of how
// many scrollable ancestors exist, while still only covering the grid (not the
// sidebar/navbar/cart panel), matching legacy's actual scope.
function CashDeskClosedOverlay({ targetRef }) {
    const [rect, setRect] = useState(null);

    useEffect(() => {
        // Continuous rAF tracking instead of event-based recalculation: the wrapper's
        // size/position can change for reasons that don't fire a 'resize'/'scroll'
        // event at all (e.g. the skeleton-to-real-grid swap changing content height,
        // category filtering changing row count) — a live loop is correct regardless
        // of what caused the change, rather than enumerating every possible trigger.
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

function PosHome() {
    const cart = usePosStore((state) => state.cart);
    const searchTerm = usePosStore((state) => state.searchTerm);
    const addToCart = usePosStore((state) => state.addToCart);
    const changeQty = usePosStore((state) => state.changeQty);
    const removeFromCart = usePosStore((state) => state.removeFromCart);
    const cashSessionOpen = usePosStore((state) => state.cashSessionOpen);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const gridWrapperRef = useRef(null);

    const { categories, error: categoriesError } = useCategories();
    const selectedCategoryId = categories.find((c) => c.label === selectedCategory)?.id;
    const { products, loading, error: productsError } = useProducts({
        categoryId: selectedCategoryId,
        search: searchTerm,
    });

    const categoryLabels = ["All", ...categories.map((c) => c.label)];
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

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
                            products={products}
                            onAddToCart={addToCart}
                            onDecrement={(id) => changeQty(id, -1)}
                        />
                    )}
                </div>
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
