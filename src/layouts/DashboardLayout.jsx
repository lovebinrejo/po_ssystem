import { useNavigate, Outlet } from "react-router-dom";
import PosNavbar from "./PosNavbar";
import PosSidebar from "./PosSidebar";
import useAuthStore from "../features/authentication/stores/authStore";
import usePosStore from "../features/pos/stores/posStore";

function DashboardLayout() {
    const navigate = useNavigate();
    const authLogout = useAuthStore((state) => state.logout);
    const cashSessionOpen = usePosStore((state) => state.cashSessionOpen);

    const logout = () => {
        authLogout();
        navigate("/login");
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <PosNavbar />
            <div className="flex flex-1 overflow-hidden">
                <PosSidebar onLogout={logout} />
                <div
                    className={`flex-1 min-h-0 soft-scrollbar pt-2 pb-2 pl-2 pr-2 bg-white dark:bg-gray-950 ${
                        cashSessionOpen ? "overflow-y-auto" : "overflow-hidden"
                    }`}
                    onWheel={cashSessionOpen ? undefined : (e) => e.preventDefault()}
                    onTouchMove={cashSessionOpen ? undefined : (e) => e.preventDefault()}
                >
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default DashboardLayout;
