import { create } from "zustand";

const useCustomerStore = create((set) => ({
    selectedCustomer: null,
    setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
}));

export default useCustomerStore;
