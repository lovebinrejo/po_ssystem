import { get } from "../../../services/axios";
import { getApiBaseUrl } from "../../../services/apiConfig";

// The configured base is a full absolute URL in dev/production builds (or
// after a user overrides it from the login screen — e.g.
// "https://demo1.ecuenta.online"), but a bare path in the "htdocs" same-origin
// build ("/ecuenta9/htdocs" — see .env.htdocs). new URL() throws on that
// path-only form, so only extract an origin when there's an actual one to
// extract; same-origin builds don't need a prefix at all since the photo
// path below is already domain-root-relative. Computed fresh on each call
// (not cached at module load) since the base can now change at runtime.
const getApiOrigin = () => {
    const rawBase = getApiBaseUrl();
    return /^https?:\/\//.test(rawBase) ? new URL(rawBase).origin : "";
};

// The legacy API returns domain-relative photo paths (e.g. "/ecuenta9/htdocs/takeposnew/genimg/...").
export const buildProductImageUrl = (photoPath) => (photoPath ? `${getApiOrigin()}${photoPath}` : null);

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
    unit: product.unit_label,
    hasUom: product.has_uom,
    uomUnits: product.uom_units || [],
});

export const fetchProducts = async ({ categoryId, search } = {}) => {
    const params = new URLSearchParams();
    if (categoryId) params.set("category", categoryId);
    if (search) params.set("search", search);

    const query = params.toString();
    const data = await get(`/api/pos/products/index.php${query ? `?${query}` : ""}`);
    return data.products.map(normalizeProduct);
};
