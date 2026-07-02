import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import usePosStore from "../stores/posStore";

const VARIANTS = {
    success: { icon: CheckCircle2, className: "bg-emerald-500 shadow-emerald-500/30" },
    warning: { icon: AlertTriangle, className: "bg-amber-500 shadow-amber-500/30" },
    info: { icon: RefreshCw, className: "bg-blue-500 shadow-blue-500/30" },
};

function CartToast() {
    const toast = usePosStore((state) => state.toast);

    if (!toast) return null;

    const { icon: Icon, className } = VARIANTS[toast.type] || VARIANTS.success;

    return (
        <div
            key={toast.id}
            className={`fixed top-4 left-1/2 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl text-white font-semibold shadow-lg animate-[toast-in_0.2s_ease-out_forwards] ${className}`}
        >
            <Icon size={18} className="shrink-0" />
            <span className="text-sm">{toast.message}</span>
        </div>
    );
}

export default CartToast;
