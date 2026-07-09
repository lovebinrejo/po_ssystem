import { useEffect, useRef, useState } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../context/ThemeContext";
import useAuthStore from "../features/authentication/stores/authStore";
import CashDeskModal from "../features/cash/Components/CashDeskModal";
import ReportsModal from "../features/reports/Components/ReportsModal";
import RoomsModal from "../features/tables/Components/RoomsModal";
import TablesModal from "../features/tables/Components/TablesModal";
import { getActiveSession } from "../features/cash/services/cashApi";
import usePosStore from "../features/pos/stores/posStore";
import { initCache, refreshCache } from "../services/posCache";

// Mirrors legacy's sidebar tooltip behavior: a custom instant show/hide
// tooltip instead of the native `title` attribute. Native title tooltips have
// OS/browser-controlled appear/disappear timing (slow, inconsistent, can't be
// tuned) — legacy explicitly strips `title` and builds its own body-level
// tooltip shown on mouseenter and hidden on mouseleave for this reason.
function NavIcon({ icon: Icon, badge, onClick, title, className = "", iconClassName = "", disabled = false }) {
    const [hovered, setHovered] = useState(false);
    const [tooltipTop, setTooltipTop] = useState(0);
    const btnRef = useRef(null);

    const handleMouseEnter = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setTooltipTop(rect.top + rect.height / 2);
        }
        setHovered(true);
    };

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={onClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setHovered(false)}
                aria-label={title}
                disabled={disabled}
                className={`relative w-full h-11 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-60 disabled:pointer-events-none ${className}`}
            >
                <Icon size={19} className={iconClassName} />
                {badge != null && (
                    <span className="absolute top-1 right-3 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] leading-[15px] text-white text-center bg-red-500">
                        {badge}
                    </span>
                )}
            </button>
            {hovered && title && (
                <div
                    className="fixed z-[100] left-14 ml-2 -translate-y-1/2 px-2.5 py-1.5 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap shadow-lg pointer-events-none"
                    style={{ top: tooltipTop }}
                >
                    {title}
                </div>
            )}
        </>
    );
}

function PosSidebar({ onLogout }) {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const user = useAuthStore((state) => state.user);
    const terminalConfig = useAuthStore((state) => state.terminalConfig);
    const terminalNumber = terminalConfig?.terminalNumber ?? terminalConfig?.terminal_number ??1;
    const userTitle = user ? `${user.fullname || user.login}${user.admin ? " | Administrator" : ""}` : "User";
    const [cashDeskOpen, setCashDeskOpen] = useState(false);
    const [reportsOpen, setReportsOpen] = useState(false);
    const [roomsOpen, setRoomsOpen] = useState(false);
    const [tablesOpen, setTablesOpen] = useState(false);
    const cashSessionOpen = usePosStore((state) => state.cashSessionOpen);
    const setCashSessionOpen = usePosStore((state) => state.setCashSessionOpen);
    const showToast = usePosStore((state) => state.showToast);
    const queryClient = useQueryClient();
    const [syncing, setSyncing] = useState(false);

    // Mirrors legacy's cache system auto-loading on POS entry (pos-cache-integration.js
    // initializeCacheSystem()): loads from localStorage if still fresh, else
    // fetches products/customers/categories from the server once.
    useEffect(() => {
        initCache().then(() => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["categories"] });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Mirrors legacy's syncCacheFromNav(): force a fresh pull of everything
    // from the server, overwrite the cache, and refresh what's on screen.
    const handleSyncCache = async () => {
        setSyncing(true);
        showToast("🔄 Syncing data from server...", "info");
        try {
            const result = await refreshCache();
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["products"] }),
                queryClient.invalidateQueries({ queryKey: ["categories"] }),
            ]);
            showToast(`✅ Sync complete! ${result.products.length} products, ${result.customers.length} customers`);
        } catch (err) {
            showToast(`❌ Sync failed: ${err.message || "Unknown error"}`);
        } finally {
            setSyncing(false);
        }
    };

    // Mirrors legacy takeposnew's pos-cash-manager.js: on entering the POS,
    // check for an active cash session, lock down POS operations if none
    // exists (see cashSessionOpen in posStore), and auto-prompt to open one
    // (after a short delay) instead of waiting for a manual click.
    useEffect(() => {
        let cancelled = false;
        getActiveSession(terminalNumber)
            .then((res) => {
                if (cancelled) return;
                if (res.success) {
                    setCashSessionOpen(!!res.session);
                    if (!res.session) {
                        setTimeout(() => {
                            if (!cancelled) setCashDeskOpen(true);
                        }, 1000);
                    }
                }
            })
            .catch((err) => {
                if (cancelled) return;
                // Left uncaught, this silently leaves cashSessionOpen at its
                // optimistic default (true) forever, so the POS looks fully
                // operational even though nothing can actually reach the
                // server — surface it instead of failing silently.
                showToast(err.message || "Unable to reach the server", "error");
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <aside className="w-14 bg-[var(--text-navy)] h-full overflow-y-auto shrink-0 flex flex-col">
            <NavIcon icon={Home} title="Home" onClick={() => navigate("/pos")} />
            <NavIcon icon={theme === "dark" ? Sun : Moon} title="Dark/Light Mode" onClick={toggleTheme} />
            <NavIcon icon={Grid3x3} title="Tables" onClick={() => setTablesOpen(true)} />
            <NavIcon icon={BedDouble} title="Rooms" onClick={() => setRoomsOpen(true)} />
            <NavIcon
                icon={Banknote}
                title={cashSessionOpen ? "Close Cash Desk" : "Open Cash Desk"}
                onClick={() => setCashDeskOpen(true)}
            />
            <NavIcon icon={BarChart2} title="Reports" onClick={() => setReportsOpen(true)} />
            <NavIcon
                icon={RefreshCw}
                title="Sync Data (Refresh Cache)"
                onClick={handleSyncCache}
                iconClassName={syncing ? "animate-spin" : ""}
                disabled={syncing}
            />

            <div className="mt-auto flex flex-col">
                <NavIcon icon={Monitor} title={`Terminal ${terminalNumber}`} badge={terminalNumber} />
                <NavIcon icon={Clock} title="Clock In" />
                <NavIcon icon={User} title={userTitle} />
                <NavIcon icon={Power} title="Logout" onClick={onLogout} />
            </div>

            <CashDeskModal open={cashDeskOpen} onClose={() => setCashDeskOpen(false)} onLogout={onLogout} />
            <ReportsModal open={reportsOpen} onClose={() => setReportsOpen(false)} />
            <RoomsModal open={roomsOpen} onClose={() => setRoomsOpen(false)} />
            <TablesModal open={tablesOpen} onClose={() => setTablesOpen(false)} />
        </aside>
    );
}

export default PosSidebar;
