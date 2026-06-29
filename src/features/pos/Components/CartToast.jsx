import { CheckCircle2 } from "lucide-react";
import usePosStore from "../stores/posStore";

function CartToast() {
    const toast = usePosStore((state) => state.toast);

    if (!toast) return null;

    return (
        <div
            key={toast.id}
            className="fixed top-4 left-1/2 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/30 animate-[toast-in_0.2s_ease-out_forwards]"
        >
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="text-sm">{toast.message}</span>
        </div>
    );
}

export default CartToast;
