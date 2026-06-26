import { create } from "zustand";

const useTableStore = create((set) => ({
    orderType: "pickup", // "table" | "pickup"
    selectedTable: null,

    setOrderType: (orderType) => set({ orderType }),
    selectTable: (table) => set({ selectedTable: table, orderType: "table" }),
    clearTable: () => set({ selectedTable: null }),
}));

export default useTableStore;
