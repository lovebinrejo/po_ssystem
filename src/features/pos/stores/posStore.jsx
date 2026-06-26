import { create } from "zustand";

const usePosStore = create((set, get) => ({
    cart: [],
    searchTerm: "",

    setSearchTerm: (searchTerm) => set({ searchTerm }),

    addToCart: (product) => {
        const existing = get().cart.find((item) => item.id === product.id);
        if (existing) {
            set({
                cart: get().cart.map((item) =>
                    item.id === product.id ? { ...item, qty: item.qty + 1 } : item
                ),
            });
        } else {
            set({ cart: [...get().cart, { ...product, qty: 1 }] });
        }
    },

    changeQty: (id, delta) => {
        set({
            cart: get()
                .cart.map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
                .filter((item) => item.qty > 0),
        });
    },

    removeFromCart: (id) => {
        set({ cart: get().cart.filter((item) => item.id !== id) });
    },

    clearCart: () => set({ cart: [] }),
}));

export default usePosStore;
