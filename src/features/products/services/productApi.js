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
// tvaRate/vatSrcCode carry the product's real configured VAT rate (16, 0, ...)
// and ZRA VAT source code ('A', 'D', 'C3', ...) through to the cart and,
// from there, into buildPaymentLines — api/pos/products/index.php already
// returns both (tva_tx/vat_src_code), they just weren't read here before,
// so every sale was charged a flat 16% regardless of the product's actual
// rate, silently wrong for anything VAT-exempt or otherwise non-standard.
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
    tvaRate: Number(product.tva_tx) || 0,
    vatSrcCode: product.vat_src_code || product.default_vat_code || "",
});

export const fetchProducts = async ({ categoryId, search } = {}) => {
    const params = new URLSearchParams();
    if (categoryId) params.set("category", categoryId);
    if (search) params.set("search", search);

    const query = params.toString();
    const data = await get(`/api/pos/products/index.php${query ? `?${query}` : ""}`);
    return data.products.map(normalizeProduct);
};
