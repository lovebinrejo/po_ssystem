import { useRef, useState } from "react";
import { loginUser } from "../services/authService";
import useAuthStore from "../stores/authStore";
import usePosStore from "../../pos/stores/posStore";

export const useLogin = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const setUser = useAuthStore((state) => state.setUser);
    const setToken = useAuthStore((state) => state.setToken);
    const setTerminalConfig = useAuthStore((state) => state.setTerminalConfig);
    const stampLoginTime = usePosStore((state) => state.stampLoginTime);
    // Disabling the button on `loading` covers the normal case, but a fast
    // double-click can fire both events before React commits that re-render
    // — this ref is checked synchronously, so it closes that race regardless
    // of render timing (confirmed live: without it, a rapid double-click
    // fired two concurrent POST /api/login/index.php requests).
    const submittingRef = useRef(false);

    const login = async (email, password, masterEntity) => {
        if (submittingRef.current) return { success: false };
        submittingRef.current = true;
        try {
            setLoading(true);
            setError("");
            const result = await loginUser({ email, password, masterEntity });

            setUser(result.user);
            setToken(result.token);
            setTerminalConfig(result.terminalConfig);
            stampLoginTime();

            // Prints exactly what this login resolved for the terminal —
            // default customer, warehouse, and which payment methods have a
            // bank account configured — so a config change made in Dolibarr
            // (CASHDESK_ID_* consts) can be confirmed live in devtools
            // without re-deriving it from the network tab's login response.
            console.info(`[terminal-config] Terminal ${result.terminalConfig?.terminalNumber}:`, {
                defaultCustomerId: result.terminalConfig?.defaultCustomerId,
                warehouseId: result.terminalConfig?.warehouse_id,
                paymentMethods: result.terminalConfig?.payment_methods,
                passcodeEnabled: result.terminalConfig?.passcode_enabled,
            });

            return result;
        } catch (err) {
            const message = err.response?.data?.message || "Login failed";
            setError(message);
            throw err;
        } finally {
            setLoading(false);
            submittingRef.current = false;
        }
    };

    return { login, loading, error };
};
