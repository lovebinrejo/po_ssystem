import { useState } from "react";
import { Info, CircleMinus, PackageSearch, CirclePlus, X, Tag, Package, Ruler, ScanLine, ZoomIn } from "lucide-react";
import UOMSelectorModal from "./UOMSelectorModal";
import { formatCurrency } from "../../../utils/currency";

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

function ProductTile({ product, onAddToCart, onDecrement, onShowDetails }) {
    const [imgError, setImgError] = useState(false);
    const isOutOfStock = product.stock <= 0 && product.stock !== null;
    const showImage = product.image && !imgError;

    return (
        <div
            onClick={() => !isOutOfStock && onAddToCart(product)}
            style={{ fontFamily: "var(--font-app)" }}
            className="rounded-xl sm:rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] shadow hover:-translate-y-0.5 transition-transform cursor-pointer">
            <div className="relative group overflow-hidden rounded-t-xl sm:rounded-t-2xl">
                {showImage ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-[84px] sm:h-[118px] lg:h-[134px] object-cover transition-transform duration-300 ease-out group-hover:scale-125"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div
                        className="w-full h-[84px] sm:h-[118px] lg:h-[134px] flex items-center justify-center text-white text-2xl sm:text-3xl lg:text-4xl font-normal transition-transform duration-300 ease-out group-hover:scale-125"
                        style={{ backgroundColor: getAvatarColor(product.id) }}
                    >
                        {getInitials(product.name)}
                    </div>
                )}

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/15 transition-colors duration-300">
                    <ZoomIn
                        size={22}
                        className="text-white opacity-0 group-hover:opacity-90 scale-75 group-hover:scale-100 transition-all duration-300 drop-shadow"
                    />
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onShowDetails(product);
                    }}
                    aria-label="View product details"
                    title="View Details"
                    className="absolute top-1 left-1 w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-white bg-black/35 cursor-pointer transition-colors hover:bg-black/55"
                >
                    <Info size={11} strokeWidth={2.5} className="sm:hidden" />
                    <Info size={14} strokeWidth={2.5} className="hidden sm:block" />
                </button>

                <span
                    className={`absolute top-1 right-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-semibold text-white ${
                        isOutOfStock ? "bg-red-500" : "bg-black/35"
                    }`}
                >
                    {isOutOfStock ? "Out of Stock" : `Stock: ${product.stock}`}
                </span>
            </div>

            <div className="px-1.5 sm:px-3 pt-1.5 sm:pt-3 flex flex-col gap-0.5 sm:gap-1">
                <h3
                    title={product.name}
                    className="text-xs sm:text-sm font-medium text-gray-800 dark:text-slate-200 leading-snug whitespace-nowrap overflow-hidden [mask-image:linear-gradient(to_right,black_88%,transparent_100%)]"
                >
                    {product.name}
                </h3>
                <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight">{formatCurrency(product.price)}</div>
            </div>

            <div className="flex justify-end items-center gap-1 px-1.5 sm:px-3 pb-1.5 sm:pb-3 pt-1">
                <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDecrement(product.id);
                    }}
                    aria-label="Decrease quantity"
                    className="flex items-center justify-center text-gray-400 dark:text-slate-500 cursor-pointer transition-all hover:text-gray-600 dark:hover:text-slate-300 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <CircleMinus size={20} strokeWidth={2} className="sm:hidden" fill="currentColor" fillOpacity={0.08} />
                    <CircleMinus size={24} strokeWidth={2} className="hidden sm:block" fill="currentColor" fillOpacity={0.08} />
                </button>
                <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(product);
                    }}
                    aria-label="Add to cart"
                    className="flex items-center justify-center text-emerald-500 cursor-pointer transition-all hover:text-emerald-600 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:text-gray-300 dark:disabled:text-gray-600"
                >
                    <CirclePlus size={20} strokeWidth={2} className="sm:hidden" fill="currentColor" fillOpacity={0.12} />
                    <CirclePlus size={24} strokeWidth={2} className="hidden sm:block" fill="currentColor" fillOpacity={0.12} />
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

const DETAIL_FIELDS = [
    { key: "ref", label: "Reference", icon: Tag },
    { key: "stock", label: "Total Stock", icon: Package },
    { key: "unit", label: "Unit", icon: Ruler },
    { key: "barcode", label: "Barcode", icon: ScanLine },
];

// Same fields legacy's showProductDetails() modal shows (Reference/Stock/Unit),
// restyled with a modern card layout instead of legacy's plain Bootstrap rows.
// Skips the warehouse-by-warehouse stock breakdown legacy fetches separately,
// and VAT code/description since those aren't part of the product shape
// api/pos/products already returns.
function ProductDetailsModal({ product, onClose }) {
    if (!product) return null;

    const isOutOfStock = product.stock <= 0 && product.stock !== null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-[#2c6291] to-[#397db9] text-white">
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <Info size={18} />
                        Product Details
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-sm"
                            style={{ backgroundColor: getAvatarColor(product.id) }}
                        >
                            {getInitials(product.name)}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-base leading-tight truncate">{product.name}</h3>
                            <span
                                className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    isOutOfStock
                                        ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                                }`}
                            >
                                {isOutOfStock ? "Out of Stock" : `${product.stock} in stock`}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        {DETAIL_FIELDS.map(({ key, label, icon: FieldIcon }) => (
                            <div key={key} className="flex items-start gap-2 rounded-xl bg-gray-50 dark:bg-slate-800/70 p-2.5">
                                <FieldIcon size={15} className="shrink-0 mt-0.5 text-gray-400 dark:text-slate-500" />
                                <div className="min-w-0">
                                    <div className="text-[10px] text-gray-500 dark:text-slate-400">{label}</div>
                                    <div className="font-semibold text-sm truncate">{product[key] ?? "N/A"}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-xl bg-gradient-to-r from-[#2c6291]/10 to-[#397db9]/10 dark:from-[#2c6291]/20 dark:to-[#397db9]/20 border border-[#2c6291]/20 dark:border-[#7fb0d8]/20 px-4 py-3">
                        <div className="text-xs text-gray-500 dark:text-slate-400">Price</div>
                        <div className="text-2xl font-bold text-[#2c6291] dark:text-[#7fb0d8]">
                            {formatCurrency(product.price)}
                        </div>
                    </div>
                </div>

                <div className="px-5 py-3 border-t border-gray-200 dark:border-slate-700 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-600 hover:bg-slate-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

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
    const [detailsProduct, setDetailsProduct] = useState(null);

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
                    onShowDetails={setDetailsProduct}
                />
            ))}

            <UOMSelectorModal
                product={uomProduct}
                onClose={() => setUomProduct(null)}
                onConfirm={handleUomConfirm}
            />

            <ProductDetailsModal product={detailsProduct} onClose={() => setDetailsProduct(null)} />
        </div>
    );
}

export default ProductGrid;
