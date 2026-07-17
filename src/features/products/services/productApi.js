import { get } from "../../../services/axios";
import { getApiBaseUrl, isSameOriginBackend, buildRequestUrl, dynamicProxyHeaders } from "../../../services/apiConfig";

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

// api/pos/products/index.php's UOM query block (has_uom/uom_units) is a
// one-off manual patch, not stock code — confirmed live 2026-07-17: present
// on ecuenta9's WAMP copy, missing on ecnta10's and on demo.ecuenta.online
// (see this repo's backend-changes/README.md, and [[pos_standalone_no_backend_changes]]
// for why re-patching every install by hand isn't the answer). takeposnew/
// ajax/ajax.php's own `getProducts` action (same-origin/session-cookie only,
// same constraint as tableApi.js's fetchLegacyTables) has the identical UOM
// query already built in — but unlike api/pos/products/index.php, it's
// stock/shared code already deployed on every install of this platform
// (confirmed present in both ecnta10's and ecuenta9's ajax.php). Fetching UOM
// data from there instead, and merging it onto whichever product list the
// primary endpoint returned, works for any backend URL without depending on
// that ad-hoc patch being manually re-applied per install.
//
// Only the "no category" branch of ajax.php's getProducts includes the UOM
// query (a pre-existing inconsistency in that legacy file, not something to
// fix here) — so this always requests the full uncategorized list rather
// than mirroring fetchProducts' own category/search params, and is cached
// per session (UOM configuration doesn't change mid-session) rather than
// re-fetched on every category switch or search keystroke.
let uomMapPromise = null;

const fetchLegacyUomMap = async () => {
    const response = await fetch(buildRequestUrl("/takeposnew/ajax/ajax.php?action=getProducts&category=0&limit=1000"), {
        credentials: "same-origin",
        headers: dynamicProxyHeaders(),
    });
    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error(`ajax.php returned non-JSON (status ${response.status}) — likely no valid session cookie was sent`);
    }
    if (!data.success) throw new Error(data.error || "Failed to load UOM data");

    const map = {};
    for (const p of data.data || []) {
        if (p.has_uom) map[p.id] = p.uom_units || [];
    }
    return map;
};

const getUomMap = () => {
    if (!isSameOriginBackend()) return Promise.resolve({});
    if (!uomMapPromise) {
        uomMapPromise = fetchLegacyUomMap().catch((err) => {
            console.warn("[legacy-uom] ajax.php getProducts failed, UOM selector will be unavailable:", err.message);
            uomMapPromise = null; // allow a later fetchProducts call to retry
            return {};
        });
    }
    return uomMapPromise;
};

export const fetchProducts = async ({ categoryId, search } = {}) => {
    const params = new URLSearchParams();
    if (categoryId) params.set("category", categoryId);
    if (search) params.set("search", search);

    const query = params.toString();
    const [data, uomMap] = await Promise.all([get(`/api/pos/products/index.php${query ? `?${query}` : ""}`), getUomMap()]);

    return data.products.map((raw) => {
        const product = normalizeProduct(raw);
        if (product.hasUom || !uomMap[product.id]) return product;
        return { ...product, hasUom: true, uomUnits: uomMap[product.id] };
    });
};
