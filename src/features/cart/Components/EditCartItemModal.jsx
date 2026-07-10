import { useEffect, useRef, useState } from "react";
import { Pencil, X, Minus, Plus, Scale, Tag, Percent, Trash2, Save, Lock } from "lucide-react";
import useAuthStore from "../../authentication/stores/authStore";
import usePosStore from "../../pos/stores/posStore";
import { verifyPricePasscode } from "../services/passcodeApi";

// Same palette/initials rule as ProductGrid, so the avatar matches what the
// shopper saw when they added the item.
const AVATAR_COLORS = ["#F59E0B", "#85C1E2", "#EC4899", "#A78BFA", "#10B981", "#F472B6", "#60A5FA", "#34D399"];

const getInitials = (name = "Product") => {
    const words = name.trim().split(" ");
    if (words.length >= 2) {
        return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
};

const getAvatarColor = (productId) => AVATAR_COLORS[(productId || 0) % AVATAR_COLORS.length];

function EditCartItemModal({ item, onClose, onSave, onRemove }) {
    const terminalConfig = useAuthStore((state) => state.terminalConfig);
    const terminalNumber = terminalConfig?.terminalNumber || 1;
    // Mirrors legacy's isPasscodeRequired() (pos-cart-editor.js) — the gate is
    // per-terminal (TAKEPOS_ENABLE_PASSCODE{n}, surfaced by api/login as
    // terminal_config.passcode_enabled), not always-on.
    const passcodeEnabled = !!terminalConfig?.passcode_enabled;
    const showToast = usePosStore((state) => state.showToast);
    const overlayRef = useRef(null);

    const [qty, setQty] = useState(1);
    const [reduceStock, setReduceStock] = useState(true);
    const [priceLocked, setPriceLocked] = useState(true);
    const [priceUnlocked, setPriceUnlocked] = useState(false);
    const [unitPrice, setUnitPrice] = useState(0);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [passcodePanelOpen, setPasscodePanelOpen] = useState(false);
    const [passcodeValue, setPasscodeValue] = useState("");
    const [passcodeError, setPasscodeError] = useState("");
    const [verifyingPasscode, setVerifyingPasscode] = useState(false);
    const [originalPrice, setOriginalPrice] = useState(0);

    useEffect(() => {
        if (item) {
            setQty(item.qty);
            setUnitPrice(item.price);
            setOriginalPrice(item.price);
            setDiscountPercent(item.discountPercent || 0);
            setReduceStock(item.reduceStock ?? true);
            setPriceLocked(passcodeEnabled);
            setPriceUnlocked(!passcodeEnabled);
            setPasscodePanelOpen(false);
            setPasscodeValue("");
            setPasscodeError("");
        }
    }, [item, passcodeEnabled]);

    // Prevent the product grid behind the overlay from scrolling while this
    // modal is open. Mirrors ReportsModal's fix: DashboardLayout's content
    // pane has its own explicit overflow-y-auto (independent of document.body),
    // so a wheel/touch gesture over the backdrop still reaches the grid
    // underneath even though it's visually covered. React's onWheel/onTouchMove
    // props attach passive listeners, so preventDefault() there is silently
    // ignored — needs a manually-attached non-passive listener instead. The
    // modal's own scrollable card is excluded so it keeps scrolling normally.
    useEffect(() => {
        if (!item) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const blockBackgroundScroll = (e) => {
            if (!e.target.closest(".edit-cart-item-scroll")) {
                e.preventDefault();
            }
        };
        const node = overlayRef.current;
        node?.addEventListener("wheel", blockBackgroundScroll, { passive: false });
        node?.addEventListener("touchmove", blockBackgroundScroll, { passive: false });

        return () => {
            document.body.style.overflow = previousOverflow;
            node?.removeEventListener("wheel", blockBackgroundScroll);
            node?.removeEventListener("touchmove", blockBackgroundScroll);
        };
    }, [item]);

    if (!item) return null;

    const subtotal = unitPrice * qty;
    const discountAmount = subtotal * (discountPercent / 100);
    const lineTotal = subtotal - discountAmount;

    // Clicking/focusing the price field either unlocks it directly (passcode
    // gate off for this terminal, or already unlocked this session) or shows
    // the passcode panel. Mirrors legacy's handlePriceEditRequest().
    const handlePriceFieldInteract = () => {
        if (!passcodeEnabled || priceUnlocked) {
            setPriceLocked(false);
            setPasscodePanelOpen(false);
            return;
        }
        setPriceLocked(true);
        setPasscodePanelOpen(true);
    };

    const handleVerifyPasscode = async () => {
        const trimmed = passcodeValue.trim();
        if (!trimmed) {
            setPasscodeError("Please enter a valid passcode.");
            return;
        }
        setVerifyingPasscode(true);
        setPasscodeError("");
        try {
            const res = await verifyPricePasscode(terminalNumber, trimmed);
            if (res.authenticated) {
                setPriceUnlocked(true);
                setPriceLocked(false);
                setPasscodePanelOpen(false);
                setPasscodeValue("");
            } else {
                setPasscodeError("Passcode is incorrect. Please try again.");
                showToast("Passcode is incorrect. Please try again.", "error");
            }
        } catch (err) {
            const message = err.message || "Unable to verify passcode right now.";
            setPasscodeError(message);
            showToast(message, "error");
        } finally {
            setVerifyingPasscode(false);
        }
    };

    const priceChanged = Math.round(unitPrice * 100) !== Math.round(originalPrice * 100);

    const handleSave = () => {
        // Belt-and-suspenders, mirrors legacy: block the save if the passcode
        // gate is on for this terminal, the price actually changed, and the
        // gate was never cleared.
        if (passcodeEnabled && priceChanged && !priceUnlocked) {
            setPasscodePanelOpen(true);
            setPasscodeError("Passcode is required to change the price");
            showToast("Passcode is required to change the price", "error");
            return;
        }
        onSave(item.id, {
            qty: Math.max(1, qty),
            price: unitPrice,
            discountPercent,
            reduceStock,
        });
        onClose();
    };

    const handleRemove = () => {
        onRemove(item.id);
        onClose();
    };

    return (
        <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="edit-cart-item-scroll w-full max-w-md max-h-[90vh] overflow-y-auto soft-scrollbar rounded-2xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl">
                <div className="flex items-center justify-between px-5 py-2 bg-[#2c6291] rounded-t-2xl text-white">
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <Pencil size={18} />
                        Edit Cart Item
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/20">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-5 py-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-slate-800/70 rounded-xl p-2.5">
                        <div>
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">Ref: {item.ref || "N/A"}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">
                                VAT: {item.vatCode || "N/A"} | Unit: {item.unit || "N/A"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">
                                Total Stock: {item.stock ?? "N/A"}
                            </div>
                        </div>
                        <div
                            className="w-20 h-20 shrink-0 rounded-lg flex items-center justify-center text-white text-3xl font-semibold"
                            style={{ backgroundColor: getAvatarColor(item.id) }}
                        >
                            {getInitials(item.name)}
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                            <Scale size={15} />
                            Quantity / Weight
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setQty((q) => Math.max(1, q - 1))}
                                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                <Minus size={16} />
                            </button>
                            <input
                                type="number"
                                value={qty}
                                onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                                className="flex-1 h-9 text-center rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => setQty((q) => q + 1)}
                                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                <Plus size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setReduceStock((v) => !v)}
                                title="Reduce stock when saving"
                                className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border transition-colors ${
                                    reduceStock
                                        ? "bg-[#2c6291] border-[#2c6291] text-white"
                                        : "border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-300"
                                }`}
                            >
                                <Scale size={16} />
                            </button>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                            Reduce stock when saving — use for weighing scale products (e.g. 0.5 kg, 1.25 kg).
                        </p>
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                            <Tag size={15} />
                            Unit Price
                        </label>
                        <div className="flex items-center gap-2">
                            <span className="px-3 h-9 flex items-center rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-600 dark:text-slate-300">
                                ZMW
                            </span>
                            <input
                                type="number"
                                value={unitPrice}
                                readOnly={priceLocked}
                                onClick={handlePriceFieldInteract}
                                onFocus={handlePriceFieldInteract}
                                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                                className={`flex-1 h-9 px-3 rounded-lg border outline-none focus:border-blue-500 ${
                                    priceLocked
                                        ? "cursor-pointer border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-gray-900 dark:text-white"
                                        : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                }`}
                            />
                        </div>
                        {!passcodePanelOpen && (
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                {passcodeEnabled
                                    ? "Click the price field to unlock it from inside this window."
                                    : "You can edit the unit price directly."}
                            </p>
                        )}

                        {passcodePanelOpen && (
                            <div className="mt-1.5 rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5">
                                <div className="text-[11px] font-semibold text-gray-800 dark:text-amber-200 mb-1.5">
                                    Enter terminal or admin passcode to edit price
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="password"
                                        value={passcodeValue}
                                        onChange={(e) => setPasscodeValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleVerifyPasscode();
                                            }
                                        }}
                                        placeholder="Enter passcode"
                                        autoComplete="off"
                                        className="flex-1 h-8 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleVerifyPasscode}
                                        disabled={verifyingPasscode}
                                        className="shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold text-white bg-[#397db9] hover:bg-[#2c6291] disabled:opacity-60"
                                    >
                                        <Lock size={12} />
                                        {verifyingPasscode ? "Checking..." : "Unlock"}
                                    </button>
                                </div>
                                <p className={`text-[11px] mt-1.5 ${passcodeError ? "text-red-500" : "text-gray-500 dark:text-slate-400"}`}>
                                    {passcodeError || "Authorization is required before changing the unit price."}
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                            <Percent size={15} />
                            Discount
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={discountPercent}
                                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                className="flex-1 h-9 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                            />
                            <span className="px-3 h-9 flex items-center rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-600 dark:text-slate-300">
                                %
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">Enter discount percentage (0-100)</p>
                    </div>

                    <div className="flex justify-between text-sm pt-1">
                        <div>
                            <div className="text-gray-500 dark:text-slate-400">Subtotal</div>
                            <div className="text-base font-semibold">ZMW {subtotal.toFixed(2)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-gray-500 dark:text-slate-400">Discount</div>
                            <div className="text-base font-semibold text-red-500">- ZMW {discountAmount.toFixed(2)}</div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-slate-700 pt-2">
                        <div className="text-gray-500 dark:text-slate-400 text-sm">Line Total</div>
                        <div className="text-xl font-bold text-emerald-500">ZMW {lineTotal.toFixed(2)}</div>
                    </div>
                </div>

                <div className="flex gap-1.5 px-5 py-3 border-t border-gray-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white bg-red-500 hover:bg-red-600"
                    >
                        <Trash2 size={14} />
                        Remove Item
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-gray-700 dark:text-white bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600"
                    >
                        <X size={14} />
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white bg-[#397db9] hover:bg-[#2c6291]"
                    >
                        <Save size={14} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EditCartItemModal;
