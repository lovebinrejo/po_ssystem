import { useState } from "react";
import { loginUser } from "../services/authService";
import useAuthStore from "../stores/authStore";

export const useLogin = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const setUser = useAuthStore((state) => state.setUser);
    const setToken = useAuthStore((state) => state.setToken);
    const setTerminalConfig = useAuthStore((state) => state.setTerminalConfig);

    const login = async (email, password, masterEntity) => {
        try {
            setLoading(true);
            setError("");
            const result = await loginUser({ email, password, masterEntity });

            setUser(result.user);
            setToken(result.token);
            setTerminalConfig(result.terminalConfig);

            return result;
        } catch (err) {
            const message = err.response?.data?.message || "Login failed";
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { login, loading, error };
};
