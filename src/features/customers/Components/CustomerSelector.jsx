import { useEffect, useRef, useState } from "react";
import { Search, UserPlus, X, ChevronDown, Phone, Mail, IdCard } from "lucide-react";
import { useCustomers } from "../hooks/useCustomers";
import useCustomerStore from "../stores/customerStore";
import useAuthStore from "../../authentication/stores/authStore";
import { fetchCustomerById } from "../services/customerApi";
import AddCustomerModal from "./AddCustomerModal";

const getInitials = (name = "") =>
    name
        .trim()
        .split(" ")
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join("");

function CustomerSelector() {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [addCustomerOpen, setAddCustomerOpen] = useState(false);
    const { customers, loading } = useCustomers(query);
    const selectedCustomer = useCustomerStore((state) => state.selectedCustomer);
    const setSelectedCustomer = useCustomerStore((state) => state.setSelectedCustomer);
    const terminalConfig = useAuthStore((state) => state.terminalConfig);
    const containerRef = useRef(null);
    const loadedDefault = useRef(false);

    // Mirrors legacy's loadDefaultCustomer(): auto-select the terminal's
    // configured default customer (TAKEPOS_DEFAULT_CUSTOMER) once, on load.
    useEffect(() => {
        if (loadedDefault.current || selectedCustomer) return;
        const defaultId = terminalConfig?.defaultCustomerId;
        if (!defaultId) return;
        loadedDefault.current = true;
        fetchCustomerById(defaultId)
            .then((customer) => {
                if (customer) setSelectedCustomer(customer);
            })
            .catch(() => {});
    }, [terminalConfig, selectedCustomer, setSelectedCustomer]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (customer) => {
        setSelectedCustomer(customer);
        setQuery("");
        setOpen(false);
    };

    const handleClear = () => {
        setSelectedCustomer(null);
        setQuery("");
    };

    const handleCustomerCreated = (customer) => {
        setSelectedCustomer(customer);
        setQuery("");
        setAddCustomerOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            {selectedCustomer && !open ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="w-full flex items-center justify-between gap-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-xs sm:text-sm rounded-md sm:rounded-lg pl-3 pr-2 py-1 sm:py-1.5 border-2 border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                >
                    <span className="truncate">
                        {selectedCustomer.name} (TPIN: {selectedCustomer.tpin || "—"})
                    </span>
                    <ChevronDown size={16} className="shrink-0 text-gray-500 dark:text-slate-400" />
                </button>
            ) : (
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        placeholder="Search Ex: Customer Name, TPIN, Phone, Email"
                        autoFocus={open}
                        className="w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-xs sm:text-sm rounded-md sm:rounded-lg pl-8 sm:pl-9 pr-7 sm:pr-8 py-2 sm:py-2.5 border-2 border-gray-300 dark:border-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/40 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    />
                </div>
            )}

            {open && (
                <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto soft-scrollbar rounded-lg border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl">
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            setAddCustomerOpen(true);
                        }}
                        className="sticky top-0 z-10 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-blue-600 dark:text-blue-300 text-xs sm:text-sm font-semibold bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 border-b border-gray-200 dark:border-slate-700"
                    >
                        <UserPlus size={14} />
                        Add New Customer
                    </button>

                    {selectedCustomer && (
                        <button
                            type="button"
                            onClick={() => {
                                handleClear();
                                setOpen(false);
                            }}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-red-600 dark:text-red-400 text-xs sm:text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-500/10 border-b border-gray-200 dark:border-slate-700"
                        >
                            <X size={14} />
                            Clear Selected Customer
                        </button>
                    )}

                    {query.trim().length >= 2 &&
                        (loading ? (
                            <div className="px-3 py-3 text-xs sm:text-sm text-gray-500 dark:text-slate-400">Searching...</div>
                        ) : customers.length === 0 ? (
                            <div className="px-3 py-3 text-xs sm:text-sm text-gray-500 dark:text-slate-400">No customers found</div>
                        ) : (
                            customers.map((customer) => (
                                <button
                                    key={customer.id}
                                    type="button"
                                    onClick={() => handleSelect(customer)}
                                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-700 last:border-0"
                                >
                                    <div className="text-sm text-gray-900 dark:text-white font-medium truncate">{customer.name}</div>
                                    <div className="text-xs text-blue-600 dark:text-blue-400">TPIN: {customer.tpin || "—"}</div>
                                    <div className="text-xs text-gray-500 dark:text-slate-400 truncate">{customer.phone || customer.email || ""}</div>
                                </button>
                            ))
                        ))}
                </div>
            )}

            {selectedCustomer && (
                <div
                    style={{ fontFamily: "var(--font-app)" }}
                    className="mt-1 sm:mt-2 flex items-start gap-1.5 sm:gap-2 bg-white dark:bg-slate-800/70 border border-gray-100 dark:border-slate-700 shadow-sm rounded-lg sm:rounded-xl p-1 sm:p-1.5"
                >
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-pink-600 text-white flex items-center justify-center text-[10px] sm:text-sm font-semibold shrink-0">
                            {getInitials(selectedCustomer.name)}
                        </div>
                        <div className="min-w-0">
                            <div className="text-gray-900 dark:text-white text-xs sm:text-sm font-bold truncate leading-tight">{selectedCustomer.name}</div>
                        </div>
                    </div>
                    <div className="min-w-0 max-w-[42%] sm:max-w-[45%] space-y-0.5">
                        <div className="flex items-center gap-1 min-w-0 text-[#397db9] dark:text-blue-300 text-[10px] sm:text-[11px] font-bold leading-tight">
                            <IdCard size={10} className="shrink-0" />
                            <span className="truncate">TPIN: {selectedCustomer.tpin || "—"}</span>
                        </div>
                        {selectedCustomer.phone && (
                            <div className="flex items-center gap-1 min-w-0 text-[#397db9]/90 dark:text-blue-300/80 text-[10px] sm:text-[11px] font-bold leading-tight">
                                <Phone size={10} className="shrink-0" />
                                <span className="truncate">{selectedCustomer.phone}</span>
                            </div>
                        )}
                        {selectedCustomer.email && (
                            <div className="flex items-center gap-1 min-w-0 text-[#397db9]/80 dark:text-blue-300/70 text-[10px] sm:text-[11px] font-bold leading-tight">
                                <Mail size={10} className="shrink-0" />
                                <span className="truncate">{selectedCustomer.email}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <AddCustomerModal
                open={addCustomerOpen}
                onClose={() => setAddCustomerOpen(false)}
                onCreated={handleCustomerCreated}
            />
        </div>
    );
}

export default CustomerSelector;
