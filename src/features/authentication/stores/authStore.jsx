import { create } from "zustand";

const loadStoredUser = () => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
};

const loadStoredTerminalConfig = () => {
    const raw = localStorage.getItem("terminalConfig");
    return raw ? JSON.parse(raw) : null;
};

const useAuthStore = create((set) => ({
    user: loadStoredUser(),
    token: localStorage.getItem("token"),
    terminalConfig: loadStoredTerminalConfig(),
    setUser: (user) => {
        localStorage.setItem("user", JSON.stringify(user));
        set({ user });
    },
    setToken: (token) => {
        localStorage.setItem("token", token);
        set({ token });
    },
    setTerminalConfig: (terminalConfig) => {
        localStorage.setItem("terminalConfig", JSON.stringify(terminalConfig));
        set({ terminalConfig });
    },
    logout: () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("terminalConfig");
        set({ user: null, token: null, terminalConfig: null });
    },
}));

export default useAuthStore;
