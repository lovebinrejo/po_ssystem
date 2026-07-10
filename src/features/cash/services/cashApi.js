import { handleUnauthorized } from "../../../services/authGuard";
import { getApiBaseUrl } from "../../../services/apiConfig";

const ENDPOINT = "/api/pos/cash_control/index.php";

const authHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { "X-API-Key": token } : {};
};

// Mirrors services/axios.js's fix: fetch() itself throws a raw "Failed to
// fetch" TypeError when the server is unreachable, before any response
// exists — convert it to a message a cashier can actually act on instead of
// letting the literal technical string reach the UI.
const CONNECTION_ERROR_MESSAGE = "Unable to connect to the server. Please check your network connection and try again.";

const get = async (params) => {
    const query = new URLSearchParams(params).toString();
    let response;
    try {
        response = await fetch(`${getApiBaseUrl()}${ENDPOINT}?${query}`, {
            headers: authHeaders(),
        });
    } catch {
        throw new Error(CONNECTION_ERROR_MESSAGE);
    }
    if (response.status === 401) {
        handleUnauthorized();
        throw new Error("Session expired — please log in again");
    }
    try {
        return await response.json();
    } catch {
        throw new Error(CONNECTION_ERROR_MESSAGE);
    }
};

// openSession/closeSession read $_POST directly (no JSON body support server-side),
// so this must be a real form-urlencoded POST, not the JSON helper in services/axios.js.
const postForm = async (params) => {
    const query = new URLSearchParams({ action: params.action }).toString();
    const body = new URLSearchParams(params);
    let response;
    try {
        response = await fetch(`${getApiBaseUrl()}${ENDPOINT}?${query}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", ...authHeaders() },
            body,
        });
    } catch {
        throw new Error(CONNECTION_ERROR_MESSAGE);
    }
    if (response.status === 401) {
        handleUnauthorized();
        throw new Error("Session expired — please log in again");
    }
    try {
        return await response.json();
    } catch {
        throw new Error(CONNECTION_ERROR_MESSAGE);
    }
};

export const getActiveSession = (terminal) => get({ action: "getActiveSession", terminal });

export const getTheoreticalAmount = (terminal) => get({ action: "getTheoreticalAmount", terminal });

export const openSession = (terminal, initialAmount) =>
    postForm({ action: "openSession", terminal, initial_amount: initialAmount });

export const getSummary = (sessionId, terminal) => get({ action: "getSummary", session_id: sessionId, terminal });

export const closeSession = (sessionId, terminal, { closingCash, closingCheque, closingCard }) =>
    postForm({
        action: "closeSession",
        terminal,
        session_id: sessionId,
        closing_cash: closingCash,
        closing_cheque: closingCheque,
        closing_card: closingCard,
    });
