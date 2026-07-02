import { create } from "zustand";
import { persist } from "zustand/middleware";

// Mirrors legacy takeposnew's parallel-sales time format (pos-state.js getCurrentTime): HH:MM
const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

const usePosStore = create(
    persist(
        (set, get) => ({
            searchTerm: "",

            // Each "sale" is an independent cart the cashier can switch between without
            // losing progress (e.g. serving multiple customers/tables at once) — same
            // `place` concept the legacy POS uses for table/parallel-sale invoice refs.
            sales: [{ place: "0", time: getCurrentTime() }],
            activePlace: "0",
            cartsByPlace: { "0": [] },
            cart: [],
            toast: null,

            // Set while a cart holds lines loaded from an already-validated Reports
            // invoice (legacy: "Pending Payment Mode") instead of a fresh sale —
            // { id, ref, remainToPay } of that invoice, keyed per parallel-sale place
            // the same way cartsByPlace is, so switching sales doesn't cross-wire
            // which cart is meant to settle which invoice.
            pendingInvoicesByPlace: {},
            pendingInvoice: null,

            // False until the persisted cartsByPlace/activePlace have been
            // read back from localStorage (onRehydrateStorage below runs
            // asynchronously, after the first render) — so screens relying
            // on `cart` don't act on a momentarily empty default before the
            // real cart loads.
            hasHydrated: false,

            // Mirrors legacy's disablePOSOperations()/enablePOSOperations(): true
            // while a cash session is open or not yet checked (optimistic default
            // so the screen doesn't flash locked before the check resolves), false
            // once confirmed no session exists for this terminal/day.
            cashSessionOpen: true,
            setCashSessionOpen: (open) => set({ cashSessionOpen: open }),

            setSearchTerm: (searchTerm) => set({ searchTerm }),

            showToast: (message, type = "success") => {
                const id = Date.now();
                set({ toast: { id, message, type } });
                setTimeout(() => {
                    if (get().toast?.id === id) set({ toast: null });
                }, 2500);
            },

            addToCart: (product, qty = 1) => {
                const place = get().activePlace;
                const currentCart = get().cartsByPlace[place] || [];
                const existing = currentCart.find((item) => item.id === product.id);
                const updatedCart = existing
                    ? currentCart.map((item) => (item.id === product.id ? { ...item, qty: item.qty + qty } : item))
                    : [...currentCart, { ...product, qty }];

                set({ cartsByPlace: { ...get().cartsByPlace, [place]: updatedCart }, cart: updatedCart });
                get().showToast(`Added ${product.name} to cart`);
            },

            // Locked (pending-invoice) items are never mutated by qty +/- or
            // remove — enforced here too, not just by hiding the buttons in the
            // UI, since legacy's own equivalent is UI-only and easy to bypass.
            changeQty: (id, delta) => {
                const place = get().activePlace;
                const updatedCart = (get().cartsByPlace[place] || [])
                    .map((item) => (item.id === id && !item.locked ? { ...item, qty: item.qty + delta } : item))
                    .filter((item) => item.qty > 0);

                set({ cartsByPlace: { ...get().cartsByPlace, [place]: updatedCart }, cart: updatedCart });
            },

            removeFromCart: (id) => {
                const place = get().activePlace;
                const updatedCart = (get().cartsByPlace[place] || []).filter((item) => !(item.id === id && !item.locked));

                set({ cartsByPlace: { ...get().cartsByPlace, [place]: updatedCart }, cart: updatedCart });
            },

            updateCartItem: (id, updates) => {
                const place = get().activePlace;
                const updatedCart = (get().cartsByPlace[place] || []).map((item) =>
                    item.id === id ? { ...item, ...updates } : item
                );

                set({ cartsByPlace: { ...get().cartsByPlace, [place]: updatedCart }, cart: updatedCart });
            },

            clearCart: () => {
                const place = get().activePlace;
                const remainingPending = { ...get().pendingInvoicesByPlace };
                delete remainingPending[place];
                set({
                    cartsByPlace: { ...get().cartsByPlace, [place]: [] },
                    cart: [],
                    pendingInvoicesByPlace: remainingPending,
                    pendingInvoice: null,
                });
            },

            // Loads a Reports invoice's lines into the active cart as locked items
            // (legacy: loadInvoiceToCart) and marks that cart as settling this
            // invoice rather than starting a new sale.
            loadInvoiceIntoCart: ({ id, ref, remainToPay, items }) => {
                const place = get().activePlace;
                const lockedItems = items.map((item) => ({ ...item, locked: true }));
                const pendingInvoice = { id, ref, remainToPay };
                set({
                    cartsByPlace: { ...get().cartsByPlace, [place]: lockedItems },
                    cart: lockedItems,
                    pendingInvoicesByPlace: { ...get().pendingInvoicesByPlace, [place]: pendingInvoice },
                    pendingInvoice,
                });
            },

            // Legacy: "Cancel & New Sale" — bails out of Pending Payment Mode
            // without settling, clearing both the locked cart and the pending link.
            cancelPendingInvoice: () => {
                const place = get().activePlace;
                const remainingPending = { ...get().pendingInvoicesByPlace };
                delete remainingPending[place];
                set({
                    cartsByPlace: { ...get().cartsByPlace, [place]: [] },
                    cart: [],
                    pendingInvoicesByPlace: remainingPending,
                    pendingInvoice: null,
                });
            },

            // Opens a new, independent sale (legacy: createNewParallelSale) and switches to it.
            createNewSale: () => {
                const { sales, cartsByPlace, pendingInvoicesByPlace } = get();
                const newPlace = `0-${sales.length}`;
                set({
                    sales: [...sales, { place: newPlace, time: getCurrentTime() }],
                    cartsByPlace: { ...cartsByPlace, [newPlace]: [] },
                    pendingInvoicesByPlace: { ...pendingInvoicesByPlace, [newPlace]: null },
                    activePlace: newPlace,
                    cart: [],
                    pendingInvoice: null,
                });
                return newPlace;
            },

            // Swaps the active cart without losing the one being left (legacy: switchPlace).
            switchSale: (place) => {
                set({
                    activePlace: place,
                    cart: get().cartsByPlace[place] || [],
                    pendingInvoice: get().pendingInvoicesByPlace[place] || null,
                });   
            },

            // Re-stamps the main sale's (place '0') displayed start time to now.
            // The `sales` array is persisted across page loads, so without this
            // the badge would keep showing whatever time it was first created —
            // possibly from a previous day — instead of the current login.
            stampLoginTime: () => {
                set({
                    sales: get().sales.map((sale) =>
                        sale.place === "0" ? { ...sale, time: getCurrentTime() } : sale
                    ),
                });
            },

            // Discards a parallel sale. Legacy only protects place '0' (the main
            // sale) from deletion — any other sale can always be closed.
            deleteSale: (place) => {
                const { sales, activePlace, cartsByPlace, pendingInvoicesByPlace } = get();
                if (place === "0") return false;

                const remainingSales = sales.filter((sale) => sale.place !== place);
                const remainingCarts = { ...cartsByPlace };
                delete remainingCarts[place];
                const remainingPending = { ...pendingInvoicesByPlace };
                delete remainingPending[place];

                if (activePlace === place) {
                    const nextPlace = "0";
                    set({
                        sales: remainingSales,
                        cartsByPlace: remainingCarts,
                        pendingInvoicesByPlace: remainingPending,
                        activePlace: nextPlace,
                        cart: remainingCarts[nextPlace] || [],
                        pendingInvoice: remainingPending[nextPlace] || null,
                    });
                } else {
                    set({ sales: remainingSales, cartsByPlace: remainingCarts, pendingInvoicesByPlace: remainingPending });
                }
                return true;
            },
        }),
        {
            // Mirrors legacy's localStorage persistence (takepos_parallel_sales,
            // takepos_place, takepos_cart_place_*) so a page refresh doesn't lose
            // in-progress parallel sales.
            name: "pos_standalone_sales",
            partialize: (state) => ({
                sales: state.sales,
                activePlace: state.activePlace,
                cartsByPlace: state.cartsByPlace,
                pendingInvoicesByPlace: state.pendingInvoicesByPlace,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.cart = state.cartsByPlace[state.activePlace] || [];
                    state.pendingInvoice = (state.pendingInvoicesByPlace || {})[state.activePlace] || null;
                    state.hasHydrated = true;
                }
            },
        }
    )
);

export default usePosStore;
