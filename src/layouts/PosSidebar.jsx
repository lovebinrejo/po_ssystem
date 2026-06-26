import {
    Home,
    Moon,
    Sun,
    Grid3x3,
    BedDouble,
    Banknote,
    BarChart2,
    RefreshCw,
    Monitor,
    Clock,
    User,
    Power,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import useAuthStore from "../features/authentication/stores/authStore";

function NavIcon({ icon: Icon, badge, onClick, title, className = "" }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`relative w-full h-11 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 ${className}`}
        >
            <Icon size={19} />
            {badge != null && (
                <span className="absolute top-1 right-3 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] leading-[15px] text-white text-center bg-red-500">
                    {badge}
                </span>
            )}
        </button>
    );
}

function PosSidebar({ onLogout }) {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const user = useAuthStore((state) => state.user);
    const terminalConfig = useAuthStore((state) => state.terminalConfig);
    const terminalNumber = terminalConfig?.terminalNumber ?? terminalConfig?.terminal_number ?? 1;
    const userTitle = user ? `${user.fullname || user.login}${user.admin ? " | Administrator" : ""}` : "User";

    return (
        <aside className="w-14 bg-[var(--text-navy)] h-full overflow-y-auto shrink-0 flex flex-col">
            <NavIcon icon={Home} title="Home" onClick={() => navigate("/pos")} />
            <NavIcon icon={theme === "dark" ? Sun : Moon} title="Dark/Light Mode" onClick={toggleTheme} />
            <NavIcon icon={Grid3x3} title="Tables" />
            <NavIcon icon={BedDouble} title="Rooms" />
            <NavIcon icon={Banknote} title="Close Cash Desk" />
            <NavIcon icon={BarChart2} title="Reports" />
            <NavIcon icon={RefreshCw} title="Sync Data (Refresh Cache)" />

            <div className="mt-auto flex flex-col">
                <NavIcon icon={Monitor} title={`Terminal ${terminalNumber}`} badge={terminalNumber} />
                <NavIcon icon={Clock} title="Clock In" />
                <NavIcon icon={User} title={userTitle} />
                <NavIcon icon={Power} title="Logout" onClick={onLogout} />
            </div>
        </aside>
    );
}

export default PosSidebar;
