import { get } from "../../../services/axios";
import { getApiBaseUrl, isSameOriginBackend, buildRequestUrl, dynamicProxyHeaders } from "../../../services/apiConfig";


const getApiOrigin = () => {
    const rawBase = getApiBaseUrl();
    return /^https?:\/\//.test(rawBase) ? new URL(rawBase).origin : "";
};

// The legacy API returns domain-relative photo paths (e.g. "/ecuenta9/htdocs/takeposnew/genimg/...").
export const buildProductImageUrl = (photoPath) => (photoPath ? `${getApiOrigin()}${photoPath}` : null);


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
