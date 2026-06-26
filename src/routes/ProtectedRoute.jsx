import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { isTokenExpired } from "../utils/jwt";
import useAuthStore from "../features/authentication/stores/authStore";

function ProtectRoute({ children }) {
    const token = localStorage.getItem("token");
    const logout = useAuthStore((state) => state.logout);
    const expired = !token || isTokenExpired(token);

    useEffect(() => {
        if (expired) logout();
    }, [expired, logout]);

    if (expired) {
        return <Navigate to="/login" />;
    }
    return children;
}
export default ProtectRoute;