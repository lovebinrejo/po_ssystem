import { Ban, Clock, CreditCard, UserCheck, Wrench } from "lucide-react";

// Shared status vocabulary for both the Rooms and Tables floor-plan modals.
export const TABLE_STATUS = {
    AVAILABLE: "available",
    OCCUPIED: "occupied",
    RESERVED: "reserved",
    BILLING: "billing",
    DISABLED: "disabled",
    MAINTENANCE: "maintenance",
};

export const STATUS_ORDER = ["available", "occupied", "reserved", "billing", "disabled", "maintenance"];

export const STATUS_META = {
    available: {
        label: "Available",
        icon: null,
        border: "border-emerald-400",
        badge: "bg-emerald-500",
        glow: "hover:shadow-emerald-300/60 dark:hover:shadow-emerald-500/30",
    },
    occupied: {
        label: "Occupied",
        icon: UserCheck,
        border: "border-red-400",
        badge: "bg-red-500",
        glow: "",
    },
    reserved: {
        label: "Reserved",
        icon: Clock,
        border: "border-amber-400",
        badge: "bg-amber-500",
        glow: "",
    },
    billing: {
        label: "Billing",
        icon: CreditCard,
        border: "border-sky-400",
        badge: "bg-sky-500",
        glow: "",
    },
    disabled: {
        label: "Disabled",
        icon: Ban,
        border: "border-gray-400 dark:border-slate-600",
        badge: "bg-gray-700 dark:bg-slate-600",
        glow: "",
    },
    maintenance: {
        label: "Maintenance",
        icon: Wrench,
        border: "border-orange-400",
        badge: "bg-orange-600",
        glow: "",
    },
};
