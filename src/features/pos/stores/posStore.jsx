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

            showToast: (message) => {
                const id = Date.now();
                set({ toast: { id, message } });
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

            changeQty: (id, delta) => {
                const place = get().activePlace;
                const updatedCart = (get().cartsByPlace[place] || [])
                    .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
                    .filter((item) => item.qty > 0);

                set({ cartsByPlace: { ...get().cartsByPlace, [place]: updatedCart }, cart: updatedCart });
            },

            removeFromCart: (id) => {
                const place = get().activePlace;
                const updatedCart = (get().cartsByPlace[place] || []).filter((item) => item.id !== id);

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
                set({ cartsByPlace: { ...get().cartsByPlace, [place]: [] }, cart: [] });
            },

            // Opens a new, independent sale (legacy: createNewParallelSale) and switches to it.
            createNewSale: () => {
                const { sales, cartsByPlace } = get();
                const newPlace = `0-${sales.length}`;
                set({
                    sales: [...sales, { place: newPlace, time: getCurrentTime() }],
                    cartsByPlace: { ...cartsByPlace, [newPlace]: [] },
                    activePlace: newPlace,
                    cart: [],
                });
                return newPlace;
            },

            // Swaps the active cart without losing the one being left (legacy: switchPlace).
            switchSale: (place) => {
                set({ activePlace: place, cart: get().cartsByPlace[place] || [] });
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
                const { sales, activePlace, cartsByPlace } = get();
                if (place === "0") return false;

                const remainingSales = sales.filter((sale) => sale.place !== place);
                const remainingCarts = { ...cartsByPlace };
                delete remainingCarts[place];

                if (activePlace === place) {
                    const nextPlace = "0";
                    set({
                        sales: remainingSales,
                        cartsByPlace: remainingCarts,
                        activePlace: nextPlace,
                        cart: remainingCarts[nextPlace] || [],
                    });
                } else {
                    set({ sales: remainingSales, cartsByPlace: remainingCarts });
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
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.cart = state.cartsByPlace[state.activePlace] || [];
                    state.hasHydrated = true;
                }
            },
        }
    )
);

export default usePosStore;
