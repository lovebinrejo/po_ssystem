import { handleUnauthorized } from "./authGuard";
import { getApiBaseUrl } from "./apiConfig";

const buildUrl = (path) => `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

const authHeaders = () => {
    const token = localStorage.getItem("token");
    // The legacy api/pos/* endpoints authenticate via auth_helper.php's
    // authenticate_bearer_token(), which reads X-API-Key (not Authorization: Bearer).
    return token ? { "X-API-Key": token } : {};
};

// The server being unreachable (backend down, no network) throws a raw
// TypeError from fetch() itself — "Failed to fetch" — before any response
// exists. Left unhandled, that literal technical string ends up rendered
// straight into the UI wherever a caller shows err.message. Convert it to a
// message a cashier can actually act on.
//
// One more case collapses into this exact same "Failed to fetch" with no way
// to tell it apart: a cross-origin request to an endpoint that doesn't exist
// on the currently configured backend (404) also throws here, before the
// response.status===404 branch below ever runs — because CORS headers are
// only added by our own PHP once it's running, and a 404 means that file
// never ran, so the browser blocks the response for missing CORS headers and
// deliberately hides the real status from JS entirely (by design, not a bug
// we can work around). Verified live: pointing the backend URL at
// demo1.ecuenta.online and calling an endpoint that only exists on the local
// server produces the identical "Failed to fetch" as genuinely unplugging
// the network. The wording below stays honest about that ambiguity instead
// of confidently (and sometimes wrongly) blaming the network.
const CONNECTION_ERROR_MESSAGE =
    "Unable to reach the server. Check your network connection, or this feature may not be available on the currently configured server.";

const request = async (path, { method = "GET", body, headers = {} } = {}) => {
    let response;
    try {
        response = await fetch(buildUrl(path), {
            method,
            headers: {
                ...(body ? { "Content-Type": "application/json" } : {}),
                ...authHeaders(),
                ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new Error(CONNECTION_ERROR_MESSAGE);
    }

    if (response.status === 401) {
        handleUnauthorized();
        throw new Error("Session expired — please log in again");
    }

    let data;
    try {
        data = await response.json();
    } catch {
        // Reached the server, but got back something that isn't JSON — most
        // commonly a raw Apache/PHP error page rather than this app's own
        // JSON error handling. A 404 specifically means the endpoint itself
        // doesn't exist on whatever backend URL is currently configured
        // (e.g. an endpoint only deployed locally, not to every environment
        // the "Backend URL" login field can point at) — a real, honest
        // "not available here" rather than a network failure, so it
        // shouldn't be reported as CONNECTION_ERROR_MESSAGE (which previously
        // fired for this case too, misleadingly suggesting the server was
        // unreachable when it had actually responded).
        if (response.status === 404) {
            throw new Error("This feature isn't available on the currently configured server.");
        }
        // A 200 with a non-JSON body means the endpoint file exists and ran,
        // but hit a PHP-level failure before it could emit JSON — PHP errors
        // don't set a non-2xx status by default. Verified live against
        // demo.ecuenta.online: api/pos/receipt/index.php returns HTTP 200
        // with the literal body "Include of main fails" (a broken include
        // path in that specific deployment) — a server misconfiguration on
        // that install, not something this app can work around client-side.
        if (response.status >= 200 && response.status < 300) {
            throw new Error("This feature is misconfigured on the currently configured server. Please contact support.");
        }
        throw new Error(`Unexpected response from the server (HTTP ${response.status}). Please try again.`);
    }

    if (!response.ok) {
        const message = data?.message || "Request failed";
        const error = new Error(message);
        error.response = { data };
        throw error;
    }

    return data;
};

export const get = (path, options) => request(path, { ...options, method: "GET" });
export const post = (path, body, options) => request(path, { ...options, method: "POST", body });
