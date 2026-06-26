const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const buildUrl = (path) => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const authHeaders = () => {
    const token = localStorage.getItem("token");
    // The legacy api/pos/* endpoints authenticate via auth_helper.php's
    // authenticate_bearer_token(), which reads X-API-Key (not Authorization: Bearer).
    return token ? { "X-API-Key": token } : {};
};

const request = async (path, { method = "GET", body, headers = {} } = {}) => {
    const response = await fetch(buildUrl(path), {
        method,
        headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...authHeaders(),
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

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
