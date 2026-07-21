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

            
            sales: [{ place: "0", time: getCurrentTime() }],
            activePlace: "0",
            cartsByPlace: { "0": [] },
            cart: [],
            toast: null,

        
            pendingInvoicesByPlace: {},
            pendingInvoice: null,

        
            draftInvoicesByPlace: {},
            draftInvoice: null,

           
            customersByPlace: { "0": null },
            selectedCustomer: null,
            setSelectedCustomer: (customer) => {
                const place = get().activePlace;
                set({
                    customersByPlace: { ...get().customersByPlace, [place]: customer },
                    selectedCustomer: customer,
                });
            },

           
            hasHydrated: false,

           
            cashSessionOpen: true,
            setCashSessionOpen: (open) => set({ cashSessionOpen: open }),

            
            checkoutBlockedReason: null,
            setCheckoutBlocked: (reason) => set({ checkoutBlockedReason: reason }),

            setSearchTerm: (searchTerm) => set({ searchTerm }),

            showToast: (message, type = "success") => {
                const id = Date.now();
                set({ toast: { id, message, type } });
                setTimeout(() => {
                    if (get().toast?.id === id) set({ toast: null });
                }, 2500);
            },

            
            invalidateDraftInvoice: (place) => {
                if (!get().draftInvoicesByPlace[place]) return {};
                const remainingDrafts = { ...get().draftInvoicesByPlace };
                delete remainingDrafts[place];
                return { draftInvoicesByPlace: remainingDrafts, draftInvoice: place === get().activePlace ? null : get().draftInvoice };
            },

            addToCart: (product, qty = 1) => {
                const place = get().activePlace;
                const currentCart = get().cartsByPlace[place] || [];
                const existing = currentCart.find((item) => item.id === product.id);
                const updatedCart = existing
                    ? currentCart.map((item) => (item.id === product.id ? { ...item, qty: item.qty + qty } : item))
                    : [...currentCart, { ...product, qty }];

                set({
                    cartsByPlace: { ...get().cartsByPlace, [place]: updatedCart },
                    cart: updatedCart,
                    checkoutBlockedReason: null,
                    ...get().invalidateDraftInvoice(place),
                });
                get().showToast(`Added ${product.name} to cart`);
            },

           
            changeQty: (id, delta) => {
                const place = get().activePlace;
                const updatedCart = (get().cartsByPlace[place] || [])
                    .map((item) => (item.id === id && !item.locked ? { ...item, qty: item.qty + delta } : item))
                    .filter((item) => item.qty > 0);

                set({
                    cartsByPlace: { ...get().cartsByPlace, [place]: updatedCart },
                    cart: updatedCart,
                    checkoutBlockedReason: null,
                    ...get().invalidateDraftInvoice(place),
                });
            },

            removeFromCart: (id) => {
                const place = get().activePlace;
                const updatedCart = (get().cartsByPlace[place] || []).filter((item) => !(item.id === id && !item.locked));

                set({
                    cartsByPlace: { ...get().cartsByPlace, [place]: updatedCart },
                    cart: updatedCart,
                    checkoutBlockedReason: null,
                    ...get().invalidateDraftInvoice(place),
                });
            },

            
            setDraftInvoice: (invoice) => {
                const place = get().activePlace;
                set({
                    draftInvoicesByPlace: { ...get().draftInvoicesByPlace, [place]: invoice },
                    draftInvoice: invoice,
                });
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
                const remainingDrafts = { ...get().draftInvoicesByPlace };
                delete remainingDrafts[place];
                set({
                    cartsByPlace: { ...get().cartsByPlace, [place]: [] },
                    cart: [],
                    pendingInvoicesByPlace: remainingPending,
                    pendingInvoice: null,
                    draftInvoicesByPlace: remainingDrafts,
                    draftInvoice: null,
                });
            },

            
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
                const remainingDrafts = { ...get().draftInvoicesByPlace };
                delete remainingDrafts[place];
                set({
                    cartsByPlace: { ...get().cartsByPlace, [place]: [] },
                    cart: [],
                    pendingInvoicesByPlace: remainingPending,
                    pendingInvoice: null,
                    draftInvoicesByPlace: remainingDrafts,
                    draftInvoice: null,
                });
            },

            // Opens a new, independent sale (legacy: createNewParallelSale) and switches to it.
            createNewSale: () => {
                const { sales, cartsByPlace, pendingInvoicesByPlace, draftInvoicesByPlace, customersByPlace } = get();
                const newPlace = `0-${sales.length}`;
                set({
                    sales: [...sales, { place: newPlace, time: getCurrentTime() }],
                    cartsByPlace: { ...cartsByPlace, [newPlace]: [] },
                    pendingInvoicesByPlace: { ...pendingInvoicesByPlace, [newPlace]: null },
                    draftInvoicesByPlace: { ...draftInvoicesByPlace, [newPlace]: null },
                    customersByPlace: { ...customersByPlace, [newPlace]: null },
                    activePlace: newPlace,
                    cart: [],
                    pendingInvoice: null,
                    draftInvoice: null,
                    selectedCustomer: null,
                });
                return newPlace;
            },

            // Swaps the active cart without losing the one being left (legacy: switchPlace).
            switchSale: (place) => {
                set({
                    activePlace: place,
                    cart: get().cartsByPlace[place] || [],
                    pendingInvoice: get().pendingInvoicesByPlace[place] || null,
                    draftInvoice: get().draftInvoicesByPlace[place] || null,
                    selectedCustomer: get().customersByPlace[place] || null,
                });
            },

        
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
                const { sales, activePlace, cartsByPlace, pendingInvoicesByPlace, draftInvoicesByPlace, customersByPlace } = get();
                if (place === "0") return false;

                const remainingSales = sales.filter((sale) => sale.place !== place);
                const remainingCarts = { ...cartsByPlace };
                delete remainingCarts[place];
                const remainingPending = { ...pendingInvoicesByPlace };
                delete remainingPending[place];
                const remainingDrafts = { ...draftInvoicesByPlace };
                delete remainingDrafts[place];
                const remainingCustomers = { ...customersByPlace };
                delete remainingCustomers[place];

                if (activePlace === place) {
                    const nextPlace = "0";
                    set({
                        sales: remainingSales,
                        cartsByPlace: remainingCarts,
                        pendingInvoicesByPlace: remainingPending,
                        draftInvoicesByPlace: remainingDrafts,
                        customersByPlace: remainingCustomers,
                        activePlace: nextPlace,
                        cart: remainingCarts[nextPlace] || [],
                        pendingInvoice: remainingPending[nextPlace] || null,
                        draftInvoice: remainingDrafts[nextPlace] || null,
                        selectedCustomer: remainingCustomers[nextPlace] || null,
                    });
                } else {
                    set({
                        sales: remainingSales,
                        cartsByPlace: remainingCarts,
                        pendingInvoicesByPlace: remainingPending,
                        draftInvoicesByPlace: remainingDrafts,
                        customersByPlace: remainingCustomers,
                    });
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
                draftInvoicesByPlace: state.draftInvoicesByPlace,
                customersByPlace: state.customersByPlace,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.cart = state.cartsByPlace[state.activePlace] || [];
                    state.pendingInvoice = (state.pendingInvoicesByPlace || {})[state.activePlace] || null;
                    state.draftInvoice = (state.draftInvoicesByPlace || {})[state.activePlace] || null;
                    state.selectedCustomer = (state.customersByPlace || {})[state.activePlace] || null;
                    state.hasHydrated = true;
                }
            },
        }
    )
);

export default usePosStore;
