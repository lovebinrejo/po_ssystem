import { useState } from "react";
import { Search } from "lucide-react";
import { useProducts } from "../hooks/useProducts";
import { useCategories } from "../../categories/hooks/useCategories";
import CategoryTabs from "../../categories/Components/CategoryTabs";
import ProductsTable from "./ProductsTable";

function ProductsPage() {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    const { categories, error: categoriesError } = useCategories();
    const selectedCategoryId = categories.find((c) => c.label === selectedCategory)?.id;
    const { products, loading, error: productsError } = useProducts({
        categoryId: selectedCategoryId,
        search,
    });

    const categoryLabels = ["All", ...categories.map((c) => c.label)];

    return (
        <div>
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Products</h2>

            <div className="flex items-center gap-2 mb-4 max-w-sm border rounded-lg px-3 py-2 dark:border-gray-700">
                <Search size={16} className="text-gray-400" />
                <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full text-sm outline-none bg-transparent dark:text-white placeholder-gray-400"
                />
            </div>

            <CategoryTabs
                categories={categoryLabels}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
            />

            {(categoriesError || productsError) && (
                <p className="text-sm text-red-500 mb-3">{categoriesError || productsError}</p>
            )}

            {loading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading products...</p>
            ) : (
                <ProductsTable products={products} />
            )}
        </div>
    );
}

export default ProductsPage;
