import { useState } from "react";
import usePosStore from "../stores/posStore";
import { useCategories } from "../../categories/hooks/useCategories";
import { useProducts } from "../../products/hooks/useProducts";
import CategoryTabs from "../../categories/Components/CategoryTabs";
import ProductGrid from "../../products/Components/ProductGrid";
import CartPanel from "../../cart/Components/CartPanel";

function PosHome() {
    const cart = usePosStore((state) => state.cart);
    const searchTerm = usePosStore((state) => state.searchTerm);
    const addToCart = usePosStore((state) => state.addToCart);
    const changeQty = usePosStore((state) => state.changeQty);
    const removeFromCart = usePosStore((state) => state.removeFromCart);
    const [selectedCategory, setSelectedCategory] = useState("All");

    const { categories, error: categoriesError } = useCategories();
    const selectedCategoryId = categories.find((c) => c.label === selectedCategory)?.id;
    const { products, loading, error: productsError } = useProducts({
        categoryId: selectedCategoryId,
        search: searchTerm,
    });

    const categoryLabels = ["All", ...categories.map((c) => c.label)];
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    return (
        <div className="flex flex-row gap-2 sm:gap-4 lg:gap-6 h-full min-h-0">
            <div className="flex-1 min-w-0 flex flex-col min-h-0">
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
                <div className="flex-1 min-h-0 overflow-y-auto soft-scrollbar">
                    {loading ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading products...</p>
                    ) : (
                        <ProductGrid
                            products={products}
                            onAddToCart={addToCart}
                            onDecrement={(id) => changeQty(id, -1)}
                        />
                    )}
                </div>
            </div>

            <CartPanel cart={cart} onChangeQty={changeQty} onRemove={removeFromCart} total={total} />
        </div>
    );
}

export default PosHome;
