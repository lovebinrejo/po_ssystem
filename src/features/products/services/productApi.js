import { get } from "../../../services/axios";

const API_ORIGIN = new URL(import.meta.env.VITE_API_BASE_URL).origin;

// The legacy API returns domain-relative photo paths (e.g. "/ecuenta9/htdocs/takeposnew/genimg/...").
export const buildProductImageUrl = (photoPath) => (photoPath ? `${API_ORIGIN}${photoPath}` : null);

// Normalizes the legacy API's field names (label/price_ttc/photo) to the
// name/price/image shape the rest of the app (ProductGrid, CartPanel, posStore) expects.
const normalizeProduct = (product) => ({
    id: product.id,
    name: product.label,
    price: product.price_ttc,
    image: buildProductImageUrl(product.photo),
    ref: product.ref,
    barcode: product.barcode,
    stock: product.stock,
    categoryId: product.category_id,
    available: product.available,
});

export const fetchProducts = async ({ categoryId, search } = {}) => {
    const params = new URLSearchParams();
    if (categoryId) params.set("category", categoryId);
    if (search) params.set("search", search);

    const query = params.toString();
    const data = await get(`/api/pos/products/index.php${query ? `?${query}` : ""}`);
    return data.products.map(normalizeProduct);
};
