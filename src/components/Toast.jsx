import { CheckCircle2 } from "lucide-react";

// Prop-driven sibling of features/pos/Components/CartToast.jsx — same visual
// style, but for callers (e.g. modals) that aren't wired to posStore.
function Toast({ message }) {
    if (!message) return null;

    return (
        <div className="fixed top-4 left-1/2 z-[70] flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/30 animate-[toast-in_0.2s_ease-out_forwards]">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="text-sm">{message}</span>
        </div>
    );
}

export default Toast;
