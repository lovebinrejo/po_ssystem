import { handleUnauthorized } from "./authGuard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const buildUrl = (path) => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

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
const CONNECTION_ERROR_MESSAGE = "Unable to connect to the server. Please check your network connection and try again.";

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
        throw new Error(CONNECTION_ERROR_MESSAGE);
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
