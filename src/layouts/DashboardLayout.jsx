import { useNavigate, Outlet } from "react-router-dom";
import PosNavbar from "./PosNavbar";
import PosSidebar from "./PosSidebar";
import useAuthStore from "../features/authentication/stores/authStore";

function DashboardLayout() {
    const navigate = useNavigate();
    const authLogout = useAuthStore((state) => state.logout);

    const logout = () => {
        authLogout();
        navigate("/login");
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <PosNavbar />
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
