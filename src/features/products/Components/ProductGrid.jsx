import { useState } from "react";
import { Info, Minus, Plus } from "lucide-react";

// Mirrors takeposnew/js/pos-app.js renderProductCard(): same palette, same
// two-letter-initials rule, so a product not having a photo looks identical
// to the legacy POS screen instead of an arbitrary placeholder.
const AVATAR_COLORS = ["#F59E0B", "#85C1E2", "#EC4899", "#A78BFA", "#10B981", "#F472B6", "#60A5FA", "#34D399"];

const getInitials = (name = "Product") => {
    const words = name.trim().split(" ");
    if (words.length >= 2) {
        return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
};

const getAvatarColor = (productId) => AVATAR_COLORS[(productId || 0) % AVATAR_COLORS.length];

function ProductTile({ product, onAddToCart, onDecrement }) {
    const [imgError, setImgError] = useState(false);
    const isOutOfStock = product.stock <= 0 && product.stock !== null;
    const showImage = product.image && !imgError;

    return (
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] shadow hover:-translate-y-0.5 transition-transform">
            <div className="relative">
                {showImage ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-32 object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div
                        className="w-full h-32 flex items-center justify-center text-white text-4xl font-normal rounded-t-2xl"
                        style={{ backgroundColor: getAvatarColor(product.id) }}
                    >
                        {getInitials(product.name)}
                    </div>
                )}

                <span className="absolute top-1 left-1 w-7 h-7 flex items-center justify-center rounded text-white bg-white/25">
                    <Info size={14} />
                </span>

                <span
                    className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] text-white ${
                        isOutOfStock ? "bg-red-500" : "bg-white/25"
                    }`}
                >
                    {isOutOfStock ? "Out of Stock" : `Stock: ${product.stock}`}
                </span>
            </div>

            <div className="px-3 pt-3 flex flex-col gap-1">
                <h3 className="text-sm text-gray-900 dark:text-white truncate">{product.name}</h3>
                <div className="text-sm text-gray-900 dark:text-white">{product.price.toFixed(2)} ZMW</div>
            </div>

            <div className="flex justify-end items-center gap-2 px-3 pb-3 pt-1">
                <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => onDecrement(product.id)}
                    className="p-2.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                >
                    <Minus size={14} />
                </button>
                <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => onAddToCart(product)}
                    className="p-2.5 rounded-md border border-emerald-500 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-40"
                >
                    <Plus size={16} />
                </button>
            </div>
        </div>
    );
}

function ProductGrid({ products, onAddToCart, onDecrement }) {
    return (
        <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
        >
            {products.map((product) => (
                <ProductTile
                    key={product.id}
                    product={product}
                    onAddToCart={onAddToCart}
                    onDecrement={onDecrement}
                />
            ))}
        </div>
    );
}

export default ProductGrid;
