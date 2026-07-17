const STORAGE_KEY = "pos_backend_base_url";

// Accepts whatever URL a user copies out of the browser while using the
// legacy Dolibarr POS (e.g. "https://demo1.ecuenta.online/takeposnew/index.php?place=0")
// and reduces it to the API base every service file expects — the Dolibarr
// docroot itself, sibling to api/, takepos/, takeposnew/ (see
// .env.production's comment on VITE_API_BASE_URL). Also accepts a bare
// domain/base ("https://demo1.ecuenta.online") unchanged. The "/index.php"
// cut handles any other Dolibarr page living directly in the docroot (e.g.
// the dashboard, "https://demo1.ecuenta.online/index.php?mainmenu=dashboard")
// — without it, that URL was left with "/index.php" stuck on the end, so
// every API call built on top of it (e.g. ".../index.php/api/invoices/index.php")
// got routed by Apache's PATH_INFO handling back into Dolibarr's own front
// controller, which returns the HTML login page instead of JSON. Doesn't
// cover Dolibarr pages nested in subfolders (e.g. "/societe/card.php") —
// only ones sitting at the docroot itself, which is what the dashboard/login
// page always is.
export const normalizeBackendUrl = (input) => {
    let url = (input || "").trim();
    if (!url) return "";
    url = url.split("?")[0].split("#")[0].replace(/\/+$/, "");

    const cutAt = (marker) => {
        const idx = url.indexOf(marker);
        return idx === -1 ? null : url.slice(0, idx);
    };
    return cutAt("/takeposnew") ?? cutAt("/takepos") ?? cutAt("/api/") ?? cutAt("/index.php") ?? url;
};

// Falls back to the build-time default (.env / .env.production / .env.htdocs)
// until a user overrides it from the login screen.
export const getApiBaseUrl = () => localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_API_BASE_URL;

// The raw override itself, or "" when none is set — distinct from
// getApiBaseUrl(), which also falls back to the build default. Lets the
// login form show whether an override is actually active instead of always
// rendering blank (see clearApiBaseUrl below for why that distinction
// matters).
export const getBackendUrlOverride = () => localStorage.getItem(STORAGE_KEY) || "";

// Blank/whitespace input is a no-op — this is an optional override on the
// login form, not a required field, so leaving it empty must not clobber a
// previously-set (or default) backend.
export const setApiBaseUrl = (input) => {
    const normalized = normalizeBackendUrl(input);
    if (!normalized) return;
    localStorage.setItem(STORAGE_KEY, normalized);
};

// Reverts to the build-time default. setApiBaseUrl() deliberately can't do
// this (a blank field is a no-op there, not a clear), so without this
// there was no way to undo an override once set — it silently outlived the
// session that set it, surviving across page reloads and even across
// switching which `npm run dev*` mode is running, since every mode's login
// screen shares the same localStorage. That's exactly the "why isn't this
// working" confusion vite.config.js's strictPort comment already describes
// for the port case; this is the same failure mode for the backend URL.
export const clearApiBaseUrl = () => {
    localStorage.removeItem(STORAGE_KEY);
};

// True under `npm run dev:proxy` (see vite.config.js's dynamicBackendProxyPlugin)
// — the one dev mode that works with any backend URL, not just the one
// baked into dev:demo-proxy/dev:wamp-proxy. In this mode every request is
// already forced through legacyFetchUrl/legacyFetchHeaders below regardless
// of isSameOriginBackend(), so this only needs to gate isSameOriginBackend()
// itself.
const isDynamicProxyMode = () => import.meta.env.MODE === "proxy";

// Session-cookie tricks (establishLegacySession, createCustomerViaLegacy,
// the takeposnew reports_data.php path) only work when the configured
// backend is genuinely the same origin this app is served from — that's a
// hard browser constraint (no CORS headers on those legacy files, cookies
// don't cross origins), not a build-mode preference. Previously this was
// gated on `MODE === "htdocs"`, which was correct as long as the backend URL
// was fixed at build time; now that it's user-overridable from the login
// screen (e.g. pointed at a cross-origin demo server), the real same-origin
// relationship has to be checked directly instead.
//
// dev:proxy is a deliberate exception: the browser's own request always
// targets this dev server's own origin there (see legacyFetchUrl below), so
// from the browser's perspective it genuinely IS same-origin regardless of
// what backend the X-Pos-Target header actually points the middleware at —
// same reasoning demo-proxy/wamp-proxy already relied on, just without a
// URL-based check being able to see it (getApiBaseUrl() during dev:proxy
// still holds the *real* backend URL, e.g. "https://demo.ecuenta.online",
// for building that header — window.location.origin would never match it).
export const isSameOriginBackend = () => {
    if (isDynamicProxyMode()) return true;
    try {
        return new URL(getApiBaseUrl(), window.location.origin).origin === window.location.origin;
    } catch {
        return false;
    }
};

// Every request this app makes — axios.js's api/pos/* calls as much as the
// same-origin-only legacy fetch() calls (establishLegacySession,
// createCustomerViaLegacy, reportsApi.js's reports_data.php/payment_summary.php,
// tableApi.js's tables.php) — normally builds its URL as
// `${getApiBaseUrl()}${path}`. Fine outside dev:proxy, but inside it that
// produces a genuinely cross-origin absolute URL again, defeating the whole
// point of that mode. These two helpers are the dev:proxy-aware replacement:
// a relative, same-origin path plus the real target carried in a header
// instead, for vite.config.js's dynamicBackendProxyPlugin to read. Outside
// dev:proxy they degrade to exactly the old behavior (absolute URL, no extra
// header) — routing api/pos/* through them too costs nothing there since
// they were already reachable directly, but it means dev:proxy no longer
// depends on a given backend's api/* CORS headers being correct either
// (every request becomes same-origin from the browser's perspective, so
// CORS never applies in the first place).
export const buildRequestUrl = (path) => (isDynamicProxyMode() ? path : `${getApiBaseUrl()}${path}`);
export const dynamicProxyHeaders = () => (isDynamicProxyMode() ? { "X-Pos-Target": getApiBaseUrl() } : {});
