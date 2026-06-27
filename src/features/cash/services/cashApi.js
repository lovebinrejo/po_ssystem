const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ENDPOINT = "/api/pos/cash_control/index.php";

const authHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { "X-API-Key": token } : {};
};

const get = async (params) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}${ENDPOINT}?${query}`, {
        headers: authHeaders(),
    });
    return response.json();
};

// openSession/closeSession read $_POST directly (no JSON body support server-side),
// so this must be a real form-urlencoded POST, not the JSON helper in services/axios.js.
const postForm = async (params) => {
    const query = new URLSearchParams({ action: params.action }).toString();
    const body = new URLSearchParams(params);
    const response = await fetch(`${API_BASE_URL}${ENDPOINT}?${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...authHeaders() },
        body,
    });
    return response.json();
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
