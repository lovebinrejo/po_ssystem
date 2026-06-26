import { create } from "zustand";
import { DEFAULT_CUSTOMER } from "../services/customerApi";

const useCustomerStore = create((set) => ({
    selectedCustomer: DEFAULT_CUSTOMER,
    setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
}));

export default useCustomerStore;
