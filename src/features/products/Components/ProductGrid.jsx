import { useState } from "react";
import { Info, Minus, PackageSearch, Plus } from "lucide-react";
import UOMSelectorModal from "./UOMSelectorModal";

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
        <div
            onClick={() => !isOutOfStock && onAddToCart(product)}
            className="rounded-xl sm:rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] shadow hover:-translate-y-0.5 transition-transform cursor-pointer">
            <div className="relative">
                {showImage ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-20 sm:h-28 lg:h-32 object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div
                        className="w-full h-20 sm:h-28 lg:h-32 flex items-center justify-center text-white text-2xl sm:text-3xl lg:text-4xl font-normal rounded-t-xl sm:rounded-t-2xl"
                        style={{ backgroundColor: getAvatarColor(product.id) }}
                    >
                        {getInitials(product.name)}
                    </div>
                )}

                <span className="absolute top-1 left-1 w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded text-white bg-white/25">
                    <Info size={11} className="sm:hidden" />
                    <Info size={14} className="hidden sm:block" />
                </span>

                <span
                    className={`absolute top-1 right-1 px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] text-white ${
                        isOutOfStock ? "bg-red-500" : "bg-white/25"
                    }`}
                >
                    {isOutOfStock ? "Out of Stock" : `Stock: ${product.stock}`}
                </span>
            </div>

            <div className="px-1.5 sm:px-3 pt-1.5 sm:pt-3 flex flex-col gap-0.5 sm:gap-1">
                <h3 className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">{product.name}</h3>
                <div className="text-xs sm:text-sm text-gray-900 dark:text-white">{product.price.toFixed(2)} ZMW</div>
            </div>

            <div className="flex justify-end items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 pb-1.5 sm:pb-3 pt-1">
                <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDecrement(product.id);
                    }}
                    aria-label="Decrease quantity"
                    className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-100 shadow-sm cursor-pointer transition-all hover:bg-gray-300 dark:hover:bg-slate-500 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-200 dark:disabled:hover:bg-slate-600"
                >
                    <Minus size={12} className="sm:hidden" />
                    <Minus size={14} className="hidden sm:block" />
                </button>
                <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(product);
                    }}
                    aria-label="Add to cart"
                    className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-white bg-emerald-500 shadow-sm shadow-emerald-500/30 cursor-pointer transition-all hover:bg-emerald-600 hover:shadow-md hover:shadow-emerald-500/40 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-gray-300 dark:disabled:bg-gray-600"
                >
                    <Plus size={13} className="sm:hidden" />
                    <Plus size={16} className="hidden sm:block" />
                </button>
            </div>
        </div>
    );
}

// Builds the cart-line product for a chosen unit: base unit keeps the
// product's own id/name/price, alternate packaging (e.g. Bag) gets its own
// cart line (distinct id) priced and labeled per that unit.
const buildCartLine = (product, unit) =>
    unit.isBase
        ? product
        : {
              ...product,
              id: `${product.id}-${unit.code}`,
              name: `${product.name} (${unit.label})`,
              price: unit.price,
              unit: unit.label,
          };

function TileSkeleton() {
    return (
        <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] shadow animate-pulse">
            <div className="w-full h-20 sm:h-28 lg:h-32 bg-gray-200 dark:bg-slate-700" />
            <div className="px-1.5 sm:px-3 pt-1.5 sm:pt-3 flex flex-col gap-1.5 sm:gap-2">
                <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-slate-700" />
                <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
            </div>
            <div className="flex justify-end items-center gap-1 sm:gap-2 px-1.5 sm:px-3 pb-1.5 sm:pb-3 pt-2">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-md bg-gray-200 dark:bg-slate-700" />
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-md bg-gray-200 dark:bg-slate-700" />
            </div>
        </div>
    );
}

export function ProductGridSkeleton({ count = 12 }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] gap-2 sm:gap-3">
            {Array.from({ length: count }).map((_, i) => (
                <TileSkeleton key={i} />
            ))}
        </div>
    );
}

function EmptyProductsState() {
    return (
        <div className="col-span-full flex flex-col items-center justify-center text-center py-12 sm:py-20 text-gray-400 dark:text-slate-500">
            <PackageSearch size={48} className="mb-3 opacity-60" />
            <p className="text-sm sm:text-base font-medium text-gray-500 dark:text-slate-400">No products in this category</p>
            <p className="text-xs sm:text-sm mt-1">Try another category or clear the search</p>
        </div>
    );
}

function ProductGrid({ products, onAddToCart, onDecrement }) {
    const [uomProduct, setUomProduct] = useState(null);

    const handleAddToCart = (product) => {
        if (product.hasUom && product.uomUnits?.length > 0) {
            setUomProduct(product);
        } else {
            onAddToCart(product);
        }
    };

    const handleUomConfirm = (product, unit, qty) => {
        onAddToCart(buildCartLine(product, unit), qty);
    };

    if (products.length === 0) {
        return <EmptyProductsState />;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] gap-2 sm:gap-3">
            {products.map((product) => (
                <ProductTile
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onDecrement={onDecrement}
                />
            ))}

            <UOMSelectorModal
                product={uomProduct}
                onClose={() => setUomProduct(null)}
                onConfirm={handleUomConfirm}
            />
        </div>
    );
}

export default ProductGrid;
