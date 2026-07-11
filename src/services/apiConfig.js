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

// Blank/whitespace input is a no-op — this is an optional override on the
// login form, not a required field, so leaving it empty must not clobber a
// previously-set (or default) backend.
export const setApiBaseUrl = (input) => {
    const normalized = normalizeBackendUrl(input);
    if (!normalized) return;
    localStorage.setItem(STORAGE_KEY, normalized);
};

// Session-cookie tricks (establishLegacySession, createCustomerViaLegacy,
// the takeposnew reports_data.php path) only work when the configured
// backend is genuinely the same origin this app is served from — that's a
// hard browser constraint (no CORS headers on those legacy files, cookies
// don't cross origins), not a build-mode preference. Previously this was
// gated on `MODE === "htdocs"`, which was correct as long as the backend URL
// was fixed at build time; now that it's user-overridable from the login
// screen (e.g. pointed at a cross-origin demo server), the real same-origin
// relationship has to be checked directly instead.
export const isSameOriginBackend = () => {
    try {
        return new URL(getApiBaseUrl(), window.location.origin).origin === window.location.origin;
    } catch {
        return false;
    }
};
