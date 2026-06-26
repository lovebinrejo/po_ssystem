import { useNavigate, Outlet } from "react-router-dom";
import PosNavbar from "./PosNavbar";
import PosSidebar from "./PosSidebar";
import usePosStore from "../features/pos/stores/posStore";
import useAuthStore from "../features/authentication/stores/authStore";

function DashboardLayout() {
    const navigate = useNavigate();
    const clearCart = usePosStore((state) => state.clearCart);
    const authLogout = useAuthStore((state) => state.logout);

    const logout = () => {
        authLogout();
        navigate("/login");
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <PosNavbar onNewSale={clearCart} />
            <div className="flex flex-1 overflow-hidden">
                <PosSidebar onLogout={logout} />
                <div className="flex-1 min-h-0 overflow-y-auto soft-scrollbar p-6 bg-white dark:bg-gray-950">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default DashboardLayout;
